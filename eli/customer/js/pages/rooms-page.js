Layout.render({ active: 'rooms', titleKey: 'nav.rooms' });
    let search = '';
    let timer;
    let roomsCache = [];
    const startInput = document.getElementById('start_date');
    const endInput = document.getElementById('end_date');

    function todayISO() {
      const d = new Date();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${d.getFullYear()}-${m}-${day}`;
    }

    function lockPastDates() {
      const today = todayISO();
      startInput.min = today;
      endInput.min = startInput.value && startInput.value > today ? startInput.value : today;
      if (startInput.value && startInput.value < today) startInput.value = '';
      if (endInput.value && endInput.value < endInput.min) endInput.value = '';
    }

    startInput.addEventListener('change', () => {
      lockPastDates();
      if (endInput.value && endInput.value < startInput.value) endInput.value = startInput.value;
    });
    endInput.addEventListener('change', lockPastDates);
    lockPastDates();

    document.getElementById('search').addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        search = e.target.value.trim();
        load();
      }, 350);
    });

    document.getElementById('btn-cancel-book').addEventListener('click', () => {
      document.getElementById('book-panel').hidden = true;
    });

    async function load() {
      const el = document.getElementById('list');
      Layout.loading(el);
      try {
        const data = await API.roomsList({ search, limit: 25 });
        roomsCache = UI.listRows(data).filter((r) => {
          const t = r.rooms_type ?? r.room_id ?? r.type;
          return t !== null && t !== undefined && t !== '' && Number(t) !== 0;
        });
        if (!roomsCache.length) {
          Layout.empty(el, I18n.t('rooms.none'), I18n.t('rooms.noneHint'));
          return;
        }
        el.innerHTML = `<div class="grid grid-2">${roomsCache
          .map((r) => {
            const desc = r.overview || r.description || '';
            const roomsType = r.rooms_type ?? r.room_id ?? r.type;
            return `<div class="card room-card">
            <div class="room-icon">🏨</div>
            <div style="flex:1;min-width:0">
              <div class="card-title">${Layout.escapeHtml(r.name || I18n.t('rooms.room'))}</div>
              <div class="card-meta">${UI.formatMoney(r.price)}${r.max_guest ? ` · ${I18n.t('rooms.guests', { n: r.max_guest })}` : ''}</div>
              ${desc ? `<p class="text-sm mt-1 muted">${Layout.escapeHtml(desc)}</p>` : ''}
            </div>
            <button type="button" class="btn btn-sm btn-primary" data-book="${roomsType}" data-name="${Layout.escapeHtml(r.name || I18n.t('rooms.room'))}">${I18n.t('rooms.book')}</button>
          </div>`;
          })
          .join('')}</div>`;

        el.querySelectorAll('[data-book]').forEach((btn) => {
          btn.addEventListener('click', () => openBook(btn));
        });
      } catch (err) {
        Layout.error(el, err.message);
      }
    }

    function openBook(btn) {
      const roomsType = btn.dataset.book;
      document.getElementById('room_id').value = roomsType;
      document.getElementById('room-label').textContent = btn.dataset.name || I18n.t('rooms.roomType', { id: roomsType });
      lockPastDates();
      document.getElementById('book-panel').hidden = false;
      document.getElementById('book-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    document.getElementById('book-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const alert = document.getElementById('book-alert');
      alert.hidden = true;
      const start = startInput.value;
      const end = endInput.value;
      const today = todayISO();
      if (start < today || end < today) {
        alert.hidden = false;
        alert.className = 'alert alert-error';
        alert.textContent = I18n.t('rooms.pastDates');
        return;
      }
      if (end < start) {
        alert.hidden = false;
        alert.className = 'alert alert-error';
        alert.textContent = I18n.t('rooms.endBeforeStart');
        return;
      }
      const days = UI.daysBetween(start, end);
      const body = {
        room_id: document.getElementById('room_id').value,
        start_date: UI.toDisplayDate(start),
        end_date: UI.toDisplayDate(end),
        days,
        payment: 0,
        invoice_note: document.getElementById('invoice_note').value.trim(),
      };
      try {
        const res = await API.roomsBook(body);
        if (String(res.success) === '0' || res.success === 0) {
          throw new Error(res.message || I18n.t('rooms.failed'));
        }
        Toast.success(res.message || I18n.t('rooms.bookedTotal', { amount: UI.formatMoney(res.total_price) }));
        Realtime.handleEvent({ type: 'task', message: I18n.t('rooms.booked') });
        location.href = 'bookings.html';
      } catch (err) {
        alert.hidden = false;
        alert.className = 'alert alert-error';
        alert.textContent = err.message;
      }
    });

    load();
