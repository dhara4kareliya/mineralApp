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
  DEFAULT_DOMAIN: 'https://eli.biz1.co.il',

  /** Tenant / account user */
  USER_NAME: 'eli',

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
    return this.DEFAULT_DOMAIN;
  },

  getUserName() {
    return this.USER_NAME || 'eli';
  }
};
