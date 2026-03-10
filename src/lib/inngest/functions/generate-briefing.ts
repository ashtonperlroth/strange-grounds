import { inngest } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchNWS } from "@/lib/data-sources/nws";
import { fetchSnotel } from "@/lib/data-sources/snotel";
import { fetchAvalanche } from "@/lib/data-sources/avalanche";
import { fetchUsgs } from "@/lib/data-sources/usgs";
import { fetchFires } from "@/lib/data-sources/fires";
import { computeDaylight } from "@/lib/data-sources/daylight";
import { generateBriefing as synthesize } from "@/lib/synthesis/briefing";
import { buildConditionCards, computeReadiness } from "@/lib/synthesis/conditions";
import type { ConditionsBundle } from "@/lib/synthesis/conditions";
import type { NWSForecastData } from "@/lib/data-sources/nws";
import type { Activity } from "@/stores/planning-store";
import { loadSegments } from "@/lib/routes/save-segments";
import {
  fetchSegmentConditions,
  buildRouteAnalysis,
  slimSegmentConditions,
} from "@/lib/routes/segment-conditions";
import type { RouteAnalysis } from "@/lib/types/briefing";

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
          console.warn(`[${label}] timed out after ${timeoutMs}ms`);
          resolve(null);
        }, timeoutMs),
      ),
    ]);
  } catch (err) {
    console.error(`[${label}] failed:`, err);
    return null;
  }
}

function stripHourlyData(nws: NWSForecastData | null): NWSForecastData | null {
  if (!nws) return null;
  return { ...nws, hourly: [] };
}

