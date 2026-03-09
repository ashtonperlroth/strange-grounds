'use client';

import { useEffect, useMemo, useRef } from 'react';
import { ArrowRightLeft, Magnet, Pencil, Trash2, Undo2 } from 'lucide-react';
import { lineString, length as turfLength, bbox as turfBbox, center as turfCenter } from '@turf/turf';
import { trpc } from '@/lib/trpc/client';
import { fetchElevationsForPositions } from '@/lib/routes/elevation';
import { usePlanningStore } from '@/stores/planning-store';
import { selectRouteGeometry, useRouteStore } from '@/stores/route-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function formatEta(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return '—';
  if (hours < 1) {
    return `${Math.round(hours * 60)} min`;
  }
  const wholeHours = Math.floor(hours);
  const mins = Math.round((hours - wholeHours) * 60);
  if (mins === 0) return `${wholeHours}h`;
  return `${wholeHours}h ${mins}m`;
}

export function RouteToolbar() {
  const currentRoute = useRouteStore((s) => s.currentRoute);
  const waypoints = useRouteStore((s) => s.waypoints);
  const isDrawing = useRouteStore((s) => s.isDrawing);
  const setIsDrawing = useRouteStore((s) => s.setIsDrawing);
  const clearRoute = useRouteStore((s) => s.clearRoute);
  const removeWaypoint = useRouteStore((s) => s.removeWaypoint);
  const reorderWaypoints = useRouteStore((s) => s.reorderWaypoints);
  const setRoute = useRouteStore((s) => s.setRoute);
  const updateWaypoint = useRouteStore((s) => s.updateWaypoint);
  const snapToTrailsEnabled = useRouteStore((s) => s.snapToTrailsEnabled);
  const setSnapToTrailsEnabled = useRouteStore((s) => s.setSnapToTrailsEnabled);
  const geometry = useRouteStore(selectRouteGeometry);
  const setRouteContext = usePlanningStore((s) => s.setRouteContext);
  const activeTripId = usePlanningStore((s) => s.activeTripId);

  const createRoute = trpc.routes.create.useMutation();
  const updateRouteMutation = trpc.routes.update.useMutation();
  const deleteRouteMutation = trpc.routes.delete.useMutation();
  const autosaveSignatureRef = useRef<string | null>(null);

  const sortedWaypoints = useMemo(
    () => [...waypoints].sort((a, b) => a.sortOrder - b.sortOrder),
    [waypoints],
  );
  const stats = useMemo(() => {
    if (!geometry) {
      return {
        distanceMiles: 0,
        elevationGainFt: 0,
        elevationLossFt: 0,
        etaHours: 0,
      };
    }

    const distanceMiles = turfLength(lineString(geometry.coordinates), {
      units: 'miles',
    });
    const elevationsFeet = sortedWaypoints.map((waypoint) =>
      waypoint.elevationM ? waypoint.elevationM * 3.28084 : null,
    );
    let elevationGainFt = 0;
    let elevationLossFt = 0;
    for (let i = 1; i < elevationsFeet.length; i += 1) {
      const prev = elevationsFeet[i - 1];
      const current = elevationsFeet[i];
      if (prev === null || current === null) continue;
      const delta = current - prev;
      if (delta > 0) {
        elevationGainFt += delta;
      } else {
        elevationLossFt += Math.abs(delta);
      }
    }

    // Naismith-style estimate: ~2 mph base + 1h per 2000ft climbed.
    const etaHours = distanceMiles / 2 + elevationGainFt / 2000;

    return {
      distanceMiles,
      elevationGainFt,
      elevationLossFt,
      etaHours,
    };
  }, [geometry, sortedWaypoints]);

  useEffect(() => {
    if (!geometry) {
      setRouteContext(null);
      return;
    }

    const line = lineString(geometry.coordinates);
    const center = turfCenter(line).geometry.coordinates;
    const bbox = turfBbox(line) as [number, number, number, number];

    setRouteContext({
      center: { lng: center[0], lat: center[1] },
      bbox,
      geometry,
    });
  }, [geometry, setRouteContext]);

  useEffect(() => {
    const missing = sortedWaypoints.filter((waypoint) => waypoint.elevationM == null);
    if (missing.length === 0) return;

    let cancelled = false;
    const fillMissingElevations = async () => {
      try {
        const elevations = await fetchElevationsForPositions(
          missing.map((waypoint) => waypoint.location.coordinates),
        );
        if (cancelled) return;
        missing.forEach((waypoint, index) => {
          const elevationM = elevations[index];
          if (typeof elevationM === 'number') {
            updateWaypoint(waypoint.id, { elevationM });
          }
        });
      } catch (error) {
        console.warn('Failed to fetch waypoint elevations', error);
      }
    };

    fillMissingElevations();
    return () => {
      cancelled = true;
    };
  }, [sortedWaypoints, updateWaypoint]);

  useEffect(() => {
    if (!geometry) return;

    const signature = JSON.stringify({
      tripId: activeTripId ?? null,
      coordinates: geometry.coordinates,
      waypoints: sortedWaypoints.map((waypoint) => ({
        sortOrder: waypoint.sortOrder,
        name: waypoint.name,
        waypointType: waypoint.waypointType,
        notes: waypoint.notes,
        elevationM: waypoint.elevationM,
      })),
    });

    if (autosaveSignatureRef.current === signature) return;

    const timer = setTimeout(async () => {
      const payloadGeometry = {
        type: 'LineString' as const,
        coordinates: geometry.coordinates.map(
          (coord) => [coord[0], coord[1]] as [number, number],
        ),
      };

      try {
        if (currentRoute) {
          const saved = await updateRouteMutation.mutateAsync({
            id: currentRoute.id,
            tripId: activeTripId,
            geometry: payloadGeometry,
            waypoints: sortedWaypoints.map((waypoint, index) => ({
              sortOrder: index,
              name: waypoint.name,
              location: {
                type: 'Point' as const,
                coordinates: [
                  waypoint.location.coordinates[0],
                  waypoint.location.coordinates[1],
                ] as [number, number],
              },
              elevationM: waypoint.elevationM,
              waypointType: waypoint.waypointType,
              notes: waypoint.notes,
            })),
          });
          setRoute(saved.route, saved.waypoints);
        } else {
          const saved = await createRoute.mutateAsync({
            tripId: activeTripId,
            name: 'Drawn route',
            geometry: payloadGeometry,
            source: 'manual',
            waypoints: sortedWaypoints.map((waypoint, index) => ({
              sortOrder: index,
              name: waypoint.name,
              location: {
                type: 'Point' as const,
                coordinates: [
                  waypoint.location.coordinates[0],
                  waypoint.location.coordinates[1],
                ] as [number, number],
              },
              elevationM: waypoint.elevationM,
              waypointType: waypoint.waypointType,
              notes: waypoint.notes,
            })),
          });
          setRoute(saved.route, saved.waypoints);
        }
        autosaveSignatureRef.current = signature;
      } catch (error) {
        console.warn('Route autosave failed', error);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    activeTripId,
    createRoute,
    currentRoute,
    geometry,
    setRoute,
    sortedWaypoints,
    updateRouteMutation,
  ]);

  const handleUndo = () => {
    const last = sortedWaypoints[sortedWaypoints.length - 1];
    if (!last) return;
    removeWaypoint(last.id);
  };

  const handleReverse = () => {
    if (sortedWaypoints.length < 2) return;
    reorderWaypoints([...sortedWaypoints].reverse());
  };

  const handleClear = async () => {
    const confirmed = window.confirm('Clear all waypoints from this route?');
    if (!confirmed) return;

    if (currentRoute) {
      try {
        await deleteRouteMutation.mutateAsync({ id: currentRoute.id });
      } catch (error) {
        console.warn('Failed to delete saved route', error);
      }
    }
    autosaveSignatureRef.current = null;
    clearRoute();
  };

  const hasWaypoints = sortedWaypoints.length > 0;

  return (
    <div className="absolute left-3 top-3 z-20 flex max-w-[92vw] flex-col gap-2 rounded-lg border border-white/40 bg-black/70 p-2 text-white shadow-lg backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          size="sm"
          onClick={() => setIsDrawing(!isDrawing)}
          className="h-8 bg-emerald-600 text-xs hover:bg-emerald-500"
        >
          <Pencil className="size-3.5" />
          {isDrawing ? 'Finish' : 'Draw Route'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={cn(
            'h-8 border-white/30 bg-transparent px-2 text-xs text-white hover:bg-white/10',
            snapToTrailsEnabled && 'border-amber-300/70 bg-amber-500/25 text-amber-100',
          )}
          onClick={() => setSnapToTrailsEnabled(!snapToTrailsEnabled)}
          aria-pressed={snapToTrailsEnabled}
        >
          <Magnet className="size-3.5" />
          Snap to Trails
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 border-white/30 bg-transparent px-2 text-xs text-white hover:bg-white/10"
          onClick={handleUndo}
          disabled={!hasWaypoints}
        >
          <Undo2 className="size-3.5" />
          Undo
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 border-white/30 bg-transparent px-2 text-xs text-white hover:bg-white/10"
          onClick={handleReverse}
          disabled={sortedWaypoints.length < 2}
        >
          <ArrowRightLeft className="size-3.5" />
          Reverse
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 border-red-300/40 bg-transparent px-2 text-xs text-red-100 hover:bg-red-500/20"
          onClick={handleClear}
          disabled={!hasWaypoints}
        >
          <Trash2 className="size-3.5" />
          Clear
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md bg-white/10 px-2 py-1 text-[11px] text-white/90 sm:grid-cols-4">
        <div>
          <div className="font-semibold text-white/60">Distance</div>
          <div>{stats.distanceMiles.toFixed(2)} mi</div>
        </div>
        <div>
          <div className="font-semibold text-white/60">Gain</div>
          <div>{Math.round(stats.elevationGainFt).toLocaleString()} ft</div>
        </div>
        <div>
          <div className="font-semibold text-white/60">Loss</div>
          <div>{Math.round(stats.elevationLossFt).toLocaleString()} ft</div>
        </div>
        <div>
          <div className="font-semibold text-white/60">Est. time</div>
          <div>{formatEta(stats.etaHours)}</div>
        </div>
      </div>
    </div>
  );
}
