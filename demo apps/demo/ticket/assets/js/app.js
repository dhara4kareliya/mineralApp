/** Biz1 Showcase Field Service — bundled app JS */

/* ===== biz1-sdk.js ===== */
/**
 * Biz1 App SDK.
 *
 * Define the domain once when creating the client, then use the same client for
 * /app REST routes and /realtime/socket.io events.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Biz1SDK = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  var DEFAULT_SOCKET_PATH = '/realtime/socket.io';
  var TOKEN_KEY = 'biz1_sdk_bearer_token';
  var LAST_EVENT_ID_KEY = 'biz1_realtime_last_event_id';
  var DEVICE_ID_KEY = 'biz1_realtime_device_id';

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
    } catch (e) {
      /* private browser contexts can block localStorage */
    }
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

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function formatUtcDateTime(date) {
    // App API date/time fields use UTC in MySQL DATETIME format. This keeps
    // browser, React, Vue, Flutter WebView, and Android WebView clients aligned.
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return [
      date.getUTCFullYear(),
      pad2(date.getUTCMonth() + 1),
      pad2(date.getUTCDate())
    ].join('-') + ' ' + [
      pad2(date.getUTCHours()),
      pad2(date.getUTCMinutes()),
      pad2(date.getUTCSeconds())
    ].join(':');
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
    return new Date(
      Number(full[1]),
      Number(full[2]) - 1,
      Number(full[3]),
      Number(full[4] || 0),
      Number(full[5] || 0),
      Number(full[6] || 0)
    );
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
    if (value instanceof Date) {
      body.append(key, formatUtcDateTime(value));
      return;
    }
    if (typeof value === 'object') {
      body.append(key, JSON.stringify(value));
      return;
    }
    body.append(key, String(value));
  }

  function convertFormData(data) {
    var body = new FormData();
    data.forEach(function (value, key) {
      if (typeof value === 'string' || value instanceof Date) {
        body.append(key, normalizeDateInput(key, value));
      } else {
        // Preserve File/Blob entries exactly so upload routes keep the binary.
        body.append(key, value);
      }
    });
    return body;
  }

  function convertUrlSearchParams(data) {
    var body = new URLSearchParams();
    data.forEach(function (value, key) {
      body.append(key, normalizeDateInput(key, value));
    });
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

  function listRows(raw) {
    if (!raw || typeof raw !== 'object') return [];
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.rows)) return raw.rows;
    if (Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw.records)) return raw.records;
    if (Array.isArray(raw.tickets)) return raw.tickets;
    if (Array.isArray(raw.messages)) return raw.messages;
    return [];
  }

  function listTotal(raw, rows) {
    if (!raw || typeof raw !== 'object') return rows.length;
    var keys = ['count', 'total', 'recordsFiltered', 'recordsTotal', 'totalrecords', 'totalRecords'];
    for (var i = 0; i < keys.length; i += 1) {
      var value = raw[keys[i]];
      if (value !== undefined && value !== null && value !== '' && !Number.isNaN(Number(value))) {
        return Number(value);
      }
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

  function lowerFirst(value) {
    value = String(value || '');
    return value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
  }

  function routeProxy(client, prefix) {
    return new Proxy(function () {}, {
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
    this.path = options.path || DEFAULT_SOCKET_PATH;
    this.platform = options.platform || 'web';
    this.io = options.io || null;
    this.socket = null;
    this.handlers = {};
    this.storage = client.storage;
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
    if (typeof require === 'function') {
      try {
        var mod = require('socket.io-client');
        return mod.io || mod;
      } catch (e) {
        /* optional dependency for Node/React Native builds */
      }
    }
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

    this.socket.on('biz1:ready', function (payload) {
      self.emitLocal('biz1:ready', payload);
    });

    this.socket.on('rooms:refresh', function (event) {
      self.emitLocal('rooms:refresh', event);
    });

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
    (this.handlers[eventKey] || []).slice().forEach(function (handler) {
      handler(payload);
    });
  };

  Biz1RealtimeClient.prototype.disconnect = function () {
    if (this.socket) this.socket.disconnect();
    this.socket = null;
  };

  function Biz1Client(options) {
    options = options || {};
    this.domain = normalizeDomain(options.domain);
    // Keep SDK route calls configurable so dev testing can target the Node
    // proxy directly while production clients continue using the PHP /app bridge.
    this.appPath = normalizeAppPath(options.appPath || options.routeBase || (options.nodeDirect ? '/app-node' : '/app'));
    this.storage = options.storage || defaultStorage();
    this.fetch = options.fetch || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
    if (!this.fetch) throw new Error('Biz1 SDK requires fetch support.');
    this.realtime = new Biz1RealtimeClient(this, {
      io: options.io,
      path: options.socketPath || DEFAULT_SOCKET_PATH,
      platform: options.platform || 'web'
    });

    // Dynamic helper: client.routes.Customer.List({ length: 25 })
    this.routes = routeProxy(this, '');
    this.installAliases();
  }

  Biz1Client.prototype.installAliases = function () {
    var self = this;
    this.account = {
      basic: function () { return self.request('User.Basic'); }
    };
    this.customers = {
      list: function (filters) { return self.list('Customer.List', filters); },
      count: function (filters) { return self.count('Customer.Count', filters); },
      get: function (customerId, extra) { return self.request('Customer.Get', Object.assign({ customer_id: customerId }, extra || {})); },
      add: function (data) { return self.request('Customer.Add', data); },
      update: function (customerId, data) { return self.request('Customer.Edit', Object.assign({ customer_id: customerId }, data || {})); },
      remove: function (customerId) { return self.request('Customer.Delete', { customer_id: customerId }); }
    };
    [
      ['Mission', 'missions'],
      ['Ticket', 'tickets'],
      ['Documents', 'documents'],
      ['Recordings', 'recordings'],
      ['Rooms', 'rooms'],
      ['Products', 'products'],
      ['Projects', 'projects'],
      ['Forms', 'forms'],
      ['Entries', 'entries'],
      ['Expenses', 'expenses']
    ].forEach(function (pair) {
      var category = pair[0];
      var group = pair[1];
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

  Biz1Client.prototype.getToken = function () {
    return this.storage.getItem(TOKEN_KEY) || '';
  };

  Biz1Client.prototype.setToken = function (token) {
    if (token) this.storage.setItem(TOKEN_KEY, token);
    else this.storage.removeItem(TOKEN_KEY);
  };

  Biz1Client.prototype.login = async function (credentials) {
    credentials = credentials || {};
    // Always send OTP, including an empty value for the initial login/resend request.
    var body = {
      password: credentials.password || '',
      otp: String(credentials.otp || '').trim()
    };
    var email = credentials.email || '';
    var username = credentials.username || credentials.user || '';
    var id = credentials.id;
    var phone = credentials.phone || '';

    if (email) {
      body.email = email;
    } else if (id !== undefined && id !== null && String(id).trim() !== '') {
      body.id = id;
    } else if (phone) {
      body.phone = phone;
    } else if (username) {
      body.username = username;
    }

    var data = await this.request('Login', body, { public: true });
    var otpRequired = data && (
      data.otp_required === true || data.otp_required === 1 ||
      data.otp_required === 'true' || data.otp_required === '1' ||
      data.otpRequired === true || data.otpRequired === 1 ||
      data.otpRequired === 'true' || data.otpRequired === '1'
    );
    if (data && data.token && !otpRequired) {
      this.setToken(data.token);
    }
    return data;
  };

  Biz1Client.prototype.logout = function () {
    this.setToken('');
    this.realtime.disconnect();
  };

  Biz1Client.prototype.request = async function (route, data, options) {
    options = options || {};
    if (!route) throw new Error('route is required');
    var headers = Object.assign({}, options.headers || {});
    if (!options.public) {
      var token = options.token || this.getToken();
      if (!token) throw new Biz1ApiError('Bearer token is missing. Login first.', { route: route, status: 401 });
      headers.Authorization = 'Bearer ' + token;
    }

    var res = await this.fetch(this.domain + this.appPath + '/' + route, {
      method: 'POST',
      headers: headers,
      body: toBody(data)
    });
    var text = await res.text();
    var json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch (e) {
      throw new Biz1ApiError('Biz1 route did not return JSON.', { route: route, status: res.status, response: text });
    }

    var failed = !res.ok || json.success === 0 || json.success === '0' || json.ok === false;
    if (failed && options.throwOnError !== false) {
      if (res.status === 401) this.setToken('');
      throw new Biz1ApiError(json.message || json.error || 'Biz1 API request failed', {
        route: route,
        status: res.status,
        raw: json
      });
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

  return {
    Biz1Client: Biz1Client,
    Biz1RealtimeClient: Biz1RealtimeClient,
    Biz1ApiError: Biz1ApiError,
    toUtcDateTime: formatUtcDateTime,
    createClient: function (options) { return new Biz1Client(options); }
  };
});


/* ===== biz1-app.js ===== */
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

  function getBrandName(lang) {
    var cfg = global.Biz1Config || {};
    var brand = cfg.brand || {};
    lang = lang || 'en';
    return brand[lang] || brand.en || brand.he || 'Biz1 Showcase';
  }

  var DOMAIN = resolveDomain();
  var USER_KEY = 'biz1fs_user_basic';
  var ROLE_KEY = 'biz1fs_role';
  var EMAIL_KEY = 'biz1fs_email';
  var REMEMBER_KEY = 'biz1fs_remember';
  var CRED_KEY = 'biz1fs_cred';
  var SESSION_PASS_KEY = 'biz1fs_session_pass';
  var EXPIRES_KEY = 'biz1fs_token_expires_at';
  /** Biz1 folders (from User.Basic) */
  var FOLDERS = {
    LEADS: 1,       // פניות חדשות / New Leads
    CUSTOMERS: 2,   // לקוחות
    MISSIONS: 3,    // משימות
    ARCHIVE: 4,
    TRASH: 5,
    SPAM: 6
  };

  var ROLE_HOME = {
    sales: 'index.html#schedule',
    service: 'index.html#schedule',
    tech: 'index.html#schedule'
  };

  /**
   * Intended screen → route map (what the UI should call).
   * Status from live probes:
   *   ok | empty | broken | unknown
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
    if (!global.__biz1FsClient) {
      global.__biz1FsClient = new global.Biz1SDK.Biz1Client({
        domain: DOMAIN,
        storage: global.localStorage
      });
      installAuthInterceptor(global.__biz1FsClient);
    }
    return global.__biz1FsClient;
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
    var target = loginPage || 'index.html#login';
    var here = ((global.location && global.location.pathname) || '') +
      ((global.location && global.location.hash) || '');
    if (here.indexOf('login') !== -1 || here.indexOf('login.php') !== -1 ||
        here.indexOf('%D7%94%D7%AA%D7%97%D7%91%D7%A8%D7%95%D7%AA') !== -1) {
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

  function parseJwtPayload(token) {
    if (!token || typeof token !== 'string') return null;
    try {
      var part = token.split('.')[1];
      if (!part) return null;
      var b64 = part.replace(/-/g, '+').replace(/_/g, '/');
      var pad = b64.length % 4;
      if (pad) b64 += '===='.slice(pad);
      return JSON.parse(decodeURIComponent(escape(atob(b64))));
    } catch (e) {
      try {
        var part2 = token.split('.')[1];
        return JSON.parse(atob(part2.replace(/-/g, '+').replace(/_/g, '/')));
      } catch (e2) {
        return null;
      }
    }
  }

  function truthyFlag(v) {
    return v === 1 || v === '1' || v === true || v === 'true';
  }

  function isOtpRequiredResponse(data, otp) {
    if (!data || typeof data !== 'object') return false;
    if ((otp || '').trim()) return false;
    if (truthyFlag(data.otp_required) || truthyFlag(data.otpRequired)) return true;
    return false;
  }

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
    if (sec > 0 && base.indexOf(String(sec)) === -1) {
      return base + ' (' + sec + 's)';
    }
    return base;
  }

  function isInvalidOtpAttempt(data, otpVal) {
    if (!(otpVal || '').trim() || !data) return false;
    if (isOtpRequiredResponse(data, '')) return true;
    if (!data.token) return true;
    if (data.success === 0 || data.success === '0') return true;
    return false;
  }

  /**
   * Detect which Login API identifier field to send:
   * email | phone | id | username
   */
  function detectLoginIdentifier(raw) {
    var v = String(raw == null ? '' : raw).trim();
    if (!v) return { username: '' };

    if (v.indexOf('@') !== -1) {
      return { email: v };
    }

    var compact = v.replace(/[\s\-().]/g, '');
    if (/^\+/.test(compact) || /^0\d{8,14}$/.test(compact)) {
      return { phone: v };
    }
    var digits = compact.replace(/\D/g, '');
    if (/^[\d\s\-()+]+$/.test(v) && !/^\d+$/.test(v) && digits.length >= 9) {
      return { phone: v };
    }

    if (/^\d+$/.test(v)) {
      return { id: v };
    }

    return { username: v };
  }

  async function login({ username, password, otp, remember }) {
    var client = getClient();
    var otpVal = String(otp || '').trim();
    var loginId = String(username || '').trim();
    var identified = detectLoginIdentifier(loginId);
    var loginPayload = Object.assign({
      password: password,
      otp: otpVal
    }, identified);
    var data;

    try {
      data = await client.login(loginPayload);
    } catch (err) {
      if ((err && Number(err.status) === 429) || isLoginRateLimited(err && err.raw)) {
        throw err;
      }
      if (err && err.raw &&
          (truthyFlag(err.raw.otp_required) || truthyFlag(err.raw.otpRequired))) {
        return {
          ok: false,
          otpRequired: true,
          message: err.raw.message || 'OTP is required',
          raw: err.raw
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
      return {
        ok: false,
        otpRequired: true,
        message: data.message || 'OTP is required',
        raw: data
      };
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
      var loginErr = new Error((data && data.message) || 'ההתחברות נכשלה');
      loginErr.status = Number((data && data.status) || 0);
      loginErr.raw = data || {};
      throw loginErr;
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

  /** Resend OTP through the same Login route used by the chat project. */
  async function resendOtp({ username, password }) {
    return login({
      username: username,
      password: password,
      otp: '',
      remember: global.localStorage.getItem(REMEMBER_KEY) === '1'
    });
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
    var ticket = raw.output || raw.data || raw;
    if (ticket && !Array.isArray(ticket) && typeof ticket === 'object' && raw.files && !ticket.files) {
      ticket = Object.assign({}, ticket, { files: raw.files });
    }
    return { ticket: ticket, raw: raw };
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
    var rows = [];
    if (Array.isArray(raw && raw.data)) rows = raw.data;
    else if (Array.isArray(raw && raw.rows)) rows = raw.rows;
    else if (Array.isArray(raw && raw.documents)) rows = raw.documents;
    else if (Array.isArray(raw && raw.files)) rows = raw.files;
    else if (Array.isArray(raw && raw.items)) rows = raw.items;
    else if (Array.isArray(raw && raw.output)) rows = raw.output;

    var html = raw.files_html || raw.html || '';
    if ((!rows || !rows.length) && html && typeof html === 'string') {
      var re = /(?:href|src)=["']([^"']+)["'][^>]*>?\s*([^<]*ticket-[^<]*)/gi;
      var m;
      while ((m = re.exec(html))) {
        rows.push({
          url: m[1],
          file_url: m[1],
          display_name: String(m[2] || '').trim(),
          name: String(m[2] || '').trim()
        });
      }
      if (!rows.length) {
        var nameRe = /(ticket-\d+-(?:before|after|signature)[^"'<\s]*)/gi;
        var urlRe = /(https?:\/\/[^\s"'<>]+)/gi;
        var names = html.match(nameRe) || [];
        var urls = html.match(urlRe) || [];
        names.forEach(function (name, i) {
          rows.push({
            display_name: name,
            name: name,
            file_url: urls[i] || '',
            url: urls[i] || ''
          });
        });
      }
    }
    return { raw: raw, rows: rows, html: html, customer_id: id };
  }

  /** Active products for spare-parts picker. */
  async function listProducts(extra) {
    var client = getClient();
    var raw = await client.request('Products.List', Object.assign({
      active: 1,
      limit: 25,
      length: 25,
      start: 0
    }, extra || {}));
    var rows = [];
    if (Array.isArray(raw && raw.data)) rows = raw.data;
    else if (Array.isArray(raw && raw.rows)) rows = raw.rows;
    else if (Array.isArray(raw && raw.products)) rows = raw.products;
    else if (Array.isArray(raw && raw.output)) rows = raw.output;
    return { raw: raw, rows: rows };
  }

  function dataUrlToFile(dataUrl, fileName) {
    var parts = String(dataUrl || '').split(',');
    if (parts.length < 2) throw new Error('Invalid image data');
    var mimeMatch = parts[0].match(/:(.*?);/);
    var mime = (mimeMatch && mimeMatch[1]) || 'image/png';
    var binary = atob(parts[1]);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    var name = fileName || 'upload.png';
    try {
      return new File([bytes], name, { type: mime });
    } catch (e) {
      return new Blob([bytes], { type: mime });
    }
  }

  /**
   * Upload binary file via Files.Upload (multipart).
   * Required: customer_id, file | Optional: file_name, folder
   * https://{domain}/app/help/Files.Upload
   */
  async function uploadCustomerFile(payload) {
    payload = payload || {};
    var custId = requireId(payload.customer_id, 'customer_id');
    var file = payload.file;
    var dataUrl = payload.dataUrl || payload.data_url || '';
    var fileName = String(payload.file_name || payload.fileName || 'upload.png');
    var folder = payload.folder != null ? String(payload.folder) : 'default';
    if (!file && dataUrl) file = dataUrlToFile(dataUrl, fileName);
    if (!file) throw new Error('file is required');

    var client = getClient();
    var token = client.getToken && client.getToken();
    if (!token) throw new Error('Bearer token is missing. Login first.');

    function buildForm() {
      var form = new FormData();
      form.append('customer_id', String(custId));
      form.append('file_name', fileName);
      form.append('folder', folder);
      form.append('file', file, fileName);
      return form;
    }

    var endpoints = [DOMAIN + '/app/Files.Upload', DOMAIN + '/app/Files/Upload'];
    var lastErr = null;
    for (var e = 0; e < endpoints.length; e++) {
      var res = await fetch(endpoints[e], {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: buildForm()
      });
      var text = await res.text();
      var parsed = null;
      try { parsed = text ? JSON.parse(text) : {}; } catch (errJson) {
        lastErr = new Error('Files.Upload did not return JSON');
        lastErr.response = text;
        continue;
      }
      if (parsed && (Number(parsed.success) === 1 || parsed.success === true || parsed.document_id || parsed.file)) {
        var fileMeta = parsed.file || {};
        return {
          ok: true,
          route: endpoints[e],
          folder: folder,
          file_name: fileName,
          document_id: parsed.document_id || fileMeta.id || null,
          file_url: fileMeta.file_url || fileMeta.url || fileMeta.path || null,
          file_path: fileMeta.file_path || fileMeta.path || null,
          raw: parsed
        };
      }
      lastErr = new Error((parsed && (parsed.message || parsed.error)) || 'Files.Upload failed');
      lastErr.raw = parsed;
      lastErr.status = res.status;
      if (!/missing required file|route not found|not found/i.test(String(lastErr.message || ''))) break;
    }
    throw lastErr || new Error('Files.Upload failed');
  }

  /**
   * Create or edit a ticket together with photos/signature in one multipart
   * request. Every binary is sent through image_upload; the filename identifies
   * before/after/signature media in the persisted ticket media manifest.
   */
  async function saveTicketWithMedia(route, payload, media) {
    if (route !== 'Ticket.Add' && route !== 'Ticket.Edit') {
      throw new Error('Ticket.Add or Ticket.Edit route is required');
    }
    var form = new FormData();
    Object.keys(payload || {}).forEach(function (key) {
      var value = payload[key];
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        value.forEach(function (item) { form.append(key, String(item)); });
        return;
      }
      if (typeof value === 'object') {
        form.append(key, JSON.stringify(value));
        return;
      }
      form.append(key, String(value));
    });
    (media || []).forEach(function (item) {
      if (!item) return;
      var fileName = String(item.file_name || item.fileName || 'ticket-image.png');
      var file = item.file;
      if (!file && item.dataUrl) file = dataUrlToFile(item.dataUrl, fileName);
      if (file) form.append('image_upload', file, fileName);
    });
    return getClient().request(route, form);
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
   * Optional `from`: send_notes (default), send_whatsapp, send_email_quick, …
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
    if (p.from) payload.from = String(p.from);
    var phone = p.chart_selected_phone_no || p.phone || p.mobile || '';
    if (phone) {
      phone = String(phone).replace(/\D/g, '');
      if (phone) {
        payload.chart_selected_phone_no = phone;
        payload.phone = phone;
        payload.mobile = phone;
      }
    }
    if (p.email) payload.email = p.email;
    if (p.message_id) payload.message_id = p.message_id;
    if (p.template_id != null && p.template_id !== '') payload.template_id = p.template_id;
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
      realtimeState.ready = null;
      realtimeState.registered = [];
      if (realtimeState.status !== 'error') {
        setRealtimeStatus('offline');
      } else {
        setRealtimeStatus('error');
      }
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

  global.MineralBarApp = {
    DOMAIN: DOMAIN,
    FOLDERS: FOLDERS,
    ROLE_HOME: ROLE_HOME,
    SCREEN_API: SCREEN_API,
    getDomain: function () { return DOMAIN; },
    getTenantUser: getTenantUser,
    getBrandName: getBrandName,
    getClient: getClient,
    login: login,
    resendOtp: resendOtp,
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
    countMissions: countMissions,
    createMission: createMission,
    getMission: getMission,
    updateMission: updateMission,
    doneMission: doneMission,
    getCustomer: getCustomer,
    getTicket: getTicket,
    listDocuments: listDocuments,
    listProducts: listProducts,
    dataUrlToFile: dataUrlToFile,
    uploadCustomerFile: uploadCustomerFile,
    saveTicketWithMedia: saveTicketWithMedia,
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
})(typeof window !== 'undefined' ? window : globalThis);


/* ===== i18n.js ===== */
/**
 * Biz1 Showcase — i18n
 * Default language: English. Hebrew only when user selects it.
 */
(function (global) {
  'use strict';

  var LANG_KEY = 'biz1fs_lang';
  var DEFAULT_LANG = 'en';

  function brandName(lang) {
    try {
      if (global.MineralBarApp && MineralBarApp.getBrandName) {
        return MineralBarApp.getBrandName(lang || DEFAULT_LANG);
      }
    } catch (e) { /* ignore */ }
    var cfg = global.Biz1Config && Biz1Config.brand;
    if (cfg && (cfg[lang] || cfg.en)) return cfg[lang] || cfg.en;
    return 'Biz1 Showcase';
  }

  var STRINGS = {
    en: {
      brand: 'Biz1 Showcase',
      login_subtitle: 'Field Service · Technician sign-in',
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
      refreshing: 'Refreshing session…',
      team_users: 'Demo users',
      role_tech: 'Technician',
      role_service: 'Service',
      role_sales: 'Sales',
      demo_credentials: 'Demo Credentials',
      login_as_demo_user: 'Login As Domo User',
      footer_crm: 'Biz1 Showcase · Field Service',
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
      resend_otp_sent: 'A new verification code was requested.',
      err_resend_otp: 'Could not resend the verification code. Please try again.',
      err_rate_limit: 'Too many login attempts. Wait {s} seconds and try again.',
      err_rate_limit_generic: 'Too many login attempts. Please wait and try again.',
      try_again_in: 'Try again in',
      lang_label: 'Language',
      lang_en: 'English',
      lang_he: 'עברית',
      loading: 'Loading…',
      current_location: 'Current location',
      logout: 'Log out',
      profile: 'Profile',
      profile_role: 'Role',
      role_sales: 'Sales',
      role_service: 'Service',
      role_tech: 'Technician',
      toggle_theme: 'Light / Dark mode',
      page_login_title: 'Biz1 Showcase — Sign in',
      live_socket_on: 'Live Socket',
      live_socket_off: 'Socket Off',
      my_schedule: 'My Schedules',
      schedule_sub: 'Daily route & assigned tickets',
      visits: 'Visits',
      completed: 'Done',
      waiting: 'Open',
      filter_all: 'All',
      filter_open: 'Open',
      filter_assigned: 'Assigned',
      filter_closed: 'Closed',
      filter_daily: 'Daily',
      filter_weekly: 'Weekly',
      filter_period_all: 'All',
      start_route: 'Start Route',
      search_tickets: 'Search tickets by client, address, or #',
      navigate: 'Navigate',
      status_opened: 'Opened',
      status_assigned: 'Assigned',
      status_closed: 'Closed',
      open_ticket: 'Open ticket',
      close_ticket: 'Complete',
      ticket_title: 'Service Ticket',
      client: 'Client',
      subject: 'Subject',
      address: 'Address',
      status: 'Status',
      checklist: 'Checklist',
      upload_photo: 'Upload Photo',
      photo_save_failed: 'Photo could not be saved — not enough space on this device',
      photo_upload_failed: 'Photo upload failed',
      sign_upload_failed: 'Signature upload failed',
      attach_spare: 'Attach Spare Part',
      history: 'Service history',
      wa_on_way_btn: "I'm on my way",
      wa_on_the_way: "Hi {name}, I'm on my way to your service visit (ticket #{ticket}).",
      wa_on_way_sending: 'Sending WhatsApp…',
      wa_on_way_sent: 'WhatsApp sent to customer',
      wa_on_way_failed: 'WhatsApp send failed',
      wa_missing_customer: 'Customer is missing — cannot send WhatsApp',
      wa_signed_pdf: 'Your signed service report for ticket #{ticket} is ready. Thank you!',
      go_complete: 'Complete & Sign-Off',
      spare_parts: 'Spare parts',
      spare_placeholder: 'Part name (e.g. Carbon Filter CF-2)',
      select_product: 'Select product…',
      add_part: 'Add',
      remove_part: 'Remove',
      work_summary: 'Work summary',
      work_summary_ph: 'Describe work performed…',
      subject_ph: 'Enter subject…',
      before_photo: 'Before photo',
      after_photo: 'After photo',
      digital_signature: 'Digital Signature',
      clear_sig: 'Clear',
      complete_send: 'Complete Ticket & Sign Off',
      success_title: 'Ticket completed',
      success_body: 'Work signed off and saved to the ticket.',
      success_body_pending: 'Ticket completed. Saved locally; server confirmation is pending.',
      completed_work: 'Completed work',
      back_schedule: 'Back to schedule',
      open_whatsapp: 'Open WhatsApp',
      checklist_save_failed: 'Checklist could not be saved',
      complete_title: 'Complete & Sign-Off',
      nav_schedule: 'Schedule',
      nav_open: 'Open',
      nav_home: 'Home',
      list_map: 'List',
      no_ticket: 'Data not found',
      data_not_found: 'Data not found',
      no_tickets: 'Data not found',
      no_history: 'Data not found',
      no_checklist: 'Data not found',
      no_spares: 'Data not found',
      no_address: 'Data not found',
      no_phone: 'Data not found',
      no_products: 'No products found',
      tap_sign: 'Sign here',
      photos: 'Photos',
      required: '*'
    },
    he: {
      brand: 'תצוגת Biz1',
      login_subtitle: 'שירות שטח · התחברות טכנאי',
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
      refreshing: 'מחדש התחברות…',
      team_users: 'משתמשי דמו',
      role_tech: 'טכנאי',
      role_service: 'שירות',
      role_sales: 'מכירות',
      demo_credentials: 'פרטי הדגמה',
      login_as_demo_user: 'התחבר כמשתמש הדגמה',
      footer_crm: 'תצוגת Biz1 · שירות שטח',
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
      resend_otp_sent: 'התבקש קוד אימות חדש.',
      err_resend_otp: 'לא ניתן לשלוח את קוד האימות מחדש. נסו שוב.',
      err_rate_limit: 'יותר מדי ניסיונות התחברות. המתינו {s} שניות ונסו שוב.',
      err_rate_limit_generic: 'יותר מדי ניסיונות התחברות. המתינו ונסו שוב.',
      try_again_in: 'נסו שוב בעוד',
      lang_label: 'שפה',
      lang_en: 'English',
      lang_he: 'עברית',
      loading: 'טוען…',
      current_location: 'מיקום נוכחי',
      logout: 'התנתק',
      profile: 'פרופיל',
      profile_role: 'תפקיד',
      role_sales: 'מכירות',
      role_service: 'שירות',
      role_tech: 'טכנאי',
      toggle_theme: 'מצב בהיר / כהה',
      page_login_title: 'Biz1 Showcase — התחברות',
      live_socket_on: 'שידור חי',
      live_socket_off: 'מנותק',
      my_schedule: 'הלוז שלי',
      schedule_sub: 'מסלול יומי וקריאות משובצות',
      visits: 'ביקורים',
      completed: 'הושלמו',
      waiting: 'פתוחות',
      filter_all: 'הכל',
      filter_open: 'פתוחות',
      filter_assigned: 'משובצות',
      filter_closed: 'סגורות',
      filter_daily: 'יומי',
      filter_weekly: 'שבועי',
      filter_period_all: 'הכל',
      start_route: 'התחל מסלול',
      search_tickets: 'חיפוש קריאות לפי לקוח, כתובת או #',
      navigate: 'נווט',
      status_opened: 'פתוח',
      status_assigned: 'משובץ',
      status_closed: 'סגור',
      open_ticket: 'פתח קריאה',
      close_ticket: 'סגור',
      ticket_title: 'קריאת שירות',
      client: 'לקוח',
      subject: 'נושא',
      address: 'כתובת',
      status: 'סטטוס',
      checklist: 'רשימת משימות',
      upload_photo: 'העלה תמונה',
      photo_save_failed: 'לא ניתן לשמור את התמונה — אין מספיק מקום במכשיר',
      photo_upload_failed: 'העלאת התמונה נכשלה',
      sign_upload_failed: 'העלאת החתימה נכשלה',
      attach_spare: 'צרף חלק חילוף',
      history: 'היסטוריית שירות',
      wa_on_way_btn: 'אני בדרך',
      wa_on_the_way: 'שלום {name}, אני בדרך לביקור השירות (קריאה #{ticket}).',
      wa_on_way_sending: 'שולח וואטסאפ…',
      wa_on_way_sent: 'הודעת וואטסאפ נשלחה ללקוח',
      wa_on_way_failed: 'שליחת וואטסאפ נכשלה',
      wa_missing_customer: 'חסר לקוח — לא ניתן לשלוח וואטסאפ',
      wa_signed_pdf: 'דוח השירות החתום לקריאה #{ticket} מוכן. תודה!',
      go_complete: 'סיום וחתימה',
      spare_parts: 'חלקים שנוצלו',
      spare_placeholder: 'שם חלק (למשל מסנן פחם)',
      select_product: 'בחר מוצר…',
      add_part: 'הוסף',
      remove_part: 'הסר',
      work_summary: 'סיכום העבודה',
      work_summary_ph: 'פרט מה בוצע…',
      subject_ph: 'הזן נושא…',
      before_photo: 'תמונה לפני',
      after_photo: 'תמונה אחרי',
      digital_signature: 'חתימה דיגיטלית',
      clear_sig: 'נקה',
      complete_send: 'סגור קריאה וחתום',
      success_title: 'הקריאה הושלמה',
      success_body: 'העבודה נחתמה ונשמרה בקריאה.',
      success_body_pending: 'הקריאה נסגרה. נשמר מקומית; אין אישור מלא מהשרת.',
      completed_work: 'עבודה שהושלמה',
      back_schedule: 'חזרה ללוז',
      open_whatsapp: 'פתח וואטסאפ',
      checklist_save_failed: 'לא ניתן לשמור את רשימת המשימות',
      complete_title: 'סיום וחתימה',
      nav_schedule: 'לוז',
      nav_open: 'פתוחות',
      nav_home: 'ראשי',
      list_map: 'רשימה',
      no_ticket: 'לא נמצאו נתונים',
      data_not_found: 'לא נמצאו נתונים',
      no_tickets: 'לא נמצאו נתונים',
      no_history: 'לא נמצאו נתונים',
      no_checklist: 'לא נמצאו נתונים',
      no_spares: 'לא נמצאו נתונים',
      no_address: 'לא נמצאו נתונים',
      no_phone: 'לא נמצאו נתונים',
      no_products: 'לא נמצאו מוצרים',
      tap_sign: 'חתום כאן',
      photos: 'תמונות',
      required: '*'
    }
  };

  function getLang() {
    try {
      var saved = global.localStorage.getItem(LANG_KEY) || global.localStorage.getItem('mineralbar_lang');
      if (saved === 'he' || saved === 'en') return saved;
    } catch (e) { /* ignore */ }
    return DEFAULT_LANG;
  }

  function setLang(lang) {
    if (lang !== 'he' && lang !== 'en') lang = DEFAULT_LANG;
    try {
      global.localStorage.setItem(LANG_KEY, lang);
    } catch (e) { /* ignore */ }
    apply(lang);
    global.dispatchEvent(new CustomEvent('mineralbar:lang', { detail: { lang: lang } }));
    return lang;
  }

  function t(key, lang) {
    lang = lang || getLang();
    if (key === 'brand') return brandName(lang);
    if (key === 'footer_crm') return brandName(lang) + (lang === 'he' ? ' · שירות שטח' : ' · Field Service');
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

    document.querySelectorAll('.ds-input[data-align-lang]').forEach(function (el) {
      if (el.getAttribute('data-align-lang') === 'ltr') {
        el.style.textAlign = 'left';
        el.style.direction = 'ltr';
      } else {
        el.style.textAlign = lang === 'he' ? 'right' : 'left';
        el.style.direction = dir;
      }
    });

    var eyeBtn = document.getElementById('togglePassword');
    var passEl = document.getElementById('password');
    if (eyeBtn && passEl) {
      if (lang === 'he') {
        eyeBtn.style.left = '8px';
        eyeBtn.style.right = 'auto';
        passEl.style.padding = '13px 13px 13px 46px';
      } else {
        eyeBtn.style.right = '8px';
        eyeBtn.style.left = 'auto';
        passEl.style.padding = '13px 46px 13px 13px';
      }
    }

    document.querySelectorAll('.fillUser').forEach(function (btn) {
      btn.style.textAlign = lang === 'he' ? 'right' : 'left';
      var role = btn.getAttribute('data-role-key');
      var email = btn.getAttribute('data-user') || '';
      if (role) btn.textContent = email + ' · ' + t(role, lang);
    });

    var demoBox = document.getElementById('demo-users');
    if (demoBox) demoBox.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');

    document.querySelectorAll('[data-set-lang]').forEach(function (btn) {
      var active = btn.getAttribute('data-set-lang') === lang;
      btn.style.background = active ? 'rgba(255,255,255,.22)' : 'transparent';
      btn.style.fontWeight = active ? '800' : '600';
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    var titleKey = html.getAttribute('data-i18n-title');
    if (titleKey) document.title = t(titleKey, lang) + ' | ' + brandName(lang);
  }

  function bindSwitcher() {
    document.querySelectorAll('[data-set-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setLang(btn.getAttribute('data-set-lang'));
      });
    });
  }

  var THEME_KEY = 'biz1fs_theme';

  function resolveInitialTheme() {
    try {
      var saved = global.localStorage.getItem(THEME_KEY) ||
        global.localStorage.getItem('biz1demo_theme') ||
        global.localStorage.getItem('mineralbar_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) { /* ignore */ }
    if (global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  }

  function getTheme() {
    var cur = document.documentElement.getAttribute('data-theme');
    return cur === 'dark' ? 'dark' : 'light';
  }

  function setTheme(theme) {
    if (theme !== 'dark' && theme !== 'light') theme = 'light';
    document.documentElement.setAttribute('data-theme', theme);
    try { global.localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
    global.dispatchEvent(new CustomEvent('biz1fs:theme', { detail: { theme: theme } }));
  }

  function toggleTheme() {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  }

  function bindThemeToggle() {
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      if (btn.__themeBound) return;
      btn.__themeBound = true;
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        toggleTheme();
      });
    });
  }

  function init() {
    setTheme(resolveInitialTheme());
    apply(getLang());
    bindSwitcher();
    bindThemeToggle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.MineralBarI18n = {
    t: t,
    getLang: getLang,
    setLang: setLang,
    apply: apply,
    getTheme: getTheme,
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    DEFAULT_LANG: DEFAULT_LANG,
    STRINGS: STRINGS
  };
})(window);


/* ===== field-app.js ===== */
/**
 * Field Service — live tickets only (Biz1 Ticket.List / Ticket.Get)
 * No static/demo seed data. Empty API → empty list / Data not found.
 */
(function (global) {
  'use strict';

  var CACHE_KEY = 'mineralbar_field_live_cache';
  var CACHE_VERSION = '7';
  var CACHE_VERSION_KEY = 'mineralbar_field_cache_v';
  var OVERLAY_KEY = 'mineralbar_field_overlays';
  var STATUS = {
    opened: 'opened',
    assigned: 'assigned',
    closed: 'closed'
  };
  var STATUS_OPTIONS = [STATUS.opened, STATUS.assigned, STATUS.closed];

  var memoryTickets = [];
  var lastError = null;
  var lastPersistError = null;
  var loading = false;

  /* Clear legacy demo store once */
  try {
    global.localStorage.removeItem('mineralbar_field_tickets');
  } catch (e) { /* ignore */ }

  function loadOverlays() {
    try {
      return JSON.parse(global.localStorage.getItem(OVERLAY_KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function saveOverlays(map) {
    try {
      global.localStorage.setItem(OVERLAY_KEY, JSON.stringify(map || {}));
      return true;
    } catch (e) {
      lastPersistError = e;
      return false;
    }
  }

  function persistCache(tickets) {
    memoryTickets = Array.isArray(tickets) ? tickets : [];
    try {
      global.localStorage.setItem(CACHE_KEY, JSON.stringify(memoryTickets));
      return true;
    } catch (e) {
      lastPersistError = e;
      return false;
    }
  }

  function saveCache(tickets) {
    var ok = persistCache(tickets);
    global.dispatchEvent(new CustomEvent('fieldapp:tickets', {
      detail: { mode: 'full', tickets: memoryTickets, error: lastError }
    }));
    return ok;
  }

  function findTicketIndex(list, id) {
    id = String(id || '');
    if (!id) return -1;
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === id || String(list[i].number) === id) return i;
    }
    return -1;
  }

  /** Add or replace one ticket without wiping the list. */
  function upsertLiveTicket(ticket, options) {
    options = options || {};
    if (!ticket || !ticket.id) return null;
    if (ticket.dateAt == null || !isFinite(Number(ticket.dateAt))) {
      ticket.dateAt = Date.now();
    }
    var list = loadCache();
    var idx = findTicketIndex(list, ticket.id);
    var isNew = idx < 0;
    if (isNew) list.unshift(ticket);
    else list[idx] = Object.assign({}, list[idx], ticket, { id: ticket.id, number: ticket.number || list[idx].number });
    persistCache(list);
    if (!options.silent) {
      global.dispatchEvent(new CustomEvent('fieldapp:tickets', {
        detail: {
          mode: 'upsert',
          ticket: list[isNew ? 0 : idx],
          isNew: isNew,
          tickets: memoryTickets,
          error: lastError
        }
      }));
    }
    return list[isNew ? 0 : findTicketIndex(list, ticket.id)];
  }

  function removeLiveTicket(id, options) {
    options = options || {};
    id = String(id || '');
    if (!id) return false;
    var list = loadCache();
    var idx = findTicketIndex(list, id);
    if (idx < 0) return false;
    var removed = list.splice(idx, 1)[0];
    persistCache(list);
    if (!options.silent) {
      global.dispatchEvent(new CustomEvent('fieldapp:tickets', {
        detail: {
          mode: 'remove',
          id: removed.id,
          number: removed.number,
          tickets: memoryTickets,
          error: lastError
        }
      }));
    }
    return true;
  }

  function ticketSnapshotKey(ticket) {
    if (!ticket) return '';
    return [
      ticket.id,
      ticket.number,
      ticket.status,
      ticket.statusApi,
      ticket.client,
      ticket.subject,
      ticket.address,
      ticket.time,
      ticket.contact,
      ticket.phone
    ].join('|');
  }

  /**
   * Merge a fresh Ticket.List page into cache without full UI wipe.
   * Adds new rows, updates changed rows; does not delete missing rows (list is paginated).
   */
  function mergeTicketsFromList(incoming, options) {
    options = options || {};
    incoming = Array.isArray(incoming) ? incoming : [];
    var list = loadCache();
    var changed = [];
    incoming.forEach(function (ticket) {
      if (!ticket || !ticket.id) return;
      var idx = findTicketIndex(list, ticket.id);
      if (idx < 0) {
        if (ticket.dateAt == null || !isFinite(Number(ticket.dateAt))) ticket.dateAt = Date.now();
        list.unshift(ticket);
        changed.push({ ticket: ticket, isNew: true });
        return;
      }
      if (ticketSnapshotKey(list[idx]) !== ticketSnapshotKey(ticket)) {
        list[idx] = Object.assign({}, list[idx], ticket, {
          id: ticket.id,
          number: ticket.number || list[idx].number
        });
        changed.push({ ticket: list[idx], isNew: false });
      }
    });
    if (!changed.length) return [];
    persistCache(list);
    if (!options.silent) {
      changed.forEach(function (item) {
        global.dispatchEvent(new CustomEvent('fieldapp:tickets', {
          detail: {
            mode: 'upsert',
            ticket: item.ticket,
            isNew: item.isNew,
            tickets: memoryTickets,
            error: lastError
          }
        }));
      });
    }
    return changed;
  }

  function extractTicketIdFromRealtime(event) {
    var detail = event && event.detail ? event.detail : event;
    var payload = detail && detail.event ? detail.event : detail;
    if (!payload || typeof payload !== 'object') return '';

    function idFrom(node, allowBareId) {
      if (!node || typeof node !== 'object') return '';
      var keys = allowBareId
        ? ['ticket_id', 'ticketId', 'ticketID', 'entity_id', 'record_id', 'id']
        : ['ticket_id', 'ticketId', 'ticketID', 'entity_id', 'record_id'];
      var direct = pick(node, keys, '');
      if (direct == null || direct === '' || typeof direct === 'object') return '';
      var asStr = String(direct).trim();
      return /^\d+$/.test(asStr) ? asStr : '';
    }

    // Nested bags first — root `id` on biz1:event is the realtime event id, NOT ticket_id
    var nested = [
      payload.data,
      payload.payload,
      payload.ticket,
      payload.output,
      payload.row,
      payload.record,
      payload.body
    ];
    var i;
    for (i = 0; i < nested.length; i++) {
      var found = idFrom(nested[i], true);
      if (found) return found;
      if (nested[i] && typeof nested[i] === 'object' && nested[i].ticket) {
        found = idFrom(nested[i].ticket, true);
        if (found) return found;
      }
    }
    // Root may expose ticket_id directly (rare)
    return idFrom(payload, false);
  }

  function isTicketDeleteEvent(event) {
    var key = String((event && event.detail && event.detail.key) || (event && event.key) || '').toLowerCase();
    return /ticket.*(delete|remove|trash)|delete.*ticket|remove.*ticket/.test(key);
  }

  function isTicketRealtimeKey(key) {
    key = String(key || '').toLowerCase();
    return /(^|\.)ticket\./.test(key) || /^ticket\./.test(key) || key.indexOf('ticket.') !== -1;
  }

  function loadCache() {
    clearCacheIfUserChanged();
    if (memoryTickets.length) return memoryTickets.slice();
    try {
      var raw = global.localStorage.getItem(CACHE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        memoryTickets = parsed;
        return memoryTickets.slice();
      }
    } catch (e) { /* ignore */ }
    return [];
  }

  function pick(obj, keys, fallback) {
    if (!obj) return fallback;
    for (var i = 0; i < keys.length; i++) {
      var v = obj[keys[i]];
      if (v != null && v !== '') return v;
    }
    return fallback;
  }

  var CLIENT_NAME_KEYS = [
    'customer_name', 'cust_name', 'client', 'name', 'company', 'customer',
    'full_name', 'contact_name', 'title'
  ];
  var CLIENT_EMAIL_KEYS = [
    'cust_email', 'email', 'client_email', 'customer_email', 'mail'
  ];

  function ticketCustomerId(r) {
    if (!r || typeof r !== 'object') return 0;
    var customer = r.customer || r.client_obj || {};
    if (customer && typeof customer === 'object') {
      var nestedId = pick(customer, ['id', 'customer_id', 'cust_id', 'client_id'], '');
      if (nestedId) return nestedId;
    }
    return pick(r, ['customer_id', 'cust_id', 'client_id', 'contactus_id'], 0) || 0;
  }

  function resolveClientFields(r) {
    if (!r || typeof r !== 'object') return { name: '', email: '' };
    var customer = r.customer || r.client_obj || {};
    var name = String(
      pick(r, CLIENT_NAME_KEYS, '') ||
      (typeof r.customer === 'string' ? r.customer : '') ||
      pick(customer, CLIENT_NAME_KEYS, '') ||
      ''
    ).trim();
    var email = String(
      pick(r, CLIENT_EMAIL_KEYS, '') ||
      pick(customer, CLIENT_EMAIL_KEYS, '') ||
      ''
    ).trim();
    return { name: name, email: email };
  }

  function clientDisplay(ticket) {
    if (!ticket) return t('data_not_found');
    var fields = resolveClientFields(ticket.raw || {});
    var name = String(ticket.client || fields.name || '').trim();
    var email = String(ticket.email || fields.email || '').trim();
    if (name && email && name.toLowerCase() === email.toLowerCase()) return name;
    return name || email || t('data_not_found');
  }

  var customerLabelCache = {};

  async function fetchCustomerLabel(customerId) {
    var id = String(customerId || '');
    if (!id || id === '0') return '';
    if (customerLabelCache[id] !== undefined) return customerLabelCache[id];
    customerLabelCache[id] = '';
    try {
      if (!global.MineralBarApp || !MineralBarApp.getCustomer) return '';
      var res = await MineralBarApp.getCustomer(id);
      var c = res.customer || res.raw || {};
      if (c && typeof c === 'object' && c.output && typeof c.output === 'object') c = c.output;
      var fields = resolveClientFields(c);
      customerLabelCache[id] = fields.name || fields.email || '';
    } catch (e) {
      console.warn('[FieldApp] Customer.Get failed for', id, e);
    }
    return customerLabelCache[id];
  }

  async function enrichTicketClients(tickets) {
    if (!Array.isArray(tickets) || !tickets.length) return tickets;
    var pendingIds = {};
    tickets.forEach(function (ticket) {
      if (clientDisplay(ticket) !== t('data_not_found')) return;
      var cid = ticket.customerId || ticketCustomerId(ticket.raw);
      if (cid) pendingIds[String(cid)] = true;
    });
    var ids = Object.keys(pendingIds);
    if (!ids.length) return tickets;
    await Promise.all(ids.map(function (id) { return fetchCustomerLabel(id); }));
    tickets.forEach(function (ticket) {
      if (clientDisplay(ticket) !== t('data_not_found')) return;
      var cid = String(ticket.customerId || ticketCustomerId(ticket.raw) || '');
      var label = customerLabelCache[cid] || '';
      if (label) ticket.client = label;
    });
    return tickets;
  }

  function normalizeStatus(s) {
    var num = Number(s);
    if (!Number.isNaN(num)) {
      // Biz1 ticket.status: 1=Opened, 2=Closed, 3=Assigned
      if (num === 2) return STATUS.closed;
      if (num === 3) return STATUS.assigned;
      if (num === 4 || num === 5) return STATUS.closed;
      return STATUS.opened;
    }
    var v = String(s == null ? '' : s).toLowerCase().trim();
    if (/closed|close|סגור|done|complet|finish/.test(v)) return STATUS.closed;
    if (/assign/.test(v)) return STATUS.assigned;
    if (/open|opened|pending|ממתין|חדש|new|wait|progress|route|active|working/.test(v)) {
      return STATUS.opened;
    }
    return STATUS.opened;
  }

  function migrateStatus(s) {
    var legacy = {
      pending: STATUS.opened,
      en_route: STATUS.assigned,
      in_progress: STATUS.opened,
      completed: STATUS.closed
    };
    if (legacy[s]) return legacy[s];
    return normalizeStatus(s);
  }

  function statusToApi(status) {
    return ({
      opened: '1',
      assigned: '3',
      closed: '2'
    })[status] || '1';
  }

  function statusFromApi(status) {
    return normalizeStatus(status);
  }

  var CHECKLIST_SCHEMA_KEY = 'mineralbar_ticket_checklist_schema';

  /** Known Biz1 ticket checkbox field options (from Contact Us / Add Ticket form). */
  var DEFAULT_CHECKLIST_SCHEMA = {
    'a-1784718098': [
      { value: '1', label: 'vip' },
      { value: '2', label: 'royer' },
      { value: '2', label: 'pool' }
    ]
  };

  function loadChecklistSchema() {
    var schema = {};
    Object.keys(DEFAULT_CHECKLIST_SCHEMA).forEach(function (k) {
      schema[k] = DEFAULT_CHECKLIST_SCHEMA[k].slice();
    });
    try {
      var raw = global.localStorage.getItem(CHECKLIST_SCHEMA_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') {
        Object.keys(parsed).forEach(function (k) {
          if (Array.isArray(parsed[k]) && parsed[k].length) schema[k] = parsed[k];
        });
      }
    } catch (e) { /* ignore */ }
    return schema;
  }

  function saveChecklistSchema(schema) {
    try {
      global.localStorage.setItem(CHECKLIST_SCHEMA_KEY, JSON.stringify(schema || {}));
    } catch (e) { /* ignore */ }
  }

  /** Parse Biz1 ticket form HTML for checkbox custom fields (name="a-…[]"). */
  function ingestChecklistSchemaFromHtml(html) {
    if (!html || typeof html !== 'string') return loadChecklistSchema();
    var schema = loadChecklistSchema();
    var re = /name="(a-\d+)\[\]"\s+value="([^"]*)"[^>]*>([^<]*)</gi;
    var m;
    var found = false;
    while ((m = re.exec(html))) {
      var field = m[1];
      var value = String(m[2] || '').trim();
      var label = String(m[3] || '').trim();
      if (!field || !label) continue;
      if (!schema[field]) schema[field] = [];
      var exists = schema[field].some(function (opt) {
        return String(opt.value) === value && String(opt.label) === label;
      });
      if (!exists) schema[field].push({ value: value, label: label });
      found = true;
    }
    if (found) saveChecklistSchema(schema);
    return schema;
  }

  function mapChecklistFromCustomFields(raw) {
    var cf = raw && raw.custom_fields;
    if (!cf || typeof cf !== 'object' || Array.isArray(cf)) return [];
    var schema = loadChecklistSchema();
    var items = [];
    Object.keys(cf).forEach(function (fieldKey) {
      var selected = cf[fieldKey];
      if (!Array.isArray(selected)) return;
      var selectedSet = {};
      selected.forEach(function (v) { selectedSet[String(v)] = true; });
      var options = schema[fieldKey];
      if (options && options.length) {
        options.forEach(function (opt, idx) {
          var val = String(opt.value);
          items.push({
            id: fieldKey + '-' + val + '-' + idx,
            label: String(opt.label || val),
            done: !!selectedSet[val]
          });
        });
        return;
      }
      // Schema unknown — still show selected values (better than empty)
      selected.forEach(function (v, idx) {
        items.push({
          id: fieldKey + '-' + v + '-' + idx,
          label: 'Item ' + String(v),
          done: true
        });
      });
    });
    return items.filter(function (x) { return x.label; });
  }

  function mapChecklist(raw) {
    var src = raw && (raw.checklist || raw.tasks || raw.check_list || raw.items);
    if (Array.isArray(src) && src.length) {
      return src.map(function (item, idx) {
        if (typeof item === 'string') {
          return { id: 'c' + idx, label: item, done: false };
        }
        return {
          id: String(item.id || item.key || ('c' + idx)),
          label: String(item.label || item.name || item.title || item.text || ''),
          done: !!(item.done || item.completed || item.checked)
        };
      }).filter(function (x) { return x.label; });
    }
    // Biz1 stores Contact Us "CHECKLIST" in custom_fields (e.g. a-1784718098: ["1","2"])
    return mapChecklistFromCustomFields(raw || {});
  }

  function mapHistory(raw) {
    var src = raw.history || raw.service_history || raw.notes_history || raw.log;
    if (!Array.isArray(src) || !src.length) return [];
    return src.map(function (h) {
      return {
        date: String(h.date || h.created_at || h.when || ''),
        note: String(h.note || h.text || h.message || h.description || '')
      };
    }).filter(function (h) { return h.note || h.date; });
  }

  function getCurrentUserId() {
    try {
      var user = global.MineralBarApp && MineralBarApp.getUser && MineralBarApp.getUser();
      if (!user) return null;
      return user.id || user.user_id || user.member_id || null;
    } catch (e) {
      return null;
    }
  }

  function clearCacheIfUserChanged() {
    try {
      var v = global.localStorage.getItem(CACHE_VERSION_KEY);
      if (v !== CACHE_VERSION) {
        memoryTickets = [];
        global.localStorage.removeItem(CACHE_KEY);
        try {
          var overlays = JSON.parse(global.localStorage.getItem(OVERLAY_KEY) || '{}') || {};
          Object.keys(overlays).forEach(function (id) {
            if (overlays[id] && overlays[id].checklist) delete overlays[id].checklist;
          });
          global.localStorage.setItem(OVERLAY_KEY, JSON.stringify(overlays));
        } catch (e2) { /* ignore */ }
        global.localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION);
      }
      var email = (global.MineralBarApp && MineralBarApp.getEmail && MineralBarApp.getEmail()) || '';
      var role = (global.MineralBarApp && MineralBarApp.getRole && MineralBarApp.getRole()) || '';
      var stamp = email + '|' + role;
      var key = 'mineralbar_field_cache_user';
      var prev = global.localStorage.getItem(key);
      if (prev !== stamp) {
        memoryTickets = [];
        global.localStorage.removeItem(CACHE_KEY);
        global.localStorage.setItem(key, stamp);
      }
    } catch (e) { /* ignore */ }
  }

  function isAssignedToCurrentUser(raw, userId, email) {
    if (!raw || typeof raw !== 'object') return false;
    var uid = userId != null ? String(userId) : '';
    var mail = email ? String(email).toLowerCase() : '';
    var idFields = [
      raw.assigned_to, raw.member_id, raw.tech_id, raw.technician_id,
      raw.user_id, raw.assigned_user_id, raw.assignee_id, raw.worker_id
    ];
    for (var i = 0; i < idFields.length; i++) {
      if (idFields[i] != null && idFields[i] !== '' && uid && String(idFields[i]) === uid) {
        return true;
      }
    }
    var nested = raw.technician || raw.assigned_user || raw.member || raw.tech;
    if (nested && uid) {
      var nid = nested.id || nested.user_id || nested.member_id;
      if (nid != null && String(nid) === uid) return true;
    }
    var mailFields = [raw.tech_email, raw.assigned_email, raw.member_email].filter(Boolean);
    for (var j = 0; j < mailFields.length; j++) {
      if (mail && String(mailFields[j]).toLowerCase() === mail) return true;
    }
    return false;
  }

  function rawHasAssignment(raw) {
    if (!raw) return false;
    return !!(
      raw.assigned_to != null || raw.member_id != null || raw.tech_id != null ||
      raw.technician_id != null || raw.assigned_user_id != null ||
      raw.technician || raw.assigned_user || raw.member || raw.tech
    );
  }

  function rawIsClosed(r) {
    if (!r) return false;
    return normalizeStatus(pick(r, ['status', 'state', 'ticket_status', 'status_name'], '')) === STATUS.closed;
  }

  function isOpenTicket(ticket) {
    if (!ticket) return false;
    return migrateStatus(ticket.status) !== STATUS.closed;
  }

  function ticketHasDisplayData(ticket) {
    if (!ticket) return false;
    return !!(
      (ticket.client && ticket.client.trim()) ||
      (ticket.subject && ticket.subject.trim()) ||
      (ticket.email && ticket.email.trim()) ||
      (ticket.contact && ticket.contact.trim()) ||
      (ticket.address && ticket.address.trim()) ||
      (ticket.phone && ticket.phone.trim()) ||
      ticketCustomerId(ticket.raw)
    );
  }

  function isValidRawRow(r) {
    if (!r || typeof r !== 'object') return false;
    var id = pick(r, ['id', 'ticket_id', 'ticketId'], '');
    if (!id) return false;
    var customer = r.customer || r.client_obj || {};
    var clientFields = resolveClientFields(r);
    return !!(
      clientFields.name ||
      clientFields.email ||
      pick(r, ['address', 'full_address', 'mobile', 'phone', 'contact', 'title', 'subject'], '') ||
      pick(customer, ['address', 'city', 'mobile', 'phone'], '') ||
      ticketCustomerId(r)
    );
  }

  function dedupeTickets(tickets) {
    var seen = {};
    return tickets.filter(function (t) {
      var key = String(t.id || t.number || '');
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function filterTicketsForUser(tickets, options) {
    options = options || {};
    var includeClosed = !!options.includeClosed;
    var list = dedupeTickets(tickets).filter(ticketHasDisplayData);
    if (!includeClosed) list = list.filter(isOpenTicket);
    return list;
  }

  function ticketDateAt(r) {
    if (!r || typeof r !== 'object') return null;
    var raw = pick(r, [
      'schedule_date', 'scheduled_date', 'visit_date', 'appointment_date',
      'date', 'datetime', 'created_at', 'created', 'date_created', 'open_date',
      'updated_at', 'updated', 'last_update', 'timestamp'
    ], null);
    if (raw == null || raw === '') return null;
    if (typeof raw === 'number') {
      var ms = raw < 1e12 ? raw * 1000 : raw;
      var dNum = new Date(ms);
      return isNaN(dNum.getTime()) ? null : dNum.getTime();
    }
    var str = String(raw).trim();
    if (!str) return null;
    if (/^\d{10}$/.test(str)) {
      var d10 = new Date(Number(str) * 1000);
      return isNaN(d10.getTime()) ? null : d10.getTime();
    }
    if (/^\d{13}$/.test(str)) {
      var d13 = new Date(Number(str));
      return isNaN(d13.getTime()) ? null : d13.getTime();
    }
    // dd/mm/yyyy or dd-mm-yyyy
    var mdy = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (mdy) {
      var day = Number(mdy[1]);
      var month = Number(mdy[2]) - 1;
      var year = Number(mdy[3]);
      if (year < 100) year += 2000;
      var dLocal = new Date(year, month, day, Number(mdy[4] || 0), Number(mdy[5] || 0));
      return isNaN(dLocal.getTime()) ? null : dLocal.getTime();
    }
    var parsed = new Date(str);
    return isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  function normalizeTicketPhotos(value) {
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch (e) {
        value = value.trim() ? [value.trim()] : [];
      }
    }
    if (!Array.isArray(value)) return [];
    return value.map(function (photo, index) {
      if (typeof photo === 'string') {
        return { name: 'photo-' + (index + 1), dataUrl: photo, kind: 'field' };
      }
      if (!photo || typeof photo !== 'object') return null;
      return Object.assign({}, photo, {
        dataUrl: photo.dataUrl || photo.data_url || photo.url || photo.path || ''
      });
    }).filter(function (photo) {
      return !!(photo && photo.dataUrl);
    });
  }

  function normalizeTicketSignature(ticket) {
    if (!ticket || typeof ticket !== 'object') return null;
    var signature = pick(ticket, [
      'signature',
      'signature_url',
      'signature_path',
      'sign_url',
      'sign_path'
    ], null);
    if (signature && typeof signature === 'object') {
      signature = pick(signature, ['url', 'path', 'src', 'file'], null);
    }
    if (!signature || typeof signature !== 'string') return null;
    signature = signature.trim();
    if (!signature) return null;
    if (/^(data:|blob:|https?:\/\/|\/\/)/i.test(signature)) return signature;
    if (global.MineralBarApp && MineralBarApp.getClient) {
      var client = MineralBarApp.getClient();
      if (client && client.domain) {
        return client.domain.replace(/\/+$/, '') + '/' + signature.replace(/^\/+/, '');
      }
    }
    return signature;
  }

  function mapProductIds(raw) {
    if (!raw || typeof raw !== 'object') return [];
    var src = raw.product_id || raw.product_ids || raw.products_ids || raw.assign_product_id;
    if (typeof src === 'string') {
      return src.split(',').map(function (x) { return String(x).trim(); }).filter(Boolean);
    }
    if (!Array.isArray(src)) return [];
    return src.map(function (p) {
      if (p == null) return '';
      if (typeof p === 'object') return String(p.id || p.product_id || '');
      return String(p);
    }).filter(Boolean);
  }

  function mapSpareParts(raw) {
    var src = raw && (raw.spareParts || raw.parts || raw.products);
    if (!Array.isArray(src)) return [];
    return src.map(function (p) {
      if (typeof p === 'string') return { id: '', name: p, qty: 1 };
      return {
        id: String(p.id || p.product_id || ''),
        name: String(p.name || p.title || p.product || p.product_name || ''),
        qty: Number(p.qty || p.quantity || 1) || 1
      };
    }).filter(function (p) { return p.name || p.id; });
  }

  function ticketMediaPrefix(ticketId) {
    return 'ticket-' + String(ticketId || '').replace(/[^a-zA-Z0-9_-]/g, '_') + '-';
  }

  function ticketSignatureFileName(ticketId) {
    return ticketMediaPrefix(ticketId) + 'signature.png';
  }

  function ticketPhotoFileName(ticketId, kind, index) {
    return ticketMediaPrefix(ticketId) + String(kind || 'field') + '-' + String(index || 1) + '.jpg';
  }

  function resolveMediaUrl(value) {
    if (!value || typeof value !== 'string') return '';
    value = value.trim();
    if (!value) return '';
    if (/^(data:|blob:|https?:\/\/|\/\/)/i.test(value)) return value;
    if (global.MineralBarApp && MineralBarApp.getDomain) {
      return String(MineralBarApp.getDomain()).replace(/\/+$/, '') + '/' + value.replace(/^\/+/, '');
    }
    return value;
  }

  function docDisplayName(doc) {
    if (!doc || typeof doc !== 'object') return '';
    return String(
      doc.original_name || doc.display_name || doc.file_name || doc.name ||
      doc.title || doc.filename || doc.stored_name ||
      (doc.file && (doc.file.display_name || doc.file.file_name)) || ''
    );
  }

  function docFileUrl(doc) {
    if (!doc || typeof doc !== 'object') return '';
    var url = doc.file_url || doc.url || doc.pdf_url || doc.href || doc.link ||
      doc.path || doc.file_path ||
      (doc.file && (doc.file.file_url || doc.file.url || doc.file.path)) || '';
    return resolveMediaUrl(String(url || ''));
  }

  function matchTicketMediaFromDocs(ticketId, docs) {
    var prefix = ticketMediaPrefix(ticketId).toLowerCase();
    var before = [];
    var after = [];
    var signature = null;
    (docs || []).forEach(function (doc) {
      var name = docDisplayName(doc).toLowerCase();
      var url = docFileUrl(doc);
      if (!name || !url || name.indexOf(prefix) !== 0) return;
      if (name.indexOf('-signature') !== -1) {
        signature = url;
        return;
      }
      if (name.indexOf('-before-') !== -1) {
        before.push({ name: docDisplayName(doc), dataUrl: url, url: url, kind: 'before', uploaded: true });
        return;
      }
      if (name.indexOf('-after-') !== -1) {
        after.push({ name: docDisplayName(doc), dataUrl: url, url: url, kind: 'after', uploaded: true });
      }
    });
    return { before: before, after: after, signature: signature };
  }

  function ticketMediaManifest(raw) {
    var messages = raw && raw.messages;
    if (typeof messages === 'string') {
      try { messages = JSON.parse(messages); } catch (e) { messages = [{ message: messages }]; }
    }
    if (!Array.isArray(messages)) return null;
    for (var i = messages.length - 1; i >= 0; i--) {
      var text = String((messages[i] && (messages[i].message || messages[i].messages)) || messages[i] || '');
      var marker = text.indexOf('BIZ1_MEDIA:');
      if (marker < 0) continue;
      var encoded = text.slice(marker + 11).trim().split(/\r?\n/)[0];
      try {
        var parsed = JSON.parse(encoded);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (eJson) {
        var legacy = {};
        encoded.replace(/(before|after|signature)\s*:\s*([^,}\s]+)/gi, function (_all, key, value) {
          legacy[String(key).toLowerCase()] = value;
          return _all;
        });
        if (Object.keys(legacy).length) return legacy;
      }
    }
    return null;
  }

  function ticketMediaFiles(raw, ticketId) {
    if (!raw || typeof raw !== 'object') return [];
    var files = raw.files || raw.attachments || raw.ticket_files || [];
    if (typeof files === 'string') {
      try { files = JSON.parse(files); } catch (e) { files = []; }
    }
    if (!Array.isArray(files)) files = files ? [files] : [];
    var manifest = ticketMediaManifest(raw);
    if (manifest) {
      ['before', 'after', 'signature'].forEach(function (kind) {
        if (!manifest[kind]) return;
        files.push({
          original_name: kind === 'signature'
            ? ticketSignatureFileName(ticketId)
            : ticketPhotoFileName(ticketId, kind, 1),
          file_url: manifest[kind]
        });
      });
    }
    return files;
  }

  function mergeTicketMedia(ticketId, photos, files) {
    var matched = matchTicketMediaFromDocs(ticketId, files);
    var merged = (photos || []).slice();
    var seen = {};
    merged.forEach(function (photo) {
      var key = photo.dataUrl || photo.url || photo.name || '';
      if (key) seen[key] = true;
    });
    matched.before.concat(matched.after).forEach(function (photo) {
      var key = photo.dataUrl || photo.url || photo.name || '';
      if (key && !seen[key]) {
        seen[key] = true;
        merged.push(photo);
      }
    });
    return { photos: merged, signature: matched.signature };
  }

  function checklistToCustomFields(checklist) {
    var fields = {};
    (checklist || []).forEach(function (item) {
      if (!item || !item.id) return;
      var m = String(item.id).match(/^(a-\d+)-(.+?)(?:-\d+)?$/);
      if (!m) return;
      var fieldKey = m[1];
      var value = m[2];
      if (!fields[fieldKey]) fields[fieldKey] = [];
      if (item.done && fields[fieldKey].indexOf(value) < 0) fields[fieldKey].push(value);
    });
    return fields;
  }

  async function fetchCustomerTicketHistory(customerId, excludeTicketId) {
    customerId = String(customerId || '');
    if (!customerId || customerId === '0') return [];
    if (!global.MineralBarApp || !MineralBarApp.getClient) return [];
    try {
      var client = MineralBarApp.getClient();
      var raw = await client.request('Ticket.List', {
        customer_id: customerId,
        cust_id: customerId,
        limit: 25,
        length: 25,
        start: 0,
        type: 'company_tickets'
      });
      var rows = extractRows(raw).filter(isValidRawRow);
      var mapped = rows.map(mapTicket).filter(Boolean);
      var exclude = String(excludeTicketId || '');
      return mapped.filter(function (t) {
        return String(t.id) !== exclude && String(t.number) !== exclude;
      }).slice(0, 10);
    } catch (e) {
      console.warn('[FieldApp] customer ticket history failed', e);
      return [];
    }
  }

  async function hydrateTicketMedia(ticket) {
    if (!ticket) return ticket;
    var media = mergeTicketMedia(ticket.id, ticket.photos, ticketMediaFiles(ticket.raw, ticket.id));
    ticket.photos = media.photos;
    if (media.signature) ticket.signature = media.signature;
    updateTicket(ticket.id, {
      photos: ticket.photos,
      signature: ticket.signature
    }, { silent: true });
    return ticket;
  }

  function mapTicket(r, idx) {
    if (!r || typeof r !== 'object') return null;
    var id = String(pick(r, ['id', 'ticket_id', 'ticketId'], ''));
    if (!id) id = String(idx + 1);
    var customer = r.customer || r.client_obj || {};
    var clientFields = resolveClientFields(r);
    var statusRaw = String(pick(r, ['status', 'state', 'ticket_status', 'status_name'], 'Opened') || 'Opened');
    var apiMedia = mergeTicketMedia(id, normalizeTicketPhotos(r.photos), ticketMediaFiles(r, id));
    var mapped = {
      id: id,
      number: String(pick(r, ['number', 'ticket_number', 'serial', 'id', 'ticket_id'], id)),
      customerId: ticketCustomerId(r) || null,
      client: clientFields.name || clientFields.email,
      subject: String(pick(r, ['subject', 'title', 'topic'], '') || ''),
      email: clientFields.email,
      contact: String(pick(r, ['contact', 'contact_name', 'full_name'], '') ||
        pick(customer, ['contact', 'name'], '') || ''),
      phone: String(pick(r, ['mobile', 'phone', 'tel', 'whatsapp'], '') ||
        pick(customer, ['mobile', 'phone'], '') || ''),
      address: String(pick(r, ['address', 'full_address', 'city', 'location'], '') ||
        pick(customer, ['address', 'city'], '') || ''),
      lat: pick(r, ['lat', 'latitude'], null),
      lng: pick(r, ['lng', 'longitude', 'lon'], null),
      time: String(pick(r, ['time', 'scheduled_time', 'hour', 'start_time'], '') || ''),
      dur: String(pick(r, ['duration', 'dur', 'eta'], '') || ''),
      dateAt: ticketDateAt(r),
      status: statusFromApi(statusRaw),
      statusApi: statusRaw,
      history: mapHistory(r),
      checklist: mapChecklist(r),
      productIds: mapProductIds(r),
      spareParts: mapSpareParts(r),
      photos: apiMedia.photos,
      summary: String(pick(r, ['summary', 'description', 'note', 'work_done'], '') || ''),
      signature: apiMedia.signature || normalizeTicketSignature(r),
      live: true,
      raw: r
    };
    return applyOverlay(mapped);
  }

  function applyOverlay(ticket) {
    if (!ticket) return null;
    var overlays = loadOverlays();
    var o = overlays[ticket.id] || overlays[ticket.number];
    if (!o) return ticket;
    var merged = Object.assign({}, ticket, o, {
      id: ticket.id,
      number: ticket.number,
      status: migrateStatus(o.status || ticket.status),
      live: true,
      raw: ticket.raw
    });
    // Keep API checklist when overlay has empty checklist (old local wipe)
    if (!Array.isArray(merged.checklist) || !merged.checklist.length) {
      merged.checklist = ticket.checklist || [];
    }
    if (migrateStatus(ticket.status) === STATUS.closed) {
      if (Array.isArray(ticket.photos) && ticket.photos.length) merged.photos = ticket.photos;
      if (ticket.signature) merged.signature = ticket.signature;
    }
    return merged;
  }

  function extractRows(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.rows)) return raw.rows;
    if (Array.isArray(raw.tickets)) return raw.tickets;
    if (Array.isArray(raw.output)) return raw.output;
    if (raw.output && Array.isArray(raw.output.data)) return raw.output.data;
    if (raw.data && Array.isArray(raw.data.rows)) return raw.data.rows;
    return [];
  }

  function getTickets() {
    return filterTicketsForUser(loadCache(), { includeClosed: true });
  }

  function getTicketsForCounts() {
    return filterTicketsForUser(memoryTickets.slice(), { includeClosed: true });
  }

  function getTicket(id) {
    id = String(id || '');
    if (!id) return null;
    var list = loadCache();
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === id || String(list[i].number) === id) return list[i];
    }
    return null;
  }

  function updateTicket(id, patch, options) {
    options = options || {};
    id = String(id || '');
    lastPersistError = null;
    var list = loadCache();
    var found = null;
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === id || String(list[i].number) === id) {
        list[i] = Object.assign({}, list[i], patch || {});
        found = list[i];
        break;
      }
    }
    if (!found) return null;
    var overlays = loadOverlays();
    overlays[found.id] = Object.assign({}, overlays[found.id] || {}, patch || {});
    saveOverlays(overlays);
    if (options.silent) persistCache(list);
    else saveCache(list);
    return found;
  }

  /** Storage error from the most recent updateTicket call, if any. */
  function getLastPersistError() {
    return lastPersistError;
  }

  /**
   * Drop unsaved text/signature draft fields for open/assigned tickets only.
   * Selected photos stay in the draft until the multipart ticket request runs.
   */
  function clearTicketDraft(id) {
    id = String(id || '');
    if (!id) return false;
    var list = loadCache();
    var idx = findTicketIndex(list, id);
    var ticket = idx >= 0 ? list[idx] : null;
    if (ticket && migrateStatus(ticket.status) === STATUS.closed) return false;

    var ticketId = ticket ? String(ticket.id) : id;
    var draftClear = {
      summary: '',
      signature: null,
      spareParts: []
    };
    if (idx >= 0) {
      list[idx] = Object.assign({}, list[idx], draftClear);
      persistCache(list);
    }

    var overlays = loadOverlays();
    var changed = false;
    [ticketId, id].forEach(function (key) {
      if (!key || !overlays[key]) return;
      var st = migrateStatus(overlays[key].status || (ticket && ticket.status));
      if (st === STATUS.closed) return;
      overlays[key] = Object.assign({}, overlays[key], draftClear);
      changed = true;
    });
    if (changed) saveOverlays(overlays);
    return true;
  }

  function counts() {
    var list = getTicketsForCounts();
    var c = { total: list.length, opened: 0, assigned: 0, closed: 0 };
    list.forEach(function (t) {
      var s = migrateStatus(t.status);
      if (c[s] != null) c[s]++;
    });
    return c;
  }

  function statusLabelKey(status) {
    return ({
      opened: 'status_opened',
      assigned: 'status_assigned',
      closed: 'status_closed'
    })[migrateStatus(status)] || 'status_opened';
  }

  function statusColor(status) {
    return ({
      opened: { bg: '#e6f4ec', text: '#2e8a63', accent: '#2e8a63' },
      assigned: { bg: '#eaf2fb', text: '#1d60a2', accent: '#1d60a2' },
      closed: { bg: '#fbeeed', text: '#c0392b', accent: '#c0392b' }
    })[migrateStatus(status)] || { bg: '#eef0f3', text: '#5a6473', accent: '#9aa3b0' };
  }

  function mapsEmbedUrl(ticket) {
    if (!ticket) return null;
    if (ticket.lat != null && ticket.lng != null) {
      return 'https://www.google.com/maps?q=' + encodeURIComponent(ticket.lat + ',' + ticket.lng) + '&z=16&output=embed';
    }
    if (ticket.address) {
      return 'https://www.google.com/maps?q=' + encodeURIComponent(ticket.address) + '&z=16&output=embed';
    }
    return null;
  }

  function mapsUrl(ticket) {
    if (!ticket) return '#';
    if (ticket.lat != null && ticket.lng != null) {
      return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(ticket.lat + ',' + ticket.lng);
    }
    if (!ticket.address) return '#';
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(ticket.address);
  }

  function wazeUrl(ticket) {
    if (!ticket) return '#';
    if (ticket.lat != null && ticket.lng != null) {
      return 'https://waze.com/ul?ll=' + ticket.lat + '%2C' + ticket.lng + '&navigate=yes';
    }
    if (!ticket.address) return '#';
    return 'https://waze.com/ul?q=' + encodeURIComponent(ticket.address) + '&navigate=yes';
  }

  function ticketStopLabel(ticket) {
    if (!ticket) return '';
    if (ticket.lat != null && ticket.lng != null) return ticket.lat + ',' + ticket.lng;
    return ticket.address || '';
  }

  function startRouteEmbedUrl(tickets) {
    var open = (tickets || getTickets()).filter(function (t) {
      return migrateStatus(t.status) !== STATUS.closed;
    });
    if (!open.length) return null;
    var stops = open.map(ticketStopLabel).filter(Boolean);
    if (!stops.length) return null;
    if (stops.length === 1) {
      return 'https://maps.google.com/maps?saddr=My+Location&daddr=' + encodeURIComponent(stops[0]) + '&output=embed';
    }
    var path = ['My+Location'].concat(stops.map(function (s) {
      return encodeURIComponent(s);
    })).join('/');
    return 'https://www.google.com/maps/dir/' + path + '/?output=embed';
  }

  function startRouteUrl(tickets) {
    var open = (tickets || getTickets()).filter(function (t) {
      return migrateStatus(t.status) !== STATUS.closed;
    });
    if (!open.length) return '#';
    if (open.length === 1) return mapsUrl(open[0]);
    var dest = open[open.length - 1];
    var waypoints = open.slice(0, -1).map(function (t) {
      return (t.lat != null && t.lng != null) ? (t.lat + ',' + t.lng) : t.address;
    }).filter(Boolean).join('|');
    var destStr = (dest.lat != null && dest.lng != null) ? (dest.lat + ',' + dest.lng) : dest.address;
    if (!destStr) return '#';
    return 'https://www.google.com/maps/dir/?api=1&origin=current+location&destination=' +
      encodeURIComponent(destStr) +
      (waypoints ? '&waypoints=' + encodeURIComponent(waypoints) : '');
  }

  function onTheWayMessage(ticket) {
    var name = (ticket && (ticket.contact || ticket.client)) || '';
    var address = (ticket && ticket.address) || '';
    var msg = (global.MineralBarI18n && MineralBarI18n.t('wa_on_the_way')) ||
      ("Hi " + name + ", I'm on my way to your service visit (ticket #{ticket}).");
    msg = msg
      .replace(/\{name\}/g, name)
      .replace(/\{ticket\}/g, (ticket && ticket.number) || '')
      .replace(/\{address\}/g, address)
      .replace(/\{client\}/g, (ticket && ticket.client) || name);
    if (address && msg.indexOf(address) === -1) {
      msg += '\n' + ((global.MineralBarI18n && MineralBarI18n.t('address')) || 'Address') + ': ' + address;
    }
    return msg;
  }

  function whatsappOnTheWay(ticket) {
    var phone = String((ticket && ticket.phone) || '').replace(/\D/g, '');
    if (!phone) return '#';
    return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(onTheWayMessage(ticket));
  }

  /**
   * Send "I'm on my way" via Biz1 WhatsApp (Chat.SendCustomer from=send_whatsapp)
   * so it appears in the customer WhatsApp / messenger inbox.
   */
  async function sendOnTheWayWhatsApp(ticket) {
    if (!ticket) throw new Error((global.MineralBarI18n && MineralBarI18n.t('no_ticket')) || 'No ticket');
    var customerId = ticket.customerId || ticketCustomerId(ticket.raw) || 0;
    if (!customerId || String(customerId) === '0') {
      var missing = new Error((global.MineralBarI18n && MineralBarI18n.t('wa_missing_customer')) ||
        'Customer is missing — cannot send WhatsApp');
      missing.code = 'MISSING_CUSTOMER';
      throw missing;
    }
    if (!global.MineralBarApp || !MineralBarApp.sendCustomerMessage) {
      throw new Error('Chat.SendCustomer is unavailable');
    }
    var phone = String(ticket.phone || '').replace(/\D/g, '');
    return MineralBarApp.sendCustomerMessage({
      customer_id: customerId,
      cust_id: customerId,
      message: onTheWayMessage(ticket),
      from: 'send_whatsapp',
      phone: phone || undefined
    });
  }

  function whatsappSignedReport(ticket) {
    var phone = String((ticket && ticket.phone) || '').replace(/\D/g, '');
    if (!phone) return '#';
    var msg = (global.MineralBarI18n && MineralBarI18n.t('wa_signed_pdf')) ||
      'Your signed service report PDF is ready. Thank you!';
    msg = msg.replace('{ticket}', (ticket && ticket.number) || '');
    return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg);
  }

  function qs(name) {
    try {
      if (global.location.search) {
        var fromSearch = new URLSearchParams(global.location.search).get(name);
        if (fromSearch) return fromSearch;
      }
      var hash = (global.location.hash || '').replace(/^#/, '');
      var q = hash.indexOf('?');
      if (q !== -1) {
        return new URLSearchParams(hash.slice(q + 1)).get(name);
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  function t(key) {
    return (global.MineralBarI18n && MineralBarI18n.t(key)) || key;
  }

  function bindLiveChip() {
    var chips = document.querySelectorAll('[data-live-chip]');
    function paint() {
      var state = { connected: false, status: 'offline' };
      try {
        if (global.MineralBarApp && MineralBarApp.getRealtimeState) {
          state = MineralBarApp.getRealtimeState() || state;
        }
      } catch (e) { /* ignore */ }
      var on = !!(state.connected && state.status === 'ready');
      chips.forEach(function (el) {
        el.classList.toggle('live-on', on);
        el.classList.toggle('live-off', !on);
        var label = el.querySelector('[data-live-label]');
        if (label) label.textContent = on ? t('live_socket_on') : t('live_socket_off');
      });
    }
    paint();
    global.addEventListener('mineralbar:socket', paint);
    global.addEventListener('mineralbar:socket-status', paint);
    global.addEventListener('mineralbar:ready', paint);
    global.addEventListener('mineralbar:lang', paint);
    setInterval(paint, 4000);
  }

  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Camera shots are several MB, which overflows the localStorage quota and
   * makes the API payload huge. Downscale to a JPEG that still reads clearly.
   */
  async function compressImageFile(file, maxDim, quality) {
    maxDim = maxDim || 1280;
    quality = quality || 0.72;
    var dataUrl = await fileToDataUrl(file);
    if (!/^data:image\//i.test(dataUrl) || /^data:image\/(gif|svg)/i.test(dataUrl)) return dataUrl;
    return new Promise(function (resolve) {
      var img = new global.Image();
      img.onload = function () {
        var scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        var width = Math.max(1, Math.round((img.width || 1) * scale));
        var height = Math.max(1, Math.round((img.height || 1) * scale));
        var canvas = global.document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        try {
          var out = canvas.toDataURL('image/jpeg', quality);
          resolve(out && out.length < dataUrl.length ? out : dataUrl);
        } catch (e) {
          resolve(dataUrl);
        }
      };
      img.onerror = function () { resolve(dataUrl); };
      img.src = dataUrl;
    });
  }

  async function fetchLiveTickets() {
    if (!global.MineralBarApp || !MineralBarApp.getClient) {
      throw new Error(t('data_not_found'));
    }
    clearCacheIfUserChanged();
    var client = MineralBarApp.getClient();
    if (!client || !client.getToken || !client.getToken()) {
      throw new Error(t('data_not_found'));
    }

    var payload = { length: 50, start: 0, draw: 1 };

    var raw = await client.request('Ticket.List', payload);
    var rows = extractRows(raw).filter(isValidRawRow);
    var mapped = rows.map(mapTicket).filter(Boolean);
    var filtered = filterTicketsForUser(mapped, { includeClosed: true });
    await enrichTicketClients(filtered);
    return filtered;
  }

  async function fetchTicketById(ticketId) {
    ticketId = String(ticketId || '');
    if (!ticketId) return null;
    var cached = getTicket(ticketId);
    if (cached) return cached;
    if (!global.MineralBarApp) return null;
    try {
      if (MineralBarApp.getTicket) {
        var res = await MineralBarApp.getTicket(ticketId);
        var mapped = mapTicket(res.ticket || res, 0);
        if (mapped) {
          await enrichTicketClients([mapped]);
          upsertLiveTicket(mapped, { silent: true });
          return mapped;
        }
      }
    } catch (e) {
      console.warn('[FieldApp] Ticket.Get failed', e);
    }
    return null;
  }

  /** Fetch one ticket from API and upsert into cache (incremental UI). */
  async function syncTicketById(ticketId) {
    ticketId = String(ticketId || '');
    if (!ticketId || !global.MineralBarApp || !MineralBarApp.getTicket) return null;
    try {
      var res = await MineralBarApp.getTicket(ticketId);
      var mapped = mapTicket(res.ticket || res, 0);
      if (!mapped) return null;
      await enrichTicketClients([mapped]);
      if (!ticketHasDisplayData(mapped)) return null;
      return upsertLiveTicket(mapped);
    } catch (e) {
      console.warn('[FieldApp] syncTicketById failed', e);
      return null;
    }
  }

  /** Silent Ticket.List merge — no loading spinner, no full list wipe. */
  async function syncTicketsIncremental() {
    if (!global.MineralBarApp || !MineralBarApp.getClient) return [];
    try {
      var live = await fetchLiveTickets();
      return mergeTicketsFromList(live);
    } catch (e) {
      console.warn('[FieldApp] incremental sync failed', e);
      return [];
    }
  }

  async function applyRealtimeTicketEvent(event) {
    var ticketId = extractTicketIdFromRealtime(event);
    if (ticketId && isTicketDeleteEvent(event)) {
      removeLiveTicket(ticketId);
      return { mode: 'remove', id: ticketId };
    }

    // Always soft-merge Ticket.List — reliable for ticket.created even when
    // realtime payload only carries an event id (not ticket_id).
    var changed = await syncTicketsIncremental();

    if (ticketId) {
      var updated = await syncTicketById(ticketId);
      if (updated) return { mode: 'upsert', ticket: updated, changed: changed };
    }
    return { mode: 'merge', changed: changed };
  }

  async function ensureTickets(options) {
    options = options || {};
    var silent = !!options.silent;
    loading = true;
    lastError = null;
    clearCacheIfUserChanged();
    if (!silent) {
      global.dispatchEvent(new CustomEvent('fieldapp:loading', { detail: { loading: true } }));
    }
    try {
      var live = await fetchLiveTickets();
      if (silent && memoryTickets.length) {
        mergeTicketsFromList(live);
        lastError = null;
        return getTickets();
      }
      saveCache(live);
      lastError = null;
      return live;
    } catch (e) {
      console.warn('[FieldApp] Ticket.List failed', e);
      lastError = (e && e.message) || t('data_not_found');
      if (!silent) saveCache([]);
      return silent ? getTickets() : [];
    } finally {
      loading = false;
      if (!silent) {
        global.dispatchEvent(new CustomEvent('fieldapp:loading', { detail: { loading: false, error: lastError } }));
      }
    }
  }

  function getLastError() {
    return lastError;
  }

  function isLoading() {
    return loading;
  }

  function emptyLabel() {
    return t('data_not_found');
  }

  var leafletPromise = null;
  var mapInstance = null;
  var ROUTE_COLOR = '#c0392b';

  function loadLeaflet() {
    if (global.L && global.L.map) return Promise.resolve(global.L);
    if (leafletPromise) return leafletPromise;
    leafletPromise = new Promise(function (resolve, reject) {
      if (!document.getElementById('leaflet-css')) {
        var link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (global.L && global.L.map) {
        resolve(global.L);
        return;
      }
      var script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = function () { resolve(global.L); };
      script.onerror = function () { reject(new Error('Leaflet failed to load')); };
      document.head.appendChild(script);
    });
    return leafletPromise;
  }

  function destroyMapInstance() {
    if (mapInstance) {
      try { mapInstance.remove(); } catch (e) { /* ignore */ }
      mapInstance = null;
    }
  }

  function getMapHost() {
    return document.querySelector('.phone-outer') ||
      document.querySelector('.app-view:not(.hidden)') ||
      document.querySelector('.phone-inner');
  }

  function ensureMapOverlay() {
    var host = getMapHost();
    if (!host) return;
    var overlay = document.getElementById('fieldMapOverlay');
    if (overlay) {
      if (overlay.parentElement !== host) host.appendChild(overlay);
      return;
    }
    overlay = document.createElement('div');
    overlay.id = 'fieldMapOverlay';
    overlay.className = 'map-overlay hidden';
    overlay.innerHTML =
      '<div class="map-overlay-header">' +
        '<button type="button" id="fieldMapClose" class="map-overlay-close" aria-label="Close">' +
          '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>' +
        '</button>' +
        '<div class="map-overlay-title" id="fieldMapTitle"></div>' +
      '</div>' +
      '<div id="fieldMapLoading" class="hidden"></div>' +
      '<div id="fieldMapCanvas"></div>';
    host.appendChild(overlay);
    document.getElementById('fieldMapClose').addEventListener('click', closeInAppMap);
  }

  function setMapLoading(on, msg) {
    var loadingEl = document.getElementById('fieldMapLoading');
    var canvas = document.getElementById('fieldMapCanvas');
    if (!loadingEl || !canvas) return;
    loadingEl.textContent = msg || t('loading');
    loadingEl.classList.toggle('hidden', !on);
    canvas.style.display = on ? 'none' : 'block';
  }

  async function geocodeAddress(query) {
    if (!query) return null;
    var res = await fetch(
      'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(query) + '&format=json&limit=1',
      { headers: { 'Accept-Language': global.MineralBarI18n ? MineralBarI18n.getLang() : 'en' } }
    );
    var data = await res.json();
    if (!Array.isArray(data) || !data[0]) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      label: query
    };
  }

  async function resolveTicketPoint(ticket) {
    if (!ticket) return null;
    if (ticket.lat != null && ticket.lng != null) {
      return {
        lat: Number(ticket.lat),
        lng: Number(ticket.lng),
        label: ticket.address || ticket.client || ticket.number
      };
    }
    if (ticket.address) return geocodeAddress(ticket.address);
    return null;
  }

  function getCurrentPosition() {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation unavailable'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            label: t('current_location') || 'Current location'
          });
        },
        reject,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  async function fetchRouteGeometry(points) {
    if (!points || points.length < 2) return null;
    var coordStr = points.map(function (p) { return p.lng + ',' + p.lat; }).join(';');
    var res = await fetch(
      'https://router.project-osrm.org/route/v1/driving/' + coordStr + '?overview=full&geometries=geojson'
    );
    var data = await res.json();
    if (!data || data.code !== 'Ok' || !data.routes || !data.routes[0]) return null;
    return data.routes[0].geometry;
  }

  async function showRouteMap(points, titleText) {
    if (!points || !points.length) {
      alert(t('data_not_found'));
      return;
    }
    ensureMapOverlay();
    var overlay = document.getElementById('fieldMapOverlay');
    var title = document.getElementById('fieldMapTitle');
    if (title) title.textContent = titleText || t('navigate');
    overlay.classList.remove('hidden');
    setMapLoading(true, t('loading'));

    try {
      await loadLeaflet();
      destroyMapInstance();
      setMapLoading(false);

      var L = global.L;
      var canvas = document.getElementById('fieldMapCanvas');
      canvas.style.display = 'block';
      canvas.innerHTML = '';

      mapInstance = L.map(canvas, { zoomControl: true, attributionControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapInstance);

      var routePoints = points.slice();
      var geometry = null;
      if (routePoints.length >= 2) {
        geometry = await fetchRouteGeometry(routePoints);
      }

      if (geometry && geometry.coordinates) {
        var latlngs = geometry.coordinates.map(function (c) { return [c[1], c[0]]; });
        L.polyline(latlngs, {
          color: ROUTE_COLOR,
          weight: 5,
          opacity: 0.9,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(mapInstance);
        mapInstance.fitBounds(L.polyline(latlngs).getBounds(), { padding: [28, 28] });
      } else if (routePoints.length === 1) {
        mapInstance.setView([routePoints[0].lat, routePoints[0].lng], 14);
      } else {
        var bounds = L.latLngBounds(routePoints.map(function (p) { return [p.lat, p.lng]; }));
        mapInstance.fitBounds(bounds, { padding: [28, 28] });
      }

      routePoints.forEach(function (p, idx) {
        var isStart = idx === 0;
        var isEnd = idx === routePoints.length - 1;
        var color = isEnd ? '#c0392b' : (isStart ? '#1d60a2' : '#bd8324');
        L.circleMarker([p.lat, p.lng], {
          radius: 8,
          color: '#fff',
          weight: 2,
          fillColor: color,
          fillOpacity: 1
        }).addTo(mapInstance).bindPopup(p.label || '');
      });

      setTimeout(function () {
        if (mapInstance) mapInstance.invalidateSize();
      }, 120);
    } catch (e) {
      console.warn('[FieldApp] map render failed', e);
      setMapLoading(false);
      alert(t('data_not_found'));
      closeInAppMap();
    }
  }

  async function openInAppMap(ticket) {
    if (!ticket) return;
    var dest = await resolveTicketPoint(ticket);
    if (!dest) {
      alert(t('data_not_found'));
      return;
    }
    var points = [];
    try {
      points.push(await getCurrentPosition());
    } catch (e) {
      /* route to destination only */
    }
    points.push(dest);
    await showRouteMap(points, ticket.address || ticket.client || t('navigate'));
  }

  async function openInAppRoute(tickets) {
    var open = (tickets || getTickets()).filter(function (t) {
      return migrateStatus(t.status) !== STATUS.closed;
    });
    if (!open.length) {
      alert(t('data_not_found'));
      return;
    }
    var label = t('start_route') + ' · ' + open.length + ' ' + t('visits');
    ensureMapOverlay();
    document.getElementById('fieldMapTitle').textContent = label;
    document.getElementById('fieldMapOverlay').classList.remove('hidden');
    setMapLoading(true, t('loading'));

    var stops = [];
    for (var i = 0; i < open.length; i++) {
      var pt = await resolveTicketPoint(open[i]);
      if (pt) stops.push(pt);
    }
    if (!stops.length) {
      setMapLoading(false);
      closeInAppMap();
      alert(t('data_not_found'));
      return;
    }

    var points = [];
    try {
      points.push(await getCurrentPosition());
    } catch (e) { /* ignore */ }
    points = points.concat(stops);
    await showRouteMap(points, label);
  }

  function closeInAppMap() {
    var overlay = document.getElementById('fieldMapOverlay');
    destroyMapInstance();
    if (overlay) overlay.classList.add('hidden');
    setMapLoading(false);
    var canvas = document.getElementById('fieldMapCanvas');
    if (canvas) canvas.innerHTML = '';
  }

  function clearTicketCache() {
    memoryTickets = [];
    lastError = null;
    try {
      global.localStorage.removeItem(CACHE_KEY);
      global.localStorage.removeItem('mineralbar_field_cache_user');
    } catch (e) { /* ignore */ }
  }

  function wireTicketRealtimeSync() {
    if (global.__fieldTicketSync) return;
    global.__fieldTicketSync = true;
    var syncTimer = null;
    var syncPending = null;
    var syncInFlight = false;
    var pollTimer = null;

    function runIncrementalSync(event) {
      if (!global.MineralBarApp || !MineralBarApp.isAuthenticated || !MineralBarApp.isAuthenticated()) return;
      syncPending = event || syncPending || {};
      if (syncInFlight) return;
      if (syncTimer) return;
      syncTimer = setTimeout(function () {
        syncTimer = null;
        var ev = syncPending;
        syncPending = null;
        syncInFlight = true;
        applyRealtimeTicketEvent(ev).catch(function (err) {
          console.warn('[FieldApp] realtime ticket sync failed', err);
        }).finally(function () {
          syncInFlight = false;
          if (syncPending) runIncrementalSync(syncPending);
        });
      }, 250);
    }

    global.addEventListener('mineralbar:realtime', function (e) {
      var key = String((e.detail && e.detail.key) || '');
      if (!isTicketRealtimeKey(key)) return;
      runIncrementalSync(e);
    });

    // First socket ready: fill cache only if empty (no list wipe when already showing tickets)
    global.addEventListener('mineralbar:socket', function (e) {
      if (!(e.detail && e.detail.type === 'ready')) return;
      if (!global.MineralBarApp || !MineralBarApp.isAuthenticated || !MineralBarApp.isAuthenticated()) return;
      if (!getTickets().length) {
        ensureTickets({ silent: true }).catch(function () {});
      }
      // Safety net: quiet merge while live — catches creates if event payload is incomplete
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(function () {
        if (!global.MineralBarApp || !MineralBarApp.isAuthenticated || !MineralBarApp.isAuthenticated()) return;
        var st = MineralBarApp.getRealtimeState && MineralBarApp.getRealtimeState();
        if (!(st && st.connected)) return;
        if (typeof document !== 'undefined' && document.hidden) return;
        syncTicketsIncremental().catch(function () {});
      }, 12000);
    });
  }

  wireTicketRealtimeSync();

  global.FieldApp = {
    STATUS: STATUS,
    STATUS_OPTIONS: STATUS_OPTIONS,
    getTickets: getTickets,
    getTicket: getTicket,
    fetchTicketById: fetchTicketById,
    syncTicketById: syncTicketById,
    syncTicketsIncremental: syncTicketsIncremental,
    upsertLiveTicket: upsertLiveTicket,
    removeLiveTicket: removeLiveTicket,
    updateTicket: updateTicket,
    clearTicketDraft: clearTicketDraft,
    counts: counts,
    statusLabelKey: statusLabelKey,
    statusColor: statusColor,
    statusToApi: statusToApi,
    statusFromApi: statusFromApi,
    migrateStatus: migrateStatus,
    mapsUrl: mapsUrl,
    mapsEmbedUrl: mapsEmbedUrl,
    openInAppMap: openInAppMap,
    startRouteEmbedUrl: startRouteEmbedUrl,
    openInAppRoute: openInAppRoute,
    closeInAppMap: closeInAppMap,
    wazeUrl: wazeUrl,
    startRouteUrl: startRouteUrl,
    whatsappOnTheWay: whatsappOnTheWay,
    onTheWayMessage: onTheWayMessage,
    sendOnTheWayWhatsApp: sendOnTheWayWhatsApp,
    whatsappSignedReport: whatsappSignedReport,
    qs: qs,
    bindLiveChip: bindLiveChip,
    fileToDataUrl: fileToDataUrl,
    compressImageFile: compressImageFile,
    getLastPersistError: getLastPersistError,
    ensureTickets: ensureTickets,
    clearTicketCache: clearTicketCache,
    saveStore: saveCache,
    getLastError: getLastError,
    isLoading: isLoading,
    emptyLabel: emptyLabel,
    clientDisplay: clientDisplay,
    checklistToCustomFields: checklistToCustomFields,
    fetchCustomerTicketHistory: fetchCustomerTicketHistory,
    hydrateTicketMedia: hydrateTicketMedia,
    ticketSignatureFileName: ticketSignatureFileName,
    ticketPhotoFileName: ticketPhotoFileName,
    resolveMediaUrl: resolveMediaUrl,
    ticketCustomerId: ticketCustomerId,
    normalizeTicketSignature: normalizeTicketSignature,
    t: t
  };
})(window);


/* ===== app-router.js ===== */
/**
 * Single-page router — login · schedule · ticket
 */
(function (global) {
  'use strict';

  var AUTH_ROUTES = { schedule: 1, ticket: 1, complete: 1 };
  var booted = false;
  var currentPage = '';
  var draftSessionTicketId = null;

  function resetTicketDraftUi() {
    if (typeof ticketState !== 'undefined' && ticketState) {
      ticketState.hasStroke = false;
      ticketState.drawing = false;
    }
    var summaryEl = global.document.getElementById('ticketSummary');
    if (summaryEl) {
      summaryEl.value = '';
      summaryEl.readOnly = false;
    }
    try {
      var canvas = global.document.getElementById('sigCanvas');
      if (canvas) {
        var ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.classList.remove('hidden');
      }
      var preview = global.document.getElementById('ticketSignaturePreview');
      if (preview) {
        preview.removeAttribute('src');
        preview.classList.add('hidden');
      }
      var clearSig = global.document.getElementById('clearSig');
      if (clearSig) clearSig.style.display = '';
    } catch (e) { /* ignore */ }
    var err = global.document.getElementById('ticketFormError');
    if (err) err.classList.add('hidden');
  }

  /** Clear draft only for open/assigned tickets when user leaves the ticket flow. */
  function discardOpenTicketDraftSession() {
    var id = draftSessionTicketId ||
      (typeof ticketState !== 'undefined' && ticketState && ticketState.id) ||
      null;
    if (id && global.FieldApp && FieldApp.clearTicketDraft) {
      FieldApp.clearTicketDraft(id);
    }
    draftSessionTicketId = null;
    resetTicketDraftUi();
  }

  function tr(key) {
    var lang = global.document && global.document.documentElement.lang === 'he' ? 'he' : 'en';
    return (global.MineralBarI18n && MineralBarI18n.t(key, lang)) ||
      (global.FieldApp && FieldApp.t && FieldApp.t(key)) || key;
  }

  function loginPath() {
    return 'index.html#login';
  }

  function parseRoute() {
    var raw = (global.location.hash || '').replace(/^#/, '') || 'login';
    var q = raw.indexOf('?');
    var page = (q === -1 ? raw : raw.slice(0, q)).trim() || 'login';
    var params = {};
    if (q !== -1) {
      try {
        new URLSearchParams(raw.slice(q + 1)).forEach(function (v, k) {
          params[k] = v;
        });
      } catch (e) { /* ignore */ }
    }
    return { page: page, params: params };
  }

  function navigate(page, params) {
    params = params || {};
    var hash = page;
    var qs = Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
    if (qs) hash += '?' + qs;
    if (global.location.hash.replace(/^#/, '') === hash) {
      onRoute();
      return;
    }
    global.location.hash = hash;
  }

  function showView(page) {
    global.document.querySelectorAll('.app-view').forEach(function (el) {
      el.classList.toggle('hidden', el.getAttribute('data-view') !== page);
    });
    currentPage = page;
    var brand = (global.MineralBarApp && MineralBarApp.getBrandName && MineralBarApp.getBrandName()) || 'Biz1 Showcase';
    var titles = {
      login: tr('page_login_title'),
      schedule: tr('my_schedule') + ' — ' + brand,
      ticket: tr('ticket_title') + ' — ' + brand,
      complete: tr('go_complete') + ' — ' + brand
    };
    global.document.title = titles[page] || brand;
  }

  async function bootAuthenticated() {
    if (!global.MineralBarApp) return false;
    await MineralBarApp.ensureAuth(loginPath());
    if (!MineralBarApp.isAuthenticated()) return false;
    if (!booted) {
      try {
        await MineralBarApp.connectRealtime({ timeoutMs: 12000 });
      } catch (e) {
        console.warn('[Biz1Showcase] realtime connect failed', e);
      }
      booted = true;
      global.dispatchEvent(new CustomEvent('mineralbar:ready'));
    }
    if (global.FieldApp && FieldApp.bindLiveChip) FieldApp.bindLiveChip();
    return true;
  }

  /* ── Login ── */
  function initLogin() {
    var form = global.document.getElementById('loginForm');
    if (!form || form.__bound) return;
    form.__bound = true;

    var usernameEl = global.document.getElementById('username');
    var passwordEl = global.document.getElementById('password');
    var usernameWrap = global.document.getElementById('usernameWrap');
    var passwordWrap = global.document.getElementById('passwordWrap');
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
    var cooldownUntil = 0;
    var cooldownTimer = null;
    var resendCooldownUntil = 0;
    var resendTimer = null;
    var activeErrorKey = '';

    function showError(msg, translationKey) {
      activeErrorKey = translationKey || '';
      errorText.textContent = msg || tr('err_generic');
      errorBox.style.background = '#fbeeed';
      errorBox.style.borderColor = '#f0c9c4';
      errorText.style.color = '#c0392b';
      errorBox.classList.remove('hidden');
    }
    function showErrorKey(key) {
      showError(tr(key), key);
    }
    function clearError() {
      activeErrorKey = '';
      errorBox.classList.add('hidden');
      errorText.textContent = '';
    }
    function setLoginBtnLabel() {
      loginBtnText.removeAttribute('data-i18n');
      loginBtnText.textContent = waitingOtp ? tr('login_btn_otp') : tr('login_btn');
    }
    function setResendLabel(secondsLeft) {
      if (!resendText) return;
      resendText.removeAttribute('data-i18n');
      if (secondsLeft > 0) {
        resendText.textContent = tr('resend_otp_wait').replace('{s}', String(secondsLeft));
      } else {
        resendText.textContent = tr('resend_otp');
      }
    }
    function setRequestBusy(busy, source) {
      requestInFlight = busy;
      var rateLimited = Date.now() < cooldownUntil;
      loginBtn.disabled = busy || rateLimited;
      if (resendBtn) {
        resendBtn.disabled = busy || rateLimited || Date.now() < resendCooldownUntil;
        if (source === 'resend') {
          if (busy && resendText) {
            resendText.removeAttribute('data-i18n');
            resendText.textContent = tr('resend_otp_sending');
          } else if (Date.now() >= resendCooldownUntil) {
            setResendLabel(0);
          }
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
          clearInterval(resendTimer);
          resendTimer = null;
          resendCooldownUntil = 0;
          setResendLabel(0);
          resendBtn.disabled = requestInFlight || Date.now() < cooldownUntil;
          return;
        }
        setResendLabel(left);
      }
      tick();
      resendTimer = setInterval(tick, 1000);
    }
    function enterOtpMode(message) {
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
      if (/wait\s+(?:one|a)\s+minute/i.test(message)) return 60;
      if ((err && Number(err.status) === 429) || /too many login attempts/i.test(message)) return 60;
      return 0;
    }

    function startLoginCooldown(seconds) {
      cooldownUntil = Date.now() + (seconds * 1000);
      if (cooldownTimer) clearInterval(cooldownTimer);

      function tick() {
        var remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
        if (!remaining) {
          clearInterval(cooldownTimer);
          cooldownTimer = null;
          cooldownUntil = 0;
          setRequestBusy(false, 'login');
          setLoginBtnLabel();
          clearError();
          return;
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
      if (err && err.code === 'OTP_SESSION_EXPIRED') return 'err_otp_session';
      if (err && err.code === 'OTP_NETWORK') return 'err_otp_network';
      if ((err && err.name === 'TypeError') || /failed to fetch|network.?error|network request failed/i.test(message)) {
        return 'err_network';
      }
      if (status === 400 || status === 401 ||
          /invalid credentials|incorrect (?:email|username|password)|wrong password|user not found|login failed|סיסמה שגוי|משתמש לא נמצא|פרטי התחברות/i.test(message)) {
        return 'err_invalid_credentials';
      }
      return fallbackKey || 'err_failed';
    }

    function handleLoginError(err, fallbackKey) {
      var retrySeconds = getRetrySeconds(err);
      if (retrySeconds) {
        startLoginCooldown(retrySeconds);
        return true;
      }
      showErrorKey(localizedLoginErrorKey(err, fallbackKey));
      return false;
    }

    function isOtpValidationError(err) {
      var raw = (err && err.raw) || {};
      var status = Number((err && err.status) || raw.status || 0);
      var message = String(raw.message || (err && err.message) || '').toLowerCase();
      if (err && err.code === 'INVALID_OTP') return true;
      if (status === 400 || status === 401) return true;
      return /(otp|one.?time|verification|אימות).*(invalid|wrong|incorrect|expired|mismatch|failed|שגוי|פג)/i.test(message)
        || /(invalid|wrong|incorrect|expired|mismatch|failed|שגוי|פג).*(otp|code|אימות|קוד)/i.test(message);
    }

    global.addEventListener('mineralbar:lang', function () {
      if (Date.now() >= cooldownUntil) setLoginBtnLabel();
      if (activeErrorKey && Date.now() >= cooldownUntil) showErrorKey(activeErrorKey);
      if (resendCooldownUntil > Date.now()) {
        setResendLabel(Math.ceil((resendCooldownUntil - Date.now()) / 1000));
      } else {
        setResendLabel(0);
      }
    });

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

    global.document.getElementById('togglePassword').addEventListener('click', function () {
      passwordEl.type = passwordEl.type === 'password' ? 'text' : 'password';
    });
    global.document.querySelectorAll('.demo-user-btn[data-user][data-pass], .fillUser').forEach(function (btn) {
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        allowAutofillClear = false;
        usernameEl.value = btn.getAttribute('data-user') || '';
        passwordEl.value = btn.getAttribute('data-pass') || '';
        passwordEl.focus();
        clearError();
      });
    });

    if (resendBtn && !resendBtn.__bound) {
      resendBtn.__bound = true;
      resendBtn.addEventListener('click', async function () {
        if (!waitingOtp || requestInFlight || Date.now() < cooldownUntil || Date.now() < resendCooldownUntil) return;
        clearError();
        var username = usernameEl.value.trim();
        var password = passwordEl.value;
        if (!username || !password) {
          showErrorKey('err_fill');
          return;
        }
        setRequestBusy(true, 'resend');
        try {
          var result = await MineralBarApp.login({
            username: username,
            password: password,
            otp: '',
            remember: !!(rememberEl && rememberEl.checked)
          });
          if (result && result.otpRequired) {
            otpEl.value = '';
            enterOtpMode(tr('resend_otp_sent'));
            return;
          }
          if (result && result.ok) {
            booted = false;
            navigate('schedule');
            return;
          }
          showErrorKey('err_resend_otp');
        } catch (err) {
          handleLoginError(err, 'err_resend_otp');
        } finally {
          setRequestBusy(false, 'resend');
        }
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
          if (waitingOtp && otp) {
            showErrorKey('err_invalid_otp');
            otpEl.select();
            return;
          }
          enterOtpMode(result.message);
          return;
        }
        if (result.ok) {
          booted = false;
          navigate('schedule');
          return;
        }
        showErrorKey('err_failed');
      } catch (err) {
        if (waitingOtp && otp && !getRetrySeconds(err) && isOtpValidationError(err)) {
          showErrorKey('err_invalid_otp');
          otpEl.select();
        } else {
          handleLoginError(err);
        }
      } finally {
        setRequestBusy(false, 'login');
        if (Date.now() >= cooldownUntil) setLoginBtnLabel();
      }
    });
  }

  /* ── Schedule ── */
  var scheduleState = { filter: 'all', period: 'daily', search: '' };

  function startOfLocalDay(ms) {
    var d = new Date(ms == null ? Date.now() : ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function startOfLocalWeek(ms) {
    var d = new Date(ms == null ? Date.now() : ms);
    d.setHours(0, 0, 0, 0);
    // Monday as week start
    var day = d.getDay();
    var diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.getTime();
  }

  function endOfLocalWeek(ms) {
    return startOfLocalWeek(ms) + (7 * 24 * 60 * 60 * 1000) - 1;
  }

  function ticketMatchesPeriodFilter(ticket, periodKey) {
    periodKey = periodKey || 'daily';
    if (periodKey === 'all') return true;
    var at = ticket && ticket.dateAt != null ? Number(ticket.dateAt) : NaN;
    if (!isFinite(at)) {
      // No date from API — keep visible on Daily/Weekly so list is not emptied
      return true;
    }
    var now = Date.now();
    if (periodKey === 'daily') {
      return startOfLocalDay(at) === startOfLocalDay(now);
    }
    if (periodKey === 'weekly') {
      return at >= startOfLocalWeek(now) && at <= endOfLocalWeek(now);
    }
    return true;
  }

  function ticketMatchesScheduleFilter(ticket, filterKey) {
    var status = FieldApp.migrateStatus(ticket && ticket.status);
    if (filterKey === 'opened') return status === FieldApp.STATUS.opened;
    if (filterKey === 'assigned') return status === FieldApp.STATUS.assigned;
    if (filterKey === 'closed') return status === FieldApp.STATUS.closed;
    return true;
  }

  function ticketMatchesScheduleSearch(ticket, query) {
    query = String(query || '').trim().toLowerCase();
    if (!query) return true;
    var hay = [
      ticket && ticket.number,
      ticket && ticket.subject,
      ticket && ticket.contact,
      ticket && ticket.address,
      ticket && FieldApp.clientDisplay(ticket)
    ].join(' ').toLowerCase();
    return hay.indexOf(query) !== -1;
  }

  function ticketVisibleOnSchedule(ticket) {
    return ticketMatchesPeriodFilter(ticket, scheduleState.period) &&
      ticketMatchesScheduleFilter(ticket, scheduleState.filter) &&
      ticketMatchesScheduleSearch(ticket, scheduleState.search);
  }

  function paintActiveFilterButtons(wrapId, attr, activeValue) {
    var wrap = global.document.getElementById(wrapId);
    if (!wrap) return;
    wrap.querySelectorAll('button[' + attr + ']').forEach(function (btn) {
      var on = btn.getAttribute(attr) === activeValue;
      btn.classList.toggle('active', on);
      btn.style.background = on ? 'var(--filter-active-bg)' : 'var(--bg-card)';
      btn.style.borderColor = on ? 'var(--filter-active-border)' : 'var(--border)';
      btn.style.color = on ? 'var(--filter-active-text)' : 'var(--text)';
    });
  }

  function paintScheduleFilters() {
    paintActiveFilterButtons('scheduleFilters', 'data-filter', scheduleState.filter);
    paintActiveFilterButtons('schedulePeriodFilters', 'data-period', scheduleState.period);
  }

  function paintScheduleCounts() {
    if (!global.FieldApp) return;
    var list = FieldApp.getTickets().filter(function (t) {
      return ticketMatchesPeriodFilter(t, scheduleState.period);
    });
    var c = { total: list.length, opened: 0, assigned: 0, closed: 0 };
    list.forEach(function (t) {
      var s = FieldApp.migrateStatus(t.status);
      if (c[s] != null) c[s]++;
    });
    var total = global.document.getElementById('countTotal');
    var done = global.document.getElementById('countDone');
    var open = global.document.getElementById('countOpen');
    if (total) total.textContent = c.total;
    if (done) done.textContent = c.closed;
    if (open) open.textContent = c.opened + c.assigned;
  }

  function setScheduleLoading(on) {
    var loadingEl = global.document.getElementById('schedLoadingState');
    if (loadingEl) loadingEl.classList.toggle('hidden', !on);
    if (on) {
      var empty = global.document.getElementById('schedEmptyState');
      var root = global.document.getElementById('schedTicketList');
      if (empty) empty.classList.add('hidden');
      if (root) root.innerHTML = '';
    }
  }

  function scheduleEmptyState(show) {
    var empty = global.document.getElementById('schedEmptyState');
    if (!empty) return;
    if (show) {
      empty.classList.remove('hidden');
      var emptyLabel = empty.querySelector('[data-i18n]');
      if (emptyLabel) emptyLabel.textContent = tr('data_not_found');
    } else {
      empty.classList.add('hidden');
    }
  }

  function buildScheduleCard(ticket) {
    var colors = FieldApp.statusColor(ticket.status);
    var client = FieldApp.clientDisplay(ticket);
    var subject = ticket.subject || tr('data_not_found');
    var address = ticket.address || tr('data_not_found');
    var time = ticket.time || '—';
    var card = global.document.createElement('div');
    card.className = 'card schedule-ticket-card';
    card.setAttribute('data-ticket-id', String(ticket.id));
    card.setAttribute('data-ticket-number', String(ticket.number || ''));
    card.style.cssText = 'border-inline-start:4px solid ' + colors.accent + ';cursor:pointer;';
    card.innerHTML =
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">' +
        '<div style="flex:1;min-width:0;">' +
          '<div class="sched-card-title">' + client + '</div>' +
          '<div class="sched-card-meta">#' + ticket.number +
            (ticket.contact ? ' · ' + ticket.contact : '') + '</div>' +
          '<div class="sched-card-subject"></div>' +
          '<div class="sched-card-address">' + address + '</div>' +
        '</div>' +
        '<div style="text-align:end;flex:none;">' +
          '<div class="sched-card-time" style="color:' + colors.accent + ';">' + time + '</div>' +
          '<span class="status-pill" style="margin-top:6px;background:' + colors.bg + ';color:' + colors.text + ';">' +
            '<span class="dot"></span>' + tr(FieldApp.statusLabelKey(ticket.status)) + '</span>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:12px;">' +
        (ticket.address || (ticket.lat != null)
          ? '<button type="button" class="btn-ghost nav-inapp-btn" style="flex:1;text-align:center;" data-stop>' + tr('navigate') + '</button>'
          : '<span class="btn-ghost" style="flex:1;text-align:center;opacity:.55;" data-stop>' + tr('data_not_found') + '</span>') +
        '<button type="button" class="btn-ghost open-ticket-btn sched-open-btn" style="flex:1;text-align:center;" data-stop>' +
          tr('open_ticket') + '</button>' +
      '</div>';

    card.querySelector('.sched-card-subject').textContent = tr('subject') + ': ' + subject;

    var navBtn = card.querySelector('.nav-inapp-btn');
    if (navBtn) {
      navBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        FieldApp.openInAppMap(ticket);
      });
    }
    card.querySelector('.open-ticket-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      navigate('ticket', { id: ticket.id });
    });
    card.addEventListener('click', function (e) {
      if (e.target.closest('[data-stop]')) return;
      navigate('ticket', { id: ticket.id });
    });
    return card;
  }

  function findScheduleCard(ticketId) {
    var root = global.document.getElementById('schedTicketList');
    if (!root) return null;
    return root.querySelector('[data-ticket-id="' + String(ticketId) + '"]');
  }

  function removeScheduleCard(ticketId) {
    var card = findScheduleCard(ticketId);
    if (card && card.parentNode) card.parentNode.removeChild(card);
    var root = global.document.getElementById('schedTicketList');
    scheduleEmptyState(!(root && root.children.length));
    paintScheduleCounts();
  }

  /** Update one card in place — no full list rebuild. */
  function upsertScheduleCard(ticket, isNew) {
    if (!ticket || !global.FieldApp) return;
    var root = global.document.getElementById('schedTicketList');
    if (!root) return;

    paintScheduleCounts();

    var matches = ticketVisibleOnSchedule(ticket);
    var existing = findScheduleCard(ticket.id);

    if (!matches) {
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      scheduleEmptyState(!root.children.length);
      return;
    }

    scheduleEmptyState(false);
    var card = buildScheduleCard(ticket);
    if (existing && existing.parentNode) {
      existing.parentNode.replaceChild(card, existing);
      return;
    }
    if (isNew || !root.firstChild) {
      root.insertBefore(card, root.firstChild);
    } else {
      root.appendChild(card);
    }
  }

  function renderSchedule() {
    if (!global.FieldApp) return;
    var allTickets = FieldApp.getTickets();
    var tickets = allTickets.filter(function (t) {
      return ticketVisibleOnSchedule(t);
    });
    paintScheduleFilters();
    paintScheduleCounts();

    var root = global.document.getElementById('schedTicketList');
    if (!root) return;
    root.innerHTML = '';

    if (!tickets.length) {
      scheduleEmptyState(true);
      return;
    }
    scheduleEmptyState(false);
    tickets.forEach(function (ticket) {
      root.appendChild(buildScheduleCard(ticket));
    });
  }

  function initSchedule() {
    var btn = global.document.getElementById('startRouteBtn');
    if (btn && !btn.__bound) {
      btn.__bound = true;
      btn.addEventListener('click', function () { FieldApp.openInAppRoute(); });
    }
    var homeNav = global.document.getElementById('schedHomeNav');
    if (homeNav && !homeNav.__bound) {
      homeNav.__bound = true;
      homeNav.addEventListener('click', function (e) {
        e.preventDefault();
        navigate('schedule');
      });
    }
    var filterWrap = global.document.getElementById('scheduleFilters');
    if (filterWrap && !filterWrap.__bound) {
      filterWrap.__bound = true;
      filterWrap.addEventListener('click', function (e) {
        var btn = e.target.closest('.schedule-filter-btn');
        if (!btn) return;
        scheduleState.filter = btn.getAttribute('data-filter') || 'all';
        renderSchedule();
      });
    }
    var periodWrap = global.document.getElementById('schedulePeriodFilters');
    if (periodWrap && !periodWrap.__bound) {
      periodWrap.__bound = true;
      periodWrap.addEventListener('click', function (e) {
        var btn = e.target.closest('.schedule-period-btn');
        if (!btn) return;
        scheduleState.period = btn.getAttribute('data-period') || 'daily';
        renderSchedule();
      });
    }
    var searchInput = global.document.getElementById('scheduleSearchInput');
    if (searchInput && !searchInput.__bound) {
      searchInput.__bound = true;
      searchInput.addEventListener('input', function () {
        scheduleState.search = searchInput.value || '';
        renderSchedule();
      });
    }
    paintScheduleFilters();
  }

  function profileDisplayName() {
    var user = (global.MineralBarApp && MineralBarApp.getUser && MineralBarApp.getUser()) || null;
    var email = (global.MineralBarApp && MineralBarApp.getEmail && MineralBarApp.getEmail()) || '';
    if (!user) return email || '—';
    return String(
      user.full_name || user.name || user.display_name || user.username ||
      [user.first_name, user.last_name].filter(Boolean).join(' ') ||
      user.email || email || '—'
    ).trim() || '—';
  }

  function profileEmail() {
    var user = (global.MineralBarApp && MineralBarApp.getUser && MineralBarApp.getUser()) || null;
    var email = (global.MineralBarApp && MineralBarApp.getEmail && MineralBarApp.getEmail()) || '';
    return String((user && (user.email || user.username || user.mail)) || email || '—').trim() || '—';
  }

  function profileRoleLabel() {
    var role = (global.MineralBarApp && MineralBarApp.getRole && MineralBarApp.getRole()) || '';
    if (!role) return '—';
    var key = 'role_' + role;
    var label = tr(key);
    return label === key ? role : label;
  }

  function profileInitials() {
    var name = profileDisplayName();
    var email = profileEmail();
    var source = (name !== '—' ? name : email);
    if (!source || source === '—') return '?';
    var parts = String(source).replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }

  function paintProfile() {
    var initials = profileInitials();
    global.document.querySelectorAll('[data-profile-initials]').forEach(function (el) {
      el.textContent = initials;
    });
    var nameEl = global.document.getElementById('profileName');
    var emailEl = global.document.getElementById('profileEmail');
    var roleEl = global.document.getElementById('profileRole');
    if (nameEl) nameEl.textContent = profileDisplayName();
    if (emailEl) emailEl.textContent = profileEmail();
    if (roleEl) roleEl.textContent = profileRoleLabel();
  }

  function openProfile() {
    paintProfile();
    var overlay = global.document.getElementById('profileOverlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function closeProfile() {
    var overlay = global.document.getElementById('profileOverlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
  }

  function initProfile() {
    if (global.document.documentElement.__profileBound) return;
    global.document.documentElement.__profileBound = true;
    global.document.addEventListener('click', function (e) {
      var openBtn = e.target.closest('[data-profile-open]');
      if (openBtn) {
        e.preventDefault();
        openProfile();
        return;
      }
      var closeBtn = e.target.closest('[data-profile-close]');
      if (closeBtn) {
        e.preventDefault();
        closeProfile();
      }
    });
    var logout = global.document.getElementById('logoutBtn');
    if (logout && !logout.__bound) {
      logout.__bound = true;
      logout.addEventListener('click', function () {
        closeProfile();
        try { FieldApp.clearTicketCache(); } catch (e) {}
        try { MineralBarApp.clearSession(); } catch (e) {}
        booted = false;
        navigate('login');
      });
    }
    global.addEventListener('mineralbar:lang', paintProfile);
    global.addEventListener('mineralbar:ready', paintProfile);
  }

  async function activateSchedule() {
    discardOpenTicketDraftSession();
    initSchedule();
    paintProfile();
    if (global.FieldApp) FieldApp.bindLiveChip();
    setScheduleLoading(true);
    await FieldApp.ensureTickets();
    setScheduleLoading(false);
    renderSchedule();
  }

  /* ── Ticket / Complete ── */
  var ticketState = {
    id: null,
    ticket: null,
    drawing: false,
    hasStroke: false,
    history: [],
    products: []
  };

  function paintTicketStatusOptions() {
    var sel = global.document.getElementById('ticketStatusSelect');
    if (!sel) return;
    var current = sel.value;
    sel.innerHTML = FieldApp.STATUS_OPTIONS.map(function (st) {
      return '<option value="' + st + '">' + tr(FieldApp.statusLabelKey(st)) + '</option>';
    }).join('');
    if (current) sel.value = FieldApp.migrateStatus(current);
  }

  function showFormError(elId, message) {
    var err = global.document.getElementById(elId);
    if (!err) return;
    if (!message) {
      err.classList.add('hidden');
      err.textContent = '';
      return;
    }
    err.textContent = message;
    err.classList.remove('hidden');
  }

  function renderTicketHistory() {
    var root = global.document.getElementById('ticketHistory');
    if (!root) return;
    var items = ticketState.history || [];
    if (!items.length) {
      root.innerHTML = '<div class="empty-inline">' + tr('no_history') + '</div>';
      return;
    }
    root.innerHTML = items.map(function (h) {
      var when = h.dateAt ? new Date(h.dateAt).toLocaleDateString() : (h.time || '');
      var status = tr(FieldApp.statusLabelKey(h.status));
      return '<div class="history-row">' +
        '<div class="history-main">' +
          '<div class="history-title">#' + (h.number || h.id) + ' · ' + (h.subject || tr('data_not_found')) + '</div>' +
          '<div class="history-meta">' + when + (status ? ' · ' + status : '') + '</div>' +
        '</div></div>';
    }).join('');
  }

  async function syncChecklistItem(ticket, item, previousDone) {
    FieldApp.updateTicket(ticket.id, { checklist: ticket.checklist });
    ticketState.ticket = FieldApp.getTicket(ticket.id);
    renderTicketChecklist();
    if (!global.MineralBarApp || !MineralBarApp.getClient) return;
    try {
      var customFields = FieldApp.checklistToCustomFields(ticket.checklist || []);
      await MineralBarApp.getClient().request('Ticket.Edit', {
        ticket_id: ticket.id,
        id: ticket.id,
        custom_fields: customFields
      });
      showFormError('ticketFormError', '');
    } catch (e) {
      item.done = previousDone;
      FieldApp.updateTicket(ticket.id, { checklist: ticket.checklist });
      ticketState.ticket = FieldApp.getTicket(ticket.id);
      renderTicketChecklist();
      showFormError('ticketFormError', (e && e.message) || tr('checklist_save_failed'));
    }
  }

  function renderTicketChecklist() {
    var root = global.document.getElementById('ticketChecklist');
    if (!root) return;
    var ticket = ticketState.ticket;
    root.innerHTML = '';
    var items = (ticket && ticket.checklist) || [];
    if (!items.length) {
      root.innerHTML = '<div class="empty-inline">' + tr('no_checklist') + '</div>';
      return;
    }
    var isClosed = !!(ticket && FieldApp.migrateStatus(ticket.status) === FieldApp.STATUS.closed);
    items.forEach(function (item) {
      var row = global.document.createElement('div');
      row.className = 'check-row' + (item.done ? ' done' : '');
      row.innerHTML =
        '<div class="check-box">' + (item.done ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>' : '') + '</div>' +
        '<div class="check-label">' + item.label + '</div>';
      if (!isClosed) {
        row.addEventListener('click', function () {
          var previousDone = !!item.done;
          item.done = !item.done;
          syncChecklistItem(ticket, item, previousDone);
        });
      }
      root.appendChild(row);
    });
  }

  function photoByKind(kind) {
    var photos = (ticketState.ticket && ticketState.ticket.photos) || [];
    for (var i = photos.length - 1; i >= 0; i--) {
      if (photos[i] && photos[i].kind === kind && (photos[i].dataUrl || photos[i].url)) {
        return photos[i];
      }
    }
    return null;
  }

  function setPhotoSlot(kind, photo) {
    var preview = global.document.getElementById(
      kind === 'before' ? 'ticketBeforePhotoPreview' : 'ticketAfterPhotoPreview'
    );
    var label = global.document.getElementById(
      kind === 'before' ? 'ticketBeforePhotoLabel' : 'ticketAfterPhotoLabel'
    );
    if (!preview || !label) return;
    var src = photo && (photo.dataUrl || photo.url || photo.path);
    if (src) {
      preview.src = src;
      preview.classList.remove('hidden');
      label.classList.add('has-photo');
    } else {
      preview.removeAttribute('src');
      preview.classList.add('hidden');
      label.classList.remove('has-photo');
    }
  }

  function renderCompletePhotos() {
    setPhotoSlot('before', photoByKind('before'));
    setPhotoSlot('after', photoByKind('after'));
  }

  function renderCompletedWork() {
    var card = global.document.getElementById('ticketCompletedWork');
    var ticket = ticketState.ticket;
    if (!card || !ticket) return;

    var isClosed = FieldApp.migrateStatus(ticket.status) === FieldApp.STATUS.closed;
    card.classList.toggle('hidden', !isClosed);
    if (!isClosed) return;

    var summary = global.document.getElementById('ticketCompletedSummary');
    if (summary) {
      summary.textContent = String(ticket.summary || ticket.subject || tr('data_not_found'));
    }

    var partsWrap = global.document.getElementById('ticketCompletedPartsWrap');
    var partsRoot = global.document.getElementById('ticketCompletedParts');
    var parts = ticket.spareParts || [];
    if (partsWrap) partsWrap.classList.toggle('hidden', !parts.length);
    if (partsRoot) {
      partsRoot.innerHTML = '';
      parts.forEach(function (part) {
        var row = global.document.createElement('div');
        row.className = 'completed-part-row';
        row.textContent = String(part.name || ('#' + (part.id || ''))) +
          (part.qty ? ' ×' + part.qty : '');
        partsRoot.appendChild(row);
      });
    }

    var before = photoByKind('before');
    var after = photoByKind('after');
    var photosWrap = global.document.getElementById('ticketCompletedPhotosWrap');
    if (photosWrap) photosWrap.classList.toggle('hidden', !before && !after);

    [
      { photo: before, wrapId: 'ticketCompletedBeforeWrap', imageId: 'ticketCompletedBefore' },
      { photo: after, wrapId: 'ticketCompletedAfterWrap', imageId: 'ticketCompletedAfter' }
    ].forEach(function (entry) {
      var wrap = global.document.getElementById(entry.wrapId);
      var image = global.document.getElementById(entry.imageId);
      var src = entry.photo && (entry.photo.dataUrl || entry.photo.url || entry.photo.path);
      if (wrap) wrap.classList.toggle('hidden', !src);
      if (image) {
        if (src) image.src = src;
        else image.removeAttribute('src');
      }
    });

    var signatureWrap = global.document.getElementById('ticketCompletedSignatureWrap');
    var signatureImage = global.document.getElementById('ticketCompletedSignature');
    var signature = ticket.signature || '';
    if (signatureWrap) signatureWrap.classList.toggle('hidden', !signature);
    if (signatureImage) {
      if (signature) signatureImage.src = signature;
      else signatureImage.removeAttribute('src');
    }
  }

  function renderTicketSpares() {
    var root = global.document.getElementById('ticketSparesList');
    if (!root) return;
    var ticket = ticketState.ticket;
    var parts = (ticket && ticket.spareParts) || [];
    var isClosed = !!(ticket && FieldApp.migrateStatus(ticket.status) === FieldApp.STATUS.closed);
    if (!parts.length) {
      root.innerHTML = '<div class="empty-inline">' + tr('no_spares') + '</div>';
      return;
    }
    root.innerHTML = parts.map(function (p, idx) {
      return '<div class="spare-row" data-idx="' + idx + '">' +
        '<div class="spare-name">' + (p.name || ('#' + (p.id || ''))) +
          (p.qty ? ' ×' + p.qty : '') + '</div>' +
        (isClosed ? '' : '<button type="button" class="btn-ghost spare-remove" data-idx="' + idx + '">' + tr('remove_part') + '</button>') +
        '</div>';
    }).join('');
    root.querySelectorAll('.spare-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = Number(btn.getAttribute('data-idx'));
        var next = (ticketState.ticket.spareParts || []).slice();
        next.splice(i, 1);
        FieldApp.updateTicket(ticketState.id, {
          spareParts: next,
          productIds: next.map(function (x) { return x.id; }).filter(Boolean)
        });
        ticketState.ticket = FieldApp.getTicket(ticketState.id);
        renderTicketSpares();
      });
    });
  }

  function fillProductSelect() {
    var sel = global.document.getElementById('completeProductSelect');
    if (!sel) return;
    var current = sel.value;
    var opts = '<option value="">' + tr('select_product') + '</option>';
    (ticketState.products || []).forEach(function (p) {
      opts += '<option value="' + String(p.id).replace(/"/g, '') + '">' +
        String(p.name || p.id).replace(/</g, '&lt;') + '</option>';
    });
    sel.innerHTML = opts;
    if (current) sel.value = current;
  }

  function ticketCanvas() {
    return global.document.getElementById('sigCanvas');
  }

  function ticketCtx() {
    var canvas = ticketCanvas();
    return canvas ? canvas.getContext('2d') : null;
  }

  function setupTicketCanvas() {
    var canvas = ticketCanvas();
    var ctx = ticketCtx();
    if (!canvas || !ctx) return;
    var ratio = global.devicePixelRatio || 1;
    var cssW = canvas.clientWidth || 340;
    var cssH = 160;
    canvas.width = Math.floor(cssW * ratio);
    canvas.height = Math.floor(cssH * ratio);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.strokeStyle = '#1f2a3a';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  function ticketSigPos(e) {
    var canvas = ticketCanvas();
    var rect = canvas.getBoundingClientRect();
    var src = e.touches ? e.touches[0] : e;
    return {
      x: src.clientX - rect.left,
      y: src.clientY - rect.top
    };
  }

  function clearTicketSignatureCanvas() {
    var canvas = ticketCanvas();
    var ctx = ticketCtx();
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setupTicketCanvas();
    ticketState.hasStroke = false;
  }

  function initTicketCanvas() {
    var canvas = ticketCanvas();
    if (!canvas || canvas.__bound) return;
    canvas.__bound = true;
    setupTicketCanvas();
    canvas.addEventListener('mousedown', function (e) {
      if (ticketState.ticket && FieldApp.migrateStatus(ticketState.ticket.status) === FieldApp.STATUS.closed) return;
      e.preventDefault();
      ticketState.drawing = true;
      var p = ticketSigPos(e);
      ticketCtx().beginPath();
      ticketCtx().moveTo(p.x, p.y);
    });
    canvas.addEventListener('mousemove', function (e) {
      if (!ticketState.drawing) return;
      e.preventDefault();
      var p = ticketSigPos(e);
      ticketCtx().lineTo(p.x, p.y);
      ticketCtx().stroke();
      ticketState.hasStroke = true;
    });
    canvas.addEventListener('mouseup', function () { ticketState.drawing = false; });
    canvas.addEventListener('mouseleave', function () { ticketState.drawing = false; });
    canvas.addEventListener('touchstart', function (e) {
      if (ticketState.ticket && FieldApp.migrateStatus(ticketState.ticket.status) === FieldApp.STATUS.closed) return;
      e.preventDefault();
      ticketState.drawing = true;
      var p = ticketSigPos(e);
      ticketCtx().beginPath();
      ticketCtx().moveTo(p.x, p.y);
    }, { passive: false });
    canvas.addEventListener('touchmove', function (e) {
      if (!ticketState.drawing) return;
      e.preventDefault();
      var p = ticketSigPos(e);
      ticketCtx().lineTo(p.x, p.y);
      ticketCtx().stroke();
      ticketState.hasStroke = true;
    }, { passive: false });
    canvas.addEventListener('touchend', function () { ticketState.drawing = false; });
  }

  function persistWorkSummary() {
    var summaryEl = global.document.getElementById('ticketSummary');
    if (!summaryEl || !ticketState.id) return '';
    if (ticketState.ticket && FieldApp.migrateStatus(ticketState.ticket.status) === FieldApp.STATUS.closed) {
      return summaryEl.value || '';
    }
    var summary = summaryEl.value || '';
    if (ticketState.ticket) {
      ticketState.ticket.summary = summary;
      ticketState.ticket.subject = summary;
    }
    FieldApp.updateTicket(ticketState.id, { summary: summary, subject: summary }, { silent: true });
    return summary;
  }

  function renderTicketSignature() {
    var canvas = ticketCanvas();
    var preview = global.document.getElementById('ticketSignaturePreview');
    var clearBtn = global.document.getElementById('clearSig');
    var ticket = ticketState.ticket;
    var isClosed = !!(ticket && FieldApp.migrateStatus(ticket.status) === FieldApp.STATUS.closed);
    var sig = ticket && ticket.signature;
    if (isClosed && sig) {
      if (canvas) canvas.classList.add('hidden');
      if (preview) {
        preview.src = sig;
        preview.classList.remove('hidden');
      }
      if (clearBtn) clearBtn.style.display = 'none';
      ticketState.hasStroke = true;
      return;
    }
    if (canvas) canvas.classList.remove('hidden');
    if (preview) {
      preview.removeAttribute('src');
      preview.classList.add('hidden');
    }
    if (clearBtn) clearBtn.style.display = isClosed ? 'none' : '';
  }

  function showTicketMissing() {
    var missing = global.document.getElementById('ticketMissing');
    var content = global.document.getElementById('ticketContent');
    if (missing) {
      missing.classList.remove('hidden');
      missing.textContent = tr('data_not_found');
    }
    if (content) content.classList.add('hidden');
  }

  function showCompleteMissing() {
    var missing = global.document.getElementById('completeMissing');
    var content = global.document.getElementById('completeContent');
    if (missing) {
      missing.classList.remove('hidden');
      missing.textContent = tr('data_not_found');
    }
    if (content) content.classList.add('hidden');
  }

  function updateTicketCompleteBtnVisibility(ticket) {
    var isClosed = !!(ticket && FieldApp.migrateStatus(ticket.status) === FieldApp.STATUS.closed);
    var completeBtn = global.document.getElementById('ticketCompleteBtn');
    if (completeBtn) completeBtn.style.display = isClosed ? 'none' : 'flex';

    var spareBtn = global.document.getElementById('ticketSpareBtn');
    var summaryEl = global.document.getElementById('ticketSummary');
    var beforeInput = global.document.getElementById('ticketBeforePhotoInput');
    var afterInput = global.document.getElementById('ticketAfterPhotoInput');
    var productSel = global.document.getElementById('completeProductSelect');
    var productQty = global.document.getElementById('completeProductQty');
    var submitBtn = global.document.getElementById('completeSubmitBtn');

    [beforeInput, afterInput, productSel, productQty].forEach(function (el) {
      if (el) el.disabled = isClosed;
    });
    if (spareBtn) {
      spareBtn.disabled = isClosed;
      spareBtn.classList.toggle('is-disabled', isClosed);
      spareBtn.style.opacity = isClosed ? '0.45' : '';
    }
    if (submitBtn) submitBtn.style.display = isClosed ? 'none' : 'flex';
    if (summaryEl) {
      summaryEl.readOnly = isClosed;
      if (isClosed && ticket) summaryEl.value = String(ticket.summary || ticket.subject || '');
    }
  }

  function renderTicket() {
    paintTicketStatusOptions();
    var ticketId = ticketState.id;
    if (!ticketId) {
      showTicketMissing();
      return;
    }
    ticketState.ticket = FieldApp.getTicket(ticketId) || ticketState.ticket;
    var ticket = ticketState.ticket;
    if (!ticket) {
      showTicketMissing();
      return;
    }
    global.document.getElementById('ticketMissing').classList.add('hidden');
    global.document.getElementById('ticketContent').classList.remove('hidden');
    global.document.getElementById('ticketNum').textContent = ticket.number || ticketId;
    global.document.getElementById('ticketClientLine').textContent =
      FieldApp.clientDisplay(ticket) + (ticket.contact ? ' (' + ticket.contact + ')' : '');
    global.document.getElementById('ticketAddressLine').textContent = ticket.address || tr('data_not_found');
    global.document.getElementById('ticketStatusSelect').value = FieldApp.migrateStatus(ticket.status);

    var nav = global.document.getElementById('ticketNavMaps');
    if (ticket.address || (ticket.lat != null && ticket.lng != null)) {
      nav.style.display = '';
      nav.style.opacity = '1';
      nav.textContent = tr('navigate');
      nav.onclick = function (e) {
        e.preventDefault();
        FieldApp.openInAppMap(ticket);
      };
    } else {
      nav.style.opacity = '0.55';
      nav.textContent = tr('data_not_found');
      nav.onclick = null;
    }

    var wa = global.document.getElementById('ticketWaBtn');
    var customerId = ticket.customerId || FieldApp.ticketCustomerId(ticket.raw) || 0;
    var canSendWa = !!(customerId && String(customerId) !== '0');
    wa.removeAttribute('href');
    wa.setAttribute('role', 'button');
    if (canSendWa) {
      wa.style.opacity = '1';
      wa.style.pointerEvents = '';
      wa.onclick = async function (e) {
        e.preventDefault();
        if (wa.getAttribute('data-sending') === '1') return;
        wa.setAttribute('data-sending', '1');
        wa.style.opacity = '0.7';
        showFormError('ticketFormError', '');
        var label = wa.querySelector('[data-i18n="wa_on_way_btn"]') || wa.querySelector('span');
        var prevLabel = label ? label.textContent : '';
        if (label) label.textContent = tr('wa_on_way_sending');
        try {
          await FieldApp.sendOnTheWayWhatsApp(ticket);
          showFormError('ticketFormError', '');
          if (label) label.textContent = tr('wa_on_way_sent');
          setTimeout(function () {
            if (label) label.textContent = prevLabel || tr('wa_on_way_btn');
          }, 2200);
        } catch (err) {
          var msg = (err && err.message) || tr('wa_on_way_failed');
          showFormError('ticketFormError', msg);
          if (label) label.textContent = prevLabel || tr('wa_on_way_btn');
        } finally {
          wa.removeAttribute('data-sending');
          wa.style.opacity = '1';
        }
      };
    } else {
      wa.style.opacity = '0.55';
      wa.style.pointerEvents = 'auto';
      wa.onclick = function (e) {
        e.preventDefault();
        showFormError('ticketFormError', tr('wa_missing_customer'));
      };
    }

    renderTicketHistory();
    renderTicketChecklist();
    renderCompletedWork();
    updateTicketCompleteBtnVisibility(ticket);
  }

  function renderComplete() {
    var ticketId = ticketState.id;
    if (!ticketId) {
      showCompleteMissing();
      return;
    }
    ticketState.ticket = FieldApp.getTicket(ticketId) || ticketState.ticket;
    var ticket = ticketState.ticket;
    if (!ticket) {
      showCompleteMissing();
      return;
    }
    global.document.getElementById('completeMissing').classList.add('hidden');
    global.document.getElementById('completeContent').classList.remove('hidden');
    global.document.getElementById('completeTicketNum').textContent = ticket.number || ticketId;

    var isClosed = FieldApp.migrateStatus(ticket.status) === FieldApp.STATUS.closed;
    var summaryEl = global.document.getElementById('ticketSummary');
    if (summaryEl) {
      var saved = String(ticket.summary || ticket.subject || '');
      var sameTicket = summaryEl.getAttribute('data-ticket-id') === String(ticket.id);
      if (isClosed) {
        summaryEl.value = saved;
        summaryEl.readOnly = true;
      } else {
        summaryEl.readOnly = false;
        if (!sameTicket || !String(summaryEl.value || '')) summaryEl.value = saved;
      }
      summaryEl.setAttribute('data-ticket-id', String(ticket.id));
    }

    fillProductSelect();
    renderTicketSpares();
    renderCompletePhotos();
    renderTicketSignature();
    updateTicketCompleteBtnVisibility(ticket);
  }

  function initTicket() {
    initTicketCanvas();

    var back = global.document.getElementById('ticketBackBtn');
    if (back && !back.__bound) {
      back.__bound = true;
      back.addEventListener('click', function (e) {
        e.preventDefault();
        navigate('schedule');
      });
    }

    var statusSel = global.document.getElementById('ticketStatusSelect');
    if (statusSel && !statusSel.__bound) {
      statusSel.__bound = true;
      statusSel.addEventListener('change', async function () {
        var ticket = ticketState.ticket;
        if (!ticket) return;
        var newStatus = FieldApp.migrateStatus(this.value);
        var newStatusApi = FieldApp.statusToApi(newStatus);
        var prevStatus = ticket.status;
        var prevStatusApi = ticket.statusApi;
        FieldApp.updateTicket(ticketState.id, { status: newStatus, statusApi: newStatusApi });
        ticketState.ticket = FieldApp.getTicket(ticketState.id);
        updateTicketCompleteBtnVisibility(ticketState.ticket);
        try {
          if (MineralBarApp.getClient) {
            await MineralBarApp.getClient().request('Ticket.Edit', {
              ticket_id: ticketState.id,
              id: ticketState.id,
              status: newStatusApi
            });
          }
        } catch (e) {
          FieldApp.updateTicket(ticketState.id, { status: prevStatus, statusApi: prevStatusApi });
          ticketState.ticket = FieldApp.getTicket(ticketState.id);
          statusSel.value = FieldApp.migrateStatus(prevStatus);
          updateTicketCompleteBtnVisibility(ticketState.ticket);
        }
      });
    }

    var completeNavBtn = global.document.getElementById('ticketCompleteBtn');
    if (completeNavBtn && !completeNavBtn.__bound) {
      completeNavBtn.__bound = true;
      completeNavBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (!ticketState.id) return;
        navigate('complete', { id: ticketState.id });
      });
    }
  }

  function initComplete() {
    initTicketCanvas();

    var summaryEl = global.document.getElementById('ticketSummary');
    if (summaryEl && !summaryEl.__boundDraft) {
      summaryEl.__boundDraft = true;
      summaryEl.addEventListener('input', function () {
        persistWorkSummary();
      });
    }

    var back = global.document.getElementById('completeBackBtn');
    if (back && !back.__bound) {
      back.__bound = true;
      back.addEventListener('click', function (e) {
        e.preventDefault();
        if (ticketState.id) navigate('ticket', { id: ticketState.id });
        else navigate('schedule');
      });
    }

    function bindPhotoInput(inputId, kind) {
      var input = global.document.getElementById(inputId);
      if (!input || input.__bound) return;
      input.__bound = true;
      input.addEventListener('change', async function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file || !ticketState.ticket) return;
        if (FieldApp.migrateStatus(ticketState.ticket.status) === FieldApp.STATUS.closed) {
          e.target.value = '';
          return;
        }
        showFormError('completeFormError', '');
        input.disabled = true;
        try {
          var dataUrl = await FieldApp.compressImageFile(file);
          var photos = (ticketState.ticket.photos || []).filter(function (p) { return p.kind !== kind; });
          photos.push({ name: file.name, dataUrl: dataUrl, kind: kind, uploaded: false });
          FieldApp.updateTicket(ticketState.id, { photos: photos });
          ticketState.ticket = FieldApp.getTicket(ticketState.id);
          renderCompletePhotos();
        } catch (err) {
          showFormError('completeFormError', (err && err.message) || tr('photo_upload_failed'));
        } finally {
          input.disabled = false;
          e.target.value = '';
        }
      });
    }
    bindPhotoInput('ticketBeforePhotoInput', 'before');
    bindPhotoInput('ticketAfterPhotoInput', 'after');

    var spareBtn = global.document.getElementById('ticketSpareBtn');
    if (spareBtn && !spareBtn.__bound) {
      spareBtn.__bound = true;
      spareBtn.addEventListener('click', function () {
        if (!ticketState.ticket) return;
        if (FieldApp.migrateStatus(ticketState.ticket.status) === FieldApp.STATUS.closed) return;
        var sel = global.document.getElementById('completeProductSelect');
        var qtyEl = global.document.getElementById('completeProductQty');
        var productId = sel ? String(sel.value || '') : '';
        var qty = Math.max(1, Number(qtyEl && qtyEl.value) || 1);
        var product = (ticketState.products || []).filter(function (p) {
          return String(p.id) === productId;
        })[0];
        if (!product) {
          showFormError('completeFormError', tr('select_product'));
          return;
        }
        showFormError('completeFormError', '');
        var spareParts = (ticketState.ticket.spareParts || []).slice();
        var existing = spareParts.filter(function (p) { return String(p.id) === String(product.id); })[0];
        if (existing) existing.qty = Number(existing.qty || 1) + qty;
        else spareParts.push({ id: String(product.id), name: product.name, qty: qty });
        FieldApp.updateTicket(ticketState.id, {
          spareParts: spareParts,
          productIds: spareParts.map(function (p) { return p.id; }).filter(Boolean)
        });
        ticketState.ticket = FieldApp.getTicket(ticketState.id);
        renderTicketSpares();
      });
    }

    var clearSig = global.document.getElementById('clearSig');
    if (clearSig && !clearSig.__bound) {
      clearSig.__bound = true;
      clearSig.addEventListener('click', function () {
        if (ticketState.ticket && FieldApp.migrateStatus(ticketState.ticket.status) === FieldApp.STATUS.closed) return;
        clearTicketSignatureCanvas();
        FieldApp.updateTicket(ticketState.id, { signature: null }, { silent: true });
        ticketState.ticket = FieldApp.getTicket(ticketState.id);
        renderTicketSignature();
      });
    }

    var submitBtn = global.document.getElementById('completeSubmitBtn');
    if (submitBtn && !submitBtn.__bound) {
      submitBtn.__bound = true;
      submitBtn.addEventListener('click', async function (e) {
        e.preventDefault();
        showFormError('completeFormError', '');
        if (!ticketState.ticket || submitBtn.disabled) return;
        if (FieldApp.migrateStatus(ticketState.ticket.status) === FieldApp.STATUS.closed) return;

        var summary = persistWorkSummary().trim();
        if (!summary) {
          showFormError('completeFormError', tr('work_summary') + ' *');
          return;
        }
        if (!ticketState.hasStroke && !(ticketState.ticket.signature && !/^data:/i.test(ticketState.ticket.signature))) {
          showFormError('completeFormError', tr('digital_signature') + ' *');
          return;
        }

        var submitLabel = submitBtn.querySelector('[data-i18n="complete_send"]') ||
          submitBtn.querySelector('span');
        submitBtn.disabled = true;
        if (submitLabel) submitLabel.textContent = tr('loading');

        try {
          var signatureDataUrl = ticketState.hasStroke ? ticketCanvas().toDataURL('image/png') : null;
          var mediaFiles = [];
          var requestPhotos = (ticketState.ticket.photos || []).map(function (photo, index) {
            var source = photo.dataUrl || photo.url || '';
            if (!/^data:/i.test(source)) return Object.assign({}, photo);
            var fileName = FieldApp.ticketPhotoFileName(
              ticketState.id,
              photo.kind || 'field',
              index + 1
            );
            mediaFiles.push({
              kind: photo.kind || 'field',
              file_name: fileName,
              dataUrl: source
            });
            return Object.assign({}, photo, { name: fileName });
          });
          var signatureSource = signatureDataUrl || ticketState.ticket.signature || '';
          var signatureFileName = FieldApp.ticketSignatureFileName(ticketState.id);
          if (/^data:/i.test(signatureSource)) {
            mediaFiles.push({
              kind: 'signature',
              file_name: signatureFileName,
              dataUrl: signatureSource
            });
          }

          var productIds = (ticketState.ticket.spareParts || [])
            .map(function (p) { return p.id; })
            .filter(Boolean);
          var messageLines = [
            'Work summary: ' + summary
          ];
          (ticketState.ticket.spareParts || []).forEach(function (p) {
            messageLines.push('- ' + (p.name || p.id) + (p.qty ? ' x' + p.qty : ''));
          });
          if (photoByKind('before')) messageLines.push('Before photo attached.');
          if (photoByKind('after')) messageLines.push('After photo attached.');
          messageLines.push('Client signature saved.');

          var payload = {
            ticket_id: ticketState.id,
            id: ticketState.id,
            status: FieldApp.statusToApi(FieldApp.STATUS.closed),
            subject: summary,
            topic: summary
          };
          if (productIds.length) payload.product_id = productIds.join(',');

          // Ticket.Edit documents one image_upload per request. Upload each
          // media item separately so before, after and signature are all kept.
          var returnedFiles = [];
          for (var mediaIndex = 0; mediaIndex < mediaFiles.length; mediaIndex++) {
            var mediaResponse = await MineralBarApp.saveTicketWithMedia('Ticket.Edit', {
              ticket_id: ticketState.id,
              id: ticketState.id
            }, [mediaFiles[mediaIndex]]);
            var mediaOk = !!(mediaResponse && (
              Number(mediaResponse.success) === 1 || mediaResponse.success === true
            ));
            if (!mediaOk) throw new Error((mediaResponse && mediaResponse.message) || tr('err_failed'));
            if (Array.isArray(mediaResponse.files)) {
              returnedFiles = returnedFiles.concat(mediaResponse.files);
            }
          }

          function returnedFileUrl(fileName) {
            var match = returnedFiles.filter(function (file) {
              return String(file.original_name || file.file_name || '') === String(fileName);
            })[0];
            var value = match && (match.file_url || match.url || match.file_path) || '';
            return FieldApp.resolveMediaUrl(value);
          }
          requestPhotos = requestPhotos.map(function (photo) {
            var url = returnedFileUrl(photo.name);
            if (!url) return photo;
            return Object.assign({}, photo, {
              dataUrl: url,
              url: url,
              uploaded: true
            });
          });
          var signatureUrl = returnedFileUrl(signatureFileName) || signatureSource;
          var mediaManifest = {};
          requestPhotos.forEach(function (photo) {
            var kind = String(photo.kind || '').toLowerCase();
            var url = photo.url || photo.dataUrl || '';
            if ((kind === 'before' || kind === 'after') && url && !/^data:/i.test(url)) {
              mediaManifest[kind] = url;
            }
          });
          if (signatureUrl && !/^data:/i.test(signatureUrl)) {
            mediaManifest.signature = signatureUrl;
          }
          if (!mediaManifest.signature) throw new Error(tr('sign_upload_failed'));

          // Ticket.List returns messages but not a files array. Persist this
          // map so any device can restore the exact photos and signature.
          messageLines.push('BIZ1_MEDIA:' + JSON.stringify(mediaManifest));
          payload.messages = messageLines.join('\n');
          payload.message = payload.messages;

          var raw = await MineralBarApp.saveTicketWithMedia('Ticket.Edit', payload, []);
          var ok = !!(raw && (Number(raw.success) === 1 || raw.success === true));
          if (!ok) throw new Error((raw && raw.message) || tr('err_failed'));

          FieldApp.updateTicket(ticketState.id, {
            status: FieldApp.STATUS.closed,
            statusApi: FieldApp.statusToApi(FieldApp.STATUS.closed),
            subject: summary,
            summary: summary,
            signature: signatureUrl,
            spareParts: (ticketState.ticket.spareParts || []).slice(),
            productIds: productIds,
            photos: requestPhotos
          });
          draftSessionTicketId = null;
          ticketState.ticket = FieldApp.getTicket(ticketState.id);

          var successBodyEl = global.document.querySelector('#successOverlay [data-i18n="success_body"]');
          if (successBodyEl) {
            successBodyEl.textContent = tr('success_body');
            successBodyEl.setAttribute('data-i18n', 'success_body');
          }
          global.document.getElementById('waSuccess').href =
            FieldApp.whatsappSignedReport(ticketState.ticket);
          global.document.getElementById('successOverlay').classList.remove('hidden');
          renderComplete();
        } catch (err) {
          showFormError('completeFormError', (err && err.message) || tr('err_failed'));
        } finally {
          submitBtn.disabled = false;
          if (submitLabel) submitLabel.textContent = tr('complete_send');
        }
      });
    }

    var backSchedule = global.document.getElementById('successBackSchedule');
    if (backSchedule && !backSchedule.__bound) {
      backSchedule.__bound = true;
      backSchedule.addEventListener('click', function (e) {
        e.preventDefault();
        global.document.getElementById('successOverlay').classList.add('hidden');
        navigate('schedule');
      });
    }
  }

  async function loadTicketContext(params, options) {
    options = options || {};
    ticketState.id = params.id || null;
    draftSessionTicketId = ticketState.id;
    ticketState.hasStroke = false;
    ticketState.drawing = false;
    paintProfile();
    if (global.FieldApp) FieldApp.bindLiveChip();
    await FieldApp.ensureTickets();
    if (ticketState.id) {
      ticketState.ticket = FieldApp.getTicket(ticketState.id);
      if (!ticketState.ticket) ticketState.ticket = await FieldApp.fetchTicketById(ticketState.id);
      if (ticketState.ticket && FieldApp.syncTicketById) {
        var fresh = await FieldApp.syncTicketById(ticketState.id);
        if (fresh) ticketState.ticket = fresh;
      }
      if (ticketState.ticket && FieldApp.hydrateTicketMedia) {
        ticketState.ticket = await FieldApp.hydrateTicketMedia(ticketState.ticket);
      }
    }
    if (options.loadHistory && ticketState.ticket && ticketState.ticket.customerId) {
      ticketState.history = await FieldApp.fetchCustomerTicketHistory(
        ticketState.ticket.customerId,
        ticketState.id
      );
    } else if (!options.loadHistory) {
      ticketState.history = ticketState.history || [];
    }
    if (options.loadProducts && global.MineralBarApp && MineralBarApp.listProducts) {
      try {
        var prod = await MineralBarApp.listProducts({ active: 1, limit: 25 });
        ticketState.products = (prod.rows || []).map(function (p) {
          return {
            id: String(p.id || p.product_id || ''),
            name: String(p.product_name || p.name || p.title || ('#' + (p.id || '')))
          };
        }).filter(function (p) { return p.id; });
      } catch (e) {
        console.warn('[Complete] Products.List failed', e);
        ticketState.products = [];
      }
    }
  }

  async function activateTicket(params) {
    initTicket();
    await loadTicketContext(params, { loadHistory: true });
    renderTicket();
  }

  async function activateComplete(params) {
    initComplete();
    clearTicketSignatureCanvas();
    await loadTicketContext(params, { loadHistory: false, loadProducts: true });
    if (
      ticketState.ticket &&
      FieldApp.migrateStatus(ticketState.ticket.status) !== FieldApp.STATUS.closed &&
      FieldApp.clearTicketDraft
    ) {
      // Keep photos (uploaded) and spare parts; clear only unsigned draft summary/signature if empty session
      var summaryReset = global.document.getElementById('ticketSummary');
      if (summaryReset && !String(ticketState.ticket.summary || ticketState.ticket.subject || '')) {
        summaryReset.value = '';
      }
    }
    renderComplete();
  }

  /* ── Router ── */
  async function onRoute() {
    var route = parseRoute();
    var page = route.page;

    if (AUTH_ROUTES[page]) {
      var ok = await bootAuthenticated();
      if (!ok) {
        discardOpenTicketDraftSession();
        showView('login');
        initLogin();
        return;
      }
    }

    showView(page);

    if (page === 'login') {
      discardOpenTicketDraftSession();
      initLogin();
    } else if (page === 'schedule') {
      await activateSchedule();
    } else if (page === 'ticket') {
      await activateTicket(route.params);
    } else if (page === 'complete') {
      await activateComplete(route.params);
    } else {
      navigate(MineralBarApp.isAuthenticated() ? 'schedule' : 'login');
    }
  }

  function initEvents() {
    global.addEventListener('hashchange', onRoute);
    global.addEventListener('fieldapp:loading', function (e) {
      if (currentPage !== 'schedule') return;
      // Only show full-list loading on initial/manual loads — never wipe for incremental sync
      if (e.detail && e.detail.loading) setScheduleLoading(true);
      else {
        setScheduleLoading(false);
        renderSchedule();
      }
    });
    global.addEventListener('fieldapp:tickets', function (e) {
      var detail = (e && e.detail) || {};
      var mode = detail.mode || 'full';

      if (currentPage === 'schedule') {
        if (mode === 'upsert' && detail.ticket) {
          upsertScheduleCard(detail.ticket, !!detail.isNew);
          return;
        }
        if (mode === 'remove') {
          removeScheduleCard(detail.id || detail.number);
          return;
        }
        renderSchedule();
        return;
      }

      if (currentPage === 'ticket') {
        if (ticketState.id) ticketState.ticket = FieldApp.getTicket(ticketState.id);
        if (mode === 'full') renderTicket();
        else {
          renderTicketChecklist();
          updateTicketCompleteBtnVisibility(ticketState.ticket);
        }
      }
      if (currentPage === 'complete') {
        if (ticketState.id) ticketState.ticket = FieldApp.getTicket(ticketState.id);
        if (mode === 'full') renderComplete();
        else {
          renderTicketSpares();
          renderCompletePhotos();
          updateTicketCompleteBtnVisibility(ticketState.ticket);
        }
      }
    });
    global.addEventListener('mineralbar:lang', function () {
      if (currentPage === 'schedule') renderSchedule();
      if (currentPage === 'ticket') renderTicket();
      if (currentPage === 'complete') renderComplete();
    });
  }

  function init() {
    initEvents();
    initProfile();
    initLogin();
    initSchedule();
    initTicket();
    initComplete();
    paintProfile();
    if (!global.location.hash) {
      if (global.MineralBarApp && MineralBarApp.isAuthenticated && MineralBarApp.isAuthenticated()) {
        global.location.hash = 'schedule';
      } else {
        global.location.hash = 'login';
      }
    } else {
      onRoute();
    }
  }

  global.AppRouter = {
    navigate: navigate,
    parseRoute: parseRoute,
    init: init
  };

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);

