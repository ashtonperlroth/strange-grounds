-- RPC to find USGS stations within a bounding box
CREATE OR REPLACE FUNCTION find_usgs_stations_in_bbox(
  p_west DOUBLE PRECISION,
  p_south DOUBLE PRECISION,
  p_east DOUBLE PRECISION,
  p_north DOUBLE PRECISION,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  station_id TEXT,
  name TEXT,
  lng DOUBLE PRECISION,
  lat DOUBLE PRECISION,
  elevation_m REAL
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    s.id,
    s.station_id,
    s.name,
    ST_X(s.location::geometry) AS lng,
    ST_Y(s.location::geometry) AS lat,
    s.elevation_m
  FROM stations s
  WHERE s.source = 'usgs'
    AND ST_Intersects(
      s.location,
      ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326)::geography
    )
  LIMIT p_limit;
$$;
