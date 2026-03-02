import Anthropic from "@anthropic-ai/sdk";
import type { Activity } from "@/stores/planning-store";
import type { ConditionsBundle } from "./conditions";
import { computeReadiness, buildConditionCards } from "./conditions";
import { promptForActivity } from "./prompts";
import type { ConditionCardData } from "@/stores/briefing-store";

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
