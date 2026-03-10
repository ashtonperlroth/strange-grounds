import Anthropic from "@anthropic-ai/sdk";
import type { Activity } from "@/stores/planning-store";
import type { ConditionsBundle } from "./conditions";
import { computeReadiness, buildConditionCards } from "./conditions";
import { promptForActivity, promptForRouteActivity } from "./prompts";
import type { RoutePromptData } from "./prompts";
import type { ConditionCardData } from "@/stores/briefing-store";
import type {
  RouteAwareSynthesisResult,
  RouteAwareBriefing,
  OverallReadiness,
} from "@/lib/types/route-briefing";

// ── Types ───────────────────────────────────────────────────────────

interface BriefingLocation {
  lat: number;
  lng: number;
  name: string | null;
}

interface BriefingDates {
  start: string;
  end: string;
}

export interface SynthesisResult {
  bottomLine: string;
  narrative: string;
  readiness: "GREEN" | "YELLOW" | "RED";
  readinessRationale: string;
}

export interface BriefingResult {
  bottomLine: string;
  narrative: string;
  readiness: "green" | "yellow" | "red";
  readinessRationale: string;
  conditionCards: ConditionCardData[];
}

// ── Client ──────────────────────────────────────────────────────────

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic();
  }
  return _client;
}

// ── JSON parsing ────────────────────────────────────────────────────

function parseSynthesisResponse(responseText: string): SynthesisResult {
  const cleaned = responseText.replace(/```json\n?|```\n?/g, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Failed to parse synthesis JSON: ${cleaned.slice(0, 200)}`,
    );
  }

  const obj = parsed as Record<string, unknown>;
  if (
    typeof obj.bottomLine !== "string" ||
    typeof obj.narrative !== "string" ||
    typeof obj.readiness !== "string" ||
    typeof obj.readinessRationale !== "string"
  ) {
    throw new Error(
      `Synthesis JSON missing required fields: ${JSON.stringify(Object.keys(obj))}`,
    );
  }

  const readiness = obj.readiness.toUpperCase();
  if (readiness !== "GREEN" && readiness !== "YELLOW" && readiness !== "RED") {
    throw new Error(`Invalid readiness value: ${obj.readiness}`);
  }

  return {
    bottomLine: obj.bottomLine,
    narrative: obj.narrative,
    readiness: readiness as "GREEN" | "YELLOW" | "RED",
    readinessRationale: obj.readinessRationale,
  };
}

// ── Core generation function ────────────────────────────────────────

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 1500;

export async function generateBriefingText(
  conditions: ConditionsBundle,
  activity: Activity,
  location: BriefingLocation,
  dates: BriefingDates,
  unavailableSources: string[] = [],
): Promise<SynthesisResult> {
  const { system, user } = promptForActivity(
    activity,
    conditions,
    location,
    dates,
    unavailableSources,
  );

  const client = getClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: user }],
    system,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude response contained no text content");
  }

  return parseSynthesisResponse(textBlock.text);
}

// ── Full briefing pipeline ──────────────────────────────────────────

export async function generateBriefing(
  conditions: ConditionsBundle,
  activity: Activity,
  location: BriefingLocation,
  dates: BriefingDates,
  unavailableSources: string[] = [],
): Promise<BriefingResult> {
  const fallbackReadiness = computeReadiness(conditions);
  const conditionCards = buildConditionCards(conditions, unavailableSources);
  const synthesis = await generateBriefingText(
    conditions,
    activity,
    location,
    dates,
    unavailableSources,
  );

  const readinessMap: Record<string, "green" | "yellow" | "red"> = {
    GREEN: "green",
    YELLOW: "yellow",
    RED: "red",
  };

  return {
    bottomLine: synthesis.bottomLine,
    narrative: synthesis.narrative,
    readiness: readinessMap[synthesis.readiness] ?? fallbackReadiness,
    readinessRationale: synthesis.readinessRationale,
    conditionCards,
  };
}

// ── Route-aware parsing ─────────────────────────────────────────────

const VALID_READINESS = new Set<OverallReadiness>(["green", "yellow", "orange", "red"]);

function parseRouteAwareSynthesisResponse(
  responseText: string,
): RouteAwareSynthesisResult {
  const cleaned = responseText.replace(/```json\n?|```\n?/g, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Failed to parse route-aware synthesis JSON: ${cleaned.slice(0, 200)}`,
    );
  }

  const obj = parsed as Record<string, unknown>;
  if (typeof obj.bottomLine !== "string" || typeof obj.narrative !== "string") {
    throw new Error(
      `Route-aware synthesis JSON missing required fields: ${JSON.stringify(Object.keys(obj))}`,
    );
  }

  const readiness = (
    typeof obj.overallReadiness === "string"
      ? obj.overallReadiness.toLowerCase()
      : "yellow"
  ) as OverallReadiness;

  return {
    bottomLine: obj.bottomLine,
    overallReadiness: VALID_READINESS.has(readiness) ? readiness : "yellow",
    routeWalkthrough: Array.isArray(obj.routeWalkthrough)
      ? obj.routeWalkthrough.map((s: Record<string, unknown>) => ({
          segmentOrder: typeof s.segmentOrder === "number" ? s.segmentOrder : 0,
          mileRange: typeof s.mileRange === "string" ? s.mileRange : "",
          title: typeof s.title === "string" ? s.title : "",
          narrative: typeof s.narrative === "string" ? s.narrative : "",
          hazardLevel: typeof s.hazardLevel === "string" ? s.hazardLevel : "low",
          keyCallouts: Array.isArray(s.keyCallouts)
            ? s.keyCallouts.filter((c: unknown): c is string => typeof c === "string")
            : [],
          timingAdvice: typeof s.timingAdvice === "string" ? s.timingAdvice : null,
        }))
      : [],
    criticalSections: Array.isArray(obj.criticalSections)
      ? obj.criticalSections.map((s: Record<string, unknown>) => ({
          segmentOrder: typeof s.segmentOrder === "number" ? s.segmentOrder : 0,
          title: typeof s.title === "string" ? s.title : "",
          whyCritical: typeof s.whyCritical === "string" ? s.whyCritical : "",
          recommendation: typeof s.recommendation === "string" ? s.recommendation : "",
        }))
      : [],
    alternativeRoutes: Array.isArray(obj.alternativeRoutes)
      ? obj.alternativeRoutes.map((r: Record<string, unknown>) => ({
          description: typeof r.description === "string" ? r.description : "",
          benefit: typeof r.benefit === "string" ? r.benefit : "",
        }))
      : null,
    gearChecklist: Array.isArray(obj.gearChecklist)
      ? obj.gearChecklist.filter((g: unknown): g is string => typeof g === "string")
      : [],
    narrative: obj.narrative,
  };
}

