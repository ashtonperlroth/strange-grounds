import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../init";
import type { Route, RouteWaypoint } from "@/lib/types/route";
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

function parsePoint(raw: unknown): Point {
  if (!raw) return { type: "Point", coordinates: [0, 0] };

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

  return { type: "Point", coordinates: [0, 0] };
}

function toLineStringWKT(coordinates: number[][]): string {
  return `LINESTRING(${coordinates.map((c) => `${c[0]} ${c[1]}`).join(", ")})`;
}

function toPointWKT(coordinates: number[]): string {
  return `POINT(${coordinates[0]} ${coordinates[1]})`;
}

function mapRoute(row: Record<string, unknown>): Route {
  return {
    id: row.id as string,
    tripId: (row.trip_id as string) ?? null,
    name: (row.name as string) ?? null,
    description: (row.description as string) ?? null,
    geometry: parseGeometry(row.geometry),
    totalDistanceM: (row.total_distance_m as number) ?? 0,
    elevationGainM: (row.elevation_gain_m as number) ?? 0,
    elevationLossM: (row.elevation_loss_m as number) ?? 0,
    maxElevationM: (row.max_elevation_m as number) ?? 0,
    minElevationM: (row.min_elevation_m as number) ?? 0,
    activity: row.activity as string,
    source: row.source as Route["source"],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapWaypoint(row: Record<string, unknown>): RouteWaypoint {
  return {
    id: row.id as string,
    routeId: row.route_id as string,
    sortOrder: row.sort_order as number,
    name: (row.name as string) ?? null,
    location: parsePoint(row.location),
    elevationM: (row.elevation_m as number) ?? null,
    waypointType: row.waypoint_type as RouteWaypoint["waypointType"],
    notes: (row.notes as string) ?? null,
  };
}

const coordinateSchema = z.tuple([z.number(), z.number()]);

const waypointInputSchema = z.object({
  sortOrder: z.number().int(),
  name: z.string().nullish(),
  location: z.object({
    type: z.literal("Point"),
    coordinates: coordinateSchema,
  }),
  elevationM: z.number().nullish(),
  waypointType: z
    .enum(["start", "waypoint", "camp", "pass", "water", "end"])
    .default("waypoint"),
  notes: z.string().nullish(),
});

export const routesRouter = router({
  create: publicProcedure
    .input(
      z.object({
        tripId: z.string().uuid().nullish(),
        name: z.string().nullish(),
        description: z.string().nullish(),
        geometry: z.object({
          type: z.literal("LineString"),
          coordinates: z.array(coordinateSchema).min(2),
        }),
        activity: z.string().default("backpacking"),
        source: z
          .enum(["manual", "gpx_import", "ai_generated", "popular_route"])
          .default("manual"),
        sourceRouteId: z.string().uuid().nullish(),
        waypoints: z.array(waypointInputSchema).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id ?? null;
      const sessionToken = userId
        ? null
        : (ctx.ip ?? crypto.randomUUID());

      const wkt = toLineStringWKT(input.geometry.coordinates);

      const { data: route, error } = await ctx.adminSupabase
        .from("routes")
        .insert({
          trip_id: input.tripId ?? null,
          user_id: userId,
          session_token: sessionToken,
          name: input.name ?? null,
          description: input.description ?? null,
          geometry: wkt,
          activity: input.activity,
          source: input.source,
          source_route_id: input.sourceRouteId ?? null,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      let waypoints: RouteWaypoint[] = [];
      if (input.waypoints && input.waypoints.length > 0) {
        const waypointRows = input.waypoints.map((wp) => ({
          route_id: route.id,
          sort_order: wp.sortOrder,
          name: wp.name ?? null,
          location: toPointWKT(wp.location.coordinates),
          elevation_m: wp.elevationM ?? null,
          waypoint_type: wp.waypointType,
          notes: wp.notes ?? null,
        }));

        const { data: wpData, error: wpError } = await ctx.adminSupabase
          .from("route_waypoints")
          .insert(waypointRows)
          .select();

        if (wpError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: wpError.message,
          });
        }

        waypoints = (wpData ?? []).map((row) =>
          mapWaypoint(row as unknown as Record<string, unknown>),
        );
      }

      return {
        route: mapRoute(route as unknown as Record<string, unknown>),
        waypoints,
      };
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        tripId: z.string().uuid().nullish(),
        name: z.string().nullish(),
        description: z.string().nullish(),
        geometry: z
          .object({
            type: z.literal("LineString"),
            coordinates: z.array(coordinateSchema).min(2),
          })
          .optional(),
        activity: z.string().optional(),
        waypoints: z.array(waypointInputSchema).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: existing, error: fetchError } = await ctx.adminSupabase
        .from("routes")
        .select("id, user_id, session_token")
        .eq("id", input.id)
        .single();

      if (fetchError || !existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Route not found",
        });
      }

      const userId = ctx.user?.id ?? null;
      const isOwner =
        (userId && existing.user_id === userId) ||
        (!userId && existing.session_token !== null);
      if (!isOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to update this route",
        });
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (input.name !== undefined) updateData.name = input.name;
      if (input.tripId !== undefined) updateData.trip_id = input.tripId;
      if (input.description !== undefined)
        updateData.description = input.description;
      if (input.activity !== undefined) updateData.activity = input.activity;
      if (input.geometry) {
        updateData.geometry = toLineStringWKT(input.geometry.coordinates);
      }

      const { data: route, error } = await ctx.adminSupabase
        .from("routes")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      let waypoints: RouteWaypoint[] = [];
      if (input.waypoints) {
        await ctx.adminSupabase
          .from("route_waypoints")
          .delete()
          .eq("route_id", input.id);

        if (input.waypoints.length > 0) {
          const waypointRows = input.waypoints.map((wp) => ({
            route_id: input.id,
            sort_order: wp.sortOrder,
            name: wp.name ?? null,
            location: toPointWKT(wp.location.coordinates),
            elevation_m: wp.elevationM ?? null,
            waypoint_type: wp.waypointType,
            notes: wp.notes ?? null,
          }));

          const { data: wpData, error: wpError } = await ctx.adminSupabase
            .from("route_waypoints")
            .insert(waypointRows)
            .select();

          if (wpError) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: wpError.message,
            });
          }

          waypoints = (wpData ?? []).map((row) =>
            mapWaypoint(row as unknown as Record<string, unknown>),
          );
        }
      } else {
        const { data: wpData } = await ctx.adminSupabase
          .from("route_waypoints")
          .select()
          .eq("route_id", input.id)
          .order("sort_order");

        waypoints = (wpData ?? []).map((row) =>
          mapWaypoint(row as unknown as Record<string, unknown>),
        );
      }

      return {
        route: mapRoute(route as unknown as Record<string, unknown>),
        waypoints,
      };
    }),

  getByTripId: publicProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: routes, error } = await ctx.adminSupabase
        .from("routes")
        .select("*")
        .eq("trip_id", input.tripId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      if (!routes || routes.length === 0) return [];

      const routeIds = routes.map((r) => r.id);

      const { data: allWaypoints } = await ctx.adminSupabase
        .from("route_waypoints")
        .select("*")
        .in("route_id", routeIds)
        .order("sort_order");

      const waypointsByRoute = new Map<string, RouteWaypoint[]>();
      for (const wp of allWaypoints ?? []) {
        const routeId = wp.route_id as string;
        if (!waypointsByRoute.has(routeId)) {
          waypointsByRoute.set(routeId, []);
        }
        waypointsByRoute
          .get(routeId)!
          .push(mapWaypoint(wp as unknown as Record<string, unknown>));
      }

      return routes.map((row) => ({
        route: mapRoute(row as unknown as Record<string, unknown>),
        waypoints: waypointsByRoute.get(row.id) ?? [],
      }));
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: existing, error: fetchError } = await ctx.adminSupabase
        .from("routes")
        .select("id, user_id, session_token")
        .eq("id", input.id)
        .single();

      if (fetchError || !existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Route not found",
        });
      }

      const userId = ctx.user?.id ?? null;
      const isOwner =
        (userId && existing.user_id === userId) ||
        (!userId && existing.session_token !== null);
      if (!isOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to delete this route",
        });
      }

      const { error } = await ctx.adminSupabase
        .from("routes")
        .delete()
        .eq("id", input.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return { success: true };
    }),
});
