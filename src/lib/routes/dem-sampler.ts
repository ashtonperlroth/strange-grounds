import type { LineString, Position } from 'geojson';

export interface ElevationSample {
  distance: number;
  elevation: number;
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6371008.8;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

function haversineDistance(a: Position, b: Position): number {
  const dLat = toRadians(b[1] - a[1]);
  const dLng = toRadians(b[0] - a[0]);
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function interpolatePosition(
  a: Position,
  b: Position,
  fraction: number,
): Position {
  return [
    a[0] + (b[0] - a[0]) * fraction,
    a[1] + (b[1] - a[1]) * fraction,
  ];
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

interface OpenMeteoElevationResponse {
  elevation?: number[] | number;
}

async function fetchElevationBatch(positions: Position[]): Promise<number[]> {
  const latitudes = positions.map((p) => p[1].toFixed(6)).join(',');
  const longitudes = positions.map((p) => p[0].toFixed(6)).join(',');
  const params = new URLSearchParams({ latitude: latitudes, longitude: longitudes });

  const response = await fetch(
    `https://api.open-meteo.com/v1/elevation?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`Open-Meteo elevation failed with ${response.status}`);
  }

  const payload: OpenMeteoElevationResponse = await response.json();
  if (Array.isArray(payload.elevation)) {
    return payload.elevation.map((v) => Math.round(v));
  }
  if (typeof payload.elevation === 'number') {
    return [Math.round(payload.elevation)];
  }
  return positions.map(() => 0);
}

/**
 * Sample points along a LineString at a regular interval, then fetch elevations
 * for all sample points using the Open-Meteo API (batches of 100).
 */
export async function sampleElevationAlongRoute(
  geometry: LineString,
  intervalM: number = 75,
): Promise<ElevationSample[]> {
  const coords = geometry.coordinates;
  if (coords.length < 2) return [];

  const samplePositions: Position[] = [coords[0]];
  let accumulated = 0;

  for (let i = 1; i < coords.length; i++) {
    const segDist = haversineDistance(coords[i - 1], coords[i]);
    let remaining = segDist;
    let segStart = coords[i - 1];
    let startOffset = 0;

    const deficit = intervalM - accumulated;
    if (deficit <= remaining) {
      const frac = deficit / segDist;
      const pt = interpolatePosition(coords[i - 1], coords[i], frac);
      samplePositions.push(pt);
      startOffset = deficit;
      remaining -= deficit;
      segStart = pt;
      accumulated = 0;

      while (remaining >= intervalM) {
        const nextFrac = (startOffset + intervalM) / segDist;
        const nextPt = interpolatePosition(coords[i - 1], coords[i], nextFrac);
        samplePositions.push(nextPt);
        startOffset += intervalM;
        remaining -= intervalM;
        segStart = nextPt;
      }
    }

    accumulated += remaining;
    void segStart;
  }

  const lastCoord = coords[coords.length - 1];
  const lastSample = samplePositions[samplePositions.length - 1];
  if (
    haversineDistance(lastSample, lastCoord) > 1
  ) {
    samplePositions.push(lastCoord);
  }

  const batches = chunk(samplePositions, 100);
  const elevationResults = await Promise.all(batches.map(fetchElevationBatch));
  const elevations = elevationResults.flat();

  const samples: ElevationSample[] = [];
  let totalDist = 0;
  for (let i = 0; i < samplePositions.length; i++) {
    if (i > 0) {
      totalDist += haversineDistance(samplePositions[i - 1], samplePositions[i]);
    }
    samples.push({
      distance: totalDist,
      elevation: elevations[i] ?? 0,
      lat: samplePositions[i][1],
      lng: samplePositions[i][0],
    });
  }

  return samples;
}

/**
 * Compute aspect (compass bearing the slope faces) at each sample point.
 * Uses the bearing between adjacent points and the elevation difference to
 * determine which direction the slope faces (perpendicular to travel).
 */
export function computeAspectAtPoints(samples: ElevationSample[]): number[] {
  if (samples.length < 2) return samples.map(() => 0);

  const aspects: number[] = [];

  for (let i = 0; i < samples.length; i++) {
    const prev = samples[Math.max(0, i - 1)];
    const next = samples[Math.min(samples.length - 1, i + 1)];

    const bearing = computeBearing(
      [prev.lng, prev.lat],
      [next.lng, next.lat],
    );

    const elevDiff = next.elevation - prev.elevation;
    let aspect: number;

    if (elevDiff > 0) {
      aspect = (bearing + 180) % 360;
    } else if (elevDiff < 0) {
      aspect = bearing % 360;
    } else {
      aspect = (bearing + 90) % 360;
    }

    aspects.push(aspect < 0 ? aspect + 360 : aspect);
  }

  return aspects;
}

function computeBearing(from: Position, to: Position): number {
  const lat1 = toRadians(from[1]);
  const lat2 = toRadians(to[1]);
  const dLng = toRadians(to[0] - from[0]);

  const x = Math.sin(dLng) * Math.cos(lat2);
  const y =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const bearing = toDegrees(Math.atan2(x, y));
  return (bearing + 360) % 360;
}

export function aspectToCardinal(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}
