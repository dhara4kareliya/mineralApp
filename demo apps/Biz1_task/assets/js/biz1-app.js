/**
 * Biz1 Showcase — SDK bootstrap
 * Domain comes from assets/js/config.js → Biz1Config.user
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
      throw new Error('Set Biz1Config.user in assets/js/config.js (Bull36 subdomain)');
    }
    return 'https://' + user + '.bull36.com';
  }

  function getTenantUser() {
    var cfg = global.Biz1Config || {};
    return normalizeTenantUser(cfg.user || cfg.tenant || cfg.account);
  }

  function getBrand(lang) {
    var cfg = global.Biz1Config || {};
    var brand = cfg.brand || {};
    var l = lang || (global.document && document.documentElement.lang) || 'he';
    return brand[l] || brand.en || brand.he || 'Biz1 Showcase';
  }

  function getBrandShort(lang) {
    var cfg = global.Biz1Config || {};
    var brand = cfg.brandShort || {};
    var l = lang || (global.document && document.documentElement.lang) || 'he';
    return brand[l] || brand.en || brand.he || 'Biz1';
  }

  function getBrandDemo(lang) {
    var cfg = global.Biz1Config || {};
    var brand = cfg.brandDemo || {};
    var l = lang || (global.document && document.documentElement.lang) || 'he';
    if (brand[l] || brand.en || brand.he) return brand[l] || brand.en || brand.he;
    return getBrand(l) + (l === 'he' ? ' · דמו' : ' · Demo');
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
    sales: 'sales_home.html',
    service: 'service_calls.html',
    tech: 'tech_dashboard.html'
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
    'הודעות (רשימה)': { routes: ['Chat.Conversations', 'Chat.Inbox'], status: 'live' },
    'שיחה בודדת': { routes: ['Chat.CustomerMessages', 'Chat.SendCustomer'], status: 'live' },
    'Realtime socket': {
      routes: ['client.realtime.connect', 'biz1:ready', 'biz1:event'],
      status: 'live',
      events: ['chat.message.received', 'whatsapp.message.received', 'whatsapp.inbox.refresh', 'mission.reminder', 'teamops.task.updated']
    },
    'הודעות / צ׳אט Inbox': { routes: ['Chat.Inbox', 'Chat.Conversations', 'Chat.CustomerMessages'], status: 'live' },
    'שעון נוכחות': { routes: ['WorkingTime.List', 'WorkingTime.StartStop', 'WorkingTime.Save'], status: 'partial' },
    'מלאי': { routes: ['Products.List', 'Products.Count'], status: 'live' },
    'מסמכים / הצעות / הזמנות': { routes: ['Documents.List', 'Documents.Count', 'Forms.*', 'PaymentForms.*'], status: 'partial' },
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
      console.info('[MineralBar] refreshing token via login…', cred.username);
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

  /** One priority rule shared by task cards, filters, and detail popup. */
  window.getMissionPriority = function (m) {
    m = m || {};
    var priority = m.priority || m.priority_he || m.priority_en || 'normal';
    if (m.meta) {
      try {
        var meta = JSON.parse(m.meta);
        priority = meta.priority || meta.priority_he || meta.priority_en || priority;
      } catch (e) { /* plain meta */ }
    }
    var color = String(m.color || '').toLowerCase();
    var note = String(m.note || '');
    if (/דחוף|גבוה|urgent|high/i.test(priority) ||
        color === '#ef4444' || color === '#c0392b' || color === '#f59e0b' ||
        /urgent|דחוף/i.test(note)) return 'urgent';
    if (/נמוכ|low/i.test(priority) ||
        color === '#22c55e' || color === '#2e8a63' ||
        /low/i.test(note)) return 'low';
    return 'normal';
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
    var priority = window.getMissionPriority(m);
    
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
    
    var date = m.date_to_do || (window.t ? window.t('not_set') : 'Not set');
    var time = m.time || '';
    var customer = m.customer_name || (window.t ? window.t('no_customer') : 'No customer');
    var desc = m.description || m.note || m.notes || '';
    var createdAt = m.date_created || (window.t ? window.t('not_set') : 'Not set');
    
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
    if (!client || client.__mineralAuthWrapped) return;
    client.__mineralAuthWrapped = true;
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

  /** Detect whether the login field is email, phone, numeric id, or username. */
  function resolveLoginCredentials(loginId, password, otp) {
    var id = String(loginId || '').trim();
    var creds = { password: password || '', otp: String(otp || '').trim() };
    if (!id) return creds;

    if (id.indexOf('@') !== -1) {
      creds.email = id;
      return creds;
    }

    var digits = id.replace(/\D/g, '');
    var looksLikePhone =
      /^[+]/.test(id) ||
      (/^0\d/.test(id) && digits.length >= 9) ||
      ((/[\s\-()]/.test(id) || /^\d{10,15}$/.test(id)) && digits.length >= 9 && digits.length <= 15);

    if (looksLikePhone) {
      creds.phone = digits || id;
      return creds;
    }

    if (/^\d+$/.test(id)) {
      creds.id = id;
      return creds;
    }

    creds.username = id;
    return creds;
  }

  function buildLoginBody(creds) {
    var body = {
      password: (creds && creds.password) || '',
      otp: String((creds && creds.otp) || '').trim()
    };
    if (creds && creds.email) body.email = creds.email;
    else if (creds && creds.id !== undefined && creds.id !== null && String(creds.id).trim() !== '') body.id = creds.id;
    else if (creds && creds.phone) body.phone = creds.phone;
    else if (creds && (creds.username || creds.user)) body.username = creds.username || creds.user;
    return body;
  }

  var loginInFlight = null;

  async function login({ username, password, otp, remember }) {
    // Collapse rapid double-submit / OTP resend into one Login call.
    if (loginInFlight) return loginInFlight;

    loginInFlight = (async function () {
      var client = getClient();
      var loginId = (username || '').trim();
      var creds = resolveLoginCredentials(loginId, password, otp || '');
      var body = buildLoginBody(creds);
      var data;
      try {
        // Prefer request() so email/phone/id/username fields reach Login
        // (remote SDK login always collapses to username only).
        if (typeof client.request === 'function') {
          data = await client.request('Login', body, { public: true });
          if (data && data.token && !(data.otp_required || data.otpRequired)) {
            client.setToken(data.token);
          }
        } else {
          data = await client.login(creds);
        }
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
    })();

    try {
      return await loginInFlight;
    } finally {
      loginInFlight = null;
    }
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
  var ensureAuthInFlight = null;

  async function ensureAuth(loginPage) {
    if (ensureAuthInFlight) return ensureAuthInFlight;

    ensureAuthInFlight = (async function () {
      var authed = isAuthenticated();
      if (authed && !tokenNeedsRefresh()) return getClient();

      if (canAutoRefresh() && (!authed || tokenNeedsRefresh())) {
        try {
          await refreshSession();
          if (isAuthenticated() && !tokenNeedsRefresh()) return getClient();
          if (isAuthenticated()) return getClient();
        } catch (err) {
          console.warn('[MineralBar] auto refresh failed', err);
          try { clearSession({ keepEmail: true }); } catch (e) { /* ignore */ }
        }
      }

      if (isAuthenticated() && !tokenNeedsRefresh()) return getClient();
      if (isAuthenticated() && !canAutoRefresh()) return getClient();

      redirectToLogin(loginPage);
      return null;
    })();

    try {
      return await ensureAuthInFlight;
    } finally {
      ensureAuthInFlight = null;
    }
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

  /** List customers in a folder (≤25). Always normalize to { rows, total, raw }. */
  async function listCustomers(folderId, extra) {
    var client = getClient();
    var payload = { length: 25, start: 0 };
    if (typeof folderId === 'object' && folderId !== null) {
      payload = Object.assign(payload, folderId);
    } else if (folderId != null && folderId !== '') {
      payload = Object.assign(payload, { folder_id: folderId }, extra || {});
    } else if (extra && typeof extra === 'object') {
      payload = Object.assign(payload, extra);
    }
    // Customer.List does not accept mission-style extras
    delete payload.include_counts;
    delete payload.type;
    delete payload.draw;

    var result;
    try {
      result = await client.request('Customer.List', payload);
    } catch (err) {
      try {
        if (client.customers && typeof client.customers.list === 'function') {
          result = await client.customers.list(payload);
        } else {
          throw err;
        }
      } catch (err2) {
        throw err2;
      }
    }

    var rows = [];
    if (result && Array.isArray(result.data) && result.data.length) rows = result.data;
    else if (result && Array.isArray(result.rows) && result.rows.length) rows = result.rows;
    else if (result && result.raw && Array.isArray(result.raw.data)) rows = result.raw.data;
    else if (result && result.raw && Array.isArray(result.raw.rows)) rows = result.raw.rows;
    else if (result && Array.isArray(result.data)) rows = result.data;
    else if (result && Array.isArray(result.rows)) rows = result.rows;

    var total = result && (result.count != null ? result.count
      : (result.recordsFiltered != null ? result.recordsFiltered
        : (result.total != null ? result.total : rows.length)));
    return { rows: rows, total: Number(total) || rows.length, raw: result && result.raw ? result.raw : result };
  }

  async function listProducts(extra) {
    var client = getClient();
    var raw = await client.request('Products.List', extra || {});
    var rows = Array.isArray(raw.rows) ? raw.rows : (Array.isArray(raw.data) ? raw.data : (Array.isArray(raw) ? raw : []));
    return { rows: rows, raw: raw };
  }

  async function listProjects(extra) {
    var client = getClient();
    var raw = await client.request('Projects.List', extra || {});
    var rows = Array.isArray(raw.rows) ? raw.rows
      : (Array.isArray(raw.data) ? raw.data
        : (Array.isArray(raw.projects) ? raw.projects
          : (Array.isArray(raw) ? raw : [])));
    return { rows: rows, raw: raw };
  }

  async function listProjectColumns(extra) {
    var client = getClient();
    var raw = await client.request('Projects.ColumnsList', Object.assign({ limit: 25 }, extra || {}));
    var rows = Array.isArray(raw.rows) ? raw.rows
      : (Array.isArray(raw.data) ? raw.data
        : (Array.isArray(raw.output) ? raw.output
          : (Array.isArray(raw.list) ? raw.list
            : (Array.isArray(raw) ? raw : []))));
    var order = Array.isArray(raw.order) ? raw.order : [];
    return { rows: rows, order: order, raw: raw };
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

  function missionRowId(row) {
    if (!row || typeof row !== 'object') return '';
    var id = row.mission_id != null ? row.mission_id : row.id;
    return id != null && id !== '' ? String(id) : '';
  }

  /** Keep first occurrence of each mission_id/id (API may repeat rows across buckets). */
  function dedupeMissionRows(rows) {
    var seen = Object.create(null);
    var out = [];
    (rows || []).forEach(function (row) {
      var id = missionRowId(row);
      if (id) {
        if (seen[id]) return;
        seen[id] = true;
      }
      out.push(row);
    });
    return out;
  }

  function normalizeListPageSize(extra) {
    var e = Object.assign({}, extra || {});
    var n = Number(e.length != null ? e.length : (e.limit != null ? e.limit : (e.per_page != null ? e.per_page : 25)));
    if (!Number.isFinite(n) || n < 1) n = 25;
    if (n > 25) n = 25;
    e.length = n;
    e.limit = n;
    delete e.per_page;
    if (e.start == null) e.start = 0;
    if (e.draw == null) e.draw = 1;
    if (e.include_counts == null) e.include_counts = 1;
    if (e.all_task != null) e.all_task = 0;
    return e;
  }

  function buildMissionGroupsFromFlat(flatRows, flatTotal, counts) {
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
      counts: counts || {},
      raw: null
    };
  }

  /**
   * Mission.List — supports:
   * 1) New flat shape: { rows|data, total_record|count|recordsFiltered }
   * 2) Legacy HTML buckets: today_tasks / priority_tasks / …
   * One page only (API max 25). No auto multi-page loop — that caused 3–5× Mission.List.
   * Normalize to { groups, rows, total, counts, raw }.
   */
  async function listMissions(extra) {
    var client = getClient();
    var base = normalizeListPageSize(extra);
    var raw;
    try {
      raw = await client.request('Mission.List', base);
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

    var flatRows = Array.isArray(raw.rows) ? raw.rows.slice()
      : (Array.isArray(raw.data) ? raw.data.slice() : []);
    var apiTotal = Number(
      raw.total_record != null ? raw.total_record
        : (raw.recordsFiltered != null ? raw.recordsFiltered
          : (raw.recordsTotal != null ? raw.recordsTotal
            : (raw.count != null ? raw.count : flatRows.length)))
    );
    if (Number.isNaN(apiTotal)) apiTotal = flatRows.length;

    // Flat list response — single page only (no start+=25 loop)
    if (flatRows.length || (!raw.today_tasks && !raw.priority_tasks && (raw.rows || raw.data))) {
      flatRows = dedupeMissionRows(flatRows);
      var flatTotal = flatRows.length;

      var built = buildMissionGroupsFromFlat(
        flatRows,
        flatTotal,
        raw.scope_counts || raw.tab_counts || {}
      );
      built.raw = raw;
      built.apiTotal = apiTotal;
      return built;
    }

    var defs = [
      { key: 'priority_tasks', id: 'overdue', label: 'באיחור', color: '#d0432f', badgeBg: '#fbeeed', badgeColor: '#c0392b' },
      { key: 'today_tasks', id: 'today', label: 'היום', color: '#1d60a2', badgeBg: '#eaf2fb', badgeColor: '#1d60a2' },
      { key: 'upcoming_tasks', id: 'upcoming', label: 'קרובות', color: '#bd8324', badgeBg: '#fdf1dd', badgeColor: '#bd8324' },
      { key: 'done_tasks', id: 'done', label: 'בוצעו', color: '#2e8a63', badgeBg: '#e6f4ec', badgeColor: '#2e8a63' }
    ];

    var bucketRowsAll = [];
    var groups = defs.map(function (d) {
      var bucket = raw[d.key] || {};
      var rows = dedupeMissionRows(bucketRows(bucket));
      bucketRowsAll = bucketRowsAll.concat(rows);
      return {
        id: d.id,
        key: d.key,
        label: d.label,
        color: d.color,
        badgeBg: d.badgeBg,
        badgeColor: d.badgeColor,
        total: rows.length || bucketTotal(bucket),
        rows: rows,
        html: typeof bucket.html === 'string' ? bucket.html : '',
        bucket: bucket
      };
    });

    var uniqueLegacy = dedupeMissionRows(bucketRowsAll);
    var total = uniqueLegacy.length;
    if (!total && raw.total_record != null) {
      var t = Number(raw.total_record);
      if (!Number.isNaN(t)) total = t;
    }

    var counts = (raw.create_by_total_counts && typeof raw.create_by_total_counts === 'object')
      ? raw.create_by_total_counts
      : (raw.tab_counts || raw.scope_counts || {});

    return { groups: groups, rows: uniqueLegacy, total: total, counts: counts, raw: raw };
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
   * Note: some accounts reject relative date_to_do values like "today" — convert to UTC.
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
    if (p.date_to_do) {
      var rawDate = String(p.date_to_do).trim().toLowerCase();
      if (rawDate === 'today' || rawDate === 'tomorrow' || rawDate === 'next_week') {
        var d = new Date();
        if (rawDate === 'tomorrow') d.setUTCDate(d.getUTCDate() + 1);
        if (rawDate === 'next_week') d.setUTCDate(d.getUTCDate() + 7);
        function pad2(n) { return n < 10 ? '0' + n : String(n); }
        payload.date_to_do = d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()) +
          ' ' + pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes()) + ':' + pad2(d.getUTCSeconds());
      } else {
        payload.date_to_do = p.date_to_do;
      }
    }
    if (p.color) payload.color = p.color;
    if (p.mission_color) payload.mission_color = p.mission_color;
    if (p.private != null) payload.private = p.private ? 1 : 0;
    if (p.project_column) payload.project_column = p.project_column;
    if (p.project_id) payload.project_id = p.project_id;
    if (p.mission_step) payload.mission_step = p.mission_step;
    if (p.step_id) {
      payload.step_id = p.step_id;
      payload.missions_steps_id = p.step_id;
    }
    if (p.email_me_employee != null) payload.email_me_employee = p.email_me_employee ? 1 : 0;
    if (p.whatsApp_reminder != null) payload.whatsApp_reminder = p.whatsApp_reminder ? 1 : 0;
    if (p.recording_link) payload.recording_link = p.recording_link;
    if (p.sub_missions) payload.sub_missions = p.sub_missions;
    if (p.time_estimate) payload.time_estimate = p.time_estimate;
    if (p.duration) payload.duration = p.duration;
    if (p.return_freq || p.repeat) payload.return = p.return_freq || p.repeat;
    if (p.reminders) payload.reminders = p.reminders;
    if (p.use_as_template != null) payload.use_as_template = p.use_as_template ? 1 : 0;
    if (p.email_reminder != null) payload.email_reminder = p.email_reminder ? 1 : 0;
    if (p.whatsapp_reminder != null) payload.whatsapp_reminder = p.whatsapp_reminder ? 1 : 0;
    if (p.notify_client != null) payload.notify_client = p.notify_client ? 1 : 0;
    if (p.customer_id != null && p.customer_id !== '') payload.customer_id = p.customer_id;
    if (p.organizations_user != null && p.organizations_user !== '') {
      payload.organizations_user = p.organizations_user;
    }
    if (p.assigned_to != null && p.assigned_to !== '') {
      payload.assigned_to = p.assigned_to;
    }
    if (p.member_id != null && p.member_id !== '') {
      payload.member_id = typeof p.member_id === 'string'
        ? p.member_id
        : JSON.stringify(Array.isArray(p.member_id) ? p.member_id : [p.member_id]);
    }
    var raw = await client.request('Mission.Create', payload);
    if (!raw || !(Number(raw.success) === 1 || raw.success === true || raw.insert_id || raw.mission_id)) {
      var err = new Error((raw && raw.message) || 'יצירת משימה נכשלה');
      err.route = 'Mission.Create';
      err.status = raw && raw.status;
      err.raw = raw;
      throw err;
    }
    return {
      id: raw.mission_id || raw.insert_id || (raw.output && raw.output.id) || null,
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

  var missionUpdateQueue = Promise.resolve();
  var lastMissionUpdateAt = 0;
  var MISSION_UPDATE_GAP_MS = 1500;

  function waitMs(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function isRateLimitError(err) {
    return !!(err && (
      Number(err.status) === 429 ||
      Number(err.raw && err.raw.status) === 429 ||
      /too many requests|rate.?limit/i.test(String(err.message || ''))
    ));
  }

  async function runMissionUpdateRequest(id, filed, saveoutput) {
    var client = getClient();
    var elapsed = Date.now() - lastMissionUpdateAt;
    if (elapsed < MISSION_UPDATE_GAP_MS) {
      await waitMs(MISSION_UPDATE_GAP_MS - elapsed);
    }

    var attempts = 0;
    while (true) {
      try {
        lastMissionUpdateAt = Date.now();
        return await client.request('Mission.Update', {
          id: id,
          mission_id: id,
          filed: filed,
          saveoutput: saveoutput
        });
      } catch (err) {
        if (!isRateLimitError(err) || attempts >= 3) throw err;
        attempts += 1;
        await waitMs(5000 * attempts);
      }
    }
  }

  /** Mission.Update requires id + filed + saveoutput (typo "filed" is API contract). */
  async function updateMission(params) {
    var p = params || {};
    var id = requireId(p.id || p.mission_id, 'mission_id/id');
    var filed = p.filed || p.field || 'note';
    var saveoutput = p.saveoutput != null ? p.saveoutput : (p.value || '');
    var task = missionUpdateQueue.then(function () {
      return runMissionUpdateRequest(id, filed, saveoutput);
    });
    missionUpdateQueue = task.catch(function () { /* keep queue usable */ });
    var raw = await task;
    if (!(raw && (Number(raw.success) === 1 || raw.success === true))) {
      var err = new Error((raw && raw.message) || 'Mission.Update failed');
      err.route = 'Mission.Update';
      err.raw = raw;
      throw err;
    }
    return { ok: true, message: raw.message, raw: raw };
  }

  /**
   * Map UI field names → real missions table columns for Mission.Update.
   * (e.g. title is Create-only; DB column is `mission`. private → private_mission)
   */
  var MISSION_UPDATE_FIELD_MAP = {
    title: 'mission',
    private: 'private_mission',
    customer_id: 'lead_id',
    mission_color: 'color',
    assigned_to: 'member_id',
    description: 'note'
  };

  /** Columns accepted by Mission.Update on this account (others cause 500 unknown column). */
  var MISSION_UPDATE_ALLOWED = {
    mission: true,
    note: true,
    date_to_do: true,
    color: true,
    project_column: true,
    private_mission: true,
    member_id: true,
    lead_id: true,
    image: true,
    meta: true,
    project_id: true,
    step_id: true,
    missions_steps_id: true,
    notify_client: true,
    email_me_employee: true,
    whatsApp_reminder: true,
    use_as_template: true
  };

  var FILES_CDN = 'https://files.biz1.co.il/';

  function resolveFileUrl(pathOrUrl) {
    var s = String(pathOrUrl || '').trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s) || /^data:/i.test(s)) return s;
    return FILES_CDN + s.replace(/^\/+/, '');
  }

  function parseMissionImageList(imageField) {
    var raw = String(imageField || '').trim();
    if (!raw) return [];
    if (/^data:image\//i.test(raw)) return [raw];
    return raw.split(',').map(function (p) { return p.trim(); }).filter(Boolean);
  }

  function parseRecordingFromMeta(meta) {
    var raw = String(meta == null ? '' : meta).trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    try {
      var obj = JSON.parse(raw);
      if (obj && typeof obj === 'object') {
        return String(obj.recording_link || obj.recording || obj.link || '').trim();
      }
    } catch (e) { /* plain text */ }
    return raw;
  }

  function buildRecordingMeta(link, previousMeta) {
    var url = String(link || '').trim();
    var prev = String(previousMeta == null ? '' : previousMeta).trim();
    if (!url) {
      // Clear recording: if previous was JSON keep other keys, else empty
      try {
        var obj0 = JSON.parse(prev);
        if (obj0 && typeof obj0 === 'object' && !Array.isArray(obj0)) {
          delete obj0.recording_link;
          delete obj0.recording;
          delete obj0.link;
          return Object.keys(obj0).length ? JSON.stringify(obj0) : '';
        }
      } catch (e0) { /* ignore */ }
      return /^https?:\/\//i.test(prev) ? '' : prev;
    }
    try {
      var obj = JSON.parse(prev);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        obj.recording_link = url;
        return JSON.stringify(obj);
      }
    } catch (e1) { /* ignore */ }
    // Live CRM often stores a plain recording URL in meta
    return url;
  }

  /**
   * Files.Upload — requires customer_id. Returns CDN path + url.
   * Field name for binary: `file` (also accepts `upload` / `image`).
   */
  async function uploadCustomerFile(customerId, file, extra) {
    var cid = requireId(customerId, 'customer_id');
    if (!file) throw new Error('file is required');
    var client = getClient();
    var fd = new FormData();
    fd.append('customer_id', String(cid));
    fd.append('file', file, file.name || 'upload.bin');
    if (extra && typeof extra === 'object') {
      Object.keys(extra).forEach(function (k) {
        if (extra[k] != null) fd.append(k, String(extra[k]));
      });
    }
    var raw = await client.request('Files.Upload', fd);
    var f = (raw && raw.file) || {};
    var path = f.file_path || f.path || '';
    var url = f.file_url || resolveFileUrl(path);
    if (!path && !url) {
      var err = new Error((raw && raw.message) || 'Files.Upload failed');
      err.route = 'Files.Upload';
      err.raw = raw;
      throw err;
    }
    return { path: path, url: url, id: f.id || raw.document_id || null, raw: raw };
  }

  /** Upload one or more images and set mission.image (comma-separated paths). */
  async function saveMissionImages(missionId, customerId, files, existingPaths, previousImageField) {
    var id = requireId(missionId, 'mission_id/id');
    var kept = (existingPaths || []).map(function (p) { return String(p || '').trim(); }).filter(Boolean);
    var uploaded = [];
    var list = Array.prototype.slice.call(files || []);
    if (list.length) {
      var cid = customerId;
      if (!cid) {
        var err = new Error('Customer is required to upload images');
        err.code = 'CUSTOMER_REQUIRED_FOR_UPLOAD';
        throw err;
      }
      for (var i = 0; i < list.length; i++) {
        var up = await uploadCustomerFile(cid, list[i]);
        uploaded.push(up.path || up.url);
      }
    }
    var merged = kept.concat(uploaded);
    // Dedupe
    var seen = Object.create(null);
    merged = merged.filter(function (p) {
      if (seen[p]) return false;
      seen[p] = true;
      return true;
    });
    var nextImage = merged.join(',');
    var previousImage = parseMissionImageList(previousImageField).join(',');
    if (list.length || nextImage !== previousImage) {
      await updateMission({ id: id, mission_id: id, filed: 'image', saveoutput: nextImage });
    }
    return { paths: merged, urls: merged.map(resolveFileUrl) };
  }

  async function saveMissionRecording(missionId, recordingLink, previousMeta) {
    var id = requireId(missionId, 'mission_id/id');
    var meta = buildRecordingMeta(recordingLink, previousMeta);
    if (meta !== String(previousMeta == null ? '' : previousMeta).trim()) {
      await updateMission({ id: id, mission_id: id, filed: 'meta', saveoutput: meta });
    }
    return { meta: meta };
  }

  function toUtcDateTimeString(value) {
    if (value == null || value === '') return '';
    if (window.Biz1SDK && typeof Biz1SDK.toUtcDateTime === 'function') {
      try {
        var viaSdk = Biz1SDK.toUtcDateTime(value instanceof Date ? value : String(value));
        if (viaSdk) return viaSdk;
      } catch (e) { /* fall through */ }
    }
    var d = value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) {
      // already Y-m-d H:i:s — keep as-is
      var s = String(value).trim();
      return /^\d{4}-\d{2}-\d{2}/.test(s) ? s : '';
    }
    function p(n) { return n < 10 ? '0' + n : String(n); }
    return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) +
      ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds());
  }

  /**
   * Update several mission fields via Mission.Update (one field per request).
   * Used by the edit-task form so Save updates the same task (no Mission.Create).
   */
  function comparableMissionValue(field, value) {
    if (value == null) return '';
    if (field === 'private_mission' || field === 'notify_client' ||
        field === 'email_me_employee' || field === 'whatsApp_reminder' ||
        field === 'use_as_template') {
      return (value === true || Number(value) === 1) ? '1' : '0';
    }
    if (field === 'project_id' || field === 'step_id' || field === 'missions_steps_id') {
      return String(Number(value) || 0);
    }
    if (field === 'member_id') {
      var members = value;
      if (typeof members === 'string') {
        try { members = JSON.parse(members); } catch (e) { members = [members]; }
      }
      if (!Array.isArray(members)) members = [members];
      return members.map(String).sort().join(',');
    }
    if (field === 'date_to_do') {
      var date = toUtcDateTimeString(value);
      return date ? date.slice(0, 16) : '';
    }
    return String(value).trim();
  }

  async function updateMissionFields(missionId, fields, currentFields) {
    var id = requireId(missionId, 'mission_id/id');
    var map = fields || {};
    var normalized = Object.create(null);
    Object.keys(map).forEach(function (key) {
      var filed = MISSION_UPDATE_FIELD_MAP[key] || key;
      if (!MISSION_UPDATE_ALLOWED[filed]) return;
      var val = map[key];
      if (val === undefined || val === null) return;
      // Prefer non-empty later values; title/mission both map to mission
      if (normalized[filed] != null && normalized[filed] !== '' && (val === '' || val == null)) return;
      normalized[filed] = val;
    });

    var keys = Object.keys(normalized);
    var results = [];
    var current = currentFields || {};
    for (var i = 0; i < keys.length; i++) {
      var filed = keys[i];
      var val = normalized[filed];
      if (filed === 'date_to_do') {
        val = toUtcDateTimeString(val);
        if (!val) continue;
      }
      if (val === '') continue;
      if (typeof val === 'object') {
        try { val = JSON.stringify(val); } catch (e) { val = String(val); }
      }
      if (filed === 'private_mission') val = (val === true || val === 1 || val === '1') ? 1 : 0;
      if (Object.prototype.hasOwnProperty.call(current, filed) &&
          comparableMissionValue(filed, current[filed]) === comparableMissionValue(filed, val)) {
        continue;
      }
      results.push(await updateMission({ id: id, mission_id: id, filed: filed, saveoutput: val }));
    }
    return { ok: true, id: id, results: results };
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
    var raw = await client.request('Documents.List', Object.assign({
      customer_id: id,
      length: 25,
      start: 0,
      draw: 1
    }, extra || {}));
    return { raw: raw, html: raw.files_html || '', customer_id: id };
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
    if (v == null) return '';
    if (typeof v === 'string' || typeof v === 'number') {
      var d0 = new Date(v);
      return Number.isNaN(d0.getTime()) ? String(v) : d0.toLocaleString('he-IL');
    }
    if (typeof v === 'object') {
      var n = v.$date && (v.$date.$numberLong || v.$date);
      if (n != null) {
        var ms = Number(n);
        if (!Number.isNaN(ms)) {
          // Biz1 sometimes stores seconds-as-ms already
          if (ms < 1e12) ms *= 1000;
          return new Date(ms).toLocaleString('he-IL');
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
    return String((r && (r.message || r.note || r.import_note || r.subject)) || '').trim();
  }

  /**
   * Chat.Inbox / Chat.Conversations — conversation list (per help category Chat).
   * Current mineral API returns email-thread rows (email/subject/note/customer_id).
   * Prefer a real customer_id for opening Chat.CustomerMessages.
   */
  async function listChatConversations(extra) {
    var client = getClient();
    var raw;
    try {
      raw = await client.request('Chat.Conversations', Object.assign({
        page: 1,
        limit: 25
      }, extra || {}));
    } catch (err) {
      raw = await client.request('Chat.Inbox', Object.assign({
        page: 1,
        limit: 25
      }, extra || {}));
    }
    var data = (raw && Array.isArray(raw.data)) ? raw.data : [];
    var rows = data.map(function (r) {
      var cid = chatCustomerId(r);
      var email = r.cust_email || r.email || '';
      var name = r.cust_name || r.name || '';
      if (!name && email) name = String(email).split('@')[0] || email;
      if (!name && cid) name = 'לקוח #' + cid;
      if (!name) name = r.subject || ('שיחה #' + (r.id || r.message_id || ''));
      return {
        id: cid || r.id || r.message_id || 0,
        customer_id: cid,
        cust_id: cid,
        message_id: r.message_id || r.id || '',
        name: name,
        email: email,
        phone: r.cust_phone || r.phone || '',
        subject: chatSnippet(r) || r.subject || 'שיחה',
        when: chatWhen(r),
        messenger_meta_id: r._id && (r._id.$oid || r._id),
        raw: r
      };
    });
    var total = Number(raw && (raw.total != null ? raw.total : raw.count));
    if (Number.isNaN(total)) total = rows.length;
    return { rows: rows, total: total, raw: raw };
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
      return {
        message: chatSnippet(r),
        user_name: r.user_name || r.email || '',
        time: r.time || chatWhen(r),
        direction: r.direction,
        type: r.type || '',
        user_id: r.user_id,
        messenger_meta_id: r.messenger_meta_id && (r.messenger_meta_id.$oid || r.messenger_meta_id),
        raw: r
      };
    });
    // API returns newest first — show oldest→newest in chat UI
    rows.reverse();
    return {
      rows: rows,
      count: Number(raw && raw.count != null ? raw.count : rows.length),
      customer_id: raw && (raw.contactus_id || id),
      raw: raw
    };
  }

  /**
   * Chat.SendCustomer — always send customer_id (and cust_id alias).
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
      cust_id: customerId
    };
    if (p.email) payload.email = p.email;
    if (p.message_id) payload.message_id = p.message_id;
    var raw = await client.request('Chat.SendCustomer', payload);
    var ok = raw && (
      Number(raw.success) === 1 ||
      raw.success === true ||
      Number(raw.output) === 1 ||
      (raw.message_return && String(raw.message_return).length > 0) ||
      /נשלח|נוספה|הצלח/i.test(String(raw.message_return || raw.message || ''))
    );
    // success "4" is a known Biz1 “note added” code
    if (!ok && raw && String(raw.success) === '4') ok = true;
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
    'rooms.chat.message': 1
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
    if (MESSAGE_EVENT_KEYS[key] || /chat|whatsapp|message|inbox/i.test(key)) return 'messages';
    if (MISSION_EVENT_KEYS[key] || /mission|task/i.test(key)) return 'missions';
    if (/lead|crm/i.test(key)) return 'leads';
    return 'other';
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
      dispatchAppEvent('mineralbar:socket', {
        type: 'ready',
        payload: payload,
        registered: realtimeState.registered,
        messages: realtimeState.registered.filter(function (k) { return classifyRealtimeEvent({ key: k }) === 'messages'; }),
        missions: realtimeState.registered.filter(function (k) { return classifyRealtimeEvent({ key: k }) === 'missions'; })
      });
    });

    // Single path only: SDK already emits both event.key and '*'.
    // Listening on both specific keys and '*' used to fire every reload 2×.
    client.realtime.on('*', function (event) {
      var group = classifyRealtimeEvent(event);
      var detail = { group: group, key: event && event.key, event: event };
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

  global.MineralBarApp = {
    DOMAIN: DOMAIN,
    getDomain: resolveDomain,
    getTenantUser: getTenantUser,
    getBrand: getBrand,
    getBrandShort: getBrandShort,
    getBrandDemo: getBrandDemo,
    FOLDERS: FOLDERS,
    ROLE_HOME: ROLE_HOME,
    SCREEN_API: SCREEN_API,
    getClient: getClient,
    login: login,
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
    listProducts: listProducts,
    listProjects: listProjects,
    listProjectColumns: listProjectColumns,
    countCustomers: countCustomers,
    listMissions: listMissions,
    getMission: getMission,
    updateMission: updateMission,
    updateMissionFields: updateMissionFields,
    countMissions: countMissions,
    createMission: createMission,
    doneMission: doneMission,
    deleteMission: deleteMission,
    getCustomer: getCustomer,
    getTicket: getTicket,
    listDocuments: listDocuments,
    uploadCustomerFile: uploadCustomerFile,
    saveMissionImages: saveMissionImages,
    saveMissionRecording: saveMissionRecording,
    resolveFileUrl: resolveFileUrl,
    parseMissionImageList: parseMissionImageList,
    parseRecordingFromMeta: parseRecordingFromMeta,
    FILES_CDN: FILES_CDN,
    listEmails: listEmails,
    listChatConversations: listChatConversations,
    listCustomerMessages: listCustomerMessages,
    parseEmailsHtml: parseEmailsHtml,
    sendCustomerMessage: sendCustomerMessage,
    connectRealtime: connectRealtime,
    disconnectRealtime: disconnectRealtime,
    getRealtimeState: getRealtimeState,
    getRegisteredRealtimeEvents: getRegisteredRealtimeEvents,
    MESSAGE_EVENT_KEYS: MESSAGE_EVENT_KEYS,
    MISSION_EVENT_KEYS: MISSION_EVENT_KEYS
  };

  global.Biz1App = global.MineralBarApp;
})(typeof window !== 'undefined' ? window : globalThis);
