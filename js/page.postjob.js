// page.postjob.js — Company-only Post Job (Supabase) + Logo Upload + Live Preview + Edit Mode
(function () {
  const JM = window.JM;
  if (!JM) {
    console.error("JM missing. core.js not loaded?");
    return;
  }

  const MAX_LOGO_BYTES = 300 * 1024; // 300 KB
  const MAX_DESC_LENGTH = 2000;

  // ---------------------------
  // Helpers
  // ---------------------------
  function $(sel) {
    return JM.$ ? JM.$(sel) : document.querySelector(sel);
  }

  function setMsg(el, text, ok) {
    if (!el) return;
    el.textContent = text || "";
    if (ok === true) el.style.color = "rgba(0,255,200,0.95)";
    else if (ok === false) el.style.color = "rgba(255,120,120,0.95)";
    else el.style.color = "";
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
      reader.readAsDataURL(file);
    });
  }

  async function getSupabase() {
    // wichtig: absoluter Pfad (sonst je nach Route falsch)
    const mod = await import("/js/supabase.js");
    return mod.supabase;
  }

  async function getSessionUserId(supabase) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data?.session?.user?.id || null;
  }

  async function getMyRole(supabase, uid) {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", uid)
      .single();
    if (error) throw error;
    return String(data?.role || "").toLowerCase();
  }

  function isCompanyOrAdmin(role) {
    return role === "company" || role === "admin";
  }

  // ---------------------------
  // Job model (form <-> payload)
  // ---------------------------
  function buildBaseJob(logoDataUrl) {
    const description = ($("#pj-desc")?.value || "").trim();

    return {
      company: ($("#pj-employer")?.value || "").trim(),
      title: ($("#pj-title")?.value || "").trim(),
      pay: Number((($("#pj-pay")?.value || "").trim())),
      hoursPerWeek: Number((($("#pj-hours")?.value || "").trim())),
      category: $("#pj-category")?.value || "Support",
      language: $("#pj-language")?.value || "DE",
      region: $("#pj-region")?.value || "DE",
      link: ($("#pj-link")?.value || "").trim() || "#",
      description,
      requirements: ($("#pj-req")?.value || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      imageUrl: logoDataUrl || JM.DEFAULT_LOGO,
      featured: false,
    };
  }

  function validateJob(job) {
    if (!job.title || !job.company || !job.description) {
      return "Bitte alle Pflichtfelder ausfüllen.";
    }
    if (!Number.isFinite(job.pay) || job.pay <= 0) {
      return "Bitte einen gültigen Stundenlohn eingeben.";
    }
    if (!Number.isFinite(job.hoursPerWeek) || job.hoursPerWeek < 0) {
      return "Bitte gültige Stunden/Woche eingeben.";
    }
    if (job.description.length > MAX_DESC_LENGTH) {
      return `Die Jobbeschreibung darf maximal ${MAX_DESC_LENGTH} Zeichen lang sein.`;
    }
    return "";
  }

  function payloadSnakeCase(uid, job) {
    return {
      owner_id: uid,
      company: job.company,
      title: job.title,
      pay: job.pay,
      hours_per_week: job.hoursPerWeek,
      category: job.category,
      language: job.language,
      region: job.region,
      link: job.link,
      description: job.description,
      requirements: job.requirements,
      image_url: job.imageUrl,
      featured: job.featured,
    };
  }

  function payloadCamelCase(uid, job) {
    return {
      owner_id: uid,
      company: job.company,
      title: job.title,
      pay: job.pay,
      hoursPerWeek: job.hoursPerWeek,
      category: job.category,
      language: job.language,
      region: job.region,
      link: job.link,
      description: job.description,
      requirements: job.requirements,
      imageUrl: job.imageUrl,
      featured: job.featured,
    };
  }

  // ---------------------------
  // REST Insert (harter Debug / zuverlässiger)
  // ---------------------------
  async function insertJobViaRest(supabase, uid, baseJob) {
    const supabaseUrl = supabase?.supabaseUrl;
    const supabaseKey = supabase?.supabaseKey;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase client missing supabaseUrl/supabaseKey");
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const token = data?.session?.access_token;
    if (!token) throw new Error("No access token (not logged in)");

    const payload = payloadSnakeCase(uid, baseJob);

    const r = await fetch(`${supabaseUrl}/rest/v1/jobs?select=id`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    });

    const text = await r.text();

    if (!r.ok) {
      let m = text;
      try {
        const j = JSON.parse(text);
        m = j.message || j.error || JSON.stringify(j);
      } catch {}
      throw new Error(`REST ${r.status}: ${m}`);
    }

    const rows = JSON.parse(text);
    const created = rows?.[0];
    if (!created?.id) throw new Error("Insert ok, but no id returned");
    return created;
  }

  // ---------------------------
  // Fallback (supabase-js) Insert/Update
  // ---------------------------
  async function insertJobWithFallback(supabase, uid, job) {
    let r1 = await supabase
      .from("jobs")
      .insert(payloadSnakeCase(uid, job))
      .select("id")
      .single();

    if (!r1.error) return r1.data;

    const msg = String(r1.error.message || "");

    if (
      msg.includes('column "hours_per_week"') ||
      msg.includes('column "image_url"') ||
      msg.includes("hours_per_week") ||
      msg.includes("image_url")
    ) {
      const r2 = await supabase
        .from("jobs")
        .insert(payloadCamelCase(uid, job))
        .select("id")
        .single();
      if (r2.error) throw r2.error;
      return r2.data;
    }

    if (msg.toLowerCase().includes("requirements")) {
      const fb = payloadSnakeCase(uid, job);
      fb.requirements = job.requirements.join(", ");
      const r3 = await supabase.from("jobs").insert(fb).select("id").single();
      if (r3.error) throw r3.error;
      return r3.data;
    }

    throw r1.error;
  }

  async function updateJobWithFallback(supabase, uid, editId, job, isAdmin) {
    const eqOwner = !isAdmin;

    let q1 = supabase.from("jobs").update(payloadSnakeCase(uid, job)).eq("id", editId);
    if (eqOwner) q1 = q1.eq("owner_id", uid);

    const r1 = await q1.select("id").single();
    if (!r1.error) return r1.data;

    const msg = String(r1.error.message || "");

    if (
      msg.includes('column "hours_per_week"') ||
      msg.includes('column "image_url"') ||
      msg.includes("hours_per_week") ||
      msg.includes("image_url")
    ) {
      let q2 = supabase.from("jobs").update(payloadCamelCase(uid, job)).eq("id", editId);
      if (eqOwner) q2 = q2.eq("owner_id", uid);

      const r2 = await q2.select("id").single();
      if (r2.error) throw r2.error;
      return r2.data;
    }

    if (msg.toLowerCase().includes("requirements")) {
      const fb = payloadSnakeCase(uid, job);
      fb.requirements = job.requirements.join(", ");
      let q3 = supabase.from("jobs").update(fb).eq("id", editId);
      if (eqOwner) q3 = q3.eq("owner_id", uid);

      const r3 = await q3.select("id").single();
      if (r3.error) throw r3.error;
      return r3.data;
    }

    throw r1.error;
  }

  async function loadJobForEdit(supabase, uid, editId, isAdmin) {
    let q = supabase.from("jobs").select("*").eq("id", editId).limit(1);
    if (!isAdmin) q = q.eq("owner_id", uid);
    const { data, error } = await q.single();
    if (error) throw error;
    return data;
  }

  function fillFormFromJob(job, setLogoDataUrl) {
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

    $("#pj-employer").value = company;
    $("#pj-title").value = title;
    $("#pj-pay").value = pay;
    $("#pj-hours").value = hours;
    $("#pj-category").value = category;
    $("#pj-language").value = language;
    $("#pj-region").value = region;
    $("#pj-link").value = link;
    $("#pj-desc").value = desc;

    if (Array.isArray(req)) $("#pj-req").value = req.join(", ");
    else if (typeof req === "string") $("#pj-req").value = req;
    else $("#pj-req").value = "";

    const imageUrl = job.image_url ?? job.imageUrl ?? "";
    if (imageUrl && imageUrl !== JM.DEFAULT_LOGO) {
      setLogoDataUrl(imageUrl);
      const prev = $("#pj-logo-preview");
      if (prev) prev.src = imageUrl;
    }
  }

  // ---------------------------
  // Live Preview
  // ---------------------------
  function draftJobFromForm(logoDataUrl) {
    const company = ($("#pj-employer")?.value || "").trim() || "Beispiel GmbH";
    const title = ($("#pj-title")?.value || "").trim() || "Jobtitel (Vorschau)";
    const pay = Number((($("#pj-pay")?.value || "").trim())) || 16;
    const hoursPerWeek = Number((($("#pj-hours")?.value || "").trim())) || 8;
    const category = $("#pj-category")?.value || "Support";
    const language = $("#pj-language")?.value || "DE";
    const region = $("#pj-region")?.value || "DE";
    const link = ($("#pj-link")?.value || "").trim() || "#";

    const fullDesc = ($("#pj-desc")?.value || "").trim();
    const description =
      fullDesc.length > 90 ? fullDesc.slice(0, 90) + "..." : fullDesc || "Kurze Beschreibung (Vorschau)…";

    const requirements = ($("#pj-req")?.value || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    return {
      id: "preview",
      company,
      title,
      pay,
      hoursPerWeek,
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
    const host = $("#pj-card-preview");
    if (!host) return;
    host.innerHTML = "";
    host.appendChild(JM.renderJobCard(draftJobFromForm(logoDataUrl)));
  }

  // ---------------------------
  // Init
  // ---------------------------
  async function initPostJob() {
    console.log("✅ initPostJob läuft");

    const form = $("#post-job-form");
    const guard = $("#post-job-guard");
    const msg = $("#post-job-msg");

    if (!form && !guard) return;

    // Supabase laden
    let supabase;
    try {
      supabase = await getSupabase();
    } catch (e) {
      console.error("Supabase import failed:", e);
      setMsg(msg, "Supabase konnte nicht geladen werden (/js/supabase.js prüfen).", false);
      return;
    }

    // Session + Role
    let uid = null;
    let role = "";
    try {
      uid = await getSessionUserId(supabase);
      if (!uid) {
        if (guard) guard.hidden = false;
        if (form) form.style.display = "none";
        setMsg(msg, "Bitte anmelden.", false);
        return;
      }
      role = await getMyRole(supabase, uid);
    } catch (e) {
      console.error(e);
      setMsg(msg, "Fehler beim Prüfen des Accounts: " + (e?.message || String(e)), false);
      return;
    }

    const isAdmin = role === "admin";
    if (!isCompanyOrAdmin(role)) {
      if (guard) guard.hidden = false;
      if (form) form.style.display = "none";
      return;
    }

    // Logo
    const logoInput = $("#pj-logo");
    const logoPreview = $("#pj-logo-preview");
    const logoClearBtn = $("#pj-logo-clear");

    let logoDataUrl = "";
    if (logoPreview) logoPreview.src = JM.DEFAULT_LOGO;

    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");

    function setLogoDataUrl(v) {
      logoDataUrl = v || "";
    }

    // Live preview listeners
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
      const el = $(sel);
      if (!el) return;
      el.addEventListener("input", () => renderPreview(logoDataUrl));
      el.addEventListener("change", () => renderPreview(logoDataUrl));
    });

    // Logo handlers
    logoInput?.addEventListener("change", async () => {
      const file = logoInput.files?.[0];
      if (!file) {
        logoDataUrl = "";
        if (logoPreview) logoPreview.src = JM.DEFAULT_LOGO;
        renderPreview(logoDataUrl);
        return;
      }

      if (!file.type.startsWith("image/")) {
        setMsg(msg, "Bitte wähle eine Bilddatei aus.", false);
        logoInput.value = "";
        return;
      }

      if (file.size > MAX_LOGO_BYTES) {
        setMsg(msg, "Logo zu groß (max. 300 KB).", false);
        logoInput.value = "";
        return;
      }

      try {
        logoDataUrl = await readFileAsDataURL(file);
        if (logoPreview) logoPreview.src = logoDataUrl;
        setMsg(msg, "", null);
        renderPreview(logoDataUrl);
      } catch {
        setMsg(msg, "Logo konnte nicht geladen werden.", false);
      }
    });

    logoClearBtn?.addEventListener("click", () => {
      logoDataUrl = "";
      if (logoInput) logoInput.value = "";
      if (logoPreview) logoPreview.src = JM.DEFAULT_LOGO;
      renderPreview(logoDataUrl);
    });

    // Edit mode
    if (editId) {
      try {
        setMsg(msg, "Lade Job…", null);
        const job = await loadJobForEdit(supabase, uid, editId, isAdmin);
        fillFormFromJob(job, setLogoDataUrl);
        setMsg(msg, "", null);
      } catch (e) {
        console.error(e);
        setMsg(msg, "Edit-Job konnte nicht geladen werden: " + (e?.message || String(e)), false);
      }
    }

    renderPreview(logoDataUrl);

    // Submit
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const baseJob = buildBaseJob(logoDataUrl);
      const err = validateJob(baseJob);
      if (err) {
        setMsg(msg, err, false);
        return;
      }

      try {
        setMsg(msg, editId ? "Speichere Änderungen…" : "Veröffentliche Job…", null);

        if (editId) {
          // Update weiter per supabase-js (ok)
          const updated = await updateJobWithFallback(supabase, uid, editId, baseJob, isAdmin);
          setMsg(msg, "✅ Gespeichert (ID: " + updated.id + ")", true);
        } else {
          // INSERT: per REST (liefert immer Status/Fehler)
          const created = await insertJobViaRest(supabase, uid, baseJob);
          setMsg(msg, "✅ Veröffentlicht (ID: " + created.id + ")", true);
        }

        setTimeout(() => (window.location.href = "/my-posted-jobs.html"), 700);
      } catch (e2) {
        console.error(e2);
        setMsg(msg, "Fehler: " + (e2?.message || String(e2)), false);
      }
    });
  }

  // expose (optional)
  JM.initPostJob = initPostJob;

  // Auto-init (wichtig!)
  (async () => {
    try {
      if (document.readyState === "loading") {
        await new Promise((r) => document.addEventListener("DOMContentLoaded", r, { once: true }));
      }
      await initPostJob();
    } catch (e) {
      console.error("initPostJob failed:", e);
    }
  })();
})();
