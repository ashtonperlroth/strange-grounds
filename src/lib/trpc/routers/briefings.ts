import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../init";
import { inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";

export const briefingsRouter = router({
  getByTripId: publicProcedure
    .input(
      z.object({
        tripId: z.string().uuid(),
        sessionToken: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const admin = createAdminClient();

      if (ctx.user) {
        const { data: trip } = await admin
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
      } else if (input.sessionToken) {
        const { data: trip } = await admin
          .from("trips")
          .select("id")
          .eq("id", input.tripId)
          .eq("session_token", input.sessionToken)
          .is("user_id", null)
          .single();

        if (!trip) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Trip not found",
          });
        }
      } else {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication or session token required",
        });
      }

      const { data, error } = await admin
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

  generate: publicProcedure
    .input(
      z.object({
        tripId: z.string().uuid(),
        sessionToken: z.string().uuid().optional(),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const admin = createAdminClient();

      let trip;

      if (ctx.user) {
        const { data } = await admin
          .from("trips")
          .select("id, start_date, end_date, activity")
          .eq("id", input.tripId)
          .eq("user_id", ctx.user.id)
          .single();
        trip = data;
      } else if (input.sessionToken) {
        const { data } = await admin
          .from("trips")
          .select("id, start_date, end_date, activity")
          .eq("id", input.tripId)
          .eq("session_token", input.sessionToken)
          .is("user_id", null)
          .single();
        trip = data;
      }

      if (!trip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip not found",
        });
      }

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

      await inngest.send({
        name: "briefing/requested",
        data: {
          tripId: input.tripId,
          briefingId: data.id,
          lat: input.lat,
          lng: input.lng,
          startDate: trip.start_date,
          endDate: trip.end_date,
          activity: trip.activity,
        },
      });

      return data;
    }),
});
