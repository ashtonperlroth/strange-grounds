import { createAdminClient } from "@/lib/supabase/admin";

// ── Types ──────────────────────────────────────────────────────────────

export interface Sentinel2Scene {
  sceneId: string;
  acquisitionDate: string;
  cloudCover: number;
  bbox: [number, number, number, number];
}

export interface Sentinel2Data {
  source: "sentinel-2";
  available: boolean;
  scene: Sentinel2Scene | null;
  trueColorUrl: string | null;
  ndsiUrl: string | null;
  bounds: [number, number, number, number] | null;
  acquisitionDate: string | null;
  cloudCover: number | null;
  processedAt: string | null;
}

export interface Sentinel2Options {
  bbox: [number, number, number, number];
  routeId?: string;
}

// ── Constants ──────────────────────────────────────────────────────────

const STAC_SEARCH_URL =
  "https://catalogue.dataspace.copernicus.eu/stac/search";
const CDSE_TOKEN_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const BBOX_BUFFER_KM = 5;
const MAX_CLOUD_COVER = 30;
const SEARCH_DAYS = 30;

// ── Token Management ───────────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getCdseToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const clientId = process.env.SENTINEL_HUB_CLIENT_ID;
  const clientSecret = process.env.SENTINEL_HUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "SENTINEL_HUB_CLIENT_ID and SENTINEL_HUB_CLIENT_SECRET are required for CDSE auth",
    );
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  console.log("[sentinel2] Requesting CDSE OAuth2 token...");

  const res = await fetch(CDSE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CDSE token request failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 300) * 1000,
  };

  console.log("[sentinel2] CDSE token acquired");
  return cachedToken.token;
}

// ── Helpers ────────────────────────────────────────────────────────────

export function bufferBbox(
  bbox: [number, number, number, number],
  bufferKm: number = BBOX_BUFFER_KM,
): [number, number, number, number] {
  const [west, south, east, north] = bbox;
  const centerLat = (south + north) / 2;
  const latDelta = bufferKm / 111.32;
  const lngDelta = bufferKm / (111.32 * Math.cos((centerLat * Math.PI) / 180));
  return [
    west - lngDelta,
    south - latDelta,
    east + lngDelta,
    north + latDelta,
  ];
}

export function bboxFromCenter(
  lat: number,
  lng: number,
  radiusKm: number = 10,
): [number, number, number, number] {
  const latDelta = radiusKm / 111.32;
  const lngDelta = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  return [lng - lngDelta, lat - latDelta, lng + lngDelta, lat + latDelta];
}

// ── STAC Scene Discovery ──────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function searchScenes(
  bbox: [number, number, number, number],
  maxCloudCover: number = MAX_CLOUD_COVER,
  days: number = SEARCH_DAYS,
): Promise<Sentinel2Scene[]> {
  const now = new Date();
  const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const datetime = `${past.toISOString()}/${now.toISOString()}`;
  const bufferedBbox = bufferBbox(bbox);

  console.log(
    `[sentinel2] STAC search: bbox=[${bufferedBbox.map((n) => n.toFixed(3)).join(", ")}], last ${days}d, max cloud ${maxCloudCover}%`,
  );

  const body = {
    collections: ["sentinel-2-l2a"],
    bbox: bufferedBbox,
    datetime,
    query: {
      "eo:cloud_cover": { lt: maxCloudCover },
    },
    sortby: [{ field: "properties.datetime", direction: "desc" }],
    limit: 5,
  };

  const res = await fetch(STAC_SEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`STAC search failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const features = data.features ?? [];

  console.log(`[sentinel2] STAC returned ${features.length} scene(s)`);

  return features.map((f: any) => ({
    sceneId: f.id ?? "",
    acquisitionDate: f.properties?.datetime ?? "",
    cloudCover: f.properties?.["eo:cloud_cover"] ?? 100,
    bbox: f.bbox ?? bufferedBbox,
  }));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Cache Layer ────────────────────────────────────────────────────────

function getCacheKey(bbox: [number, number, number, number]): string {
  return `sentinel2:${bbox.map((n) => n.toFixed(2)).join(":")}`;
}

async function getCachedData(cacheKey: string): Promise<Sentinel2Data | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("data_cache")
      .select("data, expires_at")
      .eq("source", "sentinel-2")
      .eq("cache_key", cacheKey)
      .single();

    if (!data) return null;
    if (new Date(data.expires_at) < new Date()) return null;
    return data.data as Sentinel2Data;
  } catch {
    return null;
  }
}

async function setCachedData(
  cacheKey: string,
  sentinel2Data: Sentinel2Data,
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("data_cache").upsert(
      {
        source: "sentinel-2",
        cache_key: cacheKey,
        data: sentinel2Data as unknown as Record<string, unknown>,
        expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
      },
      { onConflict: "source,cache_key" },
    );
  } catch (err) {
    console.warn("[sentinel2] Cache write failed:", err);
  }
}

// ── Sentinel Hub Processing API ──────────────────────────────────────

const PROCESSING_API_URL =
  "https://sh.dataspace.copernicus.eu/api/v1/process";

const TRUE_COLOR_EVALSCRIPT = `//VERSION=3
function setup() {
  return { input: ["B04", "B03", "B02"], output: { bands: 3 } };
}
function evaluatePixel(sample) {
  return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02];
}`;

const NDSI_EVALSCRIPT = `//VERSION=3
function setup() {
  return { input: ["B03", "B04", "B02", "B11"], output: { bands: 4 } };
}
function evaluatePixel(sample) {
  let ndsi = (sample.B03 - sample.B11) / (sample.B03 + sample.B11);
  if (ndsi > 0.4) {
    return [0.2, 0.4, 1.0, 0.85];
  }
  return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02, 0.4];
}`;

function buildProcessingBody(
  bbox: [number, number, number, number],
  dateFrom: string,
  dateTo: string,
  evalscript: string,
): Record<string, unknown> {
  return {
    input: {
      bounds: {
        bbox,
        properties: {
          crs: "http://www.opengis.net/def/crs/EPSG/0/4326",
        },
      },
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange: { from: dateFrom, to: dateTo },
            maxCloudCoverage: 40,
          },
        },
      ],
    },
    output: {
      width: 512,
      height: 512,
      responses: [{ identifier: "default", format: { type: "image/png" } }],
    },
    evalscript,
  };
}

function arrayBufferToBase64DataUrl(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:image/png;base64,${btoa(binary)}`;
}

