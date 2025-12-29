// App Bootstrap
(function () {
  const JM = window.JM;

 document.addEventListener("DOMContentLoaded", async () => {

  // 🔥 UI IMMER SOFORT
  JM.initMenu?.();
  JM.initTheme?.();
  JM.initModal?.();

  // ⏳ Backend / Daten dürfen warten
  if (JM.authReady) {
    try { await JM.authReady; } catch {}
  }

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
  if (page === "my-post
