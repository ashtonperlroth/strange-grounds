'use client';

import { usePlanningStore } from '@/stores/planning-store';
import { useBriefingPolling } from '@/hooks/useBriefingPolling';
import { TempChart } from './TempChart';
import type { NWSForecastData } from '@/lib/data-sources/nws';

export function DrawerCharts() {
  const { activeBriefingId } = usePlanningStore();
  const { briefing } = useBriefingPolling(activeBriefingId);

  const weatherData = briefing?.conditions?.weather as NWSForecastData | undefined;

  if (!weatherData?.hourly?.length) {
    return null;
  }

  return <TempChart hourly={weatherData.hourly} />;
}
