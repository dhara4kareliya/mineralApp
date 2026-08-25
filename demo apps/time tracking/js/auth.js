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
    userBasic = await Api.fetchUserBasic();
    return true;
  }

  function logout() {
    Realtime.disconnect();
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
