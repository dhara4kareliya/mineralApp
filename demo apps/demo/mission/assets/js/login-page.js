
(function () {
  function tickClock() {
    var el = document.getElementById('clockLogin');
    if (!el) return;
    var d = new Date();
    el.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  tickClock();
  setInterval(tickClock, 1000);

  var hint = document.getElementById('loginHint');
  if (hint && window.MineralBarApp) {
    var u = MineralBarApp.getTenantUser ? MineralBarApp.getTenantUser() : '';
    hint.textContent = (u ? u + '.biz1.co.il' : 'biz1.co.il') + ' · Biz1 SDK';
  }

  var themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      var current = document.documentElement.getAttribute('data-theme');
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('biz1demo_theme', next);
      localStorage.setItem('mineral_theme', next);
    });
  }

  function syncLangBtns() {
    var lang = (typeof getLanguage === 'function' ? getLanguage() : null) || localStorage.getItem('lang') || 'he';
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-lang') === lang);
    });
  }
  document.querySelectorAll('.lang-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var lang = btn.getAttribute('data-lang');
      if (window.setLanguage) window.setLanguage(lang);
    });
  });
  syncLangBtns();
  if (typeof initLanguage === 'function') initLanguage();

  var demoBox = document.getElementById('demo-users');
  function syncDemoAria() {
    if (demoBox && window.t) demoBox.setAttribute('aria-label', window.t('demo_credentials'));
  }
  syncDemoAria();
  window.addEventListener('mineralbar:lang', function () {
    syncLangBtns();
    syncDemoAria();
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
  var rememberEl = document.getElementById('remember');
  var resendOtpBtn = document.getElementById('resendOtpBtn');
  var resendOtpText = document.getElementById('resendOtpText');
  var waitingOtp = false;
  var requestInFlight = false;
  var cooldownUntil = 0;
  var cooldownTimer = null;
  var resendCooldownUntil = 0;
  var resendTimer = null;

  function showError(msg) {
    errorText.textContent = msg || window.t('failLogin');
    errorBox.classList.remove('hidden');
  }
  function clearError() {
    errorBox.classList.add('hidden');
    errorText.textContent = '';
  }

  function setLoginBtnLabel() {
    loginBtnText.textContent = waitingOtp ? window.t('verifyAndConnect') : window.t('connect');
  }

  function setResendLabel(secondsLeft) {
    if (!resendOtpText) return;
    resendOtpText.removeAttribute('data-i18n');
    resendOtpText.textContent = secondsLeft > 0
      ? window.t('resendOtpIn') + ' ' + secondsLeft + 's'
      : window.t('resendOtp');
  }

  function setRequestBusy(busy, source) {
    requestInFlight = busy;
    var rateLimited = Date.now() < cooldownUntil;
    loginBtn.disabled = busy || rateLimited;
    if (!resendOtpBtn) return;
    resendOtpBtn.disabled = busy || rateLimited || Date.now() < resendCooldownUntil;
    if (source !== 'resend') return;
    if (busy) {
      resendOtpText.removeAttribute('data-i18n');
      resendOtpText.textContent = window.t('resendingOtp');
    } else if (Date.now() >= resendCooldownUntil) {
      setResendLabel(0);
    }
  }

  function startResendCooldown(seconds) {
    if (!resendOtpBtn) return;
    resendCooldownUntil = Date.now() + (seconds * 1000);
    if (resendTimer) clearInterval(resendTimer);
    resendOtpBtn.disabled = true;

    function tick() {
      var left = Math.max(0, Math.ceil((resendCooldownUntil - Date.now()) / 1000));
      if (!left) {
        clearInterval(resendTimer);
        resendTimer = null;
        resendCooldownUntil = 0;
        setResendLabel(0);
        resendOtpBtn.disabled = requestInFlight || Date.now() < cooldownUntil;
        return;
      }
      setResendLabel(left);
      resendOtpBtn.disabled = true;
    }

    tick();
    resendTimer = setInterval(tick, 1000);
  }

  function enterOtpMode(messageKey) {
    waitingOtp = true;
    document.getElementById('usernameWrap').classList.add('hidden');
    document.getElementById('passwordWrap').classList.add('hidden');
    otpWrap.classList.remove('hidden');
    setLoginBtnLabel();
    showError(window.t(messageKey || 'reqOtp'));
    startResendCooldown(20);
    otpEl.focus();
  }

  function getRetrySeconds(err) {
    var raw = (err && err.raw) || {};
    var value = raw.retry_after || raw.retryAfter || raw.wait_seconds || raw.waitSeconds;
    var seconds = Number(value);
    if (isFinite(seconds) && seconds > 0) return Math.min(Math.ceil(seconds), 3600);

    var message = String(raw.message || (err && err.message) || '');
    var minuteMatch = message.match(/wait\s+(\d+)\s+minutes?/i);
    if (minuteMatch) return Math.min(Number(minuteMatch[1]) * 60, 3600);
    var secondMatch = message.match(/wait\s+(\d+)\s+seconds?/i);
    if (secondMatch) return Math.min(Number(secondMatch[1]), 3600);
    if (/wait\s+(?:one|a)\s+minute/i.test(message)) return 60;
    if ((err && Number(err.status) === 429) || /too many login attempts/i.test(message)) return 60;
    return 0;
  }

  function startLoginCooldown(seconds) {
    cooldownUntil = Date.now() + (seconds * 1000);
    if (cooldownTimer) clearInterval(cooldownTimer);

    function tick() {
      var remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      if (!remaining) {
        clearInterval(cooldownTimer);
        cooldownTimer = null;
        cooldownUntil = 0;
        setRequestBusy(false, 'login');
        setLoginBtnLabel();
        clearError();
        return;
      }
      var countdown = String(Math.floor(remaining / 60)).padStart(2, '0') + ':' +
        String(remaining % 60).padStart(2, '0');
      loginBtn.disabled = true;
      if (resendOtpBtn) resendOtpBtn.disabled = true;
      loginBtnText.textContent = window.t('tryAgainIn') + ' ' + countdown;
      showError(window.t('tooManyAttempts') + ' ' + window.t('tryAgainIn') + ': ' + countdown);
    }

    tick();
    cooldownTimer = setInterval(tick, 1000);
  }

  function localizedLoginError(err, fallbackKey) {
    var raw = (err && err.raw) || {};
    var status = Number((err && err.status) || raw.status || 0);
    var message = String(raw.message || raw.error || (err && err.message) || '').toLowerCase();

    if ((err && err.name === 'TypeError') ||
        /failed to fetch|network.?error|network request failed/i.test(message)) {
      return window.t('errNetwork');
    }
    if (status === 400 || status === 401 ||
        /invalid credentials|incorrect (?:email|username|password)|wrong password|user not found|login failed|סיסמה שגוי|משתמש לא נמצא|פרטי התחברות/i.test(message)) {
      return window.t('invalidCredentials');
    }
    return window.t(fallbackKey || 'failLogin');
  }

  function handleLoginError(err, fallbackKey) {
    var retrySeconds = getRetrySeconds(err);
    if (retrySeconds) {
      startLoginCooldown(retrySeconds);
      return true;
    }
    showError(localizedLoginError(err, fallbackKey));
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

  var demoFillApplied = false;

  function clearLoginFields() {
    if (demoFillApplied) return;
    if (usernameEl) usernameEl.value = '';
    if (passwordEl) passwordEl.value = '';
  }

  function fillDemoUser(btn) {
    demoFillApplied = true;
    if (usernameEl) usernameEl.value = btn.getAttribute('data-user') || '';
    if (passwordEl) passwordEl.value = btn.getAttribute('data-pass') || '';
    if (passwordEl) passwordEl.focus();
  }

  function restoreRememberCheckbox() {
    try {
      if (localStorage.getItem('biz1demo_remember') === '1' || localStorage.getItem('mineralbar_remember') === '1') {
        rememberEl.checked = true;
      }
    } catch (e) { /* ignore */ }
  }

  restoreRememberCheckbox();
  clearLoginFields();
  window.addEventListener('pageshow', clearLoginFields);
  setTimeout(clearLoginFields, 50);
  setTimeout(clearLoginFields, 250);

  document.querySelectorAll('.demo-user-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      fillDemoUser(btn);
    });
  });

  document.getElementById('togglePassword').addEventListener('click', function () {
    passwordEl.type = passwordEl.type === 'password' ? 'text' : 'password';
  });

  if (resendOtpBtn) {
    resendOtpBtn.addEventListener('click', async function () {
      if (!waitingOtp || requestInFlight) return;
      if (Date.now() < cooldownUntil || Date.now() < resendCooldownUntil) return;
      clearError();

      var username = usernameEl.value.trim();
      var password = passwordEl.value;
      if (!username || !password) {
        showError(window.t('errEmpty'));
        return;
      }

      setRequestBusy(true, 'resend');
      try {
        var result = await MineralBarApp.login({
          username: username,
          password: password,
          otp: '',
          remember: !!(rememberEl && rememberEl.checked)
        });

        if (result && result.otpRequired) {
          otpEl.value = '';
          enterOtpMode('otpResent');
          return;
        }
        if (result && result.ok) {
          location.href = result.dest;
          return;
        }
        showError(window.t('failResendOtp'));
      } catch (err) {
        handleLoginError(err, 'failResendOtp');
      } finally {
        setRequestBusy(false, 'resend');
      }
    });
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (requestInFlight || Date.now() < cooldownUntil) return;
    clearError();

    var username = usernameEl.value.trim();
    var password = passwordEl.value;
    var otp = waitingOtp ? otpEl.value.trim() : '';
    var remember = !!(rememberEl && rememberEl.checked);

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
      var result = await MineralBarApp.login({
        username: username,
        password: password,
        otp: otp,
        remember: remember
      });

      if (result.otpRequired) {
        if (waitingOtp && otp) {
          showError(window.t('invalidOtp'));
          otpEl.select();
          return;
        }
        enterOtpMode('reqOtp');
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
      if (Date.now() >= cooldownUntil) setLoginBtnLabel();
    }
  });
})();
