/**
 * Test script for the synthesis module.
 * Tests conditions computation, prompt generation, and (optionally) Claude API.
 *
 * Usage:
 *   npx tsx scripts/test-synthesis.ts           # Test without API call
 *   ANTHROPIC_API_KEY=... npx tsx scripts/test-synthesis.ts --api  # Test with API
 */

import type { NWSForecastData } from "../src/lib/data-sources/nws";
import type { AvalancheData } from "../src/lib/data-sources/avalanche";
import type { SnotelData } from "../src/lib/data-sources/snotel";
import type { UsgsData } from "../src/lib/data-sources/usgs";
import type { FireData } from "../src/lib/data-sources/fires";
import type { ConditionsBundle, DaylightData } from "../src/lib/synthesis/conditions";
import {
  computeReadiness,
  buildConditionCards,
  computeWeatherStatus,
  computeAvalancheStatus,
  computeSnowpackStatus,
  computeStreamStatus,
  computeFireStatus,
  computeDaylightStatus,
} from "../src/lib/synthesis/conditions";
import { promptForActivity } from "../src/lib/synthesis/prompts";
import type { Activity } from "../src/stores/planning-store";

// ── Mock data: Teton Range ski touring scenario ─────────────────────

const mockWeather: NWSForecastData = {
  source: "nws",
  periods: [
    {
      number: 1,
      name: "Today",
      startTime: "2026-03-01T06:00:00-07:00",
      endTime: "2026-03-01T18:00:00-07:00",
      isDaytime: true,
      temperature: 28,
      temperatureUnit: "F",
      windSpeed: "15 to 25 mph",
      windDirection: "NW",
      shortForecast: "Partly Cloudy",
      detailedForecast: "Partly cloudy, with a high near 28. Northwest wind 15 to 25 mph.",
      probabilityOfPrecipitation: { value: 10 },
      relativeHumidity: { value: 45 },
    },
    {
      number: 2,
      name: "Tonight",
      startTime: "2026-03-01T18:00:00-07:00",
      endTime: "2026-03-02T06:00:00-07:00",
      isDaytime: false,
      temperature: 12,
      temperatureUnit: "F",
      windSpeed: "10 to 20 mph",
      windDirection: "W",
      shortForecast: "Mostly Clear",
      detailedForecast: "Mostly clear, with a low around 12. West wind 10 to 20 mph.",
      probabilityOfPrecipitation: { value: 5 },
      relativeHumidity: { value: 60 },
    },
    {
      number: 3,
      name: "Monday",
      startTime: "2026-03-02T06:00:00-07:00",
      endTime: "2026-03-02T18:00:00-07:00",
      isDaytime: true,
      temperature: 32,
      temperatureUnit: "F",
      windSpeed: "20 to 35 mph",
      windDirection: "SW",
      shortForecast: "Snow Likely",
      detailedForecast: "Snow likely after noon. Cloudy with a high near 32. SW wind 20 to 35 mph. Chance of precipitation is 70%.",
      probabilityOfPrecipitation: { value: 70 },
      relativeHumidity: { value: 75 },
    },
    {
      number: 4,
      name: "Monday Night",
      startTime: "2026-03-02T18:00:00-07:00",
      endTime: "2026-03-03T06:00:00-07:00",
      isDaytime: false,
      temperature: 18,
      temperatureUnit: "F",
      windSpeed: "25 to 40 mph",
      windDirection: "W",
      shortForecast: "Heavy Snow",
      detailedForecast: "Heavy snow. Low around 18. West wind 25 to 40 mph. 6-10 inches expected.",
      probabilityOfPrecipitation: { value: 90 },
      relativeHumidity: { value: 85 },
    },
  ],
  hourly: [],
  alerts: [],
  fetchedAt: "2026-03-01T08:00:00Z",
};

const mockAvalanche: AvalancheData = {
  source: "avalanche",
  center: "Bridger-Teton Avalanche Center",
  centerUrl: "https://jhavalanche.org",
  zone: "Teton Range",
  dangerLevel: 3,
  dangerLabel: "Considerable",
  dangerRatings: [
    { elevation: "above_treeline", level: 4, label: "High" },
    { elevation: "near_treeline", level: 3, label: "Considerable" },
    { elevation: "below_treeline", level: 2, label: "Moderate" },
  ],
  problems: [
    {
      name: "Wind Slab",
      aspects: ["N", "NE", "E", "NW"],
      elevations: ["above_treeline", "near_treeline"],
      likelihood: "Likely",
      size: "D2-D3",
    },
    {
      name: "Persistent Slab",
      aspects: ["N", "NE", "NW"],
      elevations: ["above_treeline", "near_treeline", "below_treeline"],
      likelihood: "Possible",
      size: "D2-D3",
    },
  ],
  discussion:
    "Strong northwest winds have built reactive wind slabs on leeward terrain features. A buried weak layer from mid-February continues to produce large propagation results in stability tests. Travel in avalanche terrain requires careful route selection and conservative decision-making.",
  issuedAt: "2026-03-01T07:00:00-07:00",
  expiresAt: "2026-03-02T07:00:00-07:00",
  fetchedAt: "2026-03-01T08:00:00Z",
};

