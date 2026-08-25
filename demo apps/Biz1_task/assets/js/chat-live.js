/**
 * Customer chat thread — Chat.CustomerMessages + Chat.SendCustomer
 * (per https://eli.bull36.com/app/help/category/Chat)
 * Requires customer_id (aliases: cust_id, contactus_id).
 */
(function () {
  'use strict';

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

  function bubbleIn(text, time, who) {
    return (
      '<div style="align-self:flex-start;max-width:80%;background:#fff;border-radius:4px 16px 16px 16px;padding:11px 13px 8px;box-shadow:0 1px 2px rgba(15,24,40,.08);">' +
      (who ? '<div style="font-size:11px;font-weight:700;color:#1d60a2;margin-bottom:3px;">' + esc(who) + '</div>' : '') +
      '<div style="font-size:14.5px;color:#1f2a3a;line-height:1.5;white-space:pre-wrap;">' + esc(text) + '</div>' +
      (time ? '<div style="font-size:11px;color:#9aa3b0;text-align:left;margin-top:3px;">' + esc(time) + '</div>' : '') +
      '</div>'
    );
  }

  function bubbleOut(text, time, pending, who) {
    return (
      '<div style="align-self:flex-end;max-width:80%;display:flex;flex-direction:column;align-items:flex-start;">' +
      '<div style="background:#dcf2c5;border-radius:16px 4px 16px 16px;padding:11px 13px;">' +
      (who ? '<div style="font-size:11px;font-weight:700;color:#3a6b2a;margin-bottom:3px;">' + esc(who) + '</div>' : '') +
      '<div style="font-size:14.5px;color:#23331a;line-height:1.5;white-space:pre-wrap;">' + esc(text) + '</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:4px;padding:4px 4px 0;">' +
      (pending
        ? '<span style="font-size:11px;color:#bd8324;">שולח…</span>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5aa9d6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 13l4 4 7-10"/><path d="M11 16l3 1 7-10"/></svg>') +
      (time ? '<span style="font-size:11px;color:#8a96a3;">' + esc(time) + '</span>' : '') +
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
    var sub = [];
    if (p.email && p.email !== name) sub.push(p.email);
    if (p.phone) sub.push(p.phone);
    if (p.customer_id) sub.push('customer #' + p.customer_id);
    if (!sub.length) sub.push('Chat.CustomerMessages');

    var nameEl = document.getElementById('mb-chat-name');
    var subEl = document.getElementById('mb-chat-sub');
    var avEl = document.getElementById('mb-chat-av');
    if (nameEl) nameEl.textContent = name;
    if (subEl) subEl.textContent = sub.join(' · ');
    if (avEl) avEl.textContent = initials(name);
  }

  function renderMessages(el, rows, p) {
    var html = '';
    html += '<div style="align-self:center;background:#dde2ea;color:#6b7585;font-size:12px;font-weight:700;padding:4px 13px;border-radius:99px;">שיחת לקוח</div>';

    if (!rows.length) {
      html += notice(
        'info',
        'אין הודעות עדיין',
        'Chat.CustomerMessages החזיר רשימה ריקה.\nאפשר לשלוח הודעה ראשונה עם Chat.SendCustomer.'
      );
    } else {
      rows.forEach(function (row) {
        var text = row.message || '';
        if (!text) return;
        if (isOutgoing(row)) html += bubbleOut(text, row.time, false, row.user_name || '');
        else html += bubbleIn(text, row.time, row.user_name || '');
      });
    }
    el.innerHTML = html;
    el.scrollTop = el.scrollHeight;
  }

  async function loadThread(el, p) {
    el.innerHTML =
      '<div style="text-align:center;padding:28px;font-size:13px;font-weight:700;color:#8a93a3;">טוען Chat.CustomerMessages…</div>';

    if (!p.customer_id || p.customer_id === '0') {
      el.innerHTML = notice(
        'warn',
        'חסר customer_id',
        'פתחו שיחה מרשימת שיחות או מכרטיס לקוח.\nנדרש customer_id לפי Chat help.'
      );
      return [];
    }

    try {
      var res = await MineralBarApp.listCustomerMessages(p.customer_id, { limit: 25 });
      renderMessages(el, res.rows || [], p);
      return res.rows || [];
    } catch (err) {
      console.error('[MineralBar] Chat.CustomerMessages failed', err);
      el.innerHTML = notice('error', 'שגיאת טעינת שיחה', apiErrorText(err));
      return [];
    }
  }

  async function sendMessage(p, input, el, statusEl) {
    var msg = (input.value || '').trim();
    if (!msg) return;
    if (!p.customer_id || p.customer_id === '0') {
      el.insertAdjacentHTML(
        'beforeend',
        notice('error', 'לא ניתן לשלוח', 'חסר customer_id')
      );
      return;
    }
    input.value = '';
    el.insertAdjacentHTML('beforeend', bubbleOut(msg, nowTime(), true, 'אני'));
    el.scrollTop = el.scrollHeight;
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.style.color = '#1d60a2';
      statusEl.textContent = 'שולח Chat.SendCustomer…';
    }
    try {
      var res = await MineralBarApp.sendCustomerMessage({
        message: msg,
        msg: msg,
        customer_id: p.customer_id,
        cust_id: p.customer_id,
        email: p.email || undefined
      });
      if (statusEl) {
        statusEl.style.color = '#2e8a63';
        statusEl.textContent = res.message || 'נשלח';
      }
      // Refresh thread so server ordering/ids stay correct
      await loadThread(el, p);
    } catch (err) {
      console.error('[MineralBar] Chat.SendCustomer failed', err);
      el.insertAdjacentHTML(
        'beforeend',
        notice('error', 'שליחה נכשלה', apiErrorText(err))
      );
      if (statusEl) {
        statusEl.style.color = '#c0392b';
        statusEl.textContent = 'שגיאת שליחה';
      }
      el.scrollTop = el.scrollHeight;
    }
  }

  var started = false;
  async function start() {
    if (started) return;
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    var el = document.getElementById('mb-live-chat');
    if (!el) return;
    started = true;

    var p = params();
    fillHeader(p);
    await loadThread(el, p);

    var input = document.getElementById('mb-chat-input');
    var sendBtn = document.getElementById('mb-chat-send');
    var statusEl = document.getElementById('mb-chat-status');

    function go() {
      sendMessage(p, input, el, statusEl);
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
  }

  window.addEventListener('mineralbar:ready', start);
  window.addEventListener('mineralbar:messages', function () {
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    var el = document.getElementById('mb-live-chat');
    if (!el) return;
    clearTimeout(window.__mbChatRtTimer);
    window.__mbChatRtTimer = setTimeout(function () {
      loadThread(el, params());
    }, 400);
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 50); });
  } else {
    setTimeout(start, 50);
  }
})();
