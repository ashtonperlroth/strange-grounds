import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface ForecastCache {
  dangerLevel: number;
  dangerLabel: string;
  problems: { name: string; likelihood: string }[];
  fetchedAt: number;
}

const DANGER_LABELS: Record<number, string> = {
  0: "No Rating",
  1: "Low",
  2: "Moderate",
  3: "Considerable",
  4: "High",
  5: "Extreme",
};

const forecastCache = new Map<string, ForecastCache>();
const FORECAST_TTL_MS = 30 * 60 * 1000; // 30 minutes

function clampDanger(raw: unknown): number {
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(5, Math.round(n)));
}

async function fetchDangerForZone(
  centerId: string,
  zoneId: string,
  apiUrl: string | null,
): Promise<ForecastCache> {
  const cacheKey = `${centerId}:${zoneId}`;
  const cached = forecastCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < FORECAST_TTL_MS) {
    return cached;
  }

  if (!apiUrl) {
    return { dangerLevel: 0, dangerLabel: "No Rating", problems: [], fetchedAt: Date.now() };
  }

  try {
    const res = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "(backcountry-app, contact@example.com)",
      },
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) throw new Error(`${res.status}`);
    const json = await res.json();

    const forecast = Array.isArray(json) ? json[0] : json;
    const rawDanger = forecast?.danger ?? forecast?.forecast?.danger ?? [];

    let maxDanger = 0;
    if (Array.isArray(rawDanger)) {
      for (const d of rawDanger) {
        const level = clampDanger(d.danger ?? d.level ?? d.danger_level ?? 0);
        if (level > maxDanger) maxDanger = level;
      }
    }

    const rawProblems =
      forecast?.avalanche_problems ?? forecast?.forecast?.avalanche_problems ?? [];
    const problems: { name: string; likelihood: string }[] = [];
    if (Array.isArray(rawProblems)) {
      for (const p of rawProblems) {
        problems.push({
          name: p.name ?? p.type ?? "Unknown",
          likelihood: p.likelihood ?? p.likelihood_label ?? "",
        });
      }
    }

    const entry: ForecastCache = {
      dangerLevel: maxDanger,
      dangerLabel: DANGER_LABELS[maxDanger] ?? "No Rating",
      problems,
      fetchedAt: Date.now(),
    };
    forecastCache.set(cacheKey, entry);
    return entry;
  } catch {
    const fallback: ForecastCache = {
      dangerLevel: 0,
      dangerLabel: "No Rating",
      problems: [],
      fetchedAt: Date.now(),
    };
    forecastCache.set(cacheKey, fallback);
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const west = parseFloat(searchParams.get("west") ?? "-180");
  const south = parseFloat(searchParams.get("south") ?? "-90");
  const east = parseFloat(searchParams.get("east") ?? "180");
  const north = parseFloat(searchParams.get("north") ?? "90");

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("get_avalanche_zones_geojson", {
      p_west: west,
      p_south: south,
      p_east: east,
      p_north: north,
    });

    if (error) throw error;

    const geojson = data as {
      type: string;
      features: {
        type: string;
        geometry: Record<string, unknown>;
        properties: {
          id: string;
          center_id: string;
          zone_id: string;
          name: string;
          api_url: string | null;
          metadata: Record<string, unknown>;
        };
      }[];
    };

    const dangerResults = await Promise.allSettled(
      geojson.features.map((f) =>
        fetchDangerForZone(
          f.properties.center_id,
          f.properties.zone_id,
          f.properties.api_url,
        ),
      ),
    );

    for (let i = 0; i < geojson.features.length; i++) {
      const result = dangerResults[i];
      const forecast =
        result.status === "fulfilled"
          ? result.value
          : { dangerLevel: 0, dangerLabel: "No Rating", problems: [] };

      geojson.features[i].properties = {
        ...geojson.features[i].properties,
        ...forecast,
      } as typeof geojson.features[number]["properties"];
    }

    return NextResponse.json(geojson, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=600",
      },
    });
  } catch (err) {
    console.error("Avalanche zones fetch failed:", err);
    return NextResponse.json(
      { type: "FeatureCollection", features: [] },
      { status: 200 },
    );
  }
}
