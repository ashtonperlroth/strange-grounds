import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export interface TRPCContext {
  supabase: SupabaseClient;
  adminSupabase: SupabaseClient;
  user: User | null;
}

export async function createTRPCContext(): Promise<TRPCContext> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, adminSupabase, user };
}
