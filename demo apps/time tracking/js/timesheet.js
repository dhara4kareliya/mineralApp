/**
 * Time Tracking & Timesheets module logic.
 */
const Timesheet = (function () {
  const SHIFT = { OFF: 'off', ACTIVE: 'active' };

  let shiftState = SHIFT.OFF;
  let teamHoursId = 0;
  let sessionStartUtc = null;
  let elapsedBaseSeconds = 0;
  let clockTimer = null;
  let lastMeta = '';
  let todayBaseSeconds = 0;
  let monthBaseSeconds = 0;
  let todayDisplayFloor = 0;
  let todayFloorDate = '';
  let monthDisplayFloor = 0;
  let monthFloorKey = '';

  function sumCompletedSeconds(rows, dateFilter) {
    return rows.reduce((acc, row) => {
      if (Number(row.status) === 1) return acc;
      if (dateFilter) {
        const start = Utils.parseApiDate(row.start_time || row.start);
        if (!start) return acc;
        const key = `${start.getFullYear()}-${Utils.pad2(start.getMonth() + 1)}-${Utils.pad2(start.getDate())}`;
        if (!dateFilter(key)) return acc;
      }
      return acc + Utils.sessionDurationSeconds(row);
    }, 0);
  }

  function updateTodayDisplay() {
    const el = document.getElementById('total-today');
    if (!el) return;
    const today = Utils.todayISO();
    if (todayFloorDate !== today) {
      todayFloorDate = today;
      todayDisplayFloor = 0;
    }
    let seconds = todayBaseSeconds;
    if (shiftState === SHIFT.ACTIVE) {
      seconds += getSessionSeconds();
    }
    seconds = Math.max(seconds, todayDisplayFloor);
    todayDisplayFloor = seconds;
    el.textContent = Utils.formatClock(seconds);
  }

  function updateMonthDisplay() {
    const el = document.getElementById('total-month');
    if (!el) return;
    const monthKey = document.getElementById('history-month')?.value || Utils.toMonthKey();
    if (monthFloorKey !== monthKey) {
      monthFloorKey = monthKey;
      monthDisplayFloor = 0;
    }
    let seconds = monthBaseSeconds;
    if (shiftState === SHIFT.ACTIVE && monthKey === Utils.toMonthKey()) {
      seconds += getSessionSeconds();
    }
    seconds = Math.max(seconds, monthDisplayFloor);
    monthDisplayFloor = seconds;
    el.textContent = Utils.formatClock(seconds);
  }

  function startClockTick() {
    stopClockTick();
    clockTimer = setInterval(updateLiveClock, 1000);
    updateLiveClock();
  }

  function stopClockTick() {
    if (clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  }

  function getSessionSeconds() {
    let total = elapsedBaseSeconds;
    if (sessionStartUtc && shiftState === SHIFT.ACTIVE) {
      total += Math.floor((Date.now() - sessionStartUtc) / 1000);
    }
    return total;
  }

  function updateLiveClock() {
    const el = document.getElementById('live-clock');
    if (!el) return;
    el.textContent = Utils.formatClock(getSessionSeconds());
    el.classList.toggle('ticking', shiftState === SHIFT.ACTIVE);
    el.classList.remove('break');
    updateTodayDisplay();
    updateMonthDisplay();
  }

  function setShiftUI(state, meta) {
    shiftState = state;
    lastMeta = meta || '';
    const pill = document.getElementById('shift-status');
    const text = document.getElementById('shift-status-text');
    const metaEl = document.getElementById('shift-started-at');
    const btnStart = document.getElementById('btn-start');
    const btnEnd = document.getElementById('btn-end');

    pill.className = 'status-pill';
    if (state === SHIFT.ACTIVE) {
      pill.classList.add('status-active');
      btnStart.disabled = true;
      btnEnd.disabled = false;
    } else {
      pill.classList.add('status-off');
      btnStart.disabled = false;
      btnEnd.disabled = true;
    }

    text.textContent = I18n.t(state === SHIFT.ACTIVE ? 'statusActive' : 'statusOff');
    I18n.updateShiftButtons(state);
    if (metaEl) metaEl.textContent = meta || I18n.t('notClockedIn');
    updateLiveClock();
  }

  async function refreshStatus() {
    const res = await Api.teamHoursGet();
    const data = res.data || {};
    const running = res.running === true || data.status === 1 || data.running === true;

    if (running) {
      teamHoursId = res.team_hours_id || data.id || 0;
      const startTime = Utils.parseApiDate(data.start_time || data.start);
      const elapsedFromApi = Utils.parseElapsed(data.elapsed);
      const prevElapsed = shiftState === SHIFT.ACTIVE ? getSessionSeconds() : 0;
      let elapsed = elapsedFromApi;
      if (elapsed <= 0 && startTime) {
        elapsed = Math.max(0, Math.floor((Date.now() - startTime.getTime()) / 1000));
      }
      // Tick from local now so client/server clock skew cannot jump the timer backwards.
      elapsedBaseSeconds = Math.max(elapsed, prevElapsed);
      sessionStartUtc = Date.now();
      setShiftUI(SHIFT.ACTIVE, I18n.t('startedAt', { time: Utils.toTimeStr(data.start_time || data.start) }));
      startClockTick();
    } else {
      teamHoursId = 0;
      sessionStartUtc = null;
      elapsedBaseSeconds = 0;
      setShiftUI(SHIFT.OFF);
      stopClockTick();
    }

    return res;
  }

  async function startShift() {
    elapsedBaseSeconds = 0;
    sessionStartUtc = Date.now();
    setShiftUI(SHIFT.ACTIVE);
    startClockTick();

    try {
      const res = await Api.teamHoursStartStop({ timer_action: 'start' });
      AppUI.flash(res.message || I18n.t('shiftStarted'), 'success');
      await refreshStatus();
      await refreshTotals();
      await refreshHistory();
      return res;
    } catch (err) {
      sessionStartUtc = null;
      elapsedBaseSeconds = 0;
      setShiftUI(SHIFT.OFF);
      stopClockTick();
      throw err;
    }
  }

  function countList(val) {
    if (Array.isArray(val)) return val.length;
    if (val && typeof val === 'object') return Object.keys(val).length;
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  }

  async function prepareEndShift() {
    const kpis = document.getElementById('end-shift-kpis');
    const summary = document.getElementById('end-shift-summary');
    if (summary) summary.textContent = I18n.t('endShiftConfirm');
    if (kpis) kpis.classList.add('hidden');

    try {
      const when = await Api.teamHoursWhenStop();
      const hours = when.hours_today != null ? when.hours_today : '—';
      const done = when.done_missions_total != null ? when.done_missions_total : countList(when.done_missions);
      const testing = countList(when.testing_missions);
      const open = countList(when.query_missions);

      const hoursEl = document.getElementById('end-hours-today');
      const doneEl = document.getElementById('end-missions-done');
      const testEl = document.getElementById('end-missions-testing');
      const openEl = document.getElementById('end-missions-open');
      if (hoursEl) hoursEl.textContent = String(hours);
      if (doneEl) doneEl.textContent = String(done);
      if (testEl) testEl.textContent = String(testing);
      if (openEl) openEl.textContent = String(open);
      if (kpis) kpis.classList.remove('hidden');

      if (summary && when.hours_today != null) {
        summary.textContent = I18n.t('todaySummary', {
          hours: when.hours_today,
          missions: done
        });
      }
    } catch (_) { /* optional preview */ }
  }

  async function endShift(note) {
    if (shiftState === SHIFT.OFF) return;

    let summary = '';
    try {
      const when = await Api.teamHoursWhenStop();
      if (when.hours_today != null) {
        summary = I18n.t('todaySummary', {
          hours: when.hours_today,
          missions: when.done_missions_total || 0
        });
      }
    } catch (_) { /* optional */ }

    await Api.teamHoursStartStop({
      timer_action: 'stop',
      team_hours_id: teamHoursId || undefined,
      note: note || 'End of shift'
    });

    const sessionSec = getSessionSeconds();
    todayBaseSeconds += sessionSec;
    monthBaseSeconds += sessionSec;
    teamHoursId = 0;
    sessionStartUtc = null;
    elapsedBaseSeconds = 0;
    setShiftUI(SHIFT.OFF);
    stopClockTick();
    AppUI.flash(I18n.t('shiftEnded') + (summary ? ` · ${summary}` : ''), 'success');
    await refreshTotals();
    await refreshHistory();
  }

  function updateMonthLabel() {
    const select = document.getElementById('history-month');
    const label = document.getElementById('history-month-label');
    if (!select || !label) return;
    const monthKey = select.value || Utils.toMonthKey();
    label.textContent = I18n.t('showingMonth', { month: Utils.formatMonthLabel(monthKey) });
  }

  function initMonthPicker() {
    const select = document.getElementById('history-month');
    Utils.populateMonthSelect(select, 24);
    updateMonthLabel();
  }

  async function refreshTotals() {
    const monthKey = document.getElementById('history-month')?.value || Utils.toMonthKey();
    const { from, to } = Utils.monthStartEnd(monthKey);
    const today = Utils.todayISO();

    try {
      const listRes = await Api.teamHoursList({ from_date: from, to_date: to, limit: 25 });
      const rows = listRes.rows || [];

      const apiToday = sumCompletedSeconds(rows, (day) => day === today);
      const apiMonth = sumCompletedSeconds(rows);
      const isCurrentMonth = monthKey === Utils.toMonthKey();
      todayBaseSeconds = isCurrentMonth ? Math.max(apiToday, todayBaseSeconds) : apiToday;
      monthBaseSeconds = isCurrentMonth ? Math.max(apiMonth, monthBaseSeconds) : apiMonth;
      updateTodayDisplay();
      updateMonthDisplay();

      document.getElementById('session-count').textContent = String(rows.length);

      let myRow = null;
      try {
        const wd = await Api.workdiaryList(monthKey);
        const user = Auth.getUser();
        const userId = user?.data?.user?.id;
        myRow = (wd.data || []).find((r) => String(r.id) === String(userId)) || (wd.data && wd.data[0]) || null;
        if (myRow) {
          document.getElementById('month-percent').textContent = myRow.percent_from_month
            ? I18n.t('monthlyTarget', { percent: myRow.percent_from_month })
            : I18n.t('daysWorked', { days: myRow.day || 0 });
        }
      } catch (_) {
        document.getElementById('month-percent').textContent = I18n.t('fromSessionHistory');
      }

      renderMonthOverview(myRow, monthBaseSeconds);
      await renderCustomerTime(from, to);
    } catch (err) {
      console.warn('Totals refresh failed', err);
    }
  }

  function setKpi(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value == null || value === '' ? '—' : String(value);
  }

  function hoursToNumber(val) {
    if (val == null || val === '') return 0;
    if (typeof val === 'number') return val;
    const s = String(val).replace('%', '').trim();
    if (s.includes(':')) return Utils.parseTimeToSeconds(s) / 3600;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }

  function renderMonthOverview(row, monthSeconds) {
    setKpi('kpi-days', row?.day);
    setKpi('kpi-extra', row?.extra_hours);
    setKpi('kpi-missions', row?.done_mission);
    setKpi('kpi-sales', row?.sales);
    setKpi('kpi-calls', row?.call);
    setKpi('kpi-salary', row?.salary);

    // const label = document.getElementById('target-progress-label');
    // const bar = document.getElementById('target-progress-bar');
    // const pctEl = document.getElementById('target-progress-pct');
    // if (!label || !bar) return;

    const doneHours = hoursToNumber(row?.total_hours) || (monthSeconds / 3600);

    // function setProgress(pct, text) {
      // const level = pct >= 80 ? 'is-high' : pct >= 40 ? 'is-mid' : 'is-low';
      // label.textContent = text;
      // bar.style.width = `${pct}%`;
      // bar.className = `progress-fill ${level}`;
      // if (pctEl) {
      //   pctEl.textContent = `${pct}%`;
      //   pctEl.className = `target-pct ${level}`;
      // }
    // }

    Api.workdiarySettingsGet().then((settings) => {
      const target = Number(settings.work_diary_monthly_hour || settings.monthly_hour || 0);
      if (!target) {
        return;
      }
      const pct = Math.max(0, Math.min(100, Math.round((doneHours / target) * 100)));
    }).catch(() => {
    
    });
  }

  function customerLabel(row) {
    return row.customer_name || row.contact_name || row.name || row.company
      || row.contactus_name || row.client || `#${row.contactus_id || row.customer_id || row.id || ''}`;
  }

  async function renderCustomerTime(from, to) {
    const tbody = document.getElementById('customer-body');
    const empty = document.getElementById('customer-empty');
    const table = document.getElementById('customer-table');
    if (!tbody || !empty || !table) return;

    tbody.innerHTML = '';
    try {
      const res = await Api.workingTimeList({ from_date: from, to_date: to, limit: 25 });
      const rows = res.rows || res.data || [];
      if (!rows.length) {
        empty.classList.remove('hidden');
        table.classList.add('hidden');
        return;
      }
      empty.classList.add('hidden');
      table.classList.remove('hidden');
      rows.forEach((row) => {
        const start = row.start || row.start_time;
        const end = row.end || row.end_time || row.stop;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${Utils.escapeHtml(customerLabel(row))}</td>
          <td>${Utils.toDateKey(start)}</td>
          <td>${Utils.toTimeStr(start)}</td>
          <td>${end ? Utils.toTimeStr(end) : '—'}</td>
          <td>${Utils.formatSessionDuration(row)}</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (_) {
      empty.classList.remove('hidden');
      table.classList.add('hidden');
    }
  }

  function renderHistoryRows(rows) {
    const tbody = document.getElementById('history-body');
    const cards = document.getElementById('history-cards');
    const empty = document.getElementById('history-empty');
    const table = document.getElementById('history-table');

    tbody.innerHTML = '';
    cards.innerHTML = '';

    if (!rows.length) {
      empty.classList.remove('hidden');
      table.classList.add('hidden');
      return;
    }

    empty.classList.add('hidden');
    table.classList.remove('hidden');

    rows.forEach((row) => {
      const isRunning = row.status === 1;
      const isBreak = (row.note || '').toLowerCase().includes('break');
      let statusLabel = isRunning ? I18n.t('statusRunning') : I18n.t('statusCompleted');
      let badgeClass = isRunning ? 'badge-running' : 'badge-stopped';
      if (isBreak && !isRunning) {
        statusLabel = I18n.t('statusBreakBadge');
        badgeClass = 'badge-break';
      }

      const duration = Utils.formatSessionDuration(row);

      const tr = document.createElement('tr');
      tr.dataset.id = row.id;
      tr.innerHTML = `
        <td>${Utils.toDateKey(row.start_time || row.start)}</td>
        <td>${Utils.toTimeStr(row.start_time || row.start)}</td>
        <td>${isRunning ? '—' : Utils.toTimeStr(row.end_time || row.stop_time || row.end)}</td>
        <td>${duration}</td>
        <td>${Utils.escapeHtml(row.note || '—')}</td>
        <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
      `;
      tbody.appendChild(tr);

      const card = document.createElement('article');
      card.className = 'session-card';
      card.innerHTML = `
        <h4>${Utils.toDateKey(row.start_time || row.start)} <span class="badge ${badgeClass}">${statusLabel}</span></h4>
        <div class="session-row"><span>${I18n.t('colClockIn')}</span><strong>${Utils.toTimeStr(row.start_time || row.start)}</strong></div>
        <div class="session-row"><span>${I18n.t('colClockOut')}</span><strong>${isRunning ? '—' : Utils.toTimeStr(row.end_time || row.stop_time || row.end)}</strong></div>
        <div class="session-row"><span>${I18n.t('colDuration')}</span><strong>${duration}</strong></div>
        <div class="session-row"><span>${I18n.t('colNote')}</span><strong>${Utils.escapeHtml(row.note || '—')}</strong></div>
      `;
      cards.appendChild(card);
    });
  }

  async function refreshHistory() {
    const loading = document.getElementById('history-loading');
    const monthKey = document.getElementById('history-month').value || Utils.toMonthKey();
    const { from, to } = Utils.monthStartEnd(monthKey);
    updateMonthLabel();

    loading.classList.remove('hidden');
    try {
      const res = await Api.teamHoursList({ from_date: from, to_date: to, limit: 25 });
      renderHistoryRows(res.rows || []);
    } catch (err) {
      AppUI.flash(err.message || I18n.t('couldNotLoadHistory'), 'error');
      renderHistoryRows([]);
    } finally {
      loading.classList.add('hidden');
    }
  }

  async function handleSocketEvent(event) {
    const key = event?.key || '';
    if (!key.includes('team_hours') && !key.includes('workingtime') && !key.includes('working_hours')) {
      return;
    }

    AppUI.pulseSocket();
    await refreshStatus();
    await refreshTotals();
    await refreshHistory();

    const tbody = document.getElementById('history-body');
    if (tbody && tbody.firstElementChild) {
      tbody.firstElementChild.classList.add('socket-highlight');
      setTimeout(() => tbody.firstElementChild?.classList.remove('socket-highlight'), 1200);
    }
  }

  async function init() {
    initMonthPicker();
    await refreshStatus();
    await refreshTotals();
    await refreshHistory();
  }

  function destroy() {
    stopClockTick();
    shiftState = SHIFT.OFF;
    lastMeta = '';
  }

  return {
    init,
    destroy,
    refreshStatus,
    refreshTotals,
    refreshHistory,
    initMonthPicker,
    updateMonthLabel,
    startShift,
    prepareEndShift,
    endShift,
    handleSocketEvent
  };
})();
