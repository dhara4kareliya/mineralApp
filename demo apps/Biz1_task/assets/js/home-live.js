/**
 * Live home dashboard for בית מכירות — counts + today's missions.
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

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function missionDayKey(m) {
    if (m.date_to_do_format) {
      // Some browsers successfully parse this, but if it has dots, it might fail.
      var d = new Date(m.date_to_do_format);
      if (!Number.isNaN(d.getTime())) {
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      }
    }
    var raw = String(m.date_to_do_format || m.date_to_do || m.date || '');
    console.log(raw);
    var m1 = raw.match(/^(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{4})/);
    if (m1) {
      // If year is matched in m1[3], format as YYYY-MM-DD
      return m1[3] + '-' + pad(+m1[2]) + '-' + pad(+m1[1]);
    }
    var m2 = raw.match(/^(\d{4})[\.\/-](\d{2})[\.\/-](\d{2})/);
    if (m2) {
      return m2[1] + '-' + m2[2] + '-' + m2[3];
    }
    return '';
  }

  function isDone(m) {
    return !!(m.is_done || Number(m.done) === 1);
  }

  function isOverdue(m, today) {
    if (isDone(m)) return false;
    var k = missionDayKey(m);
    return k && k < today;
  }

  function isToday(m, today) {
    if (isDone(m)) return false;
    return missionDayKey(m) === today;
  }

  function formatWhen(m, today) {
    if (m.due_display) return m.due_display;
    var k = missionDayKey(m);
    var raw = String(m.date_to_do || '');
    var time = '';
    var tm = raw.match(/(\d{1,2}):(\d{2})/);
    if (tm) time = pad(+tm[1]) + ':' + tm[2];
    if (k && k < today) return window.t('late') + (time ? ' · ' + time : '');
    if (k === today) return time ? (window.t('today') + ' ' + time) : window.t('today');
    return raw || k || '';
  }

  function priorityLabel(m, today) {
    if (isOverdue(m, today)) return { text: window.t('urgent'), color: '#d0432f' };
    if (isToday(m, today)) return { text: window.t('today'), color: '#1d60a2' };
    var color = String(m.color || '').toLowerCase();
    if (color === '#ef4444' || color === '#c0392b') return { text: window.t('urgent'), color: '#d0432f' };
    return { text: window.t('open'), color: '#7b8595' };
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
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

  function missionRow(m, today) {
    var id = m.mission_id || m.id || '';
    var title = m.mission || m.title || (window.t('משימה') + ' #' + id);
    title = translateTitle(title);
    var customer = m.customer_name || m.client_name || '';
    var when = formatWhen(m, today);
    var pri = priorityLabel(m, today);
    var dot = isOverdue(m, today) ? '#d0432f' : (m.color || '#1d60a2');
    var encodedMission = esc(JSON.stringify(m).replace(/'/g, '&#39;'));
    var href = id ? 'new_task.html?mission_id=' + encodeURIComponent(id) : 'tasks.html';
    return (
      '<a href="' + href + '" onclick="if(window.openTaskDetail) { window.openTaskDetail(' + encodedMission + '); return false; }" class="home-mission-row">' +
      '<span class="home-mission-dot" style="background:' + dot + ';"></span>' +
      '<div class="home-mission-content">' +
      '<div class="home-mission-title">' + esc(title) + '</div>' +
      (customer ? '<div style="font-size:12px; font-weight:600; color:var(--text-sub); margin-top:2px;">' + esc(customer) + '</div>' : '') +
      '<div class="home-mission-date">' + esc(when) + '</div>' +
      '</div>' +
      '<span class="home-mission-badge" style="color:' + pri.color + ';background:' + pri.bg + ';">' +
      esc(pri.text) + '</span></a>'
    );
  }

  function missionsMount() {
    return document.getElementById('mb-live-home-missions');
  }

  function renderMissions(prioritized, missionTotal, today) {
    var missionsEl = missionsMount();
    if (!missionsEl) return;
    if (!prioritized.length) {
      missionsEl.innerHTML =
        '<div style="padding:18px 2px;font-size:13.5px;font-weight:600;color:#9aa3b0;">' + esc(window.t('no_open_tasks')) + '</div>' +
        '<a href="tasks.html" style="display:inline-block;margin-top:6px;font-size:13px;font-weight:800;color:#1d60a2;text-decoration:none;">' + esc(window.t('all_tasks_arrow')) + '</a>';
      return;
    }
    missionsEl.innerHTML =
      prioritized.map(function (m) { return missionRow(m, today); }).join('') +
      '<a href="tasks.html" style="display:block;text-align:center;padding:14px 2px 4px;font-size:13px;font-weight:800;color:#1d60a2;text-decoration:none;">' + esc(window.t('all_tasks_count')) + ' (' +
      missionTotal + ') ←</a>';
  }

  async function loadHome() {
    var today = todayKey();
    setGreeting();

    setText('mb-stat-closed', '…');
    setText('mb-stat-leads', '…');
    setText('mb-stat-followup', '…');
    setText('mb-stat-chats', '…');
    setText('mb-pipe-leads', '…');
    setText('mb-pipe-followup', '…');

    var loadingEl = missionsMount();
    if (loadingEl) {
      loadingEl.innerHTML =
        '<div style="padding:18px 2px;font-size:13px;font-weight:700;color:#8a93a3;">' + esc(window.t('loading_tasks')) + '</div>';
    }

    try {
      var results = await Promise.all([
        MineralBarApp.countCustomers(MineralBarApp.FOLDERS.LEADS).catch(function () { return { count: 0 }; }),
        MineralBarApp.countMissions({}).catch(function () { return { count: 0 }; }),
        MineralBarApp.listChatConversations({ page: 1, limit: 1 }).catch(function () { return { total: 0 }; }),
        MineralBarApp.listMissions({ type: 'today_tasks', length: 25, start: 0, draw: 1, include_counts: 1 }).catch(function () { return { rows: [], total: 0 }; })
      ]);

      // Re-query after await — DC/React can replace nodes while requests are in flight
      setGreeting();

      var leadsCount = Number(results[0].count) || 0;
      var missionTotal = Number(results[1].count) || Number(results[3].total) || 0;
      var chatTotal = Number(results[2].total != null ? results[2].total : results[2].rows && results[2].rows.length) || 0;

      var rows = results[3].rows || [];
      if (!rows.length && results[3].groups) {
        results[3].groups.forEach(function (g) {
          (g.rows || []).forEach(function (r) { rows.push(r); });
        });
      }

      var openMissions = rows.filter(function (m) { return !isDone(m); });
      var doneCount = rows.filter(isDone).length;
      var overdueCount = openMissions.filter(function (m) { return isOverdue(m, today); }).length;
      var todayCount = openMissions.filter(function (m) { return isToday(m, today); }).length;
      var openEstimate = openMissions.length;

      var prioritized = openMissions.filter(function(m) {
        return isToday(m, today) || isOverdue(m, today);
      }).sort(function (a, b) {
        var ao = isOverdue(a, today) ? 0 : 1;
        var bo = isOverdue(b, today) ? 0 : 1;
        if (ao !== bo) return ao - bo;
        return String(missionDayKey(a)).localeCompare(String(missionDayKey(b)));
      }).slice(0, 5);

      setText('mb-stat-closed', String(missionTotal));
      setText('mb-stat-closed-sub', doneCount ? (doneCount + ' ' + window.t('done_in_sample')) : window.t('total_tasks'));
      
      setText('mb-stat-followup', String((todayCount + overdueCount) || openEstimate || missionTotal));
      setText('mb-stat-followup-sub', overdueCount ? (overdueCount + ' ' + window.t('late') + ' · ' + todayCount + ' ' + window.t('today')) : (todayCount + ' ' + window.t('for_today')));
      
      var countFollow = openMissions.filter(function(m) { 
        var t = String(m.mission || m.title || '').toLowerCase(); 
        return t.indexOf('שיחת פולואפ') !== -1 || t.indexOf('follow-up call') !== -1 || t.indexOf('follow-up') !== -1; 
      }).length;
      var countOffer = openMissions.filter(function(m) { 
        var t = String(m.mission || m.title || '').toLowerCase(); 
        return t.indexOf('שליחת הצעה') !== -1 || t.indexOf('offer sent') !== -1; 
      }).length;
      var countPics = openMissions.filter(function(m) { 
        var t = String(m.mission || m.title || '').toLowerCase(); 
        return t.indexOf('שליחת תמונות') !== -1 || t.indexOf('sending picture') !== -1; 
      }).length;

      setText('mb-pipe-follow', String(countFollow));
      setText('mb-pipe-offer', String(countOffer));
      setText('mb-pipe-pics', String(countPics));

      renderMissions(prioritized, missionTotal, today);
      // One more paint after DC settle
      setTimeout(function () {
        setGreeting();
        renderMissions(prioritized, missionTotal, today);
      }, 300);
    } catch (err) {
      console.error('[MineralBar] home dashboard failed', err);
      var missionsEl = missionsMount();
      if (missionsEl) {
        missionsEl.innerHTML =
          '<div style="padding:14px 2px;color:#c0392b;font:700 13px Heebo,sans-serif;">' + esc(window.t('error_dashboard')) + '</div>';
      }
    }
  }

  function start() {
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    if (window.__mbHomeStarted) return;
    if (window.setGreeting) window.setGreeting();
    if (window.enableDragScroll) window.enableDragScroll('.drag-horizontal');
    if (!document.getElementById('mb-live-home')) {
      // DC may not have mounted yet
      if (!window.__mbHomeMountTries) window.__mbHomeMountTries = 0;
      if (window.__mbHomeMountTries++ < 20) {
        setTimeout(start, 100);
      }
      return;
    }
    window.__mbHomeMountTries = 0;
    window.__mbHomeStarted = true;
    loadHome();
  }

  window.addEventListener('mineralbar:ready', function () { setTimeout(start, 150); });
  window.addEventListener('mineralbar:missions', function () {
    if (!document.getElementById('mb-live-home')) return;
    clearTimeout(window.__mbHomeRtTimer);
    window.__mbHomeRtTimer = setTimeout(loadHome, 400);
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 200); });
  } else {
    setTimeout(start, 200);
  }
})();
