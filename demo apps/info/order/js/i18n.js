window.OrderI18n = (function () {
  "use strict";

  var LANG_KEY = "orderapp_lang";
  var current = "en";

  var dict = {
    en: {
      pageTitle: "Orders · Biz1",
      brandTitle: "Order App",
      brandSub: "Sign in to manage customer orders and send email templates.",
      loginSubtitle: "Username, email, phone or ID — plus password and OTP when required",
      loginUserLabel: "Email / Username / Phone / ID",
      loginUserPlaceholder: "you@company.com",
      loginPasswordLabel: "Password",
      show: "Show",
      hide: "Hide",
      otpLabel: "Verification code (OTP)",
      otpPlaceholder: "6-digit code",
      signIn: "Sign in",
      demoAccount: "Demo Credentials",
      demoHint: "Use a Biz1 login for eli.bull36.com.",
      fillDemo: "Login As Demo User",
      toggleTheme: "Toggle theme",
      logout: "Log out",
      back: "Back",
      ordersTitle: "Orders",
      ordersSub: "Catalog order rows",
      customerOrdersSub: "Customer order rows",
      catalogProducts: "Catalog products",
      allStatuses: "All statuses",
      allPayments: "All payments",
      unpaid: "Unpaid",
      paid: "Paid",
      partlyPaid: "Partly paid",
      fromDate: "From date",
      toDate: "To date",
      searchOrders: "Order # or note",
      newOrder: "New order",
      loadingOrders: "Loading orders…",
      noOrdersTitle: "No orders yet",
      noOrdersText: "Pick a catalog product, or create an order for a customer.",
      colOrder: "Order #",
      colCustomer: "Client Name",
      colProduct: "Product",
      colDate: "Date",
      colTotal: "Total Price",
      colStatus: "Order Status",
      colPaid: "Paid Status",
      colNotes: "Notes",
      selectAll: "Select all",
      fields: "Fields",
      searchFields: "Search...",
      noFields: "No fields",
      previous: "Previous",
      next: "Next",
      pageOf: "Page {page} of {pages}",
      addOrderRow: "Add order row",
      sendEmailTemplate: "Send email template",
      loadingCustomerOrders: "Loading customer orders…",
      noOrderRowsTitle: "No order rows",
      noOrderRowsText: "Create an order row for this customer.",
      createOrder: "Create order",
      editOrderRow: "Edit order row",
      close: "Close",
      customer: "Customer",
      searchCustomer: "Search customer name, email, phone",
      catalogProduct: "Catalog product",
      selectProduct: "Select product",
      date: "Date",
      orderStatus: "Order status",
      selectStatus: "Select status",
      price: "Price",
      totalPrice: "Total price",
      discount: "Discount",
      paidStatus: "Paid status",
      notes: "Notes",
      optionalNote: "Optional note",
      cancel: "Cancel",
      saveOrder: "Save order",
      emailModalTitle: "Send email template",
      template: "Template",
      selectTemplate: "Select template",
      subjectOverride: "Subject override (optional)",
      subjectPlaceholder: "Leave blank to use template subject",
      messageToken: "Message token {message}",
      messagePlaceholder: "Optional message inserted into the template",
      templateParams: "Template parameters",
      tokenField: "{{{token}}}",
      tokenPlaceholder: "Value for {{{token}}}",
      sendEmail: "Send email",
      deleteOrderRow: "Delete order row",
      deleteConfirmText: "Only unpaid order rows can be deleted. This cannot be undone.",
      deleteSelected: "Delete selected",
      deleteSelectedTitle: "Delete selected orders",
      deleteSelectedConfirm: "Only unpaid order rows can be deleted. Delete {n} selected orders? This cannot be undone.",
      selectRow: "Select row",
      ordersDeleted: "{n} order rows deleted",
      ordersDeleteFailed: "{n} could not be deleted",
      delete: "Delete",
      edit: "Edit",
      email: "Email",
      rows: "Rows",
      catalogProductsStat: "Catalog products",
      statuses: "Statuses",
      noCatalog: "No catalog products",
      signedIn: "Signed in",
      enterUserPass: "Enter username and password.",
      enterOtp: "Enter the OTP sent to your email.",
      signedOut: "Signed out",
      liveConnected: "Live updates connected",
      livePrefix: "Live: ",
      online: "Online",
      offline: "Offline",
      emailActivity: "Email activity for a customer",
      selectCustomer: "Select a customer.",
      selectCatalog: "Select a catalog product.",
      orderUpdated: "Order row updated",
      orderCreated: "Order row created",
      orderDeleted: "Order row deleted",
      noCustomers: "No customers found",
      customerHash: "Customer #{id}",
      sendingTo: "Sending to {name}",
      sendingToMany: "Sending to {n} customers",
      noCustomerOnRows: "Selected rows have no customer.",
      sendSelected: "Send email",
      noTemplates: "No active email templates found.",
      chooseTemplate: "Choose a template.",
      emailSent: "Email sent ({sent})",
      emailSendFailed: "Email could not be sent.",
      emailSendFailedCount: "{n} emails failed",
      emailMaxCustomers: "You can send to at most 50 customers at once.",
      emailIncludeOrders: "Include customer details and order lines",
      emailOrdersLoading: "Loading customer order lines…",
      emailOrdersHint: "{n} order line(s) will be sent as custom_email HTML (fills {message}, or appended to the template).",
      emailOrdersHintMany: "Each of the {n} customers will get their own custom_email HTML block.",
      emailOrdersTokens: "Sent as custom_email · use {message} in the template (or leave empty to append)",
      emailOrdersHeading: "Order lines",
      emailOrdersBlockTitle: "Customer & orders",
      emailOrdersCount: "{n} rows",
      emailOrdersLoadFailed: "Could not load order lines for email.",
      emailNoOrderRows: "No order rows for this customer.",
      customerId: "Customer ID",
      phone: "Phone",
      noEmail: "No email",
      noPhone: "No phone",
      product: "Product",
      language: "Language"
    },
    he: {
      pageTitle: "הזמנות · Biz1",
      brandTitle: "יישום הזמנות",
      brandSub: "התחבר לניהול הזמנות לקוחות ושליחת תבניות אימייל.",
      loginSubtitle: "שם משתמש, אימייל, טלפון או מזהה — בנוסף סיסמה ו-OTP במידת הצורך",
      loginUserLabel: "אימייל / שם משתמש / טלפון / מזהה",
      loginUserPlaceholder: "you@company.com",
      loginPasswordLabel: "סיסמה",
      show: "הצג",
      hide: "הסתר",
      otpLabel: "קוד אימות (OTP)",
      otpPlaceholder: "קוד בן 6 ספרות",
      signIn: "התחברות",
      demoAccount: "פרטי הדגמה",
      demoHint: "השתמש בהתחברות Biz1 עבור eli.bull36.com.",
      fillDemo: "התחבר כמשתמש הדגמה",
      toggleTheme: "החלף ערכת נושא",
      logout: "התנתק",
      back: "חזרה",
      ordersTitle: "הזמנות",
      ordersSub: "שורות הזמנה לפי קטלוג",
      customerOrdersSub: "שורות הזמנה של הלקוח",
      catalogProducts: "מוצרי קטלוג",
      allStatuses: "כל הסטטוסים",
      allPayments: "כל התשלומים",
      unpaid: "לא שולם",
      paid: "שולם",
      partlyPaid: "שולם חלקית",
      fromDate: "מתאריך",
      toDate: "עד תאריך",
      searchOrders: "מספר הזמנה או הערה",
      newOrder: "הזמנה חדשה",
      loadingOrders: "טוען הזמנות…",
      noOrdersTitle: "אין הזמנות עדיין",
      noOrdersText: "בחר מוצר מהקטלוג, או צור הזמנה ללקוח.",
      colOrder: "מס׳ הזמנה",
      colCustomer: "שם לקוח",
      colProduct: "מוצר",
      colDate: "תאריך",
      colTotal: "סה״כ",
      colStatus: "סטטוס הזמנה",
      colPaid: "סטטוס תשלום",
      colNotes: "הערות",
      selectAll: "בחר הכל",
      fields: "שדות",
      searchFields: "חיפוש...",
      noFields: "אין שדות",
      previous: "הקודם",
      next: "הבא",
      pageOf: "עמוד {page} מתוך {pages}",
      addOrderRow: "הוסף שורת הזמנה",
      sendEmailTemplate: "שלח תבנית אימייל",
      loadingCustomerOrders: "טוען הזמנות לקוח…",
      noOrderRowsTitle: "אין שורות הזמנה",
      noOrderRowsText: "צור שורת הזמנה ללקוח זה.",
      createOrder: "צור הזמנה",
      editOrderRow: "ערוך שורת הזמנה",
      close: "סגור",
      customer: "לקוח",
      searchCustomer: "חפש שם לקוח, אימייל, טלפון",
      catalogProduct: "מוצר קטלוג",
      selectProduct: "בחר מוצר",
      date: "תאריך",
      orderStatus: "סטטוס הזמנה",
      selectStatus: "בחר סטטוס",
      price: "מחיר",
      totalPrice: "מחיר כולל",
      discount: "הנחה",
      paidStatus: "סטטוס תשלום",
      notes: "הערות",
      optionalNote: "הערה אופציונלית",
      cancel: "ביטול",
      saveOrder: "שמור הזמנה",
      emailModalTitle: "שלח תבנית אימייל",
      template: "תבנית",
      selectTemplate: "בחר תבנית",
      subjectOverride: "נושא חלופי (אופציונלי)",
      subjectPlaceholder: "השאר ריק לשימוש בנושא התבנית",
      messageToken: "טוקן הודעה {message}",
      messagePlaceholder: "הודעה אופציונלית שתוכנס לתבנית",
      templateParams: "פרמטרי תבנית",
      tokenField: "{{{token}}}",
      tokenPlaceholder: "ערך עבור {{{token}}}",
      sendEmail: "שלח אימייל",
      deleteOrderRow: "מחק שורת הזמנה",
      deleteConfirmText: "ניתן למחוק רק שורות הזמנה שלא שולמו. לא ניתן לבטל פעולה זו.",
      deleteSelected: "מחק נבחרים",
      deleteSelectedTitle: "מחיקת הזמנות נבחרות",
      deleteSelectedConfirm: "ניתן למחוק רק שורות שלא שולמו. למחוק {n} הזמנות נבחרות? לא ניתן לבטל פעולה זו.",
      selectRow: "בחר שורה",
      ordersDeleted: "{n} שורות הזמנה נמחקו",
      ordersDeleteFailed: "{n} לא ניתן היה למחוק",
      delete: "מחק",
      edit: "ערוך",
      email: "אימייל",
      rows: "שורות",
      catalogProductsStat: "מוצרי קטלוג",
      statuses: "סטטוסים",
      noCatalog: "אין מוצרי קטלוג",
      signedIn: "מחובר",
      enterUserPass: "הזן שם משתמש וסיסמה.",
      enterOtp: "הזן את קוד ה-OTP שנשלח לאימייל שלך.",
      signedOut: "התנתקת",
      liveConnected: "עדכונים בזמן אמת מחוברים",
      livePrefix: "חי: ",
      online: "מחובר",
      offline: "לא מחובר",
      emailActivity: "פעילות אימייל עבור לקוח",
      selectCustomer: "בחר לקוח.",
      selectCatalog: "בחר מוצר קטלוג.",
      orderUpdated: "שורת ההזמנה עודכנה",
      orderCreated: "שורת ההזמנה נוצרה",
      orderDeleted: "שורת ההזמנה נמחקה",
      noCustomers: "לא נמצאו לקוחות",
      customerHash: "לקוח #{id}",
      sendingTo: "שולח אל {name}",
      sendingToMany: "שולח אל {n} לקוחות",
      noCustomerOnRows: "לשורות שנבחרו אין לקוח.",
      sendSelected: "שלח אימייל",
      noTemplates: "לא נמצאו תבניות אימייל פעילות.",
      chooseTemplate: "בחר תבנית.",
      emailSent: "האימייל נשלח ({sent})",
      emailSendFailed: "לא ניתן היה לשלוח את האימייל.",
      emailSendFailedCount: "{n} אימיילים נכשלו",
      emailMaxCustomers: "ניתן לשלוח לעד 50 לקוחות בבת אחת.",
      emailIncludeOrders: "כלול פרטי לקוח ושורות הזמנה",
      emailOrdersLoading: "טוען שורות הזמנה של הלקוח…",
      emailOrdersHint: "{n} שורות הזמנה יישלחו כ־custom_email HTML (ממלא {message}, או מצורף לסוף התבנית).",
      emailOrdersHintMany: "כל אחד מ־{n} הלקוחות יקבל בלוק custom_email HTML משלו.",
      emailOrdersTokens: "נשלח כ־custom_email · השתמש ב־{message} בתבנית (או השאר ריק לצירוף בסוף)",
      emailOrdersHeading: "שורות הזמנה",
      emailOrdersBlockTitle: "לקוח והזמנות",
      emailOrdersCount: "{n} שורות",
      emailOrdersLoadFailed: "לא ניתן לטעון שורות הזמנה לאימייל.",
      emailNoOrderRows: "אין שורות הזמנה ללקוח זה.",
      customerId: "מזהה לקוח",
      phone: "טלפון",
      noEmail: "אין אימייל",
      noPhone: "אין טלפון",
      product: "מוצר",
      language: "שפה"
    }
  };

  function t(key, vars) {
    var pack = dict[current] || dict.en;
    var text = pack[key] != null ? pack[key] : (dict.en[key] || key);
    if (vars && typeof vars === "object") {
      Object.keys(vars).forEach(function (k) {
        text = String(text).split("{" + k + "}").join(String(vars[k]));
      });
    }
    return text;
  }

  function getLang() {
    return current;
  }

  function applyDom() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });
    document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      el.setAttribute("title", t(el.getAttribute("data-i18n-title")));
    });
    document.title = t("pageTitle");
    document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-set-lang") === current);
    });
  }

  function setLang(lang, opts) {
    current = lang === "he" ? "he" : "en";
    try { localStorage.setItem(LANG_KEY, current); } catch (e) {}
    document.documentElement.lang = current === "he" ? "he" : "en";
    document.documentElement.dir = current === "he" ? "rtl" : "ltr";
    applyDom();
    if (opts && typeof opts.onChange === "function") opts.onChange(current);
    return current;
  }

  function init(opts) {
    var saved = "en";
    try {
      saved = localStorage.getItem(LANG_KEY) || "en";
    } catch (e) {}
    if (saved !== "he" && saved !== "en") saved = "en";
    setLang(saved, opts);
    document.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-set-lang]");
      if (!btn) return;
      setLang(btn.getAttribute("data-set-lang"), opts);
    });
  }

  return {
    t: t,
    getLang: getLang,
    setLang: setLang,
    init: init,
    applyDom: applyDom
  };
})();
