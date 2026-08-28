-- ============================================================
-- EventFlow: Finalize Ticket Purchase With Assigned Seats
-- ============================================================
--
-- Flow:
--
--   verified payment
--        ↓
--   pending order
--        ↓
--   lock order
--        ↓
--   lock event + ticket tier
--        ↓
--   create confirmed ticket
--        ↓
--   validate active seat holds
--        ↓
--   permanently assign seats
--        ↓
--   convert seat holds
--        ↓
--   increment inventory
--        ↓
--   confirm order
--
-- The whole operation is transactional.
-- If any step fails, PostgreSQL rolls everything back.
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.finalize_ticket_purchase(
  p_order_id uuid,
  p_ticket_tier_id uuid,
  p_payment_reference text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$

DECLARE
  v_user_id uuid;

  v_order public.orders%ROWTYPE;
  v_event public.events%ROWTYPE;
  v_tier public.ticket_tiers%ROWTYPE;
  v_item public.order_items%ROWTYPE;
  v_ticket public.tickets%ROWTYPE;

  v_remaining integer;
  v_expected_seat_count integer;
  v_actual_seat_count integer;

  v_assigned_seats jsonb := '[]'::jsonb;

BEGIN

  -- ==========================================================
  -- 1. Authentication
  -- ==========================================================

  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.';
  END IF;


  -- ==========================================================
  -- 2. Lock the order
  -- ==========================================================

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Order not found or you do not own this order.';
  END IF;


  -- ==========================================================
  -- 3. Idempotency
  -- ==========================================================

  IF v_order.status = 'confirmed'
     AND v_order.payment_status = 'successful'
     AND v_order.payment_reference = p_payment_reference
  THEN

    SELECT *
    INTO v_ticket
    FROM public.tickets
    WHERE order_id = p_order_id
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Order is confirmed but its ticket could not be found.';
    END IF;


    -- Return assigned seats for reserved events.
    IF EXISTS (
      SELECT 1
      FROM public.events
      WHERE id = v_order.event_id
        AND seating_mode = 'reserved'
    ) THEN

      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'ticket_seat_id', ts.id,
            'seat_id', es.id,
            'label', es.label,
            'section', es.section,
            'row_label', es.row_label,
            'seat_number', es.seat_number
          )
          ORDER BY
            COALESCE(es.section, ''),
            COALESCE(es.row_label, ''),
            es.seat_number
        ),
        '[]'::jsonb
      )
      INTO v_assigned_seats
      FROM public.ticket_seats ts
      JOIN public.event_seats es
        ON es.id = ts.seat_id
      WHERE ts.ticket_id = v_ticket.id;

    END IF;


    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order.id,
      'ticket_id', v_ticket.id,
      'ticket_code', v_ticket.ticket_code,
      'quantity', v_ticket.quantity,
      'total_amount', v_ticket.total_amount,
      'seats', v_assigned_seats,
      'message', 'Ticket purchase already finalized.'
    );

  END IF;


  -- ==========================================================
  -- 4. Payment verification
  -- ==========================================================

  IF v_order.payment_status <> 'successful' THEN
    RAISE EXCEPTION
      'Payment has not been successfully verified.';
  END IF;


  IF v_order.payment_reference IS NULL
     OR v_order.payment_reference <> p_payment_reference
  THEN
    RAISE EXCEPTION
      'Payment reference does not match the verified payment.';
  END IF;


  -- ==========================================================
  -- 5. Order must still be pending
  -- ==========================================================

  IF v_order.status <> 'pending' THEN
    RAISE EXCEPTION
      'This order cannot be finalized in its current status.';
  END IF;


  -- ==========================================================
  -- 6. Check order expiry
  -- ==========================================================

  IF v_order.expires_at IS NOT NULL
     AND v_order.expires_at <= now()
  THEN
    RAISE EXCEPTION
      'This order has expired. Please start a new purchase.';
  END IF;


  -- ==========================================================
  -- 7. Lock and validate event
  -- ==========================================================

  SELECT *
  INTO v_event
  FROM public.events
  WHERE id = v_order.event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found.';
  END IF;


  IF v_event.status <> 'published' THEN
    RAISE EXCEPTION
      'This event is no longer available for ticket purchase.';
  END IF;


  -- ==========================================================
  -- 8. Lock and validate ticket tier
  -- ==========================================================

  SELECT *
  INTO v_tier
  FROM public.ticket_tiers
  WHERE id = p_ticket_tier_id
    AND event_id = v_order.event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket tier not found.';
  END IF;


  -- ==========================================================
  -- 9. Validate order item
  -- ==========================================================

  SELECT *
  INTO v_item
  FROM public.order_items
  WHERE order_id = p_order_id
    AND ticket_tier_id = p_ticket_tier_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Order item does not match the requested ticket tier.';
  END IF;


  -- ==========================================================
  -- 10. Validate quantity
  -- ==========================================================

  IF v_item.quantity <= 0 THEN
    RAISE EXCEPTION
      'Order quantity must be greater than zero.';
  END IF;


  -- ==========================================================
  -- 11. Validate inventory
  -- ==========================================================

  v_remaining :=
    COALESCE(v_tier.quantity, 0)
    - COALESCE(v_tier.sold, 0);

  IF v_remaining < v_item.quantity THEN
    RAISE EXCEPTION
      'Not enough tickets remaining to finalize this order.';
  END IF;


  -- ==========================================================
  -- 12. CREATE THE CONFIRMED TICKET
  -- ==========================================================
  --
  -- IMPORTANT:
  --
  -- This MUST happen before ticket_seats are created because
  -- ticket_seats.ticket_id references the newly-created ticket.
  --
  -- If seat assignment fails later, the entire transaction rolls
  -- back, including this ticket.
  -- ==========================================================

  INSERT INTO public.tickets (
    event_id,
    attendee_id,
    quantity,
    total_amount,
    status,
    order_id
  )
  VALUES (
    v_order.event_id,
    v_user_id,
    v_item.quantity,
    v_order.total_amount,
    'confirmed',
    p_order_id
  )
  RETURNING *
  INTO v_ticket;


  -- ==========================================================
  -- 13. RESERVED SEATING
  -- ==========================================================

  IF v_event.seating_mode = 'reserved' THEN

    v_expected_seat_count := v_item.quantity;


    -- ----------------------------------------------------------
    -- 13A. Lock all active holds belonging to this order.
    --
    -- We deliberately lock the rows first and then count them.
    -- This avoids applying FOR UPDATE directly to an aggregate.
    -- ----------------------------------------------------------

    PERFORM 1
    FROM public.seat_holds sh
    WHERE sh.order_id = p_order_id
      AND sh.event_id = v_order.event_id
      AND sh.user_id = v_user_id
      AND sh.ticket_tier_id = p_ticket_tier_id
      AND sh.status = 'held'
      AND sh.expires_at > now()
    FOR UPDATE;


    -- ----------------------------------------------------------
    -- 13B. Count active holds.
    -- ----------------------------------------------------------

    SELECT count(*)
    INTO v_actual_seat_count
    FROM public.seat_holds sh
    WHERE sh.order_id = p_order_id
      AND sh.event_id = v_order.event_id
      AND sh.user_id = v_user_id
      AND sh.ticket_tier_id = p_ticket_tier_id
      AND sh.status = 'held'
      AND sh.expires_at > now();


    IF v_actual_seat_count <> v_expected_seat_count THEN
      RAISE EXCEPTION
        'Seat hold is invalid or expired. Expected % seats but found % active seats.',
        v_expected_seat_count,
        v_actual_seat_count;
    END IF;


    -- ----------------------------------------------------------
    -- 13C. Verify seats have not already been assigned.
    -- ----------------------------------------------------------

    IF EXISTS (
      SELECT 1
      FROM public.seat_holds sh
      JOIN public.ticket_seats ts
        ON ts.seat_id = sh.seat_id
      WHERE sh.order_id = p_order_id
        AND sh.event_id = v_order.event_id
        AND sh.user_id = v_user_id
        AND sh.ticket_tier_id = p_ticket_tier_id
        AND sh.status = 'held'
        AND sh.expires_at > now()
    ) THEN
      RAISE EXCEPTION
        'One or more selected seats have already been assigned.';
    END IF;


    -- ----------------------------------------------------------
    -- 13D. Verify seats are still active.
    -- ----------------------------------------------------------

    IF EXISTS (
      SELECT 1
      FROM public.seat_holds sh
      JOIN public.event_seats es
        ON es.id = sh.seat_id
      WHERE sh.order_id = p_order_id
        AND sh.event_id = v_order.event_id
        AND sh.user_id = v_user_id
        AND sh.ticket_tier_id = p_ticket_tier_id
        AND sh.status = 'held'
        AND sh.expires_at > now()
        AND es.is_active = false
    ) THEN
      RAISE EXCEPTION
        'One or more selected seats are no longer available.';
    END IF;


    -- ----------------------------------------------------------
    -- 13E. Permanently assign seats to the ticket.
    -- ----------------------------------------------------------

    INSERT INTO public.ticket_seats (
      ticket_id,
      seat_id
    )
    SELECT
      v_ticket.id,
      sh.seat_id
    FROM public.seat_holds sh
    WHERE sh.order_id = p_order_id
      AND sh.event_id = v_order.event_id
      AND sh.user_id = v_user_id
      AND sh.ticket_tier_id = p_ticket_tier_id
      AND sh.status = 'held'
      AND sh.expires_at > now();


    -- ----------------------------------------------------------
    -- 13F. Verify permanent assignments.
    -- ----------------------------------------------------------

    SELECT count(*)
    INTO v_actual_seat_count
    FROM public.ticket_seats
    WHERE ticket_id = v_ticket.id;


    IF v_actual_seat_count <> v_expected_seat_count THEN
      RAISE EXCEPTION
        'Unable to assign all selected seats to the ticket.';
    END IF;


    -- ----------------------------------------------------------
    -- 13G. Convert temporary holds.
    -- ----------------------------------------------------------

    UPDATE public.seat_holds
    SET
      status = 'converted',
      released_at = now()
    WHERE order_id = p_order_id
      AND event_id = v_order.event_id
      AND user_id = v_user_id
      AND ticket_tier_id = p_ticket_tier_id
      AND status = 'held'
      AND expires_at > now();


    -- ----------------------------------------------------------
    -- 13H. Return permanent seat information.
    -- ----------------------------------------------------------

    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'ticket_seat_id', ts.id,
          'seat_id', es.id,
          'label', es.label,
          'section', es.section,
          'row_label', es.row_label,
          'seat_number', es.seat_number
        )
        ORDER BY
          COALESCE(es.section, ''),
          COALESCE(es.row_label, ''),
          es.seat_number
      ),
      '[]'::jsonb
    )
    INTO v_assigned_seats
    FROM public.ticket_seats ts
    JOIN public.event_seats es
      ON es.id = ts.seat_id
    WHERE ts.ticket_id = v_ticket.id;

  END IF;


  -- ==========================================================
  -- 14. Record ticket sales
  -- ==========================================================

  UPDATE public.ticket_tiers
  SET
    sold = COALESCE(sold, 0) + v_item.quantity
  WHERE id = p_ticket_tier_id;


  UPDATE public.events
  SET
    tickets_sold =
      COALESCE(tickets_sold, 0) + v_item.quantity,

    available_tickets =
      GREATEST(
        COALESCE(available_tickets, total_tickets)
        - v_item.quantity,
        0
      ),

    updated_at = now()
  WHERE id = v_order.event_id;


  -- ==========================================================
  -- 15. Confirm the order
  -- ==========================================================

  UPDATE public.orders
  SET
    status = 'confirmed',
    updated_at = now()
  WHERE id = p_order_id;


  -- ==========================================================
  -- 16. Return successful purchase
  -- ==========================================================

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'ticket_id', v_ticket.id,
    'ticket_code', v_ticket.ticket_code,
    'quantity', v_ticket.quantity,
    'total_amount', v_ticket.total_amount,
    'seats', v_assigned_seats,
    'message', 'Ticket purchase finalized successfully.'
  );

END;

$function$;


-- ============================================================
-- Security
-- ============================================================

REVOKE ALL
ON FUNCTION public.finalize_ticket_purchase(
  uuid,
  uuid,
  text
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.finalize_ticket_purchase(
  uuid,
  uuid,
  text
)
TO authenticated;


-- ============================================================
-- Documentation
-- ============================================================

COMMENT ON FUNCTION public.finalize_ticket_purchase(
  uuid,
  uuid,
  text
)
IS
'Finalizes a verified ticket purchase, creates the confirmed ticket, permanently assigns reserved seats when applicable, converts seat holds, updates inventory, and confirms the order atomically.';

-- ============================================================
-- END
-- ============================================================
