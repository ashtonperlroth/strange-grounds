'use client';

import { useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useSegmentStore } from '@/stores/segment-store';
import { useBriefingStore } from '@/stores/briefing-store';
import {
  HAZARD_COLORS,
  HAZARD_LABELS,
  HAZARD_MARKER_ICONS,
} from '@/lib/routes/hazard-colors';
import type { HazardLevel, SegmentConditions } from '@/lib/types/briefing';

interface HazardMarkersProps {
  map: maplibregl.Map | null;
  visible: boolean;
}

interface MarkerData {
  lngLat: [number, number];
  hazardLevel: HazardLevel;
  segmentOrder: number;
  distanceM: number;
  factors: string[];
  terrainType: string;
  recommendations: string;
}

function segmentMidCoord(coords: number[][]): [number, number] {
  if (coords.length === 0) return [0, 0];
  const mid = Math.floor(coords.length / 2);
  return [coords[mid][0], coords[mid][1]];
}

function formatFactorHtml(factor: string): string {
  return factor
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getRecommendation(level: HazardLevel, factors: string[], terrainType: string): string {
  if (factors.includes('active_fire_nearby')) {
    return 'Avoid this area. Check current fire closures and evacuation orders.';
  }
  if (factors.some((f) => f.startsWith('avalanche_danger'))) {
    return 'Consider alternate line on sub-30° terrain. Travel one-at-a-time through exposed slopes.';
  }
  if (factors.includes('river_crossing_high_flow')) {
    return 'Time crossing for early morning when flow is lowest. Scout for alternate crossings.';
  }
  if (factors.some((f) => f.startsWith('wind_gusts'))) {
    return 'Consider timing to avoid peak winds. Be prepared to hunker down if gusts exceed comfort level.';
  }
  if (factors.includes('steep_slope_wind_loading')) {
    return 'Assess wind-loading on steep slopes. Consider alternate aspect.';
  }
  if (factors.includes('hypothermia_risk')) {
    return 'Carry extra insulation layers. Be prepared for rapid onset of cold conditions.';
  }
  if (level === 'extreme') {
    return 'Strongly consider postponing or choosing an alternate route.';
  }
  if (level === 'high') {
    return 'Exercise extreme caution. Consider group size, timing, and escape routes.';
  }
  if (terrainType === 'ridge' || terrainType === 'exposed_traverse') {
    return 'Exposed terrain. Monitor weather closely and have bailout plan ready.';
  }
  return 'Proceed with increased awareness and conservative decision-making.';
}

function formatDistanceRange(segmentOrder: number, distanceM: number): string {
  const startMi = segmentOrder * (distanceM * 0.000621371);
  const endMi = startMi + distanceM * 0.000621371;
  return `Mile ${startMi.toFixed(1)} – ${endMi.toFixed(1)}`;
}

function createMarkerElement(icon: string): HTMLDivElement {
  const el = document.createElement('div');
  el.style.fontSize = '24px';
  el.style.cursor = 'pointer';
  el.style.filter = 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))';
  el.textContent = icon;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', 'Hazard marker');
  return el;
}

export function HazardMarkers({ map, visible }: HazardMarkersProps) {
  const segments = useSegmentStore((s) => s.segments);
  const briefing = useBriefingStore((s) => s.currentBriefing);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const segmentConditions = useMemo<SegmentConditions[]>(() => {
    if (!briefing?.conditions) return [];
    const routeAnalysis = briefing.conditions.routeAnalysis as
      | { segments?: SegmentConditions[] }
      | undefined;
    return routeAnalysis?.segments ?? [];
  }, [briefing?.conditions]);

  const markerDataList = useMemo<MarkerData[]>(() => {
    if (segmentConditions.length === 0 || segments.length === 0) return [];

    const condMap = new Map(
      segmentConditions.map((sc) => [sc.segmentOrder, sc]),
    );

    const markers: MarkerData[] = [];
    for (const seg of segments) {
      const sc = condMap.get(seg.segmentOrder);
      if (!sc) continue;
      const level = sc.hazardLevel as HazardLevel;
      if (level !== 'considerable' && level !== 'high' && level !== 'extreme') continue;

      const coords = seg.geometry.coordinates;
      const lngLat = segmentMidCoord(coords);

      markers.push({
        lngLat,
        hazardLevel: level,
        segmentOrder: seg.segmentOrder,
        distanceM: seg.distanceM,
        factors: sc.hazardFactors,
        terrainType: seg.terrainType,
        recommendations: getRecommendation(level, sc.hazardFactors, seg.terrainType),
      });
    }

    return markers;
  }, [segments, segmentConditions]);

  useEffect(() => {
    for (const marker of markersRef.current) {
      marker.remove();
    }
    markersRef.current = [];

    if (!map || !visible || markerDataList.length === 0) return;

    for (const data of markerDataList) {
      const icon = HAZARD_MARKER_ICONS[data.hazardLevel] ?? '⚠️';
      const el = createMarkerElement(icon);

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(data.lngLat)
        .addTo(map);

      const color = HAZARD_COLORS[data.hazardLevel];
      const label = HAZARD_LABELS[data.hazardLevel];
      const factorsHtml = data.factors.length > 0
        ? data.factors.map((f) => `<li style="margin:2px 0">${formatFactorHtml(f)}</li>`).join('')
        : '<li>General hazard conditions</li>';

      const distRange = formatDistanceRange(data.segmentOrder, data.distanceM);

      const popupHtml = `
        <div style="font-family:system-ui,sans-serif;min-width:200px;max-width:300px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <span style="display:inline-block;padding:2px 8px;border-radius:12px;background:${color};color:white;font-size:11px;font-weight:600">${label}</span>
            <span style="font-size:11px;color:#94a3b8">${distRange}</span>
          </div>
          <div style="font-size:12px;font-weight:500;color:#e2e8f0;margin-bottom:4px">Hazard Factors</div>
          <ul style="margin:0;padding-left:16px;font-size:12px;color:#cbd5e1;line-height:1.6">
            ${factorsHtml}
          </ul>
          <div style="margin-top:8px;padding:6px 8px;background:rgba(255,255,255,0.08);border-radius:6px;font-size:11px;color:#fbbf24;line-height:1.4">
            💡 ${data.recommendations}
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: '320px',
        offset: 16,
      }).setHTML(popupHtml);

      marker.setPopup(popup);
      markersRef.current.push(marker);
    }

    return () => {
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];
    };
  }, [map, visible, markerDataList, segments.length]);

  return null;
}
