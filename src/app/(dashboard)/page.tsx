'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { BriefingPanel } from '@/components/briefing/BriefingPanel';
import { MapErrorBoundary, BriefingPanelErrorBoundary } from './error-boundaries';

const Map = dynamic(
  () => import('@/components/map/Map').then((mod) => ({ default: mod.Map })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-stone-100">
        <div className="flex items-center gap-2 rounded-lg bg-white/90 px-4 py-2 shadow-sm">
          <Loader2 className="size-4 animate-spin text-emerald-600" />
          <span className="text-sm text-stone-600">Loading map&hellip;</span>
        </div>
      </div>
    ),
  },
);

const DrawerCharts = dynamic(
  () => import('@/components/charts/DrawerCharts').then((mod) => ({ default: mod.DrawerCharts })),
  { ssr: false },
);

export default function DashboardPage() {
  return (
    <DashboardShell
      mapSlot={
        <MapErrorBoundary>
          <Map />
        </MapErrorBoundary>
      }
      briefingSlot={
        <BriefingPanelErrorBoundary>
          <BriefingPanel />
        </BriefingPanelErrorBoundary>
      }
      drawerSlot={<DrawerCharts />}
    />
  );
}
