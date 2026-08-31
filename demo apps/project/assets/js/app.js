/** Biz1 Showcase — Projects demo */
(function (root, factory) {
  if (root.Biz1SDK && root.Biz1SDK.Biz1Client) return;
  root.Biz1SDK = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';
  var TOKEN_KEY = 'biz1_sdk_bearer_token';

  function Biz1ApiError(message, detail) {
    this.name = 'Biz1ApiError';
    this.message = message || 'Biz1 API request failed';
    this.status = detail && detail.status;
    this.route = detail && detail.route;
    this.raw = detail && detail.raw;
    this.response = detail && detail.response;
  }
  Biz1ApiError.prototype = Object.create(Error.prototype);
  Biz1ApiError.prototype.constructor = Biz1ApiError;

  function defaultStorage() {
    try { if (typeof localStorage !== 'undefined') return localStorage; } catch (e) { /* ignore */ }
    var data = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
      setItem: function (k, v) { data[k] = String(v); },
      removeItem: function (k) { delete data[k]; }
    };
  }

  function pad2(v) { return String(v).padStart(2, '0'); }
  function formatUtcDateTime(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return [date.getUTCFullYear(), pad2(date.getUTCMonth() + 1), pad2(date.getUTCDate())].join('-') +
      ' ' + [pad2(date.getUTCHours()), pad2(date.getUTCMinutes()), pad2(date.getUTCSeconds())].join(':');
  }
  function isDateField(key) {
    var name = String(key || '').toLowerCase();
    return /(^|_)(date|datetime|time|followup|due)(_|$)/.test(name)
      || ['from', 'to', 'start', 'stop', 'created_at', 'updated_at', 'last_update', 'last_updated'].indexOf(name) !== -1;
  }
  function localDateStringToDate(value) {
    var full = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (!full) return null;
    return new Date(Number(full[1]), Number(full[2]) - 1, Number(full[3]), Number(full[4] || 0), Number(full[5] || 0), Number(full[6] || 0));
  }
  function normalizeDateInput(key, value) {
    if (value instanceof Date) return formatUtcDateTime(value);
    if (!isDateField(key) || typeof value !== 'string') return value;
    var text = value.trim();
    if (!text) return value;
    var localDate = localDateStringToDate(text);
    if (localDate) return formatUtcDateTime(localDate);
    var parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? value : formatUtcDateTime(parsed);
  }
  function appendBody(body, key, value) {
    if (value === undefined || value === null) return;
    value = normalizeDateInput(key, value);
    if (Array.isArray(value)) { value.forEach(function (item) { body.append(key, normalizeDateInput(key, item)); }); return; }
    if (value instanceof Date) { body.append(key, formatUtcDateTime(value)); return; }
    if (typeof value === 'object') { body.append(key, JSON.stringify(value)); return; }
    body.append(key, String(value));
  }
  function toBody(data) {
    if (!data) return new URLSearchParams();
    if (typeof FormData !== 'undefined' && data instanceof FormData) return data;
    if (data instanceof URLSearchParams) return data;
    var body = new URLSearchParams();
    Object.keys(data).forEach(function (key) { appendBody(body, key, data[key]); });
    return body;
  }
  function listRows(raw) {
    if (!raw || typeof raw !== 'object') return [];
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.rows)) return raw.rows;
    if (Array.isArray(raw.projects)) return raw.projects;
    if (Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw.records)) return raw.records;
    if (Array.isArray(raw.output)) return raw.output;
    if (Array.isArray(raw.list)) return raw.list;
    return [];
  }
  function listTotal(raw, rows) {
    if (!raw || typeof raw !== 'object') return rows.length;
    var keys = ['count', 'total', 'recordsFiltered', 'recordsTotal', 'totalrecords', 'totalRecords'];
    for (var i = 0; i < keys.length; i += 1) {
      var value = raw[keys[i]];
      if (value !== undefined && value !== null && value !== '' && !Number.isNaN(Number(value))) return Number(value);
    }
    return rows.length;
  }
  function capListInput(input) {
    var body = Object.assign({}, input || {});
    ['limit', 'length', 'per_page'].forEach(function (key) {
      if (body[key] === undefined || body[key] === null || body[key] === '') return;
      var value = Number(body[key]);
      body[key] = String(!value || value > 25 ? 25 : value);
    });
    if (body.draw === undefined) body.draw = '1';
    return body;
  }

  function Biz1Client(options) {
    options = options || {};
    this.domain = String(options.domain || '').replace(/\/+$/, '');
    this.appPath = '/app';
    this.storage = options.storage || defaultStorage();
    this.fetch = options.fetch || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
    if (!this.domain) throw new Error('Biz1 SDK requires domain');
    if (!this.fetch) throw new Error('Biz1 SDK requires fetch support.');
  }
  Biz1Client.prototype.getToken = function () { return this.storage.getItem(TOKEN_KEY) || ''; };
  Biz1Client.prototype.setToken = function (token) {
    if (token) this.storage.setItem(TOKEN_KEY, token);
    else this.storage.removeItem(TOKEN_KEY);
  };
  Biz1Client.prototype.login = async function (credentials) {
    credentials = credentials || {};
    var body = { password: credentials.password || '', otp: String(credentials.otp || '').trim() };
    if (credentials.email) body.email = credentials.email;
    else if (credentials.id !== undefined && credentials.id !== null && String(credentials.id).trim() !== '') body.id = credentials.id;
    else if (credentials.phone) body.phone = credentials.phone;
    else if (credentials.username || credentials.user) body.username = credentials.username || credentials.user;
    var data = await this.request('Login', body, { public: true });
    var otpRequired = data && (data.otp_required === true || data.otp_required === 1 || data.otp_required === 'true' || data.otp_required === '1' ||
      data.otpRequired === true || data.otpRequired === 1 || data.otpRequired === 'true' || data.otpRequired === '1');
    if (data && data.token && !otpRequired) this.setToken(data.token);
    return data;
  };
  Biz1Client.prototype.logout = function () { this.setToken(''); };
  Biz1Client.prototype.request = async function (route, data, options) {
    options = options || {};
    if (!route) throw new Error('route is required');
    var headers = Object.assign({}, options.headers || {});
    if (!options.public) {
      var token = options.token || this.getToken();
      if (!token) throw new Biz1ApiError('Bearer token is missing. Login first.', { route: route, status: 401 });
      headers.Authorization = 'Bearer ' + token;
    }
    var res = await this.fetch(this.domain + this.appPath + '/' + route, { method: 'POST', headers: headers, body: toBody(data) });
    var text = await res.text();
    var json;
    try { json = text ? JSON.parse(text) : {}; }
    catch (e) { throw new Biz1ApiError('Biz1 route did not return JSON.', { route: route, status: res.status, response: text }); }
    var failed = !res.ok || json.success === 0 || json.success === '0' || json.ok === false;
    if (failed && options.throwOnError !== false) {
      if (res.status === 401) this.setToken('');
      throw new Biz1ApiError(json.message || json.error || 'Biz1 API request failed', { route: route, status: res.status, raw: json });
    }
    return json;
  };
  Biz1Client.prototype.list = async function (route, filters) {
    var raw = await this.request(route, capListInput(filters || {}));
    var rows = listRows(raw);
    return { rows: rows, total: listTotal(raw, rows), raw: raw };
  };
  Biz1Client.prototype.count = async function (route, filters) {
    var raw = await this.request(route, capListInput(filters || {}));
    return { count: Number(raw.count || raw.total || raw.recordsFiltered || raw.recordsTotal || 0), raw: raw };
  };

  return { Biz1Client: Biz1Client, Biz1ApiError: Biz1ApiError, createClient: function (o) { return new Biz1Client(o); } };
});

/* ===== Socket.IO realtime client (same /realtime/socket.io as ticket demo) ===== */
(function (global) {
  'use strict';
  var DEFAULT_SOCKET_PATH = '/realtime/socket.io';
  var LAST_EVENT_ID_KEY = 'biz1_realtime_last_event_id';
  var DEVICE_ID_KEY = 'biz1_realtime_device_id';

  function Biz1RealtimeClient(client, options) {
    options = options || {};
    this.client = client;
    this.path = options.path || DEFAULT_SOCKET_PATH;
    this.platform = options.platform || 'web';
    this.io = options.io || null;
    this.socket = null;
    this.handlers = {};
    this.storage = client.storage || (typeof localStorage !== 'undefined' ? localStorage : { getItem: function () { return ''; }, setItem: function () {}, removeItem: function () {} });
  }

  Biz1RealtimeClient.prototype.deviceId = function () {
    var existing = this.storage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    var id = this.platform + '-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    this.storage.setItem(DEVICE_ID_KEY, id);
    return id;
  };
  Biz1RealtimeClient.prototype.lastEventId = function () {
    return Number(this.storage.getItem(LAST_EVENT_ID_KEY) || 0);
  };
  Biz1RealtimeClient.prototype.setLastEventId = function (eventId) {
    if (eventId == null || eventId === '') return false;
    var next = Number(eventId);
    var prev = this.lastEventId();
    if (!isFinite(next)) {
      var prevRaw = String(this.storage.getItem(LAST_EVENT_ID_KEY) || '');
      if (String(eventId) === prevRaw) return false;
      this.storage.setItem(LAST_EVENT_ID_KEY, String(eventId));
      return true;
    }
    if (next <= prev) return false;
    this.storage.setItem(LAST_EVENT_ID_KEY, String(next));
    return true;
  };
  Biz1RealtimeClient.prototype.resolveIo = function () {
    if (this.io) return this.io;
    if (typeof globalThis !== 'undefined' && globalThis.io) return globalThis.io;
    throw new Error('Socket.IO client is required. Load socket.io-client first.');
  };
  Biz1RealtimeClient.prototype.connect = function (options) {
    options = options || {};
    var token = options.token || this.client.getToken();
    if (!token) throw new Error('Realtime connect requires a bearer token. Login first.');
    if (this.socket) this.socket.disconnect();
    var io = this.resolveIo();
    var self = this;
    this.socket = io(this.client.domain, {
      transports: ['websocket', 'polling'],
      path: options.path || this.path,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      auth: {
        bearer: token,
        deviceId: options.deviceId || this.deviceId(),
        platform: options.platform || this.platform,
        fcmToken: options.fcmToken || '',
        lastEventId: this.lastEventId()
      }
    });
    this.socket.on('biz1:event', function (event) {
      if (!self.setLastEventId(event && event.id)) return;
      self.emitLocal(event && event.key, event);
      self.emitLocal('*', event);
      self.socket.emit('realtime:ack', { eventId: event.id });
    });
    this.socket.on('biz1:ready', function (payload) { self.emitLocal('biz1:ready', payload); });
    this.socket.on('rooms:refresh', function (event) { self.emitLocal('rooms:refresh', event); });
    return this.socket;
  };
  Biz1RealtimeClient.prototype.on = function (eventKey, handler) {
    if (!this.handlers[eventKey]) this.handlers[eventKey] = [];
    this.handlers[eventKey].push(handler);
    var self = this;
    return function off() {
      self.handlers[eventKey] = (self.handlers[eventKey] || []).filter(function (fn) { return fn !== handler; });
    };
  };
  Biz1RealtimeClient.prototype.emitLocal = function (eventKey, payload) {
    (this.handlers[eventKey] || []).slice().forEach(function (handler) { handler(payload); });
  };
  Biz1RealtimeClient.prototype.disconnect = function () {
    if (this.socket) this.socket.disconnect();
    this.socket = null;
  };

  function attachRealtime(client, options) {
    if (!client) return null;
    if (client.realtime && typeof client.realtime.connect === 'function') return client.realtime;
    var Ctor = (global.Biz1SDK && global.Biz1SDK.Biz1RealtimeClient) || Biz1RealtimeClient;
    client.realtime = new Ctor(client, options || {});
    return client.realtime;
  }

  global.Biz1SDK = global.Biz1SDK || {};
  if (!global.Biz1SDK.Biz1RealtimeClient) global.Biz1SDK.Biz1RealtimeClient = Biz1RealtimeClient;
  global.Biz1SDK.attachRealtime = attachRealtime;
})(typeof window !== 'undefined' ? window : globalThis);

