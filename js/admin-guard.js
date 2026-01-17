import { getSupabase } from "/js/supabase.js";
const supabase = await getSupabase();

function redirectOut(reason = "unknown") {
  console.error("ADMIN-GUARD redirect:", reason, new Error().stack);
  window.location.replace("/index.html?admin_redirect=" + encodeURIComponent(reason));
}

(async () => {
  // 1) Session prüfen
  const { data } = await supabase.auth.getSession();
  const user = data?.session?.user;

  if (!user) return redirectOut("no_user");

  // 2) Email bestätigt?
  const confirmed = user.email_confirmed_at || user.confirmed_at;
  if (!confirmed) return redirectOut("not_confirmed");

  // 3) Profil laden
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, banned_until, banned_permanent")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return redirectOut("profile_error:" + (error.code || "err"));
  if (!profile) return redirectOut("no_profile_row");

  // 4) Bann prüfen
  const isBanned =
    profile.banned_permanent === true ||
    (profile.banned_until && Date.parse(profile.banned_until) > Date.now());

  if (isBanned) return redirectOut("banned");

  // 5) Admin prüfen
  const role = (profile.role || "").toLowerCase();
  if (role !== "admin") return redirectOut("not_admin:" + role);

  console.log("ADMIN-GUARD ok");
})();
