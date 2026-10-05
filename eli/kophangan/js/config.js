/**
 * Expense Hub — tenant connection
 *
 * API host root follows the apps URL:
 *   apps.bull36.com/eli/...  → https://eli.bull36.com  (dev)
 *   apps.biz1.co.il/eli/...   → https://eli.biz1.co.il  (live)
 *
 * Tenant username = first path folder (e.g. /eli/kophangan-expenses/ → eli).
 * Default / fallback user: eli
 */
(function () {
  var APP_SEGMENTS = {
    'kophangan-expenses': 1,
    kophangan: 1,
    expenses: 1,
    assets: 1,
    css: 1,
    js: 1,
    index: 1,
    login: 1
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

  /** /eli/kophangan-expenses/ → eli */
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
    return 'eli';
  }

  function resolveDomain() {
    return 'https://' + resolveTenantUser() + '.' + resolveApiRoot();
  }

  window.APP_CONFIG = {
    API_DOMAIN: resolveDomain(),
    APP_VERSION: '1.3.0',
    user: 'eli',
    normalizeTenantUser: normalizeTenantUser,
    pathUsername: pathUsername,
    resolveApiRoot: resolveApiRoot,
    resolveTenantUser: resolveTenantUser,
    resolveDomain: resolveDomain
  };
})();
