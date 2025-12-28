import { getSupabase } from "/js/supabase.js";

function $(id) {
  return document.getElementById(id);
}

document.addEventListener("DOMContentLoaded", async () => {
  if (document.body.dataset.page !== "register") return;

  const form = $("register-form");
  const emailInput = $("reg-email");
  const passwordInput = $("reg-password");
  const msg = $("register-msg");

  if (!form || !emailInput || !passwordInput) {
    console.error("❌ Register-Form Elemente nicht gefunden");
    return;
  }

  const supabase = await getSupabase();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "Registrierung läuft…";

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!email || password.length < 6) {
      msg.textContent = "Bitte gültige E-Mail und Passwort (min. 6 Zeichen)";
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
      console.error(error);
      msg.textContent = "Fehler: " + error.message;
      return;
    }

    msg.innerHTML = `
      ✅ Account angelegt.<br>
      Bitte bestätige deine E-Mail (auch Spam).
    `;
  });
});

