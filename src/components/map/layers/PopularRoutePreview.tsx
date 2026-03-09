'use client';

import { useCallback, useEffect, useRef } from 'react';
import type maplibregl from 'maplibre-gl';
import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import { usePopularRoutesStore } from '@/stores/popular-routes-store';

const PREVIEW_SOURCE = 'popular-route-preview-source';
const PREVIEW_CASING_LAYER = 'popular-route-preview-casing';
const PREVIEW_LINE_LAYER = 'popular-route-preview-line';
const PREVIEW_WP_SOURCE = 'popular-route-preview-wp-source';
const PREVIEW_WP_CIRCLE_LAYER = 'popular-route-preview-wp-circle';
const PREVIEW_WP_LABEL_LAYER = 'popular-route-preview-wp-label';

const EMPTY_FC: FeatureCollection = { type: 'FeatureCollection', features: [] };

interface PopularRoutePreviewProps {
  map: maplibregl.Map | null;
}

export function PopularRoutePreview({ map }: PopularRoutePreviewProps) {
  const previewRoute = usePopularRoutesStore((s) => s.previewRoute);
  const addedRef = useRef(false);

  const ensureLayers = useCallback(() => {
    if (!map || addedRef.current) return;

    if (!map.getSource(PREVIEW_SOURCE)) {
      map.addSource(PREVIEW_SOURCE, { type: 'geojson', data: EMPTY_FC });
    }

    if (!map.getLayer(PREVIEW_CASING_LAYER)) {
      map.addLayer({
        id: PREVIEW_CASING_LAYER,
        type: 'line',
        source: PREVIEW_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#ffffff',
          'line-width': 4,
          'line-opacity': 0.8,
        },
      });
    }

    if (!map.getLayer(PREVIEW_LINE_LAYER)) {
      map.addLayer({
        id: PREVIEW_LINE_LAYER,
        type: 'line',
        source: PREVIEW_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#10b981',
          'line-width': 3,
          'line-opacity': 0.85,
          'line-dasharray': [3, 2],
        },
      });
    }

    if (!map.getSource(PREVIEW_WP_SOURCE)) {
      map.addSource(PREVIEW_WP_SOURCE, { type: 'geojson', data: EMPTY_FC });
    }

    if (!map.getLayer(PREVIEW_WP_CIRCLE_LAYER)) {
      map.addLayer({
        id: PREVIEW_WP_CIRCLE_LAYER,
        type: 'circle',
        source: PREVIEW_WP_SOURCE,
        paint: {
          'circle-color': [
            'match',
            ['get', 'role'],
            'start', '#16a34a',
            'end', '#dc2626',
            '#10b981',
          ],
          'circle-radius': 6,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
          'circle-opacity': 0.9,
        },
      });
    }

    if (!map.getLayer(PREVIEW_WP_LABEL_LAYER)) {
      map.addLayer({
        id: PREVIEW_WP_LABEL_LAYER,
        type: 'symbol',
        source: PREVIEW_WP_SOURCE,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-font': ['Open Sans Regular'],
          'text-offset': [0, 1.3],
          'text-anchor': 'top',
          'text-allow-overlap': false,
          'text-optional': true,
        },
        paint: {
          'text-color': '#44403c',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
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

    const lineSrc = map.getSource(PREVIEW_SOURCE) as maplibregl.GeoJSONSource | undefined;
    const wpSrc = map.getSource(PREVIEW_WP_SOURCE) as maplibregl.GeoJSONSource | undefined;

    if (!previewRoute) {
      lineSrc?.setData(EMPTY_FC);
      wpSrc?.setData(EMPTY_FC);
      return;
    }

    const coords = previewRoute.geometry.coordinates;
    if (coords.length >= 2) {
      const lineFeature: Feature<LineString> = {
        type: 'Feature',
        geometry: previewRoute.geometry,
        properties: {},
      };
      lineSrc?.setData({ type: 'FeatureCollection', features: [lineFeature] });
    } else {
      lineSrc?.setData(EMPTY_FC);
    }

    if (previewRoute.trailheadLocation) {
      const startFeature: Feature<Point> = {
        type: 'Feature',
        geometry: previewRoute.trailheadLocation,
        properties: {
          name: previewRoute.trailheadName ?? 'Trailhead',
          role: 'start',
        },
      };
      wpSrc?.setData({ type: 'FeatureCollection', features: [startFeature] });
    } else if (coords.length > 0) {
      const startPt: Feature<Point> = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coords[0] },
        properties: { name: 'Start', role: 'start' },
      };
      const endPt: Feature<Point> = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coords[coords.length - 1] },
        properties: { name: 'End', role: 'end' },
      };
      wpSrc?.setData({ type: 'FeatureCollection', features: [startPt, endPt] });
    } else {
      wpSrc?.setData(EMPTY_FC);
    }
  }, [map, previewRoute]);

  return null;
}
