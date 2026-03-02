import type { Activity } from "@/stores/planning-store";
import type { ConditionsBundle, Readiness } from "./conditions";
import { buildConditionCards, computeReadiness } from "./conditions";

// ── Activity-specific emphasis ──────────────────────────────────────

interface ActivityEmphasis {
  primaryHazards: string;
  secondaryFocus: string;
  gearPriorities: string;
}

const ACTIVITY_EMPHASIS: Record<Activity, ActivityEmphasis> = {
  "Ski Touring": {
    primaryHazards:
      "Avalanche conditions are the PRIMARY concern. Lead with avalanche danger, snowpack stability, and terrain choices. Evaluate danger ratings by elevation band and aspect.",
    secondaryFocus:
      "Weather windows for safe travel, wind loading, recent precipitation amounts, and temperature trends affecting snow stability.",
    gearPriorities:
      "Avalanche safety gear (beacon/shovel/probe), skins, ski crampons, layering for variable conditions.",
  },
  Backpacking: {
    primaryHazards:
      "Water availability and stream crossing safety are PRIMARY concerns. Evaluate stream flow levels, crossing feasibility, and water source reliability.",
    secondaryFocus:
      "Wildlife activity (bears, mountain lions), wildfire proximity and smoke, trail conditions including mud and snow coverage at elevation.",
    gearPriorities:
      "Water filtration, bear canister/hang, river crossing shoes, rain gear, traction devices if snow expected.",
  },
  "Day Hike": {
    primaryHazards:
      "Weather exposure and afternoon thunderstorm risk are PRIMARY concerns. Evaluate turnaround times and escape routes.",
    secondaryFocus:
      "Trail conditions, footing hazards, daylight available for the planned route, and any active fire/smoke impacts.",
    gearPriorities:
      "Rain layer, sun protection, adequate water, traction devices if icy, headlamp as backup.",
  },
  Mountaineering: {
    primaryHazards:
      "Weather windows and altitude-related hazards are PRIMARY concerns. Evaluate summit weather, wind speeds at elevation, and storm timing for safe ascent/descent windows.",
    secondaryFocus:
      "Avalanche conditions on approach and descent routes, snowpack stability, route conditions (ice, rock, mixed), and freezing levels.",
    gearPriorities:
      "Mountaineering boots, crampons, ice axe, helmet, rope team gear, emergency bivy, altitude medication if applicable.",
  },
  "Trail Running": {
    primaryHazards:
      "Heat exposure, hydration needs, and footing conditions are PRIMARY concerns. Evaluate temperatures, sun exposure, and trail surface conditions.",
    secondaryFocus:
      "Afternoon thunderstorm risk with limited shelter, stream crossing water levels, daylight constraints for longer routes.",
    gearPriorities:
      "Adequate hydration (carry capacity vs. resupply), electrolytes, sun protection, traction devices if mixed conditions.",
  },
};

// ── System prompt ───────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an experienced backcountry guide writing a conditions assessment in the style of Andrew Skurka — direct, opinionated, data-driven, and focused on actionable decision-making. You have decades of experience across all backcountry activities and an encyclopedic knowledge of mountain weather, snowpack, hydrology, and wilderness hazards.

Your writing style:
- Lead with what matters most for the specific activity and current conditions
- Be direct and specific — no hedging or generic advice
- Reference specific data points (temperatures, danger levels, flow rates) to support your assessment
- Provide timing and location context for hazards (e.g., "north-facing slopes above treeline" not just "some slopes")
- Write with the authority of someone who has been there and knows exactly what conditions mean for a trip
- Use natural paragraph prose, not bullet points — this is a briefing, not a checklist
- Keep it concise: 500-800 words. Every sentence should earn its place.

CRITICAL: Only discuss conditions categories for which real source data is provided below. The following categories do NOT have data source adapters yet and MUST NOT be discussed as if real data exists: Remoteness, Wildlife, Insects, Footing. Do not fabricate, estimate, or infer conditions for these categories. If you mention them at all, only note that data is not yet available.

