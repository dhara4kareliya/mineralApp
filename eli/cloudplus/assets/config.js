/**
 * CloudPlus — tenant connection
 *
 * API host root follows the apps URL:
 *   apps.bull36.com/eli/...  → https://eli.bull36.com  (dev)
 *   apps.biz1.co.il/eli/...   → https://eli.biz1.co.il  (live)
 *
 * Tenant username = first path folder (e.g. /eli/cloudplus-ticket/ → eli).
 * Default / fallback user: eli
 */
(function () {
  var APP_SEGMENTS = {
    cloudplus: 1,
    'cloudplus-ticket': 1,
    assets: 1,
    css: 1,
    js: 1,
    tickets: 1,
    ticket: 1,
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

  /** /eli/cloudplus-ticket/ → eli */
  function pathUsername() {
    try {
      var parts = String(location.pathname || '')
        .split('/')
        .filter(Boolean);
      if (!parts.length) return '';
      var first = parts[0].replace(/\.html$/i, '');
      if (!isHandle(first)) return '';
      if (APP_SEGMENTS[first.toLowerCase()]) return '';
      if (/^ticket-/i.test(first)) return '';
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

  function resolveTenantUser(cfg) {
    cfg = cfg || {};
    var fromPath = pathUsername();
    if (fromPath) return fromPath;
    return (
      normalizeTenantUser(cfg.user || cfg.tenant || cfg.account || 'eli') || 'eli'
    );
  }

  function resolveDomain(cfg) {
    cfg = cfg || {};
    return 'https://' + resolveTenantUser(cfg) + '.' + resolveApiRoot();
  }

  window.Biz1Config = {
    /** Fallback tenant when URL path has no folder (e.g. localhost) */
    user: 'eli',

    /** App display name — Hebrew + English */
    brand: {
      he: 'קלאודפלוס',
      en: 'CloudPlus'
    },

    normalizeTenantUser: normalizeTenantUser,
    pathUsername: pathUsername,
    resolveApiRoot: resolveApiRoot,
    resolveTenantUser: function () {
      return resolveTenantUser(this);
    },
    resolveDomain: function () {
      return resolveDomain(this);
    }
  };
})();
