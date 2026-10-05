/** CloudPlus — Order Proposal form (standalone page) */
(function (global) {
  'use strict';

  var st = {
    customerId: '',
    customer: null,
    product: null,
    catalog: null,
    catalogPromise: null,
    searchTimer: null,
    searchSeq: 0,
    busy: false
  };

  function $(id) {
    return global.document.getElementById(id);
  }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function queryParam(name) {
    try {
      return new URLSearchParams(global.location.search || '').get(name);
    } catch (e) {
      return null;
    }
  }

  function loginHref() {
    return '../index.html#login';
  }

  function val(id) {
    var el = $(id);
    return el ? String(el.value || '').trim() : '';
  }

  function setVal(id, value) {
    var el = $(id);
    if (el) el.value = value == null ? '' : String(value);
  }

  function show(el, on) {
    if (!el) return;
    el.classList.toggle('hidden', !on);
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }

  function money(n) {
    var x = Math.round(Number(n) * 100) / 100;
    if (!isFinite(x)) x = 0;
    return x.toFixed(2);
  }

  function productPriceOf(p) {
    if (!p) return 0;
    var raw = p.product_price != null ? p.product_price
      : (p.price != null ? p.price
        : (p.main_price != null ? p.main_price
          : (p.sale_price != null ? p.sale_price : 0)));
    var n = Number(raw);
    return isFinite(n) ? n : 0;
  }

  function productNameOf(p) {
    if (!p) return '';
    return String(p.product_name || p.name || p.title || p.item_name || '').trim();
  }

  function productIdOf(p) {
    if (!p) return '';
    return String(p.id || p.product_id || p.ID || '').trim();
  }

  function productRows(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.rows)) return raw.rows;
    if (Array.isArray(raw.products)) return raw.products;
    if (Array.isArray(raw.output)) return raw.output;
    if (raw.output && Array.isArray(raw.output.data)) return raw.output.data;
    if (raw.output && Array.isArray(raw.output.rows)) return raw.output.rows;
    if (raw.output && Array.isArray(raw.output.products)) return raw.output.products;
    return [];
  }

  function normalizeText(v) {
    return String(v == null ? '' : v)
      .toLowerCase()
      .replace(/[^\u0590-\u05FFa-z0-9.]+/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function productHaystack(p) {
    if (!p) return '';
    return normalizeText([
      productNameOf(p),
      p.product_sku,
      p.product_internal_sku,
      p.sku,
      p.barcode,
      p.makat,
      p.description,
      p.discription,
      p.desc,
      productIdOf(p),
      p.product_price,
      p.price,
      p.main_price
    ].join(' '));
  }

  /** Score how well a product matches the typed query (higher = better). */
  function matchScore(p, query) {
    var hay = productHaystack(p);
    var q = normalizeText(query);
    if (!q || !hay) return 0;
    if (hay === q) return 100;
    if (hay.indexOf(q) !== -1) return 80;
    var tokens = q.split(' ').filter(function (t) { return t.length >= 1; });
    if (!tokens.length) return 0;
    var hit = 0;
    for (var i = 0; i < tokens.length; i++) {
      if (hay.indexOf(tokens[i]) !== -1) hit++;
    }
    if (hit === tokens.length) return 60 + Math.min(20, tokens.length);
    if (hit > 0 && hit >= Math.ceil(tokens.length * 0.6)) return 30 + hit;
    return 0;
  }

  function dedupeProducts(rows) {
    var seen = {};
    var out = [];
    (rows || []).forEach(function (p) {
      var id = productIdOf(p) || ('n:' + productNameOf(p));
      if (!id || seen[id]) return;
      seen[id] = true;
      out.push(p);
    });
    return out;
  }

  function filterCatalog(rows, query) {
    var list = rows || [];
    var scored = [];
    for (var i = 0; i < list.length; i++) {
      var score = matchScore(list[i], query);
      if (score > 0) scored.push({ p: list[i], score: score });
    }
    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return productNameOf(a.p).localeCompare(productNameOf(b.p), 'he');
    });
    return scored.map(function (x) { return x.p; }).slice(0, 25);
  }

  async function ensureCatalog() {
    // Share one catalog load across proposal.js + any inline hotfix.
    if (global.__cpProductCatalog && global.__cpProductCatalog.length) {
      st.catalog = global.__cpProductCatalog;
      return st.catalog;
    }
    if (global.__cpProductCatalogPromise) {
      st.catalog = await global.__cpProductCatalogPromise;
      return st.catalog;
    }
    if (st.catalog && st.catalog.length) return st.catalog;

    global.__cpProductCatalogPromise = (async function () {
      var rows = [];
      try {
        if (global.MineralBarApp && MineralBarApp.listAllProducts) {
          var all = await MineralBarApp.listAllProducts({ active: 1 });
          rows = all.rows || [];
        } else if (global.MineralBarApp && MineralBarApp.listProducts) {
          var page = await MineralBarApp.listProducts({ active: 1, limit: 25, length: 25 });
          rows = page.rows || [];
        }
      } catch (e) {
        console.warn('[proposal] catalog load failed', e);
        rows = [];
      }
      var catalog = dedupeProducts(rows);
      global.__cpProductCatalog = catalog;
      return catalog;
    })();

    try {
      st.catalog = await global.__cpProductCatalogPromise;
      return st.catalog;
    } finally {
      global.__cpProductCatalogPromise = null;
    }
  }

  function customerFromGet(raw) {
    var c = (raw && (raw.output || raw.data || raw.customer)) || raw || {};
    if (c.customer && typeof c.customer === 'object') c = c.customer;
    return c && typeof c === 'object' ? c : {};
  }

  function showError(msg) {
    var err = $('propError');
    var ok = $('propSuccess');
    show(ok, false);
    if (!err) return;
    if (msg) {
      err.textContent = msg;
      show(err, true);
    } else {
      err.textContent = '';
      show(err, false);
    }
  }

  function showSuccess(msg) {
    var err = $('propError');
    var ok = $('propSuccess');
    show(err, false);
    if (!ok) return;
    ok.textContent = msg || 'Order proposal created';
    show(ok, true);
  }

  function updateTotal() {
    var qty = Number(val('propQty')) || 0;
    var price = Number(val('propPrice')) || 0;
    var total = qty * price;
    var el = $('propTotal');
    if (el) el.textContent = '₪' + money(total);
  }

  function paintSelectedProduct() {
    var wrap = $('propSelectedProduct');
    var nameEl = $('propSelectedName');
    if (!wrap || !nameEl) return;
    if (!st.product) {
      show(wrap, false);
      nameEl.textContent = '';
      return;
    }
    var id = productIdOf(st.product);
    var name = productNameOf(st.product) || ('#' + id);
    nameEl.textContent = name + (id ? (' · #' + id) : '');
    show(wrap, true);
  }

  function paintCustomerChip() {
    var chip = $('propCustChip');
    if (!chip) return;
    if (!st.customerId) {
      show(chip, false);
      return;
    }
    var name = val('propName') || (st.customer && (st.customer.name || st.customer.customer_name)) || ('#' + st.customerId);
    var av = $('propCustAvatar');
    var nm = $('propCustName');
    var idEl = $('propCustId');
    if (av) av.textContent = initials(name);
    if (nm) nm.textContent = name;
    if (idEl) idEl.textContent = 'Customer #' + st.customerId;
    show(chip, true);
  }

  function fillCustomerFields(c) {
    c = c || {};
    var name = c.name || c.customer_name || c.full_name || c.username || '';
    var email = c.email || c.e_mail || '';
    var phone = c.phone || c.tel || c.telephone || '';
    var mobile = c.mobile || c.cellular || c.phone2 || c.cell || '';
    var company = c.company_id || c.corporation || c.csv_id || c.id_number || c.vat_number || c.tz || c.identity || '';
    setVal('propName', name);
    setVal('propEmail', email);
    setVal('propPhone', phone);
    setVal('propMobile', mobile);
    setVal('propCompany', company);
    paintCustomerChip();
  }

  async function loadCustomer(id) {
    id = String(id || '').trim();
    st.customerId = id;
    if (!id) {
      showError('Missing customer id. Use ?customer=123');
      return;
    }
    if (!global.MineralBarApp || !MineralBarApp.getCustomer) {
      showError('App API not ready');
      return;
    }
    try {
      var res = await MineralBarApp.getCustomer(id);
      var c = customerFromGet(res && res.customer ? res : res);
      st.customer = c;
      fillCustomerFields(c);
      showError('');
    } catch (e) {
      console.warn('[proposal] Customer.Get failed', e);
      st.customer = { id: id };
      fillCustomerFields({ name: '' });
      showError((e && e.message) || 'Could not load customer');
    }
  }

  function hideSuggest() {
    show($('propProductSuggest'), false);
  }

  function showSearching() {
    var box = $('propProductSuggest');
    if (!box) return;
    box.innerHTML = '<div class="prop-suggest-empty">Searching…</div>';
    show(box, true);
  }

  function renderSuggest(rows, query) {
    var box = $('propProductSuggest');
    if (!box) return;
    if (!query) {
      hideSuggest();
      return;
    }
    if (!rows.length) {
      box.innerHTML = '<div class="prop-suggest-empty">No products found</div>';
      show(box, true);
      return;
    }
    box.innerHTML = rows.slice(0, 25).map(function (p) {
      var id = productIdOf(p);
      var name = productNameOf(p) || ('#' + id);
      var price = productPriceOf(p);
      var sku = String(p.sku || p.barcode || p.makat || '').trim();
      var meta = [];
      if (sku) meta.push(sku);
      if (id) meta.push('#' + id);
      if (price || price === 0) meta.push('₪' + money(price));
      return (
        '<button type="button" class="prop-suggest-item" data-product-id="' + esc(id) + '">' +
        '<span class="prop-suggest-name">' + esc(name) + '</span>' +
        '<span class="prop-suggest-meta">' + esc(meta.join(' · ')) + '</span>' +
        '</button>'
      );
    }).join('');
    box._rows = rows;
    show(box, true);
  }

  async function searchProducts(query) {
    query = String(query || '').trim();
    var seq = ++st.searchSeq;
    if (!query) {
      hideSuggest();
      return;
    }
    showSearching();

    try {
      // One catalog load, then filter locally — no Products.List per keystroke.
      var catalog = await ensureCatalog();
      if (seq !== st.searchSeq) return;
      renderSuggest(filterCatalog(catalog, query), query);
    } catch (e) {
      if (seq !== st.searchSeq) return;
      console.warn('[proposal] product search failed', e);
      renderSuggest([], query);
    }
  }

  function pickProduct(p) {
    st.product = p || null;
    var name = productNameOf(p);
    setVal('propProductSearch', name);
    setVal('propPrice', money(productPriceOf(p)));
    if (!val('propQty')) setVal('propQty', '1');
    hideSuggest();
    paintSelectedProduct();
    updateTotal();
  }

  function clearProduct() {
    st.product = null;
    setVal('propProductSearch', '');
    setVal('propPrice', '');
    paintSelectedProduct();
    hideSuggest();
    updateTotal();
  }

  function buildItems() {
    var qty = Number(val('propQty')) || 0;
    var price = Number(val('propPrice')) || 0;
    var total = Math.round(qty * price * 100) / 100;
    var name = productNameOf(st.product) || val('propProductSearch') || 'Product';
    var pid = Number(productIdOf(st.product)) || 0;
    // Keep line-item shape identical to working MineralBar Documents.Add quotes.
    return [{
      item_name: name,
      item_qty: qty,
      item_price: price,
      item_total: total,
      iteeeem_id: pid,
      item_discount_type: 'price',
      item_discount: 0
    }];
  }

  function buildProposalPayload() {
    var qty = Number(val('propQty')) || 0;
    var price = Number(val('propPrice')) || 0;
    var finalAmount = Math.round(qty * price * 100) / 100;
    var name = val('propName');
    var email = val('propEmail');
    var phone = val('propPhone');
    var mobile = val('propMobile') || phone;
    var companyId = String(val('propCompany') || '').replace(/\D/g, '');
    var note = 'CloudPlus proposal';

    // IMPORTANT: Biz1 SDK serializes arrays via FormData append. Passing an
    // array of objects becomes "[object Object]" and the API returns
    // "One or more parameters have invalid type or value".
    // Send items as a JSON string (same pattern as receipt Documents.Add).
    //
    // Documents.Add "Company id required" → corporation (tax / company id).
    var payload = {
      customer_id: st.customerId,
      name: name,
      email: email,
      phone: phone,
      mobile: mobile,
      document_type: 'order_proposals',
      final_amount: finalAmount,
      items: JSON.stringify(buildItems()),
      note: note
    };
    if (companyId) {
      // Documents.Add company id (tax / ח.פ) — not `company_id` (unknown_parameter).
      payload.corporation = companyId;
    }
    return payload;
  }

  async function resolveInvoiceSettingId(client) {
    if (!client) return '';
    try {
      var coRes = await client.request('InvoiceSettings.List', { limit: 25 });
      var coData = coRes && (coRes.data || coRes.output || coRes);
      var coRows = Array.isArray(coData) ? coData : ((coData && (coData.rows || coData.list)) || []);
      var co = null;
      if (coRows && coRows.length) {
        co = coRows.find(function (r) {
          return r && (r.is_default || Number(r.default_settings) === 1 || Number(r.is_default) === 1);
        }) || coRows[0];
      }
      return co ? String(co.id || co.invoice_setting_id || co.invoice_settings_id || '').trim() : '';
    } catch (e) {
      console.warn('[proposal] InvoiceSettings.List failed', e);
      return '';
    }
  }

  async function submit() {
    if (st.busy) return;
    showError('');
    show($('propSuccess'), false);

    if (!st.customerId) {
      showError('Missing customer id');
      return;
    }
    if (!val('propName')) {
      showError('Name is required');
      return;
    }
    if (!String(val('propCompany') || '').replace(/\D/g, '')) {
      showError('Company ID is required');
      return;
    }
    if (!st.product && !val('propProductSearch')) {
      showError('Please choose a product');
      return;
    }
    var qty = Number(val('propQty'));
    var price = Number(val('propPrice'));
    if (!(qty > 0)) {
      showError('Quantity must be greater than 0');
      return;
    }
    if (!(price >= 0) || !isFinite(price)) {
      showError('Enter a valid product price');
      return;
    }
    if (!global.MineralBarApp || !MineralBarApp.getClient) {
      showError('Not connected to Biz1');
      return;
    }

    st.busy = true;
    var btn = $('propSubmit');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Creating…';
    }

    try {
      var client = MineralBarApp.getClient();
      var payload = buildProposalPayload();
      // Same as Mineral quotes: invoice company id (מזהה חברה) on Documents.Add.
      var invId = await resolveInvoiceSettingId(client);
      if (invId) payload.invoice_setting_id = invId;
      var created = await client.request('Documents.Add', payload);
      var ok = created && (
        Number(created.success) === 1 ||
        created.success === true ||
        created.inserted_documents_id ||
        created.document_id ||
        created.id
      );
      if (!ok) {
        throw new Error((created && (created.message || created.error)) || 'Documents.Add failed');
      }

      var docId = String(
        created.inserted_documents_id ||
        created.document_id ||
        created.id ||
        ''
      );

      showSuccess(
        docId
          ? ('Order proposal #' + docId + ' created successfully')
          : 'Order proposal created successfully'
      );
    } catch (e) {
      console.warn('[proposal] submit failed', e);
      var msg = (e && e.message) || 'Failed to create order proposal';
      var raw = e && e.raw;
      if (raw && raw.unknown && raw.unknown.length) {
        msg += ' (' + raw.unknown.join(', ') + ')';
      } else if (raw && raw.message && raw.message !== msg) {
        msg = String(raw.message);
      }
      showError(msg);
    } finally {
      st.busy = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Create proposal';
      }
    }
  }

  function bind() {
    var search = $('propProductSearch');
    // If index.html hotfix owns search UI, don't attach a second search listener.
    if (search && !global.__cpSearchFixInstalled) {
      search.addEventListener('input', function () {
        st.product = null;
        paintSelectedProduct();
        var q = search.value;
        if (st.searchTimer) clearTimeout(st.searchTimer);
        st.searchTimer = setTimeout(function () {
          searchProducts(q);
        }, 280);
      });
      search.addEventListener('focus', function () {
        if (String(search.value || '').trim()) searchProducts(search.value);
      });
      search.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') hideSuggest();
      });
    }

    var suggest = $('propProductSuggest');
    if (suggest && !global.__cpSearchFixInstalled) {
      suggest.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest ? e.target.closest('[data-product-id]') : null;
        if (!btn) return;
        var id = btn.getAttribute('data-product-id');
        var rows = suggest._rows || [];
        var hit = null;
        for (var i = 0; i < rows.length; i++) {
          if (productIdOf(rows[i]) === String(id)) {
            hit = rows[i];
            break;
          }
        }
        if (hit) pickProduct(hit);
      });
    }

    global.document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t) return;
      if (t.closest && (t.closest('#propProductSearch') || t.closest('#propProductSuggest'))) return;
      hideSuggest();
    });

    var clearBtn = $('propClearProduct');
    if (clearBtn) clearBtn.addEventListener('click', clearProduct);

    ['propQty', 'propPrice'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('input', updateTotal);
    });

    ['propName'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('input', paintCustomerChip);
    });

    var submitBtn = $('propSubmit');
    if (submitBtn) {
      submitBtn.addEventListener('click', function (e) {
        e.preventDefault();
        submit();
      });
    }

    var form = $('propForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        submit();
      });
    }
  }

  async function boot() {
    show($('propLoading'), true);
    show($('propContent'), false);

    if (!global.MineralBarApp) {
      show($('propLoading'), false);
      show($('propContent'), true);
      showError('App failed to load');
      return;
    }

    try {
      await MineralBarApp.ensureAuth(loginHref());
    } catch (e) {
      console.warn('[proposal] ensureAuth', e);
    }
    if (!MineralBarApp.isAuthenticated || !MineralBarApp.isAuthenticated()) {
      return;
    }

    try {
      if (MineralBarApp.connectRealtime) {
        await MineralBarApp.connectRealtime({ timeoutMs: 8000 });
      }
    } catch (e2) {
      console.warn('[proposal] realtime skipped', e2);
    }

    if (global.MineralBarI18n && MineralBarI18n.apply) {
      try { MineralBarI18n.apply(); } catch (e3) { /* ignore */ }
    }

    bind();
    updateTotal();

    var customer = queryParam('customer') || queryParam('customer_id') || queryParam('cust_id') || '';
    await loadCustomer(customer);
    // Product catalog loads once on first search (shared cache) — not on every page boot.

    show($('propLoading'), false);
    show($('propContent'), true);
  }

  function init() {
    boot();
  }

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
