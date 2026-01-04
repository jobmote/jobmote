// Job Modal (Open/Close + Save from Modal)
(function () {
  const JM = window.JM;

  JM.initModal = function initModal() {
    const backdrop = JM.$("#job-modal-backdrop");
    const closeBtn = JM.$("#job-modal-close");
    const saveBtn = JM.$("#job-modal-save");

    if (!backdrop) return;

    // Safety: beim Laden immer zu
    backdrop.hidden = true;
    backdrop.setAttribute("aria-hidden", "true");
    JM.state.modalJobId = null;

    function close() {
      backdrop.hidden = true;
      backdrop.setAttribute("aria-hidden", "true");
      JM.state.modalJobId = null;
    }

    closeBtn?.addEventListener("click", close);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !backdrop.hidden) close();
    });

    saveBtn?.addEventListener("click", () => {
      const jobId = JM.state.modalJobId;
      if (!jobId) return;

      const now = JM.toggleFav(jobId);
      saveBtn.textContent = now ? "★ Gespeichert" : "★ Job speichern";
      JM.refreshFavPageIfNeeded?.();

      const star = document.querySelector(`.card[data-job-id="${jobId}"] .card-star`);
      if (star) {
        star.classList.toggle("active", now);
        const tip = star.querySelector(".tooltip");
        if (tip) tip.textContent = now ? "Gespeichert" : "Job speichern";
      }
    });
  };

  JM.openJobModal = function openJobModal(job) {
    const backdrop = JM.$("#job-modal-backdrop");
    if (!backdrop) return;

    JM.state.modalJobId = job.id;

    JM.$("#job-modal-badge").textContent = JM.badgeFor(job);
    JM.$("#job-modal-title").textContent = job.title || "–";
    JM.$("#job-modal-company").textContent = job.company || "–";
    JM.$("#job-modal-pay").textContent = JM.formatEuro(job.pay);
    JM.$("#job-modal-hours").textContent = `${job.hoursPerWeek ?? "–"} Std/Woche`;
    JM.$("#job-modal-lang").textContent = JM.langLabel(job.language);
    JM.$("#job-modal-region").textContent = JM.regionLabel(job.region);

    // 🔽 NEU: Immer vollständige Beschreibung anzeigen
    const descEl = JM.$("#job-modal-desc");
    if (descEl) {
      const fullText =
        job.description ||
        document.querySelector(`.card[data-job-id="${job.id}"]`)?.dataset.fullDescription ||
        "";

      // Mehrzeilige Texte sauber darstellen
      descEl.innerText = fullText;
    }

    const req = JM.$("#job-modal-req");
    if (req) {
      req.innerHTML = "";
      (job.requirements || []).forEach(r => {
        const li = document.createElement("li");
        li.textContent = r;
        req.appendChild(li);
      });
    }

    const saveBtn = JM.$("#job-modal-save");
    if (saveBtn) {
      saveBtn.textContent = JM.isFav(job.id) ? "★ Gespeichert" : "★ Job speichern";
    }

    const link = JM.$("#job-modal-link");
    if (link) {
      link.href = job.link || "#";
      link.textContent =
        job.link && job.link !== "#" ? "Zum Anbieter" : "Zum Anbieter (Demo)";
    }

    backdrop.hidden = false;
    backdrop.setAttribute("aria-hidden", "false");
  };
})();

