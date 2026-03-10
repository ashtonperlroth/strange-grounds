import { inngest } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchNWS } from "@/lib/data-sources/nws";
import { fetchSnotel } from "@/lib/data-sources/snotel";
import { fetchAvalanche } from "@/lib/data-sources/avalanche";
import { fetchUsgs } from "@/lib/data-sources/usgs";
import { fetchFires } from "@/lib/data-sources/fires";
import { computeDaylight } from "@/lib/data-sources/daylight";
import {
  fetchSentinel2,
  bboxFromCenter,
} from "@/lib/data-sources/sentinel2";
import type { Sentinel2Data } from "@/lib/data-sources/sentinel2";
import {
  generateBriefing as synthesize,
  generateRouteAwareBriefing as synthesizeRoute,
} from "@/lib/synthesis/briefing";
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
import type { RouteSegment } from "@/lib/types/route";

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

async function updatePipelineStatus(
  briefingId: string,
  status: string,
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase
      .from("briefings")
      .update({ pipeline_status: status })
      .eq("id", briefingId);
  } catch {
    // Non-critical — don't let status updates break the pipeline
  }
}

interface SatelliteResult {
  available: boolean;
  date: string | null;
  source: "sentinel-2";
  cloudCover: number | null;
  sceneId: string | null;
}

