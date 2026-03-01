import { createAdminClient } from "@/lib/supabase/admin";

export interface UsgsStation {
  id: string;
  siteId: string;
  name: string;
  distanceKm: number;
}

export interface UsgsDailyReading {
  date: string;
  dischargeCfs: number | null;
}

export interface UsgsStationData {
  station: UsgsStation;
  current: {
    dischargeCfs: number | null;
    gageHeightFt: number | null;
    timestamp: string | null;
  };
  percentOfMedian: number | null;
  history: UsgsDailyReading[];
  trend: "rising" | "falling" | "stable";
}

export interface UsgsData {
  source: "usgs";
  stations: UsgsStationData[];
  nearest: UsgsStationData | null;
  summary: {
    avgDischargeCfs: number | null;
    maxPercentOfMedian: number | null;
    gaugeCount: number;
  };
}

export interface UsgsOptions {
  lat: number;
  lng: number;
}

const USGS_IV_BASE =
  "https://waterservices.usgs.gov/nwis/iv/";
const USGS_DV_BASE =
  "https://waterservices.usgs.gov/nwis/dv/";
const PARAM_DISCHARGE = "00060";
const PARAM_GAGE_HEIGHT = "00065";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const SEARCH_RADIUS_M = 30_000;
const MAX_STATIONS = 5;

interface UsgsTimeSeriesValue {
  value: string;
  dateTime: string;
}

interface UsgsTimeSeries {
  sourceInfo: {
    siteName: string;
    siteCode: Array<{ value: string }>;
  };
  variable: {
    variableCode: Array<{ value: string }>;
  };
  values: Array<{
    value: UsgsTimeSeriesValue[];
  }>;
}

interface UsgsResponse {
  value: {
    timeSeries: UsgsTimeSeries[];
  };
}

function parseUsgsFloat(value: string): number | null {
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) return null;
  return num;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function computeTrend(
  history: UsgsDailyReading[],
): "rising" | "falling" | "stable" {
  const recent = history
    .slice(-7)
    .filter((r) => r.dischargeCfs !== null);

  if (recent.length < 2) return "stable";

  const first = recent[0].dischargeCfs!;
  const last = recent[recent.length - 1].dischargeCfs!;

  if (first === 0) return last > 0 ? "rising" : "stable";

  const pctChange = ((last - first) / first) * 100;
  if (pctChange > 15) return "rising";
  if (pctChange < -15) return "falling";
  return "stable";
}

function computePercentOfMedian(history: UsgsDailyReading[]): number | null {
  const values = history
    .map((r) => r.dischargeCfs)
    .filter((v): v is number => v !== null);

  if (values.length < 5) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  if (median === 0) return null;

  const latest = values[values.length - 1];
  return Math.round((latest / median) * 100);
}

async function findNearestStations(
  lat: number,
  lng: number,
): Promise<UsgsStation[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("find_nearest_usgs_stations", {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: SEARCH_RADIUS_M,
    p_limit: MAX_STATIONS,
  });

  if (error) {
    console.error("Error finding USGS stations via RPC:", error);
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("stations")
      .select("id, station_id, name")
      .eq("source", "usgs")
      .limit(MAX_STATIONS);

    if (fallbackError || !fallbackData?.length) return [];

    return fallbackData.map((s) => ({
      id: s.id,
      siteId: s.station_id,
      name: s.name,
      distanceKm: 0,
    }));
  }

  if (!data?.length) return [];

  return data.map(
    (s: {
      id: string;
      station_id: string;
      name: string;
      distance_km: number;
    }) => ({
      id: s.id,
      siteId: s.station_id,
      name: s.name,
      distanceKm: s.distance_km,
    }),
  );
}

async function fetchCurrentConditions(
  siteIds: string[],
): Promise<
  Map<string, { dischargeCfs: number | null; gageHeightFt: number | null; timestamp: string | null }>
> {
  const result = new Map<
    string,
    { dischargeCfs: number | null; gageHeightFt: number | null; timestamp: string | null }
  >();

  if (siteIds.length === 0) return result;

  const url = new URL(USGS_IV_BASE);
  url.searchParams.set("sites", siteIds.join(","));
  url.searchParams.set("parameterCd", `${PARAM_DISCHARGE},${PARAM_GAGE_HEIGHT}`);
  url.searchParams.set("format", "json");

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      console.error(`USGS IV fetch failed: ${response.status}`);
      return result;
    }

    const json = (await response.json()) as UsgsResponse;
    const timeSeries = json?.value?.timeSeries ?? [];

    for (const ts of timeSeries) {
      const siteId = ts.sourceInfo?.siteCode?.[0]?.value;
      const paramCode = ts.variable?.variableCode?.[0]?.value;
      const latestValues = ts.values?.[0]?.value ?? [];
      const latest = latestValues[latestValues.length - 1];

      if (!siteId || !latest) continue;

      const existing = result.get(siteId) ?? {
        dischargeCfs: null,
        gageHeightFt: null,
        timestamp: null,
      };

      if (paramCode === PARAM_DISCHARGE) {
        existing.dischargeCfs = parseUsgsFloat(latest.value);
        existing.timestamp = latest.dateTime;
      } else if (paramCode === PARAM_GAGE_HEIGHT) {
        existing.gageHeightFt = parseUsgsFloat(latest.value);
        if (!existing.timestamp) existing.timestamp = latest.dateTime;
      }

      result.set(siteId, existing);
    }
  } catch (err) {
    console.error("USGS IV fetch error:", err);
  }

  return result;
}

