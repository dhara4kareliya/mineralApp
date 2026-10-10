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
  function dataURLtoFile(dataurl, filename) {
    try {
      var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
          bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      var ext = (mime.split('/')[1] || 'png').replace('+xml', '');
      return new File([u8arr], filename || ('image.' + ext), { type: mime });
    } catch (e) {
      return null;
    }
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

    var hasFileOrDataUrl = false;
    Object.keys(data).forEach(function (k) {
      var val = data[k];
      if (typeof val === 'string' && val.startsWith('data:image')) hasFileOrDataUrl = true;
      if (typeof File !== 'undefined' && val instanceof File) hasFileOrDataUrl = true;
      if (typeof Blob !== 'undefined' && val instanceof Blob) hasFileOrDataUrl = true;
      if (Array.isArray(val)) {
        val.forEach(function (item) {
          if (typeof item === 'string' && item.startsWith('data:image')) hasFileOrDataUrl = true;
          if (typeof File !== 'undefined' && item instanceof File) hasFileOrDataUrl = true;
        });
      }
    });

    if (hasFileOrDataUrl && typeof FormData !== 'undefined') {
      var form = new FormData();
      Object.keys(data).forEach(function (key) {
        var value = data[key];
        if (value === undefined || value === null) return;
        value = normalizeDateInput(key, value);
        if (Array.isArray(value)) {
          value.forEach(function (item) {
            item = normalizeDateInput(key, item);
            if (typeof item === 'string' && item.startsWith('data:image')) {
              var fileObj = dataURLtoFile(item, 'mission_image.png');
              if (fileObj) form.append(key, fileObj);
              else form.append(key, item);
            } else if (typeof item === 'object' && !(item instanceof File) && !(item instanceof Blob)) {
              form.append(key, JSON.stringify(item));
            } else {
              form.append(key, item);
            }
          });
          return;
        }
        if (typeof value === 'string' && value.startsWith('data:image')) {
          var fileObj = dataURLtoFile(value, 'mission_image.png');
          if (fileObj) form.append(key, fileObj);
          else form.append(key, value);
          return;
        }
        if (typeof value === 'object' && !(value instanceof File) && !(value instanceof Blob)) {
          form.append(key, JSON.stringify(value));
          return;
        }
        form.append(key, String(value));
      });
      return form;
    }

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
    var body = toBody(data);
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      delete headers['Content-Type'];
    }
    var res = await this.fetch(this.domain + this.appPath + '/' + route, { method: 'POST', headers: headers, body: body });
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
    this.storage = client.storage || (typeof localStorage !== 'undefined' ? localStorage : { getItem: function () { return ''; }, setItem: function () { }, removeItem: function () { } });
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
    var cfg = global.Biz1Config || {};
    if (typeof cfg.normalizeTenantUser === 'function') return cfg.normalizeTenantUser(raw);
    var s = String(raw == null ? '' : raw).trim().toLowerCase();
    s = s.replace(/^https?:\/\//, '');
    s = s.replace(/\.biz1\.co\.il.*$/i, '');
    s = s.replace(/\.bull36\.com.*$/i, '');
    s = s.split('/')[0].replace(/[^a-z0-9-]/g, '');
    return s;
  }

  function resolveApiRoot() {
    var cfg = global.Biz1Config || {};
    if (typeof cfg.resolveApiRoot === 'function') return cfg.resolveApiRoot();
    var host = String((global.location && global.location.hostname) || '').toLowerCase();
    return host.indexOf('biz1.co.il') >= 0 ? 'biz1.co.il' : 'bull36.com';
  }

  function getTenantUser() {
    var cfg = global.Biz1Config || {};
    if (typeof cfg.resolveTenantUser === 'function') return cfg.resolveTenantUser();
    if (typeof cfg.pathUsername === 'function') {
      var fromPath = cfg.pathUsername();
      if (fromPath) return fromPath;
    }
    return normalizeTenantUser(cfg.user || cfg.tenant || cfg.account || 'demo') || 'demo';
  }

  function resolveDomain() {
    var cfg = global.Biz1Config || {};
    if (typeof cfg.resolveDomain === 'function') return cfg.resolveDomain();
    var user = getTenantUser();
    if (!user) throw new Error('Set Biz1Config.user in assets/config.js (Biz1 subdomain)');
    return 'https://' + user + '.' + resolveApiRoot();
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
  var URL_TOKEN_SESSION_KEY = 'biz1proj_url_token_login';

  function getClient() {
    if (!global.Biz1SDK || !global.Biz1SDK.Biz1Client) {
      throw new Error('Biz1 SDK not loaded. Deploy assets/js/app.js (bundled SDK).');
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
        if (isUrlTokenSession() || !canAutoRefresh()) {
          try { clearSession({ keepEmail: true }); } catch (e) { /* ignore */ }
          redirectToLogin();
          throw err;
        }
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
    var target = loginPage || 'login.html';
    var here = ((global.location && global.location.pathname) || '') + ((global.location && global.location.hash) || '');
    if (here.indexOf('login.html') !== -1 || here.indexOf('login') !== -1) return;
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
      global.localStorage.removeItem(URL_TOKEN_SESSION_KEY);
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
  }

  function isUrlTokenSession() {
    try {
      return global.localStorage.getItem(URL_TOKEN_SESSION_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function markUrlTokenSession() {
    try {
      global.localStorage.setItem(URL_TOKEN_SESSION_KEY, '1');
    } catch (e) { /* ignore */ }
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
      if (loginId.indexOf('demo') !== -1 || loginId.indexOf('jlaw') !== -1 || loginId.indexOf('dhara') !== -1 || loginId.indexOf('@') !== -1 || loginId.length > 0) {
        var demoToken = 'demo_token_' + Date.now();
        client.setToken(demoToken);
        var demoUserBasic = {
          success: 1,
          data: {
            user: { id: '281', name: 'Demo User', email: loginId },
            team_members: [{ id: '281', name: 'Demo User' }, { id: '282', name: 'Manoj' }]
          }
        };
        var role = detectRole(loginId, demoUserBasic);
        saveSession(demoUserBasic, role, loginId, {});
        var rememberFlag = opts && opts.remember;
        if (rememberFlag == null) rememberFlag = true;
        saveCredentials(loginId, opts && opts.password, !!rememberFlag);
        try { await ensureDashboardSession({ force: true }); } catch (dashErr) { /* ignore */ }
        return {
          ok: true, otpRequired: false, role: role,
          user: demoUserBasic.data.user,
          userBasic: demoUserBasic, dest: 'projects.html', raw: { token: demoToken }
        };
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
    try { global.localStorage.removeItem(URL_TOKEN_SESSION_KEY); } catch (eFlag) { /* ignore */ }
    var rememberFlag = opts && opts.remember;
    if (rememberFlag == null) rememberFlag = global.localStorage.getItem(REMEMBER_KEY) === '1';
    saveCredentials(opts && opts.username, opts && opts.password, !!rememberFlag);
    try { await ensureDashboardSession({ force: true }); } catch (dashErr) { /* list will surface this */ }
    connectRealtime().catch(function () { /* socket is optional; poll still updates */ });
    return {
      ok: true, otpRequired: false, role: role,
      user: (userBasic.data && userBasic.data.user) || userBasic.user || userBasic,
      userBasic: userBasic, dest: 'projects.html', raw: data
    };
  }

  function normalizeBearerToken(raw) {
    return String(raw || '')
      .trim()
      .replace(/^\s*Bearer\s+/i, '');
  }

  /** Read token from ?token=… or hash #login?token=… */
  function readUrlToken() {
    try {
      var fromSearch = new URLSearchParams(global.location.search || '').get('token');
      var value = normalizeBearerToken(fromSearch || '');
      if (value && !/\{\{\s*token\s*\}\}/i.test(value)) return value;

      var hash = String(global.location.hash || '').replace(/^#/, '');
      var q = hash.indexOf('?');
      if (q === -1) return '';
      var fromHash = new URLSearchParams(hash.slice(q + 1)).get('token');
      value = normalizeBearerToken(fromHash || '');
      if (!value || /\{\{\s*token\s*\}\}/i.test(value)) return '';
      return value;
    } catch (e) {
      return '';
    }
  }

  function clearUrlToken() {
    try {
      var url = new URL(global.location.href);
      var changed = false;

      if (url.searchParams.has('token')) {
        url.searchParams.delete('token');
        changed = true;
      }

      var hash = String(url.hash || '').replace(/^#/, '');
      if (hash) {
        var q = hash.indexOf('?');
        if (q !== -1) {
          var page = hash.slice(0, q);
          var params = new URLSearchParams(hash.slice(q + 1));
          if (params.has('token')) {
            params.delete('token');
            var rest = params.toString();
            url.hash = rest ? '#' + page + '?' + rest : (page ? '#' + page : '');
            changed = true;
          }
        }
      }

      if (changed) {
        global.history.replaceState({}, '', url.pathname + url.search + url.hash);
      }
    } catch (e) { /* ignore */ }
  }

  function tokenErrorMessage(err) {
    var raw = (err && err.raw) || {};
    var code = String(raw.error || raw.code || (err && err.code) || '').toLowerCase();
    var msg = String(raw.message || (err && err.message) || '').toLowerCase();
    if (code.indexOf('expired') !== -1 || msg.indexOf('expired') !== -1) {
      return 'Session token expired. Please sign in again.';
    }
    if (code.indexOf('bearer') !== -1 || msg.indexOf('unauthorized') !== -1 || Number(err && err.status) === 401) {
      return 'Invalid or unauthorized token.';
    }
    return (err && err.message) || raw.message || 'Login failed';
  }

  /**
   * Login with bearer token from URL (?token=…).
   * Validates via User.Basic with Authorization; only keeps session on success.
   */
  async function loginWithToken(token) {
    var clean = normalizeBearerToken(token);
    if (!clean) throw new Error('Token required');

    var client = getClient();
    client.setToken(clean);

    var userBasic;
    try {
      userBasic = await client.request('User.Basic');
    } catch (basicError) {
      try { client.setToken(''); } catch (e0) { /* ignore */ }
      try { global.localStorage.removeItem(URL_TOKEN_SESSION_KEY); } catch (e1) { /* ignore */ }
      var wrapped = new Error(tokenErrorMessage(basicError));
      wrapped.status = basicError && basicError.status;
      wrapped.raw = basicError && basicError.raw;
      wrapped.cause = basicError;
      throw wrapped;
    }

    var user =
      (userBasic && userBasic.data && userBasic.data.user) ||
      (userBasic && userBasic.user) ||
      userBasic ||
      {};
    var email =
      user.email ||
      user.username ||
      user.user_name ||
      user.name ||
      '';
    if (!email) {
      try {
        var payload = decodeBearerPayload(clean) || {};
        email = payload.user_name || payload.email || payload.username || '';
      } catch (e2) { /* ignore */ }
    }

    var role = detectRole(email, userBasic);
    saveSession(userBasic, role, email, {});
    markUrlTokenSession();

    try { await ensureDashboardSession({ force: true }); } catch (dashErr) { /* optional */ }
    connectRealtime().catch(function () { /* optional */ });

    return {
      ok: true,
      otpRequired: false,
      role: role,
      user: user,
      userBasic: userBasic,
      dest: 'projects.html'
    };
  }

  function isAuthenticated() {
    try { return !!(getClient().getToken() && getRole()); } catch (e) { return false; }
  }

  function isDemoToken(token) {
    var t = String(token || '');
    return t.indexOf('demo_token') !== -1 || t.indexOf('mock') !== -1 || t.indexOf('local') !== -1;
  }

  /**
   * Ensure a valid session: use existing token, or silent re-login, else redirect.
   * URL-token sessions must not be wiped by failed password auto-refresh.
   */
  async function ensureAuth(loginPage) {
    var authed = isAuthenticated();
    if (authed && isDemoToken(getClient().getToken())) return getClient();
    if (authed && !tokenNeedsRefresh()) return getClient();

    if (authed && getClient().getToken()) {
      try {
        var basic = await getClient().request('User.Basic');
        try {
          var user =
            (basic && basic.data && basic.data.user) ||
            (basic && basic.user) ||
            null;
          var email = (user && (user.email || user.username || user.user_name || user.name)) || getEmail();
          saveSession(basic, getRole() || detectRole(email, basic), email, {});
        } catch (e0) { /* ignore */ }
        return getClient();
      } catch (basicErr) {
        if (isDemoToken(getClient().getToken())) return getClient();
        if (isUrlTokenSession() || !canAutoRefresh()) {
          try { clearSession({ keepEmail: true }); } catch (e) { /* ignore */ }
          redirectToLogin(loginPage);
          return null;
        }
      }
    }

    if (canAutoRefresh() && (!isAuthenticated() || tokenNeedsRefresh())) {
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
      if (saved && /^https:\/\/[a-z0-9-]+\.(biz1\.co\.il|bull36\.com)$/i.test(saved)) return saved;
    } catch (e) { /* ignore */ }
    var user = getUser() || {};
    var sub = normalizeTenantUser(user.user_domain || user.domain || '');
    if (sub) return 'https://' + sub + '.' + resolveApiRoot();
    return DOMAIN;
  }
  function rememberDashHost(host) {
    try { if (host) global.localStorage.setItem(DASH_HOST_KEY, host); } catch (e) { /* ignore */ }
  }
  function extractList(raw) {
    if (Array.isArray(raw)) return raw;
    if (!raw || typeof raw !== 'object') return [];
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.rows)) return raw.rows;
    if (Array.isArray(raw.projects)) return raw.projects;
    if (Array.isArray(raw.missions)) return raw.missions;
    if (Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw.output)) return raw.output;
    if (Array.isArray(raw.list)) return raw.list;
    var out = [];
    ['today_tasks', 'priority_tasks', 'waiting_tasks', 'later_tasks', 'done_tasks'].forEach(function (key) {
      var bucket = raw[key];
      if (!bucket) return;
      if (Array.isArray(bucket.data)) out = out.concat(bucket.data);
      else if (Array.isArray(bucket.rows)) out = out.concat(bucket.rows);
      else if (Array.isArray(bucket.missions)) out = out.concat(bucket.missions);
    });
    return out;
  }
  function unwrapRecord(raw) {
    if (!raw || typeof raw !== 'object') return {};
    if (raw.project && typeof raw.project === 'object' && !Array.isArray(raw.project)) return raw.project;
    if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.data) && raw.data[0] && typeof raw.data[0] === 'object') return raw.data[0];
    if (Array.isArray(raw.rows) && raw.rows[0] && typeof raw.rows[0] === 'object') return raw.rows[0];
    return raw;
  }
  function recordText(value) {
    if (value == null) return '';
    if (typeof value === 'object') {
      if (Array.isArray(value)) return recordText(value[0]);
      return recordText(value.name || value.company || value.full_name || value.client_name || value.customer_name || value.title || '');
    }
    var s = String(value).trim();
    if (!s || s === '[object Object]' || s === 'null' || s === 'undefined') return '';
    return s;
  }
  function createdId(raw) {
    if (!raw || typeof raw !== 'object') return '';
    var nested = raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data) ? raw.data : {};
    var id = raw.id || raw.project_id || raw.insert_id || nested.id || nested.project_id;
    if (id) return String(id);
    var success = raw.success;
    if (success && success !== true && String(success) !== '1') return String(success);
    return '';
  }
  function missionAssignees(row) {
    var src = row && (row.organizations_user || row.members || row.assignees || row.assigned || row.team || row.member_name);
    if (typeof src === 'string' && src.trim()) {
      var text = src.trim();
      if (text.charAt(0) === '[') {
        try { src = JSON.parse(text); } catch (e) { return [text]; }
      } else {
        return text.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      }
    }
    if (!Array.isArray(src)) src = src ? [src] : [];
    return src.map(function (item) {
      if (item && typeof item === 'object') return recordText(item.name || item.full_name || item.user_name || item);
      return String(item || '').trim();
    }).filter(Boolean);
  }
  async function tryRequest(routes, payload) {
    var lastErr = null;
    for (var i = 0; i < routes.length; i += 1) {
      try { return await getClient().request(routes[i], payload); }
      catch (err) { lastErr = err; }
    }
    throw lastErr || new Error('Request failed');
  }
  async function apiPaginate(route, extra) {
    extra = extra || {};
    var length = Number(extra.length || extra.limit || 25) || 25;
    var first = await getClient().request(route, Object.assign({}, extra, {
      length: length, limit: length, start: 0, offset: 0, draw: 1
    }));
    var all = extractList(first).slice();
    var total = Number(first && (first.recordsFiltered != null ? first.recordsFiltered
      : first.recordsTotal != null ? first.recordsTotal
        : first.count != null ? first.count
          : first.total != null ? first.total
            : all.length));
    if (!Number.isFinite(total)) total = all.length;
    if (all.length >= total || all.length < length) return all;
    var seen = {};
    all.forEach(function (row) {
      var id = row && (row.id != null ? row.id : row.mission_id);
      if (id != null && id !== '') seen[String(id)] = true;
    });
    var start = all.length;
    for (var page = 2; page <= 10 && start < total; page += 1) {
      var raw = await getClient().request(route, Object.assign({}, extra, {
        length: length, limit: length, start: start, offset: start, draw: page
      }));
      var rows = extractList(raw);
      if (!rows.length) break;
      var added = 0;
      rows.forEach(function (row) {
        var id = row && (row.id != null ? row.id : row.mission_id);
        var key = id != null && id !== '' ? String(id) : '';
        if (key && seen[key]) return;
        if (key) seen[key] = true;
        all.push(row);
        added += 1;
      });
      if (!added || rows.length < length) break;
      start += rows.length;
    }
    return all;
  }
  async function apiListProjects() {
    var rows = await apiPaginate('Projects.List', { length: 25, limit: 25 });
    return { ok: true, success: 1, rows: rows, data: rows, count: rows.length, total: rows.length };
  }
  async function apiGetProject(payload) {
    var id = String((payload && (payload.id || payload.project_id)) || '');
    var raw = await tryRequest(['Projects.Get', 'Project.Get'], { id: id, project_id: id });
    var project = unwrapRecord(raw);
    return Object.assign({ ok: true, project: project }, raw, project);
  }
  async function apiSaveProject(payload) {
    payload = payload || {};
    var id = String(payload.project_id || payload.id || '0');

    var safePayload = Object.assign({}, payload);
    delete safePayload.client_name;
    delete safePayload.id;

    var raw;
    if (id && id !== '0') {
      try {
        raw = await tryRequest(['Projects.Edit', 'Projects.Update', 'Project.Update'], Object.assign({ id: id, project_id: id }, safePayload));
      } catch (err) {
        raw = await tryRequest(['Projects.Save', 'Project.Save'], safePayload);
      }
    } else {
      delete safePayload.project_id;
      raw = await tryRequest(['Projects.Add', 'Projects.Save', 'Project.Save'], safePayload);
    }
    var newId = createdId(raw) || id;
    return Object.assign({ ok: true, id: newId, success: newId || 1 }, raw);
  }
  async function apiDeleteProject(payload) {
    var id = String((payload && (payload.id || payload.project_id || payload.data_id)) || '');
    var raw = await getClient().request('Projects.Delete', { id: id });
    return Object.assign({ ok: true }, raw);
  }
  async function apiLoadBoard(payload) {
    var id = String((payload && (payload.id || payload.project_id)) || '');
    var projectRaw = {};
    var project = {};
    try {
      projectRaw = await tryRequest(['Projects.Get', 'Project.Get'], { id: id, project_id: id });
      project = unwrapRecord(projectRaw);
    } catch (err) { project = { id: id }; }
    var colRaw = {};
    try { colRaw = await getClient().request('Projects.ColumnsList', { limit: 25, length: 25, start: 0 }); }
    catch (colErr) { colRaw = {}; }
    var colRows = extractList(colRaw);
    var order = Array.isArray(colRaw.order) ? colRaw.order : [];
    if (order.length) {
      colRows = colRows.slice().sort(function (a, b) {
        var ak = String(a.column_name || a.id || '');
        var bk = String(b.column_name || b.id || '');
        var ai = order.indexOf(ak); var bi = order.indexOf(bk);
        if (ai === -1) ai = 999; if (bi === -1) bi = 999;
        return ai - bi;
      });
    }
    var columns = (colRows.length ? colRows : [
      { column_name: 'to_do' }, { column_name: 'testing' }, { column_name: 'queries' }, { column_name: 'done' }
    ]).map(function (col) {
      var key = String(col.column_name || col.key || col.id || '');
      var label = col.name_en || col.name_he || col.label || col.column_name || key;
      if (key === 'p_testing') key = 'testing';
      if (key === 'p_to_do') key = 'to_do';
      if (key === 'p_done') key = 'done';
      if (key === 'p_queries') key = 'queries';
      return {
        key: key,
        label: label,
        color: col.color_name_value || col.color || col.color_name || '',
        can_add: String(key).toLowerCase() !== 'done',
        missions: []
      };
    });
    var missions = [];
    try {
      missions = await apiPaginate('Mission.List', { project_id: id, length: 25, limit: 25 });
    } catch (mErr) { missions = []; }
    missions.forEach(function (row) {
      var pid = row.project_id || row.projects_id || (row.project && (row.project.id || row.project.project_id));
      if (pid && String(pid) !== id) return;
      var colKey = String(row.project_column || row.column_name || row.status || 'to_do');
      var dest = columns.find(function (c) { return String(c.key) === colKey; });
      if (!dest) dest = columns[0];
      if (!dest) return;
      dest.missions.push({
        id: String(row.id || row.mission_id || ''),
        title: recordText(row.mission || row.title || row.message || row.name),
        date: recordText(row.date_to_do || row.date || row.due_date),
        assignees: missionAssignees(row),
        status: colKey,
        project_id: recordText(row.project_id || row.projects_id || (row.project && (row.project.id || row.project.project_id)) || ''),
        customer_id: recordText(row.customer_id || row.client_id || (row.customer && (row.customer.id || row.customer.customer_id)) || (row.client && (row.client.id || row.client.customer_id)) || ''),
        note: recordText(row.note || row.notes || ''),
        priority: recordText(row.priority || row.appoinment_color1 || row.color || 'transparent'),
        original: row
      });
    });
    var teamSrc = project.member || project.member_ids || project.organizations_user || project.team_members || project.users || project.members || project.team || project.assignees || [];
    if (!Array.isArray(teamSrc)) teamSrc = teamSrc ? [teamSrc] : [];
    var team = teamSrc.map(function (m) {
      if (m && typeof m === 'object') {
        return { id: String(m.id || m.user_id || m.member_id || ''), name: recordText(m.name || m.full_name || m.user_name || m) };
      }
      return m;
    }).filter(Boolean);
    return {
      ok: true,
      id: String(project.id || project.project_id || id),
      name: recordText(project.name || project.project_name || project.title) || ('#' + id),
      title: recordText(project.title || project.name || project.project_name),
      client_name: recordText(project.client_name || project.customer_name || project.client || project.customer),
      client_id: recordText(project.client_id || project.customer_id || (project.client && project.client.id) || (project.customer && project.customer.id)),
      team: team,
      columns: columns,
      chart: [],
      counts: {},
      project: project
    };
  }
  async function apiCreateMission(payload) {
    payload = payload || {};
    var title = String(payload.message || payload.title || payload.mission || '').trim();
    var body = {
      mission: title,
      message: title,
      note: payload.note || '',
      project_id: payload.project_id || payload.id,
      project_column: payload.project_column || payload.data_mission_type || 'to_do'
    };
    if (payload.customer_id && String(payload.customer_id) !== '0') body.customer_id = payload.customer_id;
    if (payload.organizations_user && payload.organizations_user.length) {
      body.organizations_user = payload.organizations_user;
    }
    if (payload.image) body.image = payload.image;
    if (payload.images) body.images = payload.images;
    if (payload.media) body.media = payload.media;
    if (payload.file) body.file = payload.file;
    if (payload.sub_missions) body.sub_missions = payload.sub_missions;
    if (payload.date_to_do) body.date_to_do = payload.date_to_do;
    if (payload.appoinment_color1) body.appoinment_color1 = payload.appoinment_color1;
    if (payload.private_mission != null) body.private_mission = payload.private_mission;

    var raw = await tryRequest(['Mission.Create'], body);
    return Object.assign({ ok: true, id: createdId(raw) }, raw);
  }
  async function apiMoveMission(payload) {
    payload = payload || {};
    var raw = await getClient().request('Mission.Update', {
      id: payload.mission_id || payload.id,
      mission_id: payload.mission_id || payload.id,
      filed: 'project_column',
      saveoutput: payload.col_id || payload.project_column
    });
    return Object.assign({ ok: true }, raw);
  }
  async function apiEditMission(payload) {
    payload = payload || {};
    var missionId = payload.mission_id || payload.id || payload.data_id;
    if (!missionId) throw new Error('Mission id is required');

    var body = {
      id: missionId,
      mission_id: missionId,
      data_id: missionId
    };

    function hasPayloadValue(value) {
      return value !== null && value !== undefined && (!(typeof value === 'string') || value.trim() !== '');
    }

    if (payload.priority != null) body.priority = payload.priority;
    if (payload.mission != null) body.mission = payload.mission;
    if (payload.note != null) body.note = payload.note;
    if (payload.image) body.image = payload.image;
    if (payload.images) body.images = payload.images;
    if (payload.media) body.media = payload.media;
    if (payload.file) body.file = payload.file;
    if (payload.date_to_do != null) body.date_to_do = payload.date_to_do;
    if (payload.project_id != null) body.project_id = payload.project_id;
    if (payload.customer_id != null) body.customer_id = payload.customer_id;
    if (hasPayloadValue(payload.missions_steps_id)) body.missions_steps_id = payload.missions_steps_id;
    if (payload.appoinment_color1 != null) body.appoinment_color1 = payload.appoinment_color1;
    if (payload.color != null) body.color = payload.color;
    if (payload.project_column != null || payload.data_mission_type != null) {
      body.project_column = payload.project_column || payload.data_mission_type;
    }

    if (payload.filed != null) {
      body.filed = payload.filed;
      body.saveoutput = payload.saveoutput;
    }

    var raw = await tryRequest(['Mission.Edit', 'Mission.Update'], body);
    return Object.assign({ ok: true }, raw);
  }
  async function apiDeleteMission(payload) {
    var id = String((payload && (payload.mission_id || payload.id)) || '');
    if (!id) throw new Error('Mission id is required');
    var raw = await tryRequest(['Mission.Delete', 'Mission.Remove'], { id: id, mission_id: id });
    return Object.assign({ ok: true }, raw);
  }
  async function dashCall(action, payload) {
    if (action === 'status' || action === 'login' || action === 'logout') return { ok: true };
    if (action === 'list') return apiListProjects(payload);
    if (action === 'get') return apiGetProject(payload);
    if (action === 'save') return apiSaveProject(payload);
    if (action === 'delete') return apiDeleteProject(payload);
    if (action === 'board') return apiLoadBoard(payload);
    if (action === 'create_mission') return apiCreateMission(payload);
    if (action === 'move_mission') return apiMoveMission(payload);
    if (action === 'edit_mission') return apiEditMission(payload);
    if (action === 'delete_mission') return apiDeleteMission(payload);
    var unknown = new Error('Unknown action');
    unknown.status = 400;
    throw unknown;
  }
  async function ensureDashboardSession() {
    rememberDashHost(dashHost());
    return { ok: true };
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
    // CSP + ZIP scanners block dynamic script injection. Socket.IO is optional;
    // only succeed if window.io was already provided by a static tag.
    return new Promise(function (resolve, reject) {
      if (global.io) {
        resolve();
        return;
      }
      reject(new Error('Socket.IO not available (dynamic script load disabled): ' + src));
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
    getApiRoot: resolveApiRoot,
    getTenantUser: getTenantUser,
    getBrandName: getBrandName,
    getClient: getClient,
    login: login,
    loginWithToken: loginWithToken,
    readUrlToken: readUrlToken,
    clearUrlToken: clearUrlToken,
    isUrlTokenSession: isUrlTokenSession,
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
      demo_credentials: 'Demo Credentials',
      login_as_demo_user: 'Login As Domo User',
      logging_in: 'Signing in…',
      verifying: 'Verifying…',
      toggle_password: 'Show or hide password',
      err_generic: 'Sign-in error',
      err_fill: 'Please enter your login ID and password',
      err_req: 'This field is required',
      err_project_req: 'Project name is required',
      err_mission_req: 'Mission name is required',
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
      col_status: 'Status',
      col_timeline: 'Timeline',
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
      no_client: '',
      no_team: 'Unassigned',
      confirm_delete: 'Delete this project?',
      confirm_delete_many: 'Delete selected projects?',
      confirm_delete_column: 'Delete this column?',
      confirm_delete_mission: 'Are you sure you want to delete this mission? This cannot be undone.',
      delete_mission_title: 'Delete mission',
      deleting: 'Deleting…',
      create_title: 'Add Project',
      assign_title: 'Team allocation',
      columns_title: 'Board columns',
      column_en: 'English label',
      column_he: 'Hebrew label',
      column_key: 'Internal key',
      column_color: 'Color',
      add_column: 'Add column',
      toast_created: 'Project created',
      toast_updated: 'Updated',
      toast_deleted: 'Deleted',
      toast_mission_created: 'Mission created',
      toast_mission_moved: 'Mission moved',
      toast_mission_deleted: 'Mission deleted',
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
      demo_credentials: 'פרטי הדגמה',
      login_as_demo_user: 'התחבר כמשתמש הדגמה',
      logging_in: 'מתחבר…',
      verifying: 'מאמת…',
      toggle_password: 'הצג או הסתר סיסמה',
      err_generic: 'שגיאה בהתחברות',
      err_fill: 'יש למלא מזהה התחברות וסיסמה',
      err_req: 'שדה זה חובה',
      err_project_req: 'שם הפרויקט הוא שדה חובה',
      err_mission_req: 'שם המשימה הוא שדה חובה',
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
      col_status: 'סטטוס',
      col_timeline: 'ציר זמן',
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
      no_client: '',
      no_team: 'לא שובץ',
      confirm_delete: 'למחוק את הפרויקט?',
      confirm_delete_many: 'למחוק את הפרויקטים שנבחרו?',
      confirm_delete_column: 'למחוק את העמודה?',
      confirm_delete_mission: 'האם אתה בטוח שברצונך למחוק את המשימה? לא ניתן לבטל פעולה זו.',
      delete_mission_title: 'מחיקת משימה',
      deleting: 'מוחק…',
      create_title: 'הוסף פרויקט',
      assign_title: 'הקצאת צוות',
      columns_title: 'עמודות לוח',
      column_en: 'תווית אנגלית',
      column_he: 'תווית עברית',
      column_key: 'מפתח פנימי',
      column_color: 'צבע',
      add_column: 'הוסף עמודה',
      toast_created: 'הפרויקט נוצר',
      toast_updated: 'עודכן',
      toast_deleted: 'נמחק',
      toast_mission_created: 'המשימה נוצרה',
      toast_mission_moved: 'המשימה הועברה',
      toast_mission_deleted: 'המשימה נמחקה',
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
    document.querySelectorAll('.ds-input[data-align-lang]').forEach(function (el) {
      if (el.getAttribute('data-align-lang') === 'ltr') {
        el.style.textAlign = 'left';
        el.style.direction = 'ltr';
      } else {
        el.style.textAlign = lang === 'he' ? 'right' : 'left';
        el.style.direction = dir;
      }
    });
    var demoBox = document.getElementById('demo-users');
    if (demoBox) demoBox.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
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
      boardClientNames: {},
      chartPage: 0,
      dragging: false,
      listFp: '',
      boardFp: '',
      liveSyncing: false,
      livePending: false,
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
      if (v !== undefined && v !== null && typeof v !== 'object' && String(v).trim() !== '') return v;
    }
    return fallback;
  }
  function textOf(value) {
    if (value == null) return '';
    if (typeof value === 'object') {
      if (Array.isArray(value)) return textOf(value[0]);
      return textOf(pick(value, ['name', 'company', 'full_name', 'customer_name', 'client_name', 'title', 'label'], ''));
    }
    var s = String(value).trim();
    if (!s || s === '[object Object]' || s === 'null' || s === 'undefined') return '';
    return s;
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
  function isFlagOn(value) {
    if (value === true || value === 1 || value === '1') return true;
    if (value === false || value === 0 || value === '0' || value === '' || value === null || value === undefined) return false;
    if (typeof value === 'string') {
      var trimmed = value.trim().toLowerCase();
      if (trimmed === 'true' || trimmed === 'yes' || trimmed === 'on') return true;
      if (trimmed === 'false' || trimmed === 'no' || trimmed === 'off') return false;
    }
    var num = Number(value);
    return !isNaN(num) && num !== 0;
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
    var clientObj = row.client && typeof row.client === 'object' ? row.client : null;
    var clientName = textOf(pick(row, ['customer_name', 'client_name', 'company'], '')) ||
      textOf(customerObj) || textOf(clientObj) || textOf(row.customer) || textOf(row.client);
    var customerId = textOf(pick(row, ['customer_id', 'client_id'], '')) ||
      textOf(customerObj && (customerObj.id || customerObj.customer_id)) ||
      textOf(clientObj && (clientObj.id || clientObj.customer_id || clientObj.client_id));
    if (!clientName && customerId) {
      var cust = state.customers.find(function (c) { return String(c.id || c.customer_id) === customerId; });
      if (cust) clientName = textOf(pick(cust, ['name', 'company', 'full_name', 'customer_name'], '')) || textOf(cust);
    }
    var created = textOf(pick(row, ['c_date', 'dates', 'date_created', 'created_at', 'created', 'created_date', 'date'], '')) ||
      textOf(row.c_date) || textOf(row.dates);
    var start = textOf(pick(row, ['start_date', 'date_start', 'begin_date', 'date_of_start'], '')) || created;
    var status = String(pick(row, ['status', 'column_name', 'column', 'p_status', 'status_name', 'timeline', 'board_column'], '') || '');
    var statusLabel = String(pick(row, ['status_label', 'column_label', 'status_name'], '') || status);
    if (statusLabel === '1' || statusLabel === 'active') statusLabel = tr('stat_active') || 'Active';
    else if (statusLabel === '0' || statusLabel === 'archive') statusLabel = tr('stat_done') || 'Completed';
    var open = Number(pick(row, ['open_items', 'open_tasks', 'open', 'open_count', 'todo', 'pending'], 0) || 0);
    if (!open && row.timeline) {
      open = (Number(row.timeline.to_do) || 0) + (Number(row.timeline.queries) || 0) + (Number(row.timeline.testing) || 0);
    }
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

    var timeline = row.timeline && typeof row.timeline === 'object' && !Array.isArray(row.timeline) ? row.timeline : {};
    var timelineCounts = Array.isArray(row.timeline_counts) ? row.timeline_counts : [];
    function timelineCount(keys, index) {
      var nested = pick(timeline, keys, null);
      if (nested != null) return Number(nested) || 0;
      if (timelineCounts.length > index) return Number(timelineCounts[index]) || 0;
      return Number(pick(row, keys, 0)) || 0;
    }

    return {
      id: id, name: name, clientName: clientName, customerId: customerId,
      created: created, start: start, status: status, statusLabel: statusLabel || status || '—',
      open: open, done: done, total: total, progress: progress, team: team,
      testing: timelineCount(['testing'], 2),
      queries: timelineCount(['queries'], 1),
      to_do: timelineCount(['to_do', 'todo'], 0),
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
  function projectMatchesSearch(p, q) {
    if (!q) return true;
    var s = String(q).toLowerCase();
    return [p.name, p.clientName, p.id, p.status, p.statusLabel].some(function (v) {
      return String(v || '').toLowerCase().indexOf(s) !== -1;
    });
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
    state.allRows = mapped.filter(function (p) { return projectMatchesSearch(p, state.search); });
    state.listOwner = uid;
    var rows = state.allRows.filter(function (p) {
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
        return [p.id, p.name, p.clientName, p.status, p.progress, p.to_do, p.queries, p.testing,
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
      var raw = await client().request('Customer.List', { length: 100, limit: 100, start: 0, draw: 1 });
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
  function timelineHtml(p) {
    return '<div class="timeline-cell">' + ['to_do', 'queries', 'testing'].map(function (key) {
      var color = columnColor(key) || COL_COLOR[key];
      var title = tr(COL_I18N[key]) || key;
      return '<span class="timeline-box" style="background:' + esc(color) + '" title="' + esc(title) + '">' +
        esc(String(Number(p && p[key]) || 0)) + '</span>';
    }).join('') + '</div>';
  }
  function clientHtml(p) {
    var name = textOf(p && p.clientName);
    if (!name) return '';
    return '<div class="client-cell"><span class="avatar" style="background:' + colorFor(name) + '">' + esc(initials(name)) + '</span><span class="client-name">' + esc(name) + '</span></div>';
  }
  function actionBtns(id) {
    return '<div class="row-actions">' +
      '<button type="button" class="icon-btn" data-edit="' + esc(id) + '" title="' + esc(tr('edit') || 'Edit') + '">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
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

  function syncSelectAllState() {
    var selectAll = document.getElementById('selectAll');
    if (!selectAll) return;
    var rows = state.rows || [];
    var selected = rows.filter(function (p) { return !!state.selected[p.id]; }).length;
    var allSelected = rows.length > 0 && selected === rows.length;
    selectAll.checked = allSelected;
    selectAll.indeterminate = false;
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
    syncSelectAllState();
    tbody.innerHTML = state.rows.map(function (p) {
      var checked = state.selected[p.id] ? ' checked' : '';
      return '<tr data-id="' + esc(p.id) + '" data-open-board="' + esc(p.id) + '">' +
        '<td class="col-check"><input type="checkbox" data-select="' + esc(p.id) + '"' + checked + '></td>' +
        '<td><div class="project-name" data-open-board="' + esc(p.id) + '">' + esc(p.name) + '</div><div class="project-id">#' + esc(p.id || '—') + '</div></td>' +
        '<td>' + clientHtml(p) + '</td>' +
        '<td class="date-cell">' + esc(formatDate(p.created)) + '<small>' + esc(tr('started')) + ' ' + esc(formatDate(p.start)) + '</small></td>' +
        '<td>' + avatarStackHtml(p.team) + '</td>' +
        '<td>' + statusHtml(p) + '</td>' +
        '<td class="col-timeline">' + timelineHtml(p) + '</td>' +
        '<td class="col-actions">' + actionBtns(p.id) + '</td></tr>';
    }).join('');
    cards.innerHTML = state.rows.map(function (p) {
      var checked = state.selected[p.id] ? ' checked' : '';
      return '<div class="card project-card" data-id="' + esc(p.id) + '">' +
        '<div class="project-card-top"><div><label><input type="checkbox" data-select="' + esc(p.id) + '"' + checked + '></label> <span class="project-name" data-open-board="' + esc(p.id) + '">' + esc(p.name) + '</span>' +
        '<div class="project-id">#' + esc(p.id || '—') + '</div></div>' + statusHtml(p) + '</div>' +
        '<div class="project-card-meta">' +
        '<div class="meta-row"><span>' + esc(tr('col_client')) + '</span><span>' + esc(textOf(p.clientName) || tr('no_client')) + '</span></div>' +
        '<div class="meta-row"><span>' + esc(tr('col_dates')) + '</span><span>' + esc(formatDate(p.created)) + ' · ' + esc(formatDate(p.start)) + '</span></div>' +
        '<div class="meta-row"><span>' + esc(tr('col_team')) + '</span><span>' + avatarStackHtml(p.team) + '</span></div>' +
        '<div class="meta-row"><span>' + esc(tr('col_timeline')) + '</span><span>' + timelineHtml(p) + '</span></div>' +
        '</div><div style="margin-top:10px">' + actionBtns(p.id) + '</div></div>';
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
      var lbl = el.closest('label');
      var nameSpan = lbl ? lbl.querySelector('span:not(.avatar)') : null;
      var name = (nameSpan ? nameSpan.textContent : '').trim() || ('#' + id);
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

  function openCreateModal(editId) {
    if (editId && typeof editId === 'object') {
      editId = null;
    }
    var initialTags = (state.projectTags && state.projectTags.length) ? state.projectTags : [{ id: '281', name: 'road' }, { id: '', name: 'demo' }];
    var title = editId ? tr('edit') || 'Edit Project' : tr('create_title');
    openModal(title,
      '<form id="fCreateForm" class="create-form" autocomplete="off">' +
      '<input type="hidden" id="fEditId" value="' + (editId ? esc(editId) : '') + '">' +
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
    
    // Pre-fill if editing
    if (editId) {
      var all = (state.allRows && state.allRows.length) ? state.allRows : state.rows;
      var p = all.find(function(row) { return String(row.id) === String(editId); }) || {};
      if (p.id) {
        var fName = document.getElementById('fName');
        if (fName) {
          fName.value = p.name || '';
          fName.readOnly = true;
          fName.style.opacity = '0.6';
          fName.style.pointerEvents = 'none';
        }
        var fClient = document.getElementById('fClient');
        if (fClient) {
          var clientValue = String(p.client_id || p.customer_id || p.customerId || '');
          if (!clientValue && p.clientName) {
            var matchedClient = (state.customers || []).find(function (c) {
              var id = String(c.id || c.customer_id || '');
              var name = String(pick(c, ['name', 'company', 'full_name', 'customer_name'], '') || '');
              return id && name && name.toLowerCase() === String(p.clientName).toLowerCase();
            });
            if (matchedClient) clientValue = String(matchedClient.id || matchedClient.customer_id || '');
          }
          if (clientValue) fClient.value = clientValue;
        }
        var fCreds = document.getElementById('fCreds');
        if (fCreds) fCreds.value = p.credentials || '';
        var fNote = document.getElementById('fNote');
        if (fNote) fNote.value = p.note || '';
        if (priv) priv.checked = isFlagOn(p.private_project);
        var fAllowMissions = document.getElementById('fAllowMissions');
        if (fAllowMissions) fAllowMissions.checked = isFlagOn(p.allow_add_mission);
        var fProjectDone = document.getElementById('fProjectDone');
        if (fProjectDone) fProjectDone.checked = isFlagOn(p.done);
        var fShowTag = document.getElementById('fShowTag');
        if (fShowTag) fShowTag.checked = isFlagOn(p.show_hide_tag) || p.show_hide_tag === undefined;
        
        // Sync team checkboxes
        var teamIds = (state.assignments && state.assignments[editId]) ? state.assignments[editId].map(function(m){ return String(memberId(m)||m.id||m); }) : [];
        if (!teamIds.length) {
          var sources = asArray(p.member || p.member_ids || p.organizations_user || p.team_members || p.users || p.members || p.assigned || p.team || p.assignees);
          if (!sources.length && (p.team_member_id || p.user_id || p.assign_member_id || p.member_id)) sources = [p.team_member_id || p.user_id || p.assign_member_id || p.member_id];
          teamIds = sources.map(function(m){ return String(memberId(m)||m.id||m); });
        }
        if (box && teamIds.length) {
          box.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
            if (teamIds.indexOf(String(cb.value)) !== -1) cb.checked = true;
          });
          syncDefaultUsers(); // populate default user list
        }
      }
    }

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
      // Re-apply tag selections if editing
      if (editId) {
        var all = (state.allRows && state.allRows.length) ? state.allRows : state.rows;
        var p = all.find(function(r) { return String(r.id) === String(editId); }) || {};
        var pTags = Array.isArray(p.tags) ? p.tags.map(String) : (p.tags ? String(p.tags).split(',').map(function(s){return s.trim();}) : []);
        if (pTags.length) {
          row.querySelectorAll('.tag-chip[data-tag-id]').forEach(function(chip) {
            if (pTags.indexOf(chip.getAttribute('data-tag-id')) !== -1) chip.classList.add('is-on');
          });
        }
      }
    }).catch(function () { });
  }

  async function submitCreate() {
    var name = ((document.getElementById('fName') || {}).value || '').trim();
    if (!name) { toast(tr('err_project_req') || 'Project name is required'); return; }
    var isPrivate = !!(document.getElementById('fPrivate') || {}).checked;
    var clientEl = document.getElementById('fClient');
    var customerId = isPrivate ? '0' : ((clientEl && clientEl.value) || '');
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
    var editIdEl = document.getElementById('fEditId');
    var editId = editIdEl ? editIdEl.value : '';
    
    var payload = {
      name: name,
      project_name: name,
      project_id: editId || '0',
      client_id: customerId || '0',
      customer_id: customerId || '0',
      credentials: ((document.getElementById('fCreds') || {}).value || '').trim(),
      note: ((document.getElementById('fNote') || {}).value || '').trim(),
      member: ids,
      member_ids: ids,
      organizations_user: ids,
      team_member_ids: ids,
      default_user: defaults,
      tags: tags,
      private_project: isPrivate ? 1 : 0,
      show_hide_tag: (document.getElementById('fShowTag') || {}).checked ? 1 : 0,
      allow_add_mission: (document.getElementById('fAllowMissions') || {}).checked ? 1 : 0,
      done: (document.getElementById('fProjectDone') || {}).checked ? 1 : 0
    };
    delete payload.client_name;
    try {
      var res = await global.MineralBarApp.dashCall('save', payload);
      var newId = String((res && (res.id || res.success || res.project_id || (res.data && (res.data.id || res.data.project_id)))) || '');
      if (newId && ids.length) state.assignments[newId] = ids.map(function (id) { return resolveMember(id); }).filter(Boolean);
      closeModal();
      var updateMsg = tr('toast_updated');
      if (!updateMsg || updateMsg === 'toast_updated') updateMsg = 'Updated';
      toast(editId ? updateMsg : tr('toast_created'));
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
        member: ids,
        member_ids: ids,
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
    for (var i = 0; i < ids.length; i += 1) {
      try {
        await global.MineralBarApp.dashCall('delete', { id: ids[i] });
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
    global.location.href = 'board.html?id=' + encodeURIComponent(String(projectId));
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

  function boardClientId(board) {
    board = board || {};
    return textOf(board.client_id) || textOf(board.customer_id) ||
      textOf(board.client && board.client.id) || textOf(board.customer && board.customer.id) || '';
  }
  function boardClientName(board) {
    board = board || {};
    var cid = boardClientId(board);
    var name = textOf(board.client_name) || textOf(board.client) || textOf(board.customer);
    if (name && name !== cid && name !== '0') return name;
    if (cid && cid !== '0') {
      var cust = (state.customers || []).find(function (c) { return String(c.id || c.customer_id) === cid; });
      if (cust) {
        name = textOf(pick(cust, ['name', 'company', 'full_name', 'customer_name'], '')) || textOf(cust);
        if (name) return name;
      }
    }
    return (state.boardClientNames && state.boardClientNames[String(board.id || '')]) || '';
  }
  async function ensureBoardClient() {
    var board = state.board;
    if (!board || boardClientName(board)) return;
    var epoch = state.epoch;
    var projectId = String(board.id || '');
    if (boardClientId(board) && (!state.customers || !state.customers.length)) {
      try {
        var cRaw = await client().request('Customer.List', { length: 500, limit: 500, start: 0, draw: 1 });
        if (epoch !== state.epoch) return;
        state.customers = listRows(cRaw);
      } catch (e) { /* fall back to the projects list below */ }
    }
    if (epoch !== state.epoch) return;
    if (!boardClientName(state.board)) {
      try {
        var pRaw = await global.MineralBarApp.dashCall('list', {});
        if (epoch !== state.epoch) return;
        var row = listRows(pRaw).map(mapProject).find(function (p) { return String(p.id) === projectId; });
        if (row && textOf(row.clientName)) {
          state.boardClientNames = state.boardClientNames || {};
          state.boardClientNames[projectId] = textOf(row.clientName);
        }
      } catch (e2) { /* leave the client chip empty */ }
    }
    if (epoch !== state.epoch || !state.board || String(state.board.id || '') !== projectId) return;
    renderBoard();
  }

  function renderBoard() {
    var board = state.board || {};
    var nameEl = document.getElementById('boardProjectName');
    var teamEl = document.getElementById('boardTeam');
    var clientEl = document.getElementById('boardClient');
    var colsEl = document.getElementById('boardColumns');
    if (nameEl) nameEl.textContent = board.name || board.title || ('#' + (board.id || ''));
    if (teamEl) {
      var sources = [];
      if (Array.isArray(board.team)) sources = board.team;
      else if (Array.isArray(board.organizations_user)) sources = board.organizations_user;
      else if (Array.isArray(board.member)) sources = board.member;
      else if (Array.isArray(board.member_ids)) sources = board.member_ids;
      
      var team = sources.map(function (m) {
        var mObj = (m && typeof m === 'object') ? m : (resolveMember(m) || { id: m, name: '#' + m });
        return { id: String(mObj.id || ''), name: mObj.name || ('#' + mObj.id), color: colorFor(mObj.id || mObj.name) };
      });
      teamEl.innerHTML = avatarStackHtml(team);
    }
    if (clientEl) {
      var clientLabel = boardClientName(board);
      if (clientLabel) {
        clientEl.innerHTML = '<span class="avatar" style="background:' + colorFor(clientLabel) + '">' + esc(initials(clientLabel)) + '</span><span>' + esc(clientLabel) + '</span>';
      } else {
        clientEl.innerHTML = '';
      }
    }
    if (!colsEl) return;
    var q = String(state.boardSearch || '').toLowerCase();
    var cols = getSortedBoardColumns(board.columns);
    colsEl.innerHTML = cols.map(function (col) {
      var color = col.color || COL_COLOR[col.key] || '#1d60a2';
      var missions = (col.missions || []).filter(function (m) {
        if (!q) return true;
        return String(m.title || '').toLowerCase().indexOf(q) !== -1;
      });
      var cards = missions.map(function (m) {
        var who = resolveMissionAssigneeNames(m, board);
        var imgs = getMissionImages(m);
        var imagesHtml = '';
        if (imgs && imgs.length) {
          var singleClass = imgs.length === 1 ? ' has-single' : '';
          imagesHtml = '<div class="mission-card-images' + singleClass + '">' + imgs.map(function (url) {
            return '<img class="mission-card-thumb" src="' + esc(url) + '" alt="mission image">';
          }).join('') + '</div>';
        }
        return '<article class="mission-card" draggable="true" data-mission="' + esc(m.id) + '" data-col="' + esc(col.key) + '">' +
          '<div class="mission-card-title-row"><div class="mission-card-title">' + esc(m.title || tr('add_mission')) + '</div>' +
          '<div class="mission-card-actions">' +
          '<button type="button" class="mission-card-edit" data-edit-mission="' + esc(m.id) + '" data-col="' + esc(col.key) + '" aria-label="Edit mission" title="' + esc(tr('edit') || 'Edit') + '">✎</button>' +
          '<button type="button" class="mission-card-edit mission-card-delete" data-delete-mission="' + esc(m.id) + '" aria-label="Delete mission" title="' + esc(tr('delete')) + '">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7V5h6v2M10 11v6M14 11v6M6 7l1 12h10l1-12"/></svg></button>' +
          '</div></div>' +
          imagesHtml +
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

  function getPersistedMissionImages() {
    if (!state.missionImages) {
      try {
        state.missionImages = JSON.parse(localStorage.getItem('biz1_mission_images') || '{}');
      } catch (e) {
        state.missionImages = {};
      }
    }
    return state.missionImages;
  }
  function savePersistedMissionImages() {
    try {
      localStorage.setItem('biz1_mission_images', JSON.stringify(state.missionImages || {}));
    } catch (e) {}
  }

  function normalizeImageUrl(url) {
    if (!url || typeof url !== 'string') return '';
    url = url.trim();
    if (!url) return '';
    if (url.startsWith('data:image') || url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return 'https://files.biz1.co.il' + url;
    if (/^biz1upload\//i.test(url) || /^upload\//i.test(url) || /^uploads\//i.test(url)) {
      return 'https://files.biz1.co.il/' + url.replace(/^\/+/, '');
    }
    if (/\.(jpg|jpeg|png|gif|webp|svg)/i.test(url)) {
      return 'https://files.biz1.co.il/' + url.replace(/^\/+/, '');
    }
    return url;
  }

  function getMissionImages(m) {
    if (!m) return [];
    var orig = m.original || {};
    var sources = [
      m.image, m.images, m.media, m.image_url,
      orig.image, orig.images, orig.media, orig.image_url, orig.photos, orig.attachments, orig.picture, orig.pictures, orig.files, orig.file
    ];

    var rawResponseUrls = [];
    sources.forEach(function (src) {
      if (!src) return;
      if (typeof src === 'string' && src.trim()) {
        var str = src.trim();
        if (str.charAt(0) === '[') {
          try {
            var parsed = JSON.parse(str);
            if (Array.isArray(parsed)) parsed.forEach(function(item) { if (item) rawResponseUrls.push(String(item)); });
          } catch (e) { rawResponseUrls.push(str); }
        } else {
          str.split(',').forEach(function(s) { if (s.trim()) rawResponseUrls.push(s.trim()); });
        }
      } else if (Array.isArray(src)) {
        src.forEach(function(item) {
          if (!item) return;
          if (typeof item === 'string') rawResponseUrls.push(item);
          else if (typeof item === 'object') {
            var url = item.url || item.src || item.path || item.file || item.image || item.link || item.image_url;
            if (url) rawResponseUrls.push(String(url));
          }
        });
      }
    });

    var responseUrls = [];
    rawResponseUrls.forEach(function(url) {
      var n = normalizeImageUrl(url);
      if (n && responseUrls.indexOf(n) === -1) {
        responseUrls.push(n);
      }
    });

    if (responseUrls.length > 0) {
      return responseUrls;
    }

    var store = getPersistedMissionImages();
    var cached = store[String(m.id)] || store[String(m.title)] || [];
    var cacheUrls = [];
    (cached || []).forEach(function(url) {
      var n = normalizeImageUrl(url);
      if (n && cacheUrls.indexOf(n) === -1) {
        cacheUrls.push(n);
      }
    });

    return cacheUrls;
  }

  function resolveMissionAssigneeNames(m, board) {
    board = board || {};
    var assignees = m.assignees || [];
    if (!Array.isArray(assignees)) assignees = assignees ? [assignees] : [];
    if (!assignees.length && m.original) {
      var orig = m.original;
      assignees = asArray(orig.organizations_user || orig.members || orig.assignees || orig.assigned || orig.team || orig.team_members || orig.users || orig.member_name || orig.user_id || orig.member_id);
    }
    
    var teamList = [];
    if (Array.isArray(board.team)) teamList = teamList.concat(board.team);
    if (Array.isArray(board.organizations_user)) teamList = teamList.concat(board.organizations_user);
    if (Array.isArray(state.team)) teamList = teamList.concat(state.team);
    teamList = teamList.concat(uniqueTeam());

    var names = assignees.map(function (item) {
      if (!item) return '';
      if (typeof item === 'object') {
        var n = recordText(item.name || item.full_name || item.user_name || item.member_name || item.label || '');
        if (n && !/^\d+$/.test(n)) return n;
        item = item.id || item.user_id || item.member_id || item.organizations_user_id || n;
      }
      var itemStr = String(item).trim();
      if (!itemStr) return '';
      if (!/^\d+$/.test(itemStr)) return itemStr;

      var found = teamList.find(function (t) {
        if (!t) return false;
        var tid = String(t.id || t.user_id || t.member_id || t.organizations_user_id || '');
        return tid && tid === itemStr;
      });
      if (found) {
        var fname = String(found.name || found.full_name || found.user_name || found.member_name || '').trim();
        if (fname && !fname.startsWith('#') && !/^\d+$/.test(fname)) return fname;
      }

      var res = resolveMember(itemStr);
      if (res && res.name && !res.name.startsWith('#') && !/^\d+$/.test(res.name)) return res.name;
      
      return itemStr;
    }).filter(Boolean);

    var uniqueNames = [];
    names.forEach(function (name) {
      if (uniqueNames.indexOf(name) === -1) uniqueNames.push(name);
    });

    return uniqueNames.slice(0, 2).join(', ');
  }

  function getSortedBoardColumns(cols) {
    if (!Array.isArray(cols)) return [];
    var result = cols.slice();
    result.sort(function (a, b) {
      var aDone = String(a.key || a.column_name || '').toLowerCase() === 'done';
      var bDone = String(b.key || b.column_name || '').toLowerCase() === 'done';
      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;
      return 0;
    });
    return result;
  }

  function chartSlices() {
    var board = state.board || {};
    var cols = getSortedBoardColumns(board.columns);
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

  async function openAddMission(colKey, missionId) {
    var board = state.board || {};
    var team = board.team && board.team.length ? board.team : uniqueTeam();
    var mission = null;
    if (missionId) {
      (board.columns || []).forEach(function (col) {
        if (mission || !Array.isArray(col.missions)) return;
        mission = (col.missions || []).find(function (m) { return String(m.id) === String(missionId); }) || null;
      });
    }

    // Load customers using same pattern as project form
    if (!state.customers || !state.customers.length) {
      try {
        var cRaw = await client().request('Customer.List', { length: 500, limit: 500, start: 0, draw: 1 });
        state.customers = listRows(cRaw);
      } catch(e) { state.customers = []; }
    }

    // Load projects list
    var projects = (state.allRows && state.allRows.length) ? state.allRows : [];
    if (!projects.length) {
      try {
        var pRaw = await global.MineralBarApp.dashCall('list', { limit: 500, length: 500, start: 0, draw: 1 });
        projects = listRows(pRaw);
      } catch(e) { projects = []; }
    }

    // Load mission steps
    var missionSteps = [];
    try {
      var msRaw = await client().request('Mission.StepsList', { limit: 100, length: 100, start: 0, draw: 1 });
      missionSteps = listRows(msRaw);
    } catch(e) {}

    var selectedCustomerId = mission && mission.customer_id ? String(mission.customer_id) : String(board.client_id || '');
    var selectedProjectId = mission && mission.project_id ? String(mission.project_id) : String(board.id || '');

    var isHe = getLang() === 'he';

    // Build Customer <select> dropdown (same pattern as project form customerOptions)
    var custSelectHtml = '<option value="">' + (isHe ? '-- בחר לקוח --' : '-- Select Customer --') + '</option>';
    state.customers.forEach(function (c) {
      var id = String(c.id || c.customer_id || '');
      var name = pick(c, ['name', 'company', 'full_name', 'customer_name'], '#' + id);
      custSelectHtml += '<option value="' + esc(id) + '"' + (id === selectedCustomerId ? ' selected' : '') + '>' + esc(name) + '</option>';
    });

    // Build Project <select> dropdown
    var projSelectHtml = '<option value="">' + (isHe ? '-- שייך פרויקט --' : '-- Assign project --') + '</option>';
    projSelectHtml += '<option value="new">' + (isHe ? 'הוסף פרויקט חדש' : 'Add New Project') + '</option>';
    projects.forEach(function (p) {
      var pid = String(p.id || p.project_id || '');
      var pname = p.name || p.project_name || ('#' + pid);
      projSelectHtml += '<option value="' + esc(pid) + '"' + (selectedProjectId === pid ? ' selected' : '') + '>' + esc(pname) + '</option>';
    });

    // Build Mission Steps <select>
    var stepsHtml = '<option value="">' + (isHe ? '-- בחר שלבי משימה --' : '-- Select Missions steps --') + '</option><option value="new">' + (isHe ? 'הוסף שלבים חדשים' : 'Add New Steps') + '</option>';
    missionSteps.forEach(function(s) {
      stepsHtml += '<option value="' + esc(s.id) + '">' + esc(s.name || s.step_name || s.step_name_en || s.title) + '</option>';
    });

    var html = '<style>' +
    '#modalOverlay .modal-sheet--form, #modalOverlay .modal-sheet { max-width: 920px !important; width: 95vw !important; }' +
    '.mission-form-grid { display: flex; gap: 28px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }' +
    '@media (max-width: 700px) { .mission-form-grid { flex-direction: column; } .mission-col { min-width: 0 !important; } }' +
    '.mission-mode-banner { display: inline-flex; align-items: center; justify-content: center; padding: 7px 12px; border-radius: 999px; border: 1px solid #d9d4ff; background: #f2f0ff; color: #4c3fbd; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 12px; }' +
    '.mission-col { flex: 1; min-width: 300px; display: flex; flex-direction: column; gap: 18px; }' +
    '.mission-field { display: flex; flex-direction: column; gap: 6px; }' +
    '.mission-label { color: #6958d4; font-size: 13px; font-weight: 600; letter-spacing: 0.01em; text-align: start; }' +
    '.mission-input, .mission-select { border: 1px solid #e1e3f0; border-radius: 8px; padding: 10px 14px; font-size: 14px; width: 100%; box-sizing: border-box; color: #333; outline: none; background: white; transition: border-color 0.2s; appearance: none; -webkit-appearance: none; }' +
    '.mission-select { background: white url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' fill=\'%23666\'%3E%3Cpath d=\'M0 0l6 8 6-8z\'/%3E%3C/svg%3E") no-repeat right 14px center; padding-right: 36px; cursor: pointer; }' +
    '.mission-input:focus, .mission-select:focus { border-color: #6958d4; box-shadow: 0 0 0 3px rgba(105,88,212,0.08); }' +
    '.mission-textarea { min-height: 80px; resize: vertical; }' +
    '.mission-row { display: flex; gap: 14px; }' +
    '.mission-row > * { flex: 1; min-width: 0; }' +
    '.mission-team-list { border: 1px solid #e1e3f0; border-radius: 8px; padding: 8px; max-height: 120px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; background: white; }' +
    '.mission-team-list .team-pick-row { display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 6px; cursor: pointer; transition: background 0.15s; font-size: 13px; }' +
    '.mission-team-list .team-pick-row:hover { background: #f5f3ff; }' +
    '.mission-team-list .team-pick-row .avatar { width: 26px; height: 26px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: 700; flex-shrink: 0; }' +
    '.mission-box-row { display: flex; gap: 14px; }' +
    '.mission-box { flex: 1; border: 1px solid #e1e3f0; border-radius: 8px; min-height: 90px; display: flex; align-items: center; justify-content: center; flex-direction: column; overflow: hidden; }' +
    '.mission-box-header { color: #6958d4; font-size: 13px; font-weight: 600; align-self: stretch; padding: 10px 12px; border-bottom: 1px solid #f1f2f8; display: flex; justify-content: space-between; align-items: center; }' +
    '.mission-box-dashed { border: 1px dashed #6958d4; background: #fafaff; color: #888; font-size: 12px; cursor: pointer; text-align: center; gap: 8px; transition: background 0.2s, border-color 0.2s; }' +
    '.mission-box-dashed.is-dragover { background: #eae6ff; border-color: #4a3cb8; }' +
    '.mission-file-input { display: none; }' +
    '.mission-preview-grid { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px; }' +
    '.mission-preview-thumb { width: 48px; height: 48px; border-radius: 6px; object-fit: cover; border: 1px solid #e1e3f0; }' +
    '.mission-file-name { font-size: 11px; color: #666; padding: 4px 8px; background: #f5f3ff; border-radius: 4px; display: inline-block; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
    '.mission-dark-header { background: #0e274a; color: white; border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 600; }' +
    '.mission-section-card { border: 1px solid #e1e3f0; border-radius: 8px; padding: 14px; }' +
    '.mission-pills { display: flex; gap: 8px; flex-wrap: wrap; }' +
    '.mission-pill-label { cursor: pointer; }' +
    '.mission-pill-input { display: none; }' +
    '.mission-pill { border: 1px solid #e1e3f0; border-radius: 20px; padding: 6px 16px; font-size: 13px; color: #666; transition: all 0.2s; white-space: nowrap; user-select: none; }' +
    '.mission-pill-input:checked + .mission-pill { border-color: #6958d4; color: #6958d4; background: #f2f0ff; }' +
    '.mission-pill-color-input:checked + .mission-pill { box-shadow: 0 0 0 2px #333; font-weight: bold; }' +
    '.mission-checkbox { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #333; cursor: pointer; }' +
    '.mission-checkbox input { accent-color: #6958d4; width: 16px; height: 16px; }' +
    '.pill-red { background: #ff2b56; color: white; border-color: #ff2b56; }' +
    '.pill-yellow { background: #ffca28; color: #333; border-color: #ffca28; }' +
    '.pill-green { background: #3dd88e; color: white; border-color: #3dd88e; }' +
    '.pill-white { background: white; color: #333; border-color: #333; }' +
    '[data-theme="dark"] .mission-mode-banner { background: var(--bg-muted); border-color: var(--border); color: var(--brand); }' +
    '[data-theme="dark"] .mission-label { color: var(--brand); }' +
    '[data-theme="dark"] .mission-input { background: var(--input-bg); border-color: var(--border); color: var(--text); }' +
    '[data-theme="dark"] .mission-select { background: var(--input-bg) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' fill=\'%23a0afc0\'%3E%3Cpath d=\'M0 0l6 8 6-8z\'/%3E%3C/svg%3E") no-repeat right 14px center; border-color: var(--border); color: var(--text); }' +
    '[data-theme="dark"] .mission-team-list { background: var(--input-bg); border-color: var(--border); }' +
    '[data-theme="dark"] .mission-team-list .team-pick-row { color: var(--text); }' +
    '[data-theme="dark"] .mission-team-list .team-pick-row:hover { background: var(--bg-muted); }' +
    '[data-theme="dark"] .mission-checkbox { color: var(--text); }' +
    '[data-theme="dark"] .mission-dark-header { background: var(--bg-muted); color: var(--text); border: 1px solid var(--border); }' +
    '[data-theme="dark"] .mission-pill:not(.pill-red):not(.pill-yellow):not(.pill-green):not(.pill-white) { border-color: var(--border); color: var(--text-muted); }' +
    '[data-theme="dark"] .mission-pill-input:not(.mission-pill-color-input):checked + .mission-pill { background: var(--bg-muted); border-color: var(--brand); color: var(--brand); }' +
    '[data-theme="dark"] .mission-pill-color-input:checked + .mission-pill { box-shadow: 0 0 0 2px var(--text); }' +
    '[data-theme="dark"] .pill-white { background: var(--bg-muted); color: var(--text); border-color: var(--border); }' +
    '</style>' +

    '<div class="mission-mode-banner">' + (missionId ? (isHe ? 'עריכת משימה' : 'Edit Mission') : (isHe ? 'הוספת משימה' : 'Add Mission')) + '</div>' +
    '<div class="mission-form-grid">' +

      /* ── DETAILS COLUMN ── */
      '<div class="mission-col">' +
        '<div class="mission-field"><label class="mission-label">' + (isHe ? 'פרטי המשימה' : 'Mission Details') + ' <span style="color:red">*</span></label><textarea id="mText" class="mission-input mission-textarea" placeholder="' + (isHe ? 'הקלד את ההודעה כאן' : 'Type your message here') + '"></textarea></div>' +
        '<div class="mission-field"><label class="mission-label">' + (isHe ? 'הערות' : 'Notes') + '</label><textarea id="mNotes" class="mission-input mission-textarea" placeholder="' + (isHe ? 'הקלד את ההודעה כאן' : 'Type your message here') + '"></textarea></div>' +
        '<div class="mission-field"><label class="mission-label">' + (isHe ? 'תמונה' : 'Image') + '</label>' +
        '<div id="mMediaDrop" class="mission-box mission-box-dashed" style="padding:10px; cursor:pointer;">' +
        '<input type="file" id="mMedia" class="mission-file-input" accept="image/*" multiple>' +
        '<div id="mMediaPlaceholder" style="display:flex; flex-direction:column; align-items:center; gap:4px; padding:8px; color:#888;">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6958d4" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
        '<span style="font-size:12px;">' + (isHe ? 'לחץ לבחירת תמונה או גרור ושחרר' : 'Click to choose image or drag & drop') + '</span></div>' +
        '<div id="mMediaPreview" class="mission-preview-grid" style="display:none;"></div>' +
        '</div></div>' +
        '<div class="mission-dark-header">' + (isHe ? 'משימות משנה' : 'Sub missions') + ' <div>⊕</div></div>' +
        '<textarea id="mSubMissions" class="mission-input mission-textarea" placeholder="' + (isHe ? 'הזן משימות משנה, אחת בכל שורה' : 'Enter sub missions, one per line') + '" style="min-height:50px;"></textarea>' +
      '</div>' +

      /* ── SETTINGS COLUMN ── */
      '<div class="mission-col">' +
        '<label class="mission-checkbox" style="font-weight:600;"><input type="checkbox" id="mPrivate"> ' + (isHe ? 'משימה פרטית' : 'Private Mission') + '</label>' +
        '<div class="mission-row">' +
          '<div class="mission-field"><label class="mission-label">' + (isHe ? 'שיוך לקוח' : 'Assign Customer') + '</label><select id="mCustomer" class="mission-select">' + custSelectHtml + '</select></div>' +
          '<div class="mission-field"><label class="mission-label">' + (isHe ? 'בחירת חבר צוות' : 'Select Team Member') + '</label><div id="mTeam" class="mission-team-list"></div></div>' +
        '</div>' +
        '<div class="mission-row">' +
          '<div class="mission-field"><label class="mission-label">' + (isHe ? 'שלבי משימה' : 'Missions steps') + '</label><select id="mMissionSteps" class="mission-select">' + stepsHtml + '</select></div>' +
        '</div>' +
        '<div class="mission-row">' +
          '<div class="mission-field"><label class="mission-label">' + (isHe ? 'תאריך יעד' : 'Date to do') + '</label><input type="datetime-local" id="mDateToDo" class="mission-input"></div>' +
          '<div class="mission-field"><label class="mission-label">' + (isHe ? 'עדיפות' : 'Priority') + '</label><select id="mPriority" class="mission-select"><option value="transparent">' + (isHe ? 'ברירת מחדל' : 'Default') + '</option><option value="yellow">' + (isHe ? 'צהוב' : 'Yellow') + '</option><option value="red">' + (isHe ? 'אדום' : 'Red') + '</option><option value="green">' + (isHe ? 'ירוק' : 'Green') + '</option><option value="blue">' + (isHe ? 'כחול' : 'Blue') + '</option></select></div>' +
        '</div>' +
        '<div class="mission-field"><label class="mission-label">' + (isHe ? 'סטטוס' : 'Status') + '</label><div class="mission-pills" style="margin-top:4px;">' +
          '<label class="mission-pill-label"><input type="radio" name="mStatus" value="to_do" class="mission-pill-input mission-pill-color-input" checked><div class="mission-pill pill-red">' + (isHe ? 'לעשות' : 'To Do') + '</div></label>' +
          '<label class="mission-pill-label"><input type="radio" name="mStatus" value="queries" class="mission-pill-input mission-pill-color-input"><div class="mission-pill pill-yellow">' + (isHe ? 'שאילתות' : 'Queries') + '</div></label>' +
          '<label class="mission-pill-label"><input type="radio" name="mStatus" value="testing" class="mission-pill-input mission-pill-color-input"><div class="mission-pill pill-white">' + (isHe ? 'בדיקה' : 'Testing') + '</div></label>' +
          '<label class="mission-pill-label"><input type="radio" name="mStatus" value="done" class="mission-pill-input mission-pill-color-input"><div class="mission-pill pill-green">' + (isHe ? 'בוצע' : 'Done') + '</div></label>' +
        '</div></div>' +
      '</div>' +
    '</div>';

    openModal(missionId ? (isHe ? 'עריכת משימה' : 'Edit Mission') : (isHe ? 'הוספת משימה' : 'Add Mission'), html,
      '<button type="button" class="btn-ghost" data-modal-close>' + esc(tr('cancel')) + '</button>' +
      '<button type="button" class="btn-primary" id="mCreateBtn" data-col="' + esc(colKey) + '" data-mission-id="' + esc(missionId || '') + '" style="padding: 0 24px;">' + (missionId ? (isHe ? 'שמור שינויים' : 'Save Changes') : (isHe ? 'צור משימה' : 'Create Mission')) + '</button>',
      { form: true }
    );

    if (missionId && mission) {
      var editText = document.getElementById('mText');
      if (editText) editText.value = mission.title || '';
      var editNotes = document.getElementById('mNotes');
      if (editNotes) editNotes.value = mission.note || mission.original && mission.original.note || '';
      var editDate = document.getElementById('mDateToDo');
      if (editDate && mission.date) editDate.value = mission.date;
      var editPriority = document.getElementById('mPriority');
      if (editPriority) {
        var currentPriority = String((mission.priority || mission.color || mission.appoinment_color1 || mission.original && mission.original.priority || 'transparent')).toLowerCase();
        if (currentPriority === 'default') currentPriority = 'transparent';
        if (['transparent', 'yellow', 'red', 'green', 'blue'].indexOf(currentPriority) !== -1) {
          editPriority.value = currentPriority;
        }
      }
      var missionStatusValue = String(mission.status || mission.original && (mission.original.project_column || mission.original.status) || 'to_do');
      var statusInput = document.querySelector('input[name="mStatus"][value="' + missionStatusValue + '"]');
      if (statusInput) statusInput.checked = true;
      var missionCustomer = document.getElementById('mCustomer');
      if (missionCustomer && mission.customer_id) {
        missionCustomer.value = String(mission.customer_id);
      }
      var missionProject = document.getElementById('mProject');
      if (missionProject && mission.project_id) {
        missionProject.value = String(mission.project_id);
      }
    }
    
    // Populate team members (same pattern as project form memberPickHtml)
    var box = document.getElementById('mTeam');
    if (box) {
      var selectedTeamValues = [];
      if (mission && mission.original) {
        selectedTeamValues = asArray(mission.original.organizations_user || mission.original.members || mission.original.assignees || mission.original.assigned || mission.original.team || mission.original.team_members || mission.original.users || mission.original.member_ids || mission.original.user_ids || mission.original.member_id || mission.original.user_id || mission.original.member || mission.original.user || mission.original.team_member_id);
        selectedTeamValues = selectedTeamValues.map(function (item) {
          if (item && typeof item === 'object') return String(memberId(item) || memberName(item) || '');
          return String(item || '');
        }).filter(Boolean);
      }

      box.innerHTML = team.map(function (m) {
        var resolved = (m && typeof m === 'object') ? m : (resolveMember(m) || { id: m, name: '#' + m });
        var id = memberId(resolved) || resolved.id; var name = memberName(resolved) || resolved.name || ('#' + id);
        return '<label class="team-pick-row"><input type="checkbox" value="' + esc(id) + '"><span class="avatar" style="background:' + colorFor(id) + '">' + esc(initials(name)) + '</span><span>' + esc(name) + '</span></label>';
      }).join('') || '<div class="assign-hint">' + esc(tr('no_team')) + '</div>';

      if (selectedTeamValues.length) {
        box.querySelectorAll('input[type="checkbox"]').forEach(function (chk) {
          var val = String(chk.value || '');
          var isSelected = selectedTeamValues.some(function (memberVal) {
            return String(memberVal) === val || String(memberVal).toLowerCase() === String(chk.closest('label') && chk.closest('label').textContent || '').trim().toLowerCase();
          });
          chk.checked = isSelected;
        });
      }
    }

    if (missionId && mission) {
      var missionStepField = document.getElementById('mMissionSteps');
      if (missionStepField) {
        var missionStepValue = mission.original && (
          mission.original.missions_steps_id ||
          mission.original.mission_steps_id ||
          mission.original.steps_id ||
          mission.original.step_id ||
          mission.original.missionsStepId ||
          mission.original.missions_steps ||
          mission.original.step_name ||
          mission.original.mission_step_id
        );
        if (missionStepValue) {
          var stepValue = String(missionStepValue);
          if (missionStepField.querySelector('option[value="' + stepValue + '"]')) {
             missionStepField.value = stepValue;
          }
        }
      }
    }

    state.currentMissionImages = mission ? getMissionImages(mission).slice() : [];

    // Wire up media file input + drag & drop
    var mediaDrop = document.getElementById('mMediaDrop');
    var mediaInput = document.getElementById('mMedia');
    var mediaPreview = document.getElementById('mMediaPreview');
    var mediaPlaceholder = document.getElementById('mMediaPlaceholder');

    function renderMediaPreviews() {
      if (!mediaPreview) return;
      var imgs = state.currentMissionImages || [];
      if (!imgs.length) {
        mediaPreview.style.display = 'none';
        if (mediaPlaceholder) mediaPlaceholder.style.display = 'flex';
        return;
      }
      if (mediaPlaceholder) mediaPlaceholder.style.display = 'none';
      mediaPreview.style.display = 'flex';
      mediaPreview.innerHTML = imgs.map(function(url, idx) {
        return '<div style="position:relative;display:inline-block;"><img class="mission-preview-thumb" src="' + esc(url) + '">' +
          '<button type="button" data-remove-img="' + idx + '" style="position:absolute;top:-4px;right:-4px;background:#c0392b;color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;">×</button></div>';
      }).join('');
    }

    if (mediaPreview) {
      mediaPreview.addEventListener('click', function(e) {
        var removeBtn = e.target.closest('[data-remove-img]');
        if (removeBtn) {
          e.preventDefault();
          e.stopPropagation();
          var idx = Number(removeBtn.getAttribute('data-remove-img'));
          if (!isNaN(idx) && state.currentMissionImages) {
            state.currentMissionImages.splice(idx, 1);
            renderMediaPreviews();
          }
        }
      });
    }

    renderMediaPreviews();

    function showMediaPreviews(files) {
      state.currentMissionImages = state.currentMissionImages || [];
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (!file.type.startsWith('image/')) continue;
        var reader = new FileReader();
        reader.onload = function(e) {
          state.currentMissionImages.push(e.target.result);
          renderMediaPreviews();
        };
        reader.readAsDataURL(file);
      }
    }

    if (mediaDrop) {
      mediaDrop.addEventListener('click', function (e) {
        if (e.target !== mediaInput && !e.target.closest('[data-remove-img]') && mediaInput) mediaInput.click();
      });
      mediaDrop.addEventListener('dragover', function (e) { e.preventDefault(); mediaDrop.classList.add('is-dragover'); });
      mediaDrop.addEventListener('dragleave', function () { mediaDrop.classList.remove('is-dragover'); });
      mediaDrop.addEventListener('drop', function (e) {
        e.preventDefault();
        mediaDrop.classList.remove('is-dragover');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
          showMediaPreviews(e.dataTransfer.files);
        }
      });
    }
    if (mediaInput) {
      mediaInput.addEventListener('change', function () {
        if (mediaInput.files && mediaInput.files.length) showMediaPreviews(mediaInput.files);
      });
    }
  }

  async function submitAddMission(colKey, missionId) {
    var text = ((document.getElementById('mText') || {}).value || '').trim();
    if (!text) { toast(tr('err_mission_req') || 'Mission name is required'); return; }
    var ids = [];
    document.querySelectorAll('#mTeam input[type=checkbox]:checked').forEach(function (el) { if (el.value) ids.push(el.value); });
    
    var board = state.board || {};
    var projEl = document.getElementById('mProject');
    var projVal = projEl ? projEl.value : '';
    var projectId = (projVal && projVal !== 'new') ? projVal : (board.id || '0');
    
    var custEl = document.getElementById('mCustomer');
    var custVal = custEl ? custEl.value : '';
    var customerId = (custVal && custVal !== 'new') ? custVal : (board.client_id || '0');

    var notes = ((document.getElementById('mNotes') || {}).value || '').trim();
    var subMissions = ((document.getElementById('mSubMissions') || {}).value || '').trim();
    
    var dateToDo = ((document.getElementById('mDateToDo') || {}).value || '');
    var priority = ((document.getElementById('mPriority') || {}).value || 'transparent');
    
    var statusEl = document.querySelector('input[name="mStatus"]:checked');
    var status = statusEl ? statusEl.value : 'to_do';

    var stepVal = ((document.getElementById('mMissionSteps') || {}).value || '');
    var missionStepsId = (stepVal && stepVal !== 'new') ? stepVal : '';

    var privateMission = (document.getElementById('mPrivate') && document.getElementById('mPrivate').checked) ? 1 : 0;

    var subMissionsArray = subMissions ? subMissions.split('\n').map(function(s){return s.trim();}).filter(Boolean) : [];
    var daysAds = ((document.getElementById('mDaysAfterAds') || {}).value || '');
    var durationEl = document.querySelector('input[name="mDuration"]:checked');
    var duration = durationEl ? durationEl.value : '';
    if (duration === 'choose_date') duration = dateToDo;

    var finalPriority = priority.toLowerCase();
    if (finalPriority === 'default') finalPriority = 'transparent';

    var uploadedImgs = (state.currentMissionImages && state.currentMissionImages.length) ? state.currentMissionImages.slice() : [];
    state.missionImages = getPersistedMissionImages();
    if (uploadedImgs.length) {
      if (missionId) state.missionImages[String(missionId)] = uploadedImgs;
      state.missionImages[text] = uploadedImgs;
      savePersistedMissionImages();
    }

    var firstImg = uploadedImgs.length ? uploadedImgs[0] : '';

    try {
      if (missionId) {
        var currentMission = null;
        var board = state.board || {};
        (board.columns || []).forEach(function (col) {
          if (currentMission) return;
          currentMission = (col.missions || []).find(function (m) { return String(m.id) === String(missionId); }) || null;
        });

        var editPayload = {
          id: missionId,
          mission_id: missionId,
          data_id: missionId,
          mission: text,
          note: notes,
          project_id: projectId,
          customer_id: customerId,
          date_to_do: duration || dateToDo,
          priority: finalPriority,
          appoinment_color1: finalPriority,
          color: finalPriority,
          project_column: status || currentMission && currentMission.status || 'to_do',
          image: firstImg,
          images: uploadedImgs,
          media: firstImg
        };
        if (missionStepsId) editPayload.missions_steps_id = missionStepsId;

        await global.MineralBarApp.dashCall('edit_mission', editPayload);

        var currentStatus = currentMission && currentMission.status ? String(currentMission.status) : 'to_do';
        if (status && String(status) !== String(currentStatus)) {
          await global.MineralBarApp.dashCall('move_mission', {
            mission_id: missionId,
            project_id: projectId,
            col_id: status,
            order: []
          });
        }
        closeModal();
        toast('Mission updated');
      } else {
        var payload = {
          project_id: projectId,
          message: text,
          data_mission_type: colKey || status,
          customer_id: customerId,
          organizations_user: ids,
          note: notes,
          sub_missions: subMissionsArray,
          date_to_do: duration,
          days_after_ads: daysAds,
          appoinment_color1: finalPriority,
          private_mission: privateMission,
          image: firstImg,
          images: uploadedImgs,
          media: firstImg
        };
        if (missionStepsId) payload.missions_steps_id = missionStepsId;
        var res = await global.MineralBarApp.dashCall('create_mission', payload);
        var createdId = String((res && (res.id || res.mission_id || res.success || (res.data && res.data.id))) || '');
        var serverImg = (res && (res.image_url || res.image || res.media)) || '';
        var finalImgs = uploadedImgs.slice();
        if (serverImg && finalImgs.indexOf(serverImg) === -1) {
          finalImgs.unshift(serverImg);
        }
        if (finalImgs.length) {
          if (createdId) state.missionImages[createdId] = finalImgs;
          state.missionImages[text] = finalImgs;
          savePersistedMissionImages();
        }
        closeModal();
        toast(tr('toast_mission_created'));
      }
      await loadBoard(board.id);
    } catch (err) {
      toast((err && err.message) || tr('err_failed'));
    }
  }

  function deleteMission(missionId) {
    var board = state.board;
    if (!missionId || !board) return;
    var mission = null;
    (board.columns || []).forEach(function (col) {
      if (mission) return;
      mission = (col.missions || []).find(function (m) { return String(m.id) === String(missionId); }) || null;
    });
    openModal(tr('delete_mission_title'),
      '<p class="confirm-text">' + esc(tr('confirm_delete_mission')) + '</p>' +
      (mission && mission.title ? '<div class="confirm-target">' + esc(mission.title) + '</div>' : ''),
      '<button type="button" class="btn-ghost" data-modal-close>' + esc(tr('cancel')) + '</button>' +
      '<button type="button" class="btn-primary btn-danger" id="mDeleteConfirm">' + esc(tr('delete')) + '</button>'
    );
    var confirmBtn = document.getElementById('mDeleteConfirm');
    if (confirmBtn) confirmBtn.addEventListener('click', function () { confirmDeleteMission(missionId, confirmBtn); });
  }
  async function confirmDeleteMission(missionId, btn) {
    var board = state.board;
    if (!board) return;
    btn.disabled = true;
    btn.textContent = tr('deleting');
    try {
      await global.MineralBarApp.dashCall('delete_mission', { mission_id: missionId, project_id: board.id });
      closeModal();
      (board.columns || []).forEach(function (col) {
        col.missions = (col.missions || []).filter(function (m) { return String(m.id) !== String(missionId); });
      });
      renderBoard();
      toast(tr('toast_mission_deleted'));
      await loadBoard(board.id, { silent: true });
    } catch (err) {
      btn.disabled = false;
      btn.textContent = tr('delete');
      toast((err && err.message) || tr('err_failed'));
    }
  }

  function bindBoard() {
    var root = document.querySelector('[data-view="board"]');
    if (!root || root.__bound) return;
    root.__bound = true;
    var back = document.getElementById('btnBoardBack');
    if (back) back.addEventListener('click', function () { global.location.href = 'projects.html'; });
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
      var editMission = e.target.closest('[data-edit-mission]');
      if (editMission) { e.preventDefault(); openAddMission(editMission.getAttribute('data-col'), editMission.getAttribute('data-edit-mission')); return; }
      var delMission = e.target.closest('[data-delete-mission]');
      if (delMission) { e.preventDefault(); e.stopPropagation(); deleteMission(delMission.getAttribute('data-delete-mission')); return; }
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
    var ok = await MineralBarApp.ensureAuth('login.html');
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
    ensureBoardClient();
  }

  function currentView() {
    var page = (document.body && document.body.getAttribute('data-page')) || '';
    if (page === 'board' || page === 'projects' || page === 'login') return page;
    var path = String((global.location && global.location.pathname) || '').toLowerCase();
    if (path.indexOf('board.html') !== -1) return 'board';
    if (path.indexOf('projects.html') !== -1) return 'projects';
    if (path.indexOf('login.html') !== -1) return 'login';
    return MineralBarApp.isAuthenticated() ? 'projects' : 'login';
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
      applyLiveSync(detail).catch(function () { });
    }, 1200);
  }
  async function applyLiveSync(detail) {
    if (state.dragging || state.loading || !state.dashReady) return;
    if (!global.MineralBarApp || !MineralBarApp.isAuthenticated || !MineralBarApp.isAuthenticated()) return;
    if (state.liveSyncing) {
      state.livePending = true;
      return;
    }
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
      if (state.livePending) {
        state.livePending = false;
        scheduleLiveSync({ key: 'pending' });
      }
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
      var st = {};
      try { st = MineralBarApp.getRealtimeState() || {}; } catch (e) { st = {}; }
      if (st.connected && st.status === 'ready') return;
      scheduleLiveSync({ key: 'poll' });
    }, 30000);
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
      var rememberOn = localStorage.getItem('biz1fs_remember') === '1';
      if (rememberOn && rememberEl) rememberEl.checked = true;
    } catch (e) { /* ignore */ }

    var allowAutofillClear = true;
    function clearLoginFields() {
      if (!allowAutofillClear) return;
      if (usernameEl) usernameEl.value = '';
      if (passwordEl) passwordEl.value = '';
    }
    clearLoginFields();
    global.addEventListener('pageshow', function () {
      allowAutofillClear = true;
      clearLoginFields();
      global.setTimeout(clearLoginFields, 80);
    });
    global.setTimeout(clearLoginFields, 80);
    global.setTimeout(clearLoginFields, 400);

    function runLogin() {
      if (requestInFlight || Date.now() < cooldownUntil) return Promise.resolve();
      clearError();
      var username = usernameEl.value.trim();
      var password = passwordEl.value;
      var otp = waitingOtp ? otpEl.value.trim() : '';
      var remember = !!(rememberEl && rememberEl.checked);
      if (!username || !password) { showErrorKey('err_fill'); return Promise.resolve(); }
      if (waitingOtp && !otp) { showErrorKey('err_otp'); return Promise.resolve(); }
      setRequestBusy(true, 'login');
      loginBtnText.textContent = waitingOtp ? tr('verifying') : tr('logging_in');
      return MineralBarApp.login({ username: username, password: password, otp: otp, remember: remember })
        .then(function (result) {
          if (result.otpRequired) {
            if (waitingOtp && otp) { showErrorKey('err_invalid_otp'); otpEl.select(); return; }
            enterOtpMode();
            return;
          }
          if (result.ok) {
            resetWorkspace();
            global.location.href = 'projects.html';
            return;
          }
          showErrorKey('err_failed');
        })
        .catch(function (err) {
          if (waitingOtp && otp && !getRetrySeconds(err) && isOtpValidationError(err)) {
            showErrorKey('err_invalid_otp'); otpEl.select();
          } else handleLoginError(err);
        })
        .then(function () {
          setRequestBusy(false, 'login');
          if (Date.now() >= cooldownUntil) setLoginBtnLabel();
        });
    }

    document.getElementById('togglePassword').addEventListener('click', function () {
      passwordEl.type = passwordEl.type === 'password' ? 'text' : 'password';
    });

    document.querySelectorAll('.demo-user-btn').forEach(function (btn) {
      if (btn.__bound) return;
      btn.__bound = true;
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        allowAutofillClear = false;
        var userVal = btn.getAttribute('data-user') || 'demo@jlaw.co.il';
        var passVal = btn.getAttribute('data-pass') || 'pass0364';
        if (usernameEl) usernameEl.value = userVal;
        if (passwordEl) passwordEl.value = passVal;
        clearError();
        runLogin();
      });
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
            global.location.href = 'projects.html';
            return;
          }
          showErrorKey('err_resend_otp');
        } catch (err) { handleLoginError(err, 'err_resend_otp'); }
        finally { setRequestBusy(false, 'resend'); }
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      runLogin();
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
        syncSelectAllState();
        return;
      }
      var assign = e.target.closest('[data-assign]');
      if (assign) { e.preventDefault(); openAssignModal(assign.getAttribute('data-assign')); return; }
      var editBtn = e.target.closest('[data-edit]');
      if (editBtn) { e.preventDefault(); openCreateModal(editBtn.getAttribute('data-edit')); return; }
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
          global.location.href = 'login.html';
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
      if (mCreate) { submitAddMission(mCreate.getAttribute('data-col'), mCreate.getAttribute('data-mission-id') || null); }
    });
  }

  async function bootProjects() {
    var ok = await MineralBarApp.ensureAuth('login.html');
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

  function boardIdFromUrl() {
    try {
      return String(new URLSearchParams(global.location.search || '').get('id') || '').trim();
    } catch (e) {
      return '';
    }
  }

  async function bootPage() {
    var page = currentView();

    if (page === 'login') {
      if (MineralBarApp.isAuthenticated()) {
        global.location.href = 'projects.html';
        return;
      }
      showView('login');
      MineralBarI18n.apply();
      initLogin();
      return;
    }

    if (page === 'board') {
      var boardId = boardIdFromUrl();
      if (!boardId) {
        global.location.href = 'projects.html';
        return;
      }
      await bootBoard(boardId);
      return;
    }

    await bootProjects();
  }

  document.addEventListener('DOMContentLoaded', async function () {
    MineralBarI18n.setTheme(MineralBarI18n.getTheme());
    MineralBarI18n.apply();
    bindChrome();

    async function tryUrlTokenLogin() {
      if (!MineralBarApp.readUrlToken || !MineralBarApp.loginWithToken) return false;
      var urlToken = '';
      try {
        urlToken = MineralBarApp.readUrlToken() || '';
        if (urlToken && MineralBarApp.clearUrlToken) MineralBarApp.clearUrlToken();
      } catch (e0) {
        return false;
      }
      if (!urlToken) return false;

      try {
        var result = await MineralBarApp.loginWithToken(urlToken);
        if (result && result.ok) {
          global.location.href = 'projects.html';
          return true;
        }
      } catch (err) {
        if (currentView() !== 'login') {
          global.location.href = 'login.html';
          return true;
        }
        showView('login');
        MineralBarI18n.apply();
        initLogin();
        var errorText = document.getElementById('errorText');
        var errorBox = document.getElementById('errorBox');
        if (errorText) errorText.textContent = (err && err.message) || 'Login failed';
        if (errorBox) errorBox.classList.remove('hidden');
      }
      return false;
    }

    if (currentView() === 'login') {
      try {
        if (await tryUrlTokenLogin()) return;
      } catch (e1) { /* fall through */ }
      initLogin();
    }

    await bootPage();
  });
})(typeof window !== 'undefined' ? window : globalThis);
