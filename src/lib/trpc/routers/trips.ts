import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../init";

function parseLocation(location: unknown): { lat: number; lng: number } {
  if (!location) return { lat: 0, lng: 0 };

  if (typeof location === "object" && location !== null) {
    const geo = location as Record<string, unknown>;
    if (geo.type === "Point" && Array.isArray(geo.coordinates)) {
      return { lng: geo.coordinates[0] as number, lat: geo.coordinates[1] as number };
    }
  }

  if (typeof location === "string") {
    const match = location.match(/POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/);
    if (match) {
      return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
    }
  }

  return { lat: 0, lng: 0 };
}

export const tripsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.adminSupabase
      .from("trips")
      .select("*, briefings(id, readiness, created_at)")
      .eq("user_id", ctx.user.id)
      .not("saved_at", "is", null)
      .order("saved_at", { ascending: false })
      .order("created_at", { referencedTable: "briefings", ascending: false })
      .limit(1, { referencedTable: "briefings" });

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
      });
    }

    return (data ?? []).map((trip) => {
      const coords = parseLocation(trip.location);
      return { ...trip, latitude: coords.lat, longitude: coords.lng };
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.adminSupabase
        .from("trips")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .single();

      if (error) {
        throw new TRPCError({
          code: error.code === "PGRST116" ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      const coords = parseLocation(data.location);

      return { ...data, latitude: coords.lat, longitude: coords.lng };
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().optional(),
        location_name: z.string().min(1),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        start_date: z.string(),
        end_date: z.string(),
        activity: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id ?? null;

      if (userId) {
        await ctx.adminSupabase
          .from("profiles")
          .upsert({ id: userId }, { onConflict: "id" });
      }

      const { latitude, longitude, ...rest } = input;
      const point = `POINT(${longitude} ${latitude})`;

      const { data, error } = await ctx.adminSupabase
        .from("trips")
        .insert({
          ...rest,
          user_id: userId,
          location: point,
        })
        .select()
        .single();

      if (error) {
        const message = (error.message ?? "").toLowerCase();
        // Some deployed DBs keep trips.user_id as NOT NULL; surface a clear auth error.
        if (
          !userId &&
          message.includes("null value in column") &&
          message.includes("user_id")
        ) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Please sign in to generate briefings.",
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return data;
    }),

  save: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: trip, error: fetchError } = await ctx.adminSupabase
        .from("trips")
        .select("id, user_id, location_name, start_date")
        .eq("id", input.id)
        .single();

      if (fetchError || !trip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip not found",
        });
      }

      if (trip.user_id && trip.user_id !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Trip belongs to another user",
        });
      }

      const autoName = `${trip.location_name} — ${trip.start_date}`;
      const tripName = input.name?.trim() || autoName;

      const { data, error } = await ctx.adminSupabase
        .from("trips")
        .update({
          user_id: ctx.user.id,
          saved_at: new Date().toISOString(),
          name: tripName,
        })
        .eq("id", input.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      await ctx.adminSupabase
        .from("profiles")
        .upsert({ id: ctx.user.id }, { onConflict: "id" });

      return data;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().optional(),
        location_name: z.string().min(1).optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        activity: z.string().min(1).optional(),
        is_monitoring: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, latitude, longitude, ...rest } = input;

      const updateData: Record<string, unknown> = { ...rest };
      if (latitude !== undefined && longitude !== undefined) {
        updateData.location = `POINT(${longitude} ${latitude})`;
      }

      const { data, error } = await ctx.supabase
        .from("trips")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", ctx.user.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: error.code === "PGRST116" ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return data;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.adminSupabase
        .from("trips")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return { success: true };
    }),
});
