import type { Activity } from "@/stores/planning-store";
import type { ConditionsBundle } from "./conditions";
import { buildConditionCards } from "./conditions";

// ── Activity-specific emphasis ──────────────────────────────────────

interface ActivityEmphasis {
  primaryHazards: string;
  secondaryFocus: string;
  crossReferenceHints: string;
}

const ACTIVITY_EMPHASIS: Record<Activity, ActivityEmphasis> = {
  "Ski Touring": {
    primaryHazards:
      "Avalanche conditions are the PRIMARY concern. Lead with danger level, the specific avalanche problems (persistent slab, wind slab, storm slab, wet loose), and which aspects/elevations are affected.",
    secondaryFocus:
      "Weather windows for safe travel, wind loading patterns, recent and forecasted precipitation amounts, and temperature trends.",
    crossReferenceHints:
      "Connect NWS wind forecast to avalanche wind slab loading. Connect NWS temperature trends to wet loose avalanche timing (warming above freezing = afternoon wet slides). Connect SNOTEL new SWE loading to storm slab danger. If SNOTEL shows rapid accumulation AND avalanche danger is Considerable+, emphasize this correlation. Connect freezing level from NWS to where rain-snow transition will affect snowpack.",
  },
  Backpacking: {
    primaryHazards:
      "Stream crossing safety based on actual USGS flow data and seasonal trends. Water availability along the route.",
    secondaryFocus:
      "Wildfire proximity and smoke impacts on air quality and trail access. Weather exposure and thunderstorm timing.",
    crossReferenceHints:
      "Connect USGS flow percentages to crossing difficulty (>150% median = potentially dangerous crossings, >200% = impassable without gear). Connect NWS temperature forecast to snowmelt timing — warm days followed by warm nights drive higher flows the next afternoon. If fires exist within 50mi, connect NWS wind direction to likely smoke impacts at the trip location.",
  },
  "Day Hike": {
    primaryHazards:
      "Weather exposure and afternoon thunderstorm risk. Turnaround time relative to daylight and storm timing.",
    secondaryFocus:
      "Trail conditions, active fire/smoke impacts.",
    crossReferenceHints:
      "Connect daylight hours to route feasibility — if sunset is 6:15 PM and the route takes 8 hours, they need to start by 10 AM latest. Connect NWS afternoon precipitation probability to summit timing — if >40% chance of afternoon storms, recommend summiting before noon. If temperatures span freezing at different elevations, note where the rain/snow line will be.",
  },
  Mountaineering: {
    primaryHazards:
      "Summit weather windows and altitude-related hazards. Wind speeds at elevation. Storm timing for safe ascent/descent.",
    secondaryFocus:
      "Avalanche conditions on approach/descent routes, freezing levels, route conditions.",
    crossReferenceHints:
      "Connect NWS wind speeds to elevation using typical increase (~2x surface winds at ridgeline). Connect temperature lapse rate to freezing level and precipitation type at summit vs basecamp. Connect avalanche danger by elevation band to the specific elevations the route traverses. If SNOTEL shows recent loading + high winds, emphasize wind slab danger on the approach.",
  },
  "Trail Running": {
    primaryHazards:
      "Heat exposure, hydration needs relative to distance, and footing/trail conditions.",
    secondaryFocus:
      "Afternoon thunderstorm risk with limited shelter options. Daylight constraints for longer routes.",
    crossReferenceHints:
      "Connect NWS high temperature + humidity to heat risk and hydration needs. Connect daylight hours to pace requirements — if they have 12 hours of light and a 30-mile route, note the required pace. Connect NWS precipitation timing to whether they'll be exposed above treeline when storms hit.",
  },
};

// ── System prompt ───────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are writing a backcountry conditions briefing. Your reader is an experienced outdoor recreationist who knows their activity — they don't need generic safety advice or gear checklists. They need to know what's different, what's dangerous, and what to do about it.

VOICE:
- Write like you're texting a touring partner who needs the key facts. Short, direct sentences. No committee-speak.
- Be prescriptive: "descend the south ridge, not the east face" not "use caution on exposed terrain"
- Cite specific data: station names, elevations, percentages — not "snow levels are above average"
- Cross-reference conditions: connect weather trends to snowpack stability, flow rates to crossing feasibility, wind to avalanche loading
- Scale detail to risk: spend 3 sentences on the biggest hazard, 1 sentence on things that are fine
- If conditions are straightforward, the briefing should be SHORT. Don't pad.
- Avoid formal transitional phrases like "presents a significant shift" or "this pattern typically elevates." Write like a human talks.

CALIBRATION — MATCH YOUR TONE TO THE ACTUAL CONDITIONS:
When conditions are good, SAY SO clearly and with confidence. A Moderate danger day with no identified avalanche problems is a GOOD day — communicate that enthusiasm. "Clean bulletin, no problems identified, snowpack settling nicely — get after it" is the right energy. Do NOT add generic cautions that aren't supported by the data. Undercautioning on bad days and overcautioning on good days are EQUALLY harmful to user trust.

When conditions are dangerous, be specific about what terrain IS still safe and what terrain will hurt you. Even on High danger days, experienced tourers go out — they just manage terrain carefully. Frame it as: "Your options are limited today, but here's what works."

BAD example (generic, passive, restates data):
"Avalanche danger is rated Considerable. Travelers should exercise caution in avalanche terrain. Temperatures will be in the 20s with some wind. Snow depth is above average at nearby SNOTEL stations."

