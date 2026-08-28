-- ============================================================
-- EventFlow: Atomic Seat Hold RPC
-- ============================================================
--
-- Temporarily reserves selected seats for a buyer.
--
-- The function:
--   1. Requires authentication.
--   2. Verifies the event is reserved seating.
--   3. Verifies all seats belong to the event.
--   4. Expires stale holds.
--   5. Locks the requested seat rows.
--   6. Prevents already-assigned seats.
--   7. Prevents seats held by another buyer.
--   8. Creates all holds atomically.
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.hold_event_seats(
  p_event_id uuid,
  p_seat_ids uuid[],
  p_order_id uuid DEFAULT NULL,
  p_ticket_tier_id uuid DEFAULT NULL,
  p_hold_minutes integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid;
  v_event public.events%ROWTYPE;
  v_seat_count integer;
  v_existing_assignment integer;
  v_conflicting_hold integer;
  v_hold_id uuid;
  v_expires_at timestamptz;
  v_seat_id uuid;
  v_held_seats jsonb := '[]'::jsonb;
BEGIN
  -- ----------------------------------------------------------
  -- 1. Authentication
  -- ----------------------------------------------------------

  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.';
  END IF;

  -- ----------------------------------------------------------
  -- 2. Validate input
  -- ----------------------------------------------------------

  IF p_event_id IS NULL THEN
    RAISE EXCEPTION 'Event ID is required.';
  END IF;

  IF p_seat_ids IS NULL OR cardinality(p_seat_ids) = 0 THEN
    RAISE EXCEPTION 'At least one seat must be selected.';
  END IF;

  IF p_hold_minutes < 1 OR p_hold_minutes > 30 THEN
    RAISE EXCEPTION 'Hold duration must be between 1 and 30 minutes.';
  END IF;

  -- Prevent duplicate seat IDs from being submitted.
  IF cardinality(p_seat_ids) <>
     cardinality(ARRAY(
       SELECT DISTINCT unnest(p_seat_ids)
     )) THEN
    RAISE EXCEPTION 'Duplicate seat IDs were submitted.';
  END IF;

  -- ----------------------------------------------------------
  -- 3. Lock and validate event
  -- ----------------------------------------------------------

  SELECT *
  INTO v_event
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found.';
  END IF;

  IF v_event.status <> 'published' THEN
    RAISE EXCEPTION 'This event is not available for ticket purchase.';
  END IF;

  IF v_event.seating_mode <> 'reserved' THEN
    RAISE EXCEPTION 'This event does not use reserved seating.';
  END IF;

  -- ----------------------------------------------------------
  -- 4. Validate order if supplied
  -- ----------------------------------------------------------

  IF p_order_id IS NOT NULL THEN

    IF NOT EXISTS (
      SELECT 1
      FROM public.orders
      WHERE id = p_order_id
        AND user_id = v_user_id
        AND event_id = p_event_id
        AND status = 'pending'
    ) THEN
      RAISE EXCEPTION 'Order not found, does not belong to you, or is not pending.';
    END IF;

  END IF;

  -- ----------------------------------------------------------
  -- 5. Validate ticket tier if supplied
  -- ----------------------------------------------------------

  IF p_ticket_tier_id IS NOT NULL THEN

    IF NOT EXISTS (
      SELECT 1
      FROM public.ticket_tiers
      WHERE id = p_ticket_tier_id
        AND event_id = p_event_id
    ) THEN
      RAISE EXCEPTION 'Ticket tier does not belong to this event.';
    END IF;

  END IF;

  -- ----------------------------------------------------------
  -- 6. Expire stale holds
  -- ----------------------------------------------------------
  --
  -- These seats become available again.
  --
  -- We deliberately update only 'held' rows whose expiration
  -- time has passed.
  -- ----------------------------------------------------------

  UPDATE public.seat_holds
  SET
    status = 'expired',
    released_at = now()
  WHERE event_id = p_event_id
    AND status = 'held'
    AND expires_at <= now();

  -- ----------------------------------------------------------
  -- 7. Validate every requested seat belongs to this event.
  -- ----------------------------------------------------------

  SELECT count(*)
  INTO v_seat_count
  FROM public.event_seats
  WHERE event_id = p_event_id
    AND id = ANY(p_seat_ids);

  IF v_seat_count <> cardinality(p_seat_ids) THEN
    RAISE EXCEPTION 'One or more selected seats do not belong to this event.';
  END IF;

  -- ----------------------------------------------------------
  -- 8. Lock requested seats.
  -- ----------------------------------------------------------
  --
  -- This is important for concurrency.
  --
  -- If Buyer A and Buyer B attempt to reserve the same seat,
  -- PostgreSQL serializes the conflicting operations.
  -- ----------------------------------------------------------

  PERFORM 1
  FROM public.event_seats
  WHERE event_id = p_event_id
    AND id = ANY(p_seat_ids)
  ORDER BY id
  FOR UPDATE;

  -- ----------------------------------------------------------
  -- 9. Verify seats are active.
  -- ----------------------------------------------------------

  IF EXISTS (
    SELECT 1
    FROM public.event_seats
    WHERE event_id = p_event_id
      AND id = ANY(p_seat_ids)
      AND is_active = false
  ) THEN
    RAISE EXCEPTION 'One or more selected seats are unavailable.';
  END IF;

  -- ----------------------------------------------------------
  -- 10. Check permanent assignments.
  -- ----------------------------------------------------------

  SELECT count(*)
  INTO v_existing_assignment
  FROM public.ticket_seats ts
  JOIN public.event_seats es
    ON es.id = ts.seat_id
  WHERE es.event_id = p_event_id
    AND ts.seat_id = ANY(p_seat_ids);

  IF v_existing_assignment > 0 THEN
    RAISE EXCEPTION 'One or more selected seats have already been sold.';
  END IF;

  -- ----------------------------------------------------------
  -- 11. Check active holds belonging to another buyer.
  -- ----------------------------------------------------------

  SELECT count(*)
  INTO v_conflicting_hold
  FROM public.seat_holds sh
  WHERE sh.event_id = p_event_id
    AND sh.seat_id = ANY(p_seat_ids)
    AND sh.status = 'held'
    AND sh.expires_at > now()
    AND sh.user_id <> v_user_id;

  IF v_conflicting_hold > 0 THEN
    RAISE EXCEPTION 'One or more selected seats are currently held by another buyer.';
  END IF;

  -- ----------------------------------------------------------
  -- 12. If the current buyer already holds these seats,
  --     release those existing holds first.
  -- ----------------------------------------------------------
  --
  -- This makes the RPC reasonably idempotent for the same buyer.
  -- ----------------------------------------------------------

  UPDATE public.seat_holds
  SET
    status = 'released',
    released_at = now()
  WHERE event_id = p_event_id
    AND seat_id = ANY(p_seat_ids)
    AND user_id = v_user_id
    AND status = 'held';

  -- ----------------------------------------------------------
  -- 13. Create new holds.
  -- ----------------------------------------------------------

  v_expires_at :=
    now() + make_interval(mins => p_hold_minutes);

  FOREACH v_seat_id IN ARRAY p_seat_ids
  LOOP

    INSERT INTO public.seat_holds (
      event_id,
      seat_id,
      user_id,
      order_id,
      ticket_tier_id,
      status,
      expires_at
    )
    VALUES (
      p_event_id,
      v_seat_id,
      v_user_id,
      p_order_id,
      p_ticket_tier_id,
      'held',
      v_expires_at
    )
    RETURNING id INTO v_hold_id;

    v_held_seats :=
      v_held_seats || jsonb_build_object(
        'hold_id', v_hold_id,
        'seat_id', v_seat_id,
        'expires_at', v_expires_at
      );

  END LOOP;

  -- ----------------------------------------------------------
  -- 14. Return result.
  -- ----------------------------------------------------------

  RETURN jsonb_build_object(
    'success', true,
    'event_id', p_event_id,
    'order_id', p_order_id,
    'expires_at', v_expires_at,
    'seats', v_held_seats,
    'message', 'Seats held successfully.'
  );

END;
$function$;

-- ------------------------------------------------------------
-- Security
-- ------------------------------------------------------------

REVOKE ALL
ON FUNCTION public.hold_event_seats(
  uuid,
  uuid[],
  uuid,
  uuid,
  integer
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.hold_event_seats(
  uuid,
  uuid[],
  uuid,
  uuid,
  integer
)
TO authenticated;

-- ============================================================
-- END
-- ============================================================
