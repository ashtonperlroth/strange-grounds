'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Sparkles, RotateCcw } from 'lucide-react';
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
import { resetBriefingPolling } from '@/hooks/useBriefingPolling';
import { AuthModal } from '@/components/auth/AuthModal';

export function GenerateButton() {
  const {
    location,
    dateRange,
    activity,
    isReadyToGenerate,
    isGenerating,
    generationError,
    setActiveTripId,
    setActiveBriefingId,
    setIsGenerating,
    setGenerationError,
    setSessionToken,
  } = usePlanningStore();

  const [mutationError, setMutationError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState<string | undefined>();
  const [shouldPulse, setShouldPulse] = useState(false);
  const prevLocationRef = useRef(location);

  const ready = isReadyToGenerate();

  useEffect(() => {
    if (!prevLocationRef.current && location) {
      const startTimer = setTimeout(() => setShouldPulse(true), 0);
      const stopTimer = setTimeout(() => setShouldPulse(false), 2000);
      prevLocationRef.current = location;
      return () => {
        clearTimeout(startTimer);
        clearTimeout(stopTimer);
      };
    }
    prevLocationRef.current = location;
  }, [location]);

  const createTrip = trpc.trips.create.useMutation();
  const generateBriefing = trpc.briefings.generate.useMutation();

  const missingItems: string[] = [];
  if (!location) missingItems.push('location');
  if (!dateRange) missingItems.push('date range');
  if (!activity) missingItems.push('activity');

  const displayError = mutationError || generationError;
  const hasError = !!displayError;

  const handleClick = async () => {
    if (!ready || !location || !dateRange || isGenerating) return;

    setIsGenerating(true);
    setMutationError(null);
    setGenerationError(null);

    try {
      resetBriefingPolling();

      const trip = await createTrip.mutateAsync({
        location_name: location.name ?? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
        latitude: location.lat,
        longitude: location.lng,
        start_date: format(dateRange.start, 'yyyy-MM-dd'),
        end_date: format(dateRange.end, 'yyyy-MM-dd'),
        activity,
      });

      setActiveTripId(trip.id);

      const returnedSessionToken = trip.sessionToken as string | null;
      if (returnedSessionToken) {
        setSessionToken(returnedSessionToken);
      }

      const briefing = await generateBriefing.mutateAsync({
        tripId: trip.id,
        sessionToken: returnedSessionToken ?? undefined,
        lat: location.lat,
        lng: location.lng,
      });

      setActiveBriefingId(briefing.id);
    } catch (err) {
      console.error('Failed to generate briefing:', err);
      const message =
        err instanceof Error ? err.message : 'Failed to generate briefing';
      const isRateLimit =
        message.includes('TOO_MANY_REQUESTS') ||
        message.includes('free briefings');
      if (isRateLimit) {
        setAuthModalMessage(
          "You've used your 3 free briefings today. Sign up for unlimited access.",
        );
        setShowAuthModal(true);
        setMutationError(message);
      } else {
        setMutationError(message);
      }
      setIsGenerating(false);
    }
  };

  const buttonLabel = isGenerating
    ? 'Generating...'
    : hasError
      ? 'Retry'
      : 'Generate';

  const pulseClass = shouldPulse && ready && !isGenerating
    ? ' animate-pulse ring-2 ring-emerald-400 ring-offset-1'
    : '';

  const button = (
    <Button
      size="sm"
      disabled={!ready || isGenerating}
      onClick={handleClick}
      className={
        (hasError && !isGenerating
          ? 'h-7 gap-1.5 bg-red-600 px-3 text-xs font-medium text-white hover:bg-red-500 disabled:bg-stone-200 disabled:text-stone-400'
          : 'h-7 gap-1.5 bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-500 disabled:bg-stone-200 disabled:text-stone-400'
        ) + pulseClass
      }
    >
      {isGenerating ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : hasError ? (
        <RotateCcw className="h-3.5 w-3.5" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {buttonLabel}
    </Button>
  );

  const tooltipMessage = hasError && !isGenerating
    ? displayError
    : !ready
      ? `Missing: ${missingItems.join(', ')}`
      : null;

  const wrappedButton = tooltipMessage ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>{button}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[280px]">
          {tooltipMessage}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    button
  );

  return (
    <>
      {wrappedButton}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        title="Free briefing limit reached"
        description={authModalMessage}
      />
    </>
  );
}
