// Side Menu + Header Buttons
(function () {
  function renderMenuLink(text, href, opts = {}) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.className = "menu-link";
    a.href = href;
    a.textContent = text;
    if (opts.id) a.id = opts.id;
    li.appendChild(a);
    return li;
  }

  function renderMenuSep() {
    const li = document.createElement("li");
    const div = document.createElement("div");
    div.className = "menu-sep";
    li.appendChild(div);
    return li;
  }

  function renderThemeSwitchItem() {
    const li = document.createElement("li");
    li.className = "menu-item-switch";
    li.innerHTML = `
      <div class="menu-switch-row">
        <span class="menu-switch-text">Hellmodus</span>
        <label class="switch" aria-label="Hellmodus umschalten">
          <input type="checkbox" id="theme-switch" />
          <span class="slider"></span>
        </label>
      </div>
    `;
    return li;
  }

  // initMenu wird IMMER definiert (auch wenn core.js mal minimal später kommt)
  window.JM = window.JM || {};
  window.JM.initMenu = async function initMenu() {
    const JM = window.JM;

    // core.js muss JM.$ und JM.$$ liefern
    if (!JM || typeof JM.$ !== "function" || typeof JM.$$ !== "function") return;

    const menuToggle = JM.$("#menu-toggle");
    const sideMenu = JM.$("#side-menu");
    const overlay = JM.$("#menu-overlay");
    const menuClose = JM.$("#menu-close");
    const list = JM.$("#menu-list");

    // Wenn Grund-DOM fehlt -> abbrechen (aber KEIN globaler init-guard!)
    if (!menuToggle || !sideMenu || !overlay || !menuClose || !list) return;

    function openMenu() {
      sideMenu.classList.add("active");
      overlay.classList.add("active");
      menuToggle.setAttribute("aria-expanded", "true");
    }

    function closeMenu() {
      sideMenu.classList.remove("active");
      overlay.classList.remove("active");
      menuToggle.setAttribute("aria-expanded", "false");
    }

    // ✅ Events nur einmal binden
    if (!window.__JM_MENU_BOUND__) {
      window.__JM_MENU_BOUND__ = true;

      menuToggle.addEventListener("click", () => {
        const isOpen = sideMenu.classList.contains("active");
        if (isOpen) closeMenu();
        else openMenu();
      });

      menuClose.addEventListener("click", closeMenu);
      overlay.addEventListener("click", closeMenu);

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeMenu();
      });

      JM.$("#account-btn")?.addEventListener("click", async () => {
        if (JM.authReady) {
          try { await JM.authReady; } catch {}
        }
        const u = JM.getCurrentUser?.();
        window.location.href = u ? "favorites.html" : "login.html";
      });
    }

    // ✅ Menü-Inhalt jedes Mal neu bauen (verhindert doppelte Links)
    list.innerHTML = "";
    list.appendChild(renderThemeSwitchItem());

    list.appendChild(renderMenuLink("Startseite", "index.html"));
    list.appendChild(renderMenuLink("Suche", "search.html"));
    list.appendChild(renderMenuSep());

    // Auth abwarten (nur für dynamische Links)
    if (JM.authReady) {
      try { await JM.authReady; } catch {}
    }

    const user = JM.getCurrentUser?.();

    if (user) {
      list.appendChild(renderMenuLink("Gespeicherte Jobs", "favorites.html"));

      if (JM.isEntrepreneur?.()) {
        list.appendChild(renderMenuLink("Meine Inserate", "my-posted-jobs.html"));
        list.appendChild(renderMenuLink("Job einstellen", "post-job.html"));
      }

      if (JM.isAdmin?.()) {
        list.appendChild(renderMenuLink("Admin", "admin/index.html"));
      }

      list.appendChild(renderMenuLink("Logout", "#", { id: "logout-link" }));
      list.appendChild(renderMenuSep());

      list.appendChild(renderMenuLink("Hilfe / FAQ", "faq.html"));
      list.appendChild(renderMenuLink("Über uns", "ueberuns.html"));
      list.appendChild(renderMenuLink("Datenschutzerklärung", "datenschutz.html"));
      list.appendChild(renderMenuLink("AGB", "agb.html"));
      list.appendChild(renderMenuLink("Impressum", "impressum.html"));
    } else {
      list.appendChild(renderMenuLink("Anmelden", "login.html"));
      list.appendChild(renderMenuLink("Registrieren", "register.html"));
      list.appendChild(renderMenuSep());
      list.appendChild(renderMenuLink("Hilfe / FAQ", "faq.html"));
      list.appendChild(renderMenuLink("Über uns", "ueberuns.html"));
      list.appendChild(renderMenuLink("AGB", "agb.html"));
      list.appendChild(renderMenuLink("Impressum", "impressum.html"));
    }

    // Klick auf Link schließt Menü
    JM.$$(".menu-link", list).forEach((a) =>
      a.addEventListener("click", () => closeMenu())
    );

    // Logout handler (nur wenn vorhanden)
    JM.$("#logout-link")?.addEventListener("click", async (e) => {
      e.preventDefault();
      try { await JM.signOut?.(); } catch {}
      window.location.href = "index.html";
    });
  };
})();

// Auto-init (retry-sicher)
document.addEventListener("DOMContentLoaded", () => {
  const tryInit = () => {
    const JM = window.JM;
    if (!JM || typeof JM.initMenu !== "function") return setTimeout(tryInit, 50);
    try { JM.initMenu(); } catch (e) { console.error(e); }
  };
  tryInit();
});
