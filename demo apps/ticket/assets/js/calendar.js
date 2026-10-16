/**
 * Biz1 Ticket Platform — Calendar Engine (calendar.js)
 * Day & Week view matching the OG calendar layout with Ticket Platform color tokens.
 * Displays identical ticket cards to schedule.html (client, number, status pill, subject, address, action buttons).
 * View-only ticket visualization (no add, no edit, no delete).
 * Time on Left Y-axis, Dates & Staff on Top X-axis in both Day & Week views.
 */
(function (global) {
  'use strict';

  const START_HOUR = 8;
  const END_HOUR = 19;
  const HOUR_HEIGHT = 80; // Compact height matching streamlined card

  // Staff matching Ticket Platform theme colors & working hours
  const STAFF = [
    { id: 'manoj', name: 'Manoj', role: 'Field Technician', color: '#1d60a2', hours: '09:00 – 17:00' },
    { id: 'chintan', name: 'chintan', role: 'Service Specialist', color: '#7c3aed', hours: '—' },
    { id: 'test', name: 'Test', role: 'Support Tech', color: '#2e8a63', hours: '09:00 – 17:00' },
    { id: 'demo', name: 'Demo', role: 'Senior Technician', color: '#bd8324', hours: '09:00 – 17:00' }
  ];

  const STATUS_CONFIG = {
    opened: { bg: 'rgba(46, 138, 99, 0.18)', text: '#2e8a63', accent: '#2e8a63', label: 'Opened' },
    assigned: { bg: 'rgba(29, 96, 162, 0.18)', text: '#1d60a2', accent: '#1d60a2', label: 'Assigned' },
    closed: { bg: 'rgba(192, 57, 43, 0.18)', text: '#c0392b', accent: '#c0392b', label: 'Closed' }
  };

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const FULL_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  let currentView = 'day'; // 'day' or 'week'
  let currentDate = new Date(); // Defaults to today (Oct 10, 2026)
  let miniCalMonth = currentDate.getMonth();
  let miniCalYear = currentDate.getFullYear();
  let selectedStaffId = 'all';
  let searchQuery = '';
  let tickets = [];

  function fmtDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function startOfWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d;
  }

  function timeToMinutes(str) {
    if (!str) return 0;
    const m = String(str).match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (!m) return 0;
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    const ap = (m[3] || '').toLowerCase();
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    return h * 60 + min;
  }

  function initials(name) {
    return (name || '')
      .split(' ')
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function timeColumnHTML() {
    let out = '';
    for (let h = START_HOUR; h < END_HOUR; h++) {
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      const ampm = h < 12 ? 'AM' : 'PM';
      out += `<div class="time-slot">${hour12}:00 <span style="font-size:9px;color:var(--text-muted);">${ampm}</span></div>`;
    }
    return out;
  }

  /* Ground-truth API ticket data from user Ticket.List response */
  const RAW_API_TICKETS = [
    {
      ticket_id: 22290,
      customer_name: "Demo",
      ticket_name: "Demo",
      subject: "demo ticket 13",
      open_date: "2026-10-09T04:39:11.000Z",
      due_date: "2026-10-09T00:00:00.000Z",
      close_date: "2026-10-09T04:43:16.000Z",
      ticket_from_time: "11:00:00",
      ticket_to_time: "11:30:00",
      status: 3,
      email: "demo@yopmail.com",
      phone: "9099490994",
      address: "Data not found",
      assign_member_id: ["26190"],
      staffId: 'manoj',
      checklist: '• Inspect pressure valve\n• Check filtration system'
    },
    {
      ticket_id: 22113,
      customer_name: "Demo",
      subject: "bro",
      open_date: "2026-10-06T13:17:08.000Z",
      due_date: "2026-10-06T13:17:08.000Z",
      close_date: null,
      ticket_from_time: null,
      ticket_to_time: null,
      start: "10:00",
      end: "11:00",
      status: 1,
      email: "demo@yopmail.com",
      phone: "9099490994",
      address: "Data not found",
      assign_member_id: [],
      staffId: 'demo',
      checklist: '• Filter replacement'
    },
    {
      ticket_id: 22112,
      customer_name: "Demo",
      subject: "80[p7f",
      open_date: "2026-10-06T13:15:01.000Z",
      due_date: "2026-10-06T13:15:01.000Z",
      close_date: null,
      ticket_from_time: null,
      ticket_to_time: null,
      start: "11:00",
      end: "12:00",
      status: 2,
      email: "demo@yopmail.com",
      phone: "9099490994",
      address: "Data not found",
      assign_member_id: [],
      staffId: 'test',
      checklist: '• Complete sanitation'
    },
    {
      ticket_id: 21998,
      customer_name: "Demo",
      subject: "creator4",
      open_date: "2026-10-05T12:11:44.000Z",
      due_date: "2026-10-05T12:11:44.000Z",
      close_date: null,
      ticket_from_time: null,
      ticket_to_time: null,
      start: "12:00",
      end: "13:00",
      status: 1,
      email: "demo@yopmail.com",
      phone: "9099490994",
      address: "Data not found",
      assign_member_id: [],
      staffId: 'chintan',
      checklist: '• Pressure check'
    },
    {
      ticket_id: 21944,
      customer_name: "Demo",
      subject: "-fkfpkofjkpo",
      open_date: "2026-10-05T06:03:45.000Z",
      due_date: "2026-10-05T06:03:45.000Z",
      close_date: null,
      ticket_from_time: null,
      ticket_to_time: null,
      start: "13:00",
      end: "14:00",
      status: 1,
      email: "demo@yopmail.com",
      phone: "9099490994",
      address: "Data not found",
      assign_member_id: [],
      staffId: 'manoj',
      checklist: '• Completed'
    },
    {
      ticket_id: 21865,
      customer_name: "Demo",
      subject: "create home page",
      open_date: "2026-10-03T06:20:41.000Z",
      due_date: "2026-10-03T06:20:41.000Z",
      close_date: null,
      ticket_from_time: null,
      ticket_to_time: null,
      start: "14:00",
      end: "15:00",
      address: "punagam, surat - Gujrat.",
      status: 2,
      email: "demo@yopmail.com",
      phone: "9099490994",
      assign_member_id: [],
      staffId: 'chintan',
      checklist: '• Service signed off'
    },
    {
      ticket_id: 21534,
      customer_name: null,
      subject: "get issue in create ticket",
      open_date: "2026-09-21T11:28:32.000Z",
      due_date: "2026-09-21T11:28:32.000Z",
      close_date: null,
      ticket_from_time: null,
      ticket_to_time: null,
      start: "15:00",
      end: "16:00",
      address: "789 Broad Ave, City",
      status: 2,
      email: "demo@yopmail.com",
      phone: "9099490994",
      assign_member_id: [],
      staffId: 'test',
      checklist: '• Resolved'
    },
    {
      ticket_id: 21530,
      customer_name: "demo",
      subject: "box booking huo",
      open_date: "2026-09-21T10:38:46.000Z",
      due_date: "2026-09-21T10:38:46.000Z",
      close_date: null,
      ticket_from_time: null,
      ticket_to_time: null,
      start: "16:00",
      end: "17:00",
      address: "Empire State Building",
      status: 2,
      email: "demo@yopmail.com",
      phone: "9099490994",
      assign_member_id: [],
      staffId: 'demo',
      checklist: '• Routine maintenance'
    }
  ];

  /* Helper to extract real creation date from ticket properties */
  function extractRealTicketDate(t) {
    if (!t) return '2026-10-09';
    // 1. If explicit dateStr in YYYY-MM-DD
    if (t.dateStr && typeof t.dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.dateStr)) {
      return t.dateStr;
    }
    // 2. Check open_date or due_date ISO strings (e.g. 2026-10-09T04:39:11.000Z or 09.10.2026)
    const rawIso = t.open_date || t.due_date || t.created_at || t.createdAt || t.date;
    if (rawIso && typeof rawIso === 'string') {
      const m = rawIso.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return `${m[1]}-${m[2]}-${m[3]}`;
      const m2 = rawIso.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
      if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`;
    }
    // 3. Check first message time (e.g. "09.10.2026 04:39:11")
    if (Array.isArray(t.messages) && t.messages.length > 0 && t.messages[0].time) {
      const mMsg = String(t.messages[0].time).match(/^(\d{2})\.(\d{2})\.(\d{4})/);
      if (mMsg) return `${mMsg[3]}-${mMsg[2]}-${mMsg[1]}`;
    }
    // 4. Check dateAt timestamp
    if (t.dateAt != null && isFinite(Number(t.dateAt))) {
      return fmtDate(new Date(Number(t.dateAt)));
    }
    return '2026-10-09';
  }

  /* Helper to map any API ticket into normalized calendar appointment */
  function mapApiTicket(t, idx) {
    const staffRotation = ['manoj', 'demo', 'test', 'chintan'];
    const staffId = t.staffId || staffRotation[idx % staffRotation.length];

    // Real created date
    const dStr = extractRealTicketDate(t);

    // Real appointment time
    let startStr = t.start;
    let endStr = t.end;

    if (!startStr) {
      if (t.ticket_from_time) {
        const m = String(t.ticket_from_time).match(/(\d{1,2}):(\d{2})/);
        if (m) {
          startStr = `${m[1].padStart(2, '0')}:${m[2]}`;
          if (t.ticket_to_time) {
            const m2 = String(t.ticket_to_time).match(/(\d{1,2}):(\d{2})/);
            if (m2) endStr = `${m2[1].padStart(2, '0')}:${m2[2]}`;
          }
        }
      } else if (t.time) {
        const m = String(t.time).match(/(\d{1,2}):?(\d{2})?/);
        if (m) {
          const h = parseInt(m[1], 10);
          startStr = `${String(h).padStart(2, '0')}:00`;
          endStr = `${String(h + 1).padStart(2, '0')}:00`;
        }
      }
    }

    if (!startStr) {
      const fallbackH = 9 + (idx % 8);
      startStr = `${String(fallbackH).padStart(2, '0')}:00`;
      endStr = `${String(fallbackH + 1).padStart(2, '0')}:00`;
    }
    if (!endStr) {
      const sH = parseInt(startStr.split(':')[0], 10);
      endStr = `${String(sH + 1).padStart(2, '0')}:00`;
    }

    // Status normalized
    let st = 'opened';
    if (t.status === 3 || t.status === 'closed' || t.close_date) {
      st = 'closed';
    } else if (t.status === 2 || t.status === 'assigned') {
      st = 'assigned';
    } else {
      st = 'opened';
    }

    const clientDisplay = t.customer_name || t.ticket_name || t.client || t.email || 'Demo';
    const numDisplay = String(t.ticket_id || t.number || t.id || idx);

    return {
      id: String(t.ticket_id || t.id || idx),
      number: numDisplay,
      client: clientDisplay,
      service: t.subject || t.service || 'Service Visit',
      address: t.address || 'Data not found',
      dateStr: dStr,
      start: startStr,
      end: endStr,
      staffId: staffId,
      status: st,
      hasDestination: Boolean(t.address && t.address !== 'Data not found'),
      checklist: t.checklist || '• General servicing'
    };
  }

  function getSampleTickets() {
    return RAW_API_TICKETS.map((t, idx) => mapApiTicket(t, idx));
  }

  function loadTickets() {
    let live = [];
    try {
      if (global.FieldApp && typeof FieldApp.getTickets === 'function') {
        live = FieldApp.getTickets() || [];
      }
    } catch (e) {
      live = [];
    }

    if (live.length > 0) {
      tickets = live.map((t, idx) => mapApiTicket(t, idx));
    } else {
      tickets = getSampleTickets();
    }

    // Always open on Current Date (Today)
    currentDate = new Date();
    miniCalMonth = currentDate.getMonth();
    miniCalYear = currentDate.getFullYear();

    updateStats();
    renderMiniCalendar();
    renderTeamMemberList();
    renderCurrentView(false);
  }

  function getFilteredTickets() {
    let list = tickets;
    if (searchQuery) {
      list = list.filter((t) => {
        const c = (t.client || '').toLowerCase();
        const n = (t.number || t.id || '').toLowerCase();
        const s = (t.service || '').toLowerCase();
        const a = (t.address || '').toLowerCase();
        return c.includes(searchQuery) || n.includes(searchQuery) || s.includes(searchQuery) || a.includes(searchQuery);
      });
    }
    return list;
  }

  function updateStats() {
    const list = getFilteredTickets();
    const visits = list.filter(t => t.staffId != null).length || list.length;
    const done = list.filter(t => t.status === 'closed').length;
    const open = list.filter(t => t.status === 'opened' || t.status === 'assigned').length;
    const unassigned = tickets.filter(t => !t.staffId).length;

    const vEl = document.getElementById('statVisits');
    const dEl = document.getElementById('statDone');
    const oEl = document.getElementById('statOpen');
    const uEl = document.getElementById('unassignedBannerCount');

    if (vEl) vEl.textContent = visits;
    if (dEl) dEl.textContent = done;
    if (oEl) oEl.textContent = open;
    if (uEl) uEl.textContent = unassigned;
  }

  /* Builds streamlined card containing only essential details matching user request */
  function createScheduleCardElement(t, staff) {
    const statusKey = (t.status || 'opened').toLowerCase();
    const sc = STATUS_CONFIG[statusKey] || STATUS_CONFIG.opened;
    const s = staff || STAFF.find(x => String(x.id) === String(t.staffId)) || { name: 'Staff' };

    const card = document.createElement('div');
    card.className = 'card schedule-ticket-card appt-schedule-card';
    card.style.borderInlineStart = `4px solid ${sc.accent}`;

    const clientStr = t.client || 'Client';
    const numStr = t.number || t.id || '';
    const timeStr = `${t.start || ''} – ${t.end || ''}`;
    const subjectStr = t.service || '';

    card.innerHTML = `
      <div class="sched-card-top-row">
        <div class="sched-card-col-left">
          <div class="sched-card-title" title="${escapeHtml(clientStr)}">${escapeHtml(clientStr)}</div>
          <div class="sched-card-meta" title="#${escapeHtml(numStr)}">#${escapeHtml(numStr)}</div>
        </div>
        <div class="sched-card-col-right">
          <div class="sched-card-time" title="${escapeHtml(timeStr)}" style="color:${sc.accent};">${escapeHtml(timeStr)}</div>
          <span class="status-pill" style="background:${sc.bg};color:${sc.text};" title="${escapeHtml(sc.label)}">
            <span class="dot"></span>${escapeHtml(sc.label)}
          </span>
        </div>
      </div>
      <div class="sched-card-subject" title="${escapeHtml(subjectStr)}">Subject: ${escapeHtml(subjectStr)}</div>
    `;

    // Click handler to navigate directly to ticket.html
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      const ticketId = t.id || t.number;
      window.location.href = `ticket.html?id=${encodeURIComponent(ticketId)}`;
    });

    return card;
  }

  /* ---------- MINI MONTH CALENDAR ---------- */
  function renderMiniCalendar() {
    const titleEl = document.getElementById('miniCalMonthYear');
    const gridEl = document.getElementById('miniCalGrid');
    if (!titleEl || !gridEl) return;

    titleEl.textContent = `${FULL_MONTH_NAMES[miniCalMonth]} ${miniCalYear}`;
    gridEl.innerHTML = '';

    const firstDay = new Date(miniCalYear, miniCalMonth, 1).getDay();
    const daysInMonth = new Date(miniCalYear, miniCalMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(miniCalYear, miniCalMonth, 0).getDate();

    const todayStr = fmtDate(new Date());
    const selStr = fmtDate(currentDate);

    // Days from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mini-cal-day other-month';
      btn.textContent = daysInPrevMonth - i;
      const prevDate = new Date(miniCalYear, miniCalMonth - 1, daysInPrevMonth - i);
      const prevDStr = fmtDate(prevDate);
      if (tickets.some((t) => t.dateStr === prevDStr)) {
        btn.classList.add('has-tickets');
      }
      btn.addEventListener('click', () => {
        currentDate = prevDate;
        miniCalMonth = prevDate.getMonth();
        miniCalYear = prevDate.getFullYear();
        renderMiniCalendar();
        renderTeamMemberList();
        updateStats();
        renderCurrentView();
      });
      gridEl.appendChild(btn);
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mini-cal-day';
      btn.textContent = day;

      const d = new Date(miniCalYear, miniCalMonth, day);
      const dStr = fmtDate(d);

      if (dStr === selStr) btn.classList.add('active');
      if (dStr === todayStr) btn.classList.add('today');
      if (tickets.some((t) => t.dateStr === dStr)) {
        btn.classList.add('has-tickets');
      }

      btn.addEventListener('click', () => {
        currentDate = d;
        renderMiniCalendar();
        renderTeamMemberList();
        updateStats();
        renderCurrentView();
      });

      gridEl.appendChild(btn);
    }

    // Trailing days from next month
    const totalCells = firstDay + daysInMonth;
    const nextDays = totalCells > 35 ? 42 - totalCells : 35 - totalCells;
    for (let day = 1; day <= nextDays; day++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mini-cal-day other-month';
      btn.textContent = day;
      const nextDate = new Date(miniCalYear, miniCalMonth + 1, day);
      const nextDStr = fmtDate(nextDate);
      if (tickets.some((t) => t.dateStr === nextDStr)) {
        btn.classList.add('has-tickets');
      }
      btn.addEventListener('click', () => {
        currentDate = nextDate;
        miniCalMonth = nextDate.getMonth();
        miniCalYear = nextDate.getFullYear();
        renderMiniCalendar();
        renderTeamMemberList();
        updateStats();
        renderCurrentView();
      });
      gridEl.appendChild(btn);
    }
  }

  /* ---------- TEAM MEMBER SIDEBAR LIST (Removed per user request) ---------- */
  function renderTeamMemberList() {}

  /* ---------- DAY VIEW (Time on Left, Staff on Top, Full Details Card) ---------- */
  function renderDayView() {
    const grid = document.getElementById('dayGrid');
    if (!grid) return;

    const dateStr = fmtDate(currentDate);
    const todayStr = fmtDate(new Date());

    const staffList = selectedStaffId === 'all'
      ? STAFF.slice()
      : STAFF.filter(s => String(s.id) === String(selectedStaffId));

    grid.innerHTML = '';

    // 1. Corner date
    const corner = document.createElement('div');
    corner.className = 'grid-corner';
    corner.innerHTML = `<div class="corner-date">${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}</div>`;
    grid.appendChild(corner);

    // 2. Day Header across top
    const dayHead = document.createElement('div');
    dayHead.className = 'week-day-header day-only-header';
    if (dateStr === todayStr) dayHead.classList.add('today-header');
    dayHead.innerHTML = `
      <span class="week-day-title">${DAY_NAMES[currentDate.getDay()]}, ${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getDate()}</span>
    `;
    grid.appendChild(dayHead);

    // 3. Time column on left (Y-axis)
    const timeCol = document.createElement('div');
    timeCol.className = 'time-col';
    timeCol.innerHTML = timeColumnHTML();
    grid.appendChild(timeCol);

    // 4. Day Data Column (single full width)
    const col = document.createElement('div');
    col.className = 'staff-col day-data-col';
    col.setAttribute('data-date', dateStr);
    col.style.position = 'relative';

    for (let h = START_HOUR; h < END_HOUR; h++) {
      const cell = document.createElement('div');
      cell.className = 'hour-cell';
      col.appendChild(cell);
    }

    // Now indicator line if today
    if (dateStr === todayStr) {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60;
      if (mins >= 0 && mins <= (END_HOUR - START_HOUR) * 60) {
        const nowLine = document.createElement('div');
        nowLine.className = 'now-indicator';
        nowLine.style.top = `${(mins / 60) * HOUR_HEIGHT}px`;
        col.appendChild(nowLine);
      }
    }

    // Render tickets for this day
    const activeTickets = getFilteredTickets();
    const dayTickets = activeTickets.filter(t => t.dateStr === dateStr);
    positionDayTickets(col, dayTickets);

    grid.appendChild(col);
    updateDateNavLabel();
  }

  /* Helper to position and prevent overlap of tickets in a day column */
  function positionDayTickets(col, dayTickets) {
    if (!dayTickets.length) return;
    const sorted = dayTickets.slice().sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

    // Overlap group detection
    const items = sorted.map(t => {
      const s = timeToMinutes(t.start);
      const e = timeToMinutes(t.end) || (s + 60);
      return { ticket: t, start: s, end: e, colIdx: 0, totalCols: 1 };
    });

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (items[i].end > items[j].start && items[i].start < items[j].end) {
          items[j].colIdx = items[i].colIdx + 1;
          const maxCols = Math.max(items[i].totalCols, items[j].colIdx + 1);
          items[i].totalCols = maxCols;
          items[j].totalCols = maxCols;
        }
      }
    }

    items.forEach(item => {
      const t = item.ticket;
      const topPx = ((item.start - START_HOUR * 60) / 60) * HOUR_HEIGHT;
      const durationHours = Math.max((item.end - item.start) / 60, 1);
      const heightPx = Math.max(durationHours * HOUR_HEIGHT - 6, 68);

      const card = createScheduleCardElement(t);
      const widthPct = 100 / item.totalCols;
      const leftPct = item.colIdx * widthPct;

      card.style.top = `${topPx + 3}px`;
      card.style.height = `${heightPx}px`;
      if (item.totalCols > 1) {
        card.style.left = `calc(${leftPct}% + 4px)`;
        card.style.width = `calc(${widthPct}% - 8px)`;
      }

      col.appendChild(card);
    });
  }

  /* ---------- WEEK VIEW (Time on Left Y-axis, 7 Week Days on Top X-axis) ---------- */
  function renderWeekView() {
    const weekGrid = document.getElementById('weekGrid');
    if (!weekGrid) return;

    const weekStart = startOfWeek(currentDate);
    const todayStr = fmtDate(new Date());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(d);
    }

    weekGrid.innerHTML = '';
    weekGrid.style.gridTemplateColumns = `60px repeat(7, minmax(130px, 1fr))`;

    // 1. Top-Left Corner Cell
    const corner = document.createElement('div');
    corner.className = 'grid-corner week-corner';
    corner.innerHTML = `<div class="corner-date">${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}</div>`;
    weekGrid.appendChild(corner);

    const activeTickets = getFilteredTickets();

    // 2. Day Headers (7 Days across top — single header row)
    days.forEach((d) => {
      const dateStr = fmtDate(d);
      const dayHead = document.createElement('div');
      dayHead.className = 'week-day-header';
      dayHead.setAttribute('data-date', dateStr);

      const isToday = dateStr === todayStr;
      if (isToday) dayHead.classList.add('today-header');

      const isSel = dateStr === fmtDate(currentDate);
      if (isSel && !isToday) dayHead.classList.add('selected-day-header');

      dayHead.innerHTML = `
        <span class="week-day-title">${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}</span>
      `;

      dayHead.addEventListener('click', () => {
        currentDate = d;
        renderMiniCalendar();
        renderCurrentView();
      });

      weekGrid.appendChild(dayHead);
    });

    // 3. Time Column on Left (Y-axis)
    const timeCol = document.createElement('div');
    timeCol.className = 'time-col week-time-col';
    timeCol.style.gridRow = '2';
    timeCol.style.gridColumn = '1';
    timeCol.innerHTML = timeColumnHTML();
    weekGrid.appendChild(timeCol);

    // 4. Columns for each of the 7 Days
    days.forEach((d) => {
      const dateStr = fmtDate(d);
      const col = document.createElement('div');
      col.className = 'staff-col week-data-col';
      col.setAttribute('data-date', dateStr);
      col.style.position = 'relative';

      for (let h = START_HOUR; h < END_HOUR; h++) {
        const cell = document.createElement('div');
        cell.className = 'hour-cell';
        col.appendChild(cell);
      }

      if (dateStr === todayStr) {
        const now = new Date();
        const mins = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60;
        if (mins >= 0 && mins <= (END_HOUR - START_HOUR) * 60) {
          const nowLine = document.createElement('div');
          nowLine.className = 'now-indicator';
          nowLine.style.top = `${(mins / 60) * HOUR_HEIGHT}px`;
          col.appendChild(nowLine);
        }
      }

      const dayTickets = activeTickets.filter(t => t.dateStr === dateStr);
      positionDayTickets(col, dayTickets);

      weekGrid.appendChild(col);
    });

    updateDateNavLabel();
  }

  function updateDateNavLabel() {
    const lbl = document.getElementById('calNavLabel');
    if (!lbl) return;

    if (currentView === 'day') {
      const dayName = DAY_NAMES[currentDate.getDay()];
      const mName = MONTH_NAMES[currentDate.getMonth()];
      lbl.textContent = `${dayName}, ${mName} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
    } else {
      const ws = startOfWeek(currentDate);
      const we = new Date(ws);
      we.setDate(we.getDate() + 6);
      lbl.textContent = `${ws.getDate()} ${MONTH_NAMES[ws.getMonth()]} – ${we.getDate()} ${MONTH_NAMES[we.getMonth()]} ${we.getFullYear()}`;
    }
  }

  /* Automatically scroll horizontally & vertically to the active date and its tickets */
  function scrollToActiveDate(smooth = true) {
    const targetDateStr = fmtDate(currentDate);

    // 1. Horizontal scroll for Week View directly to the target day column
    if (currentView === 'week') {
      const weekGrid = document.getElementById('weekGrid');
      if (weekGrid) {
        const targetHead = weekGrid.querySelector(`.week-day-header[data-date="${targetDateStr}"]`);
        if (targetHead) {
          // 60px is the sticky time column width on the left
          const targetLeft = Math.max(0, targetHead.offsetLeft - 60);
          weekGrid.scrollTo({
            left: targetLeft,
            behavior: smooth ? 'smooth' : 'auto'
          });
        }
      }
    }

    // 2. Vertical scroll to the first ticket card on this date so it's directly visible
    setTimeout(() => {
      const activeGrid = currentView === 'week'
        ? document.getElementById('weekGrid')
        : document.getElementById('dayGrid');
      if (!activeGrid) return;

      let firstCard = null;
      if (currentView === 'week') {
        firstCard = activeGrid.querySelector(`.staff-col[data-date="${targetDateStr}"] .appt-schedule-card`);
        if (!firstCard) {
          firstCard = activeGrid.querySelector('.appt-schedule-card');
        }
      } else {
        firstCard = activeGrid.querySelector('.appt-schedule-card');
      }

      if (firstCard) {
        const rect = firstCard.getBoundingClientRect();
        const scrollTarget = window.pageYOffset + rect.top - 160;
        window.scrollTo({
          top: Math.max(0, scrollTarget),
          behavior: smooth ? 'smooth' : 'auto'
        });
      }
    }, 80);
  }

  function renderCurrentView(smoothScroll = true) {
    if (currentView === 'day') {
      document.getElementById('dayGrid').classList.add('active');
      document.getElementById('weekGrid').classList.remove('active');
      renderDayView();
    } else {
      document.getElementById('dayGrid').classList.remove('active');
      document.getElementById('weekGrid').classList.add('active');
      renderWeekView();
    }
    scrollToActiveDate(smoothScroll);
  }

  /* View-Only Ticket Detail Modal */
  function openTicketDetailModal(ticket, staff) {
    const modal = document.getElementById('apptDetailModal');
    if (!modal) return;

    const s = staff || STAFF.find(x => String(x.id) === String(ticket.staffId)) || { name: 'Unassigned' };

    document.getElementById('adTicketNum').textContent = '#' + (ticket.number || ticket.id);
    document.getElementById('adClient').textContent = ticket.client || '—';
    document.getElementById('adStaff').textContent = s.name;
    document.getElementById('adTime').textContent = `${ticket.dateStr} · ${ticket.start} – ${ticket.end}`;
    document.getElementById('adAddress').textContent = ticket.address || '—';
    document.getElementById('adSubject').textContent = ticket.service || '—';
    document.getElementById('adStatus').textContent = (ticket.status || 'Opened').toUpperCase();
    document.getElementById('adChecklist').textContent = ticket.checklist || '• Regular maintenance';

    modal.classList.add('active');
  }

  function closeTicketDetailModal() {
    const modal = document.getElementById('apptDetailModal');
    if (modal) modal.classList.remove('active');
  }

  /* Unassigned Tickets Modal */
  function openUnassignedModal() {
    const modal = document.getElementById('unassignedModal');
    const list = document.getElementById('unassignedList');
    if (!modal || !list) return;

    const unassigned = tickets.filter(t => !t.staffId);
    list.innerHTML = '';

    if (!unassigned.length) {
      list.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);">No unassigned tickets found.</div>';
    } else {
      unassigned.forEach((t) => {
        const item = document.createElement('div');
        item.style.padding = '10px 12px';
        item.style.borderRadius = '9px';
        item.style.background = 'var(--input-bg)';
        item.style.border = '1px solid var(--border)';
        item.style.cursor = 'pointer';
        item.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <strong style="color:var(--text);font-size:13px;">${t.client} (#${t.number})</strong>
            <span style="font-size:11px;font-weight:700;color:var(--primary);">${(t.status || 'OPENED').toUpperCase()}</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">${t.service} · ${t.address}</div>
        `;
        item.addEventListener('click', () => {
          closeUnassignedModal();
          const ticketId = t.id || t.number;
          window.location.href = `ticket.html?id=${encodeURIComponent(ticketId)}`;
        });
        list.appendChild(item);
      });
    }

    modal.classList.add('active');
  }

  function closeUnassignedModal() {
    const modal = document.getElementById('unassignedModal');
    if (modal) modal.classList.remove('active');
  }

  /* Populate Top Staff Select */
  function populateStaffSelect() {
    const select = document.getElementById('calendarStaffPicker');
    if (!select) return;

    select.innerHTML = '<option value="all">All staff</option>';
    STAFF.forEach((s) => {
      select.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });

    select.addEventListener('change', () => {
      selectedStaffId = select.value;
      renderTeamMemberList();
      renderCurrentView();
    });
  }

  /* Bind Controls */
  function bindControls() {
    // View Switch buttons
    const btnDay = document.querySelector('[data-view="day"]');
    const btnWeek = document.querySelector('[data-view="week"]');
    if (btnDay && btnWeek) {
      btnDay.addEventListener('click', () => {
        currentView = 'day';
        btnDay.classList.add('active');
        btnWeek.classList.remove('active');
        renderTeamMemberList();
        renderCurrentView();
      });
      btnWeek.addEventListener('click', () => {
        currentView = 'week';
        btnWeek.classList.add('active');
        btnDay.classList.remove('active');
        renderTeamMemberList();
        renderCurrentView();
      });
    }

    // Top date navigation
    const prevBtn = document.getElementById('calNavPrev');
    const nextBtn = document.getElementById('calNavNext');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentView === 'day') {
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          currentDate.setDate(currentDate.getDate() - 7);
        }
        miniCalMonth = currentDate.getMonth();
        miniCalYear = currentDate.getFullYear();
        renderMiniCalendar();
        renderTeamMemberList();
        renderCurrentView();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentView === 'day') {
          currentDate.setDate(currentDate.getDate() + 1);
        } else {
          currentDate.setDate(currentDate.getDate() + 7);
        }
        miniCalMonth = currentDate.getMonth();
        miniCalYear = currentDate.getFullYear();
        renderMiniCalendar();
        renderTeamMemberList();
        renderCurrentView();
      });
    }

    // Mini Calendar month navigation
    const miniPrev = document.getElementById('miniCalPrev');
    const miniNext = document.getElementById('miniCalNext');
    if (miniPrev) {
      miniPrev.addEventListener('click', () => {
        miniCalMonth--;
        if (miniCalMonth < 0) {
          miniCalMonth = 11;
          miniCalYear--;
        }
        renderMiniCalendar();
      });
    }
    if (miniNext) {
      miniNext.addEventListener('click', () => {
        miniCalMonth++;
        if (miniCalMonth > 11) {
          miniCalMonth = 0;
          miniCalYear++;
        }
        renderMiniCalendar();
      });
    }

    // Team Filter All button
    const teamAll = document.getElementById('teamFilterAll');
    if (teamAll) {
      teamAll.addEventListener('click', () => {
        selectedStaffId = 'all';
        const picker = document.getElementById('calendarStaffPicker');
        if (picker) picker.value = 'all';
        renderTeamMemberList();
        renderCurrentView();
      });
    }

    // Live search input
    const searchInput = document.getElementById('calendarSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = (e.target.value || '').trim().toLowerCase();
        updateStats();
        renderCurrentView();
      });
    }

    // Unassigned banner click
    const uBanner = document.getElementById('unassignedBanner');
    if (uBanner) {
      uBanner.addEventListener('click', openUnassignedModal);
    }

    // Close buttons
    const adClose = document.getElementById('adClose');
    if (adClose) adClose.addEventListener('click', closeTicketDetailModal);

    const uClose = document.getElementById('unassignedClose');
    if (uClose) uClose.addEventListener('click', closeUnassignedModal);

    // Modal background click
    const apptModal = document.getElementById('apptDetailModal');
    if (apptModal) {
      apptModal.addEventListener('click', (e) => {
        if (e.target === apptModal) closeTicketDetailModal();
      });
    }

    const uModal = document.getElementById('unassignedModal');
    if (uModal) {
      uModal.addEventListener('click', (e) => {
        if (e.target === uModal) closeUnassignedModal();
      });
    }

    // Realtime sync listener
    global.addEventListener('fieldapp:tickets', () => {
      loadTickets();
    });
  }

  function init() {
    miniCalMonth = currentDate.getMonth();
    miniCalYear = currentDate.getFullYear();
    populateStaffSelect();
    bindControls();
    loadTickets();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
