import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "../config";
export function createPublicClient() {
  const config = supabaseConfig();
  return config
    ? createClient(config.url, config.key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null;
}
