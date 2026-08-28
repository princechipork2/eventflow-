ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE INDEX IF NOT EXISTS orders_expires_at_idx
ON public.orders (expires_at)
WHERE status = 'pending';
