(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getUrgency(mission) {
    var color = String((mission && mission.color) || '').toLowerCase();
    var priority = String((mission && mission.priority) || '').toLowerCase();
    var meta = {};
    try { meta = JSON.parse((mission && mission.meta) || '{}') || {}; } catch (e) { /* ignore */ }
    var he = String(meta.priority_he || '');
    
    var p = 'normal';
    if (/urgent|דחוף|גבוה/i.test(priority) || /דחוף|גבוה/i.test(he) || color === '#ef4444' || color === '#c0392b' || color === 'red' || color === '#f59e0b') p = 'urgent';
    else if (/low|נמוכ/i.test(priority) || /נמוכ/i.test(he) || color === '#22c55e' || color === '#2e8a63') p = 'low';
    else {
      var note = String((mission && mission.note) || '');
      if (/עדיפות:\s*urgent|priority:\s*urgent|\burgent\b/i.test(note)) p = 'urgent';
      else if (/עדיפות:\s*low|priority:\s*low|\blow\b/i.test(note)) p = 'low';
      else if (color === '#fdf1dd' || color === '#bd8324' || color === 'yellow' || color === 'orange') p = 'urgent';
    }
    
    function tr(key, fallback) {
      if (window.t) {
        var v = window.t(key);
        if (v && v !== key) return v;
      }
      return fallback;
    }

    if (color === '#ef4444' || color === '#c0392b' || color === 'red') {
      return { cls: 'badge-critical', text: tr('priority_critical', 'Critical') };
    }
    if (p === 'urgent') return { cls: 'badge-high', text: tr('priority_urgent', 'Urgent') };
    if (p === 'low') return { cls: 'badge-low', text: tr('priority_low', 'Low') };
    return { cls: 'badge-medium', text: tr('priority_normal', 'Normal') };
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

  function getMissionId(m) {
    if (!m) return '';
    return String((m.mission_id != null ? m.mission_id : (m.id != null ? m.id : (m.ID != null ? m.ID : '')))).trim();
  }

  function getMissionTitle(m) {
    if (!m) return '';
    var raw = m.mission || m.title || m.name || m.mission_name || m.subject || m.task || m.note || m.description || '';
    raw = String(raw).trim();
    if (raw) return translateTitle(raw);
    var mid = getMissionId(m);
    var prefix = window.t ? (window.t('appName') || window.t('tasks') || 'Mission') : 'Mission';
    return prefix + (mid ? ' #' + mid : '');
  }

  function normalizeKanbanColumn(m) {
    if (!m) return 'to_do';
    if (m.is_done || Number(m.done) === 1) {
      return 'completed';
    }
    var raw = String(m.project_column || m.status || '').trim();
    if (raw.indexOf('p_') === 0) raw = raw.slice(2);
    raw = raw.toLowerCase();

    if (raw === 'completed' || raw === 'done' || raw === 'finish' || raw === 'finished' || raw === 'closed') {
      return 'completed';
    }
    if (raw === 'in_progress' || raw === 'progress' || raw === 'doing' || raw === 'process') {
      return 'in_progress';
    }
    if (raw === 'pending_review' || raw === 'pending' || raw === 'review' || raw === 'waiting' || raw === 'testing' || raw === 'queries') {
      return 'pending_review';
    }
    if (raw === 'to_do' || raw === 'todo' || raw === 'open' || raw === 'new') {
      return 'to_do';
    }
    return 'to_do';
  }

  function renderCard(m) {
    var mid = getMissionId(m);
    m.id = mid;
    var title = getMissionTitle(m);
    var urgency = getUrgency(m);
    var date = String(m.date_to_do || '').split(' ')[0];
    var avatar = m.user_id || m.create_by || mid || '?';
    var initial = String(avatar).charAt(0).toUpperCase();
    var colStatus = normalizeKanbanColumn(m);

    return `
      <div class="kanban-card" draggable="true" data-id="${esc(mid)}" data-mission="${esc(JSON.stringify(m))}" data-col="${esc(colStatus)}">
        <div class="badge ${urgency.cls}">${esc(urgency.text)}</div>
        <div class="kanban-card-title" title="${esc(title)}">${esc(title)}</div>
        <div class="kanban-card-footer">
          <div class="kanban-card-date">${esc(date)}</div>
          <div class="kanban-card-avatar">${esc(initial)}</div>
        </div>
      </div>
    `;
  }

  async function loadKanban() {
    try {
      // Fetch both open tasks and completed/done tasks so all columns are populated
      var [openResult, doneResult] = await Promise.all([
        MineralBarApp.listMissions({
          type: 'show_all_together_tasks',
          length: 50,
          start: 0,
          draw: 1,
          include_counts: 1
        }),
        MineralBarApp.listMissions({
          type: 'done_tasks',
          length: 50,
          start: 0,
          draw: 1,
          include_counts: 1
        }).catch(function() { return { rows: [] }; })
      ]);

      var openRows = (openResult && openResult.rows) || [];
      if (!openRows.length && openResult && openResult.groups) {
        openResult.groups.forEach(function (g) {
          (g.rows || []).forEach(function (r) { openRows.push(r); });
        });
      }

      var doneRows = (doneResult && doneResult.rows) || [];
      if (!doneRows.length && doneResult && doneResult.groups) {
        doneResult.groups.forEach(function (g) {
          (g.rows || []).forEach(function (r) { doneRows.push(r); });
        });
      }

      doneRows.forEach(function (m) {
        m.is_done = 1;
        m.done = 1;
        if (!m.project_column || m.project_column === 'to_do') {
          m.project_column = 'completed';
        }
      });

      var seen = Object.create(null);
      var allRows = [];
      openRows.concat(doneRows).forEach(function (m) {
        var id = String((m && (m.mission_id != null ? m.mission_id : m.id)) || '');
        if (!id) {
          allRows.push(m);
          return;
        }
        if (seen[id]) return;
        seen[id] = true;
        allRows.push(m);
      });

      var columns = {
        'to_do': [],
        'in_progress': [],
        'pending_review': [],
        'completed': []
      };

      allRows.forEach(function (m) {
        var col = normalizeKanbanColumn(m);
        m.project_column = col;
        columns[col].push(m);
      });

      ['to_do', 'in_progress', 'pending_review', 'completed'].forEach(col => {
        var el = document.getElementById('col-' + col);
        var countEl = document.getElementById('count-' + col);
        if (el) {
          el.innerHTML = columns[col].map(renderCard).join('');
        }
        if (countEl) {
          countEl.textContent = columns[col].length;
        }
      });

      attachDragAndDrop();
    } catch (err) {
      console.error('[MineralBar] Kanban load failed', err);
    }
  }

  var draggedCard = null;

  function attachDragAndDrop() {
    var cards = document.querySelectorAll('.kanban-card');
    var columnBoxes = document.querySelectorAll('.kanban-column');

    cards.forEach(card => {
      card.addEventListener('dragstart', function (e) {
        draggedCard = card;
        setTimeout(() => card.classList.add('is-dragging'), 0);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.getAttribute('data-id'));
      });

      card.addEventListener('dragend', function (e) {
        draggedCard = null;
        card.classList.remove('is-dragging');
        columnBoxes.forEach(colBox => colBox.classList.remove('drag-over'));
      });
      
      card.addEventListener('click', function(e) {
        if (card.classList.contains('is-dragging')) return;
        var missionData = {};
        try { missionData = JSON.parse(card.getAttribute('data-mission') || '{}'); } catch(err) {}
        openTaskDetail(missionData);
      });
    });

    // Close panel logic
    var closeBtn = document.getElementById('close-task-panel');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        document.getElementById('task-detail-panel').style.display = 'none';
      });
    }

    columnBoxes.forEach(colBox => {
      var body = colBox.querySelector('.kanban-column-body') || colBox;
      var targetStatus = colBox.getAttribute('data-status') || body.id.replace('col-', '');

      colBox.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        colBox.classList.add('drag-over');
      });

      colBox.addEventListener('dragleave', function (e) {
        if (!colBox.contains(e.relatedTarget)) {
          colBox.classList.remove('drag-over');
        }
      });

      colBox.addEventListener('drop', function (e) {
        e.preventDefault();
        colBox.classList.remove('drag-over');
        if (!draggedCard) return;

        var targetCard = e.target.closest('.kanban-card');
        if (targetCard && targetCard !== draggedCard && targetCard.parentNode === body) {
          body.insertBefore(draggedCard, targetCard);
        } else {
          body.appendChild(draggedCard);
        }

        draggedCard.setAttribute('data-col', targetStatus);

        // Synchronize local data-mission so clicking the card shows the new status
        var missionData = {};
        try { missionData = JSON.parse(draggedCard.getAttribute('data-mission') || '{}'); } catch(err) {}
        missionData.project_column = targetStatus;
        if (targetStatus === 'completed') {
          missionData.is_done = 1;
          missionData.done = 1;
        } else {
          missionData.is_done = 0;
          missionData.done = 0;
        }
        draggedCard.setAttribute('data-mission', JSON.stringify(missionData));

        updateCounts();

        // Trigger pulse animation
        draggedCard.classList.remove('pulse-animation');
        void draggedCard.offsetWidth;
        draggedCard.classList.add('pulse-animation');
        setTimeout(() => draggedCard.classList.remove('pulse-animation'), 1200);

        var missionId = draggedCard.getAttribute('data-id');
        console.log('[Kanban] Moved mission', missionId, 'to', targetStatus);

        // 1. Update project_column via Mission.Update
        if (MineralBarApp && typeof MineralBarApp.updateMission === 'function') {
          MineralBarApp.updateMission({
            id: missionId,
            filed: 'project_column',
            saveoutput: targetStatus
          }).then(function(res) {
            console.log('[Kanban] Mission project_column updated:', res);
          }).catch(function(err) {
            console.error('[Kanban] Failed to update project_column:', err);
          });
        }

        // 2. If moved to completed, also mark done via Mission.Done (like in Manage/Tasks)
        if (targetStatus === 'completed') {
          if (MineralBarApp && typeof MineralBarApp.doneMission === 'function') {
            MineralBarApp.doneMission(missionId).then(function(res) {
              console.log('[Kanban] Mission marked done in Biz1 CRM:', res);
            }).catch(function(err) {
              console.warn('[Kanban] Mission.Done call notice:', err);
            });
          }
        }

        // 3. Dispatch realtime event so Tasks (manage) and Home sync their counts immediately
        window.dispatchEvent(new CustomEvent('mineralbar:missions', {
          detail: { source: 'kanban-drag', action: 'update', id: missionId, project_column: targetStatus, is_done: targetStatus === 'completed' ? 1 : 0 }
        }));
      });
    });
  }

  function updateCounts() {
    ['to_do', 'in_progress', 'pending_review', 'completed'].forEach(col => {
      var count = document.querySelectorAll('#col-' + col + ' .kanban-card').length;
      var countEl = document.getElementById('count-' + col);
      if (countEl) countEl.textContent = count;
    });
  }


  var started = false;
  function start() {
    if (started) return;
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    if (!document.getElementById('kanban-board') && !document.querySelector('.kanban-board')) {
      // allow pages that use different mount ids to still run once authenticated
    }
    started = true;
    if (window.setGreeting) window.setGreeting();
    if (window.enableDragScroll) window.enableDragScroll('.drag-horizontal');
    loadKanban();

    window.addEventListener('mineralbar:missions', function (e) {
      if (e && e.detail && e.detail.source === 'kanban-drag') return;
      clearTimeout(window.__mbKanbanRtTimer);
      window.__mbKanbanRtTimer = setTimeout(function () {
        loadKanban();
        var board = document.getElementById('kanban-board');
        if (board && window.Biz1Pulse) window.Biz1Pulse(board);
      }, 400);
    });
  }

  window.addEventListener('mineralbar:ready', () => setTimeout(start, 150));
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(start, 200));
  } else {
    setTimeout(start, 200);
  }
})();
