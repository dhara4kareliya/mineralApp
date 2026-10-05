/**
 * Expense Hub — tenant connection
 *
 * API host root follows the apps URL:
 *   apps.bull36.com/eli/...  → https://eli.bull36.com  (dev)
 *   apps.biz1.co.il/eli/...   → https://eli.biz1.co.il  (live)
 *
 * Tenant username = folder that contains the app folder
 * (e.g. /eli/kophangan-expenses/expenses.html → eli).
 * If the URL has no tenant folder, the hostname subdomain is used
 * (e.g. eli.biz1.co.il → eli).
 * Otherwise ?tenant=<name>, and finally DEFAULT_TENANT.
 */
(function () {
  var DEFAULT_TENANT = 'kophangan';

  var RESERVED_SUBDOMAINS = {
    apps: 1,
    www: 1,
    files: 1,
    localhost: 1
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

  /** /eli/kophangan-expenses/expenses.html → eli */
  function pathUsername() {
    try {
      var parts = String(location.pathname || '')
        .split('/')
        .filter(Boolean);
      if (parts.length && /\.[a-z0-9]+$/i.test(parts[parts.length - 1])) parts.pop();
      if (parts.length < 2) return '';
      var tenant = parts[parts.length - 2];
      if (!isHandle(tenant)) return '';
      return normalizeTenantUser(tenant);
    } catch (e) {
      return '';
    }
  }

  /** eli.biz1.co.il → eli */
  function hostUsername() {
    var host = String((typeof location !== 'undefined' && location.hostname) || '').toLowerCase();
    var sub = host.split('.')[0];
    if (!sub || host.split('.').length < 3 || RESERVED_SUBDOMAINS[sub] || !isHandle(sub)) return '';
    return normalizeTenantUser(sub);
  }

  var TENANT_OVERRIDE_KEY = 'expense_app_tenant';

  /**
   * Local testing fallback: ?tenant=eli (remembered in localStorage so it
   * survives navigation between login.html and expenses.html).
   */
  function overrideUsername() {
    try {
      var fromQuery = normalizeTenantUser(new URLSearchParams(location.search || '').get('tenant') || '');
      if (fromQuery) {
        localStorage.setItem(TENANT_OVERRIDE_KEY, fromQuery);
        return fromQuery;
      }
      return normalizeTenantUser(localStorage.getItem(TENANT_OVERRIDE_KEY) || '');
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
    return pathUsername() || hostUsername() || overrideUsername() || DEFAULT_TENANT;
  }

  function resolveDomain() {
    var tenant = resolveTenantUser();
    return tenant ? 'https://' + tenant + '.' + resolveApiRoot() : '';
  }

  var tenantUser = resolveTenantUser();

  window.APP_CONFIG = {
    API_DOMAIN: tenantUser ? 'https://' + tenantUser + '.' + resolveApiRoot() : '',
    APP_VERSION: '1.6.0',
    user: tenantUser,
    normalizeTenantUser: normalizeTenantUser,
    pathUsername: pathUsername,
    hostUsername: hostUsername,
    resolveApiRoot: resolveApiRoot,
    resolveTenantUser: resolveTenantUser,
    resolveDomain: resolveDomain
  };
})();
