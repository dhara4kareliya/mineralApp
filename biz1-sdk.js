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
    if (!eventId) return true; // allow events without id
    var next = Number(eventId);
    if (!next || Number.isNaN(next)) return true;
    if (next <= this.lastEventId()) return false; // duplicate
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
      // Always deliver to local handlers. Only skip true duplicates by id.
      var isNew = self.setLastEventId(event && event.id);
      if (!isNew) {
        try { console.warn('[Biz1SDK] duplicate biz1:event skipped', event && event.id, event && event.key); } catch (e) {}
        return;
      }
      self.emitLocal(event && event.key, event);
      self.emitLocal('*', event);
      self.emitLocal('biz1:event', event);
      if (event && event.id) self.socket.emit('realtime:ack', { eventId: event.id });
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
    var data = await this.request('Login', {
      username: credentials.username || credentials.email || credentials.user || '',
      password: credentials.password || '',
      otp: credentials.otp || ''
    }, { public: true });
    if (data && data.token) this.setToken(data.token);
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
