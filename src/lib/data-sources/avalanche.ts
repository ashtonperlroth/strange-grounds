import { createAdminClient } from "@/lib/supabase/admin";

// ── Types ──────────────────────────────────────────────────────────────

export type DangerLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type DangerLabelType =
  | "No Rating"
  | "Low"
  | "Moderate"
  | "Considerable"
  | "High"
  | "Extreme";

export type ElevationBand = "below_treeline" | "near_treeline" | "above_treeline";
export type Aspect = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export interface AvalancheProblem {
  name: string;
  aspects: Aspect[];
  elevations: ElevationBand[];
  likelihood: string;
  size: string;
}

export interface DangerRating {
  elevation: ElevationBand;
  level: DangerLevel;
  label: DangerLabelType;
}

export interface AvalancheData {
  source: "avalanche";
  center: string;
  centerUrl: string;
  zone: string;
  dangerLevel: DangerLevel;
  dangerLabel: DangerLabelType;
  dangerRatings: DangerRating[];
  problems: AvalancheProblem[];
  discussion: string;
  issuedAt: string;
  expiresAt: string;
  fetchedAt: string;
}

export interface AvalancheOptions {
  lat: number;
  lng: number;
}

// ── Constants ──────────────────────────────────────────────────────────

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const ALL_ASPECTS: Aspect[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

const DANGER_LABELS: Record<DangerLevel, DangerLabelType> = {
  0: "No Rating",
  1: "Low",
  2: "Moderate",
  3: "Considerable",
  4: "High",
  5: "Extreme",
};

// ── Cache layer ────────────────────────────────────────────────────────

function getCacheKey(lat: number, lng: number): string {
  return `avy:${lat.toFixed(3)}:${lng.toFixed(3)}`;
}

async function getCached(cacheKey: string): Promise<AvalancheData | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("data_cache")
      .select("data, expires_at")
      .eq("source", "avalanche")
      .eq("cache_key", cacheKey)
      .single();

    if (!data) return null;
    if (new Date(data.expires_at) < new Date()) return null;
    return data.data as AvalancheData;
  } catch {
    return null;
  }
}

async function setCache(
  cacheKey: string,
  payload: AvalancheData,
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();

    await supabase.from("data_cache").upsert(
      {
        source: "avalanche",
        cache_key: cacheKey,
        data: payload as unknown as Record<string, unknown>,
        expires_at: expiresAt,
      },
      { onConflict: "source,cache_key" },
    );
  } catch (err) {
    console.warn("Avalanche cache write failed:", err);
  }
}

// ── Zone lookup ────────────────────────────────────────────────────────

interface AvalancheZone {
  id: string;
  center_id: string;
  zone_id: string;
  name: string;
  api_url: string | null;
  metadata: Record<string, unknown> | null;
}

async function findZone(
  lat: number,
  lng: number,
): Promise<AvalancheZone | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("find_avalanche_zone", {
    p_lat: lat,
    p_lng: lng,
  });

  if (error) {
    console.warn("find_avalanche_zone RPC failed, trying direct query:", error);

    const { data: fallback, error: fbError } = await supabase
      .from("avalanche_zones")
      .select("id, center_id, zone_id, name, api_url, metadata")
      .limit(1)
      .single();

    if (fbError || !fallback) return null;
    return fallback as AvalancheZone;
  }

  if (!data || (Array.isArray(data) && data.length === 0)) return null;

  const zone = Array.isArray(data) ? data[0] : data;
  return zone as AvalancheZone;
}

// ── API parsers ────────────────────────────────────────────────────────

