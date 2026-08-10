/**
 * Live Customer.List for לידים (folder 1) and לקוחות (folder 2).
 * Shows loading → rows | empty | API error text.
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

  function pageKind() {
    var list = document.getElementById('mb-live-list');
    return (list && list.getAttribute('data-kind')) || 'customers';
  }

  function kindIsCustomersPage() {
    return pageKind() === 'customers';
  }

  function kindIsLeadsPage() {
    return pageKind() === 'leads';
  }

  function formatTotalLabel(count, kind) {
    var n = Number(count) || 0;
    kind = kind || pageKind();
    var isEn = typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage() === 'en';
    if (kind === 'leads') {
      return isEn ? (n + ' leads') : (n + ' לידים');
    }
    return isEn ? (n + ' customers') : (n + ' לקוחות');
  }

  function setTotalLabel(count, kind) {
    var totalEl = document.getElementById('mb-total-label');
    if (!totalEl) return;
    totalEl.textContent = formatTotalLabel(count, kind);
  }

  /** Resolve Biz1 folder id for this page (leads → New Leads, customers → Customers). */
  function lockedFolderIdForPage(kind) {
    kind = kind || pageKind();
    var fallback = kind === 'leads' ? 1 : 2;
    try {
      if (window.MineralBarApp && MineralBarApp.FOLDERS) {
        if (kind === 'leads' && MineralBarApp.FOLDERS.LEADS != null) fallback = Number(MineralBarApp.FOLDERS.LEADS) || fallback;
        if (kind === 'customers' && MineralBarApp.FOLDERS.CUSTOMERS != null) fallback = Number(MineralBarApp.FOLDERS.CUSTOMERS) || fallback;
      }
    } catch (e0) { /* ignore */ }

    var folders = [];
    try {
      if (window.MineralBarApp && typeof MineralBarApp.getFolders === 'function') {
        folders = MineralBarApp.getFolders() || [];
      }
    } catch (e1) { folders = []; }
    if (!folders.length) return fallback;

    function score(f) {
      var blob = [
        f.name, f.name_en, f.name_he, f.title, f.label, f.key, f.slug, f.code, f.type
      ].map(function (x) { return String(x || '').toLowerCase(); }).join(' ');
      if (kind === 'leads') {
        if (/new[_\s-]?lead|פניות|leads?/.test(blob) && !/customer|לקוח/.test(blob)) return 3;
        if (/new[_\s-]?lead|פניות/.test(blob)) return 2;
        if (String(f.id || f.folder_id) === '1') return 1;
        return 0;
      }
      // customers
      if (/^customers?$|לקוחות|customer[_\s-]?folder/.test(blob) && !/lead|פניות|new/.test(blob)) return 3;
      if (/customer|לקוח/.test(blob) && !/lead|פניות|new/.test(blob)) return 2;
      if (String(f.id || f.folder_id) === '2') return 1;
      return 0;
    }

    var best = null;
    var bestScore = 0;
    folders.forEach(function (f) {
      var s = score(f);
      if (s > bestScore) {
        bestScore = s;
        best = f;
      }
    });
    if (best) {
      var id = Number(best.id != null ? best.id : best.folder_id);
      if (isFinite(id) && id > 0) return id;
    }
    return fallback;
  }

  function apiErrorText(err) {
    if (!err) return 'שגיאת API לא ידועה';
    var parts = [];
    if (err.message) parts.push(err.message);
    if (err.route) parts.push('route: ' + err.route);
    if (err.status) parts.push('status: ' + err.status);
    if (err.raw && err.raw.message && err.raw.message !== err.message) {
      parts.push(String(err.raw.message).slice(0, 400));
    }
    return parts.join('\n') || String(err);
  }

  function formatProductsPreview(val) {
    if (val == null || val === '') return '';
    if (Array.isArray(val)) {
      return val.map(function (p) {
        if (p == null) return '';
        if (typeof p === 'string' || typeof p === 'number') return String(p);
        return String(p.product_name || p.item_name || p.name || p.title || '').trim();
      }).filter(Boolean).join(', ');
    }
    if (typeof val === 'object') {
      return String(val.product_name || val.item_name || val.name || val.title || '').trim();
    }
    return String(val).trim();
  }

  var statusMapById = {};
  var statusMapByName = {};
  var statusMapsPromise = null;

  function stripHtmlText(s) {
    return String(s == null ? '' : s)
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
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
      if (id != null && String(id).trim() !== '') {
        statusMapById[String(id).trim()] = entry;
      }
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
        if (!window.MineralBarApp || typeof MineralBarApp.getClient !== 'function') return statusMapById;
        var client = MineralBarApp.getClient();
        if (!client || !client.request) return statusMapById;
        // Customer.List.status can be customer status, internal folder status, or a label string
        var types = ['status', 'internal_status', 'customer_status'];
        for (var i = 0; i < types.length; i++) {
          try {
            await fetchStatusTypePages(client, types[i]);
          } catch (e) { /* try next */ }
        }
      } catch (e) {
        console.warn('[ListLive] Statuses.List failed', e);
      }
      return statusMapById;
    })();
    return statusMapsPromise;
  }

  function pickCity(row) {
    var city = stripHtmlText(
      row.city || row.city_name || row.town || row.address_city || row.region || ''
    );
    if (city && city.toLowerCase() !== 'null' && city.toLowerCase() !== 'undefined') return city;
    return '';
  }

  function pickFullAddress(row) {
    row = row || {};
    var address = stripHtmlText(
      row.address || row.full_address || row.exact_address || row.street || row.street_name || ''
    );
    var entrance = stripHtmlText(row.entrance || row.entry || row.knisa || '');
    var floor = stripHtmlText(row.floor || row.floor_number || row.koma || '');
    var apt = stripHtmlText(row.apartment || row.apt || row.flat || row.dira || '');
    var local = stripHtmlText(row.local || row.locality || row.neighborhood || '');
    var city = pickCity(row);

    // API often returns a composed address (street, Entrance…, Floor…, Apt…, city)
    if (address && (/,/.test(address) || /entrance|floor|apt|כניסה|קומה|דירה/i.test(address))) {
      return address;
    }

    var parts = [];
    if (address) parts.push(address);
    if (entrance) parts.push(t('Entrance', 'כניסה') + ' ' + entrance);
    if (floor) parts.push(t('Floor', 'קומה') + ' ' + floor);
    if (apt) parts.push(t('Apt', 'דירה') + ' ' + apt);
    if (local) parts.push(local);
    if (city && parts.indexOf(city) === -1) parts.push(city);
    return parts.join(', ');
  }

  function pickProductPreview(row) {
    var fromFields = formatProductsPreview(
      row.products || row.product || row.last_product || row.product_name || row.item_name || ''
    );
    if (fromFields) return fromFields;
    var plans = row.plans || row.routes || row.subscriptions || row.customer_plans || row.plans_list;
    if (Array.isArray(plans) && plans.length) {
      return plans.map(function (p) {
        if (!p) return '';
        if (typeof p === 'string' || typeof p === 'number') return String(p);
        return stripHtmlText(p.name || p.title || p.plan_name || p.route_name || p.product_name || '');
      }).filter(Boolean).join(', ');
    }
    return '';
  }

  function resolveStatus(row) {
    row = row || {};

    // Customer.List / Customer.Get expose the customer status in `status`
    // (id like "10086" / "1399", OR already a label like "שולם" / "followup").
    var rawStatus = stripHtmlText(row.status);
    var named = stripHtmlText(
      row.sub_list_data_name ||
      row.internal_status_name ||
      row.status_label ||
      row.status_name ||
      row.status_text ||
      ''
    );

    // 1) Prefer an explicit non-numeric display name from the row
    if (named && !/^\d+$/.test(named)) {
      var byNamed = statusMapByName[named.toLowerCase()];
      return {
        label: named,
        color: (byNamed && byNamed.color) || String(row.status_color || row.color || '#1d60a2').trim() || '#1d60a2'
      };
    }

    // 2) If status is already a text label (not an id), show it as returned by the API
    if (rawStatus && !/^\d+$/.test(rawStatus)) {
      var byRaw = statusMapByName[rawStatus.toLowerCase()];
      return {
        label: rawStatus,
        color: (byRaw && byRaw.color) || '#1d60a2'
      };
    }

    // 3) Resolve numeric status id via Statuses.List maps
    var idCand = [
      rawStatus,
      row.sub_list_data,
      row.status_id,
      row.internal_status_id
    ];
    for (var i = 0; i < idCand.length; i++) {
      var sid = idCand[i] == null ? '' : String(idCand[i]).trim();
      if (!sid || !/^\d+$/.test(sid)) continue;
      if (statusMapById[sid]) {
        return {
          label: statusMapById[sid].name,
          color: statusMapById[sid].color || '#1d60a2'
        };
      }
    }

    return { label: '', color: '#1d60a2' };
  }

  function pick(row) {
    var id = row.customer_id || row.contactus_id || row.id || row.ID || '';
    var name = row.name || row.customer_name || row.full_name || row.cname || row.title || ('#' + id);
    var phone = row.phone || row.mobile || row.cellphone || row.tel || row.second_phone || '';
    var city = pickCity(row);
    var address = pickFullAddress(row);
    var email = row.email || row.second_email || row.mail || '';
    var st = resolveStatus(row);
    var created = row.date_created || row.created_at || row.created || row.date || row.opendate || row.insert_date || row.added_date || '';
    var products = pickProductPreview(row);
    return {
      id: id,
      name: name,
      phone: phone,
      city: city,
      address: address,
      email: email,
      status: st.label,
      statusColor: st.color,
      created: created,
      products: products,
      raw: row
    };
  }

  function initials(name) {
    var p = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '?';
    if (p.length === 1) return p[0].slice(0, 2);
    return (p[0][0] || '') + (p[1][0] || '');
  }

  function t(en, he) {
    if (typeof window.mbT === 'function') return window.mbT(en, he);
    var lang = (typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage()) || 'he';
    return lang === 'en' ? en : he;
  }

  function loadingHtml() {
    if (window.MineralBarLoader && typeof MineralBarLoader.inlineHtml === 'function') {
      return MineralBarLoader.inlineHtml(t('Loading from server…', 'טוען מהשרת…'));
    }
    return (
      '<div class="mb-inline-loader">' +
      '<div class="mb-page-loader__spin" aria-hidden="true"></div>' +
      '<div class="mb-page-loader__label">' + esc(t('Loading from server…', 'טוען מהשרת…')) + '</div>' +
      '</div>'
    );
  }

  function emptyHtml(kind) {
    var title = kind === 'leads'
      ? t('No leads currently', 'אין לידים כרגע')
      : t('No customers currently', 'אין לקוחות כרגע');
    var sub = kind === 'leads'
      ? t('Folder 1 · New inquiries is empty', 'תיקייה 1 · פניות חדשות ריקה')
      : t('Folder 2 · Customers is empty', 'תיקייה 2 · לקוחות ריקה');
    return (
      '<div style="text-align:center;padding:48px 20px;">' +
      '<div style="width:56px;height:56px;border-radius:50%;background:#e3e7ec;display:flex;align-items:center;justify-content:center;margin:0 auto 13px;">' +
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#aab2bf" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      '</div>' +
      '<div style="font-size:15px;font-weight:800;color:#5a6473;">' + esc(title) + '</div>' +
      '<div style="font-size:12.5px;color:#9aa3b0;margin-top:6px;">' + esc(sub) + '</div>' +
      '</div>'
    );
  }

  function errorHtml(err) {
    return (
      '<div style="background:#fbeeed;border:1px solid #f0c9c4;border-radius:14px;padding:14px 14px 16px;margin:8px 0;">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0392b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>' +
      '<div style="font-size:14px;font-weight:800;color:#c0392b;">' + esc(t('API error', 'שגיאת API')) + '</div>' +
      '</div>' +
      '<pre style="margin:0;white-space:pre-wrap;word-break:break-word;font:600 11.5px/1.5 Heebo,monospace;color:#7a2e28;max-height:280px;overflow:auto;">' +
      esc(apiErrorText(err)) +
      '</pre>' +
      '<button type="button" id="mb-list-retry" style="margin-top:12px;padding:9px 14px;border:none;border-radius:10px;background:#c0392b;color:#fff;font:800 13px Heebo,sans-serif;cursor:pointer;">' +
      esc(t('Try again', 'נסה שוב')) + '</button>' +
      '</div>'
    );
  }

  function customerHref(page, id) {
    if (!id) return page;
    try {
      sessionStorage.setItem('mb_customer_id', String(id));
      localStorage.setItem('mb_customer_id', String(id));
    } catch (e) { /* ignore */ }
    var url = encodeURI(page) + '?customer_id=' + encodeURIComponent(id) +
      '&cust_id=' + encodeURIComponent(id) +
      '&id=' + encodeURIComponent(id);
    try {
      var here = (location.pathname.split('/').pop() || '') + (location.search || '');
      if (here && !/service-customer-card|lead-card|chat-customer-details/i.test(here)) {
        url += '&back=' + encodeURIComponent(here);
      }
    } catch (e2) { /* ignore */ }
    return url;
  }

  function formatListDate(value) {
    if (!value) return '';
    try {
      var d = new Date(value);
      if (!isNaN(d.getTime())) {
        var pad = function (n) { return n < 10 ? '0' + n : String(n); };
        return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() +
          ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
      }
    } catch (e) { /* ignore */ }
    return String(value);
  }

  function leadMetaRow(label, value, opts) {
    opts = opts || {};
    value = String(value == null ? '' : value).trim();
    if (!value) return '';
    return (
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-top:' + (opts.first ? '9' : '5') + 'px;">' +
      '<span style="font-size:11.5px;font-weight:700;color:#9aa3b0;flex:none;">' + esc(label) + '</span>' +
      '<span style="font-size:12.5px;font-weight:600;color:#46505f;text-align:end;min-width:0;word-break:break-word;direction:' + (opts.ltr ? 'ltr' : 'inherit') + ';">' +
      esc(value) +
      '</span></div>'
    );
  }

  function leadCard(c) {
    var detail = customerHref('lead-card.html', c.id);
    var phone = String(c.phone || '').trim();
    var email = String(c.email || '').trim();
    var address = String(c.address || c.city || '').trim();
    var dateText = formatListDate(c.created);
    return (
      '<a href="' + detail + '" data-customer-id="' + esc(c.id) + '" data-status="' + esc(c.status) + '" style="display:block;background:#fff;border-radius:16px;padding:14px 16px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-bottom:12px;text-decoration:none;">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">' +
      '<div style="font-size:17px;font-weight:800;color:#16223a;display:inline-flex;align-items:center;gap:5px;min-width:0;">' +
      '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(c.name) + '</span>' +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c2c9d2" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex:none;"><path d="m15 18-6-6 6-6"/></svg></div>' +
      (c.status
        ? '<span style="font-size:11.5px;font-weight:700;padding:4px 11px;border-radius:7px;background:#eaf2fb;color:#1d60a2;flex:none;">' + esc(c.status) + '</span>'
        : '') +
      '</div>' +
      leadMetaRow(t('Address', 'כתובת'), address, { first: true }) +
      leadMetaRow(t('Phone', 'טלפון'), phone, { ltr: true }) +
      leadMetaRow(t('Date', 'תאריך'), dateText, { ltr: true }) +
      leadMetaRow(t('Email', 'אימייל'), email, { ltr: true }) +
      '</a>'
    );
  }

  function productIconSvg(size, stroke) {
    size = size || 16;
    stroke = stroke || '#1d60a2';
    return (
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + stroke + '" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>' +
      '<path d="M3.3 7 12 12l8.7-5M12 22V12"/>' +
      '</svg>'
    );
  }

  function customerCard(c) {
    var detail = customerHref('service-customer-card.html', c.id);
    var av = initials(c.name);
    var phone = String(c.phone || '').trim();
    var city = String(c.city || '').trim();
    var address = String(c.address || '').trim();
    var products = String(c.products || '').trim();
    var statusLabel = String(c.status || '').trim();
    var statusColor = String(c.statusColor || '#1d60a2').trim() || '#1d60a2';
    var statusBg = statusColor.charAt(0) === '#' ? (statusColor + '22') : '#eaf2fb';
    // Avoid repeating city when it is already at the end of the address line
    var cityLine = city;
    if (cityLine && address) {
      var addrLower = address.toLowerCase();
      var cityLower = cityLine.toLowerCase();
      if (addrLower === cityLower || addrLower.slice(-(cityLower.length + 2)) === (', ' + cityLower) || addrLower.slice(-cityLower.length) === cityLower) {
        cityLine = '';
      }
    }
    var wa = '';
    if (phone) {
      var digits = phone.replace(/\D/g, '');
      if (digits.charAt(0) === '0') digits = '972' + digits.slice(1);
      if (digits) wa = 'https://wa.me/' + digits;
    }
    var metaBits = [];
    if (cityLine) metaBits.push(esc(cityLine));
    if (phone) metaBits.push(esc(phone));
    return (
      '<div data-customer-id="' + esc(c.id) + '" data-customer-name="' + esc(c.name) + '" data-phone="' + esc(phone) + '" data-status="' + esc(c.status || '') + '" style="display:flex;align-items:flex-start;gap:12px;background:#fff;border-radius:14px;padding:12px 13px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-bottom:9px;overflow:hidden;min-width:0;">' +
      '<a href="' + detail + '" style="width:42px;height:42px;border-radius:50%;background:#dbe7f8;color:#2f6aa6;font-weight:800;font-size:15px;flex:none;display:flex;align-items:center;justify-content:center;text-decoration:none;text-transform:uppercase;margin-top:1px;">' + esc(av) + '</a>' +
      '<a href="' + detail + '" style="flex:1;min-width:0;text-decoration:none;overflow:hidden;">' +
      '<div class="mb-cust-name-row">' +
      '<span class="mb-cust-name">' + esc(c.name) + '</span>' +
      (statusLabel
        ? '<span class="mb-cust-status" style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:7px;background:' + esc(statusBg) + ';color:' + esc(statusColor) + ';flex:none;">' + esc(statusLabel) + '</span>'
        : '') +
      '</div>' +
      '<div class="mb-cust-address" style="font-size:12px;color:#5a6473;margin-top:4px;line-height:1.4;overflow:hidden;text-overflow:ellipsis;display:' + (address ? '-webkit-box' : 'none') + ';-webkit-line-clamp:2;-webkit-box-orient:vertical;">' +
      (address ? esc(address) : '') +
      '</div>' +
      '<div class="mb-cust-meta" style="font-size:12px;color:#7b8595;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:' + (metaBits.length ? 'block' : 'none') + ';">' +
      (metaBits.length ? metaBits.join(' · ') : '') +
      '</div>' +
      '<div class="mb-cust-product-line" data-customer-id="' + esc(c.id) + '" style="font-size:11.5px;font-weight:700;color:#1d60a2;margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' + (products ? '' : 'display:none;') + '">' +
      (products
        ? ('<span style="display:inline-flex;align-items:center;gap:5px;">' + productIconSvg(12, '#1d60a2') + '<span>' + esc(products) + '</span></span>')
        : '') +
      '</div>' +
      '</a>' +
      (wa
        ? '<a href="' + esc(wa) + '" target="_blank" rel="noopener" aria-label="WhatsApp" onclick="event.stopPropagation();" style="width:36px;height:36px;border-radius:50%;background:#25b35e;color:#fff;display:inline-flex;align-items:center;justify-content:center;flex:none;text-decoration:none;margin-top:2px;">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2z"/></svg>' +
          '</a>'
        : '') +
      '<a href="' + detail + '" aria-hidden="true" style="color:#c2c9d2;display:inline-flex;align-items:center;justify-content:center;flex:none;text-decoration:none;margin-top:8px;">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>' +
      '</a>' +
      '</div>'
    );
  }

  function setProductLine(card, productsText) {
    var line = card.querySelector('.mb-cust-product-line');
    if (!line) return;
    var text = String(productsText || '').trim();
    if (!text) {
      line.style.display = 'none';
      line.innerHTML = '';
      return;
    }
    line.style.display = '';
    line.innerHTML = '<span style="display:inline-flex;align-items:center;gap:5px;">' +
      productIconSvg(12, '#1d60a2') + '<span>' + esc(text) + '</span></span>';
  }

  function setAddressLines(card, address, city, phone) {
    var addrEl = card.querySelector('.mb-cust-address');
    var metaEl = card.querySelector('.mb-cust-meta');
    address = String(address || '').trim();
    city = String(city || '').trim();
    phone = String(phone || '').trim();
    if (addrEl) {
      if (address) {
        addrEl.textContent = address;
        addrEl.style.display = '-webkit-box';
      }
    }
    if (metaEl) {
      var cityLine = city;
      if (cityLine && address) {
        var addrLower = address.toLowerCase();
        var cityLower = cityLine.toLowerCase();
        if (addrLower === cityLower || addrLower.slice(-(cityLower.length + 2)) === (', ' + cityLower) || addrLower.slice(-cityLower.length) === cityLower) {
          cityLine = '';
        }
      }
      var bits = [];
      if (cityLine) bits.push(cityLine);
      if (phone) bits.push(phone);
      if (bits.length) {
        metaEl.textContent = bits.join(' · ');
        metaEl.style.display = '';
      }
    }
  }

  async function enrichOneCustomerCard(card) {
    var cid = card.getAttribute('data-customer-id') || '';
    if (!cid || card.dataset.enriched === '1') return;
    card.dataset.enriched = '1';
    var needsAddress = !((card.querySelector('.mb-cust-address') || {}).textContent || '').trim();
    var needsProduct = !((card.querySelector('.mb-cust-product-line') || {}).textContent || '').trim();
    var needsStatus = !card.querySelector('.mb-cust-status');

    try {
      if ((needsAddress || needsStatus) && window.MineralBarApp && typeof MineralBarApp.getCustomer === 'function') {
        var cres = await MineralBarApp.getCustomer(cid).catch(function () { return null; });
        var c = cres && cres.customer;
        if (c && c.data && typeof c.data === 'object') c = c.data;
        if (c) {
          var picked = pick(c);
          if (needsAddress) {
            setAddressLines(card, picked.address, picked.city, picked.phone || card.getAttribute('data-phone') || '');
          }
          if (picked.products) {
            setProductLine(card, picked.products);
            needsProduct = false;
          }
          if (picked.status && needsStatus) {
            var nameRow = card.querySelector('.mb-cust-name-row');
            if (nameRow && !nameRow.querySelector('.mb-cust-status')) {
              var statusColor = picked.statusColor || '#1d60a2';
              var statusBg = statusColor.charAt(0) === '#' ? (statusColor + '22') : '#eaf2fb';
              nameRow.insertAdjacentHTML(
                'beforeend',
                '<span class="mb-cust-status" style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:7px;background:' +
                  esc(statusBg) + ';color:' + esc(statusColor) + ';flex:none;">' + esc(picked.status) + '</span>'
              );
            }
          }
        }
      }
    } catch (e) { /* ignore */ }

    if (needsProduct) {
      try {
        var products = await fetchCustomerProducts(cid);
        if (products && products.length) {
          setProductLine(card, products.map(function (p) { return p.name; }).filter(Boolean).join(', '));
        }
      } catch (e) { /* ignore */ }
    }
  }

  function enrichCustomerCards(listEl) {
    listEl = document.getElementById('mb-live-list') || listEl;
    if (!listEl) return;
    var cards = Array.prototype.slice.call(listEl.querySelectorAll('[data-customer-id]'));
    if (!cards.length) return;
    var queue = cards.slice();
    var workers = Math.min(3, queue.length);
    function run() {
      var card = queue.shift();
      if (!card) return Promise.resolve();
      return enrichOneCustomerCard(card).then(run, run);
    }
    for (var i = 0; i < workers; i++) run();
  }

  function productsSheetHost() {
    var list = document.getElementById('mb-live-list');
    var screen = list && list.closest('div[style*="height:812"]');
    if (!screen) screen = list && list.parentElement && list.parentElement.parentElement;
    if (!screen) screen = document.body;
    try {
      var pos = window.getComputedStyle(screen).position;
      if (!pos || pos === 'static') screen.style.position = 'relative';
    } catch (e) { /* ignore */ }
    return screen;
  }

  function closeCustomerProductsSheet() {
    var sheet = document.getElementById('mb-cust-products-sheet');
    if (sheet && sheet.parentNode) sheet.parentNode.removeChild(sheet);
  }

  function normalizeProductRows(raw) {
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
      return {
        name: name,
        qty: p.item_qty != null ? String(p.item_qty) : '',
        price: p.price || (p.coin && p.item_price ? (String(p.coin) + String(p.item_price)) : (p.item_price || p.item_total || '')),
        date: p.date_display || p.date_created || '',
        type: p.document_type_label || p.document_type || p.order_type || '',
        doc: p.last_documents_id || p.document_id || ''
      };
    }).filter(Boolean);
  }

  async function fetchCustomerProducts(customerId) {
    var cid = String(customerId || '').trim();
    if (!cid) return [];
    if (!window.MineralBarApp || typeof MineralBarApp.getClient !== 'function') {
      throw new Error('App not ready');
    }
    var client = MineralBarApp.getClient();
    if (!client || !client.getToken || !client.getToken()) {
      throw new Error('Not authenticated');
    }
    var attempts = [
      { customer_id: cid, page_id: 1, limit: 25 },
      { cust_id: cid, page_id: 1, limit: 25 },
      { customer_id: cid, length: 25, start: 0 }
    ];
    var lastErr = null;
    for (var i = 0; i < attempts.length; i++) {
      try {
        var res = await client.request('Documents.Products', attempts[i]);
        if (res && String(res.success) === '0') {
          lastErr = new Error(res.message || 'Documents.Products failed');
          continue;
        }
        return normalizeProductRows(res);
      } catch (e) {
        lastErr = e;
      }
    }
    if (lastErr) throw lastErr;
    return [];
  }

  function renderProductsSheetBody(products, err) {
    if (err) {
      return (
        '<div style="background:#fbeeed;border:1px solid #f0c9c4;border-radius:12px;padding:12px;color:#7a2e28;font:600 12.5px/1.5 Heebo,sans-serif;">' +
        esc(apiErrorText(err)) +
        '</div>'
      );
    }
    if (!products || !products.length) {
      return (
        '<div style="text-align:center;padding:28px 12px;">' +
        '<div style="width:48px;height:48px;border-radius:50%;background:#eaf2fb;color:#1d60a2;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">' +
        productIconSvg(22, '#1d60a2') +
        '</div>' +
        '<div style="font-size:14.5px;font-weight:800;color:#5a6473;">' + esc(t('No products', 'אין מוצרים')) + '</div>' +
        '<div style="font-size:12.5px;color:#9aa3b0;margin-top:6px;">' + esc(t('This customer has no purchased products', 'ללקוח זה אין מוצרים שנרכשו')) + '</div>' +
        '</div>'
      );
    }
    return products.map(function (p) {
      var meta = [];
      if (p.qty) meta.push(t('Qty', 'כמות') + ': ' + p.qty);
      if (p.price) meta.push(String(p.price));
      if (p.date) meta.push(String(p.date));
      if (p.type) meta.push(String(p.type));
      if (p.doc) meta.push('#' + p.doc);
      return (
        '<div style="display:flex;align-items:flex-start;gap:11px;padding:12px 0;border-bottom:1px solid #f0f2f5;">' +
        '<span style="width:36px;height:36px;border-radius:10px;background:#eaf2fb;color:#1d60a2;display:flex;align-items:center;justify-content:center;flex:none;">' +
        productIconSvg(16, '#1d60a2') +
        '</span>' +
        '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:14px;font-weight:800;color:#1f2a3a;">' + esc(p.name) + '</div>' +
        (meta.length
          ? '<div style="font-size:12px;color:#7b8595;margin-top:4px;line-height:1.45;">' + esc(meta.join(' · ')) + '</div>'
          : '') +
        '</div></div>'
      );
    }).join('');
  }

  function openCustomerProductsSheet(customerId, customerName) {
    closeCustomerProductsSheet();
    var host = productsSheetHost();
    var title = t('Products', 'מוצרים');
    var subtitle = customerName
      ? (customerName + (customerId ? ' · #' + customerId : ''))
      : (customerId ? ('#' + customerId) : '');

    var wrap = document.createElement('div');
    wrap.id = 'mb-cust-products-sheet';
    wrap.setAttribute('style', 'position:absolute;inset:0;z-index:70;display:flex;flex-direction:column;');
    wrap.innerHTML =
      '<div data-mb-backdrop="1" style="position:absolute;inset:0;background:#0f1828;opacity:0.4;"></div>' +
      '<div style="position:absolute;bottom:0;left:0;right:0;background:#fff;border-radius:24px 24px 0 0;padding:16px 18px calc(22px + env(safe-area-inset-bottom, 0px));max-height:78%;display:flex;flex-direction:column;box-shadow:0 -8px 28px rgba(15,24,40,.12);z-index:71;">' +
      '<div style="width:42px;height:5px;border-radius:99px;background:#dadfe6;margin:0 auto 12px;flex:none;"></div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;flex:none;">' +
      '<button type="button" data-mb-close="1" aria-label="Close" style="width:34px;height:34px;border-radius:50%;border:none;background:#eef0f3;color:#7b8595;cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none;">' +
      '<svg fill="none" height="15" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" viewBox="0 0 24 24" width="15"><path d="M18 6 6 18M6 6l12 12"></path></svg>' +
      '</button>' +
      '<div style="flex:1;min-width:0;text-align:center;">' +
      '<div style="font-size:18px;font-weight:800;color:#1f2a3a;">' + esc(title) + '</div>' +
      (subtitle ? '<div style="font-size:12px;color:#9aa3b0;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(subtitle) + '</div>' : '') +
      '</div>' +
      '<div style="width:34px;flex:none;"></div>' +
      '</div>' +
      '<div data-mb-body="1" class="dc-scroll" style="flex:1;overflow-y:auto;min-height:120px;">' +
      (window.MineralBarLoader && typeof MineralBarLoader.inlineHtml === 'function'
        ? MineralBarLoader.inlineHtml(t('Loading products...', 'טוען מוצרים...'))
        : '<div class="mb-inline-loader"><div class="mb-page-loader__spin" aria-hidden="true"></div><div class="mb-page-loader__label">' + esc(t('Loading products...', 'טוען מוצרים...')) + '</div></div>') +
      '</div></div>';

    host.appendChild(wrap);
    wrap.querySelector('[data-mb-backdrop]').addEventListener('click', closeCustomerProductsSheet);
    wrap.querySelector('[data-mb-close]').addEventListener('click', closeCustomerProductsSheet);

    var bodyEl = wrap.querySelector('[data-mb-body]');
    fetchCustomerProducts(customerId).then(function (products) {
      if (!bodyEl.isConnected) return;
      bodyEl.innerHTML = renderProductsSheetBody(products, null);
    }).catch(function (err) {
      if (!bodyEl.isConnected) return;
      console.warn('[ListLive] Documents.Products failed', err);
      bodyEl.innerHTML = renderProductsSheetBody([], err);
    });
  }

  function bindProductButtons(listEl) {
    listEl = document.getElementById('mb-live-list') || listEl;
    if (!listEl) return;
    var buttons = listEl.querySelectorAll('.mb-cust-products-btn');
    buttons.forEach(function (btn) {
      if (btn.dataset.wired === '1') return;
      btn.dataset.wired = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var cid = btn.getAttribute('data-customer-id') || '';
        var cname = btn.getAttribute('data-customer-name') || '';
        if (!cid) return;
        openCustomerProductsSheet(cid, cname);
      });
    });
  }

  function detectMount() {
    var el = document.getElementById('mb-live-list');
    if (el) {
      var kind = el.getAttribute('data-kind') || 'customers';
      var folderId = lockedFolderIdForPage(kind);
      el.setAttribute('data-folder', String(folderId));
      return {
        el: el,
        folderId: folderId,
        kind: kind
      };
    }
    return null;
  }

  /** Locked folder for this page (leads=New Leads, customers=Customers). */
  function getActiveFolderId(mount) {
    mount = mount || detectMount();
    var kind = (mount && mount.kind) || pageKind();
    return String(lockedFolderIdForPage(kind));
  }

  function setActiveFolderId(folderId) {
    var kind = pageKind();
    var id = String(lockedFolderIdForPage(kind));
    // Ignore attempts to switch away from the page's locked folder
    if (folderId != null && folderId !== '' && String(folderId) !== '0' && String(folderId) !== 'all') {
      // keep locked id — page is not multi-folder
    }
    window.__mbListActiveFolder = id;
    window.__mbActiveFolderId = id;
    try {
      sessionStorage.setItem('mb_list_active_folder_' + kind, id);
    } catch (e) { /* ignore */ }
    var chipContainer = document.getElementById('mb-customer-filter-chips');
    if (chipContainer) chipContainer.setAttribute('data-active-folder', id);
    var list = document.getElementById('mb-live-list');
    if (list) list.setAttribute('data-folder', id);
  }

  function syncChipActiveStyles(activeId) {
    activeId = String(lockedFolderIdForPage(pageKind()));
    var chips = document.querySelectorAll('.mb-cust-chip, .mb-folder-tab');
    chips.forEach(function (c) {
      var fid = c.getAttribute('data-folder-id') || c.getAttribute('data-chip-id');
      // Customers "all" (0): no chip highlighted. Leads folder 1+: highlight match.
      var isThis = String(fid) === activeId;
      c.setAttribute('data-active', isThis ? '1' : '0');
      c.style.background = isThis ? '#eff6ff' : '#f8fafc';
      c.style.color = isThis ? '#1d4ed8' : '#475569';
      c.style.border = isThis ? '1.5px solid #3b82f6' : '1.5px solid #e2e8f0';
      c.style.fontWeight = isThis ? '800' : '700';
    });
    var chipContainer = document.getElementById('mb-customer-filter-chips');
    if (chipContainer) chipContainer.setAttribute('data-active-folder', activeId);
  }

  function restoreActiveFolderFromSession() {
    // Pages are folder-locked; session restore must not override that.
    var kind = pageKind();
    window.__mbListActiveFolder = String(lockedFolderIdForPage(kind));
    window.__mbActiveFolderId = window.__mbListActiveFolder;
  }

  async function loadList(mount, explicitFolderId, opts) {
    opts = opts || {};
    var silent = !!opts.silent;
    var el = mount.el;
    var kind = mount.kind;
    var loadId = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 7);
    mount._activeLoadId = loadId;

    el = document.getElementById('mb-live-list') || el;
    var hasRows = !!(el && el.querySelector('[data-customer-id]'));
    // Socket / soft refresh: keep current list visible — never flash "Loading…"
    if (!silent || !hasRows) {
      el.innerHTML = loadingHtml();
      var totalElBusy = document.getElementById('mb-total-label');
      if (totalElBusy) {
        totalElBusy.textContent = (typeof window.mbT === 'function' ? window.mbT('Loading…', 'טוען…') : 'טוען…');
      }
    }

    var totalEl = document.getElementById('mb-total-label');

    var queryParams = { length: 100, start: 0, draw: 1 };
    // Always lock to page folder: leads → New Leads, customers → Customers
    var folderVal = lockedFolderIdForPage(kind);
    queryParams.folder_id = folderVal;
    setActiveFolderId(folderVal);

    var lastErr = null;
    // SDK already retries transient failures — avoid stacking another 3× page loop.
    try {
      await ensureStatusMaps();
      var listRes = await MineralBarApp.listCustomers(queryParams);
      if (mount._activeLoadId !== loadId) return;

      el = document.getElementById('mb-live-list') || el;
      totalEl = document.getElementById('mb-total-label');

      var rows = (listRes && (listRes.rows || listRes.data || listRes.items || listRes.records)) || [];
      if (!Array.isArray(rows)) rows = [];
      var total = (listRes && listRes.total != null) ? listRes.total
        : (listRes && listRes.recordsFiltered != null) ? listRes.recordsFiltered
        : (listRes && listRes.recordsTotal != null) ? listRes.recordsTotal
        : rows.length;

      if (totalEl) {
        totalEl.textContent = formatTotalLabel(total, kind);
      }

      if (!rows.length) {
        el.innerHTML = emptyHtml(kind);
        return;
      }

      var html = rows.map(function (row) {
        var c = pick(row);
        return kind === 'leads' ? leadCard(c) : customerCard(c);
      }).join('');

      el.innerHTML = html;
      applyClientFilters(el);
      bindClientFilters(el);
      bindProductButtons(el);
      enrichCustomerCards(el);
      syncChipActiveStyles(getActiveFolderId(mount));
      return;
    } catch (err) {
      lastErr = err;
      console.warn('[MineralBar] Customer.List failed', err);
    }

    if (mount._activeLoadId !== loadId) return;
    // Soft refresh failed — keep existing rows; only show error on first/manual load
    if (silent && hasRows) {
      console.warn('[ListLive] silent refresh failed — keeping list', lastErr);
      return;
    }
    console.error('[MineralBar] Customer.List failed', lastErr);
    el = document.getElementById('mb-live-list') || el;
    totalEl = document.getElementById('mb-total-label');
    if (totalEl) totalEl.textContent = 'API Error';
    el.innerHTML = errorHtml(lastErr);
    var btn = document.getElementById('mb-list-retry');
    if (btn) btn.addEventListener('click', function () {
      mount._activeLoadId = '';
      el.removeAttribute('data-initial-loaded');
      loadList(mount, explicitFolderId);
    });
  }

  function applyClientFilters(listEl) {
    listEl = document.getElementById('mb-live-list') || listEl;
    var input = document.querySelector('.ds-input') || document.getElementById('mb-customer-search');
    var query = input ? input.value.toLowerCase().trim() : '';

    var clearBtn = document.getElementById('mb-clear-search');
    if (clearBtn) {
      clearBtn.style.display = query.length > 0 ? 'flex' : 'none';
    }
    
    var items = listEl.querySelectorAll('div[data-customer-id], a[data-customer-id]');
    var visibleCount = 0;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item.dataset.originalDisplay) {
        item.dataset.originalDisplay = item.style.display || 'flex';
      }
      
      var text = item.textContent.toLowerCase();
      var isVisible = query === '' || text.indexOf(query) > -1;

      item.style.display = isVisible ? item.dataset.originalDisplay : 'none';
      if (isVisible) visibleCount++;
    }

    var totalEl = document.getElementById('mb-total-label');
    if (totalEl) {
      var kindEl = document.getElementById('mb-live-list');
      var kindVis = (kindEl && kindEl.getAttribute('data-kind')) || 'customers';
      totalEl.textContent = formatTotalLabel(visibleCount, kindVis);
    }
  }

  function renderFolderFilterBar(container, selectedFolderId) {
    if (!container) return;

    // Pages are locked to one folder — hide the multi-folder chip bar
    container.innerHTML = '';
    container.style.display = 'none';
    container.setAttribute('data-active-folder', String(lockedFolderIdForPage(pageKind())));
  }

  function bindClientFilters(listEl) {
    var searchInput = document.getElementById('mb-customer-search') || document.querySelector('.ds-input');
    var clearBtn = document.getElementById('mb-clear-search');

    if (searchInput && !searchInput.dataset.wired) {
      searchInput.dataset.wired = '1';
      searchInput.addEventListener('input', function() {
        applyClientFilters(listEl);
      });
    }

    if (clearBtn && !clearBtn.dataset.wired) {
      clearBtn.dataset.wired = '1';
      clearBtn.addEventListener('click', function() {
        if (searchInput) {
          searchInput.value = '';
          applyClientFilters(listEl);
          searchInput.focus();
        }
      });
    }

    var chipContainer = document.getElementById('mb-customer-filter-chips') || document.querySelector('.dc-scroll');
    if (chipContainer && !chipContainer.dataset.rendered) {
      chipContainer.dataset.rendered = '1';
      var initialFolder = lockedFolderIdForPage(pageKind());
      setActiveFolderId(initialFolder);
      renderFolderFilterBar(chipContainer, initialFolder);
    }
  }

  function start() {
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    var mount = detectMount();
    if (!mount || !mount.el) return;
    // Initial load only — later updates come from socket partial patches
    if (mount.el.getAttribute('data-initial-loaded') === '1') return;
    mount.el.setAttribute('data-initial-loaded', '1');
    var folder = getActiveFolderId(mount);
    setActiveFolderId(folder);
    loadList(mount, folder);
  }

  function watchForListRemount() {
    if (!document.body || window.__mbListMountObserver) return;
    var scheduled = false;
    window.__mbListMountObserver = new MutationObserver(function() {
      if (scheduled) return;
      scheduled = true;
      setTimeout(function() {
        scheduled = false;
        start();
      }, 0);
    });
    window.__mbListMountObserver.observe(document.body, { childList: true, subtree: true });
  }

  function bumpTotal(delta) {
    var totalEl = document.getElementById('mb-total-label');
    if (!totalEl) return;
    var m = String(totalEl.textContent || '').match(/(\d+)/);
    var n = m ? Number(m[1]) : 0;
    n = Math.max(0, n + delta);
    var kindEl = document.getElementById('mb-live-list');
    var kind = (kindEl && kindEl.getAttribute('data-kind')) || 'customers';
    totalEl.textContent = formatTotalLabel(n, kind);
  }

  function extractCustomerFromEvent(detail) {
    var ev = (detail && detail.event) || {};
    var payload = ev.payload || ev.data || ev || {};
    var customer = payload.customer || payload.lead || payload.data || null;
    var id = (customer && (customer.id || customer.customer_id || customer.contactus_id)) ||
      payload.customer_id || payload.cust_id || payload.id || '';
    if (!id && !customer) return null;
    var row = customer || payload;
    return pick(Object.assign({}, row, {
      id: id || row.id,
      customer_id: id || row.customer_id,
      name: row.name || row.customer_name || payload.name || ('#' + id),
      phone: row.phone || row.mobile || payload.mobile || payload.phone || '',
      email: row.email || payload.email || '',
      city: row.city || payload.city || '',
      address: row.address || row.full_address || payload.address || '',
      status: row.status,
      status_id: row.status_id || payload.status_id,
      status_name: row.status_name || payload.status_name,
      sub_list_data: row.sub_list_data || payload.sub_list_data,
      sub_list_data_name: row.sub_list_data_name || payload.sub_list_data_name,
      products: row.products || row.product || payload.products || ''
    }));
  }

  function cssAttrEscape(v) {
    return String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function upsertCustomerCard(c, kind) {
    var el = document.getElementById('mb-live-list');
    if (!el || !c || !c.id) return false;
    var existing = el.querySelector('[data-customer-id="' + cssAttrEscape(String(c.id)) + '"]');
    var html = kind === 'leads' ? leadCard(c) : customerCard(c);
    if (existing) {
      var wrap = document.createElement('div');
      wrap.innerHTML = html;
      var next = wrap.firstElementChild;
      if (next) existing.replaceWith(next);
      bindProductButtons(el);
      if (kind !== 'leads') enrichOneCustomerCard(next || el.querySelector('[data-customer-id="' + cssAttrEscape(String(c.id)) + '"]'));
      console.log('[ListLive] socket updated row', c.id, c.name);
      return true;
    }
    // New item — prepend only that card
    if (/טוען|loading|אין |no /i.test(el.textContent || '') && el.children.length <= 1) {
      el.innerHTML = html;
    } else {
      el.insertAdjacentHTML('afterbegin', html);
    }
    bumpTotal(1);
    bindProductButtons(el);
    if (kind !== 'leads') {
      enrichOneCustomerCard(el.querySelector('[data-customer-id="' + cssAttrEscape(String(c.id)) + '"]'));
    }
    console.log('[ListLive] socket inserted row', c.id, c.name);
    return true;
  }

  function removeCustomerCard(id) {
    var el = document.getElementById('mb-live-list');
    if (!el || !id) return false;
    var existing = el.querySelector('[data-customer-id="' + cssAttrEscape(String(id)) + '"]');
    if (!existing) return false;
    existing.remove();
    bumpTotal(-1);
    console.log('[ListLive] socket removed row', id);
    return true;
  }

  var _fullRefreshTimer = null;
  var _fullRefreshPendingReason = '';

  function fullListRefresh(reason) {
    // Debounce LiveSync retries (300 / 1000 / 2500) into one silent re-fetch
    _fullRefreshPendingReason = reason || _fullRefreshPendingReason || '';
    clearTimeout(_fullRefreshTimer);
    _fullRefreshTimer = setTimeout(function () {
      var mount = detectMount();
      if (!mount) return;
      var why = _fullRefreshPendingReason;
      _fullRefreshPendingReason = '';
      var folder = getActiveFolderId(mount);
      loadList(mount, folder, { silent: true });
      syncChipActiveStyles(folder);
      if (window.Biz1Pulse) window.Biz1Pulse(mount.el);
      console.log('[ListLive] silent refresh', why, 'folder=' + folder);
    }, 180);
  }

  function applySocketCustomerEvent(detail) {
    var key = String((detail && detail.key) || '').toLowerCase();
    if (!/lead|customer|crm|socket\.nudge/.test(key)) return;
    var mount = detectMount();
    if (!mount) return;
    var kind = mount.kind || 'customers';
    var activeFolder = getActiveFolderId(mount);

    // Poll / reconnect / any filtered view → full REST re-fetch WITH current folder
    if (/socket\.nudge/.test(key)) {
      fullListRefresh(key);
      return;
    }

    var c = extractCustomerFromEvent(detail);

    if (/delete|deleted|purge|remove/.test(key)) {
      var delId = (c && c.id) ||
        (detail.event && detail.event.payload && (detail.event.payload.customer_id || detail.event.payload.id));
      if (delId) removeCustomerCard(delId);
      else fullListRefresh(key);
      return;
    }

    // Folder filter active → never patch raw list (would break filter); silent re-fetch
    var folderFiltered = kind === 'leads'
      ? (activeFolder !== '' && activeFolder != null)
      : (activeFolder && activeFolder !== '0' && activeFolder !== 'all');
    if (folderFiltered) {
      fullListRefresh(key || 'folder-filter');
      return;
    }

    if (!c || !c.id) {
      console.warn('[ListLive] socket payload incomplete — full list refresh', key);
      fullListRefresh(key);
      return;
    }

    upsertCustomerCard(c, kind);
    if (window.Biz1Pulse) window.Biz1Pulse(mount.el);
  }

  window.addEventListener('mineralbar:ready', function (ev) {
    // Ignore realtime soft re-fires — only initial auth ready should load full list
    if (ev && ev.detail && ev.detail.reason === 'realtime') return;
    start();
  });
  window.addEventListener('mineralbar:language-changed', function () {
    statusMapsPromise = null;
    statusMapById = {};
    statusMapByName = {};
    var mount = detectMount();
    if (!mount) return;
    mount.el.removeAttribute('data-initial-loaded');
    start();
  });
  window.addEventListener('mineralbar:auth-refreshed', start);
  window.addEventListener('mineralbar:leads', function (ev) {
    applySocketCustomerEvent((ev && ev.detail) || {});
  });
  window.addEventListener('mineralbar:realtime', function (ev) {
    applySocketCustomerEvent((ev && ev.detail) || {});
  });
  window.addEventListener('mineralbar:page-refresh', function (ev) {
    var detail = (ev && ev.detail) || {};
    var key = String(detail.key || '').toLowerCase();
    if (/lead|customer|crm|socket\.nudge/.test(key) || !key) fullListRefresh(key || 'page-refresh');
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      watchForListRemount();
      setTimeout(start, 20);
    });
  } else {
    watchForListRemount();
    setTimeout(start, 20);
  }
  // Do NOT re-fetch on pageshow/visibility — returning from another app must stay on socket updates only.
  // (BFCache socket reconnect is handled in biz1-app.js)

  if (window.LiveSync && typeof LiveSync.bind === 'function') {
    LiveSync.bind(function (detail) {
      var key = String((detail && detail.key) || '').toLowerCase();
      if (/socket\.nudge/.test(key) || !key) {
        fullListRefresh(key || 'livesync');
        return;
      }
      applySocketCustomerEvent(detail || {});
    }, {
      keys: /customer|lead|crm|socket\.nudge/i,
      mount: '#mb-live-list',
      delay: 250,
      retries: true
    });
  } else if (window.MineralBarApp && MineralBarApp.bindLiveReload) {
    MineralBarApp.bindLiveReload(function () {
      fullListRefresh('bindLiveReload');
    }, { keys: /customer|lead|crm|socket\.nudge/i, delay: 180 });
  }

})();