const mockSnotel: SnotelData = {
  source: "snotel",
  stations: [
    {
      station: {
        id: "1",
        stationId: "787",
        name: "Phillips Bench",
        elevationM: 2469,
        distanceKm: 8.2,
        state: "WY",
      },
      readings: [],
      latest: { snowDepthIn: 78, sweIn: 28.5, avgTempF: 22 },
      trend: "rising",
    },
    {
      station: {
        id: "2",
        stationId: "817",
        name: "Togwotee Pass",
        elevationM: 2926,
        distanceKm: 22.1,
        state: "WY",
      },
      readings: [],
      latest: { snowDepthIn: 92, sweIn: 35.2, avgTempF: 18 },
      trend: "stable",
    },
  ],
  nearest: {
    station: {
      id: "1",
      stationId: "787",
      name: "Phillips Bench",
      elevationM: 2469,
      distanceKm: 8.2,
      state: "WY",
    },
    readings: [],
    latest: { snowDepthIn: 78, sweIn: 28.5, avgTempF: 22 },
    trend: "rising",
  },
  summary: {
    avgSnowDepthIn: 85,
    avgSweIn: 31.9,
    percentOfNormal: 105,
  },
};

const mockUsgs: UsgsData = {
  source: "usgs",
  stations: [
    {
      station: { id: "1", siteId: "13015000", name: "Snake River at Moose, WY", distanceKm: 12.4 },
      current: { dischargeCfs: 450, gageHeightFt: 3.2, timestamp: "2026-03-01T08:00:00Z" },
      percentOfMedian: 95,
      history: [],
      trend: "stable",
    },
  ],
  nearest: {
    station: { id: "1", siteId: "13015000", name: "Snake River at Moose, WY", distanceKm: 12.4 },
    current: { dischargeCfs: 450, gageHeightFt: 3.2, timestamp: "2026-03-01T08:00:00Z" },
    percentOfMedian: 95,
    history: [],
    trend: "stable",
  },
  summary: {
    avgDischargeCfs: 450,
    maxPercentOfMedian: 95,
    gaugeCount: 1,
  },
};

const mockFires: FireData = {
  source: "nifc",
  fires: [],
  nearbyCount: 0,
  fetchedAt: "2026-03-01T08:00:00Z",
};

const mockDaylight: DaylightData = {
  source: "suncalc",
  sunrise: "7:02 AM",
  sunset: "6:12 PM",
  daylightHours: 11.2,
  goldenHourStart: "5:25 PM",
  goldenHourEnd: "6:12 PM",
  civilDawn: "6:33 AM",
  civilDusk: "6:41 PM",
  timeZone: "America/Denver",
};

const mockConditions: ConditionsBundle = {
  weather: mockWeather,
  snowpack: mockSnotel,
  avalanche: mockAvalanche,
  streamFlow: mockUsgs,
  fires: mockFires,
  daylight: mockDaylight,
};

// ── Tests ───────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

console.log("\n=== Per-Card Status Tests ===\n");

assert(computeWeatherStatus(mockWeather) === "caution", "Weather: caution (70% precip > 60 threshold)");
assert(computeWeatherStatus(null) === "unknown", "Weather: unknown when null");
assert(
  computeWeatherStatus({ ...mockWeather, alerts: [{ id: "1", event: "Winter Storm Warning", headline: "Heavy snow", severity: "Severe", urgency: "Immediate", description: "", instruction: null, onset: "", expires: "" }] }) === "concern",
  "Weather: concern when alerts present",
);
assert(
  computeWeatherStatus({ ...mockWeather, periods: mockWeather.periods.slice(0, 2) }) === "good",
  "Weather: good with calm conditions only",
);

assert(computeAvalancheStatus(mockAvalanche) === "caution", "Avalanche: caution (level 3 Considerable)");
assert(computeAvalancheStatus(null) === "unknown", "Avalanche: unknown when null");
assert(
  computeAvalancheStatus({ ...mockAvalanche, dangerLevel: 4, dangerLabel: "High" }) === "concern",
  "Avalanche: concern at level 4",
);
assert(
  computeAvalancheStatus({ ...mockAvalanche, dangerLevel: 1, dangerLabel: "Low" }) === "good",
  "Avalanche: good at level 1",
);

