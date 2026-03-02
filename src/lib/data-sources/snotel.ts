import { createAdminClient } from "@/lib/supabase/admin";

export interface SnotelStation {
  id: string;
  stationId: string;
  name: string;
  elevationM: number;
  distanceKm: number;
  state: string;
}

export interface SnotelDailyReading {
  date: string;
  snowDepthIn: number | null;
  sweIn: number | null;
  avgTempF: number | null;
}

export interface SnotelStationData {
  station: SnotelStation;
  readings: SnotelDailyReading[];
  latest: {
    snowDepthIn: number | null;
    sweIn: number | null;
    avgTempF: number | null;
  };
  trend: "rising" | "falling" | "stable";
}

export interface SnotelData {
  source: "snotel";
  stations: SnotelStationData[];
  nearest: SnotelStationData | null;
  summary: {
    avgSnowDepthIn: number | null;
    avgSweIn: number | null;
    percentOfNormal: number | null;
  };
}

export interface SnotelOptions {
  lat: number;
  lng: number;
}

const SNOTEL_CSV_BASE =
  "https://wcc.sc.egov.usda.gov/reportGenerator/view_csv/customSingleStationReport/daily";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SEARCH_RADIUS_M = 50_000;

function buildSnotelUrl(stationId: string, state: string): string {
  const triplet = `${stationId}:${state}:SNTL`;
  return `${SNOTEL_CSV_BASE}/${triplet}/-30,0/SNWD::value,WTEQ::value,TAVG::value`;
}

function parseSnotelCsv(csv: string): SnotelDailyReading[] {
  const lines = csv.split("\n");
  const readings: SnotelDailyReading[] = [];

  for (const line of lines) {
    if (line.startsWith("#") || line.trim() === "") continue;
    if (line.toLowerCase().startsWith("date")) continue;

    const parts = line.split(",");
    if (parts.length < 4) continue;

    const date = parts[0].trim();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    readings.push({
      date,
      snowDepthIn: parseNumericField(parts[1]),
      sweIn: parseNumericField(parts[2]),
      avgTempF: parseNumericField(parts[3]),
    });
  }

  return readings;
}

function parseNumericField(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "-") return null;
  const num = parseFloat(trimmed);
  return isNaN(num) ? null : num;
}

function computeTrend(readings: SnotelDailyReading[]): "rising" | "falling" | "stable" {
  const recentReadings = readings
    .slice(-7)
    .filter((r) => r.snowDepthIn !== null);

  if (recentReadings.length < 2) return "stable";

  const first = recentReadings[0].snowDepthIn!;
  const last = recentReadings[recentReadings.length - 1].snowDepthIn!;
  const diff = last - first;

  if (diff > 2) return "rising";
  if (diff < -2) return "falling";
  return "stable";
}

async function findNearestStations(
  lat: number,
  lng: number,
): Promise<SnotelStation[]> {
  const supabase = createAdminClient();

  console.log(`[snotel] Finding stations near (${lat}, ${lng}), radius=${SEARCH_RADIUS_M}m`);

  const { data, error } = await supabase.rpc("find_nearest_snotel_stations", {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: SEARCH_RADIUS_M,
    p_limit: 3,
  });

  if (error) {
    console.error("[snotel] RPC find_nearest_snotel_stations failed:", error.message, error.details);
    console.log("[snotel] Falling back to plain stations query...");
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("stations")
      .select("id, station_id, name, elevation_m, metadata")
      .eq("source", "snotel")
      .limit(3);

    if (fallbackError) {
      console.error("[snotel] Fallback query also failed:", fallbackError.message);
      return [];
    }

    if (!fallbackData?.length) {
      console.warn("[snotel] No SNOTEL stations found in stations table. Has the seed script been run?");
      return [];
    }

    console.log(`[snotel] Fallback found ${fallbackData.length} station(s)`);
    return fallbackData.map((s) => ({
      id: s.id,
      stationId: s.station_id,
      name: s.name,
      elevationM: s.elevation_m ?? 0,
      distanceKm: 0,
      state: (s.metadata as Record<string, string>)?.state ?? "CO",
    }));
  }

  if (!data?.length) {
    console.warn(`[snotel] RPC returned 0 stations near (${lat}, ${lng}). Checking if any SNOTEL stations exist...`);
    const { count } = await supabase
      .from("stations")
      .select("id", { count: "exact", head: true })
      .eq("source", "snotel");
    console.warn(`[snotel] Total SNOTEL stations in DB: ${count ?? 0}. ${count === 0 ? "Seed script may not have been run." : "Stations exist but none within search radius."}`);
    return [];
  }

  console.log(`[snotel] Found ${data.length} station(s): ${data.map((s: { name: string }) => s.name).join(", ")}`);

  return data.map(
    (s: {
      id: string;
      station_id: string;
      name: string;
      elevation_m: number | null;
      distance_km: number;
      metadata: Record<string, string> | null;
    }) => ({
      id: s.id,
      stationId: s.station_id,
      name: s.name,
      elevationM: s.elevation_m ?? 0,
      distanceKm: s.distance_km,
      state: s.metadata?.state ?? "CO",
    }),
  );
}

