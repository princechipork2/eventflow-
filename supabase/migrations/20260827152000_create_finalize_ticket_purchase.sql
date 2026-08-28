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
  v_remaining integer;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.';
  END IF;

  /*
   * Lock the order so two browser tabs/callbacks cannot
   * finalize the same purchase simultaneously.
   */
  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or you do not own this order.';
  END IF;

  /*
   * Idempotency:
   * If this order was already finalized, return success
   * without creating another ticket or incrementing sales.
   */
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
      'message', 'Ticket purchase already finalized.'
    );
  END IF;

  /*
   * Payment must already have been verified by the
   * verify-payment Edge Function.
   */
  IF v_order.payment_status <> 'successful' THEN
    RAISE EXCEPTION 'Payment has not been successfully verified.';
  END IF;

  IF v_order.payment_reference IS NULL
     OR v_order.payment_reference <> p_payment_reference
  THEN
    RAISE EXCEPTION 'Payment reference does not match the verified payment.';
  END IF;

  /*
   * The order must still be pending.
   */
  IF v_order.status <> 'pending' THEN
    RAISE EXCEPTION 'This order cannot be finalized in its current status.';
  END IF;

  /*
   * Fetch the order item belonging to the requested ticket tier.
   */
  SELECT *
  INTO v_item
  FROM public.order_items
  WHERE order_id = p_order_id
    AND ticket_tier_id = p_ticket_tier_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order item does not match the requested ticket tier.';
  END IF;

  /*
   * Lock the ticket tier and check availability again.
   * This is important because another purchase may have consumed
   * tickets after the order was initially created.
   */
  SELECT *
  INTO v_tier
  FROM public.ticket_tiers
  WHERE id = p_ticket_tier_id
    AND event_id = v_order.event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket tier not found.';
  END IF;

  v_remaining :=
    COALESCE(v_tier.quantity, 0)
    - COALESCE(v_tier.sold, 0);

  IF v_remaining < v_item.quantity THEN
    RAISE EXCEPTION 'Not enough tickets remaining to finalize this order.';
  END IF;

  /*
   * Create the actual confirmed ticket.
   */
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

  /*
   * Record the sale.
   */
  UPDATE public.ticket_tiers
  SET sold = COALESCE(sold, 0) + v_item.quantity
  WHERE id = p_ticket_tier_id;

  UPDATE public.events
  SET
    tickets_sold = COALESCE(tickets_sold, 0) + v_item.quantity,
    available_tickets = GREATEST(
      COALESCE(available_tickets, total_tickets)
        - v_item.quantity,
      0
    ),
    updated_at = now()
  WHERE id = v_order.event_id;

  /*
   * Confirm the order.
   */
  UPDATE public.orders
  SET
    status = 'confirmed',
    updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'ticket_id', v_ticket.id,
    'ticket_code', v_ticket.ticket_code,
    'quantity', v_ticket.quantity,
    'total_amount', v_ticket.total_amount,
    'message', 'Ticket purchase finalized successfully.'
  );
END;
$function$;

REVOKE ALL
ON FUNCTION public.finalize_ticket_purchase(uuid, uuid, text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.finalize_ticket_purchase(uuid, uuid, text)
TO authenticated;
