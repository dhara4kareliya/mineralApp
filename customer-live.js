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

  function detailRow(label, value, icon, last) {
    if (value == null || value === '') return '';
    return (
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 0;' +
      (last ? '' : 'border-bottom:1px solid #f0f2f5;') + '">' +
      '<span style="display:inline-flex;align-items:center;gap:7px;font-size:12.5px;color:#9aa3b0;font-weight:600;flex:none;">' +
      (icon || '') + esc(label) +
      '</span>' +
      '<span style="font-size:13.5px;color:#1f2a3a;font-weight:700;direction:ltr;text-align:end;min-width:0;word-break:break-word;">' + esc(value) + '</span>' +
      '</div>'
    );
  }

  function renderCustomer(c, kind) {
    var id = c.customer_id || c.id || '';
    var name = c.name || ('#' + id);
    var phone = formatPhone(c.mobile || c.phone || '');
    var phoneRaw = c.mobile || c.phone || '';
    var email = c.email || '';
    var city = c.city || '';
    var address = c.address || '';
    var company = c.company || '';
    var source = c.source || '';
    var notes = c.notes || '';
    var created = fmtDate(c.date_created);
    var st = statusMeta(c);
    var av = initials(name);
    var chatUrl = 'chat-customer.html?customer_id=' + encodeURIComponent(id) +
      '&name=' + encodeURIComponent(name) +
      (phone ? '&phone=' + encodeURIComponent(phone) : '') +
      '&back=' + encodeURIComponent('service-customer-card.html?customer_id=' + id + '&cust_id=' + id);
    var missionUrl = 'service-create-task.html?customer_id=' + encodeURIComponent(id) +
      '&name=' + encodeURIComponent(name) +
      (phone ? '&phone=' + encodeURIComponent(phone) : '') +
      (city ? '&city=' + encodeURIComponent(city) : '') +
      '&from=messages';

    var rows = [];
    if (phone) rows.push({ label: t('Phone', 'טלפון'), value: phone, icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aeb6c2" stroke-width="2"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.3 1z"/></svg>' });
    if (email) rows.push({ label: t('Email', 'אימייל'), value: email, icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aeb6c2" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6.5 9 6 9-6"/></svg>' });
    if (company) rows.push({ label: t('Company', 'חברה'), value: company, icon: '' });
    if (source) rows.push({ label: t('Source', 'מקור'), value: source, icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aeb6c2" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18"/></svg>' });
    if (city || address) rows.push({ label: t('Address', 'כתובת'), value: [address, city].filter(Boolean).join(' · '), icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aeb6c2" stroke-width="2"><path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>' });
    if (created) rows.push({ label: t('Created', 'נוצר'), value: created, icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aeb6c2" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>' });
    rows.push({ label: t('ID', 'מזהה'), value: String(id), icon: '' });

    var detailsHtml = rows.map(function (r, i) {
      return detailRow(r.label, r.value, r.icon, i === rows.length - 1);
    }).join('');

    return (
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">' +
      '<div style="flex:1;text-align:right;">' +
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
      '<div style="width:54px;height:54px;border-radius:50%;background:#dbe7f8;color:#2f6aa6;font-weight:800;font-size:17px;display:flex;align-items:center;justify-content:center;flex:none;">' +
      esc(av) + '</div></div>' +

      '<div style="background:#fff;border-radius:16px;padding:4px 15px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-bottom:14px;">' +
      detailsHtml +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:18px;">' +
      (phoneRaw
        ? '<a href="' + esc(telHref(phoneRaw)) + '" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 6px;background:#fff;border:1px solid #e8eaee;border-radius:14px;text-decoration:none;box-shadow:0 1px 2px rgba(0,0,0,.04);"><svg width="22" height="22" viewBox="0 0 24 24" fill="#2e8a63"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.3 1z"/></svg><span style="font-size:12px;font-weight:700;color:#1f2a3a;">' + esc(t('Call', 'חיוג')) + '</span></a>'
        : '') +
      (phoneRaw
        ? '<a href="' + esc(waHref(phoneRaw)) + '" target="_blank" rel="noopener" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 6px;background:#fff;border:1px solid #e8eaee;border-radius:14px;text-decoration:none;box-shadow:0 1px 2px rgba(0,0,0,.04);"><svg width="22" height="22" viewBox="0 0 24 24" fill="#25b35e"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2z"/></svg><span style="font-size:12px;font-weight:700;color:#1f2a3a;">' + esc(t('WhatsApp', 'וואטסאפ')) + '</span></a>'
        : '') +
      '<a href="' + esc(chatUrl) + '" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 6px;background:#fff;border:1px solid #e8eaee;border-radius:14px;text-decoration:none;box-shadow:0 1px 2px rgba(0,0,0,.04);"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d60a2" stroke-width="1.8"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg><span style="font-size:12px;font-weight:700;color:#1f2a3a;">' + esc(t('Chat', 'צ׳אט')) + '</span></a>' +
      '<a href="' + esc(missionUrl) + '" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 6px;background:#fff;border:1px solid #e8eaee;border-radius:14px;text-decoration:none;box-shadow:0 1px 2px rgba(0,0,0,.04);"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d60a2" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M12 8v8M8 12h8"/></svg><span style="font-size:12px;font-weight:700;color:#1f2a3a;">' + esc(t('Create task', 'צור משימה')) + '</span></a>' +
      '</div>' +

      (notes
        ? '<div style="font-size:14px;font-weight:800;color:#1f2a3a;margin:2px 2px 11px;">' + esc(t('Notes', 'הערות')) + '</div>' +
          '<div style="background:#fff;border-radius:16px;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-bottom:18px;">' +
          '<div style="font-size:13.5px;color:#3a4452;line-height:1.6;white-space:pre-wrap;">' + esc(notes) + '</div></div>'
        : '')
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
      setMountHtml(renderCustomer(c, kind));
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
