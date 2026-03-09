'use client';

import { Mountain, TrendingUp, Calendar, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc/client';
import { usePopularRoutesStore } from '@/stores/popular-routes-store';
import { cn } from '@/lib/utils';
import type { PopularRoute } from '@/lib/types/popular-route';

const ACTIVITY_LABELS: Record<string, string> = {
  backpacking: 'Backpacking',
  ski_touring: 'Ski Touring',
  mountaineering: 'Mountaineering',
  trail_running: 'Trail Running',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-100/80 text-green-700',
  moderate: 'bg-amber-100/80 text-amber-700',
  strenuous: 'bg-orange-100/80 text-orange-700',
  expert: 'bg-red-100/80 text-red-700',
};

function metersToMiles(m: number): string {
  return (m * 0.000621371).toFixed(1);
}

function metersToFeet(m: number): string {
  return Math.round(m * 3.28084).toLocaleString();
}

function FeaturedCard({ route }: { route: PopularRoute }) {
  const { openDetail, setPreviewRoute } = usePopularRoutesStore();

  return (
    <button
      type="button"
      onClick={() => openDetail(route.slug)}
      onMouseEnter={() => setPreviewRoute(route)}
      onMouseLeave={() => setPreviewRoute(null)}
      className="group flex w-56 shrink-0 flex-col rounded-xl border border-white/40 bg-white/80 p-3 text-left shadow-sm backdrop-blur-sm transition-all hover:border-emerald-200 hover:bg-white/95 hover:shadow-md sm:w-64"
    >
      <div className="flex items-start justify-between gap-1">
        <h4 className="truncate text-sm font-semibold text-stone-800 group-hover:text-emerald-700">
          {route.name}
        </h4>
        <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" />
      </div>
      <p className="mt-0.5 text-xs text-stone-500">
        {route.region}, {route.state}
      </p>

      <div className="mt-2 flex flex-wrap gap-1">
        <Badge
          variant="secondary"
          className="bg-stone-100/80 text-[10px] text-stone-600"
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

      <div className="mt-2 flex items-center gap-3 text-xs text-stone-500">
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
      </div>
    </button>
  );
}

export function FeaturedRoutes() {
  const { data, isLoading } = trpc.popularRoutes.list.useQuery({
    featured: true,
    limit: 6,
    offset: 0,
  });

  if (isLoading || !data?.routes?.length) return null;

  return (
    <div className="w-full max-w-3xl">
      <p className="mb-2 text-center text-xs font-medium tracking-wide text-stone-500/80">
        Featured Routes
      </p>
      <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-2">
        {data.routes.map((route) => (
          <FeaturedCard key={route.id} route={route} />
        ))}
      </div>
    </div>
  );
}
