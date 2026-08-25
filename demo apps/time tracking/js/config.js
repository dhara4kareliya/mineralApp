/**
 * App configuration.
 */
const AppConfig = {
  STORAGE_KEYS: {
    theme: 'tt_theme',
    lang: 'tt_lang',
    breakState: 'tt_break_state'
  },

  DEFAULT_DOMAIN: 'https://eli.bull36.com',

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
  }
};
