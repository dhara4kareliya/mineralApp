/**
 * Live Mission.List for מכירות משימות / shared tasks screen.
 * Empty → empty state. API failure → show error text + retry.
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

  function apiErrorText(err) {
    if (!err) return 'שגיאת API לא ידועה';
    var parts = [];
    if (err.message) parts.push(err.message);
    if (err.route) parts.push('route: ' + err.route);
    if (err.status) parts.push('status: ' + err.status);
    if (err.raw && err.raw.message && err.raw.message !== err.message) {
      parts.push(String(err.raw.message).slice(0, 400));
    }
    return parts.join('\n') || String(err);
  }

  function pickMission(row) {
    var id = row.mission_id || row.id || row.ID || '';
    var title = row.mission || row.title || row.name || row.mission_name || row.subject || row.task || ('משימה #' + id);
    var desc = row.note || row.description || row.desc || row.notes || row.details || '';
    var when = row.due_display || row.date_to_do || row.date_to_do_format || row.due_date || row.date || row.time || '';
    var customer = row.customer_name || row.contact_name || row.cname || '';
    var customerId = row.customer_id || row.lead_id || row.contactus_id || '';
    if (customer && title.indexOf(customer) === -1) title = customer + ' — ' + title;
    return { id: id, title: title, desc: desc, when: when, customerId: customerId, raw: row };
  }

  function loadingHtml() {
    return (
      '<div style="text-align:center;padding:40px 20px;">' +
      '<div style="font-size:14px;font-weight:700;color:#8a93a3;">טוען מהשרת…</div>' +
      '<div style="font-size:12px;color:#b6bdc8;margin-top:6px;">Mission.List</div>' +
      '</div>'
    );
  }

  function emptyHtml() {
    return (
      '<div style="text-align:center;padding:48px 20px;">' +
      '<div style="width:56px;height:56px;border-radius:50%;background:#e3e7ec;display:flex;align-items:center;justify-content:center;margin:0 auto 13px;">' +
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#aab2bf" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="m8 11 2.5 2.5L15 9M8 17h6"/></svg>' +
      '</div>' +
      '<div style="font-size:15px;font-weight:800;color:#5a6473;">אין משימות כרגע</div>' +
      '<div style="font-size:12.5px;color:#9aa3b0;margin-top:6px;">Mission.List · הרשימה ריקה</div>' +
      '</div>'
    );
  }

  function errorHtml(err) {
    return (
      '<div style="background:#fbeeed;border:1px solid #f0c9c4;border-radius:14px;padding:14px 14px 16px;margin:8px 0;">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0392b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>' +
      '<div style="font-size:14px;font-weight:800;color:#c0392b;">שגיאת API</div>' +
      '</div>' +
      '<pre style="margin:0;white-space:pre-wrap;word-break:break-word;font:600 11.5px/1.5 Heebo,monospace;color:#7a2e28;max-height:280px;overflow:auto;">' +
      esc(apiErrorText(err)) +
      '</pre>' +
      '<button type="button" id="mb-missions-retry" style="margin-top:12px;padding:9px 14px;border:none;border-radius:10px;background:#c0392b;color:#fff;font:800 13px Heebo,sans-serif;cursor:pointer;">נסה שוב</button>' +
      '</div>'
    );
  }

  function sectionHeader(group) {
    return (
      '<div style="display:flex;align-items:center;gap:7px;margin:16px 2px 11px;">' +
      '<span style="width:8px;height:8px;border-radius:50%;background:' + group.color + ';"></span>' +
      '<span style="font-size:13.5px;font-weight:800;color:#1f2a3a;">' + esc(group.label) + '</span>' +
      '<span style="font-size:13px;font-weight:700;color:#9aa3b0;">• ' + group.total + '</span>' +
      '</div>'
    );
  }

  function missionCard(m, group) {
    var href;
    if (m.customerId) {
      try {
        sessionStorage.setItem('mb_customer_id', String(m.customerId));
        localStorage.setItem('mb_customer_id', String(m.customerId));
      } catch (e) { /* ignore */ }
      href = encodeURI('כרטיס ליד.dc.html') +
        '?customer_id=' + encodeURIComponent(m.customerId) +
        '&cust_id=' + encodeURIComponent(m.customerId) +
        '&id=' + encodeURIComponent(m.customerId);
    } else if (m.id) {
      href = encodeURI('שירות צור משימה.dc.html') + '?mission_id=' + encodeURIComponent(m.id);
    } else {
      href = '#';
    }
    return (
      '<a href="' + href + '" class="task-card" style="background:#fff;border-radius:16px;padding:14px 15px;margin-bottom:11px;box-shadow:0 1px 3px rgba(0,0,0,.05);border-right:4px solid ' + group.color + ';display:flex;align-items:flex-start;gap:11px;text-decoration:none;cursor:pointer;">' +
      '<div style="flex:1;">' +
      '<div style="font-size:15.5px;font-weight:800;color:#1f2a3a;">' + esc(m.title) + '</div>' +
      (m.desc ? '<div style="font-size:13px;color:#7b8595;margin-top:3px;">' + esc(m.desc) + '</div>' : '') +
      (m.when
        ? '<div style="margin-top:9px;"><span style="display:inline-flex;align-items:center;gap:5px;background:' + group.badgeBg + ';color:' + group.badgeColor + ';font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:99px;">' + esc(m.when) + '</span></div>'
        : '') +
      '</div>' +
      '<span style="width:22px;height:22px;border-radius:50%;border:2px solid #cbd2dc;flex:none;"></span>' +
      '</a>'
    );
  }

  function groupPlaceholder(group) {
    // API often returns HTML-only buckets without JSON rows
    return (
      '<div style="background:#fff;border-radius:14px;padding:14px;margin-bottom:11px;border-right:4px solid ' + group.color + ';box-shadow:0 1px 3px rgba(0,0,0,.05);">' +
      '<div style="font-size:14px;font-weight:800;color:#1f2a3a;">' + group.total + ' משימות ב־' + esc(group.label) + '</div>' +
      '<div style="font-size:12px;color:#9aa3b0;margin-top:5px;">השרת החזיר סיכום ללא שורות JSON</div>' +
      '</div>'
    );
  }

  async function loadMissions(el) {
    el.innerHTML = loadingHtml();
    var totalEl = document.getElementById('mb-missions-total');
    if (totalEl) totalEl.textContent = 'טוען…';

    try {
      var result = await MineralBarApp.listMissions({ type: 'show_all_together_tasks', length: 25, start: 0, draw: 1, include_counts: 1 });
      var groups = result.groups || [];
      var flatRows = result.rows || [];
      var total = result.total || 0;

      if (totalEl) {
        var shown = flatRows.length || groups.reduce(function (n, g) { return n + ((g.rows && g.rows.length) || 0); }, 0);
        totalEl.textContent = total + ' משימות' + (shown && shown < total ? ' · מוצגות ' + shown : '');
      }

      if (!total && !flatRows.length) {
        el.innerHTML = emptyHtml();
        return;
      }

      var html = '';
      groups.forEach(function (g) {
        if (!g.total && !(g.rows && g.rows.length)) return;
        html += sectionHeader(g);
        if (g.rows && g.rows.length) {
          g.rows.forEach(function (row) {
            html += missionCard(pickMission(row), g);
          });
        } else {
          html += groupPlaceholder(g);
        }
      });

      // Fallback: flat rows present but groups empty (shape mismatch)
      if (!html && flatRows.length) {
        var fallback = {
          id: 'all', label: 'משימות', color: '#1d60a2',
          badgeBg: '#eaf2fb', badgeColor: '#1d60a2', total: flatRows.length
        };
        html += sectionHeader(fallback);
        flatRows.forEach(function (row) {
          html += missionCard(pickMission(row), fallback);
        });
      }

      if (!html) html = emptyHtml();
      el.innerHTML = html;
    } catch (err) {
      console.error('[MineralBar] Mission.List failed', err);
      if (totalEl) totalEl.textContent = 'שגיאת API';
      el.innerHTML = errorHtml(err);
      var btn = document.getElementById('mb-missions-retry');
      if (btn) btn.addEventListener('click', function () { loadMissions(el); });
    }
  }

  var started = false;
  function start() {
    if (started) return;
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    var el = document.getElementById('mb-live-missions');
    if (!el) return;
    started = true;
    loadMissions(el);
  }

  window.addEventListener('mineralbar:ready', start);
  window.addEventListener('mineralbar:missions', function () {
    var el = document.getElementById('mb-live-missions');
    if (!el || !window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    clearTimeout(window.__mbMissionsRtTimer);
    window.__mbMissionsRtTimer = setTimeout(function () { loadMissions(el); }, 400);
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 50); });
  } else {
    setTimeout(start, 50);
  }
})();
