// page.postjob.js — Company-only Post Job (Supabase) + Logo Upload + Live Preview + Edit Mode
(function () {
  const JM = window.JM;
  if (!JM) {
    console.error("JM missing. core.js not loaded?");
    return;
  }

  const MAX_LOGO_BYTES = 300 * 1024; // 300 KB
  const MAX_DESC_LENGTH = 2000;

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
    // absoluter Pfad!
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

  function buildBaseJob(logoDataUrl) {
    const description = ($("#pj-desc")?.value || "").trim();

    return {
      company: ($("#pj-company")?.value || "").trim(),
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
    if (!job.title || !job.company || !job.description) return "Bitte alle Pflichtfelder ausfüllen.";
    if (!Number.isFinite(job.pay) || job.pay <= 0) return "Bitte einen gültigen Stundenlohn eingeben.";
    if (!Number.isFinite(job.hoursPerWeek) || job.hoursPerWeek < 0) return "Bitte gültige Stunden/Woche eingeben.";
    if (job.description.length > MAX_DESC_LENGTH) return `Die Jobbeschreibung darf maximal ${MAX_DESC_LENGTH} Zeichen lang sein.`;
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

  async function insertJobWithFallback(supabase, uid, job) {
    const r1 = await supabase.from("jobs").insert(payloadSnakeCase(uid, job)).select("id").single();
    if (r1.error) throw r1.error;
    return r1.data;
  }

  async function updateJobWithFallback(supabase, uid, editId, job, isAdmin) {
    let q = supabase.from("jobs").update(payloadSnakeCase(uid, job)).eq("id", editId);
    if (!isAdmin) q = q.eq("owner_id", uid);
    const r = await q.select("id").single();
    if (r.error) throw r.error;
    return r.data;
  }

  async function loadJobForEdit(supabase, uid, editId, isAdmin) {
    let q = supabase.from("jobs").select("*").eq("id", editId).limit(1);
    if (!isAdmin) q = q.eq("owner_id", uid);
    const { data, error } = await q.single();
    if (error) throw error;
    return data;
  }

  function fillFormFromJob(job, setLogoDataUrl) {
    $("#pj-company").value = job.company ?? "";
    $("#pj-title").value = job.title ?? "";
    $("#pj-pay").value = job.pay ?? "";
    $("#pj-hours").value = job.hours_per_week ?? job.hoursPerWeek ?? "";
    $("#pj-category").value = job.category ?? "Support";
    $("#pj-language").value = job.language ?? "DE";
    $("#pj-region").value = job.region ?? "DE";
    $("#pj-link").value = job.link ?? "";
    $("#pj-desc").value = job.description ?? "";

    const req = job.requirements ?? [];
    $("#pj-req").value = Array.isArray(req) ? req.join(", ") : (typeof req === "string" ? req : "");

    const imageUrl = job.image_url ?? job.imageUrl ?? "";
    if (imageUrl && imageUrl !== JM.DEFAULT_LOGO) {
      setLogoDataUrl(imageUrl);
      const prev = $("#pj-logo-preview");
      if (prev) prev.src = imageUrl;
    }
  }

  function draftJobFromForm(logoDataUrl) {
    const company = ($("#pj-company")?.value || "").trim() || "Beispiel GmbH";
    const title = ($("#pj-title")?.value || "").trim() || "Jobtitel (Vorschau)";
    const pay = Number((($("#pj-pay")?.value || "").trim())) || 16;
    const hoursPerWeek = Number((($("#pj-hours")?.value || "").trim())) || 8;

    const fullDesc = ($("#pj-desc")?.value || "").trim();
    const description = fullDesc.length > 90 ? fullDesc.slice(0, 90) + "..." : (fullDesc || "Kurze Beschreibung (Vorschau)…");

    const requirements = ($("#pj-req")?.value || "")
      .split(",").map((x) => x.trim()).filter(Boolean);

    return {
      id: "preview",
      company,
      title,
      pay,
      hoursPerWeek,
      category: $("#pj-category")?.value || "Support",
      language: $("#pj-language")?.value || "DE",
      region: $("#pj-region")?.value || "DE",
      link: ($("#pj-link")?.value || "").trim() || "#",
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

  async function initPostJob() {
  // Nur auf /post-job/ laufen lassen
  const p = window.location.pathname.replace(/\/+$/, "");
  if (p !== "/post-job") return;

  console.log("✅ initPostJob läuft");

  const form = $("#post-job-form");
  const guard = $("#post-job-guard");
  const msg = $("#post-job-msg");

  if (!form && !guard) return;

    console.log("✅ initPostJob läuft");

    let supabase;
    try {
      supabase = await getSupabase();
    } catch (e) {
      console.error("Supabase import failed:", e);
      setMsg(msg, "Supabase konnte nicht geladen werden (/js/supabase.js prüfen).", false);
      return;
    }

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

    const logoInput = $("#pj-logo");
    const logoPreview = $("#pj-logo-preview");
    const logoClearBtn = $("#pj-logo-clear");

    let logoDataUrl = "";
    if (logoPreview) logoPreview.src = JM.DEFAULT_LOGO;

    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");

    function setLogoDataUrl(v) { logoDataUrl = v || ""; }

    [
      "#pj-title","#pj-company","#pj-pay","#pj-hours","#pj-category",
      "#pj-language","#pj-region","#pj-link","#pj-desc","#pj-req",
    ].forEach((sel) => {
      const el = $(sel);
      if (!el) return;
      el.addEventListener("input", () => renderPreview(logoDataUrl));
      el.addEventListener("change", () => renderPreview(logoDataUrl));
    });

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

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const baseJob = buildBaseJob(logoDataUrl);
      const err = validateJob(baseJob);
      if (err) { setMsg(msg, err, false); return; }

      try {
        setMsg(msg, editId ? "Speichere Änderungen…" : "Veröffentliche Job…", null);

        if (editId) {
          const updated = await updateJobWithFallback(supabase, uid, editId, baseJob, isAdmin);
          setMsg(msg, "✅ Gespeichert (ID: " + updated.id + ")", true);
        } else {
          const created = await insertJobWithFallback(supabase, uid, baseJob);
          setMsg(msg, "✅ Veröffentlicht (ID: " + created.id + ")", true);
        }

        // Static hosting: we ship "my-posted-jobs" as a real HTML file.
        // The pretty URL "/my-posted-jobs" can 404 and looks like a logout.
        setTimeout(() => (window.location.href = "/my-posted-jobs.html"), 700);
      } catch (e2) {
        console.error(e2);
        setMsg(msg, "Fehler: " + (e2?.message || String(e2)), false);
      }
    });
  }

  JM.initPostJob = initPostJob;

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
