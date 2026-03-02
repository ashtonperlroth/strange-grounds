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

export const generateBriefing = inngest.createFunction(
  { id: "generate-briefing" },
  { event: "briefing/requested" },
  async ({ event, step }) => {
    const { briefingId, lat, lng, startDate, endDate, activity } =
      event.data;

    const tripDate = new Date(startDate);
    tripDate.setUTCHours(12, 0, 0, 0);

    const fetchResults = await step.run("fetch-all-data", async () => {
      const settled = await Promise.allSettled([
        fetchNWS({ lat, lng }),
        fetchSnotel({ lat, lng }),
        fetchAvalanche({ lat, lng }),
        fetchUsgs({ lat, lng }),
        fetchFires({ lat, lng }),
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
      weather: fetchResults.nws,
      snowpack: fetchResults.snotel,
      avalanche: fetchResults.avalanche ?? null,
      streamFlow: fetchResults.usgs,
      fires: fetchResults.fires,
      daylight: fetchResults.daylight,
    };

    const conditionCards = buildConditionCards(conditions);
    const readiness = computeReadiness(conditions);

    const briefingResult = await step.run("synthesize", async () => {
      return synthesize(
        conditions,
        activity as Activity,
        { lat, lng, name: null },
        { start: startDate, end: endDate },
      );
    });

    await step.run("save-briefing", async () => {
      const supabase = createAdminClient();

      const { error } = await supabase
        .from("briefings")
        .update({
          narrative: briefingResult.narrative,
          conditions: {
            ...conditions,
            conditionCards,
          },
          raw_data: {
            ...conditions,
            adapterErrors: fetchResults.adapterErrors,
          },
          readiness: briefingResult.readiness ?? readiness,
        })
        .eq("id", briefingId);

      if (error) {
        throw new Error(`Failed to save briefing: ${error.message}`);
      }
    });

    return { briefingId, status: "complete" };
  },
);
