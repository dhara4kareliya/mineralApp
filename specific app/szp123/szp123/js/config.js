(function () {
  'use strict';

  function pathParts() {
    return String(location.pathname || '').split('/').filter(Boolean);
  }

  function isHandle(value) {
    return /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,40}$/.test(String(value || '').trim());
  }

  /** Username from first path folder, e.g. /eli/szp123-entries/ → eli */
  function pathUsername() {
    var parts = pathParts();
    var exclusions = ['archive8', 'archive9', 'archive10'];

    if (parts.length >= 1 && isHandle(parts[0]) && !/^(css|js|login|index\.html)$/i.test(parts[0])) {
      var firstPart = decodeURIComponent(parts[0]);
      if (!exclusions.includes(firstPart.replace(/\s+/g, '').toLowerCase())) {
        return parts[0];
      }
    }
    for (var i = 0; i < parts.length; i += 1) {
      if (parts[i].toLowerCase() === 'entries' && i > 0 && parts[i - 1].toLowerCase() !== 'entries') {
        var tenant = decodeURIComponent(parts[i - 1]);
        if (!exclusions.includes(tenant.replace(/\s+/g, '').toLowerCase())) {
          return parts[i - 1];
        }
      }
    }
    try {
      var stored = sessionStorage.getItem('entries_biz1_path_user') || '';
      if (stored && isHandle(stored) && !/^(entries|login|css|js)$/i.test(stored)) return stored;
    } catch (e) { /* ignore */ }
    return '';
  }

  /** Deploy folder path: /eli/szp123-entries/ */
  function appBasePath() {
    var parts = pathParts();
    if (parts.length >= 2) {
      return '/' + parts[0] + '/' + parts[1] + '/';
    }
    if (parts.length === 1 && !/\.html$/i.test(parts[0])) {
      return '/' + parts[0] + '/';
    }
    return '/';
  }

  var host = String(location.hostname || '');
  var onBull36 = host.indexOf('bull36.com') >= 0;
  // Dev: bull36.com · Live: biz1.co.il (also default for localhost)
  var apiRoot = onBull36 ? 'bull36.com' : 'biz1.co.il';
  var pathUser = pathUsername() || 'eli';
  var username = pathUser;
  var apiDomain = 'https://' + username + '.' + apiRoot;

  var appsHost = (host.indexOf('apps.') === 0)
    ? (location.protocol + '//' + location.host)
    : (onBull36 ? 'https://apps.bull36.com' : 'https://apps.biz1.co.il');

  try {
    sessionStorage.setItem('entries_biz1_path_user', pathUser);
    sessionStorage.setItem('entries_biz1_app_base', appBasePath());
  } catch (e) { /* ignore */ }

  window.EntriesConfig = {
    USERNAME: username,
    PATH_USERNAME: pathUser,
    APP_BASE_PATH: appBasePath(),
    APPS_HOST: appsHost,
    API_DOMAIN: apiDomain,
    API_ROOT: apiRoot,
    SOCKET_PATH: '/realtime/socket.io',
    SOCKET_SCRIPT: './js/socket.io.js',
    PAGE_SIZE: 25,
    CUSTOMER_PAGE_SIZE: 15,
    DEFAULT_CUSTOMER_FOLDER_ID: '',
    HELP_URL: apiDomain + '/app/help/category/Entries'
  };
})();

/* cache-bust 20260921t1 */
