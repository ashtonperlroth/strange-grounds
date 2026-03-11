import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { promptForActivity, promptForRouteActivity } from "@/lib/synthesis/prompts";
import type { RoutePromptData } from "@/lib/synthesis/prompts";
import type { ConditionsBundle } from "@/lib/synthesis/conditions";
import type { Activity } from "@/stores/planning-store";
import {
  parseSynthesisResponse,
  parseRouteAwareSynthesisResponse,
  MODEL,
  MAX_TOKENS,
  ROUTE_MAX_TOKENS,
} from "@/lib/synthesis/briefing";

export const runtime = "nodejs";
export const maxDuration = 120;

const PERIODIC_SAVE_CHARS = 500;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const briefingId = body?.briefingId as string | undefined;

  if (!briefingId) {
    return new Response("Missing briefingId", { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: briefing, error } = await supabase
    .from("briefings")
    .select("*")
    .eq("id", briefingId)
    .single();

  if (error || !briefing) {
    return new Response("Briefing not found", { status: 404 });
  }

  if (briefing.narrative && briefing.pipeline_status === "complete") {
    return Response.json({ narrative: briefing.narrative, cached: true });
  }

  const rawData = briefing.raw_data as Record<string, unknown> | null;
  const synthesisInput = rawData?.synthesisInput as Record<string, unknown> | undefined;
  if (!synthesisInput) {
    return new Response("Synthesis input not ready", { status: 425 });
  }

  const inputType = synthesisInput.type as string;
  const isRoute = inputType === "route";

  const { system, user } = isRoute
    ? promptForRouteActivity(
        synthesisInput.activity as Activity,
        synthesisInput.conditions as ConditionsBundle,
        synthesisInput.location as { lat: number; lng: number; name: string | null },
        synthesisInput.dates as { start: string; end: string },
        synthesisInput.route as RoutePromptData,
        (synthesisInput.unavailableSources as string[]) ?? [],
      )
    : promptForActivity(
        synthesisInput.activity as Activity,
        synthesisInput.conditions as ConditionsBundle,
        synthesisInput.location as { lat: number; lng: number; name: string | null },
        synthesisInput.dates as { start: string; end: string },
        (synthesisInput.unavailableSources as string[]) ?? [],
      );

  await supabase
    .from("briefings")
    .update({ pipeline_status: "streaming_narrative" })
    .eq("id", briefingId);

  const anthropic = new Anthropic();
  const maxTokens = isRoute ? ROUTE_MAX_TOKENS : MAX_TOKENS;
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });

  const encoder = new TextEncoder();
  let fullNarrative = "";
  let lastSaveLength = 0;

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const text = event.delta.text;
            fullNarrative += text;

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`),
            );

            if (fullNarrative.length - lastSaveLength > PERIODIC_SAVE_CHARS) {
              supabase
                .from("briefings")
                .update({
                  narrative: fullNarrative,
                  pipeline_status: "streaming_narrative",
                })
                .eq("id", briefingId)
                .then(() => {});
              lastSaveLength = fullNarrative.length;
            }
          }
        }

        // Parse the complete response to extract structured fields
        const finalUpdate: Record<string, unknown> = {
          pipeline_status: "complete",
          progress: { complete: true, synthesisReady: true },
        };

        try {
          if (isRoute) {
            const parsed = parseRouteAwareSynthesisResponse(fullNarrative);
            finalUpdate.narrative = parsed.narrative;
            finalUpdate.bottom_line = parsed.bottomLine;

            const existingConditions =
              (briefing.conditions as Record<string, unknown>) ?? {};
            finalUpdate.conditions = {
              ...existingConditions,
              routeWalkthrough: parsed.routeWalkthrough,
              criticalSections: parsed.criticalSections,
              alternativeRoutes: parsed.alternativeRoutes,
              gearChecklist: parsed.gearChecklist,
              overallReadiness: parsed.overallReadiness,
            };
          } else {
            const parsed = parseSynthesisResponse(fullNarrative);
            finalUpdate.narrative = parsed.narrative;
            finalUpdate.bottom_line = parsed.bottomLine;
            finalUpdate.readiness_rationale = parsed.readinessRationale;

            const readinessMap: Record<string, string> = {
              GREEN: "green",
              YELLOW: "yellow",
              RED: "red",
            };
            finalUpdate.readiness =
              readinessMap[parsed.readiness] ?? briefing.readiness;
          }
        } catch {
          // If structured parsing fails, save the raw narrative as-is
          finalUpdate.narrative = fullNarrative;
        }

        await supabase
          .from("briefings")
          .update(finalUpdate)
          .eq("id", briefingId);

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`),
        );
        controller.close();
      } catch (err) {
        console.error("[stream-narrative] Error:", err);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "Synthesis failed" })}\n\n`,
          ),
        );
        controller.close();

        await supabase
          .from("briefings")
          .update({
            pipeline_status: "failed",
            progress: { synthesisError: true },
          })
          .eq("id", briefingId);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
