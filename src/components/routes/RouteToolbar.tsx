'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ArrowRightLeft, Download, Magnet, Pencil, Trash2, Undo2 } from 'lucide-react';
import { lineString, length as turfLength, bbox as turfBbox, center as turfCenter } from '@turf/turf';
import { trpc } from '@/lib/trpc/client';
import { fetchElevationsForPositions } from '@/lib/routes/elevation';
import { parseGPX, parseKML, type ParsedRoute } from '@/lib/routes/parsers/gpx';
import type { Route, RouteWaypoint } from '@/lib/types/route';
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

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceMeters(
  a: [number, number],
  b: [number, number],
): number {
  const earthRadiusM = 6371008.8;
  const dLat = toRadians(b[1] - a[1]);
  const dLng = toRadians(b[0] - a[0]);
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * earthRadiusM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function headingDegrees(a: [number, number], b: [number, number]): number {
  const dLng = toRadians(b[0] - a[0]);
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

function turnAngleDegrees(
  prev: [number, number],
  current: [number, number],
  next: [number, number],
): number {
  const inHeading = headingDegrees(prev, current);
  const outHeading = headingDegrees(current, next);
  const delta = Math.abs(outHeading - inHeading);
  return delta > 180 ? 360 - delta : delta;
}

function createAutosaveSignature(params: {
  tripId: string | null;
  coordinates: number[][];
  waypoints: Array<{
    sortOrder: number;
    name: string | null;
    waypointType: 'start' | 'waypoint' | 'camp' | 'pass' | 'water' | 'end';
    notes: string | null;
    elevationM: number | null;
  }>;
}): string {
  return JSON.stringify(params);
}

function buildImportWaypoints(coordinates: [number, number, number?][]): Array<{
  sortOrder: number;
  name: string | null;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  elevationM: number | null;
  waypointType: 'start' | 'waypoint' | 'camp' | 'pass' | 'water' | 'end';
  notes: string | null;
}> {
  if (coordinates.length <= 2) {
    return coordinates.map((coord, index) => ({
      sortOrder: index,
      name: index === 0 ? 'Start' : index === coordinates.length - 1 ? 'End' : null,
      location: { type: 'Point', coordinates: [coord[0], coord[1]] },
      elevationM: typeof coord[2] === 'number' ? coord[2] : null,
      waypointType: index === 0 ? 'start' : index === coordinates.length - 1 ? 'end' : 'waypoint',
      notes: null,
    }));
  }

  const selected = new Set<number>([0, coordinates.length - 1]);
  let distanceSinceLastSelected = 0;

  for (let index = 1; index < coordinates.length - 1; index += 1) {
    const previous = coordinates[index - 1];
    const current = coordinates[index];
    distanceSinceLastSelected += haversineDistanceMeters(
      [previous[0], previous[1]],
      [current[0], current[1]],
    );

    const angle = turnAngleDegrees(
      [previous[0], previous[1]],
      [current[0], current[1]],
      [coordinates[index + 1][0], coordinates[index + 1][1]],
    );
    const shouldIncludeTurn = angle >= 35 && distanceSinceLastSelected >= 250;
    const shouldIncludeByDistance = distanceSinceLastSelected >= 2000;
    if (shouldIncludeTurn || shouldIncludeByDistance) {
      selected.add(index);
      distanceSinceLastSelected = 0;
    }
  }

  const indexes = Array.from(selected).sort((a, b) => a - b);
  const maxWaypoints = 100;
  const sampledIndexes =
    indexes.length <= maxWaypoints
      ? indexes
      : Array.from({ length: maxWaypoints }, (_, i) =>
          indexes[Math.round((i / (maxWaypoints - 1)) * (indexes.length - 1))],
        );

  return sampledIndexes.map((coordinateIndex, sortOrder) => {
    const coord = coordinates[coordinateIndex];
    const isStart = sortOrder === 0;
    const isEnd = sortOrder === sampledIndexes.length - 1;
    return {
      sortOrder,
      name: isStart ? 'Start' : isEnd ? 'End' : null,
      location: {
        type: 'Point' as const,
        coordinates: [coord[0], coord[1]] as [number, number],
      },
      elevationM: typeof coord[2] === 'number' ? coord[2] : null,
      waypointType: isStart ? 'start' : isEnd ? 'end' : 'waypoint',
      notes: null,
    };
  });
}

function formatImportSuccessMessage(route: ParsedRoute): string {
  const distanceMi = route.totalDistance * 0.000621371;
  const elevationGainFt = route.elevationGain * 3.28084;
  return `Imported ${route.name} — ${distanceMi.toFixed(1)} mi, ${Math.round(
    elevationGainFt,
  ).toLocaleString()} ft gain`;
}

function getImportedRouteName(route: ParsedRoute): string {
  if (route.name.trim()) return route.name.trim();
  const start = route.coordinates[0];
  const end = route.coordinates[route.coordinates.length - 1];
  return `Route ${start[1].toFixed(3)}, ${start[0].toFixed(3)} → ${end[1].toFixed(
    3,
  )}, ${end[0].toFixed(3)}`;
}

function createTemporaryImportedRoute(params: {
  name: string;
  description?: string;
  coordinates: [number, number][];
  parsedRoute: ParsedRoute;
  waypoints: Array<{
    sortOrder: number;
    name: string | null;
    location: {
      type: 'Point';
      coordinates: [number, number];
    };
    elevationM: number | null;
    waypointType: 'start' | 'waypoint' | 'camp' | 'pass' | 'water' | 'end';
    notes: string | null;
  }>;
}): { route: Route; waypoints: RouteWaypoint[] } {
  const routeId = `temp-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  return {
    route: {
      id: routeId,
      tripId: null,
      name: params.name,
      description: params.description ?? null,
      geometry: {
        type: 'LineString',
        coordinates: params.coordinates,
      },
      totalDistanceM: params.parsedRoute.totalDistance,
      elevationGainM: params.parsedRoute.elevationGain,
      elevationLossM: params.parsedRoute.elevationLoss,
      maxElevationM: Math.max(
        ...params.parsedRoute.coordinates.map((coord) => coord[2] ?? 0),
      ),
      minElevationM: Math.min(
        ...params.parsedRoute.coordinates.map((coord) => coord[2] ?? 0),
      ),
      activity: 'backpacking',
      source: 'gpx_import',
      createdAt: now,
      updatedAt: now,
    },
    waypoints: params.waypoints.map((waypoint) => ({
      id: crypto.randomUUID(),
      routeId,
      sortOrder: waypoint.sortOrder,
      name: waypoint.name,
      location: waypoint.location,
      elevationM: waypoint.elevationM,
      waypointType: waypoint.waypointType,
      notes: waypoint.notes,
    })),
  };
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
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importNotice, setImportNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

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

    const signature = createAutosaveSignature({
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
        const shouldUpdateExistingRoute =
          currentRoute && !currentRoute.id.startsWith('temp-');

        if (shouldUpdateExistingRoute) {
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
            name: currentRoute?.name ?? 'Drawn route',
            description: currentRoute?.description ?? null,
            geometry: payloadGeometry,
            source: currentRoute?.source ?? 'manual',
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

  useEffect(() => {
    if (!importNotice) return;
    const timer = setTimeout(() => setImportNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [importNotice]);

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

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const lowerName = file.name.toLowerCase();
      const parsedRoute = lowerName.endsWith('.gpx')
        ? await parseGPX(file)
        : lowerName.endsWith('.kml')
          ? await parseKML(file)
          : null;

      if (!parsedRoute) {
        throw new Error('Unsupported file type. Please select a .gpx or .kml file.');
      }
      if (parsedRoute.coordinates.length < 2) {
        throw new Error('Imported file must contain at least two track points.');
      }

      const routeName = getImportedRouteName(parsedRoute);
      const importedWaypoints = buildImportWaypoints(parsedRoute.coordinates);
      const geometryCoordinates = parsedRoute.coordinates.map(
        (coord) => [coord[0], coord[1]] as [number, number],
      );

      const temporaryRoute = createTemporaryImportedRoute({
        name: routeName,
        description: parsedRoute.description,
        coordinates: geometryCoordinates,
        parsedRoute,
        waypoints: importedWaypoints,
      });

      setIsDrawing(false);
      setRoute(temporaryRoute.route, temporaryRoute.waypoints);
      autosaveSignatureRef.current = createAutosaveSignature({
        tripId: activeTripId ?? null,
        coordinates: geometryCoordinates,
        waypoints: temporaryRoute.waypoints.map((waypoint) => ({
          sortOrder: waypoint.sortOrder,
          name: waypoint.name,
          waypointType: waypoint.waypointType,
          notes: waypoint.notes,
          elevationM: waypoint.elevationM,
        })),
      });
      setImportNotice({
        type: 'success',
        message: formatImportSuccessMessage({ ...parsedRoute, name: routeName }),
      });

      const saved = await createRoute.mutateAsync({
        tripId: activeTripId,
        name: routeName,
        description: parsedRoute.description ?? null,
        geometry: {
          type: 'LineString',
          coordinates: geometryCoordinates,
        },
        source: 'gpx_import',
        waypoints: importedWaypoints,
      });

      setRoute(saved.route, saved.waypoints);
      autosaveSignatureRef.current = createAutosaveSignature({
        tripId: activeTripId ?? null,
        coordinates: saved.route.geometry.coordinates.map((coord) => [
          coord[0],
          coord[1],
        ]),
        waypoints: saved.waypoints.map((waypoint) => ({
          sortOrder: waypoint.sortOrder,
          name: waypoint.name,
          waypointType: waypoint.waypointType,
          notes: waypoint.notes,
          elevationM: waypoint.elevationM,
        })),
      });

    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to import route file';
      setImportNotice({
        type: 'error',
        message: `Imported locally but could not save: ${message}`,
      });
    }
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
          className="h-8 border-white/30 bg-transparent px-2 text-xs text-white hover:bg-white/10"
          onClick={handleImportClick}
          disabled={createRoute.isPending}
        >
          <Download className="size-3.5" />
          Import GPX/KML
        </Button>
        <input
          ref={importInputRef}
          type="file"
          accept=".gpx,.kml"
          className="hidden"
          onChange={handleImportFile}
        />
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

      {importNotice && (
        <div
          className={`rounded-md px-2 py-1 text-[11px] ${
            importNotice.type === 'success'
              ? 'border border-emerald-300/40 bg-emerald-500/15 text-emerald-100'
              : 'border border-red-300/50 bg-red-500/20 text-red-100'
          }`}
        >
          {importNotice.message}
        </div>
      )}
    </div>
  );
}
