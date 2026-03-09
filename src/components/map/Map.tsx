'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Loader2 } from 'lucide-react';
import { useMapStore } from '@/stores/map-store';
import { usePlanningStore } from '@/stores/planning-store';
import { useRouteStore } from '@/stores/route-store';
import { MapControls } from './MapControls';
import { AvalancheZones } from './layers/AvalancheZones';
import { FirePerimeters } from './layers/FirePerimeters';
import { SlopeAngleShading } from './layers/SlopeAngleShading';
import { TrailLayer } from './layers/TrailLayer';
import { RouteLayer } from './layers/RouteLayer';
import { RouteDrawing } from './interactions/RouteDrawing';
import { ROUTE_WAYPOINTS_CIRCLE_LAYER_ID } from './route-constants';
import { RouteToolbar } from '@/components/routes/RouteToolbar';
import { WaypointPopup } from '@/components/routes/WaypointPopup';
import { ElevationProfile } from '@/components/routes/ElevationProfile';

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? '';

const TERRAIN_SOURCE_ID = 'terrain';

function createPinElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'planning-pin';
  el.innerHTML = `
    <svg width="32" height="44" viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 28 16 28s16-16 16-28C32 7.163 24.837 0 16 0z" fill="#059669"/>
      <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 28 16 28s16-16 16-28C32 7.163 24.837 0 16 0z" fill="url(#pin-gradient)"/>
      <circle cx="16" cy="15" r="6" fill="white"/>
      <defs>
        <linearGradient id="pin-gradient" x1="16" y1="0" x2="16" y2="44" gradientUnits="userSpaceOnUse">
          <stop stop-color="#34d399" stop-opacity="0.4"/>
          <stop offset="1" stop-color="#059669" stop-opacity="0"/>
        </linearGradient>
      </defs>
    </svg>
  `;
  el.style.cursor = 'pointer';
  return el;
}

let reverseGeocodeController: AbortController | null = null;

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  reverseGeocodeController?.abort();
  const controller = new AbortController();
  reverseGeocodeController = controller;

  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      format: 'json',
      zoom: '14',
    });
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params}`,
      { signal: controller.signal },
    );
    const data = await res.json();
    return data?.display_name?.split(',')[0] ?? null;
  } catch {
    return null;
  }
}

export function Map() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { viewport, setViewport, flyToTarget, clearFlyTo } = useMapStore();
  const activeOverlays = useMapStore((s) => s.activeOverlays);
  const location = usePlanningStore((s) => s.location);

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
    setMapInstance(map);

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

      setIsLoading(false);
    });

    map.on('moveend', () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const center = map.getCenter();
        setViewport({
          center: [center.lng, center.lat],
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing(),
        });
      }, 150);
    });

    map.on('click', (e) => {
      if (useRouteStore.getState().isDrawing) return;

      const clickedWaypoint = map.getLayer(ROUTE_WAYPOINTS_CIRCLE_LAYER_ID)
        ? map.queryRenderedFeatures(e.point, {
            layers: [ROUTE_WAYPOINTS_CIRCLE_LAYER_ID],
          }).length > 0
        : false;
      if (clickedWaypoint) return;

      const lat = e.lngLat.lat;
      const lng = e.lngLat.lng;

      usePlanningStore.getState().setLocation({ lat, lng, name: null });

      reverseGeocode(lat, lng).then((name) => {
        if (name) {
          const current = usePlanningStore.getState().location;
          if (current && current.lat === lat && current.lng === lng) {
            usePlanningStore.getState().setLocation({ lat, lng, name });
          }
        }
      });
    });

    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(containerRef.current);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!location) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (markerRef.current) {
      markerRef.current.setLngLat([location.lng, location.lat]);
    } else {
      const el = createPinElement();
      markerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([location.lng, location.lat])
        .addTo(map);
    }
  }, [location]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" role="application" aria-label="Interactive map" />

      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-stone-100/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-lg bg-white/90 px-4 py-2 shadow-sm">
            <Loader2 className="size-4 animate-spin text-emerald-600" />
            <span className="text-sm text-stone-600">Loading map&hellip;</span>
          </div>
        </div>
      )}

      <MapControls onStyleChange={handleStyleChange} />
      <RouteToolbar />
      <TrailLayer map={mapInstance} visible={activeOverlays.has('trails')} />
      <RouteLayer map={mapInstance} />
      <RouteDrawing map={mapInstance} />
      <WaypointPopup map={mapInstance} />
      <ElevationProfile />
      <AvalancheZones
        map={mapInstance}
        visible={activeOverlays.has('avalanche-zones')}
      />
      <FirePerimeters
        map={mapInstance}
        visible={activeOverlays.has('fire-perimeters')}
      />
      <SlopeAngleShading
        map={mapInstance}
        visible={activeOverlays.has('slope-angle')}
      />
    </div>
  );
}