assert(computeSnowpackStatus(mockSnotel) === "good", "Snowpack: good (105% of normal ≥ 80)");
assert(computeSnowpackStatus(null) === "unknown", "Snowpack: unknown when null");
assert(
  computeSnowpackStatus({ ...mockSnotel, summary: { ...mockSnotel.summary, percentOfNormal: 60 } }) === "caution",
  "Snowpack: caution at 60% of normal",
);
assert(
  computeSnowpackStatus({ ...mockSnotel, summary: { ...mockSnotel.summary, percentOfNormal: 30 } }) === "concern",
  "Snowpack: concern at 30% of normal",
);

assert(computeStreamStatus(mockUsgs) === "good", "Stream: good (95% of median ≤ 120)");
assert(computeStreamStatus(null) === "unknown", "Stream: unknown when null");
assert(
  computeStreamStatus({ ...mockUsgs, summary: { ...mockUsgs.summary, maxPercentOfMedian: 150 } }) === "caution",
  "Stream: caution at 150% of median",
);
assert(
  computeStreamStatus({ ...mockUsgs, summary: { ...mockUsgs.summary, maxPercentOfMedian: 200 } }) === "concern",
  "Stream: concern at 200% of median",
);

assert(computeFireStatus(mockFires) === "good", "Fire: good (0 nearby fires)");
assert(computeFireStatus(null) === "unknown", "Fire: unknown when null");
assert(
  computeFireStatus({ ...mockFires, nearbyCount: 1, fires: [] }) === "caution",
  "Fire: caution with 1 nearby fire",
);
assert(
  computeFireStatus({ ...mockFires, nearbyCount: 5, fires: [] }) === "concern",
  "Fire: concern with 5 nearby fires",
);

assert(computeDaylightStatus(mockDaylight) === "caution", "Daylight: caution (11.2h < 12h)");
assert(computeDaylightStatus(null) === "unknown", "Daylight: unknown when null");
assert(
  computeDaylightStatus({ ...mockDaylight, daylightHours: 14 }) === "good",
  "Daylight: good at 14h",
);
assert(
  computeDaylightStatus({ ...mockDaylight, daylightHours: 8 }) === "concern",
  "Daylight: concern at 8h",
);

console.log("\n=== Readiness Aggregation Tests ===\n");

const readiness = computeReadiness(mockConditions);
assert(readiness === "yellow", `Readiness: yellow (has caution cards); got "${readiness}"`);

const greenConditions: ConditionsBundle = {
  ...mockConditions,
  weather: { ...mockWeather, periods: mockWeather.periods.slice(0, 2) },
  avalanche: { ...mockAvalanche, dangerLevel: 1, dangerLabel: "Low" },
  daylight: { ...mockDaylight, daylightHours: 14 },
};
const greenReadiness = computeReadiness(greenConditions);
assert(greenReadiness === "green", `Readiness: green (all good/unknown); got "${greenReadiness}"`);

const redConditions: ConditionsBundle = {
  ...mockConditions,
  weather: {
    ...mockWeather,
    alerts: [{ id: "1", event: "Winter Storm Warning", headline: "Heavy snow", severity: "Severe", urgency: "Immediate", description: "", instruction: null, onset: "", expires: "" }],
  },
};
const redReadiness = computeReadiness(redConditions);
assert(redReadiness === "red", `Readiness: red (has concern cards); got "${redReadiness}"`);

console.log("\n=== Condition Cards Tests ===\n");

const cards = buildConditionCards(mockConditions);
assert(cards.length >= 4, `Cards: at least 4 cards built; got ${cards.length}`);
assert(cards.some(c => c.category === "weather"), "Cards: includes weather");
assert(cards.some(c => c.category === "avalanche"), "Cards: includes avalanche");
assert(cards.some(c => c.category === "snowpack"), "Cards: includes snowpack");
assert(cards.some(c => c.category === "stream_crossings"), "Cards: includes stream_crossings");
assert(cards.some(c => c.category === "daylight"), "Cards: includes daylight");

const noAvyConditions: ConditionsBundle = { ...mockConditions, avalanche: null };
const noAvyCards = buildConditionCards(noAvyConditions);
assert(!noAvyCards.some(c => c.category === "avalanche"), "Cards: no avalanche card when data is null");

