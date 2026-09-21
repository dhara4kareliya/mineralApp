/**
 * Root redirect — external file for CSP script-src 'self'.
 */
(function () {
  var token = null;
  try {
    token = localStorage.getItem('biz1_sdk_bearer_token');
  } catch (e) { /* ignore */ }
  location.replace(token ? 'app.html' : 'login.html');
})();
