Layout.render({ active: 'content', titleKey: 'nav.content' });

    const contentStore = { byKey: {} };

    function t(key, vars) {
      return typeof I18n !== 'undefined' ? I18n.t(key, vars) : key;
    }

    function esc(str) {
      return Layout.escapeHtml(str);
    }

    function pick(obj, keys) {
      for (const key of keys) {
        const val = obj?.[key];
        if (val == null || val === '') continue;
        if (typeof val === 'object') continue;
        const s = String(val).trim();
        if (s) return s;
      }
      return '';
    }

    function isGenericLabel(value, id) {
      const s = String(value || '').trim().toLowerCase();
      if (!s) return true;
      if (id != null && (s === String(id) || s === `#${id}`)) return true;
      return /^(form|forms|quote|quotes|document|item|untitled|null|undefined)$/i.test(s);
    }

    function formatMoney(value) {
      if (value == null || value === '') return '';
      const n = Number(value);
      if (!Number.isFinite(n)) return String(value);
      try {
        return UI.formatMoney(n);
      } catch {
        return String(n);
      }
    }

    function formatStatus(value) {
      if (value == null || value === '') return '';
      const s = String(value).trim();
      if (!s) return '';
      if (s === '1' || s.toLowerCase() === 'true') return t('content.statusOpen');
      if (s === '0' || s.toLowerCase() === 'false') return t('content.statusClosed');
      return s.replace(/_/g, ' ');
    }

    function itemKey(kind, item, index) {
      return `${kind}:${item?.id ?? item?.form_id ?? item?.quote_id ?? index}`;
    }

    function documentsFromPayload(d) {
      const nested = d.pdf_signer_document || d.pdf_signer_documents || d.pdf_signer_customer;
      if (nested) return UI.listRows(nested);
      return UI.listRows(d).filter((r) => r.pdf_signer_id != null || r.view_url || r.pdf_name);
    }

    function quoteTitle(item) {
      const id = item.id ?? item.quote_id ?? '';
      const title = pick(item, [
        'proposal_title',
        'quote_name',
        'document_name',
        'doc_name',
        'note_header',
        'note',
        'subject',
        'title',
        'description',
      ]);
      if (title && !isGenericLabel(title, id)) return title;
      const num = pick(item, ['quote_number', 'document_number', 'number', 'last_documents_id']);
      if (num) return t('content.quoteN', { id: num });
      return id !== '' ? t('content.quoteN', { id }) : t('content.item');
    }

    function quoteMeta(item) {
      const parts = [];
      const customer = pick(item, ['customer_name', 'client_name', 'name']);
      if (customer && customer !== quoteTitle(item)) parts.push(customer);
      const amount = formatMoney(item.final_amount ?? item.amount ?? item.total ?? item.price);
      if (amount) parts.push(amount);
      const status = formatStatus(item.status || item.doc_status || item.user_status);
      if (status) parts.push(status);
      const created = item.c_date || item.date_created || item.created_at || item.date;
      if (created) parts.push(UI.formatDate(created));
      if (item.id != null) parts.push(`${t('content.id')} #${item.id}`);
      return parts.join(' · ');
    }

    function formTitle(item) {
      const id = item.id ?? item.form_id ?? '';
      const title = pick(item, ['form_name', 'title', 'subject', 'description', 'name']);
      if (title && !isGenericLabel(title, id)) return title;
      return id !== '' ? t('content.formN', { id }) : t('content.item');
    }

    function formMeta(item) {
      const parts = [];
      const type = pick(item, ['form_type', 'type_name', 'category']);
      if (type && !isGenericLabel(type, item.id)) parts.push(type);
      else if (item.type && !isGenericLabel(item.type, item.id) && String(item.type).toLowerCase() !== 'form') {
        parts.push(String(item.type));
      }
      const status = formatStatus(item.status || item.form_status || item.filled_status);
      if (status) parts.push(status);
      const created = item.c_date || item.date_created || item.created_at || item.date;
      if (created) parts.push(UI.formatDate(created));
      if (item.id != null) parts.push(`${t('content.id')} #${item.id}`);
      return parts.join(' · ') || t('content.form');
    }

    function valueTitle(item) {
      return pick(item, ['name', 'title', 'key', 'label']) || (item.id != null ? `#${item.id}` : t('content.item'));
    }

    function valueMeta(item) {
      if (item.value != null && item.value !== '') return String(item.value);
      return pick(item, ['description', 'type', 'status']) || '';
    }

    function section(title, items, renderItem) {
      const rows = items || [];
      return `<div class="card mb-2">
        <div class="card-header">
          <div class="card-title">${esc(title)}</div>
          <span class="badge badge-muted">${rows.length}</span>
        </div>
        ${
          rows.length
            ? `<div class="content-list">${rows.map(renderItem).join('')}</div>`
            : `<p class="muted text-sm">${esc(t('content.empty'))}</p>`
        }
      </div>`;
    }

    function selectableCard(kind, item, index, title, meta) {
      const key = itemKey(kind, item, index);
      contentStore.byKey[key] = { kind, item };
      const href = item.view_url || item.url || item.link || item.href || '';
      return `<button type="button" class="content-item content-item-btn" data-content-key="${esc(key)}">
        <div class="content-item-body">
          <div class="content-item-title">${esc(title)}</div>
          ${meta ? `<div class="card-meta">${esc(meta)}</div>` : ''}
        </div>
        <span class="content-item-chevron" aria-hidden="true">›</span>
      </button>${
        href
          ? `<div class="content-item-link-row"><a class="btn btn-sm btn-ghost" href="${esc(href)}" target="_blank" rel="noopener">${esc(
              t('content.openLink')
            )}</a></div>`
          : ''
      }`;
    }

    function pdfDocumentCard(item, index) {
      const key = itemKey('document', item, index);
      contentStore.byKey[key] = { kind: 'document', item };
      const name = item.pdf_name || item.filename || item.name || t('content.documentN', { id: item.id });
      const signed = Number(item.is_signed) === 1 || !!item.date_of_sign;
      const viewUrl = item.view_url || item.sign_url || UI.pdfDocumentUrl(item);
      const downloadUrl = item.download_url || (item.filename ? UI.assetUrl(item.filename) : '');
      const target = item.open_in === 'new_tab' || item.view_action === 'open_url' ? '_blank' : '_self';
      const created = item.date_created ? UI.formatDate(item.date_created) : '';
      const signedOn = item.date_of_sign ? UI.formatDate(item.date_of_sign) : '';

      const actions = [];
      if (viewUrl) {
        const label = signed ? t('content.viewDocument') : t('content.sign');
        actions.push(
          `<a class="btn btn-sm ${signed ? 'btn-secondary' : 'btn-primary'}" href="${esc(viewUrl)}" target="${target}" rel="noopener" data-stop>${label}</a>`
        );
      }
      if (downloadUrl && signed) {
        actions.push(
          `<a class="btn btn-sm btn-ghost" href="${esc(downloadUrl)}" target="_blank" rel="noopener" data-stop>${t('content.download')}</a>`
        );
      }

      return `<button type="button" class="content-item doc-item content-item-btn" data-content-key="${esc(key)}">
        <div class="doc-icon">📄</div>
        <div style="min-width:0;flex:1;text-align:start">
          <div class="flex wrap gap-1" style="align-items:center">
            <div style="font-weight:700;font-size:.95rem">${esc(name)}</div>
            <span class="badge ${signed ? 'badge-success' : 'badge-warning'}">${signed ? t('content.signed') : t('content.pending')}</span>
          </div>
          <div class="doc-meta-row">
            ${item.id != null ? `<span>${esc(t('content.id'))} #${esc(item.id)}</span>` : ''}
            ${item.type ? `<span>${esc(t('content.type'))}: ${esc(item.type)}</span>` : ''}
            ${created ? `<span>${esc(t('content.created'))}: ${esc(created)}</span>` : ''}
            ${signedOn ? `<span>${esc(t('content.signedOn'))}: ${esc(signedOn)}</span>` : ''}
          </div>
        </div>
        <div class="doc-actions">${actions.join('')}</div>
      </button>`;
    }

    function detailRows(item) {
      const preferred = [
        ['title', t('content.fieldTitle')],
        ['name', t('content.fieldName')],
        ['form_name', t('content.forms')],
        ['quote_name', t('content.quotes')],
        ['proposal_title', t('content.fieldTitle')],
        ['document_name', t('content.document')],
        ['subject', t('content.fieldSubject')],
        ['note', t('content.fieldNote')],
        ['note_header', t('content.fieldNote')],
        ['description', t('content.fieldDescription')],
        ['customer_name', t('content.customer')],
        ['client_name', t('content.customer')],
        ['status', t('content.status')],
        ['doc_status', t('content.status')],
        ['user_status', t('content.status')],
        ['type', t('content.type')],
        ['form_type', t('content.type')],
        ['amount', t('content.amount')],
        ['final_amount', t('content.amount')],
        ['total', t('content.amount')],
        ['price', t('content.amount')],
        ['currency', t('content.currency')],
        ['c_date', t('content.created')],
        ['date_created', t('content.created')],
        ['created_at', t('content.created')],
        ['date', t('content.date')],
        ['date_of_sign', t('content.signedOn')],
        ['created_by', t('content.createdBy')],
        ['created_by_name', t('content.createdBy')],
        ['user_id', t('content.userId')],
        ['id', t('content.id')],
        ['quote_number', t('content.number')],
        ['document_number', t('content.number')],
        ['number', t('content.number')],
        ['value', t('content.value')],
        ['key', t('content.key')],
        ['view_url', t('content.openLink')],
        ['url', t('content.openLink')],
        ['link', t('content.openLink')],
        ['pdf_name', t('content.document')],
        ['filename', t('content.document')],
      ];

      const seen = new Set();
      const rows = [];

      preferred.forEach(([key, label]) => {
        if (!(key in item) || seen.has(key)) return;
        let val = item[key];
        if (val == null || val === '') return;
        if (typeof val === 'object') {
          try {
            val = JSON.stringify(val);
          } catch {
            return;
          }
        }
        if (/amount|total|price/i.test(key) && Number.isFinite(Number(val))) val = formatMoney(val);
        if (/date|c_date|created_at|signed/i.test(key)) {
          const formatted = UI.formatDate(val);
          if (formatted) val = formatted;
        }
        if (/status/i.test(key)) val = formatStatus(val);
        seen.add(key);
        rows.push({ label, value: String(val) });
      });

      Object.keys(item || {})
        .sort()
        .forEach((key) => {
          if (seen.has(key)) return;
          if (/^_|password|token|cookie/i.test(key)) return;
          let val = item[key];
          if (val == null || val === '') return;
          if (typeof val === 'object') {
            try {
              val = JSON.stringify(val);
            } catch {
              return;
            }
          }
          const s = String(val);
          if (s.length > 500) return;
          seen.add(key);
          rows.push({ label: key.replace(/_/g, ' '), value: s });
        });

      return rows;
    }

    function closeDetailModal() {
      const overlay = document.getElementById('content-modal');
      if (!overlay) return;
      overlay.hidden = true;
      overlay.innerHTML = '';
      document.removeEventListener('keydown', onEsc);
    }

    function onEsc(e) {
      if (e.key === 'Escape') closeDetailModal();
    }

    function openDetailModal(kind, item) {
      const overlay = document.getElementById('content-modal');
      if (!overlay) return;

      let title = t('content.details');
      if (kind === 'quote') title = quoteTitle(item);
      else if (kind === 'form') title = formTitle(item);
      else if (kind === 'value') title = valueTitle(item);
      else if (kind === 'document') {
        title = item.pdf_name || item.filename || item.name || t('content.documentN', { id: item.id });
      }

      const rows = detailRows(item);
      const link = item.view_url || item.url || item.link || item.href || item.sign_url || '';
      const body = rows.length
        ? `<div class="proj-detail-grid">${rows
            .map(
              (row) => `<div class="proj-detail-row">
            <div class="proj-detail-label">${esc(row.label)}</div>
            <div class="proj-detail-value">${
              /^https?:\/\//i.test(row.value)
                ? `<a href="${esc(row.value)}" target="_blank" rel="noopener">${esc(row.value)}</a>`
                : esc(row.value)
            }</div>
          </div>`
            )
            .join('')}</div>`
        : `<p class="muted text-sm">${esc(t('content.noDetails'))}</p>`;

      overlay.hidden = false;
      overlay.innerHTML = `
        <div class="proj-modal-backdrop" data-close></div>
        <div class="proj-modal proj-modal-detail" role="dialog" aria-modal="true">
          <div class="proj-modal-head">
            <h2>${esc(title)}</h2>
            <button type="button" class="proj-modal-close" data-close aria-label="${esc(t('close'))}">×</button>
          </div>
          <div class="proj-detail-body">${body}</div>
          <div class="proj-modal-foot proj-modal-foot-end">
            ${
              link
                ? `<a class="btn btn-primary" href="${esc(link)}" target="_blank" rel="noopener">${esc(t('content.openLink'))}</a>`
                : ''
            }
            <button type="button" class="btn btn-secondary" data-close>${esc(t('close'))}</button>
          </div>
        </div>`;

      overlay.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeDetailModal));
      document.addEventListener('keydown', onEsc);
    }

    function bindContentClicks(root) {
      root.querySelectorAll('[data-content-key]').forEach((el) => {
        el.addEventListener('click', (e) => {
          if (e.target.closest('[data-stop]')) return;
          const key = el.getAttribute('data-content-key');
          const entry = contentStore.byKey[key];
          if (entry) openDetailModal(entry.kind, entry.item);
        });
      });
    }

    async function loadContent() {
      const el = document.getElementById('list');
      contentStore.byKey = {};
      try {
        const data = await API.dynamicContentList({ limit: 25 });
        const d = data.data || data || {};
        const documents = documentsFromPayload(d);
        const quotes = UI.listRows(d.quotes);
        const forms = UI.listRows(d.forms);
        const values = UI.listRows(d.dynamic_values);

        el.innerHTML =
          section(t('content.dynamicValues'), values, (x, i) =>
            selectableCard('value', x, i, valueTitle(x), valueMeta(x))
          ) +
          section(t('content.quotes'), quotes, (x, i) =>
            selectableCard('quote', x, i, quoteTitle(x), quoteMeta(x))
          ) +
          section(t('content.forms'), forms, (x, i) =>
            selectableCard('form', x, i, formTitle(x), formMeta(x))
          ) +
          section(t('content.documents'), documents, (x, i) => pdfDocumentCard(x, i));

        bindContentClicks(el);
      } catch (err) {
        Layout.error(el, err.message);
      }
    }

    loadContent();
