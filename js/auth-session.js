// jobmote.de – Auth Session (Supabase)

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

  JM.signOut = async function () {
    try {
      const { error } = await supabase.auth.signOut(); // ✅ nutzt denselben Client
      if (error) console.error("Supabase signOut error:", error);

      JM.currentUser = null;
      localStorage.removeItem("jm-user");
    } catch (err) {
      console.error("signOut crashed:", err);
    }
  };

  // ✅ Auth-State live aktualisieren
  supabase.auth.onAuthStateChange(async (event) => {
    if (event === "SIGNED_OUT") {
      JM.currentUser = null;
    }
    if (event === "SIGNED_IN") {
      JM.currentUser = await buildCurrentUser(supabase);
    }
  });
}

JM.authReady = init();