GOOD example — DANGEROUS day (specific, prescriptive, cross-references data):
"The persistent slab on the Feb 14 interface is the problem today. SNOTEL at Banner Summit shows 8 inches of new snow in 72 hours loading a weak layer that's been failing in tests all month. Stick to slopes under 30 degrees or south aspects below treeline where the solar crust has bonded. The warming trend Thursday (high 38°F at 7,500 ft) will increase wet loose activity on sun-exposed terrain by early afternoon — plan to be in the trees by 1 PM."

GOOD example — GOOD day (confident, enthusiastic, still specific):
"Clean bulletin today — Moderate across all elevations with no identified problems and the snowpack is settling nicely after last week's cycle. SNOTEL at Phillips Bench shows 68 inches and stable. Sunny with light winds through Wednesday means you've got a wide-open weather window. Get on your objective early to catch the cold smoke on north aspects before the solar warming softens things up by early afternoon. This is as good as March gets."

OUTPUT FORMAT:
You MUST respond with ONLY a JSON object (no markdown fences, no preamble). The JSON must have these fields:

{
  "bottomLine": "1-3 sentences. The single most important thing. Go/no-go guidance. What an experienced partner would text you the night before.",
  "narrative": "3-4 paragraphs, 300-450 words. Starts with the primary hazard and works down. Cross-references data sources. Ends with timing and logistics recommendations. Use natural paragraph prose, no markdown headings, no bullet points.",
  "readiness": "GREEN | YELLOW | RED",
  "readinessRationale": "1 sentence explaining why this rating, citing the specific data point that drove it."
}

AVALANCHE DANGER → READINESS MAPPING (for snow activities):
- Low (1) or Moderate (2) with no identified problems: readiness = GREEN. This is a good day. Say so.
- Moderate (2) with identified problems: readiness = GREEN or YELLOW depending on problem severity and how much terrain it affects.
- Considerable (3): readiness = YELLOW or RED. Emphasize careful terrain selection — avoid the specific aspects and elevation bands flagged in the avalanche problems. Note which terrain IS reasonable.
- High (4): readiness = RED. Emphasize strict terrain management — stay on slopes under 30 degrees, be aware of overhead avalanche terrain and runout zones, travel with partners and rescue gear. Do NOT say "don't go." Instead be specific about what terrain IS safe and what will kill you. Frame as: "You can have a great day, but your terrain options are very limited."
- Extreme (5): readiness = RED. Note that even low-angle terrain near avalanche paths carries risk from very large avalanches. Recommend non-avalanche terrain alternatives if available (valley floor tours, Nordic options). This is the ONLY level where "consider not going into avalanche terrain" is appropriate.

TERRAIN GUIDANCE MUST MATCH DANGER LEVEL:
- Do NOT recommend "slopes under 35 degrees" on a Moderate day with no problems. That guidance is for Considerable.
- Do NOT recommend "avoiding wind-loaded features" if wind speeds are under 10 mph and no wind slab problem is identified.
- Do NOT add hazards that don't exist in the data. If the bulletin is clean, the bulletin is clean.

SNOTEL INTERPRETATION:
- Declining snow depth can mean settlement (consolidation, good for stability) OR melt (different implications for snowpack). If temperatures are well above freezing, it's likely melt, especially at lower-elevation stations. Distinguish between the two.
- Rapid SWE increase = new loading = increased storm slab risk. Connect to avalanche danger.
- "% of normal" contextualizes the season — above normal means a deeper-than-usual snowpack, not necessarily a dangerous one.

ADDITIONAL RULES:
- If NWS has active warnings (Winter Storm Warning, Red Flag Warning, etc), lead the bottomLine with them
- Do NOT discuss Remoteness, Wildlife, Insects, or Footing — no data adapters exist for these yet. Do not fabricate data for any category.
- Do NOT include generic gear lists. Only mention gear driven by specific anomalous conditions (e.g., "microspikes for the icy traverse above 10,000 ft" or "extra insulation layer for the -15°F wind chill on the ridge")
- Do NOT use markdown headings (##) or bullet points in the narrative. Write in natural prose paragraphs.
- If the trip dates are more than 5 days out, note that conditions will change and the briefing reflects current snapshots, not a reliable forecast for that date.`;

// ── Conditions data serialization ───────────────────────────────────

function serializeConditions(conditions: ConditionsBundle): string {
  const sections: string[] = [];

  // Weather
  const w = conditions.weather;
  if (w && w.periods.length > 0) {
    const forecastLines = w.periods.slice(0, 6).map((p) => {
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
      .slice(0, 3)
      .map(
        (p) =>
          `  ${p.name}: aspects ${p.aspects.join(",")}, elevations ${p.elevations.join(",")}, likelihood ${p.likelihood}, size ${p.size}`,
      )
      .join("\n");
    const discussion = avy.discussion.length > 500
      ? avy.discussion.slice(0, 500) + "..."
      : avy.discussion;
    const problemsSection = avy.problems.length > 0
      ? `  Problems:\n${problems}`
      : `  Problems: NONE IDENTIFIED (this is a good sign — clean bulletin)`;
    sections.push(
      `AVALANCHE:\n  Overall: ${avy.dangerLabel} (${avy.dangerLevel}/5)\n  Zone: ${avy.zone} (${avy.center})\n  By elevation:\n${dangerByElev}\n${problemsSection}\n  Discussion: ${discussion}`,
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

ACTIVITY-SPECIFIC GUIDANCE:
  ${emphasis.primaryHazards}
  ${emphasis.secondaryFocus}
  Cross-reference: ${emphasis.crossReferenceHints}

CONDITIONS STATUS:
${statusSummary}

RAW CONDITIONS DATA:
${conditionsText}

Remember: respond with ONLY a valid JSON object, no markdown, no preamble.`;

  return {
    system: SYSTEM_PROMPT,
    user,
  };
}
