import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../init';
import { saveSegments, loadSegments, computeGeometryHash } from '@/lib/routes/save-segments';
import type { RouteSegment } from '@/lib/types/route';

const computedSegmentSchema = z.object({
  geometry: z.object({
    type: z.literal('LineString'),
    coordinates: z.array(z.array(z.number()).min(2)).min(2),
  }),
  segmentOrder: z.number().int(),
  distanceM: z.number(),
  elevationGainM: z.number(),
  elevationLossM: z.number(),
  avgSlopeDegrees: z.number(),
  maxSlopeDegrees: z.number(),
  dominantAspect: z.string(),
  terrainType: z.string(),
});

export const segmentsRouter = router({
  save: publicProcedure
    .input(
      z.object({
        routeId: z.string().uuid(),
        segments: z.array(computedSegmentSchema),
        routeGeometry: z.object({
          type: z.literal('LineString'),
          coordinates: z.array(z.array(z.number()).min(2)).min(2),
        }).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const geoHash = input.routeGeometry
          ? computeGeometryHash(input.routeGeometry)
          : undefined;
        const saved = await saveSegments(
          ctx.adminSupabase,
          input.routeId,
          input.segments,
          geoHash,
        );
        return saved;
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message:
            err instanceof Error ? err.message : 'Failed to save segments',
        });
      }
    }),

  getByRouteId: publicProcedure
    .input(z.object({ routeId: z.string().uuid() }))
    .query(async ({ ctx, input }): Promise<RouteSegment[]> => {
      try {
        return await loadSegments(ctx.adminSupabase, input.routeId);
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message:
            err instanceof Error ? err.message : 'Failed to load segments',
        });
      }
    }),
});
