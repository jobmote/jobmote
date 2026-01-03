import { getSupabase } from "/js/supabase.js";
const supabase = await getSupabase();

function redirectOut() {
  window.location.replace("/index.html");
}

(async () => {
  // 1️⃣ Session prüfen
  const { data } = await supabase.auth.getSession();
  const user = data?.session?.user;

  if (!user) {
    redirectOut();
    return;
  }

  // 2️⃣ Email bestätigt?
  const confirmed = user.email_confirmed_at || user.confirmed_at;
  if (!confirmed) {
    redirectOut();
    return;
  }

  // 3️⃣ Profil laden (RLS-sicher)
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, banned_until, banned_permanent")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    console.error("Admin-Guard: profile load failed", error);
    redirectOut();
    return;
  }

  // 4️⃣ Bann prüfen
  const isBanned =
    profile.banned_permanent === true ||
    (profile.banned_until && Date.parse(profile.banned_until) > Date.now());

  if (isBanned) {
    redirectOut();
    return;
  }

  // 5️⃣ Admin-Rolle prüfen
  if ((profile.role || "").toLowerCase() !== "admin") {
    redirectOut();
    return;
  }

  // ✅ Wenn wir hier sind → Admin darf bleiben
})();
