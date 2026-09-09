/**
 * Shared UI helpers.
 */
const AppUI = (function () {
  let flashTimer = null;

  function setUserName(name) {
    const el = document.getElementById('user-name');
    if (el) el.textContent = name || I18n.t('user');
  }

  function setLoginLoading(loading) {
    const btn = document.getElementById('login-btn');
    if (!btn) return;
    const label = btn.querySelector('.btn-label');
    const spinner = btn.querySelector('.spinner');
    btn.disabled = loading;
    label.classList.toggle('hidden', loading);
    spinner.classList.toggle('hidden', !loading);
  }

  function showLoginError(msg) {
    const el = document.getElementById('login-error');
    if (!el) return;
    if (!msg) {
      el.classList.add('hidden');
      el.textContent = '';
      return;
    }
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function showOtpStep(show, message) {
    const otpField = document.getElementById('otp-field');
    if (!otpField) return;
    otpField.classList.toggle('hidden', !show);
    const hint = document.getElementById('otp-hint');
    if (show) {
      hint.textContent = message || I18n.t('otpHint');
      document.getElementById('otp').focus();
    }
  }

  function flash(message, type) {
    const container = document.getElementById('toast-container');
    if (!container || !message) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.textContent = message;

    if (type === 'info') toast.classList.add('info');
    if (type === 'error') toast.classList.add('error');

    container.appendChild(toast);

    const dismiss = () => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    };

    clearTimeout(flashTimer);
    flashTimer = setTimeout(dismiss, 4000);
  }

  function setSocketStatus(online, payload) {
    const badge = document.getElementById('socket-badge');
    if (!badge) return;
    badge.classList.toggle('connected', !!online);
    const label = badge.querySelector('.socket-label');
    if (label) label.textContent = online ? I18n.t('socketLive') : I18n.t('socketOffline');
    if (online && payload?.events?.length) {
      badge.title = I18n.t('socketConnected', { count: payload.events.length });
    } else {
      badge.title = I18n.t('socketTitle');
    }
  }

  function pulseSocket() {
    const badge = document.getElementById('socket-badge');
    if (!badge) return;
    badge.classList.add('live-update');
    setTimeout(() => badge.classList.remove('live-update'), 600);
  }

  function applyTheme(theme) {
    const t = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(AppConfig.STORAGE_KEYS.theme, t);
  }

  function initTheme() {
    const saved = localStorage.getItem(AppConfig.STORAGE_KEYS.theme);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved || (prefersDark ? 'dark' : 'light'));
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  function bindThemeToggle(id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', toggleTheme);
  }

  function bindLangSwitch() {
    document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
      btn.addEventListener('click', () => {
        I18n.setLang(btn.getAttribute('data-lang-btn'));
      });
    });
  }

  function showBootLoader(show) {
    document.body.classList.toggle('auth-checking', show);
  }

  return {
    setUserName,
    setLoginLoading,
    showLoginError,
    showOtpStep,
    flash,
    setSocketStatus,
    pulseSocket,
    initTheme,
    toggleTheme,
    bindThemeToggle,
    bindLangSwitch,
    showBootLoader
  };
})();
