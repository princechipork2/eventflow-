-- Restore the order schema required by the EventFlow purchase flows.
-- This migration is intentionally timestamped before
-- 20260823180256_create_free_ticket_order.sql.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'order_status'
  ) THEN
    CREATE TYPE public.order_status AS ENUM (
      'pending',
      'confirmed',
      'cancelled',
      'refunded'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'payment_status'
  ) THEN
    CREATE TYPE public.payment_status AS ENUM (
      'pending',
      'successful',
      'failed',
      'refunded'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE RESTRICT,
  event_id uuid NOT NULL
    REFERENCES public.events(id)
    ON DELETE RESTRICT,
  status public.order_status NOT NULL DEFAULT 'pending',
  total_amount numeric NOT NULL DEFAULT 0,
  payment_reference text,
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  currency text NOT NULL DEFAULT 'NGN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  payment_verified_at timestamptz,
  CONSTRAINT orders_total_non_negative
    CHECK (total_amount >= 0),
  CONSTRAINT orders_currency_length
    CHECK (char_length(currency) = 3),
  CONSTRAINT orders_payment_reference_key
    UNIQUE (payment_reference)
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL
    REFERENCES public.orders(id)
    ON DELETE CASCADE,
  ticket_tier_id uuid NOT NULL
    REFERENCES public.ticket_tiers(id)
    ON DELETE RESTRICT,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_items_quantity_positive
    CHECK (quantity > 0),
  CONSTRAINT order_items_unit_price_non_negative
    CHECK (unit_price >= 0),
  CONSTRAINT order_items_subtotal_valid
    CHECK (subtotal >= 0),
  CONSTRAINT order_items_subtotal_calculation
    CHECK (subtotal = quantity::numeric * unit_price)
);

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS order_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tickets_order_id_fkey'
      AND conrelid = 'public.tickets'::regclass
  ) THEN
    ALTER TABLE public.tickets
      ADD CONSTRAINT tickets_order_id_fkey
      FOREIGN KEY (order_id)
      REFERENCES public.orders(id)
      ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS orders_user_id_idx
  ON public.orders (user_id);

CREATE INDEX IF NOT EXISTS orders_event_id_idx
  ON public.orders (event_id);

CREATE INDEX IF NOT EXISTS orders_status_idx
  ON public.orders (status);

CREATE INDEX IF NOT EXISTS orders_payment_reference_idx
  ON public.orders (payment_reference);

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_reference_key
  ON public.orders (payment_reference);

CREATE INDEX IF NOT EXISTS idx_orders_payment_verified_at
  ON public.orders (payment_verified_at);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx
  ON public.order_items (order_id);

CREATE INDEX IF NOT EXISTS order_items_ticket_tier_id_idx
  ON public.order_items (ticket_tier_id);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Organizers can view orders for their events" ON public.orders;
CREATE POLICY "Organizers can view orders for their events"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.events
      WHERE events.id = orders.event_id
        AND events.organizer_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can create their own order items" ON public.order_items;
CREATE POLICY "Users can create their own order items"
  ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view their order items" ON public.order_items;
CREATE POLICY "Users can view their order items"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Admins can view all order items"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
