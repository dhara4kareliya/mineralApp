/**
 * Auth helpers — stores Customer.Login bearer token
 */
const Auth = (() => {
  const KEYS = {
    token: 'cp_token',
    customer: 'cp_customer',
    modules: 'cp_modules',
    welcome: 'cp_welcome',
    loginDraft: 'cp_login_draft',
  };

  function getToken() {
    return localStorage.getItem(KEYS.token) || '';
  }

  function setSession({ token, customer, modules, welcome }) {
    if (token) localStorage.setItem(KEYS.token, token);
    if (customer) localStorage.setItem(KEYS.customer, JSON.stringify(customer));
    if (modules) localStorage.setItem(KEYS.modules, JSON.stringify(modules));
    if (welcome) localStorage.setItem(KEYS.welcome, JSON.stringify(welcome));
  }

  function getCustomer() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.customer) || 'null');
    } catch {
      return null;
    }
  }

  function getModules() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.modules) || '{}');
    } catch {
      return {};
    }
  }

  function isModuleEnabled(key) {
    if (!key) return true;
    return getModules()[key] === true;
  }

  function getWelcome() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.welcome) || 'null');
    } catch {
      return null;
    }
  }

  function setLoginDraft(draft) {
    sessionStorage.setItem(KEYS.loginDraft, JSON.stringify(draft || {}));
  }

  function getLoginDraft() {
    try {
      return JSON.parse(sessionStorage.getItem(KEYS.loginDraft) || '{}');
    } catch {
      return {};
    }
  }

  function clearLoginDraft() {
    sessionStorage.removeItem(KEYS.loginDraft);
  }

  function logout() {
    Object.values(KEYS).forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    window.location.href = pathTo('login.html');
  }

  function isLoggedIn() {
    return Boolean(getToken());
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = pathTo('login.html');
      return false;
    }
    return true;
  }

  function pathTo(file) {
    const path = window.location.pathname.replace(/\\/g, '/');
    if (path.includes('/pages/')) return file;
    return `pages/${file}`;
  }

  function asset(rel) {
    const path = window.location.pathname.replace(/\\/g, '/');
    if (path.includes('/pages/')) return `../${rel}`;
    return rel;
  }

  return {
    getToken,
    setSession,
    getCustomer,
    getModules,
    isModuleEnabled,
    getWelcome,
    setLoginDraft,
    getLoginDraft,
    clearLoginDraft,
    logout,
    isLoggedIn,
    requireAuth,
    pathTo,
    asset,
  };
})();

window.Auth = Auth;
