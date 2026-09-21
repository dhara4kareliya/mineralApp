/**
 * Root index redirect — external for CSP.
 */
(function () {
  try {
    document.documentElement.setAttribute('data-theme', localStorage.getItem('cp_theme') || 'light');
    var lang = localStorage.getItem('cp_lang') === 'he' ? 'he' : 'en';
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
  } catch (e) { /* ignore */ }

  if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
    location.replace('pages/dashboard.html');
  } else {
    location.replace('pages/login.html');
  }
})();
