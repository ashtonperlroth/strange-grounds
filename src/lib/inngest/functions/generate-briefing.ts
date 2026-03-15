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
import { buildConditionCards, computeReadiness } from "@/lib/synthesis/conditions";
import type { ConditionsBundle } from "@/lib/synthesis/conditions";
import type { NWSForecastData } from "@/lib/data-sources/nws";
import type { Activity } from "@/stores/planning-store";
import {
  generateBriefing as synthesize,
  generateRouteAwareBriefing as synthesizeRoute,
} from "@/lib/synthesis/briefing";
import { loadSegments } from "@/lib/routes/save-segments";
import {
  fetchSegmentConditions,
  buildRouteAnalysis,
  slimSegmentConditions,
} from "@/lib/routes/segment-conditions";
import type { RouteAnalysis } from "@/lib/types/briefing";
import type { RouteSegment } from "@/lib/types/route";
import {
  computeLapseRateEstimates,
} from "@/lib/utils/elevation-weather";
import type { ElevationWeatherData } from "@/lib/utils/elevation-weather";

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

async function updateBriefingProgress(
  briefingId: string,
  status: string,
  progressUpdate: Record<string, unknown>,
  conditionsUpdate?: Record<string, unknown>,
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { data: current } = await supabase
      .from("briefings")
      .select("progress, conditions")
      .eq("id", briefingId)
      .single();

    const mergedProgress = { ...(current?.progress ?? {}), ...progressUpdate };
    const updatePayload: Record<string, unknown> = {
      pipeline_status: status,
      progress: mergedProgress,
    };

    if (conditionsUpdate) {
      updatePayload.conditions = {
        ...(current?.conditions ?? {}),
        ...conditionsUpdate,
      };
    }

    await supabase.from("briefings").update(updatePayload).eq("id", briefingId);
  } catch (err) {
    console.warn("[briefing] progressive write failed (non-critical):", err);
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
          safeAdapterCall(() => fetchNWS({ lat, lng }), "NWS").then((result) => {
            updateBriefingProgress(briefingId, "Fetching conditions\u2026", { weatherFetched: true }).catch(() => {});
            return result;
          }),
          safeAdapterCall(() => fetchSnotel({ lat, lng }), "SNOTEL").then((result) => {
            updateBriefingProgress(briefingId, "Fetching conditions\u2026", { snowpackFetched: true }).catch(() => {});
            return result;
          }),
          safeAdapterCall(
            () => fetchAvalanche({ lat, lng }),
            "Avalanche",
            AVALANCHE_TIMEOUT_MS,
          ).then((result) => {
            updateBriefingProgress(briefingId, "Fetching conditions\u2026", { avalancheFetched: true }).catch(() => {});
            return result;
          }),
          safeAdapterCall(() => fetchUsgs({ lat, lng }), "USGS").then((result) => {
            updateBriefingProgress(briefingId, "Fetching conditions\u2026", { streamFlowFetched: true }).catch(() => {});
            return result;
          }),
          safeAdapterCall(() => fetchFires({ lat, lng }), "Fires").then((result) => {
            updateBriefingProgress(briefingId, "Fetching conditions\u2026", { firesFetched: true }).catch(() => {});
            return result;
          }),
          safeAdapterCall(
            () => Promise.resolve(computeDaylight({ lat, lng, date: tripDate })),
            "Daylight",
          ).then((result) => {
            updateBriefingProgress(briefingId, "Fetching conditions\u2026", { daylightFetched: true }).catch(() => {});
            return result;
          }),
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

    // Progressive write: conditions + condition cards available for early UI rendering
    await updateBriefingProgress(
      briefingId,
      "conditions_complete",
      {
        pointConditionsComplete: true,
        weatherAvailable: !!fetchResults.nws,
        snowpackAvailable: !!fetchResults.snotel,
        avalancheAvailable: !!fetchResults.avalanche,
        streamFlowAvailable: !!fetchResults.usgs,
        firesAvailable: !!fetchResults.fires,
        daylightAvailable: !!fetchResults.daylight,
      },
      {
        conditionCards,
        weather: fullConditions.weather,
        snowpack: fullConditions.snowpack,
        avalanche: fullConditions.avalanche,
        streamFlow: fullConditions.streamFlow,
        fires: fullConditions.fires,
        daylight: fullConditions.daylight,
        unavailableSources,
      },
    );

    // Write readiness early so the UI can show the badge before narrative completes
    try {
      const supabase = createAdminClient();
      await supabase.from("briefings").update({ readiness }).eq("id", briefingId);
    } catch (err) {
      console.warn("[briefing] early readiness write failed (non-critical):", err);
    }

    // ── Steps 2 + 2c: Route conditions & satellite in parallel ────────
    // Satellite is non-blocking: if it takes too long, synthesis proceeds
    // without it and we backfill afterwards.

    let routeAnalysis: RouteAnalysis | null = null;
    let routeSegments: RouteSegment[] = [];
    let elevationWeatherData: ElevationWeatherData | null = null;
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
            .select("id, name, total_distance_m, elevation_gain_m, max_elevation_m, min_elevation_m")
            .eq("trip_id", tripId)
            .order("created_at", { ascending: false })
            .limit(1);

          if (!routes || routes.length === 0) {
            console.warn(
              `[briefing] No route found for trip=${tripId}, skipping segment conditions`,
            );
            return { analysis: null, meta: null, elevationWeather: null, _elapsedMs: Date.now() - stepStart };
          }

          const routeRow = routes[0];
          const routeId = routeRow.id;

          const segments = await loadSegments(supabase, routeId);
          if (segments.length === 0) {
            console.warn(
              `[briefing] No segments found for route=${routeId}, skipping segment conditions`,
            );
            return { analysis: null, meta: null, elevationWeather: null, _elapsedMs: Date.now() - stepStart };
          }

          console.log(
            `[briefing] Found ${segments.length} segments for route=${routeId}`,
          );

          await updateBriefingProgress(briefingId, "segments_analyzed", {
            segmentsComplete: true,
            segmentCount: segments.length,
            segmentSummary: segments.map((s) => ({
              order: s.segmentOrder,
              type: s.terrainType,
              distanceM: s.distanceM,
              aspect: s.dominantAspect,
              maxSlope: s.maxSlopeDegrees,
            })),
          });

          await updatePipelineStatus(
            briefingId,
            `Fetching conditions for ${segments.length} segments…`,
          );

          const segmentConditions = await fetchSegmentConditions(
            segments,
            tripDate,
          );

          const analysis = buildRouteAnalysis(segmentConditions);

          await updateBriefingProgress(
            briefingId,
            "hazards_assessed",
            {
              hazardsComplete: true,
              routeAnalysisSummary: {
                overallHazardLevel: analysis.overallHazardLevel,
                totalSegments: analysis.totalSegments,
                hazardDistribution: analysis.hazardDistribution,
              },
            },
            { routeAnalysis: analysis },
          );

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

          // ── Lapse rate estimates ──────────────────────────────────────
          let elevationWeather: ElevationWeatherData | null = null;
          const minElevM = routeRow.min_elevation_m as number | null;
          const maxElevM = routeRow.max_elevation_m as number | null;
          const nws = fullConditions.weather;
          if (minElevM != null && maxElevM != null && nws && nws.periods.length > 0) {
            const baseElevFt = Math.round(minElevM * 3.281);
            const highPointFt = Math.round(maxElevM * 3.281);

            // High/low from next ~24h of forecast periods
            const slice = nws.periods.slice(0, 6);
            const temps = slice.map((p) => p.temperature);
            const baseHighF = Math.max(...temps);
            const baseLowF = Math.min(...temps);

            // Max wind from same slice
            const maxWind = Math.max(
              ...slice.map((p) => {
                const m = p.windSpeed.match(/(\d+)/);
                return m ? parseInt(m[1], 10) : 0;
              }),
            );
            const baseWindMph = maxWind > 0 ? maxWind : null;

            const elevDiffFt = highPointFt - baseElevFt;
            const targets: Array<{ ft: number; label: string }> = [
              { ft: baseElevFt, label: "Trailhead" },
            ];
            if (elevDiffFt > 2000) {
              targets.push({ ft: Math.round(baseElevFt + elevDiffFt / 2), label: "Mid-route" });
            }
            targets.push({ ft: highPointFt, label: "High point" });

            elevationWeather = computeLapseRateEstimates(
              baseElevFt,
              baseHighF,
              baseLowF,
              baseWindMph,
              targets,
            );
          }

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
            elevationWeather,
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
      if (routeResult.elevationWeather) {
        elevationWeatherData = routeResult.elevationWeather;
        // Write elevation weather to conditions immediately so it shows in UI
        updateBriefingProgress(briefingId, "conditions_complete", {}, {
          elevationWeather: elevationWeatherData,
        }).catch(() => {});
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

    // ── Step 3: Synthesize briefing inline ─────────────────────────────
    const useRouteAware =
      hasRoute &&
      routeAnalysis !== null &&
      routeSegments.length > 0 &&
      routeAnalysis.segments.length > 0;

    await step.run("synthesize-briefing", async () => {
      const stepStart = Date.now();
      const supabase = createAdminClient();

      await updatePipelineStatus(briefingId, "Synthesizing briefing…");

      const location = { lat, lng, name: null };
      const dates = { start: startDate, end: endDate };

      const updateData: Record<string, unknown> = {
        pipeline_status: "complete",
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
        progress: { complete: true, synthesisReady: true },
      };

      if (useRouteAware) {
        const result = await synthesizeRoute(
          synthesisConditions,
          activity as Activity,
          location,
          dates,
          {
            routeName,
            totalDistanceM: routeTotalDistanceM,
            elevationGainM: routeElevationGainM,
            segments: routeSegments,
            segmentConditions: routeAnalysis!.segments,
          },
          unavailableSources,
        );

        updateData.narrative = result.narrative;
        updateData.bottom_line = result.bottomLine;
        updateData.conditions = {
          ...fullConditions,
          conditionCards,
          unavailableSources,
          satellite: satelliteData,
          ...(routeAnalysis && { routeAnalysis }),
          routeWalkthrough: result.routeWalkthrough,
          criticalSections: result.criticalSections,
          alternativeRoutes: result.alternativeRoutes,
          gearChecklist: result.gearChecklist,
          overallReadiness: result.overallReadiness,
        };
      } else {
        const result = await synthesize(
          synthesisConditions,
          activity as Activity,
          location,
          dates,
          unavailableSources,
        );

        updateData.narrative = result.narrative;
        updateData.bottom_line = result.bottomLine;
        updateData.readiness_rationale = result.readinessRationale;
        updateData.readiness = result.readiness;
        updateData.conditions = {
          ...fullConditions,
          conditionCards,
          unavailableSources,
          satellite: satelliteData,
          ...(routeAnalysis && { routeAnalysis }),
        };
      }

      await supabase
        .from("briefings")
        .update(updateData)
        .eq("id", briefingId);

      const elapsed = Date.now() - stepStart;
      console.log(
        `[briefing] synthesize-briefing completed in ${elapsed}ms (type: ${useRouteAware ? "route" : "point"})`,
      );
      stepTimings["synthesize-briefing"] = elapsed;
      return { status: "complete" };
    });

    const totalElapsed = Date.now() - pipelineStart;
    console.log(
      `[briefing] pipeline complete briefing=${briefingId} in ${totalElapsed}ms` +
        (routeAnalysis
          ? ` (route: ${routeAnalysis.totalSegments} segments, hazard: ${routeAnalysis.overallHazardLevel})`
          : " (point-based)") +
        ` | step timings: ${JSON.stringify(stepTimings)}`,
    );
    return { briefingId, status: "complete", stepTimings, totalElapsedMs: totalElapsed };
  },
);
