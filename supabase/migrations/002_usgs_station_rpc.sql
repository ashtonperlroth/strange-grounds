-- RPC to find nearest USGS stream gauge stations using PostGIS
CREATE OR REPLACE FUNCTION find_nearest_usgs_stations(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_m INTEGER DEFAULT 30000,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  station_id TEXT,
  name TEXT,
  distance_km DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    s.id,
    s.station_id,
    s.name,
    ST_Distance(s.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) / 1000.0 AS distance_km
  FROM stations s
  WHERE s.source = 'usgs'
    AND ST_DWithin(s.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_m)
  ORDER BY distance_km
  LIMIT p_limit;
$$;
