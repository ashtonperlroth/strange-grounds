'use client';

import {
  Mountain,
  PawPrint,
  Bug,
  Footprints,
  MapPin,
  Bookmark,
  BookmarkCheck,
  Share2,
  Compass,
  Flame,
  RefreshCw,
  Clock,
  Loader2,
  WifiOff,
} from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { usePlanningStore } from '@/stores/planning-store';
import { useBriefingPolling, resetBriefingPolling } from '@/hooks/useBriefingPolling';
import { useBriefingStore, type ConditionStatus, type ConditionCardData } from '@/stores/briefing-store';
import { trpc } from '@/lib/trpc/client';
import { trackGenerateBriefing, trackSaveTrip } from '@/lib/analytics';
import { useAuth } from '@/hooks/useAuth';
import { AuthModal } from '@/components/auth/AuthModal';
import { ReadinessIndicator } from './ReadinessIndicator';
import { BriefingSummary } from './BriefingSummary';
import { ConditionCard } from './ConditionCard';
import { WeatherCard } from './cards/WeatherCard';
import { SnowpackCard } from './cards/SnowpackCard';
import { AvalancheCard, getAvalancheSortPriority } from './cards/AvalancheCard';
import { StreamCard } from './cards/StreamCard';
import { DaylightCard } from './cards/DaylightCard';
import { TempChart } from '@/components/charts/TempChart';
import { SnotelChart } from '@/components/charts/SnotelChart';
import { HydrographChart } from '@/components/charts/HydrographChart';
import type { NWSForecastData } from '@/lib/data-sources/nws';
import type { FireData } from '@/lib/data-sources/fires';
import { type SnotelData } from '@/lib/data-sources/snotel';
import { type AvalancheData } from '@/lib/data-sources/avalanche';
import { type UsgsData } from '@/lib/data-sources/usgs';
import { type DaylightData } from '@/lib/synthesis/conditions';
import { type ReactNode } from 'react';
import {
  ErrorBoundary,
  ConditionCardErrorFallback,
} from '@/components/layout/ErrorBoundary';
import { HazardSummaryCard } from './cards/HazardSummaryCard';
import { SatelliteCard, type SatelliteCardData } from './cards/SatelliteCard';
import { RouteWalkthrough } from './RouteWalkthrough';
import type { RouteAnalysis } from '@/lib/types/briefing';
import type {
  RouteWalkthroughSegment,
  CriticalSection,
  AlternativeRoute,
  OverallReadiness,
} from '@/lib/types/route-briefing';

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
    <div className="flex h-full flex-col items-center justify-center px-6 text-center" role="status">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-stone-100">
        <Compass className="size-8 text-stone-400" aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-base font-semibold text-stone-800">
        No Briefing Loaded
      </h3>
      <p className="mb-6 max-w-[260px] text-sm leading-relaxed text-stone-600">
        Select your trip details and generate a briefing
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

interface BriefingLoadingSkeletonProps {
  elapsedSeconds: number;
  pipelineStatus: string | null;
  isRoute: boolean;
}

