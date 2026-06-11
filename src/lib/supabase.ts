import { createClient } from "@supabase/supabase-js";
import type { Database } from "./supabase-types";

type SupabaseAdminClient = ReturnType<typeof createClient<Database>>;

let cached: SupabaseAdminClient | undefined;

export function getSupabaseAdmin(): SupabaseAdminClient {
  if (cached) return cached;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!serviceRoleKey) {
    throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
  }

  cached = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    // Ensure server-side runtime uses fetch from the current environment.
    global: { headers: {} },
  });

  // `cached` is definitely set by this point.
  return cached!;
}

