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

  function apiErrorText(err) {
    if (!err) return 'שגיאת API לא ידועה';
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

  function statusMeta(c, kind) {
    var st = String(c.status != null ? c.status : (c.c_status != null ? c.c_status : ''));
    if (kind === 'customer') {
      return { label: Number(st) === 1 || st === '1' ? 'פעיל' : ('סטטוס ' + (st || '—')), bg: '#e6f4ec', color: '#2e8a63' };
    }
    var map = {
      '1': { label: 'ליד חדש', bg: '#eaf2fb', color: '#1d60a2' },
      '0': { label: 'לא פעיל', bg: '#f1f3f6', color: '#5a6473' }
    };
    return map[st] || { label: st ? ('סטטוס ' + st) : 'ליד', bg: '#eaf2fb', color: '#1d60a2' };
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
    return (
      '<div style="text-align:center;padding:28px 12px;">' +
      '<div style="font-size:14px;font-weight:700;color:#8a93a3;">טוען כרטיס…</div>' +
      '<div style="font-size:12px;color:#b6bdc8;margin-top:6px;">Customer.Get</div>' +
      '</div>'
    );
  }

  function errorHtml(err) {
    return (
      '<div style="background:#fbeeed;border:1px solid #f0c9c4;border-radius:14px;padding:14px;margin-bottom:14px;">' +
      '<div style="font-size:14px;font-weight:800;color:#c0392b;margin-bottom:8px;">שגיאת API</div>' +
      '<pre style="margin:0;white-space:pre-wrap;word-break:break-word;font:600 11.5px/1.5 Heebo,monospace;color:#7a2e28;">' +
      esc(apiErrorText(err)) +
      '</pre>' +
      '<button type="button" id="mb-customer-retry" style="margin-top:12px;padding:9px 14px;border:none;border-radius:10px;background:#c0392b;color:#fff;font:800 13px Heebo,sans-serif;cursor:pointer;">נסה שוב</button>' +
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
    var st = statusMeta(c, kind);
    var av = initials(name);
    var chatUrl = 'chat-customer.html?customer_id=' + encodeURIComponent(id) +
      '&name=' + encodeURIComponent(name) +
      (phone ? '&phone=' + encodeURIComponent(phone) : '') +
      '&back=' + encodeURIComponent('service-customer-card.html?customer_id=' + id + '&cust_id=' + id);
    var missionUrl = 'service-create-task.html?customer_id=' + encodeURIComponent(id) +
      '&name=' + encodeURIComponent(name) +
      (phone ? '&phone=' + encodeURIComponent(phone) : '') +
      (city ? '&city=' + encodeURIComponent(city) : '');

    var rows = [];
    if (phone) rows.push({ label: 'טלפון', value: phone, icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aeb6c2" stroke-width="2"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.3 1z"/></svg>' });
    if (email) rows.push({ label: 'אימייל', value: email, icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aeb6c2" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6.5 9 6 9-6"/></svg>' });
    if (company) rows.push({ label: 'חברה', value: company, icon: '' });
    if (source) rows.push({ label: 'מקור', value: source, icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aeb6c2" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18"/></svg>' });
    if (city || address) rows.push({ label: 'כתובת', value: [address, city].filter(Boolean).join(' · '), icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aeb6c2" stroke-width="2"><path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>' });
    if (created) rows.push({ label: 'נוצר', value: created, icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aeb6c2" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>' });
    rows.push({ label: 'מזהה', value: String(id), icon: '' });

    var detailsHtml = rows.map(function (r, i) {
      return detailRow(r.label, r.value, r.icon, i === rows.length - 1);
    }).join('');

    return (
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">' +
      '<div style="flex:1;text-align:right;">' +
      '<div style="display:flex;align-items:center;gap:8px;justify-content:flex-start;flex-wrap:wrap;">' +
      '<span style="font-size:20px;font-weight:800;color:#1f2a3a;">' + esc(name) + '</span>' +
      '<span style="display:inline-flex;align-items:center;gap:5px;background:' + st.bg + ';color:' + st.color + ';font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:99px;">' +
      '<span style="width:6px;height:6px;border-radius:50%;background:' + st.color + ';"></span>' + esc(st.label) +
      '</span></div>' +
      '<div style="font-size:12px;color:#9aa3b0;font-weight:600;margin-top:5px;">' +
      esc(kind === 'lead' ? 'ליד' : 'לקוח') + ' · #' + esc(id) +
      '</div></div>' +
      '<div style="width:54px;height:54px;border-radius:50%;background:#dbe7f8;color:#2f6aa6;font-weight:800;font-size:17px;display:flex;align-items:center;justify-content:center;flex:none;">' +
      esc(av) + '</div></div>' +

      '<div style="background:#fff;border-radius:16px;padding:4px 15px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-bottom:14px;">' +
      detailsHtml +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:18px;">' +
      (phoneRaw
        ? '<a href="' + esc(telHref(phoneRaw)) + '" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 6px;background:#fff;border:1px solid #e8eaee;border-radius:14px;text-decoration:none;box-shadow:0 1px 2px rgba(0,0,0,.04);"><svg width="22" height="22" viewBox="0 0 24 24" fill="#2e8a63"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.3 1z"/></svg><span style="font-size:12px;font-weight:700;color:#1f2a3a;">חיוג</span></a>'
        : '') +
      (phoneRaw
        ? '<a href="' + esc(waHref(phoneRaw)) + '" target="_blank" rel="noopener" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 6px;background:#fff;border:1px solid #e8eaee;border-radius:14px;text-decoration:none;box-shadow:0 1px 2px rgba(0,0,0,.04);"><svg width="22" height="22" viewBox="0 0 24 24" fill="#25b35e"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2z"/></svg><span style="font-size:12px;font-weight:700;color:#1f2a3a;">וואטסאפ</span></a>'
        : '') +
      '<a href="' + esc(chatUrl) + '" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 6px;background:#fff;border:1px solid #e8eaee;border-radius:14px;text-decoration:none;box-shadow:0 1px 2px rgba(0,0,0,.04);"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d60a2" stroke-width="1.8"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg><span style="font-size:12px;font-weight:700;color:#1f2a3a;">צ׳אט</span></a>' +
      '<a href="' + esc(missionUrl) + '" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 6px;background:#fff;border:1px solid #e8eaee;border-radius:14px;text-decoration:none;box-shadow:0 1px 2px rgba(0,0,0,.04);"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d60a2" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M12 8v8M8 12h8"/></svg><span style="font-size:12px;font-weight:700;color:#1f2a3a;">צור משימה</span></a>' +
      '</div>' +

      (notes
        ? '<div style="font-size:14px;font-weight:800;color:#1f2a3a;margin:2px 2px 11px;">הערות</div>' +
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
    if (mock) mock.style.display = 'none';
  }

  async function loadCustomer(mount) {
    var el = mount.el;
    var kind = mount.kind;
    var customerId = qsParam();
    el.innerHTML = loadingHtml();

    if (!customerId) {
      // DC / soft nav can leave search empty for a moment — retry once
      await new Promise(function (r) { setTimeout(r, 200); });
      customerId = qsParam();
    }

    if (!customerId) {
      var back = kind === 'customer' ? 'customers.html' : 'leads-list.html';
      el.innerHTML =
        '<div style="background:#fdf1dd;border:1px solid #f0e2c2;border-radius:14px;padding:14px;margin-bottom:14px;color:#7a5a18;font:700 13px/1.5 Heebo,sans-serif;">' +
        'חסר customer_id בכתובת<br><span style="font-weight:600;color:#9a7a38;">פתחו לקוח מהרשימה (הקישור חייב לכלול ?customer_id=…)</span></div>' +
        '<a href="' + back + '" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#1d60a2;color:#fff;font:800 13px Heebo,sans-serif;text-decoration:none;">חזרה לרשימה</a>';
      return;
    }

    rememberCustomerId(customerId);

    try {
      var res = await MineralBarApp.getCustomer(customerId);
      
      // Get fresh reference in case DCLogic re-rendered the template while waiting
      el = document.getElementById('mb-live-customer') || el;
      
      var c = res.customer || {};
      // if API nested further
      if (c.data && typeof c.data === 'object' && (c.data.name || c.data.customer_id)) c = c.data;
      rememberCustomerId(c.customer_id || c.id || customerId);
      hideMock();
      publishCustomer(c, kind);
      el.innerHTML = renderCustomer(c, kind);
    } catch (err) {
      console.error('[MineralBar] Customer.Get failed', err);
      el.innerHTML = errorHtml(err);
      var btn = document.getElementById('mb-customer-retry');
      if (btn) btn.addEventListener('click', function () { loadCustomer(mount); });
    }
  }

  function detectMount() {
    var el = document.getElementById('mb-live-customer');
    if (!el) return null;
    var kind = el.getAttribute('data-kind') || 'lead';
    var path = decodeURIComponent((location.pathname || '') + (location.href || ''));
    if (path.indexOf('כרטיס לקוח') !== -1) kind = 'customer';
    if (path.indexOf('כרטיס ליד') !== -1) kind = 'lead';
    return { el: el, kind: kind };
  }

  function start() {
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    var mount = detectMount();
    if (!mount) return;
    loadCustomer(mount);
  }

  window.addEventListener('mineralbar:ready', start);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 50); });
  } else {
    setTimeout(start, 50);
  }
})();
