import type { RouteSegment } from "@/lib/types/route";
import type { NWSForecastData } from "@/lib/data-sources/nws";
import type { AvalancheData } from "@/lib/data-sources/avalanche";
import type { UsgsData } from "@/lib/data-sources/usgs";
import type {
  SegmentConditions,
  SegmentConditionsData,
  WindData,
  HazardLevel,
  RouteAnalysis,
} from "@/lib/types/briefing";
import { fetchNWS } from "@/lib/data-sources/nws";
import { fetchAvalanche } from "@/lib/data-sources/avalanche";
import { fetchSnotel } from "@/lib/data-sources/snotel";
import { fetchUsgs } from "@/lib/data-sources/usgs";
import { fetchFires } from "@/lib/data-sources/fires";
import { computeDaylight } from "@/lib/data-sources/daylight";
import { assessSegmentHazard, HAZARD_LEVELS } from "./hazard-assessment";

const TIMEOUT_MS = 8_000;
const AVALANCHE_TIMEOUT_MS = 10_000;
const NWS_GRID_STEP = 0.025; // ~2.8 km grouping

// ── Helpers ──────────────────────────────────────────────────────────────

function segmentMidpoint(segment: RouteSegment): [number, number] {
  const coords = segment.geometry.coordinates;
  if (coords.length === 0) return [0, 0];
  const mid = Math.floor(coords.length / 2);
  return [coords[mid][1], coords[mid][0]]; // [lat, lng]
}

function nwsGridKey(lat: number, lng: number): string {
  const gLat = Math.round(lat / NWS_GRID_STEP) * NWS_GRID_STEP;
  const gLng = Math.round(lng / NWS_GRID_STEP) * NWS_GRID_STEP;
  return `${gLat.toFixed(3)},${gLng.toFixed(3)}`;
}

function avyZoneKey(lat: number, lng: number): string {
  return `${lat.toFixed(1)},${lng.toFixed(1)}`;
}

async function safeCall<T>(
  fn: () => Promise<T>,
  label: string,
  timeoutMs = TIMEOUT_MS,
): Promise<T | null> {
  try {
    return await Promise.race([
      fn(),
      new Promise<null>((resolve) =>
        setTimeout(() => {
          console.warn(
            `[segment-conditions][${label}] timed out after ${timeoutMs}ms`,
          );
          resolve(null);
        }, timeoutMs),
      ),
    ]);
  } catch (err) {
    console.error(`[segment-conditions][${label}] failed:`, err);
    return null;
  }
}

