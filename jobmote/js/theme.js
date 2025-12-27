// Theme (Hell/Dunkel)
(function () {
  const JM = window.JM;
  JM.initTheme = function initTheme() {
    const body = document.body;
    const themeSwitch = JM.$("#theme-switch");

    const saved = localStorage.getItem(JM.KEYS.THEME);
    const isLight = saved === "light";
    if (isLight) body.classList.add("light-mode");

    if (themeSwitch) {
      themeSwitch.checked = isLight;
      themeSwitch.addEventListener("change", () => {
        const makeLight = themeSwitch.checked;
        body.classList.toggle("light-mode", makeLight);
        localStorage.setItem(JM.KEYS.THEME, makeLight ? "light" : "dark");
      });
    }
  };
})();
