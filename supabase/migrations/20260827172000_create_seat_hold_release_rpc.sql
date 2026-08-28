-- ============================================================
-- EventFlow: Release Seat Hold RPC
-- ============================================================
--
-- Releases temporary seat holds belonging to the authenticated
-- buyer.
--
-- This function is intentionally SECURITY DEFINER so clients
-- cannot directly manipulate seat_holds.status.
--
-- Supported use cases:
--   1. Buyer changes selected seats
--   2. Buyer cancels checkout
--   3. Payment fails
--   4. Order is cancelled
--   5. Cleanup of expired checkout holds
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.release_event_seat_holds(
  p_event_id uuid,
  p_seat_ids uuid[] DEFAULT NULL,
  p_order_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid;
  v_released_count integer := 0;
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

  IF p_seat_ids IS NULL AND p_order_id IS NULL THEN
    RAISE EXCEPTION 'Seat IDs or order ID must be provided.';
  END IF;

  -- Prevent duplicate seat IDs.
  IF p_seat_ids IS NOT NULL
     AND cardinality(p_seat_ids) <>
         cardinality(
           ARRAY(
             SELECT DISTINCT unnest(p_seat_ids)
           )
         )
  THEN
    RAISE EXCEPTION 'Duplicate seat IDs were submitted.';
  END IF;

  -- ----------------------------------------------------------
  -- 3. Release matching active holds
  -- ----------------------------------------------------------
  --
  -- IMPORTANT:
  -- Only the authenticated user's holds can be released.
  --
  -- If p_order_id is supplied, only holds belonging to that
  -- order are released.
  --
  -- If p_seat_ids is supplied, only those seats are released.
  --
  -- Both filters can be supplied together.
  -- ----------------------------------------------------------

  UPDATE public.seat_holds
  SET
    status = 'released',
    released_at = now()
  WHERE event_id = p_event_id
    AND user_id = v_user_id
    AND status = 'held'
    AND expires_at > now()
    AND (
      p_seat_ids IS NULL
      OR seat_id = ANY(p_seat_ids)
    )
    AND (
      p_order_id IS NULL
      OR order_id = p_order_id
    );

  GET DIAGNOSTICS v_released_count = ROW_COUNT;

  -- ----------------------------------------------------------
  -- 4. Return result
  -- ----------------------------------------------------------

  RETURN jsonb_build_object(
    'success', true,
    'event_id', p_event_id,
    'order_id', p_order_id,
    'released_count', v_released_count,
    'message',
      CASE
        WHEN v_released_count = 0
        THEN 'No active seat holds were found.'
        ELSE 'Seat holds released successfully.'
      END
  );

END;
$function$;

-- ------------------------------------------------------------
-- Security
-- ------------------------------------------------------------

REVOKE ALL
ON FUNCTION public.release_event_seat_holds(
  uuid,
  uuid[],
  uuid
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.release_event_seat_holds(
  uuid,
  uuid[],
  uuid
)
TO authenticated;

-- ============================================================
-- END
-- ============================================================
