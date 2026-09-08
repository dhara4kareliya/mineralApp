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

  function formatLeadCountOnly(count) {
    var n = Number(count) || 0;
    var isEn = typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage() === 'en';
    return isEn ? (n + ' leads') : (n + ' לידים');
  }

  function leadStatusFilterLabel(id) {
    var key = String(id || 'all').toLowerCase();
    if (key === 'offer') key = 'sent';
    var map = {
      all: t('everything', 'הכל'),
      new: t('New lead', 'ליד חדש'),
      followup: t('Follow up', 'פולואפ'),
      sent: t('Offer sent', 'נשלחה הצעה'),
      closed: t('Closed', 'נסגר'),
      noanswer: t('No answer', 'אין מענה'),
      irrelevant: t('Not relevant', 'לא רלוונטי'),
      other: t('Other', 'אחר')
    };
    return map[key] || map.all;
  }

  function formatTotalLabel(count, kind) {
    var n = Number(count) || 0;
    kind = kind || pageKind();
    var isEn = typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage() === 'en';
    if (kind === 'leads') {
      var folderId = lockedFolderIdForPage('leads');
      return formatLeadCountOnly(n) + ' · ' + (isEn ? ('Folder ' + folderId) : ('תיקייה ' + folderId));
    }
    return isEn ? (n + ' customers') : (n + ' לקוחות');
  }

  function updateLeadsTopSummary(count) {
    if (!kindIsLeadsPage()) return;
    var n = Number(count);
    if (!isFinite(n)) n = 0;
    var label = formatTotalLabel(n, 'leads');
    var totalEl = document.getElementById('mb-total-label');
    if (totalEl) totalEl.textContent = label;
    var wrap = document.getElementById('mb-leads-list-summary');
    var line = document.getElementById('mb-leads-summary-line');
    if (wrap) wrap.style.display = 'block';
    if (line) line.textContent = label;
  }

  function setTotalLabel(count, kind) {
    kind = kind || pageKind();
    if (kind === 'leads') {
      updateLeadsTopSummary(count);
      return;
    }
    var totalEl = document.getElementById('mb-total-label');
    if (!totalEl) return;
    totalEl.textContent = formatTotalLabel(count, kind);
  }

  /** Resolve Biz1 folder id for this page (leads → New Leads, customers → Customers / Leads mode). */
  function lockedFolderIdForPage(kind) {
    kind = kind || pageKind();
    // Customers page can toggle Leads (folder 1) vs Renewals (folder 2)
    if (kind === 'customers') {
      var mode = (getCustFilters().listMode === 'leads') ? 'leads' : 'renewals';
      if (mode === 'leads') {
        try {
          if (window.MineralBarApp && MineralBarApp.FOLDERS && MineralBarApp.FOLDERS.LEADS != null) {
            return Number(MineralBarApp.FOLDERS.LEADS) || 1;
          }
        } catch (eL) { /* ignore */ }
        return 1;
      }
      try {
        if (window.MineralBarApp && MineralBarApp.FOLDERS && MineralBarApp.FOLDERS.CUSTOMERS != null) {
          return Number(MineralBarApp.FOLDERS.CUSTOMERS) || 2;
        }
      } catch (eC) { /* ignore */ }
      return 2;
    }

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
      // customers (fallback path)
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

  async function fetchStatusTypePages(client, type, folderId) {
    // One page is enough for chip/status label maps (was paging up to 12× per type).
    var params = {
      type: type,
      limit: 50,
      length: 50,
      start: 0
    };
    if (folderId != null && folderId !== '' && folderId !== '0') {
      params.folder_id = folderId;
    }
    var res = await client.request('Statuses.List', params);
    var rows = (res && (res.data || res.rows || res.output)) || [];
    if (Array.isArray(rows) && rows.length) ingestStatusRows(rows);
  }

  async function ensureStatusMaps() {
    if (statusMapsPromise) return statusMapsPromise;
    statusMapsPromise = (async function () {
      try {
        if (!window.MineralBarApp || typeof MineralBarApp.getClient !== 'function') return statusMapById;
        var client = MineralBarApp.getClient();
        if (!client || !client.request) return statusMapById;
        var folderId = lockedFolderIdForPage(pageKind());
        // Leads need internal folder statuses; customers also use customer_status.
        // Was 3 types × multi-page = many Statuses.List on every list open.
        var types = kindIsCustomersPage()
          ? ['internal_status', 'customer_status']
          : ['internal_status', 'status'];
        await Promise.all(types.map(function (type) {
          return fetchStatusTypePages(client, type, folderId).catch(function () { /* try others */ });
        }));
      } catch (e) {
        console.warn('[ListLive] Statuses.List failed', e);
      }
      return statusMapById;
    })();
    return statusMapsPromise;
  }

  function pickCity(row) {
    row = row || {};
    var ef = parseExtraFields(row);
    var city = stripHtmlText(
      row.city || row.city_name || row.town || row.address_city || row.region ||
      (ef && (ef.city || ef.city_name || ef.area)) || ''
    );
    if (city && city.toLowerCase() !== 'null' && city.toLowerCase() !== 'undefined') return city;
    return '';
  }

  function pickFullAddress(row) {
    row = row || {};
    var ef = parseExtraFields(row);
    var address = stripHtmlText(
      row.address || row.full_address || row.exact_address ||
      row.street || row.street_name || (ef && (ef.street || ef.address)) || ''
    );
    var building = stripHtmlText(row.building || row.house || row.house_number || (ef && (ef.building || ef.house)) || '');
    if (address && building && address.indexOf(building) === -1) address = [address, building].filter(Boolean).join(' ');
    var entrance = stripHtmlText(row.entrance || row.entry || row.knisa || (ef && ef.entrance) || '');
    var floor = stripHtmlText(row.floor || row.floor_number || row.koma || (ef && ef.floor) || '');
    var apt = stripHtmlText(row.apartment || row.apt || row.flat || row.dira || (ef && ef.apartment) || '');
    var local = stripHtmlText(row.local || row.locality || row.neighborhood || row.area || (ef && ef.area) || '');
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
        label: localizeCustomerStatus(named),
        color: (byNamed && byNamed.color) || String(row.status_color || row.color || '#1d60a2').trim() || '#1d60a2'
      };
    }

    // 2) If status is already a text label (not an id), show it as returned by the API
    if (rawStatus && !/^\d+$/.test(rawStatus)) {
      var byRaw = statusMapByName[rawStatus.toLowerCase()];
      return {
        label: localizeCustomerStatus(rawStatus),
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
          label: localizeCustomerStatus(statusMapById[sid].name),
          color: statusMapById[sid].color || '#1d60a2'
        };
      }
    }

    return { label: '', color: '#1d60a2' };
  }

  function parseExtraFields(row) {
    row = row || {};
    var ef = row.extra_fields_json;
    if (typeof ef === 'string') {
      try { ef = JSON.parse(ef); } catch (e0) { ef = null; }
    }
    if (!ef && row.extra_fields != null) {
      if (typeof row.extra_fields === 'string') {
        try { ef = JSON.parse(row.extra_fields); } catch (e) { ef = null; }
      } else if (typeof row.extra_fields === 'object') {
        ef = row.extra_fields;
      }
    }
    return (ef && typeof ef === 'object' && !Array.isArray(ef)) ? ef : {};
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

  var WARRANTY_END_FIELD = 'a-1786435543';
  var INSURANCE_END_FIELD = 'a-1786435853';
  var WEBSITE_SOURCE_FIELD = 'a-1785312269';
  var NEW_LEAD_STATUS_ID = '10085';
  var SALES_TEAM_ID = '26183';
  var WARRANTY_ENTRIES_TAB = 755;
  var INSURANCE_ENTRIES_TAB = 756;

  function padDay(n) {
    n = Number(n) || 0;
    return n < 10 ? '0' + n : String(n);
  }

  function extraFieldVal(ef, key) {
    if (!ef) return '';
    var v = ef[key];
    if (v && typeof v === 'object') v = v.value != null ? v.value : (v.val != null ? v.val : (v.date != null ? v.date : ''));
    return String(v == null ? '' : v).trim();
  }

  function dayKeyFromRaw(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s || s === 'null' || s === 'undefined' || s === '[]') return '';
    if (/^\d{10,13}$/.test(s)) {
      var ms = Number(s);
      if (s.length === 10) ms *= 1000;
      var dn = new Date(ms);
      if (!isNaN(dn.getTime())) return dn.getFullYear() + '-' + padDay(dn.getMonth() + 1) + '-' + padDay(dn.getDate());
    }
    var iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (iso) return iso[1] + '-' + padDay(+iso[2]) + '-' + padDay(+iso[3]);
    var dmy = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
    if (dmy) {
      var y = dmy[3].length === 2 ? ('20' + dmy[3]) : dmy[3];
      return y + '-' + padDay(+dmy[2]) + '-' + padDay(+dmy[1]);
    }
    var d = new Date(s);
    if (!isNaN(d.getTime())) return d.getFullYear() + '-' + padDay(d.getMonth() + 1) + '-' + padDay(d.getDate());
    return '';
  }

  function todayDayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + padDay(d.getMonth() + 1) + '-' + padDay(d.getDate());
  }

  function pickExpiryDayKey(row, ef) {
    ef = ef || parseExtraFields(row);
    var w = dayKeyFromRaw(extraFieldVal(ef, WARRANTY_END_FIELD));
    var i = dayKeyFromRaw(extraFieldVal(ef, INSURANCE_END_FIELD));
    if (w && i) return w <= i ? w : i;
    return w || i || '';
  }

  function hasExpiryDates(row, ef) {
    ef = ef || parseExtraFields(row);
    return !!(
      dayKeyFromRaw(extraFieldVal(ef, WARRANTY_END_FIELD)) ||
      dayKeyFromRaw(extraFieldVal(ef, INSURANCE_END_FIELD))
    );
  }

  function isWebsiteLead(row, ef) {
    ef = ef || parseExtraFields(row);
    var srcField = String(extraFieldVal(ef, WEBSITE_SOURCE_FIELD) || '').toLowerCase();
    if (/אתר|site|web/.test(srcField)) return true;
    var blob = String(
      (row && (row.source || row.affiliate || row.lead_source || row.channel)) || ''
    ).toLowerCase();
    return /אתר|site|web/.test(blob);
  }

  function isNewLeadStatus(row) {
    row = row || {};
    var cand = [
      row.internal_status_wise_client_new,
      row.internal_status_id,
      row.status_id,
      row.sub_list_data,
      row.c_status,
      row.status
    ];
    for (var i = 0; i < cand.length; i++) {
      if (String(cand[i] == null ? '' : cand[i]).trim() === NEW_LEAD_STATUS_ID) return true;
    }
    var label = String(
      row.sub_list_data_name || row.status_name || row.internal_status_name || row.status || ''
    ).toLowerCase();
    return /ליד חדש|new\s*lead|^new$/.test(label);
  }

  function isWarrantyEnded(row, ef) {
    ef = ef || parseExtraFields(row);
    var today = todayDayKey();
    var warKey = dayKeyFromRaw(extraFieldVal(ef, WARRANTY_END_FIELD));
    if (warKey && today >= warKey) return true;
    var insKey = dayKeyFromRaw(extraFieldVal(ef, INSURANCE_END_FIELD));
    if (insKey && today >= insKey) return true;
    return false;
  }

  function isWarrantyRunningOut(row, ef) {
    ef = ef || parseExtraFields(row);
    if (isWarrantyEnded(row, ef)) return false;
    var endKey = dayKeyFromRaw(
      extraFieldVal(ef, WARRANTY_END_FIELD) ||
      row.warranty_end || row.warranty_until || ef.warranty_end || ef.warranty_until
    );
    if (!endKey) return false;
    var today = todayDayKey();
    if (endKey < today) return false;
    var end = new Date(endKey + 'T00:00:00');
    if (isNaN(end.getTime())) return false;
    return (end.getTime() - Date.now()) / 86400000 <= 60;
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
    var isWarrantyEndedFlag = isWarrantyEnded(row, ef);
    var expiryKey = pickExpiryDayKey(row, ef);
    var hasExpiry = hasExpiryDates(row, ef);
    var websiteFlag = isWebsiteLead(row, ef);
    var newLeadFlag = isNewLeadStatus(row);
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
      isWarrantyEnded: isWarrantyEndedFlag,
      expiryKey: expiryKey,
      hasExpiry: hasExpiry,
      isWebsite: websiteFlag,
      isNewLead: newLeadFlag,
      followup: row.followup || '',
      source: stripHtmlText(row.source || row.affiliate || row.lead_source || row.channel || ''),
      ownerId: pickLeadOwnerId(row),
      statusKey: '',
      raw: row
    };
    out.statusKey = leadStatusKey(out.status, row);
    return out;
  }

  function pickLeadOwnerId(row) {
    row = row || {};
    var ef = parseExtraFields(row);
    var cand = [
      row.user_id, row.customer_manager, row.team_member_id, row.assign_member_id,
      row.assigned_user_id, row.manager_id, row.assigned_to,
      ef.user_id, ef.customer_manager, ef.team_member_id
    ];
    for (var i = 0; i < cand.length; i++) {
      var id = String(cand[i] == null ? '' : cand[i]).trim();
      if (id && id !== '0' && id !== 'null' && id !== 'undefined') return id;
    }
    return '';
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

  function defaultCustFilters() {
    return {
      chip: 'all',
      owner: 'all',
      listMode: 'renewals',
      expiryFrom: '',
      expiryTo: '',
      sort: 'name',
      sortDir: 'asc',
      matchMode: 'and'
    };
  }

  function getCustFilters() {
    if (!window.__mbCustFilters) window.__mbCustFilters = defaultCustFilters();
    return window.__mbCustFilters;
  }

  function setCustFilters(patch) {
    var cur = getCustFilters();
    window.__mbCustFilters = Object.assign({}, cur, patch || {});
    if (patch && patch.chip != null) {
      window.__mbCustListFilter = String(patch.chip || 'all');
    }
    try {
      window.dispatchEvent(new CustomEvent('mineralbar:cust-filters', { detail: window.__mbCustFilters }));
    } catch (e) { /* ignore */ }
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

  function localizeCustomerStatus(label) {
    var raw = stripHtmlText(label);
    if (!raw) return '';
    if (typeof window.getCurrentLanguage !== 'function' || window.getCurrentLanguage() !== 'en') return raw;
    var translations = {
      'שמור': 'Saved',
      'שמורה': 'Saved',
      'פולואפ': 'Follow up',
      'פולו אפ': 'Follow up',
      'ליד חדש': 'New lead',
      'הצעה נשלחה': 'Offer sent',
      'נשלחה הצעה': 'Offer sent',
      'חדש': 'New',
      'חדשה': 'New',
      'פתוח': 'Open',
      'פתוחה': 'Open',
      'סגור': 'Closed',
      'סגורה': 'Closed',
      'בטיפול': 'In progress',
      'ממתין': 'Waiting',
      'ממתינה': 'Waiting',
      'שולם': 'Paid',
      'שולמה': 'Paid',
      'לא שולם': 'Unpaid',
      'לא שולמה': 'Unpaid',
      'מבוטל': 'Cancelled',
      'מבוטלת': 'Cancelled',
      'לא רלוונטי': 'Not relevant'
    };
    return translations[raw] || raw;
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
    var city = String(c.city || '').trim();
    var address = String(c.address || '').trim();
    var place = city || address;
    var createdRaw = String((c.created || (c.raw && (c.raw.date_created || c.raw.created_at || c.raw.created))) || '').trim();
    var statusText = String(c.status || '').trim();
    if (!statusText && c.raw) {
      statusText = String(
        c.raw.sub_list_data_name || c.raw.status_name || c.raw.status ||
        c.raw.status_id || c.raw.sub_list_data || ''
      ).trim();
    }
    if (!statusText && c.statusKey && c.statusKey !== 'other') {
      statusText = leadStatusFilterLabel(c.statusKey);
    }
    var statusColor = String(c.statusColor || '#1d60a2').trim() || '#1d60a2';
    var statusBg = statusColor.charAt(0) === '#' ? (statusColor + '22') : '#eaf2fb';
    var meta = [];
    if (phone) meta.push(esc(phone));
    if (place) meta.push(esc(place));
    if (createdRaw) meta.push(esc(createdRaw));
    return (
      '<a href="' + detail + '" data-customer-id="' + esc(c.id) + '" data-status="' + esc(c.status) + '" data-status-key="' + esc(c.statusKey || leadStatusKey(c.status, c.raw)) + '" data-source-key="' + esc(leadSourceKey(c.source)) + '" data-owner-id="' + esc(c.ownerId || pickLeadOwnerId(c.raw)) + '" data-created="' + esc(c.created || '') + '" data-followup="' + esc(c.followup || '') + '" style="display:block;background:#fff;border-radius:16px;padding:14px 16px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-bottom:12px;text-decoration:none;">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">' +
      '<div style="font-size:17px;font-weight:800;color:#16223a;display:inline-flex;align-items:center;gap:5px;min-width:0;">' +
      '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(c.name) + '</span>' +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c2c9d2" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex:none;"><path d="m15 18-6-6 6-6"/></svg></div>' +
      (statusText
        ? '<span style="font-size:11.5px;font-weight:700;padding:4px 11px;border-radius:7px;background:' + esc(statusBg) + ';color:' + esc(statusColor) + ';flex:none;">' + esc(statusText) + '</span>'
        : '') +
      '</div>' +
      (meta.length
        ? '<div style="margin-top:9px;font-size:12.5px;font-weight:600;color:#5a6473;line-height:1.5;word-break:break-word;">' + meta.join(' · ') + '</div>'
        : '') +
      (email ? '<div style="margin-top:4px;font-size:12px;color:#9aa3b0;direction:ltr;text-align:start;">' + esc(email) + '</div>' : '') +
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
    var isWarrantyEnded = !!c.isWarrantyEnded;
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
    if (isWarrantyEnded) {
      badges += '<span style="font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:7px;background:#fbeeed;color:#a3302e;flex:none;">' + esc(t('Warranty ended', 'אחריות שהסתיימה')) + '</span>';
    } else if (isWarranty) {
      badges += '<span style="font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:7px;background:#fbeeed;color:#a3302e;flex:none;">' + esc(t('Warranty', 'אחריות')) + '</span>';
    }
    return (
      '<div class="mb-cust-card" data-customer-id="' + esc(c.id) + '" data-customer-name="' + esc(c.name) + '" data-phone="' + esc(phone) + '" data-status="' + esc(c.status || '') + '" data-vip="' + (isVip ? '1' : '0') + '" data-renew="' + (isRenew ? '1' : '0') + '" data-warranty="' + (isWarranty ? '1' : '0') + '" data-warranty-ended="' + (isWarrantyEnded ? '1' : '0') + '" data-owner-id="' + esc(c.ownerId || '') + '" data-created="' + esc(c.created || '') + '" data-expiry="' + esc(c.expiryKey || '') + '" data-has-expiry="' + (c.hasExpiry ? '1' : '0') + '" data-website="' + (c.isWebsite ? '1' : '0') + '" data-new-lead="' + (c.isNewLead ? '1' : '0') + '">' +
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

  async function enrichOneCustomerCard(/* card */) {
    // Intentionally no-op: address / status / phone come from Customer.List.
    // Customer.Get is only used when the user taps the product icon.
    return;
  }

  function enrichCustomerCards(/* listEl */) {
    // No bulk Customer.Get on list load.
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

    // Product icon only: Customer.Get (list page must not bulk-call this).
    if (typeof MineralBarApp.getCustomer === 'function') {
      try {
        var cres = await MineralBarApp.getCustomer(cid);
        var c = cres && (cres.customer || cres.data || cres);
        if (c && c.data && typeof c.data === 'object' && !Array.isArray(c.data)) c = c.data;
        var fromGet = normalizeProductRows(c);
        if (!fromGet.length && c) {
          fromGet = normalizeProductRows({
            products: c.products || c.product || c.purchased_products || c.customer_products
          });
        }
        if (!fromGet.length && c) {
          var preview = pickProductPreview(c);
          if (preview) {
            fromGet = preview.split(/\s*,\s*/).map(function (name) {
              name = String(name || '').trim();
              return name ? { name: name, qty: '', price: '', date: '', type: '', doc: '' } : null;
            }).filter(Boolean);
          }
        }
        if (fromGet.length) return fromGet;
      } catch (eGet) {
        console.warn('[ListLive] Customer.Get for products failed', eGet);
      }
    }

    // Fallback: purchased products on documents (only after product-icon tap)
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

  function listBindRoots(listEl) {
    var roots = [];
    var live = document.getElementById('mb-live-list');
    var extra = endedWarrantyMount();
    if (listEl) roots.push(listEl);
    if (live && roots.indexOf(live) === -1) roots.push(live);
    if (extra && roots.indexOf(extra) === -1) roots.push(extra);
    return roots;
  }

  function bindProductButtons(listEl) {
    listBindRoots(listEl).forEach(function (root) {
      var buttons = root.querySelectorAll('.mb-cust-products-btn');
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
    });
  }

  var _warrantyEndedCache = [];
  var LIST_PAGE_SIZE = 10;
  var _listPage = 1;

  function resetListPage() {
    _listPage = 1;
  }

  function scrollListToTop() {
    var list = document.getElementById('mb-live-list');
    var scroller = document.querySelector('.mb-cust-list-scroll');
    if (!scroller && list && list.parentElement) scroller = list.parentElement;
    if (scroller && typeof scroller.scrollTop === 'number') scroller.scrollTop = 0;
  }

  function ensureListPager() {
    var list = document.getElementById('mb-live-list');
    if (!list || !list.parentNode) return null;
    var pager = document.getElementById('mb-list-pager');
    if (pager) return pager;

    pager = document.createElement('div');
    pager.id = 'mb-list-pager';
    pager.className = 'mb-list-pager';
    pager.innerHTML =
      '<button type="button" class="mb-list-pager-btn" id="mb-list-pager-prev" aria-label="Previous">‹</button>' +
      '<div class="mb-list-pager-label" id="mb-list-pager-label"></div>' +
      '<button type="button" class="mb-list-pager-btn" id="mb-list-pager-next" aria-label="Next">›</button>';

    var ended = document.getElementById('mb-ended-warranty');
    if (ended && ended.parentNode === list.parentNode) {
      list.parentNode.insertBefore(pager, ended);
    } else if (list.nextSibling) {
      list.parentNode.insertBefore(pager, list.nextSibling);
    } else {
      list.parentNode.appendChild(pager);
    }

    var prev = document.getElementById('mb-list-pager-prev');
    var next = document.getElementById('mb-list-pager-next');
    if (prev) {
      prev.addEventListener('click', function () {
        if (_listPage <= 1) return;
        _listPage -= 1;
        applyClientFilters(document.getElementById('mb-live-list'));
        scrollListToTop();
      });
    }
    if (next) {
      next.addEventListener('click', function () {
        var label = document.getElementById('mb-list-pager-label');
        var maxHint = label && label.getAttribute('data-pages');
        var maxPages = Number(maxHint) || 1;
        if (_listPage >= maxPages) return;
        _listPage += 1;
        applyClientFilters(document.getElementById('mb-live-list'));
        scrollListToTop();
      });
    }
    return pager;
  }

  function updateListPager(matchCount) {
    var pager = ensureListPager();
    if (!pager) return;
    matchCount = Number(matchCount) || 0;
    var totalPages = Math.max(1, Math.ceil(matchCount / LIST_PAGE_SIZE) || 1);
    if (_listPage > totalPages) _listPage = totalPages;
    if (_listPage < 1) _listPage = 1;

    var start = matchCount ? ((_listPage - 1) * LIST_PAGE_SIZE) + 1 : 0;
    var end = Math.min(_listPage * LIST_PAGE_SIZE, matchCount);
    var label = document.getElementById('mb-list-pager-label');
    var prev = document.getElementById('mb-list-pager-prev');
    var next = document.getElementById('mb-list-pager-next');

    if (label) {
      label.setAttribute('data-pages', String(totalPages));
      label.textContent = matchCount
        ? (t('Showing ', 'מציג ') + start + '–' + end + t(' of ', ' מתוך ') + matchCount)
        : t('No results', 'אין תוצאות');
    }
    if (prev) prev.disabled = _listPage <= 1 || matchCount === 0;
    if (next) next.disabled = _listPage >= totalPages || matchCount === 0;
    pager.style.display = matchCount > 0 ? 'flex' : 'none';
  }

  function endedWarrantyMount() {
    return document.getElementById('mb-ended-warranty');
  }

  function renderEndedWarrantySection(rows) {
    var mount = endedWarrantyMount();
    if (!mount) return;
    rows = Array.isArray(rows) ? rows : [];
    _warrantyEndedCache = rows.slice();
    if (!rows.length) {
      mount.innerHTML = '';
      mount.style.display = 'none';
      return;
    }
    var n = rows.length;
    var cards = rows.map(function (row) {
      return customerCard(pick(row));
    }).join('');
    mount.style.display = 'block';
    mount.innerHTML =
      '<div style="margin:6px 0 4px; padding-top:14px; border-top:1px solid #e4e8ee;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 2px 12px;">' +
      '<div style="font-size:16px;font-weight:800;color:#16223a;">' + esc(t('Warranty ended', 'אחריות שהסתיימה')) + '</div>' +
      '<div data-ended-warranty-count style="font-size:12px;font-weight:700;color:#9aa3b0;">' +
      n + ' ' + esc(t(n === 1 ? 'customer' : 'customers', n === 1 ? 'לקוח' : 'לקוחות')) +
      '</div></div>' +
      cards +
      '</div>';
    bindProductButtons(mount);
    bindVipButtons(mount);
  }

  async function loadEndedWarrantyCustomers() {
    if (!kindIsLeadsPage() || !endedWarrantyMount()) return;
    try {
      var folderId = (window.MineralBarApp && MineralBarApp.FOLDERS && MineralBarApp.FOLDERS.CUSTOMERS) || 2;
      var res = await MineralBarApp.listCustomers({
        folder_id: folderId,
        length: 100,
        start: 0,
        draw: 1
      });
      var rows = (res && (res.rows || res.data || res.items || res.records)) || [];
      if (!Array.isArray(rows)) rows = [];
      renderEndedWarrantySection(rows.filter(function (row) {
        return isWarrantyEnded(row);
      }));
      applyEndedWarrantySearch();
    } catch (err) {
      console.warn('[ListLive] ended-warranty Customer.List failed', err);
    }
  }

  function applyEndedWarrantySearch() {
    var mount = endedWarrantyMount();
    if (!mount || mount.style.display === 'none') return;
    var input = document.querySelector('.ds-input') || document.getElementById('mb-customer-search');
    var query = input ? String(input.value || '').toLowerCase().trim() : '';
    var items = mount.querySelectorAll('.mb-cust-card[data-customer-id]');
    var visible = 0;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item.dataset.originalDisplay) item.dataset.originalDisplay = item.style.display || 'flex';
      var show = !query || item.textContent.toLowerCase().indexOf(query) > -1;
      item.style.display = show ? item.dataset.originalDisplay : 'none';
      if (show) visible++;
    }
    var countEl = mount.querySelector('[data-ended-warranty-count]');
    if (countEl) {
      countEl.textContent = visible + ' ' + t(visible === 1 ? 'customer' : 'customers', visible === 1 ? 'לקוח' : 'לקוחות');
    }
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

  var _listInFlight = null;
  var _listLoadGen = 0;
  var _listBooted = false;
  var _listBootAt = 0;
  var _rowsCache = null;
  var _rowsCacheKind = '';
  var _rowsCacheTotal = 0;
  var CUSTOMER_LIST_PAGE_SIZE = 25;
  var CUSTOMER_LIST_MAX_PAGES = 40;

  function extractCustomerListRows(listRes) {
    var rows = (listRes && (listRes.rows || listRes.data || listRes.items || listRes.records)) || [];
    return Array.isArray(rows) ? rows : [];
  }

  function extractCustomerListTotal(listRes, rows) {
    if (!listRes) return (rows && rows.length) || 0;
    var total = listRes.total != null ? listRes.total
      : listRes.recordsFiltered != null ? listRes.recordsFiltered
      : listRes.recordsTotal != null ? listRes.recordsTotal
      : listRes.count != null ? listRes.count
      : (rows && rows.length) || 0;
    return Number(total) || (rows && rows.length) || 0;
  }

  function customerRowId(row, fallback) {
    row = row || {};
    var id = row.customer_id || row.contactus_id || row.id || row.ID || '';
    return id ? String(id) : String(fallback || '');
  }

  /** Customer.List caps length at 25 — page until a short/empty page. */
  async function listAllCustomerPages(baseParams) {
    var all = [];
    var seen = {};
    var start = 0;
    var reportedTotal = null;
    var pageSize = CUSTOMER_LIST_PAGE_SIZE;

    for (var page = 0; page < CUSTOMER_LIST_MAX_PAGES; page++) {
      var params = Object.assign({}, baseParams || {}, {
        length: pageSize,
        limit: pageSize,
        per_page: pageSize,
        start: start,
        draw: page + 1
      });
      var listRes = await MineralBarApp.listCustomers(params);
      var rows = extractCustomerListRows(listRes);
      var pageTotal = extractCustomerListTotal(listRes, rows);
      if (reportedTotal == null || pageTotal > reportedTotal) reportedTotal = pageTotal;

      var added = 0;
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i] || {};
        var id = customerRowId(row, start + '-' + i);
        if (seen[id]) continue;
        seen[id] = true;
        all.push(row);
        added++;
      }

      // Full page ⇒ more may exist (don't trust recordsTotal alone — it can match page size).
      if (!rows.length || rows.length < pageSize || added === 0) break;
      start += pageSize;
    }

    return {
      rows: all,
      total: Math.max(reportedTotal != null ? reportedTotal : 0, all.length)
    };
  }

  async function listCustomersNewOrWebsite(folderVal, baseParams) {
    var base = Object.assign({}, baseParams || {}, { folder_id: folderVal || 1 });
    delete base.internal_status_wise_client_new;
    delete base['extra_fields[' + WEBSITE_SOURCE_FIELD + ']'];

    var newParams = Object.assign({}, base, {
      internal_status_wise_client_new: NEW_LEAD_STATUS_ID
    });
    var siteParams = Object.assign({}, base);
    siteParams['extra_fields[' + WEBSITE_SOURCE_FIELD + ']'] = 'אתר';

    var results = await Promise.all([
      listAllCustomerPages(newParams).catch(function () { return { rows: [], total: 0 }; }),
      listAllCustomerPages(siteParams).catch(function () { return { rows: [], total: 0 }; })
    ]);
    var seen = {};
    var merged = [];
    function addRows(rows) {
      (rows || []).forEach(function (row) {
        var id = customerRowId(row);
        if (!id || seen[id]) return;
        seen[id] = true;
        merged.push(row);
      });
    }
    addRows(results[0] && results[0].rows);
    addRows(results[1] && results[1].rows);

    // If website API filter returned nothing, fall back to new-lead pages + client website flag
    if (!(results[1] && results[1].rows && results[1].rows.length)) {
      var fallback = await listAllCustomerPages(base).catch(function () { return { rows: [], total: 0 }; });
      (fallback.rows || []).forEach(function (row) {
        if (!isWebsiteLead(row) && !isNewLeadStatus(row)) return;
        var id = customerRowId(row);
        if (!id || seen[id]) return;
        seen[id] = true;
        merged.push(row);
      });
    }

    return { rows: merged, total: merged.length };
  }

  function entryCell(row, key) {
    if (!row) return '';
    var v = row[key];
    if (v && typeof v === 'object') {
      v = v.value != null ? v.value : (v.val != null ? v.val : (v.date != null ? v.date : ''));
    }
    return String(v == null ? '' : v).trim();
  }

  function extractEntryRows(res) {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.rows)) return res.rows;
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.rows)) return res.data.rows;
    if (Array.isArray(res.output)) return res.output;
    if (Array.isArray(res.list)) return res.list;
    if (Array.isArray(res.entries)) return res.entries;
    return [];
  }

  async function listEndedEntryCustomerIds(tabId, dateField) {
    var ids = {};
    if (!window.MineralBarApp || typeof MineralBarApp.getClient !== 'function') return ids;
    var client = MineralBarApp.getClient();
    if (!client || !client.request) return ids;
    var pageSize = 50;
    var maxPages = 20;
    var today = todayDayKey();
    for (var page = 0; page < maxPages; page++) {
      var res;
      try {
        res = await client.request('Entries.List', {
          tab_id: tabId,
          entry_id: tabId,
          length: pageSize,
          limit: pageSize,
          start: page * pageSize,
          draw: page + 1
        });
      } catch (e) {
        // Bulk list may require customer_id — skip enrichment quietly
        console.warn('[ListLive] Entries.List tab ' + tabId + ' bulk skipped', e);
        return ids;
      }
      if (res && String(res.success) === '0') return ids;
      var rows = extractEntryRows(res);
      if (!rows.length) break;
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i] || {};
        var endKey = dayKeyFromRaw(entryCell(row, dateField));
        if (!endKey || today < endKey) continue;
        var cid = String(
          row.customer_id || row.cust_id || row.contactus_id || row.customer || ''
        ).trim();
        if (cid) ids[cid] = true;
      }
      if (rows.length < pageSize) break;
    }
    return ids;
  }

  async function enrichWarrantyEndedFromEntries(listEl) {
    listEl = document.getElementById('mb-live-list') || listEl;
    if (!listEl || !kindIsCustomersPage()) return;
    try {
      var results = await Promise.all([
        listEndedEntryCustomerIds(WARRANTY_ENTRIES_TAB, 'data8'),
        listEndedEntryCustomerIds(INSURANCE_ENTRIES_TAB, 'data3')
      ]);
      var ended = Object.assign({}, results[0] || {}, results[1] || {});
      var keys = Object.keys(ended);
      if (!keys.length) return;
      keys.forEach(function (cid) {
        var card = listEl.querySelector('.mb-cust-card[data-customer-id="' + cssAttrEscape(cid) + '"]');
        if (!card) return;
        card.setAttribute('data-warranty-ended', '1');
      });
      applyClientFilters(listEl);
    } catch (err) {
      console.warn('[ListLive] warranty entries enrichment failed', err);
    }
  }

  async function loadList(mount, explicitFolderId, opts) {
    opts = opts || {};
    // Coalesce duplicates — never queue a second Customer.List behind the first.
    // force: filter apply / mode toggle must start a fresh fetch even if one is in flight.
    if (_listInFlight && !opts.force) return _listInFlight;

    var gen = ++_listLoadGen;
    _listInFlight = (async function () {
      try {
        await loadListBody(mount, explicitFolderId, opts);
      } finally {
        if (_listLoadGen === gen) _listInFlight = null;
      }
    })();
    return _listInFlight;
  }

  function paintCachedRows(el, kind) {
    if (!el || !_rowsCache || !_rowsCache.length) return false;
    kind = kind || _rowsCacheKind || 'leads';
    var rows = kind === 'customers' ? sortRowsByCustomerName(_rowsCache) : _rowsCache;
    if (kind === 'customers') _rowsCache = rows;
    var totalEl = document.getElementById('mb-total-label');
    if (totalEl) setTotalLabel(_rowsCacheTotal || rows.length, kind);
    el.innerHTML = rows.map(function (row) {
      var c = pick(row);
      return kind === 'leads' ? leadCard(c) : customerCard(c);
    }).join('');
    applyClientFilters(el);
    bindClientFilters(el);
    bindProductButtons(el);
    bindVipButtons(el);
    syncChipActiveStyles(getActiveFolderId());
    syncCustModeToggle();
    el.setAttribute('data-initial-loaded', '1');
    if (kind === 'leads') {
      if (_warrantyEndedCache.length) renderEndedWarrantySection(_warrantyEndedCache);
      loadEndedWarrantyCustomers();
    }
    return true;
  }

  async function loadListBody(mount, explicitFolderId, opts) {
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

    var queryParams = { draw: 1 };
    // Always lock to page folder: leads → New Leads, customers → Customers / Leads mode
    var folderVal = lockedFolderIdForPage(kind);
    queryParams.folder_id = folderVal;
    var custFilters = kind === 'customers' ? getCustFilters() : null;
    if (kind === 'customers' && custFilters) {
      if (custFilters.sort === 'created') {
        queryParams.order_by = 'date_created';
        queryParams.order_dir = custFilters.sortDir === 'desc' ? 'desc' : 'asc';
      } else {
        queryParams.order_by = 'name';
        queryParams.order_dir = 'asc';
        queryParams.sort = 'name';
      }
      if (custFilters.owner && custFilters.owner !== 'all') {
        queryParams.team_member_id = custFilters.owner;
        queryParams.get_shared_with_wise_client = custFilters.owner;
      }
      if (custFilters.matchMode === 'and' && custFilters.chip === 'new-lead') {
        queryParams.internal_status_wise_client_new = NEW_LEAD_STATUS_ID;
      }
      if (custFilters.matchMode === 'and' && custFilters.chip === 'website') {
        queryParams['extra_fields[' + WEBSITE_SOURCE_FIELD + ']'] = 'אתר';
      }
    } else if (kind === 'customers') {
      queryParams.order_by = 'name';
      queryParams.order_dir = 'asc';
      queryParams.sort = 'name';
    }
    setActiveFolderId(folderVal);

    var lastErr = null;
    // SDK already retries transient failures — avoid stacking another 3× page loop.
    try {
      await ensureStatusMaps();
      var listRes;
      var useDualOr = kind === 'customers' && custFilters &&
        custFilters.listMode === 'leads' &&
        custFilters.matchMode === 'or' &&
        (custFilters.chip === 'new-or-website' || custFilters.chip === 'new-lead' || custFilters.chip === 'website');

      if (useDualOr && custFilters.chip === 'new-or-website') {
        listRes = await listCustomersNewOrWebsite(folderVal, queryParams);
      } else {
        listRes = await listAllCustomerPages(queryParams);
      }
      if (mount._activeLoadId !== loadId) return;

      el = document.getElementById('mb-live-list') || el;
      totalEl = document.getElementById('mb-total-label');

      var rows = listRes.rows || [];
      var total = listRes.total != null ? listRes.total : rows.length;

      if (totalEl) {
        setTotalLabel(total, kind);
      }

      if (!rows.length) {
        _rowsCache = [];
        _rowsCacheKind = kind;
        _rowsCacheTotal = total;
        resetListPage();
        el.innerHTML = emptyHtml(kind);
        updateListPager(0);
        if (kind === 'leads') loadEndedWarrantyCustomers();
        return;
      }

      if (kind === 'customers' && (!custFilters || custFilters.sort === 'name')) {
        rows = sortRowsByCustomerName(rows);
      }
      _rowsCache = rows.slice();
      _rowsCacheKind = kind;
      _rowsCacheTotal = total;
      resetListPage();
      // Re-query mount — DC may have replaced #mb-live-list while Statuses/List were in flight
      el = document.getElementById('mb-live-list') || el;
      el.setAttribute('data-initial-loaded', '1');

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
      syncCustModeToggle();
      // Address / status / phone from Customer.List only — no Customer.Get on load.
      syncChipActiveStyles(getActiveFolderId(mount));
      if (kind === 'leads') loadEndedWarrantyCustomers();
      if (kind === 'customers') enrichWarrantyEndedFromEntries(el);
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
      _listBooted = false;
      loadList(mount, explicitFolderId);
    });
  }

  function getActiveCustFilter() {
    var f = getCustFilters();
    return String(f.chip || window.__mbCustListFilter || 'all');
  }

  function setActiveCustFilter(id) {
    var chip = String(id || 'all');
    window.__mbCustListFilter = chip;
    setCustFilters({ chip: chip });
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

    if (filters.owner && filters.owner !== 'all') {
      var ownerId = String(item.getAttribute('data-owner-id') || '').trim();
      if (filters.owner === 'unassigned') {
        if (ownerId) return false;
      } else if (ownerId !== String(filters.owner)) {
        return false;
      }
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

  function compareCustomerNames(a, b) {
    var an = String(a == null ? '' : a).trim();
    var bn = String(b == null ? '' : b).trim();
    return an.localeCompare(bn, undefined, { sensitivity: 'base', numeric: true });
  }

  function sortRowsByCustomerName(rows) {
    if (!Array.isArray(rows) || rows.length < 2) return rows || [];
    return rows.slice().sort(function (ra, rb) {
      var a = ra || {};
      var b = rb || {};
      var an = a.name || a.customer_name || a.full_name || a.cname || a.title || '';
      var bn = b.name || b.customer_name || b.full_name || b.cname || b.title || '';
      return compareCustomerNames(an, bn);
    });
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

  function customerMatchesAdvancedFilters(item, filters) {
    filters = filters || getCustFilters();
    var chip = String(filters.chip || 'all');
    var matchMode = String(filters.matchMode || 'and') === 'or' ? 'or' : 'and';
    var isRenewals = filters.listMode === 'renewals';

    // Renewals mode: only rows with warranty/insurance end dates
    if (isRenewals && item.getAttribute('data-has-expiry') !== '1') {
      return false;
    }

    var chipOk = true;
    if (chip && chip !== 'all') {
      if (chip === 'renew') chipOk = item.getAttribute('data-renew') === '1';
      else if (chip === 'warranty' || chip === 'warranty-ended') chipOk = item.getAttribute('data-warranty-ended') === '1';
      else if (chip === 'vip') chipOk = item.getAttribute('data-vip') === '1';
      else if (chip === 'new-lead') chipOk = item.getAttribute('data-new-lead') === '1';
      else if (chip === 'website') chipOk = item.getAttribute('data-website') === '1';
      else if (chip === 'new-or-website') {
        chipOk = item.getAttribute('data-new-lead') === '1' || item.getAttribute('data-website') === '1';
      }
    }

    // Owner is applied on Customer.List (team_member_id / get_shared_with_wise_client).
    // Do not re-filter by data-owner-id — shared customers would disappear (API returns them,
    // but card owner id is the manager, not the shared member).
    var ownerOk = true;

    // Expiry range is renewals-only (Leads mode must not hide rows for leftover dates)
    var expiryOk = true;
    if (isRenewals && (filters.expiryFrom || filters.expiryTo)) {
      var expiry = String(item.getAttribute('data-expiry') || '').trim();
      if (filters.expiryFrom) {
        expiryOk = expiryOk && !!expiry && expiry >= String(filters.expiryFrom);
      }
      if (filters.expiryTo) {
        expiryOk = expiryOk && !!expiry && expiry <= String(filters.expiryTo);
      }
    }

    var dims = [];
    if (chip && chip !== 'all') dims.push(chipOk);
    if (isRenewals && (filters.expiryFrom || filters.expiryTo)) dims.push(expiryOk);

    if (!dims.length) return true;
    if (matchMode === 'or') {
      for (var i = 0; i < dims.length; i++) if (dims[i]) return true;
      return false;
    }
    for (var j = 0; j < dims.length; j++) if (!dims[j]) return false;
    return true;
  }

  function sortCustomerItems(listEl, filters, matching) {
    filters = filters || getCustFilters();
    var sort = String(filters.sort || 'name');
    var dir = String(filters.sortDir || 'asc') === 'desc' ? 'desc' : 'asc';
    var items = matching || Array.prototype.slice.call(listEl.querySelectorAll('.mb-cust-card[data-customer-id]'));
    if (items.length < 2) return items;

    items.sort(function (a, b) {
      var av;
      var bv;
      if (sort === 'created') {
        av = parseListDate(a.getAttribute('data-created'));
        bv = parseListDate(b.getAttribute('data-created'));
        if (isNaN(av)) av = 0;
        if (isNaN(bv)) bv = 0;
        return dir === 'desc' ? (bv - av) : (av - bv);
      }
      if (sort === 'expiry') {
        av = String(a.getAttribute('data-expiry') || '');
        bv = String(b.getAttribute('data-expiry') || '');
        // Empty last; nearest-first = ascending dates
        if (!av && !bv) return 0;
        if (!av) return 1;
        if (!bv) return -1;
        if (av === bv) return 0;
        var cmp = av < bv ? -1 : 1;
        return dir === 'desc' ? -cmp : cmp;
      }
      return compareCustomerNames(
        a.getAttribute('data-customer-name') || a.getAttribute('data-customer-id'),
        b.getAttribute('data-customer-name') || b.getAttribute('data-customer-id')
      ) * (dir === 'desc' ? -1 : 1);
    });

    items.forEach(function (node) { listEl.appendChild(node); });
    return items;
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
    var custFilters = kindVis === 'customers' ? getCustFilters() : null;

    // Only top-level list rows — nested product-line / action nodes also carry data-customer-id.
    var items = kindVis === 'customers'
      ? listEl.querySelectorAll('.mb-cust-card[data-customer-id]')
      : listEl.querySelectorAll('a[data-customer-id]');
    var matching = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item.getAttribute('data-mb-list-bound')) {
        item.setAttribute('data-mb-list-bound', '1');
        // Customers: leave blank so CSS (.mb-cust-card { display:flex }) applies when shown.
        item.dataset.originalDisplay = item.style.display || (kindVis === 'leads' ? 'block' : '');
      }

      var text = item.textContent.toLowerCase();
      var matchesQuery = query === '' || text.indexOf(query) > -1;
      var matchesFilter = true;
      if (kindVis === 'customers') {
        matchesFilter = customerMatchesAdvancedFilters(item, custFilters);
      } else if (kindVis === 'leads') {
        matchesFilter = leadMatchesAdvancedFilters(item, getLeadFilters());
      }

      if (matchesQuery && matchesFilter) matching.push(item);
      else item.style.display = 'none';
    }

    var totalPages = Math.max(1, Math.ceil(matching.length / LIST_PAGE_SIZE) || 1);
    if (_listPage > totalPages) _listPage = totalPages;
    if (_listPage < 1) _listPage = 1;
    var pageStart = (_listPage - 1) * LIST_PAGE_SIZE;
    var pageEnd = pageStart + LIST_PAGE_SIZE;

    function showListRow(node, on) {
      if (on) {
        if (node.dataset.originalDisplay) node.style.display = node.dataset.originalDisplay;
        else node.style.removeProperty('display');
      } else {
        node.style.display = 'none';
      }
    }

    for (var j = 0; j < matching.length; j++) {
      showListRow(matching[j], j >= pageStart && j < pageEnd);
    }

    var totalEl = document.getElementById('mb-total-label');
    if (totalEl) {
      setTotalLabel(matching.length, kindVis);
    }

    updateListPager(matching.length);

    if (kindVis === 'customers') {
      matching = sortCustomerItems(listEl, custFilters, matching);
      for (var cj = 0; cj < matching.length; cj++) {
        showListRow(matching[cj], cj >= pageStart && cj < pageEnd);
      }
    } else if (kindVis === 'leads') {
      sortLeadItems(listEl, getLeadFilters());
      // Re-apply page visibility after sort (sort moves DOM nodes)
      var rematched = [];
      var allItems = listEl.querySelectorAll('a[data-customer-id]');
      for (var k = 0; k < allItems.length; k++) {
        var node = allItems[k];
        var tText = node.textContent.toLowerCase();
        var qOk = query === '' || tText.indexOf(query) > -1;
        var fOk = leadMatchesAdvancedFilters(node, getLeadFilters());
        if (qOk && fOk) rematched.push(node);
        else node.style.display = 'none';
      }
      for (var m = 0; m < rematched.length; m++) {
        showListRow(rematched[m], m >= pageStart && m < pageEnd);
      }
      updateLeadsTopSummary(rematched.length);
      applyEndedWarrantySearch();
    }
  }

  function renderLeadFilterChips(container) {
    if (!container) return;
    var active = getActiveLeadFilter();
    var chips = [
      { id: 'all', label: t('everything', 'הכל'), color: '#1d60a2', bg: '#eaf2fb', border: '#6ea6d8' },
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
        resetListPage();
        applyClientFilters(document.getElementById('mb-live-list'));
      });
    });

    try {
      window.dispatchEvent(new CustomEvent('mineralbar:lead-chips-ready'));
    } catch (e) { /* ignore */ }
  }

  function enableCustChipDragScroll(slider) {
    if (!slider || slider.dataset.dragScrollWired === '1') return;
    slider.dataset.dragScrollWired = '1';
    slider.classList.add('mb-h-drag', 'mb-cust-filter-hbar');

    // Drag-to-scroll only after real movement — taps must still select chips.
    // Do NOT setPointerCapture on pointerdown (it steals click from buttons).
    var tracking = false;
    var dragging = false;
    var startX = 0;
    var startLeft = 0;
    var pointerId = null;
    var DRAG_THRESHOLD = 10;

    function endDrag(e) {
      if (!tracking) return;
      if (e && pointerId != null && e.pointerId != null && e.pointerId !== pointerId) return;
      var wasDrag = dragging;
      tracking = false;
      dragging = false;
      slider.classList.remove('is-dragging');
      if (wasDrag && pointerId != null && slider.releasePointerCapture) {
        try { slider.releasePointerCapture(pointerId); } catch (err) { /* ignore */ }
      }
      pointerId = null;
      if (wasDrag) {
        var block = function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          slider.removeEventListener('click', block, true);
        };
        slider.addEventListener('click', block, true);
        setTimeout(function () { slider.removeEventListener('click', block, true); }, 80);
      }
    }

    if (window.PointerEvent) {
      slider.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        tracking = true;
        dragging = false;
        startX = e.clientX;
        startLeft = slider.scrollLeft;
        pointerId = e.pointerId;
      });
      slider.addEventListener('pointermove', function (e) {
        if (!tracking || e.pointerId !== pointerId) return;
        var delta = e.clientX - startX;
        if (!dragging && Math.abs(delta) > DRAG_THRESHOLD) {
          dragging = true;
          slider.classList.add('is-dragging');
          try { slider.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        }
        if (dragging) {
          slider.scrollLeft = startLeft - delta;
          if (e.cancelable) e.preventDefault();
        }
      });
      slider.addEventListener('pointerup', endDrag);
      slider.addEventListener('pointercancel', endDrag);
    } else {
      slider.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        tracking = true;
        dragging = false;
        startX = e.clientX;
        startLeft = slider.scrollLeft;
      });
      window.addEventListener('mousemove', function (e) {
        if (!tracking) return;
        var delta = e.clientX - startX;
        if (!dragging && Math.abs(delta) > DRAG_THRESHOLD) {
          dragging = true;
          slider.classList.add('is-dragging');
        }
        if (dragging) slider.scrollLeft = startLeft - delta;
      });
      window.addEventListener('mouseup', endDrag);
    }
  }

  function renderCustFilterChips(container) {
    if (!container) return;
    var active = getActiveCustFilter();
    var chips = [
      { id: 'all', label: t('All', 'הכל'), color: '#1d60a2', bg: '#eaf2fb', border: '#6ea6d8' },
      { id: 'renew', label: t('To renew', 'לחידוש'), color: '#50439d', bg: '#f0eefb', border: '#a89fd4' },
      { id: 'warranty-ended', label: t('Warranty ended', 'אחריות שהסתיימה'), color: '#a3302e', bg: '#fbeeed', border: '#e8a9a4' },
      { id: 'vip', label: t('VIP', 'VIP'), color: '#8a6540', bg: '#f6eee4', border: '#c9a882' },
      { id: 'new-lead', label: t('New lead', 'ליד חדש'), color: '#1d60a2', bg: '#eaf2fb', border: '#aecbe9' },
      { id: 'website', label: t('Website', 'אתר'), color: '#0f766e', bg: '#e6f7f4', border: '#8fd0c6' },
      { id: 'new-or-website', label: t('New / Website', 'חדש / אתר'), color: '#50439d', bg: '#f0eefb', border: '#a89fd4' }
    ];
    container.classList.add('mb-h-drag', 'mb-cust-filter-hbar');
    container.style.display = 'flex';
    container.style.flexWrap = 'nowrap';
    container.style.overflowX = 'auto';
    container.style.overflowY = 'hidden';
    container.style.minWidth = '0';
    container.style.maxWidth = '100%';
    container.style.width = '100%';
    container.style.webkitOverflowScrolling = 'touch';
    container.style.touchAction = 'pan-x';
    container.innerHTML = chips.map(function (chip) {
      var on = active === chip.id;
      return (
        '<button type="button" class="mb-cust-chip" data-chip-id="' + esc(chip.id) + '" data-active="' + (on ? '1' : '0') + '" style="flex:0 0 auto;padding:7px 12px;border-radius:99px;border:1.5px solid ' +
        (on ? chip.border : '#e2e8f0') + ';background:' + (on ? chip.bg : '#f8fafc') + ';color:' + (on ? chip.color : '#475569') +
        ';font-size:12.5px;font-weight:' + (on ? '800' : '700') + ';cursor:pointer;white-space:nowrap;pointer-events:auto;">' +
        esc(chip.label) +
        '</button>'
      );
    }).join('');

    enableCustChipDragScroll(container);

    container.querySelectorAll('.mb-cust-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var chipId = btn.getAttribute('data-chip-id') || 'all';
        setActiveCustFilter(chipId);
        var patch = { chip: chipId };
        if (chipId === 'new-or-website') patch.matchMode = 'or';
        setCustFilters(patch);
        renderCustFilterChips(container);
        resetListPage();
        if (chipId === 'new-or-website' || chipId === 'new-lead' || chipId === 'website') {
          reloadCustList();
        } else {
          applyClientFilters(document.getElementById('mb-live-list'));
        }
      });
    });
  }

  function memberTeamBlob(m) {
    m = m || {};
    var teamObj = m.team && typeof m.team === 'object' ? m.team : null;
    var parts = [
      m.team_id, m.teamId, m.department_id, m.group_id,
      m.team_name, m.teamName, m.department, m.role, m.group_name, m.group,
      teamObj && (teamObj.id || teamObj.team_id),
      teamObj && (teamObj.name || teamObj.title || teamObj.label)
    ];
    if (Array.isArray(m.teams)) {
      m.teams.forEach(function (tm) {
        if (!tm) return;
        if (typeof tm === 'object') {
          parts.push(tm.id, tm.team_id, tm.name, tm.title);
        } else {
          parts.push(tm);
        }
      });
    }
    return parts.map(function (x) { return String(x == null ? '' : x).toLowerCase(); }).join(' ');
  }

  function isSalesTeamMember(m) {
    m = m || {};
    var blob = memberTeamBlob(m);
    var teamId = String(
      m.team_id || m.teamId || (m.team && (m.team.id || m.team.team_id)) || ''
    ).trim();
    if (teamId === SALES_TEAM_ID || blob.indexOf(SALES_TEAM_ID) !== -1) return true;
    if (/tech|service|collection|טכנ|שירות|גביה|גבייה/.test(blob) && !/sales|מכיר/.test(blob)) {
      return false;
    }
    return /sales|מכיר/.test(blob);
  }

  function salesOwnerOptions() {
    var team = [];
    try {
      if (window.MineralBarApp && typeof MineralBarApp.getTeamMembers === 'function') {
        team = MineralBarApp.getTeamMembers() || [];
      }
    } catch (e0) { team = []; }
    if (!team.length) {
      try {
        var basic = window.MineralBarApp && MineralBarApp.getUserBasic && MineralBarApp.getUserBasic();
        team = (basic && basic.data && basic.data.team_members) || [];
      } catch (e1) { team = []; }
    }
    var sales = [];
    var fallback = [];
    var seen = {};
    (team || []).forEach(function (m) {
      if (!m) return;
      var id = String(m.id || m.user_id || m.member_id || m.team_member_id || '').trim();
      if (!id || seen[id]) return;
      seen[id] = true;
      // Keep members even when username is empty
      var label = String(m.name || m.full_name || m.user_name || m.username || m.email || ('#' + id)).trim();
      var item = { id: id, label: label || ('#' + id) };
      var blob = memberTeamBlob(m);
      if (/tech|service|collection|טכנ|שירות|גביה|גבייה/.test(blob) && !/sales|מכיר/.test(blob)) {
        return;
      }
      fallback.push(item);
      if (isSalesTeamMember(m)) sales.push(item);
    });
    return sales.length ? sales : fallback;
  }

  function syncCustModeToggle() {
    if (!kindIsCustomersPage()) return;
    var mode = getCustFilters().listMode === 'leads' ? 'leads' : 'renewals';
    var leadsBtn = document.getElementById('mb-cust-mode-leads');
    var renewBtn = document.getElementById('mb-cust-mode-renewals');
    function styleBtn(btn, on, label) {
      if (!btn) return;
      btn.setAttribute('data-active', on ? '1' : '0');
      btn.style.background = on ? '#1d60a2' : '#f1f5f9';
      btn.style.color = on ? '#fff' : '#475569';
      btn.style.fontWeight = on ? '800' : '700';
      btn.style.borderColor = on ? '#1d60a2' : '#e2e8f0';
      if (label) btn.textContent = label;
    }
    styleBtn(leadsBtn, mode === 'leads', t('Leads', 'לידים'));
    styleBtn(renewBtn, mode === 'renewals', t('Renewals', 'חידושים'));
    var expiryBlock = document.getElementById('mb-cust-sheet-expiry');
    if (expiryBlock) expiryBlock.style.display = mode === 'renewals' ? 'block' : 'none';
  }

  function bindCustModeToggle() {
    if (!kindIsCustomersPage()) return;
    var leadsBtn = document.getElementById('mb-cust-mode-leads');
    var renewBtn = document.getElementById('mb-cust-mode-renewals');
    if (leadsBtn && !leadsBtn.dataset.wired) {
      leadsBtn.dataset.wired = '1';
      leadsBtn.addEventListener('click', function () {
        // Drop renewals-only expiry constraints when switching to Leads
        setCustFilters({ listMode: 'leads', expiryFrom: '', expiryTo: '' });
        syncCustModeToggle();
        reloadCustList();
      });
    }
    if (renewBtn && !renewBtn.dataset.wired) {
      renewBtn.dataset.wired = '1';
      renewBtn.addEventListener('click', function () {
        setCustFilters({ listMode: 'renewals' });
        syncCustModeToggle();
        reloadCustList();
      });
    }
    var filterBtn = document.getElementById('mb-cust-filter-btn');
    if (filterBtn && !filterBtn.dataset.wired) {
      filterBtn.dataset.wired = '1';
      filterBtn.addEventListener('click', function () {
        openCustFilters();
      });
    }
    syncCustModeToggle();
  }

  function chipStyle(on) {
    return on
      ? 'background:#eaf2fb;color:#1d60a2;border:1.4px solid #6ea6d8;font-weight:800;'
      : 'background:#f8fafc;color:#475569;border:1.4px solid #e2e8f0;font-weight:700;';
  }

  function phoneScreenEl() {
    return document.getElementById('mb-phone-screen') ||
      document.querySelector('[style*="height:812px"][style*="border-radius:26px"]') ||
      document.querySelector('.screen-card') ||
      null;
  }

  function ensureCustFilterSheet() {
    var existing = document.getElementById('mb-cust-filter-sheet-root');
    var host = phoneScreenEl() || document.body;
    if (existing) {
      // Keep sheet inside the phone frame (not document.body / full viewport).
      if (existing.parentNode !== host) host.appendChild(existing);
      return existing;
    }
    var root = document.createElement('div');
    root.id = 'mb-cust-filter-sheet-root';
    // absolute + host position:relative clips the sheet to the mobile border
    root.style.cssText = 'display:none;position:absolute;inset:0;z-index:90;pointer-events:auto;';
    root.innerHTML =
      '<div id="mb-cust-filter-overlay" style="position:absolute;inset:0;background:#0f1828;opacity:0.45;"></div>' +
      '<div id="mb-cust-filter-sheet" style="position:absolute;left:0;right:0;bottom:0;max-height:min(92%,calc(100% - 48px));background:#fff;border-radius:24px 24px 0 0;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -8px 28px rgba(15,24,40,.18);">' +
      '<div style="flex:none;padding:14px 18px 0;">' +
      '<div style="width:42px;height:5px;border-radius:99px;background:#d8dee8;margin:0 auto 12px;"></div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
      '<div style="font-size:19px;font-weight:800;color:#1f2a3a;">' + esc(t('Filters', 'סינון')) + '</div>' +
      '<button type="button" id="mb-cust-filter-clear" style="border:none;background:none;color:#c0392b;font-size:13.5px;font-weight:700;cursor:pointer;">' +
      esc(t('Clear all', 'נקה הכל')) + '</button></div></div>' +
      '<div id="mb-cust-filter-sheet-body" class="dc-scroll" style="flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 18px 12px;"></div>' +
      '<div style="flex:none;padding:12px 18px 18px;border-top:1px solid #eef0f3;background:#fff;display:flex;gap:10px;">' +
      '<button type="button" id="mb-cust-filter-close" style="flex:1;padding:12px;border-radius:12px;border:1.5px solid #dde2ea;background:#fff;color:#46505f;font-weight:800;cursor:pointer;">' +
      esc(t('Close', 'סגור')) + '</button>' +
      '<button type="button" id="mb-cust-filter-apply" style="flex:1.4;padding:12px;border-radius:12px;border:none;background:#1d60a2;color:#fff;font-weight:800;cursor:pointer;">' +
      esc(t('Apply', 'החל')) + '</button></div></div>';
    host.appendChild(root);

    root.querySelector('#mb-cust-filter-overlay').addEventListener('click', closeCustFilters);
    root.querySelector('#mb-cust-filter-close').addEventListener('click', closeCustFilters);
    root.querySelector('#mb-cust-filter-clear').addEventListener('click', function () {
      setCustFilters(defaultCustFilters());
      renderCustFilterSheetBody();
      syncCustModeToggle();
    });
    root.querySelector('#mb-cust-filter-apply').addEventListener('click', function () {
      applyCustFilterSheet();
    });
    return root;
  }

  function renderCustFilterSheetBody() {
    var body = document.getElementById('mb-cust-filter-sheet-body');
    if (!body) return;
    var f = getCustFilters();
    var owners = salesOwnerOptions();
    var modeLeads = f.listMode === 'leads';
    var matchOr = f.matchMode === 'or';

    function ownerChip(id, label, on) {
      return (
        '<button type="button" class="mb-cust-sheet-owner" data-owner-id="' + esc(id) + '" style="display:inline-flex;align-items:center;padding:9px 14px;border-radius:99px;cursor:pointer;font-size:13px;' +
        chipStyle(on) + '">' + esc(label) + '</button>'
      );
    }

    body.innerHTML =
      '<div style="margin-bottom:16px;">' +
      '<div style="font-size:13.5px;color:#7b8595;font-weight:700;margin-bottom:10px;">' + esc(t('Mode', 'מצב')) + '</div>' +
      '<div style="display:flex;gap:8px;">' +
      '<button type="button" class="mb-cust-sheet-mode" data-mode="leads" style="flex:1;padding:10px;border-radius:12px;cursor:pointer;font-size:13.5px;' + chipStyle(modeLeads) + '">' + esc(t('Leads', 'לידים')) + '</button>' +
      '<button type="button" class="mb-cust-sheet-mode" data-mode="renewals" style="flex:1;padding:10px;border-radius:12px;cursor:pointer;font-size:13.5px;' + chipStyle(!modeLeads) + '">' + esc(t('Renewals', 'חידושים')) + '</button>' +
      '</div></div>' +
      '<div style="height:1px;background:#f0f2f5;margin:0 0 16px;"></div>' +
      '<div style="margin-bottom:16px;">' +
      '<div style="font-size:13.5px;color:#7b8595;font-weight:700;margin-bottom:10px;">' + esc(t('Owner', 'בעלים')) + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;">' +
      ownerChip('all', t('All', 'הכל'), f.owner === 'all') +
      owners.map(function (o) { return ownerChip(o.id, o.label, String(f.owner) === String(o.id)); }).join('') +
      '</div></div>' +
      '<div id="mb-cust-sheet-expiry" style="display:' + (modeLeads ? 'none' : 'block') + ';">' +
      '<div style="height:1px;background:#f0f2f5;margin:0 0 16px;"></div>' +
      '<div style="margin-bottom:16px;">' +
      '<div style="font-size:13.5px;color:#7b8595;font-weight:700;margin-bottom:10px;">' + esc(t('Expiry', 'תפוגה')) + '</div>' +
      '<div style="display:flex;gap:10px;margin-bottom:10px;">' +
      '<label style="flex:1;display:flex;flex-direction:column;gap:6px;font-size:12px;color:#9aa3b0;font-weight:700;">' + esc(t('From', 'מ־')) +
      '<input type="date" id="mb-cust-expiry-from" value="' + esc(f.expiryFrom || '') + '" style="padding:10px 12px;border:1.5px solid #dde2ea;border-radius:11px;font-size:13.5px;color:#1f2a3a;"/></label>' +
      '<label style="flex:1;display:flex;flex-direction:column;gap:6px;font-size:12px;color:#9aa3b0;font-weight:700;">' + esc(t('To', 'עד')) +
      '<input type="date" id="mb-cust-expiry-to" value="' + esc(f.expiryTo || '') + '" style="padding:10px 12px;border:1.5px solid #dde2ea;border-radius:11px;font-size:13.5px;color:#1f2a3a;"/></label>' +
      '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;">' +
      '<button type="button" class="mb-cust-expiry-quick" data-quick="30" style="padding:8px 14px;border-radius:99px;cursor:pointer;font-size:12.5px;' + chipStyle(false) + '">' + esc(t('Next 30 days', '30 יום הקרובים')) + '</button>' +
      '<button type="button" class="mb-cust-expiry-quick" data-quick="ended" style="padding:8px 14px;border-radius:99px;cursor:pointer;font-size:12.5px;' + chipStyle(false) + '">' + esc(t('Already ended', 'כבר הסתיימה')) + '</button>' +
      '<button type="button" class="mb-cust-expiry-quick" data-quick="clear" style="padding:8px 14px;border-radius:99px;cursor:pointer;font-size:12.5px;' + chipStyle(false) + '">' + esc(t('Clear dates', 'נקה תאריכים')) + '</button>' +
      '</div></div></div>' +
      '<div style="height:1px;background:#f0f2f5;margin:0 0 16px;"></div>' +
      '<div style="margin-bottom:16px;">' +
      '<div style="font-size:13.5px;color:#7b8595;font-weight:700;margin-bottom:10px;">' + esc(t('Sort by', 'מיון לפי')) + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;">' +
      ['name', 'created', 'expiry'].map(function (key) {
        var labels = {
          name: t('Name', 'שם'),
          created: t('Creation date', 'תאריך יצירה'),
          expiry: t('Expiry date', 'תאריך תפוגה')
        };
        var on = f.sort === key;
        return (
          '<button type="button" class="mb-cust-sheet-sort" data-sort="' + key + '" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:13px;cursor:pointer;' + chipStyle(on) + '">' +
          '<span>' + esc(labels[key]) + '</span>' +
          (on ? '<span style="font-size:12px;">' + esc(f.sortDir === 'desc' ? t('Desc', 'יורד') : t('Asc', 'עולה')) + '</span>' : '') +
          '</button>'
        );
      }).join('') +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:10px;">' +
      '<button type="button" class="mb-cust-sheet-dir" data-dir="asc" style="flex:1;padding:9px;border-radius:11px;cursor:pointer;font-size:13px;' + chipStyle(f.sortDir !== 'desc') + '">' + esc(t('Ascending', 'עולה')) + '</button>' +
      '<button type="button" class="mb-cust-sheet-dir" data-dir="desc" style="flex:1;padding:9px;border-radius:11px;cursor:pointer;font-size:13px;' + chipStyle(f.sortDir === 'desc') + '">' + esc(t('Descending', 'יורד')) + '</button>' +
      '</div></div>' +
      '<div style="height:1px;background:#f0f2f5;margin:0 0 16px;"></div>' +
      '<div style="margin-bottom:8px;">' +
      '<div style="font-size:13.5px;color:#7b8595;font-weight:700;margin-bottom:10px;">' + esc(t('Match mode', 'מצב התאמה')) + '</div>' +
      '<div style="display:flex;gap:8px;">' +
      '<button type="button" class="mb-cust-sheet-match" data-match="and" style="flex:1;padding:10px;border-radius:12px;cursor:pointer;font-size:13.5px;' + chipStyle(!matchOr) + '">AND</button>' +
      '<button type="button" class="mb-cust-sheet-match" data-match="or" style="flex:1;padding:10px;border-radius:12px;cursor:pointer;font-size:13.5px;' + chipStyle(matchOr) + '">OR</button>' +
      '</div></div>';

    body.querySelectorAll('.mb-cust-sheet-mode').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-mode') || 'renewals';
        var patch = { listMode: mode };
        if (mode === 'leads') {
          patch.expiryFrom = '';
          patch.expiryTo = '';
        }
        setCustFilters(patch);
        renderCustFilterSheetBody();
      });
    });
    body.querySelectorAll('.mb-cust-sheet-owner').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setCustFilters({ owner: btn.getAttribute('data-owner-id') || 'all' });
        renderCustFilterSheetBody();
      });
    });
    body.querySelectorAll('.mb-cust-sheet-sort').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-sort') || 'name';
        var cur = getCustFilters();
        if (cur.sort === key) {
          setCustFilters({ sortDir: cur.sortDir === 'desc' ? 'asc' : 'desc' });
        } else {
          setCustFilters({ sort: key, sortDir: key === 'created' ? 'desc' : 'asc' });
        }
        renderCustFilterSheetBody();
      });
    });
    body.querySelectorAll('.mb-cust-sheet-dir').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setCustFilters({ sortDir: btn.getAttribute('data-dir') || 'asc' });
        renderCustFilterSheetBody();
      });
    });
    body.querySelectorAll('.mb-cust-sheet-match').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setCustFilters({ matchMode: btn.getAttribute('data-match') || 'and' });
        renderCustFilterSheetBody();
      });
    });
    var fromEl = document.getElementById('mb-cust-expiry-from');
    var toEl = document.getElementById('mb-cust-expiry-to');
    if (fromEl) {
      fromEl.addEventListener('change', function () {
        setCustFilters({ expiryFrom: fromEl.value || '' });
      });
    }
    if (toEl) {
      toEl.addEventListener('change', function () {
        setCustFilters({ expiryTo: toEl.value || '' });
      });
    }
    body.querySelectorAll('.mb-cust-expiry-quick').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var q = btn.getAttribute('data-quick');
        var today = todayDayKey();
        if (q === 'clear') {
          setCustFilters({ expiryFrom: '', expiryTo: '' });
        } else if (q === 'ended') {
          setCustFilters({ expiryFrom: '', expiryTo: today, chip: 'warranty-ended' });
        } else if (q === '30') {
          var d = new Date();
          d.setDate(d.getDate() + 30);
          var to = d.getFullYear() + '-' + padDay(d.getMonth() + 1) + '-' + padDay(d.getDate());
          setCustFilters({ expiryFrom: today, expiryTo: to });
        }
        renderCustFilterSheetBody();
      });
    });
  }

  function openCustFilters() {
    if (!kindIsCustomersPage()) return;
    var root = ensureCustFilterSheet();
    renderCustFilterSheetBody();
    root.style.display = 'block';
    var foot = document.getElementById('common-app-footer');
    if (foot) foot.style.visibility = 'hidden';
  }

  function closeCustFilters() {
    var root = document.getElementById('mb-cust-filter-sheet-root');
    if (root) root.style.display = 'none';
    var foot = document.getElementById('common-app-footer');
    if (foot) foot.style.visibility = '';
  }

  function applyCustFilterSheet() {
    var fromEl = document.getElementById('mb-cust-expiry-from');
    var toEl = document.getElementById('mb-cust-expiry-to');
    var cur = getCustFilters();
    var isLeads = cur.listMode === 'leads';
    setCustFilters({
      expiryFrom: isLeads ? '' : (fromEl ? (fromEl.value || '') : cur.expiryFrom),
      expiryTo: isLeads ? '' : (toEl ? (toEl.value || '') : cur.expiryTo)
    });
    closeCustFilters();
    syncCustModeToggle();
    var chipContainer = document.getElementById('mb-customer-filter-chips');
    if (chipContainer) renderCustFilterChips(chipContainer);
    reloadCustList();
  }

  function reloadCustList() {
    var mount = detectMount();
    if (!mount || !mount.el) return;
    // Invalidate any in-flight paint, then force a new Customer.List with current filters.
    // (Calling start() while _listInFlight was set previously aborted the reload and left 0 rows.)
    mount._activeLoadId = '';
    _listBooted = true;
    _listBootAt = Date.now();
    _rowsCache = null;
    resetListPage();
    mount.el.setAttribute('data-initial-loaded', '1');
    var folder = getActiveFolderId(mount);
    setActiveFolderId(folder);
    loadList(mount, folder, { force: true });
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
    listBindRoots(listEl).forEach(function (root) {
      var buttons = root.querySelectorAll('.mb-cust-vip-btn');
      buttons.forEach(function (btn) {
        if (btn.dataset.wired === '1') return;
        btn.dataset.wired = '1';
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          toggleCustomerVip(btn);
        });
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
        resetListPage();
        applyClientFilters(listEl);
      });
    }

    if (clearBtn && !clearBtn.dataset.wired) {
      clearBtn.dataset.wired = '1';
      clearBtn.addEventListener('click', function() {
        if (searchInput) {
          searchInput.value = '';
          resetListPage();
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
    bindCustModeToggle();
  }

  function start() {
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    var mount = detectMount();
    if (!mount || !mount.el) return;
    // Initial load only — later updates come from socket partial patches
    if (_listBooted || _listInFlight || mount.el.getAttribute('data-initial-loaded') === '1') {
      if (mount.el.getAttribute('data-initial-loaded') !== '1' && _rowsCache) {
        paintCachedRows(mount.el, mount.kind);
      }
      return;
    }
    mount.el.setAttribute('data-initial-loaded', '1');
    _listBooted = true;
    _listBootAt = Date.now();
    var folder = getActiveFolderId(mount);
    setActiveFolderId(folder);
    loadList(mount, folder);
  }

  function watchForListRemount() {
    if (!document.body || window.__mbListMountObserver) return;
    var scheduled = false;
    var lastListEl = document.getElementById('mb-live-list');
    window.__mbListMountObserver = new MutationObserver(function () {
      if (scheduled) return;
      scheduled = true;
      setTimeout(function () {
        scheduled = false;
        var el = document.getElementById('mb-live-list');
        // Ignore card/innerHTML churn — only act when the list root node is replaced
        if (!el || el === lastListEl) return;
        lastListEl = el;
        // Never kick a second Customer.List for DC remount — reuse cache / in-flight
        if (_listBooted || _listInFlight || _rowsCache) {
          paintCachedRows(el, el.getAttribute('data-kind') || pageKind());
          return;
        }
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
    setTotalLabel(n, kind);
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
    var why = String(reason || '');
    // Skip any soft refresh in the boot window (nudge / empty livesync / remount storms)
    if (_listBootAt && (Date.now() - _listBootAt) < 5000) {
      return;
    }
    if (_listInFlight) return;
    // Debounce LiveSync retries (300 / 1000 / 2500) into one silent re-fetch
    _fullRefreshPendingReason = why || _fullRefreshPendingReason || '';
    clearTimeout(_fullRefreshTimer);
    _fullRefreshTimer = setTimeout(function () {
      var mount = detectMount();
      if (!mount) return;
      var pending = _fullRefreshPendingReason;
      _fullRefreshPendingReason = '';
      var folder = getActiveFolderId(mount);
      loadList(mount, folder, { silent: true });
      syncChipActiveStyles(folder);
      if (window.Biz1Pulse) window.Biz1Pulse(mount.el);
      console.log('[ListLive] silent refresh', pending, 'folder=' + folder);
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

    // Customers page with a non-all folder chip → silent re-fetch.
    // Leads are always folder-locked; prefer in-place patch when payload is complete.
    var folderFiltered = kind === 'customers'
      && activeFolder && activeFolder !== '0' && activeFolder !== 'all';
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
  }, { once: true });
  window.addEventListener('mineralbar:language-changed', function () {
    statusMapsPromise = null;
    statusMapById = {};
    statusMapByName = {};
    var mount = detectMount();
    if (!mount) return;
    mount.el.removeAttribute('data-initial-loaded');
    _listBooted = false;
    _listBootAt = 0;
    _rowsCache = null;
    start();
  });
  window.addEventListener('mineralbar:auth-refreshed', function () {
    if (!_listBooted) start();
  });

  // One boot path: ready (or already authed). DOM only watches for remount paint.
  watchForListRemount();
  if (window.MineralBarApp && MineralBarApp.isAuthenticated && MineralBarApp.isAuthenticated()) {
    setTimeout(start, 40);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      watchForListRemount();
    });
  }
  // Do NOT re-fetch on pageshow/visibility — returning from another app must stay on socket updates only.
  // (BFCache socket reconnect is handled in biz1-app.js)

  if (window.LiveSync && typeof LiveSync.bind === 'function') {
    window.__mbListLiveBound = true;
    LiveSync.bind(function (detail) {
      var key = String((detail && detail.key) || '').toLowerCase();
      if (!key) return;
      if (/socket\.nudge/.test(key)) {
        fullListRefresh(key);
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
    window.__mbListLiveBound = true;
    MineralBarApp.bindLiveReload(function (detail) {
      var key = String((detail && detail.key) || '').toLowerCase();
      if (!key || /socket\.nudge/.test(key)) {
        if (key) fullListRefresh(key || 'bindLiveReload');
        return;
      }
      applySocketCustomerEvent(detail || {});
    }, { keys: /customer|lead|crm|socket\.nudge/i, delay: 180 });
  } else {
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
  }

  window.ListLive = window.ListLive || {};
  window.ListLive.setLeadAdvancedFilters = function (patch) {
    setLeadFilters(patch || {});
    var chipContainer = document.getElementById('mb-customer-filter-chips');
    if (chipContainer && pageKind() === 'leads') renderLeadFilterChips(chipContainer);
    resetListPage();
    applyClientFilters(document.getElementById('mb-live-list'));
  };
  window.ListLive.setLeadFilter = setActiveLeadFilter;
  window.ListLive.getLeadFilters = getLeadFilters;
  window.ListLive.setCustAdvancedFilters = function (patch) {
    setCustFilters(patch || {});
    var chipContainer = document.getElementById('mb-customer-filter-chips');
    if (chipContainer && pageKind() === 'customers') renderCustFilterChips(chipContainer);
    syncCustModeToggle();
    resetListPage();
    var needsReload = patch && (
      patch.listMode != null ||
      patch.owner != null ||
      patch.sort === 'created' ||
      (patch.chip && (patch.chip === 'new-or-website' || patch.chip === 'new-lead' || patch.chip === 'website')) ||
      patch.matchMode != null
    );
    if (needsReload) reloadCustList();
    else applyClientFilters(document.getElementById('mb-live-list'));
  };
  window.ListLive.getCustFilters = getCustFilters;
  window.ListLive.openCustFilters = openCustFilters;
  window.ListLive.reloadCustList = reloadCustList;
  window.ListLive.getVisibleLeadCount = function () {
    var listEl = document.getElementById('mb-live-list');
    if (!listEl) return 0;
    var input = document.querySelector('.ds-input') || document.getElementById('mb-customer-search');
    var query = input ? String(input.value || '').toLowerCase().trim() : '';
    var n = 0;
    listEl.querySelectorAll('[data-customer-id]').forEach(function (item) {
      var text = item.textContent.toLowerCase();
      var qOk = !query || text.indexOf(query) > -1;
      if (qOk && leadMatchesAdvancedFilters(item, getLeadFilters())) n++;
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
    _listBooted = false;
    start();
  };

})();
