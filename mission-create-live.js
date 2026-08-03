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

  function todayParts() {
    var d = new Date();
    return {
      date: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()),
      time: pad(d.getHours()) + ':' + pad(d.getMinutes())
    };
  }

  function isEn() {
    return typeof window.getCurrentLanguage === 'function'
      ? window.getCurrentLanguage() === 'en'
      : true;
  }

  function formatDisplayDate(d) {
    if (!d || Number.isNaN(d.getTime())) return '—';
    return pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + d.getFullYear() +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function formatDateToDoPayload(d) {
    // Same format shown in the UI preview: DD-MM-YYYY HH:mm
    return formatDisplayDate(d);
  }

  function addDays(base, days) {
    var d = new Date(base.getTime());
    d.setDate(d.getDate() + days);
    return d;
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

  function resolveDueDate() {
    var now = new Date();
    now.setSeconds(0, 0);
    var active = getActivePill('mb-duration-pills');
    var mode = active ? active.getAttribute('data-duration') : 'today';
    var chooseWrap = document.getElementById('mb-choose-date-wrap');
    if (chooseWrap) chooseWrap.style.display = mode === 'choose_date' ? 'block' : 'none';

    if (mode === 'tomorrow') return addDays(now, 1);
    if (mode === 'next_week') return addDays(now, 7);
    if (mode === 'choose_date') {
      var dateIn = document.getElementById('mb-mission-date');
      if (dateIn && dateIn.value) {
        var parts = dateIn.value.split('-').map(Number);
        return new Date(parts[0], parts[1] - 1, parts[2], now.getHours(), now.getMinutes(), 0, 0);
      }
      return now;
    }
    if (mode === 'days_after') {
      var daysIn = document.getElementById('mb-duration-days');
      var n = Number(daysIn && daysIn.value ? daysIn.value : 0);
      return addDays(now, n > 0 ? n : 0);
    }
    return now;
  }

  function updateDatePreview() {
    var preview = document.getElementById('mb-date-preview');
    if (!preview) return;
    preview.textContent = 'Date to do: ' + formatDisplayDate(resolveDueDate());
  }

  function buildDateToDoPayload() {
    // Always send the concrete preview date (e.g. 01-08-2026 10:25), never today/tomorrow keywords.
    return formatDateToDoPayload(resolveDueDate());
  }

  function buildTimeMissionPayload() {
    var active = getActivePill('mb-time-pills');
    var mode = active ? active.getAttribute('data-time') : '30min';
    if (mode === '30min') return { time_mission: '30min' };
    if (mode === '1h') return { time_mission: '1h', time_mission_hours: 1 };
    if (mode === '2h') return { time_mission: '2h', time_mission_hours: 2 };
    if (mode === 'custom_hours') {
      var hoursIn = document.getElementById('mb-time-hours');
      var hours = Number(hoursIn && hoursIn.value ? hoursIn.value : 0);
      if (hours > 0) return { time_mission: hours + 'h', time_mission_hours: hours };
    }
    if (mode === 'custom_days') {
      var daysIn = document.getElementById('mb-time-days');
      var days = Number(daysIn && daysIn.value ? daysIn.value : 0);
      if (days > 0) return { time_mission: days + 'd', time_mission_days: days };
    }
    return { time_mission: '30min' };
  }

  function getRepeatDays() {
    var active = getActivePill('mb-repeat-pills');
    return active ? (active.getAttribute('data-repeat') || '') : '';
  }

  function wireSchedulePills() {
    function wireGroup(containerId, onSelect) {
      var container = document.getElementById(containerId);
      if (!container || container.dataset.wired) return;
      container.dataset.wired = 'true';
      qsa('.mb-pill', container).forEach(function (pill) {
        pill.addEventListener('click', function (e) {
          if (e.target && e.target.tagName === 'INPUT') {
            setActivePill(container, pill);
            onSelect(pill);
            return;
          }
          setActivePill(container, pill);
          onSelect(pill);
        });
        var input = pill.querySelector('input');
        if (input) {
          input.addEventListener('focus', function () {
            setActivePill(container, pill);
            onSelect(pill);
          });
          input.addEventListener('input', function () {
            setActivePill(container, pill);
            onSelect(pill);
          });
        }
      });
    }

    wireGroup('mb-time-pills', updateDatePreview);
    wireGroup('mb-duration-pills', updateDatePreview);
    wireGroup('mb-repeat-pills', function () {});

    var dateIn = document.getElementById('mb-mission-date');
    if (dateIn && !dateIn.dataset.wired) {
      dateIn.dataset.wired = 'true';
      dateIn.addEventListener('change', updateDatePreview);
      if (!dateIn.value) dateIn.value = todayParts().date;
    }
    updateDatePreview();
  }

  function selectDurationMode(mode, extra) {
    var container = document.getElementById('mb-duration-pills');
    if (!container) return;
    var pill = qs('.mb-pill[data-duration="' + mode + '"]', container);
    if (!pill) return;
    setActivePill(container, pill);
    if (mode === 'days_after' && extra != null) {
      var daysIn = document.getElementById('mb-duration-days');
      if (daysIn) daysIn.value = String(extra);
    }
    if (mode === 'choose_date' && extra) {
      var dateIn = document.getElementById('mb-mission-date');
      if (dateIn) dateIn.value = extra;
    }
    updateDatePreview();
  }

  function selectTimeMode(mode, extra) {
    var container = document.getElementById('mb-time-pills');
    if (!container) return;
    var pill = qs('.mb-pill[data-time="' + mode + '"]', container);
    if (!pill) return;
    setActivePill(container, pill);
    if (mode === 'custom_hours' && extra != null) {
      var hoursIn = document.getElementById('mb-time-hours');
      if (hoursIn) hoursIn.value = String(extra);
    }
    if (mode === 'custom_days' && extra != null) {
      var daysIn = document.getElementById('mb-time-days');
      if (daysIn) daysIn.value = String(extra);
    }
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
    if (dueStr === 'today' || dueStr === 'tomorrow' || dueStr === 'next_week') {
      selectDurationMode(dueStr);
    } else if (m.days_after_ads) {
      selectDurationMode('days_after', m.days_after_ads);
    } else if (dueRaw) {
      var localDue = new Date(m.date_to_do_format || dueRaw);
      if (!Number.isNaN(localDue.getTime())) {
        selectDurationMode(
          'choose_date',
          localDue.getFullYear() + '-' + pad(localDue.getMonth() + 1) + '-' + pad(localDue.getDate())
        );
      }
    }

    var timeVal = String(m.time_mission || m.time || '').toLowerCase();
    if (timeVal === '30min' || timeVal === '30') selectTimeMode('30min');
    else if (timeVal === '1h' || timeVal === '1hour' || Number(m.time_mission_hours) === 1) selectTimeMode('1h');
    else if (timeVal === '2h' || timeVal === '2hour' || Number(m.time_mission_hours) === 2) selectTimeMode('2h');
    else if (m.time_mission_hours) selectTimeMode('custom_hours', m.time_mission_hours);
    else if (m.time_mission_days) selectTimeMode('custom_days', m.time_mission_days);
    else if (/^\d+h$/.test(timeVal)) selectTimeMode('custom_hours', parseInt(timeVal, 10));
    else if (/^\d+d$/.test(timeVal)) selectTimeMode('custom_days', parseInt(timeVal, 10));

    if (m.repeat_days) selectRepeatMode(String(m.repeat_days).toLowerCase());
    updateDatePreview();
  }

  function normalizeColumnValue(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.indexOf('p_') === 0) return raw.slice(2);
    return raw;
  }

  async function loadProjectColumns(selectedValue) {
    var select = document.getElementById('mb-project-column');
    if (!select) return;
    var preferred = selectedValue != null ? String(selectedValue) : String(select.value || '');
    select.disabled = true;
    try {
      var client = MineralBarApp.getClient ? MineralBarApp.getClient() : null;
      if (!client || !client.getToken || !client.getToken()) return;
      var res = await client.request('Projects.ColumnsList', { limit: 25 });
      var rows = (res && (res.data || res.output || res.rows || res.list)) || [];
      if (!Array.isArray(rows)) rows = [];
      var order = Array.isArray(res && res.order) ? res.order : [];
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
        var res = await MineralBarApp.listCustomers().catch(function() { return { rows: [] }; });
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

  var editingMissionId = getQueryParam('mission_id') || getQueryParam('id');

  async function loadExistingMission() {
    if (!editingMissionId) return;

    var headerTitle = document.getElementById('mb-form-header-title');
    if (headerTitle) headerTitle.textContent = 'Edit task';

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
      var colorSel = document.getElementById('mb-choose-color');
      var projectSel = document.getElementById('mb-project-name');
      var columnSel = document.getElementById('mb-project-column');
      var stepSel = document.getElementById('mb-mission-step');
      var privateCb = document.getElementById('mb-task-private');

      var fullTitle = m.mission || m.title || '';
      var note = m.note || m.description || '';
      if (titleIn) titleIn.value = fullTitle;
      if (noteIn) noteIn.value = note;
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

      // 7. Color
      if (colorSel && m.color) {
        colorSel.value = String(m.color);
      }

      // 8. Private Checkbox
      if (privateCb) {
        privateCb.checked = Boolean(m.private || Number(m.private_mission) === 1);
      }

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
      var colorSel = document.getElementById('mb-choose-color');
      var projectSel = document.getElementById('mb-project-name');
      var columnSel = document.getElementById('mb-project-column');
      var stepSel = document.getElementById('mb-mission-step');
      var privateCb = document.getElementById('mb-task-private');

      var emailMeCb = document.getElementById('mb-email-me');
      var waCb = document.getElementById('mb-whatsapp-reminder');
      var notifyCb = document.getElementById('mb-notify-client');
      var templateCb = document.getElementById('mb-use-template');

      var title = (titleIn && titleIn.value || '').trim();
      if (!title) {
        showStatus('error', 'Please enter task description.');
        if (titleIn) titleIn.focus();
        return;
      }

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
        var timePayload = buildTimeMissionPayload();
        var bizDate = duePayload;

        var isPrivate = privateCb && privateCb.checked ? 1 : 0;
        var memberId = assignSel ? assignSel.value : '';
        var colorVal = (colorSel && colorSel.value) ? colorSel.value : 'yellow';
        if (colorVal === 'default') colorVal = 'transparent';

        var projChoice = projectSel && projectSel.value ? projectSel.value : undefined;
        var stepChoice = stepSel && stepSel.value ? Number(stepSel.value) : 0;
        var repeatDays = getRepeatDays();

        var payload = {
          mission: title,
          note: (noteIn && noteIn.value) || title,
          date_to_do: bizDate,
          private_mission: isPrivate,
          color: colorVal,
          appoinment_color1: colorVal,
          project_id: projChoice ? Number(projChoice) : undefined,
          project_column: columnSel && columnSel.value ? columnSel.value : undefined,
          missions_steps_id: stepChoice || undefined,
          organizations_user: memberId || undefined,
          customer_id: customerId || undefined,
          email_me_employee: emailMeCb && emailMeCb.checked ? 1 : 0,
          whatsApp_reminder: waCb && waCb.checked ? 1 : 0,
          notify_client: notifyCb && notifyCb.checked ? 1 : 0,
          use_as_template: templateCb && templateCb.checked ? 1 : 0
        };

        Object.keys(timePayload).forEach(function (key) {
          payload[key] = timePayload[key];
        });
        if (repeatDays) payload.repeat_days = repeatDays;

        if (editingMissionId) {
          var fields = {
            mission: title,
            note: payload.note,
            date_to_do: payload.date_to_do || bizDate,
            color: colorVal,
            project_column: payload.project_column || 'to_do',
            private_mission: isPrivate,
            project_id: projChoice ? Number(projChoice) : 0,
            step_id: stepChoice,
            missions_steps_id: stepChoice,
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
          location.href = 'sales-tasks.html';
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

  var started = false;

  function start() {
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    // Both mineralbar:ready and DOMContentLoaded call start(); a second run would
    // rebuild the dropdowns and wipe the values loadExistingMission() just selected.
    if (started) return;
    started = true;
    wireSchedulePills();
    populateDropdowns().then(function() {
      loadExistingMission();
    });
    wireMediaAndUploads();
    wireSubmit();
    window.addEventListener('mineralbar:language-changed', function () {
      loadProjectColumns(document.getElementById('mb-project-column') && document.getElementById('mb-project-column').value);
    });
  }

  window.addEventListener('mineralbar:ready', function() { setTimeout(start, 150); });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(start, 200); });
  } else {
    setTimeout(start, 200);
  }
})();
