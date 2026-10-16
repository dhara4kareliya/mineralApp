/**
 * Chasdei Shlomo — Multi-Tenant & Domain Configuration
 * Follows standard Biz1 multi-tenant architecture:
 * 1. URL Query param (?tenant=..., ?user=..., ?domain=...)
 * 2. Hostname Subdomain (e.g. [tenant].bull36.com, [tenant].biz1.co.il)
 * 3. Path prefix (e.g. apps.biz1.co.il/[tenant]/...)
 * 4. Stored session tenant in localStorage (chasdei_user_domain)
 * 5. Default fallback tenant (chasdeyshlomo)
 */
(function () {
  'use strict';

  var IGNORED_PATH_PREFIXES = {
    'demo apps': 1,
    'demo': 1,
    'assets': 1,
    'css': 1,
    'js': 1,
    'index': 1,
    'login': 1,
    'chasdeishlomo': 1
  };

  function isHandle(value) {
    return /^[a-z0-9][a-z0-9._-]{0,40}$/i.test(String(value || '').trim());
  }

  function normalizeTenantUser(raw) {
    var s = String(raw == null ? '' : raw).trim().toLowerCase();
    s = s.replace(/^https?:\/\//, '');
    s = s.replace(/\.bull36\.com.*$/i, '');
    s = s.replace(/\.biz1\.co\.il.*$/i, '');
    s = s.split('/')[0];
    s = s.replace(/[^a-z0-9-]/g, '');
    return s || 'chasdeyshlomo';
  }

  function resolveApiRoot() {
    var host = String(
      (typeof location !== 'undefined' && location.hostname) || ''
    ).toLowerCase();
    return host.indexOf('biz1.co.il') >= 0 ? 'biz1.co.il' : 'bull36.com';
  }

  function resolveTenantUser(fallback) {
    // 1. URL Query Parameter (?tenant=..., ?user=..., ?domain=...)
    try {
      if (typeof location !== 'undefined' && location.search) {
        var sp = new URLSearchParams(location.search);
        var qTenant = sp.get('tenant') || sp.get('user') || sp.get('domain');
        if (qTenant && isHandle(qTenant)) return normalizeTenantUser(qTenant);
      }
    } catch (_) {}

    // 2. Hostname Subdomain (e.g. bhavesh.bull36.com, szp123.biz1.co.il)
    try {
      if (typeof location !== 'undefined' && location.hostname) {
        var host = String(location.hostname).toLowerCase();
        var parts = host.split('.');
        if (parts.length >= 3) {
          var sub = parts[0];
          if (sub !== 'apps' && sub !== 'www' && sub !== 'localhost' && isHandle(sub)) {
            return normalizeTenantUser(sub);
          }
        }
      }
    } catch (_) {}

    // 3. Path Folder (e.g. /apps.biz1.co.il/bhavesh/...)
    try {
      if (typeof location !== 'undefined' && location.pathname) {
        var pathParts = String(location.pathname).split('/').filter(Boolean);
        if (pathParts.length && isHandle(pathParts[0])) {
          var seg = pathParts[0].toLowerCase();
          if (!IGNORED_PATH_PREFIXES[seg]) {
            return normalizeTenantUser(seg);
          }
        }
      }
    } catch (_) {}

    // 4. Session / Stored Tenant from Login
    try {
      if (typeof localStorage !== 'undefined') {
        var stored = localStorage.getItem('chasdei_user_domain') || localStorage.getItem('entries_biz1_login_name');
        if (stored && isHandle(stored)) return normalizeTenantUser(stored);
      }
    } catch (_) {}

    // 5. Default Fallback
    return normalizeTenantUser(fallback || 'chasdeyshlomo');
  }

  function resolveDomain(fallback) {
    return 'https://' + resolveTenantUser(fallback) + '.' + resolveApiRoot();
  }

  var CIPHER_KEY = 'CHASDEY_SHLOMO_APP_SECRET_2026';

  // Ensure window.APP_CONFIG exists with CIPHER_KEY
  window.APP_CONFIG = window.APP_CONFIG || {};
  window.APP_CONFIG.CIPHER_KEY = window.APP_CONFIG.CIPHER_KEY || CIPHER_KEY;

  window.Biz1Config = {
    user: resolveTenantUser('chasdeyshlomo'),
    defaultPassword: '9cTx4UBEa3',
    passivePassword: '12345',
    apiToken: '58CZS49DFHNN4KD24933',
    defaultFolderId: 3122,
    CIPHER_KEY: CIPHER_KEY,
    apiBase: 'https://bull36.com/api',
    endpoints: {
      getFolders: 'https://bull36.com/api/get_folders?api_token=58CZS49DFHNN4KD24933',
      getFolderById: 'https://bull36.com/api/get_folder_by_id?token=58CZS49DFHNN4KD24933&folder_id=',
      getEntries: 'https://bull36.com/api/get_entries?token=58CZS49DFHNN4KD24933',
      getEntriesByTabId: 'https://bull36.com/api/get_entries_by_tab_id?token=58CZS49DFHNN4KD24933&entry_id='
    },
    brand: {
      he: 'חסדי שלמה — תיקי לקוחות, הכנסות והוצאות',
      en: 'Chasdei Shlomo — Customer Finance'
    },
    normalizeTenantUser: normalizeTenantUser,
    resolveApiRoot: resolveApiRoot,
    resolveTenantUser: function () {
      return resolveTenantUser(this.user);
    },
    resolveDomain: function () {
      return resolveDomain(this.user);
    },
    encryptPayload: function (payloadObj, customKey) {
      if (window.CryptoUtil && typeof window.CryptoUtil.encryptPayload === 'function') {
        return window.CryptoUtil.encryptPayload(payloadObj, customKey || this.CIPHER_KEY);
      }
      return '';
    },
    decryptPayload: function (cipherText, customKey) {
      if (window.CryptoUtil && typeof window.CryptoUtil.decryptPayload === 'function') {
        return window.CryptoUtil.decryptPayload(cipherText, customKey || this.CIPHER_KEY);
      }
      return null;
    }
  };
})();