export const generateBriefing = inngest.createFunction(
  { id: "generate-briefing" },
  { event: "briefing/requested" },
  async ({ event, step }) => {
    const {
      briefingId,
      tripId,
      lat,
      lng,
      routeGeometry,
      routeBbox,
      startDate,
      endDate,
      activity,
    } =
      event.data;
    const pipelineStart = Date.now();
    console.log(`[briefing] pipeline started for briefing=${briefingId}`);

    const tripDate = new Date(startDate);
    tripDate.setUTCHours(12, 0, 0, 0);

    const hasRoute = !!routeGeometry;

    // Step 1: Fetch point-based conditions (used for all briefings)
    const fetchResults = await step.run("fetch-all-data", async () => {
      const stepStart = Date.now();

      const [nws, snotel, avalanche, usgs, fires, daylight] =
        await Promise.all([
          safeAdapterCall(() => fetchNWS({ lat, lng }), "NWS"),
          safeAdapterCall(() => fetchSnotel({ lat, lng }), "SNOTEL"),
          safeAdapterCall(
            () => fetchAvalanche({ lat, lng }),
            "Avalanche",
            AVALANCHE_TIMEOUT_MS,
          ),
          safeAdapterCall(() => fetchUsgs({ lat, lng }), "USGS"),
          safeAdapterCall(() => fetchFires({ lat, lng }), "Fires"),
          safeAdapterCall(
            () => Promise.resolve(computeDaylight({ lat, lng, date: tripDate })),
            "Daylight",
          ),
        ]);

      const unavailableSources: string[] = [];
      if (!nws) unavailableSources.push("NWS");
      if (!snotel) unavailableSources.push("SNOTEL");
      if (!avalanche) unavailableSources.push("Avalanche");
      if (!usgs) unavailableSources.push("USGS");
      if (!fires) unavailableSources.push("Fires");
      if (!daylight) unavailableSources.push("Daylight");

      if (unavailableSources.length > 0) {
        console.warn(
          `[briefing] Unavailable sources: ${unavailableSources.join(", ")}`,
        );
      }

      const elapsed = Date.now() - stepStart;
      console.log(
        `[briefing] fetch-all-data completed in ${elapsed}ms (unavailable: ${unavailableSources.length})`,
      );

      return {
        nws,
        snotel,
        avalanche,
        usgs,
        fires,
        daylight,
        unavailableSources,
      };
    });

    const unavailableSources = fetchResults.unavailableSources;

    const fullConditions: ConditionsBundle = {
      weather: fetchResults.nws,
      snowpack: fetchResults.snotel,
      avalanche: fetchResults.avalanche ?? null,
      streamFlow: fetchResults.usgs,
      fires: fetchResults.fires,
      daylight: fetchResults.daylight,
    };

    const synthesisConditions: ConditionsBundle = {
      ...fullConditions,
      weather: stripHourlyData(fetchResults.nws),
    };

    const conditionCards = buildConditionCards(fullConditions, unavailableSources);
    const readiness = computeReadiness(fullConditions);

    // Step 2: If route exists, fetch per-segment conditions and compute hazards
    let routeAnalysis: RouteAnalysis | null = null;

    if (hasRoute) {
      routeAnalysis = await step.run(
        "fetch-route-conditions",
        async () => {
          const stepStart = Date.now();
          const supabase = createAdminClient();

          // Find the route for this trip
          const { data: routes } = await supabase
            .from("routes")
            .select("id")
            .eq("trip_id", tripId)
            .order("created_at", { ascending: false })
            .limit(1);

          if (!routes || routes.length === 0) {
            console.warn(
              `[briefing] No route found for trip=${tripId}, skipping segment conditions`,
            );
            return null;
          }

          const routeId = routes[0].id;

          // Load segments
          const segments = await loadSegments(supabase, routeId);
          if (segments.length === 0) {
            console.warn(
              `[briefing] No segments found for route=${routeId}, skipping segment conditions`,
            );
            return null;
          }

          console.log(
            `[briefing] Found ${segments.length} segments for route=${routeId}`,
          );

          // Fetch conditions per segment with deduplication
          const segmentConditions = await fetchSegmentConditions(
            segments,
            tripDate,
          );

          // Build route analysis
          const analysis = buildRouteAnalysis(segmentConditions);

          // Save hazard levels back to route_segments table
          for (const sc of segmentConditions) {
            await supabase
              .from("route_segments")
              .update({
                hazard_level: sc.hazardLevel,
                hazard_notes: sc.hazardFactors.join(", ") || null,
              })
              .eq("id", sc.segmentId);
          }

          // Slim down conditions for serialization
          const slimAnalysis: RouteAnalysis = {
            ...analysis,
            segments: slimSegmentConditions(analysis.segments),
          };

          const elapsed = Date.now() - stepStart;
          console.log(
            `[briefing] fetch-route-conditions completed in ${elapsed}ms (${segments.length} segments, overall hazard: ${analysis.overallHazardLevel})`,
          );

          return slimAnalysis;
        },
      );
    }

    // Step 3: Synthesize narrative
    const briefingResult = await step.run("synthesize", async () => {
      const stepStart = Date.now();
      const result = await synthesize(
        synthesisConditions,
        activity as Activity,
        { lat, lng, name: null },
        { start: startDate, end: endDate },
        unavailableSources,
      );
      const elapsed = Date.now() - stepStart;
      console.log(`[briefing] synthesize completed in ${elapsed}ms (narrative length: ${result.narrative.length})`);
      return result;
    });

    // Step 4: Save briefing to database
    await step.run("save-briefing", async () => {
      const stepStart = Date.now();
      const supabase = createAdminClient();

      const { data, error } = await supabase
        .from("briefings")
        .update({
          narrative: briefingResult.narrative,
          bottom_line: briefingResult.bottomLine,
          readiness_rationale: briefingResult.readinessRationale,
          conditions: {
            ...fullConditions,
            conditionCards,
            unavailableSources,
            ...(routeAnalysis && { routeAnalysis }),
          },
          raw_data: {
            ...fullConditions,
            unavailableSources,
            route: routeGeometry
              ? {
                  geometry: routeGeometry,
                  bbox: routeBbox ?? null,
                  center: { lat, lng },
                }
              : null,
            ...(routeAnalysis && {
              routeAnalysis: {
                overallHazardLevel: routeAnalysis.overallHazardLevel,
                highestHazardSegment: routeAnalysis.highestHazardSegment,
                totalSegments: routeAnalysis.totalSegments,
                hazardDistribution: routeAnalysis.hazardDistribution,
              },
            }),
          },
          readiness: briefingResult.readiness ?? readiness,
        })
        .eq("id", briefingId)
        .select("id, narrative")
        .single();

      if (error) {
        console.error(`[briefing] save-briefing failed:`, error);
        throw new Error(`Failed to save briefing: ${error.message}`);
      }

      if (!data) {
        console.error(`[briefing] save-briefing matched no rows for id=${briefingId}`);
        throw new Error(`Briefing row not found for id=${briefingId}`);
      }

      const elapsed = Date.now() - stepStart;
      console.log(`[briefing] save-briefing completed in ${elapsed}ms (id: ${data.id})`);
      return { savedId: data.id, hasNarrative: !!data.narrative };
    });

    const totalElapsed = Date.now() - pipelineStart;
    console.log(
      `[briefing] pipeline completed for briefing=${briefingId} in ${totalElapsed}ms` +
        (routeAnalysis
          ? ` (route: ${routeAnalysis.totalSegments} segments, hazard: ${routeAnalysis.overallHazardLevel})`
          : " (point-based)"),
    );
    return { briefingId, status: "complete" };
  },
);
