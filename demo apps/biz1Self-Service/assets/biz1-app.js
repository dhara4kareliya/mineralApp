/**
 * Biz1 Showcase — SDK bootstrap
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
    sales: 'בית מכירות.dc.html',
    service: 'שירות כל הקריאות.dc.html',
    tech: 'טכנאי דשבורד ביצועים.dc.html'
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
      console.info('[Biz1Demo] refreshing token via login…', cred.username);
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
      dispatchAppEvent('biz1demo:auth-refreshed', {
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
    if (!client || client.__biz1DemoAuthWrapped) return;
    client.__biz1DemoAuthWrapped = true;
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
    try { dispatchAppEvent('biz1demo:portal-login-required', {}); } catch (e) { /* ignore */ }
    try { dispatchAppEvent('biz1:portal-login-required', {}); } catch (e2) { /* ignore */ }
    var here = (global.location && global.location.pathname) || '';
    var file = (here.split('/').pop() || '').toLowerCase();
    // SPA portal lives on index.html — stay put and let UI show login screen
    if (!file || file === 'index.html' || file.indexOf('self') !== -1) {
      return;
    }
    var target = loginPage || 'index.html';
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
   * Detect Biz1 Login identifier kind.
   * Returns { type, value, field } where field is the API key:
   * email | username | phone | id
   */
  function detectLoginIdentifier(raw) {
    var value = String(raw || '').trim();
    if (!value) return { type: '', value: '', field: '' };

    if (value.indexOf('@') !== -1) {
      return { type: 'email', value: value, field: 'email' };
    }

    var digits = normalizePhone(value);
    var compact = value.replace(/[\s\-().]/g, '');
    var phoneShaped = (
      /^\+/.test(value) ||
      /^0\d/.test(compact) ||
      (/[\s\-()]/.test(value) && digits.length >= 7) ||
      (digits.length >= 9 && digits.length <= 15 && /^[\d\s\-()+]+$/.test(value))
    );

    if (phoneShaped && digits.length >= 7) {
      return { type: 'phone', value: value, field: 'phone' };
    }
    if (/^\d+$/.test(value)) {
      return { type: 'id', value: value, field: 'id' };
    }
    return { type: 'username', value: value, field: 'username' };
  }

  function buildLoginPayload(identifier, password, otp) {
    var identified = (identifier && identifier.field)
      ? identifier
      : detectLoginIdentifier(identifier);
    var payload = {
      password: password || '',
      otp: otp || ''
    };
    var field = identified.field || 'username';
    var value = identified.value || '';
    if (field === 'email') payload.email = value;
    else if (field === 'phone') payload.phone = value;
    else if (field === 'id') payload.id = value;
    else payload.username = value;
    return { payload: payload, identified: identified, loginKey: value };
  }

  async function login({ username, password, otp, remember, email, phone, id, identifier }) {
    var client = getClient();
    var rawId = identifier || username || email || phone || id || '';
    var built = buildLoginPayload(rawId, password, otp || '');
    var data = await client.request('Login', built.payload, { public: true });
    if (data && data.token) {
      try { client.setToken(data.token); } catch (eTok) { /* ignore */ }
    }

    var loginKey = built.loginKey || String(rawId || '').trim();

    if (data && (data.otp_required || data.otpRequired)) {
      return {
        ok: false,
        otpRequired: true,
        message: data.message || 'נדרש קוד אימות (OTP)',
        raw: data,
        identifier: built.identified
      };
    }

    if (!data || !data.token) {
      throw new Error((data && data.message) || 'ההתחברות נכשלה');
    }

    var userBasic = await client.account.basic();
    var role = detectRole(loginKey, userBasic);
    try {
      var loginUser = (userBasic.data && userBasic.data.user) || userBasic.user || {};
      if (loginUser.user_domain || loginUser.user_name) {
        rememberDashboardOrigin(loginUser.user_domain || loginUser.user_name);
      }
    } catch (e0) { /* ignore */ }
    saveSession(userBasic, role, loginKey, {
      expiresAt: data.expires_at || data.expiresAt || null
    });
    // Always keep password in sessionStorage for mid-session token refresh.
    // Persist to localStorage when "זכור אותי" is checked (or already was).
    var rememberFlag = remember;
    if (rememberFlag == null) {
      rememberFlag = global.localStorage.getItem(REMEMBER_KEY) === '1';
    }
    saveCredentials(loginKey, password, !!rememberFlag);

    // Realtime is started from the inventory screen (single connect path).
    return {
      ok: true,
      otpRequired: false,
      role: role,
      identifier: built.identified,
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
        console.warn('[Biz1Demo] auto refresh failed', err);
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

  function extractProductRows(raw) {
    if (!raw) return [];
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.rows)) return raw.rows;
    if (Array.isArray(raw.products)) return raw.products;
    if (Array.isArray(raw.items)) return raw.items;
    if (raw.data && Array.isArray(raw.data.rows)) return raw.data.rows;
    return [];
  }

  function extractProductTotal(raw, rows) {
    if (!raw) return rows.length;
    var candidates = [raw.count, raw.recordsFiltered, raw.recordsTotal, raw.total_record, raw.total];
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i] != null) {
        var n = Number(candidates[i]);
        if (!Number.isNaN(n)) return n;
      }
    }
    return rows.length;
  }

  /**
   * Products.List — pages until all rows loaded (≤25 per page).
   * Returns { rows, total, raw, countRaw }.
   */
  async function listProducts(extra) {
    var client = getClient();
    var all = [];
    var start = 0;
    var pageSize = 25;
    var safety = 0;
    var reportedTotal = null;
    var lastRaw = null;
    var base = Object.assign({
      length: pageSize,
      limit: pageSize,
      draw: 1
    }, extra || {});

    while (safety < 40) {
      safety++;
      lastRaw = await client.products.list(Object.assign({}, base, {
        start: start,
        offset: start
      }));
      var rows = extractProductRows(lastRaw);
      if (reportedTotal == null) reportedTotal = extractProductTotal(lastRaw, rows);
      all = all.concat(rows);
      if (!rows.length || rows.length < pageSize) break;
      if (reportedTotal != null && all.length >= reportedTotal) break;
      start += pageSize;
    }

    var countRaw = null;
    try {
      countRaw = await client.products.count(extra || {});
    } catch (e) {
      console.warn('[Biz1Demo] Products.Count failed', e);
    }

    var total = reportedTotal != null ? reportedTotal : all.length;
    if (countRaw && countRaw.count != null) {
      var c = Number(countRaw.count);
      if (!Number.isNaN(c)) total = c;
    }

    return { rows: all, total: total, raw: lastRaw, countRaw: countRaw };
  }

  async function countProducts(extra) {
    var client = getClient();
    try {
      var countRaw = await client.products.count(extra || {});
      var c = countRaw && countRaw.count != null ? Number(countRaw.count) : NaN;
      if (!Number.isNaN(c)) return { count: c, raw: countRaw };
    } catch (e) {
      console.warn('[Biz1Demo] Products.Count failed', e);
    }
    var listed = await listProducts(extra);
    return { count: listed.total, raw: listed.countRaw };
  }

  async function getProduct(id, extra) {
    var client = getClient();
    var raw = await client.products.get(id, extra || {});
    var row = (raw && raw.data) || raw || null;
    return { row: row, raw: raw };
  }

  /**
   * Products.Update — only fields allowed by API whitelist.
   * Stock is readable on List/Get but NOT writable via Products.Update.
   */
  async function updateProduct(id, data) {
    var client = getClient();
    var src = data || {};
    var allowed = ['product_name', 'product_price', 'price', 'description', 'sku', 'status', 'endless'];
    var payload = {};
    allowed.forEach(function (key) {
      if (src[key] != null && src[key] !== '') payload[key] = src[key];
    });
    if (!Object.keys(payload).length && src.product_name) {
      payload.product_name = src.product_name;
    }
    if (!Object.keys(payload).length) {
      var emptyErr = new Error('No supported Products.Update fields were sent');
      emptyErr.route = 'Products.Update';
      throw emptyErr;
    }
    var raw = await client.products.update(id, payload);
    if (raw && (Number(raw.success) === 0 || raw.success === false)) {
      var err = new Error((raw && raw.message) || 'Products.Update failed');
      err.raw = raw;
      err.route = 'Products.Update';
      throw err;
    }
    return { raw: raw, id: (raw && raw.id) || id };
  }

  var STOCK_BRIDGE_ID = 'biz1StockBridge';
  var DASHBOARD_ORIGIN_KEY = 'biz1demo_dashboard_origin';

  function getKnownDashboardOrigin() {
    try {
      return global.localStorage.getItem(DASHBOARD_ORIGIN_KEY) || DOMAIN;
    } catch (e) {
      return DOMAIN;
    }
  }

  function rememberDashboardOrigin(url) {
    try {
      var origin = typeof url === 'string' && /^https?:\/\//i.test(url)
        ? new global.URL(url).origin
        : ('https://' + String(url || '').toLowerCase().replace(/\.bull36\.com.*$/, '') + '.bull36.com');
      if (origin && origin.indexOf('bull36.com') !== -1) {
        global.localStorage.setItem(DASHBOARD_ORIGIN_KEY, origin);
        return origin;
      }
    } catch (e) { /* ignore */ }
    return getKnownDashboardOrigin();
  }

  function dashboardOriginFromUserBasic() {
    try {
      var basic = getUserBasic();
      var user = (basic && basic.data && basic.data.user) || (basic && basic.user) || {};
      var org = (basic && basic.data && basic.data.org) || {};
      var domain = user.user_domain || org.user_domain || user.user_name || org.user_name || '';
      if (domain) return rememberDashboardOrigin(domain);
    } catch (e) { /* ignore */ }
    return getKnownDashboardOrigin();
  }

  function ensureStockBridgeFrame() {
    var frame = global.document.getElementById(STOCK_BRIDGE_ID);
    if (!frame) {
      frame = global.document.createElement('iframe');
      frame.id = STOCK_BRIDGE_ID;
      frame.name = STOCK_BRIDGE_ID;
      frame.title = 'Biz1 stock sync';
      frame.setAttribute('aria-hidden', 'true');
      frame.setAttribute('tabindex', '-1');
      frame.style.cssText = 'position:absolute;width:0;height:0;border:0;opacity:0;pointer-events:none;visibility:hidden';
      global.document.body.appendChild(frame);
    }
    return frame;
  }

  function loadBridgeUrl(url) {
    ensureStockBridgeFrame().src = url;
  }

  /** Kept for compatibility — prepares hidden iframe (no visible popup). */
  function openStockBridgeWindow() {
    return ensureStockBridgeFrame();
  }

  function postFormToBridge(action, fields) {
    ensureStockBridgeFrame();
    var form = global.document.createElement('form');
    form.method = 'POST';
    form.action = action;
    form.target = STOCK_BRIDGE_ID;
    form.style.display = 'none';
    Object.keys(fields || {}).forEach(function (name) {
      var input = global.document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = String(fields[name] == null ? '' : fields[name]);
      form.appendChild(input);
    });
    global.document.body.appendChild(form);
    form.submit();
    form.remove();
  }

  function sleep(ms) {
    return new Promise(function (resolve) { global.setTimeout(resolve, ms); });
  }

  function parseStorageIds(row) {
    if (!row) return [];
    var detail = row.storage_detail;
    if (detail == null || detail === '') return [];
    try {
      var parsed = typeof detail === 'string' ? JSON.parse(detail) : detail;
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch (e) { /* ignore */ }
    return [];
  }

  /**
   * Write product stock from pure HTML (no Node server).
   * Uses a hidden iframe session on the Biz1 dashboard, then verifies via Products.Get.
   */
  async function updateProductStock(productId, qty) {
    var cred = getSavedCredentials();
    if (!cred || !cred.username || !cred.password) {
      var credErr = new Error('Missing saved password for stock sync. Please log in again.');
      credErr.route = 'stock.bridge';
      throw credErr;
    }

    var target = Math.max(0, Math.round(Number(qty)));
    if (Number.isNaN(target)) {
      throw new Error('Invalid qty');
    }

    ensureStockBridgeFrame();

    var got = await getProduct(productId);
    var row = got && got.row;
    var storageIds = parseStorageIds(row);
    if (!storageIds.length) {
      throw new Error('No warehouse/storage linked to this product in Biz1');
    }
    var storageId = storageIds[0];
    var dashOrigin = dashboardOriginFromUserBasic();

    loadBridgeUrl(dashOrigin + '/dashboard/login');
    await sleep(1200);

    postFormToBridge(dashOrigin + '/dashboard/login/check_login', {
      email: cred.username,
      password: cred.password,
      email_otp_with: '1'
    });
    await sleep(1800);

    postFormToBridge(dashOrigin + '/dashboard/productreport/storage_inner_record_edit', {
      id: storageId,
      stock_val: target,
      damage_val: '0',
      show_rooms_val: '0'
    });
    await sleep(2000);

    var verifiedQty = target;
    var synced = false;
    var attempt;
    for (attempt = 0; attempt < 5; attempt++) {
      try {
        var check = await getProduct(productId);
        var live = check && check.row
          ? Number(check.row.stock != null && check.row.stock !== '' ? check.row.stock : check.row.left_stock)
          : NaN;
        if (!Number.isNaN(live) && live === target) {
          verifiedQty = live;
          synced = true;
          break;
        }
        if (!Number.isNaN(live)) verifiedQty = live;
      } catch (e) { /* retry */ }
      await sleep(700);
    }

    if (!synced) {
      var syncErr = new Error('Biz1 stock did not update. Please try again.');
      syncErr.route = 'stock.bridge';
      syncErr.qty = verifiedQty;
      throw syncErr;
    }

    return {
      qty: verifiedQty,
      storageId: storageId,
      dashboard: dashOrigin,
      raw: { ok: true, qty: verifiedQty, storageId: storageId }
    };
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

    // New flat list response (current API)
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
   * Current API returns email-thread rows (email/subject/note/customer_id).
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
   * Current rows use note/email/create_date (not always message/time).
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
    if (p.from) payload.from = p.from;
    if (p.phone || p.mobile || p.chart_selected_phone_no) {
      payload.chart_selected_phone_no = String(p.chart_selected_phone_no || p.phone || p.mobile);
      payload.phone = payload.chart_selected_phone_no;
      payload.mobile = payload.chart_selected_phone_no;
    }
    if (p.email || p.chart_selected_email || p.to_email) {
      payload.chart_selected_email = String(p.chart_selected_email || p.email || p.to_email);
      payload.email = payload.chart_selected_email;
      payload.to_email = payload.chart_selected_email;
    }
    if (p.channel_type) payload.channel_type = p.channel_type;
    if (p.template_id != null && p.template_id !== '') payload.template_id = p.template_id;
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
  var PRODUCT_EVENT_KEYS = {
    'products.created': 1,
    'products.updated': 1,
    'products.deleted': 1
  };
  /** Customer / document events that should refresh portal Pay + Sign lists. */
  var DOCUMENT_EVENT_KEYS = {
    'customer.updated': 1,
    'customer.followup': 1,
    'customer.restored': 1,
    'crm.lead.created': 1
  };

  var realtimeState = {
    status: 'off', // off | loading_io | connecting | ready | offline | error
    ready: null,
    error: null,
    socket: null,
    registered: []
  };
  var realtimeHandlersWired = false;
  var connectRealtimePromise = null;

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
    if (PRODUCT_EVENT_KEYS[key] || /product/i.test(key)) return 'products';
    if (
      DOCUMENT_EVENT_KEYS[key] ||
      /document|invoice|receipt|payment|order_proposal|proposal|quote|sign|approve|paid/i.test(key)
    ) {
      return 'documents';
    }
    if (/lead|crm|customer/i.test(key)) return 'documents';
    return 'other';
  }

  /** Extract customer_id from a realtime event payload when present. */
  function realtimeCustomerId(event) {
    var payload = (event && event.payload) || (event && event.event && event.event.payload) || event || {};
    if (payload.payload && typeof payload.payload === 'object') payload = payload.payload;
    var id = payload.customer_id || payload.cust_id || payload.clientid ||
      (payload.customer && (payload.customer.id || payload.customer.customer_id || payload.customer.cust_id)) ||
      payload.id;
    return id != null && id !== '' ? String(id) : '';
  }

  function setRealtimeStatus(status, error) {
    realtimeState.status = status;
    if (error != null) realtimeState.error = error;
    dispatchAppEvent('biz1demo:socket-status', {
      status: realtimeState.status,
      error: realtimeState.error,
      registered: realtimeState.registered.slice(),
      ready: realtimeState.ready,
      connected: !!(realtimeState.socket && realtimeState.socket.connected)
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
      dispatchAppEvent('biz1demo:socket', {
        type: 'ready',
        payload: payload,
        registered: realtimeState.registered,
        messages: realtimeState.registered.filter(function (k) { return classifyRealtimeEvent({ key: k }) === 'messages'; }),
        missions: realtimeState.registered.filter(function (k) { return classifyRealtimeEvent({ key: k }) === 'missions'; }),
        products: realtimeState.registered.filter(function (k) { return classifyRealtimeEvent({ key: k }) === 'products'; })
      });
    });

    client.realtime.on('*', function (event) {
      var group = classifyRealtimeEvent(event);
      var detail = {
        group: group,
        key: event && event.key,
        event: event,
        customer_id: realtimeCustomerId(event)
      };
      dispatchAppEvent('biz1demo:realtime', detail);
      if (group === 'messages') dispatchAppEvent('biz1demo:messages', detail);
      if (group === 'missions') dispatchAppEvent('biz1demo:missions', detail);
      if (group === 'products') dispatchAppEvent('biz1demo:products', detail);
      if (group === 'documents') dispatchAppEvent('biz1demo:documents', detail);
      if (group === 'leads') dispatchAppEvent('biz1demo:leads', detail);
    });

    client.realtime.on('rooms:refresh', function (event) {
      dispatchAppEvent('biz1demo:realtime', { group: 'rooms', key: 'rooms:refresh', event: event });
    });
  }

  /**
   * Connect Socket.IO realtime after login.
   * Server registers the user on connect (auth.bearer) and returns subscribed
   * event keys in biz1:ready — including chat/message + mission events.
   * Safe to call repeatedly — reuses an in-flight / ready connection.
   */
  async function connectRealtime(options) {
    options = options || {};
    var client = getClient();
    if (!client.getToken()) {
      throw new Error('Realtime connect requires login');
    }

    if (
      realtimeState.socket &&
      realtimeState.socket.connected &&
      (realtimeState.status === 'ready' || realtimeState.status === 'connecting')
    ) {
      return {
        socket: realtimeState.socket,
        promise: Promise.resolve(realtimeState.ready)
      };
    }
    if (connectRealtimePromise) return connectRealtimePromise;

    connectRealtimePromise = (async function () {
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
        dispatchAppEvent('biz1demo:socket', { type: 'connect', id: socket.id });
      });
      socket.on('connect_error', function (err) {
        var msg = (err && err.message) || String(err);
        realtimeState.ready = null;
        realtimeState.registered = [];
        setRealtimeStatus('error', msg);
        dispatchAppEvent('biz1demo:socket', { type: 'error', error: msg });
      });
      socket.on('disconnect', function (reason) {
        // Clear ready catalog so UI never treats stale registration as Live
        realtimeState.ready = null;
        realtimeState.registered = [];
        if (realtimeState.status !== 'error') setRealtimeStatus('offline');
        else setRealtimeStatus('error', realtimeState.error);
        dispatchAppEvent('biz1demo:socket', { type: 'disconnect', reason: reason });
      });

      var readyPayload = await new Promise(function (resolve, reject) {
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
      });

      return { socket: socket, promise: Promise.resolve(readyPayload), ready: readyPayload };
    })();

    try {
      return await connectRealtimePromise;
    } finally {
      connectRealtimePromise = null;
    }
  }

  function disconnectRealtime() {
    connectRealtimePromise = null;
    try {
      var client = getClient();
      if (client && client.realtime) client.realtime.disconnect();
    } catch (e) { /* ignore */ }
    realtimeState.socket = null;
    realtimeState.ready = null;
    realtimeState.registered = [];
    realtimeState.error = null;
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

  /* ── Customer Self-Service portal helpers ── */
  var PORTAL_CUSTOMER_KEY = 'biz1demo_portal_customer_id';
  var PORTAL_PHONE_KEY = 'biz1demo_portal_phone';

  function getPortalCustomerId() {
    try {
      var q = new URLSearchParams((global.location && global.location.search) || '');
      var fromUrl = q.get('customer_id') || q.get('cust_id') || q.get('id');
      if (fromUrl) {
        global.sessionStorage.setItem(PORTAL_CUSTOMER_KEY, String(fromUrl));
        return String(fromUrl);
      }
      return global.sessionStorage.getItem(PORTAL_CUSTOMER_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function setPortalCustomerId(id) {
    try {
      if (id) global.sessionStorage.setItem(PORTAL_CUSTOMER_KEY, String(id));
      else global.sessionStorage.removeItem(PORTAL_CUSTOMER_KEY);
    } catch (e) { /* ignore */ }
  }

  function getPortalPhone() {
    try { return global.sessionStorage.getItem(PORTAL_PHONE_KEY) || ''; } catch (e) { return ''; }
  }

  function setPortalPhone(phone) {
    try {
      if (phone) global.sessionStorage.setItem(PORTAL_PHONE_KEY, String(phone));
      else global.sessionStorage.removeItem(PORTAL_PHONE_KEY);
    } catch (e) { /* ignore */ }
  }

  function normalizePhone(phone) {
    return String(phone || '').replace(/\D+/g, '');
  }

  function extractCustomerRows(raw) {
    if (!raw) return [];
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.rows)) return raw.rows;
    if (Array.isArray(raw.customers)) return raw.customers;
    if (raw.data && Array.isArray(raw.data.rows)) return raw.data.rows;
    if (raw.output && Array.isArray(raw.output)) return raw.output;
    return [];
  }

  function customerPhoneBlob(c) {
    return [
      c.phone, c.mobile, c.cell, c.telephone, c.tel,
      c.cust_phone, c.customer_phone, c.phone1, c.phone2,
      c.whatsapp, c.whatsapp_phone
    ].map(function (v) { return normalizePhone(v); }).join(' ');
  }

  async function findCustomerByPhone(phone, extra) {
    var digits = normalizePhone(phone);
    if (!digits || digits.length < 7) {
      var e = new Error('phone too short');
      e.code = 'BAD_PHONE';
      throw e;
    }
    var tail9 = digits.slice(-9);
    var tail10 = digits.slice(-10);
    // Search New Leads + Customers (phone may live in either folder)
    var folders = [FOLDERS.LEADS, FOLDERS.CUSTOMERS];
    // Biz1 Customer.List accepts `search` (string) — never pass a `phone` param
    var searchShapes = [
      { search: digits, length: 50, start: 0 },
      { search: phone, length: 50, start: 0 },
      { search: tail10, length: 50, start: 0 },
      { length: 100, start: 0 }
    ];
    var raw = null;
    var rows = [];
    var lastErr = null;

    for (var f = 0; f < folders.length; f++) {
      for (var a = 0; a < searchShapes.length; a++) {
        try {
          raw = await listCustomers(folders[f], Object.assign({}, searchShapes[a], extra || {}));
          rows = extractCustomerRows(raw);
          if (!rows.length) continue;
          var matchIn = null;
          for (var i = 0; i < rows.length; i++) {
            var blob = customerPhoneBlob(rows[i]);
            if (
              blob.indexOf(digits) !== -1 ||
              (tail10 && blob.indexOf(tail10) !== -1) ||
              (tail9 && blob.indexOf(tail9) !== -1)
            ) {
              matchIn = rows[i];
              break;
            }
          }
          if (matchIn) {
            return { customer: matchIn, rows: rows, raw: raw, phone: digits, folder_id: folders[f] };
          }
        } catch (err) {
          lastErr = err;
          var msg = String((err && err.message) || err || '');
          if (/unknown parameter/i.test(msg)) continue;
        }
      }
    }

    if (lastErr && !rows.length) throw lastErr;
    return { customer: null, rows: rows, raw: raw, phone: digits };
  }

  function guessDocType(blob) {
    var s = String(blob || '').toLowerCase();
    if (/invoice|חשבונית|קבלה|receipt|tax/.test(s)) return 'invoice';
    if (/order_proposals|quote|הצעת|proposal|offer/.test(s)) return 'quote';
    if (/contract|הסכם|agreement|sign|חתימ/.test(s)) return 'contract';
    if (/\.pdf(\?|$)/.test(s)) return 'pdf';
    return 'document';
  }

  function firstItemName(d) {
    var items = d && d.items;
    if (typeof items === 'string') {
      try { items = JSON.parse(items.replace(/^'|'$/g, '')); } catch (e) { items = null; }
    }
    if (!Array.isArray(items) || !items.length) return '';
    var first = items[0] || {};
    return String(first.item_name || first.name || first.title || '').trim();
  }

  function formatAmount(value) {
    var n = Number(value);
    if (!isFinite(n)) return value;
    return Math.round(n * 100) / 100;
  }

  function normalizeDoc(d, idx) {
    if (!d) return null;
    var id = String(d.id || d.document_id || d.doc_id || d.file_id || (idx + 1));
    var typeHint = String(d.type || d.doc_type || '');
    var noteTitle = String(d.note || d.note_header || d.proposal_title || '').trim();
    var itemTitle = firstItemName(d);
    var prettyType = '';
    if (typeHint === 'order_proposals') prettyType = 'Order Proposal #' + id;
    else if (typeHint === 'invoice') prettyType = 'Invoice #' + id;
    else if (typeHint) prettyType = typeHint.charAt(0).toUpperCase() + typeHint.slice(1) + ' #' + id;
    var title = d.title || d.file_name || d.filename || d.doc_name || noteTitle || itemTitle ||
      prettyType || d.name || ('Document #' + id);
    var url = d.pdf_url || d.url || d.href || d.link || d.file_url || d.text_url || d.path || '';
    if (url && url.indexOf('http') !== 0 && url.indexOf('//') !== 0 && url.charAt(0) === '/') {
      url = DOMAIN + url;
    }
    var status = String(d.status || d.doc_status || d.sign_status || d.payment_status || d.user_status || '').toLowerCase();
    var type = typeHint === 'order_proposals' ? 'quote'
      : (typeHint || guessDocType(title + ' ' + url + ' ' + status));
    var amount = formatAmount(
      d.final_amount != null ? d.final_amount
        : (d.amount != null ? d.amount : (d.total != null ? d.total : d.price))
    );
    var userStatus = String(d.user_status != null ? d.user_status : '').toLowerCase();
    // CRM Tax Invoices "Paid" is based on Left To Pay / linked receipts.
    // Documents.List paid=1 is unreliable (often 1 while CRM still shows Unpaid).
    var isSigned = d.signed === true || d.signed === 1 || d.signed === '1' ||
      d.approve === true || d.approve === 1 || d.approve === '1' ||
      /signed|נחתם|approved|מאושר/.test(status);
    // Order proposals / quotes need CRM approve=1 to count as signed on site.
    var needsSign = type === 'contract' || type === 'quote' ||
      /pending|unsigned|await|ממתין|לחתימ|unapproved|לא מאושר/.test(status);
    if (type === 'quote' || typeHint === 'order_proposals') {
      needsSign = !(d.approve === true || d.approve === 1 || d.approve === '1');
      isSigned = !needsSign;
    }
    var isPaid = false;
    var unpaid = false;
    if (type === 'invoice') {
      isPaid = !(Number(amount) > 0);
      unpaid = Number(amount) > 0;
    } else {
      isPaid = /paid|שולם|closed/.test(status) || /paid|שולם/.test(userStatus);
    }
    if (isSigned) needsSign = false;
    // Receipts are payment docs, not portal Pay/Sign actions.
    if (typeHint === 'receipt' || typeHint === 'receipt_partly_paid' || typeHint === 'receipt_tax_invoice') {
      return null;
    }
    // Empty stub rows (no type / zero amount) are not portal actions.
    if (!typeHint && !(Number(amount) > 0) && !url) return null;
    var displayTitle = title;
    if (type === 'invoice' && d.last_documents_id) {
      displayTitle = 'Invoice #' + d.last_documents_id;
    } else if (type === 'quote') {
      displayTitle = 'Order Proposal #' + (d.last_documents_id || id);
    }
    return {
      id: id,
      title: displayTitle,
      url: url,
      type: type,
      status: status || 'open',
      amount: amount,
      paid: !!isPaid,
      signed: !!isSigned,
      needsSign: !!needsSign && type !== 'invoice',
      unpaid: !!unpaid,
      raw: d
    };
  }

  function relatedDocIds(value) {
    if (value == null || value === '' || value === '[]') return [];
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
    if (typeof value === 'number') return [String(value)];
    var text = String(value).trim();
    if (!text) return [];
    try {
      var parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch (e) { /* ignore */ }
    return text.split(/[,\s]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  /** Invoice ids that CRM treats as paid because a real receipt is linked. */
  function invoiceIdsClosedByReceipts(rawDocs) {
    var paid = {};
    var receiptIds = {};
    (rawDocs || []).forEach(function (d) {
      if (!d) return;
      var docType = String(d.type || d.document_type || '');
      if (docType !== 'receipt' && docType !== 'receipt_partly_paid' && docType !== 'receipt_tax_invoice') {
        return;
      }
      receiptIds[String(d.id)] = true;
      relatedDocIds(d.related_document_id).forEach(function (id) { paid[id] = true; });
      relatedDocIds(d.document_to_pay).forEach(function (id) { paid[id] = true; });
    });
    (rawDocs || []).forEach(function (d) {
      if (!d || String(d.type || d.document_type || '') !== 'invoice') return;
      relatedDocIds(d.related_document_id).forEach(function (id) {
        if (receiptIds[id]) paid[String(d.id)] = true;
      });
    });
    return paid;
  }

  function parseDocuments(raw) {
    var docs = [];
    if (!raw) return docs;

    var arrays = [raw.data, raw.rows, raw.documents, raw.files, raw.items];
    for (var a = 0; a < arrays.length; a++) {
      if (Array.isArray(arrays[a]) && arrays[a].length) {
        arrays[a].forEach(function (d, idx) {
          docs.push(normalizeDoc(d, idx));
        });
        return docs.filter(Boolean);
      }
    }

    var html = raw.files_html || raw.html || '';
    if (html && typeof html === 'string') {
      try {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var links = doc.querySelectorAll('a[href]');
        links.forEach(function (aEl, idx) {
          var href = aEl.getAttribute('href') || '';
          var title = (aEl.textContent || '').trim() || ('Document #' + (idx + 1));
          if (!href) return;
          docs.push(normalizeDoc({
            id: aEl.getAttribute('data-id') || aEl.getAttribute('data_id') || String(idx + 1),
            title: title,
            name: title,
            url: href,
            href: href,
            type: guessDocType(title + ' ' + href)
          }, idx));
        });
      } catch (e) { /* ignore */ }
    }
    return docs.filter(Boolean);
  }

  var SIGNED_DOCS_MARKER = 'PORTAL_SIGNED_DOCS:';
  var PAID_DOCS_MARKER = 'PORTAL_PAID_DOCS:';

  function parseMarkedDocIds(notes, marker) {
    var text = String(notes || '');
    var idx = text.indexOf(marker);
    if (idx === -1) return [];
    var json = text.slice(idx + marker.length).trim();
    var end = json.indexOf('\n');
    if (end !== -1) json = json.slice(0, end).trim();
    try {
      var parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (e) {
      return [];
    }
  }

  function upsertMarkedDocIds(notes, marker, documentId) {
    var ids = parseMarkedDocIds(notes, marker);
    var docId = String(documentId || '');
    if (docId && ids.indexOf(docId) === -1) ids.push(docId);
    var re = new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\[[^\\]]*\\]', 'g');
    var cleaned = String(notes || '').replace(re, '').trim();
    return {
      ids: ids,
      notes: (cleaned ? cleaned + '\n' : '') + marker + JSON.stringify(ids)
    };
  }

  async function updateCustomerNotes(customerId, nextNotes) {
    var id = requireId(customerId, 'customer_id');
    var client = getClient();
    var raw = await client.request('Customer.Edit', {
      customer_id: id,
      cust_id: id,
      note: nextNotes
    });
    var ok = !!(raw && (Number(raw.success) === 1 || raw.success === true || raw.message));
    if (!ok) {
      var err = new Error((raw && raw.message) || 'Customer.Edit failed');
      err.raw = raw;
      throw err;
    }
    return raw;
  }

  async function markDocumentInNotes(customerId, documentId, marker) {
    var got = await getCustomer(customerId);
    var notes = String((got.customer && (got.customer.notes || got.customer.note)) || '');
    var updated = upsertMarkedDocIds(notes, marker, documentId);
    var raw = await updateCustomerNotes(customerId, updated.notes);
    return { ok: true, ids: updated.ids, raw: raw };
  }

  function normalizeCardExp(exp) {
    var raw = String(exp || '').trim().replace(/\s+/g, '');
    var m = raw.match(/^(\d{1,2})[\/\-](\d{2}|\d{4})$/);
    if (!m) return raw;
    var mm = m[1].length === 1 ? '0' + m[1] : m[1];
    var yy = m[2].length === 2 ? m[2] : m[2].slice(-2);
    // Documents.Add expects month_year like 12-2028; accept 12/28 too.
    var year = m[2].length === 4 ? m[2] : ('20' + yy);
    return mm + '-' + year;
  }

  async function payInvoice(payload) {
    payload = payload || {};
    var customerId = requireId(payload.customer_id, 'customer_id');
    var documentId = payload.document_id || payload.id || payload.doc_id;
    if (!documentId) throw new Error('document_id is required');
    var amount = payload.amount != null ? payload.amount : payload.final_amount;
    if (!(Number(amount) > 0)) throw new Error('amount is required');

    var client = getClient();
    // Critical: document_type=receipt + type=receipt + document_to_pay (no related_document_id).
    // related_document_id often creates another invoice instead of a receipt, so CRM stays Unpaid.
    var base = {
      customer_id: customerId,
      document_type: 'receipt',
      type: 'receipt',
      invoice_setting_id: payload.invoice_setting_id || 541,
      document_to_pay: documentId,
      final_amount: amount,
      note: payload.description || ('Portal payment for invoice ' + documentId),
      items: '[]'
    };

    var attempts = [];
    // Prefer card charge when card details exist; tenant may require default gateway.
    if (payload.card_number || payload.card_no) {
      attempts.push(Object.assign({}, base, {
        payment_method: 'cc',
        card_name: payload.card_holder || payload.card_name || payload.name || '',
        card_no: String(payload.card_number || payload.card_no || '').replace(/\s+/g, ''),
        month_year: normalizeCardExp(payload.card_exp || payload.month_year || payload.exp || ''),
        cvc: payload.card_cvv || payload.cvc || payload.cvv || ''
      }));
    }
    attempts.push(Object.assign({}, base, { payment_method: 'cash' }));
    attempts.push(Object.assign({}, base, { payment_method: 'others' }));

    var lastErr = null;
    var raw = null;
    for (var i = 0; i < attempts.length; i++) {
      try {
        raw = await client.request('Documents.Add', attempts[i]);
        if (raw && (Number(raw.success) === 1 || raw.success === true || raw.inserted_documents_id || raw.id)) {
          var receiptId = raw.inserted_documents_id || raw.id;
          var marked = await markDocumentInNotes(customerId, documentId, PAID_DOCS_MARKER);
          return {
            ok: true,
            route: 'Documents.Add',
            payment_method: attempts[i].payment_method,
            receipt_id: receiptId,
            raw: raw,
            marked: marked
          };
        }
        lastErr = new Error((raw && raw.message) || 'Documents.Add receipt failed');
        lastErr.raw = raw;
      } catch (err) {
        lastErr = err;
      }
    }
    if (lastErr) throw lastErr;
    throw new Error('Payment failed');
  }

  function mergeRawDocumentRows(lists) {
    var byId = {};
    var order = [];
    (lists || []).forEach(function (rows) {
      (rows || []).forEach(function (d) {
        if (!d) return;
        var id = String(d.id || d.document_id || '');
        if (!id) return;
        if (!byId[id]) {
          byId[id] = d;
          order.push(id);
        } else {
          byId[id] = Object.assign({}, byId[id], d);
        }
      });
    });
    return order.map(function (id) { return byId[id]; });
  }

  async function listCustomerDocuments(customerId, extra) {
    var id = requireId(customerId, 'customer_id');
    var base = Object.assign({ length: 50, start: 0 }, extra || {});
    // Mixed Documents.List is invoice-heavy and can drop older order proposals.
    // Fetch key types separately, then merge by id.
    var typeQueries = [
      Object.assign({}, base),
      Object.assign({}, base, { type: 'invoice' }),
      Object.assign({}, base, { type: 'order_proposals' }),
      Object.assign({}, base, { type: 'receipt' })
    ];
    var rawLists = [];
    var primaryRaw = null;
    for (var q = 0; q < typeQueries.length; q++) {
      try {
        var part = await listDocuments(id, typeQueries[q]);
        if (!primaryRaw) primaryRaw = part.raw;
        rawLists.push((part.raw && part.raw.data) || []);
      } catch (ePart) { /* ignore individual type failures */ }
    }
    var rawRows = mergeRawDocumentRows(rawLists);
    var docs = parseDocuments({ data: rawRows });
    var receiptPaidMap = invoiceIdsClosedByReceipts(rawRows);
    var signedIds = [];
    var paidIds = [];
    try {
      var got = await getCustomer(id);
      var notes = (got.customer && (got.customer.notes || got.customer.note)) || '';
      signedIds = parseMarkedDocIds(notes, SIGNED_DOCS_MARKER);
      paidIds = parseMarkedDocIds(notes, PAID_DOCS_MARKER);
    } catch (e) { /* ignore */ }
    docs = docs.map(function (d) {
      // Order proposals: CRM approve flag is source of truth (site Approved/Unapproved).
      if (d.type === 'quote' || d.type === 'contract') {
        var crmApproved = !!(d.raw && (d.raw.approve === true || d.raw.approve === 1 || d.raw.approve === '1'));
        d.needsSign = !crmApproved;
        d.signed = crmApproved;
      } else if (signedIds.indexOf(String(d.id)) !== -1) {
        d.needsSign = false;
        d.signed = true;
      }
      if (paidIds.indexOf(String(d.id)) !== -1 || receiptPaidMap[String(d.id)]) {
        d.unpaid = false;
        d.paid = true;
      }
      return d;
    });
    return {
      docs: docs,
      raw: primaryRaw || { data: rawRows },
      html: (primaryRaw && primaryRaw.files_html) || '',
      customer_id: id,
      signedIds: signedIds,
      paidIds: paidIds,
      receiptPaidIds: Object.keys(receiptPaidMap)
    };
  }

  async function listPaymentForms(extra) {
    var client = getClient();
    var raw = await client.request('PaymentForms.List', Object.assign({
      length: 25,
      start: 0,
      draw: 1
    }, extra || {}));
    return { raw: raw, rows: extractCustomerRows(raw) };
  }

  /** @deprecated Settings.SaveCard updates profile fields, not credit cards. */
  async function saveCard(payload) {
    return payInvoice(payload);
  }

  async function createPaymentForm(payload) {
    return payInvoice(payload);
  }

  function dataUrlToFile(dataUrl, fileName) {
    var parts = String(dataUrl || '').split(',');
    if (parts.length < 2) throw new Error('Invalid signature image');
    var mimeMatch = parts[0].match(/:(.*?);/);
    var mime = (mimeMatch && mimeMatch[1]) || 'image/png';
    var binary = atob(parts[1]);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    var name = fileName || 'signature.png';
    try {
      return new File([bytes], name, { type: mime });
    } catch (e) {
      return new Blob([bytes], { type: mime });
    }
  }

  async function uploadSignatureFile(customerId, documentId, dataUrl) {
    var fileName = 'signature-' + documentId + '.png';
    var custId = requireId(customerId, 'customer_id');
    var file = dataUrlToFile(dataUrl, fileName);
    var client = getClient();
    var token = client.getToken && client.getToken();
    if (!token) throw new Error('Bearer token is missing. Login first.');

    // App API only — https://{domain}/app/help/Files.Upload
    // Required: customer_id, file | Optional: file_name, folder, sub_folder
    function buildAppForm() {
      var form = new FormData();
      form.append('customer_id', String(custId));
      form.append('file_name', fileName);
      form.append('folder', 'sign');
      form.append('file', file, fileName);
      return form;
    }

    var endpoints = [DOMAIN + '/app/Files.Upload', DOMAIN + '/app/Files/Upload'];
    var lastErr = null;
    for (var e = 0; e < endpoints.length; e++) {
      var res = await fetch(endpoints[e], {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: buildAppForm()
      });
      var text = await res.text();
      var parsed = null;
      try { parsed = text ? JSON.parse(text) : {}; } catch (errJson) {
        lastErr = new Error('Files.Upload did not return JSON');
        lastErr.response = text;
        continue;
      }
      if (parsed && (Number(parsed.success) === 1 || parsed.success === true || parsed.document_id || parsed.file)) {
        return Object.assign({ route: endpoints[e], folder: 'sign', file_name: fileName }, parsed);
      }
      lastErr = new Error((parsed && (parsed.message || parsed.error)) || 'Files.Upload failed');
      lastErr.raw = parsed;
      lastErr.status = res.status;
      if (!/missing required file|route not found|not found/i.test(String(lastErr.message || ''))) break;
    }
    throw lastErr || new Error('Files.Upload failed');
  }

  async function approveOrderProposal(documentId) {
    var cred = getSavedCredentials();
    if (!cred || !cred.username || !cred.password) {
      throw new Error('Staff credentials required to approve on CRM');
    }
    var docId = requireId(documentId, 'document_id');
    var endpoints = [
      '/api/approve-proposal.php',
      './api/approve-proposal.php'
    ];
    var lastErr = null;
    for (var i = 0; i < endpoints.length; i++) {
      try {
        var res = await fetch(endpoints[i], {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            username: cred.username,
            password: cred.password,
            document_id: docId,
            domain: DOMAIN
          })
        });
        var text = await res.text();
        var data = null;
        try { data = JSON.parse(text); } catch (eParse) { data = null; }
        if (data && (Number(data.success) === 1 || data.success === true)) {
          return { ok: true, raw: data, route: endpoints[i] };
        }
        lastErr = new Error((data && data.message) || ('Approve failed (' + res.status + ')'));
        lastErr.raw = data || text;
      } catch (err) {
        lastErr = err;
      }
    }
    // Fallback: try dashboard directly (works same-origin / environments that expose Set-Cookie).
    try {
      var loginRes = await fetch(DOMAIN + '/dashboard/login/check_login', {
        method: 'POST',
        body: new URLSearchParams({
          email: cred.username,
          password: cred.password,
          email_otp_with: '1'
        }),
        redirect: 'manual'
      });
      var cookies = [];
      if (loginRes.headers && typeof loginRes.headers.getSetCookie === 'function') {
        cookies = loginRes.headers.getSetCookie() || [];
      }
      var cookie = cookies.map(function (c) { return String(c).split(';')[0]; }).filter(Boolean).join('; ');
      if (cookie) {
        var body = new URLSearchParams();
        body.append('order_proposals_id[]', String(docId));
        var approveRes = await fetch(DOMAIN + '/dashboard/home/approve_order_proposals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            Cookie: cookie,
            Referer: DOMAIN + '/dashboard/admin/'
          },
          body: body
        });
        var approveText = await approveRes.text();
        var approveData = null;
        try { approveData = JSON.parse(approveText); } catch (e2) { approveData = null; }
        if (approveData && (Number(approveData.success) === 1 || approveData.success === true)) {
          return { ok: true, raw: approveData, route: 'dashboard/home/approve_order_proposals' };
        }
        lastErr = new Error((approveData && approveData.message) || 'Dashboard approve failed');
      }
    } catch (errDash) {
      lastErr = errDash;
    }
    if (lastErr) throw lastErr;
    throw new Error('CRM approve failed');
  }

  async function submitSignature(payload) {
    payload = payload || {};
    var customerId = requireId(payload.customer_id, 'customer_id');
    var documentId = payload.document_id || payload.id || payload.doc_id;
    if (!documentId) throw new Error('document_id is required');
    var dataUrl = payload.signature_png || payload.signature || '';
    if (!dataUrl) throw new Error('signature image is required');

    var upload = null;
    var uploadError = null;
    try {
      upload = await uploadSignatureFile(customerId, documentId, dataUrl);
    } catch (err) {
      uploadError = err;
    }

    if (!upload) {
      var uploadFail = new Error(
        (uploadError && uploadError.message) || 'Signature image upload failed'
      );
      uploadFail.raw = { upload_error: uploadError && (uploadError.raw || uploadError.message) };
      throw uploadFail;
    }

    var crmApprove = null;
    var crmApproveError = null;
    try {
      crmApprove = await approveOrderProposal(documentId);
    } catch (errApprove) {
      crmApproveError = errApprove;
    }

    var marked = null;
    if (!crmApprove || crmApprove.ok === false) {
      var fail = new Error(
        (crmApproveError && crmApproveError.message) ||
        'CRM status was not updated to Approved. Use php -S and keep /api/approve-proposal.php available.'
      );
      fail.raw = {
        upload: upload,
        upload_error: uploadError && uploadError.message,
        approve_error: crmApproveError && crmApproveError.message
      };
      throw fail;
    }
    marked = await markDocumentInNotes(customerId, documentId, SIGNED_DOCS_MARKER);
    return {
      ok: true,
      route: 'approveOrderProposal',
      raw: { upload: upload, approve: crmApprove },
      marked: marked,
      uploadSkipped: false,
      crmApproved: true
    };
  }

  var api = {
    DOMAIN: DOMAIN,
    getTenantUser: getTenantUser,
    getDomain: function () { return DOMAIN; },
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
    countCustomers: countCustomers,
    listProducts: listProducts,
    countProducts: countProducts,
    getProduct: getProduct,
    updateProduct: updateProduct,
    updateProductStock: updateProductStock,
    openStockBridgeWindow: openStockBridgeWindow,
    listMissions: listMissions,
    countMissions: countMissions,
    createMission: createMission,
    getMission: getMission,
    updateMission: updateMission,
    doneMission: doneMission,
    getCustomer: getCustomer,
    getTicket: getTicket,
    listDocuments: listDocuments,
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
    MISSION_EVENT_KEYS: MISSION_EVENT_KEYS,
    DOCUMENT_EVENT_KEYS: DOCUMENT_EVENT_KEYS,
    realtimeCustomerId: realtimeCustomerId,
    getPortalCustomerId: getPortalCustomerId,
    setPortalCustomerId: setPortalCustomerId,
    getPortalPhone: getPortalPhone,
    setPortalPhone: setPortalPhone,
    normalizePhone: normalizePhone,
    detectLoginIdentifier: detectLoginIdentifier,
    findCustomerByPhone: findCustomerByPhone,
    parseDocuments: parseDocuments,
    listCustomerDocuments: listCustomerDocuments,
    listPaymentForms: listPaymentForms,
    saveCard: saveCard,
    createPaymentForm: createPaymentForm,
    payInvoice: payInvoice,
    approveOrderProposal: approveOrderProposal,
    submitSignature: submitSignature
  };

  global.Biz1App = api;
  // Back-compat alias for existing UI code
  global.MineralBarApp = api;
})(typeof window !== 'undefined' ? window : globalThis);
