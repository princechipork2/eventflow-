-- Allow organizers to securely view attendee information
-- for events they own, without exposing ticket records globally.

CREATE OR REPLACE FUNCTION public.get_event_attendees(
  p_event_id uuid
)
RETURNS TABLE (
  ticket_id uuid,
  attendee_id uuid,
  attendee_name text,
  attendee_email text,
  ticket_tier_name text,
  quantity integer,
  total_amount numeric,
  ticket_status text,
  purchase_date timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only the organizer of the event may call this function.
  IF NOT EXISTS (
    SELECT 1
    FROM public.events
    WHERE events.id = p_event_id
      AND events.organizer_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are not authorized to view attendees for this event.';
  END IF;

  RETURN QUERY
  SELECT
    t.id AS ticket_id,
    t.attendee_id,
    COALESCE(p.full_name, 'Attendee') AS attendee_name,
    COALESCE(p.email, '') AS attendee_email,
    COALESCE(tt.name, 'Ticket') AS ticket_tier_name,
    t.quantity,
    t.total_amount,
    t.status::text AS ticket_status,
    t.purchase_date
  FROM public.tickets t
  LEFT JOIN public.profiles p
    ON p.id = t.attendee_id
  LEFT JOIN public.ticket_tiers tt
    ON tt.id = (
      SELECT oi.ticket_tier_id
      FROM public.order_items oi
      WHERE oi.order_id = t.order_id
      LIMIT 1
    )
  WHERE t.event_id = p_event_id
  ORDER BY t.purchase_date DESC;
END;
$function$;

REVOKE ALL
ON FUNCTION public.get_event_attendees(uuid)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.get_event_attendees(uuid)
TO authenticated;
