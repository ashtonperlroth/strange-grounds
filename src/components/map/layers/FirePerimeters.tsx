'use client';

import { useEffect, useRef } from 'react';
import type maplibregl from 'maplibre-gl';

const SOURCE_ID = 'fire-perimeters';
const FILL_LAYER_ID = 'fire-perimeters-fill';
const OUTLINE_LAYER_ID = 'fire-perimeters-outline';
const LABEL_LAYER_ID = 'fire-perimeters-label';

const NIFC_BASE =
  'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters/FeatureServer/0/query';

function buildTileUrl(bbox: [number, number, number, number]): string {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: 'IncidentName,GISAcres,PercentContained',
    geometry: bbox.join(','),
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    f: 'geojson',
  });
  return `${NIFC_BASE}?${params}`;
}

interface FirePerimetersProps {
  map: maplibregl.Map | null;
  visible: boolean;
}

export function FirePerimeters({ map, visible }: FirePerimetersProps) {
  const addedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!map) return;

    function addLayerOnce() {
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
          'fill-color': '#ef4444',
          'fill-opacity': 0.25,
        },
      });

      map.addLayer({
        id: OUTLINE_LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        paint: {
          'line-color': '#f97316',
          'line-width': 2,
          'line-opacity': 0.9,
        },
      });

      map.addLayer({
        id: LABEL_LAYER_ID,
        type: 'symbol',
        source: SOURCE_ID,
        layout: {
          'text-field': ['get', 'IncidentName'],
          'text-size': 12,
          'text-font': ['Open Sans Bold'],
          'text-anchor': 'center',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#fbbf24',
          'text-halo-color': '#000000',
          'text-halo-width': 1.5,
        },
      });

      addedRef.current = true;
    }

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

      fetch(buildTileUrl(bbox), { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`NIFC ${res.status}`);
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
          console.warn('Fire perimeters fetch failed:', err);
        });
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
    }

    return () => {
      abortRef.current?.abort();
      if (map) {
        map.off('moveend', loadData);
      }
    };
  }, [map, visible]);

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
