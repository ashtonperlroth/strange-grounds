'use client';

import { type ReactNode } from 'react';
import { usePlanningStore } from '@/stores/planning-store';
import { useRouteStore } from '@/stores/route-store';
import { TopBar } from './TopBar';
import { Footer } from './Footer';
import { HeroOverlay } from './HeroOverlay';

export function DashboardLayoutShell({ children }: { children: ReactNode }) {
  const location = usePlanningStore((s) => s.location);
  const hasRoute = useRouteStore((s) => s.currentRoute !== null);
  const isActive = location !== null || hasRoute;

  return (
    <div className="flex h-screen flex-col bg-[#FAF7F2] text-stone-800">
      <div
        className={`shrink-0 overflow-hidden transition-[max-height,opacity] duration-500 ease-out ${
          isActive ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <TopBar />
      </div>

      <main className="relative flex min-h-0 flex-1 flex-col">
        {children}
        <HeroOverlay />
      </main>

      <Footer />
    </div>
  );
}
