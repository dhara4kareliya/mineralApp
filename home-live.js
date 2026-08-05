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

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
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
      ? 'service-create-task.html?mission_id=' + encodeURIComponent(id)
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
        '<div style="padding:18px 2px;font-size:13.5px;font-weight:600;color:#9aa3b0;">' + esc(t('No open tasks right now', 'אין משימות פתוחות כרגע')) + '</div>' +
        '<a href="sales-tasks.html" style="display:inline-block;margin-top:6px;font-size:13px;font-weight:800;color:#1d60a2;text-decoration:none;">' + esc(t('All tasks', 'לכל המשימות')) + ' ←</a>';
      return;
    }
    missionsEl.innerHTML =
      prioritized.map(function (m) { return missionRow(m, today); }).join('') +
      '<a href="sales-tasks.html" style="display:block;text-align:center;padding:14px 2px 4px;font-size:13px;font-weight:800;color:#1d60a2;text-decoration:none;">' +
      esc(t('All tasks', 'כל המשימות')) + ' (' + missionTotal + ') ←</a>';
  }

  function enableDragScroll(slider) {
    if (!slider) return;
    var isDown = false;
    var startX;
    var scrollLeft;
    var isDragging = false;
    
    slider.addEventListener('mousedown', function(e) {
      isDown = true;
      isDragging = false;
      slider.style.cursor = 'grabbing';
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    });
    slider.addEventListener('mouseleave', function() {
      isDown = false;
      slider.style.cursor = 'grab';
    });
    slider.addEventListener('mouseup', function() {
      isDown = false;
      slider.style.cursor = 'grab';
    });
    slider.addEventListener('mousemove', function(e) {
      if (!isDown) return;
      e.preventDefault();
      isDragging = true;
      var x = e.pageX - slider.offsetLeft;
      var walk = (x - startX) * 1.5; 
      slider.scrollLeft = scrollLeft - walk;
    });
    slider.addEventListener('click', function(e) {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
    slider.addEventListener('dragstart', function(e) {
      e.preventDefault();
    });
  }

  var _homeBooted = false;
  var _homeInFlight = null;

  async function loadHome(opts) {
    opts = opts || {};
    var silent = !!opts.silent;
    if (_homeInFlight) return _homeInFlight;

    _homeInFlight = (async function () {
      try {
        await loadHomeBody(opts);
      } finally {
        _homeInFlight = null;
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
    enableDragScroll(document.getElementById('mb-sales-pipeline-scroll'));

    if (!silent) {
      setText('mb-stat-closed', '…');
      setText('mb-stat-leads', '…');
      setText('mb-stat-followup', '…');
      setText('mb-stat-chats', '…');
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
      var results = await Promise.all([
        MineralBarApp.countCustomers(MineralBarApp.FOLDERS.LEADS).catch(function () { return { count: 0 }; }),
        MineralBarApp.countMissions({}).catch(function () { return { count: 0 }; }),
        MineralBarApp.listChatConversations({ page: 1, limit: 1 }).catch(function () { return { total: 0 }; }),
        MineralBarApp.listMissions({ length: 100, start: 0, draw: 1 }).catch(function () { return { rows: [], total: 0 }; })
      ]);

      // Re-query after await — DC/React can replace nodes while requests are in flight
      setGreeting();
      setAvatar();

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

      var prioritized = openMissions.slice().sort(function (a, b) {
        // Today first, then overdue, then the rest
        var ao = isToday(a, today) ? 0 : (isOverdue(a, today) ? 1 : 2);
        var bo = isToday(b, today) ? 0 : (isOverdue(b, today) ? 1 : 2);
        if (ao !== bo) return ao - bo;
        return String(missionDayKey(a)).localeCompare(String(missionDayKey(b)));
      }).slice(0, 5);

      setText('mb-stat-closed', String(missionTotal));
      setText('mb-stat-closed-sub', doneCount
        ? (doneCount + ' ' + t('done in sample', 'בוצעו בדגימה'))
        : t('Total tasks', 'סה״כ משימות'));
      setText('mb-stat-leads', String(leadsCount));
      setText('mb-stat-leads-sub', t('Folder 1 · Leads', 'תיקייה 1 · לידים'));
      setText('mb-stat-followup', String((todayCount + overdueCount) || openEstimate || missionTotal));
      setText('mb-stat-followup-sub', overdueCount
        ? (todayCount + ' ' + t('today', 'היום') + ' · ' + overdueCount + ' ' + t('overdue', 'באיחור'))
        : (todayCount + ' ' + t('for today', 'להיום')));
      setText('mb-stat-chats', String(chatTotal));
      setText('mb-stat-chats-sub', t('Open conversations', 'שיחות פתוחות'));
      setText('mb-pipe-leads', String(leadsCount));
      setText('mb-pipe-followup', String(openEstimate || missionTotal));

      renderMissions(prioritized, missionTotal, today);
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

  function start(opts) {
    opts = opts || {};
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    if (!document.getElementById('mb-live-home')) {
      // DC may not have mounted yet
      if (!window.__mbHomeMountTries) window.__mbHomeMountTries = 0;
      if (window.__mbHomeMountTries++ < 12) {
        setTimeout(function () { start(opts); }, 50);
      }
      return;
    }
    window.__mbHomeMountTries = 0;
    if (_homeBooted && !opts.force) return;
    _homeBooted = true;
    loadHome(opts.silent ? { silent: true } : {});
  }

  window.addEventListener('mineralbar:ready', function () { setTimeout(start, 40); });
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

    // Real mission CRUD → silent retries (API lag). Poll / other → one silent refresh.
    var delays = /mission\.(done|created|updated|deleted|reopened)/.test(key)
      ? [300, 1000, 2400]
      : [180];

    window.__mbHomeRtTimer = setTimeout(function () {
      loadHome({ silent: true });
      delays.slice(1).forEach(function (ms) {
        window.__mbHomeRtRetries.push(setTimeout(function () {
          loadHome({ silent: true });
        }, ms));
      });
    }, delays[0]);
  }
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
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 200); });
  } else {
    setTimeout(start, 40);
  }

  if (window.LiveSync && typeof LiveSync.bind === 'function') {
    LiveSync.bind(function (detail) {
      onHomeLiveRefresh(detail || {});
    }, {
      keys: /mission|task|ticket|message|chat|lead|customer|socket\.nudge/i,
      mount: '#mb-live-home',
      delay: 250,
      retries: true
    });
  } else if (window.MineralBarApp && MineralBarApp.bindLiveReload) {
    MineralBarApp.bindLiveReload(function (detail) {
      if (!document.getElementById('mb-live-home')) return;
      onHomeLiveRefresh(detail || {});
    }, { keys: /mission|task|ticket|message|chat|lead|customer|socket\.nudge/i, delay: 80 });
  }

})();
