-- RPC to return avalanche zones as GeoJSON features with boundaries
CREATE OR REPLACE FUNCTION get_avalanche_zones_geojson(
  p_west DOUBLE PRECISION DEFAULT -180,
  p_south DOUBLE PRECISION DEFAULT -90,
  p_east DOUBLE PRECISION DEFAULT 180,
  p_north DOUBLE PRECISION DEFAULT 90
)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(jsonb_agg(
      jsonb_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(z.boundary::geometry)::jsonb,
        'properties', jsonb_build_object(
          'id', z.id,
          'center_id', z.center_id,
          'zone_id', z.zone_id,
          'name', z.name,
          'api_url', z.api_url,
          'metadata', z.metadata
        )
      )
    ), '[]'::jsonb)
  )
  FROM avalanche_zones z
  WHERE ST_Intersects(
    z.boundary::geometry,
    ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326)
  );
$$;
