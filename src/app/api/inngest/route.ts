import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { generateBriefing } from "@/lib/inngest/functions/generate-briefing";
import { refreshRouteBriefings } from "@/lib/inngest/functions/refresh-route-briefings";
import { monitorTrips } from "@/lib/inngest/functions/monitor-trips";

// Allow synthesis steps (Claude API calls) up to 5 minutes to complete
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateBriefing, refreshRouteBriefings, monitorTrips],
});
