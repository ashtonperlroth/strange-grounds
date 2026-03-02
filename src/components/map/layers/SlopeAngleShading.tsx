'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

const SOURCE_ID = 'slope-angle';
const LAYER_ID = 'slope-angle-layer';
const MIN_ZOOM = 12;

const DEM_TILE_URL =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

const EARTH_CIRCUMFERENCE = 40_075_016.686;

function terrariumToElevation(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768;
}

function metersPerPixel(lat: number, zoom: number): number {
  return (
    (EARTH_CIRCUMFERENCE * Math.cos((lat * Math.PI) / 180)) /
    (256 * Math.pow(2, zoom))
  );
}

function tileToLat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function slopeToColor(angle: number): [number, number, number, number] {
  if (angle < 25) return [0, 0, 0, 0];
  if (angle < 30) return [34, 197, 94, 180];
  if (angle < 35) return [234, 179, 8, 200];
  if (angle < 45) return [249, 115, 22, 210];
  return [239, 68, 68, 230];
}

let protocolRegistered = false;

function ensureSlopeProtocol() {
  if (protocolRegistered) return;
  protocolRegistered = true;

  maplibregl.addProtocol(
    'slope',
    async (params: maplibregl.RequestParameters, abortController: AbortController) => {
      const [z, x, y] = params.url
        .replace('slope://', '')
        .split('/')
        .map(Number);

      const demUrl = DEM_TILE_URL
        .replace('{z}', String(z))
        .replace('{x}', String(x))
        .replace('{y}', String(y));

      const res = await fetch(demUrl, { signal: abortController.signal });
      const blob = await res.blob();
      const bitmap = await createImageBitmap(blob);

      const size = 256;
      const canvas = new OffscreenCanvas(size, size);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0, size, size);
      const { data: pixels } = ctx.getImageData(0, 0, size, size);

      const elev = new Float32Array(size * size);
      for (let i = 0; i < size * size; i++) {
        const p = i * 4;
        elev[i] = terrariumToElevation(pixels[p], pixels[p + 1], pixels[p + 2]);
      }

      const lat = tileToLat(y + 0.5, z);
      const cell = metersPerPixel(lat, z);

      const output = ctx.createImageData(size, size);
      const out = output.data;

      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          const i = row * size + col;
          const o = i * 4;

          if (row === 0 || row === size - 1 || col === 0 || col === size - 1) {
            out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0;
            continue;
          }

          const dzdx =
            (elev[i + 1] - elev[i - 1]) / (2 * cell);
          const dzdy =
            (elev[i + size] - elev[i - size]) / (2 * cell);
          const angle =
            Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * (180 / Math.PI);

          const [r, g, b, a] = slopeToColor(angle);
          out[o] = r;
          out[o + 1] = g;
          out[o + 2] = b;
          out[o + 3] = a;
        }
      }

      ctx.putImageData(output, 0, 0);
      const outBlob = await canvas.convertToBlob({ type: 'image/png' });
      return { data: await outBlob.arrayBuffer() };
    },
  );
}

interface SlopeAngleShadingProps {
  map: maplibregl.Map | null;
  visible: boolean;
}

export function SlopeAngleShading({ map, visible }: SlopeAngleShadingProps) {
  const addedRef = useRef(false);

  useEffect(() => {
    if (!map) return;

    ensureSlopeProtocol();

    function addLayerOnce() {
      if (!map || addedRef.current) return;
      if (map.getSource(SOURCE_ID)) {
        addedRef.current = true;
        return;
      }

      map.addSource(SOURCE_ID, {
        type: 'raster',
        tiles: ['slope://{z}/{x}/{y}'],
        tileSize: 256,
        minzoom: MIN_ZOOM,
        maxzoom: 15,
      });

      map.addLayer({
        id: LAYER_ID,
        type: 'raster',
        source: SOURCE_ID,
        minzoom: MIN_ZOOM,
        paint: {
          'raster-opacity': 0.7,
          'raster-fade-duration': 0,
          'raster-resampling': 'nearest',
        },
      });

      addedRef.current = true;
    }

    function setLayerVisibility(show: boolean) {
      if (!map) return;
      if (map.getLayer(LAYER_ID)) {
        map.setLayoutProperty(
          LAYER_ID,
          'visibility',
          show ? 'visible' : 'none',
        );
      }
    }

    if (map.isStyleLoaded()) {
      addLayerOnce();
    } else {
      map.once('style.load', addLayerOnce);
    }

    setLayerVisibility(visible);
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
