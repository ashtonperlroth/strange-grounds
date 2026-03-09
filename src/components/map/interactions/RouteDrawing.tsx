'use client';

import { useCallback, useEffect, useRef } from 'react';
import type maplibregl from 'maplibre-gl';
import { useRouteStore } from '@/stores/route-store';
import {
  ROUTE_GHOST_LAYER_ID,
  ROUTE_GHOST_SOURCE_ID,
  ROUTE_WAYPOINTS_CIRCLE_LAYER_ID,
} from '@/components/map/route-constants';
import { findNearestTrailSnap } from '@/lib/routes/snap-to-trail';

interface RouteDrawingProps {
  map: maplibregl.Map | null;
}

export function RouteDrawing({ map }: RouteDrawingProps) {
  const isDrawing = useRouteStore((s) => s.isDrawing);
  const waypoints = useRouteStore((s) => s.waypoints);
  const addWaypoint = useRouteStore((s) => s.addWaypoint);
  const moveWaypoint = useRouteStore((s) => s.moveWaypoint);
  const clearRoute = useRouteStore((s) => s.clearRoute);
  const setIsDrawing = useRouteStore((s) => s.setIsDrawing);
  const setSelectedWaypointId = useRouteStore((s) => s.setSelectedWaypointId);

  const addedRef = useRef(false);
  const dragWaypointIdRef = useRef<string | null>(null);
  const didDragRef = useRef(false);

  const sortedWaypoints = [...waypoints].sort((a, b) => a.sortOrder - b.sortOrder);

  const getWaypointFeature = useCallback(
    (point: maplibregl.Point) => {
      if (!map?.getLayer(ROUTE_WAYPOINTS_CIRCLE_LAYER_ID)) return null;
      return (
        map.queryRenderedFeatures(point, {
          layers: [ROUTE_WAYPOINTS_CIRCLE_LAYER_ID],
        })[0] ?? null
      );
    },
    [map],
  );

  const ensureGhostLayer = useCallback(() => {
    if (!map || addedRef.current) return;

    if (!map.getSource(ROUTE_GHOST_SOURCE_ID)) {
      map.addSource(ROUTE_GHOST_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    if (!map.getLayer(ROUTE_GHOST_LAYER_ID)) {
      map.addLayer({
        id: ROUTE_GHOST_LAYER_ID,
        type: 'line',
        source: ROUTE_GHOST_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#60a5fa',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      });
    }

    addedRef.current = true;
  }, [map]);

  useEffect(() => {
    if (!map) return;
    if (map.isStyleLoaded()) {
      ensureGhostLayer();
    } else {
      map.once('style.load', ensureGhostLayer);
    }
  }, [ensureGhostLayer, map]);

  useEffect(() => {
    if (!map) return;
    const onStyleLoad = () => {
      addedRef.current = false;
      ensureGhostLayer();
    };
    map.on('style.load', onStyleLoad);
    return () => {
      map.off('style.load', onStyleLoad);
    };
  }, [ensureGhostLayer, map]);

  useEffect(() => {
    if (!map || !addedRef.current) return;
    const source = map.getSource(ROUTE_GHOST_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!source) return;

    if (!isDrawing || sortedWaypoints.length === 0) {
      source.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    const onMove = (e: maplibregl.MapMouseEvent) => {
      const last = sortedWaypoints[sortedWaypoints.length - 1];
      const state = useRouteStore.getState();
      const rawPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const snapResult =
        state.snapToTrailsEnabled && state.trailNetwork.features.length > 0
          ? findNearestTrailSnap(rawPoint, state.trailNetwork, 50)
          : null;
      const previewPoint = snapResult?.coordinates ?? rawPoint;
      map.getCanvas().style.cursor = snapResult ? 'cell' : 'crosshair';

      source.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [last.location.coordinates, previewPoint],
            },
            properties: {},
          },
        ],
      });
    };

    map.on('mousemove', onMove);
    return () => {
      map.off('mousemove', onMove);
      source.setData({ type: 'FeatureCollection', features: [] });
    };
  }, [isDrawing, map, sortedWaypoints]);

  useEffect(() => {
    if (!map) return;

    const onClick = (e: maplibregl.MapMouseEvent) => {
      if (!useRouteStore.getState().isDrawing) return;
      const state = useRouteStore.getState();
      const rawPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const snapResult =
        state.snapToTrailsEnabled && state.trailNetwork.features.length > 0
          ? findNearestTrailSnap(rawPoint, state.trailNetwork, 50)
          : null;

      addWaypoint({
        coordinates: snapResult?.coordinates ?? rawPoint,
        snappedTrail: snapResult
          ? {
              trailId: snapResult.trailId,
              trail: snapResult.trail,
            }
          : undefined,
      });
    };

    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
    };
  }, [addWaypoint, map]);

  useEffect(() => {
    if (!map) return;
    if (isDrawing) {
      map.doubleClickZoom.disable();
    } else {
      map.doubleClickZoom.enable();
    }
  }, [isDrawing, map]);

  useEffect(() => {
    if (!map) return;

    const onDoubleClick = (e: maplibregl.MapMouseEvent) => {
      if (!useRouteStore.getState().isDrawing) return;
      e.preventDefault();
      setIsDrawing(false);
      setSelectedWaypointId(null);
    };

    map.on('dblclick', onDoubleClick);
    return () => {
      map.off('dblclick', onDoubleClick);
    };
  }, [map, setIsDrawing, setSelectedWaypointId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const drawing = useRouteStore.getState().isDrawing;
      if (!drawing) return;

      if (event.key === 'Enter') {
        event.preventDefault();
        setIsDrawing(false);
        setSelectedWaypointId(null);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        clearRoute();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [clearRoute, setIsDrawing, setSelectedWaypointId]);

  useEffect(() => {
    if (!map) return;
    map.getCanvas().style.cursor = isDrawing ? 'crosshair' : '';
    return () => {
      map.getCanvas().style.cursor = '';
    };
  }, [isDrawing, map]);

  useEffect(() => {
    if (!map) return;

    const onWaypointClick = (e: maplibregl.MapMouseEvent) => {
      if (useRouteStore.getState().isDrawing || didDragRef.current) {
        didDragRef.current = false;
        return;
      }

      const feature = getWaypointFeature(e.point);
      const waypointId = feature?.properties?.id;
      if (typeof waypointId === 'string') {
        setSelectedWaypointId(waypointId);
        e.preventDefault();
        e.originalEvent.stopPropagation();
      }
    };

    map.on('click', onWaypointClick);
    return () => {
      map.off('click', onWaypointClick);
    };
  }, [getWaypointFeature, map, setSelectedWaypointId]);

  useEffect(() => {
    if (!map) return;

    const onHover = (e: maplibregl.MapMouseEvent) => {
      if (useRouteStore.getState().isDrawing || dragWaypointIdRef.current) return;
      const overWaypoint = Boolean(getWaypointFeature(e.point));
      map.getCanvas().style.cursor = overWaypoint ? 'pointer' : '';
    };

    map.on('mousemove', onHover);

    return () => {
      map.off('mousemove', onHover);
    };
  }, [getWaypointFeature, map]);

  useEffect(() => {
    if (!map) return;

    const onMouseDown = (e: maplibregl.MapMouseEvent) => {
      if (useRouteStore.getState().isDrawing) return;

      const feature = getWaypointFeature(e.point);
      const waypointId = feature?.properties?.id;
      if (typeof waypointId !== 'string') return;

      dragWaypointIdRef.current = waypointId;
      didDragRef.current = false;
      map.dragPan.disable();
      map.getCanvas().style.cursor = 'grabbing';
      e.preventDefault();
      e.originalEvent.stopPropagation();
    };

    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      const waypointId = dragWaypointIdRef.current;
      if (!waypointId) return;
      didDragRef.current = true;
      moveWaypoint(waypointId, [e.lngLat.lng, e.lngLat.lat]);
    };

    const onMouseUp = () => {
      if (!dragWaypointIdRef.current) return;
      dragWaypointIdRef.current = null;
      map.dragPan.enable();
      map.getCanvas().style.cursor = '';
    };

    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);

    return () => {
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
    };
  }, [getWaypointFeature, map, moveWaypoint]);

  return null;
}
