import type { LineString, Point } from "geojson";

export interface Route {
  id: string;
  tripId: string | null;
  name: string | null;
  description: string | null;
  geometry: LineString;
  totalDistanceM: number;
  elevationGainM: number;
  elevationLossM: number;
  maxElevationM: number;
  minElevationM: number;
  activity: string;
  source: "manual" | "gpx_import" | "ai_generated" | "popular_route";
  createdAt: string;
  updatedAt: string;
}

export interface RouteWaypoint {
  id: string;
  routeId: string;
  sortOrder: number;
  name: string | null;
  location: Point;
  elevationM: number | null;
  waypointType: "start" | "waypoint" | "camp" | "pass" | "water" | "end";
  notes: string | null;
}

export interface RouteSegment {
  id: string;
  routeId: string;
  segmentOrder: number;
  geometry: LineString;
  distanceM: number;
  elevationGainM: number;
  elevationLossM: number;
  avgSlopeDegrees: number;
  dominantAspect: string;
  maxSlopeDegrees: number;
  terrainType: string;
  hazardLevel: string | null;
  hazardNotes: string | null;
}