function parseWindMph(windSpeed: string): number {
  const match = windSpeed.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function extractWindData(nws: NWSForecastData): WindData {
  const periods = nws.hourly.length > 0 ? nws.hourly : nws.periods;
  let maxGust = 0;
  let totalWind = 0;
  const dirCounts: Record<string, number> = {};
  const windPeriods: WindData["periods"] = [];

  for (const p of periods.slice(0, 24)) {
    const speed = parseWindMph(p.windSpeed);
    const gustMatch = p.windSpeed.match(/(\d+)\s*to\s*(\d+)/);
    const gust = gustMatch ? parseInt(gustMatch[2], 10) : null;

    maxGust = Math.max(maxGust, gust ?? speed);
    totalWind += speed;
    dirCounts[p.windDirection] = (dirCounts[p.windDirection] ?? 0) + 1;
    windPeriods.push({
      time: p.startTime,
      windSpeed: speed,
      windDirection: p.windDirection,
      gustMph: gust,
    });
  }

  let dominantDir = "N";
  let maxCount = 0;
  for (const [dir, count] of Object.entries(dirCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantDir = dir;
    }
  }

  const count = Math.min(periods.length, 24);
  return {
    maxGustMph: maxGust,
    avgWindMph: count > 0 ? Math.round(totalWind / count) : 0,
    dominantDirection: dominantDir,
    periods: windPeriods,
  };
}

// ── Main fetcher ─────────────────────────────────────────────────────────

export async function fetchSegmentConditions(
  segments: RouteSegment[],
  tripDate: Date,
): Promise<SegmentConditions[]> {
  const startTime = Date.now();
  console.log(
    `[segment-conditions] Starting fetch for ${segments.length} segments`,
  );

  if (segments.length === 0) return [];

  const midpoints = segments.map((s) => segmentMidpoint(s));

  // Group segments by NWS grid cell to avoid duplicate weather fetches
  const nwsGroups = new Map<
    string,
    { lat: number; lng: number; indices: number[] }
  >();
  for (let i = 0; i < segments.length; i++) {
    const [lat, lng] = midpoints[i];
    const key = nwsGridKey(lat, lng);
    const g = nwsGroups.get(key);
    if (g) g.indices.push(i);
    else nwsGroups.set(key, { lat, lng, indices: [i] });
  }

  // Group steep segments by avalanche zone
  const avyGroups = new Map<
    string,
    { lat: number; lng: number; indices: number[] }
  >();
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].avgSlopeDegrees > 25) {
      const [lat, lng] = midpoints[i];
      const key = avyZoneKey(lat, lng);
      const g = avyGroups.get(key);
      if (g) g.indices.push(i);
      else avyGroups.set(key, { lat, lng, indices: [i] });
    }
  }

  const riverIndices = segments
    .map((s, i) => (s.terrainType === "river_crossing" ? i : -1))
    .filter((i) => i >= 0);

  const ridgeIndices = new Set(
    segments
      .map((s, i) =>
        s.terrainType === "ridge" || s.terrainType === "exposed_traverse"
          ? i
          : -1,
      )
      .filter((i) => i >= 0),
  );

  const centerIdx = Math.floor(midpoints.length / 2);
  const [centerLat, centerLng] = midpoints[centerIdx];

  // Fan out all fetches in parallel, grouped to minimize API calls
  const [
    nwsResults,
    avyResults,
    snotelResult,
    usgsResults,
    fireResult,
    daylightResult,
  ] = await Promise.all([
    // NWS: one fetch per grid cell
    Promise.all(
      Array.from(nwsGroups.entries()).map(async ([key, g]) => ({
        key,
        data: await safeCall(
          () => fetchNWS({ lat: g.lat, lng: g.lng }),
          `NWS:${key}`,
        ),
        indices: g.indices,
      })),
    ),
    // Avalanche: one fetch per zone
    Promise.all(
      Array.from(avyGroups.entries()).map(async ([key, g]) => ({
        key,
        data: await safeCall(
          () => fetchAvalanche({ lat: g.lat, lng: g.lng }),
          `Avy:${key}`,
          AVALANCHE_TIMEOUT_MS,
        ),
        indices: g.indices,
      })),
    ),
    // SNOTEL: single fetch at route center
    safeCall(
      () => fetchSnotel({ lat: centerLat, lng: centerLng }),
      "SNOTEL",
    ),
    // USGS: only for river_crossing segments
    Promise.all(
      riverIndices.map(async (idx) => ({
        idx,
        data: await safeCall(
          () => fetchUsgs({ lat: midpoints[idx][0], lng: midpoints[idx][1] }),
          `USGS:seg${idx}`,
        ),
      })),
    ),
    // Fires: single fetch at route center
    safeCall(
      () => fetchFires({ lat: centerLat, lng: centerLng }),
      "Fires",
    ),
    // Daylight: shared across all segments
    safeCall(
      () =>
        Promise.resolve(
          computeDaylight({ lat: centerLat, lng: centerLng, date: tripDate }),
        ),
      "Daylight",
    ),
  ]);

  // Build per-segment lookups from grouped results
  const segNws = new Map<number, NWSForecastData | null>();
  for (const r of nwsResults) {
    for (const i of r.indices) segNws.set(i, r.data);
  }

  const segAvy = new Map<number, AvalancheData | null>();
  for (const r of avyResults) {
    for (const i of r.indices) segAvy.set(i, r.data);
  }

  const segUsgs = new Map<number, UsgsData | null>();
  for (const r of usgsResults) {
    segUsgs.set(r.idx, r.data);
  }

  // Assemble SegmentConditions for each segment
  const results: SegmentConditions[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const nws = segNws.get(i) ?? null;
    const wind = ridgeIndices.has(i) && nws ? extractWindData(nws) : null;

    const conditions: SegmentConditionsData = {
      weather: nws,
      avalanche: segAvy.get(i) ?? null,
      snowpack: snotelResult,
      streamFlow: segUsgs.get(i) ?? null,
      daylight: daylightResult,
      fires: fireResult,
      wind,
    };

    const hazard = assessSegmentHazard(seg, conditions, midpoints[i]);

    results.push({
      segmentId: seg.id,
      segmentOrder: seg.segmentOrder,
      terrainType: seg.terrainType,
      conditions,
      hazardLevel: hazard.level,
      hazardFactors: hazard.factors,
    });
  }

  const elapsed = Date.now() - startTime;
  console.log(
    `[segment-conditions] Completed in ${elapsed}ms (${nwsGroups.size} NWS, ${avyGroups.size} avy, ${riverIndices.length} USGS calls)`,
  );

  return results;
}

// ── Route analysis builder ───────────────────────────────────────────────

export function buildRouteAnalysis(
  segmentConditions: SegmentConditions[],
): RouteAnalysis {
  const distribution: Record<HazardLevel, number> = {
    low: 0,
    moderate: 0,
    considerable: 0,
    high: 0,
    extreme: 0,
  };

  let highestIdx = 0;
  let highestLevel = 0;

  for (let i = 0; i < segmentConditions.length; i++) {
    const sc = segmentConditions[i];
    distribution[sc.hazardLevel]++;
    const lvl = HAZARD_LEVELS.indexOf(sc.hazardLevel);
    if (lvl > highestLevel) {
      highestLevel = lvl;
      highestIdx = i;
    }
  }

  const highest = segmentConditions[highestIdx];

  return {
    segments: segmentConditions,
    overallHazardLevel: HAZARD_LEVELS[highestLevel],
    highestHazardSegment: {
      order: highest?.segmentOrder ?? 0,
      level: highest?.hazardLevel ?? "low",
      factors: highest?.hazardFactors ?? [],
    },
    totalSegments: segmentConditions.length,
    hazardDistribution: distribution,
  };
}

/**
 * Strip heavy data (NWS hourly periods, full fire geometries) from
 * segment conditions to reduce payload size for serialization / storage.
 */
export function slimSegmentConditions(
  segmentConditions: SegmentConditions[],
): SegmentConditions[] {
  return segmentConditions.map((sc) => ({
    ...sc,
    conditions: {
      weather: sc.conditions.weather
        ? { ...sc.conditions.weather, hourly: [] }
        : null,
      avalanche: sc.conditions.avalanche ?? null,
      snowpack: sc.conditions.snowpack ?? null,
      streamFlow: sc.conditions.streamFlow ?? null,
      daylight: sc.conditions.daylight ?? null,
      fires: sc.conditions.fires
        ? {
            ...sc.conditions.fires,
            fires: sc.conditions.fires.fires.map((f) => ({
              ...f,
              geometry: { type: "Point" as const, coordinates: [0, 0] },
            })),
          }
        : null,
      wind: sc.conditions.wind ?? null,
    },
  }));
}