console.log("\n=== Prompt Generation Tests ===\n");

const activities: Activity[] = ["Ski Touring", "Backpacking", "Mountaineering", "Trail Running", "Day Hike"];
const location = { lat: 43.7904, lng: -110.6818, name: "Grand Teton" };
const dates = { start: "2026-03-01", end: "2026-03-03" };

for (const activity of activities) {
  const prompt = promptForActivity(activity, mockConditions, location, dates);
  assert(prompt.system.length > 200, `Prompt [${activity}]: system prompt is substantial (${prompt.system.length} chars)`);
  assert(prompt.user.includes(activity), `Prompt [${activity}]: user prompt mentions activity`);
  assert(prompt.user.includes("Grand Teton"), `Prompt [${activity}]: user prompt mentions location`);
  assert(prompt.user.includes("43.7904"), `Prompt [${activity}]: user prompt includes coordinates`);
  assert(prompt.user.includes("2026-03-01"), `Prompt [${activity}]: user prompt includes dates`);
  assert(prompt.user.includes("WEATHER FORECAST"), `Prompt [${activity}]: includes weather data`);
  assert(prompt.user.includes("AVALANCHE"), `Prompt [${activity}]: includes avalanche data`);
  assert(prompt.user.includes("SNOWPACK"), `Prompt [${activity}]: includes snowpack data`);
  assert(prompt.user.includes("STREAM FLOW"), `Prompt [${activity}]: includes stream data`);
  assert(prompt.user.includes("DAYLIGHT"), `Prompt [${activity}]: includes daylight data`);
}

const skiPrompt = promptForActivity("Ski Touring", mockConditions, location, dates);
assert(skiPrompt.user.includes("Avalanche conditions are the PRIMARY"), "Ski Touring prompt emphasizes avalanche");

const backpackingPrompt = promptForActivity("Backpacking", mockConditions, location, dates);
assert(backpackingPrompt.user.includes("Water availability and stream crossing"), "Backpacking prompt emphasizes water/streams");

const mountaineeringPrompt = promptForActivity("Mountaineering", mockConditions, location, dates);
assert(mountaineeringPrompt.user.includes("Weather windows and altitude"), "Mountaineering prompt emphasizes weather windows");

const trailRunPrompt = promptForActivity("Trail Running", mockConditions, location, dates);
assert(trailRunPrompt.user.includes("Heat exposure, hydration"), "Trail Running prompt emphasizes heat/hydration");

const dayHikePrompt = promptForActivity("Day Hike", mockConditions, location, dates);
assert(dayHikePrompt.user.includes("Weather exposure and afternoon thunderstorm"), "Day Hike prompt emphasizes weather exposure");

console.log("\n=== Prompt Output Sample (Ski Touring) ===\n");
console.log("--- SYSTEM PROMPT (first 300 chars) ---");
console.log(skiPrompt.system.slice(0, 300));
console.log("\n--- USER PROMPT ---");
console.log(skiPrompt.user);

// ── Optional API test ───────────────────────────────────────────────

async function runApiTest() {
  if (!process.argv.includes("--api")) return;

  console.log("\n=== Claude API Test ===\n");
  const briefingModule = await import("../src/lib/synthesis/briefing");

  try {
    console.log("Calling Claude API (claude-sonnet-4-20250514)...");
    const start = Date.now();
    const narrative = await briefingModule.generateBriefingText(
      mockConditions,
      "Ski Touring",
      location,
      dates,
    );
    const elapsed = Date.now() - start;

    console.log(`\nResponse received in ${elapsed}ms (${narrative.length} chars)\n`);
    console.log("--- NARRATIVE ---");
    console.log(narrative);
    console.log("--- END ---\n");

    assert(narrative.length > 200, `API: narrative is substantial (${narrative.length} chars)`);
    assert(narrative.toLowerCase().includes("avalanche") || narrative.toLowerCase().includes("avy"), "API: narrative mentions avalanche");
    assert(narrative.toLowerCase().includes("wind") || narrative.toLowerCase().includes("weather"), "API: narrative mentions weather/wind");

    console.log("\nGenerating Backpacking briefing for comparison...");
    const backpackNarrative = await briefingModule.generateBriefingText(
      mockConditions,
      "Backpacking",
      location,
      dates,
    );
    console.log("\n--- BACKPACKING NARRATIVE ---");
    console.log(backpackNarrative);
    console.log("--- END ---\n");

    assert(backpackNarrative !== narrative, "API: different activities produce different narratives");
  } catch (err) {
    console.error("API test failed:", err);
    failed++;
  }
}

runApiTest().then(() => {
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
});
