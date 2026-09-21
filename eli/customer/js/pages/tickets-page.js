Layout.render({ active: 'tickets', titleKey: 'nav.tickets' });

    let state = { show: '', search: '', page: 0, limit: window.CP_CONFIG.PAGE_SIZE };

    document.getElementById('status-tabs').addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (!tab) return;
      UI.qsa('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      state.show = tab.dataset.show;
      state.page = 0;
      load();
    });

    let searchTimer;
    document.getElementById('search').addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.search = e.target.value.trim();
        state.page = 0;
        load();
      }, 350);
    });

    document.getElementById('prev').addEventListener('click', () => {
      if (state.page > 0) { state.page--; load(); }
    });
    document.getElementById('next').addEventListener('click', () => {
      state.page++;
      load();
    });

    async function load() {
      const el = document.getElementById('list');
      Layout.loading(el);
      try {
        const body = {
          limit: state.limit,
          start: state.page * state.limit,
        };
        if (state.show !== '') body.show = state.show;
        if (state.search) body.searchh = state.search;

        const data = await API.ticketsList(body);
        const rows = data.data || [];
        if (!rows.length) {
          Layout.empty(el, I18n.t('tickets.noFound'), I18n.t('tickets.createHint'));
          document.getElementById('pager').hidden = true;
          return;
        }
        el.innerHTML = `<div class="table-wrap"><table>
          <thead><tr><th>${I18n.t('tickets.id')}</th><th>${I18n.t('tickets.subject')}</th><th>${I18n.t('tickets.status')}</th><th></th></tr></thead>
          <tbody>
            ${rows
              .map(
                (r) => `<tr class="clickable" data-nav-href="ticket-detail.html?id=${r.ticket_id}">
                <td><strong>#${r.ticket_id}</strong></td>
                <td>${Layout.escapeHtml(r.subject || '—')}</td>
                <td><span class="badge ${r.show == 1 ? 'badge-success' : 'badge-muted'}">${r.show == 1 ? I18n.t('tickets.open') : I18n.t('tickets.closed')}</span></td>
                <td><a class="btn btn-sm btn-ghost" href="ticket-detail.html?id=${r.ticket_id}">${I18n.t('open')}</a></td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table></div>`;

        const pager = document.getElementById('pager');
        pager.hidden = false;
        const total = data.count ?? rows.length;
        document.getElementById('pager-label').textContent = I18n.t('tickets.showing', {
          from: state.page * state.limit + 1,
          to: state.page * state.limit + rows.length,
          total: typeof total === 'number' ? total : rows.length,
        });
        document.getElementById('prev').disabled = state.page === 0;
        document.getElementById('next').disabled = rows.length < state.limit;
      } catch (err) {
        Layout.error(el, err.message);
      }
    }

    Realtime.on((p) => {
      if (p.type === 'ticket' || p.type === 'status') load();
    });

    load();
