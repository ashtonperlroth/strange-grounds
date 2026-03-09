import type { LineString, Point } from "geojson";

export type Activity =
  | "backpacking"
  | "ski_touring"
  | "mountaineering"
  | "trail_running";

export type Difficulty = "easy" | "moderate" | "strenuous" | "expert";

export type PopularWaypointType =
  | "start"
  | "waypoint"
  | "camp"
  | "pass"
  | "water"
  | "summit"
  | "end";

export interface PopularRoute {
  id: string;
  slug: string;
  name: string;
  description: string;
  geometry: LineString;
  totalDistanceM: number;
  elevationGainM: number;
  elevationLossM: number;
  maxElevationM: number;
  minElevationM: number;
  activity: Activity;
  difficulty: Difficulty;
  region: string;
  state: string;
  bestMonths: number[];
  seasonNotes: string | null;
  estimatedDays: number | null;
  permitRequired: boolean;
  permitInfo: string | null;
  trailheadName: string | null;
  trailheadLocation: Point | null;
  timesCloned: number;
  metaTitle: string | null;
  metaDescription: string | null;
  isFeatured: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PopularRouteWaypoint {
  id: string;
  routeId: string;
  sortOrder: number;
  name: string;
  location: Point;
  elevationM: number | null;
  waypointType: PopularWaypointType;
  description: string | null;
}

export interface PopularRouteWithWaypoints {
  route: PopularRoute;
  waypoints: PopularRouteWaypoint[];
}
