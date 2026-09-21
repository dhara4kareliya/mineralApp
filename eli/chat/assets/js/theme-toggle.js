/**
 * Shared theme toggle for #themeToggle buttons.
 */
(function () {
  function bind() {
    var btn = document.getElementById('themeToggle');
    if (!btn || btn.getAttribute('data-theme-bound')) return;
    btn.setAttribute('data-theme-bound', '1');
    btn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try {
        localStorage.setItem('biz1demo_theme', next);
      } catch (e) { /* ignore */ }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
