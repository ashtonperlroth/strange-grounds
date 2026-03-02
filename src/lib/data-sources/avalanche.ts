import { createAdminClient } from "@/lib/supabase/admin";
import {
  findZoneByPoint,
  type AvalancheZoneFeature,
} from "@/lib/data-sources/avalanche-zones";

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
  warning?: string;
}

export interface AvalancheOptions {
  lat: number;
  lng: number;
}

// ── Constants ──────────────────────────────────────────────────────────

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const DANGER_LABELS: Record<DangerLevel, DangerLabelType> = {
  0: "No Rating",
  1: "Low",
  2: "Moderate",
  3: "Considerable",
  4: "High",
  5: "Extreme",
};

// ── Cache layer (Supabase data_cache) ─────────────────────────────────

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

// ── Build AvalancheData from zone feature ─────────────────────────────

function clampDanger(raw: unknown): DangerLevel {
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  if (isNaN(n) || n < 0) return 0;
  return Math.min(5, Math.round(n)) as DangerLevel;
}

function buildFromZone(zone: AvalancheZoneFeature): AvalancheData {
  const props = zone.properties;
  const level = clampDanger(props.danger_level);
  const label = DANGER_LABELS[level];

  const dangerRatings: DangerRating[] = (
    ["above_treeline", "near_treeline", "below_treeline"] as const
  ).map((elevation) => ({
    elevation,
    level,
    label,
  }));

  return {
    source: "avalanche",
    center: props.center || props.center_id || "",
    centerUrl: props.link || "",
    zone: props.name || "",
    dangerLevel: level,
    dangerLabel: label,
    dangerRatings,
    problems: [],
    discussion: props.travel_advice || "",
    issuedAt: props.start_date || "",
    expiresAt: props.end_date || "",
    fetchedAt: new Date().toISOString(),
    warning: (typeof props.warning === "string" ? props.warning : undefined) || undefined,
  };
}

// ── Main fetch ─────────────────────────────────────────────────────────

export async function fetchAvalanche(
  options: AvalancheOptions,
): Promise<AvalancheData | null> {
  const { lat, lng } = options;
  const cacheKey = getCacheKey(lat, lng);

  const cached = await getCached(cacheKey);
  if (cached) return cached;

  try {
    const zone = await findZoneByPoint(lat, lng);
    if (!zone) return null;

    const data = buildFromZone(zone);
    await setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.error("Failed to fetch avalanche data:", err);
    return null;
  }
}
