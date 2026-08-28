CREATE OR REPLACE FUNCTION public.cancel_expired_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_cancelled_count integer;
BEGIN
  UPDATE public.orders
  SET
    status = 'cancelled',
    payment_status = 'failed',
    updated_at = now()
  WHERE status = 'pending'
    AND payment_status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at <= now();

  GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;

  RETURN v_cancelled_count;
END;
$function$;

REVOKE ALL
ON FUNCTION public.cancel_expired_orders()
FROM PUBLIC;
