/**
 * Live Mission.List & Tasks UI engine for sales-tasks.html
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Live mounts (#mb-live-*) skip DOM i18n — localize here. */
  function uiT(en, he) {
    if (typeof window.mbT === 'function') return window.mbT(en, he);
    var lang = (typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage()) || 'he';
    return lang === 'en' ? en : he;
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
    var color = String(mission.color || '').toLowerCase();
    var priority = String(mission.priority || '').toLowerCase();
    var meta = {};
    try { meta = JSON.parse(mission.meta || '{}') || {}; } catch (e) { /* ignore */ }
    var he = String(meta.priority_he || '');
    
    if (/urgent|high|דחוף|גבוה/i.test(priority) || /דחוף|גבוה/i.test(he) || color === '#ef4444' || color === '#c0392b') return 'urgent';
    if (/low|נמוכ/i.test(priority) || /נמוכ/i.test(he) || color === '#22c55e' || color === '#2e8a63') return 'low';
    if (/normal|medium|רגיל|בינוני/i.test(priority) || color === '#f59e0b' || color === '#eab308' || color === '#f1c40f') return 'normal';

    if (isOverdue(mission, today)) return 'urgent';
    return 'none';
  }

  function formatColumnStatus(m) {
    if (isMissionDone(m)) return uiT('Completed', 'הושלם');
    var col = String((m && (m.project_column_name || m.project_column || m.status_name || m.status)) || '').trim();
    var low = col.toLowerCase();
    if (!col || low === 'col_to_do' || low === 'to_do' || low === 'todo') return uiT('To do', 'לביצוע');
    if (/quer|progress|doing|testing|in_progress|col_queries|col_testing/.test(low)) return uiT('In progress', 'בתהליך');
    if (/done|completed|col_done/.test(low)) return uiT('Completed', 'הושלם');
    if (/^col_/.test(low)) return col.replace(/^col_/i, '').replace(/_/g, ' ');
    return col;
  }

  function missionRow(m, today) {
    var id = m.mission_id || m.id || '';
    var isEn = typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage() === 'en';
    var title = m.mission || m.title || ((isEn ? 'Task #' : 'משימה #') + id);
    var customer = m.customer_name || m.client_name || '';
    var when = formatWhen(m, today);
    var desc = m.note || m.description || '';
    var columnStatus = formatColumnStatus(m);
    var overdue = isOverdue(m, today);
    
    var color = String(m.color || '').toLowerCase();
    var pri = priorityFromMission(m, today);
    
    var priLabel = '--';
    var priBg = 'var(--bg-panel)';
    var priColor = 'var(--text-sub)';
    var dotColor = m.color || (overdue ? '#c0392b' : '#1d60a2');

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

    var groupColor = m.color || (overdue ? '#c0392b' : dotColor);
    var dueBg = overdue ? '#fbeeed' : '#eaf2fb';
    var dueColor = overdue ? '#c0392b' : '#1d60a2';
    var statusBg = isMissionDone(m) ? '#e6f4ec' : '#f1f3f6';
    var statusColor = isMissionDone(m) ? '#2e8a63' : '#5a6473';

    return (
      '<div class="task-row-card" data-mission="' + esc(JSON.stringify(m)) + '" style="border-right:4px solid ' + groupColor + '; overflow:hidden; width:100%; max-width:100%; box-sizing:border-box;">' +
      '<div style="flex:1; min-width:0; overflow:hidden;">' +
      '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">' +
      '<div class="task-row-title" style="display:flex; align-items:center; gap:6px; flex:1; min-width:0; overflow:hidden;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:' + dotColor + '; flex:none;"></span><span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + esc(title) + '</span></div>' +
      (priLabel !== '--'
        ? '<span style="background:' + priBg + ';color:' + priColor + ';font-size:10px;font-weight:700;padding:2px 6px;border-radius:6px;flex:none;">' + esc(priLabel) + '</span>'
        : '') +
      '</div>' +
      (customer ? '<div style="font-size:12.5px; font-weight:700; color:var(--text-sub); margin-top:3px; display:flex; align-items:center; gap:5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg><span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + esc(customer) + '</span></div>' : '') +
      (desc ? '<div class="task-row-desc" style="margin-top:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%;">' + esc(desc) + '</div>' : '') +
      '<div class="task-row-badge-container" style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;">' +
      '<span class="task-row-badge" style="background:' + statusBg + ';color:' + statusColor + ';">' + esc(uiT('Status', 'סטטוס') + ': ' + columnStatus) + '</span>' +
      (when
        ? '<span class="task-row-badge" style="background:' + dueBg + ';color:' + dueColor + ';">' + esc(when) + '</span>'
        : '') +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  function isMissionDone(mission) {
    if (!mission) return false;
    if (mission.is_done || Number(mission.done) === 1) return true;
    var col = String(mission.project_column || mission.status || '').toLowerCase();
    return col === 'completed' || col === 'done' || col === 'col_done' || col === 'col_completed';
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
    var statusName = formatColumnStatus(mission);
    var alreadyDone = isMissionDone(mission);

    var today = todayKey();
    var pri = priorityFromMission(mission, today);
    var isEn = typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage() === 'en';
    var priLabel = isEn ? 'Normal' : 'רגיל';
    var priBg = '#eaf2fb';
    var priColor = '#1d60a2';

    if (pri === 'urgent') {
      priLabel = isEn ? 'Urgent' : 'דחוף';
      priBg = '#fee2e2';
      priColor = '#b91c1c';
    } else if (pri === 'low') {
      priLabel = isEn ? 'Low' : 'נמוך';
      priBg = '#e9f5ee';
      priColor = '#2e8a63';
    }

    var doneLabel = uiT('Done', 'בוצע');
    var titleRow =
      '<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:20px;">' +
        '<div style="font-size:20px; font-weight:900; color:var(--text-title); line-height:1.35; flex:1; min-width:0;">' + esc(title) + '</div>' +
        (alreadyDone
          ? '<span style="flex:none; padding:8px 14px; border-radius:99px; background:#e6f4ec; color:#2e8a63; font-size:13px; font-weight:800;">' + esc(doneLabel) + '</span>'
          : '<button type="button" id="mb-btn-mark-done" style="flex:none; padding:8px 16px; border:none; border-radius:99px; background:#2e8a63; color:#fff; font-size:13px; font-weight:800; cursor:pointer; box-shadow:0 4px 12px rgba(46,138,99,0.28);">' + esc(doneLabel) + '</button>') +
      '</div>';

    content.innerHTML =
      titleRow +

      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">' +
        '<div style="background:var(--bg-form); border:1px solid var(--border-panel); border-radius:14px; padding:12px 14px;">' +
          '<div style="font-size:11px; font-weight:800; color:var(--text-sub); letter-spacing:0.5px; text-transform:uppercase; margin-bottom:8px;">STATUS</div>' +
          '<div style="font-size:13.5px; font-weight:800; color:var(--text-title);">' +
            esc(alreadyDone ? doneLabel : statusName) +
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

    var doneBtn = document.getElementById('mb-btn-mark-done');
    if (doneBtn) {
      doneBtn.addEventListener('click', async function () {
        doneBtn.disabled = true;
        doneBtn.textContent = uiT('Closing…', 'סוגר…');
        try {
          if (window.MineralBarApp && MineralBarApp.doneMission) {
            await MineralBarApp.doneMission(id);
          } else {
            await MineralBarApp.getClient().request('Mission.Done', { id: id });
          }
          panel.style.display = 'none';
          currentStart = 0;
          if (typeof loadTasks === 'function') loadTasks(currentFilterType);
          // Return to the screen we entered from (home/chat), not forced tasks stay
          try {
            var ref = document.referrer || '';
            if (ref && /sales-home\.html|chat-customer\.html|calls-list\.html|service-all-calls\.html/i.test(ref) &&
                window.history.length > 1) {
              window.history.back();
            }
          } catch (eNav) { /* stay on tasks list */ }
        } catch (err) {
          console.error('[tasks-live] Mission.Done failed', err);
          alert(uiT('Failed to close task', 'סגירת משימה נכשלה') + ': ' + ((err && err.message) || err));
          doneBtn.disabled = false;
          doneBtn.textContent = doneLabel;
        }
      });
    }

    var delBtn = document.getElementById('mb-btn-delete-task');
    if (delBtn) {
      delBtn.addEventListener('click', function () {
        showTaskDeleteConfirm(panel, async function () {
          delBtn.disabled = true;
          delBtn.textContent = 'Deleting…';
          try {
            if (window.MineralBarApp && MineralBarApp.doneMission) {
              await MineralBarApp.doneMission(id);
            }
            closeTaskDeleteConfirm();
            panel.style.display = 'none';
            currentStart = 0;
            if (typeof loadTasks === 'function') loadTasks(currentFilterType);
          } catch (e) {
            closeTaskDeleteConfirm();
            showTaskDeleteError(panel, 'Failed to delete task: ' + (e.message || e));
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

  function isTaskUiEn() {
    return typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage() === 'en';
  }

  function closeTaskDeleteConfirm() {
    var modal = document.getElementById('mb-task-delete-modal');
    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
  }

  function showTaskDeleteError(host, message) {
    closeTaskDeleteConfirm();
    var isEn = isTaskUiEn();
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
    wrap.querySelector('[data-mb-backdrop]').addEventListener('click', closeTaskDeleteConfirm);
    wrap.querySelector('[data-mb-ok]').addEventListener('click', closeTaskDeleteConfirm);
  }

  function showTaskDeleteConfirm(host, onConfirm) {
    closeTaskDeleteConfirm();
    var isEn = isTaskUiEn();
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
    wrap.querySelector('[data-mb-backdrop]').addEventListener('click', closeTaskDeleteConfirm);
    wrap.querySelector('[data-mb-cancel]').addEventListener('click', closeTaskDeleteConfirm);
    wrap.querySelector('[data-mb-confirm]').addEventListener('click', function () {
      var btn = wrap.querySelector('[data-mb-confirm]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = isEn ? 'Deleting…' : 'מוחק…';
      }
      Promise.resolve(onConfirm && onConfirm()).catch(function () { /* handled by caller */ });
    });
  }

  var currentFilterType = 'show_all_together_tasks';
  var advancedFilters = {
    status: 'everything',   // today | late | everything | completed
    priority: 'all',        // all | urgent | normal | low
    association: 'my',      // my | all | <userId>
    sortBy: 'date_to_do',   // date_to_do | priority | date_created
    sortDir: 'asc'          // asc | desc
  };
  var draftFilters = null;

  function defaultAdvancedFilters() {
    return {
      status: 'everything',
      priority: 'all',
      association: 'my',
      sortBy: 'date_to_do',
      sortDir: 'asc'
    };
  }

  function isAdvancedFilterActive() {
    return advancedFilters.priority !== 'all' ||
      advancedFilters.association !== 'my' ||
      advancedFilters.sortBy !== 'date_to_do' ||
      advancedFilters.sortDir !== 'asc';
  }

  function syncFilterBadge() {
    var badge = document.getElementById('task-filter-badge');
    var btn = document.getElementById('task-filter-btn');
    var active = isAdvancedFilterActive();
    if (badge) badge.style.display = active ? 'block' : 'none';
    if (btn) {
      btn.style.borderColor = active ? '#9ec0e8' : 'var(--border-panel,#dde2ea)';
      btn.style.background = active ? '#eaf2fb' : 'var(--bg-panel,#fff)';
      btn.style.color = active ? '#1d60a2' : 'var(--text-title,#1f2a3a)';
    }
  }

  function missionMatchesPriority(m, priFilter, today) {
    if (!priFilter || priFilter === 'all') return true;
    return priorityFromMission(m, today) === priFilter;
  }

  function filterRowsByPriority(rows, today) {
    var pri = advancedFilters.priority || 'all';
    if (pri === 'all') return rows || [];
    return (rows || []).filter(function (m) {
      return missionMatchesPriority(m, pri, today);
    });
  }

  function statusToType(status) {
    if (status === 'today') return 'today_tasks';
    if (status === 'late') return 'priority_tasks';
    if (status === 'completed') return 'done_tasks';
    return 'show_all_together_tasks';
  }

  function typeToStatus(type) {
    if (type === 'today_tasks') return 'today';
    if (type === 'priority_tasks') return 'late';
    if (type === 'done_tasks') return 'completed';
    if (type === 'upcoming_tasks' || type === 'private_tasks') return 'everything';
    return 'everything';
  }

  function chipStyle(on) {
    return on
      ? 'display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:99px;border:1.5px solid #9ec0e8;background:#eaf2fb;color:#1d60a2;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;'
      : 'display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:99px;border:1px solid #dde2ea;background:#fff;color:#5a6473;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;';
  }

  function filterSection(title, chipsHtml) {
    return (
      '<div style="margin-bottom:16px;">' +
      '<div style="font-size:12px;font-weight:800;color:#8a93a3;margin-bottom:8px;text-align:start;">' + esc(title) + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;">' + chipsHtml + '</div>' +
      '</div>'
    );
  }

  function filterChip(group, value, label, selected, icon) {
    return (
      '<button type="button" class="mb-adv-filter-chip" data-group="' + esc(group) + '" data-value="' + esc(value) + '" style="' + chipStyle(selected) + '">' +
      (icon || '') + esc(label) +
      '</button>'
    );
  }

  function sortRow(key, label, leftVal, leftLabel, rightVal, rightLabel, selectedKey, selectedDir) {
    var on = selectedKey === key;
    var leftOn = on && selectedDir === leftVal;
    var rightOn = on && selectedDir === rightVal;
    var radio = on
      ? '<span style="width:16px;height:16px;border-radius:50%;border:5px solid #1d60a2;box-sizing:border-box;flex:none;"></span>'
      : '<span style="width:16px;height:16px;border-radius:50%;border:2px solid #c2c9d2;box-sizing:border-box;flex:none;"></span>';
    var tog = function (val, lab, active) {
      return (
        '<button type="button" class="mb-adv-sort-dir" data-sort-by="' + esc(key) + '" data-sort-dir="' + esc(val) + '" style="' +
        (active
          ? 'padding:5px 10px;border-radius:8px;border:none;background:#1d60a2;color:#fff;font-size:11.5px;font-weight:700;cursor:pointer;'
          : 'padding:5px 10px;border-radius:8px;border:1px solid #dde2ea;background:#fff;color:#7b8595;font-size:11.5px;font-weight:700;cursor:pointer;') +
        '">' + esc(lab) + '</button>'
      );
    };
    return (
      '<div class="mb-adv-sort-row" data-sort-by="' + esc(key) + '" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #f0f2f5;cursor:pointer;">' +
      '<div style="display:flex;align-items:center;gap:10px;min-width:0;">' + radio +
      '<span style="font-size:13.5px;font-weight:700;color:#1f2a3a;">' + esc(label) + '</span></div>' +
      '<div style="display:flex;gap:6px;flex:none;">' +
      tog(leftVal, leftLabel, leftOn) + tog(rightVal, rightLabel, rightOn) +
      '</div></div>'
    );
  }

  function renderAdvancedFilterPanel() {
    var host = document.getElementById('task-filter-options');
    if (!host) return;
    var f = draftFilters || Object.assign({}, advancedFilters);
    draftFilters = f;

    var titleEl = document.getElementById('task-filter-title');
    if (titleEl) titleEl.textContent = uiT('Filter', 'סינון');

    var resetBtn = document.getElementById('reset-task-filters');
    if (resetBtn) resetBtn.textContent = uiT('Reset', 'איפוס');

    var team = (window.MineralBarApp && MineralBarApp.getTeamMembers && MineralBarApp.getTeamMembers()) || [];
    var assocChips = filterChip('association', 'my', uiT('My tasks', 'המשימות שלי'), f.association === 'my') +
      filterChip('association', 'all', uiT('All team', 'כל הצוות'), f.association === 'all');
    team.slice(0, 8).forEach(function (t) {
      var id = String(t.id || '');
      if (!id) return;
      assocChips += filterChip('association', id, t.name || t.email || ('#' + id), String(f.association) === id);
    });

    host.innerHTML =
      filterSection(uiT('Status', 'סטטוס'),
        filterChip('status', 'today', uiT('Today', 'היום'), f.status === 'today') +
        filterChip('status', 'late', uiT('Overdue', 'באיחור'), f.status === 'late') +
        filterChip('status', 'everything', uiT('All', 'הכל'), f.status === 'everything') +
        filterChip('status', 'completed', uiT('Completed', 'הושלם'), f.status === 'completed')
      ) +
      filterSection(uiT('Priority', 'עדיפות'),
        filterChip('priority', 'all', uiT('All', 'הכל'), f.priority === 'all') +
        filterChip('priority', 'urgent', uiT('Urgent', 'דחוף'), f.priority === 'urgent') +
        filterChip('priority', 'normal', uiT('Medium', 'בינוני'), f.priority === 'normal') +
        filterChip('priority', 'low', uiT('Low', 'נמוך'), f.priority === 'low')
      ) +
      filterSection(uiT('Team member', 'איש צוות'), assocChips) +
      '<div style="margin-bottom:8px;">' +
      '<div style="font-size:12px;font-weight:800;color:#8a93a3;margin-bottom:4px;">' + esc(uiT('Sort by', 'מיון לפי')) + '</div>' +
      sortRow('date_to_do', uiT('Execution date', 'תאריך ביצוע'), 'desc', uiT('Far', 'רחוק'), 'asc', uiT('Close', 'קרוב'), f.sortBy, f.sortDir) +
      sortRow('priority', uiT('Priority', 'עדיפות'), 'asc', uiT('Low', 'נמוך'), 'desc', uiT('High', 'גבוה'), f.sortBy, f.sortDir) +
      sortRow('date_created', uiT('Creation date', 'תאריך יצירה'), 'desc', uiT('New', 'חדש'), 'asc', uiT('Old', 'ישן'), f.sortBy, f.sortDir) +
      '</div>';

    var applyLabel = document.getElementById('apply-task-filters-label');
    if (applyLabel) applyLabel.textContent = uiT('Show results', 'הצג תוצאות');

    host.querySelectorAll('.mb-adv-filter-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var group = btn.getAttribute('data-group');
        var value = btn.getAttribute('data-value');
        if (!group) return;
        draftFilters[group] = value;
        renderAdvancedFilterPanel();
      });
    });
    host.querySelectorAll('.mb-adv-sort-row').forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target && e.target.closest && e.target.closest('.mb-adv-sort-dir')) return;
        draftFilters.sortBy = row.getAttribute('data-sort-by') || 'date_to_do';
        renderAdvancedFilterPanel();
      });
    });
    host.querySelectorAll('.mb-adv-sort-dir').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        draftFilters.sortBy = btn.getAttribute('data-sort-by') || 'date_to_do';
        draftFilters.sortDir = btn.getAttribute('data-sort-dir') || 'asc';
        renderAdvancedFilterPanel();
      });
    });
  }

  function openFilterPanel() {
    draftFilters = Object.assign({}, advancedFilters);
    draftFilters.status = typeToStatus(currentFilterType);
    var p = document.getElementById('task-filter-panel');
    if (p) p.style.display = 'flex';
    renderAdvancedFilterPanel();
  }

  function closeFilterPanel() {
    var p = document.getElementById('task-filter-panel');
    if (p) p.style.display = 'none';
    draftFilters = null;
  }

  function syncTopChips(type) {
    var chips = document.querySelectorAll('.mb-filter-chip');
    chips.forEach(function (c) {
      var on = (c.getAttribute('data-type') || '') === type;
      c.style.background = on ? 'var(--color-primary)' : 'var(--bg-panel)';
      c.style.color = on ? '#fff' : 'var(--text-sub)';
      c.style.border = on ? 'none' : '1px solid var(--border-panel)';
    });
  }

  function buildListParams(filterType) {
    var params = {
      type: filterType || currentFilterType || 'show_all_together_tasks',
      length: PAGE_SIZE,
      start: currentStart,
      draw: 1,
      include_counts: 1
    };
    // Priority is filtered client-side — pull a larger page so results aren't truncated.
    if (advancedFilters.priority && advancedFilters.priority !== 'all') {
      params.length = 200;
      params.start = 0;
    }
    var f = advancedFilters;
    if (f.association === 'my') params.create_by = 'my_task';
    else if (f.association === 'all') params.create_by = 'all_my_team_task';
    else if (f.association) {
      params.create_by = 'all_my_team_task';
      params.filter_mission_by_organization_user = f.association;
    }
    if (f.sortBy) {
      params.order_by = f.sortBy;
      params.order_dir = f.sortDir || 'asc';
      params.sort = f.sortBy + '_' + (f.sortDir || 'asc');
    }
    return params;
  }

  function applyAdvancedFilters() {
    if (draftFilters) advancedFilters = Object.assign({}, draftFilters);
    currentFilterType = statusToType(advancedFilters.status);
    // Keep quick chips in sync for today/late/completed/everything; leave Upcoming/Private if user used chips
    if (advancedFilters.status === 'everything' &&
        (currentFilterType === 'upcoming_tasks' || currentFilterType === 'private_tasks')) {
      /* keep */
    }
    syncTopChips(currentFilterType);
    syncFilterBadge();
    currentStart = 0;
    closeFilterPanel();
    loadTasks(currentFilterType);
  }

  function resetAdvancedFilters() {
    draftFilters = defaultAdvancedFilters();
    advancedFilters = Object.assign({}, draftFilters);
    currentFilterType = 'show_all_together_tasks';
    syncTopChips(currentFilterType);
    syncFilterBadge();
    currentStart = 0;
    closeFilterPanel();
    loadTasks(currentFilterType);
  }

  var PAGE_SIZE = 25;
  var currentStart = 0;
  var currentTotal = 0;
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

  function pageCount(total) {
    var t = Number(total) || 0;
    return Math.max(1, Math.ceil(t / PAGE_SIZE));
  }

  function currentPage() {
    return Math.floor(currentStart / PAGE_SIZE) + 1;
  }

  function renderPager(total, shownCount) {
    var t = Number(total) || 0;
    if (t <= PAGE_SIZE) return '';
    var page = currentPage();
    var pages = pageCount(t);
    var from = t ? (currentStart + 1) : 0;
    var to = Math.min(currentStart + (shownCount || PAGE_SIZE), t);
    var canPrev = currentStart > 0;
    var canNext = currentStart + PAGE_SIZE < t;
    var btnBase =
      'padding:9px 14px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;';
    var btnOn = btnBase + 'border:none;background:var(--color-primary,#1d60a2);color:#fff;';
    var btnOff = btnBase + 'border:1px solid var(--border-panel,#e2e8f0);background:var(--bg-panel,#fff);color:var(--text-sub,#64748b);opacity:0.45;cursor:default;';

    return (
      '<div id="mb-tasks-pager" style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:14px 0 6px;padding:12px 12px;background:var(--bg-panel,#fff);border:1px solid var(--border-panel,#e8eaee);border-radius:14px;">' +
      '<button type="button" id="mb-tasks-prev" ' + (canPrev ? '' : 'disabled ') +
      'style="' + (canPrev ? btnOn : btnOff) + '">' + esc(uiT('‹ Prev', '‹ הקודם')) + '</button>' +
      '<div style="text-align:center;flex:1;min-width:0;">' +
      '<div style="font-size:12.5px;font-weight:800;color:var(--text-title,#1f2a3a);">' + from + '–' + to + ' ' + esc(uiT('of', 'מתוך')) + ' ' + t + '</div>' +
      '<div style="font-size:11.5px;font-weight:700;color:var(--text-sub,#8a93a3);margin-top:2px;">' + esc(uiT('Page', 'עמוד')) + ' ' + page + ' ' + esc(uiT('of', 'מתוך')) + ' ' + pages + '</div>' +
      '</div>' +
      '<button type="button" id="mb-tasks-next" ' + (canNext ? '' : 'disabled ') +
      'style="' + (canNext ? btnOn : btnOff) + '">' + esc(uiT('Next ›', 'הבא ›')) + '</button>' +
      '</div>'
    );
  }

  function wirePager() {
    var prev = document.getElementById('mb-tasks-prev');
    var next = document.getElementById('mb-tasks-next');
    if (prev && !prev.disabled) {
      prev.addEventListener('click', function () {
        currentStart = Math.max(0, currentStart - PAGE_SIZE);
        loadTasks(currentFilterType);
      });
    }
    if (next && !next.disabled) {
      next.addEventListener('click', function () {
        if (currentStart + PAGE_SIZE < currentTotal) {
          currentStart += PAGE_SIZE;
          loadTasks(currentFilterType);
        }
      });
    }
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

        currentStart = 0;
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
        advancedFilters.status = typeToStatus(type);
        syncTopChips(type);
        syncFilterBadge();
        currentStart = 0;
        loadTasks(currentFilterType);
      });
    });
  }

  var _tasksLoadInFlight = null;

  async function loadTasks(typeParam, opts) {
    opts = opts || {};
    var silent = !!opts.silent;
    var filterType = typeParam || currentFilterType || 'show_all_together_tasks';
    var totalEl = document.getElementById('mb-missions-total');
    var mount = document.getElementById('mb-live-tasks') || document.getElementById('mb-live-missions');
    var hasRows = !!(mount && mount.querySelector('.task-row-card'));

    // Socket / soft refresh: keep current list + count visible — never flash loader
    if (!silent || !hasRows) {
      if (totalEl) totalEl.textContent = uiT('Loading…', 'טוען…');
      if (mount && !hasRows) {
        if (window.MineralBarLoader && typeof MineralBarLoader.inlineHtml === 'function') {
          mount.innerHTML = MineralBarLoader.inlineHtml(uiT('Loading tasks…', 'טוען משימות…'));
        } else {
          mount.innerHTML =
            '<div class="mb-inline-loader">' +
            '<div class="mb-page-loader__spin" aria-hidden="true"></div>' +
            '<div class="mb-page-loader__label">' + esc(uiT('Loading tasks…', 'טוען משימות…')) + '</div>' +
            '</div>';
        }
      }
    }

    if (_tasksLoadInFlight && silent) return _tasksLoadInFlight;

    var run = (async function () {
    try {
      var result = await MineralBarApp.listMissions(buildListParams(filterType));
      var today = todayKey();
      var groups = result.groups || [];
      var flatRows = result.rows || [];

      // Client-side priority filter (API may not support priority param)
      flatRows = filterRowsByPriority(flatRows, today);
      groups = groups.map(function (g) {
        return Object.assign({}, g, { rows: filterRowsByPriority(g.rows || [], today) });
      }).filter(function (g) {
        return (g.rows && g.rows.length) || Number(g.total) > 0;
      });
      // Drop empty groups after priority filter
      groups = groups.filter(function (g) { return g.rows && g.rows.length; });

      // Client-side sort fallback
      function sortRows(rows) {
        var key = advancedFilters.sortBy || 'date_to_do';
        var dir = advancedFilters.sortDir === 'desc' ? -1 : 1;
        return rows.slice().sort(function (a, b) {
          var av = '';
          var bv = '';
          if (key === 'date_created') {
            av = String(a.date_created || a.created_at || '');
            bv = String(b.date_created || b.created_at || '');
          } else if (key === 'priority') {
            var rank = { urgent: 3, normal: 2, none: 1, low: 0 };
            av = rank[priorityFromMission(a, today)] || 0;
            bv = rank[priorityFromMission(b, today)] || 0;
            return (av - bv) * dir;
          } else {
            av = (a.date_to_do_format ? String(a.date_to_do_format).split('T')[0] : (a.date_to_do || '')) || '9999-99-99';
            bv = (b.date_to_do_format ? String(b.date_to_do_format).split('T')[0] : (b.date_to_do || '')) || '9999-99-99';
          }
          if (av < bv) return -1 * dir;
          if (av > bv) return 1 * dir;
          return 0;
        });
      }
      flatRows = sortRows(flatRows);
      groups = groups.map(function (g) {
        return Object.assign({}, g, { rows: sortRows(g.rows || []) });
      });

      var total = Number(result.total) || flatRows.length || 0;
      // When priority filter is active, show filtered count on this page
      if (advancedFilters.priority && advancedFilters.priority !== 'all') {
        var filteredCount = 0;
        groups.forEach(function (g) { filteredCount += (g.rows && g.rows.length) || 0; });
        if (!filteredCount) filteredCount = flatRows.length;
        total = filteredCount;
      }
      currentTotal = total;

      // If filter/total shrank past current page, snap back
      if (total > 0 && currentStart >= total) {
        currentStart = Math.max(0, (pageCount(total) - 1) * PAGE_SIZE);
        return loadTasks(filterType, opts);
      }

      var shownCount = 0;
      groups.forEach(function (g) { shownCount += (g.rows && g.rows.length) || 0; });
      if (!shownCount) shownCount = flatRows.length;

      if (totalEl) {
        if (!total) {
          totalEl.textContent = uiT('No tasks', 'אין משימות');
        } else if (total > PAGE_SIZE) {
          var from = currentStart + 1;
          var to = Math.min(currentStart + shownCount, total);
          totalEl.textContent = total + ' ' + uiT('tasks · showing', 'משימות · מוצגות') + ' ' + from + '–' + to;
        } else {
          totalEl.textContent = total + ' ' + uiT('tasks', 'משימות');
        }
      }

      var html = '';
      groups.forEach(function(g, idx) {
        if (!g.rows || !g.rows.length) return;
        var groupColor = '#1d60a2';
        var gId = g.id || ('group_' + idx);
        var tasksLabel = uiT('Tasks', 'משימות');
        var labelStr = esc(g.label === 'משימות' || g.label === 'Tasks' ? tasksLabel : g.label);
        var countLabel = total > PAGE_SIZE ? (g.rows.length + ' / ' + total) : String(g.total != null ? g.total : g.rows.length);

        html += '<div class="task-group-container" data-group-id="' + esc(gId) + '">';
        html += '<div class="task-group-header">' +
                '<span class="task-group-dot" style="background:' + groupColor + ';"></span>' +
                '<span class="task-group-title">' + labelStr + '</span>' +
                '<span class="task-group-count">• ' + countLabel + '</span>' +
                '</div>';
        html += g.rows.map(function(m) { return missionRow(m, today); }).join('');
        html += '</div>';
      });

      if (!html && flatRows.length) {
        var flatCount = total > PAGE_SIZE ? (flatRows.length + ' / ' + total) : String(flatRows.length);
        html += '<div class="task-group-container">';
        html += '<div class="task-group-header"><span class="task-group-dot"></span><span class="task-group-title">' + esc(uiT('Tasks', 'משימות')) + '</span><span class="task-group-count">• ' + flatCount + '</span></div>';
        html += flatRows.map(function(m) { return missionRow(m, today); }).join('');
        html += '</div>';
      }

      if (!html) {
        html = '<div style="text-align:center; padding:40px 20px; color:var(--text-sub); font-weight:600;">' + esc(uiT('No tasks found.', 'לא נמצאו משימות.')) + '</div>';
      } else {
        html += renderPager(total, shownCount);
      }

      if (mount) {
        mount.innerHTML = html;
        wirePager();

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
      // Soft refresh failed — keep existing rows; only show error on first/manual load
      if (silent && hasRows) {
        console.warn('[TasksLive] silent refresh failed — keeping list', err);
        return;
      }
      console.error(err);
      if (mount) mount.innerHTML = '<div style="color:#c0392b; text-align:center; padding:20px;">' + esc(uiT('Failed to load tasks.', 'טעינת משימות נכשלה.')) + '</div>';
    }
    })();

    if (silent) {
      _tasksLoadInFlight = run.then(function (v) {
        _tasksLoadInFlight = null;
        return v;
      }, function (e) {
        _tasksLoadInFlight = null;
        throw e;
      });
      return _tasksLoadInFlight;
    }
    return run;
  }

  var _tasksBooted = false;

  function start(opts) {
    opts = opts || {};
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    if (_tasksBooted && !opts.force) {
      // Still wire listeners once if first start raced before mount
      return;
    }
    _tasksBooted = true;
    wireFilterChips();
    populateQuickMissionDropdowns();
    wireQuickMission();
    syncFilterBadge();
    loadTasks(currentFilterType || 'show_all_together_tasks');

    if (!liveListenersWired) {
      liveListenersWired = true;
      // Same pattern as Biz1_task: socket event → silent Mission.List re-fetch (no Loading flash)
      if (window.LiveSync && typeof LiveSync.bind === 'function') {
        LiveSync.bind(function (detail) {
          scheduleLiveTasksRefresh(detail || {});
        }, {
          keys: /mission|task|ticket|socket\.nudge/i,
          mount: '#mb-live-tasks',
          delay: 300,
          // Retries handled inside scheduleLiveTasksRefresh (only for real mission CRUD)
          retries: false
        });
      } else {
        window.addEventListener('mineralbar:realtime', function (ev) {
          scheduleLiveTasksRefresh((ev && ev.detail) || {});
        });
        window.addEventListener('mineralbar:missions', function (ev) {
          scheduleLiveTasksRefresh((ev && ev.detail) || {});
          var list = document.getElementById('mb-live-tasks');
          if (list && window.Biz1Pulse) window.Biz1Pulse(list);
        });
        window.addEventListener('mineralbar:page-refresh', function (ev) {
          scheduleLiveTasksRefresh((ev && ev.detail) || {});
        });
      }
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
      filterBtn.addEventListener('click', openFilterPanel);
    }
    
    var closeFilterBtn = document.getElementById('close-filter-panel');
    if (closeFilterBtn && !closeFilterBtn.dataset.mbWired) {
      closeFilterBtn.dataset.mbWired = '1';
      closeFilterBtn.addEventListener('click', closeFilterPanel);
    }

    var filterPanel = document.getElementById('task-filter-panel');
    if (filterPanel && !filterPanel.dataset.mbWired) {
      filterPanel.dataset.mbWired = '1';
      filterPanel.addEventListener('click', function (e) {
        if (e.target === filterPanel) closeFilterPanel();
      });
    }

    var applyBtn = document.getElementById('apply-task-filters');
    if (applyBtn && !applyBtn.dataset.mbWired) {
      applyBtn.dataset.mbWired = '1';
      applyBtn.addEventListener('click', applyAdvancedFilters);
    }

    var resetBtn = document.getElementById('reset-task-filters');
    if (resetBtn && !resetBtn.dataset.mbWired) {
      resetBtn.dataset.mbWired = '1';
      resetBtn.addEventListener('click', resetAdvancedFilters);
    }
  }

  window.addEventListener('mineralbar:ready', function () { setTimeout(start, 150); });
  window.addEventListener('mineralbar:language-changed', function () {
    if (typeof loadTasks === 'function') loadTasks(typeof currentFilterType !== 'undefined' ? currentFilterType : undefined, { silent: true });
    else start({ force: true });
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 200); });
  } else {
    setTimeout(start, 200);
  }

  if (window.LiveSync && typeof LiveSync.bind === 'function') {
    // Already bound inside start() when LiveSync is present
  } else if (window.MineralBarApp && MineralBarApp.bindLiveReload) {
    MineralBarApp.bindLiveReload(function (detail) {
      scheduleLiveTasksRefresh(detail || {});
    }, { keys: /mission|task|ticket|socket\.nudge/i, delay: 80 });
  }

})();