Output structure (use as ## headings):
1. **Assessment** — Lead with the single most important thing the user needs to know. What's the go/no-go calculus?
2. **Weather Window** — When is the best window to be out? What's the timing of incoming systems?
3. **Primary Hazards** — The top 2-3 hazards with specific locations, elevations, aspects, and timing
4. **Notable Conditions** — Anything else worth knowing (snowpack, water, wildlife, fires)
5. **Gear & Logistics** — Specific gear recommendations driven by the conditions data, not generic lists`;

// ── Conditions data serialization ───────────────────────────────────

function serializeConditions(conditions: ConditionsBundle): string {
  const sections: string[] = [];

  // Weather
  const w = conditions.weather;
  if (w && w.periods.length > 0) {
    const forecastLines = w.periods.slice(0, 7).map((p) => {
      const precip = p.probabilityOfPrecipitation?.value ?? 0;
      return `  ${p.name}: ${p.temperature}°${p.temperatureUnit}, wind ${p.windSpeed} ${p.windDirection}, ${p.shortForecast}${precip > 0 ? `, ${precip}% precip` : ""}`;
    });
    sections.push(`WEATHER FORECAST:\n${forecastLines.join("\n")}`);
  } else {
    sections.push("WEATHER FORECAST: Data unavailable.");
  }
  if (w && w.alerts.length > 0) {
    const alertLines = w.alerts.map(
      (a) => `  ${a.event} (${a.severity}): ${a.headline}`,
    );
    sections.push(`WEATHER ALERTS:\n${alertLines.join("\n")}`);
  }

  // Avalanche
  const avy = conditions.avalanche;
  if (avy) {
    const dangerByElev = avy.dangerRatings
      .map((r) => `  ${r.elevation}: ${r.label} (${r.level}/5)`)
      .join("\n");
    const problems = avy.problems
      .map(
        (p) =>
          `  ${p.name}: aspects ${p.aspects.join(",")}, elevations ${p.elevations.join(",")}, likelihood ${p.likelihood}, size ${p.size}`,
      )
      .join("\n");
    sections.push(
      `AVALANCHE:\n  Overall: ${avy.dangerLabel} (${avy.dangerLevel}/5)\n  Zone: ${avy.zone} (${avy.center})\n  By elevation:\n${dangerByElev}\n  Problems:\n${problems}\n  Discussion: ${avy.discussion}`,
    );
  } else {
    sections.push("AVALANCHE: No avalanche forecast zone for this location.");
  }

  // Snowpack
  const sn = conditions.snowpack;
  if (sn && sn.stations.length > 0) {
    const stationLines = sn.stations.map((s) => {
      const depth = s.latest.snowDepthIn !== null ? `${s.latest.snowDepthIn}" depth` : "no depth";
      const swe = s.latest.sweIn !== null ? `${s.latest.sweIn}" SWE` : "no SWE";
      const elev = s.station.elevationM ? `${Math.round(s.station.elevationM * 3.281)} ft` : "";
      return `  ${s.station.name} (${elev}): ${depth}, ${swe}, trend ${s.trend}`;
    });
    const pctNorm = sn.summary.percentOfNormal !== null
      ? `${Math.round(sn.summary.percentOfNormal)}% of normal`
      : "N/A";
    sections.push(`SNOWPACK:\n  % of normal: ${pctNorm}\n${stationLines.join("\n")}`);
  } else {
    sections.push("SNOWPACK: No SNOTEL stations found within 50 km.");
  }

  // Stream Flow
  const st = conditions.streamFlow;
  if (st && st.stations.length > 0) {
    const gaugeLines = st.stations.map((s) => {
      const cfs = s.current.dischargeCfs !== null ? `${Math.round(s.current.dischargeCfs)} cfs` : "N/A";
      const pct = s.percentOfMedian !== null ? `${s.percentOfMedian}% of median` : "";
      return `  ${s.station.name}: ${cfs}${pct ? `, ${pct}` : ""}, trend ${s.trend}`;
    });
    sections.push(`STREAM FLOW:\n${gaugeLines.join("\n")}`);
  } else {
    sections.push("STREAM FLOW: No USGS gauges found within 30 km.");
  }

  // Fires
  const f = conditions.fires;
  if (f && f.nearbyCount > 0) {
    const fireLines = f.fires.map((fire) => {
      const acres = fire.acres !== null ? `${Math.round(fire.acres).toLocaleString()} acres` : "size unknown";
      const cont = fire.containment !== null ? `, ${fire.containment}% contained` : "";
      return `  ${fire.name}: ${acres}${cont}`;
    });
    sections.push(`ACTIVE FIRES (within 50 mi):\n${fireLines.join("\n")}`);
  } else {
    sections.push("ACTIVE FIRES: None within 50 miles.");
  }

  // Daylight
  const d = conditions.daylight;
  if (d) {
    sections.push(
      `DAYLIGHT:\n  Sunrise: ${d.sunrise}, Sunset: ${d.sunset}\n  Total daylight: ${d.daylightHours} hours\n  Golden hour: ${d.goldenHourStart}–${d.goldenHourEnd}`,
    );
  } else {
    sections.push("DAYLIGHT: Data unavailable.");
  }

  return sections.join("\n\n");
}

// ── Prompt assembly ─────────────────────────────────────────────────

interface PromptLocation {
  lat: number;
  lng: number;
  name: string | null;
}

interface PromptDates {
  start: string;
  end: string;
}

export interface AssembledPrompt {
  system: string;
  user: string;
}

export function promptForActivity(
  activity: Activity,
  conditions: ConditionsBundle,
  location: PromptLocation,
  dates: PromptDates,
): AssembledPrompt {
  const emphasis = ACTIVITY_EMPHASIS[activity];
  const cards = buildConditionCards(conditions);
  const readiness = computeReadiness(conditions);
  const readinessLabel = readinessToLabel(readiness);

  const statusSummary = cards
    .map((c) => `  ${c.category}: ${c.status.toUpperCase()} — ${c.summary}`)
    .join("\n");

  const conditionsText = serializeConditions(conditions);

  const locationLabel = location.name
    ? `${location.name} (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`
    : `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;

  const user = `Write a conditions briefing for a ${activity.toLowerCase()} trip.

TRIP DETAILS:
  Location: ${locationLabel}
  Dates: ${dates.start} to ${dates.end}
  Activity: ${activity}
  Overall readiness: ${readinessLabel}

ACTIVITY-SPECIFIC GUIDANCE:
  ${emphasis.primaryHazards}
  ${emphasis.secondaryFocus}
  Gear priorities: ${emphasis.gearPriorities}

CONDITIONS STATUS:
${statusSummary}

RAW CONDITIONS DATA:
${conditionsText}`;

  return {
    system: SYSTEM_PROMPT,
    user,
  };
}

function readinessToLabel(readiness: Readiness): string {
  switch (readiness) {
    case "green":
      return "GREEN — conditions are generally favorable";
    case "yellow":
      return "YELLOW — conditions require caution and preparation";
    case "red":
      return "RED — significant concerns, trip may need modification";
  }
}
