import type { LineString } from 'geojson';
import {
  type ElevationSample,
  computeAspectAtPoints,
  aspectToCardinal,
} from './dem-sampler';

export interface SegmentationInput {
  routeGeometry: LineString;
  elevationProfile: { distance: number; elevation: number }[];
}

export interface ComputedSegment {
  geometry: LineString;
  segmentOrder: number;
  distanceM: number;
  elevationGainM: number;
  elevationLossM: number;
  avgSlopeDegrees: number;
  maxSlopeDegrees: number;
  dominantAspect: string;
  terrainType: string;
}

const MIN_SEGMENT_LENGTH_M = 200;
const MAX_SEGMENT_LENGTH_M = 3000;
const SLOPE_CHANGE_THRESHOLD_DEG = 10;
const ASPECT_CHANGE_THRESHOLD_DEG = 90;
const BOUNDARY_SUSTAIN_DISTANCE_M = 200;

interface AnalyzedPoint {
  distance: number;
  elevation: number;
  slope: number;
  aspect: number;
  lat: number;
  lng: number;
}

function computeSlope(
  elevDiff: number,
  horizontalDist: number,
): number {
  if (horizontalDist < 0.01) return 0;
  return Math.abs(
    (Math.atan2(Math.abs(elevDiff), horizontalDist) * 180) / Math.PI,
  );
}

function buildAnalyzedPoints(samples: ElevationSample[]): AnalyzedPoint[] {
  const aspects = computeAspectAtPoints(samples);
  const points: AnalyzedPoint[] = [];

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    let slope = 0;
    if (i > 0) {
      const prev = samples[i - 1];
      const hDist = sample.distance - prev.distance;
      slope = computeSlope(sample.elevation - prev.elevation, hDist);
    }
    points.push({
      distance: sample.distance,
      elevation: sample.elevation,
      slope,
      aspect: aspects[i],
      lat: sample.lat,
      lng: sample.lng,
    });
  }

  return points;
}

