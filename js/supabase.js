import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

let _client = null;

// Cache config locally so a temporary /api/config outage doesn't look like a random logout.
const CFG_CACHE_KEY = "jm-supabase-config";

async function loadConfig() {
  // 1) Network (source of truth)
  try {
    const res = await fetch("/api/config", { cache: "no-store" });
    if (!res.ok) throw new Error("Config function failed: " + res.status);
    const cfg = await res.json();
    // Persist raw response for fallback
    try {
      localStorage.setItem(CFG_CACHE_KEY, JSON.stringify(cfg));
    } catch {}
    return cfg;
  } catch (e) {
    // 2) Fallback: local cache
    try {
      const raw = localStorage.getItem(CFG_CACHE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    throw e;
  }
}

function normalizeCfg(cfg) {
  // accept multiple shapes: {url, anonKey} or {SUPABASE_URL, SUPABASE_ANON_KEY} etc.
  const url = cfg?.url || cfg?.SUPABASE_URL || cfg?.supabaseUrl;
  const anonKey = cfg?.anonKey || cfg?.SUPABASE_ANON_KEY || cfg?.supabaseAnonKey;
  return { url, anonKey };
}

export async function getSupabase() {
  if (_client) return _client;

  const cfg = await loadConfig();
  const { url, anonKey } = normalizeCfg(cfg);

  if (!url || !anonKey) {
    console.error("Config JSON:", cfg);
    throw new Error("Missing url/anonKey in /api/config response");
  }

  _client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Keep false by default to avoid weird URL session parsing.
      // If you use magic links, you can set this to true.
      detectSessionInUrl: false,
    },
  });

  return _client;
}

export const supabase = await getSupabase();
