(function () {
  "use strict";

  var t = window.OrderI18n ? window.OrderI18n.t : function (k) { return k; };

  function safeApplyI18n() {
    if (window.OrderI18n) {
      if (typeof window.OrderI18n.applyDom === "function") {
        window.OrderI18n.applyDom();
      } else if (typeof window.OrderI18n.applyToDOM === "function") {
        window.OrderI18n.applyToDOM();
      }
    }
  }

  var CIPHER_KEY = "BIZ1_ORDER_STATUS_APP_SECRET";
  var FALLBACK_KEYS = [
    CIPHER_KEY
  ];

  var STATIC_ORDER_STATUSES = [
    { id: "609", status_id: "609", name: "בבירור", name_he: "בבירור", name_en: "In Inquiry", color: "#f59e0b" },
    { id: "610", status_id: "610", name: "התוכנית לא נסגרה", name_he: "התוכנית לא נסגרה", name_en: "Plan Not Closed", color: "#9ca3af" },
    { id: "611", status_id: "611", name: "התוכנית נסגרה - בהמתנה לתשלום", name_he: "התוכנית נסגרה - בהמתנה לתשלום", name_en: "Plan Closed - Awaiting Payment", color: "#eab308" },
    { id: "615", status_id: "615", name: "שולם תיווך", name_he: "שולם תיווך", name_en: "Brokerage Paid", color: "#22c55e" }
  ];

  function decryptOrderToken(enc) {
    if (!enc) return null;
    var b64 = String(enc).trim().replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';

    for (var k = 0; k < FALLBACK_KEYS.length; k++) {
      var key = FALLBACK_KEYS[k];
      try {
        var raw = atob(b64);
        var utf8Str = raw.split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join('');
        var xorStr = decodeURIComponent(utf8Str);
        var jsonStr = "";
        for (var i = 0; i < xorStr.length; i++) {
          jsonStr += String.fromCharCode(xorStr.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        var parsed = JSON.parse(jsonStr);
        if (parsed && (parsed.order_id || parsed.id)) return parsed;
      } catch (e) {}
    }

    try {
      var plainRaw = atob(b64);
      var plainJson = JSON.parse(plainRaw);
      if (plainJson && (plainJson.order_id || plainJson.id)) return plainJson;
    } catch (e) {}

    return null;
  }

  var state = {
    orderId: "",
    apiToken: "",
    tenantUser: "",
    targetStatus: "",
    webhookUrl: "",
    queryClientName: "",
    order: null,
    statuses: STATIC_ORDER_STATUSES,
    selectedStatusId: null
  };

  function parseQueryParams() {
    var params = new URLSearchParams(window.location.search);
    var encData = params.get("data") || params.get("token") || params.get("payload") || params.get("e") || "";
    
    if (encData) {
      var decrypted = decryptOrderToken(encData);
      if (decrypted) {
        state.orderId = String(decrypted.order_id || decrypted.id || "").trim();
        state.apiToken = String(decrypted.api_token || decrypted.token || "").trim();
        state.tenantUser = String(decrypted.user || decrypted.username || "").trim();
      }
    }

    if (!state.orderId) {
      state.orderId = (params.get("id") || params.get("orders_for_cust_id") || params.get("order_id") || "").trim();
    }
    if (!state.apiToken) {
      state.apiToken = (params.get("api_token") || params.get("token") || "").trim();
    }
    if (!state.tenantUser) {
      state.tenantUser = (params.get("user") || "").trim();
    }

    state.targetStatus = (params.get("status") || params.get("order_status") || "").trim();
    state.webhookUrl = (params.get("webhook") || params.get("webhook_url") || "").trim();
    state.queryClientName = (params.get("client_name") || params.get("customer_name") || params.get("cust_name") || params.get("name") || "").trim();
  }

  function extractClientName(order) {
    if (!order) return "";
    if (typeof order === "string") return order.trim();
    var name = order.customer_name || order.client_name || order.cust_name || order.full_name || order.contactus_name || order.contact_name;
    if (name && name !== "—" && name !== "undefined") return String(name).trim();
    if (order.customer && typeof order.customer === "object") {
      var cName = order.customer.name || order.customer.customer_name || order.customer.full_name || order.customer.client_name;
      if (cName) return String(cName).trim();
    }
    if (order.contactusData && typeof order.contactusData === "object") {
      var cntName = order.contactusData.name || order.contactusData.customer_name || order.contactusData.full_name;
      if (cntName) return String(cntName).trim();
    }
    if (order.custom_fields && typeof order.custom_fields === "object") {
      for (var k in order.custom_fields) {
        if (/client_name|customer_name|cust_name|name/i.test(k) && order.custom_fields[k]) {
          return String(order.custom_fields[k]).trim();
        }
      }
    }
    if (order.name && order.name !== order.order_name && order.name !== order.product_name) {
      return String(order.name).trim();
    }
    return "";
  }

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showAlert(msg, isError) {
    var box = $("statusAlert");
    if (!box) return;
    if (!msg) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    box.className = "alert-box " + (isError ? "error" : "success");
    box.innerHTML = escapeHtml(msg);
  }

  function getApiDomain() {
    if (window.OrderApp && typeof window.OrderApp.DOMAIN === "string" && window.OrderApp.DOMAIN) {
      return window.OrderApp.DOMAIN;
    }
    return "https://info.bull36.com";
  }

  async function callAppRoute(route, params) {
    var domain = getApiDomain();
    var cleanRoute = route.charAt(0) === "/" ? route : "/app/" + route;
    var url = domain + cleanRoute;
    var body = new URLSearchParams();
    if (params) {
      for (var k in params) {
        if (params[k] != null) body.set(k, params[k]);
      }
    }
    var headers = {};
    try {
      var token = localStorage.getItem("biz1_sdk_bearer_token") || "";
      if (token) headers["Authorization"] = "Bearer " + token;
    } catch (e) {}

    var res = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body
    });
    return await res.json();
  }

  async function loadStatuses() {
    state.statuses = STATIC_ORDER_STATUSES;
  }

  async function fetchOrderDetails() {
    if (!state.orderId) return null;
    var user = state.tenantUser || "info";
    var token = state.apiToken || "";
    var orderId = state.orderId;
    var orderData = null;

    // Call GET API: https://{user}.biz1.co.il/api/get_order?api_token={api_token}&order_id={order_id}
    var apiUrl = "https://" + user + ".biz1.co.il/api/get_order?api_token=" + encodeURIComponent(token) + "&order_id=" + encodeURIComponent(orderId);
    try {
      var res = await fetch(apiUrl);
      if (res.ok) {
        var json = await res.json();
        if (json && (json.data || json.order || json.result || json.id)) {
          orderData = json.data || json.order || json.result || json;
        }
      }
    } catch (e) {
      console.warn("get_order direct API error:", e);
    }

    if (!orderData) {
      orderData = {
        id: orderId,
        orders_for_cust_id: orderId,
        customer_name: state.queryClientName || "",
        order_name: t("product") + " #" + orderId,
        total_price: "—",
        date: new Date().toISOString().slice(0, 10),
        order_status: state.targetStatus || "609"
      };
    }

    var cName = extractClientName(orderData) || state.queryClientName;
    if (cName) {
      orderData.customer_name = cName;
      orderData.client_name = cName;
    }

    return orderData;
  }

  function renderStatusBadge(statusId) {
    var idStr = String(statusId || "").trim();
    var found = state.statuses.find(function (s) { return String(s.id || s.status_id) === idStr; });
    var isHe = document.documentElement.lang === "he";
    var label = found ? (isHe ? (found.name_he || found.name || found.label) : (found.name || found.name_en || found.label)) : ("Status #" + idStr);
    var color = (found && found.color) || "#dbeafe";
    return '<span style="display:inline-block;padding:5px 14px;border-radius:999px;background:' + escapeHtml(color) + ';color:#0f172a;font-size:13px;font-weight:700;border:1px solid rgba(0,0,0,0.08);">' + escapeHtml(label) + '</span>';
  }

  function renderStatusPicker() {
    var grid = $("statusPickerGrid");
    if (!grid) return;
    grid.innerHTML = "";

    var isHe = document.documentElement.lang === "he";

    state.statuses.forEach(function (s) {
      var sid = String(s.id || s.status_id || "");
      var label = isHe ? (s.name_he || s.name || s.label || ("#" + sid)) : (s.name || s.name_en || s.label || ("#" + sid));
      var color = s.color || "#e2e8f0";

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "status-option-card" + (String(state.selectedStatusId) === sid ? " selected" : "");
      btn.dataset.statusId = sid;
      btn.innerHTML = '<div class="status-info-wrap">' +
        '<span class="status-color-dot" style="background:' + escapeHtml(color) + ';"></span>' +
        '<span class="status-title-name">' + escapeHtml(label) + '</span>' +
        '</div>' +
        '<div class="status-radio-check">✓</div>';

      btn.addEventListener("click", function () {
        state.selectedStatusId = sid;
        var allBtns = grid.querySelectorAll(".status-option-card");
        allBtns.forEach(function (b) {
          b.classList.toggle("selected", b.dataset.statusId === sid);
        });
      });

      grid.appendChild(btn);
    });
  }

  function formatDisplayDate(val) {
    var str = String(val || "").trim();
    if (!str) return "—";
    var match = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (match) {
      return match[1] + "-" + match[2] + "-" + match[3];
    }
    return str;
  }

  function renderOrderDetails() {
    var order = state.order || {};
    if ($("orderIdBadge")) $("orderIdBadge").textContent = "#" + (state.orderId || "—");
    if ($("orderTitle")) $("orderTitle").textContent = order.order_name || order.product_name || (t("product") + " #" + state.orderId);
    if ($("orderSub")) $("orderSub").textContent = t("customerId") + ": " + (order.cust_id || order.customer_id || "—");

    var clientName = extractClientName(order) || order.customer_name || order.client_name || state.queryClientName || "—";

    if ($("currentStatusBadge")) $("currentStatusBadge").innerHTML = renderStatusBadge(order.order_status || order.status || state.targetStatus || "609");
    if ($("detailCustomer")) $("detailCustomer").textContent = clientName;
    if ($("detailProduct")) $("detailProduct").textContent = order.order_name || order.product_name || "—";
    if ($("detailPrice")) $("detailPrice").textContent = order.total_price ? ("₪" + order.total_price) : "—";
    if ($("detailDate")) $("detailDate").textContent = formatDisplayDate(order.date || order.created_at || new Date().toISOString().slice(0, 10));

    renderStatusPicker();
  }

  async function handleStatusSubmit(ev) {
    ev.preventDefault();
    if (!state.orderId) {
      showAlert(t("invalidOrderId"), true);
      return;
    }
    if (!state.selectedStatusId) {
      showAlert(t("selectStatus"), true);
      return;
    }

    var submitBtn = $("submitStatusBtn");
    var notes = $("statusNotes") ? $("statusNotes").value.trim() : "";
    var customWebhook = $("webhookUrlInput") ? $("webhookUrlInput").value.trim() : "";
    var prevStatusId = (state.order && state.order.order_status) || state.targetStatus || "609";

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></div> <span>' + escapeHtml(t("updatingStatus")) + '</span>';

    var user = state.tenantUser || "info";
    var token = state.apiToken || "";
    var orderId = state.orderId;
    var statusId = state.selectedStatusId;
    var foundStatus = state.statuses.find(function (s) { return String(s.id || s.status_id) === String(statusId); });
    var isHe = document.documentElement.lang === "he";
    var statusNameParam =  statusId;

    // Call Update API: https://{user}.bull36.com/api.php?api_token={api_token}&api=update_order&order_id={order_id}&order-cf-status={status_name}
    var updateApiUrl = "https://" + user + ".bull36.com/api.php?api_token=" + encodeURIComponent(token) +
      "&api=update_order_2&order_id=" + encodeURIComponent(orderId) +
      "&order-cf-status=" + (statusNameParam);

    var apiResult = null;
    try {
      var res = await fetch(updateApiUrl, { method: "POST" });
      if (res.ok) {
        apiResult = await res.json();
      }
    } catch (e) {
      console.warn("update_order direct API error:", e);
    }

    // 2. Trigger Webhook (only if customWebhook is explicitly provided)
    if (customWebhook) {
      var webhookPayload = {
        event: "order_status_updated",
        orders_for_cust_id: state.orderId,
        id: state.orderId,
        order_status: state.selectedStatusId,
        status: state.selectedStatusId,
        notes: notes,
        api_result: apiResult,
        timestamp: new Date().toISOString(),
        source: "email_order_line_link"
      };

      try {
        await fetch(customWebhook, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(webhookPayload)
        });
      } catch (whErr) {
        console.warn("Webhook delivery notice:", whErr);
      }
    }

    // Update UI state & show success celebration screen
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> <span>' + escapeHtml(t("updateStatusBtn")) + '</span>';

    if ($("prevStatusDisplay")) $("prevStatusDisplay").innerHTML = renderStatusBadge(prevStatusId);
    if ($("newStatusDisplay")) $("newStatusDisplay").innerHTML = renderStatusBadge(state.selectedStatusId);
    if ($("respOrderId")) $("respOrderId").textContent = "#" + state.orderId;

    var custName = (apiResult && extractClientName(apiResult.data || apiResult)) ||
      (state.order && extractClientName(state.order)) ||
      state.queryClientName || "—";
    if ($("respCustomer")) $("respCustomer").textContent = custName;

    var prodName = (apiResult && (apiResult.order_name || apiResult.product_name)) ||
      (state.order && (state.order.order_name || state.order.product_name)) || "—";
    if ($("respProduct")) $("respProduct").textContent = prodName;

    if ($("respCrmStatus")) {
      var apiMsg = (apiResult && apiResult.message) ? apiResult.message : "Order status updated";
      $("respCrmStatus").innerHTML = '<span class="status-badge-success">✔ ' + escapeHtml(apiMsg) + '</span>';
    }

    if ($("respTime")) $("respTime").textContent = new Date().toLocaleString();

    $("statusCard").hidden = true;
    $("successCard").hidden = false;

    if (state.order) state.order.order_status = state.selectedStatusId;
    if ($("currentStatusBadge")) $("currentStatusBadge").innerHTML = renderStatusBadge(state.selectedStatusId);
  }

  function syncLangSegmentUI() {
    var cur = document.documentElement.lang || "en";
    var enSeg = document.querySelector(".lang-segment.lang-en");
    var heSeg = document.querySelector(".lang-segment.lang-he");
    if (enSeg && heSeg) {
      enSeg.classList.toggle("active", cur === "en");
      heSeg.classList.toggle("active", cur === "he");
    }
  }

  async function init() {
    parseQueryParams();
    safeApplyI18n();
    syncLangSegmentUI();

    // Set custom webhook URL if provided in query params
    if ($("webhookUrlInput")) $("webhookUrlInput").value = state.webhookUrl || "";

    if (!state.orderId) {
      $("statusLoading").hidden = true;
      showAlert(t("invalidOrderId"), true);
      return;
    }

    // Load statuses via POST /app/Order.Statuses
    await loadStatuses();

    // Fetch order details via POST /app/Order.Get
    state.order = await fetchOrderDetails();

    if (state.order && (state.order.order_status || state.targetStatus)) {
      state.selectedStatusId = String(state.order.order_status || state.targetStatus);
    } else if (state.statuses.length) {
      state.selectedStatusId = String(state.statuses[0].id || state.statuses[0].status_id);
    }

    $("statusLoading").hidden = true;
    $("statusCard").hidden = false;
    renderOrderDetails();

    // Event listeners
    var form = $("changeStatusForm");
    if (form) form.addEventListener("submit", handleStatusSubmit);

    var resetBtn = $("resetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        $("successCard").hidden = true;
        $("statusCard").hidden = false;
      });
    }

    var langBtn = $("langBtn");
    if (langBtn) {
      langBtn.addEventListener("click", function () {
        var currentLang = document.documentElement.lang;
        var nextLang = currentLang === "he" ? "en" : "he";
        localStorage.setItem("orderapp_lang", nextLang);
        document.documentElement.lang = nextLang;
        document.documentElement.dir = nextLang === "he" ? "rtl" : "ltr";
        if (window.OrderI18n && typeof window.OrderI18n.setLang === "function") {
          window.OrderI18n.setLang(nextLang);
        }
        safeApplyI18n();
        syncLangSegmentUI();
        renderOrderDetails();
      });
    }

    var themeBtn = $("themeBtn");
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        var currentTheme = document.documentElement.getAttribute("data-theme") || "light";
        var nextTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", nextTheme);
        localStorage.setItem("orderapp_theme", nextTheme);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
