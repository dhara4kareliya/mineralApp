/**
 * Files Data (Document Repository) — main app.
 */
(async function () {
  I18n.init();
  Theme.init();

  const state = {
    folders: [],
    activeFolder: 'all',
    files: [],
    total: 0,
    page: 1,
    search: '',
    loading: false,
    previewFile: null,
    uploadCustomerId: '',
    uploadCustomerName: '',
    uploadCustomerOptions: []
  };

  const els = {
    folderList: document.getElementById('folderList'),
    fileGrid: document.getElementById('fileGrid'),
    emptyState: document.getElementById('emptyState'),
    loadingState: document.getElementById('loadingState'),
    searchInput: document.getElementById('searchInput'),
    uploadBtn: document.getElementById('uploadBtn'),
    fileInput: document.getElementById('fileInput'),
    folderTitle: document.getElementById('folderTitle'),
    fileCount: document.getElementById('fileCount'),
    userName: document.getElementById('userName'),
    logoutBtn: document.getElementById('logoutBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    sidebar: document.getElementById('sidebar'),
    sidebarBackdrop: document.getElementById('sidebarBackdrop'),
    previewModal: document.getElementById('previewModal'),
    previewFrame: document.getElementById('previewFrame'),
    previewImage: document.getElementById('previewImage'),
    previewTitle: document.getElementById('previewTitle'),
    previewMeta: document.getElementById('previewMeta'),
    previewClose: document.getElementById('previewClose'),
    previewDownload: document.getElementById('previewDownload'),
    uploadModal: document.getElementById('uploadModal'),
    uploadForm: document.getElementById('uploadForm'),
    uploadClose: document.getElementById('uploadClose'),
    uploadCancel: document.getElementById('uploadCancel'),
    uploadSubmit: document.getElementById('uploadSubmit'),
    uploadFolder: document.getElementById('uploadFolder'),
    uploadFileName: document.getElementById('uploadFileName'),
    uploadFileLabel: document.getElementById('uploadFileLabel'),
    uploadError: document.getElementById('uploadError'),
    uploadDropzone: document.getElementById('uploadDropzone'),
    uploadCustomerSearch: document.getElementById('uploadCustomerSearch'),
    uploadCustomerResults: document.getElementById('uploadCustomerResults'),
    uploadSelectedCustomer: document.getElementById('uploadSelectedCustomer'),
    uploadClearCustomer: document.getElementById('uploadClearCustomer'),
    loadMoreBtn: document.getElementById('loadMoreBtn'),
    livePulse: document.getElementById('livePulse')
  };

  document.body.classList.add('auth-checking');
  const ok = await Auth.restoreSession();
  if (!ok) {
    location.replace('login.html');
    return;
  }
  document.body.classList.remove('auth-checking');

  const user = Api.getUser() || {};
  if (els.userName) {
    els.userName.textContent = user.name || user.username || user.email || I18n.t('account');
  }

  I18n.onChange(() => {
    if (els.userName && !(user.name || user.username || user.email)) {
      els.userName.textContent = I18n.t('account');
    }
    renderFolders();
    fillUploadFolders();
    updateFolderTitle();
    renderFiles();
    const pickedFile = els.fileInput.files && els.fileInput.files[0];
    els.uploadFileLabel.textContent = pickedFile ? pickedFile.name : I18n.t('dropFile');
    Realtime.refreshStatus();
  });

  Realtime.connect((event) => {
    const key = String((event && event.key) || '');
    if (/files\.|filefolders\.|documents\./i.test(key)) {
      flashLive();
      refreshFiles({ soft: true });
      if (/filefolders\./i.test(key)) loadFolders();
    }
  });

  bindEvents();
  await Promise.all([loadFolders(), refreshFiles()]);

  function bindEvents() {
    els.logoutBtn.addEventListener('click', () => Auth.logout());
    els.refreshBtn.addEventListener('click', () => refreshFiles());
    els.searchInput.addEventListener('input', debounce(() => {
      state.search = els.searchInput.value.trim();
      state.page = 1;
      refreshFiles();
    }, 350));

    els.uploadBtn.addEventListener('click', () => openUploadModal());
    els.fileInput.addEventListener('change', onUploadFilePicked);

    // Drag & drop for Files.Upload
    ['dragenter', 'dragover'].forEach((evt) => {
      els.uploadDropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        els.uploadDropzone.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach((evt) => {
      els.uploadDropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        els.uploadDropzone.classList.remove('is-dragover');
      });
    });
    els.uploadDropzone.addEventListener('drop', (e) => {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      const dt = new DataTransfer();
      dt.items.add(file);
      els.fileInput.files = dt.files;
      onUploadFilePicked();
    });

    els.uploadCustomerSearch.addEventListener('input', debounce(onUploadCustomerSearch, 300));
    els.uploadClearCustomer.addEventListener('click', clearUploadCustomer);
    els.uploadCancel.addEventListener('click', closeUploadModal);

    els.sidebarBackdrop.addEventListener('click', () => setSidebarOpen(false));

    els.previewClose.addEventListener('click', closePreview);
    els.previewModal.addEventListener('click', (e) => {
      if (e.target === els.previewModal) closePreview();
    });
    els.previewDownload.addEventListener('click', () => {
      if (state.previewFile && state.previewFile.url) {
        triggerDownload(state.previewFile.url, state.previewFile.name);
      }
    });

    els.uploadClose.addEventListener('click', closeUploadModal);
    els.uploadModal.addEventListener('click', (e) => {
      if (e.target === els.uploadModal) closeUploadModal();
    });
    els.uploadForm.addEventListener('submit', onUploadSubmit);

    els.loadMoreBtn.addEventListener('click', async () => {
      state.page += 1;
      await refreshFiles({ append: true });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closePreview();
        closeUploadModal();
        setSidebarOpen(false);
      }
    });
  }

  async function loadFolders() {
    try {
      const result = await Api.listFileFolders();
      state.folders = [
        { id: 'all', key: 'all', name: I18n.t('allFolders') },
        ...result.rows
      ];
    } catch (err) {
      state.folders = [
        { id: 'all', key: 'all', name: I18n.t('allFolders') },
        ...AppConfig.SYSTEM_FOLDERS
      ];
      Toast.show((err && err.message) || I18n.t('usingDefaultFolders'), 'info');
    }
    renderFolders();
    fillUploadFolders();
  }

  function renderFolders() {
    els.folderList.innerHTML = state.folders.map((folder) => {
      const active = String(folder.key || folder.id) === String(state.activeFolder);
      return `
        <button type="button" class="folder-item ${active ? 'is-active' : ''}" data-folder="${escapeHtml(folder.key || folder.id)}" style="${Number(folder.depth) > 0 ? 'padding-inline-start:' + (0.75 + Number(folder.depth) * 0.85) + 'rem' : ''}">
          <span class="folder-icon" aria-hidden="true">${folderIcon(folder.key || folder.id, folder.name_en || folder.name)}</span>
          <span class="folder-name">${escapeHtml(localizedFolderName(folder))}</span>
        </button>
      `;
    }).join('');

    els.folderList.querySelectorAll('[data-folder]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeFolder = btn.getAttribute('data-folder');
        state.page = 1;
        renderFolders();
        updateFolderTitle();
        setSidebarOpen(false);
        refreshFiles();
      });
    });
    updateFolderTitle();
  }

  function fillUploadFolders() {
    const options = state.folders.filter((f) => f.key !== 'all' && f.id !== 'all');
    els.uploadFolder.innerHTML = options.map((f) =>
      `<option value="${escapeHtml(f.key || f.id)}">${escapeHtml(localizedFolderName(f))}</option>`
    ).join('');
    if (state.activeFolder && state.activeFolder !== 'all') {
      els.uploadFolder.value = state.activeFolder;
    } else if (options.length) {
      els.uploadFolder.value = options[0].key || options[0].id;
    }
  }

  function updateFolderTitle() {
    const folder = state.folders.find((f) => String(f.key || f.id) === String(state.activeFolder));
    els.folderTitle.textContent = folder ? localizedFolderName(folder) : I18n.t('files');
  }

  async function refreshFiles(opts) {
    opts = opts || {};
    state.loading = true;
    if (!opts.append && !opts.soft) showLoading(true);

    try {
      const page = opts.append ? state.page : 1;
      if (!opts.append) state.page = 1;

      const result = await Api.listFiles({
        folder: state.activeFolder === 'all' ? undefined : state.activeFolder,
        search: state.search || undefined,
        page_id: page,
        limit: AppConfig.PAGE_SIZE
      });

      if (opts.append) {
        state.files = mergeById(state.files, result.rows);
      } else {
        state.files = result.rows;
      }
      state.total = result.total;
      renderFiles();
    } catch (err) {
      if (!opts.soft) {
        Toast.show((err && err.message) || I18n.t('couldNotLoadFiles'), 'error');
        state.files = [];
        renderFiles();
      }
      if (err && err.status === 401) Auth.logout();
    } finally {
      state.loading = false;
      showLoading(false);
    }
  }

  function mergeById(existing, incoming) {
    const map = new Map();
    [...existing, ...incoming].forEach((row) => {
      map.set(String(row.id || row.url || row.name), row);
    });
    return Array.from(map.values());
  }

  function showLoading(on) {
    els.loadingState.classList.toggle('hidden', !on);
    if (on) {
      els.emptyState.classList.add('hidden');
      els.fileGrid.classList.add('is-dim');
    } else {
      els.fileGrid.classList.remove('is-dim');
    }
  }

  function renderFiles() {
    els.fileCount.textContent = state.total
      ? I18n.t('fileCountOf', { current: state.files.length, total: state.total })
      : (state.files.length === 1
        ? I18n.t('fileCountOne')
        : I18n.t('fileCount', { n: state.files.length }));

    const canMore = state.files.length < state.total && state.files.length > 0;
    els.loadMoreBtn.classList.toggle('hidden', !canMore);

    if (!state.files.length) {
      els.fileGrid.innerHTML = '';
      els.emptyState.classList.remove('hidden');
      return;
    }

    els.emptyState.classList.add('hidden');
    els.fileGrid.innerHTML = state.files.map((file) => fileCardHtml(file)).join('');

    els.fileGrid.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const action = btn.getAttribute('data-action');
        const file = state.files.find((f) => String(f.id) === String(id)) ||
          state.files.find((f) => String(f.url) === String(btn.getAttribute('data-url')));
        if (!file) return;
        if (action === 'view') openPreview(file);
        if (action === 'download') downloadFile(file);
        if (action === 'delete') confirmDelete(file);
      });
    });

    els.fileGrid.querySelectorAll('.file-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        const file = state.files.find((f) => String(f.id) === String(id));
        if (file) openPreview(file);
      });
    });
  }

  function fileCardHtml(file) {
    const thumb = file.is_image && file.url
      ? `<img src="${escapeHtml(file.url)}" alt="" loading="lazy" class="file-thumb-img" />`
      : `<div class="file-thumb-fallback format-${escapeHtml(String(file.format || 'file').toLowerCase())}">${escapeHtml(file.format || 'FILE')}</div>`;

    return `
      <article class="file-card" data-id="${escapeHtml(file.id)}" tabindex="0">
        <div class="file-thumb">${thumb}</div>
        <div class="file-body">
          <h3 class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</h3>
          <p class="file-meta">
            <span>${escapeHtml(file.customer_name || (file.customer_id ? I18n.t('clientNum', { id: file.customer_id }) : I18n.t('noClient')))}</span>
            <span class="dot" aria-hidden="true">·</span>
            <span>${escapeHtml(formatDate(file.created_at))}</span>
          </p>
          <div class="file-tags">
            <span class="tag">${escapeHtml(file.format || 'FILE')}</span>
            <span class="tag tag--muted">${escapeHtml(prettyFolder(file.folder))}</span>
          </div>
        </div>
        <div class="file-actions">
          <button type="button" class="icon-action" data-action="view" data-id="${escapeHtml(file.id)}" title="${escapeHtml(I18n.t('view'))}" aria-label="${escapeHtml(I18n.t('view'))}">
            ${iconEye()}
          </button>
          <button type="button" class="icon-action" data-action="download" data-id="${escapeHtml(file.id)}" data-url="${escapeHtml(file.url)}" title="${escapeHtml(I18n.t('download'))}" aria-label="${escapeHtml(I18n.t('download'))}">
            ${iconDownload()}
          </button>
          <button type="button" class="icon-action icon-action--danger" data-action="delete" data-id="${escapeHtml(file.id)}" title="${escapeHtml(I18n.t('delete'))}" aria-label="${escapeHtml(I18n.t('delete'))}">
            ${iconTrash()}
          </button>
        </div>
      </article>
    `;
  }

  function prettyFolder(value) {
    if (!value) return I18n.t('defaultFolder');
    const found = state.folders.find((f) => String(f.key) === String(value) || String(f.id) === String(value));
    if (found) return localizedFolderName(found);
    return I18n.folderName(value, String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
  }

  function localizedFolderName(folder) {
    if (!folder) return I18n.t('defaultFolder');
    const key = folder.key || folder.id;
    if (String(key) === 'all') return I18n.t('allFolders');
    if (I18n.getLang() === 'he' && folder.name_he) return folder.name_he;
    // Resolve by key, English name, or Hebrew/display name (API often uses numeric ids)
    return I18n.folderName(key, folder.name_en || folder.name);
  }

  function onUploadFilePicked() {
    const file = els.fileInput.files && els.fileInput.files[0];
    if (file) {
      els.uploadFileLabel.textContent = file.name;
      els.uploadDropzone.classList.add('has-file');
      if (!els.uploadFileName.value.trim()) {
        els.uploadFileName.placeholder = file.name;
      }
    } else {
      els.uploadFileLabel.textContent = I18n.t('dropFile');
      els.uploadDropzone.classList.remove('has-file');
    }
  }

  function setUploadError(message) {
    if (!message) {
      els.uploadError.classList.add('hidden');
      els.uploadError.textContent = '';
      return;
    }
    els.uploadError.textContent = message;
    els.uploadError.classList.remove('hidden');
  }

  function setUploadCustomer(id, name) {
    state.uploadCustomerId = id;
    state.uploadCustomerName = name;
    els.uploadSelectedCustomer.querySelector('.chip-label').textContent = name;
    els.uploadSelectedCustomer.classList.remove('hidden');
    els.uploadCustomerSearch.value = '';
    els.uploadCustomerResults.classList.add('hidden');
    els.uploadCustomerResults.innerHTML = '';
    const field = els.uploadCustomerSearch.closest('.field');
    if (field) field.classList.add('has-upload-client');
  }

  function clearUploadCustomer() {
    state.uploadCustomerId = '';
    state.uploadCustomerName = '';
    els.uploadSelectedCustomer.classList.add('hidden');
    const field = els.uploadCustomerSearch.closest('.field');
    if (field) field.classList.remove('has-upload-client');
    els.uploadCustomerSearch.value = '';
    els.uploadCustomerResults.classList.add('hidden');
  }

  async function onUploadCustomerSearch() {
    const q = els.uploadCustomerSearch.value.trim();
    if (q.length < 2) {
      els.uploadCustomerResults.classList.add('hidden');
      els.uploadCustomerResults.innerHTML = '';
      return;
    }
    try {
      const result = await Api.listCustomers({
        search: q,
        'search[value]': q,
        filter_data: q,
        length: 10
      });
      state.uploadCustomerOptions = result.rows || [];
      if (!state.uploadCustomerOptions.length) {
        els.uploadCustomerResults.innerHTML = '<div class="dropdown-empty">' + escapeHtml(I18n.t('noClientsFound')) + '</div>';
        els.uploadCustomerResults.classList.remove('hidden');
        return;
      }
      els.uploadCustomerResults.innerHTML = state.uploadCustomerOptions.map((c) => {
        const id = c.customer_id || c.id || c.cust_id;
        const name = c.name || c.customer_name || c.full_name || I18n.t('clientNum', { id });
        return `<button type="button" class="dropdown-item" data-customer-id="${escapeHtml(id)}" data-customer-name="${escapeHtml(name)}">${escapeHtml(name)}</button>`;
      }).join('');
      els.uploadCustomerResults.classList.remove('hidden');
      els.uploadCustomerResults.querySelectorAll('[data-customer-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          setUploadCustomer(
            btn.getAttribute('data-customer-id'),
            btn.getAttribute('data-customer-name')
          );
        });
      });
    } catch (err) {
      setUploadError((err && err.message) || I18n.t('clientSearchFailed'));
    }
  }

  function openUploadModal() {
    setUploadError('');
    fillUploadFolders();
    els.uploadFileName.value = '';
    els.fileInput.value = '';
    onUploadFilePicked();
    els.uploadSubmit.classList.remove('is-loading');
    els.uploadSubmit.disabled = false;
    clearUploadCustomer();

    els.uploadModal.classList.remove('hidden');
    els.uploadCustomerSearch.focus();
  }

  function closeUploadModal() {
    els.uploadModal.classList.add('hidden');
    setUploadError('');
    els.uploadCustomerResults.classList.add('hidden');
    els.uploadSubmit.classList.remove('is-loading');
    els.uploadSubmit.disabled = false;
  }

  async function onUploadSubmit(e) {
    e.preventDefault();
    setUploadError('');

    const customerId = state.uploadCustomerId;
    const file = els.fileInput.files && els.fileInput.files[0];
    const folder = els.uploadFolder.value || 'default';
    const fileName = els.uploadFileName.value.trim();

    if (!customerId) {
      setUploadError(I18n.t('selectClientRequired'));
      els.uploadCustomerSearch.focus();
      return;
    }
    if (!file) {
      setUploadError(I18n.t('chooseFile'));
      return;
    }

    els.uploadSubmit.disabled = true;
    els.uploadSubmit.classList.add('is-loading');

    try {
      const uploaded = await Api.uploadFile({
        customerId,
        file,
        fileName: fileName || undefined,
        folder
      });
      uploaded.customer_name = state.uploadCustomerName || uploaded.customer_name;

      // Refresh list when upload folder matches current view
      const viewingAll = state.activeFolder === 'all';
      const sameFolder = String(state.activeFolder) === String(folder);
      if (viewingAll || sameFolder) {
        state.files = [uploaded, ...state.files.filter((f) => String(f.id) !== String(uploaded.id))];
        state.total += 1;
        renderFiles();
      }

      closeUploadModal();
      Toast.show(I18n.t('fileUploaded'), 'success');
      flashLive();

      // Soft refresh to sync with server list
      refreshFiles({ soft: true });
    } catch (err) {
      setUploadError((err && err.message) || I18n.t('uploadFailed'));
    } finally {
      els.uploadSubmit.disabled = false;
      els.uploadSubmit.classList.remove('is-loading');
    }
  }

  async function openPreview(file) {
    state.previewFile = file;
    els.previewTitle.textContent = file.name;
    els.previewMeta.textContent = [
      file.customer_name || (file.customer_id ? I18n.t('clientNum', { id: file.customer_id }) : ''),
      formatDate(file.created_at),
      file.format
    ].filter(Boolean).join(' · ');

    els.previewImage.classList.add('hidden');
    els.previewFrame.classList.add('hidden');
    els.previewModal.classList.remove('hidden');

    try {
      const url = await Api.viewFile(file);
      state.previewFile = Object.assign({}, file, { url });
      if (file.is_image) {
        els.previewImage.src = url;
        els.previewImage.classList.remove('hidden');
      } else {
        els.previewFrame.src = url;
        els.previewFrame.classList.remove('hidden');
      }
    } catch (err) {
      Toast.show((err && err.message) || I18n.t('couldNotOpenFile'), 'error');
      closePreview();
    }
  }

  function closePreview() {
    els.previewModal.classList.add('hidden');
    els.previewFrame.src = 'about:blank';
    els.previewImage.removeAttribute('src');
    state.previewFile = null;
  }

  async function downloadFile(file) {
    try {
      const url = await Api.viewFile(file);
      triggerDownload(url, file.name);
    } catch (err) {
      Toast.show((err && err.message) || I18n.t('downloadFailed'), 'error');
    }
  }

  function triggerDownload(url, name) {
    const a = document.createElement('a');
    a.href = url;
    a.download = name || 'download';
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function confirmDelete(file) {
    if (!file.customer_id) {
      Toast.show(I18n.t('deleteRequiresClient'), 'error');
      return;
    }
    const okDelete = window.confirm(I18n.t('deleteConfirm', { name: file.name }));
    if (!okDelete) return;
    try {
      await Api.deleteFile(file);
      state.files = state.files.filter((f) => String(f.id) !== String(file.id));
      state.total = Math.max(0, state.total - 1);
      renderFiles();
      Toast.show(I18n.t('fileDeleted'), 'success');
      flashLive();
    } catch (err) {
      Toast.show((err && err.message) || I18n.t('deleteFailed'), 'error');
    }
  }

  function setSidebarOpen(open) {
    els.sidebar.classList.toggle('is-open', open);
    els.sidebarBackdrop.classList.toggle('is-open', open);
    document.body.classList.toggle('sidebar-open', open);
  }

  function flashLive() {
    if (!els.livePulse) return;
    els.livePulse.classList.add('is-flash');
    setTimeout(() => els.livePulse.classList.remove('is-flash'), 900);
  }

  function folderIcon(key, name) {
    const k = String(key || '').toLowerCase() + ' ' + String(name || '').toLowerCase();
    if (k.includes('all')) return '▦';
    if (k.includes('whatsapp') || k.includes('whasapp')) return '◎';
    if (k.includes('email') || k.includes('mail')) return '✉';
    if (k.includes('sign')) return '✎';
    if (k.includes('form')) return '☰';
    if (k.includes('pdf') || k.includes('dynamic')) return '▤';
    return '▢';
  }

  function iconEye() {
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  }
  function iconDownload() {
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  }
  function iconTrash() {
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
  }

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }
})();
