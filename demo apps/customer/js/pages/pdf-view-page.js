I18n.init();
    if (!Auth.isLoggedIn()) {
      location.href = 'login.html';
    }

    const name = UI.param('name') || I18n.t('pdf.document');
    document.getElementById('doc-title').textContent = name;
    document.title = `${name} — ${I18n.t('appName')}`;

    async function loadDocument() {
      const viewer = document.getElementById('viewer');
      const item = {
        id: UI.param('id'),
        pdf_signer_id: UI.param('pdf_signer_id'),
        pdf_name: name,
      };
      const srcParam = UI.param('src');
      const base = (window.CP_CONFIG.API_BASE || '').replace(/\/$/, '');
      const candidates = [
        srcParam,
        UI.pdfDocumentUrl(item),
        item.id && item.pdf_signer_id ? `${base}/client/pdf_signer/${item.pdf_signer_id}/${item.id}` : '',
      ].filter(Boolean);

      const headers = {};
      const token = Auth.getToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      for (const url of candidates) {
        try {
          const res = await fetch(url, { method: 'GET', headers, credentials: 'include' });
          if (!res.ok) continue;

          const type = res.headers.get('content-type') || '';
          if (type.includes('pdf') || type.includes('octet-stream')) {
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            viewer.innerHTML = `<embed src="${objectUrl}" type="application/pdf" />`;
            return;
          }

          if (type.includes('html') && res.redirected) {
            viewer.innerHTML = `<iframe src="${url}" title="${name.replace(/"/g, '&quot;')}"></iframe>`;
            return;
          }
        } catch {
          /* try next */
        }
      }

      const fallback = candidates[0];
      if (fallback) {
        viewer.innerHTML = `<iframe src="${fallback}" title="${name.replace(/"/g, '&quot;')}"></iframe>`;
        return;
      }

      viewer.innerHTML = `<div class="pdf-status"><p>${I18n.t('pdf.couldNotLoad')}</p></div>`;
    }

    loadDocument();

    const closeBtn = document.getElementById('pdf-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => window.close());
