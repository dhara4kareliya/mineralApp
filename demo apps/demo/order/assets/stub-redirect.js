/** Stub page redirect — external for CSP. */
(function () {
  var q = window.location.search || '';
  location.replace('index.html' + q);
})();
