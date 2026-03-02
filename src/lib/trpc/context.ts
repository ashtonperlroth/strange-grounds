import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export interface TRPCContext {
  supabase: SupabaseClient;
  adminSupabase: SupabaseClient;
  user: User | null;
  ip: string | null;
}

export async function createTRPCContext(): Promise<TRPCContext> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip") ??
    null;

  return { supabase, adminSupabase, user, ip };
}
