function _getPathUser() {
  const RESERVED_NAMES = new Set([
    'archive8', 'archive9', 'archive10',
    'demo apps', 'demo-apps', 'demoapps', 'demo_apps',
    'work-diary', 'workdiary', 'work_diary',
    'specific app', 'specific-app', 'specificapp', 'specific_app',
    'minerals', 'downloads', 'pages', 'js', 'css', 'assets'
  ]);

  try {
    const q = new URLSearchParams(window.location.search || '');
    const param = q.get('tenant') || q.get('user') || q.get('account');
    if (param && /^[a-z0-9][a-z0-9._-]{0,40}$/i.test(param.trim()) && !RESERVED_NAMES.has(param.toLowerCase())) {
      return param.trim().toLowerCase();
    }
  } catch (e) {}

  const path = window.location.pathname || '';
  const parts = path.split('/').filter(Boolean);

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].toLowerCase();
    if (p === 'time' || p === 'timetracking') {
      if (i > 0) {
        const tenant = decodeURIComponent(parts[i - 1]).toLowerCase().trim();
        const tenantClean = tenant.replace(/\s+/g, '');
        if (
          /^[a-z0-9][a-z0-9._-]{0,40}$/i.test(tenant) &&
          !tenant.includes(' ') &&
          !RESERVED_NAMES.has(tenant) &&
          !RESERVED_NAMES.has(tenantClean)
        ) {
          return tenant;
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
