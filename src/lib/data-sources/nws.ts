import { createAdminClient } from "@/lib/supabase/admin";

// ── Types ──────────────────────────────────────────────────────────────

export interface NWSForecastPeriod {
  number: number;
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  windDirection: string;
  shortForecast: string;
  detailedForecast: string;
  probabilityOfPrecipitation: { value: number | null } | null;
  relativeHumidity: { value: number | null } | null;
}

export interface NWSAlert {
  id: string;
  event: string;
  headline: string;
  severity: string;
  urgency: string;
  description: string;
  instruction: string | null;
  onset: string;
  expires: string;
}

export interface NWSForecastData {
  source: "nws";
  periods: NWSForecastPeriod[];
  hourly: NWSForecastPeriod[];
  alerts: NWSAlert[];
  fetchedAt: string;
}

export interface NWSOptions {
  lat: number;
  lng: number;
}

// ── Constants ──────────────────────────────────────────────────────────

const NWS_BASE = "https://api.weather.gov";
const USER_AGENT = "(backcountry-app, contact@example.com)";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ── Helpers ────────────────────────────────────────────────────────────

async function nwsFetch(url: string, retries = 1): Promise<Response> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/geo+json",
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) return res;
      if ((res.status === 500 || res.status === 503) && attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw new Error(`NWS API ${res.status}: ${res.statusText} for ${url}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
    }
  }

  throw lastError ?? new Error(`NWS fetch failed for ${url}`);
}

function roundCoord(n: number, decimals = 4): string {
  return n.toFixed(decimals);
}

// ── Cache layer ────────────────────────────────────────────────────────

async function getCached(
  cacheKey: string,
): Promise<NWSForecastData | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("data_cache")
      .select("data, expires_at")
      .eq("source", "nws")
      .eq("cache_key", cacheKey)
      .single();

    if (!data) return null;
    if (new Date(data.expires_at) < new Date()) return null;
    return data.data as NWSForecastData;
  } catch {
    return null;
  }
}

async function setCache(
  cacheKey: string,
  payload: NWSForecastData,
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();

    await supabase.from("data_cache").upsert(
      {
        source: "nws",
        cache_key: cacheKey,
        data: payload as unknown as Record<string, unknown>,
        expires_at: expiresAt,
      },
      { onConflict: "source,cache_key" },
    );
  } catch (err) {
    console.warn("NWS cache write failed:", err);
  }
}

// ── Main fetch ─────────────────────────────────────────────────────────

export async function fetchNWS(options: NWSOptions): Promise<NWSForecastData> {
  const { lat, lng } = options;
  const cacheKey = `${roundCoord(lat)},${roundCoord(lng)}`;

  const cached = await getCached(cacheKey);
  if (cached) return cached;

  // Step 1: Get grid endpoint URLs from the points API
  const pointsRes = await nwsFetch(
    `${NWS_BASE}/points/${roundCoord(lat)},${roundCoord(lng)}`,
  );
  const pointsJson = await pointsRes.json();
  const forecastUrl: string = pointsJson.properties.forecast;
  const forecastHourlyUrl: string = pointsJson.properties.forecastHourly;

  // Step 2: Fan out requests for forecast, hourly, and alerts
  const [forecastRes, hourlyRes, alertsResult] = await Promise.all([
    nwsFetch(forecastUrl),
    nwsFetch(forecastHourlyUrl),
    nwsFetch(
      `${NWS_BASE}/alerts/active?point=${roundCoord(lat)},${roundCoord(lng)}`,
    ).catch((err) => {
      console.warn("NWS alerts fetch failed (partial data OK):", err);
      return null;
    }),
  ]);

  const forecastJson = await forecastRes.json();
  const hourlyJson = await hourlyRes.json();

  const periods: NWSForecastPeriod[] = (
    forecastJson.properties.periods ?? []
  ).map(mapPeriod);

  const hourly: NWSForecastPeriod[] = (
    hourlyJson.properties.periods ?? []
  ).map(mapPeriod);

  let alerts: NWSAlert[] = [];
  if (alertsResult) {
    const alertsJson = await alertsResult.json();
    alerts = (alertsJson.features ?? []).map(mapAlert);
  }

  const result: NWSForecastData = {
    source: "nws",
    periods,
    hourly,
    alerts,
    fetchedAt: new Date().toISOString(),
  };

  await setCache(cacheKey, result);

  return result;
}

// ── Mappers ────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapPeriod(raw: any): NWSForecastPeriod {
  return {
    number: raw.number,
    name: raw.name,
    startTime: raw.startTime,
    endTime: raw.endTime,
    isDaytime: raw.isDaytime,
    temperature: raw.temperature,
    temperatureUnit: raw.temperatureUnit,
    windSpeed: raw.windSpeed ?? "",
    windDirection: raw.windDirection ?? "",
    shortForecast: raw.shortForecast ?? "",
    detailedForecast: raw.detailedForecast ?? "",
    probabilityOfPrecipitation: raw.probabilityOfPrecipitation ?? null,
    relativeHumidity: raw.relativeHumidity ?? null,
  };
}

function mapAlert(raw: any): NWSAlert {
  const p = raw.properties ?? raw;
  return {
    id: p.id ?? raw.id ?? "",
    event: p.event ?? "",
    headline: p.headline ?? "",
    severity: p.severity ?? "",
    urgency: p.urgency ?? "",
    description: p.description ?? "",
    instruction: p.instruction ?? null,
    onset: p.onset ?? "",
    expires: p.expires ?? "",
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
