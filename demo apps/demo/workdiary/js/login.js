/**
 * Login page bootstrap.
 */
(function LoginPage() {
  const loginForm = document.getElementById('login-form');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const otpInput = document.getElementById('otp');
  let demoFilled = false;

  I18n.init();
  AppUI.initTheme();
  AppUI.bindThemeToggle('theme-toggle-login');
  AppUI.bindLangSwitch();

  function clearLoginFields() {
    if (demoFilled) return;
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (otpInput) otpInput.value = '';
  }

  clearLoginFields();
  window.addEventListener('pageshow', () => {
    demoFilled = false;
    clearLoginFields();
  });
  setTimeout(clearLoginFields, 50);
  setTimeout(clearLoginFields, 250);

  document.querySelectorAll('.demo-user-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      demoFilled = true;
      if (usernameInput) usernameInput.value = btn.getAttribute('data-user') || '';
      if (passwordInput) passwordInput.value = btn.getAttribute('data-pass') || '';
      passwordInput?.focus();
    });
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    AppUI.showLoginError('');
    AppUI.setLoginLoading(true);

    try {
      const result = await Auth.submitLogin({
        username: usernameInput.value.trim(),
        password: passwordInput.value,
        otp: otpInput.value.trim()
      });

      if (result.otpRequired) {
        AppUI.showOtpStep(true, result.message);
        AppUI.setLoginLoading(false);
        return;
      }

      window.location.replace('home.html');
    } catch (err) {
      AppUI.showLoginError(err.message || I18n.t('loginFailed'));
    } finally {
      AppUI.setLoginLoading(false);
    }
  });
})();
