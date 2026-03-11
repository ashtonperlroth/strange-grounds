'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Mountain,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Leaf,
  Snowflake,
  Shield,
  Play,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/lib/trpc/client';
import { trackClonePopularRoute } from '@/lib/analytics';
import { usePopularRoutesStore } from '@/stores/popular-routes-store';
import { useRouteStore } from '@/stores/route-store';
import { usePlanningStore } from '@/stores/planning-store';
import { useMapStore } from '@/stores/map-store';
import { cn } from '@/lib/utils';
import type {
  PopularRoute,
  PopularRouteWaypoint,
} from '@/lib/types/popular-route';
import type { Route, RouteWaypoint } from '@/lib/types/route';

const ACTIVITY_LABELS: Record<string, string> = {
  backpacking: 'Backpacking',
  ski_touring: 'Ski Touring',
  mountaineering: 'Mountaineering',
  trail_running: 'Trail Running',
};

const PLANNING_ACTIVITIES: Record<string, string> = {
  backpacking: 'Backpacking',
  ski_touring: 'Ski Touring',
  mountaineering: 'Mountaineering',
  trail_running: 'Trail Running',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  moderate: 'bg-amber-100 text-amber-700',
  strenuous: 'bg-orange-100 text-orange-700',
  expert: 'bg-red-100 text-red-700',
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const WAYPOINT_ICONS: Record<string, string> = {
  start: '🟢',
  end: '🔴',
  camp: '⛺',
  pass: '🏔️',
  water: '💧',
  summit: '🏔️',
  waypoint: '📍',
};

function metersToMiles(m: number): string {
  return (m * 0.000621371).toFixed(1);
}

function metersToFeet(m: number): string {
  return Math.round(m * 3.28084).toLocaleString();
}

function isInSeason(bestMonths: number[]): boolean {
  const currentMonth = new Date().getMonth() + 1;
  return bestMonths.includes(currentMonth);
}

interface ElevationProfilePoint {
  distanceMi: number;
  elevationFt: number;
}

function buildSimpleElevationProfile(
  route: PopularRoute,
  waypoints: PopularRouteWaypoint[],
): ElevationProfilePoint[] {
  const coords = route.geometry.coordinates;
  if (coords.length < 2) return [];

  const points: ElevationProfilePoint[] = [];
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

function convertToRouteWaypoints(
  routeId: string,
  waypoints: PopularRouteWaypoint[],
): RouteWaypoint[] {
  return [...waypoints]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((wp) => ({
      id: wp.id,
      routeId,
      sortOrder: wp.sortOrder,
      name: wp.name,
      location: wp.location,
      elevationM: wp.elevationM,
      waypointType: wp.waypointType === 'summit' ? 'waypoint' as const : wp.waypointType as RouteWaypoint['waypointType'],
      notes: wp.description,
    }));
}

interface PopularRouteDetailProps {
  slug: string;
  onBack: () => void;
}

export function PopularRouteDetail({ slug, onBack }: PopularRouteDetailProps) {
  const { data, isLoading, error } = trpc.popularRoutes.getBySlug.useQuery({ slug });
  const setPreviewRoute = usePopularRoutesStore((s) => s.setPreviewRoute);
  const { setRoute } = useRouteStore();
  const { setLocation, setActivity, setRouteContext } = usePlanningStore();
  const { flyTo } = useMapStore();
  const [isCloning, setIsCloning] = useState(false);
  const [showWaypoints, setShowWaypoints] = useState(false);

  useEffect(() => {
    if (data?.route) {
      setPreviewRoute(data.route);
    }
    return () => setPreviewRoute(null);
  }, [data?.route, setPreviewRoute]);

  useEffect(() => {
    if (!data?.route) return;
    const coords = data.route.geometry.coordinates;
    if (coords.length === 0) return;

    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const [lng, lat] of coords) {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }

    flyTo({
      center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
      zoom: 10,
    });
  }, [data?.route, flyTo]);

  const elevationProfile = useMemo(() => {
    if (!data) return [];
    return buildSimpleElevationProfile(data.route, data.waypoints);
  }, [data]);

  const handlePlanRoute = async () => {
    if (!data) return;
    setIsCloning(true);

    const route = data.route;
    const waypoints = data.waypoints;

    const routeObj: Route = {
      id: crypto.randomUUID(),
      tripId: null,
      name: route.name,
      description: route.description,
      geometry: route.geometry,
      totalDistanceM: route.totalDistanceM,
      elevationGainM: route.elevationGainM,
      elevationLossM: route.elevationLossM,
      maxElevationM: route.maxElevationM,
      minElevationM: route.minElevationM,
      activity: route.activity,
      source: 'popular_route',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const routeWaypoints = convertToRouteWaypoints(routeObj.id, waypoints);
    setRoute(routeObj, routeWaypoints);

    const coords = route.geometry.coordinates;
    if (coords.length > 0) {
      let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
      for (const [lng, lat] of coords) {
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
      const center = { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };

      setLocation({ lat: center.lat, lng: center.lng, name: route.name });
      setRouteContext({
        center,
        bbox: [minLng, minLat, maxLng, maxLat],
        geometry: route.geometry,
      });
    }

    const activityMap = PLANNING_ACTIVITIES[route.activity];
    if (activityMap) {
      setActivity(activityMap as Parameters<typeof setActivity>[0]);
    }

    setPreviewRoute(null);
    usePopularRoutesStore.getState().reset();
    setIsCloning(false);
    trackClonePopularRoute(route.name);
    toast.success(`${route.name} loaded`, {
      description: 'Edit the route or generate a briefing.',
    });
  };

  const handleGenerateBriefing = async () => {
    await handlePlanRoute();
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-stone-400">
        <Loader2 className="size-4 animate-spin text-emerald-600" />
        <span className="text-xs">Loading route...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <Mountain className="size-8 text-stone-300" />
        <p className="text-sm font-medium text-stone-500">Route not found</p>
        <Button variant="outline" size="sm" onClick={onBack}>
          Go Back
        </Button>
      </div>
    );
  }

  const { route, waypoints } = data;
  const inSeason = isInSeason(route.bestMonths);
  const sortedWaypoints = [...waypoints].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-1">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-medium text-stone-500 transition-colors hover:text-stone-800"
        >
          <ArrowLeft className="size-3.5" />
          Back to routes
        </button>

        <div>
          <h2 className="text-lg font-bold text-stone-800">{route.name}</h2>
          <p className="mt-0.5 text-sm text-stone-500">
            {route.region}, {route.state}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="secondary"
            className="bg-stone-100 text-xs text-stone-600"
          >
            {ACTIVITY_LABELS[route.activity] ?? route.activity}
          </Badge>
          <Badge
            variant="secondary"
            className={cn('text-xs', DIFFICULTY_COLORS[route.difficulty])}
          >
            {route.difficulty.charAt(0).toUpperCase() + route.difficulty.slice(1)}
          </Badge>
          {inSeason ? (
            <Badge
              variant="secondary"
              className="bg-emerald-50 text-xs text-emerald-700"
            >
              <Leaf className="size-3" />
              In Season
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="bg-stone-100 text-xs text-stone-500"
            >
              <Snowflake className="size-3" />
              Off Season
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <Mountain className="size-3.5" />
              Distance
            </div>
            <div className="mt-1 text-lg font-semibold text-stone-800">
              {metersToMiles(route.totalDistanceM)}{' '}
              <span className="text-xs font-normal text-stone-500">mi</span>
            </div>
          </div>
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <TrendingUp className="size-3.5" />
              Elevation Gain
            </div>
            <div className="mt-1 text-lg font-semibold text-stone-800">
              {metersToFeet(route.elevationGainM)}{' '}
              <span className="text-xs font-normal text-stone-500">ft</span>
            </div>
          </div>
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <TrendingDown className="size-3.5" />
              Elevation Loss
            </div>
            <div className="mt-1 text-lg font-semibold text-stone-800">
              {metersToFeet(route.elevationLossM)}{' '}
              <span className="text-xs font-normal text-stone-500">ft</span>
            </div>
          </div>
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <Calendar className="size-3.5" />
              Est. Days
            </div>
            <div className="mt-1 text-lg font-semibold text-stone-800">
              {route.estimatedDays ?? '—'}
            </div>
          </div>
        </div>

        {route.description && (
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-400">
              Description
            </h3>
            <p className="text-sm leading-relaxed text-stone-600">
              {route.description}
            </p>
          </div>
        )}

        <Separator className="bg-stone-200" />

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Season Info
          </h3>
          <div className="flex flex-wrap gap-1">
            {MONTH_NAMES.map((name, i) => (
              <span
                key={name}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-medium',
                  route.bestMonths.includes(i + 1)
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-stone-100 text-stone-400',
                )}
              >
                {name}
              </span>
            ))}
          </div>
          {route.seasonNotes && (
            <p className="mt-2 text-xs text-stone-500">{route.seasonNotes}</p>
          )}
        </div>

        {route.permitRequired && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <Shield className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-xs font-semibold text-amber-800">
                Permit Required
              </p>
              {route.permitInfo && (
                <p className="mt-0.5 text-xs text-amber-700">
                  {route.permitInfo}
                </p>
              )}
            </div>
          </div>
        )}

        {sortedWaypoints.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowWaypoints((v) => !v)}
              className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-stone-400"
            >
              Waypoints ({sortedWaypoints.length})
              {showWaypoints ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </button>
            {showWaypoints && (
              <div className="mt-2 space-y-1.5">
                {sortedWaypoints.map((wp) => (
                  <div
                    key={wp.id}
                    className="flex items-start gap-2 rounded-md border border-stone-100 bg-stone-50 px-2.5 py-2"
                  >
                    <span className="mt-0.5 text-sm">
                      {WAYPOINT_ICONS[wp.waypointType] ?? '📍'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-stone-700">
                        {wp.name}
                      </p>
                      {wp.description && (
                        <p className="mt-0.5 text-[11px] text-stone-500">
                          {wp.description}
                        </p>
                      )}
                      {wp.elevationM != null && (
                        <p className="mt-0.5 text-[10px] text-stone-400">
                          {metersToFeet(wp.elevationM)} ft
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {elevationProfile.length >= 2 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
              Elevation Profile
            </h3>
            <div className="h-40 rounded-lg border border-stone-200 bg-white p-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={elevationProfile}
                  margin={{ top: 5, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="routeElevFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop
                        offset="95%"
                        stopColor="#10b981"
                        stopOpacity={0.02}
                      />
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
                    tick={{ fill: '#a8a29e', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `${Math.round(Number(v))} ft`}
                    tick={{ fill: '#a8a29e', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => [
                      `${Math.round(value ?? 0)} ft`,
                      'Elevation',
                    ]}
                    labelFormatter={(v) => `${Number(v).toFixed(1)} mi`}
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #e7e5e4',
                      background: '#fff',
                      color: '#44403c',
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="elevationFt"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#routeElevFill)"
                    activeDot={{
                      r: 4,
                      strokeWidth: 2,
                      fill: '#10b981',
                      stroke: '#fff',
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <Separator className="bg-stone-200" />

        {route.timesCloned > 0 && (
          <div className="flex items-center gap-1 text-xs text-stone-400">
            <Users className="size-3" />
            Planned by {route.timesCloned}{' '}
            {route.timesCloned === 1 ? 'user' : 'users'}
          </div>
        )}

        <div className="flex gap-2 pb-4">
          <Button
            className="flex-1 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={handlePlanRoute}
            disabled={isCloning}
          >
            {isCloning ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            Plan This Route
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-1.5 border-stone-200 text-stone-700 hover:bg-stone-50"
            onClick={handleGenerateBriefing}
            disabled={isCloning}
          >
            <FileText className="size-4" />
            Generate Briefing
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
