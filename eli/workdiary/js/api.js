/**
 * Biz1 API client — local SDK only (CSP script-src 'self').
 */
const Api = (function () {
  let client = null;
  let sdkLoaded = false;
  const LOCAL_SDK_SRC = 'js/biz1-sdk.js';

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"], script[src^="${src}?"]`);
      if (existing) {
        if (src.indexOf('biz1-sdk') !== -1 && window.Biz1SDK) {
          resolve();
          return;
        }
        if (existing.getAttribute('data-load-ok') === '1') {
          resolve();
          return;
        }
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Failed to load ' + src)));
        return;
      }
      // Prefer static tags; do not inject remote scripts (CSP / ZIP scanners).
      reject(new Error('Script not present: ' + src));
    });
  }

  async function ensureSdk(domain) {
    const base = String(domain || AppConfig.getDomain()).replace(/\/+$/, '');
    if (window.Biz1SDK) {
      sdkLoaded = true;
    } else if (!sdkLoaded) {
      await loadScript(LOCAL_SDK_SRC);
      if (!window.Biz1SDK) {
        throw new Error('Biz1 SDK missing. Deploy js/biz1-sdk.js with the app.');
      }
      sdkLoaded = true;
    }
    // Socket.IO optional — only if already provided by a static tag.
    return base;
  }

  async function init(domain) {
    const base = await ensureSdk(domain || AppConfig.getDomain());
    if (!window.Biz1SDK || !window.Biz1SDK.Biz1Client) {
      throw new Error('Biz1 SDK missing. Deploy js/biz1-sdk.js with the app.');
    }
    client = new Biz1SDK.Biz1Client({
      domain: base,
      storage: localStorage,
      io: window.io
    });
    return client;
  }

  function getClient() {
    if (!client) throw new Error('API not initialized. Login first.');
    return client;
  }

  function isLoggedIn() {
    try {
      return !!getClient().getToken();
    } catch {
      return false;
    }
  }

  function buildLoginBody(credentials) {
    const body = {
      password: credentials.password || '',
      otp: credentials.otp || ''
    };
    const identifier = String(credentials.username || credentials.email || '').trim();
    if (/^\d+$/.test(identifier)) {
      body.id = identifier;
    } else if (identifier.includes('@')) {
      body.email = identifier;
    } else {
      body.username = identifier;
    }
    return body;
  }

  async function login(credentials) {
    const domain = AppConfig.getDomain();
    await init(domain);
    const data = await getClient().request('Login', buildLoginBody(credentials), { public: true });

    if (data.token) getClient().setToken(data.token);

    if (data.otp_required) {
      return { otpRequired: true, message: data.message || 'Enter the code sent to your email.' };
    }
    if (!data.token && !getClient().getToken()) {
      throw new Error(data.message || 'Login failed');
    }
    return { success: true, data };
  }

  async function fetchUserBasic() {
    return getClient().account.basic();
  }

  async function teamHoursGet() {
    return getClient().request('TeamHours.Get');
  }

  async function teamHoursStartStop(params) {
    return getClient().request('TeamHours.StartStop', params);
  }

  async function teamHoursWhenStop() {
    return getClient().request('TeamHours.WhenStop');
  }

  async function teamHoursList(filters) {
    return getClient().list('TeamHours.List', filters || { limit: 25 });
  }

  async function teamHoursCount(filters) {
    return getClient().count('TeamHours.Count', filters || {});
  }

  async function workdiaryList(monthKey) {
    return getClient().request('Workdiary.List', { sm_date: monthKey, limit: 25 });
  }

  async function workdiaryGet(monthKey, options) {
    options = options || {};
    const body = {
      sm_date: monthKey,
      this_day: options.thisDay || 'all_data'
    };
    if (options.sick !== undefined && options.sick !== '') body.sick = options.sick;
    if (options.sickDay !== undefined && options.sickDay !== '') body.sick_day = options.sickDay;
    return getClient().request('Workdiary.Get', body);
  }

  async function workdiaryAttendanceSave(data) {
    return getClient().request('Workdiary.Attendance.Save', data);
  }

  async function workdiarySettingsGet() {
    const user = typeof Auth !== 'undefined' ? Auth.getUser() : null;
    const userId = user?.data?.user?.id;
    const body = {};
    if (userId) body.user_id = userId;
    return getClient().request('Workdiary.Settings.Get', body);
  }

  async function workingTimeList(filters) {
    return getClient().list('WorkingTime.List', filters || { limit: 25 });
  }

  function logout() {
    if (client) {
      try { client.logout(); } catch (_) { /* ignore */ }
      client = null;
    }
    try {
      localStorage.removeItem('biz1_sdk_bearer_token');
    } catch (_) { /* ignore */ }
  }

  return {
    init,
    getClient,
    isLoggedIn,
    login,
    fetchUserBasic,
    teamHoursGet,
    teamHoursStartStop,
    teamHoursWhenStop,
    teamHoursList,
    teamHoursCount,
    workdiaryList,
    workdiaryGet,
    workdiaryAttendanceSave,
    workdiarySettingsGet,
    workingTimeList,
    logout
  };
})();
