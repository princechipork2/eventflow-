-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'attendee' CHECK (role IN ('organizer', 'attendee')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  venue TEXT,
  venue_address TEXT,
  venue_city TEXT,
  venue_state TEXT,
  venue_country TEXT DEFAULT 'USA',
  event_date DATE,
  event_time TIME,
  ticket_price NUMERIC(10,2) DEFAULT 0,
  total_tickets INTEGER DEFAULT 100,
  available_tickets INTEGER DEFAULT 100,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  tags TEXT[] DEFAULT '{}',
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  attendee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ticket_code TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded'))
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Events RLS
CREATE POLICY "Anyone can view published events"
  ON public.events FOR SELECT
  USING (status = 'published' OR auth.uid() = organizer_id);

CREATE POLICY "Organizers can create events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update their own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their own events"
  ON public.events FOR DELETE
  USING (auth.uid() = organizer_id);

-- Tickets RLS
CREATE POLICY "Attendees can view their own tickets"
  ON public.tickets FOR SELECT
  USING (
    attendee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = tickets.event_id
      AND events.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Attendees can purchase tickets"
  ON public.tickets FOR INSERT
  WITH CHECK (attendee_id = auth.uid());

-- Function + Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'attendee')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for event posters
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-posters', 'event-posters', true)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket RLS: public read, authenticated upload
CREATE POLICY "Public can view event posters"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-posters');

CREATE POLICY "Authenticated users can upload event posters"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'event-posters'
    AND auth.role() = 'authenticated'
  );
