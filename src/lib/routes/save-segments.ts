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
 * Save computed segments to the route_segments table.
 * Deletes all existing segments for the route and inserts new ones.
 */
export async function saveSegments(
  supabase: SupabaseClient,
  routeId: string,
  segments: ComputedSegment[],
): Promise<RouteSegment[]> {
  await supabase
    .from('route_segments')
    .delete()
    .eq('route_id', routeId);

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
