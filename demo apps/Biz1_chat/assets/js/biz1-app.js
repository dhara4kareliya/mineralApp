/**
 * Biz1 Showcase — SDK bootstrap (Chat demo)
 * Domain comes from assets/config.js → Biz1Config.user
 * API base: https://{user}.bull36.com
 */
(function (global) {
  'use strict';

  function normalizeTenantUser(raw) {
    var s = String(raw == null ? '' : raw).trim().toLowerCase();
    s = s.replace(/^https?:\/\//, '');
    s = s.replace(/\.bull36\.com.*$/i, '');
    s = s.split('/')[0];
    s = s.replace(/[^a-z0-9-]/g, '');
    return s;
  }

  function resolveDomain() {
    var cfg = global.Biz1Config || {};
    var user = normalizeTenantUser(cfg.user || cfg.tenant || cfg.account);
    if (!user) {
      throw new Error('Set Biz1Config.user in assets/config.js (Bull36 subdomain)');
    }
    return 'https://' + user + '.bull36.com';
  }

  function getTenantUser() {
    var cfg = global.Biz1Config || {};
    return normalizeTenantUser(cfg.user || cfg.tenant || cfg.account);
  }

  var DOMAIN = resolveDomain();
  var USER_KEY = 'biz1demo_user_basic';
  var ROLE_KEY = 'biz1demo_role';
  var EMAIL_KEY = 'biz1demo_email';
  var REMEMBER_KEY = 'biz1demo_remember';
  var CRED_KEY = 'biz1demo_cred';
  var SESSION_PASS_KEY = 'biz1demo_session_pass';
  var EXPIRES_KEY = 'biz1demo_token_expires_at';

  /** Biz1 folder ids (from User.Basic) */
  var FOLDERS = {
    LEADS: 1,       // פניות חדשות / New Leads
    CUSTOMERS: 2,   // לקוחות
    MISSIONS: 3,    // משימות
    ARCHIVE: 4,
    TRASH: 5,
    SPAM: 6
  };

  var ROLE_HOME = {
    sales: 'conversation.html',
    service: 'conversation.html',
    tech: 'conversation.html'
  };

  /**
   * Intended screen → route map (what the UI should call).
   */
  var SCREEN_API = {
    'התחברות / login': { routes: ['Login', 'User.Basic'], status: 'ok' },
    'רשימת לידים': { routes: ['Customer.List', 'Customer.Count'], folder_id: FOLDERS.LEADS, status: 'live' },
    'לקוחות': { routes: ['Customer.List', 'Customer.Count'], folder_id: FOLDERS.CUSTOMERS, status: 'live' },
    'כרטיס ליד / כרטיס לקוח': { routes: ['Customer.Get'], status: 'live' },
    'הוספת ליד / לקוח': { routes: ['Customer.Add'], status: 'partial' },
    'משימות': { routes: ['Mission.List', 'Mission.Count', 'Mission.Create', 'Mission.Get', 'Mission.Update', 'Mission.Done'], status: 'live' },
    'צור משימה': { routes: ['Mission.Create', 'Mission.Get'], status: 'live' },
    'קריאות שירות / טכנאי': { routes: ['Ticket.List', 'Ticket.Count', 'Ticket.Get', 'Ticket.Add'], status: 'partial' },
    'הודעות (רשימה)': { routes: ['Chat.Conversations'], status: 'live' },
    'שיחה בודדת': { routes: ['Chat.SingleConversations', 'Chat.SendCustomer'], status: 'live' },
    'Realtime socket': {
      routes: ['client.realtime.connect', 'biz1:ready', 'biz1:event'],
      status: 'live',
      events: ['chat.message.received', 'whatsapp.message.received', 'whatsapp.inbox.refresh', 'mission.reminder', 'teamops.task.updated']
    },
    'הודעות / צ׳אט Inbox': { routes: ['Chat.Conversations', 'Chat.SingleConversations', 'Chat.SendCustomer'], status: 'live' },
    'שעון נוכחות': { routes: ['WorkingTime.List', 'WorkingTime.StartStop', 'WorkingTime.Save'], status: 'partial' },
    'מלאי': { routes: ['Products.List', 'Products.Count'], status: 'live' },
    'מסמכים / הצעות / הזמנות': { routes: ['Documents.BusinessList', 'Documents.List', 'Documents.Count'], status: 'live' },
    'חשבוניות / הזמנות (CRM)': { routes: ['Documents.BusinessList', 'Documents.List'], status: 'live' },
    'גבייה': { routes: ['PaymentForms.*', 'Settings.SaveCard'], status: 'unknown' }
  };

  function getClient() {
    if (!global.Biz1SDK || !global.Biz1SDK.Biz1Client) {
      throw new Error('Biz1 SDK not loaded. Include ' + DOMAIN + '/app/sdk/biz1-sdk.js');
    }
    if (!global.__biz1DemoClient) {
      global.__biz1DemoClient = new global.Biz1SDK.Biz1Client({
        domain: DOMAIN,
        storage: global.localStorage
      });
      installAuthInterceptor(global.__biz1DemoClient);
    }
    return global.__biz1DemoClient;
  }

  function encodeCred(obj) {
    try {
      return global.btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
    } catch (e) {
      return '';
    }
  }

  function decodeCred(raw) {
    try {
      return JSON.parse(decodeURIComponent(escape(global.atob(raw))));
    } catch (e) {
      return null;
    }
  }

  function saveCredentials(username, password, remember) {
    try {
      if (username) global.localStorage.setItem(EMAIL_KEY, username);
      if (password && global.sessionStorage) {
        global.sessionStorage.setItem(SESSION_PASS_KEY, password);
      }
      if (remember) {
        global.localStorage.setItem(REMEMBER_KEY, '1');
        global.localStorage.setItem(CRED_KEY, encodeCred({
          username: username,
          password: password
        }));
      } else {
        global.localStorage.removeItem(REMEMBER_KEY);
        global.localStorage.removeItem(CRED_KEY);
      }
    } catch (e) { /* ignore */ }
  }

  function clearCredentials(keepRememberedUsername) {
    try {
      if (global.sessionStorage) global.sessionStorage.removeItem(SESSION_PASS_KEY);
      global.localStorage.removeItem(CRED_KEY);
      global.localStorage.removeItem(REMEMBER_KEY);
      global.localStorage.removeItem(EXPIRES_KEY);
      if (!keepRememberedUsername) {
        /* email kept separately via clearSession options */
      }
    } catch (e) { /* ignore */ }
  }

  function getSavedCredentials() {
    try {
      var email = global.localStorage.getItem(EMAIL_KEY) || '';
      var pass = global.sessionStorage ? global.sessionStorage.getItem(SESSION_PASS_KEY) : '';
      if (email && pass) return { username: email, password: pass, source: 'session' };
      if (global.localStorage.getItem(REMEMBER_KEY) === '1') {
        var cred = decodeCred(global.localStorage.getItem(CRED_KEY) || '');
        if (cred && cred.username && cred.password) {
          return { username: cred.username, password: cred.password, source: 'remember' };
        }
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  function canAutoRefresh() {
    return !!getSavedCredentials();
  }

  function decodeBearerPayload(token) {
    try {
      var parts = String(token || '').split('.');
      if (parts.length < 2) return null;
      var b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      return JSON.parse(atob(b64));
    } catch (e) {
      return null;
    }
  }

  /**
   * Bridge-era tokens (iss=biz1-app-bridge / sid-only) still look "logged in"
   * but Customer.List returns 403 Permission denied for folder_id.
   * Node-app tokens carry user_id + permissions.folders.
   */
  function tokenNeedsRefresh() {
    try {
      var token = getClient().getToken();
      if (!token) return true;
      var payload = decodeBearerPayload(token);
      if (!payload) return false;
      if (payload.exp && Number(payload.exp) * 1000 < Date.now()) return true;
      if (payload.iss && payload.iss !== 'biz1-node-app') return true;
      if (!payload.user_id && !payload.permissions) return true;
      return false;
    } catch (e) {
      return false;
    }
  }

  function isAuthExpiredError(err) {
    if (!err) return false;
    var status = err.status != null ? Number(err.status) : null;
    if (status === 401 || status === 302) return true;
    var raw = err.raw || {};
    if (Number(raw.status) === 401 || Number(raw.status) === 302) return true;
    var msg = String(err.message || raw.message || raw.error || '').toLowerCase();
    if (/bearer token is missing|unauthorized|פג תוקף|status 302|401|invalid.?token|user not found/.test(msg)) {
      return true;
    }
    // Stale bridge token: folder ACL check fails as 403 instead of 401
    if (status === 403 && /permission denied for folder_id|folder_id/.test(msg)) return true;
    return false;
  }

  var refreshPromise = null;

  /**
   * Re-login with saved credentials when bearer token expired / cleared.
   */
  async function refreshSession(options) {
    options = options || {};
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async function () {
      var cred = getSavedCredentials();
      if (!cred) {
        var e = new Error('אין פרטי התחברות לשחזור טוקן');
        e.code = 'NO_SAVED_CREDENTIALS';
        throw e;
      }
      console.info('[Biz1Showcase] refreshing token via login…', cred.username);
      var result = await login({
        username: cred.username,
        password: cred.password,
        otp: options.otp || ''
      });
      if (result && result.otpRequired) {
        var e2 = new Error(result.message || 'נדרש OTP לחידוש התחברות');
        e2.code = 'OTP_REQUIRED';
        e2.otpRequired = true;
        throw e2;
      }
      if (!result || !result.ok) {
        throw new Error('חידוש ההתחברות נכשל');
      }
      // keep same remember preference
      var remember = global.localStorage.getItem(REMEMBER_KEY) === '1' || cred.source === 'remember';
      saveCredentials(cred.username, cred.password, remember);
      try {
        // reconnect socket with new bearer
        disconnectRealtime();
        connectRealtime().catch(function () { /* optional */ });
      } catch (e3) { /* ignore */ }
      dispatchAppEvent('mineralbar:auth-refreshed', {
        email: cred.username,
        role: result.role
      });
      return result;
    })();

    try {
      return await refreshPromise;
    } finally {
      refreshPromise = null;
    }
  }

  // --- Drag to Scroll Utility ---
  window.enableDragScroll = function(selector) {
    document.querySelectorAll(selector).forEach(function(slider) {
      if (slider.__dragScrollEnabled) return;
      slider.__dragScrollEnabled = true;
      var isDown = false;
      var startX;
      var scrollLeft;
      
      slider.addEventListener('mousedown', function(e) {
        isDown = true;
        slider.style.cursor = 'grabbing';
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
      });
      slider.addEventListener('mouseleave', function() {
        isDown = false;
        slider.style.cursor = '';
      });
      slider.addEventListener('mouseup', function() {
        isDown = false;
        slider.style.cursor = '';
      });
      slider.addEventListener('mousemove', function(e) {
        if (!isDown) return;
        e.preventDefault();
        var x = e.pageX - slider.offsetLeft;
        var walk = (x - startX) * 2; // scroll-fast
        slider.scrollLeft = scrollLeft - walk;
      });
    });
  };

  window.openTaskDetail = function(m) {
    var panel = document.getElementById('task-detail-panel');
    var content = document.getElementById('task-detail-content');
    
    if (!panel || !content) {
      panel = document.createElement('div');
      panel.id = 'task-detail-panel';
      panel.style.cssText = 'display:none; position:absolute; inset:0; background:var(--bg-screen, #fff); z-index:9999; flex-direction:column; overflow:hidden;';
      panel.innerHTML = `
        <div style="padding:14px 16px; border-bottom:1px solid var(--border-panel); display:flex; justify-content:space-between; align-items:center;">
          <h2 style="margin:0; font-size:16px; font-weight:800; color:var(--text-title);" id="global-task-detail-title-text">${window.t ? window.t('task_details') : 'Task Details'}</h2>
          <button id="close-global-task-panel" style="background:none; border:none; cursor:pointer; color:var(--text-sub);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div id="task-detail-content" class="dc-scroll" style="flex:1; overflow-y:auto; padding:16px; padding-bottom:40px;">
        </div>
      `;
      var container = document.querySelector('.screen-content') || document.body;
      container.appendChild(panel);
      content = document.getElementById('task-detail-content');
      document.getElementById('close-global-task-panel').addEventListener('click', function() {
        panel.style.display = 'none';
      });
    } else {
      var closeBtn = document.getElementById('close-task-panel');
      if (closeBtn && !closeBtn._hasGlobalListener) {
        closeBtn._hasGlobalListener = true;
        closeBtn.addEventListener('click', function() {
          panel.style.display = 'none';
        });
      }
    }
    
    function esc(s) {
      if (s === null || s === undefined) return '';
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function formatTaskDate(value) {
      if (value == null) return '';
      var raw = String(value).trim();
      if (!raw) return '';

      // ISO / SQL style date-time (yyyy-mm-dd[ hh:mm:ss]) -> stable dd/mm/yyyy display.
      var iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
      if (iso) {
        var ddIso = String(Number(iso[3])).padStart(2, '0');
        var mmIso = String(Number(iso[2])).padStart(2, '0');
        var yyyyIso = String(Number(iso[1]));
        if (iso[4]) {
          var hhIso = String(Number(iso[4])).padStart(2, '0');
          var minIso = String(Number(iso[5] || 0)).padStart(2, '0');
          return ddIso + '/' + mmIso + '/' + yyyyIso + ' ' + hhIso + ':' + minIso;
        }
        return ddIso + '/' + mmIso + '/' + yyyyIso;
      }

      // Keep slash/dot/hyphen dates deterministic; do not trust Date.parse on ambiguous locales.
      var local = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\D+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
      if (local) {
        var a = Number(local[1]);
        var b = Number(local[2]);
        var yyyy = String(Number(local[3]));
        var day = a;
        var month = b;
        // If only one side can be month, infer it to avoid obvious swaps.
        if (a <= 12 && b > 12) {
          day = b;
          month = a;
        }
        var dd = String(day).padStart(2, '0');
        var mm = String(month).padStart(2, '0');
        if (local[4]) {
          var hh = String(Number(local[4])).padStart(2, '0');
          var min = String(Number(local[5] || 0)).padStart(2, '0');
          return dd + '/' + mm + '/' + yyyy + ' ' + hh + ':' + min;
        }
        return dd + '/' + mm + '/' + yyyy;
      }

      return raw;
    }
    
    var title = m.mission || m.title || (window.t ? window.t('משימה') : 'משימה') + ' #' + m.id;
    if (window.t) {
      var parts = title.split(' — ');
      if (parts.length > 1) {
        parts[0] = window.t(parts[0]);
        title = parts.join(' — ');
      } else {
        var parts2 = title.split(' - ');
        if (parts2.length > 1) {
          parts2[0] = window.t(parts2[0]);
          title = parts2.join(' - ');
        } else {
          title = window.t(title);
        }
      }
    }
    var priority = m.priority || m.priority_he || m.priority_en || 'normal';
    // attempt to extract priority from meta if not directly on m
    if (m.meta) {
      try {
        var meta = JSON.parse(m.meta);
        if (meta.priority_he) priority = meta.priority_he;
      } catch(e) {}
    }
    // simple heuristic if still normal
    var color = String(m.color || '').toLowerCase();
    var note = String(m.note || '');
    var titleStr = String(m.mission || m.title || '');
    if (/דחוף|גבוה|urgent/i.test(priority) || color === '#ef4444' || color === '#c0392b' || color === '#f59e0b' || /urgent|דחוף/i.test(note)) priority = 'urgent';
    else if (/נמוכ|low/i.test(priority) || color === '#22c55e' || color === '#2e8a63' || /low/i.test(note)) priority = 'low';
    else priority = 'normal';
    
    var priLabel = window.t ? window.t('priority_' + priority) : priority;
    var priBg = priority === 'urgent' ? '#fef3c7' : (priority === 'low' ? '#e9f5ee' : '#eaf2fb');
    var priColor = priority === 'urgent' ? '#b45309' : (priority === 'low' ? '#2e8a63' : '#1d60a2');

    var statusKey = m.project_column || 'to_do';
    if (m.is_done || Number(m.done) === 1 || statusKey === 'done') statusKey = 'completed';
    var statusLabel = window.t ? (window.t('col_' + statusKey) || window.t(statusKey) || statusKey) : statusKey;
    var statusDotColor = statusKey === 'completed' ? '#22c55e' : (statusKey === 'in_progress' ? '#1d60a2' : (statusKey === 'pending' ? '#f59e0b' : '#3b82f6'));

    var membersArr = [];
    if (Array.isArray(m.members)) membersArr = m.members;
    else if (m.member_id) {
      try {
        var parsed = typeof m.member_id === 'string' ? JSON.parse(m.member_id) : m.member_id;
        if (Array.isArray(parsed)) membersArr = parsed;
        else membersArr = [parsed];
      } catch(e) { membersArr = [m.member_id]; }
    }
    
    var team = window.MineralBarApp && window.MineralBarApp.getTeamMembers ? window.MineralBarApp.getTeamMembers() : [];
    var members = membersArr.map(function(id) {
      var member = team.find(function(t) { return String(t.id) === String(id); });
      return member ? (member.name || member.email) : id;
    }).join(', ');
    if (!members) members = window.t ? window.t('no_assignee') : 'No assignee';
    
    var dateRaw = m.date_to_do || '';
    var date = dateRaw ? formatTaskDate(dateRaw) : (window.t ? window.t('not_set') : 'Not set');
    var time = m.time || '';
    var customer = m.customer_name || (window.t ? window.t('no_customer') : 'No customer');
    var desc = m.description || m.note || m.notes || '';
    var createdAtRaw = m.date_created || '';
    var createdAt = createdAtRaw ? formatTaskDate(createdAtRaw) : (window.t ? window.t('not_set') : 'Not set');
    
    var html = '<div style="font-size:22px; font-weight:800; color:var(--text-title); margin-bottom:24px; line-height:1.3;">' + esc(title) + '</div>';
    
    html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">';
    
    // Status
    html += '<div style="background:var(--bg-screen, #fff); border:1px solid var(--border-panel, #e4e8ee); border-radius:14px; padding:14px; box-shadow:0 4px 14px rgba(0,0,0,0.03);">';
    html += '<div style="font-size:11px; font-weight:800; color:var(--text-sub); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">' + (window.t ? window.t('status_label') : 'Status') + '</div>';
    html += '<div style="font-size:14px; font-weight:800; color:var(--text-title); display:flex; align-items:center; gap:6px;">';
    html += '<span style="width:8px; height:8px; border-radius:50%; background:' + statusDotColor + ';"></span>' + esc(statusLabel);
    html += '</div></div>';
    
    // Priority
    html += '<div style="background:var(--bg-screen, #fff); border:1px solid var(--border-panel, #e4e8ee); border-radius:14px; padding:14px; box-shadow:0 4px 14px rgba(0,0,0,0.03);">';
    html += '<div style="font-size:11px; font-weight:800; color:var(--text-sub); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">' + (window.t ? window.t('priority_label') : 'Priority') + '</div>';
    html += '<div><span style="background:' + priBg + ';color:' + priColor + ';font-size:12px;font-weight:800;padding:4px 10px;border-radius:8px;display:inline-block;">' + esc(priLabel) + '</span></div>';
    html += '</div>';

    // Execution Date
    html += '<div style="background:var(--bg-screen, #fff); border:1px solid var(--border-panel, #e4e8ee); border-radius:14px; padding:14px; box-shadow:0 4px 14px rgba(0,0,0,0.03);">';
    html += '<div style="font-size:11px; font-weight:800; color:var(--text-sub); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">' + (window.t ? window.t('execution_date') : 'Execution Date') + '</div>';
    html += '<div style="font-size:14px; font-weight:800; color:var(--text-title);">' + esc(date) + '</div>';
    if (time) html += '<div style="font-size:13px; font-weight:600; color:var(--text-sub); margin-top:4px;">' + esc(time) + '</div>';
    html += '</div>';

    // Assignee
    html += '<div style="background:var(--bg-screen, #fff); border:1px solid var(--border-panel, #e4e8ee); border-radius:14px; padding:14px; box-shadow:0 4px 14px rgba(0,0,0,0.03);">';
    html += '<div style="font-size:11px; font-weight:800; color:var(--text-sub); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">' + (window.t ? window.t('assign_staff') : 'Assignee') + '</div>';
    html += '<div style="font-size:14px; font-weight:800; color:var(--text-title);">' + esc(members) + '</div>';
    html += '</div>';
    
    html += '</div>'; // end grid

    // Customer & Created At Box
    html += '<div style="background:var(--bg-screen, #fff); border:1px solid var(--border-panel, #e4e8ee); border-radius:14px; padding:16px; margin-bottom:24px; box-shadow:0 4px 14px rgba(0,0,0,0.03);">';
    html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid var(--border-panel, #f1f5f9);">';
    html += '<span style="font-size:13px; color:var(--text-sub); font-weight:700;">' + (window.t ? window.t('customer') : 'Customer') + '</span>';
    html += '<span style="font-size:14px; color:var(--text-title); font-weight:800;">' + esc(customer) + '</span>';
    html += '</div>';
    html += '<div style="display:flex; justify-content:space-between; align-items:center;">';
    html += '<span style="font-size:13px; color:var(--text-sub); font-weight:700;">' + (window.t ? window.t('created_at') : 'Created At') + '</span>';
    html += '<span style="font-size:14px; color:var(--text-title); font-weight:800;">' + esc(createdAt) + '</span>';
    html += '</div>';
    html += '</div>';
    
    // Notes
    html += '<div style="font-size:16px; font-weight:800; color:var(--text-title); margin-bottom:12px;">' + (window.t ? window.t('notes_optional') : 'Notes (optional)') + '</div>';
    html += '<div style="font-size:14px; color:var(--text-title); font-weight:600; line-height:1.6; background:var(--bg-screen, #fff); border:1px solid var(--border-panel, #e4e8ee); border-radius:14px; padding:16px; white-space:pre-wrap; margin-bottom:24px; box-shadow:0 4px 14px rgba(0,0,0,0.03); min-height:80px;">' + (desc ? esc(desc) : '') + '</div>';
    
    // Buttons (Edit and Delete)
    html += '<div style="display:flex; gap:12px;">';
    html += '<a href="new_task.html?mission_id=' + (m.id || m.mission_id) + '" style="display:flex; align-items:center; justify-content:center; gap:8px; padding:15px; border:none; border-radius:14px; background:var(--color-primary); color:#fff; font-size:15px; font-weight:800; cursor:pointer; box-shadow:0 6px 16px rgba(29,96,162,.28); text-decoration:none; flex:2;">';
    html += '<svg fill="none" height="17" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" viewBox="0 0 24 24" width="17"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>';
    html += '<span>' + (window.t ? window.t('edit_task') : 'Edit task') + '</span></a>';
    
    html += '<button onclick="deleteCurrentTask(' + (m.id || m.mission_id) + ')" style="display:flex; align-items:center; justify-content:center; gap:8px; padding:15px; border:2px solid #ef4444; border-radius:14px; background:#fff; color:#ef4444; font-size:15px; font-weight:800; cursor:pointer; flex:1;">';
    html += '<svg fill="none" height="17" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" viewBox="0 0 24 24" width="17"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
    html += '<span>' + (window.t ? window.t('delete') : 'Delete') + '</span></button>';
    html += '</div>';
    
    content.innerHTML = html;
    var titleEl = document.getElementById('global-task-detail-title-text');
    if (titleEl) titleEl.textContent = window.t ? window.t('task_details') : 'Task Details';
    panel.style.display = 'flex';
  };
  
  window.deleteCurrentTask = function(id) {
    var confirmMsg = window.t ? window.t('confirm_delete') : 'Are you sure you want to delete this task?';
    
    // Create custom modal
    var overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    overlay.style.zIndex = '99999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding = '20px';
    overlay.style.backdropFilter = 'blur(4px)';
    overlay.style.animation = 'fadeIn 0.2s ease-out';
    
    var modal = document.createElement('div');
    modal.style.backgroundColor = 'var(--bg-screen, #fff)';
    modal.style.borderRadius = '16px';
    modal.style.padding = '24px';
    modal.style.width = '100%';
    modal.style.maxWidth = '320px';
    modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
    modal.style.textAlign = 'center';
    modal.style.animation = 'scaleIn 0.2s ease-out';
    
    var text = document.createElement('div');
    text.style.fontSize = '16px';
    text.style.fontWeight = '700';
    text.style.color = 'var(--text-title)';
    text.style.marginBottom = '24px';
    text.style.lineHeight = '1.4';
    text.textContent = confirmMsg;
    
    var buttons = document.createElement('div');
    buttons.style.display = 'flex';
    buttons.style.gap = '12px';
    
    var cancelBtn = document.createElement('button');
    cancelBtn.style.flex = '1';
    cancelBtn.style.padding = '12px';
    cancelBtn.style.borderRadius = '12px';
    cancelBtn.style.border = '1px solid var(--border-panel, #e4e8ee)';
    cancelBtn.style.background = 'transparent';
    cancelBtn.style.color = 'var(--text-title)';
    cancelBtn.style.fontSize = '15px';
    cancelBtn.style.fontWeight = '700';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.textContent = window.t ? window.t('cancel') : 'Cancel';
    cancelBtn.onclick = function() {
      document.body.removeChild(overlay);
    };
    
    var confirmBtn = document.createElement('button');
    confirmBtn.style.flex = '1';
    confirmBtn.style.padding = '12px';
    confirmBtn.style.borderRadius = '12px';
    confirmBtn.style.border = 'none';
    confirmBtn.style.background = '#0a84ff';
    confirmBtn.style.color = '#fff';
    confirmBtn.style.fontSize = '15px';
    confirmBtn.style.fontWeight = '700';
    confirmBtn.style.cursor = 'pointer';
    confirmBtn.textContent = window.t ? window.t('delete') : 'OK';
    
    // Keyframes if not present
    if (!document.getElementById('custom-modal-styles')) {
      var style = document.createElement('style');
      style.id = 'custom-modal-styles';
      style.innerHTML = `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `;
      document.head.appendChild(style);
    }
    
    confirmBtn.onclick = function() {
      confirmBtn.disabled = true;
      confirmBtn.style.opacity = '0.7';
      confirmBtn.textContent = '...';
      if (window.MineralBarApp && window.MineralBarApp.deleteMission) {
        window.MineralBarApp.deleteMission(id).then(function() {
          document.body.removeChild(overlay);
          var panel = document.getElementById('task-detail-panel');
          if (panel) panel.style.display = 'none';
          location.reload();
        }).catch(function(err) {
          alert('Delete failed');
          console.error(err);
          confirmBtn.disabled = false;
          confirmBtn.style.opacity = '1';
          confirmBtn.textContent = window.t ? window.t('delete') : 'OK';
        });
      }
    };
    
    buttons.appendChild(cancelBtn);
    buttons.appendChild(confirmBtn);
    modal.appendChild(text);
    modal.appendChild(buttons);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  };

  function installAuthInterceptor(client) {
    if (!client || client.__biz1AuthWrapped) return;
    client.__biz1AuthWrapped = true;
    var original = client.request.bind(client);
    client.request = async function (route, data, options) {
      options = options || {};
      try {
        return await original(route, data, options);
      } catch (err) {
        if (options.skipAuthRefresh || options.public || !isAuthExpiredError(err)) {
          throw err;
        }
        // Avoid refresh loop on Login itself
        if (String(route) === 'Login') throw err;
        try {
          await refreshSession();
        } catch (refreshErr) {
          try { clearSession({ keepEmail: true }); } catch (e) { /* ignore */ }
          redirectToLogin();
          throw refreshErr;
        }
        return original(route, data, Object.assign({}, options, { skipAuthRefresh: true }));
      }
    };
  }

  function redirectToLogin(loginPage) {
    var target = loginPage || 'login.html';
    var here = (global.location && global.location.pathname) || '';
    if (here.indexOf('login.html') !== -1 || here.indexOf('%D7%94%D7%AA%D7%97%D7%91%D7%A8%D7%95%D7%AA') !== -1) {
      return;
    }
    if (global.location) global.location.href = target;
  }

  function saveSession(userBasic, role, email, meta) {
    try {
      global.localStorage.setItem(USER_KEY, JSON.stringify(userBasic || {}));
      global.localStorage.setItem(ROLE_KEY, role || 'sales');
      if (email) global.localStorage.setItem(EMAIL_KEY, email);
      if (meta && meta.expiresAt) {
        global.localStorage.setItem(EXPIRES_KEY, String(meta.expiresAt));
      } else if (meta && meta.expires_at) {
        global.localStorage.setItem(EXPIRES_KEY, String(meta.expires_at));
      }
    } catch (e) { /* ignore */ }
  }

  function clearSession(options) {
    options = options || {};
    try {
      disconnectRealtime();
    } catch (e0) { /* ignore */ }
    try {
      global.localStorage.removeItem(USER_KEY);
      global.localStorage.removeItem(ROLE_KEY);
      global.localStorage.removeItem(EXPIRES_KEY);
      if (!options.keepRemember) {
        global.localStorage.removeItem(CRED_KEY);
        global.localStorage.removeItem(REMEMBER_KEY);
        if (!options.keepEmail) global.localStorage.removeItem(EMAIL_KEY);
      }
      if (global.sessionStorage) global.sessionStorage.removeItem(SESSION_PASS_KEY);
    } catch (e) { /* ignore */ }
    try { getClient().logout(); } catch (e2) { /* ignore */ }
  }

  function detectRole(username, userBasic) {
    var email = String(username || '').toLowerCase().trim();
    if (email.indexOf('sales@') === 0) return 'sales';
    if (email.indexOf('service@') === 0) return 'service';
    if (email.indexOf('tech@') === 0) return 'tech';

    var data = (userBasic && userBasic.data) || userBasic || {};
    var user = data.user || {};
    var blob = JSON.stringify(user).toLowerCase() + ' ' + email;
    if (blob.indexOf('sales') !== -1 || blob.indexOf('מכיר') !== -1) return 'sales';
    if (blob.indexOf('service') !== -1 || blob.indexOf('שירות') !== -1) return 'service';
    if (blob.indexOf('tech') !== -1 || blob.indexOf('טכנ') !== -1) return 'tech';
    return 'sales';
  }

  function getRole() {
    return global.localStorage.getItem(ROLE_KEY) || '';
  }

  function getEmail() {
    return global.localStorage.getItem(EMAIL_KEY) || '';
  }

  function getUserBasic() {
    try {
      return JSON.parse(global.localStorage.getItem(USER_KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  function getUser() {
    var basic = getUserBasic();
    if (!basic) return null;
    return (basic.data && basic.data.user) || basic.user || null;
  }

  function getFolders() {
    var basic = getUserBasic();
    var folders = (basic && basic.data && basic.data.folders) || [];
    return Array.isArray(folders) ? folders : [];
  }

  function getTeamMembers() {
    var basic = getUserBasic();
    var team = (basic && basic.data && basic.data.team_members) || [];
    return Array.isArray(team) ? team : [];
  }

  function homeForRole(role) {
    return ROLE_HOME[role] || ROLE_HOME.sales;
  }

  /**
   * Detect login identifier kind for Login API field:
   * email | username | phone | id
   */
  function detectLoginIdentifier(raw) {
    var value = String(raw == null ? '' : raw).trim();
    if (!value) return { field: 'username', value: '' };
    if (value.indexOf('@') !== -1) return { field: 'email', value: value };

    var compact = value.replace(/[\s\-().]/g, '');
    var digits = compact.replace(/^\+/, '');
    // Phone: +country… or leading 0, or formatted digits
    if (/^\+[\d\s\-().]+$/.test(value) || /^0[\d\s\-().]+$/.test(value)) {
      if (/^\+?\d+$/.test(compact) && digits.length >= 8) {
        return { field: 'phone', value: value };
      }
    }
    if (/^[\d\s\-()+]+$/.test(value) && /\D/.test(value) && digits.length >= 8) {
      return { field: 'phone', value: value };
    }
    // Pure numeric user / account ID
    if (/^\d+$/.test(value)) return { field: 'id', value: value };

    return { field: 'username', value: value };
  }

  function buildLoginPayload(opts) {
    opts = opts || {};
    var payload = {
      password: opts.password || '',
      otp: opts.otp || ''
    };
    var identifier = '';

    if (opts.email) {
      identifier = String(opts.email).trim();
      payload.email = identifier;
    } else if (opts.phone) {
      identifier = String(opts.phone).trim();
      payload.phone = identifier;
    } else if (opts.id != null && opts.id !== '') {
      identifier = String(opts.id).trim();
      payload.id = identifier;
    } else {
      var detected = detectLoginIdentifier(opts.username || opts.identifier || opts.user || '');
      identifier = detected.value;
      payload[detected.field] = detected.value;
    }

    return { payload: payload, identifier: identifier };
  }

  async function login(opts) {
    opts = opts || {};
    var client = getClient();
    var built = buildLoginPayload(opts);
    var username = built.identifier;
    var password = opts.password;
    var remember = opts.remember;
    var data;
    try {
      // Send detected field (email/username/phone/id) directly — remote SDK may only map to username.
      data = await client.request('Login', built.payload, { public: true, throwOnError: false });
      if (data && data.token) client.setToken(data.token);
    } catch (e) {
      if (e && e.raw && (e.raw.otp_required || e.raw.otpRequired)) {
        return {
          ok: false,
          otpRequired: true,
          message: e.raw.message || 'נדרש קוד אימות (OTP)',
          raw: e.raw
        };
      }
      throw e;
    }

    if (data && (data.otp_required || data.otpRequired)) {
      return {
        ok: false,
        otpRequired: true,
        message: data.message || 'נדרש קוד אימות (OTP)',
        raw: data
      };
    }

    if (!data || !data.token) {
      throw new Error((data && data.message) || 'ההתחברות נכשלה');
    }

    var userBasic = await client.account.basic();
    var role = detectRole(username, userBasic);
    saveSession(userBasic, role, username, {
      expiresAt: data.expires_at || data.expiresAt || null
    });
    // Always keep password in sessionStorage for mid-session token refresh.
    // Persist to localStorage when "זכור אותי" is checked (or already was).
    var rememberFlag = remember;
    if (rememberFlag == null) {
      rememberFlag = global.localStorage.getItem(REMEMBER_KEY) === '1';
    }
    saveCredentials(username, password, !!rememberFlag);

    return {
      ok: true,
      otpRequired: false,
      role: role,
      user: (userBasic.data && userBasic.data.user) || userBasic.user || userBasic,
      userBasic: userBasic,
      dest: homeForRole(role),
      raw: data
    };
  }

  function isAuthenticated() {
    try {
      return !!(getClient().getToken() && getRole());
    } catch (e) {
      return false;
    }
  }

  /**
   * Ensure a valid session: use existing token, or silent re-login, else redirect.
   * Also refreshes when the stored bearer is a stale bridge token.
   */
  async function ensureAuth(loginPage) {
    var authed = isAuthenticated();
    if (authed && !tokenNeedsRefresh()) return getClient();

    if (canAutoRefresh() && (!authed || tokenNeedsRefresh())) {
      try {
        await refreshSession();
        if (isAuthenticated() && !tokenNeedsRefresh()) return getClient();
        if (isAuthenticated()) return getClient();
      } catch (err) {
        console.warn('[Biz1Showcase] auto refresh failed', err);
        try { clearSession({ keepEmail: true }); } catch (e) { /* ignore */ }
      }
    }

    if (isAuthenticated() && !tokenNeedsRefresh()) return getClient();
    if (isAuthenticated() && !canAutoRefresh()) return getClient();

    redirectToLogin(loginPage);
    return null;
  }

  function requireAuth(loginPage) {
    if (isAuthenticated()) return getClient();
    // Sync path: if we can refresh, page-boot should call ensureAuth().
    // Fall back to redirect when no saved credentials.
    if (!canAutoRefresh()) {
      redirectToLogin(loginPage);
      return null;
    }
    return null;
  }

  /** List customers in a folder (≤25). */
  async function listCustomers(folderId, extra) {
    var client = getClient();
    return client.customers.list(Object.assign({
      folder_id: folderId || FOLDERS.CUSTOMERS,
      length: 25,
      draw: 1,
      start: 0
    }, extra || {}));
  }

  async function countCustomers(folderId, extra) {
    var client = getClient();
    return client.customers.count(Object.assign({
      folder_id: folderId || FOLDERS.CUSTOMERS
    }, extra || {}));
  }

  function bucketTotal(bucket) {
    if (!bucket || typeof bucket !== 'object') return 0;
    var n = bucket.total_record != null ? Number(bucket.total_record)
      : (bucket.query_count != null ? Number(bucket.query_count) : 0);
    return Number.isNaN(n) ? 0 : n;
  }

  function bucketRows(bucket) {
    if (!bucket || typeof bucket !== 'object') return [];
    if (Array.isArray(bucket.data)) return bucket.data;
    if (Array.isArray(bucket.rows)) return bucket.rows;
    if (Array.isArray(bucket.missions)) return bucket.missions;
    if (Array.isArray(bucket.items)) return bucket.items;
    return [];
  }

  /**
   * Mission.List — supports:
   * 1) New flat shape: { rows|data, total_record|count|recordsFiltered }
   * 2) Legacy HTML buckets: today_tasks / priority_tasks / …
   * Normalize to { groups, rows, total, counts, raw }.
   */
  async function listMissions(extra) {
    var client = getClient();
    var raw;
    try {
      raw = await client.request('Mission.List', Object.assign({
        length: 25,
        draw: 1,
        start: 0
      }, extra || {}));
    } catch (err) {
      // Stale token sometimes returns JSON { success:1, status:302 } as HTTP 302
      if (err && (err.status === 302 || (err.raw && err.raw.status === 302))) {
        var e = new Error('פג תוקף ההתחברות (Mission.List status 302). התחבר מחדש.');
        e.status = 302;
        e.route = 'Mission.List';
        e.raw = err.raw || err;
        throw e;
      }
      throw err;
    }

    if (raw && Number(raw.status) === 302 && !raw.today_tasks && !Array.isArray(raw.rows) && !Array.isArray(raw.data)) {
      var e2 = new Error('פג תוקף ההתחברות (Mission.List status 302). התחבר מחדש.');
      e2.status = 302;
      e2.route = 'Mission.List';
      e2.raw = raw;
      throw e2;
    }

    var flatRows = Array.isArray(raw.rows) ? raw.rows
      : (Array.isArray(raw.data) ? raw.data : []);
    var flatTotal = Number(
      raw.total_record != null ? raw.total_record
        : (raw.recordsFiltered != null ? raw.recordsFiltered
          : (raw.recordsTotal != null ? raw.recordsTotal
            : (raw.count != null ? raw.count : flatRows.length)))
    );
    if (Number.isNaN(flatTotal)) flatTotal = flatRows.length;

    // New flat list response (current mineral API)
    if (flatRows.length || (!raw.today_tasks && !raw.priority_tasks && (raw.rows || raw.data))) {
      var open = flatRows.filter(function (r) { return !(r.is_done || Number(r.done) === 1); });
      var done = flatRows.filter(function (r) { return r.is_done || Number(r.done) === 1; });
      var groupsFlat = [];
      if (open.length || (!done.length && flatRows.length)) {
        groupsFlat.push({
          id: 'all',
          key: 'rows',
          label: 'משימות',
          color: '#1d60a2',
          badgeBg: '#eaf2fb',
          badgeColor: '#1d60a2',
          total: open.length || flatRows.length,
          rows: open.length ? open : flatRows,
          html: '',
          bucket: null
        });
      }
      if (done.length) {
        groupsFlat.push({
          id: 'done',
          key: 'done',
          label: 'בוצעו',
          color: '#2e8a63',
          badgeBg: '#e6f4ec',
          badgeColor: '#2e8a63',
          total: done.length,
          rows: done,
          html: '',
          bucket: null
        });
      }
      return {
        groups: groupsFlat,
        rows: flatRows,
        total: flatTotal,
        counts: raw.scope_counts || raw.tab_counts || {},
        raw: raw
      };
    }

    var defs = [
      { key: 'priority_tasks', id: 'overdue', label: 'באיחור', color: '#d0432f', badgeBg: '#fbeeed', badgeColor: '#c0392b' },
      { key: 'today_tasks', id: 'today', label: 'היום', color: '#1d60a2', badgeBg: '#eaf2fb', badgeColor: '#1d60a2' },
      { key: 'upcoming_tasks', id: 'upcoming', label: 'קרובות', color: '#bd8324', badgeBg: '#fdf1dd', badgeColor: '#bd8324' },
      { key: 'done_tasks', id: 'done', label: 'בוצעו', color: '#2e8a63', badgeBg: '#e6f4ec', badgeColor: '#2e8a63' }
    ];

    var groups = defs.map(function (d) {
      var bucket = raw[d.key] || {};
      return {
        id: d.id,
        key: d.key,
        label: d.label,
        color: d.color,
        badgeBg: d.badgeBg,
        badgeColor: d.badgeColor,
        total: bucketTotal(bucket),
        rows: bucketRows(bucket),
        html: typeof bucket.html === 'string' ? bucket.html : '',
        bucket: bucket
      };
    });

    var total = groups.reduce(function (sum, g) { return sum + g.total; }, 0);
    if (!total && raw.total_record != null) {
      var t = Number(raw.total_record);
      if (!Number.isNaN(t)) total = t;
    }

    var counts = (raw.create_by_total_counts && typeof raw.create_by_total_counts === 'object')
      ? raw.create_by_total_counts
      : (raw.tab_counts || raw.scope_counts || {});

    return { groups: groups, rows: [], total: total, counts: counts, raw: raw };
  }

  // async function getMission(params) {
  //   var client = getClient();
  //   var raw = await client.request('Mission.Get', params || {});
  //   return raw;
  // }


  async function countMissions(extra) {
    var client = getClient();
    var raw = await client.request('Mission.Count', extra || {});
    return { count: Number(raw.count || raw.total || 0), raw: raw };
  }

  /**
   * Mission.Create — title/mission/note/date_to_do/member_id work.
   * Optional customer_id when linking from a card.
   */
  async function createMission(params) {
    var client = getClient();
    var p = params || {};
    var title = String(p.title || p.mission || '').trim();
    var payload = {
      title: title,
      mission: title,
      description: String(p.description || '').trim(),
      note: String(p.note || '').trim()
    };
    if (p.date_to_do) payload.date_to_do = p.date_to_do;
    if (p.customer_id != null && p.customer_id !== '') payload.customer_id = p.customer_id;
    if (p.assigned_to != null && p.assigned_to !== '') {
      payload.assigned_to = p.assigned_to;
    }
    if (p.member_id != null && p.member_id !== '') {
      payload.member_id = typeof p.member_id === 'string'
        ? p.member_id
        : JSON.stringify(Array.isArray(p.member_id) ? p.member_id : [p.member_id]);
    }
    var raw = await client.request('Mission.Create', payload);
    if (!raw || !(Number(raw.success) === 1 || raw.success === true || raw.insert_id)) {
      var err = new Error((raw && raw.message) || 'יצירת משימה נכשלה');
      err.route = 'Mission.Create';
      err.status = raw && raw.status;
      err.raw = raw;
      throw err;
    }
    return {
      id: raw.insert_id || (raw.output && raw.output.id) || null,
      message: raw.message || 'משימה נוספה',
      raw: raw
    };
  }

  function requireId(value, names) {
    if (value == null || value === '' || value === '0') {
      var e = new Error('חסר מזהה חובה: ' + (names || 'id'));
      e.code = 'MISSING_ID';
      throw e;
    }
    return value;
  }

  var FILES_CDN = 'https://files.biz1.co.il/';

  function resolveFileUrl(pathOrUrl) {
    var value = String(pathOrUrl || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value) || /^data:/i.test(value)) return value;
    return FILES_CDN + value.replace(/^\/+/, '');
  }

  /** Files.Upload requires customer_id and returns both CDN path and URL. */
  async function uploadCustomerFile(customerId, file, extra) {
    var id = requireId(customerId, 'customer_id');
    if (!file) throw new Error('file is required');
    var body = new FormData();
    body.append('customer_id', String(id));
    body.append('file', file, file.name || 'upload.bin');
    if (extra && typeof extra === 'object') {
      Object.keys(extra).forEach(function (key) {
        if (extra[key] != null) body.append(key, String(extra[key]));
      });
    }
    var raw = await getClient().request('Files.Upload', body);
    var uploaded = (raw && raw.file) || {};
    var path = uploaded.file_path || uploaded.path || '';
    var url = uploaded.file_url || resolveFileUrl(path);
    if (!path && !url) {
      var err = new Error((raw && raw.message) || 'Files.Upload failed');
      err.route = 'Files.Upload';
      err.raw = raw;
      throw err;
    }
    return { path: path, url: url, id: uploaded.id || raw.document_id || null, raw: raw };
  }

  /** Single mission — always pass mission_id (id also accepted by API). */
  async function getMission(missionId, extra) {
    var id = requireId(missionId, 'mission_id');
    var client = getClient();
    var raw = await client.request('Mission.Get', Object.assign({ mission_id: id, id: id }, extra || {}));
    var mission = null;
    if (raw && raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) mission = raw.data;
    else if (raw && raw.output && typeof raw.output === 'object') mission = raw.output;
    else if (raw && (raw.mission_id || raw.id) && (raw.mission != null || raw.note != null)) mission = raw;
    if (!mission) {
      var err = new Error((raw && raw.message) || 'Mission.Get failed');
      err.route = 'Mission.Get';
      err.status = raw && raw.status;
      err.raw = raw;
      throw err;
    }
    return { mission: mission, raw: raw };
  }

  /** Mission.Update requires id + filed + saveoutput (typo "filed" is API contract). */
  async function updateMission(params) {
    var p = params || {};
    var id = requireId(p.id || p.mission_id, 'mission_id/id');
    var client = getClient();
    var raw = await client.request('Mission.Update', {
      id: id,
      mission_id: id,
      filed: p.filed || p.field || 'note',
      saveoutput: p.saveoutput != null ? p.saveoutput : (p.value || '')
    });
    if (!(raw && (Number(raw.success) === 1 || raw.success === true))) {
      var err = new Error((raw && raw.message) || 'Mission.Update failed');
      err.route = 'Mission.Update';
      err.raw = raw;
      throw err;
    }
    return { ok: true, message: raw.message, raw: raw };
  }

  /** Mission.Done requires id (not mission_id). */
  async function doneMission(missionId) {
    var id = requireId(missionId, 'id');
    var client = getClient();
    var raw = await client.request('Mission.Done', { id: id });
    if (!(raw && (Number(raw.success) === 1 || raw.success === true))) {
      var err = new Error((raw && raw.message) || 'Mission.Done failed');
      err.route = 'Mission.Done';
      err.raw = raw;
      throw err;
    }
    return { ok: true, message: raw.message, raw: raw };
  }

  /** Mission.Delete requires id. */
  async function deleteMission(missionId) {
    var id = requireId(missionId, 'id');
    var client = getClient();
    var raw = await client.request('Mission.Delete', { id: id });
    if (!(raw && (Number(raw.success) === 1 || raw.success === true))) {
      var err = new Error((raw && raw.message) || 'Mission.Delete failed');
      err.route = 'Mission.Delete';
      err.raw = raw;
      throw err;
    }
    return { ok: true, message: raw.message, raw: raw };
  }

  /** Single customer — always pass customer_id. */
  async function getCustomer(customerId, extra) {
    var id = requireId(customerId, 'customer_id');
    var client = getClient();
    var raw = await client.request('Customer.Get', Object.assign({
      customer_id: id,
      id: id,
      cust_id: id
    }, extra || {}));
    if (!(raw && (raw.output || raw.data || Number(raw.success) === 1))) {
      var err = new Error((raw && raw.message) || 'Customer.Get failed');
      err.route = 'Customer.Get';
      err.raw = raw;
      throw err;
    }
    return { customer: raw.output || raw.data || raw, raw: raw };
  }

  /** Single ticket — always pass ticket_id. */
  async function getTicket(ticketId, extra) {
    var id = requireId(ticketId, 'ticket_id');
    var client = getClient();
    var raw = await client.request('Ticket.Get', Object.assign({
      ticket_id: id,
      id: id
    }, extra || {}));
    if (!(raw && (raw.output || raw.data || Number(raw.success) === 1))) {
      var err = new Error((raw && raw.message) || 'Ticket.Get failed');
      err.route = 'Ticket.Get';
      err.raw = raw;
      throw err;
    }
    return { ticket: raw.output || raw.data || raw, raw: raw };
  }

  /** Documents for one customer — customer_id required. */
  async function listDocuments(customerId, extra) {
    var id = requireId(customerId, 'customer_id');
    var client = getClient();
    var payload = Object.assign({
      customer_id: id,
      cust_id: id,
      length: 25,
      start: 0,
      draw: 1
    }, extra || {});
    if (payload.type && !payload.document_type) payload.document_type = payload.type;
    if (payload.document_type && !payload.type) payload.type = payload.document_type;
    var raw = await client.request('Documents.List', payload);
    return {
      raw: raw,
      rows: extractBusinessDocRows(raw),
      html: raw.files_html || '',
      customer_id: id
    };
  }

  function extractBusinessDocRows(raw) {
    if (!raw || typeof raw !== 'object') return [];
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.rows)) return raw.rows;
    if (Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw.records)) return raw.records;
    if (Array.isArray(raw.aaData)) return raw.aaData;
    if (Array.isArray(raw.output)) return raw.output;
    if (raw.document && typeof raw.document === 'object') return [raw.document];
    if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
      if (Array.isArray(raw.data.data)) return raw.data.data;
      if (raw.data.document) return [raw.data.document];
      if (raw.data.id || raw.data.last_documents_id || raw.data.document_id) return [raw.data];
    }
    return [];
  }

  function docRowKey(doc) {
    return String(
      (doc && (doc.last_documents_id || doc.document_id || doc.id || doc.number || doc.document_number)) || ''
    );
  }

  function mergeDocRows(lists) {
    var seen = {};
    var out = [];
    (lists || []).forEach(function (rows) {
      (rows || []).forEach(function (doc) {
        if (!doc || typeof doc !== 'object') return;
        var key = docRowKey(doc) || JSON.stringify(doc).slice(0, 80);
        if (seen[key]) return;
        seen[key] = true;
        out.push(doc);
      });
    });
    return out;
  }

  /**
   * Documents.BusinessList — invoices / orders / receipts for one customer.
   * Requires customer_id (or phone/email). Use get_multiple=1 for all matches.
   * types: invoice, receipt, receipt_tax_invoice, credit_invoice, delivery_invoice,
   *        purchase_orders, order_proposals
   */
  async function listBusinessDocuments(params) {
    var client = getClient();
    var p = params || {};
    var customerId = p.customer_id != null && p.customer_id !== ''
      ? p.customer_id
      : (p.cust_id != null && p.cust_id !== '' ? p.cust_id : null);
    var payload = {
      get_multiple: 1,
      length: p.length != null ? p.length : 25,
      start: p.start != null ? p.start : 0,
      draw: p.draw != null ? p.draw : 1
    };
    if (customerId != null) {
      payload.customer_id = customerId;
      payload.cust_id = customerId;
    }
    if (p.phone) payload.phone = p.phone;
    if (p.email) payload.email = p.email;
    if (p.type) payload.type = p.type;
    if (p.document_type) payload.document_type = p.document_type;
    if (!payload.type && payload.document_type) payload.type = payload.document_type;
    if (!payload.customer_id && !payload.phone && !payload.email) {
      var e = new Error('Customer ID, Phone or Email is required');
      e.route = 'Documents.BusinessList';
      e.code = 'MISSING_ID';
      throw e;
    }
    var raw = await client.request('Documents.BusinessList', payload);
    return { raw: raw, rows: extractBusinessDocRows(raw), customer_id: customerId };
  }

  /** Pending / open invoices for CRM panel. */
  async function listCustomerInvoices(params) {
    var p = params || {};
    var types = p.types || ['invoice', 'receipt_tax_invoice', 'credit_invoice', 'delivery_invoice'];
    var results = await Promise.all(types.map(function (type) {
      return listBusinessDocuments(Object.assign({}, p, { type: type })).catch(function () {
        return { rows: [] };
      });
    }));
    var rows = mergeDocRows(results.map(function (r) { return r.rows; }));
    if (!rows.length) {
      var fallback = await Promise.all(types.map(function (type) {
        var id = p.customer_id || p.cust_id;
        if (!id) return Promise.resolve({ rows: [] });
        return listDocuments(id, {
          type: type,
          document_type: type,
          email: p.email,
          phone: p.phone,
          length: p.length || 25
        }).catch(function () { return { rows: [] }; });
      }));
      rows = mergeDocRows(fallback.map(function (r) { return r.rows; }));
    }
    // Prefer unpaid / open invoices when status fields exist.
    var pending = rows.filter(function (doc) {
      var st = String(doc.user_status || doc.status || doc.payment_status || doc.paid || '').toLowerCase();
      if (!st) return true;
      if (st === '1' || st === 'true' || st === 'paid' || st === 'closed' || st === 'done') return false;
      return true;
    });
    return { rows: pending.length ? pending : rows, all: rows };
  }

  /** Order history (proposals + purchase orders) for CRM panel. */
  async function listCustomerOrders(params) {
    var p = params || {};
    var types = p.types || ['order_proposals', 'purchase_orders'];
    var results = await Promise.all(types.map(function (type) {
      return listBusinessDocuments(Object.assign({}, p, { type: type })).catch(function () {
        return { rows: [] };
      });
    }));
    var rows = mergeDocRows(results.map(function (r) { return r.rows; }));
    if (!rows.length) {
      var fallback = await Promise.all(types.map(function (type) {
        var id = p.customer_id || p.cust_id;
        if (!id) return Promise.resolve({ rows: [] });
        return listDocuments(id, {
          type: type,
          document_type: type,
          email: p.email,
          phone: p.phone,
          length: p.length || 25
        }).catch(function () { return { rows: [] }; });
      }));
      rows = mergeDocRows(fallback.map(function (r) { return r.rows; }));
    }
    return { rows: rows };
  }

  function parseEmailsHtml(html) {
    var rows = [];
    if (!html || typeof html !== 'string') return rows;
    var doc;
    try {
      doc = new DOMParser().parseFromString('<table>' + html + '</table>', 'text/html');
    } catch (e) {
      return rows;
    }
    var trs = doc.querySelectorAll('tr');
    trs.forEach(function (tr) {
      var id = '';
      var cb = tr.querySelector('input.check_all_message, input[name="customer_message[]"]');
      if (cb && cb.value) id = cb.value;
      if (!id) {
        var msgEl = tr.querySelector('.view_new_message[data_id], .done_client_msg[data_id], .delete_client_message[data_id]');
        if (msgEl) id = msgEl.getAttribute('data_id') || '';
      }
      if (!id) {
        var m = (tr.className || '').match(/remove_list_message_(\d+)/);
        if (m) id = m[1];
      }
      var emailEl = tr.querySelector('[data_email]');
      var email = emailEl ? (emailEl.getAttribute('data_email') || '') : '';
      if (!email) {
        var nameSpan = tr.querySelector('#single_client_details');
        if (nameSpan && nameSpan.textContent && nameSpan.textContent.indexOf('@') !== -1) {
          email = nameSpan.textContent.trim();
        }
      }
      var subjectEl = tr.querySelector('.subject_td');
      var subject = subjectEl ? subjectEl.textContent.trim() : '';
      var whenEl = tr.querySelector('td.admin_msg_uname span');
      var when = whenEl ? whenEl.textContent.trim() : '';
      var custEl = tr.querySelector('[cust_id]');
      var custId = custEl ? (custEl.getAttribute('cust_id') || '0') : '0';
      var nameEl = tr.querySelector('#single_client_details');
      var name = nameEl ? nameEl.textContent.trim() : (email || ('הודעה #' + id));
      if (!id && !email && !subject) return;
      rows.push({
        id: id,
        email: email,
        subject: subject,
        when: when,
        cust_id: custId,
        name: name
      });
    });
    return rows;
  }

  async function listEmails(extra) {
    var client = getClient();
    var raw;
    try {
      raw = await client.request('Emails.List', Object.assign({
        length: 25,
        start: 0,
        draw: 1
      }, extra || {}));
    } catch (err) {
      // Fallback used by some Biz1 installs
      raw = await client.request('Chat.EmailList', Object.assign({
        length: 25,
        start: 0,
        draw: 1
      }, extra || {}));
    }
    // New structured Emails.List / Chat.EmailList
    if (raw && Array.isArray(raw.data)) {
      var emailRows = raw.data.map(function (r) {
        return {
          id: r.message_id || r.id || '',
          email: r.email || '',
          subject: r.subject || r.note || '',
          name: r.email || ('הודעה #' + (r.message_id || r.id || '')),
          cust_id: r.customer_id || r.client_id || 0,
          customer_id: r.customer_id || r.client_id || 0,
          when: r.create_date || r.last_updated || '',
          raw: r
        };
      });
      var emailTotal = Number(raw.recordsFiltered != null ? raw.recordsFiltered : (raw.count != null ? raw.count : emailRows.length));
      return { rows: emailRows, total: emailTotal, raw: raw, html: '' };
    }
    var html = (raw && (raw.output || raw.email_list)) || '';
    if (typeof html !== 'string') html = '';
    var rows = parseEmailsHtml(html);
    var total = Number(raw && (raw.totalrecords != null ? raw.totalrecords : raw.recordsFiltered));
    if (Number.isNaN(total) || total == null) total = rows.length;
    return { rows: rows, total: total, raw: raw, html: html };
  }

  function mongoDate(v) {
    var locale = (window.getLanguage && window.getLanguage() === 'en') ? 'en-US' : 'he-IL';
    if (v == null) return '';
    if (typeof v === 'string' || typeof v === 'number') {
      var d0 = new Date(v);
      return Number.isNaN(d0.getTime()) ? String(v) : d0.toLocaleString(locale);
    }
    if (typeof v === 'object') {
      var n = v.$date && (v.$date.$numberLong || v.$date);
      if (n != null) {
        var ms = Number(n);
        if (!Number.isNaN(ms)) {
          // Biz1 sometimes stores seconds-as-ms already
          if (ms < 1e12) ms *= 1000;
          return new Date(ms).toLocaleString(locale);
        }
      }
    }
    return '';
  }

  function chatCustomerId(r) {
    var cid = r && (r.contactus_id != null && r.contactus_id !== '' && Number(r.contactus_id) !== 0
      ? r.contactus_id
      : (r.customer_id != null && r.customer_id !== '' && Number(r.customer_id) !== 0
        ? r.customer_id
        : (r.cust_id != null && r.cust_id !== '' && Number(r.cust_id) !== 0
          ? r.cust_id
          : (r.client_id != null && r.client_id !== '' && Number(r.client_id) !== 0
            ? r.client_id
            : 0))));
    return cid || 0;
  }

  function chatWhen(r) {
    return mongoDate(r && (r.last_updated || r.last_update || r.create_date || r.inserted_date)) ||
      String((r && (r.time || r.create_date)) || '');
  }

  function chatSnippet(r) {
    return String((r && (r.message || r.note || r.import_note || r.subject || r.last_message)) || '').trim();
  }

  function parseUnread(r) {
    if (!r || typeof r !== 'object') return 0;
    if (r.unread != null && r.unread !== '') {
      var u = Number(r.unread);
      if (!Number.isNaN(u)) return Math.max(0, u);
    }
    if (r.unread_count != null) {
      var u2 = Number(r.unread_count);
      if (!Number.isNaN(u2)) return Math.max(0, u2);
    }
    if (r.is_read === false || r.is_read === 0 || r.is_read === '0') return 1;
    if (r.read === 0 || r.read === '0' || r.read === false) return 1;
    if (r.not_read === 1 || r.not_read === true || r.not_read === '1') return 1;
    return 0;
  }

  /** Parse display / API date strings → ms. Prefer absolute datetimes over clock-only. */
  function sortTsFromWhen(when) {
    if (when == null || when === '') return 0;
    if (typeof when === 'number' && !Number.isNaN(when)) {
      return when < 1e12 ? when * 1000 : when;
    }
    var s = String(when).trim();
    if (!s) return 0;
    if (/^\d{10,13}$/.test(s)) {
      var unix = Number(s);
      return unix < 1e12 ? unix * 1000 : unix;
    }
    // dd.mm.yyyy / dd/mm/yyyy, optional time (allows "בשעה" / comma between)
    var m = s.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})(?:\D+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (m && m[4] != null && m[5] != null) {
      return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +(m[6] || 0)).getTime() || 0;
    }
    if (m) {
      return new Date(+m[3], +m[2] - 1, +m[1]).getTime() || 0;
    }
    // yyyy-mm-dd[ T]HH:MM
    var iso = s.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (iso) {
      return new Date(+iso[1], +iso[2] - 1, +iso[3], +iso[4], +iso[5], +(iso[6] || 0)).getTime() || 0;
    }
    var n = Date.parse(s);
    if (!Number.isNaN(n)) return n;
    // Clock-only ("05:15") — weak signal; same calendar day assumed
    var clock = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (clock) {
      var d = new Date();
      d.setHours(+clock[1], +clock[2], +(clock[3] || 0), 0);
      return d.getTime();
    }
    return 0;
  }

  /** Mongo / API date field → epoch ms (no locale string round-trip). */
  function rawDateMs(v) {
    if (v == null || v === '') return 0;
    if (typeof v === 'number' && !Number.isNaN(v)) {
      return v < 1e12 ? v * 1000 : v;
    }
    if (typeof v === 'string') return sortTsFromWhen(v);
    if (typeof v === 'object') {
      var n = v.$date && (v.$date.$numberLong || v.$date);
      if (n != null) {
        var ms = Number(n);
        if (!Number.isNaN(ms)) return ms < 1e12 ? ms * 1000 : ms;
      }
    }
    return 0;
  }

  /**
   * WhatsApp-style sort key: oldest → newest.
   * Prefer absolute inserted/create dates; never prefer clock-only "05:15" over real dates.
   */
  function messageSortTs(row) {
    if (!row) return 0;
    if (row.sort_ts) return Number(row.sort_ts) || 0;
    var raw = row.raw || {};
    var fromRaw =
      rawDateMs(raw.inserted_date) ||
      rawDateMs(raw.create_date) ||
      rawDateMs(raw.last_updated) ||
      rawDateMs(raw.last_update) ||
      rawDateMs(raw.time);
    if (fromRaw) return fromRaw;
    return sortTsFromWhen(row.time || '');
  }

  /** Map Chat.Conversations last_message_type → list channel badge key. */
  function conversationListChannel(r) {
    if (!r || typeof r !== 'object') return 'whatsapp';
    if (Number(r.cust_chat_id) > 0) return 'web';
    var type = String(
      r.last_message_type || r.last_type || r.type || r.channel || r.source || ''
    ).toLowerCase();
    if (/^whatsapp$|^wa$/.test(type)) return 'whatsapp';
    if (/^notes?$|send_notes|internal|import_note/.test(type)) return 'notes';
    if (/^email$|^mail$|quick.?email/.test(type)) return 'email';
    if (/^biz1$|^web$|^live$|^mision$|^mission$/.test(type)) return 'web';
    if (r.last_update_whatsapp || r.last_update_whatsapp_date) return 'whatsapp';
    return 'whatsapp';
  }

  function normalizeInboxEmail(rawEmail) {
    var email = rawEmail;
    if (email == null || email === false) return '';
    if (Array.isArray(email)) {
      email = email.filter(function (v) {
        return v != null && String(v).trim() && String(v).trim() !== '[]';
      }).join(', ');
    }
    email = String(email == null ? '' : email).trim();
    if (!email || email === '[]' || email === '{}' || email === 'null' || email === 'undefined') return '';
    // JSON array string e.g. '["a@b.com"]' or '[]'
    if (email.charAt(0) === '[') {
      try {
        var parsed = JSON.parse(email);
        if (Array.isArray(parsed)) {
          email = parsed.filter(Boolean).join(', ');
        } else {
          return '';
        }
      } catch (e) {
        return '';
      }
    }
    email = String(email || '').trim();
    if (!email || email.indexOf('@') === -1) return '';
    return email;
  }

  function looksLikePlaceholderName(name) {
    var s = String(name || '').trim();
    if (!s) return true;
    if (s === '[]' || s === '{}' || s === 'null') return true;
    if (/^customer\s*#/i.test(s) || /^לקוח\s*#/.test(s)) return true;
    return false;
  }

  /**
   * Chat.Inbox — internal / email-style message rows (collapse later by customer+channel).
   */
  async function listChatInbox(extra) {
    var client = getClient();
    var raw = await client.request('Chat.Inbox', Object.assign({
      page: 1,
      limit: 25,
      start: 0,
      per_page: 25
    }, extra || {}));
    var data = (raw && Array.isArray(raw.data))
      ? raw.data
      : (raw && Array.isArray(raw.rows) ? raw.rows : []);
    var rows = data.map(function (r) {
      var cid = chatCustomerId(r);
      var email = normalizeInboxEmail(r.email || r.cust_email || r.multiple_email || '');
      var snippet = chatSnippet(r);
      // Real email address → Email; otherwise internal inbox → Live Chat
      var channel = email ? 'email' : 'web';
      var name = r.cust_name || r.name || r.user_name || '';
      if (looksLikePlaceholderName(name)) name = '';
      if (!name && email) name = String(email).split('@')[0] || email;
      if (!name && cid) name = '';
      return {
        id: r.message_id || r.id || cid || '',
        customer_id: cid,
        cust_id: cid,
        client_id: cid,
        message_id: r.message_id || r.id || '',
        name: name,
        email: email,
        phone: r.phone || r.cust_phone || '',
        subject: snippet || r.subject || '',
        message: snippet,
        last_message: snippet,
        when: chatWhen(r) || mongoDate(r.create_date) || mongoDate(r.last_updated),
        channel: channel,
        unread: parseUnread(r),
        raw: r
      };
    });
    return {
      rows: rows,
      total: Number(raw && (raw.count != null ? raw.count : rows.length)) || rows.length,
      raw: raw
    };
  }

  /**
   * Omnichannel list aligned with Biz1 site contacts:
   * - WhatsApp people/names from Chat.Conversations (cust_name)
   * - Email / Notes from Emails.List (incl. Chat.SendCustomer notes), names from Conversations
   * - Live Chat only when cust_chat_id > 0
   */
  async function listOmnichannelConversations(extra) {
    var opts = extra || {};
    var results = await Promise.all([
      listChatConversations(opts).catch(function (e) { return { rows: [], error: e }; }),
      listEmails(Object.assign({ length: 25, start: 0, limit: 25 }, opts)).catch(function (e) {
        return { rows: [], error: e };
      })
    ]);
    var wa = results[0].rows || [];
    var emails = results[1].rows || [];

    var profileById = {};
    wa.forEach(function (r) {
      var id = String(r.customer_id || r.cust_id || '');
      if (!id || id === '0') return;
      profileById[id] = {
        name: r.name || '',
        email: r.email || '',
        phone: r.phone || ''
      };
    });

    function siteName(cid, emailFallback) {
      var id = String(cid || '');
      var p = profileById[id];
      if (p && p.name && !looksLikePlaceholderName(p.name)) return p.name;
      var em = normalizeInboxEmail(emailFallback || (p && p.email) || '');
      if (em) return em.split('@')[0];
      if (id && id !== '0') return 'Customer #' + id;
      return 'Unknown';
    }

    var merged = [];
    var seen = {};

    function pushRow(row) {
      var cid = row.customer_id || row.cust_id || 0;
      var ch = row.channel || 'whatsapp';
      var dedupe = ch + ':' + String(cid || row.email || '');
      row.name = siteName(cid, row.email);
      if (profileById[String(cid)]) {
        if (!row.email && profileById[String(cid)].email) {
          row.email = profileById[String(cid)].email;
        }
        if (!row.phone && profileById[String(cid)].phone) {
          row.phone = profileById[String(cid)].phone;
        }
      }
      if (seen[dedupe]) {
        var prev = seen[dedupe];
        prev.unread = (prev.unread || 0) + (row.unread || 0);
        if (sortTsFromWhen(row.when) > sortTsFromWhen(prev.when)) {
          prev.message = row.message || prev.message;
          prev.last_message = row.last_message || prev.last_message;
          prev.subject = row.subject || prev.subject;
          prev.when = row.when || prev.when;
          prev.raw = row.raw || prev.raw;
        }
        prev.name = siteName(cid, prev.email || row.email);
        return;
      }
      var copy = Object.assign({}, row, {
        unread: row.unread || 0,
        sort_ts: sortTsFromWhen(row.when)
      });
      seen[dedupe] = copy;
      merged.push(copy);
    }

    // Site messenger contacts (WhatsApp Web list)
    wa.forEach(function (r) {
      var raw = r.raw || {};
      var channel = 'whatsapp';
      if (Number(raw.cust_chat_id) > 0) channel = 'web';
      pushRow(Object.assign({}, r, {
        channel: channel,
        unread: parseUnread(raw) || 0
      }));
    });

    // Notes / Email threads (Chat.SendCustomer + Emails.List).
    // Include note rows even without @ — name always from Conversations cust_name.
    emails.forEach(function (r) {
      var cid = Number(r.customer_id || r.cust_id || 0) || 0;
      if (!cid) return;
      var email = normalizeInboxEmail(
        r.email || (r.raw && (r.raw.email || r.raw.cust_email || r.raw.multiple_email)) || ''
      );
      var snippet = String(r.subject || r.message || r.last_message || '').trim();
      if (!snippet && r.raw) {
        snippet = String(r.raw.note || r.raw.message || r.raw.subject || '').trim();
      }
      if (!snippet) return;
      pushRow({
        id: r.id || r.message_id || cid,
        customer_id: cid,
        cust_id: cid,
        client_id: cid,
        message_id: r.id || r.message_id || '',
        name: '',
        email: email || (profileById[String(cid)] && profileById[String(cid)].email) || '',
        phone: '',
        subject: snippet,
        message: snippet,
        last_message: snippet,
        when: r.when || (r.raw && (r.raw.create_date || r.raw.last_updated)) || '',
        channel: 'email',
        unread: parseUnread(r.raw) || 0,
        raw: r.raw || r
      });
    });

    var missingIds = [];
    var missingSeen = {};
    merged.forEach(function (r) {
      var id = String(r.customer_id || '');
      if (!id || id === '0') return;
      if (!looksLikePlaceholderName(r.name) && String(r.name).indexOf('@') === -1) return;
      if (missingSeen[id]) return;
      missingSeen[id] = true;
      missingIds.push(id);
    });
    if (missingIds.length) {
      await Promise.all(missingIds.slice(0, 8).map(async function (id) {
        try {
          var res = await getCustomer(id);
          var c = res.customer || {};
          var nm = c.name || c.cust_name || '';
          var em = normalizeInboxEmail(c.email || c.cust_email || '');
          var ph = c.phone || c.mobile || '';
          if (!nm) return;
          profileById[id] = {
            name: nm,
            email: em || (profileById[id] && profileById[id].email) || '',
            phone: ph
          };
          merged.forEach(function (row) {
            if (String(row.customer_id) !== id) return;
            row.name = nm;
            if (!row.email && em) row.email = em;
            if (!row.phone && ph) row.phone = ph;
          });
        } catch (e) { /* ignore */ }
      }));
    }

    merged.sort(function (a, b) {
      return (b.sort_ts || 0) - (a.sort_ts || 0);
    });

    var counts = { whatsapp: 0, email: 0, web: 0 };
    merged.forEach(function (r) {
      if (counts[r.channel] != null) counts[r.channel]++;
    });

    return {
      rows: merged,
      total: merged.length,
      sources: {
        whatsapp: counts.whatsapp,
        email: counts.email,
        web: counts.web,
        conversations: wa.length
      },
      raw: { conversations: results[0].raw, emails: results[1].raw }
    };
  }

  /**
   * Chat.Conversations — conversation list
   * https://{user}.bull36.com/app/Chat.Conversations
   */
  async function listChatConversations(extra) {
    var client = getClient();
    var raw = await client.request('Chat.Conversations', Object.assign({
      page: 1,
      limit: 25,
      start: 0
    }, extra || {}));
    var data = (raw && Array.isArray(raw.data))
      ? raw.data
      : (raw && Array.isArray(raw.rows) ? raw.rows : []);
    var rows = data.map(function (r) {
      var cid = chatCustomerId(r);
      var email = r.cust_email || r.email || '';
      var name = r.cust_name || r.name || '';
      if (!name && email) name = String(email).split('@')[0] || email;
      if (!name && cid) name = ((window.t && window.t('customer')) || 'Customer') + ' #' + cid;
      if (!name) name = r.subject || (((window.t && window.t('conversation')) || 'Chat') + ' #' + (r.id || r.message_id || ''));
      // Channel badge from last_message_type (whatsapp / notes / email / biz1)
      var last = chatSnippet(r) || r.last_message || r.message || '';
      var channel = conversationListChannel(r);
      var metaId = r.messenger_meta_id || r.id || (r._id && (r._id.$oid || r._id)) || '';
      if (typeof metaId === 'object' && metaId.$oid) metaId = metaId.$oid;
      return {
        id: cid || r.id || r.message_id || 0,
        customer_id: cid,
        cust_id: cid,
        client_id: cid,
        message_id: r.message_id || r.id || '',
        name: name,
        email: email,
        phone: r.cust_phone || r.phone || '',
        subject: last || r.subject || 'שיחה',
        message: last,
        last_message: last,
        when: chatWhen(r) || mongoDate(r.last_update_whatsapp_date) || mongoDate(r.last_update) || String(r.last_update_whatsapp || ''),
        channel: channel,
        last_message_type: r.last_message_type || '',
        messenger_meta_id: String(metaId || ''),
        unread: parseUnread(r),
        raw: r
      };
    });
    var total = Number(raw && (raw.total != null ? raw.total : raw.count));
    if (Number.isNaN(total)) total = rows.length;
    return { rows: rows, total: total, raw: raw };
  }

  /**
   * Chat.SingleConversations — full thread for one messenger conversation.
   * Required: messenger_meta_id (from Chat.Conversations).
   * https://{user}.bull36.com/app/Chat.SingleConversations
   */
  async function listSingleConversations(messengerMetaId, extra) {
    var meta = String(messengerMetaId == null ? '' : messengerMetaId).trim();
    if (!meta) {
      var e = new Error('Missing messenger_meta_id');
      e.route = 'Chat.SingleConversations';
      e.code = 'MISSING_ID';
      throw e;
    }
    var client = getClient();
    var extraOpts = extra || {};
    var payload = Object.assign({
      messenger_meta_id: meta,
      messanger_meta_id: meta,
      chat_id: meta,
      meta_id: meta,
      conversation_id: meta,
      page: 1,
      limit: 100,
      start: 0
    }, extraOpts);
    if (extraOpts.customer_id) {
      payload.customer_id = extraOpts.customer_id;
      payload.cust_id = extraOpts.customer_id;
      payload.contactus_id = extraOpts.customer_id;
    }
    if (extraOpts.type) payload.type = extraOpts.type;

    var raw = await client.request('Chat.SingleConversations', payload);
    var data = (raw && Array.isArray(raw.data))
      ? raw.data
      : (raw && Array.isArray(raw.rows) ? raw.rows : []);

    var rows = data.map(function (r) {
      var text = chatSnippet(r) || String(r.message || r.msg || r.note || '').trim();
      var type = String(r.type || r.channel || r.msg_type || 'whatsapp').toLowerCase();
      if (type === 'mision' || type === 'mission') type = 'biz1';
      var displayTime = r.time || chatWhen(r) || mongoDate(r.inserted_date) || mongoDate(r.create_date);
      var row = {
        id: (r.id && (r.id.$oid || r.id)) || r.message_id || '',
        message: text,
        user_name: r.user_name || r.from_name || r.sender_name || '',
        email: r.email || '',
        time: displayTime,
        direction: r.direction,
        type: type,
        channel: type,
        user_id: r.user_id,
        messenger_meta_id: meta,
        raw: r
      };
      row.sort_ts = messageSortTs(row);
      return row;
    }).filter(function (row) {
      return !!(row.message || (row.raw && (row.raw.id || row.raw._id)));
    });

    // WhatsApp style: oldest at top, latest at bottom
    rows.sort(function (a, b) {
      var diff = (a.sort_ts || 0) - (b.sort_ts || 0);
      if (diff !== 0) return diff;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });

    return {
      rows: rows,
      count: Number(raw && raw.count != null ? raw.count : rows.length),
      total: Number(raw && raw.total != null ? raw.total : rows.length),
      messenger_meta_id: raw && (raw.messenger_meta_id || meta),
      customer_id: raw && (raw.customer_id || raw.contactus_id),
      raw: raw
    };
  }

  /**
   * Chat.CustomerMessages — thread for one customer (required: customer_id).
   * Current mineral rows use note/email/create_date (not always message/time).
   */
  async function listCustomerMessages(customerId, extra) {
    var id = requireId(customerId, 'customer_id');
    var client = getClient();
    var raw = await client.request('Chat.CustomerMessages', Object.assign({
      customer_id: id,
      cust_id: id,
      contactus_id: id,
      limit: 25
    }, extra || {}));
    var data = (raw && Array.isArray(raw.data)) ? raw.data : [];
    var rows = data.map(function (r) {
      var row = {
        message: chatSnippet(r),
        // Never put email address in the bubble "who" label
        user_name: r.user_name || r.from_name || r.sender_name || '',
        email: r.email || r.cust_email || '',
        time: r.time || chatWhen(r) || mongoDate(r.create_date) || mongoDate(r.inserted_date),
        direction: r.direction,
        type: r.type || r.from || 'notes',
        channel: 'email',
        user_id: r.user_id,
        messenger_meta_id: r.messenger_meta_id && (r.messenger_meta_id.$oid || r.messenger_meta_id),
        raw: r
      };
      row.sort_ts = messageSortTs(row);
      return row;
    });
    // WhatsApp style: oldest at top, latest at bottom
    rows.sort(function (a, b) {
      return (a.sort_ts || 0) - (b.sort_ts || 0);
    });
    return {
      rows: rows,
      count: Number(raw && raw.count != null ? raw.count : rows.length),
      customer_id: raw && (raw.contactus_id || id),
      raw: raw
    };
  }

  /**
   * Chat.SendCustomer — always send customer_id (and cust_id alias).
   * Supports dashboard channels via `from`:
   * - send_notes (internal)
   * - send_email_quick
   * - send_whatsapp
   * - biz1_chat_message
   * success may be string "4" with message_return when note/message was stored.
   */
  async function sendCustomerMessage(params) {
    var client = getClient();
    var p = params || {};
    var msg = String(p.msg || p.message || '').trim();
    if (!msg) {
      var e = new Error('חסרה הודעה (msg)');
      e.route = 'Chat.SendCustomer';
      throw e;
    }
    var customerId = p.customer_id != null && p.customer_id !== ''
      ? p.customer_id
      : (p.cust_id != null && p.cust_id !== '' ? p.cust_id : null);
    if (customerId == null) {
      var e2 = new Error('חסר customer_id לשליחת הודעה');
      e2.route = 'Chat.SendCustomer';
      e2.code = 'MISSING_ID';
      throw e2;
    }
    // API accepts 0 for unmatched email threads; still always send the field.
    var payload = {
      msg: msg,
      message: msg,
      customer_id: customerId,
      cust_id: customerId,
      from: p.from || 'send_notes'
    };
    // Optional channel-specific params (same aliases as route help).
    if (p.email) {
      payload.email = p.email;
      payload.chart_selected_email = p.email;
      payload.to_email = p.email;
    }
    if (p.phone) {
      payload.phone = p.phone;
      payload.mobile = p.phone;
      payload.chart_selected_phone_no = p.phone;
    }
    if (p.template_id != null && p.template_id !== '') payload.template_id = p.template_id;
    if (p.channel_type) payload.channel_type = p.channel_type;
    if (p.message_id) payload.message_id = p.message_id;
    var raw = await client.request('Chat.SendCustomer', payload);
    var ok = raw && (
      Number(raw.success) === 1 ||
      raw.success === true ||
      Number(raw.output) === 1 ||
      (raw.message_return && String(raw.message_return).length > 0) ||
      (raw.message_id != null && raw.message_id !== '' && raw.message_id !== 0) ||
      (raw.id != null && raw.id !== '' && raw.id !== 0) ||
      /נשלח|נוספה|הצלח/i.test(String(raw.message_return || raw.message || ''))
    );
    // success "4" is a known Biz1 "note added" code; also treat any non-zero numeric success
    if (!ok && raw && String(raw.success) === '4') ok = true;
    if (!ok && raw && /^\d+$/.test(String(raw.success || '')) && Number(raw.success) > 0) ok = true;
    if (!ok) {
      var err = new Error((raw && (raw.message_return || raw.message)) || 'שליחת הודעה נכשלה');
      err.route = 'Chat.SendCustomer';
      err.status = raw && raw.status;
      err.raw = raw;
      throw err;
    }
    return {
      ok: true,
      message: raw.message_return || raw.message || 'נשלח',
      raw: raw
    };
  }

  /** Event keys from biz1:ready that belong to messages / missions. */
  var MESSAGE_EVENT_KEYS = {
    'chat.message.received': 1,
    'whatsapp.message.received': 1,
    'whatsapp.inbox.refresh': 1,
    'rooms.chat.message': 1,
    'message.created': 1,
    'message.replied': 1,
    'email.created': 1,
    'email.deleted': 1
  };
  var MISSION_EVENT_KEYS = {
    'mission.reminder': 1,
    'teamops.task.updated': 1
  };

  var realtimeState = {
    status: 'off', // off | loading_io | connecting | ready | offline | error
    ready: null,
    error: null,
    socket: null,
    registered: []
  };
  var realtimeHandlersWired = false;

  function dispatchAppEvent(name, detail) {
    try {
      if (typeof global.dispatchEvent === 'function' && typeof global.CustomEvent === 'function') {
        global.dispatchEvent(new global.CustomEvent(name, { detail: detail || {} }));
      }
    } catch (e) { /* ignore */ }
  }

  function classifyRealtimeEvent(event) {
    var key = String((event && event.key) || '');
    if (MESSAGE_EVENT_KEYS[key] || /chat|whatsapp|message|inbox|email/i.test(key)) return 'messages';
    if (MISSION_EVENT_KEYS[key] || /mission|task/i.test(key)) return 'missions';
    if (/lead|crm/i.test(key)) return 'leads';
    return 'other';
  }

  function channelFromRealtimeEvent(event) {
    var key = String((event && event.key) || '').toLowerCase();
    var payload = (event && event.payload) || {};
    if (/whatsapp/.test(key) || payload.channel === 'whatsapp') return 'whatsapp';
    if (/email/.test(key) || payload.channel === 'email') return 'email';
    if (/rooms\.chat|live.?chat|web.?chat|cust_chat/.test(key) || payload.channel === 'web') return 'web';
    return '';
  }

  function setRealtimeStatus(status, error) {
    realtimeState.status = status;
    if (error != null) realtimeState.error = error;
    dispatchAppEvent('mineralbar:socket-status', {
      status: realtimeState.status,
      error: realtimeState.error,
      registered: realtimeState.registered.slice(),
      ready: realtimeState.ready
    });
  }

  function loadScriptOnce(src) {
    return new Promise(function (resolve, reject) {
      if (typeof document === 'undefined') {
        reject(new Error('document required to load ' + src));
        return;
      }
      var existing = document.querySelector('script[data-mb-src="' + src + '"], script[src="' + src + '"]');
      if (existing) {
        if (global.io) resolve();
        else existing.addEventListener('load', function () { resolve(); });
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.setAttribute('data-mb-src', src);
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Failed to load ' + src)); };
      (document.head || document.documentElement).appendChild(s);
    });
  }

  async function ensureSocketIo() {
    if (global.io) return global.io;
    setRealtimeStatus('loading_io');
    await loadScriptOnce(DOMAIN + '/realtime/socket.io/socket.io.js');
    if (!global.io) throw new Error('socket.io.js loaded but window.io missing');
    return global.io;
  }

  function wireRealtimeHandlers(client) {
    if (realtimeHandlersWired) return;
    realtimeHandlersWired = true;

    client.realtime.on('biz1:ready', function (payload) {
      realtimeState.ready = payload || null;
      realtimeState.registered = (payload && Array.isArray(payload.events)) ? payload.events.slice() : [];
      realtimeState.error = null;
      setRealtimeStatus('ready');
      // Registration is automatic via bearer auth — ready.events is the subscribed catalog.
      dispatchAppEvent('mineralbar:socket', {
        type: 'ready',
        payload: payload,
        registered: realtimeState.registered,
        messages: realtimeState.registered.filter(function (k) { return classifyRealtimeEvent({ key: k }) === 'messages'; }),
        missions: realtimeState.registered.filter(function (k) { return classifyRealtimeEvent({ key: k }) === 'missions'; })
      });
    });

    client.realtime.on('*', function (event) {
      var group = classifyRealtimeEvent(event);
      var detail = {
        group: group,
        key: event && event.key,
        channel: channelFromRealtimeEvent(event),
        event: event
      };
      dispatchAppEvent('mineralbar:realtime', detail);
      if (group === 'messages') dispatchAppEvent('mineralbar:messages', detail);
      if (group === 'missions') dispatchAppEvent('mineralbar:missions', detail);
      if (group === 'leads') dispatchAppEvent('mineralbar:leads', detail);
    });

    client.realtime.on('rooms:refresh', function (event) {
      dispatchAppEvent('mineralbar:realtime', { group: 'rooms', key: 'rooms:refresh', event: event });
    });
  }

  /**
   * Connect Socket.IO realtime after login.
   * Server registers the user on connect (auth.bearer) and returns subscribed
   * event keys in biz1:ready — including chat/message + mission events.
   */
  async function connectRealtime(options) {
    options = options || {};
    var client = getClient();
    if (!client.getToken()) {
      throw new Error('Realtime connect requires login');
    }

    await ensureSocketIo();
    wireRealtimeHandlers(client);
    setRealtimeStatus('connecting');

    var socket = client.realtime.connect({
      platform: options.platform || 'web',
      path: options.path || '/realtime/socket.io',
      deviceId: options.deviceId,
      fcmToken: options.fcmToken || '',
      token: options.token
    });
    realtimeState.socket = socket;

    socket.on('connect', function () {
      if (realtimeState.status !== 'ready') setRealtimeStatus('connecting');
      dispatchAppEvent('mineralbar:socket', { type: 'connect', id: socket.id });
    });
    socket.on('connect_error', function (err) {
      var msg = (err && err.message) || String(err);
      setRealtimeStatus('error', msg);
      dispatchAppEvent('mineralbar:socket', { type: 'error', error: msg });
    });
    socket.on('disconnect', function (reason) {
      if (realtimeState.status !== 'error') setRealtimeStatus('offline');
      dispatchAppEvent('mineralbar:socket', { type: 'disconnect', reason: reason });
    });

    return {
      socket: socket,
      promise: new Promise(function (resolve, reject) {
        var done = false;
        var t = setTimeout(function () {
          if (done) return;
          done = true;
          reject(new Error('biz1:ready timeout'));
        }, options.timeoutMs || 12000);
        var off = client.realtime.on('biz1:ready', function (payload) {
          if (done) return;
          done = true;
          clearTimeout(t);
          try { off(); } catch (e) { /* ignore */ }
          resolve(payload);
        });
        socket.on('connect_error', function (err) {
          if (done) return;
          done = true;
          clearTimeout(t);
          reject(err);
        });
      })
    };
  }

  function disconnectRealtime() {
    try {
      var client = getClient();
      if (client && client.realtime) client.realtime.disconnect();
    } catch (e) { /* ignore */ }
    realtimeState.socket = null;
    realtimeState.ready = null;
    realtimeState.registered = [];
    setRealtimeStatus('off');
  }

  function getRealtimeState() {
    return {
      status: realtimeState.status,
      error: realtimeState.error,
      registered: realtimeState.registered.slice(),
      ready: realtimeState.ready,
      connected: !!(realtimeState.socket && realtimeState.socket.connected)
    };
  }

  function getRegisteredRealtimeEvents() {
    return realtimeState.registered.slice();
  }

  global.Biz1App = {
    DOMAIN: DOMAIN,
    getDomain: function () { return DOMAIN; },
    getTenantUser: getTenantUser,
    FOLDERS: FOLDERS,
    ROLE_HOME: ROLE_HOME,
    SCREEN_API: SCREEN_API,
    getClient: getClient,
    login: login,
    detectLoginIdentifier: detectLoginIdentifier,
    refreshSession: refreshSession,
    ensureAuth: ensureAuth,
    canAutoRefresh: canAutoRefresh,
    getSavedCredentials: function () {
      var c = getSavedCredentials();
      return c ? { username: c.username, source: c.source } : null;
    },
    saveCredentials: saveCredentials,
    detectRole: detectRole,
    saveSession: saveSession,
    clearSession: clearSession,
    getRole: getRole,
    getEmail: getEmail,
    getUserBasic: getUserBasic,
    getUser: getUser,
    getFolders: getFolders,
    getTeamMembers: getTeamMembers,
    homeForRole: homeForRole,
    isAuthenticated: isAuthenticated,
    requireAuth: requireAuth,
    requireAuthOrRedirect: requireAuth,
    listCustomers: listCustomers,
    countCustomers: countCustomers,
    listMissions: listMissions,
    getMission: getMission,
    updateMission: updateMission,
    countMissions: countMissions,
    createMission: createMission,
    doneMission: doneMission,
    deleteMission: deleteMission,
    getCustomer: getCustomer,
    getTicket: getTicket,
    listDocuments: listDocuments,
    listBusinessDocuments: listBusinessDocuments,
    listCustomerInvoices: listCustomerInvoices,
    listCustomerOrders: listCustomerOrders,
    listEmails: listEmails,
    listChatConversations: listChatConversations,
    conversationListChannel: conversationListChannel,
    listChatInbox: listChatInbox,
    listOmnichannelConversations: listOmnichannelConversations,
    listSingleConversations: listSingleConversations,
    listCustomerMessages: listCustomerMessages,
    messageSortTs: messageSortTs,
    sortTsFromWhen: sortTsFromWhen,
    parseEmailsHtml: parseEmailsHtml,
    sendCustomerMessage: sendCustomerMessage,
    uploadCustomerFile: uploadCustomerFile,
    resolveFileUrl: resolveFileUrl,
    connectRealtime: connectRealtime,
    disconnectRealtime: disconnectRealtime,
    getRealtimeState: getRealtimeState,
    getRegisteredRealtimeEvents: getRegisteredRealtimeEvents,
    MESSAGE_EVENT_KEYS: MESSAGE_EVENT_KEYS,
    MISSION_EVENT_KEYS: MISSION_EVENT_KEYS
  };
  /* Alias for existing call sites */
  global.MineralBarApp = global.Biz1App;
})(typeof window !== 'undefined' ? window : globalThis);
