import { getSupabase } from "/js/supabase.js";

const supabase = await getSupabase();

function $(sel) { return document.querySelector(sel); }

async function ensureLoggedOutIfUnconfirmed(user) {
  if (!user?.email_confirmed_at) {
    await supabase.auth.signOut();
    return true;
  }
  return false;
}

async function resendSignup(email) {
  const { error } = await supabase.auth.resend({ type: "signup", email });
  return error;
}

/**
 * Register page
 */
async function wireRegister() {
  const form = $("#register-form");
  if (!form) return;

  const msg = $("#register-msg");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (msg) msg.textContent = "Registrierung läuft…";

    const email = ($("#reg-email")?.value || "").trim().toLowerCase();
    const password = ($("#reg-password")?.value || "").trim();

    if (!email || password.length < 6) {
      if (msg) msg.textContent = "Bitte gültige E-Mail + Passwort (mind. 6 Zeichen) eingeben.";
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/login.html"
      }
    });

    if (error) {
      if (msg) msg.textContent = "Fehler: " + error.message;
      return;
    }

    // Supabase can return a session if email confirmation is disabled.
    if (data?.user?.email_confirmed_at) {
      if (msg) msg.textContent = "✅ Account erstellt. Weiterleitung…";
      window.location.href = "/index.html";
      return;
    }

    // Default: confirmation required
    if (msg) {
      msg.innerHTML = `
✅ Account angelegt. Bitte bestätige deine E-Mail (auch Spam).<br/>
<button id="resend-confirm" type="button">Bestätigung erneut senden</button>
      `;
      const btn = document.getElementById("resend-confirm");
      if (btn) btn.onclick = async () => {
        btn.disabled = true;
        const err = await resendSignup(email);
        alert(err ? err.message : "Mail erneut gesendet.");
        btn.disabled = false;
      };
    }
  });
}

/**
 * Login page
 */
async function wireLogin() {
  const form = $("#login-form");
  if (!form) return;

  const msg = $("#login-msg");

  // If the user arrives here via the confirmation link, Supabase may already
  // have created a session from URL params (detectSessionInUrl=true).
  // In that case, we can immediately forward them to the app.
  try {
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;
    if (user) {
      if (await ensureLoggedOutIfUnconfirmed(user)) {
        if (msg) msg.textContent = "Bitte erst E-Mail bestätigen.";
      } else {
        if (msg) msg.textContent = "✅ Bestätigt & eingeloggt. Weiterleitung…";
        window.location.href = "/index.html";
        return;
      }
    }
  } catch {}

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (msg) msg.textContent = "Login läuft…";

    const email = ($("#login-email")?.value || "").trim().toLowerCase();
    const password = ($("#login-password")?.value || "").trim();

    if (!email || !password) {
      if (msg) msg.textContent = "Bitte E-Mail + Passwort eingeben.";
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (msg) msg.textContent = "Fehler: " + error.message;
      return;
    }

    // Require email confirmation
    if (await ensureLoggedOutIfUnconfirmed(data?.user)) {
      if (msg) {
        msg.innerHTML = `
Bitte erst E-Mail bestätigen.<br/>
<button id="resend-confirm" type="button">Bestätigung erneut senden</button>
        `;
        const btn = document.getElementById("resend-confirm");
        if (btn) btn.onclick = async () => {
          btn.disabled = true;
          const err = await resendSignup(email);
          alert(err ? err.message : "Mail erneut gesendet.");
          btn.disabled = false;
        };
      }
      return;
    }

    if (msg) msg.textContent = "✅ Eingeloggt. Weiterleitung…";
    window.location.href = "/index.html";
  });
}

/**
 * Small helper: show current email on pages that have #profile-email
 */
async function wireProfileEmail() {
  const el = document.getElementById("profile-email");
  if (!el) return;

  const { data } = await supabase.auth.getSession();
  const user = data?.session?.user;
  el.textContent = user?.email || "Nicht eingeloggt";
}

document.addEventListener("DOMContentLoaded", async () => {
  await wireRegister();
  await wireLogin();
  await wireProfileEmail();
});
import { getSupabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.dataset.page;
  if (page !== "register") return;

  const form = document.getElementById("register-form");
  const emailInput = document.getElementById("register-email");
  const passwordInput = document.getElementById("register-password");
  const msg = document.getElementById("register-msg");

  if (!form || !emailInput || !passwordInput) {
    console.error("Register form elements not found");
    return;
  }

  const supabase = await getSupabase();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    msg.textContent = "Registrierung läuft…";

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error(error);
      msg.textContent = error.message;
      return;
    }

    msg.textContent =
      "Registrierung erfolgreich. Bitte bestätige deine E-Mail.";
  });
});
