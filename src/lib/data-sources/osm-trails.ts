import type { Feature, FeatureCollection, LineString } from 'geojson';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const CACHE_TILE_ZOOM = 12;
const REQUEST_INTERVAL_MS = 5_000;

type Bbox = [west: number, south: number, east: number, north: number];

interface FetchOsmTrailsOptions {
  bbox: Bbox;
  signal?: AbortSignal;
}

interface OverpassElement {
  type: 'way' | 'relation' | 'node';
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
  members?: Array<{
    type: 'way' | 'node' | 'relation';
    ref: number;
    role?: string;
  }>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

interface RelationTrailMeta {
  name: string | null;
  ref: string | null;
  sacScale: string | null;
}

const emptyCollection: FeatureCollection<LineString> = {
  type: 'FeatureCollection',
  features: [],
};

const tileCache = new Map<string, FeatureCollection<LineString>>();

let requestQueue: Promise<unknown> = Promise.resolve();
let lastOverpassRequestAt = 0;

function clampLat(lat: number): number {
  return Math.max(-85.05112878, Math.min(85.05112878, lat));
}

function lngLatToTile(lng: number, lat: number, zoom: number): [number, number] {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (clampLat(lat) * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return [Math.max(0, Math.min(n - 1, x)), Math.max(0, Math.min(n - 1, y))];
}

function bboxToCacheKey(bbox: Bbox, zoom: number): string {
  const [west, south, east, north] = bbox;
  const [xMin, yMax] = lngLatToTile(west, south, zoom);
  const [xMax, yMin] = lngLatToTile(east, north, zoom);
  return `${zoom}:${xMin}:${yMin}:${xMax}:${yMax}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runRateLimited<T>(
  work: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  const execute = async () => {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const now = Date.now();
    const waitMs = Math.max(0, lastOverpassRequestAt + REQUEST_INTERVAL_MS - now);
    if (waitMs > 0) {
      await delay(waitMs);
    }
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    try {
      const result = await work();
      return result;
    } finally {
      lastOverpassRequestAt = Date.now();
    }
  };

  const next = requestQueue.then(execute, execute) as Promise<T>;
  requestQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function buildOverpassQuery(bbox: Bbox): string {
  const [west, south, east, north] = bbox;
  const overpassBbox = `${south},${west},${north},${east}`;
  return `
[out:json][timeout:25];
(
  way["highway"~"path|track|footway|bridleway"]["access"!="private"](${overpassBbox});
  relation["route"~"hiking|foot"]["name"](${overpassBbox});
);
(._;>;);
out body geom;
`;
}

function getWayTrailMeta(
  wayId: number,
  byWayId: Map<number, RelationTrailMeta>,
): RelationTrailMeta | null {
  return byWayId.get(wayId) ?? null;
}

function parseTrails(data: OverpassResponse): FeatureCollection<LineString> {
  const relationMetaByWayId = new Map<number, RelationTrailMeta>();

  for (const element of data.elements) {
    if (element.type !== 'relation') continue;
    const routeType = element.tags?.route;
    if (routeType !== 'hiking' && routeType !== 'foot') continue;

    const meta: RelationTrailMeta = {
      name: element.tags?.name ?? null,
      ref: element.tags?.ref ?? element.tags?.name ?? null,
      sacScale: element.tags?.sac_scale ?? null,
    };

    for (const member of element.members ?? []) {
      if (member.type !== 'way') continue;
      relationMetaByWayId.set(member.ref, meta);
    }
  }

  const features = new Map<string, Feature<LineString>>();

  for (const element of data.elements) {
    if (element.type !== 'way') continue;
    if (!element.geometry || element.geometry.length < 2) continue;

    const highwayType = element.tags?.highway ?? null;
    const relationMeta = getWayTrailMeta(element.id, relationMetaByWayId);
    const isTrailByHighway = [
      'path',
      'track',
      'footway',
      'bridleway',
    ].includes(highwayType ?? '');
    const isTrailByRelation = Boolean(relationMeta);

    if (!isTrailByHighway && !isTrailByRelation) continue;

    const wayKey = `way/${element.id}`;
    const feature: Feature<LineString> = {
      type: 'Feature',
      id: wayKey,
      properties: {
        id: wayKey,
        name: element.tags?.name ?? relationMeta?.name ?? null,
        highway_type: highwayType,
        surface: element.tags?.surface ?? null,
        trail_ref: element.tags?.ref ?? relationMeta?.ref ?? null,
        sac_scale: element.tags?.sac_scale ?? relationMeta?.sacScale ?? null,
      },
      geometry: {
        type: 'LineString',
        coordinates: element.geometry.map((coord) => [coord.lon, coord.lat]),
      },
    };

    const existing = features.get(wayKey);
    if (!existing) {
      features.set(wayKey, feature);
      continue;
    }

    // Merge sparse properties from duplicate entries without losing geometry.
    features.set(wayKey, {
      ...existing,
      properties: {
        ...existing.properties,
        name: existing.properties?.name ?? feature.properties?.name ?? null,
        highway_type:
          existing.properties?.highway_type ??
          feature.properties?.highway_type ??
          null,
        surface:
          existing.properties?.surface ?? feature.properties?.surface ?? null,
        trail_ref:
          existing.properties?.trail_ref ?? feature.properties?.trail_ref ?? null,
        sac_scale:
          existing.properties?.sac_scale ?? feature.properties?.sac_scale ?? null,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features: Array.from(features.values()),
  };
}

export async function fetchOsmTrails(
  options: FetchOsmTrailsOptions,
): Promise<FeatureCollection<LineString>> {
  const { bbox, signal } = options;
  const cacheKey = bboxToCacheKey(bbox, CACHE_TILE_ZOOM);
  const cached = tileCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const query = buildOverpassQuery(bbox);
  const collection = await runRateLimited(async () => {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: query,
      signal,
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Overpass request failed (${response.status}): ${details}`);
    }

    const payload = (await response.json()) as OverpassResponse;
    return parseTrails(payload);
  }, signal);

  tileCache.set(cacheKey, collection);
  return collection;
}

export function clearOsmTrailCache(): void {
  tileCache.clear();
}

export function getEmptyTrailCollection(): FeatureCollection<LineString> {
  return emptyCollection;
}
