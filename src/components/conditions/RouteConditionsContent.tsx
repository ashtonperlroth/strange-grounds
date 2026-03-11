import Link from "next/link";
import {
  Mountain,
  TrendingUp,
  TrendingDown,
  Shield,
  ArrowRight,
  MapPin,
  Clock,
  Ruler,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PopularRoute, PopularRouteWaypoint } from "@/lib/types/popular-route";
import type { RouteBriefing, RouteBriefingData } from "@/lib/conditions/queries";
import { StaticRouteMap } from "@/components/conditions/StaticRouteMap";
import { ConditionsElevationProfile } from "@/components/conditions/ConditionsElevationProfile";

const ACTIVITY_LABELS: Record<string, string> = {
  backpacking: "Backpacking",
  ski_touring: "Ski Touring",
  mountaineering: "Mountaineering",
  trail_running: "Trail Running",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-100 text-green-700",
  moderate: "bg-amber-100 text-amber-700",
  strenuous: "bg-orange-100 text-orange-700",
  expert: "bg-red-100 text-red-700",
};

const READINESS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  green: {
    label: "GO",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  yellow: {
    label: "CAUTION",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  orange: {
    label: "CAUTION",
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  red: {
    label: "CONCERN",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const WAYPOINT_ICONS: Record<string, string> = {
  start: "🟢",
  end: "🔴",
  camp: "⛺",
  pass: "🏔️",
  water: "💧",
  summit: "🏔️",
  waypoint: "📍",
};

const CARD_STATUS_STYLES: Record<string, { bg: string; border: string; dot: string }> = {
  good: { bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500" },
  caution: { bg: "bg-yellow-50", border: "border-yellow-200", dot: "bg-yellow-500" },
  concern: { bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500" },
  unknown: { bg: "bg-stone-50", border: "border-stone-200", dot: "bg-stone-400" },
  unavailable: { bg: "bg-stone-50", border: "border-stone-200", dot: "bg-stone-300" },
};

const CATEGORY_LABELS: Record<string, string> = {
  weather: "Weather",
  avalanche: "Avalanche",
  snowpack: "Snowpack",
  stream_crossings: "Stream Crossings",
  fires: "Fires",
  daylight: "Daylight",
};

function metersToMiles(m: number): string {
  return (m * 0.000621371).toFixed(1);
}

function metersToFeet(m: number): string {
  return Math.round(m * 3.28084).toLocaleString();
}

interface RouteConditionsContentProps {
  route: PopularRoute;
  waypoints: PopularRouteWaypoint[];
  briefing: RouteBriefing | null;
}

function ReadinessBadge({ readiness }: { readiness: string | null }) {
  if (!readiness) return null;
  const config = READINESS_CONFIG[readiness];
  if (!config) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold",
        config.bg,
        config.text,
        config.border,
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          readiness === "green"
            ? "bg-emerald-500"
            : readiness === "yellow"
              ? "bg-yellow-500"
              : readiness === "orange"
                ? "bg-orange-500"
                : "bg-red-500",
        )}
      />
      {config.label}
    </span>
  );
}

function ConditionCardGrid({ briefingData }: { briefingData: RouteBriefingData }) {
  const cards = briefingData.conditionCards ?? [];
  if (cards.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const styles = CARD_STATUS_STYLES[card.status] ?? CARD_STATUS_STYLES.unknown;
        return (
          <div
            key={card.category}
            className={cn(
              "rounded-lg border p-4",
              styles.bg,
              styles.border,
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn("size-2 rounded-full", styles.dot)} />
              <span className="text-sm font-semibold text-stone-700">
                {CATEGORY_LABELS[card.category] ?? card.category}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-stone-600">{card.summary}</p>
            {card.detail && (
              <p className="mt-1 text-xs text-stone-500">{card.detail}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function RouteConditionsContent({
  route,
  waypoints,
  briefing,
}: RouteConditionsContentProps) {
  const sortedWaypoints = [...waypoints].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  const briefingData = briefing?.briefingData;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Hero */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge
            variant="secondary"
            className="bg-stone-100 text-xs text-stone-600"
          >
            {ACTIVITY_LABELS[route.activity] ?? route.activity}
          </Badge>
          <Badge
            variant="secondary"
            className={cn("text-xs", DIFFICULTY_COLORS[route.difficulty])}
          >
            {route.difficulty.charAt(0).toUpperCase() +
              route.difficulty.slice(1)}
          </Badge>
          <ReadinessBadge readiness={briefing?.readiness ?? null} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          {route.name}
        </h1>
        <p className="mt-1 text-lg text-stone-500">
          {route.region}, {route.state}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-8 lg:col-span-2">
          {/* Map */}
          <StaticRouteMap route={route} waypoints={waypoints} />

          {/* Elevation Profile */}
          <ConditionsElevationProfile route={route} waypoints={waypoints} />

          {/* Conditions Briefing */}
          {briefingData && (
            <section>
              <h2 className="mb-4 text-xl font-bold text-stone-800">
                Current Conditions
              </h2>

              {briefingData.bottomLine && (
                <div className="mb-6 rounded-lg border border-stone-200 bg-white p-5">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-stone-400">
                    Bottom Line
                  </h3>
                  <p className="text-base leading-relaxed text-stone-700">
                    {briefingData.bottomLine}
                  </p>
                </div>
              )}

              <ConditionCardGrid briefingData={briefingData} />

              {briefingData.narrative && (
                <div className="mt-6 rounded-lg border border-stone-200 bg-white p-5">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-400">
                    Full Briefing
                  </h3>
                  <div className="prose prose-stone prose-sm max-w-none">
                    {briefingData.narrative.split("\n").map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                </div>
              )}

              {briefingData.criticalSections &&
                briefingData.criticalSections.length > 0 && (
                  <div className="mt-6">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-400">
                      Critical Sections
                    </h3>
                    <div className="space-y-3">
                      {briefingData.criticalSections.map((section) => (
                        <div
                          key={section.segmentOrder}
                          className="rounded-lg border border-red-200 bg-red-50 p-4"
                        >
                          <p className="font-semibold text-red-800">
                            {section.title}
                          </p>
                          <p className="mt-1 text-sm text-red-700">
                            {section.whyCritical}
                          </p>
                          <p className="mt-2 text-sm font-medium text-red-800">
                            Recommendation: {section.recommendation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {briefingData.gearChecklist &&
                briefingData.gearChecklist.length > 0 && (
                  <div className="mt-6 rounded-lg border border-stone-200 bg-white p-5">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-400">
                      Recommended Gear
                    </h3>
                    <ul className="grid gap-1 sm:grid-cols-2">
                      {briefingData.gearChecklist.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-sm text-stone-600"
                        >
                          <span className="text-emerald-500">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </section>
          )}

          {!briefingData && (
            <div className="rounded-lg border border-stone-200 bg-white p-8 text-center">
              <p className="text-stone-500">
                Conditions briefing will be available soon. Check back shortly.
              </p>
            </div>
          )}

          {/* Waypoints */}
          {sortedWaypoints.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-bold text-stone-800">
                Waypoints
              </h2>
              <div className="space-y-2">
                {sortedWaypoints.map((wp, i) => (
                  <div
                    key={wp.id}
                    className="flex items-start gap-3 rounded-lg border border-stone-200 bg-white p-4"
                  >
                    <span className="mt-0.5 text-lg">
                      {WAYPOINT_ICONS[wp.waypointType] ?? "📍"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium text-stone-400">
                          {i + 1}.
                        </span>
                        <p className="font-medium text-stone-700">{wp.name}</p>
                      </div>
                      {wp.description && (
                        <p className="mt-0.5 text-sm text-stone-500">
                          {wp.description}
                        </p>
                      )}
                      {wp.elevationM != null && (
                        <p className="mt-0.5 text-xs text-stone-400">
                          {metersToFeet(wp.elevationM)} ft
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
              Route Details
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Ruler className="size-4 text-stone-400" />
                <div>
                  <p className="text-sm text-stone-500">Distance</p>
                  <p className="text-lg font-semibold text-stone-800">
                    {metersToMiles(route.totalDistanceM)} mi
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <TrendingUp className="size-4 text-stone-400" />
                <div>
                  <p className="text-sm text-stone-500">Elevation Gain</p>
                  <p className="text-lg font-semibold text-stone-800">
                    {metersToFeet(route.elevationGainM)} ft
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <TrendingDown className="size-4 text-stone-400" />
                <div>
                  <p className="text-sm text-stone-500">Elevation Loss</p>
                  <p className="text-lg font-semibold text-stone-800">
                    {metersToFeet(route.elevationLossM)} ft
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mountain className="size-4 text-stone-400" />
                <div>
                  <p className="text-sm text-stone-500">Max Elevation</p>
                  <p className="text-lg font-semibold text-stone-800">
                    {metersToFeet(route.maxElevationM)} ft
                  </p>
                </div>
              </div>
              {route.estimatedDays && (
                <div className="flex items-center gap-3">
                  <Clock className="size-4 text-stone-400" />
                  <div>
                    <p className="text-sm text-stone-500">Estimated Days</p>
                    <p className="text-lg font-semibold text-stone-800">
                      {route.estimatedDays}
                    </p>
                  </div>
                </div>
              )}
              {route.trailheadName && (
                <div className="flex items-center gap-3">
                  <MapPin className="size-4 text-stone-400" />
                  <div>
                    <p className="text-sm text-stone-500">Trailhead</p>
                    <p className="text-sm font-medium text-stone-700">
                      {route.trailheadName}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Season */}
          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-400">
              Best Season
            </h3>
            <div className="flex flex-wrap gap-1">
              {MONTH_NAMES.map((name, i) => (
                <span
                  key={name}
                  className={cn(
                    "rounded px-2 py-0.5 text-xs font-medium",
                    route.bestMonths.includes(i + 1)
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-stone-100 text-stone-400",
                  )}
                >
                  {name}
                </span>
              ))}
            </div>
            {route.seasonNotes && (
              <p className="mt-3 text-sm text-stone-500">
                {route.seasonNotes}
              </p>
            )}
          </div>

          {/* Permits */}
          {route.permitRequired && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-800">
                  Permit Required
                </h3>
              </div>
              {route.permitInfo && (
                <p className="mt-2 text-sm text-amber-700">
                  {route.permitInfo}
                </p>
              )}
            </div>
          )}

          {/* Description */}
          {route.description && (
            <div className="rounded-lg border border-stone-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-400">
                About This Route
              </h3>
              <p className="text-sm leading-relaxed text-stone-600">
                {route.description}
              </p>
            </div>
          )}

          {/* CTA */}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
            <h3 className="text-lg font-bold text-emerald-900">
              Plan This Route
            </h3>
            <p className="mt-1 text-sm text-emerald-700">
              Get a personalized conditions briefing with detailed analysis for
              your trip dates.
            </p>
            <Button
              asChild
              className="mt-4 w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-500"
            >
              <Link href={`/?route=${route.slug}`}>
                Plan This Route
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          {route.timesCloned > 0 && (
            <p className="text-center text-xs text-stone-400">
              Planned by {route.timesCloned}{" "}
              {route.timesCloned === 1 ? "user" : "users"}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
