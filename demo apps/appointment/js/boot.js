/**
 * Early boot — runs in <head> before paint.
 * Prevents login flash and restores the correct page when already logged in.
 * Supports SSO / embed login via ?token=… (validated later with User.Basic).
 */
(function () {
  var THEME_KEY = "clinicpulse_theme";
  var TOKEN_KEY = "clinicpulse_token";
  var PENDING_TOKEN_KEY = "clinicpulse_pending_token";
  var PAGE_KEY = "clinicpulse_page";

  var theme = localStorage.getItem(THEME_KEY) || "light";
  document.documentElement.setAttribute("data-theme", theme);

  var lang = localStorage.getItem("clinicpulse_lang") || "en";
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "he" ? "rtl" : "ltr";

  function normalizeToken(raw) {
    return String(raw || "")
      .trim()
      .replace(/^\s*Bearer\s+/i, "");
  }

  function readUrlToken() {
    try {
      var params = new URLSearchParams(location.search || "");
      var value = normalizeToken(params.get("token") || "");
      // Ignore empty or unresolved template placeholders
      if (!value || /\{\{\s*token\s*\}\}/i.test(value)) return "";
      return value;
    } catch (_) {
      return "";
    }
  }

  function clearUrlToken() {
    try {
      var url = new URL(location.href);
      if (!url.searchParams.has("token")) return;
      url.searchParams.delete("token");
      var next = url.pathname + url.search + url.hash;
      history.replaceState({}, "", next);
    } catch (_) { /* ignore */ }
  }

  // Stash URL token for validation via User.Basic — do not trust it yet
  var urlToken = readUrlToken();
  if (urlToken) {
    try {
      sessionStorage.setItem(PENDING_TOKEN_KEY, urlToken);
    } catch (_) { /* ignore */ }
    clearUrlToken();
  }

  var pendingToken = "";
  try {
    pendingToken = sessionStorage.getItem(PENDING_TOKEN_KEY) || "";
  } catch (_) {
    pendingToken = "";
  }

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

  // URL token must be validated first — stay on login page
  if (pendingToken) {
    if (page !== "login") {
      location.replace("index.html");
    }
    return;
  }

  if (page === "login" && token) {
    var last = localStorage.getItem(PAGE_KEY) || "coupons.html";
    if (!/\.html$/.test(last)) last = pages[last] || "coupons.html";
    location.replace(last.replace(/^\//, ""));
    return;
  }

  if (page !== "login" && !token) {
    location.replace("index.html");
  }
})();
