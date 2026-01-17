// jobmote.de – Core (Helpers + Utilities)

(function () {
  window.JM = window.JM || {};
  const JM = window.JM;

  // --------------------------
  // DEFAULT LOGO (Data URI)
  // --------------------------
  // Wird genutzt, wenn kein Bild/Logo gesetzt ist (Demo ohne Backend).
  // SVG ist leichtgewichtig und funktioniert offline.
  // Hinweis: Wir lassen das SVG bewusst schlicht (Branding: Weiß/Blau/Schwarz).
  JM.DEFAULT_LOGO =
    "data:image/svg+xml," +
    encodeURIComponent(
      `<?xml version="1.0" encoding="UTF-8"?>
      <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#00ffd5" stop-opacity="0.85"/>
            <stop offset="1" stop-color="#7a5cff" stop-opacity="0.85"/>
          </linearGradient>
        </defs>
        <rect width="256" height="256" rx="128" fill="#0b0f14"/>
        <circle cx="128" cy="128" r="110" fill="url(#g)" opacity="0.30"/>
        <circle cx="128" cy="128" r="92" fill="#0b0f14" opacity="0.85"/>
        <text x="128" y="142" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="72" font-weight="800" text-anchor="middle" fill="#ffffff">JM</text>
      </svg>`
    );

  // --------------------------
  // STORAGE KEYS (nur UI/Client)
  // --------------------------
  // Accounts & Sessions laufen über Supabase Auth.
  JM.KEYS = {
    THEME: "jm_theme"
  };

  // --------------------------
  // HELPERS
  // --------------------------
  JM.$ = (sel, root = document) => root.querySelector(sel);
  JM.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  JM.getQueryParam = (name) => new URLSearchParams(window.location.search).get(name) || "";

  JM.escapeRegExp = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  JM.readJson = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  };

  JM.writeJson = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  JM.formatEuro = (n) => {
    const num = Number(n);
    if (!isFinite(num)) return "–";
    return `${num.toFixed(2).replace(".", ",")} €`;
  };

  JM.formatDate = (iso) => {
    if (!iso) return "–";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "–";
    // de-DE: dd.mm.yyyy
    return d.toLocaleDateString("de-DE");
  };

  JM.regionLabel = (r) => {
    if (r === "DE") return "Nur DE";
    if (r === "EU") return "EU-weit";
    if (r === "GLOBAL") return "Weltweit";
    return r || "–";
  };

  JM.langLabel = (l) => {
    if (l === "DE") return "Deutsch";
    if (l === "EN") return "Englisch";
    return l || "–";
  };

  // global state holder
  JM.state = JM.state || {
    modalJobId: null
  };
})();
