/**
 * Early theme + lang boot — external file for CSP script-src 'self'.
 */
(function () {
  try {
    var t =
      localStorage.getItem('biz1ss_theme') ||
      localStorage.getItem('biz1demo_theme') ||
      localStorage.getItem('mineralbar_theme');
    if (t !== 'dark' && t !== 'light') {
      t =
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    }
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
  try {
    var l =
      localStorage.getItem('biz1ss_lang') ||
      localStorage.getItem('biz1demo_lang') ||
      localStorage.getItem('mineralbar_portal_lang');
    if (l !== 'he' && l !== 'en') l = 'en';
    document.documentElement.lang = l === 'he' ? 'he' : 'en';
    document.documentElement.dir = l === 'he' ? 'rtl' : 'ltr';
  } catch (e2) {
    /* ignore */
  }
})();
