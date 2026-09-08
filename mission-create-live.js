/**
 * Live Mission.Create / Mission.Get+Update+Done for service-create-task.html screen.
 * Handles form cards, schedule pills, customer linking, assignment dropdowns, and submission.
 */
(function () {
  'use strict';

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function isEn() {
    return typeof window.getCurrentLanguage === 'function'
      ? window.getCurrentLanguage() === 'en'
      : true;
  }

  function uiT(en, he) {
    if (typeof window.mbT === 'function') return window.mbT(en, he);
    return isEn() ? en : he;
  }

  /** Parse API datetime (UTC Y-m-d H:i:s) into a Date. */
  function parseUtcDateTime(str) {
    var s = String(str == null ? '' : str).trim();
    if (!s) return null;
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
      return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));
    }
    var d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function formatDisplayDate(d) {
    if (!d || Number.isNaN(d.getTime())) return '—';
    return pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + d.getFullYear() +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /** Mission.Create expects UTC Y-m-d H:i:s only (not today/tomorrow/next_week). */
  function formatUtcDateToDo(d) {
    if (!d || Number.isNaN(d.getTime())) return '';
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) +
      ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds());
  }

  function toDatetimeLocalValue(d) {
    if (!d || Number.isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function readDatetimeLocal() {
    var input = document.getElementById('mb-mission-datetime');
    var raw = input && input.value ? String(input.value).trim() : '';
    if (!raw) return null;
    var m = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0), 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function defaultDueDate() {
    var d = new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0, 0);
    return d;
  }

  function updateDatePreview() {
    var due = readDatetimeLocal();
    var preview = document.getElementById('mb-date-preview');
    if (!preview) return;
    if (!due) {
      preview.textContent = uiT('Pick a date and time', 'בחרו תאריך ושעה');
      return;
    }
    preview.textContent = uiT('Local: ', 'מקומי: ') + formatDisplayDate(due) +
      ' · UTC: ' + formatUtcDateToDo(due);
  }

  function buildDateToDoPayload() {
    var due = readDatetimeLocal();
    if (!due) return '';
    return formatUtcDateToDo(due);
  }

  function getRepeatDays() {
    var active = getActivePill('mb-repeat-pills');
    return active ? (active.getAttribute('data-repeat') || '') : '';
  }

  var MISSION_TYPE_KEYS = [
    { en: 'Follow-up call', he: 'שיחת מעקב' },
    { en: 'Send quote', he: 'שליחת הצעת מחיר' },
    { en: 'Send photos', he: 'שליחת תמונות' },
    { en: 'Other', he: 'אחר' }
  ];

  var missionStepsCache = [];

  function normalizeStepName(s) {
    return String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function missionTypeLabel(opt) {
    if (!opt) return '';
    var he = opt.getAttribute('data-label-he') || '';
    return isEn() ? String(opt.value || '').trim() : (he || String(opt.value || '').trim());
  }

  function syncMissionTitleFromType() {
    var typeSel = document.getElementById('mb-mission-type');
    var titleIn = document.getElementById('mb-mission-title');
    if (!typeSel || !titleIn) return '';
    var opt = typeSel.options[typeSel.selectedIndex];
    var label = missionTypeLabel(opt);
    titleIn.value = label;
    return label;
  }

  function findMissionsStepsId(label) {
    var needle = normalizeStepName(label);
    if (!needle) return '';
    var match = null;
    (missionStepsCache || []).forEach(function (row) {
      if (match || !row) return;
      var names = [row.name, row.name_en, row.name_he, row.title, row.step_name];
      for (var i = 0; i < names.length; i++) {
        if (normalizeStepName(names[i]) === needle) {
          match = row;
          break;
        }
      }
    });
    if (!match) return '';
    return String(match.missions_steps_id || match.id || match.data_id || '').trim();
  }

  async function loadMissionSteps() {
    missionStepsCache = [];
    try {
      if (window.MineralBarApp && typeof MineralBarApp.listMissionSteps === 'function') {
        var listed = await MineralBarApp.listMissionSteps({ limit: 25 });
        missionStepsCache = (listed && (listed.rows || listed.data)) || [];
      } else if (window.MineralBarApp && MineralBarApp.getClient) {
        var client = MineralBarApp.getClient();
        var res = await client.request('Mission.StepsList', { limit: 25 }).catch(function () {
          return client.request('MissionSteps.List', { limit: 25 }).catch(function () { return null; });
        });
        missionStepsCache = (res && (res.data || res.rows || res.list)) || [];
      }
      if (!Array.isArray(missionStepsCache)) missionStepsCache = [];
    } catch (e) {
      console.warn('[MissionCreate] Mission.StepsList failed', e);
      missionStepsCache = [];
    }
  }

  function localizeMissionTypeOptions() {
    var typeSel = document.getElementById('mb-mission-type');
    if (!typeSel) return;
    Array.prototype.slice.call(typeSel.options).forEach(function (opt) {
      if (!opt.value) {
        opt.textContent = uiT('Choose type', 'בחרו סוג');
        return;
      }
      var he = opt.getAttribute('data-label-he') || opt.value;
      opt.textContent = isEn() ? opt.value : he;
    });
  }

  function showStatus(kind, text) {
    var el = document.getElementById('mb-mission-status');
    if (!el) return;
    if (!text) {
      el.style.display = 'none';
      el.innerHTML = '';
      return;
    }
    var bg = kind === 'error' ? '#fbeeed' : (kind === 'ok' ? '#e6f4ec' : '#eaf2fb');
    var border = kind === 'error' ? '#f0c9c4' : (kind === 'ok' ? '#cce8d6' : '#c9daf0');
    var color = kind === 'error' ? '#7a2e28' : (kind === 'ok' ? '#1f5c3f' : '#1d60a2');
    el.style.display = 'block';
    el.innerHTML =
      '<div style="background:' + bg + ';border:1px solid ' + border + ';border-radius:12px;padding:11px 12px;margin-bottom:12px;">' +
      '<pre style="margin:0;white-space:pre-wrap;word-break:break-word;font:600 12px/1.5 Heebo,sans-serif;color:' + color + ';">' +
      esc(text) +
      '</pre></div>';
  }

  function setActivePill(container, selected) {
    if (!container) return;
    qsa('.mb-pill', container).forEach(function (pill) {
      pill.classList.toggle('active', pill === selected);
    });
  }

  function getActivePill(containerId) {
    return qs('#' + containerId + ' .mb-pill.active');
  }

  var PRIORITY_API_COLORS = {
    low: 'green',
    regular: 'yellow',
    urgent: 'red'
  };

  function getSelectedPriority() {
    var active = getActivePill('mb-priority-pills');
    var key = active ? String(active.getAttribute('data-priority') || '').trim() : '';
    return PRIORITY_API_COLORS[key] ? key : 'regular';
  }

  function priorityFromApiColor(value) {
    var raw = String(value == null ? '' : value).trim().toLowerCase();
    if (!raw || raw === 'default' || raw === 'transparent') return 'regular';
    if (raw === 'yellow' || raw === 'blue' || raw === '#f59e0b' || raw === '#eab308' || raw === '#f1c40f' ||
        raw.indexOf('yellow') !== -1) return 'regular';
    if (raw === 'red' || raw === '#ef4444' || raw === '#c0392b' || raw.indexOf('red') !== -1) return 'urgent';
    if (raw === 'green' || raw === '#22c55e' || raw === '#2e8a63' || raw.indexOf('green') !== -1) return 'low';
    if (/urgent|high|דחוף|גבוה/i.test(raw)) return 'urgent';
    if (/\blow\b|נמוכ/i.test(raw)) return 'low';
    if (/regular|normal|medium|רגיל|בינוני/i.test(raw)) return 'regular';
    return 'regular';
  }

  function selectPriority(priority) {
    var container = document.getElementById('mb-priority-pills');
    if (!container) return;
    var pill = qs('.mb-pill[data-priority="' + priority + '"]', container);
    if (pill) setActivePill(container, pill);
  }

  function updatePriorityLabels() {
    var isEnglish = isEn();
    var title = document.getElementById('mb-priority-label');
    var low = document.querySelector('.mb-priority-low-label');
    var regular = document.querySelector('.mb-priority-regular-label');
    var urgent = document.querySelector('.mb-priority-urgent-label');
    if (title) title.textContent = isEnglish ? 'Priority' : 'עדיפות';
    if (low) low.textContent = isEnglish ? 'Low' : 'נמוך';
    if (regular) regular.textContent = isEnglish ? 'Regular' : 'רגיל';
    if (urgent) urgent.textContent = isEnglish ? 'Urgent' : 'דחוף';
  }

  function wirePriorityPills() {
    var container = document.getElementById('mb-priority-pills');
    if (!container || container.dataset.wired) return;
    container.dataset.wired = 'true';
    qsa('.mb-pill', container).forEach(function (pill) {
      pill.addEventListener('click', function () {
        setActivePill(container, pill);
      });
    });
    updatePriorityLabels();
  }

  function wireSchedulePills() {
    var container = document.getElementById('mb-repeat-pills');
    if (container && !container.dataset.wired) {
      container.dataset.wired = 'true';
      qsa('.mb-pill', container).forEach(function (pill) {
        pill.addEventListener('click', function () {
          if (pill.classList.contains('active')) pill.classList.remove('active');
          else setActivePill(container, pill);
        });
      });
    }

    var dateIn = document.getElementById('mb-mission-datetime');
    if (dateIn && !dateIn.dataset.wired) {
      dateIn.dataset.wired = 'true';
      dateIn.addEventListener('change', updateDatePreview);
      dateIn.addEventListener('input', updateDatePreview);
      if (!dateIn.value) dateIn.value = toDatetimeLocalValue(defaultDueDate());
    }
    updateDatePreview();
  }

  function selectRepeatMode(mode) {
    var container = document.getElementById('mb-repeat-pills');
    if (!container || !mode) return;
    var pill = qs('.mb-pill[data-repeat="' + mode + '"]', container);
    if (pill) setActivePill(container, pill);
  }

  function applyLoadedSchedule(m) {
    var dueRaw = m.date_to_do_format || m.date_to_do || '';
    var dueStr = String(dueRaw).toLowerCase().trim();
    var dateIn = document.getElementById('mb-mission-datetime');
    if (!dateIn) return;

    var due = null;
    if (dueStr === 'today') due = new Date();
    else if (dueStr === 'tomorrow') {
      due = new Date();
      due.setDate(due.getDate() + 1);
    } else if (dueStr === 'next_week') {
      due = new Date();
      due.setDate(due.getDate() + 7);
    } else if (dueRaw) {
      due = parseUtcDateTime(dueRaw) || new Date(dueRaw);
    }
    if (!due || Number.isNaN(due.getTime())) due = defaultDueDate();
    due.setSeconds(0, 0);
    dateIn.value = toDatetimeLocalValue(due);

    if (m.repeat_days) selectRepeatMode(String(m.repeat_days).toLowerCase());
    updateDatePreview();
  }

  function applyLoadedMissionType(m) {
    var typeSel = document.getElementById('mb-mission-type');
    var titleIn = document.getElementById('mb-mission-title');
    var noteIn = document.getElementById('mb-mission-note');
    if (!typeSel) return;

    var missionText = String((m && (m.mission || m.title)) || '').trim();
    var noteText = String((m && (m.note || m.description)) || '').trim();
    var matched = '';
    MISSION_TYPE_KEYS.forEach(function (row) {
      if (matched) return;
      if (normalizeStepName(missionText) === normalizeStepName(row.en) ||
          normalizeStepName(missionText) === normalizeStepName(row.he)) {
        matched = row.en;
      }
    });
    if (matched) typeSel.value = matched;
    else if (missionText) {
      typeSel.value = 'Other';
      if (noteIn && !noteText) noteIn.value = missionText;
    }
    syncMissionTitleFromType();
    if (titleIn && typeSel.value) titleIn.value = missionTypeLabel(typeSel.options[typeSel.selectedIndex]);
  }

  function wireMissionType() {
    var typeSel = document.getElementById('mb-mission-type');
    if (!typeSel || typeSel.dataset.wired) return;
    typeSel.dataset.wired = 'true';
    localizeMissionTypeOptions();
    typeSel.addEventListener('change', function () { syncMissionTitleFromType(); });
  }

  function normalizeColumnValue(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.indexOf('p_') === 0) return raw.slice(2);
    return raw;
  }

  var _columnsFetchPromise = null;
  var _columnsRawRows = null;
  var _columnsRawOrder = null;

  async function fetchProjectColumnsRaw() {
    if (_columnsRawRows) return { rows: _columnsRawRows, order: _columnsRawOrder || [] };
    if (_columnsFetchPromise) return _columnsFetchPromise;
    _columnsFetchPromise = (async function () {
      var client = MineralBarApp.getClient ? MineralBarApp.getClient() : null;
      if (!client || !client.getToken || !client.getToken()) {
        return { rows: [], order: [] };
      }
      var res = await client.request('Projects.ColumnsList', { limit: 25 });
      var rows = (res && (res.data || res.output || res.rows || res.list)) || [];
      if (!Array.isArray(rows)) rows = [];
      var order = Array.isArray(res && res.order) ? res.order : [];
      _columnsRawRows = rows;
      _columnsRawOrder = order;
      return { rows: rows, order: order };
    })().catch(function (e) {
      _columnsFetchPromise = null;
      throw e;
    });
    return _columnsFetchPromise;
  }

  async function loadProjectColumns(selectedValue) {
    var select = document.getElementById('mb-project-column');
    if (!select) return;
    var preferred = selectedValue != null ? String(selectedValue) : String(select.value || '');
    select.disabled = true;
    try {
      var packed = await fetchProjectColumnsRaw();
      var rows = (packed && packed.rows) || [];
      var order = (packed && packed.order) || [];
      if (order.length) {
        rows = rows.slice().sort(function (a, b) {
          var aKey = a.column_name || a.id || '';
          var bKey = b.column_name || b.id || '';
          var ai = order.indexOf(aKey);
          var bi = order.indexOf(bKey);
          if (ai === -1 && bi === -1) return 0;
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        });
      }

      select.innerHTML = '';
      var placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = isEn() ? 'Select column' : 'בחר עמודה';
      select.appendChild(placeholder);

      rows.forEach(function (row) {
        var columnName = row.column_name || '';
        var value = normalizeColumnValue(columnName) || String(row.id || row.data_id || '');
        var label = isEn()
          ? (row.name_en || row.name_he || value)
          : (row.name_he || row.name_en || value);
        if (!value || !label) return;
        var option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        option.setAttribute('data-column-name', columnName);
        select.appendChild(option);
      });

      if (preferred) {
        var preferredNorm = normalizeColumnValue(preferred);
        var matched = Array.prototype.slice.call(select.options).find(function (opt) {
          return opt.value === preferred ||
            opt.value === preferredNorm ||
            normalizeColumnValue(opt.getAttribute('data-column-name')) === preferredNorm;
        });
        if (matched) select.value = matched.value;
      }
      if (!select.value) {
        var todo = Array.prototype.slice.call(select.options).find(function (opt) {
          return opt.value === 'to_do';
        });
        if (todo) select.value = 'to_do';
      }
      select.setAttribute('data-last-value', String(select.value || ''));
    } catch (e) {
      console.error('[mission-create] Projects.ColumnsList failed', e);
      select.innerHTML = '';
      var failed = document.createElement('option');
      failed.value = '';
      failed.textContent = isEn() ? 'Unable to load columns' : 'לא ניתן לטעון עמודות';
      select.appendChild(failed);
    } finally {
      select.disabled = false;
    }
  }

  async function populateDropdowns() {
    var assignSel = document.getElementById('mb-mission-assignee');
    if (assignSel) {
      var team = (window.MineralBarApp && MineralBarApp.getTeamMembers()) || [];
      var meEmail = ((window.MineralBarApp && MineralBarApp.getEmail()) || '').toLowerCase();
      var me = team.find(function (t) {
        return String(t.email || '').toLowerCase() === meEmail;
      }) || team[0];
      
      assignSel.innerHTML = '';
      if (!team.length) {
        var opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Me';
        assignSel.appendChild(opt);
      } else {
        team.forEach(function (t) {
          var opt = document.createElement('option');
          opt.value = String(t.id);
          var label = (t.name || t.email || ('#' + t.id));
          if (me && String(t.id) === String(me.id)) label += ' (Me)';
          opt.textContent = label;
          assignSel.appendChild(opt);
        });
        if (me) assignSel.value = String(me.id);
      }
    }

    var custSel = document.getElementById('mb-customer-name');
    if (custSel) {
      try {
        var res = await MineralBarApp.listCustomers({ length: 100, start: 0, draw: 1 }).catch(function() { return { rows: [] }; });
        var rows = (res && (res.rows || res.data || (Array.isArray(res) ? res : []))) || [];
        custSel.innerHTML = '<option value="">Choose Customer</option>';
        rows.forEach(function(c) {
          var cid = c.customer_id || c.contactus_id || c.id || '';
          var cname = c.name || c.customer_name || c.full_name || ('Customer #' + cid);
          if (cid) {
            var opt = document.createElement('option');
            opt.value = String(cid);
            opt.textContent = cname + (c.phone ? ' (' + c.phone + ')' : '');
            custSel.appendChild(opt);
          }
        });

        var urlCid = getQueryParam('customer_id') || getQueryParam('cust_id') || getQueryParam('id') || getQueryParam('contactus_id') || '';
        if (urlCid) {
          custSel.value = String(urlCid);
          var matchedOpt = Array.prototype.slice.call(custSel.options).find(function(opt) { return opt.value === String(urlCid); });
          var linkedEl = document.getElementById('mb-linked-customer');
          var nameEl = document.getElementById('mb-linked-name');
          var metaEl = document.getElementById('mb-linked-meta');
          var avEl = document.getElementById('mb-linked-av');
          if (linkedEl && nameEl) {
            var cname = getQueryParam('name') || (matchedOpt ? matchedOpt.textContent.split(' (')[0] : 'Linked Customer');
            var cphone = getQueryParam('phone') || '';
            nameEl.textContent = cname;
            if (metaEl) {
              metaEl.textContent = cphone ? (cphone + ' · Linked ID: ' + urlCid) : ('Linked ID: ' + urlCid);
            }
            if (avEl) {
              var p = String(cname).trim().split(/\s+/).filter(Boolean);
              var initials = p.length > 1 ? ((p[0][0] || '') + (p[1][0] || '')).toUpperCase() : p.length === 1 ? p[0].slice(0, 2).toUpperCase() : '?';
              avEl.textContent = initials;
            }
            linkedEl.style.display = 'flex';
          }
        }

        if (window.MineralBarCustomerSearch && typeof MineralBarCustomerSearch.enhance === 'function') {
          MineralBarCustomerSearch.enhance(custSel, {
            emptyLabel: 'Choose Customer',
            placeholder: (typeof window.mbT === 'function')
              ? window.mbT('Search customer by name or phone…', 'חיפוש לקוח לפי שם או טלפון…')
              : 'Search customer by name or phone…'
          });
        }
      } catch(e) {
        console.warn('Could not populate customer dropdown', e);
      }
    }

    var projSel = document.getElementById('mb-project-name');
    if (projSel) {
      try {
        var resP = await MineralBarApp.listProjects().catch(function() { return { rows: [] }; });
        var pRows = (resP && (resP.rows || resP.data || resP.projects || (Array.isArray(resP) ? resP : []))) || [];
        projSel.innerHTML = '<option value="">— Choose Project —</option>';
        pRows.forEach(function(p) {
          var pid = p.project_id || p.id || '';
          var pname = p.name || p.project_name || p.title || ('Project #' + pid);
          if (pid && /^\d+$/.test(String(pid))) {
            var opt = document.createElement('option');
            opt.value = String(pid);
            opt.textContent = pname;
            projSel.appendChild(opt);
          }
        });
      } catch(e) {
        console.warn('Could not populate project dropdown', e);
      }
    }

    await loadProjectColumns();
  }

  function getQueryParam(key) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split('=');
      if (decodeURIComponent(pair[0]) === key) {
        return decodeURIComponent(pair[1] || '');
      }
    }
    return null;
  }

  /** Return to the screen the user entered from (not always tasks). */
  function getDefaultHomeUrl() {
    try {
      var role = window.MineralBarApp && MineralBarApp.getRole && MineralBarApp.getRole();
      if (role === 'service') return 'service-all-calls.html';
      if (role === 'tech') return 'tech-dashboard.html';
    } catch (e) { /* ignore */ }
    return 'sales-home.html';
  }

  function getBackUrlFromReferrer() {
    try {
      var ref = document.referrer;
      if (!ref) return '';
      var u = new URL(ref, window.location.href);
      if (u.origin !== window.location.origin) return '';
      var file = (u.pathname.split('/').pop() || '').trim();
      if (!file || /^(service-create-task|login)(\.html)?$/i.test(file)) return '';
      return file + (u.search || '');
    } catch (e) {
      return '';
    }
  }

  function safeTaskBackHref(raw) {
    if (typeof window.mbSafeBackHref === 'function') return window.mbSafeBackHref(raw);
    raw = String(raw || '').trim();
    if (!raw || /^javascript:/i.test(raw) || raw.indexOf('..') >= 0) return '';
    return raw.replace(/^\//, '');
  }

  function customerCardUrl(kind) {
    var q = new URLSearchParams(window.location.search || '');
    var cid = q.get('customer_id') || q.get('cust_id') || '';
    var page = kind === 'lead' ? 'lead-card.html' : 'service-customer-card.html';
    if (!cid) return page;
    return page + '?customer_id=' + encodeURIComponent(cid) + '&cust_id=' + encodeURIComponent(cid);
  }

  function chatBackUrl() {
    var q = new URLSearchParams(window.location.search || '');
    var cid = q.get('customer_id') || q.get('cust_id');
    var chatQ = new URLSearchParams();
    if (cid) {
      chatQ.set('customer_id', cid);
      chatQ.set('cust_id', cid);
    }
    var name = q.get('name');
    var phone = q.get('phone');
    var email = q.get('email');
    if (name) chatQ.set('name', name);
    if (phone) chatQ.set('phone', phone);
    if (email) chatQ.set('email', email);
    var qs = chatQ.toString();
    return qs ? ('chat-customer.html?' + qs) : 'calls-list.html';
  }

  function getExplicitBackUrl() {
    var q = new URLSearchParams(window.location.search || '');
    var safe = safeTaskBackHref(q.get('back') || q.get('return') || '');
    if (safe && /\.html/i.test(safe) && !/service-create-task/i.test(safe)) return safe;
    var rawFrom = String(q.get('from') || '').trim();
    if (rawFrom && /\.html/i.test(rawFrom)) {
      safe = safeTaskBackHref(rawFrom);
      if (safe && !/service-create-task/i.test(safe)) return safe;
    }
    return '';
  }

  function getBackUrl() {
    var explicit = getExplicitBackUrl();
    if (explicit) return explicit;

    var q = new URLSearchParams(window.location.search || '');
    var from = String(q.get('from') || '').trim().toLowerCase();

    if (from === 'home' || from === 'sales-home' || from === 'sales-home.html' || from === 'main') {
      return 'sales-home.html';
    }
    if (from === 'tasks' || from === 'sales-tasks' || from === 'sales-tasks.html') {
      return 'sales-tasks.html';
    }
    if (from === 'lead' || from === 'lead-card' || from === 'lead-card.html') {
      return customerCardUrl('lead');
    }
    if (from === 'leads' || from === 'leads-list' || from === 'leads-list.html') {
      return 'leads-list.html';
    }
    if (from === 'customer' || from === 'customer-card' || from === 'service-customer-card' || from === 'service-customer-card.html') {
      return customerCardUrl('customer');
    }
    if (from === 'customers' || from === 'customers.html') {
      return 'customers.html';
    }
    if (from === 'calls' || from === 'calls-list' || from === 'calls-list.html') {
      return 'calls-list.html';
    }
    if (from === 'service' || from === 'service-all-calls') {
      return 'service-all-calls.html';
    }
    if (from === 'messages' || from === 'chat' || from === 'chat-customer') {
      return chatBackUrl();
    }

    var fromRef = getBackUrlFromReferrer();
    if (fromRef) return fromRef;

    return getDefaultHomeUrl();
  }

  function syncCreateTaskActiveTab() {
    if (!document.body) return;
    var q = new URLSearchParams(window.location.search || '');
    var from = String(q.get('from') || '').toLowerCase();
    var back = String(q.get('back') || q.get('return') || '').toLowerCase();
    var tab = 'tasks';
    if (from === 'lead' || from === 'leads' || /lead-card|leads-list/.test(back)) tab = 'leads';
    else if (from === 'customer' || from === 'customers' || /service-customer-card|customers\.html/.test(back)) tab = 'customers';
    else if (from === 'home' || from === 'main' || /sales-home/.test(back)) tab = 'main';
    else if (from === 'messages' || from === 'chat' || /chat-customer|calls-list/.test(back)) tab = 'messages';
    else if (from === 'service' || /service-all-calls/.test(back)) tab = 'service';
    else if (from === 'tasks' || /sales-tasks/.test(back)) tab = 'tasks';
    var prev = document.body.getAttribute('data-active-tab') || '';
    document.body.setAttribute('data-active-tab', tab);
    if (prev !== tab) {
      var existing = document.getElementById('common-app-footer');
      if (existing) existing.remove();
      if (typeof window.ensureCommonFooter === 'function') window.ensureCommonFooter();
    }
  }

  function goBackToEntryScreen() {
    window.location.href = getBackUrl();
  }

  function isMissionDone(mission) {
    if (!mission) return false;
    if (mission.is_done || Number(mission.done) === 1 || Number(mission.is_complete) === 1) return true;
    var col = String(
      mission.project_column || mission.status || mission.mission_status ||
      mission.state || mission.status_name || ''
    ).toLowerCase();
    return col === 'completed' || col === 'complete' || col === 'done' || col === 'closed' ||
      col === 'col_done' || col === 'col_completed' ||
      col === 'בוצע' || col === 'הושלם' || col === 'סגור';
  }

  function setDoneHeaderState(alreadyDone) {
    var doneBtn = document.getElementById('mb-btn-mark-done');
    var doneBadge = document.getElementById('mb-task-done-badge');
    var doneLabel = uiT('Close task', 'סגור משימה');
    if (doneBtn) {
      doneBtn.textContent = doneLabel;
      doneBtn.style.display = alreadyDone ? 'none' : 'inline-flex';
    }
    if (doneBadge) {
      doneBadge.textContent = uiT('Done', 'בוצע');
      doneBadge.style.display = alreadyDone ? 'inline-flex' : 'none';
    }
  }

  function wireMarkDone() {
    var doneBtn = document.getElementById('mb-btn-mark-done');
    if (!doneBtn || doneBtn.dataset.wired === '1') return;
    doneBtn.dataset.wired = '1';
    doneBtn.addEventListener('click', async function () {
      var closeId = editingMissionId || getQueryParam('mission_id') || getQueryParam('id');
      if (!closeId) {
        showStatus('error', uiT('Failed to close task', 'סגירת משימה נכשלה') + ': missing id');
        return;
      }
      var doneLabel = uiT('Close task', 'סגור משימה');
      doneBtn.disabled = true;
      doneBtn.textContent = uiT('Closing…', 'סוגר…');
      showStatus('loading', uiT('Closing task…', 'סוגר משימה…'));
      window.__mbClosingMission = true;
      try {
        if (window.MineralBarApp && MineralBarApp.doneMission) {
          await MineralBarApp.doneMission(closeId);
        } else {
          await MineralBarApp.getClient().request('Mission.Done', { id: closeId, mission_id: closeId });
        }
        setDoneHeaderState(true);
        showStatus('ok', uiT('Task is Done', 'המשימה בוצעה'));
        try { sessionStorage.setItem('mb_missions_dirty', '1'); } catch (eDirty) { /* ignore */ }
        window.location.href = 'sales-tasks.html?type=done_tasks';
      } catch (err) {
        window.__mbClosingMission = false;
        console.error('[mission-create] Mission.Done failed', err);
        showStatus('error', uiT('Failed to close task', 'סגירת משימה נכשלה') + ': ' + ((err && err.message) || err));
        doneBtn.disabled = false;
        doneBtn.textContent = doneLabel;
      }
    });
  }

  function wireBackNavigation() {
    var closeBtn = document.getElementById('mb-mission-close');
    if (!closeBtn) return;
    closeBtn.setAttribute('href', getBackUrl());
    if (closeBtn.dataset.backWired === '1') return;
    closeBtn.dataset.backWired = '1';
    closeBtn.addEventListener('click', function (e) {
      e.preventDefault();
      goBackToEntryScreen();
    });
  }

  /** Existing task: Status / Column change → Mission.Update immediately (no Save). */
  function wireProjectColumnLiveUpdate() {
    var select = document.getElementById('mb-project-column');
    if (!select || select.dataset.liveWired === '1') return;
    select.dataset.liveWired = '1';
    select.addEventListener('change', async function () {
      if (!editingMissionId) return;
      var value = String(select.value || '').trim();
      if (!value) return;
      var prev = String(select.getAttribute('data-last-value') || '');
      if (value === prev) return;
      select.disabled = true;
      showStatus('loading', isEn() ? 'Updating status…' : 'מעדכן סטטוס…');
      try {
        await MineralBarApp.updateMission({
          id: editingMissionId,
          mission_id: editingMissionId,
          filed: 'project_column',
          saveoutput: value
        });
        if (loadedMissionData) loadedMissionData.project_column = value;
        select.setAttribute('data-last-value', value);
        showStatus('ok', isEn() ? 'Status updated' : 'הסטטוס עודכן');
      } catch (err) {
        console.error('[mission-create] project_column live update failed', err);
        if (prev) select.value = prev;
        showStatus('error', (err && err.message) || (isEn() ? 'Status update failed' : 'עדכון סטטוס נכשל'));
      } finally {
        select.disabled = false;
      }
    });
  }

  var editingMissionId = getQueryParam('mission_id') || getQueryParam('id');

  async function loadExistingMission() {
    if (!editingMissionId) return;

    var headerTitle = document.getElementById('mb-form-header-title');
    if (headerTitle) headerTitle.textContent = 'Edit task';
    setDoneHeaderState(false);

    var submitBtn = document.getElementById('mb-create-mission');
    if (submitBtn) submitBtn.textContent = 'Update task';

    showStatus('loading', 'Loading task details…');

    try {
      var res = await MineralBarApp.getMission(editingMissionId);
      var m = (res && res.mission) || res;
      loadedMissionData = Object.assign({}, m || {});
      if (m && m.date_to_do_format) loadedMissionData.date_to_do = m.date_to_do_format;
      showStatus('none');

      if (!m) return;

      var titleIn = document.getElementById('mb-mission-title');
      var noteIn = document.getElementById('mb-mission-note');
      var assignSel = document.getElementById('mb-mission-assignee');
      var custSel = document.getElementById('mb-customer-name');
      var projectSel = document.getElementById('mb-project-name');
      var columnSel = document.getElementById('mb-project-column');
      var stepSel = document.getElementById('mb-mission-step');
      var privateCb = document.getElementById('mb-task-private');

      var fullTitle = m.mission || m.title || '';
      var note = m.note || m.description || '';
      if (noteIn) noteIn.value = note;
      applyLoadedMissionType(m);
      if (titleIn && !titleIn.value && fullTitle) titleIn.value = fullTitle;
      applyLoadedSchedule(m);

      // 4. Customer
      var cid = m.customer_id || m.lead_id || m.contactus_id;
      var cname = m.customer_name || m.client_name;
      if (custSel && cid) {
        var exists = Array.prototype.slice.call(custSel.options).some(function(opt) {
          return String(opt.value) === String(cid);
        });
        if (!exists) {
          var opt = document.createElement('option');
          opt.value = String(cid);
          opt.textContent = (cname || ('Customer #' + cid));
          custSel.appendChild(opt);
        }
        custSel.value = String(cid);
        if (custSel._mbCustCombo && typeof custSel._mbCustCombo.sync === 'function') {
          custSel._mbCustCombo.sync();
        } else if (window.MineralBarCustomerSearch && typeof MineralBarCustomerSearch.enhance === 'function') {
          MineralBarCustomerSearch.enhance(custSel);
        }
      }
      if (cname) {
        var linkedEl = document.getElementById('mb-linked-customer');
        var nameEl = document.getElementById('mb-linked-customer-name');
        if (linkedEl && nameEl) {
          nameEl.textContent = cname;
          linkedEl.style.display = 'flex';
        }
      }

      // 5. Staff Member / Assignee
      var rawMemberId = m.member_id || (m.members && m.members[0]) || m.user_id || m.create_by;
      if (typeof rawMemberId === 'string' && rawMemberId.startsWith('[')) {
        try {
          var parsed = JSON.parse(rawMemberId);
          if (Array.isArray(parsed) && parsed.length) rawMemberId = parsed[0];
        } catch(e) {}
      }
      if (assignSel && rawMemberId) {
        assignSel.value = String(rawMemberId);
      }

      // 6. Project & Column
      var projectId = m.project_id || (/^\d+$/.test(String(m.project || '')) ? m.project : '');
      var projectName = m.project_name || (!projectId ? m.project : '');
      if (projectSel && (projectId || projectName)) {
        var matchedProject = Array.prototype.slice.call(projectSel.options).find(function(opt) {
          return (projectId && String(opt.value) === String(projectId)) ||
            (projectName && String(opt.textContent) === String(projectName));
        });
        if (!matchedProject && projectId) {
          var optP = document.createElement('option');
          optP.value = String(projectId);
          optP.textContent = projectName || ('Project #' + projectId);
          projectSel.appendChild(optP);
          matchedProject = optP;
        }
        if (matchedProject) projectSel.value = matchedProject.value;
      }

      if (columnSel && m.project_column) {
        await loadProjectColumns(m.project_column);
      }

      // Mission.Update writes missions_steps_id, so it wins over the read-only step_id.
      var stepVal = m.missions_steps_id || m.step_id;
      if (stepSel && stepVal && Number(stepVal) > 0) {
        var stepStr = String(stepVal);
        var stepExists = Array.prototype.slice.call(stepSel.options).some(function(opt) {
          return String(opt.value) === stepStr;
        });
        if (!stepExists) {
          var optS = document.createElement('option');
          optS.value = stepStr;
          optS.textContent = m.step_name_en || m.step_name_he || ('Step ' + stepStr);
          stepSel.appendChild(optS);
        }
        stepSel.value = stepStr;
      }

      // 7. Priority
      selectPriority(priorityFromApiColor(m.color || m.priority || m.appoinment_color1));

      // 8. Private Checkbox
      if (privateCb) {
        privateCb.checked = Boolean(m.private || Number(m.private_mission) === 1);
      }
      setDoneHeaderState(isMissionDone(m));

      // 9. Advanced Checkboxes
      var emailMeCb = document.getElementById('mb-email-me');
      if (emailMeCb) emailMeCb.checked = Number(m.email_me_employee) === 1 || m.email_me_employee === true || m.email_me_employee === '1';

      var waCb = document.getElementById('mb-whatsapp-reminder');
      if (waCb) waCb.checked = Number(m.whatsApp_reminder) === 1 || m.whatsApp_reminder === true || m.whatsApp_reminder === '1';

      var notifyCb = document.getElementById('mb-notify-client');
      if (notifyCb) notifyCb.checked = Number(m.notify_client) === 1 || m.notify_client === true || m.notify_client === '1';

      var templateCb = document.getElementById('mb-use-template');
      if (templateCb) {
        var templateValue = m.use_as_template != null ? m.use_as_template : m.client_create;
        templateCb.checked = Number(templateValue) === 1 || templateValue === true || templateValue === '1';
      }

      // 10. Recording link is stored in mission.meta.
      loadedMissionMeta = m.meta || '';
      var recVal = MineralBarApp.parseRecordingFromMeta
        ? MineralBarApp.parseRecordingFromMeta(loadedMissionMeta)
        : (m.recording_link || '');
      var recIn = document.getElementById('mb-recording-link');
      if (recIn) recIn.value = recVal;

      // 11. Existing Image Pre-fill
      loadedMissionImage = m.image || '';
      existingImageUrls = MineralBarApp.parseMissionImageList
        ? MineralBarApp.parseMissionImageList(loadedMissionImage)
        : String(loadedMissionImage).split(',').map(function(src) { return src.trim(); }).filter(Boolean);
      selectedFiles = [];
      renderImagePreviews();

    } catch (e) {
      console.error('Failed to load existing mission', e);
      showStatus('error', 'Failed to load task details: ' + (e.message || e));
    }
  }

  var selectedFiles = [];
  var existingImageUrls = [];
  var loadedMissionMeta = '';
  var loadedMissionImage = '';
  var loadedMissionData = null;

  function appendImagePreview(container, src, removeHandler) {
    var card = document.createElement('div');
    card.style.cssText = 'position:relative; width:70px; height:70px; border-radius:10px; overflow:hidden; border:1px solid var(--border-panel); background:#000; flex:none;';

    var img = document.createElement('img');
    img.style.cssText = 'width:100%; height:100%; object-fit:cover; opacity:0.9;';
    img.src = src;

    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '✕';
    removeBtn.style.cssText = 'position:absolute; top:3px; right:3px; width:20px; height:20px; border-radius:50%; background:rgba(0,0,0,0.6); color:#fff; border:none; font-size:11px; cursor:pointer; display:flex; align-items:center; justify-content:center;';
    removeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      removeHandler();
    });

    card.appendChild(img);
    card.appendChild(removeBtn);
    container.appendChild(card);
  }

  function renderImagePreviews() {
    var container = document.getElementById('mb-image-previews');
    if (!container) return;
    container.innerHTML = '';

    existingImageUrls.forEach(function(src, idx) {
      var displaySrc = MineralBarApp.resolveFileUrl
        ? MineralBarApp.resolveFileUrl(src)
        : src;
      appendImagePreview(container, displaySrc, function() {
        existingImageUrls.splice(idx, 1);
        renderImagePreviews();
      });
    });

    selectedFiles.forEach(function (file, idx) {
      var objectUrl = URL.createObjectURL(file);
      appendImagePreview(container, objectUrl, function() {
        selectedFiles.splice(idx, 1);
        URL.revokeObjectURL(objectUrl);
        renderImagePreviews();
      });
    });
  }

  function handleImageFiles(files) {
    if (!files || !files.length) return;
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (!f) continue;
      var ok = (f.type && f.type.startsWith('image/')) || /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(f.name || '');
      if (!ok) continue;
      var exists = selectedFiles.some(function (existing) {
        return existing.name === f.name && existing.size === f.size && existing.lastModified === f.lastModified;
      });
      if (!exists) {
        selectedFiles.push(f);
      }
    }
    renderImagePreviews();
  }

  function wireMediaAndUploads() {
    var recordBtn = document.getElementById('mb-record-btn');
    var recLinkIn = document.getElementById('mb-recording-link');

    if (recordBtn && recLinkIn && !recordBtn.dataset.wired) {
      recordBtn.dataset.wired = 'true';
      recordBtn.addEventListener('click', function (e) {
        e.preventDefault();
        recLinkIn.focus();
        if (recLinkIn.select) recLinkIn.select();
      });
    }

    var dropZone = document.getElementById('mb-drop-zone');
    var fileInput = document.getElementById('mb-file-input');
    if (!dropZone || !fileInput) return;

    if (dropZone.__mbDropInput !== fileInput) {
      dropZone.__mbDropInput = fileInput;
      dropZone.dataset.wired = '';
    }
    if (dropZone.dataset.wired === 'true') return;
    dropZone.dataset.wired = 'true';

    fileInput.addEventListener('change', function (e) {
      e.stopPropagation();
      handleImageFiles(fileInput.files);
      try { fileInput.value = ''; } catch (err2) { /* ignore */ }
    });

    // Stop browser from opening the dropped file; capture into previews instead
    function blockOpen(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(function (name) {
      dropZone.addEventListener(name, function (e) {
        blockOpen(e);
        try { e.dataTransfer.dropEffect = 'copy'; } catch (err) { /* ignore */ }
        dropZone.style.borderColor = '#1d60a2';
        dropZone.style.background = '#eaf2fb';
      }, true);
    });

    dropZone.addEventListener('dragleave', function (e) {
      blockOpen(e);
      var related = e.relatedTarget;
      if (related && dropZone.contains(related)) return;
      dropZone.style.borderColor = '#cbd5e0';
      dropZone.style.background = '#f8fafc';
    }, true);

    dropZone.addEventListener('drop', function (e) {
      blockOpen(e);
      dropZone.style.borderColor = '#cbd5e0';
      dropZone.style.background = '#f8fafc';
      handleImageFiles(e.dataTransfer && e.dataTransfer.files);
    }, true);
  }

  async function prepareMissionImagesForCreate(customerId) {
    if (!selectedFiles.length) return existingImageUrls.join(',');
    if (!customerId) {
      var customerError = new Error('Select a customer before uploading images.');
      customerError.code = 'CUSTOMER_REQUIRED_FOR_UPLOAD';
      throw customerError;
    }

    var uploadedPaths = [];
    for (var i = 0; i < selectedFiles.length; i += 1) {
      var uploaded = await MineralBarApp.uploadCustomerFile(customerId, selectedFiles[i]);
      uploadedPaths.push(uploaded.path || uploaded.url);
    }

    var seen = Object.create(null);
    existingImageUrls = existingImageUrls.concat(uploadedPaths).filter(function(path) {
      path = String(path || '').trim();
      if (!path || seen[path]) return false;
      seen[path] = true;
      return true;
    });
    loadedMissionImage = existingImageUrls.join(',');
    selectedFiles = [];
    renderImagePreviews();
    return loadedMissionImage;
  }

  async function persistMissionMedia(missionId, customerId) {
    if (selectedFiles.length && !customerId) {
      var customerError = new Error('Select a customer before uploading images.');
      customerError.code = 'CUSTOMER_REQUIRED_FOR_UPLOAD';
      throw customerError;
    }

    var savedImages = await MineralBarApp.saveMissionImages(
      missionId,
      customerId || null,
      selectedFiles,
      existingImageUrls,
      loadedMissionImage
    );
    existingImageUrls = savedImages.paths.slice();
    loadedMissionImage = existingImageUrls.join(',');
    selectedFiles = [];
    renderImagePreviews();

    var recIn = document.getElementById('mb-recording-link');
    var recordingLink = recIn ? recIn.value.trim() : '';
    var savedRecording = await MineralBarApp.saveMissionRecording(
      missionId,
      recordingLink,
      loadedMissionMeta
    );
    loadedMissionMeta = savedRecording.meta;
  }

  function wireSubmit() {
    var submitBtn = document.getElementById('mb-create-mission');
    if (!submitBtn || submitBtn.dataset.wired) return;
    submitBtn.dataset.wired = 'true';

    if (editingMissionId) {
      submitBtn.textContent = 'Update task';
    }

    submitBtn.addEventListener('click', async function() {
      if (window.__mbMissionSaveInProgress) return;
      var titleIn = document.getElementById('mb-mission-title');
      var noteIn = document.getElementById('mb-mission-note');
      var assignSel = document.getElementById('mb-mission-assignee');
      var custSel = document.getElementById('mb-customer-name');
      var projectSel = document.getElementById('mb-project-name');
      var columnSel = document.getElementById('mb-project-column');
      var stepSel = document.getElementById('mb-mission-step');
      var privateCb = document.getElementById('mb-task-private');

      var emailMeCb = document.getElementById('mb-email-me');
      var waCb = document.getElementById('mb-whatsapp-reminder');
      var notifyCb = document.getElementById('mb-notify-client');
      var templateCb = document.getElementById('mb-use-template');

      var title = syncMissionTitleFromType() || (titleIn && titleIn.value || '').trim();
      var typeSel = document.getElementById('mb-mission-type');
      if (!title || (typeSel && !typeSel.value)) {
        showStatus('error', uiT('Please choose a mission type.', 'יש לבחור סוג משימה.'));
        if (typeSel) typeSel.focus();
        return;
      }

      var noteText = (noteIn && noteIn.value || '').trim();

      var customerId = custSel ? custSel.value : '';
      if (selectedFiles.length && !customerId) {
        showStatus('error', 'Select a customer before uploading images.');
        if (custSel) custSel.focus();
        return;
      }

      window.__mbMissionSaveInProgress = true;
      submitBtn.disabled = true;
      submitBtn.textContent = editingMissionId ? 'Updating…' : 'Saving…';
      showStatus('loading', editingMissionId ? 'Updating task…' : 'Saving task to server…');

      var saveSucceeded = false;
      var createdMissionId = null;
      try {
        var duePayload = buildDateToDoPayload();
        if (!duePayload) {
          throw new Error(uiT('Pick a date and time.', 'יש לבחור תאריך ושעה.'));
        }
        var bizDate = duePayload;

        var isPrivate = privateCb && privateCb.checked ? 1 : 0;
        var memberId = assignSel ? assignSel.value : '';
        var priorityKey = getSelectedPriority();
        var colorVal = PRIORITY_API_COLORS[priorityKey] || 'yellow';

        var projChoice = projectSel && projectSel.value ? projectSel.value : undefined;
        var stepChoice = findMissionsStepsId(title);
        if (stepSel && stepSel.value) stepChoice = String(stepSel.value);
        var repeatDays = getRepeatDays();

        var payload = {
          mission: title,
          note: noteText,
          date_to_do: bizDate,
          private_mission: isPrivate,
          priority: colorVal,
          color: colorVal,
          appoinment_color1: colorVal,
          project_column: columnSel && columnSel.value ? columnSel.value : undefined,
          organizations_user: memberId || undefined,
          customer_id: customerId || undefined,
          email_me_employee: emailMeCb && emailMeCb.checked ? 1 : 0,
          whatsApp_reminder: waCb && waCb.checked ? 1 : 0,
          notify_client: notifyCb && notifyCb.checked ? 1 : 0,
          use_as_template: templateCb && templateCb.checked ? 1 : 0
        };
        if (projChoice) payload.project_id = Number(projChoice);
        if (stepChoice) payload.missions_steps_id = stepChoice;
        // time_mission is duration only — never send it for the due clock time
        if (repeatDays) payload.repeat_days = repeatDays;

        if (editingMissionId) {
          var fields = {
            mission: title,
            note: noteText,
            date_to_do: payload.date_to_do || bizDate,
            color: colorVal,
            priority: colorVal,
            appoinment_color1: colorVal,
            project_column: payload.project_column || 'to_do',
            private_mission: isPrivate,
            project_id: projChoice ? Number(projChoice) : 0,
            step_id: stepChoice ? Number(stepChoice) : 0,
            missions_steps_id: stepChoice ? Number(stepChoice) : 0,
            notify_client: payload.notify_client,
            email_me_employee: payload.email_me_employee,
            whatsApp_reminder: payload.whatsApp_reminder,
            use_as_template: payload.use_as_template
          };
          if (customerId) fields.lead_id = customerId;
          if (memberId) fields.member_id = '[' + memberId + ']';
          await MineralBarApp.updateMissionFields(editingMissionId, fields, loadedMissionData || {});
          await persistMissionMedia(editingMissionId, customerId);
          showStatus('ok', 'Task updated successfully! Redirecting…');
        } else {
          var imageField = await prepareMissionImagesForCreate(customerId);
          if (imageField) payload.image = imageField;
          var created = await MineralBarApp.createMission(payload);
          createdMissionId = created && created.id ? created.id : null;
          if (!createdMissionId) {
            throw new Error('Task was created, but the server did not return its ID.');
          }
          try {
            await persistMissionMedia(createdMissionId, customerId);
          } catch (mediaErr) {
            console.error('Task media save failed', mediaErr);
            showStatus(
              'error',
              'Task #' + createdMissionId + ' was created, but media failed: ' +
              (mediaErr.message || mediaErr) +
              '. Open the task to retry the upload — do not create again.'
            );
            return;
          }
          showStatus('ok', 'Task created successfully! Redirecting…');
        }

        saveSucceeded = true;
        setTimeout(function() {
          window.location.href = getBackUrl();
        }, 600);
      } catch (err) {
        console.error('Task save failed', err);
        if (createdMissionId) {
          showStatus(
            'error',
            'Task #' + createdMissionId + ' already exists. ' +
            (err.message || err) +
            ' Open that task instead of creating another.'
          );
        } else {
          showStatus('error', 'Failed to save task: ' + (err.message || err));
        }
      } finally {
        if (saveSucceeded || createdMissionId) {
          // Keep disabled after create so retries cannot insert a second task.
          submitBtn.textContent = saveSucceeded
            ? (editingMissionId ? 'Updated' : 'Saved')
            : 'Created';
        } else {
          window.__mbMissionSaveInProgress = false;
          submitBtn.disabled = false;
          submitBtn.textContent = editingMissionId ? 'Update task' : 'Add a task';
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncCreateTaskActiveTab);
  } else {
    syncCreateTaskActiveTab();
  }

  var started = false;
  var _missionLoadPromise = null;
  var _missionBootAt = 0;

  async function loadExistingMissionOnce() {
    if (!editingMissionId) return;
    if (_missionLoadPromise) return _missionLoadPromise;
    _missionLoadPromise = loadExistingMission().finally(function () {
      // Allow a later explicit reload only after boot (e.g. real mission.updated)
      setTimeout(function () { _missionLoadPromise = null; }, 800);
    });
    return _missionLoadPromise;
  }

  function start() {
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    // Both mineralbar:ready and DOMContentLoaded call start(); a second run would
    // rebuild the dropdowns and wipe the values loadExistingMission() just selected.
    if (started) return;
    started = true;
    _missionBootAt = Date.now();
    syncCreateTaskActiveTab();
    wireBackNavigation();
    wireMarkDone();
    wireSchedulePills();
    wireMissionType();
    wirePriorityPills();
    wireProjectColumnLiveUpdate();
    Promise.all([populateDropdowns(), loadMissionSteps()]).then(function() {
      return loadExistingMissionOnce();
    });
    wireMediaAndUploads();
    wireSubmit();
    window.addEventListener('mineralbar:language-changed', function () {
      updatePriorityLabels();
      localizeMissionTypeOptions();
      syncMissionTitleFromType();
      loadProjectColumns(document.getElementById('mb-project-column') && document.getElementById('mb-project-column').value);
    });
  }

  window.addEventListener('mineralbar:ready', function() { setTimeout(start, 150); }, { once: true });
  if (window.MineralBarApp && MineralBarApp.isAuthenticated && MineralBarApp.isAuthenticated()) {
    setTimeout(start, 200);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(start, 200); });
  } else {
    setTimeout(start, 200);
  }

  if (window.MineralBarApp && MineralBarApp.bindLiveReload) {
    MineralBarApp.bindLiveReload(function (detail) {
      var key = String((detail && detail.key) || '').toLowerCase();
      // Skip connect nudges / empty keys — they re-fired ColumnsList + Mission.Get
      if (!key || /socket\.nudge/i.test(key)) return;
      if (_missionBootAt && (Date.now() - _missionBootAt) < 4000) return;
      if (window.__mbClosingMission) return;
      if (/mission\.(done|updated|deleted|reopened)/i.test(key) && editingMissionId) {
        loadExistingMissionOnce();
      }
    }, { keys: /mission\.(done|updated|deleted|reopened)/i, delay: 500 });
  }

})();
