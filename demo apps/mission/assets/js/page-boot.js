/**
 * Inject on every protected mock screen.
 * - Requires Biz1 login (auto-refreshes expired token, else redirects to login.html)
 * - Connects / registers realtime for messages + missions
 */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function bootUi() {
    var user = MineralBarApp.getUser() || {};
    var role = MineralBarApp.getRole();
    var email = MineralBarApp.getEmail() || user.email || '';

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
          return payload;
        });
      })
      .catch(function (err) {
        console.warn('[Biz1] socket connect failed', err);
      });
  }

  ready(function () {
    if (!window.MineralBarApp) {
      console.error('[Biz1] biz1-app.js missing');
      return;
    }

    MineralBarApp.requireAuth({ redirectTo: 'login.html' })
      .then(function () {
        bootUi();
      })
      .catch(function () {
        /* redirect handled in requireAuth */
      });
  });
})();
