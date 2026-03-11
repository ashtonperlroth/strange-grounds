'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import {
  Mountain,
  MapPin,
  Calendar,
  Compass,
  RefreshCw,
  Trash2,
  Loader2,
  ArrowLeft,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { trpc } from '@/lib/trpc/client';
import { useAuth } from '@/hooks/useAuth';
import { usePlanningStore } from '@/stores/planning-store';
import { resetBriefingPolling } from '@/hooks/useBriefingPolling';
import { trackGenerateBriefing } from '@/lib/analytics';

interface BriefingSummary {
  id: string;
  readiness: string | null;
  created_at: string;
}

interface Trip {
  id: string;
  name: string | null;
  location_name: string;
  latitude: number;
  longitude: number;
  start_date: string;
  end_date: string;
  activity: string;
  created_at: string;
  saved_at: string | null;
  briefings: BriefingSummary[];
}

function readinessBadge(readiness: string | null) {
  switch (readiness) {
    case 'green':
      return (
        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
          Good to go
        </Badge>
      );
    case 'yellow':
      return (
        <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100">
          Use caution
        </Badge>
      );
    case 'red':
      return (
        <Badge className="border-red-200 bg-red-50 text-red-700 hover:bg-red-50">
          Not advised
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-stone-400">
          No briefing
        </Badge>
      );
  }
}

function TripCard({
  trip,
  onLoad,
  onRegenerate,
  onDelete,
  isRegenerating,
}: {
  trip: Trip;
  onLoad: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
  isRegenerating: boolean;
}) {
  const latestBriefing = trip.briefings?.[0] ?? null;

  return (
    <div className="group rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onLoad}
          className="flex-1 text-left"
        >
          <h3 className="text-sm font-semibold text-stone-800 group-hover:text-emerald-700 transition-colors">
            {trip.name || trip.location_name}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" />
              {trip.location_name}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3" />
              {format(parseISO(trip.start_date), 'MMM d')} – {format(parseISO(trip.end_date), 'MMM d, yyyy')}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
              {trip.activity}
            </span>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {readinessBadge(latestBriefing?.readiness ?? null)}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0 text-stone-400 hover:text-stone-600"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onLoad}>
                <Compass className="size-4" />
                Open trip
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRegenerate} disabled={isRegenerating}>
                {isRegenerating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                {isRegenerating ? 'Regenerating...' : 'Regenerate briefing'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="size-4" />
                Delete trip
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {latestBriefing && (
        <p className="mt-2 text-[11px] text-stone-400">
          Last briefing {format(parseISO(latestBriefing.created_at), 'MMM d, yyyy \'at\' h:mm a')}
        </p>
      )}
    </div>
  );
}

function EmptyTripsState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-5 flex size-20 items-center justify-center rounded-2xl bg-stone-100">
        <Compass className="size-10 text-stone-300" />
      </div>
      <h2 className="mb-2 text-lg font-semibold text-stone-800">
        No saved trips yet
      </h2>
      <p className="mb-8 max-w-sm text-sm leading-relaxed text-stone-500">
        Generate a conditions briefing and save it to track conditions over time.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
      >
        <Compass className="size-4" />
        Plan a Trip
      </Link>
    </div>
  );
}

export default function TripsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    setLocation,
    setDateRange,
    setActivity,
    setActiveTripId,
    setActiveBriefingId,
    setIsGenerating,
    setGenerationError,
  } = usePlanningStore();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: trips, isLoading } = trpc.trips.list.useQuery(undefined, {
    enabled: !!user,
  });
  const deleteTrip = trpc.trips.delete.useMutation({
    onSuccess: () => {
      utils.trips.list.invalidate();
    },
  });
  const generateBriefing = trpc.briefings.generate.useMutation();

  const handleLoad = (trip: Trip) => {
    const latestBriefing = trip.briefings?.[0] ?? null;

    setLocation({
      lat: trip.latitude,
      lng: trip.longitude,
      name: trip.location_name,
    });
    setDateRange({
      start: parseISO(trip.start_date),
      end: parseISO(trip.end_date),
    });
    setActivity(trip.activity as Parameters<typeof setActivity>[0]);
    setActiveTripId(trip.id);
    setGenerationError(null);

    if (latestBriefing) {
      setActiveBriefingId(latestBriefing.id);
      setIsGenerating(false);
    } else {
      setActiveBriefingId(null);
    }

    router.push('/');
  };

  const handleRegenerate = async (trip: Trip) => {
    setRegeneratingId(trip.id);

    try {
      resetBriefingPolling();

      setLocation({
        lat: trip.latitude,
        lng: trip.longitude,
        name: trip.location_name,
      });
      setDateRange({
        start: parseISO(trip.start_date),
        end: parseISO(trip.end_date),
      });
      setActivity(trip.activity as Parameters<typeof setActivity>[0]);
      setActiveTripId(trip.id);
      setIsGenerating(true);
      setGenerationError(null);

      const briefing = await generateBriefing.mutateAsync({
        tripId: trip.id,
        lat: trip.latitude,
        lng: trip.longitude,
      });

      trackGenerateBriefing(false);
      setActiveBriefingId(briefing.id);
      router.push('/');
    } catch (err) {
      console.error('Failed to regenerate briefing:', err);
      setIsGenerating(false);
      setRegeneratingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTrip.mutateAsync({ id: deleteTarget });
    } catch (err) {
      console.error('Failed to delete trip:', err);
    } finally {
      setDeleteTarget(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-4 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="flex h-full flex-col bg-[#FAF7F2]">
      <header className="flex h-14 shrink-0 items-center border-b border-stone-200 bg-white px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-stone-500 transition-colors hover:text-stone-800"
        >
          <ArrowLeft className="size-4" />
          <Mountain className="size-5 text-emerald-600" />
          <span className="text-sm font-semibold tracking-tight text-stone-800">
            Strange Grounds
          </span>
        </Link>
        <h1 className="ml-4 hidden text-sm font-medium text-stone-600 sm:block">
          Saved Trips
        </h1>
        <span className="ml-auto text-xs text-stone-400">{user.email}</span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-stone-800">
              Your Trips
              {trips && trips.length > 0 && (
                <span className="ml-2 text-sm font-normal text-stone-400">
                  ({trips.length})
                </span>
              )}
            </h2>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              <Compass className="size-3.5" />
              New Trip
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-lg border border-stone-200 bg-stone-100"
                />
              ))}
            </div>
          ) : !trips || trips.length === 0 ? (
            <EmptyTripsState />
          ) : (
            <div className="space-y-3">
              {(trips as Trip[]).map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onLoad={() => handleLoad(trip)}
                  onRegenerate={() => handleRegenerate(trip)}
                  onDelete={() => setDeleteTarget(trip.id)}
                  isRegenerating={regeneratingId === trip.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete trip?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this trip and all its briefings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-500"
            >
              {deleteTrip.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
