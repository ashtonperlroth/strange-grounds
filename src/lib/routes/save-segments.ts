import type { SupabaseClient } from '@supabase/supabase-js';
import type { ComputedSegment } from './segmentation';
import type { RouteSegment } from '@/lib/types/route';
import type { LineString } from 'geojson';

function toLineStringWKT(coordinates: number[][]): string {
  return `LINESTRING(${coordinates.map((c) => `${c[0]} ${c[1]}`).join(', ')})`;
}

function parseGeometry(raw: unknown): LineString {
  if (!raw) return { type: 'LineString', coordinates: [] };
  if (typeof raw === 'object' && raw !== null) {
    const geo = raw as Record<string, unknown>;
    if (geo.type === 'LineString' && Array.isArray(geo.coordinates)) {
      return { type: 'LineString', coordinates: geo.coordinates };
    }
  }
  if (typeof raw === 'string') {
    const match = raw.match(/LINESTRING\(\s*(.+)\s*\)/);
    if (match) {
      const coords = match[1].split(',').map((pair) => {
        const [lng, lat] = pair.trim().split(/\s+/).map(Number);
        return [lng, lat];
      });
      return { type: 'LineString', coordinates: coords };
    }
  }
  return { type: 'LineString', coordinates: [] };
}

function mapSegment(row: Record<string, unknown>): RouteSegment {
  return {
    id: row.id as string,
    routeId: row.route_id as string,
    segmentOrder: row.segment_order as number,
    geometry: parseGeometry(row.geometry),
    distanceM: (row.distance_m as number) ?? 0,
    elevationGainM: (row.elevation_gain_m as number) ?? 0,
    elevationLossM: (row.elevation_loss_m as number) ?? 0,
    avgSlopeDegrees: (row.avg_slope_degrees as number) ?? 0,
    dominantAspect: (row.dominant_aspect as string) ?? 'N',
    maxSlopeDegrees: (row.max_slope_degrees as number) ?? 0,
    terrainType: (row.terrain_type as string) ?? 'trail',
    hazardLevel: (row.hazard_level as string) ?? null,
    hazardNotes: (row.hazard_notes as string) ?? null,
  };
}

/**
 * Compute a fast hash of a LineString geometry for cache invalidation.
 * Uses a simple FNV-1a-inspired hash of coordinate values rounded to 6 decimals.
 */
export function computeGeometryHash(geometry: LineString): string {
  const coords = geometry.coordinates;
  let h = 0x811c9dc5; // FNV offset basis (32-bit)
  for (const c of coords) {
    for (const v of c) {
      const rounded = Math.round(v * 1e6);
      h ^= rounded & 0xff;
      h = Math.imul(h, 0x01000193);
      h ^= (rounded >> 8) & 0xff;
      h = Math.imul(h, 0x01000193);
      h ^= (rounded >> 16) & 0xff;
      h = Math.imul(h, 0x01000193);
      h ^= (rounded >> 24) & 0xff;
      h = Math.imul(h, 0x01000193);
    }
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Check whether existing cached segments are still valid for the given geometry.
 * Returns the cached segments if valid, or null if recomputation is needed.
 */
export async function loadCachedSegments(
  supabase: SupabaseClient,
  routeId: string,
  currentGeometry: LineString,
): Promise<RouteSegment[] | null> {
  const { data: route } = await supabase
    .from('routes')
    .select('geometry_hash')
    .eq('id', routeId)
    .single();

  const currentHash = computeGeometryHash(currentGeometry);

  if (route?.geometry_hash === currentHash) {
    const segments = await loadSegments(supabase, routeId);
    if (segments.length > 0) {
      console.log(
        `[save-segments] Cache hit for route=${routeId} (hash=${currentHash}, ${segments.length} segments)`,
      );
      return segments;
    }
  }

  console.log(
    `[save-segments] Cache miss for route=${routeId} (stored=${route?.geometry_hash ?? 'none'}, current=${currentHash})`,
  );
  return null;
}

/**
 * Save computed segments to the route_segments table.
 * Deletes all existing segments for the route and inserts new ones.
 * Also stores the geometry hash for future cache invalidation.
 */
export async function saveSegments(
  supabase: SupabaseClient,
  routeId: string,
  segments: ComputedSegment[],
  geometryHash?: string,
): Promise<RouteSegment[]> {
  await supabase
    .from('route_segments')
    .delete()
    .eq('route_id', routeId);

  if (geometryHash) {
    await supabase
      .from('routes')
      .update({ geometry_hash: geometryHash })
      .eq('id', routeId);
  }

  if (segments.length === 0) return [];

  const rows = segments.map((seg) => ({
    route_id: routeId,
    segment_order: seg.segmentOrder,
    geometry: toLineStringWKT(seg.geometry.coordinates),
    distance_m: seg.distanceM,
    elevation_gain_m: seg.elevationGainM,
    elevation_loss_m: seg.elevationLossM,
    avg_slope_degrees: seg.avgSlopeDegrees,
    max_slope_degrees: seg.maxSlopeDegrees,
    dominant_aspect: seg.dominantAspect,
    terrain_type: seg.terrainType,
  }));

  const { data, error } = await supabase
    .from('route_segments')
    .insert(rows)
    .select();

  if (error) {
    throw new Error(`Failed to save segments: ${error.message}`);
  }

  return (data ?? []).map((row) =>
    mapSegment(row as unknown as Record<string, unknown>),
  );
}

/**
 * Load existing segments for a route.
 */
export async function loadSegments(
  supabase: SupabaseClient,
  routeId: string,
): Promise<RouteSegment[]> {
  const { data, error } = await supabase
    .from('route_segments')
    .select('*')
    .eq('route_id', routeId)
    .order('segment_order');

  if (error) {
    throw new Error(`Failed to load segments: ${error.message}`);
  }

  return (data ?? []).map((row) =>
    mapSegment(row as unknown as Record<string, unknown>),
  );
}
