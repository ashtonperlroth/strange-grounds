'use client';

import { useRef, type ChangeEvent } from 'react';
import { Compass, Download, Mountain } from 'lucide-react';
import { LocationSearch } from '@/components/planning/LocationSearch';
import { usePlanningStore } from '@/stores/planning-store';
import { useRouteStore } from '@/stores/route-store';
import { usePopularRoutesStore } from '@/stores/popular-routes-store';
import { Button } from '@/components/ui/button';

export function HeroOverlay() {
  const location = usePlanningStore((s) => s.location);
  const hasRoute = useRouteStore((s) => s.currentRoute !== null);
  const isVisible = location === null && !hasRoute;
  const importRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    importRef.current?.click();
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const { parseGPX, parseKML } = await import('@/lib/routes/parsers/gpx');
      const lowerName = file.name.toLowerCase();
      const parsed = lowerName.endsWith('.gpx')
        ? await parseGPX(file)
        : lowerName.endsWith('.kml')
          ? await parseKML(file)
          : null;

      if (!parsed || parsed.coordinates.length < 2) return;

      const coords = parsed.coordinates.map(
        (c) => [c[0], c[1]] as [number, number],
      );

      const routeId = `temp-${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      const selected = new Set<number>([0, parsed.coordinates.length - 1]);
      let dist = 0;
      for (let i = 1; i < parsed.coordinates.length - 1; i++) {
        const [px, py] = parsed.coordinates[i - 1];
        const [cx, cy] = parsed.coordinates[i];
        dist += Math.hypot(cx - px, cy - py) * 111_000;
        if (dist >= 2000) {
          selected.add(i);
          dist = 0;
        }
      }
      const indexes = Array.from(selected).sort((a, b) => a - b);

      const waypoints = indexes.map((ci, si) => ({
        id: crypto.randomUUID(),
        routeId,
        sortOrder: si,
        name: si === 0 ? 'Start' : si === indexes.length - 1 ? 'End' : null,
        location: {
          type: 'Point' as const,
          coordinates: [parsed.coordinates[ci][0], parsed.coordinates[ci][1]],
        },
        elevationM: typeof parsed.coordinates[ci][2] === 'number' ? parsed.coordinates[ci][2] : null,
        waypointType: (si === 0 ? 'start' : si === indexes.length - 1 ? 'end' : 'waypoint') as
          'start' | 'waypoint' | 'end',
        notes: null,
      }));

      const route = {
        id: routeId,
        tripId: null,
        name: parsed.name || 'Imported route',
        description: parsed.description ?? null,
        geometry: { type: 'LineString' as const, coordinates: coords },
        totalDistanceM: parsed.totalDistance,
        elevationGainM: parsed.elevationGain,
        elevationLossM: parsed.elevationLoss,
        maxElevationM: Math.max(...parsed.coordinates.map((c) => c[2] ?? 0)),
        minElevationM: Math.min(...parsed.coordinates.map((c) => c[2] ?? 0)),
        activity: 'backpacking' as const,
        source: 'gpx_import' as const,
        createdAt: now,
        updatedAt: now,
      };

      useRouteStore.getState().setRoute(route, waypoints);
    } catch (err) {
      console.error('GPX import failed:', err);
    }
  };

  const handleBrowseRoutes = () => {
    usePopularRoutesStore.getState().reset();
    usePopularRoutesStore.getState().openPanel();
  };

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100' : 'pointer-events-none scale-95 opacity-0'
      }`}
      role="region"
      aria-label="Get started"
    >
      <div className="pointer-events-auto relative flex flex-col items-center gap-5 rounded-2xl bg-white/25 px-8 py-8 shadow-lg ring-1 ring-white/30 backdrop-blur-md sm:px-12">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50/80 sm:size-16">
          <Mountain className="size-8 text-emerald-600 drop-shadow-sm sm:size-10" aria-hidden="true" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <span className="text-2xl font-bold tracking-tight text-stone-800 drop-shadow-sm sm:text-3xl">
            Strange Grounds
          </span>
          <p className="max-w-md text-center text-sm font-light text-stone-700 sm:text-base">
            Route-aware backcountry safety intelligence
          </p>
        </div>

        <div className="mt-1 w-full max-w-lg">
          <LocationSearch variant="hero" />
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 border-stone-300/60 bg-white/60 px-4 text-xs font-medium text-stone-700 backdrop-blur-sm hover:bg-white/80"
            onClick={handleImportClick}
          >
            <Download className="size-3.5" />
            Import GPX
          </Button>
          <input
            ref={importRef}
            type="file"
            accept=".gpx,.kml"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 border-stone-300/60 bg-white/60 px-4 text-xs font-medium text-stone-700 backdrop-blur-sm hover:bg-white/80"
            onClick={handleBrowseRoutes}
          >
            <Compass className="size-3.5" />
            Browse Popular Routes
          </Button>
        </div>
      </div>
    </div>
  );
}
