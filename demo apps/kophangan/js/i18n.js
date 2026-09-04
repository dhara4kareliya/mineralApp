(function (global) {
  'use strict';

  var DICT = {
    en: {
      appName: 'Expense Hub',
      appTagline: 'Track and manage expenses on the go',
      loginTitle: 'Sign in',
      loginSubtitle: 'Username, email, phone or ID — plus password and OTP when required',
      email: 'Username / Email / Phone / ID',
      emailPlaceholder: 'username, email, phone or ID',
      password: 'Password',
      passwordPlaceholder: 'Enter password',
      otp: 'Verification code (OTP)',
      otpPlaceholder: 'Enter code',
      rememberMe: 'Remember me',
      demoCredentials: 'Demo Credentials',
      loginAsDemoUser: 'Login As Domo User',
      connect: 'Sign in',
      connecting: 'Signing in…',
      verifying: 'Verifying…',
      verifyConnect: 'Verify & sign in',
      resendCode: 'Resend code',
      resendIn: 'Resend code in {s}s',
      sending: 'Sending…',
      fillEmailPassword: 'Please fill username/email/phone/ID and password',
      fillOtp: 'Please enter verification code (OTP)',
      loginFailed: 'Login failed',
      otpRequired: 'Verification code required — check your email',
      otpSent: 'A verification code was sent to your email',
      wrongCredentials: 'Wrong username or password',
      tooManyAttempts: 'Too many login attempts. Please try again later.',
      sessionExpired: 'Session expired. Please login again.',
      invalidOtp: 'Invalid verification code',
      showPassword: 'Show or hide password',
      expenses: 'Expenses',
      expenseDetails: 'Expense details',
      addExpense: 'Add Expense',
      editExpense: 'Expense',
      editExpenseTitle: 'Edit Expense',
      delete: 'Delete',
      edit: 'Edit',
      cancel: 'Cancel',
      deleteTitle: 'Delete expense',
      deleteConfirm: 'This action cannot be undone. Are you sure you want to delete this expense?',
      deletedSuccess: 'Expense deleted successfully',
      deleteFailed: 'Failed to delete expense',
      updatedSuccess: 'Expense updated successfully',
      updateFailed: 'Failed to update expense',
      noExpenses: 'No expenses yet',
      noExpensesHint: 'Create your first expense to get started',
      loading: 'Loading…',
      refresh: 'Refresh',
      search: 'Search expenses',
      filters: 'Filters',
      applyFilters: 'Apply',
      clearFilters: 'Clear',
      allCategories: 'All categories',
      allSuppliers: 'All suppliers',
      allMonths: 'All months',
      logout: 'Log out',
      language: 'Language',
      welcome: 'Hello',
      save: 'Save',
      saving: 'Saving…',
      reset: 'Reset',
      close: 'Close',
      expenseName: 'Expense Name',
      expenseNamePlaceholder: 'Expense Name',
      expenseId: 'Expense ID',
      selectCategory: 'Select Category',
      selectSubCategory: 'Select Sub Category',
      chooseCustomer: 'Choose Customer',
      project: 'Project',
      amount: 'Amount',
      amountPlaceholder: 'Enter Amount',
      vatIncluded: 'VAT included',
      selectMonth: 'Select Month',
      paymentDate: 'Payment Date',
      checkNumber: 'Check Number',
      document: 'Document',
      invoiceNumber: 'Invoice Number',
      suppliers: 'Suppliers',
      selectSuppliers: 'Select Suppliers',
      documentDate: 'Document Date',
      image: 'Image',
      dragDrop: 'Drag & Drop a file',
      orTapUpload: 'or tap to upload',
      note: 'Note',
      notePlaceholder: 'Enter Notes',
      other: 'Other',
      delivery: 'Delivery',
      savedSuccess: 'Expense saved successfully',
      saveFailed: 'Failed to save expense',
      loadFailed: 'Failed to load data',
      realtimeUpdate: 'Expense updated in real time',
      realtimeCreated: 'New expense received',
      connected: 'Live',
      disconnected: 'Offline',
      total: 'Total',
      category: 'Category',
      month: 'Month',
      none: '—',
      selectOption: 'Select…',
      fileSelected: 'File selected',
      removeFile: 'Remove file',
      validationRequired: 'Please fill required fields: category, amount, document, and month',
      invalidFileType: 'Please drop an image or PDF file',
      yes: 'Yes',
      no: 'No',
      invoice: 'Invoice',
      receipt: 'Receipt',
      taxInvoiceReceipt: 'Tax Invoice Receipt'
    },
    he: {
      appName: 'מרכז הוצאות',
      appTagline: 'ניהול הוצאות בקלות מהנייד',
      loginTitle: 'התחברות',
      loginSubtitle: 'שם משתמש, אימייל, טלפון או מזהה — וסיסמה וקוד אימות במידת הצורך',
      email: 'שם משתמש / אימייל / טלפון / מזהה',
      emailPlaceholder: 'שם משתמש, אימייל, טלפון או מזהה',
      password: 'סיסמה',
      passwordPlaceholder: 'הזן סיסמה',
      otp: 'קוד אימות (OTP)',
      otpPlaceholder: 'הזן קוד',
      rememberMe: 'זכור אותי',
      demoCredentials: 'פרטי הדגמה',
      loginAsDemoUser: 'התחבר כמשתמש הדגמה',
      connect: 'התחבר',
      connecting: 'מתחבר…',
      verifying: 'מאמת…',
      verifyConnect: 'אמת והתחבר',
      resendCode: 'שלח קוד מחדש',
      resendIn: 'שלח קוד מחדש בעוד {s} שנ׳',
      sending: 'שולח…',
      fillEmailPassword: 'יש למלא שם משתמש/אימייל/טלפון/מזהה וסיסמה',
      fillOtp: 'יש להזין קוד אימות (OTP)',
      loginFailed: 'ההתחברות נכשלה',
      otpRequired: 'נדרש קוד אימות שנשלח אליך',
      otpSent: 'קוד אימות נשלח לאימייל שלך',
      wrongCredentials: 'שם משתמש או סיסמה שגויים',
      tooManyAttempts: 'יותר מדי ניסיונות התחברות. נסה שוב מאוחר יותר.',
      sessionExpired: 'פג תוקף ההתחברות. התחבר מחדש.',
      invalidOtp: 'קוד אימות שגוי',
      showPassword: 'הצג או הסתר סיסמה',
      expenses: 'הוצאות',
      expenseDetails: 'פרטי הוצאה',
      addExpense: 'הוסף הוצאה',
      editExpense: 'הוצאה',
      editExpenseTitle: 'עריכת הוצאה',
      delete: 'מחק',
      edit: 'ערוך',
      cancel: 'ביטול',
      deleteTitle: 'מחיקת הוצאה',
      deleteConfirm: 'לא ניתן לבטל פעולה זו. למחוק את ההוצאה?',
      deletedSuccess: 'ההוצאה נמחקה בהצלחה',
      deleteFailed: 'מחיקת ההוצאה נכשלה',
      updatedSuccess: 'ההוצאה עודכנה בהצלחה',
      updateFailed: 'עדכון ההוצאה נכשל',
      noExpenses: 'אין הוצאות עדיין',
      noExpensesHint: 'צור את ההוצאה הראשונה שלך כדי להתחיל',
      loading: 'טוען…',
      refresh: 'רענון',
      search: 'חיפוש הוצאות',
      filters: 'סינון',
      applyFilters: 'החל',
      clearFilters: 'נקה',
      allCategories: 'כל הקטגוריות',
      allSuppliers: 'כל הספקים',
      allMonths: 'כל החודשים',
      logout: 'התנתק',
      language: 'שפה',
      welcome: 'שלום',
      save: 'שמור',
      saving: 'שומר…',
      reset: 'איפוס',
      close: 'סגור',
      expenseName: 'שם הוצאה',
      expenseNamePlaceholder: 'שם הוצאה',
      expenseId: 'מזהה הוצאה',
      selectCategory: 'בחר קטגוריה',
      selectSubCategory: 'בחר תת קטגוריה',
      chooseCustomer: 'בחר לקוח',
      project: 'פרויקט',
      amount: 'סכום',
      amountPlaceholder: 'הזן סכום',
      vatIncluded: 'כולל מע״מ',
      selectMonth: 'בחר חודש',
      paymentDate: 'תאריך תשלום',
      checkNumber: 'מספר צ׳ק',
      document: 'מסמך',
      invoiceNumber: 'מספר חשבונית',
      suppliers: 'ספקים',
      selectSuppliers: 'בחר ספקים',
      documentDate: 'תאריך מסמך',
      image: 'תמונה',
      dragDrop: 'גרור ושחרר קובץ',
      orTapUpload: 'או לחץ להעלאה',
      note: 'הערה',
      notePlaceholder: 'הזן הערות',
      other: 'אחר',
      delivery: 'משלוח',
      savedSuccess: 'ההוצאה נשמרה בהצלחה',
      saveFailed: 'שמירת ההוצאה נכשלה',
      loadFailed: 'טעינת הנתונים נכשלה',
      realtimeUpdate: 'הוצאה עודכנה בזמן אמת',
      realtimeCreated: 'התקבלה הוצאה חדשה',
      connected: 'מחובר',
      disconnected: 'לא מחובר',
      total: 'סה״כ',
      category: 'קטגוריה',
      month: 'חודש',
      none: '—',
      selectOption: 'בחר…',
      fileSelected: 'קובץ נבחר',
      removeFile: 'הסר קובץ',
      validationRequired: 'נא למלא שדות חובה: קטגוריה, סכום, מסמך וחודש',
      invalidFileType: 'נא לגרור קובץ תמונה או PDF',
      yes: 'כן',
      no: 'לא',
      invoice: 'חשבונית',
      receipt: 'קבלה',
      taxInvoiceReceipt: 'חשבונית מס קבלה'
    }
  };

  var LANG_KEY = 'app_lang';
  var THEME_KEY = 'app_theme';

  function getLang() {
    var saved = localStorage.getItem(LANG_KEY);
    return saved === 'he' || saved === 'en' ? saved : 'en';
  }

  function setLang(lang) {
    localStorage.setItem(LANG_KEY, lang);
    applyLang(lang);
  }

  function toggleLang() {
    setLang(getLang() === 'en' ? 'he' : 'en');
  }

  function t(key, vars) {
    var lang = getLang();
    var text = (DICT[lang] && DICT[lang][key]) || (DICT.en && DICT.en[key]) || key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        text = text.replace('{' + k + '}', String(vars[k]));
      });
    }
    return text;
  }

  function apiMsg(raw, fallbackKey) {
    var text = String(raw || '').trim();
    if (!text) return t(fallbackKey || 'loginFailed');
    var rules = [
      { re: /(קוד|code|otp).{0,25}(נשלח|נשלחה|sent)|(נשלח|נשלחה|sent).{0,25}(קוד|code|otp)/i, key: 'otpSent' },
      { re: /(נדרש|חובה|required).{0,25}(קוד|אימות|otp|code)|(קוד|אימות|otp|code).{0,25}(נדרש|required)/i, key: 'otpRequired' },
      { re: /(קוד|אימות|otp|code).{0,25}(שגוי|שגויה|לא תקין|לא נכון|פג|invalid|incorrect|wrong|expired|mismatch)/i, key: 'invalidOtp' },
      { re: /שם משתמש או סיסמה|סיסמה שגויה|סיסמה לא נכונה|invalid credentials|wrong password|incorrect password|unauthorized/i, key: 'wrongCredentials' },
      { re: /יותר מדי|ניסיונות|too many|rate.?limit/i, key: 'tooManyAttempts' },
      { re: /פג תוקף|session expired|token expired/i, key: 'sessionExpired' },
      { re: /ההתחברות נכשלה|login failed/i, key: 'loginFailed' }
    ];
    for (var i = 0; i < rules.length; i++) {
      if (rules[i].re.test(text)) return t(rules[i].key);
    }
    return text;
  }

  function applyLang(lang) {
    lang = lang || getLang();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (key) el.setAttribute('placeholder', t(key));
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria');
      if (key) el.setAttribute('aria-label', t(key));
    });
    var langBtn = document.getElementById('btn-lang');
    if (langBtn) langBtn.textContent = lang === 'en' ? 'HE' : 'EN';
    global.dispatchEvent(new CustomEvent('app:langchange', { detail: { lang: lang } }));
  }

  function getTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
    var btn = document.getElementById('btn-theme');
    if (btn) btn.textContent = theme === 'light' ? '☾' : '☀';
  }

  function toggleTheme() {
    setTheme(getTheme() === 'light' ? 'dark' : 'light');
  }

  function bootUi() {
    setTheme(getTheme());
    applyLang(getLang());
    var langBtn = document.getElementById('btn-lang');
    var themeBtn = document.getElementById('btn-theme');
    if (langBtn) langBtn.addEventListener('click', toggleLang);
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  }

  global.I18n = {
    t: t,
    apiMsg: apiMsg,
    getLang: getLang,
    setLang: setLang,
    toggleLang: toggleLang,
    applyLang: applyLang,
    getTheme: getTheme,
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    bootUi: bootUi,
    DICT: DICT
  };
})(window);
