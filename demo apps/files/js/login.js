/**
 * Login page controller.
 */
(async function () {
  I18n.init();
  Theme.init();

  const form = document.getElementById('loginForm');
  const note = document.getElementById('loginNote');
  const otpField = document.getElementById('otpField');
  const loginBtn = document.getElementById('loginBtn');
  const togglePassword = document.getElementById('togglePassword');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const otpInput = document.getElementById('otp');
  let passwordVisible = false;
  let demoFilled = false;

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

  document.body.classList.add('auth-checking');
  try {
    const ok = await Auth.restoreSession();
    if (ok) {
      location.replace('app.html');
      return;
    }
  } catch (_) { /* stay on login */ }
  document.body.classList.remove('auth-checking');

  function updatePasswordToggle() {
    if (!togglePassword || !passwordInput) return;
    togglePassword.textContent = passwordVisible ? I18n.t('hide') : I18n.t('show');
  }

  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
      passwordVisible = passwordInput.type === 'password';
      passwordInput.type = passwordVisible ? 'text' : 'password';
      updatePasswordToggle();
    });
  }

  I18n.onChange(updatePasswordToggle);

  function setNote(message, isError) {
    if (!note) return;
    if (!message) {
      note.classList.add('hidden');
      note.textContent = '';
      return;
    }
    note.textContent = message;
    note.classList.toggle('alert--error', !!isError);
    note.classList.toggle('alert--info', !isError);
    note.classList.remove('hidden');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setNote('');
    const username = form.username.value.trim();
    const password = form.password.value;
    const otp = form.otp ? form.otp.value.trim() : '';

    if (!username || !password) {
      setNote(I18n.t('enterCredentials'), true);
      return;
    }

    loginBtn.disabled = true;
    loginBtn.classList.add('is-loading');

    try {
      const result = await Auth.submitLogin({ username, password, otp });
      if (result.otpRequired) {
        otpField.classList.remove('hidden');
        setNote(result.message || I18n.t('enterOtp'), false);
        form.otp.focus();
        return;
      }
      location.replace('app.html');
    } catch (err) {
      setNote((err && err.message) || I18n.t('loginFailed'), true);
    } finally {
      loginBtn.disabled = false;
      loginBtn.classList.remove('is-loading');
    }
  });
})();
