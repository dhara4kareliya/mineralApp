(function () {
  'use strict';

  var LANG_KEY = 'biz1ss_lang';
  var CHANNEL_KEY = 'biz1ss_channel';
  var THEME_KEY = 'biz1ss_theme';

  var I18N = {
    he: {
      langLabel: 'שפה',
      toggleTheme: 'מצב בהיר / כהה',
      pageTitle: 'Biz1 Showcase — פורטל לקוחות',
      brandName: 'Biz1 Showcase',
      brandSub: 'פורטל לקוחות מאובטח',
      loginTitle: 'התחברות מאובטחת ללקוח (Magic Link / OTP)',
      loginHint: 'התחברות ללא סיסמה באמצעות קוד OTP ב-WhatsApp או SMS שנשלח דרך Biz1.',
      phoneLabel: 'מספר נייד',
      phonePlaceholder: '050-1234567',
      channelLabel: 'איך לשלוח את הקוד?',
      channelWa: 'WhatsApp',
      channelSms: 'SMS',
      authDetails: 'אימות חשבון Biz1 (נדרש ל־API)',
      emailLabel: 'אימייל, שם משתמש, טלפון או מזהה',
      loginIdPlaceholder: 'אימייל / שם משתמש / טלפון / מזהה',
      passwordLabel: 'סיסמה',
      passwordPlaceholder: 'סיסמה',
      sendCode: 'שלח קוד אימות',
      sending: 'שולח…',
      otpSentTitle: 'קוד נשלח',
      otpLabel: 'קוד אימות (OTP)',
      otpPlaceholder: 'הזן קוד',
      verifyOtp: 'אמת והמשך',
      verifying: 'מאמת…',
      changePhone: 'שנה מספר',
      liveSocketOn: 'שידור חי',
      liveSocketOff: 'אופליין',
      trustLine: 'הצפנה · Biz1 · ללא שמירת כרטיס במכשיר',
      footerNote: 'Biz1 Showcase · פורטל לקוחות',
      hello: 'שלום',
      logout: 'התנתק',
      refresh: 'רענון',
      statusTitle: 'סטטוס שירות',
      statusLoading: 'טוען…',
      statusActive: 'שירות פעיל',
      statusActions: 'יש פעולות שממתינות לטיפול',
      statusClear: 'הכל מעודכן — אין פעולות ממתינות',
      actionsTitle: 'פעולות ממתינות',
      loadingDash: 'טוען מסמכים…',
      retry: 'נסה שוב',
      back: 'חזרה',
      invoiceTitle: 'חשבונית ותשלום',
      viewDocTitle: 'צפייה במסמך',
      signTitle: 'חתימה דיגיטלית',
      pdfUnavailable: 'תצוגת PDF אינה זמינה',
      openDoc: 'פתח מסמך',
      payTitle: 'תשלום מאובטח',
      cardName: 'שם על הכרטיס',
      cardNumber: 'מספר כרטיס',
      cardExp: 'תוקף',
      payNow: 'שלם עכשיו',
      paying: 'מעבד תשלום…',
      contractP1: 'מסמך זה מהווה הסכם התקשרות בין הלקוח לבין ספק השירות. הלקוח מאשר שקרא את תנאי השירות, האחריות ותנאי התשלום.',
      contractP2: 'חתימה דיגיטלית במסמך זה מחייבת כמו חתימה בכתב יד. עותק יישלח אליך לאחר האישור.',
      agreeTerms: 'קראתי ואני מסכים/ה לתנאי ההסכם',
      agreePrivacy: 'אני מאשר/ת קבלת עותק דיגיטלי',
      signPadLabel: 'חתימה',
      clearSign: 'נקה',
      submitSign: 'אשר וחתום',
      submitting: 'שולח…',
      paidOkTitle: 'התשלום התקבל',
      signedOkTitle: 'המסמך נחתם',
      backDash: 'חזרה ללוח הבקרה',
      badgePay: 'לתשלום',
      badgeSign: 'לחתימה',
      badgeDone: 'בוצע',
      actionPaySub: 'חשבונית ממתינה לתשלום',
      actionSignSub: 'מסמך ממתין לחתימה דיגיטלית',
      actionDonePaySub: 'לחץ לצפייה ב־PDF',
      actionDoneSignSub: 'לחץ לצפייה במסמך',
      doneTitle: 'הושלם',
      emptyActions: 'אין פעולות ממתינות כרגע',
      emptyDone: 'אין פריטים שהושלמו עדיין',
      emptyFilter: 'אין פריטים במסנן זה',
      filterAll: 'הכל',
      filterInvoice: 'חשבונית',
      filterSign: 'חתימה',
      pagePrev: 'הקודם',
      pageNext: 'הבא',
      pageOf: '{from}–{to} מתוך {total}',
      pageLabel: 'עמוד {page} מתוך {pages}',
      errPhone: 'יש להזין מספר נייד תקין',
      errCreds: 'יש למלא מזהה וסיסמה לאימות Biz1',
      errOtp: 'יש להזין קוד אימות',
      errOtpInvalid: 'קוד האימות שגוי',
      errOtpExpired: 'קוד האימות פג תוקף. יש לבקש קוד חדש',
      errCustomer: 'לא נמצא לקוח עם מספר זה',
      errLogin: 'ההתחברות נכשלה',
      errOtpRequired: 'נדרש קוד אימות שנשלח אליך',
      errPayFields: 'יש למלא את פרטי הכרטיס',
      errPay: 'התשלום נדחה על ידי השרת',
      errAgree: 'יש לאשר את התנאים',
      errSignEmpty: 'יש לחתום בלוח החתימה',
      errSign: 'שליחת החתימה נכשלה',
      errApi: 'שגיאת API',
      otpViaWa: 'נשלח בוואטסאפ אל {phone}',
      otpViaSms: 'נשלח ב-SMS אל {phone}',
      paidFor: 'תשלום עבור {title} אושר',
      signedFor: '{title} נחתם בהצלחה'
    },
    en: {
      langLabel: 'Language',
      toggleTheme: 'Light / Dark mode',
      pageTitle: 'Biz1 Showcase — Customer Portal',
      brandName: 'Biz1 Showcase',
      brandSub: 'Secure customer portal',
      loginTitle: 'Secure Customer Login (Magic Link / OTP)',
      loginHint: 'Passwordless login via WhatsApp or SMS OTP code sent through Biz1.',
      phoneLabel: 'Mobile number',
      phonePlaceholder: '050-1234567',
      channelLabel: 'How should we send the code?',
      channelWa: 'WhatsApp',
      channelSms: 'SMS',
      authDetails: 'Biz1 account verification (required for API)',
      emailLabel: 'Email, username, phone or ID',
      loginIdPlaceholder: 'email / username / phone / ID',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Password',
      sendCode: 'Send verification code',
      sending: 'Sending…',
      otpSentTitle: 'Code sent',
      otpLabel: 'Verification code (OTP)',
      otpPlaceholder: 'Enter code',
      verifyOtp: 'Verify & continue',
      verifying: 'Verifying…',
      changePhone: 'Change number',
      liveSocketOn: 'Live Socket',
      liveSocketOff: 'Offline',
      trustLine: 'Encrypted · Biz1 · Card not stored on device',
      footerNote: 'Biz1 Showcase · Customer portal',
      hello: 'Hello',
      logout: 'Log out',
      refresh: 'Refresh',
      statusTitle: 'Service status',
      statusLoading: 'Loading…',
      statusActive: 'Service active',
      statusActions: 'You have pending action items',
      statusClear: 'All clear — no pending actions',
      actionsTitle: 'Pending actions',
      loadingDash: 'Loading documents…',
      retry: 'Retry',
      back: 'Back',
      invoiceTitle: 'Invoice & payment',
      viewDocTitle: 'View document',
      signTitle: 'Digital signature',
      pdfUnavailable: 'PDF preview unavailable',
      openDoc: 'Open document',
      payTitle: 'Secure payment',
      cardName: 'Name on card',
      cardNumber: 'Card number',
      cardExp: 'Expiry',
      payNow: 'Pay now',
      paying: 'Processing…',
      contractP1: 'This document is an agreement between you and the service provider. By signing you confirm you have read the service, warranty, and payment terms.',
      contractP2: 'A digital signature is binding like a handwritten one. A copy will be sent to you after confirmation.',
      agreeTerms: 'I have read and agree to the agreement terms',
      agreePrivacy: 'I agree to receive a digital copy',
      signPadLabel: 'Signature',
      clearSign: 'Clear',
      submitSign: 'Confirm & sign',
      submitting: 'Submitting…',
      paidOkTitle: 'Payment received',
      signedOkTitle: 'Document signed',
      backDash: 'Back to dashboard',
      badgePay: 'Pay',
      badgeSign: 'Sign',
      badgeDone: 'Done',
      actionPaySub: 'Invoice awaiting payment',
      actionSignSub: 'Document awaiting digital signature',
      actionDonePaySub: 'Tap to view PDF',
      actionDoneSignSub: 'Tap to view document',
      doneTitle: 'Completed',
      emptyActions: 'No pending actions right now',
      emptyDone: 'No completed items yet',
      emptyFilter: 'No items in this filter',
      filterAll: 'All',
      filterInvoice: 'Invoice',
      filterSign: 'Sign',
      pagePrev: 'Previous',
      pageNext: 'Next',
      pageOf: '{from}–{to} of {total}',
      pageLabel: 'Page {page} of {pages}',
      errPhone: 'Enter a valid mobile number',
      errCreds: 'Enter Biz1 identifier and password',
      errOtp: 'Enter the verification code',
      errOtpInvalid: 'Verification code is incorrect',
      errOtpExpired: 'Verification code expired. Request a new code',
      errCustomer: 'No customer found for this number',
      errLogin: 'Sign-in failed',
      errOtpRequired: 'A verification code was sent to you',
      errPayFields: 'Fill in card details',
      errPay: 'Payment was rejected by the server',
      errAgree: 'Please accept the terms',
      errSignEmpty: 'Please sign on the pad',
      errSign: 'Signature submission failed',
      errApi: 'API error',
      otpViaWa: 'Sent via WhatsApp to {phone}',
      otpViaSms: 'Sent via SMS to {phone}',
      paidFor: 'Payment for {title} confirmed',
      signedFor: '{title} signed successfully'
    }
  };

  var state = {
    lang: 'en',
    channel: 'whatsapp',
    waitingOtp: false,
    phone: '',
    customer: null,
    docs: [],
    actionGroups: null,
    actionFilter: 'all',
    currentDoc: null,
    drawing: false,
    hasStroke: false,
    realtimeStarted: false,
    dashRefreshing: false,
    pageSizeMobile: 5,
    pageSizeDesktop: 18,
    pendingPage: 1,
    donePage: 1,
    otpMode: 'staff',
    customerOtpCode: '',
    customerOtpExpiresAt: 0,
    otpCustomerId: ''
  };

  var docsRefreshTimer = null;
  var liveSocketPollTimer = null;
  var els = {};

  function t(key) {
    var pack = I18N[state.lang] || I18N.he;
    return pack[key] != null ? pack[key] : key;
  }

  function fmt(key, vars) {
    var s = t(key);
    Object.keys(vars || {}).forEach(function (k) {
      s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
    });
    return s;
  }

  function $(id) { return document.getElementById(id); }

  function applyI18n() {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'he' ? 'rtl' : 'ltr';
    var shell = document.getElementById('appShell');
    if (shell) shell.setAttribute('dir', state.lang === 'he' ? 'rtl' : 'ltr');
    document.title = brandName() + (state.lang === 'he' ? ' — פורטל לקוחות' : ' — Customer Portal');
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (!key) return;
      if (key === 'brandName' || key === 'footerNote') {
        el.textContent = key === 'brandName' ? brandName() : (brandName() + (state.lang === 'he' ? ' · פורטל לקוחות' : ' · Customer portal'));
        return;
      }
      el.textContent = t(key);
    });
    var hint = document.getElementById('loginHint');
    if (hint) {
      hint.textContent = t('loginHint');
      hint.setAttribute('title', hostLabel());
    }
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (key) el.setAttribute('placeholder', t(key));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-title');
      if (key) el.setAttribute('title', t(key));
    });
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-lang') === state.lang);
    });
    paintLiveSocketChip();
  }

  /**
   * Live Socket chip — strict ON only when socket connected AND biz1:ready.
   * Never treat registered[] as truthy (empty array is truthy in JS).
   */
  function paintLiveSocketChip() {
    var chip = document.getElementById('liveSocketChip');
    if (!chip) return;
    var st = { connected: false, status: 'off' };
    try {
      var MB = app();
      if (MB && typeof MB.getRealtimeState === 'function') {
        st = MB.getRealtimeState() || st;
      }
    } catch (e) { /* ignore */ }

    var on = !!(st.connected && st.status === 'ready');
    chip.classList.toggle('live-on', on);
    chip.classList.toggle('live-off', !on);
    var label = chip.querySelector('[data-live-label]');
    if (label) label.textContent = on ? t('liveSocketOn') : t('liveSocketOff');
    chip.setAttribute('title', on ? t('liveSocketOn') : t('liveSocketOff'));
  }

  function setLang(lang) {
    state.lang = lang === 'en' ? 'en' : 'he';
    try { localStorage.setItem(LANG_KEY, state.lang); } catch (e) { /* ignore */ }
    applyI18n();
    if (state.actionGroups) renderActions(filterActionGroups(state.actionGroups));
  }

  function updateActionFilterUi() {
    var filter = state.actionFilter || 'all';
    document.querySelectorAll('#actionFilters .action-filter').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-filter') === filter);
    });
  }

  function setActionFilter(filter) {
    var next = filter === 'invoice' || filter === 'sign' ? filter : 'all';
    state.actionFilter = next;
    state.pendingPage = 1;
    state.donePage = 1;
    updateActionFilterUi();
    if (state.actionGroups) renderActions(filterActionGroups(state.actionGroups));
  }

  function getPageSize() {
    var isDesktop = !!(window.matchMedia && window.matchMedia('(min-width: 1024px)').matches);
    return isDesktop ? state.pageSizeDesktop : state.pageSizeMobile;
  }

  function clampPage(page, totalItems, pageSize) {
    var pages = Math.max(1, Math.ceil((totalItems || 0) / pageSize));
    var p = Number(page) || 1;
    if (p < 1) p = 1;
    if (p > pages) p = pages;
    return { page: p, pages: pages };
  }

  function slicePage(items, page, pageSize) {
    var list = items || [];
    var meta = clampPage(page, list.length, pageSize);
    var start = (meta.page - 1) * pageSize;
    return {
      items: list.slice(start, start + pageSize),
      page: meta.page,
      pages: meta.pages,
      total: list.length,
      from: list.length ? start + 1 : 0,
      to: Math.min(start + pageSize, list.length)
    };
  }

  function renderPagination(container, meta, which) {
    if (!container) return;
    container.innerHTML = '';
    container.classList.remove('list-pager--desktop');
    container.classList.remove('list-pager--mobile');
    var pageSize = getPageSize();
    if (!meta || meta.total <= pageSize) {
      container.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');

    var isDesktop = !!(window.matchMedia && window.matchMedia('(min-width: 1024px)').matches);
    var setPage = function (page) {
      if (which === 'pending') state.pendingPage = page;
      else state.donePage = page;
      if (state.actionGroups) renderActions(filterActionGroups(state.actionGroups));
    };

    var prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'page-btn';
    prev.textContent = t('pagePrev');
    prev.disabled = meta.page <= 1;
    prev.addEventListener('click', function () { setPage(meta.page - 1); });

    var info = document.createElement('div');
    info.className = 'page-info';
    info.innerHTML =
      '<span class="page-range"></span>' +
      '<span class="page-count"></span>';
    info.querySelector('.page-range').textContent = fmt('pageOf', {
      from: meta.from,
      to: meta.to,
      total: meta.total
    });
    info.querySelector('.page-count').textContent = fmt('pageLabel', {
      page: meta.page,
      pages: meta.pages
    });

    var next = document.createElement('button');
    next.type = 'button';
    next.className = 'page-btn';
    next.textContent = t('pageNext');
    next.disabled = meta.page >= meta.pages;
    next.addEventListener('click', function () { setPage(meta.page + 1); });

    if (!isDesktop) {
      container.classList.add('list-pager--mobile');
      container.appendChild(prev);
      container.appendChild(info);
      container.appendChild(next);
      return;
    }

    container.classList.add('list-pager--desktop');
    var numbers = document.createElement('div');
    numbers.className = 'page-numbers';

    var pagesToShow = [];
    var start = Math.max(1, meta.page - 2);
    var end = Math.min(meta.pages, start + 4);
    start = Math.max(1, end - 4);
    for (var p = start; p <= end; p++) pagesToShow.push(p);

    if (start > 1) {
      var first = document.createElement('button');
      first.type = 'button';
      first.className = 'page-num';
      first.textContent = '1';
      first.addEventListener('click', function () { setPage(1); });
      numbers.appendChild(first);
      if (start > 2) {
        var dotsA = document.createElement('span');
        dotsA.className = 'page-dots';
        dotsA.textContent = '...';
        numbers.appendChild(dotsA);
      }
    }

    pagesToShow.forEach(function (p) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'page-num' + (p === meta.page ? ' is-active' : '');
      btn.textContent = String(p);
      btn.disabled = p === meta.page;
      btn.addEventListener('click', function () { setPage(p); });
      numbers.appendChild(btn);
    });

    if (end < meta.pages) {
      if (end < meta.pages - 1) {
        var dotsB = document.createElement('span');
        dotsB.className = 'page-dots';
        dotsB.textContent = '...';
        numbers.appendChild(dotsB);
      }
      var last = document.createElement('button');
      last.type = 'button';
      last.className = 'page-num';
      last.textContent = String(meta.pages);
      last.addEventListener('click', function () { setPage(meta.pages); });
      numbers.appendChild(last);
    }

    container.appendChild(info);
    container.appendChild(numbers);
    container.appendChild(prev);
    container.appendChild(next);
  }

  function filterActionGroups(groups) {
    var pending = ((groups && groups.pending) || []).slice();
    var done = ((groups && groups.done) || []).slice();
    var filter = state.actionFilter || 'all';
    if (filter === 'invoice') {
      pending = pending.filter(function (a) { return a.kind === 'pay'; });
      done = done.filter(function (a) { return a.kind === 'done-pay'; });
    } else if (filter === 'sign') {
      pending = pending.filter(function (a) { return a.kind === 'sign'; });
      done = done.filter(function (a) { return a.kind === 'done-sign'; });
    }
    return {
      pending: pending,
      done: done,
      allPendingCount: ((groups && groups.pending) || []).length
    };
  }

  function tickClocks() {
    var now = new Date();
    var hh = String(now.getHours()).padStart(2, '0');
    var mm = String(now.getMinutes()).padStart(2, '0');
    var label = hh + ':' + mm;
    ['clockLogin', 'clockDash', 'clockInv', 'clockSign'].forEach(function (id) {
      var el = $(id);
      if (el) el.textContent = label;
    });
  }

  function showScreen(id) {
    var screens = ['screenLogin', 'screenDash', 'screenInvoice', 'screenSign', 'screenPaidOk', 'screenSignedOk'];
    screens.forEach(function (sid) {
      var el = $(sid);
      if (!el) return;
      if (sid === id) {
        el.classList.remove('hidden');
        el.classList.add('screen--enter');
      } else {
        el.classList.add('hidden');
        el.classList.remove('screen--enter');
      }
    });
  }

  function showLoginError(msg) {
    els.errorBox.classList.remove('hidden');
    els.errorText.textContent = msg || t('errLogin');
  }

  function hideLoginError() {
    els.errorBox.classList.add('hidden');
    els.errorText.textContent = '';
  }

  function setChannel(ch) {
    state.channel = ch === 'sms' ? 'sms' : 'whatsapp';
    try { sessionStorage.setItem(CHANNEL_KEY, state.channel); } catch (e) { /* ignore */ }
    document.querySelectorAll('.channel-btn').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-channel') === state.channel);
    });
  }

  function app() {
    return window.Biz1App || window.MineralBarApp;
  }

  function brandName() {
    var cfg = window.Biz1Config && Biz1Config.brand;
    if (cfg) return cfg[state.lang] || cfg.en || cfg.he || 'Biz1 Showcase';
    return 'Biz1 Showcase';
  }

  function hostLabel() {
    try {
      if (app() && app().getDomain) return String(app().getDomain()).replace(/^https?:\/\//, '');
    } catch (e) { /* ignore */ }
    var u = (window.Biz1Config && Biz1Config.user) || 'demo';
    return String(u).replace(/^https?:\/\//, '').replace(/\.bull36\.com.*$/i, '') + '.bull36.com';
  }

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function setTheme(theme) {
    var next = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
  }

  function toggleTheme() {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  }

  function customerDisplayName(c) {
    if (!c) return '—';
    return c.full_name || c.name || c.customer_name || c.cust_name ||
      ((c.first_name || '') + ' ' + (c.last_name || '')).trim() ||
      ('#' + (c.customer_id || c.id || ''));
  }

  function customerMeta(c) {
    if (!c) return '';
    var phone = c.phone || c.mobile || c.cell || state.phone || '';
    var city = c.city || c.address_city || c.town || '';
    return [phone, city].filter(Boolean).join(' · ');
  }

  async function resolveCustomerAfterAuth(phone) {
    var MB = app();
    var digits = MB.normalizePhone(phone);

    // Resolve customer by phone number (not CRM id)
    if (digits && digits.length >= 7) {
      var found = await MB.findCustomerByPhone(phone);
      if (!found.customer) {
        var err = new Error(t('errCustomer'));
        err.code = 'NO_CUSTOMER';
        throw err;
      }
      var id = String(found.customer.customer_id || found.customer.cust_id || found.customer.id || '');
      if (!id) throw new Error(t('errCustomer'));
      MB.setPortalCustomerId(id);
      try {
        var full = await MB.getCustomer(id);
        return full.customer;
      } catch (e) {
        return found.customer;
      }
    }

    var fromStore = MB.getPortalCustomerId();
    if (fromStore) {
      var got = await MB.getCustomer(fromStore);
      return got.customer;
    }

    var missing = new Error(t('errCustomer'));
    missing.code = 'NO_CUSTOMER';
    throw missing;
  }

  function pickCredentials() {
    var MB = app();
    var loginRaw = (els.username.value || '').trim();
    var password = els.password.value || '';
    var saved = null;
    try { saved = MB.getSavedCredentials(); } catch (e) { saved = null; }
    if (!loginRaw && saved) loginRaw = saved.username || '';
    if (!password && saved) password = saved.password || '';
    if (!loginRaw) {
      try { loginRaw = MB.getEmail() || ''; } catch (e2) { /* ignore */ }
    }
    if (!password) {
      try { password = sessionStorage.getItem('biz1demo_session_pass') || ''; } catch (e3) { /* ignore */ }
    }
    var identified = MB.detectLoginIdentifier(loginRaw);
    return {
      username: loginRaw,
      password: password,
      identifier: identified,
      field: identified.field || 'username'
    };
  }

  function generateCustomerOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function buildPortalLoginLink(customerId) {
    try {
      var u = new URL(window.location.href);
      u.searchParams.set('customer_id', String(customerId));
      return u.toString();
    } catch (e) {
      var base = String((window.location && window.location.origin) || '') + String((window.location && window.location.pathname) || '/');
      return base + '?customer_id=' + encodeURIComponent(String(customerId));
    }
  }

  async function sendCustomerOtpMessage(customer, phone, channel) {
    var MB = app();
    var customerId = String(customer.customer_id || customer.cust_id || customer.id || '');
    if (!customerId) throw new Error(t('errCustomer'));

    var otpCode = generateCustomerOtp();
    var expiresMins = 10;
    var link = buildPortalLoginLink(customerId);
    var msg =
      'Biz1 Login Code: ' + otpCode +
      '\nValid for ' + expiresMins + ' minutes.' +
      '\nPortal link: ' + link;
    var from = channel === 'sms' ? 'send_sms' : 'send_whatsapp';
    var targetPhone = MB.normalizePhone(phone) || MB.normalizePhone(customer.mobile || customer.phone || customer.whatsapp || customer.cell || '');

    var sent = await MB.sendCustomerMessage({
      customer_id: customerId,
      message: msg,
      from: from,
      chart_selected_phone_no: targetPhone
    });

    state.otpMode = 'customer';
    state.customerOtpCode = otpCode;
    state.customerOtpExpiresAt = Date.now() + (expiresMins * 60 * 1000);
    state.otpCustomerId = customerId;
    return sent;
  }

  function setOtpSentSub(phone, customer) {
    var MB = app();
    var dest = MB.normalizePhone(phone) ||
      MB.normalizePhone((customer && (customer.mobile || customer.phone || customer.whatsapp || customer.cell)) || '') ||
      String(phone || state.phone || '').trim() ||
      '—';
    els.otpSentSub.textContent = state.channel === 'sms'
      ? fmt('otpViaSms', { phone: dest })
      : fmt('otpViaWa', { phone: dest });
  }

  async function sendCode(ev) {
    if (ev) ev.preventDefault();
    hideLoginError();
    var phone = (els.phone.value || '').trim();
    var MB = app();
    var creds = pickCredentials();
    var username = creds.username;
    var password = creds.password;

    if (!MB.normalizePhone(phone) || MB.normalizePhone(phone).length < 7) {
      showLoginError(t('errPhone'));
      return;
    }

    state.phone = phone;
    MB.setPortalPhone(phone);
    try { localStorage.setItem('biz1ss_last_phone', phone); } catch (e0) { /* ignore */ }

    // Always need Biz1 staff credentials for API (reuse remembered ones after logout)
    if (!username || !password) {
      showLoginError(t('errCreds'));
      var details = document.querySelector('.auth-details');
      if (details) details.open = true;
      if (username && els.username) els.username.value = username;
      return;
    }

    if (els.username && !els.username.value) els.username.value = username;

    els.sendCodeBtn.disabled = true;
    els.sendCodeText.textContent = t('sending');

    try {
      // Always login again so second visit / after-logout works with a fresh token.
      // Detect email/username/phone/id and send the matching Login API field.
      var result = await MB.login({
        username: username,
        password: password,
        otp: '',
        remember: true,
        identifier: creds.identifier
      });
      if (result && result.otpRequired) {
        state.otpMode = 'staff';
        state.waitingOtp = true;
        els.stepPhone.classList.add('hidden');
        els.stepOtp.classList.remove('hidden');
        setOtpSentSub(phone, state.customer);
        els.otp.focus();
        return;
      }
      if (!result || !result.ok) throw new Error(t('errLogin'));

      state.customer = await resolveCustomerAfterAuth(phone);
      await sendCustomerOtpMessage(state.customer, phone, state.channel);
      state.waitingOtp = true;
      els.stepPhone.classList.add('hidden');
      els.stepOtp.classList.remove('hidden');
      setOtpSentSub(phone, state.customer);
      els.otp.focus();
      return;
    } catch (err) {
      if (err && err.otpRequired) {
        state.otpMode = 'staff';
        state.waitingOtp = true;
        els.stepPhone.classList.add('hidden');
        els.stepOtp.classList.remove('hidden');
        setOtpSentSub(phone, state.customer);
        showLoginError(err.message || t('errOtpRequired'));
        return;
      }
      showLoginError((err && err.message) || t('errLogin'));
    } finally {
      els.sendCodeBtn.disabled = false;
      els.sendCodeText.textContent = t('sendCode');
    }
  }

  async function verifyOtp() {
    hideLoginError();
    var otp = (els.otp.value || '').trim();
    var MB = app();
    var creds = pickCredentials();
    var username = creds.username;
    var password = creds.password;

    if (!otp) {
      showLoginError(t('errOtp'));
      return;
    }

    if (state.otpMode === 'customer') {
      if (!state.customerOtpCode || !state.otpCustomerId) {
        showLoginError(t('errOtpExpired'));
        return;
      }
      if (Date.now() > Number(state.customerOtpExpiresAt || 0)) {
        showLoginError(t('errOtpExpired'));
        return;
      }
      if (String(otp) !== String(state.customerOtpCode)) {
        showLoginError(t('errOtpInvalid'));
        return;
      }
      try {
        var MB2 = app();
        var got = await MB2.getCustomer(state.otpCustomerId);
        state.customer = got.customer || state.customer;
        state.customerOtpCode = '';
        state.customerOtpExpiresAt = 0;
        state.otpCustomerId = '';
        state.waitingOtp = false;
        await enterDashboard();
      } catch (errCustomerOtp) {
        showLoginError((errCustomerOtp && errCustomerOtp.message) || t('errLogin'));
      }
      return;
    }

    if (!username || !password) {
      showLoginError(t('errCreds'));
      var details = document.querySelector('.auth-details');
      if (details) details.open = true;
      return;
    }

    els.verifyOtpBtn.disabled = true;
    els.verifyOtpText.textContent = t('verifying');

    try {
      var result = await MB.login({
        username: username,
        password: password,
        otp: otp,
        remember: true,
        identifier: creds.identifier
      });
      if (result && result.otpRequired) {
        showLoginError(result.message || t('errOtpRequired'));
        return;
      }
      if (!result || !result.ok) throw new Error(t('errLogin'));

      state.customer = await resolveCustomerAfterAuth(state.phone || els.phone.value);
      await enterDashboard();
    } catch (err) {
      showLoginError((err && err.message) || t('errLogin'));
    } finally {
      els.verifyOtpBtn.disabled = false;
      els.verifyOtpText.textContent = t('verifyOtp');
    }
  }

  async function enterDashboard() {
    showScreen('screenDash');
    await loadDashboard({ silent: false });
    startPortalRealtime();
  }

  function portalCustomerId() {
    var MB = app();
    var id = MB.getPortalCustomerId();
    if (!id && state.customer) {
      id = String(state.customer.customer_id || state.customer.cust_id || state.customer.id || '');
    }
    return id ? String(id) : '';
  }

  function eventMatchesPortalCustomer(detail) {
    var portalId = portalCustomerId();
    if (!portalId) return false;
    var eventCust = detail && detail.customer_id ? String(detail.customer_id) : '';
    // Some document events have no customer_id — still refresh while dashboard is open.
    if (!eventCust) return true;
    return eventCust === portalId;
  }

  function scheduleDocsRefresh(reason) {
    if (docsRefreshTimer) clearTimeout(docsRefreshTimer);
    docsRefreshTimer = setTimeout(function () {
      docsRefreshTimer = null;
      var dash = $('screenDash');
      var paidOk = $('screenPaidOk');
      var signedOk = $('screenSignedOk');
      var onDash = dash && !dash.classList.contains('hidden');
      var onOk = (paidOk && !paidOk.classList.contains('hidden')) ||
        (signedOk && !signedOk.classList.contains('hidden'));
      if (!onDash && !onOk) return;
      loadDashboard({ silent: true, reason: reason || 'socket' });
    }, 700);
  }

  function startPortalRealtime() {
    var MB = app();
    if (state.realtimeStarted) {
      paintLiveSocketChip();
      return;
    }
    state.realtimeStarted = true;
    paintLiveSocketChip();

    MB.connectRealtime().then(function (res) {
      var ready = res && res.ready;
      var events = (ready && ready.events) || MB.getRegisteredRealtimeEvents() || [];
      console.info('[Portal] realtime ready', events.length, 'events');
      paintLiveSocketChip();
    }).catch(function (err) {
      state.realtimeStarted = false;
      console.warn('[Portal] realtime connect failed', err && err.message ? err.message : err);
      paintLiveSocketChip();
    });
  }

  function stopPortalRealtime() {
    state.realtimeStarted = false;
    if (docsRefreshTimer) {
      clearTimeout(docsRefreshTimer);
      docsRefreshTimer = null;
    }
    try { app().disconnectRealtime(); } catch (e) { /* ignore */ }
    paintLiveSocketChip();
  }

  function onPortalDocumentsRealtime(ev) {
    var detail = (ev && ev.detail) || {};
    if (!eventMatchesPortalCustomer(detail)) return;
    scheduleDocsRefresh(detail.key || 'documents');
  }

  function onPortalRealtime(ev) {
    var detail = (ev && ev.detail) || {};
    if (detail.group !== 'documents' && detail.group !== 'other') return;
    // Also catch customer.* via documents group (already), and any key hinting docs.
    var key = String(detail.key || '');
    if (detail.group === 'other' && !/document|invoice|receipt|payment|order|proposal|quote|sign|approve|paid|customer/i.test(key)) {
      return;
    }
    if (!eventMatchesPortalCustomer(detail)) return;
    scheduleDocsRefresh(key || 'realtime');
  }

  function classifyActions(docs) {
    var pending = [];
    var done = [];
    (docs || []).forEach(function (d) {
      if (d.unpaid) {
        pending.push({ kind: 'pay', doc: d });
      } else if (d.needsSign) {
        pending.push({ kind: 'sign', doc: d });
      } else if (d.type === 'invoice' && d.paid && Number(d.amount) > 0) {
        // Only invoices actually closed in CRM (receipt linked / portal paid) go to Done.
        done.push({ kind: 'done-pay', doc: d });
      } else if ((d.type === 'quote' || d.type === 'contract') && d.signed) {
        done.push({ kind: 'done-sign', doc: d });
      }
    });
    return { pending: pending, done: done };
  }

  function renderActionCard(a) {
    var isDone = a.kind === 'done-pay' || a.kind === 'done-sign';
    var isPay = a.kind === 'pay' || a.kind === 'done-pay';
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'action-card' + (isDone ? ' action-card--done' : '');
    var iconClass = isPay ? 'action-icon--pay' : 'action-icon--sign';
    if (isDone) iconClass = 'action-icon--done';
    var badgeClass = isDone ? 'action-badge--done' : (a.kind === 'pay' ? 'action-badge--pay' : 'action-badge--sign');
    var badge = isDone ? t('badgeDone') : (a.kind === 'pay' ? t('badgePay') : t('badgeSign'));
    var sub = a.kind === 'pay' ? t('actionPaySub')
      : a.kind === 'sign' ? t('actionSignSub')
      : a.kind === 'done-pay' ? t('actionDonePaySub')
      : t('actionDoneSignSub');
    var amount = a.doc.amount != null ? (' · ' + a.doc.amount) : '';
    el.innerHTML =
      '<div class="action-icon ' + iconClass + '">' +
        (isDone
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6 9 17l-5-5"/></svg>'
          : isPay
            ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>'
            : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M3 19c2-1 3-3 4.5-6S10 6 11 6s1 2 1.5 4 1 4 2 4 2-2 3-2 2 1 3 1"/></svg>') +
      '</div>' +
      '<div class="action-body">' +
        '<div class="action-title"></div>' +
        '<div class="action-sub"></div>' +
      '</div>' +
      '<span class="action-badge ' + badgeClass + '"></span>';
    el.querySelector('.action-title').textContent = a.doc.title + amount;
    el.querySelector('.action-sub').textContent = sub;
    el.querySelector('.action-badge').textContent = badge;
    el.addEventListener('click', function () {
      if (a.kind === 'pay') openInvoice(a.doc, { viewOnly: false });
      else if (a.kind === 'sign') openSign(a.doc);
      else openDocumentPdf(a.doc);
    });
    return el;
  }

  function renderActions(groups) {
    var pageSize = getPageSize();
    var pending = (groups && groups.pending) || [];
    var done = (groups && groups.done) || [];
    var allPendingCount = groups && groups.allPendingCount != null
      ? groups.allPendingCount
      : pending.length;
    var list = els.actionsList;
    var doneList = els.doneList;
    var pendingPager = els.pendingPager || $('pendingPager');
    var donePager = els.donePager || $('donePager');
    list.innerHTML = '';
    if (doneList) doneList.innerHTML = '';
    updateActionFilterUi();

    var pendingPage = slicePage(pending, state.pendingPage, pageSize);
    state.pendingPage = pendingPage.page;
    var donePage = slicePage(done, state.donePage, pageSize);
    state.donePage = donePage.page;

    if (!pending.length) {
      var empty = document.createElement('div');
      empty.className = 'empty-actions';
      empty.textContent = (state.actionFilter && state.actionFilter !== 'all')
        ? t('emptyFilter')
        : t('emptyActions');
      list.appendChild(empty);
      els.statusLabel.textContent = t('statusActive');
      els.statusSub.textContent = allPendingCount ? t('statusActions') : t('statusClear');
      renderPagination(pendingPager, { total: 0 }, 'pending');
    } else {
      els.statusLabel.textContent = t('statusActive');
      els.statusSub.textContent = t('statusActions');
      pendingPage.items.forEach(function (a) { list.appendChild(renderActionCard(a)); });
      renderPagination(pendingPager, pendingPage, 'pending');
    }

    if (doneList) {
      if (!done.length) {
        var emptyDone = document.createElement('div');
        emptyDone.className = 'empty-actions';
        emptyDone.textContent = (state.actionFilter && state.actionFilter !== 'all')
          ? t('emptyFilter')
          : t('emptyDone');
        doneList.appendChild(emptyDone);
        renderPagination(donePager, { total: 0 }, 'done');
      } else {
        donePage.items.forEach(function (a) { doneList.appendChild(renderActionCard(a)); });
        renderPagination(donePager, donePage, 'done');
      }
    }
  }

  async function loadDashboard(options) {
    options = options || {};
    var silent = !!options.silent;
    var MB = app();
    if (state.dashRefreshing && silent) return;
    state.dashRefreshing = true;

    els.dashError.classList.add('hidden');
    if (!silent) {
      els.actionsList.innerHTML = '<div class="loading-msg">' + t('loadingDash') + '</div>';
      if (els.doneList) els.doneList.innerHTML = '';
      if (els.pendingPager) els.pendingPager.classList.add('hidden');
      if (els.donePager) els.donePager.classList.add('hidden');
      els.statusLabel.textContent = t('statusLoading');
      els.statusSub.textContent = '';
      state.pendingPage = 1;
      state.donePage = 1;
    }

    try {
      var custId = MB.getPortalCustomerId();
      if (!custId && state.customer) {
        custId = String(state.customer.customer_id || state.customer.cust_id || state.customer.id || '');
        if (custId) MB.setPortalCustomerId(custId);
      }
      if (!custId) throw new Error(t('errCustomer'));

      if (!state.customer) {
        var got = await MB.getCustomer(custId);
        state.customer = got.customer;
      }

      els.custName.textContent = customerDisplayName(state.customer);
      els.custMeta.textContent = customerMeta(state.customer) || ('ID ' + custId);

      var docsResult = await MB.listCustomerDocuments(custId);
      state.docs = docsResult.docs || [];
      state.actionGroups = classifyActions(state.docs);
      renderActions(filterActionGroups(state.actionGroups));
      if (silent && options.reason) {
        console.info('[Portal] docs refreshed via', options.reason);
      }
    } catch (err) {
      if (!silent) {
        els.actionsList.innerHTML = '';
        if (els.doneList) els.doneList.innerHTML = '';
        els.dashError.classList.remove('hidden');
        els.dashErrorText.textContent = (err && err.message) || t('errApi');
        els.statusLabel.textContent = t('errApi');
        els.statusSub.textContent = '';
      } else {
        console.warn('[Portal] silent docs refresh failed', err);
      }
    } finally {
      state.dashRefreshing = false;
    }
  }

  function resolveDocPdfUrl(doc) {
    doc = doc || {};
    var raw = doc.raw || {};
    return doc.url || raw.pdf_url || raw.url || raw.file_url || raw.text_url || '';
  }

  function setInvoicePdf(url) {
    if (url) {
      els.pdfFrame.src = url;
      els.pdfOpenLink.href = url;
      els.pdfFallback.classList.add('hidden');
      els.pdfFrame.classList.remove('hidden');
      els.pdfFrame.onerror = function () {
        els.pdfFallback.classList.remove('hidden');
      };
      setTimeout(function () {
        if (!url.match(/\.pdf(\?|$)/i) && url.indexOf('http') !== 0) {
          els.pdfFallback.classList.remove('hidden');
        }
      }, 800);
    } else {
      els.pdfFrame.removeAttribute('src');
      els.pdfFallback.classList.remove('hidden');
      els.pdfOpenLink.removeAttribute('href');
    }
  }

  function openInvoice(doc, options) {
    options = options || {};
    var viewOnly = !!options.viewOnly;
    state.currentDoc = doc;
    showScreen('screenInvoice');
    els.invDocTitle.textContent = doc.title || '—';
    els.invAmount.textContent = doc.amount != null ? String(doc.amount) : '';
    els.payError.classList.add('hidden');

    var payPanel = document.querySelector('#screenInvoice .pay-panel');
    if (payPanel) {
      if (viewOnly) payPanel.classList.add('is-hidden');
      else payPanel.classList.remove('is-hidden');
    }
    var pageTitle = document.querySelector('#screenInvoice .page-title');
    if (pageTitle) pageTitle.textContent = viewOnly ? t('viewDocTitle') : t('invoiceTitle');

    setInvoicePdf(resolveDocPdfUrl(doc));
  }

  function openDocumentPdf(doc) {
    openInvoice(doc, { viewOnly: true });
  }

  function openSign(doc) {
    state.currentDoc = doc;
    showScreen('screenSign');
    els.signDocTitle.textContent = doc.title || '—';
    els.signError.classList.add('hidden');
    els.agreeTerms.checked = false;
    els.agreePrivacy.checked = false;
    clearSignature();
    if (doc.url) {
      els.contractReader.innerHTML =
        '<p>' + t('contractP1') + '</p><p>' + t('contractP2') + '</p>' +
        '<p><a href="' + doc.url.replace(/"/g, '') + '" target="_blank" rel="noopener">' + t('openDoc') + '</a></p>';
    } else {
      els.contractReader.innerHTML = '<p>' + t('contractP1') + '</p><p>' + t('contractP2') + '</p>';
    }
  }

  async function submitPayment() {
    els.payError.classList.add('hidden');
    var name = (els.cardName.value || '').trim();
    var number = (els.cardNumber.value || '').replace(/\s+/g, '');
    var exp = (els.cardExp.value || '').trim();
    var cvv = (els.cardCvv.value || '').trim();
    if (!name || number.length < 12 || !exp || cvv.length < 3) {
      els.payError.classList.remove('hidden');
      els.payErrorText.textContent = t('errPayFields');
      return;
    }

    var MB = app();
    var doc = state.currentDoc || {};
    els.btnPay.disabled = true;
    els.btnPayText.textContent = t('paying');

    try {
      var paid = await MB.payInvoice({
        customer_id: MB.getPortalCustomerId(),
        document_id: doc.id,
        amount: doc.amount,
        card_holder: name,
        card_number: number,
        card_exp: exp,
        card_cvv: cvv,
        description: doc.title || 'Portal payment'
      });
      if (!paid || paid.ok === false) throw new Error(t('errPay'));

      els.paidOkSub.textContent = fmt('paidFor', { title: doc.title || doc.id || '' });
      showScreen('screenPaidOk');
      // clear sensitive fields
      els.cardNumber.value = '';
      els.cardCvv.value = '';
    } catch (err) {
      els.payError.classList.remove('hidden');
      els.payErrorText.textContent = (err && err.message) || t('errPay');
    } finally {
      els.btnPay.disabled = false;
      els.btnPayText.textContent = t('payNow');
    }
  }

  function setupSignaturePad() {
    var canvas = els.signPad;
    var ctx = canvas.getContext('2d');
    var ratio = window.devicePixelRatio || 1;
    var w = canvas.clientWidth || 340;
    var h = 140;
    canvas.width = Math.floor(w * ratio);
    canvas.height = Math.floor(h * ratio);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.strokeStyle = '#1f6b46';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    function pos(ev) {
      var rect = canvas.getBoundingClientRect();
      var tch = ev.touches && ev.touches[0];
      var x = (tch ? tch.clientX : ev.clientX) - rect.left;
      var y = (tch ? tch.clientY : ev.clientY) - rect.top;
      return { x: x, y: y };
    }

    function start(ev) {
      ev.preventDefault();
      state.drawing = true;
      var p = pos(ev);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }
    function move(ev) {
      if (!state.drawing) return;
      ev.preventDefault();
      var p = pos(ev);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      state.hasStroke = true;
    }
    function end() { state.drawing = false; }

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);
  }

  function clearSignature() {
    var canvas = els.signPad;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    state.hasStroke = false;
  }

  async function submitSignature() {
    els.signError.classList.add('hidden');
    if (!els.agreeTerms.checked || !els.agreePrivacy.checked) {
      els.signError.classList.remove('hidden');
      els.signErrorText.textContent = t('errAgree');
      return;
    }
    if (!state.hasStroke) {
      els.signError.classList.remove('hidden');
      els.signErrorText.textContent = t('errSignEmpty');
      return;
    }

    var MB = app();
    var doc = state.currentDoc || {};
    var dataUrl = els.signPad.toDataURL('image/png');
    els.btnSubmitSign.disabled = true;
    els.btnSubmitSignText.textContent = t('submitting');

    try {
      var result = await MB.submitSignature({
        customer_id: MB.getPortalCustomerId(),
        document_id: doc.id,
        title: doc.title,
        signature_png: dataUrl,
        agreed_terms: 1,
        agreed_copy: 1,
        channel: state.channel
      });
      if (!result || !result.ok) throw new Error(t('errSign'));
      els.signedOkSub.textContent = fmt('signedFor', { title: doc.title || doc.id || '' });
      showScreen('screenSignedOk');
    } catch (err) {
      els.signError.classList.remove('hidden');
      els.signErrorText.textContent = (err && err.message) || t('errSign');
    } finally {
      els.btnSubmitSign.disabled = false;
      els.btnSubmitSignText.textContent = t('submitSign');
    }
  }

  function logout() {
    var MB = app();
    stopPortalRealtime();
    try {
      MB.setPortalCustomerId('');
      MB.setPortalPhone('');
      // Keep remembered email/password so second login works without retyping
      MB.clearSession({ keepEmail: true, keepRemember: true });
    } catch (e) { /* ignore */ }
    state.customer = null;
    state.docs = [];
    state.waitingOtp = false;
    state.otpMode = 'staff';
    state.customerOtpCode = '';
    state.customerOtpExpiresAt = 0;
    state.otpCustomerId = '';
    state.phone = '';
    els.stepPhone.classList.remove('hidden');
    els.stepOtp.classList.add('hidden');
    els.otp.value = '';
    hideLoginError();
    try {
      var saved = MB.getSavedCredentials();
      if (saved && saved.username && els.username) els.username.value = saved.username;
      else if (MB.getEmail && els.username) els.username.value = MB.getEmail() || els.username.value;
      // password stays in remember store; input left blank on purpose
      if (els.password) els.password.value = '';
      var phoneSaved = '';
      try { phoneSaved = sessionStorage.getItem('biz1ss_last_phone') || ''; } catch (e2) { /* ignore */ }
      if (!phoneSaved) {
        try { phoneSaved = localStorage.getItem('biz1ss_last_phone') || ''; } catch (e3) { /* ignore */ }
      }
      if (phoneSaved && els.phone) els.phone.value = phoneSaved;
      var details = document.querySelector('.auth-details');
      if (details) details.open = true;
    } catch (e4) { /* ignore */ }
    showScreen('screenLogin');
  }

  async function boot() {
    els = {
      phone: $('phone'),
      username: $('username'),
      password: $('password'),
      otp: $('otp'),
      errorBox: $('errorBox'),
      errorText: $('errorText'),
      stepPhone: $('stepPhone'),
      stepOtp: $('stepOtp'),
      sendCodeBtn: $('sendCodeBtn'),
      sendCodeText: $('sendCodeText'),
      verifyOtpBtn: $('verifyOtpBtn'),
      verifyOtpText: $('verifyOtpText'),
      otpSentSub: $('otpSentSub'),
      custName: $('custName'),
      custMeta: $('custMeta'),
      statusLabel: $('statusLabel'),
      statusSub: $('statusSub'),
      actionsList: $('actionsList'),
      doneList: $('doneList'),
      pendingPager: $('pendingPager'),
      donePager: $('donePager'),
      dashError: $('dashError'),
      dashErrorText: $('dashErrorText'),
      invDocTitle: $('invDocTitle'),
      invAmount: $('invAmount'),
      pdfFrame: $('pdfFrame'),
      pdfFallback: $('pdfFallback'),
      pdfOpenLink: $('pdfOpenLink'),
      cardName: $('cardName'),
      cardNumber: $('cardNumber'),
      cardExp: $('cardExp'),
      cardCvv: $('cardCvv'),
      payError: $('payError'),
      payErrorText: $('payErrorText'),
      btnPay: $('btnPay'),
      btnPayText: $('btnPayText'),
      signDocTitle: $('signDocTitle'),
      contractReader: $('contractReader'),
      agreeTerms: $('agreeTerms'),
      agreePrivacy: $('agreePrivacy'),
      signPad: $('signPad'),
      signError: $('signError'),
      signErrorText: $('signErrorText'),
      btnSubmitSign: $('btnSubmitSign'),
      btnSubmitSignText: $('btnSubmitSignText'),
      paidOkSub: $('paidOkSub'),
      signedOkSub: $('signedOkSub')
    };

    try {
      var savedLang = localStorage.getItem(LANG_KEY) || localStorage.getItem('biz1demo_lang') || localStorage.getItem('mineralbar_portal_lang');
      if (savedLang === 'he' || savedLang === 'en') state.lang = savedLang;
    } catch (e) { /* ignore */ }
    try {
      var savedTheme = localStorage.getItem(THEME_KEY) || localStorage.getItem('biz1demo_theme') || localStorage.getItem('mineralbar_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') setTheme(savedTheme);
    } catch (e) { /* ignore */ }
    setLang(state.lang);
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', toggleTheme);
    });
    tickClocks();
    setInterval(tickClocks, 30000);
    setupSignaturePad();

    var saved = app().getSavedCredentials();
    if (saved && saved.username) els.username.value = saved.username;
    else {
      try {
        var emailOnly = app().getEmail();
        if (emailOnly) els.username.value = emailOnly;
      } catch (eMail) { /* ignore */ }
    }
    var phone = app().getPortalPhone();
    if (!phone) {
      try { phone = localStorage.getItem('biz1ss_last_phone') || ''; } catch (ePh) { phone = ''; }
    }
    if (phone) els.phone.value = phone;
    var detailsEl = document.querySelector('.auth-details');
    if (detailsEl) detailsEl.open = true;

    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { setLang(btn.getAttribute('data-lang')); });
    });
    document.querySelectorAll('.channel-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { setChannel(btn.getAttribute('data-channel')); });
    });
    document.querySelectorAll('#actionFilters .action-filter').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setActionFilter(btn.getAttribute('data-filter'));
      });
    });

    $('loginForm').addEventListener('submit', function (ev) {
      if (state.waitingOtp || !els.stepOtp.classList.contains('hidden')) {
        ev.preventDefault();
        verifyOtp();
      } else {
        sendCode(ev);
      }
    });
    els.verifyOtpBtn.addEventListener('click', verifyOtp);
    $('backPhoneBtn').addEventListener('click', function () {
      state.waitingOtp = false;
      state.otpMode = 'staff';
      state.customerOtpCode = '';
      state.customerOtpExpiresAt = 0;
      state.otpCustomerId = '';
      els.stepOtp.classList.add('hidden');
      els.stepPhone.classList.remove('hidden');
      hideLoginError();
    });
    $('btnLogout').addEventListener('click', logout);
    $('btnRefreshDash').addEventListener('click', function () { loadDashboard({ silent: false }); });
    $('btnRetryDash').addEventListener('click', function () { loadDashboard({ silent: false }); });
    $('btnInvBack').addEventListener('click', function () { showScreen('screenDash'); });
    $('btnSignBack').addEventListener('click', function () { showScreen('screenDash'); });
    $('btnPay').addEventListener('click', submitPayment);
    $('btnClearSign').addEventListener('click', clearSignature);
    $('btnSubmitSign').addEventListener('click', submitSignature);
    $('btnPaidToDash').addEventListener('click', function () {
      showScreen('screenDash');
      loadDashboard({ silent: false });
    });
    $('btnSignedToDash').addEventListener('click', function () {
      showScreen('screenDash');
      loadDashboard({ silent: false });
    });

    function onPortalLoginRequired() {
      stopPortalRealtime();
      showScreen('screenLogin');
    }
    window.addEventListener('biz1:portal-login-required', onPortalLoginRequired);
    window.addEventListener('biz1demo:portal-login-required', onPortalLoginRequired);
    window.addEventListener('biz1demo:documents', onPortalDocumentsRealtime);
    window.addEventListener('biz1demo:realtime', onPortalRealtime);
    window.addEventListener('biz1demo:socket', function (ev) {
      var d = (ev && ev.detail) || {};
      if (d.type === 'ready') {
        console.info('[Portal] socket ready', (d.registered || []).length, 'registered events');
      }
      paintLiveSocketChip();
    });
    window.addEventListener('biz1demo:socket-status', function () {
      paintLiveSocketChip();
    });
    // Light poll fallback so chip stays accurate if an event is missed
    if (liveSocketPollTimer) clearInterval(liveSocketPollTimer);
    liveSocketPollTimer = setInterval(function () {
      paintLiveSocketChip();
    }, 4000);
    paintLiveSocketChip();
    // When user returns to the tab, soft-refresh once (covers missed socket events).
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'visible') return;
      paintLiveSocketChip();
      var dash = $('screenDash');
      if (dash && !dash.classList.contains('hidden') && state.realtimeStarted) {
        scheduleDocsRefresh('visibility');
      }
    });

    // Resume session if already authenticated + customer_id known
    var MB = app();
    if (MB.isAuthenticated() && MB.getPortalCustomerId()) {
      try {
        var got = await MB.getCustomer(MB.getPortalCustomerId());
        state.customer = got.customer;
        await enterDashboard();
        return;
      } catch (e) {
        console.warn('[Portal] resume failed', e);
      }
    }
    showScreen('screenLogin');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
