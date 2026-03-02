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
    >
      <div className="relative flex flex-col items-center gap-5 rounded-2xl bg-white/25 px-10 py-8 shadow-lg ring-1 ring-white/30 backdrop-blur-md sm:px-12">
        <div className="flex items-center gap-3">
          <Mountain className="h-10 w-10 text-emerald-600 drop-shadow-sm sm:h-12 sm:w-12" />
          <span className="text-2xl font-bold tracking-tight text-stone-800 drop-shadow-sm sm:text-3xl">
            Strange Grounds
          </span>
        </div>

        <p className="max-w-md text-center text-base font-light text-stone-700 sm:text-lg">
          Backcountry conditions intelligence — every data source, one briefing
        </p>

        <div className="mt-2 w-full max-w-lg">
          <LocationSearch variant="hero" />
        </div>
      </div>
    </div>
  );
}
