(function () {
  'use strict';

  function pathUsername() {
    var parts = String(location.pathname || '').split('/').filter(Boolean);
    for (var i = 0; i < parts.length; i += 1) {
      if (parts[i].toLowerCase() === 'entries' && i > 0 && parts[i - 1].toLowerCase() !== 'entries') {
        return parts[i - 1];
      }
    }
    try {
      var stored = sessionStorage.getItem('entries_biz1_path_user') || '';
      if (stored && stored.toLowerCase() !== 'entries') return stored;
    } catch (e) { /* ignore */ }
    return '';
  }

  var username = pathUsername();
  var apiDomain = username
    ? ('https://' + username + '.bull36.com')
    : 'https://szp123.bull36.com';

  window.EntriesConfig = {
    USERNAME: username,
    APPS_HOST: 'https://apps.bull36.com',
    API_DOMAIN: apiDomain,
    SOCKET_PATH: '/realtime/socket.io',
    SOCKET_SCRIPT: apiDomain + '/realtime/socket.io/socket.io.js',
    PAGE_SIZE: 25,
    CUSTOMER_PAGE_SIZE: 15,
    DEFAULT_CUSTOMER_FOLDER_ID: '2716',
    HELP_URL: apiDomain + '/app/help/category/Entries'
  };
})();
