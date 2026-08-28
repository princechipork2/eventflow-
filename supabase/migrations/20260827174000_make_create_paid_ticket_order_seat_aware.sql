-- ============================================================
-- EventFlow: Seat-Aware Paid Ticket Order Creation
-- ============================================================
--
-- Extends create_paid_ticket_order() with optional seat IDs.
--
-- General admission:
--   p_seat_ids = NULL
--
-- Reserved seating:
--   p_seat_ids must contain exactly p_quantity seats.
--
-- The order and seat holds are created in the same transaction.
-- If the seat hold fails, the order is rolled back as well.
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_paid_ticket_order(
  p_event_id uuid,
  p_ticket_tier_id uuid,
  p_quantity integer,
  p_seat_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$

DECLARE
  v_user_id uuid;
  v_event public.events%ROWTYPE;
  v_tier public.ticket_tiers%ROWTYPE;
  v_order_id uuid;
  v_total_amount numeric;
  v_expires_at timestamptz;
  v_hold_result jsonb;
  v_seat_count integer;
BEGIN

  -- ==========================================================
  -- 1. Authentication
  -- ==========================================================

  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.';
  END IF;


  -- ==========================================================
  -- 2. Validate quantity
  -- ==========================================================

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero.';
  END IF;


  -- ==========================================================
  -- 3. Lock and validate event
  -- ==========================================================
  --
  -- Locking the event also gives us a consistent seating mode
  -- while this order is being created.
  -- ==========================================================

  SELECT *
  INTO v_event
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found.';
  END IF;

  IF v_event.status <> 'published' THEN
    RAISE EXCEPTION
      'This event is not available for ticket purchase.';
  END IF;


  -- ==========================================================
  -- 4. Lock and validate ticket tier
  -- ==========================================================

  SELECT *
  INTO v_tier
  FROM public.ticket_tiers
  WHERE id = p_ticket_tier_id
    AND event_id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket tier not found.';
  END IF;

  IF v_tier.type <> 'paid' THEN
    RAISE EXCEPTION
      'This ticket tier is not a paid ticket.';
  END IF;

  IF COALESCE(v_tier.price, 0) <= 0 THEN
    RAISE EXCEPTION
      'This ticket tier has an invalid price.';
  END IF;


  -- ==========================================================
  -- 5. Validate ticket inventory
  -- ==========================================================

  IF COALESCE(v_tier.quantity, 0)
       - COALESCE(v_tier.sold, 0)
       < p_quantity
  THEN
    RAISE EXCEPTION
      'Not enough tickets remaining.';
  END IF;


  -- ==========================================================
  -- 6. Validate seating selection
  -- ==========================================================

  IF v_event.seating_mode = 'reserved' THEN

    -- Reserved events MUST have selected seats.

    IF p_seat_ids IS NULL
       OR cardinality(p_seat_ids) = 0
    THEN
      RAISE EXCEPTION
        'Please select your seats before continuing.';
    END IF;


    -- Prevent duplicate seat IDs.

    IF cardinality(p_seat_ids) <>
       cardinality(
         ARRAY(
           SELECT DISTINCT unnest(p_seat_ids)
         )
       )
    THEN
      RAISE EXCEPTION
        'Duplicate seats were selected.';
    END IF;


    -- Number of seats must exactly match ticket quantity.

    v_seat_count := cardinality(p_seat_ids);

    IF v_seat_count <> p_quantity THEN
      RAISE EXCEPTION
        'The number of selected seats must match the ticket quantity.';
    END IF;

  ELSE

    -- General-admission events must not receive seat selections.

    IF p_seat_ids IS NOT NULL
       AND cardinality(p_seat_ids) > 0
    THEN
      RAISE EXCEPTION
        'This event does not use reserved seating.';
    END IF;

  END IF;


  -- ==========================================================
  -- 7. Calculate order amount and expiry
  -- ==========================================================

  v_total_amount :=
    COALESCE(v_tier.price, 0) * p_quantity;

  v_expires_at :=
    now() + interval '30 minutes';


  -- ==========================================================
  -- 8. Create pending order
  -- ==========================================================

  INSERT INTO public.orders (
    user_id,
    event_id,
    status,
    total_amount,
    payment_status,
    currency,
    expires_at
  )
  VALUES (
    v_user_id,
    p_event_id,
    'pending',
    v_total_amount,
    'pending',
    'NGN',
    v_expires_at
  )
  RETURNING id INTO v_order_id;


  -- ==========================================================
  -- 9. Create order item
  -- ==========================================================

  INSERT INTO public.order_items (
    order_id,
    ticket_tier_id,
    quantity,
    unit_price,
    subtotal
  )
  VALUES (
    v_order_id,
    p_ticket_tier_id,
    p_quantity,
    v_tier.price,
    v_total_amount
  );


  -- ==========================================================
  -- 10. Hold selected seats
  -- ==========================================================
  --
  -- IMPORTANT:
  --
  -- The seat hold uses the order ID we just created.
  --
  -- The hold duration is 30 minutes so it matches the order
  -- expiry.
  --
  -- hold_event_seats() performs the actual concurrency-safe
  -- seat locking and validation.
  --
  -- If it raises an exception, PostgreSQL rolls back:
  --
  --   order
  --   order item
  --   seat holds
  --
  -- together.
  -- ==========================================================

  IF v_event.seating_mode = 'reserved' THEN

    v_hold_result :=
      public.hold_event_seats(
        p_event_id,
        p_seat_ids,
        v_order_id,
        p_ticket_tier_id,
        30
      );

  END IF;


  -- ==========================================================
  -- 11. Return order information
  -- ==========================================================

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'event_id', p_event_id,
    'ticket_tier_id', p_ticket_tier_id,
    'quantity', p_quantity,
    'total_amount', v_total_amount,
    'currency', 'NGN',
    'expires_at', v_expires_at,
    'seating_mode', v_event.seating_mode,
    'seat_hold', COALESCE(
      v_hold_result,
      'null'::jsonb
    )
  );

END;
$function$;


-- ============================================================
-- Security
-- ============================================================

REVOKE ALL
ON FUNCTION public.create_paid_ticket_order(
  uuid,
  uuid,
  integer,
  uuid[]
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.create_paid_ticket_order(
  uuid,
  uuid,
  integer,
  uuid[]
)
TO authenticated;


-- ============================================================
-- Documentation
-- ============================================================

COMMENT ON FUNCTION public.create_paid_ticket_order(
  uuid,
  uuid,
  integer,
  uuid[]
)
IS
'Creates a pending paid ticket order and, for reserved events, atomically holds the selected seats for 30 minutes.';


-- ============================================================
-- END
-- ============================================================
