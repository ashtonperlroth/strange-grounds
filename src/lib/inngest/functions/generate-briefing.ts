import { inngest } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchNWS } from "@/lib/data-sources/nws";
import { fetchSnotel } from "@/lib/data-sources/snotel";

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
      return {
        source: "avalanche",
        center: "Mock Avalanche Center",
        dangerLevel: 2,
        dangerLabel: "Moderate",
        problems: ["Wind Slab", "Persistent Slab"],
        summary: "Moderate avalanche danger exists on wind-loaded slopes above treeline.",
      };
    });

    const usgsData = await step.run("fetch-usgs", async () => {
      return {
        source: "usgs",
        stationName: "Mock Creek Gauge",
        flowRate: 125,
        flowUnit: "cfs",
        gageHeight: 2.3,
        trend: "stable",
      };
    });

    const daylightData = await step.run("compute-daylight", async () => {
      return {
        source: "suncalc",
        sunrise: "07:15",
        sunset: "17:45",
        daylightHours: 10.5,
        goldenHourStart: "16:55",
        goldenHourEnd: "17:45",
      };
    });

    const narrative = await step.run("synthesize", async () => {
      const firstPeriod = nwsData.periods[0];
      const temps = nwsData.periods.slice(0, 4).map((p) => p.temperature);
      const high = Math.max(...temps);
      const low = Math.min(...temps);
      const weatherSummary = firstPeriod
        ? `Expect temperatures between ${low}°F and ${high}°F with ${firstPeriod.shortForecast.toLowerCase()} conditions.`
        : "Weather data unavailable.";

      const alertSection =
        nwsData.alerts.length > 0
          ? `\n**Active Alerts:** ${nwsData.alerts.map((a) => a.event).join(", ")}`
          : "";

      const sections = [
        `## Weather Forecast\n${weatherSummary}${alertSection}`,
        `## Avalanche Conditions\n${avalancheData.summary}\nDanger Level: ${avalancheData.dangerLabel} (${avalancheData.dangerLevel}/5)\nProblems: ${avalancheData.problems.join(", ")}`,
        `## Snowpack\n${snotelData.nearest ? `Snow depth: ${snotelData.nearest.latest.snowDepthIn ?? "N/A"}" at ${snotelData.nearest.station.name}\nSWE: ${snotelData.nearest.latest.sweIn ?? "N/A"}"\nTrend: ${snotelData.nearest.trend}` : "No SNOTEL stations found within 50 km"}`,
        `## Stream Crossings\n${usgsData.stationName}: ${usgsData.flowRate} ${usgsData.flowUnit} (${usgsData.trend})\nGage height: ${usgsData.gageHeight} ft`,
        `## Daylight\nSunrise: ${daylightData.sunrise} | Sunset: ${daylightData.sunset}\nTotal daylight: ${daylightData.daylightHours} hours`,
      ];

      return `# Conditions Briefing — ${activity}\n**Location:** ${lat.toFixed(4)}, ${lng.toFixed(4)}\n**Dates:** ${startDate} to ${endDate}\n\n${sections.join("\n\n")}`;
    });

    await step.run("save-briefing", async () => {
      const supabase = createAdminClient();

      const conditions = {
        weather: nwsData,
        snowpack: snotelData,
        avalanche: avalancheData,
        streamFlow: usgsData,
        daylight: daylightData,
      };

      const { error } = await supabase
        .from("briefings")
        .update({
          narrative,
          conditions,
          raw_data: conditions,
          readiness: "yellow" as const,
        })
        .eq("id", briefingId);

      if (error) {
        throw new Error(`Failed to save briefing: ${error.message}`);
      }
    });

    return { briefingId, status: "complete" };
  },
);
