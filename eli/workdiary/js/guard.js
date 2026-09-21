/**
 * Auth token guard — runs before page paint to avoid login/home flash.
 */
const AuthGuard = (function () {
  const TOKEN_KEY = 'biz1_sdk_bearer_token';

  function hasToken() {
    try {
      return !!localStorage.getItem(TOKEN_KEY);
    } catch {
      return false;
    }
  }

  function redirectIfLoggedIn(homePath) {
    if (hasToken()) {
      window.location.replace(homePath || 'home.html');
      return true;
    }
    return false;
  }

  function redirectIfLoggedOut(loginPath) {
    if (!hasToken()) {
      window.location.replace(loginPath || 'login.html');
      return true;
    }
    return false;
  }

  return { hasToken, redirectIfLoggedIn, redirectIfLoggedOut, TOKEN_KEY };
})();
