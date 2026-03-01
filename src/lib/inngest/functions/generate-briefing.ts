import { inngest } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";

export const generateBriefing = inngest.createFunction(
  { id: "generate-briefing" },
  { event: "briefing/requested" },
  async ({ event, step }) => {
    const { briefingId, lat, lng, startDate, endDate, activity } =
      event.data;

    const nwsData = await step.run("fetch-nws", async () => {
      return {
        source: "nws",
        forecast: `Mock NWS forecast for ${lat.toFixed(2)}, ${lng.toFixed(2)}`,
        periods: [
          { name: "Today", temperature: 42, windSpeed: "10 mph", shortForecast: "Partly Cloudy" },
          { name: "Tonight", temperature: 28, windSpeed: "5 mph", shortForecast: "Clear" },
          { name: "Tomorrow", temperature: 45, windSpeed: "15 mph", shortForecast: "Sunny" },
        ],
      };
    });

    const snotelData = await step.run("fetch-snotel", async () => {
      return {
        source: "snotel",
        stationName: "Mock SNOTEL Station",
        snowDepth: 48,
        swe: 18.5,
        temperature: 30,
        snowfall24h: 3,
      };
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
      const sections = [
        `## Weather Forecast\n${nwsData.forecast}\nExpect temperatures between ${nwsData.periods[1].temperature}°F and ${nwsData.periods[0].temperature}°F with ${nwsData.periods[0].shortForecast.toLowerCase()} skies.`,
        `## Avalanche Conditions\n${avalancheData.summary}\nDanger Level: ${avalancheData.dangerLabel} (${avalancheData.dangerLevel}/5)\nProblems: ${avalancheData.problems.join(", ")}`,
        `## Snowpack\nSnow depth: ${snotelData.snowDepth}" at ${snotelData.stationName}\nSWE: ${snotelData.swe}"\n24hr snowfall: ${snotelData.snowfall24h}"`,
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
