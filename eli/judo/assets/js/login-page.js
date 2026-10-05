(function () {
  var App = window.Biz1App || window.MineralBarApp;
  var cfg = window.Biz1Config || {};

  // Strip accidental GET credential leftovers (old form name= attrs + CSP form-action block)
  try {
    var u = new URL(location.href);
    if (u.searchParams.has('payform-user') || u.searchParams.has('payform-pass')) {
      u.searchParams.delete('payform-user');
      u.searchParams.delete('payform-pass');
      history.replaceState({}, '', u.pathname + u.search + u.hash);
    }
  } catch (eStrip) { /* ignore */ }

  function applyBrandAndHint() {
    var lang = (typeof getLanguage === 'function' ? getLanguage() : 'he');
    var brand = (window.getBrandName && window.getBrandName(lang)) ||
      (cfg.brand && (lang === 'en' ? cfg.brand.en : cfg.brand.he)) ||
      (lang === 'en' ? 'Payment Form' : 'טופס תשלום');
    var brandEl = document.getElementById('brandTitle');
    if (brandEl) brandEl.textContent = brand;
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-lang') === lang);
    });
  }

  if (typeof initLanguage === 'function') initLanguage();
  applyBrandAndHint();

  document.querySelectorAll('.lang-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = btn.getAttribute('data-lang');
      if (window.setLanguage) window.setLanguage(next);
      else if (window.initLanguage) {
        localStorage.setItem('lang', next);
        window.initLanguage();
      }
    });
  });

  function tickClock() {
    var el = document.getElementById('clockLogin');
    if (!el) return;
    var d = new Date();
    el.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  tickClock();
  setInterval(tickClock, 30000);

  document.getElementById('themeToggle').addEventListener('click', function () {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('biz1demo_theme', next);
  });

  var form = document.getElementById('loginForm');
  var usernameEl = document.getElementById('username');
  var passwordEl = document.getElementById('password');
  var otpEl = document.getElementById('otp');
  var otpWrap = document.getElementById('otpWrap');
  var errorBox = document.getElementById('errorBox');
  var errorText = document.getElementById('errorText');
  var loginBtn = document.getElementById('loginBtn');
  var loginBtnText = document.getElementById('loginBtnText');
  var resendOtpBtn = document.getElementById('resendOtpBtn');
  var rememberEl = document.getElementById('remember');
  var waitingOtp = false;
  var requestInFlight = false;
  var cooldownUntil = 0;
  var cooldownTimer = null;
  var resendCooldownUntil = 0;
  var resendCooldownTimer = null;

  function showError(msg) {
    errorText.textContent = msg || window.t('failLogin');
    errorBox.classList.remove('hidden');
  }
  function clearError() {
    errorBox.classList.add('hidden');
    errorText.textContent = '';
  }

  function enterOtpMode(message) {
    waitingOtp = true;
    document.getElementById('usernameWrap').classList.add('hidden');
    document.getElementById('passwordWrap').classList.add('hidden');
    otpWrap.classList.remove('hidden');
    loginBtnText.textContent = window.t('verifyAndConnect');
    showError(message || window.t('reqOtp'));
    startResendCooldown(20);
    otpEl.focus();
  }

  function setRequestBusy(busy, source) {
    requestInFlight = busy;
    var rateLimited = Date.now() < cooldownUntil;
    loginBtn.disabled = busy || rateLimited;
    resendOtpBtn.disabled = busy || rateLimited || Date.now() < resendCooldownUntil;
    if (source === 'resend') {
      if (busy) resendOtpBtn.textContent = window.t('resendingOtp');
      else if (Date.now() >= resendCooldownUntil) resendOtpBtn.textContent = window.t('resendOtp');
    }
  }

  function startResendCooldown(seconds) {
    resendCooldownUntil = Date.now() + (seconds * 1000);
    if (resendCooldownTimer) clearInterval(resendCooldownTimer);

    function renderResendCooldown() {
      var remaining = Math.max(0, Math.ceil((resendCooldownUntil - Date.now()) / 1000));
      if (!remaining) {
        clearInterval(resendCooldownTimer);
        resendCooldownTimer = null;
        resendCooldownUntil = 0;
        resendOtpBtn.textContent = window.t('resendOtp');
        resendOtpBtn.disabled = requestInFlight || Date.now() < cooldownUntil;
        return;
      }
      resendOtpBtn.textContent = window.t('resendOtpIn') + ' ' + remaining + 's';
      resendOtpBtn.disabled = true;
    }

    renderResendCooldown();
    resendCooldownTimer = setInterval(renderResendCooldown, 1000);
  }

  function getRetrySeconds(err) {
    var raw = (err && err.raw) || {};
    var value = raw.retry_after || raw.retryAfter || raw.wait_seconds || raw.waitSeconds;
    var seconds = Number(value);
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(Math.ceil(seconds), 3600);

    var message = String((raw && raw.message) || (err && err.message) || '');
    var minuteMatch = message.match(/wait\s+(\d+)\s+minutes?/i);
    if (minuteMatch) return Math.min(Number(minuteMatch[1]) * 60, 3600);
    var secondMatch = message.match(/wait\s+(\d+)\s+seconds?/i);
    if (secondMatch) return Math.min(Number(secondMatch[1]), 3600);
    if (/wait\s+(?:one|a)\s+minute/i.test(message)) return 60;
    if ((err && Number(err.status) === 429) || /too many login attempts/i.test(message)) return 60;
    return 0;
  }

  function startLoginCooldown(seconds, message) {
    cooldownUntil = Date.now() + (seconds * 1000);
    if (cooldownTimer) clearInterval(cooldownTimer);

    function renderCooldown() {
      var remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      if (!remaining) {
        clearInterval(cooldownTimer);
        cooldownTimer = null;
        cooldownUntil = 0;
        setRequestBusy(false, 'login');
        loginBtnText.textContent = waitingOtp ? window.t('verifyAndConnect') : window.t('connect');
        clearError();
        return;
      }

      var minutes = Math.floor(remaining / 60);
      var secs = String(remaining % 60).padStart(2, '0');
      var countdown = String(minutes).padStart(2, '0') + ':' + secs;
      loginBtn.disabled = true;
      resendOtpBtn.disabled = true;
      loginBtnText.textContent = window.t('tryAgainIn') + ' ' + countdown;
      showError(message + ' ' + window.t('tryAgainIn') + ': ' + countdown);
    }

    renderCooldown();
    cooldownTimer = setInterval(renderCooldown, 1000);
  }

  function handleLoginError(err) {
    var msg = (err && err.message) || window.t('failLogin');
    if (err && err.raw && err.raw.message) msg = err.raw.message;
    var retrySeconds = getRetrySeconds(err);
    if (retrySeconds) {
      startLoginCooldown(retrySeconds, window.t('tooManyAttempts'));
      return true;
    }
    showError(msg);
    return false;
  }

  function isOtpValidationError(err) {
    var raw = (err && err.raw) || {};
    var status = Number((err && err.status) || raw.status || 0);
    var message = String(raw.message || (err && err.message) || '').toLowerCase();
    if (status === 400 || status === 401) return true;
    return /(otp|one.?time|verification|אימות).*(invalid|wrong|incorrect|expired|mismatch|failed|שגוי|פג)/i.test(message)
      || /(invalid|wrong|incorrect|expired|mismatch|failed|שגוי|פג).*(otp|code|אימות|קוד)/i.test(message);
  }

  var demoFilled = false;

  function clearLoginFields() {
    if (demoFilled) return;
    if (usernameEl) usernameEl.value = '';
    if (passwordEl) passwordEl.value = '';
    if (otpEl) otpEl.value = '';
  }

  function prefillRemembered() {
    try {
      if (localStorage.getItem('biz1demo_remember') === '1' || localStorage.getItem('mineralbar_remember') === '1') {
        rememberEl.checked = true;
      }
    } catch (e) { /* ignore */ }
  }

  async function tryUrlTokenLogin() {
    if (!App.readUrlToken || !App.loginWithToken) return false;
    var urlToken = '';
    try {
      urlToken = App.readUrlToken() || '';
      if (urlToken && App.clearUrlToken) App.clearUrlToken();
    } catch (e0) {
      return false;
    }
    if (!urlToken) return false;

    setRequestBusy(true, 'login');
    loginBtnText.textContent = window.t('connecting');
    clearError();
    try {
      var result = await App.loginWithToken(urlToken);
      if (result && result.ok) {
        location.replace(result.dest || App.homeForRole(result.role) || 'index.html');
        return true;
      }
      showError(window.t('failLogin'));
      return false;
    } catch (err) {
      showError((err && err.message) || window.t('failLogin'));
      return false;
    } finally {
      setRequestBusy(false, 'login');
      if (Date.now() >= cooldownUntil) {
        loginBtnText.textContent = waitingOtp ? window.t('verifyAndConnect') : window.t('connect');
      }
    }
  }

  async function tryAutoEnter() {
    try {
      if (await tryUrlTokenLogin()) return true;

      var client = App.getClient();
      // Only auto-enter when session looks complete; never bounce first-time users to home
      if (client.getToken() && App.getRole()) {
        location.replace(App.homeForRole(App.getRole()));
        return true;
      }
      if (App.canAutoRefresh && App.canAutoRefresh()) {
        setRequestBusy(true, 'login');
        loginBtnText.textContent = window.t('reconnecting');
        var refreshed = await App.refreshSession();
        if (refreshed && refreshed.ok) {
          location.replace(refreshed.dest || App.homeForRole(refreshed.role));
          return true;
        }
        setRequestBusy(false, 'login');
      }
    } catch (e) {
      console.warn('[PaymentForm] login auto-refresh failed', e);
      setRequestBusy(false, 'login');
      try {
        if (App.clearSession) App.clearSession({ keepEmail: true });
      } catch (eClear) { /* ignore */ }
      if (e && e.otpRequired) {
        enterOtpMode(window.t('reqOtp'));
        return false;
      }
      if (handleLoginError(e)) return false;
      loginBtnText.textContent = window.t('connect');
    }
    return false;
  }

  prefillRemembered();
  clearLoginFields();
  window.addEventListener('pageshow', function () {
    demoFilled = false;
    clearLoginFields();
  });
  setTimeout(clearLoginFields, 50);
  setTimeout(clearLoginFields, 250);
  tryAutoEnter();

  document.querySelectorAll('.demo-user-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      demoFilled = true;
      if (usernameEl) usernameEl.value = btn.getAttribute('data-user') || '';
      if (passwordEl) passwordEl.value = btn.getAttribute('data-pass') || '';
      if (passwordEl) passwordEl.focus();
    });
  });

  document.getElementById('togglePassword').addEventListener('click', function () {
    passwordEl.type = passwordEl.type === 'password' ? 'text' : 'password';
  });

  function buildLoginRequest(otpValue) {
    var raw = usernameEl.value.trim();
    var detected = (App && App.detectLoginIdentifier)
      ? App.detectLoginIdentifier(raw)
      : { field: 'username', value: raw };
    var args = {
      password: passwordEl.value,
      otp: otpValue || '',
      remember: !!(rememberEl && rememberEl.checked)
    };
    args[detected.field || 'username'] = detected.value || raw;
    return args;
  }

  /** No <form> submit — CSP form-action 'none' blocks native navigation. */
  async function doLogin() {
    if (requestInFlight || Date.now() < cooldownUntil) return;
    clearError();

    if (!App || typeof App.login !== 'function') {
      showError(window.t('err_network') || 'Biz1 SDK not loaded');
      return;
    }

    var username = usernameEl.value.trim();
    var password = passwordEl.value;
    var otp = otpEl.value.trim();

    if (!username || !password) {
      showError(window.t('errEmpty'));
      return;
    }

    if (waitingOtp && !otp) {
      showError(window.t('errOtp'));
      return;
    }

    setRequestBusy(true, 'login');
    loginBtnText.textContent = waitingOtp ? window.t('validating') : window.t('connecting');

    try {
      var result = await App.login(buildLoginRequest(otp));

      if (result.otpRequired) {
        if (waitingOtp && otp) {
          showError(window.t('invalidOtp'));
          otpEl.select();
          return;
        }
        enterOtpMode(window.t('reqOtp'));
        return;
      }

      if (result.ok) {
        location.href = result.dest;
        return;
      }

      showError(window.t('failLogin'));
    } catch (err) {
      if (waitingOtp && otp && !getRetrySeconds(err) && isOtpValidationError(err)) {
        showError(window.t('invalidOtp'));
        otpEl.select();
      } else {
        handleLoginError(err);
      }
    } finally {
      setRequestBusy(false, 'login');
      if (Date.now() >= cooldownUntil) {
        if (!waitingOtp) loginBtnText.textContent = window.t('connect');
        else loginBtnText.textContent = window.t('verifyAndConnect');
      }
    }
  }

  if (loginBtn) loginBtn.addEventListener('click', doLogin);
  [usernameEl, passwordEl, otpEl].forEach(function (el) {
    if (!el) return;
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        doLogin();
      }
    });
  });
  // If a <form> remains, never allow native submit under form-action 'none'
  if (form && form.addEventListener) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      e.stopPropagation();
      doLogin();
    }, true);
  }

  resendOtpBtn.addEventListener('click', async function () {
    if (requestInFlight || Date.now() < cooldownUntil || Date.now() < resendCooldownUntil || !waitingOtp) return;
    clearError();

    var username = usernameEl.value.trim();
    var password = passwordEl.value;
    if (!username || !password) {
      showError(window.t('errEmpty'));
      return;
    }

    setRequestBusy(true, 'resend');
    try {
      var result = await App.login(buildLoginRequest(''));

      if (result.otpRequired) {
        otpEl.value = '';
        enterOtpMode(window.t('otpResent'));
        return;
      }
      if (result.ok) {
        location.href = result.dest;
        return;
      }
      showError(window.t('failLogin'));
    } catch (err) {
      handleLoginError(err);
    } finally {
      setRequestBusy(false, 'resend');
    }
  });
})();
