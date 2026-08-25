/**
 * Customer chat thread — Multi-channel inbox style
 * List: Chat.Conversations (messenger_meta_id)
 * Thread: Chat.SingleConversations
 * Send via Chat.SendCustomer (notes / email / whatsapp / biz1 by `from`)
 * https://eli.bull36.com/app/help → Chat.Conversations / Chat.SingleConversations
 */
(function () {
  'use strict';

  var currentParams = null;
  var typeFilter = 'all'; // all | whatsapp | email | notes | biz1
  var sendVia = 'notes'; // whatsapp | email | notes | biz1
  var channelPolicy = {
    whatsapp: { enabled: true, reason: '' },
    email: { enabled: true, reason: '' },
    notes: { enabled: true, reason: '' },
    biz1: { enabled: true, reason: '' }
  };

  function resetChannelPolicy() {
    channelPolicy = {
      whatsapp: { enabled: true, reason: '' },
      email: { enabled: true, reason: '' },
      notes: { enabled: true, reason: '' },
      biz1: { enabled: true, reason: '' }
    };
  }
  var composerBound = false;
  var typeTabsBound = false;
  var sendViaBound = false;
  var attachUiBound = false;
  var startedStandalone = false;
  var cachedRows = [];
  var pendingAttachment = null; // { file, kind, name, previewUrl }
  var lastAttachToken = '';
  var isSending = false;
  var mediaRecorder = null;
  var recordChunks = [];
  var recordStream = null;
  var recordTimer = null;
  var recordStartedAt = 0;
  var isRecording = false;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function tt(k) {
    return (window.t && window.t(k)) || k;
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

  function normalizeType(t) {
    var s = String(t || '').toLowerCase();
    if (s === 'mision' || s === 'mission') return 'biz1';
    if (s === 'note' || s === 'send_notes' || s === 'internal') return 'notes';
    if (s === 'mail' || s === 'quick_email' || s === 'quick-email') return 'email';
    if (s === 'web' || s === 'live') return 'biz1';
    return s || 'whatsapp';
  }

  function paramsFromSearch(search) {
    var q = new URLSearchParams(search || location.search || '');
    var customerId = q.get('customer_id') || q.get('cust_id') || q.get('contactus_id') || '';
    var filter = normalizeType(q.get('type') || q.get('channel') || 'all');
    if (filter === 'notes' || filter === 'email' || filter === 'whatsapp' || filter === 'biz1') {
      /* keep */
    } else {
      filter = 'all';
    }
    return {
      customer_id: customerId,
      cust_id: customerId,
      messenger_meta_id: q.get('messenger_meta_id') || '',
      email: q.get('email') || '',
      phone: q.get('phone') || '',
      subject: q.get('subject') || '',
      name: q.get('name') || '',
      when: q.get('when') || '',
      last_message: q.get('last_message') || q.get('subject') || '',
      channel: q.get('channel') || 'whatsapp',
      type: filter
    };
  }

  function paramsFromRow(row) {
    var cid = String(row.customer_id || row.cust_id || row.client_id || '');
    var last = row.last_message || row.message || row.subject || '';
    var raw = row.raw || {};
    if (!last) last = raw.last_message || raw.message || raw.whatsapp_message || '';
    var meta = row.messenger_meta_id || '';
    if (!meta && raw) {
      meta = raw.messenger_meta_id || raw.id || (raw._id && (raw._id.$oid || raw._id)) || '';
      if (typeof meta === 'object' && meta.$oid) meta = meta.$oid;
    }
    return {
      customer_id: cid,
      cust_id: cid,
      messenger_meta_id: String(meta || ''),
      email: row.email || '',
      phone: row.phone || '',
      subject: row.subject || '',
      name: row.name || '',
      when: row.when || '',
      last_message: String(last || '').trim(),
      channel: row.channel || 'whatsapp',
      type: 'all'
    };
  }

  /** Live probe: user_id > 0 staff out; user_id == 0 inbound (e.g. WhatsApp received). */
  function isOutgoing(row) {
    if (row.user_id != null && row.user_id !== '' && !Number.isNaN(Number(row.user_id))) {
      return Number(row.user_id) > 0;
    }
    var t = normalizeType(row.type || row.channel);
    if (t === 'notes') return true;
    if (row.direction === 1 || row.direction === '1' || row.direction === 'out' || row.direction === 'outgoing') return true;
    if (row.direction === 0 || row.direction === '0' || row.direction === 'in' || row.direction === 'incoming') return false;
    return false;
  }

  function messageText(row) {
    if (row.message) return row.message;
    var raw = row.raw || {};
    var parts = [raw.message, raw.msg, raw.note, raw.import_note, raw.body, raw.text, raw.content];
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] != null && String(parts[i]).trim()) {
        return String(parts[i])
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .trim();
      }
    }
    return '';
  }

  function typeDisplayName(type) {
    var t = normalizeType(type);
    if (t === 'whatsapp') return tt('channel_whatsapp');
    if (t === 'email') return tt('channel_email');
    if (t === 'notes') return tt('channel_internal_notes');
    if (t === 'biz1') return tt('channel_biz1');
    return t || tt('channel_whatsapp');
  }

  function channelHeader(row, outgoing) {
    var name = typeDisplayName(row.type || row.channel);
    var dir = outgoing ? tt('msg_sent') : tt('msg_received');
    return name + ' - ' + dir;
  }

  function dayKey(time) {
    var s = String(time || '');
    var m = s.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    if (m) return m[1].padStart(2, '0') + '/' + m[2].padStart(2, '0') + '/' + m[3];
    var d = Date.parse(s);
    if (!Number.isNaN(d)) {
      var dt = new Date(d);
      var dd = String(dt.getDate()).padStart(2, '0');
      var mm = String(dt.getMonth() + 1).padStart(2, '0');
      return dd + '/' + mm + '/' + dt.getFullYear();
    }
    return '';
  }

  /** Bubble time only — date already shown in center day pill. */
  function timeOnly(time) {
    var s = String(time || '').trim();
    if (!s) return '';
    // Already time-only (e.g. 06:11 or 06:11:57)
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) return s.length === 4 ? '0' + s : s;
    // "27.07.2026 06:11:57" / "27/07/2026 06:11"
    var m = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
      var hh = m[1].padStart(2, '0');
      var mm = m[2];
      return hh + ':' + mm;
    }
    var d = Date.parse(s);
    if (!Number.isNaN(d)) {
      var dt = new Date(d);
      return String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0');
    }
    return s;
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

  var activeAudioEl = null;

  function fmtAudioClock(sec) {
    var s = Math.max(0, Math.floor(Number(sec) || 0));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function audioPlayIcon() {
    return '<svg class="msg-audio-ico msg-audio-ico--play" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  }

  function audioPauseIcon() {
    return '<svg class="msg-audio-ico msg-audio-ico--pause" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';
  }

  function audioVolIcon() {
    return '<svg class="msg-audio-ico msg-audio-ico--vol" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>';
  }

  function audioMuteIcon() {
    return '<svg class="msg-audio-ico msg-audio-ico--mute" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m23 9-6 6"/><path d="m17 9 6 6"/></svg>';
  }

  /** Dark media-bar UI (play + seek + time + volume) matching chat screenshot. */
  function renderAudioPlayer(href) {
    var safeHref = esc(href);
    return (
      '<div class="msg-audio" data-src="' + safeHref + '">' +
        '<button type="button" class="msg-audio-play" aria-label="' + esc(tt('audio_play')) + '">' +
          audioPlayIcon() +
        '</button>' +
        '<div class="msg-audio-seek-wrap">' +
          '<input class="msg-audio-seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek"/>' +
        '</div>' +
        '<span class="msg-audio-time">0:00 /</span>' +
        '<button type="button" class="msg-audio-vol" aria-label="Volume">' +
          audioVolIcon() +
        '</button>' +
        '<audio preload="metadata" src="' + safeHref + '"></audio>' +
      '</div>'
    );
  }

  function syncAudioSeekUi(wrap, audio) {
    if (!wrap || !audio) return;
    var seek = wrap.querySelector('.msg-audio-seek');
    var timeEl = wrap.querySelector('.msg-audio-time');
    var dur = audio.duration;
    var cur = audio.currentTime || 0;
    if (seek && dur && isFinite(dur) && dur > 0) {
      seek.value = String(Math.round((cur / dur) * 1000));
    }
    if (timeEl) {
      if (dur && isFinite(dur)) {
        timeEl.textContent = fmtAudioClock(cur) + ' / ' + fmtAudioClock(dur);
      } else {
        timeEl.textContent = fmtAudioClock(cur) + ' /';
      }
    }
  }

  function stopActiveAudio() {
    if (!activeAudioEl) return;
    try { activeAudioEl.pause(); } catch (e0) { /* ignore */ }
    var wrap = activeAudioEl.closest('.msg-audio');
    if (wrap) {
      wrap.classList.remove('is-playing');
      var btn = wrap.querySelector('.msg-audio-play');
      if (btn) btn.innerHTML = audioPlayIcon();
    }
    activeAudioEl = null;
  }

  function bindAudioPlayers(root) {
    var scope = root || document.getElementById('mb-live-chat');
    if (!scope || scope.__mbAudioBound) return;
    scope.__mbAudioBound = true;

    scope.addEventListener('click', function (e) {
      var volBtn = e.target.closest('.msg-audio-vol');
      if (volBtn) {
        e.preventDefault();
        e.stopPropagation();
        var wrapV = volBtn.closest('.msg-audio');
        var audioV = wrapV && wrapV.querySelector('audio');
        if (!audioV) return;
        audioV.muted = !audioV.muted;
        wrapV.classList.toggle('is-muted', audioV.muted);
        volBtn.innerHTML = audioV.muted ? audioMuteIcon() : audioVolIcon();
        return;
      }

      var btn = e.target.closest('.msg-audio-play');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      var wrap = btn.closest('.msg-audio');
      if (!wrap) return;
      var audio = wrap.querySelector('audio');
      if (!audio) return;
      if (activeAudioEl && activeAudioEl !== audio) stopActiveAudio();
      if (audio.paused) {
        audio.play().then(function () {
          activeAudioEl = audio;
          wrap.classList.add('is-playing');
          btn.innerHTML = audioPauseIcon();
        }).catch(function () {
          showToast(tt('audio_play_failed'));
        });
      } else {
        audio.pause();
        wrap.classList.remove('is-playing');
        btn.innerHTML = audioPlayIcon();
        activeAudioEl = null;
      }
    });

    scope.addEventListener('input', function (e) {
      var seek = e.target.closest('.msg-audio-seek');
      if (!seek) return;
      var wrap = seek.closest('.msg-audio');
      var audio = wrap && wrap.querySelector('audio');
      if (!audio || !audio.duration || !isFinite(audio.duration)) return;
      audio.currentTime = (Number(seek.value) / 1000) * audio.duration;
      syncAudioSeekUi(wrap, audio);
    });

    scope.addEventListener('timeupdate', function (e) {
      var audio = e.target;
      if (!audio || audio.tagName !== 'AUDIO') return;
      var wrap = audio.closest('.msg-audio');
      if (!wrap || wrap.__seeking) return;
      syncAudioSeekUi(wrap, audio);
    }, true);

    scope.addEventListener('ended', function (e) {
      var audio = e.target;
      if (!audio || audio.tagName !== 'AUDIO') return;
      var wrap = audio.closest('.msg-audio');
      if (wrap) {
        wrap.classList.remove('is-playing');
        var btn = wrap.querySelector('.msg-audio-play');
        if (btn) btn.innerHTML = audioPlayIcon();
        try { audio.currentTime = 0; } catch (e1) { /* ignore */ }
        syncAudioSeekUi(wrap, audio);
      }
      if (activeAudioEl === audio) activeAudioEl = null;
    }, true);

    scope.addEventListener('loadedmetadata', function (e) {
      var audio = e.target;
      if (!audio || audio.tagName !== 'AUDIO') return;
      var wrap = audio.closest('.msg-audio');
      if (wrap) syncAudioSeekUi(wrap, audio);
    }, true);
  }

  function looksLikeAudioFileName(s) {
    return /\.(mp3|wav|m4a|aac|ogg|flac|webm)(\?|$)/i.test(String(s || '').trim());
  }

  function formatMessageBody(text) {
    var raw = String(text == null ? '' : text);
    if (!raw) return '';
    var App = window.Biz1App || window.MineralBarApp;
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

    var hasAudioUrl = parts.some(function (p) {
      if (p.type !== 'url') return false;
      var href = p.value;
      if (/^biz1upload\//i.test(href) && App && typeof App.resolveFileUrl === 'function') {
        href = App.resolveFileUrl(href);
      }
      return /\.(mp3|wav|m4a|aac|ogg|flac|webm)(\?|$)/i.test(href);
    });

    return parts.map(function (part) {
      if (part.type !== 'url') {
        var t = String(part.value || '');
        if (hasAudioUrl) {
          t = t.split(/\n/).filter(function (line) {
            var L = String(line || '').trim();
            if (!L) return false;
            if (looksLikeAudioFileName(L)) return false;
            if (/^(https?:\/\/|biz1upload\/)/i.test(L)) return false;
            return true;
          }).join('\n');
          if (!t.trim()) return '';
        }
        return esc(t);
      }
      var href = part.value;
      if (/^biz1upload\//i.test(href) && App && typeof App.resolveFileUrl === 'function') {
        href = App.resolveFileUrl(href);
      }
      var safeHref = esc(href);
      var isImg = /\.(png|jpe?g|gif|webp|bmp|heic|heif)(\?|$)/i.test(href);
      var isAudio = /\.(mp3|wav|m4a|aac|ogg|flac|webm)(\?|$)/i.test(href);
      var isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(href) && !isAudio;
      if (isImg) {
        return '<a class="msg-media" href="' + safeHref + '" target="_blank" rel="noopener">' +
          '<img src="' + safeHref + '" alt=""/>' +
          '</a>';
      }
      if (isAudio) {
        return renderAudioPlayer(href);
      }
      if (isVideo) {
        return '<div class="msg-media"><video controls preload="metadata" src="' + safeHref + '"></video></div>';
      }
      return '<a class="msg-link" href="' + safeHref + '" target="_blank" rel="noopener">' + esc(part.value) + '</a>';
    }).join('');
  }

  function bubbleIn(text, time, who, channelLabel) {
    return (
      '<div class="msg-bubble msg-bubble-in">' +
      (channelLabel ? '<div class="msg-channel-tag msg-channel-tag--in">' + esc(channelLabel) + '</div>' : '') +
      (who ? '<div class="msg-who">' + esc(who) + '</div>' : '') +
      '<div class="msg-text">' + formatMessageBody(text) + '</div>' +
      (time ? '<div class="msg-time">' + esc(time) + '</div>' : '') +
      '</div>'
    );
  }

  function bubbleOut(text, time, pending, who, channelLabel) {
    return (
      '<div class="msg-bubble msg-bubble-out">' +
      '<div class="msg-bubble-out-inner">' +
      (channelLabel ? '<div class="msg-channel-tag msg-channel-tag--out">' + esc(channelLabel) + '</div>' : '') +
      (who ? '<div class="msg-who">' + esc(who) + '</div>' : '') +
      '<div class="msg-text">' + formatMessageBody(text) + '</div>' +
      '</div>' +
      '<div class="msg-meta-row">' +
      (pending
        ? '<span class="msg-time" style="color:var(--warn);">' + esc(tt('sending')) + '</span>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>') +
      (time ? '<span class="msg-time">' + esc(time) + '</span>' : '') +
      '</div></div>'
    );
  }

  function notice(kind, title, body) {
    var cls = 'chat-notice';
    if (kind === 'error') cls += ' chat-notice--error';
    else if (kind === 'warn') cls += ' chat-notice--warn';
    return (
      '<div class="' + cls + '">' +
      '<div class="chat-notice-title">' + esc(title) + '</div>' +
      '<pre class="chat-notice-body">' + esc(body) + '</pre></div>'
    );
  }

  function nowTime() {
    var d = new Date();
    var h = d.getHours();
    var m = d.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function ensureTypeTabs() {
    var head = document.querySelector('.chat-head-text') || document.querySelector('.chat-header');
    if (!head) return null;
    var tabs = document.getElementById('mb-channel-tabs');
    var items = [
      ['all', 'channel_all'],
      ['whatsapp', 'channel_whatsapp'],
      ['email', 'channel_email'],
      ['notes', 'channel_internal_notes'],
      ['biz1', 'channel_biz1']
    ];
    if (!tabs) {
      tabs = document.createElement('div');
      tabs.id = 'mb-channel-tabs';
      tabs.className = 'chat-channel-tabs';
      head.appendChild(tabs);
    }
    tabs.innerHTML = items.map(function (it) {
      return (
        '<button type="button" class="chat-channel-tab" data-type="' + it[0] + '">' +
        esc(tt(it[1])) +
        '</button>'
      );
    }).join('');
    return tabs;
  }

  function syncTypeTabs() {
    var tabs = ensureTypeTabs();
    if (!tabs) return;
    tabs.querySelectorAll('.chat-channel-tab').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-type') === typeFilter);
    });
  }

  function bindTypeTabs() {
    if (typeTabsBound) return;
    var tabs = ensureTypeTabs();
    if (!tabs) return;
    tabs.addEventListener('click', function (e) {
      var btn = e.target.closest('.chat-channel-tab');
      if (!btn) return;
      var t = btn.getAttribute('data-type') || 'all';
      if (t === typeFilter) return;
      typeFilter = t;
      if (currentParams) currentParams.type = t;
      if (t === 'notes' || t === 'email') sendVia = t;
      syncTypeTabs();
      syncSendVia();
      updateComposerForSendVia();
      var el = document.getElementById('mb-live-chat');
      if (el && currentParams) loadThread(el, currentParams);
      else renderCached();
    });
    typeTabsBound = true;
  }

  function ensureSendVia() {
    var composer = document.querySelector('.chat-composer');
    if (!composer) return null;
    var row = document.getElementById('mb-send-via');
    if (row) return row;
    row = document.createElement('div');
    row.id = 'mb-send-via';
    row.className = 'send-via-row';
    composer.parentNode.insertBefore(row, composer);
    return row;
  }

  function syncSendVia() {
    var row = ensureSendVia();
    if (!row) return;
    var items = [
      ['whatsapp', 'channel_wa_short', '#25D366'],
      ['email', 'channel_email', '#8A2BE2'],
      ['notes', 'channel_notes_short', '#2F80ED'],
      ['biz1', 'channel_biz1', '#F2994A']
    ];
    row.innerHTML =
      '<span class="send-via-label">' + esc(tt('send_via')) + '</span>' +
      items.map(function (it) {
        var active = sendVia === it[0];
        var disabled = channelPolicy[it[0]] && !channelPolicy[it[0]].enabled;
        var label = tt(it[1]);
        var title = disabled
          ? (channelPolicy[it[0]].reason || tt('send_not_allowed_here'))
          : label;
        return (
          '<button type="button" class="send-via-btn' + (active ? ' is-active' : '') + '" data-send="' + it[0] + '" title="' + esc(title) + '" style="--sv:' + it[2] + ';"' + (disabled ? ' disabled aria-disabled="true"' : '') + '>' +
          esc(label) +
          '</button>'
        );
      }).join('');
  }

  function bindSendVia() {
    if (sendViaBound) return;
    var row = ensureSendVia();
    if (!row) return;
    row.addEventListener('click', function (e) {
      var btn = e.target.closest('.send-via-btn');
      if (!btn) return;
      var v = btn.getAttribute('data-send') || 'notes';
      sendVia = v;
      syncSendVia();
      updateComposerForSendVia();
    });
    sendViaBound = true;
  }

  function canSendViaApp() {
    var key = normalizeType(sendVia);
    return !!(channelPolicy[key] && channelPolicy[key].enabled);
  }

  function updateComposerForSendVia() {
    var input = document.getElementById('mb-chat-input');
    var sendBtn = document.getElementById('mb-chat-send');
    var statusEl = document.getElementById('mb-chat-status');
    var key = normalizeType(sendVia);
    var ok = canSendViaApp();
    var reason = (channelPolicy[key] && channelPolicy[key].reason) || '';
    if (input) {
      input.disabled = !ok;
      input.placeholder = ok ? tt('write_note') : tt('send_not_allowed_here');
    }
    if (sendBtn) sendBtn.disabled = !ok;
    if (statusEl) {
      statusEl.style.display = 'block';
      if (ok) {
        statusEl.style.color = 'var(--text-muted)';
        statusEl.textContent = tt('send_ready_channel');
      } else {
        statusEl.style.color = 'var(--warn)';
        statusEl.textContent = reason || tt('send_not_allowed_here');
      }
    }
  }

  function fillHeader(p) {
    var name = p.name || p.email || (p.customer_id ? (tt('customer') + ' #' + p.customer_id) : tt('conversation'));
    var sub = [];
    if (p.email && p.email !== name) sub.push(p.email);
    if (p.phone) sub.push(p.phone);
    if (p.customer_id) sub.push('customer #' + p.customer_id);
    if (p.messenger_meta_id) sub.push('meta ' + String(p.messenger_meta_id).slice(-6));

    var nameEl = document.getElementById('mb-chat-name');
    var subEl = document.getElementById('mb-chat-sub');
    var avEl = document.getElementById('mb-chat-av');
    if (nameEl) nameEl.textContent = name;
    if (subEl) subEl.textContent = sub.join(' · ');
    if (avEl) avEl.textContent = initials(name);
    syncTypeTabs();
    syncSendVia();
    updateComposerForSendVia();
  }

  function filterRows(rows) {
    if (typeFilter === 'all') return rows;
    return rows.filter(function (r) {
      return normalizeType(r.type || r.channel) === typeFilter;
    });
  }

  function rowSortTs(row) {
    if (!row) return 0;
    if (row.sort_ts) return Number(row.sort_ts) || 0;
    var App = window.Biz1App || window.MineralBarApp;
    if (App && typeof App.messageSortTs === 'function') {
      return App.messageSortTs(row) || 0;
    }
    var raw = row.raw || {};
    var when = row.time || raw.inserted_date || raw.create_date || raw.time || '';
    if (App && typeof App.sortTsFromWhen === 'function') {
      return App.sortTsFromWhen(when) || 0;
    }
    var n = Date.parse(String(when || ''));
    return Number.isNaN(n) ? 0 : n;
  }

  /** Oldest → newest (WhatsApp). Always re-sort before paint. */
  function sortRowsByTime(rows) {
    return (rows || []).slice().sort(function (a, b) {
      var diff = rowSortTs(a) - rowSortTs(b);
      if (diff !== 0) return diff;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
  }

  function renderMessages(el, rows) {
    var html = '';
    var list = sortRowsByTime(filterRows(rows || []));
    if (!list.length) {
      html += notice('info', tt('no_messages_filter'), tt('single_conversations_hint'));
    } else {
      var lastDay = '';
      list.forEach(function (row) {
        var text = messageText(row);
        if (!text) return;
        var day = dayKey(row.time);
        if (day && day !== lastDay) {
          html += '<div class="msg-day-pill">' + esc(day) + '</div>';
          lastDay = day;
        }
        var out = isOutgoing(row);
        var who = row.user_name || '';
        if (who && who.indexOf('@') !== -1) who = '';
        var label = channelHeader(row, out);
        var clock = timeOnly(row.time);
        if (out) html += bubbleOut(text, clock, false, who, label);
        else html += bubbleIn(text, clock, who, label);
      });
    }
    el.innerHTML = html;
    el.scrollTop = el.scrollHeight;
    bindAudioPlayers(el);
  }

  function renderCached() {
    var el = document.getElementById('mb-live-chat');
    if (el) renderMessages(el, cachedRows);
  }

  async function resolveMessengerMetaId(p) {
    if (p.messenger_meta_id) return String(p.messenger_meta_id);
    if (!p.customer_id) return '';
    try {
      var App = window.Biz1App || window.MineralBarApp;
      var res = await App.listChatConversations({ page: 1, limit: 25, start: 0 });
      var rows = res.rows || [];
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (String(r.customer_id || r.cust_id || '') === String(p.customer_id)) {
          p.messenger_meta_id = r.messenger_meta_id || '';
          p.last_message = r.last_message || r.message || p.last_message;
          p.when = r.when || p.when;
          p.phone = r.phone || p.phone;
          p.name = p.name || r.name;
          return String(p.messenger_meta_id || '');
        }
      }
    } catch (e) { /* ignore */ }
    return '';
  }

  function listChannelFromMsgType(t) {
    var App = window.Biz1App || window.MineralBarApp;
    if (App && App.conversationListChannel) {
      return App.conversationListChannel({ last_message_type: t });
    }
    var s = String(t || '').toLowerCase();
    if (/notes|note|send_notes|internal/.test(s)) return 'notes';
    if (/email|mail/.test(s)) return 'email';
    if (/biz1|web|live|mision|mission/.test(s)) return 'web';
    return 'whatsapp';
  }

  function channelFromValue(type) {
    var t = normalizeType(type);
    if (t === 'email') return { from: 'send_email_quick', label: 'Email' };
    if (t === 'notes') return { from: 'send_notes', label: 'Notes' };
    if (t === 'biz1') return { from: 'biz1_chat_message', label: 'Biz1' };
    return { from: 'send_whatsapp', label: 'WA' };
  }

  function isPermissionDeniedError(err) {
    var text = '';
    try {
      text = [
        err && err.message,
        err && err.route,
        err && err.status,
        err && err.raw && err.raw.message,
        err && err.raw && err.raw.message_return,
        err && err.raw && err.raw.error
      ].filter(Boolean).join(' ').toLowerCase();
    } catch (e) { /* ignore */ }
    return /permission|denied|not allowed|forbidden|blocked|no permission|אין הרשאה|לא מורשה/.test(text);
  }

  function syncListChannelFromThread(p, rows) {
    if (!p || !p.messenger_meta_id || !rows || !rows.length) return;
    var ordered = sortRowsByTime(rows);
    var latest = ordered[ordered.length - 1];
    var text = messageText(latest);
    var ch = listChannelFromMsgType(latest.type || latest.channel);
    try {
      window.dispatchEvent(new CustomEvent('mineralbar:list-channel', {
        detail: {
          messenger_meta_id: p.messenger_meta_id,
          customer_id: p.customer_id,
          channel: ch,
          last_message: text
        }
      }));
    } catch (e) { /* ignore */ }
  }

  async function loadThread(el, p) {
    el.innerHTML =
      '<div class="msg-loading"><div class="msg-loading-title">' +
      esc(tt('loading_thread')) +
      '</div></div>';

    try {
      var meta = await resolveMessengerMetaId(p);
      if (!meta) {
        el.innerHTML = notice('warn', tt('missing_meta'), tt('open_from_list'));
        cachedRows = [];
        return [];
      }
      p.messenger_meta_id = meta;

      var App = window.Biz1App || window.MineralBarApp;
      var extra = { limit: 100, page: 1, start: 0 };
      if (p.customer_id && p.customer_id !== '0') extra.customer_id = p.customer_id;
      // Server-side type filter only when not "all"
      if (typeFilter !== 'all') {
        extra.type = typeFilter;
      }

      var res = await App.listSingleConversations(meta, extra);
      cachedRows = sortRowsByTime(res.rows || []);
      if (res.customer_id && (!p.customer_id || p.customer_id === '0')) {
        p.customer_id = String(res.customer_id);
        p.cust_id = p.customer_id;
      }
      renderMessages(el, cachedRows);
      syncListChannelFromThread(p, cachedRows);
      return cachedRows;
    } catch (err) {
      console.error('[Biz1Showcase] Chat.SingleConversations failed', err);
      el.innerHTML = notice('error', tt('load_thread_failed'), apiErrorText(err));
      cachedRows = [];
      return [];
    }
  }

  async function sendMessage(input, el, statusEl) {
    var p = currentParams;
    if (!p || isSending) return;

    if (!canSendViaApp()) {
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.color = 'var(--danger)';
        statusEl.textContent = tt('send_not_allowed_here');
      }
      showToast(tt('send_not_allowed_here'));
      return;
    }

    var textMsg = input ? String(input.value || '').trim() : '';
    var hasAttach = !!(pendingAttachment && pendingAttachment.file);
    if (!textMsg && !hasAttach) return;
    if (!p.customer_id || p.customer_id === '0') {
      el.insertAdjacentHTML(
        'beforeend',
        notice('error', tt('cannot_send'), hasAttach ? tt('select_customer_upload') : tt('missing_customer'))
      );
      return;
    }

    isSending = true;
    var attachSnapshot = hasAttach ? pendingAttachment : null;
    if (input) input.value = '';
    clearPendingAttachment();
    lastAttachToken = '';

    var previewText = textMsg;
    if (attachSnapshot) {
      previewText = (attachSnapshot.name || 'file') + (textMsg ? ('\n' + textMsg) : '') + '\n…';
      showToast(tt('uploading_file'));
    }
    el.insertAdjacentHTML(
      'beforeend',
      bubbleOut(previewText, nowTime(), true, tt('me'), channelHeader({ type: sendVia }, true))
    );
    el.scrollTop = el.scrollHeight;
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.style.color = 'var(--brand)';
      statusEl.textContent = attachSnapshot ? tt('uploading_file') : tt('sending');
    }
    try {
      var App = window.Biz1App || window.MineralBarApp;
      var finalMsg = textMsg;
      if (attachSnapshot) {
        if (!App || typeof App.uploadCustomerFile !== 'function') {
          throw new Error(tt('file_upload_failed'));
        }
        var uploaded = await App.uploadCustomerFile(p.customer_id, attachSnapshot.file, {
          file_name: attachSnapshot.name || 'upload'
        });
        var url = (uploaded && (uploaded.url || uploaded.path)) || '';
        if (!url && uploaded && uploaded.raw && uploaded.raw.file) {
          url = uploaded.raw.file.file_url || uploaded.raw.file.file_path || '';
        }
        if (url && !/^https?:\/\//i.test(url) && App.resolveFileUrl) {
          url = App.resolveFileUrl(url);
        }
        if (!url) throw new Error(tt('file_upload_failed'));
        finalMsg = (attachSnapshot.name || 'file') + (textMsg ? ('\n' + textMsg) : '') + '\n' + url;
      }

      var ch = channelFromValue(sendVia);
      var res = await App.sendCustomerMessage({
        message: finalMsg,
        msg: finalMsg,
        customer_id: p.customer_id,
        cust_id: p.customer_id,
        email: p.email || undefined,
        phone: p.phone || undefined,
        channel: sendVia,
        from: ch.from
      });
      if (statusEl) {
        statusEl.style.color = 'var(--success)';
        statusEl.textContent = attachSnapshot ? tt('file_sent') : (res.message || tt('note_saved'));
      }
      if (attachSnapshot) showToast(tt('file_sent'));
      await loadThread(el, p);
      try {
        window.dispatchEvent(new CustomEvent('mineralbar:messages', {
          detail: {
            group: 'messages',
            key: 'message.created',
            direction: 'out',
            channel: sendVia === 'biz1' ? 'web' : sendVia,
            customer_id: p.customer_id
          }
        }));
      } catch (e) { /* ignore */ }
    } catch (err) {
      console.error('[Biz1Showcase] Chat.SendCustomer failed', err);
      var errDetail = apiErrorText(err);
      if (isPermissionDeniedError(err)) {
        var k = normalizeType(sendVia);
        if (channelPolicy[k]) {
          channelPolicy[k].enabled = false;
          channelPolicy[k].reason = tt('send_permission_denied');
        }
        syncSendVia();
        updateComposerForSendVia();
        errDetail = tt('permission_denied_channel');
      }
      el.insertAdjacentHTML('beforeend', notice('error', tt('send_failed'), errDetail));
      if (statusEl) {
        statusEl.style.color = 'var(--danger)';
        statusEl.textContent = tt('send_failed');
      }
      el.scrollTop = el.scrollHeight;
    } finally {
      isSending = false;
    }
  }

  function setRecordUi(recording) {
    var btn = document.getElementById('mb-chat-record-btn');
    var hint = document.getElementById('mb-chat-attach-hint');
    var preview = document.getElementById('mb-chat-attach-preview');
    var nameEl = document.getElementById('mb-chat-attach-name');
    var thumb = document.getElementById('mb-chat-attach-thumb');
    if (btn) {
      btn.classList.toggle('is-recording', !!recording);
      btn.setAttribute('aria-pressed', recording ? 'true' : 'false');
      btn.setAttribute('aria-label', recording ? tt('record_stop') : tt('record_start'));
    }
    if (!recording) return;
    if (preview) preview.classList.add('is-open');
    if (nameEl) nameEl.textContent = tt('recording');
    if (hint) hint.textContent = '0:00';
    if (thumb) {
      thumb.innerHTML = '<svg fill="none" height="22" stroke="#e11d48" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="22"><circle cx="12" cy="12" r="6" fill="#e11d48"></circle></svg>';
    }
  }

  function clearRecordTimer() {
    if (recordTimer) {
      clearInterval(recordTimer);
      recordTimer = null;
    }
  }

  function stopRecordTracks() {
    if (recordStream) {
      try {
        recordStream.getTracks().forEach(function (t) { t.stop(); });
      } catch (e0) { /* ignore */ }
      recordStream = null;
    }
  }

  function cancelRecording(silent) {
    clearRecordTimer();
    isRecording = false;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop(); } catch (e1) { /* ignore */ }
    }
    mediaRecorder = null;
    recordChunks = [];
    stopRecordTracks();
    setRecordUi(false);
    if (!silent) {
      var preview = document.getElementById('mb-chat-attach-preview');
      if (preview && !pendingAttachment) preview.classList.remove('is-open');
    }
  }

  function pickRecorderMime() {
    var types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/ogg'
    ];
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    for (var i = 0; i < types.length; i++) {
      if (MediaRecorder.isTypeSupported(types[i])) return types[i];
    }
    return '';
  }

  async function startRecording() {
    if (isRecording || isSending) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast(tt('record_unsupported'));
      return;
    }
    if (!window.MediaRecorder) {
      showToast(tt('record_unsupported'));
      return;
    }
    try {
      clearPendingAttachment();
      lastAttachToken = '';
      setAttachMenuOpen(false);
      recordStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordChunks = [];
      var mime = pickRecorderMime();
      mediaRecorder = mime
        ? new MediaRecorder(recordStream, { mimeType: mime })
        : new MediaRecorder(recordStream);
      mediaRecorder.ondataavailable = function (ev) {
        if (ev.data && ev.data.size > 0) recordChunks.push(ev.data);
      };
      mediaRecorder.onstop = function () {
        clearRecordTimer();
        stopRecordTracks();
        var wasRecording = isRecording;
        isRecording = false;
        setRecordUi(false);
        if (!wasRecording) return;
        var blobType = (mediaRecorder && mediaRecorder.mimeType) || mime || 'audio/webm';
        var blob = new Blob(recordChunks, { type: blobType });
        recordChunks = [];
        mediaRecorder = null;
        if (!blob.size) {
          showToast(tt('record_empty'));
          return;
        }
        var ext = /ogg/i.test(blobType) ? 'ogg' : (/mp4|m4a/i.test(blobType) ? 'm4a' : 'webm');
        var fileName = 'voice-' + Date.now() + '.' + ext;
        var file = new File([blob], fileName, { type: blobType });
        setPendingAttachment(file, 'music');
        var hintEl = document.getElementById('mb-chat-attach-hint');
        if (hintEl) hintEl.textContent = tt('voice_ready');
        showToast(tt('voice_ready'));
      };
      mediaRecorder.start(250);
      isRecording = true;
      recordStartedAt = Date.now();
      setRecordUi(true);
      clearRecordTimer();
      recordTimer = setInterval(function () {
        var hint = document.getElementById('mb-chat-attach-hint');
        if (!hint || !isRecording) return;
        hint.textContent = fmtAudioClock((Date.now() - recordStartedAt) / 1000);
      }, 250);
    } catch (err) {
      console.error('[Biz1Showcase] mic record failed', err);
      cancelRecording(true);
      showToast(tt('record_permission'));
    }
  }

  function stopRecording() {
    if (!isRecording || !mediaRecorder) return;
    try {
      if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    } catch (e0) {
      cancelRecording(true);
    }
  }

  function toggleRecording() {
    if (isRecording) stopRecording();
    else startRecording();
  }

  function setAttachMenuOpen(open) {
    var menu = document.getElementById('mb-chat-attach-menu');
    var btn = document.getElementById('mb-chat-attach-btn');
    if (!menu) return;
    if (open) menu.classList.add('is-open');
    else menu.classList.remove('is-open');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function isAttachMenuOpen() {
    var menu = document.getElementById('mb-chat-attach-menu');
    return !!(menu && menu.classList.contains('is-open'));
  }

  function setAttachPreviewOpen(open) {
    var box = document.getElementById('mb-chat-attach-preview');
    if (!box) return;
    if (open) box.classList.add('is-open');
    else box.classList.remove('is-open');
  }

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
    setAttachMenuOpen(false);
    nameEl.textContent = pendingAttachment.name || pendingAttachment.file.name || 'file';
    if (hintEl) hintEl.textContent = tt('attach_ready');
    thumb.innerHTML = '';
    var isImage = pendingAttachment.kind === 'image' ||
      (pendingAttachment.file.type && pendingAttachment.file.type.indexOf('image/') === 0);
    if (isImage && pendingAttachment.previewUrl) {
      var img = document.createElement('img');
      img.src = pendingAttachment.previewUrl;
      img.alt = nameEl.textContent;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      thumb.appendChild(img);
    } else if (pendingAttachment.kind === 'music') {
      thumb.innerHTML = '<svg fill="none" height="22" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" viewBox="0 0 24 24" width="22"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>';
    } else if (pendingAttachment.kind === 'video') {
      thumb.innerHTML = '<svg fill="none" height="22" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" viewBox="0 0 24 24" width="22"><rect height="14" rx="2" width="16" x="3" y="5"></rect><path d="m16 12 5-3v6l-5-3z"></path></svg>';
    } else {
      thumb.innerHTML = '<svg fill="none" height="22" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" viewBox="0 0 24 24" width="22"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path></svg>';
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

  function detectAttachKind(file) {
    if (!file) return '';
    var name = String(file.name || '').toLowerCase();
    var type = String(file.type || '').toLowerCase();
    if (type.indexOf('image/') === 0 || /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(name)) return 'image';
    if (type.indexOf('audio/') === 0 || /\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i.test(name)) return 'music';
    if (type.indexOf('video/') === 0 || /\.(mp4|webm|mov|m4v)$/i.test(name)) return 'video';
    return 'file';
  }

  function openAttachPicker(kind) {
    var id = kind === 'image' ? 'mb-chat-file-image'
      : (kind === 'music' ? 'mb-chat-file-music' : 'mb-chat-file-doc');
    var fileInput = document.getElementById(id);
    if (!fileInput) {
      showToast(tt('file_upload_failed'));
      return;
    }
    try { fileInput.value = ''; } catch (e0) { /* ignore */ }
    fileInput.click();
  }

  function bindAttachUi() {
    if (attachUiBound) return;
    attachUiBound = true;

    document.addEventListener('click', function (e) {
      if (e.target.closest('#mb-chat-attach-clear')) {
        e.preventDefault();
        if (isRecording) cancelRecording(true);
        clearPendingAttachment();
        lastAttachToken = '';
        return;
      }
      if (e.target.closest('#mb-chat-record-btn')) {
        e.preventDefault();
        toggleRecording();
        return;
      }
      if (e.target.closest('#mb-chat-attach-btn')) {
        e.preventDefault();
        if (isRecording) return;
        setAttachMenuOpen(!isAttachMenuOpen());
        return;
      }
      var attachOpt = e.target.closest('.mb-attach-opt');
      if (attachOpt) {
        e.preventDefault();
        var kind = attachOpt.getAttribute('data-attach') || 'file';
        if (kind === 'record') {
          setAttachMenuOpen(false);
          toggleRecording();
          return;
        }
        openAttachPicker(kind);
        return;
      }
      if (isAttachMenuOpen() && !e.target.closest('#mb-chat-attach-menu') && !e.target.closest('#mb-chat-attach-btn')) {
        setAttachMenuOpen(false);
      }
    });

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

  function bindComposer() {
    if (composerBound) return;
    var input = document.getElementById('mb-chat-input');
    var sendBtn = document.getElementById('mb-chat-send');
    var el = document.getElementById('mb-live-chat');
    var statusEl = document.getElementById('mb-chat-status');
    if (!el) return;

    function go() {
      sendMessage(input, el, statusEl);
    }
    if (sendBtn) sendBtn.addEventListener('click', go);
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          go();
        }
      });
    }
    bindAttachUi();
    composerBound = true;
  }

  function showInboxChatUi(active) {
    var layout = document.getElementById('inboxLayout');
    var empty = document.getElementById('inboxChatEmpty');
    var pane = document.getElementById('inboxChatActive');
    if (empty) empty.classList.toggle('hidden', !!active);
    if (pane) pane.classList.toggle('hidden', !active);
    if (layout) layout.classList.toggle('is-chat-open', !!active);
  }

  async function openConversation(p, opts) {
    opts = opts || {};
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    var el = document.getElementById('mb-live-chat');
    if (!el) return;

    currentParams = p;
    resetChannelPolicy();
    typeFilter = normalizeType(p.type || 'all');
    if (typeFilter !== 'all' && typeFilter !== 'whatsapp' && typeFilter !== 'email' &&
        typeFilter !== 'notes' && typeFilter !== 'biz1') {
      typeFilter = 'all';
    }
    p.type = typeFilter;
    if (typeFilter === 'notes' || typeFilter === 'email' || typeFilter === 'whatsapp' || typeFilter === 'biz1') {
      sendVia = typeFilter;
    } else {
      sendVia = 'notes';
    }

    showInboxChatUi(true);
    bindTypeTabs();
    bindSendVia();
    fillHeader(p);
    bindComposer();
    await loadThread(el, p);

    if (opts.updateUrl !== false && document.getElementById('inboxLayout')) {
      var q = new URLSearchParams();
      if (p.customer_id) {
        q.set('customer_id', p.customer_id);
        q.set('cust_id', p.customer_id);
      }
      if (p.name) q.set('name', p.name);
      if (p.email) q.set('email', p.email);
      if (p.phone) q.set('phone', p.phone);
      if (p.subject) q.set('subject', p.subject);
      if (p.messenger_meta_id) q.set('messenger_meta_id', p.messenger_meta_id);
      if (p.last_message) q.set('last_message', p.last_message);
      if (typeFilter && typeFilter !== 'all') q.set('type', typeFilter);
      var qs = q.toString();
      history.replaceState({ inbox: true }, '', location.pathname + (qs ? '?' + qs : ''));
    }

    window.dispatchEvent(new CustomEvent('mineralbar:chat-opened', { detail: p }));
  }

  function closeConversation() {
    currentParams = null;
    cachedRows = [];
    clearPendingAttachment();
    lastAttachToken = '';
    setAttachMenuOpen(false);
    showInboxChatUi(false);
    if (document.getElementById('inboxLayout')) {
      history.replaceState({ inbox: true }, '', location.pathname);
    }
    document.querySelectorAll('.conv-row.is-selected').forEach(function (n) {
      n.classList.remove('is-selected');
    });
  }

  function getCurrentParams() {
    return currentParams;
  }

  async function startStandalone() {
    if (startedStandalone) return;
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    var el = document.getElementById('mb-live-chat');
    if (!el) return;

    if (document.getElementById('inboxLayout')) {
      var fromUrl = paramsFromSearch();
      if (fromUrl.customer_id || fromUrl.messenger_meta_id) {
        await openConversation(fromUrl, { updateUrl: false });
        document.querySelectorAll('.conv-row').forEach(function (row) {
          if (row.getAttribute('data-customer-id') === String(fromUrl.customer_id)) {
            row.classList.add('is-selected', 'is-active');
          }
        });
      }
      var back = document.getElementById('inboxChatBack');
      if (back) back.addEventListener('click', closeConversation);
      startedStandalone = true;
      return;
    }

    var p = paramsFromSearch();
    currentParams = p;
    resetChannelPolicy();
    typeFilter = p.type || 'all';
    if (typeFilter === 'notes' || typeFilter === 'email' || typeFilter === 'whatsapp' || typeFilter === 'biz1') {
      sendVia = typeFilter;
    } else {
      sendVia = 'notes';
    }
    bindTypeTabs();
    bindSendVia();
    fillHeader(p);
    bindComposer();
    await loadThread(el, p);
    startedStandalone = true;
  }

  window.MineralBarChat = {
    open: openConversation,
    close: closeConversation,
    paramsFromRow: paramsFromRow,
    paramsFromSearch: paramsFromSearch,
    getCurrentParams: getCurrentParams,
    loadThread: function () {
      var el = document.getElementById('mb-live-chat');
      if (!el || !currentParams) return Promise.resolve([]);
      return loadThread(el, currentParams);
    }
  };

  window.addEventListener('mineralbar:ready', startStandalone);
  window.addEventListener('mineralbar:lang', function () {
    ensureTypeTabs();
    syncSendVia();
    if (currentParams) {
      fillHeader(currentParams);
      var el = document.getElementById('mb-live-chat');
      if (el) loadThread(el, currentParams);
    }
  });
  window.addEventListener('mineralbar:messages', function () {
    var el = document.getElementById('mb-live-chat');
    if (el && currentParams) loadThread(el, currentParams);
  });
})();
