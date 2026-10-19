/**
 * Authentication flow with OTP support.
 */
const Auth = (function () {
  let userBasic = null;
  let pendingCredentials = null;

  function getUser() {
    return userBasic;
  }

  async function completeLogin(credentials) {
    const result = await Api.login(credentials);

    if (result.otpRequired) {
      pendingCredentials = credentials;
      return result;
    }

    pendingCredentials = null;
    userBasic = await Api.fetchUserBasic();
    return { success: true, user: userBasic };
  }

  async function submitLogin(formData) {
    const credentials = {
      username: formData.username,
      password: formData.password,
      otp: formData.otp || ''
    };

    if (formData.otp && pendingCredentials) {
      credentials.username = pendingCredentials.username;
      credentials.password = pendingCredentials.password;
      credentials.otp = formData.otp;
    }

    return completeLogin(credentials);
  }

  async function restoreSession() {
    const domain = AppConfig.getDomain();
    await Api.init(domain);
    if (!Api.isLoggedIn()) return false;
    try {
      userBasic = await Api.fetchUserBasic();
    } catch (err) {
      // Do not turn a temporary network/API failure during refresh into a
      // logout. The SDK already clears the token for a real HTTP 401.
      const message = String(err?.message || '').toLowerCase();
      const isAuthFailure = err?.status === 401
        || /401|unauthorized|token expired|bearer token is missing/.test(message);
      if (isAuthFailure) {
        Api.logout();
        return false;
      }
      console.warn('Could not restore user profile; keeping the session', err);
      userBasic = null;
    }
    return true;
  }

  function logout() {
    if (typeof Realtime !== 'undefined' && Realtime.disconnect) {
      Realtime.disconnect();
    }
    Api.logout();
    userBasic = null;
    pendingCredentials = null;
  }

  return {
    getUser,
    submitLogin,
    restoreSession,
    logout,
    get pendingCredentials() { return pendingCredentials; }
  };
})();
