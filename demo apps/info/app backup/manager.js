(function () {
  const API_URL = '/api/manager.php';
  const store = {
    token: 'apps_manager_token',
    apiBase: 'apps_manager_api_base',
    lang: 'apps_manager_lang',
  };

  const text = {
    en: {
      title: 'Hosted Apps',
      subtitle: 'Upload, approve, disable, and manage apps on server225.',
      accountDomain: 'Account domain',
      username: 'Username',
      password: 'Password',
      otp: 'OTP code',
      login: 'Login',
      account: 'Account',
      logout: 'Logout',
      allStatuses: 'All statuses',
      active: 'Active',
      disabled: 'Not active',
      removed: 'Removed',
      adminAll: 'All users',
      appName: 'App name',
      slug: 'Slug',
      developer: 'Developer',
      zip: 'Static ZIP',
      upload: 'Upload and approve',
      search: 'Search apps',
      refresh: 'Refresh',
      app: 'App',
      owner: 'Owner',
      status: 'Status',
      version: 'Version',
      actions: 'Actions',
      open: 'Open',
      disable: 'Disable',
      enable: 'Enable',
      remove: 'Remove',
      loading: 'Loading...',
      saved: 'Saved',
      empty: 'No apps found.',
    },
    he: {
      title: 'אפליקציות מאוחסנות',
      subtitle: 'העלאה, אישור, כיבוי וניהול אפליקציות על server225.',
      accountDomain: 'דומיין חשבון',
      username: 'שם משתמש',
      password: 'סיסמה',
      otp: 'קוד OTP',
      login: 'כניסה',
      account: 'חשבון',
      logout: 'יציאה',
      allStatuses: 'כל הסטטוסים',
      active: 'פעיל',
      disabled: 'לא פעיל',
      removed: 'נמחק',
      adminAll: 'כל המשתמשים',
      appName: 'שם האפליקציה',
      slug: 'כתובת',
      developer: 'מפתח',
      zip: 'קובץ ZIP סטטי',
      upload: 'העלה ואשר',
      search: 'חיפוש אפליקציות',
      refresh: 'רענון',
      app: 'אפליקציה',
      owner: 'בעלים',
      status: 'סטטוס',
      version: 'גרסה',
      actions: 'פעולות',
      open: 'פתח',
      disable: 'כבה',
      enable: 'הפעל',
      remove: 'מחק',
      loading: 'טוען...',
      saved: 'נשמר',
      empty: 'לא נמצאו אפליקציות.',
    },
    ar: {
      title: 'التطبيقات المستضافة',
      subtitle: 'رفع واعتماد وتعطيل وإدارة التطبيقات على server225.',
      accountDomain: 'نطاق الحساب',
      username: 'اسم المستخدم',
      password: 'كلمة المرور',
      otp: 'رمز OTP',
      login: 'تسجيل الدخول',
      account: 'الحساب',
      logout: 'تسجيل الخروج',
      allStatuses: 'كل الحالات',
      active: 'نشط',
      disabled: 'غير نشط',
      removed: 'محذوف',
      adminAll: 'كل المستخدمين',
      appName: 'اسم التطبيق',
      slug: 'المسار',
      developer: 'المطور',
      zip: 'ملف ZIP ثابت',
      upload: 'رفع واعتماد',
      search: 'بحث في التطبيقات',
      refresh: 'تحديث',
      app: 'التطبيق',
      owner: 'المالك',
      status: 'الحالة',
      version: 'الإصدار',
      actions: 'إجراءات',
      open: 'فتح',
      disable: 'تعطيل',
      enable: 'تفعيل',
      remove: 'حذف',
      loading: 'جار التحميل...',
      saved: 'تم الحفظ',
      empty: 'لا توجد تطبيقات.',
    },
  };

  let state = {
    token: localStorage.getItem(store.token) || '',
    apiBase: localStorage.getItem(store.apiBase) || 'https://eli.bull36.com',
    lang: localStorage.getItem(store.lang) || 'en',
    context: null,
  };

  const $ = (id) => document.getElementById(id);
  const t = (key) => (text[state.lang] && text[state.lang][key]) || text.en[key] || key;

  function applyLang() {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'he' || state.lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function request(action, body = new FormData()) {
    if (!(body instanceof FormData)) {
      const form = new FormData();
      Object.entries(body).forEach(([key, value]) => form.set(key, value));
      body = form;
    }
    body.set('action', action);
    body.set('api_base', state.apiBase);
    // server225 FastCGI may drop Authorization, so the local manager receives
    // a same-origin HTTPS token copy and forwards it to Biz1 as a real header.
    if (state.token) body.set('token', state.token);
    const headers = {};
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    const res = await fetch(API_URL, { method: 'POST', headers, body });
    const data = await res.json().catch(() => ({ success: 0, message: 'Invalid server response' }));
    if (!res.ok || data.success === 0 || data.success === '0') {
      throw new Error(data.message || data.error || `HTTP ${res.status}`);
    }
    return data;
  }

  function setMessage(el, msg, type = '') {
    el.textContent = msg || '';
    el.className = `message ${type}`.trim();
  }

  async function login(form) {
    const body = new FormData(form);
    state.apiBase = body.get('api_base') || state.apiBase;
    const data = await request('login', body);
    if (data.otp_required) {
      $('otp-row').hidden = false;
      setMessage($('login-message'), data.message || t('otp'));
      return;
    }
    if (!data.token) throw new Error(data.message || 'Login failed');
    state.token = data.token;
    localStorage.setItem(store.token, state.token);
    localStorage.setItem(store.apiBase, state.apiBase);
    await initApp();
  }

  async function initApp() {
    state.context = await request('context');
    $('account-name').textContent = state.context.account || '';
    $('admin-toggle').hidden = !state.context.is_super_admin;
    const select = $('developer-select');
    const members = state.context.team_members || [];
    select.innerHTML = members.length
      ? members.map((m) => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name || m.user_name || m.email || m.id)}</option>`).join('')
      : `<option value="${escapeHtml(state.context.user?.id || '')}">${escapeHtml(state.context.user?.name || state.context.user?.email || 'Current user')}</option>`;
    $('login-panel').hidden = true;
    $('app-panel').hidden = false;
    await loadApps();
  }

  async function loadApps() {
    setMessage($('list-message'), t('loading'));
    const data = await request('list', {
      status: $('status-filter').value,
      search: $('search').value,
      admin_all: $('admin-all').checked ? '1' : '',
      limit: '25',
    });
    const rows = data.data || [];
    $('apps-body').innerHTML = rows.length ? rows.map(renderRow).join('') : `<tr><td colspan="6">${t('empty')}</td></tr>`;
    setMessage($('list-message'), `${rows.length} / ${data.count || rows.length}`, 'ok');
  }

  function renderRow(row) {
    const status = row.status || 'active';
    const toggleAction = status === 'active' ? 'disabled' : 'active';
    return `<tr>
      <td><strong>${escapeHtml(row.app_name || row.app_slug)}</strong><small>${escapeHtml(row.public_url || '')}</small></td>
      <td>${escapeHtml(row.username || row.owner_id || '')}</td>
      <td>${escapeHtml(row.user_id || '')}</td>
      <td><span class="badge ${escapeHtml(status)}">${escapeHtml(t(status) || status)}</span></td>
      <td>${escapeHtml(row.version || '1')}</td>
      <td>
        <div class="row-actions">
          <a href="${escapeHtml(row.public_url || '#')}" target="_blank" rel="noopener">${t('open')}</a>
          <button type="button" data-action="status" data-slug="${escapeHtml(row.app_slug)}" data-name="${escapeHtml(row.app_name || row.app_slug)}" data-status="${toggleAction}">${status === 'active' ? t('disable') : t('enable')}</button>
          <button type="button" data-action="remove" data-slug="${escapeHtml(row.app_slug)}">${t('remove')}</button>
        </div>
      </td>
    </tr>`;
  }

  async function upload(form) {
    const body = new FormData(form);
    body.set('status', 'active');
    setMessage($('list-message'), t('loading'));
    await request('add', body);
    form.reset();
    await loadApps();
  }

  async function rowAction(target) {
    const slug = target.dataset.slug;
    if (target.dataset.action === 'remove') {
      await request('remove', { app_slug: slug });
    } else {
      await request('update', { app_slug: slug, app_name: target.dataset.name || slug, status: target.dataset.status });
    }
    await loadApps();
  }

  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.lang = btn.dataset.lang;
      localStorage.setItem(store.lang, state.lang);
      applyLang();
    });
  });

  $('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      setMessage($('login-message'), t('loading'));
      await login(event.currentTarget);
    } catch (err) {
      setMessage($('login-message'), err.message, 'error');
    }
  });

  $('upload-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await upload(event.currentTarget);
    } catch (err) {
      setMessage($('list-message'), err.message, 'error');
    }
  });

  $('apps-body').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    try {
      await rowAction(button);
    } catch (err) {
      setMessage($('list-message'), err.message, 'error');
    }
  });

  $('refresh').addEventListener('click', () => loadApps().catch((err) => setMessage($('list-message'), err.message, 'error')));
  $('search').addEventListener('input', () => clearTimeout(window.__appsSearchTimer) || (window.__appsSearchTimer = setTimeout(() => loadApps().catch((err) => setMessage($('list-message'), err.message, 'error')), 250)));
  $('status-filter').addEventListener('change', () => loadApps().catch((err) => setMessage($('list-message'), err.message, 'error')));
  $('admin-all').addEventListener('change', () => loadApps().catch((err) => setMessage($('list-message'), err.message, 'error')));
  $('logout').addEventListener('click', () => {
    localStorage.removeItem(store.token);
    state.token = '';
    location.reload();
  });

  applyLang();
  if (state.token) {
    initApp().catch(() => {
      localStorage.removeItem(store.token);
      state.token = '';
    });
  }
})();