async function fetchStationData(
  station: SnotelStation,
): Promise<SnotelStationData> {
  const url = buildSnotelUrl(station.stationId, station.state);
  console.log(`[snotel] Fetching CSV for ${station.name} (${station.stationId}:${station.state})`);

  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });

  if (!response.ok) {
    console.error(`[snotel] CSV fetch failed for ${station.stationId}: HTTP ${response.status}`);
    throw new Error(
      `SNOTEL fetch failed for ${station.stationId}: ${response.status}`,
    );
  }

  const csv = await response.text();
  const readings = parseSnotelCsv(csv);
  console.log(`[snotel] Parsed ${readings.length} readings for ${station.name}`);

  const latest =
    readings.length > 0
      ? readings[readings.length - 1]
      : { snowDepthIn: null, sweIn: null, avgTempF: null };

  return {
    station,
    readings,
    latest: {
      snowDepthIn: latest.snowDepthIn,
      sweIn: latest.sweIn,
      avgTempF: latest.avgTempF,
    },
    trend: computeTrend(readings),
  };
}

function getCacheKey(lat: number, lng: number): string {
  return `snotel:${lat.toFixed(3)}:${lng.toFixed(3)}`;
}

async function getCachedData(
  cacheKey: string,
): Promise<SnotelData | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("data_cache")
    .select("data, expires_at")
    .eq("source", "snotel")
    .eq("cache_key", cacheKey)
    .single();

  if (error || !data) return null;

  const expiresAt = new Date(data.expires_at).getTime();
  if (Date.now() > expiresAt) return null;

  return data.data as SnotelData;
}

async function setCachedData(
  cacheKey: string,
  snotelData: SnotelData,
): Promise<void> {
  const supabase = createAdminClient();

  const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();

  await supabase.from("data_cache").upsert(
    {
      source: "snotel",
      cache_key: cacheKey,
      data: snotelData as unknown as Record<string, unknown>,
      expires_at: expiresAt,
    },
    { onConflict: "source,cache_key" },
  );
}

function buildFallbackData(): SnotelData {
  return {
    source: "snotel",
    stations: [],
    nearest: null,
    summary: {
      avgSnowDepthIn: null,
      avgSweIn: null,
      percentOfNormal: null,
    },
  };
}

export async function fetchSnotel(options: SnotelOptions): Promise<SnotelData> {
  const { lat, lng } = options;
  const cacheKey = getCacheKey(lat, lng);

  const cached = await getCachedData(cacheKey);
  if (cached) return cached;

  const stations = await findNearestStations(lat, lng);
  if (stations.length === 0) return buildFallbackData();

  const stationResults = await Promise.allSettled(
    stations.map((s) => fetchStationData(s)),
  );

  const stationData = stationResults
    .filter(
      (r): r is PromiseFulfilledResult<SnotelStationData> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value);

  if (stationData.length === 0) return buildFallbackData();

  const depthValues = stationData
    .map((s) => s.latest.snowDepthIn)
    .filter((v): v is number => v !== null);

  const sweValues = stationData
    .map((s) => s.latest.sweIn)
    .filter((v): v is number => v !== null);

  const avgSnowDepthIn =
    depthValues.length > 0
      ? Math.round(
          (depthValues.reduce((a, b) => a + b, 0) / depthValues.length) * 10,
        ) / 10
      : null;

  const avgSweIn =
    sweValues.length > 0
      ? Math.round(
          (sweValues.reduce((a, b) => a + b, 0) / sweValues.length) * 10,
        ) / 10
      : null;

  const result: SnotelData = {
    source: "snotel",
    stations: stationData,
    nearest: stationData[0],
    summary: {
      avgSnowDepthIn,
      avgSweIn,
      percentOfNormal: null,
    },
  };

  await setCachedData(cacheKey, result).catch((err) =>
    console.error("Failed to cache SNOTEL data:", err),
  );

  return result;
}
