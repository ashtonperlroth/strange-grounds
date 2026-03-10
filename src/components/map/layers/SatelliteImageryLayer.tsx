'use client';

import { useEffect, useRef, useCallback } from 'react';
import type maplibregl from 'maplibre-gl';
import { useBriefingStore } from '@/stores/briefing-store';

const SOURCE_ID = 'satellite-imagery-truecolor';
const LAYER_ID = 'satellite-imagery-truecolor-layer';

interface SatelliteImageryLayerProps {
  map: maplibregl.Map | null;
  visible: boolean;
}

export function SatelliteImageryLayer({ map, visible }: SatelliteImageryLayerProps) {
  const addedRef = useRef(false);
  const briefing = useBriefingStore((s) => s.currentBriefing);

  const satellite = briefing?.conditions?.satellite as
    | { trueColorUrl?: string; bounds?: [number, number, number, number]; acquisitionDate?: string }
    | undefined;

  const trueColorUrl = satellite?.trueColorUrl ?? null;
  const bounds = satellite?.bounds ?? null;

  const addLayerOnce = useCallback(() => {
    if (!map || addedRef.current) return;
    if (!trueColorUrl || !bounds) return;
    if (map.getSource(SOURCE_ID)) {
      addedRef.current = true;
      return;
    }

    const [west, south, east, north] = bounds;

    map.addSource(SOURCE_ID, {
      type: 'image',
      url: trueColorUrl,
      coordinates: [
        [west, north],
        [east, north],
        [east, south],
        [west, south],
      ],
    });

    // Insert below the NDSI snow layer if it exists, but above base tiles
    const beforeLayer = map.getLayer('satellite-snow-ndsi-layer')
      ? 'satellite-snow-ndsi-layer'
      : undefined;

    map.addLayer(
      {
        id: LAYER_ID,
        type: 'raster',
        source: SOURCE_ID,
        paint: {
          'raster-opacity': 0.8,
          'raster-fade-duration': 300,
        },
      },
      beforeLayer,
    );

    addedRef.current = true;
  }, [map, trueColorUrl, bounds]);

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

  // Update source URL when imagery data changes
  useEffect(() => {
    if (!map || !trueColorUrl || !bounds) return;

    if (addedRef.current && map.getSource(SOURCE_ID)) {
      const source = map.getSource(SOURCE_ID) as maplibregl.ImageSource;
      const [west, south, east, north] = bounds;
      source.updateImage({
        url: trueColorUrl,
        coordinates: [
          [west, north],
          [east, north],
          [east, south],
          [west, south],
        ],
      });
    }
  }, [map, trueColorUrl, bounds]);

  return null;
}
