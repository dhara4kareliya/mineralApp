(function () {
  "use strict";

  var config = window.Biz1Config || {};
  var user = String(config.user || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\.bull36\.com.*$/i, "");
  var domain = "https://" + user + ".bull36.com";
  var appBase = domain + "/app";
  var tokenKey = "biz1_exec_token";
  var credKey = "biz1_exec_cred";
  var userKey = "biz1_exec_user_basic";
  var roleKey = "biz1_exec_role";
  var rememberKey = "biz1_exec_remember";
  var usernameKey = "biz1_exec_username";
  var sessionPassKey = "biz1_exec_session_pass";
  var langKey = "biz1_exec_lang";
  var themeKey = "biz1_exec_theme";
  var i18n = {
    en: {
      liveOn: "Live: On",
      liveOff: "Live: Off",
      liveConnected: "Live: Connected",
      livePolling: "Live: Polling",
      liveConnecting: "Live: Connecting...",
      accountLogin: "Account login",
      signInSub: "Sign in to the management system",
      emailUsername: "Email / Username / Phone / ID",
      password: "Password",
      otp: "OTP",
      otpPlaceholder: "Enter code",
      signIn: "Sign in",
      loading: "Loading...",
      signingIn: "Signing in...",
      verifying: "Verifying...",
      verifySignIn: "Verify & Sign in",
      resendOtp: "Resend OTP",
      resendIn: "Resend in",
      resending: "Resending...",
      rememberMe: "Remember me",
      showPassword: "Show password",
      hidePassword: "Hide password",
      loginPageSuffix: "Login",
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
      refresh: "Refresh",
      refreshing: "Refreshing...",
      logout: "Logout",
      dashboardTitle: "Executive Analytics",
      tabOverview: "Overview",
      tabCashflow: "Cash Flow & Receivables",
      tabProducts: "Product Analytics",
      kpiRevenueTitle: "Total Revenue",
      kpiMrrTitle: "Monthly MRR",
      kpiClientsTitle: "Active Clients",
      kpiOutstandingTitle: "Outstanding Invoices",
      trendTitle: "Revenue & Expense Trends",
      revenueLabel: "Revenue",
      expenseLabel: "Expense",
      recentTxTitle: "Recent Transactions",
      topProductsTitle: "Top Performing Products",
      overdueTitle: "Overdue Debts (30/60/90 days)",
      receivablesTitle: "Receivables",
      waReminderBtn: "Send Automated WhatsApp Reminders",
      daysLabel: "days",
      topSellingTitle: "Top Selling Services / Products",
      noApiData: "No API data found.",
      noTrendData: "No API trend data found.",
      noTransactions: "No API transactions found.",
      noProducts: "No API products found.",
      noRows: "No API rows available yet. Add records in Biz1 and refresh.",
      newClients: "new",
      pending: "pending",
      pendingState: "pending",
      paidState: "paid",
      vsLastMonth: "vs last month",
      invoice: "Invoice",
      reminderPrepared: "Reminder queue prepared for",
      clientsLabel: "clients. Use your Biz1 automation event to dispatch WhatsApp.",
      apiError: "API error while loading data.",
      prev: "Prev",
      next: "Next",
      waSending: "Sending WhatsApp reminders...",
      waDone: "WhatsApp reminders sent for",
      waNone: "No unpaid invoices with customers found.",
      waPartial: "pending invoices via Biz1 WhatsApp chat.",
      waFailed: "Could not send WhatsApp reminders."
    },
    he: {
      liveOn: "שידור חי: פעיל",
      liveOff: "שידור חי: כבוי",
      liveConnected: "שידור חי: מחובר",
      livePolling: "שידור חי: רענון אוטומטי",
      liveConnecting: "שידור חי: מתחבר...",
      accountLogin: "כניסה לחשבון",
      signInSub: "התחבר למערכת הניהול",
      emailUsername: "אימייל / שם משתמש / טלפון / מזהה",
      password: "סיסמה",
      otp: "קוד OTP",
      otpPlaceholder: "הזן קוד",
      signIn: "התחבר",
      loading: "טוען...",
      signingIn: "מתחבר...",
      verifying: "מאמת...",
      verifySignIn: "אמת והתחבר",
      resendOtp: "שלח OTP מחדש",
      resendIn: "שליחה מחדש בעוד",
      resending: "שולח מחדש...",
      rememberMe: "זכור אותי",
      showPassword: "הצג סיסמה",
      hidePassword: "הסתר סיסמה",
      loginPageSuffix: "התחברות",
      requiredFields: "יש להזין אימייל, שם משתמש, טלפון או מזהה, וסיסמה.",
      requiredOtp: "יש להזין קוד אימות.",
      invalidCredentials: "פרטי ההתחברות או הסיסמה שגויים.",
      invalidOtp: "קוד האימות שגוי. יש לבדוק ולנסות שוב.",
      networkFailure: "לא ניתן להתחבר. יש לבדוק את החיבור ולנסות שוב.",
      resendFailed: "לא ניתן לשלוח מחדש את קוד האימות. יש לנסות שוב.",
      rateLimit: "יותר מדי ניסיונות התחברות. יש להמתין לפני ניסיון נוסף.",
      tryAgainIn: "נסה שוב בעוד",
      otpSent: "נדרש קוד אימות כדי להתחבר.",
      otpResent: "קוד אימות חדש נשלח.",
      refresh: "רענן",
      refreshing: "מרענן...",
      logout: "התנתק",
      dashboardTitle: "אנליטיקה ניהולית",
      tabOverview: "סקירה כללית",
      tabCashflow: "תזרים מזומנים וחייבים",
      tabProducts: "אנליטיקת מוצרים",
      kpiRevenueTitle: "סה״כ הכנסות",
      kpiMrrTitle: "MRR חודשי",
      kpiClientsTitle: "לקוחות פעילים",
      kpiOutstandingTitle: "חשבוניות פתוחות",
      trendTitle: "מגמות הכנסות והוצאות",
      revenueLabel: "הכנסות",
      expenseLabel: "הוצאות",
      recentTxTitle: "עסקאות אחרונות",
      topProductsTitle: "מוצרים מובילים",
      overdueTitle: "חובות באיחור (30/60/90 ימים)",
      receivablesTitle: "חשבונות לגבייה",
      waReminderBtn: "שלח תזכורות ווטסאפ אוטומטיות",
      daysLabel: "ימים",
      topSellingTitle: "שירותים / מוצרים נמכרים ביותר",
      noApiData: "לא נמצאו נתוני API.",
      noTrendData: "לא נמצאו נתוני מגמה מה-API.",
      noTransactions: "לא נמצאו עסקאות מה-API.",
      noProducts: "לא נמצאו מוצרים מה-API.",
      noRows: "עדיין אין רשומות API. הוסף נתונים ב-Biz1 ורענן.",
      newClients: "חדשים",
      pending: "ממתינים",
      pendingState: "ממתין",
      paidState: "שולם",
      vsLastMonth: "מול החודש הקודם",
      invoice: "חשבונית",
      reminderPrepared: "תור התזכורות הוכן עבור",
      clientsLabel: "לקוחות. השתמש באירוע האוטומציה של Biz1 לשליחת ווטסאפ.",
      apiError: "שגיאת API בעת טעינת הנתונים.",
      prev: "הקודם",
      next: "הבא",
      waSending: "שולח תזכורות ווטסאפ...",
      waDone: "תזכורות ווטסאפ נשלחו עבור",
      waNone: "לא נמצאו חשבוניות פתוחות עם לקוחות.",
      waPartial: "חשבוניות ממתינות דרך צ'אט ווטסאפ של Biz1.",
      waFailed: "לא ניתן לשלוח תזכורות ווטסאפ."
    }
  };
  var TX_PAGE_SIZE = 10;

  var state = {
    token: localStorage.getItem(tokenKey) || "",
    otpRequired: false,
    lastLogin: { username: "", password: "" },
    requestInFlight: false,
    requestSource: "",
    rateLimitUntil: 0,
    rateLimitTimer: null,
    resendUntil: 0,
    resendTimer: null,
    data: null,
    client: null,
    realtimeConnected: false,
    realtimeBound: false,
    refreshTimer: null,
    realtimeRefreshDebounce: null,
    lang: localStorage.getItem(langKey) === "he" ? "he" : "en",
    theme: localStorage.getItem(themeKey) === "dark" ? "dark" : "light",
    txPage: 1
  };

  function qs(id) { return document.getElementById(id); }
  function tooltipEl() { return qs("chartTooltip"); }
  function money(v) {
    var n = Number(v || 0);
    return "$" + n.toLocaleString(state.lang === "he" ? "he-IL" : "en-US", { maximumFractionDigits: 0 });
  }
  function t(key) {
    var langPack = i18n[state.lang] || i18n.en;
    return langPack[key] || i18n.en[key] || key;
  }
  function setText(id, value) {
    var el = qs(id);
    if (el) el.textContent = value;
  }
  function setTextMany(ids, value) {
    ids.forEach(function (id) {
      var el = qs(id);
      if (el) el.textContent = value;
    });
  }
  function setInputPlaceholder(id, value) {
    var el = qs(id);
    if (el) el.placeholder = value;
  }
  function applyLanguage() {
    var brandCfg = (config.brand || {});
    var brand = brandCfg[state.lang] || (state.lang === "he" ? "תצוגת Biz1" : "Biz1 Showcase");
    setText("brandTitle", brand);
    setText("brandSub", t("signInSub"));
    setText("loginTitle", t("accountLogin"));
    setText("usernameLabel", t("emailUsername"));
    setText("passwordLabel", t("password"));
    setText("otpLabel", t("otp"));
    setText("rememberLabel", t("rememberMe"));
    setText("loginFooter", brand);
    setInputPlaceholder("otp", t("otpPlaceholder"));
    document.title = brand + " — " + t("loginPageSuffix");
    setText("dashboardTitle", t("dashboardTitle"));
    setText("tabOverview", t("tabOverview"));
    setText("tabCashflow", t("tabCashflow"));
    setText("tabProducts", t("tabProducts"));
    setText("kpiRevenueTitle", t("kpiRevenueTitle"));
    setText("kpiMrrTitle", t("kpiMrrTitle"));
    setText("kpiClientsTitle", t("kpiClientsTitle"));
    setText("kpiOutstandingTitle", t("kpiOutstandingTitle"));
    setText("trendTitle", t("trendTitle"));
    setText("recentTxTitle", t("recentTxTitle"));
    setText("topProductsTitle", t("topProductsTitle"));
    setText("overdueTitle", t("overdueTitle"));
    setText("receivablesTitle", t("receivablesTitle"));
    setText("waReminderBtn", t("waReminderBtn"));
    setText("topSellingTitle", t("topSellingTitle"));
    setText("refreshBtn", t("refresh"));
    setText("logoutBtn", t("logout"));
    setTextMany(["langToggleBtn", "dashboardLangToggleBtn"], state.lang.toUpperCase());
    setText("txPrevBtn", t("prev"));
    setText("txNextBtn", t("next"));
    setLiveChip(state.realtimeConnected, state.realtimeConnected ? t("liveConnected") : t("liveOff"));
    renderDashboard();
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === "he" ? "rtl" : "ltr";
    updatePasswordToggleLabel();
    renderAuthControls();
  }
  function applyTheme() {
    document.body.setAttribute("data-theme", state.theme);
    setTextMany(["themeToggleBtn", "dashboardThemeToggleBtn"], state.theme === "dark" ? "☀" : "☾");
  }
  function toggleLanguage() {
    state.lang = state.lang === "en" ? "he" : "en";
    localStorage.setItem(langKey, state.lang);
    applyLanguage();
  }
  function toggleTheme() {
    state.theme = state.theme === "light" ? "dark" : "light";
    localStorage.setItem(themeKey, state.theme);
    applyTheme();
  }
  function setLiveChip(on, text) {
    var el = qs("liveChip");
    if (!el) return;
    el.classList.toggle("live-on", !!on);
    el.classList.toggle("live-off", !on);
    el.textContent = text || (on ? t("liveOn") : t("liveOff"));
  }
  function showTooltip(text, x, y) {
    var el = tooltipEl();
    if (!el) return;
    el.textContent = text;
    el.classList.remove("hidden");
    var left = Math.min(window.innerWidth - 250, Math.max(8, x + 12));
    var top = Math.max(8, y - 10);
    el.style.left = left + "px";
    el.style.top = top + "px";
  }
  function hideTooltip() {
    var el = tooltipEl();
    if (!el) return;
    el.classList.add("hidden");
  }
  function pct(curr, prev) {
    if (!prev) return "--";
    var p = ((curr - prev) / prev) * 100;
    var sign = p >= 0 ? "+" : "";
    return sign + p.toFixed(1) + "% " + t("vsLastMonth");
  }

  async function postRoute(route, body, opts) {
    opts = opts || {};
    var headers = {};
    if (!opts.publicRoute) headers.Authorization = "Bearer " + state.token;
    var res;
    try {
      res = await fetch(appBase + "/" + route, {
        method: "POST",
        headers: headers,
        body: new URLSearchParams(body || {})
      });
    } catch (err) {
      if (opts.throwHttpError) throw makeRequestError("Network request failed", 0, {}, "NETWORK");
      throw err;
    }
    var data = {};
    try { data = await res.json(); } catch (e) { data = {}; }
    if (res.status === 401 || Number(data.status) === 401) {
      clearAuthStorage(false);
      showLogin();
      throw makeRequestError("Session expired", 401, data);
    }
    if (opts.throwHttpError && (!res.ok || Number(data.status) >= 400)) {
      throw makeRequestError(data.message || "Request failed", res.status || data.status, data);
    }
    return data;
  }

  function makeRequestError(message, status, raw, code) {
    var err = new Error(message || "Request failed");
    err.status = Number(status || 0);
    err.raw = raw || {};
    if (code) err.code = code;
    return err;
  }

  function detectLoginIdentifier(raw) {
    var value = String(raw || "").trim();
    if (!value) return { field: "username", value: "" };

    if (value.indexOf("@") !== -1) {
      return { field: "email", value: value };
    }

    if (/^\+/.test(value) || /[\s\-()]/.test(value)) {
      var phoneDigits = value.replace(/\D+/g, "");
      if (phoneDigits.length >= 7 && phoneDigits.length <= 15) {
        return { field: "phone", value: phoneDigits };
      }
    }

    if (/^\d+$/.test(value)) {
      if (value.charAt(0) === "0" || value.length >= 10) {
        return { field: "phone", value: value };
      }
      return { field: "id", value: value };
    }

    return { field: "username", value: value };
  }

  function buildLoginBody(payload) {
    var raw = payload.username || payload.email || payload.phone || payload.id || "";
    var identified = detectLoginIdentifier(raw);
    var body = {
      password: payload.password || "",
      otp: payload.otp || ""
    };
    body[identified.field] = identified.value;
    return body;
  }

  async function requestLogin(payload) {
    var res;
    try {
      res = await fetch(appBase + "/Login", {
        method: "POST",
        body: new URLSearchParams(buildLoginBody(payload))
      });
    } catch (err) {
      throw makeRequestError("Network request failed", 0, {}, "NETWORK");
    }
    var data = {};
    try { data = await res.json(); } catch (e) { data = {}; }
    if (res.status === 429 && data.retry_after == null && data.retryAfter == null) {
      data.retry_after = res.headers.get("Retry-After");
    }
    var otpRequired = data && (data.otp_required || data.otpRequired);
    if (!res.ok && !otpRequired) throw makeRequestError(data.message || "Login failed", res.status, data);
    return data;
  }

  function detectRole(username, userBasic) {
    var data = (userBasic && userBasic.data) || userBasic || {};
    var account = data.user || data.account || {};
    var role = data.role || data.user_role || account.role || account.user_role || "";
    if (role) return String(role).toLowerCase();
    var email = String(username || "").toLowerCase();
    if (email.indexOf("admin") !== -1) return "admin";
    return "user";
  }

  function readCachedCredentials() {
    try {
      var sessionPassword = sessionStorage.getItem(sessionPassKey) || "";
      var sessionUsername = localStorage.getItem(usernameKey) || "";
      if (sessionUsername && sessionPassword) {
        return { username: sessionUsername, password: sessionPassword, source: "session" };
      }
      var saved = JSON.parse(localStorage.getItem(credKey) || "null");
      if (saved && saved.username && saved.password) {
        if (localStorage.getItem(rememberKey) !== "1") localStorage.setItem(rememberKey, "1");
        return { username: saved.username, password: saved.password, source: "remember" };
      }
    } catch (e) {
      // Ignore invalid legacy credentials.
    }
    return null;
  }

  function clearAuthStorage(clearCredentials) {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    localStorage.removeItem(roleKey);
    localStorage.removeItem("biz1_sdk_bearer_token");
    state.token = "";
    if (clearCredentials) {
      localStorage.removeItem(credKey);
      localStorage.removeItem(rememberKey);
      try { sessionStorage.removeItem(sessionPassKey); } catch (e) { /* ignore */ }
    }
  }

  function saveAuthenticatedSession(loginData, userBasic, username, password, remember) {
    var token = loginData.token || loginData.access_token || loginData.bearer_token;
    var role = detectRole(username, userBasic);
    state.token = token;
    localStorage.setItem(tokenKey, token);
    localStorage.setItem(userKey, JSON.stringify(userBasic || {}));
    localStorage.setItem(roleKey, role);
    localStorage.setItem(usernameKey, username);
    try {
      localStorage.setItem("biz1_sdk_bearer_token", token);
      sessionStorage.setItem(sessionPassKey, password);
    } catch (e) {
      // ignore storage errors
    }
    if (remember) {
      localStorage.setItem(rememberKey, "1");
      localStorage.setItem(credKey, JSON.stringify({ username: username, password: password }));
    } else {
      localStorage.removeItem(rememberKey);
      localStorage.removeItem(credKey);
    }
    return role;
  }

  async function loginBiz1(payload, remember) {
    var data = await requestLogin(payload);
    if (data && (data.otp_required || data.otpRequired)) {
      return { otpRequired: true, raw: data };
    }
    var token = data && (data.token || data.access_token || data.bearer_token);
    if (!token) throw makeRequestError(data.message || "Login failed", data.status, data);

    state.token = token;
    localStorage.setItem(tokenKey, token);
    localStorage.setItem("biz1_sdk_bearer_token", token);
    var userBasic;
    try {
      userBasic = await postRoute("User.Basic", {}, { throwHttpError: true });
    } catch (err) {
      clearAuthStorage(false);
      throw err;
    }
    var role = saveAuthenticatedSession(data, userBasic, payload.username, payload.password, remember);
    return { ok: true, userBasic: userBasic, role: role };
  }
  function ensureSocketIoScript() {
    return new Promise(function (resolve) {
      if (window.io) {
        resolve(true);
        return;
      }
      var existing = document.getElementById("biz1SocketIoScript");
      if (existing) {
        existing.addEventListener("load", function () { resolve(!!window.io); }, { once: true });
        existing.addEventListener("error", function () { resolve(false); }, { once: true });
        return;
      }
      var script = document.createElement("script");
      script.id = "biz1SocketIoScript";
      script.src = domain + "/realtime/socket.io/socket.io.js";
      script.async = true;
      script.onload = function () { resolve(!!window.io); };
      script.onerror = function () { resolve(false); };
      document.head.appendChild(script);
    });
  }
  function ensureClient() {
    if (state.client) return state.client;
    if (!window.Biz1SDK || !window.Biz1SDK.Biz1Client) return null;
    state.client = new window.Biz1SDK.Biz1Client({
      domain: domain,
      storage: localStorage
    });
    return state.client;
  }
  function bindRealtimeHandlers(client) {
    if (!client || !client.realtime || state.realtimeBound) return;
    state.realtimeBound = true;
    client.realtime.on("biz1:ready", function () {
      state.realtimeConnected = true;
      setLiveChip(true, t("liveConnected"));
    });
    client.realtime.on("*", function () {
      if (state.realtimeRefreshDebounce) clearTimeout(state.realtimeRefreshDebounce);
      state.realtimeRefreshDebounce = setTimeout(function () {
        if (!qs("dashboardView").classList.contains("hidden")) refreshDashboard(true);
      }, 900);
    });
  }
  async function connectRealtime() {
    try {
      var socketReady = await ensureSocketIoScript();
      var client = ensureClient();
      if (!socketReady) {
        setLiveChip(false, t("livePolling"));
        return;
      }
      if (!client || !client.realtime || !state.token) {
        setLiveChip(false, t("livePolling"));
        return;
      }
      try {
        localStorage.setItem("biz1_sdk_bearer_token", state.token);
      } catch (e0) {
        // ignore
      }
      if (client.setToken) client.setToken(state.token);
      bindRealtimeHandlers(client);
      client.realtime.connect({
        platform: "web",
        path: "/realtime/socket.io"
      });
      setLiveChip(false, t("liveConnecting"));
    } catch (e) {
      setLiveChip(false, t("livePolling"));
    }
  }
  function disconnectRealtime() {
    try {
      if (state.client && state.client.realtime && state.client.realtime.disconnect) {
        state.client.realtime.disconnect();
      }
    } catch (e) {
      // ignore
    }
    state.realtimeConnected = false;
    state.realtimeBound = false;
    setLiveChip(false, t("liveOff"));
  }
  function startAutoRefresh() {
    if (state.refreshTimer) clearInterval(state.refreshTimer);
    state.refreshTimer = setInterval(function () {
      if (!state.realtimeConnected && !qs("dashboardView").classList.contains("hidden")) {
        refreshDashboard(true);
      }
    }, 30000);
  }

  async function tryRoutes(list, body) {
    var i;
    for (i = 0; i < list.length; i += 1) {
      try {
        var out = await postRoute(list[i], body || {});
        if (out && (out.rows || out.data || out.output || out.success || out.count != null)) return out;
      } catch (e) {
        // Continue with next compatible route.
      }
    }
    return {};
  }

  function rowsOf(raw) {
    if (!raw) return [];
    if (Array.isArray(raw.rows)) return raw.rows;
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.output)) return raw.output;
    if (raw.output && Array.isArray(raw.output.rows)) return raw.output.rows;
    if (raw.data && Array.isArray(raw.data.rows)) return raw.data.rows;
    return [];
  }

  function toMonthKey(dateLike) {
    if (dateLike == null || dateLike === "") return "";
    if (dateLike instanceof Date) {
      if (isNaN(dateLike.getTime())) return "";
      return dateLike.getFullYear() + "-" + String(dateLike.getMonth() + 1).padStart(2, "0");
    }
    if (typeof dateLike === "number" && isFinite(dateLike)) {
      var fromTs = new Date(dateLike);
      if (isNaN(fromTs.getTime())) return "";
      return fromTs.getFullYear() + "-" + String(fromTs.getMonth() + 1).padStart(2, "0");
    }
    var raw = String(dateLike).trim();
    if (/^\d{4}-\d{2}$/.test(raw)) return raw;
    // Biz1 expenses often use MMYY (e.g. "0826" => 2026-08).
    // Avoid parsing those as years via Date("0826") => year 826.
    var mmyy = raw.match(/^(\d{2})(\d{2})$/);
    if (mmyy) {
      var mm = Number(mmyy[1]);
      var yy = Number(mmyy[2]);
      if (mm >= 1 && mm <= 12) {
        return (2000 + yy) + "-" + String(mm).padStart(2, "0");
      }
    }
    // Pure millisecond timestamps come through as strings from some callers.
    if (/^\d{12,13}$/.test(raw)) {
      var fromMs = new Date(Number(raw));
      if (!isNaN(fromMs.getTime())) {
        return fromMs.getFullYear() + "-" + String(fromMs.getMonth() + 1).padStart(2, "0");
      }
    }
    var d = new Date(raw);
    if (isNaN(d.getTime())) return "";
    var year = d.getFullYear();
    // Ignore absurd Date parses that pull the trend window off real data.
    if (year < 2000 || year > 2100) return "";
    return year + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }

  function num(row, keys) {
    var i;
    for (i = 0; i < keys.length; i += 1) {
      var v = row ? row[keys[i]] : null;
      if (v != null && v !== "" && !isNaN(Number(v))) return Number(v);
    }
    return 0;
  }

  function str(row, keys) {
    var i;
    for (i = 0; i < keys.length; i += 1) {
      var v = row ? row[keys[i]] : null;
      if (v != null && String(v).trim()) return String(v);
    }
    return "";
  }

  function makeEmptyData() {
    return {
      kpis: { revenue: 0, mrr: 0, clients: 0, outstanding: 0, pendingInvoices: 0, revenuePrev: 0, mrrPrev: 0, clientsPrev: 0, outstandingPrev: 0 },
      trend: [],
      recentTransactions: [],
      reminderTargets: [],
      topProducts: [],
      overdue: [
        { label: "0-30", amount: 0 },
        { label: "31-60", amount: 0 },
        { label: "61-90", amount: 0 }
      ],
      hasApiData: false
    };
  }

  async function loadAnalyticsData() {
    var customersCountRaw = await tryRoutes(["Customer.Count", "Customers.Count"], { length: 25 });
    var entriesRaw = await tryRoutes(["Entries.List"], { length: 25 });
    var docsRaw = await tryRoutes(["Documents.List"], { length: 100 });
    var productsRaw = await tryRoutes(["Products.List"], { length: 25 });
    var expensesRaw = await tryRoutes(["Expenses.List"], { length: 100 });

    var entryRows = rowsOf(entriesRaw);
    var expenseRows = rowsOf(expensesRaw);
    var docRows = rowsOf(docsRaw);
    var productRows = rowsOf(productsRaw);
    var monthMap = {};
    var totalRevenue = 0;
    var totalExpense = 0;

    function ensureMonth(key) {
      if (!key) return "";
      if (!monthMap[key]) monthMap[key] = { revenue: 0, expense: 0 };
      return key;
    }

    entryRows.forEach(function (r) {
      var amount = num(r, ["amount", "price", "total", "sum", "entry_sum"]);
      var key = ensureMonth(toMonthKey(str(r, ["date", "created_at", "datetime", "created", "month"])));
      if (!key) return;
      totalRevenue += amount;
      monthMap[key].revenue += amount;
    });
    expenseRows.forEach(function (r) {
      var amount = num(r, ["amount", "price", "total", "sum", "expense"]);
      var key = ensureMonth(toMonthKey(str(r, ["month_display", "month", "date", "created_time", "created_at", "datetime", "created"])));
      if (!key) return;
      totalExpense += amount;
      monthMap[key].expense += amount;
    });

    if (!entryRows.length && docRows.length) {
      totalRevenue = 0;
      Object.keys(monthMap).forEach(function (k) { monthMap[k].revenue = 0; });
      docRows.forEach(function (r) {
        var amount = num(r, ["final_amount", "final_amount_main", "amount", "total", "sum"]);
        var key = ensureMonth(toMonthKey(str(r, ["date_created", "created_at", "default_date", "due_date", "inserted_date"])));
        if (!key) return;
        totalRevenue += amount;
        monthMap[key].revenue += amount;
      });
    }

    function buildTrendMonths(map) {
      var nowKey = toMonthKey(Date.now());
      var keys = Object.keys(map).filter(function (k) {
        return /^\d{4}-\d{2}$/.test(k) && k >= "2000-01" && k <= "2100-12";
      }).sort();
      // Prefer current month as the MRR window end so empty future expense
      // months (or bad parses) do not push the chart off real revenue.
      var end = nowKey || (keys.length ? keys[keys.length - 1] : "");
      if (!end) end = toMonthKey(Date.now());
      var endDate = new Date(end + "-01T00:00:00");
      var out = [];
      var i;
      for (i = 5; i >= 0; i -= 1) {
        var d = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
        var key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
        var p = map[key] || { revenue: 0, expense: 0 };
        out.push({
          month: d.toLocaleString(state.lang === "he" ? "he-IL" : "en-US", { month: "short" }),
          revenue: Number(p.revenue || 0),
          expense: Number(p.expense || 0)
        });
      }
      return out;
    }

    var trend = buildTrendMonths(monthMap);
    var latest = trend[trend.length - 1] || { revenue: 0, expense: 0 };
    var prev = trend[trend.length - 2] || { revenue: 0, expense: 0 };
    var outstanding = 0;
    var pendingInvoices = 0;
    var recentTransactions = [];
    var reminderTargets = [];
    var overdue = [0, 0, 0];
    var now = Date.now();

    function isUnpaidDoc(row) {
      if (Number(row.is_canceled) === 1 || Number(row.canceled_status) === 1) return false;
      if (row.paid != null && row.paid !== "") return Number(row.paid) === 0;
      var status = str(row, ["status", "pay_status", "state", "paid_status"]).toLowerCase();
      if (/paid|closed|done|complete/.test(status)) return false;
      if (/pending|open|unpaid|1/.test(status)) return true;
      return true;
    }

    docRows.forEach(function (row, idx) {
      var id = str(row, ["last_documents_id", "invoice_number", "number", "id", "document_id"]) || String(idx + 1);
      var amount = num(row, ["final_amount", "final_amount_main", "amount", "price", "sum", "total"]);
      var unpaid = isUnpaidDoc(row);
      if (unpaid) {
        outstanding += amount;
        pendingInvoices += 1;
        var date = new Date(str(row, ["due_date", "date_created", "default_date", "created_at", "date", "datetime"]) || Date.now());
        var diff = Math.max(0, Math.floor((now - date.getTime()) / (1000 * 60 * 60 * 24)));
        if (diff <= 30) overdue[0] += amount;
        else if (diff <= 60) overdue[1] += amount;
        else overdue[2] += amount;
        reminderTargets.push({
          invoiceId: id,
          customerId: str(row, ["cust_id", "customer_id"]),
          name: str(row, ["name", "company_name", "email"]) || ("Invoice #" + id),
          phone: String(str(row, ["mobile", "phone", "second_phone"]) || "").replace(/\D/g, ""),
          amount: amount
        });
      }
      if (recentTransactions.length < 30) {
        recentTransactions.push({
          invoiceId: id,
          amount: amount,
          unpaid: unpaid
        });
      }
    });

    var topProducts = productRows.slice(0, 8).map(function (row) {
      return {
        name: str(row, ["name", "title", "product_name"]) || (state.lang === "he" ? "מוצר" : "Product"),
        value: num(row, ["sold", "count", "quantity", "total_orders", "sum"])
      };
    }).sort(function (a, b) { return b.value - a.value; }).slice(0, 5);
    var clients = Number(customersCountRaw.count || customersCountRaw.total || customersCountRaw.rows_count || 0);
    if (!clients) clients = rowsOf(await tryRoutes(["Customer.List", "Customers.List"], { length: 25 })).length;
    var hasApiData = !!(
      entryRows.length ||
      expenseRows.length ||
      docRows.length ||
      productRows.length ||
      clients > 0
    );

    return {
      kpis: {
        revenue: totalRevenue,
        mrr: latest.revenue,
        clients: clients,
        outstanding: outstanding,
        pendingInvoices: pendingInvoices,
        revenuePrev: prev.revenue,
        mrrPrev: prev.revenue,
        clientsPrev: Math.max(0, clients - 4),
        outstandingPrev: Math.max(0, outstanding)
      },
      trend: trend,
      recentTransactions: recentTransactions,
      reminderTargets: reminderTargets,
      topProducts: topProducts,
      overdue: [
        { label: "0-30", amount: overdue[0] },
        { label: "31-60", amount: overdue[1] },
        { label: "61-90", amount: overdue[2] }
      ],
      hasApiData: hasApiData
    };
  }

  function lineChart(el, points, aKey, bKey) {
    var w = 900;
    var h = 280;
    var padL = 54;
    var padR = 24;
    var padT = 24;
    var padB = 36;
    var max = 1;
    points.forEach(function (p) {
      max = Math.max(max, Number(p[aKey] || 0), Number(p[bKey] || 0));
    });
    var plotW = w - padL - padR;
    var plotH = h - padT - padB;
    var stepX = points.length > 1 ? plotW / (points.length - 1) : plotW / 2;
    function xy(i, value) {
      var x = padL + (points.length > 1 ? stepX * i : plotW / 2);
      var y = padT + plotH - ((Number(value || 0) / max) * plotH);
      return { x: x, y: y };
    }
    function pathFor(key) {
      return points.map(function (p, i) {
        var pt = xy(i, p[key]);
        return (i ? "L" : "M") + pt.x.toFixed(1) + " " + pt.y.toFixed(1);
      }).join(" ");
    }
    var grid = "";
    var gi;
    for (gi = 0; gi < 4; gi += 1) {
      var gy = padT + (plotH / 3) * gi;
      var gVal = Math.round(max - (max / 3) * gi);
      grid += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (w - padR) + '" y2="' + gy.toFixed(1) + '" stroke="#d7deea" stroke-width="1"/>';
      grid += '<text x="' + (padL - 8) + '" y="' + (gy + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#70809b">' + money(gVal) + "</text>";
    }
    var labels = points.map(function (p, i) {
      var x = xy(i, 0).x;
      return '<text x="' + x.toFixed(1) + '" y="' + (h - 10) + '" text-anchor="middle" font-size="12" fill="#70809b">' + p.month + "</text>";
    }).join("");
    var pointDots = points.map(function (p, i) {
      var a = xy(i, p[aKey]);
      var b = xy(i, p[bKey]);
      return '' +
        '<circle class="chart-point" data-label="' + p.month + ' ' + t("revenueLabel") + ': ' + money(p[aKey]) + '" cx="' + a.x.toFixed(1) + '" cy="' + a.y.toFixed(1) + '" r="5.5" fill="#1e64d9"></circle>' +
        '<circle class="chart-point" data-label="' + p.month + ' ' + t("expenseLabel") + ': ' + money(p[bKey]) + '" cx="' + b.x.toFixed(1) + '" cy="' + b.y.toFixed(1) + '" r="5.5" fill="#1aa16a"></circle>';
    }).join("");
    var legend =
      '<div class="chart-legend">' +
      '<span class="chart-legend-item"><i class="chart-legend-dot revenue-dot"></i>' + t("revenueLabel") + '</span>' +
      '<span class="chart-legend-item"><i class="chart-legend-dot expense-dot"></i>' + t("expenseLabel") + '</span>' +
      '</div>';
    el.innerHTML =
      legend +
      '<svg viewBox="0 0 ' + w + " " + h + '">' +
      grid +
      '<path d="' + pathFor(aKey) + '" fill="none" stroke="#1e64d9" stroke-width="3"/>' +
      '<path d="' + pathFor(bKey) + '" fill="none" stroke="#1aa16a" stroke-width="3"/>' +
      pointDots +
      labels +
      "</svg>";
    el.querySelectorAll(".chart-point").forEach(function (pt) {
      pt.addEventListener("mousemove", function (e) {
        showTooltip(pt.getAttribute("data-label") || "", e.clientX, e.clientY);
      });
      pt.addEventListener("mouseleave", hideTooltip);
    });
  }

  function barsChart(el, bars) {
    if (!bars || !bars.length) {
      el.innerHTML = '<p class="muted">' + t("noApiData") + "</p>";
      return;
    }
    var max = 1;
    bars.forEach(function (b) { max = Math.max(max, Number(b.amount || b.value || 0)); });
    el.innerHTML = bars.map(function (b) {
      var v = Number(b.amount || b.value || 0);
      var pctVal = (v / max) * 100;
      return '<div class="bar-row" data-tip="' + b.label + ": " + money(v) + '"><div>' + b.label + '</div><div class="bar-track"><div class="bar-fill" style="width:' + pctVal.toFixed(2) + '%"></div></div><div>' + money(v) + "</div></div>";
    }).join("");
    el.querySelectorAll(".bar-row").forEach(function (row) {
      row.addEventListener("mousemove", function (e) {
        showTooltip(row.getAttribute("data-tip") || "", e.clientX, e.clientY);
      });
      row.addEventListener("mouseleave", hideTooltip);
    });
  }

  function renderTxPage() {
    var data = state.data || makeEmptyData();
    var rows = data.recentTransactions || [];
    var totalPages = Math.max(1, Math.ceil(rows.length / TX_PAGE_SIZE));
    if (state.txPage > totalPages) state.txPage = totalPages;
    if (state.txPage < 1) state.txPage = 1;
    var start = (state.txPage - 1) * TX_PAGE_SIZE;
    var pageRows = rows.slice(start, start + TX_PAGE_SIZE);
    qs("txList").innerHTML = pageRows.length
      ? pageRows.map(function (x) {
        if (typeof x === "string") return "<li>" + x + "</li>";
        var statusLabel = x.unpaid ? t("pendingState") : t("paidState");
        return "<li>" + t("invoice") + " #" + x.invoiceId + " - " + money(x.amount) + " (" + statusLabel + ")</li>";
      }).join("")
      : '<li class="muted">' + t("noTransactions") + "</li>";
    var pager = qs("txPager");
    if (!pager) return;
    if (rows.length > TX_PAGE_SIZE) {
      pager.classList.remove("hidden");
      setText("txPageInfo", state.txPage + " / " + totalPages);
      setText("txPrevBtn", t("prev"));
      setText("txNextBtn", t("next"));
      qs("txPrevBtn").disabled = state.txPage <= 1;
      qs("txNextBtn").disabled = state.txPage >= totalPages;
    } else {
      pager.classList.add("hidden");
    }
  }

  function renderDashboard() {
    var data = state.data || makeEmptyData();
    qs("kpiRevenue").textContent = money(data.kpis.revenue);
    qs("kpiMrr").textContent = money(data.kpis.mrr);
    qs("kpiClients").textContent = String(data.kpis.clients);
    qs("kpiOutstanding").textContent = money(data.kpis.outstanding);
    qs("kpiRevenueDelta").textContent = pct(data.kpis.revenue, data.kpis.revenuePrev);
    qs("kpiMrrDelta").textContent = pct(data.kpis.mrr, data.kpis.mrrPrev);
    qs("kpiClientsDelta").textContent = ((data.kpis.clients - data.kpis.clientsPrev) >= 0 ? "+" : "") + (data.kpis.clients - data.kpis.clientsPrev) + " " + t("newClients");
    qs("kpiOutstandingDelta").textContent = data.kpis.pendingInvoices + " " + t("pending");

    if (data.trend.length) {
      lineChart(qs("trendChart"), data.trend, "revenue", "expense");
    } else {
      qs("trendChart").innerHTML = '<p class="muted">' + t("noTrendData") + "</p>";
    }
    barsChart(qs("overdueChart"), data.overdue);

    renderTxPage();
    qs("topList").innerHTML = data.topProducts.length
      ? data.topProducts.slice(0, 5).map(function (x) { return "<li>" + x.name + "</li>"; }).join("")
      : '<li class="muted">' + t("noProducts") + "</li>";
    qs("receivableList").innerHTML = data.overdue.map(function (x) { return "<li>" + x.label + " " + t("daysLabel") + ": " + money(x.amount) + "</li>"; }).join("");
    barsChart(qs("productBars"), data.topProducts.map(function (x) { return { label: x.name, amount: x.value }; }));
    qs("waStatus").textContent = data.hasApiData ? "" : t("noRows");
  }

  function switchTab(tab) {
    document.querySelectorAll(".tab").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-tab") === tab);
    });
    document.querySelectorAll("[data-page]").forEach(function (sec) {
      sec.classList.toggle("hidden", sec.getAttribute("data-page") !== tab);
    });
  }

  function showLogin() {
    qs("loginView").classList.remove("hidden");
    qs("dashboardView").classList.add("hidden");
  }
  function showDashboard() {
    qs("loginView").classList.add("hidden");
    qs("dashboardView").classList.remove("hidden");
  }
  function setLoginError(msg) {
    var el = qs("loginError");
    if (!msg) { el.classList.add("hidden"); el.textContent = ""; return; }
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  function updatePasswordToggleLabel() {
    var btn = qs("togglePasswordBtn");
    var input = qs("password");
    if (!btn || !input) return;
    var showing = input.type === "text";
    btn.setAttribute("aria-label", t(showing ? "hidePassword" : "showPassword"));
  }

  function formatCountdown(seconds) {
    var remaining = Math.max(0, Math.ceil(seconds));
    var minutes = Math.floor(remaining / 60);
    var secs = String(remaining % 60).padStart(2, "0");
    return String(minutes).padStart(2, "0") + ":" + secs;
  }

  function rateLimitRemaining() {
    return Math.max(0, Math.ceil((state.rateLimitUntil - Date.now()) / 1000));
  }

  function resendRemaining() {
    return Math.max(0, Math.ceil((state.resendUntil - Date.now()) / 1000));
  }

  function renderAuthControls() {
    var loginBtn = qs("loginBtn");
    var resendBtn = qs("resendOtpBtn");
    if (!loginBtn || !resendBtn) return;
    var rateSeconds = rateLimitRemaining();
    var resendSeconds = resendRemaining();

    if (rateSeconds) {
      var rateCountdown = formatCountdown(rateSeconds);
      loginBtn.disabled = true;
      resendBtn.disabled = true;
      loginBtn.textContent = t("tryAgainIn") + " " + rateCountdown;
      resendBtn.textContent = t("tryAgainIn") + " " + rateCountdown;
      return;
    }
    if (state.requestInFlight) {
      loginBtn.disabled = true;
      resendBtn.disabled = true;
      loginBtn.textContent = state.requestSource === "silent"
        ? t("loading")
        : (state.otpRequired ? t("verifying") : t("signingIn"));
      resendBtn.textContent = state.requestSource === "resend" ? t("resending") : t("resendOtp");
      return;
    }

    loginBtn.disabled = false;
    loginBtn.textContent = state.otpRequired ? t("verifySignIn") : t("signIn");
    resendBtn.disabled = !state.otpRequired || !!resendSeconds;
    resendBtn.textContent = resendSeconds ? t("resendIn") + " " + resendSeconds + "s" : t("resendOtp");
  }

  function setRequestBusy(busy, source) {
    state.requestInFlight = busy;
    state.requestSource = busy ? source : "";
    renderAuthControls();
  }

  function startResendCountdown(seconds) {
    state.resendUntil = Date.now() + (Math.max(0, seconds) * 1000);
    if (state.resendTimer) clearInterval(state.resendTimer);
    function tick() {
      if (!resendRemaining()) {
        clearInterval(state.resendTimer);
        state.resendTimer = null;
        state.resendUntil = 0;
      }
      renderAuthControls();
    }
    tick();
    state.resendTimer = setInterval(tick, 1000);
  }

  function getRetrySeconds(err) {
    var raw = (err && err.raw) || {};
    var value = raw.retry_after != null ? raw.retry_after
      : (raw.retryAfter != null ? raw.retryAfter
        : (raw.wait_seconds != null ? raw.wait_seconds : raw.waitSeconds));
    var seconds = Number(value);
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(Math.ceil(seconds), 3600);

    var message = String(raw.message || raw.error || (err && err.message) || "");
    var minutes = message.match(/wait\s+(\d+)\s+minutes?/i);
    if (minutes) return Math.min(Number(minutes[1]) * 60, 3600);
    var secondsMatch = message.match(/wait\s+(\d+)\s+seconds?/i);
    if (secondsMatch) return Math.min(Number(secondsMatch[1]), 3600);
    if (/wait\s+(?:one|a)\s+minute/i.test(message)) return 60;
    if (Number(err && err.status) === 429 || Number(raw.status) === 429 || /too many login attempts/i.test(message)) return 60;
    return 0;
  }

  function startRateLimit(seconds) {
    state.rateLimitUntil = Date.now() + (Math.min(Math.max(1, seconds), 3600) * 1000);
    if (state.rateLimitTimer) clearInterval(state.rateLimitTimer);
    function tick() {
      var remaining = rateLimitRemaining();
      if (!remaining) {
        clearInterval(state.rateLimitTimer);
        state.rateLimitTimer = null;
        state.rateLimitUntil = 0;
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
    renderAuthControls();
    qs("otp").focus();
  }

  function leaveOtpMode() {
    state.otpRequired = false;
    qs("usernameWrap").classList.remove("hidden");
    qs("passwordWrap").classList.remove("hidden");
    qs("otpWrap").classList.add("hidden");
    qs("otp").value = "";
    if (state.resendTimer) clearInterval(state.resendTimer);
    state.resendTimer = null;
    state.resendUntil = 0;
    renderAuthControls();
  }

  function handleAuthError(err, context) {
    var retrySeconds = getRetrySeconds(err);
    if (retrySeconds) {
      startRateLimit(retrySeconds);
      return;
    }
    if (err && err.code === "NETWORK") {
      setLoginError(t("networkFailure"));
      return;
    }
    if (context === "resend") {
      setLoginError(t("resendFailed"));
      return;
    }
    if (state.otpRequired) {
      setLoginError(t("invalidOtp"));
      qs("otp").select();
      return;
    }
    setLoginError(t("invalidCredentials"));
  }

  async function finishAuthentication() {
    state.otpRequired = false;
    state.lastLogin = { username: "", password: "" };
    showDashboard();
    await refreshDashboard();
    await connectRealtime();
    startAutoRefresh();
  }

  async function refreshDashboard(silent) {
    var btn = qs("refreshBtn");
    if (!silent) {
      btn.disabled = true;
      btn.textContent = t("refreshing");
    }
    qs("waStatus").textContent = "";
    try {
      state.data = await loadAnalyticsData();
      state.txPage = 1;
      renderDashboard();
    } catch (e) {
      state.data = makeEmptyData();
      state.txPage = 1;
      renderDashboard();
      qs("waStatus").textContent = e.message || t("apiError");
    } finally {
      if (!silent) {
        btn.disabled = false;
        btn.textContent = t("refresh");
      }
    }
  }

  function normalizePhone(phone) {
    return String(phone || "").replace(/\D+/g, "");
  }

  async function sendWhatsAppReminders() {
    var btn = qs("waReminderBtn");
    var status = qs("waStatus");
    var targets = ((state.data && state.data.reminderTargets) || []).filter(function (x) {
      return x && x.customerId && x.invoiceId;
    });
    if (!targets.length) {
      status.textContent = t("waNone");
      return;
    }

    // One reminder per unpaid invoice (same customer can get multiple)
    var seen = {};
    var queue = [];
    targets.forEach(function (item) {
      var key = String(item.customerId) + "#" + String(item.invoiceId);
      if (seen[key]) return;
      seen[key] = true;
      queue.push(item);
    });

    btn.disabled = true;
    status.textContent = t("waSending");
    var created = 0;
    var i;
    for (i = 0; i < queue.length; i += 1) {
      var item = queue[i];
      var phone = normalizePhone(item.phone);
      var messageText =
        "Payment reminder\n" +
        "Hello " + item.name + ",\n" +
        "Invoice #" + item.invoiceId + " is unpaid.\n" +
        "Outstanding amount: " + money(item.amount) + ".\n" +
        "Please complete payment. Thank you.";
      try {
        // Same route/params as biz1Self-Service OTP WhatsApp send
        var payload = {
          msg: messageText,
          message: messageText,
          customer_id: item.customerId,
          cust_id: item.customerId,
          from: "send_whatsapp"
        };
        if (phone) {
          payload.chart_selected_phone_no = phone;
          payload.phone = phone;
          payload.mobile = phone;
        }
        var res = await postRoute("Chat.SendCustomer", payload);
        var ok = res && (
          Number(res.success) === 1 ||
          res.success === true ||
          String(res.success) === "4" ||
          Number(res.output) === 1 ||
          (res.message_return && String(res.message_return).length > 0)
        );
        if (ok) created += 1;
      } catch (e) {
        // Continue with remaining reminders.
      }
    }

    btn.disabled = false;
    setText("waReminderBtn", t("waReminderBtn"));
    if (!created) {
      status.textContent = t("waFailed");
      return;
    }
    status.textContent = t("waDone") + " " + created + " " + t("waPartial");
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
      if (!username || !password) {
        setLoginError(t("requiredFields"));
        return;
      }
      if (state.otpRequired && !otp) {
        setLoginError(t("requiredOtp"));
        return;
      }
      var wasOtpMode = state.otpRequired;
      setRequestBusy(true, "login");
      try {
        var res = await loginBiz1({ username: username, password: password, otp: wasOtpMode ? otp : "" }, remember);
        if (res.otpRequired) {
          if (wasOtpMode) {
            setLoginError(t("invalidOtp"));
            qs("otp").select();
          } else {
            state.lastLogin = { username: username, password: password };
            enterOtpMode("otpSent");
          }
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
      if (!c.username || !c.password) {
        setLoginError(t("requiredFields"));
        return;
      }
      setLoginError("");
      setRequestBusy(true, "resend");
      try {
        var res = await loginBiz1({ username: c.username, password: c.password, otp: "" }, qs("rememberMe").checked);
        if (res.otpRequired) {
          qs("otp").value = "";
          setLoginError(t("otpResent"));
          startResendCountdown(20);
          qs("otp").focus();
        } else {
          await finishAuthentication();
        }
      } catch (err) {
        handleAuthError(err, "resend");
      } finally {
        setRequestBusy(false, "");
      }
    });

    qs("logoutBtn").addEventListener("click", function () {
      clearAuthStorage(false);
      try { sessionStorage.removeItem(sessionPassKey); } catch (e) { /* ignore */ }
      state.data = null;
      state.lastLogin = { username: "", password: "" };
      leaveOtpMode();
      if (state.refreshTimer) clearInterval(state.refreshTimer);
      disconnectRealtime();
      showLogin();
    });

    qs("refreshBtn").addEventListener("click", refreshDashboard);
    qs("langToggleBtn").addEventListener("click", toggleLanguage);
    qs("dashboardLangToggleBtn").addEventListener("click", toggleLanguage);
    qs("themeToggleBtn").addEventListener("click", toggleTheme);
    qs("dashboardThemeToggleBtn").addEventListener("click", toggleTheme);
    qs("togglePasswordBtn").addEventListener("click", function () {
      var input = qs("password");
      input.type = input.type === "password" ? "text" : "password";
      updatePasswordToggleLabel();
      input.focus();
    });
    qs("txPrevBtn").addEventListener("click", function () {
      state.txPage -= 1;
      renderTxPage();
    });
    qs("txNextBtn").addEventListener("click", function () {
      state.txPage += 1;
      renderTxPage();
    });
    document.querySelectorAll(".tab").forEach(function (btn) {
      btn.addEventListener("click", function () { switchTab(btn.getAttribute("data-tab")); });
    });

    qs("waReminderBtn").addEventListener("click", function () {
      sendWhatsAppReminders();
    });
  }

  function tokenIsCurrent(token) {
    if (!token) return false;
    try {
      var parts = String(token).split(".");
      if (parts.length < 2) return true;
      var encoded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (encoded.length % 4) encoded += "=";
      var payload = JSON.parse(atob(encoded));
      return !payload.exp || (Number(payload.exp) * 1000) > Date.now();
    } catch (e) {
      return true;
    }
  }

  function prefillRememberedCredentials() {
    var cached = readCachedCredentials();
    if (!cached) return null;
    qs("username").value = cached.username;
    qs("password").value = cached.password;
    qs("rememberMe").checked = localStorage.getItem(rememberKey) === "1";
    return cached;
  }

  async function trySilentLogin(cached) {
    if (!cached || state.requestInFlight) return false;
    setRequestBusy(true, "silent");
    try {
      var result = await loginBiz1({
        username: cached.username,
        password: cached.password,
        otp: ""
      }, localStorage.getItem(rememberKey) === "1");
      if (result.otpRequired) {
        clearAuthStorage(true);
        qs("password").value = "";
        qs("rememberMe").checked = false;
        state.lastLogin = { username: "", password: "" };
        leaveOtpMode();
        setLoginError("");
        return false;
      }
      await finishAuthentication();
      return true;
    } catch (err) {
      if (!(err && err.code === "NETWORK")) {
        clearAuthStorage(true);
        qs("password").value = "";
        qs("rememberMe").checked = false;
      } else {
        clearAuthStorage(false);
      }
      handleAuthError(err, "login");
      return false;
    } finally {
      setRequestBusy(false, "");
    }
  }

  async function bootstrap() {
    bindEvents();
    applyTheme();
    applyLanguage();
    setLiveChip(false, t("liveOff"));
    var cached = prefillRememberedCredentials();
    var role = localStorage.getItem(roleKey) || "";
    if (tokenIsCurrent(state.token) && role) {
      showDashboard();
      await refreshDashboard();
      await connectRealtime();
      startAutoRefresh();
    } else {
      if (state.token) clearAuthStorage(false);
      showLogin();
      if (cached) await trySilentLogin(cached);
    }
  }

  document.addEventListener("DOMContentLoaded", bootstrap);
})();
