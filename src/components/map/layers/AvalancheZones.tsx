'use client';

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';

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

function buildFetchUrl(bbox: [number, number, number, number]): string {
  const params = new URLSearchParams({
    west: bbox[0].toString(),
    south: bbox[1].toString(),
    east: bbox[2].toString(),
    north: bbox[3].toString(),
  });
  return `/api/avalanche-zones?${params}`;
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
  const abortRef = useRef<AbortController | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

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

    function loadData() {
      if (!map) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const bounds = map.getBounds();
      const bbox: [number, number, number, number] = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ];

      fetch(buildFetchUrl(bbox), { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`Avalanche zones ${res.status}`);
          return res.json();
        })
        .then((geojson) => {
          if (controller.signal.aborted) return;
          const source = map!.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
          if (source) {
            source.setData(geojson);
          }
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          console.warn('Avalanche zones fetch failed:', err);
        });
    }

    function handleClick(e: maplibregl.MapMouseEvent) {
      if (!map) return;

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
      const centerName = props.centerName ?? null;

      let problemsArr: { name: string; likelihood: string }[] = [];
      try {
        problemsArr =
          typeof props.problems === 'string'
            ? JSON.parse(props.problems)
            : props.problems ?? [];
      } catch {
        problemsArr = [];
      }

      const dangerColor = DANGER_COLORS[dangerLevel] ?? DANGER_COLORS[0];

      const problemsHtml =
        problemsArr.length > 0
          ? `<div style="margin-top:6px;">
              <div style="font-size:11px;color:#94a3b8;margin-bottom:2px;">Problems</div>
              ${problemsArr
                .map(
                  (p: { name: string; likelihood: string }) =>
                    `<div style="font-size:12px;color:#e2e8f0;">• ${p.name}${p.likelihood ? ` (${p.likelihood})` : ''}</div>`,
                )
                .join('')}
            </div>`
          : '';

      const html = `
        <div style="font-family:system-ui,sans-serif;min-width:180px;">
          <div style="font-size:14px;font-weight:600;color:#f1f5f9;margin-bottom:4px;">${name}</div>
          ${centerName ? `<div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">${centerName}</div>` : ''}
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${dangerColor};"></span>
            <span style="font-size:13px;font-weight:500;color:#e2e8f0;">${dangerLabel} (${dangerLevel})</span>
          </div>
          ${problemsHtml}
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

    function handleMouseEnter() {
      if (map) map.getCanvas().style.cursor = 'pointer';
    }

    function handleMouseLeave() {
      if (map) map.getCanvas().style.cursor = '';
    }

    if (map.isStyleLoaded()) {
      addLayerOnce();
    } else {
      map.once('style.load', addLayerOnce);
    }

    setLayerVisibility(visible);

    if (visible) {
      loadData();
      map.on('moveend', loadData);
      map.on('click', FILL_LAYER_ID, handleClick);
      map.on('mouseenter', FILL_LAYER_ID, handleMouseEnter);
      map.on('mouseleave', FILL_LAYER_ID, handleMouseLeave);
    }

    return () => {
      abortRef.current?.abort();
      if (map) {
        map.off('moveend', loadData);
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
