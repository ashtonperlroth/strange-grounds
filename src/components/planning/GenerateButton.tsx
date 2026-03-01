'use client';

import { Loader2, Sparkles } from 'lucide-react';
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

    try {
      const trip = await createTrip.mutateAsync({
        location_name: location.name,
        latitude: location.lat,
        longitude: location.lng,
        start_date: format(dateRange.start, 'yyyy-MM-dd'),
        end_date: format(dateRange.end, 'yyyy-MM-dd'),
        activity,
      });

      setActiveTripId(trip.id);

      const briefing = await generateBriefing.mutateAsync({
        tripId: trip.id,
      });

      setActiveBriefingId(briefing.id);
    } catch (error) {
      console.error('Failed to generate briefing:', error);
      setIsGenerating(false);
    }
  };

  const button = (
    <Button
      size="sm"
      disabled={!ready || isGenerating}
      onClick={handleClick}
      className="h-7 gap-1.5 bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-500 disabled:bg-stone-200 disabled:text-stone-400"
    >
      {isGenerating ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {isGenerating ? 'Generating...' : 'Generate'}
    </Button>
  );

  if (ready) return button;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>{button}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Missing: {missingItems.join(', ')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
