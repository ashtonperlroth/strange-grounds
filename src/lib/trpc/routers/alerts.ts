import { z } from "zod";
import { protectedProcedure, router } from "@/lib/trpc/init";

export const alertsRouter = router({
  getUnread: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from("alerts")
      .select("id, category, severity, title, message, trip_id, created_at")
      .eq("user_id", ctx.user.id)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(10);

    return data ?? [];
  }),

  markRead: protectedProcedure
    .input(z.object({ ids: z.array(z.string().uuid()) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase
        .from("alerts")
        .update({ is_read: true })
        .in("id", input.ids)
        .eq("user_id", ctx.user.id);

      return { ok: true };
    }),
});
