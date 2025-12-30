// ==============================
// auth-supabase.js
// ==============================

console.log("🔥 auth-supabase.js LOADED");

import { getSupabase } from "/js/supabase.js";

console.log("🔥 auth-supabase.js AFTER IMPORT");

function byId(id) {
  return document.getElementById(id);
}

// ==============================
// REGISTER
// ==============================
function wireRegister(supabase) {
  console.log("[auth] wireRegister() start");

  const form = byId("register-form");
  if (!form) {
    console.log("[auth] register form NOT found");
    return;
  }

  const msg = byId("register-msg");

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
    email: emailEl.id,
    password: passEl.id,
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("[auth] register submit caught ✅");

    if (msg) msg.textContent = "Registrierung läuft…";

    const email = emailEl.value.trim().toLowerCase();
    const password = passEl.value.trim();

    if (!email || password.length < 6) {
      if (msg) msg.textContent = "Bitte gültige E-Mail + Passwort (mind. 6 Zeichen).";
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/login/",
      },
    });

    console.log("[auth] signup response", { data, error });

    if (error) {
      if (msg) msg.textContent = "Fehler: " + error.message;
      return;
    }

    if (msg)
      msg.textContent =
        "✅ Account angelegt. Bitte E-Mail bestätigen (Spam prüfen).";
  });

  console.log("[auth] wireRegister() listener attached ✅");
}

// ==============================
// LOGIN
// ==============================
function wireLogin(supabase) {
  console.log("[auth] wireLogin() start");

  const form = byId("login-form");
  if (!form) {
    console.log("[auth] login form NOT found");
    return;
  }

  const msg = byId("login-msg");

  const emailEl =
    form.querySelector("#login-email") ||
    form.querySelector('input[type="email"]');

  const passEl =
    form.querySelector("#login-password") ||
    form.querySelector('input[type="password"]');

  if (!emailEl || !passEl) {
    console.log("[auth] login elements missing", { emailEl, passEl });
    if (msg) msg.textContent = "Formular-IDs fehlen.";
    return;
  }

  console.log("[auth] login elements OK", {
    email: emailEl.id,
    password: passEl.id,
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("[auth] login submit caught ✅");

    if (msg) msg.textContent = "Anmeldung läuft…";

    const email = emailEl.value.trim().toLowerCase();
    const password = passEl.value.trim();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log("[auth] login response", { data, error });

    if (error) {
      if (msg) msg.textContent = "Login fehlgeschlagen: " + error.message;
      return;
    }

    if (msg) msg.textContent = "✅ Login erfolgreich. Weiterleitung…";

    // Zielseite nach Login
    setTimeout(() => {
      window.location.href = "/";
    }, 600);
  });

  console.log("[auth] wireLogin() listener attached ✅");
}

// ==============================
// BOOTSTRAP
// ==============================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[auth] start ✅");

  let supabase;
  try {
    console.log("[auth] init getSupabase()…");
    supabase = await getSupabase();
    console.log("[auth] supabase ready ✅", supabase);
  } catch (e) {
    console.error("[auth] Supabase init failed ❌", e);
    return;
  }

  if (byId("register-form")) wireRegister(supabase);
  if (byId("login-form")) wireLogin(supabase);
});


