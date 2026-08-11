/**
 * Live Mission.List for sales-tasks.html / shared tasks screen.
 * Handles task rendering, chip filters, quick mission creation, task details panel, and filter overlay.
 */
(function () {
  'use strict';

  var currentFilterType = 'show_all_together_tasks';
  var liveListenersWired = false;
  var _rtTasksTimer = null;
  var _rtTasksRetryTimers = [];

  /** Mission.List can lag behind mission.done / created — debounce + short retries (silent, no Loading flash). */
  function scheduleLiveTasksRefresh(detail) {
    detail = detail || {};
    var key = String(detail.key || '').toLowerCase();
    if (/^socket\.(connect|connected|disconnect)(\.|$)/i.test(key)) return;
    if (/^socket\.nudge\.visible$/i.test(key) || key === 'pageshow' || key === 'visible') return;

    clearTimeout(_rtTasksTimer);
    _rtTasksRetryTimers.forEach(clearTimeout);
    _rtTasksRetryTimers = [];

    // Real mission CRUD → a couple of silent retries (API lag). Poll nudges → one silent refresh only.
    var delays = /mission\.(done|created|updated|deleted|reopened)/.test(key)
      ? [350, 1100, 2600]
      : [400];

    _rtTasksTimer = setTimeout(function () {
      loadTasks(currentFilterType, { silent: true });
      delays.slice(1).forEach(function (ms) {
        _rtTasksRetryTimers.push(setTimeout(function () {
          loadTasks(currentFilterType, { silent: true });
        }, ms));
      });
    }, delays[0]);
  }

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

  function isOverdue(m, today) {
    if (m.project_column === 'completed' || m.is_done || Number(m.done) === 1) return false;
    var when = m.date_to_do_format ? m.date_to_do_format.split('T')[0] : (m.date_to_do || '');
    return when && when < today;
  }

  function formatWhen(m, today) {
    var when = m.date_to_do_format ? m.date_to_do_format.split('T')[0] : (m.date_to_do || '');
    var isEn = typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage() === 'en';
    if (!when) return isEn ? 'No date' : 'ללא תאריך';
    if (when === today) return isEn ? 'Today' : 'היום';
    if (when < today) return (isEn ? 'Overdue' : 'באיחור') + ' · ' + when.split('-').reverse().join('/');
    return when.split('-').reverse().join('/');
  }

  function priorityFromMission(mission, today) {
    if (!mission) return 'none';
    var color = String(mission.color || mission.appoinment_color1 || '').trim().toLowerCase();
    var priority = String(mission.priority || '').trim().toLowerCase();
    var meta = {};
    try { meta = JSON.parse(mission.meta || '{}') || {}; } catch (e) { /* ignore */ }
    var he = String(meta.priority_he || '');

    if (color === 'yellow' || color === 'transparent' || color === 'blue' ||
        priority === 'yellow' || priority === 'transparent' || priority === 'blue' ||
        color === '#f59e0b' || color === '#eab308' || color === '#f1c40f') return 'normal';
    if (color === 'green' || priority === 'green' ||
        color === '#22c55e' || color === '#2e8a63') return 'low';
    if (color === 'red' || priority === 'red' ||
        color === '#ef4444' || color === '#c0392b') return 'urgent';

    if (/\burgent\b|\bhigh\b|דחוף|גבוה/i.test(priority) || /דחוף|גבוה/i.test(he)) return 'urgent';
    if (/\blow\b|נמוכ/i.test(priority) || /נמוכ/i.test(he)) return 'low';
    if (/\bregular\b|\bnormal\b|\bmedium\b|רגיל|בינוני/i.test(priority)) return 'normal';

    if (isOverdue(mission, today)) return 'urgent';
    return 'none';
  }

  function missionRow(m, today) {
    var id = m.mission_id || m.id || '';
    var isEn = typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage() === 'en';
    var title = m.mission || m.title || ((isEn ? 'Task #' : 'משימה #') + id);
    var customer = m.customer_name || m.client_name || '';
    var when = formatWhen(m, today);
    var desc = m.note || m.description || '';
    
    var color = String(m.color || '').toLowerCase();
    var pri = priorityFromMission(m, today);
    
    var priLabel = '--';
    var priBg = 'var(--bg-panel)';
    var priColor = 'var(--text-sub)';
    var dotColor = m.color || (isOverdue(m, today) ? '#c0392b' : '#1d60a2');

    if (color === '#f59e0b' || color === '#eab308' || color === '#f1c40f' || color === 'yellow') {
      dotColor = m.color || '#f59e0b';
      priBg = '#fef3c7';
      priColor = '#b45309';
      priLabel = isEn ? 'Medium' : 'בינוני';
    } else if (pri === 'urgent') {
      priLabel = isEn ? 'Urgent' : 'דחוף';
      priBg = '#fee2e2';
      priColor = '#b91c1c';
      dotColor = m.color || '#ef4444';
    } else if (pri === 'low') {
      priLabel = isEn ? 'Low' : 'נמוך';
      priBg = '#e9f5ee';
      priColor = '#2e8a63';
      dotColor = m.color || '#22c55e';
    } else if (pri === 'normal') {
      priLabel = isEn ? 'Normal' : 'רגיל';
      priBg = '#eaf2fb';
      priColor = '#1d60a2';
      dotColor = m.color || '#1d60a2';
    }

    var groupColor = m.color || (isOverdue(m, today) ? '#c0392b' : dotColor);
    var badgeBg = isOverdue(m, today) ? '#fbeeed' : '#eaf2fb';
    var badgeColor = isOverdue(m, today) ? '#c0392b' : '#1d60a2';

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

  function openTaskDetail(mission) {
    var panel = document.getElementById('task-detail-panel');
    var content = document.getElementById('task-detail-content');
    if (!panel || !content) return;

    var id = mission.mission_id || mission.id || '';
    var title = mission.mission || mission.title || ('Task #' + id);
    var desc = mission.note || mission.description || '';
    var when = mission.date_to_do || '--';
    var customer = mission.customer_name || mission.client_name || '--';
    var createdAt = mission.date_created || '--';
    var assignee = mission.user_name || mission.assignee_name || mission.assigned_to_name || 'manoj';
    var statusName = mission.project_column || mission.status || 'col_to_do';

    var today = todayKey();
    var pri = priorityFromMission(mission, today);
    var priLabel = 'Normal';
    var priBg = '#eaf2fb';
    var priColor = '#1d60a2';

    if (pri === 'urgent') {
      priLabel = 'Urgent';
      priBg = '#fee2e2';
      priColor = '#b91c1c';
    } else if (pri === 'low') {
      priLabel = 'Low';
      priBg = '#e9f5ee';
      priColor = '#2e8a63';
    }

    var dotColor = mission.color || '#2563eb';

    content.innerHTML =
      '<div style="font-size:20px; font-weight:900; color:var(--text-title); line-height:1.35; margin-bottom:20px;">' + esc(title) + '</div>' +

      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">' +
        '<div style="background:var(--bg-form); border:1px solid var(--border-panel); border-radius:14px; padding:12px 14px;">' +
          '<div style="font-size:11px; font-weight:800; color:var(--text-sub); letter-spacing:0.5px; text-transform:uppercase; margin-bottom:8px;">STATUS</div>' +
          '<div style="display:flex; align-items:center; gap:6px; font-size:13.5px; font-weight:800; color:var(--text-title);">' +
            '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:' + dotColor + '; flex:none;"></span>' +
            '<span>' + esc(statusName) + '</span>' +
          '</div>' +
        '</div>' +

        '<div style="background:var(--bg-form); border:1px solid var(--border-panel); border-radius:14px; padding:12px 14px;">' +
          '<div style="font-size:11px; font-weight:800; color:var(--text-sub); letter-spacing:0.5px; text-transform:uppercase; margin-bottom:8px;">PRIORITY</div>' +
          '<div>' +
            '<span style="background:' + priBg + '; color:' + priColor + '; padding:3px 10px; border-radius:8px; font-size:12px; font-weight:800; display:inline-block;">' + esc(priLabel) + '</span>' +
          '</div>' +
        '</div>' +

        '<div style="background:var(--bg-form); border:1px solid var(--border-panel); border-radius:14px; padding:12px 14px;">' +
          '<div style="font-size:11px; font-weight:800; color:var(--text-sub); letter-spacing:0.5px; text-transform:uppercase; margin-bottom:6px;">EXECUTION DATE</div>' +
          '<div style="font-size:13px; font-weight:800; color:var(--text-title);">' + esc(when) + '</div>' +
          '<div style="font-size:11.5px; font-weight:600; color:var(--text-sub); margin-top:2px;">30min</div>' +
        '</div>' +

        '<div style="background:var(--bg-form); border:1px solid var(--border-panel); border-radius:14px; padding:12px 14px;">' +
          '<div style="font-size:10.5px; font-weight:800; color:var(--text-sub); letter-spacing:0.5px; text-transform:uppercase; margin-bottom:6px;">ASSIGN TO A STAFF MEMBER</div>' +
          '<div style="font-size:13.5px; font-weight:800; color:var(--text-title);">' + esc(assignee) + '</div>' +
        '</div>' +
      '</div>' +

      '<div style="background:var(--bg-form); border:1px solid var(--border-panel); border-radius:14px; padding:14px; margin-bottom:16px;">' +
        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
          '<span style="font-size:13px; font-weight:700; color:var(--text-sub);">Customer</span>' +
          '<span style="font-size:13.5px; font-weight:800; color:var(--text-title);">' + esc(customer) + '</span>' +
        '</div>' +
        '<div style="border-bottom:1px solid var(--border-panel); margin:10px 0;"></div>' +
        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
          '<span style="font-size:13px; font-weight:700; color:var(--text-sub);">Created At</span>' +
          '<span style="font-size:13.5px; font-weight:800; color:var(--text-title);">' + esc(createdAt) + '</span>' +
        '</div>' +
      '</div>' +

      '<div style="font-size:14px; font-weight:800; color:var(--text-title); margin-bottom:8px;">Notes (optional)</div>' +
      '<div style="background:var(--bg-form); border:1px solid var(--border-panel); border-radius:14px; padding:14px; min-height:80px; font-size:13px; color:var(--text-title); white-space:pre-wrap; line-height:1.5;">' +
        (desc ? esc(desc) : '') +
      '</div>' +

      '<div style="margin-top:24px; display:flex; gap:12px;">' +
        '<a href="service-create-task.html?mission_id=' + encodeURIComponent(id) + '&from=tasks" style="flex:1; padding:13px; border-radius:12px; background:var(--color-primary); color:#fff; font-size:14px; font-weight:800; text-align:center; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:7px; box-shadow:0 4px 12px rgba(29,96,162,0.25);">' +
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>' +
          '<span>Edit task</span>' +
        '</a>' +
        '<button type="button" id="mb-btn-delete-task" style="flex:1; padding:13px; border-radius:12px; background:transparent; border:1.5px solid #ef4444; color:#ef4444; font-size:14px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:7px;">' +
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' +
          '<span>Delete</span>' +
        '</button>' +
      '</div>';

    var delBtn = document.getElementById('mb-btn-delete-task');
    if (delBtn) {
      delBtn.addEventListener('click', function () {
        showMissionDeleteConfirm(panel, async function () {
          delBtn.disabled = true;
          delBtn.textContent = 'Deleting…';
          try {
            if (window.MineralBarApp && MineralBarApp.doneMission) {
              await MineralBarApp.doneMission(id);
            }
            closeMissionDeleteConfirm();
            panel.style.display = 'none';
            if (typeof loadTasks === 'function') loadTasks(currentFilterType);
          } catch (e) {
            closeMissionDeleteConfirm();
            showMissionDeleteError(panel, 'Failed to delete task: ' + (e.message || e));
            delBtn.disabled = false;
            delBtn.innerHTML =
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' +
              '<span>Delete</span>';
          }
        });
      });
    }

    panel.style.display = 'flex';
  }

  function isMissionUiEn() {
    return typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage() === 'en';
  }

  function closeMissionDeleteConfirm() {
    var modal = document.getElementById('mb-task-delete-modal');
    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
  }

  function showMissionDeleteError(host, message) {
    closeMissionDeleteConfirm();
    var isEn = isMissionUiEn();
    var wrap = document.createElement('div');
    wrap.id = 'mb-task-delete-modal';
    wrap.setAttribute('style', 'position:absolute; inset:0; z-index:80; display:flex; align-items:center; justify-content:center; padding:20px;');
    wrap.innerHTML =
      '<div data-mb-backdrop="1" style="position:absolute; inset:0; background:#0f1828; opacity:0.4;"></div>' +
      '<div style="background:#fff; border-radius:18px; padding:22px 20px; box-shadow:0 10px 30px rgba(15,24,40,.2); width:100%; max-width:320px; text-align:center; z-index:81; position:relative;">' +
        '<div style="font-size:16px; font-weight:800; color:#c0392b; margin-bottom:10px;">' + (isEn ? 'Error' : 'שגיאה') + '</div>' +
        '<div style="font-size:13.5px; color:#5a6473; line-height:1.5; margin-bottom:18px;">' + esc(String(message || '')) + '</div>' +
        '<button type="button" data-mb-ok="1" style="width:100%; padding:11px; border:none; border-radius:10px; background:#1d60a2; color:#fff; font-size:14.5px; font-weight:800; cursor:pointer;">OK</button>' +
      '</div>';
    (host || document.body).appendChild(wrap);
    wrap.querySelector('[data-mb-backdrop]').addEventListener('click', closeMissionDeleteConfirm);
    wrap.querySelector('[data-mb-ok]').addEventListener('click', closeMissionDeleteConfirm);
  }

  function showMissionDeleteConfirm(host, onConfirm) {
    closeMissionDeleteConfirm();
    var isEn = isMissionUiEn();
    var title = isEn ? 'Delete task?' : 'למחוק משימה?';
    var msg = isEn ? 'Are you sure you want to delete this task?' : 'האם אתה בטוח שברצונך למחוק משימה זו?';
    var cancelLbl = isEn ? 'Cancel' : 'ביטול';
    var deleteLbl = isEn ? 'Delete' : 'מחק';
    var wrap = document.createElement('div');
    wrap.id = 'mb-task-delete-modal';
    wrap.setAttribute('style', 'position:absolute; inset:0; z-index:80; display:flex; align-items:center; justify-content:center; padding:20px;');
    wrap.innerHTML =
      '<div data-mb-backdrop="1" style="position:absolute; inset:0; background:#0f1828; opacity:0.4;"></div>' +
      '<div style="background:#fff; border-radius:18px; padding:22px 20px; box-shadow:0 10px 30px rgba(15,24,40,.2); width:100%; max-width:320px; text-align:center; z-index:81; position:relative;">' +
        '<div style="width:46px; height:46px; border-radius:50%; background:#fbeeed; color:#c0392b; display:flex; align-items:center; justify-content:center; margin:0 auto 14px;">' +
          '<svg fill="none" height="22" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="22"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"></path></svg>' +
        '</div>' +
        '<div style="font-size:17.5px; font-weight:800; color:#1f2a3a; margin-bottom:8px;">' + title + '</div>' +
        '<div style="font-size:13.5px; color:#5a6473; line-height:1.5; margin-bottom:22px;">' + msg + '</div>' +
        '<div style="display:flex; gap:10px; align-items:center;">' +
          '<button type="button" data-mb-cancel="1" style="flex:1; padding:11px; border:1.6px solid #cbd5e0; border-radius:10px; background:#fff; color:#2d3748; font-size:14.5px; font-weight:700; cursor:pointer;">' + cancelLbl + '</button>' +
          '<button type="button" data-mb-confirm="1" style="flex:1.2; padding:11px; border:none; border-radius:10px; background:#c0392b; color:#fff; font-size:14.5px; font-weight:800; cursor:pointer; box-shadow:0 4px 10px rgba(192,57,43,0.24);">' + deleteLbl + '</button>' +
        '</div>' +
      '</div>';
    (host || document.body).appendChild(wrap);
    wrap.querySelector('[data-mb-backdrop]').addEventListener('click', closeMissionDeleteConfirm);
    wrap.querySelector('[data-mb-cancel]').addEventListener('click', closeMissionDeleteConfirm);
    wrap.querySelector('[data-mb-confirm]').addEventListener('click', function () {
      var btn = wrap.querySelector('[data-mb-confirm]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = isEn ? 'Deleting…' : 'מוחק…';
      }
      Promise.resolve(onConfirm && onConfirm()).catch(function () { /* handled by caller */ });
    });
  }

  async function populateQuickMissionDropdowns() {
    var teamSel = document.getElementById('mb-quick-team');
    if (teamSel) {
      var team = (window.MineralBarApp && MineralBarApp.getTeamMembers()) || [];
      var meEmail = ((window.MineralBarApp && MineralBarApp.getEmail()) || '').toLowerCase();
      var me = team.find(function (t) {
        return String(t.email || '').toLowerCase() === meEmail;
      }) || team[0];
      
      teamSel.innerHTML = '';
      if (!team.length) {
        var opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No member';
        teamSel.appendChild(opt);
      } else {
        team.forEach(function (t) {
          var opt = document.createElement('option');
          opt.value = String(t.id);
          var label = (t.name || t.email || ('#' + t.id));
          if (me && String(t.id) === String(me.id)) label += ' (Me)';
          opt.textContent = label;
          teamSel.appendChild(opt);
        });
        if (me) teamSel.value = String(me.id);
      }
    }

    var custSel = document.getElementById('mb-quick-customer');
    if (custSel) {
      try {
        var res = await MineralBarApp.listCustomers().catch(function() { return { rows: [] }; });
        var rows = res.rows || res.data || (Array.isArray(res) ? res : []);
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
      } catch(e) {
        console.warn('Could not populate customer list for Quick Mission', e);
      }
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
          msgEl.textContent = 'Please enter task detail.';
        }
        if (detailIn) detailIn.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating…';
      if (msgEl) msgEl.style.display = 'none';

      try {
        var memberId = teamSel ? teamSel.value : '';
        var customerId = custSel ? custSel.value : '';

        await MineralBarApp.createMission({
          title: title,
          mission: title,
          note: title,
          member_id: memberId ? [Number(memberId) || memberId] : undefined,
          assigned_to: memberId || undefined,
          customer_id: customerId || undefined
        });

        if (msgEl) {
          msgEl.style.display = 'block';
          msgEl.style.color = '#2e8a63';
          msgEl.textContent = 'Quick mission added successfully!';
        }
        if (detailIn) detailIn.value = '';
        
        loadTasks(currentFilterType);
      } catch (err) {
        console.error('Quick Mission create failed', err);
        if (msgEl) {
          msgEl.style.display = 'block';
          msgEl.style.color = '#c0392b';
          msgEl.textContent = 'Failed to create quick mission: ' + (err.message || err);
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Quick mission';
      }
    });
  }

  function wireFilterChips() {
    var chips = document.querySelectorAll('.mb-filter-chip');
    chips.forEach(function(chip) {
      chip.addEventListener('click', function() {
        var type = this.getAttribute('data-type') || 'show_all_together_tasks';
        currentFilterType = type;

        chips.forEach(function(c) {
          var on = c === chip;
          c.style.background = on ? 'var(--color-primary)' : 'var(--bg-panel)';
          c.style.color = on ? '#fff' : 'var(--text-sub)';
          c.style.border = on ? 'none' : '1px solid var(--border-panel)';
        });

        loadTasks(currentFilterType);
      });
    });
  }

  async function loadTasks(typeParam, opts) {
    opts = opts || {};
    var silent = !!opts.silent;
    var filterType = typeParam || currentFilterType || 'show_all_together_tasks';
    var totalEl = document.getElementById('mb-missions-total');
    var mount = document.getElementById('mb-live-tasks') || document.getElementById('mb-live-missions');
    var hasRows = !!(mount && mount.querySelector('.task-row-card'));

    // Socket / soft refresh: keep current list + count visible — never flash "Loading…"
    if (!silent || !hasRows) {
      if (totalEl) totalEl.textContent = (typeof window.mbT === 'function' ? window.mbT('Loading…', 'טוען…') : 'טוען…');
      if (mount) {
        if (window.MineralBarLoader && typeof MineralBarLoader.inlineHtml === 'function') {
          mount.innerHTML = MineralBarLoader.inlineHtml(
            typeof window.mbT === 'function' ? window.mbT('Loading tasks…', 'טוען משימות…') : 'טוען משימות…'
          );
        } else {
          mount.innerHTML =
            '<div class="mb-inline-loader">' +
            '<div class="mb-page-loader__spin" aria-hidden="true"></div>' +
            '<div class="mb-page-loader__label">טוען משימות…</div>' +
            '</div>';
        }
      }
    }

    try {
      var result = await MineralBarApp.listMissions({ type: filterType, length: 100, start: 0, draw: 1 });
      var today = todayKey();
      var groups = result.groups || [];
      var flatRows = result.rows || [];
      
      if (totalEl) {
        var total = result.total || flatRows.length || 0;
        totalEl.textContent = total ? (total + ' tasks') : 'No tasks';
      }
      
      var html = '';
      groups.forEach(function(g, idx) {
        if (!g.rows || !g.rows.length) return;
        var groupColor = '#1d60a2';
        var gId = g.id || ('group_' + idx);
        var labelStr = esc(g.label === 'משימות' ? 'Tasks' : g.label);
        
        html += '<div class="task-group-container" data-group-id="' + esc(gId) + '">';
        html += '<div class="task-group-header">' +
                '<span class="task-group-dot" style="background:' + groupColor + ';"></span>' +
                '<span class="task-group-title">' + labelStr + '</span>' +
                '<span class="task-group-count">• ' + g.total + '</span>' +
                '</div>';
        html += g.rows.map(function(m) { return missionRow(m, today); }).join('');
        html += '</div>';
      });

      if (!html && flatRows.length) {
        html += '<div class="task-group-container">';
        html += '<div class="task-group-header"><span class="task-group-dot"></span><span class="task-group-title">Tasks</span><span class="task-group-count">• ' + flatRows.length + '</span></div>';
        html += flatRows.map(function(m) { return missionRow(m, today); }).join('');
        html += '</div>';
      }
      
      if (!html) {
        html = '<div style="text-align:center; padding:40px 20px; color:var(--text-sub); font-weight:600;">No tasks found.</div>';
      }
      
      if (mount) {
        mount.innerHTML = html;
        
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
      if (silent && hasRows) {
        console.warn('[MissionsLive] silent refresh failed — keeping list', err);
        return;
      }
      console.error(err);
      if (mount) mount.innerHTML = '<div style="color:#c0392b; text-align:center; padding:20px;">Failed to load tasks.</div>';
    }
  }

  function start() {
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    wireFilterChips();
    populateQuickMissionDropdowns();
    wireQuickMission();
    loadTasks(currentFilterType || 'show_all_together_tasks');

    if (!liveListenersWired) {
      liveListenersWired = true;
      window.addEventListener('mineralbar:realtime', function (ev) {
        scheduleLiveTasksRefresh((ev && ev.detail) || {});
      });
      window.addEventListener('mineralbar:missions', function (ev) {
        scheduleLiveTasksRefresh((ev && ev.detail) || {});
      });
      window.addEventListener('mineralbar:page-refresh', function (ev) {
        scheduleLiveTasksRefresh((ev && ev.detail) || {});
      });
    }
    
    var closeBtn = document.getElementById('close-task-panel');
    if (closeBtn && !closeBtn.dataset.mbWired) {
      closeBtn.dataset.mbWired = '1';
      closeBtn.addEventListener('click', function() {
        document.getElementById('task-detail-panel').style.display = 'none';
      });
    }
    
    var filterBtn = document.getElementById('task-filter-btn');
    if (filterBtn && !filterBtn.dataset.mbWired) {
      filterBtn.dataset.mbWired = '1';
      filterBtn.addEventListener('click', function() {
        var p = document.getElementById('task-filter-panel');
        if (p) p.style.display = 'flex';
      });
    }
    
    var closeFilterBtn = document.getElementById('close-filter-panel');
    if (closeFilterBtn && !closeFilterBtn.dataset.mbWired) {
      closeFilterBtn.dataset.mbWired = '1';
      closeFilterBtn.addEventListener('click', function() {
        var p = document.getElementById('task-filter-panel');
        if (p) p.style.display = 'none';
      });
    }
  }

  window.addEventListener('mineralbar:ready', function () { setTimeout(start, 150); });
  window.addEventListener('mineralbar:language-changed', function () {
    if (typeof loadTasks === 'function') loadTasks(typeof currentFilterType !== 'undefined' ? currentFilterType : undefined);
    else start();
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 200); });
  } else {
    setTimeout(start, 200);
  }

  if (window.LiveSync && typeof LiveSync.bind === 'function') {
    LiveSync.bind(function (detail) {
      scheduleLiveTasksRefresh(detail || {});
    }, {
      keys: /mission|task|ticket|socket\.nudge/i,
      mount: '#mb-live-missions',
      delay: 300,
      retries: false
    });
  } else if (window.MineralBarApp && MineralBarApp.bindLiveReload) {
    MineralBarApp.bindLiveReload(function (detail) {
      scheduleLiveTasksRefresh(detail || {});
    }, { keys: /mission|task|ticket|socket\.nudge/i, delay: 80 });
  }

})();
