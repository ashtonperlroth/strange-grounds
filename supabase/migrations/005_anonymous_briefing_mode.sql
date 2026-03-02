-- Allow anonymous trips: make user_id nullable, add session_token
ALTER TABLE trips ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE trips ADD COLUMN session_token UUID;
CREATE INDEX trips_session_token_idx ON trips (session_token) WHERE session_token IS NOT NULL;

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

-- RLS policies for anonymous trip creation and polling
CREATE POLICY "Anonymous trips can be created" ON trips
  FOR INSERT WITH CHECK (user_id IS NULL AND session_token IS NOT NULL);

CREATE POLICY "Anonymous trips viewable by session token" ON trips
  FOR SELECT USING (session_token IS NOT NULL AND user_id IS NULL);

-- Allow anonymous briefing inserts (via admin client, but also for completeness)
CREATE POLICY "Briefings for anonymous trips are viewable" ON briefings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = briefings.trip_id
        AND trips.user_id IS NULL
        AND trips.session_token IS NOT NULL
    )
  );
