/**
 * Month calendar, notes & sick days (Workdiary.Get + TeamHours.List).
 */
const CalendarPage = (function () {
  let monthKey = '';
  let workdiaryRows = [];
  let teamHoursRows = [];
  let calendarMeta = {};
  let dayStateMap = {};
  let selectedIso = '';
  let notesFilter = 'all';
  let eventsBound = false;

  const STATE_CLASS = {
    worked: 'cal-day-worked',
    sick: 'cal-day-sick',
    break: 'cal-day-break',
    missing: 'cal-day-missing',
    holiday: 'cal-day-holiday',
    day_off: 'cal-day-off',
    today: 'cal-day-today',
    future: 'cal-day-future'
  };

  function parseRowDate(row) {
    if (!row) return null;
    const candidates = [row.date, row.work_dairy_add_date, row.start_time, row.start];
    for (let i = 0; i < candidates.length; i++) {
      const parsed = parseDateString(candidates[i]);
      if (parsed) return parsed;
    }
    return null;
  }

  function parseDateString(str) {
    if (!str) return null;
    const s = String(str).trim();
    const dmy = s.match(/^(\d{2})-(\d{2})-(\d{4})/);
    if (dmy) return { iso: `${dmy[3]}-${dmy[2]}-${dmy[1]}` };
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return { iso: s.slice(0, 10) };
    const d = Utils.parseApiDate(s);
    if (d) {
      return {
        iso: `${d.getFullYear()}-${Utils.pad2(d.getMonth() + 1)}-${Utils.pad2(d.getDate())}`
      };
    }
    return null;
  }

  function isoFromParts(y, m, d) {
    return `${y}-${Utils.pad2(m)}-${Utils.pad2(d)}`;
  }

  function sessionIso(row) {
    const parsed = parseDateString(row.start_time || row.start);
    return parsed ? parsed.iso : '';
  }

  function isSickRow(row) {
    if (!row) return false;
    if (Number(row.sick_day) === 1 || Number(row.sick) === 1) return true;
    const note = String(row.note || row.work_dairy_notes || '').toLowerCase();
    return note.includes('sick') || note.includes('מחלה');
  }

  function isBreakRow(row) {
    if (!row) return false;
    const note = String(row.note || row.work_dairy_notes || '').toLowerCase();
    return note.includes('break') && !isSickRow(row);
  }

  function formatTimeValue(val) {
    if (!val) return '—';
    const s = String(val).trim();
    if (/^\d{1,2}:\d{2}/.test(s)) return s.slice(0, 5);
    return Utils.toTimeStr(s);
  }

  function getWorkdiaryRowsForIso(iso) {
    return workdiaryRows.filter((r) => parseRowDate(r)?.iso === iso);
  }

  function getWorkdiaryForIso(iso) {
    const rows = getWorkdiaryRowsForIso(iso);
    return rows.find(isSickRow) || rows[0];
  }

  function hasSickForIso(iso) {
    return getWorkdiaryRowsForIso(iso).some(isSickRow) || getSessionsForIso(iso).some(isSickRow);
  }

  function getSessionsForIso(iso) {
    return teamHoursRows.filter((r) => sessionIso(r) === iso);
  }

  function normalizeMetaState(raw) {
    const s = String(raw || '').toLowerCase().replace(/\s+/g, '_');
    if (s === 'dayoff') return 'day_off';
    if (STATE_CLASS[s]) return s;
    return null;
  }

  function isAttendanceRow(item) {
    if (!item || typeof item !== 'object') return false;
    if (Number(item.sick_day) === 1 || Number(item.sick) === 1) return true;
    if (item.entrance || item.exit) return true;
    if (item.note || item.work_dairy_notes) return true;
    if (item.total_hours && String(item.total_hours) !== '0:00') return true;
    if (item.final_total) return true;
    if (item.files) return true;
    if (item.date && /^\d{2}-\d{2}-\d{4}/.test(String(item.date))) return true;
    return false;
  }

  function collectCalendarSources(res) {
    const sources = [];
    [res.calendar, res.month_calendar, res.calendar_days, res.days, res.calander].forEach((source) => {
      if (source) sources.push(source);
    });
    if (Array.isArray(res.data)) {
      const statusRows = res.data.filter((item) => item && item.status);
      if (statusRows.length) sources.push(statusRows);
    }
    return sources;
  }

  function extractCalendarMeta(res) {
    const meta = {};
    const [y, m] = monthKey.split('-').map(Number);

    collectCalendarSources(res).forEach((source) => {
      const list = Array.isArray(source) ? source : Object.values(source);
      list.forEach((item) => {
        if (!item || typeof item !== 'object') return;
        const state = normalizeMetaState(item.state || item.status || item.type);
        if (!state) return;

        const dateParsed = parseDateString(item.date);
        if (dateParsed) {
          meta[dateParsed.iso] = state;
          return;
        }

        const dayNum = item.day || item.date_day || item.d;
        if (dayNum) meta[isoFromParts(y, m, Number(dayNum))] = state;
      });
    });
    return meta;
  }

  function splitWorkdiaryResponse(res) {
    const all = Array.isArray(res.data) ? res.data : [];
    const attendance = all.filter(isAttendanceRow);
    return attendance.length ? attendance : all.filter((item) => !item.status);
  }

  function classifyDay(iso) {
    const todayIso = Utils.todayISO();
    const [y, m] = monthKey.split('-').map(Number);
    const cellDate = new Date(y, m - 1, parseInt(iso.slice(8, 10), 10));
    const isFuture = cellDate > new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    if (hasSickForIso(iso)) return 'sick';
    const wd = getWorkdiaryForIso(iso);
    if (wd && isBreakRow(wd)) return 'break';
    if (getSessionsForIso(iso).some(isBreakRow)) return 'break';

    const apiState = calendarMeta[iso];
    if (apiState) return apiState;

    const sessions = getSessionsForIso(iso);
    if (wd && (wd.entrance || wd.exit)) return 'worked';
    if (sessions.length > 0) return 'worked';

    if (isFuture) return 'future';
    if (iso === todayIso) return 'today';
    return 'missing';
  }

  function buildDayStateMap() {
    const map = {};
    const [y, m] = monthKey.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = isoFromParts(y, m, d);
      const wd = getWorkdiaryForIso(iso);
      const sessions = getSessionsForIso(iso);
      map[iso] = {
        iso,
        state: classifyDay(iso),
        row: wd,
        sessions
      };
    }
    return map;
  }

  function weekdayLabels() {
    const base = new Date(2026, 7, 2);
    const labels = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      labels.push(d.toLocaleDateString(I18n.getLocale(), { weekday: 'short' }));
    }
    return labels;
  }

  function statusDot(state) {
    if (!state || state === 'missing' || state === 'future') return '';
    const cls = STATE_CLASS[state];
    if (!cls) return '';
    return `<span class="cal-status-dot ${cls}" aria-hidden="true"></span>`;
  }

  function dayHoursText(info) {
    const fromWd = Utils.displayHours(info.row?.total_hours || info.row?.final_total);
    if (fromWd) return fromWd;
    const sec = (info.sessions || []).reduce((acc, s) => acc + Utils.sessionDurationSeconds(s), 0);
    if (sec <= 0) return '';
    return Utils.formatClock(sec).slice(0, 5);
  }

  function dayExtras(info) {
    const wd = info.row;
    const sessions = info.sessions || [];
    const hours = dayHoursText(info);
    const hasNote = !!(wd?.note || wd?.work_dairy_notes || sessions.some((s) => s.note));
    const hasFiles = Utils.normalizeFiles(wd?.files).length > 0;
    const bits = [];
    if (hours) bits.push(`<span class="cal-day-hours">${Utils.escapeHtml(hours)}</span>`);
    if (hasNote || hasFiles) {
      bits.push(`<span class="cal-day-icons">${hasNote ? '<span title="Note">N</span>' : ''}${hasFiles ? '<span title="File">F</span>' : ''}</span>`);
    }
    return bits.join('');
  }

  function dayMark(info) {
    const extras = dayExtras(info);
    if (info.sessions?.length > 1) {
      return `${extras}<span class="cal-day-mark cal-mark-sessions">${info.sessions.length}</span>`;
    }
    return extras;
  }

  function renderLegend() {
    const el = document.getElementById('cal-legend');
    const items = [
      ['worked', 'legendWorked'],
      ['sick', 'legendSick'],
      ['break', 'legendBreak'],
      ['missing', 'legendMissing'],
      ['holiday', 'legendHoliday'],
      ['day_off', 'legendDayOff'],
      ['today', 'legendToday']
    ];
    el.innerHTML = items.map(([state, key]) =>
      `<span class="cal-legend-item"><span class="cal-legend-dot ${STATE_CLASS[state]}"></span>${I18n.t(key)}</span>`
    ).join('');
  }

  function renderWeekdays() {
    document.getElementById('cal-weekdays').innerHTML = weekdayLabels()
      .map((w) => `<span class="cal-weekday">${w}</span>`)
      .join('');
  }

  function renderGrid() {
    const grid = document.getElementById('cal-grid');
    const [y, m] = monthKey.split('-').map(Number);
    const firstDow = new Date(y, m - 1, 1).getDay();
    const daysInMonth = new Date(y, m, 0).getDate();
    const todayIso = Utils.todayISO();

    grid.innerHTML = '';
    for (let i = 0; i < firstDow; i++) {
      const pad = document.createElement('span');
      pad.className = 'cal-cell cal-cell-empty';
      grid.appendChild(pad);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = isoFromParts(y, m, d);
      const info = dayStateMap[iso] || { state: 'missing', sessions: [] };
      let state = info.state || 'missing';
      if (iso === todayIso && state === 'missing') state = 'today';

      const btn = document.createElement('button');
      btn.type = 'button';
      let btnClass = 'cal-cell cal-day';
      const stateClass = STATE_CLASS[state];
      if (stateClass) btnClass += ` ${stateClass}`;
      if (iso === selectedIso) btnClass += ' cal-day-selected';
      if (iso === todayIso) btnClass += ' cal-day-is-today';
      if (state === 'future') btnClass += ' cal-day-future';
      btn.className = btnClass;
      btn.dataset.iso = iso;
      btn.innerHTML = `<span class="cal-day-num">${d}</span>${statusDot(state)}${dayMark(info)}`;
      btn.addEventListener('click', () => selectDay(iso));
      grid.appendChild(btn);
    }
  }

  function formatDisplayDate(iso) {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString(I18n.getLocale(), {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  function toInputTime(str) {
    if (!str) return '';
    const s = String(str).trim();
    const ampm = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?/i);
    if (ampm && !s.includes('T') && !s.includes(' ')) {
      return `${Utils.pad2(ampm[1])}:${ampm[2]}`;
    }
    if (ampm && ampm[3]) {
      let h = Number(ampm[1]);
      const mer = ampm[3].toLowerCase();
      if (mer === 'pm' && h < 12) h += 12;
      if (mer === 'am' && h === 12) h = 0;
      return `${Utils.pad2(h)}:${ampm[2]}`;
    }
    if (ampm && /^\d{1,2}:\d{2}/.test(s) && !/\d{4}-\d{2}-\d{2}/.test(s)) {
      return `${Utils.pad2(ampm[1])}:${ampm[2]}`;
    }
    const d = Utils.parseApiDate(s);
    if (d) return `${Utils.pad2(d.getHours())}:${Utils.pad2(d.getMinutes())}`;
    return '';
  }

  function statusBadge(kind) {
    const map = {
      sick: ['badge-sick', 'legendSick'],
      break: ['badge-break', 'legendBreak'],
      running: ['badge-running', 'statusRunning'],
      completed: ['badge-stopped', 'statusCompleted']
    };
    const [cls, key] = map[kind] || map.completed;
    return `<span class="badge ${cls}">${I18n.t(key)}</span>`;
  }

  function selectDay(iso) {
    selectedIso = iso;
    renderGrid();

    const form = document.getElementById('day-form');
    const hint = document.getElementById('day-hint');
    form.classList.remove('hidden');
    hint.classList.add('hidden');

    document.getElementById('day-iso').value = iso;
    document.getElementById('day-selected-label').textContent = formatDisplayDate(iso);

    const wd = getWorkdiaryForIso(iso);
    const sessions = getSessionsForIso(iso);
    const firstSession = sessions[0];

    let checkIn = wd?.entrance || '';
    let checkOut = wd?.exit || '';
    if (!checkIn && firstSession) checkIn = firstSession.start_time;
    if (!checkOut && firstSession && Number(firstSession.status) !== 1) {
      checkOut = firstSession.end_time;
    }

    document.getElementById('day-check-in').value = toInputTime(checkIn);
    document.getElementById('day-check-out').value = toInputTime(checkOut);
    document.getElementById('day-sick').checked = hasSickForIso(iso);
    document.getElementById('day-note').value = wd?.note || wd?.work_dairy_notes || '';
    document.getElementById('day-team-hours-id').value = wd?.team_hours_id || wd?.id || '';

    const hours = wd?.total_hours || wd?.final_total || '';
    const sessionNote = sessions.length
      ? `${sessions.length} ${I18n.t('sessions').toLowerCase()}`
      : '';
    document.getElementById('day-hours').textContent = [hours ? `${I18n.t('totalHours')}: ${hours}` : '', sessionNote]
      .filter(Boolean).join(' · ');

    renderDayExtras(wd, sessions);
    renderNotesList();
  }

  function isApproved(row) {
    if (!row) return false;
    const v = row.approve ?? row.approved ?? row.approve_status;
    return v === 1 || v === '1' || v === true || String(v).toLowerCase() === 'approved';
  }

  function renderDayExtras(wd, sessions) {
    const el = document.getElementById('day-extras');
    if (!el) return;
    const extra = wd?.extra_hours;
    const files = Utils.normalizeFiles(wd?.files);
    const running = sessions.filter((s) => Number(s.status) === 1).length;
    const completed = sessions.length - running;
    const chips = [];
    if (wd) {
      chips.push(`<span class="day-chip ${isApproved(wd) ? 'ok' : 'warn'}">${I18n.t(isApproved(wd) ? 'approved' : 'notApproved')}</span>`);
    }
    if (sessions.length) {
      const parts = [];
      if (running) parts.push(`${running} ${I18n.t('runningSessions')}`);
      if (completed) parts.push(`${completed} ${I18n.t('completedSessions')}`);
      chips.push(`<span class="day-chip info">${I18n.t('sessions')}: ${parts.join(' · ')}</span>`);
    }
    if (extra && !Utils.isEmptyHours(extra)) {
      chips.push(`<span class="day-chip">${I18n.t('extraHours')}: ${Utils.escapeHtml(extra)}</span>`);
    }
    if (wd?.final_total && !Utils.isEmptyHours(wd.final_total)) {
      chips.push(`<span class="day-chip">${I18n.t('finalTotal')}: ${Utils.escapeHtml(wd.final_total)}</span>`);
    }
    if (files.length) {
      const fileLinks = files.map((f) => `<a href="${Utils.escapeHtml(Utils.fileHref(f.url))}" target="_blank" rel="noopener">${Utils.escapeHtml(f.name)}</a>`).join(', ');
      chips.push(`<span class="day-chip">${I18n.t('files')}: ${fileLinks}</span>`);
    } else {
      chips.push(`<span class="day-chip">${I18n.t('noFiles')}</span>`);
    }
    el.innerHTML = chips.join('');
  }

  function renderNotesList() {
    const tbody = document.getElementById('notes-body');
    const empty = document.getElementById('notes-empty');
    const table = document.getElementById('notes-table');
    const emptyMsg = document.getElementById('notes-empty-msg');

    tbody.innerHTML = '';

    if (!selectedIso) {
      empty.classList.remove('hidden');
      table.classList.add('hidden');
      if (emptyMsg) emptyMsg.textContent = I18n.t('selectDayForSessions');
      return;
    }

    const wd = getWorkdiaryForIso(selectedIso);
    const sessions = getSessionsForIso(selectedIso);
    const rows = [];

    if (sessions.length === 0 && wd && (isSickRow(wd) || wd.note || wd.work_dairy_notes || wd.entrance || wd.exit)) {
      rows.push({
        clockIn: formatTimeValue(wd.entrance),
        clockOut: formatTimeValue(wd.exit),
        duration: wd.total_hours || wd.final_total || '—',
        note: wd.note || wd.work_dairy_notes || '—',
        kind: isSickRow(wd) ? 'sick' : (isBreakRow(wd) ? 'break' : 'completed')
      });
    }

    sessions.forEach((s) => {
      const kind = isSickRow(s) ? 'sick' : (isBreakRow(s) ? 'break' : (Number(s.status) === 1 ? 'running' : 'completed'));
      rows.push({
        clockIn: formatTimeValue(s.start_time),
        clockOut: Number(s.status) === 1 ? '—' : formatTimeValue(s.end_time),
        duration: Utils.formatSessionDuration(s),
        note: s.note || '—',
        kind
      });
    });

    let filtered = rows;
    if (notesFilter === 'sick') filtered = rows.filter((r) => r.kind === 'sick');
    if (notesFilter === 'break') filtered = rows.filter((r) => r.kind === 'break');
    if (notesFilter === 'notes') filtered = rows.filter((r) => r.note && r.note !== '—');

    if (!filtered.length) {
      empty.classList.remove('hidden');
      table.classList.add('hidden');
      if (emptyMsg) emptyMsg.textContent = I18n.t('noSessionsSelectedDay');
      return;
    }

    empty.classList.add('hidden');
    table.classList.remove('hidden');

    filtered.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.clockIn}</td>
        <td>${row.clockOut}</td>
        <td>${row.duration}</td>
        <td>${row.note}</td>
        <td>${statusBadge(row.kind)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  async function loadMonth() {
    const loading = document.getElementById('cal-loading');
    monthKey = document.getElementById('cal-month').value || Utils.toMonthKey();
    const { from, to } = Utils.monthStartEnd(monthKey);
    loading.classList.remove('hidden');

    try {
      const [wdRes, thRes] = await Promise.all([
        Api.workdiaryGet(monthKey),
        Api.teamHoursList({ from_date: from, to_date: to, limit: 100 })
      ]);

      workdiaryRows = splitWorkdiaryResponse(wdRes);
      teamHoursRows = thRes.rows || [];
      calendarMeta = extractCalendarMeta(wdRes);
      dayStateMap = buildDayStateMap();

      renderGrid();
      if (selectedIso && dayStateMap[selectedIso]) {
        selectDay(selectedIso);
      } else {
        renderNotesList();
      }
    } catch (err) {
      AppUI.flash(err.message || I18n.t('couldNotLoadCalendar'), 'error');
      workdiaryRows = [];
      teamHoursRows = [];
      dayStateMap = {};
      renderGrid();
      renderNotesList();
    } finally {
      loading.classList.add('hidden');
    }
  }

  async function saveDay(e) {
    e.preventDefault();
    const iso = document.getElementById('day-iso').value;
    const payload = {
      work_dairy_add_date: iso,
      work_dairy_check_in: document.getElementById('day-check-in').value || '',
      work_dairy_check_out: document.getElementById('day-check-out').value || '',
      work_dairy_notes: document.getElementById('day-note').value.trim(),
      sick_day: document.getElementById('day-sick').checked ? '1' : '0'
    };
    const teamHoursId = document.getElementById('day-team-hours-id').value;
    if (teamHoursId) payload.team_hours_id = teamHoursId;

    try {
      await Api.workdiaryAttendanceSave(payload);
      AppUI.flash(I18n.t('savedDay'), 'success');
      await loadMonth();
      selectDay(iso);
    } catch (err) {
      AppUI.flash(err.message || I18n.t('couldNotSaveDay'), 'error');
    }
  }

  function initMonthSelect() {
    Utils.populateMonthSelect(document.getElementById('cal-month'), 24);
  }

  function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;

    document.getElementById('cal-month').addEventListener('change', () => {
      selectedIso = '';
      document.getElementById('day-form').classList.add('hidden');
      document.getElementById('day-hint').classList.remove('hidden');
      loadMonth();
    });
    document.getElementById('cal-refresh').addEventListener('click', loadMonth);
    document.getElementById('day-form').addEventListener('submit', saveDay);
    document.getElementById('notes-filter').addEventListener('change', (e) => {
      notesFilter = e.target.value;
      renderNotesList();
    });
  }

  function refreshUi() {
    renderLegend();
    renderWeekdays();
    renderGrid();
    if (selectedIso) selectDay(selectedIso);
    else renderNotesList();
  }

  async function init() {
    initMonthSelect();
    renderLegend();
    renderWeekdays();
    bindEvents();
    await loadMonth();
  }

  return { init, refreshUi };
})();

(function CalendarBootstrap() {
  I18n.init();
  document.title = I18n.t('calendarTitle') + ' — ' + I18n.t('appName');
  AppUI.initTheme();
  AppUI.bindThemeToggle('theme-toggle');
  AppUI.bindLangSwitch();

  document.addEventListener('langchange', () => {
    document.title = I18n.t('calendarTitle') + ' — ' + I18n.t('appName');
    CalendarPage.refreshUi();
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    Auth.logout();
    window.location.replace('login.html');
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
      AppUI.setUserName(user?.data?.user?.name || user?.data?.user?.email || I18n.t('user'));
      await CalendarPage.init();
      revealApp();
    } catch (_) {
      Api.logout();
      window.location.replace('login.html');
    }
  })();
})();
