-- ============================================================
-- EventFlow: Seat-Aware Ticket Purchase Finalization
-- ============================================================
--
-- Extends finalize_ticket_purchase() so that reserved-seating
-- purchases permanently assign the buyer's held seats.
--
-- Reserved seating flow:
--
--   seat selected
--        ↓
--   seat hold created
--        ↓
--   payment verified
--        ↓
--   finalize_ticket_purchase()
--        ↓
--   ticket created
--        ↓
--   ticket_seats created
--        ↓
--   seat holds converted
--
-- Everything happens atomically.
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
SET search_path = public
AS $function$

DECLARE
  v_user_id uuid;
  v_order public.orders%ROWTYPE;
  v_tier public.ticket_tiers%ROWTYPE;
  v_item public.order_items%ROWTYPE;
  v_ticket public.tickets%ROWTYPE;

  v_event_seating_mode text;

  v_remaining integer;
  v_hold_count integer := 0;
  v_required_quantity integer;

  v_hold public.seat_holds%ROWTYPE;
  v_seat public.event_seats%ROWTYPE;

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
  --
  -- Prevents two browser tabs or duplicate callbacks from
  -- finalizing the same order simultaneously.
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
  --
  -- If the payment was already finalized, return the existing
  -- ticket rather than creating another one.
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

    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order.id,
      'ticket_id', v_ticket.id,
      'ticket_code', v_ticket.ticket_code,
      'quantity', v_ticket.quantity,
      'total_amount', v_ticket.total_amount,
      'message',
        'Ticket purchase already finalized.'
    );

  END IF;


  -- ==========================================================
  -- 4. Verify payment
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
  -- 6. Get order item
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

  v_required_quantity := v_item.quantity;


  -- ==========================================================
  -- 7. Lock ticket tier
  -- ==========================================================

  SELECT *
  INTO v_tier
  FROM public.ticket_tiers
  WHERE id = p_ticket_tier_id
    AND event_id = v_order.event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Ticket tier not found.';
  END IF;


  -- ==========================================================
  -- 8. Check ticket inventory
  -- ==========================================================

  v_remaining :=
    COALESCE(v_tier.quantity, 0)
    -
    COALESCE(v_tier.sold, 0);

  IF v_remaining < v_required_quantity THEN
    RAISE EXCEPTION
      'Not enough tickets remaining to finalize this order.';
  END IF;


  -- ==========================================================
  -- 9. Determine seating mode
  -- ==========================================================

  SELECT seating_mode
  INTO v_event_seating_mode
  FROM public.events
  WHERE id = v_order.event_id
  FOR UPDATE;

  IF v_event_seating_mode IS NULL THEN
    RAISE EXCEPTION
      'Event not found.';
  END IF;


  -- ==========================================================
  -- 10. Reserved seating validation
  -- ==========================================================
  --
  -- For reserved seating, the order must have exactly as many
  -- active seat holds as tickets being purchased.
  --
  -- Example:
  --
  -- quantity = 3
  --
  -- holds must contain exactly:
  --   A1
  --   A2
  --   A3
  --
  -- This prevents a buyer from paying for three tickets while
  -- only holding one seat.
  -- ==========================================================

  IF v_event_seating_mode = 'reserved' THEN

    -- --------------------------------------------------------
    -- Lock all active holds belonging to this order.
    -- --------------------------------------------------------

    PERFORM 1
    FROM public.seat_holds
    WHERE order_id = p_order_id
      AND user_id = v_user_id
      AND event_id = v_order.event_id
      AND ticket_tier_id = p_ticket_tier_id
      AND status = 'held'
      AND expires_at > now()
    FOR UPDATE;

    -- --------------------------------------------------------
    -- Count active holds.
    -- --------------------------------------------------------

    SELECT count(*)
    INTO v_hold_count
    FROM public.seat_holds
    WHERE order_id = p_order_id
      AND user_id = v_user_id
      AND event_id = v_order.event_id
      AND ticket_tier_id = p_ticket_tier_id
      AND status = 'held'
      AND expires_at > now();

    IF v_hold_count <> v_required_quantity THEN
      RAISE EXCEPTION
        'The selected seats are no longer reserved for this order. Please select your seats again.';
    END IF;


    -- --------------------------------------------------------
    -- Verify each held seat still exists and is active.
    -- --------------------------------------------------------

    IF EXISTS (
      SELECT 1
      FROM public.seat_holds sh
      JOIN public.event_seats es
        ON es.id = sh.seat_id
      WHERE sh.order_id = p_order_id
        AND sh.user_id = v_user_id
        AND sh.event_id = v_order.event_id
        AND sh.ticket_tier_id = p_ticket_tier_id
        AND sh.status = 'held'
        AND sh.expires_at > now()
        AND (
          es.event_id <> v_order.event_id
          OR es.is_active = false
        )
    )
    THEN
      RAISE EXCEPTION
        'One or more selected seats are no longer available.';
    END IF;


    -- --------------------------------------------------------
    -- Final defensive check:
    -- a seat must not already have a permanent assignment.
    -- --------------------------------------------------------

    IF EXISTS (
      SELECT 1
      FROM public.seat_holds sh
      JOIN public.ticket_seats ts
        ON ts.seat_id = sh.seat_id
      WHERE sh.order_id = p_order_id
        AND sh.user_id = v_user_id
        AND sh.event_id = v_order.event_id
        AND sh.ticket_tier_id = p_ticket_tier_id
        AND sh.status = 'held'
        AND sh.expires_at > now()
    )
    THEN
      RAISE EXCEPTION
        'One or more selected seats have already been sold.';
    END IF;

  END IF;


  -- ==========================================================
  -- 11. Create confirmed ticket
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
  -- 12. Assign reserved seats permanently
  -- ==========================================================
  --
  -- ticket_seats provides the permanent mapping:
  --
  -- ticket_id → seat_id
  --
  -- The unique index on ticket_seats.seat_id guarantees that
  -- one physical seat can never belong to two tickets.
  -- ==========================================================

  IF v_event_seating_mode = 'reserved' THEN

    FOR v_hold IN
      SELECT *
      FROM public.seat_holds
      WHERE order_id = p_order_id
        AND user_id = v_user_id
        AND event_id = v_order.event_id
        AND ticket_tier_id = p_ticket_tier_id
        AND status = 'held'
        AND expires_at > now()
      ORDER BY seat_id
      FOR UPDATE
    LOOP

      -- ------------------------------------------------------
      -- Insert permanent seat assignment.
      -- ------------------------------------------------------

      INSERT INTO public.ticket_seats (
        ticket_id,
        seat_id
      )
      VALUES (
        v_ticket.id,
        v_hold.seat_id
      );

      -- ------------------------------------------------------
      -- Get seat information for response.
      -- ------------------------------------------------------

      SELECT *
      INTO v_seat
      FROM public.event_seats
      WHERE id = v_hold.seat_id;

      v_assigned_seats :=
        v_assigned_seats ||
        jsonb_build_object(
          'seat_id', v_seat.id,
          'label', v_seat.label,
          'section', v_seat.section,
          'row_label', v_seat.row_label,
          'seat_number', v_seat.seat_number
        );

      -- ------------------------------------------------------
      -- Convert temporary hold into permanent assignment.
      -- ------------------------------------------------------

      UPDATE public.seat_holds
      SET
        status = 'converted',
        released_at = now()
      WHERE id = v_hold.id;

    END LOOP;

  END IF;


  -- ==========================================================
  -- 13. Record ticket-tier sale
  -- ==========================================================

  UPDATE public.ticket_tiers
  SET
    sold = COALESCE(sold, 0) + v_item.quantity
  WHERE id = p_ticket_tier_id;


  -- ==========================================================
  -- 14. Record event-level sale
  -- ==========================================================

  UPDATE public.events
  SET
    tickets_sold =
      COALESCE(tickets_sold, 0) + v_item.quantity,

    available_tickets =
      GREATEST(
        COALESCE(
          available_tickets,
          total_tickets
        ) - v_item.quantity,
        0
      ),

    updated_at = now()

  WHERE id = v_order.event_id;


  -- ==========================================================
  -- 15. Confirm order
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
    'message',
      CASE
        WHEN v_event_seating_mode = 'reserved'
        THEN 'Ticket purchase finalized and seats assigned successfully.'
        ELSE 'Ticket purchase finalized successfully.'
      END
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
-- END
-- ============================================================
