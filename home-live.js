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

  function t(en, he) {
    if (typeof window.mbT === 'function') return window.mbT(en, he);
    var lang = (typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage()) || 'he';
    return lang === 'en' ? en : he;
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
      var d = new Date(m.date_to_do_format);
      if (!Number.isNaN(d.getTime())) {
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      }
    }
    var raw = String(m.date_to_do || '');
    var m1 = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (m1) return m1[3] + '-' + pad(+m1[2]) + '-' + pad(+m1[1]);
    var m2 = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m2) return m2[1] + '-' + m2[2] + '-' + m2[3];
    return '';
  }

  function isDone(m) {
    if (!m) return false;
    if (m.is_done || Number(m.done) === 1 || Number(m.is_complete) === 1) return true;
    var st = String(m.status || m.mission_status || m.state || m.status_name || '').toLowerCase();
    return st === 'done' || st === 'complete' || st === 'completed' || st === 'closed' ||
      st === 'בוצע' || st === 'הושלם' || st === 'סגור';
  }

  function isOpen(m) {
    return !isDone(m);
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
    if (k && k < today) return t('Overdue', 'באיחור') + (time ? ' · ' + time : '');
    if (k === today) return time ? (t('Today', 'היום') + ' ' + time) : t('Today', 'היום');
    return raw || k || '';
  }

  function priorityLabel(m, today) {
    if (isOverdue(m, today)) return { text: t('Urgent', 'דחוף'), color: '#d0432f' };
    if (isToday(m, today)) return { text: t('Today', 'היום'), color: '#1d60a2' };
    var color = String(m.color || '').toLowerCase();
    if (color === '#ef4444' || color === '#c0392b') return { text: t('Urgent', 'דחוף'), color: '#d0432f' };
    return { text: t('Open', 'פתוח'), color: '#7b8595' };
  }

  /** Folder 1 internal status "סגירה" — not a global customer status / header dropdown. */
  var CLOSED_LEAD_STATUS = 10184;
  var CLOSED_LEAD_PAGE = 25;

  function currentMonthRange() {
    var now = new Date();
    var y = now.getFullYear();
    var m = now.getMonth();
    var from = y + '-' + pad(m + 1) + '-01';
    var last = new Date(y, m + 1, 0).getDate();
    var to = y + '-' + pad(m + 1) + '-' + pad(last);
    return { from: from, to: to };
  }

  function rowDayKey(raw) {
    var s = String(raw == null ? '' : raw).trim();
    var m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (!m) return '';
    return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
  }

  function isClosedThisMonth(row, range) {
    if (!row || Number(row.status) !== CLOSED_LEAD_STATUS) return false;
    var k = rowDayKey(row.last_updated);
    return !!(k && range && k >= range.from && k <= range.to);
  }

  function closedLeadListTotal(raw, counted) {
    var src = raw && typeof raw === 'object' ? raw : {};
    var n = Number(src.recordsTotal || src.total_record || src.totalrecords || src.totalRecords || 0);
    if (isFinite(n) && n > CLOSED_LEAD_PAGE) return n;
    var fromCount = Number(counted && counted.count);
    if (isFinite(fromCount) && fromCount > CLOSED_LEAD_PAGE) return fromCount;
    return 0;
  }

  /**
   * How many leads were closed this month (status 10184 + last_updated in month).
   * API from_date filters date_created, so we paginate all folder-1 pages and filter in-app.
   * Do not send status= on Count/List.
   */
  async function countClosedLeadsThisMonth(range) {
    var folderId = 1;
    try {
      if (window.MineralBarApp && MineralBarApp.FOLDERS && MineralBarApp.FOLDERS.LEADS != null) {
        folderId = MineralBarApp.FOLDERS.LEADS;
      }
    } catch (e0) { /* stay on 1 */ }

    var counted = await MineralBarApp.countCustomers(folderId).catch(function () {
      return { count: 0 };
    });
    var totalHint = closedLeadListTotal(counted && counted.raw, counted);
    var closed = 0;
    var start = 0;
    var pages = 0;
    var seen = {};
    var maxPages = 200;

    while (pages < maxPages) {
      var list = await MineralBarApp.listCustomers({
        folder_id: folderId,
        start: start,
        limit: CLOSED_LEAD_PAGE,
        length: CLOSED_LEAD_PAGE,
        draw: 1
      }).catch(function () { return { rows: [] }; });
      var rows = list.rows || list.data || [];
      if (!totalHint) totalHint = closedLeadListTotal(list, counted);

      var newOnPage = 0;
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var id = String((row && (row.id || row.customer_id || row.cust_id)) || ('i-' + start + '-' + i));
        if (seen[id]) continue;
        seen[id] = 1;
        newOnPage += 1;
        if (isClosedThisMonth(row, range)) closed += 1;
      }

      pages += 1;
      start += CLOSED_LEAD_PAGE;
      if (rows.length < CLOSED_LEAD_PAGE) break;
      if (newOnPage === 0) break;
      if (totalHint > CLOSED_LEAD_PAGE && start >= totalHint) break;
    }

    return closed;
  }

  function isFollowupLead(row) {
    if (!row) return false;
    var status = [
      row.sub_list_data_name, row.internal_status_name, row.status_label,
      row.status_name, row.status_text, row.status
    ].map(function (v) { return String(v == null ? '' : v); }).join(' ').toLowerCase();
    if (/follow|פולוא|מעקב/.test(status)) return true;
    if (row.followup) {
      var ts = new Date(row.followup).getTime();
      if (!isNaN(ts) && ts <= Date.now()) return true;
    }
    return false;
  }

  function isDcTemplate(el) {
    return !!(el && el.closest && el.closest('x-dc'));
  }

  /** All matching ids — DC/React can clone the template, so getElementById hits the hidden one. */
  function liveNodes(id) {
    var nodes = document.querySelectorAll('[id="' + String(id).replace(/"/g, '') + '"]');
    var visible = [];
    var i;
    for (i = 0; i < nodes.length; i++) {
      if (!isDcTemplate(nodes[i])) visible.push(nodes[i]);
    }
    return visible.length ? visible : Array.prototype.slice.call(nodes);
  }

  var _lastPaint = {};

  function setText(id, text) {
    text = String(text);
    if (text !== '…') _lastPaint[id] = text;
    var nodes = liveNodes(id);
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = text;
    if (id === 'mb-pipe-followup') {
      var badges = document.querySelectorAll('[data-pipe-count="followup"]');
      for (var j = 0; j < badges.length; j++) {
        if (isDcTemplate(badges[j]) && nodes.length) continue;
        badges[j].textContent = text;
      }
    }
  }

  function repaintCounts() {
    Object.keys(_lastPaint).forEach(function (id) {
      var text = _lastPaint[id];
      var nodes = liveNodes(id);
      for (var i = 0; i < nodes.length; i++) nodes[i].textContent = text;
    });
    if (_lastPaint['mb-pipe-followup'] != null) {
      var badges = document.querySelectorAll('[data-pipe-count="followup"]');
      for (var j = 0; j < badges.length; j++) {
        if (isDcTemplate(badges[j])) continue;
        badges[j].textContent = _lastPaint['mb-pipe-followup'];
      }
    }
  }

  function scheduleRepaint() {
    [0, 80, 250, 800, 1800].forEach(function (ms) {
      setTimeout(repaintCounts, ms);
    });
  }

  function greetingName() {
    var user = MineralBarApp.getUser() || {};
    var email = MineralBarApp.getEmail() || '';
    return user.name || user.user_name || (email ? email.split('@')[0] : t('Hello', 'שלום'));
  }

  function greetingPrefix() {
    var h = new Date().getHours();
    if (h < 12) return t('Good morning', 'בוקר טוב');
    if (h < 17) return t('Good afternoon', 'צהריים טובים');
    return t('Good evening', 'ערב טוב');
  }

  function missionRow(m, today) {
    var id = m.mission_id || m.id || '';
    var title = m.mission || m.title || (t('Task #', 'משימה #') + id);
    var customer = m.customer_name || '';
    if (customer && title.indexOf(customer) === -1) title = customer + ' — ' + title;
    var when = formatWhen(m, today);
    var pri = priorityLabel(m, today);
    var dot = isOverdue(m, today) ? '#d0432f' : '#1d60a2';
    var href = id
      ? 'service-create-task.html?mission_id=' + encodeURIComponent(id) + '&from=home'
      : 'sales-tasks.html';
    return (
      '<a href="' + href + '" style="display:flex;align-items:center;gap:11px;padding:14px 2px;border-bottom:1px solid #f0f2f5;text-decoration:none;">' +
      '<span style="width:8px;height:8px;border-radius:50%;background:' + dot + ';flex:none;"></span>' +
      '<div style="flex:1;min-width:0;">' +
      '<div style="font-size:15px;font-weight:700;color:#16223a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(title) + '</div>' +
      '<div style="font-size:12.5px;font-weight:600;color:#9aa3b0;margin-top:3px;">' + esc(when) + '</div>' +
      '</div>' +
      '<span style="font-size:11.5px;font-weight:700;color:#7b8595;background:#eef0f3;border-radius:99px;padding:4px 12px;flex:none;">' +
      esc(pri.text) + '</span></a>'
    );
  }

  function setGreeting() {
    var greet = document.getElementById('mb-home-greeting');
    if (greet) greet.textContent = greetingPrefix() + ', ' + greetingName() + ' 👋';
  }

  function setAvatar() {
    var user = window.MineralBarApp ? MineralBarApp.getUser() || {} : {};
    var avatarUrl = user.avatar || user.picture || user.photo_url || user.image;
    var btn = document.getElementById('btn-logout-avatar');
    if (!btn) return;

    if (avatarUrl) {
      btn.innerHTML = '<img src="' + esc(avatarUrl) + '" style="width:100%; height:100%; border-radius:50%; object-fit:cover; border:none;" alt="Avatar">';
      btn.style.padding = '0';
      btn.style.overflow = 'hidden';
    } else if (user.name || user.user_name || user.email) {
      var nameStr = String(user.name || user.user_name || user.email || 'U').trim();
      var initial = nameStr.charAt(0).toUpperCase();
      
      var colors = ['#1d60a2', '#bd8324', '#2e8a63', '#d0432f', '#50439d', '#e6b422'];
      var hash = 0;
      for (var i = 0; i < nameStr.length; i++) {
        hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
      }
      var color = colors[Math.abs(hash) % colors.length];

      btn.innerHTML = '<div style="width:100%; height:100%; border-radius:50%; background:' + color + '; color:#fff; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:800;">' + esc(initial) + '</div>';
      btn.style.padding = '0';
      btn.style.overflow = 'hidden';
      btn.style.background = 'transparent';
    }
  }

  function missionsMount() {
    return document.getElementById('mb-live-home-missions');
  }

  function renderMissions(prioritized, missionTotal, today) {
    var missionsEl = missionsMount();
    if (!missionsEl) return;
    if (!prioritized.length) {
      missionsEl.innerHTML =
        '<div style="padding:18px 2px;font-size:13.5px;font-weight:600;color:#9aa3b0;">' + esc(t('No tasks due today or overdue', 'אין משימות להיום או באיחור')) + '</div>' +
        '<a href="sales-tasks.html" style="display:inline-block;margin-top:6px;font-size:13px;font-weight:800;color:#1d60a2;text-decoration:none;">' + esc(t('All tasks', 'לכל המשימות')) + ' ←</a>';
      return;
    }
    missionsEl.innerHTML =
      prioritized.map(function (m) { return missionRow(m, today); }).join('') +
      '<a href="sales-tasks.html" style="display:block;text-align:center;padding:14px 2px 4px;font-size:13px;font-weight:800;color:#1d60a2;text-decoration:none;">' +
      esc(t('All tasks', 'כל המשימות')) + ' (' + missionTotal + ') ←</a>';
  }

  function enableDragScroll(slider) {
    if (!slider || slider.dataset.dragScrollWired === '1') return;
    slider.dataset.dragScrollWired = '1';
    slider.classList.add('mb-h-drag');

    var isDown = false;
    var startX = 0;
    var scrollLeft = 0;
    var isDragging = false;
    var pointerId = null;

    function onDown(clientX, e) {
      isDown = true;
      isDragging = false;
      slider.classList.add('is-dragging');
      startX = clientX;
      scrollLeft = slider.scrollLeft;
      if (e && e.pointerId != null && slider.setPointerCapture) {
        pointerId = e.pointerId;
        try { slider.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
    }

    function onMove(clientX, e) {
      if (!isDown) return;
      var dx = clientX - startX;
      if (Math.abs(dx) > 4) isDragging = true;
      // Same formula works for LTR and RTL scrollLeft (incl. negative RTL values)
      slider.scrollLeft = scrollLeft - dx;
      if (isDragging && e && e.cancelable) e.preventDefault();
    }

    function onUp() {
      if (!isDown) return;
      isDown = false;
      slider.classList.remove('is-dragging');
      if (pointerId != null && slider.releasePointerCapture) {
        try { slider.releasePointerCapture(pointerId); } catch (err) { /* ignore */ }
      }
      pointerId = null;
      setTimeout(function () { isDragging = false; }, 0);
    }

    if (window.PointerEvent) {
      slider.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        onDown(e.clientX, e);
      });
      slider.addEventListener('pointermove', function (e) {
        onMove(e.clientX, e);
      });
      slider.addEventListener('pointerup', onUp);
      slider.addEventListener('pointercancel', onUp);
    } else {
      slider.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        onDown(e.clientX, e);
      });
      window.addEventListener('mousemove', function (e) {
        onMove(e.clientX, e);
      });
      window.addEventListener('mouseup', onUp);

      slider.addEventListener('touchstart', function (e) {
        if (!e.touches || !e.touches.length) return;
        onDown(e.touches[0].clientX, e);
      }, { passive: true });
      slider.addEventListener('touchmove', function (e) {
        if (!e.touches || !e.touches.length) return;
        onMove(e.touches[0].clientX, e);
      }, { passive: false });
      slider.addEventListener('touchend', onUp);
      slider.addEventListener('touchcancel', onUp);
    }

    slider.addEventListener('click', function (e) {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
    slider.addEventListener('dragstart', function (e) {
      e.preventDefault();
    });
  }

  function wirePipelineDrag() {
    enableDragScroll(document.getElementById('mb-sales-pipeline-scroll'));
  }

  var _homeBooted = false;
  var _homeInFlight = null;
  var _homeQueued = null;

  function flattenMissionRows(res) {
    var rows = (res && res.rows) ? res.rows.slice() : [];
    if (!rows.length && res && res.groups) {
      res.groups.forEach(function (g) {
        if (g.id === 'done' || g.key === 'done') return;
        (g.rows || []).forEach(function (r) { rows.push(r); });
      });
    }
    return rows;
  }

  async function listHomeMissions() {
    var pageSize = 25;
    var first = await MineralBarApp.listMissions({
      length: pageSize,
      start: 0,
      draw: 1,
      show_done_mission: 0,
      include_counts: 1
    });
    var rows = flattenMissionRows(first);
    var total = Number(first.total) || rows.length;
    if (rows.length >= total || rows.length < pageSize) {
      return { rows: rows, total: total };
    }
    var starts = [];
    var start;
    for (start = rows.length; start < total; start += pageSize) {
      starts.push(start);
      if (starts.length >= 20) break;
    }
    var rest = await Promise.all(starts.map(function (s) {
      return MineralBarApp.listMissions({
        length: pageSize,
        start: s,
        draw: 1,
        show_done_mission: 0,
        include_counts: 0
      }).catch(function () { return { rows: [] }; });
    }));
    rest.forEach(function (res) {
      rows = rows.concat(flattenMissionRows(res));
    });
    return { rows: rows, total: total };
  }

  async function loadHome(opts) {
    opts = opts || {};
    if (_homeInFlight) {
      _homeQueued = { silent: true };
      return _homeInFlight;
    }

    _homeInFlight = (async function () {
      try {
        await loadHomeBody(opts);
      } finally {
        _homeInFlight = null;
      }
      if (_homeQueued) {
        var next = _homeQueued;
        _homeQueued = null;
        return loadHome(next);
      }
    })();
    return _homeInFlight;
  }

  async function loadHomeBody(opts) {
    opts = opts || {};
    var silent = !!opts.silent;
    var today = todayKey();
    setGreeting();
    setAvatar();
    wirePipelineDrag();

    if (!silent) {
      setText('mb-stat-closed', '…');
      setText('mb-stat-leads', '…');
      setText('mb-stat-followup', '…');
      setText('mb-stat-followups', '…');
      setText('mb-pipe-leads', '…');
      setText('mb-pipe-followup', '…');

      var loadingEl = missionsMount();
      if (loadingEl) {
        if (window.MineralBarLoader && typeof MineralBarLoader.inlineHtml === 'function') {
          loadingEl.innerHTML = MineralBarLoader.inlineHtml(t('Loading tasks…', 'טוען משימות…'));
        } else {
          loadingEl.innerHTML =
            '<div class="mb-inline-loader">' +
            '<div class="mb-page-loader__spin" aria-hidden="true"></div>' +
            '<div class="mb-page-loader__label">' + esc(t('Loading tasks…', 'טוען משימות…')) + '</div>' +
            '</div>';
        }
      }
    }

    try {
      var monthRange = currentMonthRange();
      var results = await Promise.all([
        MineralBarApp.countCustomers(MineralBarApp.FOLDERS.LEADS).catch(function () { return { count: 0 }; }),
        MineralBarApp.countMissions({}).catch(function () { return { count: 0 }; }),
        MineralBarApp.listCustomers({
          folder_id: MineralBarApp.FOLDERS.LEADS,
          length: 100,
          start: 0,
          draw: 1
        }).catch(function () { return { rows: [] }; }),
        listHomeMissions().catch(function () { return { rows: [], total: 0 }; }),
        countClosedLeadsThisMonth(monthRange).catch(function () { return 0; })
      ]);

      // Re-query after await — DC/React can replace nodes while requests are in flight
      setGreeting();
      setAvatar();

      var leadsCount = Number(results[0].count) || 0;
      var missionTotal = Number(results[1].count) || Number(results[3].total) || 0;
      var leadRows = results[2].rows || results[2].data || [];
      var followupCount = leadRows.filter(isFollowupLead).length;
      var closedCount = Number(results[4]) || 0;

      var rows = flattenMissionRows(results[3]);
      try { sessionStorage.removeItem('mb_missions_dirty'); } catch (e2) {}

      var openMissions = rows.filter(isOpen);
      var doneCount = rows.filter(isDone).length;
      var overdueMissions = openMissions.filter(function (m) {
        return isOverdue(m, today);
      });
      var dueNowMissions = openMissions.filter(function (m) {
        return isToday(m, today) || isOverdue(m, today);
      });
      var openEstimate = Number(results[3].total) || dueNowMissions.length;
      var overdueCount = overdueMissions.length;

      // Home widget: only 5 latest today / overdue tasks (not the full open list)
      var prioritized = dueNowMissions.slice().sort(function (a, b) {
        var aOver = isOverdue(a, today);
        var bOver = isOverdue(b, today);
        if (aOver !== bOver) return aOver ? -1 : 1; // overdue before today
        var ka = String(missionDayKey(a) || '') + 'T' + String(a.date_to_do || a.date_to_do_format || a.updated || a.id || '');
        var kb = String(missionDayKey(b) || '') + 'T' + String(b.date_to_do || b.date_to_do_format || b.updated || b.id || '');
        return kb.localeCompare(ka); // latest first within group
      }).slice(0, 5);

      setText('mb-stat-closed', String(missionTotal));
      setText('mb-stat-closed-sub', doneCount
        ? (doneCount + ' ' + t('done in sample', 'בוצעו בדגימה'))
        : t('Total tasks', 'סה״כ משימות'));
      setText('mb-stat-leads-label', t('Closed leads', 'לידים שנסגרו'));
      setText('mb-stat-leads', String(closedCount));
      setText('mb-stat-leads-sub', t('This month', 'החודש'));
      setText('mb-stat-followup', String(overdueCount || 0));
      setText('mb-stat-followup-sub', t('Overdue', 'באיחור'));
      setText('mb-stat-followup-label', t('Open tasks', 'משימות פתוחות'));
      setText('mb-stat-followups', String(followupCount));
      setText('mb-stat-followups-sub', t('Follow-up', 'פולואפ'));
      setText('mb-pipe-leads', String(leadsCount));
      setText('mb-pipe-followup', String(followupCount));
      scheduleRepaint();

      renderMissions(prioritized, openEstimate, today);
    } catch (err) {
      if (silent) {
        console.warn('[HomeLive] silent refresh failed — keeping dashboard', err);
        return;
      }
      console.error('[MineralBar] home dashboard failed', err);
      var missionsEl = missionsMount();
      if (missionsEl) {
        missionsEl.innerHTML =
          '<div style="padding:14px 2px;color:#c0392b;font:700 13px Heebo,sans-serif;">' +
          esc(t('Error loading dashboard', 'שגיאה בטעינת לוח הבקרה')) + '</div>';
      }
    }
  }

  function homeReady() {
    var homes = liveNodes('mb-live-home');
    if (!homes.length) return false;
    // Wait until DC replaces <x-dc> with the visible React tree
    if (document.querySelector('x-dc') && !document.getElementById('dc-root')) return false;
    return true;
  }

  function start(opts) {
    opts = opts || {};
    wirePipelineDrag();
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    if (!homeReady()) {
      if (!window.__mbHomeMountTries) window.__mbHomeMountTries = 0;
      if (window.__mbHomeMountTries++ < 50) {
        setTimeout(function () { start(opts); }, 80);
        return;
      }
      if (!document.getElementById('mb-live-home')) return;
    }
    window.__mbHomeMountTries = 0;
    wirePipelineDrag();
    var dirty = false;
    try { dirty = !!sessionStorage.getItem('mb_missions_dirty'); } catch (e0) {}
    if (_homeBooted && !opts.force && !dirty) return;
    _homeBooted = true;
    loadHome(opts.silent ? { silent: true } : {});
  }

  // Boot once when auth is ready (not also on every pageshow / double LiveSync bind).
  window.addEventListener('mineralbar:ready', function () { setTimeout(start, 40); }, { once: true });
  window.addEventListener('pageshow', function (ev) {
    if (!ev || !ev.persisted) return;
    if (!document.getElementById('mb-live-home')) return;
    loadHome({ silent: true });
  });
  window.addEventListener('mineralbar:language-changed', function () {
    // Re-render live strings in the selected language (DOM translator skips #mb-live-*)
    if (document.getElementById('mb-live-home')) start({ force: true, silent: true });
  });
  function onHomeLiveRefresh(detail) {
    if (!document.getElementById('mb-live-home')) return;
    detail = detail || {};
    var key = String(detail.key || '').toLowerCase();
    if (/^socket\.(connect|connected|disconnect)(\.|$)/i.test(key)) return;
    if (/^socket\.nudge\.visible$/i.test(key) || key === 'pageshow' || key === 'visible') return;

    clearTimeout(window.__mbHomeRtTimer);
    if (window.__mbHomeRtRetries) {
      window.__mbHomeRtRetries.forEach(clearTimeout);
    }
    window.__mbHomeRtRetries = [];

    // One debounced refresh here. LiveSync (when bound) owns API-lag retries.
    var delay = /mission\.(done|created|updated|deleted|reopened)/.test(key) ? 300 : 180;
    var extraRetries = !window.__mbHomeLiveBound && /mission\.(done|created|updated|deleted|reopened)/.test(key)
      ? [1000, 2400]
      : [];

    window.__mbHomeRtTimer = setTimeout(function () {
      loadHome({ silent: true });
      extraRetries.forEach(function (ms) {
        window.__mbHomeRtRetries.push(setTimeout(function () {
          loadHome({ silent: true });
        }, ms));
      });
    }, delay);
  }

  // Wire pipeline drag even before auth/API — CSS + gestures should work immediately.
  wirePipelineDrag();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wirePipelineDrag);
  }
  setTimeout(wirePipelineDrag, 120);
  setTimeout(wirePipelineDrag, 400);

  if (window.MineralBarApp && MineralBarApp.isAuthenticated && MineralBarApp.isAuthenticated()) {
    setTimeout(start, 40);
  }

  if (window.LiveSync && typeof LiveSync.bind === 'function') {
    window.__mbHomeLiveBound = true;
    LiveSync.bind(function (detail) {
      onHomeLiveRefresh(detail || {});
    }, {
      keys: /mission|task|ticket|message|chat|lead|customer|socket\.nudge/i,
      mount: '#mb-live-home',
      delay: 250,
      retries: true
    });
  } else if (window.MineralBarApp && MineralBarApp.bindLiveReload) {
    window.__mbHomeLiveBound = true;
    MineralBarApp.bindLiveReload(function (detail) {
      if (!document.getElementById('mb-live-home')) return;
      onHomeLiveRefresh(detail || {});
    }, { keys: /mission|task|ticket|message|chat|lead|customer|socket\.nudge/i, delay: 80 });
  } else {
    window.addEventListener('mineralbar:missions', function (ev) {
      onHomeLiveRefresh((ev && ev.detail) || {});
    });
    window.addEventListener('mineralbar:messages', function (ev) {
      onHomeLiveRefresh((ev && ev.detail) || {});
    });
    window.addEventListener('mineralbar:leads', function (ev) {
      onHomeLiveRefresh((ev && ev.detail) || {});
    });
    window.addEventListener('mineralbar:page-refresh', function (ev) {
      onHomeLiveRefresh((ev && ev.detail) || {});
    });
    window.addEventListener('mineralbar:realtime', function (ev) {
      var detail = (ev && ev.detail) || {};
      var key = String(detail.key || '').toLowerCase();
      if (!key || /mission|task|ticket|message|chat|lead|customer|crm|socket\.nudge/.test(key)) {
        onHomeLiveRefresh(detail);
      }
    });
  }

})();
