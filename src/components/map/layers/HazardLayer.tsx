'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { Feature, FeatureCollection, LineString } from 'geojson';
import { useSegmentStore } from '@/stores/segment-store';
import { useBriefingStore } from '@/stores/briefing-store';
import { HAZARD_COLORS, HAZARD_LABELS } from '@/lib/routes/hazard-colors';
import type { HazardLevel, SegmentConditions } from '@/lib/types/briefing';
import {
  HAZARD_SOURCE_ID,
  HAZARD_CASING_LAYER_ID,
  HAZARD_LINE_LAYER_ID,
} from '@/components/map/route-constants';

interface HazardLayerProps {
  map: maplibregl.Map | null;
  visible: boolean;
}

function formatDistance(m: number): string {
  const mi = m * 0.000621371;
  return `${mi.toFixed(1)} mi`;
}

function formatFactors(factors: string[]): string {
  return factors
    .map((f) =>
      f
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
    )
    .join(', ');
}

export function HazardLayer({ map, visible }: HazardLayerProps) {
  const segments = useSegmentStore((s) => s.segments);
  const briefing = useBriefingStore((s) => s.currentBriefing);
  const addedRef = useRef(false);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const segmentConditions = useMemo<SegmentConditions[]>(() => {
    if (!briefing?.conditions) return [];
    const routeAnalysis = briefing.conditions.routeAnalysis as
      | { segments?: SegmentConditions[] }
      | undefined;
    return routeAnalysis?.segments ?? [];
  }, [briefing?.conditions]);

  const hazardFeatures = useMemo<FeatureCollection<LineString>>(() => {
    if (segmentConditions.length === 0 || segments.length === 0) {
      return { type: 'FeatureCollection', features: [] };
    }

    const condMap = new Map(
      segmentConditions.map((sc) => [sc.segmentOrder, sc]),
    );

    const features: Feature<LineString>[] = segments.map((seg, i) => {
      const sc = condMap.get(seg.segmentOrder);
      const level: HazardLevel = (sc?.hazardLevel as HazardLevel) ?? 'low';
      return {
        type: 'Feature',
        id: i,
        geometry: seg.geometry,
        properties: {
          segmentOrder: seg.segmentOrder,
          hazardLevel: level,
          hazardColor: HAZARD_COLORS[level],
          hazardLabel: HAZARD_LABELS[level],
          terrainType: seg.terrainType,
          distanceM: seg.distanceM,
          factors: sc?.hazardFactors?.join('|') ?? '',
        },
      };
    });

    return { type: 'FeatureCollection', features };
  }, [segments, segmentConditions]);

  const ensureLayers = useCallback(() => {
    if (!map || addedRef.current) return;

    if (!map.getSource(HAZARD_SOURCE_ID)) {
      map.addSource(HAZARD_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    if (!map.getLayer(HAZARD_CASING_LAYER_ID)) {
      map.addLayer({
        id: HAZARD_CASING_LAYER_ID,
        type: 'line',
        source: HAZARD_SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#000000',
          'line-width': 8,
          'line-opacity': 0.3,
        },
      });
    }

    if (!map.getLayer(HAZARD_LINE_LAYER_ID)) {
      map.addLayer({
        id: HAZARD_LINE_LAYER_ID,
        type: 'line',
        source: HAZARD_SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'hazardColor'],
          'line-width': 5,
          'line-opacity': 0.8,
        },
      });
    }

    addedRef.current = true;
  }, [map]);

  useEffect(() => {
    if (!map) return;
    if (map.isStyleLoaded()) {
      ensureLayers();
    } else {
      map.once('style.load', ensureLayers);
    }
  }, [ensureLayers, map]);

  useEffect(() => {
    if (!map) return;
    const onStyleLoad = () => {
      addedRef.current = false;
      ensureLayers();
    };
    map.on('style.load', onStyleLoad);
    return () => {
      map.off('style.load', onStyleLoad);
    };
  }, [ensureLayers, map]);

  useEffect(() => {
    if (!map || !addedRef.current) return;
    const source = map.getSource(HAZARD_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (source) {
      source.setData(hazardFeatures);
    }
  }, [map, hazardFeatures]);

  useEffect(() => {
    if (!map) return;
    const layers = [HAZARD_CASING_LAYER_ID, HAZARD_LINE_LAYER_ID];
    for (const layerId of layers) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(
          layerId,
          'visibility',
          visible ? 'visible' : 'none',
        );
      }
    }
  }, [map, visible]);

  useEffect(() => {
    if (!map) return;

    const onMouseEnter = () => {
      map!.getCanvas().style.cursor = 'pointer';
    };

    const onMouseLeave = () => {
      map!.getCanvas().style.cursor = '';
      popupRef.current?.remove();
      popupRef.current = null;
    };

    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      const features = map!.queryRenderedFeatures(e.point, {
        layers: [HAZARD_LINE_LAYER_ID],
      });
      if (!features.length) {
        popupRef.current?.remove();
        popupRef.current = null;
        return;
      }

      const props = features[0].properties;
      if (!props) return;

      const factors = props.factors
        ? formatFactors((props.factors as string).split('|').filter(Boolean))
        : 'No specific hazards identified';

      const html = `
        <div style="font-size:13px;line-height:1.5;min-width:160px;max-width:260px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${props.hazardColor}"></span>
            <strong>${props.hazardLabel} Hazard</strong>
          </div>
          <div style="font-size:11px;color:#94a3b8">Segment ${props.segmentOrder + 1} · ${formatDistance(props.distanceM)}</div>
          <div style="margin-top:4px;font-size:12px;color:#cbd5e1">${factors}</div>
        </div>
      `;

      if (!popupRef.current) {
        popupRef.current = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 10,
        });
        popupRef.current.addTo(map!);
      }

      popupRef.current.setLngLat(e.lngLat).setHTML(html);
    };

    map.on('mouseenter', HAZARD_LINE_LAYER_ID, onMouseEnter);
    map.on('mouseleave', HAZARD_LINE_LAYER_ID, onMouseLeave);
    map.on('mousemove', HAZARD_LINE_LAYER_ID, onMouseMove);

    return () => {
      map.off('mouseenter', HAZARD_LINE_LAYER_ID, onMouseEnter);
      map.off('mouseleave', HAZARD_LINE_LAYER_ID, onMouseLeave);
      map.off('mousemove', HAZARD_LINE_LAYER_ID, onMouseMove);
      popupRef.current?.remove();
      popupRef.current = null;
    };
  }, [map]);

  return null;
}
