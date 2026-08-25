/** Biz1 Showcase — bundled app JS (Login-only build) */

/* ===== biz1-sdk.js ===== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Biz1SDK = factory();
  }
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

  function createMemoryStorage() {
    var data = {};
    return {
      getItem: function (key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
      setItem: function (key, value) { data[key] = String(value); },
      removeItem: function (key) { delete data[key]; }
    };
  }

  function defaultStorage() {
    try {
      if (typeof localStorage !== 'undefined') return localStorage;
    } catch (e) { /* private browser contexts can block localStorage */ }
    return createMemoryStorage();
  }

  function normalizeDomain(domain) {
    if (!domain || typeof domain !== 'string') {
      throw new Error('Biz1 SDK requires domain, for example: https://eli.bull36.com');
    }
    return domain.replace(/\/+$/, '');
  }

  function normalizeAppPath(path) {
    var value = String(path || '/app').trim() || '/app';
    if (value.charAt(0) !== '/') value = '/' + value;
    return value.replace(/\/+$/, '');
  }

  function pad2(value) { return String(value).padStart(2, '0'); }

  function formatUtcDateTime(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return [date.getUTCFullYear(), pad2(date.getUTCMonth() + 1), pad2(date.getUTCDate())].join('-') + ' ' +
      [pad2(date.getUTCHours()), pad2(date.getUTCMinutes()), pad2(date.getUTCSeconds())].join(':');
  }

  function isDateField(key) {
    var name = String(key || '').toLowerCase();
    return /(^|_)(date|datetime|time|followup|due)(_|$)/.test(name)
      || ['from', 'to', 'start', 'stop', 'created_at', 'updated_at', 'last_update', 'last_updated', 'payment_date'].indexOf(name) !== -1
      || name.indexOf('date_of_due') !== -1;
  }

  function localDateStringToDate(value) {
    var text = String(value || '').trim();
    var full = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (!full) return null;
    return new Date(Number(full[1]), Number(full[2]) - 1, Number(full[3]), Number(full[4] || 0), Number(full[5] || 0), Number(full[6] || 0));
  }

  function normalizeDateInput(key, value) {
    if (value instanceof Date) return formatUtcDateTime(value);
    if (!isDateField(key) || typeof value !== 'string') return value;
    var text = value.trim();
    if (!text) return value;
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(text)) return text.length === 5 ? text + ':00' : text;
    var localDate = localDateStringToDate(text);
    if (localDate) return formatUtcDateTime(localDate);
    var parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? value : formatUtcDateTime(parsed);
  }

  function appendBody(body, key, value) {
    if (value === undefined || value === null) return;
    value = normalizeDateInput(key, value);
    if (Array.isArray(value)) {
      value.forEach(function (item) { body.append(key, normalizeDateInput(key, item)); });
      return;
    }
    if (value instanceof Date) { body.append(key, formatUtcDateTime(value)); return; }
    if (typeof value === 'object') { body.append(key, JSON.stringify(value)); return; }
    body.append(key, String(value));
  }

  function convertFormData(data) {
    var body = new FormData();
    data.forEach(function (value, key) {
      if (typeof value === 'string' || value instanceof Date) body.append(key, normalizeDateInput(key, value));
      else body.append(key, value);
    });
    return body;
  }

  function convertUrlSearchParams(data) {
    var body = new URLSearchParams();
    data.forEach(function (value, key) { body.append(key, normalizeDateInput(key, value)); });
    return body;
  }

  function toBody(data) {
    if (!data) return new URLSearchParams();
    if (typeof FormData !== 'undefined' && data instanceof FormData) return convertFormData(data);
    if (data instanceof URLSearchParams) return convertUrlSearchParams(data);
    var body = new URLSearchParams();
    Object.keys(data).forEach(function (key) { appendBody(body, key, data[key]); });
    return body;
  }

  function routeProxy(client, prefix) {
    return new Proxy(function () { }, {
      get: function (_target, prop) {
        if (prop === 'then') return undefined;
        var next = prefix ? prefix + '.' + String(prop) : String(prop);
        return routeProxy(client, next);
      },
      apply: function (_target, _thisArg, args) {
        return client.request(prefix, args[0] || {}, args[1] || {});
      }
    });
  }

  function Biz1RealtimeClient(client, options) {
    options = options || {};
    this.client = client;
    this.path = options.path || '/realtime/socket.io';
    this.platform = options.platform || 'web';
    this.io = options.io || null;
    this.socket = null;
    this.handlers = {};
    this.storage = client.storage;
  }

  Biz1RealtimeClient.prototype.deviceId = function () {
    var existing = this.storage.getItem('biz1_realtime_device_id');
    if (existing) return existing;
    var id = this.platform + '-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    this.storage.setItem('biz1_realtime_device_id', id);
    return id;
  };

  Biz1RealtimeClient.prototype.lastEventId = function () {
    return Number(this.storage.getItem('biz1_realtime_last_event_id') || 0);
  };

  Biz1RealtimeClient.prototype.setLastEventId = function (eventId) {
    if (eventId == null || eventId === '') return false;
    var next = Number(eventId);
    var prev = this.lastEventId();
    if (!isFinite(next)) {
      var prevRaw = String(this.storage.getItem('biz1_realtime_last_event_id') || '');
      if (String(eventId) === prevRaw) return false;
      this.storage.setItem('biz1_realtime_last_event_id', String(eventId));
      return true;
    }
    if (next <= prev) return false;
    this.storage.setItem('biz1_realtime_last_event_id', String(next));
    return true;
  };

  Biz1RealtimeClient.prototype.resolveIo = function () {
    if (this.io) return this.io;
    if (typeof globalThis !== 'undefined' && globalThis.io) return globalThis.io;
    throw new Error('Socket.IO client is required. Pass { io } or load socket.io-client first.');
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

  function Biz1Client(options) {
    options = options || {};
    this.domain = normalizeDomain(options.domain);
    this.appPath = normalizeAppPath(options.appPath || options.routeBase || (options.nodeDirect ? '/app-node' : '/app'));
    this.storage = options.storage || defaultStorage();
    this.fetch = options.fetch || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
    if (!this.fetch) throw new Error('Biz1 SDK requires fetch support.');
    this.realtime = new Biz1RealtimeClient(this, {
      io: options.io,
      path: options.socketPath || '/realtime/socket.io',
      platform: options.platform || 'web'
    });
    this.routes = routeProxy(this, '');
    this.installAliases();
  }

  Biz1Client.prototype.installAliases = function () {
    var self = this;
    this.account = { basic: function () { return self.request('User.Basic'); } };
    this.customers = {
      list: function (filters) { return self.list('Customer.List', filters); },
      count: function (filters) { return self.count('Customer.Count', filters); },
      get: function (customerId, extra) { return self.request('Customer.Get', Object.assign({ customer_id: customerId }, extra || {})); },
      add: function (data) { return self.request('Customer.Add', data); },
      update: function (customerId, data) { return self.request('Customer.Edit', Object.assign({ customer_id: customerId }, data || {})); },
      remove: function (customerId) { return self.request('Customer.Delete', { customer_id: customerId }); }
    };
    [
      ['Mission', 'missions'], ['Ticket', 'tickets'], ['Documents', 'documents'], ['Recordings', 'recordings'],
      ['Rooms', 'rooms'], ['Products', 'products'], ['Projects', 'projects'], ['Forms', 'forms'],
      ['Entries', 'entries'], ['Expenses', 'expenses']
    ].forEach(function (pair) {
      var category = pair[0]; var group = pair[1];
      self[group] = {
        list: function (filters) { return self.list(category + '.List', filters); },
        count: function (filters) { return self.count(category + '.Count', filters); },
        get: function (id, extra) { return self.request(category + '.Get', Object.assign({ id: id }, extra || {})); },
        add: function (data) { return self.request(category + '.Add', data); },
        update: function (id, data) { return self.request(category + '.Update', Object.assign({ id: id }, data || {})); },
        remove: function (id) { return self.request(category + '.Delete', { id: id }); }
      };
    });
  };

  Biz1Client.prototype.getToken = function () { return this.storage.getItem(TOKEN_KEY) || ''; };
  Biz1Client.prototype.setToken = function (token) {
    if (token) this.storage.setItem(TOKEN_KEY, token);
    else this.storage.removeItem(TOKEN_KEY);
  };

  Biz1Client.prototype.login = async function (credentials) {
    credentials = credentials || {};
    var body = { password: credentials.password || '', otp: String(credentials.otp || '').trim() };
    var email = credentials.email || '';
    var username = credentials.username || credentials.user || '';
    var id = credentials.id;
    var phone = credentials.phone || '';
    if (email) body.username = email;
    else if (id !== undefined && id !== null && String(id).trim() !== '') body.id = id;
    else if (phone) body.phone = phone;
    else if (username) body.username = username;
    var data = await this.request('Login', body, { public: true, throwOnError: false });
    if (data && data.token && !data.otp_required) this.setToken(data.token);
    return data;
  };

  Biz1Client.prototype.logout = function () { this.setToken(''); this.realtime.disconnect(); };

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
    if (json && typeof json === 'object') json._httpStatus = res.status;
    return json;
  };

  Biz1Client.prototype.list = async function (route, filters) {
    var raw = await this.request(route, filters || {});
    var rows = Array.isArray(raw.data) ? raw.data : (Array.isArray(raw.rows) ? raw.rows : []);
    return { rows: rows, total: rows.length, raw: raw };
  };

  Biz1Client.prototype.count = async function (route, filters) {
    var raw = await this.request(route, filters || {});
    return { count: Number(raw.count || raw.total || 0), raw: raw };
  };

  return {
    Biz1Client: Biz1Client,
    Biz1RealtimeClient: Biz1RealtimeClient,
    Biz1ApiError: Biz1ApiError,
    toUtcDateTime: formatUtcDateTime,
    createClient: function (options) { return new Biz1Client(options); }
  };
});


