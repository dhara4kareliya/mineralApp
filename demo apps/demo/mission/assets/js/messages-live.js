/**
 * Live Chat.Conversations / Chat.Inbox for רשימת שיחות
 * (per https://eli.bull36.com/app/help/category/Chat)
 */
(function () {
  'use strict';

  var CHAT_PAGE = 'צ_אט עם לקוח.dc.html';
  var allRows = [];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function apiErrorText(err) {
    if (!err) return 'שגיאת API לא ידועה';
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
    return (
      '<div style="text-align:center;padding:48px 20px;">' +
      '<div style="font-size:14px;font-weight:700;color:#8a93a3;">טוען מהשרת…</div>' +
      '<div style="font-size:12px;color:#b6bdc8;margin-top:6px;">Chat.Conversations</div>' +
      '</div>'
    );
  }

  function emptyHtml() {
    return (
      '<div style="text-align:center;padding:48px 20px;">' +
      '<div style="width:56px;height:56px;border-radius:50%;background:#e3e7ec;display:flex;align-items:center;justify-content:center;margin:0 auto 13px;">' +
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#aab2bf" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
      '</div>' +
      '<div style="font-size:15px;font-weight:800;color:#5a6473;">אין שיחות כרגע</div>' +
      '<div style="font-size:12.5px;color:#9aa3b0;margin-top:6px;">Chat.Conversations · הרשימה ריקה</div>' +
      '</div>'
    );
  }

  function errorHtml(err) {
    return (
      '<div style="background:#fbeeed;border:1px solid #f0c9c4;border-radius:14px;padding:14px 14px 16px;margin:12px 16px;">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0392b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>' +
      '<div style="font-size:14px;font-weight:800;color:#c0392b;">שגיאת API</div>' +
      '</div>' +
      '<pre style="margin:0;white-space:pre-wrap;word-break:break-word;font:600 11.5px/1.5 Heebo,monospace;color:#7a2e28;max-height:280px;overflow:auto;">' +
      esc(apiErrorText(err)) +
      '</pre>' +
      '<button type="button" id="mb-messages-retry" style="margin-top:12px;padding:9px 14px;border:none;border-radius:10px;background:#c0392b;color:#fff;font:800 13px Heebo,sans-serif;cursor:pointer;">נסה שוב</button>' +
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
    return CHAT_PAGE + '?' + q.toString();
  }

  function rowHtml(row, idx) {
    var label = row.name || row.email || ('לקוח #' + (row.customer_id || idx));
    var snippet = row.subject || 'שיחה';
    var when = row.when || '';
    var av = initials(label);
    var col = avatarColor(label);
    return (
      '<a href="' + esc(chatHref(row)) + '" style="display:flex;align-items:center;gap:13px;padding:14px 16px;border-bottom:1px solid #f0f2f5;text-decoration:none;' +
      (idx === 0 ? 'background:#eef5fc;' : '') + '">' +
      '<span style="width:48px;height:48px;border-radius:50%;background:' + col[0] + ';color:' + col[1] + ';font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;flex:none;">' +
      esc(av) +
      '</span>' +
      '<div style="flex:1;min-width:0;">' +
      '<div style="font-size:16px;font-weight:' + (idx === 0 ? '800' : '700') + ';color:#1f2a3a;">' + esc(label) + '</div>' +
      '<div style="display:flex;align-items:center;gap:6px;margin-top:3px;">' +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9aa3b0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
      '<span style="font-size:13.5px;color:#5a6473;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(snippet) + '</span>' +
      '</div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:7px;flex:none;">' +
      (when ? '<span style="font-size:12.5px;color:' + (idx === 0 ? '#1d60a2' : '#9aa3b0') + ';font-weight:700;">' + esc(when) + '</span>' : '') +
      (row.customer_id ? '<span style="font-size:11px;color:#b6bdc8;font-weight:600;">#' + esc(row.customer_id) + '</span>' : '') +
      '</div>' +
      '</a>'
    );
  }

  function renderFiltered(el, q) {
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

  async function loadMessages(el) {
    el.innerHTML = loadingHtml();
    var totalEl = document.getElementById('mb-messages-total');
    if (totalEl) totalEl.textContent = 'טוען…';

    try {
      var result = await MineralBarApp.listChatConversations({ page: 1, limit: 25 });
      allRows = result.rows || [];
      var total = result.total != null ? result.total : allRows.length;
      if (totalEl) totalEl.textContent = total + ' שיחות · Chat.Conversations';

      if (!allRows.length) {
        el.innerHTML = emptyHtml();
        return;
      }
      var search = document.getElementById('mb-messages-search');
      renderFiltered(el, search && search.value);
    } catch (err) {
      console.error('[MineralBar] Chat.Conversations failed', err);
      if (totalEl) totalEl.textContent = 'שגיאת API';
      el.innerHTML = errorHtml(err);
      var btn = document.getElementById('mb-messages-retry');
      if (btn) btn.addEventListener('click', function () { loadMessages(el); });
    }
  }

  var started = false;
  function start() {
    if (started) return;
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    var el = document.getElementById('mb-live-messages');
    if (!el) return;
    started = true;
    var search = document.getElementById('mb-messages-search');
    if (search) {
      search.addEventListener('input', function () {
        if (!allRows.length) return;
        renderFiltered(el, search.value);
      });
    }
    loadMessages(el);
  }

  window.addEventListener('mineralbar:ready', start);
  window.addEventListener('mineralbar:messages', function () {
    var el = document.getElementById('mb-live-messages');
    if (!el || !window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    clearTimeout(window.__mbMessagesRtTimer);
    window.__mbMessagesRtTimer = setTimeout(function () { loadMessages(el); }, 400);
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 50); });
  } else {
    setTimeout(start, 50);
  }
})();
