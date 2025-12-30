console.log("🔥 auth-supabase.js LOADED");
import { getSupabase } from "/js/supabase.js";
console.log("🔥 auth-supabase.js AFTER IMPORT");

function byId(id) {
  return document.getElementById(id);
}

function pickInput(form, selectors) {
  for (const sel of selectors) {
    const el = form.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function wireRegister(supabase) {
  console.log("[auth] wireRegister() start");

  const form = byId("register-form");
  if (!form) {
    console.log("[auth] register form NOT found");
    return;
  }

  const msg = byId("register-msg");

  const emailEl = pickInput(form, [
    "#reg-email",
    "#register-email",
    'input[type="email"]',
  ]);

  const passEl = pickInput(form, [
    "#reg-password",
    "#register-password",
    'input[type="password"]',
  ]);

  if (!emailEl || !passEl) {
    console.log("[auth] register elements missing", { emailEl, passEl });
    if (msg) msg.textContent = "Formular-IDs fehlen (E-Mail/Passwort).";
    return;
  }

  console.log("[auth] register elements OK", {
    email: emailEl.id || "(no id)",
    password: passEl.id || "(no id)",
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("[auth] register submit caught ✅");

    if (msg) msg.textContent = "Registrierung läuft…";

    const email = (emailEl.value || "").trim().toLowerCase();
    const password = (passEl.value || "").trim();

    if (!email || password.length < 6) {
      if (msg) msg.textContent = "Bitte gültige E-Mail + Passwort (mind. 6 Zeichen) eingeben.";
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // nach Klick in Bestätigungs-Mail landet er hier:
        emailRedirectTo: window.location.origin + "/login/",
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

function wireLogin(supabase) {
  console.log("[auth] wireLogin() start");

  const form = byId("login-form");
  if (!form) {
    console.log("[auth] login form NOT found");
    return;
  }

  const msg = byId("login-msg");

  const emailEl = pickInput(form, [
    "#login-email",
    'input[type="email"]',
  ]);

  const passEl = pickInput(form, [
    "#login-password",
    'input[type="password"]',
  ]);

  if (!emailEl || !passEl) {
    console.log("[auth] login elements missing", { emailEl, passEl });
    if (msg) msg.textContent = "Formular-IDs fehlen (E-Mail/Passwort).";
    return;
  }

  console.log("[auth] login elements OK", {
    email: emailEl.id || "(no id)",
    password: passEl.id || "(no id)",
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("[auth] login submit caught ✅");

    if (msg) msg.textContent = "Anmeldung läuft…";

    const email = (emailEl.value || "").trim().toLowerCase();
    const password = (passEl.value || "").trim();

    if (!email || !password) {
      if (msg) msg.textContent = "Bitte E-Mail + Passwort eingeben.";
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log("[auth] signin response", { data, error });

    if (error) {
      if (msg) msg.textContent = "Fehler: " + error.message;
      return;
    }

    if (msg) msg.textContent = "✅ Eingeloggt. Weiterleitung…";

    // Ziel nach Login (änderbar)
    window.location.href = "/";
  });

  console.log("[auth] wireLogin() listener attached ✅");
}

function wireLogout(supabase) {
  const btn = byId("logout-btn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    console.log("[auth] logout clicked");
    await supabase.auth.signOut();
    window.location.href = "/login/";
  });
}

document.addEventListener("DOMContentLoaded", async () => {
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

  // Session-Debug
  const { data: sess } = await supabase.auth.getSession();
  console.log("[auth] session on load", sess?.session);

  // Seiten-spezifisch verdrahten
  if (byId("register-form")) wireRegister(supabase);
  if (byId("login-form")) wireLogin(supabase);
  wireLogout(supabase);
});


