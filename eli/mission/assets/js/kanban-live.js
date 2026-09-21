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
    
    if (color === '#ef4444' || color === '#c0392b' || color === 'red') {
      return { cls: 'badge-critical', text: window.t ? (window.t('priority_critical') || window.t('priority_urgent') || 'Urgent') : 'Urgent' };
    }
    if (p === 'urgent') return { cls: 'badge-high', text: window.t ? (window.t('priority_urgent') || 'Urgent') : 'Urgent' };
    if (p === 'low') return { cls: 'badge-low', text: window.t ? (window.t('priority_low') || 'Low') : 'Low' };
    return { cls: 'badge-medium', text: window.t ? (window.t('priority_normal') || 'Normal') : 'Normal' };
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

  function renderCard(m) {
    var title = m.mission || m.title || (window.t('משימה') + ' #' + m.id);
    title = translateTitle(title);
    var urgency = getUrgency(m);
    var date = m.date_to_do || '';
    var avatar = m.user_id || m.create_by || '?';
    var initial = String(avatar).charAt(0).toUpperCase();

    return `
      <div class="kanban-card" draggable="true" data-id="${m.id}" data-mission="${esc(JSON.stringify(m))}" data-col="${m.project_column || 'to_do'}">
        <div class="badge ${urgency.cls}">${esc(urgency.text)}</div>
        <div class="kanban-card-title">${esc(title)}</div>
        <div class="kanban-card-footer">
          <div class="kanban-card-date">${esc(date)}</div>
          <div class="kanban-card-avatar">${esc(initial)}</div>
        </div>
      </div>
    `;
  }

  async function loadKanban() {
    try {
      var result = await MineralBarApp.listMissions({
        type: 'show_all_together_tasks',
        length: 25,
        start: 0,
        draw: 1,
        include_counts: 1
      });
      var rows = result.rows || [];
      if (!rows.length && result.groups) {
        result.groups.forEach(function (g) {
          (g.rows || []).forEach(function (r) { rows.push(r); });
        });
      }
      // Live only: one card per mission_id (no duplicates from groups/paging)
      var seen = Object.create(null);
      rows = rows.filter(function (m) {
        var id = String((m && (m.mission_id != null ? m.mission_id : m.id)) || '');
        if (!id) return true;
        if (seen[id]) return false;
        seen[id] = true;
        return true;
      });

      var columns = {
        'to_do': [],
        'in_progress': [],
        'pending_review': [],
        'completed': []
      };

      rows.forEach(function (m) {
        var col = m.project_column || 'to_do';
        if (!columns[col]) col = 'to_do';
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
    var columns = document.querySelectorAll('.kanban-column-body');

    cards.forEach(card => {
      card.addEventListener('dragstart', function (e) {
        draggedCard = card;
        setTimeout(() => card.classList.add('is-dragging'), 0);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.getAttribute('data-id')); // Required for Firefox and smooth dragging
      });

      card.addEventListener('dragend', function (e) {
        draggedCard = null;
        card.classList.remove('is-dragging');
        columns.forEach(col => col.classList.remove('drag-over'));
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

    columns.forEach(col => {
      col.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        col.classList.add('drag-over');
      });

      col.addEventListener('dragleave', function (e) {
        col.classList.remove('drag-over');
      });

      col.addEventListener('drop', function (e) {
        e.preventDefault();
        col.classList.remove('drag-over');
        if (draggedCard) {
          var targetStatus = col.id.replace('col-', '');
          col.appendChild(draggedCard);
          draggedCard.setAttribute('data-col', targetStatus);
          updateCounts();
          
          // Trigger animation on the task card itself
          draggedCard.classList.remove('pulse-animation');
          void draggedCard.offsetWidth; // trigger reflow
          draggedCard.classList.add('pulse-animation');
          setTimeout(() => draggedCard.classList.remove('pulse-animation'), 1200);

          var missionId = draggedCard.getAttribute('data-id');
          console.log('Moved mission', missionId, 'to', targetStatus);
          
          // Update via API
          if (MineralBarApp && typeof MineralBarApp.updateMission === 'function') {
            MineralBarApp.updateMission({
              id: missionId,
              filed: 'project_column',
              saveoutput: targetStatus
            }).then(function(res) {
              console.log('Mission updated successfully', res);
            }).catch(function(err) {
              console.error('Failed to update mission', err);
            });
          }
        }
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

    window.addEventListener('mineralbar:missions', function () {
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
