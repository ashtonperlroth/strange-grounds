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

export interface BriefingResult {
  narrative: string;
  readiness: "green" | "yellow" | "red";
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

// ── Core generation function ────────────────────────────────────────

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 1200;

export async function generateBriefingText(
  conditions: ConditionsBundle,
  activity: Activity,
  location: BriefingLocation,
  dates: BriefingDates,
): Promise<string> {
  const { system, user } = promptForActivity(activity, conditions, location, dates);

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

  return textBlock.text;
}

// ── Full briefing pipeline ──────────────────────────────────────────

export async function generateBriefing(
  conditions: ConditionsBundle,
  activity: Activity,
  location: BriefingLocation,
  dates: BriefingDates,
): Promise<BriefingResult> {
  const readiness = computeReadiness(conditions);
  const conditionCards = buildConditionCards(conditions);
  const narrative = await generateBriefingText(conditions, activity, location, dates);

  return {
    narrative,
    readiness,
    conditionCards,
  };
}
