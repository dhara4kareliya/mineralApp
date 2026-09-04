/**
 * Early boot — runs in <head> before paint.
 * Prevents login flash and restores the correct page when already logged in.
 */
(function () {
  var THEME_KEY = "clinicpulse_theme";
  var TOKEN_KEY = "clinicpulse_token";
  var PAGE_KEY = "clinicpulse_page";

  var theme = localStorage.getItem(THEME_KEY) || "light";
  document.documentElement.setAttribute("data-theme", theme);

  var lang = localStorage.getItem("clinicpulse_lang") || "en";
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "he" ? "rtl" : "ltr";

  // Migrate session token → localStorage so reload keeps the session
  var token =
    localStorage.getItem(TOKEN_KEY) ||
    sessionStorage.getItem(TOKEN_KEY) ||
    null;
  if (token && !localStorage.getItem(TOKEN_KEY)) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  if (sessionStorage.getItem(TOKEN_KEY)) {
    sessionStorage.removeItem(TOKEN_KEY);
  }

  var page = document.documentElement.getAttribute("data-page") || "login";
  var pages = {
    coupons: "coupons.html",
    doctors: "doctors.html",
    patients: "patients.html",
  };

  if (page === "login" && token) {
    var last = localStorage.getItem(PAGE_KEY) || "coupons.html";
    if (!/\.html$/.test(last)) last = pages[last] || "coupons.html";
    location.replace("/" + last.replace(/^\//, ""));
    return;
  }

  if (page !== "login" && !token) {
    location.replace("/index.html");
  }
})();