async function fetchDailyHistory(
  siteIds: string[],
): Promise<Map<string, UsgsDailyReading[]>> {
  const result = new Map<string, UsgsDailyReading[]>();

  if (siteIds.length === 0) return result;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const url = new URL(USGS_DV_BASE);
  url.searchParams.set("sites", siteIds.join(","));
  url.searchParams.set("parameterCd", PARAM_DISCHARGE);
  url.searchParams.set("startDT", formatDate(startDate));
  url.searchParams.set("endDT", formatDate(endDate));
  url.searchParams.set("format", "json");

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      console.error(`USGS DV fetch failed: ${response.status}`);
      return result;
    }

    const json = (await response.json()) as UsgsResponse;
    const timeSeries = json?.value?.timeSeries ?? [];

    for (const ts of timeSeries) {
      const siteId = ts.sourceInfo?.siteCode?.[0]?.value;
      if (!siteId) continue;

      const values = ts.values?.[0]?.value ?? [];
      const readings: UsgsDailyReading[] = values.map((v) => ({
        date: v.dateTime.split("T")[0],
        dischargeCfs: parseUsgsFloat(v.value),
      }));

      result.set(siteId, readings);
    }
  } catch (err) {
    console.error("USGS DV fetch error:", err);
  }

  return result;
}

function getCacheKey(lat: number, lng: number): string {
  return `usgs:${lat.toFixed(3)}:${lng.toFixed(3)}`;
}

async function getCachedData(cacheKey: string): Promise<UsgsData | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("data_cache")
    .select("data, expires_at")
    .eq("source", "usgs")
    .eq("cache_key", cacheKey)
    .single();

  if (error || !data) return null;

  const expiresAt = new Date(data.expires_at).getTime();
  if (Date.now() > expiresAt) return null;

  return data.data as UsgsData;
}

async function setCachedData(
  cacheKey: string,
  usgsData: UsgsData,
): Promise<void> {
  const supabase = createAdminClient();

  const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();

  await supabase.from("data_cache").upsert(
    {
      source: "usgs",
      cache_key: cacheKey,
      data: usgsData as unknown as Record<string, unknown>,
      expires_at: expiresAt,
    },
    { onConflict: "source,cache_key" },
  );
}

function buildFallbackData(): UsgsData {
  return {
    source: "usgs",
    stations: [],
    nearest: null,
    summary: {
      avgDischargeCfs: null,
      maxPercentOfMedian: null,
      gaugeCount: 0,
    },
  };
}

export async function fetchUsgs(options: UsgsOptions): Promise<UsgsData> {
  const { lat, lng } = options;
  const cacheKey = getCacheKey(lat, lng);

  const cached = await getCachedData(cacheKey);
  if (cached) return cached;

  const stations = await findNearestStations(lat, lng);
  if (stations.length === 0) return buildFallbackData();

  const siteIds = stations.map((s) => s.siteId);

  const [currentMap, historyMap] = await Promise.all([
    fetchCurrentConditions(siteIds),
    fetchDailyHistory(siteIds),
  ]);

  const stationData: UsgsStationData[] = stations.map((station) => {
    const current = currentMap.get(station.siteId) ?? {
      dischargeCfs: null,
      gageHeightFt: null,
      timestamp: null,
    };
    const history = historyMap.get(station.siteId) ?? [];
    const trend = computeTrend(history);
    const percentOfMedian = computePercentOfMedian(history);

    return { station, current, percentOfMedian, history, trend };
  });

  const validStations = stationData.filter(
    (s) => s.current.dischargeCfs !== null || s.history.length > 0,
  );

  const finalStations = validStations.length > 0 ? validStations : stationData;

  const dischargeValues = finalStations
    .map((s) => s.current.dischargeCfs)
    .filter((v): v is number => v !== null);

  const medianValues = finalStations
    .map((s) => s.percentOfMedian)
    .filter((v): v is number => v !== null);

  const avgDischargeCfs =
    dischargeValues.length > 0
      ? Math.round(
          dischargeValues.reduce((a, b) => a + b, 0) / dischargeValues.length,
        )
      : null;

  const maxPercentOfMedian =
    medianValues.length > 0 ? Math.max(...medianValues) : null;

  const result: UsgsData = {
    source: "usgs",
    stations: finalStations,
    nearest: finalStations[0] ?? null,
    summary: {
      avgDischargeCfs,
      maxPercentOfMedian,
      gaugeCount: finalStations.length,
    },
  };

  await setCachedData(cacheKey, result).catch((err) =>
    console.error("Failed to cache USGS data:", err),
  );

  return result;
}
