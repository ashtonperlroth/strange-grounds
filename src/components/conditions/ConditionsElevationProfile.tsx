"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PopularRoute, PopularRouteWaypoint } from "@/lib/types/popular-route";

interface ElevationPoint {
  distanceMi: number;
  elevationFt: number;
}

function buildElevationProfile(
  route: PopularRoute,
  waypoints: PopularRouteWaypoint[],
): ElevationPoint[] {
  const coords = route.geometry.coordinates;
  if (coords.length < 2) return [];

  const points: ElevationPoint[] = [];
  let totalDist = 0;

  for (let i = 0; i < coords.length; i++) {
    if (i > 0) {
      const [lng1, lat1] = coords[i - 1];
      const [lng2, lat2] = coords[i];
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDist += 6371000 * c;
    }

    const elevation = coords[i][2];
    if (elevation !== undefined) {
      points.push({
        distanceMi: totalDist * 0.000621371,
        elevationFt: Math.round(elevation * 3.28084),
      });
    }
  }

  if (points.length < 2 && waypoints.length >= 2) {
    let waypointDist = 0;
    const sorted = [...waypoints].sort((a, b) => a.sortOrder - b.sortOrder);
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0) {
        const [lng1, lat1] = sorted[i - 1].location.coordinates;
        const [lng2, lat2] = sorted[i].location.coordinates;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLng = ((lng2 - lng1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        waypointDist += 6371000 * c;
      }
      if (sorted[i].elevationM != null) {
        points.push({
          distanceMi: waypointDist * 0.000621371,
          elevationFt: Math.round(sorted[i].elevationM! * 3.28084),
        });
      }
    }
  }

  return points;
}

interface ConditionsElevationProfileProps {
  route: PopularRoute;
  waypoints: PopularRouteWaypoint[];
}

export function ConditionsElevationProfile({
  route,
  waypoints,
}: ConditionsElevationProfileProps) {
  const profile = useMemo(
    () => buildElevationProfile(route, waypoints),
    [route, waypoints],
  );

  if (profile.length < 2) return null;

  return (
    <section>
      <h2 className="mb-3 text-xl font-bold text-stone-800">
        Elevation Profile
      </h2>
      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={profile}
              margin={{ top: 5, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="conditionsElevFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e7e5e4"
                opacity={0.6}
              />
              <XAxis
                dataKey="distanceMi"
                tickFormatter={(v) => `${Number(v).toFixed(0)} mi`}
                tick={{ fill: "#a8a29e", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) => `${Math.round(Number(v)).toLocaleString()} ft`}
                tick={{ fill: "#a8a29e", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip
                formatter={(value: number | undefined) => [
                  `${Math.round(value ?? 0).toLocaleString()} ft`,
                  "Elevation",
                ]}
                labelFormatter={(v) => `${Number(v).toFixed(1)} mi`}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e7e5e4",
                  background: "#fff",
                  color: "#44403c",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="elevationFt"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#conditionsElevFill)"
                activeDot={{
                  r: 4,
                  strokeWidth: 2,
                  fill: "#10b981",
                  stroke: "#fff",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
