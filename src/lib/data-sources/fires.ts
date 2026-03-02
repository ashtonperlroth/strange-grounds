import { createAdminClient } from "@/lib/supabase/admin";

// ── Types ──────────────────────────────────────────────────────────────

export interface FirePerimeter {
  id: string;
  name: string;
  acres: number | null;
  containment: number | null;
  discoveredAt: string | null;
  updatedAt: string | null;
  cause: string | null;
  geometry: GeoJSON.Geometry;
}

export interface FireData {
  source: "nifc";
  fires: FirePerimeter[];
  nearbyCount: number;
  fetchedAt: string;
}

export interface FireOptions {
  lat: number;
  lng: number;
}

// ── Constants ──────────────────────────────────────────────────────────

const NIFC_BASE =
  "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters/FeatureServer/0/query";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MILES_TO_KM = 1.60934;
const SEARCH_RADIUS_MI = 50;
const SEARCH_RADIUS_KM = SEARCH_RADIUS_MI * MILES_TO_KM;

// ── Helpers ────────────────────────────────────────────────────────────

function bboxFromCenter(
  lat: number,
  lng: number,
  radiusKm: number,
): [number, number, number, number] {
  const latDelta = radiusKm / 111.32;
  const lngDelta = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  return [lng - lngDelta, lat - latDelta, lng + lngDelta, lat + latDelta];
}

function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function centroidOfGeometry(geometry: GeoJSON.Geometry): [number, number] {
  if (geometry.type === "Point") {
    return geometry.coordinates as [number, number];
  }

  let sumLng = 0;
  let sumLat = 0;
  let count = 0;

  function walkCoords(coords: unknown): void {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      sumLng += coords[0] as number;
      sumLat += coords[1] as number;
      count++;
      return;
    }
    for (const c of coords) walkCoords(c);
  }

  if ("coordinates" in geometry) {
    walkCoords(geometry.coordinates);
  }

  if (count === 0) return [0, 0];
  return [sumLng / count, sumLat / count];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapFireFeature(feature: any): FirePerimeter {
  const props = feature.properties ?? {};
  return {
    id: String(props.OBJECTID ?? props.IrwinID ?? feature.id ?? ""),
    name: props.IncidentName ?? props.poly_IncidentName ?? "Unknown Fire",
    acres: props.GISAcres ?? props.DailyAcres ?? null,
    containment: props.PercentContained ?? null,
    discoveredAt: props.FireDiscoveryDateTime ?? null,
    updatedAt: props.DateCurrent ?? props.ModifiedOnDateTime ?? null,
    cause: props.FireCause ?? null,
    geometry: feature.geometry,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Cache layer ────────────────────────────────────────────────────────

function getCacheKey(lat: number, lng: number): string {
  return `fires:${lat.toFixed(2)}:${lng.toFixed(2)}`;
}

async function getCached(cacheKey: string): Promise<FireData | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("data_cache")
      .select("data, expires_at")
      .eq("source", "nifc")
      .eq("cache_key", cacheKey)
      .single();

    if (!data) return null;
    if (new Date(data.expires_at) < new Date()) return null;
    return data.data as FireData;
  } catch {
    return null;
  }
}

async function setCache(cacheKey: string, payload: FireData): Promise<void> {
  try {
    const supabase = createAdminClient();
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();

    await supabase.from("data_cache").upsert(
      {
        source: "nifc",
        cache_key: cacheKey,
        data: payload as unknown as Record<string, unknown>,
        expires_at: expiresAt,
      },
      { onConflict: "source,cache_key" },
    );
  } catch (err) {
    console.warn("Fire cache write failed:", err);
  }
}

// ── Main fetch ─────────────────────────────────────────────────────────

export async function fetchFires(options: FireOptions): Promise<FireData> {
  const { lat, lng } = options;
  const cacheKey = getCacheKey(lat, lng);

  const cached = await getCached(cacheKey);
  if (cached) return cached;

  const [west, south, east, north] = bboxFromCenter(
    lat,
    lng,
    SEARCH_RADIUS_KM,
  );
  const bbox = `${west},${south},${east},${north}`;

  const params = new URLSearchParams({
    where: "1=1",
    outFields: "*",
    geometry: bbox,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    f: "geojson",
  });

  const res = await fetch(`${NIFC_BASE}?${params}`, {
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`NIFC API ${res.status}: ${res.statusText}`);
  }

  const geojson = await res.json();
  const features: FirePerimeter[] = (geojson.features ?? []).map(mapFireFeature);

  const nearbyFires = features.filter((f) => {
    const [cLng, cLat] = centroidOfGeometry(f.geometry);
    const distKm = haversineDistanceKm(lat, lng, cLat, cLng);
    return distKm <= SEARCH_RADIUS_KM;
  });

  const result: FireData = {
    source: "nifc",
    fires: nearbyFires,
    nearbyCount: nearbyFires.length,
    fetchedAt: new Date().toISOString(),
  };

  await setCache(cacheKey, result);

  return result;
}
