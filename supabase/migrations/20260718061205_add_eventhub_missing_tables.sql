-- Add missing columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS short_description text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_date timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/New_York';
ALTER TABLE events ADD COLUMN IF NOT EXISTS cover_image text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS gallery_images text[] DEFAULT '{}';
ALTER TABLE events ADD COLUMN IF NOT EXISTS min_price numeric DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_price numeric DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer_name text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS tickets_sold integer DEFAULT 0;

-- Create ticket_tiers table
CREATE TABLE IF NOT EXISTS ticket_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric DEFAULT 0,
  quantity integer DEFAULT 100,
  sold integer DEFAULT 0,
  type text DEFAULT 'paid' CHECK (type IN ('free', 'paid', 'donation')),
  benefits text[] DEFAULT '{}',
  is_early_bird boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS for ticket_tiers: SELECT is public, INSERT/UPDATE/DELETE only for organizer
CREATE POLICY "Ticket tiers are publicly viewable" ON ticket_tiers
  FOR SELECT USING (true);

CREATE POLICY "Organizers can manage their event ticket tiers" ON ticket_tiers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = ticket_tiers.event_id
      AND events.organizer_id = auth.uid()
    )
  );

-- RLS for reviews: SELECT is public, INSERT for authenticated users, UPDATE/DELETE for own
CREATE POLICY "Reviews are publicly viewable" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" ON reviews
  FOR DELETE USING (auth.uid() = user_id);

-- Update existing RLS policies on events table (add missing policies)
DROP POLICY IF EXISTS "Events are publicly viewable" ON events;

CREATE POLICY "Events are publicly viewable" ON events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Organizers can create events" ON events;

CREATE POLICY "Organizers can create events" ON events
  FOR INSERT WITH CHECK (
    auth.uid() = organizer_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'organizer'
    )
  );

DROP POLICY IF EXISTS "Organizers can update their events" ON events;

CREATE POLICY "Organizers can update their events" ON events
  FOR UPDATE USING (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "Organizers can delete their events" ON events;

CREATE POLICY "Organizers can delete their events" ON events
  FOR DELETE USING (auth.uid() = organizer_id);

-- Update RLS on tickets table
DROP POLICY IF EXISTS "Tickets are viewable by attendee or organizer" ON tickets;

CREATE POLICY "Tickets are viewable by attendee or organizer" ON tickets
  FOR SELECT USING (
    auth.uid() = attendee_id
    OR EXISTS (
      SELECT 1 FROM events
      WHERE events.id = tickets.event_id
      AND events.organizer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Attendees can purchase tickets" ON tickets;

CREATE POLICY "Attendees can purchase tickets" ON tickets
  FOR INSERT WITH CHECK (auth.uid() = attendee_id);

DROP POLICY IF EXISTS "Attendees can update their own tickets" ON tickets;

CREATE POLICY "Attendees can update their own tickets" ON tickets
  FOR UPDATE USING (auth.uid() = attendee_id);

-- Update profiles RLS
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
