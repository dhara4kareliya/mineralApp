/**
 * Inject on every protected mock screen.
 * - Requires Biz1 login (auto-refreshes expired token, else redirects to login.html)
 * - Shows a small connection status chip (REST + Socket RT)
 * - Connects / registers realtime for messages + missions
 *
 * Live Socket chip (same rules as Biz1 field ticket):
 *   on = !!(state.connected && state.status === 'ready')
 *   Never treat state.registered (array) as a live signal.
 */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function tt(key, fallback) {
    if (window.t) {
      var v = window.t(key);
      if (v && v !== key) return v;
    }
    return fallback || key;
  }

  /** Strict live ON — connected socket + biz1:ready only. */
  function isRealtimeLive(state) {
    return !!(state && state.connected && state.status === 'ready');
  }

  function roleLabel(role) {
    return ({
      sales: tt('sales', 'Sales'),
      service: tt('service', 'Service'),
      tech: tt('tech', 'Tech')
    })[role] || role;
  }

  function updateChipRealtime(chip, state) {
    if (!chip) return;
    state = state || { connected: false, status: 'offline' };
    var live = isRealtimeLive(state);
    var dot = chip.querySelector('[data-mb-dot]');
    var label = chip.querySelector('[data-mb-label]');

    chip.classList.toggle('live-on', live);
    chip.classList.toggle('live-off', !live);

    if (dot) {
      dot.removeAttribute('style');
      dot.setAttribute('data-status', state.status || '');
    }

    if (label) {
      var email = MineralBarApp.getEmail() || '';
      var role = MineralBarApp.getRole();
      var user = MineralBarApp.getUser() || {};
      var liveText = live
        ? tt('live_socket', 'Live Socket')
        : tt('offline', 'Offline');
      label.textContent =
        (email || user.name || tt('connected', 'Connected')) +
        ' · ' + roleLabel(role) + ' · ' + liveText;
    }

    if (live) {
      chip.title =
        'Socket registered:\n' +
        ((state.registered && state.registered.length)
          ? state.registered.join('\n')
          : 'Connected');
    } else if (state.error) {
      chip.title = 'Socket error: ' + state.error;
    } else {
      chip.title = tt('offline', 'Offline');
    }
  }

  function bootUi() {
    var user = MineralBarApp.getUser() || {};
    var role = MineralBarApp.getRole();
    var email = MineralBarApp.getEmail() || user.email || '';

    var chip = document.createElement('div');
    chip.id = 'mb-sdk-chip';
    chip.className = 'mb-sdk-chip live-off';
    chip.setAttribute('dir', document.documentElement.dir || 'rtl');
    chip.setAttribute('role', 'status');
    chip.setAttribute('aria-live', 'polite');

    chip.innerHTML =
      '<span data-mb-dot class="mb-sdk-dot"></span>' +
      '<span data-mb-label class="mb-sdk-label">' +
      (email || user.name || tt('connected', 'Connected')) +
      ' · ' + roleLabel(role) + ' · ' + tt('offline', 'Offline') +
      '</span>' +
      '<button type="button" id="mb-logout-btn" class="mb-sdk-logout">' +
      tt('logout', 'Logout') +
      '</button>';

    document.body.appendChild(chip);
    updateChipRealtime(chip, MineralBarApp.getRealtimeState() || { status: 'offline', connected: false });

    document.getElementById('mb-logout-btn').addEventListener('click', function () {
      MineralBarApp.clearSession();
      location.href = 'login.html';
    });

    function refreshChip() {
      updateChipRealtime(
        chip,
        MineralBarApp.getRealtimeState() || { status: 'offline', connected: false }
      );
    }

    window.addEventListener('mineralbar:socket-status', refreshChip);
    window.addEventListener('mineralbar:socket', refreshChip);
    window.addEventListener('mineralbar:auth-refreshed', refreshChip);
    window.addEventListener('mineralbar:ready', refreshChip);
    window.addEventListener('mineralbar:lang', function () {
      chip.setAttribute('dir', document.documentElement.dir || 'rtl');
      var btn = document.getElementById('mb-logout-btn');
      if (btn) btn.textContent = tt('logout', 'Logout');
      refreshChip();
    });
    window.setInterval(refreshChip, 4000);

    try {
      var name = user.name || (email.split('@')[0] || '');
      if (name) {
        document.querySelectorAll('div').forEach(function (el) {
          if (el.children.length) return;
          var text = (el.textContent || '').trim();
          if (/^בוקר טוב,/.test(text) || /^צהריים טובים,/.test(text) || /^ערב טוב,/.test(text) ||
              /^Good /.test(text) || /^Hello,/.test(text)) {
            el.textContent = text.replace(/,.*/, ', ' + name + ' 👋');
          }
        });
      }
    } catch (e) { /* ignore */ }

    window.dispatchEvent(new CustomEvent('mineralbar:ready', {
      detail: { role: role, user: user, client: MineralBarApp.getClient() }
    }));

    MineralBarApp.connectRealtime()
      .then(function (handle) {
        return handle.promise.then(function (payload) {
          var registered = (payload && payload.events) || [];
          console.info('[Biz1] socket ready', {
            userId: payload && payload.userId,
            messages: registered.filter(function (k) { return /chat|whatsapp|message|inbox/i.test(k); }),
            missions: registered.filter(function (k) { return /mission|task/i.test(k); }),
            all: registered
          });
          refreshChip();
          return payload;
        });
      })
      .catch(function (err) {
        console.warn('[Biz1] socket connect failed', err);
        refreshChip();
      });
  }

  ready(function () {
    if (!window.MineralBarApp) {
      console.error('[Biz1] biz1-app.js missing');
      return;
    }

    var path = (location.pathname || '').toLowerCase();
    var isLogin = path.indexOf('login.html') !== -1 || path.indexOf('התחברות') !== -1;
    if (isLogin) return;

    MineralBarApp.ensureAuth('login.html').then(function (client) {
      if (!client) return;
      bootUi();
    }).catch(function (err) {
      console.warn('[Biz1] ensureAuth failed', err);
      location.href = 'login.html';
    });
  });
})();
