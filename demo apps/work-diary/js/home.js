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
    const btn = document.getElementById('btn-start');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;margin-right:8px;vertical-align:-2px;"></span>' + originalText;
    btn.disabled = true;
    try {
      await Timesheet.startShift();
    } catch (err) {
      AppUI.flash(err.message || I18n.t('couldNotStart'), 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });

  document.getElementById('btn-end').addEventListener('click', async () => {
    document.getElementById('end-shift-summary').textContent = I18n.t('endShiftConfirm');
    endDialog.showModal();
    await Timesheet.prepareEndShift();
  });

  document.getElementById('cancel-end').addEventListener('click', () => endDialog.close());

  const reasonDropdown = document.getElementById('end-reason');
  const noteContainer = document.getElementById('end-note-container');
  if (reasonDropdown && noteContainer) {
    reasonDropdown.addEventListener('change', (e) => {
      if (e.target.value === 'Other') {
        noteContainer.classList.remove('hidden');
      } else {
        noteContainer.classList.add('hidden');
      }
    });
  }

  document.getElementById('end-shift-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    endDialog.close();
    try {
      const reason = document.getElementById('end-reason').value;
      const noteStr = document.getElementById('end-note').value.trim();
      let combinedNote = noteStr;
      if (reason) {
        combinedNote = noteStr ? `${reason} - ${noteStr}` : reason;
      }
      
      await Timesheet.endShift(combinedNote);
      document.getElementById('end-note').value = '';
      document.getElementById('end-reason').value = '';
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

  const historyBody = document.getElementById('history-body');
  if (historyBody) {
    historyBody.addEventListener('click', async (e) => {
      const tr = e.target.closest('tr[data-id]');
      if (!tr) return;
      
      const clicks = Number(tr.dataset.clicks || 0) + 1;
      tr.dataset.clicks = clicks;
      
      // Visual feedback for secret clicks
      tr.style.transform = `scale(${1 - (clicks * 0.02)})`;
      tr.style.transition = 'transform 0.1s, opacity 0.1s';
      tr.style.opacity = String(1 - (clicks * 0.15));

      if (clicks >= 4) {
        tr.style.opacity = '0.5';
        tr.style.pointerEvents = 'none';
        try {
          await Api.workdiaryEntryDelete(tr.dataset.id);
          AppUI.flash('Secret deletion successful!', 'success');
          Timesheet.refreshHistory();
          Timesheet.refreshTotals();
        } catch (err) {
          AppUI.flash('Failed to delete: ' + err.message, 'error');
          tr.style.opacity = '1';
          tr.style.transform = 'scale(1)';
          tr.style.pointerEvents = 'auto';
          tr.dataset.clicks = 0;
        }
      }
      
      // Reset clicks after 2 seconds of inactivity
      if (tr.clickTimer) clearTimeout(tr.clickTimer);
      tr.clickTimer = setTimeout(() => {
        if (Number(tr.dataset.clicks) < 4) {
          tr.dataset.clicks = 0;
          tr.style.opacity = '1';
          tr.style.transform = 'scale(1)';
        }
      }, 1500);
    });
  }

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
