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

  function sumCompletedSeconds(rows, dateFilter) {
    return rows.reduce((acc, row) => {
      if (Number(row.status) === 1) return acc;
      if (dateFilter) {
        const startRaw = String(row.start_time || row.start || row.date || '').trim();
        let key = '';
        if (/^\d{4}-\d{2}-\d{2}/.test(startRaw)) {
          key = startRaw.slice(0, 10);
        } else if (/^(\d{2})-(\d{2})-(\d{4})/.test(startRaw)) {
          const m = startRaw.match(/^(\d{2})-(\d{2})-(\d{4})/);
          key = `${m[3]}-${m[2]}-${m[1]}`;
        } else {
          const start = Utils.parseApiDate(startRaw);
          if (start) {
            key = `${start.getFullYear()}-${Utils.pad2(start.getMonth() + 1)}-${Utils.pad2(start.getDate())}`;
          }
        }
        if (!key || !dateFilter(key)) return acc;
      }
      return acc + Utils.sessionDurationSeconds(row);
    }, 0);
  }

  function updateTodayDisplay() {
    const el = document.getElementById('total-today');
    if (!el) return;
    let seconds = todayBaseSeconds;
    if (shiftState === SHIFT.ACTIVE) {
      seconds += getSessionSeconds();
    }
    el.textContent = Utils.formatClock(seconds);
  }

  function updateMonthDisplay() {
    const el = document.getElementById('total-month');
    if (!el) return;
    const monthKey = document.getElementById('history-month')?.value || Utils.toMonthKey();
    let seconds = monthBaseSeconds;
    if (shiftState === SHIFT.ACTIVE && monthKey === Utils.toMonthKey()) {
      seconds += getSessionSeconds();
    }
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

  async function checkSpecialToday() {
    try {
      const wdRes = await Api.workdiaryGet(Utils.toMonthKey());
      const todayIso = Utils.todayISO();

      let isSpecial = false;
      let specialReason = '';

      const data = Array.isArray(wdRes.data) ? wdRes.data : [];
      const todayRows = data.filter((r) => {
        let rIso = '';
        if (r.date_iso) {
          rIso = String(r.date_iso).slice(0, 10);
        } else if (r.date && String(r.date).length >= 10 && String(r.date).includes('-')) {
          const parts = String(r.date).split('-');
          if (parts.length === 3) {
            rIso = parts[2].length === 4 ? `${parts[2]}-${parts[1]}-${parts[0]}` : String(r.date).slice(0, 10);
          }
        } else if (r.work_dairy_add_date) {
          rIso = String(r.work_dairy_add_date).slice(0, 10);
        } else if (r.start_time) {
          rIso = String(r.start_time).slice(0, 10);
        }

        return rIso === todayIso;
      });

      for (const row of todayRows) {
        if (Number(row.sick_day) === 1 || Number(row.sick) === 1 || String(row.sick_day_type).toLowerCase() === 'sick') {
          isSpecial = true; specialReason = 'sick day'; break;
        } else if (Number(row.sick_day) === 2 || Number(row.sick) === 2 || String(row.sick_day_type).toLowerCase() === 'vacation') {
          isSpecial = true; specialReason = 'vacation day'; break;
        } else {
          const note = String(row.note || row.work_dairy_notes || '').toLowerCase();
          if (note.includes('holiday') || note.includes('חג') || note.includes('vacation') || note.includes('sick')) {
            isSpecial = true; specialReason = note.includes('holiday') || note.includes('חג') ? 'holiday' : (note.includes('vacation') ? 'vacation day' : 'sick day'); break;
          }
        }
      }

      if (!isSpecial) {
        const cal = wdRes.calendar || wdRes.month_calendar || wdRes.calendar_days || [];
        const calArr = Array.isArray(cal) ? cal : Object.values(cal);
        const todayCal = calArr.find(c => {
          if (c.date && String(c.date).includes(todayIso.split('-').reverse().join('-'))) return true;
          if ((c.day || c.d) == parseInt(todayIso.slice(8, 10), 10)) return true;
          return false;
        });
        if (todayCal) {
          const st = Number(todayCal.status);
          if (st === 1 || String(todayCal.state).toLowerCase() === 'holiday') { isSpecial = true; specialReason = 'holiday'; }
          else if (st === 0 || st === 2 || String(todayCal.state).toLowerCase() === 'day_off') { isSpecial = true; specialReason = 'day off'; }
        }
      }

      return { isSpecial, specialReason };
    } catch (e) {
      console.warn('Could not validate today state', e);
      return { isSpecial: false, specialReason: '' };
    }
  }

  async function refreshStatus() {
    const res = await Api.teamHoursGet();
    const data = res.data || {};
    const running = res.running === true || data.status === 1 || data.running === true;

    if (running) {
      data.status = 1; // force status for duration calculation
      teamHoursId = res.team_hours_id || data.id || 0;
      elapsedBaseSeconds = Utils.sessionDurationSeconds(data);
      sessionStartUtc = Date.now();
      setShiftUI(SHIFT.ACTIVE, I18n.t('startedAt', { time: Utils.toTimeStr(data.start_time) }));
      startClockTick();
    } else {
      teamHoursId = 0;
      sessionStartUtc = null;
      elapsedBaseSeconds = 0;
      setShiftUI(SHIFT.OFF);
      stopClockTick();

      const { isSpecial } = await checkSpecialToday();
      if (isSpecial) {
        const btnStart = document.getElementById('btn-start');
        if (btnStart) btnStart.disabled = true;
      }
    }

    return res;
  }

  async function startShift() {
    try {
      const { isSpecial, specialReason } = await checkSpecialToday();

      if (isSpecial) {
        throw new Error(`You cannot start a timer on a ${specialReason}.`);
      }
    } catch (e) {
      if (e.message && e.message.includes('You cannot start a timer')) {
        throw e; // re-throw to be caught by the UI handler
      }
      console.warn('Could not validate today state', e);
    }

    const res = await Api.teamHoursStartStop({ timer_action: 'start' });
    AppUI.flash(res.message || I18n.t('shiftStarted'), 'success');
    await refreshStatus();
    await refreshTotals();
    await refreshHistory();
    return res;
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
    Utils.populateMonthSelect(select, 24, 1);
    updateMonthLabel();
  }

  async function refreshTotals() {
    const monthKey = document.getElementById('history-month')?.value || Utils.toMonthKey();
    const { from, to } = Utils.monthStartEnd(monthKey);
    const today = Utils.todayISO();

    try {
      const listRes = await Api.teamHoursList({ from_date: from, to_date: to, limit: 100 });
      const rows = listRes.rows || listRes.data || [];

      todayBaseSeconds = sumCompletedSeconds(rows, (day) => day === today);
      monthBaseSeconds = sumCompletedSeconds(rows);
      updateTodayDisplay();
      updateMonthDisplay();

      let sessionCount = rows.length;
      if (listRes.total != null && !isNaN(Number(listRes.total))) {
        sessionCount = Number(listRes.total);
      } else if (listRes.count != null && !isNaN(Number(listRes.count))) {
        sessionCount = Number(listRes.count);
      } else if (listRes.recordsTotal != null && !isNaN(Number(listRes.recordsTotal))) {
        sessionCount = Number(listRes.recordsTotal);
      }
      const countEl = document.getElementById('session-count');
      if (countEl) countEl.textContent = String(sessionCount);

      let myRow = null;
      let wdRes = null;
      try {
        wdRes = await Api.workdiaryGet(monthKey);
        const user = typeof Auth !== 'undefined' ? Auth.getUser() : null;
        const userId = user?.data?.user?.id;
        const listResWd = await Api.workdiaryList(monthKey);
        myRow = (listResWd.data || []).find((r) => String(r.id) === String(userId)) || (listResWd.data && listResWd.data[0]) || null;
        if (myRow) {
          const pctEl = document.getElementById('month-percent');
          if (pctEl) {
            pctEl.textContent = myRow.percent_from_month
              ? I18n.t('monthlyTarget', { percent: myRow.percent_from_month })
              : I18n.t('daysWorked', { days: myRow.day || 0 });
          }
        }
      } catch (err) {
        console.warn('Could not fetch workdiary details for totals', err);
        const pctEl = document.getElementById('month-percent');
        if (pctEl) pctEl.textContent = I18n.t('fromSessionHistory');
      }

      renderMonthOverview(myRow, monthBaseSeconds, wdRes, rows);
    } catch (err) {
      console.warn('Totals refresh failed', err);
    }
  }

  function setKpi(id, value, fallback = '0') {
    const el = document.getElementById(id);
    if (!el) return;
    if (value == null || value === '' || value === '—') {
      el.textContent = fallback;
    } else {
      el.textContent = String(value);
    }
  }

  function hoursToNumber(val) {
    if (val == null || val === '') return 0;
    if (typeof val === 'number') return val;
    const s = String(val).replace('%', '').trim();
    if (s.includes(':')) return Utils.parseTimeToSeconds(s) / 3600;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }

  function isSpecialOrGhostRow(r) {
    if (!r) return true;
    const note = String(r.note || r.work_dairy_notes || r.type || r.kind || r.state || '').toLowerCase();

    if (Number(r.sick_day) === 1 || Number(r.sick) === 1 || String(r.sick_day_type || '').toLowerCase() === 'sick') return true;
    if (Number(r.sick_day) === 2 || Number(r.sick) === 2 || String(r.sick_day_type || '').toLowerCase() === 'vacation') return true;
    if (note.includes('sick') || note.includes('מחלה') || note.includes('vacation') || note.includes('חופש') || note.includes('holiday') || note.includes('חג') || note.includes('rwe')) {
      return true;
    }

    const duration = Utils.sessionDurationSeconds(r);
    if (duration <= 0 && Number(r.status) !== 1 && !r.running) {
      return true;
    }

    return false;
  }

  function extractIsoDate(r) {
    if (!r) return '';
    const raw = String(r.date_iso || r.work_dairy_add_date || r.date || r.start_time || r.start || '').trim();
    if (!raw) return '';

    if (/^(\d{2})-(\d{2})-(\d{4})/.test(raw)) {
      const m = raw.match(/^(\d{2})-(\d{2})-(\d{4})/);
      return `${m[3]}-${m[2]}-${m[1]}`;
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      // Date-only strings represent a calendar day.
      if (raw.length <= 10) {
        return raw.slice(0, 10);
      }
      // Timestamps need local timezone conversion via parseApiDate
    }

    const parsed = Utils.parseApiDate(raw);
    if (parsed) {
      return `${parsed.getFullYear()}-${Utils.pad2(parsed.getMonth() + 1)}-${Utils.pad2(parsed.getDate())}`;
    }
    return '';
  }

  function renderMonthOverview(row, monthSeconds, wdRes, teamHoursRows) {
    // 1. Days Worked — count only real work sessions (exclude ghost logs, RWE, sick, vacation, holidays)
    const workedDates = new Set();
    if (Array.isArray(teamHoursRows)) {
      teamHoursRows.forEach((r) => {
        if (!isSpecialOrGhostRow(r)) {
          const key = extractIsoDate(r);
          if (key) workedDates.add(key);
        }
      });
    }
    const calcWorked = workedDates.size;
    console.log('calcWorked', calcWorked);
    setKpi('kpi-days', calcWorked, '0');

    // 2. Sick Days
    let sickCount = 0;
    const sickDates = new Set();
    const checkSickArr = (arr) => {
      if (Array.isArray(arr)) {
        arr.forEach((r) => {
          const isSick = Number(r.sick_day) === 1 || Number(r.sick) === 1 || String(r.sick_day_type || '').toLowerCase() === 'sick' ||
            String(r.note || r.work_dairy_notes || '').toLowerCase().includes('sick') ||
            String(r.note || r.work_dairy_notes || '').toLowerCase().includes('מחלה');
          if (isSick) {
            const d = extractIsoDate(r);
            if (d) sickDates.add(d);
            else sickCount++;
          }
        });
      }
    };
    checkSickArr(wdRes?.data);
    const finalSick = sickDates.size > 0 ? sickDates.size : Math.max(sickCount, Number(row?.sick_days || row?.sick || 0));
    setKpi('kpi-sick', finalSick, '0');

    // 3. Vacation Days
    let vacationCount = 0;
    const vacationDates = new Set();
    const checkVacationArr = (arr) => {
      if (Array.isArray(arr)) {
        arr.forEach((r) => {
          const note = String(r.note || r.work_dairy_notes || r.type || r.kind || r.state || '').toLowerCase();
          const isVac = Number(r.sick_day) === 2 || Number(r.sick) === 2 || String(r.sick_day_type || '').toLowerCase() === 'vacation' ||
            note.includes('vacation') || note.includes('חופש') || note.includes('holiday') || note.includes('חג') || note.includes('leave');
          if (isVac) {
            const d = extractIsoDate(r);
            if (d) vacationDates.add(d);
            else vacationCount++;
          }
        });
      }
    };
    checkVacationArr(wdRes?.data);
    const finalVacation = vacationDates.size > 0 ? vacationDates.size : Math.max(vacationCount, Number(row?.vacation_days || row?.vacation || row?.holidays || 0));
    setKpi('kpi-vacation', finalVacation, '0');

    // 4. Total Month Hours
    const totalClock = Utils.formatClock(monthSeconds);
    const displayHours = monthSeconds > 0 ? totalClock : (row?.total_hours || '00:00:00');
    setKpi('kpi-total-hours', displayHours, '00:00:00');

    // 5. Extra Hours
    setKpi('kpi-extra', row?.extra_hours, '0');

    // 6. Done Missions
    setKpi('kpi-missions', row?.done_mission ?? row?.done_missions, '0');
  }



  let historyData = [];
  let currentHistoryPage = 1;
  const HISTORY_PAGE_SIZE = 10;

  let accountTimezoneOffset = null;

  function formatRowDate(val) {
    if (!val) return '—';
    const d = Utils.parseApiDate(val);
    if (!d) return '—';
    let m = d.getTime();
    if (accountTimezoneOffset !== null) {
      m += accountTimezoneOffset * 60000;
      m += d.getTimezoneOffset() * 60000;
    }
    const locale = typeof I18n !== 'undefined' ? I18n.getLocale() : undefined;
    return new Date(m).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function formatRowTime(val) {
    if (!val) return '—';
    const d = Utils.parseApiDate(val);
    if (!d) return '—';
    let m = d.getTime();
    if (accountTimezoneOffset !== null) {
      m += accountTimezoneOffset * 60000;
      m += d.getTimezoneOffset() * 60000;
    }
    const locale = typeof I18n !== 'undefined' ? I18n.getLocale() : undefined;
    return new Date(m).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }

  function renderHistoryRows(rows) {
    const tbody = document.getElementById('history-body');
    const cards = document.getElementById('history-cards');

    // Auto-detect backend timezone offset if provided
    for (const row of rows) {
      const utcTime = row.start_time || row.start;
      const localDate = row.date_iso || row.date;
      const localTime = row.start_time_local || row.entrance;

      if (utcTime && localDate && localTime) {
        const utcDate = Utils.parseApiDate(utcTime);
        const dateMatch = String(localDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
        const timeMatch = String(localTime).match(/(?:^|T|\s)(\d{1,2}):(\d{2})/);

        if (utcDate && dateMatch && timeMatch) {
          const localAsUtc = Date.UTC(
            Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]),
            Number(timeMatch[1]), Number(timeMatch[2])
          );
          let offset = Math.round((localAsUtc - utcDate.getTime()) / 60000);
          if (offset > 14 * 60) offset -= 24 * 60;
          if (offset < -12 * 60) offset += 24 * 60;

          if (offset >= -12 * 60 && offset <= 14 * 60) {
            accountTimezoneOffset = offset;
            break; // Stop learning once we find a valid offset
          }
        }
      }
    }

    tbody.innerHTML = '';
    cards.innerHTML = '';

    const sortedRows = [...rows].sort((a, b) => {
      const dateA = new Date(a.start_time || a.start || 0).getTime();
      const dateB = new Date(b.start_time || b.start || 0).getTime();
      return dateB - dateA; // newest first
    });

    historyData = sortedRows.filter(r => !isSpecialOrGhostRow(r));
    renderHistoryPage(1);
  }

  function renderHistoryPage(page) {
    currentHistoryPage = page;
    const startIdx = (page - 1) * HISTORY_PAGE_SIZE;
    const endIdx = startIdx + HISTORY_PAGE_SIZE;
    const pageRows = historyData.slice(startIdx, endIdx);

    const tbody = document.getElementById('history-body');
    const cards = document.getElementById('history-cards');
    const empty = document.getElementById('history-empty');
    const table = document.getElementById('history-table');
    const pag = document.getElementById('history-pagination');

    tbody.innerHTML = '';
    cards.innerHTML = '';

    if (!historyData.length) {
      empty.classList.remove('hidden');
      table.classList.add('hidden');
      if (pag) pag.classList.add('hidden');
      return;
    }

    empty.classList.add('hidden');
    table.classList.remove('hidden');
    if (pag) pag.classList.remove('hidden');

    let lastDateStr = null;

    pageRows.forEach((row) => {
      const isRunning = row.status === 1;
      const breakText = [row.note, row.work_dairy_notes, row.status, row.status_name, row.type].filter(Boolean).join(' ').toLowerCase();
      const isBreak = /(break|pause|paused|rest|הפסקה|הפסקת|מנוחה)/.test(breakText);
      let statusLabel = isRunning ? I18n.t('statusRunning') : I18n.t('statusCompleted');
      let badgeClass = isRunning ? 'badge-running' : 'badge-stopped';
      if (isBreak && !isRunning) {
        statusLabel = I18n.t('statusBreakBadge');
        badgeClass = 'badge-break';
      }

      const duration = Utils.formatSessionDuration(row);
      const rowDateStr = formatRowDate(row.start_time || row.start);

      if (lastDateStr !== null && lastDateStr !== rowDateStr) {
        // Insert a completely empty row to differentiate between dates
        const gapTr = document.createElement('tr');
        gapTr.className = 'date-gap-row';
        gapTr.style.border = 'none';
        gapTr.style.borderBottom = 'none';
        gapTr.style.background = 'var(--bg)';
        gapTr.innerHTML = `<td colspan="6" style="height: 24px; padding: 0; border: none; border-bottom: none; background: var(--bg); pointer-events: none;"></td>`;
        tbody.appendChild(gapTr);
      }
      lastDateStr = rowDateStr;

      const tr = document.createElement('tr');
      tr.dataset.id = row.id;
      tr.innerHTML = `
        <td>${formatRowDate(row.start_time || row.start)}</td>
        <td>${formatRowTime(row.start_time || row.start)}</td>
        <td>${isRunning ? '—' : formatRowTime(row.end_time || row.stop_time || row.end)}</td>
        <td>${duration}</td>
        <td class="note-col" title="${Utils.escapeHtml(row.note || '')}">
          <div style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${Utils.escapeHtml(row.note || '—')}
          </div>
        </td>
        <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
      `;
      tbody.appendChild(tr);

      const card = document.createElement('article');
      card.className = 'session-card';
      card.innerHTML = `
        <h4>${formatRowDate(row.start_time || row.start)} <span class="badge ${badgeClass}">${statusLabel}</span></h4>
        <div class="session-row"><span>${I18n.t('colClockIn')}</span><strong>${formatRowTime(row.start_time || row.start)}</strong></div>
        <div class="session-row"><span>${I18n.t('colClockOut')}</span><strong>${isRunning ? '—' : formatRowTime(row.end_time || row.stop_time || row.end)}</strong></div>
        <div class="session-row"><span>${I18n.t('colDuration')}</span><strong>${duration}</strong></div>
        <div class="session-row"><span>${I18n.t('colNote')}</span><strong>${Utils.escapeHtml(row.note || '—')}</strong></div>
      `;
      cards.appendChild(card);
    });

    // Update Pagination UI
    const totalPages = Math.ceil(historyData.length / HISTORY_PAGE_SIZE);
    const infoEl = document.getElementById('page-info');
    if (infoEl) infoEl.textContent = `Showing ${startIdx + 1} to ${Math.min(endIdx, historyData.length)} of ${historyData.length} entries`;

    const btnPrev = document.getElementById('page-prev');
    const btnNext = document.getElementById('page-next');
    if (btnPrev) {
      btnPrev.disabled = page === 1;
      btnPrev.onclick = () => { if (currentHistoryPage > 1) renderHistoryPage(currentHistoryPage - 1); };
    }
    if (btnNext) {
      btnNext.disabled = page === totalPages;
      btnNext.onclick = () => { if (currentHistoryPage < totalPages) renderHistoryPage(currentHistoryPage + 1); };
    }

    const numbersContainer = document.getElementById('page-numbers');
    if (numbersContainer) {
      numbersContainer.innerHTML = '';
      for (let i = 1; i <= totalPages; i++) {
        // Show up to 5 page numbers (simple window)
        if (totalPages > 5 && (i < page - 2 || i > page + 2)) {
          if (i === 1 || i === totalPages) {
            // always show first and last
          } else if (i === page - 3 || i === page + 3) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            numbersContainer.appendChild(ellipsis);
            continue;
          } else {
            continue;
          }
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = i === page ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm';
        btn.textContent = String(i);
        btn.onclick = () => renderHistoryPage(i);
        numbersContainer.appendChild(btn);
      }
    }
  }

  async function refreshHistory() {
    const loading = document.getElementById('history-loading');
    const table = document.getElementById('history-table');
    const empty = document.getElementById('history-empty');
    const pag = document.getElementById('history-pagination');
    const monthKey = document.getElementById('history-month').value || Utils.toMonthKey();
    const { from, to } = Utils.monthStartEnd(monthKey);
    updateMonthLabel();

    if (loading) loading.classList.remove('hidden');

    try {
      const res = await Api.teamHoursList({ from_date: from, to_date: to, limit: 25 });
      renderHistoryRows(res.rows || []);
    } catch (err) {
      AppUI.flash(err.message || I18n.t('couldNotLoadHistory'), 'error');
      renderHistoryRows([]);
    } finally {
      if (loading) loading.classList.add('hidden');
    }
  }

  let socketDebounceTimer = null;
  async function handleSocketEvent(event) {
    const key = event?.key || '';
    if (!key.includes('team_hours') && !key.includes('workingtime') && !key.includes('working_hours')) {
      return;
    }

    AppUI.pulseSocket();

    if (socketDebounceTimer) clearTimeout(socketDebounceTimer);
    socketDebounceTimer = setTimeout(async () => {
      await refreshStatus();
      await refreshTotals();
      await refreshHistory();

      const tbody = document.getElementById('history-body');
      if (tbody && tbody.firstElementChild) {
        tbody.firstElementChild.classList.add('socket-highlight');
        setTimeout(() => tbody.firstElementChild?.classList.remove('socket-highlight'), 1200);
      }
    }, 500);
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
