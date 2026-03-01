import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../init";

export const briefingsRouter = router({
  getByTripId: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: trip } = await ctx.supabase
        .from("trips")
        .select("id")
        .eq("id", input.tripId)
        .eq("user_id", ctx.user.id)
        .single();

      if (!trip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip not found",
        });
      }

      const { data, error } = await ctx.supabase
        .from("briefings")
        .select("*")
        .eq("trip_id", input.tripId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return data;
    }),

  getByShareToken: publicProcedure
    .input(z.object({ shareToken: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("briefings")
        .select("*")
        .eq("share_token", input.shareToken)
        .single();

      if (error) {
        throw new TRPCError({
          code: error.code === "PGRST116" ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return data;
    }),

  generate: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: trip } = await ctx.supabase
        .from("trips")
        .select("id")
        .eq("id", input.tripId)
        .eq("user_id", ctx.user.id)
        .single();

      if (!trip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip not found",
        });
      }

      // TODO: Trigger Inngest event for briefing generation
      // For now, create a placeholder briefing record
      const { data, error } = await ctx.supabase
        .from("briefings")
        .insert({
          trip_id: input.tripId,
          narrative: null,
          conditions: {},
          raw_data: {},
          readiness: null,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return data;
    }),
});
