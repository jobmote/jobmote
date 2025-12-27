// jobmote.de – Auth Session (Supabase)
// - No local demo users / sessions
// - Provides JM.getCurrentUser(), JM.isAdmin(), JM.isEntrepreneur(), JM.signOut()
// - Exposes JM.authReady (Promise) so non-module scripts can await if needed

import { getSupabase } from "/js/supabase.js";

window.JM = window.JM || {};
const JM = window.JM;

function nowIso() {
  return new Date().toISOString();
}

function isBanned(profile) {
  if (!profile) return false;
  if (profile.banned_permanent === true) return true;
  if (profile.banned_until) {
    const t = Date.parse(profile.banned_until);
    if (Number.isFinite(t) && t > Date.now()) return true;
  }
  return false;
}

async function loadProfile(supabase, user) {
  if (!user?.id) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, banned_until, banned_permanent")
    .eq("id", user.id)
    .single();
  if (error) return null;
  return data || null;
}

async function buildCurrentUser(supabase) {
  const { data } = await supabase.auth.getSession();
  const session = data?.session || null;
  const user = session?.user || null;

  // If email isn't confirmed, treat as logged out.
  if (user && !user.email_confirmed_at) {
    await supabase.auth.signOut();
    return null;
  }

  if (!user) return null;

  const profile = await loadProfile(supabase, user);
  if (isBanned(profile)) {
    await supabase.auth.signOut();
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: String(profile?.role || "user").toLowerCase(),
    profile,
    confirmedAt: user.email_confirmed_at || null,
    loadedAt: nowIso(),
  };
}

async function init() {
  const supabase = await getSupabase();
  JM.supabase = supabase; // optional convenience

  JM.currentUser = await buildCurrentUser(supabase);

  JM.getCurrentUser = () => JM.currentUser;
  JM.isAdmin = () => (JM.currentUser?.role || "") === "admin";
  JM.isEntrepreneur = () => (JM.currentUser?.role || "") === "entrepreneur";

  JM.signOut = async () => {
    await supabase.auth.signOut();
    JM.currentUser = null;
  };

  // keep in sync
  supabase.auth.onAuthStateChange(async () => {
    JM.currentUser = await buildCurrentUser(supabase);
    // refresh menu if present
    if (typeof JM.initMenu === "function") {
      try { JM.initMenu(); } catch {}
    }
  });
}

JM.authReady = init();
