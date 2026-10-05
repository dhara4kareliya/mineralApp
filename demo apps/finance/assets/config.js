/**
 * Finance / Executive Analytics — tenant connection
 *
 * API host root follows the apps URL:
 *   apps.bull36.com/demo/...  → https://demo.bull36.com  (dev)
 *   apps.biz1.co.il/demo/...   → https://demo.biz1.co.il  (live)
 *
 * Tenant username = first path folder (e.g. /demo/finance/ → demo).
 * Default / fallback user: demo
 */
(function () {
  var APP_SEGMENTS = {
    finance: 1,
    assets: 1,
    css: 1,
    js: 1,
    index: 1,
    login: 1
  };

  function normalizeTenantUser(raw) {
    var s = String(raw == null ? "" : raw).trim().toLowerCase();
    s = s.replace(/^https?:\/\//, "");
    s = s.replace(/\.bull36\.com.*$/i, "");
    s = s.replace(/\.biz1\.co\.il.*$/i, "");
    s = s.split("/")[0];
    s = s.replace(/[^a-z0-9-]/g, "");
    return s;
  }

  function isHandle(value) {
    return /^[a-z0-9][a-z0-9._-]{0,40}$/i.test(String(value || "").trim());
  }

  /** /demo/finance/ → demo */
  function pathUsername() {
    try {
      var parts = String(location.pathname || "")
        .split("/")
        .filter(Boolean);
      if (!parts.length) return "";
      var first = parts[0].replace(/\.html$/i, "");
      if (!isHandle(first)) return "";
      if (APP_SEGMENTS[first.toLowerCase()]) return "";
      return normalizeTenantUser(first);
    } catch (e) {
      return "";
    }
  }

  /** bull36.com = dev, biz1.co.il = live */
  function resolveApiRoot() {
    var host = String(
      (typeof location !== "undefined" && location.hostname) || ""
    ).toLowerCase();
    return host.indexOf("biz1.co.il") >= 0 ? "biz1.co.il" : "bull36.com";
  }

  function resolveTenantUser(cfg) {
    cfg = cfg || {};
    var fromPath = pathUsername();
    if (fromPath) return fromPath;
    return normalizeTenantUser(cfg.user || cfg.tenant || cfg.account || "demo") || "demo";
  }

  function resolveDomain(cfg) {
    cfg = cfg || {};
    return "https://" + resolveTenantUser(cfg) + "." + resolveApiRoot();
  }

  window.Biz1Config = {
    /** Fallback tenant when URL path has no folder (e.g. localhost) */
    user: "demo",

    brand: {
      en: "Biz1 Showcase",
      he: "תצוגת Biz1"
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
