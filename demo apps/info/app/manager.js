(function () {
  const API_URL = '/api/manager.php';
  const store = {
    token: 'apps_manager_token',
    apiBase: 'apps_manager_api_base',
    lang: 'apps_manager_lang',
    rememberUser: 'apps_manager_remember_user',
  };

  const text = {
    en: {
      title: 'Hosted Apps',
      subtitle: 'Upload to Dev, request live, and manage hosted apps.',
      accountDomain: 'Account domain',
      username: 'Username',
      usernameOrEmail: 'Username or Email',
      password: 'Password',
      otp: 'OTP code',
      login: 'Log In',
      loginWithPassword: 'Password',
      loginWithToken: 'Token',
      tokenPlaceholder: 'Token',
      tokenRequired: 'Token is required.',
      usernamePasswordRequired: 'Username and password are required.',
      rememberMe: 'Remember me',
      forgotPassword: 'Forgot Password?',
      whatsappLogin: 'Whatsapp Login',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      account: 'Account',
      loggedInAs: 'Logged in as',
      logout: 'Logout',
      allStatuses: 'All statuses',
      active: 'Active',
      dev: 'Dev',
      pending_live: 'Pending live',
      disabled: 'Not active',
      removed: 'Removed',
      adminAll: 'All users',
      appName: 'App name',
      slug: 'Slug',
      description: 'Description',
      descriptionPlaceholder: 'Short app description',
      developer: 'Developer',
      zip: 'Static ZIP',
      upload: 'Upload to Dev',
      saveUpdate: 'Re-upload to Dev',
      cancelEdit: 'Cancel edit',
      editHint: 'Re-upload updates Dev only. Version increases by 1. Use Request to go to live when ready.',
      search: 'Search apps',
      refresh: 'Refresh',
      app: 'App',
      owner: 'Owner',
      status: 'Status',
      version: 'Version',
      versions: 'Versions',
      versionDev: 'Dev',
      versionLive: 'Live',
      versionNone: '—',
      versionToLive: 'To live: v{v}',
      upToDate: 'Up to date',
      requestLiveCol: 'Request live',
      actions: 'Actions',
      open: 'Open',
      openDev: 'Open Dev',
      openLive: 'Open Live',
      openDevVersion: 'Open Dev (v{v})',
      openLiveVersion: 'Open Live (v{v})',
      edit: 'Edit',
      detail: 'Detail',
      detailTitle: 'App details',
      noDescription: 'No description.',
      history: 'History',
      historyTitle: 'Upload history',
      close: 'Close',
      dateTime: 'Date / time',
      event: 'Event',
      target: 'Target',
      actor: 'By',
      emptyHistory: 'No history yet.',
      requestLive: 'Request to go to live',
      requestLiveVersion: 'Request v{v} to live',
      approveLive: 'Approve live',
      approveLiveVersion: 'Approve v{v} live',
      rejectLive: 'Reject',
      waitingAdmin: 'Waiting for admin',
      waitingAdminVersion: 'Waiting for admin (v{v})',
      confirmRequestLive: 'Send this app to live for admin approval?',
      confirmRequestLiveVersion: 'Request Dev v{v} to go live for admin approval?',
      confirmApproveLive: 'Publish this app from Dev to Live?',
      confirmApproveLiveVersion: 'Publish Dev v{v} to Live?',
      confirmRejectLive: 'Reject the live request?',
      disable: 'Disable',
      enable: 'Enable',
      remove: 'Remove',
      loading: 'Loading...',
      saved: 'Saved',
      empty: 'No apps found.',
      event_upload_dev: 'Uploaded to Dev',
      event_create_app: 'App created',
      event_reupload_dev: 'Re-uploaded to Dev',
      event_request_live: 'Requested Live',
      event_approve_live: 'Admin approved Live',
      event_reject_live: 'Admin rejected Live',
      event_disabled: 'Disabled',
      event_enabled: 'Enabled',
    },
    he: {
      title: 'אפליקציות מאוחסנות',
      subtitle: 'העלאה לפיתוח, בקשה ללייב וניהול אפליקציות מאוחסנות.',
      accountDomain: 'דומיין חשבון',
      username: 'שם משתמש',
      usernameOrEmail: 'שם משתמש או אימייל',
      password: 'סיסמה',
      otp: 'קוד OTP',
      login: 'התחברות',
      loginWithPassword: 'סיסמה',
      loginWithToken: 'טוקן',
      tokenPlaceholder: 'טוקן',
      tokenRequired: 'נדרש טוקן.',
      usernamePasswordRequired: 'נדרשים שם משתמש וסיסמה.',
      rememberMe: 'זכור אותי',
      forgotPassword: 'שכחת סיסמא?',
      whatsappLogin: 'התחברות בוואטסאפ',
      showPassword: 'הצג סיסמה',
      hidePassword: 'הסתר סיסמה',
      account: 'חשבון',
      loggedInAs: 'מחובר כ',
      logout: 'יציאה',
      allStatuses: 'כל הסטטוסים',
      active: 'פעיל',
      dev: 'פיתוח',
      pending_live: 'ממתין ללייב',
      disabled: 'לא פעיל',
      removed: 'נמחק',
      adminAll: 'כל המשתמשים',
      appName: 'שם האפליקציה',
      slug: 'כתובת',
      description: 'תיאור',
      descriptionPlaceholder: 'תיאור קצר לאפליקציה',
      developer: 'מפתח',
      zip: 'קובץ ZIP סטטי',
      upload: 'העלה לפיתוח',
      saveUpdate: 'העלה מחדש לפיתוח',
      cancelEdit: 'בטל עריכה',
      editHint: 'העלאה מחדש מעדכנת את הפיתוח בלבד. הגרסה עולה ב-1. שלח בקשה ללייב בלחיצה על הכפתור.',
      search: 'חיפוש אפליקציות',
      refresh: 'רענון',
      app: 'אפליקציה',
      owner: 'בעלים',
      status: 'סטטוס',
      version: 'גרסה',
      versions: 'גרסאות',
      versionDev: 'פיתוח',
      versionLive: 'לייב',
      versionNone: '—',
      versionToLive: 'ללייב: v{v}',
      upToDate: 'מעודכן',
      requestLiveCol: 'בקשה ללייב',
      actions: 'פעולות',
      open: 'פתח',
      openDev: 'פתח פיתוח',
      openLive: 'פתח לייב',
      openDevVersion: 'פתח פיתוח (v{v})',
      openLiveVersion: 'פתח לייב (v{v})',
      edit: 'עריכה',
      detail: 'פרטים',
      detailTitle: 'פרטי אפליקציה',
      noDescription: 'אין תיאור.',
      history: 'היסטוריה',
      historyTitle: 'היסטוריית העלאות',
      close: 'סגור',
      dateTime: 'תאריך / שעה',
      event: 'אירוע',
      target: 'יעד',
      actor: 'על ידי',
      emptyHistory: 'אין היסטוריה עדיין.',
      requestLive: 'בקשה לעבור ללייב',
      requestLiveVersion: 'בקשה ללייב v{v}',
      approveLive: 'אשר לייב',
      approveLiveVersion: 'אשר לייב v{v}',
      rejectLive: 'דחה',
      waitingAdmin: 'ממתין לאישור מנהל',
      waitingAdminVersion: 'ממתין לאישור מנהל (v{v})',
      confirmRequestLive: 'לשלוח את האפליקציה ללייב לאישור מנהל?',
      confirmRequestLiveVersion: 'לבקש לפרסם את פיתוח v{v} ללייב?',
      confirmApproveLive: 'לפרסם את האפליקציה מפיתוח ללייב?',
      confirmApproveLiveVersion: 'לפרסם את פיתוח v{v} ללייב?',
      confirmRejectLive: 'לדחות את הבקשה ללייב?',
      disable: 'כבה',
      enable: 'הפעל',
      remove: 'מחק',
      loading: 'טוען...',
      saved: 'נשמר',
      empty: 'לא נמצאו אפליקציות.',
      event_upload_dev: 'הועלה לפיתוח',
      event_create_app: 'האפליקציה נוצרה',
      event_reupload_dev: 'הועלה מחדש לפיתוח',
      event_request_live: 'בקשה ללייב',
      event_approve_live: 'מנהל אישר לייב',
      event_reject_live: 'מנהל דחה לייב',
      event_disabled: 'כובה',
      event_enabled: 'הופעל',
    },
    ar: {
      title: 'التطبيقات المستضافة',
      subtitle: 'ارفع إلى التطوير، واطلب النشر للإنتاج، وأدر التطبيقات المستضافة.',
      accountDomain: 'نطاق الحساب',
      username: 'اسم المستخدم',
      usernameOrEmail: 'اسم المستخدم أو البريد',
      password: 'كلمة المرور',
      otp: 'رمز OTP',
      login: 'تسجيل الدخول',
      loginWithPassword: 'كلمة المرور',
      loginWithToken: 'رمز',
      tokenPlaceholder: 'رمز',
      tokenRequired: 'الرمز مطلوب.',
      usernamePasswordRequired: 'اسم المستخدم وكلمة المرور مطلوبان.',
      rememberMe: 'تذكرني',
      forgotPassword: 'نسيت كلمة المرور؟',
      whatsappLogin: 'تسجيل الدخول عبر واتساب',
      showPassword: 'إظهار كلمة المرور',
      hidePassword: 'إخفاء كلمة المرور',
      account: 'الحساب',
      loggedInAs: 'مسجل الدخول باسم',
      logout: 'تسجيل الخروج',
      allStatuses: 'كل الحالات',
      active: 'نشط',
      dev: 'تطوير',
      pending_live: 'بانتظار الإنتاج',
      disabled: 'غير نشط',
      removed: 'محذوف',
      adminAll: 'كل المستخدمين',
      appName: 'اسم التطبيق',
      slug: 'المسار',
      description: 'الوصف',
      descriptionPlaceholder: 'وصف مختصر للتطبيق',
      developer: 'المطور',
      zip: 'ملف ZIP ثابت',
      upload: 'رفع إلى التطوير',
      saveUpdate: 'إعادة الرفع إلى التطوير',
      cancelEdit: 'إلغاء التعديل',
      editHint: 'إعادة الرفع تحدث التطوير فقط. يزيد الإصدار بمقدار 1. أرسل طلب الإنتاج يدوياً عند الجاهزية.',
      search: 'بحث في التطبيقات',
      refresh: 'تحديث',
      app: 'التطبيق',
      owner: 'المالك',
      status: 'الحالة',
      version: 'الإصدار',
      versions: 'الإصدارات',
      versionDev: 'تطوير',
      versionLive: 'إنتاج',
      versionNone: '—',
      versionToLive: 'للإنتاج: v{v}',
      upToDate: 'محدّث',
      requestLiveCol: 'طلب الإنتاج',
      actions: 'إجراءات',
      open: 'فتح',
      openDev: 'فتح التطوير',
      openLive: 'فتح الإنتاج',
      openDevVersion: 'فتح التطوير (v{v})',
      openLiveVersion: 'فتح الإنتاج (v{v})',
      edit: 'تعديل',
      detail: 'التفاصيل',
      detailTitle: 'تفاصيل التطبيق',
      noDescription: 'لا يوجد وصف.',
      history: 'السجل',
      historyTitle: 'سجل الرفع',
      close: 'إغلاق',
      dateTime: 'التاريخ / الوقت',
      event: 'الحدث',
      target: 'الوجهة',
      actor: 'بواسطة',
      emptyHistory: 'لا يوجد سجل بعد.',
      requestLive: 'طلب الانتقال إلى الإنتاج',
      requestLiveVersion: 'طلب v{v} للإنتاج',
      approveLive: 'اعتماد الإنتاج',
      approveLiveVersion: 'اعتماد v{v} للإنتاج',
      rejectLive: 'رفض',
      waitingAdmin: 'بانتظار موافقة المسؤول',
      waitingAdminVersion: 'بانتظار المسؤول (v{v})',
      confirmRequestLive: 'إرسال هذا التطبيق إلى الإنتاج لموافقة المسؤول؟',
      confirmRequestLiveVersion: 'طلب نشر تطوير v{v} إلى الإنتاج؟',
      confirmApproveLive: 'نشر هذا التطبيق من التطوير إلى الإنتاج؟',
      confirmApproveLiveVersion: 'نشر تطوير v{v} إلى الإنتاج؟',
      confirmRejectLive: 'رفض طلب الإنتاج؟',
      disable: 'تعطيل',
      enable: 'تفعيل',
      remove: 'حذف',
      loading: 'جار التحميل...',
      saved: 'تم الحفظ',
      empty: 'لا توجد تطبيقات.',
      event_upload_dev: 'تم الرفع إلى التطوير',
      event_create_app: 'تم إنشاء التطبيق',
      event_reupload_dev: 'إعادة الرفع إلى التطوير',
      event_request_live: 'طلب الإنتاج',
      event_approve_live: 'المسؤول اعتمد الإنتاج',
      event_reject_live: 'المسؤول رفض الإنتاج',
      event_disabled: 'تم التعطيل',
      event_enabled: 'تم التفعيل',
    },
  };

  const COOKIE_TOKEN_NAMES = [
    'token',
    'JWT_COOKIE',
    'biz1_token',
    'auth_token',
    'access_token',
    'Authorization',
  ];

  let state = {
    token: localStorage.getItem(store.token) || '',
    apiBase: localStorage.getItem(store.apiBase) || 'https://eli.bull36.com',
    lang: localStorage.getItem(store.lang) || 'en',
    loginMode: 'password',
    context: null,
    editingSlug: '',
  };

  const $ = (id) => document.getElementById(id);
  const t = (key) => (text[state.lang] && text[state.lang][key]) || text.en[key] || key;
  const tf = (key, vars = {}) => Object.entries(vars).reduce((out, [name, value]) => out.replaceAll(`{${name}}`, String(value)), t(key));

  function normalizeToken(raw) {
    return String(raw || '').trim().replace(/^\s*Bearer\s+/i, '');
  }

  function getCookie(name) {
    const parts = (`; ${document.cookie || ''}`).split(`; ${name}=`);
    if (parts.length < 2) return '';
    return decodeURIComponent(parts.pop().split(';').shift() || '');
  }

  function readUrlToken() {
    try {
      const params = new URLSearchParams(location.search);
      return normalizeToken(params.get('token') || '');
    } catch (e) {
      return '';
    }
  }

  function readCookieToken() {
    for (const name of COOKIE_TOKEN_NAMES) {
      const value = normalizeToken(getCookie(name));
      if (value) return value;
    }
    return '';
  }

  function readExternalToken() {
    return readUrlToken() || readCookieToken();
  }

  function clearUrlToken() {
    try {
      const url = new URL(location.href);
      if (!url.searchParams.has('token')) return;
      url.searchParams.delete('token');
      history.replaceState({}, '', url.pathname + url.search + url.hash);
    } catch (e) {}
  }

  function setLoginMode(mode) {
    state.loginMode = mode === 'token' ? 'token' : 'password';
    document.querySelectorAll('[data-login-mode]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.loginMode === state.loginMode);
    });
    const passwordFields = $('password-fields');
    const tokenFields = $('token-fields');
    if (passwordFields) passwordFields.hidden = state.loginMode !== 'password';
    if (tokenFields) tokenFields.hidden = state.loginMode !== 'token';
    const username = $('login-username-input');
    const password = $('login-password-input');
    const tokenInput = $('login-token-input');
    if (username) username.required = state.loginMode === 'password';
    if (password) password.required = state.loginMode === 'password';
    if (tokenInput) tokenInput.required = state.loginMode === 'token';
  }

  function applyLang() {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'he' || state.lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    updateUploadModeUi();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function loginDisplayName(ctx) {
    if (!ctx) return '';
    if (ctx.login_username) return ctx.login_username;
    const user = ctx.user || {};
    return user.name || user.user_name || user.username || user.email || String(user.id || '');
  }

  function developerLabel(row) {
    if (row.developer_name) return row.developer_name;
    const id = Number(row.user_id || 0);
    const members = (state.context && state.context.team_members) || [];
    const member = members.find((m) => Number(m.id) === id);
    if (member) return member.name || member.user_name || member.email || String(id);
    if (state.context && Number(state.context.user?.id) === id) return loginDisplayName(state.context);
    return id ? String(id) : '';
  }

  function pendingLiveVersion(row) {
    return Number(
      row.pending_version
      || row.pending_live_version
      || (row.stage === 'pending_live' ? (row.dev_version || row.version || 1) : 0)
      || 0
    );
  }

  function resolvedLiveVersion(row) {
    let live = Number(row.live_version || 0);
    if (live > 0) return live;
    const stage = row.stage || '';
    const status = row.display_status || row.status || '';
    const dev = Number(row.dev_version || row.version || 0);
    // Active/live apps with a Live URL but missing live_version: treat current Dev as Live.
    if (row.live_url && stage === 'live') return dev;
    if (row.live_url && status === 'active' && stage !== 'pending_live' && stage !== 'dev') return dev;
    return 0;
  }

  function requestableVersions(row) {
    const liveVersion = resolvedLiveVersion(row);
    const devVersion = Number(row.dev_version || row.version || 1);
    if (Array.isArray(row.request_versions) && row.request_versions.length) {
      return row.request_versions.map(Number).filter((v) => v > liveVersion && v <= devVersion);
    }
    // Live URL exists but live_version unknown: only offer the latest Dev version.
    if (row.live_url && liveVersion === 0) {
      return devVersion > 0 ? [devVersion] : [];
    }
    const list = [];
    for (let v = liveVersion + 1; v <= devVersion; v += 1) list.push(v);
    return list;
  }

  function versionCell(row) {
    const devVersion = Number(row.dev_version || row.version || 1);
    const liveVersion = resolvedLiveVersion(row);
    const pendingVersion = pendingLiveVersion(row);
    const liveText = liveVersion > 0 ? `v${liveVersion}` : t('versionNone');
    const pendingLine = row.stage === 'pending_live' && pendingVersion > 0
      ? `<small class="version-pending">${escapeHtml(tf('versionToLive', { v: pendingVersion }))}</small>`
      : '';
    return `<div class="version-cell">
      <small>${escapeHtml(t('versionDev'))}: <strong>v${escapeHtml(devVersion)}</strong></small>
      <small>${escapeHtml(t('versionLive'))}: <strong>${escapeHtml(liveText)}</strong></small>
      ${pendingLine}
    </div>`;
  }

  function requestLiveCell(row) {
    const removed = (row.status || '') === 'removed';
    if (removed) return '';
    const stage = row.stage || '';
    const pendingVersion = pendingLiveVersion(row);
    const isAdmin = (state.context && state.context.user?.id === row.owner_id);
    // Production: const isAdmin = !!(state.context && state.context.is_super_admin);

    // After a live request is sent, hide all request buttons and show waiting / admin actions.
    if (stage === 'pending_live') {
      const version = pendingVersion || Number(row.dev_version || row.version || 1);
      if (isAdmin) {
        return `<div class="request-live-cell">
          <button type="button" class="approve" data-action="approve_live" ${rowMeta(row)} data-request-version="${version}">${tf('approveLiveVersion', { v: version })}</button>
          <button type="button" data-action="reject_live" ${rowMeta(row)} data-request-version="${version}">${t('rejectLive')}</button>
        </div>`;
      }
      return `<div class="request-live-cell"><span class="waiting">${tf('waitingAdminVersion', { v: version })}</span></div>`;
    }

    const versions = requestableVersions(row);
    if (!versions.length) {
      return `<div class="request-live-cell"><span class="up-to-date">${escapeHtml(t('upToDate'))}</span></div>`;
    }
    return `<div class="request-live-cell">${versions.map((v) =>
      `<button type="button" class="request" data-action="request_live" ${rowMeta(row)} data-request-version="${v}">${tf('requestLiveVersion', { v })}</button>`
    ).join('')}</div>`;
  }

  async function request(action, body = new FormData()) {
    if (!(body instanceof FormData)) {
      const form = new FormData();
      Object.entries(body).forEach(([key, value]) => form.set(key, value));
      body = form;
    }
    body.set('action', action);
    body.set('api_base', state.apiBase);
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

  function updateUploadModeUi() {
    const editing = !!state.editingSlug;
    $('edit-mode').value = editing ? '1' : '';
    $('upload-submit').textContent = editing ? t('saveUpdate') : t('upload');
    $('cancel-edit').hidden = !editing;
    $('edit-hint').hidden = !editing;
    $('app-slug').readOnly = editing;
    $('app-zip').required = true;
  }

  function resetUploadForm() {
    state.editingSlug = '';
    $('upload-form').reset();
    updateUploadModeUi();
  }

  function startEdit(row) {
    state.editingSlug = row.app_slug;
    $('app-name').value = row.app_name || row.app_slug || '';
    $('app-slug').value = row.app_slug || '';
    $('app-description').value = row.description || '';
    $('app-zip').value = '';
    updateUploadModeUi();
    const panel = $('upload-panel');
    if (panel) panel.open = true;
    panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function loginWithToken(token, apiBase) {
    const clean = normalizeToken(token);
    if (!clean) throw new Error(t('tokenRequired'));
    state.apiBase = (apiBase || state.apiBase || '').replace(/\/+$/, '') || state.apiBase;
    state.token = clean;
    localStorage.setItem(store.token, state.token);
    localStorage.setItem(store.apiBase, state.apiBase);
    clearUrlToken();
    await initApp();
  }

  async function login(form) {
    const body = new FormData(form);
    state.apiBase = body.get('api_base') || state.apiBase;
    if (state.loginMode === 'token') {
      await loginWithToken(body.get('token'), state.apiBase);
      return;
    }
    const username = String(body.get('username') || '').trim();
    const password = String(body.get('password') || '');
    if (!username || !password) throw new Error(t('usernamePasswordRequired'));
    const remember = !!$('login-remember')?.checked;
    if (remember) localStorage.setItem(store.rememberUser, username);
    else localStorage.removeItem(store.rememberUser);
    const data = await request('login', body);
    if (data.otp_required) {
      $('otp-row').hidden = false;
      setMessage($('login-message'), data.message || t('otp'));
      return;
    }
    if (!data.token) throw new Error(data.message || 'Login failed');
    await loginWithToken(data.token, state.apiBase);
  }

  function syncUploadPanelForViewport() {
    const panel = $('upload-panel');
    if (!panel) return;
    if (window.matchMedia('(max-width: 980px)').matches) {
      if (!state.editingSlug) panel.open = false;
    } else {
      panel.open = true;
    }
  }

  async function initApp() {
    document.documentElement.classList.add('has-session', 'is-loading');
    document.documentElement.classList.remove('app-ready', 'ready');
    $('login-panel').hidden = true;
    $('app-panel').hidden = false;
    try {
      state.context = await request('context');
      $('account-name').textContent = state.context.account || '';
      $('login-username').textContent = loginDisplayName(state.context);
      $('admin-toggle').hidden = !state.context.is_super_admin;
      resetUploadForm();
      syncUploadPanelForViewport();
      await loadApps();
      document.documentElement.classList.remove('is-loading');
      document.documentElement.classList.add('app-ready', 'ready');
    } catch (err) {
      document.documentElement.classList.remove('has-session', 'is-loading', 'app-ready', 'ready');
      $('app-panel').hidden = true;
      $('login-panel').hidden = false;
      throw err;
    }
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
    $('apps-body').innerHTML = rows.length
      ? rows.map(renderRow).join('')
      : `<tr class="app-row empty-row"><td data-label="" colspan="7">${t('empty')}</td></tr>`;
    setMessage($('list-message'), `${rows.length} / ${data.count || rows.length}`, 'ok');
  }

  function rowMeta(row) {
    return `data-slug="${escapeHtml(row.app_slug)}" data-name="${escapeHtml(row.app_name || row.app_slug)}" data-owner="${escapeHtml(row.owner_id || '')}" data-username="${escapeHtml(row.username || '')}" data-description="${escapeHtml(row.description || '')}" data-version="${escapeHtml(row.dev_version || row.version || '1')}" data-live-version="${escapeHtml(row.live_version || '0')}"`;
  }

  function renderRow(row) {
    const status = row.status || 'active';
    const stage = row.stage || (status === 'active' ? 'live' : 'dev');
    const badge = row.display_status || (status === 'removed' || status === 'disabled' ? status : stage);
    const toggleAction = status === 'active' ? 'disabled' : 'active';
    const removed = status === 'removed';
    const urls = [];
    if (row.dev_url) urls.push(`<small>Dev: <a href="${escapeHtml(row.dev_url)}" target="_blank" rel="noopener">${escapeHtml(row.dev_url)}</a></small>`);
    if (row.live_url) urls.push(`<small>Live: <a href="${escapeHtml(row.live_url)}" target="_blank" rel="noopener">${escapeHtml(row.live_url)}</a></small>`);
    if (!urls.length && row.public_url) urls.push(`<small>${escapeHtml(row.public_url)}</small>`);
    const actions = [];
    const devVersion = Number(row.dev_version || row.version || 1);
    const liveVersion = resolvedLiveVersion(row);
    if (row.dev_url) {
      actions.push(`<a href="${escapeHtml(row.dev_url)}" target="_blank" rel="noopener">${tf('openDevVersion', { v: devVersion })}</a>`);
    }
    if (row.live_url) {
      const liveLabel = liveVersion > 0 ? tf('openLiveVersion', { v: liveVersion }) : t('openLive');
      actions.push(`<a href="${escapeHtml(row.live_url)}" target="_blank" rel="noopener">${liveLabel}</a>`);
    }
    if (!row.dev_url && !row.live_url) {
      actions.push(`<a href="${escapeHtml(row.public_url || '#')}" target="_blank" rel="noopener">${t('open')}</a>`);
    }
    if (!removed) {
      actions.push(`<button type="button" data-action="detail" ${rowMeta(row)}>${t('detail')}</button>`);
      actions.push(`<button type="button" class="edit" data-action="edit" ${rowMeta(row)}>${t('edit')}</button>`);
      actions.push(`<button type="button" data-action="history" ${rowMeta(row)}>${t('history')}</button>`);
    }
    if (!removed && row.live_url) {
      actions.push(`<button type="button" data-action="status" ${rowMeta(row)} data-status="${toggleAction}">${status === 'active' ? t('disable') : t('enable')}</button>`);
    }
    if (!removed) {
      actions.push(`<button type="button" data-action="remove" ${rowMeta(row)}>${t('remove')}</button>`);
    }
    return `<tr class="app-row">
      <td data-label="${escapeHtml(t('app'))}"><strong>${escapeHtml(row.app_name || row.app_slug)}</strong>${urls.join('')}</td>
      <td data-label="${escapeHtml(t('owner'))}">${escapeHtml(row.username || row.owner_id || '')}</td>
      <td data-label="${escapeHtml(t('developer'))}">${escapeHtml(developerLabel(row))}</td>
      <td data-label="${escapeHtml(t('status'))}"><span class="badge ${escapeHtml(badge)}">${escapeHtml(t(badge) || badge)}</span></td>
      <td data-label="${escapeHtml(t('versions'))}">${versionCell(row)}</td>
      <td data-label="${escapeHtml(t('requestLiveCol'))}">${requestLiveCell(row)}</td>
      <td data-label="${escapeHtml(t('actions'))}">
        <div class="row-actions">
          ${actions.join('')}
        </div>
      </td>
    </tr>`;
  }

  async function upload(form) {
    const body = new FormData(form);
    const editing = !!state.editingSlug;
    if (editing) {
      body.set('app_slug', state.editingSlug);
    }
    body.set('status', 'active');
    setMessage($('list-message'), t('loading'));
    const data = await request(editing ? 'update' : 'add', body);
    resetUploadForm();
    await loadApps();
    setMessage($('list-message'), data.message || t('saved'), 'ok');
  }

  function actionPayload(target) {
    const payload = {
      app_slug: target.dataset.slug,
      app_name: target.dataset.name || target.dataset.slug,
    };
    if (target.dataset.owner) payload.owner_id = target.dataset.owner;
    if (target.dataset.username) payload.username = target.dataset.username;
    if (target.dataset.requestVersion) payload.request_version = target.dataset.requestVersion;
    return payload;
  }

  function formatUtc(value) {
    if (!value) return '';
    const iso = /Z$|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value.replace(' ', 'T')}Z`;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  function eventLabel(type) {
    return t(`event_${type}`) || type;
  }

  async function showHistory(target) {
    const dialog = $('history-dialog');
    $('history-app-name').textContent = `${target.dataset.name || target.dataset.slug} · ${target.dataset.slug}`;
    setMessage($('history-message'), t('loading'));
    $('history-body').innerHTML = '';
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', 'open');
    const data = await request('history', {
      app_slug: target.dataset.slug,
      owner_id: target.dataset.owner || '',
      username: target.dataset.username || '',
      limit: '50',
    });
    const rows = data.data || [];
    $('history-body').innerHTML = rows.length
      ? rows.map((event) => `<tr>
          <td>${escapeHtml(formatUtc(event.created_at))}</td>
          <td>v${escapeHtml(event.version || '1')}</td>
          <td>${escapeHtml(eventLabel(event.event_type))}${event.message ? `<small>${escapeHtml(event.message)}</small>` : ''}</td>
          <td>${escapeHtml(event.target || '—')}</td>
          <td>${escapeHtml(event.actor_name || event.actor_user_id || '—')}</td>
        </tr>`).join('')
      : `<tr><td colspan="5">${t('emptyHistory')}</td></tr>`;
    setMessage($('history-message'), `${rows.length}`, 'ok');
  }

  function closeHistory() {
    const dialog = $('history-dialog');
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function showDetail(target) {
    const dialog = $('detail-dialog');
    $('detail-app-name').textContent = `${target.dataset.name || target.dataset.slug} · ${target.dataset.slug}`;
    const description = (target.dataset.description || '').trim();
    $('detail-description').textContent = description || t('noDescription');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', 'open');
  }

  function closeDetail() {
    const dialog = $('detail-dialog');
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  async function rowAction(target) {
    const action = target.dataset.action;
    if (action === 'edit') {
      startEdit({
        app_slug: target.dataset.slug,
        app_name: target.dataset.name,
        description: target.dataset.description || '',
        version: target.dataset.version || '1',
      });
      return;
    }
    if (action === 'detail') {
      showDetail(target);
      return;
    }
    if (action === 'history') {
      await showHistory(target);
      return;
    }
    const confirms = {
      request_live: 'confirmRequestLiveVersion',
      approve_live: 'confirmApproveLiveVersion',
      reject_live: 'confirmRejectLive',
    };
    if (confirms[action]) {
      const version = target.dataset.requestVersion || target.dataset.version || '1';
      const message = action === 'reject_live'
        ? t(confirms[action])
        : tf(confirms[action], { v: version });
      if (!window.confirm(message)) return;
    }
    const payload = actionPayload(target);
    if (action === 'remove') {
      await request('remove', payload);
    } else if (action === 'request_live' || action === 'approve_live' || action === 'reject_live') {
      await request(action, payload);
    } else {
      payload.status = target.dataset.status;
      await request('update', payload);
    }
    await loadApps();
  }

  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.lang = btn.dataset.lang;
      localStorage.setItem(store.lang, state.lang);
      applyLang();
      if (state.token) loadApps().catch(() => {});
    });
  });

  document.querySelectorAll('[data-login-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setLoginMode(btn.dataset.loginMode);
      setMessage($('login-message'), '');
    });
  });

  const passwordToggle = $('password-toggle');
  if (passwordToggle) {
    passwordToggle.addEventListener('click', () => {
      const input = $('login-password-input');
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      passwordToggle.classList.toggle('is-visible', show);
      passwordToggle.setAttribute('aria-label', show ? t('hidePassword') : t('showPassword'));
      passwordToggle.title = show ? t('hidePassword') : t('showPassword');
    });
  }

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

  $('cancel-edit').addEventListener('click', () => resetUploadForm());

  $('apps-body').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    try {
      await rowAction(button);
    } catch (err) {
      setMessage($('list-message'), err.message, 'error');
    }
  });

  $('history-close').addEventListener('click', closeHistory);
  $('history-dialog').addEventListener('click', (event) => {
    if (event.target === $('history-dialog')) closeHistory();
  });
  $('detail-close').addEventListener('click', closeDetail);
  $('detail-dialog').addEventListener('click', (event) => {
    if (event.target === $('detail-dialog')) closeDetail();
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
  setLoginMode('password');
  syncUploadPanelForViewport();
  window.addEventListener('resize', syncUploadPanelForViewport);
  $('upload-panel')?.querySelector('summary')?.addEventListener('click', (event) => {
    if (!window.matchMedia('(max-width: 980px)').matches) {
      event.preventDefault();
    }
  });

  const apiBaseInput = $('login-api-base');
  if (apiBaseInput && state.apiBase) apiBaseInput.value = state.apiBase;

  const remembered = localStorage.getItem(store.rememberUser) || '';
  if (remembered && $('login-username-input')) {
    $('login-username-input').value = remembered;
    if ($('login-remember')) $('login-remember').checked = true;
  }

  const urlToken = !state.token ? readUrlToken() : '';
  const cookieToken = !state.token && !urlToken ? readCookieToken() : '';
  if (urlToken) {
    const tokenInput = $('login-token-input');
    if (tokenInput) tokenInput.value = urlToken;
    setLoginMode('token');
  }

  const bootToken = state.token || urlToken || cookieToken;
  if (bootToken) {
    const boot = state.token
      ? initApp()
      : loginWithToken(bootToken, state.apiBase);
    boot.catch((err) => {
      localStorage.removeItem(store.token);
      state.token = '';
      document.documentElement.classList.remove('has-session', 'is-loading', 'app-ready', 'ready');
      $('login-panel').hidden = false;
      $('app-panel').hidden = true;
      setLoginMode(urlToken || cookieToken ? 'token' : 'password');
      setMessage($('login-message'), err.message || t('tokenRequired'), 'error');
    });
  } else {
    document.documentElement.classList.remove('has-session', 'is-loading', 'app-ready', 'ready');
  }
})();