function BriefingLoadingSkeleton({ elapsedSeconds, pipelineStatus, isRoute }: BriefingLoadingSkeletonProps) {
  const timeoutSeconds = isRoute ? 180 : 90;
  const progressPct = Math.min((elapsedSeconds / timeoutSeconds) * 100, 95);

  const statusText = pipelineStatus && pipelineStatus !== 'complete'
    ? pipelineStatus
    : elapsedSeconds < 5
      ? 'Fetching data sources...'
      : elapsedSeconds < 15
        ? 'Processing weather, snow, and avalanche data...'
        : elapsedSeconds < 40
          ? isRoute ? 'Analyzing route segments...' : 'Synthesizing briefing with AI...'
          : elapsedSeconds < 80
            ? isRoute ? 'Generating route-aware briefing narrative...' : 'Almost there — finalizing briefing...'
            : 'Almost there — finalizing briefing...';

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center gap-3">
        <Loader2 className="size-4 animate-spin text-emerald-600" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-stone-700">
            Analyzing conditions&hellip;{' '}
            <span className="tabular-nums text-stone-400">
              {elapsedSeconds}s
            </span>
          </p>
          <p className="text-xs text-stone-400">
            {statusText}
          </p>
        </div>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-1000 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

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

interface BriefingErrorStateProps {
  error: string;
  elapsedSeconds: number;
  isTimedOut: boolean;
  onRetry: () => void;
  isRetrying: boolean;
}

function BriefingErrorState({
  error,
  elapsedSeconds,
  isTimedOut,
  onRetry,
  isRetrying,
}: BriefingErrorStateProps) {
  const icon = isTimedOut
    ? <Clock className="size-8 text-amber-500" />
    : <WifiOff className="size-8 text-red-400" />;

  const bgColor = isTimedOut ? 'bg-amber-50' : 'bg-red-50';

  const title = isTimedOut
    ? 'Generation Timed Out'
    : 'Generation Failed';

  const description = isTimedOut
    ? 'The briefing pipeline took longer than expected. This can happen with high server load or slow data sources.'
    : error;

  const suggestion = isTimedOut
    ? 'The pipeline may still be running in the background. You can wait a moment and retry, or try a different location.'
    : 'Check your connection and try again. If the problem persists, try a different location or date range.';

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className={`mb-4 flex size-16 items-center justify-center rounded-2xl ${bgColor}`}>
        {icon}
      </div>
      <h3 className="mb-2 text-base font-semibold text-stone-800">
        {title}
      </h3>
      <p className="mb-2 max-w-[300px] text-sm leading-relaxed text-stone-600">
        {description}
      </p>
      <p className="mb-6 max-w-[300px] text-xs leading-relaxed text-stone-400">
        {suggestion}
      </p>

      {elapsedSeconds > 0 && (
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1">
          <Clock className="size-3 text-stone-400" />
          <span className="text-xs tabular-nums text-stone-500">
            {elapsedSeconds}s elapsed
          </span>
        </div>
      )}

      <Button
        size="sm"
        onClick={onRetry}
        disabled={isRetrying}
        className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
      >
        {isRetrying ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <RefreshCw className="size-3.5" />
        )}
        {isRetrying ? 'Retrying...' : 'Try Again'}
      </Button>
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

interface PanelFooterProps {
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  isSaved?: boolean;
  onShare?: () => void;
}

function PanelFooter({ onRegenerate, isRegenerating, onSave, isSaving, isSaved, onShare }: PanelFooterProps) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Button
        variant="outline"
        size="sm"
        className="flex-1 border-stone-200 bg-white text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-800 focus-visible:ring-emerald-500"
        onClick={onRegenerate}
        disabled={isRegenerating}
      >
        {isRegenerating ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <RefreshCw className="size-3.5" />
        )}
        {isRegenerating ? 'Regenerating...' : 'Regenerate'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className={`flex-1 border-stone-200 transition-colors focus-visible:ring-emerald-500 ${
          isSaved
            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            : 'bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-800'
        }`}
        onClick={onSave}
        disabled={isSaving || isSaved}
      >
        {isSaving ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : isSaved ? (
          <BookmarkCheck className="size-3.5" />
        ) : (
          <Bookmark className="size-3.5" />
        )}
        {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="flex-1 border-stone-200 bg-white text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-800 focus-visible:ring-emerald-500"
        onClick={onShare}
      >
        <Share2 className="size-3.5" />
        Share
      </Button>
    </div>
  );
}

interface RouteWalkthroughData {
  routeWalkthrough: RouteWalkthroughSegment[];
  criticalSections: CriticalSection[];
  alternativeRoutes: AlternativeRoute[] | null;
  gearChecklist: string[];
  overallReadiness: OverallReadiness;
}

