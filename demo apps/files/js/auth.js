/**
 * Auth helpers + session restore.
 */
const Auth = (function () {
  let pendingCredentials = null;

  async function submitLogin(formData) {
    const credentials = {
      username: String(formData.username || '').trim(),
      password: formData.password || '',
      otp: formData.otp || ''
    };

    if (credentials.otp && pendingCredentials) {
      credentials.username = pendingCredentials.username;
      credentials.password = pendingCredentials.password;
    }

    const result = await Api.login(credentials);
    if (result.otpRequired) {
      pendingCredentials = {
        username: credentials.username,
        password: credentials.password
      };
      return result;
    }

    pendingCredentials = null;
    return result;
  }

  async function restoreSession() {
    return Api.restoreSession();
  }

  function logout() {
    try {
      Realtime.disconnect();
    } catch (_) { /* ignore */ }
    Api.logout();
    pendingCredentials = null;
    location.href = 'login.html';
  }

  return {
    submitLogin,
    restoreSession,
    logout,
    get pendingCredentials() {
      return pendingCredentials;
    }
  };
})();
