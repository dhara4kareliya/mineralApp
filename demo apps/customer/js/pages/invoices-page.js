Layout.render({ active: 'invoices', titleKey: 'nav.invoices' });
    let search = '';
    let timer;

    document.getElementById('search').addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        search = e.target.value.trim();
        load();
      }, 350);
    });

    async function load() {
      const el = document.getElementById('list');
      Layout.loading(el);
      try {
        const data = await API.invoicesList({ search, limit: 25 });
        const rows = data.data || [];
        if (!rows.length) {
          Layout.empty(el, I18n.t('invoices.none'), I18n.t('invoices.noneHint'));
          return;
        }
        el.innerHTML = `<div class="table-wrap"><table>
          <thead><tr><th>${I18n.t('table.id')}</th><th>${I18n.t('invoices.type')}</th><th>${I18n.t('invoices.address')}</th><th>${I18n.t('invoices.amount')}</th><th>${I18n.t('invoices.paid')}</th><th>${I18n.t('invoices.status')}</th><th></th></tr></thead>
          <tbody>
            ${rows
              .map((r) => {
                const pdfUrl = String(r.pdf_url || r.url || r.view_url || '').trim();
                const openAttr = pdfUrl
                  ? `class="clickable" data-invoice-open="${Layout.escapeHtml(pdfUrl)}" data-invoice-id="${r.id}"`
                  : `data-invoice-id="${r.id}"`;
                const openBtn = pdfUrl
                  ? `<a class="btn btn-sm btn-ghost" href="${Layout.escapeHtml(pdfUrl)}" target="_blank" rel="noopener" data-stop>${I18n.t('open')}</a>`
                  : `<button type="button" class="btn btn-sm btn-ghost" data-invoice-detail="${r.id}" data-stop>${I18n.t('open')}</button>`;
                return `<tr ${openAttr}>
                <td><strong>#${r.id}</strong></td>
                <td>${Layout.escapeHtml(r.type || '—')}</td>
                <td>${Layout.escapeHtml(r.address || '—')}</td>
                <td>${UI.formatMoney(r.final_amount, r.coin || '')}</td>
                <td><span class="badge ${r.paid ? 'badge-success' : 'badge-warning'}">${Layout.escapeHtml(r.paid_label || (r.paid ? I18n.t('invoices.paid') : I18n.t('invoices.unpaid')))}</span></td>
                <td>${Layout.escapeHtml(r.custom_status_name || '—')}</td>
                <td>${openBtn}</td>
              </tr>`;
              })
              .join('')}
          </tbody>
        </table></div>`;

        window.__cpInvoices = Object.fromEntries(rows.map((r) => [String(r.id), r]));
        el.querySelectorAll('[data-invoice-open]').forEach((row) => {
          row.addEventListener('click', (e) => {
            if (e.target.closest('[data-stop]')) return;
            const url = row.getAttribute('data-invoice-open');
            if (url) window.open(url, '_blank', 'noopener');
          });
        });
        el.querySelectorAll('[data-invoice-detail]').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openInvoiceDetail(btn.getAttribute('data-invoice-detail'));
          });
        });
      } catch (err) {
        Layout.error(el, err.message);
      }
    }

    function openInvoiceDetail(id) {
      const r = (window.__cpInvoices || {})[String(id)];
      if (!r) {
        Toast.error(I18n.t('failedToLoad'));
        return;
      }
      const pdfUrl = String(r.pdf_url || r.url || r.view_url || '').trim();
      const items = Array.isArray(r.items) ? r.items : [];
      const itemsHtml = items.length
        ? `<div class="table-wrap mt-2"><table>
            <thead><tr><th>${I18n.t('invoices.item')}</th><th>${I18n.t('invoices.qty')}</th><th>${I18n.t('invoices.amount')}</th></tr></thead>
            <tbody>
              ${items
                .map(
                  (it) => `<tr>
                    <td>${Layout.escapeHtml(it.item_name || it.name || '—')}</td>
                    <td>${Layout.escapeHtml(String(it.item_qty ?? it.qty ?? '—'))}</td>
                    <td>${UI.formatMoney(it.item_total ?? it.total, r.coin || '')}</td>
                  </tr>`
                )
                .join('')}
            </tbody>
          </table></div>`
        : '';
      const overlay = document.getElementById('invoice-modal');
      overlay.hidden = false;
      overlay.innerHTML = `
        <div class="proj-modal-backdrop" data-close></div>
        <div class="proj-modal proj-modal-detail" role="dialog" aria-modal="true">
          <div class="proj-modal-head">
            <div>
              <div class="card-title">${I18n.t('invoices.invoice')} #${Layout.escapeHtml(String(r.id))}</div>
              <div class="card-meta mt-1">${Layout.escapeHtml(r.type || I18n.t('dash.invoice'))} · ${UI.formatMoney(r.final_amount, r.coin || '')}</div>
            </div>
            <button type="button" class="proj-modal-close" data-close aria-label="${I18n.t('close')}">×</button>
          </div>
          <div class="proj-modal-body">
            <div class="flex gap-1 wrap mb-2">
              <span class="badge ${r.paid ? 'badge-success' : 'badge-warning'}">${Layout.escapeHtml(r.paid_label || (r.paid ? I18n.t('invoices.paid') : I18n.t('invoices.unpaid')))}</span>
              ${r.custom_status_name ? `<span class="badge badge-muted">${Layout.escapeHtml(r.custom_status_name)}</span>` : ''}
            </div>
            ${r.address ? `<p class="text-sm muted">${I18n.t('invoices.address')}: ${Layout.escapeHtml(r.address)}</p>` : ''}
            ${itemsHtml}
          </div>
          <div class="proj-modal-foot proj-modal-foot-end">
            ${
              pdfUrl
                ? `<a class="btn btn-primary" href="${Layout.escapeHtml(pdfUrl)}" target="_blank" rel="noopener">${I18n.t('invoices.viewPdf')}</a>`
                : ''
            }
            <button type="button" class="btn btn-secondary" data-close>${I18n.t('close')}</button>
          </div>
        </div>`;
      overlay.querySelectorAll('[data-close]').forEach((node) => {
        node.addEventListener('click', () => {
          overlay.hidden = true;
          overlay.innerHTML = '';
        });
      });
    }

    load();
