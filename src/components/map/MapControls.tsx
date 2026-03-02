'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useMapStore } from '@/stores/map-store';

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
  { id: 'avalanche-zones', label: 'Avy Zones', color: '#eab308' },
  { id: 'fire-perimeters', label: 'Active Fires', color: '#f97316' },
  { id: 'slope-angle', label: 'Slope Angle', color: '#ef4444' },
];

interface MapControlsProps {
  onStyleChange: (styleUrl: string) => void;
}

export function MapControls({ onStyleChange }: MapControlsProps) {
  const [activeStyle, setActiveStyle] = useState('outdoor');
  const activeOverlays = useMapStore((s) => s.activeOverlays);
  const toggleOverlay = useMapStore((s) => s.toggleOverlay);

  const handleStyleSelect = (style: MapStyle) => {
    if (style.id === activeStyle) return;
    setActiveStyle(style.id);
    onStyleChange(style.url);
  };

  return (
    <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
      <div className="rounded-lg border border-white/20 bg-black/70 p-1 shadow-lg backdrop-blur-sm">
        {MAP_STYLES.map((style) => (
          <button
            key={style.id}
            onClick={() => handleStyleSelect(style)}
            className={cn(
              'block w-full rounded-md px-3 py-1.5 text-left text-xs font-medium transition-colors',
              activeStyle === style.id
                ? 'bg-white/20 text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white',
            )}
          >
            {style.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-white/20 bg-black/70 p-1 shadow-lg backdrop-blur-sm">
        <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">
          Layers
        </div>
        {OVERLAY_LAYERS.map((layer) => {
          const isActive = activeOverlays.has(layer.id);
          return (
            <button
              key={layer.id}
              onClick={() => toggleOverlay(layer.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs font-medium transition-colors',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              )}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: isActive ? layer.color : 'transparent',
                  border: `2px solid ${layer.color}`,
                }}
              />
              {layer.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
