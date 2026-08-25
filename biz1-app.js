/**
 * Mineral Bar — Biz1 SDK bootstrap
 * Domain: https://mineral.bull36.com
 * Docs: https://mineral.bull36.com/app/help/#instructions_sdk
 *         https://eli.bull36.com/app/help/#instructions_sdk
 */
(function (global) {
  'use strict';

  var DOMAIN = 'https://mineral.bull36.com';
  var USER_KEY = 'mineralbar_user_basic';
  var ROLE_KEY = 'mineralbar_role';
  var EMAIL_KEY = 'mineralbar_email';
  var REMEMBER_KEY = 'mineralbar_remember';
  var CRED_KEY = 'mineralbar_cred';
  var SESSION_PASS_KEY = 'mineralbar_session_pass';
  var EXPIRES_KEY = 'mineralbar_token_expires_at';

  /** Biz1 folders on mineral (from User.Basic) */
  var FOLDERS = {
    LEADS: 1,       // פניות חדשות / New Leads
    CUSTOMERS: 2,   // לקוחות
    MISSIONS: 3,    // משימות
    ARCHIVE: 4,
    TRASH: 5,
    SPAM: 6
  };

  var ROLE_HOME = {
    sales: 'sales-home.html',
    service: 'service-all-calls.html',
    tech: 'tech-dashboard.html'
  };

  /**
   * Intended screen → route map (what the UI should call).
   * Status from live probes 2026-07-18 on mineral.bull36.com:
   *   ok | empty | broken | unknown
   */
  var SCREEN_API = {
    'התחברות / login': { routes: ['Login', 'User.Basic'], status: 'ok' },
    'רשימת לידים': { routes: ['Customer.List', 'Customer.Count'], folder_id: FOLDERS.LEADS, status: 'live' },
    'לקוחות': { routes: ['Customer.List', 'Customer.Count'], folder_id: FOLDERS.CUSTOMERS, status: 'live' },
    'כרטיס ליד / כרטיס לקוח': { routes: ['Customer.Get'], status: 'live' },
    'הוספת ליד / לקוח': { routes: ['Customer.Add', 'CustomerStatuses.List'], status: 'partial' },
    'משימות': { routes: ['Mission.List', 'Mission.Count', 'Mission.Create', 'Mission.Get', 'Mission.Update', 'Mission.Done'], status: 'live' },
    'צור משימה': { routes: ['Mission.Create', 'Mission.Get'], status: 'live' },
    'קריאות שירות / טכנאי': { routes: ['Ticket.List', 'Ticket.Count', 'Ticket.Get', 'Ticket.Add', 'Ticket.Edit'], status: 'partial' },
    'הודעות (רשימה)': { routes: ['Chat.Conversations', 'Chat.Inbox'], status: 'live' },
    'שיחה בודדת': { routes: ['Chat.CustomerMessages', 'Chat.SendCustomer'], status: 'live' },
    'Realtime socket': {
      routes: ['client.realtime.connect', 'biz1:ready', 'biz1:event'],
      status: 'live',
      events: [
        'chat.message.received', 'whatsapp.message.received', 'whatsapp.inbox.refresh',
        'message.created', 'ticket.created', 'ticket.updated', 'ticket.deleted',
        'mission.created', 'mission.updated', 'mission.done', 'mission.reminder',
        'teamops.task.updated', 'products.created', 'products.updated',
        'customer.updated', 'crm.lead.created', 'customer.reminder.created'
      ]
    },
    'הודעות / צ׳אט Inbox': { routes: ['Chat.Inbox', 'Chat.Conversations', 'Chat.CustomerMessages'], status: 'live' },
    'שעון נוכחות': { routes: ['TeamHours.Get', 'TeamHours.StartStop', 'TeamHours.List', 'TeamHours.WhenStop'], status: 'ready' },
    'מלאי': { routes: ['Products.List', 'Products.Count'], status: 'live' },
    'מסמכים / הצעות / הזמנות': { routes: ['Documents.List', 'Documents.Count', 'Forms.*', 'PaymentForms.*'], status: 'partial' },
    'גבייה': { routes: ['Documents.Add', 'Documents.List'], status: 'live' }
  };

  function getClient() {
    if (!global.Biz1SDK || !global.Biz1SDK.Biz1Client) {
      throw new Error('Biz1 SDK not loaded. Include ' + DOMAIN + '/app/sdk/biz1-sdk.js');
    }
    if (!global.__mineralBiz1Client) {
      global.__mineralBiz1Client = new global.Biz1SDK.Biz1Client({
        domain: DOMAIN,
        storage: global.localStorage
      });
      installAuthInterceptor(global.__mineralBiz1Client);
    }
    return global.__mineralBiz1Client;
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

  /**
   * Wipe browser caches that keep serving stale JS/CSS after deploys.
   * Keeps only app_lang so Hebrew/English preference survives logout.
   */
  function clearAppCaches() {
    var keptLang = '';
    try {
      keptLang = global.localStorage.getItem('app_lang') ||
        (global.sessionStorage && global.sessionStorage.getItem('app_lang')) || '';
    } catch (e0) { /* ignore */ }

    try {
      if (global.sessionStorage) {
        global.sessionStorage.clear();
        if (keptLang) global.sessionStorage.setItem('app_lang', keptLang);
      }
    } catch (e1) { /* ignore */ }

    try {
      var toRemove = [];
      for (var i = 0; i < global.localStorage.length; i++) {
        var k = global.localStorage.key(i);
        if (!k || k === 'app_lang') continue;
        if (/^(mb_|mineralbar_|biz1_)/i.test(k) || /mineral|biz1|mb_/i.test(k)) {
          toRemove.push(k);
        }
      }
      toRemove.forEach(function (key) {
        try { global.localStorage.removeItem(key); } catch (e2) { /* ignore */ }
      });
      if (keptLang) global.localStorage.setItem('app_lang', keptLang);
    } catch (e3) { /* ignore */ }

    var jobs = [];

    try {
      if (typeof caches !== 'undefined' && caches.keys) {
        jobs.push(
          caches.keys().then(function (names) {
            return Promise.all((names || []).map(function (name) {
              return caches.delete(name);
            }));
          }).catch(function () { return null; })
        );
      }
    } catch (e4) { /* ignore */ }

    try {
      if (global.navigator && global.navigator.serviceWorker &&
          typeof global.navigator.serviceWorker.getRegistrations === 'function') {
        jobs.push(
          global.navigator.serviceWorker.getRegistrations().then(function (regs) {
            return Promise.all((regs || []).map(function (reg) {
              return reg.unregister();
            }));
          }).catch(function () { return null; })
        );
      }
    } catch (e5) { /* ignore */ }

    return Promise.all(jobs).then(function () { return true; }).catch(function () { return false; });
  }

  /** Full logout: session + caches, then hard-navigate to login (cache-busted). */
  function logoutAndClearCache(redirectUrl) {
    var target = redirectUrl || ('login.html?nocache=' + Date.now());
    try { clearSession(); } catch (e0) { /* ignore */ }
    return clearAppCaches().then(function () {
      try { global.location.replace(target); } catch (e1) {
        global.location.href = target;
      }
    }).catch(function () {
      try { global.location.replace(target); } catch (e2) {
        global.location.href = target;
      }
    });
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
    var folders = (basic && basic.data && (basic.data.folders || basic.data.folder)) || (basic && (basic.folders || basic.folder)) || [];
    return Array.isArray(folders) ? folders : [];
  }

  function populateFolderDropdowns(root) {
    root = root || document;
    var selects = root.querySelectorAll('#mb-folders, select[name="folder"], select[name="folder_id"], select.folder-select, [data-populate="folders"]');
    if (!selects || !selects.length) return;

    var folders = getFolders();
    if (!folders || !folders.length) {
      folders = [
        { id: 1, name_en: 'New Leads', name_he: 'פניות חדשות' },
        { id: 2, name_en: 'Customers', name_he: 'לקוחות' },
        { id: 3, name_en: 'Archive', name_he: 'ארכיון' }
      ];
    }

    var lang = 'he';
    try {
      if (global.getCurrentLanguage) lang = global.getCurrentLanguage();
      else if (global.localStorage) lang = global.localStorage.getItem('app_lang') || 'he';
    } catch(e) {}
    var isEn = lang === 'en';

    selects.forEach(function (sel) {
      var currentVal = sel.value || sel.getAttribute('data-selected-id') || '2';
      var html = '';
      folders.forEach(function (f) {
        var id = String(f.id || f.folder_id || f.value || '');
        var name = isEn ? (f.name_en || f.name || f.name_he) : (f.name_he || f.name || f.name_en);
        var isSelected = (id === String(currentVal)) ? ' selected' : '';
        html += '<option value="' + id + '"' + isSelected + '>' + (name || ('Folder #' + id)) + '</option>';
      });
      sel.innerHTML = html;
    });
  }

  function getTeamMembers() {
    var basic = getUserBasic();
    var team = (basic && basic.data && basic.data.team_members) || [];
    return Array.isArray(team) ? team : [];
  }

  function homeForRole(role) {
    return ROLE_HOME[role] || ROLE_HOME.sales;
  }

  async function login({ username, password, otp, remember }) {
    var client = getClient();
    var data = await client.login({
      username: username,
      password: password,
      otp: otp || ''
    });

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
        console.warn('[MineralBar] auto refresh failed', err);
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

  /** List customers via Customer.List API. */
  async function listCustomers(extra) {
    var client = getClient();
    var params = {};
    if (typeof extra === 'object' && extra !== null) {
      params = Object.assign({
        length: 50,
        draw: 1,
        start: 0
      }, extra);
    } else {
      params = {
        length: 50,
        draw: 1,
        start: 0
      };
    }

    var raw = await client.request('Customer.List', params);
    var rows = Array.isArray(raw && raw.data) ? raw.data
      : Array.isArray(raw && raw.rows) ? raw.rows
      : Array.isArray(raw && raw.items) ? raw.items
      : [];
    var total = (raw && (raw.recordsFiltered != null ? raw.recordsFiltered
      : raw.recordsTotal != null ? raw.recordsTotal
      : raw.total != null ? raw.total
      : raw.count != null ? raw.count
      : rows.length));
    return Object.assign({}, raw, { rows: rows, data: rows, total: Number(total) || rows.length });
  }

  /** List projects via Project.List / Projects.List API route. */
  async function listProjects(extra) {
    var client = getClient();
    var params = Object.assign({
      length: 50,
      draw: 1,
      start: 0
    }, extra || {});
    try {
      return await client.request('Projects.List', params);
    } catch (err) {
      try {
        return await client.request('Projects.List', params);
      } catch (err2) {
        if (client.projects && typeof client.projects.list === 'function') {
          return await client.projects.list(params);
        }
        return { rows: [], data: [] };
      }
    }
  }

  /** Files.Upload requires customer_id and returns both CDN path and URL. */
  async function uploadCustomerFile(customerId, file, extra) {
    var id = requireId(customerId, 'customer_id');
    if (!file) throw new Error('file is required');
    var body = new FormData();
    body.append('customer_id', String(id));
    body.append('file', file, file.name || 'upload.bin');
    if (extra && typeof extra === 'object') {
      Object.keys(extra).forEach(function(key) {
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
      { key: 'done_tasks', id: 'done', label: 'בוצעו', color: '#2e8a63', badgeBg: '#e6f4ec', badgeColor: '#2e8a63' },
      { key: 'private_tasks', id: 'private', label: 'פרטי', color: '#6a4fa0', badgeBg: '#f3eefb', badgeColor: '#6a4fa0' }
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

  async function countMissions(extra) {
    var client = getClient();
    var raw = await client.request('Mission.Count', extra || {});
    return { count: Number(raw.count || raw.total || 0), raw: raw };
  }

  /**
   * Mission.Create — only documented fields.
   * Rejects unknown keys like description/private/priority/members/assigned_to/recording_link.
   */
  function optionalIntegerId(value) {
    if (value == null || value === '') return undefined;
    var numericValue = Number(value);
    return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : undefined;
  }

  function normalizeMissionColor(value) {
    var raw = String(value == null ? '' : value).trim().toLowerCase();
    if (!raw || raw === 'default') return 'yellow';
    if (raw === 'transparent' || raw === 'yellow' || raw === 'red' || raw === 'green' || raw === 'blue') {
      return raw;
    }
    if (raw === '#ef4444' || raw === '#c0392b' || raw.indexOf('red') !== -1) return 'red';
    if (raw === '#22c55e' || raw === '#2e8a63' || raw.indexOf('green') !== -1) return 'green';
    if (raw === '#2563eb' || raw === '#1d60a2' || raw.indexOf('blue') !== -1) return 'blue';
    if (raw === '#f59e0b' || raw === '#bd8324' || raw.indexOf('yellow') !== -1) return 'yellow';
    return 'yellow';
  }

  function normalizeMissionAssignees(value) {
    if (value == null || value === '') return undefined;
    if (Array.isArray(value)) {
      var list = value.map(function (item) { return String(item).trim(); }).filter(Boolean);
      return list.length ? list.join(',') : undefined;
    }
    var text = String(value).trim();
    if (!text) return undefined;
    if (text.charAt(0) === '[') {
      try {
        var parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          return parsed.map(function (item) { return String(item).trim(); }).filter(Boolean).join(',') || undefined;
        }
      } catch (e) { /* keep as-is */ }
    }
    return text.replace(/^\[|\]$/g, '').replace(/\s+/g, '');
  }

  async function createMission(params) {
    var client = getClient();
    var p = params || {};
    var title = String(p.mission || p.title || p.message || '').trim();
    if (!title) {
      var missing = new Error('Missing required parameter: mission');
      missing.route = 'Mission.Create';
      throw missing;
    }

    var payload = {
      mission: title,
      note: String(p.note || p.description || '').trim()
    };

    var due = p.date_to_do || p.due_date;
    if (due != null && due !== '') {
      payload.date_to_do = toMysqlDateTimeString(due) || String(due).trim();
    }

    if (p.days_after_ads != null && p.days_after_ads !== '') {
      payload.days_after_ads = Number(p.days_after_ads);
    }

    var customerId = optionalIntegerId(
      p.customer_id || p.cust_id || p.client_id || p.clientid || p.client_id1 || p.lead_id
    );
    if (customerId !== undefined) payload.customer_id = customerId;

    var assignees = normalizeMissionAssignees(
      p.organizations_user || p.member_id || p.members || p.assigned_to
    );
    if (assignees) payload.organizations_user = assignees;

    var createProjectId = optionalIntegerId(p.project_id);
    if (createProjectId !== undefined) payload.project_id = createProjectId;

    var createStepId = optionalIntegerId(p.missions_steps_id || p.mission_step_id || p.step_id);
    if (createStepId !== undefined) payload.missions_steps_id = String(createStepId);

    var ticketId = optionalIntegerId(p.ticket_id);
    if (ticketId !== undefined) payload.ticket_id = ticketId;

    if (p.project_column) payload.project_column = String(p.project_column);

    var timeMission = p.time_mission || p.time;
    if (timeMission) payload.time_mission = String(timeMission);
    if (p.time_mission_days) payload.time_mission_days = p.time_mission_days;
    if (p.time_mission_hours) payload.time_mission_hours = p.time_mission_hours;
    if (p.start_time) payload.start_time = p.start_time;
    if (p.end_time) payload.end_time = p.end_time;

    var color = normalizeMissionColor(p.appoinment_color1 || p.color || p.priority);
    payload.color = color;
    payload.appoinment_color1 = color;

    if (p.tag_id != null || p.tag != null) {
      payload.tag_id = p.tag_id != null ? p.tag_id : p.tag;
    }
    if (p.repeat_days) payload.repeat_days = p.repeat_days;
    if (p.sub_missions != null) payload.sub_missions = p.sub_missions;
    if (p.mission_reminder != null) payload.mission_reminder = p.mission_reminder;

    payload.notify_client = p.notify_client ? 1 : 0;
    payload.email_me_employee = p.email_me_employee ? 1 : 0;
    payload.whatsApp_reminder = (p.whatsApp_reminder || p.whatsapp_reminder) ? 1 : 0;
    payload.use_as_template = p.use_as_template ? 1 : 0;
    payload.private_mission = (p.private_mission || p.private) ? 1 : 0;

    if (p.image != null && p.image !== '') payload.image = p.image;
    if (p.mission_image != null && p.mission_image !== '') payload.mission_image = p.mission_image;

    var roomId = optionalIntegerId(p.room_id);
    if (roomId !== undefined) payload.room_id = roomId;
    var flowId = optionalIntegerId(p.flow_id);
    if (flowId !== undefined) payload.flow_id = flowId;
    var workflowStepId = optionalIntegerId(p.step_id);
    if (workflowStepId !== undefined && createStepId === undefined) payload.step_id = workflowStepId;

    var raw = await client.request('Mission.Create', payload);
    var createdData = raw && raw.data && typeof raw.data === 'object' ? raw.data : {};
    var createdOutput = raw && raw.output && typeof raw.output === 'object' ? raw.output : {};
    var createdId = raw && (
      raw.insert_id || raw.mission_id || raw.id || raw.new_id ||
      createdData.insert_id || createdData.mission_id || createdData.id ||
      createdOutput.insert_id || createdOutput.mission_id || createdOutput.id
    );
    if (!raw || !(Number(raw.success) === 1 || raw.success === true || createdId)) {
      var err = new Error((raw && raw.message) || 'Task creation failed');
      err.route = 'Mission.Create';
      err.status = raw && raw.status;
      err.raw = raw;
      throw err;
    }
    try { sessionStorage.setItem('mb_missions_dirty', String(Date.now())); } catch (e0) {}
    try { notifyLiveReload({ key: 'mission.created', group: 'missions' }); } catch (e1) {}
    return {
      id: createdId || null,
      message: raw.message || 'Task added',
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
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  }

  function isRateLimitError(err) {
    return !!(err && (
      Number(err.status) === 429 ||
      Number(err.raw && err.raw.status) === 429 ||
      /too many requests|rate.?limit/i.test(String(err.message || ''))
    ));
  }

  async function runMissionUpdateRequest(id, filed, saveoutput) {
    var elapsed = Date.now() - lastMissionUpdateAt;
    if (elapsed < MISSION_UPDATE_GAP_MS) {
      await waitMs(MISSION_UPDATE_GAP_MS - elapsed);
    }
    var attempts = 0;
    while (true) {
      try {
        lastMissionUpdateAt = Date.now();
        return await getClient().request('Mission.Update', {
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

  /** Mission.Update requires id + filed + saveoutput (the typo is API contract). */
  async function updateMission(params) {
    var p = params || {};
    var id = requireId(p.id || p.mission_id, 'mission_id/id');
    var filed = p.filed || p.field || 'note';
    var saveoutput = p.saveoutput != null ? p.saveoutput : (p.value || '');
    var task = missionUpdateQueue.then(function() {
      return runMissionUpdateRequest(id, filed, saveoutput);
    });
    missionUpdateQueue = task.catch(function() { /* keep queue usable */ });
    var raw = await task;
    if (!(raw && (Number(raw.success) === 1 || raw.success === true))) {
      var err = new Error((raw && raw.message) || 'Mission.Update failed');
      err.route = 'Mission.Update';
      err.raw = raw;
      throw err;
    }
    return { ok: true, message: raw.message, raw: raw };
  }

  var MISSION_UPDATE_FIELD_MAP = {
    title: 'mission',
    private: 'private_mission',
    customer_id: 'lead_id',
    mission_color: 'color',
    assigned_to: 'member_id',
    description: 'note',
    use_as_template: 'client_create'
  };

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
    use_as_template: true,
    client_create: true
  };

  var FILES_CDN = 'https://files.biz1.co.il/';

  function resolveFileUrl(pathOrUrl) {
    var value = String(pathOrUrl || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value) || /^data:/i.test(value)) return value;
    return FILES_CDN + value.replace(/^\/+/, '');
  }

  function parseMissionImageList(imageField) {
    var raw = String(imageField || '').trim();
    if (!raw) return [];
    if (/^data:image\//i.test(raw)) return [raw];
    return raw.split(',').map(function(path) { return path.trim(); }).filter(Boolean);
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
    var previous = String(previousMeta == null ? '' : previousMeta).trim();
    if (!url) {
      try {
        var emptyObj = JSON.parse(previous);
        if (emptyObj && typeof emptyObj === 'object' && !Array.isArray(emptyObj)) {
          delete emptyObj.recording_link;
          delete emptyObj.recording;
          delete emptyObj.link;
          return Object.keys(emptyObj).length ? JSON.stringify(emptyObj) : '';
        }
      } catch (e0) { /* ignore */ }
      return /^https?:\/\//i.test(previous) ? '' : previous;
    }
    try {
      var obj = JSON.parse(previous);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        obj.recording_link = url;
        return JSON.stringify(obj);
      }
    } catch (e1) { /* ignore */ }
    return url;
  }

  async function saveMissionImages(missionId, customerId, files, existingPaths, previousImageField) {
    var id = requireId(missionId, 'mission_id/id');
    var kept = (existingPaths || []).map(function(path) {
      return String(path || '').trim();
    }).filter(Boolean);
    var list = Array.prototype.slice.call(files || []);
    var uploaded = [];
    if (list.length && !customerId) {
      var customerError = new Error('Select a customer before uploading images.');
      customerError.code = 'CUSTOMER_REQUIRED_FOR_UPLOAD';
      throw customerError;
    }
    for (var i = 0; i < list.length; i += 1) {
      var result = await uploadCustomerFile(customerId, list[i]);
      uploaded.push(result.path || result.url);
    }
    var seen = Object.create(null);
    var merged = kept.concat(uploaded).filter(function(path) {
      if (seen[path]) return false;
      seen[path] = true;
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

  function padDatePart(valueToPad) {
    return valueToPad < 10 ? '0' + valueToPad : String(valueToPad);
  }

  function parseMissionDateTime(value) {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    var raw = String(value == null ? '' : value).trim();
    if (!raw || raw === '—' || raw === '-') return null;

    // UI payload historically used DD-MM-YYYY HH:mm. Native Date.parse treats
    // dash dates as invalid (or as MM-DD-YYYY), which produced '' for MySQL.
    var dmy = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (dmy) {
      var day = Number(dmy[1]);
      var month = Number(dmy[2]);
      var year = Number(dmy[3]);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        var parsedDmy = new Date(
          year, month - 1, day,
          Number(dmy[4] || 0), Number(dmy[5] || 0), Number(dmy[6] || 0), 0
        );
        if (!Number.isNaN(parsedDmy.getTime())) return parsedDmy;
      }
    }

    var iso = raw.indexOf('T') !== -1 || /Z$/i.test(raw) ? raw : raw.replace(' ', 'T');
    var parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return parsed;

    var ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (ymd) {
      var parsedYmd = new Date(
        Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]),
        Number(ymd[4] || 0), Number(ymd[5] || 0), Number(ymd[6] || 0), 0
      );
      if (!Number.isNaN(parsedYmd.getTime())) return parsedYmd;
    }
    return null;
  }

  function toMysqlDateTimeString(value) {
    var date = parseMissionDateTime(value);
    if (!date) return '';
    return date.getFullYear() + '-' + padDatePart(date.getMonth() + 1) + '-' + padDatePart(date.getDate()) +
      ' ' + padDatePart(date.getHours()) + ':' + padDatePart(date.getMinutes()) + ':' +
      padDatePart(date.getSeconds());
  }

  function toUtcDateTimeString(value) {
    return toMysqlDateTimeString(value);
  }

  function comparableMissionValue(field, value) {
    if (value == null) return '';
    if (field === 'private_mission' || field === 'notify_client' ||
        field === 'email_me_employee' || field === 'whatsApp_reminder' ||
        field === 'use_as_template' || field === 'client_create') {
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
      return toUtcDateTimeString(value).slice(0, 16);
    }
    return String(value).trim();
  }

  async function updateMissionFields(missionId, fields, currentFields) {
    var id = requireId(missionId, 'mission_id/id');
    var normalized = Object.create(null);
    Object.keys(fields || {}).forEach(function(key) {
      var filed = MISSION_UPDATE_FIELD_MAP[key] || key;
      if (!MISSION_UPDATE_ALLOWED[filed]) return;
      var value = fields[key];
      if (value === undefined || value === null) return;
      normalized[filed] = value;
    });
    var keys = Object.keys(normalized);
    var current = currentFields || {};
    var results = [];
    for (var i = 0; i < keys.length; i += 1) {
      var filed = keys[i];
      var value = normalized[filed];
      if (filed === 'date_to_do') {
        value = toUtcDateTimeString(value);
        if (!value) continue;
      }
      if (typeof value === 'object') value = JSON.stringify(value);
      if (filed === 'private_mission') value = (value === true || value === 1 || value === '1') ? 1 : 0;
      if (Object.prototype.hasOwnProperty.call(current, filed) &&
          comparableMissionValue(filed, current[filed]) === comparableMissionValue(filed, value)) {
        continue;
      }
      results.push(await updateMission({ id: id, mission_id: id, filed: filed, saveoutput: value }));
    }
    return { ok: true, id: id, results: results };
  }

  function missionDoneFailed(raw) {
    if (!raw) return true;
    if (raw.success === 0 || raw.success === '0' || raw.ok === false) return true;
    return false;
  }

  function isMissionRecordDone(mission) {
    if (!mission) return false;
    if (mission.is_done === true || Number(mission.done) === 1 || Number(mission.is_complete) === 1) return true;
    var col = String(mission.project_column || mission.status || '').toLowerCase();
    return col === 'done' || col === 'completed' || col === 'complete' ||
      col === 'col_done' || col === 'col_completed' || col === 'closed';
  }

  async function waitUntilMissionDone(id) {
    var tries = 0;
    while (tries < 8) {
      tries += 1;
      try {
        var res = await getMission(id);
        if (isMissionRecordDone(res && res.mission)) return res.mission;
      } catch (e) { /* retry */ }
      await waitMs(tries === 1 ? 200 : 350);
    }
    return null;
  }

  /** Mission.Done — only succeeds after Mission.Get confirms is_done / column=done. */
  async function doneMission(missionId) {
    var id = requireId(missionId, 'id');
    var client = getClient();
    var raw = null;
    try {
      raw = await client.request('Mission.Done', { id: id, mission_id: id });
    } catch (err) {
      raw = (err && err.raw) || null;
      if (missionDoneFailed(raw)) {
        var fail0 = new Error((err && err.message) || (raw && raw.message) || 'Mission.Done failed');
        fail0.route = 'Mission.Done';
        fail0.raw = raw;
        throw fail0;
      }
    }
    if (missionDoneFailed(raw)) {
      try {
        raw = await updateMission({
          id: id,
          mission_id: id,
          filed: 'project_column',
          saveoutput: 'done'
        });
      } catch (err2) {
        var fail = new Error((raw && raw.message) || (err2 && err2.message) || 'Mission.Done failed');
        fail.route = 'Mission.Done';
        fail.raw = raw || (err2 && err2.raw);
        throw fail;
      }
    }
    var mission = await waitUntilMissionDone(id);
    if (!mission) {
      var pending = new Error('Task is not Done yet');
      pending.route = 'Mission.Done';
      pending.raw = raw;
      throw pending;
    }
    return { ok: true, mission: mission, message: raw && raw.message, raw: raw };
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

  /** Customer.Add — create new customer record with full field mapping support. */
  /** Customer.Add — create new customer record with strict field sanitization. */
  async function createCustomer(params) {
    var client = getClient();
    var p = params || {};
    var payload = {};

    // Official allowed keys for Customer.Add backend endpoint
    var allowed = [
      'name', 'email', 'second_email', 'phone', 'mobile', 'second_phone',
      'company', 'company_id', 'csv_id', 'source', 'affiliate', 'website',
      'password', 'note', 'notes', 'address', 'city', 'city_name', 'city_id',
      'folder_id', 'folder', 'status_id', 'status', 'sub_list_data',
      'sub_list_data_name', 'internal_sub_status_list', 'tag', 'extra_fields',
      'parent_customer_id', 'parent_cust_IIId', 'room_customer_name',
      'customer_add_from_email', 'extension', 'data_value_for_socket',
      'checkUnique', 'upsert', 'glob_check_already_or_not', 'force', 'followup'
    ];

    // Name (official: name)
    var nameVal = p.name || p.client_name;
    if (nameVal !== undefined && nameVal !== '') payload.name = nameVal;

    // Emails (official: email, second_email)
    if (p.email !== undefined && p.email !== '') payload.email = p.email;
    var secondEmailVal = p.second_email || p.email2 || p.email_2;
    if (secondEmailVal !== undefined && secondEmailVal !== '') payload.second_email = secondEmailVal;

    // Phones (official: phone, mobile, second_phone)
    if (p.phone !== undefined && p.phone !== '') payload.phone = p.phone;
    if (p.mobile !== undefined && p.mobile !== '') payload.mobile = p.mobile;
    var secondPhoneVal = p.second_phone || p.phone2 || p.phone_2;
    if (secondPhoneVal !== undefined && secondPhoneVal !== '') payload.second_phone = secondPhoneVal;

    // Company & CSV
    if (p.company !== undefined && p.company !== '') payload.company = p.company;
    if (p.company_id !== undefined && p.company_id !== '') payload.company_id = p.company_id;
    if (p.csv_id !== undefined && p.csv_id !== '') payload.csv_id = p.csv_id;

    // Source & details
    if (p.source !== undefined && p.source !== '') payload.source = p.source;
    if (p.affiliate !== undefined && p.affiliate !== '') payload.affiliate = p.affiliate;
    if (p.website !== undefined && p.website !== '') payload.website = p.website;
    if (p.password !== undefined && p.password !== '') payload.password = p.password;

    // Notes
    var noteVal = p.note || p.notes;
    if (noteVal !== undefined && noteVal !== '') payload.note = noteVal;

    // Location
    if (p.address !== undefined && p.address !== '') payload.address = p.address;
    if (p.city !== undefined && p.city !== '') payload.city = p.city;
    if (p.city_name !== undefined && p.city_name !== '') payload.city_name = p.city_name;
    if (p.city_id !== undefined && p.city_id !== '') payload.city_id = p.city_id;
    // Area / region aliases → city fields when city not set
    var areaVal = p.area || p.region || p.zone;
    if (areaVal !== undefined && areaVal !== '') {
      if (!payload.city) payload.city = areaVal;
      if (!payload.city_name) payload.city_name = areaVal;
    }

    // Folder & Status — always coerce numeric folder ids
    var folderVal = p.folder_id != null && p.folder_id !== '' ? p.folder_id : p.folder;
    if (folderVal !== undefined && folderVal !== '') {
      var folderNum = Number(folderVal);
      payload.folder_id = isFinite(folderNum) ? folderNum : folderVal;
    }

    var statusVal = p.status_id || p.status;
    if (statusVal !== undefined && statusVal !== '') payload.status_id = statusVal;

    if (p.sub_list_data !== undefined && p.sub_list_data !== '') payload.sub_list_data = p.sub_list_data;
    if (p.sub_list_data_name !== undefined && p.sub_list_data_name !== '') payload.sub_list_data_name = p.sub_list_data_name;
    if (p.internal_sub_status_list !== undefined && p.internal_sub_status_list !== '') payload.internal_sub_status_list = p.internal_sub_status_list;
    if (p.tag !== undefined && p.tag !== '') payload.tag = p.tag;

    // Custom fields & Parent Customer
    if (p.extra_fields !== undefined && p.extra_fields !== null && p.extra_fields !== '') {
      if (typeof p.extra_fields === 'object' && !(p.extra_fields instanceof Date)) {
        payload.extra_fields = JSON.stringify(p.extra_fields);
      } else {
        payload.extra_fields = p.extra_fields;
      }
    }
    var parentCustVal = p.parent_customer_id || p.parent_cust_IIId;
    if (parentCustVal !== undefined && parentCustVal !== '') payload.parent_customer_id = parentCustVal;

    // Telephony & email markers
    if (p.room_customer_name !== undefined) payload.room_customer_name = p.room_customer_name;
    if (p.customer_add_from_email !== undefined) payload.customer_add_from_email = p.customer_add_from_email;
    if (p.extension !== undefined && p.extension !== '') payload.extension = p.extension;
    if (p.data_value_for_socket !== undefined && p.data_value_for_socket !== '') payload.data_value_for_socket = p.data_value_for_socket;

    // Flags
    if (p.checkUnique !== undefined && p.checkUnique !== '') payload.checkUnique = p.checkUnique;
    if (p.upsert !== undefined) payload.upsert = p.upsert;
    if (p.glob_check_already_or_not !== undefined) payload.glob_check_already_or_not = p.glob_check_already_or_not;
    if (p.force !== undefined) payload.force = p.force;

    // Followup is stored as wall-clock Y-m-d H:i:s (same date/time the user picked).
    if (p.followup !== undefined && p.followup !== '') {
      if (p.followup instanceof Date) {
        var d = p.followup;
        payload.followup = d.getFullYear() + '-' +
          String(d.getMonth() + 1).padStart(2, '0') + '-' +
          String(d.getDate()).padStart(2, '0') + ' ' +
          String(d.getHours()).padStart(2, '0') + ':' +
          String(d.getMinutes()).padStart(2, '0') + ':' +
          String(d.getSeconds()).padStart(2, '0');
      } else {
        payload.followup = p.followup;
      }
    }

    // Include custom field aliases (extra_fields[...], cf-...) or explicit whitelist matches
    Object.keys(p).forEach(function (k) {
      if (payload[k] === undefined && (allowed.indexOf(k) !== -1 || k.indexOf('cf-') === 0 || k.indexOf('extra_fields[') === 0)) {
        if (p[k] !== undefined && p[k] !== '') {
          payload[k] = p[k];
        }
      }
    });

    var raw = await client.request('Customer.Add', payload);
    if (!raw || !(Number(raw.success) === 1 || raw.success === true || raw.insert_id || raw.customer_id)) {
      var err = new Error((raw && raw.message) || 'Customer creation failed');
      err.route = 'Customer.Add';
      err.raw = raw;
      throw err;
    }
    var newId = raw.insert_id || raw.customer_id || (raw.output && raw.output.id);
    var managerId = p.customer_manager || p.team_member_id || p.assign_member_id;
    if (newId && managerId) {
      try {
        await assignCustomerTeamMember(newId, managerId);
      } catch (assignErr) {
        console.warn('[MineralBarApp] assignCustomerTeamMember after create failed', assignErr);
      }
    }
    return {
      ok: true,
      id: newId,
      raw: raw
    };
  }

  /** Assign a customer to a team member (service representative). */
  async function assignCustomerTeamMember(customerId, teamMemberId) {
    var cid = requireId(customerId, 'customer_id');
    var mid = String(teamMemberId || '').trim();
    if (!mid) return { ok: false, skipped: true };

    var client = getClient();
    var midNum = Number(mid);
    var idVal = (Number.isFinite(midNum) && midNum > 0) ? midNum : mid;
    var routes = ['Customer.Edit', 'Customer.Update'];
    var payloads = [
      { user_id: idVal },
      { team_member_id: idVal },
      { assign_member_id: idVal },
      { customer_manager: idVal },
      { assigned_user_id: idVal },
      { shared_with: String(mid) },
      { user_id: String(mid) }
    ];

    for (var r = 0; r < routes.length; r++) {
      for (var i = 0; i < payloads.length; i++) {
        try {
          var body = Object.assign({ customer_id: cid, cust_id: cid, id: cid }, payloads[i]);
          var raw = await client.request(routes[r], body);
          if (raw && (Number(raw.success) === 1 || raw.success === true || raw.output || raw.data)) {
            return { ok: true, route: routes[r], raw: raw };
          }
        } catch (e) {
          /* try next payload/route */
        }
      }
    }

    return { ok: false, message: 'Team member assignment is not supported by the API yet.' };
  }

  var ticketCustomFieldsCache = null;
  var ticketCustomFieldsPromise = null;

  function flattenTicketCustomFieldRows(rows, acc) {
    acc = acc || [];
    (Array.isArray(rows) ? rows : []).forEach(function (row) {
      if (!row || typeof row !== 'object') return;
      var type = String(row.type || '').toLowerCase();
      if (type === 'group' || Array.isArray(row.group_data)) {
        flattenTicketCustomFieldRows(row.group_data, acc);
        if (type === 'group') return;
      }
      acc.push(row);
    });
    return acc;
  }

  function ticketFieldStorageName(field) {
    var name = String((field && (field.name || field.field_name || field.update_field_name)) || '').trim();
    return /^a-\d+$/.test(name) ? name : '';
  }

  function ticketFieldBlob(field) {
    if (!field) return '';
    return [
      field.en, field.he, field.label, field.label_en, field.label_he,
      field.name, field.type, field.field_name
    ].map(function (x) { return String(x == null ? '' : x).toLowerCase(); }).join(' ');
  }

  function ticketFieldLabel(field) {
    return String((field && (field.en || field.label_en || field.label || field.he || '')) || '')
      .toLowerCase()
      .trim();
  }

  /* Debt checkbox (לגבייה / paid) is not the cash Yes/No radio. */
  function isDebtCollectionField(field) {
    if (!field) return false;
    var en = ticketFieldLabel(field);
    var he = String((field && field.he) || '').trim();
    var type = String((field && field.type) || '').toLowerCase();
    var boxEn = Array.isArray(field.checkbox_en) ? field.checkbox_en.join(' ').toLowerCase() : '';
    if (en === 'debt' || he === 'לגבייה') return true;
    if (type === 'checkbox' && /to_be_paid|\bpaid\b/.test(boxEn)) return true;
    return false;
  }

  function cashFieldScore(field) {
    if (!field || isDebtCollectionField(field)) return -1;
    var en = ticketFieldLabel(field);
    var he = String(field.he || '').trim();
    var type = String(field.type || '').toLowerCase();
    var blob = ticketFieldBlob(field);
    var score = 0;
    if (en === 'cash' || en === 'take_cash' || en === 'take cash' || en === 'collect_cash') score += 100;
    if (he === 'cash' || he === 'מזומן') score += 80;
    if (type === 'radio' && field.yes_val != null && field.no_val != null && String(field.yes_val) !== '') score += 40;
    if (type === 'yes_no' || /^yes.?no$/.test(type)) score += 30;
    if (/(^|[^a-z])cash([^a-z]|$)|take.?cash|collect.?cash/.test(blob)) score += 20;
    if (/מזומן/.test(blob)) score += 20;
    return score;
  }

  function isCashTicketField(field) {
    return cashFieldScore(field) > 0;
  }

  function pickBestCashTicketField(fields) {
    var best = null;
    var bestScore = 0;
    (Array.isArray(fields) ? fields : []).forEach(function (field) {
      if (!ticketFieldStorageName(field)) return;
      var score = cashFieldScore(field);
      if (score > bestScore) {
        bestScore = score;
        best = field;
      }
    });
    return best;
  }

  async function listTicketCustomFields(force) {
    if (!force && ticketCustomFieldsCache) return ticketCustomFieldsCache;
    if (!force && ticketCustomFieldsPromise) return ticketCustomFieldsPromise;
    ticketCustomFieldsPromise = (async function () {
      var client = getClient();
      var all = [];
      var start = 0;
      for (var page = 0; page < 20; page++) {
        var raw = await client.request('TicketCustomFields.List', {
          start: start,
          limit: 25,
          length: 25
        });
        var rows = (raw && (raw.data || raw.rows || raw.output)) || [];
        if (!Array.isArray(rows)) rows = [];
        flattenTicketCustomFieldRows(rows, all);
        var total = Number((raw && (raw.count || raw.total_record || raw.total)) || 0);
        if (rows.length < 25 || (total && all.length >= total)) break;
        start += 25;
      }
      ticketCustomFieldsCache = all;
      return all;
    })();
    try {
      return await ticketCustomFieldsPromise;
    } finally {
      ticketCustomFieldsPromise = null;
    }
  }

  async function getTicketCustomField(name) {
    name = String(name || '').trim();
    if (!name) return null;
    var raw = await getClient().request('TicketCustomFields.Get', {
      name: name,
      field_name: name,
      update_field_name: name
    });
    return (raw && (raw.data || raw.output)) || null;
  }

  function splitTicketOptionList(val) {
    if (val == null || val === '') return [];
    if (Array.isArray(val)) {
      return val.map(function (x) {
        if (x == null) return '';
        if (typeof x === 'object') {
          return String(x.option_value || x.value || x.en || x.he || x.label || x.id || '').trim();
        }
        return String(x).trim();
      });
    }
    var s = String(val).trim();
    if (!s) return [];
    if (s.charAt(0) === '[' || s.charAt(0) === '{') {
      try {
        return splitTicketOptionList(JSON.parse(s));
      } catch (e) { /* fall through */ }
    }
    return s.split(',').map(function (x) { return String(x || '').trim(); });
  }

  function collectTicketFieldOptions(field) {
    var out = [];
    if (!field) return out;
    if (field.yes_val != null && String(field.yes_val) !== '') {
      out.push({
        value: String(field.yes_val),
        label: String(field.yes_name_en || field.yes_name_he || 'yes'),
        labelEn: String(field.yes_name_en || field.yes_name_he || 'yes'),
        labelHe: String(field.yes_name_he || field.yes_name_en || 'yes')
      });
    }
    if (field.no_val != null && String(field.no_val) !== '') {
      out.push({
        value: String(field.no_val),
        label: String(field.no_name_en || field.no_name_he || 'no'),
        labelEn: String(field.no_name_en || field.no_name_he || 'no'),
        labelHe: String(field.no_name_he || field.no_name_en || 'no')
      });
    }
    var boxVal = field.checkbox_value;
    var boxEn = field.checkbox_en || field.checkbox_he;
    var boxHe = field.checkbox_he || field.checkbox_en;
    if (Array.isArray(boxVal)) {
      boxVal.forEach(function (v, i) {
        var enLab = String((Array.isArray(boxEn) && boxEn[i] != null) ? boxEn[i] : v);
        var heLab = String((Array.isArray(boxHe) && boxHe[i] != null) ? boxHe[i] : enLab);
        out.push({
          value: String(v),
          label: enLab,
          labelEn: enLab,
          labelHe: heLab
        });
      });
    }
    var vals = splitTicketOptionList(field.option_value || field.option_values);
    var en = splitTicketOptionList(field.options_en || field.option_en);
    var he = splitTicketOptionList(field.options_he || field.option_he);
    var n = Math.max(vals.length, en.length, he.length);
    if (n > 0 && (vals.length || en.length || he.length)) {
      var i;
      var value;
      var labelEn;
      var labelHe;
      for (i = 0; i < n; i++) {
        value = (vals[i] != null && String(vals[i]) !== '') ? String(vals[i]) : String(en[i] || he[i] || '');
        if (!value) continue;
        labelEn = (en[i] != null && String(en[i]) !== '') ? String(en[i]) : value;
        labelHe = (he[i] != null && String(he[i]) !== '') ? String(he[i]) : labelEn;
        out.push({
          value: value,
          label: labelHe,
          labelEn: labelEn,
          labelHe: labelHe
        });
      }
      return out;
    }
    var opts = field.options || field.option || field.values;
    if (typeof opts === 'string') {
      try { opts = JSON.parse(opts); } catch (e) { opts = String(opts).split(/[,|]/); }
    }
    if (Array.isArray(opts)) {
      opts.forEach(function (o) {
        var val = o && typeof o === 'object' ? (o.option_value || o.value || o.id || o.name) : o;
        var labEn = o && typeof o === 'object' ? (o.en || o.label_en || o.label || o.he || val) : o;
        var labHe = o && typeof o === 'object' ? (o.he || o.label_he || o.label || o.en || val) : o;
        if (val == null || String(val) === '') return;
        out.push({
          value: String(val),
          label: String(labHe == null ? val : labHe),
          labelEn: String(labEn == null ? val : labEn),
          labelHe: String(labHe == null ? val : labHe)
        });
      });
    }
    return out;
  }

  function parseMaybeJson(val) {
    if (val == null || val === '') return val;
    if (typeof val !== 'string') return val;
    var s = val.trim();
    if (!s) return val;
    if (s.charAt(0) !== '{' && s.charAt(0) !== '[') return val;
    try { return JSON.parse(s); } catch (e) { return val; }
  }

  function extraFieldRowsFromValue(raw, acc) {
    acc = acc || [];
    raw = parseMaybeJson(raw);
    if (!raw) return acc;
    if (Array.isArray(raw)) {
      raw.forEach(function (row) {
        extraFieldRowsFromValue(row, acc);
      });
      return acc;
    }
    if (typeof raw !== 'object') return acc;
    var looksLikeField = !!(
      raw.name || raw.field_name || raw.update_field_name ||
      raw.options_en || raw.options_he || raw.option_en || raw.option_he ||
      raw.option_value || raw.en || raw.he
    );
    if (looksLikeField && (raw.name || raw.en || raw.he || raw.options_en || raw.options_he)) {
      acc.push(raw);
      return acc;
    }
    Object.keys(raw).forEach(function (key) {
      var val = raw[key];
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        var row = val;
        if (!row.name && !row.field_name) {
          row = Object.assign({ name: key }, val);
        }
        extraFieldRowsFromValue(row, acc);
      }
    });
    return acc;
  }

  function getCustomerExtraFieldsFromUserBasic(basic) {
    var data = (basic && basic.data) || basic || {};
    var settings = data.field_settings || data.field_setting || {};
    var customer = settings.customer || {};
    var extra = customer.extra_fields;
    extra = parseMaybeJson(extra);
    if (Array.isArray(extra)) return extra;
    if (extra && typeof extra === 'object') return extraFieldRowsFromValue(extra, []);
    return [];
  }

  function extractExtraFieldsFromUserBasic(basic) {
    var fromCustomer = getCustomerExtraFieldsFromUserBasic(basic);
    if (fromCustomer.length) return fromCustomer;
    var acc = [];
    extraFieldRowsFromValue(basic && basic.data && basic.data.extra_fields, acc);
    extraFieldRowsFromValue(basic && basic.extra_fields, acc);
    return acc;
  }

  function isInsuranceExtraField(field) {
    if (!field || typeof field !== 'object') return false;
    var en = String(field.en || field.label_en || field.title_en || '').trim().toLowerCase();
    var he = String(field.he || field.label_he || field.title_he || '').trim();
    var name = String(
      field.name || field.field_name || field.update_field_name ||
      field.key || field.id || ''
    ).toLowerCase().trim();
    if (en === 'insurance' || he === 'ביטוח' || name === 'insurance') return true;
    if (/agent|סוכן/.test(en + ' ' + he + ' ' + name)) return false;
    return /(^|[^a-z])insurance([^a-z]|$)|ביטוח/.test(en + ' ' + he + ' ' + name);
  }

  function findInsuranceExtraField(basic) {
    var rows = getCustomerExtraFieldsFromUserBasic(basic);
    if (!rows.length) rows = extractExtraFieldsFromUserBasic(basic);
    var i;
    for (i = 0; i < rows.length; i++) {
      if (isInsuranceExtraField(rows[i])) return rows[i];
    }
    return null;
  }

  function insuranceFieldStorageName(field) {
    var name = String((field && (
      field.name || field.field_name || field.update_field_name || field.key
    )) || '').trim();
    return name || 'insurance';
  }

  function parseInsuranceOptionsFromField(field) {
    if (!field) return [];
    var en = splitTicketOptionList(field.options_en || field.option_en);
    var he = splitTicketOptionList(field.options_he || field.option_he);
    var n = Math.max(en.length, he.length);
    var out = [];
    var i;
    var labelEn;
    var labelHe;
    var value;
    for (i = 0; i < n; i++) {
      labelEn = (en[i] != null && String(en[i]).trim() !== '') ? String(en[i]).trim() : '';
      labelHe = (he[i] != null && String(he[i]).trim() !== '') ? String(he[i]).trim() : '';
      value = labelHe || labelEn;
      if (!value) continue;
      out.push({
        value: value,
        label: labelHe || labelEn,
        labelEn: labelEn || labelHe,
        labelHe: labelHe || labelEn
      });
    }
    return out;
  }

  async function fetchUserBasic(force) {
    if (!force) {
      var cached = getUserBasic();
      if (cached && findInsuranceExtraField(cached)) return cached;
    }
    var client = getClient();
    var raw;
    if (client.account && typeof client.account.basic === 'function') {
      raw = await client.account.basic();
    } else {
      raw = await client.request('User.Basic', {});
    }
    if (raw) {
      try { global.localStorage.setItem(USER_KEY, JSON.stringify(raw)); } catch (e) { /* ignore */ }
    }
    return raw;
  }

  async function listInsuranceOptions(force) {
    var basic = await fetchUserBasic(!!force);
    var field = findInsuranceExtraField(basic);
    return {
      field: field,
      fieldName: insuranceFieldStorageName(field),
      options: parseInsuranceOptionsFromField(field)
    };
  }

  async function resolveTicketLabeledFieldDef(label) {
    var field = null;
    try { await listTicketCustomFields(); } catch (e) { /* fallback id */ }
    field = findTicketFieldByLabel(label);
    var spec = TICKET_FIELD_LABELS[label] || {};
    var name = ticketFieldStorageName(field) || spec.fallback || '';
    if (!name) return field;
    try {
      var full = await getTicketCustomField(name);
      if (full && ticketFieldStorageName(full)) return full;
    } catch (e2) { /* use list row */ }
    return field;
  }

  async function resolveTicketClosingStatusField() {
    return resolveTicketLabeledFieldDef('closing_status');
  }

  async function listTicketLabeledFieldOptions(label) {
    var field = await resolveTicketLabeledFieldDef(label);
    return collectTicketFieldOptions(field);
  }

  async function listClosingStatusOptions() {
    return listTicketLabeledFieldOptions('closing_status');
  }

  async function listClosingReasonOptions() {
    return listTicketLabeledFieldOptions('followup_reason');
  }

  function pickCashYesNoValue(field, wanted) {
    var want = String(wanted || '').toLowerCase() === 'yes' ? 'yes' : 'no';
    if (field && field.yes_val != null && String(field.yes_val) !== '' &&
        field.no_val != null && String(field.no_val) !== '') {
      return want === 'yes' ? String(field.yes_val) : String(field.no_val);
    }
    var opts = collectTicketFieldOptions(field);
    var i;
    var o;
    var vs;
    var ls;
    for (i = 0; i < opts.length; i++) {
      o = opts[i];
      vs = String(o.value || '');
      ls = String(o.label || '');
      if (want === 'yes' && (/^(yes|1|true|כן)$/i.test(vs) || /^(yes|כן)$/i.test(ls))) return vs;
      if (want === 'no' && (/^(no|0|false|לא)$/i.test(vs) || /^(no|לא)$/i.test(ls))) return vs;
    }
    if (opts.length >= 2) return want === 'yes' ? opts[0].value : opts[1].value;
    if (opts.length === 1 && want === 'yes') return opts[0].value;
    return '';
  }

  async function resolveTicketCashField() {
    var fields = [];
    try {
      fields = await listTicketCustomFields();
    } catch (e) {
      fields = [];
    }
    var hit = pickBestCashTicketField(fields);
    if (!hit) {
      var searches = ['cash', 'מזומן'];
      for (var i = 0; i < searches.length && !hit; i++) {
        try {
          var raw = await getClient().request('TicketCustomFields.List', {
            search: searches[i],
            limit: 25,
            length: 25
          });
          var rows = flattenTicketCustomFieldRows((raw && (raw.data || raw.rows || raw.output)) || []);
          hit = pickBestCashTicketField(rows);
        } catch (e2) { /* try next search */ }
      }
    }
    var name = ticketFieldStorageName(hit);
    if (!name) return null;
    try {
      var full = await getTicketCustomField(name);
      if (full && ticketFieldStorageName(full)) return full;
    } catch (e3) { /* use list row */ }
    return hit;
  }

  function cachedTicketCashFieldName() {
    var hit = pickBestCashTicketField(ticketCustomFieldsCache || []);
    return ticketFieldStorageName(hit);
  }

  function parseTicketFieldBag(value) {
    if (value == null || value === '') return {};
    if (typeof value === 'string') {
      try { value = JSON.parse(value); } catch (e) { return {}; }
    }
    if (Array.isArray(value)) {
      var fromArr = {};
      value.forEach(function (row) {
        if (row == null) return;
        if (typeof row !== 'object') return;
        var k = row.key || row.name || row.field || row.field_name || row.id;
        var v = row.value != null ? row.value : (row.val != null ? row.val : row.option_value);
        if (k != null && String(k) !== '') fromArr[String(k)] = v;
      });
      return fromArr;
    }
    if (typeof value === 'object') return value;
    return {};
  }

  function ticketCustomFieldBag(ticket) {
    var bag = {};
    if (!ticket || typeof ticket !== 'object') return bag;
    function merge(src) {
      var obj = parseTicketFieldBag(src);
      Object.keys(obj).forEach(function (k) {
        if (obj[k] === undefined || obj[k] === null || obj[k] === '') return;
        bag[k] = obj[k];
      });
    }
    merge(ticket.custom_fields);
    merge(ticket.extra_fields);
    merge(ticket.extra_fields_json);
    Object.keys(ticket).forEach(function (k) {
      if (!/^a-\d+$/.test(k)) return;
      if (ticket[k] === undefined || ticket[k] === null || ticket[k] === '') return;
      bag[k] = ticket[k];
    });
    return bag;
  }

  function readTicketStorageValue(ticket, name) {
    name = String(name || '').trim();
    if (!name) return '';
    var bag = ticketCustomFieldBag(ticket);
    var raw = bag[name];
    if (raw == null || raw === '') raw = bag[name + '[]'];
    if (Array.isArray(raw)) raw = raw.length ? raw[0] : '';
    if (raw && typeof raw === 'object') {
      raw = raw.option_value || raw.value || raw.id || raw.name || '';
    }
    return raw == null ? '' : String(raw).trim();
  }

  function isCashYesValue(raw, field) {
    if (raw == null || raw === '') return false;
    if (Array.isArray(raw)) raw = raw.length ? raw[0] : '';
    var s = String(raw).trim();
    if (!s) return false;
    if (field && field.yes_val != null && String(field.yes_val) !== '') {
      if (s === String(field.yes_val)) return true;
      if (field.no_val != null && String(field.no_val) !== '' && s === String(field.no_val)) return false;
    }
    var lower = s.toLowerCase();
    if (/^(no|false|לא|n)$/i.test(lower)) return false;
    return /^(yes|1|true|כן|y)$/i.test(lower);
  }

  function isTicketCashYes(ticket) {
    var field = pickBestCashTicketField(ticketCustomFieldsCache || []);
    var name = ticketFieldStorageName(field);
    var raw = name ? readTicketStorageValue(ticket, name) : '';
    if (!raw) {
      var bag = ticketCustomFieldBag(ticket);
      raw = bag.cash || bag.take_cash || bag.takeCash || bag.collect_cash || '';
      if (Array.isArray(raw)) raw = raw.length ? raw[0] : '';
      raw = raw == null ? '' : String(raw).trim();
    }
    if (!raw && ticket) {
      var notes = [
        ticket.messages, ticket.message, ticket.notes, ticket.note
      ].map(function (v) {
        if (v == null) return '';
        if (typeof v === 'string') return v;
        if (Array.isArray(v)) {
          return v.map(function (m) {
            return (m && (m.message || m.msg || m.text || m.note)) || '';
          }).join('\n');
        }
        return String((v && (v.message || v.msg || v.text || v.note)) || '');
      }).join('\n');
      var m = String(notes).match(/Take cash(?: from the customer)?:\s*([^\n]+)/i)
        || String(notes).match(/גביית מזומן\s*[:：]\s*([^\n]+)/);
      if (m && m[1]) raw = String(m[1]).trim();
    }
    return isCashYesValue(raw, field);
  }

  async function applyTicketCashField(payload, yesNo) {
    payload = payload || {};
    var field = await resolveTicketCashField();
    var name = ticketFieldStorageName(field);
    if (!name) return payload;
    var val = pickCashYesNoValue(field, yesNo);
    if (!val) return payload;
    if (!payload.custom_fields || typeof payload.custom_fields !== 'object') payload.custom_fields = {};
    payload.custom_fields[name] = val;
    payload[name] = val;
    if (payload.cash !== undefined) delete payload.cash;
    if (payload.take_cash !== undefined) delete payload.take_cash;
    return payload;
  }

  var TICKET_FIELD_LABELS = {
    closing_status: { aliases: ['closing_status', 'close_status'], fallback: 'a-1787203258', legacy: ['a-1787143997'] },
    cash_collected: { aliases: ['cash_collected', 'cashcollected'], fallback: 'a-1787203265', legacy: ['a-1787144046'] },
    cash_amount: { aliases: ['cash_amount', 'cashamount'], fallback: 'a-1787203267', legacy: ['a-1787144048'] },
    warranty_months: { aliases: ['warranty_months', 'warrantymonths'], fallback: 'a-1787203262', legacy: ['a-1787143998'] },
    installer_name: { aliases: ['installer_name', 'installername', 'technician_name'], fallback: 'a-1787203260', legacy: ['a-1787143967'] },
    closing_reason: { aliases: ['closing_reason', 'close_reason'], fallback: 'a-1787204474', legacy: ['a-1787203994', 'a-1787203269', 'a-1787144050'] },
    followup_reason: { aliases: ['followup_reason', 'follow_up_reason'], fallback: 'a-1787204476' }
  };

  function findTicketFieldByLabel(label) {
    var spec = TICKET_FIELD_LABELS[label] || { aliases: [label] };
    var aliases = (spec.aliases || [label]).map(function (a) { return String(a).toLowerCase(); });
    var fields = ticketCustomFieldsCache || [];
    var i;
    var en;
    for (i = 0; i < fields.length; i++) {
      en = ticketFieldLabel(fields[i]);
      if (aliases.indexOf(en) !== -1 && ticketFieldStorageName(fields[i])) return fields[i];
    }
    if (spec.fallback) return { name: spec.fallback, en: label };
    return null;
  }

  function labeledFieldStorageName(label) {
    var field = findTicketFieldByLabel(label);
    var name = ticketFieldStorageName(field);
    if (name) return name;
    return (TICKET_FIELD_LABELS[label] && TICKET_FIELD_LABELS[label].fallback) || '';
  }

  function readTicketLabeledField(ticket, label) {
    var name = labeledFieldStorageName(label);
    var raw = name ? readTicketStorageValue(ticket, name) : '';
    if (raw) return raw;
    var spec = TICKET_FIELD_LABELS[label] || { aliases: [label] };
    var extraIds = [].concat(spec.fallback || [], spec.legacy || []);
    var i;
    var v;
    for (i = 0; i < extraIds.length; i++) {
      raw = readTicketStorageValue(ticket, extraIds[i]);
      if (raw) return raw;
    }
    var bag = ticketCustomFieldBag(ticket);
    var aliases = spec.aliases || [label];
    for (i = 0; i < aliases.length; i++) {
      v = bag[aliases[i]];
      if (v == null || String(v).trim() === '') continue;
      return String(v).trim();
    }
    return '';
  }

  function stripTicketLabelKeys(payload) {
    if (!payload) return payload;
    var cf = payload.custom_fields;
    Object.keys(TICKET_FIELD_LABELS).forEach(function (label) {
      var aliases = (TICKET_FIELD_LABELS[label].aliases || [label]).concat([label, 'closing_reason_id']);
      aliases.forEach(function (k) {
        if (cf && Object.prototype.hasOwnProperty.call(cf, k)) delete cf[k];
        if (Object.prototype.hasOwnProperty.call(payload, k) && !/^a-\d+$/.test(k)) delete payload[k];
      });
    });
    return payload;
  }

  async function applyTicketLabeledCustomFields(payload, values) {
    payload = payload || {};
    try { await listTicketCustomFields(); } catch (e) { /* use fallback ids */ }
    if (!payload.custom_fields || typeof payload.custom_fields !== 'object') payload.custom_fields = {};
    Object.keys(values || {}).forEach(function (label) {
      var val = values[label];
      if (val == null || String(val).trim() === '') return;
      var name = labeledFieldStorageName(label);
      if (!name) return;
      var stored = String(val).trim();
      payload.custom_fields[name] = stored;
      payload[name] = stored;
    });
    return stripTicketLabelKeys(payload);
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
          : (r.clientpro_cust_id != null && r.clientpro_cust_id !== '' && Number(r.clientpro_cust_id) !== 0
            ? r.clientpro_cust_id
            : (r.client_id != null && r.client_id !== '' && Number(r.client_id) !== 0
              ? r.client_id
              : 0)))));
    return cid || 0;
  }

  function chatWhen(r) {
    return mongoDate(r && (r.last_updated || r.last_update || r.create_date || r.inserted_date)) ||
      String((r && (r.time || r.create_date)) || '');
  }

  function chatSnippet(r) {
    return String((r && (r.message || r.msg || r.note || r.import_note || r.subject)) || '').trim();
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
      var email = r.cust_email || r.email || r.clientpro_cust_email || '';
      var name = r.cust_name || r.name || r.clientpro_cust_name || '';
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
        phone: r.cust_phone || r.phone || r.clientpro_cust_phone || '',
        subject: chatSnippet(r) || r.subject || r.clientpro_cust_subject || 'שיחה',
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
   * Chat.SingleConversations — thread for one conversation (required: messenger_meta_id).
   */
  async function listSingleConversation(messengerMetaId, extra) {
    if (!messengerMetaId) {
      throw new Error('Missing required parameter: messenger_meta_id');
    }
    var client = getClient();
    var raw = await client.request('Chat.SingleConversations', Object.assign({
      messenger_meta_id: messengerMetaId,
      limit: 25
    }, extra || {}));
    var data = (raw && Array.isArray(raw.data)) ? raw.data : [];
    var rows = data.map(function (r) {
      return {
        message: r.message || chatSnippet(r),
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
      customer_id: raw && (raw.customer_id || raw.contactus_id),
      messenger_meta_id: raw && raw.messenger_meta_id,
      raw: raw
    };
  }

  /**
   * Chat.SendCustomer — customer composer / internal notes.
   * @see https://eli.bull36.com/app/help/Chat.SendCustomer
   * Required: customer_id (or cust_id / contactus_id), message (or msg).
   * Notes: from=send_notes stores internal timeline entry; fires message.created.
   */
  async function sendCustomerMessage(params) {
    var client = getClient();
    var p = params || {};
    var msg = String(p.msg || p.message || '').trim();
    if (!msg) {
      var e = new Error('חסרה הודעה (message)');
      e.route = 'Chat.SendCustomer';
      throw e;
    }
    var customerId = p.customer_id != null && p.customer_id !== ''
      ? p.customer_id
      : (p.cust_id != null && p.cust_id !== ''
        ? p.cust_id
        : (p.contactus_id != null && p.contactus_id !== '' ? p.contactus_id : null));
    if (customerId == null) {
      var e2 = new Error('חסר customer_id לשליחת הודעה');
      e2.route = 'Chat.SendCustomer';
      e2.code = 'MISSING_ID';
      throw e2;
    }
    var fromVal = p.from ? String(p.from) : '';
    var isInternalNote = !fromVal || fromVal === 'send_notes' || fromVal === 'notes';
    // Official note sample: customer_id + message + from=send_notes
    var payload = isInternalNote
      ? { customer_id: customerId, message: msg, from: 'send_notes' }
      : {
        msg: msg,
        message: msg,
        customer_id: customerId,
        cust_id: customerId
      };
    if (!isInternalNote && p.from) payload.from = p.from;
    // channel_type is for custom channels (from=send_chat_channel) or explicit override
    if (p.channel_type && (p.from === 'send_chat_channel' || p.force_channel_type)) {
      payload.channel_type = p.channel_type;
    }
    if (p.email || p.chart_selected_email || p.to_email) {
      var emailVal = p.chart_selected_email || p.to_email || p.email;
      payload.email = emailVal;
      payload.chart_selected_email = emailVal;
      payload.to_email = emailVal;
    }
    if (p.phone || p.mobile || p.chart_selected_phone_no) {
      var phoneVal = p.chart_selected_phone_no || p.phone || p.mobile;
      payload.phone = phoneVal;
      payload.mobile = phoneVal;
      payload.chart_selected_phone_no = phoneVal;
    }
    if (p.message_id) payload.message_id = p.message_id;
    if (p.template_id != null && p.template_id !== '') payload.template_id = p.template_id;
    var raw = await client.request('Chat.SendCustomer', payload);
    var returnText = String((raw && (raw.message_return || raw.message)) || '').trim();

    // Hard-fail on explicit API errors before fuzzy success checks
    if (!raw || raw.success === 0 || raw.success === '0' || raw.success === false || raw.error) {
      var failMsg = (raw && (raw.message || raw.message_return || raw.error)) || 'שליחת הודעה נכשלה';
      var errFail = new Error(String(failMsg));
      errFail.route = 'Chat.SendCustomer';
      errFail.status = raw && raw.status;
      errFail.raw = raw;
      throw errFail;
    }

    // Some channels return success:1 + socket_event but message text is a failure
    // e.g. "שליחת האימייל נכשלה...!" OR WhatsApp 24h window / template required
    // (message is NOT stored on the customer thread in that case).
    var waWindowFail = /24\s*שעות|מתבנית|template messages|לא שלח אליך/i.test(returnText);
    if (
      /נכשל|failed|failure|error|לא נשלח|permission.?denied/i.test(returnText) ||
      (fromVal === 'send_whatsapp' && waWindowFail)
    ) {
      var softFail = new Error(returnText || 'שליחת הודעה נכשלה');
      softFail.route = 'Chat.SendCustomer';
      softFail.status = raw && raw.status;
      softFail.raw = raw;
      softFail.code = waWindowFail ? 'WHATSAPP_WINDOW' : 'SEND_FAILED_MESSAGE';
      throw softFail;
    }

    var ok = (
      Number(raw.success) === 1 ||
      raw.success === true ||
      Number(raw.output) === 1 ||
      String(raw.success) === '4' ||
      /נשלח|נוספה|הצלח|successfully/i.test(returnText)
    );
    if (!ok) {
      var err = new Error(returnText || 'שליחת הודעה נכשלה');
      err.route = 'Chat.SendCustomer';
      err.status = raw && raw.status;
      err.raw = raw;
      throw err;
    }
    return {
      ok: true,
      message: returnText || 'נשלח',
      raw: raw
    };
  }

  /** Internal note — Chat.SendCustomer per help sample (from=send_notes). */
  async function sendCustomerNote(customerId, text, extra) {
    var cid = customerId != null && customerId !== '' ? customerId : null;
    if (cid == null) {
      var e = new Error('חסר customer_id לשמירת הערה');
      e.route = 'Chat.SendCustomer';
      e.code = 'MISSING_ID';
      throw e;
    }
    var msg = String(text || '').trim();
    return sendCustomerMessage(Object.assign({
      customer_id: cid,
      message: msg,
      from: 'send_notes'
    }, extra || {}));
  }

  /** Event keys from biz1:ready that belong to messages / missions. */
  var MESSAGE_EVENT_KEYS = {
    'chat.message.received': 1,
    'whatsapp.message.received': 1,
    'whatsapp.inbox.refresh': 1,
    'rooms.chat.message': 1,
    'message.created': 1,
    'message.deleted': 1,
    'message.replied': 1,
    'message.forwarded': 1,
    'message.mark_read': 1
  };
  var MISSION_EVENT_KEYS = {
    'mission.reminder': 1,
    'mission.created': 1,
    'mission.updated': 1,
    'mission.done': 1,
    'mission.deleted': 1,
    'mission.reopened': 1,
    'teamops.task.updated': 1,
    'ticket.created': 1,
    'ticket.updated': 1,
    'ticket.deleted': 1,
    'ticket.status': 1,
    'appointment.created': 1,
    'appointment.updated': 1,
    'appointment.deleted': 1,
    'meeting.created': 1,
    'meeting.updated': 1,
    'meeting.deleted': 1
  };
  var LEAD_EVENT_KEYS = {
    'customer.updated': 1,
    'customer.deleted': 1,
    'customer.restored': 1,
    'customer.followup': 1,
    'crm.lead.created': 1,
    'customer.reminder.created': 1,
    'customer.reminder.updated': 1,
    'customer.reminder.deleted': 1
  };
  var INVENTORY_EVENT_KEYS = {
    'products.created': 1,
    'products.updated': 1,
    'products.deleted': 1,
    'categories.created': 1,
    'categories.updated': 1,
    'categories.deleted': 1
  };

  var realtimeState = {
    status: 'off', // off | loading_io | connecting | ready | offline | error
    ready: null,
    error: null,
    socket: null,
    registered: []
  };
  var realtimeHandlersWired = false;
  var realtimeKeyHandlersWired = {};
  // Survives connectRealtime() re-entry after ping-timeout / network drop.
  var needsCatchUpAfterReconnect = false;

  /** Console filter: [SocketTest] — always on for live debugging. */
  function socketTestLog() {
    try {
      var args = Array.prototype.slice.call(arguments);
      args.unshift('[SocketTest]');
      console.log.apply(console, args);
    } catch (e) { /* ignore */ }
  }

  function dispatchAppEvent(name, detail) {
    try {
      if (typeof global.dispatchEvent === 'function' && typeof global.CustomEvent === 'function') {
        global.dispatchEvent(new global.CustomEvent(name, { detail: detail || {} }));
      }
    } catch (e) { /* ignore */ }
  }

  function classifyRealtimeEvent(event) {
    var key = String((event && event.key) || '');
    // Order matters for overlapping keys (e.g. mission.message.created → messages).
    if (MESSAGE_EVENT_KEYS[key] || /chat|whatsapp|inbox|(^|\.)message(\.|$)/i.test(key)) return 'messages';
    if (INVENTORY_EVENT_KEYS[key] || /product|inventory|categorie|entries|statuses\./i.test(key)) return 'inventory';
    if (LEAD_EVENT_KEYS[key] || /lead|crm|customer/i.test(key)) return 'leads';
    if (MISSION_EVENT_KEYS[key] || /mission|task|ticket|appointment|meeting|reminder/i.test(key)) return 'missions';
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

    function relayRealtime(event, forcedKey, source) {
      var ev = event || {};
      var key = String(
        forcedKey ||
        ev.key ||
        ev.event_key ||
        ev.socket_event ||
        (ev.payload && (ev.payload.key || ev.payload.event_key)) ||
        ''
      );
      if (!key) {
        socketTestLog('SDK relay SKIP empty key', { source: source || 'sdk', event: ev });
        return;
      }
      var normalized = Object.assign({}, ev, { key: key });
      var group = classifyRealtimeEvent(normalized);
      var detail = { group: group, key: key, event: normalized };
      socketTestLog('SDK relay → mineralbar:realtime', {
        source: source || 'sdk',
        key: key,
        group: group,
        id: ev && ev.id
      });
      dispatchAppEvent('mineralbar:realtime', detail);
      if (group === 'messages') dispatchAppEvent('mineralbar:messages', detail);
      if (group === 'missions') dispatchAppEvent('mineralbar:missions', detail);
      if (group === 'leads') dispatchAppEvent('mineralbar:leads', detail);
      if (group === 'inventory') dispatchAppEvent('mineralbar:inventory', detail);
    }

    function wireReadyEventKeys(events) {
      console.log('wireReadyEventKeys', events);
      (events || []).forEach(function (eventKey) {
        var key = String(eventKey || '');
        if (!key || realtimeKeyHandlersWired[key]) return;
        realtimeKeyHandlersWired[key] = true;
        client.realtime.on(key, function (event) {
          console.log('wireReadyEventKeys on', key, event);
          relayRealtime(event || {}, key, 'ready-key:' + key);
        });
      });
    }

    client.realtime.on('biz1:ready', function (payload) {
      realtimeState.ready = payload || null;
      realtimeState.registered = (payload && Array.isArray(payload.events)) ? payload.events.slice() : [];
      realtimeState.error = null;
      setRealtimeStatus('ready');
      wireReadyEventKeys(realtimeState.registered);
      // Registration is automatic via bearer auth — ready.events is the subscribed catalog.
      var msgKeys = realtimeState.registered.filter(function (k) {
        return classifyRealtimeEvent({ key: k }) === 'messages';
      });
      socketTestLog('biz1:ready message keys in catalog', {
        count: msgKeys.length,
        keys: msgKeys,
        has_message_created: msgKeys.indexOf('message.created') !== -1,
        has_chat_received: msgKeys.indexOf('chat.message.received') !== -1,
        has_whatsapp_received: msgKeys.indexOf('whatsapp.message.received') !== -1
      });
      // Preferences can mute socket delivery even when the catalog lists the event.
      try {
        client.request('NotificationPreferences.Get', {}).then(function (prefs) {
          var list = (prefs && (prefs.preferences || prefs.data || prefs)) || [];
          if (!Array.isArray(list) && list.preferences) list = list.preferences;
          if (!Array.isArray(list)) list = [];
          var interesting = list.filter(function (row) {
            var k = String((row && (row.event_key || row.key)) || '');
            return /message|chat|whatsapp|inbox/i.test(k);
          }).map(function (row) {
            return {
              key: row.event_key || row.key,
              enabled: row.enabled,
              delivery_socket: row.delivery_socket
            };
          });
          socketTestLog('NotificationPreferences message/chat', interesting);
          var muted = interesting.filter(function (r) {
            return Number(r.enabled) === 0 || Number(r.delivery_socket) === 0;
          });
          if (muted.length) {
            socketTestLog('WARNING muted socket prefs (server may not push these)', muted);
          }
        }).catch(function (err) {
          socketTestLog('NotificationPreferences.Get failed', (err && err.message) || err);
        });
      } catch (ePref) {
        socketTestLog('NotificationPreferences probe error', ePref);
      }
      dispatchAppEvent('mineralbar:socket', {
        type: 'ready',
        payload: payload,
        registered: realtimeState.registered,
        messages: msgKeys,
        missions: realtimeState.registered.filter(function (k) { return classifyRealtimeEvent({ key: k }) === 'missions'; })
      });
    });

    // Primary wildcard listener (if SDK supports '*')
    client.realtime.on('*', function (event) {
      relayRealtime(event, null, 'wildcard(*)');
    });

    // Fallback channel (per Biz1 docs): generic event wrapper
    client.realtime.on('biz1:event', function (event) {
      relayRealtime(event, null, 'biz1:event');
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

    socketTestLog('connectRealtime START', {
      domain: DOMAIN,
      path: options.path || '/realtime/socket.io',
      hasToken: !!client.getToken(),
      statusBefore: realtimeState.status
    });

    await ensureSocketIo();
    socketTestLog('socket.io.js loaded', { hasIo: !!global.io });
    wireRealtimeHandlers(client);
    setRealtimeStatus('connecting');

    // CRITICAL: stale lastEventId is sent in socket auth and can block ALL new events.
    // Example stuck value: 1785146897350 → server thinks client is already up-to-date.
    var keepCursor = false;
    try {
      var lastIdBefore = Number(global.localStorage.getItem('biz1_realtime_last_event_id') || 0);
      // Always clear for live UI updates (missed-event replay is less important here).
      // Force keep only if URL has ?socket_keep_cursor=1
      keepCursor = /[?&]socket_keep_cursor=1/.test(String(global.location && global.location.search || ''));
      if (!keepCursor && lastIdBefore > 0) {
        global.localStorage.removeItem('biz1_realtime_last_event_id');
        socketTestLog('cursor RESET', { previous: lastIdBefore });
        dispatchAppEvent('mineralbar:socket-debug', {
          type: 'cursor_reset',
          previous: lastIdBefore
        });
      } else {
        socketTestLog('cursor', { lastEventId: lastIdBefore, keepCursor: keepCursor });
      }
    } catch (e) {
      console.warn('[Socket] could not read/clear lastEventId', e);
    }

    var socket = client.realtime.connect({
      platform: options.platform || 'web',
      path: options.path || '/realtime/socket.io',
      deviceId: options.deviceId,
      fcmToken: options.fcmToken || '',
      token: options.token,
      // Live lists need every add/edit/delete — do not resume from a stale cursor.
      lastEventId: keepCursor ? undefined : 0
    });
    realtimeState.socket = socket;
    socketTestLog('io() created', { socketId: socket && socket.id, connected: !!(socket && socket.connected) });

    var relayedEventIds = Object.create(null);
    var relayedEventIdOrder = [];

    // Bypass SDK filtering: always capture raw engine events for list soft-refresh
    function forceRelayFromSocket(event, source) {
      try {
        var ev = event || {};
        // Payloads sometimes nest the real event under .event / .payload / .data
        var nested = ev.event || ev.payload || ev.data || null;
        if (nested && typeof nested === 'object' && !ev.key && (nested.key || nested.event_key)) {
          ev = Object.assign({}, nested, { id: ev.id || nested.id });
        }
        var key = String(
          ev.key ||
          ev.event_key ||
          ev.socket_event ||
          (ev.payload && (ev.payload.key || ev.payload.event_key)) ||
          ''
        );
        // Named socket packets (ticket.created) arrive without a wrapper key
        if (!key && source && String(source).indexOf('onAny:') === 0) {
          key = String(source).slice(6);
        }
        if (!key || key === 'biz1:event' || key === 'biz1:ready') {
          socketTestLog('forceRelay SKIP', { source: source, key: key || '(empty)' });
          return;
        }

        var eid = ev.id != null ? String(ev.id) : '';
        if (eid) {
          if (relayedEventIds[eid]) {
            socketTestLog('forceRelay DEDUPE skip', { source: source, key: key, id: eid });
            return;
          }
          relayedEventIds[eid] = 1;
          relayedEventIdOrder.push(eid);
          if (relayedEventIdOrder.length > 200) {
            var old = relayedEventIdOrder.shift();
            delete relayedEventIds[old];
          }
        }

        var group = classifyRealtimeEvent({ key: key });
        var detail = { group: group, key: key, event: ev };
        socketTestLog('forceRelay → mineralbar:realtime', {
          source: source,
          key: key,
          group: group,
          id: eid || '(no-id)'
        });
        dispatchAppEvent('mineralbar:realtime', detail);
        if (group === 'messages') dispatchAppEvent('mineralbar:messages', detail);
        if (group === 'leads') dispatchAppEvent('mineralbar:leads', detail);
        if (group === 'missions') dispatchAppEvent('mineralbar:missions', detail);
        if (group === 'inventory') dispatchAppEvent('mineralbar:inventory', detail);
        dispatchAppEvent('mineralbar:socket-debug', {
          type: 'event',
          source: source,
          key: key,
          group: group,
          event: ev
        });
      } catch (err) {
        console.error('[Socket] forceRelay error', err);
      }
    }

    if (socket && typeof socket.on === 'function') {
      socket.on('biz1:event', function (event) {
        socketTestLog('raw socket.on(biz1:event)', { id: event && event.id, key: event && event.key });
        forceRelayFromSocket(event, 'biz1:event');
      });
      socket.on('biz1:ready', function (payload) {
        var n = (payload && Array.isArray(payload.events)) ? payload.events.length : 0;
        socketTestLog('biz1:ready', { events: n, status: realtimeState.status });
        dispatchAppEvent('mineralbar:socket-debug', { type: 'ready', payload: payload });
        if (needsCatchUpAfterReconnect) {
          needsCatchUpAfterReconnect = false;
          setTimeout(function () {
            if (typeof nudgePagesAfterSocket === 'function') {
              socketTestLog('nudge after reconnect');
              nudgePagesAfterSocket('reconnect');
            }
          }, 250);
        }
      });
    }

    // Catch ALL raw socket.io packets and relay data events (add/edit/delete)
    if (socket && typeof socket.onAny === 'function') {
      socket.onAny(function (eventName) {
        var args = Array.prototype.slice.call(arguments, 1);
        var name = String(eventName || '');
        if (!/^(ping|pong)$/i.test(name)) {
          socketTestLog('onAny', name, args[0] && typeof args[0] === 'object' ? { id: args[0].id, key: args[0].key } : args[0]);
        }
        dispatchAppEvent('mineralbar:socket-debug', { type: 'onAny', eventName: eventName, args: args });
        if (!name || /^(connect|disconnect|connect_error|error|reconnect|reconnect_attempt|reconnecting|ping|pong|biz1:ready)$/i.test(name)) {
          return;
        }
        var payload = args[0];
        if (name === 'biz1:event' || name === 'rooms:refresh') {
          forceRelayFromSocket(payload, 'onAny:' + name);
          return;
        }
        // Direct named events: ticket.created, products.updated, ...
        if (name.indexOf('.') !== -1) {
          var wrapped = (payload && typeof payload === 'object')
            ? Object.assign({}, payload, { key: payload.key || name })
            : { key: name, data: payload };
          forceRelayFromSocket(wrapped, 'onAny:' + name);
        }
      });
    } else {
      console.warn('[Socket] socket.onAny not available — raw packet capture limited');
    }

    socket.on('connect', function () {
      socketTestLog('CONNECT', { id: socket.id, transport: socket.io && socket.io.engine && socket.io.engine.transport && socket.io.engine.transport.name });
      if (realtimeState.status !== 'ready') setRealtimeStatus('connecting');
      dispatchAppEvent('mineralbar:socket', { type: 'connect', id: socket.id });
      dispatchAppEvent('mineralbar:socket-debug', { type: 'connect', id: socket.id });
    });
    socket.on('connect_error', function (err) {
      var msg = (err && err.message) || String(err);
      socketTestLog('CONNECT_ERROR', msg, err);
      setRealtimeStatus('error', msg);
      dispatchAppEvent('mineralbar:socket', { type: 'error', error: msg });
      dispatchAppEvent('mineralbar:socket-debug', { type: 'error', error: msg });
    });
    socket.on('disconnect', function (reason) {
      socketTestLog('DISCONNECT', reason, { status: realtimeState.status });
      if (realtimeState.status !== 'error') setRealtimeStatus('offline');
      dispatchAppEvent('mineralbar:socket', { type: 'disconnect', reason: reason });
      dispatchAppEvent('mineralbar:socket-debug', { type: 'disconnect', reason: reason });
      // Explicit client disconnect (logout / pagehide) — do not fight it here.
      // Network drops: Socket.IO reconnection handles most cases; if the socket
      // instance was cleared, visibility/online handlers will restore it.
      var intentional = reason === 'io client disconnect';
      if (!intentional) {
        needsCatchUpAfterReconnect = true;
        if (global.document && global.document.visibilityState === 'visible') {
          scheduleRealtimeReconnect('disconnect:' + reason, 800);
        }
      }
    });

    return {
      socket: socket,
      promise: new Promise(function (resolve, reject) {
        var done = false;
        var timeoutMs = options.timeoutMs || 12000;
        var t = setTimeout(function () {
          if (done) return;
          done = true;
          socketTestLog('biz1:ready TIMEOUT', { timeoutMs: timeoutMs, status: realtimeState.status, connected: !!(socket && socket.connected) });
          reject(new Error('biz1:ready timeout'));
        }, timeoutMs);
        var off = client.realtime.on('biz1:ready', function (payload) {
          if (done) return;
          done = true;
          clearTimeout(t);
          socketTestLog('biz1:ready RESOLVED', { events: (payload && payload.events && payload.events.length) || 0 });
          try { off(); } catch (e) { /* ignore */ }
          resolve(payload);
        });
        socket.on('connect_error', function (err) {
          if (done) return;
          done = true;
          clearTimeout(t);
          socketTestLog('promise REJECT connect_error', (err && err.message) || err);
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

  var realtimeReconnectTimer = null;
  var realtimeConnectInFlight = null;

  function isRealtimeConnected() {
    return !!(realtimeState.socket && realtimeState.socket.connected);
  }

  /**
   * Reconnect when socket was dropped (BFCache, tab freeze, network blip).
   * Safe to call often — no-ops if already connected / connecting / no token.
   */
  function ensureRealtimeConnected(reason) {
    try {
      var client = getClient();
      if (!client || !client.getToken || !client.getToken()) {
        socketTestLog('ensureRealtimeConnected SKIP no token', reason);
        return null;
      }
      if (isRealtimeConnected()) {
        socketTestLog('ensureRealtimeConnected SKIP already connected', reason, realtimeState.status);
        return realtimeConnectInFlight;
      }
      if (realtimeState.status === 'connecting' || realtimeState.status === 'loading_io') {
        socketTestLog('ensureRealtimeConnected SKIP stuck/in-progress', {
          reason: reason,
          status: realtimeState.status,
          inFlight: !!realtimeConnectInFlight
        });
        return realtimeConnectInFlight;
      }
      if (realtimeConnectInFlight) {
        socketTestLog('ensureRealtimeConnected reuse inFlight', reason);
        return realtimeConnectInFlight;
      }

      socketTestLog('ensureRealtimeConnected START', reason || 'ensure');
      dispatchAppEvent('mineralbar:socket-debug', {
        type: 'reconnect_attempt',
        reason: reason || 'ensure'
      });

      realtimeConnectInFlight = connectRealtime()
        .then(function (handle) {
          return handle && handle.promise ? handle.promise : handle;
        })
        .catch(function (err) {
          var msg = (err && err.message) || String(err || 'reconnect failed');
          console.warn('[Socket] ensureRealtimeConnected failed (' + (reason || 'ensure') + ')', msg);
          socketTestLog('ensureRealtimeConnected FAILED', reason, msg);
          throw err;
        })
        .finally(function () {
          realtimeConnectInFlight = null;
        });
      return realtimeConnectInFlight;
    } catch (e) {
      console.warn('[Socket] ensureRealtimeConnected error', e);
      return null;
    }
  }

  function scheduleRealtimeReconnect(reason, delayMs) {
    clearTimeout(realtimeReconnectTimer);
    realtimeReconnectTimer = setTimeout(function () {
      ensureRealtimeConnected(reason);
    }, delayMs == null ? 0 : delayMs);
  }

  function nudgePagesAfterSocket(reason) {
    // Missed events while backgrounded / reconnecting: force lists to re-fetch.
    dispatchAppEvent('mineralbar:realtime', {
      group: 'other',
      key: 'socket.nudge.' + String(reason || 'refresh'),
      event: { key: 'socket.nudge', reason: reason || 'refresh' }
    });
    dispatchAppEvent('mineralbar:page-refresh', {
      group: 'other',
      key: 'socket.nudge.' + String(reason || 'refresh'),
      reason: reason || 'refresh'
    });
  }

  // An open/connecting WebSocket cannot survive a Back-Forward Cache freeze.
  // ONLY disconnect when the page is actually frozen into BFCache (persisted).
  // Disconnecting on every pagehide killed the socket on tab switches, so
  // ticket.created (and other) events were missed while the list stayed open.
  if (global.addEventListener && !global.__mbRealtimeLifecycleWired) {
    global.__mbRealtimeLifecycleWired = true;

    global.addEventListener('pagehide', function (event) {
      if (event && event.persisted) disconnectRealtime();
    });

    global.addEventListener('pageshow', function (event) {
      if (!event || !event.persisted) return; // first load: page-boot owns connect
      // BFCache restore (in-app back): reconnect + one soft catch-up for missed socket events.
      // (Other-app resume uses visibilitychange below — reconnect only, no list refresh.)
      var p = ensureRealtimeConnected('pageshow-bfcache');
      var after = function () {
        if (typeof nudgePagesAfterSocket === 'function') nudgePagesAfterSocket('bfcache');
      };
      if (p && typeof p.then === 'function') p.then(after).catch(after);
      else after();
    });

    if (global.document && global.document.addEventListener) {
      global.document.addEventListener('visibilitychange', function () {
        if (global.document.visibilityState !== 'visible') return;
        // Coming back from another app/tab: only ensure socket is up.
        // Do NOT re-fetch lists here — live add/edit/delete stay on real socket events.
        if (!isRealtimeConnected()) {
          var p = ensureRealtimeConnected('visibilitychange');
          // After a real reconnect, catch up once (events may have been missed while offline).
          if (p && typeof p.then === 'function') {
            p.then(function () {
              if (typeof nudgePagesAfterSocket === 'function') nudgePagesAfterSocket('visible-reconnect');
            }).catch(function () { /* ignore */ });
          }
        }
      });
    }

    global.addEventListener('online', function () {
      if (isRealtimeConnected()) return;
      scheduleRealtimeReconnect('online', 200);
    });
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

  function resetRealtimeCursor() {
    try {
      global.localStorage.removeItem('biz1_realtime_last_event_id');
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Registered page reloaders for socket add/edit/delete (no full page reload). */
  var liveReloaders = [];
  var liveReloadBusWired = false;

  function notifyLiveReload(detail) {
    detail = detail || {};
    var key = String(detail.key || '').toLowerCase();
    var group = String(detail.group || '').toLowerCase();
    // Skip connect noise + plain other-app resume. Allow bfcache / visible-reconnect / reconnect catch-up.
    if (/^socket\.(connect|connected|disconnect)(\.|$)/i.test(key)) return;
    if (/^socket\.nudge\.visible$/i.test(key)) return;
    if (key === 'pageshow' || key === 'visible') return;

    // Like biz1_ticket: list APIs can lag behind the socket event — retry briefly.
    // Never multi-retry timer/poll nudges — only real data CRUD events.
    var retryDelays = /ticket\.|mission\.(done|created|updated|deleted|reopened)|products?\.(created|updated|deleted)|categories\.|customer\.|lead\.|crm\.|message\.|chat\.|document\.|team_hours|teamhours/.test(key)
      ? [0, 1000, 2500]
      : [0];
    if (/socket\.nudge/i.test(key)) retryDelays = [0];

    var matched = 0;
    liveReloaders.forEach(function (entry) {
      if (!entry || typeof entry.fn !== 'function') return;
      if (entry.keys) {
        try {
          if (key && !entry.keys.test(key)) return;
        } catch (e0) { /* ignore bad regex */ }
      }
      if (entry.groups && entry.groups.length) {
        if (group && entry.groups.indexOf(group) === -1 && entry.groups.indexOf('other') === -1) return;
      }
      matched += 1;
      clearTimeout(entry._timer);
      (entry._retries || []).forEach(clearTimeout);
      entry._retries = [];
      var baseDelay = entry.delay != null ? entry.delay : 400;
      entry._timer = setTimeout(function () {
        socketTestLog('LiveReload RUN', { key: key, group: group, delay: baseDelay });
        try { entry.fn(detail); } catch (err) {
          console.warn('[LiveReload] handler failed', err);
        }
        retryDelays.slice(1).forEach(function (extraMs) {
          entry._retries.push(setTimeout(function () {
            socketTestLog('LiveReload RETRY', { key: key, extraMs: extraMs });
            try { entry.fn(detail); } catch (err2) {
              console.warn('[LiveReload] retry failed', err2);
            }
          }, extraMs));
        });
      }, baseDelay);
    });
    socketTestLog('notifyLiveReload', {
      key: key,
      group: group,
      handlers: liveReloaders.length,
      matched: matched,
      retries: retryDelays
    });
  }

  function ensureLiveReloadBus() {
    if (liveReloadBusWired || !global.addEventListener) return;
    liveReloadBusWired = true;
    ['mineralbar:realtime', 'mineralbar:page-refresh', 'mineralbar:missions', 'mineralbar:messages', 'mineralbar:leads', 'mineralbar:inventory'].forEach(function (name) {
      global.addEventListener(name, function (ev) {
        notifyLiveReload((ev && ev.detail) || {});
      });
    });
  }

  /**
   * Register a soft reload callback for socket-driven add/edit/delete.
   * Returns an unbind function.
   *   MineralBarApp.bindLiveReload(() => this.loadTickets());
   *   MineralBarApp.bindLiveReload(fn, { keys: /ticket|mission/, delay: 300 });
   */
  function bindLiveReload(fn, options) {
    options = options || {};
    if (typeof fn !== 'function') return function () {};
    ensureLiveReloadBus();
    var entry = {
      fn: fn,
      keys: options.keys || null,
      groups: options.groups || null,
      delay: options.delay != null ? options.delay : 400,
      _timer: null
    };
    if (typeof entry.keys === 'string') {
      try { entry.keys = new RegExp(entry.keys, 'i'); } catch (e1) { entry.keys = null; }
    }
    liveReloaders.push(entry);
    return function unbind() {
      liveReloaders = liveReloaders.filter(function (e) { return e !== entry; });
      clearTimeout(entry._timer);
    };
  }

  global.MineralBarApp = {
    DOMAIN: DOMAIN,
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
    clearAppCaches: clearAppCaches,
    logoutAndClearCache: logoutAndClearCache,
    getRole: getRole,
    getEmail: getEmail,
    getUserBasic: getUserBasic,
    fetchUserBasic: fetchUserBasic,
    extractExtraFieldsFromUserBasic: extractExtraFieldsFromUserBasic,
    findInsuranceExtraField: findInsuranceExtraField,
    listInsuranceOptions: listInsuranceOptions,
    getUser: getUser,
    getFolders: getFolders,
    populateFolderDropdowns: populateFolderDropdowns,
    getTeamMembers: getTeamMembers,
    homeForRole: homeForRole,
    isAuthenticated: isAuthenticated,
    requireAuth: requireAuth,
    requireAuthOrRedirect: requireAuth,
    listCustomers: listCustomers,
    createCustomer: createCustomer,
    assignCustomerTeamMember: assignCustomerTeamMember,
    countCustomers: countCustomers,
    listProjects: listProjects,
    uploadCustomerFile: uploadCustomerFile,
    listMissions: listMissions,
    countMissions: countMissions,
    createMission: createMission,
    getMission: getMission,
    updateMission: updateMission,
    updateMissionFields: updateMissionFields,
    saveMissionImages: saveMissionImages,
    saveMissionRecording: saveMissionRecording,
    resolveFileUrl: resolveFileUrl,
    parseMissionImageList: parseMissionImageList,
    parseRecordingFromMeta: parseRecordingFromMeta,
    doneMission: doneMission,
    getCustomer: getCustomer,
    getTicket: getTicket,
    listTicketCustomFields: listTicketCustomFields,
    getTicketCustomField: getTicketCustomField,
    collectTicketFieldOptions: collectTicketFieldOptions,
    resolveTicketClosingStatusField: resolveTicketClosingStatusField,
    listTicketLabeledFieldOptions: listTicketLabeledFieldOptions,
    listClosingStatusOptions: listClosingStatusOptions,
    listClosingReasonOptions: listClosingReasonOptions,
    resolveTicketCashField: resolveTicketCashField,
    applyTicketCashField: applyTicketCashField,
    cachedTicketCashFieldName: cachedTicketCashFieldName,
    isTicketCashYes: isTicketCashYes,
    applyTicketLabeledCustomFields: applyTicketLabeledCustomFields,
    readTicketLabeledField: readTicketLabeledField,
    listDocuments: listDocuments,
    listEmails: listEmails,
    listChatConversations: listChatConversations,
    listCustomerMessages: listCustomerMessages,
    listSingleConversation: listSingleConversation,
    parseEmailsHtml: parseEmailsHtml,
    sendCustomerMessage: sendCustomerMessage,
    sendCustomerNote: sendCustomerNote,
    connectRealtime: connectRealtime,
    disconnectRealtime: disconnectRealtime,
    ensureRealtimeConnected: ensureRealtimeConnected,
    getRealtimeState: getRealtimeState,
    getRegisteredRealtimeEvents: getRegisteredRealtimeEvents,
    resetRealtimeCursor: resetRealtimeCursor,
    bindLiveReload: bindLiveReload,
    notifyLiveReload: notifyLiveReload,
    MESSAGE_EVENT_KEYS: MESSAGE_EVENT_KEYS,
    MISSION_EVENT_KEYS: MISSION_EVENT_KEYS,
    LEAD_EVENT_KEYS: LEAD_EVENT_KEYS,
    INVENTORY_EVENT_KEYS: INVENTORY_EVENT_KEYS
  };
})(typeof window !== 'undefined' ? window : globalThis);
