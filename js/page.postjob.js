// page.postjob.js — Company-only Post Job (Supabase) + Logo Upload + Live Preview + Edit Mode
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

  async function getSupabase() {
    // dynamic import, damit diese Datei weiterhin als "normaler" <script defer> laufen kann
    const mod = await import("./supabase.js");
    return mod.supabase;
  }

  async function getSessionUserId(supabase) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const uid = data?.session?.user?.id;
    return uid || null;
  }

  async function getMyRole(supabase, userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return String(data?.role || "").toLowerCase();
  }

  function isCompanyOrAdmin(role) {
    return role === "company" || role === "admin";
  }

  function draftJobFromForm(logoDataUrl) {
    const company = (JM.$("#pj-employer")?.value || "").trim() || "Beispiel GmbH";
    const title = (JM.$("#pj-title")?.value || "").trim() || "Jobtitel (Vorschau)";
    const pay = Number((JM.$("#pj-pay")?.value || "").trim() || 16);
    const hoursPerWeek = Number((JM.$("#pj-hours")?.value || "").trim() || 8);
    const category = JM.$("#pj-category")?.value || "Support";
    const language = JM.$("#pj-language")?.value || "DE";
    const region = JM.$("#pj-region")?.value || "DE";
    const link = (JM.$("#pj-link")?.value || "").trim() || "#";

    const fullDesc = (JM.$("#pj-desc")?.value || "").trim();
    const description =
      fullDesc.length > 90 ? fullDesc.slice(0, 90) + "..." : fullDesc || "Kurze Beschreibung (Vorschau)…";

    const requirements = (JM.$("#pj-req")?.value || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    return {
      id: "preview",
      company,
      title,
      pay: Number.isFinite(pay) ? pay : 0,
      hoursPerWeek: Number.isFinite(hoursPerWeek) ? hoursPerWeek : 0,
      category,
      language,
      region,
      link,
      description,
      requirements,
      imageUrl: logoDataUrl || JM.DEFAULT_LOGO,
      createdAt: new Date().toISOString(),
      featured: false,
    };
  }

  function renderPreview(logoDataUrl) {
    const host = JM.$("#pj-card-preview");
    if (!host) return;
    host.innerHTML = "";
    host.appendChild(JM.renderJobCard(draftJobFromForm(logoDataUrl)));
  }

  function fillFormFromJob(job, setLogoDataUrl) {
    // Unterstützt snake_case und camelCase
    const company = job.company ?? "";
    const title = job.title ?? "";
    const pay = job.pay ?? "";
    const hours = job.hours_per_week ?? job.hoursPerWeek ?? "";
    const category = job.category ?? "Support";
    const language = job.language ?? "DE";
    const region = job.region ?? "DE";
    const link = job.link ?? "";
    const desc = job.description ?? "";
    const req = job.requirements ?? [];

    JM.$("#pj-employer").value = company;
    JM.$("#pj-title").value = title;
    JM.$("#pj-pay").value = pay;
    JM.$("#pj-hours").value = hours;
    JM.$("#pj-category").value = category;
    JM.$("#pj-language").value = language;
    JM.$("#pj-region").value = region;
    JM.$("#pj-link").value = link;
    JM.$("#pj-desc").value = desc;

    if (Array.isArray(req)) {
      JM.$("#pj-req").value = req.join(", ");
    } else if (typeof req === "string") {
      JM.$("#pj-req").value = req;
    } else {
      JM.$("#pj-req").value = "";
    }

    const imageUrl = job.image_url ?? job.imageUrl ?? "";
    if (imageUrl && imageUrl !== JM.DEFAULT_LOGO) {
      setLogoDataUrl(imageUrl);
      const logoPreview = JM.$("#pj-logo-preview");
      if (logoPreview) logoPreview.src = imageUrl;
    }
  }

  function buildBaseJob(logoDataUrl) {
    const description = (JM.$("#pj-desc")?.value || "").trim();

    const baseJob = {
      company: (JM.$("#pj-employer")?.value || "").trim(),
      title: (JM.$("#pj-title")?.value || "").trim(),
      pay: Number((JM.$("#pj-pay")?.value || "").trim()),
      hoursPerWeek: Number((JM.$("#pj-hours")?.value || "").trim()),
      category: JM.$("#pj-category")?.value || "Support",
      language: JM.$("#pj-language")?.value || "DE",
      region: JM.$("#pj-region")?.value || "DE",
      link: (JM.$("#pj-link")?.value || "").trim() || "#",
      description,
      requirements: (JM.$("#pj-req")?.value || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      imageUrl: logoDataUrl || JM.DEFAULT_LOGO,
      featured: false,
    };

    return baseJob;
  }

  function validateJob(baseJob) {
    if (!baseJob.title || !baseJob.company || !baseJob.description) {
      return "Bitte alle Pflichtfelder ausfüllen.";
    }
    if (!Number.isFinite(baseJob.pay) || baseJob.pay <= 0) {
      return "Bitte einen gültigen Stundenlohn eingeben.";
    }
    if (!Number.isFinite(baseJob.hoursPerWeek) || baseJob.hoursPerWeek < 0) {
      return "Bitte gültige Stunden/Woche eingeben.";
    }
    if (baseJob.description.length > MAX_DESC_LENGTH) {
      return `Die Jobbeschreibung darf maximal ${MAX_DESC_LENGTH} Zeichen lang sein.`;
    }
    return "";
  }

  function payloadSnakeCase(uid, baseJob) {
    return {
      owner_id: uid,
      company: baseJob.company,
      title: baseJob.title,
      pay: baseJob.pay,
      hours_per_week: baseJob.hoursPerWeek,
      category: baseJob.category,
      language: baseJob.language,
      region: baseJob.region,
      link: baseJob.link,
      description: baseJob.description,
      requirements: baseJob.requirements, // ideal: jsonb oder text[]
      image_url: baseJob.imageUrl,
      featured: baseJob.featured,
    };
  }

  function payloadCamelCase(uid, baseJob) {
    return {
      owner_id: uid,
      company: baseJob.company,
      title: baseJob.title,
      pay: baseJob.pay,
      hoursPerWeek: baseJob.hoursPerWeek,
      category: baseJob.category,
      language: baseJob.language,
      region: baseJob.region,
      link: baseJob.link,
      description: baseJob.description,
      requirements: baseJob.requirements,
      imageUrl: baseJob.imageUrl,
      featured: baseJob.featured,
    };
  }

  async function insertJobWithFallback(supabase, uid, baseJob) {
    // 1) snake_case versuchen
    let { error } = await supabase.from("jobs").insert(payloadSnakeCase(uid, baseJob));
    if (!error) return;

    const msg = String(error.message || "");
    // Falls Spaltennamen nicht passen → camelCase versuchen
    if (msg.includes('column "hours_per_week"') || msg.includes('column "image_url"') || msg.includes("hours_per_week") || msg.includes("image_url")) {
      const r2 = await supabase.from("jobs").insert(payloadCamelCase(uid, baseJob));
      if (r2.error) throw r2.error;
      return;
    }

    // Falls requirements Typ-Probleme macht, fallback auf String
    if (msg.toLowerCase().includes("requirements")) {
      const fallback = payloadSnakeCase(uid, baseJob);
      fallback.requirements = baseJob.requirements.join(", ");
      const r3 = await supabase.from("jobs").insert(fallback);
      if (r3.error) throw r3.error;
      return;
    }

    throw error;
  }

  async function updateJobWithFallback(supabase, uid, editId, baseJob, isAdmin) {
    // Owner-Schutz: company darf nur eigene updaten
    const eqOwner = !isAdmin;

    // 1) snake_case
    let q = supabase.from("jobs").update(payloadSnakeCase(uid, baseJob)).eq("id", editId);
    if (eqOwner) q = q.eq("owner_id", uid);
    let { error } = await q;
    if (!error) return;

    const msg = String(error.message || "");

    // 2) camelCase
    if (msg.includes('column "hours_per_week"') || msg.includes('column "image_url"') || msg.includes("hours_per_week") || msg.includes("image_url")) {
      let q2 = supabase.from("jobs").update(payloadCamelCase(uid, baseJob)).eq("id", editId);
      if (eqOwner) q2 = q2.eq("owner_id", uid);
      const r2 = await q2;
      if (r2.error) throw r2.error;
      return;
    }

    // 3) requirements fallback auf String
    if (msg.toLowerCase().includes("requirements")) {
      const fallback = payloadSnakeCase(uid, baseJob);
      fallback.requirements = baseJob.requirements.join(", ");
      let q3 = supabase.from("jobs").update(fallback).eq("id", editId);
      if (eqOwner) q3 = q3.eq("owner_id", uid);
      const r3 = await q3;
      if (r3.error) throw r3.error;
      return;
    }

    throw error;
  }

  async function loadJobForEdit(supabase, uid, editId, isAdmin) {
    let q = supabase
      .from("jobs")
      .select("*")
      .eq("id", editId)
      .limit(1);

    // company: nur eigene laden
    if (!isAdmin) q = q.eq("owner_id", uid);

    const { data, error } = await q.single();
    if (error) throw error;
    return data;
  }

  JM.initPostJob = async function initPostJob() {
    const form = JM.$("#post-job-form");
    const guard = JM.$("#post-job-guard");
    if (!form && !guard) return;

    const msg = JM.$("#post-job-msg");
    const logoInput = JM.$("#pj-logo");
    const logoPreview = JM.$("#pj-logo-preview");
    const logoClearBtn = JM.$("#pj-logo-clear");

    let supabase;
    try {
      supabase = await getSupabase();
    } catch (e) {
      console.error("Supabase import failed:", e);
      if (msg) msg.textContent = "Supabase konnte nicht geladen werden (supabase.js prüfen).";
      return;
    }

    // Session + Role Check
    let uid = null;
    let role = "";
    try {
      uid = await getSessionUserId(supabase);
      if (!uid) {
        if (guard) guard.hidden = false;
        if (form) form.style.display = "none";
        if (msg) msg.textContent = "Bitte anmelden.";
        return;
      }
      role = await getMyRole(supabase, uid);
    } catch (e) {
      console.error(e);
      if (msg) msg.textContent = "Fehler beim Prüfen des Accounts: " + (e?.message || String(e));
      return;
    }

    const isAdmin = role === "admin";
    if (!isCompanyOrAdmin(role)) {
      if (guard) guard.hidden = false;
      if (form) form.style.display = "none";
      return;
    }

    // Logo / Preview Setup
    let logoDataUrl = "";
    if (logoPreview) logoPreview.src = JM.DEFAULT_LOGO;

    function setLogoDataUrl(v) {
      logoDataUrl = v || "";
    }

    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");

    // Live Preview Listeners
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
      "#pj-req",
    ].forEach((sel) => {
      const el = JM.$(sel);
      if (!el) return;
      el.addEventListener("input", () => renderPreview(logoDataUrl));
      el.addEventListener("change", () => renderPreview(logoDataUrl));
    });

    // Logo Handling
    logoInput?.addEventListener("change", async () => {
      const file = logoInput.files?.[0];
      if (!file) {
        logoDataUrl = "";
        if (logoPreview) logoPreview.src = JM.DEFAULT_LOGO;
        renderPreview(logoDataUrl);
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
        renderPreview(logoDataUrl);
      } catch {
        if (msg) msg.textContent = "Logo konnte nicht geladen werden.";
      }
    });

    logoClearBtn?.addEventListener("click", () => {
      logoDataUrl = "";
      if (logoInput) logoInput.value = "";
      if (logoPreview) logoPreview.src = JM.DEFAULT_LOGO;
      renderPreview(logoDataUrl);
    });

    // EDIT MODE: Job aus Supabase laden
    if (editId) {
      try {
        if (msg) msg.textContent = "Lade Job…";
        const job = await loadJobForEdit(supabase, uid, editId, isAdmin);
        fillFormFromJob(job, setLogoDataUrl);
        if (msg) msg.textContent = "";
      } catch (e) {
        console.error(e);
        if (msg) msg.textContent = "Edit-Job konnte nicht geladen werden: " + (e?.message || String(e));
      }
    }

    renderPreview(logoDataUrl);

    // SUBMIT: Insert/Update in Supabase
    form?.addEventListener("submit", (e) => {
      e.preventDefault();

      const baseJob = buildBaseJob(logoDataUrl);
      const validationError = validateJob(baseJob);
      if (validationError) {
        if (msg) msg.textContent = validationError;
        return;
      }

      (async () => {
        try {
          if (msg) msg.textContent = editId ? "Speichere Änderungen…" : "Veröffentliche Job…";

          if (editId) {
            await updateJobWithFallback(supabase, uid, editId, baseJob, isAdmin);
            window.location.href = "my-posted-jobs.html";
          } else {
            await insertJobWithFallback(supabase, uid, baseJob);
            window.location.href = "my-posted-jobs.html";
          }
        } catch (e2) {
          console.error(e2);
          if (msg) msg.textContent = "Fehler: " + (e2?.message || String(e2));
        }
      })();
    });
  };
})();
