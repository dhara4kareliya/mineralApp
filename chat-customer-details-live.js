/**
 * Live Customer Details for Multichat customer page.
 * Supports MULTIPLE folders per customer, each with its OWN Save button.
 * Internal statuses fetched PER FOLDER via Statuses.List (type=internal_status, folder_id=X).
 */
(function () {
  'use strict';

  var currentCustomerId = '';
  var customerData = null;
  var allSubStatuses = [];
  var allFolders = [];
  var toastTimer = null;
  var hasStarted = false; // prevents double init / double render

  var FOLDER_COLORS = {
    '1': '#f87171',
    '2': '#3b82f6',
    '3': '#ef4444',
    '4': '#9ca3af',
    '5': '#6b7280',
    '6': '#4b5563'
  };

  var dictionary = {
    en: {
      title: "Customer Card",
      loading: "Loading data...",
      missingId: "Missing customer ID",
      errorLoading: "Error loading customer card: ",
      errorStatus: "Error loading statuses",
      savingBtn: "Saving...",
      successToast: "Details saved successfully!",
      errorSave: "Error saving details: ",
      channels: "CHANNELS",
      channelWA: "WhatsApp",
      convStatus: "Conversation status",
      customerFolders: "CUSTOMER FOLDERS",
      folderLabel: "Folder",
      internalStatus: "Internal status",
      internalSubStatus: "Internal sub-status",
      selectInternalStatus: "--Select Internal Status--",
      saveFolderBtn: "Save for folder",
      details: "DETAILS",
      openMissions: "Missions",
      notes: "NOTES",
      notesPlaceholder: "Add a note about the customer..."
    },
    he: {
      title: "כרטיס לקוח",
      loading: "טוען נתונים…",
      missingId: "מזהה לקוח חסר",
      errorLoading: "שגיאה בטעינת כרטיס לקוח: ",
      errorStatus: "שגיאה בטעינת סטטוסים",
      savingBtn: "שומר…",
      successToast: "הפרטים נשמרו בהצלחה!",
      errorSave: "שגיאה בשמירת הפרטים: ",
      channels: "ערוצים",
      channelWA: "וואטסאפ",
      convStatus: "סטטוס שיחה",
      customerFolders: "תיקיות לקוח",
      folderLabel: "תיקייה",
      internalStatus: "סטטוס פנימי",
      internalSubStatus: "תת-סטטוס פנימי",
      selectInternalStatus: "-- בחר סטטוס פנימי --",
      saveFolderBtn: "שמור לתיקייה",
      details: "פרטים",
      openMissions: "משימות",
      notes: "הערות",
      notesPlaceholder: "הוסף הערה לגבי הלקוח..."
    }
  };

  function getLang() {
    var lang = (window.getCurrentLanguage && window.getCurrentLanguage()) || 'he';
    return dictionary[lang] ? lang : 'he';
  }

  function t(key) {
    var lang = getLang();
    return dictionary[lang][key] || dictionary['en'][key] || key;
  }

  function applyLanguageLayout() {
    var lang = getLang();
    var isRtl = lang === 'he';

    var body = document.getElementById('page-body');
    if (body) body.style.direction = isRtl ? 'rtl' : 'ltr';

    var identity = document.getElementById('cust-identity-container');
    if (identity) identity.style.direction = isRtl ? 'rtl' : 'ltr';

    var infoBox = document.getElementById('cust-info-box');
    if (infoBox) infoBox.style.textAlign = isRtl ? 'right' : 'left';

    document.getElementById('ui-title-header').textContent = t('title');
    document.getElementById('ui-loading-text').textContent = t('loading');

    var elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (k === 'channels_title') el.textContent = t('channels');
      if (k === 'whatsapp_title') el.textContent = t('whatsapp');
      if (k === 'conv_status_label') el.textContent = t('convStatus');
      if (k === 'conv_status_dropdown_label') el.textContent = t('convStatus');
      if (k === 'customer_folders_title') el.textContent = t('customerFolders');
      if (k === 'folder_select_label') el.textContent = t('folderLabel');
      if (k === 'internal_status_label') el.textContent = t('internalStatus');
      if (k === 'internal_sub_status_label') el.textContent = t('internalSubStatus');
      if (k === 'details_title') el.textContent = t('details');
      if (k === 'details_folder_label') el.textContent = t('folderLabel');
      if (k === 'details_open_missions_label') el.textContent = t('openMissions');
      if (k === 'notes_title') el.textContent = t('notes');
      if (k === 'save_button') el.textContent = t('saveFolderBtn');
      if (k === 'channel_wa') el.textContent = t('channelWA');
    });
  }

  function applySelectStyle(sel) {
    var isRtl = getLang() === 'he';
    sel.style.backgroundImage = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%237b8595' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")";
    sel.style.backgroundPosition = isRtl ? 'left 13px center' : 'right 13px center';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function qsParam() {
    var p = new URLSearchParams(location.search || '');
    var id = p.get('customer_id') || p.get('cust_id') || p.get('id') || '';
    return String(id || '').trim();
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
    if (s.indexOf('972') === 0 && s.length >= 11) return '0' + s.slice(3);
    return String(raw);
  }

  function showToast(message, kind) {
    var text = String(message || '').trim();
    if (!text) return;
    var el = document.getElementById('custom-toast');
    if (!el) return;
    clearTimeout(toastTimer);
    el.textContent = text;
    el.style.background = kind === 'error' ? '#a3302e' : '#16223a';
    el.style.display = 'block';
    toastTimer = setTimeout(function () { el.style.display = 'none'; }, 2800);
  }

  async function loadBasicData() {
    var client = MineralBarApp.getClient();
    try {
      var res = await client.request('User.Basic', {});
      var data = (res && res.data) || {};
      allFolders = data.folders || [];
    } catch (e) {
      console.error('[DetailsLive] User.Basic failed', e);
    }

    if (!allFolders || !allFolders.length) {
      allFolders = [
        { id: 1, name_en: 'New Leads', name_he: 'פניות חדשות' },
        { id: 2, name_en: 'Customers', name_he: 'לקוחות' },
        { id: 3, name_en: 'Missions', name_he: 'משימות' },
        { id: 4, name_en: 'Archive', name_he: 'ארכיון' },
        { id: 5, name_en: 'Trash', name_he: 'אשפה' },
        { id: 6, name_en: 'Spam', name_he: 'ספאם' }
      ];
    }
  }

  async function fetchStatusesForFolder(folderId) {
    var client = MineralBarApp.getClient();
    try {
      var res = await client.request('Statuses.List', {
        type: 'internal_status',
        folder_id: folderId,
        limit: 25
      });
      var rows = (res && res.data) || [];
      return Array.isArray(rows) ? rows : [];
    } catch (e) {
      console.error('[DetailsLive] Statuses.List failed for folder', folderId, e);
      return [];
    }
  }

  async function fetchSubStatuses() {
    var client = MineralBarApp.getClient();
    try {
      var res = await client.request('Statuses.List', {
        type: 'internal_sub_status',
        limit: 25
      });
      var rows = (res && res.data) || [];
      return Array.isArray(rows) ? rows : [];
    } catch (e) {
      console.error('[DetailsLive] Statuses.List sub-status failed', e);
      return [];
    }
  }

  /** Extract UNIQUE folder ids the customer belongs to (handles array / JSON-string array / CSV) */
  function extractFolderIds(c) {
    var ids = [];
    var raw = c.folders;

    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch (e) { raw = null; }
    }

    if (Array.isArray(raw) && raw.length) {
      ids = raw.map(function (f) {
        if (f && typeof f === 'object') return String(f.id || f.folder_id || '').trim();
        return String(f).trim();
      }).filter(Boolean);
    } else if (c.folder_id != null && String(c.folder_id).indexOf(',') !== -1) {
      ids = String(c.folder_id).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    } else if (c.folder_id != null) {
      ids = [String(c.folder_id).trim()];
    } else if (c.folder != null) {
      ids = [String(c.folder).trim()];
    } else {
      ids = ['1'];
    }

    var seen = {};
    return ids.filter(function (id) {
      if (!id || seen[id]) return false;
      seen[id] = true;
      return true;
    });
  }

  function getFolderStatusValue(c, folderId, folderStatuses) {
    if (c.folder_status_map && c.folder_status_map[folderId]) {
      return c.folder_status_map[folderId];
    }
    if (Array.isArray(c.folders) && c.folders.length && typeof c.folders[0] === 'object') {
      var match = c.folders.find(function (f) {
        return String(f.id || f.folder_id) === String(folderId);
      });
      if (match) {
        return {
          status_id: match.sub_list_data || match.status_id || match.status || '',
          sub_status_id: match.internal_sub_status_list || match.sub_status_id || ''
        };
      }
    }

    // Customer.Get stores the selected internal status id in `status`
    // (after Customer.Edit with sub_list_data / status). Also accept sub_list_data.
    var candidates = [
      c.sub_list_data,
      c.status_id,
      c.status
    ];
    var statusId = '';
    var known = {};
    (folderStatuses || []).forEach(function (row) {
      var id = row && (row.status_id || row.id || row.data_id);
      if (id != null && id !== '') known[String(id)] = true;
    });
    for (var i = 0; i < candidates.length; i++) {
      var cand = candidates[i];
      if (cand == null || cand === '') continue;
      // Prefer values that exist in this folder's Statuses.List options
      if (!folderStatuses || !folderStatuses.length || known[String(cand)]) {
        statusId = String(cand);
        break;
      }
    }

    return {
      status_id: statusId,
      sub_status_id: c.internal_sub_status_list || ''
    };
  }

  function getSubStatusesForParent(parentStatusId) {
    return allSubStatuses.filter(function (x) {
      var pId = x.parent_status_id || x.patent_status_id || x.data_patent_id || '';
      return String(pId) === String(parentStatusId);
    });
  }

  function styleStatusSelect(selectEl, folderStatuses) {
    var selectedId = selectEl ? String(selectEl.value || '') : '';
    var row = (folderStatuses || []).find(function (r) {
      var id = r.status_id || r.id || r.data_id;
      return String(id) === selectedId;
    });
    if (row && row.color) {
      selectEl.style.backgroundColor = String(row.color);
      selectEl.style.color = '#fff';
      selectEl.style.border = 'none';
    } else if (selectedId) {
      selectEl.style.backgroundColor = '#1d3fd6';
      selectEl.style.color = '#fff';
      selectEl.style.border = 'none';
    } else {
      selectEl.style.backgroundColor = '#fff';
      selectEl.style.color = '#1f2a3a';
      selectEl.style.border = '1.5px solid #d7e2ee';
    }
    applySelectStyle(selectEl);
  }

  function populateStatusSelect(selectEl, folderStatuses, selectedStatusId) {
    var isEn = getLang() === 'en';

    selectEl.innerHTML = '';
    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = t('selectInternalStatus');
    selectEl.appendChild(placeholder);

    var knownIds = {};
    (folderStatuses || []).forEach(function (row) {
      var id = row.status_id || row.id || row.data_id;
      var label = isEn ? (row.name_en || row.name_for || row.name_he) : (row.name_he || row.name_for || row.name_en);
      if (id == null || !label) return;
      knownIds[String(id)] = true;
      var option = document.createElement('option');
      option.value = String(id);
      option.textContent = String(label);
      selectEl.appendChild(option);
    });

    var sel = selectedStatusId ? String(selectedStatusId) : '';
    selectEl.value = (sel && knownIds[sel]) ? sel : '';
    styleStatusSelect(selectEl, folderStatuses);
  }

  function populateSubStatusSelect(selectEl, parentStatusId, selectedSubId) {
    selectEl.innerHTML = '';
    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '----';
    selectEl.appendChild(placeholder);

    var filtered = getSubStatusesForParent(parentStatusId);
    filtered.forEach(function (row) {
      var id = row.status_id || row.id || row.data_id;
      var label = row.name_he || row.name_for || row.name_en || row.name || '';
      var option = document.createElement('option');
      option.value = String(id);
      option.textContent = String(label);
      selectEl.appendChild(option);
    });

    selectEl.value = selectedSubId ? String(selectedSubId) : '';
  }

  /** Save folder status via Customer.Edit (sub_list_data + optional sub-status) */
  async function saveOneFolder(folderId, block) {
    var btn = block.querySelector('.folder-save-btn');
    var statusSel = block.querySelector('.folder-status-select');
    var subSel = block.querySelector('.folder-sub-status-select');

    if (!btn || btn.disabled) return;
    if (!currentCustomerId) {
      showToast(t('missingId'), 'error');
      return;
    }

    var statusId = statusSel ? String(statusSel.value || '').trim() : '';
    if (!statusId) {
      showToast(t('selectInternalStatus'), 'error');
      return;
    }

    var statusName = '';
    if (statusSel && statusSel.selectedIndex >= 0) {
      statusName = String(statusSel.options[statusSel.selectedIndex].textContent || '').trim();
    }

    var subStatusId = subSel ? String(subSel.value || '').trim() : '';

    var originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = t('savingBtn');

    try {
      var client = MineralBarApp.getClient();
      // Official Customer.Edit folder payload:
      // customer_id, folder_id, sub_list_data, sub_list_data_name, internal_sub_status_list?
      var payload = {
        folder_id: String(folderId),
        sub_list_data: statusId,
        sub_list_data_name: statusName,
        // Customer.Get returns the selected internal status in `status`
        status: statusId
      };
      if (subStatusId) {
        payload.internal_sub_status_list = subStatusId;
      }

      var raw = await client.request('Customer.Edit', Object.assign({
        customer_id: currentCustomerId,
        id: currentCustomerId,
        cust_id: currentCustomerId
      }, payload));

      if (!(raw && (Number(raw.success) === 1 || raw.success === true || raw.output || raw.data))) {
        var failMsg = (raw && (raw.message || raw.error)) || 'Customer.Edit failed';
        throw new Error(String(failMsg));
      }

      if (customerData) {
        customerData.status = statusId;
        customerData.sub_list_data = statusId;
        customerData.sub_list_data_name = statusName;
        if (subStatusId) customerData.internal_sub_status_list = subStatusId;
      }

      showToast(t('successToast'));
    } catch (err) {
      console.error('[DetailsLive] Save folder failed', folderId, err);
      showToast(t('errorSave') + (err && err.message ? err.message : String(err)), 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
  function buildFolderBlock(folderId, folderName, statusVal, subStatusVal, folderStatuses) {
    var block = document.createElement('div');
    block.className = 'folder-block';
    block.style.cssText = 'background:#eef4fb;border:1px solid #dce8f5;border-radius:14px;padding:14px;margin-bottom:10px;display:flex;flex-direction:column;gap:10px;';
    block.setAttribute('data-folder-id', folderId);

    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:8px;';
    header.innerHTML =
      '<span style="width:8px;height:8px;border-radius:50%;background:' + (FOLDER_COLORS[String(folderId)] || '#9ca3af') + ';flex:none;"></span>' +
      '<span style="font-size:14px;font-weight:800;color:#1f2a3a;">' + esc(folderName) + '</span>';
    block.appendChild(header);

    var statusWrap = document.createElement('div');
    var statusLabel = document.createElement('span');
    statusLabel.className = 'detail-label';
    statusLabel.style.cssText = 'display:block;margin-bottom:4px;font-size:11.5px;color:#7b8595;';
    statusLabel.setAttribute('data-i18n', 'internal_status_label');
    statusLabel.textContent = t('internalStatus');
    var statusSelect = document.createElement('select');
    statusSelect.className = 'custom-select folder-status-select';
    statusSelect.setAttribute('data-folder-id', folderId);
    statusSelect.style.cssText = 'width:100%;padding:9px 12px;border-radius:8px;border:none;font-size:13.5px;font-weight:700;color:#fff;background-color:#1d3fd6;outline:none;-webkit-appearance:none;appearance:none;background-repeat:no-repeat;';
    statusWrap.appendChild(statusLabel);
    statusWrap.appendChild(statusSelect);
    block.appendChild(statusWrap);

    var subWrap = document.createElement('div');
    var subLabel = document.createElement('span');
    subLabel.className = 'detail-label';
    subLabel.style.cssText = 'display:block;margin-bottom:4px;font-size:11.5px;color:#7b8595;';
    subLabel.setAttribute('data-i18n', 'internal_sub_status_label');
    subLabel.textContent = t('internalSubStatus');
    var subSelect = document.createElement('select');
    subSelect.className = 'custom-select folder-sub-status-select';
    subSelect.setAttribute('data-folder-id', folderId);
    subSelect.style.cssText = 'width:100%;padding:9px 12px;border-radius:8px;border:1.5px solid #d7e2ee;font-size:13.5px;color:#1f2a3a;background:#fff;outline:none;-webkit-appearance:none;appearance:none;background-repeat:no-repeat;';
    subWrap.appendChild(subLabel);
    subWrap.appendChild(subSelect);
    block.appendChild(subWrap);

    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'folder-save-btn';
    saveBtn.setAttribute('data-i18n', 'save_button');
    saveBtn.textContent = t('saveFolderBtn');
    saveBtn.style.cssText = 'align-self:flex-start;background:none;border:none;color:#1d60a2;font-size:12.5px;font-weight:700;cursor:pointer;padding:2px 0;text-decoration:underline;';
    block.appendChild(saveBtn);

    populateStatusSelect(statusSelect, folderStatuses, statusVal);
    populateSubStatusSelect(subSelect, statusVal, subStatusVal);

    statusSelect.addEventListener('change', function () {
      styleStatusSelect(statusSelect, folderStatuses);
      populateSubStatusSelect(subSelect, statusSelect.value, '');
      applySelectStyle(subSelect);
    });

    saveBtn.addEventListener('click', function () {
      saveOneFolder(folderId, block);
    });

    applySelectStyle(statusSelect);
    applySelectStyle(subSelect);

    return block;
  }

  async function renderFolderBlocks(c) {
    var container = document.getElementById('customer-folders-container');
    if (!container) return;
    container.innerHTML = '';

    var folderIds = extractFolderIds(c);
    var isEn = getLang() === 'en';

    if (!allSubStatuses.length) {
      allSubStatuses = await fetchSubStatuses();
    }

    for (var i = 0; i < folderIds.length; i++) {
      var fId = folderIds[i];
      var folderDef = allFolders.find(function (f) {
        return String(f.id || f.folder_id || f.value) === String(fId);
      });
      var folderName = folderDef
        ? (isEn ? (folderDef.name_en || folderDef.name || folderDef.name_he) : (folderDef.name_he || folderDef.name || folderDef.name_en))
        : ('Folder #' + fId);

      var folderStatuses = await fetchStatusesForFolder(fId);
      var vals = getFolderStatusValue(c, fId, folderStatuses);
      var block = buildFolderBlock(fId, folderName, vals.status_id, vals.sub_status_id, folderStatuses);
      container.appendChild(block);
    }
  }

  async function loadCustomerDetails() {
    var loading = document.getElementById('details-loading');
    var content = document.getElementById('details-content');
    if (!currentCustomerId) {
      if (loading) loading.textContent = t('missingId');
      return;
    }

    try {
      var res = await MineralBarApp.getCustomer(currentCustomerId);
      var c = res.customer || {};
      if (c.data && typeof c.data === 'object' && (c.data.name || c.data.customer_id)) c = c.data;
      customerData = c;

      document.getElementById('cust-name').textContent = c.name || ('#' + currentCustomerId);
      var phoneStr = formatPhone(c.mobile || c.phone || '');
      var emailStr = c.email || '';
      document.getElementById('cust-subtitle').textContent = [phoneStr, emailStr].filter(Boolean).join(' · ') || '';
      document.getElementById('cust-avatar').textContent = initials(c.name || '?');
      var noteText = (c.notes || c.note || '').trim();
      var noteElement = document.getElementById('notes-display-box');
      if (noteElement) {
        noteElement.textContent = noteText !== "" ? noteText : "-";
      }

      await renderFolderBlocks(c);

      try {
        var missionRes = await MineralBarApp.listMissions({ customer_id: currentCustomerId });
        var openCount = 0;
        if (missionRes && missionRes.rows) {
          openCount = missionRes.rows.filter(function (r) {
            return !(r.is_done || Number(r.done) === 1);
          }).length;
        }
        document.getElementById('details-open-missions').textContent = openCount;
      } catch (me) {
        document.getElementById('details-open-missions').textContent = '0';
      }

      if (loading) loading.style.display = 'none';
      if (content) content.style.display = 'flex';

    } catch (err) {
      console.error('[DetailsLive] getCustomer failed', err);
      if (loading) loading.textContent = t('errorLoading') + err.message;
    }
  }

  /** Guarded start — runs only ONCE even if both listeners fire */
  async function start() {
    if (hasStarted) return;
    hasStarted = true;

    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) {
      hasStarted = false;
      return;
    }

    currentCustomerId = qsParam();
    applyLanguageLayout();
    await loadBasicData();
    await loadCustomerDetails();
  }

  function onLiveRefresh(ev) {
    var detail = (ev && ev.detail) || {};
    var key = String(detail.key || '').toLowerCase();
    var group = String(detail.group || '').toLowerCase();
    var relevant =
      !key ||
      /customer|lead|crm|mission|ticket|message|chat|reminder|document/.test(key) ||
      group === 'leads' ||
      group === 'missions' ||
      group === 'messages' ||
      group === 'other' ||
      group === 'unknown';
    if (!relevant) return;
    clearTimeout(window.__mbCustDetailsRtTimer);
    window.__mbCustDetailsRtTimer = setTimeout(function () {
      if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
      loadCustomerDetails();
    }, 400);
  }

  window.addEventListener('mineralbar:ready', start);
  window.addEventListener('mineralbar:page-refresh', onLiveRefresh);
  window.addEventListener('mineralbar:realtime', onLiveRefresh);
  window.addEventListener('mineralbar:leads', onLiveRefresh);
  window.addEventListener('mineralbar:missions', onLiveRefresh);
  window.addEventListener('mineralbar:messages', onLiveRefresh);
  // No pageshow re-fetch — resume uses socket only.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(start, 50);
    });
  } else {
    setTimeout(start, 50);
  }

  if (window.MineralBarApp && MineralBarApp.bindLiveReload) {
    MineralBarApp.bindLiveReload(function () {
      if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
      loadCustomerDetails();
    }, { keys: /customer|lead|crm|mission|ticket|message|chat|reminder|document|socket\.nudge/i, delay: 400 });
  }

})();