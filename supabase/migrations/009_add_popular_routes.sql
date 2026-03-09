-- Popular routes: curated backcountry routes for browsing, previewing, and cloning

CREATE TABLE popular_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,

  geometry GEOMETRY(LineString, 4326) NOT NULL,

  total_distance_m DOUBLE PRECISION NOT NULL,
  elevation_gain_m DOUBLE PRECISION NOT NULL,
  elevation_loss_m DOUBLE PRECISION NOT NULL,
  max_elevation_m DOUBLE PRECISION NOT NULL,
  min_elevation_m DOUBLE PRECISION NOT NULL,

  activity TEXT NOT NULL CHECK (activity IN ('backpacking', 'ski_touring', 'mountaineering', 'trail_running')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'moderate', 'strenuous', 'expert')),
  region TEXT NOT NULL,
  state TEXT NOT NULL CHECK (char_length(state) = 2),

  best_months INTEGER[] NOT NULL CHECK (array_length(best_months, 1) > 0),
  season_notes TEXT,

  estimated_days NUMERIC(3,1),
  permit_required BOOLEAN DEFAULT false,
  permit_info TEXT,
  trailhead_name TEXT,
  trailhead_location GEOMETRY(Point, 4326),

  times_cloned INTEGER DEFAULT 0,

  meta_title TEXT,
  meta_description TEXT,

  is_featured BOOLEAN DEFAULT false,
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE popular_route_waypoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES popular_routes(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  location GEOMETRY(Point, 4326) NOT NULL,
  elevation_m DOUBLE PRECISION,
  waypoint_type TEXT NOT NULL DEFAULT 'waypoint' CHECK (waypoint_type IN ('start', 'waypoint', 'camp', 'pass', 'water', 'summit', 'end')),
  description TEXT,
  UNIQUE(route_id, sort_order)
);

-- Indexes
CREATE INDEX idx_popular_routes_slug ON popular_routes(slug);
CREATE INDEX idx_popular_routes_activity ON popular_routes(activity);
CREATE INDEX idx_popular_routes_region ON popular_routes(region);
CREATE INDEX idx_popular_routes_state ON popular_routes(state);
CREATE INDEX idx_popular_routes_difficulty ON popular_routes(difficulty);
CREATE INDEX idx_popular_routes_geometry ON popular_routes USING GIST(geometry);
CREATE INDEX idx_popular_routes_featured ON popular_routes(is_featured) WHERE is_featured = true;
CREATE INDEX idx_popular_routes_published ON popular_routes(published) WHERE published = true;
CREATE INDEX idx_popular_route_waypoints_route_id ON popular_route_waypoints(route_id);
CREATE INDEX idx_popular_routes_search ON popular_routes USING GIN(to_tsvector('english', name || ' ' || description));

-- RLS: public read for published routes, admin-only writes
ALTER TABLE popular_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published popular routes" ON popular_routes
  FOR SELECT USING (published = true);

ALTER TABLE popular_route_waypoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read popular route waypoints" ON popular_route_waypoints
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM popular_routes WHERE id = route_id AND published = true)
  );

-- Atomic clone counter increment
CREATE OR REPLACE FUNCTION increment_times_cloned(route_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE popular_routes
  SET times_cloned = times_cloned + 1, updated_at = now()
  WHERE id = route_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
