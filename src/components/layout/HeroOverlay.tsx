'use client';

import { useRef, type ChangeEvent } from 'react';
import { Compass, Download, Mountain } from 'lucide-react';
import { toast } from 'sonner';
import { LocationSearch } from '@/components/planning/LocationSearch';
import { usePlanningStore, type Activity } from '@/stores/planning-store';
import { useMapStore } from '@/stores/map-store';
import { useRouteStore } from '@/stores/route-store';
import { usePopularRoutesStore } from '@/stores/popular-routes-store';
import { Button } from '@/components/ui/button';

const QUICK_TRY_LOCATIONS = [
  { name: 'Teton Pass', slug: 'teton-pass', lat: 43.4888, lng: -110.9478 },
  { name: 'Mt Rainier', slug: 'mt-rainier', lat: 46.8523, lng: -121.7603 },
  { name: 'Tahoe Rim Trail', slug: 'tahoe-rim-trail', lat: 39.0968, lng: -120.0324 },
] as const;

const ACTIVITY_PILLS: { label: Activity; emoji: string }[] = [
  { label: 'Ski Touring', emoji: '🎿' },
  { label: 'Backpacking', emoji: '🥾' },
  { label: 'Mountaineering', emoji: '⛰️' },
  { label: 'Day Hike', emoji: '🌲' },
  { label: 'Trail Running', emoji: '🏃' },
];

export function HeroOverlay() {
  const location = usePlanningStore((s) => s.location);
  const activity = usePlanningStore((s) => s.activity);
  const setLocation = usePlanningStore((s) => s.setLocation);
  const setActivity = usePlanningStore((s) => s.setActivity);
  const flyTo = useMapStore((s) => s.flyTo);
  const hasRoute = useRouteStore((s) => s.currentRoute !== null);
  const routesPanelOpen = usePopularRoutesStore((s) => s.panelOpen);
  const isVisible = location === null && !hasRoute && !routesPanelOpen;
  const importRef = useRef<HTMLInputElement>(null);
  const onboardingShownRef = useRef(false);

  // Show onboarding hint once when location is selected
  const prevLocationRef = useRef<typeof location>(null);
  if (location !== null && prevLocationRef.current === null && !onboardingShownRef.current) {
    onboardingShownRef.current = true;
    // Schedule toast after render
    setTimeout(() => {
      toast('Select your activity and dates, then click Generate', {
        duration: 5000,
      });
    }, 0);
  }
  prevLocationRef.current = location;

  const handleQuickTry = (loc: (typeof QUICK_TRY_LOCATIONS)[number]) => {
    setLocation({ lat: loc.lat, lng: loc.lng, name: loc.name });
    flyTo({ center: [loc.lng, loc.lat], zoom: 11 });
  };

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
      const { trackImportGPX } = await import('@/lib/analytics');
      trackImportGPX();

      toast.success(`Imported ${parsed.name || 'route'}`, {
        description: `${(parsed.totalDistance / 1609).toFixed(1)} mi · ${Math.round(parsed.elevationGain * 3.281)} ft gain`,
      });
    } catch (err) {
      console.error('GPX import failed:', err);
      toast.error('Import failed', {
        description: 'Could not parse the file. Is it a valid GPX or KML?',
      });
    }
  };

  const handleBrowseRoutes = () => {
    usePopularRoutesStore.getState().reset();
    usePopularRoutesStore.getState().openPanel();
  };

  return (
    <div
      data-testid="hero-overlay"
      className={`pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100' : 'scale-95 opacity-0'
      }`}
      role="region"
      aria-label="Get started"
    >
      <div
        className={`relative flex w-full max-w-[520px] flex-col items-center gap-5 rounded-2xl backdrop-blur-md bg-white/85 px-8 py-8 shadow-xl ring-1 ring-white/40 sm:px-10 ${
          isVisible ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        {/* Icon + tagline */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50/80">
            <Mountain className="size-8 text-emerald-600 drop-shadow-sm" aria-hidden="true" />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-stone-800">
              Every data source. One briefing.
            </span>
            <p className="max-w-md text-center text-sm text-stone-600 leading-snug">
              AI-powered backcountry conditions intelligence — avalanche, weather, snowpack, stream
              flows, fires, and satellite imagery synthesized into a single expert briefing for your
              trip.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="w-full">
          <LocationSearch variant="hero" />
        </div>

        {/* Quick-try links */}
        <div className="flex items-center gap-1.5 text-xs text-stone-500">
          <span className="font-medium text-stone-400">Try:</span>
          {QUICK_TRY_LOCATIONS.map((loc, i) => (
            <span key={loc.slug} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true" className="text-stone-300">·</span>}
              <button
                data-testid={`quick-try-${loc.slug}`}
                type="button"
                onClick={() => handleQuickTry(loc)}
                className="font-medium text-emerald-700 underline-offset-2 hover:underline hover:text-emerald-800 transition-colors"
              >
                {loc.name}
              </button>
            </span>
          ))}
        </div>

        {/* Activity pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {ACTIVITY_PILLS.map(({ label, emoji }) => (
            <button
              key={label}
              data-testid={`activity-pill-${label.toLowerCase().replace(/\s+/g, '-')}`}
              type="button"
              onClick={() => setActivity(label)}
              className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                activity === label
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-stone-200 bg-white/70 text-stone-600 hover:border-stone-300 hover:bg-white/90'
              }`}
            >
              <span aria-hidden="true">{emoji}</span>
              {label}
            </button>
          ))}
        </div>

        {/* GPX import + browse routes */}
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

        {/* Trust indicators */}
        <p className="text-xs text-stone-400 font-medium tracking-wide">
          6 data sources · AI synthesis · Free
        </p>
      </div>
    </div>
  );
}
