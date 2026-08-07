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
      row.city || row.city_name || row.town || row.address_city || ''
    );
    if (city && city.toLowerCase() !== 'null' && city.toLowerCase() !== 'undefined') return city;
    var address = stripHtmlText(row.address || row.full_address || '');
    if (address && address.toLowerCase() !== 'null' && address.toLowerCase() !== 'undefined') return address;
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
    var phone = row.phone || row.mobile || row.cellphone || row.tel || '';
    var city = pickCity(row);
    var email = row.email || '';
    var st = resolveStatus(row);
    var created = row.date_created || row.created_at || row.date || row.opendate || '';
    var products = formatProductsPreview(row.products || row.product || row.last_product || row.product_name || '');
    return {
      id: id,
      name: name,
      phone: phone,
      city: city,
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
    return encodeURI(page) + '?customer_id=' + encodeURIComponent(id) +
      '&cust_id=' + encodeURIComponent(id) +
      '&id=' + encodeURIComponent(id);
  }

  function leadCard(c) {
    var detail = customerHref('lead-card.html', c.id);
    var meta = [];
    if (c.phone) meta.push(esc(c.phone));
    if (c.city) meta.push(esc(c.city));
    if (c.created) {
      try {
        var d = new Date(c.created);
        if (!isNaN(d.getTime())) {
          var pad = function(n) { return n < 10 ? '0' + n : n; };
          var formatted = pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
          meta.push(formatted);
        } else {
          meta.push(esc(c.created));
        }
      } catch(e) {
        meta.push(esc(c.created));
      }
    }
    return (
      '<a href="' + detail + '" data-customer-id="' + esc(c.id) + '" data-status="' + esc(c.status) + '" style="display:block;background:#fff;border-radius:16px;padding:14px 16px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-bottom:12px;text-decoration:none;">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">' +
      '<div style="font-size:17px;font-weight:800;color:#16223a;display:inline-flex;align-items:center;gap:5px;">' +
      esc(c.name) +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c2c9d2" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></div>' +
      (c.status
        ? '<span style="font-size:11.5px;font-weight:700;padding:4px 11px;border-radius:7px;background:#eaf2fb;color:#1d60a2;flex:none;">' + esc(c.status) + '</span>'
        : '') +
      '</div>' +
      (meta.length
        ? '<div style="margin-top:9px;font-size:12.5px;font-weight:600;color:#5a6473;line-height:1.5;">' + meta.join(' &middot; ') + '</div>'
        : '') +
      (c.email ? '<div style="margin-top:4px;font-size:12px;color:#9aa3b0;">' + esc(c.email) + '</div>' : '') +
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
    var statusLabel = String(c.status || '').trim();
    var statusColor = String(c.statusColor || '#1d60a2').trim() || '#1d60a2';
    var statusBg = statusColor.charAt(0) === '#' ? (statusColor + '22') : '#eaf2fb';
    var productBtnLabel = t('Products', 'מוצרים');
    var letter = String(c.name || '').trim().charAt(0).toUpperCase() || '?';
    return (
      '<div data-customer-id="' + esc(c.id) + '" data-customer-name="' + esc(c.name) + '" data-status="' + esc(c.status || '') + '" style="display:flex;align-items:center;gap:12px;background:#fff;border-radius:14px;padding:12px 13px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-bottom:9px;">' +
      '<a href="' + detail + '" style="width:42px;height:42px;border-radius:50%;background:#dbe7f8;color:#2f6aa6;font-weight:800;font-size:16px;flex:none;display:flex;align-items:center;justify-content:center;text-decoration:none;text-transform:uppercase;">' + esc(letter) + '</a>' +
      '<a href="' + detail + '" style="flex:1;min-width:0;text-decoration:none;">' +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
      '<span style="font-size:15.5px;font-weight:800;color:#16223a;">' + esc(c.name) + '</span>' +
      (statusLabel
        ? '<span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:7px;background:' + esc(statusBg) + ';color:' + esc(statusColor) + ';flex:none;">' + esc(statusLabel) + '</span>'
        : '') +
      '</div>' +
      (c.city ? '<div style="font-size:12px;color:#7b8595;margin-top:3px;">' + esc(c.city) + '</div>' : '') +
      '</a>' +
      '<button type="button" class="mb-cust-products-btn" data-customer-id="' + esc(c.id) + '" data-customer-name="' + esc(c.name) + '" aria-label="' + esc(productBtnLabel) + '" title="' + esc(productBtnLabel) + '" style="width:36px;height:36px;border-radius:10px;border:1px solid #d7e4f4;background:#eaf2fb;color:#1d60a2;display:inline-flex;align-items:center;justify-content:center;flex:none;cursor:pointer;padding:0;">' +
      productIconSvg(17, '#1d60a2') +
      '</button>' +
      '</div>'
    );
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
      var rawFolder = el.getAttribute('data-folder');
      var folderId;
      if (rawFolder === null || rawFolder === '' || rawFolder === 'all') {
        folderId = 0; // all customers (no folder filter)
      } else {
        folderId = Number(rawFolder);
        if (Number.isNaN(folderId)) folderId = 0;
      }
      return {
        el: el,
        folderId: folderId,
        kind: el.getAttribute('data-kind') || 'customers'
      };
    }
    return null;
  }

  /** Currently selected folder chip — survives socket soft-refresh / DC remount. */
  function getActiveFolderId(mount) {
    if (window.__mbActiveFolderId != null && window.__mbActiveFolderId !== '') {
      return String(window.__mbActiveFolderId);
    }
    var chipContainer = document.getElementById('mb-customer-filter-chips');
    if (chipContainer) {
      var fromBar = chipContainer.getAttribute('data-active-folder');
      if (fromBar != null && fromBar !== '') return String(fromBar);
      var activeChip = chipContainer.querySelector('.mb-cust-chip[data-active="1"], .mb-folder-tab[data-active="1"]');
      if (activeChip) {
        var fid = activeChip.getAttribute('data-folder-id') || activeChip.getAttribute('data-chip-id');
        if (fid != null && fid !== '') return String(fid);
      }
    }
    var list = (mount && mount.el) || document.getElementById('mb-live-list');
    if (list) {
      var df = list.getAttribute('data-folder');
      if (df != null && df !== '') return String(df);
    }
    return mount && mount.folderId != null ? String(mount.folderId) : '0';
  }

  function setActiveFolderId(folderId) {
    var id = folderId == null || folderId === '' ? '0' : String(folderId);
    window.__mbActiveFolderId = id;
    var chipContainer = document.getElementById('mb-customer-filter-chips');
    if (chipContainer) chipContainer.setAttribute('data-active-folder', id);
    var list = document.getElementById('mb-live-list');
    if (list) list.setAttribute('data-folder', id);
  }

  function syncChipActiveStyles(activeId) {
    activeId = String(activeId == null ? '0' : activeId);
    var chips = document.querySelectorAll('.mb-cust-chip, .mb-folder-tab');
    chips.forEach(function (c) {
      var fid = c.getAttribute('data-folder-id') || c.getAttribute('data-chip-id');
      // Customers "all" (0): no chip highlighted. Leads folder 1+: highlight match.
      var isThis = String(fid) === activeId && !(kindIsCustomersPage() && activeId === '0');
      c.setAttribute('data-active', isThis ? '1' : '0');
      c.style.background = isThis ? '#eff6ff' : '#f8fafc';
      c.style.color = isThis ? '#1d4ed8' : '#475569';
      c.style.border = isThis ? '1.5px solid #3b82f6' : '1.5px solid #e2e8f0';
      c.style.fontWeight = isThis ? '800' : '700';
    });
    var chipContainer = document.getElementById('mb-customer-filter-chips');
    if (chipContainer) chipContainer.setAttribute('data-active-folder', activeId);
  }

  /** Currently selected folder chip — survives socket refresh + DC remount. */
  function getActiveFolderId(mount) {
    mount = mount || detectMount();
    if (window.__mbListActiveFolder != null && window.__mbListActiveFolder !== '') {
      return String(window.__mbListActiveFolder);
    }
    var chipContainer = document.getElementById('mb-customer-filter-chips');
    if (chipContainer) {
      var fromAttr = chipContainer.getAttribute('data-active-folder');
      if (fromAttr != null && fromAttr !== '') return String(fromAttr);
      var activeChip = chipContainer.querySelector('.mb-cust-chip[data-active="1"], .mb-folder-tab[data-active="1"]');
      if (activeChip) {
        var fid = activeChip.getAttribute('data-folder-id') || activeChip.getAttribute('data-chip-id');
        if (fid != null && fid !== '') return String(fid);
      }
    }
    if (mount && mount.el) {
      var listFolder = mount.el.getAttribute('data-folder');
      if (listFolder != null && listFolder !== '') return String(listFolder);
    }
    if (mount && mount.folderId != null) return String(mount.folderId);
    return kindIsCustomersPage() ? '0' : '1';
  }

  function setActiveFolderId(folderId) {
    var id = String(folderId == null ? '' : folderId);
    if (id === '' || id === 'all' || id === 'null') id = kindIsCustomersPage() ? '0' : '1';
    window.__mbListActiveFolder = id;
    try {
      sessionStorage.setItem('mb_list_active_folder', id);
    } catch (e) { /* ignore */ }
    var chipContainer = document.getElementById('mb-customer-filter-chips');
    if (chipContainer) chipContainer.setAttribute('data-active-folder', id);
    var list = document.getElementById('mb-live-list');
    if (list) list.setAttribute('data-folder', id);
  }

  function restoreActiveFolderFromSession() {
    if (window.__mbListActiveFolder != null && window.__mbListActiveFolder !== '') return;
    try {
      var saved = sessionStorage.getItem('mb_list_active_folder');
      if (saved != null && saved !== '') window.__mbListActiveFolder = String(saved);
    } catch (e) { /* ignore */ }
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
    // folder_id 0 / null / 'all' = every customer (no folder filter)
    var folderVal = explicitFolderId;
    if (folderVal === undefined) folderVal = mount.folderId;
    if (folderVal != null && folderVal !== '' && String(folderVal) !== 'all' && Number(folderVal) !== 0) {
      queryParams.folder_id = folderVal;
    }

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
        var isEnList = typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage() === 'en';
        totalEl.textContent = total + (kind === 'leads'
          ? (isEnList ? ' leads' : ' לידים')
          : (isEnList ? ' customers' : ' לקוחות'));
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
      var isEnVis = typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage() === 'en';
      var kindEl = document.getElementById('mb-live-list');
      var kindVis = (kindEl && kindEl.getAttribute('data-kind')) || 'customers';
      totalEl.textContent = visibleCount + (kindVis === 'leads'
        ? (isEnVis ? ' leads' : ' לידים')
        : (isEnVis ? ' customers' : ' לקוחות'));
    }
  }

  function renderFolderFilterBar(container, selectedFolderId) {
    if (!container) return;

    var folders = (window.MineralBarApp && typeof MineralBarApp.getFolders === 'function') ? MineralBarApp.getFolders() : [];

    if (!folders || !folders.length) {
      folders = [
        { id: 1, name_en: "New Leads", name_he: "פניות חדשות", icon: "💼", count: 6 },
        { id: 2, name_en: "Customers", name_he: "לקוחות", icon: "💡", count: 1 },
        { id: 3, name_en: "Missions", name_he: "משימות", icon: "📅", count: 1 },
        { id: 4, name_en: "Archive", name_he: "ארכיון", icon: "📁", count: 0 },
        { id: 5, name_en: "Trash", name_he: "אשפה", icon: "📹", count: 0 },
        { id: 6, name_en: "Spam", name_he: "ספאם", icon: "❗", count: 0 }
      ];
    }

    var lang = (window.getCurrentLanguage && window.getCurrentLanguage()) || 'he';
    var isEn = lang === 'en';

    var activeId = null;
    if (selectedFolderId !== undefined && selectedFolderId !== null) {
      activeId = String(selectedFolderId);
    } else if (selectedFolderId === undefined) {
      activeId = String(container.getAttribute('data-active-folder') || '0');
    }

    var iconMap = {
      '1': '💼',
      '2': '💡',
      '3': '📅',
      '4': '📁',
      '5': '📹',
      '6': '❗'
    };

    var html = '';
    // Customers page defaults to all records (no folder_id) — no "ALL" chip in the UI.
    // Folder chips still filter when selected; deselect returns to unfiltered list.
    if (kindIsCustomersPage() && (!activeId || activeId === '0' || activeId === 'all' || activeId === 'null')) {
      activeId = '0';
    }

    folders.forEach(function(f) {
      var fid = String(f.id || f.folder_id || f.value || '1');
      var name = isEn ? (f.name_en || f.name || f.name_he) : (f.name_he || f.name || f.name_en);
      if (isEn && name) name = name.toUpperCase();
      var icon = f.icon || iconMap[fid] || '📁';

      // Never highlight a folder when showing the unfiltered "all" list
      var isActive = (fid === activeId) && activeId !== '0';

      var btnStyle = isActive
        ? 'flex:none; display:inline-flex; align-items:center; gap:6px; padding:7px 13px; border-radius:12px; font-size:12.5px; font-weight:800; cursor:pointer; white-space:nowrap; background:#eff6ff; color:#1d4ed8; border:1.5px solid #3b82f6; box-shadow:0 1px 3px rgba(59,130,246,0.15);'
        : 'flex:none; display:inline-flex; align-items:center; gap:6px; padding:7px 13px; border-radius:12px; font-size:12.5px; font-weight:700; cursor:pointer; white-space:nowrap; background:#f8fafc; color:#475569; border:1.5px solid #e2e8f0;';

      html += '<button type="button" class="mb-cust-chip mb-folder-tab" data-folder-id="' + fid + '" data-chip-id="' + fid + '" data-active="' + (isActive ? '1' : '0') + '" style="' + btnStyle + '">' +
        '<span>' + icon + '</span> ' +
        '<span>' + esc(name) + '</span>' +
        '</button>';
    });

    container.innerHTML = html;
    container.setAttribute('data-active-folder', activeId || '0');
  }

  function kindIsCustomersPage() {
    var list = document.getElementById('mb-live-list');
    return !list || (list.getAttribute('data-kind') || 'customers') === 'customers';
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
      var initialFolder = window.__mbActiveFolderId;
      if (initialFolder == null || initialFolder === '') {
        initialFolder = chipContainer.getAttribute('data-active-folder');
      }
      if (initialFolder == null || initialFolder === '') initialFolder = kindIsCustomersPage() ? '0' : '1';
      setActiveFolderId(initialFolder);
      renderFolderFilterBar(chipContainer, initialFolder);

      // Make it mouse-draggable on desktop
      var isDown = false, startX, scrollLeft;
      chipContainer.style.cursor = 'grab';
      chipContainer.addEventListener('mousedown', function(e) {
        isDown = true;
        chipContainer.dataset.dragged = '0';
        chipContainer.style.cursor = 'grabbing';
        startX = e.pageX - chipContainer.offsetLeft;
        scrollLeft = chipContainer.scrollLeft;
      });
      chipContainer.addEventListener('mouseleave', function() {
        isDown = false;
        chipContainer.style.cursor = 'grab';
      });
      chipContainer.addEventListener('mouseup', function() {
        isDown = false;
        chipContainer.style.cursor = 'grab';
        setTimeout(function() { chipContainer.dataset.dragged = '0'; }, 0);
      });
      chipContainer.addEventListener('mousemove', function(e) {
        if (!isDown) return;
        e.preventDefault();
        var x = e.pageX - chipContainer.offsetLeft;
        var walk = (x - startX) * 1.5;
        if (Math.abs(walk) > 5) chipContainer.dataset.dragged = '1';
        chipContainer.scrollLeft = scrollLeft - walk;
      });
    }

    var chips = document.querySelectorAll('.mb-cust-chip, .mb-folder-tab');
    chips.forEach(function(chip) {
      if (chip.dataset.wired) return;
      chip.dataset.wired = '1';
      chip.addEventListener('click', function(e) {
        if (chipContainer && chipContainer.dataset.dragged === '1') {
          e.preventDefault();
          return;
        }
        var selectedFid = chip.getAttribute('data-folder-id') || chip.getAttribute('data-chip-id');
        var wasActive = (chip.getAttribute('data-active') === '1');
        
        // Customers: deselect → All (0). Leads: stay on New Leads (1).
        var nextActiveId;
        if (wasActive) {
          nextActiveId = kindIsCustomersPage() ? '0' : '1';
        } else {
          nextActiveId = selectedFid;
        }
        if (chipContainer) chipContainer.setAttribute('data-active-folder', String(nextActiveId || '0'));
        setActiveFolderId(nextActiveId);

        chips.forEach(function(c) {
          var fid = c.getAttribute('data-folder-id') || c.getAttribute('data-chip-id');
          var isThis = String(fid) === String(nextActiveId);
          c.setAttribute('data-active', isThis ? '1' : '0');
          c.style.background = isThis ? '#eff6ff' : '#f8fafc';
          c.style.color = isThis ? '#1d4ed8' : '#475569';
          c.style.border = isThis ? '1.5px solid #3b82f6' : '1.5px solid #e2e8f0';
          c.style.fontWeight = isThis ? '800' : '700';
        });

        // Fetch fresh list from API with selected folder_id (0 = all)
        var mount = detectMount();
        if (mount) {
          loadList(mount, nextActiveId);
        }
      });
    });
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
    totalEl.textContent = n + (kind === 'leads' ? ' leads' : ' customers');
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
      city: row.city || row.address || payload.city || '',
      status: row.status,
      status_id: row.status_id || payload.status_id,
      status_name: row.status_name || payload.status_name,
      sub_list_data: row.sub_list_data || payload.sub_list_data,
      sub_list_data_name: row.sub_list_data_name || payload.sub_list_data_name
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
