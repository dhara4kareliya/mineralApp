/**
 * Appointments week calendar
 * APIs: List, Get, Doctors, Types, Add, Edit, Delete
 * Docs: https://eli.bull36.com/app/help/category/Customer-Portal
 */
const AppointmentsCalendar = (() => {
  const HOUR_START = 8;
  const HOUR_END = 22;
  const SLOT_HEIGHT = 56;
  const DOCTOR_COLORS = ['#e91e8c', '#f97316', '#14b8a6', '#ef4444', '#8b5cf6', '#2563eb'];

  let state = {
    viewDate: new Date(),
    weekStart: null,
    selectedDate: null,
    miniMonth: null,
    appointments: [],
    doctors: [],
    types: [],
    places: [],
    filterDoctor: 'all',
    filterType: 'all',
    filterPlace: 'all',
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
    return String(a.team_member_id || a.doctor_id || a.member_id || a.user_id || '');
  }

  function doctorKey(a) {
    const id = doctorIdOf(a);
    return id || 'default';
  }

  function findDoctor(id) {
    return state.doctors.find((d) => String(d.id) === String(id));
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
      const id = String(d.doctor_id || d.team_member_id || d.id);
      const apiColor = d.color && d.color !== '#000000' ? d.color : colorFor(id, idx);
      return {
        id,
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
      return true;
    });
  }

  async function fetchWeekAppointments(weekStart) {
    const dates = getWeekDates(weekStart);
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

  async function loadMeta() {
    const [docsRes, typesRes] = await Promise.all([
      API.appointmentsDoctors().catch(() => ({ data: [], places: [] })),
      API.appointmentsTypes().catch(() => ({ data: [] })),
    ]);
    state.doctors = normalizeDoctors(docsRes);
    state.types = normalizeTypes(typesRes);
    state.places = Array.isArray(docsRes.places) ? docsRes.places.filter(Boolean) : [];
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
        renderWeek(document.getElementById('appt-week'));
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
      ...state.places.map(
        (p) =>
          `<button type="button" class="appt-filter-chip ${state.filterPlace === p ? 'active' : ''}" data-place="${Layout.escapeHtml(p)}">${Layout.escapeHtml(p)}</button>`
      ),
    ];
    root.innerHTML = chips.join('');

    root.querySelectorAll('[data-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.filterType = btn.dataset.type;
        state.filterPlace = 'all';
        renderFilters(root);
        renderWeek(document.getElementById('appt-week'));
      });
    });

    root.querySelectorAll('[data-place]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.filterPlace = state.filterPlace === btn.dataset.place ? 'all' : btn.dataset.place;
        renderFilters(root);
      });
    });
  }

  function renderWeek(root) {
    if (!root) return;
    const dates = getWeekDates(state.weekStart);
    const list = filteredAppointments();
    const gridStart = HOUR_START * 60;
    const gridEnd = HOUR_END * 60;
    const totalHeight = (HOUR_END - HOUR_START) * SLOT_HEIGHT;

    const hours = [];
    for (let h = HOUR_START; h < HOUR_END; h++) {
      hours.push(`<div class="appt-hour-label" style="height:${SLOT_HEIGHT}px">${pad(h)}:00</div>`);
    }

    const primaryDoc = state.doctors.find((doc) => doc.id === state.filterDoctor);

    const dayCols = dates
      .map((d) => {
        const iso = toISO(d);
        const h = formatDayHeader(d);
        const dayApts = list.filter((a) => String(a.date).slice(0, 10) === iso);

        const blocks = dayApts
          .map((a) => {
            const start = timeToMinutes(a.start_time);
            const end = timeToMinutes(a.end_time || a.start_time);
            const top = ((Math.max(start, gridStart) - gridStart) / 60) * SLOT_HEIGHT;
            const height = Math.max(((Math.min(end, gridEnd) - Math.max(start, gridStart)) / 60) * SLOT_HEIGHT, 28);
            const doc = findDoctor(doctorIdOf(a));
            const color = doc?.color || colorFor(doctorKey(a));
            return `<button type="button" class="appt-block" style="top:${top}px;height:${height}px;background:${color}" data-id="${a.id}" title="${Layout.escapeHtml(patientLabel(a))}">
              ${Layout.escapeHtml(patientLabel(a))}
            </button>`;
          })
          .join('');

        return `<div class="appt-day-col">
          <div class="appt-day-head">
            <span class="appt-day-dow">${h.dow}</span>
            <span class="appt-day-dom">${h.dom} ${h.month}</span>
            <span class="appt-day-doc">${Layout.escapeHtml(primaryDoc?.name || state.doctors[0]?.name || '')}</span>
          </div>
          <div class="appt-day-grid" style="height:${totalHeight}px" data-date="${iso}">
            ${blocks}
          </div>
        </div>`;
      })
      .join('');

    root.innerHTML = `
      <div class="appt-week-shell">
        <div class="appt-time-col">
          <div class="appt-time-head"></div>
          ${hours.join('')}
        </div>
        <div class="appt-days-row">${dayCols}</div>
      </div>`;

    root.querySelectorAll('.appt-block').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDetailModal(btn.dataset.id);
      });
    });

    root.querySelectorAll('.appt-day-grid').forEach((col) => {
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
        });
      });
    });
  }

  function openModal(title, bodyHtml, footerHtml) {
    const overlay = document.getElementById('appt-modal');
    overlay.hidden = false;
    overlay.innerHTML = `
      <div class="appt-modal-backdrop" data-close></div>
      <div class="appt-modal" role="dialog" aria-modal="true">
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

  function formHtml(values = {}, { isEdit = false } = {}) {
    const doctorOptions = state.doctors.length
      ? state.doctors
          .map(
            (d) =>
              `<option value="${Layout.escapeHtml(d.id)}" ${String(values.doctor_id) === String(d.id) ? 'selected' : ''}>${Layout.escapeHtml(d.name)}</option>`
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

    return `<form id="appt-form" class="appt-form" data-edit="${isEdit ? '1' : '0'}">
      ${isEdit ? `<input type="hidden" name="id" value="${Layout.escapeHtml(values.id || '')}" />` : ''}
      <div class="form-group"><label class="form-label">${t('appt.patient')}</label>
        <input class="form-control" name="patient_name" placeholder="${t('appt.patientPh')}" value="${Layout.escapeHtml(values.patient_name || '')}" /></div>
      <div class="form-group"><label class="form-label">${t('appt.contact')}</label>
        <textarea class="form-control" name="notes" placeholder="${t('appt.contactPh')}">${Layout.escapeHtml(values.notes || values.contact_info || '')}</textarea></div>
      <div class="form-group"><label class="form-label">${t('appt.subject')}</label>
        <input class="form-control" name="subject" placeholder="${t('appt.subjectPh')}" value="${Layout.escapeHtml(values.subject || '')}" /></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">${t('appt.teamMember')} *</label>
          <select class="form-control" name="doctor_id" required>
            <option value="">${t('appt.selectDoctor')}</option>
            ${doctorOptions}
          </select></div>
        <div class="form-group"><label class="form-label">${t('appt.type')} *</label>
          <select class="form-control" name="appointments_type_data_id" id="appt-type-select" required>
            <option value="">${t('appt.selectType')}</option>
            ${typeOptions}
          </select></div>
      </div>
      <div class="form-row form-row-3">
        <div class="form-group"><label class="form-label">${t('appt.startTime')} *</label>
          <select class="form-control" name="start_time" id="appt-start-time" required>${startTimeOptions(start)}</select></div>
        <div class="form-group"><label class="form-label">${t('appt.endTime')} *</label>
          <select class="form-control" name="end_time" id="appt-end-time" required>${endTimeOptions(end)}</select></div>
        <div class="form-group"><label class="form-label">${t('appt.date')} *</label>
          <input class="form-control" type="date" name="date" value="${Layout.escapeHtml(date)}" required /></div>
      </div>
      ${
        !isEdit
          ? `<label class="appt-remind"><input type="checkbox" name="remind_user" value="1" /> ${t('appt.remind')}</label>`
          : ''
      }
      <div id="appt-form-alert" hidden></div>
    </form>`;
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

  function openFormModal(prefill = {}, { isEdit = false } = {}) {
    const values = {
      doctor_id: prefill.doctor_id || (state.filterDoctor !== 'all' ? state.filterDoctor : state.doctors[0]?.id || ''),
      appointments_type_data_id: prefill.appointments_type_data_id || state.types[0]?.id || '',
      start_time: prefill.start_time || prefill.start || '08:00',
      end_time: prefill.end_time || prefill.end,
      date: prefill.date || toISO(state.selectedDate || state.viewDate),
      // New appointment: keep patient name and subject empty (per request)
      patient_name: isEdit ? prefill.patient_name || '' : '',
      subject: isEdit ? prefill.subject || '' : '',
      notes: isEdit ? prefill.notes || prefill.contact_info || '' : '',
      id: prefill.id || '',
    };

    // Always derive end from type duration for new appointments;
    // for edit, still sync when type/start change via bindFormDuration.
    if (!isEdit || !values.end_time) {
      const dur = findType(values.appointments_type_data_id)?.time || 30;
      values.end_time = minutesToTime(timeToMinutes(values.start_time) + dur);
    }

    openModal(
      isEdit ? t('appt.edit') : t('appt.newTitle'),
      formHtml(values, { isEdit }),
      isEdit
        ? `<button type="button" class="btn btn-ghost appt-btn-cancel" id="appt-btn-delete">${t('appt.cancelMeeting')}</button>
           <button type="submit" form="appt-form" class="btn btn-primary appt-btn-save">${t('save')}</button>`
        : `<button type="button" class="btn btn-ghost" data-close>${t('cancel')}</button>
           <button type="submit" form="appt-form" class="btn btn-primary appt-btn-save">${t('save')}</button>`
    );

    bindFormDuration({ syncNow: true });
    document.getElementById('appt-form')?.addEventListener('submit', (e) => saveAppointment(e, { isEdit }));
    document.getElementById('appt-btn-delete')?.addEventListener('click', () => deleteAppointment(values.id));
  }

  function openNewModal(prefill = {}) {
    openFormModal(prefill, { isEdit: false });
  }

  async function openDetailModal(id) {
    openModal(t('appt.details'), '<div class="spinner"></div>', '');
    try {
      const res = await API.appointmentGet(id);
      const a = res.data || res;
      const body = `
        <div class="appt-detail-grid">
          <div><span class="form-label">${t('appt.patient')}</span><strong>${Layout.escapeHtml(a.patient_name || '—')}</strong></div>
          <div><span class="form-label">${t('appt.subject')}</span><strong>${Layout.escapeHtml(a.subject || a.title || '—')}</strong></div>
          <div><span class="form-label">${t('appt.doctor')}</span><strong>${Layout.escapeHtml(doctorName(a))}</strong></div>
          <div><span class="form-label">${t('appt.type')}</span><strong>${Layout.escapeHtml(appointmentType(a))}</strong></div>
          <div><span class="form-label">${t('appt.date')}</span><strong>${UI.formatDateOnly(a.date)}</strong></div>
          <div><span class="form-label">${t('appt.time')}</span><strong>${Layout.escapeHtml(a.start_time || '—')} – ${Layout.escapeHtml(a.end_time || '—')}</strong></div>
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
            subject: a.subject || '',
            notes: a.notes || a.contact_info || '',
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
    const body = {
      doctor_id: fd.get('doctor_id'),
      appointments_type_data_id: fd.get('appointments_type_data_id'),
      start_time: fd.get('start_time'),
      end_time: fd.get('end_time'),
      date: fd.get('date'),
    };
    const patient = String(fd.get('patient_name') || '').trim();
    const subject = String(fd.get('subject') || '').trim();
    const notes = String(fd.get('notes') || '').trim();
    if (patient) body.patient_name = patient;
    if (subject) body.subject = subject;
    if (notes) body.notes = notes;
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
      const res = isEdit ? await API.appointmentEdit(body) : await API.appointmentAdd(body);
      if (String(res.success) === '0' || res.success === 0) {
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
      state.appointments = await fetchWeekAppointments(state.weekStart);

      document.getElementById('appt-range-label').textContent = formatWeekRange(state.weekStart);
      renderMiniCalendar(document.getElementById('appt-mini-cal'));
      renderDoctors(document.getElementById('appt-doctors'));
      renderFilters(document.getElementById('appt-filters'));
      renderWeek(weekRoot);
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

    document.getElementById('appt-new-btn')?.addEventListener('click', () => openNewModal());
    document.getElementById('appt-prev-week')?.addEventListener('click', () => {
      state.weekStart = addDays(state.weekStart, -7);
      state.viewDate = new Date(state.weekStart);
      refresh();
    });
    document.getElementById('appt-next-week')?.addEventListener('click', () => {
      state.weekStart = addDays(state.weekStart, 7);
      state.viewDate = new Date(state.weekStart);
      refresh();
    });
    document.getElementById('appt-today')?.addEventListener('click', () => {
      const today = new Date();
      state.viewDate = today;
      state.selectedDate = today;
      state.weekStart = startOfWeek(today);
      state.miniMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      refresh();
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
