console.log("🔥 auth-supabase.js LOADED");

import { getSupabase } from "/js/supabase.js";

console.log("🔥 auth-supabase.js AFTER IMPORT");

function byId(id) {
  return document.getElementById(id);
}

function wireRegister(supabase) {
  console.log("[auth] wireRegister() start");

  const form = byId("register-form");
  if (!form) {
    console.log("[auth] register form NOT found");
    return;
  }

  const msg = byId("register-msg");

  // Inputs NUR innerhalb des Register-Formulars suchen
  const emailEl =
    form.querySelector("#reg-email") ||
    form.querySelector("#register-email") ||
    form.querySelector('input[type="email"]');

  const passEl =
    form.querySelector("#reg-password") ||
    form.querySelector("#register-password") ||
    form.querySelector('input[type="password"]');

  if (!emailEl || !passEl) {
    console.log("[auth] register elements missing", { emailEl, passEl });
    if (msg) msg.textContent = "Formular-IDs fehlen (E-Mail/Passwort).";
    return;
  }

  console.log("[auth] register elements OK", {
    email: emailEl.id || "(no-id)",
    password: passEl.id || "(no-id)",
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("[auth] submit caught ✅");

    if (msg) msg.textContent = "Registrierung läuft…";

    const email = (emailEl.value || "").trim().toLowerCase();
    const password = (passEl.value || "").trim();

    console.log("[auth] signup payload", { email, pwLen: password.length });

    if (!email || password.length < 6) {
      if (msg)
        msg.textContent =
          "Bitte gültige E-Mail + Passwort (mind. 6 Zeichen) eingeben.";
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // nach Email-Confirm geht's hierhin
        emailRedirectTo: window.location.origin + "/login",
      },
    });

    console.log("[auth] signup response", { data, error });

    if (error) {
      if (msg) msg.textContent = "Fehler: " + error.message;
      return;
    }

    if (msg)
      msg.textContent = "✅ Account angelegt. Bitte E-Mail bestätigen (Spam prüfen).";
  });

  console.log("[auth] wireRegister() listener attached ✅");
}

/**
 * Optional: wireLogin kannst du später ergänzen.
 * Wichtig: NICHT wireLogin?.(...) verwenden, wenn wireLogin nicht existiert!
 */
// function wireLogin(supabase) { ... }

(async () => {
  console.log("[auth] start ✅");

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

  // Seiten-spezifisch verdrahten
  if (byId("register-form")) wireRegister(supabase);

  // Nur aktivieren, wenn du wireLogin wirklich definierst:
  // if (typeof wireLogin === "function" && byId("login-form")) wireLogin(supabase);
})();


