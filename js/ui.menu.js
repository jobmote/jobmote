// Side Menu + Header Buttons
(function () {
  const JM = window.JM;

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

  JM.initMenu = async function initMenu() {
    if (window.__JM_MENU_INIT__) return;
window.__JM_MENU_INIT__ = true;

const list = document.getElementById("menu-list");
if (list) list.innerHTML = "";

    const menuToggle = JM.$("#menu-toggle");
    const sideMenu = JM.$("#side-menu");
    const overlay = JM.$("#menu-overlay");
    const menuClose = JM.$("#menu-close");

    function openMenu() {
      sideMenu?.classList.add("active");
      overlay?.classList.add("active");
      menuToggle?.setAttribute("aria-expanded", "true");
    }
    function closeMenu() {
      sideMenu?.classList.remove("active");
      overlay?.classList.remove("active");
      menuToggle?.setAttribute("aria-expanded", "false");
    }

    menuToggle?.addEventListener("click", () => {
      const isOpen = sideMenu?.classList.contains("active");
      if (isOpen) closeMenu(); else openMenu();
    });
    menuClose?.addEventListener("click", closeMenu);
    overlay?.addEventListener("click", closeMenu);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });

    const list = JM.$("#menu-list");
    if (list) {
      list.innerHTML = "";
      list.appendChild(renderThemeSwitchItem());

      list.appendChild(renderMenuLink("Startseite", "index.html"));
      list.appendChild(renderMenuLink("Suche", "search.html"));
      list.appendChild(renderMenuSep());

      // Wait for Supabase session/profile to be loaded
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
        if (JM.isAdmin?.()) list.appendChild(renderMenuLink("Admin", "admin/index.html"));
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
        list.appendChild(renderMenuSep());        list.appendChild(renderMenuLink("Hilfe / FAQ", "faq.html"));
        list.appendChild(renderMenuLink("Impressum", "impressum.html"));
        list.appendChild(renderMenuLink("Über uns", "ueberuns.html"));
        list.appendChild(renderMenuLink("AGB", "agb.html"));
        list.appendChild(renderMenuLink("Impressum", "impressum.html"));
      }

      JM.$$(".menu-link", list).forEach(a => a.addEventListener("click", () => closeMenu()));

      JM.$("#logout-link")?.addEventListener("click", async (e) => {
        e.preventDefault();
        try { await JM.signOut?.(); } catch {}
        window.location.href = "index.html";
      });
    }

    JM.$("#account-btn")?.addEventListener("click", async () => {
      if (JM.authReady) {
        try { await JM.authReady; } catch {}
      }
      const u = JM.getCurrentUser?.();
      window.location.href = u ? "favorites.html" : "login.html";
    });
  };
})();
document.addEventListener("DOMContentLoaded", () => {
  try { window.JM?.initMenu?.(); } catch {}
});