function dangerLabel(level: number): DangerLabelType {
  const clamped = Math.max(0, Math.min(5, Math.round(level))) as DangerLevel;
  return DANGER_LABELS[clamped];
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function parseAvalancheOrgV2(json: any, zone: AvalancheZone): AvalancheData {
  const forecast = Array.isArray(json) ? json[0] : json;

  const dangerRatings: DangerRating[] = [];
  const rawDanger = forecast?.danger ?? forecast?.forecast?.danger ?? [];

  if (Array.isArray(rawDanger)) {
    for (const d of rawDanger) {
      const elev = mapElevationBand(d.elevation ?? d.valid_elev ?? "");
      const level = clampDanger(d.danger ?? d.level ?? d.danger_level ?? 0);
      if (elev) {
        dangerRatings.push({ elevation: elev, level, label: dangerLabel(level) });
      }
    }
  }

  if (dangerRatings.length === 0) {
    for (const band of ["above_treeline", "near_treeline", "below_treeline"] as const) {
      dangerRatings.push({ elevation: band, level: 0, label: "No Rating" });
    }
  }

  const overallDanger = Math.max(...dangerRatings.map((r) => r.level)) as DangerLevel;

  const problems: AvalancheProblem[] = [];
  const rawProblems =
    forecast?.avalanche_problems ??
    forecast?.forecast?.avalanche_problems ??
    [];

  if (Array.isArray(rawProblems)) {
    for (const p of rawProblems) {
      problems.push({
        name: p.name ?? p.type ?? p.problem ?? "Unknown",
        aspects: parseAspects(p.aspects ?? p.aspect ?? []),
        elevations: parseElevations(p.elevations ?? p.elevation ?? []),
        likelihood: p.likelihood ?? p.likelihood_label ?? "",
        size: p.size ?? p.expected_size ?? "",
      });
    }
  }

  const discussion =
    forecast?.bottom_line ??
    forecast?.forecast?.bottom_line ??
    forecast?.discussion ??
    forecast?.forecast_discussion ??
    forecast?.hazard_discussion ??
    "";

  const centerName =
    forecast?.avalanche_center?.name ??
    forecast?.center_name ??
    zone.metadata?.center_name ??
    zone.center_id;

  const centerUrl =
    forecast?.avalanche_center?.url ??
    forecast?.center_url ??
    (zone.metadata?.center_url as string) ??
    "";

  return {
    source: "avalanche",
    center: String(centerName),
    centerUrl: String(centerUrl),
    zone: zone.name,
    dangerLevel: overallDanger,
    dangerLabel: dangerLabel(overallDanger),
    dangerRatings,
    problems,
    discussion: String(discussion),
    issuedAt: forecast?.published_time ?? forecast?.created_at ?? "",
    expiresAt: forecast?.expires_time ?? forecast?.expires_at ?? "",
    fetchedAt: new Date().toISOString(),
  };
}

function mapElevationBand(raw: string): ElevationBand | null {
  const lower = String(raw).toLowerCase().replace(/[\s-]/g, "_");
  if (lower.includes("above") || lower.includes("upper") || lower === "alp")
    return "above_treeline";
  if (lower.includes("near") || lower.includes("middle") || lower === "tln")
    return "near_treeline";
  if (lower.includes("below") || lower.includes("lower") || lower === "btl")
    return "below_treeline";
  return null;
}

function clampDanger(raw: unknown): DangerLevel {
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(5, Math.round(n))) as DangerLevel;
}

function parseAspects(raw: unknown): Aspect[] {
  if (!raw) return [];

  if (typeof raw === "string") {
    return raw
      .split(/[,\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s): s is Aspect => ALL_ASPECTS.includes(s as Aspect)) as Aspect[];
  }

  if (Array.isArray(raw)) {
    return raw
      .map((a) => String(a).trim().toUpperCase())
      .filter((s): s is Aspect => ALL_ASPECTS.includes(s as Aspect));
  }

  return [];
}

function parseElevations(raw: unknown): ElevationBand[] {
  if (!raw) return [];

  const items = Array.isArray(raw) ? raw : String(raw).split(/[,\s]+/);
  return items
    .map((e) => mapElevationBand(String(e)))
    .filter((e): e is ElevationBand => e !== null);
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Fetch forecast ─────────────────────────────────────────────────────

async function fetchForecastFromApi(zone: AvalancheZone): Promise<AvalancheData> {
  const apiUrl = zone.api_url;
  if (!apiUrl) {
    throw new Error(`No api_url configured for zone ${zone.name}`);
  }

  const res = await fetch(apiUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "(backcountry-app, contact@example.com)",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Avalanche API ${res.status}: ${res.statusText} for ${apiUrl}`);
  }

  const json = await res.json();
  return parseAvalancheOrgV2(json, zone);
}

// ── Main fetch ─────────────────────────────────────────────────────────

export async function fetchAvalanche(
  options: AvalancheOptions,
): Promise<AvalancheData | null> {
  const { lat, lng } = options;
  const cacheKey = getCacheKey(lat, lng);

  const cached = await getCached(cacheKey);
  if (cached) return cached;

  const zone = await findZone(lat, lng);
  if (!zone) return null;

  try {
    const data = await fetchForecastFromApi(zone);
    await setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.error("Failed to fetch avalanche forecast:", err);
    return null;
  }
}
