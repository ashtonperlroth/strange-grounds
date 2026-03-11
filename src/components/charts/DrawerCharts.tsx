'use client';

import { useState } from 'react';
import { usePlanningStore } from '@/stores/planning-store';
import { useRealtimeBriefing } from '@/hooks/useRealtimeBriefing';
import { TempChart } from './TempChart';
import { HydrographChart } from './HydrographChart';
import type { NWSForecastData } from '@/lib/data-sources/nws';
import type { UsgsData } from '@/lib/data-sources/usgs';
import { cn } from '@/lib/utils';

type DrawerTab = 'temperature' | 'hydrograph';

export function DrawerCharts() {
  const { activeBriefingId } = usePlanningStore();
  const { briefing } = useRealtimeBriefing(activeBriefingId);
  const [activeTab, setActiveTab] = useState<DrawerTab>('temperature');

  const weatherData = briefing?.conditions?.weather as NWSForecastData | undefined;
  const usgsData = briefing?.conditions?.streamFlow as UsgsData | undefined;

  const hasWeather = Boolean(weatherData?.hourly?.length);
  const hasHydro = Boolean(
    usgsData?.nearest && usgsData.nearest.history.length > 0,
  );

  if (!hasWeather && !hasHydro) return null;

  const tabs: { id: DrawerTab; label: string; available: boolean }[] = [
    { id: 'temperature', label: 'Temperature', available: hasWeather },
    { id: 'hydrograph', label: 'Hydrograph', available: hasHydro },
  ];

  const availableTabs = tabs.filter((t) => t.available);

  if (availableTabs.length === 0) return null;

  const resolvedTab = availableTabs.find((t) => t.id === activeTab)
    ? activeTab
    : availableTabs[0].id;

  return (
    <div className="flex h-full flex-col">
      {availableTabs.length > 1 && (
        <div className="mb-2 flex gap-1">
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                resolvedTab === tab.id
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-700',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {resolvedTab === 'temperature' && weatherData?.hourly && (
        <TempChart hourly={weatherData.hourly} />
      )}

      {resolvedTab === 'hydrograph' && usgsData?.nearest && (
        <HydrographChart
          readings={usgsData.nearest.history}
          stationName={usgsData.nearest.station.name}
        />
      )}
    </div>
  );
}
