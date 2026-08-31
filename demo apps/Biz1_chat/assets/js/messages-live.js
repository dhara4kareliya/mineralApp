/**
 * Multi-channel inbox list
 * Chat.Conversations → user list (messenger_meta_id)
 * Open thread → Chat.SingleConversations
 * Unread badges + socket refresh
 */
(function () {
  'use strict';

  var CHAT_PAGE = 'chat.html';
  var allRows = [];
  var channelFilter = 'all'; // all | whatsapp | email | web
  var SEEN_KEY = 'biz1demo_inbox_seen_v1';
  var started = false;

  function isInboxRefreshEvent(detail) {
    var key = String((detail && detail.key) || '').toLowerCase();
    return /inbox\.refresh|rooms:refresh|rooms\.refresh/.test(key);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function apiErrorText(err) {
    if (!err) return 'Unknown API error';
    var parts = [];
    if (err.message) parts.push(String(err.message).replace(/<[^>]+>/g, ' ').trim().slice(0, 500));
    if (err.route) parts.push('route: ' + err.route);
    if (err.status) parts.push('status: ' + err.status);
    return parts.join('\n') || String(err);
  }

  function initials(name) {
    var p = String(name || '').trim().split(/[\s@._-]+/).filter(Boolean);
    if (!p.length) return '?';
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return ((p[0][0] || '') + (p[1][0] || '')).toUpperCase();
  }

  function avatarColor(seed) {
    var colors = [
      ['#d7e7fb', '#2f6aa6'],
      ['#fbe7c9', '#c8892b'],
      ['#d6f0e0', '#2e8a63'],
      ['#e7e2f5', '#6a5c9e'],
      ['#fbdedd', '#c0564e'],
      ['#e9ebef', '#6b7585']
    ];
    var s = String(seed || '');
    var n = 0;
    for (var i = 0; i < s.length; i++) n = (n + s.charCodeAt(i) * (i + 1)) % colors.length;
    return colors[n];
  }

  function showToast(msg) {
    var el = document.getElementById('mb-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mb-toast';
      el.className = 'mb-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(window.__mbToastTimer);
    window.__mbToastTimer = setTimeout(function () {
      el.classList.remove('is-visible');
    }, 2800);
  }

  function loadSeenMap() {
    try {
      return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function saveSeenMap(map) {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(map || {}));
    } catch (e) { /* ignore */ }
  }

  function rowSeenKey(row) {
    return String(row.channel || 'whatsapp') + ':' + String(row.customer_id || row.cust_id || row.email || row.id || '');
  }

  function rowFingerprint(row) {
    return String(row.last_message || row.message || row.subject || '') + '|' + String(row.when || '');
  }

  function applyClientUnread(rows) {
    // Unread badges disabled — show conversations only
    return (rows || []).map(function (r) {
      r.unread = 0;
      r._fp = rowFingerprint(r);
      r._seenKey = rowSeenKey(r);
      return r;
    });
  }

  function markRowSeen(row) {
    if (!row) return;
    var seen = loadSeenMap();
    seen[rowSeenKey(row)] = rowFingerprint(row);
    saveSeenMap(seen);
    row.unread = 0;
  }

  function channelMeta(channel) {
    var ch = String(channel || '').toLowerCase();
    var tt = window.t || function (k) { return k; };
    if (ch === 'notes' || ch === 'note') {
      return { key: 'notes', label: tt('channel_notes_short'), color: '#2F80ED' };
    }
    if (ch === 'email') {
      return { key: 'email', label: 'Email', color: '#8A2BE2' };
    }
    if (ch === 'web' || ch === 'biz1') {
      return { key: 'web', label: 'Biz1', color: '#007BFF' };
    }
    return { key: 'whatsapp', label: 'WA', color: '#25D366' };
  }

  function syncRowFromThread(detail) {
    if (!detail || !detail.messenger_meta_id) return;
    var meta = String(detail.messenger_meta_id);
    var updated = false;
    allRows.forEach(function (r) {
      if (String(r.messenger_meta_id || '') !== meta) return;
      if (detail.channel) {
        r.channel = detail.channel;
        r.last_message_type = detail.channel;
      }
      if (detail.last_message != null && String(detail.last_message).trim()) {
        r.last_message = r.message = String(detail.last_message).trim();
        r.subject = r.last_message;
      }
      if (detail.customer_id) {
        r.customer_id = r.cust_id = r.client_id = detail.customer_id;
      }
      updated = true;
    });
    if (updated) {
      var el = document.getElementById('mb-live-messages');
      var search = document.getElementById('mb-messages-search');
      if (el) renderFiltered(el, search && search.value);
    }
  }

  function syncRowFromSocket(detail) {
    var App = window.Biz1App || window.MineralBarApp;
    if (!App || typeof App.realtimeMessageFromEvent !== 'function') return false;
    var message = App.realtimeMessageFromEvent(detail);
    var cid = String(message.customer_id || '');
    var meta = String(message.messenger_meta_id || '');
    var text = String(message.message || '').trim();
    if ((!cid && !meta) || !text) return false;

    var row = null;
    for (var i = 0; i < allRows.length; i++) {
      var candidate = allRows[i];
      if ((meta && String(candidate.messenger_meta_id || '') === meta) ||
          (cid && String(candidate.customer_id || candidate.cust_id || candidate.client_id || '') === cid)) {
        row = candidate;
        break;
      }
    }

    if (!row) {
      row = {
        id: message.id || meta || cid,
        customer_id: cid,
        cust_id: cid,
        client_id: cid,
        message_id: message.id || '',
        name: message.name || (cid ? 'Customer #' + cid : ''),
        email: message.email || '',
        phone: message.phone || '',
        subject: text,
        message: text,
        last_message: text,
        when: message.when || new Date().toISOString(),
        channel: message.channel || 'whatsapp',
        unread: 0,
        messenger_meta_id: meta
      };
      allRows.unshift(row);
    } else {
      row.message = text;
      row.last_message = text;
      row.subject = text;
      if (message.when) row.when = message.when;
      if (message.channel) row.channel = message.channel;
      if (message.messenger_meta_id) row.messenger_meta_id = message.messenger_meta_id;
      if (message.name && !row.name) row.name = message.name;
      if (message.email && !row.email) row.email = message.email;
      if (message.phone && !row.phone) row.phone = message.phone;
      row.unread = 0;
      allRows.splice(allRows.indexOf(row), 1);
      allRows.unshift(row);
    }

    row.unread = 0;
    row._fp = rowFingerprint(row);
    row._seenKey = rowSeenKey(row);
    var seen = loadSeenMap();
    seen[row._seenKey] = row._fp;
    saveSeenMap(seen);

    var el = document.getElementById('mb-live-messages');
    var search = document.getElementById('mb-messages-search');
    if (el) renderFiltered(el, search && search.value);
    updateTotalLabel();
    return true;
  }

  function loadingHtml() {
    var tt = window.t || function (k) { return k; };
    return (
      '<div class="msg-loading">' +
      '<div class="msg-loading-title">' + esc(tt('loading_inbox')) + '</div>' +
      '<div class="msg-loading-sub">' + esc(tt('loading_inbox_sub')) + '</div>' +
      '</div>'
    );
  }

  function emptyHtml() {
    var tt = window.t || function (k) { return k; };
    return (
      '<div class="msg-empty">' +
      '<div class="msg-empty-icon">' +
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
      '</div>' +
      '<div class="msg-empty-title">' + esc(tt('no_conversations')) + '</div>' +
      '<div class="msg-empty-sub">' + esc(tt('no_conversations_sub')) + '</div>' +
      '</div>'
    );
  }

  function errorHtml(err) {
    var tt = window.t || function (k) { return k; };
    return (
      '<div class="msg-error">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--danger);"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>' +
      '<div class="msg-error-title">' + esc(tt('api_error')) + '</div>' +
      '</div>' +
      '<pre class="msg-error-body">' + esc(apiErrorText(err)) + '</pre>' +
      '<button type="button" id="mb-messages-retry" class="msg-error-retry">' + esc(tt('retry')) + '</button>' +
      '</div>'
    );
  }

  function chatHref(row) {
    var q = new URLSearchParams();
    var cid = Number(row.customer_id || row.cust_id || 0);
    if (cid) {
      q.set('customer_id', String(cid));
      q.set('cust_id', String(cid));
    }
    if (row.name) q.set('name', row.name);
    if (row.email) q.set('email', row.email);
    if (row.phone) q.set('phone', row.phone);
    if (row.subject) q.set('subject', row.subject);
    if (row.when) q.set('when', row.when);
    if (row.message_id) q.set('message_id', row.message_id);
    if (row.messenger_meta_id) q.set('messenger_meta_id', row.messenger_meta_id);
    if (row.channel) q.set('channel', row.channel);
    if (row.last_message || row.message) q.set('last_message', row.last_message || row.message);
    return CHAT_PAGE + '?' + q.toString();
  }

  function parseWhenDate(value) {
    var s = String(value || '').trim();
    if (!s) return null;
    var m = s.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\D+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) {
      var lang = (window.getLanguage && window.getLanguage()) || '';
      var isEnglish = String(lang).toLowerCase() === 'en';
      var first = Number(m[1]);
      var second = Number(m[2]);
      var day = first;
      var month = second;

      // Ambiguous slash dates depend on locale:
      // - en => mm/dd/yyyy
      // - others => dd/mm/yyyy
      if (isEnglish) {
        month = first;
        day = second;
      } else if (first <= 12 && second > 12) {
        // Defensive correction for accidentally mm/dd-like input on non-en locales.
        month = first;
        day = second;
      }

      return new Date(
        Number(m[3]),
        month - 1,
        day,
        Number(m[4] || 0),
        Number(m[5] || 0),
        Number(m[6] || 0)
      );
    }
    var n = Date.parse(s);
    if (Number.isNaN(n)) return null;
    return new Date(n);
  }

  function formatConversationWhen(value) {
    var s = String(value || '').trim();
    if (!s) return '';
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
      var p = s.split(':');
      return p[0].padStart(2, '0') + ':' + p[1];
    }

    var dt = parseWhenDate(s);
    if (!dt || Number.isNaN(dt.getTime())) return s;

    var now = new Date();
    var isToday =
      dt.getFullYear() === now.getFullYear() &&
      dt.getMonth() === now.getMonth() &&
      dt.getDate() === now.getDate();

    if (isToday) {
      return String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0');
    }

    return String(dt.getDate()).padStart(2, '0') + '/' +
      String(dt.getMonth() + 1).padStart(2, '0') + '/' +
      String(dt.getFullYear());
  }

  function rowHtml(row, idx) {
    var cid = row.client_id || row.customer_id || row.cust_id;
    var label = row.name || row.email || ('Customer #' + (cid || idx));
    var snippet = row.subject || row.message || row.last_message || (window.t ? window.t('conversation') : 'Conversation');
    var when = formatConversationWhen(row.when || '');
    var av = initials(label);
    var col = avatarColor(label);
    var meta = channelMeta(row.channel);

    var selectedId = '';
    var selectedMeta = '';
    if (window.MineralBarChat && MineralBarChat.getCurrentParams) {
      var cur = MineralBarChat.getCurrentParams();
      if (cur && cur.customer_id) selectedId = String(cur.customer_id);
      if (cur && cur.messenger_meta_id) selectedMeta = String(cur.messenger_meta_id);
    }
    var rowMeta = String(row.messenger_meta_id || '');
    var isSelected = !!(
      (selectedMeta && rowMeta && selectedMeta === rowMeta) ||
      (selectedId && String(cid) === selectedId)
    );

    return (
      '<a href="' + esc(chatHref(row)) + '" class="conv-row' + (isSelected ? ' is-selected is-active' : '') + '"' +
      ' data-customer-id="' + esc(cid || '') + '"' +
      ' data-channel="' + esc(meta.key) + '"' +
      ' data-messenger-meta-id="' + esc(rowMeta) + '"' +
      ' data-seen-key="' + esc(row._seenKey || '') + '">' +
      '<div class="conv-av-wrap">' +
      '<span class="conv-av" style="background:' + col[0] + ';color:' + col[1] + ';">' + esc(av) + '</span>' +
      '<span class="conv-dot" style="background:' + meta.color + ';" title="' + esc(meta.label) + '"></span>' +
      '</div>' +
      '<div class="conv-body">' +
      '<div class="conv-name-row">' +
      '<span class="conv-name">' + esc(label) + '</span>' +
      '<span class="conv-channel-pill" style="--ch:' + meta.color + ';">' + esc(meta.label) + '</span>' +
      '</div>' +
      '<div class="conv-snippet-row">' +
      '<span class="conv-snippet">' + esc(snippet) + '</span>' +
      '</div>' +
      '</div>' +
      '<div class="conv-meta">' +
      (when ? '<span class="conv-when">' + esc(when) + '</span>' : '') +
      '</div>' +
      '</a>'
    );
  }

  function ensureFilterBar() {
    var wrap = document.querySelector('.msg-search-wrap');
    if (!wrap) return null;
    var bar = document.getElementById('mb-channel-filter');
    var tt = window.t || function (k) { return k; };
    if (bar) {
      bar.querySelectorAll('.channel-filter-btn[data-filter="mision"], .channel-filter-btn[data-filter="mission"]').forEach(function (btn) {
        btn.remove();
      });
      if (channelFilter === 'mision' || channelFilter === 'mission') {
        channelFilter = 'all';
        bar.querySelectorAll('.channel-filter-btn').forEach(function (b) {
          b.classList.toggle('is-active', b.getAttribute('data-filter') === 'all');
        });
      }
      var map = {
        all: 'filter_all',
        email: 'channel_email',
        whatsapp: 'channel_wa_short',
        web: 'channel_biz1',
        notes: 'channel_notes_short'
      };
      bar.querySelectorAll('.channel-filter-btn').forEach(function (btn) {
        var f = btn.getAttribute('data-filter');
        if (map[f]) btn.textContent = tt(map[f]);
      });
      return bar;
    }
    bar = document.createElement('div');
    bar.id = 'mb-channel-filter';
    bar.className = 'channel-filter-bar';
    bar.innerHTML =
      '<button type="button" class="channel-filter-btn is-active" data-filter="all">' + esc(tt('filter_all')) + '</button>' +
      '<button type="button" class="channel-filter-btn" data-filter="whatsapp">' + esc(tt('channel_wa_short')) + '</button>' +
      '<button type="button" class="channel-filter-btn" data-filter="notes">' + esc(tt('channel_notes_short')) + '</button>' +
      '<button type="button" class="channel-filter-btn" data-filter="web">' + esc(tt('channel_biz1')) + '</button>' +
      '<button type="button" class="channel-filter-btn" data-filter="email">' + esc(tt('channel_email')) + '</button>';
    wrap.appendChild(bar);
    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('.channel-filter-btn');
      if (!btn) return;
      channelFilter = btn.getAttribute('data-filter') || 'all';
      bar.querySelectorAll('.channel-filter-btn').forEach(function (b) {
        b.classList.toggle('is-active', b === btn);
      });
      var el = document.getElementById('mb-live-messages');
      var search = document.getElementById('mb-messages-search');
      if (el) renderFiltered(el, search && search.value);
    });
    return bar;
  }

  function findRow(cid, channel, metaId) {
    var meta = String(metaId || '');
    if (meta) {
      for (var k = 0; k < allRows.length; k++) {
        if (String(allRows[k].messenger_meta_id || '') === meta) return allRows[k];
      }
    }
    var id = String(cid || '');
    var ch = String(channel || '');
    for (var i = 0; i < allRows.length; i++) {
      var r = allRows[i];
      var rid = String(r.client_id || r.customer_id || r.cust_id || '');
      if (rid === id && (!ch || String(r.channel) === ch)) return r;
    }
    for (var j = 0; j < allRows.length; j++) {
      var r2 = allRows[j];
      if (String(r2.client_id || r2.customer_id || r2.cust_id || '') === id) return r2;
    }
    return null;
  }

  function openRowInPane(row, anchor) {
    if (!window.MineralBarChat || !MineralBarChat.open) {
      location.href = chatHref(row);
      return;
    }
    markRowSeen(row);
    document.querySelectorAll('.conv-row.is-selected, .conv-row.is-active').forEach(function (n) {
      n.classList.remove('is-selected', 'is-active');
    });
    if (anchor) {
      anchor.classList.add('is-selected', 'is-active');
    }
    var params = MineralBarChat.paramsFromRow(row);
    params.type = 'all';
    MineralBarChat.open(params);
  }

  function bindListClicks(el) {
    if (el.__mbClickBound) return;
    el.__mbClickBound = true;
    el.addEventListener('click', function (e) {
      var anchor = e.target.closest('.conv-row');
      if (!anchor) return;

      if (document.getElementById('inboxLayout') && window.MineralBarChat) {
        e.preventDefault();
        var cid = anchor.getAttribute('data-customer-id');
        var channel = anchor.getAttribute('data-channel');
        var metaId = anchor.getAttribute('data-messenger-meta-id');
        var row = findRow(cid, channel, metaId);
        if (!row) {
          var q = new URLSearchParams((anchor.getAttribute('href') || '').split('?')[1] || '');
          row = {
            customer_id: q.get('customer_id') || cid,
            name: q.get('name'),
            email: q.get('email'),
            phone: q.get('phone'),
            subject: q.get('subject'),
            channel: channel || 'whatsapp',
            messenger_meta_id: q.get('messenger_meta_id') || anchor.getAttribute('data-messenger-meta-id') || '',
            last_message: q.get('last_message')
          };
        }
        openRowInPane(row, anchor);
      }
    });
  }

  function filteredRows(q) {
    var needle = String(q || '').trim().toLowerCase();
    return allRows.filter(function (r) {
      if (channelFilter !== 'all' && String(r.channel) !== channelFilter) return false;
      if (!needle) return true;
      var blob = [r.name, r.email, r.subject, r.message, r.customer_id, r.phone, r.channel].join(' ').toLowerCase();
      return blob.indexOf(needle) !== -1;
    });
  }

  function renderFiltered(el, q) {
    var rows = filteredRows(q);
    if (!rows.length) {
      el.innerHTML = emptyHtml();
      return;
    }
    el.innerHTML = rows.map(rowHtml).join('');
  }

  function updateTotalLabel() {
    var totalEl = document.getElementById('mb-messages-total');
    if (!totalEl) return;
    var tt = window.t || function (k) { return k; };
    totalEl.textContent = allRows.length + ' ' + tt('conversations');
  }

  async function loadMessages(el, opts) {
    opts = opts || {};
    if (!opts.silent) el.innerHTML = loadingHtml();
    var totalEl = document.getElementById('mb-messages-total');
    if (totalEl && !opts.silent) totalEl.textContent = (window.t ? window.t('loading') : 'Loading…');
    ensureFilterBar();

    try {
      var App = window.Biz1App || window.MineralBarApp;
      var result = await App.listChatConversations({ page: 1, limit: 25, start: 0 });
      allRows = applyClientUnread(result.rows || []);

      // Seed seen map for first-time rows so future RT changes can badge
      var seen = loadSeenMap();
      var changed = false;
      allRows.forEach(function (r) {
        if (seen[r._seenKey] == null) {
          seen[r._seenKey] = r._fp;
          changed = true;
        }
        // If this refresh was triggered by our own outgoing message,
        // immediately mark that customer's row as seen so no badge appears.
        if (opts.outgoingCustomerId && String(r.customer_id || r.cust_id || r.client_id || '') === opts.outgoingCustomerId) {
          seen[r._seenKey] = r._fp;
          r.unread = 0;
          changed = true;
        }
      });
      if (changed) saveSeenMap(seen);

      updateTotalLabel();
      if (!allRows.length) {
        el.innerHTML = emptyHtml();
        return;
      }
      var search = document.getElementById('mb-messages-search');
      renderFiltered(el, search && search.value);
    } catch (err) {
      console.error('[Biz1Showcase] Chat.Conversations failed', err);
      if (totalEl) totalEl.textContent = window.t ? window.t('api_error') : 'API error';
      el.innerHTML = errorHtml(err);
      var btn = document.getElementById('mb-messages-retry');
      if (btn) btn.addEventListener('click', function () { loadMessages(el); });
    }
  }

  function start() {
    if (started) return;
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    var el = document.getElementById('mb-live-messages');
    if (!el) return;
    started = true;
    bindListClicks(el);
    ensureFilterBar();
    var search = document.getElementById('mb-messages-search');
    if (search && !search.__mbBound) {
      search.__mbBound = true;
      search.addEventListener('input', function () {
        renderFiltered(el, search.value);
      });
    }
    loadMessages(el);
  }

  window.addEventListener('mineralbar:ready', start);
  window.addEventListener('mineralbar:lang', function () {
    var el = document.getElementById('mb-live-messages');
    ensureFilterBar();
    if (el && allRows.length) {
      var search = document.getElementById('mb-messages-search');
      renderFiltered(el, search && search.value);
      updateTotalLabel();
    }
  });
  window.addEventListener('mineralbar:list-channel', function (ev) {
    syncRowFromThread((ev && ev.detail) || {});
  });
  window.addEventListener('mineralbar:messages', function (ev) {
    var el = document.getElementById('mb-live-messages');
    if (!el || !window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    var detail = (ev && ev.detail) || {};
    if (isInboxRefreshEvent(detail)) return;
    var ch = detail.channel ? channelMeta(detail.channel).label : 'Inbox';
    showToast((window.t ? window.t('toast_new_message') : 'New message') + ' · ' + ch);
    syncRowFromSocket(detail);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 50); });
  } else {
    setTimeout(start, 50);
  }
})();
