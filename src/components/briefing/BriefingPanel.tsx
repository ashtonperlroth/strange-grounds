'use client';

import {
  Mountain,
  PawPrint,
  Bug,
  Footprints,
  MapPin,
  Bookmark,
  Share2,
  Compass,
  Flame,
} from 'lucide-react';
import { useEffect } from 'react';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { usePlanningStore } from '@/stores/planning-store';
import { useBriefingPolling } from '@/hooks/useBriefingPolling';
import { useBriefingStore, type ConditionStatus, type ConditionCardData } from '@/stores/briefing-store';
import { ReadinessIndicator } from './ReadinessIndicator';
import { BriefingSummary } from './BriefingSummary';
import { ConditionCard } from './ConditionCard';
import { WeatherCard } from './cards/WeatherCard';
import { SnowpackCard } from './cards/SnowpackCard';
import { AvalancheCard, getAvalancheSortPriority } from './cards/AvalancheCard';
import { StreamCard } from './cards/StreamCard';
import { DaylightCard } from './cards/DaylightCard';
import { SnotelChart } from '@/components/charts/SnotelChart';
import { HydrographChart } from '@/components/charts/HydrographChart';
import type { NWSForecastData } from '@/lib/data-sources/nws';
import type { FireData } from '@/lib/data-sources/fires';
import { type SnotelData } from '@/lib/data-sources/snotel';
import { type AvalancheData } from '@/lib/data-sources/avalanche';
import { type UsgsData } from '@/lib/data-sources/usgs';
import { type DaylightData } from '@/lib/synthesis/conditions';
import { type ReactNode } from 'react';

interface StubCard {
  category: string;
  icon: ReactNode;
  status: ConditionStatus;
  summary: string;
  detail: string;
}

const STUB_CARDS: StubCard[] = [
  {
    category: 'Remoteness',
    icon: <Mountain className="size-4 text-stone-500" />,
    status: 'unknown',
    summary: 'No data available',
    detail:
      'No data source available for this category yet. This will be added in a future update.',
  },
  {
    category: 'Wildlife',
    icon: <PawPrint className="size-4 text-orange-500" />,
    status: 'unknown',
    summary: 'No data available',
    detail:
      'No data source available for this category yet. This will be added in a future update.',
  },
  {
    category: 'Insects',
    icon: <Bug className="size-4 text-lime-600" />,
    status: 'unknown',
    summary: 'No data available',
    detail:
      'No data source available for this category yet. This will be added in a future update.',
  },
  {
    category: 'Footing',
    icon: <Footprints className="size-4 text-stone-500" />,
    status: 'unknown',
    summary: 'No data available',
    detail:
      'No data source available for this category yet. This will be added in a future update.',
  },
];

function BriefingEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-stone-100">
        <Compass className="size-8 text-stone-400" />
      </div>
      <h3 className="mb-2 text-base font-semibold text-stone-800">
        No Briefing Loaded
      </h3>
      <p className="mb-6 max-w-[260px] text-sm leading-relaxed text-stone-500">
        Select a location on the map and generate a conditions briefing to get started.
      </p>
      <div className="w-full max-w-[280px] space-y-3">
        {['Weather', 'Avalanche', 'Snowpack', 'Stream Flow'].map((section) => (
          <div
            key={section}
            className="rounded-lg border border-dashed border-stone-300 px-4 py-3"
          >
            <span className="text-xs font-medium text-stone-400">
              {section}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BriefingLoadingSkeleton() {
  return (
    <div className="space-y-6 p-1">
      <div className="space-y-3">
        <Skeleton className="h-5 w-48 bg-stone-200" />
        <Skeleton className="h-4 w-32 bg-stone-200" />
      </div>

      <Skeleton className="h-8 w-28 rounded-full bg-stone-200" />

      <div className="space-y-2.5">
        <Skeleton className="h-3.5 w-full bg-stone-200" />
        <Skeleton className="h-3.5 w-[92%] bg-stone-200" />
        <Skeleton className="h-3.5 w-[78%] bg-stone-200" />
      </div>

      <Separator className="bg-stone-200" />

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white p-4"
          >
            <Skeleton className="size-8 rounded-md bg-stone-200" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24 bg-stone-200" />
              <Skeleton className="h-3 w-48 bg-stone-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PanelHeaderProps {
  locationName: string | null;
  dateRange: { start: Date; end: Date };
  activity: string;
}

function PanelHeader({ locationName, dateRange, activity }: PanelHeaderProps) {
  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <MapPin className="size-4 text-stone-400" />
        <h2 className="text-base font-semibold text-stone-800">
          {locationName ?? 'Conditions Briefing'}
        </h2>
      </div>
      <div className="flex items-center gap-2 text-xs text-stone-500">
        <span>
          {formatDate(dateRange.start)} – {formatDate(dateRange.end)}
        </span>
        <span className="text-stone-300">·</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
          {activity}
        </span>
      </div>
    </div>
  );
}

function PanelFooter() {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Button
        variant="outline"
        size="sm"
        className="flex-1 border-stone-200 bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-800"
        disabled
      >
        <Bookmark className="size-3.5" />
        Save
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="flex-1 border-stone-200 bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-800"
        disabled
      >
        <Share2 className="size-3.5" />
        Share
      </Button>
    </div>
  );
}

interface BriefingFullViewProps {
  locationName: string | null;
  dateRange: { start: Date; end: Date };
  activity: string;
  readiness: 'green' | 'yellow' | 'red' | null;
  narrative: string | null;
  weatherData: NWSForecastData | null;
  warningCount?: number;
  criticalCount?: number;
  isNarrativeLoading?: boolean;
  conditions?: Record<string, unknown>;
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

function BriefingFullView({
  locationName,
  dateRange,
  activity,
  readiness,
  narrative,
  weatherData,
  warningCount = 0,
  criticalCount = 0,
  isNarrativeLoading = false,
  conditions,
}: BriefingFullViewProps) {
  const snotelData = conditions?.snowpack as SnotelData | undefined;
  const avalancheData = conditions?.avalanche as AvalancheData | undefined;
  const usgsData = conditions?.streamFlow as UsgsData | undefined;
  const daylightData = conditions?.daylight as DaylightData | undefined;
  const fireData = conditions?.fires as FireData | undefined;
  const sortAvyToTop = getAvalancheSortPriority(avalancheData ?? null) > 0;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-5 p-1">
        <PanelHeader
          locationName={locationName}
          dateRange={dateRange}
          activity={activity}
        />

        <ReadinessIndicator
          readiness={readiness}
          warningCount={warningCount}
          criticalCount={criticalCount}
        />

        <BriefingSummary
          narrative={narrative}
          isLoading={isNarrativeLoading}
        />

        <Separator className="bg-stone-200" />

        <div className="space-y-1">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Conditions
          </h3>
          <Accordion type="multiple" className="space-y-2">
            {sortAvyToTop && (
              <AvalancheCard data={avalancheData ?? null} />
            )}
            <WeatherCard data={weatherData} />
            {!sortAvyToTop && (
              <AvalancheCard data={avalancheData ?? null} />
            )}
            <SnowpackCard data={snotelData ?? null}>
              {snotelData?.nearest && (
                <SnotelChart
                  readings={snotelData.nearest.readings}
                  stationName={snotelData.nearest.station.name}
                />
              )}
            </SnowpackCard>
            <StreamCard data={usgsData ?? null}>
              {usgsData?.nearest && usgsData.nearest.history.length > 0 && (
                <HydrographChart
                  readings={usgsData.nearest.history}
                  stationName={usgsData.nearest.station.name}
                />
              )}
            </StreamCard>
            <ConditionCard
              category="Fires"
              icon={<Flame className="size-4 text-orange-500" />}
              status={fireCardStatus(fireData ?? null)}
              summary={fireStatusSummary(fireData ?? null)}
            />
            <DaylightCard data={daylightData ?? null} />
            {STUB_CARDS.map((card) => (
              <ConditionCard
                key={card.category}
                category={card.category}
                icon={card.icon}
                status={card.status}
                summary={card.summary}
                detail={card.detail}
              />
            ))}
          </Accordion>
        </div>

        <Separator className="bg-stone-200" />

        <PanelFooter />
      </div>
    </ScrollArea>
  );
}

export function BriefingPanel() {
  const { activeBriefingId, isGenerating, location, dateRange, activity } =
    usePlanningStore();
  const { briefing, isLoading } = useBriefingPolling(activeBriefingId);
  const { setConditionCards, getWarningCount, getCriticalCount } = useBriefingStore();

  useEffect(() => {
    if (!briefing?.narrative) return;
    const cards = briefing.conditions?.conditionCards as ConditionCardData[] | undefined;
    if (cards && Array.isArray(cards)) {
      setConditionCards(cards);
    }
  }, [briefing?.narrative, briefing?.conditions, setConditionCards]);

  if (!activeBriefingId && !isGenerating) {
    return <BriefingEmptyState />;
  }

  if ((isGenerating && !briefing?.narrative) || isLoading) {
    return (
      <ScrollArea className="h-full">
        <div className="p-1">
          <BriefingLoadingSkeleton />
        </div>
      </ScrollArea>
    );
  }

  const readiness = briefing?.readiness as 'green' | 'yellow' | 'red' | null;
  const weatherData = (briefing?.conditions?.weather as NWSForecastData) ?? null;

  return (
    <BriefingFullView
      locationName={location?.name ?? null}
      dateRange={dateRange}
      activity={activity}
      readiness={readiness}
      narrative={briefing?.narrative ?? null}
      weatherData={weatherData}
      warningCount={getWarningCount()}
      criticalCount={getCriticalCount()}
      isNarrativeLoading={isLoading}
      conditions={briefing?.conditions as Record<string, unknown> | undefined}
    />
  );
}
