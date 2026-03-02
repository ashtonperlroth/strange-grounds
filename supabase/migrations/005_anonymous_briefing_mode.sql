-- Allow anonymous trips: make user_id nullable
ALTER TABLE trips ALTER COLUMN user_id DROP NOT NULL;

-- Anonymous usage tracking for rate limiting
CREATE TABLE anonymous_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  used_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX anonymous_usage_ip_date_idx ON anonymous_usage (ip_address, used_at);

-- RLS for anonymous_usage (admin-only via service role)
ALTER TABLE anonymous_usage ENABLE ROW LEVEL SECURITY;

-- Allow anonymous trip insertion (user_id is null for anonymous users)
CREATE POLICY "Anonymous trips can be created" ON trips
  FOR INSERT WITH CHECK (user_id IS NULL);

-- Allow anonymous trip reads (admin client is used for most operations,
-- but this covers direct Supabase client access for polling)
CREATE POLICY "Anonymous trips viewable by id" ON trips
  FOR SELECT USING (user_id IS NULL);

-- Allow briefings for anonymous trips to be read
CREATE POLICY "Briefings for anonymous trips are viewable" ON briefings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = briefings.trip_id
        AND trips.user_id IS NULL
    )
  );
