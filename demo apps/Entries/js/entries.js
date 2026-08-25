
(function () {
  'use strict';

  var PAGE_SIZE = (window.EntriesConfig && EntriesConfig.PAGE_SIZE) || 25;
  var esc = EntriesUI.escapeHtml;

  var state = {
    basic: null,
    list: [],
    tabs: [],
    groups: [],
    navLevel: 'customers',
    selectedGroupId: '',
    selectedCustomerId: '',
    selectedCustomerLabel: '',
    selectedCustomerFolderId: '',
    customerDetail: null,
    customerDetailLoading: false,
    customerDetailError: '',
    automationTarget: 'entries',
    customerSettingsLoaded: false,
    customerSettingsFolderId: '',
    entryId: '',
    search: '',
    offset: 0,
    total: 0,
    rows: [],
    loading: false,
    browseCustomers: [],
    browseTotal: 0,
    browseOffset: 0,
    browseSearch: '',
    browseLoading: false,
    browseFolderId: '',
    folderCounts: {},
    modalMode: 'add',
    editingRow: null,
    deleteRow: null,
    disconnectRealtime: null,
    socketEvents: [],
    pulseTimers: {},
    customers: [],
    customersTotal: 0,
    customersLoading: false,
    customersLoadPromise: null,
    folderPicker: null,
    customerPicker: null,
    rowCustomerSelectedId: '',
    hiddenColumns: {},
    columnOrder: [],
    sortKey: '',
    sortDir: 'desc',
    fieldPickerQuery: '',
    selectedIds: {},
    customerStatusSaving: false,
    internalStatusesByFolder: {},
    internalStatusesLoadedByFolder: {},
    internalStatusesLoadingByFolder: {},
    sidebarEditKey: '',
    customerSidebarSaving: false
  };

  var applyingHistory = false;

  var boot = document.getElementById('boot');
  var app = document.getElementById('app');
  var navBackBtn = document.getElementById('navBackBtn');
  var navTitle = document.getElementById('navTitle');
  var customerBrowse = document.getElementById('customerBrowse');
  var customerBrowseForm = document.getElementById('customerBrowseForm');
  var customerBrowseInput = document.getElementById('customerBrowseInput');
  var customerBrowseList = document.getElementById('customerBrowseList');
  var folderStrip = document.getElementById('folderStrip');
  var clearCustomerBrowseBtn = document.getElementById('clearCustomerBrowseBtn');
  var customerTableScroll = document.getElementById('customerTableScroll');
  var customerTableHead = document.getElementById('customerTableHead');
  var customerTableBody = document.getElementById('customerTableBody');
  var groupPicker = document.getElementById('groupPicker');
  var customerDetail = document.getElementById('customerDetail');
  var customerEditModal = document.getElementById('customerEditModal');
  var customerEditForm = document.getElementById('customerEditForm');
  var customerEditError = document.getElementById('customerEditError');
  var customerEditName = document.getElementById('customerEditName');
  var customerEditCompany = document.getElementById('customerEditCompany');
  var customerEditPhone = document.getElementById('customerEditPhone');
  var customerEditEmail = document.getElementById('customerEditEmail');
  var customerEditNotes = document.getElementById('customerEditNotes');
  var customerEditDynamic = document.getElementById('customerEditDynamic');
  var customerEditSaveBtn = document.getElementById('customerEditSaveBtn');
  var deleteCustomerModal = document.getElementById('deleteCustomerModal');
  var confirmDeleteCustomerBtn = document.getElementById('confirmDeleteCustomerBtn');
  var entryPicker = document.getElementById('entryPicker');
  var dataToolbar = document.getElementById('dataToolbar');
  var tablePanel = document.getElementById('tablePanel');
  var pagerBar = document.getElementById('pagerBar');
  var searchForm = document.getElementById('searchForm');
  var searchInput = document.getElementById('searchInput');
  var clearSearchBtn = document.getElementById('clearSearchBtn');
  var addBtn = document.getElementById('addBtn');
  var addEntryTopBtn = document.getElementById('addEntryTopBtn');
  // var addRowBtn = document.getElementById('addRowBtn');
  // var deleteEntrySettingsBtn = document.getElementById('deleteEntrySettingsBtn');
  var addEntryDataBtn = document.getElementById('addEntryDataBtn');
  var emptyAddBtn = document.getElementById('emptyAddBtn');
  var listMeta = document.getElementById('listMeta');
  var listError = document.getElementById('listError');
  var emptyState = document.getElementById('emptyState');
  var tableScroll = document.getElementById('tableScroll');
  var tableHead = document.getElementById('entryTableHead');
  var tableBody = document.getElementById('entryTableBody');
  var pagerPages = document.getElementById('pagerPages');
  var userNameEl = document.getElementById('userName');
  var userEmailEl = document.getElementById('userEmail');
  var userAvatar = document.getElementById('userAvatar');
  var pageSubtitle = document.getElementById('pageSubtitle');
  var livePill = document.getElementById('livePill');
  var liveText = document.getElementById('liveText');
  var formModal = document.getElementById('formModal');
  var deleteModal = document.getElementById('deleteModal');
  var deleteSettingsModal = document.getElementById('deleteSettingsModal');
  var deleteSettingsText = document.getElementById('deleteSettingsText');
  var confirmDeleteSettingsBtn = document.getElementById('confirmDeleteSettingsBtn');
  var entryForm = document.getElementById('entryForm');
  var formError = document.getElementById('formError');
  var dynamicFields = document.getElementById('dynamicFields');
  var formModalTitle = document.getElementById('formModalTitle');
  var formModalSubtitle = document.getElementById('formModalSubtitle');
  var saveBtn = document.getElementById('saveBtn');
  var rowCustomerPickerWrap = document.getElementById('rowCustomerPickerWrap');
  var rowCustomerDisplay = document.getElementById('rowCustomerDisplay');
  var rowCustomerPanel = document.getElementById('rowCustomerPanel');
  var rowCustomerList = document.getElementById('rowCustomerList');
  var rowCustomerLoadMore = document.getElementById('rowCustomerLoadMore');
  var rowCustomerField = document.getElementById('rowCustomerField');
  var entryCustWrap = document.getElementById('entryCustWrap');
  var entryCustIdInput = document.getElementById('entryCustIdInput');
  var confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  var settingsModal = document.getElementById('settingsModal');
  var settingsForm = document.getElementById('settingsForm');
  var settingsError = document.getElementById('settingsError');
  var customFieldRows = document.getElementById('customFieldRows');
  var addCustomFieldBtn = document.getElementById('addCustomFieldBtn');
  var setTabNameEn = document.getElementById('setTabNameEn');
  var setTabNameHe = document.getElementById('setTabNameHe');
  var folderSelect = document.getElementById('folderSelect');
  var folderTags = document.getElementById('folderTags');
  var customerPickerWrap = document.getElementById('customerPickerWrap');
  var customerSearch = document.getElementById('customerSearch');
  var customerPanel = document.getElementById('customerPanel');
  var customerMenu = document.getElementById('customerMenu');
  var customerLoadMore = document.getElementById('customerLoadMore');
  var customerTags = document.getElementById('customerTags');
  var setShowInHeader = document.getElementById('setShowInHeader');
  var setCopyCustomer = document.getElementById('setCopyCustomer');
  var setUseCustomer = document.getElementById('setUseCustomer');
  var setEntryFolderWrap = document.getElementById('setEntryFolderWrap');
  var setEntryFolderId = document.getElementById('setEntryFolderId');
  var settingsSaveBtn = document.getElementById('settingsSaveBtn');
  var fieldModal = document.getElementById('fieldModal');
  var fieldForm = document.getElementById('fieldForm');
  var fieldModalTitle = document.getElementById('fieldModalTitle');
  var fieldModalError = document.getElementById('fieldModalError');
  var fieldTypeSelect = document.getElementById('fieldTypeSelect');
  var fieldDetailsWrap = document.getElementById('fieldDetailsWrap');
  var fieldLabelEn = document.getElementById('fieldLabelEn');
  var fieldLabelHe = document.getElementById('fieldLabelHe');
  var fieldDefaultValue = document.getElementById('fieldDefaultValue');
  var fieldSaveBtn = document.getElementById('fieldSaveBtn');
  var fieldPicker = document.getElementById('fieldPicker');
  var fieldPickerBtn = document.getElementById('fieldPickerBtn');
  var fieldPickerPanel = document.getElementById('fieldPickerPanel');
  var fieldPickerSearch = document.getElementById('fieldPickerSearch');
  var fieldPickerList = document.getElementById('fieldPickerList');
  var bulkBar = document.getElementById('bulkBar');
  var bulkMeta = document.getElementById('bulkMeta');
  var runAutomationBtn = document.getElementById('runAutomationBtn');
  var automationModal = document.getElementById('automationModal');
  var automationForm = document.getElementById('automationForm');
  var automationError = document.getElementById('automationError');
  var automationSelect = document.getElementById('automationSelect');
  var automationSubmitBtn = document.getElementById('automationSubmitBtn');
  var automationResetBtn = document.getElementById('automationResetBtn');
  var exportDataBtn = document.getElementById('exportDataBtn');
  var exportDataBulkBtn = document.getElementById('exportDataBulkBtn');
  var COL_PREFS_KEY = 'entries_column_prefs';
  var CUSTOMER_ADMIN_URL = (EntriesAPI.apiDomain() || '') + '/dashboard/admin';

  function selectedTab() {
    if (state.entryId == null || state.entryId === '') return null;
    var sources = (state.tabs || []).concat(state.list || []);
    for (var i = 0; i < sources.length; i += 1) {
      var id = sources[i].id != null ? sources[i].id : sources[i].entry_id;
      if (String(id) === String(state.entryId)) return sources[i];
    }
    return EntriesAPI.findTab(state.basic, state.entryId);
  }

  function applyBasicTabs() {
    var tabsInfo = EntriesAPI.getEntryTabs(state.basic);
    state.list = tabsInfo.list;
    state.tabs = tabsInfo.tabs;
    state.groups = tabsInfo.groups || [];
  }

  function applyCustomerSettings(rows) {
    var basicTabs = EntriesAPI.getEntryTabs(state.basic);
    var merged = mergeCustomerTabs(rows, basicTabs.tabs.concat(basicTabs.list));
    state.list = merged;
    state.tabs = merged;
    state.groups = EntriesAPI.filterGroupsByTabs(basicTabs.groups, merged);
  }

  function mergeCustomerTabs(settingsRows, basicTabs) {
    var byId = {};
    (basicTabs || []).forEach(function (tab) {
      var id = EntriesAPI.tabRefId(tab);
      if (id) byId[id] = tab;
    });
    var seen = {};
    var out = [];
    (settingsRows || []).forEach(function (row) {
      var id = EntriesAPI.tabRefId(row);
      if (!id || seen[id]) return;
      seen[id] = true;
      var basic = byId[id] || {};
      var settingsFields = Array.isArray(row.fields) ? row.fields : [];
      var basicFields = Array.isArray(basic.fields) ? basic.fields : [];
      out.push(Object.assign({}, basic, row, {
        id: id,
        entry_id: row.entry_id || basic.entry_id || id,
        fields: settingsFields.length ? settingsFields : basicFields
      }));
    });
    return out;
  }

  function findBrowseCustomer(id) {
    var wanted = String(id || '');
    for (var i = 0; i < (state.browseCustomers || []).length; i += 1) {
      if (EntriesAPI.customerListId(state.browseCustomers[i]) === wanted) {
        return state.browseCustomers[i];
      }
    }
    return null;
  }

  function customerTabs() {
    return (state.list && state.list.length) ? state.list : (state.tabs || []);
  }

  function tabFields(tab) {
    return tab && Array.isArray(tab.fields) ? tab.fields : [];
  }

  function needsEntryCustomer(tab) {
    if (!tab) return false;
    return (
      tab.use_customer_for_entry === 1 ||
      tab.use_customer_for_entry === true ||
      tab.use_customer_for_entry === '1' ||
      (tab.entry_customer && (
        tab.entry_customer.enabled === true ||
        tab.entry_customer.enabled === 1 ||
        tab.entry_customer.enabled === '1'
      ))
    );
  }

  function setLive(on) {
    livePill.classList.toggle('is-on', !!on);
    liveText.setAttribute('data-i18n', on ? 'live' : 'offline');
    liveText.textContent = EntriesUI.t(on ? 'live' : 'offline');
  }

  function showListError(msg) {
    if (!msg) {
      listError.classList.add('hidden');
      listError.textContent = '';
      return;
    }
    listError.textContent = msg;
    listError.classList.remove('hidden');
  }

  function showFormError(msg) {
    if (!msg) {
      formError.classList.add('hidden');
      formError.textContent = '';
      return;
    }
    formError.textContent = msg;
    formError.classList.remove('hidden');
  }

  function renderUser() {
    var name = EntriesAPI.getUserDisplayName(state.basic);
    var email = EntriesAPI.getUserEmail(state.basic);
    if (email && email.toLowerCase() === String(name).toLowerCase()) email = '';
    userNameEl.textContent = name;
    userEmailEl.textContent = email;
    userAvatar.textContent = String(name).trim().charAt(0).toUpperCase() || 'U';
    var tab = selectedTab();
    pageSubtitle.textContent = tab ? EntriesAPI.tabName(tab) : 'Biz1';
  }

  function findGroup(groupId) {
    if (!groupId) return null;
    for (var i = 0; i < state.groups.length; i += 1) {
      if (String(state.groups[i].id) === String(groupId)) return state.groups[i];
    }
    return null;
  }

  function selectedCustomerId() {
    return String(state.selectedCustomerId || '').trim();
  }

  function scopedListParams(extra) {
    var params = Object.assign({}, extra || {});
    if (selectedCustomerId()) params.customer_id = selectedCustomerId();
    return params;
  }

  function updateView() {
    var isCustomers = state.navLevel === 'customers';
    var isGroups = state.navLevel === 'groups';
    var isData = state.navLevel === 'data';

    navBackBtn.classList.toggle('hidden', isCustomers);
    if (customerBrowse) customerBrowse.classList.toggle('hidden', !isCustomers);
    if (customerDetail) customerDetail.classList.toggle('hidden', !isGroups);
    groupPicker.classList.add('hidden');
    entryPicker.classList.toggle('hidden', isCustomers || isGroups);
    dataToolbar.classList.toggle('hidden', !isData);
    tablePanel.classList.toggle('hidden', !(isData || isCustomers));
    if (tableScroll) tableScroll.classList.toggle('hidden', !isData);
    if (customerTableScroll) customerTableScroll.classList.toggle('hidden', !isCustomers);
    if (isCustomers && emptyState) emptyState.classList.add('hidden');
    pagerBar.classList.toggle('hidden', !(isData || isCustomers));
    if (bulkBar) bulkBar.classList.toggle('hidden', !isData);

    renderUser();

    if (isCustomers) {
      navTitle.textContent = EntriesUI.t('customersTitle');
      renderCustomerBrowse();
      renderPager({
        total: state.browseTotal,
        offset: state.browseOffset,
        loading: state.browseLoading
      });
      return;
    }

    if (isGroups) {
      navTitle.textContent = state.selectedCustomerLabel || EntriesUI.t('groupsTitle');
      renderCustomerDetail();
      renderGroupPicker();
      return;
    }

    var customerLabel = state.selectedCustomerLabel || '';
    var group = findGroup(state.selectedGroupId);
    var tab = selectedTab();
    var prefix = customerLabel ? customerLabel + ' › ' : '';
    if (isData && tab) {
      navTitle.textContent = prefix + (group ? EntriesAPI.groupName(group) + ' › ' : '') + EntriesAPI.tabName(tab);
    } else if (group) {
      navTitle.textContent = prefix + EntriesAPI.groupName(group);
    } else if (customerLabel) {
      navTitle.textContent = customerLabel;
    } else {
      navTitle.textContent = EntriesUI.t('selectEntry');
    }
    renderEntryPicker();
  }

  function folderChipCount(folderId) {
    var key = String(folderId || 'all');
    if (Object.prototype.hasOwnProperty.call(state.folderCounts, key)) {
      return Number(state.folderCounts[key]) || 0;
    }
    if (!folderId) return null;
    var folders = EntriesAPI.getFolders(state.basic);
    for (var i = 0; i < folders.length; i += 1) {
      if (EntriesAPI.folderId(folders[i]) === String(folderId)) {
        var fallback = EntriesAPI.folderCount(folders[i]);
        return fallback ? fallback : null;
      }
    }
    return null;
  }

  function renderFolderStrip(opts) {
    if (!folderStrip) return;
    var folders = EntriesAPI.getFolders(state.basic);
    var selected = String(state.browseFolderId || '');
    var html = '';

    function chip(id, label, count) {
      var active = String(id || '') === selected;
      var countHtml = count != null && count !== ''
        ? '<span class="folder-chip__count">' + esc(String(count)) + '</span>'
        : '';
      return (
        '<button type="button" class="folder-chip' + (active ? ' is-active' : '') + '" data-folder-id="' + esc(id) + '" role="tab" aria-selected="' + (active ? 'true' : 'false') + '">' +
          '<span>' + esc(label) + '</span>' +
          countHtml +
        '</button>'
      );
    }

    html += chip('', EntriesUI.t('allFolders'), folderChipCount(''));
    folders.forEach(function (folder) {
      var id = EntriesAPI.folderId(folder);
      if (!id) return;
      html += chip(id, EntriesAPI.folderName(folder) || ('#' + id), folderChipCount(id));
    });
    folderStrip.innerHTML = html;
    folderStrip.classList.toggle('hidden', !folders.length);
    if (opts && opts.scrollActive) {
      var activeChip = folderStrip.querySelector('.folder-chip.is-active');
      if (activeChip && activeChip.scrollIntoView) {
        try {
          activeChip.scrollIntoView({ inline: 'center', block: 'nearest' });
        } catch (e) { /* ignore */ }
      }
    }
  }

  var folderCountsRequest = 0;

  function loadFolderCounts() {
    var requestId = ++folderCountsRequest;
    return EntriesAPI.listFoldersWithCounts().then(function (res) {
      if (requestId !== folderCountsRequest) return;
      var nextCounts = Object.assign({}, state.folderCounts);
      var counts = (res && res.counts) || {};
      Object.keys(counts).forEach(function (id) {
        nextCounts[String(id)] = Number(counts[id]) || 0;
      });
      nextCounts.all = Number(res && res.total) || 0;
      state.folderCounts = nextCounts;
      renderFolderStrip();
    }).catch(function () {
      if (requestId !== folderCountsRequest) return;
      renderFolderStrip();
    });
  }

  function selectBrowseFolder(folderId) {
    var next = String(folderId || '');
    if (next === String(state.browseFolderId || '')) return;
    state.browseFolderId = next;
    state.browseOffset = 0;
    renderFolderStrip({ scrollActive: true });
    loadCustomersBrowse();
    syncNav('replace');
  }

  function customerText(customer, keys) {
    if (!customer) return '';
    for (var i = 0; i < keys.length; i += 1) {
      var value = customer[keys[i]];
      if (value != null && String(value).trim() !== '') {
        var text = String(value).trim();
        return EntriesUI.decodeHtmlEntities ? EntriesUI.decodeHtmlEntities(text) : text;
      }
    }
    return '';
  }

  function customerCell(value) {
    return value ? esc(value) : '<span class="muted">—</span>';
  }

  function basicData() {
    return (state.basic && state.basic.data) || state.basic || {};
  }

  function pickStatusName(item) {
    if (!item) return '';
    if (EntriesUI.getLang() === 'he') return String(item.name_he || item.name_en || item.name_for || item.name || '').trim();
    return String(item.name_en || item.name_he || item.name_for || item.name || '').trim();
  }

  function statusItemValue(item) {
    if (!item) return '';
    var nf = String(item.name_for || '').trim();
    if (nf) return nf;
    var en = String(item.name_en || item.name || '').trim();
    if (en) return en;
    var he = String(item.name_he || '').trim();
    if (he) return he;
    return String(
      item.id != null && item.id !== '' ? item.id :
      item.status_id != null && item.status_id !== '' ? item.status_id :
      item.data_id != null && item.data_id !== '' ? item.data_id :
      ''
    ).trim();
  }

  function getInternalStatusList(folderId) {
    var fid = '__status__';
    if (state.internalStatusesLoadedByFolder[fid]) {
      return Array.isArray(state.internalStatusesByFolder[fid]) ? state.internalStatusesByFolder[fid] : [];
    }
    return [];
  }

  function ensureInternalStatuses(folderId) {
    var fid = '__status__';
    if (state.internalStatusesLoadedByFolder[fid]) return;
    if (state.internalStatusesLoadingByFolder[fid]) return;
    state.internalStatusesLoadingByFolder[fid] = true;
    EntriesAPI.listCustomerStatuses({
      limit: 25
    }).then(function (rows) {
      state.internalStatusesByFolder[fid] = Array.isArray(rows) ? rows : [];
      state.internalStatusesLoadedByFolder[fid] = true;
      renderCustomerDetail();
    }).catch(function () {
      state.internalStatusesByFolder[fid] = [];
      state.internalStatusesLoadedByFolder[fid] = true;
    }).finally(function () {
      state.internalStatusesLoadingByFolder[fid] = false;
    });
  }

  function lookupInternalStatus(id, folderId) {
    var wanted = String(id == null ? '' : id).trim();
    if (!wanted) return null;
    var list = getInternalStatusList(folderId);
    var byId = null;
    var byName = null;
    for (var i = 0; i < list.length; i += 1) {
      var item = list[i] || {};
      var itemId = statusItemValue(item);
      var he = String(item.name_he || '');
      var en = String(item.name_en || '');
      var nf = String(item.name_for || '');
      if (itemId === wanted) {
        if (!byId) byId = item;
      }
      if ((he === wanted || en === wanted || nf === wanted) && !byName) byName = item;
    }
    return byId || byName;
  }

  function customerStatusInfo(customer) {
    if (!customer) return null;
    var folderId = EntriesAPI.customerFolderId(customer) || state.selectedCustomerFolderId || state.browseFolderId;
    var named = customerText(customer, ['status_name', 'status_label', 'status']);
    var rawId = customer.status != null && String(customer.status).trim() !== ''
      ? customer.status
      : (customer.status_id != null && String(customer.status_id).trim() !== '' ? customer.status_id : customer.internal_status);
    var item = lookupInternalStatus(rawId, folderId);
    if (!item && named) item = lookupInternalStatus(named, folderId);
    if (item) {
      return {
        label: pickStatusName(item),
        color: item.color || customer.status_color || customer.color || '#64748b'
      };
    }
    if (named && !/^\d+$/.test(named)) {
      return {
        label: named,
        color: customer.status_color || customer.color || customer.statusColor || '#64748b'
      };
    }
    return null;
  }

  function customerStatusHtml(customer) {
    var info = customerStatusInfo(customer);
    if (!info) return '<span class="muted">—</span>';
    return (
      '<span class="status-chip" style="--chip:' + esc(info.color) + '">' + esc(info.label) + '</span>'
    );
  }

  function renderCustomerBrowse() {
    renderFolderStrip();
    if (clearCustomerBrowseBtn) {
      clearCustomerBrowseBtn.classList.toggle('hidden', !String(state.browseSearch || '').trim());
    }
    if (!customerTableHead || !customerTableBody) return;

    customerTableHead.innerHTML =
      '<tr>' +
        '<th>' + esc(EntriesUI.t('clientName')) + '</th>' +
        '<th>' + esc(EntriesUI.t('company')) + '</th>' +
        '<th>' + esc(EntriesUI.t('phone')) + '</th>' +
        '<th>' + esc(EntriesUI.t('email')) + '</th>' +
        '<th>' + esc(EntriesUI.t('status')) + '</th>' +
        '<th>' + esc(EntriesUI.t('remarks')) + '</th>' +
        '<th>' + esc(EntriesUI.t('notes')) + '</th>' +
      '</tr>';

    if (state.browseLoading && !state.browseCustomers.length) {
      customerTableBody.innerHTML =
        '<tr><td colspan="7" class="muted">' + esc(EntriesUI.t('loadingCustomers')) + '</td></tr>';
      customerTableBody.classList.add('is-loading');
      return;
    }

    customerTableBody.classList.toggle('is-loading', !!state.browseLoading);

    if (!state.browseCustomers.length) {
      customerTableBody.innerHTML =
        '<tr><td colspan="7" class="muted">' + esc(EntriesUI.t('noCustomers')) + '</td></tr>';
      return;
    }

    customerTableBody.innerHTML = state.browseCustomers.map(function (customer) {
      var id = EntriesAPI.customerListId(customer);
      if (!id) return '';
      var name = EntriesAPI.customerListName(customer) || EntriesAPI.customerListLabel(customer) || ('#' + id);
      var company = customerText(customer, ['company', 'company_name']);
      if (company && company === name) company = '';
      var phone = customerText(customer, ['phone', 'phone1', 'mobile', 'telephone', 'phone_number']);
      var email = customerText(customer, ['email', 'mail', 'user_email']);
      var remarks = customerText(customer, ['remarks', 'remark', 'comments']);
      var notes = customerText(customer, ['notes', 'note', 'internal_notes']);
      var folderId = EntriesAPI.customerFolderId(customer);
      return (
        '<tr class="customer-row" data-customer-id="' + esc(id) + '" data-customer-label="' + esc(name) + '" data-folder-id="' + esc(folderId) + '">' +
          '<td class="col-customer-name" title="' + esc(name) + '">' + esc(name) + '</td>' +
          '<td title="' + esc(company) + '">' + customerCell(company) + '</td>' +
          '<td>' + customerCell(phone) + '</td>' +
          '<td>' + customerCell(email) + '</td>' +
          '<td>' + customerStatusHtml(customer) + '</td>' +
          '<td title="' + esc(remarks) + '">' + customerCell(remarks) + '</td>' +
          '<td title="' + esc(notes) + '">' + customerCell(notes) + '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function loadCustomersBrowse() {
    if (!customerTableBody && !customerBrowseList) return Promise.resolve();
    state.browseLoading = true;
    renderCustomerBrowse();
    renderPager({
      total: state.browseTotal,
      offset: state.browseOffset,
      loading: true
    });
    pagerBar.classList.remove('hidden');
    if (listError) {
      listError.classList.add('hidden');
      listError.textContent = '';
    }

    var params = {
      start: state.browseOffset,
      length: PAGE_SIZE,
      search: state.browseSearch
    };
    if (state.browseFolderId) params.folder_id = state.browseFolderId;

    return EntriesAPI.listCustomers(params).then(function (res) {
      state.browseCustomers = res.rows || [];
      state.browseTotal = Number(res.count) || state.browseCustomers.length;
      state.browseLoading = false;
      state.folderCounts[state.browseFolderId || 'all'] = state.browseTotal;
      renderCustomerBrowse();
      renderPager({
        total: state.browseTotal,
        offset: state.browseOffset,
        loading: false
      });
    }).catch(function (err) {
      state.browseCustomers = [];
      state.browseLoading = false;
      renderCustomerBrowse();
      if (listError) {
        listError.textContent = err && err.message ? err.message : EntriesUI.t('customersFailed');
        listError.classList.remove('hidden');
      }
      renderPager({
        total: state.browseTotal,
        offset: state.browseOffset,
        loading: false
      });
    });
  }

  function goToCustomerPage(page) {
    var pages = Math.max(1, Math.ceil((state.browseTotal || 0) / PAGE_SIZE));
    page = Math.max(1, Math.min(pages, Number(page) || 1));
    state.browseOffset = (page - 1) * PAGE_SIZE;
    loadCustomersBrowse();
    syncNav('replace');
  }

  function customerValue(customer, keys) {
    return customerText(customer, keys);
  }

  function humanizeFieldKey(key) {
    var known = {
      name: 'clientName',
      company: 'company',
      phone: 'phone',
      mobile: 'mobile',
      email: 'email',
      remarks: 'remarks',
      notes: 'notes',
      note: 'notes',
      status: 'status',
      website: 'website',
      address: 'address',
      city: 'city',
      source: 'source',
      date_created: 'dateCreated',
      last_updated: 'lastUpdated',
      followup: 'followup',
      workers: 'workers',
      folders: 'folders',
      tags: 'tags',
      tag: 'tags',
      tag_id: 'tags',
      parent_customer: 'parentCustomer',
      parent_customer_name: 'parentCustomer',
      internal_status: 'internalStatus',
      shared_with: 'sharedWith',
      second_email: 'secondEmail',
      second_phone: 'secondPhone'
    };
    if (known[key]) return EntriesUI.t(known[key]);
    return String(key || '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function skipCustomerKey(key) {
    var k = String(key || '').replace(/[\s-]+/g, '_');
    if (!k || k.charAt(0) === '_') return true;
    return /^(id|customer_id|cust_id|user_id|account_id|org_id|hased_id|hashed_id|customer_hash|password|token|archive|trash|created_by|updated_by|photo|image|avatar|profile_image|html|dt_rowid|checkbox|action|actions|color_class|row_class|permissions|permission|success|message|recordstotal|recordsfiltered|draw|extra_fields_json|extrafieldsjson|extra_fields|extrafields|custom_fields|folders_array|folder_array|shared_with|sharedwith|father_id|fatherid|city_id|cityid|csv_id|csvid|c_status|cstatus|age|lead_score)$/i.test(k);
  }

  function looksLikeDate(value) {
    var text = String(value == null ? '' : value).trim();
    return /^\d{4}-\d{2}-\d{2}/.test(text) || /^\d{1,2}\/\d{1,2}\/\d{4}/.test(text);
  }

  function isEmptyCustomerValue(value) {
    if (value == null) return true;
    if (typeof value === 'boolean') return false;
    if (Array.isArray(value)) return !value.length;
    if (isPlainObject(value)) return !Object.keys(value).length;
    var text = String(value).trim();
    return text === '' || text === '0' || text === 'null' || text === 'undefined' || text === '[object Object]';
  }

  function extraFieldDefs() {
    var data = basicData();
    var settings = data.field_settings || data.settings || {};
    var customer = settings.customer || settings.customers || {};
    var extra = customer.extra_fields || settings.extra_fields || data.customer_extra_fields || data.extra_fields || {};
    return parseMaybeJson(extra);
  }

  function normalizeFieldKey(key) {
    var text = String(key || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!text) return '';
    if (/^ga[-_]?/.test(text)) return 'ga-' + text.replace(/^ga[-_]?/, '').replace(/_/g, '-');
    if (/^a[-_]?/.test(text)) return 'a-' + text.replace(/^a[-_]?/, '').replace(/_/g, '-');
    if (/^\d+$/.test(text)) return 'a-' + text;
    return text;
  }

  function extraFieldIndex() {
    if (state._extraFieldIndex && state._extraFieldIndexBasic === state.basic) {
      return state._extraFieldIndex;
    }
    var list = extraFieldDefs();
    var byKey = {};

    function add(item, parent) {
      if (!item || typeof item !== 'object') return;
      var key = normalizeFieldKey(item.name || item.id || item.field_id || item.key || '');
      if (!key) return;
      if (parent) item._parentGroup = parent;
      byKey[key] = item;
      if (String(item.type || '').toLowerCase() === 'group' && Array.isArray(item.group_data)) {
        item.group_data.forEach(function (child) { add(child, item); });
      }
    }

    if (Array.isArray(list)) {
      list.forEach(function (item) { add(item); });
    } else if (isPlainObject(list)) {
      Object.keys(list).forEach(function (name) {
        var item = list[name];
        if (item && typeof item === 'object' && !item.name) item = Object.assign({ name: name }, item);
        add(item);
      });
    }
    state._extraFieldIndex = { byKey: byKey };
    state._extraFieldIndexBasic = state.basic;
    return state._extraFieldIndex;
  }

  function extraFieldDef(key) {
    return extraFieldIndex().byKey[normalizeFieldKey(key)] || null;
  }

  function prettyFieldEn(en, he) {
    var text = String(en || '').trim();
    if (!text) return String(he || '').trim();
    if (/_/.test(text)) return text.replace(/_/g, ' ');
    return text;
  }

  function labelFromDef(def, fallbackKey) {
    if (!def || typeof def !== 'object') return humanizeFieldKey(fallbackKey);
    var type = String(def.type || '').toLowerCase();
    var he = '';
    var en = '';
    if (type === 'group') {
      he = def.grp_name_he || def.he || def.label_he || '';
      en = def.grp_name_en || def.en || def.label_en || '';
    } else {
      he = def.he || def.label_he || def.name_he || '';
      en = def.en || def.label_en || def.name_en || def.label || '';
    }
    if (EntriesUI.getLang() === 'he') return String(he || prettyFieldEn(en, he) || humanizeFieldKey(fallbackKey)).trim();
    return String(prettyFieldEn(en, he) || he || humanizeFieldKey(fallbackKey)).trim();
  }

  function extraFieldLabel(key) {
    var def = extraFieldDef(key);
    if (def) return labelFromDef(def, key);
    return humanizeFieldKey(key);
  }

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function parseMaybeJson(value) {
    if (typeof value !== 'string') return value;
    var text = value.trim();
    if (!text || (text.charAt(0) !== '{' && text.charAt(0) !== '[')) return value;
    try { return JSON.parse(text); } catch (e) { return value; }
  }

  function fieldKeyVariants(key) {
    var raw = String(key || '').trim();
    if (!raw) return [];
    var lower = raw.toLowerCase().replace(/\s+/g, '-');
    var digits = lower.replace(/^(ga|a)[-_]?/, '');
    var out = [raw, lower, raw.toUpperCase()];
    if (/^\d+$/.test(digits)) {
      var prefixes = /^ga/.test(lower) ? ['ga-', 'ga_', 'GA-', 'GA_'] : ['a-', 'a_', 'A-', 'A_', 'A '];
      prefixes.forEach(function (prefix) { out.push(prefix + digits); });
      out.push(digits);
    }
    var seen = {};
    return out.filter(function (item) {
      if (!item || seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }

  function pickByKey(obj, key) {
    if (!obj || typeof obj !== 'object') return undefined;
    var variants = fieldKeyVariants(key);
    for (var i = 0; i < variants.length; i += 1) {
      if (Object.prototype.hasOwnProperty.call(obj, variants[i]) && obj[variants[i]] != null && obj[variants[i]] !== '') {
        return obj[variants[i]];
      }
    }
    var wanted = normalizeFieldKey(key);
    var names = Object.keys(obj);
    for (var j = 0; j < names.length; j += 1) {
      if (normalizeFieldKey(names[j]) === wanted && !isEmptyCustomerValue(obj[names[j]])) return obj[names[j]];
    }
    return undefined;
  }

  function pickCustomerFieldValue(customer, extra, key) {
    var fromExtra = pickByKey(extra, key);
    if (fromExtra !== undefined) return fromExtra;
    return pickByKey(customer, key);
  }

  function customerExtraFields(customer) {
    if (!customer) return {};
    var extra = parseMaybeJson(customer.extra_fields || customer.extraFields || customer.custom_fields);
    if (!isPlainObject(extra) || !Object.keys(extra).length) {
      extra = parseMaybeJson(customer.extra_fields_json);
    }
    extra = isPlainObject(extra) ? Object.assign({}, extra) : {};
    Object.keys(customer).forEach(function (key) {
      if (/^(a|ga)[-_\s]?\d+/i.test(key) && extra[key] == null) extra[key] = customer[key];
    });
    return extra;
  }

  function dashboardFieldsForFolder(folderId) {
    var data = basicData();
    var settings = data.settings || {};
    var fs = (data.field_settings && data.field_settings.customer) || {};
    var map = fs.fields_on_dashboard_folder || settings.fields_on_dashboard_folder || {};
    var fid = String(folderId || '');
    var list = map[fid] || map[Number(fid)] || [];
    if (Array.isArray(list) && list.length) return list.filter(Boolean);
    var global = fs.fields_on_dashboard || settings.fields_on_dashboard;
    if (global && typeof global === 'object' && !Array.isArray(global)) {
      return Object.keys(global).sort(function (a, b) {
        var na = Number(String(a).replace(/\D+/g, '')) || 0;
        var nb = Number(String(b).replace(/\D+/g, '')) || 0;
        return na - nb;
      }).map(function (name) { return global[name]; }).filter(Boolean);
    }
    return [];
  }

  function splitOptions(value) {
    if (Array.isArray(value)) return value.map(function (item) { return String(item == null ? '' : item).trim(); });
    return String(value == null ? '' : value).split(',').map(function (item) { return item.trim(); });
  }

  function mapSelectOption(def, raw) {
    var text = String(raw == null ? '' : raw).trim();
    if (!text || !def) return text;
    var he = splitOptions(def.options_he);
    var en = splitOptions(def.options_en);
    var lang = EntriesUI.getLang();
    var max = Math.max(he.length, en.length);
    for (var i = 0; i < max; i += 1) {
      if (text === String(he[i] || '').trim() || text === String(en[i] || '').trim() || text === String(i) || text === String(i + 1)) {
        return lang === 'he' ? (he[i] || en[i] || text) : (en[i] || he[i] || text);
      }
    }
    return text;
  }

  function mapRadioOption(def, raw) {
    var text = String(raw == null ? '' : raw).trim();
    if (!def) return text;
    if (text === String(def.yes_val) || text === '1' || /^yes$/i.test(text)) {
      return EntriesUI.getLang() === 'he' ? (def.yes_name_he || def.yes_name_en || text) : (def.yes_name_en || def.yes_name_he || text);
    }
    if (text === String(def.no_val) || text === '2' || /^no$/i.test(text)) {
      return EntriesUI.getLang() === 'he' ? (def.no_name_he || def.no_name_en || text) : (def.no_name_en || def.no_name_he || text);
    }
    return text;
  }

  function mapCheckboxOption(def, raw) {
    var values = Array.isArray(raw) ? raw : String(raw == null ? '' : raw).split(',');
    var he = def.checkbox_he || [];
    var en = def.checkbox_en || [];
    var ids = def.checkbox_value || [];
    var lang = EntriesUI.getLang();
    return values.map(function (item) {
      var text = String(item == null ? '' : item).trim();
      if (!text) return '';
      for (var i = 0; i < ids.length; i += 1) {
        if (text === String(ids[i]) || text === String(he[i]) || text === String(en[i])) {
          return lang === 'he' ? (he[i] || en[i] || text) : (en[i] || he[i] || text);
        }
      }
      return text;
    }).filter(Boolean).join(', ');
  }

  function mapExtraFieldValue(def, value) {
    if (value == null) return '';
    if (!def) return formatCustomerScalar(value);
    var type = String(def.type || '').toLowerCase();
    if (type === 'date' || looksLikeDate(value)) return EntriesAPI.formatDateValue(value) || formatCustomerScalar(value);
    if (type === 'select') return mapSelectOption(def, value);
    if (type === 'radio') return mapRadioOption(def, value);
    if (type === 'checkbox') return mapCheckboxOption(def, value);
    return formatCustomerScalar(value);
  }

  function lookupTagLabel(id) {
    var wanted = String(id == null ? '' : id).trim();
    if (!wanted) return '';
    var tags = basicData().tags || {};
    var list = [].concat(tags.visible || [], tags.all || []);
    for (var i = 0; i < list.length; i += 1) {
      var tag = list[i];
      if (tag && String(tag.id) === wanted) return tag.name || wanted;
    }
    return wanted;
  }

  function teamMemberLabel(value) {
    var id = String(value == null ? '' : value).trim();
    if (!id) return '';
    var members = EntriesAPI.getTeamMembers(state.basic);
    for (var i = 0; i < members.length; i += 1) {
      if (EntriesAPI.teamMemberId(members[i]) === id) return EntriesAPI.teamMemberName(members[i]) || id;
    }
    return id;
  }

  function sharedWithLabel(customer, extra) {
    var raw = pickCustomerFieldValue(customer, extra, 'shared_with');
    if (raw == null || raw === '') raw = customer && customer.shared_with;
    raw = parseMaybeJson(raw);
    var ids = [];
    if (Array.isArray(raw)) ids = raw;
    else if (typeof raw === 'string' && raw.trim()) ids = raw.split(',');
    else if (raw && typeof raw === 'object') ids = Object.keys(raw);
    return ids.map(function (item) {
      if (item && typeof item === 'object') return EntriesAPI.teamMemberName(item) || item.name || '';
      return teamMemberLabel(item);
    }).filter(Boolean).join(', ');
  }

  function resolveDashboardValue(customer, extra, key) {
    var k = String(key || '');
    if (k === 'internal_status' || k === 'status') {
      var info = customerStatusInfo(customer);
      return info ? info.label : String(pickCustomerFieldValue(customer, extra, key) || '');
    }
    // if (k === 'customer_manager') {
    //   return teamMemberLabel(pickCustomerFieldValue(customer, extra, key) || customerText(customer, ['customer_manager', 'manager_name', 'manager']));
    // }
    if (k === 'shared_with') return sharedWithLabel(customer, extra);
    if (k === 'tag_id' || k === 'tag') {
      var tags = customerTagLabels(customer);
      if (tags.length) return tags.join(', ');
      return lookupTagLabel(pickCustomerFieldValue(customer, extra, key));
    }
    var common = {
      notes: ['notes', 'note', 'internal_notes'],
      mobile: ['mobile', 'phone', 'phone1'],
      phone: ['phone', 'phone1', 'mobile', 'telephone'],
      email: ['email', 'mail', 'user_email'],
      second_email: ['second_email', 'email2'],
      second_phone: ['second_phone', 'phone2'],
      address: ['address', 'street'],
      city: ['city'],
      source: ['source'],
      date_created: ['date_created', 'created_at', 'date', 'created'],
      last_updated: ['last_updated', 'updated_at', 'updated'],
      website: ['website', 'site', 'url'],
      company: ['company', 'company_name'],
      name: ['name']
    };
    if (common[k]) return customerText(customer, common[k]) || pickCustomerFieldValue(customer, extra, key) || '';
    return pickCustomerFieldValue(customer, extra, key);
  }

  function groupRows(customer, extra, groupDef) {
    if (!groupDef) return [];
    var raw = parseMaybeJson(pickCustomerFieldValue(customer, extra, groupDef.name));
    if (Array.isArray(raw)) return raw.filter(isPlainObject);
    if (isPlainObject(raw)) {
      var keys = Object.keys(raw);
      if (keys.length && keys.every(function (name) { return /^\d+$/.test(name) && isPlainObject(raw[name]); })) {
        return keys.sort(function (a, b) { return Number(a) - Number(b); }).map(function (name) { return raw[name]; });
      }
      return [raw];
    }
    var row = {};
    var has = false;
    (groupDef.group_data || []).forEach(function (child) {
      var val = pickCustomerFieldValue(customer, extra, child && child.name);
      if (val !== undefined && !isEmptyCustomerValue(val)) {
        row[child.name] = val;
        has = true;
      }
    });
    return has ? [row] : [];
  }

  function automationTileHtml(def) {
    if (!def) return '';
    var autoId = String(def.optional || def.automation_id || '').trim();
    if (!autoId) return '';
    var label = labelFromDef(def, def.name);
    var color = def.automaction_color || def.automation_color || '';
    var style = color ? 'background:' + esc(color) + ';border-color:' + esc(color) + ';color:#fff' : '';
    return (
      '<div class="detail-tile detail-tile--action">' +
        '<button type="button" class="btn detail-auto-btn" data-customer-field-automation="' + esc(autoId) + '" style="' + style + '">' +
          esc(label) +
        '</button>' +
      '</div>'
    );
  }

  function renderGroupCard(groupDef, customer, extra) {
    var rows = groupRows(customer, extra, groupDef);
    if (!rows.length) return '';
    var inner = '';
    rows.forEach(function (row) {
      var tiles = '';
      (groupDef.group_data || []).forEach(function (child) {
        if (!child) return;
        var val = pickByKey(row, child.name);
        if (val === undefined) val = pickCustomerFieldValue(customer, extra, child.name);
        tiles += fieldHtml(labelFromDef(child, child.name), mapExtraFieldValue(child, val));
      });
      if (!tiles) return;
      inner += '<div class="detail-group__row">' + tilesWrap(tiles) + '</div>';
    });
    if (!inner) return '';
    return detailCard(labelFromDef(groupDef, groupDef.name), inner);
  }

  function renderDashboardFields(customer, extra, folderId) {
    var keys = dashboardFieldsForFolder(folderId);
    var tiles = '';
    var nested = '';
    var shownGroups = {};
    var contactSkip = { mobile: 1, phone: 1, email: 1, second_phone: 1 };

    keys.forEach(function (key) {
      key = String(key || '').trim();
      if (!key || key === 'password') return;
      var def = extraFieldDef(key);
      var type = def ? String(def.type || '').toLowerCase() : '';
      if (type === 'title') {
        tiles += '<div class="detail-subtitle">' + esc(labelFromDef(def, key)) + '</div>';
        return;
      }
      if (type === 'automation') {
        tiles += automationTileHtml(def);
        return;
      }
      var group = (def && type === 'group') ? def : (def && def._parentGroup) || null;
      if (group) {
        var gid = normalizeFieldKey(group.name);
        if (shownGroups[gid]) return;
        shownGroups[gid] = true;
        nested += renderGroupCard(group, customer, extra);
        return;
      }
      if (contactSkip[key]) return;
      var value = resolveDashboardValue(customer, extra, key);
      if (key === 'internal_status' || key === 'status') {
        var info = customerStatusInfo(customer);
        if (info) {
          tiles += fieldHtml(extraFieldLabel(key), value, {
            html: '<span class="status-chip" style="--chip:' + esc(info.color) + '">' + esc(info.label) + '</span>'
          });
        }
        return;
      }
      tiles += fieldHtml(extraFieldLabel(key), mapExtraFieldValue(def, value));
    });

    return { keys: keys, tiles: tiles, nested: nested, shownGroups: shownGroups };
  }

  function isCertificateGroup(groupDef) {
    if (!groupDef) return false;
    var key = normalizeFieldKey(groupDef.name || '');
    if (key === 'ga-1724696033') return true;
    var he = String(groupDef.grp_name_he || groupDef.he || '').toLowerCase();
    var en = String(groupDef.grp_name_en || groupDef.en || '').toLowerCase();
    return /תעודות/.test(he) || /certificate/.test(en);
  }

  function renderCertificateGroups(customer, extra, shownGroups) {
    var defs = extraFieldDefs();
    if (!Array.isArray(defs) || !defs.length) return '';
    var out = '';
    defs.forEach(function (item) {
      if (!item || String(item.type || '').toLowerCase() !== 'group') return;
      if (!isCertificateGroup(item)) return;
      var gid = normalizeFieldKey(item.name || '');
      if (shownGroups && shownGroups[gid]) return;
      out += renderGroupCard(item, customer, extra);
    });
    return out;
  }

  function formatCustomerScalar(value) {
    if (value == null) return '';
    if (typeof value === 'boolean') return value ? '1' : '0';
    if (Array.isArray(value)) {
      return value.map(function (item) {
        if (item && typeof item === 'object') {
          return item.name || item.label || item.title || EntriesAPI.customerListName(item) || '';
        }
        return String(item == null ? '' : item).trim();
      }).filter(Boolean).join(', ');
    }
    var parsed = parseMaybeJson(value);
    if (parsed !== value) return formatCustomerScalar(parsed);
    var text = String(value).trim();
    if (looksLikeDate(text)) return EntriesAPI.formatDateValue(text) || text;
    return text;
  }

  function isHttpUrl(value) {
    return /^https?:\/\//i.test(String(value || '').trim());
  }

  function fieldHtml(label, value, opts) {
    opts = opts || {};
    if (opts.html) {
      return (
        '<div class="detail-tile">' +
          '<span>' + esc(label) + '</span>' +
          '<strong>' + opts.html + '</strong>' +
        '</div>'
      );
    }
    if (isEmptyCustomerValue(value) && !isPlainObject(value)) return '';
    var text = formatCustomerScalar(value);
    if (!text) return '';
    var body = isHttpUrl(text)
      ? '<a href="' + esc(text) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + '</a>'
      : esc(text);
    return (
      '<div class="detail-tile">' +
        '<span>' + esc(label) + '</span>' +
        '<strong>' + body + '</strong>' +
      '</div>'
    );
  }

  function tilesWrap(html) {
    if (!html) return '';
    return '<div class="detail-tiles">' + html + '</div>';
  }

  function detailCard(title, inner) {
    if (!inner) return '';
    return '<section class="detail-card"><h3>' + esc(title) + '</h3>' + inner + '</section>';
  }

  function nestedCardHtml(title, obj) {
    if (!isPlainObject(obj)) return '';
    var inner = '';
    var nested = '';
    Object.keys(obj).forEach(function (key) {
      if (skipCustomerKey(key)) return;
      var val = parseMaybeJson(obj[key]);
      if (isEmptyCustomerValue(val) && !isPlainObject(val)) return;
      if (isPlainObject(val)) {
        nested += nestedCardHtml(extraFieldLabel(key), val);
        return;
      }
      inner += fieldHtml(extraFieldLabel(key), val);
    });
    return detailCard(title, tilesWrap(inner) + nested);
  }

  function phoneDigits(phone) {
    return String(phone || '').replace(/\D+/g, '');
  }

  function whatsappHref(phone) {
    var digits = phoneDigits(phone);
    if (!digits) return '';
    if (digits.charAt(0) === '0') digits = '972' + digits.slice(1);
    return 'https://wa.me/' + digits;
  }

  function initialsFrom(name) {
    var text = String(name || '').trim();
    if (!text) return 'C';
    return text.charAt(0).toUpperCase();
  }

  function folderLabelById(id) {
    var wanted = String(id || '').trim();
    if (!wanted) return '';
    var folders = EntriesAPI.getFolders(state.basic);
    for (var i = 0; i < folders.length; i += 1) {
      if (EntriesAPI.folderId(folders[i]) === wanted) return EntriesAPI.folderName(folders[i]);
    }
    return wanted;
  }

  function folderIdByLabel(label) {
    var wanted = String(label || '').trim();
    if (!wanted) return '';
    var folders = EntriesAPI.getFolders(state.basic);
    for (var i = 0; i < folders.length; i += 1) {
      if (String(EntriesAPI.folderName(folders[i]) || '').trim() === wanted) {
        return String(EntriesAPI.folderId(folders[i]) || '').trim();
      }
    }
    return '';
  }

  function customerFolderItems(customer) {
    var items = [];
    var seen = {};
    function add(id, label) {
      var fid = String(id || '').trim();
      var text = String(label || '').trim() || folderLabelById(fid) || fid;
      if (!text) return;
      if (!fid) fid = folderIdByLabel(text);
      var key = (fid || 'label:') + text;
      if (seen[key]) return;
      seen[key] = true;
      items.push({ id: fid, label: text });
    }
    var raw = customer && (customer.folders || customer.folder_ids || customer.folderIds);
    raw = parseMaybeJson(raw);
    if (Array.isArray(raw)) {
      raw.forEach(function (item) {
        if (item && typeof item === 'object') add(item.id || item.folder_id, item.name || folderLabelById(item.id || item.folder_id));
        else add(item, folderLabelById(item));
      });
    } else if (typeof raw === 'string' && raw.trim()) {
      raw.split(',').forEach(function (part) {
        var cleaned = part.replace(/[\[\]"]/g, '').trim();
        add(cleaned, folderLabelById(cleaned));
      });
    }
    add('', customer && (customer.folder_name || customer.folders_name));
    add(EntriesAPI.customerFolderId(customer), folderLabelById(EntriesAPI.customerFolderId(customer)));
    return items;
  }

  function customerFolderLabels(customer) {
    return customerFolderItems(customer).map(function (item) { return item.label; });
  }

  function tagLabelById(id) {
    var wanted = String(id || '').trim();
    if (!wanted) return '';
    var tags = basicData().tags || {};
    var list = [].concat(tags.visible || [], tags.all || []);
    for (var i = 0; i < list.length; i += 1) {
      var item = list[i] || {};
      var tid = String(item.id || item.tag_id || '').trim();
      if (tid === wanted) return String(item.name || item.label || item.tag_name || tid).trim();
    }
    return wanted;
  }

  function customerTagItems(customer) {
    var out = [];
    var seen = {};
    var tags = customer && (customer.tags || customer.tag_names || customer.tag_list || customer.tag || customer.tag_id);
    tags = parseMaybeJson(tags);
    function add(id, label) {
      var tid = String(id || '').trim();
      var text = String(label || '').trim();
      if (!text && tid) text = tagLabelById(tid);
      if (!text) return;
      if (!tid && /^\d+$/.test(text)) tid = text;
      var key = (tid || 'label:') + text;
      if (seen[key]) return;
      seen[key] = true;
      out.push({ id: tid, label: text });
    }
    if (Array.isArray(tags)) {
      tags.forEach(function (item) {
        if (item && typeof item === 'object') add(item.id || item.tag_id, item.name || item.label || item.title);
        else add(item, /^\d+$/.test(String(item || '').trim()) ? tagLabelById(item) : String(item || '').trim());
      });
    } else if (typeof tags === 'string' && tags.trim()) {
      tags.split(',').forEach(function (part) {
        var raw = String(part || '').trim();
        add(raw, /^\d+$/.test(raw) ? tagLabelById(raw) : raw);
      });
    }
    return out;
  }

  function customerTagLabels(customer) {
    return customerTagItems(customer).map(function (item) { return item.label; });
  }

  function customerTagIds(customer) {
    return customerTagItems(customer).map(function (item) { return item.id || ''; }).filter(Boolean);
  }

  function customerWorkers(customer) {
    var lists = [
      customer && customer.workers,
      customer && customer.assigned_users,
      customer && customer.assigned_to,
      customer && customer.team_members,
      customer && customer.users
    ];
    var out = [];
    var seen = {};
    lists.forEach(function (list) {
      list = parseMaybeJson(list);
      if (!Array.isArray(list)) {
        if (list && typeof list === 'object') list = [list];
        else if (list) list = String(list).split(',');
        else list = [];
      }
      list.forEach(function (item) {
        var name = '';
        var id = '';
        if (item && typeof item === 'object') {
          name = EntriesAPI.teamMemberName(item) || item.name || item.full_name || '';
          id = EntriesAPI.teamMemberId(item) || String(item.id || '');
        } else {
          id = String(item || '').trim();
          var members = EntriesAPI.getTeamMembers(state.basic);
          for (var i = 0; i < members.length; i += 1) {
            if (EntriesAPI.teamMemberId(members[i]) === id) {
              name = EntriesAPI.teamMemberName(members[i]);
              break;
            }
          }
          if (!name) name = id;
        }
        var key = id || name;
        if (!key || seen[key]) return;
        seen[key] = true;
        out.push({ id: id, name: name || id });
      });
    });
    var manager = customerValue(customer, [ 'manager_name', 'manager', 'client_manager']);
    if (manager && !seen[manager]) out.push({ id: '', name: manager });
    return out;
  }

  function parentCustomerLabel(customer) {
    return customerValue(customer, [
      'parent_customer_name',
      'parent_name',
      'parent_customer',
      'parent_cust_name'
    ]) || (customer && customer.parent_customer_id ? '#' + customer.parent_customer_id : '');
  }

  function renderCustomerDetail() {
    if (!customerDetail) return;
    if (!selectedCustomerId()) {
      customerDetail.innerHTML = '';
      return;
    }

    var customer = state.customerDetail;
    var name = (customer && (EntriesAPI.customerListName(customer) || EntriesAPI.customerListLabel(customer))) ||
      state.selectedCustomerLabel ||
      ('#' + selectedCustomerId());
    var phone = customerValue(customer, ['phone', 'phone1', 'mobile', 'telephone', 'phone_number']);
    var secondPhone = customerValue(customer, ['second_phone', 'phone2']);
    var email = customerValue(customer, ['email', 'mail', 'user_email']);
    var company = customerValue(customer, ['company', 'company_name']);
    var folderId = state.selectedCustomerFolderId || EntriesAPI.customerFolderId(customer);
    var wa = whatsappHref(phone || secondPhone);

    var html = '<header class="detail-hero">';
    html += '<div class="customer-profile__avatar" aria-hidden="true">' + esc(initialsFrom(name)) + '</div>';
    html += '<div class="customer-profile__identity">';
    html += '<h2>' + esc(name) + '</h2>';
    html += '<div class="customer-profile__meta">';
    html += renderCustomerStatusInline(customer, folderId);
    if (company && company !== name) html += '<span class="detail-hero__company">' + esc(company) + '</span>';
    html += '</div></div>';
    html += '<div class="customer-profile__actions">';
    html += '<button type="button" class="btn btn--ghost btn--sm" data-customer-edit>' + esc(EntriesUI.t('edit')) + '</button>';
    html += '<button type="button" class="btn btn--ghost btn--sm" data-customer-delete>' + esc(EntriesUI.t('delete')) + '</button>';
    // html += '<button type="button" class="btn btn--primary btn--sm" data-customer-automation>' + esc(EntriesUI.t('runAutomationPlus')) + '</button>';
    html += '</div></header>';

    if (state.customerDetailLoading && !customer) {
      html += '<p class="muted customer-profile__status">' + esc(EntriesUI.t('loadingCustomer')) + '</p>';
      customerDetail.innerHTML = html;
      return;
    }
    if (state.customerDetailError && !customer) {
      html += '<p class="muted customer-profile__status">' + esc(state.customerDetailError) + '</p>';
      customerDetail.innerHTML = html;
      return;
    }

    var contactChips = '';
    if (phone) {
      contactChips += '<a class="detail-chip" href="tel:' + esc(phoneDigits(phone) || phone) + '">' + esc(phone) + '</a>';
      if (wa) {
        contactChips += '<a class="detail-chip detail-chip--wa" href="' + esc(wa) + '" target="_blank" rel="noopener noreferrer">' + esc(EntriesUI.t('whatsapp')) + '</a>';
      }
    }
    if (email) contactChips += '<a class="detail-chip" href="mailto:' + esc(email) + '">' + esc(email) + '</a>';
    var contactTiles = '';
    if (secondPhone && secondPhone !== phone) {
      contactTiles += fieldHtml(EntriesUI.t('secondPhone'), secondPhone);
    }

    var detailsTiles = '';
    detailsTiles += fieldHtml(EntriesUI.t('dateCreated'), customerValue(customer, ['date', 'date_created', 'created_at', 'created']));
    detailsTiles += fieldHtml(EntriesUI.t('lastUpdated'), customerValue(customer, ['last_updated', 'updated', 'updated_at']));
    detailsTiles += fieldHtml(EntriesUI.t('followup'), customerValue(customer, ['followup', 'follow_up']));
    detailsTiles += fieldHtml(EntriesUI.t('remarks'), customerValue(customer, ['remarks', 'remark', 'comments']));
    detailsTiles += fieldHtml(EntriesUI.t('notes'), customerValue(customer, ['notes', 'note', 'internal_notes']));
    detailsTiles += fieldHtml(EntriesUI.t('website'), customerValue(customer, ['website', 'site', 'url']));
    detailsTiles += fieldHtml(EntriesUI.t('address'), customerValue(customer, ['address', 'street']));
    detailsTiles += fieldHtml(EntriesUI.t('city'), customerValue(customer, ['city']));
    detailsTiles += fieldHtml(EntriesUI.t('source'), customerValue(customer, ['source']));

    var extra = customerExtraFields(customer);
    var dash = renderDashboardFields(customer, extra, folderId);
    var certificateNested = renderCertificateGroups(customer, extra, dash.shownGroups || {});
    var extraTiles = dash.tiles;
    var extraNested = dash.nested + certificateNested;

    if (!dash.keys.length) {
      extraTiles = '';
      extraNested = '';
      Object.keys(extra).forEach(function (key) {
        if (skipCustomerKey(key)) return;
        var val = parseMaybeJson(extra[key]);
        if (isEmptyCustomerValue(val) && !isPlainObject(val)) return;
        if (isPlainObject(val) || Array.isArray(val)) {
          var groupDef = extraFieldDef(key);
          if (groupDef && String(groupDef.type || '').toLowerCase() === 'group') {
            extraNested += renderGroupCard(groupDef, customer, extra);
            return;
          }
          extraNested += nestedCardHtml(extraFieldLabel(key), isPlainObject(val) ? val : {});
          return;
        }
        extraTiles += fieldHtml(extraFieldLabel(key), mapExtraFieldValue(extraFieldDef(key), val));
      });
    }

    var main = '';
    if (contactChips || contactTiles) {
      main += detailCard(
        EntriesUI.t('contactInfo'),
        (contactChips ? '<div class="detail-contact">' + contactChips + '</div>' : '') + tilesWrap(contactTiles)
      );
    }
    if (dash.keys.length) {
      main += detailCard(EntriesUI.t('customerDetails'), tilesWrap(extraTiles));
      main += extraNested;
    } else {
      main += detailCard(EntriesUI.t('customerDetails'), tilesWrap(detailsTiles));
      main += detailCard(EntriesUI.t('customFields'), tilesWrap(extraTiles));
      main += extraNested;
    }

    var aside = '';
    var workers = customerWorkers(customer);
    if (workers.length) {
      aside += '<div class="customer-profile__aside-card"><div class="aside-card__head"><h3>' + esc(EntriesUI.t('workers')) + '</h3></div><div class="customer-avatars">';
      workers.forEach(function (worker) {
        aside += '<span title="' + esc(worker.name) + '">' + esc(initialsFrom(worker.name)) + '</span>';
      });
      aside += '</div></div>';
    }
    var folderItems = customerFolderItems(customer);
    var folderBody = '';
    folderItems.forEach(function (item) {
      folderBody += '<span class="customer-chip" data-chip-kind="folder" data-chip-id="' + esc(item.id || '') + '">' + esc(item.label);
      if (item.id) folderBody += '<button type="button" class="customer-chip__remove" data-sidebar-remove="folder" data-sidebar-id="' + esc(item.id) + '" aria-label="' + esc(EntriesUI.t('remove')) + '">×</button>';
      folderBody += '</span> ';
    });
    aside += sidebarCardHtml(EntriesUI.t('folders'), folderBody, 'folder', sidebarFolderEditor(customer));

    var tags = customerTagItems(customer);
    var tagBody = '';
    tags.forEach(function (tag) {
      tagBody += '<span class="customer-chip" data-chip-kind="tag" data-chip-id="' + esc(tag.id || '') + '">' + esc(tag.label);
      if (tag.id) tagBody += '<button type="button" class="customer-chip__remove" data-sidebar-remove="tag" data-sidebar-id="' + esc(tag.id) + '" aria-label="' + esc(EntriesUI.t('remove')) + '">×</button>';
      tagBody += '</span> ';
    });
    aside += sidebarCardHtml(EntriesUI.t('tags'), tagBody, 'tag', sidebarTagEditor(customer));
    aside += sidebarCardHtml(EntriesUI.t('entriesLabel'), sidebarEntriesBodyHtml(), '', '');
    aside +=
      '<div class="customer-profile__aside-card">' +
        '<h3>' + esc(EntriesUI.t('runAutomation')) + '</h3>' +
        '<button type="button" class="btn btn--primary customer-profile__run" data-customer-automation>' +
          esc(EntriesUI.t('runAutomationPlus')) +
        '</button>' +
      '</div>';

    html += '<div class="customer-profile__body">';
    html += '<div class="customer-profile__main">' + main + '</div>';
    html += '<aside class="customer-profile__aside">' + aside + '</aside>';
    html += '</div>';
    if (state.customerDetailLoading) {
      html += '<p class="muted customer-profile__status">' + esc(EntriesUI.t('loadingCustomer')) + '</p>';
    }
    customerDetail.innerHTML = html;
  }

  function loadCustomerDetail() {
    var id = selectedCustomerId();
    if (!id) {
      state.customerDetail = null;
      state.customerDetailLoading = false;
      state.customerDetailError = '';
      renderCustomerDetail();
      return Promise.resolve();
    }
    if (!state.customerDetail) state.customerDetail = findBrowseCustomer(id) || null;
    state.customerDetailLoading = true;
    state.customerDetailError = '';
    renderCustomerDetail();
    return EntriesAPI.getCustomer(id).then(function (res) {
      if (selectedCustomerId() !== id) return;
      var customer = res.customer || state.customerDetail;
      state.customerDetail = customer;
      state.customerDetailLoading = false;
      if (customer) {
        var label = EntriesAPI.customerListName(customer) || EntriesAPI.customerListLabel(customer);
        if (label) state.selectedCustomerLabel = label;
        var folder = EntriesAPI.customerFolderId(customer);
        if (folder && folder !== String(state.selectedCustomerFolderId || '')) {
          state.selectedCustomerFolderId = folder;
          loadCustomerEntrySettings();
        }
      }
      updateView();
    }).catch(function (err) {
      if (selectedCustomerId() !== id) return;
      state.customerDetailLoading = false;
      state.customerDetailError = err && err.message ? err.message : EntriesUI.t('customerLoadFailed');
      renderCustomerDetail();
      EntriesUI.pushToast(EntriesUI.t('customerLoadFailed'), {
        message: state.customerDetailError,
        tone: 'error'
      });
    });
  }

  function showCustomerEditError(msg) {
    if (!customerEditError) return;
    if (!msg) {
      customerEditError.classList.add('hidden');
      customerEditError.textContent = '';
      return;
    }
    customerEditError.textContent = msg;
    customerEditError.classList.remove('hidden');
  }

  function sidebarCardHtml(title, bodyHtml, editKey, editorHtml) {
    var html = '<div class="customer-profile__aside-card">';
    html += '<div class="aside-card__head"><h3>' + esc(title) + '</h3>';
    if (editKey) {
      html += '<button type="button" class="icon-btn aside-card__edit" data-sidebar-edit="' + esc(editKey) + '" aria-label="' + esc(EntriesUI.t('edit')) + '">+</button>';
    }
    html += '</div>';
    html += bodyHtml || '<span class="muted">—</span>';
    if (state.sidebarEditKey === editKey && editorHtml) html += editorHtml;
    html += '</div>';
    return html;
  }

  function sidebarEntriesBodyHtml() {
    var tabs = customerTabs();
    var groups = state.groups || [];
    var html = '';
    groups.forEach(function (group) {
      var count = (group.tab_id || []).length;
      html +=
        '<button type="button" class="customer-chip customer-chip--action" data-group-id="' + esc(String(group.id)) + '">' +
          '<span>' + esc(EntriesAPI.groupName(group)) + '</span>' +
          '<small>' + esc(String(count)) + ' ' + esc(EntriesUI.t(count === 1 ? 'entrySingular' : 'entriesPlural')) + '</small>' +
        '</button> ';
    });
    var ungrouped = EntriesAPI.getUngroupedTabs(state.basic, groups, tabs);
    ungrouped.forEach(function (tab) {
      var id = String(tab.id != null ? tab.id : tab.entry_id);
      html +=
        '<button type="button" class="customer-chip customer-chip--action" data-entry-id="' + esc(id) + '">' +
          '<span>' + esc(EntriesAPI.tabName(tab)) + '</span>' +
        '</button> ';
    });
    return html;
  }

  function sidebarFolderEditor(customer) {
    var selected = String(EntriesAPI.customerFolderId(customer) || state.selectedCustomerFolderId || '').trim();
    var options = '<option value=""></option>';
    (EntriesAPI.getFolders(state.basic) || []).forEach(function (folder) {
      var id = String(EntriesAPI.folderId(folder) || '').trim();
      if (!id) return;
      options += '<option value="' + esc(id) + '"' + (id === selected ? ' selected' : '') + '>' + esc(EntriesAPI.folderName(folder) || id) + '</option>';
    });
    return (
      '<div class="aside-card__editor">' +
        '<select data-sidebar-field="folder_id">' + options + '</select>' +
        '<div class="aside-card__editor-actions">' +
          '<button type="button" class="btn btn--primary btn--sm" data-sidebar-save="folder">' + esc(EntriesUI.t('save')) + '</button>' +
          '<button type="button" class="btn btn--ghost btn--sm" data-sidebar-cancel>' + esc(EntriesUI.t('cancel')) + '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function sidebarTagEditor(customer) {
    var selectedMap = {};
    customerTagIds(customer).forEach(function (id) { selectedMap[String(id)] = true; });
    var tags = basicData().tags || {};
    var list = [].concat(tags.visible || [], tags.all || []);
    var seen = {};
    var options = '';
    list.forEach(function (item) {
      var id = String(item && (item.id || item.tag_id) || '').trim();
      if (!id || seen[id]) return;
      seen[id] = true;
      var label = String(item && (item.name || item.label || item.tag_name) || id).trim();
      options += '<option value="' + esc(id) + '"' + (selectedMap[id] ? ' selected' : '') + '>' + esc(label) + '</option>';
    });
    return (
      '<div class="aside-card__editor">' +
        '<select data-sidebar-field="tag" multiple size="5">' + options + '</select>' +
        '<div class="aside-card__editor-actions">' +
          '<button type="button" class="btn btn--primary btn--sm" data-sidebar-save="tag">' + esc(EntriesUI.t('save')) + '</button>' +
          '<button type="button" class="btn btn--ghost btn--sm" data-sidebar-cancel>' + esc(EntriesUI.t('cancel')) + '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function sidebarParentEditor(customer) {
    var value = String(customer && (customer.parent_customer_id || customer.parent_cust_IIId || '') || '').trim();
    return (
      '<div class="aside-card__editor">' +
        '<input type="text" inputmode="numeric" data-sidebar-field="parent_customer_id" value="' + esc(value) + '" />' +
        '<div class="aside-card__editor-actions">' +
          '<button type="button" class="btn btn--primary btn--sm" data-sidebar-save="parent_customer">' + esc(EntriesUI.t('save')) + '</button>' +
          '<button type="button" class="btn btn--ghost btn--sm" data-sidebar-cancel>' + esc(EntriesUI.t('cancel')) + '</button>' +
        '</div>' +
      '</div>'
    );
  }

  async function saveSidebarField(kind) {
    var id = selectedCustomerId();
    if (!id || !customerDetail) return;
    var payload = { customer_id: id };
    if (kind === 'folder') {
      var folderSel = customerDetail.querySelector('[data-sidebar-field="folder_id"]');
      var folderId = String(folderSel && folderSel.value || '').trim();
      if (!folderId) return;
      payload.folder_id = folderId;
    } else if (kind === 'tag') {
      var tagSel = customerDetail.querySelector('[data-sidebar-field="tag"]');
      var tagIds = Array.prototype.map.call((tagSel && tagSel.selectedOptions) || [], function (opt) {
        return String(opt.value || '').trim();
      }).filter(Boolean);
      payload.tag = tagIds.join(',');
    } else if (kind === 'parent_customer') {
      var parentInput = customerDetail.querySelector('[data-sidebar-field="parent_customer_id"]');
      var parentId = String(parentInput && parentInput.value || '').trim();
      payload.parent_customer_id = parentId;
    } else {
      return;
    }

    state.customerSidebarSaving = true;
    renderCustomerDetail();
    try {
      var res = await EntriesAPI.editCustomer(payload);
      if (Number(res.success) === 0 || Number(res.exists) === 1) {
        throw new Error(res.message || EntriesUI.t('customerUpdateFailed'));
      }
      state.sidebarEditKey = '';
      await loadCustomerDetail();
    } catch (err) {
      EntriesUI.pushToast(EntriesUI.t('customerUpdateFailed'), {
        message: err && err.message ? err.message : '',
        tone: 'error'
      });
    } finally {
      state.customerSidebarSaving = false;
      renderCustomerDetail();
    }
  }

  async function removeSidebarChip(kind, id) {
    var customerId = selectedCustomerId();
    var wanted = String(id || '').trim();
    if (!customerId || !wanted) return;
    if (!customerDetail) return;

    state.customerSidebarSaving = true;
    renderCustomerDetail();
    try {
      var res = null;
      if (kind === 'tag') {
        res = await EntriesAPI.removeCustomerTag(customerId, wanted);
      } else if (kind === 'folder') {
        var remainingFolders = Array.prototype.map.call(
          customerDetail.querySelectorAll('.customer-chip[data-chip-kind="folder"][data-chip-id]'),
          function (chip) { return String(chip.getAttribute('data-chip-id') || '').trim(); }
        ).filter(function (folderId) {
          return folderId && folderId !== wanted;
        });
        if (!remainingFolders.length) {
          EntriesUI.pushToast(EntriesUI.t('customerUpdateFailed'), {
            message: EntriesUI.t('atLeastOneFolderRequired'),
            tone: 'error'
          });
          return;
        }
        res = await EntriesAPI.removeCustomerFolder(customerId, wanted);
      } else {
        return;
      }
      if (Number(res.success) === 0 || Number(res.exists) === 1) {
        throw new Error(res.message || EntriesUI.t('customerUpdateFailed'));
      }
      await loadCustomerDetail();
    } catch (err) {
      EntriesUI.pushToast(EntriesUI.t('customerUpdateFailed'), {
        message: err && err.message ? err.message : '',
        tone: 'error'
      });
    } finally {
      state.customerSidebarSaving = false;
      renderCustomerDetail();
    }
  }

  function customerStatusCurrentValue(customer, folderId) {
    var raw = String(customer && (customer.status || customer.status_name || customer.status_id || customer.internal_status) || '').trim();
    if (raw) {
      var match = lookupInternalStatus(raw, folderId);
      if (match) return statusItemValue(match);
      return raw;
    }
    var info = customerStatusInfo(customer);
    if (!info) return '';
    var list = getInternalStatusList(folderId);
    for (var i = 0; i < list.length; i += 1) {
      var item = list[i] || {};
      if (pickStatusName(item) === info.label) return statusItemValue(item);
    }
    return '';
  }

  function customerStatusOptionsHtml(folderId, selected) {
    var list = getInternalStatusList(folderId);
    var html = '<option value=""></option>';
    var seen = {};
    list.forEach(function (item) {
      if (!item) return;
      var id = statusItemValue(item);
      if (!id || seen[id]) return;
      seen[id] = true;
      var label = pickStatusName(item) || id;
      html += '<option value="' + esc(id) + '"' + (id === selected ? ' selected' : '') + '>' + esc(label) + '</option>';
    });
    return html;
  }

  function renderCustomerStatusInline(customer, folderId) {
    ensureInternalStatuses(folderId);
    var selected = customerStatusCurrentValue(customer, folderId);
    var disabled = state.customerStatusSaving ? ' disabled' : '';
    var html = '<label class="customer-status-inline">';
    html += '<select data-customer-status-select aria-label="' + esc(EntriesUI.t('status')) + '"' + disabled + '>';
    html += customerStatusOptionsHtml(folderId, selected);
    html += '</select>';
    html += '</label>';
    return html;
  }

  async function updateCustomerStatus(statusId) {
    var id = selectedCustomerId();
    if (!id) return;
    state.customerStatusSaving = true;
    renderCustomerDetail();
    try {
      var payload = { customer_id: id };
      if (statusId) payload.status = statusId;
      var res = await EntriesAPI.editCustomer(payload);
      if (Number(res.success) === 0 || Number(res.exists) === 1) {
        throw new Error(res.message || EntriesUI.t('customerUpdateFailed'));
      }
      await loadCustomerDetail();
    } catch (err) {
      EntriesUI.pushToast(EntriesUI.t('customerUpdateFailed'), {
        message: err && err.message ? err.message : '',
        tone: 'error'
      });
    } finally {
      state.customerStatusSaving = false;
      renderCustomerDetail();
    }
  }

  function normalizeEditValue(def, value) {
    var type = String(def && def.type || '').toLowerCase();
    if (value == null) return '';
    if (type === 'date') {
      var text = String(value).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
      var m = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
      return text;
    }
    if (Array.isArray(value)) return value.map(function (item) { return String(item == null ? '' : item).trim(); }).filter(Boolean).join(', ');
    return String(value);
  }

  function customerEditTopLevelKeys() {
    return {
      password: true,
      internal_status: true,
      status: true,
      status_id: true,
      customer_manager: true,
      name: true,
      company: true,
      phone: true,
      mobile: true,
      email: true,
      notes: true,
      note: true
    };
  }

  function isGroupFieldKey(key) {
    return /^ga-/i.test(normalizeFieldKey(key));
  }

  function extraFieldPayloadKey(key) {
    var normalized = normalizeFieldKey(key);
    if (/^ga-/.test(normalized)) return 'a-' + normalized.replace(/^ga-/, '');
    return String(key || '').trim();
  }

  function editableKeysForCustomer(folderId) {
    var keys = dashboardFieldsForFolder(folderId).slice();
    var unique = {};
    var out = [];
    keys.forEach(function (key) {
      key = String(key || '').trim();
      if (!key || unique[key]) return;
      unique[key] = true;
      out.push(key);
    });
    return out;
  }

  function renderEditFieldInput(key, def, value, attrs) {
    attrs = attrs || '';
    var label = extraFieldLabel(key);
    var type = String(def && def.type || '').toLowerCase();
    var val = normalizeEditValue(def, value);
    var html = '<label class="field"><span>' + esc(label) + '</span>';
    if (type === 'select') {
      var he = splitOptions(def.options_he);
      var en = splitOptions(def.options_en);
      var max = Math.max(he.length, en.length);
      html += '<select ' + attrs + '>';
      html += '<option value=""></option>';
      for (var i = 0; i < max; i += 1) {
        var optionValue = String(he[i] || en[i] || '').trim();
        var optionLabel = EntriesUI.getLang() === 'he' ? String(he[i] || en[i] || '').trim() : String(en[i] || he[i] || '').trim();
        if (!optionValue && !optionLabel) continue;
        html += '<option value="' + esc(optionValue) + '"' + (val === optionValue ? ' selected' : '') + '>' + esc(optionLabel || optionValue) + '</option>';
      }
      html += '</select>';
    } else if (type === 'textarea') {
      html += '<textarea rows="3" ' + attrs + '>' + esc(val) + '</textarea>';
    } else {
      var inputType = 'text';
      if (type === 'email') inputType = 'email';
      else if (type === 'tel') inputType = 'tel';
      else if (type === 'number') inputType = 'number';
      else if (type === 'date') inputType = 'date';
      html += '<input type="' + inputType + '" value="' + esc(val) + '" ' + attrs + ' />';
    }
    html += '</label>';
    return html;
  }

  function renderGroupEditSection(groupDef, customer, extra) {
    var rows = groupRows(customer, extra, groupDef);
    if (!rows.length) rows = [{}];
    var html = '<div class="customer-edit-dynamic__group"><h4>' + esc(labelFromDef(groupDef, groupDef.name)) + '</h4>';
    rows.forEach(function (row, rowIndex) {
      (groupDef.group_data || []).forEach(function (child) {
        if (!child) return;
        var val = pickByKey(row, child.name);
        if (val === undefined) val = pickCustomerFieldValue(customer, extra, child.name);
        var attrs = 'data-edit-group="' + esc(groupDef.name) + '" data-edit-row="' + esc(String(rowIndex)) + '" data-edit-child="' + esc(child.name) + '"';
        html += renderEditFieldInput(child.name, child, val, attrs);
      });
    });
    html += '</div>';
    return html;
  }

  function renderCustomerEditDynamic(customer) {
    if (!customerEditDynamic) return;
    var folderId = state.selectedCustomerFolderId || EntriesAPI.customerFolderId(customer);
    var extra = customerExtraFields(customer);
    var keys = editableKeysForCustomer(folderId);
    var html = '';
    var shownGroups = {};

    keys.forEach(function (key) {
      if (!key || customerEditTopLevelKeys()[key]) return;
      var def = extraFieldDef(key);
      var type = String(def && def.type || '').toLowerCase();
      if (type === 'title') {
        html += '<div class="customer-edit-dynamic__title">' + esc(labelFromDef(def, key)) + '</div>';
        return;
      }
      if (type === 'automation') return;
      var group = (def && type === 'group') ? def : (def && def._parentGroup) || null;
      if (group) {
        var gid = normalizeFieldKey(group.name);
        if (shownGroups[gid]) return;
        shownGroups[gid] = true;
        html += renderGroupEditSection(group, customer, extra);
        return;
      }
      var value = resolveDashboardValue(customer, extra, key);
      html += renderEditFieldInput(key, def, value, 'data-edit-key="' + esc(key) + '"');
    });

    var defs = extraFieldDefs();
    if (Array.isArray(defs)) {
      defs.forEach(function (item) {
        if (!item || String(item.type || '').toLowerCase() !== 'group') return;
        if (!isCertificateGroup(item)) return;
        var gid = normalizeFieldKey(item.name);
        if (shownGroups[gid]) return;
        shownGroups[gid] = true;
        html += renderGroupEditSection(item, customer, extra);
      });
    }

    customerEditDynamic.innerHTML = html;
  }

  function openCustomerEdit() {
    var customer = state.customerDetail;
    if (!selectedCustomerId()) return;
    showCustomerEditError('');
    var folderId = state.selectedCustomerFolderId || EntriesAPI.customerFolderId(customer);
    if (customerEditName) {
      customerEditName.value = (customer && (EntriesAPI.customerListName(customer) || customerValue(customer, ['name', 'full_name']))) || state.selectedCustomerLabel || '';
    }
    if (customerEditCompany) customerEditCompany.value = customerValue(customer, ['company', 'company_name']);
    if (customerEditPhone) customerEditPhone.value = customerValue(customer, ['phone', 'phone1', 'mobile', 'telephone', 'phone_number']);
    if (customerEditEmail) customerEditEmail.value = customerValue(customer, ['email', 'mail', 'user_email']);
    if (customerEditNotes) customerEditNotes.value = customerValue(customer, ['notes', 'note', 'internal_notes']);
    renderCustomerEditDynamic(customer || {});
    if (customerEditSaveBtn) {
      customerEditSaveBtn.disabled = false;
      customerEditSaveBtn.textContent = EntriesUI.t('save');
    }
    if (customerEditModal) customerEditModal.classList.remove('hidden');
  }

  function closeCustomerEdit() {
    if (customerEditModal) customerEditModal.classList.add('hidden');
    if (customerEditDynamic) customerEditDynamic.innerHTML = '';
    showCustomerEditError('');
  }

  function openDeleteCustomer() {
    if (!selectedCustomerId()) return;
    if (deleteCustomerModal) deleteCustomerModal.classList.remove('hidden');
  }

  function closeDeleteCustomer() {
    if (deleteCustomerModal) deleteCustomerModal.classList.add('hidden');
  }

  function renderGroupPicker() {
    var usingCustomerSettings = !!selectedCustomerId();
    var html = '';

    if (usingCustomerSettings && state.customerSettingsLoaded === false) {
      groupPicker.innerHTML = '<p class="muted picker-hint">' + esc(EntriesUI.t('loadingEntrySettings')) + '</p>';
      return;
    }

    var tabs = customerTabs();
    var groups = state.groups || [];

    if (groups.length) {
      html += '<div class="picker-grid">';
      groups.forEach(function (group) {
        var count = (group.tab_id || []).length;
        html +=
          '<button type="button" class="picker-card" data-group-id="' + esc(String(group.id)) + '">' +
            '<strong>' + esc(EntriesAPI.groupName(group)) + '</strong>' +
            '<span class="muted">' + count + ' ' + esc(EntriesUI.t(count === 1 ? 'entrySingular' : 'entriesPlural')) + '</span>' +
          '</button>';
      });
      html += '</div>';
    }

    var ungrouped = EntriesAPI.getUngroupedTabs(state.basic, groups, tabs);

    if (ungrouped.length) {
      if (groups.length) {
        html += '<div class="picker-section-title">' + esc(EntriesUI.t('otherEntries')) + '</div>';
      }
      html += '<div class="picker-grid picker-grid--entries">';
      ungrouped.forEach(function (tab) {
        var id = String(tab.id != null ? tab.id : tab.entry_id);
        html +=
          '<button type="button" class="picker-card picker-card--entry" data-entry-id="' + esc(id) + '">' +
            '<strong>' + esc(EntriesAPI.tabName(tab)) + '</strong>' +
          '</button>';
      });
      html += '</div>';
    }

    if (!html || (!groups.length && !ungrouped.length)) {
      html = '<p class="muted picker-hint">' +
        esc(usingCustomerSettings ? EntriesUI.t('noEntrySettings') : EntriesUI.t('noTabs')) +
        '</p>';
    }
    if (usingCustomerSettings) {
      html = '<div class="picker-section-title">' + esc(EntriesUI.t('groupsSection')) + '</div>' + html;
    }
    groupPicker.innerHTML = html;
  }

  function renderEntryPicker() {
    var tabs = [];
    var group = findGroup(state.selectedGroupId);
    if (group) tabs = EntriesAPI.getTabsInGroup(state.basic, group, customerTabs());
    else if (selectedCustomerId()) tabs = EntriesAPI.getUngroupedTabs(state.basic, state.groups, customerTabs());
    else if (state.entryId) {
      var tab = selectedTab();
      if (tab) tabs = [tab];
    }

    if (!tabs.length) {
      entryPicker.innerHTML = '<p class="muted picker-hint">' + esc(EntriesUI.t('selectEntry')) + '</p>';
      return;
    }

    var html = '<div class="picker-strip">';
    tabs.forEach(function (tab) {
      var id = String(tab.id != null ? tab.id : tab.entry_id);
      var active = id === String(state.entryId) && state.navLevel === 'data';
      html +=
        '<button type="button" class="tab-chip' + (active ? ' is-active' : '') + '" data-entry-id="' + esc(id) + '">' +
          esc(EntriesAPI.tabName(tab)) +
        '</button>';
    });
    html += '</div>';
    entryPicker.innerHTML = html;
  }

  function navSnapshot() {
    return {
      app: 'entries',
      navLevel: state.navLevel || 'customers',
      selectedCustomerId: String(state.selectedCustomerId || ''),
      selectedCustomerLabel: String(state.selectedCustomerLabel || ''),
      selectedCustomerFolderId: String(state.selectedCustomerFolderId || ''),
      selectedGroupId: String(state.selectedGroupId || ''),
      entryId: String(state.entryId || ''),
      browseFolderId: String(state.browseFolderId || ''),
      browseSearch: String(state.browseSearch || ''),
      browseOffset: Number(state.browseOffset) || 0
    };
  }

  function navPath(snap) {
    snap = snap || navSnapshot();
    if (snap.navLevel === 'data' && snap.entryId) {
      return '#/customer/' + encodeURIComponent(snap.selectedCustomerId) + '/entry/' + encodeURIComponent(snap.entryId);
    }
    if (snap.navLevel === 'entries' && snap.selectedGroupId) {
      return '#/customer/' + encodeURIComponent(snap.selectedCustomerId) + '/group/' + encodeURIComponent(snap.selectedGroupId);
    }
    if ((snap.navLevel === 'groups' || snap.navLevel === 'data' || snap.navLevel === 'entries') && snap.selectedCustomerId) {
      return '#/customer/' + encodeURIComponent(snap.selectedCustomerId);
    }
    return '#/customers';
  }

  function sameNav(a, b) {
    if (!a || !b) return false;
    return a.navLevel === b.navLevel &&
      String(a.selectedCustomerId || '') === String(b.selectedCustomerId || '') &&
      String(a.selectedGroupId || '') === String(b.selectedGroupId || '') &&
      String(a.entryId || '') === String(b.entryId || '');
  }

  function syncNav(mode) {
    if (applyingHistory) return;
    var snap = navSnapshot();
    var prev = history.state;
    if (mode === 'push' && prev && prev.app === 'entries' && sameNav(prev, snap)) mode = 'replace';
    var url = location.pathname + location.search + navPath(snap);
    if (mode === 'push') history.pushState(snap, '', url);
    else history.replaceState(snap, '', url);
  }

  function parseNavHash() {
    var hash = String(location.hash || '').replace(/^#/, '');
    var parts = hash.split('/').filter(Boolean);
    if (!parts.length || parts[0] === 'customers') {
      return { app: 'entries', navLevel: 'customers' };
    }
    if (parts[0] === 'customer' && parts[1]) {
      var id = decodeURIComponent(parts[1]);
      if (parts[2] === 'entry' && parts[3]) {
        return { app: 'entries', navLevel: 'data', selectedCustomerId: id, entryId: decodeURIComponent(parts[3]) };
      }
      if (parts[2] === 'group' && parts[3]) {
        return { app: 'entries', navLevel: 'entries', selectedCustomerId: id, selectedGroupId: decodeURIComponent(parts[3]) };
      }
      return { app: 'entries', navLevel: 'groups', selectedCustomerId: id };
    }
    return null;
  }

  function restoreCustomers(snap) {
    snap = snap || {};
    state.navLevel = 'customers';
    state.selectedCustomerId = '';
    state.selectedCustomerLabel = '';
    state.selectedCustomerFolderId = '';
    state.customerDetail = null;
    state.customerDetailLoading = false;
    state.customerDetailError = '';
    state.automationTarget = 'entries';
    state.customerSettingsLoaded = false;
    state.customerSettingsFolderId = '';
    state.selectedGroupId = '';
    state.entryId = '';
    state.rows = [];
    state.total = 0;
    state.offset = 0;
    state.search = '';
    if (searchInput) searchInput.value = '';
    applyBasicTabs();
    if (snap.browseFolderId != null && String(snap.browseFolderId) !== '') {
      state.browseFolderId = String(snap.browseFolderId);
    } else {
      state.browseFolderId = EntriesAPI.getCustomerListFolderId(state.basic) || '2716';
    }
    state.browseSearch = String(snap.browseSearch || '');
    if (customerBrowseInput) customerBrowseInput.value = state.browseSearch;
    state.browseOffset = Number(snap.browseOffset) || 0;
    updateView();
    loadCustomersBrowse();
    loadFolderCounts();
  }

  function applyNavSnapshot(snap) {
    snap = snap || {};
    applyingHistory = true;
    try {
      if (snap.navLevel === 'groups' && snap.selectedCustomerId) {
        openCustomer(snap.selectedCustomerId, snap.selectedCustomerLabel, snap.selectedCustomerFolderId);
        return;
      }
      if (snap.navLevel === 'entries' && snap.selectedCustomerId) {
        state.selectedCustomerId = String(snap.selectedCustomerId);
        state.selectedCustomerLabel = String(snap.selectedCustomerLabel || state.selectedCustomerLabel || '');
        state.selectedCustomerFolderId = String(snap.selectedCustomerFolderId || state.selectedCustomerFolderId || '');
        if (!state.customerDetail) loadCustomerDetail();
        openGroup(snap.selectedGroupId);
        return;
      }
      if (snap.navLevel === 'data' && snap.entryId) {
        state.selectedCustomerId = String(snap.selectedCustomerId || state.selectedCustomerId || '');
        state.selectedCustomerLabel = String(snap.selectedCustomerLabel || state.selectedCustomerLabel || '');
        state.selectedCustomerFolderId = String(snap.selectedCustomerFolderId || state.selectedCustomerFolderId || '');
        state.selectedGroupId = String(snap.selectedGroupId || state.selectedGroupId || '');
        if (snap.selectedCustomerId && !state.customerDetail) loadCustomerDetail();
        selectEntry(snap.entryId);
        return;
      }
      restoreCustomers(snap);
    } finally {
      applyingHistory = false;
    }
  }

  function openCustomers() {
    restoreCustomers({
      browseFolderId: EntriesAPI.getCustomerListFolderId(state.basic) || '2716',
      browseSearch: '',
      browseOffset: 0
    });
    if (customerBrowseInput) customerBrowseInput.value = '';
    state.browseSearch = '';
    syncNav('replace');
  }

  function loadCustomerEntrySettings() {
    var folderId = String(state.selectedCustomerFolderId || '').trim();
    state.customerSettingsLoaded = false;
    state.customerSettingsFolderId = folderId;
    applyCustomerSettings([]);
    updateView();

    if (!folderId) {
      state.customerSettingsLoaded = true;
      updateView();
      return Promise.resolve();
    }

    return EntriesAPI.listEntrySettings({
      folders: folderId,
      show_in_customer: 1,
      limit: 25
    }).then(function (res) {
      if (String(state.selectedCustomerFolderId || '') !== folderId) return;
      applyCustomerSettings(res.rows || []);
      state.customerSettingsLoaded = true;
      updateView();
    }).catch(function (err) {
      state.customerSettingsLoaded = true;
      applyCustomerSettings([]);
      updateView();
      EntriesUI.pushToast(EntriesUI.t('entrySettingsFailed'), {
        message: err && err.message ? err.message : '',
        tone: 'error'
      });
    });
  }

  function openCustomer(id, label, folderId) {
    var customerId = String(id || '').trim();
    if (!customerId) return;
    state.selectedCustomerId = customerId;
    state.selectedCustomerLabel = String(label || '').trim() || ('#' + customerId);
    var folder = String(folderId || '').trim();
    if (!folder) {
      folder = EntriesAPI.customerFolderId(findBrowseCustomer(customerId));
    }
    state.selectedCustomerFolderId = folder;
    state.customerDetail = findBrowseCustomer(customerId) || null;
    state.customerDetailLoading = true;
    state.customerDetailError = '';
    openGroups();
    loadCustomerDetail();
    syncNav('push');
  }

  function openGroups() {
    if (!selectedCustomerId()) {
      openCustomers();
      return;
    }
    state.navLevel = 'groups';
    state.selectedGroupId = '';
    state.entryId = '';
    state.rows = [];
    state.total = 0;
    state.offset = 0;
    state.search = '';
    searchInput.value = '';
    updateView();
    var folderId = String(state.selectedCustomerFolderId || '');
    if (!state.customerSettingsLoaded || state.customerSettingsFolderId !== folderId) {
      loadCustomerEntrySettings();
    }
  }

  function openGroup(groupId) {
    state.navLevel = 'entries';
    state.selectedGroupId = String(groupId);
    state.entryId = '';
    state.rows = [];
    state.total = 0;
    state.offset = 0;
    updateView();
    syncNav('push');
  }

  function selectEntry(entryId) {
    state.entryId = String(entryId || '');
    state.navLevel = 'data';
    state.offset = 0;
    state.search = '';
    searchInput.value = '';
    loadColumnPrefs(state.entryId);
    state.selectedIds = {};
    closeFieldPicker();
    updateView();
    renderFieldPicker();
    loadRows();
    syncNav('push');
  }

  function navBack() {
    if (history.state && history.state.app === 'entries' && state.navLevel !== 'customers') {
      history.back();
      return;
    }
    if (state.navLevel === 'data') {
      if (state.selectedGroupId) {
        state.navLevel = 'entries';
        state.entryId = '';
        state.rows = [];
        state.total = 0;
        updateView();
        syncNav('replace');
        return;
      }
      openGroups();
      syncNav('replace');
      return;
    }
    if (state.navLevel === 'entries') {
      openGroups();
      syncNav('replace');
      return;
    }
    if (state.navLevel === 'groups') {
      openCustomers();
    }
  }

  function pulseRow(id) {
    if (!id) return;
    var rows = tableBody.querySelectorAll('[data-row-id]');
    var row = null;
    for (var i = 0; i < rows.length; i += 1) {
      if (rows[i].getAttribute('data-row-id') === String(id)) {
        row = rows[i];
        break;
      }
    }
    if (!row) return;
    row.classList.add('pulse-effect');
    if (state.pulseTimers[id]) clearTimeout(state.pulseTimers[id]);
    state.pulseTimers[id] = setTimeout(function () {
      row.classList.remove('pulse-effect');
      delete state.pulseTimers[id];
    }, 1600);
  }

  function pulseCustomerRow(id) {
    if (!id) return;
    var rows = document.querySelectorAll('.customer-row[data-customer-id]');
    var row = null;
    for (var i = 0; i < rows.length; i += 1) {
      if (rows[i].getAttribute('data-customer-id') === String(id)) {
        row = rows[i];
        break;
      }
    }
    if (!row) return;
    row.classList.add('pulse-effect');
    var timerKey = 'c-' + id;
    if (state.pulseTimers[timerKey]) clearTimeout(state.pulseTimers[timerKey]);
    state.pulseTimers[timerKey] = setTimeout(function () {
      row.classList.remove('pulse-effect');
      delete state.pulseTimers[timerKey];
    }, 1600);
  }

  function handleCustomerRealtimeEvent(key, payload) {
    var eventCustomerId = EntriesAPI.getRealtimeCustomerId(payload);
    var viewingId = selectedCustomerId();
    var isDelete = /deleted|removed|delete/i.test(key);
    var isCreate = /created|add|crm\.lead/i.test(key);

    if (isDelete) {
      EntriesUI.pushToast(EntriesUI.t('customerDeleted'), {
        message: EntriesUI.t('customerRemovedLive'),
        tone: 'warning'
      });
      if (viewingId && eventCustomerId && String(viewingId) === String(eventCustomerId)) {
        restoreCustomers({});
        syncNav('replace');
        loadFolderCounts();
        loadCustomersBrowse();
        return;
      }
    } else if (isCreate) {
      EntriesUI.pushToast(EntriesUI.t('newCustomer'), {
        message: EntriesUI.t('customerAddedLive'),
        tone: 'success'
      });
    } else {
      EntriesUI.pushToast(EntriesUI.t('customerUpdated'), {
        message: EntriesUI.t('customerUpdatedLive'),
        tone: 'info'
      });
    }

    loadFolderCounts();

    if (state.navLevel === 'customers') {
      loadCustomersBrowse().then(function () {
        if (eventCustomerId) pulseCustomerRow(eventCustomerId);
      });
      return;
    }

    if (viewingId && (!eventCustomerId || String(viewingId) === String(eventCustomerId))) {
      loadCustomerDetail();
      if (state.navLevel === 'data' && state.entryId) {
        loadRows();
      }
    }
  }

  function handleEntriesRealtimeEvent(key, payload) {
    var eventEntryId = EntriesAPI.getRealtimeEntryId(payload);
    var eventCustomerId = EntriesAPI.getRealtimeCustomerId(payload);
    var viewingId = selectedCustomerId();

    if (eventEntryId != null && state.entryId && String(eventEntryId) !== String(state.entryId)) {
      return;
    }
    if (viewingId && eventCustomerId && String(viewingId) !== String(eventCustomerId)) {
      return;
    }

    var rowId = EntriesAPI.getRealtimeRowId(payload);
    var isDelete = /deleted|removed|delete/i.test(key);
    var isCreate = /created|add/i.test(key);

    if (isDelete) {
      EntriesUI.pushToast(EntriesUI.t('entryDeleted'), {
        message: EntriesUI.t('rowRemovedLive'),
        tone: 'warning'
      });
    } else if (isCreate) {
      EntriesUI.pushToast(EntriesUI.t('entryAdded'), {
        message: EntriesUI.t('entryAddedLive'),
        tone: 'success'
      });
    } else {
      EntriesUI.pushToast(EntriesUI.t('entryUpdated'), {
        message: EntriesUI.t('entryUpdatedLive'),
        tone: 'info'
      });
    }

    if (state.navLevel !== 'data' || !state.entryId) return;

    loadRows().then(function () {
      if (rowId) pulseRow(rowId);
    });
  }

  function statusChipHtml(tab, row) {
    var info = EntriesAPI.resolveStatus(tab, row);
    if (!info || !info.label) {
      return '<span class="muted">—</span>';
    }
    var color = info.color || '#64748b';
    return (
      '<span class="status-chip" style="--chip:' + esc(color) + '" title="' + esc(info.raw || info.label) + '">' +
        esc(info.label) +
      '</span>'
    );
  }

  function totalPages() {
    return Math.max(1, Math.ceil((state.total || 0) / PAGE_SIZE));
  }

  function currentPage() {
    return Math.floor(state.offset / PAGE_SIZE) + 1;
  }

  function renderPager(options) {
    options = options || {};
    var total = options.total != null ? options.total : state.total;
    var offset = options.offset != null ? options.offset : state.offset;
    var loading = options.loading != null ? options.loading : state.loading;
    var pageStart = total === 0 ? 0 : offset + 1;
    var pageEnd = Math.min(offset + PAGE_SIZE, total);
    listMeta.textContent = loading
      ? EntriesUI.t('loading')
      : pageStart + '–' + pageEnd + ' ' + EntriesUI.t('of') + ' ' + total;
    if (state.navLevel === 'data') {
      clearSearchBtn.classList.toggle('hidden', !state.search);
    }
    if (state.navLevel === 'customers' && clearCustomerBrowseBtn) {
      clearCustomerBrowseBtn.classList.toggle('hidden', !String(state.browseSearch || '').trim());
    }

    var pages = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE));
    var current = Math.floor(offset / PAGE_SIZE) + 1;
    var html = '';

    function pageBtn(label, page, extraClass, disabled) {
      return (
        '<button type="button" class="page-btn' + (extraClass ? ' ' + extraClass : '') + '"' +
        (disabled ? ' disabled' : '') +
        ' data-page="' + page + '">' + esc(label) + '</button>'
      );
    }

    html += pageBtn('«', 1, '', current <= 1 || loading);
    html += pageBtn('‹', Math.max(1, current - 1), '', current <= 1 || loading);

    var windowSize = 2;
    var start = Math.max(1, current - windowSize);
    var end = Math.min(pages, current + windowSize);
    if (start > 1) {
      html += pageBtn('1', 1, '', loading);
      if (start > 2) html += '<span class="page-ellipsis">…</span>';
    }
    for (var p = start; p <= end; p += 1) {
      html += pageBtn(String(p), p, p === current ? 'is-active' : '', loading);
    }
    if (end < pages) {
      if (end < pages - 1) html += '<span class="page-ellipsis">…</span>';
      html += pageBtn(String(pages), pages, '', loading);
    }

    html += pageBtn('›', Math.min(pages, current + 1), '', current >= pages || loading);
    html += pageBtn('»', pages, '', current >= pages || loading);
    pagerPages.innerHTML = html;
  }

  function defaultColumnPrefs() {
    return { hidden: {}, order: [], sortKey: '', sortDir: 'desc' };
  }

  function loadColumnPrefs(entryId) {
    var prefs = defaultColumnPrefs();
    try {
      var all = JSON.parse(localStorage.getItem(COL_PREFS_KEY) || '{}');
      var saved = all && entryId ? all[String(entryId)] : null;
      if (saved && typeof saved === 'object') {
        prefs.hidden = saved.hidden && typeof saved.hidden === 'object' ? saved.hidden : {};
        prefs.order = Array.isArray(saved.order) ? saved.order : [];
        prefs.sortKey = saved.sortKey || '';
        prefs.sortDir = saved.sortDir === 'asc' ? 'asc' : 'desc';
      }
    } catch (e) { /* ignore */ }
    state.hiddenColumns = prefs.hidden;
    state.columnOrder = prefs.order;
    state.sortKey = prefs.sortKey;
    state.sortDir = prefs.sortDir;
    state.fieldPickerQuery = '';
    if (fieldPickerSearch) fieldPickerSearch.value = '';
  }

  function saveColumnPrefs() {
    if (!state.entryId) return;
    try {
      var all = JSON.parse(localStorage.getItem(COL_PREFS_KEY) || '{}');
      if (!all || typeof all !== 'object') all = {};
      all[String(state.entryId)] = {
        hidden: state.hiddenColumns || {},
        order: state.columnOrder || [],
        sortKey: state.sortKey || '',
        sortDir: state.sortDir || 'desc'
      };
      localStorage.setItem(COL_PREFS_KEY, JSON.stringify(all));
    } catch (e) { /* ignore */ }
  }

  function columnKey(col) {
    if (!col) return '';
    if (col.kind === 'customer') return 'customer';
    if (col.kind === 'status') return 'status';
    if (col.field && col.field.name) return String(col.field.name);
    if (col.field) return 'data' + EntriesAPI.fieldNumber(col.field, 0);
    return '';
  }

  function columnLabel(col, index) {
    if (col.kind === 'customer') return EntriesUI.t('customer');
    if (col.kind === 'status') return EntriesAPI.statusColumnName(selectedTab());
    return EntriesAPI.fieldLabel(col.field, index);
  }

  function columnDisplayName(col, index) {
    return columnLabel(col, index);
  }

  function listColumnDefs(tab) {
    var cols = [];
    if (!selectedCustomerId()) cols.push({ kind: 'customer' });
    cols = cols.concat(EntriesAPI.orderedColumns(tab));
    var byKey = {};
    cols.forEach(function (col, index) {
      col.key = columnKey(col);
      col.label = columnLabel(col, index);
      col.displayName = columnDisplayName(col, index);
      byKey[col.key] = col;
    });
    var ordered = [];
    var used = {};
    (state.columnOrder || []).forEach(function (key) {
      if (byKey[key] && !used[key]) {
        ordered.push(byKey[key]);
        used[key] = true;
      }
    });
    cols.forEach(function (col) {
      if (!used[col.key]) ordered.push(col);
    });
    return ordered;
  }

  function visibleColumns(tab) {
    return listColumnDefs(tab).filter(function (col) {
      return !state.hiddenColumns[col.key];
    });
  }

  function isFieldPickerOpen() {
    return fieldPickerPanel && !fieldPickerPanel.classList.contains('hidden');
  }

  function openFieldPicker() {
    if (!fieldPickerPanel) return;
    fieldPickerPanel.classList.remove('hidden');
    if (fieldPicker) fieldPicker.classList.add('is-open');
    if (fieldPickerBtn) fieldPickerBtn.setAttribute('aria-expanded', 'true');
    renderFieldPicker();
    if (fieldPickerSearch) {
      setTimeout(function () { fieldPickerSearch.focus(); }, 0);
    }
  }

  function closeFieldPicker() {
    if (!fieldPickerPanel) return;
    fieldPickerPanel.classList.add('hidden');
    if (fieldPicker) fieldPicker.classList.remove('is-open');
    if (fieldPickerBtn) fieldPickerBtn.setAttribute('aria-expanded', 'false');
  }

  function toggleFieldPicker() {
    if (isFieldPickerOpen()) closeFieldPicker();
    else openFieldPicker();
  }

  function renderFieldPicker() {
    if (!fieldPickerList) return;
    var tab = selectedTab();
    if (!tab || state.navLevel !== 'data') {
      fieldPickerList.innerHTML = '';
      return;
    }
    var query = String(state.fieldPickerQuery || '').trim().toLowerCase();
    var cols = listColumnDefs(tab).filter(function (col) {
      if (!query) return true;
      var name = String(col.field && col.field.name ? col.field.name : '');
      return String(col.displayName || '').toLowerCase().indexOf(query) >= 0 ||
        String(col.label || '').toLowerCase().indexOf(query) >= 0 ||
        name.toLowerCase().indexOf(query) >= 0;
    });
    if (!cols.length) {
      fieldPickerList.innerHTML = '<div class="field-picker__empty">' + esc(EntriesUI.t('noMatches')) + '</div>';
      return;
    }
    fieldPickerList.innerHTML = cols.map(function (col) {
      var on = !state.hiddenColumns[col.key];
      return (
        '<div class="field-picker__item" draggable="true" data-col-key="' + esc(col.key) + '">' +
          '<span class="field-picker__handle" aria-hidden="true">⋮⋮</span>' +
          '<label class="field-picker__switch">' +
            '<input type="checkbox" data-col-toggle="' + esc(col.key) + '"' + (on ? ' checked' : '') + ' />' +
            '<span class="field-picker__knob"></span>' +
          '</label>' +
          '<span class="field-picker__name" title="' + esc(col.label) + '">' + esc(col.label) + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function setColumnVisible(key, visible) {
    if (visible) delete state.hiddenColumns[key];
    else state.hiddenColumns[key] = true;
    saveColumnPrefs();
    renderFieldPicker();
    renderRows();
  }

  function setSort(key, dir) {
    if (state.sortKey === key && state.sortDir === dir) {
      state.sortKey = '';
      state.sortDir = 'desc';
    } else {
      state.sortKey = key;
      state.sortDir = dir === 'asc' ? 'asc' : 'desc';
    }
    state.offset = 0;
    saveColumnPrefs();
    renderFieldPicker();
    loadRows();
  }

  function toggleSort(key) {
    if (state.sortKey === key) {
      setSort(key, state.sortDir === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSort(key, 'asc');
  }

  function moveColumn(fromKey, toKey) {
    if (!fromKey || !toKey || fromKey === toKey) return;
    var cols = listColumnDefs(selectedTab());
    var keys = cols.map(function (col) { return col.key; });
    var from = keys.indexOf(fromKey);
    var to = keys.indexOf(toKey);
    if (from < 0 || to < 0) return;
    keys.splice(to, 0, keys.splice(from, 1)[0]);
    state.columnOrder = keys;
    saveColumnPrefs();
    renderFieldPicker();
    renderRows();
  }

  function parseSortDate(value) {
    var formatted = EntriesAPI.formatDateValue(value);
    if (!formatted) return 0;
    var t = Date.parse(formatted.replace(' ', 'T'));
    return isNaN(t) ? 0 : t;
  }

  function sortCellValue(row, col, tab) {
    if (col.kind === 'customer') return String(EntriesAPI.customerName(row) || '').toLowerCase();
    if (col.kind === 'status') {
      var info = EntriesAPI.resolveStatus(tab, row);
      return String((info && info.label) || row.status || '').toLowerCase();
    }
    if (!col.field) return '';
    var index = EntriesAPI.fieldNumber(col.field, 0);
    var raw = row ? row['data' + index] : '';
    var type = EntriesAPI.fieldInputType(col.field);
    if (EntriesAPI.isDateFieldType(type)) return parseSortDate(raw);
    if (type.indexOf('number') >= 0 || type === 'year' || type.indexOf('int') >= 0 || type.indexOf('float') >= 0) {
      var num = Number(raw);
      return isNaN(num) ? 0 : num;
    }
    return String(EntriesAPI.displayFieldValue(col.field, row) || raw || '').toLowerCase();
  }

  function sortRows(rows, tab) {
    if (!state.sortKey || !rows || !rows.length) return rows || [];
    var cols = listColumnDefs(tab);
    var col = null;
    for (var i = 0; i < cols.length; i += 1) {
      if (cols[i].key === state.sortKey) {
        col = cols[i];
        break;
      }
    }
    if (!col) return rows;
    var dir = state.sortDir === 'asc' ? 1 : -1;
    return rows.slice().sort(function (a, b) {
      var va = sortCellValue(a, col, tab);
      var vb = sortCellValue(b, col, tab);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      var sa = String(va);
      var sb = String(vb);
      if (sa < sb) return -1 * dir;
      if (sa > sb) return 1 * dir;
      return 0;
    });
  }

  function needsClientSort() {
    return !!state.sortKey;
  }

  function customerAdminUrl(customerId) {
    var id = String(customerId || '').trim();
    if (!id) return CUSTOMER_ADMIN_URL;
    return CUSTOMER_ADMIN_URL.replace(/\/+$/, '') + '/' + encodeURIComponent(id);
  }

  function customerCellHtml(name, customerId) {
    var label = name || '—';
    if (!name) return '<span class="muted">—</span>';
    var id = String(customerId || '').trim();
    if (!id) return '<span class="col-customer">' + esc(label) + '</span>';
    var href = customerAdminUrl(id);
    return (
      '<a class="customer-link" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer" data-customer-id="' + esc(id) + '">' +
        esc(label) +
      '</a>'
    );
  }

  function selectedIdList() {
    return Object.keys(state.selectedIds || {}).filter(function (id) {
      return !!state.selectedIds[id];
    });
  }

  function selectedCount() {
    return selectedIdList().length;
  }

  function isRowSelected(id) {
    return !!(id && state.selectedIds[String(id)]);
  }

  function setRowSelected(id, selected) {
    id = String(id || '');
    if (!id) return;
    if (selected) state.selectedIds[id] = true;
    else delete state.selectedIds[id];
  }

  function pageRowIds() {
    return (state.rows || []).map(function (row) {
      return EntriesAPI.rowId(row);
    }).filter(Boolean);
  }

  function allPageRowsSelected() {
    var ids = pageRowIds();
    if (!ids.length) return false;
    for (var i = 0; i < ids.length; i += 1) {
      if (!isRowSelected(ids[i])) return false;
    }
    return true;
  }

  function somePageRowsSelected() {
    var ids = pageRowIds();
    var count = 0;
    for (var i = 0; i < ids.length; i += 1) {
      if (isRowSelected(ids[i])) count += 1;
    }
    return count > 0 && count < ids.length;
  }

  function renderBulkBar() {
    if (!bulkMeta) return;
    var count = selectedCount();
    bulkMeta.textContent = count
      ? EntriesUI.t('selectedCount').replace('{n}', String(count))
      : '';
  }

  function syncSelectAllCheckbox() {
    var el = document.getElementById('selectAllRows');
    if (!el) return;
    el.checked = allPageRowsSelected();
    el.indeterminate = somePageRowsSelected();
  }

  function csvEscape(value) {
    var text = String(value == null ? '' : value);
    if (/[",\n\r]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
    return text;
  }

  function exportCellValue(col, row, tab, index) {
    if (col.kind === 'customer') return EntriesAPI.customerName(row) || '';
    if (col.kind === 'status') {
      var info = EntriesAPI.resolveStatus(tab, row);
      return (info && info.label) || '';
    }
    return EntriesAPI.displayFieldValue(col.field, row, index) || '';
  }

  function rowsToCsv(rows, tab) {
    var cols = visibleColumns(tab);
    var header = cols.map(function (col) { return csvEscape(col.label); }).join(',');
    var lines = [header];
    (rows || []).forEach(function (row) {
      lines.push(cols.map(function (col, index) {
        return csvEscape(exportCellValue(col, row, tab, index));
      }).join(','));
    });
    return '\uFEFF' + lines.join('\r\n');
  }

  function exportFileName(tab) {
    var name = String(EntriesAPI.tabName(tab) || 'entries').replace(/[^\w\u0590-\u05FF\-]+/g, '_');
    var now = new Date();
    var stamp = now.getFullYear() +
      '-' + String(now.getMonth() + 1).padStart(2, '0') +
      '-' + String(now.getDate()).padStart(2, '0');
    return name + '_' + stamp + '.csv';
  }

  function downloadCsv(filename, csv) {
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
  }

  function setExportBusy(busy) {
    var label = EntriesUI.t(busy ? 'exporting' : 'export');
    [exportDataBtn, exportDataBulkBtn].forEach(function (btn) {
      if (!btn) return;
      btn.disabled = !!busy;
      var text = btn.querySelector('span');
      if (text) text.textContent = label;
    });
  }

  function exportData() {
    var tab = selectedTab();
    if (!tab || !state.entryId) {
      EntriesUI.pushToast(EntriesUI.t('exportEmpty'), { tone: 'warning' });
      return Promise.resolve();
    }

    var selected = selectedIdList();
    var searchTerm = String(state.search || '').trim();
    setExportBusy(true);

    return EntriesAPI.fetchAllEntryRows(scopedListParams({
      entry_id: state.entryId,
      search: searchTerm,
      order: 'id_desc'
    })).then(function (listed) {
      var rows = listed.rows || [];
      if (searchTerm) rows = EntriesAPI.filterRowsBySearch(rows, tab, searchTerm);
      rows = sortRows(rows, tab);
      if (selected.length) {
        var wanted = {};
        selected.forEach(function (id) { wanted[String(id)] = true; });
        rows = rows.filter(function (row) {
          return wanted[String(EntriesAPI.rowId(row))];
        });
      }
      if (!rows.length) {
        EntriesUI.pushToast(EntriesUI.t('exportEmpty'), { tone: 'warning' });
        return;
      }
      downloadCsv(exportFileName(tab), rowsToCsv(rows, tab));
      EntriesUI.pushToast(EntriesUI.t('exportDone'), {
        message: String(rows.length),
        tone: 'success'
      });
    }).catch(function (err) {
      EntriesUI.pushToast(EntriesUI.t('exportFailed'), {
        message: err && err.message ? err.message : '',
        tone: 'error'
      });
    }).finally(function () {
      setExportBusy(false);
    });
  }

  function renderRows() {
    var tab = selectedTab();
    var cols = visibleColumns(tab);
    renderPager();
    renderFieldPicker();
    renderBulkBar();

    if (!state.loading && !state.rows.length) {
      emptyState.classList.remove('hidden');
      tableScroll.classList.add('hidden');
      tableHead.innerHTML = '';
      tableBody.innerHTML = '';
      return;
    }

    emptyState.classList.add('hidden');
    tableScroll.classList.remove('hidden');

    var head = '<tr>';
    head +=
      '<th class="col-check">' +
        '<input type="checkbox" id="selectAllRows" aria-label="Select all" />' +
      '</th>';
    cols.forEach(function (col, index) {
      var sorted = state.sortKey === col.key;
      var cls = col.kind === 'customer' ? ' class="col-customer"' : '';
      head +=
        '<th' + cls + '>' +
          '<button type="button" class="th-sort' + (sorted ? ' is-sorted' : '') + '" data-sort-key="' + esc(col.key) + '" title="' +
            esc(state.sortDir === 'asc' ? EntriesUI.t('sortAsc') : EntriesUI.t('sortDesc')) + '">' +
            '<span>' + esc(col.label || columnLabel(col, index)) + '</span>' +
            '<span class="th-sort__icon" aria-hidden="true">' +
              (sorted ? (state.sortDir === 'asc' ? '▲' : '▼') : '↕') +
            '</span>' +
          '</button>' +
        '</th>';
    });
    head += '<th class="col-actions">' + esc(EntriesUI.t('actions')) + '</th></tr>';
    tableHead.innerHTML = head;

    tableBody.innerHTML = state.rows.map(function (row) {
      var id = EntriesAPI.rowId(row);
      var cells =
        '<td class="col-check">' +
          '<input type="checkbox" data-select-row="' + esc(id) + '"' + (isRowSelected(id) ? ' checked' : '') + ' />' +
        '</td>';
      cols.forEach(function (col, index) {
        if (col.kind === 'customer') {
          cells += '<td class="col-customer">' +
            customerCellHtml(EntriesAPI.customerName(row), EntriesAPI.rowCustomerId(row)) +
            '</td>';
          return;
        }
        if (col.kind === 'status') {
          cells += '<td>' + statusChipHtml(tab, row) + '</td>';
          return;
        }
        var display = EntriesAPI.displayFieldValue(col.field, row, index);
        cells += '<td title="' + esc(display) + '">' + (display ? esc(display) : '<span class="muted">—</span>') + '</td>';
      });

      cells +=
        '<td class="col-actions">' +
          '<button type="button" class="btn btn--ghost btn--sm" data-edit="' + esc(id) + '">' + esc(EntriesUI.t('edit')) + '</button>' +
          '<button type="button" class="btn btn--danger btn--sm" data-delete="' + esc(id) + '">' + esc(EntriesUI.t('delete')) + '</button>' +
        '</td>';

      return '<tr data-row-id="' + esc(id) + '">' + cells + '</tr>';
    }).join('');

    syncSelectAllCheckbox();
  }

  function goToPage(page) {
    var pages = totalPages();
    page = Math.max(1, Math.min(pages, Number(page) || 1));
    state.offset = (page - 1) * PAGE_SIZE;
    loadRows();
  }

  function loadRows() {
    if (!state.entryId) {
      state.rows = [];
      state.total = 0;
      renderRows();
      return Promise.resolve();
    }
    state.loading = true;
    showListError('');
    tableBody.classList.add('is-loading');
    renderPager();

    var searchTerm = String(state.search || '').trim();
    var tab = selectedTab();

    return EntriesAPI.listEntries(scopedListParams({
      entry_id: state.entryId,
      limit: PAGE_SIZE,
      offset: state.offset,
      search: searchTerm,
      order: 'id_desc'
    })).then(function (listed) {
      var rows = listed.rows || [];
      if (needsClientSort()) rows = sortRows(rows, tab);
      state.rows = rows;
      state.total = listed.count;
      state.loading = false;
      tableBody.classList.remove('is-loading');
      renderRows();
    }).catch(function (err) {
      state.rows = [];
      state.loading = false;
      tableBody.classList.remove('is-loading');
      showListError(err && err.message ? err.message : EntriesUI.t('entriesLoadFailed'));
      renderRows();
    });
  }

  function todayValue(type) {
    var now = new Date();
    var y = now.getFullYear();
    var m = String(now.getMonth() + 1).padStart(2, '0');
    var d = String(now.getDate()).padStart(2, '0');
    if (type === 'datetime-local') {
      var hh = String(now.getHours()).padStart(2, '0');
      var mm = String(now.getMinutes()).padStart(2, '0');
      return y + '-' + m + '-' + d + 'T' + hh + ':' + mm;
    }
    return y + '-' + m + '-' + d;
  }

  function inputTypeFor(field) {
    var t = EntriesAPI.fieldInputType(field);
    if (t === 'formula') return 'formula';
    if (t === 'select') return 'select';
    if (t === 'customer' || t === 'related_customer') return 'customer';
    if (t === 'team_member') return 'team_member';
    if (t.indexOf('date') >= 0 && t.indexOf('time') >= 0) return 'datetime-local';
    if (t.indexOf('date') >= 0) return 'date';
    if (t.indexOf('number') >= 0 || t.indexOf('int') >= 0 || t.indexOf('float') >= 0) return 'number';
    if (t.indexOf('email') >= 0) return 'email';
    if (t.indexOf('phone') >= 0 || t.indexOf('tel') >= 0) return 'tel';
    if (t.indexOf('textarea') >= 0 || t.indexOf('long') >= 0) return 'textarea';
    return 'text';
  }

  function toInputDate(value, type) {
    var text = String(value == null ? '' : value).trim();
    if (!text) return '';
    var m = text.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?/);
    if (!m) return text;
    if (type === 'datetime-local') return m[1] + 'T' + (m[2] || '00:00');
    return m[1];
  }

  var CUSTOMER_PAGE_SIZE = (window.EntriesConfig && EntriesConfig.CUSTOMER_PAGE_SIZE) || 15;

  function resetCustomersCache() {
    state.customers = [];
    state.customersTotal = 0;
    state.customersLoadPromise = null;
  }

  function fetchCustomersPage(offset) {
    return EntriesAPI.listCustomers({
      start: offset || 0,
      length: CUSTOMER_PAGE_SIZE
    }).then(function (res) {
      state.customersTotal = res.count;
      return res.rows || [];
    });
  }

  function ensureCustomersLoaded() {
    if (state.customers.length) return Promise.resolve(state.customers);
    if (state.customersLoadPromise) return state.customersLoadPromise;
    state.customersLoading = true;
    state.customersLoadPromise = fetchCustomersPage(0)
      .then(function (rows) {
        state.customers = rows;
        return state.customers;
      })
      .finally(function () {
        state.customersLoading = false;
        state.customersLoadPromise = null;
      });
    return state.customersLoadPromise;
  }

  function loadMoreCustomers() {
    if (state.customersTotal > 0 && state.customers.length >= state.customersTotal) {
      return Promise.resolve(state.customers);
    }
    return fetchCustomersPage(state.customers.length).then(function (rows) {
      if (rows && rows.length) state.customers = state.customers.concat(rows);
      return state.customers;
    });
  }

  function hasMoreCustomers() {
    return !state.customersTotal || state.customers.length < state.customersTotal;
  }

  function getRowCustomerItems() {
    return state.customers.map(function (customer) {
      return {
        id: EntriesAPI.customerListId(customer),
        label: EntriesAPI.customerListLabel(customer)
      };
    }).filter(function (item) {
      return item.id;
    });
  }

  function populateRowCustomerList() {
    var items = getRowCustomerItems();
    if (!items.length) {
      rowCustomerList.innerHTML = '<div class="row-customer-empty">' + esc(EntriesUI.t('noCustomers')) + '</div>';
      rowCustomerLoadMore.classList.add('hidden');
      return;
    }
    rowCustomerList.innerHTML = items.map(function (item) {
      var selected = String(item.id) === String(state.rowCustomerSelectedId);
      return (
        '<button type="button" class="row-customer-option' + (selected ? ' is-selected' : '') + '" data-id="' + esc(item.id) + '" data-label="' + esc(item.label) + '">' +
          esc(item.label) +
        '</button>'
      );
    }).join('');
    rowCustomerLoadMore.classList.toggle('hidden', !hasMoreCustomers());
  }

  function setRowCustomerSelection(id, label) {
    state.rowCustomerSelectedId = String(id || '');
    rowCustomerDisplay.value = label || '';
    populateRowCustomerList();
    closeRowCustomerDropdown();
  }

  function openRowCustomerDropdown() {
    rowCustomerPanel.classList.remove('hidden');
    rowCustomerPickerWrap.classList.add('is-open');
  }

  function closeRowCustomerDropdown() {
    rowCustomerPanel.classList.add('hidden');
    rowCustomerPickerWrap.classList.remove('is-open');
  }

  function openModal(mode, row) {
    var tab = selectedTab();
    if (!tab) {
      EntriesUI.pushToast(EntriesUI.t('selectEntryTabFirst'), { tone: 'warning' });
      return;
    }
    state.modalMode = mode;
    state.editingRow = row || null;
    showFormError('');
    formModalTitle.textContent = mode === 'add' ? EntriesUI.t('addEntryTitle') : EntriesUI.t('editEntryTitle');
    formModalSubtitle.textContent = EntriesAPI.tabName(tab) +
      (state.selectedCustomerLabel ? ' · ' + state.selectedCustomerLabel : '');
    saveBtn.textContent = mode === 'add' ? EntriesUI.t('addEntry') : EntriesUI.t('saveChanges');

    var fields = tabFields(tab);
    var html = '';

    var statuses = EntriesAPI.getTabStatuses(tab);
    if (statuses.length || (row && (row.status || row.status_name))) {
      var currentStatus = row && row.status != null ? String(row.status) : '';
      var selectedStatusValue = EntriesAPI.matchStatusValue(tab, currentStatus);
      var resolved = EntriesAPI.resolveStatus(tab, row || {});
      html += '<label class="field"><span>' + esc(EntriesAPI.statusColumnName(tab)) + '</span>';
      html += '<select data-field-key="status">';
      html += '<option value="">—</option>';
      var seen = {};
      statuses.forEach(function (item) {
        var value = EntriesAPI.statusOptionValue(item);
        if (!value || seen[value]) return;
        seen[value] = true;
        html +=
          '<option value="' + esc(value) + '"' +
          (selectedStatusValue && value === selectedStatusValue ? ' selected' : '') +
          '>' + esc(EntriesAPI.statusLabel(item)) + '</option>';
      });
      if (currentStatus && !seen[currentStatus]) {
        html +=
          '<option value="' + esc(currentStatus) + '" selected>' +
          esc((resolved && resolved.label) || currentStatus) +
          '</option>';
      }
      html += '</select></label>';
    }

    if (!fields.length) {
      html += '<p class="muted">No field definitions on this tab.</p>';
    } else {
      html += fields.map(function (field, index) {
        var n = EntriesAPI.fieldNumber(field, index);
        var key = 'data' + n;
        var label = EntriesAPI.fieldLabel(field, index);
        var required = EntriesAPI.isFieldRequired(field);
        var type = inputTypeFor(field);
        var raw = row && row[key] != null ? String(row[key]) : '';
        var def = field.default_value;
        if (!raw && mode === 'add' && def && def !== '{today}') raw = String(def);
        var reqMark = required ? ' <em>*</em>' : '';

        if (type === 'formula') {
          var shown = EntriesAPI.displayFieldValue(field, row || {}, index) || (field.formula || '');
          return (
            '<label class="field"><span>' + esc(label) + '</span>' +
            '<input type="text" value="' + esc(shown) + '" disabled />' +
            '<small class="muted">Formula ' + esc(field.formula || '') + '</small></label>'
          );
        }

        var relatedName = EntriesAPI.relatedFieldName(row, n);
        var isRelated = mode !== 'add' && (
          type === 'customer' ||
          type === 'team_member' ||
          EntriesAPI.isCustomerRelationField(field, row, index)
        );

        if (isRelated) {
          var displayName = relatedName || EntriesAPI.displayFieldValue(field, row || {}, index) || raw;
          return (
            '<label class="field"><span>' + esc(label) + reqMark + '</span>' +
            '<input type="text" value="' + esc(displayName) + '" class="field-related-name" />' +
            '<input type="hidden" data-field-key="' + key + '" value="' + esc(raw) + '" />' +
            '</label>'
          );
        }

        if (type === 'select' || type === 'customer' || type === 'team_member' || type === 'yes_no') {
          var opts = EntriesAPI.fieldOptions(field);
          if (type === 'yes_no' && !opts.length) {
            opts = [
              { id: '1', label: 'Yes' },
              { id: '0', label: 'No' }
            ];
          }
          if (opts.length) {
            var options = '<option value="">—</option>';
            opts.forEach(function (opt) {
              options +=
                '<option value="' + esc(opt.id) + '"' +
                (String(opt.id) === raw ? ' selected' : '') +
                '>' + esc(opt.label) + '</option>';
            });
            return (
              '<label class="field"><span>' + esc(label) + reqMark + '</span>' +
              '<select data-field-key="' + key + '"' + (required ? ' required' : '') + '>' + options + '</select></label>'
            );
          }
        }

        if (type === 'textarea') {
          return (
            '<label class="field"><span>' + esc(label) + reqMark + '</span>' +
            '<textarea rows="3" data-field-key="' + key + '"' + (required ? ' required' : '') + '>' +
            esc(raw) + '</textarea></label>'
          );
        }

        var value = raw;
        if (type === 'date' || type === 'datetime-local') {
          value = toInputDate(raw, type);
          if (!value && mode === 'add' && def === '{today}') value = todayValue(type);
        }

        var inputType = (type === 'customer' || type === 'team_member' || type === 'yes_no') ? 'text' : type;
        return (
          '<label class="field"><span>' + esc(label) + reqMark + '</span>' +
          '<input type="' + inputType + '" data-field-key="' + key + '" value="' + esc(value) + '"' +
          (required ? ' required' : '') + ' /></label>'
        );
      }).join('');
    }

    dynamicFields.innerHTML = html;
    state.rowCustomerSelectedId = '';
    var lockCustomer = mode === 'add' && selectedCustomerId();
    rowCustomerField.classList.toggle('hidden', mode !== 'add' || lockCustomer);
    if (lockCustomer) {
      state.rowCustomerSelectedId = selectedCustomerId();
    }
    if (mode === 'add' && !lockCustomer) {
      resetCustomersCache();
      rowCustomerDisplay.value = '';
      closeRowCustomerDropdown();
      rowCustomerList.innerHTML = '<div class="row-customer-empty">' + esc(EntriesUI.t('loadingCustomers')) + '</div>';
      rowCustomerLoadMore.classList.add('hidden');
      ensureCustomersLoaded().then(function () {
        populateRowCustomerList();
      });
    } else {
      closeRowCustomerDropdown();
    }
    entryCustIdInput.value = row && row.entry_cust_id != null ? String(row.entry_cust_id) : '';
    entryCustWrap.classList.toggle('hidden', !needsEntryCustomer(tab));
    formModal.classList.remove('hidden');
  }

  function closeModal() {
    formModal.classList.add('hidden');
    state.editingRow = null;
    closeRowCustomerDropdown();
  }

  function openDelete(row) {
    state.deleteRow = row;
    deleteModal.classList.remove('hidden');
  }

  function closeDelete() {
    deleteModal.classList.add('hidden');
    state.deleteRow = null;
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = EntriesUI.t('delete');
  }

  function openDeleteSettings() {
    var tab = selectedTab();
    if (!tab || !state.entryId) {
      EntriesUI.pushToast(EntriesUI.t('selectEntryTabFirst'), { tone: 'warning' });
      return;
    }
    var name = EntriesAPI.tabName(tab);
    deleteSettingsText.textContent = EntriesUI.t('deleteEntrySettingsConfirm').replace('{name}', name);
    confirmDeleteSettingsBtn.disabled = false;
    confirmDeleteSettingsBtn.textContent = EntriesUI.t('delete');
    deleteSettingsModal.classList.remove('hidden');
    document.body.classList.add('modal-open');
  }

  function closeDeleteSettings() {
    deleteSettingsModal.classList.add('hidden');
    if (!deleteModal.classList.contains('hidden') || !settingsModal.classList.contains('hidden') ||
        !formModal.classList.contains('hidden') || !fieldModal.classList.contains('hidden')) {
      return;
    }
    document.body.classList.remove('modal-open');
  }

  function showAutomationError(msg) {
    if (!automationError) return;
    if (!msg) {
      automationError.classList.add('hidden');
      automationError.textContent = '';
      return;
    }
    automationError.textContent = msg;
    automationError.classList.remove('hidden');
  }

  function resetAutomationForm() {
    if (automationSelect) automationSelect.value = '';
    showAutomationError('');
  }

  function fillAutomationOptions(rows) {
    if (!automationSelect) return;
    var html = '<option value="">' + esc(EntriesUI.t('selectAutomation')) + '</option>';
    (rows || []).forEach(function (item) {
      var id = EntriesAPI.automationId(item);
      if (!id) return;
      html += '<option value="' + esc(id) + '">' + esc(EntriesAPI.automationLabel(item)) + '</option>';
    });
    automationSelect.innerHTML = html;
    if (!(rows || []).length) {
      automationSelect.innerHTML =
        '<option value="">' + esc(EntriesUI.t('noAutomations')) + '</option>';
    }
  }

  function openAutomationModal(target, preselectId) {
    state.automationTarget = target === 'customer' ? 'customer' : 'entries';
    if (state.automationTarget === 'customer') {
      if (!selectedCustomerId()) {
        EntriesUI.pushToast(EntriesUI.t('customerRequired'), { tone: 'warning' });
        return;
      }
    } else if (!selectedCount()) {
      EntriesUI.pushToast(EntriesUI.t('selectRowsFirst'), { tone: 'warning' });
      return;
    }
    resetAutomationForm();
    fillAutomationOptions([]);
    automationSelect.disabled = true;
    automationModal.classList.remove('hidden');
    EntriesAPI.listAutomations().then(function (res) {
      fillAutomationOptions(res.rows);
      automationSelect.disabled = false;
      if (preselectId && automationSelect) {
        automationSelect.value = String(preselectId);
      }
    }).catch(function (err) {
      automationSelect.disabled = false;
      showAutomationError(err && err.message ? err.message : EntriesUI.t('automationFailed'));
    });
  }

  function closeAutomationModal() {
    automationModal.classList.add('hidden');
    state.automationTarget = 'entries';
    resetAutomationForm();
    if (automationSubmitBtn) {
      automationSubmitBtn.disabled = false;
      automationSubmitBtn.textContent = EntriesUI.t('submit');
    }
  }

  function afterDeleteSettings() {
    var groupId = state.selectedGroupId;
    state.entryId = '';
    state.rows = [];
    state.total = 0;
    state.offset = 0;
    state.search = '';
    searchInput.value = '';
    closeDeleteSettings();
    return refreshBasic().then(function () {
      if (groupId) {
        state.navLevel = 'entries';
        state.selectedGroupId = groupId;
      } else {
        state.navLevel = 'groups';
        state.selectedGroupId = '';
      }
      updateView();
    });
  }

  function findRowById(id) {
    for (var i = 0; i < state.rows.length; i += 1) {
      if (EntriesAPI.rowId(state.rows[i]) === String(id)) return state.rows[i];
    }
    return null;
  }

  function showSettingsError(msg) {
    if (!msg) {
      settingsError.classList.add('hidden');
      settingsError.textContent = '';
      return;
    }
    settingsError.textContent = msg;
    settingsError.classList.remove('hidden');
  }

  function createComboPicker(config) {
    var picker = {
      tagsEl: config.tagsEl,
      inputEl: config.inputEl,
      listEl: config.listEl,
      panelEl: config.panelEl,
      loadMoreBtn: config.loadMoreBtn,
      wrapEl: config.wrapEl,
      selected: {},
      items: [],
      visibleLimit: 15,
      pageSize: 15,
      hasMoreOnServer: false,
      add: function (id, label) {
        if (!id || this.selected[id]) return;
        this.selected[id] = label || id;
        this.renderTags();
        this.renderMenu();
        if (this.inputEl) this.inputEl.value = '';
      },
      remove: function (id) {
        if (!this.selected[id]) return;
        delete this.selected[id];
        this.renderTags();
        this.renderMenu();
      },
      clear: function () {
        this.selected = {};
        this.visibleLimit = this.pageSize;
        this.renderTags();
        this.renderMenu();
      },
      values: function () {
        return Object.keys(this.selected);
      },
      setItems: function (items) {
        this.items = items || [];
        this.renderMenu();
      },
      setLoading: function (loading, message) {
        if (!this.listEl) return;
        if (this.inputEl) this.inputEl.disabled = !!loading;
        if (loading) {
          this.listEl.innerHTML = '<div class="row-customer-empty">' + esc(message || EntriesUI.t('loadingTeamMembers')) + '</div>';
          if (this.loadMoreBtn) this.loadMoreBtn.classList.add('hidden');
          this.openMenu();
        }
      },
      renderTags: function () {
        var self = this;
        var ids = Object.keys(this.selected);
        if (!ids.length) {
          this.tagsEl.innerHTML = '';
          return;
        }
        this.tagsEl.innerHTML = ids.map(function (id) {
          return (
            '<span class="tag-chip">' +
              '<span class="tag-chip__label">' + esc(self.selected[id]) + '</span>' +
              '<button type="button" class="tag-chip__remove" data-tag-id="' + esc(id) + '" aria-label="' + esc(EntriesUI.t('remove')) + '">×</button>' +
            '</span>'
          );
        }).join('');
      },
      renderMenu: function () {
        if (!this.listEl) return;
        var selected = this.selected;
        var matches = [];
        for (var i = 0; i < this.items.length; i += 1) {
          var item = this.items[i];
          if (!item || !item.id || selected[item.id]) continue;
          matches.push(item);
        }
        var list = matches.slice(0, this.visibleLimit);
        if (!this.items.length) {
          this.listEl.innerHTML = '<div class="row-customer-empty">' + esc(EntriesUI.t('noTeamMembers')) + '</div>';
          if (this.loadMoreBtn) this.loadMoreBtn.classList.add('hidden');
          return;
        }
        if (!list.length) {
          this.listEl.innerHTML = '<div class="row-customer-empty">' + esc(EntriesUI.t('noTeamMemberMatches')) + '</div>';
          if (this.loadMoreBtn) this.loadMoreBtn.classList.add('hidden');
          return;
        }
        this.listEl.innerHTML = list.map(function (item) {
          return (
            '<button type="button" class="row-customer-option" role="option" data-combo-id="' + esc(item.id) + '">' +
              esc(item.label) +
            '</button>'
          );
        }).join('');
        if (this.loadMoreBtn) {
          var showLoadMore = list.length < matches.length || !!this.hasMoreOnServer;
          this.loadMoreBtn.classList.toggle('hidden', !showLoadMore);
        }
      },
      loadMore: function () {
        this.visibleLimit += this.pageSize;
        this.renderMenu();
        this.openMenu();
      },
      openMenu: function () {
        if (!this.panelEl) return;
        this.panelEl.classList.remove('hidden');
        if (this.wrapEl) this.wrapEl.classList.add('is-open');
      },
      closeMenu: function () {
        if (!this.panelEl) return;
        this.panelEl.classList.add('hidden');
        if (this.wrapEl) this.wrapEl.classList.remove('is-open');
      },
      isOpen: function () {
        return this.panelEl && !this.panelEl.classList.contains('hidden');
      }
    };
    return picker;
  }

  function createTagPicker(tagsEl, selectEl) {
    return {
      tagsEl: tagsEl,
      selectEl: selectEl,
      selected: {},
      add: function (id, label) {
        if (!id || this.selected[id]) return;
        this.selected[id] = label || id;
        this.render();
        if (this.selectEl) this.selectEl.value = '';
      },
      remove: function (id) {
        if (!this.selected[id]) return;
        delete this.selected[id];
        this.render();
      },
      clear: function () {
        this.selected = {};
        this.render();
      },
      values: function () {
        return Object.keys(this.selected);
      },
      render: function () {
        var self = this;
        var ids = Object.keys(this.selected);
        if (!ids.length) {
          this.tagsEl.innerHTML = '';
          return;
        }
        this.tagsEl.innerHTML = ids.map(function (id) {
          return (
            '<span class="tag-chip">' +
              '<span class="tag-chip__label">' + esc(self.selected[id]) + '</span>' +
              '<button type="button" class="tag-chip__remove" data-tag-id="' + esc(id) + '" aria-label="' + esc(EntriesUI.t('remove')) + '">×</button>' +
            '</span>'
          );
        }).join('');
      }
    };
  }

  function populateFolderSelect() {
    var folders = EntriesAPI.getFolders(state.basic);
    var selected = state.folderPicker ? state.folderPicker.selected : {};
    folderSelect.innerHTML =
      '<option value="">' + esc(EntriesUI.t('selectFolders')) + '</option>' +
      folders.map(function (folder) {
        var id = String(folder.id || folder.folder_id || '');
        if (selected[id]) return '';
        return '<option value="' + esc(id) + '">' + esc(EntriesAPI.folderName(folder)) + '</option>';
      }).join('');
  }

  function syncTeamMemberPickerItems() {
    initSettingsPickers();
    var members = EntriesAPI.getTeamMembers(state.basic);
    var items = members.map(function (member) {
      return {
        id: EntriesAPI.teamMemberId(member),
        label: EntriesAPI.teamMemberName(member)
      };
    }).filter(function (item) {
      return item.id;
    });
    state.customerPicker.hasMoreOnServer = false;
    state.customerPicker.setItems(items);
    if (customerSearch) {
      customerSearch.disabled = !items.length;
      customerSearch.placeholder = items.length
        ? EntriesUI.t('selectMembers')
        : EntriesUI.t('noTeamMembers');
    }
    if (customerLoadMore) customerLoadMore.classList.add('hidden');
  }

  function loadTeamMembersForSettings() {
    initSettingsPickers();
    state.customerPicker.setLoading(true, EntriesUI.t('loadingTeamMembers'));

    var ensureBasic = state.basic
      ? Promise.resolve(state.basic)
      : EntriesAPI.fetchUserBasic().then(function (basic) {
          state.basic = basic;
          return basic;
        });

    return ensureBasic
      .then(function () {
        syncTeamMemberPickerItems();
        state.customerPicker.closeMenu();
        return EntriesAPI.getTeamMembers(state.basic);
      })
      .catch(function (err) {
        if (customerSearch) {
          customerSearch.disabled = true;
          customerSearch.placeholder = EntriesUI.t('teamMembersFailed');
        }
        if (customerMenu) {
          customerMenu.innerHTML =
            '<div class="row-customer-empty">' + esc(EntriesUI.t('teamMembersFailed')) + '</div>';
          if (customerLoadMore) customerLoadMore.classList.add('hidden');
          state.customerPicker.openMenu();
        }
        throw err;
      })
      .finally(function () {
        var members = EntriesAPI.getTeamMembers(state.basic);
        if (customerSearch && members.length) customerSearch.disabled = false;
      });
  }

  function initSettingsPickers() {
    if (!state.folderPicker) {
      state.folderPicker = createTagPicker(folderTags, folderSelect);
      state.customerPicker = createComboPicker({
        tagsEl: customerTags,
        inputEl: customerSearch,
        listEl: customerMenu,
        panelEl: customerPanel,
        loadMoreBtn: customerLoadMore,
        wrapEl: customerPickerWrap
      });
    }
  }

  var CUSTOM_FIELD_TYPES = [
    { value: 'text', label: 'text' },
    { value: 'email', label: 'Email' },
    { value: 'number', label: 'number' },
    { value: 'date', label: 'Date' },
    { value: 'hour', label: 'Hour' },
    { value: 'date_time', label: 'Date Time' },
    { value: 'select', label: 'select(options)' },
    { value: 'yes_no', label: 'yes/no' },
    { value: 'button', label: 'Button' },
    { value: 'formula', label: 'Formula' },
    { value: 'team_member', label: 'Team member' },
    { value: 'title', label: 'Title' },
    { value: 'customer', label: 'Related Customer' },
    { value: 'Files', label: 'files' },
    { value: 'year', label: 'Year' }
  ];

  function normalizeInputType(type) {
    var map = {
      datetime: 'date_time',
      'date time': 'date_time',
      'yes/no': 'yes_no',
      related_customer: 'customer',
      files: 'Files'
    };
    if (!type) return 'text';
    if (map[type]) return map[type];
    var lower = String(type).toLowerCase();
    if (map[lower]) return map[lower];
    return String(type);
  }

  function customFieldTypeOptions(selected) {
    var html = '<option value="">' + esc(EntriesUI.t('selectCustomField')) + '</option>';
    CUSTOM_FIELD_TYPES.forEach(function (item) {
      html +=
        '<option value="' + esc(item.value) + '"' +
        (selected === item.value ? ' selected' : '') +
        '>' + esc(item.label) + '</option>';
    });
    return html;
  }

  function slugifyFieldName(text, fallback) {
    var slug = String(text || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return slug || fallback;
  }

  function customFieldRowTemplate(index, row) {
    row = row || {};
    var hasType = !!(row.input_type || row.type);
    return (
      '<div class="settings-custom-field-row" data-field-index="' + index + '">' +
        '<label class="settings-field settings-field--full">' +
          '<span data-i18n="customFields">Custom fields</span>' +
          '<select class="settings-select settings-select--dropdown" data-field-type>' +
            customFieldTypeOptions(row.input_type || row.type || '') +
          '</select>' +
        '</label>' +
        '<div class="settings-custom-field-details' + (hasType ? '' : ' hidden') + '" data-field-details>' +
          '<div class="settings-grid settings-grid--2">' +
            '<label class="settings-field">' +
              '<span data-i18n="fieldLabelEn">English label</span>' +
              '<input type="text" data-field-label-en value="' + esc(row.label_en || '') + '" data-i18n-placeholder="fieldLabelEnPlaceholder" placeholder="English label" />' +
            '</label>' +
            '<label class="settings-field">' +
              '<span data-i18n="fieldLabelHe">Hebrew name</span>' +
              '<input type="text" data-field-label-he value="' + esc(row.label_he || '') + '" data-i18n-placeholder="fieldLabelHePlaceholder" placeholder="Hebrew Name" />' +
            '</label>' +
          '</div>' +
          '<label class="settings-field settings-field--full">' +
            '<span data-i18n="defaultValue">Default value</span>' +
            '<input type="text" data-field-default value="' + esc(row.default_value || '') + '" data-i18n-placeholder="defaultValuePlaceholder" placeholder="Default value" />' +
          '</label>' +
        '</div>' +
        '<button type="button" class="icon-btn custom-field-remove" data-remove-field aria-label="' + esc(EntriesUI.t('remove')) + '">×</button>' +
      '</div>'
    );
  }

  function renderCustomFieldRows(rows) {
    rows = rows && rows.length ? rows : [{}];
    customFieldRows.innerHTML = rows.map(function (row, index) {
      return customFieldRowTemplate(index, row);
    }).join('');
    EntriesUI.applyStaticI18n();
  }

  function toggleCustomFieldDetails(rowEl, show) {
    var details = rowEl && rowEl.querySelector('[data-field-details]');
    if (!details) return;
    details.classList.toggle('hidden', !show);
  }

  function readCustomFieldRow(rowEl) {
    var typeEl = rowEl.querySelector('[data-field-type]');
    var labelEnEl = rowEl.querySelector('[data-field-label-en]');
    var labelHeEl = rowEl.querySelector('[data-field-label-he]');
    var defaultEl = rowEl.querySelector('[data-field-default]');
    return {
      type: typeEl ? typeEl.value.trim() : '',
      label_en: labelEnEl ? labelEnEl.value.trim() : '',
      label_he: labelHeEl ? labelHeEl.value.trim() : '',
      default_value: defaultEl ? defaultEl.value.trim() : ''
    };
  }

  function collectCustomFieldRowStates() {
    var rows = [];
    customFieldRows.querySelectorAll('.settings-custom-field-row').forEach(function (rowEl) {
      rows.push(readCustomFieldRow(rowEl));
    });
    return rows;
  }

  function collectCustomFields() {
    var rows = [];
    collectCustomFieldRowStates().forEach(function (row, index) {
      if (!row.type) return;
      var name = slugifyFieldName(row.label_en, 'field_' + (index + 1));
      var item = {
        name: name,
        input_type: normalizeInputType(row.type),
        label_en: row.label_en || name,
        label_he: row.label_he || row.label_en || name
      };
      rows.push(item);
    });
    return rows;
  }

  function buildSettingsFieldRecord(item, index) {
    var field = {
      input_type: normalizeInputType(item.input_type || item.type),
      label_en: item.label_en || item.name || '',
      label_he: item.label_he || item.label_en || item.name || ''
    };
    if (item.name) field.name = item.name;
    if (index != null && item.field_no == null && !item.name) {
      field.field_no = index + 1;
    } else if (item.field_no != null) {
      field.field_no = item.field_no;
    }
    return field;
  }

  function buildCustomFieldsPayload(items) {
    var fields = items.map(function (item, index) {
      return buildSettingsFieldRecord(item, index);
    });
    var customFields = {};
    fields.forEach(function (field, index) {
      var key = field.name || slugifyFieldName(field.label_en, 'field_' + (index + 1));
      customFields[key] = {
        input_type: field.input_type,
        label_en: field.label_en,
        label_he: field.label_he
      };
    });
    return {
      fields: fields,
      fields_json: fields.slice(),
      // custom_fields: customFields
    };
  }

  function buildEntrySettingsPayload(options) {
    options = options || {};
    var payload = {
      tab_name_en: options.tabNameEn,
      tab_name_he: options.tabNameHe,
      tab_name: options.tabName || options.tabNameEn,
      show_in_dashboard: options.showInDashboard ? 1 : 0,
      show_in_customer: options.showInCustomer ? 1 : 0,
      copy_customer_tab: options.copyCustomerTab ? 1 : 0,
      use_customer_for_entry: options.useCustomer ? 1 : 0
    };
    if (options.folderIds && options.folderIds.length) {
      payload.folders = options.folderIds.map(String);
    }
    payload.settings = {
      shared_customers: (options.customerIds || []).map(String)
    };
    if (options.customFields && options.customFields.length) {
      var fieldPayload = buildCustomFieldsPayload(options.customFields);
      payload.fields = fieldPayload.fields;
      payload.fields_json = fieldPayload.fields_json;
      // payload.custom_fields = fieldPayload.custom_fields;
    }
    if (options.useCustomer && options.entryFolderId) {
      payload.entry_customer_folder_id = options.entryFolderId;
    }
    return payload;
  }

  function normalizeTabField(field, index) {
    if (!field) return null;
    var name = field.name || field.field_name;
    if (!name) {
      name = slugifyFieldName(field.label_en || field.label || field.title, 'field_' + ((index || 0) + 1));
    }
    var item = {
      name: String(name),
      input_type: normalizeInputType(EntriesAPI.fieldInputType(field)),
      field_no: EntriesAPI.fieldNumber(field, index || 0),
      label_en: String(field.label_en || field.label || field.title || name),
      label_he: String(field.label_he || field.label_en || field.label || field.title || name)
    };
    if (field.default_value != null && String(field.default_value) !== '') {
      item.default_value = String(field.default_value);
    }
    return item;
  }

  function getExistingTabFields(tab) {
    return tabFields(tab).map(function (field, index) {
      return normalizeTabField(field, index);
    }).filter(Boolean);
  }

  function initFieldTypeSelect() {
    if (!fieldTypeSelect) return;
    fieldTypeSelect.innerHTML = customFieldTypeOptions('');
  }

  function showFieldModalError(msg) {
    if (!fieldModalError) return;
    if (!msg) {
      fieldModalError.textContent = '';
      fieldModalError.classList.add('hidden');
      return;
    }
    fieldModalError.textContent = msg;
    fieldModalError.classList.remove('hidden');
  }

  function openFieldModal() {
    var tab = selectedTab();
    if (!tab || !state.entryId) {
      EntriesUI.pushToast(EntriesUI.t('selectEntryTabFirst'), { tone: 'warning' });
      return;
    }
    showFieldModalError('');
    fieldModalTitle.textContent = EntriesAPI.tabName(tab);
    fieldTypeSelect.value = '';
    fieldLabelEn.value = '';
    fieldLabelHe.value = '';
    fieldDefaultValue.value = '';
    fieldDetailsWrap.classList.add('hidden');
    fieldModal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    EntriesUI.applyStaticI18n();
  }

  function closeFieldModal() {
    fieldModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  }

  function readFieldModalForm() {
    return {
      type: fieldTypeSelect.value.trim(),
      label_en: fieldLabelEn.value.trim(),
      label_he: fieldLabelHe.value.trim(),
      default_value: fieldDefaultValue.value.trim()
    };
  }

  function openSettingsModal() {
    showSettingsError('');
    initSettingsPickers();
    state.folderPicker.clear();
    state.customerPicker.clear();
    populateFolderSelect();
    preselectCustomerFolder();
    if (customerSearch) customerSearch.value = '';
    state.customerPicker.closeMenu();
    setTabNameEn.value = '';
    setTabNameHe.value = '';
    setShowInHeader.checked = true;
    setCopyCustomer.checked = false;
    setUseCustomer.checked = false;
    setEntryFolderId.value = '';
    setEntryFolderWrap.classList.add('hidden');
    renderCustomFieldRows([{}]);
    settingsModal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    loadTeamMembersForSettings().catch(function (err) {
      showSettingsError(err && err.message ? err.message : EntriesUI.t('teamMembersFailed'));
    });
  }

  function closeSettingsModal() {
    settingsModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    if (state.customerPicker) state.customerPicker.closeMenu();
  }

  function selectedValues(select) {
    if (!select) return [];
    if (select.multiple) {
      return Array.prototype.slice.call(select.selectedOptions || []).map(function (opt) {
        return opt.value;
      }).filter(Boolean);
    }
    return select.value ? [select.value] : [];
  }

  function pickerValues(picker) {
    return picker ? picker.values() : [];
  }

  function preselectCustomerFolder() {
    var folderId = String(state.selectedCustomerFolderId || '').trim();
    if (!folderId || !state.folderPicker) return;
    var folders = EntriesAPI.getFolders(state.basic);
    var label = folderId;
    for (var i = 0; i < folders.length; i += 1) {
      if (String(folders[i].id || folders[i].folder_id) === folderId) {
        label = EntriesAPI.folderName(folders[i]);
        break;
      }
    }
    state.folderPicker.add(folderId, label);
    populateFolderSelect();
  }

  function handleRealtimeEvent(event) {
    var key = String(event && event.key || '');
    var payload = EntriesAPI.getRealtimePayload(event);

    if (EntriesAPI.isEntriesSettingsRealtimeKey(key)) {
      refreshBasic().catch(function () { /* ignore refresh errors */ });
      EntriesUI.pushToast('Entry settings updated', { message: 'Tabs refreshed live.', tone: 'info' });
      return;
    }

    if (EntriesAPI.isCustomerRealtimeKey(key)) {
      handleCustomerRealtimeEvent(key, payload);
      return;
    }

    if (EntriesAPI.isEntriesRealtimeKey(key)) {
      handleEntriesRealtimeEvent(key, payload);
      return;
    }
  }

  function wireRealtime() {
    if (state.disconnectRealtime) state.disconnectRealtime();
    setLive(false);

    state.disconnectRealtime = EntriesAPI.connectRealtime({
      onConnect: function () {
        setLive(true);
      },
      onReady: function (payload) {
        setLive(true);
        if (payload && Array.isArray(payload.events)) {
          state.socketEvents = payload.events;
        }
      },
      onDisconnect: function () {
        setLive(false);
      },
      onError: function () {
        setLive(false);
      },
      onEvent: handleRealtimeEvent
    });
  }

  function refreshBasic() {
    return EntriesAPI.fetchUserBasic().then(function (basic) {
      state.basic = basic;
      applyBasicTabs();
      updateView();
      if (state.navLevel === 'customers') {
        loadFolderCounts();
      }
      if (selectedCustomerId() && state.navLevel !== 'customers') {
        return loadCustomerEntrySettings().then(function () {
          if (state.navLevel === 'data' && state.entryId) return loadRows();
        });
      }
      if (state.navLevel === 'data' && state.entryId) return loadRows();
      return Promise.resolve();
    });
  }

  window.addEventListener('popstate', function (e) {
    var snap = e.state;
    if (snap && snap.app === 'entries') {
      applyNavSnapshot(snap);
      return;
    }
    if (state.navLevel !== 'customers') restoreCustomers({});
  });

  navBackBtn.addEventListener('click', navBack);

  if (folderStrip) {
    folderStrip.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-folder-id]');
      if (!chip) return;
      selectBrowseFolder(chip.getAttribute('data-folder-id'));
    });
  }

  if (customerTableBody) {
    customerTableBody.addEventListener('click', function (e) {
      var row = e.target.closest('[data-customer-id]');
      if (!row) return;
      openCustomer(
        row.getAttribute('data-customer-id'),
        row.getAttribute('data-customer-label'),
        row.getAttribute('data-folder-id')
      );
    });
  }

  if (customerBrowse) {
    customerBrowse.addEventListener('click', function (e) {
      var card = e.target.closest('[data-customer-id]');
      if (!card) return;
      openCustomer(
        card.getAttribute('data-customer-id'),
        card.getAttribute('data-customer-label'),
        card.getAttribute('data-folder-id')
      );
    });
  }

  if (customerBrowseForm) {
    customerBrowseForm.addEventListener('submit', function (e) {
      e.preventDefault();
      state.browseSearch = customerBrowseInput ? customerBrowseInput.value.trim() : '';
      state.browseOffset = 0;
      loadCustomersBrowse();
      syncNav('replace');
    });
  }

  if (clearCustomerBrowseBtn) {
    clearCustomerBrowseBtn.addEventListener('click', function () {
      if (customerBrowseInput) customerBrowseInput.value = '';
      state.browseSearch = '';
      state.browseOffset = 0;
      loadCustomersBrowse();
      syncNav('replace');
    });
  }

  groupPicker.addEventListener('click', function (e) {
    var groupBtn = e.target.closest('[data-group-id]');
    if (groupBtn) {
      openGroup(groupBtn.getAttribute('data-group-id'));
      return;
    }
    var entryBtn = e.target.closest('[data-entry-id]');
    if (entryBtn) {
      state.selectedGroupId = '';
      selectEntry(entryBtn.getAttribute('data-entry-id'));
    }
  });

  if (customerDetail) {
    customerDetail.addEventListener('click', function (e) {
      var sidebarEditBtn = e.target.closest('[data-sidebar-edit]');
      if (sidebarEditBtn) {
        state.sidebarEditKey = String(sidebarEditBtn.getAttribute('data-sidebar-edit') || '').trim();
        renderCustomerDetail();
        return;
      }
      if (e.target.closest('[data-sidebar-cancel]')) {
        state.sidebarEditKey = '';
        renderCustomerDetail();
        return;
      }
      var sidebarSaveBtn = e.target.closest('[data-sidebar-save]');
      if (sidebarSaveBtn) {
        if (state.customerSidebarSaving) return;
        saveSidebarField(String(sidebarSaveBtn.getAttribute('data-sidebar-save') || '').trim());
        return;
      }
      var sidebarRemoveBtn = e.target.closest('[data-sidebar-remove]');
      if (sidebarRemoveBtn) {
        e.preventDefault();
        if (state.customerSidebarSaving) return;
        removeSidebarChip(
          String(sidebarRemoveBtn.getAttribute('data-sidebar-remove') || '').trim(),
          String(sidebarRemoveBtn.getAttribute('data-sidebar-id') || '').trim()
        );
        return;
      }
      var groupBtn = e.target.closest('[data-group-id]');
      if (groupBtn) {
        openGroup(groupBtn.getAttribute('data-group-id'));
        return;
      }
      var entryBtn = e.target.closest('[data-entry-id]');
      if (entryBtn) {
        state.selectedGroupId = '';
        selectEntry(entryBtn.getAttribute('data-entry-id'));
        return;
      }
      if (e.target.closest('[data-customer-edit]')) {
        openCustomerEdit();
        return;
      }
      if (e.target.closest('[data-customer-delete]')) {
        openDeleteCustomer();
        return;
      }
      if (e.target.closest('[data-customer-field-automation]')) {
        var autoBtn = e.target.closest('[data-customer-field-automation]');
        openAutomationModal('customer', autoBtn.getAttribute('data-customer-field-automation'));
        return;
      }
      if (e.target.closest('[data-customer-automation]')) {
        openAutomationModal('customer');
      }
    });
    customerDetail.addEventListener('change', function (e) {
      var statusSelect = e.target.closest('[data-customer-status-select]');
      if (!statusSelect) return;
      updateCustomerStatus(String(statusSelect.value || '').trim());
    });
  }

  if (customerEditModal) {
    customerEditModal.addEventListener('click', function (e) {
      if (e.target === customerEditModal || e.target.closest('[data-close-customer-edit]')) {
        closeCustomerEdit();
      }
    });
  }

  if (customerEditForm) {
    customerEditForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var id = selectedCustomerId();
      if (!id) return;
      showCustomerEditError('');
      if (customerEditSaveBtn) {
        customerEditSaveBtn.disabled = true;
        customerEditSaveBtn.textContent = EntriesUI.t('loading');
      }
      try {
        var payload = {
          customer_id: id,
          name: customerEditName ? customerEditName.value.trim() : '',
          company: customerEditCompany ? customerEditCompany.value.trim() : '',
          phone: customerEditPhone ? customerEditPhone.value.trim() : '',
          email: customerEditEmail ? customerEditEmail.value.trim() : '',
          note: customerEditNotes ? customerEditNotes.value.trim() : ''
        };

        var customFields = {};
        if (customerEditDynamic) {
          var controls = customerEditDynamic.querySelectorAll('[data-edit-key], [data-edit-group]');
          Array.prototype.forEach.call(controls, function (control) {
            var key = control.getAttribute('data-edit-key');
            if (key) {
              if (customerEditTopLevelKeys()[key]) return;
              var value = String(control.value == null ? '' : control.value).trim();
              var def = extraFieldDef(key);
              if (!def) return;
              if (String(def.type || '').toLowerCase() === 'group') return;
              var fieldName = extraFieldPayloadKey(def.name || key);
              if (isGroupFieldKey(fieldName)) return;
              customFields[fieldName] = value;
              return;
            }
            var childKey = control.getAttribute('data-edit-child');
            if (!childKey) return;
            var groupValue = String(control.value == null ? '' : control.value).trim();
            if (!groupValue) return;
            var childDef = extraFieldDef(childKey);
            if (!childDef) return;
            if (String(childDef.type || '').toLowerCase() === 'group') return;
            var childName = extraFieldPayloadKey(childDef.name || childKey);
            if (isGroupFieldKey(childName)) return;
            customFields[childName] = groupValue;
          });
        }

        if (Object.keys(customFields).length) {
          payload.extra_fields = customFields;
        }

        var res = await EntriesAPI.editCustomer(payload);
        if (Number(res.success) === 0 || Number(res.exists) === 1) {
          throw new Error(res.message || EntriesUI.t('customerUpdateFailed'));
        }
        EntriesUI.pushToast(EntriesUI.t('customerUpdated'), {
          message: res.message || '',
          tone: 'success'
        });
        closeCustomerEdit();
        await loadCustomerDetail();
      } catch (err) {
        showCustomerEditError(err && err.message ? err.message : EntriesUI.t('customerUpdateFailed'));
      } finally {
        if (customerEditSaveBtn) {
          customerEditSaveBtn.disabled = false;
          customerEditSaveBtn.textContent = EntriesUI.t('save');
        }
      }
    });
  }

  if (deleteCustomerModal) {
    deleteCustomerModal.addEventListener('click', function (e) {
      if (e.target === deleteCustomerModal || e.target.closest('[data-close-delete-customer]')) {
        closeDeleteCustomer();
      }
    });
  }

  if (confirmDeleteCustomerBtn) {
    confirmDeleteCustomerBtn.addEventListener('click', async function () {
      var id = selectedCustomerId();
      if (!id) return;
      confirmDeleteCustomerBtn.disabled = true;
      confirmDeleteCustomerBtn.textContent = EntriesUI.t('deleting') || EntriesUI.t('loading');
      try {
        var res = await EntriesAPI.deleteCustomer(id);
        if (Number(res.success) === 0) {
          throw new Error(res.message || EntriesUI.t('customerDeleteFailed'));
        }
        closeDeleteCustomer();
        EntriesUI.pushToast(EntriesUI.t('customerDeleted'), {
          message: res.message || '',
          tone: 'success'
        });
        openCustomers();
      } catch (err) {
        closeDeleteCustomer();
        EntriesUI.pushToast(EntriesUI.t('customerDeleteFailed'), {
          message: err && err.message ? err.message : '',
          tone: 'error'
        });
      } finally {
        confirmDeleteCustomerBtn.disabled = false;
        confirmDeleteCustomerBtn.textContent = EntriesUI.t('delete');
      }
    });
  }

  entryPicker.addEventListener('click', function (e) {
    var chip = e.target.closest('[data-entry-id]');
    if (!chip) return;
    selectEntry(chip.getAttribute('data-entry-id'));
  });

  searchForm.addEventListener('submit', function (e) {
    e.preventDefault();
    state.search = searchInput.value.trim();
    state.offset = 0;
    loadRows();
  });

  clearSearchBtn.addEventListener('click', function () {
    searchInput.value = '';
    state.search = '';
    state.offset = 0;
    loadRows();
  });

  if (fieldPickerBtn) {
    fieldPickerBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleFieldPicker();
    });
  }

  if (fieldPickerSearch) {
    fieldPickerSearch.addEventListener('input', function () {
      state.fieldPickerQuery = fieldPickerSearch.value;
      renderFieldPicker();
    });
    fieldPickerSearch.addEventListener('click', function (e) {
      e.stopPropagation();
    });
    fieldPickerSearch.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeFieldPicker();
    });
  }

  if (fieldPickerList) {
    fieldPickerList.addEventListener('click', function (e) {
      e.stopPropagation();
    });
    fieldPickerList.addEventListener('change', function (e) {
      var toggle = e.target.closest('[data-col-toggle]');
      if (!toggle) return;
      setColumnVisible(toggle.getAttribute('data-col-toggle'), toggle.checked);
    });
    fieldPickerList.addEventListener('mousedown', function (e) {
      var item = e.target.closest('[data-col-key]');
      if (!item) return;
      item.draggable = !e.target.closest('input, button, label, .field-picker__switch');
    });
    fieldPickerList.addEventListener('dragstart', function (e) {
      var item = e.target.closest('[data-col-key]');
      if (!item) return;
      item.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.getAttribute('data-col-key'));
    });
    fieldPickerList.addEventListener('dragend', function (e) {
      var item = e.target.closest('[data-col-key]');
      if (item) item.classList.remove('is-dragging');
      var over = fieldPickerList.querySelectorAll('.is-drag-over');
      for (var i = 0; i < over.length; i += 1) over[i].classList.remove('is-drag-over');
    });
    fieldPickerList.addEventListener('dragover', function (e) {
      var item = e.target.closest('[data-col-key]');
      if (!item) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      var over = fieldPickerList.querySelectorAll('.is-drag-over');
      for (var i = 0; i < over.length; i += 1) over[i].classList.remove('is-drag-over');
      item.classList.add('is-drag-over');
    });
    fieldPickerList.addEventListener('drop', function (e) {
      e.preventDefault();
      var item = e.target.closest('[data-col-key]');
      if (!item) return;
      item.classList.remove('is-drag-over');
      moveColumn(e.dataTransfer.getData('text/plain'), item.getAttribute('data-col-key'));
    });
  }

  if (tableHead) {
    tableHead.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-sort-key]');
      if (!btn) return;
      toggleSort(btn.getAttribute('data-sort-key'));
    });
    tableHead.addEventListener('change', function (e) {
      if (e.target.id !== 'selectAllRows') return;
      var ids = pageRowIds();
      var checked = e.target.checked;
      ids.forEach(function (id) { setRowSelected(id, checked); });
      var boxes = tableBody.querySelectorAll('[data-select-row]');
      for (var i = 0; i < boxes.length; i += 1) boxes[i].checked = checked;
      renderBulkBar();
      syncSelectAllCheckbox();
    });
  }

  if (addBtn) addBtn.addEventListener('click', openSettingsModal);
  if (addEntryTopBtn) addEntryTopBtn.addEventListener('click', openSettingsModal);
  addEntryDataBtn.addEventListener('click', function () { openModal('add', null); });
  emptyAddBtn.addEventListener('click', function () { openModal('add', null); });
  // addRowBtn.addEventListener('click', openFieldModal);
  // deleteEntrySettingsBtn.addEventListener('click', openDeleteSettings);

  deleteSettingsModal.addEventListener('click', function (e) {
    if (e.target === deleteSettingsModal || e.target.closest('[data-close-delete-settings]')) {
      closeDeleteSettings();
    }
  });

  confirmDeleteSettingsBtn.addEventListener('click', async function () {
    if (!state.entryId) return;
    confirmDeleteSettingsBtn.disabled = true;
    confirmDeleteSettingsBtn.textContent = EntriesUI.t('deleting');
    try {
      var res = await EntriesAPI.removeEntrySettings(state.entryId);
      if (Number(res.success) === 0) throw new Error(res.message || EntriesUI.t('deleteFailed'));
      EntriesUI.pushToast('Entry tab deleted', { tone: 'success' });
      await afterDeleteSettings();
    } catch (err) {
      EntriesUI.pushToast(EntriesUI.t('deleteFailed'), {
        message: err && err.message ? err.message : 'Unknown error',
        tone: 'error'
      });
      confirmDeleteSettingsBtn.disabled = false;
      confirmDeleteSettingsBtn.textContent = EntriesUI.t('delete');
    }
  });

  initFieldTypeSelect();

  fieldTypeSelect.addEventListener('change', function () {
    fieldDetailsWrap.classList.toggle('hidden', !fieldTypeSelect.value);
  });

  fieldModal.addEventListener('click', function (e) {
    if (e.target === fieldModal || e.target.closest('[data-close-field]')) closeFieldModal();
  });

  fieldForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    showFieldModalError('');
    var tab = selectedTab();
    if (!tab || !state.entryId) {
      showFieldModalError(EntriesUI.t('selectEntryTabFirst'));
      return;
    }
    var form = readFieldModalForm();
    if (!form.type) {
      showFieldModalError(EntriesUI.t('selectCustomFieldType'));
      return;
    }
    if (!form.label_en) {
      showFieldModalError(EntriesUI.t('englishLabelRequired'));
      return;
    }
    var name = slugifyFieldName(form.label_en, 'field_' + (getExistingTabFields(tab).length + 1));
    var existing = getExistingTabFields(tab);
    if (existing.some(function (field) { return field.name === name; })) {
      showFieldModalError(EntriesUI.t('fieldNameAlreadyExists'));
      return;
    }
    var newField = {
      name: name,
      input_type: normalizeInputType(form.type),
      label_en: form.label_en,
      label_he: form.label_he || form.label_en
    };
    if (form.default_value) newField.default_value = form.default_value;
    var fieldPayload = buildCustomFieldsPayload(existing.concat([newField]));
    fieldSaveBtn.disabled = true;
    fieldSaveBtn.textContent = EntriesUI.t('loading');
    try {
      var res = await EntriesAPI.updateEntrySettings({
        id: state.entryId,
        fields: fieldPayload.fields,
        fields_json: fieldPayload.fields_json,
        // custom_fields: fieldPayload.custom_fields
      });
      if (Number(res.success) === 0) throw new Error(res.message || EntriesUI.t('saveFailed'));
      EntriesUI.pushToast('Custom field added', { tone: 'success' });
      closeFieldModal();
      await refreshBasic();
      await loadRows();
    } catch (err) {
      showFieldModalError(err && err.message ? err.message : EntriesUI.t('saveFailed'));
    } finally {
      fieldSaveBtn.disabled = false;
      fieldSaveBtn.textContent = EntriesUI.t('save');
    }
  });

  addCustomFieldBtn.addEventListener('click', function () {
    var rows = collectCustomFieldRowStates();
    rows.push({});
    renderCustomFieldRows(rows);
  });

  customFieldRows.addEventListener('change', function (e) {
    var typeEl = e.target.closest('[data-field-type]');
    if (!typeEl) return;
    var rowEl = typeEl.closest('.settings-custom-field-row');
    toggleCustomFieldDetails(rowEl, !!typeEl.value);
  });

  customFieldRows.addEventListener('click', function (e) {
    if (!e.target.closest('[data-remove-field]')) return;
    var rows = collectCustomFieldRowStates();
    var rowEl = e.target.closest('.settings-custom-field-row');
    var index = Number(rowEl && rowEl.getAttribute('data-field-index'));
    if (!isNaN(index)) rows.splice(index, 1);
    if (!rows.length) rows.push({});
    renderCustomFieldRows(rows);
  });

  folderSelect.addEventListener('change', function () {
    var option = folderSelect.options[folderSelect.selectedIndex];
    if (!option || !option.value) return;
    initSettingsPickers();
    state.folderPicker.add(option.value, option.textContent.trim());
    populateFolderSelect();
  });

  folderTags.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-tag-id]');
    if (!btn) return;
    initSettingsPickers();
    state.folderPicker.remove(btn.getAttribute('data-tag-id'));
    populateFolderSelect();
  });

  customerSearch.addEventListener('click', function () {
    initSettingsPickers();
    if (state.customerPicker.isOpen()) state.customerPicker.closeMenu();
    else {
      state.customerPicker.renderMenu();
      state.customerPicker.openMenu();
    }
  });

  customerMenu.addEventListener('click', function (e) {
    var option = e.target.closest('[data-combo-id]');
    if (!option) return;
    initSettingsPickers();
    state.customerPicker.add(option.getAttribute('data-combo-id'), option.textContent.trim());
  });

  customerLoadMore.addEventListener('click', function (e) {
    e.stopPropagation();
    initSettingsPickers();
    state.customerPicker.loadMore();
  });

  customerTags.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-tag-id]');
    if (!btn) return;
    initSettingsPickers();
    state.customerPicker.remove(btn.getAttribute('data-tag-id'));
  });

  document.addEventListener('click', function (e) {
    if (state.customerPicker && customerPickerWrap && !customerPickerWrap.contains(e.target)) {
      state.customerPicker.closeMenu();
    }
    if (rowCustomerPickerWrap && !rowCustomerPickerWrap.contains(e.target)) {
      closeRowCustomerDropdown();
    }
    if (fieldPicker && !fieldPicker.contains(e.target)) {
      closeFieldPicker();
    }
  });

  rowCustomerDisplay.addEventListener('click', function () {
    if (rowCustomerPanel.classList.contains('hidden')) openRowCustomerDropdown();
    else closeRowCustomerDropdown();
  });

  rowCustomerList.addEventListener('click', function (e) {
    var option = e.target.closest('[data-id]');
    if (!option) return;
    setRowCustomerSelection(option.getAttribute('data-id'), option.textContent.trim());
  });

  rowCustomerLoadMore.addEventListener('click', function (e) {
    e.stopPropagation();
    if (!hasMoreCustomers()) return;
    rowCustomerLoadMore.disabled = true;
    loadMoreCustomers().then(function () {
      populateRowCustomerList();
      openRowCustomerDropdown();
    }).finally(function () {
      rowCustomerLoadMore.disabled = false;
    });
  });

  customerSearch.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      state.customerPicker.closeMenu();
    }
  });


  setUseCustomer.addEventListener('change', function () {
    setEntryFolderWrap.classList.toggle('hidden', !setUseCustomer.checked);
  });

  settingsModal.addEventListener('click', function (e) {
    if (e.target === settingsModal || e.target.closest('[data-close-settings]')) closeSettingsModal();
  });

  settingsForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    showSettingsError('');
    var tabNameEn = setTabNameEn.value.trim();
    var tabNameHe = setTabNameHe.value.trim();
    if (!tabNameEn) {
      showSettingsError(EntriesUI.t('entryNameEnglishRequired'));
      return;
    }
    if (!tabNameHe) {
      showSettingsError(EntriesUI.t('entryNameHebrewRequired'));
      return;
    }
    var payload = buildEntrySettingsPayload({
      tabNameEn: tabNameEn,
      tabNameHe: tabNameHe,
      tabName: tabNameEn,
      folderIds: pickerValues(state.folderPicker),
      customerIds: pickerValues(state.customerPicker),
      customFields: collectCustomFields(),
      showInDashboard: setShowInHeader.checked,
      showInCustomer: !!selectedCustomerId(),
      copyCustomerTab: setCopyCustomer.checked,
      useCustomer: setUseCustomer.checked,
      entryFolderId: setEntryFolderId.value.trim()
    });

    settingsSaveBtn.disabled = true;
    settingsSaveBtn.textContent = EntriesUI.t('loading');
    try {
      var res = await EntriesAPI.addEntrySettings(payload);
      if (Number(res.success) === 0) throw new Error(res.message || EntriesUI.t('saveFailed'));
      EntriesUI.pushToast('Entry tab created', { tone: 'success' });
      closeSettingsModal();
      await refreshBasic();
    } catch (err) {
      showSettingsError(err && err.message ? err.message : EntriesUI.t('saveFailed'));
    } finally {
      settingsSaveBtn.disabled = false;
      settingsSaveBtn.textContent = EntriesUI.t('save');
    }
  });

  pagerPages.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    if (state.navLevel === 'customers') {
      goToCustomerPage(btn.getAttribute('data-page'));
      return;
    }
    goToPage(btn.getAttribute('data-page'));
  });

  tableBody.addEventListener('click', function (e) {
    var customerLink = e.target.closest('.customer-link');
    if (customerLink) {
      e.preventDefault();
      var href = customerLink.getAttribute('href') ||
        customerAdminUrl(customerLink.getAttribute('data-customer-id'));
      window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }
    var editBtn = e.target.closest('[data-edit]');
    var delBtn = e.target.closest('[data-delete]');
    if (editBtn) {
      var row = findRowById(editBtn.getAttribute('data-edit'));
      if (row) openModal('edit', row);
      return;
    }
    if (delBtn) {
      var delRow = findRowById(delBtn.getAttribute('data-delete'));
      if (delRow) openDelete(delRow);
    }
  });

  tableBody.addEventListener('change', function (e) {
    var box = e.target.closest('[data-select-row]');
    if (!box) return;
    setRowSelected(box.getAttribute('data-select-row'), box.checked);
    renderBulkBar();
    syncSelectAllCheckbox();
  });

  if (runAutomationBtn) {
    runAutomationBtn.addEventListener('click', openAutomationModal);
  }

  if (exportDataBtn) exportDataBtn.addEventListener('click', exportData);
  if (exportDataBulkBtn) exportDataBulkBtn.addEventListener('click', exportData);

  if (automationModal) {
    automationModal.addEventListener('click', function (e) {
      if (e.target === automationModal || e.target.closest('[data-close-automation]')) {
        closeAutomationModal();
      }
    });
  }

  if (automationResetBtn) {
    automationResetBtn.addEventListener('click', function () {
      resetAutomationForm();
    });
  }

  if (automationForm) {
    automationForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      showAutomationError('');
      var automationId = automationSelect ? String(automationSelect.value || '').trim() : '';
      if (!automationId) {
        showAutomationError(EntriesUI.t('automationRequired'));
        return;
      }

      var runCustomer = state.automationTarget === 'customer';
      var ids = runCustomer ? [] : selectedIdList();
      if (!runCustomer && !ids.length) {
        showAutomationError(EntriesUI.t('selectRowsFirst'));
        return;
      }
      if (runCustomer && !selectedCustomerId()) {
        showAutomationError(EntriesUI.t('customerRequired'));
        return;
      }

      automationSubmitBtn.disabled = true;
      automationSubmitBtn.textContent = EntriesUI.t('loading');
      try {
        var res;
        if (runCustomer) {
          res = await EntriesAPI.runCustomerAutomation({
            automation_id: automationId,
            customer_ids: selectedCustomerId()
          });
        } else {
          var customerIds = [];
          ids.forEach(function (id) {
            var row = findRowById(id);
            var custId = EntriesAPI.rowCustomerId(row);
            if (custId) customerIds.push(custId);
          });
          res = await EntriesAPI.runAutomation({
            automation_id: automationId,
            entry_id: state.entryId,
            ids: ids,
            customer_ids: customerIds
          });
        }
        if (Number(res.success) === 0) throw new Error(res.message || EntriesUI.t('automationFailed'));
        EntriesUI.pushToast(EntriesUI.t('automationRan'), {
          message: res.message || '',
          tone: 'success'
        });
        closeAutomationModal();
      } catch (err) {
        showAutomationError(err && err.message ? err.message : EntriesUI.t('automationFailed'));
      } finally {
        automationSubmitBtn.disabled = false;
        automationSubmitBtn.textContent = EntriesUI.t('submit');
      }
    });
  }

  formModal.addEventListener('click', function (e) {
    if (e.target === formModal || e.target.closest('[data-close-modal]')) closeModal();
  });
  deleteModal.addEventListener('click', function (e) {
    if (e.target === deleteModal || e.target.closest('[data-close-delete]')) closeDelete();
  });

  entryForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var tab = selectedTab();
    if (!tab) return;
    showFormError('');

    var fields = tabFields(tab);
    var payload = {};
    var statusEl = dynamicFields.querySelector('[data-field-key="status"]');
    if (statusEl) {
      var statusVal = String(statusEl.value || '').trim();
      if (statusVal) payload.status = statusVal;
    }

    for (var i = 0; i < fields.length; i += 1) {
      var field = fields[i];
      if (EntriesAPI.fieldInputType(field) === 'formula') continue;
      var n = EntriesAPI.fieldNumber(field, i);
      var key = 'data' + n;
      var el = dynamicFields.querySelector('[data-field-key="' + key + '"]');
      var val = el ? String(el.value || '').trim() : '';
      if (EntriesAPI.isFieldRequired(field) && !val) {
        showFormError(EntriesAPI.fieldLabel(field, i) + ' ' + EntriesUI.t('isRequiredSuffix'));
        return;
      }
      if (val) payload[key] = val;
    }

    var pickedCustomerId = state.rowCustomerSelectedId
      ? String(state.rowCustomerSelectedId)
      : selectedCustomerId();
    if (pickedCustomerId) payload.customer_id = pickedCustomerId;
    if (needsEntryCustomer(tab)) {
      if (!entryCustIdInput.value.trim()) {
        showFormError(EntriesUI.t('entryCustomerIdRequired'));
        return;
      }
      payload.entry_cust_id = entryCustIdInput.value.trim();
    } else if (entryCustIdInput.value.trim()) {
      payload.entry_cust_id = entryCustIdInput.value.trim();
    }

    saveBtn.disabled = true;
    saveBtn.textContent = EntriesUI.t('saving');
    try {
      var res;
      if (state.modalMode === 'add') {
        res = await EntriesAPI.addEntry(tab.id, payload);
      } else {
        var id = EntriesAPI.rowId(state.editingRow);
        if (!id) throw new Error(EntriesUI.t('missingRowId'));
        res = await EntriesAPI.updateEntry(tab.id, id, payload);
      }
      if (Number(res.success) === 0) throw new Error(res.message || EntriesUI.t('saveFailed'));
      EntriesUI.pushToast(state.modalMode === 'add' ? EntriesUI.t('entryAdded') : EntriesUI.t('entryUpdated'), { tone: 'success' });
      closeModal();
      await loadRows();
    } catch (err) {
      showFormError(err && err.message ? err.message : EntriesUI.t('saveFailed'));
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = state.modalMode === 'add' ? EntriesUI.t('addEntry') : EntriesUI.t('saveChanges');
    }
  });

  confirmDeleteBtn.addEventListener('click', async function () {
    if (!state.deleteRow || !state.entryId) return;
    var id = EntriesAPI.rowId(state.deleteRow);
    if (!id) return;
    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = EntriesUI.t('deleting');
    try {
      var res = await EntriesAPI.deleteEntry(state.entryId, id);
      if (Number(res.success) === 0) throw new Error(res.message || EntriesUI.t('deleteFailed'));
      EntriesUI.pushToast(EntriesUI.t('entryDeleted'), { tone: 'success' });
      closeDelete();
      await loadRows();
    } catch (err) {
      EntriesUI.pushToast(EntriesUI.t('deleteFailed'), {
        message: err && err.message ? err.message : 'Unknown error',
        tone: 'error'
      });
      confirmDeleteBtn.disabled = false;
      confirmDeleteBtn.textContent = EntriesUI.t('delete');
    }
  });

  document.getElementById('syncTabsBtn').addEventListener('click', function () {
    refreshBasic()
      .then(function () {
        EntriesUI.pushToast('Settings refreshed', { tone: 'success' });
      })
      .catch(function (err) {
        EntriesUI.pushToast('Refresh failed', {
          message: err && err.message ? err.message : '',
          tone: 'error'
        });
      });
  });

  document.getElementById('logoutBtn').addEventListener('click', function () {
    if (state.disconnectRealtime) state.disconnectRealtime();
    EntriesAPI.clearSession();
    location.replace(EntriesAPI.appHomeUrl());
  });

  if (EntriesAPI.ensureAccountUrl()) return;
  if (!EntriesAPI.isAuthenticated()) return;

  EntriesUI.onLangChange = function () {
    setLive(livePill.classList.contains('is-on'));
    updateView();
    if (state.navLevel === 'data') {
      renderFieldPicker();
      renderRows();
    }
    if (state.navLevel === 'customers') {
      renderCustomerBrowse();
      renderPager({
        total: state.browseTotal,
        offset: state.browseOffset,
        loading: state.browseLoading
      });
    }
  };

  EntriesUI.initTheme();
  EntriesUI.initLang();

  refreshBasic()
    .then(function () {
      var user = EntriesAPI.accountUsername();
      if (user && EntriesAPI.ensureAccountUrl(user)) return;
      boot.classList.add('hidden');
      app.classList.remove('hidden');
      openCustomers();
      var hashSnap = parseNavHash();
      if (hashSnap && hashSnap.selectedCustomerId) {
        applyNavSnapshot(hashSnap);
        syncNav('push');
      }
      wireRealtime();
    })
    .catch(function (err) {
      EntriesAPI.clearSession();
      EntriesUI.pushToast('Session expired', {
        message: err && err.message ? err.message : 'Please login again.',
        tone: 'error'
      });
      setTimeout(function () { location.replace(EntriesAPI.appHomeUrl()); }, 800);
    });
})();
