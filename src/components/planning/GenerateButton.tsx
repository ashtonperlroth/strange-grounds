'use client';

import { useState } from 'react';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePlanningStore } from '@/stores/planning-store';
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';

export function GenerateButton() {
  const {
    location,
    dateRange,
    activity,
    isReadyToGenerate,
    isGenerating,
    setActiveTripId,
    setActiveBriefingId,
    setIsGenerating,
  } = usePlanningStore();

  const [error, setError] = useState<string | null>(null);

  const ready = isReadyToGenerate();

  const createTrip = trpc.trips.create.useMutation();
  const generateBriefing = trpc.briefings.generate.useMutation();

  const missingItems: string[] = [];
  if (!location) missingItems.push('location');
  if (!dateRange) missingItems.push('date range');
  if (!activity) missingItems.push('activity');

  const handleClick = async () => {
    if (!ready || !location || !dateRange || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      const trip = await createTrip.mutateAsync({
        location_name: location.name ?? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
        latitude: location.lat,
        longitude: location.lng,
        start_date: format(dateRange.start, 'yyyy-MM-dd'),
        end_date: format(dateRange.end, 'yyyy-MM-dd'),
        activity,
      });

      setActiveTripId(trip.id);

      const briefing = await generateBriefing.mutateAsync({
        tripId: trip.id,
        lat: location.lat,
        lng: location.lng,
      });

      setActiveBriefingId(briefing.id);
    } catch (err) {
      console.error('Failed to generate briefing:', err);
      const message =
        err instanceof Error ? err.message : 'Failed to generate briefing';
      const isAuthError =
        message.includes('UNAUTHORIZED') || message.includes('401');
      setError(isAuthError ? 'Please sign in to generate briefings' : message);
      setIsGenerating(false);
    }
  };

  const buttonLabel = error
    ? 'Retry'
    : isGenerating
      ? 'Generating...'
      : 'Generate';

  const button = (
    <Button
      size="sm"
      disabled={!ready || isGenerating}
      onClick={handleClick}
      className={
        error
          ? 'h-7 gap-1.5 bg-red-600 px-3 text-xs font-medium text-white hover:bg-red-500 disabled:bg-stone-200 disabled:text-stone-400'
          : 'h-7 gap-1.5 bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-500 disabled:bg-stone-200 disabled:text-stone-400'
      }
    >
      {isGenerating ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : error ? (
        <AlertCircle className="h-3.5 w-3.5" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {buttonLabel}
    </Button>
  );

  const tooltipMessage = error
    ? error
    : !ready
      ? `Missing: ${missingItems.join(', ')}`
      : null;

  if (!tooltipMessage) return button;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>{button}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom">{tooltipMessage}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
