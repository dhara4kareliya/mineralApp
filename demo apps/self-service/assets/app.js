(function () {
  'use strict';

  var LANG_KEY = 'biz1ss_lang';
  var CHANNEL_KEY = 'biz1ss_channel';
  var THEME_KEY = 'biz1ss_theme';
  var DOC_KEY = 'biz1ss_current_doc';
  var VIEW_ONLY_KEY = 'biz1ss_view_only';
  var OK_MSG_KEY = 'biz1ss_ok_msg';

  var PAGE_FILES = {
    login: 'index.html',
    dashboard: 'dashboard.html',
    invoice: 'invoice.html',
    sign: 'sign.html',
    'paid-ok': 'paid-ok.html',
    'signed-ok': 'signed-ok.html',
    'create-doc': 'create-doc.html'
  };

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
      demoCredentials: 'פרטי הדגמה',
      loginAsDemoUser: 'התחבר כמשתמש הדגמה',
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
      deleteDocument: 'מחיקה',
      confirmDeleteDocument: 'למחוק את המסמך?',
      deleteDocumentFailed: 'לא ניתן למחוק את המסמך',
      deleteInvoiceTitle: 'מחיקת החשבונית?',
      deleteInvoiceWarning: 'פעולה זו אינה הפיכה. החשבונית תוסר מרשימת המסמכים.',
      deleteInvoiceButton: 'מחיקת חשבונית',
      actionPaySub: 'חשבונית ממתינה לתשלום',
      actionSignSub: 'מסמך ממתין לחתימה דיגיטלית',
      actionDonePaySub: 'לחץ לצפייה ב־PDF',
      actionDoneSignSub: 'לחץ לצפייה במסמך',
      statusApproved: 'מאושר',
      statusNotApproved: 'לא מאושר',
      statusPaid: 'שולם',
      statusUnpaid: 'לא שולם',
      payMethodLabel: 'אמצעי תשלום',
      methodCc: 'כרטיס אשראי',
      methodCash: 'מזומן',
      methodCheck: "צ'ק",
      methodTransfer: 'העברה',
      methodMasav: 'מס״ב',
      methodBit: 'ביט',
      methodPayByCredit: 'תשלום בזיכוי',
      methodOther: 'אחר',
      errPayMethod: 'יש לבחור אמצעי תשלום',
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
      signedFor: '{title} נחתם בהצלחה',
      createBtn: 'הוסף'
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
      demoCredentials: 'Demo Credentials',
      loginAsDemoUser: 'Login As Demo User',
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
      deleteDocument: 'Delete',
      confirmDeleteDocument: 'Delete this document?',
      deleteDocumentFailed: 'Could not delete the document',
      deleteInvoiceTitle: 'Delete this invoice?',
      deleteInvoiceWarning: 'This action is permanent and cannot be undone. The invoice will be removed from the document list.',
      deleteInvoiceButton: 'Delete invoice',
      actionPaySub: 'Invoice awaiting payment',
      actionSignSub: 'Document awaiting digital signature',
      actionDonePaySub: 'Tap to view PDF',
      actionDoneSignSub: 'Tap to view document',
      statusApproved: 'Approved',
      statusNotApproved: 'Not approved',
      statusPaid: 'Paid',
      statusUnpaid: 'Unpaid',
      payMethodLabel: 'Payment method',
      methodCc: 'Credit card',
      methodCash: 'Cash',
      methodCheck: 'Check',
      methodTransfer: 'Transfer',
      methodMasav: 'Masav',
      methodBit: 'Bit',
      methodPayByCredit: 'Pay by credit',
      methodOther: 'Other',
      errPayMethod: 'Choose a payment method',
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
      signedFor: '{title} signed successfully',
      createDocTitle: 'Create Document',
      createDocBtn: 'Create',
      docTypeLabel: 'Document Type',
      docAmountLabel: 'Amount',
      docItemLabel: 'Description',
      cancelBtn: 'Cancel',
      createDocOk: 'Document created successfully',
      createBtn: 'Add'
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
    payMethod: 'cc',
    drawing: false,
    hasStroke: false,
    realtimeStarted: false,
    dashRefreshing: false,
    pageSizeMobile: 10,
    pageSizeDesktop: 10,
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

  function on(id, event, fn) {
    var el = $(id);
    if (el) el.addEventListener(event, fn);
  }

  function currentPage() {
    return document.body.getAttribute('data-page') || 'login';
  }

  function goPage(name) {
    var file = PAGE_FILES[name] || PAGE_FILES.login;
    var base = String(location.pathname || '').replace(/[^/]+$/, '');
    location.href = base + file + location.search;
  }

  function saveCurrentDoc(doc, options) {
    options = options || {};
    try {
      sessionStorage.setItem(DOC_KEY, JSON.stringify(doc || {}));
      if (options.viewOnly) sessionStorage.setItem(VIEW_ONLY_KEY, '1');
      else sessionStorage.removeItem(VIEW_ONLY_KEY);
    } catch (e) { /* ignore */ }
  }

  function loadCurrentDoc() {
    try {
      var raw = sessionStorage.getItem(DOC_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function isViewOnlyDoc() {
    try { return sessionStorage.getItem(VIEW_ONLY_KEY) === '1'; } catch (e) { return false; }
  }

  function saveOkMessage(msg) {
    try { sessionStorage.setItem(OK_MSG_KEY, msg || ''); } catch (e) { /* ignore */ }
  }

  function takeOkMessage() {
    try {
      var msg = sessionStorage.getItem(OK_MSG_KEY) || '';
      sessionStorage.removeItem(OK_MSG_KEY);
      return msg;
    } catch (e) {
      return '';
    }
  }

  function requireAuthOrLogin() {
    var MB = app();
    if (MB && MB.isAuthenticated && MB.isAuthenticated() && MB.getPortalCustomerId && MB.getPortalCustomerId()) {
      return true;
    }
    goPage('login');
    return false;
  }

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
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria');
      if (key) el.setAttribute('aria-label', t(key));
    });
    var demoBox = document.getElementById('demo-users');
    if (demoBox) demoBox.setAttribute('dir', state.lang === 'he' ? 'rtl' : 'ltr');
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
    var pFilter = state.pendingFilter || state.actionFilter || 'all';
    var dFilter = state.doneFilter || 'all';
    var pSelect = document.getElementById('pendingFilterSelect');
    if (pSelect && pSelect.value !== pFilter) pSelect.value = pFilter;
    var dSelect = document.getElementById('doneFilterSelect');
    if (dSelect && dSelect.value !== dFilter) dSelect.value = dFilter;
    document.querySelectorAll('#actionFilters .action-filter').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-filter') === pFilter);
    });
  }

  function setPendingFilter(filter) {
    var next = filter === 'invoice' || filter === 'sign' ? filter : 'all';
    state.pendingFilter = next;
    state.pendingPage = 1;
    updateActionFilterUi();
    if (state.actionGroups) renderActions(filterActionGroups(state.actionGroups));
  }

  function setDoneFilter(filter) {
    var next = filter === 'invoice' || filter === 'sign' ? filter : 'all';
    state.doneFilter = next;
    state.donePage = 1;
    updateActionFilterUi();
    if (state.actionGroups) renderActions(filterActionGroups(state.actionGroups));
  }

  function setActionFilter(filter) {
    var next = filter === 'invoice' || filter === 'sign' ? filter : 'all';
    state.actionFilter = next;
    state.pendingFilter = next;
    state.doneFilter = next;
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
    container.classList.remove('list-pager--desktop', 'list-pager--mobile');
    var pageSize = getPageSize();
    if (!meta || meta.total <= pageSize) {
      container.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');
    container.classList.add('list-pager--bar');

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
    info.textContent = fmt('pageOf', {
      from: meta.from,
      to: meta.to,
      total: meta.total
    });

    var numbers = document.createElement('div');
    numbers.className = 'page-numbers';
    var start = Math.max(1, meta.page - 2);
    var end = Math.min(meta.pages, start + 4);
    start = Math.max(1, end - 4);

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
        dotsA.textContent = '…';
        numbers.appendChild(dotsA);
      }
    }

    for (var p = start; p <= end; p++) {
      (function (pageNum) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'page-num' + (pageNum === meta.page ? ' is-active' : '');
        btn.textContent = String(pageNum);
        if (pageNum === meta.page) btn.setAttribute('aria-current', 'page');
        else btn.addEventListener('click', function () { setPage(pageNum); });
        numbers.appendChild(btn);
      })(p);
    }

    if (end < meta.pages) {
      if (end < meta.pages - 1) {
        var dotsB = document.createElement('span');
        dotsB.className = 'page-dots';
        dotsB.textContent = '…';
        numbers.appendChild(dotsB);
      }
      var last = document.createElement('button');
      last.type = 'button';
      last.className = 'page-num';
      last.textContent = String(meta.pages);
      last.addEventListener('click', function () { setPage(meta.pages); });
      numbers.appendChild(last);
    }

    var next = document.createElement('button');
    next.type = 'button';
    next.className = 'page-btn';
    next.textContent = t('pageNext');
    next.disabled = meta.page >= meta.pages;
    next.addEventListener('click', function () { setPage(meta.page + 1); });

    // Same bar UI on mobile + desktop: Prev · range · numbers · Next
    container.appendChild(prev);
    container.appendChild(info);
    container.appendChild(numbers);
    container.appendChild(next);
  }

  function filterActionGroups(groups) {
    var pending = ((groups && groups.pending) || []).slice();
    var done = ((groups && groups.done) || []).slice();
    var pFilter = state.pendingFilter || state.actionFilter || 'all';
    var dFilter = state.doneFilter || 'all';

    if (pFilter === 'invoice') {
      pending = pending.filter(function (a) { return a.doc && a.doc.type === 'invoice'; });
    } else if (pFilter === 'sign') {
      pending = pending.filter(function (a) {
        return a.doc && (a.doc.type === 'quote' || a.doc.type === 'contract');
      });
    }

    if (dFilter === 'invoice') {
      done = done.filter(function (a) { return a.doc && a.doc.type === 'invoice'; });
    } else if (dFilter === 'sign') {
      done = done.filter(function (a) {
        return a.doc && (a.doc.type === 'quote' || a.doc.type === 'contract');
      });
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

  function showLoginError(msg) {
    if (!els.errorBox || !els.errorText) return;
    els.errorBox.classList.remove('hidden');
    els.errorText.textContent = msg || t('errLogin');
  }

  function hideLoginError() {
    if (!els.errorBox || !els.errorText) return;
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
    var cfg = window.Biz1Config || {};
    var user = 'demo';
    try {
      if (typeof cfg.resolveTenantUser === 'function') user = cfg.resolveTenantUser();
      else user = cfg.user || 'demo';
    } catch (e2) { /* ignore */ }
    var root = 'bull36.com';
    try {
      if (typeof cfg.resolveApiRoot === 'function') root = cfg.resolveApiRoot();
    } catch (e3) { /* ignore */ }
    return String(user).replace(/^https?:\/\//, '')
      .replace(/\.biz1\.co\.il.*$/i, '')
      .replace(/\.bull36\.com.*$/i, '') + '.' + root;
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

    var alreadyAuthed = !!(MB.isAuthenticated && MB.isAuthenticated());

    // Need Biz1 staff credentials for API unless already logged in (e.g. URL token)
    if (!alreadyAuthed && (!username || !password)) {
      showLoginError(t('errCreds'));
      var details = document.querySelector('.auth-details');
      if (details) details.open = true;
      if (username && els.username) els.username.value = username;
      return;
    }

    if (els.username && !els.username.value && username) els.username.value = username;

    els.sendCodeBtn.disabled = true;
    els.sendCodeText.textContent = t('sending');

    try {
      if (!alreadyAuthed) {
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
      }

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
        MB2.setPortalCustomerId(state.otpCustomerId);
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
      if (!(MB.isAuthenticated && MB.isAuthenticated())) {
        showLoginError(t('errCreds'));
        var details = document.querySelector('.auth-details');
        if (details) details.open = true;
        return;
      }
    }

    els.verifyOtpBtn.disabled = true;
    els.verifyOtpText.textContent = t('verifying');

    try {
      if (username && password) {
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
      } else if (!(MB.isAuthenticated && MB.isAuthenticated())) {
        throw new Error(t('errLogin'));
      }

      state.customer = await resolveCustomerAfterAuth(state.phone || els.phone.value);
      if (state.customer) {
        var custId = String(state.customer.customer_id || state.customer.cust_id || state.customer.id || '');
        if (custId) app().setPortalCustomerId(custId);
      }
      await enterDashboard();
    } catch (err) {
      showLoginError((err && err.message) || t('errLogin'));
    } finally {
      els.verifyOtpBtn.disabled = false;
      els.verifyOtpText.textContent = t('verifyOtp');
    }
  }

  async function enterDashboard() {
    if (currentPage() === 'dashboard') {
      await loadDashboard({ silent: false });
      startPortalRealtime();
      return;
    }
    goPage('dashboard');
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
      var page = currentPage();
      if (page !== 'dashboard' && page !== 'paid-ok' && page !== 'signed-ok') return;
      if (page === 'dashboard') loadDashboard({ silent: true, reason: reason || 'socket' });
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
    var el = document.createElement('div');
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    el.className = 'action-card' + (isDone ? ' action-card--done' : '');
    var iconClass = isPay ? 'action-icon--pay' : 'action-icon--sign';
    if (isDone) iconClass = 'action-icon--done';
    var badgeClass = isDone ? 'action-badge--done' : (a.kind === 'pay' ? 'action-badge--pay' : 'action-badge--sign');
    var badge = isDone ? t('badgeDone') : (a.kind === 'pay' ? t('badgePay') : t('badgeSign'));
    var sub = a.kind === 'pay' ? t('actionPaySub')
      : a.kind === 'sign' ? t('actionSignSub')
        : a.kind === 'done-pay' ? t('actionDonePaySub')
          : t('actionDoneSignSub');
    var coin = a.doc.coin ? (a.doc.coin + ' ') : '';
    var amount = a.doc.amount != null ? (' · ' + coin + a.doc.amount) : '';
    var flags = [];
    if (a.doc.type === 'quote' || a.doc.type === 'contract') {
      flags.push(a.doc.approved || a.doc.signed ? t('statusApproved') : t('statusNotApproved'));
    }
    flags.push(a.doc.paid ? t('statusPaid') : t('statusUnpaid'));
    sub = flags.join(' · ') + (sub ? ' · ' + sub : '');
    el.innerHTML =
      '<div class="action-icon ' + iconClass + '">' +
      (isDone
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6 9 17l-5-5"/></svg>'
        : isPay
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>'
          : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M3 19c2-1 3-3 4.5-6S10 6 11 6s1 2 1.5 4 1 4 2 4 2-2 3-2 2 1 3 1"/></svg>') +
      '</div>' +
      '<div class="action-info">' +
      '<div class="action-title"></div>' +
      '<div class="action-sub"></div>' +
      '</div>' +
      '<span class="action-cta ' + badgeClass + '"></span>';
    el.querySelector('.action-title').textContent = a.doc.title + amount;
    el.querySelector('.action-sub').textContent = sub;
    el.querySelector('.action-cta').textContent = badge;
    el.addEventListener('click', function () {
      if (a.kind === 'pay') openInvoice(a.doc, { viewOnly: false });
      else if (a.kind === 'sign') openSign(a.doc);
      else openDocumentPdf(a.doc);
    });
    el.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        el.click();
      }
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
      empty.textContent = ((state.pendingFilter || state.actionFilter) && (state.pendingFilter || state.actionFilter) !== 'all')
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
        emptyDone.textContent = (state.doneFilter && state.doneFilter !== 'all')
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

  function filesCdnRoot() {
    return 'https://files.biz1.co.il';
  }

  /** Strip soft hyphens / zero-width chars that break CDN filenames. */
  function cleanPdfUrlString(url) {
    if (url == null) return '';
    var s = String(url);
    // Soft hyphen U+00AD often turns "invoice" into "inv-ice" in the network URL
    s = s.replace(/[\u00AD\u200B\u200C\u200D\uFEFF]/g, '');
    s = s.replace(/\s+/g, '').trim();
    if ((s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
        (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")) {
      s = s.slice(1, -1).trim();
    }
    if (!s || s === 'null' || s === 'undefined') return '';
    return s;
  }

  /** Turn Documents.View / list paths into an absolute PDF URL. */
  function normalizePdfUrl(url) {
    var s = cleanPdfUrlString(url);
    if (!s) return '';
    // Already absolute
    if (/^https?:\/\//i.test(s)) return s;
    if (s.indexOf('//') === 0) return 'https:' + s;

    var path = s.replace(/^\/+/, '');
    if (/^biz1upload\//i.test(path)) {
      return filesCdnRoot() + '/' + path;
    }
    if (/^invoice_docs\//i.test(path)) {
      return filesCdnRoot() + '/biz1upload/' + path;
    }
    // Bare filename from Documents.View
    if (/\.pdf($|\?)/i.test(path)) {
      if (path.indexOf('/') === -1) {
        return filesCdnRoot() + '/biz1upload/invoice_docs/' + path;
      }
      return filesCdnRoot() + '/' + path.replace(/^\/+/, '');
    }
    try {
      var MB = app();
      var domain = MB && MB.getDomain && MB.getDomain();
      if (domain && s.charAt(0) === '/') {
        return String(domain).replace(/\/$/, '') + s;
      }
    } catch (e2) { /* ignore */ }
    return s;
  }

  function resolveDocPdfUrl(doc) {
    doc = doc || {};
    var raw = doc.raw || {};
    return normalizePdfUrl(
      doc.url || raw.pdf_url || raw.url || raw.file_url || raw.text_url || ''
    );
  }

  function extractViewPdfRaw(res) {
    if (!res) return '';
    if (typeof res === 'string') return res;
    if (res.output != null) return res.output;
    if (res.file_url != null) return res.file_url;
    if (res.pdf_url != null) return res.pdf_url;
    if (res.url != null) return res.url;
    if (res.data != null && typeof res.data === 'string') return res.data;
    return '';
  }

  async function pdfUrlExists(url) {
    if (!url || !/^https?:\/\//i.test(url)) return false;
    try {
      var res = await fetch(url, { method: 'HEAD', mode: 'cors', cache: 'no-store' });
      if (res && (res.ok || res.status === 405 || res.status === 403)) return res.ok || res.status === 405;
    } catch (e) { /* CORS may block HEAD — try GET range */ }
    try {
      var res2 = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        headers: { Range: 'bytes=0-0' }
      });
      return !!(res2 && (res2.ok || res2.status === 206));
    } catch (e2) {
      // Opaque / CORS failure — URL might still work in iframe; treat as unknown
      return null;
    }
  }

  function setInvoicePdf(url, options) {
    options = options || {};
    if (!els.pdfFrame || !els.pdfFallback || !els.pdfOpenLink) return;
    url = normalizePdfUrl(url);
    var topLink = $('pdfOpenLinkTop');
    if (url) {
      var viewUrl = url.indexOf('#') === -1 ? (url + '#toolbar=1&view=FitH') : url;
      els.pdfOpenLink.href = url;
      els.pdfOpenLink.classList.remove('hidden');
      if (topLink) {
        topLink.href = url;
        topLink.style.display = '';
      }
      if (options.openOnly) {
        els.pdfFrame.removeAttribute('src');
        els.pdfFrame.classList.add('hidden');
        els.pdfFallback.classList.remove('hidden');
        return;
      }
      els.pdfFrame.src = viewUrl;
      els.pdfFrame.classList.remove('hidden');
      els.pdfFallback.classList.add('hidden');
      els.pdfFrame.onload = function () {
        try {
          var loc = els.pdfFrame.contentWindow && els.pdfFrame.contentWindow.location;
          var href = loc && String(loc.href || '');
          if (/^chrome-error:/i.test(href) || /neterror/i.test(href)) {
            els.pdfFallback.classList.remove('hidden');
          }
        } catch (e) {
          // Cross-origin PDF loaded — OK (cannot inspect)
        }
      };
      els.pdfFrame.onerror = function () {
        els.pdfFallback.classList.remove('hidden');
      };
      setTimeout(function () {
        try {
          var loc = els.pdfFrame.contentWindow && els.pdfFrame.contentWindow.location;
          var href = loc && String(loc.href || '');
          if (/^chrome-error:/i.test(href)) els.pdfFallback.classList.remove('hidden');
        } catch (e) { /* ignore */ }
      }, 1500);
    } else {
      els.pdfFrame.removeAttribute('src');
      els.pdfFallback.classList.remove('hidden');
      els.pdfOpenLink.removeAttribute('href');
      if (topLink) {
        topLink.removeAttribute('href');
        topLink.style.display = 'none';
      }
    }
  }

  async function paintInvoicePage(doc, options) {
    options = options || {};
    var viewOnly = !!options.viewOnly;
    state.currentDoc = doc;
    if (els.invDocTitle) els.invDocTitle.textContent = (doc && doc.title) || '—';
    if (els.invAmount) els.invAmount.textContent = doc && doc.amount != null ? String(doc.amount) : '';
    if (els.payError) els.payError.classList.add('hidden');

    var payPanel = document.querySelector('#screenInvoice .payment-card');
    var workspace = document.querySelector('#screenInvoice .workspace');
    if (payPanel) payPanel.classList.toggle('hidden', viewOnly);
    if (workspace) workspace.classList.toggle('is-view-only', viewOnly);
    var pageTitle = document.querySelector('#screenInvoice .page-title');
    if (pageTitle) pageTitle.textContent = viewOnly ? t('viewDocTitle') : t('invoiceTitle');

    setInvoicePdf(''); // Clear while loading

    var listUrl = resolveDocPdfUrl(doc);
    var viewUrl = '';
    var viewWasAbsolute = false;
    if (doc && doc.id) {
      try {
        var MB = app();
        var client = MB.getClient();
        if (client) {
          var res = await client.request('Documents.View', { document_id: doc.id }, { skipAuthRefresh: true });
          var viewRaw = extractViewPdfRaw(res);
          var viewRawClean = cleanPdfUrlString(viewRaw);
          viewWasAbsolute = /^https?:\/\//i.test(viewRawClean) || viewRawClean.indexOf('//') === 0;
          viewUrl = normalizePdfUrl(viewRaw);
        }
      } catch (err) {
        console.warn('Failed to fetch Document View URL', err);
      }
    }

    // Candidate order:
    // 1) Absolute URL from Documents.View (official)
    // 2) Absolute pdf_url from Documents.List
    // 3) Normalized relative View path (last resort)
    var candidates = [];
    function pushCand(u) {
      u = normalizePdfUrl(u);
      if (!u || candidates.indexOf(u) !== -1) return;
      candidates.push(u);
    }
    if (viewWasAbsolute) pushCand(viewUrl);
    pushCand(listUrl);
    if (!viewWasAbsolute) pushCand(viewUrl);

    var chosen = '';
    var i;
    for (i = 0; i < candidates.length; i++) {
      var exists = await pdfUrlExists(candidates[i]);
      if (exists === true) {
        chosen = candidates[i];
        break;
      }
      if (exists === null && !chosen) chosen = candidates[i]; // CORS unknown — keep first
    }
    if (!chosen && candidates.length) chosen = candidates[0];

    if (!chosen) {
      setInvoicePdf('', { openOnly: true });
      return;
    }

    var ok = await pdfUrlExists(chosen);
    if (ok === false) {
      // File missing on CDN — don't leave a chrome-error iframe
      console.warn('[Portal] PDF URL not found on CDN', chosen, 'candidates', candidates);
      setInvoicePdf(chosen, { openOnly: true });
      return;
    }
    setInvoicePdf(chosen);
  }

  function openInvoice(doc, options) {
    options = options || {};
    saveCurrentDoc(doc, { viewOnly: !!options.viewOnly });
    if (currentPage() === 'invoice') {
      paintInvoicePage(doc, options);
      return;
    }
    goPage('invoice');
  }

  function openDocumentPdf(doc) {
    openInvoice(doc, { viewOnly: true });
  }

  async function paintSignPage(doc) {
    state.currentDoc = doc;
    if (els.signDocTitle) els.signDocTitle.textContent = (doc && doc.title) || '—';
    if (els.signError) els.signError.classList.add('hidden');
    if (els.agreeTerms) els.agreeTerms.checked = false;
    if (els.agreePrivacy) els.agreePrivacy.checked = false;
    clearSignature();
    if (!els.contractReader) return;

    var pdfUrl = (doc && doc.url) ? String(doc.url) : '';
    // Disabled Documents.View API call as it is not required for the signature flow
    // and was causing 401 errors.

    if (pdfUrl) {
      els.contractReader.innerHTML =
        '<p>' + t('contractP1') + '</p><p>' + t('contractP2') + '</p>' +
        '<p><a href="' + String(pdfUrl).replace(/"/g, '') + '" target="_blank" rel="noopener" class="open-doc-btn" style="margin-top:14px;">' + t('openDoc') + '</a></p>';
    } else {
      els.contractReader.innerHTML = '<p>' + t('contractP1') + '</p><p>' + t('contractP2') + '</p>';
    }
    
    // Hide the hardcoded button in sign.html so it doesn't just link to "#"
    var hardcodedLink = document.getElementById('signDocLink');
    if (hardcodedLink) hardcodedLink.style.display = 'none';
  }

  function openSign(doc) {
    saveCurrentDoc(doc);
    if (currentPage() === 'sign') {
      paintSignPage(doc);
      return;
    }
    goPage('sign');
  }

  async function submitCreateDoc() {
    var errBox = $('createError');
    var btn = $('btnSubmitCreate');
    var type = $('createDocType') ? $('createDocType').value : 'invoice';
    var name = $('createItemName') ? $('createItemName').value : '';
    var qty = $('createItemQty') ? Number($('createItemQty').value) : 1;
    var price = $('createItemPrice') ? Number($('createItemPrice').value) : 0;
    var totalAmount = qty * price;

    if (errBox) { errBox.classList.add('hidden'); errBox.textContent = 'Testing parameters...'; errBox.classList.remove('hidden'); }
    if (btn) btn.disabled = true;

    try {
      var MB = app();
      var client = MB.getClient();
      
      const paramsToTest = [
        "company_id", "company_tax_id", "company_id_number", "customer_company_id", "hp", "tz", "vat_number", 
        "company_reg_number", "business_id", "id_number", "customer_hp", 
        "identity_number", "c_id", "company_no", "company_number", "corporation"
      ];

      let lastError = "Could not find a valid parameter.";

      for (let param of paramsToTest) {
          var payload = {
            customer_id: MB.getPortalCustomerId(),
            document_type: type,
            final_amount: totalAmount,
            invoice_setting_id: 19,
            items: JSON.stringify([{
              item_name: name,
              item_qty: qty,
              item_price: price,
              item_total: totalAmount,
              item_id: 0,
              item_discount_type: "percentage",
              item_discount: 0
            }])
          };
          
          payload[param] = "032451296"; // Valid checksum ID

          try {
              var res = await client.request('Documents.Add', payload);
              if (res && res.error === "unknown_parameter") {
                  console.log(param + " is unknown.");
              } else if (res && res.success == 0) {
                  console.log(param + " gave error: " + res.message);
                  lastError = res.message;
              } else if (res && res.success == 1) {
                  errBox.textContent = "SUCCESS! Parameter: " + param;
                  errBox.style.color = "lightgreen";
                  alert("SUCCESS! The API accepted: " + param);
                  return; // Stop on success!
              }
          } catch(e) {
              console.log("Error testing " + param, e);
          }
      }
      
      throw new Error(lastError);

    } catch (error) {
      if (errBox) {
        errBox.textContent = String(error.message || error);
        errBox.classList.remove('hidden');
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function val(id) {
    var el = $(id);
    return el ? String(el.value || '').trim() : '';
  }

  function checked(id) {
    var el = $(id);
    return !!(el && el.checked);
  }

  function setPayMethod(method) {
    state.payMethod = method || 'cc';
    document.querySelectorAll('#payMethods .pay-method').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-method') === state.payMethod);
    });
    var map = {
      cc: 'payFieldsCc',
      cash: 'payFieldsCash',
      check: 'payFieldsCheck',
      transference: 'payFieldsTransfer',
      masav: 'payFieldsMasav',
      bit: 'payFieldsBit',
      payby_credit: 'payFieldsPayByCredit'
    };
    Object.keys(map).forEach(function (key) {
      var el = $(map[key]);
      if (el) el.classList.toggle('hidden', key !== state.payMethod);
    });
    // legacy id
    var cardFields = $('cardFields');
    if (cardFields) cardFields.classList.toggle('hidden', state.payMethod !== 'cc');
  }

  async function loadBankOptions() {
    var selects = ['checkBank', 'transferBank', 'masavBank']
      .map(function (id) { return $(id); })
      .filter(Boolean);
    if (!selects.length) return;
    try {
      var MB = app();
      if (!MB || typeof MB.listBanks !== 'function') return;
      var got = await MB.listBanks({ length: 100, start: 0 });
      var rows = (got && got.rows) || [];
      selects.forEach(function (sel) {
        var keep = sel.value;
        sel.innerHTML = '<option value="">— Bank —</option>';
        rows.forEach(function (b) {
          var id = String(b.id || b.bank_id || b.bank_details_id || '');
          if (!id) return;
          var label = b.name || b.bank_name || b.code || id;
          var opt = document.createElement('option');
          opt.value = id;
          opt.textContent = label;
          sel.appendChild(opt);
        });
        if (keep) sel.value = keep;
      });
    } catch (e) { /* banks optional */ }
  }

  async function submitPayment() {
    els.payError.classList.add('hidden');
    var method = state.payMethod || 'cc';
    var name = val('cardName');
    var number = val('cardNumber').replace(/\s+/g, '');
    var exp = val('cardExp');
    var cvv = val('cardCvv');
    var note = val('payNote');
    var doc = state.currentDoc || {};
    var amount = doc.amount;

    if (method === 'cc' && (!name || number.length < 12 || !exp || cvv.length < 3)) {
      els.payError.classList.remove('hidden');
      els.payErrorText.textContent = t('errPayFields');
      return;
    }
    if (method === 'check' && (!val('checkNumber') || !val('checkSumAmount'))) {
      els.payError.classList.remove('hidden');
      els.payErrorText.textContent = 'Check number and sum amount are required.';
      return;
    }
    if (method === 'masav' && (!val('masavAccNo') || !val('masavBranch') || !val('masavBank') || !val('masavAccName') || !val('masavTz'))) {
      els.payError.classList.remove('hidden');
      els.payErrorText.textContent = 'Masav requires account #, branch #, bank, account name, and TZ.';
      return;
    }
    if (method === 'bit' && !val('bitPaymentId')) {
      els.payError.classList.remove('hidden');
      els.payErrorText.textContent = 'Bit payment id is required.';
      return;
    }
    if (method === 'payby_credit' && !val('payByCreditInvoice')) {
      els.payError.classList.remove('hidden');
      els.payErrorText.textContent = 'Invoice number is required for pay by credit.';
      return;
    }

    var MB = app();
    var client = MB.getClient();
    els.btnPay.disabled = true;
    els.btnPayText.textContent = t('paying');

    try {
      if (!client) throw new Error('API client not found');

      var payload = {
        customer_id: MB.getPortalCustomerId(),
        document_type: 'receipt',
        type: 'receipt',
        final_amount: amount,
        invoice_setting_id: 541,
        call_multi_receipt_fun: 1,
        payment_method: method,
        c_type_pay: 'regular',
        document_to_pay: doc.id,
        items: '[]',
        note: note
      };

      if (method === 'cc') {
        payload.card_name = name;
        payload.card_no = number;
        payload.month_year = exp;
        payload.cvc = cvv;
      } else if (method === 'check') {
        payload.check_number = val('checkNumber');
        payload.check_sumamount = val('checkSumAmount') || amount;
        payload.check_date = val('checkDate');
        payload.check_address = val('checkAddress');
        payload.check_email = val('checkEmail');
        payload.check_tz = val('checkTz');
        payload.check_bank_details = val('checkBank');
        payload.check_acc_number = val('checkAccNumber');
        payload.check_branch_no = val('checkBranchNo');
        payload.monthly_payment_for_check = checked('checkMonthly') ? 1 : 0;
      } else if (method === 'transference') {
        payload.check_trans_vista = val('transferRef');
        payload.check_acc_number_trans = val('transferAcc');
        payload.check_branch_no_trans = val('transferBranch');
        payload.check_bank = val('transferBank');
        payload.check_date_trans = val('transferDate');
        payload.deposite_to_bank = val('transferDeposit');
      } else if (method === 'masav') {
        payload.acc_no = val('masavAccNo');
        payload.branch_no = val('masavBranch');
        payload.bank = val('masavBank');
        payload.acc_name = val('masavAccName');
        payload.tz = val('masavTz');
        payload.no_of_payment = val('masavPayments') || 1;
        payload.unlimited = checked('masavUnlimited') ? 1 : 0;
        payload.bi_monthly = checked('masavBiMonthly') ? 1 : 0;
        payload.masav_id = 0;
      } else if (method === 'bit') {
        payload.bit_payment_id = val('bitPaymentId');
      } else if (method === 'payby_credit') {
        payload.payby_credit_invoice_number = val('payByCreditInvoice');
      }

      var res = await client.request('Documents.Add', payload);

      if (!res || (Number(res.success) !== 1 && res.success !== true && res.ok !== true)) {
        throw new Error((res && res.message) || t('errPay'));
      }

      saveOkMessage(fmt('paidFor', { title: doc.title || doc.id || '' }));
      if ($('cardNumber')) $('cardNumber').value = '';
      if ($('cardCvv')) $('cardCvv').value = '';
      goPage('paid-ok');
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
    if (!canvas) return;
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
    if (!canvas) return;
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
      saveOkMessage(fmt('signedFor', { title: doc.title || doc.id || '' }));
      goPage('signed-ok');
    } catch (err) {
      els.signError.classList.remove('hidden');
      els.signErrorText.textContent = (err && err.message) || t('errSign');
    } finally {
      els.btnSubmitSign.disabled = false;
      els.btnSubmitSignText.textContent = t('submitSign');
    }
  }

  var allowAutofillClear = true;

  function clearLoginFields() {
    if (!allowAutofillClear) return;
    if (els.username) els.username.value = '';
    if (els.password) els.password.value = '';
    if (els.phone) els.phone.value = '';
    if (els.otp) els.otp.value = '';
  }

  function fillDemoCredentials(btn) {
    allowAutofillClear = false;
    var email = (btn && btn.getAttribute('data-user')) || '';
    var pass = (btn && btn.getAttribute('data-pass')) || '';
    var phone = (btn && btn.getAttribute('data-phone')) || '';
    if (els.username) els.username.value = email;
    if (els.password) els.password.value = pass;
    if (els.phone && phone) els.phone.value = phone;
    var details = document.querySelector('.auth-details');
    if (details) details.open = true;
    hideLoginError();
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
    try {
      sessionStorage.removeItem(DOC_KEY);
      sessionStorage.removeItem(VIEW_ONLY_KEY);
      sessionStorage.removeItem(OK_MSG_KEY);
    } catch (e2) { /* ignore */ }
    if (currentPage() === 'login') {
      if (els.stepPhone) els.stepPhone.classList.remove('hidden');
      if (els.stepOtp) els.stepOtp.classList.add('hidden');
      if (els.otp) els.otp.value = '';
      hideLoginError();
      allowAutofillClear = true;
      if (els.username) els.username.value = '';
      if (els.password) els.password.value = '';
      if (els.phone) els.phone.value = '';
      var details = document.querySelector('.auth-details');
      if (details) details.open = true;
      return;
    }
    goPage('login');
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

    var page = currentPage();

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

    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { setLang(btn.getAttribute('data-lang')); });
    });

    function onPortalLoginRequired() {
      stopPortalRealtime();
      goPage('login');
    }
    window.addEventListener('biz1:portal-login-required', onPortalLoginRequired);
    window.addEventListener('biz1demo:portal-login-required', onPortalLoginRequired);

    var MB = app();

    async function tryUrlTokenLogin() {
      if (!MB || !MB.readUrlToken || !MB.loginWithToken) return false;
      var urlToken = '';
      try {
        urlToken = MB.readUrlToken() || '';
        if (urlToken && MB.clearUrlToken) MB.clearUrlToken();
      } catch (e0) {
        return false;
      }
      if (!urlToken) return false;

      try {
        var result = await MB.loginWithToken(urlToken);
        if (!(result && result.ok)) {
          showLoginError((result && result.message) || t('errLogin'));
          return false;
        }
        if (MB.getPortalCustomerId()) {
          try {
            var got = await MB.getCustomer(MB.getPortalCustomerId());
            state.customer = got.customer;
            await enterDashboard();
            return true;
          } catch (eCust) {
            console.warn('[Portal] token login customer resume failed', eCust);
          }
        }
        return true;
      } catch (err) {
        showLoginError((err && err.message) || t('errLogin'));
        return false;
      }
    }

    async function resumeCustomer() {
      if (!(MB.isAuthenticated() && MB.getPortalCustomerId())) return false;
      try {
        var got = await MB.getCustomer(MB.getPortalCustomerId());
        state.customer = got.customer;
        return true;
      } catch (e) {
        console.warn('[Portal] resume failed', e);
        return false;
      }
    }

    if (page === 'login') {
      var detailsEl = document.querySelector('.auth-details');
      if (detailsEl) detailsEl.open = true;
      allowAutofillClear = true;
      clearLoginFields();
      window.addEventListener('pageshow', function () { clearLoginFields(); });
      setTimeout(clearLoginFields, 50);
      setTimeout(clearLoginFields, 250);

      document.querySelectorAll('.demo-user-btn[data-user][data-pass]').forEach(function (btn) {
        btn.addEventListener('click', function () { fillDemoCredentials(btn); });
      });
      document.querySelectorAll('.channel-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { setChannel(btn.getAttribute('data-channel')); });
      });

      on('loginForm', 'submit', function (ev) {
        if (state.waitingOtp || (els.stepOtp && !els.stepOtp.classList.contains('hidden'))) {
          ev.preventDefault();
          verifyOtp();
        } else {
          sendCode(ev);
        }
      });
      if (els.verifyOtpBtn) els.verifyOtpBtn.addEventListener('click', verifyOtp);
      on('backPhoneBtn', 'click', function () {
        state.waitingOtp = false;
        state.otpMode = 'staff';
        state.customerOtpCode = '';
        state.customerOtpExpiresAt = 0;
        state.otpCustomerId = '';
        if (els.stepOtp) els.stepOtp.classList.add('hidden');
        if (els.stepPhone) els.stepPhone.classList.remove('hidden');
        hideLoginError();
      });

      if (await tryUrlTokenLogin()) {
        if (MB.isAuthenticated() && MB.getPortalCustomerId() && state.customer) return;
        return;
      }
      if (await resumeCustomer()) {
        await enterDashboard();
      }
      return;
    }

    if (page === 'paid-ok') {
      if (!requireAuthOrLogin()) return;
      if (els.paidOkSub) els.paidOkSub.textContent = takeOkMessage();
      on('btnPaidToDash', 'click', function () { goPage('dashboard'); });
      return;
    }

    if (page === 'signed-ok') {
      if (!requireAuthOrLogin()) return;
      if (els.signedOkSub) els.signedOkSub.textContent = takeOkMessage();
      on('btnSignedToDash', 'click', function () { goPage('dashboard'); });
      return;
    }

    if (page === 'invoice') {
      if (!requireAuthOrLogin()) return;
      on('btnInvBack', 'click', function () { goPage('dashboard'); });
      on('btnPay', 'click', submitPayment);
      setPayMethod('cc');
      loadBankOptions();
      document.querySelectorAll('#payMethods .pay-method').forEach(function (btn) {
        btn.addEventListener('click', function () {
          setPayMethod(btn.getAttribute('data-method'));
        });
      });
      var invDoc = loadCurrentDoc();
      if (!invDoc) {
        goPage('dashboard');
        return;
      }
      paintInvoicePage(invDoc, { viewOnly: isViewOnlyDoc() });
      return;
    }

    if (page === 'sign') {
      if (!requireAuthOrLogin()) return;
      setupSignaturePad();
      on('btnSignBack', 'click', function () { goPage('dashboard'); });
      on('btnClearSign', 'click', clearSignature);
      on('btnSubmitSign', 'click', submitSignature);
      var signDoc = loadCurrentDoc();
      if (!signDoc) {
        goPage('dashboard');
        return;
      }
      paintSignPage(signDoc);
      return;
    }

    if (page === 'create-doc') {
      if (!requireAuthOrLogin()) return;
      on('createDocForm', 'submit', async function(ev) {
        ev.preventDefault();
        await submitCreateDoc();
      });
      return;
    }

    if (!requireAuthOrLogin()) return;
    await resumeCustomer();

    if (page === 'dashboard') {
      var RECEIPT_CREATE_TYPES = {
        receipt: 1,
        receipt_partly_paid: 1,
        receipt_tax_invoice: 1,
        gi_ir: 1,
        organization_receipt: 1
      };

      function syncCreateDocFields() {
        var typeEl = document.getElementById('createDocType');
        var type = typeEl ? typeEl.value : 'invoice';
        var receiptLike = !!RECEIPT_CREATE_TYPES[type];
        function setHidden(id, hide) {
          var el = document.getElementById(id);
          if (el) el.classList.toggle('hidden', !!hide);
        }
        setHidden('createReceiptFields', !receiptLike);
        setHidden('createRelatedFields', !(type === 'credit_invoice' || type === 'receipt_partly_paid'));
        setHidden('createPayDocFields', !receiptLike);
        setHidden('createProposalFields', type !== 'order_proposals');
        setHidden('createDeliveryFields', type !== 'delivery_invoice');
        var methodEl = document.getElementById('createPaymentMethod');
        setHidden('createOtherPayOpt', !(methodEl && methodEl.value === 'others'));
      }

      window.openCreateModal = function() {
        var modal = document.getElementById('modalCreate');
        if (!modal) return;
        modal.style.display = 'flex';
        setTimeout(function() {
          modal.style.opacity = '1';
          modal.querySelector('.modal-content').style.transform = 'translateY(0)';
        }, 10);
        document.getElementById('createError').classList.add('hidden');
        ['createItemName', 'createItemPrice', 'createNote', 'createRelatedDocId',
          'createDocumentToPay', 'createReceiptAmount', 'createProposalTitle',
          'createOtherPaymentOption'].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.value = '';
        });
        if (document.getElementById('createItemQty')) document.getElementById('createItemQty').value = '1';
        if (document.getElementById('createSaveDraft')) document.getElementById('createSaveDraft').checked = false;
        syncCreateDocFields();
      };

      window.closeCreateModal = function() {
        var modal = document.getElementById('modalCreate');
        if (!modal) return;
        modal.style.opacity = '0';
        modal.querySelector('.modal-content').style.transform = 'translateY(20px)';
        setTimeout(function() { modal.style.display = 'none'; }, 300);
      };

      var btnCreate = document.getElementById('btnCreate');
      if (btnCreate) btnCreate.addEventListener('click', window.openCreateModal);
      var btnCloseCreate = document.getElementById('btnCloseCreate');
      if (btnCloseCreate) btnCloseCreate.addEventListener('click', window.closeCreateModal);
      var createDocTypeEl = document.getElementById('createDocType');
      if (createDocTypeEl) createDocTypeEl.addEventListener('change', syncCreateDocFields);
      var createPayMethodEl = document.getElementById('createPaymentMethod');
      if (createPayMethodEl) createPayMethodEl.addEventListener('change', syncCreateDocFields);

      var btnSubmitCreate = document.getElementById('btnSubmitCreate');
      if (btnSubmitCreate) {
        btnSubmitCreate.addEventListener('click', async function() {
          var btn = this;
          var errBox = document.getElementById('createError');
          var name = (document.getElementById('createItemName').value || '').trim();
          var qty = parseFloat(document.getElementById('createItemQty').value) || 1;
          var price = parseFloat(document.getElementById('createItemPrice').value) || 0;
          var docType = document.getElementById('createDocType');
          docType = docType ? docType.value : 'invoice';
          var receiptLike = !!RECEIPT_CREATE_TYPES[docType];
          var receiptAmount = parseFloat((document.getElementById('createReceiptAmount') || {}).value) || 0;
          var total = receiptLike && receiptAmount > 0 ? receiptAmount : (qty * price);

          if (!receiptLike && !name) {
            errBox.textContent = 'Please enter item_name.';
            errBox.classList.remove('hidden');
            return;
          }
          if (!(total > 0)) {
            errBox.textContent = 'Please enter a valid amount / item_price.';
            errBox.classList.remove('hidden');
            return;
          }
          if (docType === 'credit_invoice' || docType === 'receipt_partly_paid') {
            var related = ((document.getElementById('createRelatedDocId') || {}).value || '').trim();
            if (!related) {
              errBox.textContent = 'related_document_id is required for ' + docType + '.';
              errBox.classList.remove('hidden');
              return;
            }
          }
          if (receiptLike && (document.getElementById('createPaymentMethod') || {}).value === 'others') {
            var otherOpt = ((document.getElementById('createOtherPaymentOption') || {}).value || '').trim();
            if (!otherOpt) {
              errBox.textContent = 'other_payment_option is required when payment_method=others.';
              errBox.classList.remove('hidden');
              return;
            }
          }

          errBox.classList.add('hidden');
          var origHtml = btn.innerHTML;
          btn.innerHTML = 'Creating...';
          btn.disabled = true;

          try {
            var payload = {
              customer_id: Biz1App.getPortalCustomerId(),
              document_type: docType,
              final_amount: total,
              invoice_setting_id: 19,
              document_lang: (document.getElementById('createDocLang') || {}).value || 'he',
              note: (document.getElementById('createNote') || {}).value || '',
              save_as_draft: document.getElementById('createSaveDraft') &&
                document.getElementById('createSaveDraft').checked ? 1 : 0
            };
            if (name || !receiptLike) {
              payload.items = [{
                item_name: name || 'Item',
                item_qty: qty,
                item_price: price || total,
                item_total: total,
                iteeeem_id: 0,
                item_discount_type: 'percentage',
                item_discount: 0
              }];
            }
            var relatedId = ((document.getElementById('createRelatedDocId') || {}).value || '').trim();
            if (relatedId) payload.related_document_id = relatedId;
            var toPay = ((document.getElementById('createDocumentToPay') || {}).value || '').trim();
            if (toPay) payload.document_to_pay = toPay;
            if (docType === 'order_proposals') {
              var ptitle = ((document.getElementById('createProposalTitle') || {}).value || '').trim();
              if (ptitle) payload.proposal_title = ptitle;
            }
            if (docType === 'delivery_invoice') {
              payload.type_of_delivery = (document.getElementById('createDeliveryType') || {}).value || 'delivery';
            }
            if (receiptLike) {
              payload.payment_method = (document.getElementById('createPaymentMethod') || {}).value || 'cash';
              payload.call_multi_receipt_fun = 1;
              if (payload.payment_method === 'others') {
                payload.other_payment_option =
                  ((document.getElementById('createOtherPaymentOption') || {}).value || '').trim() || 'Other';
              }
            }

            var res = await Biz1App.createDocument(payload);
            if (res && (Number(res.success) === 1 || res.success === true)) {
              window.closeCreateModal();
              setTimeout(function() { loadDashboard({ silent: false }); }, 300);
            } else {
              throw new Error((res && res.message) || 'Failed to create document');
            }
          } catch (e) {
            errBox.textContent = e.message || 'Error creating document';
            errBox.classList.remove('hidden');
          } finally {
            btn.innerHTML = origHtml;
            btn.disabled = false;
          }
        });
      }

      var pendingSelect = document.getElementById('pendingFilterSelect');
      if (pendingSelect) {
        pendingSelect.addEventListener('change', function () {
          setPendingFilter(this.value);
        });
      }

      var doneSelect = document.getElementById('doneFilterSelect');
      if (doneSelect) {
        doneSelect.addEventListener('change', function () {
          setDoneFilter(this.value);
        });
      }

      document.querySelectorAll('#actionFilters .action-filter').forEach(function (btn) {
        btn.addEventListener('click', function () {
          setActionFilter(btn.getAttribute('data-filter'));
        });
      });
      on('btnLogout', 'click', logout);
      on('btnRefreshDash', 'click', function () { loadDashboard({ silent: false }); });
      on('btnRetryDash', 'click', function () { loadDashboard({ silent: false }); });

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
      if (liveSocketPollTimer) clearInterval(liveSocketPollTimer);
      liveSocketPollTimer = setInterval(function () {
        paintLiveSocketChip();
      }, 4000);
      paintLiveSocketChip();
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState !== 'visible') return;
        paintLiveSocketChip();
        if (state.realtimeStarted) scheduleDocsRefresh('visibility');
      });

      await loadDashboard({ silent: false });
      startPortalRealtime();
      return;
    }

    // (invoice, sign, create-doc, etc. are handled above)

    goPage('login');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
