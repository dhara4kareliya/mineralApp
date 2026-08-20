/**
 * Inject on every protected mock screen.
 * - Requires Biz1 login (auto-refreshes expired token, else redirects to login.html)
 * - Shows a small connection status chip (REST + Socket RT)
 * - Connects / registers realtime for messages + missions
 */
(function () {
  'use strict';

  window.i18nDict = window.i18nTranslations || window.i18nDict || (window.appI18nDict || { "en": {} });

  /** Sanitize in-app back/return URLs (relative html only). */
  window.mbSafeBackHref = function (raw) {
    if (!raw) return '';
    try { raw = decodeURIComponent(String(raw)); } catch (e) { raw = String(raw); }
    raw = String(raw || '').trim();
    if (!raw || /^javascript:/i.test(raw) || raw.indexOf('//') === 0) return '';
    if (/^https?:/i.test(raw)) {
      try {
        var abs = new URL(raw, location.href);
        if (abs.origin !== location.origin) return '';
        return (abs.pathname.split('/').pop() || '') + abs.search + abs.hash;
      } catch (e2) { return ''; }
    }
    if (raw.indexOf('..') >= 0) return '';
    return raw.replace(/^\//, '');
  };

  /**
   * Resolve the page the user entered from.
   * Priority: ?back|return → ?from (only if it looks like a page) → sessionStorage → referrer → fallback.
   * Note: short aliases like from=lead / from=home are ignored here (page-specific handlers may map them).
   */
  window.mbResolveEntryBack = function (opts) {
    opts = opts || {};
    var fallback = opts.fallback || '';
    var q = new URLSearchParams(location.search || '');
    var fromParam = window.mbSafeBackHref(q.get('back') || q.get('return') || '');
    if (!fromParam) {
      var rawFrom = String(q.get('from') || '').trim();
      // Only treat from= as a URL when it looks like a page path
      if (rawFrom && (/\.html/i.test(rawFrom) || rawFrom.indexOf('/') >= 0)) {
        fromParam = window.mbSafeBackHref(rawFrom);
      }
    }
    if (fromParam) return fromParam;
    if (opts.storageKey) {
      try {
        var stored = window.mbSafeBackHref(sessionStorage.getItem(opts.storageKey));
        if (stored) return stored;
      } catch (e0) { /* ignore */ }
    }
    if (opts.useReferrer !== false) {
      try {
        var ref = document.referrer;
        if (ref) {
          var u = new URL(ref);
          if (u.origin === location.origin) {
            var file = (u.pathname.split('/').pop() || '');
            var selfRe = opts.selfRe || null;
            if (file && !/login/i.test(file) && !(selfRe && selfRe.test(file))) {
              return file + u.search + u.hash;
            }
          }
        }
      } catch (e1) { /* ignore */ }
    }
    return fallback;
  };

  /** Navigate back to the entry page (hard nav — more reliable than history.back in WebViews). */
  window.mbGoEntryBack = function (e, opts) {
    if (e) {
      try {
        e.preventDefault();
        e.stopPropagation();
      } catch (err) { /* ignore */ }
    }
    opts = opts || {};
    var href = window.mbResolveEntryBack(opts);
    if (href) {
      window.location.href = href;
      return;
    }
    if (opts.allowHistory !== false) {
      try {
        if (window.history.length > 1) {
          window.history.back();
          return;
        }
      } catch (e2) { /* ignore */ }
    }
    window.location.href = opts.fallback || 'sales-home.html';
  };

  window.switchLanguage = function(lang) {
    if (window.switchAppLanguage) {
      window.switchAppLanguage(lang);
    } else {
      try { localStorage.setItem('app_lang', lang); } catch(e) {}
      try { sessionStorage.setItem('app_lang', lang); } catch(e) {}
      location.reload();
    }
  };

  function applyLanguage(lang) {
    if (window.applyTranslations) {
      window.applyTranslations(lang);
    }
  }

  document.addEventListener('click', function(e) {
    var logoutBtn = e.target.closest('#btn-logout-avatar');
    var dropdown = document.getElementById('avatar-dropdown');
    var dropdownLogoutBtn = e.target.closest('#btn-dropdown-logout');
    var confirmModal = document.getElementById('logout-confirm-modal');
    var cancelLogoutBtn = e.target.closest('#btn-cancel-logout');
    var confirmLogoutBtn = e.target.closest('#btn-confirm-logout');

    if (logoutBtn) {
      if (dropdown) {
        var isVisible = dropdown.style.display === 'block';
        if (isVisible) {
          dropdown.style.opacity = '0';
          dropdown.style.transform = 'translateY(-10px)';
          setTimeout(function() { dropdown.style.display = 'none'; }, 200);
        } else {
          dropdown.style.display = 'block';
          // force reflow
          void dropdown.offsetWidth;
          dropdown.style.opacity = '1';
          dropdown.style.transform = 'translateY(0)';
        }
      }
    } else if (dropdown && dropdown.style.display === 'block' && !e.target.closest('#avatar-dropdown')) {
      // click outside dropdown to close
      dropdown.style.opacity = '0';
      dropdown.style.transform = 'translateY(-10px)';
      setTimeout(function() { dropdown.style.display = 'none'; }, 200);
    }

    if (dropdownLogoutBtn) {
      if (dropdown) {
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-10px)';
        setTimeout(function() { dropdown.style.display = 'none'; }, 200);
      }
      if (confirmModal) {
        confirmModal.style.display = 'flex';
        // force reflow
        void confirmModal.offsetWidth;
        confirmModal.style.opacity = '1';
        var box = document.getElementById('logout-confirm-box');
        if (box) box.style.transform = 'scale(1)';
      }
    }

    if (cancelLogoutBtn) {
      if (confirmModal) {
        confirmModal.style.opacity = '0';
        var box = document.getElementById('logout-confirm-box');
        if (box) box.style.transform = 'scale(0.9)';
        setTimeout(function() { confirmModal.style.display = 'none'; }, 300);
      }
    }

    if (confirmLogoutBtn) {
      if (window.MineralBarApp && typeof window.MineralBarApp.logoutAndClearCache === 'function') {
        window.MineralBarApp.logoutAndClearCache();
      } else {
        if (window.MineralBarApp) window.MineralBarApp.clearSession();
        location.replace('login.html?nocache=' + Date.now());
      }
      return;
    }
  }, true);

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function isLoginPage() {
    var path = (location.pathname || '').toLowerCase();
    return path.indexOf('login.html') !== -1 || path.indexOf('התחברות') !== -1 || path.indexOf('login-screen') !== -1;
  }

  function loaderLabel() {
    var isEn = typeof getCurrentLanguage === 'function' && getCurrentLanguage() === 'en';
    try {
      if (!isEn && localStorage.getItem('app_lang') === 'en') isEn = true;
    } catch (e) { /* ignore */ }
    return isEn ? 'Loading…' : 'טוען…';
  }

  /**
   * Shared green spinner used on every protected HTML page.
   *   MineralBarLoader.show('Loading…')
   *   MineralBarLoader.hide()
   *   MineralBarLoader.inlineHtml(label)  // markup for in-page content areas
   */
  var pageLoader = (function () {
    var el = null;
    var hideTimer = null;
    var safetyTimer = null;
    var refCount = 0;

    function ensure() {
      if (el && el.parentNode) return el;
      el = document.getElementById('mb-page-loader');
      if (el) return el;
      el = document.createElement('div');
      el.id = 'mb-page-loader';
      el.className = 'mb-page-loader';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.innerHTML =
        '<div class="mb-page-loader__inner">' +
        '<div class="mb-page-loader__spin" aria-hidden="true"></div>' +
        '<div class="mb-page-loader__label" data-mb-loader-label></div>' +
        '</div>';
      (document.body || document.documentElement).appendChild(el);
      return el;
    }

    function show(label) {
      if (isLoginPage()) return;
      if (document.body && document.body.getAttribute('data-page-loader') === 'off') return;
      refCount += 1;
      clearTimeout(hideTimer);
      var node = ensure();
      node.classList.remove('is-hiding');
      node.style.display = 'flex';
      var lab = node.querySelector('[data-mb-loader-label]');
      if (lab) lab.textContent = label || loaderLabel();
      clearTimeout(safetyTimer);
      safetyTimer = setTimeout(function () { hide(true); }, 12000);
    }

    function hide(force) {
      if (force) refCount = 0;
      else refCount = Math.max(0, refCount - 1);
      if (refCount > 0 && !force) return;
      clearTimeout(safetyTimer);
      if (!el || !el.parentNode) return;
      el.classList.add('is-hiding');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        if (el) {
          el.style.display = 'none';
          el.classList.remove('is-hiding');
        }
      }, 220);
    }

    function inlineHtml(label) {
      return (
        '<div class="mb-inline-loader">' +
        '<div class="mb-page-loader__spin" aria-hidden="true"></div>' +
        '<div class="mb-page-loader__label">' + String(label || loaderLabel()).replace(/</g, '&lt;') + '</div>' +
        '</div>'
      );
    }

    return { show: show, hide: hide, inlineHtml: inlineHtml };
  })();

  window.MineralBarLoader = pageLoader;

  // Show as soon as page-boot runs (before auth) — skip login
  if (!isLoginPage()) {
    if (document.body) pageLoader.show();
    else document.addEventListener('DOMContentLoaded', function () { pageLoader.show(); });
  }

  function rtDotColor(status) {
    if (status === 'ready') return '#3dce7c';
    if (status === 'connecting' || status === 'loading_io') return '#e6b422';
    if (status === 'error') return '#e35d4f';
    if (status === 'offline') return '#9aa3b0';
    return '#3dce7c';
  }

  function rtLabel(status, registered) {
    if (status === 'ready') {
      var n = (registered && registered.length) || 0;
      return 'RT·' + n;
    }
    if (status === 'connecting' || status === 'loading_io') return 'RT…';
    if (status === 'error') return 'RT✕';
    if (status === 'offline') return 'RT–';
    return 'SDK';
  }

  function updateChipRealtime(chip, state) {
    if (!chip || !state) return;
    var dot = chip.querySelector('[data-mb-dot]');
    var label = chip.querySelector('[data-mb-label]');
    if (dot) dot.style.background = rtDotColor(state.status);
    if (label) {
      var email = MineralBarApp.getEmail() || '';
      var role = MineralBarApp.getRole();
      var isEn = typeof getCurrentLanguage === 'function' && getCurrentLanguage() === 'en';
      var roleMap = isEn
        ? { sales: 'Sales', service: 'Service', tech: 'Technician' }
        : { sales: 'מכירות', service: 'שירות', tech: 'טכנאי' };
      var roleLabel = roleMap[role] || role;
      var user = MineralBarApp.getUser() || {};
      var connected = isEn ? 'Connected' : 'מחובר';
      label.textContent =
        (email || user.name || connected) + ' · ' + roleLabel + ' · ' + rtLabel(state.status, state.registered);
    }
    if (state.status === 'ready' && state.registered) {
      chip.title =
        'Socket registered:\n' +
        state.registered.join('\n');
    } else if (state.error) {
      chip.title = 'Socket error: ' + state.error;
    }
  }

  function socketDebugEnabled() {
    try {
      var q = new URLSearchParams(location.search || '');
      if (q.get('socketdebug') === '1' || q.get('debug') === 'socket') return true;
      if (localStorage.getItem('mb_socket_debug') === '1') return true;
    } catch (e0) { /* ignore */ }
    return false;
  }

  function bootUi() {
    var user = MineralBarApp.getUser() || {};
    var role = MineralBarApp.getRole();
    var email = MineralBarApp.getEmail() || user.email || '';
    var showSocketDebug = socketDebugEnabled();

    // On-screen socket debug only when explicitly enabled (?socketdebug=1).
    var dbg = document.getElementById('mb-socket-debug');
    if (showSocketDebug && !dbg) {
      dbg = document.createElement('div');
      dbg.id = 'mb-socket-debug';
      dbg.style.cssText = [
        'position:fixed', 'bottom:10px', 'left:10px', 'z-index:2147483001',
        'width:min(92vw,360px)', 'max-height:220px', 'overflow:auto',
        'background:rgba(8,14,28,.94)', 'color:#d7e3ff',
        'font:600 11px/1.35 ui-monospace,Menlo,monospace',
        'padding:8px 10px', 'border-radius:12px',
        'box-shadow:0 8px 24px rgba(0,0,0,.35)',
        'white-space:pre-wrap', 'word-break:break-word'
      ].join(';');
      document.body.appendChild(dbg);
    } else if (!showSocketDebug && dbg && dbg.parentNode) {
      dbg.parentNode.removeChild(dbg);
      dbg = null;
    }
    function dbgLine(msg) {
      var t = new Date().toLocaleTimeString();
      try { console.log('[SocketTest] UI', msg); } catch (e0) { /* ignore */ }
      if (!dbg) return;
      var prev = String(dbg.textContent || '')
        .replace(/\[SocketDebug\] waiting for connect…\n?/g, '')
        .replace(/^\s+|\s+$/g, '');
      dbg.textContent = '[' + t + '] ' + msg + (prev ? '\n' + prev.split('\n').slice(0, 12).join('\n') : '');
    }
    window.addEventListener('mineralbar:socket-debug', function (ev) {
      var d = (ev && ev.detail) || {};
      if (d.type === 'connect') dbgLine('CONNECTED id=' + (d.id || ''));
      else if (d.type === 'ready') dbgLine('READY events=' + (((d.payload && d.payload.events) || []).length));
      else if (d.type === 'event') dbgLine('EVENT ' + (d.key || '?') + ' group=' + (d.group || '?') + ' via=' + (d.source || '?'));
      else if (d.type === 'onAny') dbgLine('onAny ' + (d.eventName || '?'));
      else if (d.type === 'error') dbgLine('ERROR ' + (d.error || ''));
      else if (d.type === 'disconnect') dbgLine('DISCONNECTED ' + (d.reason || ''));
      else if (d.type === 'cursor_reset') dbgLine('CURSOR RESET was=' + (d.previous || 0));
      else if (d.type === 'reconnect_attempt') dbgLine('RECONNECT try reason=' + (d.reason || ''));
      else dbgLine(JSON.stringify(d));
    });
    window.addEventListener('mineralbar:realtime', function (ev) {
      var d = (ev && ev.detail) || {};
      dbgLine('APP realtime key=' + (d.key || '?') + ' group=' + (d.group || '?'));
    });
    window.addEventListener('mineralbar:page-refresh', function (ev) {
      var d = (ev && ev.detail) || {};
      dbgLine('PAGE refresh key=' + (d.key || '?'));
    });
    dbgLine('boot start role=' + role + ' page=' + ((location.pathname || '').split('/').pop() || '') + ' asset=v' + (window.MB_ASSET_V || '?'));
    try {
      console.log('[SocketTest] Filter console by: SocketTest');
      console.log('[SocketTest] Expected flow: START → CONNECT → biz1:ready → EVENT/forceRelay/SDK relay → LiveReload RUN');
      console.log('[SocketTest] If you RECEIVE a message and see NO onAny lines, the SERVER is not pushing to this socket (client is fine).');
      console.log('[SocketTest] Chat page also polls REST every 8s as fallback — look for "chat poll saw change".');
    } catch (eHint) { /* ignore */ }
    try {
      var rt0 = MineralBarApp.getRealtimeState && MineralBarApp.getRealtimeState();
      if (rt0 && rt0.connected) dbgLine('socket already up status=' + (rt0.status || ''));
    } catch (eRt) { /* ignore */ }

    if (showSocketDebug) {
    var chip = document.createElement('div');
    chip.id = 'mb-sdk-chip';
    chip.setAttribute('dir', 'rtl');
    chip.style.cssText = [
      'position:fixed', 'top:10px', 'left:10px', 'z-index:2147483000',
      'display:flex', 'align-items:center', 'gap:8px',
      'background:rgba(22,34,58,.92)', 'color:#fff',
      'font:600 11px/1.2 Heebo,sans-serif',
      'padding:7px 10px', 'border-radius:999px',
      'box-shadow:0 6px 18px rgba(15,24,40,.28)',
      'max-width:min(92vw,360px)'
    ].join(';');

    var isEnBoot = typeof getCurrentLanguage === 'function' && getCurrentLanguage() === 'en';
    var roleLabel = (isEnBoot
      ? { sales: 'Sales', service: 'Service', tech: 'Technician' }
      : { sales: 'מכירות', service: 'שירות', tech: 'טכנאי' })[role] || role;
    var connectedLabel = isEnBoot ? 'Connected' : 'מחובר';
    var logoutLabel = isEnBoot ? 'Logout' : 'יציאה';
    chip.innerHTML =
      '<span data-mb-dot style="width:8px;height:8px;border-radius:50%;background:#e6b422;flex:none;"></span>' +
      '<span data-mb-label style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' +
      (email || user.name || connectedLabel) + ' · ' + roleLabel + ' · RT…' +
      '</span>' +
      '<button type="button" id="mb-logout-btn" style="background:rgba(255,255,255,.12);border:none;color:#fff;border-radius:99px;padding:4px 8px;cursor:pointer;font:700 10px Heebo,sans-serif;flex:none;">' + logoutLabel + '</button>';

    document.body.appendChild(chip);
    document.getElementById('mb-logout-btn').addEventListener('click', function () {
      if (window.MineralBarApp && typeof MineralBarApp.logoutAndClearCache === 'function') {
        MineralBarApp.logoutAndClearCache();
      } else {
        MineralBarApp.clearSession();
        location.replace('login.html?nocache=' + Date.now());
      }
    });

    window.addEventListener('mineralbar:socket-status', function (ev) {
      updateChipRealtime(chip, ev.detail || {});
    });
    window.addEventListener('mineralbar:auth-refreshed', function () {
      updateChipRealtime(chip, MineralBarApp.getRealtimeState() || { status: 'ready' });
      var label = chip.querySelector('[data-mb-label]');
      if (label) {
        var role2 = MineralBarApp.getRole();
        var roleLabel2 = { sales: 'מכירות', service: 'שירות', tech: 'טכנאי' }[role2] || role2;
        label.textContent =
          (MineralBarApp.getEmail() || 'מחובר') + ' · ' + roleLabel2 + ' · ' +
          rtLabel((MineralBarApp.getRealtimeState() || {}).status || 'ready',
            (MineralBarApp.getRealtimeState() || {}).registered);
      }
    });
    } else {
      var oldChip = document.getElementById('mb-sdk-chip');
      if (oldChip && oldChip.parentNode) oldChip.parentNode.removeChild(oldChip);
    }

    // Smart socket -> page update behavior for all pages.
    // Pages can opt-out by setting: <body data-live-refresh="off">
    // Optional controls:
    //  - data-live-refresh-mode="soft|hard" (default: soft)
    //  - data-live-reload="hard" (forces hard reload fallback)
    (function setupSocketPageRefresh() {
      var refreshTimer = null;
      var minGapMs = 280;
      var lastRefreshAt = 0;
      var allowAutoRefresh = (document.body.getAttribute('data-live-refresh') || 'on') !== 'off';
      if (!allowAutoRefresh) return;

      function getCurrentPageName() {
        var path = (location.pathname || '').split('/').pop() || '';
        return path.toLowerCase();
      }

      function inferGroupFromKey(key) {
        var k = String(key || '').toLowerCase();
        if (!k) return 'unknown';
        if (/chat|whatsapp|inbox|(^|\.)message(\.|$)/.test(k)) return 'messages';
        if (/product|inventory|categorie|entries|statuses/.test(k)) return 'inventory';
        if (/lead|crm|customer/.test(k)) return 'leads';
        if (/mission|task|ticket|meeting|appointment|reminder/.test(k)) return 'missions';
        return 'unknown';
      }

      function pageGroups(pageName) {
        var p = String(pageName || '');
        if (p.indexOf('service-inventory') !== -1) return ['inventory', 'leads', 'messages', 'missions', 'other', 'unknown'];
        if (p.indexOf('service-all-calls') !== -1) return ['missions', 'leads', 'other', 'unknown'];
        if (p.indexOf('service-call-details') !== -1) return ['missions', 'leads', 'messages', 'other', 'unknown'];
        if (p.indexOf('service-open-call') !== -1) return ['missions', 'leads', 'other', 'unknown'];
        if (p.indexOf('service-assign') !== -1) return ['missions', 'leads', 'other', 'unknown'];
        if (p.indexOf('tech-open-calls') !== -1 || p.indexOf('tech-dashboard') !== -1 || p.indexOf('tech-daily') !== -1 || p.indexOf('tech-call-close') !== -1) {
          return ['missions', 'leads', 'other', 'unknown'];
        }
        if (p.indexOf('chat-customer-details') !== -1) return ['messages', 'leads', 'missions', 'other', 'unknown'];
        if (p.indexOf('calls-list') !== -1 || p.indexOf('chat-customer') !== -1) return ['messages', 'leads'];
        if (p.indexOf('customers') !== -1 || p.indexOf('leads-list') !== -1 || p.indexOf('lead-card') !== -1 || p.indexOf('customer-card') !== -1) {
          return ['leads', 'messages', 'missions', 'other', 'unknown'];
        }
        if (p.indexOf('sales-home') !== -1) return ['missions', 'messages', 'leads', 'other', 'unknown'];
        if (p.indexOf('sales-tasks') !== -1 || p.indexOf('mission') !== -1 || p.indexOf('task') !== -1) return ['missions', 'other', 'unknown'];
        if (p.indexOf('select-customer') !== -1) return ['leads', 'other', 'unknown'];
        if (p.indexOf('select-product') !== -1 || p.indexOf('product-config') !== -1) return ['inventory', 'other', 'unknown'];
        // default: update all unknown pages for known data groups
        return ['inventory', 'missions', 'messages', 'leads', 'other', 'unknown'];
      }

      function isRelevantForPage(detail) {
        // All authenticated screens should soft-refresh on any data socket event
        // (add / edit / delete). Pages that only care about a subset still filter
        // inside their own bindLiveReload / onRealtimeRefresh handlers.
        return true;
      }

      function runSoftRefresh(detail) {
        // Notify pages to patch only changed data — do NOT re-fire mineralbar:ready
        window.dispatchEvent(new CustomEvent('mineralbar:page-refresh', { detail: detail }));
        if (window.MineralBarApp && typeof MineralBarApp.notifyLiveReload === 'function') {
          MineralBarApp.notifyLiveReload(detail);
        }
      }

      window.addEventListener('mineralbar:realtime', function (ev) {
        var detail = (ev && ev.detail) || {};
        var key = String(detail.key || '').toLowerCase();
        if (!key) {
          console.warn('[SocketUI] skip: empty key');
          return;
        }

        // Skip connect noise + other-app resume nudge only.
        // Allow socket.nudge.bfcache / visible-reconnect so lists catch up after reconnect.
        if (/^socket\.(connect|connected|disconnect)(\.|$)/i.test(key)) return;
        if (/^socket\.nudge\.visible$/i.test(key)) return;
        if (key === 'pageshow' || key === 'visible') return;
        if (!isRelevantForPage(detail)) {
          return;
        }

        var now = Date.now();
        var waitMs = Math.max(100, minGapMs - (now - lastRefreshAt));
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(function () {
          lastRefreshAt = Date.now();
          var mode = (document.body.getAttribute('data-live-refresh-mode') || 'soft').toLowerCase();
          var forceHard = (document.body.getAttribute('data-live-reload') || '').toLowerCase() === 'hard';

          if (mode === 'hard' || forceHard) {
            if (!document.hidden) location.reload();
            return;
          }

          runSoftRefresh(detail);
        }, waitMs);
      });

      window.addEventListener('mineralbar:socket', function (ev) {
      });
      window.addEventListener('mineralbar:socket-status', function (ev) {
      });
    })();

    try {
      var name = user.name || (email.split('@')[0] || '');
      if (name) {
        document.querySelectorAll('div').forEach(function (el) {
          if (el.children.length) return;
          var txt = (el.textContent || '').trim();
          // Update greeting name for both HE and EN prefixes (don't fight language toggle)
          if (/^(בוקר טוב|צהריים טובים|ערב טוב|Good morning|Good afternoon|Good evening),/.test(txt)) {
            el.textContent = txt.replace(/,.*/, ', ' + name + ' 👋');
          }
        });
      }
    } catch (e) { /* ignore */ }

    window.dispatchEvent(new CustomEvent('mineralbar:ready', {
      detail: { role: role, user: user, client: MineralBarApp.getClient() }
    }));

    // Prefetch likely next screens so tab clicks feel faster
    try {
      var prefetch = [];
      if (role === 'sales') {
        prefetch = ['sales-home.html', 'leads-list.html', 'customers.html', 'sales-tasks.html', 'calls-list.html'];
      } else if (role === 'service') {
        prefetch = ['service-all-calls.html', 'customers.html', 'service-inventory.html', 'calls-list.html', 'sales-tasks.html'];
      } else if (role === 'tech') {
        prefetch = ['tech-dashboard.html', 'tech-open-calls.html', 'tech-daily-schedule.html', 'tech-time-clock.html', 'service-all-calls.html'];
      }
      var here = ((location.pathname || '').split('/').pop() || '').toLowerCase();
      prefetch.forEach(function (href) {
        if (!href || here === href.toLowerCase()) return;
        if (document.querySelector('link[rel="prefetch"][href="' + href + '"]')) return;
        var link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        document.head.appendChild(link);
      });
    } catch (ePrefetch) { /* ignore */ }

    // Connect socket immediately so add/edit/delete live updates work right away.
    MineralBarApp.connectRealtime()
      .then(function (handle) {
        return handle.promise.then(function (payload) {
          var registered = (payload && payload.events) || [];
          console.log('[SocketTest] page-boot connect OK events=' + registered.length);
          return payload;
        });
      })
      .catch(function (err) {
        console.error('[SocketUI] socket connect FAILED', err);
        console.warn('[SocketTest] page-boot connect FAILED — retry in 1.5s', (err && err.message) || err);
        setTimeout(function () {
          if (typeof MineralBarApp.ensureRealtimeConnected === 'function') {
            MineralBarApp.ensureRealtimeConnected('page-boot-retry');
          }
        }, 1500);
      });
  }

  ready(function () {
    applyLanguage();

    if (!window.MineralBarApp) {
      console.error('[MineralBar] biz1-app.js missing');
      pageLoader.hide(true);
      return;
    }

    if (isLoginPage()) {
      pageLoader.hide(true);
      return;
    }

    pageLoader.show();
    MineralBarApp.ensureAuth('login.html').then(function (client) {
      if (!client) {
        pageLoader.hide(true);
        return;
      }
      bootUi();
      // Hide boot overlay once chrome is up; pages may show their own content loaders
      pageLoader.hide(true);
      // One deferred language pass after DC/chrome settle (was 200/600/1400 + ready storms)
      setTimeout(function () { applyLanguage(); }, 320);
    }).catch(function (err) {
      console.warn('[MineralBar] ensureAuth failed', err);
      pageLoader.hide(true);
      location.href = 'login.html';
    });
  });

  window.addEventListener('mineralbar:ready', function () {
    applyLanguage();
    // Auth/session ready — drop boot spinner if still up
    if (window.MineralBarLoader) window.MineralBarLoader.hide(true);
  });
})();
