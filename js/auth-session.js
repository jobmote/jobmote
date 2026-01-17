// jobmote.de – Auth Session (Supabase)
// - Provides JM.getCurrentUser(), JM.isAdmin(), JM.isCompany(), JM.signOut()
// - Exposes JM.authReady (Promise)

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

  if (!user) return null;

  // Supabase exposes either email_confirmed_at or confirmed_at depending on settings/SDK.
  const confirmedAt = user.email_confirmed_at || user.confirmed_at || null;

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
    confirmedAt,
    loadedAt: nowIso(),
  };
}

async function init() {
  const supabase = await getSupabase();
  JM.supabase = supabase;

  JM.currentUser = await buildCurrentUser(supabase);

  JM.getCurrentUser = () => JM.currentUser;
  JM.isAdmin = () => (JM.currentUser?.role || "") === "admin";
  JM.isCompany = () => (JM.currentUser?.role || "") === "company";
  JM.isConfirmed = () => !!JM.currentUser?.confirmedAt;

  JM.signOut = async () => {
    await supabase.auth.signOut();
    JM.currentUser = null;
    try {
      if (typeof JM.initMenu === "function") JM.initMenu();
    } catch {}
  };

  // Keep user cache in sync for ALL events (TOKEN_REFRESHED etc.)
  supabase.auth.onAuthStateChange(async () => {
    JM.currentUser = await buildCurrentUser(supabase);
    try {
      if (typeof JM.initMenu === "function") JM.initMenu();
    } catch {}
  });

  // draw menu once after initial user build
  try {
    if (typeof JM.initMenu === "function") JM.initMenu();
  } catch {}
}

JM.authReady = init();
