import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../init";
import { checkAnonymousRateLimit } from "../rate-limit";

export const tripsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("trips")
      .select("*")
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
      });
    }

    return data;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
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

      return data;
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
      let sessionToken: string | null = null;

      if (userId) {
        await ctx.adminSupabase
          .from("profiles")
          .upsert({ id: userId }, { onConflict: "id" });
      } else {
        await checkAnonymousRateLimit(ctx.adminSupabase, ctx.ip);
        sessionToken = crypto.randomUUID();
      }

      const { latitude, longitude, ...rest } = input;
      const point = `POINT(${longitude} ${latitude})`;

      const { data, error } = await ctx.adminSupabase
        .from("trips")
        .insert({
          ...rest,
          user_id: userId,
          session_token: sessionToken,
          location: point,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return { ...data, sessionToken };
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
      const { error } = await ctx.supabase
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
