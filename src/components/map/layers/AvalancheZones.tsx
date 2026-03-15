'use client';

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { useRouteStore } from '@/stores/route-store';
import { useMapStore } from '@/stores/map-store';
import { getCursorManager } from '@/lib/map/cursor-manager';

const SOURCE_ID = 'avalanche-zones';
const FILL_LAYER_ID = 'avalanche-zones-fill';
const OUTLINE_LAYER_ID = 'avalanche-zones-outline';
const LABEL_LAYER_ID = 'avalanche-zones-label';

const DANGER_COLORS: Record<number, string> = {
  0: '#94a3b8', // slate-400 — no rating
  1: '#22c55e', // green
  2: '#eab308', // yellow
  3: '#f97316', // orange
  4: '#ef4444', // red
  5: '#1e1e1e', // near-black
};

const DANGER_OUTLINE_COLORS: Record<number, string> = {
  0: '#64748b',
  1: '#16a34a',
  2: '#ca8a04',
  3: '#ea580c',
  4: '#dc2626',
  5: '#000000',
};

const FETCH_URL = '/api/avalanche-zones';

// Module-level cache — persists across component re-mounts and toggle cycles
let cachedGeoJSON: GeoJSON.FeatureCollection | null = null;
let prefetchPromise: Promise<GeoJSON.FeatureCollection> | null = null;

function getPrefetchPromise(): Promise<GeoJSON.FeatureCollection> {
  if (cachedGeoJSON) return Promise.resolve(cachedGeoJSON);
  if (prefetchPromise) return prefetchPromise;
  prefetchPromise = fetch(FETCH_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`Avalanche zones ${res.status}`);
      return res.json() as Promise<GeoJSON.FeatureCollection>;
    })
    .then((data) => {
      cachedGeoJSON = data;
      return data;
    })
    .catch((err) => {
      prefetchPromise = null; // allow retry on next attempt
      throw err;
    });
  return prefetchPromise;
}

function dangerColorExpression(
  property: string,
  colors: Record<number, string>,
): maplibregl.ExpressionSpecification {
  return [
    'match',
    ['get', property],
    1, colors[1],
    2, colors[2],
    3, colors[3],
    4, colors[4],
    5, colors[5],
    colors[0],
  ];
}

interface AvalancheZonesProps {
  map: maplibregl.Map | null;
  visible: boolean;
}

