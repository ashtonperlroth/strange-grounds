'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Position } from 'geojson';
import { useRouteStore } from '@/stores/route-store';
import { computeElevationProfile } from '@/lib/routes/elevation';

interface ProfilePoint {
  distanceMi: number;
  elevationFt: number;
  position: Position;
}

export function ElevationProfile() {
  const waypoints = useRouteStore((s) => s.waypoints);
  const setProfileHoverPosition = useRouteStore((s) => s.setProfileHoverPosition);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfilePoint[]>([]);

  const routeCoordinates = useMemo(
    () =>
      [...waypoints]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((waypoint) => [
          waypoint.location.coordinates[0],
          waypoint.location.coordinates[1],
          waypoint.elevationM ?? undefined,
        ] as [number, number, number?]),
    [waypoints],
  );

  useEffect(() => {
    if (routeCoordinates.length < 2) {
      setProfile([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const computedProfile = await computeElevationProfile(routeCoordinates);
        if (cancelled) return;
        const nextProfile: ProfilePoint[] = computedProfile.points.map(
          (point, index) => ({
            position: [routeCoordinates[index][0], routeCoordinates[index][1]],
            distanceMi: point.distance * 0.000621371,
            elevationFt: Math.round(point.elevation * 3.28084),
          }),
        );
        setProfile(nextProfile);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load elevation profile');
          setProfile([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [routeCoordinates]);

  useEffect(
    () => () => {
      setProfileHoverPosition(null);
    },
    [setProfileHoverPosition],
  );

  if (routeCoordinates.length < 2) return null;

  return (
    <div className="absolute bottom-3 left-3 z-20 w-[min(560px,calc(100%-1.5rem))] rounded-lg border border-white/40 bg-black/75 p-3 text-white shadow-lg backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-white/80">
          Elevation profile
        </span>
        {collapsed ? <ChevronUp className="size-4 text-white/70" /> : <ChevronDown className="size-4 text-white/70" />}
      </button>

      {!collapsed && (
        <div className="mt-2 h-44">
          {loading ? (
            <div className="flex h-full items-center justify-center text-xs text-white/70">
              Loading elevation profile...
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center text-center text-xs text-red-200">
              {error}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={profile}
                margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                onMouseMove={(state: unknown) => {
                  const payload = (
                    state as {
                      activePayload?: Array<{ payload: ProfilePoint }>;
                    }
                  )?.activePayload?.[0]?.payload;
                  setProfileHoverPosition(payload?.position ?? null);
                }}
                onMouseLeave={() => setProfileHoverPosition(null)}
              >
                <defs>
                  <linearGradient id="elevationFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#6b7280" opacity={0.4} />
                <XAxis
                  dataKey="distanceMi"
                  tickFormatter={(value) => `${Number(value).toFixed(1)} mi`}
                  tick={{ fill: '#e5e7eb', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `${Math.round(Number(value))} ft`}
                  tick={{ fill: '#e5e7eb', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={58}
                />
                <Tooltip
                  formatter={(value: number | undefined) => [
                    `${Math.round(value ?? 0)} ft`,
                    'Elevation',
                  ]}
                  labelFormatter={(value) => `${Number(value).toFixed(2)} mi`}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #1f2937',
                    background: '#111827',
                    color: '#f9fafb',
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="elevationFt"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  fill="url(#elevationFill)"
                  activeDot={{ r: 5, strokeWidth: 2, fill: '#f59e0b', stroke: '#111827' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
