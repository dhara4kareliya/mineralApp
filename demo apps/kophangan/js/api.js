(function (global) {
  'use strict';

  var TOKEN_KEY = 'biz1_sdk_bearer_token';
  var USER_KEY = 'expense_app_user';
  var EMAIL_KEY = 'expense_app_email';
  var CRED_KEY = 'expense_app_cred';
  var REMEMBER_KEY = 'expense_app_remember';
  var DEVICE_KEY = 'biz1_realtime_device_id';
  var LAST_EVENT_ID_KEY = 'biz1_realtime_last_event_id';

  function apiDomain() {
    var domain = (global.APP_CONFIG && global.APP_CONFIG.API_DOMAIN) || '';
    return String(domain).replace(/\/+$/, '');
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function toUtcDateTime(date) {
    return (
      [date.getUTCFullYear(), pad2(date.getUTCMonth() + 1), pad2(date.getUTCDate())].join('-') +
      ' ' +
      [pad2(date.getUTCHours()), pad2(date.getUTCMinutes()), pad2(date.getUTCSeconds())].join(':')
    );
  }

  function isDateField(key) {
    var name = String(key || '').toLowerCase();
    return (
      /(^|_)(date|datetime|time|followup|due)(_|$)/.test(name) ||
      ['from', 'to', 'start', 'stop', 'created_at', 'updated_at', 'last_update', 'last_updated', 'payment_date'].indexOf(name) !== -1
    );
  }

  function normalizeDateInput(key, value) {
    if (value instanceof Date) return toUtcDateTime(value);
    if (!isDateField(key) || typeof value !== 'string') return value;
    var text = value.trim();
    if (!text) return value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      var d = new Date(Number(text.slice(0, 4)), Number(text.slice(5, 7)) - 1, Number(text.slice(8, 10)));
      return toUtcDateTime(d);
    }
    var parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? value : toUtcDateTime(parsed);
  }

  function toBody(data) {
    if (!data) return new URLSearchParams();
    if (typeof FormData !== 'undefined' && data instanceof FormData) return data;
    var keys = Object.keys(data);
    var hasFile = keys.some(function (k) {
      return typeof File !== 'undefined' && data[k] instanceof File;
    });
    if (hasFile) {
      var fd = new FormData();
      keys.forEach(function (key) {
        var value = data[key];
        if (value === undefined || value === null || value === '') return;
        if (value instanceof File) fd.append(key, value);
        else fd.append(key, String(normalizeDateInput(key, value)));
      });
      return fd;
    }
    var body = new URLSearchParams();
    keys.forEach(function (key) {
      var value = data[key];
      if (value === undefined || value === null || value === '') return;
      body.append(key, String(normalizeDateInput(key, value)));
    });
    return body;
  }

  function listRows(raw) {
    if (!raw) return [];
    var keys = ['data', 'rows', 'items', 'records'];
    for (var i = 0; i < keys.length; i++) {
      if (Array.isArray(raw[keys[i]])) return raw[keys[i]];
    }
    return [];
  }

  function optionLabel(row, fallbackKeys) {
    for (var i = 0; i < fallbackKeys.length; i++) {
      var val = row[fallbackKeys[i]];
      if (val !== undefined && val !== null && String(val).trim()) return String(val);
    }
    return String(row.id != null ? row.id : '');
  }

  function optionId(row) {
    var id = row.id != null ? row.id : row.category_id != null ? row.category_id : row.customer_id != null ? row.customer_id : row.project_id != null ? row.project_id : row.supplier_id != null ? row.supplier_id : row.suppliers_id;
    return id !== undefined && id !== null ? String(id) : '';
  }

  function Biz1ApiError(message, detail) {
    this.name = 'Biz1ApiError';
    this.message = message || 'Biz1 API request failed';
    this.status = detail && detail.status;
    this.route = detail && detail.route;
    this.raw = detail && detail.raw;
  }
  Biz1ApiError.prototype = Object.create(Error.prototype);

  function getDeviceId() {
    var id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = 'web-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  function ExpenseApi() {
    this.domain = apiDomain();
    this.socket = null;
    this.handlers = {};
    console.log('[Expense App] API_DOMAIN:', this.domain);
  }

  ExpenseApi.prototype.getToken = function () {
    return localStorage.getItem(TOKEN_KEY) || '';
  };

  ExpenseApi.prototype.setToken = function (token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  };

  ExpenseApi.prototype.request = async function (route, data, options) {
    options = options || {};
    var headers = {};
    if (!options.public) {
      var token = this.getToken();
      if (!token) throw new Biz1ApiError('Bearer token is missing. Login first.', { route: route, status: 401 });
      headers.Authorization = 'Bearer ' + token;
    }
    var res = await fetch(this.domain + '/app/' + route, {
      method: 'POST',
      headers: headers,
      body: toBody(data || {})
    });
    var text = await res.text();
    var json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch (e) {
      throw new Biz1ApiError('Biz1 route did not return JSON.', { route: route, status: res.status, raw: text });
    }
    var failed = !res.ok || json.success === 0 || json.success === '0' || json.ok === false;
    if (failed) {
      if (res.status === 401) this.setToken('');
      throw new Biz1ApiError(String(json.message || json.error || 'Biz1 API request failed'), {
        route: route,
        status: res.status,
        raw: json
      });
    }
    return json;
  };

  ExpenseApi.prototype.login = async function (credentials) {
    var data = await this.request(
      'Login',
      {
        username: credentials.username,
        password: credentials.password,
        otp: credentials.otp || ''
      },
      { public: true }
    );

    if (data.otp_required || data.otpRequired) {
      return { ok: false, otpRequired: true, message: String(data.message || 'OTP required'), raw: data };
    }
    if (!data.token) throw new Biz1ApiError(String(data.message || 'Login failed'), { route: 'Login', raw: data });

    this.setToken(String(data.token));
    var basic = await this.request('User.Basic');
    var user = extractUser(basic);
    saveUserSession(user, credentials.username);
    return { ok: true, token: String(data.token), user: user, raw: data };
  };

  ExpenseApi.prototype.logout = function () {
    this.disconnectRealtime();
    this.setToken('');
    clearUserSession();
  };

  function eventKeyOf(event) {
    if (!event) return '';
    if (typeof event === 'string') return event;
    var payload = event.payload || event.data || event.event || {};
    return String(
      event.key ||
        event.event_key ||
        event.eventKey ||
        event.socket_event ||
        event.type ||
        payload.key ||
        payload.event_key ||
        payload.eventKey ||
        ''
    );
  }

  function normalizeEventKey(key) {
    return String(key || '')
      .trim()
      .toLowerCase()
      .replace(/:/g, '.')
      .replace(/\s+/g, '');
  }

  function isExpenseRealtimeKey(key) {
    var k = normalizeEventKey(key);
    if (!k) return false;
    if (/^expenses?\.(created|updated|deleted|create|update|delete|add|edit|remove)$/.test(k)) return true;
    return /expense/.test(k) && /(creat|updat|delet|add|edit|remov)/.test(k);
  }

  ExpenseApi.prototype.ensureSocketIo = function () {
    var self = this;
    if (typeof global.io !== 'undefined') return Promise.resolve(global.io);
    if (this._ioPromise) return this._ioPromise;
    this._ioPromise = new Promise(function (resolve, reject) {
      var src = self.domain + '/realtime/socket.io/socket.io.js';
      var existing = document.querySelector('script[data-biz1-io]');
      if (existing) {
        if (global.io) {
          resolve(global.io);
          return;
        }
        existing.addEventListener('load', function () {
          if (global.io) resolve(global.io);
          else reject(new Error('socket.io.js loaded but window.io missing'));
        });
        existing.addEventListener('error', function () {
          reject(new Error('Failed to load ' + src));
        });
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.setAttribute('data-biz1-io', '1');
      s.onload = function () {
        if (global.io) resolve(global.io);
        else reject(new Error('socket.io.js loaded but window.io missing'));
      };
      s.onerror = function () {
        reject(new Error('Failed to load ' + src));
      };
      (document.head || document.documentElement).appendChild(s);
    });
    return this._ioPromise;
  };

  ExpenseApi.prototype.handleBiz1Event = function (event, source) {
    var key = eventKeyOf(event);
    var lower = normalizeEventKey(key);
    var normalized = Object.assign({}, typeof event === 'object' && event ? event : {}, {
      key: key,
      _source: source || 'biz1:event'
    });

    console.log('[Expense App] realtime event', source || 'biz1:event', key || '(no-key)', normalized);

    if (key) this.emitLocal(key, normalized);
    if (lower && lower !== key) this.emitLocal(lower, normalized);
    this.emitLocal('*', normalized);
    this.emitLocal('biz1:event', normalized);

    if (isExpenseRealtimeKey(key)) {
      if (lower !== 'expenses.created' && /creat|add/.test(lower)) this.emitLocal('expenses.created', normalized);
      else if (lower !== 'expenses.updated' && /updat|edit/.test(lower)) this.emitLocal('expenses.updated', normalized);
      else if (lower !== 'expenses.deleted' && /delet|remov/.test(lower)) this.emitLocal('expenses.deleted', normalized);
    }
  };

  ExpenseApi.prototype.connectRealtime = function () {
    var token = this.getToken();
    if (!token) return Promise.resolve(null);
    var self = this;

    return this.ensureSocketIo()
      .then(function (ioFn) {
        try {
          localStorage.removeItem(LAST_EVENT_ID_KEY);
        } catch (e) {
          /* ignore */
        }

        // Prefer official Biz1 SDK realtime client (same as Mineral).
        var sdk = global.Biz1SDK;
        if (sdk && sdk.createClient) {
          if (!self._biz1) {
            self._biz1 = sdk.createClient({
              domain: self.domain,
              io: ioFn,
              platform: 'web',
              socketPath: '/realtime/socket.io'
            });
          }
          self._biz1.setToken(token);

          if (!self._sdkRealtimeWired) {
            self._sdkRealtimeWired = true;
            self._biz1.realtime.on('biz1:ready', function (payload) {
              self.emitLocal('biz1:ready', payload || {});
            });
            // Wire the exact catalog keys (confirmed in biz1:ready).
            ['expenses.created', 'expenses.updated', 'expenses.deleted'].forEach(function (key) {
              self._biz1.realtime.on(key, function (event) {
                console.log('[Expense App] realtime event', key, event);
                self.emitLocal(key, Object.assign({}, event || {}, { key: key }));
              });
            });
          }

          var socket = self._biz1.realtime.connect({
            platform: 'web',
            path: '/realtime/socket.io',
            deviceId: getDeviceId(),
            token: token
          });
          self.socket = socket;

          socket.on('connect', function () {
            console.log('[Expense App] realtime connected', socket.id);
            self.emitLocal('socket:connect', { id: socket.id });
          });
          socket.on('connect_error', function (err) {
            console.warn('[Expense App] realtime connect_error', (err && err.message) || err);
            self.emitLocal('socket:error', { error: (err && err.message) || String(err) });
          });
          socket.on('disconnect', function (reason) {
            console.warn('[Expense App] realtime disconnect', reason);
            self.emitLocal('socket:disconnect', { reason: reason });
          });

          // Capture raw packets in case expense keys arrive outside the SDK fan-out.
          if (typeof socket.onAny === 'function') {
            socket.onAny(function (eventName, payload) {
              if (eventName === 'biz1:ready' || eventName === 'rooms:refresh') return;
              if (eventName === 'biz1:event') {
                var wrappedKey = eventKeyOf(payload);
                if (!isExpenseRealtimeKey(wrappedKey)) return;
                // Prefer the dedicated SDK key listeners; this is a safety net only.
                return;
              }
              if (isExpenseRealtimeKey(eventName)) {
                self.emitLocal(
                  normalizeEventKey(eventName),
                  Object.assign({}, typeof payload === 'object' && payload ? payload : {}, { key: eventName })
                );
              }
            });
          }

          return socket;
        }

        // Fallback without SDK
        if (self.socket) {
          try {
            self.socket.disconnect();
          } catch (e2) {
            /* ignore */
          }
        }
        self.socket = ioFn(self.domain, {
          transports: ['websocket', 'polling'],
          path: '/realtime/socket.io',
          withCredentials: true,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 15000,
          auth: {
            bearer: token,
            deviceId: getDeviceId(),
            platform: 'web',
            fcmToken: '',
            lastEventId: 0
          }
        });
        self.socket.on('biz1:event', function (event) {
          self.handleBiz1Event(event, 'biz1:event');
          if (event && event.id) {
            try {
              self.socket.emit('realtime:ack', { eventId: event.id });
            } catch (e3) {
              /* ignore */
            }
          }
        });
        self.socket.on('biz1:ready', function (payload) {
          console.log('[Expense App] realtime ready', payload);
          self.emitLocal('biz1:ready', payload || {});
        });
        self.socket.on('connect', function () {
          self.emitLocal('socket:connect', { id: self.socket.id });
        });
        self.socket.on('connect_error', function (err) {
          self.emitLocal('socket:error', { error: (err && err.message) || String(err) });
        });
        self.socket.on('disconnect', function (reason) {
          self.emitLocal('socket:disconnect', { reason: reason });
        });
        return self.socket;
      })
      .catch(function (err) {
        console.warn('[Expense App] socket.io load/connect failed', err);
        self.emitLocal('socket:error', { error: String((err && err.message) || err) });
        return null;
      });
  };

  ExpenseApi.prototype.onRealtime = function (eventKey, handler) {
    if (!this.handlers[eventKey]) this.handlers[eventKey] = [];
    this.handlers[eventKey].push(handler);
    var self = this;
    return function () {
      self.handlers[eventKey] = (self.handlers[eventKey] || []).filter(function (fn) {
        return fn !== handler;
      });
    };
  };

  ExpenseApi.prototype.emitLocal = function (eventKey, payload) {
    (this.handlers[eventKey] || []).slice().forEach(function (handler) {
      handler(payload);
    });
  };

  ExpenseApi.prototype.isRealtimeConnected = function () {
    return !!(this.socket && this.socket.connected);
  };

  ExpenseApi.prototype.disconnectRealtime = function () {
    if (this._biz1 && this._biz1.realtime) {
      try {
        this._biz1.realtime.disconnect();
      } catch (e) {
        /* ignore */
      }
    }
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch (e2) {
        /* ignore */
      }
    }
    this.socket = null;
  };

  ExpenseApi.prototype.listExpenses = async function (filters) {
    var raw = await this.request('Expenses.List', Object.assign({ limit: 25 }, filters || {}));
    var rows = listRows(raw);
    return { rows: rows, total: Number(raw.count || raw.total || rows.length), raw: raw };
  };

  ExpenseApi.prototype.countExpenses = async function (filters) {
    var raw = await this.request('Expenses.Count', filters || {});
    return Number(raw.count || raw.total || 0);
  };

  ExpenseApi.prototype.getExpense = async function (id) {
    var raw = await this.request('Expenses.Get', { id: id });
    return raw.data || raw;
  };

  ExpenseApi.prototype.addExpense = async function (form) {
    var payload = this.buildExpensePayload(form);
    if (form.file) payload.file = form.file;
    return this.request('Expenses.Add', payload);
  };

  ExpenseApi.prototype.updateExpense = async function (id, form) {
    var month = form.month || '';
    var ym = String(month).match(/^(\d{4})-(\d{2})$/);
    if (ym) month = ym[2] + String(ym[1]).slice(-2);

    var payload = {
      id: id,
      category_id: form.category_id,
      amount: form.amount,
      document_type: form.document_type,
      month: month,
      notes: form.notes,
      payment_date: form.payment_date || undefined,
      invoice_number: form.invoice_number || undefined
    };
    return this.request('Expenses.Update', payload);
  };

  ExpenseApi.prototype.deleteExpense = async function (id) {
    return this.request('Expenses.Delete', { id: id });
  };

  ExpenseApi.prototype.buildExpensePayload = function (form) {
    var month = form.month || '';
    var ym = String(month).match(/^(\d{4})-(\d{2})$/);
    if (ym) month = ym[2] + String(ym[1]).slice(-2);

    return {
      category_id: form.category_id,
      amount: form.amount,
      document_type: form.document_type,
      month: month,
      vat_includes: form.vat_includes ? 1 : 0,
      notes: form.notes,
      payment_date: form.payment_date || undefined,
      invoice_number: form.invoice_number || undefined,
      project_id: form.project_id || undefined,
      customer_id: form.customer_id || undefined,
      subcategory_id: form.subcategory_id || undefined,
      sub_category: form.subcategory_id || undefined,
      check_number: form.check_number || undefined,
      document_date: form.document_date || undefined,
      expenses_name: form.name || undefined,
      supplier_id: form.supplier_id || undefined,
      // supplier_name: form.supplier_name || undefined
    };
  };

  ExpenseApi.prototype.listCustomers = async function () {
    var raw = await this.request('Customer.List', { length: 25, start: 0, draw: 1 });
    return listRows(raw)
      .map(function (row) {
        return { id: optionId(row), label: optionLabel(row, ['name', 'full_name', 'company', 'email']) };
      })
      .filter(function (o) {
        return o.id !== '';
      });
  };

  ExpenseApi.prototype.listProjects = async function () {
    var raw = await this.request('Projects.List', { limit: 25 });
    return listRows(raw)
      .map(function (row) {
        return { id: optionId(row), label: optionLabel(row, ['name', 'title', 'project_name']) };
      })
      .filter(function (o) {
        return o.id !== '';
      });
  };

  ExpenseApi.prototype.getProjectName = async function (id) {
    var target = String(id);
    if (!target || target === '0') return '';
    var start = 0;
    while (start < 200) {
      try {
        var raw = await this.request('Projects.List', { limit: 25, start: start, offset: start });
        var rows = listRows(raw);
        var hit = rows.find(function (row) {
          return optionId(row) === target;
        });
        if (hit) return optionLabel(hit, ['name', 'title', 'project_name']);
        if (rows.length < 25) break;
        start += 25;
      } catch (e) {
        break;
      }
    }
    start = 0;
    while (start < 200) {
      try {
        var rawP = await this.request('Products.List', { limit: 25, start: start, offset: start });
        var rowsP = listRows(rawP);
        var hitP = rowsP.find(function (row) {
          return optionId(row) === target;
        });
        if (hitP) return optionLabel(hitP, ['product_name', 'name', 'title']);
        if (rowsP.length < 25) break;
        start += 25;
      } catch (e2) {
        break;
      }
    }
    return '';
  };

  ExpenseApi.prototype.listSuppliers = async function () {
    var raw = await this.request('Suppliers.List', { for_product: 1, limit: 25 });
    return listRows(raw)
      .map(function (row) {
        return { id: optionId(row), label: optionLabel(row, ['name', 'supplier_name', 'contact_name']) };
      })
      .filter(function (o) {
        return o.id !== '';
      });
  };

  ExpenseApi.prototype.listExpenseCategories = async function (parentId) {
    parentId = parentId || 0;
    var raw = await this.request('Expenses.CategoriesList', {
      parent_id: parentId,
      limit: 25,
      include_other: parentId === 0 ? 1 : 0
    });
    return listRows(raw)
      .map(function (row) {
        return {
          id: optionId(row),
          label: optionLabel(row, ['name', 'name_en', 'name_he', 'category', 'title']),
          parent: row.parent_id !== undefined ? String(row.parent_id) : undefined
        };
      })
      .filter(function (o) {
        return o.id !== '';
      });
  };

  ExpenseApi.prototype.resolveExpenseCategoryName = async function (id, lang) {
    var target = String(id);
    if (!target) return '';
    if (target === '0') return lang === 'he' ? 'אחרים' : 'Other';
    var start = 0;
    while (start < 500) {
      try {
        var raw = await this.request('Expenses.CategoriesList', { all: 1, include_other: 1, limit: 25, start: start });
        var rows = listRows(raw);
        var hit = rows.find(function (row) {
          return optionId(row) === target;
        });
        if (hit) {
          if (lang === 'he') return optionLabel(hit, ['name_he', 'name', 'name_en']);
          return optionLabel(hit, ['name_en', 'name', 'name_he']);
        }
        if (rows.length < 25) break;
        start += 25;
      } catch (e) {
        break;
      }
    }
    return '';
  };

  function extractUser(basic) {
    var data = (basic && basic.data) || basic || {};
    return data.user || data || {};
  }

  function saveUserSession(user, email) {
    localStorage.setItem(USER_KEY, JSON.stringify(user || {}));
    localStorage.setItem(EMAIL_KEY, email);
  }

  function clearUserSession() {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(CRED_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    localStorage.removeItem(EMAIL_KEY);
  }

  function getStoredUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  function getStoredEmail() {
    return localStorage.getItem(EMAIL_KEY) || '';
  }

  function isAuthenticated() {
    return !!(localStorage.getItem(TOKEN_KEY) && getStoredUser());
  }

  function displayName() {
    var user = getStoredUser() || {};
    return String(user.name || user.email || getStoredEmail() || 'User');
  }

  function saveRemember(username, password, remember) {
    if (remember) {
      localStorage.setItem(REMEMBER_KEY, '1');
      localStorage.setItem(CRED_KEY, btoa(unescape(encodeURIComponent(JSON.stringify({ username: username, password: password })))));
    } else {
      localStorage.removeItem(REMEMBER_KEY);
      localStorage.removeItem(CRED_KEY);
    }
  }

  function loadRemember() {
    if (localStorage.getItem(REMEMBER_KEY) !== '1') return null;
    try {
      return JSON.parse(decodeURIComponent(escape(atob(localStorage.getItem(CRED_KEY) || ''))));
    } catch (e) {
      return null;
    }
  }

  function formatExpenseMonth(value, lang) {
    if (value === undefined || value === null || String(value).trim() === '') return '';
    var text = String(value).trim();
    var locale = lang === 'he' ? 'he-IL' : 'en-US';
    var year = null;
    var month = null;
    var yyyyMm = text.match(/^(\d{4})-(\d{2})$/);
    if (yyyyMm) {
      year = Number(yyyyMm[1]);
      month = Number(yyyyMm[2]);
    }
    var mmYy = text.match(/^(\d{2})(\d{2})$/);
    if (!yyyyMm && mmYy) {
      month = Number(mmYy[1]);
      year = 2000 + Number(mmYy[2]);
    }
    if (!year || !month || month < 1 || month > 12) return text;
    return new Date(year, month - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }

  function isEmptyId(value) {
    if (value === undefined || value === null) return true;
    var text = String(value).trim();
    return text === '' || text === '0' || text === 'null' || text === 'undefined';
  }

  function displayValue(value, fallback) {
    fallback = fallback || '—';
    if (value === undefined || value === null) return fallback;
    var text = String(value).trim();
    if (text === '' || text === '0') return fallback;
    return text;
  }

  function formatAmount(amount) {
    var n = Number(amount);
    if (Number.isNaN(n)) return String(amount == null ? '—' : amount);
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  global.ExpenseApp = {
    api: new ExpenseApi(),
    Biz1ApiError: Biz1ApiError,
    isAuthenticated: isAuthenticated,
    getStoredUser: getStoredUser,
    getStoredEmail: getStoredEmail,
    displayName: displayName,
    saveRemember: saveRemember,
    loadRemember: loadRemember,
    formatExpenseMonth: formatExpenseMonth,
    isEmptyId: isEmptyId,
    displayValue: displayValue,
    formatAmount: formatAmount,
    apiDomain: apiDomain
  };
})(window);
