import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

let _client = null;

export async function getSupabase() {
  if (_client) return _client;

  const res = await fetch("/api/config", { cache: "no-store" });
  if (!res.ok) throw new Error("Config function failed: " + res.status);

  const cfg = await res.json();

  // WICHTIG: akzeptiere beide Schreibweisen, damit es nicht still scheitert
  const url = cfg?.url || cfg?.SUPABASE_URL || cfg?.supabaseUrl;
  const anonKey = cfg?.anonKey || cfg?.SUPABASE_ANON_KEY || cfg?.supabaseAnonKey;

  if (!url || !anonKey) {
    console.error("Config JSON:", cfg);
    throw new Error("Missing url/anonKey in /api/config response");
  }

  _client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return _client;
}
;
