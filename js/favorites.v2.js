// Favoriten (Guest + eingeloggter User) – robust (crasht nie, auch wenn Auth noch nicht bereit ist)
(function () {
  window.JM = window.JM || {};
  const JM = window.JM;

  // Fallback: niemals crashen, wenn Auth nicht da ist
  if (typeof JM.getCurrentUser !== "function") {
    JM.getCurrentUser = () => null;
  }

  const GUEST_KEY = "jm_favs_guest";

  function getUserKey() {
    try {
      const u = JM.getCurrentUser();
      // bevorzugt User-ID (stabiler als Email)
      if (u && u.id) return `jm_favs_${u.id}`;
      if (u && u.email) return `jm_favs_${u.email}`;
    } catch (_) {}
    return GUEST_KEY;
  }

  JM.favKey = () => getUserKey();

  JM.getFavs = () => {
    if (typeof JM.readJson !== "function") return [];
    return JM.readJson(getUserKey(), []);
  };

  JM.setFavs = (ids) => {
    if (typeof JM.writeJson !== "function") return;
    JM.writeJson(getUserKey(), Array.isArray(ids) ? ids : []);
  };

  JM.isFav = (jobId) => JM.getFavs().includes(jobId);

  JM.toggleFav = (jobId) => {
    const ids = new Set(JM.getFavs());
    if (ids.has(jobId)) ids.delete(jobId);
    else ids.add(jobId);
    JM.setFavs([...ids]);
    return ids.has(jobId);
  };

  // Optional: Wenn User einloggt, migriere Guest-Favs zum User-Key
  async function migrateGuestFavsToUser() {
    if (typeof JM.readJson !== "function" || typeof JM.writeJson !== "function") return;

    const guestFavs = JM.readJson(GUEST_KEY, []);
    if (!Array.isArray(guestFavs) || guestFavs.length === 0) return;

    // Wenn es authReady gibt, warte darauf (aber ohne Crash, wenn es fehlt)
    try {
      if (JM.authReady && typeof JM.authReady.then === "function") {
        await JM.authReady;
      }
    } catch (_) {
      return;
    }

    const userKey = getUserKey();
    if (userKey === GUEST_KEY) return;

    const userFavs = JM.readJson(userKey, []);
    const merged = [...new Set([...(Array.isArray(userFavs) ? userFavs : []), ...guestFavs])];

    JM.writeJson(userKey, merged);
    JM.writeJson(GUEST_KEY, []); // Guest-Favs leeren
  }

  migrateGuestFavsToUser();
})();