/* ===== biz1-app.js (bootstrap) ===== */
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
    if (!user) throw new Error('Set Biz1Config.user in assets/config.js (Bull36 subdomain)');
    return 'https://' + user + '.bull36.com';
  }

  var DOMAIN = resolveDomain();
  var ROLE_KEY = 'biz1fs_role';
  var EMAIL_KEY = 'biz1fs_email';
  var REMEMBER_KEY = 'biz1fs_remember';
  var CRED_KEY = 'biz1fs_cred';
  var SESSION_PASS_KEY = 'biz1fs_session_pass';
  var USER_KEY = 'biz1fs_user_basic';

  var ROLE_HOME = { sales: 'dashboard.html', service: 'dashboard.html', tech: 'dashboard.html' };

  function getClient() {
    if (!global.Biz1SDK || !global.Biz1SDK.Biz1Client) {
      throw new Error('Biz1 SDK not loaded.');
    }
    if (!global.__biz1FsClient) {
      global.__biz1FsClient = new global.Biz1SDK.Biz1Client({ domain: DOMAIN, storage: global.localStorage });
    }
    return global.__biz1FsClient;
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

  function saveSession(userBasic, role, email) {
    try {
      global.localStorage.setItem(USER_KEY, JSON.stringify(userBasic || {}));
      global.localStorage.setItem(ROLE_KEY, role || 'sales');
      if (email) global.localStorage.setItem(EMAIL_KEY, email);
    } catch (e) { /* ignore */ }
  }

  function clearSession() {
    try { disconnectRealtime(); } catch (e0) { /* ignore */ }
    try {
      global.localStorage.removeItem(USER_KEY);
      global.localStorage.removeItem(ROLE_KEY);
      global.localStorage.removeItem(CRED_KEY);
      global.localStorage.removeItem(REMEMBER_KEY);
      if (global.sessionStorage) global.sessionStorage.removeItem(SESSION_PASS_KEY);
    } catch (e) { /* ignore */ }
    try { getClient().logout(); } catch (e2) { /* ignore */ }
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
    if (/calendar|appointment|booking|schedule|google/i.test(key)) return 'calendar';
    if (/lead|crm|customer|client/i.test(key)) return 'leads';
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
      var existing = document.querySelector('script[data-mb-src="' + src + '"]');
      if (existing) {
        if (global.io) return resolve();
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
        missions: realtimeState.registered.filter(function (k) { return classifyRealtimeEvent({ key: k }) === 'missions'; }),
        calendar: realtimeState.registered.filter(function (k) { return classifyRealtimeEvent({ key: k }) === 'calendar'; })
      });
    });

    client.realtime.on('*', function (event) {
      var group = classifyRealtimeEvent(event);
      var detail = { group: group, key: event && event.key, event: event };
      dispatchAppEvent('mineralbar:realtime', detail);
      if (group === 'messages') dispatchAppEvent('mineralbar:messages', detail);
      if (group === 'missions') dispatchAppEvent('mineralbar:missions', detail);
      if (group === 'leads') dispatchAppEvent('mineralbar:leads', detail);
      if (group === 'calendar') dispatchAppEvent('mineralbar:calendar', detail);
    });

    client.realtime.on('rooms:refresh', function (event) {
      dispatchAppEvent('mineralbar:realtime', { group: 'rooms', key: 'rooms:refresh', event: event });
    });
  }

  /**
   * Connect Socket.IO realtime after login (same pattern as biz1_ticket).
   * Server registers the user on connect (auth.bearer) and returns subscribed
   * event keys in biz1:ready.
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

  function detectRole(username, userBasic) {
    var email = String(username || '').toLowerCase().trim();
    if (email.indexOf('sales@') === 0) return 'sales';
    if (email.indexOf('service@') === 0) return 'service';
    if (email.indexOf('tech@') === 0) return 'tech';
    return 'sales';
  }

  function getRole() { return global.localStorage.getItem(ROLE_KEY) || ''; }
  function getEmail() { return global.localStorage.getItem(EMAIL_KEY) || ''; }
  function homeForRole(role) { return ROLE_HOME[role] || ROLE_HOME.sales; }

  function truthyFlag(v) { return v === 1 || v === '1' || v === true || v === 'true'; }

  function isOtpRequiredResponse(data) {
    if (!data || typeof data !== 'object') return false;
    if (truthyFlag(data.otp_required) || truthyFlag(data.otpRequired)) return true;
    return false;
  }

  function responseMessage(data) {
    if (!data || typeof data !== 'object') return '';
    return String(data.message || data.error || '');
  }

  function rateLimitSeconds(data) {
    if (!data || typeof data !== 'object') return 0;
    var fields = [data.retry_after, data.retryAfter, data.wait_seconds, data.waitSeconds];
    for (var i = 0; i < fields.length; i += 1) {
      var direct = Number(fields[i]);
      if (isFinite(direct) && direct > 0) return Math.min(3600, Math.ceil(direct));
    }
    var message = responseMessage(data);
    var wait = message.match(/wait\s+(\d+(?:\.\d+)?)\s*(seconds?|secs?|minutes?|mins?)/i);
    if (wait) {
      var amount = Number(wait[1]);
      if (/^m/i.test(wait[2])) amount *= 60;
      return Math.min(3600, Math.max(1, Math.ceil(amount)));
    }
    if (Number(data._httpStatus) === 429 || /too many (?:login )?attempts/i.test(message)) return 60;
    return 0;
  }

  function clearOtpChallenge() {
    try { global.sessionStorage.removeItem('biz1fs_otp_challenge'); } catch (e) { /* legacy cleanup */ }
  }

  function codedError(code, retryAfter) {
    var error = new Error(code);
    error.code = code;
    if (retryAfter) error.retryAfter = Math.min(3600, Math.max(1, Number(retryAfter) || 60));
    return error;
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

  async function login({ username, password, otp, remember }) {
    var client = getClient();
    var otpVal = (otp || '').trim();
    var loginId = (username || '').trim();
    var data;
    try {
      data = await client.login(resolveLoginCredentials(loginId, password, otpVal));
    } catch (requestError) {
      throw codedError('NETWORK_FAILURE');
    }

    var waitSeconds = rateLimitSeconds(data);
    if (waitSeconds) {
      client.setToken('');
      throw codedError('RATE_LIMIT', waitSeconds);
    }
    if (isOtpRequiredResponse(data)) {
      client.setToken('');
      if (otpVal) throw codedError('INVALID_OTP');
      return { ok: false, otpRequired: true };
    }
    if (!data || !data.token) {
      client.setToken('');
      throw codedError(otpVal ? 'INVALID_OTP' : 'INVALID_CREDENTIALS');
    }

    var userBasic;
    try {
      userBasic = await client.account.basic();
    } catch (basicError) {
      client.setToken('');
      throw codedError('NETWORK_FAILURE');
    }
    var role = detectRole(username, userBasic);
    saveSession(userBasic, role, username);
    saveCredentials(username, password, !!remember);
    clearOtpChallenge();

    return {
      ok: true, otpRequired: false, role: role,
      user: (userBasic.data && userBasic.data.user) || userBasic.user || userBasic,
      userBasic: userBasic, dest: homeForRole(role), raw: data
    };
  }

  async function resendOtp({ username, password }) {
    var loginId = (username || '').trim();
    var data;
    try {
      data = await getClient().login(resolveLoginCredentials(loginId, password, ''));
    } catch (requestError) {
      throw codedError('NETWORK_FAILURE');
    }
    var waitSeconds = rateLimitSeconds(data);
    if (waitSeconds) throw codedError('RATE_LIMIT', waitSeconds);
    if (isOtpRequiredResponse(data)) return { ok: true, otpRequired: true };
    throw codedError('RESEND_FAILURE');
  }

  function isAuthenticated() {
    try { return !!(getClient().getToken() && getRole()); } catch (e) { return false; }
  }

  global.MineralBarApp = {
    DOMAIN: DOMAIN,
    getDomain: function () { return DOMAIN; },
    getClient: getClient,
    login: login,
    resendOtp: resendOtp,
    clearOtpChallenge: clearOtpChallenge,
    canAutoRefresh: canAutoRefresh,
    getSavedCredentials: getSavedCredentials,
    saveCredentials: saveCredentials,
    detectRole: detectRole,
    saveSession: saveSession,
    clearSession: clearSession,
    getRole: getRole,
    getEmail: getEmail,
    homeForRole: homeForRole,
    isAuthenticated: isAuthenticated,
    connectRealtime: connectRealtime,
    disconnectRealtime: disconnectRealtime,
    getRealtimeState: getRealtimeState,
    getRegisteredRealtimeEvents: getRegisteredRealtimeEvents,
    MESSAGE_EVENT_KEYS: MESSAGE_EVENT_KEYS,
    MISSION_EVENT_KEYS: MISSION_EVENT_KEYS
  };
})(typeof window !== 'undefined' ? window : globalThis);


