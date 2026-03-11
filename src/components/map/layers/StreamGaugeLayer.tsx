'use client';

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { useRouteStore } from '@/stores/route-store';
import { getCursorManager } from '@/lib/map/cursor-manager';

export const STREAM_GAUGE_SOURCE_ID = 'stream-gauges';
export const STREAM_GAUGE_CIRCLE_LAYER_ID = 'stream-gauges-circle';

const SOURCE_ID = STREAM_GAUGE_SOURCE_ID;
const CIRCLE_LAYER_ID = STREAM_GAUGE_CIRCLE_LAYER_ID;
const LABEL_LAYER_ID = 'stream-gauges-label';

const FLOW_COLORS = {
  normal: '#22c55e',
  elevated: '#eab308',
  high: '#ef4444',
  unknown: '#94a3b8',
};

function flowColorExpression(): maplibregl.ExpressionSpecification {
  return [
    'match',
    ['get', 'flowStatus'],
    'normal', FLOW_COLORS.normal,
    'elevated', FLOW_COLORS.elevated,
    'high', FLOW_COLORS.high,
    FLOW_COLORS.unknown,
  ];
}

function buildSparklineSvg(
  dischargeCfs: number,
  percentOfMedian: number | null,
): string {
  if (percentOfMedian === null) return '';

  const median = dischargeCfs / ((percentOfMedian || 100) / 100);
  const points = [
    median * 0.8,
    median * 0.9,
    median,
    median * 1.05,
    median * 0.95,
    median * 1.1,
    dischargeCfs,
  ];

  const width = 120;
  const height = 32;
  const padding = 2;
  const max = Math.max(...points) * 1.1;
  const min = Math.min(...points) * 0.9;
  const range = max - min || 1;

  const coords = points
    .map((val, i) => {
      const x = padding + (i / (points.length - 1)) * (width - 2 * padding);
      const y =
        height - padding - ((val - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(' ');

  const thresholdY120 =
    height -
    padding -
    ((median * 1.2 - min) / range) * (height - 2 * padding);
  const thresholdY180 =
    height -
    padding -
    ((median * 1.8 - min) / range) * (height - 2 * padding);

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="margin-top:4px;">
      <line x1="${padding}" y1="${thresholdY120}" x2="${width - padding}" y2="${thresholdY120}"
        stroke="#eab308" stroke-width="0.5" stroke-dasharray="3,2" opacity="0.5"/>
      <line x1="${padding}" y1="${thresholdY180}" x2="${width - padding}" y2="${thresholdY180}"
        stroke="#ef4444" stroke-width="0.5" stroke-dasharray="3,2" opacity="0.5"/>
      <polyline points="${coords}" fill="none" stroke="#60a5fa" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${coords.split(' ').pop()?.split(',')[0]}" cy="${coords.split(' ').pop()?.split(',')[1]}" r="2.5" fill="#60a5fa"/>
    </svg>
  `;
}

function buildPopupHtml(props: Record<string, unknown>): string {
  const name = (props.name as string) ?? 'Unknown Gauge';
  const siteId = (props.siteId as string) ?? '';
  const dischargeCfs = props.dischargeCfs as number | null;
  const percentOfMedian = props.percentOfMedian as number | null;
  const flowStatus = (props.flowStatus as string) ?? 'unknown';
  const timestamp = props.timestamp as string | null;

  const statusColor =
    FLOW_COLORS[flowStatus as keyof typeof FLOW_COLORS] ?? FLOW_COLORS.unknown;

  const statusLabel =
    flowStatus === 'high'
      ? 'High'
      : flowStatus === 'elevated'
        ? 'Elevated'
        : flowStatus === 'normal'
          ? 'Normal'
          : 'No Data';

  const flowText =
    dischargeCfs !== null ? `${dischargeCfs.toLocaleString()} cfs` : 'N/A';

  const medianText =
    percentOfMedian !== null ? `${percentOfMedian}% of median` : '';

  const timeText = timestamp
    ? new Date(timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  const sparkline =
    dischargeCfs !== null
      ? buildSparklineSvg(dischargeCfs, percentOfMedian)
      : '';

  const usgsLink = siteId
    ? `<div style="margin-top:6px;"><a href="https://waterdata.usgs.gov/monitoring-location/${siteId}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#60a5fa;text-decoration:underline;">View on USGS →</a></div>`
    : '';

  return `
    <div style="font-family:system-ui,sans-serif;min-width:180px;max-width:240px;">
      <div style="font-size:14px;font-weight:600;color:#f1f5f9;margin-bottom:2px;">${name}</div>
      ${siteId ? `<div style="font-size:10px;color:#64748b;margin-bottom:6px;">USGS ${siteId}</div>` : ''}
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${statusColor};"></span>
        <span style="font-size:13px;font-weight:500;color:#e2e8f0;">${flowText}</span>
      </div>
      ${medianText ? `<div style="font-size:12px;color:#94a3b8;">${medianText} · ${statusLabel}</div>` : `<div style="font-size:12px;color:#94a3b8;">${statusLabel}</div>`}
      ${sparkline}
      ${timeText ? `<div style="font-size:10px;color:#64748b;margin-top:4px;">Updated ${timeText}</div>` : ''}
      ${usgsLink}
    </div>
  `;
}

interface StreamGaugeLayerProps {
  map: maplibregl.Map | null;
  visible: boolean;
}

export function StreamGaugeLayer({ map, visible }: StreamGaugeLayerProps) {
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
      id: CIRCLE_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          6, 4,
          10, 7,
          14, 10,
        ],
        'circle-color': flowColorExpression(),
        'circle-stroke-color': '#1e293b',
        'circle-stroke-width': 1.5,
        'circle-opacity': 0.9,
      },
    });

    map.addLayer({
      id: LABEL_LAYER_ID,
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 10,
        'text-font': ['Open Sans Bold'],
        'text-anchor': 'top',
        'text-offset': [0, 1],
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#e2e8f0',
        'text-halo-color': '#0f172a',
        'text-halo-width': 1.5,
      },
      minzoom: 10,
    });

    addedRef.current = true;
  }, [map]);

  useEffect(() => {
    if (!map) return;

    function setLayerVisibility(show: boolean) {
      if (!map) return;
      const vis = show ? 'visible' : 'none';
      for (const id of [CIRCLE_LAYER_ID, LABEL_LAYER_ID]) {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', vis);
        }
      }
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    function loadData() {
      if (!map) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const bounds = map.getBounds();
      const params = new URLSearchParams({
        west: bounds.getWest().toFixed(6),
        south: bounds.getSouth().toFixed(6),
        east: bounds.getEast().toFixed(6),
        north: bounds.getNorth().toFixed(6),
      });

      fetch(`/api/stream-gauges?${params}`, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`Stream gauges ${res.status}`);
          return res.json();
        })
        .then((geojson) => {
          if (controller.signal.aborted) return;
          const source = map!.getSource(SOURCE_ID) as
            | maplibregl.GeoJSONSource
            | undefined;
          if (source) {
            source.setData(geojson);
          }
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          console.warn('[stream-gauges] Fetch failed:', err);
        });
    }

    function debouncedLoad() {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadData, 300);
    }

    function handleClick(e: maplibregl.MapMouseEvent) {
      if (!map) return;
      if (useRouteStore.getState().isDrawing) return;

      const tolerance = 12;
      const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
        [e.point.x - tolerance, e.point.y - tolerance],
        [e.point.x + tolerance, e.point.y + tolerance],
      ];

      const features = map.queryRenderedFeatures(bbox, {
        layers: [CIRCLE_LAYER_ID],
      });

      if (features.length === 0) return;

      const feature = features[0];
      const props = feature.properties;
      if (!props) return;

      const coords =
        feature.geometry.type === 'Point'
          ? (feature.geometry.coordinates as [number, number])
          : [e.lngLat.lng, e.lngLat.lat] as [number, number];

      const html = buildPopupHtml(props);

      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: '260px',
        className: 'stream-gauge-popup',
        offset: 8,
      })
        .setLngLat(coords)
        .setHTML(html)
        .addTo(map);

      e.originalEvent.stopPropagation();
    }

    const cursorMgr = map ? getCursorManager(map) : null;

    if (map.isStyleLoaded()) {
      addLayerOnce();
    } else {
      map.once('style.load', addLayerOnce);
    }

    setLayerVisibility(visible);

    function handleMouseMove(e: maplibregl.MapMouseEvent) {
      if (!map) return;
      if (useRouteStore.getState().isDrawing) return;

      const tolerance = 12;
      const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
        [e.point.x - tolerance, e.point.y - tolerance],
        [e.point.x + tolerance, e.point.y + tolerance],
      ];

      const features = map.queryRenderedFeatures(bbox, {
        layers: [CIRCLE_LAYER_ID],
      });

      if (features.length > 0) {
        cursorMgr?.request('hover-feature', 'pointer');
      } else {
        cursorMgr?.release('hover-feature');
      }
    }

    if (visible) {
      loadData();
      map.on('moveend', debouncedLoad);
      map.on('click', handleClick);
      map.on('mousemove', handleMouseMove);
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      abortRef.current?.abort();
      cursorMgr?.release('hover-feature');
      popupRef.current?.remove();
      if (map) {
        map.off('moveend', debouncedLoad);
        map.off('click', handleClick);
        map.off('mousemove', handleMouseMove);
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
