/**
 * Theme — default light mode
 */
const Theme = (() => {
  const KEY = 'cp_theme';

  function get() {
    return localStorage.getItem(KEY) || 'light';
  }

  function apply(theme) {
    const t = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(KEY, t);
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      btn.innerHTML = t === 'dark' ? '☀️' : '🌙';
      btn.title = t === 'dark' ? 'Light mode' : 'Dark mode';
    });
  }

  function toggle() {
    apply(get() === 'dark' ? 'light' : 'dark');
  }

  function init() {
    apply(get());
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-theme-toggle]');
      if (btn) toggle();
    });
  }

  return { get, apply, toggle, init };
})();

window.Theme = Theme;
