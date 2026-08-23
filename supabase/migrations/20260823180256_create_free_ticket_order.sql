CREATE OR REPLACE FUNCTION public.create_free_ticket_order(
  p_event_id uuid,
  p_ticket_tier_id uuid,
  p_quantity integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid;
  v_tier public.ticket_tiers%ROWTYPE;
  v_order_id uuid;
  v_ticket_id uuid;
  v_ticket_code text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero.';
  END IF;

  SELECT *
  INTO v_tier
  FROM public.ticket_tiers
  WHERE id = p_ticket_tier_id
    AND event_id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket tier not found.';
  END IF;

  IF v_tier.type <> 'free' THEN
    RAISE EXCEPTION 'This ticket tier is not free.';
  END IF;

  IF COALESCE(v_tier.quantity, 0) - COALESCE(v_tier.sold, 0) < p_quantity THEN
    RAISE EXCEPTION 'Not enough tickets remaining.';
  END IF;

  INSERT INTO public.orders (
    user_id,
    event_id,
    status,
    total_amount,
    payment_status,
    currency
  )
  VALUES (
    v_user_id,
    p_event_id,
    'confirmed',
    0,
    'successful',
    'NGN'
  )
  RETURNING id INTO v_order_id;

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
    0,
    0
  );

  UPDATE public.ticket_tiers
  SET sold = COALESCE(sold, 0) + p_quantity
  WHERE id = p_ticket_tier_id;

  UPDATE public.events
  SET
    tickets_sold = COALESCE(tickets_sold, 0) + p_quantity,
    available_tickets = GREATEST(
      COALESCE(available_tickets, total_tickets) - p_quantity,
      0
    ),
    updated_at = now()
  WHERE id = p_event_id;

  INSERT INTO public.tickets (
    event_id,
    attendee_id,
    quantity,
    total_amount,
    status,
    order_id
  )
  VALUES (
    p_event_id,
    v_user_id,
    p_quantity,
    0,
    'confirmed',
    v_order_id
  )
  RETURNING id, ticket_code
  INTO v_ticket_id, v_ticket_code;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'ticket_id', v_ticket_id,
    'ticket_code', v_ticket_code,
    'quantity', p_quantity,
    'total_amount', 0,
    'currency', 'NGN'
  );
END;
$function$;

GRANT EXECUTE
ON FUNCTION public.create_free_ticket_order(uuid, uuid, integer)
TO authenticated;
