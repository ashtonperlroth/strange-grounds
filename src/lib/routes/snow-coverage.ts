import type { LineString, Position } from "geojson";
import { classifyNdsi } from "@/lib/data-sources/sentinel2-ndsi";

// ── Types ──────────────────────────────────────────────────────────────

export interface SnowCoverageResult {
  totalSnowPercent: number;
  totalMixedPercent: number;
  totalBarePercent: number;
  sampleCount: number;
  perSegment: SegmentSnowCoverage[];
}

export interface SegmentSnowCoverage {
  segmentId: string;
  segmentOrder: number;
  snowPercent: number;
  mixedPercent: number;
  barePercent: number;
  sampleCount: number;
}

interface RouteSample {
  position: Position;
  segmentIndex: number;
}

// ── Constants ──────────────────────────────────────────────────────────

const SAMPLE_INTERVAL_M = 50;
const EARTH_RADIUS_M = 6371008.8;

// ── Helpers ───────────────────────────────────────────────────────────

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineDistance(a: Position, b: Position): number {
  const dLat = toRadians(b[1] - a[1]);
  const dLng = toRadians(b[0] - a[0]);
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function interpolatePosition(
  a: Position,
  b: Position,
  fraction: number,
): Position {
  return [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction];
}

/**
 * Look up the NDSI value at a geographic position by converting
 * lat/lng to pixel coordinates within the raster grid.
 */
function sampleNdsiAtPosition(
  position: Position,
  ndsiValues: Float32Array,
  bounds: [number, number, number, number],
  width: number,
  height: number,
): number | null {
  const [west, south, east, north] = bounds;
  const lng = position[0];
  const lat = position[1];

  if (lng < west || lng > east || lat < south || lat > north) return null;

  const xFrac = (lng - west) / (east - west);
  const yFrac = 1 - (lat - south) / (north - south);

  const px = Math.min(Math.floor(xFrac * width), width - 1);
  const py = Math.min(Math.floor(yFrac * height), height - 1);

  const idx = py * width + px;
  if (idx < 0 || idx >= ndsiValues.length) return null;

  const val = ndsiValues[idx];
  return val < -1.5 ? null : val;
}

// ── Sample Along Route ────────────────────────────────────────────────

function sampleAlongRoute(
  geometry: LineString,
  intervalM: number = SAMPLE_INTERVAL_M,
): RouteSample[] {
  const coords = geometry.coordinates;
  if (coords.length < 2) return [];

  const samples: RouteSample[] = [{ position: coords[0], segmentIndex: 0 }];
  let accumulated = 0;

  for (let i = 1; i < coords.length; i++) {
    const segDist = haversineDistance(coords[i - 1], coords[i]);
    let remaining = segDist;

    const deficit = intervalM - accumulated;
    if (deficit <= remaining) {
      const frac = deficit / segDist;
      const pt = interpolatePosition(coords[i - 1], coords[i], frac);
      samples.push({ position: pt, segmentIndex: i - 1 });
      let startOffset = deficit;
      remaining -= deficit;
      accumulated = 0;

      while (remaining >= intervalM) {
        const nextFrac = (startOffset + intervalM) / segDist;
        const nextPt = interpolatePosition(coords[i - 1], coords[i], nextFrac);
        samples.push({ position: nextPt, segmentIndex: i - 1 });
        startOffset += intervalM;
        remaining -= intervalM;
      }
    }

    accumulated += remaining;
  }

  const lastCoord = coords[coords.length - 1];
  const lastSample = samples[samples.length - 1];
  if (haversineDistance(lastSample.position, lastCoord) > 1) {
    samples.push({
      position: lastCoord,
      segmentIndex: coords.length - 2,
    });
  }

  return samples;
}

// ── Main Export ─────────────────────────────────────────────────────────

/**
 * Sample NDSI values along the route at regular intervals and compute
 * snow coverage statistics for the total route and per-segment.
 *
 * @param geometry - Route LineString geometry
 * @param ndsiValues - Raw NDSI float values from NDSI raster (row-major)
 * @param bounds - Geographic bounds of the NDSI raster [west, south, east, north]
 * @param rasterWidth - Width of the NDSI raster in pixels
 * @param rasterHeight - Height of the NDSI raster in pixels
 * @param segmentIds - Optional array of segment IDs, one per coordinate-pair edge
 */
export function computeRouteSnowCoverage(
  geometry: LineString,
  ndsiValues: Float32Array,
  bounds: [number, number, number, number],
  rasterWidth: number,
  rasterHeight: number,
  segmentIds?: string[],
): SnowCoverageResult {
  const samples = sampleAlongRoute(geometry);

  let totalSnow = 0;
  let totalMixed = 0;
  let totalBare = 0;
  let totalValid = 0;

  const segmentMap = new Map<
    number,
    { snow: number; mixed: number; bare: number; total: number }
  >();

  for (const sample of samples) {
    const ndsi = sampleNdsiAtPosition(
      sample.position,
      ndsiValues,
      bounds,
      rasterWidth,
      rasterHeight,
    );

    if (ndsi === null) continue;

    totalValid++;
    const cls = classifyNdsi(ndsi);

    if (cls === "snow") totalSnow++;
    else if (cls === "mixed") totalMixed++;
    else totalBare++;

    const segIdx = sample.segmentIndex;
    let entry = segmentMap.get(segIdx);
    if (!entry) {
      entry = { snow: 0, mixed: 0, bare: 0, total: 0 };
      segmentMap.set(segIdx, entry);
    }
    entry.total++;
    if (cls === "snow") entry.snow++;
    else if (cls === "mixed") entry.mixed++;
    else entry.bare++;
  }

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

  const perSegment: SegmentSnowCoverage[] = [];
  const sortedKeys = [...segmentMap.keys()].sort((a, b) => a - b);

  for (const idx of sortedKeys) {
    const entry = segmentMap.get(idx)!;
    perSegment.push({
      segmentId: segmentIds?.[idx] ?? `segment-${idx}`,
      segmentOrder: idx,
      snowPercent: pct(entry.snow, entry.total),
      mixedPercent: pct(entry.mixed, entry.total),
      barePercent: pct(entry.bare, entry.total),
      sampleCount: entry.total,
    });
  }

  return {
    totalSnowPercent: pct(totalSnow, totalValid),
    totalMixedPercent: pct(totalMixed, totalValid),
    totalBarePercent: pct(totalBare, totalValid),
    sampleCount: totalValid,
    perSegment,
  };
}