interface BriefingFullViewProps {
  locationName: string | null;
  dateRange: { start: Date; end: Date };
  activity: string;
  readiness: 'green' | 'yellow' | 'red' | null;
  narrative: string | null;
  bottomLine: string | null;
  readinessRationale: string | null;
  weatherData: NWSForecastData | null;
  warningCount?: number;
  criticalCount?: number;
  isNarrativeLoading?: boolean;
  conditions?: Record<string, unknown>;
  routeAnalysis?: RouteAnalysis | null;
  routeWalkthroughData?: RouteWalkthroughData | null;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  isSaved?: boolean;
  onShare?: () => void;
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
  bottomLine,
  readinessRationale,
  weatherData,
  warningCount = 0,
  criticalCount = 0,
  isNarrativeLoading = false,
  conditions,
  routeAnalysis,
  routeWalkthroughData,
  onRegenerate,
  isRegenerating,
  onSave,
  isSaving,
  isSaved,
  onShare,
}: BriefingFullViewProps) {
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

  return (
    <ScrollArea className="h-full">
      <div className="space-y-5 p-1">
        <PanelHeader
          locationName={locationName}
          dateRange={dateRange}
          activity={activity}
        />

        {!routeWalkthroughData && (
          <ReadinessIndicator
            readiness={readiness}
            warningCount={warningCount}
            criticalCount={criticalCount}
          />
        )}

        {routeWalkthroughData &&
          routeWalkthroughData.routeWalkthrough.length > 0 ? (
          <ErrorBoundary
            fallback={(reset) => (
              <ConditionCardErrorFallback category="Route Walkthrough" reset={reset} />
            )}
          >
            <RouteWalkthrough
              bottomLine={bottomLine ?? ''}
              overallReadiness={routeWalkthroughData.overallReadiness}
              routeWalkthrough={routeWalkthroughData.routeWalkthrough}
              criticalSections={routeWalkthroughData.criticalSections}
              alternativeRoutes={routeWalkthroughData.alternativeRoutes}
              gearChecklist={routeWalkthroughData.gearChecklist}
            />
          </ErrorBoundary>
        ) : (
          <BriefingSummary
            bottomLine={bottomLine}
            narrative={narrative}
            readinessRationale={readinessRationale}
            isLoading={isNarrativeLoading}
          />
        )}

        <Separator className="bg-stone-200" />

        {routeAnalysis && routeAnalysis.segments.length > 0 && (
          <ErrorBoundary
            fallback={(reset) => (
              <ConditionCardErrorFallback category="Hazard Assessment" reset={reset} />
            )}
          >
            <HazardSummaryCard routeAnalysis={routeAnalysis} />
          </ErrorBoundary>
        )}

        <div className="space-y-1">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Conditions
          </h3>
          <Accordion type="multiple" className="space-y-2">
            {sortAvyToTop && (
              <ErrorBoundary
                fallback={(reset) => (
                  <ConditionCardErrorFallback category="Avalanche" reset={reset} />
                )}
              >
                <AvalancheCard
                  data={avalancheData ?? null}
                  unavailable={isSourceUnavailable('Avalanche')}
                />
              </ErrorBoundary>
            )}
            <ErrorBoundary
              fallback={(reset) => (
                <ConditionCardErrorFallback category="Weather" reset={reset} />
              )}
            >
              <WeatherCard
                data={weatherData}
                unavailable={isSourceUnavailable('NWS')}
              >
                {weatherData?.hourly && weatherData.hourly.length > 0 && (
                  <TempChart hourly={weatherData.hourly} />
                )}
              </WeatherCard>
            </ErrorBoundary>
            {!sortAvyToTop && (
              <ErrorBoundary
                fallback={(reset) => (
                  <ConditionCardErrorFallback category="Avalanche" reset={reset} />
                )}
              >
                <AvalancheCard
                  data={avalancheData ?? null}
                  unavailable={isSourceUnavailable('Avalanche')}
                />
              </ErrorBoundary>
            )}
            <ErrorBoundary
              fallback={(reset) => (
                <ConditionCardErrorFallback category="Snowpack" reset={reset} />
              )}
            >
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
              </SnowpackCard>
            </ErrorBoundary>
            <ErrorBoundary
              fallback={(reset) => (
                <ConditionCardErrorFallback category="Stream Crossings" reset={reset} />
              )}
            >
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
              </StreamCard>
            </ErrorBoundary>
            <ErrorBoundary
              fallback={(reset) => (
                <ConditionCardErrorFallback category="Fires" reset={reset} />
              )}
            >
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
              />
            </ErrorBoundary>
            <ErrorBoundary
              fallback={(reset) => (
                <ConditionCardErrorFallback category="Daylight" reset={reset} />
              )}
            >
              <DaylightCard
                data={daylightData ?? null}
                unavailable={isSourceUnavailable('Daylight')}
              />
            </ErrorBoundary>
            {satelliteData?.available && (
              <ErrorBoundary
                fallback={(reset) => (
                  <ConditionCardErrorFallback category="Satellite Overview" reset={reset} />
                )}
              >
                <SatelliteCard data={satelliteData ?? null} />
              </ErrorBoundary>
            )}
            {STUB_CARDS.map((card) => (
              <ErrorBoundary
                key={card.category}
                fallback={(reset) => (
                  <ConditionCardErrorFallback category={card.category} reset={reset} />
                )}
              >
                <ConditionCard
                  category={card.category}
                  icon={card.icon}
                  status={card.status}
                  summary={card.summary}
                  detail={card.detail}
                />
              </ErrorBoundary>
            ))}
          </Accordion>
        </div>

        <Separator className="bg-stone-200" />

        <PanelFooter
          onRegenerate={onRegenerate}
          isRegenerating={isRegenerating}
          onSave={onSave}
          isSaving={isSaving}
          isSaved={isSaved}
          onShare={onShare}
        />
      </div>
    </ScrollArea>
  );
}

