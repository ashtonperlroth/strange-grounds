import { createAdminClient } from "@/lib/supabase/admin";
import { getCdseToken, bufferBbox } from "./sentinel2";
import type { Sentinel2Scene } from "./sentinel2";
import { renderTrueColor, renderIndexMap } from "./sentinel2-render";

// ── Constants ──────────────────────────────────────────────────────────

const PROCESS_API_URL =
  "https://sh.dataspace.copernicus.eu/api/v1/process";
const STORAGE_BUCKET = "satellite-imagery";
const MAX_OUTPUT_PX = 2048;

// ── Evalscripts ────────────────────────────────────────────────────────
// Sentinel Hub Process API evalscripts define which bands to fetch and
// how to combine them. We request raw band values as TIFF and do the
// compositing/colorization ourselves in sentinel2-render.ts.

const TRUE_COLOR_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B03", "B02"], units: "DN" }],
    output: { bands: 3, sampleType: "UINT16" }
  };
}
function evaluatePixel(sample) {
  return [sample.B04, sample.B03, sample.B02];
}`;

const NDSI_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B03", "B11"], units: "REFLECTANCE" }],
    output: { bands: 1, sampleType: "FLOAT32" }
  };
}
function evaluatePixel(sample) {
  if (sample.B03 + sample.B11 === 0) return [-2];
  return [(sample.B03 - sample.B11) / (sample.B03 + sample.B11)];
}`;

// ── Types ──────────────────────────────────────────────────────────────

export interface ProcessedImagery {
  trueColorUrl: string | null;
  ndsiUrl: string | null;
  bounds: [number, number, number, number];
  acquisitionDate: string;
  cloudCover: number;
  sceneId: string;
  processedAt: string;
}

interface ProcessApiRequest {
  input: {
    bounds: {
      bbox: [number, number, number, number];
      properties: { crs: string };
    };
    data: {
      type: string;
      dataFilter: {
        timeRange: { from: string; to: string };
        maxCloudCoverage: number;
      };
    }[];
  };
  output: {
    width: number;
    height: number;
    responses: { identifier: string; format: { type: string } }[];
  };
  evalscript: string;
}

// ── Helpers ────────────────────────────────────────────────────────────

export function computeOutputDimensions(
  bbox: [number, number, number, number],
  maxPx: number = MAX_OUTPUT_PX,
): { width: number; height: number } {
  const [west, south, east, north] = bbox;
  const centerLat = (south + north) / 2;
  const widthKm =
    (east - west) * 111.32 * Math.cos((centerLat * Math.PI) / 180);
  const heightKm = (north - south) * 111.32;
  const aspect = widthKm / heightKm;

  let width: number;
  let height: number;

  if (aspect >= 1) {
    width = Math.min(maxPx, Math.round(widthKm * 100));
    height = Math.round(width / aspect);
  } else {
    height = Math.min(maxPx, Math.round(heightKm * 100));
    width = Math.round(height * aspect);
  }

  return {
    width: Math.max(64, Math.min(maxPx, width)),
    height: Math.max(64, Math.min(maxPx, height)),
  };
}

function buildTimeRange(acquisitionDate: string): { from: string; to: string } {
  const date = new Date(acquisitionDate);
  const from = new Date(date.getTime() - 24 * 60 * 60 * 1000);
  const to = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

// ── Process API Calls ──────────────────────────────────────────────────

async function callProcessApi(
  bbox: [number, number, number, number],
  timeRange: { from: string; to: string },
  evalscript: string,
  outputFormat: string,
  token: string,
): Promise<Buffer> {
  const { width, height } = computeOutputDimensions(bbox);

  const request: ProcessApiRequest = {
    input: {
      bounds: {
        bbox,
        properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" },
      },
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange,
            maxCloudCoverage: 30,
          },
        },
      ],
    },
    output: {
      width,
      height,
      responses: [
        { identifier: "default", format: { type: outputFormat } },
      ],
    },
    evalscript,
  };

  console.log(
    `[sentinel2-processor] Process API: ${width}x${height}, format=${outputFormat}`,
  );

  const res = await fetch(PROCESS_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: outputFormat,
    },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Process API failed: ${res.status} ${text}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ── Storage ────────────────────────────────────────────────────────────

