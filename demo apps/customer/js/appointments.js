/**
 * Appointments week calendar
 * APIs: List, Get, Doctors, Types, Add, Edit, Delete
 * Docs: https://eli.biz1.co.il/app/help/category/Customer-Portal
 */
const AppointmentsCalendar = (() => {
  const HOUR_START = 6;
  const HOUR_END = 22;
  const SLOT_HEIGHT = 80;
  const DOCTOR_COLORS = ['#e91e8c', '#f97316', '#14b8a6', '#ef4444', '#8b5cf6', '#2563eb'];

  let state = {
    viewMode: 'week', // week | day | month
    viewDate: new Date(),
    weekStart: null,
    selectedDate: null,
    miniMonth: null,
    appointments: [],
    doctors: [],
    allDoctors: [],
    types: [],
    places: [],
    products: [],
    insuranceCompanies: [],
    coupons: [],
    selectedCouponIds: [],
    appliedCoupon: null,
    branches: [],
    filterDoctor: 'all',
    filterType: 'all',
    filterPlace: 'all',
    filterBranch: 'all',
    loading: false,
  };

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function toISO(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function parseDate(value) {
    if (!value) return null;
    const s = String(value).slice(0, 10);
    const d = new Date(`${s}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function startOfWeek(d) {
    const x = new Date(d);
    const day = x.getDay();
    x.setDate(x.getDate() - day);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  function getWeekDates(start) {
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }

  function timeToMinutes(t) {
    if (!t) return HOUR_START * 60;
    const parts = String(t).trim().split(':');
    const h = Number(parts[0]) || 0;
    const m = Number(parts[1]) || 0;
    return h * 60 + m;
  }

  function minutesToTime(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${pad(h)}:${pad(m)}`;
  }

  function loc() {
    return typeof I18n !== 'undefined' ? I18n.locale() : undefined;
  }

  function t(key, vars) {
    return typeof I18n !== 'undefined' ? I18n.t(key, vars) : key;
  }

  function formatWeekRange(start) {
    const end = addDays(start, 6);
    const opts = { day: 'numeric', month: 'short', year: 'numeric' };
    return `${start.toLocaleDateString(loc(), opts)} - ${end.toLocaleDateString(loc(), opts)}`;
  }

  function formatRangeLabel() {
    const opts = { day: 'numeric', month: 'short', year: 'numeric' };
    if (state.viewMode === 'day') {
      const d = state.selectedDate || state.viewDate;
      return d.toLocaleDateString(loc(), { weekday: 'short', ...opts });
    }
    if (state.viewMode === 'month') {
      const d = state.viewDate;
      return d.toLocaleDateString(loc(), { month: 'long', year: 'numeric' });
    }
    return formatWeekRange(state.weekStart);
  }

  function visibleDoctors() {
    const pool = state.doctors.length ? state.doctors : state.allDoctors;
    if (state.filterDoctor !== 'all') {
      const one = pool.find((d) => String(d.id) === String(state.filterDoctor));
      return one ? [one] : pool.slice(0, 1);
    }
    return pool.length ? pool : [{ id: 'default', name: t('appt.staff'), color: DOCTOR_COLORS[0] }];
  }

  function selectedBranch() {
    if (state.filterBranch === 'all') return null;
    return state.branches.find((b) => String(b.id) === String(state.filterBranch)) || null;
  }

  function doctorsForBranch(branchId) {
    if (!branchId || branchId === 'all') return state.allDoctors.slice();
    const branch = state.branches.find((b) => String(b.id) === String(branchId));
    const ids = (branch?.doctor_ids || []).map(String);
    if (!ids.length) return state.allDoctors.slice();
    const matched = state.allDoctors.filter((d) =>
      ids.includes(String(d.id)) || ids.includes(String(d.doctor_id)) || ids.includes(String(d.team_member_id))
    );
    return matched.length ? matched : state.allDoctors.slice();
  }

  function applyBranchFilter(branchId) {
    state.filterBranch = branchId || 'all';
    state.doctors = doctorsForBranch(state.filterBranch);
    if (state.filterDoctor !== 'all' && !state.doctors.some((d) => String(d.id) === String(state.filterDoctor))) {
      state.filterDoctor = 'all';
    }
  }

  function normalizeBranches(payload) {
    return UI.listRows(payload).map((b) => {
      const id = String(b.branch_id || b.id || '').trim();
      const lang = typeof I18n !== 'undefined' ? I18n.get() : 'en';
      const he = String(b.branch_name_he || '').trim();
      const en = String(b.branch_name || b.name || '').trim();
      const name = lang === 'he' && he ? he : en || he || `${t('appt.branch')} #${id}`;
      const doctorIds = []
        .concat(b.doctor_ids || [])
        .concat(b.team_member || [])
        .map(String)
        .filter(Boolean);
      return {
        id,
        name,
        doctor_ids: [...new Set(doctorIds)],
        appointment_room: b.appointment_room || [],
      };
    }).filter((b) => b.id);
  }

  function branchesFromAppointments(rows) {
    const map = new Map();
    rows.forEach((a) => {
      const id = String(a.branch || a.branch_id || a.appointment_branch_id || '').trim();
      if (!id || id === '0') return;
      if (!map.has(id)) map.set(id, { id, name: `${t('appt.branch')} #${id}`, doctor_ids: [], appointment_room: [] });
    });
    return [...map.values()];
  }

  function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  function endOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  }

  function shiftView(dir) {
    if (state.viewMode === 'day') {
      const d = addDays(state.selectedDate || state.viewDate, dir);
      state.selectedDate = d;
      state.viewDate = d;
      state.weekStart = startOfWeek(d);
    } else if (state.viewMode === 'month') {
      const d = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() + dir, 1);
      state.viewDate = d;
      state.selectedDate = d;
      state.weekStart = startOfWeek(d);
      state.miniMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    } else {
      state.weekStart = addDays(state.weekStart, dir * 7);
      state.viewDate = new Date(state.weekStart);
      state.selectedDate = new Date(state.weekStart);
    }
    refresh();
  }

  function formatDayHeader(d) {
    return {
      dow: d.toLocaleDateString(loc(), { weekday: 'short' }),
      dom: d.getDate(),
      month: d.toLocaleDateString(loc(), { month: 'short' }),
    };
  }

  function initials(name) {
    return String(name || '?')
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  function doctorIdOf(a) {
    // Prefer doctor_id — List/Get store the team member (user_detail.id) here.
    // Never fall back to user_id (account owner), which mis-labels the doctor.
    const candidates = [a.doctor_id, a.team_member_id, a.member_id];
    for (const raw of candidates) {
      if (raw == null || raw === '') continue;
      const id = String(raw).trim();
      if (!id || id === '0') continue;
      return id;
    }
    return '';
  }

  function doctorKey(a) {
    const id = doctorIdOf(a);
    return id || 'default';
  }

  function findDoctor(id) {
    const sid = String(id || '').trim();
    if (!sid) return null;
    return (
      state.doctors.find((d) =>
        [d.id, d.doctor_id, d.team_member_id, d.rowId].some((v) => String(v) === sid)
      ) || null
    );
  }

  function doctorName(a) {
    const doc = findDoctor(doctorIdOf(a));
    if (doc) return doc.name;
    return a.doctor_name || a.team_member_name || a.member_name || a.doctor || a.staff_name || t('appt.staff');
  }

  function findType(idOrName) {
    return state.types.find(
      (tp) => String(tp.id) === String(idOrName) || tp.name === idOrName
    );
  }

  function typeIdOf(a) {
    return a.appointments_type_data_id || a.appointments_type_id || a.appointment_type_id || a.type_id || '';
  }

  function appointmentType(a) {
    const tp = findType(typeIdOf(a));
    if (tp) return tp.name;
    return a.appointment_type || a.type_name || a.type || a.subject || t('appt.general');
  }

  function patientLabel(a) {
    return (
      a.patient_name ||
      a.customer_name ||
      a.name ||
      a.subject ||
      a.title ||
      appointmentType(a) ||
      t('appt.appointment')
    );
  }

  function colorFor(key, index = 0) {
    let hash = 0;
    const s = String(key);
    for (let i = 0; i < s.length; i++) hash = (hash + s.charCodeAt(i) * (i + 1)) % DOCTOR_COLORS.length;
    return DOCTOR_COLORS[(hash + index) % DOCTOR_COLORS.length];
  }

  function normalizeDoctors(payload) {
    const rows = UI.listRows(payload);
    return rows.map((d, idx) => {
      // Doctors API: doctor_id / team_member_id = user_detail.id (value to POST on Add)
      const teamId = String(d.doctor_id || d.team_member_id || '').trim();
      const rowId = String(d.id || '').trim();
      const id = teamId || rowId;
      const apiColor = d.color && d.color !== '#000000' ? d.color : colorFor(id, idx);
      return {
        id,
        rowId,
        doctor_id: teamId || id,
        team_member_id: teamId || id,
        name: d.name || d.doctor_name || t('appt.staff'),
        color: apiColor,
        hours: d.hours || '08:00 - 21:30',
        profile_image_url: d.profile_image_url || '',
        place: d.place || '',
      };
    });
  }

  function normalizeTypes(payload) {
    return UI.listRows(payload).map((tp) => ({
      id: String(tp.id),
      name: tp.name || t('appt.general'),
      time: Number(tp.time) || 30,
      price: tp.price,
    }));
  }

  /** Start times: dashboard 30-minute steps 08:00–21:30 */
  function startTimeOptions(selected) {
    const opts = [];
    for (let m = HOUR_START * 60; m <= 21 * 60 + 30; m += 30) {
      const val = minutesToTime(m);
      opts.push(`<option value="${val}" ${val === selected ? 'selected' : ''}>${val}</option>`);
    }
    return opts.join('');
  }

  /** End times: 5-minute steps so type durations (15/30/45…) always fit */
  function endTimeOptions(selected) {
    const opts = [];
    const selectedMins = timeToMinutes(selected);
    let hasSelected = false;
    for (let m = HOUR_START * 60 + 5; m <= 22 * 60; m += 5) {
      const val = minutesToTime(m);
      if (val === selected) hasSelected = true;
      opts.push(`<option value="${val}" ${val === selected ? 'selected' : ''}>${val}</option>`);
    }
    if (selected && !hasSelected && selectedMins > HOUR_START * 60) {
      opts.unshift(`<option value="${selected}" selected>${selected}</option>`);
    }
    return opts.join('');
  }

  function typeDuration(typeSelect) {
    const opt = typeSelect?.selectedOptions?.[0];
    const fromData = Number(opt?.dataset?.duration);
    if (Number.isFinite(fromData) && fromData > 0) return fromData;
    const tp = findType(typeSelect?.value);
    return tp?.time || 30;
  }

  function setEndFromDuration(startSelect, endSelect, typeSelect) {
    if (!startSelect || !endSelect) return;
    const dur = typeDuration(typeSelect);
    const end = minutesToTime(timeToMinutes(startSelect.value) + dur);
    if (![...endSelect.options].some((o) => o.value === end)) {
      const opt = document.createElement('option');
      opt.value = end;
      opt.textContent = end;
      endSelect.appendChild(opt);
    }
    endSelect.value = end;
  }

  function filteredAppointments() {
    return state.appointments.filter((a) => {
      if (state.filterDoctor !== 'all' && doctorKey(a) !== state.filterDoctor) return false;
      if (state.filterType !== 'all') {
        const tid = String(typeIdOf(a));
        const tname = appointmentType(a);
        if (tid !== state.filterType && tname !== state.filterType) return false;
      }
      if (state.filterBranch !== 'all') {
        const bid = String(a.branch || a.branch_id || a.appointment_branch_id || '');
        if (bid !== String(state.filterBranch)) return false;
      }
      return true;
    });
  }

  async function fetchWeekAppointments(weekStart) {
    const dates = getWeekDates(weekStart);
    return fetchAppointmentsForDates(dates);
  }

  async function fetchAppointmentsForDates(dates) {
    const chunks = await Promise.all(
      dates.map((d) =>
        API.appointmentsList({ date: toISO(d), limit: 25 }).catch(() => ({ data: [] }))
      )
    );
    const merged = [];
    const seen = new Set();
    chunks.forEach((chunk, i) => {
      UI.listRows(chunk).forEach((a) => {
        const id = a.id || `${a.date}-${a.start_time}-${a.end_time}`;
        if (seen.has(id)) return;
        seen.add(id);
        merged.push({ ...a, date: String(a.date || toISO(dates[i])).slice(0, 10) });
      });
    });
    return merged;
  }

  async function fetchRangeAppointments() {
    if (state.viewMode === 'day') {
      const d = state.selectedDate || state.viewDate;
      return fetchAppointmentsForDates([d]);
    }
    if (state.viewMode === 'month') {
      const start = startOfMonth(state.viewDate);
      const end = endOfMonth(state.viewDate);
      const dates = [];
      for (let d = new Date(start); d <= end; d = addDays(d, 1)) dates.push(new Date(d));
      // Cap parallel calls — fetch by week chunks
      const weeks = [];
      let cursor = startOfWeek(start);
      while (cursor <= end) {
        weeks.push(getWeekDates(cursor));
        cursor = addDays(cursor, 7);
      }
      const all = [];
      const seen = new Set();
      for (const week of weeks) {
        const rows = await fetchAppointmentsForDates(week);
        rows.forEach((a) => {
          const id = a.id || `${a.date}-${a.start_time}`;
          if (seen.has(id)) return;
          const iso = String(a.date).slice(0, 10);
          if (iso < toISO(start) || iso > toISO(end)) return;
          seen.add(id);
          all.push(a);
        });
      }
      return all;
    }
    return fetchWeekAppointments(state.weekStart);
  }

  async function loadMeta() {
    const lang = typeof I18n !== 'undefined' ? I18n.get() : 'en';
    const [docsRes, typesRes, branchesRes, productsRes, insuranceRes, couponsRes] = await Promise.all([
      API.appointmentsDoctors().catch(() => ({ data: [], places: [] })),
      API.appointmentsTypes().catch(() => ({ data: [] })),
      API.appointmentBranchesList({ lang, site_lang: lang }).catch((err) => ({ __error: err, data: [] })),
      API.productsList({ limit: 25 }).catch(() => ({ data: [] })),
      API.appointmentInsuranceCompaniesList({ lang, site_lang: lang }).catch((err) => ({ __error: err, data: [] })),
      API.appointmentsCoupons({ status: 'unused', lang }).catch((err) => ({ __error: err, data: [] })),
    ]);
    state.allDoctors = normalizeDoctors(docsRes);
    state.types = normalizeTypes(typesRes);
    state.places = Array.isArray(docsRes.places) ? docsRes.places.filter(Boolean) : [];
    state.products = UI.listRows(productsRes)
      .map((p) => ({
        id: String(p.id || p.product_id || ''),
        name: p.product_name || p.name || p.title || `#${p.id}`,
        price: Number(p.price ?? p.final_price ?? p.sale_price ?? 0) || 0,
      }))
      .filter((p) => p.id);

    state.insuranceCompanies = UI.listRows(insuranceRes)
      .map((row) => ({
        id: String(row.id || row.insurance_id || ''),
        name: row.name_en || row.name || row.insurance_name || `#${row.id}`,
      }))
      .filter((row) => row.id);

    state.coupons = normalizeCoupons(couponsRes);

    let branches = normalizeBranches(branchesRes);
    if (!branches.length) {
      const sample = await API.appointmentsList({ limit: 25 }).catch(() => ({ data: [] }));
      branches = branchesFromAppointments(UI.listRows(sample));
    }
    state.branches = branches;
    applyBranchFilter(state.filterBranch);
    renderBranchSelect();
  }

  function normalizeCoupons(res) {
    return UI.listRows(res).map((row) => ({
      id: String(row.id || row.coupon_id || ''),
      code: row.coupon_code || row.code || row.id,
      typeId: String(row.appointment_type_id || row.coupon_appo_type_id || ''),
      type: row.appointment_type_name || row.type_name || '',
      amount: row.amount ?? row.coupon_amount ?? 0,
      left: row.left_amount ?? row.coupon_left_amount ?? row.amount ?? 0,
      insuranceId: String(row.insurance || row.insurance_id || row.coupon_insurance_company || ''),
      insurance: row.insurance_name || row.insurance || '',
      notes: row.notes || row.coupon_note || '',
      status: row.status_label || row.status || row.coupon_status || '',
      date: row.coupon_date || row.date || '',
      orderId: row.order_id || '',
      canApply: row.can_apply !== false,
      canEdit: row.can_edit !== false,
      canDelete: row.can_delete !== false,
      watch: row.watch || row.document_url || row.pdf_url || '',
      raw: row,
    })).filter((row) => row.id);
  }

  async function refreshCoupons() {
    const lang = typeof I18n !== 'undefined' ? I18n.get() : 'en';
    const res = await API.appointmentsCoupons({ status: 'unused', lang }).catch(() => ({ data: [] }));
    state.coupons = normalizeCoupons(res);
    return state.coupons;
  }

  function renderBranchSelect() {
    const sel = document.getElementById('appt-branch');
    if (!sel) return;
    const current = state.filterBranch;
    const opts = [
      `<option value="all">${Layout.escapeHtml(t('appt.allBranches'))}</option>`,
      ...state.branches.map(
        (b) =>
          `<option value="${Layout.escapeHtml(b.id)}" ${String(current) === String(b.id) ? 'selected' : ''}>${Layout.escapeHtml(b.name)}</option>`
      ),
    ];
    sel.innerHTML = opts.join('');
    sel.value = state.branches.some((b) => String(b.id) === String(current)) ? String(current) : 'all';
    sel.disabled = state.branches.length === 0;
  }

  function weekdayLabels() {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2024, 0, 7 + i);
      return `<span>${d.toLocaleDateString(loc(), { weekday: 'short' })}</span>`;
    }).join('');
  }

  function renderMiniCalendar(root) {
    if (!root) return;
    const month = state.miniMonth || new Date(state.viewDate);
    const year = month.getFullYear();
    const mon = month.getMonth();
    const first = new Date(year, mon, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, mon + 1, 0).getDate();
    const todayISO = toISO(new Date());
    const selectedISO = toISO(state.selectedDate || state.viewDate);

    let cells = '';
    for (let i = 0; i < startPad; i++) cells += '<span class="appt-cal-empty"></span>';
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, mon, day);
      const iso = toISO(d);
      const cls = [
        'appt-cal-day',
        iso === todayISO ? 'is-today' : '',
        iso === selectedISO ? 'is-selected' : '',
      ]
        .filter(Boolean)
        .join(' ');
      cells += `<button type="button" class="${cls}" data-date="${iso}">${day}</button>`;
    }

    root.innerHTML = `
      <div class="appt-mini-cal">
        <div class="appt-mini-cal-head">
          <button type="button" class="appt-icon-btn" data-cal-nav="-1" aria-label="${t('appt.prevMonth')}">‹</button>
          <strong>${month.toLocaleDateString(loc(), { month: 'long', year: 'numeric' })}</strong>
          <button type="button" class="appt-icon-btn" data-cal-nav="1" aria-label="${t('appt.nextMonth')}">›</button>
        </div>
        <div class="appt-cal-dow">${weekdayLabels()}</div>
        <div class="appt-cal-grid">${cells}</div>
      </div>`;

    root.querySelectorAll('[data-cal-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dir = Number(btn.dataset.calNav);
        state.miniMonth = new Date(year, mon + dir, 1);
        renderMiniCalendar(root);
      });
    });

    root.querySelectorAll('[data-date]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const d = parseDate(btn.dataset.date);
        if (!d) return;
        state.selectedDate = d;
        state.viewDate = d;
        state.weekStart = startOfWeek(d);
        refresh();
      });
    });
  }

  function renderDoctors(root) {
    if (!root) return;
    if (!state.doctors.length) {
      root.innerHTML = `<div class="appt-doctors"><div class="appt-section-title">${t('appt.doctors')}</div><p class="muted text-sm">${t('appt.noDoctors')}</p></div>`;
      return;
    }

    root.innerHTML = `
      <div class="appt-doctors">
        <div class="appt-section-title">${t('appt.doctors')}</div>
        ${state.doctors
          .map(
            (doc) => `<button type="button" class="appt-doctor ${state.filterDoctor === doc.id ? 'active' : ''}" data-doctor="${Layout.escapeHtml(doc.id)}">
              <span class="appt-doctor-avatar" style="--doc-color:${doc.color}">${
                doc.profile_image_url
                  ? `<img src="${Layout.escapeHtml(doc.profile_image_url)}" alt="" />`
                  : Layout.escapeHtml(initials(doc.name))
              }</span>
              <span class="appt-doctor-meta">
                <span class="appt-doctor-name"><i class="appt-dot" style="background:${doc.color}"></i>${Layout.escapeHtml(doc.name)}</span>
                <span class="appt-doctor-hours">${Layout.escapeHtml(doc.hours)}</span>
              </span>
            </button>`
          )
          .join('')}
      </div>`;

    root.querySelectorAll('[data-doctor]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.filterDoctor = state.filterDoctor === btn.dataset.doctor ? 'all' : btn.dataset.doctor;
        renderDoctors(root);
        renderCalendar(document.getElementById('appt-week'));
        renderFilters(document.getElementById('appt-filters'));
      });
    });
  }

  function renderFilters(root) {
    if (!root) return;
    const chips = [
      `<button type="button" class="appt-filter-chip ${state.filterType === 'all' ? 'active' : ''}" data-type="all">${t('appt.all')}</button>`,
      ...state.types.map(
        (tp) =>
          `<button type="button" class="appt-filter-chip ${state.filterType === tp.id ? 'active' : ''}" data-type="${Layout.escapeHtml(tp.id)}">${Layout.escapeHtml(tp.name)}</button>`
      ),
    ];
    root.innerHTML = chips.join('');

    const allBtn = document.getElementById('appt-filter-all');
    if (allBtn) {
      allBtn.classList.toggle('active', state.filterType === 'all' && state.filterDoctor === 'all');
      allBtn.onclick = () => {
        state.filterType = 'all';
        state.filterDoctor = 'all';
        renderDoctors(document.getElementById('appt-doctors'));
        renderFilters(root);
        renderCalendar(document.getElementById('appt-week'));
      };
    }

    root.querySelectorAll('[data-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.filterType = btn.dataset.type;
        renderFilters(root);
        renderCalendar(document.getElementById('appt-week'));
      });
    });
  }

  function blockHtml(a, gridStart, gridEnd) {
    const start = timeToMinutes(a.start_time);
    const end = timeToMinutes(a.end_time || a.start_time);
    const top = ((Math.max(start, gridStart) - gridStart) / 60) * SLOT_HEIGHT;
    const rawHeight = ((Math.min(end, gridEnd) - Math.max(start, gridStart)) / 60) * SLOT_HEIGHT;
    const height = Math.max(rawHeight, 44);
    const doc = findDoctor(doctorIdOf(a));
    const color = doc?.color || colorFor(doctorKey(a));
    const name = patientLabel(a);
    const type = appointmentType(a);
    const tip = `${a.start_time || ''}${a.end_time ? `–${a.end_time}` : ''} · ${name}${doc ? ` · ${doc.name}` : ''} · ${type}`;
    const sizeClass = height < 56 ? 'is-compact' : height < 72 ? 'is-short' : 'is-tall';
    return `<button type="button" class="appt-block ${sizeClass}" style="top:${top}px;height:${height}px;background:${color}" data-id="${a.id}" title="${Layout.escapeHtml(tip)}">
      <span class="appt-block-title">${Layout.escapeHtml(name)}</span>
    </button>`;
  }

  function bindCalendarEvents(root, gridStart) {
    root.querySelectorAll('.appt-block').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDetailModal(btn.dataset.id);
      });
    });

    root.querySelectorAll('.appt-day-grid, .appt-staff-grid').forEach((col) => {
      col.addEventListener('dblclick', (e) => {
        if (e.target.closest('.appt-block')) return;
        const rect = col.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const mins = gridStart + Math.floor(y / SLOT_HEIGHT) * 60;
        const start = minutesToTime(mins);
        const defaultDur = state.types[0]?.time || 30;
        openFormModal({
          date: col.dataset.date,
          start,
          end: minutesToTime(mins + defaultDur),
          doctor_id: col.dataset.doctor || (state.filterDoctor !== 'all' ? state.filterDoctor : ''),
        });
      });
    });
  }

  function renderTimeColumn(totalHeight) {
    const hours = [];
    for (let h = HOUR_START; h < HOUR_END; h++) {
      hours.push(`<div class="appt-hour-label" style="height:${SLOT_HEIGHT}px">${pad(h)}:00</div>`);
    }
    return `<div class="appt-time-col">
      <div class="appt-time-head"></div>
      <div class="appt-time-body" style="height:${totalHeight}px">${hours.join('')}</div>
    </div>`;
  }

  function renderWeek(root) {
    if (!root) return;
    const dates = state.viewMode === 'day' ? [state.selectedDate || state.viewDate] : getWeekDates(state.weekStart);
    const list = filteredAppointments();
    const doctors = visibleDoctors();
    const gridStart = HOUR_START * 60;
    const gridEnd = HOUR_END * 60;
    const totalHeight = (HOUR_END - HOUR_START) * SLOT_HEIGHT;

    const dayCols = dates
      .map((d) => {
        const iso = toISO(d);
        const h = formatDayHeader(d);
        const dayApts = list.filter((a) => String(a.date).slice(0, 10) === iso);

        const staffHeads = doctors
          .map(
            (doc) =>
              `<div class="appt-staff-head" style="--doc-color:${doc.color}" title="${Layout.escapeHtml(doc.name)}">${Layout.escapeHtml(doc.name)}</div>`
          )
          .join('');

        const staffCols = doctors
          .map((doc) => {
            const blocks = (doctors.length === 1
              ? dayApts
              : dayApts.filter((a) => {
                  const kid = doctorIdOf(a);
                  if (!kid) return doc === doctors[0];
                  return String(kid) === String(doc.id);
                })
            )
              .map((a) => blockHtml(a, gridStart, gridEnd))
              .join('');

            return `<div class="appt-staff-col">
              <div class="appt-staff-grid" style="height:${totalHeight}px" data-date="${iso}" data-doctor="${Layout.escapeHtml(String(doc.id))}">
                ${blocks}
              </div>
            </div>`;
          })
          .join('');

        return `<div class="appt-day-col ${state.viewMode === 'day' ? 'is-day-view' : ''}" style="--staff-count:${doctors.length}">
          <div class="appt-day-head">
            <span class="appt-day-dow">${h.dow}</span>
            <span class="appt-day-dom">${h.dom} ${h.month}</span>
          </div>
          <div class="appt-staff-heads">${staffHeads}</div>
          <div class="appt-staff-row">${staffCols}</div>
        </div>`;
      })
      .join('');

    root.innerHTML = `
      <div class="appt-week-shell appt-view-${state.viewMode}" style="--staff-count:${doctors.length}">
        ${renderTimeColumn(totalHeight)}
        <div class="appt-days-row">${dayCols}</div>
      </div>`;

    bindCalendarEvents(root, gridStart);
  }

  function renderMonth(root) {
    if (!root) return;
    const month = state.viewDate;
    const year = month.getFullYear();
    const mon = month.getMonth();
    const first = new Date(year, mon, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, mon + 1, 0).getDate();
    const list = filteredAppointments();
    const todayISO = toISO(new Date());
    const selectedISO = toISO(state.selectedDate || state.viewDate);

    const dow = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2024, 0, 7 + i);
      return `<div class="appt-month-dow">${d.toLocaleDateString(loc(), { weekday: 'short' })}</div>`;
    }).join('');

    let cells = '';
    for (let i = 0; i < startPad; i++) cells += '<div class="appt-month-cell is-empty"></div>';
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, mon, day);
      const iso = toISO(d);
      const dayApts = list.filter((a) => String(a.date).slice(0, 10) === iso);
      const cls = [
        'appt-month-cell',
        iso === todayISO ? 'is-today' : '',
        iso === selectedISO ? 'is-selected' : '',
      ]
        .filter(Boolean)
        .join(' ');
      const chips = dayApts
        .slice(0, 3)
        .map((a) => {
          const doc = findDoctor(doctorIdOf(a));
          const color = doc?.color || colorFor(doctorKey(a));
          return `<button type="button" class="appt-month-chip" style="background:${color}" data-id="${a.id}">${Layout.escapeHtml(patientLabel(a))}</button>`;
        })
        .join('');
      const more = dayApts.length > 3 ? `<span class="appt-month-more">+${dayApts.length - 3}</span>` : '';
      cells += `<div class="${cls}" data-date="${iso}">
        <button type="button" class="appt-month-daynum" data-goto="${iso}">${day}</button>
        <div class="appt-month-chips">${chips}${more}</div>
      </div>`;
    }

    root.innerHTML = `
      <div class="appt-month-shell">
        <div class="appt-month-dow-row">${dow}</div>
        <div class="appt-month-grid">${cells}</div>
      </div>`;

    root.querySelectorAll('[data-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDetailModal(btn.dataset.id);
      });
    });
    root.querySelectorAll('[data-goto]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const d = parseDate(btn.dataset.goto);
        if (!d) return;
        state.selectedDate = d;
        state.viewDate = d;
        state.weekStart = startOfWeek(d);
        state.viewMode = 'day';
        syncViewTabs();
        refresh();
      });
    });
    root.querySelectorAll('.appt-month-cell[data-date]').forEach((cell) => {
      cell.addEventListener('dblclick', () => {
        openFormModal({ date: cell.dataset.date });
      });
    });
  }

  function renderCalendar(root) {
    if (!root) return;
    if (state.viewMode === 'month') renderMonth(root);
    else renderWeek(root);
  }

  function syncViewTabs() {
    document.querySelectorAll('.appt-view-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.view === state.viewMode);
    });
  }

  function openModal(title, bodyHtml, footerHtml, { wide = false } = {}) {
    const overlay = document.getElementById('appt-modal');
    overlay.hidden = false;
    overlay.innerHTML = `
      <div class="appt-modal-backdrop" data-close></div>
      <div class="appt-modal ${wide ? 'appt-modal-wide' : ''}" role="dialog" aria-modal="true">
        <div class="appt-modal-head">
          <h2>${Layout.escapeHtml(title)}</h2>
          <button type="button" class="appt-icon-btn" data-close aria-label="${t('close')}">×</button>
        </div>
        <div class="appt-modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="appt-modal-foot">${footerHtml}</div>` : ''}
      </div>`;
    overlay.querySelectorAll('[data-close]').forEach((el) => {
      el.addEventListener('click', closeModal);
    });
  }

  function closeModal() {
    const overlay = document.getElementById('appt-modal');
    overlay.hidden = true;
    overlay.innerHTML = '';
  }

  function roomOptions(branchId, selected) {
    const branch = state.branches.find((b) => String(b.id) === String(branchId));
    const rooms = Array.isArray(branch?.appointment_room) ? branch.appointment_room : [];
    if (!rooms.length) {
      return `<option value="">${t('appt.noRooms')}</option>`;
    }
    return (
      `<option value="">${t('appt.selectRoom')}</option>` +
      rooms
        .map((id) => {
          const sid = String(id);
          return `<option value="${Layout.escapeHtml(sid)}" ${String(selected) === sid ? 'selected' : ''}>${Layout.escapeHtml(t('appt.roomN', { id: sid }))}</option>`;
        })
        .join('')
    );
  }

  function productRowsHtml(selectedIds = []) {
    const selected = new Set((selectedIds || []).map(String));
    if (!state.products.length) {
      return `<p class="muted text-sm">${t('appt.noProducts')}</p>`;
    }
    return `<div class="appt-product-table">
      <div class="appt-product-head">
        <span></span>
        <span>${t('appt.productName')}</span>
        <span>${t('appt.productPrice')}</span>
      </div>
      ${state.products
        .map((p) => {
          const checked = selected.has(String(p.id)) ? 'checked' : '';
          return `<label class="appt-product-row">
            <input type="checkbox" name="product_ids" value="${Layout.escapeHtml(p.id)}" data-price="${p.price}" ${checked} />
            <span>${Layout.escapeHtml(p.name)}</span>
            <span>${UI.formatMoney(p.price, '')}</span>
          </label>`;
        })
        .join('')}
    </div>`;
  }

  function formHtml(values = {}, { isEdit = false } = {}) {
    const customer = (typeof Auth !== 'undefined' && Auth.getCustomer && Auth.getCustomer()) || {};
    const doctorPool = values.branch ? doctorsForBranch(values.branch) : state.doctors.length ? state.doctors : state.allDoctors;
    const doctorOptions = doctorPool.length
      ? doctorPool
          .map(
            (d) =>
              `<option value="${Layout.escapeHtml(d.id)}" ${String(values.doctor_id) === String(d.id) ? 'selected' : ''}>${Layout.escapeHtml(d.name)}</option>`
          )
          .join('')
      : `<option value="">${t('appt.noDoctors')}</option>`;

    const staffOptions = state.allDoctors.length
      ? state.allDoctors
          .map(
            (d) =>
              `<option value="${Layout.escapeHtml(d.id)}" ${String(values.therapist || values.staff_member_id) === String(d.id) ? 'selected' : ''}>${Layout.escapeHtml(d.name)}</option>`
          )
          .join('')
      : `<option value="">${t('appt.noDoctors')}</option>`;

    const typeOptions = state.types.length
      ? state.types
          .map(
            (tp) =>
              `<option value="${Layout.escapeHtml(tp.id)}" data-duration="${tp.time}" ${String(values.appointments_type_data_id) === String(tp.id) ? 'selected' : ''}>${Layout.escapeHtml(tp.name)}${tp.time ? ` (${t('appt.duration', { n: tp.time })})` : ''}</option>`
          )
          .join('')
      : `<option value="">${t('appt.noTypes')}</option>`;

    const date = values.date || toISO(state.selectedDate || state.viewDate);
    const start = values.start_time || '08:00';
    const end = values.end_time || minutesToTime(timeToMinutes(start) + (state.types[0]?.time || 30));
    const email = values.patient_email || customer.email || customer.customer_email || '';
    const phone = values.patient_phone || customer.phone || customer.mobile || '';
    const visitStatus = String(values.appo_type_status || values.visit_status || 'Normal');
    const statusChips = ['OPD', 'IPD', 'Normal', 'Emergency']
      .map((s) => {
        const cls = ['appt-status-chip', `is-${s.toLowerCase()}`, visitStatus === s ? 'active' : ''].filter(Boolean).join(' ');
        return `<button type="button" class="${cls}" data-visit-status="${s}">${t(`appt.status${s}`)}</button>`;
      })
      .join('');

    const branchMeta = values.branch
      ? state.branches.find((b) => String(b.id) === String(values.branch))?.name || values.branch
      : t('appt.selectBranch');

    return `<form id="appt-form" class="appt-form appt-form-full" data-edit="${isEdit ? '1' : '0'}">
      ${isEdit ? `<input type="hidden" name="id" value="${Layout.escapeHtml(values.id || '')}" />` : ''}
      <input type="hidden" name="appo_type_status" id="appt-visit-status" value="${Layout.escapeHtml(visitStatus)}" />
      <div class="appt-form-meta">
        <span>${t('appt.branch')}: <strong>${Layout.escapeHtml(String(branchMeta))}</strong></span>
        <span>${t('appt.type')}: <strong id="appt-meta-type">${Layout.escapeHtml(findType(values.appointments_type_data_id)?.name || '—')}</strong></span>
      </div>
      <div class="appt-form-grid appt-form-grid-3">
        <div class="appt-form-col">
          <div class="form-group"><label class="form-label">${t('appt.patient')}</label>
            <input class="form-control" name="patient_name" placeholder="${t('appt.patientPh')}" value="${Layout.escapeHtml(values.patient_name || '')}" /></div>
          <div class="form-group"><label class="form-label">${t('appt.companyId')}</label>
            <input class="form-control" name="patient_company_id" value="${Layout.escapeHtml(values.patient_company_id || '')}" /></div>
          <div class="form-group"><label class="form-label">${t('appt.insurance')}</label>
            ${insuranceFieldHtml(values.insurance || values.insurance_id || values.insurance_name || '')}</div>
          <div class="form-group"><label class="form-label">${t('appt.phone')}</label>
            <input class="form-control" name="patient_phone" value="${Layout.escapeHtml(phone)}" /></div>
          <div class="form-group"><label class="form-label">${t('appt.email')}</label>
            <input class="form-control" type="email" name="patient_email" value="${Layout.escapeHtml(email)}" /></div>
          <div class="form-row form-row-3">
            <div class="form-group"><label class="form-label">${t('appt.patientStatus')}</label>
              <input class="form-control" name="patient_status" value="${Layout.escapeHtml(values.patient_status || '1')}" /></div>
            <div class="form-group"><label class="form-label">${t('appt.gender')}</label>
              <select class="form-control" name="patient_gender">
                <option value="">${t('select')}</option>
                <option value="male" ${values.patient_gender === 'male' || values.patient_gender === '1' ? 'selected' : ''}>${t('appt.genderMale')}</option>
                <option value="female" ${values.patient_gender === 'female' || values.patient_gender === '2' ? 'selected' : ''}>${t('appt.genderFemale')}</option>
                <option value="other" ${values.patient_gender === 'other' ? 'selected' : ''}>${t('appt.genderOther')}</option>
              </select></div>
            <div class="form-group"><label class="form-label">${t('appt.age')}</label>
              <input class="form-control" type="number" min="0" name="patient_age" value="${Layout.escapeHtml(String(values.patient_age ?? '0'))}" /></div>
          </div>
          <div class="form-group"><label class="form-label">${t('appt.notes')}</label>
            <textarea class="form-control" name="notes" rows="4" placeholder="${t('appt.notesPh')}">${Layout.escapeHtml(values.notes || values.contact_info || '')}</textarea></div>
          <div class="form-group"><label class="form-label">${t('appt.staffMember')}</label>
            <select class="form-control" name="therapist">
              <option value="">${t('appt.selectDoctor')}</option>
              ${staffOptions}
            </select></div>
          <div class="form-group"><label class="form-label">${t('appt.kop')}</label>
            <input class="form-control" name="koph" value="${Layout.escapeHtml(values.koph || '')}" /></div>
        </div>

        <div class="appt-form-col">
          <div class="form-group"><label class="form-label">${t('appt.type')} *</label>
            <select class="form-control" name="appointments_type_data_id" id="appt-type-select" required>
              <option value="">${t('appt.selectType')}</option>
              ${typeOptions}
            </select></div>
          <div class="form-group"><label class="form-label">${t('appt.branch')}</label>
            <select class="form-control" name="branch" id="appt-form-branch">
              <option value="">${t('appt.selectBranch')}</option>
              ${state.branches
                .map(
                  (b) =>
                    `<option value="${Layout.escapeHtml(b.id)}" ${String(values.branch) === String(b.id) ? 'selected' : ''}>${Layout.escapeHtml(b.name)}</option>`
                )
                .join('')}
            </select></div>
          <div class="form-group"><label class="form-label">${t('appt.room')}</label>
            <select class="form-control" name="appointment_room_id" id="appt-form-room">
              ${roomOptions(values.branch, values.appointment_room_id)}
            </select></div>
          <div class="form-group"><label class="form-label">${t('appt.teamMember')} *</label>
            <select class="form-control" name="doctor_id" required>
              <option value="">${t('appt.selectDoctor')}</option>
              ${doctorOptions}
            </select></div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">${t('appt.caseNumber')}</label>
              <input class="form-control" name="case_number" value="${Layout.escapeHtml(values.case_number || '')}" /></div>
            <div class="form-group"><label class="form-label">${t('appt.balance')}</label>
              <input class="form-control" name="balance" value="${Layout.escapeHtml(values.balance || '')}" /></div>
          </div>
          <div class="form-group"><label class="form-label">${t('appt.date')} *</label>
            <input class="form-control" type="date" name="date" value="${Layout.escapeHtml(date)}" required /></div>
          <div class="form-group"><label class="form-label">${t('appt.referredBy')}</label>
            <input class="form-control" name="referred_by" value="${Layout.escapeHtml(values.referred_by || '')}" /></div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">${t('appt.startTime')} *</label>
              <select class="form-control" name="start_time" id="appt-start-time" required>${startTimeOptions(start)}</select></div>
            <div class="form-group"><label class="form-label">${t('appt.endTime')} *</label>
              <select class="form-control" name="end_time" id="appt-end-time" required>${endTimeOptions(end)}</select></div>
          </div>
          <div class="form-group"><label class="form-label">${t('appt.subject')}</label>
            <input class="form-control" name="subject" placeholder="${t('appt.subjectPh')}" value="${Layout.escapeHtml(values.subject || '')}" /></div>
          <div class="appt-status-row">${statusChips}</div>
          <div class="appt-check-row">
            <label class="appt-remind"><input type="checkbox" name="approved_by_customer" value="1" ${Number(values.approved_by_customer) === 1 ? 'checked' : ''} /> ${t('appt.approvedByCustomer')}</label>
            <label class="appt-remind"><input type="checkbox" name="series_of_appointment" value="1" ${Number(values.series_of_appointment) === 1 ? 'checked' : ''} /> ${t('appt.series')}</label>
            ${!isEdit ? `<label class="appt-remind"><input type="checkbox" name="remind_user" value="1" /> ${t('appt.remind')}</label>` : ''}
          </div>
        </div>

        <div class="appt-form-col appt-form-products">
          <div class="appt-section-title">${t('appt.productList')}</div>
          ${productRowsHtml(values.product_ids || [])}
          <div class="appt-totals">
            <div class="appt-total-row">
              <span>${t('appt.primaryTotal')}</span>
              <input class="form-control" name="primary_total" id="appt-primary-total" value="${Layout.escapeHtml(String(values.primary_total ?? 0))}" readonly />
            </div>
            <div class="appt-total-row">
              <span>${t('appt.total')}</span>
              <input class="form-control" name="total_product_price" id="appt-total" value="${Layout.escapeHtml(String(values.total_product_price ?? values.total ?? 0))}" readonly />
            </div>
          </div>
        </div>
      </div>
      <div id="appt-form-alert" hidden></div>
      <input type="hidden" name="coupon_id" id="appt-coupon-id" value="${Layout.escapeHtml(values.coupon_id || '')}" />
      <input type="hidden" name="coupon_ids" id="appt-coupon-ids" value="${Layout.escapeHtml(values.coupon_ids || '')}" />
      <input type="hidden" name="coupon_amount" id="appt-coupon-amount" value="${Layout.escapeHtml(String(values.coupon_amount ?? ''))}" />
      <input type="hidden" name="coupon_left_amount" id="appt-coupon-left" value="${Layout.escapeHtml(String(values.coupon_left_amount ?? ''))}" />
    </form>`;
  }

  function historyListsHtml() {
    const today = toISO(new Date());
    const previous = (state.appointments || [])
      .filter((a) => {
        const d = String(a.date || '').slice(0, 10);
        return d && d < today;
      })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 25);

    const remaining = (state.coupons || []).filter((c) => Number(c.left) > 0);
    const future = (state.appointments || [])
      .filter((a) => {
        const d = String(a.date || '').slice(0, 10);
        return d && d >= today;
      })
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .slice(0, 25);

    const prevRows = previous.length
      ? previous
          .map((a) => {
            const d = parseDate(a.date);
            const dayName = d ? d.toLocaleDateString(undefined, { weekday: 'long' }) : '';
            const dateLabel = d
              ? d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
              : String(a.date || '');
            const note = pickText(a, ['notes', 'contact_info', 'patient_phone', 'phone']) || '';
            const typeName =
              findType(a.appointments_type_data_id || a.appointments_type_id)?.name ||
              a.appointment_type_name ||
              a.type_name ||
              '—';
            return `<tr>
              <td>${Layout.escapeHtml(dateLabel)}</td>
              <td>${Layout.escapeHtml(dayName)}</td>
              <td>${Layout.escapeHtml(note)}</td>
              <td>${Layout.escapeHtml(String(typeName))}</td>
            </tr>`;
          })
          .join('')
      : `<tr><td colspan="4" class="appt-hist-empty">${Layout.escapeHtml(t('appt.noResults'))}</td></tr>`;

    const remRows = remaining.length
      ? remaining
          .map(
            (c) => `<tr>
              <td>${Layout.escapeHtml(String(c.code || c.id))}</td>
              <td>${Layout.escapeHtml(String(c.insurance || '—'))}</td>
              <td>${Layout.escapeHtml(String(c.type || '—'))}</td>
            </tr>`
          )
          .join('')
      : future.length
        ? future
            .map((a) => {
              const typeName =
                findType(a.appointments_type_data_id || a.appointments_type_id)?.name ||
                a.appointment_type_name ||
                a.type_name ||
                '—';
              const doctor =
                state.allDoctors.find((d) => String(d.id) === String(a.doctor_id || a.team_member_id))?.name ||
                a.doctor_name ||
                '—';
              return `<tr>
                <td>${Layout.escapeHtml(String(a.date || '').slice(0, 10))}</td>
                <td>${Layout.escapeHtml(String(doctor))}</td>
                <td>${Layout.escapeHtml(String(typeName))}</td>
              </tr>`;
            })
            .join('')
        : `<tr><td colspan="3" class="appt-hist-empty is-error">${Layout.escapeHtml(t('appt.noResults'))}</td></tr>`;

    return `<div class="appt-hist-grid">
      <section class="appt-hist-panel">
        <h3 class="appt-hist-title">${t('appt.previousAppointments')}</h3>
        <div class="appt-hist-scroll appt-hist-scroll-lg">
          <table class="appt-hist-table">
            <thead><tr>
              <th>${t('appt.histDate')}</th>
              <th>${t('appt.histDay')}</th>
              <th>${t('appt.histNote')}</th>
              <th>${t('appt.histLinkedCare')}</th>
            </tr></thead>
            <tbody>${prevRows}</tbody>
          </table>
        </div>
      </section>
      <section class="appt-hist-panel">
        <h3 class="appt-hist-title">${t('appt.remainingAppointments')}</h3>
        <div class="appt-hist-scroll appt-hist-scroll-lg">
          <table class="appt-hist-table">
            <thead><tr>
              <th>${t('appt.histGroup')}</th>
              <th>${t('appt.histSeller')}</th>
              <th>${t('appt.type')}</th>
            </tr></thead>
            <tbody>${remRows}</tbody>
          </table>
        </div>
      </section>
    </div>`;
  }

  async function ensureHistoryData() {
    try {
      const res = await API.appointmentsList({ limit: 25 });
      const rows = UI.listRows(res);
      if (rows.length) {
        const byId = new Map((state.appointments || []).map((a) => [String(a.id), a]));
        rows.forEach((a) => byId.set(String(a.id), a));
        state.appointments = [...byId.values()];
      }
    } catch {
      /* keep existing */
    }
    await refreshCoupons().catch(() => []);
  }

  async function openAppointmentHistoryModal() {
    openModal(
      t('appt.viewDetail'),
      `<div class="loading-block"><div class="spinner"></div><span>${t('loading')}</span></div>`,
      `<button type="button" class="btn btn-secondary" data-close>${t('close')}</button>`,
      { wide: true }
    );
    await ensureHistoryData();
    const name = customerDisplayName();
    openModal(
      t('appt.detailFor', { name }),
      `<div class="appt-detail-history">
         <div class="appt-detail-patient">
           <span class="form-label">${t('appt.patient')}</span>
           <strong>${Layout.escapeHtml(name)}</strong>
         </div>
         ${historyListsHtml()}
       </div>`,
      `<button type="button" class="btn btn-secondary" data-close>${t('close')}</button>`,
      { wide: true }
    );
  }

  function bindFormDuration({ syncNow = true } = {}) {
    const typeSelect = document.getElementById('appt-type-select');
    const startSelect = document.getElementById('appt-start-time');
    const endSelect = document.getElementById('appt-end-time');
    if (!typeSelect || !startSelect || !endSelect) return;

    const syncEnd = () => setEndFromDuration(startSelect, endSelect, typeSelect);

    typeSelect.addEventListener('change', syncEnd);
    startSelect.addEventListener('change', syncEnd);
    if (syncNow) syncEnd();
  }

  async function openFormModal(prefill = {}, { isEdit = false } = {}) {
    await ensureHistoryData();

    const customer = (typeof Auth !== 'undefined' && Auth.getCustomer && Auth.getCustomer()) || {};
    const custName = customerDisplayName();
    const values = {
      doctor_id: prefill.doctor_id || (state.filterDoctor !== 'all' ? state.filterDoctor : state.doctors[0]?.id || ''),
      appointments_type_data_id: prefill.appointments_type_data_id || state.types[0]?.id || '',
      start_time: prefill.start_time || prefill.start || '08:00',
      end_time: prefill.end_time || prefill.end,
      date: prefill.date || toISO(state.selectedDate || state.viewDate),
      patient_name: isEdit ? prefill.patient_name || custName : custName,
      subject: isEdit ? prefill.subject || '' : '',
      notes: isEdit ? prefill.notes || prefill.contact_info || '' : '',
      branch:
        prefill.branch ||
        prefill.branch_id ||
        (state.filterBranch !== 'all' ? state.filterBranch : state.branches[0]?.id || ''),
      appointment_room_id: prefill.appointment_room_id || '',
      patient_email: prefill.patient_email || customer.email || '',
      patient_phone: prefill.patient_phone || customer.phone || customer.mobile || '',
      patient_company_id: prefill.patient_company_id || '',
      patient_gender: prefill.patient_gender || '',
      patient_age: prefill.patient_age ?? 0,
      patient_status: prefill.patient_status || '1',
      insurance: prefill.insurance || prefill.insurance_id || prefill.insurance_name || '',
      koph: prefill.koph || '',
      therapist: prefill.therapist || '',
      case_number: prefill.case_number || '',
      balance: prefill.balance || '',
      referred_by: prefill.referred_by || '',
      appo_type_status: prefill.appo_type_status || prefill.visit_status || 'Normal',
      approved_by_customer: prefill.approved_by_customer || 0,
      series_of_appointment: prefill.series_of_appointment || 0,
      product_ids: Array.isArray(prefill.product_ids)
        ? prefill.product_ids
        : typeof prefill.product_ids === 'string'
          ? (() => { try { return JSON.parse(prefill.product_ids); } catch { return []; } })()
          : [],
      primary_total: prefill.primary_total ?? 0,
      total_product_price: prefill.total_product_price ?? prefill.total ?? 0,
      coupon_id: prefill.coupon_id || '',
      coupon_ids: prefill.coupon_ids || '',
      coupon_amount: prefill.coupon_amount ?? '',
      coupon_left_amount: prefill.coupon_left_amount ?? '',
      id: prefill.id || '',
    };

    if (!isEdit || !values.end_time) {
      const dur = findType(values.appointments_type_data_id)?.time || 30;
      values.end_time = minutesToTime(timeToMinutes(values.start_time) + dur);
    }

    openModal(
      isEdit ? t('appt.edit') : t('appt.newTitle'),
      formHtml(values, { isEdit }),
      isEdit
        ? `<button type="button" class="btn btn-ghost appt-btn-cancel" id="appt-btn-delete">${t('appt.cancelMeeting')}</button>
           <button type="button" class="btn btn-secondary" id="appt-apply-coupon">${t('appt.applyCoupon')}</button>
           <button type="submit" form="appt-form" class="btn btn-primary appt-btn-save">${t('save')}</button>`
        : `<button type="button" class="btn btn-ghost" data-close>${t('cancel')}</button>
           <button type="button" class="btn btn-secondary" id="appt-apply-coupon">${t('appt.applyCoupon')}</button>
           <button type="submit" form="appt-form" class="btn btn-primary appt-btn-save">${t('save')}</button>`,
      { wide: true }
    );

    bindFormDuration({ syncNow: true });
    bindFormExtras();
    document.getElementById('appt-form')?.addEventListener('submit', (e) => saveAppointment(e, { isEdit }));
    document.getElementById('appt-btn-delete')?.addEventListener('click', () => deleteAppointment(values.id));
    document.getElementById('appt-apply-coupon')?.addEventListener('click', openCouponListModal);
  }

  function customerDisplayName() {
    const customer = (typeof Auth !== 'undefined' && Auth.getCustomer && Auth.getCustomer()) || {};
    return (
      customer.name ||
      customer.customer_name ||
      customer.full_name ||
      [customer.first_name, customer.last_name].filter(Boolean).join(' ') ||
      t('appt.patient')
    );
  }

  function customerId() {
    const customer = (typeof Auth !== 'undefined' && Auth.getCustomer && Auth.getCustomer()) || {};
    return String(customer.c_id || customer.customer_id || customer.id || '');
  }

  function insuranceFieldHtml(selected) {
    const current = String(selected || '');
    if (!state.insuranceCompanies.length) {
      return `<select class="form-control" name="insurance" id="appt-insurance" disabled>
        <option value="">${t('appt.noInsurance')}</option>
      </select>`;
    }
    const matched = state.insuranceCompanies.find(
      (c) => String(c.id) === current || String(c.name).toLowerCase() === current.toLowerCase()
    );
    const options = state.insuranceCompanies
      .map(
        (c) =>
          `<option value="${Layout.escapeHtml(c.id)}" ${matched && String(matched.id) === String(c.id) ? 'selected' : ''}>${Layout.escapeHtml(c.name)}</option>`
      )
      .join('');
    return `<select class="form-control" name="insurance" id="appt-insurance">
      <option value="">${t('appt.selectInsurance')}</option>
      ${options}
    </select>`;
  }

  function openCouponOverlay(title, bodyHtml, footerHtml, { wide = true } = {}) {
    const overlay = document.getElementById('appt-coupon-modal');
    if (!overlay) return;
    overlay.hidden = false;
    overlay.innerHTML = `
      <div class="appt-modal-backdrop" data-coupon-close></div>
      <div class="appt-modal ${wide ? 'appt-modal-wide' : ''} appt-coupon-dialog" role="dialog" aria-modal="true">
        <div class="appt-modal-head">
          <h2>${Layout.escapeHtml(title)}</h2>
          <button type="button" class="appt-icon-btn" data-coupon-close aria-label="${t('close')}">×</button>
        </div>
        <div class="appt-modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="appt-modal-foot">${footerHtml}</div>` : ''}
      </div>`;
    overlay.querySelectorAll('[data-coupon-close]').forEach((el) => {
      el.addEventListener('click', closeCouponOverlay);
    });
  }

  function closeCouponOverlay() {
    const overlay = document.getElementById('appt-coupon-modal');
    if (!overlay) return;
    overlay.hidden = true;
    overlay.innerHTML = '';
  }

  async function openCouponListModal() {
    openCouponOverlay(
      t('appt.couponListTitle', { name: customerDisplayName() }),
      `<div class="loading-block"><div class="spinner"></div><span>${t('loading')}</span></div>`,
      `<button type="button" class="btn btn-ghost" data-coupon-close>${t('close')}</button>`
    );
    try {
      await refreshCoupons();
    } catch {
      /* keep previous */
    }
    renderCouponListModal();
  }

  function renderCouponListModal() {
    const selected = new Set(state.selectedCouponIds.map(String));
    const rows = state.coupons.length
      ? state.coupons
          .map((c) => {
            const checked = selected.has(String(c.id)) ? 'checked' : '';
            const statusChecked = String(c.status).toLowerCase() === 'used' || c.status === '1' ? 'checked' : '';
            const dateLabel = formatCouponDate(c.date);
            return `<tr data-coupon-row="${Layout.escapeHtml(c.id)}">
              <td>${Layout.escapeHtml(String(c.code || c.id))}</td>
              <td>${Layout.escapeHtml(String(c.type || '—'))}</td>
              <td>${Layout.escapeHtml(String(c.amount ?? 0))}</td>
              <td>${Layout.escapeHtml(String(c.left ?? 0))}</td>
              <td>${Layout.escapeHtml(String(c.insurance || '—'))}</td>
              <td>${Layout.escapeHtml(String(c.notes || ''))}</td>
              <td class="appt-coupon-status"><input type="checkbox" disabled ${statusChecked} aria-label="${t('appt.status')}" /></td>
              <td>${Layout.escapeHtml(dateLabel)}</td>
              <td>${c.watch ? `<a href="${Layout.escapeHtml(String(c.watch))}" target="_blank" rel="noopener">PDF</a>` : '—'}</td>
              <td class="appt-coupon-actions">
                <label class="appt-coupon-pick"><input type="checkbox" data-pick-coupon="${Layout.escapeHtml(c.id)}" ${checked} ${c.canApply === false ? 'disabled' : ''} /> ${t('appt.select')}</label>
                <button type="button" class="appt-icon-btn" data-edit-coupon="${Layout.escapeHtml(c.id)}" title="${t('edit')}">✎</button>
                <button type="button" class="appt-icon-btn is-danger" data-delete-coupon="${Layout.escapeHtml(c.id)}" title="${t('delete')}">🗑</button>
              </td>
            </tr>`;
          })
          .join('')
      : `<tr><td colspan="10" class="appt-hist-empty">${Layout.escapeHtml(t('appt.noCoupons'))}</td></tr>`;

    openCouponOverlay(
      t('appt.couponListTitle', { name: customerDisplayName() }),
      `<div class="appt-coupon-toolbar">
         <button type="button" class="btn btn-sm appt-add-coupons-btn" id="appt-add-coupons">${t('appt.addCoupons')}</button>
       </div>
       <div class="appt-coupon-table-wrap">
         <table class="appt-coupon-table">
           <thead>
             <tr>
               <th>${t('appt.couponCode')}</th>
               <th>${t('appt.type')}</th>
               <th>${t('appt.amount')}</th>
               <th>${t('appt.leftAmount')}</th>
               <th>${t('appt.insurance')}</th>
               <th>${t('appt.notes')}</th>
               <th>${t('appt.status')}</th>
               <th>${t('appt.histDate')}</th>
               <th>${t('appt.watch')}</th>
               <th>${t('appt.action')}</th>
             </tr>
           </thead>
           <tbody>${rows}</tbody>
         </table>
       </div>`,
      `<button type="button" class="btn btn-ghost" data-coupon-close>${t('cancel')}</button>
       <button type="button" class="btn btn-primary" id="appt-coupon-apply-btn">${t('appt.applyCoupon')}</button>`
    );

    document.getElementById('appt-add-coupons')?.addEventListener('click', () => openCouponEditForm());
    document.getElementById('appt-coupon-apply-btn')?.addEventListener('click', applySelectedCoupons);
    document.querySelectorAll('[data-pick-coupon]').forEach((el) => {
      el.addEventListener('change', () => {
        const id = String(el.dataset.pickCoupon || '');
        if (el.checked) {
          if (!state.selectedCouponIds.includes(id)) state.selectedCouponIds.push(id);
        } else {
          state.selectedCouponIds = state.selectedCouponIds.filter((x) => String(x) !== id);
        }
      });
    });
    document.querySelectorAll('[data-edit-coupon]').forEach((el) => {
      el.addEventListener('click', () => openCouponEditForm(el.dataset.editCoupon));
    });
    document.querySelectorAll('[data-delete-coupon]').forEach((el) => {
      el.addEventListener('click', () => deleteCoupon(el.dataset.deleteCoupon));
    });
  }

  function formatCouponDate(value) {
    if (!value) return '—';
    const d = parseDate(value);
    if (!d) return String(value);
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
  }

  async function openCouponEditForm(couponId = '') {
    let values = {
      coupon_id: '',
      customer_name: customerDisplayName(),
      customer_id: customerId(),
      insurance: '',
      appointment_type_id: state.types[0]?.id || '',
      coupon_code: '',
      notes: '',
      amount: 0,
      left_amount: 0,
      coupon_date: toISO(new Date()),
      order_id: '',
    };

    if (couponId) {
      try {
        const res = await API.appointmentCouponGet(couponId);
        const data = res.data || res;
        if (String(res.success) === '0' || res.success === 0) {
          throw new Error(res.message || res.error || t('appt.couldNotLoadCoupon'));
        }
        values = {
          ...values,
          coupon_id: String(data.id || couponId),
          customer_name: data.customer_name || values.customer_name,
          customer_id: String(data.customer_id || values.customer_id),
          insurance: String(data.insurance || data.insurance_id || ''),
          appointment_type_id: String(data.appointment_type_id || ''),
          coupon_code: data.coupon_code || '',
          notes: data.notes || data.coupon_note || '',
          amount: data.amount ?? 0,
          left_amount: data.left_amount ?? 0,
          coupon_date: String(data.coupon_date || data.date || '').slice(0, 10) || values.coupon_date,
          order_id: data.order_id || '',
        };
      } catch (err) {
        const local = state.coupons.find((c) => String(c.id) === String(couponId));
        if (!local) {
          Toast.error(err.message || t('appt.couldNotLoadCoupon'));
          return;
        }
        values = {
          ...values,
          coupon_id: local.id,
          insurance: local.insuranceId || '',
          appointment_type_id: local.typeId || '',
          coupon_code: local.code || '',
          notes: local.notes || '',
          amount: local.amount ?? 0,
          left_amount: local.left ?? 0,
          coupon_date: String(local.date || '').slice(0, 10) || values.coupon_date,
          order_id: local.orderId || '',
        };
      }
    }

    const insuranceOpts = state.insuranceCompanies.length
      ? state.insuranceCompanies
          .map(
            (c) =>
              `<option value="${Layout.escapeHtml(c.id)}" ${String(values.insurance) === String(c.id) ? 'selected' : ''}>${Layout.escapeHtml(c.name)}</option>`
          )
          .join('')
      : '';
    const typeOpts = state.types
      .map(
        (tp) =>
          `<option value="${Layout.escapeHtml(tp.id)}" ${String(values.appointment_type_id) === String(tp.id) ? 'selected' : ''}>${Layout.escapeHtml(tp.name)}</option>`
      )
      .join('');

    openCouponOverlay(
      values.coupon_id ? t('appt.editCoupon') : t('appt.addCoupon'),
      `<form id="appt-coupon-form" class="appt-coupon-form">
        ${values.coupon_id ? `<input type="hidden" name="coupon_id" value="${Layout.escapeHtml(values.coupon_id)}" />` : ''}
        <input type="hidden" name="customer_id" value="${Layout.escapeHtml(values.customer_id)}" />
        <div class="appt-coupon-form-grid">
          <div class="form-group">
            <label class="form-label">${t('appt.customer')}</label>
            <input class="form-control" value="${Layout.escapeHtml(values.customer_name)}" readonly />
          </div>
          <div class="form-group">
            <label class="form-label">${t('appt.type')}</label>
            <select class="form-control" name="appointment_type_id" id="coupon-type" required>
              <option value="">${t('appt.selectType')}</option>
              ${typeOpts}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${t('appt.insuranceCompany')}</label>
            <select class="form-control" name="insurance" id="coupon-insurance">
              <option value="">${t('appt.selectInsurance')}</option>
              ${insuranceOpts}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${t('appt.notes')}</label>
            <input class="form-control" name="notes" placeholder="${t('appt.notes')}" value="${Layout.escapeHtml(values.notes)}" />
          </div>
          <div class="form-group">
            <label class="form-label">${t('appt.couponCode')}</label>
            <input class="form-control" name="coupon_code" placeholder="${t('appt.couponCode')}" value="${Layout.escapeHtml(String(values.coupon_code))}" required />
          </div>
          <div class="form-group">
            <label class="form-label">${t('appt.leftAmount')}</label>
            <input class="form-control" name="left_amount" id="coupon-left-amount" type="number" step="any" value="${Layout.escapeHtml(String(values.left_amount ?? 0))}" />
          </div>
          <div class="form-group">
            <label class="form-label">${t('appt.amount')}</label>
            <input class="form-control" name="amount" id="coupon-amount" type="number" step="any" value="${Layout.escapeHtml(String(values.amount ?? 0))}" />
          </div>
          <div class="form-group">
            <label class="form-label">${t('appt.orderId')}</label>
            <input class="form-control" name="order_id" placeholder="${t('appt.orderId')}" value="${Layout.escapeHtml(String(values.order_id || ''))}" />
          </div>
          <div class="form-group">
            <label class="form-label">${t('appt.histDate')}</label>
            <input class="form-control" name="coupon_date" type="date" value="${Layout.escapeHtml(values.coupon_date)}" />
          </div>
        </div>
        <div id="appt-coupon-form-alert" hidden></div>
      </form>`,
      `<button type="button" class="btn btn-ghost" id="appt-coupon-back">${t('back')}</button>
       <button type="submit" form="appt-coupon-form" class="btn btn-primary">${t('submit')}</button>`
    );

    document.getElementById('appt-coupon-back')?.addEventListener('click', () => renderCouponListModal());
    document.getElementById('appt-coupon-form')?.addEventListener('submit', saveCouponForm);
    document.getElementById('coupon-type')?.addEventListener('change', syncCouponInsuranceAmount);
    document.getElementById('coupon-insurance')?.addEventListener('change', syncCouponInsuranceAmount);
    if (values.appointment_type_id && values.insurance) syncCouponInsuranceAmount();
  }

  async function syncCouponInsuranceAmount() {
    const typeId = document.getElementById('coupon-type')?.value;
    const insuranceId = document.getElementById('coupon-insurance')?.value;
    if (!typeId || !insuranceId) return;
    try {
      const res = await API.appointmentsInsuranceAmount({
        appointment_type_id: typeId,
        insurance: insuranceId,
      });
      if (String(res.success) === '0' || res.success === 0) return;
      const amountEl = document.getElementById('coupon-amount');
      const leftEl = document.getElementById('coupon-left-amount');
      if (amountEl && res.amount != null) amountEl.value = String(res.amount);
      if (leftEl && res.left_amount != null) leftEl.value = String(res.left_amount);
    } catch {
      /* optional helper */
    }
  }

  async function saveCouponForm(e) {
    e.preventDefault();
    const form = e.target;
    const alert = document.getElementById('appt-coupon-form-alert');
    const fd = new FormData(form);
    const body = {
      customer_id: String(fd.get('customer_id') || customerId()),
      coupon_code: String(fd.get('coupon_code') || '').trim(),
      appointment_type_id: String(fd.get('appointment_type_id') || '').trim(),
      insurance: String(fd.get('insurance') || '').trim(),
      amount: String(fd.get('amount') || '0'),
      left_amount: String(fd.get('left_amount') || '0'),
      notes: String(fd.get('notes') || '').trim(),
      coupon_date: String(fd.get('coupon_date') || '').trim(),
      order_id: String(fd.get('order_id') || '').trim(),
    };
    const couponId = String(fd.get('coupon_id') || '').trim();

    if (!body.coupon_code || !body.appointment_type_id || !body.customer_id) {
      if (alert) {
        alert.hidden = false;
        alert.className = 'alert alert-error';
        alert.textContent = t('appt.couponRequired');
      }
      return;
    }

    try {
      let res;
      if (couponId) {
        res = await API.appointmentCouponEdit({ ...body, coupon_id: couponId, id: couponId });
      } else {
        res = await API.appointmentCouponAdd(body);
      }
      if (String(res.success) === '0' || res.success === 0) {
        throw new Error(res.message || res.error || t('appt.couldNotSaveCoupon'));
      }
      Toast.success(couponId ? t('appt.couponUpdated') : t('appt.couponAdded'));
      await refreshCoupons();
      renderCouponListModal();
    } catch (err) {
      if (alert) {
        alert.hidden = false;
        alert.className = 'alert alert-error';
        alert.textContent = err.message || t('appt.couldNotSaveCoupon');
      } else {
        Toast.error(err.message || t('appt.couldNotSaveCoupon'));
      }
    }
  }

  async function deleteCoupon(id) {
    if (!id || !window.confirm(t('appt.confirmDeleteCoupon'))) return;
    try {
      const res = await API.appointmentCouponDelete(id);
      if (String(res.success) === '0' || res.success === 0) {
        throw new Error(res.message || res.error || t('appt.couldNotDeleteCoupon'));
      }
      state.selectedCouponIds = state.selectedCouponIds.filter((x) => String(x) !== String(id));
      Toast.success(t('appt.couponDeleted'));
      await refreshCoupons();
      renderCouponListModal();
    } catch (err) {
      Toast.error(err.message || t('appt.couldNotDeleteCoupon'));
    }
  }

  async function applySelectedCoupons() {
    const ids = state.selectedCouponIds.filter(Boolean);
    if (!ids.length) {
      Toast.info(t('appt.selectCouponFirst'));
      return;
    }
    try {
      const res = await API.appointmentsApplyCoupon(ids);
      if (String(res.success) === '0' || res.success === 0) {
        throw new Error(res.message || res.error || t('appt.couldNotApplyCoupon'));
      }
      applyCouponResultToForm(ids, res);
      closeCouponOverlay();
      Toast.success(t('appt.couponApplied'));
    } catch (err) {
      Toast.error(err.message || t('appt.couldNotApplyCoupon'));
    }
  }

  function applyCouponResultToForm(ids, res) {
    const form = document.getElementById('appt-form');
    if (!form) return;

    const setVal = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value == null ? '' : String(value);
    };
    setVal('appt-coupon-id', ids[0] || '');
    setVal('appt-coupon-ids', ids.join(','));
    setVal('appt-coupon-amount', res.amount ?? '');
    setVal('appt-coupon-left', res.left_amount ?? '');

    const first = state.coupons.find((c) => String(c.id) === String(ids[0]));
    if (first?.insuranceId) {
      const insurance = form.querySelector('[name="insurance"]');
      if (insurance) insurance.value = first.insuranceId;
    }
    if (first?.typeId) {
      const typeSelect = form.querySelector('[name="appointments_type_data_id"]');
      if (typeSelect && !typeSelect.value) typeSelect.value = first.typeId;
    }

    const balance = form.querySelector('[name="balance"]');
    if (balance && res.left_amount != null) balance.value = String(res.left_amount);

    const primary = document.getElementById('appt-primary-total');
    const total = document.getElementById('appt-total');
    if (primary && res.amount != null) primary.value = String(res.amount);
    if (total && res.left_amount != null) total.value = String(res.left_amount);

    const notes = form.querySelector('[name="notes"]');
    if (notes) {
      const tag = `Coupon: ${ids.join(', ')}`;
      if (!String(notes.value).includes(tag)) {
        notes.value = [notes.value, tag].filter(Boolean).join('\n');
      }
    }

    state.appliedCoupon = { ids, amount: res.amount, left_amount: res.left_amount };
  }

  async function syncFormInsuranceAmount() {
    const typeId = document.getElementById('appt-type-select')?.value;
    const insuranceId = document.getElementById('appt-insurance')?.value;
    if (!typeId || !insuranceId) return;
    try {
      const res = await API.appointmentsInsuranceAmount({
        appointment_type_id: typeId,
        insurance: insuranceId,
      });
      if (String(res.success) === '0' || res.success === 0) return;
      const balance = document.querySelector('#appt-form [name="balance"]');
      if (balance && res.left_amount != null) balance.value = String(res.left_amount);
      const primary = document.getElementById('appt-primary-total');
      const total = document.getElementById('appt-total');
      if (primary && res.amount != null && !document.getElementById('appt-coupon-id')?.value) {
        primary.value = String(res.amount);
      }
      if (total && res.left_amount != null && !document.getElementById('appt-coupon-id')?.value) {
        total.value = String(res.left_amount);
      }
    } catch {
      /* optional */
    }
  }

  function bindFormExtras() {
    const form = document.getElementById('appt-form');
    if (!form) return;

    const syncTotals = () => {
      let total = 0;
      form.querySelectorAll('input[name="product_ids"]:checked').forEach((el) => {
        total += Number(el.dataset.price) || 0;
      });
      const primary = document.getElementById('appt-primary-total');
      const grand = document.getElementById('appt-total');
      if (primary) primary.value = String(total);
      if (grand) grand.value = String(total);
    };

    form.querySelectorAll('input[name="product_ids"]').forEach((el) => {
      el.addEventListener('change', syncTotals);
    });
    syncTotals();

    form.querySelectorAll('[data-visit-status]').forEach((btn) => {
      btn.addEventListener('click', () => {
        form.querySelectorAll('[data-visit-status]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const hidden = document.getElementById('appt-visit-status');
        if (hidden) hidden.value = btn.dataset.visitStatus || 'Normal';
      });
    });

    const typeSelect = document.getElementById('appt-type-select');
    typeSelect?.addEventListener('change', () => {
      const meta = document.getElementById('appt-meta-type');
      if (meta) meta.textContent = typeSelect.selectedOptions[0]?.textContent?.split(' (')[0] || '—';
    });

    document.getElementById('appt-form-branch')?.addEventListener('change', (e) => {
      const branchId = e.target.value;
      const doctorSelect = form.querySelector('[name="doctor_id"]');
      const roomSelect = document.getElementById('appt-form-room');
      if (doctorSelect) {
        const pool = branchId ? doctorsForBranch(branchId) : state.allDoctors;
        const prev = doctorSelect.value;
        doctorSelect.innerHTML =
          `<option value="">${t('appt.selectDoctor')}</option>` +
          pool.map((d) => `<option value="${Layout.escapeHtml(d.id)}">${Layout.escapeHtml(d.name)}</option>`).join('');
        doctorSelect.value = pool.some((d) => String(d.id) === String(prev)) ? prev : pool[0]?.id || '';
      }
      if (roomSelect) roomSelect.innerHTML = roomOptions(branchId, '');
      const metaBranch = form.querySelector('.appt-form-meta strong');
      const branch = state.branches.find((b) => String(b.id) === String(branchId));
      if (metaBranch) metaBranch.textContent = branch?.name || t('appt.selectBranch');
    });

    document.getElementById('appt-insurance')?.addEventListener('change', syncFormInsuranceAmount);
    document.getElementById('appt-type-select')?.addEventListener('change', syncFormInsuranceAmount);
  }

  function openNewModal(prefill = {}) {
    openFormModal(prefill, { isEdit: false });
  }

  function subjectOf(a) {
    return pickText(a, ['subject', 'title', 'appointment_subject', 'meeting_subject', 'description']) || '';
  }

  function pickText(obj, keys) {
    for (const key of keys) {
      const val = obj?.[key];
      if (val == null || val === '') continue;
      const s = String(val).trim();
      if (s && s !== '—' && s.toLowerCase() !== 'null') return s;
    }
    return '';
  }

  async function openDetailModal(id) {
    openModal(t('appt.details'), '<div class="spinner"></div>', '');
    try {
      const res = await API.appointmentGet(id);
      const a = res.data || res;
      const subject = subjectOf(a);
      const body = `
        <div class="appt-detail-grid">
          <div><span class="form-label">${t('appt.patient')}</span><strong>${Layout.escapeHtml(a.patient_name || '—')}</strong></div>
          <div><span class="form-label">${t('appt.subject')}</span><strong>${Layout.escapeHtml(subject || '—')}</strong></div>
          <div><span class="form-label">${t('appt.doctor')}</span><strong>${Layout.escapeHtml(doctorName(a))}</strong></div>
          <div><span class="form-label">${t('appt.type')}</span><strong>${Layout.escapeHtml(appointmentType(a))}</strong></div>
          <div><span class="form-label">${t('appt.date')}</span><strong>${UI.formatDateOnly(a.date)}</strong></div>
          <div><span class="form-label">${t('appt.time')}</span><strong>${Layout.escapeHtml(a.start_time || '—')} – ${Layout.escapeHtml(a.end_time || '—')}</strong></div>
          ${a.patient_email ? `<div><span class="form-label">${t('appt.email')}</span><strong>${Layout.escapeHtml(a.patient_email)}</strong></div>` : ''}
          ${a.patient_phone ? `<div><span class="form-label">${t('appt.phone')}</span><strong>${Layout.escapeHtml(a.patient_phone)}</strong></div>` : ''}
          ${a.total_product_price != null && a.total_product_price !== '' ? `<div><span class="form-label">${t('appt.total')}</span><strong>${Layout.escapeHtml(String(a.total_product_price))}</strong></div>` : ''}
          ${a.notes || a.contact_info || a.note ? `<div class="appt-detail-full"><span class="form-label">${t('appt.notes')}</span><p>${Layout.escapeHtml(a.notes || a.contact_info || a.note)}</p></div>` : ''}
        </div>`;
      openModal(
        t('appt.details'),
        body,
        `<button type="button" class="btn btn-ghost" id="appt-btn-delete-detail">${t('appt.cancelMeeting')}</button>
         <button type="button" class="btn btn-secondary" id="appt-btn-edit">${t('edit')}</button>
         <button type="button" class="btn btn-primary" data-close>${t('close')}</button>`
      );
      document.getElementById('appt-btn-edit')?.addEventListener('click', () => {
        openFormModal(
          {
            id: a.id || id,
            doctor_id: doctorIdOf(a),
            appointments_type_data_id: typeIdOf(a) || state.types.find((tp) => tp.name === appointmentType(a))?.id,
            start_time: a.start_time,
            end_time: a.end_time,
            date: String(a.date || '').slice(0, 10),
            patient_name: a.patient_name || '',
            patient_email: a.patient_email || '',
            patient_phone: a.patient_phone || '',
            patient_company_id: a.patient_company_id || '',
            patient_gender: a.patient_gender || '',
            patient_age: a.patient_age ?? 0,
            patient_status: a.patient_status || '1',
            koph: a.koph || '',
            therapist: a.therapist || '',
            subject: subjectOf(a),
            notes: a.notes || a.contact_info || '',
            branch: a.branch || a.branch_id || '',
            appointment_room_id: a.appointment_room_id || '',
            appo_type_status: a.appo_type_status || 'Normal',
            approved_by_customer: a.approved_by_customer || 0,
            series_of_appointment: a.series_of_appointment || 0,
            product_ids: a.product_ids,
            primary_total: a.primary_total,
            total_product_price: a.total_product_price,
          },
          { isEdit: true }
        );
      });
      document.getElementById('appt-btn-delete-detail')?.addEventListener('click', () => deleteAppointment(a.id || id));
    } catch (err) {
      openModal(
        t('appt.details'),
        `<div class="alert alert-error">${Layout.escapeHtml(err.message)}</div>`,
        `<button type="button" class="btn btn-secondary" data-close>${t('close')}</button>`
      );
    }
  }

  function collectFormBody(form) {
    const fd = new FormData(form);
    const doctorId = String(fd.get('doctor_id') || '').trim();
    const typeId = String(fd.get('appointments_type_data_id') || '').trim();
    const body = {
      doctor_id: doctorId,
      appointments_type_id: typeId,
      appointments_type_data_id: typeId,
      start_time: String(fd.get('start_time') || '').trim(),
      end_time: String(fd.get('end_time') || '').trim(),
      date: String(fd.get('date') || '').trim(),
    };
    const patient = String(fd.get('patient_name') || '').trim() || customerDisplayName();
    const subject = String(fd.get('subject') || '').trim();
    const userNotes = String(fd.get('notes') || '').trim();
    const branch = String(fd.get('branch') || '').trim();
    const roomId = String(fd.get('appointment_room_id') || '').trim();

    const extras = [];
    const pushExtra = (label, value) => {
      const v = String(value || '').trim();
      if (!v || v === '0') return;
      extras.push(`${label}: ${v}`);
    };
    pushExtra(t('appt.phone'), fd.get('patient_phone'));
    pushExtra(t('appt.email'), fd.get('patient_email'));
    pushExtra(t('appt.companyId'), fd.get('patient_company_id'));
    pushExtra(t('appt.insurance'), (() => {
      const id = String(fd.get('insurance') || '').trim();
      if (!id) return '';
      const name = state.insuranceCompanies.find((c) => String(c.id) === id)?.name;
      return name ? `${name} (#${id})` : id;
    })());
    pushExtra(t('appt.coupon'), fd.get('coupon_ids') || fd.get('coupon_id'));
    pushExtra(t('appt.amount'), fd.get('coupon_amount'));
    pushExtra(t('appt.leftAmount'), fd.get('coupon_left_amount'));
    pushExtra(t('appt.gender'), fd.get('patient_gender'));
    pushExtra(t('appt.age'), fd.get('patient_age'));
    pushExtra(t('appt.patientStatus'), fd.get('patient_status'));
    pushExtra(t('appt.kop'), fd.get('koph'));
    pushExtra(t('appt.staffMember'), fd.get('therapist'));
    pushExtra(t('appt.caseNumber'), fd.get('case_number'));
    pushExtra(t('appt.balance'), fd.get('balance'));
    pushExtra(t('appt.referredBy'), fd.get('referred_by'));
    pushExtra(t('appt.visitStatus'), fd.get('appo_type_status'));
    if (fd.get('approved_by_customer')) extras.push(`${t('appt.approvedByCustomer')}: yes`);
    if (fd.get('series_of_appointment')) extras.push(`${t('appt.series')}: yes`);

    const productIds = fd.getAll('product_ids').map(String).filter(Boolean);
    if (productIds.length) {
      const names = productIds
        .map((id) => state.products.find((p) => String(p.id) === id))
        .filter(Boolean)
        .map((p) => `${p.name} (${p.price})`);
      if (names.length) extras.push(`${t('appt.productList')}: ${names.join(', ')}`);
      pushExtra(t('appt.total'), fd.get('total_product_price'));
    }

    // Customer Add/Edit only accept a small allowlist — keep extras in notes.
    const notesParts = [userNotes];
    if (extras.length) notesParts.push(`${t('appt.extraDetails')}\n${extras.join('\n')}`);
    const notes = notesParts.filter(Boolean).join('\n\n');

    if (patient) body.patient_name = patient;
    if (subject) body.subject = subject;
    if (notes) body.notes = notes;
    if (branch) {
      body.branch = branch;
      body.appointment_branch_id = branch;
    }
    if (roomId) body.appointment_room_id = roomId;
    if (fd.get('remind_user')) body.remind_user = 1;
    const id = fd.get('id');
    if (id) body.id = id;
    return body;
  }

  async function saveAppointment(e, { isEdit = false } = {}) {
    e.preventDefault();
    const form = e.target;
    const alert = document.getElementById('appt-form-alert');
    const body = collectFormBody(form);
    const btn = document.querySelector('.appt-btn-save');

    if (!body.doctor_id || !body.appointments_type_data_id || !body.date || !body.start_time || !body.end_time) {
      if (alert) {
        alert.hidden = false;
        alert.className = 'alert alert-error';
        alert.textContent = t('appt.requiredFields');
      }
      return;
    }

    if (timeToMinutes(body.end_time) <= timeToMinutes(body.start_time)) {
      if (alert) {
        alert.hidden = false;
        alert.className = 'alert alert-error';
        alert.textContent = t('appt.endAfterStart');
      }
      return;
    }

    try {
      if (btn) btn.disabled = true;
      let res;
      if (isEdit) {
        // Edit allowlist — unknown params (e.g. team_member_id, appointments_type_id) fail the call.
        const editBody = {
          id: body.id,
          doctor_id: body.doctor_id,
          appointments_type_data_id: body.appointments_type_data_id,
          start_time: body.start_time,
          end_time: body.end_time,
          date: body.date,
        };
        if (body.patient_name) editBody.patient_name = body.patient_name;
        if (body.subject) editBody.subject = body.subject;
        if (body.notes) editBody.notes = body.notes;
        res = await API.appointmentEdit(editBody);
      } else {
        // Add does not accept subject/notes — only patient_name + schedule fields.
        // Persist subject/notes with a follow-up Edit using the new insert id.
        const createBody = {
          doctor_id: body.doctor_id,
          appointments_type_id: body.appointments_type_id,
          appointments_type_data_id: body.appointments_type_data_id,
          start_time: body.start_time,
          end_time: body.end_time,
          date: body.date,
        };
        if (body.patient_name) createBody.patient_name = body.patient_name;
        if (body.remind_user) createBody.remind_user = body.remind_user;
        if (body.branch) {
          createBody.branch = body.branch;
          createBody.appointment_branch_id = body.branch;
        }
        if (body.appointment_room_id) createBody.appointment_room_id = body.appointment_room_id;

        res = await API.appointmentAdd(createBody);
        if (String(res.success) === '0' || res.success === 0) {
          throw new Error(res.message || res.error || t('appt.couldNotSave'));
        }

        const newId = res.insert_id || res.id || res.data?.id || res.data?.insert_id;
        if (newId && (body.subject || body.notes || body.patient_name)) {
          const patch = { id: newId };
          if (body.subject) patch.subject = body.subject;
          if (body.notes) patch.notes = body.notes;
          if (body.patient_name) patch.patient_name = body.patient_name;
          const editRes = await API.appointmentEdit(patch);
          if (String(editRes.success) === '0' || editRes.success === 0) {
            console.warn('Appointment created but subject/notes update failed', editRes);
          }
        }
      }

      if (isEdit && (String(res.success) === '0' || res.success === 0)) {
        throw new Error(res.message || res.error || t('appt.couldNotSave'));
      }
      Toast.success(isEdit ? t('appt.updated') : t('appt.saved'));
      Realtime.handleEvent({ type: 'appointment', message: isEdit ? 'Appointment updated' : 'New appointment booked' });
      closeModal();
      refresh();
    } catch (err) {
      if (alert) {
        alert.hidden = false;
        alert.className = 'alert alert-error';
        alert.textContent = err.message || t('appt.couldNotSave');
      } else {
        Toast.error(err.message || t('appt.couldNotSave'));
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function deleteAppointment(id) {
    if (!id) return;
    if (!window.confirm(t('appt.confirmCancel'))) return;
    try {
      const res = await API.appointmentDelete(id);
      if (String(res.success) === '0' || res.success === 0) {
        throw new Error(res.message || res.error || t('appt.couldNotDelete'));
      }
      Toast.success(res.message || t('appt.deleted'));
      Realtime.handleEvent({ type: 'appointment', message: 'Appointment cancelled' });
      closeModal();
      refresh();
    } catch (err) {
      Toast.error(err.message || t('appt.couldNotDelete'));
    }
  }

  async function refresh() {
    const weekRoot = document.getElementById('appt-week');
    if (weekRoot) weekRoot.innerHTML = `<div class="loading-block"><div class="spinner"></div>${t('appt.loading')}</div>`;

    state.loading = true;
    try {
      if (!state.doctors.length || !state.types.length) {
        await loadMeta();
      }
      state.appointments = await fetchRangeAppointments();

      const rangeEl = document.getElementById('appt-range-label');
      if (rangeEl) rangeEl.textContent = formatRangeLabel();
      syncViewTabs();
      renderMiniCalendar(document.getElementById('appt-mini-cal'));
      renderDoctors(document.getElementById('appt-doctors'));
      renderFilters(document.getElementById('appt-filters'));
      renderCalendar(weekRoot);
    } catch (err) {
      if (weekRoot) Layout.error(weekRoot, err.message);
    } finally {
      state.loading = false;
    }
  }

  function init() {
    const now = new Date();
    state.viewDate = now;
    state.selectedDate = now;
    state.weekStart = startOfWeek(now);
    state.miniMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    state.viewMode = 'week';

    document.getElementById('appt-new-btn')?.addEventListener('click', () => openNewModal());
    document.getElementById('appt-view-detail-btn')?.addEventListener('click', () => openAppointmentHistoryModal());
    document.getElementById('appt-prev')?.addEventListener('click', () => shiftView(-1));
    document.getElementById('appt-next')?.addEventListener('click', () => shiftView(1));
    document.getElementById('appt-today')?.addEventListener('click', () => {
      const today = new Date();
      state.viewDate = today;
      state.selectedDate = today;
      state.weekStart = startOfWeek(today);
      state.miniMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      refresh();
    });

    document.getElementById('appt-branch')?.addEventListener('change', (e) => {
      applyBranchFilter(e.target.value || 'all');
      renderDoctors(document.getElementById('appt-doctors'));
      renderFilters(document.getElementById('appt-filters'));
      renderCalendar(document.getElementById('appt-week'));
    });

    document.querySelectorAll('.appt-view-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        state.viewMode = tab.dataset.view || 'week';
        if (state.viewMode === 'week') state.weekStart = startOfWeek(state.selectedDate || state.viewDate);
        syncViewTabs();
        refresh();
      });
    });

    Realtime.on((p) => {
      if (p.type === 'appointment') refresh();
    });

    const hash = location.hash || '';
    const editMatch = hash.match(/edit=([^&]+)/);
    refresh().then(() => {
      if (editMatch) {
        openDetailModal(decodeURIComponent(editMatch[1]));
        history.replaceState(null, '', location.pathname + location.search);
      }
    });
  }

  return { init, refresh, openNewModal };
})();

window.AppointmentsCalendar = AppointmentsCalendar;
