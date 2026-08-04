/**
 * Live socket → UI sync (pattern from Biz1_task + biz1_ticket).
 *
 * Flow:
 *   Socket biz1:event / named ticket.*|mission.*
 *     → mineralbar:realtime (biz1-app.js)
 *       → LiveSync schedules debounced REST re-fetch callbacks
 *         → page loaders replace list DOM (no full page reload)
 *
 * Also:
 *   - Retries after ticket/mission events (API can lag behind socket)
 *   - Quiet 12s poll while socket is connected (biz1_ticket safety net)
 *   - Biz1Pulse visual feedback on list mounts
 */
(function (global) {
  'use strict';

  if (global.__mbLiveSyncLoaded) return;
  global.__mbLiveSyncLoaded = true;

  var pollTimer = null;
  var lastRealtimeAt = 0;

  function isAuth() {
    try {
      return !!(global.MineralBarApp && MineralBarApp.isAuthenticated && MineralBarApp.isAuthenticated());
    } catch (e) {
      return false;
    }
  }

  function isTicketKey(key) {
    key = String(key || '').toLowerCase();
    return /(^|\.)ticket(\.|$)/.test(key) || key.indexOf('ticket.') !== -1;
  }

  function isMissionKey(key) {
    key = String(key || '').toLowerCase();
    return /(^|\.)mission(\.|$)/.test(key) ||
      /teamops\.task|task\.updated|appointment\.|meeting\.|reminder/.test(key);
  }

  function isInventoryKey(key) {
    key = String(key || '').toLowerCase();
    return /product|invent|categorie|entries\.|statuses\./.test(key);
  }

  function isLeadKey(key) {
    key = String(key || '').toLowerCase();
    return /customer|lead|crm/.test(key);
  }

  function isMessageKey(key) {
    key = String(key || '').toLowerCase();
    return /message|chat|whatsapp|inbox|rooms\.chat/.test(key);
  }

  function isDocumentKey(key) {
    key = String(key || '').toLowerCase();
    return /document|file|payment|forms?\./.test(key);
  }

  function isDataKey(key) {
    key = String(key || '').toLowerCase();
    if (!key) return false;
    if (/^socket\.(connect|connected|disconnect)(\.|$)/i.test(key)) return false;
    if (/^socket\.nudge\.visible$/i.test(key) || key === 'pageshow' || key === 'visible') return false;
    return isTicketKey(key) || isMissionKey(key) || isInventoryKey(key) ||
      isLeadKey(key) || isMessageKey(key) || isDocumentKey(key) ||
      /socket\.nudge|member|team_hours/.test(key);
  }

  /** Green pulse like Biz1_task — marks the list that just refreshed live. */
  function Biz1Pulse(el) {
    if (!el || !el.classList) return;
    el.classList.remove('mb-live-pulse');
    void el.offsetWidth;
    el.classList.add('mb-live-pulse');
    clearTimeout(el.__mbPulseT);
    el.__mbPulseT = setTimeout(function () {
      el.classList.remove('mb-live-pulse');
    }, 900);
  }

  function dbg(msg) {
    try {
      global.dispatchEvent(new CustomEvent('mineralbar:socket-debug', {
        detail: { type: 'onAny', eventName: String(msg || '') }
      }));
    } catch (e) { /* ignore */ }
  }

  /**
   * Register a page refresher the same way Biz1_task pages listen for
   * mineralbar:missions / mineralbar:realtime.
   *
   *   LiveSync.bind(function (detail) { loadTickets(); }, {
   *     keys: /ticket|mission|socket\.nudge/i,
   *     mount: '#schedTicketList',  // optional pulse target
   *     delay: 300,
   *     retries: true
   *   });
   */
  function bind(fn, options) {
    options = options || {};
    if (typeof fn !== 'function') return function () {};
    if (!global.MineralBarApp || typeof MineralBarApp.bindLiveReload !== 'function') {
      // Fallback: direct listeners if app not ready yet
      var keyRe = options.keys || /ticket|mission|task|call|service|socket\.nudge/i;
      var timer = null;
      var retries = [];
      function run(detail) {
        var key = String((detail && detail.key) || '').toLowerCase();
        if (key && !(keyRe.test ? keyRe.test(key) : true)) return;
        clearTimeout(timer);
        retries.forEach(clearTimeout);
        retries = [];
        var delays = shouldRetry(key, options) ? [300, 1000, 2500] : [options.delay != null ? options.delay : 350];
        timer = setTimeout(function () {
          try { fn(detail || {}); } catch (err) { console.warn('[LiveSync]', err); }
          pulseMount(options.mount);
          delays.slice(1).forEach(function (ms) {
            retries.push(setTimeout(function () {
              try { fn(detail || {}); } catch (e2) { /* ignore */ }
            }, ms));
          });
        }, delays[0]);
      }
      global.addEventListener('mineralbar:realtime', function (ev) { run((ev && ev.detail) || {}); });
      global.addEventListener('mineralbar:missions', function (ev) { run((ev && ev.detail) || {}); });
      global.addEventListener('mineralbar:page-refresh', function (ev) { run((ev && ev.detail) || {}); });
      return function () {};
    }

    return MineralBarApp.bindLiveReload(function (detail) {
      try { fn(detail || {}); } catch (err) { console.warn('[LiveSync]', err); }
      pulseMount(options.mount);
      // Extra API-lag retries for ticket/mission (biz1_ticket style)
      var key = String((detail && detail.key) || '').toLowerCase();
      if (shouldRetry(key, options)) {
        setTimeout(function () { try { fn(detail || {}); } catch (e1) { /* ignore */ } }, 1000);
        setTimeout(function () { try { fn(detail || {}); } catch (e2) { /* ignore */ } }, 2500);
      }
    }, {
      keys: options.keys || /ticket|mission|task|call|service|socket\.nudge/i,
      groups: options.groups,
      delay: options.delay != null ? options.delay : 300
    });
  }

  function shouldRetry(key, options) {
    if (options && options.retries === false) return false;
    return /ticket\.|mission\.(done|created|updated|deleted|reopened)|products?\.(created|updated|deleted)|categories\.|customer\.|lead\.|crm\.|message\.|chat\.|document\.|socket\.nudge/.test(String(key || ''));
  }

  function pulseMount(mount) {
    if (!mount) return;
    var el = typeof mount === 'string' ? document.querySelector(mount) : mount;
    if (el) Biz1Pulse(el);
  }

  function onRealtime(ev) {
    var detail = (ev && ev.detail) || {};
    var key = String(detail.key || '').toLowerCase();
    if (!isDataKey(key)) return;
    lastRealtimeAt = Date.now();
    if (isTicketKey(key) || isMissionKey(key) || isInventoryKey(key) ||
        isLeadKey(key) || isMessageKey(key) || isDocumentKey(key) || /socket\.nudge/.test(key)) {
      dbg('LIVE_SYNC ' + key);
    }
  }

  /** Quiet poll while connected — catches missed/incomplete payloads (biz1_ticket). */
  function startPollFallback() {
    if (pollTimer) return;
    pollTimer = setInterval(function () {
      if (!isAuth()) return;
      if (global.document && global.document.hidden) return;
      var st = global.MineralBarApp && MineralBarApp.getRealtimeState && MineralBarApp.getRealtimeState();
      if (!(st && st.connected)) return;
      // Skip if a real event landed recently
      if (Date.now() - lastRealtimeAt < 10000) return;
      if (typeof MineralBarApp.notifyLiveReload === 'function') {
        MineralBarApp.notifyLiveReload({
          group: 'other',
          key: 'socket.nudge.poll',
          event: { key: 'socket.nudge.poll', reason: 'poll' }
        });
      } else if (typeof MineralBarApp.nudgePagesAfterSocket === 'function') {
        // not exported — use custom event
        try {
          global.dispatchEvent(new CustomEvent('mineralbar:realtime', {
            detail: { group: 'other', key: 'socket.nudge.poll', event: { key: 'socket.nudge.poll' } }
          }));
        } catch (e) { /* ignore */ }
      }
    }, 12000);
  }

  function ensureCss() {
    if (document.getElementById('mb-live-sync-css')) return;
    var s = document.createElement('style');
    s.id = 'mb-live-sync-css';
    s.textContent =
      '@keyframes mbLivePulse {' +
      '0%{box-shadow:0 0 0 0 rgba(46,138,99,.45)}' +
      '70%{box-shadow:0 0 0 10px rgba(46,138,99,0)}' +
      '100%{box-shadow:0 0 0 0 rgba(46,138,99,0)}' +
      '}' +
      '.mb-live-pulse{animation:mbLivePulse .85s ease-out 1;border-radius:12px;}';
    (document.head || document.documentElement).appendChild(s);
  }

  function boot() {
    ensureCss();
    if (!global.__mbLiveSyncBus) {
      global.__mbLiveSyncBus = true;
      global.addEventListener('mineralbar:realtime', onRealtime);
      global.addEventListener('mineralbar:missions', onRealtime);
      global.addEventListener('mineralbar:socket', function (ev) {
        if (ev && ev.detail && ev.detail.type === 'ready') startPollFallback();
      });
      // If socket already ready
      try {
        var st = global.MineralBarApp && MineralBarApp.getRealtimeState && MineralBarApp.getRealtimeState();
        if (st && (st.status === 'ready' || st.connected)) startPollFallback();
      } catch (e0) { /* ignore */ }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  global.Biz1Pulse = Biz1Pulse;
  global.LiveSync = {
    bind: bind,
    pulse: Biz1Pulse,
    isTicketKey: isTicketKey,
    isMissionKey: isMissionKey,
    isInventoryKey: isInventoryKey,
    isLeadKey: isLeadKey,
    isMessageKey: isMessageKey,
    isDocumentKey: isDocumentKey,
    startPollFallback: startPollFallback
  };
})(typeof window !== 'undefined' ? window : this);
