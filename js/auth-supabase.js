import { getSupabase } from "/js/supabase.js";

function byId(id) {
  return document.getElementById(id);
}

function wireRegister(supabase) {
  console.log("[auth] wireRegister() start");

  const form = byId("register-form");
  const msg = byId("register-msg");
  const emailEl =
  byId("reg-email") ||
  byId("register-email") ||
  byId("email") ||
  document.querySelector('input[type="email"]');
  const passEl =
  byId("reg-password") ||
  byId("register-password") ||
  byId("password") ||
  document.querySelector('input[type="password"]');

  console.log("[auth] elements", {
    form: !!form,
    msg: !!msg,
    emailEl: !!emailEl,
    passEl: !!passEl,
  });

  if (!form || !emailEl || !passEl) {
    console.error("[auth] Register elements missing");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("[auth] submit caught ✅");

    if (msg) msg.textContent = "Registrierung läuft…";

    const email = (emailEl.value || "").trim().toLowerCase();
    const password = (passEl.value || "").trim();

    console.log("[auth] signup payload", { email, pwLen: password.length });

    if (!email || password.length < 6) {
      if (msg) msg.textContent = "Bitte gültige E-Mail + Passwort (mind. 6 Zeichen) eingeben.";
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/login.html",
      },
    });

    console.log("[auth] signup response", { data, error });

    if (error) {
      if (msg) msg.textContent = "Fehler: " + error.message;
      return;
    }

    if (msg) msg.textContent = "✅ Account angelegt. Bitte E-Mail bestätigen (Spam prüfen).";
  });

  console.log("[auth] wireRegister() listener attached ✅");
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("[auth] DOMContentLoaded ✅");

  let supabase;
  try {
    console.log("[auth] init getSupabase()…");
    supabase = await getSupabase();
    console.log("[auth] supabase ready ✅", supabase);
  } catch (e) {
    console.error("[auth] Supabase init failed ❌", e);
    const msg = byId("register-msg") || byId("login-msg");
    if (msg) msg.textContent = "Supabase init failed: " + (e?.message || e);
    return;
  }

  wireRegister(supabase);
});

