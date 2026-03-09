import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../init";
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
    estimatedDays: row.estimated_days != null ? Number(row.estimated_days) : null,
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

export const popularRoutesRouter = router({
  list: publicProcedure
    .input(
      z.object({
        activity: z
          .enum(["backpacking", "ski_touring", "mountaineering", "trail_running"])
          .optional(),
        difficulty: z.enum(["easy", "moderate", "strenuous", "expert"]).optional(),
        region: z.string().optional(),
        state: z.string().optional(),
        month: z.number().int().min(1).max(12).optional(),
        featured: z.boolean().optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.adminSupabase
        .from("popular_routes")
        .select("*", { count: "exact" })
        .eq("published", true)
        .order("is_featured", { ascending: false })
        .order("times_cloned", { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (input.activity) query = query.eq("activity", input.activity);
      if (input.difficulty) query = query.eq("difficulty", input.difficulty);
      if (input.region) query = query.eq("region", input.region);
      if (input.state) query = query.eq("state", input.state);
      if (input.featured !== undefined)
        query = query.eq("is_featured", input.featured);
      if (input.month) query = query.contains("best_months", [input.month]);

      const { data, error, count } = await query;

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return {
        routes: (data ?? []).map((row) =>
          mapPopularRoute(row as unknown as Record<string, unknown>),
        ),
        total: count ?? 0,
      };
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { data: route, error } = await ctx.adminSupabase
        .from("popular_routes")
        .select("*")
        .eq("slug", input.slug)
        .eq("published", true)
        .single();

      if (error || !route) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Route not found",
        });
      }

      const { data: waypoints } = await ctx.adminSupabase
        .from("popular_route_waypoints")
        .select("*")
        .eq("route_id", route.id)
        .order("sort_order");

      return {
        route: mapPopularRoute(route as unknown as Record<string, unknown>),
        waypoints: (waypoints ?? []).map((wp) =>
          mapPopularWaypoint(wp as unknown as Record<string, unknown>),
        ),
      };
    }),

  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().int().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tsQuery = input.query
        .trim()
        .split(/\s+/)
        .map((w) => `${w}:*`)
        .join(" & ");

      const { data, error } = await ctx.adminSupabase
        .from("popular_routes")
        .select("*")
        .eq("published", true)
        .textSearch("name_description_search", tsQuery, {
          type: "plain",
          config: "english",
        })
        .limit(input.limit);

      if (error) {
        const { data: fallback, error: fallbackError } = await ctx.adminSupabase
          .from("popular_routes")
          .select("*")
          .eq("published", true)
          .or(
            `name.ilike.%${input.query}%,description.ilike.%${input.query}%`,
          )
          .limit(input.limit);

        if (fallbackError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: fallbackError.message,
          });
        }

        return (fallback ?? []).map((row) =>
          mapPopularRoute(row as unknown as Record<string, unknown>),
        );
      }

      return (data ?? []).map((row) =>
        mapPopularRoute(row as unknown as Record<string, unknown>),
      );
    }),

  clone: protectedProcedure
    .input(z.object({ popularRouteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: source, error: fetchError } = await ctx.adminSupabase
        .from("popular_routes")
        .select("*")
        .eq("id", input.popularRouteId)
        .eq("published", true)
        .single();

      if (fetchError || !source) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Popular route not found",
        });
      }

      const { data: waypoints } = await ctx.adminSupabase
        .from("popular_route_waypoints")
        .select("*")
        .eq("route_id", source.id)
        .order("sort_order");

      const { data: newRoute, error: insertError } = await ctx.adminSupabase
        .from("routes")
        .insert({
          user_id: ctx.user.id,
          name: source.name,
          description: source.description,
          geometry: source.geometry,
          total_distance_m: source.total_distance_m,
          elevation_gain_m: source.elevation_gain_m,
          elevation_loss_m: source.elevation_loss_m,
          max_elevation_m: source.max_elevation_m,
          min_elevation_m: source.min_elevation_m,
          activity: source.activity,
          source: "popular_route",
          source_route_id: source.id,
        })
        .select()
        .single();

      if (insertError || !newRoute) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: insertError?.message ?? "Failed to clone route",
        });
      }

      if (waypoints && waypoints.length > 0) {
        const wpRows = waypoints.map(
          (wp: Record<string, unknown>) => ({
            route_id: newRoute.id,
            sort_order: wp.sort_order,
            name: wp.name,
            location: wp.location,
            elevation_m: wp.elevation_m,
            waypoint_type: wp.waypoint_type,
            notes: wp.description,
          }),
        );

        await ctx.adminSupabase.from("route_waypoints").insert(wpRows);
      }

      await ctx.adminSupabase.rpc("increment_times_cloned", {
        route_id: input.popularRouteId,
      });

      return { routeId: newRoute.id as string };
    }),
});
