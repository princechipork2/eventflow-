CREATE OR REPLACE FUNCTION public.finalize_ticket_purchase(
  p_order_id uuid,
  p_ticket_tier_id uuid,
  p_payment_reference text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_tier public.ticket_tiers%ROWTYPE;
  v_ticket public.tickets%ROWTYPE;
  v_quantity integer;
BEGIN

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF v_order.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You do not own this order.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.order_items
    WHERE order_id = v_order.id
      AND ticket_tier_id = p_ticket_tier_id
  ) THEN
    RAISE EXCEPTION 'Ticket tier does not belong to this order.';
  END IF;

  SELECT COALESCE(SUM(quantity), 0)
  INTO v_quantity
  FROM public.order_items
  WHERE order_id = v_order.id;

  IF v_quantity <= 0 THEN
    RAISE EXCEPTION 'Order has no tickets.';
  END IF;

  /*
   * A paid order must have been independently verified by the
   * verify-payment Edge Function.
   */
  IF v_order.payment_verified_at IS NULL THEN
    RAISE EXCEPTION 'Payment has not been server-verified.';
  END IF;

  /*
   * The reference supplied by the browser must match the
   * reference that was verified server-side.
   */
  IF v_order.payment_reference IS DISTINCT FROM p_payment_reference THEN
    RAISE EXCEPTION 'Payment reference does not match the verified payment.';
  END IF;

  IF v_order.payment_status = 'successful' THEN

    SELECT *
    INTO v_ticket
    FROM public.tickets
    WHERE order_id = v_order.id
    ORDER BY purchase_date DESC
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'already_processed', true,
        'order_id', v_order.id,
        'ticket_id', v_ticket.id,
        'ticket_code', v_ticket.ticket_code,
        'quantity', v_ticket.quantity,
        'total_amount', v_ticket.total_amount
      );
    END IF;

  END IF;

  SELECT *
  INTO v_tier
  FROM public.ticket_tiers
  WHERE id = p_ticket_tier_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket tier not found.';
  END IF;

  IF v_tier.event_id <> v_order.event_id THEN
    RAISE EXCEPTION 'Ticket tier does not belong to this event.';
  END IF;

  IF COALESCE(v_tier.quantity, 0) - COALESCE(v_tier.sold, 0)
     < v_quantity
  THEN
    RAISE EXCEPTION 'Not enough tickets remaining.';
  END IF;

  UPDATE public.orders
  SET
    status = 'confirmed',
    payment_status = 'successful',
    payment_reference = p_payment_reference,
    updated_at = now()
  WHERE id = v_order.id;

  UPDATE public.ticket_tiers
  SET sold = COALESCE(sold, 0) + v_quantity
  WHERE id = p_ticket_tier_id;

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
    v_order.user_id,
    v_quantity,
    v_order.total_amount,
    'confirmed',
    v_order.id
  )
  RETURNING *
  INTO v_ticket;

  RETURN jsonb_build_object(
    'success', true,
    'already_processed', false,
    'order_id', v_order.id,
    'ticket_id', v_ticket.id,
    'ticket_code', v_ticket.ticket_code,
    'quantity', v_ticket.quantity,
    'total_amount', v_ticket.total_amount
  );

END;
$function$;
