// Startseite: Filter + Sort + Render + Infinite Scroll + Button als Backup
(function () {
  const JM = window.JM;

  JM.initHome = function initHome() {
    const list = JM.$("#job-list");
    if (!list) return;

    const jobs = JM.loadAllJobs();

    /* ===============================
       STATISTIKEN
    =============================== */
    const statCount = JM.$("#stat-count");
    const statAvg = JM.$("#stat-avg");

    if (statCount) statCount.textContent = String(jobs.length);

    if (statAvg) {
      const pays = jobs.map(j => Number(j.pay)).filter(n => isFinite(n));
      const avg = pays.length ? pays.reduce((a, b) => a + b, 0) / pays.length : 0;
      statAvg.textContent = `${avg.toFixed(2).replace(".", ",")} €`;
    }

    /* ===============================
       SUCHBEGRIFF (URL)
    =============================== */
    const qRaw = JM.getQueryParam("q").trim();
    if (JM.$("#site-search-input") && qRaw) {
      JM.$("#site-search-input").value = qRaw;
    }

    /* ===============================
       FILTER & SORT CONTROLS
    =============================== */
    const controls = {
      category: JM.$("#filter-category"),
      pay: JM.$("#filter-pay"),
      hours: JM.$("#filter-hours"),
      lang: JM.$("#filter-language"),
      region: JM.$("#filter-region"),
      sort: JM.$("#sort-by")
    };

    /* ===============================
       INFINITE SCROLL STATE
    =============================== */
    const PAGE_SIZE = 10;
    let offset = 0;
    let observer = null;
    let currentSortedJobs = [];

    /* ===============================
       RESET BUTTON
    =============================== */
    JM.$("#reset-filters")?.addEventListener("click", () => {
      Object.values(controls).forEach(el => {
        if (el && el.tagName === "SELECT") el.value = "";
      });
      if (controls.sort) controls.sort.value = "newest";
      render();
    });

    Object.values(controls).forEach(el =>
      el?.addEventListener("change", render)
    );

    /* ===============================
       FILTER HELPERS
    =============================== */
    function matchesPay(job, payFilter) {
      const p = Number(job.pay);
      if (!isFinite(p)) return false;
      if (payFilter === "10-15") return p >= 10 && p < 15;
      if (payFilter === "15-20") return p >= 15 && p < 20;
      if (payFilter === "20+") return p >= 20;
      return true;
    }

    function matchesHours(job, hoursFilter) {
      const h = Number(job.hoursPerWeek);
      if (!isFinite(h)) return false;
      if (hoursFilter === "lt5") return h < 5;
      if (hoursFilter === "5-10") return h >= 5 && h <= 10;
      if (hoursFilter === "10+") return h > 10;
      return true;
    }

    function applySearchTerm(job, term) {
      if (!term) return true;
      const hay = `${job.employer} ${job.title} ${job.description} ${job.category} ${job.language} ${job.region}`.toLowerCase();
      return hay.includes(term.toLowerCase());
    }

    function sortJobs(arr, sortBy) {
      const copy = [...arr];
      if (sortBy === "pay") {
        copy.sort((a, b) => Number(b.pay) - Number(a.pay));
      } else if (sortBy === "featured") {
        copy.sort((a, b) => (b.featured === true) - (a.featured === true));
      } else {
        copy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
      return copy;
    }

    /* ===============================
       SEARCH HIGHLIGHT
    =============================== */
    function highlightText(rootEl, query) {
      if (!rootEl || !query) return;
      const q = query.trim();
      if (!q) return;

      const regex = new RegExp(JM.escapeRegExp(q), "gi");
      const walker = document.createTreeWalker(
        rootEl,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
            const p = node.parentElement;
            if (!p) return NodeFilter.FILTER_REJECT;
            const tag = p.tagName?.toLowerCase();
            if (["script", "style", "noscript", "textarea", "input"].includes(tag)) {
              return NodeFilter.FILTER_REJECT;
            }
            if (p.closest(".search-highlight")) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);

      for (const node of nodes) {
        const text = node.nodeValue;
        if (!regex.test(text)) continue;
        regex.lastIndex = 0;

        const frag = document.createDocumentFragment();
        let last = 0;

        text.replace(regex, (match, offset) => {
          frag.appendChild(document.createTextNode(text.slice(last, offset)));
          const span = document.createElement("span");
          span.className = "search-highlight";
          span.textContent = match;
          frag.appendChild(span);
          last = offset + match.length;
          return match;
        });

        frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
      }
    }

    /* ===============================
       INFINITE SCROLL LOGIC
    =============================== */
    function loadNextJobs() {
      const next = currentSortedJobs.slice(offset, offset + PAGE_SIZE);

      next.forEach(job => {
        const card = JM.renderJobCard(job);
        list.appendChild(card);
        if (qRaw) highlightText(card, qRaw);
      });

      offset += next.length;

      if (offset >= currentSortedJobs.length && observer) {
        observer.disconnect();
      }

      // Button ausblenden, falls alles geladen
      const loadMoreBtn = JM.$("#load-more-btn");
      if (loadMoreBtn) {
        loadMoreBtn.style.display = offset >= currentSortedJobs.length ? "none" : "inline-block";
      }
    }

    function initInfiniteScroll() {
      const sentinel = JM.$("#infinite-scroll-sentinel");
      if (!sentinel) return;

      observer = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting) {
            loadNextJobs();
          }
        },
        {
          root: null,
          rootMargin: "200px",
          threshold: 0
        }
      );

      observer.observe(sentinel);
    }

    /* ===============================
       RENDER (RESET + START)
    =============================== */
    function render() {
      const term = qRaw || "";

      const filtered = jobs.filter(j => {
        if (controls.category?.value && j.category !== controls.category.value) return false;
        if (controls.lang?.value && j.language !== controls.lang.value) return false;
        if (controls.region?.value && j.region !== controls.region.value) return false;
        if (controls.pay?.value && !matchesPay(j, controls.pay.value)) return false;
        if (controls.hours?.value && !matchesHours(j, controls.hours.value)) return false;
        if (!applySearchTerm(j, term)) return false;
        return true;
      });

      currentSortedJobs = sortJobs(filtered, controls.sort?.value || "newest");

      offset = 0;
      list.innerHTML = "";

      const countEl = JM.$("#results-count");
      if (countEl) countEl.textContent = String(currentSortedJobs.length);

      const empty = JM.$("#no-results");
      if (empty) empty.hidden = currentSortedJobs.length !== 0;

      if (observer) observer.disconnect();
      initInfiniteScroll();
      loadNextJobs();
    }

    render();

    /* ===============================
       BUTTON ALS BACKUP FÜR SEO / MANUELLES LADEN
    =============================== */
    const loadMoreBtn = JM.$("#load-more-btn");
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", () => {
        loadNextJobs();
        loadMoreBtn.scrollIntoView({ behavior: "smooth" });
      });
    }

    JM.$("#coming-soon")?.addEventListener("click", () => {
      alert("Demo: E-Mail Alerts kommen später 🙂");
    });
  };

  /* ===============================
     HASH SCROLL (unverändert)
  =============================== */
  JM.scrollToJobFromHash = function scrollToJobFromHash() {
    const hash = decodeURIComponent((window.location.hash || "").replace("#", ""));
    if (!hash) return;
    const el = document.querySelector(`.card[data-job-id="${CSS.escape(hash)}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };
})();

