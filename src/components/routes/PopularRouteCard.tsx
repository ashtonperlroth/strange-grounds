'use client';

import { Mountain, TrendingUp, Calendar, Users, Leaf, Snowflake } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PopularRoute } from '@/lib/types/popular-route';
import { cn } from '@/lib/utils';

const ACTIVITY_LABELS: Record<string, string> = {
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

interface PopularRouteCardProps {
  route: PopularRoute;
  onClick: () => void;
  onHover?: () => void;
  onHoverEnd?: () => void;
  isPreview?: boolean;
}

export function PopularRouteCard({
  route,
  onClick,
  onHover,
  onHoverEnd,
  isPreview,
}: PopularRouteCardProps) {
  const inSeason = isInSeason(route.bestMonths);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      className={cn(
        'group w-full rounded-lg border bg-white p-3 text-left transition-all hover:shadow-md',
        isPreview
          ? 'border-emerald-300 ring-1 ring-emerald-200'
          : 'border-stone-200 hover:border-stone-300',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-stone-800 group-hover:text-emerald-700">
            {route.name}
          </h4>
          <p className="mt-0.5 text-xs text-stone-500">
            {route.region}, {route.state}
          </p>
        </div>
        {inSeason ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            <Leaf className="size-3" />
            In Season
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500">
            <Snowflake className="size-3" />
            Off Season
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge
          variant="secondary"
          className="bg-stone-100 text-[10px] text-stone-600"
        >
          {ACTIVITY_LABELS[route.activity] ?? route.activity}
        </Badge>
        <Badge
          variant="secondary"
          className={cn('text-[10px]', DIFFICULTY_COLORS[route.difficulty])}
        >
          {route.difficulty.charAt(0).toUpperCase() + route.difficulty.slice(1)}
        </Badge>
      </div>

      <div className="mt-2.5 flex items-center gap-3 text-xs text-stone-500">
        <span className="flex items-center gap-1">
          <Mountain className="size-3 text-stone-400" />
          {metersToMiles(route.totalDistanceM)} mi
        </span>
        <span className="flex items-center gap-1">
          <TrendingUp className="size-3 text-stone-400" />
          {metersToFeet(route.elevationGainM)} ft
        </span>
        {route.estimatedDays && (
          <span className="flex items-center gap-1">
            <Calendar className="size-3 text-stone-400" />
            {route.estimatedDays}d
          </span>
        )}
        {route.timesCloned > 0 && (
          <span className="flex items-center gap-1">
            <Users className="size-3 text-stone-400" />
            {route.timesCloned}
          </span>
        )}
      </div>
    </button>
  );
}
