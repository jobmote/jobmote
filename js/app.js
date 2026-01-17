// App Bootstrap
(function () {
  const JM = window.JM;

  document.addEventListener("DOMContentLoaded", async () => {
    // UI immer sofort initialisieren
    JM.initMenu?.();
    JM.initTheme?.();
    JM.initModal?.();

    // Backend/Auth darf warten
    if (JM.authReady) {
      try { await JM.authReady; } catch {}
    }

    // Remote Jobs laden (wenn vorhanden)
    if (typeof JM.ensureRemoteJobsLoaded === "function") {
      try { await JM.ensureRemoteJobsLoaded(); } catch {}
    }

    const page = document.body?.dataset?.page || "";
    if (page === "home") JM.initHome?.();
    if (page === "favorites") JM.initFavorites?.();
    if (page === "search") JM.initSearch?.();
    if (page === "login") JM.initLogin?.();
    if (page === "register") JM.initRegister?.();
    if (page === "post-job") JM.initPostJob?.();
    if (page === "my-posted-jobs") JM.initMyPostedJobs?.();

    if (page === "home") setTimeout(JM.scrollToJobFromHash || (() => {}), 200);
  });
})();
