import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../init";
import { inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";

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
        .select("id, location, start_date, end_date, activity")
        .eq("id", input.tripId)
        .eq("user_id", ctx.user.id)
        .single();

      if (!trip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip not found",
        });
      }

      const admin = createAdminClient();

      const { data, error } = await admin
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

      const locationStr = trip.location as string;
      const coordMatch = locationStr.match(
        /POINT\(([-\d.]+)\s+([-\d.]+)\)/,
      );
      const lng = coordMatch ? parseFloat(coordMatch[1]) : 0;
      const lat = coordMatch ? parseFloat(coordMatch[2]) : 0;

      await inngest.send({
        name: "briefing/requested",
        data: {
          tripId: input.tripId,
          briefingId: data.id,
          lat,
          lng,
          startDate: trip.start_date,
          endDate: trip.end_date,
          activity: trip.activity,
        },
      });

      return data;
    }),
});