/* ===== Auth / session ===== */
(function (global) {
  'use strict';

  function normalizeTenantUser(raw) {
    var s = String(raw == null ? '' : raw).trim().toLowerCase();
    s = s.replace(/^https?:\/\//, '').replace(/\.bull36\.com.*$/i, '').split('/')[0].replace(/[^a-z0-9-]/g, '');
    return s;
  }
  function resolveDomain() {
    var cfg = global.Biz1Config || {};
    var user = normalizeTenantUser(cfg.user || cfg.tenant || cfg.account);
    if (!user) throw new Error('Set Biz1Config.user in assets/config.js (Bull36 subdomain)');
    return 'https://' + user + '.bull36.com';
  }
  function getBrandName(lang) {
    var cfg = global.Biz1Config || {};
    var brand = cfg.brand || {};
    lang = lang || 'en';
    return brand[lang] || brand.en || brand.he || 'Biz1 Showcase';
  }

  var DOMAIN = resolveDomain();
  var USER_KEY = 'biz1proj_user_basic';
  var ROLE_KEY = 'biz1proj_role';
  var EMAIL_KEY = 'biz1fs_email';
  var REMEMBER_KEY = 'biz1fs_remember';
  var CRED_KEY = 'biz1fs_cred';
  var SESSION_PASS_KEY = 'biz1fs_session_pass';
  var EXPIRES_KEY = 'biz1proj_token_expires_at';
  var DASH_HOST_KEY = 'biz1proj_dash_host';

  function getClient() {
    if (!global.Biz1SDK || !global.Biz1SDK.Biz1Client) {
      throw new Error('Biz1 SDK not loaded. Include ' + DOMAIN + '/app/sdk/biz1-sdk.js');
    }
    if (!global.__biz1ProjClient) {
      global.__biz1ProjClient = new global.Biz1SDK.Biz1Client({ domain: DOMAIN, storage: global.localStorage });
      installAuthInterceptor(global.__biz1ProjClient);
    }
    if (global.Biz1SDK && typeof global.Biz1SDK.attachRealtime === 'function') {
      global.Biz1SDK.attachRealtime(global.__biz1ProjClient);
    }
    return global.__biz1ProjClient;
  }

  function encodeCred(obj) {
    try { return global.btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); } catch (e) { return ''; }
  }
  function decodeCred(raw) {
    try { return JSON.parse(decodeURIComponent(escape(global.atob(raw)))); } catch (e) { return null; }
  }
  function saveCredentials(username, password, remember) {
    try {
      if (username) global.localStorage.setItem(EMAIL_KEY, username);
      if (password && global.sessionStorage) global.sessionStorage.setItem(SESSION_PASS_KEY, password);
      if (remember) {
        global.localStorage.setItem(REMEMBER_KEY, '1');
        global.localStorage.setItem(CRED_KEY, encodeCred({ username: username, password: password }));
      } else {
        global.localStorage.removeItem(REMEMBER_KEY);
        global.localStorage.removeItem(CRED_KEY);
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
        if (cred && cred.username && cred.password) return { username: cred.username, password: cred.password, source: 'remember' };
      }
    } catch (e) { /* ignore */ }
    return null;
  }
  function canAutoRefresh() { return !!getSavedCredentials(); }

  function decodeBearerPayload(token) {
    try {
      var parts = String(token || '').split('.');
      if (parts.length < 2) return null;
      var b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      return JSON.parse(atob(b64));
    } catch (e) { return null; }
  }
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
    } catch (e) { return false; }
  }
  function isAuthExpiredError(err) {
    if (!err) return false;
    var status = err.status != null ? Number(err.status) : null;
    if (status === 401 || status === 302) return true;
    var raw = err.raw || {};
    if (Number(raw.status) === 401 || Number(raw.status) === 302) return true;
    var msg = String(err.message || raw.message || raw.error || '').toLowerCase();
    return /bearer token is missing|unauthorized|פג תוקף|status 302|401|invalid.?token|user not found/.test(msg);
  }

  var refreshPromise = null;
  async function refreshSession(options) {
    options = options || {};
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async function () {
      var cred = getSavedCredentials();
      if (!cred) {
        var e = new Error('No saved credentials');
        e.code = 'NO_SAVED_CREDENTIALS';
        throw e;
      }
      var result = await login({ username: cred.username, password: cred.password, otp: options.otp || '' });
      if (result && result.otpRequired) {
        var e2 = new Error(result.message || 'OTP required');
        e2.code = 'OTP_REQUIRED';
        e2.otpRequired = true;
        throw e2;
      }
      if (!result || !result.ok) throw new Error('Session refresh failed');
      var remember = global.localStorage.getItem(REMEMBER_KEY) === '1' || cred.source === 'remember';
      saveCredentials(cred.username, cred.password, remember);
      return result;
    })();
    try { return await refreshPromise; } finally { refreshPromise = null; }
  }

  function installAuthInterceptor(client) {
    if (!client || client.__projAuthWrapped) return;
    client.__projAuthWrapped = true;
    var original = client.request.bind(client);
    client.request = async function (route, data, options) {
      options = options || {};
      try { return await original(route, data, options); }
      catch (err) {
        if (options.skipAuthRefresh || options.public || !isAuthExpiredError(err)) throw err;
        if (String(route) === 'Login') throw err;
        try { await refreshSession(); }
        catch (refreshErr) {
          try { clearSession({ keepEmail: true }); } catch (e) { /* ignore */ }
          redirectToLogin();
          throw refreshErr;
        }
        return original(route, data, Object.assign({}, options, { skipAuthRefresh: true }));
      }
    };
  }

  function redirectToLogin(loginPage) {
    var target = loginPage || 'index.html#login';
    var here = ((global.location && global.location.pathname) || '') + ((global.location && global.location.hash) || '');
    if (here.indexOf('login') !== -1) return;
    if (global.location) global.location.href = target;
  }

  function saveSession(userBasic, role, email, meta) {
    try {
      global.localStorage.setItem(USER_KEY, JSON.stringify(userBasic || {}));
      global.localStorage.setItem(ROLE_KEY, role || 'sales');
      if (email) global.localStorage.setItem(EMAIL_KEY, email);
      if (meta && (meta.expiresAt || meta.expires_at)) {
        global.localStorage.setItem(EXPIRES_KEY, String(meta.expiresAt || meta.expires_at));
      }
    } catch (e) { /* ignore */ }
  }
  async function clearSession(options) {
    options = options || {};
    try {
      global.localStorage.removeItem(USER_KEY);
      global.localStorage.removeItem(ROLE_KEY);
      global.localStorage.removeItem(EXPIRES_KEY);
      global.localStorage.removeItem('biz1_realtime_last_event_id');
      if (!options.keepRemember) {
        global.localStorage.removeItem(CRED_KEY);
        global.localStorage.removeItem(REMEMBER_KEY);
        if (!options.keepEmail) global.localStorage.removeItem(EMAIL_KEY);
      }
      if (global.sessionStorage) global.sessionStorage.removeItem(SESSION_PASS_KEY);
      global.localStorage.removeItem(DASH_HOST_KEY);
    } catch (e) { /* ignore */ }
    try { disconnectRealtime(); } catch (rtErr) { /* ignore */ }
    try { getClient().logout(); } catch (e2) { /* ignore */ }
    try {
      dispatchAppEvent('mineralbar:session-cleared', {});
    } catch (e4) { /* ignore */ }
    try {
      await fetch('dash-bridge.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });
    } catch (e3) { /* ignore */ }
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
  function getRole() { return global.localStorage.getItem(ROLE_KEY) || ''; }
  function getEmail() { return global.localStorage.getItem(EMAIL_KEY) || ''; }
  function getUserBasic() {
    try { return JSON.parse(global.localStorage.getItem(USER_KEY) || 'null'); } catch (e) { return null; }
  }
  function getUser() {
    var basic = getUserBasic();
    if (!basic) return null;
    return (basic.data && basic.data.user) || basic.user || null;
  }
  function getTeamMembers() {
    var basic = getUserBasic();
    var team = (basic && basic.data && basic.data.team_members) ||
      (basic && basic.team_members) || [];
    return Array.isArray(team) ? team : [];
  }
  function truthyFlag(v) { return v === 1 || v === '1' || v === true || v === 'true'; }
  function isLoginRateLimited(data) {
    if (!data || typeof data !== 'object') return false;
    var msg = String(data.message || '').toLowerCase();
    return /too many (?:login )?attempts/.test(msg) ||
      Number(data.retry_after || data.retryAfter || data.wait_seconds || data.waitSeconds || 0) > 0 ||
      Number(data.status || 0) === 429;
  }
  function loginRateLimitMessage(data) {
    var sec = Number((data && (data.retry_after || data.retryAfter || data.wait_seconds || data.waitSeconds)) || 0);
    var base = (data && data.message) || 'Too many login attempts. Please wait and try again.';
    if (sec > 0 && base.indexOf(String(sec)) === -1) return base + ' (' + sec + 's)';
    return base;
  }
  function isInvalidOtpAttempt(data, otpVal) {
    if (!(otpVal || '').trim() || !data) return false;
    if (truthyFlag(data.otp_required) || truthyFlag(data.otpRequired)) return true;
    if (!data.token) return true;
    if (data.success === 0 || data.success === '0') return true;
    return false;
  }
  function detectLoginIdentifier(raw) {
    var v = String(raw == null ? '' : raw).trim();
    if (!v) return { username: '' };
    if (v.indexOf('@') !== -1) return { email: v };
    var compact = v.replace(/[\s\-().]/g, '');
    if (/^\+/.test(compact) || /^0\d{8,14}$/.test(compact)) return { phone: v };
    var digits = compact.replace(/\D/g, '');
    if (/^[\d\s\-()+]+$/.test(v) && !/^\d+$/.test(v) && digits.length >= 9) return { phone: v };
    if (/^\d+$/.test(v)) return { id: v };
    return { username: v };
  }

  async function login(opts) {
    var client = getClient();
    var otpVal = String((opts && opts.otp) || '').trim();
    var loginId = String((opts && opts.username) || '').trim();
    var identified = detectLoginIdentifier(loginId);
    var loginPayload = Object.assign({ password: opts && opts.password, otp: otpVal }, identified);
    var data;
    try { data = await client.login(loginPayload); }
    catch (err) {
      if ((err && Number(err.status) === 429) || isLoginRateLimited(err && err.raw)) throw err;
      if (err && err.raw && (truthyFlag(err.raw.otp_required) || truthyFlag(err.raw.otpRequired))) {
        return { ok: false, otpRequired: true, message: err.raw.message || 'OTP is required', raw: err.raw };
      }
      throw err;
    }
    if (isLoginRateLimited(data)) {
      client.setToken('');
      var rateErr = new Error(loginRateLimitMessage(data));
      rateErr.status = Number(data.status || 429);
      rateErr.raw = data;
      throw rateErr;
    }
    if (data && (truthyFlag(data.otp_required) || truthyFlag(data.otpRequired))) {
      client.setToken('');
      return { ok: false, otpRequired: true, message: data.message || 'OTP is required', raw: data };
    }
    if (otpVal && isInvalidOtpAttempt(data, otpVal)) {
      client.setToken('');
      var otpErr = new Error((data && data.message) || 'Invalid verification code');
      otpErr.code = 'INVALID_OTP';
      otpErr.status = Number((data && data.status) || 400);
      otpErr.raw = data;
      throw otpErr;
    }
    if (!data || !data.token) {
      client.setToken('');
      var loginErr = new Error((data && data.message) || 'Sign-in failed');
      loginErr.status = Number((data && data.status) || 0);
      loginErr.raw = data || {};
      throw loginErr;
    }
    var userBasic = await client.request('User.Basic');
    var role = detectRole(opts && opts.username, userBasic);
    saveSession(userBasic, role, opts && opts.username, { expiresAt: data.expires_at || data.expiresAt || null });
    var rememberFlag = opts && opts.remember;
    if (rememberFlag == null) rememberFlag = global.localStorage.getItem(REMEMBER_KEY) === '1';
    saveCredentials(opts && opts.username, opts && opts.password, !!rememberFlag);
    try { await ensureDashboardSession({ force: true }); } catch (dashErr) { /* list will surface this */ }
    connectRealtime().catch(function () { /* socket is optional; poll still updates */ });
    return {
      ok: true, otpRequired: false, role: role,
      user: (userBasic.data && userBasic.data.user) || userBasic.user || userBasic,
      userBasic: userBasic, dest: 'index.html#projects', raw: data
    };
  }

  function isAuthenticated() {
    try { return !!(getClient().getToken() && getRole()); } catch (e) { return false; }
  }
  async function ensureAuth(loginPage) {
    var authed = isAuthenticated();
    if (authed && !tokenNeedsRefresh()) return getClient();
    if (canAutoRefresh() && (!authed || tokenNeedsRefresh())) {
      try {
        await refreshSession();
        if (isAuthenticated()) return getClient();
      } catch (err) {
        try { clearSession({ keepEmail: true }); } catch (e) { /* ignore */ }
      }
    }
    if (isAuthenticated()) return getClient();
    redirectToLogin(loginPage);
    return null;
  }

  function dashHost() {
    try {
      var saved = global.localStorage.getItem(DASH_HOST_KEY);
      if (saved && /^https:\/\/[a-z0-9-]+\.bull36\.com$/i.test(saved)) return saved;
    } catch (e) { /* ignore */ }
    var user = getUser() || {};
    var sub = normalizeTenantUser(user.user_domain || user.domain || '');
    if (sub) return 'https://' + sub + '.bull36.com';
    return DOMAIN;
  }
  function rememberDashHost(host) {
    try { if (host) global.localStorage.setItem(DASH_HOST_KEY, host); } catch (e) { /* ignore */ }
  }
  async function dashCall(action, payload, options) {
    options = options || {};
    var body = Object.assign({ action: action, domain: dashHost() }, payload || {});
    var res;
    try {
      res = await fetch('dash-bridge.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (netErr) {
      var offline = new Error('Could not reach the live projects bridge. Open this demo with the PHP server (php -S).');
      offline.status = 0;
      throw offline;
    }
    var text = await res.text();
    var json;
    try { json = text ? JSON.parse(text) : {}; }
    catch (e) {
      var parseErr = new Error('Live projects bridge is missing. Serve this folder with PHP (php -S localhost:8003).');
      parseErr.status = res.status;
      throw parseErr;
    }
    if (action === 'status' || action === 'logout') return json;
    if (res.status === 401 && !options.skipAuthRefresh && action !== 'login') {
      await ensureDashboardSession({ force: true });
      return dashCall(action, payload, { skipAuthRefresh: true });
    }
    if (!res.ok || json.ok === false) {
      var dashErr = new Error(json.message || json.error || 'Dashboard request failed');
      dashErr.status = res.status;
      dashErr.raw = json;
      throw dashErr;
    }
    return json;
  }
  async function ensureDashboardSession(options) {
    options = options || {};
    rememberDashHost(dashHost());
    if (!options.force) {
      try {
        var st = await dashCall('status', {}, { skipAuthRefresh: true });
        if (st && st.ok) return st;
      } catch (e) { /* need login */ }
    }
    var cred = getSavedCredentials();
    if (!cred || !cred.password) {
      var missing = new Error('Sign in again to load live projects');
      missing.code = 'NO_DASH_CREDENTIALS';
      throw missing;
    }
    var host = dashHost();
    rememberDashHost(host);
    return dashCall('login', {
      email: cred.username,
      username: cred.username,
      password: cred.password,
      domain: host
    }, { skipAuthRefresh: true });
  }

  var realtimeState = {
    status: 'off',
    ready: null,
    error: null,
    socket: null,
    registered: []
  };
  var realtimeHandlersWired = false;
  var realtimeConnectPromise = null;

  function dispatchAppEvent(name, detail) {
    try {
      if (typeof global.dispatchEvent === 'function' && typeof global.CustomEvent === 'function') {
        global.dispatchEvent(new global.CustomEvent(name, { detail: detail || {} }));
      }
    } catch (e) { /* ignore */ }
  }
  function setRealtimeStatus(status, error) {
    realtimeState.status = status;
    if (error != null) realtimeState.error = error;
    dispatchAppEvent('mineralbar:socket-status', {
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
        if (global.io) { resolve(); return; }
        existing.addEventListener('load', function () { resolve(); });
        existing.addEventListener('error', function () { reject(new Error('Failed to load ' + src)); });
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
  function classifyRealtimeEvent(event) {
    var key = String((event && event.key) || '');
    if (/project|kanban|board/i.test(key)) return 'projects';
    if (/mission|task/i.test(key)) return 'missions';
    return 'other';
  }
  function wireRealtimeHandlers(client) {
    if (realtimeHandlersWired || !client || !client.realtime || typeof client.realtime.on !== 'function') return;
    realtimeHandlersWired = true;
    client.realtime.on('biz1:ready', function (payload) {
      realtimeState.ready = payload || null;
      realtimeState.registered = (payload && Array.isArray(payload.events)) ? payload.events.slice() : [];
      realtimeState.error = null;
      setRealtimeStatus('ready');
      dispatchAppEvent('mineralbar:socket', {
        type: 'ready',
        payload: payload,
        registered: realtimeState.registered
      });
    });
    client.realtime.on('*', function (event) {
      var group = classifyRealtimeEvent(event);
      var detail = { group: group, key: event && event.key, event: event };
      dispatchAppEvent('mineralbar:realtime', detail);
      if (group === 'projects') dispatchAppEvent('mineralbar:projects', detail);
      if (group === 'missions') dispatchAppEvent('mineralbar:missions', detail);
    });
  }
  async function connectRealtime(options) {
    options = options || {};
    var client = getClient();
    if (!client.getToken()) throw new Error('Realtime connect requires login');
    if (realtimeState.socket && realtimeState.socket.connected && realtimeState.status === 'ready') {
      return { socket: realtimeState.socket, ready: realtimeState.ready };
    }
    if (realtimeConnectPromise) return realtimeConnectPromise;
    realtimeConnectPromise = (async function () {
      await ensureSocketIo();
      if (global.Biz1SDK && typeof global.Biz1SDK.attachRealtime === 'function') {
        global.Biz1SDK.attachRealtime(client);
      }
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
        realtimeState.ready = null;
        realtimeState.registered = [];
        if (realtimeState.status !== 'error') {
          setRealtimeStatus('offline');
        } else {
          setRealtimeStatus('error');
        }
        dispatchAppEvent('mineralbar:socket', { type: 'disconnect', reason: reason });
      });
      return new Promise(function (resolve, reject) {
        var done = false;
        var t = setTimeout(function () {
          if (done) return;
          done = true;
          resolve({ socket: socket, ready: realtimeState.ready, timeout: true });
        }, options.timeoutMs || 12000);
        var off = client.realtime.on('biz1:ready', function (payload) {
          if (done) return;
          done = true;
          clearTimeout(t);
          try { off(); } catch (e) { /* ignore */ }
          resolve({ socket: socket, ready: payload });
        });
        socket.on('connect_error', function (err) {
          if (done) return;
          done = true;
          clearTimeout(t);
          reject(err);
        });
      });
    })();
    try { return await realtimeConnectPromise; }
    catch (err) {
      setRealtimeStatus('error', (err && err.message) || String(err));
      throw err;
    } finally {
      realtimeConnectPromise = null;
    }
  }
  function disconnectRealtime() {
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

  global.MineralBarApp = {
    DOMAIN: DOMAIN,
    getDomain: function () { return DOMAIN; },
    getBrandName: getBrandName,
    getClient: getClient,
    login: login,
    refreshSession: refreshSession,
    ensureAuth: ensureAuth,
    saveCredentials: saveCredentials,
    getSavedCredentials: function () {
      var c = getSavedCredentials();
      return c ? { username: c.username, source: c.source } : null;
    },
    clearSession: clearSession,
    getRole: getRole,
    getEmail: getEmail,
    getUserBasic: getUserBasic,
    getUser: getUser,
    getTeamMembers: getTeamMembers,
    isAuthenticated: isAuthenticated,
    dashHost: dashHost,
    dashCall: dashCall,
    ensureDashboardSession: ensureDashboardSession,
    connectRealtime: connectRealtime,
    disconnectRealtime: disconnectRealtime,
    getRealtimeState: getRealtimeState
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ===== i18n + theme ===== */
(function (global) {
  'use strict';
  var LANG_KEY = 'biz1proj_lang';
  var THEME_KEY = 'biz1proj_theme';
  var DEFAULT_LANG = 'en';

  function brandName(lang) {
    try {
      if (global.MineralBarApp && MineralBarApp.getBrandName) return MineralBarApp.getBrandName(lang || DEFAULT_LANG);
    } catch (e) { /* ignore */ }
    var cfg = global.Biz1Config && Biz1Config.brand;
    if (cfg && (cfg[lang] || cfg.en)) return cfg[lang] || cfg.en;
    return 'Biz1 Showcase';
  }

  var STRINGS = {
    en: {
      brand: 'Biz1 Showcase',
      login_subtitle: 'Projects · Team workspace',
      account_login: 'Sign in to your account',
      email_label: 'Email / Username',
      login_identifier_label: 'Email / Username / Phone / ID',
      login_identifier_placeholder: 'Email, username, phone or ID',
      password_label: 'Password',
      password_placeholder: 'Enter password',
      otp_label: 'Verification code (OTP)',
      otp_placeholder: 'Enter code',
      remember_me: 'Remember me',
      login_btn: 'Sign in',
      login_btn_otp: 'Verify & Sign in',
      logging_in: 'Signing in…',
      verifying: 'Verifying…',
      toggle_password: 'Show or hide password',
      err_generic: 'Sign-in error',
      err_fill: 'Please enter your login ID and password',
      err_otp: 'Please enter the verification code (OTP)',
      err_invalid_otp: 'Invalid verification code. Try again or resend OTP.',
      err_otp_network: 'Could not verify OTP — check connection and try again.',
      err_otp_session: 'OTP session expired. Sign in again to receive a new code.',
      err_invalid_credentials: 'Incorrect login ID or password.',
      err_network: 'Could not connect to Biz1. Check your internet connection and try again.',
      err_failed: 'Sign-in failed',
      err_otp_needed: 'Enter the verification code sent to your account.',
      resend_otp: 'Resend OTP',
      resend_otp_wait: 'Resend in {s}s',
      resend_otp_sending: 'Sending…',
      err_resend_otp: 'Could not resend the verification code. Please try again.',
      err_rate_limit_generic: 'Too many login attempts. Please wait and try again.',
      try_again_in: 'Try again in',
      lang_label: 'Language',
      loading: 'Loading…',
      logout: 'Log out',
      profile: 'Profile',
      profile_role: 'Role',
      role_sales: 'Sales',
      role_service: 'Service',
      role_tech: 'Technician',
      toggle_theme: 'Light / Dark mode',
      page_login_title: 'Biz1 Showcase — Sign in',
      page_projects_title: 'Projects',
      footer_crm: 'Biz1 Showcase · Projects',
      data_not_found: 'Data not found',
      projects_kicker: 'Project directory',
      projects_title: 'Active projects',
      projects_sub: 'Clients, team allocation, and timeline status in one workspace.',
      manage_columns: 'Columns',
      delete_selected: 'Delete',
      new_project: 'New project',
      stat_total: 'Projects',
      stat_active: 'Active',
      stat_done: 'Completed',
      stat_open: 'Open items',
      search_projects: 'Search projects or clients',
      filter_all: 'All statuses',
      filter_team_all: 'All team',
      refresh: 'Refresh',
      col_project: 'Project',
      col_client: 'Client',
      col_dates: 'Created / Start',
      col_team: 'Team',
      col_status: 'Timeline',
      col_progress: 'Progress',
      col_actions: 'Actions',
      prev: 'Previous',
      next: 'Next',
      created: 'Created',
      started: 'Start',
      assign_team: 'Assign team',
      manage: 'Manage',
      cancel: 'Cancel',
      save: 'Save',
      create: 'Create',
      submit: 'Submit',
      reset: 'Reset',
      add: 'Add',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      project_name: 'Name',
      project_name_ph: 'Enter Project Name',
      client: 'Client',
      client_ph: 'Assign Client',
      member: 'Member',
      member_ph: 'Select Team Member',
      credentials: 'Credentials',
      credentials_ph: 'Enter Credentials',
      default_user: 'Default user',
      default_user_ph: 'Default user',
      note: 'Note',
      note_ph: 'Enter Note',
      private_project: 'Private project',
      show_hide_tag: 'Show/Hide tag',
      tags: 'Tags',
      tag_new: 'NEW',
      allow_add_missions: 'Allow add missions',
      project_done: 'Project Done',
      use_as_template: 'use as template',
      start_date: 'Start date',
      status: 'Status',
      no_client: 'No client',
      no_team: 'Unassigned',
      confirm_delete: 'Delete this project?',
      confirm_delete_many: 'Delete selected projects?',
      confirm_delete_column: 'Delete this column?',
      create_title: 'Add Project',
      assign_title: 'Team allocation',
      columns_title: 'Board columns',
      column_en: 'English label',
      column_he: 'Hebrew label',
      column_key: 'Internal key',
      column_color: 'Color',
      add_column: 'Add column',
      toast_created: 'Project created',
      toast_deleted: 'Deleted',
      toast_mission_created: 'Mission created',
      toast_mission_moved: 'Mission moved',
      back: 'Back',
      add_mission: 'Add mission +',
      mission_text: 'Mission details',
      search_missions: 'Search missions',
      team_label: 'Team',
      board_col_testing: 'Testing',
      board_col_done: 'Done',
      board_col_queries: 'Queries',
      board_col_to_do: 'To Do',
      board_col_project: 'To charge payment',
      board_col_place_order: 'To place an order',
      board_col_other: 'Other',
      board_col_send_pictures: 'Send pictures',
      board_col_send_offer: 'To send a quote / offer',
      board_col_follow_up: 'Follow-up call',
      live_socket_on: 'Live',
      live_socket_off: 'Offline',
      page_board_title: 'Project board',
      toast_saved: 'Saved',
      toast_assigned: 'Team updated',
      toast_column_added: 'Column added',
      pager_of: '{from}–{to} of {total}',
      open_items_n: '{n} open',
      done_n: '{n} done',
      default_col: 'Default',
      custom_col: 'Custom'
    },
    he: {
      brand: 'תצוגת Biz1',
      login_subtitle: 'פרויקטים · סביבת צוות',
      account_login: 'כניסה לחשבון',
      email_label: 'אימייל / שם משתמש',
      login_identifier_label: 'אימייל / שם משתמש / טלפון / מזהה',
      login_identifier_placeholder: 'אימייל, שם משתמש, טלפון או מזהה',
      password_label: 'סיסמה',
      password_placeholder: 'הזן סיסמה',
      otp_label: 'קוד אימות (OTP)',
      otp_placeholder: 'הזן קוד',
      remember_me: 'זכור אותי',
      login_btn: 'התחבר',
      login_btn_otp: 'אמת והתחבר',
      logging_in: 'מתחבר…',
      verifying: 'מאמת…',
      toggle_password: 'הצג או הסתר סיסמה',
      err_generic: 'שגיאה בהתחברות',
      err_fill: 'יש למלא מזהה התחברות וסיסמה',
      err_otp: 'יש להזין קוד אימות (OTP)',
      err_invalid_otp: 'קוד אימות שגוי. נסו שוב או שלחו קוד מחדש.',
      err_otp_network: 'לא ניתן לאמת OTP — בדקו חיבור ונסו שוב.',
      err_otp_session: 'פג תוקף שלב האימות. התחברו מחדש לקבלת קוד חדש.',
      err_invalid_credentials: 'מזהה ההתחברות או הסיסמה שגויים.',
      err_network: 'לא ניתן להתחבר ל-Biz1. בדקו את החיבור לאינטרנט ונסו שוב.',
      err_failed: 'ההתחברות נכשלה',
      err_otp_needed: 'הזינו את קוד האימות שנשלח לחשבון שלכם.',
      resend_otp: 'שלח קוד שוב',
      resend_otp_wait: 'שלח שוב בעוד {s} שנ׳',
      resend_otp_sending: 'שולח…',
      err_resend_otp: 'לא ניתן לשלוח את קוד האימות מחדש. נסו שוב.',
      err_rate_limit_generic: 'יותר מדי ניסיונות התחברות. המתינו ונסו שוב.',
      try_again_in: 'נסו שוב בעוד',
      lang_label: 'שפה',
      loading: 'טוען…',
      logout: 'התנתק',
      profile: 'פרופיל',
      profile_role: 'תפקיד',
      role_sales: 'מכירות',
      role_service: 'שירות',
      role_tech: 'טכנאי',
      toggle_theme: 'מצב בהיר / כהה',
      page_login_title: 'Biz1 Showcase — התחברות',
      page_projects_title: 'פרויקטים',
      footer_crm: 'תצוגת Biz1 · פרויקטים',
      data_not_found: 'לא נמצאו נתונים',
      projects_kicker: 'מדריך פרויקטים',
      projects_title: 'פרויקטים פעילים',
      projects_sub: 'לקוחות, הקצאת צוות וסטטוס לוח זמנים במקום אחד.',
      manage_columns: 'עמודות',
      delete_selected: 'מחק',
      new_project: 'פרויקט חדש',
      stat_total: 'פרויקטים',
      stat_active: 'פעילים',
      stat_done: 'הושלמו',
      stat_open: 'פריטים פתוחים',
      search_projects: 'חיפוש פרויקטים או לקוחות',
      filter_all: 'כל הסטטוסים',
      filter_team_all: 'כל הצוות',
      refresh: 'רענן',
      col_project: 'פרויקט',
      col_client: 'לקוח',
      col_dates: 'נוצר / התחלה',
      col_team: 'צוות',
      col_status: 'ציר זמן',
      col_progress: 'התקדמות',
      col_actions: 'פעולות',
      prev: 'הקודם',
      next: 'הבא',
      created: 'נוצר',
      started: 'התחלה',
      assign_team: 'הקצאת צוות',
      manage: 'ניהול',
      cancel: 'ביטול',
      save: 'שמירה',
      create: 'יצירה',
      submit: 'שלח',
      reset: 'נקה',
      add: 'הוספה',
      delete: 'מחיקה',
      edit: 'עריכה',
      close: 'סגור',
      project_name: 'שם',
      project_name_ph: 'הזן את שם הפרויקט',
      client: 'לקוח',
      client_ph: 'הקצה לקוח',
      member: 'חבר',
      member_ph: 'בחר חבר צוות',
      credentials: 'תעודות',
      credentials_ph: 'הזן אישורים',
      default_user: 'חבר צוות ברירת מחדל',
      default_user_ph: 'חבר צוות ברירת מחדל',
      note: 'הערה',
      note_ph: 'הוסף הערה',
      private_project: 'פרויקט פרטי',
      show_hide_tag: 'הצג/הסתר תג',
      tags: 'תגיות',
      tag_new: 'חדש',
      allow_add_missions: 'הרשאה להוספת משימות',
      project_done: 'הפרויקט בוצע',
      use_as_template: 'השתמש בתבנית',
      start_date: 'תאריך התחלה',
      status: 'סטטוס',
      no_client: 'אין לקוח',
      no_team: 'לא שובץ',
      confirm_delete: 'למחוק את הפרויקט?',
      confirm_delete_many: 'למחוק את הפרויקטים שנבחרו?',
      confirm_delete_column: 'למחוק את העמודה?',
      create_title: 'הוסף פרויקט',
      assign_title: 'הקצאת צוות',
      columns_title: 'עמודות לוח',
      column_en: 'תווית אנגלית',
      column_he: 'תווית עברית',
      column_key: 'מפתח פנימי',
      column_color: 'צבע',
      add_column: 'הוסף עמודה',
      toast_created: 'הפרויקט נוצר',
      toast_deleted: 'נמחק',
      toast_mission_created: 'המשימה נוצרה',
      toast_mission_moved: 'המשימה הועברה',
      back: 'חזרה',
      add_mission: 'הוסף משימה +',
      mission_text: 'פרטי המשימה',
      search_missions: 'חיפוש משימות',
      team_label: 'קבוצה',
      board_col_testing: 'בדיקה',
      board_col_done: 'בוצע',
      board_col_queries: 'שאילתות',
      board_col_to_do: 'לעשות',
      board_col_project: 'לגבות תשלום',
      board_col_place_order: 'להוציא הזמנה',
      board_col_other: 'אחר',
      board_col_send_pictures: 'לשלוח תמונות',
      board_col_send_offer: 'לשלוח הצעה',
      board_col_follow_up: 'שיחת פולואפ',
      live_socket_on: 'שידור חי',
      live_socket_off: 'מנותק',
      page_board_title: 'לוח פרויקט',
      toast_saved: 'נשמר',
      toast_assigned: 'הצוות עודכן',
      toast_column_added: 'עמודה נוספה',
      pager_of: '{from}–{to} מתוך {total}',
      open_items_n: '{n} פתוחים',
      done_n: '{n} הושלמו',
      default_col: 'ברירת מחדל',
      custom_col: 'מותאם'
    }
  };

  function getLang() {
    try {
      var saved = global.localStorage.getItem(LANG_KEY) || global.localStorage.getItem('biz1fs_lang') || global.localStorage.getItem('mineralbar_lang');
      if (saved === 'he' || saved === 'en') return saved;
    } catch (e) { /* ignore */ }
    return DEFAULT_LANG;
  }
  function t(key, lang) {
    lang = lang || getLang();
    if (key === 'brand') return brandName(lang);
    if (key === 'footer_crm') return brandName(lang) + (lang === 'he' ? ' · פרויקטים' : ' · Projects');
    if (key === 'page_login_title') return brandName(lang) + (lang === 'he' ? ' — התחברות' : ' — Sign in');
    var pack = STRINGS[lang] || STRINGS.en;
    if (pack[key] != null) return pack[key];
    if (STRINGS.en[key] != null) return STRINGS.en[key];
    return key;
  }
  function apply(lang) {
    lang = lang || getLang();
    var dir = lang === 'he' ? 'rtl' : 'ltr';
    var html = document.documentElement;
    html.setAttribute('lang', lang === 'he' ? 'he' : 'en');
    html.setAttribute('dir', dir);
    if (document.body) document.body.setAttribute('dir', dir);
    var root = document.getElementById('appRoot');
    if (root) root.setAttribute('dir', dir);
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key, lang);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (key) el.setAttribute('placeholder', t(key, lang));
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria');
      if (key) el.setAttribute('aria-label', t(key, lang));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-title');
      if (key) el.setAttribute('title', t(key, lang));
    });
    document.querySelectorAll('[data-set-lang]').forEach(function (btn) {
      var active = btn.getAttribute('data-set-lang') === lang;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }
  function setLang(lang) {
    if (lang !== 'he' && lang !== 'en') lang = DEFAULT_LANG;
    try {
      global.localStorage.setItem(LANG_KEY, lang);
      global.localStorage.setItem('biz1fs_lang', lang);
    } catch (e) { /* ignore */ }
    apply(lang);
    global.dispatchEvent(new CustomEvent('mineralbar:lang', { detail: { lang: lang } }));
    return lang;
  }
  function getTheme() {
    try {
      var saved = global.localStorage.getItem(THEME_KEY) || global.localStorage.getItem('biz1fs_theme') || global.localStorage.getItem('mineralbar_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) { /* ignore */ }
    return (global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  function setTheme(theme) {
    theme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    try {
      global.localStorage.setItem(THEME_KEY, theme);
      global.localStorage.setItem('biz1fs_theme', theme);
    } catch (e) { /* ignore */ }
  }

  global.MineralBarI18n = { t: t, getLang: getLang, setLang: setLang, apply: apply, getTheme: getTheme, setTheme: setTheme };
})(typeof window !== 'undefined' ? window : globalThis);

/* ===== App UI ===== */
(function (global) {
  'use strict';

  var PAGE_SIZE = 25;
  var AVATAR_COLORS = ['#1d60a2', '#2e8a63', '#bd8324', '#7b5ea7', '#c0392b', '#2a9d8f', '#e76f51', '#457b9d'];
  function blankState() {
    return {
      rows: [],
      allRows: [],
      projectTags: [],
      total: 0,
      start: 0,
      search: '',
      status: '',
      teamMemberId: '',
      selected: {},
      columns: [],
      customers: [],
      team: [],
      loading: false,
      assignments: {},
      board: null,
      boardSearch: '',
      chartPage: 0,
      dragging: false,
      listFp: '',
      boardFp: '',
      liveSyncing: false,
      dashReady: false,
      listOwner: ''
    };
  }
  var state = Object.assign(blankState(), { epoch: 0, ownerKey: '' });

  function accountKey() {
    try {
      var user = global.MineralBarApp && MineralBarApp.getUser && MineralBarApp.getUser();
      var id = user && (user.id || user.user_id);
      var email = (global.MineralBarApp && MineralBarApp.getEmail && MineralBarApp.getEmail()) || '';
      return String(id || email || '');
    } catch (e) { return ''; }
  }
  function resetWorkspace() {
    var epoch = (state.epoch || 0) + 1;
    Object.assign(state, blankState());
    state.epoch = epoch;
    state.ownerKey = '';
    var tbody = document.getElementById('projectsTbody');
    if (tbody) tbody.innerHTML = '';
    var cards = document.getElementById('projectsCards');
    if (cards) cards.innerHTML = '';
    var wrap = document.getElementById('projectsTableWrap');
    if (wrap) wrap.classList.add('hidden');
    var empty = document.getElementById('projectsEmpty');
    if (empty) empty.classList.add('hidden');
    var err = document.getElementById('projectsError');
    if (err) err.classList.add('hidden');
    var loading = document.getElementById('projectsLoading');
    if (loading) loading.classList.add('hidden');
    ['statTotal', 'statActive', 'statDone', 'statOpen'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = '0';
    });
    var cols = document.getElementById('boardColumns');
    if (cols) cols.innerHTML = '';
    var nameEl = document.getElementById('boardProjectName');
    if (nameEl) nameEl.textContent = '—';
    var teamEl = document.getElementById('boardTeam');
    if (teamEl) teamEl.innerHTML = '';
    var clientEl = document.getElementById('boardClient');
    if (clientEl) clientEl.innerHTML = '';
    var search = document.getElementById('projectSearch');
    if (search) search.value = '';
    var teamFilter = document.getElementById('teamFilter');
    if (teamFilter) teamFilter.innerHTML = '<option value=""></option>';
    document.querySelectorAll('[data-profile-initials]').forEach(function (el) { el.textContent = '?'; });
    var pn = document.getElementById('profileName');
    var pe = document.getElementById('profileEmail');
    var pr = document.getElementById('profileRole');
    if (pn) pn.textContent = '—';
    if (pe) pe.textContent = '—';
    if (pr) pr.textContent = '—';
  }

  function tr(key) {
    return (global.MineralBarI18n && MineralBarI18n.t(key)) || key;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function pick(obj, keys, fallback) {
    if (!obj || typeof obj !== 'object') return fallback;
    for (var i = 0; i < keys.length; i += 1) {
      var v = obj[keys[i]];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return fallback;
  }
  function asArray(v) {
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object') return Object.keys(v).map(function (k) { return v[k]; });
    if (typeof v === 'string' && v.trim()) {
      try { var parsed = JSON.parse(v); if (Array.isArray(parsed)) return parsed; } catch (e) { /* ignore */ }
      return v.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }
    return [];
  }
  function listRows(raw) {
    if (!raw || typeof raw !== 'object') return [];
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.rows)) return raw.rows;
    if (Array.isArray(raw.projects)) return raw.projects;
    if (Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw.output)) return raw.output;
    if (Array.isArray(raw.list)) return raw.list;
    return [];
  }
  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  function colorFor(seed) {
    var s = String(seed || '');
    var n = 0;
    for (var i = 0; i < s.length; i += 1) n = (n + s.charCodeAt(i) * (i + 1)) % AVATAR_COLORS.length;
    return AVATAR_COLORS[n];
  }
  function formatDate(value) {
    if (!value) return '—';
    var text = String(value).trim();
    var m = text.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) {
      var d = m[1].split('-');
      return d[2] + '/' + d[1] + '/' + d[0];
    }
    var parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return text;
    return String(parsed.getDate()).padStart(2, '0') + '/' + String(parsed.getMonth() + 1).padStart(2, '0') + '/' + parsed.getFullYear();
  }
  function memberId(m) {
    if (m == null) return '';
    if (typeof m !== 'object') return String(m);
    return String(pick(m, ['id', 'user_id', 'member_id', 'team_member_id', 'uid', 'organization_id', 'organizations_user_id', 'org_user_id'], '') || '');
  }
  function memberName(m) {
    if (!m || typeof m !== 'object') return String(m || '');
    return String(pick(m, ['name', 'full_name', 'display_name', 'username', 'user_name', 'email', 'first_name', 'member_name'], '') || '');
  }
  function teamFromBasic() {
    return (global.MineralBarApp && MineralBarApp.getTeamMembers && MineralBarApp.getTeamMembers()) || [];
  }
  function uniqueTeam() {
    var seen = Object.create(null);
    var out = [];
    (state.team || []).concat(teamFromBasic()).forEach(function (m) {
      var id = memberId(m);
      var key = id || ('name:' + memberName(m).toLowerCase());
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push(m);
    });
    return out;
  }
  function resolveMember(idOrObj) {
    if (idOrObj && typeof idOrObj === 'object') {
      var oid = memberId(idOrObj);
      var oname = memberName(idOrObj);
      if (!oid && oname) {
        var named = uniqueTeam().find(function (m) {
          return memberName(m).toLowerCase() === oname.toLowerCase() ||
            String(m.user_name || '').toLowerCase() === oname.toLowerCase();
        });
        if (named) oid = memberId(named);
      }
      return {
        id: oid || oname,
        name: oname || (oid ? ('#' + oid) : ''),
        color: colorFor(oid || oname)
      };
    }
    var id = String(idOrObj || '');
    var hit = uniqueTeam().find(function (m) { return memberId(m) === id; });
    if (hit) return { id: id, name: memberName(hit) || ('#' + id), color: colorFor(id) };
    return id ? { id: id, name: '#' + id, color: colorFor(id) } : null;
  }

  function mapProject(row) {
    if (!row || typeof row !== 'object') row = {};
    var id = String(pick(row, ['id', 'project_id', 'projects_id', 'ID'], '') || '');
    var name = String(pick(row, ['name', 'title', 'project_name', 'project', 'name_en', 'name_he'], tr('col_project')));
    var customerObj = row.customer && typeof row.customer === 'object' ? row.customer : null;
    var clientName = String(pick(row, ['customer_name', 'client_name', 'company', 'customer', 'client'], '') ||
      (customerObj ? pick(customerObj, ['name', 'company', 'full_name'], '') : '') || '');
    var customerId = String(pick(row, ['customer_id', 'client_id'], '') || (customerObj ? pick(customerObj, ['id', 'customer_id'], '') : '') || '');
    if (!clientName && customerId) {
      var cust = state.customers.find(function (c) { return String(c.id || c.customer_id) === customerId; });
      if (cust) clientName = String(pick(cust, ['name', 'company', 'full_name', 'customer_name'], '') || '');
    }
    var created = pick(row, ['date_created', 'created_at', 'created', 'created_date'], '');
    var start = pick(row, ['start_date', 'date_start', 'begin_date', 'date_of_start'], created);
    var status = String(pick(row, ['status', 'column_name', 'column', 'p_status', 'status_name', 'timeline', 'board_column'], '') || '');
    var statusLabel = String(pick(row, ['status_label', 'column_label', 'status_name'], '') || status);
    var open = Number(pick(row, ['open_items', 'open_tasks', 'open', 'open_count', 'todo', 'pending'], 0) || 0);
    var done = Number(pick(row, ['completed', 'done_tasks', 'done', 'closed_count', 'completed_tasks'], 0) || 0);
    var total = Number(pick(row, ['total_tasks', 'tasks_count', 'tasks', 'items'], 0) || 0);
    if (!total) total = open + done;
    var progress = row.progress != null && row.progress !== '' ? Number(row.progress) : (total ? Math.round((done / total) * 100) : (status && /done|complete|closed|finish/i.test(status) ? 100 : 0));
    if (!Number.isFinite(progress)) progress = 0;
    progress = Math.max(0, Math.min(100, progress));

    var team = [];
    var assigned = state.assignments[id];
    var sources = assigned && assigned.length ? assigned : asArray(row.team_members || row.users || row.members || row.assigned || row.team || row.assignees);
    if (!sources.length && (row.team_member_id || row.user_id || row.assign_member_id)) {
      sources = [row.team_member_id || row.user_id || row.assign_member_id];
    }
    sources.forEach(function (item) {
      var m = resolveMember(item);
      if (!m || (!m.id && !m.name)) return;
      if (!m.id) m.id = m.name;
      if (!team.some(function (x) { return x.id === m.id || (x.name && m.name && x.name.toLowerCase() === m.name.toLowerCase()); })) {
        team.push(m);
      }
    });
    if (!team.length && row.team_member_name) team.push({ id: String(row.team_member_id || ''), name: String(row.team_member_name), color: colorFor(row.team_member_name) });

    return {
      id: id, name: name, clientName: clientName, customerId: customerId,
      created: created, start: start, status: status, statusLabel: statusLabel || status || '—',
      open: open, done: done, total: total, progress: progress, team: team,
      testing: Number(pick(row, ['testing'], 0) || 0),
      queries: Number(pick(row, ['queries'], 0) || 0),
      to_do: Number(pick(row, ['to_do', 'todo'], 0) || 0),
      raw: row
    };
  }

  function isDoneProject(p) {
    var s = String((p && (p.statusLabel || p.status)) || '').toLowerCase();
    return (p && p.progress >= 100) || /done|complete|closed|finish|הושלם/.test(s);
  }
  function projectMatchesStatus(p, statusKey) {
    if (!statusKey) return true;
    var f = String(statusKey);
    var fl = f.toLowerCase();
    if (fl === '__active') return !isDoneProject(p);
    if (fl === '__done') return isDoneProject(p);
    var label = String(p.statusLabel || '').toLowerCase();
    var st = String(p.status || '').toLowerCase();
    if (st === fl || label === fl) return true;
    if (fl === 'testing') return Number(p.testing || 0) > 0;
    if (fl === 'queries') return Number(p.queries || 0) > 0;
    if (fl === 'to_do' || fl === 'todo') return Number(p.to_do || 0) > 0;
    var col = (state.columns || []).find(function (c) {
      return [c.column_name, c.name_en, c.name_he, c.id].some(function (v) {
        return v != null && String(v).toLowerCase() === fl;
      });
    });
    if (col) {
      var key = String(col.column_name || '').toLowerCase();
      if (key === 'testing') return Number(p.testing || 0) > 0;
      if (key === 'queries') return Number(p.queries || 0) > 0;
      if (key === 'to_do' || key === 'todo') return Number(p.to_do || 0) > 0;
      if (key === 'done') return isDoneProject(p);
      var names = [col.column_name, col.name_en, col.name_he].map(function (v) { return String(v || '').toLowerCase(); });
      return names.indexOf(st) !== -1 || names.indexOf(label) !== -1;
    }
    return false;
  }
  function projectMatchesTeam(p, teamKey) {
    if (!teamKey) return true;
    var key = String(teamKey).toLowerCase();
    return (p.team || []).some(function (m) {
      return String(m.id || '').toLowerCase() === key || String(m.name || '').toLowerCase() === key;
    });
  }

  function columnTone(status) {
    var s = String(status || '').toLowerCase();
    if (/done|complete|closed|finish|הושלם/.test(s)) return 'ok';
    if (/progress|doing|active|qa|review|בעבודה/.test(s)) return 'warn';
    if (/block|late|overdue|risk|stuck/.test(s)) return 'danger';
    if (!s || s === '—' || /todo|to_do|open|new|פתוח/.test(s)) return 'brand';
    return 'muted';
  }
  function columnColor(status) {
    var key = String(status || '').toLowerCase();
    var col = state.columns.find(function (c) {
      return String(c.column_name || '').toLowerCase() === key ||
        String(c.name_en || '').toLowerCase() === key ||
        String(c.id) === String(status);
    });
    return (col && (col.color_name_value || col.color || col.color_name)) || '';
  }

  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.add('hidden'); }, 2800);
  }

  function client() { return global.MineralBarApp.getClient(); }

  async function fetchProjects() {
    var epoch = state.epoch;
    var uid = accountKey();
    await global.MineralBarApp.ensureDashboardSession();
    if (epoch !== state.epoch || accountKey() !== uid) return;
    var raw = await global.MineralBarApp.dashCall('list', {
      search: state.search || '',
      team_member_id: state.teamMemberId || ''
    });
    if (epoch !== state.epoch || accountKey() !== uid) return;
    var mapped = listRows(raw).map(mapProject);
    state.allRows = mapped;
    state.listOwner = uid;
    var rows = mapped.filter(function (p) {
      return projectMatchesStatus(p, state.status) && projectMatchesTeam(p, state.teamMemberId);
    });
    state.total = rows.length;
    if (state.start >= state.total && state.start > 0) {
      state.start = Math.max(0, Math.floor(Math.max(0, state.total - 1) / PAGE_SIZE) * PAGE_SIZE);
    }
    state.rows = rows.slice(state.start, state.start + PAGE_SIZE);
    return listFingerprint();
  }

  function listFingerprint() {
    return JSON.stringify({
      total: state.total,
      start: state.start,
      search: state.search,
      status: state.status,
      team: state.teamMemberId,
      rows: (state.rows || []).map(function (p) {
        return [p.id, p.name, p.clientName, p.status, p.progress,
          (p.team || []).map(function (m) { return m.id || m.name; }).join(',')];
      })
    });
  }
  function boardFingerprint(board) {
    board = board || state.board || {};
    return JSON.stringify({
      id: board.id,
      name: board.name || board.title || '',
      client: board.client_name || '',
      cols: (board.columns || []).map(function (c) {
        return [c.key, (c.missions || []).map(function (m) { return String(m.id) + ':' + String(m.title || ''); })];
      })
    });
  }

  async function fetchColumns() {
    var raw = await client().request('Projects.ColumnsList', { limit: 25, length: 25, start: 0 });
    state.columns = listRows(raw);
  }
  async function fetchCustomers() {
    try {
      var raw = await client().request('Customer.List', { folder_id: 2, length: 25, limit: 25, start: 0, draw: 1 });
      state.customers = listRows(raw);
    } catch (e) { state.customers = []; }
  }

  function selectedIds() {
    return Object.keys(state.selected).filter(function (id) { return state.selected[id]; });
  }

  function avatarStackHtml(team) {
    if (!team || !team.length) return '<span class="assign-hint">' + esc(tr('no_team')) + '</span>';
    var shown = team.slice(0, 3);
    var extra = team.length - shown.length;
    var html = '<div class="avatar-stack">';
    shown.forEach(function (m) {
      html += '<span class="avatar" title="' + esc(m.name) + '" style="background:' + esc(m.color) + '">' + esc(initials(m.name)) + '</span>';
    });
    if (extra > 0) html += '<span class="avatar-more">+' + extra + '</span>';
    html += '</div>';
    return html;
  }
  function statusHtml(p) {
    var tone = columnTone(p.status || p.statusLabel);
    var color = columnColor(p.status);
    var style = color ? ' style="background:color-mix(in srgb, ' + esc(color) + ' 18%, transparent);color:' + esc(color) + '"' : '';
    var cls = 'status-pill' + (color ? '' : (tone === 'ok' ? ' status-pill--ok' : tone === 'warn' ? ' status-pill--warn' : tone === 'danger' ? ' status-pill--danger' : tone === 'muted' ? ' status-pill--muted' : ''));
    return '<span class="' + cls + '"' + style + '><span class="dot"></span>' + esc(p.statusLabel || '—') + '</span>';
  }
  function progressHtml(p) {
    var cls = 'progress-bar' + (p.progress >= 100 ? ' is-done' : (p.open > 0 && p.progress < 30 ? ' is-late' : ''));
    return '<div class="progress-wrap"><div class="progress-meta"><span>' + p.progress + '%</span><span>' +
      esc(tr('open_items_n').replace('{n}', String(p.open))) + '</span></div><div class="' + cls + '"><span style="width:' + p.progress + '%"></span></div></div>';
  }
  function clientHtml(p) {
    if (!p.clientName) return '<span class="assign-hint">' + esc(tr('no_client')) + '</span>';
    return '<div class="client-cell"><span class="avatar" style="background:' + colorFor(p.clientName) + '">' + esc(initials(p.clientName)) + '</span><span class="client-name">' + esc(p.clientName) + '</span></div>';
  }
  function actionBtns(id) {
    return '<div class="row-actions">' +
      '<button type="button" class="icon-btn" data-assign="' + esc(id) + '" title="' + esc(tr('assign_team')) + '">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3"/><path d="M3 19c0-3 3-5 6-5"/><circle cx="17" cy="9" r="2.4"/><path d="M21 19c0-2.4-2.2-4-4.4-4"/></svg></button>' +
      '<button type="button" class="icon-btn icon-btn--danger" data-del="' + esc(id) + '" title="' + esc(tr('delete')) + '">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7V5h6v2M10 11v6M14 11v6M6 7l1 12h10l1-12"/></svg></button>' +
      '</div>';
  }

  function renderStats() {
    var list = (state.allRows || []).filter(function (p) {
      return projectMatchesStatus(p, state.status) && projectMatchesTeam(p, state.teamMemberId);
    });
    if (!list.length && state.rows.length) list = state.rows;
    var total = state.total;
    var active = list.filter(function (p) { return !isDoneProject(p); }).length;
    var done = list.filter(function (p) { return isDoneProject(p); }).length;
    var open = list.reduce(function (n, p) { return n + (Number(p.open) || 0); }, 0);
    var elT = document.getElementById('statTotal');
    var elA = document.getElementById('statActive');
    var elD = document.getElementById('statDone');
    var elO = document.getElementById('statOpen');
    if (elT) elT.textContent = String(total);
    if (elA) elA.textContent = String(active);
    if (elD) elD.textContent = String(done);
    if (elO) elO.textContent = String(open);
  }

  function fillFilters() {
    var teamEl = document.getElementById('teamFilter');
    if (document.activeElement === teamEl) return;
    var source = (state.allRows && state.allRows.length) ? state.allRows : state.rows;
    if (teamEl) {
      var tcur = state.teamMemberId;
      var teamHtml = '<option value="">' + esc(tr('filter_team_all')) + '</option>';
      var seenT = {};
      function addTeamOption(id, name) {
        var value = id || name;
        if (!value || seenT[value]) return;
        seenT[value] = true;
        teamHtml += '<option value="' + esc(value) + '"' + (String(tcur) === String(value) ? ' selected' : '') + '>' + esc(name || ('#' + id)) + '</option>';
      }
      uniqueTeam().forEach(function (m) {
        addTeamOption(memberId(m), memberName(m) || memberId(m));
      });
      source.forEach(function (p) {
        (p.team || []).forEach(function (m) { addTeamOption(m.id, m.name); });
      });
      if (teamEl.innerHTML !== teamHtml) {
        teamEl.innerHTML = teamHtml;
        if (tcur) teamEl.value = tcur;
      } else if (teamEl.value !== tcur) {
        teamEl.value = tcur;
      }
    }
  }

  function renderTable() {
    var wrap = document.getElementById('projectsTableWrap');
    var tbody = document.getElementById('projectsTbody');
    var cards = document.getElementById('projectsCards');
    var empty = document.getElementById('projectsEmpty');
    var loading = document.getElementById('projectsLoading');
    var err = document.getElementById('projectsError');
    if (loading) loading.classList.toggle('hidden', !state.loading);
    if (err) err.classList.add('hidden');
    if (state.loading || (state.listOwner && state.listOwner !== accountKey())) {
      if (wrap) wrap.classList.add('hidden');
      if (tbody) tbody.innerHTML = '';
      if (cards) cards.innerHTML = '';
      if (empty) empty.classList.add('hidden');
      return;
    }
    if (!state.rows.length) {
      if (wrap) wrap.classList.add('hidden');
      if (cards) cards.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    if (wrap) wrap.classList.toggle('hidden', !state.rows.length);
    if (!tbody || !cards) return;
    tbody.innerHTML = state.rows.map(function (p) {
      var checked = state.selected[p.id] ? ' checked' : '';
      return '<tr data-id="' + esc(p.id) + '" data-open-board="' + esc(p.id) + '">' +
        '<td class="col-check"><input type="checkbox" data-select="' + esc(p.id) + '"' + checked + '></td>' +
        '<td><div class="project-name" data-open-board="' + esc(p.id) + '">' + esc(p.name) + '</div><div class="project-id">#' + esc(p.id || '—') + '</div></td>' +
        '<td>' + clientHtml(p) + '</td>' +
        '<td class="date-cell">' + esc(formatDate(p.created)) + '<small>' + esc(tr('started')) + ' ' + esc(formatDate(p.start)) + '</small></td>' +
        '<td>' + avatarStackHtml(p.team) + '</td>' +
        '<td>' + statusHtml(p) + '</td>' +
        '<td>' + progressHtml(p) + '</td>' +
        '<td class="col-actions">' + actionBtns(p.id) + '</td></tr>';
    }).join('');
    cards.innerHTML = state.rows.map(function (p) {
      var checked = state.selected[p.id] ? ' checked' : '';
      return '<div class="card project-card" data-id="' + esc(p.id) + '">' +
        '<div class="project-card-top"><div><label><input type="checkbox" data-select="' + esc(p.id) + '"' + checked + '></label> <span class="project-name" data-open-board="' + esc(p.id) + '">' + esc(p.name) + '</span>' +
        '<div class="project-id">#' + esc(p.id || '—') + '</div></div>' + statusHtml(p) + '</div>' +
        '<div class="project-card-meta">' +
        '<div class="meta-row"><span>' + esc(tr('col_client')) + '</span><span>' + (p.clientName ? esc(p.clientName) : esc(tr('no_client'))) + '</span></div>' +
        '<div class="meta-row"><span>' + esc(tr('col_dates')) + '</span><span>' + esc(formatDate(p.created)) + ' · ' + esc(formatDate(p.start)) + '</span></div>' +
        '<div class="meta-row"><span>' + esc(tr('col_team')) + '</span><span>' + avatarStackHtml(p.team) + '</span></div>' +
        '</div>' + progressHtml(p) + '<div style="margin-top:10px">' + actionBtns(p.id) + '</div></div>';
    }).join('');
    var delBtn = document.getElementById('btnDeleteSelected');
    if (delBtn) delBtn.disabled = !selectedIds().length;
    var pager = document.getElementById('projectsPager');
    var info = document.getElementById('pagerInfo');
    if (pager) pager.classList.toggle('hidden', state.total <= PAGE_SIZE && state.start === 0);
    if (info) {
      var from = state.total ? state.start + 1 : 0;
      var to = Math.min(state.start + state.rows.length, state.total);
      info.textContent = tr('pager_of').replace('{from}', String(from)).replace('{to}', String(to)).replace('{total}', String(state.total));
    }
    var prev = document.getElementById('btnPrev');
    var next = document.getElementById('btnNext');
    if (prev) prev.disabled = state.start <= 0;
    if (next) next.disabled = state.start + PAGE_SIZE >= state.total;
  }

  async function reload(options) {
    options = options || {};
    var silent = !!options.silent;
    var epoch = state.epoch;
    if (!silent) {
      state.loading = true;
      renderTable();
    }
    try {
      await fetchProjects();
      if (epoch !== state.epoch) return;
      fillFilters();
      renderStats();
      var fp = listFingerprint();
      if (silent && fp === state.listFp) return;
      state.listFp = fp;
    } catch (err) {
      if (epoch !== state.epoch) return;
      if (silent) return;
      var box = document.getElementById('projectsError');
      var txt = document.getElementById('projectsErrorText');
      if (txt) txt.textContent = (err && err.message) || tr('err_failed');
      if (box) box.classList.remove('hidden');
      state.rows = [];
    } finally {
      if (epoch === state.epoch) {
        state.loading = false;
        renderTable();
      }
    }
  }

  function closeProfile() {
    var ov = document.getElementById('profileOverlay');
    if (ov) { ov.classList.add('hidden'); ov.setAttribute('aria-hidden', 'true'); }
  }
  function closeOverlays() {
    closeProfile();
    closeModal();
  }
  function closeModal() {
    var ov = document.getElementById('modalOverlay');
    if (ov) { ov.classList.add('hidden'); ov.setAttribute('aria-hidden', 'true'); }
    var sheet = document.querySelector('#modalOverlay .modal-sheet');
    if (sheet) sheet.classList.remove('modal-sheet--form');
  }
  function openModal(title, bodyHtml, footerHtml, options) {
    options = options || {};
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHtml;
    document.getElementById('modalFooter').innerHTML = footerHtml || '';
    var ov = document.getElementById('modalOverlay');
    ov.classList.remove('hidden');
    ov.setAttribute('aria-hidden', 'false');
    var sheet = document.querySelector('#modalOverlay .modal-sheet');
    if (sheet) sheet.classList.toggle('modal-sheet--form', !!options.form);
  }

  function customerOptions(selected) {
    var html = '<option value="">' + esc(tr('client_ph')) + '</option>';
    state.customers.forEach(function (c) {
      var id = String(c.id || c.customer_id || '');
      var name = pick(c, ['name', 'company', 'full_name', 'customer_name'], '#' + id);
      html += '<option value="' + esc(id) + '"' + (id === String(selected || '') ? ' selected' : '') + '>' + esc(name) + '</option>';
    });
    return html;
  }

  async function tryRoutes(routes, payload) {
    var lastErr = null;
    for (var i = 0; i < routes.length; i += 1) {
      try { return await client().request(routes[i], payload); }
      catch (err) { lastErr = err; }
    }
    throw lastErr || new Error(tr('err_failed'));
  }

  function memberPickHtml() {
    return uniqueTeam().map(function (m) {
      var id = memberId(m); var name = memberName(m) || ('#' + id);
      if (!id) return '';
      return '<label class="team-pick-row"><input type="checkbox" value="' + esc(id) + '"><span class="avatar" style="background:' + colorFor(id) + '">' + esc(initials(name)) + '</span><span>' + esc(name) + '</span></label>';
    }).join('') || '<div class="assign-hint">' + esc(tr('no_team')) + '</div>';
  }
  function parseProjectTags(html) {
    var tags = [];
    var seen = {};
    var wrap = document.createElement('div');
    wrap.innerHTML = html || '';
    wrap.querySelectorAll('.added_tag_project, [data_id]').forEach(function (el) {
      var id = el.getAttribute('data_id') || el.getAttribute('data-id') || '';
      var name = (el.textContent || '').trim();
      if (!id || !name || seen[id]) return;
      seen[id] = true;
      tags.push({ id: String(id), name: name });
    });
    return tags;
  }
  async function loadProjectTags() {
    if (state.projectTags && state.projectTags.length) return state.projectTags;
    var id = ((state.allRows && state.allRows[0]) || state.rows[0] || {}).id;
    if (!id) { state.projectTags = []; return state.projectTags; }
    try {
      var got = await global.MineralBarApp.dashCall('get', { id: id });
      var html = (got && (got.all_tag_of_project || (got.project && got.project.all_tag_of_project))) || '';
      state.projectTags = parseProjectTags(html);
    } catch (e) { state.projectTags = []; }
    if (!state.projectTags.length) {
      state.projectTags = [{ id: '281', name: 'road' }, { id: '', name: 'demo' }];
    }
    return state.projectTags;
  }
  function tagChipsHtml(tags) {
    var chips = '<button type="button" class="tag-chip tag-chip--new" id="fTagNew">' + esc(tr('tag_new')) + '</button>';
    (tags || []).forEach(function (tag) {
      var attr = tag.id ? ('data-tag-id="' + esc(tag.id) + '"') : ('data-tag-name="' + esc(tag.name) + '"');
      chips += '<button type="button" class="tag-chip" ' + attr + '>' + esc(tag.name) + '</button>';
    });
    return chips;
  }
  function syncDefaultUsers() {
    var box = document.getElementById('fDefaultUser');
    if (!box) return;
    var rows = [];
    document.querySelectorAll('#fTeam input[type=checkbox]:checked').forEach(function (el) {
      var id = el.value;
      if (!id) return;
      var name = ((el.closest('label') || {}).textContent || '').trim() || ('#' + id);
      rows.push('<label class="team-pick-row"><input type="checkbox" value="' + esc(id) + '"><span class="avatar" style="background:' + colorFor(id) + '">' + esc(initials(name)) + '</span><span>' + esc(name) + '</span></label>');
    });
    box.innerHTML = rows.join('') || '<div class="assign-hint">' + esc(tr('default_user_ph')) + '</div>';
  }
  function setPrivateProjectMode(on) {
    document.querySelectorAll('.hide-on-private').forEach(function (el) { el.classList.toggle('hidden', !!on); });
  }
  function resetCreateForm() {
    var form = document.getElementById('fCreateForm');
    if (!form) return;
    form.querySelectorAll('input[type=text], textarea').forEach(function (el) { el.value = ''; });
    form.querySelectorAll('select').forEach(function (el) { el.selectedIndex = 0; });
    form.querySelectorAll('input[type=checkbox]').forEach(function (el) {
      el.checked = el.id === 'fShowTag';
    });
    form.querySelectorAll('.tag-chip.is-on').forEach(function (el) { el.classList.remove('is-on'); });
    var extra = document.getElementById('fNewTagRow');
    if (extra) extra.classList.add('hidden');
    setPrivateProjectMode(false);
    syncDefaultUsers();
  }

  function openCreateModal() {
    var initialTags = (state.projectTags && state.projectTags.length) ? state.projectTags : [{ id: '281', name: 'road' }, { id: '', name: 'demo' }];
    openModal(tr('create_title'),
      '<form id="fCreateForm" class="create-form" autocomplete="off">' +
      '<label class="check-row"><input id="fPrivate" type="checkbox" value="1"><span>' + esc(tr('private_project')) + '</span></label>' +
      '<div class="create-grid">' +
      '<div class="field"><label class="field-label">' + esc(tr('project_name')) + ' <span class="req">*</span></label>' +
      '<input id="fName" class="ds-input input" type="text" required placeholder="' + esc(tr('project_name_ph')) + '"></div>' +
      '<div class="field hide-on-private"><label class="field-label">' + esc(tr('client')) + '</label>' +
      '<select id="fClient" class="ds-input input">' + customerOptions() + '</select></div>' +
      '<div class="field hide-on-private"><label class="field-label">' + esc(tr('member')) + '</label>' +
      '<div class="team-pick team-pick--compact" id="fTeam"></div></div>' +
      '<div class="field"><label class="field-label">' + esc(tr('credentials')) + '</label>' +
      '<input id="fCreds" class="ds-input input" type="text" placeholder="' + esc(tr('credentials_ph')) + '"></div>' +
      '<div class="field hide-on-private"><label class="field-label">' + esc(tr('default_user')) + '</label>' +
      '<div class="team-pick team-pick--compact" id="fDefaultUser"><div class="assign-hint">' + esc(tr('default_user_ph')) + '</div></div></div>' +
      '<div class="field field--note"><label class="field-label">' + esc(tr('note')) + '</label>' +
      '<textarea id="fNote" class="ds-input input" rows="4" placeholder="' + esc(tr('note_ph')) + '"></textarea></div>' +
      '</div>' +
      '<label class="check-row"><input id="fShowTag" type="checkbox" value="1" checked><span>' + esc(tr('show_hide_tag')) + '</span></label>' +
      '<div class="field"><div class="field-label">' + esc(tr('tags')) + '</div>' +
      '<div class="tag-row" id="fTags">' + tagChipsHtml(initialTags) + '</div>' +
      '<div id="fNewTagRow" class="new-tag-row hidden"><input id="fNewTagName" class="ds-input input" type="text" placeholder="' + esc(tr('tag_new')) + '">' +
      '<button type="button" class="btn-ghost" id="fAddTagBtn">' + esc(tr('add')) + '</button></div></div>' +
      '<div class="create-flags">' +
      '<label class="check-row"><input id="fAllowMissions" type="checkbox"><span>' + esc(tr('allow_add_missions')) + '</span></label>' +
      '<label class="check-row"><input id="fProjectDone" type="checkbox"><span>' + esc(tr('project_done')) + '</span></label>' +
      '<label class="check-row"><input id="fTemplate" type="checkbox"><span>' + esc(tr('use_as_template')) + '</span></label>' +
      '</div></form>',
      '<button type="button" class="btn-primary" id="fCreateBtn">' + esc(tr('submit')) + '</button>' +
      '<button type="button" class="btn-ghost" id="fResetBtn">' + esc(tr('reset')) + '</button>',
      { form: true }
    );
    var box = document.getElementById('fTeam');
    if (box) box.innerHTML = memberPickHtml();
    var priv = document.getElementById('fPrivate');
    if (priv) priv.addEventListener('change', function () { setPrivateProjectMode(priv.checked); });
    if (box) box.addEventListener('change', syncDefaultUsers);
    var tagsEl = document.getElementById('fTags');
    if (tagsEl) {
      tagsEl.addEventListener('click', function (e) {
        var chip = e.target.closest('.tag-chip');
        if (!chip) return;
        e.preventDefault();
        if (chip.id === 'fTagNew') {
          var row = document.getElementById('fNewTagRow');
          if (row) row.classList.toggle('hidden');
          return;
        }
        chip.classList.toggle('is-on');
      });
    }
    var addTag = document.getElementById('fAddTagBtn');
    if (addTag) {
      addTag.addEventListener('click', function () {
        var input = document.getElementById('fNewTagName');
        var name = ((input && input.value) || '').trim();
        if (!name || !tagsEl) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tag-chip is-on';
        btn.setAttribute('data-tag-name', name);
        btn.textContent = name;
        tagsEl.appendChild(btn);
        if (input) input.value = '';
      });
    }
    var resetBtn = document.getElementById('fResetBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetCreateForm);
    var form = document.getElementById('fCreateForm');
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); submitCreate(); });
    loadProjectTags().then(function (liveTags) {
      var row = document.getElementById('fTags');
      if (!row || !liveTags.length) return;
      row.innerHTML = tagChipsHtml(liveTags);
    }).catch(function () {});
  }

  async function submitCreate() {
    var name = ((document.getElementById('fName') || {}).value || '').trim();
    if (!name) { toast(tr('err_fill')); return; }
    var isPrivate = !!(document.getElementById('fPrivate') || {}).checked;
    var clientEl = document.getElementById('fClient');
    var customerId = isPrivate ? '0' : ((clientEl && clientEl.value) || '');
    var clientName = '';
    if (!isPrivate && clientEl && clientEl.selectedIndex > 0) clientName = clientEl.options[clientEl.selectedIndex].text;
    var ids = [];
    var defaults = [];
    if (!isPrivate) {
      document.querySelectorAll('#fTeam input[type=checkbox]:checked').forEach(function (el) { if (el.value) ids.push(el.value); });
      document.querySelectorAll('#fDefaultUser input[type=checkbox]:checked').forEach(function (el) { if (el.value) defaults.push(el.value); });
    }
    var tags = [];
    document.querySelectorAll('#fTags .tag-chip.is-on[data-tag-id]').forEach(function (el) {
      var id = el.getAttribute('data-tag-id');
      if (id) tags.push(id);
    });
    var payload = {
      name: name,
      project_name: name,
      project_id: '0',
      client_id: customerId || '0',
      customer_id: customerId || '0',
      client_name: clientName,
      credentials: ((document.getElementById('fCreds') || {}).value || '').trim(),
      note: ((document.getElementById('fNote') || {}).value || '').trim(),
      organizations_user: ids,
      team_member_ids: ids,
      default_user: defaults,
      tags: tags,
      private_project: isPrivate ? '1' : '',
      show_hide_tag: (document.getElementById('fShowTag') || {}).checked ? '1' : '',
      allow_add_mission: (document.getElementById('fAllowMissions') || {}).checked ? '1' : '',
      done: (document.getElementById('fProjectDone') || {}).checked ? '1' : '',
      use_as_template: (document.getElementById('fTemplate') || {}).checked ? '1' : ''
    };
    try {
      var res = await global.MineralBarApp.dashCall('save', payload);
      var newId = String((res && (res.id || res.success || res.project_id || (res.data && (res.data.id || res.data.project_id)))) || '');
      if (newId && ids.length) state.assignments[newId] = ids.map(function (id) { return resolveMember(id); }).filter(Boolean);
      closeModal();
      toast(tr('toast_created'));
      state.start = 0;
      await reload();
    } catch (err) {
      toast((err && err.message) || tr('err_failed'));
    }
  }

  function openAssignModal(projectId) {
    var p = state.rows.find(function (r) { return r.id === String(projectId); });
    if (!p) return;
    var selected = {};
    p.team.forEach(function (m) { if (m.id) selected[m.id] = true; });
    openModal(tr('assign_title'),
      '<div class="project-name">' + esc(p.name) + '</div>' +
      '<div class="team-pick" id="aTeam">' +
      uniqueTeam().map(function (m) {
        var id = memberId(m); var name = memberName(m) || ('#' + id);
        return '<label class="team-pick-row"><input type="checkbox" value="' + esc(id) + '"' + (selected[id] ? ' checked' : '') + '>' +
          '<span class="avatar" style="background:' + colorFor(id) + '">' + esc(initials(name)) + '</span><span>' + esc(name) + '</span></label>';
      }).join('') + '</div>',
      '<button type="button" class="btn-ghost" data-modal-close>' + esc(tr('cancel')) + '</button>' +
      '<button type="button" class="btn-primary" id="aSaveBtn" data-pid="' + esc(p.id) + '">' + esc(tr('save')) + '</button>'
    );
  }

  async function submitAssign(projectId) {
    var ids = [];
    document.querySelectorAll('#aTeam input[type=checkbox]:checked').forEach(function (el) { if (el.value) ids.push(el.value); });
    var p = state.rows.find(function (r) { return r.id === String(projectId); }) || {};
    try {
      var got = await global.MineralBarApp.dashCall('get', { id: projectId });
      var proj = (got && got.project) || {};
      await global.MineralBarApp.dashCall('save', {
        project_name: proj.name || p.name,
        project_id: projectId,
        client_id: proj.client_id || p.customerId || '0',
        credentials: proj.credentials || '',
        note: proj.note || '',
        organizations_user: ids,
        team_member_ids: ids
      });
      state.assignments[projectId] = ids.map(function (id) { return resolveMember(id); }).filter(Boolean);
      closeModal();
      toast(tr('toast_assigned'));
      await reload();
    } catch (err) {
      state.assignments[projectId] = ids.map(function (id) { return resolveMember(id); }).filter(Boolean);
      closeModal();
      toast((err && err.message) || tr('toast_assigned'));
      renderTable();
      renderStats();
    }
  }

  async function deleteProjects(ids) {
    if (!ids.length) return;
    if (!global.confirm(ids.length > 1 ? tr('confirm_delete_many') : tr('confirm_delete'))) return;
    var failed = [];
    var lastErr = '';
    var uid = '';
    var selfId = '';
    try {
      var user = global.MineralBarApp.getUser() || {};
      selfId = String(user.id || user.user_id || '');
      uid = selfId;
    } catch (e) { uid = ''; }
    for (var i = 0; i < ids.length; i += 1) {
      try {
        await global.MineralBarApp.dashCall('delete', {
          id: ids[i],
          data_id: ids[i],
          user_id: uid,
          self_id: selfId
        });
      } catch (err) {
        failed.push(ids[i]);
        lastErr = (err && err.message) || lastErr;
      }
    }
    ids.forEach(function (id) { delete state.selected[id]; });
    toast(failed.length === ids.length ? (lastErr || tr('err_failed')) : tr('toast_deleted'));
    await reload();
  }

  var COL_COLOR = {
    testing: '#7ec8e3', done: '#2ecc71', queries: '#f1c40f', to_do: '#e91e8c',
    project: '#0a2194', place_order: '#25654f', other: '#a1a1a1',
    send_pictures: '#a97d32', send_offer: '#aa3190', Follow_up: '#111111'
  };
  var COL_I18N = {
    testing: 'board_col_testing', done: 'board_col_done', queries: 'board_col_queries',
    to_do: 'board_col_to_do', project: 'board_col_project', place_order: 'board_col_place_order',
    other: 'board_col_other', send_pictures: 'board_col_send_pictures',
    send_offer: 'board_col_send_offer', Follow_up: 'board_col_follow_up'
  };

  function columnLabel(col) {
    var key = COL_I18N[col.key];
    if (key && global.MineralBarI18n.getLang() === 'en') return tr(key);
    return col.label || (key ? tr(key) : col.key);
  }

  function setShellBoard(on) {
    var outer = document.querySelector('.phone-outer');
    var wrap = document.getElementById('appRoot') || document.querySelector('.page-wrap');
    if (outer) outer.classList.toggle('is-board', !!on);
    if (wrap) wrap.classList.toggle('is-board', !!on);
    document.body.classList.toggle('board-open', !!on);
  }

  function openBoard(projectId) {
    global.location.hash = 'board/' + encodeURIComponent(String(projectId));
  }

  async function loadBoard(projectId, options) {
    options = options || {};
    var silent = !!options.silent;
    var epoch = state.epoch;
    if (state.dragging) return;
    var loading = document.getElementById('boardLoading');
    var err = document.getElementById('boardError');
    if (!silent && loading) loading.classList.remove('hidden');
    if (!silent && err) err.classList.add('hidden');
    try {
      await global.MineralBarApp.ensureDashboardSession();
      if (epoch !== state.epoch) return;
      var raw = await global.MineralBarApp.dashCall('board', { id: projectId, project_id: projectId });
      if (epoch !== state.epoch || accountKey() !== state.ownerKey) return;
      raw.id = String(raw.id || projectId);
      var fp = boardFingerprint(raw);
      if (silent && fp === state.boardFp && String((state.board && state.board.id) || '') === String(projectId)) return;
      if (state.dragging) return;
      state.board = raw;
      state.board.id = String(raw.id || projectId);
      state.boardFp = fp;
      if (!silent) state.chartPage = 0;
      renderBoard();
    } catch (e) {
      if (epoch !== state.epoch) return;
      if (silent) return;
      var txt = document.getElementById('boardErrorText');
      if (txt) txt.textContent = (e && e.message) || tr('err_failed');
      if (err) err.classList.remove('hidden');
      state.board = { id: String(projectId), columns: [], team: [] };
      renderBoard();
    } finally {
      if (epoch === state.epoch && loading) loading.classList.add('hidden');
    }
  }

  function renderBoard() {
    var board = state.board || {};
    var nameEl = document.getElementById('boardProjectName');
    var teamEl = document.getElementById('boardTeam');
    var clientEl = document.getElementById('boardClient');
    var colsEl = document.getElementById('boardColumns');
    if (nameEl) nameEl.textContent = board.name || board.title || ('#' + (board.id || ''));
    if (teamEl) {
      var team = (board.team || []).map(function (m) {
        return { id: String(m.id || ''), name: m.name || ('#' + m.id), color: colorFor(m.id || m.name) };
      });
      teamEl.innerHTML = avatarStackHtml(team);
    }
    if (clientEl) {
      if (board.client_name) {
        clientEl.innerHTML = '<span class="avatar" style="background:' + colorFor(board.client_name) + '">' +
          esc(initials(board.client_name)) + '</span><span>' + esc(board.client_name) + '</span>';
      } else {
        clientEl.innerHTML = '<span class="assign-hint">' + esc(tr('no_client')) + '</span>';
      }
    }
    if (!colsEl) return;
    var q = String(state.boardSearch || '').toLowerCase();
    colsEl.innerHTML = (board.columns || []).map(function (col) {
      var color = col.color || COL_COLOR[col.key] || '#1d60a2';
      var missions = (col.missions || []).filter(function (m) {
        if (!q) return true;
        return String(m.title || '').toLowerCase().indexOf(q) !== -1;
      });
      var cards = missions.map(function (m) {
        var who = (m.assignees || []).slice(0, 2).join(', ');
        return '<article class="mission-card" draggable="true" data-mission="' + esc(m.id) + '" data-col="' + esc(col.key) + '">' +
          '<div class="mission-card-title">' + esc(m.title || tr('add_mission')) + '</div>' +
          '<div class="mission-card-meta"><span>' + esc(who || tr('no_team')) + '</span><span>' + esc(m.date || '') + '</span></div></article>';
      }).join('');
      return '<section class="board-col" data-col="' + esc(col.key) + '" style="--col-color:' + esc(color) + '">' +
        '<div class="board-col-head"><span class="board-col-title">' + esc(columnLabel(col)) + '</span>' +
        '<span class="board-col-count">' + missions.length + '</span></div>' +
        '<div class="board-col-list" data-col-list="' + esc(col.key) + '">' + cards + '</div>' +
        (col.can_add !== false ? '<button type="button" class="board-add-mission" data-add-mission="' + esc(col.key) + '">' +
          esc(tr('add_mission')) + '</button>' : '') +
        '</section>';
    }).join('');
    bindBoardDnD();
    renderBoardChart();
  }

  function chartSlices() {
    var board = state.board || {};
    var cols = board.columns || [];
    return cols.map(function (col) {
      return {
        key: col.key,
        label: columnLabel(col),
        color: col.color || COL_COLOR[col.key] || '#1d60a2',
        value: (col.missions || []).length
      };
    });
  }

  function donutArc(cx, cy, r0, r1, a0, a1) {
    var large = (a1 - a0) > Math.PI ? 1 : 0;
    function pt(r, a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    var p0 = pt(r1, a0); var p1 = pt(r1, a1); var p2 = pt(r0, a1); var p3 = pt(r0, a0);
    return 'M ' + p0[0] + ' ' + p0[1] +
      ' A ' + r1 + ' ' + r1 + ' 0 ' + large + ' 1 ' + p1[0] + ' ' + p1[1] +
      ' L ' + p2[0] + ' ' + p2[1] +
      ' A ' + r0 + ' ' + r0 + ' 0 ' + large + ' 0 ' + p3[0] + ' ' + p3[1] + ' Z';
  }

  function renderBoardChart() {
    var svg = document.getElementById('boardDonut');
    var legend = document.getElementById('boardChartLegend');
    var pageEl = document.getElementById('boardChartPage');
    var slices = chartSlices();
    var PAGE = 5;
    var pages = Math.max(1, Math.ceil(slices.length / PAGE));
    if (state.chartPage >= pages) state.chartPage = pages - 1;
    if (state.chartPage < 0) state.chartPage = 0;
    var total = slices.reduce(function (n, s) { return n + s.value; }, 0);
    var drawn = slices.filter(function (s) { return s.value > 0; });
    if (!drawn.length) {
      drawn = [{ color: '#e6e8ec', value: 1, label: '' }];
      total = 1;
    }
    if (svg) {
      var html = '';
      var start = -Math.PI / 2;
      var gap = drawn.length > 1 ? 0.06 : 0;
      drawn.forEach(function (s) {
        var sweep = (s.value / total) * Math.PI * 2 - gap;
        if (sweep < 0.02) sweep = 0.02;
        html += '<path fill="' + esc(s.color) + '" d="' + donutArc(50, 50, 28, 46, start, start + sweep) + '"></path>';
        start += sweep + gap;
      });
      svg.innerHTML = html;
    }
    if (legend) {
      var startIdx = state.chartPage * PAGE;
      legend.innerHTML = slices.slice(startIdx, startIdx + PAGE).map(function (s) {
        return '<li><span class="board-chart-dot" style="background:' + esc(s.color) + '"></span>' + esc(s.label) + '</li>';
      }).join('');
    }
    if (pageEl) pageEl.textContent = (state.chartPage + 1) + '/' + pages;
    document.querySelectorAll('[data-chart-page]').forEach(function (btn) {
      var dir = Number(btn.getAttribute('data-chart-page'));
      btn.disabled = (dir < 0 && state.chartPage <= 0) || (dir > 0 && state.chartPage >= pages - 1);
    });
  }

  function bindBoardDnD() {
    var root = document.getElementById('boardColumns');
    if (!root) return;
    root.querySelectorAll('.mission-card').forEach(function (card) {
      card.addEventListener('dragstart', function (e) {
        state.dragging = true;
        card.classList.add('is-dragging');
        e.dataTransfer.setData('text/plain', card.getAttribute('data-mission'));
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', function () {
        state.dragging = false;
        card.classList.remove('is-dragging');
      });
    });
    root.querySelectorAll('[data-col]').forEach(function (col) {
      col.addEventListener('dragover', function (e) {
        e.preventDefault();
        col.classList.add('is-drop');
      });
      col.addEventListener('dragleave', function () { col.classList.remove('is-drop'); });
      col.addEventListener('drop', function (e) {
        e.preventDefault();
        col.classList.remove('is-drop');
        var id = e.dataTransfer.getData('text/plain');
        var toCol = col.getAttribute('data-col');
        if (id && toCol) moveMission(id, toCol);
      });
    });
  }

  async function moveMission(missionId, colId) {
    var board = state.board || {};
    var fromCol = null;
    var mission = null;
    (board.columns || []).forEach(function (c) {
      (c.missions || []).forEach(function (m) {
        if (String(m.id) === String(missionId)) { fromCol = c; mission = m; }
      });
    });
    if (!mission || !fromCol || fromCol.key === colId) return;
    fromCol.missions = fromCol.missions.filter(function (m) { return String(m.id) !== String(missionId); });
    var dest = (board.columns || []).find(function (c) { return c.key === colId; });
    if (!dest) return;
    dest.missions = dest.missions || [];
    dest.missions.unshift(mission);
    renderBoard();
    try {
      await global.MineralBarApp.dashCall('move_mission', {
        mission_id: missionId,
        project_id: board.id,
        col_id: colId,
        order: dest.missions.map(function (m) { return m.id; })
      });
      toast(tr('toast_mission_moved'));
    } catch (err) {
      toast((err && err.message) || tr('err_failed'));
      await loadBoard(board.id);
    }
  }

  function openAddMission(colKey) {
    var board = state.board || {};
    var team = board.team && board.team.length ? board.team : uniqueTeam();
    openModal(tr('add_mission'),
      '<div class="field"><label class="field-label">' + esc(tr('mission_text')) + ' <span class="req">*</span></label>' +
      '<textarea id="mText" class="ds-input input" rows="4" required></textarea></div>' +
      '<div class="field"><label class="field-label">' + esc(tr('assign_team')) + '</label><div class="team-pick" id="mTeam"></div></div>',
      '<button type="button" class="btn-ghost" data-modal-close>' + esc(tr('cancel')) + '</button>' +
      '<button type="button" class="btn-primary" id="mCreateBtn" data-col="' + esc(colKey) + '">' + esc(tr('create')) + '</button>'
    );
    var box = document.getElementById('mTeam');
    if (box) {
      box.innerHTML = team.map(function (m) {
        var id = memberId(m) || m.id; var name = memberName(m) || m.name || ('#' + id);
        return '<label class="team-pick-row"><input type="checkbox" value="' + esc(id) + '"><span class="avatar" style="background:' + colorFor(id) + '">' + esc(initials(name)) + '</span><span>' + esc(name) + '</span></label>';
      }).join('') || '<div class="assign-hint">' + esc(tr('no_team')) + '</div>';
    }
  }

  async function submitAddMission(colKey) {
    var text = ((document.getElementById('mText') || {}).value || '').trim();
    if (!text) { toast(tr('err_fill')); return; }
    var ids = [];
    document.querySelectorAll('#mTeam input[type=checkbox]:checked').forEach(function (el) { if (el.value) ids.push(el.value); });
    var board = state.board || {};
    try {
      await global.MineralBarApp.dashCall('create_mission', {
        project_id: board.id,
        message: text,
        project_column: colKey,
        data_mission_type: colKey,
        customer_id: board.client_id || '0',
        organizations_user: ids
      });
      closeModal();
      toast(tr('toast_mission_created'));
      await loadBoard(board.id);
    } catch (err) {
      toast((err && err.message) || tr('err_failed'));
    }
  }

  function bindBoard() {
    var root = document.querySelector('[data-view="board"]');
    if (!root || root.__bound) return;
    root.__bound = true;
    var back = document.getElementById('btnBoardBack');
    if (back) back.addEventListener('click', function () { global.location.hash = 'projects'; });
    var refresh = document.getElementById('btnBoardRefresh');
    if (refresh) refresh.addEventListener('click', function () { if (state.board && state.board.id) loadBoard(state.board.id); });
    var search = document.getElementById('boardSearch');
    var t = null;
    if (search) {
      search.addEventListener('input', function () {
        clearTimeout(t);
        t = setTimeout(function () { state.boardSearch = search.value.trim(); renderBoard(); }, 200);
      });
    }
    root.addEventListener('click', function (e) {
      var add = e.target.closest('[data-add-mission]');
      if (add) { e.preventDefault(); openAddMission(add.getAttribute('data-add-mission')); return; }
      var pageBtn = e.target.closest('[data-chart-page]');
      if (pageBtn && !pageBtn.disabled) {
        e.preventDefault();
        state.chartPage += Number(pageBtn.getAttribute('data-chart-page')) || 0;
        renderBoardChart();
      }
    });
  }

  async function bootBoard(projectId) {
    var ok = await MineralBarApp.ensureAuth('index.html#login');
    if (!ok) return;
    var uid = accountKey();
    var switched = !state.ownerKey || state.ownerKey !== uid;
    if (switched) resetWorkspace();
    state.ownerKey = uid;
    state.dashReady = false;
    setShellBoard(true);
    showView('board');
    MineralBarI18n.apply();
    fillProfile();
    bindBoard();
    wireLiveUpdates();
    MineralBarApp.connectRealtime().catch(function () { /* poll keeps the board live */ });
    try { await global.MineralBarApp.ensureDashboardSession({ force: switched }); } catch (dashErr) { /* loadBoard will show the error */ }
    if (accountKey() === uid) state.dashReady = true;
    await loadBoard(projectId);
  }

  function currentView() {
    var page = (global.location.hash || '').replace(/^#/, '');
    if (page.indexOf('?') !== -1) page = page.slice(0, page.indexOf('?'));
    if (page.indexOf('board/') === 0) return 'board';
    if (page === 'projects') return 'projects';
    if (!page && global.MineralBarApp && MineralBarApp.isAuthenticated()) return 'projects';
    return 'login';
  }
  function eventProjectId(detail) {
    var ev = (detail && detail.event) || detail || {};
    var bags = [ev, ev.payload, ev.data, ev.body, ev.extra_array, ev.all_data_array];
    for (var i = 0; i < bags.length; i += 1) {
      var bag = bags[i];
      if (!bag || typeof bag !== 'object') continue;
      var id = bag.project_id || bag.projectId || bag.data_project || bag.project;
      if (id && id !== true) return String(id);
    }
    return '';
  }
  function isLiveProjectEvent(detail) {
    var key = String((detail && detail.key) || '');
    var group = detail && detail.group;
    if (group === 'projects' || group === 'missions') return true;
    return /project|mission|task|kanban|board|newMission|projectQuery/i.test(key);
  }

  var liveTimer = null;
  var livePoll = null;
  var liveWired = false;

  function scheduleLiveSync(detail) {
    if (!global.MineralBarApp || !MineralBarApp.isAuthenticated || !MineralBarApp.isAuthenticated()) return;
    if (liveTimer) clearTimeout(liveTimer);
    liveTimer = setTimeout(function () {
      liveTimer = null;
      applyLiveSync(detail).catch(function () {});
    }, 280);
  }
  async function applyLiveSync(detail) {
    if (state.liveSyncing || state.dragging || state.loading || !state.dashReady) return;
    if (!global.MineralBarApp || !MineralBarApp.isAuthenticated || !MineralBarApp.isAuthenticated()) return;
    var view = currentView();
    if (view === 'login') return;
    var pid = eventProjectId(detail);
    if (view === 'board' && pid && state.board && String(state.board.id) !== pid) return;
    state.liveSyncing = true;
    try {
      if (view === 'board' && state.board && state.board.id) await loadBoard(state.board.id, { silent: true });
      else if (view === 'projects') await reload({ silent: true });
    } finally {
      state.liveSyncing = false;
    }
  }
  function paintLiveChips() {
    var chips = document.querySelectorAll('[data-live-chip]');
    var st = { connected: false, status: 'off' };
    try {
      if (global.MineralBarApp && MineralBarApp.getRealtimeState) st = MineralBarApp.getRealtimeState() || st;
    } catch (e) { /* ignore */ }
    var on = !!(st.connected && st.status === 'ready');
    chips.forEach(function (el) {
      el.classList.toggle('live-on', on);
      el.classList.toggle('live-off', !on);
      var label = el.querySelector('[data-live-label]');
      if (label) {
        label.setAttribute('data-i18n', on ? 'live_socket_on' : 'live_socket_off');
        label.textContent = on ? tr('live_socket_on') : tr('live_socket_off');
      }
    });
  }
  function wireLiveUpdates() {
    if (liveWired) {
      paintLiveChips();
      return;
    }
    liveWired = true;
    paintLiveChips();
    global.addEventListener('mineralbar:socket', paintLiveChips);
    global.addEventListener('mineralbar:socket-status', paintLiveChips);
    global.addEventListener('mineralbar:lang', paintLiveChips);
    global.addEventListener('mineralbar:realtime', function (e) {
      if (!isLiveProjectEvent(e.detail)) return;
      scheduleLiveSync(e.detail);
    });
    global.addEventListener('mineralbar:projects', function (e) { scheduleLiveSync(e.detail); });
    global.addEventListener('mineralbar:missions', function (e) { scheduleLiveSync(e.detail); });
    global.addEventListener('visibilitychange', function () {
      if (!document.hidden) scheduleLiveSync({ key: 'visibility' });
    });
    setInterval(paintLiveChips, 4000);
    livePoll = setInterval(function () {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (!global.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
      if (!state.dashReady || state.loading) return;
      if (currentView() === 'login') return;
      scheduleLiveSync({ key: 'poll' });
    }, 8000);
  }

  function fillProfile() {
    var user = global.MineralBarApp.getUser() || {};
    var name = user.name || user.full_name || user.username || global.MineralBarApp.getEmail() || '—';
    var email = user.email || global.MineralBarApp.getEmail() || '—';
    var role = global.MineralBarApp.getRole() || 'sales';
    document.querySelectorAll('[data-profile-initials]').forEach(function (el) { el.textContent = initials(name); });
    var n = document.getElementById('profileName');
    var e = document.getElementById('profileEmail');
    var r = document.getElementById('profileRole');
    if (n) n.textContent = name;
    if (e) e.textContent = email;
    if (r) r.textContent = tr('role_' + role) || role;
  }

  function showView(page) {
    document.querySelectorAll('.app-view').forEach(function (el) {
      el.classList.toggle('hidden', el.getAttribute('data-view') !== page);
    });
    if (page === 'login') {
      closeOverlays();
      resetWorkspace();
    }
    var brand = global.MineralBarApp.getBrandName();
    document.title = page === 'login' ? tr('page_login_title')
      : page === 'board' ? (tr('page_board_title') + ' — ' + brand)
      : (tr('page_projects_title') + ' — ' + brand);
    setShellBoard(page === 'board');
  }

  function initLogin() {
    var form = document.getElementById('loginForm');
    if (!form || form.__bound) return;
    form.__bound = true;
    var usernameEl = document.getElementById('username');
    var passwordEl = document.getElementById('password');
    var usernameWrap = document.getElementById('usernameWrap');
    var passwordWrap = document.getElementById('passwordWrap');
    var otpEl = document.getElementById('otp');
    var otpWrap = document.getElementById('otpWrap');
    var errorBox = document.getElementById('errorBox');
    var errorText = document.getElementById('errorText');
    var loginBtn = document.getElementById('loginBtn');
    var loginBtnText = document.getElementById('loginBtnText');
    var rememberEl = document.getElementById('remember');
    var resendBtn = document.getElementById('resendOtpBtn');
    var resendText = document.getElementById('resendOtpText');
    var waitingOtp = false;
    var requestInFlight = false;
    var cooldownUntil = 0;
    var cooldownTimer = null;
    var resendCooldownUntil = 0;
    var resendTimer = null;
    var activeErrorKey = '';

    function showError(msg, translationKey) {
      activeErrorKey = translationKey || '';
      errorText.textContent = msg || tr('err_generic');
      errorBox.classList.remove('hidden');
    }
    function showErrorKey(key) { showError(tr(key), key); }
    function clearError() { activeErrorKey = ''; errorBox.classList.add('hidden'); errorText.textContent = ''; }
    function setLoginBtnLabel() {
      loginBtnText.removeAttribute('data-i18n');
      loginBtnText.textContent = waitingOtp ? tr('login_btn_otp') : tr('login_btn');
    }
    function setResendLabel(secondsLeft) {
      if (!resendText) return;
      resendText.removeAttribute('data-i18n');
      resendText.textContent = secondsLeft > 0 ? tr('resend_otp_wait').replace('{s}', String(secondsLeft)) : tr('resend_otp');
    }
    function setRequestBusy(busy, source) {
      requestInFlight = busy;
      var rateLimited = Date.now() < cooldownUntil;
      loginBtn.disabled = busy || rateLimited;
      if (resendBtn) {
        resendBtn.disabled = busy || rateLimited || Date.now() < resendCooldownUntil;
        if (source === 'resend') {
          if (busy && resendText) { resendText.removeAttribute('data-i18n'); resendText.textContent = tr('resend_otp_sending'); }
          else if (Date.now() >= resendCooldownUntil) setResendLabel(0);
        }
      }
    }
    function startResendCooldown(seconds) {
      if (!resendBtn) return;
      resendCooldownUntil = Date.now() + (seconds * 1000);
      if (resendTimer) clearInterval(resendTimer);
      resendBtn.disabled = true;
      function tick() {
        var left = Math.ceil((resendCooldownUntil - Date.now()) / 1000);
        if (left <= 0) {
          clearInterval(resendTimer); resendTimer = null; resendCooldownUntil = 0; setResendLabel(0);
          resendBtn.disabled = requestInFlight || Date.now() < cooldownUntil; return;
        }
        setResendLabel(left);
      }
      tick();
      resendTimer = setInterval(tick, 1000);
    }
    function enterOtpMode() {
      waitingOtp = true;
      if (usernameWrap) usernameWrap.classList.add('hidden');
      if (passwordWrap) passwordWrap.classList.add('hidden');
      otpWrap.classList.remove('hidden');
      setLoginBtnLabel();
      showErrorKey('err_otp_needed');
      startResendCooldown(20);
      otpEl.focus();
    }
    function getRetrySeconds(err) {
      var raw = (err && err.raw) || {};
      var value = raw.retry_after || raw.retryAfter || raw.wait_seconds || raw.waitSeconds;
      var seconds = Number(value);
      if (Number.isFinite(seconds) && seconds > 0) return Math.min(Math.ceil(seconds), 3600);
      var message = String(raw.message || (err && err.message) || '');
      var minuteMatch = message.match(/wait\s+(\d+)\s+minutes?/i);
      if (minuteMatch) return Math.min(Number(minuteMatch[1]) * 60, 3600);
      var secondMatch = message.match(/wait\s+(\d+)\s+seconds?/i);
      if (secondMatch) return Math.min(Number(secondMatch[1]), 3600);
      if ((err && Number(err.status) === 429) || /too many login attempts/i.test(message)) return 60;
      return 0;
    }
    function startLoginCooldown(seconds) {
      cooldownUntil = Date.now() + (seconds * 1000);
      if (cooldownTimer) clearInterval(cooldownTimer);
      function tick() {
        var remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
        if (!remaining) {
          clearInterval(cooldownTimer); cooldownTimer = null; cooldownUntil = 0;
          setRequestBusy(false, 'login'); setLoginBtnLabel(); clearError(); return;
        }
        var minutes = Math.floor(remaining / 60);
        var secs = String(remaining % 60).padStart(2, '0');
        var countdown = String(minutes).padStart(2, '0') + ':' + secs;
        loginBtn.disabled = true;
        if (resendBtn) resendBtn.disabled = true;
        loginBtnText.textContent = tr('try_again_in') + ' ' + countdown;
        showError(tr('err_rate_limit_generic') + ' ' + tr('try_again_in') + ': ' + countdown);
      }
      tick();
      cooldownTimer = setInterval(tick, 1000);
    }
    function localizedLoginErrorKey(err, fallbackKey) {
      var raw = (err && err.raw) || {};
      var status = Number((err && err.status) || raw.status || 0);
      var message = String(raw.message || raw.error || (err && err.message) || '').toLowerCase();
      if (err && err.code === 'INVALID_OTP') return 'err_invalid_otp';
      if ((err && err.name === 'TypeError') || /failed to fetch|network.?error|network request failed/i.test(message)) return 'err_network';
      if (status === 400 || status === 401 || /invalid credentials|incorrect (?:email|username|password)|wrong password|user not found|login failed/i.test(message)) return 'err_invalid_credentials';
      return fallbackKey || 'err_failed';
    }
    function handleLoginError(err, fallbackKey) {
      var retrySeconds = getRetrySeconds(err);
      if (retrySeconds) { startLoginCooldown(retrySeconds); return true; }
      showErrorKey(localizedLoginErrorKey(err, fallbackKey));
      return false;
    }
    function isOtpValidationError(err) {
      var raw = (err && err.raw) || {};
      var status = Number((err && err.status) || raw.status || 0);
      var message = String(raw.message || (err && err.message) || '').toLowerCase();
      if (err && err.code === 'INVALID_OTP') return true;
      if (status === 400 || status === 401) return true;
      return /(otp|one.?time|verification).*(invalid|wrong|incorrect|expired)/i.test(message);
    }

    global.addEventListener('mineralbar:lang', function () {
      if (Date.now() >= cooldownUntil) setLoginBtnLabel();
      if (activeErrorKey && Date.now() >= cooldownUntil) showErrorKey(activeErrorKey);
      if (resendCooldownUntil > Date.now()) setResendLabel(Math.ceil((resendCooldownUntil - Date.now()) / 1000));
      else setResendLabel(0);
    });

    try {
      var email = MineralBarApp.getEmail() || '';
      if (email) usernameEl.value = email;
      var rememberOn = localStorage.getItem('biz1fs_remember') === '1';
      if (rememberOn) {
        rememberEl.checked = true;
        var saved = null;
        try { saved = JSON.parse(decodeURIComponent(escape(atob(localStorage.getItem('biz1fs_cred') || '')))); } catch (e) { saved = null; }
        if (saved && saved.password) passwordEl.value = saved.password;
        if (saved && saved.username && !usernameEl.value) usernameEl.value = saved.username;
      }
    } catch (e) { /* ignore */ }

    document.getElementById('togglePassword').addEventListener('click', function () {
      passwordEl.type = passwordEl.type === 'password' ? 'text' : 'password';
    });

    if (resendBtn && !resendBtn.__bound) {
      resendBtn.__bound = true;
      resendBtn.addEventListener('click', async function () {
        if (!waitingOtp || requestInFlight || Date.now() < cooldownUntil || Date.now() < resendCooldownUntil) return;
        clearError();
        var username = usernameEl.value.trim();
        var password = passwordEl.value;
        if (!username || !password) { showErrorKey('err_fill'); return; }
        setRequestBusy(true, 'resend');
        try {
          var result = await MineralBarApp.login({ username: username, password: password, otp: '', remember: !!(rememberEl && rememberEl.checked) });
          if (result && result.otpRequired) { otpEl.value = ''; enterOtpMode(); return; }
          if (result && result.ok) {
            resetWorkspace();
            global.location.hash = 'projects';
            return;
          }
          showErrorKey('err_resend_otp');
        } catch (err) { handleLoginError(err, 'err_resend_otp'); }
        finally { setRequestBusy(false, 'resend'); }
      });
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (requestInFlight || Date.now() < cooldownUntil) return;
      clearError();
      var username = usernameEl.value.trim();
      var password = passwordEl.value;
      var otp = waitingOtp ? otpEl.value.trim() : '';
      var remember = !!(rememberEl && rememberEl.checked);
      if (!username || !password) { showErrorKey('err_fill'); return; }
      if (waitingOtp && !otp) { showErrorKey('err_otp'); return; }
      setRequestBusy(true, 'login');
      loginBtnText.textContent = waitingOtp ? tr('verifying') : tr('logging_in');
      try {
        var result = await MineralBarApp.login({ username: username, password: password, otp: otp, remember: remember });
        if (result.otpRequired) {
          if (waitingOtp && otp) { showErrorKey('err_invalid_otp'); otpEl.select(); return; }
          enterOtpMode();
          return;
        }
        if (result.ok) {
          resetWorkspace();
          global.location.hash = 'projects';
          return;
        }
        showErrorKey('err_failed');
      } catch (err) {
        if (waitingOtp && otp && !getRetrySeconds(err) && isOtpValidationError(err)) {
          showErrorKey('err_invalid_otp'); otpEl.select();
        } else handleLoginError(err);
      } finally {
        setRequestBusy(false, 'login');
        if (Date.now() >= cooldownUntil) setLoginBtnLabel();
      }
    });
  }

  function bindProjects() {
    var root = document.querySelector('[data-view="projects"]');
    if (!root || root.__bound) return;
    root.__bound = true;
    var search = document.getElementById('projectSearch');
    var t = null;
    if (search) {
      search.addEventListener('input', function () {
        clearTimeout(t);
        t = setTimeout(function () { state.search = search.value.trim(); state.start = 0; reload(); }, 350);
      });
    }
    var teamEl = document.getElementById('teamFilter');
    if (teamEl) teamEl.addEventListener('change', function () { state.teamMemberId = teamEl.value; state.start = 0; reload(); });
    var refresh = document.getElementById('btnRefresh');
    if (refresh) refresh.addEventListener('click', function () { reload(); });
    var prev = document.getElementById('btnPrev');
    var next = document.getElementById('btnNext');
    if (prev) prev.addEventListener('click', function () { state.start = Math.max(0, state.start - PAGE_SIZE); reload(); });
    if (next) next.addEventListener('click', function () { state.start += PAGE_SIZE; reload(); });
    var newBtn = document.getElementById('btnNewProject');
    if (newBtn) newBtn.addEventListener('click', openCreateModal);
    var delBtn = document.getElementById('btnDeleteSelected');
    if (delBtn) delBtn.addEventListener('click', function () { deleteProjects(selectedIds()); });
    var selectAll = document.getElementById('selectAll');
    if (selectAll) {
      selectAll.addEventListener('change', function () {
        state.rows.forEach(function (p) { state.selected[p.id] = selectAll.checked; });
        renderTable();
      });
    }
    document.addEventListener('click', function (e) {
      var sel = e.target.closest('[data-select]');
      if (sel) {
        state.selected[sel.getAttribute('data-select')] = sel.checked;
        var del = document.getElementById('btnDeleteSelected');
        if (del) del.disabled = !selectedIds().length;
        return;
      }
      var assign = e.target.closest('[data-assign]');
      if (assign) { e.preventDefault(); openAssignModal(assign.getAttribute('data-assign')); return; }
      var delOne = e.target.closest('[data-del]');
      if (delOne) { e.preventDefault(); deleteProjects([delOne.getAttribute('data-del')]); return; }
      var openBoardBtn = e.target.closest('[data-open-board]');
      if (openBoardBtn) { e.preventDefault(); openBoard(openBoardBtn.getAttribute('data-open-board')); return; }
      if (e.target.closest('#fCreateBtn')) { submitCreate(); return; }
      var saveBtn = e.target.closest('#aSaveBtn');
      if (saveBtn) { submitAssign(saveBtn.getAttribute('data-pid')); return; }
    });
  }

  function bindChrome() {
    document.querySelectorAll('[data-set-lang]').forEach(function (btn) {
      if (btn.__bound) return;
      btn.__bound = true;
      btn.addEventListener('click', function () { MineralBarI18n.setLang(btn.getAttribute('data-set-lang')); });
    });
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      if (btn.__bound) return;
      btn.__bound = true;
      btn.addEventListener('click', function () {
        MineralBarI18n.setTheme(MineralBarI18n.getTheme() === 'dark' ? 'light' : 'dark');
      });
    });
    document.querySelectorAll('[data-profile-open]').forEach(function (btn) {
      if (btn.__bound) return;
      btn.__bound = true;
      btn.addEventListener('click', function () {
        fillProfile();
        var ov = document.getElementById('profileOverlay');
        ov.classList.remove('hidden'); ov.setAttribute('aria-hidden', 'false');
      });
    });
    document.querySelectorAll('[data-profile-close]').forEach(function (btn) {
      if (btn.__bound) return;
      btn.__bound = true;
      btn.addEventListener('click', function () {
        var ov = document.getElementById('profileOverlay');
        ov.classList.add('hidden'); ov.setAttribute('aria-hidden', 'true');
      });
    });
    document.querySelectorAll('[data-modal-close]').forEach(function (btn) {
      if (btn.__bound) return;
      btn.__bound = true;
      btn.addEventListener('click', closeModal);
    });
    var logout = document.getElementById('logoutBtn');
    if (logout && !logout.__bound) {
      logout.__bound = true;
      logout.addEventListener('click', function () {
        closeOverlays();
        resetWorkspace();
        Promise.resolve(MineralBarApp.clearSession()).finally(function () {
          global.location.hash = 'login';
        });
      });
    }
    global.addEventListener('mineralbar:session-cleared', function () {
      resetWorkspace();
      closeOverlays();
    });
    global.addEventListener('mineralbar:lang', function () {
      MineralBarI18n.apply();
      fillFilters();
      renderTable();
      renderStats();
      fillProfile();
      if (state.board) renderBoard();
    });
    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('[data-modal-close]')) closeModal();
      var mCreate = e.target && e.target.closest && e.target.closest('#mCreateBtn');
      if (mCreate) { submitAddMission(mCreate.getAttribute('data-col')); }
    });
  }

  async function bootProjects() {
    var ok = await MineralBarApp.ensureAuth('index.html#login');
    if (!ok) return;
    var uid = accountKey();
    var switched = !state.ownerKey || state.ownerKey !== uid;
    if (switched) resetWorkspace();
    state.ownerKey = uid;
    state.dashReady = false;
    state.loading = true;
    setShellBoard(false);
    showView('projects');
    MineralBarI18n.apply();
    fillProfile();
    bindProjects();
    renderTable();
    wireLiveUpdates();
    MineralBarApp.connectRealtime().catch(function () { /* poll keeps the list live */ });
    state.team = teamFromBasic();
    var epoch = state.epoch;
    try { await global.MineralBarApp.ensureDashboardSession({ force: switched }); } catch (dashErr) { /* reload() will show the error */ }
    if (epoch !== state.epoch || accountKey() !== uid) return;
    state.dashReady = true;
    try { await fetchColumns(); } catch (e) { if (epoch === state.epoch) state.columns = []; }
    if (epoch !== state.epoch) return;
    try { await fetchCustomers(); } catch (e2) { if (epoch === state.epoch) state.customers = []; }
    if (epoch !== state.epoch) return;
    fillFilters();
    await reload();
  }

  async function onRoute() {
    var page = (global.location.hash || '').replace(/^#/, '') || '';
    if (page.indexOf('?') !== -1) page = page.slice(0, page.indexOf('?'));
    if (!page) page = MineralBarApp.isAuthenticated() ? 'projects' : 'login';
    if (page.indexOf('board/') === 0) {
      var boardId = decodeURIComponent(page.slice(6)).split('/')[0];
      if (!boardId) { global.location.hash = 'projects'; return; }
      await bootBoard(boardId);
      return;
    }
    if (page !== 'login' && page !== 'projects') page = 'login';
    if (page === 'login') {
      if (MineralBarApp.isAuthenticated()) {
        global.location.hash = 'projects';
        return;
      }
      showView('login');
      MineralBarI18n.apply();
      initLogin();
      return;
    }
    await bootProjects();
  }

  document.addEventListener('DOMContentLoaded', function () {
    MineralBarI18n.setTheme(MineralBarI18n.getTheme());
    MineralBarI18n.apply();
    bindChrome();
    initLogin();
    global.addEventListener('hashchange', onRoute);
    onRoute();
  });
})(typeof window !== 'undefined' ? window : globalThis);
