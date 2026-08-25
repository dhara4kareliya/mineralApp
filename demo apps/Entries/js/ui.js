/**
 * Theme + toast helpers shared by login and entries pages.
 */
(function (global) {
  'use strict';

  var THEME_KEY = 'entries_theme';
  var LANG_KEY = 'entries_lang';
  var toastRoot = null;
  var timers = {};
  var themeInited = false;
  var langInited = false;

  function resolveTheme() {
    try {
      var saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch (e) { /* ignore */ }
    return 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].textContent = theme === 'dark' ? '☀' : '☾';
      buttons[i].setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  function initTheme() {
    applyTheme(resolveTheme());
    if (themeInited) return;
    themeInited = true;
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-theme-toggle]');
      if (!btn) return;
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  }

  function ensureToastRoot() {
    if (toastRoot) return toastRoot;
    toastRoot = document.createElement('div');
    toastRoot.className = 'toast-stack';
    toastRoot.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastRoot);
    return toastRoot;
  }

  function dismissToast(id) {
    var el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
    if (timers[id]) {
      clearTimeout(timers[id]);
      delete timers[id];
    }
  }

  function pushToast(title, opts) {
    opts = opts || {};
    var root = ensureToastRoot();
    var id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    var tone = opts.tone || 'info';
    var el = document.createElement('div');
    el.id = id;
    el.className = 'toast toast--' + tone;
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<div class="toast__body">' +
        '<strong></strong>' +
        (opts.message ? '<span></span>' : '') +
      '</div>' +
      '<button type="button" class="toast__close" aria-label="Dismiss">×</button>';
    el.querySelector('strong').textContent = title;
    if (opts.message) el.querySelector('span').textContent = opts.message;
    el.querySelector('.toast__close').addEventListener('click', function () {
      dismissToast(id);
    });
    root.appendChild(el);
    while (root.children.length > 5) root.removeChild(root.firstChild);
    timers[id] = setTimeout(function () { dismissToast(id); }, 4200);
  }

  function getLang() {
    try {
      var saved = localStorage.getItem(LANG_KEY);
      if (saved === 'he' || saved === 'en') return saved;
    } catch (e) { /* ignore */ }
    return 'he';
  }

  var STRINGS = {
    en: {
      loginTitle: 'Entries',
      loginSubtitle: 'Sign in with your Biz1 account to manage dynamic entry tabs.',
      loginUsernameLabel: 'Email / Username / Phone / ID',
      loginUsernamePlaceholder: 'you@company.com',
      loginPasswordLabel: 'Password',
      loginShowPassword: 'Show',
      loginHidePassword: 'Hide',
      loginOtpLabel: 'Verification code (OTP)',
      loginOtpPlaceholder: '6-digit code',
      loginResendOtp: 'Resend OTP',
      loginResendIn: 'Resend code in',
      loginRemember: 'Remember me',
      loginSignIn: 'Sign in',
      loginVerifyContinue: 'Verify & continue',
      loginSigningIn: 'Signing in…',
      loginVerificationSent: 'Verification code sent',
      loginCheckEmailOtp: 'Check your email for the OTP.',
      loginWelcomeBack: 'Welcome back',
      loginFailed: 'Login failed',
      loginUsernamePasswordRequired: 'Username and password are required.',
      loginOtpRequired: 'Please enter the verification code (OTP).',
      loginCodeResent: 'Code resent',
      loginNewCodeSent: 'A new verification code was sent.',
      loginResendFailed: 'Could not resend code',
      live: 'Live',
      offline: 'Offline',
      sync: 'Sync',
      logout: 'Log out',
      search: 'Search',
      searchPlaceholder: 'Search field values…',
      clear: 'Clear',
      addEntry: '+ Add entry',
      addEntryData: '+ Add entry data',
      addRow: '+ Add row',
      deleteEntrySettings: 'Delete entry',
      deleteEntrySettingsTitle: 'Delete entry tab?',
      deleteEntrySettingsText: 'This removes the entry tab definition and all its settings. Row data may also be removed. This cannot be undone.',
      deleteEntrySettingsConfirm: 'Delete "{name}"? This removes the entry tab definition and cannot be undone.',
      deleting: 'Deleting…',
      addFirst: 'Add first row',
      emptyTitle: 'No rows yet',
      emptyText: 'Select an entry tab, then add a row or adjust your search.',
      groupsTitle: 'Entry groups',
      customersTitle: 'Customers',
      searchCustomers: 'Search customers…',
      allFolders: 'All',
      clientName: 'Client name',
      company: 'Company',
      phone: 'Phone',
      email: 'Email',
      remarks: 'Remarks',
      notes: 'Notes',
      status: 'Status',
      otherEntries: 'Other entries',
      selectGroup: 'Select a group to see its entries',
      selectEntry: 'Select an entry to view records',
      selectCustomerFirst: 'Select a customer to view entries',
      loadingEntrySettings: 'Loading entries…',
      noEntrySettings: 'No entries for this customer folder',
      entrySettingsFailed: 'Could not load entries',
      back: 'Back',
      save: 'Save',
      cancel: 'Cancel',
      createEntryTitle: 'Entries',
      entryNameEn: 'Entry name english',
      entryNameHe: 'Entry name Hebrew',
      selectFolder: 'Select folder',
      customFields: 'Custom fields',
      selectCustomField: 'Select custom fields',
      fieldLabelEn: 'English label',
      fieldLabelHe: 'Hebrew name',
      fieldLabelEnPlaceholder: 'English label',
      fieldLabelHePlaceholder: 'Hebrew Name',
      defaultValue: 'Default value',
      defaultValuePlaceholder: 'Default value',
      addCustomField: 'Add custom field',
      sharedWith: 'Team member shared with',
      showInHeader: 'Show in header',
      copyCustomer: 'Copy team member in entry',
      useCustomer: 'Use team member for this entry',
      selectMembers: 'Select team members…',
      selectFolders: 'Select Some Options',
      selectCustomers: 'Select team members…',
      selectCustomer: 'Select customer…',
      loadMore: 'Load more',
      loadingCustomers: 'Loading customers…',
      loadingTeamMembers: 'Loading team members…',
      customersFailed: 'Could not load customers',
      teamMembersFailed: 'Could not load team members',
      noCustomers: 'No customers found',
      noTeamMembers: 'No team members found',
      noMatches: 'No matching customers',
      noTeamMemberMatches: 'No matching team members',
      customer: 'Customer',
      field: 'Field',
      fieldSearch: 'Search...',
      sortAsc: 'Ascending',
      sortDesc: 'Descending',
      actions: 'Actions',
      edit: 'Edit',
      delete: 'Delete',
      of: 'of',
      loading: 'Loading…',
      noTabs: 'No entries available',
      runAutomation: 'Run Automation',
      automationName: 'Automation name',
      selectAutomation: 'Select Automation',
      submit: 'Submit',
      reset: 'Reset',
      selectedCount: '{n} selected',
      selectRowsFirst: 'Select at least one row first.',
      automationRequired: 'Please select an automation.',
      noAutomations: 'No automations available',
      automationRan: 'Automation started',
      automationFailed: 'Automation failed',
      export: 'Export',
      exporting: 'Exporting…',
      exportDone: 'Export ready',
      exportFailed: 'Export failed',
      exportEmpty: 'No rows to export',
      add: 'Add',
      runAutomationPlus: 'Run Automation +',
      workers: 'Workers',
      folders: 'Folders',
      tags: 'Tags',
      parentCustomer: 'Parent customer',
      whatsapp: 'WhatsApp',
      website: 'Website',
      address: 'Address',
      city: 'City',
      source: 'Source',
      dateCreated: 'Date',
      lastUpdated: 'Last updated',
      followup: 'Follow-up',
      secondPhone: 'Second phone',
      secondEmail: 'Second email',
      mobile: 'Mobile',
      customerManager: 'Account manager',
      sharedWith: 'Shared with',
      internalStatus: 'Status',
      contactInfo: 'Contact',
      customerDetails: 'Details',
      loadingCustomer: 'Loading customer…',
      customerLoadFailed: 'Could not load customer',
      editCustomerTitle: 'Edit customer',
      deleteCustomerTitle: 'Delete customer?',
      deleteCustomerText: 'This moves the customer to trash. You can restore it later if your account allows it.',
      customerUpdated: 'Customer updated',
      newCustomer: 'New customer',
      customerAddedLive: 'A customer was added in real time.',
      customerUpdatedLive: 'Customer data refreshed live.',
      customerRemovedLive: 'A customer was removed live.',
      customerUpdateFailed: 'Could not update customer',
      customerDeleted: 'Customer deleted',
      customerDeleteFailed: 'Could not delete customer',
      customerRequired: 'Select a customer first.',
      groupsSection: 'Groups',
      entriesLabel: 'Entries',
      remove: 'Remove',
      entrySingular: 'entry',
      entriesPlural: 'entries',
      atLeastOneFolderRequired: 'At least one folder is required.',
      entriesLoadFailed: 'Failed to load entries',
      selectEntryTabFirst: 'Select an entry tab first',
      addEntryTitle: 'Add entry',
      editEntryTitle: 'Edit entry',
      saveChanges: 'Save changes',
      selectCustomFieldType: 'Select a custom field type.',
      englishLabelRequired: 'English label is required.',
      fieldNameAlreadyExists: 'A field with this name already exists.',
      entryNameEnglishRequired: 'Entry name english is required.',
      entryNameHebrewRequired: 'Entry name Hebrew is required.',
      isRequiredSuffix: 'is required.',
      entryCustomerIdRequired: 'Entry customer ID is required for this tab.',
      saving: 'Saving…',
      missingRowId: 'Missing row id',
      saveFailed: 'Save failed',
      entryAdded: 'Entry added',
      entryAddedLive: 'A row was added in real time.',
      entryUpdated: 'Entry updated',
      entryUpdatedLive: 'A row was updated live.',
      deleteFailed: 'Delete failed',
      entryDeleted: 'Entry deleted',
      rowRemovedLive: 'A row was removed live.'
    },
    he: {
      loginTitle: 'רשומות',
      loginSubtitle: 'התחברו עם חשבון Biz1 כדי לנהל טאבי רשומות דינמיים.',
      loginUsernameLabel: 'אימייל / שם משתמש / טלפון / מזהה',
      loginUsernamePlaceholder: 'you@company.com',
      loginPasswordLabel: 'סיסמה',
      loginShowPassword: 'הצג',
      loginHidePassword: 'הסתר',
      loginOtpLabel: 'קוד אימות (OTP)',
      loginOtpPlaceholder: 'קוד בן 6 ספרות',
      loginResendOtp: 'שלח OTP שוב',
      loginResendIn: 'שליחה חוזרת בעוד',
      loginRemember: 'זכור אותי',
      loginSignIn: 'התחברות',
      loginVerifyContinue: 'אימות והמשך',
      loginSigningIn: 'מתחבר…',
      loginVerificationSent: 'קוד אימות נשלח',
      loginCheckEmailOtp: 'בדקו את האימייל עבור קוד האימות.',
      loginWelcomeBack: 'ברוכים השבים',
      loginFailed: 'ההתחברות נכשלה',
      loginUsernamePasswordRequired: 'שם משתמש וסיסמה הם שדות חובה.',
      loginOtpRequired: 'נא להזין קוד אימות (OTP).',
      loginCodeResent: 'הקוד נשלח שוב',
      loginNewCodeSent: 'קוד אימות חדש נשלח.',
      loginResendFailed: 'לא ניתן לשלוח שוב את הקוד',
      live: 'חי',
      offline: 'לא מחובר',
      sync: 'סנכרון',
      logout: 'התנתק',
      search: 'חיפוש',
      searchPlaceholder: 'חיפוש בערכים…',
      clear: 'נקה',
      addEntry: '+ רשומת טאב',
      addEntryData: '+ הוסף נתונים לרשומה',
      addRow: '+ שורה חדשה',
      addFirst: 'הוסף שורה ראשונה',
      emptyTitle: 'אין שורות',
      emptyText: 'בחר טאב, הוסף שורה או שנה את החיפוש.',
      deleting: 'מוחק…',
      groupsTitle: 'קבוצות רשומות',
      customersTitle: 'לקוחות',
      searchCustomers: 'חיפוש לקוחות…',
      allFolders: 'הכל',
      clientName: 'שם לקוח',
      company: 'חברה',
      phone: 'טלפון',
      email: 'אימייל',
      remarks: 'הערות',
      notes: 'הערות פנימיות',
      status: 'סטטוס',
      otherEntries: 'רשומות אחרות',
      selectGroup: 'בחר קבוצה כדי לראות את הרשומות שלה',
      selectEntry: 'בחר רשומה כדי לצפות בנתונים',
      selectCustomerFirst: 'בחר לקוח כדי לצפות ברשומות',
      loadingEntrySettings: 'טוען רשומות…',
      noEntrySettings: 'אין רשומות לתיקיית לקוח זו',
      entrySettingsFailed: 'לא ניתן לטעון רשומות',
      back: 'חזרה',
      save: 'שמור',
      cancel: 'ביטול',
      createEntryTitle: 'רשומות',
      entryNameEn: 'שם רשומה באנגלית',
      entryNameHe: 'שם רשומה בעברית',
      selectFolder: 'בחר תיקייה',
      customFields: 'שדות מותאמים',
      selectCustomField: 'בחר שדה מותאם',
      fieldLabelEn: 'תווית באנגלית',
      fieldLabelHe: 'שם בעברית',
      fieldLabelEnPlaceholder: 'תווית באנגלית',
      fieldLabelHePlaceholder: 'שם בעברית',
      defaultValue: 'ערך ברירת מחדל',
      defaultValuePlaceholder: 'ערך ברירת מחדל',
      addCustomField: 'הוסף שדה מותאם',
      sharedWith: 'שיתוף עם חברי צוות',
      showInHeader: 'הצג בכותרת',
      copyCustomer: 'העתק חבר צוות ברשומה',
      useCustomer: 'השתמש בחבר צוות לרשומה זו',
      selectMembers: 'בחר חברי צוות…',
      selectFolders: 'בחר אפשרויות',
      selectCustomers: 'בחר חברי צוות…',
      selectCustomer: 'בחר לקוח…',
      loadMore: 'טען עוד',
      loadingCustomers: 'טוען לקוחות…',
      loadingTeamMembers: 'טוען חברי צוות…',
      customersFailed: 'לא ניתן לטעון לקוחות',
      teamMembersFailed: 'לא ניתן לטעון חברי צוות',
      noCustomers: 'לא נמצאו לקוחות',
      noTeamMembers: 'לא נמצאו חברי צוות',
      noMatches: 'לא נמצאו תוצאות',
      noTeamMemberMatches: 'לא נמצאו חברי צוות תואמים',
      customer: 'לקוח',
      field: 'שדה',
      fieldSearch: 'חיפוש...',
      sortAsc: 'עולה',
      sortDesc: 'יורד',
      actions: 'פעולות',
      edit: 'עריכה',
      delete: 'מחיקה',
      of: 'מתוך',
      loading: 'טוען…',
      noTabs: 'אין טאבים זמינים',
      runAutomation: 'הרץ אוטומציה',
      automationName: 'שם אוטומציה',
      selectAutomation: 'בחר אוטומציה',
      submit: 'שלח',
      reset: 'איפוס',
      selectedCount: '{n} נבחרו',
      selectRowsFirst: 'נא לבחור לפחות שורה אחת.',
      automationRequired: 'נא לבחור אוטומציה.',
      noAutomations: 'אין אוטומציות זמינות',
      automationRan: 'האוטומציה הופעלה',
      automationFailed: 'הרצת האוטומציה נכשלה',
      export: 'ייצוא',
      exporting: 'מייצא…',
      exportDone: 'הייצוא מוכן',
      exportFailed: 'הייצוא נכשל',
      exportEmpty: 'אין שורות לייצוא',
      add: 'הוסף',
      runAutomationPlus: 'הרץ אוטומציה +',
      workers: 'עובדים',
      folders: 'תיקיות',
      tags: 'תגיות',
      parentCustomer: 'לקוח הורה',
      whatsapp: 'וואטסאפ',
      website: 'אתר',
      address: 'כתובת',
      city: 'עיר',
      source: 'מקור',
      dateCreated: 'תאריך',
      lastUpdated: 'עודכן לאחרונה',
      followup: 'מעקב',
      secondPhone: 'טלפון נוסף',
      secondEmail: 'אימייל נוסף',
      mobile: 'נייד',
      customerManager: 'מנהל לקוח',
      sharedWith: 'משותף עם',
      internalStatus: 'סטטוס',
      contactInfo: 'יצירת קשר',
      customerDetails: 'פרטים',
      loadingCustomer: 'טוען לקוח…',
      customerLoadFailed: 'לא ניתן לטעון את הלקוח',
      editCustomerTitle: 'עריכת לקוח',
      deleteCustomerTitle: 'למחוק לקוח?',
      deleteCustomerText: 'הלקוח יועבר לארכיון. ניתן לשחזר אותו מאוחר יותר אם יש הרשאה.',
      customerUpdated: 'הלקוח עודכן',
      newCustomer: 'לקוח חדש',
      customerAddedLive: 'לקוח נוסף בזמן אמת.',
      customerUpdatedLive: 'נתוני הלקוח עודכנו בזמן אמת.',
      customerRemovedLive: 'לקוח הוסר בזמן אמת.',
      customerUpdateFailed: 'לא ניתן לעדכן את הלקוח',
      customerDeleted: 'הלקוח נמחק',
      customerDeleteFailed: 'לא ניתן למחוק את הלקוח',
      customerRequired: 'נא לבחור לקוח תחילה.',
      groupsSection: 'קבוצות',
      entriesLabel: 'רשומות',
      remove: 'הסר',
      entrySingular: 'רשומה',
      entriesPlural: 'רשומות',
      atLeastOneFolderRequired: 'חובה להשאיר לפחות תיקייה אחת.',
      entriesLoadFailed: 'לא ניתן לטעון רשומות',
      selectEntryTabFirst: 'בחר תחילה טאב רשומה',
      addEntryTitle: 'הוספת רשומה',
      editEntryTitle: 'עריכת רשומה',
      saveChanges: 'שמור שינויים',
      selectCustomFieldType: 'בחר סוג שדה מותאם.',
      englishLabelRequired: 'חובה להזין תווית באנגלית.',
      fieldNameAlreadyExists: 'כבר קיים שדה בשם הזה.',
      entryNameEnglishRequired: 'חובה להזין שם רשומה באנגלית.',
      entryNameHebrewRequired: 'חובה להזין שם רשומה בעברית.',
      isRequiredSuffix: 'הוא שדה חובה.',
      entryCustomerIdRequired: 'חובה להזין מזהה לקוח לטאב הזה.',
      saving: 'שומר…',
      missingRowId: 'מזהה שורה חסר',
      saveFailed: 'השמירה נכשלה',
      entryAdded: 'רשומה נוספה',
      entryAddedLive: 'שורה נוספה בזמן אמת.',
      entryUpdated: 'רשומה עודכנה',
      entryUpdatedLive: 'שורה עודכנה בזמן אמת.',
      deleteFailed: 'המחיקה נכשלה',
      entryDeleted: 'הרשומה נמחקה',
      rowRemovedLive: 'שורה הוסרה בזמן אמת.'
    }
  };

  function t(key) {
    var lang = getLang();
    var pack = STRINGS[lang] || STRINGS.en;
    return pack[key] || STRINGS.en[key] || key;
  }

  function applyStaticI18n() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
  }

  function applyLang(lang) {
    lang = lang === 'en' ? 'en' : 'he';
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ }
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
    var buttons = document.querySelectorAll('[data-lang-toggle]');
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].textContent = lang === 'he' ? 'EN' : 'עב';
      buttons[i].setAttribute('aria-label', lang === 'he' ? 'Switch to English' : 'Switch to Hebrew');
    }
    applyStaticI18n();
  }

  function initLang() {
    applyLang(getLang());
    if (langInited) return;
    langInited = true;
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-lang-toggle]');
      if (!btn) return;
      applyLang(getLang() === 'he' ? 'en' : 'he');
      if (typeof global.EntriesUI.onLangChange === 'function') global.EntriesUI.onLangChange();
    });
  }

  function decodeHtmlEntities(value) {
    var text = String(value == null ? '' : value);
    if (!text || text.indexOf('&') === -1) return text;
    return text
      .replace(/&quot;/gi, '"')
      .replace(/&#0*34;/g, '"')
      .replace(/&#x0*22;/gi, '"')
      .replace(/&apos;/gi, "'")
      .replace(/&#0*39;/g, "'")
      .replace(/&#x0*27;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&');
  }

  function escapeHtml(value) {
    return decodeHtmlEntities(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  global.EntriesUI = {
    initTheme: initTheme,
    applyTheme: applyTheme,
    initLang: initLang,
    applyLang: applyLang,
    getLang: getLang,
    t: t,
    applyStaticI18n: applyStaticI18n,
    onLangChange: null,
    pushToast: pushToast,
    dismissToast: dismissToast,
    decodeHtmlEntities: decodeHtmlEntities,
    escapeHtml: escapeHtml
  };
})(window);
