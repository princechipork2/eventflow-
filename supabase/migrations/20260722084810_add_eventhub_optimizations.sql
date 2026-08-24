-- 1. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_events_category_date ON public.events (category, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON public.events (organizer_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_published ON public.events (event_date DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_tickets_attendee ON public.tickets (attendee_id, purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_event ON public.tickets (event_id);

-- 2. CHECK CONSTRAINTS
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_available_tickets_check;
ALTER TABLE public.events ADD CONSTRAINT events_available_tickets_check
  CHECK (available_tickets >= 0 AND available_tickets <= total_tickets);

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_ticket_price_check;
ALTER TABLE public.events ADD CONSTRAINT events_ticket_price_check
  CHECK (ticket_price >= 0);

ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_quantity_check;
ALTER TABLE public.tickets ADD CONSTRAINT tickets_quantity_check
  CHECK (quantity > 0);

ALTER TABLE public.ticket_tiers DROP CONSTRAINT IF EXISTS ticket_tiers_quantity_check;
ALTER TABLE public.ticket_tiers ADD CONSTRAINT ticket_tiers_quantity_check
  CHECK (quantity >= 0);

ALTER TABLE public.ticket_tiers DROP CONSTRAINT IF EXISTS ticket_tiers_sold_check;
ALTER TABLE public.ticket_tiers ADD CONSTRAINT ticket_tiers_sold_check
  CHECK (sold >= 0);

ALTER TABLE public.ticket_tiers DROP CONSTRAINT IF EXISTS ticket_tiers_price_check;
ALTER TABLE public.ticket_tiers ADD CONSTRAINT ticket_tiers_price_check
  CHECK (price >= 0);

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_rating_check;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_check
  CHECK (rating >= 1 AND rating <= 5);

-- 3. RLS POLICIES
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Published events are viewable by everyone" ON public.events;
CREATE POLICY "Published events are viewable by everyone"
  ON public.events FOR SELECT
  USING (status = 'published' OR auth.uid() = organizer_id);

DROP POLICY IF EXISTS "Organizers can insert events" ON public.events;
CREATE POLICY "Organizers can insert events"
  ON public.events FOR INSERT WITH CHECK (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "Organizers can update own events" ON public.events;
CREATE POLICY "Organizers can update own events"
  ON public.events FOR UPDATE USING (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "Organizers can delete own events" ON public.events;
CREATE POLICY "Organizers can delete own events"
  ON public.events FOR DELETE USING (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets;
CREATE POLICY "Users can view own tickets"
  ON public.tickets FOR SELECT
  USING (
    auth.uid() = attendee_id
    OR auth.uid() IN (
      SELECT organizer_id FROM public.events WHERE id = event_id
    )
  );

DROP POLICY IF EXISTS "Users can insert own tickets" ON public.tickets;
CREATE POLICY "Users can insert own tickets"
  ON public.tickets FOR INSERT WITH CHECK (auth.uid() = attendee_id);

DROP POLICY IF EXISTS "Ticket tiers are viewable by everyone" ON public.ticket_tiers;
CREATE POLICY "Ticket tiers are viewable by everyone"
  ON public.ticket_tiers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Organizers can manage ticket tiers" ON public.ticket_tiers;
CREATE POLICY "Organizers can manage ticket tiers"
  ON public.ticket_tiers FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT organizer_id FROM public.events WHERE id = event_id
    )
  );

DROP POLICY IF EXISTS "Organizers can update ticket tiers" ON public.ticket_tiers;
CREATE POLICY "Organizers can update ticket tiers"
  ON public.ticket_tiers FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT organizer_id FROM public.events WHERE id = event_id
    )
  );

DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews are viewable by everyone"
  ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can leave reviews" ON public.reviews;
CREATE POLICY "Authenticated users can leave reviews"
  ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
