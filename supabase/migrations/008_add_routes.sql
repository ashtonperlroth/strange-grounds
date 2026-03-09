-- Routes table
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT,
  name TEXT,
  description TEXT,

  -- Geometry
  geometry GEOMETRY(LineString, 4326) NOT NULL,

  -- Computed stats (updated on geometry change)
  total_distance_m DOUBLE PRECISION,
  elevation_gain_m DOUBLE PRECISION,
  elevation_loss_m DOUBLE PRECISION,
  max_elevation_m DOUBLE PRECISION,
  min_elevation_m DOUBLE PRECISION,

  -- Metadata
  activity TEXT NOT NULL DEFAULT 'backpacking',
  source TEXT NOT NULL DEFAULT 'manual',
  source_route_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Route waypoints (ordered stops/turns along the route)
CREATE TABLE route_waypoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  name TEXT,
  location GEOMETRY(Point, 4326) NOT NULL,
  elevation_m DOUBLE PRECISION,
  waypoint_type TEXT NOT NULL DEFAULT 'waypoint',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Route segments (computed: logical divisions of the route for analysis)
CREATE TABLE route_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  segment_order INTEGER NOT NULL,
  geometry GEOMETRY(LineString, 4326) NOT NULL,

  -- Segment stats
  distance_m DOUBLE PRECISION,
  elevation_gain_m DOUBLE PRECISION,
  elevation_loss_m DOUBLE PRECISION,
  avg_slope_degrees DOUBLE PRECISION,
  dominant_aspect TEXT,
  max_slope_degrees DOUBLE PRECISION,

  -- Segment classification
  terrain_type TEXT,

  -- Hazard data (populated by analysis pipeline)
  hazard_level TEXT,
  hazard_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_routes_trip_id ON routes(trip_id);
CREATE INDEX idx_routes_user_id ON routes(user_id);
CREATE INDEX idx_routes_geometry ON routes USING GIST(geometry);
CREATE INDEX idx_route_waypoints_route_id ON route_waypoints(route_id);
CREATE INDEX idx_route_segments_route_id ON route_segments(route_id);
CREATE INDEX idx_route_segments_geometry ON route_segments USING GIST(geometry);

-- RLS policies
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_waypoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own routes" ON routes
  FOR ALL USING (auth.uid() = user_id OR session_token = current_setting('app.session_token', true));

CREATE POLICY "Users can manage own waypoints" ON route_waypoints
  FOR ALL USING (route_id IN (SELECT id FROM routes WHERE auth.uid() = user_id OR session_token = current_setting('app.session_token', true)));

CREATE POLICY "Users can manage own segments" ON route_segments
  FOR ALL USING (route_id IN (SELECT id FROM routes WHERE auth.uid() = user_id OR session_token = current_setting('app.session_token', true)));
