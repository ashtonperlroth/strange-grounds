'use client';

import { type ReactNode } from 'react';
import { usePlanningStore } from '@/stores/planning-store';
import { TopBar } from './TopBar';
import { HeroOverlay } from './HeroOverlay';

export function DashboardLayoutShell({ children }: { children: ReactNode }) {
  const location = usePlanningStore((s) => s.location);
  const hasLocation = location !== null;

  return (
    <div className="flex h-screen flex-col bg-[#FAF7F2] text-stone-800">
      <div
        className={`shrink-0 overflow-hidden transition-[max-height,opacity] duration-500 ease-out ${
          hasLocation ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <TopBar />
      </div>

      <div className="relative min-h-0 flex-1">
        {children}
        <HeroOverlay />
      </div>
    </div>
  );
}
