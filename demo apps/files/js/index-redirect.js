/**
 * Root redirect — external file for CSP script-src 'self'.
 * Preserves ?token=… (and hash) when sending users to login.
 */
(function () {
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
    } catch (e) {
      return false;
    }
  }

  var stored = null;
  try {
    stored = localStorage.getItem('biz1_sdk_bearer_token');
  } catch (e) { /* ignore */ }

  // URL token must be validated on login page via User.Basic
  if (hasUrlToken()) {
    location.replace('login.html' + q + h);
    return;
  }

  location.replace(stored ? 'app.html' : 'login.html');
})();
