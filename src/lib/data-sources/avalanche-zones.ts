import { booleanPointInPolygon, point } from "@turf/turf";
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from "geojson";

// ── All US avalanche center IDs from avalanche.org ──────────────────

export const AVALANCHE_CENTERS = [
  // Alaska
  "AAIC", "CNFAIC", "HAIC", "JMAC", "MARC", "TAC", "CACB", "EARAC", "CORAC",
  // Arizona
  "KRAC",
  // California
  "SAC", "ESAC", "MSAC",
  // Colorado
  "CAIC",
  // Idaho
  "PAC", "IPAC", "FVAC",
  // Montana
  "GNFAC", "WCMAC", "MFAC",
  // New Hampshire
  "MWAC",
  // New Mexico
  "TAOS",
  // Oregon
  "OACS", "WAC",
  // Utah
  "UAC",
  // Washington
  "NWAC",
  // Wyoming
  "BTAC",
] as const;

// ── Approximate bounding boxes for each avalanche center ────────────
// [west, south, east, north] — used by findZoneByPoint to limit
// fetches to only the 1-3 centers whose region contains the query point.

type CenterBbox = [number, number, number, number];

const CENTER_REGIONS: Record<string, CenterBbox> = {
  AAIC:   [-155, 58, -145, 65],
  CNFAIC: [-152, 59, -148, 62],
  HAIC:   [-150, 59, -145, 64],
  JMAC:   [-136, 57, -133, 60],
  MARC:   [-150, 61, -144, 64],
  TAC:    [-151, 61, -148, 63],
  CACB:   [-140, 60, -135, 63],
  EARAC:  [-146, 63, -143, 66],
  CORAC:  [-148, 59, -143, 62],
  KRAC:   [-113, 34, -110, 37],
  SAC:    [-122, 38, -119, 42],
  ESAC:   [-120, 36, -117, 39],
  MSAC:   [-120, 37, -118, 39],
  CAIC:   [-109, 36, -105, 41],
  PAC:    [-117, 43, -113, 49],
  IPAC:   [-116, 42, -113, 46],
  FVAC:   [-115, 43, -113, 45],
  GNFAC:  [-112, 44, -109, 47],
  WCMAC:  [-116, 46, -113, 49],
  MFAC:   [-114, 45, -112, 48],
  MWAC:   [-72, 43, -70, 45],
  TAOS:   [-107, 35, -104, 37],
  OACS:   [-123, 42, -120, 46],
  WAC:    [-123, 44, -120, 46],
  UAC:    [-113, 37, -109, 42],
  NWAC:   [-123, 46, -119, 49],
  BTAC:   [-112, 42, -108, 46],
};

function findCentersForPoint(lng: number, lat: number): string[] {
  const matches: string[] = [];
  for (const [centerId, [west, south, east, north]] of Object.entries(CENTER_REGIONS)) {
    if (lng >= west && lng <= east && lat >= south && lat <= north) {
      matches.push(centerId);
    }
  }
  return matches;
}

// ── Constants ───────────────────────────────────────────────────────

const MAP_LAYER_URL = "https://api.avalanche.org/v2/public/products/map-layer";
const USER_AGENT = "strange-grounds/1.0 (contact@strange-grounds.com)";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const FETCH_TIMEOUT_MS = 15_000;

// ── Types ───────────────────────────────────────────────────────────

export interface AvalancheZoneProperties {
  name: string;
  center: string;
  center_id: string;
  danger: string;
  danger_level: number;
  color: string;
  stroke: string;
  travel_advice: string;
  link: string;
  start_date: string;
  end_date: string;
  warning: string | null;
  // Normalized properties for map component backward compatibility
  dangerLevel: number;
  dangerLabel: string;
  centerName: string;
  problems: never[];
}

export type AvalancheZoneFeature = Feature<Polygon | MultiPolygon, AvalancheZoneProperties>;

// ── In-memory cache ─────────────────────────────────────────────────

let cachedCollection: FeatureCollection | null = null;
let cacheTimestamp = 0;

// ── Danger label normalization ──────────────────────────────────────

const DANGER_LABEL_MAP: Record<string, string> = {
  low: "Low",
  moderate: "Moderate",
  considerable: "Considerable",
  high: "High",
  extreme: "Extreme",
};

