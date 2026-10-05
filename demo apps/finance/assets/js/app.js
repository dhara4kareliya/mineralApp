(function () {
  "use strict";

  /* =========================================================
     Config & constants
     ========================================================= */
  var config = window.Biz1Config || {};
  var domain = typeof config.resolveDomain === "function"
    ? config.resolveDomain()
    : "https://" + String(config.user || "demo") + ".bull36.com";
  var appBase = domain + "/app";

  var K = {
    token: "biz1_fin_token",
    cred: "biz1_fin_cred",
    user: "biz1_fin_user_basic",
    role: "biz1_fin_role",
    remember: "biz1_fin_remember",
    username: "biz1_fin_username",
    sessionPass: "biz1_fin_session_pass",
    lang: "biz1_fin_lang",
    theme: "biz1_fin_theme",
    urlToken: "biz1_fin_url_token_login",
    waTemplate: "biz1_fin_wa_template_"
  };

  var PAGE = 25;
  var MAX_DOC_PAGES = 40;
  var MAX_EXPENSE_PAGES = 20;
  var MAX_PRODUCT_PAGES = 8;
  var CONCURRENCY = 6;
  var POLL_MS = 30000;
  var DAY_MS = 86400000;

  var RECEIVABLE_TYPES = { invoice: 1, delivery_invoice: 1, proforma_invoice: 1 };
  var CASH_IN_TYPES = { receipt: 1, receipt_tax_invoice: 1 };
  var INVOICED_TYPES = { invoice: 1, receipt_tax_invoice: 1, delivery_invoice: 1, credit_invoice: 1 };
  var QUOTE_TYPES = { order_proposals: 1, purchase_orders: 1, proforma_invoice: 1, gi_ir: 1, organization_receipt: 1 };
  var NET_ADD_TYPES = { invoice: 1, receipt_tax_invoice: 1 };

  var COLORS = {
    revenue: "#10b981",
    expense: "#f43f5e",
    cashIn: "#0ea5e9",
    primary: "#6366f1",
    aging: ["#10b981", "#f59e0b", "#f97316", "#ef4444", "#9f1239"],
    donut: ["#6366f1", "#10b981", "#0ea5e9", "#f59e0b", "#f43f5e", "#94a3b8"]
  };

  /* =========================================================
     i18n
     ========================================================= */
  var I18N = {
    en: {
      brandName: "Biz1 Finance",
      loginHeadline: "Real-time financial intelligence",
      loginLead: "Live revenue, receivables and product analytics — aggregated straight from the Biz1 REST API.",
      feat1: "Aggregated KPIs in milliseconds",
      feat2: "30 / 60 / 90-day receivables aging",
      feat3: "One-click WhatsApp collection reminders",
      loginFoot: "Powered by the Biz1 App API",
      accountLogin: "Welcome back",
      signInSub: "Sign in to your Biz1 workspace",
      emailUsername: "Email / Username / Phone / ID",
      password: "Password",
      otp: "One-time code",
      otpPlaceholder: "Enter code",
      signIn: "Sign in",
      loading: "Loading…",
      signingIn: "Signing in…",
      verifying: "Verifying…",
      verifySignIn: "Verify & sign in",
      resendOtp: "Resend OTP",
      resendIn: "Resend in",
      resending: "Resending…",
      rememberMe: "Remember me",
      showPassword: "Show password",
      hidePassword: "Hide password",
      demoCredentials: "Demo credentials",
      useDemo: "Use demo user",
      requiredFields: "Please enter your email, username, phone or ID, and password.",
      requiredOtp: "Please enter the OTP.",
      invalidCredentials: "Invalid login details or password.",
      invalidOtp: "Invalid OTP. Please check the code and try again.",
      networkFailure: "Unable to connect. Please check your network and try again.",
      resendFailed: "Could not resend the OTP. Please try again.",
      rateLimit: "Too many login attempts. Please wait before trying again.",
      tryAgainIn: "Try again in",
      otpSent: "An OTP is required to sign in.",
      otpResent: "A new OTP was sent.",
      tokenExpired: "Session token expired. Please sign in again.",
      tokenInvalid: "Invalid or unauthorized token.",

      navOverview: "Executive Dashboard",
      navCashflow: "Cash Flow & Receivables",
      navProducts: "Product Analytics",
      subOverview: "Revenue, growth and client health at a glance",
      subCashflow: "Aging receivables and collection actions",
      subProducts: "Top-selling services & products from your Biz1 catalog",
      refresh: "Refresh",
      logout: "Logout",
      synced: "Synced {t}",
      liveOff: "Live: Off",
      liveConnecting: "Live: Connecting…",
      liveConnected: "Live: Connected",
      livePolling: "Live: Auto-refresh",
      apiSpeed: "{calls} calls · {ms} ms",
      liveUpdate: "Live update received — data refreshed",

      range6: "6M",
      range12: "12M",
      chartArea: "Area",
      chartBar: "Bar",
      kpiRevenue: "Total Revenue",
      kpiGrowth: "MoM Growth",
      kpiOutstanding: "Outstanding Invoices",
      kpiClients: "Active Clients",
      revenueSub: "Last {n} months · all-time {v}",
      growthSub: "{a} this month vs {b} last month",
      growthNoPrev: "No revenue last month · {a} this month",
      outstandingSub: "{n} unpaid · {v} overdue",
      clientsSub: "{n} billed in the last 90 days",
      revVsExp: "Revenue vs. Expenses",
      revVsExpSub: "Monthly net revenue (Documents.Sum) against recorded expenses",
      revenue: "Revenue",
      expenses: "Expenses",
      net: "Net",
      netProfit: "Net profit",
      margin: "Profit margin",
      avgInvoice: "Avg. invoice value",
      bestMonth: "Best month",
      noChartData: "No data for this period yet",
      recentDocs: "Recent documents",
      recentDocsSub: "Latest of {n} documents analysed",
      colDoc: "Document",
      colClient: "Client",
      colDate: "Date",
      colAmount: "Amount",
      colStatus: "Status",
      paid: "Paid",
      unpaid: "Unpaid",
      partly: "Partly paid",
      canceled: "Canceled",
      noDocs: "No documents found in Biz1 yet.",
      apiPerf: "API performance",
      apiPerfSub: "{calls} REST calls · {rows} rows · {ms} ms wall time",
      avgMs: "avg {ms} ms",
      rowsN: "{n} rows",

      outstandingTotal: "Total outstanding",
      overdueTotal: "Overdue",
      avgDaysOverdue: "Avg. days overdue",
      weightedByAmount: "weighted by amount",
      collectedMonth: "Collected this month",
      invoicesN: "{n} invoices",
      clientsN: "{n} clients",
      receiptsN: "{n} receipts",
      agingTitle: "Receivables aging",
      agingSub: "Open invoices by days past due date — click a bucket to filter",
      bucket0: "Not yet due",
      bucket1: "1–30 days",
      bucket2: "31–60 days",
      bucket3: "61–90 days",
      bucket4: "90+ days",
      overdueClients: "Overdue clients",
      overdueClientsSub: "{n} clients with open invoices · select who gets a reminder",
      filteredBy: "{b} ×",
      colInvoices: "Invoices",
      colOldest: "Oldest",
      colBucket: "Aging",
      colReminder: "Reminder",
      daysN: "{n} d",
      notDue: "Not due",
      noOpen: "No open invoices — all receivables are collected. 🎉",
      noLinkedClient: "No linked client",
      cashInOut: "Cash in vs. cash out",
      cashInOutSub: "Receipts collected against expenses, last 6 months",
      cashIn: "Cash in",
      cashOut: "Cash out",

      waTitle: "WhatsApp reminders",
      waSelected: "{n} clients selected · {v}",
      waTemplate: "Message template",
      waPlaceholders: "Placeholders: {name} {count} {amount} {days} {invoices}",
      waPreview: "Preview",
      waBtn: "Send Automated WhatsApp Reminders to Overdue Clients",
      waDefault: "Hello {name},\nThis is a friendly reminder that you have {count} open invoice(s) totaling {amount}: {invoices}.\nThe oldest is {days} days past due. Please arrange payment at your earliest convenience.\nThank you!",
      waConfirmTitle: "Send WhatsApp reminders?",
      waConfirmBody: "Biz1 will send a WhatsApp message to {n} clients ({v} outstanding). This can't be undone.",
      cancel: "Cancel",
      confirmSend: "Send now",
      waSending: "Sending {i} of {n}…",
      waDone: "Sent {ok} of {n} reminders via Biz1 WhatsApp.",
      waAllFailed: "No reminders were sent. {m}",
      waNoneSelected: "Select at least one client with open invoices.",
      waNoClients: "No overdue clients — nothing to send.",
      waSent: "Sent",
      waFailed: "Failed",
      sampleClient: "Client",

      metricRevenue: "Revenue",
      metricQty: "Quantity",
      srcAll: "All documents",
      srcInvoiced: "Invoiced",
      srcQuotes: "Quotes & orders",
      searchProducts: "Search products…",
      rankTitle: "Product leaderboard",
      rankSub: "{p} products · {l} line items across {d} documents",
      colRank: "#",
      colProduct: "Product",
      colQty: "Qty sold",
      colRevenue: "Revenue",
      colShare: "Share",
      colDocs: "Docs",
      colAvgPrice: "Avg. price",
      colCatalog: "Catalog price",
      inCatalog: "Catalog",
      adhoc: "Ad-hoc",
      shareTitle: "Revenue share",
      shareTitleQty: "Quantity share",
      others: "Others",
      top5: "Top 5",
      coverageTitle: "Catalog coverage",
      coverageText: "{a} of {b} catalog items sold",
      catalogEmpty: "Your Biz1 catalog is empty — ranking uses document line items.",
      unsoldTitle: "Catalog items with no sales",
      allSold: "Every catalog item has sales.",
      noProducts: "No product line items found in documents for this filter.",
      noMatch: "No products match your search.",
      unitsN: "{n} units",
      docsN: "{n} docs",

      truncated: "Analysed the latest {a} of {b} documents.",
      loadFailed: "Couldn't load documents from Biz1: {m}",

      doc_invoice: "Tax Invoice",
      doc_receipt: "Receipt",
      doc_receipt_tax_invoice: "Invoice Receipt",
      doc_delivery_invoice: "Delivery Note",
      doc_order_proposals: "Price Quote",
      doc_proforma_invoice: "Proforma",
      doc_credit_invoice: "Credit Note",
      doc_purchase_orders: "Purchase Order",
      doc_gi_ir: "GI/IR",
      doc_organization_receipt: "Org. Receipt"
    },
    he: {
      brandName: "Biz1 פיננסים",
      loginHeadline: "מודיעין פיננסי בזמן אמת",
      loginLead: "הכנסות, חובות ואנליטיקת מוצרים בזמן אמת — מאוחדים ישירות מ-REST API של Biz1.",
      feat1: "מדדי KPI מאוחדים באלפיות שנייה",
      feat2: "גיול חובות 30 / 60 / 90 ימים",
      feat3: "תזכורות גבייה בווטסאפ בלחיצה אחת",
      loginFoot: "מופעל על ידי Biz1 App API",
      accountLogin: "ברוכים השבים",
      signInSub: "התחברו לסביבת העבודה שלכם ב-Biz1",
      emailUsername: "אימייל / שם משתמש / טלפון / מזהה",
      password: "סיסמה",
      otp: "קוד חד-פעמי",
      otpPlaceholder: "הזן קוד",
      signIn: "התחבר",
      loading: "טוען…",
      signingIn: "מתחבר…",
      verifying: "מאמת…",
      verifySignIn: "אמת והתחבר",
      resendOtp: "שלח קוד מחדש",
      resendIn: "שליחה מחדש בעוד",
      resending: "שולח מחדש…",
      rememberMe: "זכור אותי",
      showPassword: "הצג סיסמה",
      hidePassword: "הסתר סיסמה",
      demoCredentials: "פרטי הדגמה",
      useDemo: "השתמש במשתמש הדגמה",
      requiredFields: "יש להזין אימייל, שם משתמש, טלפון או מזהה, וסיסמה.",
      requiredOtp: "יש להזין קוד אימות.",
      invalidCredentials: "פרטי ההתחברות או הסיסמה שגויים.",
      invalidOtp: "קוד האימות שגוי. יש לבדוק ולנסות שוב.",
      networkFailure: "לא ניתן להתחבר. יש לבדוק את החיבור ולנסות שוב.",
      resendFailed: "לא ניתן לשלוח מחדש את קוד האימות.",
      rateLimit: "יותר מדי ניסיונות התחברות. יש להמתין לפני ניסיון נוסף.",
      tryAgainIn: "נסה שוב בעוד",
      otpSent: "נדרש קוד אימות כדי להתחבר.",
      otpResent: "קוד אימות חדש נשלח.",
      tokenExpired: "תוקף ההתחברות פג. יש להתחבר מחדש.",
      tokenInvalid: "טוקן לא תקין או לא מורשה.",

      navOverview: "לוח בקרה ניהולי",
      navCashflow: "תזרים מזומנים וחייבים",
      navProducts: "אנליטיקת מוצרים",
      subOverview: "הכנסות, צמיחה ובריאות לקוחות במבט אחד",
      subCashflow: "גיול חובות ופעולות גבייה",
      subProducts: "השירותים והמוצרים הנמכרים ביותר מקטלוג Biz1",
      refresh: "רענן",
      logout: "התנתק",
      synced: "סונכרן {t}",
      liveOff: "שידור חי: כבוי",
      liveConnecting: "שידור חי: מתחבר…",
      liveConnected: "שידור חי: מחובר",
      livePolling: "שידור חי: רענון אוטומטי",
      apiSpeed: "{calls} קריאות · {ms} ms",
      liveUpdate: "התקבל עדכון חי — הנתונים רועננו",

      range6: "6ח׳",
      range12: "12ח׳",
      chartArea: "שטח",
      chartBar: "עמודות",
      kpiRevenue: "סה״כ הכנסות",
      kpiGrowth: "צמיחה חודשית",
      kpiOutstanding: "חשבוניות פתוחות",
      kpiClients: "לקוחות פעילים",
      revenueSub: "{n} חודשים אחרונים · מצטבר {v}",
      growthSub: "{a} החודש מול {b} בחודש שעבר",
      growthNoPrev: "אין הכנסות בחודש שעבר · {a} החודש",
      outstandingSub: "{n} לא שולמו · {v} באיחור",
      clientsSub: "{n} חויבו ב-90 הימים האחרונים",
      revVsExp: "הכנסות מול הוצאות",
      revVsExpSub: "הכנסות נטו חודשיות (Documents.Sum) מול הוצאות רשומות",
      revenue: "הכנסות",
      expenses: "הוצאות",
      net: "נטו",
      netProfit: "רווח נקי",
      margin: "שיעור רווח",
      avgInvoice: "ממוצע לחשבונית",
      bestMonth: "החודש הטוב ביותר",
      noChartData: "אין עדיין נתונים לתקופה זו",
      recentDocs: "מסמכים אחרונים",
      recentDocsSub: "האחרונים מתוך {n} מסמכים שנותחו",
      colDoc: "מסמך",
      colClient: "לקוח",
      colDate: "תאריך",
      colAmount: "סכום",
      colStatus: "סטטוס",
      paid: "שולם",
      unpaid: "לא שולם",
      partly: "שולם חלקית",
      canceled: "בוטל",
      noDocs: "לא נמצאו עדיין מסמכים ב-Biz1.",
      apiPerf: "ביצועי API",
      apiPerfSub: "{calls} קריאות REST · {rows} רשומות · {ms} ms זמן כולל",
      avgMs: "ממוצע {ms} ms",
      rowsN: "{n} רשומות",

      outstandingTotal: "סה״כ פתוח",
      overdueTotal: "באיחור",
      avgDaysOverdue: "ממוצע ימי איחור",
      weightedByAmount: "משוקלל לפי סכום",
      collectedMonth: "נגבה החודש",
      invoicesN: "{n} חשבוניות",
      clientsN: "{n} לקוחות",
      receiptsN: "{n} קבלות",
      agingTitle: "גיול חובות",
      agingSub: "חשבוניות פתוחות לפי ימים ממועד התשלום — לחצו על קבוצה לסינון",
      bucket0: "טרם הגיע מועד",
      bucket1: "1–30 ימים",
      bucket2: "31–60 ימים",
      bucket3: "61–90 ימים",
      bucket4: "90+ ימים",
      overdueClients: "לקוחות בחוב",
      overdueClientsSub: "{n} לקוחות עם חשבוניות פתוחות · בחרו למי לשלוח תזכורת",
      filteredBy: "{b} ×",
      colInvoices: "חשבוניות",
      colOldest: "הוותיקה",
      colBucket: "גיול",
      colReminder: "תזכורת",
      daysN: "{n} ימ׳",
      notDue: "לא באיחור",
      noOpen: "אין חשבוניות פתוחות — כל החובות נגבו. 🎉",
      noLinkedClient: "ללא לקוח מקושר",
      cashInOut: "כסף נכנס מול כסף יוצא",
      cashInOutSub: "קבלות שנגבו מול הוצאות, 6 חודשים אחרונים",
      cashIn: "נכנס",
      cashOut: "יוצא",

      waTitle: "תזכורות ווטסאפ",
      waSelected: "{n} לקוחות נבחרו · {v}",
      waTemplate: "תבנית הודעה",
      waPlaceholders: "משתנים: {name} {count} {amount} {days} {invoices}",
      waPreview: "תצוגה מקדימה",
      waBtn: "שלח תזכורות ווטסאפ אוטומטיות ללקוחות בחוב",
      waDefault: "שלום {name},\nזוהי תזכורת ידידותית כי קיימות {count} חשבוניות פתוחות בסך {amount}: {invoices}.\nהוותיקה שבהן באיחור של {days} ימים. נודה להסדרת התשלום בהקדם.\nתודה!",
      waConfirmTitle: "לשלוח תזכורות ווטסאפ?",
      waConfirmBody: "Biz1 תשלח הודעת ווטסאפ ל-{n} לקוחות ({v} פתוח). לא ניתן לבטל פעולה זו.",
      cancel: "ביטול",
      confirmSend: "שלח עכשיו",
      waSending: "שולח {i} מתוך {n}…",
      waDone: "נשלחו {ok} מתוך {n} תזכורות דרך ווטסאפ של Biz1.",
      waAllFailed: "לא נשלחו תזכורות. {m}",
      waNoneSelected: "יש לבחור לפחות לקוח אחד עם חשבוניות פתוחות.",
      waNoClients: "אין לקוחות בחוב — אין מה לשלוח.",
      waSent: "נשלח",
      waFailed: "נכשל",
      sampleClient: "לקוח",

      metricRevenue: "הכנסות",
      metricQty: "כמות",
      srcAll: "כל המסמכים",
      srcInvoiced: "חשבוניות",
      srcQuotes: "הצעות והזמנות",
      searchProducts: "חיפוש מוצרים…",
      rankTitle: "טבלת מוצרים מובילים",
      rankSub: "{p} מוצרים · {l} שורות ב-{d} מסמכים",
      colRank: "#",
      colProduct: "מוצר",
      colQty: "כמות",
      colRevenue: "הכנסות",
      colShare: "נתח",
      colDocs: "מסמכים",
      colAvgPrice: "מחיר ממוצע",
      colCatalog: "מחיר קטלוגי",
      inCatalog: "קטלוג",
      adhoc: "חד-פעמי",
      shareTitle: "נתח הכנסות",
      shareTitleQty: "נתח כמות",
      others: "אחרים",
      top5: "5 המובילים",
      coverageTitle: "כיסוי קטלוג",
      coverageText: "{a} מתוך {b} פריטי קטלוג נמכרו",
      catalogEmpty: "קטלוג Biz1 ריק — הדירוג מבוסס על שורות המסמכים.",
      unsoldTitle: "פריטי קטלוג ללא מכירות",
      allSold: "לכל פריטי הקטלוג יש מכירות.",
      noProducts: "לא נמצאו שורות מוצרים במסמכים עבור סינון זה.",
      noMatch: "אין מוצרים התואמים לחיפוש.",
      unitsN: "{n} יח׳",
      docsN: "{n} מסמכים",

      truncated: "נותחו {a} המסמכים האחרונים מתוך {b}.",
      loadFailed: "לא ניתן לטעון מסמכים מ-Biz1: {m}",

      doc_invoice: "חשבונית מס",
      doc_receipt: "קבלה",
      doc_receipt_tax_invoice: "חשבונית מס קבלה",
      doc_delivery_invoice: "תעודת משלוח",
      doc_order_proposals: "הצעת מחיר",
      doc_proforma_invoice: "חשבון עסקה",
      doc_credit_invoice: "חשבונית זיכוי",
      doc_purchase_orders: "הזמנת רכש",
      doc_gi_ir: "GI/IR",
      doc_organization_receipt: "קבלה לעמותה"
    }
  };

  var PAGE_META = {
    overview: ["navOverview", "subOverview"],
    cashflow: ["navCashflow", "subCashflow"],
    products: ["navProducts", "subProducts"]
  };

  /* =========================================================
     State
     ========================================================= */
  var state = {
    token: localStorage.getItem(K.token) || "",
    otpRequired: false,
    lastLogin: { username: "", password: "" },
    requestInFlight: false,
    requestSource: "",
    rateLimitUntil: 0,
    rateLimitTimer: null,
    resendUntil: 0,
    resendTimer: null,

    lang: localStorage.getItem(K.lang) === "he" ? "he" : "en",
    theme: document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light",
    tab: "overview",
    range: 12,
    chartType: "area",
    trendHidden: {},
    cashHidden: {},
    metric: "revenue",
    source: "all",
    search: "",
    bucket: null,

    data: null,
    currency: config.currency || "₪",
    loading: false,
    perf: [],
    wall: 0,
    lastSync: 0,

    selected: {},
    selectionSeen: {},
    waResults: {},
    waSending: false,

    client: null,
    realtimeConnected: false,
    realtimeBound: false,
    refreshTimer: null,
    rtDebounce: null,
    resizeTimer: null
  };

  /* =========================================================
     Utilities
     ========================================================= */
  function qs(id) { return document.getElementById(id); }
  function locale() { return state.lang === "he" ? "he-IL" : "en-US"; }
  function t(key, vars) {
    var pack = I18N[state.lang] || I18N.en;
    var s = pack[key] != null ? pack[key] : (I18N.en[key] != null ? I18N.en[key] : key);
    if (vars) {
      s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    }
    return s;
  }
  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function setText(id, v) { var el = qs(id); if (el) el.textContent = v; }
  function toNum(v) {
    if (v == null || v === "") return 0;
    var n = Number(String(v).replace(/[^\d.\-]/g, ""));
    return isFinite(n) ? n : 0;
  }
  function pick(row, keys) {
    for (var i = 0; i < keys.length; i += 1) {
      var v = row ? row[keys[i]] : null;
      if (v != null && String(v).trim() !== "") return v;
    }
    return null;
  }
  function money(v, digits) {
    var n = Number(v) || 0;
    var neg = n < 0;
    n = Math.abs(n);
    var d = digits != null ? digits : (n % 1 !== 0 && n < 1000 ? 2 : 0);
    return (neg ? "-" : "") + state.currency + n.toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function moneyCompact(v) {
    var n = Number(v) || 0;
    var a = Math.abs(n);
    var s;
    if (a >= 1e6) s = (a / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    else if (a >= 1e3) s = (a / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    else s = String(Math.round(a));
    return (n < 0 ? "-" : "") + state.currency + s;
  }
  function fmtNum(v, digits) {
    return (Number(v) || 0).toLocaleString(locale(), { maximumFractionDigits: digits == null ? 0 : digits });
  }
  function fmtPct(v, digits) {
    if (v == null || !isFinite(v)) return "—";
    var d = digits == null ? 1 : digits;
    return (v > 0 ? "+" : "") + v.toFixed(d) + "%";
  }
  function parseDate(v) {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    var s = String(v).trim();
    if (!s || /^0000-00-00/.test(s)) return null;
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) s = s.replace(" ", "T") + "Z";
    var d = new Date(s);
    if (isNaN(d.getTime())) return null;
    var y = d.getFullYear();
    return (y < 2000 || y > 2100) ? null : d;
  }
  function monthKeyOf(d) {
    return d ? d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") : "";
  }
  function expenseMonthKey(row) {
    var m = row ? String(row.month_display || row.month || "").trim() : "";
    var mmyy = m.match(/^(\d{2})(\d{2})$/);
    if (mmyy && Number(mmyy[1]) >= 1 && Number(mmyy[1]) <= 12) return (2000 + Number(mmyy[2])) + "-" + mmyy[1];
    if (/^\d{4}-\d{2}/.test(m)) return m.slice(0, 7);
    var slash = m.match(/^(\d{1,2})\/(\d{4})$/);
    if (slash) return slash[2] + "-" + String(slash[1]).padStart(2, "0");
    return monthKeyOf(parseDate(pick(row, ["payment_date", "document_date", "date", "created_time", "created_at"])));
  }
  function monthLabel(key, long) {
    var p = String(key).split("-");
    var d = new Date(Number(p[0]), Number(p[1]) - 1, 1);
    return d.toLocaleString(locale(), long ? { month: "long", year: "numeric" } : { month: "short" });
  }
  function fmtDate(d) {
    return d ? d.toLocaleDateString(locale(), { day: "2-digit", month: "short", year: "numeric" }) : "—";
  }
  function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  function ymd(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function lastMonths(n) {
    var now = new Date();
    var out = [];
    for (var i = n - 1; i >= 0; i -= 1) {
      var start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      out.push({ key: monthKeyOf(start), from: ymd(start), to: ymd(end) });
    }
    return out;
  }
  function docTypeLabel(type) {
    var key = "doc_" + type;
    var s = t(key);
    if (s !== key) return s;
    return String(type || "").replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function toast(msg) {
    var el = qs("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { el.classList.add("hidden"); }, 4200);
  }

  /* =========================================================
     API layer — timed, concurrency-limited POST calls
     ========================================================= */
  var inflight = 0;
  var waitQueue = [];
  function acquire() {
    return new Promise(function (resolve) {
      if (inflight < CONCURRENCY) { inflight += 1; resolve(); }
      else waitQueue.push(resolve);
    });
  }
  function release() {
    inflight -= 1;
    var next = waitQueue.shift();
    if (next) { inflight += 1; next(); }
  }

  function makeRequestError(message, status, raw, code) {
    var err = new Error(message || "Request failed");
    err.status = Number(status || 0);
    err.raw = raw || {};
    if (code) err.code = code;
    return err;
  }

  function rowsOf(raw) {
    if (!raw) return [];
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.rows)) return raw.rows;
    if (Array.isArray(raw.output)) return raw.output;
    if (raw.data && Array.isArray(raw.data.rows)) return raw.data.rows;
    if (raw.output && Array.isArray(raw.output.rows)) return raw.output.rows;
    return [];
  }

  async function postRoute(route, body, opts) {
    opts = opts || {};
    await acquire();
    var started = performance.now();
    var res;
    var data = {};
    try {
      var headers = {};
      if (!opts.publicRoute) headers.Authorization = "Bearer " + state.token;
      try {
        res = await fetch(appBase + "/" + route, { method: "POST", headers: headers, body: new URLSearchParams(body || {}) });
      } catch (netErr) {
        throw makeRequestError("Network request failed", 0, {}, "NETWORK");
      }
      try { data = await res.json(); } catch (e) { data = {}; }
    } finally {
      release();
    }
    var ms = performance.now() - started;
    var ok = res.ok && String(data.success) !== "0" && !(Number(data.status) >= 400);
    if (opts.track !== false) {
      state.perf.push({ route: route, label: opts.label || "", ms: ms, rows: rowsOf(data).length, ok: ok });
    }
    if (res.status === 401 || Number(data.status) === 401) {
      clearAuthStorage(false);
      showLogin();
      throw makeRequestError("Session expired", 401, data);
    }
    if (opts.throwHttpError && !ok) {
      throw makeRequestError(data.message || "Request failed", res.status || data.status, data);
    }
    return data;
  }

  async function fetchAllPages(route, body, maxPages) {
    function pageBody(start) {
      var b = Object.assign({}, body || {});
      b.start = start; b.offset = start; b.length = PAGE; b.limit = PAGE;
      return b;
    }
    try {
      var first = await postRoute(route, pageBody(0), { label: "p1" });
      if (String(first.success) === "0") return { rows: [], total: 0, error: first.message || first.error || "error" };
      var rows = rowsOf(first).slice();
      var total = Number(first.recordsTotal != null ? first.recordsTotal : (first.count != null ? first.count : first.total_record));
      if (!isFinite(total) || total < rows.length) total = NaN;

      if (isFinite(total)) {
        var pages = Math.min(maxPages, Math.ceil(total / PAGE));
        var tasks = [];
        for (var p = 1; p < pages; p += 1) {
          tasks.push(postRoute(route, pageBody(p * PAGE), { label: "p" + (p + 1) }).catch(function () { return null; }));
        }
        (await Promise.all(tasks)).forEach(function (r) { rows = rows.concat(rowsOf(r)); });
      } else {
        var last = rowsOf(first).length;
        var page = 1;
        while (last === PAGE && page < maxPages) {
          var next = await postRoute(route, pageBody(page * PAGE), { label: "p" + (page + 1) });
          var nr = rowsOf(next);
          rows = rows.concat(nr);
          last = nr.length;
          page += 1;
        }
        total = rows.length;
      }

      var seen = {};
      rows = rows.filter(function (r) {
        var id = r && (r.id != null ? r.id : null);
        if (id == null) return true;
        if (seen[id]) return false;
        seen[id] = true;
        return true;
      });
      return { rows: rows, total: total, truncated: total > rows.length };
    } catch (err) {
      if (err && err.status === 401) throw err;
      return { rows: [], total: 0, error: (err && err.message) || "error" };
    }
  }

  function safe(promise) {
    return promise.catch(function (err) {
      if (err && err.status === 401) throw err;
      return null;
    });
  }

  /* =========================================================
     Data loading & aggregation
     ========================================================= */
  async function loadAll() {
    state.perf = [];
    var t0 = performance.now();
    var months = lastMonths(12);

    var results = await Promise.all([
      safe(postRoute("Customer.Count", {})),
      safe(postRoute("Documents.Sum", {}, { label: "all-time" })),
      Promise.all(months.map(function (m) {
        return safe(postRoute("Documents.Sum", { from_date: m.from, to_date: m.to }, { label: m.key }));
      })),
      fetchAllPages("Documents.List", {}, MAX_DOC_PAGES),
      fetchAllPages("Expenses.List", {}, MAX_EXPENSE_PAGES),
      fetchAllPages("Products.List", {}, MAX_PRODUCT_PAGES),
      safe(postRoute("Order.Catalog", { order_type: "all" }))
    ]);

    state.wall = performance.now() - t0;
    return aggregate({
      months: months,
      customerCount: results[0],
      sumAll: results[1],
      sumMonths: results[2],
      docs: results[3],
      expenses: results[4],
      products: results[5],
      orderCatalog: results[6]
    });
  }

  function normalizeDoc(r) {
    var paid = Number(r.paid);
    var partial = 0;
    if (paid === 2) {
      try {
        var arr = typeof r.related_partly_receipt_total === "string" ? JSON.parse(r.related_partly_receipt_total) : r.related_partly_receipt_total;
        if (Array.isArray(arr)) arr.forEach(function (x) { partial += toNum(x); });
      } catch (e) { /* ignore */ }
    }
    var amount = toNum(pick(r, ["final_amount", "final_amount_main", "total", "amount"]));
    var items = r.items;
    if (typeof items === "string") { try { items = JSON.parse(items); } catch (e2) { items = []; } }
    return {
      id: r.id,
      number: pick(r, ["last_documents_id", "invoice_number", "id"]),
      type: String(r.type || r.document_type || "").toLowerCase(),
      custId: r.cust_id && String(r.cust_id) !== "0" ? String(r.cust_id) : "",
      name: String(pick(r, ["name", "company_name", "email"]) || "").trim(),
      company: String(r.company_name || "").trim(),
      phone: String(pick(r, ["mobile", "phone"]) || "").trim(),
      coin: r.coin || "",
      date: parseDate(pick(r, ["date_created", "default_date", "inserted_date"])),
      due: parseDate(r.due_date),
      amount: amount,
      open: paid === 2 ? Math.max(0, amount - partial) : amount,
      paid: paid,
      canceled: Number(r.is_canceled) === 1 || Number(r.canceled_status) === 1 || paid === 3,
      draft: Number(r.save_as_draft) === 1,
      items: Array.isArray(items) ? items : [],
      pdf: r.pdf_url || ""
    };
  }

  function aggregate(src) {
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var curKey = monthKeyOf(now);

    var docs = (src.docs.rows || []).map(normalizeDoc).filter(function (d) { return !d.draft; });

    var coinCount = {};
    docs.forEach(function (d) { if (d.coin) coinCount[d.coin] = (coinCount[d.coin] || 0) + 1; });
    var topCoin = Object.keys(coinCount).sort(function (a, b) { return coinCount[b] - coinCount[a]; })[0];
    if (topCoin) state.currency = topCoin;

    // Monthly revenue: server aggregation first, client-side net formula as fallback.
    var clientRevenue = {};
    docs.forEach(function (d) {
      if (d.canceled || !d.date) return;
      var k = monthKeyOf(d.date);
      if (NET_ADD_TYPES[d.type]) clientRevenue[k] = (clientRevenue[k] || 0) + d.amount;
      if (d.type === "credit_invoice") clientRevenue[k] = (clientRevenue[k] || 0) - d.amount;
    });
    var serverOk = src.sumMonths.every(function (r) { return r && String(r.success) === "1"; });

    var expenseByMonth = {};
    var expenseTotal = 0;
    (src.expenses.rows || []).forEach(function (r) {
      var k = expenseMonthKey(r);
      var amt = toNum(pick(r, ["amount", "total", "sum", "price"]));
      if (!k) return;
      expenseByMonth[k] = (expenseByMonth[k] || 0) + amt;
      expenseTotal += amt;
    });

    var cashInByMonth = {};
    var collectedMonth = 0;
    var collectedCount = 0;
    docs.forEach(function (d) {
      if (d.canceled || !CASH_IN_TYPES[d.type] || !d.date) return;
      var k = monthKeyOf(d.date);
      cashInByMonth[k] = (cashInByMonth[k] || 0) + d.amount;
      if (k === curKey) { collectedMonth += d.amount; collectedCount += 1; }
    });

    var trend = src.months.map(function (m, i) {
      var sr = src.sumMonths[i];
      var revenue = serverOk ? toNum(sr.sum_final_amount != null ? sr.sum_final_amount : sr.sum) : (clientRevenue[m.key] || 0);
      var expense = expenseByMonth[m.key] || 0;
      return {
        key: m.key,
        revenue: revenue,
        expense: expense,
        cashIn: cashInByMonth[m.key] || 0,
        docs: serverOk ? toNum(sr.count) : 0
      };
    });

    var allTime = src.sumAll && String(src.sumAll.success) === "1"
      ? toNum(src.sumAll.sum_final_amount != null ? src.sumAll.sum_final_amount : src.sumAll.sum)
      : Object.keys(clientRevenue).reduce(function (a, k) { return a + clientRevenue[k]; }, 0);

    // Receivables & aging
    var buckets = [0, 1, 2, 3, 4].map(function (i) { return { idx: i, amount: 0, count: 0 }; });
    var clientMap = {};
    var outstanding = 0;
    var overdue = 0;
    var overdueCount = 0;
    var unpaidCount = 0;
    var weightedDays = 0;
    docs.forEach(function (d) {
      if (d.canceled || !RECEIVABLE_TYPES[d.type]) return;
      if (!(d.paid === 0 || d.paid === 2) || d.open <= 0) return;
      var due = d.due || d.date || today;
      var dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      var days = Math.floor((today - dueDay) / DAY_MS);
      var b = days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4;
      buckets[b].amount += d.open;
      buckets[b].count += 1;
      outstanding += d.open;
      unpaidCount += 1;
      if (days > 0) { overdue += d.open; overdueCount += 1; weightedDays += days * d.open; }

      var key = d.custId ? "c" + d.custId : "d" + d.id;
      if (!clientMap[key]) {
        clientMap[key] = { key: key, custId: d.custId, name: d.name, company: d.company, phone: d.phone, invoices: [], amount: 0, maxDays: -Infinity, bucket: 0 };
      }
      var c = clientMap[key];
      c.invoices.push({ number: d.number, amount: d.open, days: days, type: d.type });
      c.amount += d.open;
      if (days > c.maxDays) c.maxDays = days;
      if (b > c.bucket) c.bucket = b;
    });
    var clients = Object.keys(clientMap).map(function (k) { return clientMap[k]; })
      .sort(function (a, b) { return (b.maxDays - a.maxDays) || (b.amount - a.amount); });

    // Client activity
    var active90 = {};
    docs.forEach(function (d) {
      if (d.custId && d.date && (now - d.date) <= 90 * DAY_MS) active90[d.custId] = 1;
    });
    var customerTotal = src.customerCount ? toNum(src.customerCount.count != null ? src.customerCount.count : src.customerCount.total) : 0;

    var invoiced = docs.filter(function (d) { return !d.canceled && NET_ADD_TYPES[d.type]; });
    var avgInvoice = invoiced.length ? invoiced.reduce(function (a, d) { return a + d.amount; }, 0) / invoiced.length : 0;

    var recent = docs.slice().sort(function (a, b) { return (b.date || 0) - (a.date || 0); }).slice(0, 8);

    // Product line items
    var lines = [];
    docs.forEach(function (d) {
      if (d.canceled || d.type === "receipt") return;
      var sign = d.type === "credit_invoice" ? -1 : 1;
      var group = INVOICED_TYPES[d.type] ? "invoiced" : (QUOTE_TYPES[d.type] ? "quotes" : "other");
      d.items.forEach(function (it) {
        var name = String(it.item_name || it.product_name || it.name || "").trim();
        if (!name) return;
        var qty = toNum(it.item_qty || it.qty || 1);
        var total = it.item_total != null && it.item_total !== "" ? toNum(it.item_total) : qty * toNum(it.item_price);
        var pid = String(it.iteeeem_id || it.product_id || "");
        lines.push({ name: name, qty: qty * sign, revenue: total * sign, pid: pid && pid !== "0" ? pid : "", docId: d.id, group: group });
      });
    });

    // Catalog (Products.List + Order.Catalog)
    var catalog = [];
    (src.products.rows || []).forEach(function (r) {
      catalog.push({
        id: String(r.id != null ? r.id : ""),
        name: String(pick(r, ["product_name", "name", "title"]) || "").trim(),
        price: toNum(pick(r, ["price", "sale_price", "regular_price", "amount"])),
        type: String(r.type || r.product_type || "")
      });
    });
    rowsOf(src.orderCatalog).forEach(function (r) {
      catalog.push({ id: "o" + (r.id != null ? r.id : r.order_id), name: String(r.name || "").trim(), price: toNum(r.price), type: "service" });
    });
    catalog = catalog.filter(function (c) { return c.name; });

    return {
      trend: trend,
      revenueSource: serverOk ? "server" : "client",
      allTime: allTime,
      expenseTotal: expenseTotal,
      buckets: buckets,
      clients: clients,
      outstanding: outstanding,
      overdue: overdue,
      overdueCount: overdueCount,
      unpaidCount: unpaidCount,
      avgDaysOverdue: overdue > 0 ? weightedDays / overdue : 0,
      collectedMonth: collectedMonth,
      collectedCount: collectedCount,
      customerTotal: customerTotal,
      active90: Object.keys(active90).length,
      avgInvoice: avgInvoice,
      docsAnalysed: docs.length,
      docsTotal: src.docs.total || docs.length,
      docsTruncated: !!src.docs.truncated,
      docsError: src.docs.error || "",
      recent: recent,
      lines: lines,
      catalog: catalog
    };
  }

  /* =========================================================
     Charts (hand-rolled SVG)
     ========================================================= */
  function niceMax(v) {
    if (!(v > 0)) return 1;
    var exp = Math.pow(10, Math.floor(Math.log10(v)));
    var f = v / exp;
    var nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return nf * exp;
  }

  function monotonePath(pts) {
    var n = pts.length;
    if (!n) return "";
    if (n === 1) return "M" + pts[0][0] + " " + pts[0][1];
    var dx = [], m = [], tan = [];
    var i;
    for (i = 0; i < n - 1; i += 1) {
      dx[i] = pts[i + 1][0] - pts[i][0];
      m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i];
    }
    tan[0] = m[0];
    tan[n - 1] = m[n - 2];
    for (i = 1; i < n - 1; i += 1) {
      if (m[i - 1] * m[i] <= 0) tan[i] = 0;
      else tan[i] = 3 * (dx[i - 1] + dx[i]) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
    }
    var d = "M" + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
    for (i = 0; i < n - 1; i += 1) {
      var c1x = pts[i][0] + dx[i] / 3, c1y = pts[i][1] + tan[i] * dx[i] / 3;
      var c2x = pts[i + 1][0] - dx[i] / 3, c2y = pts[i + 1][1] - tan[i + 1] * dx[i] / 3;
      d += " C" + c1x.toFixed(1) + " " + c1y.toFixed(1) + " " + c2x.toFixed(1) + " " + c2y.toFixed(1) + " " + pts[i + 1][0].toFixed(1) + " " + pts[i + 1][1].toFixed(1);
    }
    return d;
  }

  function renderLegend(el, series, hidden, onToggle) {
    el.innerHTML = series.map(function (s) {
      return '<button type="button" class="legend-item' + (hidden[s.key] ? " off" : "") + '" data-key="' + s.key + '">' +
        '<span class="swatch" style="background:' + s.color + '"></span>' + esc(s.label) + "</button>";
    }).join("");
    el.querySelectorAll(".legend-item").forEach(function (btn) {
      btn.addEventListener("click", function () { onToggle(btn.getAttribute("data-key")); });
    });
  }

  function seriesChart(el, cfg) {
    var labels = cfg.labels;
    var series = cfg.series.filter(function (s) { return !(cfg.hidden || {})[s.key]; });
    var n = labels.length;
    var w = Math.max(280, el.clientWidth || 800);
    var h = Math.max(160, el.clientHeight || 300);
    var hasData = series.some(function (s) { return s.values.some(function (v) { return v !== 0; }); });
    if (!n || !series.length || !hasData) {
      el.innerHTML = '<div class="chart-empty">' + esc(t("noChartData")) + "</div>";
      return;
    }
    var pad = { l: 58, r: 12, t: 12, b: 28 };
    var plotW = w - pad.l - pad.r;
    var plotH = h - pad.t - pad.b;
    var maxV = 0, minV = 0;
    series.forEach(function (s) { s.values.forEach(function (v) { maxV = Math.max(maxV, v); minV = Math.min(minV, v); }); });
    var top = niceMax(maxV);
    var bottom = minV < 0 ? -niceMax(-minV) : 0;
    var span = top - bottom || 1;
    function y(v) { return pad.t + plotH - ((v - bottom) / span) * plotH; }
    var band = plotW / n;
    function cx(i) { return pad.l + band * (i + 0.5); }
    var uid = el.id || ("c" + Math.random().toString(36).slice(2));

    var svg = '<svg class="' + (cfg.animate === false ? "static" : "") + '" viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '">';
    svg += "<defs>";
    series.forEach(function (s) {
      svg += '<linearGradient id="g-' + uid + "-" + s.key + '" x1="0" x2="0" y1="0" y2="1">' +
        '<stop offset="0%" stop-color="' + s.color + '" stop-opacity=".32"/>' +
        '<stop offset="100%" stop-color="' + s.color + '" stop-opacity="0"/></linearGradient>';
    });
    svg += "</defs>";

    var ticks = 4;
    for (var ti = 0; ti <= ticks; ti += 1) {
      var val = bottom + (span / ticks) * ti;
      var gy = y(val);
      svg += '<line class="grid-line" x1="' + pad.l + '" x2="' + (w - pad.r) + '" y1="' + gy.toFixed(1) + '" y2="' + gy.toFixed(1) + '"/>';
      svg += '<text class="axis-text" x="' + (pad.l - 10) + '" y="' + (gy + 4).toFixed(1) + '" text-anchor="end">' + esc(moneyCompact(val)) + "</text>";
    }
    var every = n > 8 && w < 620 ? 2 : 1;
    labels.forEach(function (lb, i) {
      if (i % every) return;
      svg += '<text class="axis-text" x="' + cx(i).toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle">' + esc(lb) + "</text>";
    });

    if (cfg.type === "bar") {
      var groupW = Math.min(band * 0.7, 26 * series.length + 8);
      var gap = series.length > 1 ? 4 : 0;
      var bw = (groupW - gap * (series.length - 1)) / series.length;
      for (var bi = 0; bi < n; bi += 1) {
        svg += '<g class="bar-col" data-i="' + bi + '">';
        series.forEach(function (s, si) {
          var v = s.values[bi];
          var x0 = cx(bi) - groupW / 2 + si * (bw + gap);
          var y1 = y(Math.max(v, 0)), y2 = y(Math.min(v, 0));
          var bh = Math.max(v === 0 ? 0 : 2, y2 - y1);
          svg += '<rect class="bar" style="animation-delay:' + (bi * 30) + 'ms" x="' + x0.toFixed(1) + '" y="' + (y2 - bh).toFixed(1) + '" width="' + Math.max(2, bw).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="' + Math.min(5, bw / 3).toFixed(1) + '" fill="' + s.color + '"/>';
        });
        svg += "</g>";
      }
    } else {
      var y0 = y(Math.max(0, bottom));
      series.forEach(function (s) {
        var pts = s.values.map(function (v, i) { return [cx(i), y(v)]; });
        var line = monotonePath(pts);
        var len = 0;
        for (var pi = 1; pi < pts.length; pi += 1) len += Math.hypot(pts[pi][0] - pts[pi - 1][0], pts[pi][1] - pts[pi - 1][1]);
        var area = line + " L" + pts[pts.length - 1][0].toFixed(1) + " " + y0.toFixed(1) + " L" + pts[0][0].toFixed(1) + " " + y0.toFixed(1) + " Z";
        svg += '<path class="series-area" d="' + area + '" fill="url(#g-' + uid + "-" + s.key + ')"/>';
        svg += '<path class="series-line" style="--len:' + Math.ceil(len * 1.2 + 10) + '" d="' + line + '" stroke="' + s.color + '"/>';
      });
      svg += '<line class="guide" x1="0" x2="0" y1="' + pad.t + '" y2="' + (pad.t + plotH) + '"/>';
      series.forEach(function (s) {
        svg += '<circle class="dot" data-key="' + s.key + '" r="0" cx="0" cy="0" fill="' + s.color + '" stroke="var(--surface)" stroke-width="2.5"/>';
      });
    }
    svg += "</svg>";
    el.innerHTML = svg + '<div class="chart-tip"></div>';

    var svgEl = el.querySelector("svg");
    var tip = el.querySelector(".chart-tip");
    var guide = el.querySelector(".guide");
    function hover(i) {
      if (cfg.type === "bar") {
        el.querySelectorAll(".bar-col").forEach(function (g) { g.classList.toggle("dim", Number(g.getAttribute("data-i")) !== i); });
      } else {
        guide.setAttribute("x1", cx(i)); guide.setAttribute("x2", cx(i)); guide.classList.add("show");
        series.forEach(function (s) {
          var dot = el.querySelector('.dot[data-key="' + s.key + '"]');
          dot.setAttribute("cx", cx(i)); dot.setAttribute("cy", y(s.values[i])); dot.setAttribute("r", 5);
        });
      }
      var rows = series.map(function (s) {
        return '<div class="chart-tip-row"><span><i class="swatch" style="background:' + s.color + '"></i>' + esc(s.label) + "</span><strong>" + esc(money(s.values[i])) + "</strong></div>";
      }).join("");
      if (cfg.extraRows) rows += cfg.extraRows(i);
      tip.innerHTML = '<div class="chart-tip-title">' + esc(cfg.tipTitles ? cfg.tipTitles[i] : labels[i]) + "</div>" + rows;
      tip.classList.add("show");
      var tw = tip.offsetWidth;
      var left = cx(i) + 16;
      if (left + tw > w) left = cx(i) - tw - 16;
      tip.style.left = Math.max(0, left) + "px";
      tip.style.top = pad.t + "px";
    }
    function leave() {
      tip.classList.remove("show");
      if (guide) guide.classList.remove("show");
      el.querySelectorAll(".dot").forEach(function (d) { d.setAttribute("r", 0); });
      el.querySelectorAll(".bar-col").forEach(function (g) { g.classList.remove("dim"); });
    }
    svgEl.addEventListener("pointermove", function (e) {
      var rect = svgEl.getBoundingClientRect();
      var x = (e.clientX - rect.left) * (w / rect.width);
      var i = Math.floor((x - pad.l) / band);
      if (i < 0 || i >= n) { leave(); return; }
      hover(i);
    });
    svgEl.addEventListener("pointerleave", leave);
  }

  function sparkline(svgEl, values, color, kind) {
    var W = 100, H = 40;
    var max = Math.max.apply(null, values.concat([0]));
    var min = Math.min.apply(null, values.concat([0]));
    var span = (max - min) || 1;
    var out = "";
    if (!values.length || max === min) { svgEl.innerHTML = ""; return; }
    svgEl.setAttribute("viewBox", "0 0 " + W + " " + H);
    if (kind === "bars") {
      var bw = W / values.length;
      values.forEach(function (v, i) {
        var bh = Math.max(1.5, ((v - min) / span) * (H - 8));
        var last = i === values.length - 1;
        out += '<rect x="' + (i * bw + bw * 0.2).toFixed(2) + '" y="' + (H - bh).toFixed(2) + '" width="' + (bw * 0.6).toFixed(2) + '" height="' + bh.toFixed(2) + '" rx="1" fill="' + color + '" opacity="' + (last ? 0.35 : 0.15) + '"/>';
      });
    } else {
      var pts = values.map(function (v, i) {
        return [(i / (values.length - 1)) * W, H - 4 - ((v - min) / span) * (H - 10)];
      });
      var line = monotonePath(pts);
      var gid = "sp-" + svgEl.id;
      out += '<defs><linearGradient id="' + gid + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="' + color + '" stop-opacity=".25"/><stop offset="100%" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>';
      out += '<path d="' + line + " L" + W + " " + H + " L0 " + H + ' Z" fill="url(#' + gid + ')"/>';
      out += '<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="2" vector-effect="non-scaling-stroke" opacity=".8"/>';
    }
    svgEl.innerHTML = out;
  }

  function ringSvg(ratio, color, size, stroke, centerText) {
    var r = (size - stroke) / 2;
    var c = 2 * Math.PI * r;
    var p = Math.max(0, Math.min(1, ratio || 0));
    return '<svg viewBox="0 0 ' + size + " " + size + '" width="100%" height="100%">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--surface-3)" stroke-width="' + stroke + '"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + stroke + '" stroke-linecap="round" ' +
      'stroke-dasharray="' + (c * p).toFixed(2) + " " + c.toFixed(2) + '" transform="rotate(-90 ' + size / 2 + " " + size / 2 + ')"/>' +
      (centerText ? '<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" class="donut-center-value" style="font-size:' + (size / 4.2) + 'px">' + esc(centerText) + "</text>" : "") +
      "</svg>";
  }

  function donutSvg(parts, centerValue, centerLabel) {
    var size = 150, stroke = 22, r = (size - stroke) / 2, c = 2 * Math.PI * r;
    var total = parts.reduce(function (a, p) { return a + Math.max(0, p.value); }, 0) || 1;
    var offset = 0;
    var circles = parts.map(function (p) {
      var len = (Math.max(0, p.value) / total) * c;
      var seg = '<circle cx="75" cy="75" r="' + r + '" fill="none" stroke="' + p.color + '" stroke-width="' + stroke + '" ' +
        'stroke-dasharray="' + Math.max(0, len - 1.5).toFixed(2) + " " + c.toFixed(2) + '" stroke-dashoffset="' + (-offset).toFixed(2) + '" transform="rotate(-90 75 75)"/>';
      offset += len;
      return seg;
    }).join("");
    return '<svg class="donut" viewBox="0 0 150 150"><circle cx="75" cy="75" r="' + r + '" fill="none" stroke="var(--surface-3)" stroke-width="' + stroke + '"/>' + circles +
      '<text x="75" y="72" text-anchor="middle" class="donut-center-value">' + esc(centerValue) + "</text>" +
      '<text x="75" y="90" text-anchor="middle" class="donut-center-label">' + esc(centerLabel) + "</text></svg>";
  }

  /* =========================================================
     Rendering — Overview
     ========================================================= */
  function statusPill(d) {
    if (d.canceled) return '<span class="pill pill--canceled">' + esc(t("canceled")) + "</span>";
    if (d.paid === 1) return '<span class="pill pill--paid">' + esc(t("paid")) + "</span>";
    if (d.paid === 2) return '<span class="pill pill--partly">' + esc(t("partly")) + "</span>";
    if (RECEIVABLE_TYPES[d.type]) return '<span class="pill pill--unpaid">' + esc(t("unpaid")) + "</span>";
    return '<span class="pill pill--neutral">' + esc(docTypeLabel(d.type)) + "</span>";
  }

  function renderOverview(animate) {
    var data = state.data;
    if (!data) return;
    var trend = data.trend.slice(-state.range);
    var revenueSum = trend.reduce(function (a, m) { return a + m.revenue; }, 0);
    var expenseSum = trend.reduce(function (a, m) { return a + m.expense; }, 0);
    var cur = data.trend[data.trend.length - 1];
    var prev = data.trend[data.trend.length - 2];

    setText("kpiRevenue", money(revenueSum, 0));
    setText("kpiRevenueSub", t("revenueSub", { n: state.range, v: money(data.allTime, 0) }));
    sparkline(qs("kpiRevenueSpark"), trend.map(function (m) { return m.revenue; }), COLORS.revenue, "area");

    var growth = prev.revenue > 0 ? ((cur.revenue - prev.revenue) / prev.revenue) * 100 : null;
    var gEl = qs("kpiGrowth");
    gEl.textContent = growth == null ? "—" : (growth >= 0 ? "▲ " : "▼ ") + fmtPct(Math.abs(growth)).replace("+", "");
    gEl.classList.toggle("up", growth != null && growth >= 0);
    gEl.classList.toggle("down", growth != null && growth < 0);
    setText("kpiGrowthSub", growth == null
      ? t("growthNoPrev", { a: money(cur.revenue, 0) })
      : t("growthSub", { a: money(cur.revenue, 0), b: money(prev.revenue, 0) }));
    sparkline(qs("kpiGrowthSpark"), data.trend.slice(-6).map(function (m) { return m.revenue; }), COLORS.primary, "bars");

    setText("kpiOutstanding", money(data.outstanding, 0));
    setText("kpiOutstandingSub", t("outstandingSub", { n: data.unpaidCount, v: money(data.overdue, 0) }));
    qs("kpiOutstandingBar").innerHTML = data.outstanding > 0
      ? data.buckets.map(function (b) {
        return '<span title="' + esc(t("bucket" + b.idx)) + '" style="width:' + (b.amount / data.outstanding * 100).toFixed(2) + "%;background:" + COLORS.aging[b.idx] + '"></span>';
      }).join("")
      : "";

    setText("kpiClients", fmtNum(data.customerTotal));
    setText("kpiClientsSub", t("clientsSub", { n: data.active90 }));
    var ratio = data.customerTotal ? data.active90 / data.customerTotal : 0;
    qs("kpiClientsRing").innerHTML = ringSvg(ratio, COLORS.cashIn, 56, 7, Math.round(ratio * 100) + "%");

    // Trend chart
    var series = [
      { key: "revenue", label: t("revenue"), color: COLORS.revenue, values: trend.map(function (m) { return m.revenue; }) },
      { key: "expense", label: t("expenses"), color: COLORS.expense, values: trend.map(function (m) { return m.expense; }) }
    ];
    renderLegend(qs("trendLegend"), series, state.trendHidden, function (key) {
      state.trendHidden[key] = !state.trendHidden[key];
      renderOverview(true);
    });
    seriesChart(qs("trendChart"), {
      labels: trend.map(function (m) { return monthLabel(m.key); }),
      tipTitles: trend.map(function (m) { return monthLabel(m.key, true); }),
      series: series,
      hidden: state.trendHidden,
      type: state.chartType,
      animate: animate,
      extraRows: function (i) {
        var net = trend[i].revenue - trend[i].expense;
        return '<div class="chart-tip-row total"><span>' + esc(t("net")) + "</span><strong style=\"color:" + (net >= 0 ? COLORS.revenue : COLORS.expense) + '">' + esc(money(net)) + "</strong></div>";
      }
    });

    var net = revenueSum - expenseSum;
    setText("statNet", money(net, 0));
    qs("statNet").style.color = net < 0 ? "var(--danger)" : "";
    setText("statMargin", revenueSum > 0 ? (net / revenueSum * 100).toFixed(1) + "%" : "—");
    setText("statAvgInvoice", data.avgInvoice ? money(data.avgInvoice, 0) : "—");
    var best = trend.reduce(function (a, m) { return m.revenue > (a ? a.revenue : 0) ? m : a; }, null);
    setText("statBestMonth", best ? monthLabel(best.key) + " · " + moneyCompact(best.revenue) : "—");

    // Recent documents
    setText("recentDocsSub", t("recentDocsSub", { n: fmtNum(data.docsAnalysed) }));
    qs("recentDocsBody").innerHTML = data.recent.length
      ? data.recent.map(function (d) {
        var label = esc(docTypeLabel(d.type)) + " #" + esc(d.number);
        var doc = d.pdf ? '<a class="doc-link" href="' + esc(d.pdf) + '" target="_blank" rel="noopener noreferrer">' + label + "</a>" : '<span class="cell-main">' + label + "</span>";
        return "<tr><td>" + doc + "</td>" +
          '<td><div class="cell-main">' + esc(d.name || "—") + "</div>" + (d.company && d.company !== d.name ? '<div class="cell-sub">' + esc(d.company) + "</div>" : "") + "</td>" +
          "<td>" + esc(fmtDate(d.date)) + "</td>" +
          '<td class="num cell-main">' + esc(money(d.amount)) + "</td>" +
          "<td>" + statusPill(d) + "</td></tr>";
      }).join("")
      : '<tr class="empty-row"><td colspan="5">' + esc(t("noDocs")) + "</td></tr>";

    renderPerf();
  }

  function renderPerf() {
    var perf = state.perf.slice();
    var calls = perf.length;
    var rows = perf.reduce(function (a, p) { return a + p.rows; }, 0);
    var avg = calls ? perf.reduce(function (a, p) { return a + p.ms; }, 0) / calls : 0;
    setText("apiPerfSub", t("apiPerfSub", { calls: calls, rows: fmtNum(rows), ms: fmtNum(state.wall) }));
    setText("apiPerfBadge", t("avgMs", { ms: fmtNum(avg) }));
    setText("apiSpeedText", t("apiSpeed", { calls: calls, ms: fmtNum(state.wall) }));

    var grouped = {};
    perf.forEach(function (p) {
      var g = grouped[p.route] || (grouped[p.route] = { route: p.route, calls: 0, ms: 0, max: 0, rows: 0, ok: true });
      g.calls += 1; g.ms += p.ms; g.max = Math.max(g.max, p.ms); g.rows += p.rows; g.ok = g.ok && p.ok;
    });
    var list = Object.keys(grouped).map(function (k) { return grouped[k]; }).sort(function (a, b) { return b.max - a.max; });
    var top = list.reduce(function (a, g) { return Math.max(a, g.max); }, 1);
    qs("apiPerfList").innerHTML = list.map(function (g) {
      var cls = !g.ok ? "err" : (g.max > 1500 ? "slow" : "");
      return '<li class="perf-item">' +
        '<span class="perf-route">' + esc(g.route) + " <small>×" + g.calls + (g.rows ? " · " + esc(t("rowsN", { n: g.rows })) : "") + "</small></span>" +
        '<span class="perf-track"><span class="perf-fill ' + cls + '" style="width:' + Math.max(4, g.max / top * 100).toFixed(1) + '%"></span></span>' +
        '<span class="perf-ms">' + fmtNum(g.max) + " ms</span></li>";
    }).join("");
  }

  /* =========================================================
     Rendering — Cash flow
     ========================================================= */
  function selectableClients() {
    return (state.data ? state.data.clients : []).filter(function (c) { return !!c.custId; });
  }

  function syncSelection() {
    selectableClients().forEach(function (c) {
      if (!state.selectionSeen[c.key]) {
        state.selectionSeen[c.key] = true;
        state.selected[c.key] = c.maxDays > 0;
      }
    });
  }

  function selectedClients() {
    return selectableClients().filter(function (c) { return state.selected[c.key]; });
  }

  function renderCashflow(animate) {
    var data = state.data;
    if (!data) return;
    syncSelection();

    setText("cfOutstanding", money(data.outstanding, 0));
    setText("cfOutstandingSub", t("invoicesN", { n: data.unpaidCount }) + " · " + t("clientsN", { n: data.clients.length }));
    setText("cfOverdue", money(data.overdue, 0));
    setText("cfOverdueSub", t("invoicesN", { n: data.overdueCount }));
    setText("cfAvgDays", data.overdue > 0 ? fmtNum(data.avgDaysOverdue, 0) : "—");
    setText("cfCollected", money(data.collectedMonth, 0));
    setText("cfCollectedSub", t("receiptsN", { n: data.collectedCount }));

    var total = data.outstanding || 1;
    qs("agingBar").innerHTML = data.buckets.map(function (b) {
      if (!b.amount) return "";
      var dim = state.bucket != null && state.bucket !== b.idx;
      return '<span class="aging-seg" title="' + esc(t("bucket" + b.idx) + " · " + money(b.amount)) + '" style="width:' + (b.amount / total * 100).toFixed(2) + "%;background:" + COLORS.aging[b.idx] + ";opacity:" + (dim ? 0.3 : 1) + '"></span>';
    }).join("");
    qs("agingBuckets").innerHTML = data.buckets.map(function (b) {
      var pct = data.outstanding ? (b.amount / data.outstanding * 100) : 0;
      return '<button type="button" class="bucket' + (state.bucket === b.idx ? " active" : "") + '" data-bucket="' + b.idx + '" style="--c:' + COLORS.aging[b.idx] + '">' +
        '<span class="bucket-top"><span class="swatch"></span>' + esc(t("bucket" + b.idx)) + "</span>" +
        '<span class="bucket-amount">' + esc(money(b.amount, 0)) + "</span>" +
        '<span class="bucket-meta"><span>' + esc(t("invoicesN", { n: b.count })) + "</span><span>" + pct.toFixed(0) + "%</span></span></button>";
    }).join("");
    qs("agingBuckets").querySelectorAll(".bucket").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = Number(btn.getAttribute("data-bucket"));
        state.bucket = state.bucket === idx ? null : idx;
        renderCashflow(false);
      });
    });

    var clearBtn = qs("clearBucketBtn");
    clearBtn.classList.toggle("hidden", state.bucket == null);
    if (state.bucket != null) clearBtn.textContent = t("filteredBy", { b: t("bucket" + state.bucket) });

    renderOverdueTable();
    renderWaPanel();

    var months = data.trend.slice(-6);
    var cashSeries = [
      { key: "cashIn", label: t("cashIn"), color: COLORS.cashIn, values: months.map(function (m) { return m.cashIn; }) },
      { key: "cashOut", label: t("cashOut"), color: COLORS.expense, values: months.map(function (m) { return m.expense; }) }
    ];
    renderLegend(qs("cashLegend"), cashSeries, state.cashHidden, function (key) {
      state.cashHidden[key] = !state.cashHidden[key];
      renderCashflow(true);
    });
    seriesChart(qs("cashChart"), {
      labels: months.map(function (m) { return monthLabel(m.key); }),
      tipTitles: months.map(function (m) { return monthLabel(m.key, true); }),
      series: cashSeries,
      hidden: state.cashHidden,
      type: "bar",
      animate: animate,
      extraRows: function (i) {
        var net = months[i].cashIn - months[i].expense;
        return '<div class="chart-tip-row total"><span>' + esc(t("net")) + "</span><strong>" + esc(money(net)) + "</strong></div>";
      }
    });
  }

  function renderOverdueTable() {
    var data = state.data;
    var rows = data.clients.filter(function (c) { return state.bucket == null || c.invoices.some(function (inv) { return bucketOf(inv.days) === state.bucket; }); });
    setText("overdueClientsSub", t("overdueClientsSub", { n: data.clients.length }));

    qs("overdueBody").innerHTML = rows.length
      ? rows.map(function (c) {
        var disabled = !c.custId;
        var res = state.waResults[c.key];
        var reminder = res
          ? '<span class="pill ' + (res.ok ? "pill--sent" : "pill--failed") + '" title="' + esc(res.msg || "") + '">' + esc(res.ok ? t("waSent") : t("waFailed")) + "</span>"
          : '<span class="cell-sub">—</span>';
        var numbers = c.invoices.map(invoiceLabel).join(", ");
        var typeCounts = {};
        c.invoices.forEach(function (i) { typeCounts[i.type] = (typeCounts[i.type] || 0) + 1; });
        var typeSummary = Object.keys(typeCounts).map(function (k) { return typeCounts[k] + "× " + docTypeLabel(k); }).join(", ");
        return "<tr>" +
          '<td class="col-check"><input type="checkbox" class="client-check" data-key="' + esc(c.key) + '"' + (state.selected[c.key] ? " checked" : "") + (disabled ? " disabled" : "") + "></td>" +
          '<td><div class="cell-main">' + esc(c.name || "—") + "</div><div class=\"cell-sub\">" +
          esc(disabled ? t("noLinkedClient") : [c.company !== c.name ? c.company : "", c.phone].filter(Boolean).join(" · ")) + "</div></td>" +
          '<td class="num" title="' + esc(numbers) + '"><div class="cell-main">' + c.invoices.length + '</div><div class="cell-sub cell-clip">' + esc(typeSummary) + "</div></td>" +
          '<td class="num">' + esc(c.maxDays > 0 ? t("daysN", { n: c.maxDays }) : t("notDue")) + "</td>" +
          '<td><span class="pill age-pill" style="background:' + COLORS.aging[c.bucket] + '">' + esc(t("bucket" + c.bucket)) + "</span></td>" +
          '<td class="num cell-main">' + esc(money(c.amount)) + "</td>" +
          "<td>" + reminder + "</td></tr>";
      }).join("")
      : '<tr class="empty-row"><td colspan="7">' + esc(t("noOpen")) + "</td></tr>";

    qs("overdueBody").querySelectorAll(".client-check").forEach(function (cb) {
      cb.addEventListener("change", function () {
        state.selected[cb.getAttribute("data-key")] = cb.checked;
        updateSelectAll();
        renderWaPanel();
      });
    });
    updateSelectAll();
  }

  function bucketOf(days) { return days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4; }

  function updateSelectAll() {
    var all = selectableClients();
    var sel = all.filter(function (c) { return state.selected[c.key]; });
    var box = qs("selectAllClients");
    box.checked = all.length > 0 && sel.length === all.length;
    box.indeterminate = sel.length > 0 && sel.length < all.length;
    box.disabled = !all.length || state.waSending;
  }

  function waTemplate() {
    var saved = localStorage.getItem(K.waTemplate + state.lang);
    return saved || t("waDefault");
  }

  function invoiceLabel(i) {
    return (i.type ? docTypeLabel(i.type) + " " : "") + "#" + i.number;
  }

  function fillTemplate(tpl, c) {
    var invoices = c.invoices.map(function (i) { return invoiceLabel(i) + " (" + money(i.amount) + ")"; }).join(", ");
    var vars = {
      name: c.name || t("sampleClient"),
      count: String(c.invoices.length),
      amount: money(c.amount),
      days: String(Math.max(0, c.maxDays)),
      invoices: invoices
    };
    return tpl.replace(/\{(name|count|amount|days|invoices)\}/g, function (m, k) { return vars[k]; });
  }

  function renderWaPanel() {
    var sel = selectedClients();
    var sum = sel.reduce(function (a, c) { return a + c.amount; }, 0);
    setText("waSelectedText", t("waSelected", { n: sel.length, v: money(sum, 0) }));
    var ta = qs("waTemplate");
    if (document.activeElement !== ta) ta.value = waTemplate();
    var sample = sel[0] || selectableClients()[0] || { name: t("sampleClient"), invoices: [{ number: "1001", amount: 1250, days: 14, type: "invoice" }], amount: 1250, maxDays: 14 };
    qs("waPreview").textContent = fillTemplate(ta.value || waTemplate(), sample);
    qs("waReminderBtn").disabled = state.waSending || !sel.length;
  }

  /* =========================================================
     WhatsApp reminders
     ========================================================= */
  function confirmModal(title, body) {
    return new Promise(function (resolve) {
      var modal = qs("modal");
      setText("modalTitle", title);
      setText("modalBody", body);
      modal.classList.remove("hidden");
      qs("modalConfirm").focus();
      function done(v) {
        modal.classList.add("hidden");
        qs("modalConfirm").removeEventListener("click", yes);
        qs("modalCancel").removeEventListener("click", no);
        modal.removeEventListener("click", backdrop);
        document.removeEventListener("keydown", key);
        resolve(v);
      }
      function yes() { done(true); }
      function no() { done(false); }
      function backdrop(e) { if (e.target === modal) done(false); }
      function key(e) { if (e.key === "Escape") done(false); }
      qs("modalConfirm").addEventListener("click", yes);
      qs("modalCancel").addEventListener("click", no);
      modal.addEventListener("click", backdrop);
      document.addEventListener("keydown", key);
    });
  }

  async function sendWhatsAppReminders() {
    var status = qs("waStatus");
    status.className = "wa-status";
    if (!state.data || !selectableClients().length) { status.textContent = t("waNoClients"); return; }
    var targets = selectedClients();
    if (!targets.length) { status.textContent = t("waNoneSelected"); return; }

    var sum = targets.reduce(function (a, c) { return a + c.amount; }, 0);
    var ok = await confirmModal(t("waConfirmTitle"), t("waConfirmBody", { n: targets.length, v: money(sum, 0) }));
    if (!ok) return;

    var tpl = qs("waTemplate").value.trim() || t("waDefault");
    var btn = qs("waReminderBtn");
    var bar = qs("waProgress");
    var fill = qs("waProgressFill");
    state.waSending = true;
    btn.disabled = true;
    bar.classList.remove("hidden");
    fill.style.width = "0%";
    var sent = 0;
    var lastError = "";

    for (var i = 0; i < targets.length; i += 1) {
      var c = targets[i];
      status.textContent = t("waSending", { i: i + 1, n: targets.length });
      try {
        var res = await postRoute("Chat.SendCustomer", {
          customer_id: c.custId,
          message: fillTemplate(tpl, c),
          from: "send_whatsapp"
        }, { track: false });
        var good = res && (Number(res.success) === 1 || res.success === true);
        state.waResults[c.key] = { ok: good, msg: res && res.message ? String(res.message) : "" };
        if (good) sent += 1; else lastError = (res && res.message) || "";
      } catch (err) {
        if (err && err.status === 401) { state.waSending = false; return; }
        state.waResults[c.key] = { ok: false, msg: err && err.message };
        lastError = (err && err.message) || "";
      }
      fill.style.width = ((i + 1) / targets.length * 100).toFixed(0) + "%";
      renderOverdueTable();
    }

    state.waSending = false;
    setTimeout(function () { bar.classList.add("hidden"); }, 1200);
    if (sent) {
      status.className = "wa-status ok";
      status.textContent = t("waDone", { ok: sent, n: targets.length });
      toast(t("waDone", { ok: sent, n: targets.length }));
    } else {
      status.className = "wa-status err";
      status.textContent = t("waAllFailed", { m: lastError });
    }
    renderWaPanel();
    updateSelectAll();
  }

  /* =========================================================
     Rendering — Products
     ========================================================= */
  function buildRanking() {
    var data = state.data;
    var byId = {}, byName = {};
    data.catalog.forEach(function (c) {
      if (c.id) byId[c.id] = c;
      byName[c.name.toLowerCase()] = byName[c.name.toLowerCase()] || c;
    });
    var map = {};
    var docs = {};
    var lineCount = 0;
    data.lines.forEach(function (l) {
      if (state.source === "invoiced" && l.group !== "invoiced") return;
      if (state.source === "quotes" && l.group !== "quotes") return;
      var cat = (l.pid && byId[l.pid]) || byName[l.name.toLowerCase()] || null;
      var key = cat ? "cat:" + (cat.id || cat.name) : "name:" + l.name.toLowerCase();
      var e = map[key] || (map[key] = { key: key, name: cat ? cat.name : l.name, qty: 0, revenue: 0, docs: {}, catalog: cat });
      e.qty += l.qty;
      e.revenue += l.revenue;
      e.docs[l.docId] = 1;
      docs[l.docId] = 1;
      lineCount += 1;
    });
    var list = Object.keys(map).map(function (k) {
      var e = map[k];
      e.docCount = Object.keys(e.docs).length;
      e.avgPrice = e.qty ? e.revenue / e.qty : 0;
      return e;
    });
    var metric = state.metric;
    list.sort(function (a, b) { return (b[metric] - a[metric]) || (b.revenue - a.revenue); });
    list.forEach(function (e, i) { e.rank = i + 1; });
    var total = list.reduce(function (a, e) { return a + Math.max(0, e[metric]); }, 0);
    return { list: list, total: total, docCount: Object.keys(docs).length, lineCount: lineCount };
  }

  function metricFmt(v) { return state.metric === "qty" ? fmtNum(v, 2) : money(v, 0); }

  function renderProducts() {
    var data = state.data;
    if (!data) return;
    var r = buildRanking();
    var list = r.list;
    var metric = state.metric;

    setText("rankSub", t("rankSub", { p: list.length, l: r.lineCount, d: r.docCount }));

    var podium = list.slice(0, 3);
    qs("podium").innerHTML = podium.length
      ? podium.map(function (e) {
        var share = r.total ? Math.max(0, e[metric]) / r.total * 100 : 0;
        return '<article class="podium-card r' + e.rank + '" data-rank="' + e.rank + '">' +
          '<span class="medal">' + e.rank + "</span>" +
          '<div class="podium-name" title="' + esc(e.name) + '">' + esc(e.name) +
          (e.catalog ? '<span class="badge badge--catalog">' + esc(t("inCatalog")) + "</span>" : "") + "</div>" +
          '<div class="podium-value">' + esc(metricFmt(e[metric])) + "</div>" +
          '<div class="podium-meta"><span>' + esc(metric === "qty" ? money(e.revenue, 0) : t("unitsN", { n: fmtNum(e.qty, 2) })) + "</span>" +
          "<span>" + esc(t("docsN", { n: e.docCount })) + "</span><span>" + share.toFixed(1) + "%</span></div></article>";
      }).join("")
      : '<div class="podium-empty">' + esc(t("noProducts")) + "</div>";

    var q = state.search.trim().toLowerCase();
    var shown = q ? list.filter(function (e) { return e.name.toLowerCase().indexOf(q) !== -1; }) : list;
    var maxShare = list.length ? Math.max(0, list[0][metric]) : 1;
    qs("rankBody").innerHTML = shown.length
      ? shown.slice(0, 50).map(function (e) {
        var share = r.total ? Math.max(0, e[metric]) / r.total * 100 : 0;
        var bar = maxShare ? Math.max(0, e[metric]) / maxShare * 100 : 0;
        return "<tr>" +
          '<td><span class="rank-no' + (e.rank <= 3 ? " top" : "") + '">' + e.rank + "</span></td>" +
          '<td><span class="cell-main">' + esc(e.name) + "</span>" +
          (e.catalog ? '<span class="badge badge--catalog">' + esc(t("inCatalog")) + "</span>" : '<span class="badge badge--adhoc">' + esc(t("adhoc")) + "</span>") + "</td>" +
          '<td class="num">' + esc(fmtNum(e.qty, 2)) + "</td>" +
          '<td class="num cell-main">' + esc(money(e.revenue)) + "</td>" +
          '<td><div class="share-cell"><span class="share-track"><span class="share-fill" style="display:block;width:' + bar.toFixed(1) + '%"></span></span><span class="share-pct">' + share.toFixed(1) + "%</span></div></td>" +
          '<td class="num">' + e.docCount + "</td>" +
          '<td class="num">' + esc(money(e.avgPrice)) + "</td>" +
          '<td class="num col-catalog">' + (e.catalog && e.catalog.price ? esc(money(e.catalog.price)) : '<span class="cell-sub">—</span>') + "</td></tr>";
      }).join("")
      : '<tr class="empty-row"><td colspan="8">' + esc(list.length ? t("noMatch") : t("noProducts")) + "</td></tr>";

    // Donut
    setText("shareTitle", metric === "qty" ? t("shareTitleQty") : t("shareTitle"));
    var top5 = list.slice(0, 5);
    var rest = list.slice(5).reduce(function (a, e) { return a + Math.max(0, e[metric]); }, 0);
    var parts = top5.map(function (e, i) { return { name: e.name, value: Math.max(0, e[metric]), color: COLORS.donut[i] }; });
    if (rest > 0) parts.push({ name: t("others"), value: rest, color: COLORS.donut[5] });
    var top5Share = r.total ? top5.reduce(function (a, e) { return a + Math.max(0, e[metric]); }, 0) / r.total * 100 : 0;
    qs("shareDonut").innerHTML = parts.length
      ? donutSvg(parts, top5Share.toFixed(0) + "%", t("top5")) +
        '<ul class="donut-legend">' + parts.map(function (p) {
          return '<li><span class="swatch" style="background:' + p.color + '"></span><span class="name" title="' + esc(p.name) + '">' + esc(p.name) + '</span><span class="pct">' + (r.total ? (p.value / r.total * 100).toFixed(1) : "0") + "%</span></li>";
        }).join("") + "</ul>"
      : '<div class="chart-empty" style="height:150px">' + esc(t("noProducts")) + "</div>";

    // Coverage
    var catalog = data.catalog;
    qs("rankTable").classList.toggle("no-catalog", !catalog.length);
    qs("unsoldTitle").classList.toggle("hidden", !catalog.length);
    if (!catalog.length) {
      qs("coverage").innerHTML = '<p class="muted">' + esc(t("catalogEmpty")) + "</p>";
      qs("unsoldList").innerHTML = "";
    } else {
      var soldKeys = {};
      list.forEach(function (e) { if (e.catalog) soldKeys[e.catalog.id || e.catalog.name] = 1; });
      var sold = catalog.filter(function (c) { return soldKeys[c.id || c.name]; }).length;
      var ratio = sold / catalog.length;
      qs("coverage").innerHTML = '<div class="coverage-ring">' + ringSvg(ratio, COLORS.revenue, 76, 9, Math.round(ratio * 100) + "%") + "</div>" +
        '<div class="coverage-text"><strong>' + sold + " / " + catalog.length + "</strong><span>" + esc(t("coverageText", { a: sold, b: catalog.length })) + "</span></div>";
      var unsold = catalog.filter(function (c) { return !soldKeys[c.id || c.name]; });
      qs("unsoldList").innerHTML = unsold.length
        ? unsold.slice(0, 30).map(function (c) { return "<li>" + esc(c.name) + "</li>"; }).join("") + (unsold.length > 30 ? '<li class="muted-item">+' + (unsold.length - 30) + "</li>" : "")
        : '<li class="muted-item">' + esc(t("allSold")) + "</li>";
    }
  }

  /* =========================================================
     Shell rendering
     ========================================================= */
  function renderUser() {
    var raw = {};
    try { raw = JSON.parse(localStorage.getItem(K.user) || "{}"); } catch (e) { raw = {}; }
    var d = raw.data || raw;
    var u = d.user || {};
    var org = d.org || {};
    var name = u.name || u.user_name || org.name || "—";
    setText("userName", name);
    setText("userDomain", (u.user_domain || org.user_domain || "") ? (u.user_domain || org.user_domain) + "." + domain.replace(/^https?:\/\/[^.]+\./, "") : (u.email || ""));
    setText("userAvatar", String(name).trim().charAt(0).toUpperCase() || "B");
  }

  function renderNotice() {
    var el = qs("globalNotice");
    var data = state.data;
    var msg = "";
    if (data && data.docsError) msg = t("loadFailed", { m: data.docsError });
    else if (data && data.docsTruncated) msg = t("truncated", { a: fmtNum(data.docsAnalysed), b: fmtNum(data.docsTotal) });
    el.textContent = msg;
    el.classList.toggle("hidden", !msg);
  }

  function renderNavBadge() {
    var n = state.data ? state.data.clients.filter(function (c) { return c.maxDays > 0; }).length : 0;
    var badge = qs("navOverdueBadge");
    badge.textContent = String(n);
    badge.classList.toggle("hidden", !n);
  }

  function renderSync() {
    setText("syncText", state.lastSync ? t("synced", { t: fmtTime(state.lastSync) }) : "");
  }

  function renderPageMeta() {
    var meta = PAGE_META[state.tab];
    setText("pageTitle", t(meta[0]));
    setText("pageSub", t(meta[1]));
    document.title = t(meta[0]) + " — " + t("brandName");
  }

  function renderActive(animate) {
    if (!state.data) return;
    if (state.tab === "overview") renderOverview(animate);
    else if (state.tab === "cashflow") renderCashflow(animate);
    else renderProducts();
  }

  function renderAll(animate) {
    renderUser();
    renderPageMeta();
    renderSync();
    if (!state.data) return;
    renderNotice();
    renderNavBadge();
    renderPerf();
    renderActive(animate);
  }

  function switchTab(tab) {
    state.tab = tab;
    document.querySelectorAll(".nav-item").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-tab") === tab); });
    document.querySelectorAll("[data-page]").forEach(function (s) { s.classList.toggle("hidden", s.getAttribute("data-page") !== tab); });
    renderPageMeta();
    renderActive(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function refreshDashboard(silent) {
    if (state.loading) return;
    state.loading = true;
    var btn = qs("refreshBtn");
    btn.disabled = true;
    btn.classList.add("is-busy");
    if (!state.data) qs("appView").classList.add("is-loading");
    try {
      state.data = await loadAll();
      state.lastSync = Date.now();
      qs("appView").classList.remove("is-loading");
      renderAll(!silent);
    } catch (err) {
      if (!(err && err.status === 401)) {
        var el = qs("globalNotice");
        el.textContent = t("loadFailed", { m: (err && err.message) || "" });
        el.classList.remove("hidden");
      }
    } finally {
      state.loading = false;
      btn.disabled = false;
      btn.classList.remove("is-busy");
    }
  }

  /* =========================================================
     Language & theme
     ========================================================= */
  function applyLanguage() {
    var root = document.documentElement;
    root.lang = state.lang;
    root.dir = state.lang === "he" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) { el.placeholder = t(el.getAttribute("data-i18n-placeholder")); });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) { el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"))); });
    ["langToggleBtn", "dashboardLangToggleBtn"].forEach(function (id) { setText(id, state.lang === "en" ? "עב" : "EN"); });
    setLive(state.liveMode || "off");
    updatePasswordToggleLabel();
    renderAuthControls();
    if (qs("appView").classList.contains("hidden")) document.title = t("brandName") + " — " + t("signIn");
    else renderAll(false);
  }

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
    ["themeToggleBtn", "dashboardThemeToggleBtn"].forEach(function (id) { setText(id, state.theme === "dark" ? "☀" : "☾"); });
  }

  function toggleLanguage() {
    state.lang = state.lang === "en" ? "he" : "en";
    localStorage.setItem(K.lang, state.lang);
    applyLanguage();
  }

  function toggleTheme() {
    state.theme = state.theme === "light" ? "dark" : "light";
    localStorage.setItem(K.theme, state.theme);
    applyTheme();
  }

  /* =========================================================
     Realtime (Biz1 SDK socket) + polling fallback
     ========================================================= */
  function setLive(mode) {
    state.liveMode = mode;
    var dot = qs("liveDot");
    dot.classList.toggle("on", mode === "on");
    dot.classList.toggle("polling", mode === "polling" || mode === "connecting");
    setText("liveText", t({ on: "liveConnected", polling: "livePolling", connecting: "liveConnecting" }[mode] || "liveOff"));
  }

  function ensureClient() {
    if (state.client) return state.client;
    if (!window.Biz1SDK || !window.Biz1SDK.Biz1Client) return null;
    state.client = new window.Biz1SDK.Biz1Client({ domain: domain, storage: localStorage });
    return state.client;
  }

  function isFinanceEvent(key) {
    return /document|invoice|receipt|payment|expense|product|customer|crm|order/i.test(String(key || ""));
  }

  function connectRealtime() {
    try {
      var client = ensureClient();
      if (!client || !window.io || !state.token) { setLive("polling"); return; }
      localStorage.setItem("biz1_sdk_bearer_token", state.token);
      if (client.setToken) client.setToken(state.token);
      if (!state.realtimeBound) {
        state.realtimeBound = true;
        client.realtime.on("biz1:ready", function () { state.realtimeConnected = true; setLive("on"); });
        client.realtime.on("*", function (event) {
          if (!isFinanceEvent(event && event.key) || state.waSending) return;
          clearTimeout(state.rtDebounce);
          state.rtDebounce = setTimeout(function () {
            if (qs("appView").classList.contains("hidden")) return;
            refreshDashboard(true).then(function () { toast(t("liveUpdate")); });
          }, 900);
        });
      }
      var socket = client.realtime.connect({ platform: "web", path: "/realtime/socket.io" });
      setLive("connecting");
      if (socket && socket.on) {
        socket.on("connect_error", function () { state.realtimeConnected = false; setLive("polling"); });
        socket.on("disconnect", function () { state.realtimeConnected = false; setLive("polling"); });
      }
    } catch (e) {
      setLive("polling");
    }
  }

  function disconnectRealtime() {
    try { if (state.client && state.client.realtime) state.client.realtime.disconnect(); } catch (e) { /* ignore */ }
    state.realtimeConnected = false;
    setLive("off");
  }

  function startAutoRefresh() {
    clearInterval(state.refreshTimer);
    state.refreshTimer = setInterval(function () {
      if (!state.realtimeConnected && !state.waSending && !qs("appView").classList.contains("hidden")) refreshDashboard(true);
    }, POLL_MS);
  }

  /* =========================================================
     Auth
     ========================================================= */
  function detectLoginIdentifier(raw) {
    var value = String(raw || "").trim();
    if (!value) return { field: "username", value: "" };
    if (value.indexOf("@") !== -1) return { field: "email", value: value };
    if (/^\+/.test(value) || /[\s\-()]/.test(value)) {
      var digits = value.replace(/\D+/g, "");
      if (digits.length >= 7 && digits.length <= 15) return { field: "phone", value: digits };
    }
    if (/^\d+$/.test(value)) {
      if (value.charAt(0) === "0" || value.length >= 10) return { field: "phone", value: value };
      return { field: "id", value: value };
    }
    return { field: "username", value: value };
  }

  function buildLoginBody(payload) {
    var identified = detectLoginIdentifier(payload.username || "");
    var body = { password: payload.password || "", otp: payload.otp || "" };
    body[identified.field] = identified.value;
    return body;
  }

  async function requestLogin(payload) {
    var res;
    try {
      res = await fetch(appBase + "/Login", { method: "POST", body: new URLSearchParams(buildLoginBody(payload)) });
    } catch (err) {
      throw makeRequestError("Network request failed", 0, {}, "NETWORK");
    }
    var data = {};
    try { data = await res.json(); } catch (e) { data = {}; }
    if (res.status === 429 && data.retry_after == null && data.retryAfter == null) data.retry_after = res.headers.get("Retry-After");
    var otpRequired = data && (data.otp_required || data.otpRequired);
    if (!res.ok && !otpRequired) throw makeRequestError(data.message || "Login failed", res.status, data);
    return data;
  }

  function detectRole(username, userBasic) {
    var data = (userBasic && userBasic.data) || userBasic || {};
    var account = data.user || {};
    var role = data.role || data.user_role || account.role || account.user_role || "";
    return role ? String(role).toLowerCase() : "user";
  }

  function readCachedCredentials() {
    try {
      var sp = sessionStorage.getItem(K.sessionPass) || "";
      var su = localStorage.getItem(K.username) || "";
      if (su && sp) return { username: su, password: sp };
      var saved = JSON.parse(localStorage.getItem(K.cred) || "null");
      if (saved && saved.username && saved.password) return { username: saved.username, password: saved.password };
    } catch (e) { /* ignore */ }
    return null;
  }

  function clearAuthStorage(clearCredentials) {
    [K.token, K.user, K.role, K.urlToken, "biz1_sdk_bearer_token"].forEach(function (k) { localStorage.removeItem(k); });
    state.token = "";
    if (clearCredentials) {
      localStorage.removeItem(K.cred);
      localStorage.removeItem(K.remember);
      try { sessionStorage.removeItem(K.sessionPass); } catch (e) { /* ignore */ }
    }
  }

  function saveAuthenticatedSession(token, userBasic, username, password, remember) {
    var role = detectRole(username, userBasic);
    state.token = token;
    localStorage.setItem(K.token, token);
    localStorage.setItem(K.user, JSON.stringify(userBasic || {}));
    localStorage.setItem(K.role, role);
    localStorage.setItem(K.username, username);
    try {
      localStorage.setItem("biz1_sdk_bearer_token", token);
      if (password) sessionStorage.setItem(K.sessionPass, password);
    } catch (e) { /* ignore */ }
    if (remember) {
      localStorage.setItem(K.remember, "1");
      localStorage.setItem(K.cred, JSON.stringify({ username: username, password: password }));
    } else if (password) {
      localStorage.removeItem(K.remember);
      localStorage.removeItem(K.cred);
    }
    return role;
  }

  async function loginBiz1(payload, remember) {
    var data = await requestLogin(payload);
    if (data && (data.otp_required || data.otpRequired)) return { otpRequired: true, raw: data };
    var token = data && (data.token || data.access_token || data.bearer_token);
    if (!token) throw makeRequestError(data.message || "Login failed", data.status, data);
    state.token = token;
    var userBasic;
    try {
      userBasic = await postRoute("User.Basic", {}, { throwHttpError: true, track: false });
    } catch (err) {
      clearAuthStorage(false);
      throw err;
    }
    saveAuthenticatedSession(token, userBasic, payload.username, payload.password, remember);
    localStorage.removeItem(K.urlToken);
    return { ok: true };
  }

  function normalizeBearerToken(raw) {
    return String(raw || "").trim().replace(/^\s*Bearer\s+/i, "");
  }

  function readUrlToken() {
    try {
      var v = normalizeBearerToken(new URLSearchParams(location.search || "").get("token") || "");
      if (v && !/\{\{\s*token\s*\}\}/i.test(v)) return v;
      var hash = String(location.hash || "").replace(/^#/, "");
      var q = hash.indexOf("?");
      if (q === -1) return "";
      v = normalizeBearerToken(new URLSearchParams(hash.slice(q + 1)).get("token") || "");
      return v && !/\{\{\s*token\s*\}\}/i.test(v) ? v : "";
    } catch (e) {
      return "";
    }
  }

  function clearUrlToken() {
    try {
      var url = new URL(location.href);
      var changed = false;
      if (url.searchParams.has("token")) { url.searchParams.delete("token"); changed = true; }
      var hash = String(url.hash || "").replace(/^#/, "");
      var q = hash.indexOf("?");
      if (q !== -1) {
        var params = new URLSearchParams(hash.slice(q + 1));
        if (params.has("token")) {
          params.delete("token");
          var rest = params.toString();
          var page = hash.slice(0, q);
          url.hash = rest ? "#" + page + "?" + rest : (page ? "#" + page : "");
          changed = true;
        }
      }
      if (changed) history.replaceState({}, "", url.pathname + url.search + url.hash);
    } catch (e) { /* ignore */ }
  }

  async function loginWithToken(token) {
    var clean = normalizeBearerToken(token);
    state.token = clean;
    var userBasic;
    try {
      userBasic = await postRoute("User.Basic", {}, { throwHttpError: true, track: false });
    } catch (err) {
      clearAuthStorage(false);
      var raw = (err && err.raw) || {};
      var text = String(raw.error || raw.message || (err && err.message) || "").toLowerCase();
      throw new Error(text.indexOf("expired") !== -1 ? t("tokenExpired") : t("tokenInvalid"));
    }
    var u = (userBasic && userBasic.data && userBasic.data.user) || {};
    saveAuthenticatedSession(clean, userBasic, u.email || u.user_name || "token-user", "", false);
    localStorage.setItem(K.urlToken, "1");
  }

  function tokenIsCurrent(token) {
    if (!token) return false;
    try {
      var parts = String(token).split(".");
      if (parts.length < 2) return true;
      var b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      var payload = JSON.parse(atob(b64));
      return !payload.exp || Number(payload.exp) * 1000 > Date.now();
    } catch (e) {
      return true;
    }
  }

  /* ---------- Login UI state ---------- */
  function showLogin() {
    qs("loginView").classList.remove("hidden");
    qs("appView").classList.add("hidden");
    clearInterval(state.refreshTimer);
    document.title = t("brandName") + " — " + t("signIn");
  }

  function showApp() {
    qs("loginView").classList.add("hidden");
    qs("appView").classList.remove("hidden");
    renderAll(false);
  }

  function setLoginError(msg) {
    var el = qs("loginError");
    el.textContent = msg || "";
    el.classList.toggle("hidden", !msg);
  }

  function updatePasswordToggleLabel() {
    var btn = qs("togglePasswordBtn");
    var input = qs("password");
    if (btn && input) btn.setAttribute("aria-label", t(input.type === "text" ? "hidePassword" : "showPassword"));
  }

  function formatCountdown(seconds) {
    var s = Math.max(0, Math.ceil(seconds));
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }
  function rateLimitRemaining() { return Math.max(0, Math.ceil((state.rateLimitUntil - Date.now()) / 1000)); }
  function resendRemaining() { return Math.max(0, Math.ceil((state.resendUntil - Date.now()) / 1000)); }

  function renderAuthControls() {
    var loginBtn = qs("loginBtn");
    var resendBtn = qs("resendOtpBtn");
    if (!loginBtn || !resendBtn) return;
    var rate = rateLimitRemaining();
    var resend = resendRemaining();
    if (rate) {
      loginBtn.disabled = true; resendBtn.disabled = true;
      loginBtn.textContent = resendBtn.textContent = t("tryAgainIn") + " " + formatCountdown(rate);
      return;
    }
    if (state.requestInFlight) {
      loginBtn.disabled = true; resendBtn.disabled = true;
      loginBtn.textContent = state.requestSource === "silent" ? t("loading") : (state.otpRequired ? t("verifying") : t("signingIn"));
      resendBtn.textContent = state.requestSource === "resend" ? t("resending") : t("resendOtp");
      return;
    }
    loginBtn.disabled = false;
    loginBtn.textContent = state.otpRequired ? t("verifySignIn") : t("signIn");
    resendBtn.disabled = !state.otpRequired || !!resend;
    resendBtn.textContent = resend ? t("resendIn") + " " + resend + "s" : t("resendOtp");
  }

  function setRequestBusy(busy, source) {
    state.requestInFlight = busy;
    state.requestSource = busy ? source : "";
    renderAuthControls();
  }

  function startResendCountdown(seconds) {
    state.resendUntil = Date.now() + seconds * 1000;
    clearInterval(state.resendTimer);
    function tick() {
      if (!resendRemaining()) { clearInterval(state.resendTimer); state.resendTimer = null; state.resendUntil = 0; }
      renderAuthControls();
    }
    tick();
    state.resendTimer = setInterval(tick, 1000);
  }

  function getRetrySeconds(err) {
    var raw = (err && err.raw) || {};
    var value = raw.retry_after != null ? raw.retry_after : (raw.retryAfter != null ? raw.retryAfter : (raw.wait_seconds != null ? raw.wait_seconds : raw.waitSeconds));
    var seconds = Number(value);
    if (isFinite(seconds) && seconds > 0) return Math.min(Math.ceil(seconds), 3600);
    var message = String(raw.message || raw.error || (err && err.message) || "");
    var minutes = message.match(/wait\s+(\d+)\s+minutes?/i);
    if (minutes) return Math.min(Number(minutes[1]) * 60, 3600);
    var secs = message.match(/wait\s+(\d+)\s+seconds?/i);
    if (secs) return Math.min(Number(secs[1]), 3600);
    if (/wait\s+(?:one|a)\s+minute/i.test(message)) return 60;
    if (Number(err && err.status) === 429 || Number(raw.status) === 429 || /too many login attempts/i.test(message)) return 60;
    return 0;
  }

  function startRateLimit(seconds) {
    state.rateLimitUntil = Date.now() + Math.min(Math.max(1, seconds), 3600) * 1000;
    clearInterval(state.rateLimitTimer);
    function tick() {
      var remaining = rateLimitRemaining();
      if (!remaining) {
        clearInterval(state.rateLimitTimer); state.rateLimitTimer = null; state.rateLimitUntil = 0;
        setLoginError("");
      } else {
        setLoginError(t("rateLimit") + " " + t("tryAgainIn") + ": " + formatCountdown(remaining));
      }
      renderAuthControls();
    }
    tick();
    state.rateLimitTimer = setInterval(tick, 1000);
  }

  function enterOtpMode(messageKey) {
    state.otpRequired = true;
    qs("usernameWrap").classList.add("hidden");
    qs("passwordWrap").classList.add("hidden");
    qs("otpWrap").classList.remove("hidden");
    qs("otp").value = "";
    setLoginError(t(messageKey || "otpSent"));
    startResendCountdown(20);
    qs("otp").focus();
  }

  function leaveOtpMode() {
    state.otpRequired = false;
    qs("usernameWrap").classList.remove("hidden");
    qs("passwordWrap").classList.remove("hidden");
    qs("otpWrap").classList.add("hidden");
    qs("otp").value = "";
    clearInterval(state.resendTimer);
    state.resendTimer = null;
    state.resendUntil = 0;
    renderAuthControls();
  }

  function handleAuthError(err, context) {
    var retry = getRetrySeconds(err);
    if (retry) { startRateLimit(retry); return; }
    if (err && err.code === "NETWORK") { setLoginError(t("networkFailure")); return; }
    if (context === "resend") { setLoginError(t("resendFailed")); return; }
    if (state.otpRequired) { setLoginError(t("invalidOtp")); qs("otp").select(); return; }
    setLoginError(t("invalidCredentials"));
  }

  async function finishAuthentication() {
    state.otpRequired = false;
    state.lastLogin = { username: "", password: "" };
    showApp();
    await refreshDashboard(false);
    connectRealtime();
    startAutoRefresh();
  }

  async function trySilentLogin(cached) {
    if (!cached || state.requestInFlight) return;
    setRequestBusy(true, "silent");
    try {
      var result = await loginBiz1({ username: cached.username, password: cached.password, otp: "" }, localStorage.getItem(K.remember) === "1");
      if (result.otpRequired) {
        clearAuthStorage(true);
        qs("rememberMe").checked = false;
        leaveOtpMode();
        return;
      }
      await finishAuthentication();
    } catch (err) {
      clearAuthStorage(!(err && err.code === "NETWORK"));
      handleAuthError(err, "login");
    } finally {
      setRequestBusy(false, "");
    }
  }

  /* =========================================================
     Events
     ========================================================= */
  function bindSeg(id, attr, onPick) {
    var seg = qs(id);
    seg.querySelectorAll(".seg-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        seg.querySelectorAll(".seg-btn").forEach(function (b) { b.classList.toggle("active", b === btn); });
        onPick(btn.getAttribute(attr));
      });
    });
  }

  function bindEvents() {
    qs("loginForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      if (state.requestInFlight || rateLimitRemaining()) return;
      setLoginError("");
      var username = state.otpRequired ? state.lastLogin.username : qs("username").value.trim();
      var password = state.otpRequired ? state.lastLogin.password : qs("password").value;
      var otp = qs("otp").value.trim();
      var remember = qs("rememberMe").checked;
      if (!username || !password) { setLoginError(t("requiredFields")); return; }
      if (state.otpRequired && !otp) { setLoginError(t("requiredOtp")); return; }
      var wasOtp = state.otpRequired;
      setRequestBusy(true, "login");
      try {
        var res = await loginBiz1({ username: username, password: password, otp: wasOtp ? otp : "" }, remember);
        if (res.otpRequired) {
          if (wasOtp) { setLoginError(t("invalidOtp")); qs("otp").select(); }
          else { state.lastLogin = { username: username, password: password }; enterOtpMode("otpSent"); }
        } else {
          await finishAuthentication();
        }
      } catch (err) {
        handleAuthError(err, "login");
      } finally {
        setRequestBusy(false, "");
      }
    });

    qs("resendOtpBtn").addEventListener("click", async function () {
      if (state.requestInFlight || rateLimitRemaining() || resendRemaining() || !state.otpRequired) return;
      var c = state.lastLogin;
      setLoginError("");
      setRequestBusy(true, "resend");
      try {
        var res = await loginBiz1({ username: c.username, password: c.password, otp: "" }, qs("rememberMe").checked);
        if (res.otpRequired) { qs("otp").value = ""; setLoginError(t("otpResent")); startResendCountdown(20); qs("otp").focus(); }
        else await finishAuthentication();
      } catch (err) {
        handleAuthError(err, "resend");
      } finally {
        setRequestBusy(false, "");
      }
    });

    qs("togglePasswordBtn").addEventListener("click", function () {
      var input = qs("password");
      input.type = input.type === "password" ? "text" : "password";
      updatePasswordToggleLabel();
      input.focus();
    });

    document.querySelectorAll(".demo-user-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        qs("username").value = btn.getAttribute("data-user") || "";
        qs("password").value = btn.getAttribute("data-pass") || "";
        qs("loginBtn").focus();
      });
    });

    qs("logoutBtn").addEventListener("click", function () {
      clearAuthStorage(true);
      state.data = null;
      state.perf = [];
      state.selected = {};
      state.selectionSeen = {};
      state.waResults = {};
      state.lastLogin = { username: "", password: "" };
      leaveOtpMode();
      disconnectRealtime();
      qs("password").value = "";
      showLogin();
    });

    qs("refreshBtn").addEventListener("click", function () { refreshDashboard(false); });
    ["themeToggleBtn", "dashboardThemeToggleBtn"].forEach(function (id) { qs(id).addEventListener("click", toggleTheme); });
    ["langToggleBtn", "dashboardLangToggleBtn"].forEach(function (id) { qs(id).addEventListener("click", toggleLanguage); });

    document.querySelectorAll(".nav-item").forEach(function (btn) {
      btn.addEventListener("click", function () { switchTab(btn.getAttribute("data-tab")); });
    });

    bindSeg("rangeSeg", "data-range", function (v) { state.range = Number(v); renderOverview(true); });
    bindSeg("chartTypeSeg", "data-type", function (v) { state.chartType = v; renderOverview(true); });
    bindSeg("metricSeg", "data-metric", function (v) { state.metric = v; renderProducts(); });
    bindSeg("sourceSeg", "data-source", function (v) { state.source = v; renderProducts(); });

    qs("productSearch").addEventListener("input", function (e) { state.search = e.target.value; renderProducts(); });

    qs("clearBucketBtn").addEventListener("click", function () { state.bucket = null; renderCashflow(false); });

    qs("selectAllClients").addEventListener("change", function (e) {
      selectableClients().forEach(function (c) { state.selected[c.key] = e.target.checked; });
      renderOverdueTable();
      renderWaPanel();
    });

    qs("waTemplate").addEventListener("input", function (e) {
      var v = e.target.value;
      if (v.trim() && v !== t("waDefault")) localStorage.setItem(K.waTemplate + state.lang, v);
      else localStorage.removeItem(K.waTemplate + state.lang);
      renderWaPanel();
    });

    qs("waReminderBtn").addEventListener("click", sendWhatsAppReminders);

    window.addEventListener("resize", function () {
      clearTimeout(state.resizeTimer);
      state.resizeTimer = setTimeout(function () {
        if (!qs("appView").classList.contains("hidden")) renderActive(false);
      }, 160);
    });
  }

  /* =========================================================
     Bootstrap
     ========================================================= */
  async function bootstrap() {
    bindEvents();
    applyTheme();
    applyLanguage();
    setLive("off");

    var urlToken = readUrlToken();
    if (urlToken) {
      clearUrlToken();
      setRequestBusy(true, "login");
      try {
        await loginWithToken(urlToken);
        await finishAuthentication();
      } catch (err) {
        clearAuthStorage(false);
        showLogin();
        setLoginError(err && err.message ? err.message : t("invalidCredentials"));
      } finally {
        setRequestBusy(false, "");
      }
      return;
    }

    qs("rememberMe").checked = localStorage.getItem(K.remember) === "1";
    if (tokenIsCurrent(state.token) && localStorage.getItem(K.role)) {
      await finishAuthentication();
      return;
    }
    if (state.token) clearAuthStorage(false);
    showLogin();
    var cached = readCachedCredentials();
    if (cached) await trySilentLogin(cached);
  }

  document.addEventListener("DOMContentLoaded", bootstrap);
})();
