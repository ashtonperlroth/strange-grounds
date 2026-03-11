import { ImageResponse } from "next/og";
import { getRouteBySlug } from "@/lib/conditions/queries";

export const runtime = "edge";

const ACTIVITY_LABELS: Record<string, string> = {
  backpacking: "Backpacking",
  ski_touring: "Ski Touring",
  mountaineering: "Mountaineering",
  trail_running: "Trail Running",
};

const READINESS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  green: { bg: "#ecfdf5", text: "#059669", label: "GO" },
  yellow: { bg: "#fefce8", text: "#ca8a04", label: "CAUTION" },
  orange: { bg: "#fff7ed", text: "#ea580c", label: "CAUTION" },
  red: { bg: "#fef2f2", text: "#dc2626", label: "CONCERN" },
};

function metersToMiles(m: number): string {
  return (m * 0.000621371).toFixed(1);
}

function metersToFeet(m: number): string {
  return Math.round(m * 3.28084).toLocaleString();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
    const data = await getRouteBySlug(slug);

    if (!data) {
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
              Route not found
            </span>
          </div>
        ),
        { width: 1200, height: 630 },
      );
    }

    const { route, briefing } = data;
    const readiness = briefing?.readiness
      ? READINESS_COLORS[briefing.readiness]
      : null;

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
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: "#57534e",
                }}
              >
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
                    background: readiness.text,
                  }}
                />
                {readiness.label}
              </div>
            )}
          </div>

          {/* Route name */}
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
              {route.name}
            </span>
            <span
              style={{
                fontSize: 26,
                fontWeight: 400,
                color: "#78716c",
                marginTop: "8px",
              }}
            >
              {route.region}, {route.state}
            </span>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              gap: "32px",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span style={{ fontSize: 14, color: "#a8a29e", fontWeight: 500 }}>
                DISTANCE
              </span>
              <span
                style={{ fontSize: 28, fontWeight: 700, color: "#292524" }}
              >
                {metersToMiles(route.totalDistanceM)} mi
              </span>
            </div>
            <div
              style={{
                width: 1,
                height: 40,
                background: "#d6d3d1",
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span style={{ fontSize: 14, color: "#a8a29e", fontWeight: 500 }}>
                GAIN
              </span>
              <span
                style={{ fontSize: 28, fontWeight: 700, color: "#292524" }}
              >
                {metersToFeet(route.elevationGainM)} ft
              </span>
            </div>
            <div
              style={{
                width: 1,
                height: 40,
                background: "#d6d3d1",
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span style={{ fontSize: 14, color: "#a8a29e", fontWeight: 500 }}>
                ACTIVITY
              </span>
              <span
                style={{ fontSize: 28, fontWeight: 700, color: "#292524" }}
              >
                {ACTIVITY_LABELS[route.activity] ?? route.activity}
              </span>
            </div>
            {route.estimatedDays && (
              <>
                <div
                  style={{
                    width: 1,
                    height: 40,
                    background: "#d6d3d1",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      color: "#a8a29e",
                      fontWeight: 500,
                    }}
                  >
                    DAYS
                  </span>
                  <span
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: "#292524",
                    }}
                  >
                    {route.estimatedDays}
                  </span>
                </div>
              </>
            )}
            <div style={{ flex: 1 }} />
            <span
              style={{
                fontSize: 16,
                color: "#78716c",
                fontWeight: 500,
              }}
            >
              {route.difficulty.charAt(0).toUpperCase() +
                route.difficulty.slice(1)}
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
