"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Mountain, TrendingUp, Clock, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RouteWithBriefing } from "@/lib/conditions/queries";

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

const READINESS_STYLES: Record<string, { bg: string; dot: string; label: string }> = {
  green: { bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500", label: "GO" },
  yellow: { bg: "bg-yellow-50 border-yellow-200", dot: "bg-yellow-500", label: "CAUTION" },
  orange: { bg: "bg-orange-50 border-orange-200", dot: "bg-orange-500", label: "CAUTION" },
  red: { bg: "bg-red-50 border-red-200", dot: "bg-red-500", label: "CONCERN" },
};

function metersToMiles(m: number): string {
  return (m * 0.000621371).toFixed(1);
}

function metersToFeet(m: number): string {
  return Math.round(m * 3.28084).toLocaleString();
}

interface ConditionsIndexContentProps {
  routes: RouteWithBriefing[];
  regions: string[];
  activities: string[];
}

export function ConditionsIndexContent({
  routes,
  regions,
  activities,
}: ConditionsIndexContentProps) {
  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return routes.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.route.name.toLowerCase().includes(q) &&
          !r.route.region.toLowerCase().includes(q) &&
          !r.route.state.toLowerCase().includes(q) &&
          !r.route.description.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (selectedRegion && r.route.region !== selectedRegion) return false;
      if (selectedActivity && r.route.activity !== selectedActivity) return false;
      return true;
    });
  }, [routes, search, selectedRegion, selectedActivity]);

  const grouped = useMemo(() => {
    const map = new Map<string, RouteWithBriefing[]>();
    for (const r of filtered) {
      const key = r.route.region;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div>
      {/* Search and filters */}
      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
          <Input
            type="text"
            placeholder="Search routes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedRegion(null)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              !selectedRegion
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50",
            )}
          >
            All Regions
          </button>
          {regions.map((region) => (
            <button
              key={region}
              type="button"
              onClick={() =>
                setSelectedRegion(selectedRegion === region ? null : region)
              }
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                selectedRegion === region
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50",
              )}
            >
              {region}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedActivity(null)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              !selectedActivity
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50",
            )}
          >
            All Activities
          </button>
          {activities.map((activity) => (
            <button
              key={activity}
              type="button"
              onClick={() =>
                setSelectedActivity(
                  selectedActivity === activity ? null : activity,
                )
              }
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                selectedActivity === activity
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50",
              )}
            >
              {ACTIVITY_LABELS[activity] ?? activity}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-white p-12 text-center">
          <Mountain className="mx-auto size-8 text-stone-300" />
          <p className="mt-3 text-sm font-medium text-stone-500">
            No routes match your filters
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSelectedRegion(null);
              setSelectedActivity(null);
            }}
            className="mt-2 text-sm text-emerald-600 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([region, regionRoutes]) => (
            <section key={region}>
              <h2 className="mb-3 text-lg font-bold text-stone-800">
                {region}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {regionRoutes.map(({ route, briefing }) => {
                  const readiness = briefing?.readiness;
                  const readinessStyle = readiness
                    ? READINESS_STYLES[readiness]
                    : null;
                  const bottomLine = briefing?.briefingData?.bottomLine;

                  return (
                    <Link
                      key={route.slug}
                      href={`/conditions/${route.slug}`}
                      className="group flex flex-col rounded-lg border border-stone-200 bg-white transition-shadow hover:shadow-md"
                    >
                      <div className="flex-1 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-stone-100 text-[10px] text-stone-600"
                          >
                            {ACTIVITY_LABELS[route.activity] ?? route.activity}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              DIFFICULTY_COLORS[route.difficulty],
                            )}
                          >
                            {route.difficulty.charAt(0).toUpperCase() +
                              route.difficulty.slice(1)}
                          </Badge>
                          {readinessStyle && (
                            <span
                              className={cn(
                                "ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                readinessStyle.bg,
                              )}
                            >
                              <span
                                className={cn(
                                  "size-1.5 rounded-full",
                                  readinessStyle.dot,
                                )}
                              />
                              {readinessStyle.label}
                            </span>
                          )}
                        </div>

                        <h3 className="font-semibold text-stone-800 group-hover:text-emerald-700">
                          {route.name}
                        </h3>
                        <p className="mt-0.5 text-xs text-stone-500">
                          {route.region}, {route.state}
                        </p>

                        {bottomLine && (
                          <p className="mt-2 line-clamp-2 text-xs text-stone-600">
                            {bottomLine}
                          </p>
                        )}

                        <div className="mt-3 flex items-center gap-3 text-xs text-stone-500">
                          <span className="flex items-center gap-1">
                            <Mountain className="size-3" />
                            {metersToMiles(route.totalDistanceM)} mi
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="size-3" />
                            {metersToFeet(route.elevationGainM)} ft
                          </span>
                          {route.estimatedDays && (
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {route.estimatedDays}d
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-stone-100 px-4 py-2.5">
                        <span className="text-xs font-medium text-emerald-600 group-hover:text-emerald-700">
                          View conditions
                        </span>
                        <ArrowRight className="size-3.5 text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
