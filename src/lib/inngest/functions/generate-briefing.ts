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
import type { SnotelData } from "@/lib/data-sources/snotel";
import type { AvalancheData } from "@/lib/data-sources/avalanche";
import type { UsgsData } from "@/lib/data-sources/usgs";
import type { FireData } from "@/lib/data-sources/fires";
import type { DaylightData } from "@/lib/synthesis/conditions";
import type { Activity } from "@/stores/planning-store";

const ADAPTER_LABELS = ["nws", "snotel", "avalanche", "usgs", "fires", "daylight"] as const;
const ADAPTER_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

function extractSettled<T>(
  result: PromiseSettledResult<T>,
  label: string,
): T | null {
  if (result.status === "fulfilled") return result.value;
  console.error(
    `[briefing] ${label} adapter failed:`,
    result.reason instanceof Error ? result.reason.message : result.reason,
  );
  return null;
}

function stripHourlyData(nws: NWSForecastData | null): NWSForecastData | null {
  if (!nws) return null;
  return { ...nws, hourly: [] };
}

export const generateBriefing = inngest.createFunction(
  { id: "generate-briefing" },
  { event: "briefing/requested" },
  async ({ event, step }) => {
    const { briefingId, lat, lng, startDate, endDate, activity } =
      event.data;
    const pipelineStart = Date.now();
    console.log(`[briefing] pipeline started for briefing=${briefingId}`);

    const tripDate = new Date(startDate);
    tripDate.setUTCHours(12, 0, 0, 0);

    const fetchResults = await step.run("fetch-all-data", async () => {
      const stepStart = Date.now();

      const settled = await Promise.allSettled([
        withTimeout(fetchNWS({ lat, lng }), ADAPTER_TIMEOUT_MS, "nws"),
        withTimeout(fetchSnotel({ lat, lng }), ADAPTER_TIMEOUT_MS, "snotel"),
        withTimeout(fetchAvalanche({ lat, lng }), ADAPTER_TIMEOUT_MS, "avalanche"),
        withTimeout(fetchUsgs({ lat, lng }), ADAPTER_TIMEOUT_MS, "usgs"),
        withTimeout(fetchFires({ lat, lng }), ADAPTER_TIMEOUT_MS, "fires"),
        Promise.resolve().then(() => computeDaylight({ lat, lng, date: tripDate })),
      ]);

      const errors: string[] = [];
      settled.forEach((r, i) => {
        if (r.status === "rejected") {
          const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
          errors.push(`${ADAPTER_LABELS[i]}: ${msg}`);
        }
      });

      if (errors.length > 0) {
        console.error("[briefing] Partial adapter failures:", errors.join("; "));
      }

      const elapsed = Date.now() - stepStart;
      console.log(`[briefing] fetch-all-data completed in ${elapsed}ms (errors: ${errors.length})`);

      return {
        nws: extractSettled<NWSForecastData>(settled[0], ADAPTER_LABELS[0]),
        snotel: extractSettled<SnotelData>(settled[1], ADAPTER_LABELS[1]),
        avalanche: extractSettled<AvalancheData | null>(settled[2], ADAPTER_LABELS[2]),
        usgs: extractSettled<UsgsData>(settled[3], ADAPTER_LABELS[3]),
        fires: extractSettled<FireData>(settled[4], ADAPTER_LABELS[4]),
        daylight: extractSettled<DaylightData>(settled[5], ADAPTER_LABELS[5]),
        adapterErrors: errors,
      };
    });

    const conditions: ConditionsBundle = {
      weather: stripHourlyData(fetchResults.nws),
      snowpack: fetchResults.snotel,
      avalanche: fetchResults.avalanche ?? null,
      streamFlow: fetchResults.usgs,
      fires: fetchResults.fires,
      daylight: fetchResults.daylight,
    };

    const conditionCards = buildConditionCards(conditions);
    const readiness = computeReadiness(conditions);

    const briefingResult = await step.run("synthesize", async () => {
      const stepStart = Date.now();
      const result = await synthesize(
        conditions,
        activity as Activity,
        { lat, lng, name: null },
        { start: startDate, end: endDate },
      );
      const elapsed = Date.now() - stepStart;
      console.log(`[briefing] synthesize completed in ${elapsed}ms (narrative length: ${result.narrative.length})`);
      return result;
    });

    await step.run("save-briefing", async () => {
      const stepStart = Date.now();
      const supabase = createAdminClient();

      const fullConditions: ConditionsBundle = {
        weather: fetchResults.nws,
        snowpack: fetchResults.snotel,
        avalanche: fetchResults.avalanche ?? null,
        streamFlow: fetchResults.usgs,
        fires: fetchResults.fires,
        daylight: fetchResults.daylight,
      };

      const { data, error } = await supabase
        .from("briefings")
        .update({
          narrative: briefingResult.narrative,
          bottom_line: briefingResult.bottomLine,
          readiness_rationale: briefingResult.readinessRationale,
          conditions: {
            ...conditions,
            conditionCards,
          },
          raw_data: {
            ...fullConditions,
            adapterErrors: fetchResults.adapterErrors,
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
    console.log(`[briefing] pipeline completed for briefing=${briefingId} in ${totalElapsed}ms`);
    return { briefingId, status: "complete" };
  },
);
