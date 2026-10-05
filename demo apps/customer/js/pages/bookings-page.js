Layout.render({ active: 'bookings', titleKey: 'nav.bookings' });

    (async function load() {
      const el = document.getElementById('list');
      try {
        const data = await API.roomsBookings({ limit: 25 });
        const rows = data.data || [];
        if (!rows.length) {
          Layout.empty(el, I18n.t('bookings.none'), I18n.t('bookings.noneHint'));
          return;
        }
        el.innerHTML = `<div class="table-wrap"><table>
          <thead><tr><th>${I18n.t('bookings.id')}</th><th>${I18n.t('bookings.room')}</th><th>${I18n.t('bookings.start')}</th><th>${I18n.t('bookings.total')}</th></tr></thead>
          <tbody>
            ${rows
              .map(
                (r) => `<tr>
                <td><strong>#${r.id}</strong></td>
                <td>#${r.room_id}</td>
                <td>${UI.formatDate(r.start_date)}</td>
                <td>${UI.formatMoney(r.total_price)}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table></div>`;
      } catch (err) {
        Layout.error(el, err.message);
      }
    })();
