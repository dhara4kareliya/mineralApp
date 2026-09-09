/**
 * Shared shell (sidebar + topbar) for authenticated pages
 */
const Layout = (() => {
  const NAV = [
    { id: 'dashboard', href: 'dashboard.html', icon: '⌂', label: 'Dashboard', always: true },
    { id: 'tickets', href: 'tickets.html', icon: '🎫', label: 'Tickets', module: 'tickets' },
    { id: 'projects', href: 'projects.html', icon: '📁', label: 'Projects', module: 'projects' },
    { id: 'invoices', href: 'invoices.html', icon: '🧾', label: 'Invoices', module: 'invoices' },
    { id: 'products', href: 'products.html', icon: '📦', label: 'Products', module: 'products' },
    { id: 'appointments', href: 'appointments.html', icon: '📅', label: 'Appointments', module: 'appointments' },
    { id: 'files', href: 'files.html', icon: '📎', label: 'Files', module: 'files' },
    { id: 'rooms', href: 'rooms.html', icon: '🏨', label: 'Rooms', module: 'rooms' },
    { id: 'bookings', href: 'bookings.html', icon: '✓', label: 'My Bookings', module: 'rooms' },
    { id: 'content', href: 'content.html', icon: '📄', label: 'Content', module: 'dynamic_content' },
  ];

  function isModuleEnabled(key) {
    return Auth.isModuleEnabled(key);
  }

  function render({ active = 'dashboard', title = '', subtitle = '', titleKey = '', subtitleKey = '' } = {}) {
    if (!Auth.requireAuth()) return;

    const activeItem = NAV.find((item) => item.id === active);
    if (activeItem?.module && !isModuleEnabled(activeItem.module)) {
      window.location.href = 'dashboard.html';
      return;
    }

    const customer = Auth.getCustomer() || {};
    const name = customer.name || customer.customer_name || 'Customer';
    const initials = name
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const tr = typeof I18n !== 'undefined' ? (k) => I18n.t(k) : (k) => k;
    const resolvedTitle = titleKey ? tr(titleKey) : title || tr(`nav.${active}`);
    const resolvedSubtitle = subtitleKey ? tr(subtitleKey) : subtitle;

    const navHtml = NAV.map((item) => {
      const enabled = item.always || isModuleEnabled(item.module);
      if (!enabled) return '';
      const cls = ['nav-link', item.id === active ? 'active' : ''].filter(Boolean).join(' ');
      return `<a class="${cls}" href="${item.href}" data-module="${item.module || ''}">
        <span class="icon">${item.icon}</span>${escapeHtml(tr(`nav.${item.id}`))}
      </a>`;
    }).join('');

    const langBtn = typeof I18n !== 'undefined' ? I18n.buttonHtml() : '';

    const shell = document.createElement('div');
    shell.className = 'app-shell';
    shell.innerHTML = `
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <div class="logo">CP</div>
          <div>
            <h1>${escapeHtml(tr('appName'))}</h1>
            <span>${escapeHtml(tr('selfService'))}</span>
          </div>
        </div>
        <div class="nav-section">${escapeHtml(tr('menu'))}</div>
        ${navHtml}
        <div class="sidebar-footer">
          <button type="button" class="btn btn-ghost btn-block" id="btn-logout" style="color:#cbd5e1;border-color:rgba(255,255,255,.12)">
            ${escapeHtml(tr('signOut'))}
          </button>
        </div>
      </aside>
      <div class="main-area">
        <header class="topbar">
          <div class="topbar-left">
            <button type="button" class="menu-toggle" id="menu-toggle" aria-label="${escapeHtml(tr('openMenu'))}">☰</button>
            <div>
              <div class="page-title">${escapeHtml(resolvedTitle)}</div>
              ${resolvedSubtitle ? `<div class="page-subtitle">${escapeHtml(resolvedSubtitle)}</div>` : ''}
            </div>
          </div>
          <div class="topbar-actions">
            <div class="live-indicator" title="${escapeHtml(tr('live'))}">
              <span class="live-dot"></span> ${escapeHtml(tr('live'))}
            </div>
            ${langBtn}
            <button type="button" class="btn btn-ghost btn-icon" data-theme-toggle title="${escapeHtml(tr('theme'))}">🌙</button>
            <div class="user-chip">
              <div class="avatar">${escapeHtml(initials || 'C')}</div>
              <span class="name">${escapeHtml(name)}</span>
            </div>
          </div>
        </header>
        <main class="content" id="page-content" data-live-target></main>
      </div>
    `;

    const mount = document.getElementById('app');
    if (mount) {
      mount.replaceWith(shell);
    } else {
      document.body.prepend(shell);
    }

    // Move existing page content into main if present
    const pageBody = document.getElementById('page-body');
    const content = document.getElementById('page-content');
    if (pageBody && content) {
      content.appendChild(pageBody);
      pageBody.hidden = false;
    }

    document.getElementById('btn-logout')?.addEventListener('click', () => Auth.logout());
    document.getElementById('menu-toggle')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.add('open');
      document.getElementById('sidebar-overlay')?.classList.add('show');
    });
    document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);

    Theme.init();
    Realtime.init();
    if (typeof I18n !== 'undefined') I18n.init();

    return content;
  }

  function closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('show');
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function loading(el, text) {
    if (!el) return;
    const msg = text || (typeof I18n !== 'undefined' ? I18n.t('loading') : 'Loading…');
    el.innerHTML = `<div class="loading-block"><div class="spinner"></div>${escapeHtml(msg)}</div>`;
  }

  function empty(el, title, hint) {
    if (!el) return;
    const t = title || (typeof I18n !== 'undefined' ? I18n.t('nothingHere') : 'Nothing here yet');
    const h = hint == null ? (typeof I18n !== 'undefined' ? I18n.t('dataWillAppear') : '') : hint;
    el.innerHTML = `<div class="empty-state">
      <div class="empty-icon">◌</div>
      <h3>${escapeHtml(t)}</h3>
      <p>${escapeHtml(h)}</p>
    </div>`;
  }

  function error(el, message) {
    if (!el) return;
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(message)}</div>`;
  }

  return { render, loading, empty, error, escapeHtml, closeSidebar, isModuleEnabled, NAV };
})();

window.Layout = Layout;

/** Shared page bootstrap scripts order helper */
function cpScripts() {
  // no-op marker
}
