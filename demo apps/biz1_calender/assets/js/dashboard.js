(function () {
  'use strict';

  const CFG = window.Biz1Config || {};

  /** Same as biz1_ticket: domain from Biz1Config.user → https://{user}.bull36.com */
  function normalizeTenantUser(raw) {
    var s = String(raw == null ? '' : raw).trim().toLowerCase();
    s = s.replace(/^https?:\/\//, '');
    s = s.replace(/\.bull36\.com.*$/i, '');
    s = s.split('/')[0];
    s = s.replace(/[^a-z0-9-]/g, '');
    return s;
  }

  function resolveDomain() {
    var user = normalizeTenantUser(CFG.user || CFG.tenant || CFG.account);
    if (!user) throw new Error('Set Biz1Config.user in assets/config.js (Bull36 subdomain)');
    return 'https://' + user + '.bull36.com';
  }

  const BIZ1_DOMAIN = resolveDomain();
  const ACCOUNT_USER_ID = CFG.accountUserId || 47;
  const BUILDER_PAGE_ID = CFG.builderPageId || 3001;
  const BUILDER_ID = CFG.builderId || null;
  const DEFAULT_TYPE_ID = CFG.appointmentTypeId || '';
  const LANG_KEY = 'biz1_booking_lang';
  const I18N = {
    en: {
      brandName: 'Biz1 Bookings',
      brandTag: 'Front desk · Calendar & Loyalty',
      viewDay: 'Day',
      viewWeek: 'Week',
      viewStaff: 'Staff',
      staffFilterLabel: 'Staff',
      allStaff: 'All staff',
      quickBook: 'Quick Book',
      syncGoogle: 'Google Calendar 2-way sync',
      syncWa: 'WhatsApp confirmations',
      syncLoyalty: 'Loyalty punch cards',
      liveSocketOn: 'Live Socket',
      liveSocketOff: 'Offline',
      loading: 'Loading…',
      weekStaffLabel: 'Week staff',
      quickBookingTitle: 'Quick Booking',
      stepClient: '1 Client',
      stepService: '2 Service',
      stepStaff: '3 Staff',
      stepSlot: '4 Slot',
      client: 'Client',
      service: 'Service',
      staff: 'Staff',
      title: 'Title',
      date: 'Date',
      duration: 'Duration (minutes)',
      address: 'Location',
      addressPlaceholder: 'Office',
      details: 'Details / notes',
      detailsPlaceholder: 'Details note',
      availableSlots: 'Available time slots',
      selectServiceStaff: 'Select staff to load slots',
      notifyFlow: 'Notify (server notification)',
      waFlow: "Send WhatsApp to client's saved mobile + .ics / Google Calendar link",
      googleFlow: 'Sync to Google Calendar (2-way)',
      cancel: 'Cancel',
      confirmBooking: 'Confirm Booking',
      appointmentTitle: 'Appointment',
      hoverTitle: 'Title',
      hoverDate: 'Appointment Date',
      hoverCustomer: 'Customer Name',
      hoverDetails: 'Appointment Detail',
      hoverTime: 'Time',
      time: 'Time',
      googleSync: 'Google sync',
      openLoyalty: 'Open Loyalty Profile',
      delete: 'Delete',
      close: 'Close',
      roleTeam: 'Team',
      roleOwner: 'Owner'
    },
    he: {
      brandName: 'Biz1 הזמנות',
      brandTag: 'עמדת קבלה · יומן ונאמנות',
      viewDay: 'יום',
      viewWeek: 'שבוע',
      viewStaff: 'צוות',
      staffFilterLabel: 'צוות',
      allStaff: 'כל הצוות',
      quickBook: 'הזמנה מהירה',
      syncGoogle: 'סנכרון דו-כיווני ליומן גוגל',
      syncWa: 'אישורי וואטסאפ',
      syncLoyalty: 'כרטיסי נאמנות',
      liveSocketOn: 'שידור חי',
      liveSocketOff: 'אופליין',
      loading: 'טוען…',
      weekStaffLabel: 'צוות שבועי',
      quickBookingTitle: 'הזמנה מהירה',
      stepClient: '1 לקוח',
      stepService: '2 שירות',
      stepStaff: '3 צוות',
      stepSlot: '4 שעה',
      client: 'לקוח',
      service: 'שירות',
      staff: 'צוות',
      title: 'כותרת',
      date: 'תאריך',
      duration: 'משך (דקות)',
      address: 'מיקום',
      addressPlaceholder: 'משרד',
      details: 'פרטים / הערות',
      detailsPlaceholder: 'הערת פרטים',
      availableSlots: 'שעות פנויות',
      selectServiceStaff: 'בחר צוות כדי לטעון שעות',
      notifyFlow: 'שלח התראה (שרת)',
      waFlow: 'שלח אישור וואטסאפ לנייד השמור של הלקוח + קישור ליומן',
      googleFlow: 'סנכרון דו-כיווני ליומן גוגל',
      cancel: 'ביטול',
      confirmBooking: 'אשר הזמנה',
      appointmentTitle: 'פגישה',
      hoverTitle: 'כותרת',
      hoverDate: 'תאריך הפגישה',
      hoverCustomer: 'שם הלקוח',
      hoverDetails: 'פרטי הפגישה',
      hoverTime: 'שעה',
      time: 'שעה',
      googleSync: 'סנכרון גוגל',
      openLoyalty: 'פתח כרטיס נאמנות',
      delete: 'מחק',
      close: 'סגור',
      roleTeam: 'צוות',
      roleOwner: 'בעלים'
    }
  };
  let currentLang = 'en';

  function t(key) {
    const dict = I18N[currentLang] || I18N.en;
    return dict[key] || I18N.en[key] || key;
  }

  function formatStaffRole(role) {
    const raw = String(role || '').trim();
    const lower = raw.toLowerCase();
    if (!raw || lower === 'team') return t('roleTeam');
    if (lower === 'owner') return t('roleOwner');
    return raw;
  }

  function getToken() {
    return (window.localStorage && localStorage.getItem('biz1_sdk_bearer_token')) || '';
  }

  if (!getToken()) {
    window.location.href = 'index.html';
    return;
  }

  function getLanguage() {
    const saved = (
      localStorage.getItem(LANG_KEY) ||
      localStorage.getItem('biz1fs_lang') ||
      ''
    ).toLowerCase();
    return saved === 'he' ? 'he' : 'en';
  }

  function applyLanguage(lang) {
    currentLang = lang === 'he' ? 'he' : 'en';
    const dict = I18N[currentLang];
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'he' ? 'rtl' : 'ltr';
    localStorage.setItem(LANG_KEY, currentLang);
    try {
      localStorage.setItem('biz1fs_lang', currentLang);
    } catch (e) { /* ignore */ }

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) el.textContent = dict[key];
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) el.setAttribute('placeholder', dict[key]);
    });

    const langButtons = document.querySelectorAll('#langSwitch [data-lang]');
    langButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === currentLang);
    });

    if (typeof renderCurrentView === 'function') {
      try {
        renderCurrentView();
      } catch (e) { /* views not ready yet */ }
    }
    if (typeof paintLiveChip === 'function') {
      try {
        paintLiveChip();
      } catch (e) { /* realtime not ready yet */ }
    }
  }

  async function apiPost(route, body, { publicRoute = false } = {}) {
    const params = new URLSearchParams();
    Object.keys(body || {}).forEach((k) => {
      const v = body[k];
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    });
    const headers = {};
    if (!publicRoute) {
      const token = getToken();
      if (!token) throw new Error('Session expired — please sign in again');
      headers.Authorization = 'Bearer ' + token;
    }
    // POST https://{user}.bull36.com/app/{Route.Name}
    const res = await fetch(BIZ1_DOMAIN + '/app/' + route, {
      method: 'POST',
      headers,
      body: params
    });
    if (res.status === 401) {
      localStorage.removeItem('biz1_sdk_bearer_token');
      window.location.href = 'index.html';
      throw new Error('Unauthorized');
    }
    const data = await res.json().catch(() => ({ success: 0, message: 'Invalid JSON response' }));
    const ok = data.success === 1 || data.success === '1' || data.ok === true;
    if (!ok) throw new Error(data.message || data.error || route + ' failed');
    return data;
  }

  /* ---------- helpers ---------- */
  const STAFF_COLORS = ['#0d9488', '#ea580c', '#0284c7', '#c026d3', '#16a34a', '#dc2626'];
  const START_HOUR = 8;
  const END_HOUR = 20;
  const DAY_NAMES = {
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    he: ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
  };
  // Clear any old local/static appointment cache (source of truth is Calendar.List only)
  try {
    localStorage.removeItem('biz1_dashboard_appointments_v1');
  } catch (e) { /* ignore */ }

  let STAFF = [];
  let CUSTOMERS = [];
  let SERVICES = [];
  /** In-memory only — always replaced from Calendar.List (same table as #calendar-tab) */
  let dayViewWeekAppointments = {};
  let currentDate = new Date();
  let currentView = 'day';
  let daySelectedStaffId = null;
  let weekSelectedStaffId = null; // null = all staff (show everything from API)
  let currentDetailAppt = null;
  let selectedSlot = null;
  let bookingLock = null;
  let userBasicCache = null;

  function fmtDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function startOfWeek(d) {
    const copy = new Date(d);
    copy.setDate(copy.getDate() - copy.getDay());
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  function initials(name) {
    return (name || '?')
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  function timeToMinutes(t) {
    const [h, m] = String(t || '00:00').split(':').map(Number);
    return h * 60 + (m || 0);
  }

  function minutesFromDayStart(t) {
    return timeToMinutes(t) - START_HOUR * 60;
  }

  function padTime(h, m) {
    return String(h).padStart(2, '0') + ':' + String(m || 0).padStart(2, '0');
  }

  function parseBiz1DateTime(str) {
    if (!str) return { dateStr: fmtDate(new Date()), time: '09:00', duration: 30 };
    const s = String(str).trim();
    // dd.mm.yyyy HH:mm
    let m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/);
    if (m) return { dateStr: m[3] + '-' + m[2] + '-' + m[1], time: m[4] + ':' + m[5], duration: 30 };
    // yyyy-mm-dd HH:mm:ss
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (m) return { dateStr: m[1] + '-' + m[2] + '-' + m[3], time: m[4] + ':' + m[5], duration: 30 };
    return { dateStr: fmtDate(new Date()), time: '09:00', duration: 30 };
  }

  function endFromStart(start, durationMin) {
    const endMin = timeToMinutes(start) + (durationMin || 30);
    return padTime(Math.floor(endMin / 60), endMin % 60);
  }

  function showToast(title, sub) {
    const stack = document.getElementById('toastStack');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML =
      '<div class="toast-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg></div>' +
      '<div><div class="toast-body-text">' +
      title +
      '</div><div class="toast-sub">' +
      (sub || '') +
      '</div></div>';
    stack.appendChild(toast);
    setTimeout(() => toast.remove(), 3800);
  }

  function getStaffColor(staffId) {
    if (!staffId || staffId === 'all') return '#94a3b8';
    const staff = STAFF.find((s) => String(s.id) === String(staffId));
    return staff && staff.color ? staff.color : '#94a3b8';
  }

  function updateColorDot(dotEl, staffId) {
    if (!dotEl) return;
    dotEl.style.background = getStaffColor(staffId);
  }

  function applyBookingStaffColor(staffId) {
    const color = getStaffColor(staffId);
    updateColorDot(document.getElementById('qbStaffDot'), staffId);
    const modal = document.getElementById('bookingModal');
    if (modal) modal.style.setProperty('--qb-staff-color', color);
    document.querySelectorAll('#qbSlots .slot-btn.selected').forEach((btn) => {
      btn.style.background = color;
      btn.style.borderColor = color;
    });
    const submitBtn = document.getElementById('qbSubmit');
    if (submitBtn) {
      submitBtn.style.background = color;
      submitBtn.style.boxShadow = '0 4px 14px ' + color + '4d';
    }
  }

  /* ---------- API data ---------- */
  async function fetchUserBasic() {
    const data = await apiPost('User.Basic', {});
    userBasicCache = data.data || data;
    return userBasicCache;
  }

  function teamFromBasic(basic) {
    const members = (basic && basic.team_members) || [];
    return members
      .filter((m) => String(m.status) === '1' || m.status === undefined || m.status === true)
      .map((m, idx) => ({
        id: String(m.id || m.team_member_id || m.user_id),
        name: m.name || m.full_name || ('Member ' + (idx + 1)),
        role: m.role || m.designation || 'Team',
        color: STAFF_COLORS[idx % STAFF_COLORS.length]
      }));
  }

  function resolveLoginUserName(basic) {
    const u =
      (basic && (basic.user || basic.account || basic.profile)) || basic || {};
    const name =
      u.name ||
      u.full_name ||
      u.display_name ||
      u.first_name ||
      (basic && (basic.name || basic.full_name || basic.display_name)) ||
      '';
    const email =
      u.email ||
      u.username ||
      u.user_name ||
      (basic && (basic.email || basic.username)) ||
      localStorage.getItem('biz1fs_email') ||
      '';
    if (name && String(name).trim()) return String(name).trim();
    if (email && String(email).trim()) return String(email).trim();
    return '';
  }

  function renderLoggedInUser(basic) {
    const el = document.getElementById('loggedInUser');
    if (!el) return;
    const label = resolveLoginUserName(basic);
    if (!label) {
      el.hidden = true;
      el.textContent = '';
      el.removeAttribute('title');
      return;
    }
    el.hidden = false;
    el.textContent = label;
    el.title = label;
  }

  async function fetchCustomers() {
    try {
      const data = await apiPost('Customer.List', { length: 25, limit: 25 });
      const rows = data.data || data.rows || data.list || [];
      return rows.map((c) => ({
        id: String(c.customer_id || c.id || c.cust_id),
        name: c.name || c.client_name || c.full_name || ('Customer #' + (c.id || '')),
        mobile: c.mobile || c.phone || c.second_phone || ''
      }));
    } catch (e) {
      console.warn('[Biz1] Customer.List', e);
      return [];
    }
  }

  /** Mobile lives on the customer record, not on Calendar.List / Calendar.Get */
  const customerMobileCache = {};

  function mobileFromCustomers(customerId) {
    if (!customerId) return '';
    const id = String(customerId);
    if (customerMobileCache[id]) return customerMobileCache[id];
    const c = CUSTOMERS.find((x) => String(x.id) === id);
    if (c && c.mobile) {
      customerMobileCache[id] = c.mobile;
      return c.mobile;
    }
    return '';
  }

  async function resolveCustomerMobile(customerId) {
    if (!customerId) return '';
    const id = String(customerId);
    let mobile = mobileFromCustomers(id);
    if (!mobile) mobile = await fetchCustomerMobile(id);
    return mobile || '';
  }

  async function fetchCustomerMobile(customerId) {
    if (!customerId) return '';
    const id = String(customerId);
    const cached = mobileFromCustomers(id);
    if (cached) return cached;
    try {
      const data = await apiPost('Customer.Get', { customer_id: id });
      const row = data.data || data.customer || data;
      const mobile = row.mobile || row.phone || row.second_phone || '';
      if (mobile) customerMobileCache[id] = mobile;
      const existing = CUSTOMERS.find((c) => String(c.id) === id);
      if (existing) existing.mobile = mobile || existing.mobile;
      return mobile;
    } catch (e) {
      console.warn('[Biz1] Customer.Get mobile', id, e);
      return '';
    }
  }

  async function fetchCalendarList(fromDate, toDate, extra) {
    const body = Object.assign(
      { from_date: fromDate, to_date: toDate, limit: 25 },
      extra || {}
    );
    const data = await apiPost('Calendar.List', body);
    return data.data || [];
  }

  /** Paginate Calendar.List — same appointments table as dashboard #calendar-tab */
  async function fetchCalendarWeek(fromDate, toDate, options) {
    const fast = !!(options && options.fast);
    const all = [];
    // Live sync: skip Count + use bigger pages so UI updates ASAP
    if (fast) {
      for (let page = 1; page <= 4; page++) {
        const chunk = await fetchCalendarList(fromDate, toDate, {
          page,
          limit: 100,
          start: (page - 1) * 100,
          length: 100
        });
        all.push.apply(all, chunk);
        if (chunk.length < 100) break;
      }
      return all;
    }
    let total = null;
    try {
      const countRes = await apiPost('Calendar.Count', {
        from_date: fromDate,
        to_date: toDate
      });
      total = Number(countRes.count || countRes.total || 0);
    } catch (e) {
      console.warn('[Biz1] Calendar.Count', e);
    }
    const maxPages = total != null ? Math.min(Math.ceil(total / 25) || 1, 8) : 4;
    for (let page = 1; page <= maxPages; page++) {
      const chunk = await fetchCalendarList(fromDate, toDate, {
        page,
        limit: 25,
        start: (page - 1) * 25
      });
      all.push.apply(all, chunk);
      if (chunk.length < 25) break;
    }
    return all;
  }

  /** Enrich List row with Calendar.Get + customer mobile */
  async function enrichAppointment(item) {
    const id = item.appointment_id || item.id;
    if (!id) return item;
    try {
      const full = await apiPost('Calendar.Get', { appointment_id: id });
      const a = full.appointments || full.data || {};
      const customerId = a.customer_id || item.customer_id || '';
      let mobile = a.mobile || a.phone || item.mobile || mobileFromCustomers(customerId);
      if (!mobile && customerId) {
        mobile = await fetchCustomerMobile(customerId);
      }
      return {
        appointment_id: full.appointment_id || a.id || id,
        title: a.title || item.title,
        color: a.color || item.color,
        date_time: a.date_time || item.date_time,
        duration: a.duration != null ? a.duration : item.duration,
        start_time: a.start_time || item.start_time,
        end_time: a.end_time || item.end_time,
        customer_id: customerId,
        client_name: full.client_name || a.client_name || item.client_name,
        team_member_id:
          a.team_member_id || a.user || a.team_member || item.team_member_id || '',
        team_member_id_2: a.team_member_id_2 || item.team_member_id_2 || '',
        event_id: a.event_id || item.event_id || '',
        details:
          a.appoimenttext ||
          a.details ||
          a.note ||
          item.appoimenttext ||
          item.details ||
          item.note ||
          '',
        mobile: mobile || ''
      };
    } catch (e) {
      console.warn('[Biz1] Calendar.Get', id, e);
      const customerId = item.customer_id || '';
      let mobile = item.mobile || mobileFromCustomers(customerId);
      if (!mobile && customerId) mobile = await fetchCustomerMobile(customerId);
      return Object.assign({}, item, { mobile: mobile || '' });
    }
  }

  /** List-only enrich for live sync — no Calendar.Get round-trips */
  function lightEnrich(item) {
    const customerId = item.customer_id || '';
    const mobile = item.mobile || item.phone || mobileFromCustomers(customerId) || '';
    return Object.assign({}, item, { mobile: mobile || '' });
  }

  async function enrichAll(items) {
    const out = [];
    const chunkSize = 8;
    for (let i = 0; i < items.length; i += chunkSize) {
      const slice = items.slice(i, i + chunkSize);
      const enriched = await Promise.all(slice.map(enrichAppointment));
      out.push.apply(out, enriched);
    }
    return out;
  }

  function mapCalendarItems(items) {
    const grouped = {};
    items.forEach((item) => {
      const parsed = parseBiz1DateTime(item.date_time || '');
      const duration = Number(item.duration || 30) || 30;
      const start = item.start_time
        ? String(item.start_time).slice(0, 5)
        : parsed.time;
      const end = item.end_time
        ? String(item.end_time).slice(0, 5)
        : endFromStart(start, duration);
      const apptId = String(item.appointment_id || item.id);
      if (!apptId || apptId === 'undefined') return;

      const title = item.title || 'Appointment';
      const client = item.client_name || title;
      const staffRaw = item.team_member_id || item.user || '';
      const appt = {
        id: apptId,
        customerId: item.customer_id ? String(item.customer_id) : '',
        staffId: staffRaw ? String(staffRaw) : '',
        client: client,
        service: title,
        start: start,
        end: end,
        status: 'confirmed',
        mobile: item.mobile || mobileFromCustomers(item.customer_id) || '',
        googleEventId: item.event_id || '',
        details: item.appoimenttext || item.details || item.note || '',
        dateStr: parsed.dateStr,
        color: item.color || ''
      };
      if (!grouped[parsed.dateStr]) grouped[parsed.dateStr] = [];
      // de-dupe by id
      if (!grouped[parsed.dateStr].some((x) => x.id === apptId)) {
        grouped[parsed.dateStr].push(appt);
      }
    });
    return grouped;
  }

  function apptsOnDate(dateStr, staffId) {
    const list = dayViewWeekAppointments[dateStr] || [];
    if (!staffId) return list.slice();
    return list.filter((a) => !a.staffId || String(a.staffId) === String(staffId));
  }

  async function fetchBuilderMeta(dateStr, doctorId, typeId) {
    const body = {
      account_user_id: ACCOUNT_USER_ID,
      date: dateStr || fmtDate(new Date())
    };
    if (BUILDER_ID) body.builder_id = BUILDER_ID;
    else body.page_id = BUILDER_PAGE_ID;
    if (doctorId) body.doctor_id = doctorId;
    if (typeId) body.appointment_type_id = typeId;
    try {
      return await apiPost('Public.AppointmentBuilder.Slots', body, { publicRoute: true });
    } catch (e) {
      console.warn('[Biz1] Slots', e);
      return null;
    }
  }

  /* ---------- ICS + WhatsApp ---------- */
  function buildGoogleCalendarLink({ title, dateStr, start, end, details }) {
    const toGCal = (d, t) => {
      const [y, m, day] = d.split('-');
      const [hh, mm] = t.split(':');
      return y + m + day + 'T' + hh + mm + '00';
    };
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title || 'Appointment',
      dates: toGCal(dateStr, start) + '/' + toGCal(dateStr, end),
      details: details || 'Booked via Biz1 Bookings'
    });
    return 'https://calendar.google.com/calendar/render?' + params.toString();
  }

  function buildIcsBlobUrl({ title, dateStr, start, end, details }) {
    const toUtcStamp = (d, t) => {
      const [y, m, day] = d.split('-').map(Number);
      const [hh, mm] = t.split(':').map(Number);
      const dt = new Date(y, m - 1, day, hh, mm, 0);
      const p = (n) => String(n).padStart(2, '0');
      return (
        dt.getUTCFullYear() +
        p(dt.getUTCMonth() + 1) +
        p(dt.getUTCDate()) +
        'T' +
        p(dt.getUTCHours()) +
        p(dt.getUTCMinutes()) +
        p(dt.getUTCSeconds()) +
        'Z'
      );
    };
    const ics =
      'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Biz1 Bookings//EN\r\nBEGIN:VEVENT\r\n' +
      'UID:' +
      Date.now() +
      '@biz1\r\n' +
      'DTSTAMP:' +
      toUtcStamp(dateStr, start) +
      '\r\n' +
      'DTSTART:' +
      toUtcStamp(dateStr, start) +
      '\r\n' +
      'DTEND:' +
      toUtcStamp(dateStr, end) +
      '\r\n' +
      'SUMMARY:' +
      (title || 'Appointment').replace(/\n/g, ' ') +
      '\r\n' +
      'DESCRIPTION:' +
      (details || '').replace(/\n/g, '\\n') +
      '\r\n' +
      'END:VEVENT\r\nEND:VCALENDAR\r\n';
    return URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  }

  async function sendWhatsAppConfirmation({
    customerId,
    mobile,
    clientName,
    serviceName,
    dateStr,
    start,
    end,
    staffName,
    googleSynced
  }) {
    const gLink = buildGoogleCalendarLink({
      title: serviceName + ' — ' + clientName,
      dateStr,
      start,
      end,
      details: 'With ' + staffName + (googleSynced ? ' · Synced to Google Calendar' : '')
    });
    const msg =
      'Hi ' +
      clientName +
      '! Your appointment is confirmed.\n' +
      '📅 ' +
      dateStr +
      ' · ' +
      start +
      '–' +
      end +
      '\n' +
      '✨ ' +
      serviceName +
      ' with ' +
      staffName +
      '\n' +
      'Add to Google Calendar: ' +
      gLink +
      '\n' +
      '(You can also open the .ics invite from your confirmation email.)';

    const body = {
      customer_id: customerId,
      message: msg,
      from: 'send_whatsapp'
    };
    if (mobile) body.chart_selected_phone_no = mobile;
    return apiPost('Chat.SendCustomer', body);
  }

  /* ---------- render helpers ---------- */
  function timeColumnHTML(hPx) {
    let html = '';
    for (let h = START_HOUR; h < END_HOUR; h++) {
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      const ampm = h < 12 ? 'AM' : 'PM';
      html +=
        '<div class="time-slot" style="height:' +
        hPx +
        'px">' +
        hour12 +
        ':00 ' +
        ampm +
        '</div>';
    }
    return html;
  }

  let apptHoverEl = null;

  function formatHoverDate(dateStr) {
    const parts = String(dateStr || '').split('-').map(Number);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      return dateStr || '—';
    }
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date.toLocaleDateString(currentLang === 'he' ? 'he-IL' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function getApptHoverEl() {
    if (apptHoverEl) return apptHoverEl;
    apptHoverEl = document.createElement('div');
    apptHoverEl.className = 'appt-hover-card';
    apptHoverEl.setAttribute('role', 'tooltip');
    document.body.appendChild(apptHoverEl);
    return apptHoverEl;
  }

  function addHoverRow(card, label, value) {
    const row = document.createElement('div');
    row.className = 'appt-hover-row';
    const labelEl = document.createElement('span');
    labelEl.className = 'appt-hover-label';
    labelEl.textContent = label + ':';
    const valueEl = document.createElement('span');
    valueEl.className = 'appt-hover-value';
    valueEl.textContent = value || '—';
    row.appendChild(labelEl);
    row.appendChild(valueEl);
    card.appendChild(row);
  }

  function positionApptHover(card, anchor) {
    const rect = anchor.getBoundingClientRect();
    const gap = 12;
    const width = card.offsetWidth;
    const height = card.offsetHeight;
    let left = rect.right + gap;
    if (left + width > window.innerWidth - 10) {
      left = rect.left - width - gap;
    }
    left = Math.max(10, Math.min(left, window.innerWidth - width - 10));
    let top = rect.top;
    top = Math.max(10, Math.min(top, window.innerHeight - height - 10));
    card.style.left = left + 'px';
    card.style.top = top + 'px';
  }

  function showApptHover(appt, anchor) {
    if (document.body.classList.contains('is-dragging-appt')) return;
    const card = getApptHoverEl();
    card.innerHTML = '';
    card.dir = currentLang === 'he' ? 'rtl' : 'ltr';
    addHoverRow(card, t('hoverTitle'), appt.service || 'Appointment');
    addHoverRow(card, t('hoverDate'), formatHoverDate(appt.dateStr));
    addHoverRow(card, t('hoverCustomer'), appt.client);
    addHoverRow(card, t('hoverDetails'), appt.details || '—');
    addHoverRow(card, t('hoverTime'), (appt.start || '') + ' – ' + (appt.end || ''));
    card.classList.add('open');
    positionApptHover(card, anchor);
  }

  function hideApptHover() {
    if (apptHoverEl) apptHoverEl.classList.remove('open');
  }

  function buildApptEl(appt, staffInfo, draggable, rowH) {
    const rh = rowH || 64;
    const top = (minutesFromDayStart(appt.start) / 60) * rh;
    const height = ((timeToMinutes(appt.end) - timeToMinutes(appt.start)) / 60) * rh;
    // Keep card aligned to actual slot duration; only tiny safety min.
    const finalHeight = Math.max(height, 22);
    const el = document.createElement('div');
    el.className = 'appt status-' + (appt.status || 'confirmed') + (appt.justUpdated ? ' just-updated' : '');
    if (finalHeight < 36) el.classList.add('appt-compact');
    el.style.top = top + 'px';
    el.style.height = finalHeight + 'px';
    el.style.borderInlineStartColor = staffInfo
      ? staffInfo.color
      : getStaffColor(appt.staffId) || '#0d9488';
    if (staffInfo && staffInfo.color) {
      el.style.background = staffInfo.color + '22';
    }
    el.setAttribute('data-appt-id', appt.id);
    el.innerHTML =
      '<div class="appt-time">' +
      appt.start +
      ' – ' +
      appt.end +
      '</div>' +
      '<div class="appt-client">' +
      (appt.client || '—') +
      '</div>' +
      '<div class="appt-service">' +
      (appt.service || '') +
      '</div>';
    if (draggable) {
      el.setAttribute('draggable', 'true');
      el.addEventListener('dragstart', (e) => {
        hideApptHover();
        e.dataTransfer.setData('text/plain', String(appt.id));
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => {
          el.classList.add('dragging');
          document.body.classList.add('is-dragging-appt');
        }, 0);
      });
      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        document.body.classList.remove('is-dragging-appt');
      });
    }
    el.addEventListener('mouseenter', () => showApptHover(appt, el));
    el.addEventListener('mouseleave', hideApptHover);
    el.addEventListener('click', (e) => {
      hideApptHover();
      e.stopPropagation();
      openApptDetail(appt);
    });
    if (appt.justUpdated) appt.justUpdated = false;
    return el;
  }

  function attachDropHandlers(cell, dateStr, hour, staffId) {
    cell.addEventListener('dragover', (e) => {
      e.preventDefault();
      cell.classList.add('drag-over');
    });
    cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));
    cell.addEventListener('drop', (e) => {
      e.preventDefault();
      cell.classList.remove('drag-over');
      const apptId = e.dataTransfer.getData('text/plain');
      handleDrop(apptId, dateStr, hour, staffId);
    });
  }

  async function handleDrop(apptId, newDateStr, newHour, newStaffId) {
    const apptKey = String(apptId || '');
    let oldDateStr = null;
    let appt = null;
    Object.keys(dayViewWeekAppointments).forEach((ds) => {
      const found = (dayViewWeekAppointments[ds] || []).find(
        (a) => String(a.id) === apptKey
      );
      if (found) {
        appt = found;
        oldDateStr = ds;
      }
    });
    if (!appt) return;

    const duration = timeToMinutes(appt.end) - timeToMinutes(appt.start);
    const newStart = padTime(newHour, 0);
    const newEnd = endFromStart(newStart, duration);
    const nextStaffId =
      newStaffId !== undefined && newStaffId !== null && newStaffId !== ''
        ? String(newStaffId)
        : appt.staffId;
    const prev = {
      start: appt.start,
      end: appt.end,
      date: oldDateStr,
      staffId: appt.staffId
    };

    // Same slot + same staff — nothing to do
    if (
      oldDateStr === newDateStr &&
      appt.start === newStart &&
      String(appt.staffId || '') === String(nextStaffId || '')
    ) {
      return;
    }

    dayViewWeekAppointments[oldDateStr] = dayViewWeekAppointments[oldDateStr].filter(
      (a) => String(a.id) !== apptKey
    );
    appt.start = newStart;
    appt.end = newEnd;
    appt.justUpdated = true;
    if (nextStaffId) appt.staffId = String(nextStaffId);
    if (!dayViewWeekAppointments[newDateStr]) dayViewWeekAppointments[newDateStr] = [];
    dayViewWeekAppointments[newDateStr].push(appt);
    renderCurrentView();

    try {
      const body = {
        appointment_id: String(appt.id),
        title: appt.service || appt.client,
        date: newDateStr,
        start_time: newStart,
        end_time: newEnd
      };
      if (appt.customerId) body.customer_id = appt.customerId;
      // Persist staff reassignment when dragging across users/columns
      if (appt.staffId) body.team_member_id = String(appt.staffId);
      await apiPost('Calendar.Update', body);
      const staffInfo = STAFF.find((s) => String(s.id) === String(appt.staffId));
      const staffLabel = staffInfo ? ' · ' + staffInfo.name : '';
      showToast(
        appt.client + ' rescheduled',
        newDateStr + ' · ' + newStart + '–' + newEnd + staffLabel
      );
      await reloadAppointments();
    } catch (e) {
      dayViewWeekAppointments[newDateStr] = dayViewWeekAppointments[newDateStr].filter(
        (a) => String(a.id) !== apptKey
      );
      appt.start = prev.start;
      appt.end = prev.end;
      appt.staffId = prev.staffId;
      if (!dayViewWeekAppointments[prev.date]) dayViewWeekAppointments[prev.date] = [];
      dayViewWeekAppointments[prev.date].push(appt);
      renderCurrentView();
      showToast('Reschedule failed', e.message || 'Could not update');
    }
  }

  /* ---------- DAY VIEW: one day × all staff ---------- */
  function renderDayView() {
    const grid = document.getElementById('dayGrid');
    const dateStr = fmtDate(currentDate);
    const todayStr = fmtDate(new Date());
    const staffList = daySelectedStaffId
      ? STAFF.filter((s) => String(s.id) === String(daySelectedStaffId))
      : STAFF.slice();

    grid.style.setProperty('--staff-count', Math.max(staffList.length, 1));
    grid.innerHTML = '';

    const corner = document.createElement('div');
    corner.className = 'grid-corner';
    corner.innerHTML =
      '<div class="corner-date">' +
      currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
      '</div>';
    grid.appendChild(corner);

    staffList.forEach((s) => {
      const head = document.createElement('div');
      head.className = 'staff-head';
      head.innerHTML =
        '<div class="staff-head-avatar" style="background:' +
        s.color +
        '">' +
        initials(s.name) +
        '</div>' +
        '<div class="staff-head-name">' +
        s.name +
        '</div>' +
        '<div class="staff-head-role">' +
        formatStaffRole(s.role) +
        '</div>';
      grid.appendChild(head);
    });

    if (!staffList.length) {
      const empty = document.createElement('div');
      empty.className = 'staff-head';
      empty.textContent = 'No staff';
      grid.appendChild(empty);
    }

    const timeCol = document.createElement('div');
    timeCol.className = 'time-col';
    timeCol.innerHTML = timeColumnHTML(64);
    grid.appendChild(timeCol);

    (staffList.length ? staffList : [{ id: '', name: '—', color: '#94a3b8' }]).forEach((s) => {
      const col = document.createElement('div');
      col.className = 'staff-col';
      col.style.position = 'relative';

      for (let h = START_HOUR; h < END_HOUR; h++) {
        const cell = document.createElement('div');
        cell.className = 'hour-cell';
        cell.setAttribute('data-hour', h);
        cell.addEventListener('click', () => openBookingModal({ dateStr, hour: h, staffId: s.id }));
        attachDropHandlers(cell, dateStr, h, s.id);
        col.appendChild(cell);
      }

      if (dateStr === todayStr) {
        const now = new Date();
        const mins = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60;
        if (mins >= 0 && mins <= (END_HOUR - START_HOUR) * 60) {
          const nowLine = document.createElement('div');
          nowLine.className = 'now-indicator';
          nowLine.style.top = (mins / 60) * 64 + 'px';
          col.appendChild(nowLine);
        }
      }

      const dayAppts = (() => {
        const list = dayViewWeekAppointments[dateStr] || [];
        if (daySelectedStaffId) {
          return list.filter(
            (a) => !a.staffId || String(a.staffId) === String(daySelectedStaffId)
          );
        }
        // Multi-staff day: place each booking in its staff column; unassigned → first column only
        return list.filter((a) => {
          if (!a.staffId) return String(s.id) === String(staffList[0] && staffList[0].id);
          return String(a.staffId) === String(s.id);
        });
      })();
      dayAppts.forEach((appt) => {
        const info =
          STAFF.find((x) => String(x.id) === String(appt.staffId)) || s;
        col.appendChild(buildApptEl(appt, info, true, 64));
      });

      grid.appendChild(col);
    });
  }

  /* ---------- WEEK VIEW: 7 days × one staff ---------- */
  function renderWeekView() {
    const weekGrid = document.getElementById('weekGrid');
    const weekStart = startOfWeek(currentDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    const todayStr = fmtDate(new Date());
    const staffInfo = weekSelectedStaffId
      ? STAFF.find((s) => String(s.id) === String(weekSelectedStaffId)) || STAFF[0]
      : null;

    weekGrid.innerHTML = '';
    const corner = document.createElement('div');
    corner.className = 'grid-corner';
    weekGrid.appendChild(corner);

    days.forEach((d) => {
      const dateStr = fmtDate(d);
      const head = document.createElement('div');
      head.className = 'week-head' + (dateStr === todayStr ? ' is-today' : '');
      head.innerHTML =
        '<div class="week-head-day">' +
        (DAY_NAMES[currentLang] || DAY_NAMES.en)[d.getDay()] +
        '</div>' +
        '<div class="week-head-date">' +
        d.getDate() +
        '</div>';
      weekGrid.appendChild(head);
    });

    const timeCol = document.createElement('div');
    timeCol.className = 'time-col';
    timeCol.innerHTML = timeColumnHTML(56);
    weekGrid.appendChild(timeCol);

    days.forEach((d) => {
      const dateStr = fmtDate(d);
      const col = document.createElement('div');
      col.className = 'week-day-col';
      col.style.position = 'relative';

      for (let h = START_HOUR; h < END_HOUR; h++) {
        const cell = document.createElement('div');
        cell.className = 'hour-cell';
        cell.addEventListener('click', () =>
          openBookingModal({ dateStr, hour: h, staffId: weekSelectedStaffId || undefined })
        );
        attachDropHandlers(cell, dateStr, h, weekSelectedStaffId || undefined);
        col.appendChild(cell);
      }

      // null staff filter = show ALL API appointments (same as #calendar-tab)
      const dayAppts = apptsOnDate(dateStr, weekSelectedStaffId);
      dayAppts.forEach((appt) => {
        const info =
          STAFF.find((s) => String(s.id) === String(appt.staffId)) ||
          staffInfo ||
          STAFF[0];
        col.appendChild(buildApptEl(appt, info, true, 56));
      });

      weekGrid.appendChild(col);
    });
  }

  /* ---------- STAFF VIEW: multi-resource cards ---------- */
  function renderStaffView() {
    const staffViewEl = document.getElementById('staffView');
    const dateStr = fmtDate(currentDate);
    staffViewEl.innerHTML = '';

    STAFF.forEach((s) => {
      const list = apptsOnDate(dateStr, s.id).filter(
        (a) => !a.staffId || String(a.staffId) === String(s.id)
      );
      // unassigned only on first staff card to avoid duplicates
      const filtered =
        String(s.id) === String(STAFF[0] && STAFF[0].id)
          ? list
          : list.filter((a) => String(a.staffId) === String(s.id));
      const card = document.createElement('div');
      card.className = 'staff-res-card';
      card.innerHTML =
        '<div class="staff-res-header">' +
        '<div class="staff-res-avatar" style="background:' +
        s.color +
        '">' +
        initials(s.name) +
        '</div>' +
        '<div><div class="staff-res-name">' +
        s.name +
        '</div><div class="staff-res-role">' +
        formatStaffRole(s.role) +
        '</div></div>' +
        '<div class="staff-res-count">' +
        filtered.length +
        '</div></div>' +
        '<div class="staff-res-body"><div class="staff-mini-grid">' +
        '<div class="time-col">' +
        timeColumnHTML(52) +
        '</div>' +
        '<div class="staff-mini-col" data-mini-col="' +
        s.id +
        '" style="position:relative;"></div></div></div>';
      staffViewEl.appendChild(card);

      const miniCol = card.querySelector('[data-mini-col="' + s.id + '"]');
      for (let h = START_HOUR; h < END_HOUR; h++) {
        const cell = document.createElement('div');
        cell.className = 'hour-cell';
        cell.addEventListener('click', () => openBookingModal({ dateStr, hour: h, staffId: s.id }));
        attachDropHandlers(cell, dateStr, h, s.id);
        miniCol.appendChild(cell);
      }
      filtered.forEach((appt) => miniCol.appendChild(buildApptEl(appt, s, true, 52)));
    });

    if (!STAFF.length) {
      staffViewEl.innerHTML = '<div class="empty-staff">No team members — check User.Basic</div>';
    }
  }

  function updateWeekRangeLabel() {
    const dayEl = document.getElementById('dayRangeLabel');
    const weekEl = document.getElementById('weekRangeLabel');
    const dayText = currentDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const weekStart = startOfWeek(currentDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekText = fmt(weekStart) + ' – ' + fmt(weekEnd);
    if (dayEl) dayEl.textContent = dayText;
    if (weekEl) weekEl.textContent = weekText;
  }

  async function shiftCalendar(deltaDays) {
    currentDate.setDate(currentDate.getDate() + deltaDays);
    updateWeekRangeLabel();
    await reloadAppointments();
  }

  function setView(view) {
    currentView = view;
    document.querySelectorAll('#viewSwitch button').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === view);
    });
    document.getElementById('dayGrid').classList.toggle('active', view === 'day');
    document.getElementById('weekGrid').classList.toggle('active', view === 'week');
    document.getElementById('staffView').classList.toggle('active', view === 'staff');
    document.getElementById('dayStaffSelect').classList.toggle('active', view === 'day');
    document.getElementById('weekStaffSelect').classList.toggle('active', view === 'week');
    updateWeekRangeLabel();
    renderCurrentView();
  }

  function renderCurrentView() {
    if (currentView === 'day') renderDayView();
    else if (currentView === 'week') renderWeekView();
    else renderStaffView();
  }

  /* ---------- detail modal ---------- */
  async function openApptDetail(appt) {
    currentDetailAppt = appt;
    const staffInfo = STAFF.find((s) => s.id === appt.staffId);
    document.getElementById('adClient').textContent = appt.client || '—';
    document.getElementById('adStaff').textContent = staffInfo ? staffInfo.name : appt.staffId || '—';
    document.getElementById('adTime').textContent = (appt.start || '') + ' – ' + (appt.end || '');
    document.getElementById('adGoogle').textContent = appt.googleEventId
      ? 'Synced · ' + appt.googleEventId
      : 'Pending / local';

    const mobile = await resolveCustomerMobile(appt.customerId);
    if (mobile) {
      appt.mobile = mobile;
      Object.keys(dayViewWeekAppointments).forEach((ds) => {
        const row = (dayViewWeekAppointments[ds] || []).find((a) => a.id === appt.id);
        if (row) row.mobile = mobile;
      });
    }

    const loyaltyLink = document.getElementById('adLoyaltyLink');
    loyaltyLink.href =
      './profile.html?client=' +
      encodeURIComponent(appt.client || '') +
      '&customer_id=' +
      encodeURIComponent(appt.customerId || '') +
      '&mobile=' +
      encodeURIComponent(mobile || '');
    document.getElementById('apptDetailModal').classList.add('open');
  }

  /* ---------- quick book ---------- */
  function highlightQbSteps() {
    const hasClient = !!document.getElementById('qbClient').value;
    const hasStaff = !!document.getElementById('qbStaff').value;
    const hasSlot = !!selectedSlot;
    document.querySelectorAll('#qbSteps span').forEach((el) => {
      const step = Number(el.getAttribute('data-step'));
      el.classList.toggle(
        'active',
        (step === 1 && hasClient) ||
          (step === 2 && hasStaff) ||
          (step === 3 && hasSlot) ||
          (step === 1 && !hasClient)
      );
      el.classList.toggle(
        'done',
        (step === 1 && hasClient) ||
          (step === 2 && hasStaff) ||
          (step === 3 && hasSlot)
      );
    });
  }

  function populateClients(selectedId) {
    const sel = document.getElementById('qbClient');
    sel.innerHTML = CUSTOMERS.length
      ? CUSTOMERS.map(
          (c) =>
            '<option value="' + c.id + '">' + c.name + '</option>'
        ).join('')
      : '<option value="">No customers</option>';
    if (selectedId) sel.value = selectedId;
  }

  /** Default appointment type from config / API (no UI picker). */
  function getDefaultService() {
    const want = DEFAULT_TYPE_ID ? String(DEFAULT_TYPE_ID) : '';
    const match =
      (want && SERVICES.find((s) => String(s.id) === want)) || SERVICES[0] || null;
    return {
      id: match ? String(match.id) : want || '',
      name: (match && match.name) || 'Appointment',
      duration: Number((match && match.duration_minutes) || 30)
    };
  }

  /** Staff currently chosen in the active calendar filter (day / week). */
  function getActiveStaffFilterId() {
    if (currentView === 'week') return weekSelectedStaffId || null;
    if (currentView === 'day') return daySelectedStaffId || null;
    return daySelectedStaffId || weekSelectedStaffId || null;
  }

  function populateStaffSelect(sel, selectedId) {
    sel.innerHTML = STAFF.map(
      (s) => '<option value="' + s.id + '">' + s.name + '</option>'
    ).join('');
    const want = selectedId != null && selectedId !== '' ? String(selectedId) : '';
    if (want && STAFF.some((s) => String(s.id) === want)) {
      sel.value = want;
    } else if (STAFF[0]) {
      sel.value = String(STAFF[0].id);
    }
    applyBookingStaffColor(sel.value);
  }

  function syncBookingTitle() {
    const titleEl = document.getElementById('qbTitle');
    if (!titleEl || titleEl.dataset.userEdited === '1') return;
    const clientSel = document.getElementById('qbClient');
    const name = clientSel && clientSel.selectedOptions[0]
      ? clientSel.selectedOptions[0].textContent.trim()
      : '';
    const svc = getDefaultService();
    titleEl.value = name
      ? (svc.name || 'Appointment') + ' — ' + name
      : svc.name || 'Appointment';
  }

  function syncDurationFromSlot() {
    const durEl = document.getElementById('qbDuration');
    if (!durEl) return;
    if (selectedSlot && selectedSlot.time && selectedSlot.end) {
      const mins =
        timeToMinutes(selectedSlot.end) - timeToMinutes(selectedSlot.time);
      if (mins > 0) {
        durEl.value = String(mins);
        return;
      }
    }
    durEl.value = String(getDefaultService().duration || 30);
  }

  function renderSlots(slots) {
    const box = document.getElementById('qbSlots');
    selectedSlot = null;
    const available = (slots || []).filter((s) => s.available === 1 || s.available === true || s.available === undefined);
    if (!available.length) {
      box.innerHTML = '<div class="slot-empty">No free slots — try another date or staff</div>';
      highlightQbSteps();
      return;
    }
    box.innerHTML = available
      .map(
        (s) =>
          '<button type="button" class="slot-btn" data-time="' +
          s.time +
          '" data-end="' +
          (s.end || '') +
          '">' +
          s.time +
          (s.end ? '–' + s.end : '') +
          '</button>'
      )
      .join('');
    box.querySelectorAll('.slot-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        box.querySelectorAll('.slot-btn').forEach((b) => {
          b.classList.remove('selected');
          b.style.background = '';
          b.style.borderColor = '';
        });
        btn.classList.add('selected');
        selectedSlot = { time: btn.dataset.time, end: btn.dataset.end };
        applyBookingStaffColor(document.getElementById('qbStaff').value);
        syncDurationFromSlot();
        highlightQbSteps();
      });
    });
    highlightQbSteps();
  }

  function fallbackSlots(dateStr, staffId, duration) {
    const booked = (dayViewWeekAppointments[dateStr] || []).filter(
      (a) => !staffId || a.staffId === staffId
    );
    const slots = [];
    const step = duration || 30;
    for (let h = START_HOUR; h < END_HOUR; h++) {
      for (let m = 0; m < 60; m += step) {
        if (h === END_HOUR - 1 && m + step > 60) break;
        const start = padTime(h, m);
        const end = endFromStart(start, step);
        if (timeToMinutes(end) > END_HOUR * 60) continue;
        const conflict = booked.some((a) => {
          return !(timeToMinutes(end) <= timeToMinutes(a.start) || timeToMinutes(start) >= timeToMinutes(a.end));
        });
        if (!conflict) slots.push({ time: start, end: end, available: 1 });
      }
    }
    return slots;
  }

  async function refreshSlots() {
    const dateStr = document.getElementById('qbDate').value || fmtDate(currentDate);
    const staffId = document.getElementById('qbStaff').value;
    const svc = getDefaultService();
    const typeId = svc.id;
    const duration = svc.duration;

    document.getElementById('qbSlots').innerHTML = '<div class="slot-empty">Loading slots…</div>';
    const meta = await fetchBuilderMeta(dateStr, staffId, typeId);
    let slots = [];
    if (meta && Array.isArray(meta.slots) && meta.slots.length) {
      slots = meta.slots.filter((s) => !staffId || String(s.doctor_id) === String(staffId));
      if (meta.appointment_types && meta.appointment_types.length && !SERVICES.length) {
        SERVICES = meta.appointment_types;
      }
      if (meta.doctors && meta.doctors.length) {
        const fromDocs = meta.doctors.map((d, idx) => ({
          id: String(d.id),
          name: d.name || ('Staff ' + d.id),
          role: 'Team',
          color: STAFF_COLORS[idx % STAFF_COLORS.length]
        }));
        fromDocs.forEach((d) => {
          if (!STAFF.find((s) => s.id === d.id)) STAFF.push(d);
        });
      }
    }
    if (!slots.length) slots = fallbackSlots(dateStr, staffId, duration);
    renderSlots(slots);
    highlightQbSteps();
  }

  async function openBookingModal(opts) {
    opts = opts || {};
    selectedSlot = null;
    const fixedSlotStart = opts.hour != null ? padTime(opts.hour, 0) : '';
    const fixedDateStr = opts.dateStr || fmtDate(currentDate);
    bookingLock =
      opts.hour != null
        ? {
            fixed: true,
            dateStr: fixedDateStr,
            time: fixedSlotStart
          }
        : { fixed: false };

    const qbDate = document.getElementById('qbDate');
    const qbStaff = document.getElementById('qbStaff');
    const preferredStaffId = opts.staffId || getActiveStaffFilterId() || '';
    populateClients();
    populateStaffSelect(qbStaff, preferredStaffId);
    qbDate.value = fixedDateStr;
    qbDate.disabled = !!bookingLock.fixed;
    // Lock staff only when booking a fixed slot on a specific staff column
    qbStaff.disabled = !!(bookingLock.fixed && opts.staffId);
    applyBookingStaffColor(qbStaff.value);

    const titleEl = document.getElementById('qbTitle');
    if (titleEl) {
      titleEl.dataset.userEdited = '';
      syncBookingTitle();
    }
    const durEl = document.getElementById('qbDuration');
    if (durEl) durEl.value = String(getDefaultService().duration || 30);
    const addrEl = document.getElementById('qbAddress');
    if (addrEl) addrEl.value = '';
    const detailsEl = document.getElementById('qbDetails');
    if (detailsEl) detailsEl.value = '';
    const notifyEl = document.getElementById('qbNotify');
    if (notifyEl) notifyEl.checked = true;
    const waEl = document.getElementById('qbWhatsApp');
    if (waEl) waEl.checked = true;
    const gEl = document.getElementById('qbGoogleSync');
    if (gEl) gEl.checked = true;

    document.getElementById('bookingModal').classList.add('open');
    highlightQbSteps();
    await refreshSlots();

    if (bookingLock.fixed) {
      const prefer = bookingLock.time;
      const btn = document.querySelector('#qbSlots .slot-btn[data-time="' + prefer + '"]');
      if (btn) {
        btn.click();
        btn.disabled = true;
        btn.classList.add('selected');
      } else {
        const box = document.getElementById('qbSlots');
        selectedSlot = { time: prefer, end: '' };
        box.innerHTML =
          '<button type="button" class="slot-btn selected" data-time="' +
          prefer +
          '" disabled>' +
          prefer +
          '</button>';
        syncDurationFromSlot();
      }
      document.querySelectorAll('#qbSlots .slot-btn').forEach((slotBtn) => {
        if (slotBtn.dataset.time !== prefer) slotBtn.remove();
      });
      applyBookingStaffColor(qbStaff.value);
      highlightQbSteps();
    }
  }

  async function quickBook() {
    const clientSel = document.getElementById('qbClient');
    const staffSel = document.getElementById('qbStaff');
    const titleEl = document.getElementById('qbTitle');
    const custId = clientSel.value;
    const name = clientSel.selectedOptions[0]
      ? clientSel.selectedOptions[0].textContent.trim()
      : '';
    const staffId = staffSel.value;
    const staffName = staffSel.selectedOptions[0]
      ? staffSel.selectedOptions[0].textContent.trim()
      : '';
    const svc = getDefaultService();
    const serviceName = svc.name;
    const dateStr = document.getElementById('qbDate').value;
    const syncGoogle = document.getElementById('qbGoogleSync').checked;
    const sendWa = document.getElementById('qbWhatsApp').checked;
    const notify = document.getElementById('qbNotify')
      ? document.getElementById('qbNotify').checked
      : true;
    const address = (document.getElementById('qbAddress') || {}).value || '';
    const details = (document.getElementById('qbDetails') || {}).value || '';
    const duration = Math.max(
      5,
      Number((document.getElementById('qbDuration') || {}).value) ||
        svc.duration ||
        30
    );

    if (!custId || !staffId || !dateStr || !selectedSlot) {
      showToast('Missing info', 'Select client, staff, and a time slot');
      return;
    }

    const start = selectedSlot.time;
    let end = selectedSlot.end;
    if (!end || duration) {
      end = endFromStart(start, duration);
    }

    let title = (titleEl && titleEl.value.trim()) || '';
    if (!title) {
      title = (serviceName || 'Appointment') + ' — ' + name;
    }

    const submitBtn = document.getElementById('qbSubmit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Booking…';

    try {
      // Calendar.Add — all documented params except appoinment_color / team_member_id_2
      // https://eli.bull36.com/app/help/Calendar.Add
      const payload = {
        title: title,
        date: dateStr,
        start_time: start,
        end_time: end,
        duration: duration,
        customer_id: custId,
        team_member_id: staffId,
        sync_google_calendar: syncGoogle ? 1 : 0,
        notify: notify ? 1 : 0
      };
      if (String(address).trim()) payload.appoiment_address = String(address).trim();
      if (String(details).trim()) payload.appoimenttext = String(details).trim();

      const created = await apiPost('Calendar.Add', payload);

      if (!created.appointment_id) {
        throw new Error(created.message || 'Calendar.Add did not return appointment_id');
      }

      const googleSynced = !!(created.google_calendar && created.google_calendar.synced);
      const serviceLabel = serviceName || 'Appointment';

      await reloadAppointments();

      let waNote = '';
      if (sendWa) {
        const mobile = await resolveCustomerMobile(custId);
        if (!mobile) {
          waNote = ' · WhatsApp skipped (no mobile on customer)';
        } else {
          try {
            await sendWhatsAppConfirmation({
              customerId: custId,
              mobile: mobile,
              clientName: name,
              serviceName: serviceLabel,
              dateStr: dateStr,
              start: start,
              end: end,
              staffName: staffName,
              googleSynced: googleSynced || syncGoogle
            });
            waNote = ' · WhatsApp sent to ' + mobile;
            const icsUrl = buildIcsBlobUrl({
              title: title,
              dateStr,
              start,
              end,
              details: details || 'With ' + staffName
            });
            const a = document.createElement('a');
            a.href = icsUrl;
            a.download = 'appointment-' + dateStr + '.ics';
            a.click();
            setTimeout(() => URL.revokeObjectURL(icsUrl), 2000);
          } catch (waErr) {
            console.warn('[Biz1] WhatsApp', waErr);
            waNote = ' · WhatsApp skipped (' + (waErr.message || 'error') + ')';
          }
        }
      }

      document.getElementById('bookingModal').classList.remove('open');
      showToast(
        'Saved on Biz1 calendar',
        '#' +
          created.appointment_id +
          ' · ' +
          name +
          ' · ' +
          start +
          (googleSynced || syncGoogle ? ' · Google synced' : '') +
          waNote
      );
    } catch (e) {
      showToast('Booking failed', e.message || 'Could not create appointment');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = t('confirmBooking');
    }
  }

  /* ---------- load range — API only, no local/static cache ---------- */
  async function reloadAppointments(options) {
    const silent = !!(options && options.silent);
    const fast = silent || !!(options && options.fast);
    const weekStart = startOfWeek(currentDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const from = fmtDate(weekStart);
    const to = fmtDate(weekEnd);

    try {
      const rawItems = await fetchCalendarWeek(from, to, { fast: fast });
      // Live sync: List data only (skip N× Calendar.Get) so UI updates immediately
      const items = fast ? rawItems.map(lightEnrich) : await enrichAll(rawItems);
      dayViewWeekAppointments = mapCalendarItems(items);
    } catch (e) {
      if (!silent) {
        dayViewWeekAppointments = {};
        showToast('Calendar.List failed', e.message || '');
      }
      if (silent) return;
    }
    renderCurrentView();
  }

  /* ---------- realtime (same pattern as biz1_ticket) ---------- */
  function isCalendarRealtimeKey(key) {
    key = String(key || '').toLowerCase();
    return /calendar|appointment|booking|schedule|google|event/.test(key);
  }

  function isCustomerRealtimeKey(key) {
    key = String(key || '').toLowerCase();
    return /customer|client/.test(key);
  }

  function paintLiveChip() {
    const chips = document.querySelectorAll('[data-live-chip]');
    if (!chips.length) return;
    let state = { connected: false, status: 'off' };
    try {
      if (window.MineralBarApp && MineralBarApp.getRealtimeState) {
        state = MineralBarApp.getRealtimeState() || state;
      }
    } catch (e) { /* ignore */ }
    const on = !!(state.connected && state.status === 'ready');
    chips.forEach((el) => {
      el.classList.toggle('live-on', on);
      el.classList.toggle('live-off', !on);
      const label = el.querySelector('[data-live-label]');
      if (label) label.textContent = on ? t('liveSocketOn') : t('liveSocketOff');
    });
  }

  function wireLiveChip() {
    paintLiveChip();
    window.addEventListener('mineralbar:socket', paintLiveChip);
    window.addEventListener('mineralbar:socket-status', paintLiveChip);
    window.addEventListener('biz1:languagechange', paintLiveChip);
    setInterval(paintLiveChip, 4000);
  }

  function wireCalendarRealtimeSync() {
    if (window.__biz1CalendarSync) return;
    window.__biz1CalendarSync = true;
    let syncTimer = null;
    let syncPending = null;
    let syncInFlight = false;
    let pollTimer = null;
    let customerPending = false;

    async function applyLiveSync(event) {
      const key = String((event && event.detail && event.detail.key) || '');
      const group = (event && event.detail && event.detail.group) || '';
      const tasks = [];
      // Any non-chat event can mean calendar changed (Google sync, CRM, etc.)
      const calendarHit =
        isCalendarRealtimeKey(key) ||
        group === 'calendar' ||
        group === 'other' ||
        group === 'leads' ||
        group === 'rooms' ||
        !group;
      if (calendarHit) {
        tasks.push(reloadAppointments({ silent: true, fast: true }));
        const bookingOpen = document.getElementById('bookingModal');
        if (bookingOpen && bookingOpen.classList.contains('open')) {
          tasks.push(refreshSlots().catch(function () {}));
        }
      }
      if (customerPending || isCustomerRealtimeKey(key) || group === 'leads') {
        customerPending = false;
        tasks.push(
          fetchCustomers()
            .then(function (rows) {
              CUSTOMERS = rows || [];
              CUSTOMERS.forEach(function (c) {
                if (c.id && c.mobile) customerMobileCache[String(c.id)] = c.mobile;
              });
              const sel = document.getElementById('qbClient');
              const bookingOpen = document.getElementById('bookingModal');
              if (sel && bookingOpen && bookingOpen.classList.contains('open')) {
                const prev = sel.value;
                sel.innerHTML = CUSTOMERS.map(function (c) {
                  return '<option value="' + c.id + '">' + (c.name || c.id) + '</option>';
                }).join('');
                if (prev) sel.value = prev;
              }
            })
            .catch(function () {})
        );
      }
      if (!tasks.length) return;
      await Promise.all(tasks);
    }

    function runIncrementalSync(event) {
      if (!getToken()) return;
      syncPending = event || syncPending || {};
      if (event && event.detail && isCustomerRealtimeKey(event.detail.key)) {
        customerPending = true;
      }
      if (syncInFlight) return;
      if (syncTimer) clearTimeout(syncTimer);
      // Near-instant: only coalesce same-tick bursts
      syncTimer = setTimeout(function () {
        syncTimer = null;
        const ev = syncPending;
        syncPending = null;
        syncInFlight = true;
        applyLiveSync(ev)
          .catch(function (err) {
            console.warn('[Biz1] realtime calendar sync failed', err);
          })
          .finally(function () {
            syncInFlight = false;
            if (syncPending || customerPending) runIncrementalSync(syncPending || {});
          });
      }, 40);
    }

    window.addEventListener('mineralbar:realtime', function (e) {
      const group = (e.detail && e.detail.group) || '';
      // Ignore pure chat/mission noise; everything else refreshes calendar ASAP
      if (group === 'messages' || group === 'missions') return;
      runIncrementalSync(e);
    });

    window.addEventListener('mineralbar:calendar', function (e) {
      runIncrementalSync(e);
    });

    window.addEventListener('mineralbar:socket', function (e) {
      if (!(e.detail && e.detail.type === 'ready')) return;
      if (!getToken()) return;
      paintLiveChip();
      if (pollTimer) clearInterval(pollTimer);
      // Fast safety net if a payload key is unexpected
      pollTimer = setInterval(function () {
        if (!getToken()) return;
        let st = null;
        try {
          st = MineralBarApp.getRealtimeState && MineralBarApp.getRealtimeState();
        } catch (err) { /* ignore */ }
        if (!(st && st.connected)) return;
        if (document.hidden) return;
        reloadAppointments({ silent: true, fast: true }).catch(function () {});
      }, 4000);
    });
  }

  async function connectDashboardRealtime() {
    wireLiveChip();
    wireCalendarRealtimeSync();
    if (!window.MineralBarApp || !MineralBarApp.connectRealtime) {
      console.warn('[Biz1] MineralBarApp.connectRealtime missing');
      paintLiveChip();
      return;
    }
    try {
      const result = await MineralBarApp.connectRealtime({ timeoutMs: 12000 });
      if (result && result.promise) await result.promise;
    } catch (e) {
      console.warn('[Biz1] realtime connect failed', e);
    }
    paintLiveChip();
  }

  async function init() {
    applyLanguage(getLanguage());

    try {
      const basic = await fetchUserBasic();
      STAFF = teamFromBasic(basic);
      renderLoggedInUser(basic);
    } catch (e) {
      console.warn('[Biz1] User.Basic', e);
      showToast('Account load failed', e.message || '');
      renderLoggedInUser(null);
    }

    CUSTOMERS = await fetchCustomers();
    CUSTOMERS.forEach((c) => {
      if (c.id && c.mobile) customerMobileCache[String(c.id)] = c.mobile;
    });

    const meta = await fetchBuilderMeta(fmtDate(currentDate), '', DEFAULT_TYPE_ID);
    if (meta) {
      if (Array.isArray(meta.appointment_types)) SERVICES = meta.appointment_types;
      if (Array.isArray(meta.doctors) && meta.doctors.length && !STAFF.length) {
        STAFF = meta.doctors.map((d, idx) => ({
          id: String(d.id),
          name: d.name || ('Staff ' + d.id),
          role: 'Team',
          color: STAFF_COLORS[idx % STAFF_COLORS.length]
        }));
      }
    }

    if (!STAFF.length) {
      STAFF = [
        {
          id: String(ACCOUNT_USER_ID),
          name: 'Front desk',
          role: 'Owner',
          color: STAFF_COLORS[0]
        }
      ];
    }

    // Default week filter = ALL (show every #calendar-tab booking)
    weekSelectedStaffId = null;
    const allStaffLabel = (I18N[currentLang] || I18N.en).allStaff || 'All staff';
    const dayPicker = document.getElementById('dayStaffPicker');
    dayPicker.innerHTML =
      '<option value="all" data-i18n="allStaff">' +
      allStaffLabel +
      '</option>' +
      STAFF.map((s) => '<option value="' + s.id + '">' + s.name + '</option>').join('');

    const weekPicker = document.getElementById('weekStaffPicker');
    weekPicker.innerHTML =
      '<option value="all" data-i18n="allStaff">' +
      allStaffLabel +
      '</option>' +
      STAFF.map((s) => '<option value="' + s.id + '">' + s.name + '</option>').join('');
    weekPicker.value = 'all';
    updateColorDot(document.getElementById('weekStaffDot'), null);
    updateColorDot(document.getElementById('dayStaffDot'), null);

    updateWeekRangeLabel();

    await reloadAppointments();
    setView('day');
    connectDashboardRealtime();
  }

  /* ---------- events ---------- */
  document.getElementById('langSwitch').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-lang]');
    if (!btn) return;
    applyLanguage(btn.getAttribute('data-lang'));
    updateWeekRangeLabel();
    renderCurrentView();
  });

  document.getElementById('viewSwitch').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-view]');
    if (!btn) return;
    setView(btn.getAttribute('data-view'));
  });

  document.getElementById('dayStaffPicker').addEventListener('change', (e) => {
    daySelectedStaffId = e.target.value === 'all' ? null : e.target.value;
    updateColorDot(document.getElementById('dayStaffDot'), daySelectedStaffId);
    const dayLabel = document.getElementById('dayRangeLabel');
    if (dayLabel) dayLabel.style.color = getStaffColor(daySelectedStaffId);
    if (currentView === 'day') renderDayView();
  });

  document.getElementById('weekStaffPicker').addEventListener('change', (e) => {
    weekSelectedStaffId = e.target.value === 'all' ? null : e.target.value;
    updateColorDot(document.getElementById('weekStaffDot'), weekSelectedStaffId);
    const weekLabel = document.getElementById('weekRangeLabel');
    if (weekLabel) weekLabel.style.color = getStaffColor(weekSelectedStaffId);
    renderWeekView();
  });

  document.getElementById('prevDay').addEventListener('click', async () => {
    await shiftCalendar(-1);
  });
  document.getElementById('nextDay').addEventListener('click', async () => {
    await shiftCalendar(1);
  });
  document.getElementById('prevWeek').addEventListener('click', async () => {
    await shiftCalendar(-7);
  });
  document.getElementById('nextWeek').addEventListener('click', async () => {
    await shiftCalendar(7);
  });

  const openQuickBookBtn = document.getElementById('openQuickBook');
  if (openQuickBookBtn) {
    openQuickBookBtn.addEventListener('click', () => openBookingModal({}));
  }
  document.getElementById('qbCancel').addEventListener('click', () => {
    bookingLock = null;
    document.getElementById('bookingModal').classList.remove('open');
  });
  document.getElementById('qbSubmit').addEventListener('click', quickBook);
  document.getElementById('qbClient').addEventListener('change', () => {
    syncBookingTitle();
    highlightQbSteps();
  });
  document.getElementById('qbStaff').addEventListener('change', (e) => {
    applyBookingStaffColor(e.target.value);
    refreshSlots();
    highlightQbSteps();
  });
  document.getElementById('qbDate').addEventListener('change', refreshSlots);
  const qbTitleEl = document.getElementById('qbTitle');
  if (qbTitleEl) {
    qbTitleEl.addEventListener('input', () => {
      qbTitleEl.dataset.userEdited = qbTitleEl.value.trim() ? '1' : '';
    });
  }

  document.getElementById('adClose').addEventListener('click', () => {
    document.getElementById('apptDetailModal').classList.remove('open');
  });
  document.getElementById('apptDetailModal').addEventListener('click', (e) => {
    if (e.target.id === 'apptDetailModal') e.target.classList.remove('open');
  });
  document.getElementById('bookingModal').addEventListener('click', (e) => {
    if (e.target.id === 'bookingModal') {
      bookingLock = null;
      e.target.classList.remove('open');
    }
  });

  function removeAppointmentFromCalendar(apptId) {
    const id = String(apptId || '');
    Object.keys(dayViewWeekAppointments).forEach((dateStr) => {
      dayViewWeekAppointments[dateStr] = (
        dayViewWeekAppointments[dateStr] || []
      ).filter((appt) => String(appt.id) !== id);
    });
    renderCurrentView();
  }

  document.getElementById('adDeleteBtn').addEventListener('click', async () => {
    if (!currentDetailAppt) return;
    if (!confirm('Delete appointment with ' + currentDetailAppt.client + '?')) return;
    const apptId = String(currentDetailAppt.id || '').trim();
    if (!apptId || apptId === 'undefined' || apptId === 'null') {
      showToast('Delete failed', 'Appointment ID is missing');
      return;
    }
    const clientName = currentDetailAppt.client;
    const deleteBtn = document.getElementById('adDeleteBtn');
    deleteBtn.disabled = true;
    try {
      // Calendar.Delete defaults Google cleanup to enabled; send only its
      // documented required field to avoid tenant-specific optional-field issues.
      await apiPost('Calendar.Delete', { appointment_id: apptId });
      removeAppointmentFromCalendar(apptId);
      document.getElementById('apptDetailModal').classList.remove('open');
      showToast('Deleted on Biz1 calendar', clientName);
      currentDetailAppt = null;
    } catch (e) {
      showToast('Delete failed', e.message || 'Calendar.Delete error');
    } finally {
      deleteBtn.disabled = false;
    }
  });

  document.getElementById('themeToggle').addEventListener('click', () => {
    const cur = document.body.getAttribute('data-theme');
    document.body.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    try {
      if (window.MineralBarApp && MineralBarApp.clearSession) MineralBarApp.clearSession();
      else if (window.MineralBarApp && MineralBarApp.disconnectRealtime) MineralBarApp.disconnectRealtime();
    } catch (e) { /* ignore */ }
    localStorage.removeItem('biz1_sdk_bearer_token');
    window.location.href = 'index.html';
  });

  init();
})();
