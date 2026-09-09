/**
 * Biz1 API client for Entries module (Login, User.Basic, Entries.*, realtime).
 * Docs: https://eli.bull36.com/app/help/category/Entries
 */
(function (global) {
  'use strict';

  var TOKEN_KEY = 'entries_biz1_token';
  var CREDS_KEY = 'entries_biz1_creds';
  var REMEMBER_KEY = 'entries_biz1_remember';
  var USER_KEY = 'entries_biz1_user';
  var DEVICE_KEY = 'entries_biz1_device';
  var LAST_EVENT_KEY = 'entries_biz1_last_event';

  var socket = null;

  function cfg() {
    return global.EntriesConfig || {};
  }

  function isAccountHandle(value) {
    var text = String(value || '').trim();
    return /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,40}$/.test(text);
  }

  function accountUsernameFromBasic(basic) {
    if (!basic) return '';
    var data = (basic && basic.data) || basic || {};
    var user = getUserRecord(basic);
    var org = data.org || {};
    var candidates = [
      user.user_name, user.username,
      org.user_name, org.username,
      data.user_name, data.username
    ];
    for (var i = 0; i < candidates.length; i += 1) {
      if (isAccountHandle(candidates[i])) return String(candidates[i]).trim();
    }
    return '';
  }

  function accountUsername(basic) {
    var fromBasic = accountUsernameFromBasic(basic || loadUserBasic());
    if (fromBasic) return fromBasic;
    var forced = cfg().USERNAME;
    if (forced) return String(forced).trim();
    var parts = String((global.location && location.pathname) || '').split('/').filter(Boolean);
    for (var i = 0; i < parts.length; i += 1) {
      if (parts[i].toLowerCase() === 'entries' && i > 0 && isAccountHandle(parts[i - 1])) {
        rememberPathUsername(parts[i - 1]);
        return parts[i - 1];
      }
    }
    var pathStored = '';
    try { pathStored = sessionStorage.getItem('entries_biz1_path_user') || ''; } catch (e) { pathStored = ''; }
    if (isAccountHandle(pathStored) && !/^(entries|login|css|js)$/i.test(pathStored)) return pathStored;
    var stored = storageGet('entries_biz1_login_name');
    if (isAccountHandle(stored)) return stored;
    var host = String(cfg().API_DOMAIN || '').replace(/^https?:\/\//, '').split('/')[0];
    var sub = host.split('.')[0];
    if (isAccountHandle(sub) && !/^(www|apps|eli|user)$/i.test(sub)) return sub;
    return '';
  }

  function apiDomain() {
    var user = accountUsername();
    if (user) return ('https://' + user + '.bull36.com').replace(/\/+$/, '');
    return String(cfg().API_DOMAIN || 'https://eli.bull36.com').replace(/\/+$/, '');
  }

  function appsHost() {
    return String(cfg().APPS_HOST || 'https://apps.bull36.com').replace(/\/+$/, '');
  }

  function appOrigin() {
    try {
      if (location.origin) return location.origin;
    } catch (e) { /* ignore */ }
    return String(location.protocol + '//' + location.host);
  }

  function isLocalHost() {
    var host = String((global.location && location.hostname) || '');
    return host === 'localhost' || host === '127.0.0.1';
  }

  function sameLocation(url) {
    try {
      var next = new URL(url, location.href);
      function norm(path) {
        var p = String(path || '/');
        if (p.length > 1 && p.slice(-1) === '/') p = p.slice(0, -1);
        return p;
      }
      return next.origin === location.origin && norm(next.pathname) === norm(location.pathname);
    } catch (e) {
      return false;
    }
  }

  function isAppsHost() {
    return String((global.location && location.hostname) || '').indexOf('apps.bull36.com') >= 0;
  }

  function appFilesUrl() {
    return appHomeUrl();
  }

  function appHomeUrl(username) {
    var user = String(username || accountUsername() || '').trim();
    if (!user) {
      if (isAppsHost()) return appsHost() + '/szp123/entries/';
      try { return new URL('./', location.href).href; } catch (e) { return './'; }
    }
    if (isAppsHost()) {
      return appsHost() + '/' + encodeURIComponent(user) + '/entries/';
    }
    return appOrigin() + '/' + encodeURIComponent(user) + '/entries/';
  }

  function appLoginUrl(username) {
    return appHomeUrl(username);
  }

  function rememberPathUsername(name) {
    var user = String(name || '').trim();
    if (!isAccountHandle(user) || /^(entries|login|css|js)$/i.test(user)) return;
    try { sessionStorage.setItem('entries_biz1_path_user', user); } catch (e) { /* ignore */ }
  }

  function ensureAccountUrl(username) {
    var user = String(username || accountUsername() || '').trim();
    if (!user) return false;
    rememberPathUsername(user);
    var dest = appHomeUrl(user);
    if (sameLocation(dest)) return false;
    location.replace(dest);
    return true;
  }

  function storageGet(key) {
    try {
      return localStorage.getItem(key) || sessionStorage.getItem(key) || '';
    } catch (e) {
      return '';
    }
  }

  function storageSet(key, value, remember) {
    try {
      if (remember) {
        localStorage.setItem(key, value);
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, value);
        localStorage.removeItem(key);
      }
    } catch (e) { /* ignore */ }
  }

  function storageRemove(key) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (e) { /* ignore */ }
  }

  function getToken() {
    return storageGet(TOKEN_KEY);
  }

  function setToken(token, remember) {
    if (!token) {
      storageRemove(TOKEN_KEY);
      return;
    }
    storageSet(TOKEN_KEY, token, remember !== false);
  }

  function clearSession() {
    storageRemove(TOKEN_KEY);
    storageRemove(USER_KEY);
    storageRemove(CREDS_KEY);
    disconnectRealtime();
  }

  function saveCredentials(username, password, remember) {
    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, '1');
      else localStorage.removeItem(REMEMBER_KEY);
      storageSet(CREDS_KEY, JSON.stringify({ username: username, password: password }), !!remember);
    } catch (e) { /* ignore */ }
  }

  function loadCredentials() {
    try {
      var remember = localStorage.getItem(REMEMBER_KEY) === '1';
      var raw = storageGet(CREDS_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.username) return null;
      return {
        username: parsed.username,
        password: parsed.password || '',
        remember: remember
      };
    } catch (e) {
      return null;
    }
  }

  function saveUserBasic(basic) {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(basic));
    } catch (e) { /* ignore */ }
  }

  function loadUserBasic() {
    try {
      var raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function deviceId() {
    var id = storageGet(DEVICE_KEY);
    if (id) return id;
    id = 'web-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    try { localStorage.setItem(DEVICE_KEY, id); } catch (e) { /* ignore */ }
    return id;
  }

  function request(route, data, options) {
    options = options || {};
    data = data || {};
    var body = new URLSearchParams();
    Object.keys(data).forEach(function (key) {
      var value = data[key];
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        body.set(key, JSON.stringify(value));
        return;
      }
      body.set(key, String(value));
    });

    var headers = {};
    if (!options.public) {
      var token = getToken();
      if (!token) return Promise.reject(new Error('Bearer token is missing. Please login again.'));
      headers.Authorization = 'Bearer ' + token;
    }

    return fetch(apiDomain() + '/app/' + route, {
      method: 'POST',
      headers: headers,
      body: body
    }).then(function (res) {
      return res.json().then(function (json) {
        if (!res.ok && res.status === 401) {
          throw new Error((json && json.message) || 'Session expired. Please login again.');
        }
        return json;
      }, function () {
        throw new Error('Invalid response from ' + route + ' (' + res.status + ')');
      });
    });
  }

  function login(params) {
    var identifier = String(params.username || '').trim();
    var payload = {
      username: identifier,
      password: params.password || ''
    };
    if (params.otp) payload.otp = params.otp;
    if (identifier.indexOf('@') >= 0) payload.email = identifier;
    else if (/^\d{7,}$/.test(identifier) && identifier.length <= 15) payload.phone = identifier;
    else if (/^\d+$/.test(identifier)) payload.id = identifier;

    return request('Login', payload, { public: true }).then(function (data) {
      if (data && (data.otp_required || data.otpRequired)) {
        return {
          ok: false,
          otpRequired: true,
          message: String(data.message || 'Verification code required'),
          raw: data
        };
      }
      var token = String((data && data.token) || '');
      if (!token) throw new Error((data && data.message) || 'Login failed');
      var remember = !!params.remember;
      setToken(token, remember);
      saveCredentials(identifier, params.password || '', remember);
      return { ok: true, token: token, expiresAt: (data && data.expires_at) || null, raw: data };
    });
  }

  function fetchUserBasic() {
    return request('User.Basic', {}).then(function (basic) {
      saveUserBasic(basic);
      return basic;
    });
  }

  function currentLang() {
    try {
      if (global.EntriesUI && typeof EntriesUI.getLang === 'function') return EntriesUI.getLang();
    } catch (e) { /* ignore */ }
    return 'he';
  }

  function hasHebrew(value) {
    return /[\u0590-\u05FF]/.test(String(value || ''));
  }

  var HE_TO_EN = {
    'לא שולם': 'Not paid',
    'שולם': 'Paid',
    'נכח': 'Present',
    'לא נכח': 'Absent',
    'שיעור ניסיון': 'Trial lesson',
    'תלמיד חדש': 'New student',
    'לא קיבל': 'Not received',
    'סופק': 'Supplied',
    'תשלום': 'Payment',
    'סטטוס גביה': 'Collection status',
    'סטטוס אספקה': 'Supply status'
  };

  function localizeHeToEn(text) {
    var key = String(text || '').trim();
    if (HE_TO_EN[key]) return HE_TO_EN[key];
    var trimmed = key.replace(/\s+$/, '');
    if (HE_TO_EN[trimmed]) return HE_TO_EN[trimmed];
    return '';
  }

  function humanizeEn(text) {
    var s = String(text || '').replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
    if (!s) return '';
    if (s.length <= 3 && /[a-z]/i.test(s)) return s.toUpperCase();
    return s.replace(/\b[a-zA-Z]/g, function (ch) { return ch.toUpperCase(); });
  }

  function pickLangText(he, en, fallback) {
    var lang = currentLang();
    var heText = he != null && String(he).trim() ? String(he).trim() : '';
    var enText = en != null && String(en).trim() ? String(en).trim() : '';

    if (lang === 'en') {
      if (enText && !hasHebrew(enText)) return humanizeEn(enText);
      if (enText && hasHebrew(enText)) return localizeHeToEn(enText) || humanizeEn(enText);
      if (heText) return localizeHeToEn(heText) || heText;
      return fallback || '';
    }

    return heText || enText || fallback || '';
  }

  function tabName(tab) {
    if (!tab) return '';
    return pickLangText(
      tab.name_he,
      tab.name_en || tab.customer_name || tab.name,
      String(tab.name || tab.customer_name || ('Entry ' + tab.id))
    );
  }

  function groupName(group) {
    if (!group) return '';
    return pickLangText(group.he, group.en, String(group.en || group.he || ''));
  }

  function getEntryTabs(basic) {
    var entries = (basic && basic.data && basic.data.entries) || {};
    var listRaw = Array.isArray(entries.list) ? entries.list : [];
    var tabsRaw = Array.isArray(entries.tabs) ? entries.tabs : [];
    var tabs = tabsRaw.length ? tabsRaw : listRaw;
    var list = listRaw.length ? listRaw : tabs;
    return {
      list: list,
      tabs: tabs,
      groups: Array.isArray(entries.tabs_group_details) ? entries.tabs_group_details : []
    };
  }

  function stripDoubleQuotes(value) {
    return String(value == null ? '' : value).replace(/[\u0022\u05F4\u201C\u201D\u201E\u201F\u2033]/g, '');
  }

  function customerName(row) {
    if (!row) return '';
    var data = row.entry_customer_data || row.customer_data || row.customer || {};
    var name = pickLangText(
      data.name_he || row.customer_name_he || row.cust_name_he,
      data.name_en || row.customer_name_en || data.name || row.customer_name || row.cust_name,
      ''
    );
    if (name) return stripDoubleQuotes(name);
    var id = row.customer_id || row.cust_id;
    return id ? '#' + id : '';
  }

  function rowCustomerId(row) {
    if (!row) return '';
    var data = row.entry_customer_data || row.customer_data || row.customer || {};
    return String(
      row.customer_id ||
      row.cust_id ||
      row.entry_cust_id ||
      data.id ||
      data.customer_id ||
      data.cust_id ||
      ''
    );
  }

  function findTab(basic, entryId) {
    if (entryId == null || entryId === '') return null;
    var tabsInfo = getEntryTabs(basic);
    var sources = tabsInfo.tabs.concat(tabsInfo.list);
    for (var i = 0; i < sources.length; i += 1) {
      var id = sources[i].id != null ? sources[i].id : sources[i].entry_id;
      if (String(id) === String(entryId)) return sources[i];
    }
    return null;
  }

  function fieldNumber(field, index) {
    var n = Number(
      field.field_no != null ? field.field_no
        : (field.number != null ? field.number
          : (field.field != null ? field.field : index + 1))
    );
    return isFinite(n) && n > 0 ? n : index + 1;
  }

  function looksLikeFieldId(value) {
    var text = String(value || '').trim();
    if (!text) return true;
    if (/^[a-f0-9]{16,}$/i.test(text)) return true;
    if (/^\d{10,}/.test(text)) return true;
    return false;
  }

  function readableFieldText(value) {
    var text = String(value == null ? '' : value).trim();
    if (!text || looksLikeFieldId(text)) return '';
    return text;
  }

  function fieldLabel(field, index) {
    if (!field) return 'Field ' + (index + 1);
    var he = readableFieldText(field.label_he || field.name_he || field.title_he);
    var en = readableFieldText(
      field.label_en || field.name_en || field.label || field.title || field.caption
    );
    var fallback = readableFieldText(field.label || field.title) ||
      ('Field ' + fieldNumber(field, index));
    return pickLangText(he, en, fallback);
  }

  function fieldInputType(field) {
    return String((field && (field.input_type || field.type || field.field_type)) || 'text').toLowerCase();
  }

  function isCustomerRelationField(field, row, index) {
    var type = fieldInputType(field);
    if (type === 'customer' || type === 'related_customer') return true;
    if (!row || !field) return false;
    var n = fieldNumber(field, index || 0);
    if (relatedFieldName(row, n)) return true;
    var related = row['data' + n + '_customer'];
    return !!(related && typeof related === 'object' && !Array.isArray(related));
  }

  function fieldOptions(field) {
    if (!field) return [];
    var lang = currentLang();
    var map = lang === 'en'
      ? (field.opt_name_en || field.opt_name_he)
      : (field.opt_name_he || field.opt_name_en);
    if (!map || typeof map !== 'object' || Array.isArray(map)) {
      if (Array.isArray(field.options)) {
        return field.options.map(function (opt, i) {
          if (opt && typeof opt === 'object') {
            return { id: String(opt.value != null ? opt.value : opt.id || i), label: String(opt.label || opt.name || opt.value || '') };
          }
          return { id: String(opt), label: String(opt) };
        });
      }
      return [];
    }
    return Object.keys(map).map(function (id) {
      var label = String(map[id]);
      if (currentLang() === 'en' && hasHebrew(label)) {
        label = localizeHeToEn(label) || label;
      }
      return { id: id, label: label };
    });
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function isDateFieldType(type) {
    var t = String(type || '').toLowerCase();
    return t.indexOf('date') >= 0;
  }

  function formatDateValue(value) {
    var text = String(value == null ? '' : value).trim();
    if (!text) return '';

    var y;
    var m;
    var d;
    var hh = '00';
    var mm = '00';
    var ss = '00';
    var matched = false;

    var iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (iso) {
      y = iso[1];
      m = iso[2];
      d = iso[3];
      if (iso[4] != null) {
        hh = pad2(iso[4]);
        mm = pad2(iso[5]);
        ss = iso[6] != null ? pad2(iso[6]) : '00';
      }
      matched = true;
    }

    if (!matched) {
      var dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
      if (dmy) {
        y = dmy[3];
        m = pad2(dmy[2]);
        d = pad2(dmy[1]);
        if (dmy[4] != null) {
          hh = pad2(dmy[4]);
          mm = pad2(dmy[5]);
          ss = dmy[6] != null ? pad2(dmy[6]) : '00';
        }
        matched = true;
      }
    }

    if (!matched) {
      var parsed = new Date(text);
      if (isNaN(parsed.getTime())) return text;
      y = String(parsed.getFullYear());
      m = pad2(parsed.getMonth() + 1);
      d = pad2(parsed.getDate());
      hh = pad2(parsed.getHours());
      mm = pad2(parsed.getMinutes());
      ss = pad2(parsed.getSeconds());
    }

    return y + '-' + m + '-' + d + ' ' + hh + ':' + mm + ':' + ss;
  }

  function objectDisplayName(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return '';
    var name = pickLangText(
      obj.name_he || obj.cust_name_he || obj.label_he,
      obj.name_en || obj.name || obj.full_name || obj.label || obj.title || obj.company || obj.company_name,
      ''
    );
    return name ? stripDoubleQuotes(name) : '';
  }

  function relatedFieldName(row, n) {
    if (!row) return '';
    var prefix = 'data' + n;
    var direct = row[prefix + '_name'] || row[prefix + '_label'] || row[prefix + '_title'] || row[prefix + '_text'];
    if (direct && typeof direct === 'object') return objectDisplayName(direct);
    if (direct != null && String(direct).trim() !== '') return stripDoubleQuotes(String(direct));

    var nestedKeys = [
      prefix + '_customer',
      prefix + '_user',
      prefix + '_member',
      prefix + '_team',
      prefix + '_related',
      prefix + '_option'
    ];
    for (var i = 0; i < nestedKeys.length; i += 1) {
      var named = objectDisplayName(row[nestedKeys[i]]);
      if (named) return named;
    }
    return '';
  }

  function displayFieldValue(field, row, index) {
    var n = fieldNumber(field, index || 0);
    var related = relatedFieldName(row, n);
    if (related) return related;

    var raw = row ? row['data' + n] : '';
    if (raw == null || raw === '') return '';
    var type = fieldInputType(field);
    if (type === 'select' || type === 'customer' || type === 'team_member' || type === 'yes_no') {
      var opts = fieldOptions(field);
      for (var i = 0; i < opts.length; i += 1) {
        if (String(opts[i].id) === String(raw)) return stripDoubleQuotes(opts[i].label || '');
      }
    }
    if (isDateFieldType(type)) return formatDateValue(raw);
    return stripDoubleQuotes(String(raw));
  }

  function getTabStatuses(tab) {
    if (!tab) return [];
    if (Array.isArray(tab.status) && tab.status.length) return tab.status;
    if (Array.isArray(tab.statuses) && tab.statuses.length) return tab.statuses;
    var map = tab.status;
    if (map && typeof map === 'object' && !Array.isArray(map)) {
      return Object.keys(map).map(function (id) {
        var item = map[id];
        if (item && typeof item === 'object') {
          return Object.assign({ id: item.id != null ? item.id : id }, item);
        }
        return { id: id, label: String(item), label_en: String(item) };
      });
    }
    return [];
  }

  function findStatusField(tab) {
    var fields = tab && Array.isArray(tab.fields) ? tab.fields : [];
    for (var i = 0; i < fields.length; i += 1) {
      var field = fields[i] || {};
      var name = String(field.name || '').toLowerCase();
      var type = fieldInputType(field);
      if (name === 'status' || type === 'status' || type.indexOf('status') >= 0) return field;
    }
    return null;
  }

  function rowStatusId(row) {
    if (!row) return '';
    var candidates = [row.status, row.status_id, row.entry_status];
    for (var i = 0; i < candidates.length; i += 1) {
      if (candidates[i] != null && String(candidates[i]).trim() !== '') {
        return String(candidates[i]).trim();
      }
    }
    return '';
  }

  function rowStatusName(row) {
    if (!row) return '';
    var name = row.status_name || row.status_label || row.status_title || '';
    return name != null ? String(name).trim() : '';
  }

  function rowStatusColor(row) {
    if (!row) return '';
    var color = row.status_color || row.status_color_name || row.color_name || row.color || '';
    return color != null ? String(color).trim() : '';
  }

  function rowStatusRaw(tab, row) {
    var id = rowStatusId(row);
    if (id) return id;
    var named = rowStatusName(row);
    if (named) return named;
    var field = findStatusField(tab);
    if (field) {
      var n = fieldNumber(field, 0);
      var fromField = row && row['data' + n];
      if (fromField != null && String(fromField).trim() !== '') return String(fromField).trim();
    }
    return '';
  }

  function statusLabel(item) {
    if (!item) return '';
    return pickLangText(item.label_he, item.label_en, String(item.label || item.name || ''));
  }

  function statusOptionValue(item) {
    if (!item) return '';
    if (item.id != null && String(item.id) !== '') return String(item.id);
    if (item.status_id != null && String(item.status_id) !== '') return String(item.status_id);
    if (item.label_en) return String(item.label_en);
    if (item.label_he) return String(item.label_he);
    if (item.name) return String(item.name);
    return '';
  }

  function findStatusItem(tab, raw) {
    var value = String(raw == null ? '' : raw).trim();
    var statuses = getTabStatuses(tab);
    if (!value || !statuses.length) return null;
    for (var i = 0; i < statuses.length; i += 1) {
      var item = statuses[i] || {};
      var candidates = [
        item.id, item.status_id, item.name, item.label_en, item.label_he, statusOptionValue(item)
      ];
      for (var j = 0; j < candidates.length; j += 1) {
        if (candidates[j] != null && String(candidates[j]) === value) return item;
      }
    }
    for (var k = 0; k < statuses.length; k += 1) {
      var statusItem = statuses[k];
      if (statusLabel(statusItem).toLowerCase() === value.toLowerCase()) return statusItem;
    }
    return null;
  }

  function matchStatusValue(tab, raw) {
    var item = findStatusItem(tab, raw);
    return item ? statusOptionValue(item) : String(raw == null ? '' : raw);
  }

  function resolveStatus(tab, row) {
    var raw = rowStatusRaw(tab, row);
    var named = rowStatusName(row);
    var colored = rowStatusColor(row);
    if (!raw && !named) return null;

    var item = findStatusItem(tab, raw || named);
    if (item) {
      return {
        label: named || statusLabel(item) || raw,
        color: colored || item.color_name || item.color || '',
        raw: raw || named
      };
    }

    if (named) {
      return { label: named, color: colored || '', raw: raw || named };
    }

    var field = findStatusField(tab);
    if (field) {
      var opts = fieldOptions(field);
      for (var i = 0; i < opts.length; i += 1) {
        if (String(opts[i].id) === raw) {
          return { label: opts[i].label || raw, color: colored || '', raw: raw };
        }
      }
    }

    return { label: raw, color: colored || '', raw: raw };
  }

  function statusColumnName(tab) {
    var names = (tab && tab.status_names) || {};
    return pickLangText(names.he, names.en, currentLang() === 'he' ? 'סטטוס' : 'Status');
  }

  function orderedColumns(tab) {
    var fields = tab && Array.isArray(tab.fields) ? tab.fields : [];
    var byName = {};
    fields.forEach(function (field) {
      if (field && field.name) byName[String(field.name)] = field;
    });
    var order = tab && Array.isArray(tab.field_order) ? tab.field_order : [];
    var cols = [];
    var used = {};
    order.forEach(function (key) {
      key = String(key || '');
      if (!key) return;
      if (key === 'status') {
        cols.push({ kind: 'status' });
        used.status = true;
        return;
      }
      if (byName[key]) {
        cols.push({ kind: 'field', field: byName[key] });
        used[key] = true;
      }
    });
    fields.forEach(function (field) {
      if (field && field.name && !used[field.name]) {
        cols.push({ kind: 'field', field: field });
      }
    });
    if (!used.status && getTabStatuses(tab).length) {
      cols.unshift({ kind: 'status' });
    }
    return cols;
  }

  function getUserRecord(basic) {
    var data = (basic && basic.data) || basic || {};
    return data.user || data.login_user || data.member || (basic && basic.user) || {};
  }

  function isMeaningfulIdentityValue(value) {
    var text = String(value == null ? '' : value).trim();
    if (!text) return false;
    if (/^[-–—._]+$/.test(text)) return false;
    if (/^(null|undefined|n\/a|na|none|unknown)$/i.test(text)) return false;
    return true;
  }

  function getUserDisplayName(basic) {
    var data = (basic && basic.data) || basic || {};
    var user = getUserRecord(basic);
    var full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    var lang = currentLang();
    var enFirst = [
      user.name_en, user.english_name, user.full_name_en, user.display_name_en
    ];
    var any = [
      user.full_name, user.fullname, user.display_name, user.name, full,
      user.username, user.user_name, user.email, user.login,
      data.name, data.username, data.email
    ];
    var candidates = lang === 'en' ? enFirst.concat(any) : any.concat(enFirst);
    for (var i = 0; i < candidates.length; i += 1) {
      var value = candidates[i] && String(candidates[i]).trim();
      if (!isMeaningfulIdentityValue(value)) continue;
      if (lang === 'en' && hasHebrew(value)) {
        var translated = localizeHeToEn(value);
        if (translated) return translated;
        continue;
      }
      return value;
    }
    if (lang === 'en') {
      for (var j = 0; j < any.length; j += 1) {
        if (isMeaningfulIdentityValue(any[j])) return String(any[j]).trim();
      }
    }
    var creds = loadCredentials();
    if (isMeaningfulIdentityValue(creds && creds.username)) return String(creds.username).trim();
    var stored = storageGet('entries_biz1_login_name');
    if (isMeaningfulIdentityValue(stored)) return String(stored).trim();
    var handle = accountUsername(basic);
    if (isMeaningfulIdentityValue(handle)) return String(handle).trim();
    return 'User';
  }

  function getUserEmail(basic) {
    var data = (basic && basic.data) || basic || {};
    var user = getUserRecord(basic);
    var email = user.email || user.mail || user.user_email || data.email || '';
    return isMeaningfulIdentityValue(email) ? String(email).trim() : '';
  }

  function getFolders(basic) {
    var data = (basic && basic.data) || basic || {};
    var folders = data.folders || data.folder || basic.folders || basic.folder || [];
    return Array.isArray(folders) ? folders : [];
  }

  function folderId(folder) {
    if (!folder) return '';
    return String(folder.id || folder.folder_id || folder.folders_id || '');
  }

  function folderName(folder) {
    if (!folder) return '';
    return pickLangText(folder.name_he, folder.name_en || folder.name, String(folder.name || folder.id || ''));
  }

  function folderCount(folder) {
    if (!folder) return 0;
    return Number(
      folder.customers_count != null ? folder.customers_count
        : (folder.cust_count != null ? folder.cust_count
          : (folder.count != null ? folder.count
            : (folder.total != null ? folder.total
              : (folder.recordsTotal != null ? folder.recordsTotal : 0))))
    ) || 0;
  }

  function folderSearchNames(folder) {
    if (!folder) return [];
    return [
      folder.name_en, folder.en, folder.name_he, folder.he, folder.name, folder.title, folder.label
    ].map(function (value) {
      return String(value || '').trim().toLowerCase();
    }).filter(Boolean);
  }

  function isCustomerListFolder(folder) {
    var names = folderSearchNames(folder);
    for (var i = 0; i < names.length; i += 1) {
      var name = names[i];
      if (
        name === 'yzurim' ||
        name === 'customers' ||
        name === 'customer' ||
        name === 'customer list' ||
        name === 'customers list' ||
        name === 'לקוחות' ||
        name === 'רשימת לקוחות'
      ) {
        return true;
      }
    }
    return false;
  }

  function getCustomerListFolderId(basic) {
    var forced = String((cfg().DEFAULT_CUSTOMER_FOLDER_ID || '')).trim();
    if (forced) return forced;
    var folders = getFolders(basic);
    for (var i = 0; i < folders.length; i += 1) {
      if (isCustomerListFolder(folders[i])) return folderId(folders[i]);
    }
    return '';
  }

  function getDefaultFolderId(basic) {
    var data = (basic && basic.data) || basic || {};
    var settings = data.settings || {};
    var id = settings.default_folder || settings.default_folder_id || data.default_folder || '';
    if (id) return String(id);
    var folders = getFolders(basic);
    return folders.length ? folderId(folders[0]) : '';
  }

  function getTeamMembers(basic) {
    var data = (basic && basic.data) || basic || {};
    var team = data.team_members || data.team || [];
    return Array.isArray(team) ? team : [];
  }

  function teamMemberName(member) {
    if (!member) return '';
    var full = [member.first_name, member.last_name].filter(Boolean).join(' ').trim();
    return pickLangText(
      member.name_he,
      member.name_en ||
        member.full_name ||
        member.name ||
        full ||
        member.user_name ||
        member.username ||
        member.email,
      String(member.name || member.user_name || member.username || member.email || member.id || '')
    );
  }

  function teamMemberId(member) {
    if (!member) return '';
    return String(member.id || member.user_id || member.member_id || '');
  }

  function tabRefId(tab) {
    if (!tab) return '';
    if (tab.id != null && tab.id !== '') return String(tab.id);
    if (tab.entry_id != null && tab.entry_id !== '') return String(tab.entry_id);
    return '';
  }

  function filterGroupsByTabs(groups, tabs) {
    var ids = {};
    (tabs || []).forEach(function (tab) {
      var id = tabRefId(tab);
      if (id) ids[id] = true;
    });
    return (groups || []).map(function (group) {
      var refs = (group.tab_id || []).filter(function (ref) {
        return ids[String(ref && ref.id)];
      });
      if (!refs.length) return null;
      return Object.assign({}, group, { tab_id: refs });
    }).filter(Boolean);
  }

  function getTabsInGroup(basic, group, tabs) {
    if (!group || !Array.isArray(group.tab_id)) return [];
    var all = Array.isArray(tabs) && tabs.length
      ? tabs.slice()
      : getEntryTabs(basic).tabs.concat(getEntryTabs(basic).list);
    return group.tab_id.slice().sort(function (a, b) {
      return Number(a.position || 0) - Number(b.position || 0);
    }).map(function (ref) {
      var id = String(ref.id);
      for (var i = 0; i < all.length; i += 1) {
        if (tabRefId(all[i]) === id) return all[i];
      }
      return { id: ref.id, entry_id: ref.id, name_en: 'Entry ' + ref.id };
    });
  }

  function getUngroupedTabs(basic, groups, tabs) {
    var tabsInfo = getEntryTabs(basic);
    var source = Array.isArray(tabs) ? tabs : (tabsInfo.list.length ? tabsInfo.list : tabsInfo.tabs);
    var groupList = Array.isArray(groups) ? groups : tabsInfo.groups;
    var inGroup = {};
    (groupList || []).forEach(function (group) {
      (group.tab_id || []).forEach(function (ref) {
        inGroup[String(ref && ref.id)] = true;
      });
    });
    return (source || []).filter(function (tab) {
      return !inGroup[tabRefId(tab)];
    });
  }

  function customerListName(customer) {
    if (!customer) return '';
    var name = pickLangText(
      customer.name_he || customer.cust_name_he,
      customer.name_en || customer.name || customer.full_name || customer.cust_name,
      String(customer.name || customer.id || '')
    );
    return EntriesUI.decodeHtmlEntities ? EntriesUI.decodeHtmlEntities(name) : name;
  }

  function customerListLabel(customer) {
    if (!customer) return '';
    var company = customer.company || customer.company_name || '';
    if (EntriesUI.decodeHtmlEntities) company = EntriesUI.decodeHtmlEntities(company);
    var name = pickLangText(
      customer.name_he || customer.cust_name_he,
      customer.name_en || customer.name || customer.full_name || customer.cust_name,
      String(customer.name || customer.id || '')
    );
    if (EntriesUI.decodeHtmlEntities) name = EntriesUI.decodeHtmlEntities(name);
    if (company && name && company !== name) return name + ' — ' + company;
    return name || company || ('#' + (customer.id || customer.customer_id || ''));
  }

  function customerListId(customer) {
    if (!customer) return '';
    return String(customer.id || customer.customer_id || customer.cust_id || '');
  }

  function customerFolderId(customer) {
    if (!customer) return '';
    var folders = customer.folders || customer.folder_ids || customer.folderIds;
    if (Array.isArray(folders) && folders.length) {
      return String(folders[0] || '').trim();
    }
    if (typeof folders === 'string' && folders.trim()) {
      var text = folders.trim();
      try {
        var parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length) return String(parsed[0] || '').trim();
      } catch (e) { /* not json */ }
      return text.split(',')[0].replace(/[\[\]"]/g, '').trim();
    }
    return String(
      customer.folder_id ||
      customer.folders_id ||
      customer.folder ||
      customer.default_folder ||
      ''
    ).trim();
  }

  function normalizeSettingFields(fields) {
    if (!fields) return [];
    if (typeof fields === 'string') {
      try { fields = JSON.parse(fields); } catch (e) { return []; }
    }
    if (Array.isArray(fields)) return fields;
    if (typeof fields !== 'object') return [];
    return Object.keys(fields).map(function (key) {
      var field = fields[key];
      if (!field || typeof field !== 'object' || Array.isArray(field)) {
        field = { name: String(field != null ? field : key) };
      }
      field = Object.assign({}, field);
      if (field.field_no == null && /^\d+$/.test(key)) field.field_no = Number(key);
      if (!field.name) field.name = field.label_en || field.label || field.label_he || key;
      return field;
    }).sort(function (a, b) {
      return fieldNumber(a, 0) - fieldNumber(b, 0);
    });
  }

  function normalizeEntrySetting(item) {
    if (!item || typeof item !== 'object') return null;
    var id = item.id != null ? item.id : item.entry_id;
    if (id == null || id === '') return null;
    var fields = normalizeSettingFields(item.fields || item.custom_fields);
    return Object.assign({}, item, {
      id: id,
      entry_id: item.entry_id != null ? item.entry_id : id,
      name_en: item.name_en || item.tab_name_en || item.tab_name_for_customer || item.name,
      name_he: item.name_he || item.tab_name_he,
      name: item.name || item.tab_name_en || item.tab_name_for_customer,
      fields: fields
    });
  }

  function listEntrySettings(params) {
    params = params || {};
    var body = {
      limit: params.limit != null ? params.limit : 25
    };
    if (params.start != null) body.start = params.start;
    var folders = params.folders != null ? params.folders : params.folder_id;
    if (folders != null && String(folders).trim() !== '') {
      body.folders = String(folders).trim();
    }
    if (params.show_in_customer != null && String(params.show_in_customer) !== '') {
      body.show_in_customer = params.show_in_customer;
    }
    return request('EntriesSettings.List', body).then(function (raw) {
      var rows = [];
      if (Array.isArray(raw)) rows = raw;
      else if (Array.isArray(raw.data)) rows = raw.data;
      else if (raw.data && Array.isArray(raw.data.list)) rows = raw.data.list;
      else if (raw.data && Array.isArray(raw.data.data)) rows = raw.data.data;
      else if (Array.isArray(raw.list)) rows = raw.list;
      else if (Array.isArray(raw.settings)) rows = raw.settings;
      var mapped = rows.map(normalizeEntrySetting).filter(Boolean);
      var count = Number(
        raw.recordsFiltered != null ? raw.recordsFiltered
          : (raw.recordsTotal != null ? raw.recordsTotal
            : (raw.count != null ? raw.count : mapped.length))
      ) || mapped.length;
      return { rows: mapped, count: count, raw: raw };
    });
  }

  function listCustomers(params) {
    var pageSize = Math.min(Number(params && params.length) || 25, 25);
    var body = {
      start: params && params.start != null ? params.start : 0,
      length: pageSize,
      limit: pageSize
    };
    if (params && params.search) body.search = String(params.search).trim();
    if (params && params.folder_id) {
      body.folder_id = params.folder_id;
    }
    if (params && params.folder && !body.folder) body.folder = params.folder;
    return request('Customer.List', body).then(function (raw) {
      var rows = Array.isArray(raw.data) ? raw.data : [];
      var count = Number(
        raw.recordsFiltered != null ? raw.recordsFiltered
          : (raw.recordsTotal != null ? raw.recordsTotal
            : (raw.count != null ? raw.count : rows.length))
      ) || rows.length;
      return { rows: rows, count: count, raw: raw };
    });
  }

  function countCustomers(params) {
    var body = {};
    if (params && params.search) body.search = String(params.search).trim();
    if (params && params.folder_id) body.folder_id = params.folder_id;
    if (params && params.folder && !body.folder_id) body.folder = params.folder;
    return request('Customer.Count', body).then(function (raw) {
      if (raw && Number(raw.success) === 0) {
        throw new Error((raw && raw.message) || 'Customer count failed');
      }
      var count = Number(
        raw && (raw.count != null ? raw.count
          : raw.recordsFiltered != null ? raw.recordsFiltered
            : raw.recordsTotal != null ? raw.recordsTotal
              : raw.total)
      );
      if (isNaN(count)) count = 0;
      return { count: count, raw: raw };
    });
  }

  function listFoldersWithCounts(params) {
    var body = {};
    if (params && params.search) body.search = String(params.search).trim();
    if (params && params.status_id != null && params.status_id !== '') body.status_id = params.status_id;
    if (params && params.tag_id != null && params.tag_id !== '') body.tag_id = params.tag_id;
    if (params && params.team_member_id != null && params.team_member_id !== '') body.team_member_id = params.team_member_id;
    return request('Folders.ListWithCounts', body).then(function (raw) {
      if (raw && Number(raw.success) === 0) {
        throw new Error((raw && raw.message) || 'Folders list with counts failed');
      }
      var rows = [];
      if (Array.isArray(raw && raw.data)) rows = raw.data;
      else if (Array.isArray(raw && raw.list)) rows = raw.list;

      var counts = {};
      if (raw && raw.counts && typeof raw.counts === 'object') {
        Object.keys(raw.counts).forEach(function (k) {
          counts[String(k)] = Number(raw.counts[k]) || 0;
        });
      }

      rows.forEach(function (folder) {
        if (!folder) return;
        var id = String(folder.id != null && folder.id !== '' ? folder.id : folder.folder_id || '').trim();
        if (!id) return;
        if (!Object.prototype.hasOwnProperty.call(counts, id)) {
          counts[id] = Number(
            folder.count != null ? folder.count
              : (folder.customer_count != null ? folder.customer_count : 0)
          ) || 0;
        }
      });

      var total = Number(
        raw && (raw.customers_count != null ? raw.customers_count
          : (raw.total_customers != null ? raw.total_customers
            : (raw.total != null ? raw.total : raw.total_count)))
      );
      if (isNaN(total)) {
        total = 0;
        Object.keys(counts).forEach(function (k) {
          total += Number(counts[k]) || 0;
        });
      }

      return { rows: rows, counts: counts, total: total, raw: raw };
    });
  }

  function fetchAllCustomers(options) {
    var pageSize = 25;
    var offset = 0;
    var all = [];
    var total = null;

    function nextPage() {
      return listCustomers({
        start: offset,
        length: pageSize,
        search: options && options.search,
        folder_id: options && options.folder_id
      }).then(function (res) {
        all = all.concat(res.rows);
        total = res.count;
        offset += pageSize;
        if (res.rows.length === pageSize && all.length < total) {
          return nextPage();
        }
        return all;
      });
    }

    return nextPage();
  }

  function stringifySettingsJson(body) {
    if (body.folders != null && typeof body.folders !== 'string') {
      body.folders = JSON.stringify(body.folders);
    }
    ['fields', 'fields_json', 'custom_fields', 'settings', 'shard_with'].forEach(function (key) {
      if (body[key] && typeof body[key] !== 'string') {
        body[key] = JSON.stringify(body[key]);
      }
    });
    return body;
  }

  function addEntrySettings(payload) {
    return request('EntriesSettings.Add', stringifySettingsJson(Object.assign({}, payload || {})));
  }

  function updateEntrySettings(payload) {
    return request('EntriesSettings.Update', stringifySettingsJson(Object.assign({}, payload || {})));
  }

  function removeEntrySettings(id) {
    return request('EntriesSettings.Remove', { id: id });
  }

  function isFieldRequired(field) {
    var v = field.required;
    return v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true';
  }

  function rowId(row) {
    if (!row) return '';
    return String(row.id || row.row_id || row._id || '');
  }

  function applyListSearchParams(body, search) {
    var term = String(search || '').trim();
    if (!term) return;
    body.search = term;
  }

  function rowSearchText(row, tab) {
    if (!row) return '';
    var parts = [];
    var customer = customerName(row);
    if (customer) parts.push(customer);
    if (row.status != null && row.status !== '') parts.push(String(row.status));
    var statusInfo = resolveStatus(tab, row);
    if (statusInfo && statusInfo.label) parts.push(statusInfo.label);
    if (row.customer_name) parts.push(String(row.customer_name));
    if (row.id != null) parts.push(String(row.id));
    if (row.row_id != null) parts.push(String(row.row_id));

    var fields = tab && Array.isArray(tab.fields) ? tab.fields : [];
    fields.forEach(function (field, index) {
      var display = displayFieldValue(field, row, index);
      if (display) parts.push(display);
      var n = fieldNumber(field, index);
      if (row['data' + n] != null && row['data' + n] !== '') {
        parts.push(String(row['data' + n]));
      }
    });

    Object.keys(row).forEach(function (key) {
      if (/^data\d+$/.test(key) && row[key] != null && row[key] !== '') {
        parts.push(String(row[key]));
      }
    });

    return parts.join(' ').toLowerCase();
  }

  function filterRowsBySearch(rows, tab, search) {
    var term = String(search || '').trim().toLowerCase();
    if (!term) return rows || [];
    return (rows || []).filter(function (row) {
      return rowSearchText(row, tab).indexOf(term) >= 0;
    });
  }

  function listEntries(params) {
    var body = {
      entry_id: params.entry_id,
      limit: params.limit != null ? params.limit : (cfg().PAGE_SIZE || 25),
      offset: params.offset || 0,
      start: params.offset || 0,
      order: params.order || 'id_desc'
    };
    applyListSearchParams(body, params.search);
    if (params.customer_id) body.customer_id = params.customer_id;
    console.log('listEntries', body);
    return request('Entries.List', body).then(function (raw) {
      var rows = Array.isArray(raw.data) ? raw.data : [];
      var count = Number(
        raw.recordsFiltered != null ? raw.recordsFiltered
          : (raw.recordsTotal != null ? raw.recordsTotal
            : (raw.count != null ? raw.count : rows.length))
      ) || rows.length;
      return { rows: rows, count: count, raw: raw };
    });
  }

  function fetchAllEntryRows(params) {
    var pageSize = cfg().PAGE_SIZE || 25;
    var all = [];
    var offset = 0;

    function nextPage() {
      return listEntries(Object.assign({}, params, {
        limit: pageSize,
        offset: offset
      })).then(function (listed) {
        all = all.concat(listed.rows);
        if (!listed.rows.length || listed.rows.length < pageSize) {
          return { rows: all, count: all.length, raw: listed.raw };
        }
        offset += pageSize;
        return nextPage();
      });
    }

    return nextPage();
  }

  function countEntries(params) {
    var body = { entry_id: params.entry_id };
    applyListSearchParams(body, params.search);
    if (params.customer_id) body.customer_id = params.customer_id;
    return request('Entries.Count', body).then(function (raw) {
      return Number(raw.count || 0) || 0;
    });
  }

  function addEntry(entryId, fields) {
    var payload = Object.assign({ entry_id: entryId }, fields || {});
    return request('Entries.Add', payload);
  }

  function updateEntry(entryId, id, fields) {
    var payload = Object.assign({ entry_id: entryId, id: id }, fields || {});
    return request('Entries.Update', payload);
  }

  function deleteEntry(entryId, id) {
    return request('Entries.Delete', { entry_id: entryId, id: id });
  }

  function automationLabel(item) {
    if (!item) return '';
    return pickLangText(
      item.name_he || item.title_he,
      item.name_en || item.name || item.title || item.label || item.event,
      String(item.name || item.title || item.event || item.id || '')
    );
  }

  function automationId(item) {
    if (!item) return '';
    if (item.automation_id != null && item.automation_id !== '') return String(item.automation_id);
    if (item.id != null && item.id !== '') return String(item.id);
    return '';
  }

  function listAutomations() {
    return request('Entries.AutomationsList', {}).then(function (raw) {
      var rows = [];
      if (Array.isArray(raw.data)) rows = raw.data;
      else if (Array.isArray(raw.automations)) rows = raw.automations;
      else if (Array.isArray(raw.list)) rows = raw.list;
      else if (raw.data && Array.isArray(raw.data.data)) rows = raw.data.data;
      return { rows: rows || [], count: (rows || []).length, raw: raw };
    });
  }

  function runAutomation(params) {
    var body = {
      automation_id: params.automation_id
    };
    if (params.entry_id) body.entry_id = params.entry_id;
    if (params.ids && params.ids.length) {
      body.ids = params.ids;
      // body.id = params.ids.join(',');
    }
    if (params.customer_ids && params.customer_ids.length) {
      body.customer_ids = params.customer_ids;
    }
    return request('Entries.RunAutomation', body);
  }

  function unwrapCustomerRecord(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var data = raw.data;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      if (data.customer && typeof data.customer === 'object' && !Array.isArray(data.customer)) {
        return data.customer;
      }
      if (data.data && typeof data.data === 'object' && !Array.isArray(data.data) &&
          (data.data.id || data.data.customer_id || data.data.name)) {
        return data.data;
      }
      return data;
    }
    if (raw.customer && typeof raw.customer === 'object') return raw.customer;
    if (raw.id || raw.customer_id || raw.name) return raw;
    return null;
  }

  function getCustomer(customerId) {
    var id = String(customerId || '').trim();
    return request('Customer.Get', { customer_id: id }).then(function (raw) {
      if (raw && Number(raw.success) === 0) {
        throw new Error((raw && raw.message) || 'Customer not found');
      }
      var customer = unwrapCustomerRecord(raw);
      if (!customer) throw new Error((raw && raw.message) || 'Customer not found');
      return { customer: customer, raw: raw };
    });
  }

  function editCustomer(params) {
    var body = Object.assign({}, params || {});
    if (!body.customer_id && body.id) body.customer_id = body.id;
    if (body.extra_fields != null && typeof body.extra_fields !== 'string') {
      body.extra_fields = JSON.stringify(body.extra_fields);
    }
    return request('Customer.Edit', body);
  }

  function deleteCustomer(customerId) {
    return request('Customer.Delete', { customer_id: String(customerId || '').trim() });
  }

  function listCustomerStatuses(params) {
    var body = Object.assign({ limit: 25 }, params || {});
    function page(start, acc) {
      var req = Object.assign({}, body, { start: start });
      return request('CustomerStatuses.List', req).then(function (raw) {
        if (raw && Number(raw.success) === 0) {
          throw new Error((raw && raw.message) || 'Could not load statuses');
        }
        var rows = [];
        if (Array.isArray(raw && raw.data)) rows = raw.data;
        else if (Array.isArray(raw && raw.rows)) rows = raw.rows;
        acc = acc.concat(rows);
        var total = Number(raw && (raw.count || raw.recordsTotal || raw.recordsFiltered) || acc.length);
        if (rows.length && acc.length < total) return page(start + rows.length, acc);
        return acc;
      });
    }
    return page(Number(body.start || body.offset || 0), []);
  }

  function updateCustomerStatusDef(params) {
    var body = Object.assign({}, params || {});
    return request('CustomerStatuses.Update', body);
  }

  function listStatuses(params) {
    return listCustomerStatuses(params);
  }

  function removeCustomerFolder(customerId, folderId) {
    return request('Customer.RemoveFolder', {
      customer_id: String(customerId || '').trim(),
      folder_id: String(folderId || '').trim()
    });
  }

  function removeCustomerTag(customerId, tagId) {
    return request('Customer.RemoveTag', {
      customer_id: String(customerId || '').trim(),
      tag_id: String(tagId || '').trim()
    });
  }

  function runCustomerAutomation(params) {
    var ids = params && params.customer_ids;
    if (Array.isArray(ids)) ids = ids.filter(Boolean).join(',');
    else if (params && params.customer_id) ids = String(params.customer_id);
    else if (ids != null) ids = String(ids);
    return request('Customer.RunAutomation', {
      automation_id: params && params.automation_id,
      customer_ids: ids || ''
    });
  }

  function isEntriesRealtimeKey(key) {
    if (!key) return false;
    var k = String(key).toLowerCase();
    if (/^entries\.(created|updated|deleted|removed)$/.test(k)) return true;
    if (/^entries[\._-]?(created|updated|deleted|removed|add|edit|update|delete)/.test(k)) return true;
    return /entries\.(created|updated|deleted|removed|add|edit|update|delete)/i.test(k);
  }

  function isEntriesSettingsRealtimeKey(key) {
    if (!key) return false;
    var k = String(key).toLowerCase();
    return /entriessettings[\._-]?(created|updated|deleted|removed|add|edit|update|delete)/.test(k) ||
      /entries\.settings/i.test(k);
  }

  function isCustomerRealtimeKey(key) {
    if (!key) return false;
    var k = String(key).toLowerCase();
    if (/^customer[\._-]?(created|updated|deleted|removed|restored|add|edit|update|delete|followup)/.test(k)) {
      return true;
    }
    if (/^crm\.lead\.created/.test(k)) return true;
    if (/^customer\.reminder\.(created|updated|deleted)/.test(k)) return true;
    return false;
  }

  function getRealtimePayload(event) {
    if (!event) return {};
    if (event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)) {
      return event.payload;
    }
    if (event.data && typeof event.data === 'object' && !Array.isArray(event.data)) {
      return event.data;
    }
    return event;
  }

  function getRealtimeEntryId(payload) {
    if (!payload) return null;
    if (payload.entry_id != null && payload.entry_id !== '') return payload.entry_id;
    if (payload.tab_id != null && payload.tab_id !== '') return payload.tab_id;
    if (payload.data && payload.data.entry_id != null) return payload.data.entry_id;
    if (payload.data && payload.data.tab_id != null) return payload.data.tab_id;
    return null;
  }

  function getRealtimeRowId(payload) {
    if (!payload) return '';
    return String(
      payload.id ||
      payload.row_id ||
      (payload.data && (payload.data.id || payload.data.row_id)) ||
      ''
    );
  }

  function getRealtimeCustomerId(payload) {
    if (!payload) return '';
    var id = payload.customer_id != null && payload.customer_id !== ''
      ? payload.customer_id
      : (payload.customerId != null && payload.customerId !== ''
        ? payload.customerId
        : (payload.cust_id != null && payload.cust_id !== ''
          ? payload.cust_id
          : (payload.entry_cust_id != null && payload.entry_cust_id !== ''
            ? payload.entry_cust_id
            : payload.entry_customer_id)));
    if (id != null && id !== '') return String(id);
    if (payload.data && typeof payload.data === 'object') {
      id = payload.data.customer_id != null && payload.data.customer_id !== ''
        ? payload.data.customer_id
        : (payload.data.customerId != null && payload.data.customerId !== ''
          ? payload.data.customerId
          : (payload.data.cust_id != null && payload.data.cust_id !== ''
            ? payload.data.cust_id
            : (payload.data.entry_cust_id != null && payload.data.entry_cust_id !== ''
              ? payload.data.entry_cust_id
              : (payload.data.entry_customer_id != null && payload.data.entry_customer_id !== ''
                ? payload.data.entry_customer_id
                : payload.data.id))));
      if (id != null && id !== '') return String(id);
    }
    return '';
  }

  function rememberRealtimeEventId(eventId) {
    var next = Number(eventId);
    if (!next || isNaN(next)) return true;
    var last = 0;
    try { last = Number(localStorage.getItem(LAST_EVENT_KEY) || 0) || 0; } catch (e) { /* ignore */ }
    if (next === last) return false;
    if (next > last) {
      try { localStorage.setItem(LAST_EVENT_KEY, String(next)); } catch (e) { /* ignore */ }
    }
    return true;
  }

  function connectRealtime(handlers) {
    disconnectRealtime();
    var token = getToken();
    if (!token) return function () {};
    if (typeof global.io !== 'function') {
      console.warn('[EntriesAPI] socket.io-client not loaded; realtime disabled');
      return function () {};
    }

    var onEvent = typeof handlers === 'function' ? handlers : (handlers && handlers.onEvent);
    var onReady = handlers && handlers.onReady;
    var onConnect = handlers && handlers.onConnect;
    var onDisconnect = handlers && handlers.onDisconnect;
    var onError = handlers && handlers.onError;

    var lastEventId = 0;
    try { lastEventId = Number(localStorage.getItem(LAST_EVENT_KEY) || 0) || 0; } catch (e) { /* ignore */ }

    socket = global.io(apiDomain(), {
      transports: ['websocket', 'polling'],
      path: cfg().SOCKET_PATH || '/realtime/socket.io',
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      auth: {
        bearer: token,
        deviceId: deviceId(),
        platform: 'web',
        fcmToken: '',
        lastEventId: lastEventId
      }
    });

    function handleBiz1Event(event) {
      if (event && event.id != null && !rememberRealtimeEventId(event.id)) return;
      if (event && event.id != null && socket) {
        socket.emit('realtime:ack', { eventId: event.id });
      }
      if (typeof onEvent === 'function') onEvent(event || {});
    }

    function handleReady(payload) {
      if (typeof onReady === 'function') onReady(payload || {});
    }

    socket.on('connect', function () {
      if (typeof onConnect === 'function') onConnect();
    });

    socket.on('disconnect', function () {
      if (typeof onDisconnect === 'function') onDisconnect();
    });

    socket.on('connect_error', function (err) {
      if (typeof onError === 'function') onError(err);
    });

    socket.on('biz1:ready', handleReady);
    socket.on('biz1:event', handleBiz1Event);

    socket.on('rooms:refresh', function (event) {
      handleBiz1Event(Object.assign({}, event || {}, { key: 'rooms:refresh' }));
    });

    return function () {
      if (!socket) return;
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('biz1:ready', handleReady);
      socket.off('biz1:event', handleBiz1Event);
      socket.off('rooms:refresh');
      try { socket.disconnect(); } catch (e) { /* ignore */ }
      socket = null;
    };
  }

  function disconnectRealtime() {
    if (socket) {
      try { socket.disconnect(); } catch (e) { /* ignore */ }
      socket = null;
    }
  }

  function isAuthenticated() {
    return !!getToken();
  }

  function requireAuth(loginPage) {
    if (isAuthenticated()) return true;
    var dest = loginPage || appFilesUrl();
    if (!sameLocation(dest)) location.href = dest;
    return false;
  }

  global.EntriesAPI = {
    apiDomain: apiDomain,
    accountUsername: accountUsername,
    accountUsernameFromBasic: accountUsernameFromBasic,
    appHomeUrl: appHomeUrl,
    appLoginUrl: appLoginUrl,
    appFilesUrl: appFilesUrl,
    ensureAccountUrl: ensureAccountUrl,
    sameLocation: sameLocation,
    getToken: getToken,
    setToken: setToken,
    clearSession: clearSession,
    saveCredentials: saveCredentials,
    loadCredentials: loadCredentials,
    saveUserBasic: saveUserBasic,
    loadUserBasic: loadUserBasic,
    login: login,
    fetchUserBasic: fetchUserBasic,
    getEntryTabs: getEntryTabs,
    findTab: findTab,
    tabName: tabName,
    groupName: groupName,
    customerName: customerName,
    rowCustomerId: rowCustomerId,
    fieldNumber: fieldNumber,
    fieldLabel: fieldLabel,
    fieldInputType: fieldInputType,
    isCustomerRelationField: isCustomerRelationField,
    fieldOptions: fieldOptions,
    displayFieldValue: displayFieldValue,
    relatedFieldName: relatedFieldName,
    formatDateValue: formatDateValue,
    isDateFieldType: isDateFieldType,
    resolveStatus: resolveStatus,
    statusColumnName: statusColumnName,
    getTabStatuses: getTabStatuses,
    statusLabel: statusLabel,
    statusOptionValue: statusOptionValue,
    findStatusItem: findStatusItem,
    matchStatusValue: matchStatusValue,
    orderedColumns: orderedColumns,
    getUserDisplayName: getUserDisplayName,
    getUserEmail: getUserEmail,
    getFolders: getFolders,
    folderId: folderId,
    folderName: folderName,
    folderCount: folderCount,
    getDefaultFolderId: getDefaultFolderId,
    getCustomerListFolderId: getCustomerListFolderId,
    getTeamMembers: getTeamMembers,
    teamMemberName: teamMemberName,
    teamMemberId: teamMemberId,
    customerListName: customerListName,
    customerListLabel: customerListLabel,
    customerListId: customerListId,
    customerFolderId: customerFolderId,
    listCustomers: listCustomers,
    countCustomers: countCustomers,
    listFoldersWithCounts: listFoldersWithCounts,
    fetchAllCustomers: fetchAllCustomers,
    getCustomer: getCustomer,
    editCustomer: editCustomer,
    deleteCustomer: deleteCustomer,
    listCustomerStatuses: listCustomerStatuses,
    updateCustomerStatusDef: updateCustomerStatusDef,
    listStatuses: listStatuses,
    removeCustomerFolder: removeCustomerFolder,
    removeCustomerTag: removeCustomerTag,
    runCustomerAutomation: runCustomerAutomation,
    tabRefId: tabRefId,
    filterGroupsByTabs: filterGroupsByTabs,
    getTabsInGroup: getTabsInGroup,
    getUngroupedTabs: getUngroupedTabs,
    listEntrySettings: listEntrySettings,
    addEntrySettings: addEntrySettings,
    updateEntrySettings: updateEntrySettings,
    removeEntrySettings: removeEntrySettings,
    isFieldRequired: isFieldRequired,
    rowId: rowId,
    filterRowsBySearch: filterRowsBySearch,
    listEntries: listEntries,
    fetchAllEntryRows: fetchAllEntryRows,
    countEntries: countEntries,
    addEntry: addEntry,
    updateEntry: updateEntry,
    deleteEntry: deleteEntry,
    listAutomations: listAutomations,
    runAutomation: runAutomation,
    automationLabel: automationLabel,
    automationId: automationId,
    isEntriesRealtimeKey: isEntriesRealtimeKey,
    isEntriesSettingsRealtimeKey: isEntriesSettingsRealtimeKey,
    isCustomerRealtimeKey: isCustomerRealtimeKey,
    getRealtimePayload: getRealtimePayload,
    getRealtimeEntryId: getRealtimeEntryId,
    getRealtimeRowId: getRealtimeRowId,
    getRealtimeCustomerId: getRealtimeCustomerId,
    connectRealtime: connectRealtime,
    disconnectRealtime: disconnectRealtime,
    isAuthenticated: isAuthenticated,
    requireAuth: requireAuth
  };
})(window);
