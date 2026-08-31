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

  function apiDomain() {
    return String(cfg().API_DOMAIN || 'https://eli.bull36.com').replace(/\/+$/, '');
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
      if (!value) continue;
      if (lang === 'en' && hasHebrew(value)) {
        var translated = localizeHeToEn(value);
        if (translated) return translated;
        continue;
      }
      return value;
    }
    if (lang === 'en') {
      for (var j = 0; j < any.length; j += 1) {
        if (any[j] && String(any[j]).trim()) return String(any[j]).trim();
      }
    }
    var creds = loadCredentials();
    return (creds && creds.username) || storageGet('entries_biz1_login_name') || 'User';
  }

  function getUserEmail(basic) {
    var data = (basic && basic.data) || basic || {};
    var user = getUserRecord(basic);
    var email = user.email || user.mail || user.user_email || data.email || '';
    return email ? String(email).trim() : '';
  }

  function getFolders(basic) {
    var data = (basic && basic.data) || basic || {};
    var folders = data.folders || data.folder || basic.folders || basic.folder || [];
    return Array.isArray(folders) ? folders : [];
  }

  function folderName(folder) {
    if (!folder) return '';
    return pickLangText(folder.name_he, folder.name_en || folder.name, String(folder.name || folder.id || ''));
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

  function getTabsInGroup(basic, group) {
    if (!group || !Array.isArray(group.tab_id)) return [];
    var tabsInfo = getEntryTabs(basic);
    var all = tabsInfo.tabs.concat(tabsInfo.list);
    return group.tab_id.slice().sort(function (a, b) {
      return Number(a.position || 0) - Number(b.position || 0);
    }).map(function (ref) {
      var id = String(ref.id);
      for (var i = 0; i < all.length; i += 1) {
        var tab = all[i];
        var tabId = String(tab.id != null ? tab.id : tab.entry_id);
        if (tabId === id) return tab;
      }
      return { id: ref.id, entry_id: ref.id, name_en: 'Entry ' + ref.id };
    });
  }

  function getUngroupedTabs(basic) {
    var tabsInfo = getEntryTabs(basic);
    var inGroup = {};
    tabsInfo.groups.forEach(function (group) {
      (group.tab_id || []).forEach(function (ref) {
        inGroup[String(ref.id)] = true;
      });
    });
    var source = tabsInfo.list.length ? tabsInfo.list : tabsInfo.tabs;
    return source.filter(function (tab) {
      var id = String(tab.id != null ? tab.id : tab.entry_id);
      return !inGroup[id];
    });
  }

  function customerListLabel(customer) {
    if (!customer) return '';
    var company = customer.company || customer.company_name || '';
    var name = pickLangText(
      customer.name_he || customer.cust_name_he,
      customer.name_en || customer.name || customer.full_name || customer.cust_name,
      String(customer.name || customer.id || '')
    );
    if (company && name && company !== name) return name + ' — ' + company;
    return name || company || ('#' + (customer.id || customer.customer_id || ''));
  }

  function customerListId(customer) {
    if (!customer) return '';
    return String(customer.id || customer.customer_id || customer.cust_id || '');
  }

  function listCustomers(params) {
    var pageSize = Math.min(Number(params && params.length) || 25, 25);
    var body = {
      start: params && params.start != null ? params.start : 0,
      length: pageSize,
      limit: pageSize
    };
    if (params && params.search) body.search = String(params.search).trim();
    if (params && params.folder_id) body.folder_id = params.folder_id;
    if (params && params.folder) body.folder = params.folder;
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

  function isEntriesRealtimeKey(key) {
    if (!key) return false;
    var k = String(key).toLowerCase();
    if (/^entries[\._-]?(created|updated|deleted|removed|add|edit|update|delete)/.test(k)) return true;
    return /entries\.(created|updated|deleted|removed|add|edit|update|delete)/i.test(k);
  }

  function isEntriesSettingsRealtimeKey(key) {
    if (!key) return false;
    var k = String(key).toLowerCase();
    return /entriessettings[\._-]?(created|updated|deleted|removed|add|edit|update|delete)/.test(k) ||
      /entries\.settings/i.test(k);
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
    location.href = loginPage || 'login.html';
    return false;
  }

  global.EntriesAPI = {
    apiDomain: apiDomain,
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
    folderName: folderName,
    getTeamMembers: getTeamMembers,
    teamMemberName: teamMemberName,
    teamMemberId: teamMemberId,
    customerListLabel: customerListLabel,
    customerListId: customerListId,
    listCustomers: listCustomers,
    fetchAllCustomers: fetchAllCustomers,
    getTabsInGroup: getTabsInGroup,
    getUngroupedTabs: getUngroupedTabs,
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
    getRealtimePayload: getRealtimePayload,
    getRealtimeEntryId: getRealtimeEntryId,
    getRealtimeRowId: getRealtimeRowId,
    connectRealtime: connectRealtime,
    disconnectRealtime: disconnectRealtime,
    isAuthenticated: isAuthenticated,
    requireAuth: requireAuth
  };
})(window);
