/**
 * index.html auth gate — external for CSP script-src 'self'.
 * Preserve ?token=… so login can validate via User.Basic.
 */
(function () {
  try {
    var q = location.search || '';
    var h = location.hash || '';
    function hasUrlToken() {
      try {
        var fromSearch = new URLSearchParams(q).get('token');
        if (fromSearch && !/\{\{\s*token\s*\}\}/i.test(String(fromSearch).trim())) return true;
        var hash = String(h || '').replace(/^#/, '');
        var qi = hash.indexOf('?');
        if (qi === -1) return false;
        var fromHash = new URLSearchParams(hash.slice(qi + 1)).get('token');
        return !!(fromHash && !/\{\{\s*token\s*\}\}/i.test(String(fromHash).trim()));
      } catch (e0) {
        return false;
      }
    }
    if (hasUrlToken()) {
      location.replace('login.html' + q + h);
      return;
    }
    var token = localStorage.getItem('biz1_sdk_bearer_token') || '';
    var role = localStorage.getItem('biz1demo_role') || '';
    if (!token || !role) {
      location.replace('login.html');
    }
  } catch (e) {
    try { location.replace('login.html'); } catch (e2) { /* ignore */ }
  }
})();
