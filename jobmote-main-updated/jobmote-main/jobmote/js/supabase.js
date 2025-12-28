import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

let _client;

/**
 * Lazy-load Supabase config from a Edge Function so you don't hardcode keys in the repo.
 * Requires Cloudflare Pages env vars:
 *  - SUPABASE_URL
 *  - SUPABASE_ANON_KEY
 */
export async function getSupabase() {
  if (_client) return _client;
  const res = await fetch("/api/config", { cache: "no-store" });
  if (!res.ok) throw new Error("Config function failed: " + res.status);

  const cfg = await res.json();
  if (!cfg?.url || !cfg?.anonKey) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_ANON_KEY in Netlify environment variables");
  }

  _client = createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return _client;
}

/** Convenience helper if you prefer direct import usage */
export const supabase = await getSupabase();