// ── Route-aware generation ──────────────────────────────────────────

const ROUTE_MAX_TOKENS = 3000;

export async function generateRouteAwareBriefingText(
  conditions: ConditionsBundle,
  activity: Activity,
  location: BriefingLocation,
  dates: BriefingDates,
  routeData: RoutePromptData,
  unavailableSources: string[] = [],
): Promise<RouteAwareSynthesisResult> {
  const { system, user } = promptForRouteActivity(
    activity,
    conditions,
    location,
    dates,
    routeData,
    unavailableSources,
  );

  const client = getClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: ROUTE_MAX_TOKENS,
    messages: [{ role: "user", content: user }],
    system,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude response contained no text content");
  }

  return parseRouteAwareSynthesisResponse(textBlock.text);
}

export async function generateRouteAwareBriefing(
  conditions: ConditionsBundle,
  activity: Activity,
  location: BriefingLocation,
  dates: BriefingDates,
  routeData: RoutePromptData,
  unavailableSources: string[] = [],
): Promise<RouteAwareBriefing> {
  const conditionCards = buildConditionCards(conditions, unavailableSources);
  const synthesis = await generateRouteAwareBriefingText(
    conditions,
    activity,
    location,
    dates,
    routeData,
    unavailableSources,
  );

  return {
    bottomLine: synthesis.bottomLine,
    overallReadiness: synthesis.overallReadiness,
    routeWalkthrough: synthesis.routeWalkthrough,
    criticalSections: synthesis.criticalSections,
    alternativeRoutes: synthesis.alternativeRoutes,
    gearChecklist: synthesis.gearChecklist,
    narrative: synthesis.narrative,
    conditionCards,
  };
}
