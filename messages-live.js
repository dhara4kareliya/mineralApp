/**
 * Live Chat.Conversations / Chat.Inbox for רשימת שיחות
 * (per https://eli.bull36.com/app/help/category/Chat)
 */
(function () {
  'use strict';

  var CHAT_PAGE = 'chat-customer.html';
  var allRows = [];
  var lastTotal = 0;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Live mounts (#mb-live-*) skip DOM i18n — localize here. */
  function uiT(en, he) {
    if (typeof window.mbT === 'function') return window.mbT(en, he);
    var lang = (typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage()) || 'he';
    return lang === 'en' ? en : he;
  }

  function apiErrorText(err) {
    if (!err) return uiT('Unknown API error', 'שגיאת API לא ידועה');
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

  function loadingHtml() {
    if (window.MineralBarLoader && typeof MineralBarLoader.inlineHtml === 'function') {
      return MineralBarLoader.inlineHtml(uiT('Loading from server…', 'טוען מהשרת…'));
    }
    return (
      '<div class="mb-inline-loader">' +
      '<div class="mb-page-loader__spin" aria-hidden="true"></div>' +
      '<div class="mb-page-loader__label">' + esc(uiT('Loading from server…', 'טוען מהשרת…')) + '</div>' +
      '</div>'
    );
  }

  function emptyHtml() {
    return (
      '<div style="text-align:center;padding:48px 20px;">' +
      '<div style="width:56px;height:56px;border-radius:50%;background:#e3e7ec;display:flex;align-items:center;justify-content:center;margin:0 auto 13px;">' +
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#aab2bf" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
      '</div>' +
      '<div style="font-size:15px;font-weight:800;color:#5a6473;">' + esc(uiT('No conversations currently', 'אין שיחות כרגע')) + '</div>' +
      '<div style="font-size:12.5px;color:#9aa3b0;margin-top:6px;">' + esc(uiT('List is empty', 'הרשימה ריקה')) + '</div>' +
      '</div>'
    );
  }

  function errorHtml(err) {
    return (
      '<div style="background:#fbeeed;border:1px solid #f0c9c4;border-radius:14px;padding:14px 14px 16px;margin:12px 16px;">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0392b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>' +
      '<div style="font-size:14px;font-weight:800;color:#c0392b;">' + esc(uiT('API error', 'שגיאת API')) + '</div>' +
      '</div>' +
      '<pre style="margin:0;white-space:pre-wrap;word-break:break-word;font:600 11.5px/1.5 Heebo,monospace;color:#7a2e28;max-height:280px;overflow:auto;">' +
      esc(apiErrorText(err)) +
      '</pre>' +
      '<button type="button" id="mb-messages-retry" style="margin-top:12px;padding:9px 14px;border:none;border-radius:10px;background:#c0392b;color:#fff;font:800 13px Heebo,sans-serif;cursor:pointer;">' + esc(uiT('Try again', 'נסה שוב')) + '</button>' +
      '</div>'
    );
  }

  function chatHref(row) {
    var q = new URLSearchParams();
    var cid = Number(row.customer_id || row.cust_id || 0);
    // customer_id=0 is not valid for Chat.CustomerMessages — keep email for display only
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
    q.set('back', 'calls-list.html');
    return CHAT_PAGE + '?' + q.toString();
  }

  function formatConversationDate(row) {
    var rawDate = row.raw && (row.raw.last_updated || row.raw.last_update || row.raw.create_date || row.raw.inserted_date || row.raw.time);
    if (!rawDate) return row.when || '';

    var d = null;
    if (typeof rawDate === 'object') {
      var n = rawDate.$date && (rawDate.$date.$numberLong || rawDate.$date);
      if (n != null) {
        var ms = Number(n);
        if (!Number.isNaN(ms)) {
          if (ms < 1e12) ms *= 1000;
          d = new Date(ms);
        }
      }
    } else if (typeof rawDate === 'string' || typeof rawDate === 'number') {
      if (typeof rawDate === 'string' && /^\d{2}\.\d{2}\.\d{4}\s\d{2}:\d{2}:\d{2}$/.test(rawDate)) {
        var parts = rawDate.split(' ');
        var dateParts = parts[0].split('.');
        var timeParts = parts[1].split(':');
        d = new Date(
          Number(dateParts[2]),
          Number(dateParts[1]) - 1,
          Number(dateParts[0]),
          Number(timeParts[0]),
          Number(timeParts[1]),
          Number(timeParts[2])
        );
      } else {
        d = new Date(rawDate);
      }
    }

    if (!d || Number.isNaN(d.getTime())) {
      if (row.when) {
        var cleanTime = row.when.replace(/,/g, '');
        var parts = cleanTime.split(' ');
        var dateParts = parts[0].split('.');
        if (dateParts.length < 3) dateParts = parts[0].split('/');
        if (dateParts.length === 3) {
          var hh = 0, mm = 0;
          if (parts[1]) {
            var timeParts = parts[1].split(':');
            hh = Number(timeParts[0]) || 0;
            mm = Number(timeParts[1]) || 0;
          }
          d = new Date(Number(dateParts[2]), Number(dateParts[1]) - 1, Number(dateParts[0]), hh, mm);
        }
      }
    }

    if (!d || Number.isNaN(d.getTime())) {
      return row.when || '';
    }

    var today = new Date();
    var isToday = d.getDate() === today.getDate() &&
                  d.getMonth() === today.getMonth() &&
                  d.getFullYear() === today.getFullYear();

    if (isToday) {
      var h = d.getHours();
      var m = d.getMinutes();
      return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    } else {
      var day = d.getDate();
      var month = d.getMonth() + 1;
      var year = d.getFullYear();
      return (day < 10 ? '0' : '') + day + '/' + (month < 10 ? '0' : '') + month + '/' + year;
    }
  }

  function messageTypeBadge(row) {
    var type = row.raw && row.raw.last_message_type;
    if (!type) return '';
    type = String(type).trim().toLowerCase();

    var bg = '#eceff1';
    var color = '#37474f';
    var label = type;

    if (type === 'whatsapp') {
      bg = '#e8f5e9';
      color = '#2e7d32';
      label = 'WhatsApp';
    } else if (type === 'email') {
      bg = '#e3f2fd';
      color = '#1565c0';
      label = uiT('Email', 'מייל');
    } else if (type === 'sms') {
      bg = '#fff3e0';
      color = '#ef6c00';
      label = 'SMS';
    } else if (type === 'chat') {
      bg = '#f3e5f5';
      color = '#6a1b9a';
      label = uiT('Chat', 'צ׳אט');
    } else if (type === 'notes' || type === 'send_notes' || type === 'internal') {
      bg = '#f3e5f5';
      color = '#6a1b9a';
      label = uiT('NOTES', 'הערות');
    } else if (type === 'quick_email') {
      bg = '#e3f2fd';
      color = '#1565c0';
      label = uiT('Quick email', 'מייל מהיר');
    }

    return '<span style="font-size:10.5px;padding:2px 8px;border-radius:12px;background:' + bg + ';color:' + color + ';font-weight:800;letter-spacing:0.5px;line-height:1;margin-bottom:2px;">' + esc(label) + '</span>';
  }

  function rowHtml(row, idx) {
    var label = row.name || row.email || (uiT('Customer #', 'לקוח #') + (row.customer_id || idx));
    var snippet = row.subject || uiT('Conversation', 'שיחה');
    var when = formatConversationDate(row);
    var av = initials(label);
    var col = avatarColor(label);

    return (
      '<a href="' + esc(chatHref(row)) + '" style="display:flex;align-items:center;gap:13px;padding:14px 16px;border-bottom:1px solid #f0f2f5;text-decoration:none;' +
      (idx === 0 ? 'background:#eef5fc;' : '') + '">' +
      '<span style="width:48px;height:48px;border-radius:50%;background:' + col[0] + ';color:' + col[1] + ';font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;flex:none;">' +
      esc(av) +
      '</span>' +
      '<div style="flex:1;min-width:0;">' +
      '<div style="font-size:16px;font-weight:' + (idx === 0 ? '800' : '700') + ';color:#1f2a3a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + esc(label) + '</div>' +
      '<div style="display:flex;align-items:center;gap:6px;margin-top:5px;">' +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9aa3b0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
      '<span style="font-size:13.5px;color:#5a6473;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(snippet) + '</span>' +
      '</div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:6px;flex:none;">' +
      messageTypeBadge(row) +
      (when ? '<span style="font-size:12px;color:' + (idx === 0 ? '#1d60a2' : '#9aa3b0') + ';font-weight:700;">' + esc(when) + '</span>' : '') +
      '</div>' +
      '</a>'
    );
  }

  function renderFiltered(elId, q) {
    var el = document.getElementById(elId);
    if (!el) return;
    var needle = String(q || '').trim().toLowerCase();
    var rows = !needle
      ? allRows
      : allRows.filter(function (r) {
          var blob = [r.name, r.email, r.subject, r.customer_id, r.phone].join(' ').toLowerCase();
          return blob.indexOf(needle) !== -1;
        });
    if (!rows.length) {
      el.innerHTML = emptyHtml();
      return;
    }
    el.innerHTML = rows.map(rowHtml).join('');
  }

  async function loadMessages(elId, opts) {
    opts = opts || {};
    var silent = !!opts.silent;
    var el = document.getElementById(elId);
    var hasRows = !!(el && el.querySelector('[data-customer-id], a, .mb-msg-row, [href*="chat"]'));
    if (!silent || !hasRows) {
      if (el) el.innerHTML = loadingHtml();
      var totalElBusy = document.getElementById('mb-messages-total');
      if (totalElBusy) totalElBusy.textContent = uiT('Loading…', 'טוען…');
    }

    try {
      var result = await MineralBarApp.listChatConversations({ page: 1, limit: 25 });
      allRows = result.rows || [];
      var total = result.total != null ? result.total : allRows.length;
      lastTotal = total;
      
      var totalEl = document.getElementById('mb-messages-total');
      if (totalEl) totalEl.textContent = total + ' ' + uiT('conversations', 'שיחות');

      el = document.getElementById(elId);
      if (!el) return;

      if (!allRows.length) {
        el.innerHTML = emptyHtml();
        return;
      }
      var search = document.getElementById('mb-messages-search');
      renderFiltered(elId, search && search.value);
    } catch (err) {
      if (silent && hasRows) {
        console.warn('[MessagesLive] silent refresh failed — keeping list', err);
        return;
      }
      console.error('[MineralBar] Chat.Conversations failed', err);
      var totalElErr = document.getElementById('mb-messages-total');
      if (totalElErr) totalElErr.textContent = uiT('API error', 'שגיאת API');
      el = document.getElementById(elId);
      if (el) el.innerHTML = errorHtml(err);
      var btn = document.getElementById('mb-messages-retry');
      if (btn) btn.addEventListener('click', function () { loadMessages(elId); });
    }
  }

  function start() {
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    var elId = 'mb-live-messages';
    if (!document.getElementById(elId)) return;
    loadMessages(elId);
  }

  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'mb-messages-search') {
      if (!allRows.length) return;
      renderFiltered('mb-live-messages', e.target.value);
    }
  });

  document.addEventListener('click', function (e) {
    if (e.target && e.target.closest('#mb-messages-refresh')) {
      loadMessages('mb-live-messages');
    }
  });

  window.addEventListener('mineralbar:ready', start);
  window.addEventListener('mineralbar:language-changed', function () {
    var elId = 'mb-live-messages';
    if (!document.getElementById(elId)) return;
    var totalEl = document.getElementById('mb-messages-total');
    if (totalEl && (lastTotal || allRows.length)) {
      totalEl.textContent = (lastTotal || allRows.length) + ' ' + uiT('conversations', 'שיחות');
    }
    var search = document.getElementById('mb-messages-search');
    if (allRows.length) renderFiltered(elId, search && search.value);
    else loadMessages(elId, { silent: true });
  });
  window.addEventListener('mineralbar:messages', function () {
    var elId = 'mb-live-messages';
    if (!document.getElementById(elId) || !window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    clearTimeout(window.__mbMessagesRtTimer);
    window.__mbMessagesRtTimer = setTimeout(function () { loadMessages(elId, { silent: true }); }, 400);
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 50); });
  } else {
    setTimeout(start, 50);
  }

  if (window.LiveSync && typeof LiveSync.bind === 'function') {
    LiveSync.bind(function () {
      if (!document.getElementById('mb-live-messages')) return;
      loadMessages('mb-live-messages', { silent: true });
    }, {
      keys: /message|chat|whatsapp|inbox|socket\.nudge/i,
      mount: '#mb-live-messages',
      delay: 300,
      retries: true
    });
  } else if (window.MineralBarApp && MineralBarApp.bindLiveReload) {
    MineralBarApp.bindLiveReload(function () {
      if (!document.getElementById('mb-live-messages')) return;
      loadMessages('mb-live-messages', { silent: true });
    }, { keys: /message|chat|whatsapp|inbox|socket\.nudge/i, delay: 400 });
  }

})();