export function BriefingPanel() {
  const {
    activeBriefingId,
    activeTripId,
    isGenerating,
    location,
    dateRange,
    activity,
    setActiveBriefingId,
    setIsGenerating,
    setGenerationError,
  } = usePlanningStore();

  const hasRoute = !!usePlanningStore.getState().routeContext;
  const { briefing, isLoading, error, elapsedSeconds, isTimedOut, pipelineStatus } =
    useBriefingPolling(activeBriefingId, { isRoute: hasRoute });
  const { setConditionCards, getWarningCount, getCriticalCount } = useBriefingStore();

  const { user } = useAuth();

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalConfig, setAuthModalConfig] = useState<{
    title: string;
    description: string;
  }>({ title: 'Sign up to continue', description: '' });
  const generateBriefing = trpc.briefings.generate.useMutation();
  const saveTrip = trpc.trips.save.useMutation();

  const handleRetry = useCallback(async () => {
    if (!activeTripId || !location || isRegenerating) return;

    const routeContext = usePlanningStore.getState().routeContext;
    setIsRegenerating(true);
    setGenerationError(null);
    setIsGenerating(true);
    resetBriefingPolling();

    try {
      const briefingResult = await generateBriefing.mutateAsync({
        tripId: activeTripId,
        lat: location.lat,
        lng: location.lng,
        routeGeometry: routeContext
          ? {
              type: 'LineString',
              coordinates: routeContext.geometry.coordinates.map(
                (c) => [c[0], c[1]] as [number, number],
              ),
            }
          : undefined,
        routeBbox: routeContext?.bbox,
      });

      trackGenerateBriefing(!!routeContext);
      setActiveBriefingId(briefingResult.id);
    } catch (err) {
      console.error('Failed to regenerate briefing:', err);
      const message = err instanceof Error ? err.message : 'Failed to regenerate briefing';
      setIsGenerating(false);
      setGenerationError(message);
    } finally {
      setIsRegenerating(false);
    }
  }, [
    activeTripId,
    location,
    isRegenerating,
    generateBriefing,
    setActiveBriefingId,
    setIsGenerating,
    setGenerationError,
  ]);

  useEffect(() => {
    if ((isTimedOut || error) && isGenerating) {
      setIsGenerating(false);
      setGenerationError(error ?? 'Briefing generation failed');
      toast.error('Briefing generation failed', {
        description: 'Try again or use a different location.',
      });
    }
  }, [isTimedOut, error, isGenerating, setIsGenerating, setGenerationError]);

  const briefingToastedRef = useRef<string | null>(null);

  useEffect(() => {
    if (briefing?.narrative) {
      if (isGenerating) setIsGenerating(false);
      setGenerationError(null);
      if (briefing.id !== briefingToastedRef.current) {
        briefingToastedRef.current = briefing.id;
        toast.success('Briefing ready', {
          description: 'Your conditions briefing has been generated.',
        });
      }
    }
  }, [briefing?.narrative, briefing?.id, isGenerating, setIsGenerating, setGenerationError]);

  useEffect(() => {
    if (!briefing?.narrative) return;
    const cards = briefing.conditions?.conditionCards as ConditionCardData[] | undefined;
    if (cards && Array.isArray(cards)) {
      setConditionCards(cards);
    }
  }, [briefing?.narrative, briefing?.conditions, setConditionCards]);

  const requireAuth = useCallback(
    (title: string, description: string) => {
      setAuthModalConfig({ title, description });
      setShowAuthModal(true);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!activeTripId) return;

    if (!user) {
      requireAuth('Sign up to save trips', 'Create a free account to save trips and track conditions over time.');
      return;
    }

    setIsSaving(true);
    try {
      await saveTrip.mutateAsync({ id: activeTripId });
      trackSaveTrip();
      setIsSaved(true);
      toast.success('Trip saved');
    } catch (err) {
      console.error('Failed to save trip:', err);
      toast.error('Failed to save trip');
    } finally {
      setIsSaving(false);
    }
  }, [activeTripId, user, requireAuth, saveTrip]);

  const handleShare = useCallback(() => {
    requireAuth('Sign up to share briefings', 'Create a free account to share briefings with your trip partners.');
  }, [requireAuth]);

  useEffect(() => {
    setIsSaved(false);
    setIsSaving(false);
  }, [activeTripId]);

  if (!activeBriefingId && !isGenerating) {
    return <BriefingEmptyState />;
  }

  if (isTimedOut || error) {
    return (
      <BriefingErrorState
        error={error ?? 'An unknown error occurred'}
        elapsedSeconds={elapsedSeconds}
        isTimedOut={isTimedOut}
        onRetry={handleRetry}
        isRetrying={isRegenerating}
      />
    );
  }

  if ((isGenerating && !briefing?.narrative) || isLoading) {
    return (
      <ScrollArea className="h-full">
        <div className="p-1">
          <BriefingLoadingSkeleton elapsedSeconds={elapsedSeconds} pipelineStatus={pipelineStatus} isRoute={hasRoute} />
        </div>
      </ScrollArea>
    );
  }

  const readiness = briefing?.readiness as 'green' | 'yellow' | 'red' | null;
  const weatherData = (briefing?.conditions?.weather as NWSForecastData) ?? null;
  const routeAnalysis = (briefing?.conditions?.routeAnalysis as RouteAnalysis | undefined) ?? null;

  const conditionsObj = briefing?.conditions as Record<string, unknown> | undefined;
  const routeWalkthroughData = conditionsObj?.routeWalkthrough
    ? {
        routeWalkthrough: conditionsObj.routeWalkthrough as RouteWalkthroughSegment[],
        criticalSections: (conditionsObj.criticalSections as CriticalSection[]) ?? [],
        alternativeRoutes: (conditionsObj.alternativeRoutes as AlternativeRoute[] | null) ?? null,
        gearChecklist: (conditionsObj.gearChecklist as string[]) ?? [],
        overallReadiness: (conditionsObj.overallReadiness as OverallReadiness) ?? 'yellow',
      }
    : null;

  return (
    <>
      <BriefingFullView
        locationName={location?.name ?? null}
        dateRange={dateRange}
        activity={activity}
        readiness={readiness}
        narrative={briefing?.narrative ?? null}
        bottomLine={briefing?.bottom_line ?? null}
        readinessRationale={briefing?.readiness_rationale ?? null}
        weatherData={weatherData}
        warningCount={getWarningCount()}
        criticalCount={getCriticalCount()}
        isNarrativeLoading={isLoading}
        conditions={conditionsObj}
        routeAnalysis={routeAnalysis}
        routeWalkthroughData={routeWalkthroughData}
        onRegenerate={handleRetry}
        isRegenerating={isRegenerating}
        onSave={handleSave}
        isSaving={isSaving}
        isSaved={isSaved}
        onShare={handleShare}
      />
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        title={authModalConfig.title}
        description={authModalConfig.description}
      />
    </>
  );
}
