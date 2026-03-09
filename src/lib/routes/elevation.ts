import type { Position } from 'geojson';

interface OpenMeteoElevationResponse {
  elevation?: number[] | number;
}

export interface ElevationProfilePoint {
  distance: number;
  elevation: number;
}

export interface ElevationProfile {
  points: ElevationProfilePoint[];
  totalGain: number;
  totalLoss: number;
  maxElevation: number;
  minElevation: number;
}

const EARTH_RADIUS_M = 6371008.8;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceMeters(a: Position, b: Position): number {
  const dLat = toRadians(b[1] - a[1]);
  const dLng = toRadians(b[0] - a[0]);
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export async function fetchElevationsForPositions(
  positions: Position[],
): Promise<number[]> {
  if (positions.length === 0) return [];

  const result: number[] = [];
  const batches = chunk(positions, 100);

  for (const batch of batches) {
    const latitudes = batch.map((position) => position[1]).join(',');
    const longitudes = batch.map((position) => position[0]).join(',');
    const params = new URLSearchParams({
      latitude: latitudes,
      longitude: longitudes,
    });
    const response = await fetch(
      `https://api.open-meteo.com/v1/elevation?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`Open-Meteo elevation failed with ${response.status}`);
    }

    const payload: OpenMeteoElevationResponse = await response.json();
    if (Array.isArray(payload.elevation)) {
      result.push(...payload.elevation.map((value) => Math.round(value)));
    } else if (typeof payload.elevation === 'number') {
      result.push(Math.round(payload.elevation));
    }
  }

  return result;
}

export async function computeElevationProfile(
  coordinates: [number, number, number?][],
): Promise<ElevationProfile> {
  if (coordinates.length < 2) {
    return {
      points: [],
      totalGain: 0,
      totalLoss: 0,
      maxElevation: 0,
      minElevation: 0,
    };
  }

  const positions = coordinates.map(
    (coordinate) => [coordinate[0], coordinate[1]] as Position,
  );
  const elevations: Array<number | null> = coordinates.map((coordinate) =>
    typeof coordinate[2] === 'number' ? coordinate[2] : null,
  );

  const missingIndexes: number[] = [];
  const missingPositions: Position[] = [];
  elevations.forEach((value, index) => {
    if (value == null) {
      missingIndexes.push(index);
      missingPositions.push(positions[index]);
    }
  });

  if (missingPositions.length > 0) {
    const fetched = await fetchElevationsForPositions(missingPositions);
    missingIndexes.forEach((coordIndex, fetchIndex) => {
      const fetchedValue = fetched[fetchIndex];
      if (typeof fetchedValue === 'number' && Number.isFinite(fetchedValue)) {
        elevations[coordIndex] = fetchedValue;
      }
    });
  }

  const filledElevations = elevations.map((value) => value ?? 0);
  const points: ElevationProfilePoint[] = [];
  let distance = 0;
  let totalGain = 0;
  let totalLoss = 0;
  let minElevation = Number.POSITIVE_INFINITY;
  let maxElevation = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < coordinates.length; index += 1) {
    if (index > 0) {
      distance += haversineDistanceMeters(positions[index - 1], positions[index]);
      const delta = filledElevations[index] - filledElevations[index - 1];
      if (delta > 0) {
        totalGain += delta;
      } else if (delta < 0) {
        totalLoss += Math.abs(delta);
      }
    }

    minElevation = Math.min(minElevation, filledElevations[index]);
    maxElevation = Math.max(maxElevation, filledElevations[index]);
    points.push({
      distance,
      elevation: filledElevations[index],
    });
  }

  return {
    points,
    totalGain,
    totalLoss,
    maxElevation: Number.isFinite(maxElevation) ? maxElevation : 0,
    minElevation: Number.isFinite(minElevation) ? minElevation : 0,
  };
}
