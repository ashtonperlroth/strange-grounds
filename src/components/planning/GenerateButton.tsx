'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Sparkles, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
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

import { AuthModal } from '@/components/auth/AuthModal';
import { useAuth } from '@/hooks/useAuth';
import { trackGenerateBriefing } from '@/lib/analytics';

export function GenerateButton() {
  const {
    location,
    routeContext,
    dateRange,
    activity,
    isReadyToGenerate,
    isGenerating,
    generationError,
    setActiveTripId,
    setActiveBriefingId,
    setIsGenerating,
    setGenerationError,
  } = usePlanningStore();

  const [mutationError, setMutationError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTitle, setAuthModalTitle] = useState('Sign in required');
  const [authModalMessage, setAuthModalMessage] = useState<string | undefined>();
  const [shouldPulse, setShouldPulse] = useState(false);
  const prevLocationRef = useRef(location);
  const { user, loading: authLoading } = useAuth();

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
  if (!location && !routeContext) missingItems.push('location or route');
  if (!dateRange) missingItems.push('date range');
  if (!activity) missingItems.push('activity');

  const displayError = mutationError || generationError;
  const hasError = !!displayError;

  const handleClick = async () => {
    if (!ready || !dateRange || isGenerating) return;
    if (!user && !authLoading) {
      setAuthModalTitle('Sign in required');
      setAuthModalMessage('Please sign in to generate and save trip briefings.');
      setShowAuthModal(true);
      return;
    }

    const target = routeContext?.center ?? location;
    if (!target) return;

    setIsGenerating(true);
    setMutationError(null);
    setGenerationError(null);

    try {
      setActiveBriefingId(null);

      const trip = await createTrip.mutateAsync({
        location_name:
          location?.name ??
          (routeContext ? 'Route center' : `${target.lat.toFixed(4)}, ${target.lng.toFixed(4)}`),
        latitude: target.lat,
        longitude: target.lng,
        start_date: format(dateRange.start, 'yyyy-MM-dd'),
        end_date: format(dateRange.end, 'yyyy-MM-dd'),
        activity,
      });

      setActiveTripId(trip.id);

      const briefing = await generateBriefing.mutateAsync({
        tripId: trip.id,
        lat: target.lat,
        lng: target.lng,
        routeGeometry: routeContext
          ? {
              type: 'LineString',
              coordinates: routeContext.geometry.coordinates.map(
                (coord) => [coord[0], coord[1]] as [number, number],
              ),
            }
          : undefined,
        routeBbox: routeContext?.bbox,
      });

      toast('Generating briefing…', {
        description: 'This may take up to a minute for route-aware analysis.',
      });
      trackGenerateBriefing(!!routeContext);
      setActiveBriefingId(briefing.id);
    } catch (err) {
      console.error('Failed to generate briefing:', err);
      const message =
        err instanceof Error ? err.message : 'Failed to generate briefing';
      const isRateLimit =
        message.includes('TOO_MANY_REQUESTS') ||
        message.includes('Rate limited') ||
        message.includes('free briefings');
      const isAuthRequired =
        message.toLowerCase().includes('unauthorized') ||
        message.toLowerCase().includes('sign in');
      if (isRateLimit) {
        toast.error('Slow down', {
          description: message.includes('more briefings')
            ? message
            : "You've reached the limit of 10 briefings per hour.",
        });
        setAuthModalTitle('Rate limit reached');
        setAuthModalMessage(
          message.includes('more briefings')
            ? message
            : "You've reached the limit of 10 briefings per hour. Please try again later.",
        );
        setShowAuthModal(true);
        setMutationError(message);
      } else if (isAuthRequired) {
        setAuthModalTitle('Sign in required');
        setAuthModalMessage('Please sign in to generate and save trip briefings.');
        setShowAuthModal(true);
        setMutationError('Sign in required');
      } else {
        toast.error('Briefing generation failed', {
          description: 'Try again or use a different location.',
        });
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
      disabled={!ready || isGenerating || authLoading}
      onClick={handleClick}
      className={
        (hasError && !isGenerating
          ? 'h-7 gap-1.5 bg-red-600 px-3 text-xs font-medium text-white hover:bg-red-500 disabled:bg-stone-200 disabled:text-stone-400'
          : 'h-7 gap-1.5 bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700 disabled:bg-stone-200 disabled:text-stone-400'
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
        title={authModalTitle}
        description={authModalMessage}
      />
    </>
  );
}
