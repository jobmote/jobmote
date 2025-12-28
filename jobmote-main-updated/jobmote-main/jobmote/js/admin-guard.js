import { getSupabase } from "/js/supabase.js";
const supabase = await getSupabase();

async function redirectOut() {
  window.location.replace("../index.html");
}

const { data } = await supabase.auth.getSession();
const user = data?.session?.user;
if (!user) await redirectOut();

// Require confirmed email
if (!user.email_confirmed_at) await redirectOut();

// Option 1: profile role in public.profiles (recommended)
try {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, banned_until, banned_permanent")
    .eq("id", user.id)
    .single();

  if (error) throw error;

  const isBanned = (profile?.banned_permanent === true) ||
    (profile?.banned_until && Date.parse(profile.banned_until) > Date.now());
  if (isBanned) await redirectOut();
  if ((profile?.role || "").toLowerCase() !== "admin") await redirectOut();
} catch {
  await redirectOut();
}
