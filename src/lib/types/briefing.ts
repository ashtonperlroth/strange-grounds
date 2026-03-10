import type { NWSForecastData } from "@/lib/data-sources/nws";
import type { AvalancheData } from "@/lib/data-sources/avalanche";
import type { SnotelData } from "@/lib/data-sources/snotel";
import type { UsgsData } from "@/lib/data-sources/usgs";
import type { FireData } from "@/lib/data-sources/fires";
import type { DaylightData } from "@/lib/synthesis/conditions";

export interface WindData {
  maxGustMph: number;
  avgWindMph: number;
  dominantDirection: string;
  periods: Array<{
    time: string;
    windSpeed: number;
    windDirection: string;
    gustMph: number | null;
  }>;
}

export interface SegmentConditionsData {
  weather?: NWSForecastData | null;
  avalanche?: AvalancheData | null;
  snowpack?: SnotelData | null;
  streamFlow?: UsgsData | null;
  daylight?: DaylightData | null;
  fires?: FireData | null;
  wind?: WindData | null;
}

export type HazardLevel =
  | "low"
  | "moderate"
  | "considerable"
  | "high"
  | "extreme";

export interface SegmentConditions {
  segmentId: string;
  segmentOrder: number;
  terrainType: string;
  conditions: SegmentConditionsData;
  hazardLevel: HazardLevel;
  hazardFactors: string[];
}

export interface RouteAnalysis {
  segments: SegmentConditions[];
  overallHazardLevel: string;
  highestHazardSegment: {
    order: number;
    level: string;
    factors: string[];
  };
  totalSegments: number;
  hazardDistribution: Record<HazardLevel, number>;
}
