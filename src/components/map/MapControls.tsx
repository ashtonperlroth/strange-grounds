'use client';

import { useState, useEffect } from 'react';
import { Pencil, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMapStore } from '@/stores/map-store';
import { usePlanningStore } from '@/stores/planning-store';
import { useRouteStore } from '@/stores/route-store';

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? '';

interface MapStyle {
  id: string;
  label: string;
  url: string;
}

const MAP_STYLES: MapStyle[] = [
  {
    id: 'outdoor',
    label: 'Outdoor',
    url: `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${MAPTILER_KEY}`,
  },
  {
    id: 'satellite',
    label: 'Satellite',
    url: `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`,
  },
  {
    id: 'topo',
    label: 'Topo',
    url: `https://api.maptiler.com/maps/topo-v2/style.json?key=${MAPTILER_KEY}`,
  },
];

interface OverlayDef {
  id: string;
  label: string;
  color: string;
}

const OVERLAY_LAYERS: OverlayDef[] = [
  { id: 'trails', label: 'Show Trails', color: '#a16207' },
  { id: 'hazards', label: 'Show Hazards', color: '#ef4444' },
  { id: 'avalanche-zones', label: 'Avy Zones', color: '#eab308' },
  { id: 'fire-perimeters', label: 'Active Fires', color: '#f97316' },
  { id: 'slope-angle', label: 'Slope Angle', color: '#ef4444' },
  { id: 'satellite-imagery', label: 'Satellite Imagery', color: '#6366f1' },
  { id: 'satellite-snow', label: 'Snow Coverage (Satellite)', color: '#e0f2fe' },
  { id: 'stream-gauges', label: 'Stream Gauges', color: '#06b6d4' },
];

interface MapControlsProps {
  onStyleChange: (styleUrl: string) => void;
}

export function MapControls({ onStyleChange }: MapControlsProps) {
  const [activeStyle, setActiveStyle] = useState('outdoor');
  const [mobileLayersOpen, setMobileLayersOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const activeOverlays = useMapStore((s) => s.activeOverlays);
  const toggleOverlay = useMapStore((s) => s.toggleOverlay);
  const hasLocation = usePlanningStore((s) => s.location !== null);
  const hasRoute = useRouteStore((s) => s.currentRoute !== null);
  const isDrawing = useRouteStore((s) => s.isDrawing);
  const isActive = hasLocation || hasRoute;

  useEffect(() => {
    function update() {
      setIsMobile(window.innerWidth < 768);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const handleStyleSelect = (style: MapStyle) => {
    if (style.id === activeStyle) return;
    setActiveStyle(style.id);
    onStyleChange(style.url);
  };

  const handleStartDrawing = () => {
    const routeStore = useRouteStore.getState();
    if (!routeStore.currentRoute) {
      const routeId = `temp-${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      routeStore.setRoute({
        id: routeId,
        tripId: null,
        name: 'Drawn route',
        description: null,
        geometry: { type: 'LineString', coordinates: [] },
        totalDistanceM: 0,
        elevationGainM: 0,
        elevationLossM: 0,
        maxElevationM: 0,
        minElevationM: 0,
        activity: 'backpacking',
        source: 'manual',
        createdAt: now,
        updatedAt: now,
      }, []);
    }
    routeStore.setIsDrawing(true);
  };

  if (!isActive) return null;

  const showDrawButton = !hasRoute && !isDrawing;
  const activeCount = activeOverlays.size;

  if (isMobile) {
    return (
      <>
        <div className="absolute bottom-28 right-3 z-20 flex flex-col gap-2" role="toolbar" aria-label="Map controls">
          {showDrawButton && (
            <button
              type="button"
              onClick={handleStartDrawing}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/80"
              aria-label="Draw Route"
            >
              <Pencil className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setMobileLayersOpen((v) => !v)}
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/80"
            aria-label="Toggle map layers"
            aria-expanded={mobileLayersOpen}
          >
            <Layers className="size-4" />
            {activeCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>
        </div>

        {mobileLayersOpen && (
          <div className="absolute bottom-28 right-16 z-20 w-52 rounded-lg border border-white/20 bg-black/80 p-1 shadow-xl backdrop-blur-sm">
            <div role="radiogroup" aria-label="Map style">
              {MAP_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => handleStyleSelect(style)}
                  role="radio"
                  aria-checked={activeStyle === style.id}
                  className={cn(
                    'block w-full rounded-md px-3 py-2 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
                    activeStyle === style.id
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white',
                  )}
                >
                  {style.label}
                </button>
              ))}
            </div>
            <div className="my-1 h-px bg-white/10" />
            <div role="group" aria-label="Map layers">
              {OVERLAY_LAYERS.map((layer) => {
                const layerActive = activeOverlays.has(layer.id);
                return (
                  <button
                    key={layer.id}
                    onClick={() => toggleOverlay(layer.id)}
                    role="switch"
                    aria-checked={layerActive}
                    aria-label={`${layer.label} layer`}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
                      layerActive
                        ? 'bg-white/20 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white',
                    )}
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: layerActive ? layer.color : 'transparent',
                        border: `2px solid ${layer.color}`,
                      }}
                      aria-hidden="true"
                    />
                    {layer.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="absolute right-3 top-24 z-10 flex flex-col gap-2" role="toolbar" aria-label="Map controls">
      {showDrawButton && (
        <button
          type="button"
          onClick={handleStartDrawing}
          className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/70 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/80"
        >
          <Pencil className="size-3.5" />
          Draw Route
        </button>
      )}
      <div className="rounded-lg border border-white/20 bg-black/70 p-1 shadow-lg backdrop-blur-sm" role="radiogroup" aria-label="Map style">
        {MAP_STYLES.map((style) => (
          <button
            key={style.id}
            onClick={() => handleStyleSelect(style)}
            role="radio"
            aria-checked={activeStyle === style.id}
            className={cn(
              'block w-full rounded-md px-3 py-1.5 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
              activeStyle === style.id
                ? 'bg-white/20 text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white',
            )}
          >
            {style.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-white/20 bg-black/70 p-1 shadow-lg backdrop-blur-sm" role="group" aria-label="Map layers">
        <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/50" aria-hidden="true">
          Layers
        </div>
        {OVERLAY_LAYERS.map((layer) => {
          const layerActive = activeOverlays.has(layer.id);
          return (
            <button
              key={layer.id}
              onClick={() => toggleOverlay(layer.id)}
              role="switch"
              aria-checked={layerActive}
              aria-label={`${layer.label} layer`}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
                layerActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              )}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: layerActive ? layer.color : 'transparent',
                  border: `2px solid ${layer.color}`,
                }}
                aria-hidden="true"
              />
              {layer.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
