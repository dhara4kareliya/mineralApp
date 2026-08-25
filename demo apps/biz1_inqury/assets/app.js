(function () {
  'use strict';

  var LANG_KEY = 'biz1demo_lang';
  var THEME_KEY = 'biz1demo_theme';
  var RESTOCK_TARGET = 10;
  var LOW_THRESHOLD = 5;
  try { localStorage.removeItem('mineralbar_stock_overlay'); } catch (e) { /* ignore */ }
  try { localStorage.removeItem('biz1demo_stock_overlay'); } catch (e) { /* ignore */ }

  function brandName() {
    var cfg = window.Biz1Config && window.Biz1Config.brand;
    if (cfg && (cfg[state.lang] || cfg.en || cfg.he)) {
      return cfg[state.lang] || cfg.en || cfg.he;
    }
    return state.lang === 'he' ? 'תצוגת Biz1' : 'Biz1 Showcase';
  }

  var App = window.Biz1App;

  var I18N = {
    he: {
      pageTitle: 'תצוגת Biz1 — מלאי',
      brandName: 'תצוגת Biz1',
      brandSub: 'התחברות למערכת המלאי',
      loginTitle: 'כניסה לחשבון',
      emailLabel: 'אימייל / שם משתמש / טלפון / מזהה',
      emailPlaceholder: 'email / username / phone / id',
      passwordLabel: 'סיסמה',
      passwordPlaceholder: 'הזן סיסמה',
      togglePassword: 'הצג או הסתר סיסמה',
      otpLabel: 'קוד אימות (OTP)',
      otpPlaceholder: 'הזן קוד',
      rememberMe: 'זכור אותי',
      loginBtn: 'התחבר',
      loginConnecting: 'מתחבר…',
      loginVerifying: 'מאמת…',
      loginVerifyBtn: 'אמת והתחבר',
      loginRefreshing: 'מחדש התחברות…',
      teamUsers: 'משתמשי צוות',
      roleSales: 'מכירות',
      roleService: 'שירות',
      roleTech: 'טכנאי',
      footerNote: 'תצוגת Biz1 · מלאי ומחסן',
      inventoryTitle: 'מלאי',
      logout: 'התנתק',
      search: 'חיפוש',
      searchPlaceholder: 'חיפוש לפי שם, מק״ט או ברקוד',
      statTotal: 'פריטים במלאי',
      statLow: 'מלאי נמוך',
      statOut: 'חסר',
      refresh: 'רענון',
      loadingInventory: 'טוען מלאי…',
      loadingFromServer: 'טוען מהשרת…',
      emptyTitle: 'לא נמצאו פריטים',
      emptySub: 'Products.List · אין תוצאות לסינון הנוכחי',
      itemsCount: '{n} פריטים',
      showingOf: 'מוצגים {shown} מתוך {total}',
      pageOf: 'עמוד {page} מתוך {pages}',
      prevPage: 'הקודם',
      nextPage: 'הבא',
      units: 'יח׳',
      productFallback: 'מוצר #{id}',
      other: 'אחר',
      catAll: 'הכל',
      catHigh: 'במלאי',
      catFilters: 'סננים',
      catDevices: 'מכשירים',
      catParts: 'חלפים',
      catOther: 'אחר',
      catLow: 'מלאי נמוך',
      catOut: 'חסר במלאי',
      levelOk: 'במלאי',
      levelLow: 'נמוך',
      levelOut: 'חסר',
      apiError: 'שגיאת API',
      apiErrorTitle: 'שגיאת Products.List',
      retry: 'נסה שוב',
      errLogin: 'שגיאה בהתחברות',
      errFillFields: 'יש למלא מזהה התחברות וסיסמה',
      errOtp: 'יש להזין קוד אימות (OTP)',
      errOtpRequired: 'נדרש קוד אימות שנשלח אליך',
      errLoginFailed: 'ההתחברות נכשלה',
      errInvalidCredentials: 'שם המשתמש או הסיסמה שגויים.',
      errInvalidOtp: 'קוד האימות שגוי. יש לבדוק ולנסות שוב.',
      errNetwork: 'לא ניתן להתחבר לשרת. יש לבדוק את החיבור ולנסות שוב.',
      errResendFailed: 'שליחת קוד אימות חדש נכשלה. יש לנסות שוב.',
      errRateLimit: 'יותר מדי ניסיונות התחברות. יש להמתין לפני ניסיון נוסף.',
      resendOtp: 'שלח קוד שוב',
      resendOtpIn: 'שלח שוב בעוד',
      resendingOtp: 'שולח שוב…',
      otpResent: 'קוד אימות חדש נשלח אליך',
      tryAgainIn: 'נסה שוב בעוד',
      errSessionExpired: 'פג תוקף ההתחברות — התחבר מחדש',
      scan: 'סריקה',
      scanBarcode: 'סריקת ברקוד',
      scanHint: 'כוון את המצלמה לברקוד',
      manualBarcodePlaceholder: 'הזן ברקוד ידנית',
      lookup: 'חפש',
      back: 'חזרה',
      adjustStock: 'עדכון מלאי',
      currentQty: 'מלאי נוכחי',
      stockIn: 'הכנסה',
      stockOut: 'הוצאה',
      newQty: 'מלאי חדש',
      cancel: 'ביטול',
      confirm: 'אישור',
      saving: 'שומר…',
      stockUpdated: 'המלאי עודכן באתר Biz1',
      stockUpdatedLocal: 'המלאי נשמר מקומית',
      stockSyncFailed: 'עדכון מלאי באתר נכשל — נסה שוב',
      productNotFound: 'מוצר לא נמצא לברקוד זה',
      cameraError: 'לא ניתן לפתוח מצלמה — השתמש בהזנה ידנית',
      lowStockAlert: '{low} מלאי נמוך · {out} חסר',
      createPO: 'צור הזמנה',
      poTitle: 'הזמנת רכש',
      supplierDetails: 'פרטי ספק',
      supplierName: 'שם ספק',
      supplierNamePh: 'שם הספק',
      supplierEmail: 'אימייל ספק',
      supplierPhone: 'טלפון / וואטסאפ',
      poLines: 'שורות הזמנה',
      poEmpty: 'אין פריטים חסרים / נמוכים',
      generatePdf: 'הפק פידיאף',
      sendEmail: 'שלח באימייל',
      sendWhatsapp: 'שלח בוואטסאפ',
      pdfReady: 'פידיאף הורד',
      pdfDate: 'תאריך',
      pdfSku: 'מק״ט',
      pdfProduct: 'מוצר',
      pdfQty: 'כמות',
      needSupplierEmail: 'הזן אימייל ספק',
      needSupplierPhone: 'הזן טלפון וואטסאפ',
      needPoLines: 'אין שורות בהזמנה',
      invalidQty: 'כמות לא תקינה',
      stockOutTooMuch: 'לא ניתן להוציא יותר מהמלאי',
      toggleTheme: 'מצב בהיר / כהה',
      realtimeCreated: 'מוצר חדש נוסף בזמן אמת',
      realtimeUpdated: 'מלאי עודכן בזמן אמת',
      realtimeDeleted: 'מוצר הוסר בזמן אמת',
      realtimeSync: 'המלאי סונכרן מהשרת'
    },
    en: {
      pageTitle: 'Biz1 Showcase — Inventory',
      brandName: 'Biz1 Showcase',
      brandSub: 'Sign in to inventory',
      loginTitle: 'Sign in',
      emailLabel: 'Email / Username / Phone / ID',
      emailPlaceholder: 'email / username / phone / id',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter password',
      togglePassword: 'Show or hide password',
      otpLabel: 'Verification code (OTP)',
      otpPlaceholder: 'Enter code',
      rememberMe: 'Remember me',
      loginBtn: 'Sign in',
      loginConnecting: 'Signing in…',
      loginVerifying: 'Verifying…',
      loginVerifyBtn: 'Verify & Sign in',
      loginRefreshing: 'Refreshing session…',
      teamUsers: 'Team users',
      roleSales: 'Sales',
      roleService: 'Service',
      roleTech: 'Technician',
      footerNote: 'Biz1 Showcase · Inventory & warehouse',
      inventoryTitle: 'Inventory',
      logout: 'Log out',
      search: 'Search',
      searchPlaceholder: 'Search by name, SKU or barcode',
      statTotal: 'Items in stock',
      statLow: 'Low stock',
      statOut: 'Out of stock',
      refresh: 'Refresh',
      loadingInventory: 'Loading inventory…',
      loadingFromServer: 'Loading from server…',
      emptyTitle: 'No items found',
      emptySub: 'Products.List · No results for this filter',
      itemsCount: '{n} items',
      showingOf: 'Showing {shown} of {total}',
      pageOf: 'Page {page} of {pages}',
      prevPage: 'Previous',
      nextPage: 'Next',
      units: 'pcs',
      productFallback: 'Product #{id}',
      other: 'Other',
      catAll: 'All',
      catHigh: 'In stock',
      catFilters: 'Filters',
      catDevices: 'Devices',
      catParts: 'Parts',
      catOther: 'Other',
      catLow: 'Low stock',
      catOut: 'Out of stock',
      levelOk: 'In stock',
      levelLow: 'Low',
      levelOut: 'Out',
      apiError: 'API error',
      apiErrorTitle: 'Products.List error',
      retry: 'Try again',
      errLogin: 'Login error',
      errFillFields: 'Please enter login ID and password',
      errOtp: 'Please enter the OTP code',
      errOtpRequired: 'A verification code was sent to you',
      errLoginFailed: 'Login failed',
      errInvalidCredentials: 'Invalid username or password.',
      errInvalidOtp: 'Invalid OTP. Please check the code and try again.',
      errNetwork: 'Unable to reach the server. Check your connection and try again.',
      errResendFailed: 'Could not resend the OTP. Please try again.',
      errRateLimit: 'Too many login attempts. Please wait before trying again.',
      resendOtp: 'Resend OTP',
      resendOtpIn: 'Resend in',
      resendingOtp: 'Resending…',
      otpResent: 'A new OTP was sent to you',
      tryAgainIn: 'Try again in',
      errSessionExpired: 'Session expired — please sign in again',
      scan: 'Scan',
      scanBarcode: 'Barcode scan',
      scanHint: 'Point the camera at a barcode',
      manualBarcodePlaceholder: 'Enter barcode manually',
      lookup: 'Lookup',
      back: 'Back',
      adjustStock: 'Adjust stock',
      currentQty: 'Current qty',
      stockIn: 'Stock In',
      stockOut: 'Stock Out',
      newQty: 'New qty',
      cancel: 'Cancel',
      confirm: 'Confirm',
      saving: 'Saving…',
      stockUpdated: 'Stock updated on Biz1',
      stockUpdatedLocal: 'Stock saved locally',
      stockSyncFailed: 'Stock sync failed — please try again',
      productNotFound: 'No product found for this barcode',
      cameraError: 'Camera unavailable — use manual entry',
      lowStockAlert: '{low} low · {out} out of stock',
      createPO: 'Create PO',
      poTitle: 'Purchase Order',
      supplierDetails: 'Supplier details',
      supplierName: 'Supplier name',
      supplierNamePh: 'Supplier name',
      supplierEmail: 'Supplier email',
      supplierPhone: 'Phone / WhatsApp',
      poLines: 'Order lines',
      poEmpty: 'No low / out-of-stock items',
      generatePdf: 'Generate PDF',
      sendEmail: 'Send Email',
      sendWhatsapp: 'Send WhatsApp',
      pdfReady: 'PDF downloaded',
      pdfDate: 'Date',
      pdfSku: 'SKU',
      pdfProduct: 'Product',
      pdfQty: 'Qty',
      needSupplierEmail: 'Enter supplier email',
      needSupplierPhone: 'Enter WhatsApp phone',
      needPoLines: 'No lines in the order',
      invalidQty: 'Invalid quantity',
      stockOutTooMuch: 'Cannot remove more than current stock',
      toggleTheme: 'Light / Dark mode',
      realtimeCreated: 'New product added in real time',
      realtimeUpdated: 'Stock updated in real time',
      realtimeDeleted: 'Product removed in real time',
      realtimeSync: 'Inventory synced from server'
    }
  };

  var LEVEL_STYLE = {
    ok:  { tagColor: 'var(--success)', tagBg: 'var(--success-soft)', qtyColor: 'var(--text)' },
    low: { tagColor: 'var(--warn)', tagBg: 'var(--warn-soft)', qtyColor: 'var(--warn)' },
    out: { tagColor: 'var(--danger)', tagBg: 'var(--danger-soft)', qtyColor: 'var(--danger)' }
  };

  var CAT_STYLE = {
    all:      { iconBg: 'color-mix(in srgb, var(--brand) 12%, var(--bg-card))', iconColor: 'var(--brand)' },
    filters:  { iconBg: 'color-mix(in srgb, var(--brand) 12%, var(--bg-card))', iconColor: 'var(--brand)', icon: 'filter' },
    devices:  { iconBg: 'var(--bg-muted)', iconColor: 'var(--brand)', icon: 'device' },
    parts:    { iconBg: 'var(--success-soft)', iconColor: 'var(--success)', icon: 'part' },
    other:    { iconBg: 'var(--bg-muted)', iconColor: 'var(--text-muted)', icon: 'part' },
    low:      { iconBg: 'var(--warn-soft)', iconColor: 'var(--warn)' }
  };

  var state = {
    lang: 'he',
    waitingOtp: false,
    requestInFlight: false,
    requestSource: '',
    cooldownUntil: 0,
    cooldownTimer: null,
    resendCooldownUntil: 0,
    resendCooldownTimer: null,
    products: [],
    totalCount: 0,
    page: 1,
    pageSize: 25,
    cat: 'all',
    query: '',
    searchOpen: false,
    stockMode: 'in',
    stockProduct: null,
    adjustQty: 1,
    poLines: [],
    html5Qr: null,
    scanning: false,
    realtimeWired: false,
    pulseIds: {},
    theme: 'light'
  };

  var pendingProductSync = {};
  var productSyncTimer = null;
  var fullRefreshTimer = null;
  var inventoryPollTimer = null;
  var lastKnownCount = null;

  var els = {
    login: document.getElementById('screenLogin'),
    inventory: document.getElementById('screenInventory'),
    scanner: document.getElementById('screenScanner'),
    po: document.getElementById('screenPO'),
    form: document.getElementById('loginForm'),
    username: document.getElementById('username'),
    usernameWrap: document.getElementById('usernameWrap'),
    password: document.getElementById('password'),
    passwordWrap: document.getElementById('passwordWrap'),
    otp: document.getElementById('otp'),
    otpWrap: document.getElementById('otpWrap'),
    resendOtpBtn: document.getElementById('resendOtpBtn'),
    errorBox: document.getElementById('errorBox'),
    errorText: document.getElementById('errorText'),
    loginBtn: document.getElementById('loginBtn'),
    loginBtnText: document.getElementById('loginBtnText'),
    remember: document.getElementById('remember'),
    body: document.getElementById('inventoryBody'),
    chips: document.getElementById('catChips'),
    statTotal: document.getElementById('statTotal'),
    statLow: document.getElementById('statLow'),
    statOut: document.getElementById('statOut'),
    searchBar: document.getElementById('searchBar'),
    searchInput: document.getElementById('searchInput'),
    userLabel: document.getElementById('userLabel'),
    shell: document.getElementById('appShell'),
    lowBanner: document.getElementById('lowStockBanner'),
    lowBannerText: document.getElementById('lowStockBannerText'),
    stockModal: document.getElementById('stockModal'),
    stockProductName: document.getElementById('stockProductName'),
    stockProductSku: document.getElementById('stockProductSku'),
    stockCurrentQty: document.getElementById('stockCurrentQty'),
    stockNewQty: document.getElementById('stockNewQty'),
    stockAdjustQty: document.getElementById('stockAdjustQty'),
    stockModalError: document.getElementById('stockModalError'),
    modeIn: document.getElementById('modeIn'),
    modeOut: document.getElementById('modeOut'),
    manualBarcode: document.getElementById('manualBarcode'),
    poLines: document.getElementById('poLines'),
    poEmpty: document.getElementById('poEmpty'),
    poSupplierName: document.getElementById('poSupplierName'),
    poSupplierEmail: document.getElementById('poSupplierEmail'),
    poSupplierPhone: document.getElementById('poSupplierPhone'),
    poPdfBtn: document.getElementById('btnPoPdf'),
    poEmailBtn: document.getElementById('btnPoEmail'),
    poWhatsappBtn: document.getElementById('btnPoWhatsapp'),
    toast: document.getElementById('toast'),
    toastText: document.getElementById('toastText')
  };

  function t(key, vars) {
    var dict = I18N[state.lang] || I18N.he;
    var s = dict[key] != null ? dict[key] : (I18N.he[key] || key);
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]));
      });
    }
    return s;
  }

  function catLabel(id) {
    var map = {
      all: 'catAll',
      high: 'catHigh',
      low: 'catLow',
      out: 'catOut',
      filters: 'catFilters',
      devices: 'catDevices',
      parts: 'catParts',
      other: 'catOther'
    };
    return t(map[id] || 'catOther');
  }

  function levelTag(level) {
    if (level === 'low') return t('levelLow');
    if (level === 'out') return t('levelOut');
    return t('levelOk');
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showToast(msg) {
    if (els.toastText) els.toastText.textContent = msg;
    else els.toast.textContent = msg;
    els.toast.classList.add('is-visible');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      els.toast.classList.remove('is-visible');
    }, 2800);
  }

  function pulseElement(el) {
    if (!el) return;
    el.classList.remove('is-pulse');
    void el.offsetWidth;
    el.classList.add('is-pulse');
    clearTimeout(el._pulseT);
    el._pulseT = setTimeout(function () { el.classList.remove('is-pulse'); }, 2400);
  }

  function pulseStats() {
    document.querySelectorAll('.stat-card').forEach(pulseElement);
  }

  function markPulseIds(ids) {
    if (!ids || !ids.length) return;
    ids.forEach(function (id) {
      if (id != null) state.pulseIds[String(id)] = Date.now();
    });
  }

  function applyPendingPulses() {
    var now = Date.now();
    Object.keys(state.pulseIds).forEach(function (id) {
      if (now - state.pulseIds[id] > 4000) {
        delete state.pulseIds[id];
        return;
      }
      var row = null;
      if (els.body) {
        els.body.querySelectorAll('[data-product-id]').forEach(function (el) {
          if (el.getAttribute('data-product-id') === id) row = el;
        });
      }
      pulseElement(row);
    });
  }

  function setTheme(theme) {
    if (theme !== 'dark' && theme !== 'light') theme = 'light';
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
  }

  function toggleTheme() {
    setTheme(state.theme === 'dark' ? 'light' : 'dark');
  }

  function resolveInitialTheme() {
    try {
      var saved = localStorage.getItem(THEME_KEY) || localStorage.getItem('mineralbar_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) { /* ignore */ }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  }

  function applyStaticI18n() {
    I18N.he.brandName = brandName();
    I18N.en.brandName = brandName();
    I18N.he.pageTitle = brandName() + ' — מלאי';
    I18N.en.pageTitle = brandName() + ' — Inventory';
    I18N.he.footerNote = brandName() + ' · מלאי ומחסן';
    I18N.en.footerNote = brandName() + ' · Inventory & warehouse';
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
    document.title = t('pageTitle');
  }

  function syncLangButtons() {
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-lang') === state.lang);
    });
  }

  function setLang(lang) {
    if (lang !== 'he' && lang !== 'en') lang = 'he';
    state.lang = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ }
    var dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    if (els.shell) els.shell.setAttribute('dir', dir);
    document.body.setAttribute('dir', dir);
    applyStaticI18n();
    syncLangButtons();
    renderLoginControls();
    if (!els.inventory.classList.contains('hidden') && state.products.length) renderInventory();
    if (!els.po.classList.contains('hidden')) renderPOLines();
    updateStockNewQty();
  }

  function tickClock() {
    var now = new Date();
    var s = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
    ['clockLogin', 'clockInv', 'clockPO'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = s;
    });
  }

  function showError(msg) {
    els.errorText.textContent = msg || t('errLogin');
    els.errorBox.classList.remove('hidden');
  }
  function clearError() {
    els.errorBox.classList.add('hidden');
    els.errorText.textContent = '';
  }

  function formatCountdown(seconds) {
    var minutes = Math.floor(seconds / 60);
    var secs = String(seconds % 60).padStart(2, '0');
    return String(minutes).padStart(2, '0') + ':' + secs;
  }

  function renderLoginControls() {
    var now = Date.now();
    var rateRemaining = Math.max(0, Math.ceil((state.cooldownUntil - now) / 1000));
    var resendRemaining = Math.max(0, Math.ceil((state.resendCooldownUntil - now) / 1000));

    if (rateRemaining) {
      var countdown = formatCountdown(rateRemaining);
      els.loginBtn.disabled = true;
      els.resendOtpBtn.disabled = true;
      els.loginBtnText.textContent = t('tryAgainIn') + ' ' + countdown;
      els.resendOtpBtn.textContent = t('tryAgainIn') + ' ' + countdown;
      showError(t('errRateLimit') + ' ' + t('tryAgainIn') + ': ' + countdown);
      return;
    }

    els.loginBtn.disabled = state.requestInFlight;
    els.resendOtpBtn.disabled = state.requestInFlight || !state.waitingOtp || resendRemaining > 0;

    if (state.requestInFlight && state.requestSource === 'login') {
      els.loginBtnText.textContent = state.waitingOtp ? t('loginVerifying') : t('loginConnecting');
    } else {
      els.loginBtnText.textContent = state.waitingOtp ? t('loginVerifyBtn') : t('loginBtn');
    }

    if (state.requestInFlight && state.requestSource === 'resend') {
      els.resendOtpBtn.textContent = t('resendingOtp');
    } else if (resendRemaining) {
      els.resendOtpBtn.textContent = t('resendOtpIn') + ' ' + resendRemaining + 's';
    } else {
      els.resendOtpBtn.textContent = t('resendOtp');
    }
  }

  function setRequestBusy(busy, source) {
    state.requestInFlight = busy;
    state.requestSource = busy ? source : '';
    renderLoginControls();
  }

  function startResendCooldown(seconds) {
    state.resendCooldownUntil = Date.now() + Math.max(1, Number(seconds) || 20) * 1000;
    if (state.resendCooldownTimer) clearInterval(state.resendCooldownTimer);
    renderLoginControls();
    state.resendCooldownTimer = setInterval(function () {
      if (Date.now() >= state.resendCooldownUntil) {
        clearInterval(state.resendCooldownTimer);
        state.resendCooldownTimer = null;
        state.resendCooldownUntil = 0;
      }
      renderLoginControls();
    }, 1000);
  }

  function enterOtpMode(message) {
    state.waitingOtp = true;
    els.usernameWrap.classList.add('hidden');
    els.passwordWrap.classList.add('hidden');
    els.otpWrap.classList.remove('hidden');
    showError(message || t('errOtpRequired'));
    startResendCooldown(20);
    els.otp.focus();
  }

  function errorMessage(err) {
    var raw = (err && err.raw) || {};
    return String(
      raw.message || raw.error || raw.error_message ||
      (err && err.message) || ''
    );
  }

  function errorStatus(err) {
    var raw = (err && err.raw) || {};
    return Number((err && err.status) || raw.status || raw.statusCode || 0);
  }

  function getRetrySeconds(err) {
    var raw = (err && err.raw) || {};
    var value = raw.retry_after;
    if (value == null) value = raw.retryAfter;
    if (value == null) value = raw.wait_seconds;
    if (value == null) value = raw.waitSeconds;
    if (value == null && err) value = err.retry_after || err.retryAfter || err.wait_seconds || err.waitSeconds;
    var seconds = Number(value);
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(Math.ceil(seconds), 3600);

    var message = errorMessage(err);
    var minuteMatch = message.match(/wait\s+(\d+)\s+minutes?/i);
    if (minuteMatch) return Math.min(Number(minuteMatch[1]) * 60, 3600);
    var secondMatch = message.match(/wait\s+(\d+)\s+seconds?/i);
    if (secondMatch) return Math.min(Number(secondMatch[1]), 3600);
    if (/wait\s+(?:one|a)\s+minute/i.test(message)) return 60;
    if (errorStatus(err) === 429 || /too many login attempts/i.test(message)) return 60;
    return 0;
  }

  function isNetworkError(err) {
    var message = errorMessage(err);
    return !!(
      (err && err.name === 'TypeError') ||
      errorStatus(err) === 0 && /network|failed to fetch|load failed|timeout|offline|connection/i.test(message)
    );
  }

  function isInvalidCredentialsError(err) {
    var status = errorStatus(err);
    var message = errorMessage(err);
    return status === 400 || status === 401 ||
      /invalid|incorrect|wrong|credential|password|username|user not found|unauthorized|שגוי|סיסמ|משתמש/i.test(message);
  }

  function startLoginCooldown(seconds) {
    seconds = Math.min(Math.max(1, Math.ceil(Number(seconds) || 60)), 3600);
    state.cooldownUntil = Date.now() + seconds * 1000;
    if (state.cooldownTimer) clearInterval(state.cooldownTimer);
    renderLoginControls();
    state.cooldownTimer = setInterval(function () {
      if (Date.now() >= state.cooldownUntil) {
        clearInterval(state.cooldownTimer);
        state.cooldownTimer = null;
        state.cooldownUntil = 0;
        clearError();
      }
      renderLoginControls();
    }, 1000);
  }

  function showClassifiedError(err, source) {
    var retrySeconds = getRetrySeconds(err);
    if (retrySeconds) {
      startLoginCooldown(retrySeconds);
      return;
    }
    if (isNetworkError(err)) {
      showError(t('errNetwork'));
      return;
    }
    if (source === 'resend') {
      showError(t('errResendFailed'));
      return;
    }
    if (state.waitingOtp) {
      showError(t('errInvalidOtp'));
      els.otp.select();
      return;
    }
    showError(isInvalidCredentialsError(err) ? t('errInvalidCredentials') : t('errLoginFailed'));
  }

  /**
   * Detect login identifier type and map to the API field the Login route expects.
   * Order: email → phone → numeric id → username.
   */
  function detectLoginIdentifier(raw) {
    var value = String(raw || '').trim();
    if (!value) return null;

    if (value.indexOf('@') !== -1) {
      return { field: 'email', value: value };
    }

    var digits = value.replace(/\D/g, '');
    var phoneShaped =
      /^\+/.test(value) ||
      (/[\s\-()]/.test(value) && digits.length >= 7) ||
      /^\d{9,15}$/.test(value);

    if (phoneShaped && digits.length >= 7) {
      var phone = /^\+/.test(value)
        ? value.replace(/[^\d+]/g, '')
        : digits;
      return { field: 'phone', value: phone };
    }

    if (/^\d+$/.test(value)) {
      return { field: 'id', value: value };
    }

    return { field: 'username', value: value };
  }

  function buildLoginArgs(identifierRaw, password, otp, remember) {
    var detected = detectLoginIdentifier(identifierRaw);
    if (!detected) return null;
    var args = {
      password: password,
      otp: otp || '',
      remember: remember
    };
    args[detected.field] = detected.value;
    return args;
  }

  function hideAllScreens() {
    els.login.classList.add('hidden');
    els.inventory.classList.add('hidden');
    els.scanner.classList.add('hidden');
    els.po.classList.add('hidden');
  }

  function showLogin() {
    stopScanner();
    hideAllScreens();
    els.login.classList.remove('hidden');
  }

  function syncDesktopSearch() {
    if (window.matchMedia && window.matchMedia('(min-width: 1024px)').matches) {
      state.searchOpen = true;
      els.searchBar.classList.remove('hidden');
    }
  }

  function showInventory() {
    stopScanner();
    hideAllScreens();
    els.inventory.classList.remove('hidden');
    var email = '';
    try { email = App.getEmail() || ''; } catch (e) { /* ignore */ }
    els.userLabel.textContent = email || 'Products.List · Products.Count';
    syncDesktopSearch();
    ensureInventoryRealtime();
    if (!state.products.length) loadInventory();
    else renderInventory();
  }

  function showScanner() {
    hideAllScreens();
    els.scanner.classList.remove('hidden');
    startScanner();
  }

  function supplierDetailsComplete() {
    return !!(
      els.poSupplierName.value.trim() &&
      els.poSupplierEmail.value.trim() &&
      els.poSupplierEmail.checkValidity() &&
      els.poSupplierPhone.value.trim()
    );
  }

  function updatePoActionState() {
    var disabled = !supplierDetailsComplete();
    els.poPdfBtn.disabled = disabled;
    els.poEmailBtn.disabled = disabled;
    els.poWhatsappBtn.disabled = disabled;
  }

  function resetSupplierDetails() {
    els.poSupplierName.value = '';
    els.poSupplierEmail.value = '';
    els.poSupplierPhone.value = '';
    updatePoActionState();
  }

  function showPO() {
    stopScanner();
    hideAllScreens();
    els.po.classList.remove('hidden');
    resetSupplierDetails();
    buildPOFromStock();
    renderPOLines();
  }

  function num(v, fallback) {
    if (v == null || v === '') return fallback;
    var n = Number(v);
    return Number.isNaN(n) ? fallback : n;
  }

  function pickQty(row) {
    var keys = ['stock', 'left_stock', 'qty', 'quantity', 'amount', 'in_stock', 'inventory', 'units', 'qnt', 'product_qty'];
    for (var i = 0; i < keys.length; i++) {
      if (row[keys[i]] != null && row[keys[i]] !== '') return num(row[keys[i]], 0);
    }
    return 0;
  }

  function pickName(row) {
    return row.product_name || row.name || row.title || row.item_name || row.product || t('productFallback', { id: row.id || '' });
  }

  function pickSku(row) {
    return row.product_sku || row.sku || row.barcode || row.code || row.catalog_number || row.makat || ('ID-' + (row.id || '—'));
  }

  function pickBarcode(row) {
    return String(row.barcode || row.ean || row.upc || row.product_sku || row.sku || row.code || row.id || '').trim();
  }

  function pickCategory(row) {
    var raw = String(row.category || row.category_name || row.group || row.type || row.product_type || row.folder || '').toLowerCase();
    var he = String(row.category_name || row.category || row.group || row.type || '');
    if (/filter|סנן|סננ/.test(raw + he)) return 'filters';
    if (/device|מכשיר|בר מים|מערכת/.test(raw + he)) return 'devices';
    if (/part|חלפ|אביזר|spare/.test(raw + he)) return 'parts';
    return 'other';
  }

  function pickLowThreshold(row) {
    if (!row || typeof row !== 'object') return LOW_THRESHOLD;

    var keys = [
      'min_stock', 'min_qty', 'reorder_level', 'low_stock', 'low_threshold', 'reorder_point',
      'max_stock', 'max_qty', 'maximum', 'max', 'max_item', 'item_max',
      'MinStock', 'MaxStock', 'minStock', 'maxStock'
    ];
    var i;
    for (i = 0; i < keys.length; i++) {
      if (row[keys[i]] == null || row[keys[i]] === '') continue;
      var n = num(row[keys[i]], NaN);
      if (!Number.isNaN(n) && n > 0) return n;
    }

    var nested = [row.storage, row.warehouse, row.inventory, row.stock_info, row.meta];
    for (i = 0; i < nested.length; i++) {
      if (!nested[i] || typeof nested[i] !== 'object') continue;
      for (var j = 0; j < keys.length; j++) {
        if (nested[i][keys[j]] == null || nested[i][keys[j]] === '') continue;
        var nestedVal = num(nested[i][keys[j]], NaN);
        if (!Number.isNaN(nestedVal) && nestedVal > 0) return nestedVal;
      }
    }

    return LOW_THRESHOLD;
  }

  function stockLevel(qty, threshold) {
    var limit = num(threshold, LOW_THRESHOLD);
    if (limit <= 0) limit = LOW_THRESHOLD;
    if (qty <= 0) return 'out';
    if (qty <= limit) return 'low';
    return 'ok';
  }

  function normalizeProduct(row) {
    var id = row.id || row.product_id || '';
    var qty = pickQty(row);
    var minStock = pickLowThreshold(row);
    var level = stockLevel(qty, minStock);

    return {
      id: id,
      name: pickName(row),
      sku: pickSku(row),
      barcode: pickBarcode(row),
      qty: qty,
      apiQty: qty,
      level: level,
      cat: pickCategory(row),
      catLabel: row.category_name || row.category || row.group || row.type || t('other'),
      minStock: minStock,
      raw: row
    };
  }

  function iconSvg(kind) {
    if (kind === 'filter') {
      return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h18l-7 9v6l-4 2v-8z"/></svg>';
    }
    if (kind === 'device') {
      return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2"/><path d="M9 7h6M12 11v4"/></svg>';
    }
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>';
  }

  function filteredProducts() {
    var q = state.query.trim().toLowerCase();
    return state.products.filter(function (p) {
      if (state.cat === 'high' && p.level !== 'ok') return false;
      if (state.cat === 'low' && p.level !== 'low') return false;
      if (state.cat === 'out' && p.level !== 'out') return false;
      if (!q) return true;
      return (p.name + ' ' + p.sku + ' ' + p.barcode + ' ' + p.catLabel).toLowerCase().indexOf(q) !== -1;
    });
  }

  function inventoryPageInfo(list) {
    var total = list.length;
    var pageSize = Math.max(1, Number(state.pageSize) || 25);
    var pages = Math.max(1, Math.ceil(total / pageSize) || 1);
    var page = Math.min(Math.max(1, Number(state.page) || 1), pages);
    state.page = page;
    var start = (page - 1) * pageSize;
    var end = Math.min(start + pageSize, total);
    return {
      total: total,
      page: page,
      pages: pages,
      pageSize: pageSize,
      start: start,
      end: end,
      slice: list.slice(start, end)
    };
  }

  function paginationHtml(info) {
    if (info.total <= info.pageSize) {
      return (
        '<div class="inv-pagination inv-pagination--solo">' +
        esc(t('showingOf', { shown: info.total, total: info.total })) +
        '</div>'
      );
    }
    var rangeShown = (info.start + 1) + '–' + info.end;
    return (
      '<div class="inv-pagination" role="navigation" aria-label="Pagination">' +
      '<button type="button" class="inv-page-btn" data-page-nav="prev"' +
      (info.page <= 1 ? ' disabled' : '') + '>' + esc(t('prevPage')) + '</button>' +
      '<div class="inv-page-meta">' +
      '<div class="inv-page-of">' + esc(t('pageOf', { page: info.page, pages: info.pages })) + '</div>' +
      '<div class="inv-page-range">' + esc(t('showingOf', { shown: rangeShown, total: info.total })) + '</div>' +
      '</div>' +
      '<button type="button" class="inv-page-btn" data-page-nav="next"' +
      (info.page >= info.pages ? ' disabled' : '') + '>' + esc(t('nextPage')) + '</button>' +
      '</div>'
    );
  }

  function bindPaginationControls() {
    var root = els.body.querySelector('.inv-pagination');
    if (!root) return;
    root.querySelectorAll('[data-page-nav]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        var dir = btn.getAttribute('data-page-nav');
        if (dir === 'prev') state.page = Math.max(1, state.page - 1);
        if (dir === 'next') state.page += 1;
        renderInventory();
        if (els.body.scrollIntoView) {
          try { els.body.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) { /* ignore */ }
        }
      });
    });
  }

  function groupProducts(list) {
    var map = {};
    list.forEach(function (p) {
      var key = p.cat || 'other';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    var order = ['filters', 'devices', 'parts', 'other'];
    var groups = [];
    order.forEach(function (key) {
      if (!map[key] || !map[key].length) return;
      var style = CAT_STYLE[key] || CAT_STYLE.other;
      groups.push({
        id: key,
        title: catLabel(key),
        iconBg: style.iconBg,
        iconColor: style.iconColor,
        icon: style.icon || 'part',
        items: map[key]
      });
    });
    Object.keys(map).forEach(function (key) {
      if (order.indexOf(key) !== -1) return;
      if (!map[key].length) return;
      groups.push({ id: key, title: key, iconBg: 'var(--bg-muted)', iconColor: 'var(--text-secondary)', icon: 'part', items: map[key] });
    });
    return groups;
  }

  function renderChips() {
    var ids = ['all', 'high', 'low', 'out'];
    els.chips.innerHTML = ids.map(function (id) {
      var on = state.cat === id;
      return (
        '<button type="button" data-cat="' + esc(id) + '" class="cat-chip' + (on ? ' chip-on' : '') + '">' +
        esc(catLabel(id)) + '</button>'
      );
    }).join('');
    els.chips.querySelectorAll('[data-cat]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.cat = btn.getAttribute('data-cat');
        state.page = 1;
        renderInventory();
      });
    });
  }

  function itemRowHtml(it) {
    var style = LEVEL_STYLE[it.level] || LEVEL_STYLE.ok;
    return (
      '<button type="button" class="item-row item-row--dense" data-product-id="' + esc(it.id) + '">' +
      '<div class="item-meta">' +
      '<div class="item-name">' + esc(it.name) + '</div>' +
      '<div class="item-sku">' + esc(it.sku) + (it.barcode && it.barcode !== it.sku ? ' · ' + esc(it.barcode) : '') + '</div>' +
      '</div>' +
      '<div class="item-tag" style="background:' + style.tagBg + '; color:' + style.tagColor + ';">' +
      '<span class="item-tag-dot" style="background:' + style.tagColor + ';"></span>' + esc(levelTag(it.level)) +
      '</div>' +
      '<div class="item-qty">' +
      '<div class="item-qty-num" style="color:' + style.qtyColor + ';">' + esc(it.qty) + '</div>' +
      '<div class="item-qty-unit">' + esc(t('units')) + '</div>' +
      '</div>' +
      '</button>'
    );
  }

  function updateLowBanner() {
    var low = state.products.filter(function (p) { return p.level === 'low'; }).length;
    var out = state.products.filter(function (p) { return p.level === 'out'; }).length;
    if (low + out > 0) {
      els.lowBanner.classList.remove('hidden');
      els.lowBannerText.textContent = t('lowStockAlert', { low: low, out: out });
    } else {
      els.lowBanner.classList.add('hidden');
    }
  }

  function renderInventory() {
    var list = filteredProducts();
    var low = state.products.filter(function (p) { return p.level === 'low'; }).length;
    var out = state.products.filter(function (p) { return p.level === 'out'; }).length;
    var pageInfo = inventoryPageInfo(list);

    els.statTotal.textContent = String(state.totalCount || state.products.length);
    els.statLow.textContent = String(low);
    els.statOut.textContent = String(out);
    updateLowBanner();
    renderChips();

    if (!list.length) {
      els.body.innerHTML =
        '<div style="text-align:center; padding:40px 20px;">' +
        '<div style="font-size:14.5px; font-weight:800; color:var(--text-secondary);">' + esc(t('emptyTitle')) + '</div>' +
        '<div style="font-size:12.5px; color:var(--text-muted); margin-top:5px;">' + esc(t('emptySub')) + '</div></div>';
      return;
    }

    var groups = groupProducts(pageInfo.slice);
    var html = groups.map(function (g) {
      return (
        '<section class="inv-group">' +
        '<div class="inv-group-head">' +
        '<div class="inv-group-icon" style="background:' + g.iconBg + '; color:' + g.iconColor + ';">' +
        iconSvg(g.icon) + '</div>' +
        '<span class="inv-group-title">' + esc(g.title) + '</span>' +
        '<span class="inv-group-count">' + esc(t('itemsCount', { n: g.items.length })) + '</span>' +
        '</div>' +
        '<div class="item-card-group">' +
        g.items.map(itemRowHtml).join('') +
        '</div></section>'
      );
    }).join('');

    html += paginationHtml(pageInfo);

    els.body.innerHTML = html;
    els.body.querySelectorAll('[data-product-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-product-id');
        var p = state.products.find(function (x) { return String(x.id) === String(id); });
        if (p) openStockModal(p);
      });
    });
    bindPaginationControls();
    applyPendingPulses();
  }

  function apiErrorHtml(err) {
    var msg = (err && err.message) || t('apiError');
    if (err && err.raw && err.raw.message) msg += '\n' + err.raw.message;
    return (
      '<div style="background:var(--danger-soft); border:1px solid color-mix(in srgb, var(--danger) 28%, transparent); border-radius:14px; padding:14px;">' +
      '<div style="font-size:14px; font-weight:800; color:var(--danger); margin-bottom:8px;">' + esc(t('apiErrorTitle')) + '</div>' +
      '<pre style="margin:0; white-space:pre-wrap; word-break:break-word; font:600 11.5px/1.5 var(--font-sans),monospace; color:var(--danger);">' +
      esc(msg) + '</pre>' +
      '<button type="button" id="invRetry" style="margin-top:12px; padding:9px 14px; border:none; border-radius:12px; background:var(--danger); color:#fff; font:800 13px var(--font-sans),sans-serif; cursor:pointer;">' +
      esc(t('retry')) + '</button></div>'
    );
  }

  function ensureInventoryRealtime() {
    if (!state.realtimeWired) {
      state.realtimeWired = true;
      window.addEventListener('biz1demo:products', onProductRealtime);
      window.addEventListener('biz1demo:socket', onSocketStatus);
    }
    startInventoryPolling();
    if (!App.connectRealtime) return;
    App.connectRealtime().then(function () {
      console.info('[Inventory] realtime ready', App.getRealtimeState && App.getRealtimeState());
    }).catch(function (err) {
      console.warn('[Inventory] realtime connect failed', err);
    });
  }

  function onSocketStatus(e) {
    var detail = (e && e.detail) || {};
    if (detail.type === 'ready' || detail.type === 'connect') {
      // socket reconnected — pull latest list once
      queueFullInventoryRefresh();
    }
  }

  function startInventoryPolling() {
    stopInventoryPolling();
    inventoryPollTimer = setInterval(function () {
      if (els.inventory.classList.contains('hidden')) return;
      pollInventoryCount();
    }, 6000);
  }

  function stopInventoryPolling() {
    if (inventoryPollTimer) {
      clearInterval(inventoryPollTimer);
      inventoryPollTimer = null;
    }
  }

  async function pollInventoryCount() {
    try {
      if (!App.countProducts) {
        queueFullInventoryRefresh();
        return;
      }
      var counted = await App.countProducts({});
      var total = Number(counted.count || 0);
      if (lastKnownCount == null) {
        lastKnownCount = state.totalCount || state.products.length;
      }
      if (total !== lastKnownCount || total !== state.products.length) {
        console.info('[Inventory] count changed', lastKnownCount, '->', total);
        lastKnownCount = total;
        await refreshInventorySilent(true);
        pulseStats();
      }
    } catch (err) {
      console.warn('[Inventory] poll failed', err);
    }
  }

  function onProductRealtime(e) {
    if (els.inventory.classList.contains('hidden')) return;
    var detail = (e && e.detail) || {};
    var key = String(detail.key || (detail.event && detail.event.key) || '');
    var payload = (detail.event && detail.event.payload) || {};
    var id = payload.id;
    if (id == null && payload.data && payload.data.id != null) id = payload.data.id;

    console.info('[Inventory] realtime product event', key, id, payload);

    if (key === 'products.deleted') {
      pulseStats();
      showToast(t('realtimeDeleted'));
      if (id != null) {
        markPulseIds([id]);
        removeProductFromList(id);
      } else {
        queueFullInventoryRefresh(true);
      }
      return;
    }
    // created/updated: always refresh full list so new site products appear reliably
    if (key === 'products.created' || key === 'products.updated') {
      pulseStats();
      showToast(key === 'products.created' ? t('realtimeCreated') : t('realtimeUpdated'));
      if (id != null) markPulseIds([id]);
      queueFullInventoryRefresh(true);
      if (id != null) queueProductSync(id);
    }
  }

  function queueProductSync(id) {
    pendingProductSync[String(id)] = true;
    clearTimeout(productSyncTimer);
    productSyncTimer = setTimeout(flushProductSync, 250);
  }

  function queueFullInventoryRefresh(fromRealtime) {
    clearTimeout(fullRefreshTimer);
    fullRefreshTimer = setTimeout(function () {
      refreshInventorySilent(fromRealtime);
    }, 350);
  }

  async function flushProductSync() {
    var ids = Object.keys(pendingProductSync);
    pendingProductSync = {};
    for (var i = 0; i < ids.length; i++) {
      await syncProductById(ids[i]);
    }
  }

  async function syncProductById(id) {
    try {
      var res = await App.getProduct(id);
      if (!res || !res.row) {
        queueFullInventoryRefresh(true);
        return;
      }
      var p = normalizeProduct(res.row);
      var sid = String(id);
      var idx = state.products.findIndex(function (x) { return String(x.id) === sid; });
      if (idx >= 0) {
        state.products[idx] = p;
      } else {
        state.products.push(p);
        state.totalCount = Math.max(state.totalCount + 1, state.products.length);
      }
      lastKnownCount = state.products.length;
      markPulseIds([id]);
      renderInventory();
    } catch (err) {
      console.warn('[Inventory] product sync failed — full refresh', id, err);
      queueFullInventoryRefresh(true);
    }
  }

  async function refreshInventorySilent(fromRealtime) {
    try {
      var result = await App.listProducts({});
      state.products = (result.rows || []).map(normalizeProduct);
      state.totalCount = result.total;
      lastKnownCount = state.totalCount;
      renderInventory();
      if (fromRealtime) pulseStats();
    } catch (err) {
      console.warn('[Inventory] silent refresh failed', err);
    }
  }

  function removeProductFromList(id) {
    var sid = String(id);
    var before = state.products.length;
    state.products = state.products.filter(function (p) { return String(p.id) !== sid; });
    if (state.products.length < before) {
      state.totalCount = Math.max(state.products.length, state.totalCount - 1);
      lastKnownCount = state.products.length;
      renderInventory();
    }
  }

  async function loadInventory() {
    els.body.innerHTML =
      '<div style="text-align:center; padding:48px 20px;">' +
      '<div style="font-size:14px; font-weight:700; color:var(--text-muted);">' + esc(t('loadingFromServer')) + '</div>' +
      '<div style="font-size:12px; color:var(--text-muted); margin-top:6px; opacity:.75;">Products.List · Products.Count</div></div>';
    els.statTotal.textContent = '…';
    els.statLow.textContent = '…';
    els.statOut.textContent = '…';

    try {
      var result = await App.listProducts({});
      state.products = (result.rows || []).map(normalizeProduct);
      state.totalCount = result.total;
      lastKnownCount = state.totalCount;
      state.page = 1;
      renderInventory();
    } catch (err) {
      console.error('[Inventory] load failed', err);
      var st = err && (err.status != null ? Number(err.status) : null);
      var msg = String((err && err.message) || '').toLowerCase();
      if (st === 401 || st === 302 || /bearer|unauthorized|פג תוקף|401/.test(msg)) {
        try { App.clearSession({ keepEmail: true }); } catch (e) { /* ignore */ }
        showLogin();
        showError(t('errSessionExpired'));
        return;
      }
      els.body.innerHTML = apiErrorHtml(err);
      var btn = document.getElementById('invRetry');
      if (btn) btn.addEventListener('click', loadInventory);
    }
  }

  function findByBarcode(code) {
    var c = String(code || '').trim().toLowerCase();
    if (!c) return null;
    return state.products.find(function (p) {
      return String(p.barcode || '').toLowerCase() === c ||
        String(p.sku || '').toLowerCase() === c ||
        String(p.id || '').toLowerCase() === c;
    }) || null;
  }

  async function lookupBarcode(code) {
    var found = findByBarcode(code);
    if (found) {
      openStockModal(found);
      return;
    }
    if (/^\d+$/.test(String(code).trim())) {
      try {
        var res = await App.getProduct(String(code).trim());
        if (res && res.row) {
          var p = normalizeProduct(res.row);
          openStockModal(p);
          return;
        }
      } catch (e) {
        console.warn('[Inventory] Products.Get failed', e);
      }
    }
    showToast(t('productNotFound'));
    if (state.scanning && state.html5Qr) {
      try { state.html5Qr.resume(); } catch (e) { /* ignore */ }
    }
  }

  async function startScanner() {
    if (!window.Html5Qrcode) {
      showToast(t('cameraError'));
      return;
    }
    stopScanner();
    var readerId = 'qrReader';
    state.html5Qr = new Html5Qrcode(readerId);
    state.scanning = true;
    try {
      await state.html5Qr.start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 240, height: 140 }, aspectRatio: 1.7 },
        function (decoded) {
          if (!decoded) return;
          try { state.html5Qr.pause(true); } catch (e) { /* ignore */ }
          lookupBarcode(decoded);
        },
        function () { /* ignore scan miss */ }
      );
    } catch (err) {
      console.warn('[Scanner]', err);
      state.scanning = false;
      showToast(t('cameraError'));
    }
  }

  async function stopScanner() {
    if (!state.html5Qr) return;
    try {
      if (state.scanning) await state.html5Qr.stop();
      await state.html5Qr.clear();
    } catch (e) { /* ignore */ }
    state.html5Qr = null;
    state.scanning = false;
  }

  function calcNewQty() {
    if (!state.stockProduct) return 0;
    var adj = Math.max(1, num(state.adjustQty, 1));
    if (state.stockMode === 'in') return state.stockProduct.qty + adj;
    return Math.max(0, state.stockProduct.qty - adj);
  }

  function updateStockNewQty() {
    els.stockNewQty.textContent = String(calcNewQty());
  }

  function openStockModal(product) {
    state.stockProduct = product;
    state.stockMode = 'in';
    state.adjustQty = 1;
    els.stockAdjustQty.value = '1';
    els.stockProductName.textContent = product.name;
    els.stockProductSku.textContent = product.sku + (product.barcode && product.barcode !== product.sku ? ' · ' + product.barcode : '');
    els.stockCurrentQty.textContent = String(product.qty);
    els.stockModalError.classList.add('hidden');
    els.modeIn.classList.add('is-active');
    els.modeOut.classList.remove('is-active');
    updateStockNewQty();
    els.stockModal.classList.remove('hidden');
  }

  function closeStockModal() {
    els.stockModal.classList.add('hidden');
    state.stockProduct = null;
    if (!els.scanner.classList.contains('hidden') && state.html5Qr) {
      try { state.html5Qr.resume(); } catch (e) { /* ignore */ }
    }
  }

  async function confirmStockUpdate() {
    if (!state.stockProduct) return;
    var adj = num(els.stockAdjustQty.value, 0);
    if (adj < 1) {
      els.stockModalError.textContent = t('invalidQty');
      els.stockModalError.classList.remove('hidden');
      return;
    }
    if (state.stockMode === 'out' && adj > state.stockProduct.qty) {
      els.stockModalError.textContent = t('stockOutTooMuch');
      els.stockModalError.classList.remove('hidden');
      return;
    }

    var newQty = calcNewQty();
    var btn = document.getElementById('btnStockConfirm');
    btn.disabled = true;
    btn.textContent = t('saving');
    els.stockModalError.classList.add('hidden');

    try {
      var synced = await App.updateProductStock(state.stockProduct.id, newQty);
      var finalQty = synced && synced.qty != null ? num(synced.qty, newQty) : newQty;

      var id = String(state.stockProduct.id);
      var idx = state.products.findIndex(function (p) { return String(p.id) === id; });
      if (idx >= 0) {
        state.products[idx].qty = finalQty;
        state.products[idx].apiQty = finalQty;
        state.products[idx].level = stockLevel(finalQty, state.products[idx].minStock);
      }
      closeStockModal();
      showToast(t('stockUpdated'));
      if (!els.inventory.classList.contains('hidden')) renderInventory();
      else showInventory();
    } catch (err) {
      console.error('[Inventory] stock sync failed', err);
      els.stockModalError.textContent = (err && err.message) || t('stockSyncFailed');
      els.stockModalError.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = t('confirm');
    }
  }

  function suggestedOrderQty(p) {
    var target = Math.max(RESTOCK_TARGET, p.minStock || RESTOCK_TARGET);
    return Math.max(1, target - p.qty);
  }

  function buildPOFromStock() {
    state.poLines = state.products
      .filter(function (p) { return p.level === 'out' || p.level === 'low'; })
      .map(function (p) {
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          current: p.qty,
          level: p.level,
          orderQty: suggestedOrderQty(p)
        };
      });
  }

  function renderPOLines() {
    if (!state.poLines.length) {
      els.poLines.innerHTML = '';
      els.poEmpty.classList.remove('hidden');
      return;
    }
    els.poEmpty.classList.add('hidden');
    els.poLines.innerHTML = state.poLines.map(function (line, i) {
      return (
        '<div class="po-line" data-po-idx="' + i + '">' +
        '<div><div class="po-line-name">' + esc(line.name) + '</div>' +
        '<div class="po-line-sku">' + esc(line.sku) + ' · ' + esc(levelTag(line.level)) + '</div></div>' +
        '<input type="number" min="1" class="po-line-qty" value="' + esc(line.orderQty) + '">' +
        '<button type="button" class="po-line-remove" data-remove="' + i + '">×</button>' +
        '</div>'
      );
    }).join('');

    els.poLines.querySelectorAll('.po-line-qty').forEach(function (input) {
      input.addEventListener('change', function () {
        var row = input.closest('.po-line');
        var idx = Number(row.getAttribute('data-po-idx'));
        state.poLines[idx].orderQty = Math.max(1, num(input.value, 1));
      });
    });
    els.poLines.querySelectorAll('[data-remove]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = Number(btn.getAttribute('data-remove'));
        state.poLines.splice(idx, 1);
        renderPOLines();
      });
    });
  }

  function poSummaryText() {
    var isHe = state.lang === 'he';
    var supplier = els.poSupplierName.value.trim() || (isHe ? '—' : 'Supplier');
    var lines = state.poLines.map(function (l) {
      return '- ' + l.name + ' (' + l.sku + ') x ' + l.orderQty;
    }).join('\n');
    if (isHe) {
      return brandName() + ' — ' + t('poTitle') + '\n' +
        t('supplierName') + ': ' + supplier + '\n' +
        t('pdfDate') + ': ' + new Date().toLocaleDateString('he-IL') + '\n\n' +
        lines;
    }
    return brandName() + ' — ' + t('poTitle') + '\n' +
      t('supplierName') + ': ' + supplier + '\n' +
      t('pdfDate') + ': ' + new Date().toLocaleDateString() + '\n\n' +
      lines;
  }

  function buildPoPdfHtml() {
    var isHe = state.lang === 'he';
    var dir = isHe ? 'rtl' : 'ltr';
    var align = isHe ? 'right' : 'left';
    var locale = isHe ? 'he-IL' : undefined;
    var supplier = els.poSupplierName.value.trim() || '—';
    var email = els.poSupplierEmail.value.trim() || '—';
    var phone = els.poSupplierPhone.value.trim() || '—';
    var dateStr = new Date().toLocaleString(locale);
    var rows = state.poLines.map(function (l) {
      return '<tr>' +
        '<td>' + esc(String(l.sku)) + '</td>' +
        '<td>' + esc(String(l.name)) + '</td>' +
        '<td style="text-align:center;">' + esc(String(l.orderQty)) + '</td>' +
        '</tr>';
    }).join('');

    return '' +
      '<div dir="' + dir + '" style="width:720px;padding:32px 36px;background:#fff;color:#121926;' +
      'font-family:\'Heebo\',\'Plus Jakarta Sans\',Arial,sans-serif;box-sizing:border-box;">' +
      '<div style="font-size:22px;font-weight:800;margin-bottom:6px;text-align:' + align + ';">' +
      esc(brandName()) + ' — ' + esc(t('poTitle')) +
      '</div>' +
      '<div style="font-size:13px;font-weight:600;color:#46505f;line-height:1.7;margin-bottom:18px;text-align:' + align + ';">' +
      '<div>' + esc(t('supplierName')) + ': ' + esc(supplier) + '</div>' +
      '<div>' + esc(t('supplierEmail')) + ': ' + esc(email) + '</div>' +
      '<div>' + esc(t('supplierPhone')) + ': ' + esc(phone) + '</div>' +
      '<div>' + esc(t('pdfDate')) + ': ' + esc(dateStr) + '</div>' +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:13px;">' +
      '<thead><tr style="background:#f4f6f9;">' +
      '<th style="text-align:' + align + ';padding:10px 8px;border-bottom:2px solid #dde3eb;">' + esc(t('pdfSku')) + '</th>' +
      '<th style="text-align:' + align + ';padding:10px 8px;border-bottom:2px solid #dde3eb;">' + esc(t('pdfProduct')) + '</th>' +
      '<th style="text-align:center;padding:10px 8px;border-bottom:2px solid #dde3eb;width:72px;">' + esc(t('pdfQty')) + '</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
      '</table>' +
      '<style>td{padding:9px 8px;border-bottom:1px solid #e8ecf2;text-align:' + align + ';}</style>' +
      '</div>';
  }

  function generatePdf() {
    if (!supplierDetailsComplete()) return null;
    if (!state.poLines.length) {
      showToast(t('needPoLines'));
      return null;
    }
    var jsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!jsPDF) {
      showToast(t('apiError'));
      return null;
    }

    var filename = 'PO-Biz1-' + Date.now() + '.pdf';
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1;';
    wrap.innerHTML = buildPoPdfHtml();
    document.body.appendChild(wrap);
    var node = wrap.firstChild;

    function cleanup() {
      if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }

    function saveFromCanvas(canvas) {
      var doc = new jsPDF('p', 'pt', 'a4');
      var pageWidth = doc.internal.pageSize.getWidth();
      var pageHeight = doc.internal.pageSize.getHeight();
      var imgWidth = pageWidth;
      var imgHeight = (canvas.height * imgWidth) / canvas.width;
      var imgData = canvas.toDataURL('image/png');
      var heightLeft = imgHeight;
      var position = 0;

      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      doc.save(filename);
      cleanup();
      showToast(t('pdfReady'));
    }

    function fallbackTextPdf() {
      var isHe = state.lang === 'he';
      var doc = new jsPDF();
      var locale = isHe ? 'he-IL' : undefined;
      doc.setFontSize(16);
      doc.text(brandName() + ' — ' + t('poTitle'), 14, 20);
      doc.setFontSize(11);
      doc.text(t('supplierName') + ': ' + (els.poSupplierName.value.trim() || '—'), 14, 30);
      doc.text(t('supplierEmail') + ': ' + (els.poSupplierEmail.value.trim() || '—'), 14, 37);
      doc.text(t('supplierPhone') + ': ' + (els.poSupplierPhone.value.trim() || '—'), 14, 44);
      doc.text(t('pdfDate') + ': ' + new Date().toLocaleString(locale), 14, 51);
      doc.text(t('pdfSku'), 14, 64);
      doc.text(t('pdfProduct'), 50, 64);
      doc.text(t('pdfQty'), 170, 64);
      var y = 72;
      state.poLines.forEach(function (l) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(String(l.sku).slice(0, 18), 14, y);
        doc.text(String(l.name).slice(0, 48), 50, y);
        doc.text(String(l.orderQty), 170, y);
        y += 8;
      });
      doc.save(filename);
      cleanup();
      showToast(t('pdfReady'));
    }

    if (window.html2canvas && node) {
      window.html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      }).then(saveFromCanvas).catch(function () {
        fallbackTextPdf();
      });
    } else {
      fallbackTextPdf();
    }
    return filename;
  }

  function sendEmail() {
    if (!supplierDetailsComplete()) return;
    if (!state.poLines.length) { showToast(t('needPoLines')); return; }
    var email = els.poSupplierEmail.value.trim();
    if (!email) { showToast(t('needSupplierEmail')); return; }
    generatePdf();
    var subject = encodeURIComponent(
      state.lang === 'he'
        ? brandName() + ' — הזמנת רכש'
        : brandName() + ' Purchase Order'
    );
    var attachNote = state.lang === 'he'
      ? '\n\n(פידיאף הורד — יש לצרף במידת הצורך)'
      : '\n\n(PDF downloaded — please attach if needed)';
    var body = encodeURIComponent(poSummaryText() + attachNote);
    window.location.href = 'mailto:' + encodeURIComponent(email) + '?subject=' + subject + '&body=' + body;
  }

  function sendWhatsapp() {
    if (!supplierDetailsComplete()) return;
    if (!state.poLines.length) { showToast(t('needPoLines')); return; }
    var phone = els.poSupplierPhone.value.trim().replace(/[^\d]/g, '');
    if (!phone) { showToast(t('needSupplierPhone')); return; }
    var text = encodeURIComponent(poSummaryText());
    window.open('https://wa.me/' + phone + '?text=' + text, '_blank');
  }

  function prefillRemembered() {
    try {
      var email = App.getEmail() || '';
      if (email) els.username.value = email;
      if (localStorage.getItem('biz1demo_remember') === '1') {
        els.remember.checked = true;
        var saved = null;
        try {
          saved = JSON.parse(decodeURIComponent(escape(atob(localStorage.getItem('biz1demo_cred') || ''))));
        } catch (e) { saved = null; }
        if (saved && saved.password) els.password.value = saved.password;
      }
    } catch (e) { /* ignore */ }
  }

  async function tryAutoEnter() {
    try {
      var client = App.getClient();
      if (client.getToken() && App.getRole()) {
        showInventory();
        return true;
      }
      if (App.canAutoRefresh && App.canAutoRefresh()) {
        setRequestBusy(true, 'login');
        els.loginBtnText.textContent = t('loginRefreshing');
        var refreshed = await App.refreshSession();
        if (refreshed && refreshed.ok) {
          showInventory();
          return true;
        }
      }
    } catch (err) {
      console.warn('[Inventory] auto-enter failed', err);
      if (err && err.otpRequired) {
        // A cached silent refresh must never skip the credentials screen.
        // OTP mode is entered only after the user explicitly submits login.
        try { App.clearSession({ keepEmail: true }); } catch (e) { /* ignore */ }
        state.waitingOtp = false;
        els.usernameWrap.classList.remove('hidden');
        els.passwordWrap.classList.remove('hidden');
        els.otpWrap.classList.add('hidden');
        els.otp.value = '';
        els.password.value = '';
        if (els.remember) els.remember.checked = false;
        clearError();
      } else {
        showClassifiedError(err, 'login');
      }
    } finally {
      setRequestBusy(false, 'login');
    }
    return false;
  }

  // ── events ──
  document.querySelectorAll('.lang-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { setLang(btn.getAttribute('data-lang')); });
  });

  document.getElementById('togglePassword').addEventListener('click', function () {
    els.password.type = els.password.type === 'password' ? 'text' : 'password';
  });

  document.querySelectorAll('.fillUser').forEach(function (btn) {
    btn.addEventListener('click', function () {
      els.username.value = btn.getAttribute('data-user');
      els.password.focus();
      clearError();
    });
  });

  document.getElementById('btnSearch').addEventListener('click', function () {
    state.searchOpen = !state.searchOpen;
    els.searchBar.classList.toggle('hidden', !state.searchOpen);
    if (state.searchOpen) els.searchInput.focus();
    else {
      state.query = '';
      els.searchInput.value = '';
      state.page = 1;
      renderInventory();
    }
  });

  els.searchInput.addEventListener('input', function () {
    state.query = els.searchInput.value;
    state.page = 1;
    renderInventory();
  });

  document.getElementById('btnRefresh').addEventListener('click', loadInventory);
  document.getElementById('btnScanFab').addEventListener('click', showScanner);
  document.getElementById('btnPO').addEventListener('click', showPO);
  document.getElementById('btnBannerPO').addEventListener('click', showPO);
  document.getElementById('btnScannerBack').addEventListener('click', function () {
    stopScanner().then(showInventory);
  });
  document.getElementById('btnPOBack').addEventListener('click', showInventory);
  document.getElementById('btnManualLookup').addEventListener('click', function () {
    lookupBarcode(els.manualBarcode.value);
  });
  els.manualBarcode.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      lookupBarcode(els.manualBarcode.value);
    }
  });

  document.getElementById('btnLogout').addEventListener('click', function () {
    try {
      App.clearSession({ keepEmail: true });
      var c = App.getClient();
      if (c && c.logout) c.logout();
    } catch (e) { /* ignore */ }
    state.products = [];
    state.page = 1;
    pendingProductSync = {};
    clearTimeout(productSyncTimer);
    productSyncTimer = null;
    clearTimeout(fullRefreshTimer);
    fullRefreshTimer = null;
    stopInventoryPolling();
    lastKnownCount = null;
    state.waitingOtp = false;
    state.requestInFlight = false;
    state.requestSource = '';
    state.cooldownUntil = 0;
    state.resendCooldownUntil = 0;
    if (state.cooldownTimer) clearInterval(state.cooldownTimer);
    if (state.resendCooldownTimer) clearInterval(state.resendCooldownTimer);
    state.cooldownTimer = null;
    state.resendCooldownTimer = null;
    els.usernameWrap.classList.remove('hidden');
    els.passwordWrap.classList.remove('hidden');
    els.otpWrap.classList.add('hidden');
    els.otp.value = '';
    clearError();
    renderLoginControls();
    showLogin();
  });

  els.modeIn.addEventListener('click', function () {
    state.stockMode = 'in';
    els.modeIn.classList.add('is-active');
    els.modeOut.classList.remove('is-active');
    updateStockNewQty();
  });
  els.modeOut.addEventListener('click', function () {
    state.stockMode = 'out';
    els.modeOut.classList.add('is-active');
    els.modeIn.classList.remove('is-active');
    updateStockNewQty();
  });
  document.getElementById('qtyMinus').addEventListener('click', function () {
    state.adjustQty = Math.max(1, num(els.stockAdjustQty.value, 1) - 1);
    els.stockAdjustQty.value = String(state.adjustQty);
    updateStockNewQty();
  });
  document.getElementById('qtyPlus').addEventListener('click', function () {
    state.adjustQty = Math.max(1, num(els.stockAdjustQty.value, 1) + 1);
    els.stockAdjustQty.value = String(state.adjustQty);
    updateStockNewQty();
  });
  els.stockAdjustQty.addEventListener('input', function () {
    state.adjustQty = Math.max(1, num(els.stockAdjustQty.value, 1));
    updateStockNewQty();
  });
  document.getElementById('btnStockCancel').addEventListener('click', closeStockModal);
  document.getElementById('btnStockConfirm').addEventListener('click', confirmStockUpdate);
  els.stockModal.addEventListener('click', function (e) {
    if (e.target === els.stockModal) closeStockModal();
  });

  [els.poSupplierName, els.poSupplierEmail, els.poSupplierPhone].forEach(function (input) {
    input.addEventListener('input', updatePoActionState);
  });
  els.poPdfBtn.addEventListener('click', generatePdf);
  els.poEmailBtn.addEventListener('click', sendEmail);
  els.poWhatsappBtn.addEventListener('click', sendWhatsapp);

  els.form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (state.requestInFlight || Date.now() < state.cooldownUntil) return;
    clearError();
    var identifier = els.username.value.trim();
    var password = els.password.value;
    var otp = els.otp.value.trim();
    var remember = !!(els.remember && els.remember.checked);

    if (!identifier || !password) { showError(t('errFillFields')); return; }
    if (state.waitingOtp && !otp) { showError(t('errOtp')); return; }

    var loginArgs = buildLoginArgs(identifier, password, otp, remember);
    if (!loginArgs) { showError(t('errFillFields')); return; }

    setRequestBusy(true, 'login');

    try {
      var result = await App.login(loginArgs);

      if (result.otpRequired) {
        if (state.waitingOtp && otp) {
          showError(t('errInvalidOtp'));
          els.otp.select();
          return;
        }
        enterOtpMode(t('errOtpRequired'));
        return;
      }

      if (result.ok) {
        showInventory();
        return;
      }
      showError(t('errLoginFailed'));
    } catch (err) {
      showClassifiedError(err, 'login');
    } finally {
      setRequestBusy(false, 'login');
    }
  });

  els.resendOtpBtn.addEventListener('click', async function () {
    if (
      state.requestInFlight ||
      !state.waitingOtp ||
      Date.now() < state.cooldownUntil ||
      Date.now() < state.resendCooldownUntil
    ) return;

    clearError();
    var identifier = els.username.value.trim();
    var password = els.password.value;
    var remember = !!(els.remember && els.remember.checked);
    if (!identifier || !password) {
      showError(t('errFillFields'));
      return;
    }

    var loginArgs = buildLoginArgs(identifier, password, '', remember);
    if (!loginArgs) {
      showError(t('errFillFields'));
      return;
    }

    setRequestBusy(true, 'resend');
    try {
      var result = await App.login(loginArgs);
      if (result.otpRequired) {
        els.otp.value = '';
        enterOtpMode(t('otpResent'));
        return;
      }
      if (result.ok) {
        showInventory();
        return;
      }
      showError(t('errResendFailed'));
    } catch (err) {
      showClassifiedError(err, 'resend');
    } finally {
      setRequestBusy(false, 'resend');
    }
  });

  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', toggleTheme);
  });

  var savedLang = 'he';
  try {
    savedLang = localStorage.getItem(LANG_KEY) || localStorage.getItem('mineralbar_lang') || 'he';
  } catch (e) { savedLang = 'he'; }
  setTheme(resolveInitialTheme());
  setLang(savedLang);
  tickClock();
  setInterval(tickClock, 30000);
  window.addEventListener('resize', syncDesktopSearch);
  prefillRemembered();
  tryAutoEnter();
})();
