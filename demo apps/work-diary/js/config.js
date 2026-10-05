function _getPathUser() {
  const path = window.location.pathname || '';
  const parts = path.split('/').filter(Boolean);
  const exclusions = ['archive8', 'archive9', 'archive10'];

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].toLowerCase();
    if (p === 'time' || p === 'timetracking' || p === 'calendar') {
      if (i > 0) {
        const tenant = decodeURIComponent(parts[i - 1]).toLowerCase();
        if (!exclusions.includes(tenant.replace(/\s+/g, ''))) {
          return parts[i - 1];
        }
      }
    }
  }
  return 'demo';
}

/**
 * App configuration.
 */
const AppConfig = {
  STORAGE_KEYS: {
    theme: 'tt_theme',
    lang: 'tt_lang',
    breakState: 'tt_break_state'
  },

  /** API host — tenant subdomain on biz1.co.il */
  DEFAULT_DOMAIN: 'https://demo.biz1.co.il',

  /** Tenant / account user */
  USER_NAME: 'demo',

  REALTIME: {
    path: '/realtime/socket.io',
    platform: 'web'
  },

  SOCKET_EVENTS: [
    'team_hours.started',
    'team_hours.stopped',
    'start_customer_working_hours',
    'workingtime.created',
    'workingtime.updated'
  ],

  getDomain() {
    const tenant = _getPathUser();
    return `https://${tenant}.biz1.co.il`;
  },

  getUserName() {
    return _getPathUser();
  }
};
