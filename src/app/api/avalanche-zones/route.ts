import { NextRequest, NextResponse } from "next/server";
import {
  AVALANCHE_ZONES,
  buildZoneGeoJSON,
  type AvalancheZoneDef,
} from "@/lib/data-sources/avalanche-zones";

interface ZoneDanger {
  dangerLevel: number;
  dangerLabel: string;
  problems: { name: string; likelihood: string }[];
}

const DANGER_LABELS: Record<number, string> = {
  0: "No Rating",
  1: "Low",
  2: "Moderate",
  3: "Considerable",
  4: "High",
  5: "Extreme",
};

const NO_RATING: ZoneDanger = {
  dangerLevel: 0,
  dangerLabel: "No Rating",
  problems: [],
};

interface CenterCache {
  dangers: Map<string, ZoneDanger>;
  fetchedAt: number;
}

const centerCache = new Map<string, CenterCache>();
const CACHE_TTL_MS = 30 * 60 * 1000;

function clampDanger(raw: unknown): number {
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(5, Math.round(n)));
}

async function fetchDangerForCenter(centerId: string): Promise<Map<string, ZoneDanger>> {
  const cached = centerCache.get(centerId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.dangers;
  }

  const dangers = new Map<string, ZoneDanger>();

  try {
    const url = `https://api.avalanche.org/v2/public/products?avalanche_center_id=${centerId}&page=1&per_page=50`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "(backcountry-app, contact@example.com)",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) throw new Error(`${res.status}`);
    const products = await res.json();

    if (!Array.isArray(products)) throw new Error("unexpected response shape");

    const seen = new Set<string>();
    for (const product of products) {
      const zones = product.forecast_zone ?? [];
      const zoneId: string = zones[0]?.zone_id ?? "";
      if (!zoneId || seen.has(zoneId)) continue;
      seen.add(zoneId);

      const level = clampDanger(product.danger_rating ?? 0);
      const label = product.danger_level_text
        ? String(product.danger_level_text).charAt(0).toUpperCase() +
          String(product.danger_level_text).slice(1)
        : DANGER_LABELS[level] ?? "No Rating";

      const rawProblems = product.forecast_avalanche_problems ?? [];
      const problems: { name: string; likelihood: string }[] = [];
      if (Array.isArray(rawProblems)) {
        for (const p of rawProblems) {
          problems.push({
            name: p.name ?? p.type ?? "Unknown",
            likelihood: p.likelihood ?? "",
          });
        }
      }

      dangers.set(zoneId, { dangerLevel: level, dangerLabel: label, problems });
    }

    centerCache.set(centerId, { dangers, fetchedAt: Date.now() });
  } catch (err) {
    console.warn(`Avalanche danger fetch failed for ${centerId}:`, err);
  }

  return dangers;
}

function matchZoneDanger(
  zone: AvalancheZoneDef,
  centerDangers: Map<string, ZoneDanger>,
): ZoneDanger {
  const direct = centerDangers.get(zone.zoneId);
  if (direct) return direct;

  const normalized = zone.zoneId.replace(/-/g, "");
  for (const [key, val] of centerDangers) {
    if (key.replace(/-/g, "") === normalized) return val;
  }

  return NO_RATING;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const west = parseFloat(searchParams.get("west") ?? "-180");
  const south = parseFloat(searchParams.get("south") ?? "-90");
  const east = parseFloat(searchParams.get("east") ?? "180");
  const north = parseFloat(searchParams.get("north") ?? "90");

  const geojson = buildZoneGeoJSON(AVALANCHE_ZONES, { west, south, east, north });

  const centerIds = [...new Set(geojson.features.map((f) => f.properties!.center_id as string))];
  const centerResults = await Promise.allSettled(
    centerIds.map((id) => fetchDangerForCenter(id)),
  );

  const centerDangers = new Map<string, Map<string, ZoneDanger>>();
  centerIds.forEach((id, i) => {
    const result = centerResults[i];
    centerDangers.set(
      id,
      result.status === "fulfilled" ? result.value : new Map(),
    );
  });

  for (const feature of geojson.features) {
    const props = feature.properties!;
    const dangers = centerDangers.get(props.center_id as string) ?? new Map();
    const zone = AVALANCHE_ZONES.find(
      (z) => z.centerId === props.center_id && z.zoneId === props.zone_id,
    );
    const danger = zone ? matchZoneDanger(zone, dangers) : NO_RATING;

    feature.properties = {
      ...props,
      dangerLevel: danger.dangerLevel,
      dangerLabel: danger.dangerLabel,
      problems: danger.problems,
    };
  }

  return NextResponse.json(geojson, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=600",
    },
  });
}
