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
  let selectedLogKey = '';
  let selectedEntryDetails = null;
  let accountTimezoneOffsetMinutes = null;
  let notesFilter = 'all';
  let eventsBound = false;

  const STATE_CLASS = {
    worked: 'cal-day-worked',
    sick: 'cal-day-sick',
    vacation: 'cal-day-vacation',
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

  function apiLocalParts(value) {
    const instant = Utils.parseApiDate(value);
    if (!instant) return null;
    const shifted = accountTimezoneOffsetMinutes === null
      ? instant
      : new Date(instant.getTime() + accountTimezoneOffsetMinutes * 60000);
    const utc = accountTimezoneOffsetMinutes !== null;
    return {
      year: utc ? shifted.getUTCFullYear() : shifted.getFullYear(),
      month: (utc ? shifted.getUTCMonth() : shifted.getMonth()) + 1,
      day: utc ? shifted.getUTCDate() : shifted.getDate(),
      hour: utc ? shifted.getUTCHours() : shifted.getHours(),
      minute: utc ? shifted.getUTCMinutes() : shifted.getMinutes()
    };
  }

  function learnAccountTimezoneOffset(utcValue, localDate, localTime) {
    const utc = Utils.parseApiDate(utcValue);
    const date = String(localDate || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    const time = String(localTime || '').match(/(?:^|T|\s)(\d{1,2}):(\d{2})/);
    if (!utc || !date || !time) return false;

    const localAsUtc = Date.UTC(
      Number(date[1]), Number(date[2]) - 1, Number(date[3]),
      Number(time[1]), Number(time[2])
    );
    let offset = Math.round((localAsUtc - utc.getTime()) / 60000);
    if (offset > 14 * 60) offset -= 24 * 60;
    if (offset < -12 * 60) offset += 24 * 60;
    if (offset < -12 * 60 || offset > 14 * 60) return false;
    accountTimezoneOffsetMinutes = offset;
    return true;
  }

  function inferAccountTimezoneFromRows() {
    for (const row of workdiaryRows) {
      const utcTime = row.start_time || row.start;
      const localDate = row.date_iso || row.date;
      const localTime = row.start_time_local || row.entrance || row.start_time;
      if (utcTime && localDate && localTime) {
        if (learnAccountTimezoneOffset(utcTime, localDate, localTime)) {
          return;
        }
      }
    }
  }

  function parseDateString(str) {
    if (!str) return null;
    const s = String(str).trim();
    const dmy = s.match(/^(\d{2})-(\d{2})-(\d{4})/);
    if (dmy) return { iso: `${dmy[3]}-${dmy[2]}-${dmy[1]}` };
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      // Date-only values represent a calendar day. Timestamp values are UTC
      // instants and must be grouped by the account's local calendar day.
      if (s.length > 10) {
        const timestamp = apiLocalParts(s);
        if (timestamp) {
          return {
            iso: `${timestamp.year}-${Utils.pad2(timestamp.month)}-${Utils.pad2(timestamp.day)}`
          };
        }
      }
      return { iso: s.slice(0, 10) };
    }
    const d = apiLocalParts(s);
    if (d) {
      return {
        iso: `${d.year}-${Utils.pad2(d.month)}-${Utils.pad2(d.day)}`
      };
    }
    return null;
  }

  function isoFromParts(y, m, d) {
    return `${y}-${Utils.pad2(m)}-${Utils.pad2(d)}`;
  }

  function sessionIso(row) {
    const parsed = parseDateString(row.date_iso || row.date || row.start_time || row.start);
    return parsed ? parsed.iso : '';
  }

  function isSickRow(row) {
    if (!row) return false;
    if (Number(row.sick_day) === 1 || Number(row.sick) === 1 || row.sick_day_type === 'sick') return true;
    const note = String(row.note || row.work_dairy_notes || '').toLowerCase();
    return note.includes('sick') || note.includes('מחלה');
  }

  function isVacationRow(row) {
    if (!row) return false;
    if (Number(row.sick_day) === 2 || Number(row.sick) === 2 || row.sick_day_type === 'vacation') return true;
    const note = String(row.note || row.work_dairy_notes || '').toLowerCase();
    return note.includes('vacation') || note.includes('חופש');
  }

  function isHolidayRow(row) {
    if (!row) return false;
    const values = [
      row.kind,
      row.type,
      row.state,
      row.status_name,
      row.note,
      row.work_dairy_notes
    ];
    const text = values
      .filter((val) => val !== undefined && val !== null && val !== '')
      .map((val) => String(val).toLowerCase())
      .join(' ');

    return text.includes('holiday') || text.includes('חג');
  }

  function isBreakRow(row) {
    if (!row) return false;
    if (isSickRow(row) || isVacationRow(row) || isHolidayRow(row)) return false;

    const values = [
      row.kind,
      row.type,
      row.state,
      row.status,
      row.status_name,
      row.break,
      row.is_break,
      row.note,
      row.work_dairy_notes
    ];

    const text = values
      .filter((val) => val !== undefined && val !== null && val !== '')
      .map((val) => String(val).toLowerCase())
      .join(' ');

    return /(break|pause|paused|rest|הפסקה|הפסקת|מנוחה)/.test(text);
  }

  function formatTimeValue(val) {
    if (!val) return '—';
    const s = String(val).trim();
    if (/^\d{1,2}:\d{2}/.test(s)) return s.slice(0, 5);
    const parts = apiLocalParts(s);
    if (!parts) return '—';
    const date = new Date(Date.UTC(2020, 0, 1, parts.hour, parts.minute));
    const locale = typeof I18n !== 'undefined' ? I18n.getLocale() : undefined;
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  }

  function isGhostLog(row) {
    if (!row) return false;
    if (isSickRow(row) || isVacationRow(row) || isBreakRow(row) || isHolidayRow(row)) return false;
    if (Number(row.status) === 1 || row.running) return false;

    const note = String(row.note || row.work_dairy_notes || '').trim();
    if (note && note !== '—') return false;

    const start = String(row.start_time || row.start || row.entrance || '').trim();
    const end = String(row.end_time || row.stop_time || row.end || row.exit || '').trim();

    const duration = String(row.total_hours || row.final_total || row.elapsed || calculateDurationFromTimes(start, end) || '').trim();

    if (duration === '00:00' || duration === '00:00:00' || duration === '0:00' || duration === '0' || duration === '') {
      return true; // Zero duration and no note -> ghost log
    }

    return false;
  }

  function getWorkdiaryRowsForIso(iso) {
    return workdiaryRows.filter((r) => parseRowDate(r)?.iso === iso && !isGhostLog(r));
  }

  function getWorkdiaryForIso(iso) {
    const rows = getWorkdiaryRowsForIso(iso);
    return rows.find(r => isSickRow(r) || isVacationRow(r) || isHolidayRow(r)) || rows[0];
  }

  function hasSickForIso(iso) {
    return getWorkdiaryRowsForIso(iso).some(isSickRow) || getSessionsForIso(iso).some(isSickRow);
  }

  function hasVacationForIso(iso) {
    return getWorkdiaryRowsForIso(iso).some(isVacationRow) || getSessionsForIso(iso).some(isVacationRow);
  }

  function hasHolidayForIso(iso) {
    return getWorkdiaryRowsForIso(iso).some(isHolidayRow) || getSessionsForIso(iso).some(isHolidayRow);
  }

  function ensureSelectionMeta(row, prefix = 'row') {
    if (!row) return row;
    const generated = rowSelectionKey(row, prefix);
    row.selectionKey = generated;
    row._selectionKey = generated;
    return row;
  }

  function attendanceApiId(row) {
    if (!row) return '';
    const value = row.team_hours_id ?? row.id ?? row.data_id ?? row.attendance_id ?? row.row_id;
    return value == null || value === '' ? '' : String(value);
  }

  function comparableClock(value) {
    const raw = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const parts = apiLocalParts(raw);
      return parts ? `${Utils.pad2(parts.hour)}:${Utils.pad2(parts.minute)}` : '';
    }
    return entryClock(raw);
  }

  function resolveTeamHoursId(row) {
    const ownId = attendanceApiId(row);
    if (ownId) return ownId;

    const rowDate = sessionIso(row);
    const rowStart = comparableClock(row.start_time || row.start || row.entrance);
    const rowEnd = comparableClock(row.end_time || row.stop_time || row.end || row.exit);
    if (!rowDate || !rowStart) return '';
    const rowNote = String(row.note || row.work_dairy_notes || '').trim();
    const matches = teamHoursRows.filter((candidate) => {
      if (sessionIso(candidate) !== rowDate ||
        comparableClock(candidate.start_time || candidate.start) !== rowStart ||
        comparableClock(candidate.end_time || candidate.stop_time || candidate.end) !== rowEnd) return false;
      const candidateNote = String(candidate.note || candidate.work_dairy_notes || '').trim();
      return !rowNote || !candidateNote || rowNote === candidateNote;
    });
    // Only attach an ID when the time/date match identifies exactly one row.
    return matches.length === 1 ? attendanceApiId(matches[0]) : '';
  }

  function getSessionsForIso(iso) {
    const seen = new Set();
    return [...teamHoursRows, ...workdiaryRows]
      .filter((row) => sessionIso(row) === iso && !isGhostLog(row))
      .map((row) => {
        ensureSelectionMeta(row, 'session');
        if (!attendanceApiId(row)) row._resolvedTeamHoursId = resolveTeamHoursId(row);
        return row;
      })
      .filter((row) => {
        const key = row.selectionKey;
        if (!key) return true;
        let identity = attendanceApiId(row);
        if (!identity) {
          identity = rowSelectionKey(row, 'session');
        } else {
          identity = 'id-' + identity;
        }

        if (seen.has(identity)) return false;
        seen.add(identity);
        return true;
      });
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
    if (Number(item.vacation_day) === 1 || Number(item.vacation) === 1) return true;
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
    if (hasVacationForIso(iso)) return 'vacation';
    const wd = getWorkdiaryForIso(iso);
    const sessions = getSessionsForIso(iso);

    if (wd && isBreakRow(wd)) return 'break';
    if (sessions.some(isBreakRow)) return 'break';

    let localWorked = false;
    const hasValidTime = (timeStr) => timeStr && String(timeStr).trim() !== '00:00' && String(timeStr).trim() !== '0:00';
    if (wd && (hasValidTime(wd.entrance) || hasValidTime(wd.exit) || (wd.total_hours && String(wd.total_hours) !== '0:00'))) localWorked = true;
    if (sessions.length > 0) localWorked = true;
    if (localWorked) return 'worked';

    const apiState = calendarMeta[iso];
    if (apiState === 'day_off') return apiState;

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

  // Monday-first weekday header, matching the Monday-first grid layout below.
  function weekdayLabels() {
    const base = new Date(2026, 7, 3); // a known Monday
    const labels = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      labels.push(d.toLocaleDateString(I18n.getLocale(), { weekday: 'short' }));
    }
    return labels;
  }

  function dayHoursText(info) {
    const fromWd = Utils.displayHours(info.row?.total_hours || info.row?.final_total);
    if (fromWd) return fromWd;
    const sec = (info.sessions || []).reduce((acc, s) => acc + Utils.sessionDurationSeconds(s), 0);
    if (sec <= 0) return '';
    return Utils.formatClock(sec).slice(0, 5);
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
    if (sec > 0) {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return `${h}:${Utils.pad2(m)}`;
    }
    return '';
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

  const ENTRY_LABEL_KEY = {
    worked: 'legendWorked',
    sick: 'legendSick',
    vacation: 'legendVacation',
    break: 'legendBreak',
    holiday: 'legendHoliday'
  };

  function dayEntryLabel(info) {
    const state = info.state;
    const labelKey = ENTRY_LABEL_KEY[state];
    if (!labelKey) return '';

    let text = I18n.t(labelKey).toUpperCase();

    const hours = dayHoursText(info);
    if (hours && state !== 'holiday') {
      text += ` - ${hours}`;
    } else if (state === 'sick' || state === 'vacation' || state === 'break') {
      const count = (info.sessions || []).filter((s) =>
        state === 'sick' ? isSickRow(s) : state === 'vacation' ? isVacationRow(s) : isBreakRow(s)
      ).length;
      if (count > 1) text += count;
    }

    return `<span class="cal-status-label">${text}</span>`;
  }

  function renderLegend() {
    const el = document.getElementById('cal-legend');
    const items = [
      ['worked', 'legendWorked'],
      ['sick', 'legendSick'],
      ['vacation', 'legendVacation'],
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

  function updateMonthLabel() {
    const label = document.getElementById('cal-month-label');
    if (!label) return;
    const [y, m] = monthKey.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    const text = d.toLocaleDateString(I18n.getLocale(), { month: 'long', year: 'numeric' });
    label.textContent = text.charAt(0).toUpperCase() + text.slice(1);
  }

  function shiftMonth(delta) {
    const [y, m] = monthKey.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const nextKey = `${d.getFullYear()}-${Utils.pad2(d.getMonth() + 1)}`;
    const select = document.getElementById('cal-month');
    if (select) {
      const hasOption = Array.from(select.options).some((o) => o.value === nextKey);
      if (hasOption) select.value = nextKey;
    }
    monthKey = nextKey;
    selectedIso = '';
    selectedLogKey = '';
    document.getElementById('day-form').classList.add('hidden');
    document.getElementById('day-hint').classList.remove('hidden');
    loadMonth();
  }

  function goToToday() {
    const todayIso = Utils.todayISO();
    const todayMonthKey = todayIso.slice(0, 7);
    if (todayMonthKey !== monthKey) {
      const select = document.getElementById('cal-month');
      if (select) select.value = todayMonthKey;
      monthKey = todayMonthKey;
      loadMonth().then(() => selectDay(todayIso));
    } else {
      selectedLogKey = 'new';
      selectedEntryDetails = null;
      selectDay(todayIso);
    }
  }

  // Renders a full Monday-first 6-row grid, including muted leading/trailing
  // days from the adjacent months so every visible week is complete.
  function renderGrid() {
    const grid = document.getElementById('cal-grid');
    const [y, m] = monthKey.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const daysInPrevMonth = new Date(y, m - 1, 0).getDate();
    const jsFirstDow = new Date(y, m - 1, 1).getDay(); // 0=Sun..6=Sat
    const leading = (jsFirstDow + 6) % 7; // convert to 0=Mon..6=Sun
    const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;
    const todayIso = Utils.todayISO();

    grid.innerHTML = '';

    for (let cell = 0; cell < totalCells; cell++) {
      const col = cell % 7; // 0=Mon .. 5=Sat, 6=Sun
      const dayNum = cell - leading + 1;
      const btn = document.createElement('button');
      btn.type = 'button';

      let cellY = y, cellM = m, cellD = dayNum, inMonth = true;
      if (dayNum < 1) {
        inMonth = false;
        cellD = daysInPrevMonth + dayNum;
        cellM = m - 1; cellY = y;
        if (cellM < 1) { cellM = 12; cellY -= 1; }
      } else if (dayNum > daysInMonth) {
        inMonth = false;
        cellD = dayNum - daysInMonth;
        cellM = m + 1; cellY = y;
        if (cellM > 12) { cellM = 1; cellY += 1; }
      }
      const iso = isoFromParts(cellY, cellM, cellD);
      const isWeekend = col === 5 || col === 6;

      let btnClass = 'cal-cell cal-day';
      if (isWeekend) btnClass += ' cal-day-weekend';
      if (!inMonth) btnClass += ' cal-day-outside';

      if (inMonth) {
        const info = dayStateMap[iso] || { state: 'missing', sessions: [] };
        let state = info.state || 'missing';
        if (iso === todayIso && state === 'missing') state = 'today';
        const stateClass = STATE_CLASS[state];
        if (stateClass && state !== 'future') btnClass += ` ${stateClass}`;
        if (iso === selectedIso) btnClass += ' cal-day-selected';
        if (iso === todayIso) btnClass += ' cal-day-is-today';

        btn.className = btnClass;
        btn.dataset.iso = iso;
        btn.innerHTML = `<div style="display: flex; justify-content: space-between; width: 100%; align-items: flex-start;"><span class="cal-day-num">${cellD}</span></div>${dayEntryLabel(info)}`;
        btn.addEventListener('click', () => {
          selectedLogKey = '';
          selectedEntryDetails = null;
          selectDay(iso);
        });
      } else {
        btn.className = btnClass;
        btn.disabled = true;
        btn.innerHTML = ``;
      }
      grid.appendChild(btn);
    }
  }

  function rowSelectionKey(row, fallbackPrefix = 'row') {
    if (!row) return '';

    const dateValue = row.date || row.work_dairy_add_date || row.start_time || row.start || '';
    const date = parseDateString(dateValue)?.iso || String(dateValue).trim();
    const clock = (value) => {
      const raw = String(value || '').trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
        const timestamp = apiLocalParts(raw);
        if (timestamp) return `${Utils.pad2(timestamp.hour)}:${Utils.pad2(timestamp.minute)}`;
      }
      const match = raw.match(/(?:^|T|\s)(\d{1,2}):(\d{2})/);
      return match ? `${Utils.pad2(match[1])}:${match[2]}` : '';
    };

    const parts = [
      date,
      clock(row.start_time || row.start || row.entrance),
      clock(row.end_time || row.stop_time || row.end || row.exit),
      String(row.note || row.work_dairy_notes || '').trim()
    ].filter((value) => value !== null && value !== undefined && value !== '');

    if (parts.length) {
      // Keep the same identity across Workdiary.Get and TeamHours.List so a
      // selected row resolves back to the matching source record.
      return 'log-' + parts.join('|');
    }

    return fallbackPrefix + '-empty';
  }

  function matchesSelectedKey(row, selectedKey) {
    if (!row || !selectedKey) return false;
    const key = row.selectionKey || row._selectionKey || rowSelectionKey(row, 'row');
    return String(key) === String(selectedKey);
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
    const d = apiLocalParts(s);
    if (d) return `${Utils.pad2(d.hour)}:${Utils.pad2(d.minute)}`;
    return '';
  }

  function setTimeControl(id, value) {
    const field = document.getElementById(id);
    if (!field) return;
    const time24 = toInputTime(value);
    field.value = time24;
    if (id === 'day-check-out') enforceCheckoutDayEnd();
    updateTimePeriod(id);
  }

  function readTimeControl(id) {
    const field = document.getElementById(id);
    if (!field) return '';
    const value = field.value;
    if (!value) return '';
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null;
  }

  function updateTimePeriod(id) {
    const field = document.getElementById(id);
    if (!field) return;
    const value = field.value;
    const badge = document.getElementById(id + '-period');
    if (badge) {
      const hour = value ? Number(value.split(':')[0]) : null;
      badge.textContent = hour === null ? '—' : (hour >= 12 ? 'PM' : 'AM');
    }
  }

  function enforceCheckoutDayEnd() {
    const field = document.getElementById('day-check-out');
    if (field && /^00:/.test(field.value)) field.value = '23:59';
  }

  function statusBadge(kind) {
    const map = {
      sick: ['badge-sick', 'legendSick'],
      vacation: ['badge-vacation', 'legendVacation'],
      break: ['badge-break', 'legendBreak'],
      running: ['badge-running', 'statusRunning'],
      completed: ['badge-stopped', 'statusCompleted']
    };
    const [cls, key] = map[kind] || map.completed;
    return `<span class="badge ${cls}">${I18n.t(key)}</span>`;
  }

  function timeToMinutes(value) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;

    const clean = String(value).trim();
    if (!clean) return null;

    const hm = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (hm) {
      const hours = Number(hm[1]);
      const minutes = Number(hm[2]);
      if (Number.isFinite(hours) && Number.isFinite(minutes)) return hours * 60 + minutes;
    }

    const parsed = Utils.parseApiDate(clean);
    if (parsed) return parsed.getHours() * 60 + parsed.getMinutes();

    return null;
  }

  function calculateDurationFromTimes(checkIn, checkOut) {
    const start = timeToMinutes(checkIn);
    const end = timeToMinutes(checkOut);
    if (start === null || end === null) return '—';

    let minutes = end - start;
    if (minutes < 0) minutes += 24 * 60;
    return Utils.formatClock(minutes * 60);
  }

  function normalizeCheckOutTime(checkIn, checkOut) {
    return /^00:/.test(checkOut || '') ? '23:59' : checkOut;
  }

  function entryClock(value) {
    const match = String(value || '').trim().match(/(?:^|T|\s)(\d{1,2}):(\d{2})/);
    return match ? `${Utils.pad2(match[1])}:${match[2]}` : '';
  }

  function localEntryDateTimeUtc(iso, time, isCheckout, checkIn) {
    const dateParts = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const timeParts = String(time).match(/^(\d{2}):(\d{2})$/);
    if (!dateParts || !timeParts) throw new Error('Enter a valid date and time.');
    let day = Number(dateParts[3]);
    const year = Number(dateParts[1]);
    const month = Number(dateParts[2]);
    const hour = Number(timeParts[1]);
    const minute = Number(timeParts[2]);
    if (isCheckout && checkIn && (hour * 60 + minute) < timeToMinutes(checkIn)) day += 1;
    const offset = accountTimezoneOffsetMinutes === null
      ? -new Date(year, month - 1, Number(dateParts[3])).getTimezoneOffset()
      : accountTimezoneOffsetMinutes;
    const utc = new Date(Date.UTC(year, month - 1, day, hour, minute) - offset * 60000);
    return `${utc.getUTCFullYear()}-${Utils.pad2(utc.getUTCMonth() + 1)}-${Utils.pad2(utc.getUTCDate())} ${Utils.pad2(utc.getUTCHours())}:${Utils.pad2(utc.getUTCMinutes())}:00`;
  }

  /**
   * Apply add vs. edit mode to the day form.
   * @param {Object|null} existingRecord — the stored record for this day, or null/undefined if none.
   */
  function applyDayFormMode(existingRecord) {
    const timesBlock = document.getElementById('day-times-block');
    const addHint = document.getElementById('day-times-add-hint');
    const typeSelect = document.getElementById('day-type');
    const lockHint = document.getElementById('day-type-lock-hint');
    const typeHint = document.getElementById('day-type-hint');
    const saveBtn = document.getElementById('day-save');
    const checkInEl = document.getElementById('day-check-in');
    const checkOutEl = document.getElementById('day-check-out');
    const regularOpt = typeSelect ? typeSelect.querySelector('option[value="regular"]') : null;

    const overlapWarning = document.getElementById('day-overlap-warning');
    if (overlapWarning) overlapWarning.classList.add('hidden');

    const isEdit = !!existingRecord;

    if (addHint) addHint.classList.toggle('hidden', isEdit);

    const deleteBtn = document.getElementById('day-delete');
    if (deleteBtn) deleteBtn.classList.toggle('hidden', !isEdit);

    if (regularOpt) regularOpt.hidden = true;

    if (lockHint) lockHint.classList.add('hidden');

    const hasExistingEntryForDay = selectedIso && dayStateMap[selectedIso] && !['missing', 'future', 'today'].includes(dayStateMap[selectedIso].state);
    
    const isLockedAddMode = !isEdit && hasExistingEntryForDay;
    const isTypeLocked = hasExistingEntryForDay || isEdit;

    const noteField = document.getElementById('day-note-field');
    const formActions = document.querySelector('.day-form-actions');
    if (noteField) noteField.classList.toggle('hidden', isLockedAddMode);
    if (formActions) formActions.classList.toggle('hidden', isLockedAddMode);

    if (typeSelect) {
       typeSelect.disabled = isTypeLocked;
    }
    if (lockHint) {
       lockHint.classList.toggle('hidden', !isTypeLocked);
    }
    const typeField = document.getElementById('day-type-field');
    if (typeField) {
       typeField.classList.remove('hidden');
    }

    if (isEdit) {
      // Determine the saved day type
      let savedType = 'regular';
      if (isSickRow(existingRecord)) savedType = 'sick';
      else if (isVacationRow(existingRecord)) savedType = 'vacation';
      else if (isHolidayRow(existingRecord)) savedType = 'holiday';
      if (typeSelect) typeSelect.value = savedType;

      const isRegularEdit = (savedType === 'regular');
      if (timesBlock) timesBlock.classList.toggle('hidden', !isRegularEdit);
      if (checkInEl) checkInEl.required = isRegularEdit;
      if (checkOutEl) checkOutEl.required = isRegularEdit;

      // Type hint is irrelevant in edit mode (type is locked)
      if (typeHint) typeHint.classList.add('hidden');
      if (saveBtn) saveBtn.disabled = false;
    } else {
      if (timesBlock) timesBlock.classList.add('hidden');
      if (checkInEl) checkInEl.required = false;
      if (checkOutEl) checkOutEl.required = false;
      // Add mode — default to sick, unless the day is already populated
      let defaultType = 'sick';
      if (selectedIso && dayStateMap[selectedIso]) {
        const state = dayStateMap[selectedIso].state;
        if (state === 'holiday') defaultType = 'holiday';
        else if (state === 'vacation') defaultType = 'vacation';
        else if (state === 'regular') defaultType = 'regular';
        else if (state === 'sick') defaultType = 'sick';
      }
      if (typeSelect) typeSelect.value = defaultType;

      const fromInput = document.getElementById('leave-from-date');
      const toInput = document.getElementById('leave-to-date');
      if (fromInput) fromInput.value = selectedIso;
      if (toInput) toInput.value = selectedIso;

      updateAddModeSaveState();
    }
  }

  /**
   * In add mode, enable/disable Save based on the selected day type.
   * Regular → disabled (hours must come from live timer).
   * Sick / Vacation → enabled.
   * Holiday → disabled (handled by the system).
   */
  function updateAddModeSaveState() {
    const isEdit = !!(selectedLogKey && selectedLogKey !== 'new');
    const typeSelect = document.getElementById('day-type');
    const selectedType = typeSelect ? typeSelect.value : 'regular';
    const multiDayBlock = document.getElementById('multi-day-block');
    const timesBlock = document.getElementById('day-times-block');
    const checkInEl = document.getElementById('day-check-in');
    const checkOutEl = document.getElementById('day-check-out');

    const hasExistingEntryForDay = selectedIso && dayStateMap[selectedIso] && !['missing', 'future', 'today'].includes(dayStateMap[selectedIso].state);
    const isLockedAddMode = !isEdit && hasExistingEntryForDay;

    // In Edit mode or Add mode, changing to Regular shows time fields. Sick/Vacation hides them.
    const isRegular = (selectedType === 'regular');
    if (timesBlock) timesBlock.classList.toggle('hidden', !isRegular);
    if (checkInEl) checkInEl.required = isRegular;
    if (checkOutEl) checkOutEl.required = isRegular;

    if (multiDayBlock) {
      if (!isEdit && !isLockedAddMode && (selectedType === 'sick' || selectedType === 'vacation' || selectedType === 'holiday')) {
        multiDayBlock.classList.remove('hidden');
      } else {
        multiDayBlock.classList.add('hidden');
      }
    }

    const overlapWarning = document.getElementById('day-overlap-warning');
    if (overlapWarning) overlapWarning.classList.add('hidden');

    const saveBtn = document.getElementById('day-save');
    const typeHint = document.getElementById('day-type-hint');
    const addHint = document.getElementById('day-times-add-hint');

    if (typeHint) typeHint.style.color = ''; // reset color

    if (selectedType === 'regular') {
      if (saveBtn) saveBtn.disabled = !isEdit; // In Add mode, can't save regular. In Edit mode, can save regular.
      if (typeHint) { typeHint.classList.add('hidden'); }
      if (addHint) { addHint.classList.toggle('hidden', isEdit); }
    } else {
      if (saveBtn) saveBtn.disabled = false;
      if (typeHint) {
        if (selectedType === 'holiday') {
          typeHint.textContent = 'This day is a company holiday.';
        } else {
          typeHint.textContent = I18n.t('specialDayTimeHint') || 'Sick and vacation entries are full-day records and do not track work hours.';
        }
        typeHint.classList.remove('hidden');
      }
      if (addHint) { addHint.classList.add('hidden'); }
    }
  }

  function displayCheckoutTime(time) {
    if (!time) return time;

    const [hour, minute] = time.split(':');

    if (hour === '00' && minute === '00') {
      return '23:59';
    }

    if (hour === '00') {
      return `23:${minute}`;
    }

    return time;
  }

  function selectDay(iso) {
    if (!selectedLogKey || selectedLogKey === 'new') {
      const sessions = getSessionsForIso(iso);
      const wd = getWorkdiaryForIso(iso);
      let targetKey = '';
      let targetDetails = null;

      if (sessions.length > 0) {
        const lastIdx = sessions.length - 1;
        targetDetails = { ...sessions[lastIdx] };
        targetKey = sessions[lastIdx].selectionKey || rowSelectionKey(sessions[lastIdx], 'session-' + lastIdx);
      } else if (sessions.length === 0 && wd) {
        targetDetails = { ...wd };
        targetKey = wd.selectionKey || rowSelectionKey(wd, 'wd');
      }

      if (targetKey) {
        selectedLogKey = targetKey;
        selectedEntryDetails = targetDetails;
      }
    }

    selectedIso = iso;
    renderGrid();
    updateMonthLabel();

    const form = document.getElementById('day-form');
    const hint = document.getElementById('day-hint');

    const isLogOpen = selectedLogKey && selectedLogKey !== 'new';

    // Always show the form when a day is selected (add or edit)
    form.classList.remove('hidden');
    hint.classList.add('hidden');

    document.getElementById('day-iso').value = iso;
    document.getElementById('day-selected-label').textContent = formatDisplayDate(iso);

    const rows = getWorkdiaryRowsForIso(iso);
    const sessions = getSessionsForIso(iso);
    document.getElementById('day-details-title').textContent = I18n.t(isLogOpen ? 'editEntry' : 'dayDetails');
    document.getElementById('day-save').textContent = I18n.t(isLogOpen ? 'updateEntry' : 'saveDay');
    document.getElementById('day-delete').classList.toggle('hidden', !isLogOpen);
    // A date click starts a new entry. A log click edits only that exact row;
    // never fall back to the first row on the day when its key does not match.
    const wd = isLogOpen
      ? (rows.find((row) => matchesSelectedKey(row, selectedLogKey)) || null)
      : null;
    const session = isLogOpen
      ? (sessions.find((row) => matchesSelectedKey(row, selectedLogKey)) || null)
      : null;
    const firstSession = isLogOpen ? session : (sessions[0] || null);
    const selectedRow = isLogOpen
      ? { ...(wd || session || {}), ...(selectedEntryDetails || {}) }
      : null;

    let checkIn = selectedRow?.entrance || selectedRow?.start_time || '';
    let checkOut = selectedRow?.exit || selectedRow?.end_time || '';
    if (!checkIn && firstSession) checkIn = firstSession.start_time;
    if (!checkOut && firstSession && Number(firstSession.status) !== 1) {
      checkOut = firstSession.end_time;
    }

    setTimeControl('day-check-in', isLogOpen ? checkIn : '00:00');
    setTimeControl('day-check-out', isLogOpen ? checkOut : '23:59');

    // Apply add/edit mode — this sets day-type, toggles time block, and manages Save state
    applyDayFormMode(isLogOpen ? (selectedRow || {}) : null);

    document.getElementById('day-note').value = isLogOpen ? (selectedRow?.note || selectedRow?.work_dairy_notes || '') : '';

    const selectedId = selectedEntryDetails?.apiId
      || attendanceApiId(session) || session?._resolvedTeamHoursId
      || attendanceApiId(wd) || wd?._resolvedTeamHoursId || '';
    document.getElementById('day-team-hours-id').value = isLogOpen ? (selectedId || '') : '';

    const hours = selectedRow?.total_hours || selectedRow?.final_total || '';
    const computedDuration = (!hours && isLogOpen && checkIn && checkOut) ? calculateDurationFromTimes(checkIn, checkOut) : '';
    const sessionNote = isLogOpen && sessions.length ? `${sessions.length} ${I18n.t('sessions').toLowerCase()}` : '';
    const durationText = hours ? `${I18n.t('totalHours')}: ${hours}` : computedDuration && computedDuration !== '—' ? `${I18n.t('totalHours')}: ${computedDuration}` : '';
    document.getElementById('day-hours').textContent = [durationText, sessionNote].filter(Boolean).join(' · ');

    renderDayExtras(isLogOpen ? selectedRow : null, isLogOpen ? sessions : []);
    renderNotesList();
  }

  function isApproved(row) {
    if (!row) return false;
    const v = row.approve ?? row.approved ?? row.approve_status;
    return v === 2 || v === '2' || v === true || String(v).toLowerCase() === 'approved';
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

    if (sessions.length === 0 && wd) {
      const duration = wd.total_hours || wd.final_total || calculateDurationFromTimes(wd.entrance, wd.exit);
      const row = {
        ...wd,
        id: wd.id || wd.team_hours_id || rowSelectionKey(wd, 'wd'),
        apiId: attendanceApiId(wd) || resolveTeamHoursId(wd),
        selectionKey: rowSelectionKey(wd, 'wd'),
        clockIn: formatTimeValue(wd.entrance),
        clockOut: formatTimeValue(wd.exit),
        duration,
        note: wd.note || wd.work_dairy_notes || (isHolidayRow(wd) ? 'Holiday' : '—'),
        kind: isSickRow(wd) ? 'sick' : (isVacationRow(wd) ? 'vacation' : (isHolidayRow(wd) ? 'holiday' : (isBreakRow(wd) ? 'break' : 'completed')))
      };
      row._selectionKey = row.selectionKey;
      rows.push(row);
    }

    sessions.forEach((s, idx) => {
      const kind = isSickRow(s) ? 'sick' : (isVacationRow(s) ? 'vacation' : (isHolidayRow(s) ? 'holiday' : (isBreakRow(s) ? 'break' : (Number(s.status) === 1 ? 'running' : 'completed'))));
      const allDayEntry = kind === 'sick' || kind === 'vacation' || kind === 'holiday';
      const sessionDuration = Utils.formatSessionDuration(s);
      const fallbackDuration = sessionDuration === '—' ? calculateDurationFromTimes(s.start_time, s.end_time || s.stop_time || s.end) : sessionDuration;
      const row = {
        ...s,
        id: s.id || s.team_hours_id || rowSelectionKey(s, 'session-' + idx),
        apiId: attendanceApiId(s) || s._resolvedTeamHoursId || resolveTeamHoursId(s),
        selectionKey: s.selectionKey || rowSelectionKey(s, 'session-' + idx),
        clockIn: allDayEntry ? '—' : formatTimeValue(s.start_time),
        clockOut: Number(s.status) === 1 ? '—' : formatTimeValue(s.end_time),
        duration: allDayEntry ? '00:00:00' : fallbackDuration,
        note: s.note || s.work_dairy_notes || (isHolidayRow(s) ? 'Holiday' : '—'),
        kind
      };
      row._selectionKey = row.selectionKey;
      rows.push(row);
    });

    let filtered = rows;
    if (notesFilter === 'sick') filtered = rows.filter((r) => r.kind === 'sick');
    if (notesFilter === 'vacation') filtered = rows.filter((r) => r.kind === 'vacation');
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
      const rowKey = row.selectionKey || rowSelectionKey(row, 'row');
      row.selectionKey = rowKey;
      row._selectionKey = rowKey;
      tr.dataset.logKey = rowKey;
      tr.style.cursor = 'pointer';
      tr.innerHTML = `
        <td>${row.clockIn}</td>
        <td>${row.kind === 'sick' || row.kind === 'vacation' ? '—' : row.clockOut}</td>
        <td>${row.duration}</td>
        <td>${row.note}</td>
        <td>${statusBadge(row.kind)}</td>
      `;
      tr.addEventListener('click', async () => {
        selectedLogKey = rowKey;
        selectedEntryDetails = { ...row };
        selectDay(selectedIso);
        if (!row.apiId) {
          // If a ghost log has no ID, allow clicking it anyway so they can overwrite it
          // AppUI.flash(I18n.t('missingAttendanceId'), 'error');
          // return;
        }
        try {
          const response = await Api.workdiaryEntryGet(row.apiId);
          if (selectedLogKey !== rowKey) return;
          selectedEntryDetails = { ...row, ...(response.data || response) };
          const localDate = selectedEntryDetails.date_iso || selectedEntryDetails.date || selectedIso;
          const localTime = selectedEntryDetails.start_time_local
            || selectedEntryDetails.start_time || selectedEntryDetails.entrance;
          if (learnAccountTimezoneOffset(row.start_time || row.start, localDate, localTime)) {
            selectedLogKey = rowSelectionKey(row, 'row');
          }
          selectDay(selectedIso);
        } catch (err) {
          AppUI.flash(err.message || I18n.t('couldNotLoadEntry'), 'error');
        }
      });
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
      teamHoursRows = Array.isArray(thRes.rows)
        ? thRes.rows
        : (Array.isArray(thRes.data) ? thRes.data : []);
      inferAccountTimezoneFromRows();
      calendarMeta = extractCalendarMeta(wdRes);
      dayStateMap = buildDayStateMap();

      renderGrid();
      updateMonthLabel();
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
      updateMonthLabel();
      renderNotesList();
    } finally {
      loading.classList.add('hidden');
    }
  }

  async function saveDay(e) {
    e.preventDefault();
    const btnSave = document.getElementById('day-save');
    if (btnSave) btnSave.disabled = true;

    try {
      const iso = document.getElementById('day-iso').value;

      let notes = document.getElementById('day-note').value.trim();
      const editingExistingLog = selectedLogKey && selectedLogKey !== 'new';
      const timesBlock = document.getElementById('day-times-block');
      const isAddMode = timesBlock && timesBlock.classList.contains('hidden');

      const dayType = document.getElementById('day-type').value;
      const isVacation = dayType === 'vacation';
      const isSick = dayType === 'sick';

      // Overlap check
      const toInput = document.getElementById('leave-to-date');
      let isMultiDay = document.getElementById('is-multi-day') && document.getElementById('is-multi-day').checked;
      const startIso = iso;
      const endIso = (isMultiDay && toInput && toInput.value) ? toInput.value : iso;

      let hasOverlap = false;
      if (startIso && endIso) {
        const startDate = new Date(startIso);
        const endDate = new Date(endIso);
        let curr = new Date(startDate);
        while (curr <= endDate) {
          const currIso = curr.toISOString().split('T')[0];
          const entries = getSessionsForIso(currIso);
          if (entries.some(r => !editingExistingLog || r.selectionKey !== selectedLogKey)) {
            hasOverlap = true;
            break;
          }
          curr.setDate(curr.getDate() + 1);
        }
      } else if (iso) {
        const entries = getSessionsForIso(iso);
        if (entries.some(r => !editingExistingLog || r.selectionKey !== selectedLogKey)) {
          hasOverlap = true;
        }
      }

      if (hasOverlap && (isSick || isVacation || dayType === 'holiday')) {
        const overlapWarning = document.getElementById('day-overlap-warning');
        if (overlapWarning) {
          const typeName = dayType === 'sick' ? I18n.t('sickDay') : (dayType === 'vacation' ? I18n.t('vacationDay') : I18n.t('regularDay'));
          overlapWarning.textContent = `⚠ You selected "${typeName}" but this day already has existing entries. Please delete them first from the log panel.`;
          overlapWarning.classList.remove('hidden');
        }
        if (btnSave) btnSave.disabled = false; // Allow them to click again if they change their mind
        return;
      }

      // Block saving a new regular-day entry (must use the live timer)
      if (isAddMode && dayType === 'regular') {
        AppUI.flash(
          I18n.t('useTimerForRegularLogs') || 'Regular work hours must be recorded via Live Shift Control on the Home page.',
          'error'
        );
        if (btnSave) btnSave.disabled = false;
        return;
      }

      // In add mode or for sick/vacation/holiday, times are irrelevant
      let checkInInput, checkOutInput;
      if (isAddMode || isSick || isVacation || dayType === 'holiday') {
        checkInInput = '00:00';
        checkOutInput = (dayType === 'holiday') ? '00:00' : '23:59';
        if (dayType === 'holiday' && !notes.trim()) {
          notes = 'Holiday';
        }
      } else {
        checkInInput = readTimeControl('day-check-in');
        const rawCheckOutInput = readTimeControl('day-check-out');
        checkOutInput = rawCheckOutInput === null ? null : normalizeCheckOutTime(checkInInput, rawCheckOutInput);

        if (dayType === 'regular' && (checkInInput === null || checkOutInput === null)) {
          AppUI.flash(I18n.t('invalidTimeFormat'), 'error');
          (checkInInput === null ? document.getElementById('day-check-in') : document.getElementById('day-check-out')).focus();
          return;
        }

        if (dayType === 'regular' && (!checkInInput || !checkOutInput)) {
          AppUI.flash(I18n.t('requiredAttendanceTimes'), 'error');
          (!checkInInput ? document.getElementById('day-check-in') : document.getElementById('day-check-out')).focus();
          return;
        }
      }

      let sickDayVal = '0';
      if (isSick) sickDayVal = '1';
      else if (isVacation) sickDayVal = '2'; // vacation might still be supported internally even though hidden

      const payload = {
        work_dairy_add_date: iso,
        work_dairy_check_in: checkInInput || '00:00',
        work_dairy_check_out: checkOutInput || '23:59',
        work_dairy_notes: notes,
        sick_day: sickDayVal
      };
      const teamHoursId = document.getElementById('day-team-hours-id').value;

      isMultiDay = !teamHoursId && (isSick || isVacation || dayType === 'holiday') &&
        document.getElementById('is-multi-day') && document.getElementById('is-multi-day').checked;

      const fromVal = iso;

      const toVal = (isMultiDay && toInput && toInput.value) ? toInput.value : iso;

      if (isSick && isMultiDay && fromVal < toVal) {
        // Multi-day sick leave: save entry for each date in range
        let cur = new Date(fromVal + 'T00:00:00');
        const endDate = new Date(toVal + 'T00:00:00');
        while (cur <= endDate) {
          const curIso = cur.toISOString().split('T')[0];
          const singlePayload = {
            work_dairy_add_date: curIso,
            work_dairy_check_in: checkInInput || '00:00',
            work_dairy_check_out: checkOutInput || '23:59',
            work_dairy_notes: notes,
            sick_day: '1'
          };
          await Api.workdiaryAttendanceSave(singlePayload);
          cur.setDate(cur.getDate() + 1);
        }
      } else {
        // Single day OR Vacation multi-day (Backend automatically expands vacation_from_date & vacation_to_date)
        const singlePayload = {
          work_dairy_add_date: iso,
          work_dairy_check_in: checkInInput || '00:00',
          work_dairy_check_out: checkOutInput || '23:59',
          work_dairy_notes: notes,
          sick_day: sickDayVal
        };
        if (editingExistingLog && teamHoursId) singlePayload.team_hours_id = teamHoursId;
        if (!teamHoursId && (isVacation || isSick || dayType === 'holiday')) {
          if (fromVal !== toVal) {
            singlePayload.work_dairy_vacation_from_date = fromVal;
            singlePayload.work_dairy_vacation_to_date = toVal;
          }
        }
        await Api.workdiaryAttendanceSave(singlePayload);
      }

      if (editingExistingLog) {
        try {
          const refreshedEntry = await Api.workdiaryEntryGet(teamHoursId);
          selectedEntryDetails = refreshedEntry.data || refreshedEntry;
          selectedLogKey = rowSelectionKey(selectedEntryDetails, 'row');
        } catch (_) {
          selectedEntryDetails = null;
          selectedLogKey = rowSelectionKey({
            date: iso,
            entrance: checkInInput,
            exit: checkOutInput,
            note: notes
          }, 'row');
        }
      }
      AppUI.flash(I18n.t('savedDay'), 'success');
      if (!editingExistingLog) selectedEntryDetails = null;
      await loadMonth();
      selectDay(iso);
    } catch (err) {
      AppUI.flash(err.message || I18n.t('couldNotSaveDay'), 'error');
    } finally {
      if (btnSave) btnSave.disabled = false;
    }
  }

  async function deleteSelectedEntry() {
    const teamHoursId = document.getElementById('day-team-hours-id').value;
    if (!selectedLogKey || selectedLogKey === 'new') {
      AppUI.flash(I18n.t('missingAttendanceId'), 'error');
      return;
    }
    if (!window.confirm(I18n.t('confirmDeleteEntry'))) return;

    const iso = selectedIso;
    const button = document.getElementById('day-delete');
    button.disabled = true;
    try {
      let deleteSuccess = false;
      if (teamHoursId) {
        try {
          await Api.workdiaryEntryDelete(teamHoursId);
          deleteSuccess = true;
        } catch (err) {
          console.warn('Failed to delete as team_hours_id, falling back to clear attendance', err);
        }
      }

      if (!deleteSuccess) {
        const fallbackPayload = {
          work_dairy_add_date: iso,
          work_dairy_check_in: '00:00',
          work_dairy_check_out: '00:00',
          work_dairy_notes: '',
          sick_day: '0'
        };
        if (teamHoursId) {
          fallbackPayload.team_hours_id = teamHoursId;
        }
        await Api.workdiaryAttendanceSave(fallbackPayload);
      }

      AppUI.flash(I18n.t('deletedEntry'), 'success');
      selectedLogKey = 'new';
      selectedEntryDetails = null;
      await loadMonth();
      selectDay(iso);
    } catch (err) {
      AppUI.flash(err.message || I18n.t('couldNotDeleteEntry'), 'error');
    } finally {
      button.disabled = false;
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
      selectedLogKey = '';
      document.getElementById('day-form').classList.add('hidden');
      document.getElementById('day-hint').classList.remove('hidden');
      loadMonth();
    });
    document.getElementById('cal-refresh').addEventListener('click', loadMonth);
    document.getElementById('cal-prev-month')?.addEventListener('click', () => {
      const sel = document.getElementById('cal-month');
      if (sel && sel.selectedIndex < sel.options.length - 1) {
        sel.selectedIndex++;
        sel.dispatchEvent(new Event('change'));
      }
    });
    document.getElementById('cal-next-month')?.addEventListener('click', () => {
      const sel = document.getElementById('cal-month');
      if (sel && sel.selectedIndex > 0) {
        sel.selectedIndex--;
        sel.dispatchEvent(new Event('change'));
      }
    });
    document.getElementById('cal-today-btn')?.addEventListener('click', goToToday);
    document.getElementById('day-form').addEventListener('submit', saveDay);
    document.getElementById('day-delete').addEventListener('click', deleteSelectedEntry);
    document.getElementById('day-type').addEventListener('change', updateAddModeSaveState);
    const toInput = document.getElementById('leave-to-date');
    if (toInput) toInput.addEventListener('change', updateAddModeSaveState);

    const multiDayCheck = document.getElementById('is-multi-day');
    if (multiDayCheck) {
      multiDayCheck.addEventListener('change', (e) => {
        const inputs = document.getElementById('multi-day-inputs');
        if (inputs) inputs.classList.toggle('hidden', !e.target.checked);
        updateAddModeSaveState();
      });
    }

    ['day-check-in', 'day-check-out'].forEach((id) => {
      document.getElementById(id).addEventListener('input', () => {
        if (id === 'day-check-out') enforceCheckoutDayEnd();
        updateTimePeriod(id);
      });
      document.getElementById(id).addEventListener('change', () => {
        if (id === 'day-check-out') enforceCheckoutDayEnd();
        updateTimePeriod(id);
      });
    });
    document.getElementById('notes-filter').addEventListener('change', (e) => {
      notesFilter = e.target.value;
      renderNotesList();
    });
  }

  function refreshUi() {
    renderLegend();
    renderWeekdays();
    renderGrid();
    updateMonthLabel();
    if (selectedIso) selectDay(selectedIso);
    else renderNotesList();
  }

  async function handleSocketEvent(event) {
    const key = event?.key || '';
    if (!key.includes('team_hours') && !key.includes('work_diary') && !key.includes('workingtime') && !key.includes('working_hours')) {
      return;
    }
    if (typeof AppUI !== 'undefined' && AppUI.pulseSocket) AppUI.pulseSocket();
    await loadMonth();
    if (selectedIso) selectDay(selectedIso);
  }

  async function init() {
    initMonthSelect();
    renderLegend();
    renderWeekdays();
    bindEvents();
    await loadMonth();
    if (!selectedIso) {
      selectDay(Utils.todayISO());
    }
  }

  return { init, refreshUi, handleSocketEvent };
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
      const client = typeof Api !== 'undefined' ? Api.getClient() : null;
      if (client && typeof client.on === 'function') {
        client.on('Socket', CalendarPage.handleSocketEvent);
      }
      revealApp();
    } catch (_) {
      Api.logout();
      window.location.replace('login.html');
    }
  })();
})();
