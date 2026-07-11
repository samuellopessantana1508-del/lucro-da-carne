import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let browserClient: SupabaseClient<Database> | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
      supabasePublishableKey &&
      !supabaseUrl.includes("seu-projeto") &&
      !supabasePublishableKey.includes("sua-chave-publica") &&
      !supabasePublishableKey.includes("sua-anon-key")
  );
}

export function getSupabaseBrowserClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured() || !supabaseUrl || !supabasePublishableKey) return null;
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
  }
  return browserClient;
}