function normalizeDangerLabel(danger: string | undefined | null): string {
  if (!danger) return "No Rating";
  return DANGER_LABEL_MAP[danger.toLowerCase().trim()] ?? "No Rating";
}

function normalizeDangerLevel(level: unknown): number {
  const n = typeof level === "number" ? level : parseInt(String(level), 10);
  if (isNaN(n) || n < 0) return 0;
  return Math.min(5, Math.round(n));
}

// ── Fetch zones for a single center ────────────────────────────────

async function fetchCenterZones(centerId: string): Promise<Feature[]> {
  const url = `${MAP_LAYER_URL}/${centerId}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`avalanche.org ${res.status} for center ${centerId}`);
  }

  const data = await res.json();

  if (data?.type === "FeatureCollection" && Array.isArray(data.features)) {
    return data.features;
  }

  if (Array.isArray(data)) {
    return data;
  }

  return [];
}

// ── Normalize a raw feature from the API ───────────────────────────

function normalizeWarning(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === "string") return raw || null;
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (obj.product && typeof obj.product === "string") return obj.product;
    if (obj.product && typeof obj.product === "object") {
      const product = obj.product as Record<string, unknown>;
      return (product.title as string) || (product.name as string) || null;
    }
  }
  return null;
}

function normalizeFeature(feature: Feature): Feature {
  const props = feature.properties ?? {};

  const dangerLevel = normalizeDangerLevel(props.danger_level);
  const dangerLabel = normalizeDangerLabel(props.danger);

  feature.properties = {
    ...props,
    danger_level: dangerLevel,
    dangerLevel,
    dangerLabel,
    centerName: props.center ?? props.center_id ?? "",
    warning: normalizeWarning(props.warning),
    problems: [],
  };

  return feature;
}

// ── Fetch all zones from all centers ───────────────────────────────

export async function fetchAllZones(): Promise<FeatureCollection> {
  if (cachedCollection && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedCollection;
  }

  const results = await Promise.allSettled(
    AVALANCHE_CENTERS.map((id) => fetchCenterZones(id)),
  );

  const features: Feature[] = [];

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      for (const feature of result.value) {
        features.push(normalizeFeature(feature));
      }
    } else {
      console.warn(
        `[avalanche-zones] Failed to fetch ${AVALANCHE_CENTERS[i]}:`,
        result.reason instanceof Error ? result.reason.message : result.reason,
      );
    }
  });

  const collection: FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  cachedCollection = collection;
  cacheTimestamp = Date.now();

  return collection;
}

// ── Point-in-polygon zone lookup ───────────────────────────────────

export async function findZoneByPoint(
  lat: number,
  lng: number,
): Promise<AvalancheZoneFeature | null> {
  const candidateCenters = findCentersForPoint(lng, lat);

  if (candidateCenters.length === 0) {
    console.warn(
      `[avalanche-zones] No center region contains point (${lat}, ${lng})`,
    );
    return null;
  }

  console.log(
    `[avalanche-zones] Point (${lat}, ${lng}) matched ${candidateCenters.length} center(s): ${candidateCenters.join(", ")}`,
  );

  const results = await Promise.allSettled(
    candidateCenters.map((id) => fetchCenterZones(id)),
  );

  const pt = point([lng, lat]);

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status !== "fulfilled") {
      console.warn(
        `[avalanche-zones] Failed to fetch ${candidateCenters[i]}:`,
        result.reason instanceof Error ? result.reason.message : result.reason,
      );
      continue;
    }

    for (const feature of result.value) {
      const normalized = normalizeFeature(feature);
      if (!normalized.geometry) continue;

      const geomType = normalized.geometry.type;
      if (geomType !== "Polygon" && geomType !== "MultiPolygon") continue;

      try {
        if (
          booleanPointInPolygon(
            pt,
            normalized as Feature<Polygon | MultiPolygon>,
          )
        ) {
          return normalized as AvalancheZoneFeature;
        }
      } catch {
        // skip invalid geometries
      }
    }
  }

  return null;
}

// ── Cache management ───────────────────────────────────────────────

export function clearZoneCache(): void {
  cachedCollection = null;
  cacheTimestamp = 0;
}
