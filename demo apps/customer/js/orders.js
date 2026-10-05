  function formatOrderDateValue(value) {
    if (value === undefined || value === null || value === '') return '';
    const raw = String(value).trim();
    if (!raw || raw === '—') return '';

    const noTrailingTime = raw.replace(/\s+\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:\s*[AP]M)?$/i, '').trim();
    const dateSource = noTrailingTime || raw;

    const normalized = dateSource
      .replace(/\s+/g, ' ')
      .replace(/\.(?=\d{4})/g, '')
      .replace(/\//g, '-');

    const dateMatch = normalized.match(/^\d{4}-\d{2}-\d{2}$/);
    if (dateMatch) {
      const [y, m, d] = normalized.split('-');
      return `${d}/${m}/${y}`;
    }

    const isoCandidate = normalized.match(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/);
    if (isoCandidate) {
      const d = new Date(normalized);
      if (!Number.isNaN(d.getTime())) {
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
      }
    }

    const d = new Date(normalized);
    if (!Number.isNaN(d.getTime())) {
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    }

    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(raw)) {
      const parts = raw.split(/[\/\-]/).filter(Boolean);
      if (parts.length === 3) {
        const [first, second, third] = parts;
        const year = third.length === 2 ? `20${third}` : third;
        const day = first.length === 2 ? first : String(first).padStart(2, '0');
        const month = second.length === 2 ? second : String(second).padStart(2, '0');
        return `${day}/${month}/${year}`;
      }
    }

    return raw;
  }

  function formatOrderTimeValue(value) {
    if (value === undefined || value === null || value === '') return '';
    const raw = String(value).trim();
    if (!raw || raw === '—') return '';

    const match = raw.match(/(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:\s*[AP]M)?)$/i);
    if (!match) return '';
    return match[1].trim();
  }

  function pickOrderDateValue(order) {
    const candidates = [
      order?.date,
      order?.month,
      order?.created_at,
      order?.created_date,
      order?.date_created,
      order?.created,
      order?.timestamp,
      order?.order_date,
      order?.createdAt,
    ];
    for (const v of candidates) {
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return '';
  }

  Layout.render({ active: 'orders', titleKey: 'nav.orders' });
    let search = '';
    let timer;
    let customFieldsMap = {};

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
        const data = await API.ordersList({ search, limit: 25 });
        const rows = data.data || [];
        let cols = data.columns || [];

        const hasDateValue = rows.some((row) => Boolean(pickOrderDateValue(row)));
        if (hasDateValue && !cols.some((c) => c === 'date' || c === 'month')) {
          cols.splice(1, 0, 'date');
        }
        
        if (!rows.length) {
          Layout.empty(el, I18n.t('orders.none'), I18n.t('orders.noneHint'));
          return;
        }

        customFieldsMap = {};
        (data.order_custom_fields || []).forEach(cf => {
          if (cf.type === 'numeric' && Array.isArray(cf.numeric_data)) {
            cf.numeric_data.forEach(nd => customFieldsMap[nd.name] = nd);
          } else {
            customFieldsMap[cf.name] = cf;
          }
        });
        const lang = document.documentElement.getAttribute('lang') === 'he' ? 'he' : 'en';
        // Force inject critical standard columns if missing
        if (!cols.includes('order_id') && !cols.includes('order_name')) cols.unshift('order_name');
        if (!cols.includes('total_price')) cols.push('total_price');
        if (!cols.includes('paid_status') && !cols.includes('paid')) cols.push('paid_status');
        if (!cols.includes('order_status')) cols.push('order_status');

        window.__cporders_cols = cols;

        // Dynamically build headers
        const headers = cols.map(c => {
          if (c === 'order_name' || c === 'order_id') return `<th>${Layout.escapeHtml(I18n.t('orders.order') || 'Order')}</th>`;
          if (c === 'total_price') return `<th>${Layout.escapeHtml(I18n.t('content.amount') || 'Total Price')}</th>`;
          if (c === 'paid_status' || c === 'paid') return `<th>${Layout.escapeHtml(I18n.t('invoices.paid') || 'Payment Status')}</th>`;
          if (c === 'order_status') return `<th>${Layout.escapeHtml('Status')}</th>`;

          const cf = customFieldsMap[c];
          let title = c.replace(/_/g, ' ');
          if (cf && cf[lang]) title = cf[lang];
          else if (cf && cf.label) title = cf.label;
          return `<th>${Layout.escapeHtml(title)}</th>`;
        }).join('');

        el.innerHTML = `<div class="table-wrap"><table>
          <thead><tr>${headers}<th></th></tr></thead>
          <tbody>
            ${rows
              .map((r) => {
                const rowData = cols.map(c => {
                  let val = r[c];
                  if (val === undefined && r.custom_fields) val = r.custom_fields[c];
                  val = val ?? r[`${c}_label`] ?? r[`${c}_name`] ?? '';

                  if (c === 'paid_status' || c === 'paid') {
                    const badgeVal = r.paid_status_label || val || '—';
                    return `<td><span class="badge ${r.paid_status == 1 || r.paid ? 'badge-success' : 'badge-warning'}">${Layout.escapeHtml(String(badgeVal))}</span></td>`;
                  }
                  if (c === 'order_status') {
                     const badgeVal = r.order_status_label || val || '—';
                     return `<td><span class="badge badge-muted" style="background:${r.order_status_color || '#eee'};color:#fff;">${Layout.escapeHtml(String(badgeVal))}</span></td>`;
                  }
                  if (c === 'total_price' || c === 'book_price' || c === 'discount' || c === 'product_discount') {
                    val = UI.formatMoney(val, r.coin || '');
                  }
                  if (c === 'order_id' || c === 'order_name') {
                     val = r.order_name || r.id || val;
                  }
                  if (c === 'date' || c === 'month') {
                     val = r.date || r.month || val || pickOrderDateValue(r);
                     const formatted = formatOrderDateValue(val);
                     if (formatted) val = formatted;
                  }
                  const displayVal = (val !== undefined && val !== null && val !== '') ? String(val) : '—';
                  return `<td>${Layout.escapeHtml(displayVal)}</td>`;
                }).join('');

                return `<tr>
                ${rowData}
                <td><button type="button" class="btn btn-sm btn-ghost" data-order-detail="${r.id || r.orders_for_cust_id}" data-stop>${I18n.t('open')}</button></td>
              </tr>`;
              })
              .join('')}
          </tbody>
        </table></div>`;

        window.__cporders = Object.fromEntries(rows.map((r) => [String(r.id || r.orders_for_cust_id), r]));
        el.querySelectorAll('[data-order-open]').forEach((row) => {
          row.addEventListener('click', (e) => {
            if (e.target.closest('[data-stop]')) return;
            const url = row.getAttribute('data-order-open');
            if (url) window.open(url, '_blank', 'noopener');
          });
        });
        el.querySelectorAll('[data-order-detail]').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openorderDetail(btn.getAttribute('data-order-detail'));
          });
        });
      } catch (err) {
        Layout.error(el, err.message);
      }
    }

    async function openorderDetail(id) {
      const overlay = document.getElementById('project-modal');
      overlay.hidden = false;
      overlay.innerHTML = `
        <div class="proj-modal-backdrop" data-close></div>
        <div class="proj-modal proj-modal-detail" role="dialog" aria-modal="true">
          <div class="proj-detail-body" style="padding: 1.5rem;"><div class="spinner"></div></div>
        </div>`;
      
      overlay.querySelectorAll('[data-close]').forEach((node) => {
        node.addEventListener('click', () => {
          overlay.hidden = true;
          overlay.innerHTML = '';
        });
      });

      let res = {};
      try {
        res = await API.orderGet(id);
      } catch (err) {
        // If API fails (e.g. No_data_found), fallback silently to list data
        console.warn('Failed to fetch full order details, using list data.', err);
      }
      
      try {
        const r = res.data || res.project || res || {};
        const fallback = (window.__cporders || {})[String(id)] || {};
        const order = { ...fallback, ...r };

        const lang = document.documentElement.getAttribute('lang') === 'he' ? 'he' : 'en';
        
        const details = [];
        const cols = window.__cporders_cols || [];
        
        // Push all columns from the dashboard headers, using '—' for empty ones
        cols.forEach(c => {
          if (c === 'order_name' || c === 'paid_status' || c === 'paid' || c === 'order_status') return;
          if (c === 'id' || c === 'order_id' || String(c).toLowerCase() === 'orderid' || String(c).toLowerCase() === 'order id') return;
          if (c === 'date' || c === 'month' || /date|time|created|updated|timestamp/i.test(String(c))) return;
          if (UI.isGeneratedMetadataField(c)) return;
          
          const cf = customFieldsMap[c];
          let title = c.replace(/_/g, ' ');
          if (cf && cf[lang]) title = cf[lang];

          let val = order[c];
          if (val === undefined && order.custom_fields) val = order.custom_fields[c];
          val = val ?? order[`${c}_label`] ?? order[`${c}_name`] ?? '';
          
          details.push({ label: title, value: (val !== undefined && val !== null && val !== '') ? val : '—' });
        });

        // Add standard product/order fields if not already in cols
        if (order.notes && !cols.includes('notes')) details.push({ label: 'Notes', value: order.notes });
        if (order.product_qty !== undefined && !cols.includes('product_qty')) details.push({ label: 'Quantity', value: order.product_qty });
        if (order.product_discount && !cols.includes('product_discount')) details.push({ label: 'Discount', value: UI.formatMoney(order.product_discount, order.coin || '') });
        if (order.book_price && !cols.includes('book_price')) details.push({ label: 'Book Price', value: UI.formatMoney(order.book_price, order.coin || '') });
        
        // Add any extra custom fields that were not part of the standard dashboard columns
        const cfs = order.custom_fields || {};
        Object.entries(cfs).forEach(([k, v]) => {
          if (cols.includes(k)) return;
          if (k === 'id' || k === 'order_id' || String(k).toLowerCase() === 'orderid' || String(k).toLowerCase() === 'order id') return;
          if (k === 'date' || k === 'month' || /date|time|created|updated|timestamp/i.test(String(k))) return;
          if (UI.isGeneratedMetadataField(k)) return;
          const cf = customFieldsMap[k];
          let title = k.replace(/_/g, ' ');
          if (cf && cf[lang]) title = cf[lang];
          let value = (v !== undefined && v !== null && v !== '') ? v : '—';
          details.push({ label: title, value });
        });

        const gridHtml = details.map(d => {
           return `<div class="proj-detail-row">
             <div class="proj-detail-label">${Layout.escapeHtml(d.label)}</div>
             <div class="proj-detail-value">${Layout.escapeHtml(String(d.value))}</div>
           </div>`;
        }).join('');

        const pdfUrl = String(order.pdf_url || order.url || order.view_url || '').trim();

        const body = overlay.querySelector('.proj-detail-body');
        
        if (!body) return;

          body.style.padding = '0';
          body.innerHTML = `
            <div style="padding: 1.5rem 1.5rem 2.5rem 1.5rem;">
              <div class="proj-detail-hero" style="margin:0; padding:0 0 0.75rem; border:0; background: transparent; display:flex; justify-content:space-between; align-items:flex-start; gap:1rem;">
                <div class="proj-detail-hero-main">
                  <div class="proj-board-name">${Layout.escapeHtml(order.order_name || I18n.t('orders.order'))}</div>
                </div>
                <div class="proj-timeline">
                  <span class="badge ${order.paid_status == 1 || order.paid ? 'badge-success' : 'badge-warning'}" style="font-size: 0.72rem; padding: 0.35rem 0.55rem; white-space: nowrap;">${Layout.escapeHtml(order.paid_status_label || (order.paid ? I18n.t('orders.paid') : I18n.t('orders.unpaid')) || '')}</span>
                </div>
              </div>
              <div class="proj-detail-grid" style="margin-top: 0;">
                ${gridHtml}
              </div>
            </div>
            <div class="proj-modal-foot proj-modal-foot-end" style="padding: 1rem 1.5rem; border-top: 1px solid var(--border); background: var(--bg-muted); border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; display:flex; gap:0.5rem; justify-content:flex-end;">
              ${pdfUrl ? `<a class="btn btn-primary" href="${Layout.escapeHtml(pdfUrl)}" target="_blank" rel="noopener">${I18n.t('orders.viewPdf')}</a>` : ''}
              <button type="button" class="btn btn-secondary" data-close>${I18n.t('close')}</button>
            </div>
          `;

        body.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', () => {
           overlay.hidden = true;
           overlay.innerHTML = '';
        }));
      } catch (err) {
        Toast.error(err.message || I18n.t('failedToLoad'));
        overlay.hidden = true;
        overlay.innerHTML = '';
      }
    }

    load();
