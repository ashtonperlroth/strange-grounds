import { createAdminClient } from "@/lib/supabase/admin";

// ── Types ──────────────────────────────────────────────────────────────

export interface ClimateNormalsData {
  source: "open-meteo";
  normalHighF: number;
  normalLowF: number;
  normalPrecipIn: number;
  periodLabel: string;
  yearsOfData: number;
  fetchedAt: string;
}

export interface ClimateNormalsOptions {
  lat: number;
  lng: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

// ── Constants ──────────────────────────────────────────────────────────

const ARCHIVE_BASE = "https://archive-api.open-meteo.com/v1/archive";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const NORMALS_YEARS = 30;

const MONTH_ABBREVS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// ── Helpers ────────────────────────────────────────────────────────────

function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

function mmToInches(mm: number): number {
  return mm / 25.4;
}

function roundCoord(n: number, decimals = 3): string {
  return n.toFixed(decimals);
}

/**
 * Parse a YYYY-MM-DD string without timezone shifting.
 */
function parseYMD(dateStr: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { year: y, month: m, day: d };
}

function formatISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Checks whether a given month/day (1-indexed) falls within the trip
 * range. Handles ranges that wrap across the year boundary (e.g. Dec 28 – Jan 3).
 */
function isInDayOfYearRange(
  month: number,
  day: number,
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number,
): boolean {
  const mmdd = month * 100 + day;
  const startMmdd = startMonth * 100 + startDay;
  const endMmdd = endMonth * 100 + endDay;

  if (startMmdd <= endMmdd) {
    return mmdd >= startMmdd && mmdd <= endMmdd;
  }
  // Wraps across year boundary
  return mmdd >= startMmdd || mmdd <= endMmdd;
}

function formatPeriodLabel(
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number,
): string {
  const startLabel = `${MONTH_ABBREVS[startMonth - 1]} ${startDay}`;
  const endLabel = `${MONTH_ABBREVS[endMonth - 1]} ${endDay}`;
  if (startLabel === endLabel) return startLabel;
  return `${startLabel}–${endLabel}`;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ── Cache layer ────────────────────────────────────────────────────────

async function getCached(
  cacheKey: string,
): Promise<ClimateNormalsData | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("data_cache")
      .select("data, expires_at")
      .eq("source", "open-meteo-normals")
      .eq("cache_key", cacheKey)
      .single();

    if (!data) return null;
    if (new Date(data.expires_at) < new Date()) return null;
    return data.data as ClimateNormalsData;
  } catch {
    return null;
  }
}

async function setCache(
  cacheKey: string,
  payload: ClimateNormalsData,
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();

    await supabase.from("data_cache").upsert(
      {
        source: "open-meteo-normals",
        cache_key: cacheKey,
        data: payload as unknown as Record<string, unknown>,
        expires_at: expiresAt,
      },
      { onConflict: "source,cache_key" },
    );
  } catch (err) {
    console.warn("Climate normals cache write failed:", err);
  }
}

// ── Main fetch ─────────────────────────────────────────────────────────

export async function fetchClimateNormals(
  options: ClimateNormalsOptions,
): Promise<ClimateNormalsData> {
  const { lat, lng, startDate, endDate } = options;
  const tripStart = parseYMD(startDate);
  const tripEnd = parseYMD(endDate);

  const cacheKey = `${roundCoord(lat)}:${roundCoord(lng)}:${String(tripStart.month).padStart(2, "0")}${String(tripStart.day).padStart(2, "0")}:${String(tripEnd.month).padStart(2, "0")}${String(tripEnd.day).padStart(2, "0")}`;

  const cached = await getCached(cacheKey);
  if (cached) return cached;

  const today = new Date();
  const archiveStartDate = formatISODate(
    today.getFullYear() - NORMALS_YEARS,
    tripStart.month,
    1,
  );
  const archiveEndDate = formatISODate(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate(),
  );

  const url =
    `${ARCHIVE_BASE}?latitude=${lat}&longitude=${lng}` +
    `&start_date=${archiveStartDate}&end_date=${archiveEndDate}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Open-Meteo archive API ${res.status}: ${res.statusText}`,
    );
  }

  const json = await res.json();
  const dates: string[] = json.daily?.time ?? [];
  const highs: (number | null)[] = json.daily?.temperature_2m_max ?? [];
  const lows: (number | null)[] = json.daily?.temperature_2m_min ?? [];
  const precip: (number | null)[] = json.daily?.precipitation_sum ?? [];

  const matchingHighs: number[] = [];
  const matchingLows: number[] = [];
  const matchingPrecip: number[] = [];
  const matchingYears = new Set<number>();

  for (let i = 0; i < dates.length; i++) {
    const parsed = parseYMD(dates[i]);

    if (
      isInDayOfYearRange(
        parsed.month,
        parsed.day,
        tripStart.month,
        tripStart.day,
        tripEnd.month,
        tripEnd.day,
      )
    ) {
      if (highs[i] != null) matchingHighs.push(highs[i]!);
      if (lows[i] != null) matchingLows.push(lows[i]!);
      if (precip[i] != null) matchingPrecip.push(precip[i]!);
      matchingYears.add(parsed.year);
    }
  }

  const result: ClimateNormalsData = {
    source: "open-meteo",
    normalHighF: Math.round(celsiusToFahrenheit(average(matchingHighs))),
    normalLowF: Math.round(celsiusToFahrenheit(average(matchingLows))),
    normalPrecipIn:
      Math.round(mmToInches(average(matchingPrecip)) * 100) / 100,
    periodLabel: formatPeriodLabel(
      tripStart.month,
      tripStart.day,
      tripEnd.month,
      tripEnd.day,
    ),
    yearsOfData: matchingYears.size,
    fetchedAt: new Date().toISOString(),
  };

  await setCache(cacheKey, result);

  return result;
}
