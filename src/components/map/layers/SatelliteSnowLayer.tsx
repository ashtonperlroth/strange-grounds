'use client';

import { useEffect, useRef, useCallback } from 'react';
import type maplibregl from 'maplibre-gl';
import { useBriefingStore } from '@/stores/briefing-store';

const SOURCE_ID = 'satellite-snow-ndsi';
const LAYER_ID = 'satellite-snow-ndsi-layer';

interface SatelliteSnowLayerProps {
  map: maplibregl.Map | null;
  visible: boolean;
}

export function SatelliteSnowLayer({ map, visible }: SatelliteSnowLayerProps) {
  const addedRef = useRef(false);
  const briefing = useBriefingStore((s) => s.currentBriefing);

  const satellite = briefing?.conditions?.satellite as
    | { ndsiUrl?: string; bounds?: [number, number, number, number]; acquisitionDate?: string }
    | undefined;

  const ndsiUrl = satellite?.ndsiUrl ?? null;
  const bounds = satellite?.bounds ?? null;

  const addLayerOnce = useCallback(() => {
    if (!map || addedRef.current) return;
    if (!ndsiUrl || !bounds) return;
    if (map.getSource(SOURCE_ID)) {
      addedRef.current = true;
      return;
    }

    const [west, south, east, north] = bounds;

    map.addSource(SOURCE_ID, {
      type: 'image',
      url: ndsiUrl,
      coordinates: [
        [west, north], // top-left
        [east, north], // top-right
        [east, south], // bottom-right
        [west, south], // bottom-left
      ],
    });

    map.addLayer({
      id: LAYER_ID,
      type: 'raster',
      source: SOURCE_ID,
      paint: {
        'raster-opacity': 0.6,
        'raster-fade-duration': 300,
      },
    });

    addedRef.current = true;
  }, [map, ndsiUrl, bounds]);

  useEffect(() => {
    if (!map) return;

    if (map.isStyleLoaded()) {
      addLayerOnce();
    } else {
      map.once('style.load', addLayerOnce);
    }

    if (map.getLayer(LAYER_ID)) {
      map.setLayoutProperty(
        LAYER_ID,
        'visibility',
        visible ? 'visible' : 'none',
      );
    }
  }, [map, visible, addLayerOnce]);

  // Handle style changes — reset added state so layer is re-added
  useEffect(() => {
    if (!map) return;

    const handler = () => {
      addedRef.current = false;
    };

    map.on('style.load', handler);
    return () => {
      map.off('style.load', handler);
    };
  }, [map]);

  // Update source URL when NDSI data changes
  useEffect(() => {
    if (!map || !ndsiUrl || !bounds) return;

    if (addedRef.current && map.getSource(SOURCE_ID)) {
      const source = map.getSource(SOURCE_ID) as maplibregl.ImageSource;
      const [west, south, east, north] = bounds;
      source.updateImage({
        url: ndsiUrl,
        coordinates: [
          [west, north],
          [east, north],
          [east, south],
          [west, south],
        ],
      });
    }
  }, [map, ndsiUrl, bounds]);

  return null;
}
