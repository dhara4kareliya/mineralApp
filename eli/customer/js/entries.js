  const PAGE_SIZE = window.CP_CONFIG?.PAGE_SIZE || 25;
    let state = { search: '', page: 0, total: null };
    let tabs = [];
    let activeTabId = null;
    let currentCols = [];
    let customFieldsMap = {};

    let searchTimer;
    document.getElementById('search').addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.search = e.target.value.trim();
        state.page = 0;
        loadList();
      }, 350);
    });

    document.getElementById('prev').addEventListener('click', () => {
      if (state.page > 0) {
        state.page--;
        loadList();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    document.getElementById('next').addEventListener('click', () => {
      state.page++;
      loadList();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    async function init() {
      const tabsEl = document.getElementById('tabs-container');
      try {
        const res = await API.entriesTabs();
        tabs = res.nav || [];
        if (!tabs.length) {
          tabsEl.innerHTML = `<span class="muted">${I18n.t('entries.none', 'No entries available')}</span>`;
          document.getElementById('list').innerHTML = '';
          return;
        }

        activeTabId = tabs[0].tab_id || tabs[0].entry_id;
        
        renderTabs();
        loadList();
      } catch (err) {
        tabsEl.innerHTML = '';
        Layout.error(document.getElementById('list'), err.message);
      }
    }

    function renderTabs() {
      const tabsEl = document.getElementById('tabs-container');
      const optionsHtml = tabs.map(t => {
        const id = t.tab_id || t.entry_id;
        const isActive = id == activeTabId;
        const countLabel = typeof t.count === 'number' ? ` (${t.count})` : '';
        return `<option value="${id}" ${isActive ? 'selected' : ''}>
          
           ${Layout.escapeHtml(t.title || t.tab_name_en || 'Tab')}${countLabel}
        </option>`;
      }).join('');

      tabsEl.innerHTML = `<select class="form-control" id="tabs-dropdown" style="cursor: pointer;">${optionsHtml}</select>`;

      document.getElementById('tabs-dropdown').addEventListener('change', (e) => {
         activeTabId = e.target.value;
         state.page = 0;
         loadList();
      });
    }

    async function loadList() {
      if (!activeTabId) return;
      const el = document.getElementById('list');
      const pager = document.getElementById('pager');
      Layout.loading(el);
      pager.hidden = true;

      try {
        const body = {
          entry_id: activeTabId,
          limit: PAGE_SIZE,
          page: state.page + 1,
        };
        if (state.search) body.search = state.search;

        const data = await API.entriesList(body);
        const rows = data.data || [];
        currentCols = data.columns || [];
        const total = data.count ?? data.recordsTotal ?? data.recordsFiltered ?? data.total_record;
        state.total = typeof total === 'number' ? total : Number(total) || null;

        if (!rows.length) {
          Layout.empty(el, I18n.t('entries.none', 'No records found'), state.search ? I18n.t('entries.searchHint', 'Try a different search') : '');
          return;
        }

        // Infer columns if API doesn't provide them explicitly
        if (!currentCols.length && rows.length > 0) {
           currentCols = Object.keys(rows[0]).filter(k => k !== 'id' && k !== 'row_id' && k !== 'custom_fields' && !k.endsWith('_label') && !k.endsWith('_name'));
        }

        // Normalize columns to strings in case the API returns objects
        currentCols = currentCols.map(c => typeof c === 'object' ? (c.name || c.id || c.key || c.field_key || '') : c).filter(Boolean);

          customFieldsMap = {};
          (data.order_custom_fields || data.entry_custom_fields || []).forEach(cf => {
            customFieldsMap[cf.name] = cf;
          });
          
          if (data.columns) {
            data.columns.forEach(c => {
              if (typeof c === 'object' && c && (c.name || c.id || c.key)) {
                 const key = c.name || c.id || c.key;
                 if (!customFieldsMap[key]) customFieldsMap[key] = c;
              }
            });
          }

        const lang = document.documentElement.getAttribute('lang') === 'he' ? 'he' : 'en';
        
        const headers = currentCols.map(c => {
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
                const rowData = currentCols.map(c => {
                  let val = r[c];
                  if (val === undefined && r.custom_fields) val = r.custom_fields[c];
                  val = val ?? r[`${c}_label`] ?? r[`${c}_name`] ?? '';
                  
                  if (c === 'status' || c === 'paid_status' || c === 'status_label') {
                    const badgeVal = r[`${c}_label`] || val || '—';
                    return `<td><span class="badge badge-muted">${Layout.escapeHtml(String(badgeVal))}</span></td>`;
                  }
                  
                  const cf = customFieldsMap[c];
                  if (cf && cf.options && typeof cf.options === 'object' && val !== '') {
                      try {
                          const parsed = JSON.parse(val);
                          if (Array.isArray(parsed)) {
                              val = parsed.map(v => cf.options[v] || v).join(', ');
                          } else {
                              val = cf.options[val] || val;
                          }
                      } catch(e) {
                          val = cf.options[val] || val;
                      }
                  }
                  
                  const displayVal = (val !== undefined && val !== null && val !== '') ? String(val) : '—';
                  return `<td>${Layout.escapeHtml(displayVal)}</td>`;
                }).join('');

                return `<tr>
                ${rowData}
                <td><button type="button" class="btn btn-sm btn-ghost" data-entry-detail="${r.id || r.row_id}">${I18n.t('open', 'Open')}</button></td>
              </tr>`;
              })
              .join('')}
          </tbody>
        </table></div>`;

        window.__cpentries = Object.fromEntries(rows.map((r) => [String(r.id || r.row_id), r]));
        
        el.querySelectorAll('[data-entry-detail]').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEntryDetail(btn.getAttribute('data-entry-detail'));
          });
        });

        const from = state.page * PAGE_SIZE + 1;
        const to = state.page * PAGE_SIZE + rows.length;
        document.getElementById('pager-label').textContent = I18n.t('entries.showing', `Showing ${from} - ${to} of ${state.total || to}`);
        document.getElementById('prev').disabled = state.page === 0;
        document.getElementById('next').disabled = typeof state.total === 'number' ? to >= state.total : rows.length < PAGE_SIZE;
        pager.hidden = false;
      } catch (err) {
        Layout.error(el, err.message);
      }
    }

    async function openEntryDetail(id) {
      const overlay = document.getElementById('project-modal');
      overlay.hidden = false;
      overlay.innerHTML = `
        <div class="proj-modal-backdrop" data-close></div>
        <div class="proj-modal proj-modal-detail" role="dialog" aria-modal="true">
          <div class="proj-modal-head">
            <h2 id="proj-detail-title">${I18n.t('loading', 'Loading')}...</h2>
          </div>
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
        res = await API.entryGet(id);
      } catch (err) {
        console.warn('Failed to fetch full entry details, using list data.', err);
      }
      
      try {
        const r = res.data || res || {};
        const fallback = (window.__cpentries || {})[String(id)] || {};
        const entry = { ...fallback, ...r };

        const lang = document.documentElement.getAttribute('lang') === 'he' ? 'he' : 'en';
        
        const details = [];
        const cols = currentCols || [];
        
        // Push all columns from the dashboard headers, using '—' for empty ones
        cols.forEach(c => {
          if (c === 'title' || c === 'name') return;
          
          const cf = customFieldsMap[c];
          let title = c.replace(/_/g, ' ');
          if (cf && cf[lang]) title = cf[lang];
          else if (cf && cf.label) title = cf.label;

          let val = entry[c];
          if (val === undefined && entry.custom_fields) val = entry.custom_fields[c];
          val = val ?? entry[`${c}_label`] ?? entry[`${c}_name`] ?? '';
          
          if (cf && cf.options && typeof cf.options === 'object' && val !== '') {
              try {
                  const parsed = JSON.parse(val);
                  if (Array.isArray(parsed)) {
                      val = parsed.map(v => cf.options[v] || v).join(', ');
                  } else {
                      val = cf.options[val] || val;
                  }
              } catch(e) {
                  val = cf.options[val] || val;
              }
          }

          if (val !== undefined && val !== null && val !== '') {
            details.push({ label: title, value: val });
          }
        });
        
        // Add any extra custom fields that were not part of the standard dashboard columns
        const cfs = entry.custom_fields || {};
        Object.entries(cfs).forEach(([k, v]) => {
          if (cols.includes(k)) return;
          const cf = customFieldsMap[k];
          let title = k.replace(/_/g, ' ');
          if (cf && cf[lang]) title = cf[lang];
          if (v !== undefined && v !== null && v !== '') {
             details.push({ label: title, value: v });
          }
        });

        const gridHtml = details.map(d => {
           return `<div class="proj-detail-row">
             <div class="proj-detail-label">${Layout.escapeHtml(d.label)}</div>
             <div class="proj-detail-value">${Layout.escapeHtml(String(d.value))}</div>
           </div>`;
        }).join('');

        const body = overlay.querySelector('.proj-detail-body');
        const headTitle = overlay.querySelector('#proj-detail-title');
        
        if (!body || !headTitle) return;

        const entryWord = I18n.t('entries.entry') === 'entries.entry' ? 'Entry' : I18n.t('entries.entry');
        headTitle.textContent = `${entryWord} #${Layout.escapeHtml(String(entry.id || entry.row_id || id))}`;

        body.style.padding = '0';
        body.innerHTML = `
          <div style="padding: 1.5rem 1.5rem 2.5rem 1.5rem;">
            <div class="proj-detail-hero">
              <div class="proj-detail-hero-main">
                <div class="proj-board-name">${Layout.escapeHtml(entry.title || entry.name || entryWord)}</div>
                <div class="proj-board-meta">${Layout.escapeHtml(entry.status_label || entry.status || '')}</div>
              </div>
            </div>
            <div class="proj-detail-grid">
              ${gridHtml}
            </div>
          </div>
          <div class="proj-modal-foot proj-modal-foot-end" style="padding: 1rem 1.5rem; border-top: 1px solid var(--border); background: var(--bg-muted); border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;">
            <button type="button" class="btn btn-secondary" data-close>${I18n.t('close', 'Close')}</button>
          </div>
        `;

        body.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', () => {
           overlay.hidden = true;
           overlay.innerHTML = '';
        }));
        
        body.querySelectorAll('[data-edit-entry]').forEach((btn) => btn.addEventListener('click', () => {
           openEntryForm(entry);
        }));
      } catch (err) {
        Toast.error(err.message || I18n.t('failedToLoad'));
        overlay.hidden = true;
        overlay.innerHTML = '';
      }
    }

    function openEntryForm(entry) {
      if (!entry) return;
      const overlay = document.getElementById('project-modal');
      overlay.hidden = false;
      
      const lang = document.documentElement.getAttribute('lang') === 'he' ? 'he' : 'en';
      
      let fieldsHtml = '';
      const cfs = Object.values(customFieldsMap || {});
      let fieldsList = cfs.length ? cfs : currentCols.map(c => ({ name: c }));
      
      const IGNORED_FIELDS = ['id', 'row_id', 'custom_fields', 'date_created', 'created_date', 'date_updated', 'updated_at', 'creator', 'owner'];
      fieldsList = fieldsList.filter(cf => {
         const fn = cf.name || cf.id || cf.key || cf.field_key || '';
         if (!fn) return false;
         if (IGNORED_FIELDS.includes(fn)) return false;
         if (fn.endsWith('_label') || fn.endsWith('_name')) return false;
         if (cf.type === 'formula' || cf.type === 'file') return false;
         return true;
      });
      
      if (!fieldsList.length) {
         fieldsHtml = `<p class="muted">No editable fields configured.</p>`;
      } else {
         fieldsHtml = fieldsList.map(cf => {
           const fieldName = cf.name || cf.id || cf.key || cf.field_key || '';
           const label = Layout.escapeHtml(cf[lang] || cf.title || fieldName.replace(/_/g, ' '));
           const val = entry[fieldName] ?? entry[`${fieldName}_label`] ?? (entry.custom_fields && entry.custom_fields[fieldName]) ?? '';
           return `
             <div class="form-group mb-1">
               <label class="form-label">${label}</label>
               <input class="form-control" name="${Layout.escapeHtml(fieldName)}" value="${Layout.escapeHtml(String(val))}" />
             </div>
           `;
         }).join('');
      }

      overlay.innerHTML = `
        <div class="proj-modal-backdrop" data-close></div>
        <div class="proj-modal proj-modal-detail" role="dialog" aria-modal="true">
          <div class="proj-modal-head">
            <h2>${I18n.t('edit', 'Edit')}</h2>
          </div>
          <div class="proj-detail-body" style="padding: 1.5rem;">
             <form id="entry-form">
               ${fieldsHtml}
               <div class="flex gap-1 mt-2" style="justify-content: flex-end;">
                 <button type="button" class="btn btn-secondary" data-close>${I18n.t('cancel', 'Cancel')}</button>
                 <button type="submit" class="btn btn-primary">${I18n.t('save', 'Save')}</button>
               </div>
             </form>
          </div>
        </div>
      `;

      overlay.querySelectorAll('[data-close]').forEach(node => {
        node.addEventListener('click', () => {
          overlay.hidden = true;
          overlay.innerHTML = '';
        });
      });

      const form = overlay.querySelector('#entry-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const prevText = btn.textContent;
        btn.textContent = I18n.t('loading', 'Loading...');
        btn.disabled = true;

        try {
          const formData = new FormData(form);
          const data = {};
          
          for (let [key, value] of formData.entries()) {
             let origVal = entry[key] ?? entry.custom_fields?.[key] ?? '';
             if (String(value) !== String(origVal)) {
                data[key] = value;
             }
          }

          if (Object.keys(data).length > 0) {
             await API.entryUpdate(entry.id || entry.row_id, data);
          }
          Toast.success(I18n.t('saved', 'Saved'));
          
          overlay.hidden = true;
          overlay.innerHTML = '';
          loadList();
        } catch(err) {
          if (err.code === 'unknown_parameter' && err.data?.unknown?.length) {
              const badFields = err.data.unknown.map(f => {
                  const cf = customFieldsMap[f];
                  return cf ? (cf[lang] || cf.title || (cf.name || f).replace(/_/g, ' ')) : f;
              }).join(', ');
              Toast.error(`The following fields are read-only: ${badFields}`);
          } else {
              Toast.error(err.message || I18n.t('failedToLoad'));
          }
          btn.textContent = prevText;
          btn.disabled = false;
        }
      });
    }

    try {
      Layout.render({ active: 'entries', titleKey: 'nav.entries' });
      init();
    } catch(e) {
      document.body.innerHTML = '<div style="color:red;padding:2rem;"><b>CRASH:</b> ' + e.message + '<br><pre>' + e.stack + '</pre></div>';
    }