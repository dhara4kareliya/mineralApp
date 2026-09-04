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
      events: ['chat.message.received', 'whatsapp.message.received', 'whatsapp.inbox.refresh', 'mission.reminder', 'teamops.task.updated', 'products.created', 'products.updated', 'products.deleted']
    },
    'הודעות / צ׳אט Inbox': { routes: ['Chat.Inbox', 'Chat.Conversations', 'Chat.CustomerMessages'], status: 'live' },
    'שעון נוכחות': { routes: ['WorkingTime.List', 'WorkingTime.StartStop', 'WorkingTime.Save'], status: 'partial' },
    'מלאי': { routes: ['Products.List', 'Products.Count', 'Products.Get', 'Products.Update'], status: 'live' },
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

  async function login(opts) {
    opts = opts || {};
    var password = opts.password;
    var otp = opts.otp || '';
    var remember = opts.remember;
    var identityField = null;
    var identityValue = '';
    var fields = ['email', 'username', 'phone', 'id'];
    for (var i = 0; i < fields.length; i++) {
      var key = fields[i];
      if (opts[key] != null && String(opts[key]).trim() !== '') {
        identityField = key;
        identityValue = String(opts[key]).trim();
        break;
      }
    }
    if (!identityField && opts.user != null && String(opts.user).trim() !== '') {
      identityField = 'username';
      identityValue = String(opts.user).trim();
    }

    var client = getClient();
    var data;
    var body = { password: password, otp: otp };
    if (identityField) body[identityField] = identityValue;

    try {
      // Send the detected identifier field as-is (email/username/phone/id).
      // SDK login() always remaps to username, so call the Login route directly.
      data = await client.request('Login', body, { public: true });
      if (data && data.token) client.setToken(data.token);
    } catch (err) {
      if (err && err.raw && (err.raw.otp_required || err.raw.otpRequired)) {
        return {
          ok: false,
          otpRequired: true,
          raw: err.raw
        };
      }
      throw err;
    }

    if (data && (data.otp_required || data.otpRequired)) {
      return {
        ok: false,
        otpRequired: true,
        raw: data
      };
    }

    if (!data || !data.token) {
      var loginErr = new Error((data && data.message) || 'Login failed');
      loginErr.status = data && (data.status || data.statusCode);
      loginErr.raw = data || {};
      throw loginErr;
    }

    var userBasic = await client.account.basic();
    var role = detectRole(identityValue, userBasic);
    try {
      var loginUser = (userBasic.data && userBasic.data.user) || userBasic.user || {};
      if (loginUser.user_domain || loginUser.user_name) {
        rememberDashboardOrigin(loginUser.user_domain || loginUser.user_name);
      }
    } catch (e0) { /* ignore */ }
    saveSession(userBasic, role, identityValue, {
      expiresAt: data.expires_at || data.expiresAt || null
    });
    // Always keep password in sessionStorage for mid-session token refresh.
    // Persist to localStorage when "זכור אותי" is checked (or already was).
    var rememberFlag = remember;
    if (rememberFlag == null) {
      rememberFlag = global.localStorage.getItem(REMEMBER_KEY) === '1';
    }
    saveCredentials(identityValue, password, !!rememberFlag);

    // Realtime is started from the inventory screen (single connect path).
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
   * Products.List — fetch one server-side page (≤25 rows).
   * Returns { rows, total, raw, countRaw }.
   */
  async function listProducts(extra) {
    var client = getClient();
    var options = extra || {};
    var pageSize = Number(options.pageSize || options.length || options.limit || 25);
    if (!pageSize || pageSize > 25) pageSize = 25;
    var start = Number(options.start != null ? options.start : (options.offset != null ? options.offset : 0));
    if (!Number.isFinite(start) || start < 0) start = 0;
    start = Math.floor(start);
    var request = Object.assign({}, options, {
      length: pageSize,
      limit: pageSize,
      draw: options.draw || 1,
      start: start,
      offset: start
    });
    delete request.pageSize;

    var raw = await client.products.list(request);
    var rows = extractProductRows(raw);
    var total = extractProductTotal(raw, rows);
    return { rows: rows, total: total, raw: raw, countRaw: null };
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

  function unwrapProductRow(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var queue = [raw];
    var hops = 0;
    while (queue.length && hops < 8) {
      var cur = queue.shift();
      hops++;
      if (!cur || typeof cur !== 'object') continue;
      if (Array.isArray(cur)) {
        if (cur[0]) queue.push(cur[0]);
        continue;
      }
      if (
        cur.storage_detail != null ||
        cur.storage_id != null ||
        cur.left_stock != null ||
        cur.product_name != null ||
        cur.product_sku != null ||
        (cur.id != null && (cur.stock != null || cur.sku != null || cur.barcode != null))
      ) {
        return cur;
      }
      ['data', 'row', 'product', 'item', 'result'].forEach(function (key) {
        if (cur[key] && typeof cur[key] === 'object') queue.push(cur[key]);
      });
    }
    if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) return raw.data;
    return raw;
  }

  async function getProduct(id, extra) {
    var client = getClient();
    var raw = await client.products.get(id, extra || {});
    return { row: unwrapProductRow(raw), raw: raw };
  }

  function readProductQty(row) {
    if (!row || typeof row !== 'object') return NaN;
    var keys = ['stock', 'left_stock', 'qty', 'quantity', 'in_stock', 'product_qty', 'units', 'qnt'];
    var i;
    for (i = 0; i < keys.length; i++) {
      if (row[keys[i]] == null || row[keys[i]] === '') continue;
      var n = Number(row[keys[i]]);
      if (!Number.isNaN(n)) return n;
    }
    return NaN;
  }

  /**
   * Products.Update — product edit route used for name/price/sku and stock qty.
   */
  async function updateProduct(id, data) {
    var client = getClient();
    var src = data || {};
    var allowed = [
      'product_name', 'product_price', 'price', 'description', 'sku', 'status', 'endless',
      'stock', 'left_stock', 'qty', 'quantity', 'product_qty', 'in_stock'
    ];
    var payload = {};
    allowed.forEach(function (key) {
      if (src[key] != null && src[key] !== '') payload[key] = src[key];
      else if (src[key] === 0 || src[key] === '0') payload[key] = src[key];
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
    return { raw: raw, id: (raw && raw.id) || id, payload: payload };
  }

  async function verifyProductQty(productId, target, tries) {
    var attempt;
    var live = NaN;
    for (attempt = 0; attempt < (tries || 5); attempt++) {
      try {
        var check = await getProduct(productId);
        live = readProductQty(check && check.row);
        if (!Number.isNaN(live) && live === target) {
          return { ok: true, qty: live, row: check.row };
        }
      } catch (e) { /* retry */ }
      await sleep(700);
    }
    return { ok: false, qty: live };
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

  function collectStorageIds(value, out) {
    if (value == null || value === '' || value === false) return;
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      out.push(String(Math.round(value)));
      return;
    }
    if (typeof value === 'string') {
      var text = value.trim();
      if (!text) return;
      if (/^\d+$/.test(text)) {
        out.push(text);
        return;
      }
      if (text.charAt(0) === '[' || text.charAt(0) === '{') {
        try {
          collectStorageIds(JSON.parse(text), out);
          return;
        } catch (e) { /* fall through to split */ }
      }
      text.split(/[,|;]/).forEach(function (part) {
        part = String(part || '').trim();
        if (/^\d+$/.test(part)) out.push(part);
      });
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(function (item) { collectStorageIds(item, out); });
      return;
    }
    if (typeof value === 'object') {
      ['id', 'storage_id', 'storageId', 'warehouse_id', 'warehouseId', 'storage_inner_id'].forEach(function (key) {
        if (value[key] != null && value[key] !== '') collectStorageIds(value[key], out);
      });
      Object.keys(value).forEach(function (key) {
        if (/^\d+$/.test(key)) out.push(key);
      });
    }
  }

  function parseStorageIds(row) {
    if (!row) return [];
    var out = [];
    [
      row.storage_detail,
      row.storage_ids,
      row.storage_id,
      row.storageId,
      row.warehouse_id,
      row.warehouseId,
      row.storage_inner_id,
      row.storage,
      row.warehouse,
      row.storages,
      row.warehouses,
      row.storage_inner
    ].forEach(function (field) {
      collectStorageIds(field, out);
    });
    var seen = {};
    return out.filter(function (id) {
      if (!id || id === '0' || seen[id]) return false;
      seen[id] = true;
      return true;
    });
  }

  async function updateProductStockViaBridge(productId, target, storageId) {
    var cred = getSavedCredentials();
    if (!cred || !cred.username || !cred.password) {
      var credErr = new Error('Missing saved password for stock sync. Please log in again.');
      credErr.route = 'stock.bridge';
      throw credErr;
    }

    var dashOrigin = dashboardOriginFromUserBasic();
    ensureStockBridgeFrame();
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

    var verified = await verifyProductQty(productId, target, 5);
    if (!verified.ok) {
      var syncErr = new Error('Biz1 stock did not update. Please try again.');
      syncErr.route = 'stock.bridge';
      syncErr.qty = verified.qty;
      throw syncErr;
    }
    return {
      qty: verified.qty,
      storageId: storageId,
      dashboard: dashOrigin,
      via: 'storage.bridge',
      raw: { ok: true, qty: verified.qty, storageId: storageId }
    };
  }

  /**
   * Write product stock through Products.Update (product edit API).
   * Warehouse iframe is only a fallback when a storage record actually exists.
   */
  async function updateProductStock(productId, qty, cachedRow) {
    var target = Math.max(0, Math.round(Number(qty)));
    if (Number.isNaN(target)) {
      throw new Error('Invalid qty');
    }

    var got = null;
    try {
      got = await getProduct(productId);
    } catch (e) {
      console.warn('[Biz1Demo] Products.Get before stock update failed', e);
    }
    var row = (got && got.row) || cachedRow || null;

    var payload = {
      stock: target,
      left_stock: target,
      qty: target,
      quantity: target,
      product_qty: target
    };
    if (row) {
      if (row.product_name) payload.product_name = row.product_name;
      else if (row.name) payload.product_name = row.name;
      if (row.sku) payload.sku = row.sku;
      else if (row.product_sku) payload.sku = row.product_sku;
    }

    var updated = null;
    var updateErr = null;
    try {
      updated = await updateProduct(productId, payload);
      console.info('[Biz1Demo] Products.Update stock', productId, payload, updated && updated.raw);
    } catch (err) {
      updateErr = err;
      console.warn('[Biz1Demo] Products.Update stock failed, retrying minimal payload', err);
      try {
        updated = await updateProduct(productId, {
          stock: target,
          left_stock: target,
          product_name: payload.product_name
        });
        updateErr = null;
      } catch (err2) {
        updateErr = err2;
        console.warn('[Biz1Demo] Products.Update stock retry failed', err2);
      }
    }

    var verified = await verifyProductQty(productId, target, updated ? 5 : 1);
    if (verified.ok) {
      return {
        qty: verified.qty,
        via: 'Products.Update',
        raw: (updated && updated.raw) || verified.row
      };
    }

    var storageIds = parseStorageIds(row);
    if (!storageIds.length && cachedRow) storageIds = parseStorageIds(cachedRow);
    if (storageIds.length) {
      console.warn('[Biz1Demo] Products.Update did not persist stock — trying warehouse bridge', storageIds[0]);
      return updateProductStockViaBridge(productId, target, storageIds[0]);
    }

    var msg = (updateErr && updateErr.message)
      ? updateErr.message
      : 'Biz1 stock did not update. Please try again.';
    var syncErr = new Error(msg);
    syncErr.route = 'Products.Update';
    syncErr.qty = verified.qty;
    syncErr.raw = updateErr && updateErr.raw;
    throw syncErr;
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
    if (PRODUCT_EVENT_KEYS[key] || /product|stock|inventory|warehouse/i.test(key)) return 'products';
    if (/lead|crm/i.test(key)) return 'leads';
    return 'other';
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

  function patchRealtimeDedup(client) {
    if (!client || !client.realtime || client.realtime.__biz1DemoDedupPatched) return;
    var orig = client.realtime.setLastEventId.bind(client.realtime);
    client.realtime.setLastEventId = function (eventId) {
      if (eventId == null || eventId === '' || eventId === 0) return true;
      if (Number.isNaN(Number(eventId))) return true;
      return orig(eventId);
    };
    client.realtime.__biz1DemoDedupPatched = true;
  }

  function wireRealtimeHandlers(client) {
    if (realtimeHandlersWired) return;
    realtimeHandlersWired = true;
    patchRealtimeDedup(client);

    client.realtime.on('biz1:ready', function (payload) {
      realtimeState.ready = payload || null;
      realtimeState.registered = (payload && Array.isArray(payload.events)) ? payload.events.slice() : [];
      realtimeState.error = null;
      setRealtimeStatus('ready');
      var productKeys = realtimeState.registered.filter(function (k) { return classifyRealtimeEvent({ key: k }) === 'products'; });
      console.info('[Biz1Demo] realtime ready', {
        registered: realtimeState.registered.slice(),
        products: productKeys
      });
      if (!productKeys.length) {
        console.warn('[Biz1Demo] socket is live but Biz1 did not subscribe any product/stock events');
      }
      // Registration is automatic via bearer auth — ready.events is the subscribed catalog.
      dispatchAppEvent('biz1demo:socket', {
        type: 'ready',
        payload: payload,
        registered: realtimeState.registered,
        messages: realtimeState.registered.filter(function (k) { return classifyRealtimeEvent({ key: k }) === 'messages'; }),
        missions: realtimeState.registered.filter(function (k) { return classifyRealtimeEvent({ key: k }) === 'missions'; }),
        products: productKeys
      });
    });

    client.realtime.on('*', function (event) {
      var group = classifyRealtimeEvent(event);
      var detail = { group: group, key: event && event.key, event: event };
      dispatchAppEvent('biz1demo:realtime', detail);
      if (group === 'messages') dispatchAppEvent('biz1demo:messages', detail);
      if (group === 'missions') dispatchAppEvent('biz1demo:missions', detail);
      if (group === 'products') dispatchAppEvent('biz1demo:products', detail);
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
        setRealtimeStatus('error', msg);
        dispatchAppEvent('biz1demo:socket', { type: 'error', error: msg });
      });
      socket.on('disconnect', function (reason) {
        realtimeState.ready = null;
        realtimeState.registered = [];
        if (realtimeState.status !== 'error') {
          setRealtimeStatus('offline');
        } else {
          setRealtimeStatus('error');
        }
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
    if (realtimeState.status !== 'error') {
      setRealtimeStatus('offline');
    } else {
      setRealtimeStatus('error');
    }
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
    MISSION_EVENT_KEYS: MISSION_EVENT_KEYS
  };

  global.Biz1App = api;
  // Back-compat alias for existing UI code
  global.MineralBarApp = api;
})(typeof window !== 'undefined' ? window : globalThis);
