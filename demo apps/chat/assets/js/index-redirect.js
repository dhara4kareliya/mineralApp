/**
 * index.html → login.html (external file for CSP script-src 'self').
 * Preserves ?token=… and other query/hash params.
 */
(function () {
  var target = 'login.html' + (location.search || '') + (location.hash || '');
  location.replace(target);
})();
