'use client';

import { useRef, useEffect, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '@/stores/map-store';
import { MapControls } from './MapControls';

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? '';

const TERRAIN_SOURCE_ID = 'terrain';

export function Map() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const { viewport, setViewport, flyToTarget, clearFlyTo } = useMapStore();

  const handleStyleChange = useCallback((styleUrl: string) => {
    const map = mapRef.current;
    if (!map) return;

    map.setStyle(styleUrl);

    map.once('style.load', () => {
      if (!map.getSource(TERRAIN_SOURCE_ID)) {
        map.addSource(TERRAIN_SOURCE_ID, {
          type: 'raster-dem',
          tiles: [
            'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
          ],
          encoding: 'terrarium',
          tileSize: 256,
        });
      }

      map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1.3 });

      map.setSky({
        'sky-color': '#88C6FC',
        'horizon-color': '#ffffff',
        'sky-horizon-blend': 0.5,
        'atmosphere-blend': 0.8,
      });
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${MAPTILER_KEY}`,
      center: viewport.center,
      zoom: viewport.zoom,
      pitch: viewport.pitch,
      bearing: viewport.bearing,
      maxPitch: 85,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), 'top-left');
    map.addControl(
      new maplibregl.ScaleControl({ maxWidth: 200 }),
      'bottom-left',
    );

    map.on('load', () => {
      map.addSource(TERRAIN_SOURCE_ID, {
        type: 'raster-dem',
        tiles: [
          'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
        ],
        encoding: 'terrarium',
        tileSize: 256,
      });

      map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1.3 });

      map.setSky({
        'sky-color': '#88C6FC',
        'horizon-color': '#ffffff',
        'sky-horizon-blend': 0.5,
        'atmosphere-blend': 0.8,
      });
    });

    map.on('moveend', () => {
      const center = map.getCenter();
      setViewport({
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing(),
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!flyToTarget || !mapRef.current) return;
    mapRef.current.flyTo({
      center: flyToTarget.center,
      zoom: flyToTarget.zoom ?? 11,
      pitch: 0,
      bearing: 0,
      essential: true,
    });
    clearFlyTo();
  }, [flyToTarget, clearFlyTo]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <MapControls onStyleChange={handleStyleChange} />
    </div>
  );
}
