/**
 * Early theme boot — must run before paint (external file for CSP script-src 'self').
 */
(function () {
  try {
    var theme = localStorage.getItem('biz1demo_theme') || localStorage.getItem('mineralbar_theme');
    if (theme !== 'dark' && theme !== 'light') {
      theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ? 'dark'
        : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
