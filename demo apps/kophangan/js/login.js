(function () {
  'use strict';

  I18n.bootUi();
  if (Ui.redirectIfAuthed()) return;

  var form = document.getElementById('loginForm');
  var usernameEl = document.getElementById('username');
  var passwordEl = document.getElementById('password');
  var otpEl = document.getElementById('otp');
  var otpWrap = document.getElementById('otpWrap');
  var resendBtn = document.getElementById('resendOtpBtn');
  var errorBox = document.getElementById('errorBox');
  var loginBtn = document.getElementById('loginBtn');
  var loginBtnText = document.getElementById('loginBtnText');
  var rememberEl = document.getElementById('remember');
  var waitingOtp = false;
  var resendSeconds = 0;
  var resendTimer = null;

  var remembered = ExpenseApp.loadRemember();
  if (remembered) {
    usernameEl.value = remembered.username || '';
    passwordEl.value = remembered.password || '';
    rememberEl.checked = true;
  } else if (ExpenseApp.getStoredEmail()) {
    usernameEl.value = ExpenseApp.getStoredEmail();
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
  }

  function setBtn(key) {
    loginBtnText.setAttribute('data-i18n', key);
    loginBtnText.textContent = I18n.t(key);
  }

  function updateResend() {
    if (resendSeconds > 0) {
      resendBtn.disabled = true;
      resendBtn.textContent = I18n.t('resendIn', { s: resendSeconds });
    } else {
      resendBtn.disabled = false;
      resendBtn.textContent = I18n.t('resendCode');
    }
  }

  function startResendTimer() {
    if (resendTimer) clearInterval(resendTimer);
    resendSeconds = 20;
    updateResend();
    resendTimer = setInterval(function () {
      resendSeconds -= 1;
      updateResend();
      if (resendSeconds <= 0) {
        clearInterval(resendTimer);
        resendTimer = null;
      }
    }, 1000);
  }

  document.getElementById('togglePassword').addEventListener('click', function () {
    passwordEl.type = passwordEl.type === 'password' ? 'text' : 'password';
  });

  window.addEventListener('app:langchange', function () {
    setBtn(waitingOtp ? 'verifyConnect' : 'connect');
    if (!otpWrap.classList.contains('hidden')) updateResend();
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearError();
    var username = usernameEl.value.trim();
    var password = passwordEl.value;
    var otp = otpEl.value.trim();
    var remember = !!(rememberEl && rememberEl.checked);

    if (!username || !password) {
      showError(I18n.t('fillEmailPassword'));
      return;
    }
    if (waitingOtp && !otp) {
      showError(I18n.t('fillOtp'));
      return;
    }

    loginBtn.disabled = true;
    setBtn(waitingOtp ? 'verifying' : 'connecting');

    try {
      var result = await ExpenseApp.api.login({
        username: username,
        password: password,
        otp: otp,
        remember: remember
      });

      if (result.otpRequired) {
        var entering = !waitingOtp;
        waitingOtp = true;
        otpWrap.classList.remove('hidden');
        otpEl.focus();
        if (entering) startResendTimer();
        showError(I18n.apiMsg(result.message || '', 'otpRequired'));
        setBtn('verifyConnect');
        return;
      }

      if (result.ok) {
        ExpenseApp.saveRemember(username, password, remember);
        location.href = 'expenses.html';
        return;
      }

      showError(I18n.t('loginFailed'));
    } catch (err) {
      showError(I18n.apiMsg((err && err.message) || '', 'loginFailed'));
    } finally {
      loginBtn.disabled = false;
      setBtn(waitingOtp ? 'verifyConnect' : 'connect');
    }
  });

  resendBtn.addEventListener('click', async function () {
    if (resendSeconds > 0 || resendBtn.disabled) return;
    clearError();
    resendBtn.disabled = true;
    resendBtn.textContent = I18n.t('sending');
    try {
      var result = await ExpenseApp.api.login({
        username: usernameEl.value.trim(),
        password: passwordEl.value,
        otp: ''
      });
      if (result.ok) {
        location.href = 'expenses.html';
        return;
      }
      waitingOtp = true;
      otpEl.value = '';
      otpEl.focus();
      startResendTimer();
      showError(I18n.apiMsg(result.message || '', 'otpSent'));
    } catch (err) {
      showError(I18n.apiMsg((err && err.message) || '', 'loginFailed'));
      updateResend();
    }
  });

  updateResend();
})();
