(function () {
  'use strict';

  var App = window.Biz1App || window.MineralBarApp;
  if (!App) {
    location.replace('login.html');
    return;
  }

  var PAGE_SIZE = 25;

  var forms = [];
  var totalCount = 0;
  var editingId = null;
  var currentPage = 1;
  var searchTimer = null;
  var loading = false;
  var invoiceSettings = [];
  var products = [];
  var paymentGateways = [];
  var itemOptionsByType = {};
  var itemSelectLoading = false;
  var guestMode = false;

  var formsBody = document.getElementById('formsBody');
  var emptyState = document.getElementById('emptyState');
  var loadingState = document.getElementById('loadingState');
  var errorState = document.getElementById('errorState');
  var errorText = document.getElementById('errorText');
  var searchInput = document.getElementById('searchInput');
  var pager = document.getElementById('pager');
  var pageInfo = document.getElementById('pageInfo');
  var btnPrevPage = document.getElementById('btnPrevPage');
  var btnNextPage = document.getElementById('btnNextPage');
  var modal = document.getElementById('formModal');
  var editor = document.getElementById('paymentFormEditor');
  var submitBtn = editor ? editor.querySelector('[type="submit"]') : null;

  function t(key) {
    return (window.t && window.t(key)) || key;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatAmount(n) {
    var num = Number(n);
    if (!Number.isFinite(num)) return String(n == null ? '' : n);
    return String(num);
  }

  function apiErrorMessage(err) {
    if (!err) return t('err_load_forms');
    if (err.raw && (err.raw.message || err.raw.error)) {
      return String(err.raw.message || err.raw.error);
    }
    return String(err.message || t('err_load_forms'));
  }

  async function copyTextToClipboard(text) {
    var value = String(text == null ? '' : text);
    if (!value) throw new Error(t('err_no_link'));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch (e) { /* fall back to execCommand */ }
    }
    var ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, value.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
    document.body.removeChild(ta);
    if (!ok) throw new Error(t('err_copy_failed'));
  }

  async function copyShareLinkForRow(row) {
    // Module guest link (same list + add popup), not Biz1 dashboard URL
    if (!App.createModuleGuestLink) throw new Error(t('err_no_link'));
    var formId = row && (row.id != null ? row.id : row.payment_form_id);
    if (formId == null || formId === '') throw new Error(t('err_no_link'));
    var link = await App.createModuleGuestLink(location.href, { id: formId });
    link = String(link || '').trim();
    if (!link || link.indexOf('[object ') === 0) throw new Error(t('err_no_link'));
    await copyTextToClipboard(link);
    return link;
  }

  function applyGuestUi() {
    var banner = document.getElementById('guestBanner');
    if (banner) {
      if (guestMode) banner.classList.remove('hidden');
      else banner.classList.add('hidden');
    }
    var shareBtn = document.getElementById('btnShareLink');
    if (shareBtn) {
      if (guestMode) shareBtn.classList.add('hidden');
      else shareBtn.classList.remove('hidden');
    }
    var logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn && guestMode) {
      logoutBtn.setAttribute('data-i18n-title', 'guest_exit');
      logoutBtn.setAttribute('title', t('guest_exit'));
    }
  }

  function setBusy(isBusy) {
    loading = !!isBusy;
    if (loadingState) {
      if (loading) loadingState.classList.remove('hidden');
      else loadingState.classList.add('hidden');
    }
    if (searchInput) searchInput.disabled = loading;
    if (btnPrevPage) btnPrevPage.disabled = loading || currentPage <= 1;
    if (btnNextPage) btnNextPage.disabled = loading;
  }

  function showError(msg) {
    if (!errorState) return;
    if (errorText) errorText.textContent = msg || t('err_load_forms');
    errorState.classList.remove('hidden');
  }

  function clearError() {
    if (errorState) errorState.classList.add('hidden');
  }

  function totalPages() {
    return Math.max(1, Math.ceil((totalCount || 0) / PAGE_SIZE));
  }

  function clampPage() {
    var pages = totalPages();
    if (currentPage > pages) currentPage = pages;
    if (currentPage < 1) currentPage = 1;
  }

  function renderPager() {
    var pages = totalPages();
    if (!pager) return;
    if (totalCount <= PAGE_SIZE) {
      pager.classList.add('hidden');
      return;
    }
    pager.classList.remove('hidden');
    pageInfo.textContent = t('page_of')
      .replace('{page}', String(currentPage))
      .replace('{pages}', String(pages));
    btnPrevPage.disabled = loading || currentPage <= 1;
    btnNextPage.disabled = loading || currentPage >= pages;
  }

  function renderTable() {
    if (!formsBody) return;

    if (loading && !forms.length) {
      formsBody.innerHTML = '';
      emptyState.classList.add('hidden');
      pager.classList.add('hidden');
      return;
    }

    if (!forms.length) {
      formsBody.innerHTML = '';
      emptyState.classList.remove('hidden');
      pager.classList.add('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    formsBody.innerHTML = forms.map(function (row) {
      var actionsHtml =
        '<button type="button" class="action-btn" data-action="copy" title="' + escapeHtml(t('action_copy')) + '">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
        '</button>';
      // Share-link guests: view/copy only — no edit / delete
      if (!guestMode) {
        actionsHtml +=
          '<button type="button" class="action-btn" data-action="edit" title="' + escapeHtml(t('action_edit')) + '">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>' +
          '</button>' +
          '<button type="button" class="action-btn action-btn--danger" data-action="delete" title="' + escapeHtml(t('action_delete')) + '">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>' +
          '</button>';
      }
      return (
        '<tr data-id="' + escapeHtml(row.id) + '">' +
          '<td class="col-id">' + escapeHtml(row.id) + '</td>' +
          '<td>' + escapeHtml(row.name || row.form_name) + '</td>' +
          '<td class="col-type">' + escapeHtml(row.item_type || row.iteam_type) + '</td>' +
          '<td class="col-amount">' + escapeHtml(formatAmount(row.amount)) + '</td>' +
          '<td><div class="actions">' + actionsHtml + '</div></td>' +
        '</tr>'
      );
    }).join('');

    renderPager();
  }

  function fillSelect(el, rows, opts) {
    opts = opts || {};
    if (!el) return;
    var placeholder = opts.placeholder || '';
    var valueKey = opts.valueKey || 'id';
    var labelKey = opts.labelKey || 'name';
    var html = '<option value="">' + escapeHtml(placeholder) + '</option>';
    (rows || []).forEach(function (row) {
      var val = row[valueKey];
      var label = row[labelKey] || ('#' + val);
      var extra = '';
      if (opts.method && (row.method || row.provider)) {
        extra += ' data-method="' + escapeHtml(row.method || row.provider || '') + '"';
      }
      html += '<option value="' + escapeHtml(val) + '"' + extra + '>' + escapeHtml(label) + '</option>';
    });
    el.innerHTML = html;
  }

  function ensureSelectValue(el, value, label) {
    if (!el) return;
    var v = value == null || value === '' ? '' : String(value);
    if (!v || v === '0') {
      el.value = '';
      return;
    }
    var exists = Array.prototype.some.call(el.options, function (o) { return o.value === v; });
    if (!exists) {
      el.insertAdjacentHTML(
        'beforeend',
        '<option value="' + escapeHtml(v) + '">' + escapeHtml(label || ('#' + v)) + '</option>'
      );
    }
    el.value = v;
  }

  function fillGatewaySelect(selectedValue) {
    var el = document.getElementById('pfGateway');
    var hint = document.getElementById('pfGatewayHint');
    fillSelect(el, paymentGateways, {
      placeholder: t('field_gateway'),
      labelKey: 'name',
      method: true
    });
    if (hint) {
      if (paymentGateways.length) hint.classList.add('hidden');
      else hint.classList.remove('hidden');
    }
    if (selectedValue != null && selectedValue !== '' && Number(selectedValue) !== 0) {
      ensureSelectValue(el, selectedValue);
    }
  }

  async function loadLookups() {
    var results = await Promise.all([
      App.listInvoiceSettings({ limit: 25 }).catch(function () { return { rows: [] }; }),
      App.listProducts({ limit: 25, active: 1 }).catch(function () { return { rows: [] }; }),
      App.listPaymentGateways
        ? App.listPaymentGateways({}).catch(function (err) {
          console.warn('[PaymentForms] gateways load failed', err);
          return { rows: [] };
        })
        : Promise.resolve({ rows: [] })
    ]);
    invoiceSettings = results[0].rows || [];
    products = results[1].rows || [];
    paymentGateways = results[2].rows || [];
    itemOptionsByType.product = products.slice();
    fillSelect(document.getElementById('pfCompany'), invoiceSettings, {
      placeholder: t('field_company'),
      labelKey: 'name'
    });
    fillGatewaySelect();
    fillItemSelectForType(document.getElementById('pfProductType').value || 'product');
    console.log('[PaymentForms] companies loaded', invoiceSettings.length);
    console.log('[PaymentForms] gateways loaded', paymentGateways.length, paymentGateways);
  }

  /** Refresh GATEWAY from live account Settings → Payments (same account as COMPANY). */
  async function refreshGateways(selectedValue) {
    if (!App.listPaymentGateways) return;
    try {
      var res = await App.listPaymentGateways({});
      paymentGateways = res.rows || [];
      fillGatewaySelect(selectedValue != null ? selectedValue : document.getElementById('pfGateway').value);
      console.log('[PaymentForms] gateways refreshed', paymentGateways.length, paymentGateways);
    } catch (err) {
      console.warn('[PaymentForms] gateways refresh failed', err);
    }
  }

  async function loadForms(opts) {
    opts = opts || {};
    var silent = !!opts.silent;
    if (!silent) {
      setBusy(true);
      clearError();
    }
    try {
      var q = String(searchInput.value || '').trim();
      var start = (currentPage - 1) * PAGE_SIZE;
      var filters = {
        limit: PAGE_SIZE,
        length: PAGE_SIZE,
        start: start
      };
      if (q) filters.search = q;

      var listRes = await App.listPaymentForms(filters);
      forms = listRes.rows || [];

      var countRes = await App.countPaymentForms(q ? { search: q } : {}).catch(function () {
        return { count: listRes.count || forms.length };
      });
      totalCount = Number(countRes.count);
      if (!Number.isFinite(totalCount) || totalCount < forms.length) {
        totalCount = listRes.count != null ? Number(listRes.count) : forms.length;
      }
      if (forms.length < PAGE_SIZE && currentPage === 1) {
        totalCount = forms.length;
      }

      clampPage();
      renderTable();
      if (silent) clearError();
    } catch (err) {
      console.error('[PaymentForms] load failed', err);
      if (!silent) {
        forms = [];
        totalCount = 0;
        renderTable();
        showError(apiErrorMessage(err));
      }
    } finally {
      if (!silent) {
        setBusy(false);
        renderPager();
      } else {
        renderPager();
      }
    }
  }

  function notifyFormsChanged() {
    try {
      if (formsChannel) formsChannel.postMessage({ type: 'forms-changed', at: Date.now() });
    } catch (e) { /* ignore */ }
  }

  var formsReloadTimer = null;
  function scheduleFormsReload(reason) {
    if (formsReloadTimer) clearTimeout(formsReloadTimer);
    formsReloadTimer = setTimeout(function () {
      formsReloadTimer = null;
      if (loading) {
        scheduleFormsReload(reason || 'retry');
        return;
      }
      console.info('[PaymentForms] live refresh', reason || 'socket');
      loadForms({ silent: true });
    }, 350);
  }

  var formsChannel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      formsChannel = new BroadcastChannel('payment_forms_live');
      formsChannel.onmessage = function (ev) {
        if (ev && ev.data && ev.data.type === 'forms-changed') {
          scheduleFormsReload('broadcast');
        }
      };
    }
  } catch (eCh) { /* ignore */ }

  function startRealtimeUpdates() {
    if (!App.connectRealtime) return;

    window.addEventListener('mineralbar:payment-forms', function () {
      scheduleFormsReload('payment-forms');
    });
    window.addEventListener('mineralbar:realtime', function (ev) {
      var detail = (ev && ev.detail) || {};
      if (detail.group === 'paymentForms') {
        scheduleFormsReload(detail.key || 'realtime');
        return;
      }
      var key = String(detail.key || '').toLowerCase();
      if (/payment[_\s-]?form|paymentforms|gvia|collection.?form/.test(key)) {
        scheduleFormsReload(key);
      }
    });
    window.addEventListener('mineralbar:socket', function (ev) {
      var detail = (ev && ev.detail) || {};
      if (detail.type === 'ready') {
        console.info('[PaymentForms] socket ready', (detail.registered || []).length, 'events');
      }
    });

    var state = App.getRealtimeState ? App.getRealtimeState() : null;
    if (state && state.connected && state.status === 'ready') return;

    App.connectRealtime()
      .then(function (res) {
        return res && res.promise ? res.promise : res;
      })
      .then(function (ready) {
        console.info('[PaymentForms] realtime connected', ready && ready.events ? ready.events.length : '');
      })
      .catch(function (err) {
        console.warn('[PaymentForms] realtime connect failed', err);
      });
  }

  function parseRequiredFields(value) {
    if (Array.isArray(value)) return value.map(String);
    if (value == null || value === '') return [];
    if (typeof value === 'string') {
      try {
        var parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch (e) { /* ignore */ }
      return String(value).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }
    return [];
  }

  function collectRequiredFields() {
    var fields = [];
    if (document.getElementById('pfReqName').checked) fields.push('name');
    if (document.getElementById('pfReqEmail').checked) fields.push('email');
    if (document.getElementById('pfReqPhone').checked) fields.push('mobile');
    return fields;
  }

  /** Map legacy / alias document_type values to live static option values. */
  function normalizeDocumentType(value) {
    var v = String(value == null ? '' : value).trim();
    if (!v) return '';
    var aliases = {
      order: 'purchase_orders',
      'receipt_tax_invoice,purchase_orders': 'rececipt_tax_invoice,purchase_orders',
      'receipt_tax_invoice,detail_orders': 'rececipt_tax_invoice,detail_orders'
    };
    return aliases[v] || v;
  }

  function setDocumentTypeValue(value) {
    var el = document.getElementById('pfDocument');
    if (!el) return;
    var v = normalizeDocumentType(value);
    if (!v) {
      el.value = '';
      return;
    }
    var exists = Array.prototype.some.call(el.options, function (o) { return o.value === v; });
    if (!exists) {
      el.insertAdjacentHTML(
        'beforeend',
        '<option value="' + escapeHtml(v) + '">' + escapeHtml(v) + '</option>'
      );
    }
    el.value = v;
  }

  /** Docs that cannot use "Monthly invoice" order_installment=2 (live dashboard). */
  function documentBlocksMonthlyInvoice(docType) {
    var blocked = {
      receipt_tax_invoice: 1,
      invoice: 1,
      purchase_orders: 1,
      detail_orders: 1,
      'rececipt_tax_invoice,purchase_orders': 1,
      'rececipt_tax_invoice,detail_orders': 1,
      'invoice,purchase_orders': 1,
      'invoice,detail_orders': 1,
      organization_receipt: 1
    };
    return !!blocked[normalizeDocumentType(docType)];
  }

  function syncOrderInstallmentOptions() {
    var sel = document.getElementById('pfOrderInstallment');
    if (!sel) return;
    var current = sel.value;
    var monthly = sel.querySelector('option[value="2"]');
    var docEl = document.getElementById('pfDocument');
    var docVal = docEl ? docEl.value : '';
    if (documentBlocksMonthlyInvoice(docVal)) {
      if (monthly) monthly.remove();
      if (current === '2') sel.value = '1';
    } else if (!monthly) {
      var opt = document.createElement('option');
      opt.value = '2';
      opt.setAttribute('data-i18n', 'opt_monthly_invoice');
      opt.textContent = t('opt_monthly_invoice') || 'Monthly invoice';
      sel.appendChild(opt);
    }
  }

  function isSubscriptionType(itemType) {
    return itemType === 'subscription';
  }

  function isProductType(itemType) {
    return itemType === 'product';
  }

  /**
   * Live: PRODUCT/MEETING/ORDER change toggles fields.
   * All types use a select (like product). Wildcard only for product.
   * Subscription → Payment Type + Document; others → Regular & Installments.
   */
  function syncItemTypeFields() {
    var itemType = document.getElementById('pfProductType').value || 'product';
    var productBlock = document.getElementById('pfProductItemBlock');
    var wildcardWrap = document.getElementById('pfWildcardWrap');
    var wildcard = document.getElementById('pfWildcard');
    var subPayBlock = document.getElementById('pfSubscriptionPayBlock');
    var regularInstBlock = document.getElementById('pfRegularInstallmentsBlock');
    var itemLabel = document.querySelector('label[for="pfProductItem"]');

    if (productBlock) productBlock.classList.remove('hidden');
    if (wildcardWrap) {
      if (isProductType(itemType)) wildcardWrap.classList.remove('hidden');
      else {
        wildcardWrap.classList.add('hidden');
        if (wildcard) wildcard.checked = false;
      }
    }
    if (itemLabel) {
      itemLabel.setAttribute('data-i18n', 'field_product_item');
      itemLabel.textContent = t('field_product_item');
    }

    if (isSubscriptionType(itemType)) {
      if (subPayBlock) subPayBlock.classList.remove('hidden');
      if (regularInstBlock) regularInstBlock.classList.add('hidden');
      syncPaymentTypeFields();
    } else {
      if (subPayBlock) subPayBlock.classList.add('hidden');
      if (regularInstBlock) regularInstBlock.classList.remove('hidden');
      var instBlock = document.getElementById('pfInstallmentsBlock');
      if (instBlock) instBlock.classList.add('hidden');
      syncRegularInstallmentsFields();
    }

    fillItemSelectForType(itemType);
  }

  async function fillItemSelectForType(itemType, selectedId) {
    var type = itemType || document.getElementById('pfProductType').value || 'product';
    var el = document.getElementById('pfProductItem');
    var hint = document.getElementById('pfItemSelectHint');
    if (!el) return;
    var keepSelected = selectedId != null ? String(selectedId) : String(el.value || '');

    // Always refresh from API for the active type (avoid stale empty cache)
    itemOptionsByType[type] = null;

    if (!App.listPaymentFormItems) {
      fillSelect(el, products, {
        placeholder: t('field_item_select_ph'),
        labelKey: 'name'
      });
      if (keepSelected) ensureSelectValue(el, keepSelected);
      syncHiddenItemFields();
      return;
    }

    itemSelectLoading = true;
    el.disabled = true;
    try {
      var companyId = document.getElementById('pfCompany').value || '';
      var res = await App.listPaymentFormItems(type, {
        company_id: companyId,
        invoice_setting_id: companyId
      });
      var rows = res.rows || [];
      itemOptionsByType[type] = rows;
      fillSelect(el, rows, {
        placeholder: t('field_item_select_ph'),
        labelKey: 'name'
      });
      if (keepSelected) ensureSelectValue(el, keepSelected, keepSelected ? ('#' + keepSelected) : '');
      if (hint) {
        if (rows.length) hint.classList.add('hidden');
        else hint.classList.remove('hidden');
      }
      console.info('[PaymentForms] items for', type, rows.length, rows.map(function (r) { return r.id + ':' + r.name; }));
      syncHiddenItemFields();
    } catch (err) {
      console.warn('[PaymentForms] item list failed', type, err);
      fillSelect(el, [], { placeholder: t('field_item_select_ph') });
      if (keepSelected) ensureSelectValue(el, keepSelected, '#' + keepSelected);
      if (hint) hint.classList.remove('hidden');
    } finally {
      itemSelectLoading = false;
      el.disabled = false;
    }
  }

  function syncHiddenItemFields() {
    var el = document.getElementById('pfProductItem');
    var idEl = document.getElementById('pfProductItemId');
    var textEl = document.getElementById('pfProductText');
    if (!el) return;
    var id = el.value || '';
    var label = '';
    if (el.selectedIndex >= 0 && el.options[el.selectedIndex]) {
      label = el.options[el.selectedIndex].text || '';
    }
    if (idEl) idEl.value = id;
    if (textEl) textEl.value = label;
  }

  function syncRegularInstallmentsFields() {
    var allow = document.getElementById('pfAllowInstallmentsFlag');
    var maxWrap = document.getElementById('pfMaxInstallmentsWrap');
    if (!allow || !maxWrap) return;
    if (allow.checked) maxWrap.classList.remove('hidden');
    else maxWrap.classList.add('hidden');
  }

  /**
   * Live Payment Type is static: regular | installments (subscription path).
   */
  function buildPaymentTypeData() {
    var itemType = document.getElementById('pfProductType').value || 'product';

    if (!isSubscriptionType(itemType)) {
      // Order/product/appointment: flags drive payment_type_data (API rebuilds when omitted)
      var allow = document.getElementById('pfAllowInstallmentsFlag').checked;
      var maxInst = document.getElementById('pfMaxInstallmentsFlag').value || '';
      var makeMonthly = document.getElementById('pfMakeMonthlyInvoice').checked;
      var data = { type: allow ? 'installments' : 'regular' };
      if (allow) {
        data.number_of_payments = maxInst;
        data.number_of_payments_installments = maxInst;
        data.make_monthly_invoice = makeMonthly ? 1 : 0;
        data.order_installment = makeMonthly ? '2' : '1';
        data.regular_installments_document_type =
          normalizeDocumentType(document.getElementById('pfRegularDocType').value) || '';
      }
      return data;
    }

    var paymentType = document.getElementById('pfPaymentType').value || 'regular';
    if (paymentType !== 'installments') {
      return { type: 'regular' };
    }
    return {
      type: 'installments',
      number_of_payments: document.getElementById('pfNumPayments').value || '',
      payment_date: document.getElementById('pfPaymentDate').value || '',
      order_installment: document.getElementById('pfOrderInstallment').value || ''
    };
  }

  function syncPaymentTypeFields() {
    var itemType = document.getElementById('pfProductType').value || 'product';
    if (!isSubscriptionType(itemType)) {
      var blockOff = document.getElementById('pfInstallmentsBlock');
      if (blockOff) blockOff.classList.add('hidden');
      return;
    }
    var paymentType = document.getElementById('pfPaymentType').value || 'regular';
    var block = document.getElementById('pfInstallmentsBlock');
    if (block) {
      if (paymentType === 'installments') block.classList.remove('hidden');
      else block.classList.add('hidden');
    }
    if (paymentType === 'installments') syncOrderInstallmentOptions();
  }

  function applyPaymentTypeData(ptd) {
    document.getElementById('pfPaymentType').value = 'regular';
    document.getElementById('pfNumPayments').value = '';
    document.getElementById('pfPaymentDate').value = '';
    document.getElementById('pfOrderInstallment').value = '';
    document.getElementById('pfAllowInstallmentsFlag').checked = false;
    document.getElementById('pfMaxInstallmentsFlag').value = '';
    document.getElementById('pfMakeMonthlyInvoice').checked = false;

    if (!ptd) {
      syncItemTypeFields();
      return;
    }
    try {
      if (typeof ptd === 'string') ptd = JSON.parse(ptd);
    } catch (e) {
      ptd = null;
    }
    if (!ptd || typeof ptd !== 'object') {
      syncItemTypeFields();
      return;
    }

    var itemType = document.getElementById('pfProductType').value || 'product';
    if (!isSubscriptionType(itemType)) {
      var allow = ptd.type === 'installments' ||
        !!(ptd.number_of_payments_installments || ptd.number_of_payments);
      document.getElementById('pfAllowInstallmentsFlag').checked = !!allow;
      document.getElementById('pfMaxInstallmentsFlag').value =
        ptd.number_of_payments_installments || ptd.number_of_payments || '';
      document.getElementById('pfMakeMonthlyInvoice').checked =
        Number(ptd.make_monthly_invoice) === 1 || String(ptd.order_installment) === '2';
      var regDoc = ptd.regular_installments_document_type || '';
      if (regDoc) {
        var regEl = document.getElementById('pfRegularDocType');
        ensureSelectValue(regEl, normalizeDocumentType(regDoc));
      }
      syncItemTypeFields();
      return;
    }

    var type = ptd.type === 'installments' ? 'installments' : 'regular';
    document.getElementById('pfPaymentType').value = type;
    if (type === 'installments') {
      document.getElementById('pfNumPayments').value =
        ptd.number_of_payments || ptd.number_of_payments_installments || '';
      if (ptd.payment_date) {
        document.getElementById('pfPaymentDate').value = String(ptd.payment_date).slice(0, 10);
      }
      syncOrderInstallmentOptions();
      document.getElementById('pfOrderInstallment').value = ptd.order_installment || '';
    }
    syncItemTypeFields();
  }

  function resolveItemIdFromForm() {
    var el = document.getElementById('pfProductItem');
    if (el && el.value) return el.value;
    var hiddenId = document.getElementById('pfProductItemId');
    return hiddenId && hiddenId.value ? hiddenId.value : '';
  }

  function applyRowToForm(row) {
    row = row || {};
    document.getElementById('pfName').value = row.name || row.form_name || '';
    document.getElementById('pfAmount').value = row.amount != null ? row.amount : '';
    document.getElementById('pfProductType').value = row.iteam_type || row.item_type || 'product';
    document.getElementById('pfAskCustomer').checked = Number(row.ask_to_customer) === 1;
    document.getElementById('pfAllowChangeAmount').checked = Number(row.change_value_with_customer) === 1;
    document.getElementById('pfRequireCompanyId').checked = Number(row.need_to_show_company_id) === 1;
    document.getElementById('pfWildcard').checked = Number(row.allow_wild_card_product) === 1;

    var req = parseRequiredFields(row.required_fields);
    if (!req.length) req = ['name', 'mobile'];
    document.getElementById('pfReqName').checked = req.indexOf('name') !== -1;
    document.getElementById('pfReqEmail').checked = req.indexOf('email') !== -1;
    document.getElementById('pfReqPhone').checked = req.indexOf('mobile') !== -1 || req.indexOf('phone') !== -1;

    var company = row.invoice_setting_id != null ? String(row.invoice_setting_id) : '';
    var companyEl = document.getElementById('pfCompany');
    if (company && companyEl && !Array.prototype.some.call(companyEl.options, function (o) { return o.value === company; })) {
      companyEl.insertAdjacentHTML('beforeend', '<option value="' + escapeHtml(company) + '">#' + escapeHtml(company) + '</option>');
    }
    companyEl.value = company;

    document.getElementById('pfGateway').value =
      row.payment_gatway != null && row.payment_gatway !== ''
        ? String(row.payment_gatway)
        : (row.payment_gateway != null && row.payment_gateway !== '' ? String(row.payment_gateway) : '');
    ensureSelectValue(
      document.getElementById('pfGateway'),
      document.getElementById('pfGateway').value
    );

    var itemId = row.iteam_id != null && row.iteam_id !== ''
      ? String(row.iteam_id)
      : (row.item_id != null ? String(row.item_id) : '');
    var itemName = row.item_name || (row.raw && row.raw.item_name) || '';
    document.getElementById('pfProductItemId').value = itemId;
    document.getElementById('pfProductText').value = itemName || itemId || '';
    fillItemSelectForType(document.getElementById('pfProductType').value || 'product', itemId);

    setDocumentTypeValue(row.document_type || '');
    var regDoc = document.getElementById('pfRegularDocType');
    if (regDoc) {
      ensureSelectValue(regDoc, normalizeDocumentType(row.document_type || ''));
    }
    applyPaymentTypeData(row.payment_type_data);
  }

  async function openModal(row) {
    editingId = row ? row.id : null;
    document.getElementById('modalTitle').textContent =
      row ? t('modal_edit_title') : t('modal_title');

    applyRowToForm(null);
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');

    // Live account gateways (like COMPANY list) — refresh each open
    var keepGateway = row
      ? (row.payment_gatway != null && row.payment_gatway !== ''
        ? String(row.payment_gatway)
        : (row.payment_gateway != null ? String(row.payment_gateway) : ''))
      : '';
    await refreshGateways(keepGateway);

    if (row && row.id != null && App.getPaymentForm) {
      try {
        var detail = await App.getPaymentForm(row.id);
        applyRowToForm(detail.form || row);
      } catch (err) {
        console.warn('[PaymentForms] Get failed, using list row', err);
        applyRowToForm(row);
      }
    } else if (row) {
      applyRowToForm(row);
    }

    setTimeout(function () {
      document.getElementById('pfName').focus();
    }, 50);
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    editingId = null;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = t('submit');
    }
  }

  function findById(id) {
    id = String(id);
    for (var i = 0; i < forms.length; i++) {
      if (String(forms[i].id) === id) return forms[i];
    }
    return null;
  }

  function buildPayloadFromForm() {
    var name = document.getElementById('pfName').value.trim();
    var amountRaw = document.getElementById('pfAmount').value.trim();
    var itemType = document.getElementById('pfProductType').value || 'product';
    var reqFields = collectRequiredFields();
    var amount = amountRaw === '' ? 0 : Number(String(amountRaw).replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(amount)) amount = 0;

    var itemId = resolveItemIdFromForm();
    var paymentTypeData = buildPaymentTypeData();
    var docType = '';
    if (isSubscriptionType(itemType)) {
      docType = normalizeDocumentType(document.getElementById('pfDocument').value);
    } else {
      docType = normalizeDocumentType(document.getElementById('pfRegularDocType').value);
    }

    var allowInst = isSubscriptionType(itemType)
      ? (paymentTypeData.type === 'installments' ? 1 : 0)
      : (document.getElementById('pfAllowInstallmentsFlag').checked ? 1 : 0);
    var maxInst = isSubscriptionType(itemType)
      ? (paymentTypeData.number_of_payments || 0)
      : (document.getElementById('pfMaxInstallmentsFlag').value || 0);

    var payload = {
      form_name: name,
      name: name,
      amount: amount,
      iteam_type: itemType,
      item_type: itemType,
      invoice_setting_id: document.getElementById('pfCompany').value,
      payment_gatway: document.getElementById('pfGateway').value,
      payment_gateway: document.getElementById('pfGateway').value,
      iteam_id: itemId,
      item_id: itemId,
      document_type: docType || undefined,
      ask_to_customer: document.getElementById('pfAskCustomer').checked ? 1 : 0,
      change_value_with_customer: document.getElementById('pfAllowChangeAmount').checked ? 1 : 0,
      allow_wild_card_product: document.getElementById('pfWildcard').checked ? 1 : 0,
      need_to_show_company_id: document.getElementById('pfRequireCompanyId').checked ? 1 : 0,
      required_fields: reqFields,
      payment_type_data: paymentTypeData,
      allow_installments: allowInst,
      max_installments: maxInst,
      make_monthly_invoice: document.getElementById('pfMakeMonthlyInvoice').checked ? 1 : 0,
      regular_installments_document_type: !isSubscriptionType(itemType) ? (docType || '') : ''
    };
    return payload;
  }

  formsBody.addEventListener('click', async function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn || loading) return;
    var tr = btn.closest('tr[data-id]');
    if (!tr) return;
    var row = findById(tr.getAttribute('data-id'));
    if (!row) return;
    var action = btn.getAttribute('data-action');

    if (action === 'edit') {
      if (guestMode) return;
      openModal(row);
      return;
    }

    if (action === 'copy') {
      btn.disabled = true;
      try {
        var detail = await App.getPaymentForm(row.id).catch(function () {
          return { form: row };
        });
        var src = detail.form || row;
        var srcPtd = src.payment_type_data;
        try {
          if (typeof srcPtd === 'string') srcPtd = JSON.parse(srcPtd);
        } catch (e) {
          srcPtd = null;
        }
        var payload = {
          form_name: (src.form_name || src.name || '') + ' (copy)',
          amount: src.amount,
          iteam_type: src.iteam_type || src.item_type || 'product',
          invoice_setting_id: src.invoice_setting_id,
          payment_gatway: src.payment_gatway || src.payment_gateway,
          iteam_id: src.iteam_id || src.item_id,
          document_type: normalizeDocumentType(src.document_type) || undefined,
          ask_to_customer: src.ask_to_customer,
          change_value_with_customer: src.change_value_with_customer,
          required_fields: parseRequiredFields(src.required_fields),
          payment_type_data: srcPtd && srcPtd.type ? srcPtd : { type: 'regular' },
          allow_installments: srcPtd && srcPtd.type === 'installments' ? 1 : 0
        };
        if (!payload.invoice_setting_id || !payload.payment_gatway || !payload.iteam_id) {
          alert(t('err_copy_missing'));
          openModal(src);
          editingId = null;
          document.getElementById('modalTitle').textContent = t('modal_title');
          document.getElementById('pfName').value = payload.form_name;
          return;
        }
        await App.addPaymentForm(payload);
        currentPage = 1;
        await loadForms();
        notifyFormsChanged();
      } catch (err) {
        alert(apiErrorMessage(err));
      } finally {
        btn.disabled = false;
      }
      return;
    }

    if (action === 'delete') {
      if (guestMode) return;
      if (!confirm(t('confirm_delete'))) return;
      btn.disabled = true;
      try {
        await App.deletePaymentForm(row.id);
        await loadForms();
        notifyFormsChanged();
      } catch (err) {
        alert(apiErrorMessage(err));
      } finally {
        btn.disabled = false;
      }
    }
  });

  document.getElementById('btnAddForm').addEventListener('click', function () {
    openModal(null);
  });

  var btnShareLink = document.getElementById('btnShareLink');
  if (btnShareLink) {
    btnShareLink.addEventListener('click', async function () {
      if (guestMode) return;
      btnShareLink.disabled = true;
      try {
        await copyShareLinkForRow(forms[0] || {});
        alert(t('link_copied'));
      } catch (err) {
        alert(err && err.message ? err.message : t('err_no_link'));
      } finally {
        btnShareLink.disabled = false;
      }
    });
  }

  document.getElementById('pfPaymentType').addEventListener('change', syncPaymentTypeFields);
  document.getElementById('pfProductType').addEventListener('change', syncItemTypeFields);
  document.getElementById('pfAllowInstallmentsFlag').addEventListener('change', syncRegularInstallmentsFields);
  document.getElementById('pfProductItem').addEventListener('change', syncHiddenItemFields);
  document.getElementById('pfCompany').addEventListener('change', function () {
    // Company can affect item search results for non-product types
    var type = document.getElementById('pfProductType').value || 'product';
    itemOptionsByType[type] = null;
    fillItemSelectForType(type, document.getElementById('pfProductItem').value || '');
  });
  document.getElementById('pfDocument').addEventListener('change', function () {
    if ((document.getElementById('pfPaymentType').value || '') === 'installments') {
      syncOrderInstallmentOptions();
    }
  });
  document.getElementById('btnCloseModal').addEventListener('click', closeModal);
  document.getElementById('btnCancelModal').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });

  if (errorState) {
    errorState.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'btnRetryLoad') loadForms();
    });
  }

  searchInput.addEventListener('input', function () {
    currentPage = 1;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      loadForms();
    }, 350);
  });

  btnPrevPage.addEventListener('click', function () {
    if (currentPage <= 1 || loading) return;
    currentPage -= 1;
    loadForms();
  });

  btnNextPage.addEventListener('click', function () {
    if (loading || currentPage >= totalPages()) return;
    currentPage += 1;
    loadForms();
  });

  editor.addEventListener('submit', async function (e) {
    e.preventDefault();
    var name = document.getElementById('pfName').value.trim();
    var reqEmail = document.getElementById('pfReqEmail').checked;
    var reqPhone = document.getElementById('pfReqPhone').checked;
    var company = document.getElementById('pfCompany').value;
    var gateway = document.getElementById('pfGateway').value;
    var itemType = document.getElementById('pfProductType').value || 'product';
    var itemId = resolveItemIdFromForm();
    var wildcard = document.getElementById('pfWildcard').checked;

    if (!name) {
      alert(t('err_name_required'));
      document.getElementById('pfName').focus();
      return;
    }
    if (!reqEmail && !reqPhone) {
      alert(t('req_hint'));
      return;
    }
    if (!company) {
      alert(t('err_company_required'));
      document.getElementById('pfCompany').focus();
      return;
    }
    if (!gateway) {
      alert(t('err_gateway_required'));
      document.getElementById('pfGateway').focus();
      return;
    }
    if (!itemId && !(isProductType(itemType) && wildcard)) {
      alert(t('err_product_required'));
      document.getElementById('pfProductItem').focus();
      return;
    }
    if (!isSubscriptionType(itemType)) {
      var regDoc = document.getElementById('pfRegularDocType').value;
      if (!regDoc) {
        alert(t('err_document_required'));
        document.getElementById('pfRegularDocType').focus();
        return;
      }
      if (document.getElementById('pfAllowInstallmentsFlag').checked) {
        var maxI = Number(document.getElementById('pfMaxInstallmentsFlag').value);
        if (!maxI || maxI <= 0) {
          alert(t('err_max_installments'));
          document.getElementById('pfMaxInstallmentsFlag').focus();
          return;
        }
      }
    }

    var payload = buildPayloadFromForm();
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = t('saving');
    }

    try {
      if (editingId != null) {
        payload.payment_form_id = editingId;
        payload.id = editingId;
        await App.updatePaymentForm(payload);
      } else {
        await App.addPaymentForm(payload);
        currentPage = 1;
      }
      closeModal();
      await loadForms();
      notifyFormsChanged();
    } catch (err) {
      alert(apiErrorMessage(err));
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = t('submit');
      }
    }
  });

  document.getElementById('themeToggle').addEventListener('click', function () {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('biz1demo_theme', next);
  });

  document.querySelectorAll('.lang-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = btn.getAttribute('data-lang');
      if (window.setLanguage) window.setLanguage(next);
      else {
        localStorage.setItem('lang', next);
        location.search = '?lang=' + next;
      }
    });
  });

  document.getElementById('btnLogout').addEventListener('click', function () {
    var msg = guestMode ? t('confirm_guest_exit') : t('confirm_logout');
    if (!confirm(msg)) return;
    try {
      if (App.clearGuestMode) App.clearGuestMode();
      App.clearSession({});
    } catch (e) { /* ignore */ }
    location.replace('login.html');
  });

  window.addEventListener('mineralbar:lang', function () {
    renderTable();
    applyGuestUi();
    fillSelect(document.getElementById('pfCompany'), invoiceSettings, {
      placeholder: t('field_company'),
      labelKey: 'name'
    });
    fillGatewaySelect(document.getElementById('pfGateway').value);
    fillItemSelectForType(document.getElementById('pfProductType').value || 'product', document.getElementById('pfProductItem').value || '');
  });

  function urlHasGuestToken() {
    try {
      if (/(^|[?&])(token|guest)=/.test(String(location.search || ''))) return true;
      if (/#(token|guest)=/.test(String(location.hash || ''))) return true;
    } catch (e) { /* ignore */ }
    return false;
  }

  function showInvalidTokenGate(message) {
    guestMode = false;
    try {
      if (App.clearGuestMode) App.clearGuestMode();
    } catch (e0) { /* ignore */ }
    try {
      if (App.clearSession) App.clearSession({});
    } catch (e1) { /* ignore */ }

    var shell = document.getElementById('appShell');
    if (shell) shell.classList.add('hidden');

    var modal = document.getElementById('formModal');
    if (modal) modal.classList.add('hidden');

    var gate = document.getElementById('invalidTokenGate');
    var text = document.getElementById('invalidTokenText');
    var msg = message || t('err_invalid_token');
    if (text) text.textContent = msg;
    if (gate) {
      var title = gate.querySelector('h1');
      if (title) title.textContent = t('err_invalid_token_title');
      gate.classList.remove('hidden');
    } else {
      document.body.innerHTML =
        '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;padding:24px;text-align:center">' +
          '<div><h1 style="margin:0 0 8px">Invalid token</h1><p style="margin:0;color:#5d6b82">' +
          escapeHtml(msg) +
          '</p></div></div>';
    }
  }

  async function boot() {
    try {
      var guestCode = App.getGuestCodeFromLocation
        ? App.getGuestCodeFromLocation(location)
        : '';
      var guestToken = App.getGuestTokenFromLocation
        ? App.getGuestTokenFromLocation(location)
        : '';
      var tokenInUrl = !!(guestToken || guestCode || urlHasGuestToken());
      var guestPayload = null;

      if (tokenInUrl) {
        try {
          if (App.resolveGuestShareFromLocation) {
            guestPayload = await App.resolveGuestShareFromLocation(location);
          } else if (App.parseGuestShareFromLocation) {
            guestPayload = App.parseGuestShareFromLocation(location);
          }
        } catch (resolveErr) {
          console.warn('[PaymentForms] guest resolve failed', resolveErr);
          if (typeof initLanguage === 'function') initLanguage();
          showInvalidTokenGate(t('err_invalid_token'));
          return;
        }

        if (!guestPayload) {
          if (typeof initLanguage === 'function') initLanguage();
          showInvalidTokenGate(t('err_invalid_token'));
          return;
        }

        try {
          await App.acceptGuestShare(guestPayload);
          guestMode = true;
          if (App.normalizeGuestUrl) App.normalizeGuestUrl(guestToken || guestCode);
        } catch (guestErr) {
          console.warn('[PaymentForms] guest accept failed', guestErr);
          if (typeof initLanguage === 'function') initLanguage();
          showInvalidTokenGate(t('err_invalid_token'));
          return;
        }

        if (!App.isAuthenticated || !App.isAuthenticated()) {
          if (typeof initLanguage === 'function') initLanguage();
          showInvalidTokenGate(t('err_invalid_token'));
          return;
        }
      } else if (App.isGuestMode && App.isGuestMode()) {
        guestMode = true;
      }

      if (!guestMode) {
        if (App.ensureAuth) {
          var client = await App.ensureAuth('login.html');
          if (!client) return;
        } else if (!App.isAuthenticated || !App.isAuthenticated()) {
          location.replace('login.html');
          return;
        }
      }
      // Guest mode: never call ensureAuth → login.html
    } catch (e) {
      console.warn('[PaymentForms] boot failed', e);
      if (urlHasGuestToken() || (App.isGuestMode && App.isGuestMode())) {
        if (typeof initLanguage === 'function') initLanguage();
        showInvalidTokenGate(t('err_invalid_token'));
        return;
      }
      location.replace('login.html');
      return;
    }

    if (typeof initLanguage === 'function') initLanguage();
    applyGuestUi();
    var shell = document.getElementById('appShell');
    if (shell) shell.classList.remove('hidden');
    startRealtimeUpdates();
    await loadLookups();
    await loadForms();
  }

  boot();
})();
