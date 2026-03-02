-- RPC to find nearest SNOTEL stations using PostGIS
CREATE OR REPLACE FUNCTION find_nearest_snotel_stations(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_m INTEGER DEFAULT 50000,
  p_limit INTEGER DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  station_id TEXT,
  name TEXT,
  elevation_m REAL,
  distance_km DOUBLE PRECISION,
  metadata JSONB
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    s.id,
    s.station_id,
    s.name,
    s.elevation_m,
    ST_Distance(s.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) / 1000.0 AS distance_km,
    s.metadata
  FROM stations s
  WHERE s.source = 'snotel'
    AND ST_DWithin(s.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_m)
  ORDER BY distance_km
  LIMIT p_limit;
$$;

-- RPC to find avalanche zone containing a given point
CREATE OR REPLACE FUNCTION find_avalanche_zone(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
)
RETURNS TABLE (
  id UUID,
  center_id TEXT,
  zone_id TEXT,
  name TEXT,
  api_url TEXT,
  metadata JSONB
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    z.id,
    z.center_id,
    z.zone_id,
    z.name,
    z.api_url,
    z.metadata
  FROM avalanche_zones z
  WHERE ST_Covers(z.boundary, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography)
  LIMIT 1;
$$;
