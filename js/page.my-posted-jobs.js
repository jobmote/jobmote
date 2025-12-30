// My Posted Jobs Page (Entrepreneur/Admin): eigene Inserate bearbeiten/löschen
(function () {
  const JM = window.JM;

  async function requireEntrepreneur() {
    if (JM.authReady) {
      try { await JM.authReady; } catch {}
    }
    const u = JM.getCurrentUser?.();
    if (!u) {
      window.location.href = "/login/";
      return null;
    }
    if (!(JM.isEntrepreneur?.() || JM.isAdmin?.())) {
      window.location.href = "favorites.html";
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
        <a class="btn btn-ghost" href="post-job.html?edit=${encodeURIComponent(job.id)}" style="color: green; border: 1px solid green;">Bearbeiten</a>
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

    try { await JM.ensureRemoteJobsLoaded?.(); } catch {}
    const jobs = JM.getMyPostedJobs();
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
    const u = await requireEntrepreneur();
    if (!u) return;
    await JM.refreshRemoteJobs?.().catch(() => {});
    render();
  };
})();
