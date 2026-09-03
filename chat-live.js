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

    // Mount on the phone shell (composer parent), NOT #mb-live-chat —
    // that scroll area clips absolute toasts so "no phone" looked like a dead call button.
    var composer = document.getElementById('mb-chat-composer');
    var host = (composer && composer.parentElement) || document.body;
    if (host && host !== document.body && getComputedStyle(host).position === 'static') {
      host.style.position = 'relative';
    }

    var bg = kind === 'error' ? '#a3302e' : '#16223a';
    var el = document.createElement('div');
    el.id = 'mb-chat-toast';
    el.setAttribute('role', 'alert');
    el.style.cssText =
      'position:absolute;left:50%;bottom:100px;transform:translateX(-50%);' +
      'width:calc(100% - 28px);max-width:320px;padding:12px 14px;border-radius:12px;' +
      'background:' + bg + ';color:#fff;font-size:13px;font-weight:700;text-align:center;' +
      'z-index:99999;box-shadow:0 8px 24px rgba(15,24,40,.28);font-family:Heebo,sans-serif;' +
      'pointer-events:none;';
    el.textContent = text.length > 220 ? text.slice(0, 217) + '…' : text;
    host.appendChild(el);
    toastTimer = setTimeout(function () {
      if (el.parentNode) el.remove();
    }, 2800);
  }

  function suppressThreadReload(ms) {
    suppressThreadReloadUntil = Date.now() + (ms || 4000);
  }

  function shouldReloadThread() {
    return !isSending && Date.now() >= suppressThreadReloadUntil;
  }

  var _threadInFlight = null;
  var _chatBooted = false;
  var _chatBootAt = 0;
  var _socketThreadRefreshTimer = null;

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
    var direction = isOutgoing(row)
      ? chatT('outbound', 'יוצא')
      : chatT('inbound', 'נכנס');
    if (t === 'notes' || t === 'send_notes') direction = chatT('internal', 'פנימי');
    
    var bg = '#f0f2f5';
    var color = '#5a6473';
    var text = chatT('Message', 'הודעה');
    var icon = '💬';

    if (t === 'whatsapp') {
      bg = '#e6f9ed';
      color = '#18733a';
      text = 'WhatsApp';
      icon = '💬';
    } else if (t === 'email') {
      bg = '#eaf2fb';
      color = '#1d60a2';
      text = chatT('Email', 'מייל');
      icon = '✉️';
    } else if (t === 'quick_email') {
      bg = '#eaf2fb';
      color = '#1d60a2';
      text = chatT('Quick email', 'מייל מהיר');
      icon = '⚡';
    } else if (t === 'biz1') {
      bg = '#f0f2f5';
      color = '#16223a';
      text = 'B Biz1';
      icon = 'B';
    } else if (t === 'notes' || t === 'send_notes') {
      bg = '#f3f0ff';
      color = '#6a5c9e';
      text = chatT('Internal notes', 'הערות פנימיות');
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
      // Drop local id so a later thread reload won't keep a second copy
      var next = Object.assign({}, row, { _pending: false });
      delete next._localId;
      return next;
    });
    renderMessages('mb-live-chat', currentMessages, currentParams);
  }

  function removeLocalMessage(localId) {
    currentMessages = currentMessages.filter(function (row) {
      return row._localId !== localId;
    });
    renderMessages('mb-live-chat', currentMessages, currentParams);
  }

  function messageDedupeKey(row) {
    var rawId = row && (row.id || row.message_id || row.messageId || row._id);
    if (rawId && typeof rawId === 'object') rawId = rawId.$oid || rawId.id || '';
    if (rawId != null && String(rawId).trim()) return 'id|' + String(rawId).trim();
    var text = String((row && (row.message || row.msg || row.body)) || '').trim().replace(/\s+/g, ' ');
    var type = String((row && row.type) || '').toLowerCase();
    var time = String((row && (row.time || row.created || row.created_at || row.create_date)) || '').trim();
    var direction = String((row && row.direction) == null ? '' : row.direction);
    return type + '|' + text + '|' + time + '|' + direction;
  }

  function mergeServerAndLocalMessages(serverRows, localRows) {
    var merged = Array.isArray(serverRows) ? serverRows.slice() : [];
    var seen = {};
    merged.forEach(function (row) {
      seen[messageDedupeKey(row)] = true;
    });
    (localRows || []).forEach(function (row) {
      if (!row || !row._pending) return; // only keep in-flight optimistic rows
      var key = messageDedupeKey(row);
      if (seen[key]) return;
      seen[key] = true;
      merged.push(row);
    });
    return merged;
  }

  function resolveChatHref(href) {
    var out = String(href || '');
    if (/^biz1upload\//i.test(out) && window.MineralBarApp && typeof MineralBarApp.resolveFileUrl === 'function') {
      out = MineralBarApp.resolveFileUrl(out) || out;
    }
    return out;
  }

  function hrefMediaKind(href) {
    var h = String(href || '');
    if (/\.(png|jpe?g|gif|webp|bmp)(\?|$)/i.test(h)) return 'image';
    if (/\.pdf(\?|$)/i.test(h)) return 'pdf';
    if (/\.(mp3|wav|m4a|aac|ogg|oga|flac|opus|weba)(\?|$)/i.test(h) ||
        /(^|[\/._-])voice[-_].+\.(webm|ogg|m4a|mp3)(\?|$)/i.test(h) ||
        /(?:^|[\/._-])(?:audio|ptt|voice)[\/._-]/i.test(h)) {
      return 'audio';
    }
    if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(h)) return 'video';
    return '';
  }

  function looksLikeMediaFileName(text) {
    var t = String(text || '').trim();
    if (!t) return false;
    try { t = decodeURIComponent(t); } catch (e0) { /* keep raw */ }
    t = t.replace(/\\/g, '/').split('/').pop();
    return /\.(mp3|wav|m4a|aac|ogg|oga|flac|opus|weba|mp4|webm|mov|m4v|png|jpe?g|gif|webp|bmp|pdf)$/i.test(t);
  }

  function stripMediaFileNameLines(text) {
    var lines = String(text || '').split(/\r?\n/);
    var kept = [];
    for (var i = 0; i < lines.length; i++) {
      if (looksLikeMediaFileName(lines[i])) continue;
      kept.push(lines[i]);
    }
    return kept.join('\n').replace(/^\s+|\s+$/g, '');
  }

  function audioPlayerHtml(safeHref) {
    return '<div class="mb-chat-audio-wrap" style="margin:4px 0;">' +
      '<audio class="mb-chat-audio" controls loop playsinline preload="auto" src="' + safeHref +
      '" style="width:100%; max-width:260px; height:40px; display:block;"></audio></div>';
  }

  var parkedChatMedia = null;

  function mediaSrcKey(el) {
    return String((el && (el.getAttribute('src') || el.currentSrc)) || '').split('?')[0];
  }

  function pauseOtherChatMedia(keep) {
    var root = document.getElementById('mb-live-chat') || document;
    var nodes = root.querySelectorAll('audio, video');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i] !== keep && !nodes[i].paused) {
        try {
          nodes[i].setAttribute('data-mb-user-stop', '1');
          nodes[i].pause();
        } catch (e0) { /* ignore */ }
      }
    }
    if (parkedChatMedia && parkedChatMedia !== keep && !parkedChatMedia.paused) {
      try {
        parkedChatMedia.setAttribute('data-mb-user-stop', '1');
        parkedChatMedia.pause();
      } catch (e1) { /* ignore */ }
    }
  }

  function replayChatMedia(el) {
    if (!el || el.getAttribute('data-mb-user-stop') === '1') return;
    el.loop = true;
    el.setAttribute('data-mb-replaying', '1');
    try { el.currentTime = 0; } catch (e0) { /* ignore */ }
    var p = el.play();
    var clear = function () { el.removeAttribute('data-mb-replaying'); };
    if (p && typeof p.then === 'function') {
      p.then(clear).catch(function () {
        var src = el.getAttribute('src') || el.currentSrc || '';
        if (!src) { clear(); return; }
        var clean = String(src).replace(/([?&])_r=\d+/g, '$1').replace(/[?&]$/, '');
        el.src = clean + (clean.indexOf('?') >= 0 ? '&' : '?') + '_r=' + Date.now();
        el.loop = true;
        el.play().catch(function () {}).then(clear, clear);
      });
    } else {
      setTimeout(clear, 120);
    }
  }

  function enableChatAudioLoop(el) {
    if (!el) return;
    el.loop = true;
    el.setAttribute('loop', '');
    el.setAttribute('playsinline', '');
    if (el.getAttribute('data-mb-loop')) return;
    el.setAttribute('data-mb-loop', '1');

    function nearEnd() {
      var d = el.duration;
      return !!(d && isFinite(d) && d > 0 && (d - (el.currentTime || 0)) < 0.2);
    }

    el.addEventListener('play', function () {
      el.removeAttribute('data-mb-user-stop');
      pauseOtherChatMedia(el);
    });
    el.addEventListener('pause', function () {
      if (el.getAttribute('data-mb-replaying')) return;
      if (el.ended || nearEnd()) {
        replayChatMedia(el);
        return;
      }
      el.setAttribute('data-mb-user-stop', '1');
    });
    el.addEventListener('ended', function () {
      replayChatMedia(el);
    });
    el.addEventListener('timeupdate', function () {
      if (el.getAttribute('data-mb-user-stop') === '1' || el.paused) return;
      if (!nearEnd()) return;
      el.setAttribute('data-mb-replaying', '1');
      try { el.currentTime = 0.04; } catch (e1) { replayChatMedia(el); }
      setTimeout(function () { el.removeAttribute('data-mb-replaying'); }, 100);
    });
  }

  function makeLoopingAudio(src) {
    var audio = document.createElement('audio');
    audio.className = 'mb-chat-audio';
    audio.controls = true;
    audio.loop = true;
    audio.preload = 'auto';
    audio.setAttribute('playsinline', '');
    audio.src = src || '';
    audio.setAttribute('style', 'width:100%; max-width:260px; height:40px; display:block;');
    enableChatAudioLoop(audio);
    return audio;
  }

  function parkPlayingChatMedia(root) {
    if (parkedChatMedia && parkedChatMedia.parentNode && !parkedChatMedia.paused) {
      return parkedChatMedia;
    }
    parkedChatMedia = null;
    if (!root) return null;
    var nodes = root.querySelectorAll('audio.mb-chat-audio, video.mb-chat-maybe-audio');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.paused || n.getAttribute('data-mb-user-stop') === '1') continue;
      parkedChatMedia = n;
      document.body.appendChild(n);
      n.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
      return n;
    }
    return null;
  }

  function restoreParkedChatMedia(root) {
    var parked = parkedChatMedia;
    if (!parked || !root) return;
    var src = mediaSrcKey(parked);
    if (!src) return;
    var nodes = root.querySelectorAll('audio.mb-chat-audio, video.mb-chat-maybe-audio');
    var match = null;
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i] === parked) { match = nodes[i]; break; }
      var s = mediaSrcKey(nodes[i]);
      if (s && (s === src || src.indexOf(s) >= 0 || s.indexOf(src) >= 0)) {
        match = nodes[i];
        break;
      }
    }
    parked.style.cssText = 'width:100%; max-width:260px; height:40px; display:block;';
    if (parked.tagName !== 'VIDEO') parked.className = 'mb-chat-audio';
    if (match && match !== parked && match.parentNode) {
      match.parentNode.replaceChild(parked, match);
      parkedChatMedia = null;
    } else if (match === parked) {
      parkedChatMedia = null;
    }
  }

  function messagesDomKey(rows) {
    var seen = {};
    var parts = [String(currentTypeFilter || 'all')];
    (rows || []).forEach(function (row) {
      var text = row && row.message ? String(row.message) : '';
      if (!text) return;
      var dk = messageDedupeKey(row);
      if (seen[dk]) return;
      seen[dk] = true;
      parts.push(dk + '\x1f' + (row._pending ? '1' : '0') + '\x1f' + String(row.user_name || ''));
    });
    return parts.join('\x1e');
  }

  function formatMessageBody(text) {
    var raw = String(text == null ? '' : text);
    if (!raw) return '';
    var urlRe = /(https?:\/\/[^\s<>"']+|biz1upload\/[^\s<>"']+)/gi;
    var parts = [];
    var last = 0;
    var m;
    while ((m = urlRe.exec(raw)) !== null) {
      if (m.index > last) parts.push({ type: 'text', value: raw.slice(last, m.index) });
      parts.push({ type: 'url', value: m[0] });
      last = m.index + m[0].length;
    }
    if (last < raw.length) parts.push({ type: 'text', value: raw.slice(last) });
    if (!parts.length) parts.push({ type: 'text', value: raw });

    var hasMedia = parts.some(function (part) {
      if (part.type !== 'url') return false;
      var kind = hrefMediaKind(resolveChatHref(part.value));
      return kind === 'audio' || kind === 'video' || kind === 'image';
    });

    return parts.map(function (part) {
      if (part.type !== 'url') {
        var shown = hasMedia ? stripMediaFileNameLines(part.value) : part.value;
        return shown ? esc(shown) : '';
      }
      var href = resolveChatHref(part.value);
      var safeHref = esc(href);
      var kind = hrefMediaKind(href);
      if (kind === 'image') {
        return '<a href="' + safeHref + '" target="_blank" rel="noopener" style="display:block; margin:4px 0;">' +
          '<img src="' + safeHref + '" alt="" style="max-width:100%; max-height:220px; border-radius:12px; display:block;"/>' +
          '</a>';
      }
      if (kind === 'pdf') {
        return '<a href="' + safeHref + '" target="_blank" rel="noopener" style="display:flex; align-items:center; gap:8px; margin:6px 0; padding:10px 12px; border:1.5px solid #dbe7f5; border-radius:12px; background:#f4f8fd; color:#1d60a2; text-decoration:none; font-weight:800; font-size:13.5px;">' +
          '<span style="font-size:18px; line-height:1;">📄</span>' +
          '<span style="word-break:break-word;">' + chatT('Open service form PDF', 'פתח טופס שירות PDF') + '</span>' +
          '</a>';
      }
      // Audio / voice: player only — no filename, no CDN URL, no black video frame
      if (kind === 'audio') {
        return audioPlayerHtml(safeHref);
      }
      if (kind === 'video') {
        return '<div class="mb-chat-audio-wrap" style="margin:4px 0;">' +
          '<video class="mb-chat-maybe-audio" controls loop playsinline preload="auto" src="' + safeHref +
          '" style="width:100%; max-width:260px; height:40px; display:block; border-radius:10px; background:transparent;"></video></div>';
      }
      var label = esc(part.value);
      return '<a href="' + safeHref + '" target="_blank" rel="noopener" style="color:#1d60a2; text-decoration:underline; word-break:break-all;">' + label + '</a>';
    }).join('');
  }

  function bindMaybeAudioVideo(vid) {
    if (!vid || vid.getAttribute('data-mb-bound')) return;
    vid.setAttribute('data-mb-bound', '1');
    var apply = function () {
      if (!vid.parentNode) return;
      var w = vid.videoWidth || 0;
      var h = vid.videoHeight || 0;
      // Audio-only mp4/webm (WhatsApp audio) reports 0×0 — show play bar, not a black screen
      if (w < 16 || h < 16) {
        var wasPlaying = !vid.paused && vid.getAttribute('data-mb-user-stop') !== '1';
        var t = vid.currentTime || 0;
        var audio = makeLoopingAudio(vid.currentSrc || vid.getAttribute('src') || '');
        vid.parentNode.replaceChild(audio, vid);
        if (wasPlaying) {
          audio.removeAttribute('data-mb-user-stop');
          try { audio.currentTime = t; } catch (e2) { /* ignore */ }
          audio.play().catch(function () {});
        }
        return;
      }
      vid.classList.add('mb-is-video');
      vid.style.height = 'auto';
      vid.style.maxHeight = '220px';
      vid.style.background = '#0f1828';
    };
    vid.addEventListener('loadedmetadata', apply);
    vid.addEventListener('error', function () {
      if (!vid.parentNode) return;
      vid.parentNode.replaceChild(makeLoopingAudio(vid.getAttribute('src') || ''), vid);
    });
    if (vid.readyState >= 1) apply();
  }

  function bindChatMediaPlayers(root) {
    if (!root) return;
    var videos = root.querySelectorAll('video.mb-chat-maybe-audio');
    for (var i = 0; i < videos.length; i++) {
      enableChatAudioLoop(videos[i]);
      bindMaybeAudioVideo(videos[i]);
    }
    var audios = root.querySelectorAll('audio.mb-chat-audio');
    for (var j = 0; j < audios.length; j++) enableChatAudioLoop(audios[j]);
  }

  function bubbleIn(text, time, who, badgeHtml) {
    var badge = badgeHtml || '';
    return (
      '<div style="align-self:flex-start; width:100%; max-width:85%; background:#fff; border:1.5px solid #e7eaef; border-radius:18px; padding:14px 16px; box-shadow:0 1px 3px rgba(15,24,40,.04); display:flex; flex-direction:column; gap:4px;">' +
      badge +
      '<div style="font-size:15px; color:#1f2a3a; line-height:1.5; white-space:pre-wrap; word-break:break-word; text-align:left;">' + formatMessageBody(text) + '</div>' +
      '<div style="font-size:11px; color:#8a96a3; text-align:right; margin-top:2px; font-weight:600;">' + esc(time) + '</div>' +
      '</div>'
    );
  }

  function bubbleOut(text, time, pending, who, badgeHtml) {
    var badge = badgeHtml || '';
    return (
      '<div style="align-self:flex-end; width:100%; max-width:85%; background:#fff; border:1.5px solid #e7eaef; border-radius:18px; padding:14px 16px; box-shadow:0 1px 3px rgba(15,24,40,.04); display:flex; flex-direction:column; gap:4px;">' +
      badge +
      '<div style="font-size:15px; color:#1f2a3a; line-height:1.5; white-space:pre-wrap; word-break:break-word; text-align:left;">' + formatMessageBody(text) + '</div>' +
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

  function telHref(raw) {
    var s = String(raw || '').replace(/\D/g, '');
    if (!s) return '';
    if (s.indexOf('972') === 0) return 'tel:+' + s;
    if (s.charAt(0) === '0') return 'tel:+972' + s.slice(1);
    return 'tel:' + s;
  }

  function pickCustomerPhone(c) {
    if (!c || typeof c !== 'object') return '';
    return String(
      c.mobile || c.phone || c.cellular || c.second_phone ||
      c.cust_phone || c.phone_no || c.cellphone || ''
    ).trim();
  }

  function unwrapCustomer(res) {
    var c = (res && res.customer) || {};
    if (c.data && typeof c.data === 'object' && (c.data.name || c.data.customer_id || c.data.mobile || c.data.phone)) {
      c = c.data;
    }
    return c;
  }

  function openTel(href) {
    if (!href) return false;
    try {
      var a = document.createElement('a');
      a.href = href;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    } catch (err) {
      try {
        window.location.href = href;
        return true;
      } catch (err2) {
        return false;
      }
    }
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
      // Back from Customer Card should leave chat (messages list / entry), not reopen the thread.
      try {
        var entry = (typeof resolveChatBackHref === 'function')
          ? resolveChatBackHref()
          : (safeBackHref((new URLSearchParams(location.search || '')).get('back')) || 'calls-list.html');
        if (entry) q.set('back', entry);
      } catch (eBack) {
        q.set('back', 'calls-list.html');
      }
      detailsLink.href = 'chat-customer-details.html?' + q.toString();
    }
    var callBtn = document.getElementById('mb-chat-call-btn');
    if (callBtn) {
      var href = telHref(p.phone);
      callBtn.setAttribute('href', href || '#');
      callBtn.setAttribute('data-has-phone', href ? '1' : '0');
      callBtn.style.opacity = href ? '1' : '0.45';
    }
  }

  function applyResolvedPhone(p, phone) {
    if (!phone) return;
    if (currentParams) currentParams.phone = phone;
    if (p) p.phone = phone;
    fillHeader(Object.assign({}, p || currentParams || params(), { phone: phone }));
  }

  function resolveCustomerPhone(p) {
    p = p || currentParams || params() || {};
    if (telHref(p.phone)) return Promise.resolve(String(p.phone || '').trim());
    var cid = p.customer_id || p.cust_id || '';
    if (!cid || !window.MineralBarApp || typeof MineralBarApp.getCustomer !== 'function') {
      return Promise.resolve('');
    }
    return MineralBarApp.getCustomer(cid).then(function (res) {
      var phone = pickCustomerPhone(unwrapCustomer(res));
      if (phone) applyResolvedPhone(p, phone);
      return phone;
    }).catch(function () {
      return '';
    });
  }

  function dialCurrentCustomer(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    var p = currentParams || params() || {};
    var href = telHref(p.phone);
    if (href) {
      openTel(href);
      return;
    }
    var cid = p.customer_id || p.cust_id || '';
    if (!cid) {
      showToast(chatT('No phone number for this customer', 'אין מספר טלפון ללקוח זה'), 'error');
      return;
    }
    showToast(chatT('Looking up phone…', 'מחפש מספר טלפון…'));
    resolveCustomerPhone(p).then(function (phone) {
      var h = telHref(phone);
      if (h) {
        openTel(h);
      } else {
        showToast(chatT('No phone number for this customer', 'אין מספר טלפון ללקוח זה'), 'error');
      }
    });
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
      var seenKeys = {};
      filteredRows.forEach(function (row) {
        var text = row.message || '';
        if (!text) return;
        var key = messageDedupeKey(row);
        if (seenKeys[key]) return;
        seenKeys[key] = true;

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
    var domKey = messagesDomKey(filteredRows);
    if (el.getAttribute('data-mb-dom-key') === domKey && el.querySelector('audio, video')) {
      if (parkedChatMedia) restoreParkedChatMedia(el);
      return;
    }
    var playing = parkPlayingChatMedia(el);
    el.innerHTML = html;
    el.setAttribute('data-mb-dom-key', domKey);
    bindChatMediaPlayers(el);
    restoreParkedChatMedia(el);
    if (!playing || playing.paused) el.scrollTop = el.scrollHeight;
  }

  async function loadThread(elId, p, options) {
    options = options || {};
    // Coalesce overlapping loads — boot + ready + LiveSync were stacking SingleConversations
    if (_threadInFlight) return _threadInFlight;
    _threadInFlight = (async function () {
      try {
        return await loadThreadBody(elId, p, options);
      } finally {
        _threadInFlight = null;
      }
    })();
    return _threadInFlight;
  }

  async function loadThreadBody(elId, p, options) {
    options = options || {};
    var silent = !!options.silent;
    var el = document.getElementById(elId);
    var localPending = (currentMessages || []).filter(function (row) {
      return row && row._localId && row._pending;
    });
    if (el && !silent) {
      if (window.MineralBarLoader && typeof MineralBarLoader.inlineHtml === 'function') {
        el.innerHTML = MineralBarLoader.inlineHtml(chatT('Loading conversation…', 'טוען שיחה…'));
      } else {
        el.innerHTML =
          '<div class="mb-inline-loader">' +
          '<div class="mb-page-loader__spin" aria-hidden="true"></div>' +
          '<div class="mb-page-loader__label">טוען שיחה…</div>' +
          '</div>';
      }
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
        currentMessages = mergeServerAndLocalMessages(res.rows || [], localPending);
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
      var res2 = await MineralBarApp.listCustomerMessages(p.customer_id, { limit: 25 });
      currentMessages = mergeServerAndLocalMessages(res2.rows || [], localPending);
      renderMessages(elId, currentMessages, p);
      fillHeader(p);
      return res2.rows || [];
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

  function chatT(en, he) {
    if (typeof window.mbT === 'function') return window.mbT(en, he);
    try {
      if (typeof window.getCurrentLanguage === 'function') {
        return window.getCurrentLanguage() === 'en' ? en : (he || en);
      }
    } catch (e0) { /* ignore */ }
    try {
      var lang = (document.documentElement.getAttribute('lang') || document.body.getAttribute('data-lang') || '').toLowerCase();
      if (lang.indexOf('he') === 0 && he) return he;
      if (lang.indexOf('en') === 0) return en;
    } catch (e1) { /* ignore */ }
    return he || en;
  }

  function setAttachMenuOpen(open) {
    var menu = document.getElementById('mb-chat-attach-menu');
    var btn = document.getElementById('mb-chat-attach-btn');
    if (!menu) return;
    if (open) menu.classList.add('mb-open');
    else menu.classList.remove('mb-open');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function isAttachMenuOpen() {
    var menu = document.getElementById('mb-chat-attach-menu');
    return !!(menu && menu.classList.contains('mb-open'));
  }

  function setAttachPreviewOpen(open) {
    var box = document.getElementById('mb-chat-attach-preview');
    if (!box) return;
    if (open) box.classList.add('mb-open');
    else box.classList.remove('mb-open');
  }

  function resolveChatCustomerId(p) {
    p = p || currentParams || params() || {};
    var cid = p.customer_id || p.cust_id || '';
    if (!cid || cid === '0') {
      try {
        cid = sessionStorage.getItem('mb_customer_id') || localStorage.getItem('mb_customer_id') || '';
      } catch (e) { /* ignore */ }
    }
    if (!cid || cid === '0') {
      var q = new URLSearchParams(location.search || '');
      cid = q.get('customer_id') || q.get('cust_id') || q.get('contactus_id') || '';
    }
    return cid ? String(cid) : '';
  }

  function buildSendPayload(p, msg) {
    var fromVal = selectedSendChannel.from || 'send_notes';
    var channelType = selectedSendChannel.channel_type || 'notes';
    var customerId = resolveChatCustomerId(p);
    var sendPayload = {
      message: msg,
      msg: msg,
      customer_id: customerId,
      cust_id: customerId,
      from: fromVal
    };
    if (fromVal === 'send_chat_channel') {
      sendPayload.channel_type = channelType;
      sendPayload.force_channel_type = true;
    }
    if (p && p.email) {
      sendPayload.email = p.email;
      sendPayload.chart_selected_email = p.email;
    }
    if (p && p.phone) {
      sendPayload.phone = p.phone;
      sendPayload.chart_selected_phone_no = p.phone;
    }
    return sendPayload;
  }

  var pendingAttachment = null; // { file, kind, name, previewUrl }
  var lastAttachToken = '';

  function clearPendingAttachment() {
    if (pendingAttachment && pendingAttachment.previewUrl) {
      try { URL.revokeObjectURL(pendingAttachment.previewUrl); } catch (e0) { /* ignore */ }
    }
    pendingAttachment = null;
    var thumb = document.getElementById('mb-chat-attach-thumb');
    var nameEl = document.getElementById('mb-chat-attach-name');
    if (thumb) thumb.innerHTML = '';
    if (nameEl) nameEl.textContent = '';
    setAttachPreviewOpen(false);
  }

  function renderPendingAttachment() {
    var thumb = document.getElementById('mb-chat-attach-thumb');
    var nameEl = document.getElementById('mb-chat-attach-name');
    var hintEl = document.getElementById('mb-chat-attach-hint');
    if (!thumb || !nameEl) return;
    if (!pendingAttachment || !pendingAttachment.file) {
      clearPendingAttachment();
      return;
    }
    // After file pick: hide Image/File/Music menu, show only selected preview
    setAttachMenuOpen(false);
    nameEl.textContent = pendingAttachment.name || pendingAttachment.file.name || 'file';
    if (hintEl) hintEl.textContent = chatT('Ready to send', 'מוכן לשליחה');
    thumb.innerHTML = '';
    var isImage = pendingAttachment.kind === 'image' ||
      (pendingAttachment.file.type && pendingAttachment.file.type.indexOf('image/') === 0);
    if (isImage && pendingAttachment.previewUrl) {
      var img = document.createElement('img');
      img.src = pendingAttachment.previewUrl;
      img.alt = nameEl.textContent;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      thumb.appendChild(img);
    } else if (pendingAttachment.kind === 'voice') {
      thumb.innerHTML = '<svg fill="none" height="22" stroke="#e24b4b" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" viewBox="0 0 24 24" width="22"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><path d="M12 19v3"></path></svg>';
    } else if (pendingAttachment.kind === 'music') {
      thumb.innerHTML = '<svg fill="none" height="22" stroke="#1f2a3a" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" viewBox="0 0 24 24" width="22"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>';
    } else if (pendingAttachment.kind === 'video') {
      thumb.innerHTML = '<svg fill="none" height="22" stroke="#1d60a2" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" viewBox="0 0 24 24" width="22"><rect height="14" rx="2" width="16" x="3" y="5"></rect><path d="m16 12 5-3v6l-5-3z"></path></svg>';
    } else {
      thumb.innerHTML = '<svg fill="none" height="22" stroke="#6b7280" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" viewBox="0 0 24 24" width="22"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path></svg>';
    }
    setAttachPreviewOpen(true);
  }

  function setPendingAttachment(file, kind) {
    if (!file) return;
    var token = [kind, file.name, file.size, file.lastModified].join('|');
    if (token === lastAttachToken && pendingAttachment) {
      setAttachMenuOpen(false);
      setAttachPreviewOpen(true);
      return;
    }
    lastAttachToken = token;

    clearPendingAttachment();
    var previewUrl = '';
    var wantPreview = kind === 'image' || (file.type && file.type.indexOf('image/') === 0);
    if (wantPreview) {
      try { previewUrl = URL.createObjectURL(file); } catch (e1) { previewUrl = ''; }
    }
    pendingAttachment = {
      file: file,
      kind: kind || 'file',
      name: file.name || (kind + '-upload'),
      previewUrl: previewUrl
    };
    setAttachMenuOpen(false);
    renderPendingAttachment();
  }

  var VOICE_MAX_MS = 120000;
  var voiceRec = {
    stream: null,
    recorder: null,
    chunks: [],
    startedAt: 0,
    timer: null,
    mime: '',
    ext: 'webm',
    sendOnStop: false,
    stopping: false
  };

  function pickVoiceMime() {
    var cands = [
      { mime: 'audio/webm;codecs=opus', ext: 'webm' },
      { mime: 'audio/webm', ext: 'webm' },
      { mime: 'audio/mp4', ext: 'm4a' },
      { mime: 'audio/ogg;codecs=opus', ext: 'ogg' },
      { mime: 'audio/ogg', ext: 'ogg' },
      { mime: 'audio/aac', ext: 'aac' }
    ];
    if (typeof MediaRecorder === 'undefined') return null;
    for (var i = 0; i < cands.length; i++) {
      try {
        if (!MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(cands[i].mime)) {
          return cands[i];
        }
      } catch (e0) { /* ignore */ }
    }
    return { mime: '', ext: 'webm' };
  }

  function formatVoiceTime(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var m = Math.floor(s / 60);
    s = s % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function setVoiceRecordingUi(on) {
    var screen = document.getElementById('mb-chat-screen');
    var bar = document.getElementById('mb-chat-record-bar');
    if (screen) {
      if (on) screen.classList.add('mb-recording');
      else screen.classList.remove('mb-recording');
    }
    if (bar) {
      if (on) bar.classList.add('mb-open');
      else bar.classList.remove('mb-open');
    }
    if (on) setAttachMenuOpen(false);
  }

  function stopVoiceTracks() {
    if (voiceRec.stream) {
      try {
        voiceRec.stream.getTracks().forEach(function (t) {
          try { t.stop(); } catch (e1) { /* ignore */ }
        });
      } catch (e2) { /* ignore */ }
    }
    voiceRec.stream = null;
  }

  function clearVoiceTimer() {
    if (voiceRec.timer) {
      try { clearInterval(voiceRec.timer); } catch (e0) { /* ignore */ }
    }
    voiceRec.timer = null;
  }

  function resetVoiceRecord() {
    clearVoiceTimer();
    stopVoiceTracks();
    voiceRec.recorder = null;
    voiceRec.chunks = [];
    voiceRec.startedAt = 0;
    voiceRec.sendOnStop = false;
    voiceRec.stopping = false;
    voiceRec.mime = '';
    voiceRec.ext = 'webm';
    setVoiceRecordingUi(false);
    var timeEl = document.getElementById('mb-chat-record-time');
    if (timeEl) timeEl.textContent = '0:00';
  }

  function blobToVoiceFile(blob, ext, mime) {
    var d = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    var name = 'voice-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
      '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + '.' + (ext || 'webm');
    var type = mime || blob.type || 'audio/webm';
    try {
      return new File([blob], name, { type: type, lastModified: Date.now() });
    } catch (e0) {
      try { blob.name = name; } catch (e1) { /* ignore */ }
      return blob;
    }
  }

  function finishVoiceRecord(sendIt) {
    if (!voiceRec.recorder || voiceRec.stopping) return;
    voiceRec.sendOnStop = !!sendIt;
    voiceRec.stopping = true;
    try {
      if (voiceRec.recorder.state === 'recording' || voiceRec.recorder.state === 'paused') {
        voiceRec.recorder.stop();
        return;
      }
    } catch (e0) { /* fall through */ }
    resetVoiceRecord();
  }

  function cancelVoiceRecord() {
    voiceRec.sendOnStop = false;
    if (voiceRec.recorder && !voiceRec.stopping) {
      finishVoiceRecord(false);
      return;
    }
    resetVoiceRecord();
  }

  async function startVoiceRecord() {
    if (isSending || voiceRec.recorder || voiceRec.stopping) return;
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function' || typeof MediaRecorder === 'undefined') {
      showToast(chatT('Recording is not supported here', 'הקלטה אינה נתמכת כאן'), 'error');
      return;
    }
    var picked = pickVoiceMime();
    if (!picked) {
      showToast(chatT('Recording is not supported here', 'הקלטה אינה נתמכת כאן'), 'error');
      return;
    }

    var stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      showToast(chatT('Microphone permission is required', 'נדרשת הרשאת מיקרופון'), 'error');
      return;
    }

    var recorder;
    try {
      recorder = picked.mime
        ? new MediaRecorder(stream, { mimeType: picked.mime })
        : new MediaRecorder(stream);
    } catch (err2) {
      try { recorder = new MediaRecorder(stream); } catch (err3) {
        try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (eStop) { /* ignore */ }
        showToast(chatT('Recording is not supported here', 'הקלטה אינה נתמכת כאן'), 'error');
        return;
      }
    }

    voiceRec.stream = stream;
    voiceRec.recorder = recorder;
    voiceRec.chunks = [];
    voiceRec.startedAt = Date.now();
    voiceRec.sendOnStop = false;
    voiceRec.stopping = false;
    voiceRec.mime = recorder.mimeType || picked.mime || 'audio/webm';
    voiceRec.ext = picked.ext || 'webm';
    if (/mp4|m4a|aac/i.test(voiceRec.mime)) voiceRec.ext = 'm4a';
    else if (/ogg/i.test(voiceRec.mime)) voiceRec.ext = 'ogg';
    else if (/webm/i.test(voiceRec.mime)) voiceRec.ext = 'webm';

    recorder.ondataavailable = function (ev) {
      if (ev && ev.data && ev.data.size) voiceRec.chunks.push(ev.data);
    };
    recorder.onerror = function () {
      showToast(chatT('Recording failed', 'ההקלטה נכשלה'), 'error');
      resetVoiceRecord();
    };
    recorder.onstop = function () {
      var sendIt = !!voiceRec.sendOnStop;
      var chunks = voiceRec.chunks.slice();
      var mime = voiceRec.mime;
      var ext = voiceRec.ext;
      var elapsed = Date.now() - (voiceRec.startedAt || Date.now());
      resetVoiceRecord();
      if (!sendIt) return;
      var blob = new Blob(chunks, { type: mime || 'audio/webm' });
      if (!blob.size || elapsed < 400) {
        showToast(chatT('Recording too short', 'ההקלטה קצרה מדי'), 'error');
        return;
      }
      var file = blobToVoiceFile(blob, ext, mime);
      setPendingAttachment(file, 'voice');
      go();
    };

    try {
      recorder.start(250);
    } catch (errStart) {
      try { recorder.start(); } catch (errStart2) {
        showToast(chatT('Recording failed', 'ההקלטה נכשלה'), 'error');
        resetVoiceRecord();
        return;
      }
    }

    setVoiceRecordingUi(true);
    var timeEl = document.getElementById('mb-chat-record-time');
    if (timeEl) timeEl.textContent = '0:00';
    voiceRec.timer = setInterval(function () {
      var elapsed = Date.now() - voiceRec.startedAt;
      var el = document.getElementById('mb-chat-record-time');
      if (el) el.textContent = formatVoiceTime(elapsed);
      if (elapsed >= VOICE_MAX_MS) finishVoiceRecord(true);
    }, 200);
  }

  async function sendMessage(p, elId) {
    if (isSending) return;
    var input = document.getElementById('mb-chat-input');
    var textMsg = input ? String(input.value || '').trim() : '';
    var hasAttach = !!(pendingAttachment && pendingAttachment.file);
    if (!textMsg && !hasAttach) return;

    var customerId = resolveChatCustomerId(p);
    if (!customerId) {
      showToast(hasAttach
        ? chatT('Select a customer before uploading files.', 'בחר לקוח לפני העלאת קבצים.')
        : 'Missing customer_id', 'error');
      return;
    }
    p = Object.assign({}, p || {}, { customer_id: customerId, cust_id: customerId });
    currentParams = p;

    isSending = true;
    suppressThreadReload(8000);

    var attachSnapshot = hasAttach ? pendingAttachment : null;
    if (input) input.value = '';
    clearPendingAttachment();
    lastAttachToken = '';

    var localId = null;
    try {
      var finalMsg = textMsg;
      if (attachSnapshot) {
        var isVoice = attachSnapshot.kind === 'voice' || /^voice[-_]/i.test(attachSnapshot.name || '');
        var isAudioFile = isVoice ||
          (attachSnapshot.file && /^audio\//i.test(attachSnapshot.file.type || '')) ||
          /\.(mp3|wav|m4a|aac|ogg|oga|flac|opus|weba)$/i.test(attachSnapshot.name || '');
        showToast(isVoice
          ? chatT('Sending voice message…', 'שולח הודעה קולית…')
          : chatT('Uploading file…', 'מעלה קובץ…'));
        localId = appendLocalMessage(
          isAudioFile
            ? ((textMsg ? (textMsg + '\n') : '') + '…')
            : ((attachSnapshot.name || 'file') + (textMsg ? ('\n' + textMsg) : '') + '\n…'),
          true
        );
        if (!window.MineralBarApp || typeof MineralBarApp.uploadCustomerFile !== 'function') {
          throw new Error(chatT('File upload failed', 'העלאת הקובץ נכשלה'));
        }
        var uploaded = await MineralBarApp.uploadCustomerFile(customerId, attachSnapshot.file, {
          file_name: attachSnapshot.name || 'upload'
        });
        var url = (uploaded && (uploaded.url || uploaded.path)) || '';
        if (!url && uploaded && uploaded.raw && uploaded.raw.file) {
          url = uploaded.raw.file.file_url || uploaded.raw.file.file_path || '';
        }
        if (url && !/^https?:\/\//i.test(url) && window.MineralBarApp.resolveFileUrl) {
          url = MineralBarApp.resolveFileUrl(url);
        }
        if (!url) throw new Error(chatT('File upload failed', 'העלאת הקובץ נכשלה'));
        finalMsg = isAudioFile
          ? ((textMsg ? (textMsg + '\n') : '') + url)
          : ((attachSnapshot.name || 'file') + (textMsg ? ('\n' + textMsg) : '') + '\n' + url);
        currentMessages = currentMessages.map(function (row) {
          if (row._localId !== localId) return row;
          return Object.assign({}, row, { message: finalMsg });
        });
        renderMessages('mb-live-chat', currentMessages, p);
      } else {
        localId = appendLocalMessage(finalMsg, true);
      }

      await MineralBarApp.sendCustomerMessage(buildSendPayload(p, finalMsg));
      // Remove optimistic bubble before refresh so it cannot appear twice with the server copy
      if (localId) removeLocalMessage(localId);
      if (attachSnapshot) {
        showToast(attachSnapshot.kind === 'voice'
          ? chatT('Voice message sent', 'הודעה קולית נשלחה')
          : chatT('File sent', 'הקובץ נשלח'));
      }
      suppressThreadReload(5000);
      await loadThread('mb-live-chat', p, { silent: true });
    } catch (err) {
      console.error('[MineralBar] Chat send failed', err);
      if (localId) removeLocalMessage(localId);
      var failText = (err && err.message) || apiErrorText(err);
      if (err && err.raw && (err.raw.message_return || err.raw.message)) {
        failText = String(err.raw.message_return || err.raw.message).trim();
      }
      showToast(failText, 'error');
    } finally {
      isSending = false;
    }
  }

  /**
   * Send one or more already-hosted media URLs (product photos/videos) via Chat.SendCustomer.
   * Used by the Product media picker — message body is the URL so chat renders the image/video.
   */
  async function sendMediaUrls(urls, opts) {
    opts = opts || {};
    var list = (Array.isArray(urls) ? urls : [urls]).map(function (u) {
      return String(u || '').trim();
    }).filter(Boolean);
    if (!list.length) return { sent: 0 };

    var p = Object.assign({}, currentParams || params() || {});
    var customerId = resolveChatCustomerId(p);
    if (!customerId) {
      showToast(chatT('Select a customer before uploading files.', 'בחר לקוח לפני העלאת קבצים.'), 'error');
      throw new Error('Missing customer_id');
    }
    p = Object.assign({}, p, { customer_id: customerId, cust_id: customerId });
    currentParams = p;

    if (isSending) {
      showToast(chatT('Please wait…', 'נא להמתין…'), 'error');
      throw new Error('Busy');
    }

    isSending = true;
    suppressThreadReload(8000);
    var sent = 0;
    try {
      for (var i = 0; i < list.length; i++) {
        var url = list[i];
        if (url && !/^https?:\/\//i.test(url) && !/^data:/i.test(url) && window.MineralBarApp && MineralBarApp.resolveFileUrl) {
          url = MineralBarApp.resolveFileUrl(url) || url;
        }
        // Message is the media URL only — chat bubble renders photo/video, not a product name.
        var localId = appendLocalMessage(url, true);
        try {
          await MineralBarApp.sendCustomerMessage(buildSendPayload(p, url));
          removeLocalMessage(localId);
          sent += 1;
        } catch (errOne) {
          removeLocalMessage(localId);
          throw errOne;
        }
      }
      showToast(
        sent === 1
          ? chatT('Photo sent', 'התמונה נשלחה')
          : (chatT('Photos sent', 'התמונות נשלחו') + ' (' + sent + ')')
      );
      suppressThreadReload(5000);
      await loadThread('mb-live-chat', p, { silent: true });
      return { sent: sent };
    } catch (err) {
      console.error('[MineralBar] Product media send failed', err);
      var failText = (err && err.message) || apiErrorText(err);
      if (err && err.raw && (err.raw.message_return || err.raw.message)) {
        failText = String(err.raw.message_return || err.raw.message).trim();
      }
      showToast(failText, 'error');
      throw err;
    } finally {
      isSending = false;
    }
  }

  window.mbChatSendMediaUrls = sendMediaUrls;

  function openAttachPicker(kind) {
    if (kind === 'record') {
      setAttachMenuOpen(false);
      startVoiceRecord();
      return;
    }
    var id = kind === 'image' ? 'mb-chat-file-image'
      : (kind === 'music' ? 'mb-chat-file-music' : 'mb-chat-file-doc');
    var input = document.getElementById(id);
    if (!input) {
      showToast(chatT('File upload failed', 'העלאת הקובץ נכשלה'), 'error');
      return;
    }
    // Keep options visible until a file is actually chosen; hide only after pick via setPendingAttachment
    try { input.value = ''; } catch (e0) { /* ignore */ }
    input.click();
  }

  var currentParams = null;
  function go() {
    if (isSending) return;
    sendMessage(currentParams || params(), 'mb-live-chat');
  }

  document.addEventListener('click', function(e) {
    var filterBtn = e.target.closest('.chat-tab-btn');
    if (filterBtn) {
      var filter = filterBtn.getAttribute('data-filter') || 'all';
      if (typeof window.filterChatType === 'function') window.filterChatType(filter);
      return;
    }
    var channelBtn = e.target.closest('.chat-send-channel');
    if (channelBtn) {
      e.preventDefault();
      setSendChannel(
        channelBtn.getAttribute('data-channel') || 'notes',
        channelBtn.getAttribute('data-from') || 'send_notes'
      );
      return;
    }
    if (e.target.closest('#mb-chat-call-btn')) {
      dialCurrentCustomer(e);
      return;
    }
    if (e.target.closest('#mb-chat-attach-clear')) {
      e.preventDefault();
      clearPendingAttachment();
      lastAttachToken = '';
      return;
    }
    if (e.target.closest('#mb-chat-attach-btn')) {
      e.preventDefault();
      if (voiceRec.recorder) return;
      setAttachMenuOpen(!isAttachMenuOpen());
      return;
    }
    if (e.target.closest('#mb-chat-mic-btn')) {
      e.preventDefault();
      startVoiceRecord();
      return;
    }
    if (e.target.closest('#mb-chat-record-cancel')) {
      e.preventDefault();
      cancelVoiceRecord();
      return;
    }
    if (e.target.closest('#mb-chat-record-send')) {
      e.preventDefault();
      finishVoiceRecord(true);
      return;
    }
    var attachOpt = e.target.closest('.mb-attach-opt');
    if (attachOpt) {
      e.preventDefault();
      openAttachPicker(attachOpt.getAttribute('data-attach') || 'file');
      return;
    }
    if (isAttachMenuOpen() && !e.target.closest('#mb-chat-attach-menu') && !e.target.closest('#mb-chat-attach-btn')) {
      setAttachMenuOpen(false);
    }
    if (e.target.closest('#mb-chat-send')) {
      e.preventDefault();
      e.stopPropagation();
      go();
      return;
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

  function detectAttachKind(file) {
    if (!file) return '';
    var name = String(file.name || '').toLowerCase();
    var type = String(file.type || '').toLowerCase();
    if (type.indexOf('image/') === 0 || /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(name)) return 'image';
    if (type.indexOf('audio/') === 0 || /\.(mp3|wav|m4a|aac|ogg|flac|opus|weba)$/i.test(name)) return 'music';
    if (type.indexOf('video/') === 0 || /\.(mp4|webm|mov|m4v)$/i.test(name)) return 'video';
    return 'file';
  }

  function isAllowedChatDropFile(file) {
    var kind = detectAttachKind(file);
    return kind === 'image' || kind === 'music' || kind === 'video' || kind === 'file';
  }

  function dragEventHasFiles(e) {
    var dt = e && e.dataTransfer;
    if (!dt) return false;
    if (dt.types) {
      for (var i = 0; i < dt.types.length; i++) {
        if (String(dt.types[i]).toLowerCase() === 'files') return true;
      }
    }
    return !!(dt.files && dt.files.length);
  }

  function setChatDropActive(on) {
    var screen = document.getElementById('mb-chat-screen');
    var overlay = document.getElementById('mb-chat-drop-overlay');
    if (screen) {
      if (on) screen.classList.add('mb-chat-drag-over');
      else screen.classList.remove('mb-chat-drag-over');
    }
    if (overlay) {
      if (on) overlay.classList.add('mb-open');
      else overlay.classList.remove('mb-open');
      overlay.setAttribute('aria-hidden', on ? 'false' : 'true');
    }
  }

  function handleChatDroppedFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []).filter(Boolean);
    if (!files.length) return;
    var picked = null;
    for (var i = 0; i < files.length; i++) {
      if (isAllowedChatDropFile(files[i])) {
        picked = files[i];
        break;
      }
    }
    if (!picked) {
      showToast(chatT('Unsupported file type', 'סוג קובץ לא נתמך'), 'error');
      return;
    }
    setPendingAttachment(picked, detectAttachKind(picked) || 'file');
    showToast(chatT('Ready to send', 'מוכן לשליחה'));
  }

  function bindAttachFileInputs() {
    // Document-level so it still works if the composer DOM is re-rendered
    if (document.__mbAttachChangeBound) return;
    document.__mbAttachChangeBound = true;
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || t.tagName !== 'INPUT' || t.type !== 'file') return;
      var kind = null;
      if (t.id === 'mb-chat-file-image') kind = 'image';
      else if (t.id === 'mb-chat-file-doc') kind = 'file';
      else if (t.id === 'mb-chat-file-music') kind = 'music';
      if (!kind) return;
      var file = t.files && t.files[0];
      if (!file) return;
      kind = detectAttachKind(file) || kind;
      setPendingAttachment(file, kind);
      try { t.value = ''; } catch (err) { /* ignore */ }
    });
  }
  bindAttachFileInputs();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindAttachFileInputs);
  }

  function bindChatDragDrop() {
    if (document.__mbChatDragDropBound) return;
    document.__mbChatDragDropBound = true;
    var depth = 0;

    function hostContains(target) {
      var screen = document.getElementById('mb-chat-screen');
      if (!screen || !target) return false;
      if (typeof target.closest === 'function' && target.closest('#mb-chat-screen')) return true;
      return screen === target || screen.contains(target);
    }

    document.addEventListener('dragenter', function (e) {
      if (!dragEventHasFiles(e) || !hostContains(e.target)) return;
      e.preventDefault();
      depth += 1;
      setChatDropActive(true);
    });

    document.addEventListener('dragover', function (e) {
      if (!dragEventHasFiles(e) || !hostContains(e.target)) return;
      e.preventDefault();
      try { e.dataTransfer.dropEffect = 'copy'; } catch (e0) { /* ignore */ }
      setChatDropActive(true);
    });

    document.addEventListener('dragleave', function (e) {
      if (!hostContains(e.target) && depth === 0) return;
      var screen = document.getElementById('mb-chat-screen');
      if (!screen) return;
      var related = e.relatedTarget;
      if (related && (screen === related || screen.contains(related))) return;
      depth = Math.max(0, depth - 1);
      if (!depth) setChatDropActive(false);
    });

    document.addEventListener('drop', function (e) {
      if (!hostContains(e.target)) return;
      if (!dragEventHasFiles(e)) return;
      e.preventDefault();
      e.stopPropagation();
      depth = 0;
      setChatDropActive(false);
      handleChatDroppedFiles(e.dataTransfer && e.dataTransfer.files);
    });
  }
  bindChatDragDrop();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindChatDragDrop);
  }

  document.addEventListener('keydown', function(e) {
    if (e.target && e.target.id === 'mb-chat-input') {
      if (e.key === 'Enter') {
        e.preventDefault();
        go();
      }
    }
  });

  // Same drag/scroll + tap-select pattern as sales-tasks.html filter chips
  function setupDragToScroll(elId) {
    var el = document.getElementById(elId);
    if (!el || el.getAttribute('data-drag-bound') === '1') return;
    el.setAttribute('data-drag-bound', '1');
    el.classList.add('chat-filter-hbar');

    var isDown = false;
    var didDrag = false;
    var startX = 0;
    var scrollLeft = 0;

    function getX(e) {
      return e.touches && e.touches.length ? e.touches[0].pageX : e.pageX;
    }

    function onStart(e) {
      isDown = true;
      didDrag = false;
      startX = getX(e);
      scrollLeft = el.scrollLeft;
      el.style.cursor = 'grabbing';
    }

    function onMove(e) {
      if (!isDown) return;
      var x = getX(e);
      var walk = (x - startX) * 1.6;
      if (Math.abs(walk) > 4) didDrag = true;
      el.scrollLeft = scrollLeft - walk;
      if (didDrag && e.cancelable) e.preventDefault();
    }

    function onEnd() {
      isDown = false;
      el.style.cursor = 'grab';
    }

    el.addEventListener('mousedown', onStart);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseup', onEnd);
    el.addEventListener('mouseleave', onEnd);
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    el.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });

    // After a swipe, block the synthetic click so selection doesn't change
    el.addEventListener('click', function (e) {
      if (didDrag) {
        e.preventDefault();
        e.stopPropagation();
        didDrag = false;
      }
    }, true);

    el.style.cursor = 'grab';
    el.style.minWidth = '0';
    el.style.maxWidth = '100%';
    el.style.overflowX = 'auto';
  }

  function initHorizontalDrags() {
    setupDragToScroll('mb-chat-filter-tabs');
    setupDragToScroll('mb-chat-send-channels');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHorizontalDrags);
  } else {
    initHorizontalDrags();
  }

  async function start() {
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    var elId = 'mb-live-chat';
    if (!document.getElementById(elId)) return;
    if (_chatBooted) return;
    _chatBooted = true;
    _chatBootAt = Date.now();
    suppressThreadReload(4000);

    initHorizontalDrags();
    applySendChannelStyles();

    var p = params();
    currentParams = p;
    fillHeader(p);

    // Deep-link from schedule: ?filter=whatsapp&channel=whatsapp
    try {
      var q = new URLSearchParams(location.search || '');
      var filter = String(q.get('filter') || q.get('tab') || '').toLowerCase();
      var channel = String(q.get('channel') || '').toLowerCase();
      if (filter && typeof window.filterChatType === 'function') {
        window.filterChatType(filter);
      }
      if (channel === 'whatsapp' || filter === 'whatsapp') {
        setSendChannel('whatsapp', 'send_whatsapp');
      } else if (channel === 'email' || filter === 'email') {
        setSendChannel('email', 'send_email');
      } else if (channel === 'quick_email' || filter === 'quick_email') {
        setSendChannel('quick_email', 'send_email_quick');
      } else if (channel === 'biz1' || filter === 'biz1') {
        setSendChannel('biz1', 'send_chat_channel');
      } else if (channel === 'notes' || filter === 'notes') {
        setSendChannel('notes', 'send_notes');
      }
    } catch (eDeep) { /* ignore */ }

    // Prefetch phone so call button works even when URL/list omitted cust_phone
    resolveCustomerPhone(p);

    await loadThread(elId, p);
  }

  function pickSocketMessageRow(detail) {
    var ev = (detail && (detail.event || detail)) || {};
    var payload = ev.payload || ev.data || ev.record || ev.message || ev;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch (e0) { payload = { message: payload }; }
    }
    if (!payload || typeof payload !== 'object') return null;
    if (payload.message && typeof payload.message === 'object') {
      payload = Object.assign({}, payload, payload.message);
    }
    var text = String(payload.message || payload.msg || payload.body || payload.text || payload.note || '').trim();
    var file = payload.file_url || payload.media_url || payload.file || payload.href || '';
    if (!text && !file) return null;
    var mid = payload.messenger_meta_id;
    if (mid && typeof mid === 'object') mid = mid.$oid || mid.id || '';
    return {
      id: payload.id || payload.message_id || (payload._id && (payload._id.$oid || payload._id)) || '',
      message_id: payload.message_id || payload.id || '',
      message: text || String(file),
      user_name: payload.user_name || payload.email || payload.from_name || payload.sender_name || '',
      time: payload.time || payload.created || payload.date || payload.created_at || payload.create_date || '',
      direction: payload.direction,
      type: payload.type || '',
      user_id: payload.user_id,
      messenger_meta_id: mid,
      customer_id: payload.customer_id || payload.cust_id || payload.contactus_id || payload.client_id,
      raw: payload
    };
  }

  function socketEventMatchesThread(row, p) {
    p = p || currentParams || params() || {};
    if (!row) return false;
    var cid = String(p.customer_id || p.cust_id || '');
    var mid = String(p.messenger_meta_id || '');
    var rcid = String(row.customer_id || '');
    var rmid = String(row.messenger_meta_id || '');
    if (mid && rmid && mid === rmid) return true;
    if (cid && rcid && cid === rcid) return true;
    if (!rcid && !rmid) return true;
    return false;
  }

  function applySocketChatEvent(detail) {
    var key = String((detail && detail.key) || '').toLowerCase();
    if (/socket\.nudge/i.test(key)) return false;
    if (!document.getElementById('mb-live-chat')) return false;
    var row = pickSocketMessageRow(detail);
    // Some message.created packets contain only an event id or nest the
    // message differently. In that case REST is the source of truth.
    if (!row) {
      scheduleSocketThreadRefresh();
      return false;
    }
    var p = currentParams || params();
    if (!socketEventMatchesThread(row, p)) return false;
    var pending = (currentMessages || []).filter(function (r) { return r && r._pending; });
    var existing = (currentMessages || []).filter(function (r) { return !(r && r._pending); });
    var keyMsg = messageDedupeKey(row);
    for (var i = 0; i < existing.length; i++) {
      if (messageDedupeKey(existing[i]) === keyMsg) return true;
    }
    existing.push(row);
    currentMessages = mergeServerAndLocalMessages(existing, pending);
    renderMessages('mb-live-chat', currentMessages, p);
    // Confirm the server row and update messages that arrive without a full
    // payload (media, internal notes, or provider-specific wrappers).
    scheduleSocketThreadRefresh();
    return true;
  }

  function scheduleSocketThreadRefresh() {
    if (_socketThreadRefreshTimer || !document.getElementById('mb-live-chat')) return;
    _socketThreadRefreshTimer = setTimeout(function () {
      _socketThreadRefreshTimer = null;
      var p = currentParams || params();
      if (!p || (!p.customer_id && !p.messenger_meta_id)) return;
      loadThread('mb-live-chat', p, { silent: true }).catch(function (err) {
        console.warn('[ChatLive] socket refresh failed', err);
      });
    }, 250);
  }

  window.addEventListener('mineralbar:ready', function () {
    wireChatBackButton();
    start();
  }, { once: true });
  window.addEventListener('pagehide', function () {
    cancelVoiceRecord();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && voiceRec.recorder) cancelVoiceRecord();
  });
  window.addEventListener('mineralbar:language-changed', function () {
    if (!document.getElementById('mb-live-chat')) return;
    if (currentMessages && currentMessages.length) {
      renderMessages('mb-live-chat', currentMessages, currentParams || params());
    }
  });

  // Wire UI early; boot once when auth is ready (or already authenticated).
  wireChatBackButton();
  initHorizontalDrags();
  if (window.MineralBarApp && MineralBarApp.isAuthenticated && MineralBarApp.isAuthenticated()) {
    setTimeout(start, 40);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      wireChatBackButton();
      initHorizontalDrags();
    });
  }

  if (window.LiveSync && typeof LiveSync.bind === 'function') {
    window.__mbChatLiveBound = true;
    LiveSync.bind(function (detail) {
      var key = String((detail && detail.key) || '').toLowerCase();
      if (!key || /socket\.nudge/i.test(key)) return;
      if (!/message|chat|whatsapp|inbox/i.test(key)) return;
      applySocketChatEvent(detail);
    }, {
      keys: /message|chat|whatsapp|inbox/i,
      mount: '#mb-live-chat',
      delay: 200,
      retries: false
    });
  } else {
    window.addEventListener('mineralbar:messages', function (ev) {
      applySocketChatEvent((ev && ev.detail) || {});
    });
    if (window.MineralBarApp && MineralBarApp.bindLiveReload) {
      MineralBarApp.bindLiveReload(function (detail) {
        var key = String((detail && detail.key) || '').toLowerCase();
        if (!key || /socket\.nudge/i.test(key)) return;
        applySocketChatEvent(detail);
      }, { keys: /message|chat|whatsapp|inbox/i, delay: 200 });
    }
  }
})();
