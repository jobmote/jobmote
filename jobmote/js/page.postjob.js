// Post Job Page (nur Company) + Logo Upload + Live Preview
(function () {
  const JM = window.JM;

  const MAX_LOGO_BYTES = 300 * 1024; // 300 KB
  const MAX_DESC_LENGTH = 2000;

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
      reader.readAsDataURL(file);
    });
  }

  JM.initPostJob = async function initPostJob() {
    const form = JM.$("#post-job-form");
    const guard = JM.$("#post-job-guard");
    if (!form && !guard) return;

    if (JM.authReady) {
      try { await JM.authReady; } catch {}
    }

    // Only company/admin can post
    if (!(JM.isCompany?.() || JM.isAdmin?.())) {
      if (guard) guard.hidden = false;
      if (form) form.style.display = "none";
      return;
    }

    const msg = JM.$("#post-job-msg");
    const logoInput = JM.$("#pj-logo");
    const logoPreview = JM.$("#pj-logo-preview");
    const logoClearBtn = JM.$("#pj-logo-clear");
    const cardPreviewHost = JM.$("#pj-card-preview");

    let logoDataUrl = "";

    // make sure we have the latest DB jobs for edit mode
    try { await JM.ensureRemoteJobsLoaded?.(); } catch {}

    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");

    if (logoPreview) {
      logoPreview.src = JM.DEFAULT_LOGO;
    }

    /* ======================
       PREVIEW JOB (gekürzt)
       ====================== */
    function draftJob() {
      const company = JM.$("#pj-employer")?.value || "").trim() || "Beispiel GmbH";
      const title = (JM.$("#pj-title")?.value || "").trim() || "Jobtitel (Vorschau)";
      const pay = Number((JM.$("#pj-pay")?.value || "").trim() || 16);
      const hoursPerWeek = Number((JM.$("#pj-hours")?.value || "").trim() || 8);
      const category = JM.$("#pj-category")?.value || "Support";
      const language = JM.$("#pj-language")?.value || "DE";
      const region = JM.$("#pj-region")?.value || "DE";
      const link = (JM.$("#pj-link")?.value || "").trim() || "#";

      const fullDesc = (JM.$("#pj-desc")?.value || "").trim();
      const description =
        fullDesc.length > 90
          ? fullDesc.slice(0, 90) + "..."
          : fullDesc || "Kurze Beschreibung (Vorschau)…";

      const requirements = (JM.$("#pj-req")?.value || "")
        .split(",")
        .map(x => x.trim())
        .filter(Boolean);

      return {
        id: "preview",
        employer,
        title,
        pay: isFinite(pay) ? pay : 0,
        hoursPerWeek: isFinite(hoursPerWeek) ? hoursPerWeek : 0,
        category,
        language,
        region,
        link,
        description,
        requirements,
        imageUrl: logoDataUrl || JM.DEFAULT_LOGO,
        createdAt: new Date().toISOString(),
        featured: false
      };
    }

    function renderPreview() {
      if (!cardPreviewHost) return;
      cardPreviewHost.innerHTML = "";
      cardPreviewHost.appendChild(JM.renderJobCard(draftJob()));
    }

    [
      "#pj-title",
      "#pj-employer",
      "#pj-pay",
      "#pj-hours",
      "#pj-category",
      "#pj-language",
      "#pj-region",
      "#pj-link",
      "#pj-desc",
      "#pj-req"
    ].forEach(sel => {
      const el = JM.$(sel);
      if (!el) return;
      el.addEventListener("input", renderPreview);
      el.addEventListener("change", renderPreview);
    });

    /* ======================
       LOGO HANDLING
       ====================== */
    logoInput?.addEventListener("change", async () => {
      const file = logoInput.files?.[0];
      if (!file) {
        logoDataUrl = "";
        if (logoPreview) logoPreview.src = JM.DEFAULT_LOGO;
        renderPreview();
        return;
      }

      if (!file.type.startsWith("image/")) {
        if (msg) msg.textContent = "Bitte wähle eine Bilddatei aus.";
        logoInput.value = "";
        return;
      }

      if (file.size > MAX_LOGO_BYTES) {
        if (msg) msg.textContent = "Logo zu groß (max. 300 KB).";
        logoInput.value = "";
        return;
      }

      try {
        logoDataUrl = await readFileAsDataURL(file);
        if (logoPreview) logoPreview.src = logoDataUrl;
        if (msg) msg.textContent = "";
        renderPreview();
      } catch {
        if (msg) msg.textContent = "Logo konnte nicht geladen werden.";
      }
    });

    logoClearBtn?.addEventListener("click", () => {
      logoDataUrl = "";
      if (logoInput) logoInput.value = "";
      if (logoPreview) logoPreview.src = JM.DEFAULT_LOGO;
      renderPreview();
    });

    /* ======================
       EDIT MODE
       ====================== */
    if (editId) {
      const mine = JM.getMyPostedJobs?.() || [];
      const existing = mine.find(j => String(j.id) === String(editId));

      if (existing) {
        JM.$("#pj-employer").value = existing.employer || "";
        JM.$("#pj-title").value = existing.title || "";
        JM.$("#pj-pay").value = existing.pay ?? "";
        JM.$("#pj-hours").value = existing.hoursPerWeek ?? "";
        JM.$("#pj-category").value = existing.category || "Support";
        JM.$("#pj-language").value = existing.language || "DE";
        JM.$("#pj-region").value = existing.region || "DE";
        JM.$("#pj-link").value = existing.link || "";
        JM.$("#pj-desc").value = existing.description || "";
        JM.$("#pj-req").value = (existing.requirements || []).join(", ");

        logoDataUrl =
          existing.imageUrl && existing.imageUrl !== JM.DEFAULT_LOGO
            ? existing.imageUrl
            : "";
        if (logoPreview) logoPreview.src = existing.imageUrl || JM.DEFAULT_LOGO;
      }
    }

    renderPreview();

    /* ======================
       SUBMIT
       ====================== */
    form?.addEventListener("submit", e => {
      e.preventDefault();

      const description = (JM.$("#pj-desc")?.value || "").trim();

      if (description.length > MAX_DESC_LENGTH) {
        if (msg)
          msg.textContent =
            `Die Jobbeschreibung darf maximal ${MAX_DESC_LENGTH} Zeichen lang sein.`;
        return;
      }

      const baseJob = {
        employer: (JM.$("#pj-employer")?.value || "").trim(),
        title: (JM.$("#pj-title")?.value || "").trim(),
        pay: Number((JM.$("#pj-pay")?.value || "").trim()),
        hoursPerWeek: Number((JM.$("#pj-hours")?.value || "").trim()),
        category: JM.$("#pj-category")?.value || "Support",
        language: JM.$("#pj-language")?.value || "DE",
        region: JM.$("#pj-region")?.value || "DE",
        link: (JM.$("#pj-link")?.value || "").trim() || "#",
        description, // 🔥 VOLLER TEXT
        requirements: (JM.$("#pj-req")?.value || "")
          .split(",")
          .map(x => x.trim())
          .filter(Boolean),
        imageUrl: logoDataUrl || JM.DEFAULT_LOGO,
        featured: false
      };

      if (!baseJob.title || !baseJob.employer || !baseJob.description) {
        if (msg) msg.textContent = "Bitte alle Pflichtfelder ausfüllen.";
        return;
      }

      (async () => {
        try {
          if (msg) msg.textContent = editId ? "Speichere Änderungen…" : "Veröffentliche Job…";

          if (editId) {
            await JM.updateJob?.(Number(editId), baseJob);
            window.location.href = "my-posted-jobs.html";
          } else {
            await JM.createJob?.(baseJob);
            window.location.href = "index.html";
          }
        } catch (e) {
          if (msg) msg.textContent = "Fehler: " + (e?.message || String(e));
        }
      })();
    });
  };
})();