/* ===== theme + language toggle ===== */
(function (global) {
  'use strict';
  var THEME_KEY = 'biz1fs_theme';
  var LANG_KEY = 'biz1fs_lang';
  var I18N = {
    en: {
      page_login_title: 'Biz1 Showcase',
      lang_label: 'Language',
      toggle_theme: 'Light / Dark mode',
      brand: 'Biz1 Showcase',
      login_subtitle: 'Calendar · Loyalty · Front desk',
      account_login: 'Sign in to your account',
      email_label: 'Email / Username / Phone / ID',
      email_placeholder: 'email, username, phone or ID',
      password_label: 'Password',
      password_placeholder: 'Enter password',
      toggle_password: 'Show or hide password',
      otp_label: 'Verification code (OTP)',
      otp_placeholder: 'Enter verification code',
      resend_otp: 'Resend OTP',
      resend_in: 'Resend in {seconds}s',
      remember_me: 'Remember me',
      login_btn: 'Sign in',
      verify_btn: 'Verify & Sign in',
      loading: 'Loading…',
      verifying: 'Verifying…',
      resending: 'Resending…',
      required_credentials: 'Please enter your email, username, phone or ID and password.',
      required_otp: 'Please enter the verification code.',
      invalid_credentials: 'Invalid login or password.',
      invalid_otp: 'Invalid verification code. Please try again.',
      network_failure: 'Network error. Check your connection and try again.',
      resend_failure: 'Could not resend the verification code. Please try again.',
      rate_limit: 'Too many login attempts. Try again in {time}.',
      footer_crm: 'Biz1 Showcase'
    },
    he: {
      page_login_title: 'תצוגת Biz1',
      lang_label: 'שפה',
      toggle_theme: 'מצב בהיר / כהה',
      brand: 'תצוגת Biz1',
      login_subtitle: 'יומן · נאמנות · דלפק קבלה',
      account_login: 'התחברות לחשבון',
      email_label: 'אימייל / שם משתמש / טלפון / מזהה',
      email_placeholder: 'אימייל, שם משתמש, טלפון או מזהה',
      password_label: 'סיסמה',
      password_placeholder: 'הכנס סיסמה',
      toggle_password: 'הצג או הסתר סיסמה',
      otp_label: 'קוד אימות (OTP)',
      otp_placeholder: 'הכנס קוד אימות',
      resend_otp: 'שלח OTP שוב',
      resend_in: 'שליחה חוזרת בעוד {seconds} שנ׳',
      remember_me: 'זכור אותי',
      login_btn: 'התחברות',
      verify_btn: 'אימות והתחברות',
      loading: 'טוען…',
      verifying: 'מאמת…',
      resending: 'שולח שוב…',
      required_credentials: 'יש להזין אימייל, שם משתמש, טלפון או מזהה וסיסמה.',
      required_otp: 'יש להזין את קוד האימות.',
      invalid_credentials: 'פרטי ההתחברות או הסיסמה שגויים.',
      invalid_otp: 'קוד האימות שגוי. נסה שוב.',
      network_failure: 'שגיאת רשת. בדוק את החיבור ונסה שוב.',
      resend_failure: 'לא ניתן לשלוח שוב את קוד האימות. נסה שוב.',
      rate_limit: 'יותר מדי ניסיונות התחברות. נסה שוב בעוד {time}.',
      footer_crm: 'תצוגת Biz1'
    }
  };

  function resolveInitialTheme() {
    try {
      var saved = global.localStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) { /* ignore */ }
    if (global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  }

  function getTheme() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }

  function setTheme(theme) {
    if (theme !== 'dark' && theme !== 'light') theme = 'light';
    document.documentElement.setAttribute('data-theme', theme);
    try { global.localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
  }

  function toggleTheme() { setTheme(getTheme() === 'dark' ? 'light' : 'dark'); }

  function bindThemeToggle() {
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      if (btn.__themeBound) return;
      btn.__themeBound = true;
      btn.addEventListener('click', function (e) { e.preventDefault(); toggleTheme(); });
    });
  }

  function resolveInitialLang() {
    try {
      var saved = global.localStorage.getItem(LANG_KEY);
      if (saved === 'he' || saved === 'en') return saved;
    } catch (e) { /* ignore */ }
    return document.documentElement.lang === 'he' ? 'he' : 'en';
  }

  function applyLanguage(lang) {
    var next = lang === 'he' ? 'he' : 'en';
    var dict = I18N[next] || I18N.en;
    document.title = dict.page_login_title;
    document.documentElement.lang = next;
    // Keep login UI layout always left-to-right (as requested),
    // while still allowing language text switch.
    document.documentElement.dir = 'ltr';
    var appRoot = document.getElementById('appRoot');
    if (appRoot) appRoot.setAttribute('dir', 'ltr');
    if (document.body) {
      document.body.classList.toggle('lang-he', next === 'he');
      document.body.classList.toggle('lang-en', next !== 'he');
    }
    try { global.localStorage.setItem(LANG_KEY, next); } catch (e) { /* ignore */ }

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (dict[key]) el.textContent = dict[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) el.setAttribute('placeholder', dict[key]);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-title');
      if (dict[key]) el.setAttribute('title', dict[key]);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria');
      if (dict[key]) el.setAttribute('aria-label', dict[key]);
    });
    global.dispatchEvent(new CustomEvent('biz1:languagechange', { detail: { lang: next } }));
  }

  global.Biz1LoginI18n = {
    getLang: resolveInitialLang,
    t: function (key, values) {
      var lang = resolveInitialLang();
      var text = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
      Object.keys(values || {}).forEach(function (name) {
        text = text.replace(new RegExp('\\{' + name + '\\}', 'g'), String(values[name]));
      });
      return text;
    }
  };

  function bindLangSwitcher() {
    var buttons = document.querySelectorAll('[data-set-lang]');
    var current = resolveInitialLang();
    applyLanguage(current);
    buttons.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-set-lang') === current);
    });
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lang = btn.getAttribute('data-set-lang') || 'en';
        applyLanguage(lang);
        buttons.forEach(function (b) {
          b.classList.toggle('active', b.getAttribute('data-set-lang') === lang);
        });
      });
    });
  }

  function init() {
    // Login-page helpers only — dashboard loads this file for realtime SDK too
    if (!document.getElementById('loginForm')) return;
    setTheme(resolveInitialTheme());
    bindThemeToggle();
    bindLangSwitcher();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);


