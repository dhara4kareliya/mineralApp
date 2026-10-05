Layout.render({ active: 'files', titleKey: 'nav.files' });

    (async function load() {
      const el = document.getElementById('list');
      try {
        const data = await API.filesList({ limit: 25 });
        const folders = data.folders || [];
        const rows = UI.listRows(data);

        const foldersEl = document.getElementById('folders');
        if (folders.length) {
          foldersEl.innerHTML = `<div class="card"><div class="card-title mb-2">${I18n.t('files.folders')}</div>
            <div class="flex wrap gap-1">${folders
              .map((f) => `<span class="badge badge-info">${Layout.escapeHtml(f.name || f.title || I18n.t('files.folder'))}</span>`)
              .join('')}</div></div>`;
        }

        if (!rows.length) {
          Layout.empty(el, I18n.t('files.none'), I18n.t('files.noneHint'));
          return;
        }

        el.innerHTML = `<div class="grid grid-2">${rows
          .map((f) => {
            const path = f.file_url || f.file || f.filename || f.path || '';
            const href = UI.assetUrl(path);
            const name = f.notes || f.name || path.split('/').pop() || I18n.t('files.file');
            return `<div class="card file-row">
              <div class="file-icon">📎</div>
              <div style="min-width:0;flex:1">
                <div class="card-title" style="font-size:.95rem">${Layout.escapeHtml(name)}</div>
                <div class="card-meta">${I18n.t('table.id')} #${f.id}</div>
              </div>
              <a class="btn btn-sm btn-secondary" href="${Layout.escapeHtml(href)}" target="_blank" rel="noopener">${I18n.t('open')}</a>
            </div>`;
          })
          .join('')}</div>`;
      } catch (err) {
        Layout.error(el, err.message);
      }
    })();
