'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import { useSegmentStore } from '@/stores/segment-store';
import {
  SEGMENT_CASING_LAYER_ID,
  SEGMENT_LINE_LAYER_ID,
  SEGMENT_SOURCE_ID,
  SEGMENT_BOUNDARY_LAYER_ID,
  SEGMENT_BOUNDARY_SOURCE_ID,
} from '@/components/map/route-constants';

const TERRAIN_COLORS: Record<string, string> = {
  approach: '#9ca3af',
  trail: '#9ca3af',
  ridge: '#a855f7',
  bowl: '#f97316',
  descent: '#3b82f6',
  ascent: '#22c55e',
  river_crossing: '#06b6d4',
  exposed_traverse: '#ef4444',
};

function terrainColor(type: string): string {
  return TERRAIN_COLORS[type] ?? '#9ca3af';
}

interface SegmentLayerProps {
  map: maplibregl.Map | null;
}

export function SegmentLayer({ map }: SegmentLayerProps) {
  const segments = useSegmentStore((s) => s.segments);
  const visible = useSegmentStore((s) => s.visible);
  const addedRef = useRef(false);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const segmentFeatures = useMemo<FeatureCollection<LineString>>(() => {
    const features: Feature<LineString>[] = segments.map((seg, i) => ({
      type: 'Feature',
      id: i,
      geometry: seg.geometry,
      properties: {
        segmentOrder: seg.segmentOrder,
        terrainType: seg.terrainType,
        distanceM: seg.distanceM,
        elevationGainM: seg.elevationGainM,
        elevationLossM: seg.elevationLossM,
        avgSlopeDegrees: seg.avgSlopeDegrees,
        maxSlopeDegrees: seg.maxSlopeDegrees,
        dominantAspect: seg.dominantAspect,
        color: terrainColor(seg.terrainType),
      },
    }));
    return { type: 'FeatureCollection', features };
  }, [segments]);

  const boundaryFeatures = useMemo<FeatureCollection<Point>>(() => {
    const features: Feature<Point>[] = [];
    for (const seg of segments) {
      const coords = seg.geometry.coordinates;
      if (coords.length > 0) {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coords[0] },
          properties: {},
        });
      }
    }
    return { type: 'FeatureCollection', features };
  }, [segments]);

  const ensureLayers = useCallback(() => {
    if (!map || addedRef.current) return;

    if (!map.getSource(SEGMENT_SOURCE_ID)) {
      map.addSource(SEGMENT_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    if (!map.getLayer(SEGMENT_CASING_LAYER_ID)) {
      map.addLayer({
        id: SEGMENT_CASING_LAYER_ID,
        type: 'line',
        source: SEGMENT_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#ffffff',
          'line-width': 7,
          'line-opacity': 0.9,
        },
      });
    }

    if (!map.getLayer(SEGMENT_LINE_LAYER_ID)) {
      map.addLayer({
        id: SEGMENT_LINE_LAYER_ID,
        type: 'line',
        source: SEGMENT_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 4,
        },
      });
    }

    if (!map.getSource(SEGMENT_BOUNDARY_SOURCE_ID)) {
      map.addSource(SEGMENT_BOUNDARY_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    if (!map.getLayer(SEGMENT_BOUNDARY_LAYER_ID)) {
      map.addLayer({
        id: SEGMENT_BOUNDARY_LAYER_ID,
        type: 'circle',
        source: SEGMENT_BOUNDARY_SOURCE_ID,
        paint: {
          'circle-radius': 4,
          'circle-color': '#111827',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
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
    const source = map.getSource(SEGMENT_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (source) {
      source.setData(segmentFeatures);
    }
    const bndSource = map.getSource(SEGMENT_BOUNDARY_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (bndSource) {
      bndSource.setData(boundaryFeatures);
    }
  }, [map, segmentFeatures, boundaryFeatures]);

  useEffect(() => {
    if (!map) return;
    const layers = [
      SEGMENT_CASING_LAYER_ID,
      SEGMENT_LINE_LAYER_ID,
      SEGMENT_BOUNDARY_LAYER_ID,
    ];
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

    function formatDistance(m: number): string {
      return m >= 1000
        ? `${(m / 1000).toFixed(1)} km`
        : `${Math.round(m)} m`;
    }

    function formatTerrainType(t: string): string {
      return t
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }

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
        layers: [SEGMENT_LINE_LAYER_ID],
      });
      if (!features.length) {
        popupRef.current?.remove();
        popupRef.current = null;
        return;
      }

      const props = features[0].properties;
      if (!props) return;

      const html = `
        <div style="font-size:13px;line-height:1.5;min-width:140px">
          <strong style="color:${terrainColor(props.terrainType)}">${formatTerrainType(props.terrainType)}</strong>
          <div>Distance: ${formatDistance(props.distanceM)}</div>
          <div>Gain: +${Math.round(props.elevationGainM)}m / Loss: -${Math.round(props.elevationLossM)}m</div>
          <div>Avg slope: ${props.avgSlopeDegrees}° · Max: ${props.maxSlopeDegrees}°</div>
          <div>Aspect: ${props.dominantAspect}</div>
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

    map.on('mouseenter', SEGMENT_LINE_LAYER_ID, onMouseEnter);
    map.on('mouseleave', SEGMENT_LINE_LAYER_ID, onMouseLeave);
    map.on('mousemove', SEGMENT_LINE_LAYER_ID, onMouseMove);

    return () => {
      map.off('mouseenter', SEGMENT_LINE_LAYER_ID, onMouseEnter);
      map.off('mouseleave', SEGMENT_LINE_LAYER_ID, onMouseLeave);
      map.off('mousemove', SEGMENT_LINE_LAYER_ID, onMouseMove);
      popupRef.current?.remove();
      popupRef.current = null;
    };
  }, [map]);

  return null;
}
