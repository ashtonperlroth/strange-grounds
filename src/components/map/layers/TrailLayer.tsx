'use client';

import { useCallback, useEffect, useRef } from 'react';
import type maplibregl from 'maplibre-gl';
import type { FeatureCollection, LineString } from 'geojson';
import {
  fetchOsmTrails,
  getEmptyTrailCollection,
} from '@/lib/data-sources/osm-trails';
import { ROUTE_CASING_LAYER_ID } from '@/components/map/route-constants';
import { useRouteStore } from '@/stores/route-store';

const SOURCE_ID = 'osm-trails';
const UNMARKED_LAYER_ID = 'osm-trails-unmarked';
const T1_LAYER_ID = 'osm-trails-t1';
const T2_LAYER_ID = 'osm-trails-t2';
const T3_LAYER_ID = 'osm-trails-t3';
const TRAIL_LAYER_IDS = [
  UNMARKED_LAYER_ID,
  T1_LAYER_ID,
  T2_LAYER_ID,
  T3_LAYER_ID,
];

const SAC_T1_VALUES = ['T1', 'hiking'];
const SAC_T2_VALUES = ['T2', 'mountain_hiking'];
const SAC_T3_PLUS_VALUES = [
  'T3',
  'T4',
  'T5',
  'T6',
  'demanding_mountain_hiking',
  'alpine_hiking',
  'demanding_alpine_hiking',
  'difficult_alpine_hiking',
];

interface TrailLayerProps {
  map: maplibregl.Map | null;
  visible: boolean;
}

export function TrailLayer({ map, visible }: TrailLayerProps) {
  const addedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setTrailNetwork = useRouteStore((s) => s.setTrailNetwork);

  const setLayerVisibility = useCallback(
    (show: boolean) => {
      if (!map) return;
      for (const layerId of TRAIL_LAYER_IDS) {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', show ? 'visible' : 'none');
        }
      }
    },
    [map],
  );

  const setSourceData = useCallback(
    (data: FeatureCollection<LineString>) => {
      if (!map) return;
      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      source?.setData(data);
      setTrailNetwork(data);
    },
    [map, setTrailNetwork],
  );

  const clearTrails = useCallback(() => {
    setSourceData(getEmptyTrailCollection());
  }, [setSourceData]);

  const ensureLayers = useCallback(() => {
    if (!map || addedRef.current) return;

    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: getEmptyTrailCollection(),
      });
    }

    const beforeId = map.getLayer(ROUTE_CASING_LAYER_ID)
      ? ROUTE_CASING_LAYER_ID
      : undefined;

    if (!map.getLayer(UNMARKED_LAYER_ID)) {
      map.addLayer(
        {
          id: UNMARKED_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          filter: [
            '!',
            [
              'in',
              ['coalesce', ['get', 'sac_scale'], ''],
              ['literal', [...SAC_T1_VALUES, ...SAC_T2_VALUES, ...SAC_T3_PLUS_VALUES]],
            ],
          ],
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
            visibility: visible ? 'visible' : 'none',
          },
          paint: {
            'line-color': '#6b7280',
            'line-width': 1.2,
            'line-opacity': 0.45,
          },
        },
        beforeId,
      );
    }

    if (!map.getLayer(T1_LAYER_ID)) {
      map.addLayer(
        {
          id: T1_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          filter: [
            'in',
            ['coalesce', ['get', 'sac_scale'], ''],
            ['literal', SAC_T1_VALUES],
          ],
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
            visibility: visible ? 'visible' : 'none',
          },
          paint: {
            'line-color': '#8b5a2b',
            'line-width': 1.8,
            'line-opacity': 0.9,
          },
        },
        beforeId,
      );
    }

    if (!map.getLayer(T2_LAYER_ID)) {
      map.addLayer(
        {
          id: T2_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          filter: [
            'in',
            ['coalesce', ['get', 'sac_scale'], ''],
            ['literal', SAC_T2_VALUES],
          ],
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
            visibility: visible ? 'visible' : 'none',
          },
          paint: {
            'line-color': '#8b5a2b',
            'line-width': 1.8,
            'line-opacity': 0.9,
            'line-dasharray': [2, 1.5],
          },
        },
        beforeId,
      );
    }

    if (!map.getLayer(T3_LAYER_ID)) {
      map.addLayer(
        {
          id: T3_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          filter: [
            'in',
            ['coalesce', ['get', 'sac_scale'], ''],
            ['literal', SAC_T3_PLUS_VALUES],
          ],
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
            visibility: visible ? 'visible' : 'none',
          },
          paint: {
            'line-color': '#dc2626',
            'line-width': 1.4,
            'line-opacity': 0.9,
            'line-dasharray': [0.4, 1.2],
          },
        },
        beforeId,
      );
    }

    if (map.getLayer(ROUTE_CASING_LAYER_ID)) {
      for (const layerId of TRAIL_LAYER_IDS) {
        if (map.getLayer(layerId)) {
          map.moveLayer(layerId, ROUTE_CASING_LAYER_ID);
        }
      }
    }

    addedRef.current = true;
  }, [map, visible]);

  const loadData = useCallback(async () => {
    if (!map || !visible) {
      clearTrails();
      return;
    }

    if (map.getZoom() <= 10) {
      clearTrails();
      return;
    }

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

    try {
      const trails = await fetchOsmTrails({
        bbox,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setSourceData(trails);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.warn('OSM trails fetch failed:', error);
    }
  }, [clearTrails, map, setSourceData, visible]);

  useEffect(() => {
    if (!map) return;

    const onStyleLoad = () => {
      addedRef.current = false;
      ensureLayers();
      setLayerVisibility(visible);
      void loadData();
    };

    if (map.isStyleLoaded()) {
      ensureLayers();
      setLayerVisibility(visible);
    }

    map.on('style.load', onStyleLoad);

    return () => {
      map.off('style.load', onStyleLoad);
    };
  }, [ensureLayers, loadData, map, setLayerVisibility, visible]);

  useEffect(() => {
    if (!map) return;
    setLayerVisibility(visible);
  }, [map, setLayerVisibility, visible]);

  useEffect(() => {
    if (!map) return;

    const scheduleLoad = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void loadData();
      }, 500);
    };

    scheduleLoad();
    map.on('moveend', scheduleLoad);

    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      map.off('moveend', scheduleLoad);
    };
  }, [loadData, map]);

  return null;
}