export function AvalancheZones({ map, visible }: AvalancheZonesProps) {
  const addedRef = useRef(false);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  // Kick off background prefetch on mount regardless of visibility
  useEffect(() => {
    getPrefetchPromise().catch(() => { /* silent background failure */ });
  }, []);

  const addLayerOnce = useCallback(() => {
    if (!map || addedRef.current) return;
    if (map.getSource(SOURCE_ID)) {
      addedRef.current = true;
      return;
    }

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    map.addLayer({
      id: FILL_LAYER_ID,
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': dangerColorExpression('dangerLevel', DANGER_COLORS),
        'fill-opacity': 0.25,
      },
    });

    map.addLayer({
      id: OUTLINE_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': dangerColorExpression('dangerLevel', DANGER_OUTLINE_COLORS),
        'line-width': 2,
        'line-opacity': 0.8,
      },
    });

    map.addLayer({
      id: LABEL_LAYER_ID,
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 11,
        'text-font': ['Open Sans Bold'],
        'text-anchor': 'center',
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#000000',
        'text-halo-width': 1.5,
      },
    });

    addedRef.current = true;
  }, [map]);

  useEffect(() => {
    if (!map) return;

    function setLayerVisibility(show: boolean) {
      if (!map) return;
      const vis = show ? 'visible' : 'none';
      for (const id of [FILL_LAYER_ID, OUTLINE_LAYER_ID, LABEL_LAYER_ID]) {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', vis);
        }
      }
    }

    function applyData(data: GeoJSON.FeatureCollection) {
      const source = map?.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (source) source.setData(data);
    }

    function loadData() {
      if (!map) return;
      const { setLayerLoading } = useMapStore.getState();

      if (cachedGeoJSON) {
        // Instant — serve from cache
        applyData(cachedGeoJSON);
        return;
      }

      // Not yet cached — show loading indicator and wait for prefetch
      setLayerLoading('avalanche-zones', true);
      getPrefetchPromise()
        .then((data) => {
          applyData(data);
        })
        .catch((err) => {
          console.warn('Avalanche zones fetch failed:', err);
        })
        .finally(() => {
          setLayerLoading('avalanche-zones', false);
        });
    }

    function handleClick(e: maplibregl.MapMouseEvent) {
      if (!map) return;
      if (useRouteStore.getState().isDrawing) return;

      const features = map.queryRenderedFeatures(e.point, {
        layers: [FILL_LAYER_ID],
      });

      if (features.length === 0) return;

      const feature = features[0];
      const props = feature.properties;
      if (!props) return;

      const name = props.name ?? 'Unknown Zone';
      const dangerLevel = props.dangerLevel ?? 0;
      const dangerLabel = props.dangerLabel ?? 'No Rating';
      const centerName = props.centerName ?? props.center ?? null;
      const travelAdvice = props.travel_advice ?? null;
      const forecastLink = props.link ?? null;
      let warning: string | null = null;
      if (typeof props.warning === 'string' && props.warning.length > 0) {
        warning = props.warning;
      }

      const dangerColor = DANGER_COLORS[dangerLevel] ?? DANGER_COLORS[0];

      const warningHtml = warning
        ? `<div style="margin-top:6px;padding:4px 6px;background:rgba(239,68,68,0.15);border-radius:4px;font-size:11px;color:#fca5a5;">${warning}</div>`
        : '';

      const adviceHtml = travelAdvice
        ? `<div style="margin-top:6px;font-size:11px;color:#cbd5e1;line-height:1.4;">${travelAdvice}</div>`
        : '';

      const linkHtml = forecastLink
        ? `<div style="margin-top:6px;"><a href="${forecastLink}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#60a5fa;text-decoration:underline;">Full forecast →</a></div>`
        : '';

      const html = `
        <div style="font-family:system-ui,sans-serif;min-width:180px;max-width:260px;">
          <div style="font-size:14px;font-weight:600;color:#f1f5f9;margin-bottom:4px;">${name}</div>
          ${centerName ? `<div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">${centerName}</div>` : ''}
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${dangerColor};"></span>
            <span style="font-size:13px;font-weight:500;color:#e2e8f0;">${dangerLabel} (${dangerLevel})</span>
          </div>
          ${warningHtml}
          ${adviceHtml}
          ${linkHtml}
        </div>
      `;

      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: '280px',
        className: 'avalanche-zone-popup',
      })
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);

      e.originalEvent.stopPropagation();
    }

    const cursorMgr = map ? getCursorManager(map) : null;

    function handleMouseEnter() {
      if (useRouteStore.getState().isDrawing) return;
      cursorMgr?.request('hover-feature', 'pointer');
    }

    function handleMouseLeave() {
      cursorMgr?.release('hover-feature');
    }

    if (map.isStyleLoaded()) {
      addLayerOnce();
    } else {
      map.once('style.load', addLayerOnce);
    }

    setLayerVisibility(visible);

    if (visible) {
      loadData();
      map.on('click', FILL_LAYER_ID, handleClick);
      map.on('mouseenter', FILL_LAYER_ID, handleMouseEnter);
      map.on('mouseleave', FILL_LAYER_ID, handleMouseLeave);
    }

    return () => {
      cursorMgr?.release('hover-feature');
      if (map) {
        map.off('click', FILL_LAYER_ID, handleClick);
        map.off('mouseenter', FILL_LAYER_ID, handleMouseEnter);
        map.off('mouseleave', FILL_LAYER_ID, handleMouseLeave);
      }
    };
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

  return null;
}
