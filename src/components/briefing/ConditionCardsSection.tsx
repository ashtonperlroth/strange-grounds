'use client';

import { type ReactNode } from 'react';
import { Flame } from 'lucide-react';
import { Accordion } from '@/components/ui/accordion';
import {
  ErrorBoundary,
  ConditionCardErrorFallback,
} from '@/components/layout/ErrorBoundary';
import { ConditionCard } from './ConditionCard';
import { ConditionCardSkeleton } from './ConditionCardSkeleton';
import { WeatherCard } from './cards/WeatherCard';
import { SnowpackCard } from './cards/SnowpackCard';
import { AvalancheCard, getAvalancheSortPriority } from './cards/AvalancheCard';
import { StreamCard } from './cards/StreamCard';
import { DaylightCard } from './cards/DaylightCard';
import { SatelliteCard, type SatelliteCardData } from './cards/SatelliteCard';
import { TempChart } from '@/components/charts/TempChart';
import { SnotelChart } from '@/components/charts/SnotelChart';
import { HydrographChart } from '@/components/charts/HydrographChart';
import type { NWSForecastData } from '@/lib/data-sources/nws';
import type { SnotelData } from '@/lib/data-sources/snotel';
import type { AvalancheData } from '@/lib/data-sources/avalanche';
import type { UsgsData } from '@/lib/data-sources/usgs';
import type { DaylightData } from '@/lib/synthesis/conditions';
import type { FireData } from '@/lib/data-sources/fires';
import type { ConditionStatus } from '@/stores/briefing-store';

interface ConditionCardsSectionProps {
  conditions?: Record<string, unknown>;
  progress: Record<string, unknown>;
  allConditionsComplete: boolean;
}

function fireStatusSummary(data: FireData | null): string {
  if (!data) return 'No data available';
  if (data.nearbyCount === 0) return 'No active fires within 50 miles';
  return `${data.nearbyCount} fire${data.nearbyCount !== 1 ? 's' : ''} nearby`;
}

function fireCardStatus(data: FireData | null): ConditionStatus {
  if (!data) return 'unknown';
  if (data.nearbyCount === 0) return 'good';
  if (data.nearbyCount <= 2) return 'caution';
  return 'concern';
}

export function ConditionCardsSection({
  conditions,
  progress,
  allConditionsComplete,
}: ConditionCardsSectionProps) {
  const weatherData = conditions?.weather as NWSForecastData | undefined;
  const snotelData = conditions?.snowpack as SnotelData | undefined;
  const avalancheData = conditions?.avalanche as AvalancheData | undefined;
  const usgsData = conditions?.streamFlow as UsgsData | undefined;
  const daylightData = conditions?.daylight as DaylightData | undefined;
  const fireData = conditions?.fires as FireData | undefined;
  const satelliteData = conditions?.satellite as SatelliteCardData | undefined;
  const unavailableSources = (conditions?.unavailableSources as string[] | undefined) ?? [];
  const sortAvyToTop = getAvalancheSortPriority(avalancheData ?? null) > 0;

  const isSourceUnavailable = (source: string) =>
    unavailableSources.includes(source);

  const weatherFetched = !!progress.weatherFetched;
  const snowpackFetched = !!progress.snowpackFetched;
  const avalancheFetched = !!progress.avalancheFetched;
  const streamFlowFetched = !!progress.streamFlowFetched;
  const firesFetched = !!progress.firesFetched;
  const daylightFetched = !!progress.daylightFetched;

  function wrapCard(
    key: string,
    isFetched: boolean,
    skeletonLabel: string,
    children: ReactNode,
  ) {
    if (allConditionsComplete || isFetched) {
      return (
        <div key={key} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <ErrorBoundary
            fallback={(reset) => (
              <ConditionCardErrorFallback category={skeletonLabel} reset={reset} />
            )}
          >
            {children}
          </ErrorBoundary>
        </div>
      );
    }

    return <ConditionCardSkeleton key={key} label={skeletonLabel} />;
  }

  const avalancheElement = wrapCard(
    'avalanche',
    avalancheFetched,
    'Avalanche',
    <AvalancheCard
      data={avalancheData ?? null}
      unavailable={isSourceUnavailable('Avalanche')}
    />,
  );

  const weatherElement = wrapCard(
    'weather',
    weatherFetched,
    'Weather',
    <WeatherCard
      data={weatherData ?? null}
      unavailable={isSourceUnavailable('NWS')}
    >
      {weatherData?.hourly && weatherData.hourly.length > 0 && (
        <TempChart hourly={weatherData.hourly} />
      )}
    </WeatherCard>,
  );

  const snowpackElement = wrapCard(
    'snowpack',
    snowpackFetched,
    'Snowpack',
    <SnowpackCard
      data={snotelData ?? null}
      unavailable={isSourceUnavailable('SNOTEL')}
    >
      {snotelData?.nearest && (
        <SnotelChart
          readings={snotelData.nearest.readings}
          stationName={snotelData.nearest.station.name}
        />
      )}
    </SnowpackCard>,
  );

  const streamElement = wrapCard(
    'stream',
    streamFlowFetched,
    'Stream Crossings',
    <StreamCard
      data={usgsData ?? null}
      unavailable={isSourceUnavailable('USGS')}
    >
      {usgsData?.nearest && usgsData.nearest.history.length > 0 && (
        <HydrographChart
          readings={usgsData.nearest.history}
          stationName={usgsData.nearest.station.name}
        />
      )}
    </StreamCard>,
  );

  const fireElement = wrapCard(
    'fires',
    firesFetched,
    'Fires',
    <ConditionCard
      category="Fires"
      icon={<Flame className="size-4 text-orange-500" />}
      status={
        !fireData && isSourceUnavailable('Fires')
          ? 'unavailable'
          : fireCardStatus(fireData ?? null)
      }
      summary={
        !fireData && isSourceUnavailable('Fires')
          ? 'Data temporarily unavailable'
          : fireStatusSummary(fireData ?? null)
      }
      detail={
        !fireData && isSourceUnavailable('Fires')
          ? 'This data source did not respond. Try regenerating the briefing.'
          : undefined
      }
    />,
  );

  const daylightElement = wrapCard(
    'daylight',
    daylightFetched,
    'Daylight',
    <DaylightCard
      data={daylightData ?? null}
      unavailable={isSourceUnavailable('Daylight')}
    />,
  );

  return (
    <div className="space-y-1">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
        Conditions
      </h3>
      <Accordion type="multiple" className="space-y-2">
        {sortAvyToTop && avalancheElement}
        {weatherElement}
        {!sortAvyToTop && avalancheElement}
        {snowpackElement}
        {streamElement}
        {fireElement}
        {daylightElement}
        {satelliteData?.available && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ErrorBoundary
              fallback={(reset) => (
                <ConditionCardErrorFallback category="Satellite Overview" reset={reset} />
              )}
            >
              <SatelliteCard data={satelliteData ?? null} />
            </ErrorBoundary>
          </div>
        )}
      </Accordion>
    </div>
  );
}
