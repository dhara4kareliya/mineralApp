/**
 * Inject on every protected mock screen.
 * - Requires Biz1 login (auto-refreshes expired token, else redirects to login.html)
 * - Shows a small connection status chip (REST + Socket RT)
 * - Connects / registers realtime for messages + missions
 */
(function () {
  'use strict';

  window.i18nDict = window.i18nTranslations || window.i18nDict || (window.appI18nDict || { "en": {} });

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

  function bootUi() {
    var user = MineralBarApp.getUser() || {};
    var role = MineralBarApp.getRole();
    var email = MineralBarApp.getEmail() || user.email || '';

    // Visible on-screen socket debug (so logs are obvious without Console filters)
    var dbg = document.getElementById('mb-socket-debug');
    if (!dbg) {
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
    }
    function dbgLine(msg) {
      var t = new Date().toLocaleTimeString();
      var prev = String(dbg.textContent || '')
        .replace(/\[SocketDebug\] waiting for connect…\n?/g, '')
        .replace(/^\s+|\s+$/g, '');
      dbg.textContent = '[' + t + '] ' + msg + (prev ? '\n' + prev.split('\n').slice(0, 12).join('\n') : '');
      try { console.log('[SocketTest] UI', msg); } catch (e0) { /* ignore */ }
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
      return;
    }

    var path = (location.pathname || '').toLowerCase();
    var isLogin = path.indexOf('login.html') !== -1 || path.indexOf('התחברות') !== -1;
    if (isLogin) return;

    MineralBarApp.ensureAuth('login.html').then(function (client) {
      if (!client) return;
      bootUi();
      // One deferred language pass after DC/chrome settle (was 200/600/1400 + ready storms)
      setTimeout(function () { applyLanguage(); }, 320);
    }).catch(function (err) {
      console.warn('[MineralBar] ensureAuth failed', err);
      location.href = 'login.html';
    });
  });

  window.addEventListener('mineralbar:ready', function () {
    applyLanguage();
  });
})();
