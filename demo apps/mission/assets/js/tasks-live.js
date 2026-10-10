(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function priorityLabel(m, today) {
    var c = normalizeColumnValue(m && (m.project_column || m.status || ''));
    if (c === 'completed' || c === 'done' || (m && (m.is_done || Number(m.done) === 1))) {
      return { text: (window.t && window.t('col_completed')) || 'הושלם', bg: '#e6f4ec', color: '#2e8a63' };
    }
    if (c === 'in_progress') return { text: (window.t && window.t('col_in_progress')) || 'בתהליך', bg: '#eaf2fb', color: '#1d60a2' };
    
    var when = m && m.date_to_do_format ? m.date_to_do_format.split('T')[0] : '';
    if (when && when < today) return { text: (window.t && window.t('priority_urgent')) || 'דחוף', bg: '#fbeeed', color: '#c0392b' };
    return { text: (window.t && window.t('col_to_do')) || 'פתוח', bg: '#fdf1dd', color: '#bd8324' };
  }

  function isOverdue(m, today) {
    var c = normalizeColumnValue(m && (m.project_column || m.status || ''));
    if (c === 'completed' || c === 'done' || (m && (m.is_done || Number(m.done) === 1))) return false;
    var when = m && m.date_to_do_format ? m.date_to_do_format.split('T')[0] : '';
    return when && when < today;
  }

  function isUpcoming(m, today) {
    if (m.is_done || Number(m.done) === 1 ||
        m.project_column === 'done' || m.project_column === 'completed') return false;
    var when = m.date_to_do_format ? m.date_to_do_format.split('T')[0] : '';
    return !!(when && when > today);
  }

  function parseCreatedDate(m) {
    // date_created comes as "DD.MM.YYYY HH:MM:SS" from the API
    var raw = String(m.date_created || '').trim();
    if (!raw) return '';
    // "29.07.2026 10:15:44"
    var dd = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (dd) return dd[3] + '-' + dd[2].padStart(2, '0') + '-' + dd[1].padStart(2, '0');
    // ISO "2026-07-29T..."
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    return '';
  }

  function createdTimestamp(m) {
    var raw = String((m && (m.date_created || m.created_at)) || '').trim();
    if (!raw) return 0;
    var dd = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (dd) {
      return Date.UTC(
        Number(dd[3]),
        Number(dd[2]) - 1,
        Number(dd[1]),
        Number(dd[4] || 0),
        Number(dd[5] || 0),
        Number(dd[6] || 0)
      );
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      var iso = new Date(raw.indexOf('T') === -1 ? raw.replace(' ', 'T') : raw);
      if (!Number.isNaN(iso.getTime())) return iso.getTime();
    }
    var t = Date.parse(raw);
    return Number.isNaN(t) ? 0 : t;
  }

  function missionNumericId(m) {
    return Number((m && (m.mission_id != null ? m.mission_id : m.id)) || 0) || 0;
  }

  /** Newest created first — matches the date badge on each card. */
  function sortRowsByTime(rows) {
    return (rows || []).slice().sort(function (a, b) {
      var bt = createdTimestamp(b);
      var at = createdTimestamp(a);
      if (bt !== at) return bt - at;
      return missionNumericId(b) - missionNumericId(a);
    });
  }

  function formatWhen(m, today) {
    var created = parseCreatedDate(m);
    if (!created) return 'ללא תאריך';
    if (created === today) return window.t('today');
    return created.split('-').reverse().join('/');
  }

  function translateTitle(title) {
    if (!title) return '';
    var parts = title.split(' — ');
    if (parts.length > 1) {
      parts[0] = window.t(parts[0]);
      return parts.join(' — ');
    }
    var parts2 = title.split(' - ');
    if (parts2.length > 1) {
      parts2[0] = window.t(parts2[0]);
      return parts2.join(' - ');
    }
    return window.t(title);
  }

  function priorityFromMission(mission, today) {
    if (!mission) return 'none';
    if (typeof window.getMissionPriority === 'function') {
      return window.getMissionPriority(mission);
    }
    var color = String(mission.color || '').toLowerCase();
    var priority = String(mission.priority || '').toLowerCase();
    var meta = {};
    try { meta = JSON.parse(mission.meta || '{}') || {}; } catch (e) { /* ignore */ }
    var he = String(meta.priority_he || '');
    
    if (/urgent|high|דחוף|גבוה/i.test(priority) || /דחוף|גבוה/i.test(he) ||
        color === '#ef4444' || color === '#c0392b' ||
        color === '#f59e0b' || color === '#eab308' ||
        color === '#f1c40f' || color === 'yellow') return 'urgent';
    if (/low|נמוכ/i.test(priority) || /נמוכ/i.test(he) || color === '#22c55e' || color === '#2e8a63') return 'low';
    if (/normal|medium|רגיל|בינוני/i.test(priority)) return 'normal';
    
    var note = String(mission.note || '');
    if (/עדיפות:\s*urgent|priority:\s*urgent|\burgent\b/i.test(note)) return 'urgent';
    if (/עדיפות:\s*low|priority:\s*low|\blow\b/i.test(note)) return 'low';
    if (/עדיפות:\s*normal|priority:\s*normal|\bnormal\b/i.test(note)) return 'normal';

    if (isOverdue(mission, today)) return 'urgent';

    // Matches the detail popup, which treats anything unmatched as Normal.
    return 'normal';
  }

  function normalizeStatus(val) {
    var s = String(val || '').trim().toLowerCase();
    if (s.indexOf('p_') === 0) s = s.slice(2);
    if (s === 'completed' || s === 'done' || s === 'finish' || s === 'finished' || s === 'closed') return 'done';
    if (s === 'to_do' || s === 'todo' || s === 'open' || s === 'new') return 'to_do';
    if (s === 'in_progress' || s === 'progress' || s === 'doing' || s === 'process') return 'in_progress';
    if (s === 'pending_review' || s === 'pending' || s === 'review' || s === 'waiting' || s === 'testing' || s === 'queries') return 'pending_review';
    return s;
  }

  function statusFromMission(mission) {
    if (!mission) return 'to_do';
    if (mission.is_done || Number(mission.done) === 1) return 'done';
    var raw = mission.project_column || mission.status || '';
    var norm = normalizeStatus(raw);
    if (norm) return norm;
    return 'to_do';
  }

  function isEnLang() {
    if (typeof window.getLanguage === 'function') {
      return window.getLanguage() === 'en';
    }
    try {
      return (localStorage.getItem('lang') || '') === 'en';
    } catch (e) {
      return false;
    }
  }

  function normalizeColumnValue(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.indexOf('p_') === 0) return raw.slice(2);
    return raw;
  }

  var cachedProjectColumns = null;
  var cachedProjectColumnsPromise = null;

  async function getProjectColumns() {
    if (cachedProjectColumns) return cachedProjectColumns;
    if (cachedProjectColumnsPromise) return cachedProjectColumnsPromise;

    cachedProjectColumnsPromise = (async function () {
      try {
        var res;
        if (window.MineralBarApp && MineralBarApp.listProjectColumns) {
          res = await MineralBarApp.listProjectColumns({ limit: 25 });
        } else {
          var client = MineralBarApp.getClient ? MineralBarApp.getClient() : null;
          if (!client || !client.getToken || !client.getToken()) return [];
          res = await client.request('Projects.ColumnsList', { limit: 25 });
        }
        var rows = (res && (res.rows || res.data || res.output || res.list)) || [];
        if (!Array.isArray(rows)) rows = [];
        var order = Array.isArray(res && res.order) ? res.order
          : (Array.isArray(res && res.raw && res.raw.order) ? res.raw.order : []);
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
        cachedProjectColumns = rows.map(function (row) {
          var columnName = row.column_name || '';
          var value = normalizeColumnValue(columnName) || String(row.id || row.data_id || '');
          var label = isEnLang()
            ? (row.name_en || row.name_he || value)
            : (row.name_he || row.name_en || value);
          return value && label ? { value: value, label: label, columnName: columnName } : null;
        }).filter(Boolean);
        return cachedProjectColumns;
      } catch (e) {
        console.error('[tasks-live] Projects.ColumnsList failed', e);
        cachedProjectColumns = null;
        return [];
      } finally {
        cachedProjectColumnsPromise = null;
      }
    })();

    return cachedProjectColumnsPromise;
  }

  function missionRow(m, today) {
    var title = m.mission || m.title || m.name || m.mission_name || m.subject || m.task || m.note || m.description || ('Mission #' + (m.mission_id || m.id || ''));
    title = translateTitle(title);
    var customer = m.customer_name || m.client_name || '';
    var when = formatWhen(m, today);
    var desc = m.note || m.description || '';
    
    var color = String(m.color || '').toLowerCase();
    var pri = priorityFromMission(m, today);
    
    var priLabel = '--';
    var priBg = 'var(--bg-panel)';
    var priColor = 'var(--text-sub)';
    var dotColor = m.color || (isOverdue(m, today) ? '#c0392b' : '#1d60a2');

    if (pri === 'urgent') {
      priLabel = window.t ? window.t('priority_urgent') : 'Urgent';
      priBg = '#fef3c7';
      priColor = '#b45309';
      dotColor = m.color || '#ef4444';
    } else if (pri === 'low') {
      priLabel = window.t ? window.t('priority_low') : 'Low';
      priBg = '#e9f5ee';
      priColor = '#2e8a63';
      dotColor = m.color || '#22c55e';
    } else if (pri === 'normal') {
      priLabel = window.t ? window.t('priority_normal') : 'Normal';
      priBg = '#eaf2fb';
      priColor = '#1d60a2';
      dotColor = m.color || '#1d60a2';
    } else {
      priLabel = '--';
      priBg = 'var(--bg-panel)';
      priColor = 'var(--text-sub)';
      dotColor = m.color || '#1d60a2';
    }

    var groupColor = m.color || (isOverdue(m, today) ? '#c0392b' : dotColor);
    // Badge shows creation date — neutral blue always
    var badgeBg = '#eaf2fb';
    var badgeColor = '#1d60a2';

    return (
      '<div class="task-row-card" data-mission="' + esc(JSON.stringify(m)) + '" style="border-right:4px solid ' + groupColor + '; overflow:hidden; width:100%; max-width:100%; box-sizing:border-box;">' +
      '<div style="flex:1; min-width:0; overflow:hidden;">' +
      '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">' +
      '<div class="task-row-title" style="display:flex; align-items:center; gap:6px; flex:1; min-width:0; overflow:hidden;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:' + dotColor + '; flex:none;"></span><span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + esc(title) + '</span></div>' +
      '<span style="background:' + priBg + ';color:' + priColor + ';font-size:10px;font-weight:700;padding:2px 6px;border-radius:6px;flex:none;">' + esc(priLabel) + '</span>' +
      '</div>' +
      (customer ? '<div style="font-size:12.5px; font-weight:700; color:var(--text-sub); margin-top:3px; display:flex; align-items:center; gap:5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg><span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + esc(customer) + '</span></div>' : '') +
      (desc ? '<div class="task-row-desc" style="margin-top:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%;">' + esc(desc) + '</div>' : '') +
      (when
        ? '<div class="task-row-badge-container"><span class="task-row-badge" style="background:' + badgeBg + ';color:' + badgeColor + ';">' + esc(when) + '</span></div>'
        : '') +
      '</div>' +
      '</div>'
    );
  }



  var currentFilterType = 'show_all_together_tasks';
  var activeStatusFilter = 'all';
  var loadRequestId = 0;

  function setActiveMainFilter(type) {
    document.querySelectorAll('.mb-filter-chip').forEach(function (chip) {
      var on = chip.getAttribute('data-type') === type;
      chip.style.background = on ? 'var(--color-primary)' : 'var(--bg-panel)';
      chip.style.color = on ? '#fff' : 'var(--text-sub)';
      chip.style.border = on ? 'none' : '1px solid var(--border-panel)';
      chip.disabled = false;
      chip.style.opacity = '1';
    });
  }

  async function populateQuickMissionDropdowns() {
    var teamSel = document.getElementById('mb-quick-team');
    var custSel = document.getElementById('mb-quick-customer');

    // Team comes from cached User.Basic (page-boot already authenticated)
    try {
      var team = MineralBarApp.getTeamMembers() || [];
      if (!team.length && MineralBarApp.getClient) {
        var basic = await MineralBarApp.getClient().account.basic();
        try { localStorage.setItem('biz1demo_user_basic', JSON.stringify(basic)); } catch (e0) { /* ignore */ }
        team = MineralBarApp.getTeamMembers() || [];
      }

      if (teamSel) {
        var meEmail = String(MineralBarApp.getEmail() || '').toLowerCase();
        var me = team.find(function (t) {
          return String(t.email || '').toLowerCase() === meEmail;
        }) || team[0];
        teamSel.innerHTML = '';
        if (!team.length) {
          var o = document.createElement('option');
          o.value = '';
          o.textContent = (window.t && window.t('no_member')) || 'No member';
          teamSel.appendChild(o);
        } else {
          team.forEach(function (t) {
            var opt = document.createElement('option');
            opt.value = String(t.id);
            var label = String(t.name || t.email || ('#' + t.id)).trim();
            if (me && String(t.id) === String(me.id)) {
              label += ' · ' + ((window.t && window.t('me_label')) || 'Me');
            }
            opt.textContent = label;
            teamSel.appendChild(opt);
          });
          if (me) teamSel.value = String(me.id);
        }
      }
    } catch (teamErr) {
      console.warn('[Quick] team load failed', teamErr);
    }

    if (!custSel) return;
    custSel.innerHTML = '';
    var loading = document.createElement('option');
    loading.value = '';
    loading.textContent = (window.t && window.t('loading_customers')) || 'Loading customers…';
    custSel.appendChild(loading);

    try {
      // Live Customer.List from logged-in account (no folder = all visible)
      // NOTE: Customer.List rejects unknown params like include_counts (throws → empty dropdown)
      var res = await MineralBarApp.listCustomers({ length: 25, start: 0 });
      var rows = (res && res.rows) || [];
      if (!rows.length && res && res.raw) {
        rows = res.raw.data || res.raw.rows || [];
      }
      if (!rows.length) {
        // folders 1 (leads) + 2 (customers)
        var a = await MineralBarApp.listCustomers(1, { length: 25, start: 0 }).catch(function () { return { rows: [] }; });
        var b = await MineralBarApp.listCustomers(2, { length: 25, start: 0 }).catch(function () { return { rows: [] }; });
        var seen = Object.create(null);
        rows = [];
        (a.rows || []).concat(b.rows || []).forEach(function (c) {
          var id = String(c.customer_id || c.id || '');
          if (!id || seen[id]) return;
          seen[id] = true;
          rows.push(c);
        });
      }

      custSel.innerHTML = '';
      var ph = document.createElement('option');
      ph.value = '';
      var tr = window.t ? window.t('choose_customer') : '';
      ph.textContent = (tr && tr !== 'choose_customer') ? tr : 'Choose Customer';
      custSel.appendChild(ph);

      rows.forEach(function (c) {
        var cid = c.customer_id || c.contactus_id || c.id || '';
        if (!cid) return;
        var cname = c.name || c.customer_name || c.full_name || ('#' + cid);
        var phone = c.mobile || c.phone || '';
        var opt = document.createElement('option');
        opt.value = String(cid);
        opt.textContent = phone ? (cname + ' · ' + phone) : cname;
        custSel.appendChild(opt);
      });

      if (rows.length === 1) custSel.value = String(rows[0].customer_id || rows[0].id);
      console.log('[Quick] live customers loaded:', rows.length);
    } catch (e) {
      console.warn('[Quick] customer load failed', e);
      custSel.innerHTML = '';
      var errOpt = document.createElement('option');
      errOpt.value = '';
      errOpt.textContent = (window.t && window.t('choose_customer')) || 'Choose Customer';
      custSel.appendChild(errOpt);
    }
  }

  function wireQuickMission() {
    var submitBtn = document.getElementById('mb-quick-submit');
    if (!submitBtn || submitBtn.dataset.wired) return;
    submitBtn.dataset.wired = 'true';

    submitBtn.addEventListener('click', async function() {
      var detailIn = document.getElementById('mb-quick-detail');
      var teamSel = document.getElementById('mb-quick-team');
      var custSel = document.getElementById('mb-quick-customer');
      var msgEl = document.getElementById('mb-quick-msg');

      var title = (detailIn && detailIn.value || '').trim();
      if (!title) {
        if (msgEl) {
          msgEl.style.display = 'block';
          msgEl.style.color = '#c0392b';
          msgEl.textContent = (window.t && window.t('enter_task_detail')) || 'Please enter task detail.';
        }
        if (detailIn) detailIn.focus();
        return;
      }

      var prevBtnLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = (window.t && window.t('creating')) || 'Creating…';
      if (msgEl) msgEl.style.display = 'none';

      try {
        var memberId = teamSel ? String(teamSel.value || '').trim() : '';
        var customerId = custSel ? String(custSel.value || '').trim() : '';

        // Live API rejects date_to_do="today" on this account — send real UTC datetime
        var now = new Date();
        function pad(n) { return n < 10 ? '0' + n : String(n); }
        var dateToDo = now.getUTCFullYear() + '-' + pad(now.getUTCMonth() + 1) + '-' + pad(now.getUTCDate()) +
          ' ' + pad(now.getUTCHours()) + ':' + pad(now.getUTCMinutes()) + ':' + pad(now.getUTCSeconds());

        var payload = {
          title: title,
          mission: title,
          note: title,
          date_to_do: dateToDo
        };
        if (memberId) payload.organizations_user = memberId;
        if (customerId) payload.customer_id = customerId;

        var res = await MineralBarApp.createMission(payload);

        if (msgEl) {
          msgEl.style.display = 'block';
          msgEl.style.color = '#2e8a63';
          msgEl.textContent = ((window.t && window.t('quick_mission_ok')) || 'Quick mission added successfully') + (res && res.id ? (' #' + res.id) : '');
        }
        if (detailIn) detailIn.value = '';

        loadTasks(currentFilterType || 'show_all_together_tasks');
      } catch (err) {
        console.error('Quick Mission create failed', err);
        if (msgEl) {
          msgEl.style.display = 'block';
          msgEl.style.color = '#c0392b';
          msgEl.textContent = ((window.t && window.t('quick_mission_fail')) || 'Failed to create quick mission') + ': ' + (err.message || err);
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = prevBtnLabel || ((window.t && window.t('quick_mission_btn')) || 'Quick mission');
      }
    });
  }

  function wireFilterChips() {
    var chips = document.querySelectorAll('.mb-filter-chip');
    chips.forEach(function(chip) {
      if (chip.dataset.wired) return;
      chip.dataset.wired = 'true';
      chip.addEventListener('click', function() {
        var type = this.getAttribute('data-type') || 'show_all_together_tasks';
        currentFilterType = type;
        activeStatusFilter = 'all';
        var filterBtn = document.getElementById('task-filter-btn');
        if (filterBtn) {
          filterBtn.style.borderColor = 'var(--border-panel)';
          filterBtn.style.color = 'var(--text-sub)';
          filterBtn.style.background = 'var(--bg-form)';
        }
        setActiveMainFilter(type);
        chip.disabled = true;
        chip.style.opacity = '0.75';
        loadTasks(currentFilterType);
      });
    });
  }

  async function loadTasks(typeParam) {
    var filterType = typeParam || currentFilterType || 'show_all_together_tasks';
    // The visible date badge is Created At, so Today must use date_created too.
    // Fetch the complete open set and apply that date filter locally.
    var localDateFilter = filterType === 'today_tasks' ||
      filterType === 'priority_tasks' ||
      filterType === 'upcoming_tasks';
    var apiFilterType = localDateFilter
      ? 'show_all_together_tasks'
      : filterType;
    var requestId = ++loadRequestId;
    try {
      var missionsPromise = MineralBarApp.listMissions({
        type: apiFilterType,
        length: 25,
        start: 0,
        draw: 1,
        include_counts: 1,
        order_by: 'date_created',
        order_dir: 'desc',
        sort: 'date_created_desc'
      });
      // The API's "All" response contains open tasks only. Fetch completed
      // tasks separately so the All view matches the Kanban board.
      var donePromise = filterType === 'show_all_together_tasks'
        ? MineralBarApp.listMissions({
            type: 'done_tasks',
            length: 25,
            start: 0,
            draw: 1,
            include_counts: 1,
            order_by: 'date_created',
            order_dir: 'desc',
            sort: 'date_created_desc'
          })
        : Promise.resolve(null);
      var columnsPromise = getProjectColumns();
      var loaded = await Promise.all([missionsPromise, columnsPromise, donePromise]);
      var result = loaded[0];
      var projectColumns = loaded[1];
      var doneResult = loaded[2];
      // A slower, older request must never overwrite the latest selected tab.
      if (requestId !== loadRequestId) return;
      setActiveMainFilter(filterType);
      var today = todayKey();
      var seenIds = Object.create(null);

      var rawGroups = (result && result.groups) || [];
      var flatRows = (result && (result.rows || result.data || result.output)) || [];

      // If flat rows are present but groups is empty, wrap flatRows into a group
      if (!rawGroups.length && flatRows.length) {
        rawGroups = [{
          id: filterType === 'done_tasks' ? 'done' : 'all',
          label: filterType === 'done_tasks' ? (window.t ? window.t('filter_done') : 'בוצעו') : (window.t ? window.t('tasks') : 'משימות'),
          rows: flatRows,
          total: flatRows.length
        }];
      } else if (filterType === 'done_tasks') {
        var doneGroup = rawGroups.find(function(g) { return g.id === 'done' || g.key === 'done_tasks'; });
        if (!doneGroup && flatRows.length) {
          rawGroups = [{
            id: 'done',
            label: window.t ? window.t('filter_done') : 'בוצעו',
            rows: flatRows,
            total: flatRows.length
          }];
        }
      }

      if (filterType === 'done_tasks') {
        rawGroups.forEach(function(g) {
          g.id = 'done';
          (g.rows || []).forEach(function(m) {
            m.is_done = 1;
            m.done = 1;
            m.project_column = 'completed';
          });
        });
      }

      // Put completed tasks in their own group when All is selected.
      if (filterType === 'show_all_together_tasks' && doneResult) {
        var doneRows = (doneResult.rows || doneResult.data || doneResult.output || []).slice();
        if (!doneRows.length && doneResult.groups) {
          doneResult.groups.forEach(function (group) {
            doneRows = doneRows.concat(group.rows || []);
          });
        }
        doneRows.forEach(function (task) {
          task.is_done = 1;
          task.done = 1;
          if (!task.project_column || task.project_column === 'to_do') task.project_column = 'completed';
        });
        if (doneRows.length) {
          rawGroups.push({
            id: 'done',
            label: window.t ? window.t('filter_done') : 'Completed',
            rows: doneRows,
            total: doneRows.length
          });
        }
      }

      var groups = rawGroups.map(function (g) {
        var rows = (g.rows || []).filter(function (m) {
          if (filterType === 'today_tasks' && parseCreatedDate(m) !== today) {
            return false;
          }
          if (filterType === 'priority_tasks' && !isOverdue(m, today)) {
            return false;
          }
          if (filterType === 'upcoming_tasks' && !isUpcoming(m, today)) {
            return false;
          }
          var id = String((m && (m.mission_id != null ? m.mission_id : m.id)) || '');
          if (!id) return true;
          if (seenIds[id]) return false;
          seenIds[id] = true;
          return true;
        });
        rows = sortRowsByTime(rows);
        return Object.assign({}, g, { rows: rows, total: rows.length });
      }).filter(function (g) { return g.rows && g.rows.length; });
      
      var totalEl = document.getElementById('mb-missions-total');
      if (totalEl) {
        var total = Object.keys(seenIds).length || result.total || 0;
        totalEl.textContent = total
          ? (total + ' ' + ((window.t && window.t('tasks_count_suffix')) || 'tasks'))
          : ('0 ' + ((window.t && window.t('tasks_count_suffix')) || 'tasks'));
      }
      
      var html = '';
      groups.forEach(function(g, idx) {
        if (!g.rows || !g.rows.length) return;
        var groupColor = '#1d60a2';
        var gId = g.id || ('group_' + idx);
        var labelMap = {
          overdue: 'late',
          today: 'today',
          upcoming: 'filter_upcoming',
          done: 'filter_done'
        };
        var labelKey = labelMap[gId] || (g.label === 'משימות' || g.label === 'משימה' ? 'tasks' : '');
        var labelStr = esc(
          labelKey && window.t ? window.t(labelKey)
            : (g.label === 'משימות' && window.t ? window.t('tasks') : g.label)
        );
        
        html += '<div class="task-group-container" data-group-id="' + esc(gId) + '" style="margin-bottom:24px;">';
        html += '<div class="task-group-header">' +
                '<span class="task-group-dot" style="background:' + groupColor + ';"></span>' +
                '<span class="task-group-title">' + labelStr + '</span>' +
                '<span class="task-group-count">• ' + g.total + '</span>' +
                '</div>';
        html += g.rows.map(function(m) { return missionRow(m, today); }).join('');
        html += '</div>';
      });
      
      var filterOptions = document.getElementById('task-filter-options');
      if (filterOptions) {
        var optionsHtml = '';

        // Category 1: Main View Filters (All, Today, Priority, Upcoming, Done)
        var isAllActive = (currentFilterType === 'show_all_together_tasks' && (activeStatusFilter === 'all' || activeStatusFilter === 'main_all'));
        var isTodayActive = (currentFilterType === 'today_tasks' || activeStatusFilter === 'main_today');
        var isPriorityActive = (currentFilterType === 'priority_tasks' || activeStatusFilter === 'main_priority');
        var isUpcomingActive = (currentFilterType === 'upcoming_tasks' || activeStatusFilter === 'main_upcoming');
        var isDoneActive = (currentFilterType === 'done_tasks' || activeStatusFilter === 'main_done');

        optionsHtml += '<div class="filter-category-title">' + (window.t ? (window.t('tasks') || 'TASKS') : 'TASKS') + '</div>';
        optionsHtml += '<div class="filter-options-group">';
        optionsHtml += '<div class="filter-option' + (isAllActive ? ' is-active' : '') + '" data-val="main_all">' + (window.t ? window.t('filter_all') : 'All') + '</div>';
        optionsHtml += '<div class="filter-option' + (isTodayActive ? ' is-active' : '') + '" data-val="main_today">' + (window.t ? window.t('filter_today') : 'Today') + '</div>';
        optionsHtml += '<div class="filter-option' + (isPriorityActive ? ' is-active' : '') + '" data-val="main_priority">' + (window.t ? window.t('filter_priority') : 'Priority') + '</div>';
        optionsHtml += '<div class="filter-option' + (isUpcomingActive ? ' is-active' : '') + '" data-val="main_upcoming">' + (window.t ? window.t('filter_upcoming') : 'Upcoming') + '</div>';
        optionsHtml += '<div class="filter-option' + (isDoneActive ? ' is-active' : '') + '" data-val="main_done">' + (window.t ? window.t('filter_done') : 'Done') + '</div>';
        optionsHtml += '</div>';

        // Category 2: Status columns
        if (projectColumns && projectColumns.length) {
          optionsHtml += '<div class="filter-category-title">' + (window.t ? (window.t('status_label') || 'STATUS') : 'STATUS') + '</div>';
          optionsHtml += '<div class="filter-options-group">';
          projectColumns.forEach(function (col) {
            var valKey = 'status_' + col.value;
            var isActive = (activeStatusFilter === valKey);
            optionsHtml += '<div class="filter-option' + (isActive ? ' is-active' : '') + '" data-val="' + esc(valKey) + '">' +
              esc(col.label) + '</div>';
          });
          optionsHtml += '</div>';
        }

        // Category 3: Priority
        optionsHtml += '<div class="filter-category-title">' + (window.t ? (window.t('priority_label') || 'PRIORITY') : 'PRIORITY') + '</div>';
        optionsHtml += '<div class="filter-options-group">';
        optionsHtml += '<div class="filter-option' + (activeStatusFilter === 'priority_urgent' ? ' is-active' : '') + '" data-val="priority_urgent">' + (window.t ? window.t('priority_urgent') : 'Urgent') + '</div>';
        optionsHtml += '<div class="filter-option' + (activeStatusFilter === 'priority_normal' ? ' is-active' : '') + '" data-val="priority_normal">' + (window.t ? window.t('priority_normal') : 'Normal') + '</div>';
        optionsHtml += '<div class="filter-option' + (activeStatusFilter === 'priority_low' ? ' is-active' : '') + '" data-val="priority_low">' + (window.t ? window.t('priority_low') : 'Low') + '</div>';
        optionsHtml += '</div>';

        filterOptions.innerHTML = optionsHtml;

        var filterBtn = document.getElementById('task-filter-btn');
        if (filterBtn) {
          var isFiltered = !isAllActive;
          filterBtn.style.borderColor = isFiltered ? 'var(--color-primary)' : 'var(--border-panel)';
          filterBtn.style.color = isFiltered ? 'var(--color-primary)' : 'var(--text-sub)';
          filterBtn.style.background = isFiltered ? 'var(--color-primary-soft)' : 'var(--bg-form)';
        }

        var opts = filterOptions.querySelectorAll('.filter-option');
        opts.forEach(function(opt) {
          opt.addEventListener('click', async function() {
            var val = this.getAttribute('data-val');
            activeStatusFilter = val;

            opts.forEach(function(o) {
              if (o.getAttribute('data-val') === val) {
                o.classList.add('is-active');
              } else {
                o.classList.remove('is-active');
              }
            });

            var filterBtn = document.getElementById('task-filter-btn');
            if (filterBtn) {
              var isFiltered = (val !== 'all' && val !== 'main_all');
              filterBtn.style.borderColor = isFiltered ? 'var(--color-primary)' : 'var(--border-panel)';
              filterBtn.style.color = isFiltered ? 'var(--color-primary)' : 'var(--text-sub)';
              filterBtn.style.background = isFiltered ? 'var(--color-primary-soft)' : 'var(--bg-form)';
            }

            if (val === 'main_all' || val === 'all') {
              currentFilterType = 'show_all_together_tasks';
              activeStatusFilter = 'all';
              await loadTasks('show_all_together_tasks');
              document.getElementById('task-filter-panel').style.display = 'none';
              return;
            }

            if (val === 'main_today') {
              currentFilterType = 'today_tasks';
              activeStatusFilter = 'main_today';
              await loadTasks('today_tasks');
              document.getElementById('task-filter-panel').style.display = 'none';
              return;
            }

            if (val === 'main_priority') {
              currentFilterType = 'priority_tasks';
              activeStatusFilter = 'main_priority';
              await loadTasks('priority_tasks');
              document.getElementById('task-filter-panel').style.display = 'none';
              return;
            }

            if (val === 'main_upcoming') {
              currentFilterType = 'upcoming_tasks';
              activeStatusFilter = 'main_upcoming';
              await loadTasks('upcoming_tasks');
              document.getElementById('task-filter-panel').style.display = 'none';
              return;
            }

            if (val === 'main_done') {
              currentFilterType = 'done_tasks';
              activeStatusFilter = 'main_done';
              await loadTasks('done_tasks');
              document.getElementById('task-filter-panel').style.display = 'none';
              return;
            }

            var statusVal = val.indexOf('status_') === 0 ? val.slice('status_'.length) : '';
            var normTarget = normalizeStatus(statusVal);

            // If user clicked Done / Completed in the status modal:
            if (normTarget === 'done') {
              currentFilterType = 'done_tasks';
              activeStatusFilter = 'main_done';
              await loadTasks('done_tasks');
              document.getElementById('task-filter-panel').style.display = 'none';
              return;
            }

            // If user was on done_tasks and picked an open status:
            if (currentFilterType === 'done_tasks') {
              currentFilterType = 'show_all_together_tasks';
              await loadTasks('show_all_together_tasks');
            }

            var containers = document.querySelectorAll('.task-group-container');
            var td = todayKey();
            containers.forEach(function(c) {
              var hasVisible = false;
              c.querySelectorAll('.task-row-card').forEach(function(row) {
                var m = {};
                try { m = JSON.parse(row.getAttribute('data-mission') || '{}'); } catch(e) {}
                var show = false;

                if (val.startsWith('priority_')) {
                  var pri = priorityFromMission(m, td);
                  show = (val === 'priority_' + pri);
                } else if (statusVal) {
                  var mStatus = statusFromMission(m);
                  show = (mStatus === normTarget) || (normalizeColumnValue(m.project_column || m.status || '').toLowerCase() === statusVal.toLowerCase());
                }

                row.style.display = show ? 'block' : 'none';
                if (show) hasVisible = true;
              });
              c.style.display = hasVisible ? 'block' : 'none';
            });
            document.getElementById('task-filter-panel').style.display = 'none';
          });
        });
      }
      
      if (!html) {
        html = '<div style="text-align:center; padding:40px 20px; color:var(--text-sub); font-weight:600;">' +
          esc((window.t && window.t('no_tasks_found')) || 'No tasks found.') + '</div>';
      }
      
      var mount = document.getElementById('mb-live-tasks');
      if (mount) {
        mount.innerHTML = html;
        
        // Attach click listeners to rows
        var rows = mount.querySelectorAll('.task-row-card');
        rows.forEach(function(row) {
          row.addEventListener('click', function() {
            var data = {};
            try { data = JSON.parse(row.getAttribute('data-mission') || '{}'); } catch(e) {}
            openTaskDetail(data);
          });
        });
      }
    } catch (err) {
      if (requestId !== loadRequestId) return;
      setActiveMainFilter(filterType);
      console.error(err);
    }
  }

  var started = false;
  function start() {
    if (started) return;
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    if (!document.getElementById('mb-live-tasks')) return;
    started = true;
    if (window.setGreeting) window.setGreeting();
    wireFilterChips();
    populateQuickMissionDropdowns();
    wireQuickMission();
    loadTasks(currentFilterType || 'show_all_together_tasks');

    // One channel only — mineralbar:realtime + mineralbar:missions used to double-fetch
    window.addEventListener('mineralbar:missions', function (e) {
      console.log('[Socket Realtime] Mission event:', e.detail);
      clearTimeout(window.__mbTasksRtTimer);
      window.__mbTasksRtTimer = setTimeout(function () {
        loadTasks(currentFilterType);
        var list = document.getElementById('mb-live-tasks');
        if (list && window.Biz1Pulse) window.Biz1Pulse(list);
      }, 400);
    });
    
    var closeBtn = document.getElementById('close-task-panel');
    if (closeBtn && !closeBtn.dataset.wired) {
      closeBtn.dataset.wired = 'true';
      closeBtn.addEventListener('click', function() {
        document.getElementById('task-detail-panel').style.display = 'none';
      });
    }
    
    var filterBtn = document.getElementById('task-filter-btn');
    if (filterBtn && !filterBtn.dataset.wired) {
      filterBtn.dataset.wired = 'true';
      filterBtn.addEventListener('click', function() {
        document.getElementById('task-filter-panel').style.display = 'flex';
      });
    }
    
    var closeFilterBtn = document.getElementById('close-filter-panel');
    if (closeFilterBtn && !closeFilterBtn.dataset.wired) {
      closeFilterBtn.dataset.wired = 'true';
      closeFilterBtn.addEventListener('click', function() {
        document.getElementById('task-filter-panel').style.display = 'none';
      });
    }

    var filterPanel = document.getElementById('task-filter-panel');
    if (filterPanel && !filterPanel.dataset.backdropWired) {
      filterPanel.dataset.backdropWired = 'true';
      filterPanel.addEventListener('click', function(e) {
        if (e.target === filterPanel) {
          filterPanel.style.display = 'none';
        }
      });
    }
  }

  window.addEventListener('mineralbar:ready', function () { setTimeout(start, 150); });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 200); });
  } else {
    setTimeout(start, 200);
  }
})();
