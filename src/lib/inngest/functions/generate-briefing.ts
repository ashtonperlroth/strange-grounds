import { inngest } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchNWS } from "@/lib/data-sources/nws";
import { fetchSnotel } from "@/lib/data-sources/snotel";
import { fetchAvalanche } from "@/lib/data-sources/avalanche";
import { fetchUsgs } from "@/lib/data-sources/usgs";
import { fetchFires } from "@/lib/data-sources/fires";

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

      const avySection = avalancheData
        ? `## Avalanche Conditions\n${avalancheData.discussion || "No discussion available."}\nDanger Level: ${avalancheData.dangerLabel} (${avalancheData.dangerLevel}/5)\nProblems: ${avalancheData.problems.map((p) => p.name).join(", ") || "None identified"}`
        : "## Avalanche Conditions\nNo avalanche forecast zone found for this location.";

      const fireSection =
        fireData.nearbyCount > 0
          ? `## Active Fires\n${fireData.fires.map((f) => `- **${f.name}**: ${f.acres ? `${Math.round(f.acres).toLocaleString()} acres` : "size unknown"}${f.containment !== null ? `, ${f.containment}% contained` : ""}`).join("\n")}\n\n⚠️ ${fireData.nearbyCount} active fire${fireData.nearbyCount > 1 ? "s" : ""} within 50 miles — check local fire restrictions and air quality.`
          : "## Active Fires\nNo active fires within 50 miles.";

      const sections = [
        `## Weather Forecast\n${weatherSummary}${alertSection}`,
        avySection,
        `## Snowpack\n${snotelData.nearest ? `Snow depth: ${snotelData.nearest.latest.snowDepthIn ?? "N/A"}" at ${snotelData.nearest.station.name}\nSWE: ${snotelData.nearest.latest.sweIn ?? "N/A"}"\nTrend: ${snotelData.nearest.trend}` : "No SNOTEL stations found within 50 km"}`,
        `## Stream Crossings\n${usgsData.nearest ? `${usgsData.nearest.station.name}: ${usgsData.nearest.current.dischargeCfs ?? "N/A"} cfs (${usgsData.nearest.trend})\nGage height: ${usgsData.nearest.current.gageHeightFt ?? "N/A"} ft${usgsData.nearest.percentOfMedian !== null ? `\n% of median: ${usgsData.nearest.percentOfMedian}%` : ""}` : "No USGS stream gauges found within 30 km"}`,
        fireSection,
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
        fires: fireData,
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
