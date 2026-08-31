
(function () {
  'use strict';

  var PAGE_SIZE = (window.EntriesConfig && EntriesConfig.PAGE_SIZE) || 25;
  var esc = EntriesUI.escapeHtml;

  var state = {
    basic: null,
    list: [],
    tabs: [],
    groups: [],
    navLevel: 'groups',
    selectedGroupId: '',
    entryId: '',
    search: '',
    offset: 0,
    total: 0,
    rows: [],
    loading: false,
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
    selectedIds: {}
  };

  var boot = document.getElementById('boot');
  var app = document.getElementById('app');
  var navBackBtn = document.getElementById('navBackBtn');
  var navTitle = document.getElementById('navTitle');
  var groupPicker = document.getElementById('groupPicker');
  var entryPicker = document.getElementById('entryPicker');
  var dataToolbar = document.getElementById('dataToolbar');
  var tablePanel = document.getElementById('tablePanel');
  var pagerBar = document.getElementById('pagerBar');
  var searchForm = document.getElementById('searchForm');
  var searchInput = document.getElementById('searchInput');
  var clearSearchBtn = document.getElementById('clearSearchBtn');
  var addBtn = document.getElementById('addBtn');
  var addEntryTopBtn = document.getElementById('addEntryTopBtn');
  var addRowBtn = document.getElementById('addRowBtn');
  var deleteEntrySettingsBtn = document.getElementById('deleteEntrySettingsBtn');
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
    return EntriesAPI.findTab(state.basic, state.entryId);
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

  function updateView() {
    var isGroups = state.navLevel === 'groups';
    var isData = state.navLevel === 'data';

    navBackBtn.classList.toggle('hidden', isGroups);
    groupPicker.classList.toggle('hidden', !isGroups);
    entryPicker.classList.toggle('hidden', isGroups);
    dataToolbar.classList.toggle('hidden', !isData);
    tablePanel.classList.toggle('hidden', !isData);
    pagerBar.classList.toggle('hidden', !isData);
    if (bulkBar) bulkBar.classList.toggle('hidden', !isData);

    if (isGroups) {
      navTitle.textContent = EntriesUI.t('groupsTitle');
      renderGroupPicker();
      return;
    }

    var group = findGroup(state.selectedGroupId);
    var tab = selectedTab();
    if (isData && tab) {
      navTitle.textContent = (group ? EntriesAPI.groupName(group) + ' › ' : '') + EntriesAPI.tabName(tab);
    } else if (group) {
      navTitle.textContent = EntriesAPI.groupName(group);
    } else {
      navTitle.textContent = EntriesUI.t('selectEntry');
    }
    renderEntryPicker();
    renderUser();
  }

  function renderGroupPicker() {
    var html = '<div class="picker-grid">';
    state.groups.forEach(function (group) {
      var count = (group.tab_id || []).length;
      html +=
        '<button type="button" class="picker-card" data-group-id="' + esc(String(group.id)) + '">' +
          '<strong>' + esc(EntriesAPI.groupName(group)) + '</strong>' +
          '<span class="muted">' + count + ' ' + (count === 1 ? EntriesUI.t('entrySingular') : EntriesUI.t('entryPlural')) + '</span>' +
        '</button>';
    });
    html += '</div>';

    var ungrouped = EntriesAPI.getUngroupedTabs(state.basic);
    if (ungrouped.length) {
      html += '<div class="picker-section-title">' + esc(EntriesUI.t('otherEntries')) + '</div>';
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

    if (!state.groups.length && !ungrouped.length) {
      html = '<p class="muted picker-hint">' + esc(EntriesUI.t('noTabs')) + '</p>';
    }
    groupPicker.innerHTML = html;
  }

  function renderEntryPicker() {
    var tabs = [];
    var group = findGroup(state.selectedGroupId);
    if (group) tabs = EntriesAPI.getTabsInGroup(state.basic, group);
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

  function openGroups() {
    state.navLevel = 'groups';
    state.selectedGroupId = '';
    state.entryId = '';
    state.rows = [];
    state.total = 0;
    state.offset = 0;
    state.search = '';
    searchInput.value = '';
    updateView();
  }

  function openGroup(groupId) {
    state.navLevel = 'entries';
    state.selectedGroupId = String(groupId);
    state.entryId = '';
    state.rows = [];
    state.total = 0;
    state.offset = 0;
    updateView();
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
  }

  function navBack() {
    if (state.navLevel === 'data') {
      if (state.selectedGroupId) {
        state.navLevel = 'entries';
        state.entryId = '';
        state.rows = [];
        state.total = 0;
        updateView();
        return;
      }
      openGroups();
      return;
    }
    if (state.navLevel === 'entries') {
      openGroups();
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

  function renderPager() {
    var pageStart = state.total === 0 ? 0 : state.offset + 1;
    var pageEnd = Math.min(state.offset + PAGE_SIZE, state.total);
    listMeta.textContent = state.loading
      ? EntriesUI.t('loading')
      : pageStart + '–' + pageEnd + ' ' + EntriesUI.t('of') + ' ' + state.total;
    clearSearchBtn.classList.toggle('hidden', !state.search);

    var pages = totalPages();
    var current = currentPage();
    var html = '';

    function pageBtn(label, page, extraClass, disabled) {
      return (
        '<button type="button" class="page-btn' + (extraClass ? ' ' + extraClass : '') + '"' +
        (disabled ? ' disabled' : '') +
        ' data-page="' + page + '">' + esc(label) + '</button>'
      );
    }

    html += pageBtn('«', 1, '', current <= 1 || state.loading);
    html += pageBtn('‹', Math.max(1, current - 1), '', current <= 1 || state.loading);

    var windowSize = 2;
    var start = Math.max(1, current - windowSize);
    var end = Math.min(pages, current + windowSize);
    if (start > 1) {
      html += pageBtn('1', 1, '', state.loading);
      if (start > 2) html += '<span class="page-ellipsis">…</span>';
    }
    for (var p = start; p <= end; p += 1) {
      html += pageBtn(String(p), p, p === current ? 'is-active' : '', state.loading);
    }
    if (end < pages) {
      if (end < pages - 1) html += '<span class="page-ellipsis">…</span>';
      html += pageBtn(String(pages), pages, '', state.loading);
    }

    html += pageBtn('›', Math.min(pages, current + 1), '', current >= pages || state.loading);
    html += pageBtn('»', pages, '', current >= pages || state.loading);
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
    var cols = [{ kind: 'customer' }].concat(EntriesAPI.orderedColumns(tab));
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
      fieldPickerList.innerHTML = '<div class="field-picker__empty">' + esc(EntriesUI.t('noFieldMatches')) + '</div>';
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

    return EntriesAPI.fetchAllEntryRows({
      entry_id: state.entryId,
      search: searchTerm,
      order: 'id_desc'
    }).then(function (listed) {
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
        '<input type="checkbox" id="selectAllRows" aria-label="' + esc(EntriesUI.t('selectAll')) + '" />' +
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

    return EntriesAPI.listEntries({
      entry_id: state.entryId,
      limit: PAGE_SIZE,
      offset: state.offset,
      search: searchTerm,
      order: 'id_desc'
    }).then(function (listed) {
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
      showListError(err && err.message ? err.message : EntriesUI.t('loadEntriesFailed'));
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
    formModalTitle.textContent = mode === 'add' ? EntriesUI.t('addEntryModal') : EntriesUI.t('editEntry');
    formModalSubtitle.textContent = EntriesAPI.tabName(tab);
    saveBtn.textContent = mode === 'add' ? EntriesUI.t('addEntryModal') : EntriesUI.t('saveChanges');

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
      html += '<p class="muted">' + esc(EntriesUI.t('noFieldDefinitions')) + '</p>';
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
            '<small class="muted">' + esc(EntriesUI.t('formulaHint')) + ' ' + esc(field.formula || '') + '</small></label>'
          );
        }

        var relatedName = EntriesAPI.relatedFieldName(row, n);
        var isRelated =
          type === 'customer' ||
          type === 'team_member' ||
          EntriesAPI.isCustomerRelationField(field, row, index) ||
          !!relatedName;

        if (isRelated) {
          var displayName = relatedName || EntriesAPI.displayFieldValue(field, row || {}, index) || raw;
          return (
            '<label class="field"><span>' + esc(label) + reqMark + '</span>' +
            '<input type="text" value="' + esc(displayName) + '" readonly class="field-related-name" />' +
            '<input type="hidden" data-field-key="' + key + '" value="' + esc(raw) + '" />' +
            '</label>'
          );
        }

        if (type === 'select') {
          var opts = EntriesAPI.fieldOptions(field);
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

        return (
          '<label class="field"><span>' + esc(label) + reqMark + '</span>' +
          '<input type="' + type + '" data-field-key="' + key + '" value="' + esc(value) + '"' +
          (required ? ' required' : '') + ' /></label>'
        );
      }).join('');
    }

    dynamicFields.innerHTML = html;
    state.rowCustomerSelectedId = '';
    rowCustomerField.classList.toggle('hidden', mode !== 'add');
    if (mode === 'add') {
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
    EntriesUI.applyStaticI18n();
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

  function openAutomationModal() {
    if (!selectedCount()) {
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
    }).catch(function (err) {
      automationSelect.disabled = false;
      showAutomationError(err && err.message ? err.message : EntriesUI.t('automationFailed'));
    });
  }

  function closeAutomationModal() {
    automationModal.classList.add('hidden');
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
    { value: 'text', labelKey: 'fieldTypeText' },
    { value: 'email', labelKey: 'fieldTypeEmail' },
    { value: 'number', labelKey: 'fieldTypeNumber' },
    { value: 'date', labelKey: 'fieldTypeDate' },
    { value: 'hour', labelKey: 'fieldTypeHour' },
    { value: 'date_time', labelKey: 'fieldTypeDateTime' },
    { value: 'select', labelKey: 'fieldTypeSelect' },
    { value: 'yes_no', labelKey: 'fieldTypeYesNo' },
    { value: 'button', labelKey: 'fieldTypeButton' },
    { value: 'formula', labelKey: 'fieldTypeFormula' },
    { value: 'team_member', labelKey: 'fieldTypeTeamMember' },
    { value: 'title', labelKey: 'fieldTypeTitle' },
    { value: 'customer', labelKey: 'fieldTypeCustomer' },
    { value: 'Files', labelKey: 'fieldTypeFiles' },
    { value: 'year', labelKey: 'fieldTypeYear' }
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
        '>' + esc(EntriesUI.t(item.labelKey)) + '</option>';
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
      custom_fields: customFields
    };
  }

  function buildEntrySettingsPayload(options) {
    options = options || {};
    var payload = {
      tab_name_en: options.tabNameEn,
      tab_name_he: options.tabNameHe,
      tab_name: options.tabName || options.tabNameEn,
      show_in_dashboard: options.showInDashboard ? 1 : 0,
      copy_customer_tab: options.copyCustomerTab ? 1 : 0,
      use_customer_for_entry: options.useCustomer ? 1 : 0,
      status: 1
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
      payload.custom_fields = fieldPayload.custom_fields;
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
    initFieldTypeSelect();
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

  function handleRealtimeEvent(event) {
    var key = String(event && event.key || '');
    var payload = EntriesAPI.getRealtimePayload(event);

    if (EntriesAPI.isEntriesSettingsRealtimeKey(key)) {
      refreshBasic().catch(function () { /* ignore refresh errors */ });
      EntriesUI.pushToast(EntriesUI.t('entrySettingsUpdated'), { message: EntriesUI.t('tabsRefreshedLive'), tone: 'info' });
      return;
    }

    if (!EntriesAPI.isEntriesRealtimeKey(key)) return;

    var eventEntryId = EntriesAPI.getRealtimeEntryId(payload);
    if (eventEntryId != null && state.entryId && String(eventEntryId) !== String(state.entryId)) {
      return;
    }

    var id = EntriesAPI.getRealtimeRowId(payload);

    if (/created|add/i.test(key)) {
      EntriesUI.pushToast(EntriesUI.t('newEntryLive'), { message: EntriesUI.t('rowAddedLive'), tone: 'success' });
    } else if (/updated|edit/i.test(key)) {
      EntriesUI.pushToast(EntriesUI.t('entryRowUpdated'), { message: EntriesUI.t('rowUpdatedLive'), tone: 'info' });
    } else if (/deleted|removed|delete/i.test(key)) {
      EntriesUI.pushToast(EntriesUI.t('entryRowDeleted'), { message: EntriesUI.t('rowRemovedLive'), tone: 'warning' });
    }

    loadRows().then(function () {
      if (id) pulseRow(id);
    });
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
      var tabsInfo = EntriesAPI.getEntryTabs(basic);
      state.list = tabsInfo.list;
      state.tabs = tabsInfo.tabs;
      state.groups = tabsInfo.groups || [];
      updateView();
      if (state.navLevel === 'data' && state.entryId) return loadRows();
      return Promise.resolve();
    });
  }

  navBackBtn.addEventListener('click', navBack);

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
  addRowBtn.addEventListener('click', openFieldModal);
  deleteEntrySettingsBtn.addEventListener('click', openDeleteSettings);

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
      EntriesUI.pushToast(EntriesUI.t('entryTabDeleted'), { tone: 'success' });
      await afterDeleteSettings();
    } catch (err) {
      EntriesUI.pushToast(EntriesUI.t('deleteFailed'), {
        message: err && err.message ? err.message : EntriesUI.t('unknownError'),
        tone: 'error'
      });
      confirmDeleteSettingsBtn.disabled = false;
      confirmDeleteSettingsBtn.textContent = EntriesUI.t('delete');
    }
  });

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
      showFieldModalError(EntriesUI.t('fieldNameExists'));
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
        custom_fields: fieldPayload.custom_fields
      });
      if (Number(res.success) === 0) throw new Error(res.message || EntriesUI.t('saveFailed'));
      EntriesUI.pushToast(EntriesUI.t('customFieldAdded'), { tone: 'success' });
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
      showSettingsError(EntriesUI.t('entryNameEnRequired'));
      return;
    }
    if (!tabNameHe) {
      showSettingsError(EntriesUI.t('entryNameHeRequired'));
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
      copyCustomerTab: setCopyCustomer.checked,
      useCustomer: setUseCustomer.checked,
      entryFolderId: setEntryFolderId.value.trim()
    });

    settingsSaveBtn.disabled = true;
    settingsSaveBtn.textContent = EntriesUI.t('loading');
    try {
      var res = await EntriesAPI.addEntrySettings(payload);
      if (Number(res.success) === 0) throw new Error(res.message || EntriesUI.t('saveFailed'));
      EntriesUI.pushToast(EntriesUI.t('entryTabCreated'), { tone: 'success' });
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
      var ids = selectedIdList();
      if (!ids.length) {
        showAutomationError(EntriesUI.t('selectRowsFirst'));
        return;
      }
      var automationId = automationSelect ? String(automationSelect.value || '').trim() : '';
      if (!automationId) {
        showAutomationError(EntriesUI.t('automationRequired'));
        return;
      }
      var customerIds = [];
      ids.forEach(function (id) {
        var row = findRowById(id);
        var custId = EntriesAPI.rowCustomerId(row);
        if (custId) customerIds.push(custId);
      });
      automationSubmitBtn.disabled = true;
      automationSubmitBtn.textContent = EntriesUI.t('loading');
      try {
        var res = await EntriesAPI.runAutomation({
          automation_id: automationId,
          entry_id: state.entryId,
          ids: ids,
          customer_ids: customerIds
        });
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

    for (var i = 0; i < fields.length; i += 1) {
      var field = fields[i];
      if (EntriesAPI.fieldInputType(field) === 'formula') continue;
      var n = EntriesAPI.fieldNumber(field, i);
      var key = 'data' + n;
      var el = dynamicFields.querySelector('[data-field-key="' + key + '"]');
      var val = el ? String(el.value || '').trim() : '';
      if (EntriesAPI.isFieldRequired(field) && !val) {
        showFormError(EntriesUI.t('fieldRequired').replace('{name}', EntriesAPI.fieldLabel(field, i)));
        return;
      }
      if (val) payload[key] = val;
    }

    var pickedCustomerId = state.modalMode === 'add' && state.rowCustomerSelectedId
      ? String(state.rowCustomerSelectedId)
      : '';
    if (pickedCustomerId) payload.customer_id = pickedCustomerId;
    if (needsEntryCustomer(tab)) {
      if (!entryCustIdInput.value.trim()) {
        showFormError(EntriesUI.t('entryCustomerRequired'));
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
        if (!id) throw new Error('Missing row id');
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
      saveBtn.textContent = state.modalMode === 'add' ? EntriesUI.t('addEntryModal') : EntriesUI.t('saveChanges');
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
      EntriesUI.pushToast(EntriesUI.t('entryRowDeleted'), { tone: 'success' });
      closeDelete();
      await loadRows();
    } catch (err) {
      EntriesUI.pushToast(EntriesUI.t('deleteFailed'), {
        message: err && err.message ? err.message : EntriesUI.t('unknownError'),
        tone: 'error'
      });
      confirmDeleteBtn.disabled = false;
      confirmDeleteBtn.textContent = EntriesUI.t('delete');
    }
  });

  document.getElementById('syncTabsBtn').addEventListener('click', function () {
    refreshBasic()
      .then(function () {
        EntriesUI.pushToast(EntriesUI.t('settingsRefreshed'), { tone: 'success' });
      })
      .catch(function (err) {
        EntriesUI.pushToast(EntriesUI.t('refreshFailed'), {
          message: err && err.message ? err.message : '',
          tone: 'error'
        });
      });
  });

  document.getElementById('logoutBtn').addEventListener('click', function () {
    if (state.disconnectRealtime) state.disconnectRealtime();
    EntriesAPI.clearSession();
    location.href = 'login.html';
  });

  function refreshDynamicFieldLabels() {
    var tab = selectedTab();
    if (!tab || !dynamicFields) return;
    var labels = dynamicFields.querySelectorAll('label.field > span');
    if (!labels.length) return;
    var idx = 0;
    var statuses = EntriesAPI.getTabStatuses(tab);
    if (statuses.length || (state.editingRow && (state.editingRow.status || state.editingRow.status_name))) {
      if (labels[idx]) labels[idx].textContent = EntriesAPI.statusColumnName(tab);
      idx += 1;
    }
    var fields = tabFields(tab);
    for (var i = 0; i < fields.length && idx < labels.length; i += 1) {
      var field = fields[i];
      var required = EntriesAPI.isFieldRequired(field);
      var label = EntriesAPI.fieldLabel(field, i);
      labels[idx].innerHTML = esc(label) + (required ? ' <em>*</em>' : '');
      idx += 1;
    }
  }

  function refreshOpenModalsI18n() {
    if (formModal && !formModal.classList.contains('hidden')) {
      formModalTitle.textContent = state.modalMode === 'add'
        ? EntriesUI.t('addEntryModal')
        : EntriesUI.t('editEntry');
      formModalSubtitle.textContent = EntriesAPI.tabName(selectedTab());
      if (!saveBtn.disabled) {
        saveBtn.textContent = state.modalMode === 'add'
          ? EntriesUI.t('addEntryModal')
          : EntriesUI.t('saveChanges');
      }
      refreshDynamicFieldLabels();
      EntriesUI.applyStaticI18n();
    }
    if (deleteSettingsModal && !deleteSettingsModal.classList.contains('hidden')) {
      var tab = selectedTab();
      if (tab) {
        deleteSettingsText.textContent = EntriesUI.t('deleteEntrySettingsConfirm').replace('{name}', EntriesAPI.tabName(tab));
      }
      confirmDeleteSettingsBtn.textContent = EntriesUI.t('delete');
    }
    if (fieldModal && !fieldModal.classList.contains('hidden')) {
      var selectedType = fieldTypeSelect ? fieldTypeSelect.value : '';
      if (fieldTypeSelect) fieldTypeSelect.innerHTML = customFieldTypeOptions(selectedType);
      var fieldTab = selectedTab();
      if (fieldTab && fieldModalTitle) fieldModalTitle.textContent = EntriesAPI.tabName(fieldTab);
    }
    if (settingsModal && !settingsModal.classList.contains('hidden')) {
      var rows = [];
      if (customFieldRows) {
        customFieldRows.querySelectorAll('.settings-custom-field-row').forEach(function (rowEl) {
          rows.push(readCustomFieldRow(rowEl));
        });
      }
      renderCustomFieldRows(rows.length ? rows : [{}]);
      populateFolderSelect();
      syncTeamMemberPickerItems();
    }
  }

  EntriesUI.onLangChange = function () {
    setLive(livePill.classList.contains('is-on'));
    updateView();
    if (state.navLevel === 'data') {
      renderFieldPicker();
      renderRows();
    }
    refreshOpenModalsI18n();
    if (fieldModal && fieldModal.classList.contains('hidden')) {
      initFieldTypeSelect();
    }
  };

  EntriesUI.initTheme();
  EntriesUI.initLang();
  initFieldTypeSelect();

  if (!EntriesAPI.requireAuth('login.html')) return;

  refreshBasic()
    .then(function () {
      boot.classList.add('hidden');
      app.classList.remove('hidden');
      openGroups();
      wireRealtime();
    })
    .catch(function (err) {
      EntriesAPI.clearSession();
      EntriesUI.pushToast(EntriesUI.t('sessionExpired'), {
        message: err && err.message ? err.message : EntriesUI.t('pleaseLoginAgain'),
        tone: 'error'
      });
      setTimeout(function () { location.href = 'login.html'; }, 800);
    });
})();
