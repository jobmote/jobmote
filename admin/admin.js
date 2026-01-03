import { supabase } from "./supabaseClient.js";

// erzwinge: JM benutzt exakt denselben Client wie admin.js
window.JM = window.JM || {};
window.JM.supabase = supabase;

console.log("ADMIN MODULE LOADED");

const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
console.log("SESSION:", sessionData, sessionErr);

if (!sessionData?.session) {
  alert("Keine Session gefunden. Du bist für Supabase gerade ANON.");
  throw new Error("No session");
}

// Admin – Users & Jobs (Supabase)
(function () {
  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function fmtDate(iso) {
    if (!iso) return "–";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "–";
    return d.toLocaleString("de-DE");
  }

  async function requireAdmin() {
  // Warte bis window.JM existiert und die Helpers da sind
  for (let i = 0; i < 100; i++) { // ~5s max
    if (window.JM && window.JM.authReady && window.JM.isAdmin && window.JM.supabase) break;
    await new Promise(r => setTimeout(r, 50));
  }

  if (!window.JM || !window.JM.authReady) {
  console.error("Admin: JM not ready");
  $("admin-msg").textContent = "Auth lädt noch… bitte neu laden (Strg+F5).";
  return false;
}

  try { await window.JM.authReady; } catch {}

  if (!window.JM.isAdmin?.()) {
    window.location.replace("/index.html");
    return false;
  }

  return true;
}
  async function fetchProfiles() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,role,banned_until,banned_permanent,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function fetchJobs() {
    const { data, error } = await supabase
      .from("jobs")
      .select("id, company, title, created_at, owner_id")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function setRole(userId, role) {
    const { error } = await window.JM.supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId);
    if (error) throw error;
  }

  async function banUser(userId, { untilIso = null, permanent = false } = {}) {
    const { error } = await window.JM.supabase
      .from("profiles")
      .update({ banned_until: untilIso, banned_permanent: !!permanent })
      .eq("id", userId);
    if (error) throw error;
  }

  async function deleteJob(jobId) {
    const { error } = await window.JM.supabase.from("jobs").delete().eq("id", jobId);
    if (error) throw error;
  }

  function renderUsers(users) {
    if (!users.length) return "<div class='muted'>Keine Nutzer gefunden.</div>";

    const rows = users.map(u => {
      const role = String(u.role || "user").toLowerCase();
      const banned = (u.banned_permanent === true) || (u.banned_until && Date.parse(u.banned_until) > Date.now());
      return `
        <tr>
          <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.10);"><code>${esc(u.id)}</code></td>
          <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.10);">${esc(u.email || "–")}</td>
          <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.10);">
            <select data-role-id="${esc(u.id)}" class="input" style="min-width:150px;">
              <option value="user" ${role === "user" ? "selected" : ""}>user</option>
              <option value="company" ${role === "company" ? "selected" : ""}>company</option>
              <option value="admin" ${role === "admin" ? "selected" : ""}>admin</option>
            </select>
          </td>
          <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.10);">${banned ? "🚫" : "✅"}</td>
          <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.10);">${fmtDate(u.banned_until)}</td>
          <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.10);">
            <button class="btn btn-ghost small" data-ban7="${esc(u.id)}">7 Tage sperren</button>
            <button class="btn btn-ghost small" data-banforever="${esc(u.id)}">Dauerhaft sperren</button>
            <button class="btn btn-ghost small" data-unban="${esc(u.id)}">Entsperren</button>
          </td>
        </tr>
      `;
    }).join("");

    return `
      <div style="overflow:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px;border-bottom:1px solid rgba(255,255,255,0.12);">ID</th>
              <th style="text-align:left;padding:8px;border-bottom:1px solid rgba(255,255,255,0.12);">E-Mail</th>
              <th style="text-align:left;padding:8px;border-bottom:1px solid rgba(255,255,255,0.12);">Rolle</th>
              <th style="text-align:left;padding:8px;border-bottom:1px solid rgba(255,255,255,0.12);">Status</th>
              <th style="text-align:left;padding:8px;border-bottom:1px solid rgba(255,255,255,0.12);">Gesperrt bis</th>
              <th style="text-align:left;padding:8px;border-bottom:1px solid rgba(255,255,255,0.12);">Aktionen</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function renderJobs(jobs) {
    if (!jobs.length) return "<div class='muted'>Keine Jobs in der Datenbank.</div>";
    const rows = jobs.map(j => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.10);"><code>${esc(j.id)}</code></td>
        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.10);">${esc(j.company || "–")}</td>
        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.10);">${esc(j.title || "–")}</td>
        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.10);">${fmtDate(j.created_at)}</td>
        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.10);"><code>${esc(j.owner_id || "–")}</code></td>
        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.10);">
          <button class="btn btn-ghost small" data-del-job="${esc(j.id)}">🗑 Löschen</button>
        </td>
      </tr>
    `).join("");
    return `
      <div style="overflow:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px;border-bottom:1px solid rgba(255,255,255,0.12);">ID</th>
              <th style="text-align:left;padding:8px;border-bottom:1px solid rgba(255,255,255,0.12);">Firma</th>
              <th style="text-align:left;padding:8px;border-bottom:1px solid rgba(255,255,255,0.12);">Titel</th>
              <th style="text-align:left;padding:8px;border-bottom:1px solid rgba(255,255,255,0.12);">Erstellt</th>
              <th style="text-align:left;padding:8px;border-bottom:1px solid rgba(255,255,255,0.12);">Owner</th>
              <th style="text-align:left;padding:8px;border-bottom:1px solid rgba(255,255,255,0.12);">Aktion</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  async function refresh() {
    $("admin-msg").textContent = "Lade Daten…";
    try {
      const [users, jobs] = await Promise.all([fetchProfiles(), fetchJobs()]);
      $("users-table").innerHTML = renderUsers(users);
      $("jobs-table").innerHTML = renderJobs(jobs);
      $("admin-msg").textContent = "";

      // role changes
      document.querySelectorAll("[data-role-id]").forEach(sel => {
        sel.addEventListener("change", async () => {
          const id = sel.getAttribute("data-role-id");
          const role = sel.value;
          if (!id) return;
          if (!confirm(`Rolle wirklich auf '${role}' setzen?`)) {
            await refresh();
            return;
          }
          try {
            await setRole(id, role);
            await refresh();
          } catch (e) {
            alert("Fehler: " + (e?.message || String(e)));
            await refresh();
          }
        });
      });

      // ban/unban
      document.querySelectorAll("[data-ban7]").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-ban7");
          if (!id) return;
          const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          if (!confirm("Diesen Nutzer 7 Tage sperren?")) return;
          try { await banUser(id, { untilIso: until, permanent: false }); await refresh(); } catch (e) { alert("Fehler: " + (e?.message || String(e))); }
        });
      });
      document.querySelectorAll("[data-banforever]").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-banforever");
          if (!id) return;
          if (!confirm("Diesen Nutzer dauerhaft sperren?")) return;
          try { await banUser(id, { untilIso: null, permanent: true }); await refresh(); } catch (e) { alert("Fehler: " + (e?.message || String(e))); }
        });
      });
      document.querySelectorAll("[data-unban]").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-unban");
          if (!id) return;
          if (!confirm("Diesen Nutzer entsperren?")) return;
          try { await banUser(id, { untilIso: null, permanent: false }); await refresh(); } catch (e) { alert("Fehler: " + (e?.message || String(e))); }
        });
      });

      // delete jobs
      document.querySelectorAll("[data-del-job]").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-del-job");
          if (!id) return;
          if (!confirm(`Job wirklich löschen?\n\nID: ${id}`)) return;
          try { await deleteJob(id); await refresh(); } catch (e) { alert("Fehler: " + (e?.message || String(e))); }
        });
      });
    } catch (e) {
      $("admin-msg").textContent = "Fehler: " + (e?.message || String(e));
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (!(await requireAdmin())) return;
    $("btn-refresh")?.addEventListener("click", refresh);
    $("back-btn")?.addEventListener("click", () => history.back());
    await refresh();
  });
})();
