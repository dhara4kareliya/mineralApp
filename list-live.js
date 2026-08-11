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

  function parseExtraFields(row) {
    row = row || {};
    var ef = row.extra_fields_json;
    if (!ef && row.extra_fields != null) {
      if (typeof row.extra_fields === 'string') {
        try { ef = JSON.parse(row.extra_fields); } catch (e) { ef = null; }
      } else if (typeof row.extra_fields === 'object') {
        ef = row.extra_fields;
      }
    }
    return (ef && typeof ef === 'object') ? ef : {};
  }

  // Biz1 rejects unknown custom fields. Mineral has Level (a-1785311630):
  // לא מעוניין / מתלבט / רציני / תותח — use "תותח" as VIP marker.
  var VIP_FIELD = 'a-1785311630';
  var VIP_VALUE = 'תותח';

  function isVipFromExtra(ef) {
    var v = String((ef && (ef[VIP_FIELD] || ef.vip || ef.vip_level)) || '').trim();
    return v === VIP_VALUE || /^(1|yes|true|vip|gold|תותח)$/i.test(v);
  }

  function isRenewDue(row) {
    if (!row || !row.followup) return false;
    var ts = new Date(row.followup).getTime();
    if (isNaN(ts)) return false;
    // Due for renew: overdue or within next 30 days
    return (ts - Date.now()) / 86400000 <= 30;
  }

  function isWarrantyRunningOut(row, ef) {
    ef = ef || parseExtraFields(row);
    var ins = String(ef.insurance || row.insurance || row.warranty || row.warranty_status || '').trim();
    if (/warrant|אחרי|extended/i.test(ins)) return true;
    var end = row.warranty_end || row.warranty_until || ef.warranty_end || ef.warranty_until;
    if (end) {
      var ts = new Date(end).getTime();
      if (!isNaN(ts)) return (ts - Date.now()) / 86400000 <= 60;
    }
    return false;
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
    var ef = parseExtraFields(row);
    var isVip = isVipFromExtra(ef);
    var isRenew = isRenewDue(row);
    var isWarranty = isWarrantyRunningOut(row, ef);
    var out = {
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
      isVip: isVip,
      isRenew: isRenew,
      isWarranty: isWarranty,
      followup: row.followup || '',
      source: stripHtmlText(row.source || row.affiliate || row.lead_source || row.channel || ''),
      statusKey: '',
      raw: row
    };
    out.statusKey = leadStatusKey(out.status, row);
    return out;
  }

  function leadStatusKey(statusLabel, row) {
    var s = String(statusLabel || '').toLowerCase();
    if (/follow|פולוא/.test(s)) return 'followup';
    if (/offer|quote|הצע|sent|proposal/.test(s)) return 'sent';
    if (/closed|won|נסגר|deal|converted|שולם/.test(s)) return 'closed';
    if (/no.?answer|מענה|לא ענה|unreachable|לא זמין/.test(s)) return 'noanswer';
    if (/irrelevant|לא רלוונט|not relevant/.test(s)) return 'irrelevant';
    if (/new|חדש/.test(s)) return 'new';
    if (row && row.followup) {
      var ts = new Date(row.followup).getTime();
      if (!isNaN(ts) && ts <= Date.now()) return 'followup';
    }
    return 'other';
  }

  function leadSourceKey(sourceLabel) {
    var s = String(sourceLabel || '').toLowerCase();
    if (/fb|facebook|פייסבוק/.test(s)) return 'fb';
    if (/ig|insta|אינסט/.test(s)) return 'ig';
    if (/site|web|אתר/.test(s)) return 'site';
    if (/ref|refer|הפנ/.test(s)) return 'ref';
    if (/call|incoming|שיחה|נכנס/.test(s)) return 'incoming';
    if (s) return 'other';
    return '';
  }

  function defaultLeadFilters() {
    return {
      mainChip: 'all',
      soug: 'all',
      status: 'all',
      owner: 'all',
      source: 'all',
      dateQuick: 'none',
      sortLeads: 'created',
      sortRenew: 'expiry',
      dir: { created: 'new', statusTime: 'long', expiry: 'urgent' }
    };
  }

  function getLeadFilters() {
    if (!window.__mbLeadFilters) window.__mbLeadFilters = defaultLeadFilters();
    return window.__mbLeadFilters;
  }

  function setLeadFilters(patch) {
    var cur = getLeadFilters();
    window.__mbLeadFilters = Object.assign({}, cur, patch || {});
    if (patch && patch.dir) {
      window.__mbLeadFilters.dir = Object.assign({}, cur.dir, patch.dir);
    }
    try {
      window.dispatchEvent(new CustomEvent('mineralbar:lead-filters', { detail: window.__mbLeadFilters }));
    } catch (e) { /* ignore */ }
  }

  function getActiveLeadFilter() {
    return String(getLeadFilters().mainChip || 'all');
  }

  function setActiveLeadFilter(id) {
    var filters = getLeadFilters();
    filters.mainChip = String(id || 'all');
    if (filters.mainChip !== 'all') filters.status = filters.mainChip;
    else filters.status = 'all';
    setLeadFilters(filters);
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
      '<a href="' + detail + '" data-customer-id="' + esc(c.id) + '" data-status="' + esc(c.status) + '" data-status-key="' + esc(c.statusKey || leadStatusKey(c.status, c.raw)) + '" data-source-key="' + esc(leadSourceKey(c.source)) + '" data-created="' + esc(c.created || '') + '" data-followup="' + esc(c.followup || '') + '" style="display:block;background:#fff;border-radius:16px;padding:14px 16px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-bottom:12px;text-decoration:none;">' +
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
    var isVip = !!c.isVip;
    var isRenew = !!c.isRenew;
    var isWarranty = !!c.isWarranty;
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
    var badges = '';
    if (isVip) {
      badges += '<span class="mb-cust-vip-badge" style="font-size:10.5px;font-weight:800;padding:3px 8px;border-radius:7px;background:#f6eee4;color:#8a6540;flex:none;">VIP</span>';
    }
    if (isRenew) {
      badges += '<span style="font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:7px;background:#f0eefb;color:#50439d;flex:none;">' + esc(t('Renew', 'חידוש')) + '</span>';
    }
    if (isWarranty) {
      badges += '<span style="font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:7px;background:#fbeeed;color:#a3302e;flex:none;">' + esc(t('Warranty', 'אחריות')) + '</span>';
    }
    return (
      '<div class="mb-cust-card" data-customer-id="' + esc(c.id) + '" data-customer-name="' + esc(c.name) + '" data-phone="' + esc(phone) + '" data-status="' + esc(c.status || '') + '" data-vip="' + (isVip ? '1' : '0') + '" data-renew="' + (isRenew ? '1' : '0') + '" data-warranty="' + (isWarranty ? '1' : '0') + '">' +
      '<a href="' + detail + '" class="mb-cust-avatar">' + esc(av) + '</a>' +
      '<a href="' + detail + '" class="mb-cust-main">' +
      '<div class="mb-cust-name-row">' +
      '<span class="mb-cust-name">' + esc(c.name) + '</span>' +
      badges +
      (statusLabel
        ? '<span class="mb-cust-status" style="background:' + esc(statusBg) + ';color:' + esc(statusColor) + ';">' + esc(statusLabel) + '</span>'
        : '') +
      '</div>' +
      '<div class="mb-cust-address" style="display:' + (address ? '-webkit-box' : 'none') + ';">' +
      (address ? esc(address) : '') +
      '</div>' +
      '<div class="mb-cust-meta" style="display:' + (metaBits.length ? 'block' : 'none') + ';">' +
      (metaBits.length ? metaBits.join(' · ') : '') +
      '</div>' +
      '<div class="mb-cust-product-line" data-customer-id="' + esc(c.id) + '" style="' + (products ? '' : 'display:none;') + '">' +
      (products
        ? ('<span class="mb-cust-product-inner">' + productIconSvg(12, '#1d60a2') + '<span>' + esc(products) + '</span></span>')
        : '') +
      '</div>' +
      '</a>' +
      '<div class="mb-cust-actions">' +
      '<button type="button" class="mb-cust-products-btn mb-cust-action" data-customer-id="' + esc(c.id) + '" data-customer-name="' + esc(c.name) + '" title="' + esc(t('Show products', 'הצג מוצרים')) + '" aria-label="' + esc(t('Show products', 'הצג מוצרים')) + '">' +
      productIconSvg(15, '#1d60a2') +
      '</button>' +
      '<button type="button" class="mb-cust-vip-btn mb-cust-action' + (isVip ? ' is-on' : '') + '" data-customer-id="' + esc(c.id) + '" data-vip="' + (isVip ? '1' : '0') + '" title="' + esc(isVip ? t('Unmark VIP', 'הסר VIP') : t('Mark as VIP', 'סמן כ־VIP')) + '" aria-label="VIP">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + (isVip ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
      '</button>' +
      (wa
        ? '<a href="' + esc(wa) + '" target="_blank" rel="noopener" class="mb-cust-action mb-cust-wa" aria-label="WhatsApp" onclick="event.stopPropagation();">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2z"/></svg>' +
          '</a>'
        : '') +
      '<a href="' + detail + '" class="mb-cust-chevron" aria-hidden="true">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>' +
      '</a>' +
      '</div>' +
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
    // Lead cards use a different layout — skip per-card enrichment there
    if (!card.querySelector('.mb-cust-name-row') && !card.querySelector('.mb-cust-address')) return;
    card.dataset.enriched = '1';
    var needsAddress = !((card.querySelector('.mb-cust-address') || {}).textContent || '').trim();
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
          // Products come from Customer.List / Customer.Get when available —
          // do not call Documents.Products per card (unused + noisy on list pages).
          if (picked.products) {
            setProductLine(card, picked.products);
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
  }

  function enrichCustomerCards(listEl) {
    listEl = document.getElementById('mb-live-list') || listEl;
    if (!listEl) return;
    // Leads list does not show product lines — skip enrichment entirely
    if ((listEl.getAttribute('data-kind') || pageKind()) === 'leads') return;
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
    // Customers page uses Renew/Warranty/VIP chips — don't restyle those as folder chips
    if (pageKind() === 'customers') {
      var chipContainer = document.getElementById('mb-customer-filter-chips');
      if (chipContainer) renderCustFilterChips(chipContainer);
      return;
    }
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
      mount._rowsCache = rows.slice();
      applyClientFilters(el);
      bindClientFilters(el);
      bindProductButtons(el);
      bindVipButtons(el);
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

  function getActiveCustFilter() {
    return String(window.__mbCustListFilter || 'all');
  }

  function setActiveCustFilter(id) {
    window.__mbCustListFilter = String(id || 'all');
  }

  function parseListDate(raw) {
    if (!raw) return NaN;
    var d = new Date(raw);
    if (!isNaN(d.getTime())) return d.getTime();
    var m = String(raw).match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (m) {
      d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
      if (!isNaN(d.getTime())) return d.getTime();
    }
    return NaN;
  }

  function normalizeLeadStatusFilter(id) {
    var s = String(id || 'all');
    if (s === 'offer') return 'sent';
    return s;
  }

  function leadMatchesAdvancedFilters(item, filters) {
    filters = filters || getLeadFilters();
    var statusKey = item.getAttribute('data-status-key') || '';
    var sourceKey = item.getAttribute('data-source-key') || '';
    var createdTs = parseListDate(item.getAttribute('data-created'));
    var followupTs = parseListDate(item.getAttribute('data-followup'));
    var now = Date.now();
    var dayMs = 86400000;
    var statusFilter = normalizeLeadStatusFilter(filters.status);
    var chipFilter = normalizeLeadStatusFilter(filters.mainChip);

    if (chipFilter && chipFilter !== 'all') {
      if (statusKey !== chipFilter) return false;
    } else if (statusFilter && statusFilter !== 'all') {
      if (statusKey !== statusFilter) return false;
    }

    if (filters.source && filters.source !== 'all') {
      if (sourceKey !== filters.source) return false;
    }

    if (filters.dateQuick && filters.dateQuick !== 'none') {
      var anchor = createdTs;
      if (filters.soug === 'renew' && !isNaN(followupTs)) anchor = followupTs;
      if (isNaN(anchor)) return false;
      var ageDays = (now - anchor) / dayMs;
      if (filters.dateQuick === 'today' && ageDays > 1) return false;
      if (filters.dateQuick === 'week' && ageDays > 7) return false;
      if (filters.dateQuick === 'month' && ageDays > 31) return false;
      if (filters.dateQuick === 'd30' && ageDays > 30) return false;
      if (filters.dateQuick === 'expired' && anchor > now) return false;
    }

    return true;
  }

  function sortLeadItems(listEl, filters) {
    filters = filters || getLeadFilters();
    var items = Array.prototype.slice.call(listEl.querySelectorAll('[data-customer-id]'));
    if (items.length < 2) return;

    var sortKey = filters.sortLeads || 'created';
    var dirKey = (filters.dir && filters.dir[sortKey]) || 'new';
    var desc = dirKey === 'new' || dirKey === 'long' || dirKey === 'urgent';

    items.sort(function (a, b) {
      var av;
      var bv;
      if (sortKey === 'statusTime') {
        av = parseListDate(a.getAttribute('data-followup') || a.getAttribute('data-created'));
        bv = parseListDate(b.getAttribute('data-followup') || b.getAttribute('data-created'));
      } else {
        av = parseListDate(a.getAttribute('data-created'));
        bv = parseListDate(b.getAttribute('data-created'));
      }
      if (isNaN(av)) av = 0;
      if (isNaN(bv)) bv = 0;
      return desc ? (bv - av) : (av - bv);
    });

    items.forEach(function (node) { listEl.appendChild(node); });
  }

  function applyClientFilters(listEl) {
    listEl = document.getElementById('mb-live-list') || listEl;
    if (!listEl) return;
    var input = document.querySelector('.ds-input') || document.getElementById('mb-customer-search');
    var query = input ? String(input.value || '').toLowerCase().trim() : '';

    var clearBtn = document.getElementById('mb-clear-search');
    if (clearBtn) {
      clearBtn.style.display = query.length > 0 ? 'flex' : 'none';
    }

    var kindEl = document.getElementById('mb-live-list');
    var kindVis = (kindEl && kindEl.getAttribute('data-kind')) || 'customers';
    var filter = getActiveCustFilter();

    var items = listEl.querySelectorAll('div[data-customer-id], a[data-customer-id]');
    var visibleCount = 0;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item.dataset.originalDisplay) {
        item.dataset.originalDisplay = item.style.display || 'flex';
      }

      var text = item.textContent.toLowerCase();
      var matchesQuery = query === '' || text.indexOf(query) > -1;
      var matchesFilter = true;
      if (kindVis === 'customers' && filter && filter !== 'all') {
        if (filter === 'renew') matchesFilter = item.getAttribute('data-renew') === '1';
        else if (filter === 'warranty') matchesFilter = item.getAttribute('data-warranty') === '1';
        else if (filter === 'vip') matchesFilter = item.getAttribute('data-vip') === '1';
      } else if (kindVis === 'leads') {
        matchesFilter = leadMatchesAdvancedFilters(item, getLeadFilters());
      }

      var isVisible = matchesQuery && matchesFilter;
      item.style.display = isVisible ? item.dataset.originalDisplay : 'none';
      if (isVisible) visibleCount++;
    }

    var totalEl = document.getElementById('mb-total-label');
    if (totalEl) {
      totalEl.textContent = formatTotalLabel(visibleCount, kindVis);
    }

    if (kindVis === 'leads') {
      sortLeadItems(listEl, getLeadFilters());
    }
  }

  function renderLeadFilterChips(container) {
    if (!container) return;
    var active = getActiveLeadFilter();
    var chips = [
      { id: 'all', label: t('All', 'הכל'), color: '#1d60a2', bg: '#eaf2fb', border: '#6ea6d8' },
      { id: 'new', label: t('New lead', 'ליד חדש'), color: '#1d60a2', bg: '#eaf2fb', border: '#aecbe9' },
      { id: 'followup', label: t('Follow up', 'פולואפ'), color: '#bd8324', bg: '#fdf1dd', border: '#ecd3a0' },
      { id: 'sent', label: t('Offer sent', 'נשלחה הצעה'), color: '#50439d', bg: '#eef0fb', border: '#c3bfe6' },
      { id: 'closed', label: t('Closed', 'נסגר'), color: '#2e8a63', bg: '#e6f4ec', border: '#aed8c2' },
      { id: 'noanswer', label: t('No answer', 'אין מענה'), color: '#c0392b', bg: '#fbeeed', border: '#ecb8b1' }
    ];
    container.style.display = 'flex';
    container.innerHTML = chips.map(function (chip) {
      var on = active === chip.id;
      return (
        '<button type="button" class="mb-lead-chip" data-chip-id="' + esc(chip.id) + '" data-active="' + (on ? '1' : '0') + '" style="flex:none;padding:7px 12px;border-radius:99px;border:1.5px solid ' +
        (on ? chip.border : '#e2e8f0') + ';background:' + (on ? chip.bg : '#f8fafc') + ';color:' + (on ? chip.color : '#475569') +
        ';font-size:12.5px;font-weight:' + (on ? '800' : '700') + ';cursor:pointer;white-space:nowrap;">' +
        esc(chip.label) +
        '</button>'
      );
    }).join('');

    container.querySelectorAll('.mb-lead-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setActiveLeadFilter(btn.getAttribute('data-chip-id') || 'all');
        renderLeadFilterChips(container);
        applyClientFilters(document.getElementById('mb-live-list'));
      });
    });

    try {
      window.dispatchEvent(new CustomEvent('mineralbar:lead-chips-ready'));
    } catch (e) { /* ignore */ }
  }

  function renderCustFilterChips(container) {
    if (!container) return;
    var active = getActiveCustFilter();
    var chips = [
      { id: 'all', label: t('All', 'הכל'), color: '#1d60a2', bg: '#eaf2fb', border: '#6ea6d8' },
      { id: 'renew', label: t('To renew', 'לחידוש'), color: '#50439d', bg: '#f0eefb', border: '#a89fd4' },
      { id: 'warranty', label: t('Warranty ending', 'אחריות פוקעת'), color: '#a3302e', bg: '#fbeeed', border: '#e8a9a4' },
      { id: 'vip', label: t('VIP', 'VIP'), color: '#8a6540', bg: '#f6eee4', border: '#c9a882' }
    ];
    container.style.display = 'flex';
    container.innerHTML = chips.map(function (chip) {
      var on = active === chip.id;
      return (
        '<button type="button" class="mb-cust-chip" data-chip-id="' + esc(chip.id) + '" data-active="' + (on ? '1' : '0') + '" style="flex:none;padding:7px 12px;border-radius:99px;border:1.5px solid ' +
        (on ? chip.border : '#e2e8f0') + ';background:' + (on ? chip.bg : '#f8fafc') + ';color:' + (on ? chip.color : '#475569') +
        ';font-size:12.5px;font-weight:' + (on ? '800' : '700') + ';cursor:pointer;white-space:nowrap;">' +
        esc(chip.label) +
        '</button>'
      );
    }).join('');

    container.querySelectorAll('.mb-cust-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setActiveCustFilter(btn.getAttribute('data-chip-id') || 'all');
        renderCustFilterChips(container);
        applyClientFilters(document.getElementById('mb-live-list'));
      });
    });
  }

  function renderFolderFilterBar(container, selectedFolderId) {
    if (!container) return;
    var kind = pageKind();
    if (kind === 'customers') {
      renderCustFilterChips(container);
      return;
    }
    if (kind === 'leads') {
      renderLeadFilterChips(container);
      return;
    }
    container.innerHTML = '';
    container.style.display = 'none';
    container.setAttribute('data-active-folder', String(lockedFolderIdForPage(kind)));
  }

  function bindVipButtons(listEl) {
    listEl = document.getElementById('mb-live-list') || listEl;
    if (!listEl) return;
    var buttons = listEl.querySelectorAll('.mb-cust-vip-btn');
    buttons.forEach(function (btn) {
      if (btn.dataset.wired === '1') return;
      btn.dataset.wired = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleCustomerVip(btn);
      });
    });
  }

  async function toggleCustomerVip(btn) {
    var cid = btn.getAttribute('data-customer-id') || '';
    if (!cid || btn.dataset.busy === '1') return;
    var makeVip = btn.getAttribute('data-vip') !== '1';
    btn.dataset.busy = '1';
    btn.style.opacity = '0.55';
    try {
      if (!window.MineralBarApp || typeof MineralBarApp.getClient !== 'function') {
        throw new Error(t('SDK not ready', 'המערכת עדיין לא מוכנה'));
      }
      var client = MineralBarApp.getClient();
      var extra = {};
      extra[VIP_FIELD] = makeVip ? VIP_VALUE : '';
      var res = await client.request('Customer.Edit', {
        customer_id: cid,
        cust_id: cid,
        extra_fields: JSON.stringify(extra)
      });
      if (res && Number(res.success) === 0) {
        throw new Error(res.message || t('Failed to update VIP', 'עדכון VIP נכשל'));
      }
      var card = btn.closest('[data-customer-id]');
      if (card) {
        card.setAttribute('data-vip', makeVip ? '1' : '0');
        btn.setAttribute('data-vip', makeVip ? '1' : '0');
        btn.title = makeVip ? t('Unmark VIP', 'הסר VIP') : t('Mark as VIP', 'סמן כ־VIP');
        if (makeVip) btn.classList.add('is-on');
        else btn.classList.remove('is-on');
        btn.style.borderColor = '';
        btn.style.background = '';
        btn.style.color = '';
        var star = btn.querySelector('svg');
        if (star) star.setAttribute('fill', makeVip ? 'currentColor' : 'none');
        var nameRow = card.querySelector('.mb-cust-name-row');
        if (nameRow) {
          var existing = nameRow.querySelector('.mb-cust-vip-badge');
          if (makeVip && !existing) {
            var badge = document.createElement('span');
            badge.className = 'mb-cust-vip-badge';
            badge.textContent = 'VIP';
            var nameEl = nameRow.querySelector('.mb-cust-name');
            if (nameEl && nameEl.nextSibling) nameRow.insertBefore(badge, nameEl.nextSibling);
            else nameRow.appendChild(badge);
          } else if (!makeVip && existing) {
            existing.parentNode.removeChild(existing);
          }
        }
      }
      applyClientFilters(document.getElementById('mb-live-list'));
    } catch (err) {
      console.warn('[ListLive] VIP toggle failed', err);
      alert((err && err.message) || t('Failed to update VIP', 'עדכון VIP נכשל'));
    } finally {
      btn.dataset.busy = '0';
      btn.style.opacity = '1';
    }
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

    var chipContainer = document.getElementById('mb-customer-filter-chips');
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
      bindVipButtons(el);
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
    bindVipButtons(el);
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

  window.ListLive = window.ListLive || {};
  window.ListLive.setLeadAdvancedFilters = function (patch) {
    setLeadFilters(patch || {});
    var chipContainer = document.getElementById('mb-customer-filter-chips');
    if (chipContainer && pageKind() === 'leads') renderLeadFilterChips(chipContainer);
    applyClientFilters(document.getElementById('mb-live-list'));
  };
  window.ListLive.setLeadFilter = setActiveLeadFilter;
  window.ListLive.getLeadFilters = getLeadFilters;
  window.ListLive.getVisibleLeadCount = function () {
    var listEl = document.getElementById('mb-live-list');
    if (!listEl) return 0;
    var n = 0;
    listEl.querySelectorAll('[data-customer-id]').forEach(function (item) {
      if (item.style.display !== 'none') n++;
    });
    return n;
  };
  window.ListLive.previewLeadFilterCount = function (patch) {
    var listEl = document.getElementById('mb-live-list');
    if (!listEl) return -1;
    var base = getLeadFilters();
    var filters = Object.assign({}, base, patch || {});
    if (patch && patch.dir) filters.dir = Object.assign({}, base.dir, patch.dir);
    var input = document.querySelector('.ds-input') || document.getElementById('mb-customer-search');
    var query = input ? String(input.value || '').toLowerCase().trim() : '';
    var n = 0;
    listEl.querySelectorAll('[data-customer-id]').forEach(function (item) {
      var text = item.textContent.toLowerCase();
      var matchesQuery = query === '' || text.indexOf(query) > -1;
      if (matchesQuery && leadMatchesAdvancedFilters(item, filters)) n++;
    });
    return n;
  };
  window.ListLive.refreshList = function () {
    var mount = detectMount();
    if (!mount || !mount.el) return;
    mount.el.removeAttribute('data-initial-loaded');
    mount._activeLoadId = '';
    start();
  };

})();
