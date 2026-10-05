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
  var TOKEN_KEY = 'cloudplus_sdk_bearer_token';
  var LAST_EVENT_ID_KEY = 'cloudplus_realtime_last_event_id';
  var DEVICE_ID_KEY = 'cloudplus_realtime_device_id';

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
      throw new Error('Biz1 SDK requires domain, for example: https://eli.biz1.co.il');
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
 * API base: https://{user}.biz1.co.il
 */
(function (global) {
  'use strict';

  function normalizeTenantUser(raw) {
    var s = String(raw == null ? '' : raw).trim().toLowerCase();
    s = s.replace(/^https?:\/\//, '');
    s = s.replace(/\.biz1\.co\.il.*$/i, '');
    s = s.split('/')[0];
    s = s.replace(/[^a-z0-9-]/g, '');
    return s;
  }

  function resolveDomain() {
    var cfg = global.Biz1Config || {};
    var user = normalizeTenantUser(cfg.user || cfg.tenant || cfg.account);
    if (!user) {
      throw new Error('Set Biz1Config.user in assets/config.js (biz1 subdomain)');
    }
    return 'https://' + user + '.biz1.co.il';
  }

  function getTenantUser() {
    var cfg = global.Biz1Config || {};
    return normalizeTenantUser(cfg.user || cfg.tenant || cfg.account);
  }

  function getBrandName(lang) {
    var cfg = global.Biz1Config || {};
    var brand = cfg.brand || {};
    lang = lang || 'en';
    return brand[lang] || brand.en || brand.he || 'CloudPlus';
  }

  var DOMAIN = resolveDomain();
  var USER_KEY = 'cloudplus_user_basic';
  var ROLE_KEY = 'cloudplus_role';
  var EMAIL_KEY = 'cloudplus_email';
  var REMEMBER_KEY = 'cloudplus_remember';
  var CRED_KEY = 'cloudplus_cred';
  var SESSION_PASS_KEY = 'cloudplus_session_pass';
  var EXPIRES_KEY = 'cloudplus_token_expires_at';
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
    sales: 'tickets.html?filter=opened',
    service: 'tickets.html?filter=opened',
    tech: 'tickets.html?filter=opened'
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

  /** Ticket.Messages — CHAT panel rows for one ticket. */
  async function listTicketMessages(ticketId, extra) {
    var id = requireId(ticketId, 'ticket_id');
    var client = getClient();
    var raw = await client.request('Ticket.Messages', Object.assign({
      ticket_id: id,
      id: id
    }, extra || {}));
    var data = (raw && (raw.data || raw.messages || raw.output)) || [];
    if (!Array.isArray(data)) data = [];
    var rows = data.map(function (r) {
      var who = String((r && r.who) || '').toLowerCase();
      var type = String((r && r.type) || '').toLowerCase();
      var direction = (who === 'agent' || who === 'user' || who === 'staff' || type === 'only_member' || type === 'internal')
        ? 'out'
        : (who === 'customer' ? 'in' : 'in');
      if (who === 'agent') direction = 'out';
      return {
        message: String((r && (r.text || r.message || r.msg)) || '').trim(),
        user_name: String((r && (r.name || r.user_name || r.role)) || '').trim(),
        time: String((r && (r.time || r.create_date || r.date)) || '').trim(),
        direction: direction,
        who: who,
        type: type,
        file_url: String((r && (r.file_url || r.file || r.image)) || '').trim(),
        user_id: r && r.user_id,
        raw: r
      };
    });
    return {
      rows: rows,
      count: Number(raw && raw.count != null ? raw.count : rows.length),
      ticket_id: raw && (raw.ticket_id || id),
      raw: raw
    };
  }

  /**
   * Ticket.Reply — staff chat Send / Add chat.
   * data_type: public|normal (customer-visible) or only_member|internal.
   */
  async function replyTicketMessage(params) {
    var p = params || {};
    var id = requireId(p.ticket_id || p.id, 'ticket_id');
    var msg = String(p.message || p.msg || p.messages || '').trim();
    if (!msg) {
      var e = new Error('Missing required parameter: message');
      e.route = 'Ticket.Reply';
      throw e;
    }
    var dataType = String(p.data_type || p.visibility || p.msg_type || 'public').trim() || 'public';
    var client = getClient();
    var payload = {
      ticket_id: id,
      id: id,
      message: msg,
      messages: msg,
      data_type: dataType
    };
    var raw = await client.request('Ticket.Reply', payload);
    if (!(raw && (Number(raw.success) === 1 || raw.success === true || raw.output))) {
      var err = new Error((raw && (raw.message || raw.error)) || 'Ticket.Reply failed');
      err.route = 'Ticket.Reply';
      err.raw = raw;
      throw err;
    }
    return raw;
  }

  /** Ticket.Settings / Ticket.SettingsGet — org ticket settings. */
  async function getTicketSettings(extra) {
    var client = getClient();
    var raw = await client.request('Ticket.Settings', extra || {});
    var data = (raw && (raw.data || raw.output)) || {};
    if (typeof data !== 'object' || Array.isArray(data)) data = {};
    return {
      ticket_email_settings: Number(data.ticket_email_settings) === 1 ? 1 : 0,
      ticket_completion_reason_settings: Number(data.ticket_completion_reason_settings) === 1 ? 1 : 0,
      raw: raw,
      data: data
    };
  }

  /** Ticket.CompletionReasonList — completion reason dropdown options. */
  async function listTicketCompletionReasons(extra) {
    var client = getClient();
    var raw = await client.request('Ticket.CompletionReasonList', extra || {});
    var data = (raw && (raw.data || raw.output || raw.rows)) || [];
    if (!Array.isArray(data)) data = [];
    var he = false;
    try { he = String(document.documentElement.lang || '') === 'he'; } catch (e) { /* ignore */ }
    var rows = data.map(function (r) {
      var id = String((r && (r.id != null ? r.id : r.value)) || '').trim();
      var en = String((r && (r.name_en || r.en || r.label || r.name)) || '').trim();
      var heLab = String((r && (r.name_he || r.he || r.label || r.name)) || '').trim();
      return {
        id: id,
        label: he ? (heLab || en || id) : (en || heLab || id),
        labelEn: en || heLab || id,
        labelHe: heLab || en || id,
        color: (r && r.color) || '',
        raw: r
      };
    }).filter(function (r) { return r.id; });
    return { rows: rows, count: Number(raw && raw.count != null ? raw.count : rows.length), raw: raw };
  }

  /**
   * Ticket.Status — change status. Close = status 2.
   * When completion reasons ON: completion_reason_id OR completion_reason (manual, id 0).
   */
  async function setTicketStatus(params) {
    var p = params || {};
    var id = requireId(p.ticket_id || p.id, 'ticket_id');
    var status = p.status != null ? p.status : p.value;
    if (status == null || status === '') {
      var e = new Error('Missing required parameter: status');
      e.route = 'Ticket.Status';
      throw e;
    }
    var client = getClient();
    var payload = {
      ticket_id: id,
      id: id,
      status: status,
      value: status
    };
    if (p.completion_reason_id != null && String(p.completion_reason_id) !== '') {
      payload.completion_reason_id = p.completion_reason_id;
    }
    if (p.completion_reason != null && String(p.completion_reason).trim() !== '') {
      payload.completion_reason = String(p.completion_reason).trim();
    }
    var raw = await client.request('Ticket.Status', payload);
    if (!(raw && (Number(raw.success) === 1 || raw.success === true))) {
      var err = new Error((raw && (raw.message || raw.error)) || 'Ticket.Status failed');
      err.route = 'Ticket.Status';
      err.code = raw && raw.error;
      err.raw = raw;
      throw err;
    }
    return raw;
  }

  function extractTicketCount(res) {
    if (res == null) return 0;
    if (typeof res === 'number') return isFinite(res) && res >= 0 ? res : 0;
    if (typeof res === 'string' && res !== '' && isFinite(Number(res))) {
      var asNum = Number(res);
      return asNum >= 0 ? asNum : 0;
    }
    var candidates = [
      res.count, res.total, res.total_record, res.recordsTotal, res.recordsFiltered,
      res.query_count,
      typeof res.data === 'number' ? res.data : null,
      res.data && res.data.count, res.data && res.data.total,
      typeof res.output === 'number' ? res.output : null,
      res.output && res.output.count, res.output && res.output.total
    ];
    var i;
    var n;
    for (i = 0; i < candidates.length; i++) {
      if (candidates[i] == null || candidates[i] === '') continue;
      n = Number(candidates[i]);
      if (isFinite(n) && n >= 0) return n;
    }
    return 0;
  }

  async function countTickets(extra) {
    var client = getClient();
    var raw = await client.request('Ticket.Count', extra || {});
    return { count: extractTicketCount(raw), raw: raw };
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
    else if (raw && raw.output && Array.isArray(raw.output.data)) rows = raw.output.data;
    return { raw: raw, rows: rows };
  }

  /**
   * Products.List max 25/call — page until all active products are loaded.
   * Returns { rows, total } with deduped catalog sorted by name.
   */
  async function listAllProducts(extra) {
    extra = extra || {};
    var client = getClient();
    var pageSize = Number(extra.length || extra.limit) || 25;
    if (pageSize > 25) pageSize = 25;
    var all = [];
    var seen = {};
    var totalHint = 0;
    var base = Object.assign({ active: 1 }, extra);
    delete base.start;
    delete base.offset;
    delete base.limit;
    delete base.length;
    delete base.draw;

    try {
      var countRes = await client.request('Products.Count', { active: base.active != null ? base.active : 1 });
      totalHint = Number(
        (countRes && (countRes.count != null ? countRes.count
          : (countRes.total != null ? countRes.total
            : (countRes.recordsTotal != null ? countRes.recordsTotal : 0)))) || 0
      );
      if (!isFinite(totalHint) || totalHint < 0) totalHint = 0;
    } catch (eCount) {
      totalHint = 0;
    }

    var maxPages = totalHint > 0 ? Math.ceil(totalHint / pageSize) + 2 : 80;
    for (var page = 0; page < maxPages; page++) {
      var start = page * pageSize;
      var pageRes = await listProducts(Object.assign({}, base, {
        limit: pageSize,
        length: pageSize,
        per_page: pageSize,
        start: start,
        offset: start,
        draw: page + 1
      }));
      var raw = pageRes.raw;
      if (raw && (raw.recordsTotal != null || raw.recordsFiltered != null) && !totalHint) {
        totalHint = Number(raw.recordsFiltered != null ? raw.recordsFiltered : raw.recordsTotal) || 0;
        if (totalHint > 0) maxPages = Math.ceil(totalHint / pageSize) + 2;
      }
      var rows = pageRes.rows || [];
      if (!rows.length) break;
      for (var i = 0; i < rows.length; i++) {
        var p = rows[i];
        if (!p) continue;
        var id = String(p.id || p.product_id || p.ID || '').trim();
        if (!id || id === '0' || seen[id]) continue;
        seen[id] = true;
        all.push(p);
      }
      if (rows.length < pageSize) break;
      if (totalHint > 0 && all.length >= totalHint) break;
    }

    all.sort(function (a, b) {
      var an = String(a.product_name || a.name || a.title || '');
      var bn = String(b.product_name || b.name || b.title || '');
      return an.localeCompare(bn, undefined, { sensitivity: 'base' });
    });
    return { rows: all, total: all.length };
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
    payload = sanitizeTicketCustomFields(payload || {});
    var form = new FormData();
    Object.keys(payload || {}).forEach(function (key) {
      var value = payload[key];
      if (value === undefined || value === null) return;
      if (key === 'custom_fields') {
        var cf = value;
        if (typeof cf === 'string') {
          try { cf = JSON.parse(cf); } catch (eCf) { cf = null; }
        }
        if (cf && typeof cf === 'object' && !Array.isArray(cf)) {
          Object.keys(cf).forEach(function (ck) {
            if (!/^a-\d+$/.test(ck)) return;
            if (cf[ck] === undefined || cf[ck] === null || cf[ck] === '') return;
            form.append(ck, String(cf[ck]));
          });
          form.append('custom_fields', JSON.stringify(cf));
        }
        return;
      }
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

  /* ── Ticket custom fields: dashboard ids only (a-{numeric_id}) ── */
  var ticketCustomFieldsCache = null;
  var ticketCustomFieldsPromise = null;

  var TICKET_FIELD_LABELS = {
    closing_status: { aliases: ['closing_status', 'close_status', 'closing status'], fallback: 'a-1787203258', legacy: ['a-1787143997'] },
    cash_collected: { aliases: ['cash_collected', 'cashcollected', 'cash', 'take_cash', 'take cash', 'collect_cash'], fallback: 'a-1787203265', legacy: ['a-1787144046'] },
    cash_amount: { aliases: ['cash_amount', 'cashamount', 'cash amount'], fallback: 'a-1787203267', legacy: ['a-1787144048'] },
    warranty_months: { aliases: ['warranty_months', 'warrantymonths', 'warranty months'], fallback: 'a-1787203262', legacy: ['a-1787143998'] },
    installer_name: { aliases: ['installer_name', 'installername', 'technician_name', 'installer'], fallback: 'a-1787203260', legacy: ['a-1787143967'] },
    closing_reason: { aliases: ['closing_reason', 'close_reason', 'closing reason'], fallback: 'a-1787204474', legacy: ['a-1787203994', 'a-1787203269', 'a-1787144050'] },
    followup_reason: { aliases: ['followup_reason', 'follow_up_reason', 'follow-up reason'], fallback: 'a-1787204476' },
    department: { aliases: ['department', 'ticket_department', 'choose_department', 'מחלקה'] }
  };

  function isDashboardTicketFieldId(name) {
    return /^a-\d+$/.test(String(name || '').trim());
  }

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
    if (!field || typeof field !== 'object') return '';
    var candidates = [
      field.update_field_name,
      field.field_name,
      field.storage_name,
      field.form_name,
      field.name,
      field.key,
      field.id
    ];
    var i;
    var name;
    for (i = 0; i < candidates.length; i++) {
      if (candidates[i] == null || candidates[i] === '') continue;
      name = String(candidates[i]).trim();
      if (isDashboardTicketFieldId(name)) return name;
    }
    var id = field.id != null ? String(field.id).trim() : '';
    if (/^\d{6,}$/.test(id)) return 'a-' + id;
    return '';
  }

  function ticketFieldBlob(field) {
    if (!field) return '';
    return [
      field.en, field.he, field.label, field.label_en, field.label_he,
      field.name, field.type, field.field_name, field.update_field_name
    ].map(function (x) { return String(x == null ? '' : x).toLowerCase(); }).join(' ');
  }

  function ticketFieldLabel(field) {
    return String((field && (field.en || field.label_en || field.label || field.he || '')) || '')
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, '_');
  }

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
    if (en === 'cash' || en === 'take_cash' || en === 'take cash' || en === 'collect_cash' || en === 'cash_collected') score += 100;
    if (he === 'cash' || he === 'מזומן') score += 80;
    if (type === 'radio' && field.yes_val != null && field.no_val != null && String(field.yes_val) !== '') score += 40;
    if (type === 'yes_no' || /^yes.?no$/.test(type)) score += 30;
    if (/(^|[^a-z])cash([^a-z]|$)|take.?cash|collect.?cash/.test(blob)) score += 20;
    if (/מזומן/.test(blob)) score += 20;
    return score;
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
      try { return splitTicketOptionList(JSON.parse(s)); } catch (e) { /* fall through */ }
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
        out.push({ value: String(v), label: enLab, labelEn: enLab, labelHe: heLab });
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
        out.push({ value: value, label: labelHe, labelEn: labelEn, labelHe: labelHe });
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
        if (row == null || typeof row !== 'object') return;
        var k = row.key || row.name || row.field || row.field_name || row.update_field_name || row.id;
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
    if (ticket.raw) {
      merge(ticket.raw.custom_fields);
      merge(ticket.raw.extra_fields);
    }
    Object.keys(ticket).forEach(function (k) {
      if (!isDashboardTicketFieldId(k)) return;
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

  function ticketNotesBlob(ticket) {
    if (!ticket || typeof ticket !== 'object') return '';
    var raw = ticket.raw || ticket;
    var parts = [];
    function push(v) {
      if (v == null || v === '') return;
      if (Array.isArray(v)) { v.forEach(push); return; }
      if (typeof v === 'object') {
        push(v.message || v.msg || v.text || v.note || v.content || v.body);
        return;
      }
      parts.push(String(v));
    }
    push(raw.messages);
    push(raw.message);
    push(raw.notes);
    push(raw.note);
    push(ticket.summary);
    return parts.join('\n');
  }

  function isCashYesValue(raw, field) {
    if (raw == null || raw === '') return false;
    if (Array.isArray(raw)) raw = raw.length ? raw[0] : '';
    var s = String(raw).trim();
    if (!s) return false;
    if (field && field.yes_val != null && String(field.yes_val) !== '') {
      if (s === String(field.yes_val) || s.indexOf(String(field.yes_val)) === 0) return true;
      if (field.no_val != null && String(field.no_val) !== '' &&
          (s === String(field.no_val) || s.indexOf(String(field.no_val)) === 0)) return false;
    }
    var lower = s.toLowerCase();
    if (/^(no|false|לא|n)\b/i.test(lower)) return false;
    return /^(yes|1|true|כן|y)\b/i.test(lower) || /\byes\b/i.test(lower);
  }

  function isTicketCashYes(ticket) {
    var field = pickBestCashTicketField(ticketCustomFieldsCache || []);
    var name = ticketFieldStorageName(field) || labeledFieldStorageName('cash_collected');
    var raw = name ? readTicketStorageValue(ticket, name) : '';
    if (!raw) {
      var bag = ticketCustomFieldBag(ticket);
      raw = bag.cash || bag.take_cash || bag.takeCash || bag.collect_cash || bag.cash_collected || '';
      if (Array.isArray(raw)) raw = raw.length ? raw[0] : '';
      raw = raw == null ? '' : String(raw).trim();
    }
    if (!raw) {
      var notes = ticketNotesBlob(ticket);
      var m = notes.match(/Take cash(?: from the customer)?:\s*([^\n]+)/i)
        || notes.match(/Cash collected:\s*([^\n]+)/i)
        || notes.match(/גביית מזומן\s*[:：]\s*([^\n]+)/);
      if (m && m[1]) raw = String(m[1]).trim();
    }
    if (isCashYesValue(raw, field)) return true;
    var amountRaw = readTicketLabeledField(ticket, 'cash_amount');
    if (!amountRaw) {
      var am = ticketNotesBlob(ticket).match(
        /(?:Service fee(?: amount)?|Cash amount|סכום דמי שירות|דמי שירות)\s*[:：]\s*([0-9]+(?:\.[0-9]+)?)/i
      );
      if (am && am[1]) amountRaw = am[1];
    }
    if (Number(String(amountRaw || '').replace(/[^\d.]/g, '')) > 0) {
      if (!/^(no|false|לא)\b/i.test(String(raw || '').trim())) return true;
    }
    return false;
  }

  async function applyTicketCashField(payload, yesNo) {
    payload = payload || {};
    var field = await resolveTicketCashField();
    var name = ticketFieldStorageName(field);
    if (!name) return sanitizeTicketCustomFields(payload);
    var val = pickCashYesNoValue(field, yesNo);
    if (!val) return sanitizeTicketCustomFields(payload);
    if (!payload.custom_fields || typeof payload.custom_fields !== 'object') payload.custom_fields = {};
    payload.custom_fields[name] = val;
    payload[name] = val;
    if (payload.cash !== undefined) delete payload.cash;
    if (payload.take_cash !== undefined) delete payload.take_cash;
    return sanitizeTicketCustomFields(payload);
  }

  function findTicketFieldByLabel(label) {
    var spec = TICKET_FIELD_LABELS[label] || { aliases: [label] };
    var aliases = (spec.aliases || [label]).map(function (a) {
      return String(a).toLowerCase().trim().replace(/[\s-]+/g, '_');
    });
    var fields = ticketCustomFieldsCache || [];
    var i;
    var field;
    var en;
    var name;
    for (i = 0; i < fields.length; i++) {
      field = fields[i];
      if (!ticketFieldStorageName(field)) continue;
      en = ticketFieldLabel(field);
      name = String((field && field.name) || '').toLowerCase().replace(/^a-/, '').replace(/[\s-]+/g, '_');
      if (aliases.indexOf(en) !== -1 || aliases.indexOf(name) !== -1) return field;
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

  function mapLabeledValueToOption(label, val) {
    var stored = String(val == null ? '' : val).trim();
    if (!stored) return '';
    if (label === 'cash_collected') {
      var cashField = pickBestCashTicketField(ticketCustomFieldsCache || []) || findTicketFieldByLabel(label);
      var mapped = pickCashYesNoValue(cashField, stored);
      if (mapped) return mapped;
    }
    var field = findTicketFieldByLabel(label);
    var opts = collectTicketFieldOptions(field);
    if (!opts.length) return stored;
    var lower = stored.toLowerCase();
    var i;
    var o;
    for (i = 0; i < opts.length; i++) {
      o = opts[i];
      if (String(o.value) === stored) return String(o.value);
      if (String(o.labelEn || '').toLowerCase() === lower) return String(o.value);
      if (String(o.labelHe || '') === stored) return String(o.value);
      if (String(o.label || '').toLowerCase() === lower) return String(o.value);
    }
    return stored;
  }

  function stripTicketLabelKeys(payload) {
    if (!payload) return payload;
    var cf = payload.custom_fields;
    Object.keys(TICKET_FIELD_LABELS).forEach(function (label) {
      var aliases = (TICKET_FIELD_LABELS[label].aliases || [label]).concat([label, 'closing_reason_id']);
      aliases.forEach(function (k) {
        if (cf && Object.prototype.hasOwnProperty.call(cf, k)) delete cf[k];
        if (Object.prototype.hasOwnProperty.call(payload, k) && !isDashboardTicketFieldId(k)) delete payload[k];
      });
    });
    return sanitizeTicketCustomFields(payload);
  }

  function sanitizeTicketCustomFields(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    var cf = payload.custom_fields;
    if (cf && typeof cf === 'object' && !Array.isArray(cf)) {
      Object.keys(cf).forEach(function (k) {
        if (!isDashboardTicketFieldId(k)) delete cf[k];
      });
    }
    Object.keys(payload).forEach(function (k) {
      if (/^a-/.test(k) && !isDashboardTicketFieldId(k)) delete payload[k];
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
      if (!name || !isDashboardTicketFieldId(name)) return;
      var stored = mapLabeledValueToOption(label, val);
      if (!stored) return;
      payload.custom_fields[name] = stored;
      payload[name] = stored;
    });
    return stripTicketLabelKeys(payload);
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
    countTickets: countTickets,
    listTicketMessages: listTicketMessages,
    replyTicketMessage: replyTicketMessage,
    getTicketSettings: getTicketSettings,
    listTicketCompletionReasons: listTicketCompletionReasons,
    setTicketStatus: setTicketStatus,
    listTicketCustomFields: listTicketCustomFields,
    getTicketCustomField: getTicketCustomField,
    collectTicketFieldOptions: collectTicketFieldOptions,
    listTicketLabeledFieldOptions: listTicketLabeledFieldOptions,
    listClosingStatusOptions: listClosingStatusOptions,
    listClosingReasonOptions: listClosingReasonOptions,
    resolveTicketCashField: resolveTicketCashField,
    applyTicketCashField: applyTicketCashField,
    cachedTicketCashFieldName: cachedTicketCashFieldName,
    isTicketCashYes: isTicketCashYes,
    applyTicketLabeledCustomFields: applyTicketLabeledCustomFields,
    readTicketLabeledField: readTicketLabeledField,
    ticketFieldStorageName: ticketFieldStorageName,
    isDashboardTicketFieldId: isDashboardTicketFieldId,
    sanitizeTicketCustomFields: sanitizeTicketCustomFields,
    listDocuments: listDocuments,
    listProducts: listProducts,
    listAllProducts: listAllProducts,
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

  var LANG_KEY = 'cloudplus_lang';
  var DEFAULT_LANG = 'en';

  function brandName(lang) {
    try {
      if (global.MineralBarApp && MineralBarApp.getBrandName) {
        return MineralBarApp.getBrandName(lang || DEFAULT_LANG);
      }
    } catch (e) { /* ignore */ }
    var cfg = global.Biz1Config && Biz1Config.brand;
    if (cfg && (cfg[lang] || cfg.en)) return cfg[lang] || cfg.en;
    return 'CloudPlus';
  }

  var STRINGS = {
    en: {
      brand: 'CloudPlus',
      login_subtitle: 'Login to the management system',
      account_login: 'Login to the account',
      email_label: 'Email / Username',
      login_identifier_label: 'Username / Email / Phone / ID',
      login_identifier_placeholder: 'username, email, phone or ID',
      password_label: 'password',
      password_placeholder: 'Enter a password',
      otp_label: 'verification code (OTP)',
      otp_placeholder: 'Enter a code',
      remember_me: 'remember me',
      login_btn: 'connect',
      login_btn_otp: 'Verify and connect',
      logging_in: 'Connecting…',
      verifying: 'Verifying…',
      refreshing: 'Refreshing session…',
      team_users: 'Demo users',
      role_tech: 'Technician',
      role_service: 'Service',
      role_sales: 'Sales',
      demo_credentials: 'Demo Credentials',
      login_as_demo_user: 'Login As Demo User',
      footer_crm: 'CloudPlus · Tickets',
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
      page_login_title: 'CloudPlus — Sign in',
      live_socket_on: 'Live Socket',
      live_socket_off: 'Socket Off',
      my_schedule: 'Service tickets',
      schedule_sub: 'All tickets for this user',
      tickets_page_title: 'Service tickets',
      all_tickets: 'All tickets',
      open_tickets: 'Open tickets',
      closed_tickets: 'Closed tickets',
      my_tickets: 'My tickets',
      assigned_tickets: 'Assigned tickets',
      dash_total: 'Total tickets',
      dash_open: 'Open tickets',
      dash_closed: 'Closed tickets',
      dash_mine: 'My tickets',
      pager_prev: 'Previous',
      pager_next: 'Next',
      mark_all: 'Mark all',
      unmark_all: 'Unmark all',
      cancel_search: 'Cancel',
      waiting_time: 'Waiting time:',
      wait_over_3: 'over 3 days',
      wait_1_3: '1–3 days',
      wait_today: 'until today',
      wait_n_days: 'Waiting {n} days',
      wait_0_days: 'Waiting 0 days',
      wait_1_day: 'Waiting 1 day',
      ticket_details: 'Ticket details',
      filter_open_ticket: 'Open ticket',
      filter_close_ticket: 'Close ticket',
      filter_my_tickets: 'My tickets',
      call_customer: 'Call customer',
      nav_home: 'Home',
      nav_service: 'Service',
      nav_messages: 'Messages',
      nav_inventory: 'Inventory',
      nav_customers: 'Customers',
      nav_tasks: 'Tasks',
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
      required: '*',
      page_ticket_details_title: 'Ticket details',
      page_ticket_close_title: 'Close Ticket',
      close_call: 'Close Ticket',
      close_ticket_title: 'Close Ticket',
      close_ticket_btn: 'Close ticket',
      completion_reason: 'Completion reason',
      add_manual: 'Add manual',
      manual_reason: 'Manual reason',
      manual_reason_ph: 'Write the completion reason…',
      err_completion_reason: 'Please select a completion reason.',
      err_manual_reason: 'Please write the completion reason.',
      ticket_closed: 'Ticket closed successfully.',
      back_to_tickets: 'Back to tickets',
      chat_needs_ticket: 'Ticket is missing — cannot chat',
      view_ticket: 'View ticket',
      source_label: 'Source',
      priority: 'Priority',
      waiting_time_short: 'Waiting time',
      wait_today_short: 'Today',
      prio_urgent: 'Urgent',
      prio_normal: 'Regular',
      prio_low: 'Low',
      call_status_toschedule: 'To schedule',
      call_status_scheduled: 'Scheduled',
      call_status_inprogress: 'In progress',
      call_status_done: 'Done',
      service_fee: 'Service fee',
      yes: 'Yes',
      no: 'No',
      none_label: 'None',
      closing_details: 'Closing details',
      closing_status: 'Closing status',
      closing_status_required: 'Please select a closing status',
      closing_status_ph: 'Type or choose closing status…',
      followup_reason: 'Follow-up reason',
      followup_reason_required: 'Please select a reason',
      followup_reason_ph: 'Type or choose a reason…',
      select_reason: 'Select a reason',
      reason_other: 'Specify the reason',
      reason_other_ph: 'Describe the follow-up',
      reason_saturday: 'Saturday unit',
      reason_wrong_model: 'Wrong model',
      reason_extra_sale: 'Additional sale',
      closing_reason_label: 'Reason',
      closing_reason_ph: 'Enter the reason…',
      closing_reason_required: 'Please enter a reason',
      warranty_months: 'Warranty (months)',
      linked_product: 'Linked product',
      no_linked_product: 'No product linked to this ticket',
      add_product: 'Add product',
      add: 'Add',
      product_added: 'Product added to ticket',
      err_select_product: 'Please select a product',
      ticket_chat: 'Chat',
      no_chat_messages: 'No messages yet',
      chat_needs_customer: 'Customer is missing — cannot chat',
      chat_placeholder: 'Write a message…',
      send_message: 'Send',
      chat_sending: 'Sending…',
      chat_send_failed: 'Message could not be sent',
      problem_description: 'Description of the problem',
      pictures_attached: 'Pictures attached',
      no_pictures: 'No pictures were attached to the call',
      assigned_rep: 'Associated service representative',
      assigned_technician: 'Assigned Technician',
      created_on: 'Created on',
      scheduled_for: 'Scheduled for',
      last_updated_by: 'Last updated by',
      close_ticket_btn: 'Close ticket',
      edit_ticket: 'Edit ticket',
      delete_ticket: 'Delete ticket',
      reassign_tech: 'Re-assign technician',
      confirm_delete_ticket: 'Delete this ticket? This cannot be undone.',
      ticket_deleted: 'Ticket deleted.',
      ticket_updated: 'Ticket updated successfully.',
      ticket_assigned: 'Technician assigned successfully.',
      page_ticket_edit_title: 'Edit ticket',
      page_ticket_assign_title: 'Associate a call to a technician',
      associate_tech_title: 'Associate a call to a technician',
      choosing_technician: 'Choosing a technician',
      select_technician: 'Select Technician',
      err_select_technician: 'Please select a technician.',
      save_ticket: 'Save changes',
      more_actions: 'More actions',
      no_team_members: 'No team members found',
      close_status_done: 'Successfully completed',
      close_status_followup: 'Handle later',
      close_status_followup_hint: 'Saturday unit / wrong model / additional sale',
      close_status_noanswer: 'No answer',
      close_status_notdone: 'Not performed',
      close_status_lab: 'Sent to lab',
      digital_form: 'Digital service form',
      phone_label: 'Phone',
      customer_id: 'Customer ID',
      installer: 'Installer',
      product_installed: 'Product installed',
      filters_replaced: 'Filters replaced',
      value_label: 'Value',
      add_another_product: 'Add another product',
      extra_photo: 'Another picture',
      cash_collected_q: 'Cash collected?',
      cash_amount: 'Amount collected',
      terms_label: 'Customer approved terms',
      terms_sub: 'The customer confirms the work described above.',
      terms_required: 'Please confirm the terms',
      signature_required: 'Please sign',
      work_summary_required: 'Please describe the work',
      complete_required: 'Complete required fields to close',
      hotline_text: 'For any issue after the visit, the customer can call the service hotline.',
      send_copy: 'Send a copy to the customer',
      send_copy_sub: 'WhatsApp copy of the closed ticket',
      chip_filters: 'Filters replaced',
      chip_install: 'Installation performed',
      chip_pressure: 'Pressure test performed',
      chip_cleaned: 'System cleaned',
      new_ticket: 'Add Ticket',
      page_ticket_add_title: 'Add Ticket',
      add_ticket_title: 'Add Ticket',
      add_ticket_sub: 'New service call',
      select_customer: 'Select customer',
      search_customers: 'Search by name, phone or address',
      no_customers: 'No customers found',
      section_customer: 'CUSTOMER',
      section_ticket: 'TICKET',
      section_problem: 'PROBLEM',
      customer_name: 'Customer Name',
      customer_name_ph: 'Type a customer name',
      ticket_name: 'Ticket Name',
      ticket_name_ph: 'Ticket Name',
      customer_email: 'Customer email',
      mobile_label: 'Mobile',
      urgency: 'URGENCY',
      team_member: 'Team member',
      product_label: 'Product',
      choose_department: 'CHOOSE DEPARTMENT',
      choose_option: 'Choose',
      add_btn: 'Add',
      files_image: 'Files (image)',
      files_image_hint: 'Drop or choose an image - accept image/* - one file',
      problem_note_ph: 'Enter Note. You can paste an image.',
      reset: 'Reset',
      cancel: 'Cancel',
      submit: 'Submit',
      reading_type: 'Call type',
      related_product: 'Related product',
      due_date: 'Due date',
      priority: 'Priority',
      prio_high: 'Urgent',
      from_time: 'From',
      to_time: 'To',
      problem_label: 'Problem',
      problem_ph: 'Describe the problem…',
      address_photo: 'Address and photo',
      street: 'Street',
      building: 'Building number',
      city: 'City',
      entrance: 'Entrance',
      floor: 'Floor',
      apartment: 'Apartment',
      delivery_address: 'Address',
      photo_optional: 'Optional',
      photo_attach: 'Attach a photo',
      assign_tech: 'Assign technician',
      clear_selection: 'Clear',
      take_cash: 'Collect service fee?',
      cash_amount_label: 'Service fee amount',
      create_ticket: 'Open ticket',
      ticket_created: 'Ticket created successfully.',
      err_select_customer: 'Please select a customer.',
      err_select_type: 'Select a call type.',
      err_topic_required: 'Topic is required.',
      err_department_required: 'Please choose a department.',
      err_problem_required: 'Problem description is required.',
      err_address_required: 'Address is required.',
      topic_label: 'Topic',
      topic_ph: 'Enter topic…',
      no_ticket_types: 'No ticket types found',
      type_tech: 'Technical service',
      type_center: 'Installing a water softener',
      type_bidet: 'Electric bidet installation',
      type_mainbar: 'Installing a main bar',
      type_waterbar: 'Installing a water bar',
      type_under: 'Under-sink system',
      type_filter: 'Filter replacement',
      type_undergrind: 'Under sink + grinder',
      type_disposal: 'Installing a garbage disposer'
    },
    he: {
      brand: 'קלאודפלוס',
      login_subtitle: 'התחברות למערכת הניהול',
      account_login: 'התחברות לחשבון',
      email_label: 'אימייל / שם משתמש',
      login_identifier_label: 'שם משתמש / אימייל / טלפון / מזהה',
      login_identifier_placeholder: 'שם משתמש, אימייל, טלפון או מזהה',
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
      footer_crm: 'קלאודפלוס · קריאות',
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
      page_login_title: 'קלאודפלוס — התחברות',
      live_socket_on: 'שידור חי',
      live_socket_off: 'מנותק',
      my_schedule: 'קריאות שירות',
      schedule_sub: 'כל הקריאות של המשתמש',
      tickets_page_title: 'קריאות שירות',
      all_tickets: 'כל הקריאות',
      open_tickets: 'קריאות פתוחות',
      closed_tickets: 'קריאות סגורות',
      my_tickets: 'הקריאות שלי',
      assigned_tickets: 'קריאות משובצות',
      dash_total: 'סה״כ קריאות',
      dash_open: 'קריאות פתוחות',
      dash_closed: 'קריאות סגורות',
      dash_mine: 'שלי',
      pager_prev: 'הקודם',
      pager_next: 'הבא',
      mark_all: 'סמן הכל',
      unmark_all: 'בטל סימון',
      cancel_search: 'ביטול',
      waiting_time: 'זמן המתנה:',
      wait_over_3: 'מעל 3 ימים',
      wait_1_3: '1–3 ימים',
      wait_today: 'עד היום',
      wait_n_days: 'ממתין {n} ימים',
      wait_0_days: 'ממתין 0 ימים',
      wait_1_day: 'ממתין 1 יום',
      ticket_details: 'פרטי קריאה',
      filter_open_ticket: 'קריאה פתוחה',
      filter_close_ticket: 'קריאה סגורה',
      filter_my_tickets: 'הקריאות שלי',
      call_customer: 'חייג ללקוח',
      nav_home: 'בית',
      nav_service: 'שירות',
      nav_messages: 'הודעות',
      nav_inventory: 'מלאי',
      nav_customers: 'לקוחות',
      nav_tasks: 'משימות',
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
      required: '*',
      page_ticket_details_title: 'פרטי קריאה',
      page_ticket_close_title: 'סגירת טיקט',
      close_call: 'סגירת טיקט',
      close_ticket_title: 'סגירת טיקט',
      view_ticket: 'צפייה בטיקט',
      source_label: 'מקור',
      priority: 'עדיפות',
      waiting_time_short: 'זמן המתנה',
      wait_today_short: 'היום',
      prio_urgent: 'דחוף',
      prio_normal: 'רגיל',
      prio_low: 'נמוך',
      call_status_toschedule: 'לתיאום',
      call_status_scheduled: 'מתוזמן',
      call_status_inprogress: 'בטיפול',
      call_status_done: 'הושלמה',
      service_fee: 'דמי שירות',
      yes: 'כן',
      no: 'לא',
      none_label: 'אין',
      closing_details: 'פרטי סגירה',
      closing_status: 'סטטוס סיום',
      closing_status_required: 'נא לבחור סטטוס סיום',
      closing_status_ph: 'הקלד או בחר סטטוס סיום…',
      followup_reason: 'סיבת המשך הטיפול',
      followup_reason_required: 'נא לבחור סיבה',
      followup_reason_ph: 'הקלד או בחר סיבה…',
      select_reason: 'בחר סיבה',
      reason_other: 'פרט את הסיבה',
      reason_other_ph: 'תאר את המשך הטיפול',
      reason_saturday: 'יחידת שבת',
      reason_wrong_model: 'דגם שגוי',
      reason_extra_sale: 'מכירה נוספת',
      closing_reason_label: 'סיבה',
      closing_reason_ph: 'הזן את הסיבה…',
      closing_reason_required: 'נא להזין סיבה',
      completion_reason: 'סיבת סיום',
      add_manual: 'הוסף ידנית',
      manual_reason: 'סיבה ידנית',
      manual_reason_ph: 'כתוב את סיבת הסיום…',
      err_completion_reason: 'נא לבחור סיבת סיום.',
      err_manual_reason: 'נא לכתוב את סיבת הסיום.',
      ticket_closed: 'הטיקט נסגר בהצלחה.',
      back_to_tickets: 'חזרה לקריאות',
      chat_needs_ticket: 'חסר טיקט — לא ניתן לשלוח הודעה',
      warranty_months: 'אחריות (חודשים)',
      linked_product: 'מוצר משויך',
      no_linked_product: 'לא משויך מוצר לטיקט זה',
      add_product: 'הוסף מוצר',
      add: 'הוסף',
      product_added: 'המוצר נוסף לטיקט',
      err_select_product: 'נא לבחור מוצר',
      ticket_chat: 'צ׳אט',
      no_chat_messages: 'אין הודעות עדיין',
      chat_needs_customer: 'חסר לקוח — לא ניתן לשלוח הודעה',
      chat_placeholder: 'כתוב הודעה…',
      send_message: 'שלח',
      chat_sending: 'שולח…',
      chat_send_failed: 'שליחת ההודעה נכשלה',
      problem_description: 'תיאור הבעיה',
      pictures_attached: 'תמונות מצורפות',
      no_pictures: 'לא צורפו תמונות לקריאה',
      assigned_rep: 'נציג שירות משויך',
      assigned_technician: 'טכנאי משובץ',
      created_on: 'נוצר ב',
      scheduled_for: 'מתוזמן ל',
      last_updated_by: 'עודכן לאחרונה ע״י',
      close_ticket_btn: 'סגור טיקט',
      edit_ticket: 'עריכת טיקט',
      delete_ticket: 'מחיקת טיקט',
      reassign_tech: 'שיבוץ מחדש לטכנאי',
      confirm_delete_ticket: 'למחוק את הטיקט? לא ניתן לבטל פעולה זו.',
      ticket_deleted: 'הטיקט נמחק.',
      ticket_updated: 'הטיקט עודכן בהצלחה.',
      ticket_assigned: 'הטכנאי שובץ בהצלחה.',
      page_ticket_edit_title: 'עריכת טיקט',
      page_ticket_assign_title: 'שיוך קריאה לטכנאי',
      associate_tech_title: 'שיוך קריאה לטכנאי',
      choosing_technician: 'בחירת טכנאי',
      select_technician: 'בחירת טכנאי',
      err_select_technician: 'נא לבחור טכנאי.',
      save_ticket: 'שמירת שינויים',
      more_actions: 'פעולות נוספות',
      no_team_members: 'לא נמצאו חברי צוות',
      close_status_done: 'הושלם בהצלחה',
      close_status_followup: 'לטיפול בהמשך',
      close_status_followup_hint: 'יחידת שבת / דגם שגוי / מכירה נוספת',
      close_status_noanswer: 'אין מענה',
      close_status_notdone: 'לא בוצע',
      close_status_lab: 'נשלח למעבדה',
      digital_form: 'טופס שירות דיגיטלי',
      phone_label: 'טלפון',
      customer_id: 'מזהה לקוח',
      installer: 'מתקין',
      product_installed: 'מוצר שהותקן',
      filters_replaced: 'מסננים שהוחלפו',
      value_label: 'ערך',
      add_another_product: 'הוסף מוצר נוסף',
      extra_photo: 'תמונה נוספת',
      cash_collected_q: 'נגבה מזומן?',
      cash_amount: 'סכום שנגבה',
      terms_label: 'הלקוח אישר את התנאים',
      terms_sub: 'הלקוח מאשר את העבודה המתוארת לעיל.',
      terms_required: 'נא לאשר את התנאים',
      signature_required: 'נא לחתום',
      work_summary_required: 'נא לתאר את העבודה',
      complete_required: 'השלם שדות חובה לסגירה',
      hotline_text: 'לכל בעיה לאחר הביקור הלקוח יכול להתקשר למוקד השירות.',
      send_copy: 'שלח עותק ללקוח',
      send_copy_sub: 'עותק וואטסאפ של הקריאה שנסגרה',
      chip_filters: 'הוחלפו סננים',
      chip_install: 'בוצעה התקנה',
      chip_pressure: 'בוצעה בדיקת לחץ',
      chip_cleaned: 'נוקתה המערכת',
      new_ticket: 'הוסף כרטיס',
      page_ticket_add_title: 'הוסף כרטיס',
      add_ticket_title: 'הוסף כרטיס',
      add_ticket_sub: 'קריאת שירות חדשה',
      select_customer: 'בחר לקוח',
      search_customers: 'חיפוש לפי שם, טלפון או כתובת',
      no_customers: 'לא נמצאו לקוחות',
      section_customer: 'לקוח',
      section_ticket: 'כרטיס',
      section_problem: 'בעיה',
      customer_name: 'שם לקוח',
      customer_name_ph: 'הקלד שם לקוח',
      ticket_name: 'שם כרטיס',
      ticket_name_ph: 'שם כרטיס',
      customer_email: 'דוא״ל לקוח',
      mobile_label: 'נייד',
      urgency: 'דחיפות',
      team_member: 'חבר צוות',
      product_label: 'מוצר',
      choose_department: 'בחר מחלקה',
      choose_option: 'בחר',
      add_btn: 'הוסף',
      files_image: 'קבצים (תמונה)',
      files_image_hint: 'גרור או בחר תמונה - image/* - קובץ אחד',
      problem_note_ph: 'הזן הערה. ניתן להדביק תמונה.',
      reset: 'אפס',
      cancel: 'ביטול',
      submit: 'שלח',
      reading_type: 'סוג קריאה',
      related_product: 'מוצר משויך',
      due_date: 'תאריך יעד',
      priority: 'עדיפות',
      prio_high: 'דחוף',
      from_time: 'מ-',
      to_time: 'עד',
      problem_label: 'בעיה',
      problem_ph: 'תאר את הבעיה…',
      address_photo: 'כתובת ותמונה',
      street: 'רחוב',
      building: 'מספר בניין',
      city: 'עיר',
      entrance: 'כניסה',
      floor: 'קומה',
      apartment: 'דירה',
      delivery_address: 'כתובת',
      photo_optional: 'אופציונלי',
      photo_attach: 'צרף תמונה',
      assign_tech: 'שיבוץ טכנאי',
      clear_selection: 'נקה',
      take_cash: 'לגבות דמי שירות?',
      cash_amount_label: 'סכום דמי שירות',
      create_ticket: 'פתח קריאה',
      ticket_created: 'הקריאה נוצרה בהצלחה.',
      err_select_customer: 'נא לבחור לקוח.',
      err_select_type: 'נא לבחור סוג קריאה.',
      err_topic_required: 'יש למלא נושא.',
      err_department_required: 'נא לבחור מחלקה.',
      err_problem_required: 'יש למלא תיאור בעיה.',
      err_address_required: 'יש למלא כתובת.',
      topic_label: 'נושא',
      topic_ph: 'הזן נושא…',
      no_ticket_types: 'לא נמצאו סוגי קריאות',
      type_tech: 'שירות טכני',
      type_center: 'התקנת מרכך מים',
      type_bidet: 'התקנת בידה חשמלי',
      type_mainbar: 'התקנת בר ראשי',
      type_waterbar: 'התקנת בר מים',
      type_under: 'מערכת תת כיורית',
      type_filter: 'החלפת סנן',
      type_undergrind: 'תת כיורי + טוחן',
      type_disposal: 'התקנת טוחן אשפה'
    }
  };

  function getLang() {
    try {
      var saved = global.localStorage.getItem(LANG_KEY) || global.localStorage.getItem('biz1fs_lang') || global.localStorage.getItem('mineralbar_lang');
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
    if (key === 'footer_crm') return brandName(lang) + (lang === 'he' ? ' · קריאות' : ' · Tickets');
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

    document.querySelectorAll('.lang-translator-btn, [data-lang-toggle]').forEach(function (btn) {
      btn.textContent = lang === 'en' ? '🌐 EN' : '🌐 HE';
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
    document.querySelectorAll('[data-lang-toggle]').forEach(function (btn) {
      if (btn.__langBound) return;
      btn.__langBound = true;
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        setLang(getLang() === 'en' ? 'he' : 'en');
      });
    });
  }

  function updateStatusClocks() {
    var now = new Date();
    var h = now.getHours();
    var m = now.getMinutes();
    var text = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    document.querySelectorAll('.status-clock').forEach(function (el) {
      el.textContent = text;
    });
  }

  var THEME_KEY = 'cloudplus_theme';

  function resolveInitialTheme() {
    try {
      var saved = global.localStorage.getItem(THEME_KEY) ||
        global.localStorage.getItem('biz1demo_theme') ||
        global.localStorage.getItem('biz1fs_theme') ||
        global.localStorage.getItem('mineralbar_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) { /* ignore */ }
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
    updateStatusClocks();
    setInterval(updateStatusClocks, 15000);
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

  var CACHE_KEY = 'cloudplus_field_live_cache';
  var CACHE_VERSION = 'cloudplus-4';
  var CACHE_VERSION_KEY = 'cloudplus_field_cache_v';
  var OVERLAY_KEY = 'cloudplus_field_overlays';
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
  var liveTicketsPromise = null;
  var countsPromise = null;
  var countRefreshTimer = null;
  var LIST_PAGE_SIZE = 25;
  var listNextStart = 0;
  var listHasMore = false;
  var ticketCounts = { total: 0, opened: 0, closed: 0, assigned: 0, mine: 0 };
  var ticketCountsLoaded = false;

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
        if (options.append) list.push(ticket);
        else list.unshift(ticket);
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
    if (!Number.isNaN(num) && String(s).trim() !== '') {
      // Biz1 ticket.status: 1=Opened, 2=Closed, 3=Assigned
      if (num === 2) return STATUS.closed;
      if (num === 3) return STATUS.assigned;
      if (num === 4 || num === 5) return STATUS.closed;
      return STATUS.opened;
    }
    var v = String(s == null ? '' : s).toLowerCase().trim();
    if (/closed|close|סגור|סגורה|done|complet|finish|הושלם|בוצע/.test(v)) return STATUS.closed;
    if (/assign|משובץ|שויך|שובץ|en[_\s-]?route/.test(v)) return STATUS.assigned;
    if (/open|opened|pending|ממתין|חדש|new|wait|progress|route|active|working|פתוח|פתוחה/.test(v)) {
      return STATUS.opened;
    }
    return STATUS.opened;
  }

  function resolveStatusRaw(r) {
    if (!r || typeof r !== 'object') return 'Opened';
    // Prefer numeric status_id — Biz1 often keeps a display string in `status`.
    if (r.status_id != null && r.status_id !== '' && isFinite(Number(r.status_id))) {
      return r.status_id;
    }
    var name = r.status_name || r.status_label || r.ticket_status;
    if (name != null && String(name).trim()) return name;
    if (r.status != null && r.status !== '') return r.status;
    return pick(r, ['state'], 'Opened') || 'Opened';
  }

  /** Assigned = status assigned, or has a technician and is not closed. */
  function ticketIsAssigned(ticketOrRaw) {
    if (!ticketOrRaw) return false;
    var status = migrateStatus(
      ticketOrRaw.status != null
        ? ticketOrRaw.status
        : resolveStatusRaw(ticketOrRaw.raw || ticketOrRaw)
    );
    if (status === STATUS.closed) return false;
    if (status === STATUS.assigned) return true;
    return ticketAssigneeIds(ticketOrRaw).length > 0;
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

  var CHECKLIST_SCHEMA_KEY = 'cloudplus_ticket_checklist_schema';

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
      return user.id || user.user_id || user.member_id || user.technician_id || null;
    } catch (e) {
      return null;
    }
  }

  function normalizeAssigneeIds(value) {
    if (value == null || value === '') return [];
    var src = value;
    if (typeof src === 'string') {
      var trimmed = src.trim();
      if (!trimmed || trimmed === '0') return [];
      if (trimmed.charAt(0) === '[') {
        try { src = JSON.parse(trimmed); } catch (e) { src = trimmed; }
      } else if (trimmed.indexOf(',') !== -1) {
        src = trimmed.split(',');
      }
    }
    if (!Array.isArray(src)) src = [src];
    return src.map(function (id) {
      return String(id == null ? '' : id).trim();
    }).filter(function (id) {
      return id && id !== '0';
    });
  }

  function ticketAssigneeIds(ticketOrRaw) {
    var raw = ticketOrRaw;
    if (ticketOrRaw && ticketOrRaw.raw && typeof ticketOrRaw.raw === 'object') {
      raw = ticketOrRaw.raw;
    }
    if (!raw || typeof raw !== 'object') return [];
    var ids = normalizeAssigneeIds(raw.assign_member_id);
    if (ids.length) return ids;
    [
      raw.assigned_to, raw.member_id, raw.tech_id, raw.technician_id,
      raw.user_id, raw.assigned_user_id, raw.assignee_id, raw.worker_id
    ].forEach(function (v) {
      normalizeAssigneeIds(v).forEach(function (id) {
        if (ids.indexOf(id) === -1) ids.push(id);
      });
    });
    var nested = raw.technician || raw.assigned_user || raw.member || raw.tech;
    if (nested) {
      normalizeAssigneeIds(nested.id || nested.user_id || nested.member_id).forEach(function (id) {
        if (ids.indexOf(id) === -1) ids.push(id);
      });
    }
    return ids;
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
      var key = 'cloudplus_field_cache_user';
      var prev = global.localStorage.getItem(key);
      if (prev !== stamp) {
        memoryTickets = [];
        global.localStorage.removeItem(CACHE_KEY);
        global.localStorage.setItem(key, stamp);
      }
    } catch (e) { /* ignore */ }
  }

  function isAssignedToCurrentUser(ticketOrRaw, userId, email) {
    if (!ticketOrRaw) return false;
    var uid = userId != null ? String(userId) : String(getCurrentUserId() || '');
    var mail = email ? String(email).toLowerCase() : '';
    if (!mail) {
      try {
        mail = String((global.MineralBarApp && MineralBarApp.getEmail && MineralBarApp.getEmail()) || '').toLowerCase();
      } catch (e) { /* ignore */ }
    }
    var ids = ticketAssigneeIds(ticketOrRaw);
    if (uid && ids.indexOf(uid) !== -1) return true;

    var raw = (ticketOrRaw && ticketOrRaw.raw && typeof ticketOrRaw.raw === 'object')
      ? ticketOrRaw.raw
      : ticketOrRaw;
    if (!raw || typeof raw !== 'object') return false;

    var mailFields = [
      raw.tech_email, raw.assigned_email, raw.member_email,
      raw.assign_member_email, raw.joined_assign_member_email
    ].filter(Boolean);
    for (var j = 0; j < mailFields.length; j++) {
      if (mail && String(mailFields[j]).toLowerCase() === mail) return true;
    }

    if (mail) {
      var nameFields = [
        raw.joined_assign_member_name, raw.assign_member_name, raw.technician_name
      ].filter(Boolean);
      try {
        var team = (global.MineralBarApp && MineralBarApp.getTeamMembers && MineralBarApp.getTeamMembers()) || [];
        for (var t = 0; t < team.length; t++) {
          var member = team[t];
          var memberMail = String(member.email || '').toLowerCase();
          if (!memberMail || memberMail !== mail) continue;
          var memberId = String(member.id || member.user_id || member.member_id || '');
          if (memberId && ids.indexOf(memberId) !== -1) return true;
          var memberName = String(member.name || member.full_name || '').toLowerCase();
          for (var n = 0; n < nameFields.length; n++) {
            if (memberName && String(nameFields[n]).toLowerCase() === memberName) return true;
          }
        }
      } catch (e2) { /* ignore */ }
    }
    return false;
  }

  function rawHasAssignment(raw) {
    if (!raw) return false;
    if (ticketAssigneeIds(raw).length) return true;
    return !!(
      raw.technician || raw.assigned_user || raw.member || raw.tech ||
      raw.joined_assign_member_name || raw.assign_member_name
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
    return !!(ticket && (ticket.id || ticket.number));
  }

  function isValidRawRow(r) {
    if (!r || typeof r !== 'object') return false;
    return !!pick(r, ['id', 'ticket_id', 'ticketId', 'ticket_number', 'number'], '');
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
    var parts = [];
    function pushId(val) {
      String(val == null ? '' : val).split(',').forEach(function (x) {
        var id = String(x).trim();
        if (id && id !== '0' && parts.indexOf(id) === -1) parts.push(id);
      });
    }
    if (typeof src === 'string') {
      pushId(src);
      return parts;
    }
    if (Array.isArray(src)) {
      src.forEach(function (p) {
        if (p == null) return;
        if (typeof p === 'object') pushId(p.id || p.product_id || '');
        else pushId(p);
      });
      return parts;
    }
    if (src != null && src !== '') pushId(src);
    return parts;
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
    if (/^biz1upload\//i.test(value) || /\.(png|jpe?g|gif|webp|bmp)(\?|$)/i.test(value)) {
      return 'https://files.biz1.co.il/' + value.replace(/^\/+/, '');
    }
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

  function looksLikeTicketImage(url, name) {
    var u = String(url || '').toLowerCase();
    var n = String(name || '').toLowerCase();
    if (!u && !n) return false;
    if (/signature/i.test(n) || /signature/i.test(u)) return false;
    if (/\.(pdf|doc|docx|xls|xlsx|zip|mp4|mov|avi|csv|txt)(\?|$)/i.test(u) ||
        /\.(pdf|doc|docx|xls|xlsx|zip|mp4|mov|avi|csv|txt)$/i.test(n)) return false;
    if (/\.(png|jpe?g|gif|webp|bmp)(\?|$)/i.test(u) || /\.(png|jpe?g|gif|webp|bmp)$/i.test(n)) return true;
    if (/biz1upload\//i.test(u) || /files\.biz1\.co\.il/i.test(u)) return true;
    if (/^https?:\/\//i.test(u) && /image|upload|photo|img|media/i.test(u)) return true;
    if (/^data:image\//i.test(u)) return true;
    return false;
  }

  function mediaKindFromName(name) {
    var n = String(name || '').toLowerCase();
    if (n.indexOf('-signature') !== -1 || /(^|[^a-z])signature([^a-z]|$)/.test(n)) return 'signature';
    if (n.indexOf('-before') !== -1) return 'before';
    if (n.indexOf('-after') !== -1) return 'after';
    if (n.indexOf('-extra') !== -1) return 'extra';
    return 'field';
  }

  function matchTicketMediaFromDocs(ticketId, docs) {
    var photos = [];
    var signature = null;
    (docs || []).forEach(function (doc) {
      var name = docDisplayName(doc);
      var url = docFileUrl(doc);
      if (!url) return;
      var kind = mediaKindFromName(name);
      if (kind === 'signature') {
        signature = url;
        return;
      }
      if (!looksLikeTicketImage(url, name)) return;
      photos.push({
        name: name || (kind + '.jpg'),
        dataUrl: url,
        url: url,
        kind: kind,
        uploaded: true
      });
    });
    return { photos: photos, signature: signature };
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
    files = files.slice();
    var manifest = ticketMediaManifest(raw);
    if (manifest) {
      ['before', 'after', 'field', 'signature'].forEach(function (kind) {
        if (!manifest[kind]) return;
        files.push({
          original_name: kind === 'signature'
            ? ticketSignatureFileName(ticketId)
            : ticketPhotoFileName(ticketId, kind, 1),
          file_url: manifest[kind]
        });
      });
      if (Array.isArray(manifest.extras)) {
        manifest.extras.forEach(function (url, i) {
          if (!url) return;
          files.push({
            original_name: ticketPhotoFileName(ticketId, 'extra', i + 1),
            file_url: url
          });
        });
      }
    }
    var notes = '';
    var msgs = raw.messages || raw.message || raw.notes || '';
    if (Array.isArray(msgs)) {
      notes = msgs.map(function (m) {
        return (m && (m.message || m.msg || m.text || m.note)) || (typeof m === 'string' ? m : '');
      }).join('\n');
    } else {
      notes = String(msgs || '');
    }
    String(notes).split(/\n/).forEach(function (line) {
      var t = String(line || '').trim();
      if (!t || /BIZ1_MEDIA:/i.test(t)) return;
      if (/biz1upload\//i.test(t) || /\.(png|jpe?g|gif|webp|bmp)(\?|$)/i.test(t) ||
          (/^https?:\/\//i.test(t) && /image|upload|photo|img|media/i.test(t))) {
        files.push({ original_name: t.split('/').pop() || 'photo.jpg', file_url: t });
      }
    });
    return files;
  }

  function mergeTicketMedia(ticketId, photos, files) {
    var matched = matchTicketMediaFromDocs(ticketId, files);
    var merged = (photos || []).slice();
    var seen = {};
    merged.forEach(function (photo) {
      var key = (photo && (photo.dataUrl || photo.url || photo.name)) || '';
      if (key) seen[key] = true;
    });
    (matched.photos || []).forEach(function (photo) {
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
    var files = ticketMediaFiles(ticket.raw, ticket.id);
    if ((!ticket.photos || !ticket.photos.length) && ticket.customerId &&
        global.MineralBarApp && MineralBarApp.listDocuments) {
      try {
        var docs = await MineralBarApp.listDocuments(ticket.customerId);
        var prefix = ticketMediaPrefix(ticket.id).toLowerCase();
        ((docs && docs.rows) || []).forEach(function (doc) {
          var name = String(
            doc.original_name || doc.display_name || doc.file_name || doc.name || ''
          ).toLowerCase();
          if (name.indexOf(prefix) === 0 || name.indexOf('ticket-new-photo') !== -1) {
            files.push(doc);
          }
        });
      } catch (eDocs) { /* ticket files from Get are enough */ }
    }
    var media = mergeTicketMedia(ticket.id, ticket.photos, files);
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
    var id = String(pick(r, ['id', 'ticket_id', 'ticketId', 'ticket_number', 'number'], ''));
    if (!id) id = String(idx + 1);
    var customer = r.customer || r.client_obj || {};
    var clientFields = resolveClientFields(r);
    var statusRaw = String(resolveStatusRaw(r) || 'Opened');
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
      status: (function () {
        var st = statusFromApi(statusRaw);
        if (st !== STATUS.closed && ticketAssigneeIds(r).length) return STATUS.assigned;
        return st;
      })(),
      statusApi: statusRaw,
      history: mapHistory(r),
      checklist: mapChecklist(r),
      productIds: mapProductIds(r),
      spareParts: mapSpareParts(r),
      photos: apiMedia.photos,
      summary: String(pick(r, ['summary', 'description', 'note', 'work_done'], '') || ''),
      signature: apiMedia.signature || normalizeTicketSignature(r),
      completionReasonId: String(pick(r, ['completion_reason_id', 'completionReasonId'], '') || ''),
      completionReason: String(pick(r, [
        'completion_reason', 'completionReason', 'completion_reason_text',
        'completion_reason_name', 'completion_reason_label'
      ], '') || ''),
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
    if ((!Array.isArray(merged.photos) || !merged.photos.length) &&
        Array.isArray(ticket.photos) && ticket.photos.length) {
      merged.photos = ticket.photos;
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
    if (ticketCountsLoaded) {
      return {
        total: ticketCounts.total || 0,
        opened: ticketCounts.opened || 0,
        assigned: 0,
        closed: ticketCounts.closed || 0
      };
    }
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

  function ticketHasCoords(ticket) {
    if (!ticket || ticket.lat == null || ticket.lng == null) return false;
    if (String(ticket.lat).trim() === '' || String(ticket.lng).trim() === '') return false;
    return isFinite(Number(ticket.lat)) && isFinite(Number(ticket.lng));
  }

  function ticketAddress(ticket) {
    return ticket && String(ticket.address || '').trim();
  }

  function mapsEmbedUrl(ticket) {
    if (!ticket) return null;
    if (ticketHasCoords(ticket)) {
      return 'https://www.google.com/maps?q=' + encodeURIComponent(ticket.lat + ',' + ticket.lng) + '&z=16&output=embed';
    }
    var address = ticketAddress(ticket);
    if (address) {
      return 'https://www.google.com/maps?q=' + encodeURIComponent(address) + '&z=16&output=embed';
    }
    return null;
  }

  function mapsUrl(ticket) {
    if (!ticket) return '#';
    if (ticketHasCoords(ticket)) {
      return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(Number(ticket.lat) + ',' + Number(ticket.lng));
    }
    var address = ticketAddress(ticket);
    if (!address) return '#';
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(address);
  }

  function wazeUrl(ticket) {
    if (!ticket) return '#';
    if (ticketHasCoords(ticket)) {
      return 'https://waze.com/ul?ll=' + encodeURIComponent(Number(ticket.lat) + ',' + Number(ticket.lng)) + '&navigate=yes';
    }
    var address = ticketAddress(ticket);
    if (!address) return '#';
    return 'https://waze.com/ul?q=' + encodeURIComponent(address) + '&navigate=yes';
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

  function firstFiniteCount(values) {
    var i;
    var n;
    for (i = 0; i < values.length; i++) {
      if (values[i] == null || values[i] === '') continue;
      n = Number(values[i]);
      if (Number.isFinite(n) && n >= 0) return n;
    }
    return 0;
  }

  /** Prefer DataTables-style totals. Ignore `count` when it is just this page's row count. */
  function ticketListTotal(raw, rowCount) {
    raw = raw && typeof raw === 'object' ? raw : {};
    var nested = raw.output && typeof raw.output === 'object' ? raw.output : null;
    var total = firstFiniteCount([
      raw.recordsFiltered, raw.recordsTotal, raw.total_record, raw.totalrecords,
      raw.query_count, raw.total,
      nested && nested.recordsFiltered, nested && nested.recordsTotal,
      nested && nested.total_record, nested && nested.total
    ]);
    if (total) return total;
    var count = firstFiniteCount([raw.count, nested && nested.count]);
    if (count > (Number(rowCount) || 0)) return count;
    return 0;
  }

  function inferredListTotal(pageTotal) {
    var fromPage = Number(pageTotal) || 0;
    var fromCounts = ticketCountsLoaded ? Number(ticketCounts.total) || 0 : 0;
    return Math.max(fromPage, fromCounts);
  }

  function updateListHasMore(pageTotal, lastFetchCount) {
    var total = inferredListTotal(pageTotal);
    if (total) {
      listHasMore = listNextStart < total;
      return;
    }
    listHasMore = (lastFetchCount || 0) >= LIST_PAGE_SIZE;
  }

  function hasMoreTickets() {
    if (listHasMore) return true;
    return !!(ticketCountsLoaded && ticketCounts.total && listNextStart < ticketCounts.total);
  }

  async function fetchTicketListPage(extra) {
    extra = extra || {};
    var client = MineralBarApp.getClient();
    var pageSize = extra.length != null ? Number(extra.length) : LIST_PAGE_SIZE;
    var start = extra.start != null ? Number(extra.start) : 0;
    var payload = Object.assign({
      length: pageSize,
      start: start,
      draw: 1
    }, extra);
    var raw = await client.request('Ticket.List', payload);
    var rows = extractRows(raw).filter(isValidRawRow);
    return {
      rows: rows,
      total: ticketListTotal(raw, rows.length),
      raw: raw
    };
  }

  function buildListFilterParams(filterKey) {
    filterKey = String(filterKey || 'all');
    if (filterKey === 'closed') return { status_filter_val: 2 };
    if (filterKey === 'assigned') return { status_filter_val: 3 };
    if (filterKey === 'opened') return { status_filter_val: 1 };
    if (filterKey === 'mine') {
      var uid = getCurrentUserId();
      var params = { type: 'my_tickets' };
      if (uid != null && uid !== '') {
        var id = String(uid);
        params.assign_member_id = id;
        params.team_member = id;
        params.team_member_id = id;
      }
      return params;
    }
    return {};
  }

  function isApiBackedScheduleFilter(filterKey) {
    return filterKey === 'closed' || filterKey === 'assigned' || filterKey === 'mine';
  }

  function refineTicketsForFilter(tickets, filterKey) {
    tickets = Array.isArray(tickets) ? tickets : [];
    if (filterKey === 'mine') {
      return tickets.filter(function (t) { return isAssignedToCurrentUser(t); });
    }
    if (filterKey === 'assigned') {
      return tickets.filter(function (t) { return ticketIsAssigned(t); });
    }
    if (filterKey === 'closed') {
      return tickets.filter(function (t) {
        return migrateStatus(t && t.status) === STATUS.closed;
      });
    }
    if (filterKey === 'opened') {
      return tickets.filter(function (t) {
        var status = migrateStatus(t && t.status);
        return status === STATUS.opened || status === STATUS.assigned;
      });
    }
    return tickets;
  }

  /**
   * Fetch one Ticket.List page for a schedule filter (closed / assigned / mine).
   * Merges into the live cache so ticket details still open, but callers should
   * treat the returned page as the filtered result set for paging.
   */
  async function fetchTicketsPageForFilter(filterKey, opts) {
    opts = opts || {};
    if (!global.MineralBarApp || !MineralBarApp.getClient) {
      return { tickets: [], total: 0, fetched: 0, hasMore: false };
    }
    var client = MineralBarApp.getClient();
    if (!client || !client.getToken || !client.getToken()) {
      return { tickets: [], total: 0, fetched: 0, hasMore: false };
    }
    var start = opts.start != null ? Number(opts.start) : 0;
    var length = opts.length != null ? Number(opts.length) : LIST_PAGE_SIZE;
    if (!isFinite(start) || start < 0) start = 0;
    if (!isFinite(length) || length < 1) length = LIST_PAGE_SIZE;

    var useAssignedScan = filterKey === 'assigned' && !!opts.assignedScan;
    var params;
    if (useAssignedScan) {
      // Scan non-closed tickets and keep ones with a technician / assigned status.
      params = { start: start, length: length, status_filter_val: 1 };
    } else {
      params = Object.assign(
        { start: start, length: length },
        buildListFilterParams(filterKey)
      );
    }

    var page = await fetchTicketListPage(params);
    var mapped = await mapListRows(page.rows);
    var refined = refineTicketsForFilter(mapped, filterKey);

    // If status=3 returns nothing on first page, fall back to scanning open tickets.
    if (filterKey === 'assigned' && !useAssignedScan && start === 0 && !refined.length) {
      useAssignedScan = true;
      page = await fetchTicketListPage({ start: 0, length: length, status_filter_val: 1 });
      mapped = await mapListRows(page.rows);
      refined = refineTicketsForFilter(mapped, 'assigned');
    }

    if (refined.length) {
      mergeTicketsFromList(refined, { append: true, silent: true });
    }
    var total = Number(page.total) || 0;
    var fetched = (page.rows && page.rows.length) || 0;
    var hasMore = fetched >= length && (!total || (start + fetched) < total);
    return {
      tickets: refined,
      total: total,
      fetched: fetched,
      hasMore: hasMore,
      nextStart: start + fetched,
      assignedScan: useAssignedScan
    };
  }

  async function mapListRows(rows) {
    var mapped = (rows || []).map(mapTicket).filter(Boolean);
    var filtered = filterTicketsForUser(mapped, { includeClosed: true });
    await enrichTicketClients(filtered);
    return filtered;
  }

  async function fetchLiveTickets() {
    if (liveTicketsPromise) return liveTicketsPromise;
    if (!global.MineralBarApp || !MineralBarApp.getClient) {
      throw new Error(t('data_not_found'));
    }
    liveTicketsPromise = (async function () {
      clearCacheIfUserChanged();
      var client = MineralBarApp.getClient();
      if (!client || !client.getToken || !client.getToken()) {
        throw new Error(t('data_not_found'));
      }
      var page = await fetchTicketListPage({ start: 0, length: LIST_PAGE_SIZE });
      listNextStart = page.rows.length;
      updateListHasMore(page.total, page.rows.length);
      return mapListRows(page.rows);
    })();
    try {
      return await liveTicketsPromise;
    } finally {
      liveTicketsPromise = null;
    }
  }

  async function fetchMoreTickets() {
    if (hasMoreTickets()) listHasMore = true;
    if (!listHasMore || !global.MineralBarApp || !MineralBarApp.getClient) return [];
    var client = MineralBarApp.getClient();
    if (!client || !client.getToken || !client.getToken()) return [];
    try {
      var page = await fetchTicketListPage({ start: listNextStart, length: LIST_PAGE_SIZE });
      if (!page.rows.length) {
        listHasMore = false;
        return [];
      }
      listNextStart += page.rows.length;
      updateListHasMore(page.total, page.rows.length);
      var mapped = await mapListRows(page.rows);
      mergeTicketsFromList(mapped, { append: true, silent: true });
      return mapped;
    } catch (e) {
      console.warn('[FieldApp] Ticket.List next page failed', e);
      return [];
    }
  }

  async function refreshTicketCounts() {
    if (countsPromise) return countsPromise;
    if (!global.MineralBarApp || !MineralBarApp.getClient) return ticketCounts;
    var client = MineralBarApp.getClient();
    if (!client || !client.getToken || !client.getToken()) return ticketCounts;
    if (!MineralBarApp.countTickets) return ticketCounts;
    countsPromise = (async function () {
      var mineParams = buildListFilterParams('mine');
      var results = await Promise.all([
        MineralBarApp.countTickets({}).catch(function () { return { count: 0 }; }),
        MineralBarApp.countTickets({ status_filter_val: 2 }).catch(function () { return { count: 0 }; }),
        MineralBarApp.countTickets({ status_filter_val: 3 }).catch(function () { return { count: 0 }; }),
        MineralBarApp.countTickets(mineParams).catch(function () { return { count: 0 }; })
      ]);
      var total = Number(results[0] && results[0].count) || 0;
      var closed = Number(results[1] && results[1].count) || 0;
      var assigned = Number(results[2] && results[2].count) || 0;
      var mine = Number(results[3] && results[3].count) || 0;
      ticketCounts = {
        total: total,
        closed: closed,
        opened: Math.max(0, total - closed),
        assigned: assigned,
        mine: mine
      };
      ticketCountsLoaded = true;
      updateListHasMore(ticketCounts.total, 0);
      global.dispatchEvent(new CustomEvent('fieldapp:counts', { detail: ticketCounts }));
      return ticketCounts;
    })();
    try {
      return await countsPromise;
    } finally {
      countsPromise = null;
    }
  }

  function scheduleCountRefresh() {
    if (countRefreshTimer) clearTimeout(countRefreshTimer);
    countRefreshTimer = setTimeout(function () {
      countRefreshTimer = null;
      refreshTicketCounts().catch(function () {});
    }, 600);
  }

  function getTicketCounts() {
    return ticketCounts;
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
      scheduleCountRefresh();
      return { mode: 'remove', id: ticketId };
    }

    if (ticketId) {
      var updated = await syncTicketById(ticketId);
      scheduleCountRefresh();
      if (updated) return { mode: 'upsert', ticket: updated };
    }

    scheduleCountRefresh();
    return { mode: 'counts' };
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
    listNextStart = 0;
    listHasMore = false;
    ticketCounts = { total: 0, opened: 0, closed: 0, assigned: 0, mine: 0 };
    ticketCountsLoaded = false;
    try {
      global.localStorage.removeItem(CACHE_KEY);
      global.localStorage.removeItem('cloudplus_field_cache_user');
    } catch (e) { /* ignore */ }
  }

  function wireTicketRealtimeSync() {
    if (global.__fieldTicketSync) return;
    global.__fieldTicketSync = true;
    var syncTimer = null;
    var syncPending = null;
    var syncInFlight = false;

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

    global.addEventListener('mineralbar:socket', function (e) {
      if (!(e.detail && e.detail.type === 'ready')) return;
      if (!global.MineralBarApp || !MineralBarApp.isAuthenticated || !MineralBarApp.isAuthenticated()) return;
      if (!getTickets().length) {
        ensureTickets({ silent: true }).catch(function () {});
      }
      scheduleCountRefresh();
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
    fetchMoreTickets: fetchMoreTickets,
    hasMoreTickets: hasMoreTickets,
    refreshTicketCounts: refreshTicketCounts,
    getTicketCounts: getTicketCounts,
    buildListFilterParams: buildListFilterParams,
    isApiBackedScheduleFilter: isApiBackedScheduleFilter,
    fetchTicketsPageForFilter: fetchTicketsPageForFilter,
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
    ticketAssigneeIds: ticketAssigneeIds,
    isAssignedToCurrentUser: isAssignedToCurrentUser,
    ticketIsAssigned: ticketIsAssigned,
    getCurrentUserId: getCurrentUserId,
    t: t
  };
})(window);


/* ===== app-router.js ===== */
/**
 * Single-page router — login · schedule · ticket
 */
(function (global) {
  'use strict';

  var AUTH_ROUTES = { schedule: 1 };
  var booted = false;
  var currentPage = '';
  var draftSessionTicketId = null;

  function pageKind() {
    return global.document.documentElement.getAttribute('data-page') || 'spa';
  }

  function ticketDetailsUrl(id) {
    return 'ticket-details.html?id=' + encodeURIComponent(id || '');
  }

  function ticketCloseUrl(id) {
    return 'ticket-close.html?id=' + encodeURIComponent(id || '');
  }

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

  function ticketsPageUrl(filter) {
    filter = String(filter == null ? 'opened' : filter).trim() || 'opened';
    if (filter === 'opened') return 'tickets.html?filter=opened';
    if (filter === 'all') return 'tickets.html?filter=all';
    return 'tickets.html?filter=' + encodeURIComponent(filter);
  }

  function syncTicketsFilterUrl(filter) {
    if (pageKind() !== 'tickets') return;
    var next = ticketsPageUrl(filter);
    try {
      var cur = (global.location.pathname.split('/').pop() || '') + (global.location.search || '');
      if (cur === next || cur.endsWith('/' + next)) return;
      global.history.replaceState(null, '', next);
    } catch (e) { /* ignore */ }
  }

  function navigate(page, params) {
    params = params || {};
    if (page === 'ticket' && params.id) {
      global.location.href = ticketDetailsUrl(params.id);
      return;
    }
    if (page === 'complete' && params.id) {
      global.location.href = ticketCloseUrl(params.id);
      return;
    }
    if (page === 'schedule') {
      global.location.href = ticketsPageUrl(params.filter);
      return;
    }
    if (page === 'login') {
      global.location.href = loginPath();
      return;
    }
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

  /* ── Schedule / all tickets ── */
  var scheduleState = { filter: 'opened', period: 'all', search: '', searchOpen: false, page: 1, pageSize: 25 };
  var scheduleFiltered = {
    key: '',
    tickets: [],
    nextStart: 0,
    hasMore: false,
    total: 0,
    loading: false,
    requestId: 0,
    assignedScan: false
  };
  var markedTicketIds = {};

  function isApiBackedFilter(filterKey) {
    return !!(global.FieldApp && FieldApp.isApiBackedScheduleFilter &&
      FieldApp.isApiBackedScheduleFilter(filterKey));
  }

  function resetScheduleFiltered() {
    scheduleFiltered.key = '';
    scheduleFiltered.tickets = [];
    scheduleFiltered.nextStart = 0;
    scheduleFiltered.hasMore = false;
    scheduleFiltered.total = 0;
    scheduleFiltered.assignedScan = false;
  }

  function dedupeTicketsById(list) {
    var seen = {};
    var out = [];
    (list || []).forEach(function (t) {
      var id = String((t && (t.id || t.number)) || '');
      if (!id || seen[id]) return;
      seen[id] = true;
      out.push(t);
    });
    return out;
  }

  async function loadScheduleFilteredPage(reset) {
    if (!global.FieldApp || !FieldApp.fetchTicketsPageForFilter) return;
    var filterKey = scheduleState.filter;
    if (!isApiBackedFilter(filterKey)) {
      resetScheduleFiltered();
      return;
    }
    if (reset || scheduleFiltered.key !== filterKey) {
      scheduleFiltered.key = filterKey;
      scheduleFiltered.tickets = [];
      scheduleFiltered.nextStart = 0;
      scheduleFiltered.hasMore = true;
      scheduleFiltered.total = 0;
      scheduleFiltered.assignedScan = false;
    }
    if (!scheduleFiltered.hasMore && !reset) return;

    var requestId = ++scheduleFiltered.requestId;
    scheduleFiltered.loading = true;
    try {
      var page = await FieldApp.fetchTicketsPageForFilter(filterKey, {
        start: scheduleFiltered.nextStart,
        length: scheduleState.pageSize || 25,
        assignedScan: !!scheduleFiltered.assignedScan
      });
      if (requestId !== scheduleFiltered.requestId || scheduleState.filter !== filterKey) return;
      if (page.assignedScan) scheduleFiltered.assignedScan = true;
      scheduleFiltered.tickets = dedupeTicketsById(
        (reset ? [] : scheduleFiltered.tickets).concat(page.tickets || [])
      );
      scheduleFiltered.nextStart = page.nextStart != null
        ? page.nextStart
        : (scheduleFiltered.nextStart + (page.fetched || 0));
      scheduleFiltered.hasMore = !!page.hasMore;
      var apiTotal = Number(page.total) || 0;
      // For assigned scan, API total is "open tickets", not "assigned" — prefer Count.
      if (filterKey === 'assigned' && scheduleFiltered.assignedScan) {
        var c = (FieldApp.getTicketCounts && FieldApp.getTicketCounts()) || {};
        if (Number(c.assigned) > 0) scheduleFiltered.total = Number(c.assigned);
        else scheduleFiltered.total = Math.max(scheduleFiltered.total, scheduleFiltered.tickets.length);
      } else if (apiTotal > 0) {
        scheduleFiltered.total = apiTotal;
      } else {
        scheduleFiltered.total = Math.max(scheduleFiltered.total, scheduleFiltered.tickets.length);
      }

      // Prefer list totals when Count endpoint didn't return a useful value.
      if (apiTotal > 0 && FieldApp.getTicketCounts && !scheduleFiltered.assignedScan) {
        var counts = FieldApp.getTicketCounts() || {};
        if (filterKey === 'mine' && !(Number(counts.mine) > 0)) counts.mine = apiTotal;
        if (filterKey === 'assigned' && !(Number(counts.assigned) > 0)) counts.assigned = apiTotal;
        if (filterKey === 'closed' && !(Number(counts.closed) > 0)) counts.closed = apiTotal;
      }
    } catch (e) {
      console.warn('[schedule] filtered list failed', e);
      if (requestId === scheduleFiltered.requestId) {
        scheduleFiltered.hasMore = false;
      }
    } finally {
      if (requestId === scheduleFiltered.requestId) {
        scheduleFiltered.loading = false;
      }
    }
  }

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
    periodKey = periodKey || 'all';
    if (periodKey === 'all') return true;
    var at = ticket && ticket.dateAt != null ? Number(ticket.dateAt) : NaN;
    if (!isFinite(at)) {
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
    if (filterKey === 'opened') return status === FieldApp.STATUS.opened || status === FieldApp.STATUS.assigned;
    if (filterKey === 'assigned') {
      return !!(FieldApp.ticketIsAssigned
        ? FieldApp.ticketIsAssigned(ticket)
        : status === FieldApp.STATUS.assigned);
    }
    if (filterKey === 'closed') return status === FieldApp.STATUS.closed;
    if (filterKey === 'mine') {
      return !!(FieldApp.isAssignedToCurrentUser && FieldApp.isAssignedToCurrentUser(ticket));
    }
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
    // API-backed filters already constrain status/assignee; only apply search + period.
    if (isApiBackedFilter(scheduleState.filter)) {
      return ticketMatchesPeriodFilter(ticket, scheduleState.period) &&
        ticketMatchesScheduleSearch(ticket, scheduleState.search);
    }
    return ticketMatchesPeriodFilter(ticket, scheduleState.period) &&
      ticketMatchesScheduleFilter(ticket, scheduleState.filter) &&
      ticketMatchesScheduleSearch(ticket, scheduleState.search);
  }

  function ticketWaitDays(ticket) {
    var at = ticket && ticket.dateAt != null ? Number(ticket.dateAt) : NaN;
    if (!isFinite(at)) return 0;
    var open = new Date(at);
    var now = new Date();
    open.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((now.getTime() - open.getTime()) / (1000 * 60 * 60 * 24)));
  }

  function waitTone(days) {
    if (days > 3) return { color: '#c0392b', bg: '#fbeeed' };
    if (days >= 1) return { color: '#bd8324', bg: '#fdf1dd' };
    return { color: '#2e8a63', bg: '#e6f4ec' };
  }

  function waitLabel(days) {
    var n = Number(days) || 0;
    if (n <= 0) return tr('wait_0_days');
    if (n === 1) return tr('wait_1_day');
    return tr('wait_n_days').replace('{n}', String(n));
  }

  function visibleScheduleTickets() {
    if (!global.FieldApp) return [];
    var source;
    if (isApiBackedFilter(scheduleState.filter) && scheduleFiltered.key === scheduleState.filter) {
      source = scheduleFiltered.tickets;
    } else {
      source = FieldApp.getTickets();
    }
    return source.filter(ticketVisibleOnSchedule);
  }

  function isTicketMarked(ticket) {
    return !!(ticket && markedTicketIds[String(ticket.id)]);
  }

  function setTicketMarked(ticketId, on) {
    ticketId = String(ticketId || '');
    if (!ticketId) return;
    if (on) markedTicketIds[ticketId] = true;
    else delete markedTicketIds[ticketId];
  }

  function allVisibleMarked() {
    var list = visibleScheduleTickets();
    if (!list.length) return false;
    return list.every(function (t) { return isTicketMarked(t); });
  }

  function paintMarkAllButton() {
    var btn = global.document.getElementById('ticketsMarkAllBtn');
    if (!btn) return;
    var allOn = allVisibleMarked();
    btn.textContent = allOn ? tr('unmark_all') : tr('mark_all');
    btn.classList.toggle('is-on', allOn);
  }

  function toggleMarkAllVisible() {
    var list = visibleScheduleTickets();
    var turnOn = !allVisibleMarked();
    list.forEach(function (t) { setTicketMarked(t.id, turnOn); });
    renderSchedule();
  }

  function paintTicketsPills() {
    var wrap = global.document.getElementById('scheduleFilters');
    if (!wrap) return;
    wrap.querySelectorAll('button[data-filter]').forEach(function (btn) {
      var on = btn.getAttribute('data-filter') === scheduleState.filter;
      btn.classList.toggle('active', on);
      btn.style.background = '';
      btn.style.borderColor = '';
      btn.style.color = '';
    });
    var reset = global.document.getElementById('ticketsFilterReset');
    if (reset) reset.classList.toggle('has-filter', scheduleState.filter !== 'all');
  }

  function paintScheduleFilters() {
    paintTicketsPills();
  }

  function paintScheduleCounts() {
    if (!global.FieldApp) return;
    var c = (FieldApp.getTicketCounts && FieldApp.getTicketCounts()) || {};
    var totalEl = global.document.getElementById('countTotal');
    var openEl = global.document.getElementById('countOpen');
    var closedEl = global.document.getElementById('countClosed');
    var mineEl = global.document.getElementById('countMine');
    if (totalEl) totalEl.textContent = String(c.total || 0);
    if (openEl) openEl.textContent = String(c.opened || 0);
    if (closedEl) closedEl.textContent = String(c.closed || 0);
    // Stable API count — never grow from loaded pages.
    if (mineEl) mineEl.textContent = String(c.mine || 0);
    global.document.querySelectorAll('[data-dash-filter]').forEach(function (card) {
      var key = card.getAttribute('data-dash-filter') || 'all';
      card.classList.toggle('is-active', key === scheduleState.filter);
    });
    var label = global.document.getElementById('ticketsSectionLabel');
    if (label) {
      var key = 'all_tickets';
      if (scheduleState.filter === 'opened') key = 'open_tickets';
      else if (scheduleState.filter === 'closed') key = 'closed_tickets';
      else if (scheduleState.filter === 'assigned') key = 'assigned_tickets';
      else if (scheduleState.filter === 'mine') key = 'my_tickets';
      label.textContent = tr(key);
    }
    paintMarkAllButton();
  }

  function setScheduleLoading(on) {
    var loadingEl = global.document.getElementById('schedLoadingState');
    if (loadingEl) loadingEl.classList.toggle('hidden', !on);
    if (on) {
      var empty = global.document.getElementById('schedEmptyState');
      var root = global.document.getElementById('schedTicketList');
      var pager = global.document.getElementById('ticketsPager');
      if (empty) empty.classList.add('hidden');
      if (root) root.innerHTML = '';
      if (pager) pager.classList.add('hidden');
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

  function telHref(raw) {
    var s = String(raw || '').replace(/\D/g, '');
    if (!s) return '';
    if (s.indexOf('972') === 0) return 'tel:+' + s;
    if (s.charAt(0) === '0') return 'tel:+972' + s.slice(1);
    return 'tel:' + s;
  }

  function buildScheduleCard(ticket) {
    var colors = FieldApp.statusColor(ticket.status);
    var client = FieldApp.clientDisplay(ticket);
    var subject = ticket.subject || tr('data_not_found');
    var address = ticket.address || '';
    var days = ticketWaitDays(ticket);
    var wait = waitTone(days);
    var marked = isTicketMarked(ticket);
    var phoneHref = telHref(ticket.phone);
    var card = global.document.createElement('div');
    card.className = 'card schedule-ticket-card mineral-ticket' + (marked ? ' is-marked' : '');
    card.setAttribute('data-ticket-id', String(ticket.id));
    card.setAttribute('data-ticket-number', String(ticket.number || ''));
    card.style.borderInlineEndColor = wait.color;
    card.innerHTML =
      '<div class="mineral-ticket-top">' +
        '<div style="flex:1;min-width:0;cursor:pointer;">' +
          '<div class="mineral-ticket-name"></div>' +
          '<div class="mineral-ticket-meta">#' + ticket.number + ' · ' + waitLabel(days) + '</div>' +
        '</div>' +
        '<div class="mineral-ticket-badge" style="background:' + colors.bg + ';color:' + colors.text + ';">' +
          tr(FieldApp.statusLabelKey(ticket.status)) + '</div>' +
      '</div>' +
      '<div class="mineral-ticket-pills">' +
        '<span class="mineral-ticket-pill" style="background:#eaf2fb;color:#1d60a2;">' +
          '<svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="12"><path d="M14.5 6a3.5 3.5 0 0 0-4.6 4.3L3 17.2 6.8 21l6.9-6.9A3.5 3.5 0 0 0 18 9.5l-2.4 2.4-1.5-1.5L16.5 8z"></path></svg>' +
          tr(FieldApp.statusLabelKey(ticket.status)) + '</span>' +
        '<span class="mineral-ticket-pill" style="background:' + wait.bg + ';color:' + wait.color + ';">' +
          '<svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" viewBox="0 0 24 24" width="12"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>' +
          waitLabel(days) + '</span>' +
      '</div>' +
      (address
        ? '<div class="mineral-ticket-row"><span class="mineral-ticket-addr">' +
            '<svg fill="none" height="13" stroke="#b6bdc8" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="13"><path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>' +
            '<span class="mineral-ticket-addr-text"></span></span></div>'
        : '') +
      '<div class="mineral-ticket-subject"></div>' +
      '<div class="mineral-ticket-actions">' +
        '<button type="button" class="mineral-btn-details open-ticket-btn" data-stop>' +
          '<svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="14"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"></path><circle cx="12" cy="12" r="3"></circle></svg>' +
          tr('ticket_details') + '</button>' +
        (phoneHref
          ? '<button type="button" class="mineral-btn-call" data-stop data-call>' +
              '<svg fill="currentColor" height="14" viewBox="0 0 24 24" width="14"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.3 1z"></path></svg>' +
              tr('call_customer') + '</button>'
          : '') +
      '</div>';

    card.querySelector('.mineral-ticket-name').textContent = client;
    card.querySelector('.mineral-ticket-subject').textContent = '"' + subject + '"';
    var addrText = card.querySelector('.mineral-ticket-addr-text');
    if (addrText) addrText.textContent = address;

    var openBtn = card.querySelector('.open-ticket-btn');
    if (openBtn) {
      openBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        navigate('ticket', { id: ticket.id });
      });
    }
    var callBtn = card.querySelector('[data-call]');
    if (callBtn) {
      callBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (phoneHref) window.location.href = phoneHref;
      });
    }
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

  function schedulePagerTotal(localCount) {
    localCount = Number(localCount) || 0;
    var c = (global.FieldApp && FieldApp.getTicketCounts && FieldApp.getTicketCounts()) || {};

    if (scheduleState.search || (scheduleState.period && scheduleState.period !== 'all')) {
      return localCount;
    }

    if (isApiBackedFilter(scheduleState.filter)) {
      var filteredTotal = Number(scheduleFiltered.total) || 0;
      if (scheduleState.filter === 'closed' && Number(c.closed) > 0) {
        return Number(c.closed);
      }
      if (scheduleState.filter === 'assigned' && Number(c.assigned) > 0) {
        return Number(c.assigned);
      }
      if (scheduleState.filter === 'mine' && Number(c.mine) > 0) {
        return Number(c.mine);
      }
      return Math.max(localCount, filteredTotal);
    }

    var hasMore = !!(global.FieldApp && FieldApp.hasMoreTickets && FieldApp.hasMoreTickets());
    var api = 0;
    if (scheduleState.filter === 'opened') api = Number(c.opened) || 0;
    else api = Number(c.total) || 0;
    if (!hasMore && localCount) return localCount;
    return Math.max(localCount, api);
  }

  function schedulePagerPages(localCount) {
    var size = scheduleState.pageSize || 25;
    return Math.max(1, Math.ceil(schedulePagerTotal(localCount) / size));
  }

  function scheduleHasMorePages(localCount) {
    if (isApiBackedFilter(scheduleState.filter)) {
      return !!scheduleFiltered.hasMore;
    }
    return !!(global.FieldApp && FieldApp.hasMoreTickets && FieldApp.hasMoreTickets());
  }

  function paintTicketsPager(localCount) {
    var pager = global.document.getElementById('ticketsPager');
    var label = global.document.getElementById('ticketsPagerLabel');
    var prev = global.document.getElementById('ticketsPrevPage');
    var next = global.document.getElementById('ticketsNextPage');
    var totalCount = schedulePagerTotal(localCount);
    var pages = schedulePagerPages(localCount);
    var hasMore = scheduleHasMorePages(localCount);
    if (scheduleState.page > pages) scheduleState.page = pages;
    if (scheduleState.page < 1) scheduleState.page = 1;
    if (pager) pager.classList.toggle('hidden', !totalCount && !localCount);
    if (label) label.textContent = scheduleState.page + ' / ' + pages;
    if (prev) prev.disabled = scheduleState.page <= 1;
    if (next) next.disabled = scheduleState.page >= pages && !hasMore;
  }

  function pagedTickets(tickets) {
    var size = scheduleState.pageSize || 25;
    var localPages = Math.max(1, Math.ceil(tickets.length / size));
    var page = scheduleState.page;
    if (page > localPages) page = localPages;
    if (page < 1) page = 1;
    var start = (page - 1) * size;
    return tickets.slice(start, start + size);
  }

  var schedulePagerBusy = false;

  function goSchedulePage(nextPage) {
    if (schedulePagerBusy) return;
    var size = scheduleState.pageSize || 25;
    var need = nextPage * size;
    var apiFilter = isApiBackedFilter(scheduleState.filter);

    function finish() {
      var tickets = visibleScheduleTickets();
      var localPages = Math.max(1, Math.ceil(tickets.length / size));
      var pages = schedulePagerPages(tickets.length);
      if (nextPage > localPages && !scheduleHasMorePages(tickets.length)) nextPage = localPages;
      if (nextPage > pages && !scheduleHasMorePages(tickets.length)) nextPage = pages;
      if (nextPage < 1) nextPage = 1;
      scheduleState.page = nextPage;
      renderSchedule();
    }

    if (nextPage <= scheduleState.page || visibleScheduleTickets().length >= need) {
      finish();
      return;
    }

    if (apiFilter) {
      if (!scheduleFiltered.hasMore || !FieldApp.fetchTicketsPageForFilter) {
        finish();
        return;
      }
      schedulePagerBusy = true;
      var nextBtnFiltered = global.document.getElementById('ticketsNextPage');
      if (nextBtnFiltered) nextBtnFiltered.disabled = true;
      (async function () {
        try {
          var emptyStreak = 0;
          while (visibleScheduleTickets().length < need && scheduleFiltered.hasMore) {
            var before = visibleScheduleTickets().length;
            await loadScheduleFilteredPage(false);
            if (visibleScheduleTickets().length > before) {
              emptyStreak = 0;
              continue;
            }
            emptyStreak += 1;
            if (!scheduleFiltered.hasMore || emptyStreak > 8) break;
          }
        } finally {
          schedulePagerBusy = false;
          finish();
        }
      })();
      return;
    }

    if (!FieldApp.fetchMoreTickets) {
      finish();
      return;
    }

    schedulePagerBusy = true;
    var nextBtn = global.document.getElementById('ticketsNextPage');
    if (nextBtn) nextBtn.disabled = true;

    (async function () {
      try {
        var emptyStreak = 0;
        while (visibleScheduleTickets().length < need) {
          if (!FieldApp.hasMoreTickets || !FieldApp.hasMoreTickets()) break;
          var before = visibleScheduleTickets().length;
          await FieldApp.fetchMoreTickets();
          if (visibleScheduleTickets().length > before) {
            emptyStreak = 0;
            continue;
          }
          emptyStreak += 1;
          if (!FieldApp.hasMoreTickets || !FieldApp.hasMoreTickets() || emptyStreak > 8) break;
        }
      } finally {
        schedulePagerBusy = false;
        finish();
      }
    })();
  }

  function setScheduleFilter(next) {
    scheduleState.filter = next || 'all';
    scheduleState.page = 1;
    syncTicketsFilterUrl(scheduleState.filter);
    if (!isApiBackedFilter(scheduleState.filter)) {
      resetScheduleFiltered();
      renderSchedule();
      return;
    }
    scheduleFiltered.requestId += 1;
    setScheduleLoading(true);
    loadScheduleFilteredPage(true).then(function () {
      setScheduleLoading(false);
      renderSchedule();
    }).catch(function () {
      setScheduleLoading(false);
      renderSchedule();
    });
  }

  function removeScheduleCard() {
    renderSchedule();
  }

  /** Update one card in place — no full list rebuild. */
  function upsertScheduleCard() {
    renderSchedule();
  }

  function renderSchedule() {
    if (!global.FieldApp) return;
    var tickets = visibleScheduleTickets();
    paintScheduleFilters();
    paintScheduleCounts();
    paintTicketsPager(tickets.length);

    var root = global.document.getElementById('schedTicketList');
    if (!root) return;
    root.innerHTML = '';
    root.scrollTop = 0;

    if (!tickets.length) {
      scheduleEmptyState(true);
      return;
    }
    scheduleEmptyState(false);
    pagedTickets(tickets).forEach(function (ticket) {
      root.appendChild(buildScheduleCard(ticket));
    });
  }

  function setTicketsSearchOpen(open) {
    scheduleState.searchOpen = !!open;
    var row = global.document.getElementById('ticketsTitleRow');
    var bar = global.document.getElementById('ticketsSearchOpen');
    if (row) row.classList.toggle('hidden', scheduleState.searchOpen);
    if (bar) bar.classList.toggle('hidden', !scheduleState.searchOpen);
    if (scheduleState.searchOpen) {
      var input = global.document.getElementById('scheduleSearchInput');
      if (input) {
        try { input.focus(); } catch (e) { /* ignore */ }
      }
    }
  }

  function bindDraggablePills(wrap) {
    if (!wrap || wrap.__dragBound) return;
    wrap.__dragBound = true;
    var drag = {
      tracking: false,
      moved: false,
      startX: 0,
      startScroll: 0,
      pointerId: null
    };
    var DRAG_THRESHOLD = 10;

    function clearDrag() {
      drag.tracking = false;
      drag.moved = false;
      drag.pointerId = null;
      wrap.classList.remove('is-dragging');
    }

    wrap.addEventListener('pointerdown', function (e) {
      // Touch/pen: native horizontal scroll + tap select.
      // Mouse: custom drag-to-scroll after a small move threshold.
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag.tracking = true;
      drag.moved = false;
      drag.startX = e.clientX;
      drag.startScroll = wrap.scrollLeft;
      drag.pointerId = e.pointerId;
      wrap.classList.remove('is-dragging');
    });

    wrap.addEventListener('pointermove', function (e) {
      if (!drag.tracking || e.pointerId !== drag.pointerId) return;
      var dx = e.clientX - drag.startX;
      if (!drag.moved) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return;
        drag.moved = true;
        wrap.classList.add('is-dragging');
        try { wrap.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
      wrap.scrollLeft = drag.startScroll - dx;
      e.preventDefault();
    });

    function endPointer(e) {
      if (!drag.tracking || (e && e.pointerId !== drag.pointerId)) return;
      var wasDragging = drag.moved;
      if (wasDragging) {
        wrap.__suppressClick = true;
        setTimeout(function () { wrap.__suppressClick = false; }, 0);
      }
      try {
        if (wasDragging && drag.pointerId != null) wrap.releasePointerCapture(drag.pointerId);
      } catch (err) { /* ignore */ }
      clearDrag();
    }

    wrap.addEventListener('pointerup', endPointer);
    wrap.addEventListener('pointercancel', endPointer);
  }

  function initSchedule() {
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
      bindDraggablePills(filterWrap);
      filterWrap.addEventListener('click', function (e) {
        if (filterWrap.__suppressClick) return;
        var btn = e.target.closest('[data-filter]');
        if (!btn || !filterWrap.contains(btn)) return;
        var next = btn.getAttribute('data-filter') || 'all';
        setScheduleFilter((scheduleState.filter === next) ? 'all' : next);
      });
    }
    var filterReset = global.document.getElementById('ticketsFilterReset');
    if (filterReset && !filterReset.__bound) {
      filterReset.__bound = true;
      filterReset.addEventListener('click', function () {
        setScheduleFilter('all');
      });
    }
    var searchToggle = global.document.getElementById('ticketsSearchToggle');
    if (searchToggle && !searchToggle.__bound) {
      searchToggle.__bound = true;
      searchToggle.addEventListener('click', function () { setTicketsSearchOpen(true); });
    }
    var searchCancel = global.document.getElementById('ticketsSearchCancel');
    if (searchCancel && !searchCancel.__bound) {
      searchCancel.__bound = true;
      searchCancel.addEventListener('click', function () {
        var input = global.document.getElementById('scheduleSearchInput');
        if (input) input.value = '';
        scheduleState.search = '';
        scheduleState.page = 1;
        setTicketsSearchOpen(false);
        renderSchedule();
      });
    }
    var dashWrap = global.document.querySelector('.tickets-dash');
    if (dashWrap && !dashWrap.__bound) {
      dashWrap.__bound = true;
      dashWrap.addEventListener('click', function (e) {
        var card = e.target.closest('[data-dash-filter]');
        if (!card) return;
        setScheduleFilter(card.getAttribute('data-dash-filter') || 'all');
      });
    }
    var prevPage = global.document.getElementById('ticketsPrevPage');
    if (prevPage && !prevPage.__bound) {
      prevPage.__bound = true;
      prevPage.addEventListener('click', function () {
        if (scheduleState.page <= 1) return;
        goSchedulePage(scheduleState.page - 1);
      });
    }
    var nextPage = global.document.getElementById('ticketsNextPage');
    if (nextPage && !nextPage.__bound) {
      nextPage.__bound = true;
      nextPage.addEventListener('click', function () {
        goSchedulePage(scheduleState.page + 1);
      });
    }
    var searchInput = global.document.getElementById('scheduleSearchInput');
    if (searchInput && !searchInput.__bound) {
      searchInput.__bound = true;
      searchInput.addEventListener('input', function () {
        scheduleState.search = searchInput.value || '';
        scheduleState.page = 1;
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
        if (pageKind() !== 'spa') global.location.href = 'index.html#login';
        else navigate('login');
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
    await Promise.all([
      FieldApp.ensureTickets(),
      FieldApp.refreshTicketCounts ? FieldApp.refreshTicketCounts() : Promise.resolve()
    ]);
    if (pageKind() === 'tickets' && global.FieldApp && FieldApp.qs) {
      var fromQuery = String(FieldApp.qs('filter') || '').trim();
      scheduleState.filter = fromQuery || 'opened';
      scheduleState.page = 1;
      syncTicketsFilterUrl(scheduleState.filter);
    }
    if (isApiBackedFilter(scheduleState.filter)) {
      await loadScheduleFilteredPage(true);
    } else {
      resetScheduleFiltered();
    }
    setScheduleLoading(false);
    renderSchedule();
  }

  async function bootTicketsPage() {
    currentPage = 'schedule';
    var ok = await bootAuthenticated();
    if (!ok) {
      discardOpenTicketDraftSession();
      global.location.replace(loginPath());
      return false;
    }
    if (global.MineralBarI18n && MineralBarI18n.apply) MineralBarI18n.apply();
    await activateSchedule();
    return true;
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

  function paintChecklistMarkAll() {
    var btn = global.document.getElementById('ticketMarkAllBtn');
    if (!btn) return;
    var ticket = ticketState.ticket;
    var items = (ticket && ticket.checklist) || [];
    var isClosed = !!(ticket && FieldApp.migrateStatus(ticket.status) === FieldApp.STATUS.closed);
    var show = items.length > 0 && !isClosed;
    btn.classList.toggle('hidden', !show);
    if (!show) return;
    var allOn = items.every(function (item) { return !!item.done; });
    btn.textContent = allOn ? tr('unmark_all') : tr('mark_all');
    btn.classList.toggle('is-on', allOn);
  }

  async function markAllChecklistItems() {
    var ticket = ticketState.ticket;
    if (!ticket) return;
    var items = ticket.checklist || [];
    if (!items.length) return;
    if (FieldApp.migrateStatus(ticket.status) === FieldApp.STATUS.closed) return;
    var turnOn = !items.every(function (item) { return !!item.done; });
    var previous = items.map(function (item) { return !!item.done; });
    items.forEach(function (item) { item.done = turnOn; });
    FieldApp.updateTicket(ticket.id, { checklist: items });
    ticketState.ticket = FieldApp.getTicket(ticket.id);
    renderTicketChecklist();
    if (!global.MineralBarApp || !MineralBarApp.getClient) return;
    try {
      var customFields = FieldApp.checklistToCustomFields(items);
      await MineralBarApp.getClient().request('Ticket.Edit', {
        ticket_id: ticket.id,
        id: ticket.id,
        custom_fields: customFields
      });
      showFormError('ticketFormError', '');
    } catch (e) {
      items.forEach(function (item, i) { item.done = previous[i]; });
      FieldApp.updateTicket(ticket.id, { checklist: items });
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
      paintChecklistMarkAll();
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
    paintChecklistMarkAll();
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

    var markAllChecklist = global.document.getElementById('ticketMarkAllBtn');
    if (markAllChecklist && !markAllChecklist.__bound) {
      markAllChecklist.__bound = true;
      markAllChecklist.addEventListener('click', function (e) {
        e.preventDefault();
        markAllChecklistItems();
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
      if (route.params.id) {
        global.location.replace(ticketDetailsUrl(route.params.id));
        return;
      }
      navigate('schedule');
    } else if (page === 'complete') {
      if (route.params.id) {
        global.location.replace(ticketCloseUrl(route.params.id));
        return;
      }
      navigate('schedule');
    } else {
      navigate(MineralBarApp.isAuthenticated() ? 'schedule' : 'login');
    }
  }

  function initEvents() {
    if (pageKind() === 'spa') {
      global.addEventListener('hashchange', onRoute);
    }
    global.addEventListener('fieldapp:loading', function (e) {
      if (currentPage !== 'schedule') return;
      // Only show full-list loading on initial/manual loads — never wipe for incremental sync
      if (e.detail && e.detail.loading) setScheduleLoading(true);
      else {
        setScheduleLoading(false);
        renderSchedule();
      }
    });
    global.addEventListener('fieldapp:counts', function () {
      if (currentPage !== 'schedule') return;
      paintScheduleCounts();
      paintTicketsPager(visibleScheduleTickets().length);
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
      }
    });
    global.addEventListener('mineralbar:lang', function () {
      if (currentPage === 'schedule') renderSchedule();
    });
  }

  function init() {
    initEvents();
    initProfile();
    paintProfile();

    if (pageKind() === 'tickets') {
      bootTicketsPage();
      return;
    }

    if (pageKind() !== 'spa') return;

    initLogin();

    // Legacy #schedule hash → dedicated tickets page (avoids reload redirect loops).
    var hash = (global.location.hash || '').replace(/^#/, '');
    if (hash.indexOf('schedule') === 0) {
      var filter = '';
      try {
        var q = hash.indexOf('?');
        if (q !== -1) filter = new URLSearchParams(hash.slice(q + 1)).get('filter') || '';
      } catch (e) { /* ignore */ }
      global.location.replace(ticketsPageUrl(filter));
      return;
    }

    if (global.MineralBarApp && MineralBarApp.isAuthenticated && MineralBarApp.isAuthenticated()) {
      global.location.replace(ticketsPageUrl());
      return;
    }

    if (!global.location.hash || hash === 'login') {
      global.location.hash = 'login';
      onRoute();
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

