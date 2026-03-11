import { createAdminClient } from "@/lib/supabase/admin";
import type {
  PopularRoute,
  PopularRouteWaypoint,
} from "@/lib/types/popular-route";
import type { LineString, Point } from "geojson";

function parseGeometry(raw: unknown): LineString {
  if (!raw) return { type: "LineString", coordinates: [] };

  if (typeof raw === "object" && raw !== null) {
    const geo = raw as Record<string, unknown>;
    if (geo.type === "LineString" && Array.isArray(geo.coordinates)) {
      return { type: "LineString", coordinates: geo.coordinates };
    }
  }

  if (typeof raw === "string") {
    const match = raw.match(/LINESTRING\(\s*(.+)\s*\)/);
    if (match) {
      const coords = match[1].split(",").map((pair) => {
        const [lng, lat] = pair.trim().split(/\s+/).map(Number);
        return [lng, lat];
      });
      return { type: "LineString", coordinates: coords };
    }
  }

  return { type: "LineString", coordinates: [] };
}

function parsePoint(raw: unknown): Point | null {
  if (!raw) return null;

  if (typeof raw === "object" && raw !== null) {
    const geo = raw as Record<string, unknown>;
    if (geo.type === "Point" && Array.isArray(geo.coordinates)) {
      return { type: "Point", coordinates: geo.coordinates };
    }
  }

  if (typeof raw === "string") {
    const match = raw.match(/POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/);
    if (match) {
      return {
        type: "Point",
        coordinates: [parseFloat(match[1]), parseFloat(match[2])],
      };
    }
  }

  return null;
}

function mapPopularRoute(row: Record<string, unknown>): PopularRoute {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: row.description as string,
    geometry: parseGeometry(row.geometry),
    totalDistanceM: (row.total_distance_m as number) ?? 0,
    elevationGainM: (row.elevation_gain_m as number) ?? 0,
    elevationLossM: (row.elevation_loss_m as number) ?? 0,
    maxElevationM: (row.max_elevation_m as number) ?? 0,
    minElevationM: (row.min_elevation_m as number) ?? 0,
    activity: row.activity as PopularRoute["activity"],
    difficulty: row.difficulty as PopularRoute["difficulty"],
    region: row.region as string,
    state: row.state as string,
    bestMonths: (row.best_months as number[]) ?? [],
    seasonNotes: (row.season_notes as string) ?? null,
    estimatedDays:
      row.estimated_days != null ? Number(row.estimated_days) : null,
    permitRequired: (row.permit_required as boolean) ?? false,
    permitInfo: (row.permit_info as string) ?? null,
    trailheadName: (row.trailhead_name as string) ?? null,
    trailheadLocation: parsePoint(row.trailhead_location),
    timesCloned: (row.times_cloned as number) ?? 0,
    metaTitle: (row.meta_title as string) ?? null,
    metaDescription: (row.meta_description as string) ?? null,
    isFeatured: (row.is_featured as boolean) ?? false,
    published: (row.published as boolean) ?? true,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapPopularWaypoint(
  row: Record<string, unknown>,
): PopularRouteWaypoint {
  const loc = parsePoint(row.location);
  return {
    id: row.id as string,
    routeId: row.route_id as string,
    sortOrder: row.sort_order as number,
    name: row.name as string,
    location: loc ?? { type: "Point", coordinates: [0, 0] },
    elevationM: (row.elevation_m as number) ?? null,
    waypointType: row.waypoint_type as PopularRouteWaypoint["waypointType"],
    description: (row.description as string) ?? null,
  };
}

export interface RouteBriefingData {
  bottomLine?: string;
  narrative?: string;
  conditionCards?: Array<{
    category: string;
    status: string;
    summary: string;
    detail?: string;
  }>;
  routeWalkthrough?: Array<{
    segmentOrder: number;
    mileRange: string;
    title: string;
    narrative: string;
    hazardLevel: string;
    keyCallouts: string[];
    timingAdvice: string | null;
  }>;
  criticalSections?: Array<{
    segmentOrder: number;
    title: string;
    whyCritical: string;
    recommendation: string;
  }>;
  gearChecklist?: string[];
  overallReadiness?: string;
  [key: string]: unknown;
}

export interface RouteBriefing {
  id: string;
  popularRouteId: string;
  briefingData: RouteBriefingData;
  readiness: string | null;
  generatedAt: string;
  conditionsHash: string | null;
}

export interface RouteWithBriefing {
  route: PopularRoute;
  waypoints: PopularRouteWaypoint[];
  briefing: RouteBriefing | null;
}

export async function getPublishedPopularRoutes(): Promise<PopularRoute[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("popular_routes")
    .select("*")
    .eq("published", true)
    .order("is_featured", { ascending: false })
    .order("times_cloned", { ascending: false });

  if (error) throw new Error(`Failed to fetch popular routes: ${error.message}`);

  return (data ?? []).map((row) =>
    mapPopularRoute(row as unknown as Record<string, unknown>),
  );
}

export async function getRouteBySlug(
  slug: string,
): Promise<RouteWithBriefing | null> {
  const supabase = createAdminClient();

  const { data: route, error } = await supabase
    .from("popular_routes")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (error || !route) return null;

  const mapped = mapPopularRoute(route as unknown as Record<string, unknown>);

  const [{ data: waypoints }, { data: briefing }] = await Promise.all([
    supabase
      .from("popular_route_waypoints")
      .select("*")
      .eq("route_id", mapped.id)
      .order("sort_order"),
    supabase
      .from("route_briefings")
      .select("*")
      .eq("popular_route_id", mapped.id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    route: mapped,
    waypoints: (waypoints ?? []).map((wp) =>
      mapPopularWaypoint(wp as unknown as Record<string, unknown>),
    ),
    briefing: briefing
      ? {
          id: briefing.id as string,
          popularRouteId: briefing.popular_route_id as string,
          briefingData: (briefing.briefing_data ?? {}) as RouteBriefingData,
          readiness: (briefing.readiness as string) ?? null,
          generatedAt: briefing.generated_at as string,
          conditionsHash: (briefing.conditions_hash as string) ?? null,
        }
      : null,
  };
}

export async function getRoutesWithBriefings(): Promise<RouteWithBriefing[]> {
  const supabase = createAdminClient();

  const { data: routes, error } = await supabase
    .from("popular_routes")
    .select("*")
    .eq("published", true)
    .order("is_featured", { ascending: false })
    .order("times_cloned", { ascending: false });

  if (error) throw new Error(`Failed to fetch popular routes: ${error.message}`);

  const routeIds = (routes ?? []).map((r) => r.id);

  const { data: briefings } = await supabase
    .from("route_briefings")
    .select("*")
    .in("popular_route_id", routeIds);

  const briefingMap = new Map<string, RouteBriefing>();
  for (const b of briefings ?? []) {
    briefingMap.set(b.popular_route_id as string, {
      id: b.id as string,
      popularRouteId: b.popular_route_id as string,
      briefingData: (b.briefing_data ?? {}) as RouteBriefingData,
      readiness: (b.readiness as string) ?? null,
      generatedAt: b.generated_at as string,
      conditionsHash: (b.conditions_hash as string) ?? null,
    });
  }

  return (routes ?? []).map((row) => {
    const mapped = mapPopularRoute(row as unknown as Record<string, unknown>);
    return {
      route: mapped,
      waypoints: [],
      briefing: briefingMap.get(mapped.id) ?? null,
    };
  });
}
