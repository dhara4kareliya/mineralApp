/**
 * Floating toast notifications (bottom-right)
 */
const Toast = (() => {
  function ensureContainer() {
    let el = document.getElementById('toast-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-container';
      document.body.appendChild(el);
    }
    return el;
  }

  function show(message, { title = '', type = 'info', duration = 4200, pulse = false } = {}) {
    const container = ensureContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}${pulse ? ' toast-pulse' : ''}`;
    toast.innerHTML = `
      <div class="toast-body">
        ${title ? `<div class="toast-title">${escapeHtml(title)}</div>` : ''}
        <div class="toast-msg">${escapeHtml(message)}</div>
      </div>
      <button type="button" class="toast-close" aria-label="Close">&times;</button>
    `;
    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
    container.appendChild(toast);
    if (duration > 0) {
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        toast.style.transition = '0.25s ease';
        setTimeout(() => toast.remove(), 250);
      }, duration);
    }
    return toast;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    show,
    success: (msg, opts) =>
      show(msg, { type: 'success', title: window.I18n ? I18n.t('success') : 'Success', ...opts }),
    error: (msg, opts) =>
      show(msg, { type: 'error', title: window.I18n ? I18n.t('error') : 'Error', ...opts }),
    info: (msg, opts) =>
      show(msg, { type: 'info', title: window.I18n ? I18n.t('info') : 'Info', ...opts }),
    realtime: (msg, opts) =>
      show(msg, { type: 'success', title: window.I18n ? I18n.t('liveUpdate') : 'Live update', pulse: true, ...opts }),
  };
})();

window.Toast = Toast;
