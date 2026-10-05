/**
 * Files Data — app configuration
 *
 * API host root follows the apps URL:
 *   apps.bull36.com/demo/...  → https://demo.bull36.com  (dev)
 *   apps.biz1.co.il/demo/...   → https://demo.biz1.co.il  (live)
 *
 * Tenant username = first path folder (e.g. /demo/files/ → demo).
 * Default / fallback user: demo
 */
const AppConfig = (function () {
  var APP_SEGMENTS = {
    files: 1,
    assets: 1,
    css: 1,
    js: 1,
    index: 1,
    login: 1,
    app: 1
  };

  function normalizeTenantUser(raw) {
    var s = String(raw == null ? '' : raw).trim().toLowerCase();
    s = s.replace(/^https?:\/\//, '');
    s = s.replace(/\.bull36\.com.*$/i, '');
    s = s.replace(/\.biz1\.co\.il.*$/i, '');
    s = s.split('/')[0];
    s = s.replace(/[^a-z0-9-]/g, '');
    return s;
  }

  function isHandle(value) {
    return /^[a-z0-9][a-z0-9._-]{0,40}$/i.test(String(value || '').trim());
  }

  /** /demo/files/ → demo */
  function pathUsername() {
    try {
      var parts = String(location.pathname || '')
        .split('/')
        .filter(Boolean);
      if (!parts.length) return '';
      var first = parts[0].replace(/\.html$/i, '');
      if (!isHandle(first)) return '';
      if (APP_SEGMENTS[first.toLowerCase()]) return '';
      return normalizeTenantUser(first);
    } catch (e) {
      return '';
    }
  }

  /** bull36.com = dev, biz1.co.il = live */
  function resolveApiRoot() {
    var host = String(
      (typeof location !== 'undefined' && location.hostname) || ''
    ).toLowerCase();
    return host.indexOf('biz1.co.il') >= 0 ? 'biz1.co.il' : 'bull36.com';
  }

  function resolveTenantUser() {
    var fromPath = pathUsername();
    if (fromPath) return fromPath;
    return normalizeTenantUser(cfg.USER_NAME || 'demo') || 'demo';
  }

  function resolveDomain() {
    return 'https://' + resolveTenantUser() + '.' + resolveApiRoot();
  }

  var cfg = {
    /** Fallback tenant when URL path has no folder (e.g. localhost) */
    USER_NAME: 'demo',

    PAGE_SIZE: 25,
    STORAGE_KEYS: {
      theme: 'files_theme',
      lang: 'files_lang',
      token: 'biz1_sdk_bearer_token',
      userCache: 'files_user_cache'
    },
    REALTIME: {
      path: '/realtime/socket.io',
      platform: 'web'
    },
    /** Load Socket.IO from API host (same-origin CSP may still block cross-host). */
    SOCKET_IO_CLIENTS: [
      '/realtime/socket.io/socket.io.js'
    ],
    SOCKET_EVENTS: [
      'files.deleted',
      'files.updated',
      'filefolders.add.created',
      'filefolders.edit.updated',
      'filefolders.delete.deleted',
      'documents.created',
      'documents.updated',
      'documents.deleted'
    ],
    /** Fallback system folders when FileFolders.List is empty */
    SYSTEM_FOLDERS: [
      { id: 'default', key: 'default', name: 'Default', name_en: 'Default' },
      { id: 'dynamic_pdf', key: 'dynamic_pdf', name: 'Dynamic PDF', name_en: 'Dynamic PDF' },
      { id: 'signs', key: 'signs', name: 'Signs', name_en: 'Signs' },
      { id: 'whatsapp_files', key: 'whatsapp_files', name: 'WhatsApp Files', name_en: 'WhatsApp Files' },
      { id: 'forms', key: 'forms', name: 'Forms', name_en: 'Forms' },
      { id: 'email_files', key: 'email_files', name: 'Email Files', name_en: 'Email Files' }
    ],

    normalizeTenantUser: normalizeTenantUser,
    pathUsername: pathUsername,
    resolveApiRoot: resolveApiRoot,
    resolveTenantUser: resolveTenantUser,
    resolveDomain: resolveDomain,

    getDomain: function () {
      return resolveDomain();
    },
    getUserName: function () {
      return resolveTenantUser();
    },
    getApiRoot: function () {
      return resolveApiRoot();
    }
  };

  // Keep a readable alias for older call sites
  Object.defineProperty(cfg, 'DEFAULT_DOMAIN', {
    get: function () {
      return resolveDomain();
    }
  });

  return cfg;
})();
