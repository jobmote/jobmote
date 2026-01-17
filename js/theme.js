// Theme (Hell/Dunkel)
(function () {
  window.JM = window.JM || {};

  window.JM.initTheme = function initTheme() {
    const JM = window.JM;
    const body = document.body;

    const key = (JM.KEYS && JM.KEYS.THEME) ? JM.KEYS.THEME : "jm_theme";
    const saved = localStorage.getItem(key);
    const isLight = saved === "light";

    // Klasse setzen
    body.classList.toggle("light-mode", isLight);

    // Switch finden (nicht zwingend über JM.$, weil JM.$ evtl. noch nicht ready ist)
    const themeSwitch = document.querySelector("#theme-switch");
    if (!themeSwitch) return;

    // Switch-Status setzen
    themeSwitch.checked = isLight;

    // Listener nur einmal pro neuem Switch
    if (themeSwitch.dataset.bound) return;
    themeSwitch.dataset.bound = "1";

    themeSwitch.addEventListener("change", () => {
      const makeLight = themeSwitch.checked;
      body.classList.toggle("light-mode", makeLight);
      localStorage.setItem(key, makeLight ? "light" : "dark");
    });
  };
})();

