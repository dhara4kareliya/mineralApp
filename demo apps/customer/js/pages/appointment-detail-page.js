const id = UI.param('id');
    Layout.render({ active: 'appointments', titleKey: 'appt.appointment' });

    if (!id) {
      Layout.error(document.getElementById('detail'), I18n.t('appt.missingId'));
    } else {
      load();
    }

    async function load() {
      const el = document.getElementById('detail');
      Layout.loading(el);
      try {
        const [res, docsRes, typesRes] = await Promise.all([
          API.appointmentGet(id),
          API.appointmentsDoctors().catch(() => ({ data: [] })),
          API.appointmentsTypes().catch(() => ({ data: [] })),
        ]);
        const a = res.data || res;
        const doctors = UI.listRows(docsRes);
        const types = UI.listRows(typesRes);
        const doctorId = String(a.doctor_id || a.team_member_id || a.member_id || '').trim();
        const doctor = doctors.find((d) =>
          [d.doctor_id, d.team_member_id, d.id].some((v) => String(v) === doctorId)
        );
        const typeId = a.appointments_type_data_id || a.appointments_type_id || a.appointment_type_id;
        const type = types.find((tp) => String(tp.id) === String(typeId));

        el.innerHTML = `<div class="card" style="max-width:560px" data-live-target>
          <div class="card-title">${I18n.t('appt.appointment')} #${Layout.escapeHtml(a.id || id)}</div>
          <div class="grid grid-2 mt-2">
            <div>
              <div class="form-label">${I18n.t('appt.patient')}</div>
              <div style="font-weight:700">${Layout.escapeHtml(a.patient_name || '—')}</div>
            </div>
            <div>
              <div class="form-label">${I18n.t('appt.subject')}</div>
              <div style="font-weight:700">${Layout.escapeHtml(a.subject || a.title || a.appointment_subject || a.description || '—')}</div>
            </div>
            <div>
              <div class="form-label">${I18n.t('appt.doctor')}</div>
              <div style="font-weight:700">${Layout.escapeHtml(doctor?.name || a.doctor_name || '—')}</div>
            </div>
            <div>
              <div class="form-label">${I18n.t('appt.type')}</div>
              <div style="font-weight:700">${Layout.escapeHtml(type?.name || a.type_name || a.type || '—')}</div>
            </div>
            <div>
              <div class="form-label">${I18n.t('appt.date')}</div>
              <div style="font-weight:700">${UI.formatDateOnly(a.date)}</div>
            </div>
            <div>
              <div class="form-label">${I18n.t('appt.time')}</div>
              <div style="font-weight:700">${Layout.escapeHtml(a.start_time || '—')}${a.end_time ? ' – ' + Layout.escapeHtml(a.end_time) : ''}</div>
            </div>
          </div>
          ${a.notes || a.note ? `<p class="mt-2 text-sm">${Layout.escapeHtml(a.notes || a.note)}</p>` : ''}
          <div class="flex gap-1 mt-2 wrap">
            <button type="button" class="btn btn-secondary" id="btn-edit">${I18n.t('edit')}</button>
            <button type="button" class="btn btn-ghost" id="btn-delete">${I18n.t('appt.cancelMeeting')}</button>
          </div>
        </div>`;

        document.getElementById('btn-edit')?.addEventListener('click', () => {
          location.href = `appointments.html#edit=${encodeURIComponent(a.id || id)}`;
        });

        document.getElementById('btn-delete')?.addEventListener('click', async () => {
          if (!confirm(I18n.t('appt.confirmCancel'))) return;
          try {
            const out = await API.appointmentDelete(a.id || id);
            if (String(out.success) === '0' || out.success === 0) {
              throw new Error(out.message || I18n.t('appt.couldNotDelete'));
            }
            Toast.success(out.message || I18n.t('appt.deleted'));
            location.href = 'appointments.html';
          } catch (err) {
            Toast.error(err.message || I18n.t('appt.couldNotDelete'));
          }
        });
      } catch (err) {
        Layout.error(el, err.message);
      }
    }
