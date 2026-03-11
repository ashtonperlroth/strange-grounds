-- Route briefings: daily-refreshed conditions briefings for popular routes (SEO pages)

CREATE TABLE route_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  popular_route_id UUID NOT NULL REFERENCES popular_routes(id) ON DELETE CASCADE,
  briefing_data JSONB NOT NULL,
  readiness TEXT CHECK (readiness IN ('green', 'yellow', 'orange', 'red')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  conditions_hash TEXT,
  UNIQUE(popular_route_id)
);

CREATE INDEX idx_route_briefings_route_id ON route_briefings(popular_route_id);
CREATE INDEX idx_route_briefings_generated_at ON route_briefings(generated_at);

ALTER TABLE route_briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read route briefings" ON route_briefings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM popular_routes WHERE id = popular_route_id AND published = true)
  );