async function renderProcessingImage(
  token: string,
  bbox: [number, number, number, number],
  dateFrom: string,
  dateTo: string,
  evalscript: string,
  label: string,
): Promise<string | null> {
  const body = buildProcessingBody(bbox, dateFrom, dateTo, evalscript);

  console.log(`[sentinel2] Rendering ${label} via Processing API...`);
  const res = await fetch(PROCESSING_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "image/png",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(
      `[sentinel2] Processing API ${label} failed: ${res.status} ${text}`,
    );
    return null;
  }

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength < 100) {
    console.warn(`[sentinel2] Processing API ${label}: response too small`);
    return null;
  }

  console.log(
    `[sentinel2] ${label} rendered (${(buffer.byteLength / 1024).toFixed(0)} KB)`,
  );
  return arrayBufferToBase64DataUrl(buffer);
}

async function renderSceneImages(
  scene: Sentinel2Scene,
  bbox: [number, number, number, number],
): Promise<{ trueColorUrl: string | null; ndsiUrl: string | null }> {
  let token: string;
  try {
    token = await getCdseToken();
  } catch (err) {
    console.warn("[sentinel2] Token acquisition failed, skipping rendering:", err);
    return { trueColorUrl: null, ndsiUrl: null };
  }

  const acqDate = new Date(scene.acquisitionDate);
  const dateFrom = new Date(acqDate.getTime() - 12 * 60 * 60 * 1000).toISOString();
  const dateTo = new Date(acqDate.getTime() + 12 * 60 * 60 * 1000).toISOString();

  const buffered = bufferBbox(bbox);

  const [trueColorResult, ndsiResult] = await Promise.allSettled([
    renderProcessingImage(token, buffered, dateFrom, dateTo, TRUE_COLOR_EVALSCRIPT, "true-color"),
    renderProcessingImage(token, buffered, dateFrom, dateTo, NDSI_EVALSCRIPT, "NDSI"),
  ]);

  return {
    trueColorUrl: trueColorResult.status === "fulfilled" ? trueColorResult.value : null,
    ndsiUrl: ndsiResult.status === "fulfilled" ? ndsiResult.value : null,
  };
}

// ── Fallback ──────────────────────────────────────────────────────────

function buildUnavailableData(): Sentinel2Data {
  return {
    source: "sentinel-2",
    available: false,
    scene: null,
    trueColorUrl: null,
    ndsiUrl: null,
    bounds: null,
    acquisitionDate: null,
    cloudCover: null,
    processedAt: null,
  };
}

// ── Main Export ─────────────────────────────────────────────────────────

export async function fetchSentinel2(
  options: Sentinel2Options,
): Promise<Sentinel2Data> {
  const { bbox } = options;
  const cacheKey = getCacheKey(bbox);

  const cached = await getCachedData(cacheKey);
  if (cached) {
    console.log("[sentinel2] Returning cached scene data");
    return cached;
  }

  try {
    const scenes = await searchScenes(bbox);

    if (scenes.length === 0) {
      console.warn("[sentinel2] No cloud-free scenes found in last 30 days");
      const noData = buildUnavailableData();
      await setCachedData(cacheKey, noData);
      return noData;
    }

    const bestScene = scenes[0];
    console.log(
      `[sentinel2] Best scene: ${bestScene.sceneId} (${bestScene.acquisitionDate}, cloud ${bestScene.cloudCover.toFixed(1)}%)`,
    );

    const { trueColorUrl, ndsiUrl } = await renderSceneImages(bestScene, bbox);

    const result: Sentinel2Data = {
      source: "sentinel-2",
      available: true,
      scene: bestScene,
      trueColorUrl,
      ndsiUrl,
      bounds: bufferBbox(bbox),
      acquisitionDate: bestScene.acquisitionDate,
      cloudCover: bestScene.cloudCover,
      processedAt: trueColorUrl || ndsiUrl ? new Date().toISOString() : null,
    };

    await setCachedData(cacheKey, result);
    return result;
  } catch (err) {
    console.error("[sentinel2] Scene discovery failed:", err);
    return buildUnavailableData();
  }
}
