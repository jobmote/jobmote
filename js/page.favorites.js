// Favorites Page
(function () {
  const JM = window.JM;

  JM.refreshFavPageIfNeeded = function refreshFavPageIfNeeded() {
    if (document.body?.dataset?.page === "favorites") JM.initFavorites();
  };

  JM.initFavorites = function initFavorites() {
    const container = JM.$("#fav-list");
    const empty = JM.$("#fav-empty");
    const count = JM.$("#fav-count");
    if (!container) return;

    const favIds = JM.getFavs();
    const jobs = JM.loadAllJobs().filter(j => favIds.includes(j.id));

    container.innerHTML = "";
    jobs.forEach(job => container.appendChild(JM.renderJobCard(job, { showRemove: true })));

    if (count) count.textContent = String(jobs.length);
    if (empty) empty.hidden = jobs.length !== 0;

    JM.$("#clear-favs")?.addEventListener("click", () => {
      if (!confirm("Alle gespeicherten Jobs entfernen?")) return;
      JM.setFavs([]);
      JM.initFavorites();
    });
  };
  // Neu
})();
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("invite-modal");
  const closeBtn = document.getElementById("invite-close");
  const sendBtn = document.getElementById("invite-send");
  const emailInput = document.getElementById("invite-email");

  if (!modal) return;

  // Popup beim Seitenaufruf anzeigen
  modal.hidden = false;

  // Schließen (X)
  closeBtn?.addEventListener("click", () => {
    modal.hidden = true;
  });

  // Einladung senden
  sendBtn?.addEventListener("click", () => {
    const email = emailInput.value.trim();

    if (!email || !email.includes("@")) {
      alert("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }

    const subject = encodeURIComponent("Einladung zu jobmote.de");
    const body = encodeURIComponent(
      `Hey 👋

ich nutze gerade jobmote.de – eine Plattform für flexible (Remote-)Minijobs.
Schau sie dir mal an, vielleicht ist etwas für dich dabei 😊

👉 https://jobmote.de

Liebe Grüße`
    );

    // Öffnet E-Mail-Client
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;

    modal.hidden = true;
  });
});
// Neu
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("invite-modal");
  const closeBtn = document.getElementById("invite-close");
  const sendBtn = document.getElementById("invite-send");
  const emailInput = document.getElementById("invite-email");

  if (!modal) return;

  // Modal beim Seitenaufruf anzeigen
  modal.hidden = false;

  // Schließen per X
  closeBtn.addEventListener("click", () => {
    modal.hidden = true;
  });

  // Einladung senden (mailto)
  sendBtn.addEventListener("click", () => {
    const email = emailInput.value.trim();

    if (!email || !email.includes("@")) {
      alert("Bitte eine gültige E-Mail-Adresse eingeben.");
      return;
    }

    const subject = encodeURIComponent("Einladung zu jobmote.de");
    const body = encodeURIComponent(
      `Hey 👋

ich nutze jobmote.de – eine Plattform für flexible Minijobs.
Schau sie dir gerne an:

👉 https://jobmote.de

Viele Grüße`
    );

    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;

    modal.hidden = true;
  });
});


