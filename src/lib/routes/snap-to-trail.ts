import { nearestPointOnLine, point } from '@turf/turf';
import type { Feature, FeatureCollection, LineString } from 'geojson';

export interface TrailSnapResult {
  coordinates: [number, number];
  trail: Feature<LineString>;
  trailId: string;
  distanceMeters: number;
}

function getTrailId(trail: Feature<LineString>, index: number): string {
  const propId =
    typeof trail.properties?.id === 'string' ? trail.properties.id : null;
  if (propId) return propId;
  if (typeof trail.id === 'string' || typeof trail.id === 'number') {
    return String(trail.id);
  }
  return `trail-${index}`;
}

export function findNearestTrailSnap(
  target: [number, number],
  trails: FeatureCollection<LineString>,
  maxDistance = 100,
): TrailSnapResult | null {
  if (!trails.features.length) return null;

  const targetPoint = point(target);
  let best: TrailSnapResult | null = null;

  trails.features.forEach((trail, index) => {
    if (!trail.geometry || trail.geometry.coordinates.length < 2) return;
    const snapped = nearestPointOnLine(trail, targetPoint, { units: 'meters' });
    const dist = Number(snapped.properties?.dist ?? Number.POSITIVE_INFINITY);
    if (!Number.isFinite(dist) || dist > maxDistance) return;

    if (!best || dist < best.distanceMeters) {
      const [lng, lat] = snapped.geometry.coordinates;
      best = {
        coordinates: [lng, lat],
        trail,
        trailId: getTrailId(trail, index),
        distanceMeters: dist,
      };
    }
  });

  return best;
}

export function snapToTrail(
  pointCoordinates: [number, number],
  trails: FeatureCollection<LineString>,
  maxDistance = 100,
): [number, number] | null {
  return findNearestTrailSnap(pointCoordinates, trails, maxDistance)?.coordinates ?? null;
}
