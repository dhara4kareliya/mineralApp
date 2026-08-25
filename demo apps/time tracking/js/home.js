/**
 * Home / dashboard page bootstrap.
 */
(function HomePage() {
  const endDialog = document.getElementById('end-shift-dialog');

  I18n.init();
  AppUI.initTheme();
  AppUI.bindThemeToggle('theme-toggle');
  AppUI.bindLangSwitch();

  document.addEventListener('langchange', async () => {
    Timesheet.initMonthPicker();
    await Timesheet.refreshStatus();
    await Timesheet.refreshTotals();
    await Timesheet.refreshHistory();
    AppUI.setSocketStatus(Realtime.isConnected());
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    Timesheet.destroy();
    Auth.logout();
    window.location.replace('login.html');
  });

  document.getElementById('btn-start').addEventListener('click', async () => {
    try {
      await Timesheet.startShift();
    } catch (err) {
      AppUI.flash(err.message || I18n.t('couldNotStart'), 'error');
    }
  });

  document.getElementById('btn-end').addEventListener('click', async () => {
    document.getElementById('end-shift-summary').textContent = I18n.t('endShiftConfirm');
    endDialog.showModal();
    await Timesheet.prepareEndShift();
  });

  document.getElementById('cancel-end').addEventListener('click', () => endDialog.close());

  document.getElementById('end-shift-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    endDialog.close();
    try {
      await Timesheet.endShift(document.getElementById('end-note').value.trim());
      document.getElementById('end-note').value = '';
    } catch (err) {
      AppUI.flash(err.message || I18n.t('couldNotEnd'), 'error');
    }
  });

  document.getElementById('refresh-history').addEventListener('click', () => {
    Timesheet.refreshHistory();
    Timesheet.refreshTotals();
  });

  document.getElementById('history-month').addEventListener('change', () => {
    Timesheet.updateMonthLabel();
    Timesheet.refreshHistory();
    Timesheet.refreshTotals();
  });

  function revealApp() {
    document.body.classList.remove('auth-checking');
    const loader = document.getElementById('boot-loader');
    if (loader) loader.remove();
  }

  (async function bootstrap() {
    try {
      const restored = await Auth.restoreSession();
      if (!restored) {
        window.location.replace('login.html');
        return;
      }

      const user = Auth.getUser();
      const name = user?.data?.user?.name || user?.data?.user?.email || I18n.t('user');
      AppUI.setUserName(name);

      await Timesheet.init();
      Realtime.connect((event) => Timesheet.handleSocketEvent(event));
      revealApp();
    } catch (_) {
      Api.logout();
      window.location.replace('login.html');
    }
  })();
})();
