/**
 * Customer chat thread — Chat.CustomerMessages + Chat.SendCustomer
 * (per https://eli.bull36.com/app/help/category/Chat)
 * Requires customer_id (aliases: cust_id, contactus_id).
 */
(function () {
  'use strict';

  var currentMessages = [];
  var currentTypeFilter = 'all';
  var selectedSendChannel = {
    channel_type: 'notes',
    from: 'send_notes'
  };

  var SEND_CHANNEL_STYLE = {
    active: 'border:1.5px solid #16223a; background:#16223a; color:#fff;',
    idleSolid: 'border:1.5px solid #e4e8ee; background:#fff; color:#1f2a3a;',
    idleDashed: 'border:1.5px dashed #d7dde6; background:#fff; color:#1f2a3a;',
    idleMuted: 'border:1.5px solid transparent; background:#f3f5f8; color:#1f2a3a;'
  };

  function applySendChannelStyles() {
    var buttons = document.querySelectorAll('.chat-send-channel');
    buttons.forEach(function (btn) {
      var channel = btn.getAttribute('data-channel') || '';
      var active = channel === selectedSendChannel.channel_type;
      var base = 'flex:none; display:inline-flex; align-items:center; gap:7px; padding:7px 12px; border-radius:99px; font-size:12.5px; font-weight:700; cursor:pointer; white-space:nowrap; font-family:inherit;';
      var look = SEND_CHANNEL_STYLE.idleSolid;
      if (active) look = SEND_CHANNEL_STYLE.active;
      else if (channel === 'quick_email') look = SEND_CHANNEL_STYLE.idleDashed;
      else if (channel === 'biz1') look = SEND_CHANNEL_STYLE.idleMuted;
      btn.setAttribute('style', base + look);
      if (active) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  function mapSendChannelToType(channel) {
    var c = String(channel || '').toLowerCase();
    if (c === 'whatsapp') return 'whatsapp';
    if (c === 'email') return 'email';
    if (c === 'quick_email') return 'quick_email';
    if (c === 'biz1') return 'biz1';
    return 'send_notes';
  }

  var toastTimer = null;
  var suppressThreadReloadUntil = 0;
  var isSending = false;

  function safeBackHref(raw) {
    if (!raw) return '';
    try { raw = decodeURIComponent(String(raw)); } catch (e) { raw = String(raw); }
    raw = String(raw || '').trim();
    if (!raw || /^javascript:/i.test(raw) || raw.indexOf('//') === 0) return '';
    if (/^https?:/i.test(raw)) {
      try {
        var abs = new URL(raw, location.href);
        if (abs.origin !== location.origin) return '';
        return (abs.pathname.split('/').pop() || '') + abs.search + abs.hash;
      } catch (e) { return ''; }
    }
    if (raw.indexOf('..') >= 0) return '';
    return raw.replace(/^\//, '');
  }

  function defaultChatBackHref() {
    var role = null;
    try {
      if (window.MineralBarApp && typeof MineralBarApp.getRole === 'function') {
        role = MineralBarApp.getRole();
      }
    } catch (e) { /* ignore */ }
    if (!role) {
      try { role = document.body.getAttribute('data-role'); } catch (e) { /* ignore */ }
    }
    // Tech users must not land on the sales/service message list
    if (role === 'tech') return 'tech-open-calls.html';
    if (role === 'service') return 'service-all-calls.html';
    return 'calls-list.html';
  }

  function resolveChatBackHref() {
    var q = new URLSearchParams(location.search || '');
    var fromParam = safeBackHref(q.get('back') || q.get('from') || q.get('return'));
    if (fromParam) return fromParam;
    try {
      var stored = safeBackHref(sessionStorage.getItem('mb_chat_back'));
      if (stored && !/chat-customer\.html/i.test(stored)) return stored;
    } catch (e) { /* ignore */ }
    return defaultChatBackHref();
  }

  function rememberChatEntry() {
    var q = new URLSearchParams(location.search || '');
    var explicit = q.get('back') || q.get('from') || q.get('return');
    if (explicit) {
      var safe = safeBackHref(explicit);
      if (safe) {
        try { sessionStorage.setItem('mb_chat_back', safe); } catch (e) { /* ignore */ }
      }
      return;
    }
    try {
      var ref = document.referrer;
      if (!ref) return;
      var u = new URL(ref);
      if (u.origin !== location.origin) return;
      if (/chat-customer|login/i.test(u.pathname)) return;
      var rel = (u.pathname.split('/').pop() || '') + u.search + u.hash;
      if (rel) sessionStorage.setItem('mb_chat_back', rel);
    } catch (e) { /* ignore */ }
  }

  function goChatBack(e) {
    if (e) {
      try {
        e.preventDefault();
        e.stopPropagation();
      } catch (err) { /* ignore */ }
    }
    var href = resolveChatBackHref();
    // Hard navigation is more reliable than history.back() in WebViews / DC remounts
    if (href) {
      window.location.href = href;
      return;
    }
    try {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
    } catch (err) { /* ignore */ }
    window.location.href = defaultChatBackHref();
  }

  function syncChatBackHref() {
    var btn = document.getElementById('mb-chat-back');
    if (!btn) return;
    var href = resolveChatBackHref();
    if (btn.tagName === 'A') btn.setAttribute('href', href);
    btn.setAttribute('data-back-href', href);
  }

  function wireChatBackButton() {
    rememberChatEntry();
    syncChatBackHref();
  }

  // Survive DC remounts: one capture-phase listener on document
  if (!window.__mbChatBackDelegated) {
    window.__mbChatBackDelegated = true;
    document.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest && e.target.closest('#mb-chat-back');
      if (!btn) return;
      goChatBack(e);
    }, true);
  }
  window.goChatBack = goChatBack;

  function showToast(message, kind) {
    var text = String(message || '').trim();
    if (!text) return;
    var existing = document.getElementById('mb-chat-toast');
    if (existing) existing.remove();
    clearTimeout(toastTimer);

    var host =
      document.querySelector('.screen-card') ||
      document.getElementById('mb-live-chat') ||
      document.body;
    if (host && host !== document.body && getComputedStyle(host).position === 'static') {
      host.style.position = 'relative';
    }

    var bg = kind === 'error' ? '#a3302e' : '#16223a';
    var el = document.createElement('div');
    el.id = 'mb-chat-toast';
    el.setAttribute('role', 'alert');
    el.style.cssText =
      'position:absolute;left:50%;bottom:92px;transform:translateX(-50%);' +
      'width:calc(100% - 28px);max-width:320px;padding:12px 14px;border-radius:12px;' +
      'background:' + bg + ';color:#fff;font-size:13px;font-weight:700;text-align:center;' +
      'z-index:99999;box-shadow:0 8px 24px rgba(15,24,40,.28);font-family:Heebo,sans-serif;' +
      'pointer-events:none;';
    el.textContent = text.length > 220 ? text.slice(0, 217) + '…' : text;
    host.appendChild(el);
  }

  function suppressThreadReload(ms) {
    suppressThreadReloadUntil = Date.now() + (ms || 4000);
  }

  function shouldReloadThread() {
    return !isSending && Date.now() >= suppressThreadReloadUntil;
  }

  var dragClickBlockUntil = {};

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

  function params() {
    var q = new URLSearchParams(location.search || '');
    var customerId = q.get('customer_id') || q.get('cust_id') || q.get('contactus_id') || '';
    return {
      customer_id: customerId,
      cust_id: customerId,
      messenger_meta_id: q.get('messenger_meta_id') || '',
      email: q.get('email') || '',
      phone: q.get('phone') || '',
      subject: q.get('subject') || '',
      name: q.get('name') || '',
      when: q.get('when') || ''
    };
  }

  function isOutgoing(row) {
    // direction 0 = staff/internal note in mineral samples; treat staff messages as outgoing
    if (row.direction === 1 || row.direction === '1') return false;
    if (row.direction === 0 || row.direction === '0') return true;
    if (row.type === 'notes' || row.type === 'send_notes') return true;
    return !!row.user_id;
  }

  function parseRowDateTime(row) {
    var rawDate = row.raw && (row.raw.inserted_date || row.raw.create_date || row.raw.last_updated || row.raw.last_update || row.time);
    var d = null;
    
    if (rawDate) {
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
    }
    
    if (!d || Number.isNaN(d.getTime())) {
      if (row.time) {
        if (/^\d{2}\.\d{2}\.\d{4}/.test(row.time)) {
          var cleanTime = row.time.replace(/,/g, '');
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
        } else {
          d = new Date(row.time);
        }
      }
    }

    if (!d || Number.isNaN(d.getTime())) {
      return { dateStr: '', timeStr: row.time || '' };
    }

    var day = d.getDate();
    var month = d.getMonth() + 1;
    var year = d.getFullYear();
    var dateStr = (day < 10 ? '0' : '') + day + '/' + (month < 10 ? '0' : '') + month + '/' + year;

    var h = d.getHours();
    var m = d.getMinutes();
    var timeStr = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;

    return { dateStr: dateStr, timeStr: timeStr };
  }

  function getMessageBadgeHtml(row) {
    var t = String(row.type || '').toLowerCase();
    var direction = isOutgoing(row) ? 'outbound' : 'inbound';
    if (t === 'notes' || t === 'send_notes') direction = 'internal';
    
    var bg = '#f0f2f5';
    var color = '#5a6473';
    var text = 'Message';
    var icon = '💬';

    if (t === 'whatsapp') {
      bg = '#e6f9ed';
      color = '#18733a';
      text = 'WhatsApp';
      icon = '💬';
    } else if (t === 'email') {
      bg = '#eaf2fb';
      color = '#1d60a2';
      text = 'Email';
      icon = '✉️';
    } else if (t === 'quick_email') {
      bg = '#eaf2fb';
      color = '#1d60a2';
      text = 'Quick email';
      icon = '⚡';
    } else if (t === 'biz1') {
      bg = '#f0f2f5';
      color = '#16223a';
      text = 'B Biz1';
      icon = 'B';
    } else if (t === 'notes' || t === 'send_notes') {
      bg = '#f3f0ff';
      color = '#6a5c9e';
      text = 'Internal notes';
      icon = '📝';
    }

    var iconHtml = icon === 'B' 
      ? '<span style="font-weight:900; font-family:monospace; margin-right:4px;">B</span>' 
      : '<span style="margin-right:4px;">' + icon + '</span>';

    return '<span style="align-self: flex-start; display: inline-flex; align-items: center; font-size: 11px; font-weight: 700; color: ' + color + '; background: ' + bg + '; padding: 3px 8px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.03); white-space: nowrap; margin-bottom: 8px;">' +
           iconHtml + ' ' + text + ' · ' + direction +
           '</span>';
  }

  function setSendChannel(channelType, fromValue) {
    selectedSendChannel = {
      channel_type: channelType || 'notes',
      from: fromValue || 'send_notes'
    };
    applySendChannelStyles();
  }

  function appendLocalMessage(msg, pending) {
    var row = {
      message: msg,
      type: mapSendChannelToType(selectedSendChannel.channel_type),
      direction: 0,
      time: nowTime(),
      _localId: 'local-' + Date.now(),
      _pending: !!pending
    };
    currentMessages.push(row);
    renderMessages('mb-live-chat', currentMessages, currentParams);
    return row._localId;
  }

  function confirmLocalMessage(localId) {
    currentMessages = currentMessages.map(function (row) {
      if (row._localId !== localId) return row;
      return Object.assign({}, row, { _pending: false });
    });
    renderMessages('mb-live-chat', currentMessages, currentParams);
  }

  function removeLocalMessage(localId) {
    currentMessages = currentMessages.filter(function (row) {
      return row._localId !== localId;
    });
    renderMessages('mb-live-chat', currentMessages, currentParams);
  }

  function bubbleIn(text, time, who, badgeHtml) {
    var badge = badgeHtml || '';
    return (
      '<div style="align-self:flex-start; width:100%; max-width:85%; background:#fff; border:1.5px solid #e7eaef; border-radius:18px; padding:14px 16px; box-shadow:0 1px 3px rgba(15,24,40,.04); display:flex; flex-direction:column; gap:4px;">' +
      badge +
      '<div style="font-size:15px; color:#1f2a3a; line-height:1.5; white-space:pre-wrap; word-break:break-word; text-align:left;">' + esc(text) + '</div>' +
      '<div style="font-size:11px; color:#8a96a3; text-align:right; margin-top:2px; font-weight:600;">' + esc(time) + '</div>' +
      '</div>'
    );
  }

  function bubbleOut(text, time, pending, who, badgeHtml) {
    var badge = badgeHtml || '';
    return (
      '<div style="align-self:flex-end; width:100%; max-width:85%; background:#fff; border:1.5px solid #e7eaef; border-radius:18px; padding:14px 16px; box-shadow:0 1px 3px rgba(15,24,40,.04); display:flex; flex-direction:column; gap:4px;">' +
      badge +
      '<div style="font-size:15px; color:#1f2a3a; line-height:1.5; white-space:pre-wrap; word-break:break-word; text-align:left;">' + esc(text) + '</div>' +
      '<div style="display:flex; align-items:center; justify-content:space-between; margin-top:2px;">' +
      (pending
        ? '<span style="font-size:11px; color:#bd8324; font-weight:600;">שולח…</span>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5aa9d6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 13l4 4 7-10"/><path d="M11 16l3 1 7-10"/></svg>') +
      '<span style="font-size:11px; color:#8a96a3; font-weight:600;">' + esc(time) + '</span>' +
      '</div></div>'
    );
  }

  function notice(kind, title, body) {
    var bg = kind === 'error' ? '#fbeeed' : (kind === 'warn' ? '#fdf1dd' : '#eaf2fb');
    var border = kind === 'error' ? '#f0c9c4' : (kind === 'warn' ? '#f0e2c2' : '#c9daf0');
    var color = kind === 'error' ? '#7a2e28' : (kind === 'warn' ? '#7a5a18' : '#1d4a7a');
    return (
      '<div style="align-self:stretch;background:' + bg + ';border:1px solid ' + border + ';border-radius:14px;padding:12px 13px;">' +
      '<div style="font-size:13px;font-weight:800;color:' + color + ';">' + esc(title) + '</div>' +
      '<pre style="margin:6px 0 0;white-space:pre-wrap;word-break:break-word;font:600 11.5px/1.45 Heebo,monospace;color:' + color + ';">' +
      esc(body) +
      '</pre></div>'
    );
  }

  function nowTime() {
    var d = new Date();
    var h = d.getHours();
    var m = d.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function fillHeader(p) {
    var name = p.name || p.email || (p.customer_id ? ('לקוח #' + p.customer_id) : 'שיחה');
    var subText = p.phone || p.customer_id || '';

    var nameEl = document.getElementById('mb-chat-name');
    var subEl = document.getElementById('mb-chat-sub');
    var avEl = document.getElementById('mb-chat-av');
    if (nameEl) nameEl.textContent = name;
    if (subEl) subEl.textContent = subText;
    if (avEl) avEl.textContent = initials(name);
    var detailsLink = document.getElementById('mb-chat-details-link');
    if (detailsLink) {
      var q = new URLSearchParams();
      var cid = p.customer_id || p.cust_id || '';
      if (cid) {
        q.set('customer_id', cid);
        q.set('cust_id', cid);
      }
      if (p.name) q.set('name', p.name);
      if (p.phone) q.set('phone', p.phone);
      if (p.email) q.set('email', p.email);
      detailsLink.href = 'chat-customer-details.html?' + q.toString();
    }
  }

  window.filterChatType = function (type) {
    currentTypeFilter = type;
    
    // Update active class on tab buttons
    var btns = document.querySelectorAll('.chat-tab-btn');
    btns.forEach(function (btn) {
      var btnId = btn.id;
      if (btnId === 'tab-filter-' + type) {
        btn.classList.add('active');
        btn.style.background = '#1c2834';
        btn.style.color = '#fff';
        btn.style.borderColor = '#1c2834';
        var dot = btn.querySelector('span');
        if (dot) dot.style.background = '#fff';
        var svg = btn.querySelector('svg');
        if (svg) svg.style.color = '#fff';
        var bSpan = btn.querySelector('span:not([style*="width"])');
        if (bSpan) bSpan.style.color = '#fff';
      } else {
        btn.classList.remove('active');
        btn.style.background = '#fff';
        btn.style.color = '#5a6473';
        btn.style.borderColor = '#e4e8ee';
        var dot = btn.querySelector('span');
        if (dot) {
          if (btnId === 'tab-filter-whatsapp') dot.style.background = '#25b35e';
          if (btnId === 'tab-filter-email') dot.style.background = '#bd3b2e';
          if (btnId === 'tab-filter-quick_email') dot.style.background = '#1d60a2';
          if (btnId === 'tab-filter-biz1') dot.style.background = '#16223a';
          if (btnId === 'tab-filter-notes') dot.style.background = '#6a5c9e';
        }
        var svg = btn.querySelector('svg');
        if (svg) svg.style.color = '#5a6473';
        var bSpan = btn.querySelector('span:not([style*="width"])');
        if (bSpan) bSpan.style.color = '#5a6473';
      }
    });

    renderMessages('mb-live-chat', currentMessages, currentParams);
  };

  function renderMessages(elId, rows, p) {
    var el = document.getElementById(elId);
    if (!el) return;
    var html = '';

    // Apply client-side channel/type filtering
    var filteredRows = rows;
    if (currentTypeFilter !== 'all') {
      filteredRows = rows.filter(function (row) {
        var t = String(row.type || '').toLowerCase();
        if (currentTypeFilter === 'whatsapp') return t === 'whatsapp';
        if (currentTypeFilter === 'email') return t === 'email';
        if (currentTypeFilter === 'quick_email') return t === 'quick_email';
        if (currentTypeFilter === 'biz1') return t === 'biz1';
        if (currentTypeFilter === 'notes') return t === 'notes' || t === 'send_notes';
        return false;
      });
    }

    if (!filteredRows.length) {
      html += notice(
        'info',
        'אין הודעות עדיין',
        'השרת החזיר רשימה ריקה.\nאפשר לשלוח הודעה ראשונה עם Chat.SendCustomer.'
      );
    } else {
      var lastDateStr = '';
      filteredRows.forEach(function (row) {
        var text = row.message || '';
        if (!text) return;

        var dt = parseRowDateTime(row);
        var dateStr = dt.dateStr;
        var timeStr = dt.timeStr;

        if (dateStr && dateStr !== lastDateStr) {
          html += '<div style="align-self:center; background:#fff; color:#5a6473; border: 1px solid #e2e8f0; font-size:12px; font-weight:700; padding:4px 14px; border-radius:99px; margin:16px 0; box-shadow: 0 1px 2px rgba(15,24,40,.04);">' + esc(dateStr) + '</div>';
          lastDateStr = dateStr;
        }

        var badge = getMessageBadgeHtml(row);
        if (isOutgoing(row)) {
          html += bubbleOut(text, timeStr, !!row._pending, row.user_name || '', badge);
        } else {
          html += bubbleIn(text, timeStr, row.user_name || '', badge);
        }
      });
    }
    el.innerHTML = html;
    el.scrollTop = el.scrollHeight;
  }

  async function loadThread(elId, p, options) {
    options = options || {};
    var silent = !!options.silent;
    var el = document.getElementById(elId);
    var localPending = (currentMessages || []).filter(function (row) {
      return row && row._localId;
    });
    if (el && !silent) {
      el.innerHTML =
        '<div style="text-align:center;padding:28px;font-size:13px;font-weight:700;color:#8a93a3;">טוען שיחה…</div>';
    }

    var messengerMetaId = p.messenger_meta_id;

    // If messenger_meta_id is missing but we have customer_id, try to fetch it via listChatConversations
    if (!messengerMetaId && p.customer_id && p.customer_id !== '0') {
      try {
        var convs = await MineralBarApp.listChatConversations({ limit: 100 });
        if (convs && convs.rows) {
          var matched = convs.rows.find(function (r) {
            return String(r.customer_id) === String(p.customer_id);
          });
          if (matched && matched.messenger_meta_id) {
            messengerMetaId = matched.messenger_meta_id;
            p.messenger_meta_id = messengerMetaId;
          }
        }
      } catch (e) {
        console.warn('Failed to fetch messenger_meta_id from Chat.Conversations', e);
      }
    }

    // If we have messenger_meta_id, use listSingleConversation (Chat.SingleConversations API)
    if (messengerMetaId) {
      try {
        var res = await MineralBarApp.listSingleConversation(messengerMetaId, { limit: 25 });
        if (res.customer_id && (!p.customer_id || p.customer_id === '0')) {
          p.customer_id = String(res.customer_id);
          p.cust_id = String(res.customer_id);
        }
        currentMessages = res.rows || [];
        if (localPending.length) currentMessages = currentMessages.concat(localPending);
        renderMessages(elId, currentMessages, p);
        fillHeader(p);
        return res.rows || [];
      } catch (err) {
        console.error('[MineralBar] Chat.SingleConversations failed', err);
        el = document.getElementById(elId);
        if (el && !silent) {
          el.innerHTML = notice('error', 'שגיאת טעינת שיחה', apiErrorText(err));
        }
        fillHeader(p);
        return [];
      }
    }

    // Fallback: if we don't have messenger_meta_id but have customer_id, load via listCustomerMessages
    if (!p.customer_id || p.customer_id === '0') {
      el = document.getElementById(elId);
      if (el && !silent) {
        el.innerHTML = notice(
          'warn',
          'חסר מזהה שיחה',
          'פתחו שיחה מרשימת שיחות או מכרטיס לקוח.\nנדרש מזהה שיחה (messenger_meta_id) או מזהה לקוח (customer_id).'
        );
      }
      return [];
    }

    try {
      var res = await MineralBarApp.listCustomerMessages(p.customer_id, { limit: 25 });
      currentMessages = res.rows || [];
      if (localPending.length) currentMessages = currentMessages.concat(localPending);
      renderMessages(elId, currentMessages, p);
      fillHeader(p);
      return res.rows || [];
    } catch (err) {
      console.error('[MineralBar] Chat.CustomerMessages failed', err);
      el = document.getElementById(elId);
      if (el && !silent) {
        el.innerHTML = notice('error', 'שגיאת טעינת שיחה', apiErrorText(err));
      }
      fillHeader(p);
      return [];
    }
  }

  async function sendMessage(p, elId) {
    var input = document.getElementById('mb-chat-input');
    if (!input) return;
    var msg = (input.value || '').trim();
    if (!msg) return;
    if (isSending) return;

    if (!p.customer_id || p.customer_id === '0') {
      showToast('Missing customer_id', 'error');
      return;
    }

    input.value = '';
    isSending = true;
    // Block socket-driven full reload after our own send (message.created)
    suppressThreadReload(5000);
    var localId = appendLocalMessage(msg, true);

    try {
      var fromVal = selectedSendChannel.from || 'send_notes';
      var channelType = selectedSendChannel.channel_type || 'notes';
      var sendPayload = {
        message: msg,
        msg: msg,
        customer_id: p.customer_id,
        cust_id: p.customer_id,
        from: fromVal
      };
      // Per Chat.SendCustomer docs: channel_type only with from=send_chat_channel
      if (fromVal === 'send_chat_channel') {
        sendPayload.channel_type = channelType;
        sendPayload.force_channel_type = true;
      }
      if (p.email) {
        sendPayload.email = p.email;
        sendPayload.chart_selected_email = p.email;
      }
      if (p.phone) {
        sendPayload.phone = p.phone;
        sendPayload.chart_selected_phone_no = p.phone;
      }
      await MineralBarApp.sendCustomerMessage(sendPayload);
      confirmLocalMessage(localId);
    } catch (err) {
      console.error('[MineralBar] Chat.SendCustomer failed', err);
      removeLocalMessage(localId);
      var failText = (err && err.message) || apiErrorText(err);
      // Prefer clean API message for soft channel failures
      if (err && err.raw && (err.raw.message_return || err.raw.message)) {
        failText = String(err.raw.message_return || err.raw.message).trim();
      }
      showToast(failText, 'error');
    } finally {
      isSending = false;
    }
  }

  var currentParams = null;
  function go() {
    if (currentParams) {
      sendMessage(currentParams, 'mb-live-chat');
    }
  }

  document.addEventListener('click', function(e) {
    var filterBtn = e.target.closest('.chat-tab-btn');
    if (filterBtn) {
      if ((dragClickBlockUntil['mb-chat-filter-tabs'] || 0) > Date.now()) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      var filter = filterBtn.getAttribute('data-filter') || 'all';
      if (typeof window.filterChatType === 'function') window.filterChatType(filter);
      return;
    }
    var channelBtn = e.target.closest('.chat-send-channel');
    if (channelBtn) {
      e.preventDefault();
      if ((dragClickBlockUntil['mb-chat-send-channels'] || 0) > Date.now()) return;
      setSendChannel(
        channelBtn.getAttribute('data-channel') || 'notes',
        channelBtn.getAttribute('data-from') || 'send_notes'
      );
      return;
    }
    if (e.target.closest('#mb-chat-send')) {
      go();
    }
    var quoteLink = e.target.closest('#mb-chat-quote-link');
    if (quoteLink) {
      e.preventDefault();
      var q = new URLSearchParams();
      var p = currentParams || params();
      var cid = p.customer_id || p.cust_id || '';
      if (!cid) {
        try {
          cid = sessionStorage.getItem('mb_customer_id') || localStorage.getItem('mb_customer_id') || '';
        } catch(err) {}
      }
      if (cid) {
        q.set('customer_id', cid);
        q.set('cust_id', cid);
      }
      if (p.name) q.set('name', p.name);
      if (p.phone) q.set('phone', p.phone);
      if (p.email) q.set('email', p.email);
      location.href = 'service-quote-form.html?' + q.toString();
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.target && e.target.id === 'mb-chat-input') {
      if (e.key === 'Enter') {
        e.preventDefault();
        go();
      }
    }
  });

  function setupDragToScroll(elId) {
    var slider = document.getElementById(elId);
    if (!slider || slider.__mbDragScroll) return;
    slider.__mbDragScroll = true;
    dragClickBlockUntil[elId] = 0;
    slider.classList.add('mb-h-drag');

    var dragging = false;
    var startX = 0;
    var scrollLeft = 0;
    var moved = false;

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      slider.classList.remove('is-dragging');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      dragClickBlockUntil[elId] = Date.now() + (moved ? 180 : 0);
    }

    function onMouseMove(e) {
      if (!dragging) return;
      var walk = e.pageX - startX;
      if (Math.abs(walk) > 4) {
        moved = true;
        dragClickBlockUntil[elId] = Date.now() + 180;
      }
      slider.scrollLeft = scrollLeft - walk;
      if (moved) e.preventDefault();
    }

    function onMouseUp() {
      endDrag();
    }

    slider.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      dragging = true;
      moved = false;
      dragClickBlockUntil[elId] = 0;
      startX = e.pageX;
      scrollLeft = slider.scrollLeft;
      slider.classList.add('is-dragging');
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // Touch: native horizontal pan works once overflow-x is allowed;
    // still track movement so click-select is blocked after a swipe.
    var touchStartX = 0;
    var touchScrollLeft = 0;
    slider.addEventListener('touchstart', function (e) {
      if (!e.touches || !e.touches[0]) return;
      moved = false;
      dragClickBlockUntil[elId] = 0;
      touchStartX = e.touches[0].pageX;
      touchScrollLeft = slider.scrollLeft;
    }, { passive: true });

    slider.addEventListener('touchmove', function (e) {
      if (!e.touches || !e.touches[0]) return;
      var walk = e.touches[0].pageX - touchStartX;
      if (Math.abs(walk) > 6) {
        moved = true;
        dragClickBlockUntil[elId] = Date.now() + 180;
      }
      // Keep scroll in sync even if browser doesn't pan perfectly
      slider.scrollLeft = touchScrollLeft - walk;
    }, { passive: true });

    slider.addEventListener('touchend', function () {
      dragClickBlockUntil[elId] = Date.now() + (moved ? 180 : 0);
    });

    slider.addEventListener('touchcancel', function () {
      dragClickBlockUntil[elId] = 0;
    });

    // Wheel → horizontal scroll (trackpads / shift+wheel)
    slider.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && slider.scrollWidth > slider.clientWidth) {
        slider.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });
  }

  function initHorizontalDrags() {
    setupDragToScroll('mb-chat-filter-tabs');
    setupDragToScroll('mb-chat-send-channels');
  }

  async function start() {
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    var elId = 'mb-live-chat';
    if (!document.getElementById(elId)) return;

    initHorizontalDrags();
    applySendChannelStyles();

    var p = params();
    currentParams = p;
    fillHeader(p);
    // Quotation navigation is handled via document click event delegation

    await loadThread(elId, p);
  }

  window.addEventListener('mineralbar:ready', function () {
    wireChatBackButton();
    start();
  });
  window.addEventListener('mineralbar:messages', function () {
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    var elId = 'mb-live-chat';
    if (!document.getElementById(elId)) return;
    // Do not wipe / reload conversation after our own Chat.SendCustomer
    if (!shouldReloadThread()) return;
    clearTimeout(window.__mbChatRtTimer);
    window.__mbChatRtTimer = setTimeout(function () {
      if (!shouldReloadThread()) return;
      loadThread(elId, params(), { silent: true });
    }, 400);
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      wireChatBackButton();
      initHorizontalDrags();
      setTimeout(wireChatBackButton, 100);
      setTimeout(wireChatBackButton, 500);
      setTimeout(start, 50);
    });
  } else {
    wireChatBackButton();
    initHorizontalDrags();
    setTimeout(wireChatBackButton, 100);
    setTimeout(wireChatBackButton, 500);
    setTimeout(start, 50);
  }
})();
