'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type maplibregl from 'maplibre-gl';
import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import { selectRouteGeometry, useRouteStore } from '@/stores/route-store';
import {
  ROUTE_CASING_LAYER_ID,
  ROUTE_LINE_LAYER_ID,
  ROUTE_PROFILE_HOVER_LAYER_ID,
  ROUTE_PROFILE_HOVER_SOURCE_ID,
  ROUTE_SOURCE_ID,
  ROUTE_WAYPOINTS_CIRCLE_LAYER_ID,
  ROUTE_WAYPOINTS_LABEL_LAYER_ID,
  ROUTE_WAYPOINTS_SNAP_LAYER_ID,
  ROUTE_WAYPOINTS_SOURCE_ID,
} from '@/components/map/route-constants';

interface RouteLayerProps {
  map: maplibregl.Map | null;
}

function buildLineFeature(
  coordinates: number[][],
): Feature<LineString> | null {
  if (coordinates.length < 2) return null;
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates,
    },
    properties: {},
  };
}

export function RouteLayer({ map }: RouteLayerProps) {
  const isDrawing = useRouteStore((s) => s.isDrawing);
  const selectedWaypointId = useRouteStore((s) => s.selectedWaypointId);
  const profileHoverPosition = useRouteStore((s) => s.profileHoverPosition);
  const waypoints = useRouteStore((s) => s.waypoints);
  const routeGeometry = useRouteStore(selectRouteGeometry);
  const snappedWaypoints = useRouteStore((s) => s.snappedWaypoints);
  const addedRef = useRef(false);

  const sortedWaypoints = useMemo(
    () => [...waypoints].sort((a, b) => a.sortOrder - b.sortOrder),
    [waypoints],
  );

  const waypointFeatureCollection = useMemo<FeatureCollection<Point>>(() => {
    const total = sortedWaypoints.length;
    const features: Feature<Point>[] = sortedWaypoints.map((wp, index) => {
      const role =
        index === 0 ? 'start' : index === total - 1 ? 'end' : 'middle';
      return {
        type: 'Feature',
        id: wp.id,
        geometry: wp.location,
        properties: {
          id: wp.id,
          label: `${index + 1}`,
          role,
          selected: wp.id === selectedWaypointId,
          snapped: Boolean(snappedWaypoints[wp.id]),
        },
      };
    });

    return { type: 'FeatureCollection', features };
  }, [selectedWaypointId, snappedWaypoints, sortedWaypoints]);

  const ensureLayers = useCallback(() => {
    if (!map || addedRef.current) return;

    if (!map.getSource(ROUTE_SOURCE_ID)) {
      map.addSource(ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    if (!map.getLayer(ROUTE_CASING_LAYER_ID)) {
      map.addLayer({
        id: ROUTE_CASING_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#ffffff',
          'line-width': 5,
          'line-opacity': 0.95,
        },
      });
    }

    if (!map.getLayer(ROUTE_LINE_LAYER_ID)) {
      map.addLayer({
        id: ROUTE_LINE_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#2563eb',
          'line-width': 3,
          'line-dasharray': [2, 2],
        },
      });
    }

    if (!map.getSource(ROUTE_WAYPOINTS_SOURCE_ID)) {
      map.addSource(ROUTE_WAYPOINTS_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    if (!map.getLayer(ROUTE_WAYPOINTS_CIRCLE_LAYER_ID)) {
      map.addLayer({
        id: ROUTE_WAYPOINTS_CIRCLE_LAYER_ID,
        type: 'circle',
        source: ROUTE_WAYPOINTS_SOURCE_ID,
        paint: {
          'circle-color': [
            'match',
            ['get', 'role'],
            'start',
            '#16a34a',
            'end',
            '#dc2626',
            '#2563eb',
          ],
          'circle-radius': 10,
          'circle-stroke-color': [
            'case',
            ['boolean', ['get', 'selected'], false],
            '#111827',
            '#ffffff',
          ],
          'circle-stroke-width': [
            'case',
            ['boolean', ['get', 'selected'], false],
            3,
            1.5,
          ],
        },
      });
    }

    if (!map.getLayer(ROUTE_WAYPOINTS_LABEL_LAYER_ID)) {
      map.addLayer({
        id: ROUTE_WAYPOINTS_LABEL_LAYER_ID,
        type: 'symbol',
        source: ROUTE_WAYPOINTS_SOURCE_ID,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 12,
          'text-font': ['Open Sans Bold'],
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });
    }

    if (!map.getLayer(ROUTE_WAYPOINTS_SNAP_LAYER_ID)) {
      map.addLayer({
        id: ROUTE_WAYPOINTS_SNAP_LAYER_ID,
        type: 'symbol',
        source: ROUTE_WAYPOINTS_SOURCE_ID,
        filter: ['==', ['get', 'snapped'], true],
        layout: {
          'text-field': '🧲',
          'text-size': 11,
          'text-offset': [0, 1.4],
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#f59e0b',
          'text-halo-color': '#111827',
          'text-halo-width': 1,
        },
      });
    }

    if (!map.getSource(ROUTE_PROFILE_HOVER_SOURCE_ID)) {
      map.addSource(ROUTE_PROFILE_HOVER_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    if (!map.getLayer(ROUTE_PROFILE_HOVER_LAYER_ID)) {
      map.addLayer({
        id: ROUTE_PROFILE_HOVER_LAYER_ID,
        type: 'circle',
        source: ROUTE_PROFILE_HOVER_SOURCE_ID,
        paint: {
          'circle-radius': 7,
          'circle-color': '#f59e0b',
          'circle-stroke-color': '#111827',
          'circle-stroke-width': 2,
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
    const source = map.getSource(ROUTE_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!source) return;

    const line = routeGeometry ? buildLineFeature(routeGeometry.coordinates) : null;
    source.setData({
      type: 'FeatureCollection',
      features: line ? [line] : [],
    });

    if (map.getLayer(ROUTE_LINE_LAYER_ID)) {
      map.setPaintProperty(
        ROUTE_LINE_LAYER_ID,
        'line-dasharray',
        isDrawing ? [2, 2] : [1, 0.0001],
      );
    }
  }, [isDrawing, map, routeGeometry]);

  useEffect(() => {
    if (!map || !addedRef.current) return;
    const source = map.getSource(ROUTE_WAYPOINTS_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!source) return;
    source.setData(waypointFeatureCollection);
  }, [map, waypointFeatureCollection]);

  useEffect(() => {
    if (!map || !addedRef.current) return;
    const source = map.getSource(ROUTE_PROFILE_HOVER_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!source) return;

    if (!profileHoverPosition) {
      source.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    source.setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: profileHoverPosition },
          properties: {},
        },
      ],
    });
  }, [map, profileHoverPosition]);

  return null;
}
