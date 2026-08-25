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
    var c = m.project_column || 'to_do';
    if (c === 'completed') return { text: 'הושלם', bg: '#e6f4ec', color: '#2e8a63' };
    if (c === 'in_progress') return { text: 'בתהליך', bg: '#eaf2fb', color: '#1d60a2' };
    
    var when = m.date_to_do_format ? m.date_to_do_format.split('T')[0] : '';
    if (when && when < today) return { text: 'דחוף', bg: '#fbeeed', color: '#c0392b' };
    return { text: 'פתוח', bg: '#fdf1dd', color: '#bd8324' };
  }

  function isOverdue(m, today) {
    if (m.project_column === 'completed') return false;
    var when = m.date_to_do_format ? m.date_to_do_format.split('T')[0] : '';
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

  function statusFromMission(mission) {
    var col = normalizeColumnValue(mission && (mission.project_column || mission.status || ''));
    if (col) return col;
    if (mission && (mission.is_done || Number(mission.done) === 1)) return 'completed';
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
    var title = m.mission || m.title || ('Mission #' + (m.mission_id || m.id || ''));
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
        if (memberId) {
          payload.member_id = [Number(memberId) || memberId];
          payload.organizations_user = memberId;
          payload.assigned_to = memberId;
        }
        if (customerId) {
          payload.customer_id = customerId;
        }

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
        include_counts: 1
      });
      var columnsPromise = getProjectColumns();
      var result = await missionsPromise;
      var projectColumns = await columnsPromise;
      // A slower, older request must never overwrite the latest selected tab.
      if (requestId !== loadRequestId) return;
      setActiveMainFilter(filterType);
      var today = todayKey();
      var seenIds = Object.create(null);
      var groups = (result.groups || []).map(function (g) {
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
        var headerStyle = 'font-size:14px; font-weight:800; color:#788596; margin-bottom:12px; display:block;';
        var flexStyle = 'display:flex; flex-wrap:wrap; gap:10px; margin-bottom:24px;';
        var chipStyle = 'padding:9px 18px; border:1px solid #e4e8ee; border-radius:99px; font-size:13.5px; font-weight:700; color:#5a6473; cursor:pointer; background:#fff; white-space:nowrap;';
        
        var optionsHtml = '<div style="' + flexStyle + '">';
        optionsHtml += '<div class="filter-option" data-val="all" style="' + chipStyle + '">' + (window.t ? window.t('all') : 'All') + '</div>';
        optionsHtml += '</div>';
        
        optionsHtml += '<div style="' + headerStyle + '">TIME</div>';
        optionsHtml += '<div style="' + flexStyle + '">';
        optionsHtml += '<div class="filter-option" data-val="filter_today" style="' + chipStyle + '">' + (window.t ? window.t('tasks_for_today') : 'Today') + '</div>';
        optionsHtml += '</div>';
        
        optionsHtml += '<div style="' + headerStyle + '">PRIORITY</div>';
        optionsHtml += '<div style="' + flexStyle + '">';
        optionsHtml += '<div class="filter-option" data-val="priority_urgent" style="' + chipStyle + '">' + (window.t ? window.t('priority_urgent') : 'Urgent') + '</div>';
        optionsHtml += '<div class="filter-option" data-val="priority_normal" style="' + chipStyle + '">' + (window.t ? window.t('priority_normal') : 'Normal') + '</div>';
        optionsHtml += '<div class="filter-option" data-val="priority_low" style="' + chipStyle + '">' + (window.t ? window.t('priority_low') : 'Low') + '</div>';
        optionsHtml += '</div>';

        optionsHtml += '<div style="' + headerStyle + '">STATUS</div>';
        optionsHtml += '<div style="' + flexStyle + '">';
        if (projectColumns && projectColumns.length) {
          projectColumns.forEach(function (col) {
            optionsHtml += '<div class="filter-option" data-val="status_' + esc(col.value) + '" style="' + chipStyle + '">' +
              esc(col.label) + '</div>';
          });
        } else {
          optionsHtml += '<div style="font-size:13px; font-weight:600; color:#94a3b8;">' +
            esc((window.t && window.t('unable_load_columns')) || 'Unable to load columns') +
            '</div>';
        }
        optionsHtml += '</div>';
        
        filterOptions.innerHTML = optionsHtml;
        
        var opts = filterOptions.querySelectorAll('.filter-option');
        opts.forEach(function(opt) {
          opt.addEventListener('click', function() {
            var val = this.getAttribute('data-val');
            var containers = document.querySelectorAll('.task-group-container');

            if (val === 'all') {
              containers.forEach(function(c) {
                c.style.display = 'block';
                c.querySelectorAll('.task-row-card').forEach(function(row) {
                  row.style.display = 'block';
                });
              });
            } else {
              var td = todayKey();
              var statusVal = val.indexOf('status_') === 0 ? val.slice('status_'.length) : '';
              containers.forEach(function(c) {
                var hasVisible = false;
                c.querySelectorAll('.task-row-card').forEach(function(row) {
                  var m = {};
                  try { m = JSON.parse(row.getAttribute('data-mission') || '{}'); } catch(e) {}
                  var show = false;

                  if (val === 'filter_today') {
                    show = (parseCreatedDate(m) === td);
                  } else if (val.startsWith('priority_')) {
                    var pri = priorityFromMission(m, td);
                    show = (val === 'priority_' + pri);
                  } else if (statusVal) {
                    show = statusFromMission(m) === statusVal;
                  }

                  row.style.display = show ? 'block' : 'none';
                  if (show) hasVisible = true;
                });
                c.style.display = hasVisible ? 'block' : 'none';
              });
            }
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
      filterBtn.addEventListener('click', async function() {
        // Advanced filters always start from the complete open-task set.
        if (currentFilterType !== 'show_all_together_tasks') {
          currentFilterType = 'show_all_together_tasks';
          setActiveMainFilter(currentFilterType);
          await loadTasks(currentFilterType);
        }
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
  }

  window.addEventListener('mineralbar:ready', function () { setTimeout(start, 150); });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 200); });
  } else {
    setTimeout(start, 200);
  }
})();
