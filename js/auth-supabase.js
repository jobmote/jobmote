// js/auth-supabase.js
import { getSupabase } from "/js/supabase.js";

function $(sel) {
  return document.querySelector(sel);
}
function byId(id) {
  return document.getElementById(id);
}

async function ensureLoggedOutIfUnconfirmed(supabase, user) {
  if (!user?.email_confirmed_at) {
    await supabase.auth.signOut();
    return true;
  }
  return false;
}

async function resendSignup(supabase, email) {
  const { error } = await supabase.auth.resend({ type: "signup", email });
  return error;
}

/**
 * Register page
 * expects:
 *  - form#register-form
 *  - input#reg-email
 *  - input#reg-password
 *  - p#register-msg
 */
function wireRegister(supabase) {
  const form = byId("register-form");
  if (!form) return;

  const msg = byId("register-msg");
  const emailEl = byId("reg-email");
  const passEl = byId("reg-password");

  if (!emailEl || !passEl) {
    console.error("Register elements missing:", { emailEl: !!emailEl, passEl: !!passEl });
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

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
        // User klickt Confirm-Link -> landet hier
        emailRedirectTo: window.location.origin + "/login.html",
      },
    });

    if (error) {
      console.error("[signup error]", error);
      if (msg) msg.textContent = "Fehler: " + error.message;
      return;
    }

    // Falls Email-Confirmation in Supabase ausgeschaltet wäre, könnte user direkt confirmed sein
    if (data?.user?.email_confirmed_at) {
      if (msg) msg.textContent = "✅ Account erstellt. Weiterleitung…";
      window.location.href = "/index.html";
      return;
    }

    // Normalfall: Confirmation required
    if (msg) {
      msg.innerHTML = `
✅ Account angelegt. Bitte bestätige deine E-Mail (auch Spam).<br/>
<button id="resend-confirm" type="button" style="margin-top:8px;">Bestätigung erneut senden</button>
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
 * expects:
 *  - form#login-form
 *  - input#login-email
 *  - input#login-password
 *  - p#login-msg
 */
async function wireLogin(supabase) {
  const form = byId("login-form");
  if (!form) return;

  const msg = byId("login-msg");
  const emailEl = byId("login-email");
  const passEl = byId("login-password");

  if (!emailEl || !passEl) {
    console.error("Login elements missing:", { emailEl: !!emailEl, passEl: !!passEl });
    return;
  }

  // Wenn User von Bestätigungslink kommt, kann Supabase Session aus URL erzeugen (detectSessionInUrl=true)
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
  } catch (e) {
    // ignore
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (msg) msg.textContent = "Login läuft…";

    const email = (emailEl.value || "").trim().toLowerCase();
    const password = (passEl.value || "").trim();

    if (!email || !password) {
      if (msg) msg.textContent = "Bitte E-Mail + Passwort eingeben.";
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error("[login error]", error);
      if (msg) msg.textContent = "Fehler: " + error.message;
      return;
    }

    // Require email confirmation
    if (await ensureLoggedOutIfUnconfirmed(supabase, data?.user)) {
      if (msg) {
        msg.innerHTML = `
Bitte erst E-Mail bestätigen.<br/>
<button id="resend-confirm" type="button" style="margin-top:8px;">Bestätigung erneut senden</button>
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
 * Optional: show current email on pages that have #profile-email
 */
async function wireProfileEmail(supabase) {
  const el = byId("profile-email");
  if (!el) return;

  const { data } = await supabase.auth.getSession();
  el.textContent = data?.session?.user?.email || "Nicht eingeloggt";
}

document.addEventListener("DOMContentLoaded", async () => {
  // WICHTIG: nur 1 Supabase-Client, nur 1 Init
  const supabase = await getSupabase();

  // Diese Funktionen sind "safe": wenn Elemente nicht existieren, machen sie nichts.
  wireRegister(supabase);
  await wireLogin(supabase);
  await wireProfileEmail(supabase);
});
