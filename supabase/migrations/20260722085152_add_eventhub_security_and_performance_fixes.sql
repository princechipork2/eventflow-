-- EventHub Security & Performance Fixes
-- Fixes: auth_rls_initplan, function_search_path_mutable, unindexed_foreign_keys

-- 1. FIX AUTH_RLS_INITPLAN — Wrap auth.uid() in (SELECT auth.uid()) for RLS policies

-- Events
DROP POLICY IF EXISTS "Organizers can insert events" ON public.events;
CREATE POLICY "Organizers can insert events"
  ON public.events FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = organizer_id);

DROP POLICY IF EXISTS "Organizers can update own events" ON public.events;
CREATE POLICY "Organizers can update own events"
  ON public.events FOR UPDATE
  USING ((SELECT auth.uid()) = organizer_id);

DROP POLICY IF EXISTS "Organizers can delete own events" ON public.events;
CREATE POLICY "Organizers can delete own events"
  ON public.events FOR DELETE
  USING ((SELECT auth.uid()) = organizer_id);

DROP POLICY IF EXISTS "Published events are viewable by everyone" ON public.events;
CREATE POLICY "Published events are viewable by everyone"
  ON public.events FOR SELECT
  USING (status = 'published' OR (SELECT auth.uid()) = organizer_id);

-- Profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = id);

-- Tickets
DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets;
CREATE POLICY "Users can view own tickets"
  ON public.tickets FOR SELECT
  USING (
    (SELECT auth.uid()) = attendee_id
    OR (SELECT auth.uid()) IN (
      SELECT organizer_id FROM public.events WHERE id = event_id
    )
  );

DROP POLICY IF EXISTS "Users can insert own tickets" ON public.tickets;
CREATE POLICY "Users can insert own tickets"
  ON public.tickets FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = attendee_id);

-- Ticket Tiers
DROP POLICY IF EXISTS "Organizers can manage ticket tiers" ON public.ticket_tiers;
CREATE POLICY "Organizers can manage ticket tiers"
  ON public.ticket_tiers FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) IN (
      SELECT organizer_id FROM public.events WHERE id = event_id
    )
  );

DROP POLICY IF EXISTS "Organizers can update ticket tiers" ON public.ticket_tiers;
CREATE POLICY "Organizers can update ticket tiers"
  ON public.ticket_tiers FOR UPDATE
  USING (
    (SELECT auth.uid()) IN (
      SELECT organizer_id FROM public.events WHERE id = event_id
    )
  );

-- Reviews
DROP POLICY IF EXISTS "Authenticated users can leave reviews" ON public.reviews;
CREATE POLICY "Authenticated users can leave reviews"
  ON public.reviews FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;
CREATE POLICY "Users can delete their own reviews"
  ON public.reviews FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- 2. FIX MUTABLE SEARCH_PATH — Set search_path on functions

CREATE OR REPLACE FUNCTION public.buy_tickets(
  p_event_id uuid,
  p_ticket_tier_id uuid,
  p_quantity integer,
  p_total_amount numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
declare
  v_tier record;
  v_ticket_id uuid;
  v_ticket_code text;
  v_user_id uuid;
begin
  -- Get the authenticated user
  v_user_id := auth.uid();

  if v_user_id is null then
    return json_build_object('success', false, 'error', 'Not authenticated');
  end if;

  -- Lock the ticket tier row to prevent race conditions
  select * into v_tier
  from public.ticket_tiers
  where id = p_ticket_tier_id and event_id = p_event_id
  for update;

  if not found then
    return json_build_object('success', false, 'error', 'Ticket tier not found');
  end if;

  -- Check availability
  if v_tier.sold + p_quantity > v_tier.quantity then
    return json_build_object('success', false, 'error', 'Not enough tickets available');
  end if;

  -- Update sold count
  update public.ticket_tiers
  set sold = sold + p_quantity
  where id = p_ticket_tier_id;

  -- Update events tickets_sold column
  update public.events
  set tickets_sold = tickets_sold + p_quantity
  where id = p_event_id;

  -- Generate ticket code
  v_ticket_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

  -- Create the ticket/order
  insert into public.tickets (
    event_id,
    attendee_id,
    ticket_code,
    quantity,
    total_amount,
    status
  )
  values (
    p_event_id,
    v_user_id,
    v_ticket_code,
    p_quantity,
    p_total_amount,
    'confirmed'
  )
  returning id into v_ticket_id;

  return json_build_object(
    'success', true,
    'ticket_id', v_ticket_id,
    'ticket_code', v_ticket_code
  );
end;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'attendee')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$;

-- 3. ADD MISSING FK INDEXES (unindexed_foreign_keys fix)

CREATE INDEX IF NOT EXISTS idx_reviews_event_id
  ON public.reviews (event_id);

CREATE INDEX IF NOT EXISTS idx_reviews_user_id
  ON public.reviews (user_id);

CREATE INDEX IF NOT EXISTS idx_ticket_tiers_event_id
  ON public.ticket_tiers (event_id);
