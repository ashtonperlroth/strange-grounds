import { TRPCError } from "@trpc/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const ANONYMOUS_DAILY_LIMIT = 3;

export async function checkAnonymousRateLimit(
  adminSupabase: SupabaseClient,
  ip: string | null,
): Promise<void> {
  if (!ip) {
    ip = "unknown";
  }

  const today = new Date().toISOString().split("T")[0];

  const { count, error: countError } = await adminSupabase
    .from("anonymous_usage")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ip)
    .eq("used_at", today);

  if (countError) {
    console.error("Rate limit check failed:", countError);
    return;
  }

  if ((count ?? 0) >= ANONYMOUS_DAILY_LIMIT) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message:
        "You've used your free briefings today. Sign up for unlimited access.",
    });
  }

  const { error: insertError } = await adminSupabase
    .from("anonymous_usage")
    .insert({ ip_address: ip, used_at: today });

  if (insertError) {
    console.error("Rate limit insert failed:", insertError);
  }
}
