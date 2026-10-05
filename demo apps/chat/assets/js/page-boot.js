/**
 * Inject on every protected mock screen.
 * - Requires Biz1 login (auto-refreshes expired token, else redirects to login.html)
 * - Shows a small connection status chip (REST + Socket RT)
 * - Connects / registers realtime for messages + missions
 */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function isRealtimeLive(state) {
    return !!(state && state.connected && state.status === 'ready');
  }

  function rtDotColor(live) {
    return live ? '#3dce7c' : '#e35d4f';
  }

  function rtLabel(live) {
    var tt = window.t || function (k) { return k; };
    return live ? tt('live_socket') : tt('offline');
  }

  function roleLabel(role) {
    var tt = window.t || function (k) { return k; };
    return ({
      sales: tt('role_sales'),
      service: tt('role_service'),
      tech: tt('role_tech')
    })[role] || role;
  }

  function updateChipRealtime(chip, state) {
    if (!chip || !state) return;
    var tt = window.t || function (k) { return k; };
    var App = window.Biz1App || window.MineralBarApp;
    var live = isRealtimeLive(state);
    var dot = chip.querySelector('[data-mb-dot]');
    var label = chip.querySelector('[data-mb-label]');
    chip.classList.toggle('live-on', live);
    chip.classList.toggle('live-off', !live);
    if (dot) {
      dot.style.background = rtDotColor(live);
      dot.setAttribute('data-status', state.status || '');
    }
    if (label) {
      var email = App.getEmail() || '';
      var role = App.getRole();
      var user = App.getUser() || {};
      label.textContent =
        (email || user.name || tt('connected')) + ' · ' + roleLabel(role) + ' · ' + rtLabel(live);
    }
    if (live) {
      chip.title =
        'Socket registered:\n' +
        ((state.registered && state.registered.length) ? state.registered.join('\n') : 'Connected');
    } else if (state.error) {
      chip.title = 'Socket error: ' + state.error;
    } else {
      chip.title = tt('offline');
    }
  }

  function bootUi() {
    var App = window.Biz1App || window.MineralBarApp;
    var tt = window.t || function (k) { return k; };
    var user = App.getUser() || {};
    var role = App.getRole();
    var email = App.getEmail() || user.email || '';

    var chip = document.createElement('div');
    chip.id = 'mb-sdk-chip';
    chip.className = 'mb-sdk-chip';
    chip.setAttribute('dir', document.documentElement.dir || 'rtl');

    chip.innerHTML =
      '<span data-mb-dot class="mb-sdk-dot"></span>' +
      '<span data-mb-label class="mb-sdk-label">' +
      (email || user.name || tt('connected')) + ' · ' + roleLabel(role) + ' · ' + tt('offline') +
      '</span>' +
      '<button type="button" id="mb-logout-btn" class="mb-sdk-logout">' + tt('exit') + '</button>';

    document.body.appendChild(chip);
    updateChipRealtime(chip, App.getRealtimeState() || { status: 'off', connected: false });
    document.getElementById('mb-logout-btn').addEventListener('click', function () {
      App.clearSession();
      location.href = 'login.html';
    });

    function refreshChip() {
      updateChipRealtime(chip, App.getRealtimeState() || { status: 'off', connected: false });
    }

    window.addEventListener('mineralbar:socket-status', function (ev) {
      refreshChip();
    });
    window.addEventListener('mineralbar:socket', function () {
      // Covers connect, disconnect, connect_error and biz1:ready events.
      refreshChip();
    });
    window.addEventListener('mineralbar:auth-refreshed', function () {
      refreshChip();
    });
    window.addEventListener('mineralbar:lang', function () {
      chip.setAttribute('dir', document.documentElement.dir || 'rtl');
      var btn = document.getElementById('mb-logout-btn');
      if (btn) btn.textContent = (window.t && window.t('exit')) || 'Exit';
      refreshChip();
    });
    window.setInterval(refreshChip, 4000);

    try {
      var name = user.name || (email.split('@')[0] || '');
      if (name) {
        document.querySelectorAll('div').forEach(function (el) {
          if (el.children.length) return;
          var t = (el.textContent || '').trim();
          if (/^בוקר טוב,/.test(t) || /^צהריים טובים,/.test(t) || /^ערב טוב,/.test(t) || /^Good /.test(t) || /^Hello,/.test(t)) {
            el.textContent = t.replace(/,.*/, ', ' + name + ' 👋');
          }
        });
      }
    } catch (e) { /* ignore */ }

    window.dispatchEvent(new CustomEvent('mineralbar:ready', {
      detail: { role: role, user: user, client: App.getClient() }
    }));

    App.connectRealtime()
      .then(function (handle) {
        return handle.promise.then(function (payload) {
          var registered = (payload && payload.events) || [];
          console.info('[Biz1Showcase] socket ready', {
            userId: payload && payload.userId,
            messages: registered.filter(function (k) { return /chat|whatsapp|message|inbox/i.test(k); }),
            missions: registered.filter(function (k) { return /mission|task/i.test(k); }),
            all: registered
          });
          return payload;
        });
      })
      .catch(function (err) {
        console.warn('[Biz1Showcase] socket connect failed', err);
        refreshChip();
      });
  }

  ready(function () {
    if (!window.MineralBarApp) {
      console.error('[Biz1Showcase] biz1-app.js missing');
      return;
    }

    var path = (location.pathname || '').toLowerCase();
    var isLogin = path.indexOf('login.html') !== -1 || path.indexOf('התחברות') !== -1;
    if (isLogin) return;

    MineralBarApp.ensureAuth('login.html').then(function (client) {
      if (!client) return;
      bootUi();
    }).catch(function (err) {
      console.warn('[Biz1Showcase] ensureAuth failed', err);
      location.href = 'login.html';
    });
  });
})();
