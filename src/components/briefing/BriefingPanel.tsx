'use client';

import {
  TriangleAlert,
  CloudSun,
  Waves,
  Sun,
  Mountain,
  PawPrint,
  Bug,
  Footprints,
  MapPin,
  Bookmark,
  Share2,
  Compass,
} from 'lucide-react';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { usePlanningStore } from '@/stores/planning-store';
import { useBriefingPolling } from '@/hooks/useBriefingPolling';
import { useBriefingStore, type ConditionStatus } from '@/stores/briefing-store';
import { ReadinessIndicator } from './ReadinessIndicator';
import { BriefingSummary } from './BriefingSummary';
import { ConditionCard } from './ConditionCard';
import { WeatherCard } from './cards/WeatherCard';
import { SnowpackCard } from './cards/SnowpackCard';
import { SnotelChart } from '@/components/charts/SnotelChart';
import type { NWSForecastData } from '@/lib/data-sources/nws';
import { type SnotelData } from '@/lib/data-sources/snotel';
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
    category: 'Avalanche',
    icon: <TriangleAlert className="size-4 text-yellow-600" />,
    status: 'caution',
    summary: 'Moderate danger on north-facing slopes above treeline',
    detail:
      'Persistent slab problem on north aspects above 9,500 ft. Wind slabs possible on cross-loaded features. Travel with caution in avalanche terrain and check local avalanche center forecast before departure.',
  },
  {
    category: 'Weather',
    icon: <CloudSun className="size-4 text-sky-600" />,
    status: 'good',
    summary: 'Clear skies through Wednesday, storm arriving Thursday',
    detail:
      'High pressure dominates through midweek with daytime highs near 45\u00b0F at 8,000 ft. A Pacific system arrives Thursday afternoon bringing 4-8" of snow above 7,000 ft with winds gusting to 40 mph.',
  },
  // Snowpack card is rendered separately using SnowpackCard with real SNOTEL data
  {
    category: 'Stream Crossings',
    icon: <Waves className="size-4 text-cyan-600" />,
    status: 'caution',
    summary: 'Rising flows on main drainage, knee-deep by afternoon',
    detail:
      'Diurnal melt pattern producing peak flows around 3-4 PM. Main creek running at 180 cfs (above seasonal average). Cross early morning when flows are lowest. Trekking poles recommended for stability.',
  },
  {
    category: 'Daylight',
    icon: <Sun className="size-4 text-amber-500" />,
    status: 'good',
    summary: '13h 42m of daylight, sunrise 6:18 AM',
    detail:
      'Sunrise at 6:18 AM, sunset at 7:57 PM. Civil twilight begins at 5:48 AM. Golden hour starts at 7:12 PM. Ample daylight for a full day in the backcountry.',
  },
  {
    category: 'Remoteness',
    icon: <Mountain className="size-4 text-stone-500" />,
    status: 'caution',
    summary: '14 miles to nearest road, no cell coverage',
    detail:
      'This route is 14 miles from the nearest trailhead with 4,200 ft of elevation gain. No cell service expected beyond mile 2. Nearest SAR staging area is the trailhead parking lot. Carry a satellite communicator.',
  },
  {
    category: 'Wildlife',
    icon: <PawPrint className="size-4 text-orange-500" />,
    status: 'good',
    summary: 'Bear activity low, no recent sightings reported',
    detail:
      'Black bears are emerging from dens in the area. No recent sightings on this route. Carry bear spray and hang food at least 200 ft from camp. Mountain lion presence is year-round but encounters are rare.',
  },
  {
    category: 'Insects',
    icon: <Bug className="size-4 text-lime-600" />,
    status: 'good',
    summary: 'Minimal insect activity, too early for mosquito season',
    detail:
      'Snow cover and cool temps keep insect populations low. Mosquito season typically begins in late May at this elevation. Ticks may be active in lower-elevation approach trails \u2014 do a tick check after hiking through brush.',
  },
  {
    category: 'Footing',
    icon: <Footprints className="size-4 text-stone-500" />,
    status: 'caution',
    summary: 'Mixed conditions \u2014 snow, mud, and exposed rock',
    detail:
      'Expect post-holing in soft afternoon snow above 8,500 ft without snowshoes. Trail is muddy from 6,000-8,000 ft. Microspikes recommended for icy morning conditions on north-facing slopes. Gaiters helpful for mud and slush.',
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
  const nonWeatherStubs = STUB_CARDS.filter((c) => c.category !== 'Weather');

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
            <WeatherCard data={weatherData} />
            <SnowpackCard data={snotelData ?? null}>
              {snotelData?.nearest && (
                <SnotelChart
                  readings={snotelData.nearest.readings}
                  stationName={snotelData.nearest.station.name}
                />
              )}
            </SnowpackCard>
            {nonWeatherStubs.map((card) => (
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
  const { getWarningCount, getCriticalCount } = useBriefingStore();

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
