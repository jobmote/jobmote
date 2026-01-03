// Search Page
(function () {
  const JM = window.JM;

  const PAGES = [
    { title: "Startseite", url: "index.html", text: "Remote Minijobs Filter Sortierung Favoriten" },
    { title: "Meine Jobs", url: "favorites.html", text: "gespeicherte Jobs Favoriten" },
    { title: "Job einstellen", url: "/post-job/", text: "Unternehmen Job veröffentlichen" },
    { title: "Hilfe / FAQ", url: "faq.html", text: "Hilfe FAQ seriöse Jobs" },
    { title: "Datenschutzerklärung", url: "datenschutz.html", text: "Datenschutzerklärung LocalStorage Cookies Rechte DSGVO" },
    { title: "Impressum", url: "impressum.html", text: "Impressum Kontakt Haftung" }
  ];

  JM.initSearch = function initSearch() {
    const resultsBox = JM.$("#search-results");
    const metaBox = JM.$("#search-meta");
    if (!resultsBox || !metaBox) return;

    const kindSel = JM.$("#search-kind");
    const sortSel = JM.$("#search-sort");

    const qRaw = JM.getQueryParam("q");
    const q = qRaw.trim().toLowerCase();

    if (JM.$("#site-search-input") && qRaw) JM.$("#site-search-input").value = qRaw;

    function occurrences(hay, needle) {
      if (!needle) return 0;
      return hay.split(needle).length - 1;
    }
    function hl(text) {
      if (!qRaw) return String(text);
      const re = new RegExp(`(${JM.escapeRegExp(qRaw)})`, "gi");
      return String(text).replace(re, `<span class="search-highlight">$1</span>`);
    }

    function build() {
      const kind = kindSel?.value || "all";
      const sort = sortSel?.value || "relevance";

      if (!q) {
        metaBox.textContent = "Bitte gib einen Suchbegriff ein.";
        resultsBox.innerHTML = "";
        JM.$("#search-empty")?.setAttribute("hidden", "");
        return;
      }

      const hits = [];
      const jobs = JM.loadAllJobs();

      for (const job of jobs) {
        const hay = `${job.company} ${job.title} ${job.description} ${job.category} ${job.language} ${job.region} ${job.pay} ${job.hoursPerWeek}`.toLowerCase();
        if (!hay.includes(q)) continue;

        hits.push({
          kind: "job",
          score: occurrences(hay, q),
          title: `Job: ${job.title}`,
          url: `index.html?q=${encodeURIComponent(qRaw)}#${encodeURIComponent(job.id)}`,
          snippet: `${job.employer} – ${JM.formatEuro(job.pay)} / Std – ${job.category} – ${JM.regionLabel(job.region)}`,
          createdAt: job.createdAt,
          pay: Number(job.pay) || 0
        });
      }

      for (const page of PAGES) {
        const hay = `${page.title} ${page.text}`.toLowerCase();
        if (!hay.includes(q)) continue;
        hits.push({
          kind: "page",
          score: occurrences(hay, q),
          title: page.title,
          url: `${page.url}?q=${encodeURIComponent(qRaw)}`,
          snippet: "Treffer auf dieser Seite gefunden.",
          createdAt: "1970-01-01T00:00:00.000Z",
          pay: 0
        });
      }

      const filtered = hits.filter(h => kind === "all" ? true : h.kind === kind);

      if (sort === "newest") filtered.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      else if (sort === "pay") filtered.sort((a,b) => b.pay - a.pay);
      else filtered.sort((a,b) => b.score - a.score);

      metaBox.textContent = `Suchbegriff: „${qRaw}“ — ${filtered.length} Treffer`;

      if (filtered.length === 0) {
        resultsBox.innerHTML = "";
        JM.$("#search-empty")?.removeAttribute("hidden");
        return;
      }
      JM.$("#search-empty")?.setAttribute("hidden", "");

      resultsBox.innerHTML = filtered.map(h => `
        <div class="search-hit">
          <a class="search-hit-title" href="${h.url}">${hl(h.title)}</a>
          <div class="search-hit-snippet">
            ${hl(h.snippet)} <span class="muted">(${h.score}×)</span>
          </div>
        </div>
      `).join("");
    }

    kindSel?.addEventListener("change", build);
    sortSel?.addEventListener("change", build);
    build();
  };
})();
