import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "edge";

const ACTIVITY_LABELS: Record<string, string> = {
  backpacking: "Backpacking",
  ski_touring: "Ski Touring",
  mountaineering: "Mountaineering",
  trail_running: "Trail Running",
  hiking: "Hiking",
};

const READINESS_CONFIGS: Record<
  string,
  { bg: string; text: string; label: string; dot: string }
> = {
  green: { bg: "#ecfdf5", text: "#059669", label: "GO", dot: "#059669" },
  yellow: { bg: "#fefce8", text: "#ca8a04", label: "CAUTION", dot: "#ca8a04" },
  red: { bg: "#fef2f2", text: "#dc2626", label: "CONCERN", dot: "#dc2626" },
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  try {
    const admin = createAdminClient();

    const { data: briefing } = await admin
      .from("briefings")
      .select("readiness, bottom_line, trip_id")
      .eq("share_token", token)
      .single();

    if (!briefing) throw new Error("Not found");

    const { data: trip } = await admin
      .from("trips")
      .select("location_name, activity")
      .eq("id", briefing.trip_id)
      .single();

    const locationName = trip?.location_name ?? "Backcountry Trip";
    const activity = ACTIVITY_LABELS[trip?.activity ?? ""] ?? "Backcountry";
    const readiness = briefing.readiness
      ? READINESS_CONFIGS[briefing.readiness as string]
      : null;
    const bottomLine = briefing.bottom_line as string | null;

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background:
              "linear-gradient(135deg, #f5f0e8 0%, #e8e0d4 40%, #d1c8b8 100%)",
            fontFamily: "sans-serif",
            padding: "60px",
          }}
        >
          {/* Top bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "40px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#059669"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
              </svg>
              <span style={{ fontSize: 22, fontWeight: 600, color: "#57534e" }}>
                Strange Grounds
              </span>
            </div>
            {readiness && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: readiness.bg,
                  color: readiness.text,
                  padding: "8px 20px",
                  borderRadius: "999px",
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: readiness.dot,
                  }}
                />
                {readiness.label}
              </div>
            )}
          </div>

          {/* Location */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <span
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: "#1c1917",
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                maxWidth: "900px",
              }}
            >
              {locationName}
            </span>
            <span
              style={{
                fontSize: 26,
                fontWeight: 400,
                color: "#78716c",
                marginTop: "8px",
              }}
            >
              {activity} · Conditions Briefing
            </span>
            {bottomLine && (
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 400,
                  color: "#57534e",
                  marginTop: "20px",
                  maxWidth: "800px",
                  lineHeight: 1.5,
                }}
              >
                {bottomLine.length > 140
                  ? bottomLine.slice(0, 137) + "…"
                  : bottomLine}
              </span>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <span style={{ fontSize: 14, color: "#a8a29e" }}>
              strange-grounds.vercel.app
            </span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  } catch {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fafaf9",
            fontFamily: "sans-serif",
          }}
        >
          <span style={{ fontSize: 32, color: "#78716c" }}>
            Strange Grounds — Backcountry Conditions
          </span>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }
}
