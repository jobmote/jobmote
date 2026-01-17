// My Posted Jobs Page (Company/Admin): eigene Inserate bearbeiten/löschen
(function () {
  const JM = window.JM;

  // ---- helpers ----
  function normalizeJob(j) {
    if (!j || typeof j !== "object") return j;
    return {
      ...j,
      // Supabase (snake_case) -> Frontend (camelCase)
      ownerId: j.ownerId ?? j.owner_id ?? j.owner ?? null,
      createdAt: j.createdAt ?? j.created_at ?? j.created ?? null,
      hoursPerWeek: j.hoursPerWeek ?? j.hours_per_week ?? null,
      imageUrl: j.imageUrl ?? j.image_url ?? null,
    };
  }

  async function getStableUser() {
    // 1) warten bis JM Auth initialisiert ist
    if (JM.authReady) {
      try { await JM.authReady; } catch {}
    }

    // 2) JM Cache
    let u = JM.getCurrentUser?.() || JM.currentUser || null;
    if (u?.id) return u;

    // 3) Fallback: Supabase Session (stabil aus localStorage)
    if (JM.supabase?.auth?.getSession) {
      try {
        const { data: { session } } = await JM.supabase.auth.getSession();
        const su = session?.user || null;

        if (su) {
          // JM arbeitet typischerweise mit einem flachen User-Objekt
          u = {
            id: su.id,
            email: su.email,
            role: su.user_metadata?.role || su.app_metadata?.role || null,
          };

          // Cache füllen, damit JM.isCompany / getMyPostedJobs etc. konsistent sind
          JM.currentUser = u;
          if (typeof JM.setCurrentUser === "function") JM.setCurrentUser(u);

          return u;
        }
      } catch (e) {
        console.warn("getSession failed:", e);
      }
    }

    return null;
  }

  async function requireCompany() {
    const u = await getStableUser();

    if (!u) {
      window.location.href = "/login/";
      return null;
    }

    // Rolle robust prüfen:
    // - Wenn JM.isCompany()/isAdmin() bereits korrekt ist: nutzen
    // - Sonst auf u.role fallbacken (weil u ist "flattened")
    const metaRole = u.role || null;
    const isCompany = (JM.isCompany?.() === true) || metaRole === "company";
    const isAdmin   = (JM.isAdmin?.() === true)   || metaRole === "admin";

    if (!(isCompany || isAdmin)) {
      window.location.href = "/favorites.html";
      return null;
    }

    return u;
  }

  function jobActions(job) {
    const wrap = document.createElement("div");
    wrap.className = "results-bar simple";
    wrap.style.margin = "10px 0 18px";

    wrap.innerHTML = `
      <div class="results-meta">
        <span class="muted small">Erstellt: ${JM.formatDate(job.createdAt)}</span>
      </div>
      <div class="results-actions">
        <a class="btn btn-ghost" href="/post-job/?edit=${encodeURIComponent(job.id)}" style="color: green; border: 1px solid green;">Bearbeiten</a>
        <button class="btn btn-ghost" data-del="1" type="button" style="color: red; border: 1px solid red;">Löschen</button>
      </div>
    `;

    const delBtn = wrap.querySelector("[data-del]");
    delBtn?.addEventListener("click", () => {
      const ok = window.confirm("Diesen Job wirklich löschen?");
      if (!ok) return;

      (async () => {
        try {
          await JM.deleteJob?.(Number(job.id));
          render();
        } catch (e) {
          alert("Fehler: " + (e?.message || String(e)));
        }
      })();
    });

    return wrap;
  }

  async function render() {
    const list = JM.$("#myj-list");
    const empty = JM.$("#myj-empty");
    const count = JM.$("#myj-count");
    if (!list) return;

    // Sicherstellen, dass remote jobs geladen sind
    try { await JM.ensureRemoteJobsLoaded?.(); } catch {}

    // Alle Jobs holen und normalisieren (damit ownerId/createdAt vorhanden sind)
    let all = JM.getRemoteJobs?.() || JM.state?.remoteJobs || [];
    all = Array.isArray(all) ? all.map(normalizeJob) : [];

    // Normalisierte Liste zurückschreiben, damit andere JM-Funktionen profitieren
    if (JM.state) JM.state.remoteJobs = all;

    // User holen
    const u = await getStableUser();
    const uid = u?.id;

    // 1) Primär: JM.getMyPostedJobs() nutzen (wenn es korrekt ist)
    // 2) Fallback: selbst filtern nach ownerId === user.id
    let jobs = [];
    try {
      const jmJobs = JM.getMyPostedJobs?.();
      if (Array.isArray(jmJobs)) jobs = jmJobs.map(normalizeJob);
    } catch {}

    if (!jobs.length && uid) {
      jobs = all.filter(j => String(j.ownerId) === String(uid));
    }

    if (count) count.textContent = String(jobs.length);
    list.innerHTML = "";

    if (!jobs.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    jobs.forEach((job) => {
      const block = document.createElement("div");
      block.appendChild(JM.renderJobCard(job));
      block.appendChild(jobActions(job));
      list.appendChild(block);
    });
  }

  JM.initMyPostedJobs = async function initMyPostedJobs() {
    const u = await requireCompany();
    if (!u) return;

    // Nach Login/Reload unbedingt neu laden
    await JM.refreshRemoteJobs?.().catch(() => {});
    await render();
  };
})();
