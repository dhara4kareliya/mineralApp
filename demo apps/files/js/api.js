/**
 * Biz1 API client for Files Data app.
 */
const Api = (function () {
  let client = null;
  let sdkLoaded = false;
  let basicCache = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  async function ensureSdk(domain) {
    const base = String(domain || AppConfig.getDomain()).replace(/\/+$/, '');
    if (!sdkLoaded || !window.Biz1SDK) {
      await loadScript(base + '/app/sdk/biz1-sdk.js');
      sdkLoaded = true;
    }
    if (!window.io) {
      await loadScript(base + '/realtime/socket.io/socket.io.js');
    }
    return base;
  }

  async function init(domain) {
    const base = await ensureSdk(domain || AppConfig.getDomain());
    client = new Biz1SDK.Biz1Client({
      domain: base,
      storage: localStorage,
      io: window.io
    });
    return client;
  }

  function getClient() {
    if (!client) throw new Error('API not initialized. Please sign in.');
    return client;
  }

  function isLoggedIn() {
    try {
      return !!(client && client.getToken());
    } catch (_) {
      return false;
    }
  }

  function rowsFrom(raw) {
    if (!raw || typeof raw !== 'object') return [];
    if (Array.isArray(raw.rows)) return raw.rows;
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw.records)) return raw.records;
    if (Array.isArray(raw.files)) return raw.files;
    if (Array.isArray(raw.folders)) return raw.folders;
    return [];
  }

  function resolveFileUrl(pathOrUrl) {
    if (!pathOrUrl) return '';
    const value = String(pathOrUrl);
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith('//')) return 'https:' + value;
    const cleaned = value.replace(/^\/+/, '');
    return 'https://files.biz1.co.il/' + cleaned;
  }

  async function login(credentials) {
    const domain = AppConfig.getDomain();
    await init(domain);

    const body = new URLSearchParams({
      username: credentials.username || '',
      password: credentials.password || ''
    });
    if (credentials.otp) body.set('otp', credentials.otp);

    const res = await fetch(domain + '/app/Login', { method: 'POST', body });
    const data = await res.json();

    if (data.otp_required) {
      return { otpRequired: true, message: data.message || 'Enter the verification code.', data };
    }
    if (!data.token) {
      throw new Error(data.message || 'Login failed');
    }

    getClient().setToken(data.token);
    basicCache = await getClient().account.basic();
    try {
      const user = (basicCache && (basicCache.user || (basicCache.data && basicCache.data.user))) || data.user || null;
      localStorage.setItem(AppConfig.STORAGE_KEYS.userCache, JSON.stringify(user || {}));
    } catch (_) { /* ignore */ }

    return { success: true, token: data.token, basic: basicCache, raw: data };
  }

  async function restoreSession() {
    await init(AppConfig.getDomain());
    if (!getClient().getToken()) return false;
    try {
      basicCache = await getClient().account.basic();
      return true;
    } catch (err) {
      if (err && (err.status === 401 || /401|token|unauthorized/i.test(String(err.message || '')))) {
        logout();
      }
      return false;
    }
  }

  function logout() {
    try {
      if (client) client.logout();
    } catch (_) { /* ignore */ }
    basicCache = null;
    localStorage.removeItem(AppConfig.STORAGE_KEYS.userCache);
  }

  function getBasic() {
    return basicCache;
  }

  function getUser() {
    const basic = basicCache || {};
    return basic.user || (basic.data && basic.data.user) || null;
  }

  async function route(name, payload) {
    return getClient().request(name, payload || {});
  }

  async function listFileFolders(filters) {
    const raw = await route('FileFolders.List', Object.assign({
      scope: 'filefolder'
    }, filters || {}));

    let rows = [];
    if (Array.isArray(raw.folders)) rows = raw.folders;
    else if (Array.isArray(raw.data)) rows = raw.data;
    else rows = rowsFrom(raw);

    if (!rows.length && typeof raw.html === 'string' && raw.html.trim()) {
      rows = parseFolderHtml(raw.html);
    }

    const folders = rows.map(normalizeFolder).filter((f) => f.id || f.key);
    const flat = flattenFolders(folders);
    return {
      rows: flat.length ? flat : AppConfig.SYSTEM_FOLDERS.slice(),
      total: Number(raw.count || flat.length) || flat.length,
      raw
    };
  }

  function flattenFolders(folders) {
    const out = [];
    const seen = new Set();
    function walk(list, depth) {
      (list || []).forEach((folder) => {
        const id = String(folder.id || folder.key || '');
        if (!id || seen.has(id)) return;
        seen.add(id);
        out.push(Object.assign({}, folder, { depth: depth != null ? depth : folder.depth }));
        const subs = Array.isArray(folder.sub) ? folder.sub.map(normalizeFolder) : [];
        if (subs.length) walk(subs, (depth || 0) + 1);
      });
    }
    walk(folders, 0);
    return out;
  }

  function parseFolderHtml(html) {
    const rows = [];
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('[data-id], [data-folder-id], option, .folder-row, tr').forEach((el) => {
        const id = el.getAttribute('data-id') || el.getAttribute('data-folder-id') || el.getAttribute('value') || '';
        const name = (el.getAttribute('data-name') || el.textContent || '').trim();
        if (id && name) rows.push({ id, name });
      });
    } catch (_) { /* ignore */ }
    return rows;
  }

  function normalizeFolder(row) {
    const id = String(row.id || row.folder_id || row.key || row.folder || '');
    const key = String(row.key || row.folder || row.folder_id || row.id || '')
      .trim() || id;
    const name =
      row.name_en ||
      row.name ||
      row.name_he ||
      row.title ||
      row.label ||
      key;
    return {
      id: id || key,
      key,
      name,
      name_en: row.name_en || name,
      name_he: row.name_he || '',
      parent_id: row.parent_id != null ? row.parent_id : 0,
      depth: Number(row.depth || 0),
      has_children: Number(row.has_children || 0),
      is_system: Number(row.is_system || 0),
      type: row.type || key,
      sub: row.sub || row.sub_folders || row.sub_name_en || [],
      raw: row
    };
  }

  async function listCustomers(filters) {
    const payload = Object.assign({
      length: AppConfig.PAGE_SIZE,
      start: 0,
      draw: 1
    }, filters || {});
    const raw = await route('Customer.List', payload);
    return {
      rows: rowsFrom(raw),
      total: Number(raw.count || raw.recordsFiltered || raw.recordsTotal || 0),
      raw
    };
  }

  async function getCustomer(customerId) {
    const raw = await route('Customer.Get', { customer_id: customerId });
    return raw.data || raw.output || raw.customer || raw;
  }

  async function listFiles(options) {
    options = options || {};
    const pageId = Math.max(1, Number(options.page_id || options.page || 1) || 1);
    const limit = Math.min(25, Number(options.limit || AppConfig.PAGE_SIZE) || 25);

    const payload = {
      page_id: String(pageId),
      limit: String(limit)
    };

    // Files.List expects a folder key (e.g. default, email_files).
    // For "all", omit folder so the API can return the full repository list.
    if (options.folder && options.folder !== 'all') {
      payload.folder = String(options.folder);
    }

    if (options.customer_id) {
      payload.customer_id = String(options.customer_id);
      payload.client_id = String(options.customer_id);
    }
    if (options.search) {
      payload.search = String(options.search);
    }

    let raw;
    try {
      raw = await route('Files.List', payload);
    } catch (err) {
      // Some accounts require a folder key — retry with default when browsing "all".
      if (!payload.folder) {
        payload.folder = 'default';
        raw = await route('Files.List', payload);
      } else {
        throw err;
      }
    }

    const rows = rowsFrom(raw).map((row) => normalizeFileRow(row, options));

    return {
      rows,
      total: Number(raw.count || raw.total || raw.recordsFiltered || raw.recordsTotal || rows.length) || rows.length,
      page_id: pageId,
      limit,
      raw
    };
  }

  function normalizeFileRow(row, options) {
    options = options || {};
    const id = row.id || row.file_id || row.document_id || row.doc_id || '';
    const name =
      row.display_name ||
      row.file_name ||
      row.name ||
      row.title ||
      row.notes ||
      row.stored_name ||
      row.file ||
      ('File #' + (id || '?'));
    const path = row.file_url || row.pdf_url || row.url || row.file_path || row.path || row.file || '';
    const url = resolveFileUrl(path);
    const customerId = row.customer_id || row.cust_id || row.client_id || options.customer_id || '';
    const customerName =
      row.client_name ||
      row.customer_name ||
      row.customer ||
      row.cust_name ||
      (typeof row.customer === 'object' && row.customer && row.customer.name) ||
      '';
    const created =
      row.create_date ||
      row.created_at ||
      row.date_created ||
      row.date ||
      row.created ||
      row.upload_date ||
      '';
    const folder = row.folder || row.type || row.folder_name || options.folder || 'default';
    const mime = row.mime || row.mime_type || row.content_type || '';
    const ext = String(
      row.extension ||
      row.thumb_type ||
      extensionFromName(name) ||
      extensionFromName(path) ||
      mimeToExt(mime) ||
      ''
    ).toLowerCase();

    return {
      id: String(id || ''),
      file_id_hex: row.file_id_hex || '',
      name: String(name),
      url,
      path: String(row.file_path || path || ''),
      customer_id: String(customerId || ''),
      customer_name: String(customerName || ''),
      created_at: created,
      folder: String(folder),
      format: (ext || 'FILE').toUpperCase(),
      mime,
      size: row.size || row.file_size || null,
      notes: row.notes || '',
      raw: row,
      is_image: isImageExt(ext),
      is_pdf: ext === 'pdf'
    };
  }

  function extensionFromName(value) {
    const m = String(value || '').match(/\.([a-z0-9]{1,5})(?:\?|#|$)/i);
    return m ? m[1].toLowerCase() : '';
  }

  function mimeToExt(mime) {
    const map = {
      'application/pdf': 'pdf',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'text/plain': 'txt',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
    };
    return map[String(mime || '').toLowerCase()] || '';
  }

  function isImageExt(ext) {
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(String(ext || '').toLowerCase());
  }

  async function viewFile(file) {
    if (file && file.url) return file.url;
    if (file && file.path) return resolveFileUrl(file.path);
    if (file && file.id) {
      try {
        const raw = await route('Documents.View', {
          document_id: file.id,
          file_id: file.id,
          id: file.id
        });
        const url = raw.file_url || raw.output || raw.url || raw.pdf_url || '';
        if (url) return resolveFileUrl(url);
      } catch (_) { /* fall through */ }
    }
    throw new Error('Unable to open this file.');
  }

  async function uploadFile({ customerId, file, fileName, folder, subFolder }) {
    if (!customerId) throw new Error('Select a client before uploading.');
    if (!file) throw new Error('Choose a file to upload.');

    // Files.Upload — multipart FormData (customer_id + file required)
    // https://eli.bull36.com/app/help/Files.Upload
    const body = new FormData();
    body.append('customer_id', String(customerId));
    body.append('file', file, file.name || 'upload.bin');
    if (fileName) body.append('file_name', String(fileName));
    body.append('folder', String(folder || 'default'));
    if (subFolder) body.append('sub_folder', String(subFolder));

    const raw = await getClient().request('Files.Upload', body);
    if (raw && (raw.success === 0 || raw.success === '0')) {
      throw new Error(raw.message || raw.error || 'Upload failed');
    }

    const uploaded = (raw && raw.file) || {};
    return normalizeFileRow({
      id: uploaded.id || raw.document_id || '',
      file_id: uploaded.id || raw.document_id || '',
      customer_id: uploaded.customer_id || customerId,
      client_id: uploaded.customer_id || customerId,
      display_name: uploaded.display_name || fileName || file.name,
      file_url: uploaded.file_url,
      file_path: uploaded.file_path,
      mime: uploaded.mime,
      size: uploaded.size,
      extension: (uploaded.mime && String(uploaded.mime).split('/').pop()) || '',
      folder: uploaded.folder || folder || 'default',
      type: uploaded.folder || folder || 'default',
      create_date: new Date().toISOString()
    }, { customer_id: customerId, folder });
  }

  async function deleteFile(file) {
    if (!file || !file.id) throw new Error('Missing file id.');
    if (!file.customer_id) throw new Error('Missing client id for delete.');
    return route('Files.Delete', {
      customer_id: file.customer_id,
      file_id: file.id,
      id: file.id
    });
  }

  return {
    init,
    login,
    logout,
    restoreSession,
    isLoggedIn,
    getClient,
    getBasic,
    getUser,
    route,
    rowsFrom,
    resolveFileUrl,
    listFileFolders,
    listCustomers,
    getCustomer,
    listFiles,
    viewFile,
    uploadFile,
    deleteFile,
    normalizeFileRow
  };
})();
