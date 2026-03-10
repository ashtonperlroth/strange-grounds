import type { RouteSegment } from "@/lib/types/route";
import type { SegmentConditionsData, HazardLevel } from "@/lib/types/briefing";

export const HAZARD_LEVELS: HazardLevel[] = [
  "low",
  "moderate",
  "considerable",
  "high",
  "extreme",
];

interface HazardResult {
  level: HazardLevel;
  factors: string[];
}

function parseWindMph(windSpeed: string): number {
  const match = windSpeed.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function geometryCentroid(geometry: GeoJSON.Geometry): [number, number] {
  if (geometry.type === "Point") {
    return [geometry.coordinates[1], geometry.coordinates[0]];
  }

  let sumLng = 0;
  let sumLat = 0;
  let count = 0;

  function walk(coords: unknown): void {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      sumLng += coords[0] as number;
      sumLat += coords[1] as number;
      count++;
      return;
    }
    for (const c of coords) walk(c);
  }

  if ("coordinates" in geometry) {
    walk(geometry.coordinates);
  }

  if (count === 0) return [0, 0];
  return [sumLat / count, sumLng / count];
}

const KM_PER_MILE = 1.60934;
const FIRE_HAZARD_RADIUS_KM = 5 * KM_PER_MILE;

/**
 * Assess hazard level for a single route segment based on its conditions.
 *
 * Rules (additive with automatic floors):
 *  - Avalanche danger >= 3 on steep terrain → +2 levels
 *  - Avalanche danger >= 4 → automatic 'high'; >= 5 → automatic 'extreme'
 *  - Wind gusts > 50 mph on exposed terrain → +1 level
 *  - River flow > 200% median → +1 level
 *  - Slope > 35° with wind loading → +1 level
 *  - Active fire within 5 mi → automatic 'high'
 *  - Temperature < 0°F with wind → +1 level
 */
export function assessSegmentHazard(
  segment: RouteSegment,
  conditions: SegmentConditionsData,
  segmentMidpoint?: [number, number],
): HazardResult {
  let levelIndex = 0;
  const factors: string[] = [];

  if (conditions.avalanche) {
    const danger = conditions.avalanche.dangerLevel;
    if (danger >= 4) {
      levelIndex = Math.max(levelIndex, danger >= 5 ? 4 : 3);
      factors.push(
        `avalanche_danger_${conditions.avalanche.dangerLabel.toLowerCase().replace(/\s+/g, "_")}`,
      );
    } else if (danger >= 3 && segment.avgSlopeDegrees > 25) {
      levelIndex = Math.min(levelIndex + 2, 4);
      factors.push("avalanche_danger_considerable");
    }
  }

  const isExposed =
    segment.terrainType === "ridge" ||
    segment.terrainType === "exposed_traverse";

  if (conditions.wind && isExposed && conditions.wind.maxGustMph > 50) {
    levelIndex = Math.min(levelIndex + 1, 4);
    factors.push(`wind_gusts_${conditions.wind.maxGustMph}mph`);
  }

  if (conditions.streamFlow?.summary) {
    const pct = conditions.streamFlow.summary.maxPercentOfMedian;
    if (pct !== null && pct > 200) {
      levelIndex = Math.min(levelIndex + 1, 4);
      factors.push("river_crossing_high_flow");
    }
  }

  if (segment.maxSlopeDegrees > 35 && conditions.weather) {
    const periods =
      conditions.weather.hourly.length > 0
        ? conditions.weather.hourly
        : conditions.weather.periods;
    const winds = periods.slice(0, 24).map((p) => parseWindMph(p.windSpeed));
    const maxWind = winds.length > 0 ? Math.max(...winds) : 0;
    if (maxWind > 25) {
      levelIndex = Math.min(levelIndex + 1, 4);
      factors.push("steep_slope_wind_loading");
    }
  }

  if (
    conditions.fires &&
    conditions.fires.nearbyCount > 0 &&
    segmentMidpoint
  ) {
    const [segLat, segLng] = segmentMidpoint;
    const hasCloseFire = conditions.fires.fires.some((f) => {
      const [fireLat, fireLng] = geometryCentroid(f.geometry);
      return haversineKm(segLat, segLng, fireLat, fireLng) <= FIRE_HAZARD_RADIUS_KM;
    });
    if (hasCloseFire) {
      levelIndex = Math.max(levelIndex, 3);
      factors.push("active_fire_nearby");
    }
  }

  if (conditions.weather) {
    const periods = conditions.weather.periods.slice(0, 4);
    if (periods.length > 0) {
      const minTemp = Math.min(...periods.map((p) => p.temperature));
      if (minTemp < 0) {
        const winds = periods.map((p) => parseWindMph(p.windSpeed));
        const maxWind = winds.length > 0 ? Math.max(...winds) : 0;
        if (maxWind > 10) {
          levelIndex = Math.min(levelIndex + 1, 4);
          factors.push("hypothermia_risk");
        }
      }
    }
  }

  return {
    level: HAZARD_LEVELS[levelIndex],
    factors,
  };
}
