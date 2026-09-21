Theme.init();
    I18n.init();
    if (Auth.isLoggedIn()) location.replace('dashboard.html');

    const stepCred = document.getElementById('step-credentials');
    const stepOtp = document.getElementById('step-otp');
    const credAlert = document.getElementById('cred-alert');
    const otpAlert = document.getElementById('otp-alert');
    const otpInputs = [...document.querySelectorAll('#otp-inputs input')];
    const clientIdInput = document.getElementById('client_id');
    const passwordInput = document.getElementById('password');
    let demoFilled = false;

    function clearLoginFields() {
      if (demoFilled) return;
      if (clientIdInput) clientIdInput.value = '';
      if (passwordInput) passwordInput.value = '';
    }

    clearLoginFields();
    window.addEventListener('pageshow', () => {
      demoFilled = false;
      clearLoginFields();
    });
    setTimeout(clearLoginFields, 50);
    setTimeout(clearLoginFields, 250);

    document.querySelectorAll('.demo-user-btn[data-user][data-pass]').forEach((btn) => {
      btn.addEventListener('click', () => {
        demoFilled = true;
        showStep('cred');
        hideAlert(credAlert);
        if (clientIdInput) clientIdInput.value = btn.getAttribute('data-user') || '';
        if (passwordInput) passwordInput.value = btn.getAttribute('data-pass') || '';
        passwordInput?.focus();
      });
    });

    otpInputs.forEach((input, i) => {
      input.setAttribute('aria-label', I18n.t('login.digit', { n: i + 1 }));
    });

    const togglePassword = document.getElementById('toggle-password');
    togglePassword.addEventListener('click', () => {
      const show = passwordInput.type === 'password';
      passwordInput.type = show ? 'text' : 'password';
      togglePassword.classList.toggle('is-visible', show);
      const label = show ? I18n.t('login.hidePassword') : I18n.t('login.showPassword');
      togglePassword.setAttribute('aria-label', label);
      togglePassword.title = label;
    });

    function showAlert(el, msg, type = 'error') {
      el.hidden = false;
      el.className = `alert alert-${type}`;
      el.textContent = msg;
    }

    function hideAlert(el) {
      el.hidden = true;
      el.textContent = '';
    }

    function showStep(step) {
      stepCred.classList.toggle('active', step === 'cred');
      stepOtp.classList.toggle('active', step === 'otp');
    }

    otpInputs.forEach((input, i) => {
      input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '').slice(0, 1);
        if (input.value && i < otpInputs.length - 1) otpInputs[i + 1].focus();
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && i > 0) otpInputs[i - 1].focus();
      });
      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
        text.split('').forEach((ch, idx) => {
          if (otpInputs[idx]) otpInputs[idx].value = ch;
        });
        otpInputs[Math.min(text.length, 5)]?.focus();
      });
    });

    function getOtp() {
      return otpInputs.map((i) => i.value).join('');
    }

    async function submitCredentials() {
      hideAlert(credAlert);
      const btn = document.getElementById('btn-send-otp');
      const draft = {
        client_id: document.getElementById('client_id').value.trim(),
        password: document.getElementById('password').value,
      };
      Auth.setLoginDraft(draft);

      btn.disabled = true;
      btn.textContent = I18n.t('login.sendingOtp');
      try {
        const data = await API.login(draft);
        if (data.otp_required || String(data.success) === '3') {
          showStep('otp');
          Toast.success(data.message || I18n.t('login.otpSent'));
          otpInputs[0].focus();
        } else if (data.token) {
          await finishLogin(data);
        } else if (String(data.success) === '0' || data.success === 0) {
          showAlert(credAlert, data.message || I18n.t('login.failed'));
        } else {
          showAlert(credAlert, data.message || I18n.t('login.unexpected'));
        }
      } catch (err) {
        showAlert(credAlert, err.message || I18n.t('login.failed'));
      } finally {
        btn.disabled = false;
        btn.textContent = I18n.t('login.continue');
      }
    }

    async function submitOtp() {
      hideAlert(otpAlert);
      const otp = getOtp();
      if (otp.length !== 6) {
        showAlert(otpAlert, I18n.t('login.enterOtp'));
        return;
      }
      const draft = Auth.getLoginDraft();
      const btn = document.getElementById('btn-verify-otp');
      btn.disabled = true;
      btn.textContent = I18n.t('login.verifying');
      try {
        const data = await API.login({ ...draft, otp });
        if (data.token) {
          await finishLogin(data);
        } else if (data.otp_required) {
          showAlert(otpAlert, data.message || I18n.t('login.otpStillRequired'));
        } else {
          showAlert(otpAlert, data.message || I18n.t('login.invalidOtp'));
        }
      } catch (err) {
        showAlert(otpAlert, err.message || I18n.t('login.verificationFailed'));
      } finally {
        btn.disabled = false;
        btn.textContent = I18n.t('login.verify');
      }
    }

    document.getElementById('form-credentials').addEventListener('submit', (e) => {
      e.preventDefault();
      submitCredentials();
    });
    document.getElementById('btn-send-otp').addEventListener('click', (e) => {
      e.preventDefault();
      submitCredentials();
    });

    document.getElementById('form-otp').addEventListener('submit', (e) => {
      e.preventDefault();
      submitOtp();
    });
    document.getElementById('btn-verify-otp').addEventListener('click', (e) => {
      e.preventDefault();
      submitOtp();
    });

    document.getElementById('btn-back').addEventListener('click', () => {
      showStep('cred');
      hideAlert(otpAlert);
      otpInputs.forEach((i) => (i.value = ''));
    });

    async function finishLogin(data) {
      Auth.setSession({
        token: data.token,
        customer: data.customer || { name: 'Customer', id: data.c_id },
      });
      Auth.clearLoginDraft();
      try {
        const welcome = await API.welcome();
        Auth.setSession({
          welcome,
          modules: welcome.modules || {},
          customer: {
            ...(Auth.getCustomer() || {}),
            id: welcome.c_id,
            name: welcome.name || Auth.getCustomer()?.name || 'Customer',
            owner_id: welcome.owner_id,
          },
        });
      } catch (err) {
        console.warn('Customer.Welcome failed', err);
        Auth.setSession({ modules: {} });
      }
      Toast.success(I18n.t('login.signedIn'));
      location.href = 'dashboard.html';
    }
