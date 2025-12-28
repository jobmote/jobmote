import { getSupabase } from "./supabase.js";

function $(sel) {
  return document.querySelector(sel);
}

async function resendSignup(supabase, email) {
  const { error } = await supabase.auth.resend({ type: "signup", email });
  return error;
}

async function ensureLoggedOutIfUnconfirmed(supabase, user) {
  if (!user?.email_confirmed_at) {
    await supabase.auth.signOut();
    return true;
  }
  return false;
}

/**
 * Register page
 */
async function wireRegister(supabase) {
  const form = $("#register-form");
  if (!form) return;

  const msg = $("#register-msg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (msg) msg.textContent = "Registrierung läuft…";

    // accept both possible ids (so you don't depend on route variants)
    const emailEl = $("#register-email") || $("#reg-email");
    const passEl = $("#register-password") || $("#reg-password");

    const email = (emailEl?.value || "").trim().toLowerCase();
    const password = (passEl?.value || "").trim();

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

    if (error) {
      console.error("[signup error]", error);
      if (msg) msg.textContent = "Fehler: " + error.message;
      return;
    }

    // If confirmation is disabled, Supabase may return confirmed user/session.
    if (data?.user?.email_confirmed_at) {
      if (msg) msg.textContent = "✅ Account erstellt. Weiterleitung…";
      window.location.href = "/index.html";
      return;
    }

    if (msg) {
      msg.innerHTML = `
✅ Account angelegt. Bitte bestätige deine E-Mail (auch Spam).<br/>
<button id="resend-confirm" type="button">Bestätigung erneut senden</button>
      `;
      const btn = document.getElementById("resend-confirm");
      if (btn) {
        btn.onclick = async () => {
          btn.disabled = true;
          const err = await resendSignup(supabase, email);
          alert(err ? err.message : "Mail erneut gesendet.");
          btn.disabled = false;
        };
      }
    }
  });
}

/**
 * Login page
 */
async function wireLogin(supabase) {
  const form = $("#login-form");
  if (!form) return;

  const msg = $("#login-msg");

  // If user arrives via confirmation link, session might exist already.
  try {
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;
    if (user) {
      if (await ensureLoggedOutIfUnconfirmed(supabase, user)) {
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

    if (await ensureLoggedOutIfUnconfirmed(supabase, data?.user)) {
      if (msg) {
        msg.innerHTML = `
Bitte erst E-Mail bestätigen.<br/>
<button id="resend-confirm" type="button">Bestätigung erneut senden</button>
        `;
        const btn = document.getElementById("resend-confirm");
        if (btn) {
          btn.onclick = async () => {
            btn.disabled = true;
            const err = await resendSignup(supabase, email);
            alert(err ? err.message : "Mail erneut gesendet.");
            btn.disabled = false;
          };
        }
      }
      return;
    }

    if (msg) msg.textContent = "✅ Eingeloggt. Weiterleitung…";
    window.location.href = "/index.html";
  });
}

/**
 * Show current email on pages that have #profile-email
 */
async function wireProfileEmail(supabase) {
  const el = document.getElementById("profile-email");
  if (!el) return;

  const { data } = await supabase.auth.getSession();
  const user = data?.session?.user;
  el.textContent = user?.email || "Nicht eingeloggt";
}

document.addEventListener("DOMContentLoaded", async () => {
  const supabase = await getSupabase();

  await wireRegister(supabase);
  await wireLogin(supabase);
  await wireProfileEmail(supabase);
});
