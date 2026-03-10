'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, SlidersHorizontal, Compass, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc/client';
import { usePopularRoutesStore } from '@/stores/popular-routes-store';
import { PopularRouteCard } from './PopularRouteCard';
import { PopularRouteDetail } from './PopularRouteDetail';
import { cn } from '@/lib/utils';
import type { Activity, Difficulty } from '@/lib/types/popular-route';

const ACTIVITY_OPTIONS: { value: Activity; label: string }[] = [
  { value: 'backpacking', label: 'Backpacking' },
  { value: 'ski_touring', label: 'Ski Touring' },
  { value: 'mountaineering', label: 'Mountaineering' },
  { value: 'trail_running', label: 'Trail Running' },
];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'strenuous', label: 'Strenuous' },
  { value: 'expert', label: 'Expert' },
];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function PopularRoutesPanel() {
  const {
    view,
    selectedSlug,
    filters,
    searchQuery,
    setActivityFilter,
    setDifficultyFilter,
    setInSeasonOnly,
    setSearchQuery,
    setPreviewRoute,
    openDetail,
    goBackToList,
  } = usePopularRoutesStore();

  const [showFilters, setShowFilters] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const currentMonth = useMemo(() => new Date().getMonth() + 1, []);

  const listQuery = trpc.popularRoutes.list.useQuery(
    {
      activity: filters.activity ?? undefined,
      difficulty: filters.difficulty ?? undefined,
      month: filters.inSeasonOnly ? currentMonth : undefined,
      limit: 50,
      offset: 0,
    },
    { enabled: debouncedSearch.length === 0 },
  );

  const searchResults = trpc.popularRoutes.search.useQuery(
    { query: debouncedSearch, limit: 30 },
    { enabled: debouncedSearch.length > 0 },
  );

  const isSearching = debouncedSearch.length > 0;
  const routes = isSearching ? searchResults.data : listQuery.data?.routes;
  const isLoading = isSearching ? searchResults.isLoading : listQuery.isLoading;

  const routesList = listQuery.data?.routes;
  const regions = useMemo(() => {
    if (!routesList) return [];
    const unique = new Set(routesList.map((r) => r.region));
    return Array.from(unique).sort();
  }, [routesList]);

  const filteredRoutes = useMemo(() => {
    if (!routes) return [];
    let result = routes;
    if (filters.region) {
      result = result.filter((r) => r.region === filters.region);
    }
    return result;
  }, [routes, filters.region]);

  const activeFilterCount = [
    filters.activity,
    filters.difficulty,
    filters.region,
    filters.inSeasonOnly,
  ].filter(Boolean).length;

  const handleClearFilters = useCallback(() => {
    setActivityFilter(null);
    setDifficultyFilter(null);
    usePopularRoutesStore.getState().setRegionFilter(null);
    setInSeasonOnly(false);
  }, [setActivityFilter, setDifficultyFilter, setInSeasonOnly]);

  const closePanel = usePopularRoutesStore((s) => s.closePanel);

  if (view === 'detail' && selectedSlug) {
    return <PopularRouteDetail slug={selectedSlug} onBack={goBackToList} />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 space-y-3 border-b border-stone-200 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="size-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-stone-800">
              Explore Routes
            </h2>
          </div>
          <button
            type="button"
            onClick={closePanel}
            className="flex size-7 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
            aria-label="Close routes panel"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
          <Input
            placeholder="Search routes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 border-stone-200 bg-white pl-9 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {ACTIVITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                setActivityFilter(
                  filters.activity === opt.value ? null : opt.value,
                )
              }
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                filters.activity === opt.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200',
              )}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              showFilters || activeFilterCount > 1
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200',
            )}
          >
            <SlidersHorizontal className="size-3" />
            Filters
            {activeFilterCount > 1 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-stone-50 p-2.5">
            <Select
              value={filters.difficulty ?? 'all'}
              onValueChange={(v) =>
                setDifficultyFilter(v === 'all' ? null : (v as Difficulty))
              }
            >
              <SelectTrigger size="sm" className="h-7 w-[120px] border-stone-200 bg-white text-xs">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulty</SelectItem>
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {regions.length > 0 && (
              <Select
                value={filters.region ?? 'all'}
                onValueChange={(v) =>
                  usePopularRoutesStore
                    .getState()
                    .setRegionFilter(v === 'all' ? null : v)
                }
              >
                <SelectTrigger size="sm" className="h-7 w-[140px] border-stone-200 bg-white text-xs">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {regions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <label className="flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-600">
              <input
                type="checkbox"
                checked={filters.inSeasonOnly}
                onChange={(e) => setInSeasonOnly(e.target.checked)}
                className="size-3.5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />
              In Season Now
            </label>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs text-stone-400 underline hover:text-stone-600"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 py-3">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 py-12 text-stone-400">
              <Loader2 className="size-4 animate-spin text-emerald-600" />
              <span className="text-xs">Loading routes...</span>
            </div>
          ) : filteredRoutes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Compass className="size-8 text-stone-300" />
              <p className="text-sm font-medium text-stone-600">
                {isSearching ? 'No routes found' : 'No routes match your filters'}
              </p>
              <p className="max-w-[200px] text-xs text-stone-400">
                Try adjusting your filters or search query
              </p>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="mt-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            filteredRoutes.map((route) => (
              <PopularRouteCard
                key={route.id}
                route={route}
                onClick={() => openDetail(route.slug)}
                onHover={() => setPreviewRoute(route)}
                onHoverEnd={() => setPreviewRoute(null)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
