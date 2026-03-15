import { inngest } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchNWS } from "@/lib/data-sources/nws";
import { fetchAvalanche } from "@/lib/data-sources/avalanche";
import { fetchUsgs } from "@/lib/data-sources/usgs";
import { fetchFires } from "@/lib/data-sources/fires";
import { detectMaterialChanges } from "@/lib/monitoring/change-detection";
import { sendConditionAlert } from "@/lib/email/condition-alert";
import type { NWSForecastData } from "@/lib/data-sources/nws";
import type { AvalancheData } from "@/lib/data-sources/avalanche";
import type { UsgsData } from "@/lib/data-sources/usgs";
import type { FireData } from "@/lib/data-sources/fires";

const TIMEOUT_MS = 8_000;
const AVALANCHE_TIMEOUT_MS = 10_000;

async function safeCall<T>(fn: () => Promise<T>, label: string, timeoutMs = TIMEOUT_MS): Promise<T | null> {
  try {
    return await Promise.race([
      fn(),
      new Promise<null>((resolve) =>
        setTimeout(() => {
          console.warn(`[monitor-trips][${label}] timed out after ${timeoutMs}ms`);
          resolve(null);
        }, timeoutMs),
      ),
    ]);
  } catch (err) {
    console.error(`[monitor-trips][${label}] failed:`, err);
    return null;
  }
}

function parseLocation(location: unknown): { lat: number; lng: number } {
  if (!location) return { lat: 0, lng: 0 };
  if (typeof location === "object" && location !== null) {
    const geo = location as Record<string, unknown>;
    if (geo.type === "Point" && Array.isArray(geo.coordinates)) {
      return { lng: geo.coordinates[0] as number, lat: geo.coordinates[1] as number };
    }
  }
  if (typeof location === "string") {
    const match = location.match(/POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/);
    if (match) return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
  }
  return { lat: 0, lng: 0 };
}

export const monitorTrips = inngest.createFunction(
  { id: "monitor-trips" },
  { cron: "0 13 * * *" }, // 6 AM Mountain Time (UTC-7) daily
  async ({ step }) => {
    const supabase = createAdminClient();

    // Find trips to monitor: saved, monitoring enabled, starting within 14 days
    const today = new Date().toISOString().split("T")[0];
    const twoWeeksOut = new Date(Date.now() + 14 * 86_400_000).toISOString().split("T")[0];

    const { data: trips } = await supabase
      .from("trips")
      .select("id, user_id, location_name, location, activity, start_date")
      .not("saved_at", "is", null)
      .eq("is_monitoring", true)
      .gte("start_date", today)
      .lte("start_date", twoWeeksOut);

    if (!trips?.length) {
      console.log("[monitor-trips] No trips to monitor");
      return { monitored: 0 };
    }

    console.log(`[monitor-trips] Monitoring ${trips.length} trips`);
    let alertsCreated = 0;

    for (const trip of trips) {
      await step.run(`monitor-${trip.id}`, async () => {
        const { lat, lng } = parseLocation(trip.location);
        if (!lat && !lng) {
          console.warn(`[monitor-trips] Skipping trip ${trip.id}: invalid location`);
          return;
        }

        // Get the most recent complete briefing for this trip
        const { data: latestBriefing } = await supabase
          .from("briefings")
          .select("conditions, raw_data")
          .eq("trip_id", trip.id)
          .eq("pipeline_status", "complete")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!latestBriefing) {
          console.log(`[monitor-trips] No previous briefing for trip ${trip.id}, skipping`);
          return;
        }

        const previousConditions = latestBriefing.conditions as Record<string, unknown>;

        // Fetch current conditions in parallel
        const [nws, avalanche, usgs, fires] = await Promise.all([
          safeCall(() => fetchNWS({ lat, lng }), "NWS"),
          safeCall(() => fetchAvalanche({ lat, lng }), "Avalanche", AVALANCHE_TIMEOUT_MS),
          safeCall(() => fetchUsgs({ lat, lng }), "USGS"),
          safeCall(() => fetchFires({ lat, lng }), "Fires"),
        ]);

        // Compare against previous conditions
        const detected = detectMaterialChanges(
          {
            nws: nws as NWSForecastData | null,
            avalanche: avalanche as AvalancheData | null,
            usgs: usgs as UsgsData | null,
            fires: fires as FireData | null,
          },
          {
            weather: previousConditions.weather as NWSForecastData | null,
            avalanche: previousConditions.avalanche as AvalancheData | null,
            streamFlow: previousConditions.streamFlow as UsgsData | null,
            fires: previousConditions.fires as FireData | null,
            routeAnalysis: (previousConditions.routeAnalysis as { segments?: Array<{ segmentOrder: number; hazardLevel: string }> } | null) ?? null,
          },
        );

        if (detected.length === 0) {
          console.log(`[monitor-trips] No material changes for trip ${trip.id}`);
          return;
        }

        // Store alerts
        const alertRows = detected.map((alert) => ({
          trip_id: trip.id,
          user_id: trip.user_id,
          category: alert.alertType,
          severity: alert.severity,
          title: alert.title,
          message: alert.description,
          previous_value: alert.previousValue,
          current_value: alert.currentValue,
          segment_order: alert.segmentOrder,
          is_read: false,
        }));

        const { error } = await supabase.from("alerts").insert(alertRows);
        if (error) {
          console.error(`[monitor-trips] Failed to insert alerts for trip ${trip.id}:`, error);
          return;
        }
        console.log(`[monitor-trips] Created ${alertRows.length} alerts for trip ${trip.id}`);
        alertsCreated += alertRows.length;

        // Send email notifications — fire-and-forget, non-blocking
        if (process.env.RESEND_API_KEY) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email_alerts_enabled")
            .eq("id", trip.user_id)
            .single();

          if (profile?.email_alerts_enabled !== false) {
            const { data: userRecord } = await supabase.auth.admin.getUserById(trip.user_id);
            const email = userRecord?.user?.email;
            if (email) {
              // Get most critical alert to lead with
              const critical = detected.find((a) => a.severity === "critical") ?? detected[0];

              // Get latest briefing share_token for deeplink
              const { data: latestBriefing } = await supabase
                .from("briefings")
                .select("share_token")
                .eq("trip_id", trip.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

              const briefingUrl = latestBriefing?.share_token
                ? `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://strange-grounds.vercel.app"}/briefing/${latestBriefing.share_token}`
                : null;

              await sendConditionAlert({
                to: email,
                tripName: trip.location_name,
                alertTitle: critical.title,
                alertDescription:
                  detected.length > 1
                    ? `${critical.description} (+ ${detected.length - 1} other change${detected.length > 2 ? "s" : ""})`
                    : critical.description,
                severity: critical.severity,
                previousValue: critical.previousValue,
                currentValue: critical.currentValue,
                segmentInfo: critical.segmentOrder != null ? `Segment ${critical.segmentOrder}` : null,
                briefingUrl,
              }).catch((err) => {
                console.error(`[monitor-trips] Failed to send email for trip ${trip.id}:`, err);
              });
            }
          }
        }
      });
    }

    return { monitored: trips.length, alertsCreated };
  },
);
