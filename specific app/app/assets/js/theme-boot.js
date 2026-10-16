/**
 * Early theme + language boot script to avoid FOUC
 */
(function () {
  try {
    var t = localStorage.getItem('chasdei_theme');
    if (t !== 'dark' && t !== 'light') {
      t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ? 'dark'
        : 'light';
    }
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  try {
    var l = localStorage.getItem('chasdei_lang');
    if (l !== 'he' && l !== 'en') l = 'he'; // Default Hebrew for Chasdei Shlomo
    document.documentElement.lang = l;
    document.documentElement.dir = (l === 'he') ? 'rtl' : 'ltr';
  } catch (e2) {
    document.documentElement.lang = 'he';
    document.documentElement.dir = 'rtl';
  }
})();
