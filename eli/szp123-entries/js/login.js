(function () {
  'use strict';

  EntriesUI.initTheme();
  EntriesUI.initLang();

  function goHome(basic) {
    var handle = EntriesAPI.accountUsernameFromBasic(basic || EntriesAPI.loadUserBasic())
      || EntriesAPI.accountUsername();
    if (handle) {
      try { localStorage.setItem('entries_biz1_login_name', handle); } catch (e) { /* ignore */ }
    }
    var home = EntriesAPI.appHomeUrl(handle);
    if (EntriesAPI.sameLocation(home)) {
      location.reload();
      return;
    }
    location.href = home;
  }

  if (EntriesAPI.ensureAccountUrl()) return;

  if (EntriesAPI.isAuthenticated()) return;

  var form = document.getElementById('loginForm');
  if (!form) return;

  var loginApp = document.getElementById('loginApp');
  var boot = document.getElementById('boot');
  var app = document.getElementById('app');
  if (loginApp) {
    if (boot) boot.classList.add('hidden');
    if (app) app.classList.add('hidden');
    loginApp.classList.remove('hidden');
    document.body.classList.remove('app-body');
  }
  var usernameEl = document.getElementById('username');
  var passwordEl = document.getElementById('password');
  var otpEl = document.getElementById('otp');
  var otpWrap = document.getElementById('otpWrap');
  var resendOtpBtn = document.getElementById('resendOtpBtn');
  var errorBox = document.getElementById('errorBox');
  var loginBtn = document.getElementById('loginBtn');
  var loginBtnText = document.getElementById('loginBtnText');
  var rememberEl = document.getElementById('remember');
  var togglePassword = document.getElementById('togglePassword');

  var waitingOtp = false;
  var resendSeconds = 0;
  var resendTimer = null;
  var loading = false;
  var demoFilled = false;

  function tr(key) {
    return EntriesUI.t(key);
  }

  var remembered = EntriesAPI.loadCredentials();
  if (remembered) {
    rememberEl.checked = !!remembered.remember;
  }

  function clearLoginFields() {
    if (demoFilled) return;
    if (usernameEl) usernameEl.value = '';
    if (passwordEl) passwordEl.value = '';
    if (otpEl) otpEl.value = '';
  }

  clearLoginFields();
  window.addEventListener('pageshow', function () {
    demoFilled = false;
    clearLoginFields();
  });
  setTimeout(clearLoginFields, 50);
  setTimeout(clearLoginFields, 250);

  document.querySelectorAll('.demo-user-btn[data-user][data-pass]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      demoFilled = true;
      if (usernameEl) usernameEl.value = btn.getAttribute('data-user') || '';
      if (passwordEl) passwordEl.value = btn.getAttribute('data-pass') || '';
      if (passwordEl && passwordEl.focus) passwordEl.focus();
    });
  });

  function showError(msg) {
    if (!msg) {
      errorBox.classList.add('hidden');
      errorBox.textContent = '';
      return;
    }
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
  }

  function setLoading(on) {
    loading = !!on;
    loginBtn.disabled = loading;
    loginBtnText.textContent = loading
      ? tr('loginSigningIn')
      : waitingOtp
        ? tr('loginVerifyContinue')
        : tr('loginSignIn');
  }

  function updateResendLabel() {
    if (resendSeconds > 0) {
      resendOtpBtn.disabled = true;
      resendOtpBtn.textContent = tr('loginResendIn') + ' ' + resendSeconds + 's';
      return;
    }
    resendOtpBtn.disabled = loading;
    resendOtpBtn.textContent = tr('loginResendOtp');
  }

  function startResendCountdown() {
    if (resendTimer) clearInterval(resendTimer);
    resendSeconds = 20;
    updateResendLabel();
    resendTimer = setInterval(function () {
      resendSeconds -= 1;
      updateResendLabel();
      if (resendSeconds <= 0) {
        clearInterval(resendTimer);
        resendTimer = null;
      }
    }, 1000);
  }

  function requireOtp(message) {
    waitingOtp = true;
    otpWrap.classList.remove('hidden');
    startResendCountdown();
    otpEl.focus();
    showError('');
    EntriesUI.pushToast(tr('loginVerificationSent'), {
      message: message || tr('loginCheckEmailOtp'),
      tone: 'info'
    });
    loginBtnText.textContent = tr('loginVerifyContinue');
  }

  async function doLogin(withOtp) {
    showError('');
    var username = usernameEl.value.trim();
    var password = passwordEl.value;
    var otp = otpEl.value.trim();

    if (!username || !password) {
      showError(tr('loginUsernamePasswordRequired'));
      return;
    }
    if (waitingOtp && withOtp && !otp) {
      showError(tr('loginOtpRequired'));
      return;
    }

    setLoading(true);
    try {
      var result = await EntriesAPI.login({
        username: username,
        password: password,
        otp: withOtp ? otp : '',
        remember: rememberEl.checked
      });

      if (!result.ok && result.otpRequired) {
        requireOtp(result.message);
        return;
      }

      var basic = await EntriesAPI.fetchUserBasic();
      EntriesUI.pushToast(tr('loginWelcomeBack'), { tone: 'success' });
      goHome(basic);
    } catch (err) {
      showError(err && err.message ? err.message : tr('loginFailed'));
    } finally {
      setLoading(false);
      updateResendLabel();
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    doLogin(true);
  });

  togglePassword.addEventListener('click', function () {
    var show = passwordEl.type === 'password';
    passwordEl.type = show ? 'text' : 'password';
    togglePassword.textContent = show ? tr('loginHidePassword') : tr('loginShowPassword');
  });

  resendOtpBtn.addEventListener('click', async function () {
    if (resendSeconds > 0 || loading) return;
    setLoading(true);
    showError('');
    try {
      var result = await EntriesAPI.login({
        username: usernameEl.value.trim(),
        password: passwordEl.value,
        otp: '',
        remember: rememberEl.checked
      });
      if (!result.ok && result.otpRequired) {
        otpEl.value = '';
        requireOtp(result.message);
        EntriesUI.pushToast(tr('loginCodeResent'), {
          message: result.message || tr('loginNewCodeSent'),
          tone: 'success'
        });
        return;
      }
      var basic = await EntriesAPI.fetchUserBasic();
      goHome(basic);
    } catch (err) {
      showError(err && err.message ? err.message : tr('loginResendFailed'));
    } finally {
      setLoading(false);
      updateResendLabel();
    }
  });

  function renderLoginI18n() {
    EntriesUI.applyStaticI18n();
    togglePassword.textContent = passwordEl.type === 'password'
      ? tr('loginShowPassword')
      : tr('loginHidePassword');
    setLoading(loading);
    updateResendLabel();
  }

  EntriesUI.onLangChange = renderLoginI18n;
  renderLoginI18n();
})();
