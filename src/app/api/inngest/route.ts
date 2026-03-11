import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { generateBriefing } from "@/lib/inngest/functions/generate-briefing";
import { refreshRouteBriefings } from "@/lib/inngest/functions/refresh-route-briefings";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateBriefing, refreshRouteBriefings],
});
