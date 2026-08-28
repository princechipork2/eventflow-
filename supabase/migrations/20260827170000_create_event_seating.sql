-- ============================================================
-- EventFlow: Assigned Seating Schema
-- ============================================================

-- 1. Seating mode
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS seating_mode text
  NOT NULL DEFAULT 'general_admission';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_seating_mode_check'
      AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_seating_mode_check
      CHECK (
        seating_mode IN ('general_admission', 'reserved')
      );
  END IF;
END
$$;


-- ============================================================
-- 2. event_seats
-- ============================================================

CREATE TABLE IF NOT EXISTS public.event_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  event_id uuid NOT NULL
    REFERENCES public.events(id)
    ON DELETE CASCADE,

  section text,
  row_label text,
  seat_number integer NOT NULL,
  label text NOT NULL,

  position_x numeric,
  position_y numeric,

  seat_type text NOT NULL DEFAULT 'standard',

  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT event_seats_seat_number_positive
    CHECK (seat_number > 0),

  CONSTRAINT event_seats_position_x_valid
    CHECK (position_x IS NULL OR position_x >= 0),

  CONSTRAINT event_seats_position_y_valid
    CHECK (position_y IS NULL OR position_y >= 0)
);


CREATE UNIQUE INDEX IF NOT EXISTS
  event_seats_event_section_row_number_key
ON public.event_seats (
  event_id,
  COALESCE(section, ''),
  COALESCE(row_label, ''),
  seat_number
);


CREATE UNIQUE INDEX IF NOT EXISTS
  event_seats_event_label_key
ON public.event_seats (
  event_id,
  label
);


CREATE INDEX IF NOT EXISTS
  event_seats_event_id_idx
ON public.event_seats (event_id);


CREATE INDEX IF NOT EXISTS
  event_seats_event_active_idx
ON public.event_seats (
  event_id,
  is_active
);


-- ============================================================
-- 3. seat_holds
-- ============================================================

CREATE TABLE IF NOT EXISTS public.seat_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  event_id uuid NOT NULL
    REFERENCES public.events(id)
    ON DELETE CASCADE,

  seat_id uuid NOT NULL
    REFERENCES public.event_seats(id)
    ON DELETE CASCADE,

  user_id uuid NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  order_id uuid
    REFERENCES public.orders(id)
    ON DELETE CASCADE,

  ticket_tier_id uuid
    REFERENCES public.ticket_tiers(id)
    ON DELETE RESTRICT,

  status text NOT NULL DEFAULT 'held'
    CHECK (
      status IN (
        'held',
        'converted',
        'released',
        'expired'
      )
    ),

  expires_at timestamptz NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),

  released_at timestamptz
);


CREATE UNIQUE INDEX IF NOT EXISTS
  seat_holds_one_active_hold_per_seat
ON public.seat_holds (seat_id)
WHERE status = 'held';


CREATE INDEX IF NOT EXISTS
  seat_holds_event_id_idx
ON public.seat_holds (event_id);


CREATE INDEX IF NOT EXISTS
  seat_holds_user_id_idx
ON public.seat_holds (user_id);


CREATE INDEX IF NOT EXISTS
  seat_holds_order_id_idx
ON public.seat_holds (order_id);


CREATE INDEX IF NOT EXISTS
  seat_holds_expires_at_idx
ON public.seat_holds (expires_at);


CREATE INDEX IF NOT EXISTS
  seat_holds_seat_id_idx
ON public.seat_holds (seat_id);


-- ============================================================
-- 4. ticket_seats
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ticket_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  ticket_id uuid NOT NULL
    REFERENCES public.tickets(id)
    ON DELETE CASCADE,

  seat_id uuid NOT NULL
    REFERENCES public.event_seats(id)
    ON DELETE RESTRICT,

  assigned_at timestamptz NOT NULL DEFAULT now()
);


CREATE UNIQUE INDEX IF NOT EXISTS
  ticket_seats_unique_seat
ON public.ticket_seats (seat_id);


CREATE UNIQUE INDEX IF NOT EXISTS
  ticket_seats_ticket_seat_key
ON public.ticket_seats (
  ticket_id,
  seat_id
);


CREATE INDEX IF NOT EXISTS
  ticket_seats_ticket_id_idx
ON public.ticket_seats (ticket_id);


CREATE INDEX IF NOT EXISTS
  ticket_seats_seat_id_idx
ON public.ticket_seats (seat_id);


-- ============================================================
-- 5. Enable RLS
-- ============================================================

ALTER TABLE public.event_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_seats ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 6. event_seats RLS
-- ============================================================

DROP POLICY IF EXISTS
  "Published event seats are publicly viewable"
ON public.event_seats;


CREATE POLICY
  "Published event seats are publicly viewable"
ON public.event_seats
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.events
    WHERE events.id = event_seats.event_id
      AND events.status = 'published'
  )
);


DROP POLICY IF EXISTS
  "Organizers can manage event seats"
ON public.event_seats;


CREATE POLICY
  "Organizers can manage event seats"
ON public.event_seats
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.events
    WHERE events.id = event_seats.event_id
      AND events.organizer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.events
    WHERE events.id = event_seats.event_id
      AND events.organizer_id = auth.uid()
  )
);


-- ============================================================
-- 7. seat_holds RLS
-- ============================================================

DROP POLICY IF EXISTS
  "Users can view their own seat holds"
ON public.seat_holds;


CREATE POLICY
  "Users can view their own seat holds"
ON public.seat_holds
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);


DROP POLICY IF EXISTS
  "Organizers can view event seat holds"
ON public.seat_holds;


CREATE POLICY
  "Organizers can view event seat holds"
ON public.seat_holds
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.events
    WHERE events.id = seat_holds.event_id
      AND events.organizer_id = auth.uid()
  )
);


-- ============================================================
-- 8. ticket_seats RLS
-- ============================================================

DROP POLICY IF EXISTS
  "Users can view their ticket seats"
ON public.ticket_seats;


CREATE POLICY
  "Users can view their ticket seats"
ON public.ticket_seats
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tickets
    WHERE tickets.id = ticket_seats.ticket_id
      AND tickets.attendee_id = auth.uid()
  )
);


DROP POLICY IF EXISTS
  "Organizers can view ticket seats"
ON public.ticket_seats;


CREATE POLICY
  "Organizers can view ticket seats"
ON public.ticket_seats
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tickets
    JOIN public.events
      ON events.id = tickets.event_id
    WHERE tickets.id = ticket_seats.ticket_id
      AND events.organizer_id = auth.uid()
  )
);


-- ============================================================
-- 9. Documentation
-- ============================================================

COMMENT ON TABLE public.event_seats IS
  'Physical/selectable seats belonging to an event.';

COMMENT ON TABLE public.seat_holds IS
  'Temporary seat reservations during ticket checkout.';

COMMENT ON TABLE public.ticket_seats IS
  'Permanent seat assignments attached to confirmed tickets.';

COMMENT ON COLUMN public.events.seating_mode IS
  'Event seating mode: general_admission or reserved.';

COMMENT ON COLUMN public.seat_holds.expires_at IS
  'Time after which an unconverted seat hold may be released.';


-- ============================================================
-- END
-- ============================================================