const EMPTY_SATELLITE: SatelliteResult = {
  available: false,
  date: null,
  source: "sentinel-2",
  cloudCover: null,
  sceneId: null,
};

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
    } = event.data;
    const pipelineStart = Date.now();
    const stepTimings: Record<string, number> = {};
    console.log(`[briefing] pipeline started for briefing=${briefingId}`);

    const tripDate = new Date(startDate);
    tripDate.setUTCHours(12, 0, 0, 0);

    const hasRoute = !!routeGeometry;

    await updatePipelineStatus(briefingId, "Fetching conditions data…");

    // ── Step 1: Fetch point-based conditions ──────────────────────────
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
        _elapsedMs: elapsed,
      };
    });

    stepTimings["fetch-all-data"] = fetchResults._elapsedMs;
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

    // ── Steps 2 + 2c: Route conditions & satellite in parallel ────────
    // Satellite is non-blocking: if it takes too long, synthesis proceeds
    // without it and we backfill afterwards.

    let routeAnalysis: RouteAnalysis | null = null;
    let routeSegments: RouteSegment[] = [];
    let routeName: string | null = null;
    let routeTotalDistanceM = 0;
    let routeElevationGainM = 0;
    let satelliteData: SatelliteResult = EMPTY_SATELLITE;

    if (hasRoute) {
      await updatePipelineStatus(
        briefingId,
        "Analyzing route segments…",
      );

      // Run route conditions + satellite + route meta in parallel
      const [routeResult, satResult] = await Promise.all([
        step.run("fetch-route-conditions", async () => {
          const stepStart = Date.now();
          const supabase = createAdminClient();

          const { data: routes } = await supabase
            .from("routes")
            .select("id, name, total_distance_m, elevation_gain_m")
            .eq("trip_id", tripId)
            .order("created_at", { ascending: false })
            .limit(1);

          if (!routes || routes.length === 0) {
            console.warn(
              `[briefing] No route found for trip=${tripId}, skipping segment conditions`,
            );
            return { analysis: null, meta: null, _elapsedMs: Date.now() - stepStart };
          }

          const routeRow = routes[0];
          const routeId = routeRow.id;

          const segments = await loadSegments(supabase, routeId);
          if (segments.length === 0) {
            console.warn(
              `[briefing] No segments found for route=${routeId}, skipping segment conditions`,
            );
            return { analysis: null, meta: null, _elapsedMs: Date.now() - stepStart };
          }

          console.log(
            `[briefing] Found ${segments.length} segments for route=${routeId}`,
          );

          await updatePipelineStatus(
            briefingId,
            `Fetching conditions for ${segments.length} segments…`,
          );

          const segmentConditions = await fetchSegmentConditions(
            segments,
            tripDate,
          );

          const analysis = buildRouteAnalysis(segmentConditions);

          // Save hazard levels back to route_segments — batch update
          const updates = segmentConditions.map((sc) =>
            supabase
              .from("route_segments")
              .update({
                hazard_level: sc.hazardLevel,
                hazard_notes: sc.hazardFactors.join(", ") || null,
              })
              .eq("id", sc.segmentId),
          );
          await Promise.all(updates);

          const slimAnalysis: RouteAnalysis = {
            ...analysis,
            segments: slimSegmentConditions(analysis.segments),
          };

          const elapsed = Date.now() - stepStart;
          console.log(
            `[briefing] fetch-route-conditions completed in ${elapsed}ms (${segments.length} segments, overall hazard: ${analysis.overallHazardLevel})`,
          );

          return {
            analysis: slimAnalysis,
            meta: {
              name: routeRow.name as string | null,
              totalDistanceM: (routeRow.total_distance_m as number) ?? 0,
              elevationGainM: (routeRow.elevation_gain_m as number) ?? 0,
              segments,
            },
            _elapsedMs: elapsed,
          };
        }),

        step.run("fetch-satellite-imagery", async (): Promise<SatelliteResult & { _elapsedMs: number }> => {
          const stepStart = Date.now();
          try {
            const bbox: [number, number, number, number] =
              routeBbox ?? bboxFromCenter(lat, lng);
            const result: Sentinel2Data = await fetchSentinel2({ bbox });

            const elapsed = Date.now() - stepStart;
            console.log(
              `[briefing] fetch-satellite-imagery completed in ${elapsed}ms (available: ${result.available})`,
            );

            return {
              available: result.available,
              date: result.acquisitionDate,
              source: "sentinel-2",
              cloudCover: result.cloudCover,
              sceneId: result.scene?.sceneId ?? null,
              _elapsedMs: elapsed,
            };
          } catch (err) {
            console.warn("[briefing] Satellite imagery fetch failed (non-critical):", err);
            return { ...EMPTY_SATELLITE, _elapsedMs: Date.now() - stepStart };
          }
        }),
      ]);

      if (routeResult.analysis) {
        routeAnalysis = routeResult.analysis;
      }
      if (routeResult.meta) {
        routeSegments = routeResult.meta.segments;
        routeName = routeResult.meta.name;
        routeTotalDistanceM = routeResult.meta.totalDistanceM;
        routeElevationGainM = routeResult.meta.elevationGainM;
      }
      stepTimings["fetch-route-conditions"] = routeResult._elapsedMs;

      const { _elapsedMs: _satElapsed, ...satData } = satResult;
      satelliteData = satData;
      stepTimings["fetch-satellite-imagery"] = _satElapsed;
    } else {
      // Point-based briefing: still fetch satellite, but non-blocking
      const satResult = await step.run(
        "fetch-satellite-imagery",
        async (): Promise<SatelliteResult & { _elapsedMs: number }> => {
          const stepStart = Date.now();
          try {
            const bbox = bboxFromCenter(lat, lng);
            const result: Sentinel2Data = await fetchSentinel2({ bbox });

            const elapsed = Date.now() - stepStart;
            console.log(
              `[briefing] fetch-satellite-imagery completed in ${elapsed}ms (available: ${result.available})`,
            );

            return {
              available: result.available,
              date: result.acquisitionDate,
              source: "sentinel-2",
              cloudCover: result.cloudCover,
              sceneId: result.scene?.sceneId ?? null,
              _elapsedMs: elapsed,
            };
          } catch (err) {
            console.warn("[briefing] Satellite imagery fetch failed (non-critical):", err);
            return { ...EMPTY_SATELLITE, _elapsedMs: Date.now() - stepStart };
          }
        },
      );

      const { _elapsedMs: satElapsed, ...satData } = satResult;
      satelliteData = satData;
      stepTimings["fetch-satellite-imagery"] = satElapsed;
    }

    // ── Step 3: Synthesize narrative ──────────────────────────────────
    await updatePipelineStatus(briefingId, "Generating briefing narrative…");

    const useRouteAware =
      hasRoute &&
      routeAnalysis !== null &&
      routeSegments.length > 0 &&
      routeAnalysis.segments.length > 0;

    const synthesisOutput = await step.run("synthesize", async () => {
      const stepStart = Date.now();

      if (useRouteAware) {
        const routeResult = await synthesizeRoute(
          synthesisConditions,
          activity as Activity,
          { lat, lng, name: null },
          { start: startDate, end: endDate },
          {
            routeName,
            totalDistanceM: routeTotalDistanceM,
            elevationGainM: routeElevationGainM,
            segments: routeSegments,
            segmentConditions: routeAnalysis!.segments,
          },
          unavailableSources,
        );

        const readinessToLegacy: Record<string, "green" | "yellow" | "red"> = {
          green: "green",
          yellow: "yellow",
          orange: "yellow",
          red: "red",
        };

        const elapsed = Date.now() - stepStart;
        console.log(
          `[briefing] route-aware synthesize completed in ${elapsed}ms (narrative length: ${routeResult.narrative.length}, segments: ${routeResult.routeWalkthrough.length})`,
        );

        return {
          isRouteAware: true as const,
          bottomLine: routeResult.bottomLine,
          narrative: routeResult.narrative,
          readiness: readinessToLegacy[routeResult.overallReadiness] ?? "yellow",
          readinessRationale: `Route readiness: ${routeResult.overallReadiness}`,
          conditionCards: routeResult.conditionCards,
          routeWalkthrough: routeResult.routeWalkthrough,
          criticalSections: routeResult.criticalSections,
          alternativeRoutes: routeResult.alternativeRoutes,
          gearChecklist: routeResult.gearChecklist,
          overallReadiness: routeResult.overallReadiness,
          _elapsedMs: elapsed,
        };
      }

      const result = await synthesize(
        synthesisConditions,
        activity as Activity,
        { lat, lng, name: null },
        { start: startDate, end: endDate },
        unavailableSources,
      );
      const elapsed = Date.now() - stepStart;
      console.log(`[briefing] synthesize completed in ${elapsed}ms (narrative length: ${result.narrative.length})`);
      return {
        isRouteAware: false as const,
        ...result,
        _elapsedMs: elapsed,
      };
    });

    stepTimings["synthesize"] = synthesisOutput._elapsedMs;

    // ── Step 4: Save briefing to database ─────────────────────────────
    await updatePipelineStatus(briefingId, "Saving briefing…");

    await step.run("save-briefing", async () => {
      const stepStart = Date.now();
      const supabase = createAdminClient();

      const routeAwareFields = synthesisOutput.isRouteAware
        ? {
            routeWalkthrough: synthesisOutput.routeWalkthrough,
            criticalSections: synthesisOutput.criticalSections,
            alternativeRoutes: synthesisOutput.alternativeRoutes,
            gearChecklist: synthesisOutput.gearChecklist,
            overallReadiness: synthesisOutput.overallReadiness,
          }
        : {};

      const { data, error } = await supabase
        .from("briefings")
        .update({
          narrative: synthesisOutput.narrative,
          bottom_line: synthesisOutput.bottomLine,
          readiness_rationale: synthesisOutput.readinessRationale,
          pipeline_status: "complete",
          conditions: {
            ...fullConditions,
            conditionCards,
            unavailableSources,
            satellite: satelliteData,
            ...(routeAnalysis && { routeAnalysis }),
            ...routeAwareFields,
          },
          raw_data: {
            ...fullConditions,
            unavailableSources,
            satellite: satelliteData,
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
          readiness: synthesisOutput.readiness ?? readiness,
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
      stepTimings["save-briefing"] = elapsed;
      return { savedId: data.id, hasNarrative: !!data.narrative };
    });

    const totalElapsed = Date.now() - pipelineStart;
    console.log(
      `[briefing] pipeline completed for briefing=${briefingId} in ${totalElapsed}ms` +
        (routeAnalysis
          ? ` (route: ${routeAnalysis.totalSegments} segments, hazard: ${routeAnalysis.overallHazardLevel})`
          : " (point-based)") +
        ` | step timings: ${JSON.stringify(stepTimings)}`,
    );
    return { briefingId, status: "complete", stepTimings, totalElapsedMs: totalElapsed };
  },
);
