/**
 * Live Customer.Get for כרטיס ליד / כרטיס לקוח.
 * Expects ?customer_id=… (also accepts id / lead_id).
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

  function t(en, he) {
    if (typeof window.mbT === 'function') return window.mbT(en, he);
    var lang = (typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage()) || 'he';
    return lang === 'en' ? en : he;
  }

  function apiErrorText(err) {
    if (!err) return t('Unknown API error', 'שגיאת API לא ידועה');
    var parts = [];
    if (err.message) parts.push(String(err.message).replace(/<[^>]+>/g, ' ').trim());
    if (err.route) parts.push('route: ' + err.route);
    if (err.status) parts.push('status: ' + err.status);
    return parts.join('\n') || String(err);
  }

  function qsParam() {
    var p = new URLSearchParams(location.search || '');
    var id = p.get('customer_id') || p.get('cust_id') || p.get('contactus_id') ||
      p.get('lead_id') || p.get('id') || '';
    if (!id && location.hash) {
      var h = new URLSearchParams(String(location.hash || '').replace(/^#/, ''));
      id = h.get('customer_id') || h.get('cust_id') || h.get('id') || '';
    }
    if (!id) {
      var m = String(location.href || '').match(/[?&#](?:customer_id|cust_id|contactus_id|lead_id)=([^&#]+)/i);
      if (m && m[1]) {
        try { id = decodeURIComponent(m[1]); } catch (e) { id = m[1]; }
      }
    }
    if (!id) {
      try { id = sessionStorage.getItem('mb_customer_id') || localStorage.getItem('mb_customer_id') || ''; } catch (e2) { /* ignore */ }
    }
    if (id === '0' || id === 'null' || id === 'undefined') id = '';
    return String(id || '').trim();
  }

  function rememberCustomerId(id) {
    if (!id) return;
    try {
      sessionStorage.setItem('mb_customer_id', String(id));
      localStorage.setItem('mb_customer_id', String(id));
    } catch (e) { /* ignore */ }
    try {
      document.querySelectorAll('a[data-need-customer="1"]').forEach(function (a) {
        var href = a.getAttribute('href') || '';
        if (!href || href.indexOf('javascript:') === 0) return;
        var base = href.split('?')[0];
        var params = new URLSearchParams((href.split('?')[1] || ''));
        params.set('customer_id', String(id));
        a.setAttribute('href', base + '?' + params.toString());
      });
    } catch (e2) { /* ignore */ }
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2);
    return (parts[0][0] || '') + (parts[1][0] || '');
  }

  function formatPhone(raw) {
    var s = String(raw || '').replace(/\D/g, '');
    if (!s) return '';
    if (s.indexOf('972') === 0 && s.length >= 11) {
      return '0' + s.slice(3);
    }
    return String(raw);
  }

  function telHref(raw) {
    var s = String(raw || '').replace(/\D/g, '');
    if (!s) return '';
    if (s.indexOf('972') === 0) return 'tel:+' + s;
    if (s.charAt(0) === '0') return 'tel:+972' + s.slice(1);
    return 'tel:' + s;
  }

  function waHref(raw) {
    var s = String(raw || '').replace(/\D/g, '');
    if (!s) return '';
    if (s.charAt(0) === '0') s = '972' + s.slice(1);
    return 'https://wa.me/' + s;
  }

  var statusMapById = {};
  var statusMapByName = {};
  var statusMapsPromise = null;

  function stripHtmlText(s) {
    return String(s == null ? '' : s)
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function statusRowLabel(row) {
    var isEn = typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage() === 'en';
    return stripHtmlText(
      isEn
        ? (row.name_en || row.name || row.name_he || row.name_for || row.status_name || row.label)
        : (row.name_he || row.name || row.name_en || row.name_for || row.status_name || row.label)
    );
  }

  function ingestStatusRows(rows) {
    (rows || []).forEach(function (row) {
      if (!row) return;
      var label = statusRowLabel(row);
      if (!label) return;
      var color = String(row.color || row.status_color || '').trim() || '#1d60a2';
      var entry = { name: label, color: color };
      var id = row.status_id != null ? row.status_id : (row.id != null ? row.id : row.data_id);
      if (id != null && String(id).trim() !== '') statusMapById[String(id).trim()] = entry;
      statusMapByName[label.toLowerCase()] = entry;
      if (row.name_en) statusMapByName[String(row.name_en).toLowerCase()] = entry;
      if (row.name_he) statusMapByName[String(row.name_he).toLowerCase()] = entry;
    });
  }

  async function fetchStatusTypePages(client, type) {
    var start = 0;
    for (var page = 0; page < 12; page++) {
      var res = await client.request('Statuses.List', {
        type: type,
        limit: 25,
        length: 25,
        start: start
      });
      var rows = (res && (res.data || res.rows || res.output)) || [];
      if (!Array.isArray(rows) || !rows.length) break;
      ingestStatusRows(rows);
      if (rows.length < 25) break;
      start += rows.length;
    }
  }

  async function ensureStatusMaps() {
    if (statusMapsPromise) return statusMapsPromise;
    statusMapsPromise = (async function () {
      try {
        if (!window.MineralBarApp || typeof MineralBarApp.getClient !== 'function') return;
        var client = MineralBarApp.getClient();
        if (!client || !client.request) return;
        var types = ['status', 'internal_status', 'customer_status'];
        for (var i = 0; i < types.length; i++) {
          try { await fetchStatusTypePages(client, types[i]); } catch (e) { /* next */ }
        }
      } catch (e) {
        console.warn('[CustomerLive] Statuses.List failed', e);
      }
    })();
    return statusMapsPromise;
  }

  /** Same resolution as customers list: Customer.Get/List `status` → Statuses.List name */
  function resolveStatus(c) {
    c = c || {};
    var rawStatus = stripHtmlText(c.status);
    var named = stripHtmlText(
      c.sub_list_data_name ||
      c.internal_status_name ||
      c.status_label ||
      c.status_name ||
      c.status_text ||
      ''
    );

    if (named && !/^\d+$/.test(named)) {
      var byNamed = statusMapByName[named.toLowerCase()];
      return {
        label: named,
        color: (byNamed && byNamed.color) || String(c.status_color || c.color || '#1d60a2').trim() || '#1d60a2',
        bg: ''
      };
    }

    if (rawStatus && !/^\d+$/.test(rawStatus)) {
      var byRaw = statusMapByName[rawStatus.toLowerCase()];
      return {
        label: rawStatus,
        color: (byRaw && byRaw.color) || '#1d60a2',
        bg: ''
      };
    }

    var idCand = [rawStatus, c.sub_list_data, c.status_id, c.internal_status_id];
    for (var i = 0; i < idCand.length; i++) {
      var sid = idCand[i] == null ? '' : String(idCand[i]).trim();
      if (!sid || !/^\d+$/.test(sid)) continue;
      if (statusMapById[sid]) {
        return {
          label: statusMapById[sid].name,
          color: statusMapById[sid].color || '#1d60a2',
          bg: ''
        };
      }
    }

    return { label: '', color: '#1d60a2', bg: '' };
  }

  function statusMeta(c) {
    var resolved = resolveStatus(c);
    if (!resolved.label) {
      return { label: '', bg: '#f1f3f6', color: '#5a6473' };
    }
    var color = resolved.color || '#1d60a2';
    var bg = color.charAt(0) === '#' ? (color + '22') : '#eaf2fb';
    return { label: resolved.label, bg: bg, color: color };
  }

  function fmtDate(v) {
    if (!v) return '';
    try {
      var d = new Date(v);
      if (!Number.isNaN(d.getTime())) {
        var pad = function(n) { return n < 10 ? '0' + n : n; };
        return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
      }
    } catch (e) { /* ignore */ }
    return String(v).slice(0, 16);
  }

  function loadingHtml() {
    if (window.MineralBarLoader && typeof MineralBarLoader.inlineHtml === 'function') {
      return MineralBarLoader.inlineHtml(
        typeof window.mbT === 'function' ? window.mbT('Loading customer…', 'טוען כרטיס…') : 'טוען כרטיס…'
      );
    }
    return (
      '<div class="mb-inline-loader">' +
      '<div class="mb-page-loader__spin" aria-hidden="true"></div>' +
      '<div class="mb-page-loader__label">טוען כרטיס…</div>' +
      '</div>'
    );
  }

  function ensureLoaderKeyframes() {
    if (document.getElementById('mb-customer-loader-style')) return;
    var style = document.createElement('style');
    style.id = 'mb-customer-loader-style';
    style.textContent = '@keyframes mb-spin{to{transform:rotate(360deg)}}';
    (document.head || document.documentElement).appendChild(style);
  }

  function liveMountEl() {
    return document.getElementById('mb-live-customer');
  }

  function setPageLoading(isLoading) {
    var banner = document.getElementById('mb-customer-loading');
    if (!banner) return;
    // CSS also hides this when #mb-live-customer is non-empty.
    if (isLoading) {
      banner.style.display = '';
      banner.removeAttribute('hidden');
    } else {
      banner.style.display = 'none';
      banner.setAttribute('hidden', '');
    }
  }

  function setMountHtml(html, opts) {
    var el = liveMountEl();
    if (!el || !el.isConnected) return null;
    var loading = !!(opts && opts.loading);
    if (loading) {
      // Keep React-owned mount empty during load; page banner shows spinner.
      el.innerHTML = '';
      setPageLoading(true);
    } else {
      el.innerHTML = html || '';
      setPageLoading(false);
    }
    return el;
  }

  function errorHtml(err) {
    return (
      '<div style="background:#fbeeed;border:1px solid #f0c9c4;border-radius:14px;padding:14px;margin-bottom:14px;">' +
      '<div style="font-size:14px;font-weight:800;color:#c0392b;margin-bottom:8px;">' + esc(t('API error', 'שגיאת API')) + '</div>' +
      '<pre style="margin:0;white-space:pre-wrap;word-break:break-word;font:600 11.5px/1.5 Heebo,monospace;color:#7a2e28;">' +
      esc(apiErrorText(err)) +
      '</pre>' +
      '<button type="button" id="mb-customer-retry" style="margin-top:12px;padding:9px 14px;border:none;border-radius:10px;background:#c0392b;color:#fff;font:800 13px Heebo,sans-serif;cursor:pointer;">' +
      esc(t('Try again', 'נסה שוב')) + '</button>' +
      '</div>'
    );
  }

  function detailRow(label, value, icon, last, opts) {
    if (value == null || value === '') return '';
    opts = opts || {};
    var valColor = opts.accent ? '#1d60a2' : '#1f2a3a';
    var valHtml = opts.href
      ? '<a href="' + esc(opts.href) + '" style="font-size:13.5px;color:' + valColor + ';font-weight:700;direction:ltr;text-align:end;min-width:0;word-break:break-word;text-decoration:none;">' + esc(value) + '</a>'
      : '<span style="font-size:13.5px;color:' + valColor + ';font-weight:700;direction:ltr;text-align:end;min-width:0;word-break:break-word;">' + esc(value) + '</span>';
    return (
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 0;' +
      (last ? '' : 'border-bottom:1px solid #f0f2f5;') + '">' +
      '<span style="display:inline-flex;align-items:center;gap:7px;font-size:12.5px;color:#9aa3b0;font-weight:600;flex:none;">' +
      (icon || '') + esc(label) +
      '</span>' +
      valHtml +
      '</div>'
    );
  }

  function iconPhone() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aeb6c2" stroke-width="2"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.3 1z"/></svg>';
  }
  function iconMail() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aeb6c2" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6.5 9 6 9-6"/></svg>';
  }
  function iconPin() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aeb6c2" stroke-width="2"><path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  }
  function iconRegion() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aeb6c2" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>';
  }
  function iconPerson() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aeb6c2" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>';
  }

  function actionTile(href, svg, label, extra) {
    var tag = href ? 'a' : 'div';
    var hrefAttr = href ? ' href="' + esc(href) + '"' + (extra || '') : '';
    return (
      '<' + tag + hrefAttr + ' class="gv-act" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 6px;background:#fff;border:1px solid #e8eaee;border-radius:14px;text-decoration:none;box-shadow:0 1px 2px rgba(0,0,0,.04);">' +
      svg +
      '<span style="font-size:12px;font-weight:700;color:#1f2a3a;text-align:center;">' + esc(label) + '</span>' +
      '</' + tag + '>'
    );
  }

  function fmtShortDate(v) {
    if (!v) return '';
    try {
      var d = new Date(v);
      if (!Number.isNaN(d.getTime())) {
        var pad = function (n) { return n < 10 ? '0' + n : String(n); };
        return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + String(d.getFullYear()).slice(-2);
      }
    } catch (e) { /* ignore */ }
    return String(v).slice(0, 10);
  }

  function fmtMoney(v) {
    if (v == null || v === '') return '';
    var s = String(v).replace(/[^\d.]/g, '');
    if (!s) return String(v);
    var n = Number(s);
    if (Number.isNaN(n)) return String(v);
    try {
      return '₪' + n.toLocaleString('he-IL');
    } catch (e2) {
      return '₪' + n;
    }
  }

  function normalizeProducts(raw) {
    var list = [];
    if (!raw) return list;
    if (Array.isArray(raw)) list = raw;
    else if (Array.isArray(raw.data)) list = raw.data;
    else if (Array.isArray(raw.rows)) list = raw.rows;
    else if (Array.isArray(raw.products)) list = raw.products;
    else if (Array.isArray(raw.output)) list = raw.output;
    else if (raw.output && Array.isArray(raw.output.data)) list = raw.output.data;
    else if (raw.data && Array.isArray(raw.data.products)) list = raw.data.products;
    return list.map(function (p) {
      if (!p) return null;
      var name = String(p.product_name || p.item_name || p.name || p.title || '').trim();
      if (!name) return null;
      var price = p.price || p.item_total || p.item_price || p.total || '';
      if (p.coin && p.item_price && !p.price) price = String(p.coin) + String(p.item_price);
      return {
        name: name,
        sub: String(p.document_type_label || p.document_type || p.order_type || p.date_display || p.date_created || '').trim(),
        price: price,
        kind: /ביטוח|insur/i.test(name) ? 'shield' : (/בר|מים|water/i.test(name) ? 'drop' : 'filter')
      };
    }).filter(Boolean);
  }

  function productIcon(kind) {
    if (kind === 'shield') {
      return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3 5 6v5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6z"/></svg>';
    }
    if (kind === 'drop') {
      return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3c3 4 6 7 6 10a6 6 0 0 1-12 0c0-3 3-6 6-10z"/></svg>';
    }
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 4h18l-7 9v6l-4 2v-8z"/></svg>';
  }

  function extractTicketRows(res) {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.rows)) return res.rows;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.tickets)) return res.tickets;
    if (Array.isArray(res.output)) return res.output;
    if (res.output && Array.isArray(res.output.data)) return res.output.data;
    return [];
  }

  function ticketStatusMeta(row) {
    var label = stripHtmlText(
      row.status_name || row.status_label || row.ticket_status || row.status || row.state || ''
    );
    var closed = /סגור|בוצע|closed|done|paid|שולם/i.test(label) ||
      Number(row.is_closed) === 1 || Number(row.closed) === 1;
    if (closed) {
      return {
        label: label || t('Paid and closed', 'שולם ונסגר'),
        color: '#2e8a63',
        bg: '#e6f4ec',
        border: '#2e8a63'
      };
    }
    if (/מתוזמן|scheduled/i.test(label)) {
      return { label: label, color: '#50439d', bg: '#eef0fb', border: '#50439d' };
    }
    return {
      label: label || t('Waiting', 'ממתין'),
      color: '#1d60a2',
      bg: '#eaf2fb',
      border: '#1d60a2'
    };
  }

  function missionDueKey(row) {
    if (!row) return '';
    if (row.date_to_do_format) return String(row.date_to_do_format).split('T')[0];
    var raw = row.date_to_do || row.due_date || row.date || row.time_mission || row.deadline || '';
    if (!raw) return '';
    var s = String(raw);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    try {
      var d = new Date(s);
      if (!Number.isNaN(d.getTime())) {
        return d.getFullYear() + '-' +
          String(d.getMonth() + 1).padStart(2, '0') + '-' +
          String(d.getDate()).padStart(2, '0');
      }
    } catch (e) { /* ignore */ }
    return '';
  }

  function missionOverdueMeta(row) {
    var when = missionDueKey(row);
    if (!when) return { overdue: false, label: '', bg: '#f1f3f6', color: '#5a6473' };
    var now = new Date();
    var today = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');
    var display = when.split('-').reverse().join('/');
    if (when < today) {
      return {
        overdue: true,
        label: t('Overdue', 'באיחור') + ' · ' + display,
        bg: '#fbeeed',
        color: '#c0392b'
      };
    }
    if (when === today) {
      return {
        overdue: false,
        label: t('Today', 'היום'),
        bg: '#eaf2fb',
        color: '#1d60a2'
      };
    }
    return {
      overdue: false,
      label: display,
      bg: '#f1f3f6',
      color: '#5a6473'
    };
  }

  function missionPriorityMeta(row) {
    var color = String((row && row.color) || '').toLowerCase();
    var priority = String((row && row.priority) || '').toLowerCase();
    var meta = {};
    try { meta = JSON.parse((row && row.meta) || '{}') || {}; } catch (e) { /* ignore */ }
    var he = String(meta.priority_he || '');
    if (/urgent|high|דחוף|גבוה/i.test(priority) || /דחוף|גבוה/i.test(he) || color === '#ef4444' || color === '#c0392b') {
      return { label: t('Urgent', 'דחוף'), bg: '#fee2e2', color: '#b91c1c', bar: '#ef4444' };
    }
    if (color === '#f59e0b' || color === '#eab308' || color === '#f1c40f' || color === 'yellow' ||
        /normal|medium|רגיל|בינוני/i.test(priority)) {
      return { label: t('Medium', 'בינוני'), bg: '#fef3c7', color: '#b45309', bar: '#f59e0b' };
    }
    if (/low|נמוכ/i.test(priority) || color === '#22c55e' || color === '#2e8a63') {
      return { label: t('Low', 'נמוך'), bg: '#e9f5ee', color: '#2e8a63', bar: '#22c55e' };
    }
    return { label: '', bg: '', color: '', bar: '' };
  }

  function historyKind(row) {
    var type = String((row && (row.type || row.channel || row.message_type)) || '').toLowerCase();
    var msg = String((row && (row.message || row.note || row.subject)) || '').toLowerCase();
    if (/whatsapp|wa|וואטס/.test(type) || /whatsapp|וואטס/.test(msg)) return 'wa';
    if (/email|mail|אימייל/.test(type) || /@/.test(msg)) return 'email';
    if (/call|phone|שיחה|חיוג/.test(type) || /call|שיחה/.test(msg)) return 'call';
    if (/quote|הצעת|document/.test(type) || /הצעת|quote/.test(msg)) return 'quote';
    if (/status|סטטוס/.test(type)) return 'status';
    if (/install|התקנ|meeting|פגיש/.test(type + msg)) return 'meet';
    return 'note';
  }

  function historyIconMeta(kind) {
    var map = {
      call: { bg: '#e6f4ec', color: '#2e8a63', svg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.3 1z"/></svg>' },
      wa: { bg: '#e7f7ee', color: '#25b35e', svg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2z"/></svg>' },
      email: { bg: '#eaf2fb', color: '#1d60a2', svg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6.5 9 6 9-6"/></svg>' },
      quote: { bg: '#eef0fb', color: '#50439d', svg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>' },
      status: { bg: '#eaf2fb', color: '#1d60a2', svg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>' },
      meet: { bg: '#f0eefb', color: '#50439d', svg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 2 4 6.5v9L12 20l8-4.5v-9z"/><path d="M4 6.5 12 11l8-4.5M12 11v9"/></svg>' },
      note: { bg: '#fdf1dd', color: '#bd8324', svg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M6 2.5h8L19 7v14.5H6z"/><path d="M14 2.5V7h5M9 12h6M9 16h4"/></svg>' }
    };
    return map[kind] || map.note;
  }

  function pickOwner(c) {
    return stripHtmlText(
      c.owner_name || c.user_name || c.assigned_name || c.manager_name ||
      c.team_member_name || c.agent_name || c.created_by_name || ''
    );
  }

  function pickRegion(c) {
    return stripHtmlText(c.region || c.area || c.zone || c.district || c.city_area || '');
  }

  function staticCustomerTracks() {
    return [
      {
        title: t('Filters route', 'מסלול סננים'),
        subtitle: t('Service for 5 filters', 'שירות ל־5 סננים'),
        tier: t('Silver', 'כסף'),
        status: t('Active', 'פעיל'),
        monthly: '89',
        monthlyLabel: t('Monthly Cost', 'עלות חודשית'),
        end: '12/2026',
        endLabel: t('Next Update', 'עדכון הבא'),
        next: '07/26',
        nextLabel: t('Next Installment', 'תשלום הבא'),
        primary: true,
        kind: 'filter'
      },
      {
        title: t('Insurance route', 'מסלול ביטוח'),
        subtitle: t('Cover for all household goods', 'כיסוי לכל מוצרי הבית'),
        status: t('Active', 'פעיל'),
        end: '02/2027',
        primary: false,
        kind: 'insurance'
      },
      {
        title: t('Warranty', 'אחריות'),
        subtitle: t('Warranty on parts only', 'אחריות על חלקים בלבד'),
        status: t('Active', 'פעיל'),
        end: t('until further notice', 'עד להודעה חדשה'),
        primary: false,
        kind: 'warranty'
      }
    ];
  }

  function pickPlans(c, products) {
    var plans = [];
    var src = c.plans || c.routes || c.subscriptions || c.customer_plans || c.plans_list;
    if (Array.isArray(src)) {
      src.forEach(function (p) {
        if (!p) return;
        plans.push({
          title: stripHtmlText(p.name || p.title || p.plan_name || p.route_name || ''),
          subtitle: stripHtmlText(p.subtitle || p.description || p.desc || ''),
          tier: stripHtmlText(p.tier || p.level || p.package || ''),
          status: stripHtmlText(p.status || p.status_name || t('Active', 'פעיל')),
          monthly: p.monthly || p.price || p.payment || '',
          end: p.end || p.end_date || p.expires || p.valid_until || '',
          next: p.next || p.next_maintenance || p.maintenance || p.next_installment || '',
          primary: !!p.primary || plans.length === 0,
          kind: String(p.kind || p.type || 'filter')
        });
      });
    }
    if (!plans.length) {
      var warranty = stripHtmlText(c.warranty || c.warranty_status || c.warranty_label || '');
      var insurance = stripHtmlText(c.insurance || c.insurance_status || c.insurance_label || '');
      if (warranty) {
        plans.push({
          title: t('Warranty', 'אחריות'),
          subtitle: '',
          status: warranty,
          monthly: '',
          end: c.warranty_end || c.warranty_until || '',
          next: '',
          primary: false,
          kind: 'warranty'
        });
      }
      if (insurance) {
        plans.push({
          title: t('Insurance route', 'מסלול ביטוח'),
          subtitle: '',
          status: insurance,
          monthly: '',
          end: c.insurance_end || '',
          next: '',
          primary: false,
          kind: 'insurance'
        });
      }
      (products || []).forEach(function (p) {
        if (!p || !p.name) return;
        if (/מסלול|plan|route|ביטוח|אחריות|insur|warran/i.test(p.name) && plans.length < 3) {
          plans.push({
            title: p.name,
            subtitle: p.sub || '',
            status: t('Active', 'פעיל'),
            monthly: p.price || '',
            end: '',
            next: '',
            primary: plans.length === 0,
            kind: p.kind || 'filter'
          });
        }
      });
    }
    plans = plans.filter(function (p) { return p.title; });
    // Fallback demo tracks when API has no route/plan data
    if (!plans.length) return staticCustomerTracks();
    return plans;
  }

  async function fetchCustomerExtras(customerId) {
    var cid = String(customerId || '').trim();
    var empty = { products: [], tickets: [], missions: [], history: [] };
    if (!cid || !window.MineralBarApp) return empty;

    var productsP = (async function () {
      try {
        if (!MineralBarApp.getClient) return [];
        var client = MineralBarApp.getClient();
        if (!client || !client.request) return [];
        var attempts = [
          { customer_id: cid, page_id: 1, limit: 25 },
          { cust_id: cid, page_id: 1, limit: 25 },
          { customer_id: cid, length: 25, start: 0 }
        ];
        for (var i = 0; i < attempts.length; i++) {
          try {
            var res = await client.request('Documents.Products', attempts[i]);
            if (res && String(res.success) === '0') continue;
            return normalizeProducts(res);
          } catch (e) { /* next */ }
        }
      } catch (e2) { /* ignore */ }
      return [];
    })();

    var ticketsP = (async function () {
      try {
        if (!MineralBarApp.getClient) return [];
        var client = MineralBarApp.getClient();
        if (!client || !client.request) return [];
        var res = await client.request('Ticket.List', {
          customer_id: cid,
          cust_id: cid,
          contactus_id: cid,
          limit: 10,
          length: 10,
          start: 0
        });
        var rows = extractTicketRows(res).filter(function (row) {
          var rid = String(row.customer_id || row.cust_id || row.contactus_id || '').trim();
          return !rid || rid === cid;
        });
        return rows.slice(0, 6);
      } catch (e) {
        return [];
      }
    })();

    var missionsP = (async function () {
      try {
        if (!MineralBarApp.listMissions) return [];
        var res = await MineralBarApp.listMissions({
          customer_id: cid,
          cust_id: cid,
          length: 25,
          start: 0,
          draw: 1
        });
        var rows = (res && res.rows) || [];
        return rows.filter(function (r) {
          var rid = String(r.customer_id || r.cust_id || r.contactus_id || '').trim();
          if (rid && rid !== cid) return false;
          return !(r.is_done || Number(r.done) === 1);
        }).slice(0, 8);
      } catch (e) {
        return [];
      }
    })();

    var historyP = (async function () {
      try {
        if (!MineralBarApp.listCustomerMessages) return [];
        var res = await MineralBarApp.listCustomerMessages(cid, { limit: 12 });
        var rows = (res && res.rows) || [];
        return rows.slice().reverse().slice(0, 8);
      } catch (e) {
        return [];
      }
    })();

    var settled = await Promise.all([productsP, ticketsP, missionsP, historyP]);
    return {
      products: settled[0],
      tickets: settled[1],
      missions: settled[2],
      history: settled[3]
    };
  }

  function formatPlanDate(v) {
    if (!v) return '';
    // Keep display strings like 12/2026 or "until further notice" as-is
    if (/[/\u05d0-\u05ea]/.test(String(v)) || /until|notice|הודעה|NIS|₪/i.test(String(v))) {
      return String(v);
    }
    return fmtShortDate(v) || String(v);
  }

  function renderPlansSection(plans) {
    if (!plans || !plans.length) return '';
    var primary = plans.find(function (p) { return p.primary; }) || plans[0];
    var secondary = plans.filter(function (p) { return p !== primary; }).slice(0, 2);
    var html = '';
    html += '<div style="font-size:14px;font-weight:800;color:#1f2a3a;margin:2px 2px 11px;">' +
      esc(t("The customer's routes", 'המסלולים של הלקוח')) + '</div>';
    if (primary) {
      var monthlyVal = primary.monthly
        ? (/nis|₪|ש״ח/i.test(String(primary.monthly)) ? String(primary.monthly) : (fmtMoney(primary.monthly) || String(primary.monthly)))
        : '—';
      html +=
        '<div style="background:linear-gradient(135deg,#1d60a2,#16487c);border-radius:16px;padding:15px;color:#fff;margin-bottom:11px;position:relative;overflow:hidden;">' +
        '<div style="position:absolute;top:-20px;left:-12px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,.07);"></div>' +
        '<div style="position:relative;">' +
        (primary.tier
          ? '<div style="display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.16);font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:99px;margin-bottom:10px;">' +
            '<span style="width:6px;height:6px;border-radius:50%;background:#5fd497;"></span>' + esc(primary.tier) +
            '</div>'
          : '') +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">' +
        '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:15.5px;font-weight:800;">' + esc(primary.title) + '</div>' +
        (primary.subtitle
          ? '<div style="font-size:12px;opacity:.85;margin-top:3px;">' + esc(primary.subtitle) + '</div>'
          : (!primary.tier && primary.status
            ? '<div style="display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,.18);font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:99px;margin-top:6px;">' +
              '<span style="width:5px;height:5px;border-radius:50%;background:#5fd497;"></span>' + esc(primary.status) + '</div>'
            : '')) +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;margin-top:14px;">' +
        '<div style="padding-inline-end:10px;">' +
        '<div style="font-size:10.5px;opacity:.8;">' + esc(primary.monthlyLabel || t('Monthly Cost', 'עלות חודשית')) + '</div>' +
        '<div style="font-size:15px;font-weight:800;margin-top:3px;">' + esc(monthlyVal) + '</div></div>' +
        '<div style="padding:0 10px;border-inline-start:1px solid rgba(255,255,255,.22);border-inline-end:1px solid rgba(255,255,255,.22);">' +
        '<div style="font-size:10.5px;opacity:.8;">' + esc(primary.endLabel || t('Next Update', 'עדכון הבא')) + '</div>' +
        '<div style="font-size:15px;font-weight:800;margin-top:3px;">' + esc(primary.end ? formatPlanDate(primary.end) : '—') + '</div></div>' +
        '<div style="padding-inline-start:10px;">' +
        '<div style="font-size:10.5px;opacity:.8;">' + esc(primary.nextLabel || t('Next Installment', 'תשלום הבא')) + '</div>' +
        '<div style="font-size:15px;font-weight:800;margin-top:3px;">' + esc(primary.next ? formatPlanDate(primary.next) : '—') + '</div></div>' +
        '</div></div>' +
        '<div style="width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center;flex:none;">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><path d="M3 4h18l-7 9v6l-4 2v-8z"/></svg>' +
        '</div></div></div></div>';
    }
    if (secondary.length) {
      html += '<div style="display:flex;gap:11px;margin-bottom:18px;">';
      secondary.forEach(function (p) {
        var isIns = p.kind === 'insurance';
        var accent = isIns ? '#2e8a63' : '#50439d';
        var iconBg = isIns ? '#e9f5ee' : '#eef0fb';
        html +=
          '<div style="flex:1;background:#fff;border-radius:16px;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,.05);border-top:3px solid ' + accent + ';">' +
          '<div style="width:34px;height:34px;border-radius:50%;background:' + iconBg + ';color:' + accent + ';display:flex;align-items:center;justify-content:center;margin-bottom:10px;">' +
          (isIns
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3 5 6v5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6z"/><path d="m9 11 2 2 4-4"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3 5 6v5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6z"/></svg>') +
          '</div>' +
          '<div style="font-size:13.5px;font-weight:800;color:#1f2a3a;">' + esc(p.title) + '</div>' +
          (p.subtitle ? '<div style="font-size:11.5px;color:#9aa3b0;margin-top:3px;line-height:1.4;">' + esc(p.subtitle) + '</div>' : '') +
          '<div style="font-size:12px;color:#5a6473;margin-top:10px;">' +
          esc(t('Status', 'סטטוס')) + ': <span style="color:#2e8a63;font-weight:800;">' + esc(p.status || t('Active', 'פעיל')) + '</span>' +
          '</div>' +
          (p.end
            ? '<div style="font-size:12px;color:#5a6473;margin-top:4px;">' +
              esc(t('Until', 'עד')) + ': <span style="font-weight:700;color:#1f2a3a;">' + esc(formatPlanDate(p.end)) + '</span></div>'
            : '') +
          '</div>';
      });
      html += '</div>';
    } else {
      html += '<div style="margin-bottom:18px;"></div>';
    }
    return html;
  }

  function renderProductsSection(products) {
    var html = '<div style="font-size:14px;font-weight:800;color:#1f2a3a;margin:2px 2px 11px;">' +
      esc(t('purchased products', 'מוצרים שנרכשו')) + '</div>';
    if (!products || !products.length) {
      return html +
        '<div style="background:#fff;border-radius:16px;padding:18px 15px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-bottom:18px;text-align:center;color:#9aa3b0;font-size:13px;font-weight:600;">' +
        esc(t('This customer has no purchased products', 'ללקוח זה אין מוצרים שנרכשו')) +
        '</div>';
    }
    html += '<div style="background:#fff;border-radius:16px;padding:6px 15px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-bottom:18px;">';
    products.slice(0, 8).forEach(function (p, i, arr) {
      var iconBg = p.kind === 'shield' ? '#e9f5ee' : (p.kind === 'drop' ? '#eaf2fb' : '#eef3fd');
      var iconColor = p.kind === 'shield' ? '#2e8a63' : '#1d60a2';
      html +=
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 0;' +
        (i === arr.length - 1 ? '' : 'border-bottom:1px solid #f0f2f5;') + '">' +
        '<div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">' +
        '<div style="width:36px;height:36px;border-radius:10px;background:' + iconBg + ';color:' + iconColor + ';display:flex;align-items:center;justify-content:center;flex:none;">' +
        productIcon(p.kind) + '</div>' +
        '<div style="min-width:0;">' +
        '<div style="font-size:14px;font-weight:700;color:#1f2a3a;">' + esc(p.name) + '</div>' +
        (p.sub ? '<div style="font-size:11.5px;color:#9aa3b0;margin-top:2px;">' + esc(p.sub) + '</div>' : '') +
        '</div></div>' +
        (p.price ? '<span style="font-size:13.5px;font-weight:800;color:#1f2a3a;flex:none;">' + esc(fmtMoney(p.price)) + '</span>' : '') +
        '</div>';
    });
    html += '</div>';
    return html;
  }

  function renderTicketsSection(tickets, customerId) {
    var openUrl = 'service-open-call.html?customer_id=' + encodeURIComponent(customerId) +
      '&cust_id=' + encodeURIComponent(customerId);
    var html = '<div style="font-size:14px;font-weight:800;color:#1f2a3a;margin:2px 2px 11px;">' +
      esc(t('Service calls', 'קריאות שירות')) + '</div>';
    if (tickets && tickets.length) {
      tickets.slice(0, 4).forEach(function (row) {
        var tid = row.ticket_id || row.id || row.ID || '';
        var title = stripHtmlText(row.subject || row.title || row.type_name || row.ticket_type || row.description || ('#' + tid));
        var when = fmtShortDate(row.date_created || row.created_at || row.opendate || row.date || row.scheduled_date);
        var st = ticketStatusMeta(row);
        var href = tid
          ? 'service-call-details.html?ticket_id=' + encodeURIComponent(tid)
          : '#';
        html +=
          '<a href="' + esc(href) + '" style="display:block;background:#fff;border-radius:14px;padding:13px 14px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-bottom:9px;text-decoration:none;border-right:3px solid ' + esc(st.border) + ';">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">' +
          '<div style="min-width:0;flex:1;">' +
          '<div style="font-size:14px;font-weight:800;color:#1f2a3a;">' + esc(title) + '</div>' +
          (when ? '<div style="font-size:11.5px;color:#9aa3b0;margin-top:3px;">' + esc(when) + '</div>' : '') +
          '</div>' +
          '<span style="display:inline-flex;align-items:center;gap:4px;background:' + esc(st.bg) + ';color:' + esc(st.color) + ';font-size:11px;font-weight:700;padding:4px 9px;border-radius:99px;flex:none;white-space:nowrap;">' +
          esc(st.label) + '</span></div></a>';
      });
    } else {
      html +=
        '<div style="background:#fff;border-radius:14px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-bottom:9px;text-align:center;color:#9aa3b0;font-size:13px;font-weight:600;">' +
        esc(t('No service calls', 'אין קריאות שירות')) + '</div>';
    }
    html +=
      '<a href="' + esc(openUrl) + '" style="display:flex;align-items:center;justify-content:center;gap:7px;width:100%;padding:13px;border:1.5px dashed #b7cbe4;border-radius:14px;background:#f7faff;color:#1d60a2;font-size:14px;font-weight:800;text-decoration:none;margin-bottom:18px;">' +
      '+ ' + esc(t('Open a new service call', 'פתיחת קריאת שירות חדשה')) + '</a>';
    return html;
  }

  function renderMissionsSection(missions, customerId, name, phone, city) {
    var createUrl = 'service-create-task.html?customer_id=' + encodeURIComponent(customerId) +
      '&name=' + encodeURIComponent(name || '') +
      (phone ? '&phone=' + encodeURIComponent(phone) : '') +
      (city ? '&city=' + encodeURIComponent(city) : '') +
      '&from=customer';
    var html = '<div style="font-size:14px;font-weight:800;color:#1f2a3a;margin:2px 2px 11px;">' +
      esc(t('Open tasks', 'משימות פתוחות')) + '</div>';
    html += '<div style="background:#fff;border-radius:16px;padding:6px 15px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-bottom:18px;">';
    if (!missions || !missions.length) {
      html +=
        '<div style="padding:16px 2px;text-align:center;color:#9aa3b0;font-size:13px;font-weight:600;">' +
        esc(t('No open tasks currently', 'אין משימות פתוחות כרגע')) +
        '</div></div>';
      return html;
    }
    missions.forEach(function (m, i, arr) {
      var title = stripHtmlText(m.mission || m.title || m.name || m.mission_name || m.subject || m.note || t('Task', 'משימה'));
      var meta = missionOverdueMeta(m);
      var pri = missionPriorityMeta(m);
      var mid = m.mission_id || m.id || '';
      var href = mid ? 'sales-tasks.html?mission_id=' + encodeURIComponent(mid) : createUrl;
      var assignee = stripHtmlText(m.user_name || m.assignee_name || m.assigned_to_name || '');
      html +=
        '<a href="' + esc(href) + '" style="display:block;padding:12px 0;text-decoration:none;' +
        (i === arr.length - 1 ? '' : 'border-bottom:1px solid #f0f2f5;') +
        (pri.bar ? 'border-right:3px solid ' + pri.bar + ';padding-right:10px;' : '') + '">' +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">' +
        '<div style="font-size:13.5px;font-weight:700;color:#1f2a3a;min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(title) + '</div>' +
        (pri.label
          ? '<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:6px;background:' + esc(pri.bg) + ';color:' + esc(pri.color) + ';flex:none;">' + esc(pri.label) + '</span>'
          : '') +
        '</div>' +
        (assignee
          ? '<div style="font-size:11.5px;color:#7b8595;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(assignee) + '</div>'
          : '') +
        (meta.label
          ? '<div style="margin-top:7px;"><span style="display:inline-flex;align-items:center;background:' + esc(meta.bg) + ';color:' + esc(meta.color) +
            ';font-size:11px;font-weight:700;padding:3px 9px;border-radius:7px;">' + esc(meta.label) + '</span></div>'
          : '') +
        '</a>';
    });
    html += '</div>';
    return html;
  }

  function truncateText(s, maxLen) {
    var text = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    if (!text) return '';
    maxLen = maxLen || 72;
    // URLs / file paths: keep a short readable prefix
    if (/^https?:\/\//i.test(text) || /files\.biz1|\/upload\/|\.pdf|\.jpg|\.png/i.test(text)) {
      maxLen = Math.min(maxLen, 48);
    }
    if (text.length <= maxLen) return text;
    return text.slice(0, Math.max(1, maxLen - 1)).trim() + '…';
  }

  function renderHistorySection(history) {
    var html = '<div style="font-size:14px;font-weight:800;color:#1f2a3a;margin:2px 2px 11px;">' +
      esc(t('Interaction history', 'היסטוריית אינטראקציות')) + '</div>';
    if (!history || !history.length) {
      return html +
        '<div style="background:#fff;border-radius:16px;padding:18px 15px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-bottom:8px;text-align:center;color:#9aa3b0;font-size:13px;font-weight:600;">' +
        esc(t('No interactions yet', 'אין אינטראקציות עדיין')) +
        '</div>';
    }
    html += '<div style="background:#fff;border-radius:16px;padding:6px 15px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-bottom:8px;">';
    history.forEach(function (row, i, arr) {
      var kind = historyKind(row);
      var meta = historyIconMeta(kind);
      var titleMap = {
        call: t('Outgoing call', 'שיחה יוצאת'),
        wa: t('WhatsApp message', 'הודעת וואטסאפ'),
        email: t('Email sent', 'אימייל נשלח'),
        quote: t('Quote sent', 'הצעת מחיר נשלחה'),
        status: t('Status change', 'שינוי סטטוס'),
        meet: t('Installation meeting', 'פגישת התקנה'),
        note: t('Note', 'הערה')
      };
      var title = titleMap[kind] || t('Interaction', 'אינטראקציה');
      var desc = truncateText(stripHtmlText(row.message || row.note || row.subject || ''), 72);
      var when = row.time || fmtDate(row.create_date || row.date_created || row.created_at);
      var who = stripHtmlText(row.user_name || '');
      html +=
        '<div style="display:flex;align-items:flex-start;gap:11px;padding:12px 0;' +
        (i === arr.length - 1 ? '' : 'border-bottom:1px solid #f0f2f5;') + '">' +
        '<div style="width:32px;height:32px;border-radius:9px;background:' + meta.bg + ';color:' + meta.color + ';display:flex;align-items:center;justify-content:center;flex:none;">' +
        meta.svg + '</div>' +
        '<div style="flex:1;min-width:0;overflow:hidden;">' +
        '<div style="font-size:13.5px;font-weight:700;color:#1f2a3a;">' + esc(title) + '</div>' +
        (desc
          ? '<div style="font-size:11.5px;color:#7b8595;margin-top:2px;line-height:1.45;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;" title="' + esc(stripHtmlText(row.message || row.note || row.subject || '')) + '">' +
            esc(desc) + '</div>'
          : '') +
        '<div style="font-size:11px;color:#9aa3b0;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' +
        esc([who, when].filter(Boolean).join(' · ')) + '</div>' +
        '</div></div>';
    });
    html += '</div>';
    return html;
  }

  function renderCustomer(c, kind, extras) {
    extras = extras || {};
    var id = c.customer_id || c.id || '';
    var name = c.name || ('#' + id);
    var phone = formatPhone(c.mobile || c.phone || '');
    var phoneRaw = c.mobile || c.phone || '';
    var email = c.email || '';
    var city = c.city || c.city_name || '';
    var address = c.address || '';
    var region = pickRegion(c) || city;
    var owner = pickOwner(c);
    var notes = c.notes || c.note || '';
    var st = statusMeta(c);
    var av = initials(name);
    var products = extras.products || [];
    var tickets = extras.tickets || [];
    var missions = extras.missions || [];
    var history = extras.history || [];
    var plans = pickPlans(c, products);

    var qs = 'customer_id=' + encodeURIComponent(id) + '&cust_id=' + encodeURIComponent(id) +
      '&name=' + encodeURIComponent(name) +
      (phone ? '&phone=' + encodeURIComponent(phone) : '');
    var backCard = 'service-customer-card.html?customer_id=' + encodeURIComponent(id) + '&cust_id=' + encodeURIComponent(id);
    var serviceUrl = 'service-open-call.html?' + qs;
    var quoteUrl = 'service-quote-form.html?' + qs + '&back=' + encodeURIComponent(backCard);
    var orderUrl = 'service-order-form.html?' + qs + '&from=customer';
    var docsUrl = 'all-documents.html?' + qs;
    var chatUrl = 'chat-customer.html?' + qs + '&back=' + encodeURIComponent(backCard);

    var rows = [];
    if (phone) rows.push({ label: t('Phone', 'טלפון'), value: phone, icon: iconPhone(), accent: true, href: telHref(phoneRaw) });
    if (email) rows.push({ label: t('Email', 'אימייל'), value: email, icon: iconMail(), accent: true, href: 'mailto:' + email });
    if (address || city) {
      rows.push({
        label: t('Address', 'כתובת'),
        value: [address, city].filter(Boolean).join(', '),
        icon: iconPin()
      });
    }
    if (region) rows.push({ label: t('Region', 'אזור'), value: region, icon: iconRegion() });
    if (owner) rows.push({ label: t('Owner', 'בעלים'), value: owner, icon: iconPerson() });
    if (!rows.length) rows.push({ label: t('ID', 'מזהה'), value: String(id), icon: '' });

    var detailsHtml = rows.map(function (r, i) {
      return detailRow(r.label, r.value, r.icon, i === rows.length - 1, { accent: r.accent, href: r.href });
    }).join('');

    return (
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">' +
      '<div style="flex:1;min-width:0;text-align:right;">' +
      '<div style="display:flex;align-items:center;gap:8px;justify-content:flex-start;flex-wrap:wrap;">' +
      '<span style="font-size:20px;font-weight:800;color:#1f2a3a;">' + esc(name) + '</span>' +
      (st.label
        ? '<span style="display:inline-flex;align-items:center;gap:5px;background:' + esc(st.bg) + ';color:' + esc(st.color) + ';font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:99px;">' +
          '<span style="width:6px;height:6px;border-radius:50%;background:' + esc(st.color) + ';"></span>' + esc(st.label) +
          '</span>'
        : '') +
      '</div>' +
      '<div style="font-size:12px;color:#9aa3b0;font-weight:600;margin-top:5px;">' +
      esc(kind === 'lead' ? t('Lead', 'ליד') : t('Customer', 'לקוח')) + ' · #' + esc(id) +
      '</div></div>' +
      '<div style="width:54px;height:54px;border-radius:50%;background:#dbe7f8;color:#2f6aa6;font-weight:800;font-size:17px;display:flex;align-items:center;justify-content:center;flex:none;text-transform:uppercase;">' +
      esc(av) + '</div></div>' +

      '<div style="background:#fff;border-radius:16px;padding:4px 15px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-bottom:14px;">' +
      detailsHtml +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:18px;">' +
      (phoneRaw
        ? actionTile(telHref(phoneRaw), '<svg width="22" height="22" viewBox="0 0 24 24" fill="#2e8a63"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.3 1z"/></svg>', t('Call', 'חיוג'))
        : '') +
      (phoneRaw
        ? actionTile(waHref(phoneRaw), '<svg width="22" height="22" viewBox="0 0 24 24" fill="#25b35e"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2z"/></svg>', t('WhatsApp', 'וואטסאפ'), ' target="_blank" rel="noopener"')
        : '') +
      actionTile(serviceUrl, '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d60a2" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>', t('Service call', 'קריאת שירות')) +
      actionTile(quoteUrl, '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#50439d" stroke-width="1.8"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>', t('Quote', 'הצעת מחיר')) +
      actionTile(orderUrl, '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#bd8324" stroke-width="1.8"><rect x="4" y="4" width="16" height="17" rx="2"/><path d="M9 2v4M15 2v4M8 11l2 2 3.5-3.5M8 16h6"/></svg>', t('Order', 'הזמנה')) +
      actionTile(docsUrl, '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5a6473" stroke-width="1.8"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><rect x="7" y="7" width="13" height="14" rx="2"/><path d="M11 12h6M11 16h6"/></svg>', t('Document', 'מסמכים')) +
      '</div>' +

      renderPlansSection(plans) +
      renderProductsSection(products) +
      renderTicketsSection(tickets, id) +
      renderMissionsSection(missions, id, name, phone, city) +
      renderHistorySection(history) +

      (notes
        ? '<div style="font-size:14px;font-weight:800;color:#1f2a3a;margin:18px 2px 11px;">' + esc(t('Notes', 'הערות')) + '</div>' +
          '<div style="background:#fff;border-radius:16px;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-bottom:8px;">' +
          '<div style="font-size:13.5px;color:#3a4452;line-height:1.6;white-space:pre-wrap;">' + esc(notes) + '</div></div>'
        : '') +

      '<a href="' + esc(chatUrl) + '" style="display:none;" aria-hidden="true"></a>'
    );
  }

  function publishCustomer(c, kind) {
    var id = String((c && (c.customer_id || c.id)) || qsParam() || '').trim();
    var name = String((c && c.name) || '').trim();
    if (!name && id) name = '#' + id;
    var payload = { id: id, name: name, kind: kind || 'customer', customer: c || null };
    try { window.__mbCurrentCustomer = payload; } catch (e) { /* ignore */ }
    rememberCustomerId(id);
    try {
      var el = document.getElementById('mb-sheet-customer-label');
      if (el) {
        var isEn = typeof getCurrentLanguage === 'function' && getCurrentLanguage() === 'en';
        var kindLabel = (kind === 'lead') ? (isEn ? 'Lead' : 'ליד') : (isEn ? 'Customer' : 'לקוח');
        el.textContent = name && id ? (name + ' · ' + kindLabel + ' #' + id) : (name || (kindLabel + ' #' + id) || '…');
      }
    } catch (e2) { /* ignore */ }
    try {
      window.dispatchEvent(new CustomEvent('mineralbar:customer', { detail: payload }));
    } catch (e3) { /* ignore */ }
  }

  function hideMock() {
    var mock = document.getElementById('mb-mock-customer');
    if (!mock) return;
    mock.style.display = 'none';
    mock.setAttribute('hidden', '');
    mock.setAttribute('aria-hidden', 'true');
  }

  async function loadCustomer(mount, opts) {
    opts = opts || {};
    var silent = !!opts.silent;
    var kind = mount.kind;
    var loadId = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 7);
    mount._activeLoadId = loadId;

    hideMock();
    var elNow = liveMountEl();
    var hasCard = !!(elNow && elNow.innerHTML && elNow.innerHTML.trim() && !elNow.querySelector('.mb-customer-loader'));
    // Soft refresh: keep current card visible — never flash loader
    if (!silent || !hasCard) {
      ensureLoaderKeyframes();
      setMountHtml('', { loading: true });
    }

    var customerId = qsParam();
    if (!customerId) {
      // DC / soft nav can leave search empty briefly — short retry only
      await new Promise(function (r) { setTimeout(r, 80); });
      if (mount._activeLoadId !== loadId) return;
      customerId = qsParam();
    }

    if (!customerId) {
      if (silent && hasCard) return;
      var back = kind === 'customer' ? 'customers.html' : 'leads-list.html';
      setMountHtml(
        '<div style="background:#fdf1dd;border:1px solid #f0e2c2;border-radius:14px;padding:14px;margin-bottom:14px;color:#7a5a18;font:700 13px/1.5 Heebo,sans-serif;">' +
        'חסר customer_id בכתובת<br><span style="font-weight:600;color:#9a7a38;">פתחו לקוח מהרשימה (הקישור חייב לכלול ?customer_id=…)</span></div>' +
        '<a href="' + back + '" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#1d60a2;color:#fff;font:800 13px Heebo,sans-serif;text-decoration:none;">חזרה לרשימה</a>'
      );
      return;
    }

    rememberCustomerId(customerId);

    try {
      await ensureStatusMaps();
      if (mount._activeLoadId !== loadId) return;
      var res = await MineralBarApp.getCustomer(customerId);
      if (mount._activeLoadId !== loadId) return;

      var c = res.customer || {};
      // if API nested further
      if (c.data && typeof c.data === 'object' && (c.data.name || c.data.customer_id)) c = c.data;
      rememberCustomerId(c.customer_id || c.id || customerId);
      hideMock();
      publishCustomer(c, kind);
      // Paint core card first, then enrich with products / tickets / missions / history
      setMountHtml(renderCustomer(c, kind, {}));
      var extrasId = c.customer_id || c.id || customerId;
      try {
        var extras = await fetchCustomerExtras(extrasId);
        if (mount._activeLoadId !== loadId) return;
        setMountHtml(renderCustomer(c, kind, extras));
      } catch (extraErr) {
        console.warn('[CustomerLive] extras failed — keeping core card', extraErr);
      }
    } catch (err) {
      if (mount._activeLoadId !== loadId) return;
      if (silent && hasCard) {
        console.warn('[CustomerLive] silent refresh failed — keeping card', err);
        return;
      }
      console.error('[MineralBar] Customer.Get failed', err);
      setMountHtml(errorHtml(err));
      var btn = document.getElementById('mb-customer-retry');
      if (btn) btn.addEventListener('click', function () { loadCustomer(mount); });
    }
  }

  function detectMount() {
    var el = liveMountEl();
    if (!el) return null;
    var kind = el.getAttribute('data-kind') || 'lead';
    var path = decodeURIComponent((location.pathname || '') + (location.href || ''));
    if (path.indexOf('כרטיס לקוח') !== -1) kind = 'customer';
    if (path.indexOf('כרטיס ליד') !== -1) kind = 'lead';
    if (/customer-card|service-customer-card/i.test(path)) kind = 'customer';
    if (/lead-card/i.test(path)) kind = 'lead';
    return { el: el, kind: kind };
  }

  function start(opts) {
    opts = opts || {};
    hideMock();
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) {
      if (!opts.silent) {
        ensureLoaderKeyframes();
        setMountHtml('', { loading: true });
      }
      return;
    }
    var mount = detectMount();
    if (!mount) return;
    loadCustomer(mount, opts);
  }

  function onLiveRefresh(ev) {
    var detail = (ev && ev.detail) || {};
    var key = String(detail.key || '').toLowerCase();
    var group = String(detail.group || '').toLowerCase();
    var relevant =
      !key ||
      /customer|lead|crm|reminder/.test(key) ||
      group === 'leads' ||
      group === 'other' ||
      group === 'unknown';
    if (!relevant) return;
    clearTimeout(window.__mbCustomerRtTimer);
    window.__mbCustomerRtTimer = setTimeout(function () {
      start({ silent: true });
    }, 150);
  }

  window.addEventListener('mineralbar:ready', start);
  window.addEventListener('mineralbar:language-changed', function () {
    statusMapsPromise = null;
    statusMapById = {};
    statusMapByName = {};
    start();
  });
  window.addEventListener('mineralbar:page-refresh', onLiveRefresh);
  window.addEventListener('mineralbar:realtime', onLiveRefresh);
  window.addEventListener('mineralbar:leads', onLiveRefresh);
  // No pageshow re-fetch — app resume updates come from socket only.

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 20); });
  } else {
    setTimeout(start, 20);
  }

  if (window.LiveSync && typeof LiveSync.bind === 'function') {
    LiveSync.bind(function () { start({ silent: true }); }, {
      keys: /customer|lead|crm|reminder|socket\.nudge/i,
      mount: '#mb-live-customer',
      delay: 200,
      retries: true
    });
  } else if (window.MineralBarApp && MineralBarApp.bindLiveReload) {
    MineralBarApp.bindLiveReload(function () { start({ silent: true }); }, { keys: /customer|lead|crm|reminder|socket\.nudge/i, delay: 180 });
  }

})();
