/**
 * Early theme + direction boot — runs before paint (external file for CSP script-src 'self').
 */
(function () {
  var root = document.documentElement;
  try {
    var theme = localStorage.getItem("biz1_fin_theme");
    if (theme !== "dark" && theme !== "light") {
      theme = (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
    }
    root.setAttribute("data-theme", theme);
    var lang = localStorage.getItem("biz1_fin_lang") === "he" ? "he" : "en";
    root.setAttribute("lang", lang);
    root.setAttribute("dir", lang === "he" ? "rtl" : "ltr");
  } catch (e) {
    root.setAttribute("data-theme", "light");
  }
})();
