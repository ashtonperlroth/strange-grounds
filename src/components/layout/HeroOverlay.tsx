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
      <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-white/80 via-white/40 to-transparent" />

      <div className="relative flex flex-col items-center gap-5 px-6 sm:px-4">
        <div className="flex items-center gap-3">
          <Mountain className="h-10 w-10 text-emerald-600 sm:h-12 sm:w-12" />
          <span className="text-2xl font-bold tracking-tight text-stone-800 sm:text-3xl">
            Strange Grounds
          </span>
        </div>

        <p className="max-w-md text-center text-base font-light text-stone-600 sm:text-lg">
          Backcountry conditions intelligence — every data source, one briefing
        </p>

        <div className="mt-2 w-full max-w-lg">
          <LocationSearch variant="hero" />
        </div>
      </div>
    </div>
  );
}
