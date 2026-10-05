/**
 * Early theme/lang boot — external file for CSP script-src 'self'.
 */
(function () {
  try {
    var lang = localStorage.getItem('cp_lang') === 'he' ? 'he' : 'en';
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('data-theme', localStorage.getItem('cp_theme') || 'light');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
