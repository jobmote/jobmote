// Rendering (Job Card + Badges)
(function () {
  const JM = window.JM;

  JM.badgeFor = (job) => {
    if (job.featured) return "🔥 Empfohlen";
    if (Number(job.pay) >= 20) return "💸 Top bezahlt";
    if (Number(job.hoursPerWeek) <= 5) return "⚡ Schnellstart";
    return "✅ Remote";
  };

  JM.renderJobCard = function renderJobCard(job, { showRemove = false } = {}) {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.jobId = job.id;

    const imgUrl = job.imageUrl || JM.DEFAULT_LOGO;

    // 🔽 NEU: Beschreibung kürzen (90 Zeichen)
    const fullDescription = job.description || "";
    const shortDescription =
      fullDescription.length > 80
        ? fullDescription.slice(0, 80) + "..."
        : fullDescription;

    // 🔽 NEU: Volltext am Card-Element speichern
    card.dataset.fullDescription = fullDescription;

    card.innerHTML = `
      <div class="card-image">
        <img src="${imgUrl}" alt="Logo/Foto" loading="lazy" />
      </div>

      <div class="card-content">
        <div class="pill">${JM.badgeFor(job)}</div>
        <p class="card-employer">${job.company || "-"}</p>
        <h3 class="card-title">${job.title || "–"}</h3>
        <p class="card-description">${shortDescription}</p>

        <div class="card-meta">
          <span class="tag"><strong>${JM.formatEuro(job.pay)}</strong> / Std</span>
          <span class="tag"><strong>${job.hoursPerWeek || "–"}</strong> Std/Woche</span>
          <span class="tag">${job.category || "–"}</span>
          <span class="tag">${JM.langLabel(job.language)}</span>
          <span class="tag">${JM.regionLabel(job.region)}</span>
        </div>
      </div>

      <div class="card-star ${JM.isFav(job.id) ? "active" : ""}" role="button" tabindex="0" aria-label="Job speichern">
        ★<span class="tooltip">${JM.isFav(job.id) ? "Gespeichert" : "Job speichern"}</span>
      </div>
    `;

    const star = JM.$(".card-star", card);

    star.addEventListener("click", (e) => {
      e.stopPropagation();
      const now = JM.toggleFav(job.id);
      star.classList.toggle("active", now);
      const tip = JM.$(".tooltip", star);
      if (tip) tip.textContent = now ? "Gespeichert" : "Job speichern";
      JM.refreshFavPageIfNeeded?.();
    });

    star.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        star.click();
      }
    });

    card.addEventListener("click", () => {
      // Check if user is logged in before opening job modal
      const currentUser = JM.getCurrentUser();
      if (!currentUser) {
        const wantsToRegister = confirm(
          "Du musst angemeldet sein, um Job-Details zu sehen.\n\nKlicke 'OK' für Registrierung oder 'Abbrechen' für Login."
        );

        if (wantsToRegister) {
          window.location.href = "register.html";
        } else {
          window.location.href = "login.html";
        }
        return;
      }

      // 🔽 Volltext wieder ins Job-Objekt setzen (für Modal)
      JM.openJobModal({
        ...job,
        description: fullDescription
      });
    });

    if (showRemove) {
      const hint = document.createElement("div");
      hint.className = "muted small";
      hint.style.marginTop = "10px";
      hint.textContent = "Tipp: ★ erneut klicken, um zu entfernen.";
      JM.$(".card-content", card)?.appendChild(hint);
    }

    return card;
  };
})();
