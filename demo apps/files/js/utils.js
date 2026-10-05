/**
 * Theme + small UI helpers.
 */
const Theme = (function () {
  function getPreferred() {
    const saved = localStorage.getItem(AppConfig.STORAGE_KEYS.theme);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function apply(theme) {
    const value = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', value);
    localStorage.setItem(AppConfig.STORAGE_KEYS.theme, value);
    refreshLabels();
  }

  function refreshLabels() {
    const value = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const label = typeof I18n !== 'undefined'
      ? I18n.t(value === 'dark' ? 'switchToLight' : 'switchToDark')
      : (value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-label', label);
      btn.classList.toggle('is-dark', value === 'dark');
    });
  }

  function toggle() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    apply(next);
    return next;
  }

  function init() {
    apply(getPreferred());
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', toggle);
    });
  }

  return { init, apply, toggle, getPreferred, refreshLabels };
})();

const Toast = (function () {
  let host = null;

  function ensure() {
    if (host) return host;
    host = document.createElement('div');
    host.className = 'toast-host';
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
    return host;
  }

  function show(message, type) {
    const el = document.createElement('div');
    el.className = 'toast toast--' + (type || 'info');
    el.textContent = message;
    ensure().appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-in'));
    setTimeout(() => {
      el.classList.remove('is-in');
      setTimeout(() => el.remove(), 220);
    }, 3200);
  }

  return { show };
})();

function formatDate(value) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(String(value).replace(' ', 'T') + (String(value).includes('T') || String(value).includes('Z') ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) {
    return String(value);
  }
  const locale = typeof I18n !== 'undefined' && I18n.getLang() === 'he' ? 'he-IL' : undefined;
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
