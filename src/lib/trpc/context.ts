import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export interface TRPCContext {
  supabase: SupabaseClient;
  user: User | null;
}

export async function createTRPCContext(): Promise<TRPCContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}