async function uploadToStorage(
  routeId: string,
  acquisitionDate: string,
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<string | null> {
  const supabase = createAdminClient();
  const dateStr = acquisitionDate.split("T")[0];
  const path = `${routeId}/${dateStr}/${filename}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error(
      `[sentinel2-processor] Storage upload failed for ${path}:`,
      error.message,
    );
    return null;
  }

  const { data: urlData } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 7 * 24 * 60 * 60);

  return urlData?.signedUrl ?? null;
}

// ── Check Existing Imagery ─────────────────────────────────────────────

export async function getExistingImagery(
  routeId: string,
): Promise<ProcessedImagery | null> {
  try {
    const supabase = createAdminClient();

    const { data: folders } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(routeId, { limit: 1, sortBy: { column: "name", order: "desc" } });

    if (!folders || folders.length === 0) return null;

    const dateFolderName = folders[0].name;
    const basePath = `${routeId}/${dateFolderName}`;

    const { data: trueColorUrl } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(`${basePath}/true-color.png`, 3600);

    const { data: ndsiUrl } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(`${basePath}/ndsi.png`, 3600);

    const { data: cacheData } = await supabase
      .from("data_cache")
      .select("data")
      .eq("source", "sentinel-2-processed")
      .eq("cache_key", `processed:${routeId}`)
      .single();

    const metadata = cacheData?.data as Record<string, unknown> | null;

    return {
      trueColorUrl: trueColorUrl?.signedUrl ?? null,
      ndsiUrl: ndsiUrl?.signedUrl ?? null,
      bounds: (metadata?.bounds as [number, number, number, number]) ?? [
        0, 0, 0, 0,
      ],
      acquisitionDate: (metadata?.acquisitionDate as string) ?? dateFolderName,
      cloudCover: (metadata?.cloudCover as number) ?? 0,
      sceneId: (metadata?.sceneId as string) ?? "",
      processedAt: (metadata?.processedAt as string) ?? "",
    };
  } catch {
    return null;
  }
}

async function saveProcessedMetadata(
  routeId: string,
  imagery: ProcessedImagery,
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("data_cache").upsert(
      {
        source: "sentinel-2-processed",
        cache_key: `processed:${routeId}`,
        data: imagery as unknown as Record<string, unknown>,
        expires_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
      { onConflict: "source,cache_key" },
    );
  } catch (err) {
    console.warn("[sentinel2-processor] Metadata cache write failed:", err);
  }
}

// ── Main Processing ────────────────────────────────────────────────────

export async function processSentinel2Imagery(
  routeId: string,
  bbox: [number, number, number, number],
  scene: Sentinel2Scene,
): Promise<ProcessedImagery> {
  const processStart = Date.now();
  const bufferedBbox = bufferBbox(bbox);
  const timeRange = buildTimeRange(scene.acquisitionDate);
  const { width, height } = computeOutputDimensions(bufferedBbox);

  console.log(
    `[sentinel2-processor] Processing scene ${scene.sceneId} for route ${routeId}`,
  );

  const token = await getCdseToken();

  // True-color composite: B04 (Red), B03 (Green), B02 (Blue)
  const trueColorRaw = await callProcessApi(
    bufferedBbox,
    timeRange,
    TRUE_COLOR_EVALSCRIPT,
    "image/tiff",
    token,
  );

  const trueColorPng = await renderTrueColor(trueColorRaw, width, height);

  const trueColorUrl = await uploadToStorage(
    routeId,
    scene.acquisitionDate,
    "true-color.png",
    trueColorPng,
    "image/png",
  );

  // NDSI snow index: (B03 - B11) / (B03 + B11) — optional, non-blocking
  let ndsiUrl: string | null = null;
  try {
    const ndsiRaw = await callProcessApi(
      bufferedBbox,
      timeRange,
      NDSI_EVALSCRIPT,
      "image/tiff",
      token,
    );
    const ndsiPng = await renderIndexMap(ndsiRaw, width, height, "ndsi");
    ndsiUrl = await uploadToStorage(
      routeId,
      scene.acquisitionDate,
      "ndsi.png",
      ndsiPng,
      "image/png",
    );
  } catch (err) {
    console.warn(
      "[sentinel2-processor] NDSI processing failed (non-critical):",
      err,
    );
  }

  const result: ProcessedImagery = {
    trueColorUrl,
    ndsiUrl,
    bounds: bufferedBbox,
    acquisitionDate: scene.acquisitionDate,
    cloudCover: scene.cloudCover,
    sceneId: scene.sceneId,
    processedAt: new Date().toISOString(),
  };

  await saveProcessedMetadata(routeId, result);

  const elapsed = Date.now() - processStart;
  console.log(
    `[sentinel2-processor] Completed in ${elapsed}ms (true-color: ${trueColorUrl ? "OK" : "FAILED"}, ndsi: ${ndsiUrl ? "OK" : "SKIPPED"})`,
  );

  return result;
}
