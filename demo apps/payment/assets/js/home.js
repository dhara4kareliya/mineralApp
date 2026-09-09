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
  var currentView = 'leads';
  var selectedLead = null;
  var leads = [];
  var leadsTotal = 0;
  var leadsPage = 1;
  var leadsLoading = false;
  var leadsSearchTimer = null;
  var assignTemplates = [];
  var lookupsReady = false;

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
  var leadsView = document.getElementById('leadsView');
  var formsView = document.getElementById('formsView');
  var leadsBody = document.getElementById('leadsBody');
  var leadsEmptyState = document.getElementById('leadsEmptyState');
  var leadsLoadingState = document.getElementById('leadsLoadingState');
  var leadsErrorState = document.getElementById('leadsErrorState');
  var leadsErrorText = document.getElementById('leadsErrorText');
  var leadsSearchInput = document.getElementById('leadsSearchInput');
  var leadsPager = document.getElementById('leadsPager');
  var leadsPageInfo = document.getElementById('leadsPageInfo');
  var btnLeadsPrev = document.getElementById('btnLeadsPrev');
  var btnLeadsNext = document.getElementById('btnLeadsNext');
  var btnBackLeads = document.getElementById('btnBackLeads');
  var selectedLeadNameEl = document.getElementById('selectedLeadName');
  var selectedLeadBlock = document.getElementById('selectedLeadBlock');
  var selectedLeadAvatar = document.getElementById('selectedLeadAvatar');
  var assignFormWrap = document.getElementById('assignFormWrap');
  var assignFormSelect = document.getElementById('assignFormSelect');
  var btnAssignForm = document.getElementById('btnAssignForm');
  var formsHeadRow = document.getElementById('formsHeadRow');
  var formsSearchWrap = document.getElementById('formsSearchWrap');
  var formsTableWrap = document.getElementById('formsTableWrap');
  var formsTable = document.getElementById('formsTable');
  var btnNavLeads = document.getElementById('btnNavLeads');
  var btnHeaderAdd = document.getElementById('btnHeaderAdd');
  var profileWrap = document.getElementById('profileWrap');
  var btnProfile = document.getElementById('btnProfile');
  var profileMenu = document.getElementById('profileMenu');
  var profileAvatar = document.getElementById('profileAvatar');
  var profileUsernameEl = document.getElementById('profileUsername');
  var profileEmailEl = document.getElementById('profileEmail');

  function isTemplatesView() {
    return currentView === 'templates';
  }

  function isCustomerFormsView() {
    return currentView === 'forms' && !!selectedLead;
  }

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

  function getProfileDetails() {
    var user = (App.getUser && App.getUser()) || {};
    var loginId = String((App.getEmail && App.getEmail()) || '').trim();
    var email = String(user.email || user.mail || '').trim();
    var username = String(
      user.username || user.user_name || user.login || user.user || ''
    ).trim();
    var display = String(
      user.full_name || user.display_name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.name || ''
    ).trim();
    if (!email && loginId.indexOf('@') !== -1) email = loginId;
    if (!username) {
      if (loginId && loginId.indexOf('@') === -1) username = loginId;
      else if (display) username = display;
      else if (email) username = email.split('@')[0];
    }
    if (!email) email = '';
    return {
      username: username || '—',
      email: email || '—',
      initials: leadInitials(display || username || email || loginId)
    };
  }

  function fillProfile() {
    if (!profileWrap) return;
    profileWrap.classList.remove('hidden');
    var info = getProfileDetails();
    if (profileUsernameEl) profileUsernameEl.textContent = info.username;
    if (profileEmailEl) profileEmailEl.textContent = info.email;
    if (profileAvatar && info.initials) {
      profileAvatar.textContent = info.initials;
      profileAvatar.classList.add('has-initials');
    }
  }

  function closeProfileMenu() {
    if (profileMenu) profileMenu.classList.add('hidden');
    if (btnProfile) {
      btnProfile.classList.remove('is-open');
      btnProfile.setAttribute('aria-expanded', 'false');
    }
  }

  function toggleProfileMenu() {
    if (!profileMenu) return;
    var open = profileMenu.classList.contains('hidden');
    if (open) {
      fillProfile();
      profileMenu.classList.remove('hidden');
      if (btnProfile) {
        btnProfile.classList.add('is-open');
        btnProfile.setAttribute('aria-expanded', 'true');
      }
    } else {
      closeProfileMenu();
    }
  }

  var paintedViewKey = '';

  function playViewEnter(el) {
    if (!el) return;
    el.classList.remove('view-enter');
    void el.offsetWidth;
    el.classList.add('view-enter');
  }

  function leadFromHash() {
    var m = String(location.hash || '').match(/(?:^|#|&)lead=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  function setLeadHash(lead, replace) {
    var path = location.pathname + location.search;
    var url = lead ? path + '#lead=' + encodeURIComponent(lead.id) : path;
    var state = { view: lead ? 'forms' : 'leads', leadId: lead ? String(lead.id) : '' };
    try {
      if (replace) history.replaceState(state, '', url);
      else if (location.hash !== (lead ? '#lead=' + encodeURIComponent(lead.id) : '')) {
        history.pushState(state, '', url);
      }
    } catch (e) { /* ignore */ }
  }

  function applyViewUi() {
    var showLeads = currentView === 'leads';
    var showForms = isTemplatesView() || isCustomerFormsView();
    if (leadsView) {
      if (showLeads) leadsView.classList.remove('hidden');
      else leadsView.classList.add('hidden');
    }
    if (formsView) {
      if (showForms) formsView.classList.remove('hidden');
      else formsView.classList.add('hidden');
      formsView.classList.toggle('forms-view--lead', isCustomerFormsView());
    }

    var addBtn = document.getElementById('btnAddForm');
    if (btnNavLeads) {
      btnNavLeads.classList.remove('hidden');
      btnNavLeads.classList.toggle('is-active', currentView === 'leads' || currentView === 'forms');
    }
    if (btnHeaderAdd) btnHeaderAdd.classList.remove('hidden');

    if (currentView === 'templates') {
      if (btnBackLeads) btnBackLeads.classList.add('hidden');
      fillSelectedLeadChip(null);
      if (assignFormWrap) assignFormWrap.classList.remove('hidden');
      if (btnAssignForm) btnAssignForm.classList.add('hidden');
      if (addBtn) addBtn.classList.add('hidden');
      if (formsSearchWrap) formsSearchWrap.classList.add('hidden');
      if (formsTable) formsTable.classList.add('hidden');
      if (emptyState) emptyState.classList.add('hidden');
      if (pager) pager.classList.add('hidden');
    } else {
      if (addBtn) addBtn.classList.add('hidden');
      if (formsSearchWrap) formsSearchWrap.classList.add('hidden');
      if (formsTable) formsTable.classList.remove('hidden');
      if (btnAssignForm) btnAssignForm.classList.remove('hidden');
      if (btnBackLeads) {
        if (currentView === 'forms') btnBackLeads.classList.remove('hidden');
        else btnBackLeads.classList.add('hidden');
      }
      if (selectedLeadBlock || selectedLeadNameEl) {
        if (currentView === 'forms' && selectedLead) fillSelectedLeadChip(selectedLead);
        else fillSelectedLeadChip(null);
      }
      if (assignFormWrap) {
        if (currentView === 'forms' && selectedLead) assignFormWrap.classList.remove('hidden');
        else assignFormWrap.classList.add('hidden');
      }
    }
    syncTemplatesTableWrap();
    renderFormsHeader();
    var key = currentView;
    if (key !== paintedViewKey) {
      paintedViewKey = key;
      if (showLeads) playViewEnter(leadsView);
      else if (showForms) playViewEnter(formsView);
    }
  }

  function syncTemplatesTableWrap() {
    if (!formsTableWrap) return;
    if (!isTemplatesView()) {
      formsTableWrap.classList.remove('hidden');
      return;
    }
    var hasError = errorState && !errorState.classList.contains('hidden');
    if (loading || hasError) formsTableWrap.classList.remove('hidden');
    else formsTableWrap.classList.add('hidden');
  }

  function renderFormsHeader() {
    if (!formsHeadRow) return;
    if (isTemplatesView()) {
      formsHeadRow.innerHTML =
        '<th class="col-id">' + escapeHtml(t('col_id')) + '</th>' +
        '<th>' + escapeHtml(t('col_name')) + '</th>' +
        '<th>' + escapeHtml(t('col_item_type')) + '</th>' +
        '<th class="col-amount">' + escapeHtml(t('col_amount')) + '</th>' +
        '<th class="col-action">' + escapeHtml(t('col_action')) + '</th>';
      return;
    }
    formsHeadRow.innerHTML =
      '<th class="col-id">' + escapeHtml(t('col_id')) + '</th>' +
      '<th>' + escapeHtml(t('col_name')) + '</th>' +
      '<th>' + escapeHtml(t('col_item_name')) + '</th>' +
      '<th class="col-amount">' + escapeHtml(t('col_amount')) + '</th>' +
      '<th class="col-status">' + escapeHtml(t('col_status')) + '</th>' +
      '<th class="col-action">' + escapeHtml(t('col_action')) + '</th>';
  }

  function statusBadgeHtml(row) {
    var paid = !!(row && (row.paid || /^paid$/i.test(String(row.status || ''))));
    var label = paid ? t('status_paid') : t('status_unpaid');
    var cls = paid ? 'status-badge status-badge--paid' : 'status-badge status-badge--unpaid';
    return '<span class="' + cls + '">' + escapeHtml(label) + '</span>';
  }

  function fillAssignSelect(rows) {
    if (!assignFormSelect) return;
    var current = assignFormSelect.value;
    var html = '<option value="" data-i18n="select_payment_form">' + escapeHtml(t('select_payment_form')) + '</option>';
    (rows || []).forEach(function (row) {
      var id = row && (row.id != null ? row.id : row.payment_form_id);
      if (id == null || id === '') return;
      var label = row.name || row.form_name || ('#' + id);
      html += '<option value="' + escapeHtml(id) + '">' + escapeHtml(label) + '</option>';
    });
    assignFormSelect.innerHTML = html;
    if (current) assignFormSelect.value = current;
  }

  function showLeadsView(opts) {
    opts = opts || {};
    selectedLead = null;
    currentView = 'leads';
    currentPage = 1;
    forms = [];
    totalCount = 0;
    applyViewUi();
    if (opts.keepList && leads.length) renderLeadsTable();
    else loadLeads();
    if (!opts.fromHistory) setLeadHash(null, true);
  }

  function showFormsForLead(lead, opts) {
    opts = opts || {};
    selectedLead = lead;
    currentView = 'forms';
    currentPage = 1;
    forms = [];
    totalCount = 0;
    applyViewUi();
    loadForms();
    if (!opts.fromHistory) setLeadHash(lead, false);
  }

  async function openAddFormPopup() {
    if (!lookupsReady) {
      try { await loadLookups(); } catch (e) { /* still open form */ }
    }
    openModal(null);
  }

  async function showTemplatesView() {
    selectedLead = null;
    currentView = 'templates';
    currentPage = 1;
    forms = [];
    totalCount = 0;
    applyViewUi();
    if (!lookupsReady) {
      try { await loadLookups(); } catch (e) { /* still try list */ }
    }
    await loadForms();
  }

  function setLeadsBusy(isBusy) {
    leadsLoading = !!isBusy;
    if (leadsLoadingState) {
      if (leadsLoading) leadsLoadingState.classList.remove('hidden');
      else leadsLoadingState.classList.add('hidden');
    }
    if (leadsSearchInput) leadsSearchInput.disabled = leadsLoading;
    if (btnLeadsPrev) btnLeadsPrev.disabled = leadsLoading || leadsPage <= 1;
    if (btnLeadsNext) btnLeadsNext.disabled = leadsLoading;
  }

  function showLeadsError(msg) {
    if (!leadsErrorState) return;
    if (leadsErrorText) leadsErrorText.textContent = msg || t('err_load_leads');
    leadsErrorState.classList.remove('hidden');
  }

  function clearLeadsError() {
    if (leadsErrorState) leadsErrorState.classList.add('hidden');
  }

  function leadsTotalPages() {
    return Math.max(1, Math.ceil((leadsTotal || 0) / PAGE_SIZE));
  }

  function renderLeadsPager() {
    var pages = leadsTotalPages();
    if (!leadsPager) return;
    if (leadsTotal <= PAGE_SIZE) {
      leadsPager.classList.add('hidden');
      return;
    }
    leadsPager.classList.remove('hidden');
    if (leadsPageInfo) {
      leadsPageInfo.textContent = t('page_of')
        .replace('{page}', String(leadsPage))
        .replace('{pages}', String(pages));
    }
    if (btnLeadsPrev) btnLeadsPrev.disabled = leadsLoading || leadsPage <= 1;
    if (btnLeadsNext) btnLeadsNext.disabled = leadsLoading || leadsPage >= pages;
  }

  function findLeadById(id) {
    id = String(id);
    for (var i = 0; i < leads.length; i++) {
      if (String(leads[i].id) === id) return leads[i];
    }
    return null;
  }

  function leadInitials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    var a = parts[0].charAt(0);
    var b = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (a + b).toUpperCase();
  }

  function uiIcon(kind) {
    var inner = {
      open: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
      copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
      trash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
      edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'
    };
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (inner[kind] || '') + '</svg>';
  }

  function fillSelectedLeadChip(lead) {
    if (!selectedLeadBlock) return;
    if (!lead) {
      selectedLeadBlock.classList.add('hidden');
      return;
    }
    var name = lead.name || ('#' + lead.id);
    if (selectedLeadNameEl) selectedLeadNameEl.textContent = name;
    if (selectedLeadAvatar) {
      selectedLeadAvatar.textContent = leadInitials(name);
      selectedLeadAvatar.className = 'lead-avatar tone-' + leadAvatarTone(lead.id);
    }
    selectedLeadBlock.classList.remove('hidden');
  }

  function leadAvatarTone(id) {
    var n = 0;
    String(id || '').split('').forEach(function (ch) { n += ch.charCodeAt(0); });
    return String((n % 6) + 1);
  }

  function renderLeadsTable() {
    if (!leadsBody) return;
    var leadsTable = document.getElementById('leadsTable');
    if (leadsLoading && !leads.length) {
      leadsBody.innerHTML = '';
      if (leadsEmptyState) leadsEmptyState.classList.add('hidden');
      if (leadsPager) leadsPager.classList.add('hidden');
      if (leadsTable) leadsTable.classList.add('hidden');
      return;
    }
    if (!leads.length) {
      leadsBody.innerHTML = '';
      if (leadsEmptyState) leadsEmptyState.classList.remove('hidden');
      if (leadsPager) leadsPager.classList.add('hidden');
      if (leadsTable) leadsTable.classList.add('hidden');
      return;
    }
    if (leadsEmptyState) leadsEmptyState.classList.add('hidden');
    if (leadsTable) leadsTable.classList.remove('hidden');
    leadsBody.innerHTML = leads.map(function (row) {
      var name = row.name || ('#' + row.id);
      var phone = row.mobile || '';
      var email = row.email || '';
      var meta = [phone, email].filter(Boolean).join(' · ');
      return (
        '<tr class="lead-row" data-id="' + escapeHtml(row.id) + '" tabindex="0">' +
          '<td colspan="3">' +
            '<div class="lead-card">' +
              '<span class="lead-avatar tone-' + leadAvatarTone(row.id) + '">' + escapeHtml(leadInitials(name)) + '</span>' +
              '<span class="lead-copy">' +
                '<span class="lead-name">' + escapeHtml(name) + '</span>' +
                '<span class="lead-meta">' + escapeHtml(meta || '—') + '</span>' +
              '</span>' +
              '<span class="lead-go" aria-hidden="true">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>' +
              '</span>' +
            '</div>' +
          '</td>' +
        '</tr>'
      );
    }).join('');
    renderLeadsPager();
  }

  async function loadLeads(opts) {
    opts = opts || {};
    var silent = !!opts.silent;
    if (!App.listLeads) {
      showLeadsError(t('err_load_leads'));
      return;
    }
    if (!silent) {
      setLeadsBusy(true);
      clearLeadsError();
    }
    try {
      var q = String((leadsSearchInput && leadsSearchInput.value) || '').trim();
      var start = (leadsPage - 1) * PAGE_SIZE;
      var filters = {
        limit: PAGE_SIZE,
        length: PAGE_SIZE,
        start: start
      };
      if (q) filters.search = q;

      var listRes = await App.listLeads(filters);
      leads = listRes.rows || [];

      var countRes = await App.countLeads(q ? { search: q } : {}).catch(function () {
        return { count: listRes.count || leads.length };
      });
      leadsTotal = Number(countRes.count);
      if (!Number.isFinite(leadsTotal) || leadsTotal < leads.length) {
        leadsTotal = listRes.count != null ? Number(listRes.count) : leads.length;
      }
      if (leads.length < PAGE_SIZE && leadsPage === 1) {
        leadsTotal = leads.length;
      }
      var pages = leadsTotalPages();
      if (leadsPage > pages) leadsPage = pages;
      if (leadsPage < 1) leadsPage = 1;
      renderLeadsTable();
    } catch (err) {
      console.error('[PaymentForms] leads load failed', err);
      if (!silent) {
        leads = [];
        leadsTotal = 0;
        renderLeadsTable();
        showLeadsError(apiErrorMessage(err) || t('err_load_leads'));
      }
    } finally {
      if (!silent) setLeadsBusy(false);
      renderLeadsPager();
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
    syncTemplatesTableWrap();
  }

  function showError(msg) {
    if (!errorState) return;
    if (errorText) errorText.textContent = msg || t('err_load_forms');
    errorState.classList.remove('hidden');
    syncTemplatesTableWrap();
  }

  function clearError() {
    if (errorState) errorState.classList.add('hidden');
    syncTemplatesTableWrap();
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
    if (!pager) return;
    if (isTemplatesView() || totalCount <= PAGE_SIZE) {
      pager.classList.add('hidden');
      return;
    }
    var pages = totalPages();
    pager.classList.remove('hidden');
    pageInfo.textContent = t('page_of')
      .replace('{page}', String(currentPage))
      .replace('{pages}', String(pages));
    btnPrevPage.disabled = loading || currentPage <= 1;
    btnNextPage.disabled = loading || currentPage >= pages;
  }

  function renderTable() {
    if (isTemplatesView()) {
      fillAssignSelect(forms);
      if (formsBody) formsBody.innerHTML = '';
      if (emptyState) emptyState.classList.add('hidden');
      if (pager) pager.classList.add('hidden');
      if (formsTable) formsTable.classList.add('hidden');
      syncTemplatesTableWrap();
      return;
    }

    if (!formsBody) return;

    if (formsTable) formsTable.classList.remove('hidden');

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
    renderFormsHeader();
    var leadId = selectedLead
      ? (selectedLead.customer_id != null ? selectedLead.customer_id : selectedLead.id)
      : '';
    formsBody.innerHTML = forms.map(function (row) {
      if (isCustomerFormsView()) {
        var paidId = row.payment_forms_paid_id != null ? row.payment_forms_paid_id : row.id;
        var itemName = String(row.item_name || '').trim();
        var actionsHtml =
          '<button type="button" class="action-btn" data-action="open" title="' + escapeHtml(t('action_open')) + '">' +
            uiIcon('open') +
          '</button>' +
          '<button type="button" class="action-btn" data-action="copy-link" title="' + escapeHtml(t('action_copy_link')) + '">' +
            uiIcon('copy') +
          '</button>' +
          '<button type="button" class="action-btn action-btn--danger js-delete-assigned" data-action="delete-assigned" data-paid-id="' + escapeHtml(paidId) + '" data-customer-id="' + escapeHtml(leadId) + '" title="' + escapeHtml(t('action_delete')) + '">' +
            uiIcon('trash') +
          '</button>';
        return (
          '<tr data-id="' + escapeHtml(paidId) + '">' +
            '<td class="col-id">' + escapeHtml(row.id) + '</td>' +
            '<td>' + escapeHtml(row.name || row.form_name) + '</td>' +
            '<td class="' + (itemName ? '' : 'col-muted') + '">' + escapeHtml(itemName || '—') + '</td>' +
            '<td class="col-amount">' + escapeHtml(formatAmount(row.amount)) + '</td>' +
            '<td class="col-status">' + statusBadgeHtml(row) + '</td>' +
            '<td class="col-action"><div class="actions">' + actionsHtml + '</div></td>' +
          '</tr>'
        );
      }

      var actionsHtml =
        '<button type="button" class="action-btn" data-action="copy" title="' + escapeHtml(t('action_copy')) + '">' +
          uiIcon('copy') +
        '</button>' +
        '<button type="button" class="action-btn" data-action="edit" title="' + escapeHtml(t('action_edit')) + '">' +
          uiIcon('edit') +
        '</button>' +
        '<button type="button" class="action-btn action-btn--danger" data-action="delete" title="' + escapeHtml(t('action_delete')) + '">' +
          uiIcon('trash') +
        '</button>';
      return (
        '<tr data-id="' + escapeHtml(row.id) + '">' +
          '<td class="col-id">' + escapeHtml(row.id) + '</td>' +
          '<td>' + escapeHtml(row.name || row.form_name) + '</td>' +
          '<td class="col-type">' + escapeHtml(row.item_type || row.iteam_type) + '</td>' +
          '<td class="col-amount">' + escapeHtml(formatAmount(row.amount)) + '</td>' +
          '<td class="col-action"><div class="actions">' + actionsHtml + '</div></td>' +
        '</tr>'
      );
    }).join('');

    bindAssignedDeleteButtons();
    renderPager();
    if (isCustomerFormsView()) fillAssignSelect(assignTemplates);
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
    lookupsReady = true;
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
      if (isCustomerFormsView()) {
        var start = (currentPage - 1) * PAGE_SIZE;
        var listRes = await App.listCustomerPaymentForms(selectedLead.id, {
          limit: PAGE_SIZE,
          length: PAGE_SIZE,
          start: start,
          include_templates: 1
        });
        forms = listRes.rows || [];
        assignTemplates = listRes.templates || [];
        if (!assignTemplates.length && App.listPaymentForms) {
          var tplRes = await App.listPaymentForms({ limit: 25, length: 25, start: 0 }).catch(function () {
            return { rows: [] };
          });
          assignTemplates = tplRes.rows || [];
        }
        fillAssignSelect(assignTemplates);

        var countRes = await App.countCustomerPaymentForms(selectedLead.id).catch(function () {
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
        return;
      }

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
    if (!isTemplatesView() && !isCustomerFormsView()) return;
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

  function setSocketUi(status, lastKey, error) {
    var el = document.getElementById('socketStatus');
    var text = document.getElementById('socketStatusText');
    if (!el) return;
    var st = status || 'off';
    el.setAttribute('data-status', st);
    var labels = {
      ready: t('socket_live'),
      connecting: t('socket_connecting'),
      loading_io: t('socket_connecting'),
      offline: t('socket_offline'),
      error: t('socket_error'),
      off: t('socket_offline')
    };
    var label = labels[st] || st;
    if (text) text.textContent = label;
    var title = label;
    if (lastKey) title += ' · ' + lastKey;
    if (error) title += ' · ' + error;
    el.title = title;
    el.setAttribute('aria-label', title);
  }

  function flashSocketUi() {
    var el = document.getElementById('socketStatus');
    if (!el) return;
    el.classList.remove('is-flash');
    void el.offsetWidth;
    el.classList.add('is-flash');
    setTimeout(function () {
      el.classList.remove('is-flash');
    }, 700);
  }

  function refreshSocketUiFromState() {
    var state = App.getRealtimeState ? App.getRealtimeState() : null;
    if (!state) {
      setSocketUi('off');
      return;
    }
    var lastKey = state.lastEvent && state.lastEvent.key;
    setSocketUi(state.status, lastKey, state.error);
  }

  function realtimeTouchesSelectedLead(detail) {
    if (!isCustomerFormsView() || !selectedLead) return false;
    var payload = detail && detail.event && detail.event.payload;
    if (!payload) return true;
    var cid = payload.customer_id != null
      ? payload.customer_id
      : (payload.customer && (payload.customer.id || payload.customer.customer_id));
    if (cid == null || cid === '') return true;
    return String(cid) === String(selectedLead.id);
  }

  function startRealtimeUpdates() {
    if (!App.connectRealtime) return;

    setSocketUi('connecting');

    window.addEventListener('mineralbar:socket-status', function (ev) {
      var detail = (ev && ev.detail) || {};
      var lastKey = App.getRealtimeState && App.getRealtimeState().lastEvent
        ? App.getRealtimeState().lastEvent.key
        : '';
      setSocketUi(detail.status, lastKey, detail.error);
    });
    window.addEventListener('mineralbar:leads', function (ev) {
      if (currentView === 'leads') {
        loadLeads({ silent: true });
      }
      if (realtimeTouchesSelectedLead((ev && ev.detail) || {})) {
        scheduleFormsReload('leads-event');
      }
    });
    window.addEventListener('mineralbar:payment-forms', function () {
      scheduleFormsReload('payment-forms');
    });
    window.addEventListener('mineralbar:realtime', function (ev) {
      var detail = (ev && ev.detail) || {};
      flashSocketUi();
      var lastKey = detail.key || (detail.lastEvent && detail.lastEvent.key);
      setSocketUi('ready', lastKey);
      if (detail.group === 'paymentForms') {
        scheduleFormsReload(detail.key || 'realtime');
        return;
      }
      var key = String(detail.key || '').toLowerCase();
      if (/payment[_\s-]?form|paymentforms|gvia|collection.?form/.test(key)) {
        scheduleFormsReload(key);
        return;
      }
      if (detail.group === 'leads' || /customer|crm\.lead/.test(key)) {
        if (currentView === 'leads') loadLeads({ silent: true });
        if (realtimeTouchesSelectedLead(detail)) scheduleFormsReload(key || 'customer');
      }
    });
    window.addEventListener('mineralbar:socket', function (ev) {
      var detail = (ev && ev.detail) || {};
      if (detail.type === 'ready') {
        setSocketUi('ready');
        console.info('[PaymentForms] socket ready', (detail.registered || []).length, 'events', detail.registered);
      } else if (detail.type === 'event') {
        flashSocketUi();
        setSocketUi('ready', detail.key);
      } else if (detail.type === 'connect') {
        setSocketUi('connecting');
      } else if (detail.type === 'error') {
        setSocketUi('error', '', detail.error);
      } else if (detail.type === 'disconnect') {
        setSocketUi('offline');
      }
    });

    var state = App.getRealtimeState ? App.getRealtimeState() : null;
    if (state && state.connected && state.status === 'ready') {
      setSocketUi('ready', state.lastEvent && state.lastEvent.key);
      return;
    }

    App.connectRealtime()
      .then(function (res) {
        return res && res.promise ? res.promise : res;
      })
      .then(function (ready) {
        setSocketUi('ready');
        console.info('[PaymentForms] realtime connected', ready && ready.userId, ready && ready.events ? ready.events.length : 0, ready && ready.events);
      })
      .catch(function (err) {
        setSocketUi('error', '', (err && err.message) || String(err));
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
    clearFormErrors();
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

  function formErrorEl(wrap) {
    if (!wrap) return null;
    var err = wrap.querySelector('.field-error');
    if (err) return err;
    err = document.createElement('div');
    err.className = 'field-error';
    err.setAttribute('role', 'alert');
    wrap.appendChild(err);
    return err;
  }

  function fieldWrapFor(el) {
    return el && el.closest ? el.closest('.field') : null;
  }

  function showFormBanner(msg) {
    var el = document.getElementById('formEditorError');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('hidden', !msg);
  }

  function clearFieldError(el) {
    if (!el) return;
    el.classList.remove('is-invalid');
    el.removeAttribute('aria-invalid');
    var wrap = fieldWrapFor(el);
    if (!wrap) return;
    wrap.classList.remove('is-invalid');
    var err = wrap.querySelector('.field-error');
    if (err) {
      err.textContent = '';
      err.classList.add('hidden');
    }
    var hint = wrap.querySelector('[data-i18n="req_hint"]');
    if (hint) hint.classList.remove('is-error');
  }

  function clearFormErrors() {
    showFormBanner('');
    if (!editor) return;
    var invalids = editor.querySelectorAll('.is-invalid, .ds-input.is-invalid');
    for (var i = 0; i < invalids.length; i++) {
      invalids[i].classList.remove('is-invalid');
      invalids[i].removeAttribute('aria-invalid');
    }
    var msgs = editor.querySelectorAll('.field-error');
    for (var j = 0; j < msgs.length; j++) {
      msgs[j].textContent = '';
      msgs[j].classList.add('hidden');
    }
    var hints = editor.querySelectorAll('.field-hint.is-error');
    for (var k = 0; k < hints.length; k++) hints[k].classList.remove('is-error');
  }

  function setFieldError(inputOrId, message) {
    var el = typeof inputOrId === 'string' ? document.getElementById(inputOrId) : inputOrId;
    if (!el) return;
    el.classList.add('is-invalid');
    el.setAttribute('aria-invalid', 'true');
    var wrap = fieldWrapFor(el);
    if (!wrap) return;
    wrap.classList.add('is-invalid');
    var err = formErrorEl(wrap);
    if (err) {
      err.textContent = message || '';
      err.classList.toggle('hidden', !message);
    }
  }

  function setRequiredContactError(on) {
    var email = document.getElementById('pfReqEmail');
    var wrap = fieldWrapFor(email);
    var hint = wrap && wrap.querySelector('[data-i18n="req_hint"]');
    if (wrap) wrap.classList.toggle('is-invalid', on);
    if (hint) hint.classList.toggle('is-error', on);
  }

  function validatePaymentFormEditor() {
    clearFormErrors();
    var first = null;
    function fail(id, msg) {
      setFieldError(id, msg);
      if (!first) first = document.getElementById(id);
    }

    var name = document.getElementById('pfName').value.trim();
    var reqEmail = document.getElementById('pfReqEmail').checked;
    var reqPhone = document.getElementById('pfReqPhone').checked;
    var company = document.getElementById('pfCompany').value;
    var gateway = document.getElementById('pfGateway').value;
    var itemType = document.getElementById('pfProductType').value || 'product';
    var itemId = resolveItemIdFromForm();
    var wildcard = document.getElementById('pfWildcard').checked;

    if (!name) fail('pfName', t('err_name_required'));
    var amountRaw = document.getElementById('pfAmount').value.trim();
    var amountNum = Number(String(amountRaw).replace(/[^\d.-]/g, ''));
    if (!amountRaw || !Number.isFinite(amountNum)) {
      fail('pfAmount', t('err_amount_required'));
    }
    if (!reqEmail && !reqPhone) {
      setRequiredContactError(true);
      if (!first) first = document.getElementById('pfReqEmail');
    }
    if (!company) fail('pfCompany', t('err_company_required'));
    if (!gateway) fail('pfGateway', t('err_gateway_required'));
    if (!itemId && !(isProductType(itemType) && wildcard)) {
      fail('pfProductItem', t('err_product_required'));
    }
    if (!isSubscriptionType(itemType)) {
      var regDoc = document.getElementById('pfRegularDocType').value;
      if (!regDoc) fail('pfRegularDocType', t('err_document_required'));
      if (document.getElementById('pfAllowInstallmentsFlag').checked) {
        var maxI = Number(document.getElementById('pfMaxInstallmentsFlag').value);
        if (!maxI || maxI <= 0) fail('pfMaxInstallmentsFlag', t('err_max_installments'));
      }
    }

    if (first) {
      try { first.focus(); } catch (eFocus) { /* ignore */ }
      try { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (eScroll) { /* ignore */ }
      return false;
    }
    return true;
  }

  function closeModal() {
    clearFormErrors();
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    editingId = null;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = t('submit');
    }
    if (isTemplatesView() && assignFormSelect) assignFormSelect.value = '';
  }

  function bindAssignedDeleteButtons() {
    if (!formsBody) return;
    var list = formsBody.querySelectorAll('[data-action="delete-assigned"]');
    for (var i = 0; i < list.length; i++) {
      list[i].onclick = function (ev) {
        if (ev) {
          ev.preventDefault();
          ev.stopPropagation();
        }
        runDeleteAssigned(this);
      };
    }
  }

  var deleteAssignedBusy = {};

  async function runDeleteAssigned(btn) {
    if (!btn) return;
    var paidId = btn.getAttribute('data-paid-id');
    var customerId = btn.getAttribute('data-customer-id');
    if (!paidId && btn.closest) {
      var tr = btn.closest('tr[data-id]');
      if (tr) paidId = tr.getAttribute('data-id');
    }
    if (!customerId && selectedLead) {
      customerId = selectedLead.customer_id != null ? selectedLead.customer_id : selectedLead.id;
    }
    if (!customerId || !paidId) {
      showError(t('err_load_forms'));
      return;
    }
    var busyKey = String(customerId) + ':' + String(paidId);
    if (deleteAssignedBusy[busyKey]) return;
    deleteAssignedBusy[busyKey] = true;
    btn.disabled = true;
    try {
      await App.deleteCustomerPaymentForm(customerId, paidId);
      forms = forms.filter(function (r) {
        return String(r.id) !== String(paidId) && String(r.payment_forms_paid_id) !== String(paidId);
      });
      renderTable();
      await loadForms();
      notifyFormsChanged();
    } catch (err) {
      showError(apiErrorMessage(err) || t('err_load_forms'));
      try { await loadForms(); } catch (e2) { /* keep banner error */ }
    } finally {
      deleteAssignedBusy[busyKey] = false;
      if (btn && btn.disabled) btn.disabled = false;
    }
  }

  function findById(id) {
    id = String(id);
    for (var i = 0; i < forms.length; i++) {
      var row = forms[i];
      if (String(row.id) === id) return row;
      if (row.payment_forms_paid_id != null && String(row.payment_forms_paid_id) === id) return row;
    }
    return null;
  }

  function assignedFormLink(row) {
    if (!row) return '';
    var raw = row.raw || {};
    var keys = ['payment_url', 'payment_link', 'public_link', 'template_payment_link', 'pay_url', 'link'];
    var i;
    for (i = 0; i < keys.length; i++) {
      var v = String(row[keys[i]] || raw[keys[i]] || '').trim();
      if (v && v.indexOf('[object') !== 0) return v;
    }
    return '';
  }

  function assignedTemplateId(row) {
    if (!row) return '';
    var raw = row.raw || {};
    var id = row.payment_form_id || raw.payment_form_id || raw.form_id || raw.template_id || raw.paymentforms_id;
    return id == null || id === '' ? '' : String(id);
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

  document.addEventListener('click', function (e) {
    var el = e.target && e.target.nodeType === 3 ? e.target.parentNode : e.target;
    var btn = null;
    while (el && el !== document) {
      if (el.getAttribute && el.getAttribute('data-action') === 'delete-assigned') {
        btn = el;
        break;
      }
      el = el.parentElement || el.parentNode;
    }
    if (!btn) return;
    e.preventDefault();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    e.stopPropagation();
    runDeleteAssigned(btn);
  }, true);

  var formsClickRoot = formsTableWrap || formsTable || formsBody;
  if (formsClickRoot) formsClickRoot.addEventListener('click', async function (e) {
    var btn = e.target.closest ? e.target.closest('[data-action]') : null;
    if (!btn) {
      var el = e.target && e.target.nodeType === 3 ? e.target.parentElement : e.target;
      while (el && el !== formsClickRoot) {
        if (el.getAttribute && el.getAttribute('data-action')) {
          btn = el;
          break;
        }
        el = el.parentElement || el.parentNode;
      }
    }
    if (!btn || btn.disabled) return;
    var tr = btn.closest ? btn.closest('tr[data-id]') : null;
    if (!tr) {
      var node = btn.parentElement;
      while (node && node !== formsClickRoot) {
        if (node.tagName === 'TR' && node.getAttribute('data-id')) {
          tr = node;
          break;
        }
        node = node.parentElement;
      }
    }
    if (!tr) return;
    var row = findById(tr.getAttribute('data-id'));
    var action = btn.getAttribute('data-action');
    if (!row && action !== 'delete-assigned') {
      console.warn('[PaymentForms] row not found', tr.getAttribute('data-id'), forms);
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    if (action === 'open') {
      var url = assignedFormLink(row);
      if (!url) {
        alert(t('err_no_link'));
        return;
      }
      window.open(url, '_blank', 'noopener');
      return;
    }

    if (action === 'copy-link') {
      btn.disabled = true;
      try {
        var link = assignedFormLink(row);
        if (link) {
          await copyTextToClipboard(link);
          alert(t('link_copied'));
          return;
        }
        var templateId = assignedTemplateId(row);
        if (selectedLead && templateId && App.addCustomerPaymentForm) {
          await App.addCustomerPaymentForm(selectedLead.id, templateId);
          currentPage = 1;
          await loadForms();
          notifyFormsChanged();
          return;
        }
        alert(t('err_no_link'));
      } catch (err) {
        alert(apiErrorMessage(err) || t('err_copy_failed'));
      } finally {
        btn.disabled = false;
      }
      return;
    }

    if (action === 'delete-assigned') {
      runDeleteAssigned(btn);
      return;
    }

    if (action === 'edit') {
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

  if (assignFormSelect) {
    assignFormSelect.addEventListener('change', function () {
      if (!isTemplatesView() || loading) return;
      var id = assignFormSelect.value;
      if (!id) return;
      var row = findById(id);
      if (row) openModal(row);
    });
  }

  if (btnAssignForm) {
    btnAssignForm.addEventListener('click', async function () {
      if (!selectedLead || loading) return;
      var formId = assignFormSelect ? assignFormSelect.value : '';
      if (!formId) {
        alert(t('err_select_form'));
        if (assignFormSelect) assignFormSelect.focus();
        return;
      }
      btnAssignForm.disabled = true;
      try {
        await App.addCustomerPaymentForm(selectedLead.id, formId);
        currentPage = 1;
        await loadForms();
        notifyFormsChanged();
      } catch (err) {
        alert(apiErrorMessage(err));
      } finally {
        btnAssignForm.disabled = false;
      }
    });
  }

  if (btnNavLeads) {
    btnNavLeads.addEventListener('click', function () {
      if (currentView === 'leads') return;
      showLeadsView({ keepList: true });
    });
  }

  if (btnHeaderAdd) {
    btnHeaderAdd.addEventListener('click', function () {
      openAddFormPopup();
    });
  }

  if (btnBackLeads) {
    btnBackLeads.addEventListener('click', function () {
      if (/#lead=/.test(String(location.hash || ''))) {
        history.back();
        return;
      }
      showLeadsView({ keepList: true });
    });
  }

  if (leadsBody) {
    leadsBody.addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-id]');
      if (!tr || leadsLoading) return;
      var lead = findLeadById(tr.getAttribute('data-id'));
      if (lead) showFormsForLead(lead);
    });
    leadsBody.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var tr = e.target.closest('tr[data-id]');
      if (!tr || leadsLoading) return;
      e.preventDefault();
      var lead = findLeadById(tr.getAttribute('data-id'));
      if (lead) showFormsForLead(lead);
    });
  }

  if (leadsErrorState) {
    leadsErrorState.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'btnRetryLeads') loadLeads();
    });
  }

  if (leadsSearchInput) {
    leadsSearchInput.addEventListener('input', function () {
      leadsPage = 1;
      clearTimeout(leadsSearchTimer);
      leadsSearchTimer = setTimeout(function () {
        loadLeads();
      }, 350);
    });
  }

  if (btnLeadsPrev) {
    btnLeadsPrev.addEventListener('click', function () {
      if (leadsPage <= 1 || leadsLoading) return;
      leadsPage -= 1;
      loadLeads();
    });
  }

  if (btnLeadsNext) {
    btnLeadsNext.addEventListener('click', function () {
      if (leadsLoading || leadsPage >= leadsTotalPages()) return;
      leadsPage += 1;
      loadLeads();
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
    if (!validatePaymentFormEditor()) return;

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
      var msg = apiErrorMessage(err) || t('err_load_forms');
      showFormBanner(msg);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = t('submit');
      }
    }
  });

  function clearEditorFieldFromEvent(e) {
    var el = e && e.target;
    if (!el || !editor.contains(el)) return;
    if (el.id === 'pfReqEmail' || el.id === 'pfReqPhone' || el.id === 'pfReqName') {
      setRequiredContactError(false);
      return;
    }
    if (el.classList && (el.classList.contains('ds-input') || el.type === 'checkbox' || el.type === 'number' || el.type === 'text' || el.tagName === 'SELECT')) {
      clearFieldError(el);
    }
    if (el.id === 'pfWildcard') clearFieldError(document.getElementById('pfProductItem'));
    if (el.id === 'pfAllowInstallmentsFlag') clearFieldError(document.getElementById('pfMaxInstallmentsFlag'));
  }

  editor.addEventListener('input', clearEditorFieldFromEvent);
  editor.addEventListener('change', clearEditorFieldFromEvent);

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
      else if (window.initLanguage) {
        localStorage.setItem('lang', next);
        window.initLanguage();
      }
    });
  });

  if (btnProfile) {
    btnProfile.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleProfileMenu();
    });
  }
  if (profileMenu) {
    profileMenu.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }
  document.addEventListener('click', function () {
    closeProfileMenu();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeProfileMenu();
  });

  function doLogout() {
    try {
      if (App.clearSession) App.clearSession({});
    } catch (e1) { /* ignore */ }
    try { localStorage.removeItem('biz1_sdk_bearer_token'); } catch (e2) { /* ignore */ }
    try { localStorage.removeItem('biz1demo_role'); } catch (e3) { /* ignore */ }
    location.replace('login.html');
  }

  function bindLogoutButton(el) {
    if (!el) return;
    el.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      doLogout();
    });
  }

  bindLogoutButton(document.getElementById('btnLogout'));
  bindLogoutButton(document.getElementById('btnProfileLogout'));

  window.addEventListener('mineralbar:lang', function () {
    applyViewUi();
    refreshSocketUiFromState();
    renderLeadsTable();
    renderTable();
    fillProfile();
    if (isCustomerFormsView()) fillAssignSelect(assignTemplates);
    else fillAssignSelect(forms);
    if (!lookupsReady) return;
    fillSelect(document.getElementById('pfCompany'), invoiceSettings, {
      placeholder: t('field_company'),
      labelKey: 'name'
    });
    fillGatewaySelect(document.getElementById('pfGateway').value);
    fillItemSelectForType(document.getElementById('pfProductType').value || 'product', document.getElementById('pfProductItem').value || '');
  });

  async function boot() {
    try {
      if (App.ensureAuth) {
        var client = await App.ensureAuth('login.html');
        if (!client) return;
      } else if (!App.isAuthenticated || !App.isAuthenticated()) {
        location.replace('login.html');
        return;
      }
    } catch (e) {
      console.warn('[PaymentForms] boot failed', e);
      location.replace('login.html');
      return;
    }

    if (typeof initLanguage === 'function') initLanguage();
    fillProfile();
    var shell = document.getElementById('appShell');
    if (shell) shell.classList.remove('hidden');
    startRealtimeUpdates();
    currentView = 'leads';
    applyViewUi();
    await loadLeads();
    var hashLeadId = leadFromHash();
    if (hashLeadId) {
      var hashed = findLeadById(hashLeadId) || { id: hashLeadId, name: '#' + hashLeadId };
      showFormsForLead(hashed, { fromHistory: true });
    }
  }

  window.addEventListener('popstate', function () {
    var id = leadFromHash();
    if (id) {
      var lead = findLeadById(id) || { id: id, name: '#' + id };
      showFormsForLead(lead, { fromHistory: true });
    } else {
      showLeadsView({ fromHistory: true, keepList: true });
    }
  });

  boot();
})();
