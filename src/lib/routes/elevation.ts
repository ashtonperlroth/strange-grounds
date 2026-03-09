import type { Position } from 'geojson';

interface OpenMeteoElevationResponse {
  elevation?: number[] | number;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
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