function angularDifference(a: number, b: number): number {
  let diff = Math.abs(a - b) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

function isSlopeChangeSustained(
  points: AnalyzedPoint[],
  startIdx: number,
  baseSlope: number,
): boolean {
  const startDist = points[startIdx].distance;
  for (let i = startIdx; i < points.length; i++) {
    if (points[i].distance - startDist >= BOUNDARY_SUSTAIN_DISTANCE_M) {
      return true;
    }
    if (Math.abs(points[i].slope - baseSlope) < SLOPE_CHANGE_THRESHOLD_DEG) {
      return false;
    }
  }
  return false;
}

function isAspectChangeSustained(
  points: AnalyzedPoint[],
  startIdx: number,
  baseAspect: number,
): boolean {
  const startDist = points[startIdx].distance;
  for (let i = startIdx; i < points.length; i++) {
    if (points[i].distance - startDist >= BOUNDARY_SUSTAIN_DISTANCE_M) {
      return true;
    }
    if (angularDifference(points[i].aspect, baseAspect) < ASPECT_CHANGE_THRESHOLD_DEG) {
      return false;
    }
  }
  return false;
}

function detectBoundaries(points: AnalyzedPoint[]): number[] {
  if (points.length < 3) return [];

  const boundaries: number[] = [];
  let lastBoundaryDist = 0;
  let prevAscending: boolean | null = null;

  for (let i = 1; i < points.length - 1; i++) {
    const segDistance = points[i].distance - lastBoundaryDist;

    if (segDistance < MIN_SEGMENT_LENGTH_M) continue;

    let isBoundary = false;

    const slopeWindow = points
      .slice(Math.max(0, i - 2), i + 1)
      .reduce((sum, p) => sum + p.slope, 0) / Math.min(3, i + 1);

    if (
      Math.abs(points[i].slope - slopeWindow) > SLOPE_CHANGE_THRESHOLD_DEG &&
      isSlopeChangeSustained(points, i, slopeWindow)
    ) {
      isBoundary = true;
    }

    const prevAspect = points[Math.max(0, i - 1)].aspect;
    if (
      angularDifference(points[i].aspect, prevAspect) > ASPECT_CHANGE_THRESHOLD_DEG &&
      isAspectChangeSustained(points, i, prevAspect)
    ) {
      isBoundary = true;
    }

    const currentAscending = points[i].elevation > points[i - 1].elevation;
    if (prevAscending !== null && currentAscending !== prevAscending) {
      const lookback = Math.min(4, i);
      const elevTrend = points[i].elevation - points[i - lookback].elevation;
      if (Math.abs(elevTrend) > 30) {
        isBoundary = true;
      }
    }
    prevAscending = currentAscending;

    if (isBoundary) {
      boundaries.push(i);
      lastBoundaryDist = points[i].distance;
    }
  }

  return boundaries;
}

function enforceMaxSegmentLength(
  boundaries: number[],
  points: AnalyzedPoint[],
): number[] {
  const result: number[] = [];
  let prevIdx = 0;

  for (const boundary of boundaries) {
    const segLen = points[boundary].distance - points[prevIdx].distance;
    if (segLen > MAX_SEGMENT_LENGTH_M) {
      const numSplits = Math.ceil(segLen / MAX_SEGMENT_LENGTH_M);
      const splitDist = segLen / numSplits;
      for (let s = 1; s < numSplits; s++) {
        const targetDist = points[prevIdx].distance + splitDist * s;
        const idx = findClosestPointByDistance(points, targetDist, prevIdx, boundary);
        if (idx > prevIdx && idx < boundary) {
          result.push(idx);
        }
      }
    }
    result.push(boundary);
    prevIdx = boundary;
  }

  const finalLen = points[points.length - 1].distance - points[prevIdx].distance;
  if (finalLen > MAX_SEGMENT_LENGTH_M) {
    const numSplits = Math.ceil(finalLen / MAX_SEGMENT_LENGTH_M);
    const splitDist = finalLen / numSplits;
    for (let s = 1; s < numSplits; s++) {
      const targetDist = points[prevIdx].distance + splitDist * s;
      const idx = findClosestPointByDistance(
        points,
        targetDist,
        prevIdx,
        points.length - 1,
      );
      if (idx > prevIdx && idx < points.length - 1) {
        result.push(idx);
      }
    }
  }

  return [...new Set(result)].sort((a, b) => a - b);
}

function findClosestPointByDistance(
  points: AnalyzedPoint[],
  targetDist: number,
  from: number,
  to: number,
): number {
  let closest = from;
  let minDiff = Infinity;
  for (let i = from; i <= to; i++) {
    const diff = Math.abs(points[i].distance - targetDist);
    if (diff < minDiff) {
      minDiff = diff;
      closest = i;
    }
  }
  return closest;
}

function computeSegmentStats(
  points: AnalyzedPoint[],
): {
  distanceM: number;
  elevationGainM: number;
  elevationLossM: number;
  avgSlopeDegrees: number;
  maxSlopeDegrees: number;
  dominantAspect: string;
  aspectVariance: number;
} {
  let gain = 0;
  let loss = 0;
  let maxSlope = 0;
  let slopeSum = 0;
  const aspectCounts: Record<string, number> = {};
  const aspects: number[] = [];

  for (let i = 1; i < points.length; i++) {
    const elevDiff = points[i].elevation - points[i - 1].elevation;
    if (elevDiff > 0) gain += elevDiff;
    else loss += Math.abs(elevDiff);

    maxSlope = Math.max(maxSlope, points[i].slope);
    slopeSum += points[i].slope;
    aspects.push(points[i].aspect);

    const cardinal = aspectToCardinal(points[i].aspect);
    aspectCounts[cardinal] = (aspectCounts[cardinal] ?? 0) + 1;
  }

  const distanceM =
    points.length > 1
      ? points[points.length - 1].distance - points[0].distance
      : 0;

  const avgSlope = points.length > 1 ? slopeSum / (points.length - 1) : 0;

  let dominant = 'N';
  let maxCount = 0;
  for (const [dir, count] of Object.entries(aspectCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominant = dir;
    }
  }

  const uniqueCardinals = Object.keys(aspectCounts).length;
  const aspectVariance = uniqueCardinals / 8;

  return {
    distanceM,
    elevationGainM: gain,
    elevationLossM: loss,
    avgSlopeDegrees: Math.round(avgSlope * 10) / 10,
    maxSlopeDegrees: Math.round(maxSlope * 10) / 10,
    dominantAspect: dominant,
    aspectVariance,
  };
}

function classifyTerrain(
  stats: ReturnType<typeof computeSegmentStats>,
  segmentFraction: { start: number; end: number },
  netElevationChange: number,
): string {
  const isNearStartOrEnd =
    segmentFraction.start < 0.2 || segmentFraction.end > 0.8;

  if (stats.avgSlopeDegrees > 30) {
    return 'exposed_traverse';
  }

  if (stats.aspectVariance > 0.5 && stats.avgSlopeDegrees > 5) {
    return 'ridge';
  }

  if (
    stats.avgSlopeDegrees > 25 &&
    stats.aspectVariance < 0.4
  ) {
    return 'bowl';
  }

  if (netElevationChange < 0 && stats.avgSlopeDegrees > 15) {
    return 'descent';
  }

  if (stats.avgSlopeDegrees < 15 && isNearStartOrEnd) {
    return 'approach';
  }

  if (stats.avgSlopeDegrees < 15) {
    return 'trail';
  }

  if (netElevationChange > 0 && stats.avgSlopeDegrees > 15) {
    return 'ascent';
  }

  return 'trail';
}

function buildSegmentGeometry(points: AnalyzedPoint[]): LineString {
  return {
    type: 'LineString',
    coordinates: points.map((p) => [p.lng, p.lat]),
  };
}

/**
 * Decompose a route into logical segments based on terrain characteristics.
 *
 * The algorithm:
 * 1. Analyze slope and aspect at each sample point
 * 2. Detect boundaries where terrain changes significantly
 * 3. Enforce min/max segment lengths
 * 4. Classify each segment by terrain type
 */
export function decomposeRoute(
  samples: ElevationSample[],
  routeGeometry: LineString,
): ComputedSegment[] {
  if (samples.length < 3) {
    return [
      {
        geometry: routeGeometry,
        segmentOrder: 0,
        distanceM: samples.length > 1
          ? samples[samples.length - 1].distance - samples[0].distance
          : 0,
        elevationGainM: 0,
        elevationLossM: 0,
        avgSlopeDegrees: 0,
        maxSlopeDegrees: 0,
        dominantAspect: 'N',
        terrainType: 'trail',
      },
    ];
  }

  const points = buildAnalyzedPoints(samples);
  const totalDistance = points[points.length - 1].distance;

  let boundaries = detectBoundaries(points);
  boundaries = enforceMaxSegmentLength(boundaries, points);

  const segmentRanges: { start: number; end: number }[] = [];
  let prevIdx = 0;
  for (const b of boundaries) {
    segmentRanges.push({ start: prevIdx, end: b });
    prevIdx = b;
  }
  segmentRanges.push({ start: prevIdx, end: points.length - 1 });

  const mergedRanges: { start: number; end: number }[] = [];
  for (const range of segmentRanges) {
    const segDist =
      points[range.end].distance - points[range.start].distance;
    if (segDist < MIN_SEGMENT_LENGTH_M && mergedRanges.length > 0) {
      mergedRanges[mergedRanges.length - 1].end = range.end;
    } else {
      mergedRanges.push({ ...range });
    }
  }

  const segments: ComputedSegment[] = [];

  for (let i = 0; i < mergedRanges.length; i++) {
    const range = mergedRanges[i];
    const segPoints = points.slice(range.start, range.end + 1);
    if (segPoints.length < 2) continue;

    const stats = computeSegmentStats(segPoints);
    const netElev =
      segPoints[segPoints.length - 1].elevation - segPoints[0].elevation;

    const startFrac = totalDistance > 0
      ? points[range.start].distance / totalDistance
      : 0;
    const endFrac = totalDistance > 0
      ? points[range.end].distance / totalDistance
      : 1;

    const terrainType = classifyTerrain(stats, { start: startFrac, end: endFrac }, netElev);

    segments.push({
      geometry: buildSegmentGeometry(segPoints),
      segmentOrder: i,
      distanceM: Math.round(stats.distanceM),
      elevationGainM: Math.round(stats.elevationGainM),
      elevationLossM: Math.round(stats.elevationLossM),
      avgSlopeDegrees: stats.avgSlopeDegrees,
      maxSlopeDegrees: stats.maxSlopeDegrees,
      dominantAspect: stats.dominantAspect,
      terrainType,
    });
  }

  return segments;
}

/**
 * Convenience overload: accepts the interface from the issue spec,
 * converting the elevation profile into ElevationSample-compatible entries
 * using the route geometry coordinates.
 */
export function decomposeRouteFromProfile(
  input: SegmentationInput,
): ComputedSegment[] {
  const coords = input.routeGeometry.coordinates;
  if (coords.length < 2) return [];

  const totalLen = input.elevationProfile.length > 0
    ? input.elevationProfile[input.elevationProfile.length - 1].distance
    : 0;
  const coordTotalLen = coords.length;

  const samples: ElevationSample[] = input.elevationProfile.map((pt, i) => {
    const frac = totalLen > 0 ? pt.distance / totalLen : i / Math.max(1, coordTotalLen - 1);
    const coordIdx = Math.min(
      Math.floor(frac * (coordTotalLen - 1)),
      coordTotalLen - 1,
    );
    const coord = coords[coordIdx];
    return {
      distance: pt.distance,
      elevation: pt.elevation,
      lat: coord[1],
      lng: coord[0],
    };
  });

  return decomposeRoute(samples, input.routeGeometry);
}
