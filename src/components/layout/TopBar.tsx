'use client';

import { Mountain, User } from 'lucide-react';
import { LocationSearch } from '@/components/planning/LocationSearch';
import { DateRangePicker } from '@/components/planning/DateRangePicker';
import { ActivitySelector } from '@/components/planning/ActivitySelector';
import { GenerateButton } from '@/components/planning/GenerateButton';

export function TopBar() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4">
      <div className="flex items-center gap-2">
        <Mountain className="h-5 w-5 text-emerald-600" />
        <span className="text-sm font-semibold tracking-tight text-stone-800">
          Strange Grounds
        </span>
      </div>

      <div className="flex items-center gap-2 px-4">
        <LocationSearch />
      </div>

      <div className="flex items-center gap-3">
        <DateRangePicker />

        <div className="h-4 w-px bg-stone-200" />

        <ActivitySelector />

        <div className="h-4 w-px bg-stone-200" />

        <GenerateButton />

        <div className="h-4 w-px bg-stone-200" />

        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200"
        >
          <User className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
