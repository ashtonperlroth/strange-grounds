import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const USGS_IV_BASE = "https://waterservices.usgs.gov/nwis/iv/";
const PARAM_DISCHARGE = "00060";

interface StationRow {
  id: string;
  station_id: string;
  name: string;
  lng: number;
  lat: number;
  elevation_m: number | null;
}

interface FlowReading {
  dischargeCfs: number | null;
  timestamp: string | null;
}

function parseUsgsFloat(value: string): number | null {
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) return null;
  return num;
}

async function fetchStationsInBbox(
  west: number,
  south: number,
  east: number,
  north: number,
  limit: number,
): Promise<StationRow[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("find_usgs_stations_in_bbox", {
    p_west: west,
    p_south: south,
    p_east: east,
    p_north: north,
    p_limit: limit,
  });

  if (error) {
    console.warn(
      "[stream-gauges] RPC find_usgs_stations_in_bbox failed, falling back to plain query:",
      error.message,
    );
    const { data: fallback, error: fbErr } = await supabase
      .from("stations")
      .select("id, station_id, name, elevation_m")
      .eq("source", "usgs")
      .limit(limit);

    if (fbErr || !fallback) return [];

    return fallback.map((s) => ({
      id: s.id,
      station_id: s.station_id,
      name: s.name,
      lng: 0,
      lat: 0,
      elevation_m: s.elevation_m,
    }));
  }

  return (data ?? []) as StationRow[];
}

async function fetchCurrentFlow(
  siteIds: string[],
): Promise<Map<string, FlowReading>> {
  const result = new Map<string, FlowReading>();
  if (siteIds.length === 0) return result;

  const url = new URL(USGS_IV_BASE);
  url.searchParams.set("sites", siteIds.join(","));
  url.searchParams.set("parameterCd", PARAM_DISCHARGE);
  url.searchParams.set("format", "json");

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return result;

    const json = await response.json();
    const timeSeries = json?.value?.timeSeries ?? [];

    for (const ts of timeSeries) {
      const siteId = ts.sourceInfo?.siteCode?.[0]?.value;
      const latestValues = ts.values?.[0]?.value ?? [];
      const latest = latestValues[latestValues.length - 1];
      if (!siteId || !latest) continue;

      result.set(siteId, {
        dischargeCfs: parseUsgsFloat(latest.value),
        timestamp: latest.dateTime,
      });
    }
  } catch (err) {
    console.error(
      "[stream-gauges] USGS IV fetch error:",
      err instanceof Error ? err.message : err,
    );
  }

  return result;
}

async function fetchMedianFlow(
  siteIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (siteIds.length === 0) return result;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const dvUrl = new URL("https://waterservices.usgs.gov/nwis/dv/");
  dvUrl.searchParams.set("sites", siteIds.join(","));
  dvUrl.searchParams.set("parameterCd", PARAM_DISCHARGE);
  dvUrl.searchParams.set(
    "startDT",
    startDate.toISOString().split("T")[0],
  );
  dvUrl.searchParams.set("endDT", endDate.toISOString().split("T")[0]);
  dvUrl.searchParams.set("format", "json");

  try {
    const response = await fetch(dvUrl.toString(), {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return result;

    const json = await response.json();
    const timeSeries = json?.value?.timeSeries ?? [];

    for (const ts of timeSeries) {
      const siteId = ts.sourceInfo?.siteCode?.[0]?.value;
      if (!siteId) continue;

      const values = (ts.values?.[0]?.value ?? [])
        .map((v: { value: string }) => parseUsgsFloat(v.value))
        .filter((v: number | null): v is number => v !== null);

      if (values.length < 3) continue;

      const sorted = [...values].sort((a: number, b: number) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      if (median > 0) result.set(siteId, median);
    }
  } catch (err) {
    console.error(
      "[stream-gauges] USGS DV fetch error:",
      err instanceof Error ? err.message : err,
    );
  }

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const west = parseFloat(searchParams.get("west") ?? "");
    const south = parseFloat(searchParams.get("south") ?? "");
    const east = parseFloat(searchParams.get("east") ?? "");
    const north = parseFloat(searchParams.get("north") ?? "");

    if ([west, south, east, north].some(isNaN)) {
      return NextResponse.json(
        { error: "Missing or invalid bbox params (west, south, east, north)" },
        { status: 400 },
      );
    }

    const stations = await fetchStationsInBbox(west, south, east, north, 50);

    if (stations.length === 0) {
      return NextResponse.json(
        { type: "FeatureCollection", features: [] },
        { headers: { "Cache-Control": "public, max-age=300" } },
      );
    }

    const siteIds = stations.map((s) => s.station_id);
    const [flowMap, medianMap] = await Promise.all([
      fetchCurrentFlow(siteIds),
      fetchMedianFlow(siteIds),
    ]);

    const features = stations.map((station) => {
      const flow = flowMap.get(station.station_id);
      const median = medianMap.get(station.station_id);

      const dischargeCfs = flow?.dischargeCfs ?? null;
      let percentOfMedian: number | null = null;
      let flowStatus: "normal" | "elevated" | "high" = "normal";

      if (dischargeCfs !== null && median) {
        percentOfMedian = Math.round((dischargeCfs / median) * 100);
        if (percentOfMedian > 180) flowStatus = "high";
        else if (percentOfMedian > 120) flowStatus = "elevated";
      }

      return {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [station.lng, station.lat],
        },
        properties: {
          id: station.id,
          siteId: station.station_id,
          name: station.name,
          dischargeCfs,
          percentOfMedian,
          flowStatus,
          timestamp: flow?.timestamp ?? null,
          elevationM: station.elevation_m,
        },
      };
    });

    const geojson = { type: "FeatureCollection", features };

    return NextResponse.json(geojson, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=600" },
    });
  } catch (err) {
    console.error("[stream-gauges] Route error:", err);
    return NextResponse.json(
      { type: "FeatureCollection", features: [] },
      { status: 500 },
    );
  }
}
