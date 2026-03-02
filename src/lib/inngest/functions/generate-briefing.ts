import { inngest } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchNWS } from "@/lib/data-sources/nws";
import { fetchSnotel } from "@/lib/data-sources/snotel";
import { fetchAvalanche } from "@/lib/data-sources/avalanche";
import { fetchUsgs } from "@/lib/data-sources/usgs";
import { fetchFires } from "@/lib/data-sources/fires";
import { computeDaylight } from "@/lib/data-sources/daylight";
import { generateBriefing as synthesize } from "@/lib/synthesis/briefing";
import type { ConditionsBundle } from "@/lib/synthesis/conditions";
import type { Activity } from "@/stores/planning-store";

export const generateBriefing = inngest.createFunction(
  { id: "generate-briefing" },
  { event: "briefing/requested" },
  async ({ event, step }) => {
    const { briefingId, lat, lng, startDate, endDate, activity } =
      event.data;

    const nwsData = await step.run("fetch-nws", async () => {
      return fetchNWS({ lat, lng });
    });

    const snotelData = await step.run("fetch-snotel", async () => {
      return fetchSnotel({ lat, lng });
    });

    const avalancheData = await step.run("fetch-avalanche", async () => {
      return fetchAvalanche({ lat, lng });
    });

    const usgsData = await step.run("fetch-usgs", async () => {
      return fetchUsgs({ lat, lng });
    });

    const fireData = await step.run("fetch-fires", async () => {
      return fetchFires({ lat, lng });
    });

    const daylightData = await step.run("compute-daylight", async () => {
      const tripDate = new Date(startDate);
      tripDate.setUTCHours(12, 0, 0, 0);
      return computeDaylight({ lat, lng, date: tripDate });
    });

    const conditions: ConditionsBundle = {
      weather: nwsData,
      snowpack: snotelData,
      avalanche: avalancheData,
      streamFlow: usgsData,
      fires: fireData,
      daylight: daylightData,
    };

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
          conditions,
          raw_data: conditions,
          readiness: briefingResult.readiness,
        })
        .eq("id", briefingId);

      if (error) {
        throw new Error(`Failed to save briefing: ${error.message}`);
      }
    });

    return { briefingId, status: "complete" };
  },
);