/* ===== login-controller.js (uses real Biz1 API — no redirect to other pages, redirect target below) ===== */
(function (global) {
  'use strict';

  function initLogin() {
    var form = global.document.getElementById('loginForm');
    if (!form || form.__bound) return;
    form.__bound = true;

    var usernameEl = global.document.getElementById('username');
    var passwordEl = global.document.getElementById('password');
    var usernameWrap = global.document.getElementById('usernameWrap');
    var passwordWrap = global.document.getElementById('passwordWrap');
    var loginOptions = global.document.getElementById('loginOptions');
    var otpEl = global.document.getElementById('otp');
    var otpWrap = global.document.getElementById('otpWrap');
    var errorBox = global.document.getElementById('errorBox');
    var errorText = global.document.getElementById('errorText');
    var loginBtn = global.document.getElementById('loginBtn');
    var loginBtnText = global.document.getElementById('loginBtnText');
    var rememberEl = global.document.getElementById('remember');
    var resendBtn = global.document.getElementById('resendOtpBtn');
    var resendText = global.document.getElementById('resendOtpText');
    var waitingOtp = false;
    var requestInFlight = false;
    var requestKind = '';
    var resendTimer = null;
    var resendCooldownUntil = 0;
    var rateLimitTimer = null;
    var rateLimitUntil = 0;

    try {
      var saved = MineralBarApp.getSavedCredentials
        ? MineralBarApp.getSavedCredentials()
        : null;
      var savedEmail =
        (saved && saved.username) ||
        (MineralBarApp.getEmail && MineralBarApp.getEmail()) ||
        '';
      if (savedEmail && usernameEl && !usernameEl.value) {
        usernameEl.value = savedEmail;
      }
      if (saved && saved.source === 'remember' && saved.password && passwordEl && !passwordEl.value) {
        passwordEl.value = saved.password;
        if (rememberEl) rememberEl.checked = true;
      }
    } catch (e) { /* ignore */ }

    function t(key, values) {
      return global.Biz1LoginI18n ? global.Biz1LoginI18n.t(key, values) : key;
    }
    function formatTime(seconds) {
      var safe = Math.max(0, Math.min(3600, Math.ceil(seconds || 0)));
      return String(Math.floor(safe / 60)).padStart(2, '0') + ':' + String(safe % 60).padStart(2, '0');
    }
    function showErrorKey(key, values) {
      errorText.textContent = t(key, values);
      errorBox.style.background = '#fbeeed';
      errorBox.style.borderColor = '#f0c9c4';
      errorText.style.color = '#c0392b';
      errorBox.classList.remove('hidden');
    }
    function clearError() { errorBox.classList.add('hidden'); errorText.textContent = ''; }

    function rateSecondsLeft() {
      return Math.max(0, Math.ceil((rateLimitUntil - Date.now()) / 1000));
    }
    function resendSecondsLeft() {
      return Math.max(0, Math.ceil((resendCooldownUntil - Date.now()) / 1000));
    }
    function refreshControls() {
      var rateLeft = rateSecondsLeft();
      var resendLeft = resendSecondsLeft();
      loginBtn.disabled = requestInFlight || rateLeft > 0;
      if (requestInFlight && requestKind === 'login') {
        loginBtnText.textContent = waitingOtp ? t('verifying') : t('loading');
      } else if (rateLeft > 0) {
        loginBtnText.textContent = formatTime(rateLeft);
      } else {
        loginBtnText.textContent = waitingOtp ? t('verify_btn') : t('login_btn');
      }
      if (resendBtn) {
        resendBtn.disabled = !waitingOtp || requestInFlight || rateLeft > 0 || resendLeft > 0;
      }
      if (resendText) {
        if (requestInFlight && requestKind === 'resend') resendText.textContent = t('resending');
        else if (rateLeft > 0) resendText.textContent = formatTime(rateLeft);
        else if (resendLeft > 0) resendText.textContent = t('resend_in', { seconds: resendLeft });
        else resendText.textContent = t('resend_otp');
      }
    }
    function stopResendCooldown() {
      if (resendTimer) { clearInterval(resendTimer); resendTimer = null; }
      resendCooldownUntil = 0;
      refreshControls();
    }
    function startResendCooldown(seconds) {
      stopResendCooldown();
      resendCooldownUntil = Date.now() + (seconds * 1000);
      function tick() {
        if (resendSecondsLeft() <= 0) { stopResendCooldown(); return; }
        refreshControls();
      }
      tick();
      resendTimer = setInterval(tick, 250);
    }
    function stopRateLimit() {
      if (rateLimitTimer) { clearInterval(rateLimitTimer); rateLimitTimer = null; }
      rateLimitUntil = 0;
      clearError();
      refreshControls();
    }
    function startRateLimit(seconds) {
      if (rateLimitTimer) clearInterval(rateLimitTimer);
      var safe = Math.max(1, Math.min(3600, Math.ceil(Number(seconds) || 60)));
      rateLimitUntil = Date.now() + safe * 1000;
      function tick() {
        var left = rateSecondsLeft();
        if (left <= 0) { stopRateLimit(); return; }
        showErrorKey('rate_limit', { time: formatTime(left) });
        refreshControls();
      }
      tick();
      rateLimitTimer = setInterval(tick, 250);
    }
    function enterOtpStep() {
      waitingOtp = true;
      usernameWrap.classList.add('hidden');
      passwordWrap.classList.add('hidden');
      loginOptions.classList.add('hidden');
      otpWrap.classList.remove('hidden');
      otpEl.value = '';
      clearError();
      startResendCooldown(20);
      refreshControls();
      setTimeout(function () { otpEl.focus(); }, 0);
    }
    function resetOtpStep() {
      waitingOtp = false;
      usernameWrap.classList.remove('hidden');
      passwordWrap.classList.remove('hidden');
      loginOptions.classList.remove('hidden');
      otpWrap.classList.add('hidden');
      otpEl.value = '';
      stopResendCooldown();
      if (global.MineralBarApp && MineralBarApp.clearOtpChallenge) MineralBarApp.clearOtpChallenge();
      refreshControls();
    }

    usernameEl.addEventListener('input', resetOtpStep);

    var toggleBtn = global.document.getElementById('togglePassword');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        passwordEl.type = passwordEl.type === 'password' ? 'text' : 'password';
      });
    }

    if (resendBtn && !resendBtn.__bound) {
      resendBtn.__bound = true;
      resendBtn.addEventListener('click', async function () {
        if (!waitingOtp || requestInFlight || resendSecondsLeft() > 0 || rateSecondsLeft() > 0) return;
        var username = usernameEl.value.trim();
        var password = passwordEl.value;
        if (!username || !password) { showErrorKey('required_credentials'); return; }
        requestInFlight = true;
        requestKind = 'resend';
        clearError();
        refreshControls();
        try {
          var result = await MineralBarApp.resendOtp({ username: username, password: password });
          if (result && result.otpRequired) {
            otpEl.value = '';
            otpEl.focus();
            startResendCooldown(20);
            return;
          }
          showErrorKey('resend_failure');
        } catch (err) {
          if (err && err.code === 'RATE_LIMIT') startRateLimit(err.retryAfter);
          else if (err && err.code === 'NETWORK_FAILURE') showErrorKey('network_failure');
          else showErrorKey('resend_failure');
        } finally {
          requestInFlight = false;
          requestKind = '';
          refreshControls();
        }
      });
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearError();
      var username = usernameEl.value.trim();
      var password = passwordEl.value;
      var otp = waitingOtp ? otpEl.value.trim() : '';
      var remember = !!(rememberEl && rememberEl.checked);

      if (requestInFlight || rateSecondsLeft() > 0) return;
      if (!username || !password) { showErrorKey('required_credentials'); return; }
      if (waitingOtp && !otp) { showErrorKey('required_otp'); otpEl.focus(); return; }

      requestInFlight = true;
      requestKind = 'login';
      refreshControls();
      try {
        var result = await MineralBarApp.login({ username: username, password: password, otp: otp, remember: remember });

        if (result.otpRequired) {
          enterOtpStep();
          return;
        }

        if (result.ok) {
          stopResendCooldown();
          // ---- REDIRECT after real Biz1 API login success ----
          global.location.href = result.dest || 'dashboard.html';
          return;
        }

        showErrorKey(waitingOtp ? 'invalid_otp' : 'invalid_credentials');
      } catch (err) {
        if (err && err.code === 'RATE_LIMIT') startRateLimit(err.retryAfter);
        else if (err && err.code === 'INVALID_OTP') {
          showErrorKey('invalid_otp');
          otpEl.focus();
          otpEl.select();
        } else if (err && err.code === 'NETWORK_FAILURE') showErrorKey('network_failure');
        else showErrorKey('invalid_credentials');
      } finally {
        requestInFlight = false;
        requestKind = '';
        refreshControls();
      }
    });

    global.addEventListener('biz1:languagechange', refreshControls);
    refreshControls();
  }

  function boot() {
    // Only run on the login page (dashboard also loads app.js for realtime)
    if (!global.document.getElementById('loginForm')) return;
    if (global.MineralBarApp && MineralBarApp.isAuthenticated && MineralBarApp.isAuthenticated()) {
      // Already logged in from a previous session
      global.location.href = 'dashboard.html';
      return;
    }
    initLogin();
  }

  if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);