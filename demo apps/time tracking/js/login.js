/**
 * Login page bootstrap.
 */
(function LoginPage() {
  const loginForm = document.getElementById('login-form');

  I18n.init();
  AppUI.initTheme();
  AppUI.bindThemeToggle('theme-toggle-login');
  AppUI.bindLangSwitch();

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    AppUI.showLoginError('');
    AppUI.setLoginLoading(true);

    try {
      const result = await Auth.submitLogin({
        username: document.getElementById('username').value.trim(),
        password: document.getElementById('password').value,
        otp: document.getElementById('otp').value.trim()
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
