CREATE OR REPLACE FUNCTION public.create_paid_ticket_order(
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
  v_total_amount numeric;
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

  IF v_tier.type <> 'paid' THEN
    RAISE EXCEPTION 'This ticket tier is not a paid ticket.';
  END IF;

  IF COALESCE(v_tier.quantity, 0) - COALESCE(v_tier.sold, 0) < p_quantity THEN
    RAISE EXCEPTION 'Not enough tickets remaining.';
  END IF;

  v_total_amount := COALESCE(v_tier.price, 0) * p_quantity;

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
    'pending',
    v_total_amount,
    'pending',
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
    COALESCE(v_tier.price, 0),
    v_total_amount
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'quantity', p_quantity,
    'total_amount', v_total_amount,
    'currency', 'NGN'
  );
END;
$function$;

REVOKE ALL
ON FUNCTION public.create_paid_ticket_order(uuid, uuid, integer)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.create_paid_ticket_order(uuid, uuid, integer)
TO authenticated;
