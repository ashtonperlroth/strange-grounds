import { createHash } from "crypto";
import { inngest } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchNWS } from "@/lib/data-sources/nws";
import { fetchSnotel } from "@/lib/data-sources/snotel";
import { fetchAvalanche } from "@/lib/data-sources/avalanche";
import { fetchUsgs } from "@/lib/data-sources/usgs";
import { fetchFires } from "@/lib/data-sources/fires";
import { computeDaylight } from "@/lib/data-sources/daylight";
import {
  generateBriefing as synthesize,
} from "@/lib/synthesis/briefing";
import {
  buildConditionCards,
  computeReadiness,
} from "@/lib/synthesis/conditions";
import type { ConditionsBundle } from "@/lib/synthesis/conditions";
import type { NWSForecastData } from "@/lib/data-sources/nws";
import type { LineString } from "geojson";

const DEFAULT_TIMEOUT_MS = 8_000;
const AVALANCHE_TIMEOUT_MS = 10_000;

async function safeAdapterCall<T>(
  fn: () => Promise<T>,
  label: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T | null> {
  try {
    return await Promise.race([
      fn(),
      new Promise<null>((resolve) =>
        setTimeout(() => {
          console.warn(`[route-briefing] [${label}] timed out after ${timeoutMs}ms`);
          resolve(null);
        }, timeoutMs),
      ),
    ]);
  } catch (err) {
    console.error(`[route-briefing] [${label}] failed:`, err);
    return null;
  }
}

function stripHourlyData(nws: NWSForecastData | null): NWSForecastData | null {
  if (!nws) return null;
  return { ...nws, hourly: [] };
}

function parseGeometry(raw: unknown): LineString {
  if (!raw) return { type: "LineString", coordinates: [] };
  if (typeof raw === "object" && raw !== null) {
    const geo = raw as Record<string, unknown>;
    if (geo.type === "LineString" && Array.isArray(geo.coordinates)) {
      return { type: "LineString", coordinates: geo.coordinates };
    }
  }
  if (typeof raw === "string") {
    const match = raw.match(/LINESTRING\(\s*(.+)\s*\)/);
    if (match) {
      const coords = match[1].split(",").map((pair) => {
        const [lng, lat] = pair.trim().split(/\s+/).map(Number);
        return [lng, lat];
      });
      return { type: "LineString", coordinates: coords };
    }
  }
  return { type: "LineString", coordinates: [] };
}

function getRouteSamplePoints(geometry: LineString): {
  start: { lat: number; lng: number };
  mid: { lat: number; lng: number };
  end: { lat: number; lng: number };
} {
  const coords = geometry.coordinates;
  if (coords.length === 0) {
    return {
      start: { lat: 0, lng: 0 },
      mid: { lat: 0, lng: 0 },
      end: { lat: 0, lng: 0 },
    };
  }

  const startCoord = coords[0];
  const midCoord = coords[Math.floor(coords.length / 2)];
  const endCoord = coords[coords.length - 1];

  return {
    start: { lat: startCoord[1], lng: startCoord[0] },
    mid: { lat: midCoord[1], lng: midCoord[0] },
    end: { lat: endCoord[1], lng: endCoord[0] },
  };
}

function hashConditions(conditions: ConditionsBundle): string {
  const hash = createHash("sha256");
  hash.update(JSON.stringify(conditions));
  return hash.digest("hex").slice(0, 16);
}

export const refreshRouteBriefings = inngest.createFunction(
  {
    id: "refresh-route-briefings",
    concurrency: { limit: 1 },
  },
  { cron: "0 13 * * *" }, // 6 AM Mountain (UTC-7)
  async ({ step }) => {
    const supabase = createAdminClient();

    const routes = await step.run("load-published-routes", async () => {
      const { data, error } = await supabase
        .from("popular_routes")
        .select("*")
        .eq("published", true);

      if (error) throw new Error(`Failed to load routes: ${error.message}`);
      return (data ?? []).map((row) => ({
        id: row.id as string,
        slug: row.slug as string,
        name: row.name as string,
        activity: row.activity as string,
        region: row.region as string,
        state: row.state as string,
        geometry: parseGeometry(row.geometry),
      }));
    });

    console.log(
      `[route-briefing] Processing ${routes.length} published routes`,
    );

    const existingBriefings = await step.run("load-existing-briefings", async () => {
      const routeIds = routes.map((r) => r.id);
      const { data } = await supabase
        .from("route_briefings")
        .select("popular_route_id, conditions_hash, generated_at")
        .in("popular_route_id", routeIds);

      const map: Record<string, { conditionsHash: string | null; generatedAt: string }> = {};
      for (const b of data ?? []) {
        map[b.popular_route_id as string] = {
          conditionsHash: b.conditions_hash as string | null,
          generatedAt: b.generated_at as string,
        };
      }
      return map;
    });

    let generated = 0;
    let skipped = 0;

    for (const route of routes) {
      await step.run(`refresh-${route.slug}`, async () => {
        const geometry = route.geometry;
        if (geometry.coordinates.length < 2) {
          console.warn(`[route-briefing] ${route.name}: insufficient geometry, skipping`);
          skipped++;
          return;
        }

        const points = getRouteSamplePoints(geometry);
        const primaryPoint = points.mid;
        const now = new Date();
        now.setUTCHours(12, 0, 0, 0);

        const [nws, snotel, avalanche, usgs, fires, daylight] =
          await Promise.all([
            safeAdapterCall(
              () => fetchNWS({ lat: primaryPoint.lat, lng: primaryPoint.lng }),
              `NWS:${route.slug}`,
            ),
            safeAdapterCall(
              () => fetchSnotel({ lat: primaryPoint.lat, lng: primaryPoint.lng }),
              `SNOTEL:${route.slug}`,
            ),
            safeAdapterCall(
              () => fetchAvalanche({ lat: primaryPoint.lat, lng: primaryPoint.lng }),
              `Avalanche:${route.slug}`,
              AVALANCHE_TIMEOUT_MS,
            ),
            safeAdapterCall(
              () => fetchUsgs({ lat: primaryPoint.lat, lng: primaryPoint.lng }),
              `USGS:${route.slug}`,
            ),
            safeAdapterCall(
              () => fetchFires({ lat: primaryPoint.lat, lng: primaryPoint.lng }),
              `Fires:${route.slug}`,
            ),
            safeAdapterCall(
              () =>
                Promise.resolve(
                  computeDaylight({
                    lat: primaryPoint.lat,
                    lng: primaryPoint.lng,
                    date: now,
                  }),
                ),
              `Daylight:${route.slug}`,
            ),
          ]);

        const conditions: ConditionsBundle = {
          weather: nws,
          snowpack: snotel,
          avalanche: avalanche ?? null,
          streamFlow: usgs,
          fires,
          daylight,
        };

        const conditionsHash = hashConditions(conditions);

        const existing = existingBriefings[route.id];
        if (
          existing &&
          existing.conditionsHash === conditionsHash
        ) {
          const briefingAge =
            Date.now() - new Date(existing.generatedAt).getTime();
          if (briefingAge < 24 * 60 * 60 * 1000) {
            console.log(
              `[route-briefing] ${route.name}: conditions unchanged & <24h old, skipping`,
            );
            skipped++;
            return;
          }
        }

        const unavailableSources: string[] = [];
        if (!nws) unavailableSources.push("NWS");
        if (!snotel) unavailableSources.push("SNOTEL");
        if (!avalanche) unavailableSources.push("Avalanche");
        if (!usgs) unavailableSources.push("USGS");
        if (!fires) unavailableSources.push("Fires");
        if (!daylight) unavailableSources.push("Daylight");

        const synthesisConditions: ConditionsBundle = {
          ...conditions,
          weather: stripHourlyData(nws),
        };

        const activityMap: Record<string, "Backpacking" | "Ski Touring" | "Mountaineering" | "Trail Running"> = {
          backpacking: "Backpacking",
          ski_touring: "Ski Touring",
          mountaineering: "Mountaineering",
          trail_running: "Trail Running",
        };

        const briefingResult = await synthesize(
          synthesisConditions,
          activityMap[route.activity] ?? "Backpacking",
          { lat: primaryPoint.lat, lng: primaryPoint.lng, name: route.name },
          {
            start: now.toISOString(),
            end: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          },
          unavailableSources,
        );

        const conditionCards = buildConditionCards(conditions, unavailableSources);
        const readiness = briefingResult.readiness ?? computeReadiness(conditions);

        const readinessToFourLevel: Record<string, string> = {
          green: "green",
          yellow: "yellow",
          red: "red",
        };

        const briefingData = {
          bottomLine: briefingResult.bottomLine,
          narrative: briefingResult.narrative,
          readinessRationale: briefingResult.readinessRationale,
          conditionCards,
          conditions,
          unavailableSources,
        };

        const { error: upsertError } = await supabase
          .from("route_briefings")
          .upsert(
            {
              popular_route_id: route.id,
              briefing_data: briefingData,
              readiness: readinessToFourLevel[readiness] ?? "yellow",
              generated_at: new Date().toISOString(),
              conditions_hash: conditionsHash,
            },
            { onConflict: "popular_route_id" },
          );

        if (upsertError) {
          console.error(
            `[route-briefing] ${route.name}: upsert failed: ${upsertError.message}`,
          );
          throw new Error(`Failed to upsert briefing for ${route.name}`);
        }

        console.log(
          `[route-briefing] ${route.name}: briefing generated (readiness: ${readiness})`,
        );
        generated++;
      });
    }

    console.log(
      `[route-briefing] Done: ${generated} generated, ${skipped} skipped out of ${routes.length} routes`,
    );
    return { generated, skipped, total: routes.length };
  },
);
