import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../init";
import { inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { briefingRateLimit } from "@/lib/rate-limit";

export const briefingsRouter = router({
  getByTripId: publicProcedure
    .input(
      z.object({
        tripId: z.string().uuid(),
      }),
    )
    .query(async ({ input }) => {
      const admin = createAdminClient();

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
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        routeGeometry: z
          .object({
            type: z.literal("LineString"),
            coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
          })
          .optional(),
        routeBbox: z
          .tuple([z.number(), z.number(), z.number(), z.number()])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (briefingRateLimit) {
        const identifier =
          ctx.user?.id ?? ctx.ip ?? "anonymous";
        const { success, remaining } =
          await briefingRateLimit.limit(identifier);
        if (!success) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Rate limited. You can generate ${remaining} more briefings this hour.`,
          });
        }
      }

      const admin = createAdminClient();

      const { data: trip } = await admin
        .from("trips")
        .select("id, start_date, end_date, activity")
        .eq("id", input.tripId)
        .single();

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
          routeGeometry: input.routeGeometry,
          routeBbox: input.routeBbox,
          startDate: trip.start_date,
          endDate: trip.end_date,
          activity: trip.activity,
        },
      });

      return data;
    }),
});
