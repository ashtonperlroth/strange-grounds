'use client';

import { Mountain } from 'lucide-react';
import { LocationSearch } from '@/components/planning/LocationSearch';
import { usePlanningStore } from '@/stores/planning-store';

export function HeroOverlay() {
  const location = usePlanningStore((s) => s.location);
  const hasLocation = location !== null;

  return (
    <div
      className={`absolute inset-0 z-20 flex flex-col items-center justify-center transition-all duration-700 ease-out ${
        hasLocation ? 'pointer-events-none scale-95 opacity-0' : 'pointer-events-auto opacity-100'
      }`}
      role="region"
      aria-label="Get started"
    >
      <div className="relative flex flex-col items-center gap-5 rounded-2xl bg-white/25 px-8 py-8 shadow-lg ring-1 ring-white/30 backdrop-blur-md sm:px-12">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50/80 sm:size-16">
          <Mountain className="size-8 text-emerald-600 drop-shadow-sm sm:size-10" aria-hidden="true" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <span className="text-2xl font-bold tracking-tight text-stone-800 drop-shadow-sm sm:text-3xl">
            Strange Grounds
          </span>
          <p className="max-w-md text-center text-sm font-light text-stone-700 sm:text-base">
            Search for a backcountry location to get started
          </p>
        </div>

        <div className="mt-1 w-full max-w-lg">
          <LocationSearch variant="hero" />
        </div>

        <p className="max-w-sm text-center text-xs text-stone-500/80">
          Every data source, one briefing &mdash; AI-powered conditions analysis for backcountry travel
        </p>
      </div>
    </div>
  );
}
