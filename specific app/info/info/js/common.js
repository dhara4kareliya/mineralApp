window.OrderApp = (function _commonSub1() {
  "use strict";

  var APP_SEGMENTS = {
    "info6-order": 1,
    order: 1,
    orders: 1,
    assets: 1,
    css: 1,
    js: 1,
    index: 1,
    login: 1,
    customer: 1,
    homephp: 1,
    dhara: 1,
    mineral: 1,
    specific: 1,
    app: 1,
    info: 1
  };

  function normalizeTenantUser(raw) {
    var s = String(raw == null ? "" : raw).trim().toLowerCase();
    s = s.replace(/^https?:\/\//, "");
    s = s.replace(/\.bull36\.com.*$/i, "");
    s = s.replace(/\.biz1\.co\.il.*$/i, "");
    s = s.split("/")[0];
    s = s.replace(/[^a-z0-9-]/g, "");
    return s;
  }

  function isHandle(value) {
    return /^[a-z0-9][a-z0-9._-]{0,40}$/i.test(String(value || "").trim());
  }

  /** /eli/info6-order/ → eli */
  function pathUsername() {
    try {
      var parts = String(location.pathname || "")
        .split("/")
        .filter(Boolean);
      if (!parts.length) return "";
      var first = parts[0].replace(/\.html$/i, "");
      if (!isHandle(first)) return "";
      if (APP_SEGMENTS[first.toLowerCase()]) return "";
      return normalizeTenantUser(first);
    } catch (e) {
      return "";
    }
  }

  /** bull36.com = dev, biz1.co.il = live */
  function resolveApiRoot() {
    var host = String(
      (typeof location !== "undefined" && location.hostname) || ""
    ).toLowerCase();
    return host.indexOf("biz1.co.il") >= 0 ? "biz1.co.il" : "bull36.com";
  }

  function resolveTenantUser() {
    var host = String(
      (typeof location !== "undefined" && location.hostname) || ""
    ).toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host.indexOf("192.168.") === 0 || host.indexOf("10.") === 0) {
      return "info";
    }
    var fromPath = pathUsername();
    if (fromPath) return fromPath;
    return "info";
  }

  function resolveDomain() {
    return "https://" + resolveTenantUser() + "." + resolveApiRoot();
  }

  var DOMAIN = resolveDomain();
  var PAGE_SIZE = 10;
  var THEME_KEY = "orderapp_theme";
  var COLUMNS_KEY = "orderapp_field_cols";

  var client = null;
  var state = {
    page: "login",
    user: null,
    org: null,
    catalog: [],
    selectedCatalogId: "",
    statuses: [],
    customFields: [],
    columns: [],
    staticColumns: [],
    columnsUserSet: false,
    orders: [],
    orderCount: 0,
    orderStart: 0,
    customer: null,
    customerOrders: [],
    customerCount: 0,
    customerStart: 0,
    templates: [],
    emailPackByCust: {},
    pendingDeleteId: null,
    pendingDeleteIds: [],
    selectedIds: {},
    selectedCustByRow: {},
    selectedNameByRow: {},
    customerLocked: false,
    searchTimer: null,
    onRefresh: null,
    onRender: null
  };

  function t(key, vars) {
    return window.OrderI18n ? window.OrderI18n.t(key, vars) : key;
  }
  function $(id) { return document.getElementById(id); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function paidLabels() { return { 0: t("unpaid"), 1: t("paid"), 2: t("partlyPaid") }; }

  function loadScript(src) {
    return new Promise(function _commonSub2(resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) return resolve();
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = function _commonSub3() { reject(new Error("Failed to load " + src)); };
      document.head.appendChild(s);
    });
  }

  function toast(message, type) {
    var wrap = $("toasts");
    if (!wrap) return;
    var el = document.createElement("div");
    el.className = "toast" + (type ? " " + type : "");
    el.textContent = message;
    wrap.appendChild(el);
    setTimeout(function _commonSub4() { el.remove(); }, 4200);
  }

  function pulseRow(id) {
    qsa('[data-row-id="' + id + '"]').forEach(function _commonSub5(el) {
      el.classList.remove("pulse");
      void el.offsetWidth;
      el.classList.add("pulse");
    });
  }

  function setTheme(theme) {
    var next = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) { }
    var icon = next === "dark" ? "☾" : "☀";
    ["themeBtn", "loginThemeBtn"].forEach(function _commonSub6(id) {
      if ($(id)) $(id).textContent = icon;
    });
  }

  function toggleTheme() {
    var cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    setTheme(cur === "dark" ? "light" : "dark");
  }

  function showAlert(id, message) {
    var el = $(id);
    if (!el) return;
    if (!message) { el.hidden = true; el.textContent = ""; return; }
    el.hidden = false;
    el.textContent = message;
  }

  function errMessage(err) {
    if (!err) return "Request failed";
    if (typeof err === "string") return err;
    return (err.raw && (err.raw.message || err.raw.error)) || err.message || "Request failed";
  }

  function isUnauthorized(err) {
    return err && (err.status === 401 || /bearer|unauthorized|401/i.test(String(err.message || "")));
  }

  function rowId(row) {
    return String((row && (row.orders_for_cust_id || row.id || row.order_numbr || row.order_row_id)) || "");
  }
  function custIdOf(row) {
    if (!row) return "";
    var cid = row.cust_id || row.customer_id || row.c_id;
    if (cid != null && String(cid).trim() !== "") return String(cid);
    // Order rows have their own id / orders_for_cust_id — that is not the customer.
    if (row.orders_for_cust_id || row.order_numbr || row.order_row_id) return "";
    return String(row.id || "");
  }
  function catalogIdOf(row) {
    return String((row && (row.catalog_order_id || row.product_order_id || row.order_id || row.id)) || "");
  }
  function catalogNameOf(id) {
    id = String(id || "").trim();
    if (!id) return "";
    var found = (state.catalog || []).find(function _commonSub7(item) {
      return catalogIdOf(item) === id || String(item.id || "") === id;
    });
    if (!found) return "";
    return String(found.name || found.order_name || found.product_name || found.title || "").trim();
  }
  function productNameOf(row) {
    if (!row) return "";
    var named = displayScalar(row.order_name || row.product_name || row.catalog_name || row.order_title || row.title || "");
    var cid = String(row.catalog_order_id || row.product_order_id || row.order_id || "").trim();
    var fromCatalog = catalogNameOf(cid);
    if (fromCatalog && (!named || named === cid)) return fromCatalog;
    if (named && named !== cid) return named;
    if (fromCatalog) return fromCatalog;
    var bag = customFieldBag(row);
    var fromBag = bagLookup(bag, "order_name") || bagLookup(bag, "product_name") || bagLookup(bag, "product");
    if (fromBag) return displayScalar(fromBag);
    if (named) return named;
    var custN = customerName(row);
    if (row.name && row.name !== custN) return displayScalar(row.name);
    return "";
  }
  function customerName(row) {
    return (row && (row.customer_name || row.client_name || row.cust_name || row.name || row.full_name)) || t("customer");
  }

  function customerEmailOf(row) {
    if (!row) return "";
    var bag = customFieldBag(row);
    var fromBag = bagLookup(bag, "email_of_the_producer") || bagLookup(bag, "email") || bagLookup(bag, "mail") || bagLookup(bag, "customer_email");
    return String(
      row.email || row.mail || row.customer_email || row.email_of_the_producer || fromBag || ""
    ).trim();
  }

  function findRowById(id) {
    id = String(id || "");
    if (!id) return null;
    return (state.orders || []).concat(state.customerOrders || []).find(function _commonSub8(item) {
      return rowId(item) === id;
    }) || null;
  }
  function paidOf(row) {
    var v = row && (row.paid_status != null ? row.paid_status : row.paid_val);
    return String(v == null ? "" : v);
  }

  function flattenCustomFields(fields) {
    var out = [];
    (fields || []).forEach(function _commonSub9(field) {
      if (Array.isArray(field.numeric_data) && field.numeric_data.length) {
        field.numeric_data.forEach(function _commonSub10(sub) {
          out.push(Object.assign({}, sub, {
            en: sub.en || field.numeric_name_en || field.en,
            type: sub.type || "number"
          }));
        });
        return;
      }
      if (field.name || field.en) out.push(field);
    });
    return out;
  }

  function isHe() {
    return !!(window.OrderI18n && window.OrderI18n.getLang() === "he");
  }
  function normKey(value) {
    return String(value == null ? "" : value).trim().toLowerCase().replace(/[\s-]+/g, "_");
  }

  var STATIC_COL = {
    customer_name: { en: "Client Name", he: "שם לקוח", i18n: "colCustomer", kind: "customer" },
    client_name: { en: "Client Name", he: "שם לקוח", i18n: "colCustomer", kind: "customer" },
    date: { en: "Date", he: "תאריך", i18n: "colDate", kind: "date" },
    notes: { en: "Notes", he: "הערות", i18n: "colNotes", kind: "text" },
    id: { en: "Order Number", he: "מס׳ הזמנה", i18n: "colOrder", kind: "id" },
    orders_for_cust_id: { en: "Order Number", he: "מס׳ הזמנה", i18n: "colOrder", kind: "id" },
    total_price: { en: "Total Price", he: "סה״כ", i18n: "colTotal", kind: "price" },
    order_status: { en: "Order Status", he: "סטטוס הזמנה", i18n: "colStatus", kind: "status" },
    paid_status: { en: "Paid Status", he: "סטטוס תשלום", i18n: "colPaid", kind: "paid" },
    book_price: { en: "Price", he: "מחיר", kind: "price" },
    discount: { en: "Discount", he: "הנחה", kind: "price" },
    order_id: { en: "Order / Product name", he: "שם מוצר / הזמנה", i18n: "colOrderProduct", kind: "product" },
    order_name: { en: "Order / Product name", he: "שם מוצר / הזמנה", i18n: "colOrderProduct", kind: "product" },
    product: { en: "Order / Product name", he: "שם מוצר / הזמנה", i18n: "colOrderProduct", kind: "product" },
    product_name: { en: "Order / Product name", he: "שם מוצר / הזמנה", i18n: "colOrderProduct", kind: "product" },
    order_product_name: { en: "Order / Product name", he: "שם מוצר / הזמנה", i18n: "colOrderProduct", kind: "product" }
  };

  function loadColumnPrefs() {
    try {
      var saved = localStorage.getItem(COLUMNS_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        var keys = parseColumnKeys(parsed);
        if (keys.length) {
          state.columns = keys;
          state.columnsUserSet = true;
        }
      }
    } catch (e) { }
  }

  function saveColumnPrefs() {
    state.columnsUserSet = true;
    try {
      localStorage.setItem(COLUMNS_KEY, JSON.stringify(state.columns || []));
    } catch (e) { }
  }

  function sameColKey(a, b) {
    if (a == null || b == null) return false;
    if (String(a) === String(b)) return true;
    return normKey(a) === normKey(b);
  }

  function applyListMeta(raw) {
    if (!raw || typeof raw !== "object") return;
    if (raw.static_columns && raw.static_columns.length) state.staticColumns = raw.static_columns;
    if (raw.order_custom_fields && raw.order_custom_fields.length) {
      state.customFields = flattenCustomFields(raw.order_custom_fields);
    }
    if (!state.columnsUserSet && raw.columns) {
      state.columns = parseColumnKeys(raw.columns);
      if (!state.columns.some(function _commonSub11(key) { return sameColKey(key, "customer_name") || sameColKey(key, "client_name"); })) {
        state.columns.unshift("customer_name");
      }
    }
  }

  function findCustomField(key) {
    var needle = String(key || "").trim();
    if (!needle) return null;
    var slug = normKey(needle);
    var list = state.customFields || [];
    var i, field, name, en, he;
    for (i = 0; i < list.length; i++) {
      field = list[i];
      name = String(field.name || field.id || "");
      en = String(field.en || field.label_en || field.label || "");
      he = String(field.he || field.label_he || "");
      if (name === needle || en === needle || he === needle) return field;
      if (normKey(name) === slug || normKey(en) === slug || normKey(he) === slug) return field;
    }
    return null;
  }

  function skipFieldType(field) {
    var type = String((field && field.type) || "").toLowerCase();
    return type === "title" || type === "automation";
  }

  function columnKind(key, field) {
    var k = normKey(key);
    if (STATIC_COL[k] && STATIC_COL[k].kind) return STATIC_COL[k].kind;
    var type = String((field && (field.type || field.input_type)) || "").toLowerCase();
    if (type === "date" || type === "datetime" || type === "hebrew_date" || /date/.test(k)) return "date";
    if (type === "radio" || type === "select") return "select";
    if (type === "number" || type === "numeric" || type === "calc") return "price";
    return "text";
  }

  function makeColumn(key) {
    var field = findCustomField(key);
    var resolved = field ? (field.name || key) : String(key || "").trim();
    var std = STATIC_COL[resolved] || STATIC_COL[normKey(resolved)] || STATIC_COL[normKey(key)];
    var staticMeta = (state.staticColumns || []).find(function _commonSub12(item) {
      return item && sameColKey(item.key || item.name, resolved);
    });
    return {
      key: resolved,
      en: (field && (field.en || field.label_en || field.label)) || (staticMeta && staticMeta.label) || (std && std.en) || resolved,
      he: (field && (field.he || field.label_he)) || (std && std.he) || "",
      i18n: (std && std.i18n) || "",
      kind: columnKind(resolved, field),
      field: field || null
    };
  }

  function parseColumnKeys(raw) {
    if (raw == null || raw === "") return [];
    if (typeof raw === "string") {
      try { raw = JSON.parse(raw); } catch (e) {
        raw = String(raw).split(",").map(function _commonSub13(part) { return part.trim(); }).filter(Boolean);
      }
    }
    if (!Array.isArray(raw)) return [];
    return raw.map(function _commonSub14(item) {
      if (item == null || item === "") return "";
      if (typeof item === "string" || typeof item === "number") return String(item);
      return String(item.name || item.key || item.field || item.data || item.id || "");
    }).filter(Boolean);
  }

  function isCustomerCol(col) {
    if (!col) return false;
    var k = normKey(col.key || "");
    var en = normKey(col.en || "");
    var kind = col.kind || "";
    return kind === "customer" || k === "customer_name" || k === "client_name" || k === "cust_name" ||
      en === "client_name" || en === "customer_name";
  }

  function isProductCol(col) {
    if (!col) return false;
    var k = normKey(col.key || "");
    var en = normKey(col.en || "");
    var kind = col.kind || "";
    return kind === "product" ||
      k === "order_name" || k === "order_id" || k === "product" || k === "product_name" || k === "order_product_name" ||
      en === "order___product_name" || en === "order_product_name" || en === "order_name" || en === "product_name" ||
      /order.*product|product.*name/i.test(k) || /order.*product|product.*name/i.test(en);
  }

  function isFixedColumn(col) {
    if (!col) return false;
    if (state.page === "customer") {
      return isProductCol(col);
    }
    return isCustomerCol(col);
  }

  function availableFieldColumns() {
    var seen = {};
    var hasCustomer = false;
    var hasProduct = false;
    var out = [];
    function add(key) {
      if (!key) return;
      var col = makeColumn(key);
      if (!col || !col.key || skipFieldType(col.field)) return;
      var slug = normKey(col.key);
      if (!slug || slug === "checkbox" || slug === "action" || slug === "actions") return;

      if (state.page === "customer" && isCustomerCol(col)) return;

      if (isCustomerCol(col)) {
        if (hasCustomer) return;
        hasCustomer = true;
      }
      if (isProductCol(col)) {
        if (hasProduct) return;
        hasProduct = true;
      }

      if (seen[slug]) return;
      seen[slug] = true;
      out.push(col);
    }

    if (state.page !== "customer") {
      add("customer_name");
    } else {
      add("order_name");
    }
    (state.staticColumns || []).forEach(function _commonSub15(item) {
      add(item && (item.key || item.name));
    });
    ["date", "notes", "id", "total_price", "order_status", "paid_status", "book_price", "discount", "order_name"].forEach(add);
    (state.customFields || []).forEach(function _commonSub16(field) {
      if (field && (field.name || field.en)) add(field.name || field.en);
    });
    return out;
  }

  function isColumnOn(key) {
    var col = makeColumn(key);
    if (isFixedColumn(col)) return true;
    return parseColumnKeys(state.columns).some(function _commonSub17(item) {
      if (sameColKey(item, key)) return true;
      var itemCol = makeColumn(item);
      if (isProductCol(col) && isProductCol(itemCol)) return true;
      if (isCustomerCol(col) && isCustomerCol(itemCol)) return true;
      return false;
    });
  }

  function pickerFields() {
    var available = availableFieldColumns();
    var bySlug = {};
    available.forEach(function _commonSub18(col) { bySlug[normKey(col.key)] = col; });
    var seen = {};
    var hasCustomer = false;
    var hasProduct = false;
    var out = [];

    function addCol(col) {
      if (!col || !col.key || skipFieldType(col.field)) return;
      var slug = normKey(col.key);
      if (!slug || slug === "checkbox" || slug === "action" || slug === "actions") return;

      if (state.page === "customer" && isCustomerCol(col)) return;

      if (isCustomerCol(col)) {
        if (hasCustomer) return;
        hasCustomer = true;
      }
      if (isProductCol(col)) {
        if (hasProduct) return;
        hasProduct = true;
      }

      if (seen[slug]) return;
      seen[slug] = true;
      out.push(col);
    }

    // 1. Primary fixed column at index 0:
    if (state.page === "customer") {
      addCol(makeColumn("order_name"));
    } else {
      addCol(makeColumn("customer_name"));
    }

    // 2. Add columns from state.columns:
    parseColumnKeys(state.columns).forEach(function _commonSub19(key) {
      var col = bySlug[normKey(key)] || makeColumn(key);
      addCol(col);
    });

    // 3. Add remaining available columns:
    available.forEach(function _commonSub20(col) {
      addCol(col);
    });

    return out;
  }

  function visibleTableColumns(withCustomer) {
    var seen = {};
    var hasCustomer = false;
    var hasProduct = false;
    var out = [];

    function add(col) {
      if (!col || !col.key) return;
      if (skipFieldType(col.field)) return;
      var slug = normKey(col.key);
      if (!slug || slug === "checkbox" || slug === "action" || slug === "actions") return;

      // On customer page, exclude any customer columns
      if (!withCustomer && isCustomerCol(col)) return;

      if (isCustomerCol(col)) {
        if (hasCustomer) return;
        hasCustomer = true;
      }

      if (isProductCol(col)) {
        // Only one product column allowed (on customer page this is the fixed column; on orders page this prevents duplicate product columns)
        if (hasProduct) return;
        hasProduct = true;
      }

      if (seen[slug]) return;
      seen[slug] = true;
      out.push(col);
    }

    // Fixed first data column (nth-child(2)):
    // On orders page -> Client Name
    // On customer page -> Product / Order Name
    if (withCustomer) {
      add(makeColumn("customer_name"));
    } else {
      add(makeColumn("order_name"));
    }

    var keys = parseColumnKeys(state.columns);
    if (!keys.length) {
      ["date", "order_status", "paid_status", "total_price"].forEach(function _commonSub21(key) { add(makeColumn(key)); });
      return out;
    }
    keys.forEach(function _commonSub22(key) { add(makeColumn(key)); });
    return out;
  }

  function columnLabel(col) {
    if (!col) return "";
    if (isHe()) return col.he || col.en || col.key;
    if (col.en) return col.en;
    if (col.i18n) {
      var translated = t(col.i18n);
      if (translated && translated !== col.i18n) return translated;
    }
    return col.key;
  }

  function columnClass(col, withCustomer) {
    var kind = (col && col.kind) || "text";
    var extra = "";
    if (kind === "customer") extra += " col-client";
    if (kind === "product" && !withCustomer) extra += " col-product-fixed";
    if (/note/i.test((col && col.key) || "")) extra += " col-notes";
    return "col-" + kind + extra;
  }

  function pickerLabel(col) {
    if (!col) return "";
    if (isHe()) return col.he || col.en || col.key;
    if (col.en) return col.en;
    if (col.i18n) {
      var translated = t(col.i18n);
      if (translated && translated !== col.i18n) return translated;
    }
    return col.key;
  }

  function rerenderOrderViews() {
    if (typeof state.onRender === "function") state.onRender();
    renderFieldPicker();
  }

  function setColumnOn(key, on) {
    var col = makeColumn(key);
    if (isFixedColumn(col)) return;
    var keys = parseColumnKeys(state.columns);
    var exists = keys.some(function _commonSub23(item) {
      if (sameColKey(item, key)) return true;
      var itemCol = makeColumn(item);
      if (isProductCol(col) && isProductCol(itemCol)) return true;
      return false;
    });
    if (on && !exists) keys.push(key);
    if (!on) {
      keys = keys.filter(function _commonSub24(item) {
        if (sameColKey(item, key)) return false;
        var itemCol = makeColumn(item);
        if (isProductCol(col) && isProductCol(itemCol)) return false;
        return true;
      });
    }
    if (!keys.length) keys = [key];
    state.columns = keys;
    saveColumnPrefs();
    rerenderOrderViews();
  }

  function reorderPickerFields(fromKey, toKey) {
    if (!fromKey || !toKey || sameColKey(fromKey, toKey)) return;
    var fromCol = makeColumn(fromKey);
    var toCol = makeColumn(toKey);
    if (isFixedColumn(fromCol) || isFixedColumn(toCol)) return;
    var fields = pickerFields();
    var keys = fields.map(function _commonSub25(col) { return col.key; });
    var from = -1;
    var to = -1;
    keys.forEach(function _commonSub26(key, i) {
      if (from < 0 && sameColKey(key, fromKey)) from = i;
      if (to < 0 && sameColKey(key, toKey)) to = i;
    });
    if (from < 0 || to < 0) return;
    var moved = keys.splice(from, 1)[0];
    keys.splice(to, 0, moved);
    var onSet = {};
    parseColumnKeys(state.columns).forEach(function _commonSub27(key) { onSet[normKey(key)] = true; });
    state.columns = keys.filter(function _commonSub28(key) { return onSet[normKey(key)]; });
    saveColumnPrefs();
    rerenderOrderViews();
  }

  function openFieldPicker() {
    var panel = $("fieldPicker");
    if (!panel) return;
    panel.hidden = false;
    renderFieldPicker();
    if ($("fieldPickerSearch")) $("fieldPickerSearch").focus();
  }

  function closeFieldPicker() {
    var panel = $("fieldPicker");
    if (panel) panel.hidden = true;
  }

  function toggleFieldPicker() {
    var panel = $("fieldPicker");
    if (!panel) return;
    if (panel.hidden) openFieldPicker();
    else closeFieldPicker();
  }

  function renderFieldPicker() {
    var list = $("fieldPickerList");
    if (!list) return;
    var q = (($("fieldPickerSearch") && $("fieldPickerSearch").value) || "").trim().toLowerCase();
    var rows = pickerFields().filter(function _commonSub29(col) {
      if (!q) return true;
      return (pickerLabel(col) + " " + (col.he || "") + " " + col.key).toLowerCase().indexOf(q) >= 0;
    });
    if (!rows.length) {
      list.innerHTML = '<div class="field-picker-empty">' + escapeHtml(t("noFields")) + "</div>";
      return;
    }
    list.innerHTML = rows.map(function _commonSub30(col) {
      var fixed = isFixedColumn(col);
      var on = fixed || isColumnOn(col.key);
      return '<div class="field-picker-row' + (on ? " is-on" : "") + (fixed ? " is-disabled" : "") + '" draggable="' + (fixed ? "false" : "true") + '" data-field-key="' + escapeAttr(col.key) + '">' +
        '<span class="field-drag" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>' +
        '<label class="switch"><input type="checkbox" data-field-toggle="' + escapeAttr(col.key) + '"' + (on ? " checked" : "") + (fixed ? " disabled" : "") + ' /><span class="switch-ui"></span></label>' +
        '<span class="field-picker-name" title="' + escapeAttr(pickerLabel(col)) + '">' + escapeHtml(pickerLabel(col)) + "</span>" +
        "</div>";
    }).join("");
  }

  function customFieldBag(row) {
    var cf = row && (row.custom_fields || row.order_custom_fields || row.extra_fields);
    if (!cf) return {};
    if (typeof cf === "string") {
      try { cf = JSON.parse(cf); } catch (e) { return {}; }
    }
    if (Array.isArray(cf)) {
      var out = {};
      cf.forEach(function _commonSub31(item) {
        if (!item || typeof item !== "object") return;
        var key = item.name || item.key || item.en;
        if (!key) return;
        out[key] = item.value != null ? item.value : (item.val != null ? item.val : item.data);
      });
      return out;
    }
    return typeof cf === "object" ? cf : {};
  }

  function bagLookup(bag, key) {
    if (!bag || key == null || key === "") return "";
    if (bag[key] != null && bag[key] !== "") return bag[key];
    var slug = normKey(key);
    var hit = "";
    Object.keys(bag).some(function _commonSub32(k) {
      if (normKey(k) === slug) {
        hit = bag[k];
        return true;
      }
      return false;
    });
    return hit;
  }

  function displayScalar(value) {
    if (value == null || value === "") return "";
    if (typeof value === "object") {
      if (Array.isArray(value)) return value.map(displayScalar).filter(Boolean).join(", ");
      return displayScalar(value.label || value.name || value.value || value.en || value.he);
    }
    var text = String(value).trim();
    if (!text || text === "0000-00-00" || text.indexOf("0000-00-00") === 0) return "";
    return text;
  }

  function selectOptionLabel(field, value) {
    if (!field || value == null || value === "") return "";
    var needle = String(value);
    if (field.yes_val != null && String(field.yes_val) === needle) {
      return isHe() ? (field.yes_name_he || field.yes_val) : (field.yes_name_en || field.yes_val);
    }
    if (field.no_val != null && String(field.no_val) === needle) {
      return isHe() ? (field.no_name_he || field.no_val) : (field.no_name_en || field.no_val);
    }
    var opts = field.options || field.options_en || field.select_options || [];
    if (typeof opts === "string") {
      try { opts = JSON.parse(opts); } catch (e) { opts = String(opts).split(","); }
    }
    if (!Array.isArray(opts)) return "";
    var i, opt, ov, ol;
    for (i = 0; i < opts.length; i++) {
      opt = opts[i];
      if (opt && typeof opt === "object") {
        ov = opt.value != null ? opt.value : (opt.id != null ? opt.id : opt.name);
        ol = isHe()
          ? (opt.he || opt.label_he || opt.label || opt.en || ov)
          : (opt.en || opt.label_en || opt.label || opt.he || ov);
        if (String(ov) === needle || String(ol) === needle) return String(ol);
      } else if (String(opt) === needle) {
        return String(opt);
      }
    }
    return "";
  }

  function rowFieldValue(row, col) {
    if (!row || !col) return "";
    var bag = customFieldBag(row);
    var keys = [col.key, col.en, col.he];
    if (col.field) {
      keys = keys.concat([col.field.name, col.field.en, col.field.he, col.field.label]);
    }
    if (col.kind === "paid" && !col.field) keys = keys.concat(["paid_status", "paid_val", "paid"]);
    if (col.kind === "status" && !col.field) keys = keys.concat(["order_status", "order_status_id", "status"]);
    if (col.kind === "date" && !col.field) keys = keys.concat(["date", "order_for_date", "order_date"]);
    if (col.kind === "price" && !col.field) keys = keys.concat(["total_price", "price", "book_price"]);
    if (col.kind === "product" && !col.field) keys = keys.concat(["order_name", "name"]);
    var seen = {};
    var i, key, val;
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      if (!key || seen[key]) continue;
      seen[key] = true;
      val = bagLookup(bag, key);
      if (val != null && val !== "") return val;
    }
    seen = {};
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      if (!key || seen[key]) continue;
      seen[key] = true;
      if (col.kind !== "customer" && (key === "customer_name" || key === "full_name" || key === "name") && col.kind !== "product") continue;
      if (row[key] != null && row[key] !== "") return row[key];
    }
    return "";
  }

  function formatCellDate(value) {
    var text = displayScalar(value);
    if (!text) return "";
    return text.length >= 10 ? text.slice(0, 10) : text;
  }

  function columnCellHtml(row, col, withCustomer) {
    var kind = col.kind;
    if (kind === "customer") {
      var name = customerName(row);
      var cid = custIdOf(row);
      if (!cid) return escapeHtml(name);
      return '<a href="./customer.html?id=' + encodeURIComponent(cid) + '" class="customer-link" onclick="event.stopPropagation()">' + escapeHtml(name) + '</a>';
    }
    if (kind === "status") return statusBadge(row);
    if (kind === "paid") return paidBadge(row);
    if (kind === "id") return "#" + escapeHtml(rowId(row));
    var raw = rowFieldValue(row, col);
    if (kind === "date") return escapeHtml(formatCellDate(raw) || "—");
    if (kind === "select") {
      var labeled = selectOptionLabel(col.field, raw);
      return escapeHtml(labeled || displayScalar(raw) || "—");
    }
    if (kind === "product") {
      var prod = escapeHtml(productNameOf(row) || (row.order_numbr ? ("#" + row.order_numbr) : (rowId(row) ? ("#" + rowId(row)) : "—")));
      var rId = escapeAttr(rowId(row));
      return '<a href="#" data-edit="' + rId + '" class="customer-link product-link" onclick="event.preventDefault();" style="color:var(--primary);text-decoration:none;font-weight:600;">' + prod + '</a>';
    }
    return escapeHtml(displayScalar(raw) || "—");
  }

  function renderOrderHead(theadId, withCustomer) {
    var thead = $(theadId);
    if (!thead) return;
    var cols = visibleTableColumns(withCustomer);
    thead.innerHTML = "<tr>" +
      '<th class="col-check"><input type="checkbox" id="selectAllRows" aria-label="' + escapeHtml(t("selectAll")) + '" /></th>' +
      cols.map(function _commonSub33(col) {
        return '<th class="' + columnClass(col, withCustomer) + '">' + escapeHtml(columnLabel(col)) + "</th>";
      }).join("") +
      '<th class="col-actions">' + escapeHtml(t("actions") || "Actions") + '</th>' +
      "</tr>";
  }

  function formatDate(value) {
    if (!value || value === "0000-00-00" || String(value).indexOf("0000-00-00") === 0) return "—";
    return String(value).slice(0, 10);
  }

  var STATIC_ORDER_STATUSES = [
    { id: "609", status_id: "609", name: "בבירור", name_he: "בבירור", name_en: "In Inquiry", color: "#f59e0b" },
    { id: "610", status_id: "610", name: "התוכנית לא נסגרה", name_he: "התוכנית לא נסגרה", name_en: "Plan Not Closed", color: "#9ca3af" },
    { id: "611", status_id: "611", name: "התוכנית נסגרה - בהמתנה לתשלום", name_he: "התוכנית נסגרה - בהמתנה לתשלום", name_en: "Plan Closed - Awaiting Payment", color: "#eab308" },
    { id: "615", status_id: "615", name: "שולם תיווך", name_he: "שולם תיווך", name_en: "Brokerage Paid", color: "#2ecc71" }
  ];

  function statusMeta(row) {
    var rawId = row && (
      (row.order_status_id != null && String(row.order_status_id) !== "" && String(row.order_status_id) !== "0")
        ? row.order_status_id
        : (row.order_status || row.status_id)
    );
    var id = String(rawId || "");
    var found = (state.statuses || []).find(function _commonSub34(s) { return String(s.id || s.status_id) === id; });
    if (!found) {
      found = STATIC_ORDER_STATUSES.find(function(s) { return String(s.id) === id; });
    }
    var isHeb = isHe();
    var label = (row && (row.order_status_label || row.order_status_name || row.status_name)) ||
      (found && (isHeb ? (found.name_he || found.name || found.label) : (found.name_en || found.name || found.label))) ||
      (id ? "#" + id : "—");
    var color = (row && (row.order_status_color || row.color)) || (found && found.color) || "";
    return {
      id: id,
      label: label,
      color: color
    };
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
  }
  function todayLocal() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }
  function closeModal(id) {
    if ($(id)) $(id).hidden = true;
  }

  function goLogin() { location.href = "./index.html"; }
  function goOrders() { location.href = "./orders.html"; }
  function goCustomer(id) { location.href = "./customer.html?id=" + encodeURIComponent(id); }

  async function ensureSdk() {
    if (!window.Biz1SDK) {
      try {
        await loadScript(DOMAIN + "/realtime/socket.io/socket.io.js");
        await loadScript(DOMAIN + "/app/sdk/biz1-sdk.js");
      } catch (err) {
        if (!window.Biz1SDK) {
          throw new Error("Biz1 SDK failed to load. If CSP is blocking dynamic execution, include socket.io.js and biz1-sdk.js via script tags in HTML.");
        }
      }
    }
    if (!window.Biz1SDK) throw new Error("Biz1 SDK failed to load.");
    if (!client) {
      client = new window.Biz1SDK.Biz1Client({ domain: DOMAIN, storage: localStorage });
    }
    return client;
  }

  async function api(route, data, options) {
    try {
      return await client.request(route, data || {}, options || {});
    } catch (err) {
      if (isUnauthorized(err)) logout(true);
      throw err;
    }
  }

  async function afterLogin() {
    var basic = await api("User.Basic");
    var data = (basic && basic.data) || basic || {};
    state.user = data.user || {};
    state.org = data.org || {};
    if (data.api_token || data.token) state.api_token = data.api_token || data.token;
    try {
      if (state.org) localStorage.setItem("biz1_user_org", JSON.stringify(state.org));
      if (state.user) localStorage.setItem("biz1_user_info", JSON.stringify(state.user));
      var tok = getApiToken();
      if (tok) localStorage.setItem("biz1_api_token", tok);
    } catch (e) {}
    if ($("userChip")) $("userChip").textContent = state.user.name || state.user.email || t("signedIn");
    connectRealtime();
  }

  function normalizeBearerToken(raw) {
    return String(raw || "")
      .trim()
      .replace(/^\s*Bearer\s+/i, "")
      // URLSearchParams decodes an unencoded "+" as a space.
      .replace(/ /g, "+");
  }

  /** Read token from ?token=… or hash #login?token=… */
  function readUrlToken() {
    try {
      var fromSearch = new URLSearchParams(location.search || "").get("token");
      var value = normalizeBearerToken(fromSearch || "");
      if (value && !/\{\{\s*token\s*\}\}/i.test(value)) return value;

      var hash = String(location.hash || "").replace(/^#/, "");
      var q = hash.indexOf("?");
      if (q === -1) return "";
      var fromHash = new URLSearchParams(hash.slice(q + 1)).get("token");
      value = normalizeBearerToken(fromHash || "");
      if (!value || /\{\{\s*token\s*\}\}/i.test(value)) return "";
      return value;
    } catch (e) {
      return "";
    }
  }

  function clearUrlToken() {
    try {
      var url = new URL(location.href);
      var changed = false;
      if (url.searchParams.has("token")) {
        url.searchParams.delete("token");
        changed = true;
      }
      var hash = String(url.hash || "").replace(/^#/, "");
      if (hash) {
        var q = hash.indexOf("?");
        if (q !== -1) {
          var page = hash.slice(0, q);
          var params = new URLSearchParams(hash.slice(q + 1));
          if (params.has("token")) {
            params.delete("token");
            var rest = params.toString();
            url.hash = rest ? "#" + page + "?" + rest : (page ? "#" + page : "");
            changed = true;
          }
        }
      }
      if (changed) history.replaceState({}, "", url.pathname + url.search + url.hash);
    } catch (e) { /* ignore */ }
  }

  function tokenErrorMessage(err) {
    var raw = (err && err.raw) || {};
    var code = String(raw.error || raw.code || (err && err.code) || "").toLowerCase();
    var msg = String(raw.message || (err && err.message) || "").toLowerCase();
    if (code.indexOf("expired") !== -1 || msg.indexOf("expired") !== -1) {
      return "Session token expired. Please sign in again.";
    }
    if (code.indexOf("bearer") !== -1 || msg.indexOf("unauthorized") !== -1 || Number(err && err.status) === 401) {
      return "Invalid or unauthorized token.";
    }
    return errMessage(err) || "Login failed";
  }

  /**
   * Login with bearer token from URL (?token=…).
   * Validates via User.Basic with Authorization; only keeps session on success.
   */
  async function loginWithToken(token) {
    var clean = normalizeBearerToken(token);
    if (!clean) throw new Error("Token required");

    await ensureSdk();
    client.setToken(clean);

    try {
      // Call request directly — avoid api()'s auto-logout on 401 during token validation.
      var basic = await client.request("User.Basic", {}, {});
      var data = (basic && basic.data) || basic || {};
      var user = data.user;
      if (!user || typeof user !== "object" || !(user.id || user.user_id || user.email || user.name)) {
        var noUser = new Error((basic && (basic.message || basic.error)) || "Invalid or unauthorized token.");
        noUser.raw = basic;
        throw noUser;
      }
      state.user = user;
      state.org = data.org || {};
      if (data.api_token || data.token) state.api_token = data.api_token || data.token;
      try {
        if (state.org) localStorage.setItem("biz1_user_org", JSON.stringify(state.org));
        if (state.user) localStorage.setItem("biz1_user_info", JSON.stringify(state.user));
        var tok = getApiToken();
        if (tok) localStorage.setItem("biz1_api_token", tok);
      } catch (e0) {}
      if ($("userChip")) $("userChip").textContent = state.user.name || state.user.email || t("signedIn");
      try { connectRealtime(); } catch (e1) { /* optional on login page */ }
    } catch (err) {
      try { client.setToken(""); } catch (e0) { /* ignore */ }
      state.user = null;
      state.org = null;
      var wrapped = new Error(tokenErrorMessage(err));
      wrapped.status = err && err.status;
      wrapped.raw = err && err.raw;
      throw wrapped;
    }

    return { ok: true, user: state.user, org: state.org };
  }

  function logout(silent) {
    if (client) client.logout();
    state.user = null;
    state.customer = null;
    setLiveStatus(false);
    if (!silent) {
      try { sessionStorage.setItem("orderapp_flash", t("signedOut")); } catch (e) { }
    }
    goLogin();
  }

  var realtimeHandlersBound = false;

  function isRealtimeConnected() {
    try {
      return !!(client && client.realtime && client.realtime.socket && client.realtime.socket.connected);
    } catch (e) {
      return false;
    }
  }

  function setLiveStatus(on) {
    var connected = !!on;
    var pill = $("livePill");
    var text = $("liveText");
    if (pill) {
      pill.classList.toggle("is-on", connected);
      pill.setAttribute("title", connected ? t("online") : t("offline"));
    }
    if (text) {
      text.setAttribute("data-i18n", connected ? "online" : "offline");
      text.textContent = t(connected ? "online" : "offline");
    }
  }

  function syncLiveStatus() {
    setLiveStatus(isRealtimeConnected());
  }

  function connectRealtime() {
    setLiveStatus(false);
    try {
      var sock = client.realtime.connect({ platform: "web", path: "/realtime/socket.io" }) ||
        (client.realtime && client.realtime.socket);
      if (sock && typeof sock.on === "function") {
        sock.on("connect", function _commonSub35() { setLiveStatus(true); });
        sock.on("reconnect", function _commonSub36() { setLiveStatus(true); });
        sock.on("disconnect", function _commonSub37() { setLiveStatus(false); });
        sock.on("connect_error", function _commonSub38() {
          if (!isRealtimeConnected()) setLiveStatus(false);
        });
        if (sock.connected) setLiveStatus(true);
      }
      if (!window.__orderappLiveTimer) {
        window.__orderappLiveTimer = setInterval(syncLiveStatus, 2000);
      }
      if (!realtimeHandlersBound) {
        realtimeHandlersBound = true;
        client.realtime.on("biz1:ready", function _commonSub39() {
          setLiveStatus(true);
          toast(t("liveConnected"), "live");
        });
        client.realtime.on("*", function _commonSub40(event) {
          if (!event || event === true) return;
          var key = event.key || "";
          var payload = event.payload || event;
          if (!key || key === "biz1:ready" || key === "rooms:refresh") return;
          toast(t("livePrefix") + key.replace(/\./g, " "), "live");
          var oid = payload.orders_for_cust_id || payload.order_id || payload.id;
          if (oid) pulseRow(oid);
          if (typeof state.onRefresh === "function") state.onRefresh(payload);
          if (/email/.test(key)) toast(t("emailActivity"), "live");
        });
      }
    } catch (e) {
      setLiveStatus(false);
    }
  }

  async function requireAuth() {
    await ensureSdk();
    if (!client.getToken()) {
      goLogin();
      throw new Error("Login required");
    }
    await afterLogin();
    return client;
  }

  async function loadLookups() {
    loadColumnPrefs();
    var fields = await api("Order.Fields");
    applyListMeta(fields);
    var statuses = await api("Order.Statuses");
    state.statuses = statuses.data || [];
    if (!state.statuses.length && Array.isArray(fields.order_statuses)) {
      state.statuses = fields.order_statuses;
    }
    fillStatusSelects();
    renderFieldPicker();
  }

  function statusName(s) {
    var id = s.id || s.status_id;
    if (window.OrderI18n && window.OrderI18n.getLang() === "he") {
      return s.name_he || s.name_en || s.name || s.label || ("#" + id);
    }
    return s.name_en || s.name_he || s.name || s.label || ("#" + id);
  }

  function fillStatusSelects() {
    if ($("filterStatus")) {
      var selectedFilter = $("filterStatus").value;
      $("filterStatus").innerHTML = '<option value="">' + escapeHtml(t("allStatuses")) + "</option>" + state.statuses.map(function _commonSub41(s) {
        var id = s.id || s.status_id;
        return '<option value="' + id + '">' + escapeHtml(statusName(s)) + "</option>";
      }).join("");
      $("filterStatus").value = selectedFilter;
    }
    if ($("orderStatus")) {
      var selectedOrder = $("orderStatus").value;
      $("orderStatus").innerHTML = '<option value="">' + escapeHtml(t("selectStatus")) + "</option>" + state.statuses.map(function _commonSub42(s) {
        var id = s.id || s.status_id;
        return '<option value="' + id + '">' + escapeHtml(statusName(s)) + "</option>";
      }).join("");
      $("orderStatus").value = selectedOrder;
    }
  }

  function fillCatalogSelect() {
    if (!$("orderCatalog")) return;
    var selected = $("orderCatalog").value;
    $("orderCatalog").innerHTML = '<option value="">' + escapeHtml(t("selectProduct")) + "</option>" + state.catalog.map(function _commonSub43(item) {
      var id = catalogIdOf(item);
      return '<option value="' + id + '" data-price="' + escapeHtml(item.price || "") + '">' +
        escapeHtml(item.name || item.order_name || (t("product") + " " + id)) + "</option>";
    }).join("");
    if (selected) $("orderCatalog").value = selected;
  }

  function renderCatalogChips() {
    var wrap = $("catalogChips");
    if (!wrap) return;
    if (!state.catalog.length) {
      wrap.innerHTML = '<span class="chip">' + escapeHtml(t("noCatalog")) + "</span>";
      return;
    }
    if (!state.selectedCatalogId && state.catalog[0]) {
      state.selectedCatalogId = catalogIdOf(state.catalog[0]);
    }
    wrap.innerHTML = state.catalog.map(function _commonSub44(item) {
      var id = catalogIdOf(item);
      var active = String(state.selectedCatalogId) === id;
      return '<button type="button" class="chip' + (active ? " active" : "") + '" data-catalog="' + id + '" role="tab" aria-selected="' + (active ? "true" : "false") + '">' +
        escapeHtml(item.name || item.order_name || ("Product " + id)) + "</button>";
    }).join("");
  }

  function paidBadge(row) {
    var paid = paidOf(row);
    var labels = paidLabels();
    var cls = paid === "1" ? "badge-paid" : paid === "2" ? "badge-part" : "badge-unpaid";
    return '<span class="badge ' + cls + '">' + escapeHtml(labels[paid] || labels[0]) + "</span>";
  }

  function statusBadge(row) {
    var meta = statusMeta(row);
    if (!meta.id || meta.id === "0") return '<span class="badge">—</span>';
    var style = meta.color ? ' style="background:' + escapeHtml(meta.color) + ';color:#fff;"' : "";
    return '<span class="badge"' + style + ">" + escapeHtml(meta.label) + "</span>";
  }

  function actionButtons(row) {
    var id = rowId(row);
    var cid = custIdOf(row);
    var iconEdit = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9" stroke-linecap="round"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" stroke-linejoin="round"/></svg>';
    var iconDelete = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var iconEmail = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16v12H4V6z" stroke-linejoin="round"/><path d="m4 7 8 6 8-6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return '<div class="row-actions">' +
      '<button type="button" class="btn btn-action btn-edit" data-edit="' + id + '" title="' + escapeAttr(t("edit")) + '" aria-label="' + escapeAttr(t("edit")) + '">' + iconEdit + "</button>" +
      '<button type="button" class="btn btn-action btn-delete" data-delete="' + id + '" title="' + escapeAttr(t("delete")) + '" aria-label="' + escapeAttr(t("delete")) + '">' + iconDelete + "</button>" +
      (cid ? '<button type="button" class="btn btn-action btn-email" data-email="' + cid + '" title="' + escapeAttr(t("email")) + '" aria-label="' + escapeAttr(t("email")) + '">' + iconEmail + "</button>" : "") +
      "</div>";
  }

  function selectedIdList() {
    return Object.keys(state.selectedIds || {}).filter(function _commonSub45(id) {
      return !!state.selectedIds[id];
    });
  }

  function isRowSelected(id) {
    return !!(id && state.selectedIds[String(id)]);
  }

  function setRowSelected(id, selected, custId, custName) {
    id = String(id || "");
    if (!id) return;
    if (selected) {
      state.selectedIds[id] = true;
      if (custId) state.selectedCustByRow[id] = String(custId);
      if (custName) state.selectedNameByRow[id] = String(custName);
    } else {
      delete state.selectedIds[id];
      delete state.selectedCustByRow[id];
      delete state.selectedNameByRow[id];
    }
    syncBulkBar();
  }

  function clearSelection() {
    state.selectedIds = {};
    state.selectedCustByRow = {};
    state.selectedNameByRow = {};
    qsa(".row-check").forEach(function _commonSub46(box) { box.checked = false; });
    qsa(".order-row.is-selected, .order-card.is-selected").forEach(function _commonSub47(el) {
      el.classList.remove("is-selected");
    });
    var all = $("selectAllRows");
    if (all) {
      all.checked = false;
      all.indeterminate = false;
    }
    syncBulkBar();
  }

  function selectedCustomerIds() {
    var groups = [];
    var fallbackName = String(t("customer") || "").trim().toLowerCase();
    selectedIdList().forEach(function _commonSub48(id) {
      var row = findRowById(id);
      var cid = String(state.selectedCustByRow[id] || (row ? custIdOf(row) : "") || "").trim();
      if (cid && cid === String(id)) cid = "";
      var name = String(
        (state.selectedNameByRow && state.selectedNameByRow[id]) ||
        (row ? customerName(row) : "") ||
        ""
      ).trim().toLowerCase();
      if (name && name === fallbackName) name = "";
      var email = String(row ? customerEmailOf(row) : "").trim().toLowerCase();
      var existing = groups.find(function _commonSub49(g) {
        return (cid && g.cid && g.cid === cid) ||
          (email && g.email && g.email === email) ||
          (name && g.name && g.name === name);
      });
      if (existing) {
        if (!existing.cid && cid) existing.cid = cid;
        if (!existing.email && email) existing.email = email;
        if (!existing.name && name) existing.name = name;
        return;
      }
      groups.push({ cid: cid, name: name, email: email });
    });
    return groups.map(function _commonSub50(g) { return g.cid; }).filter(Boolean);
  }

  function visibleRowChecks() {
    return qsa(".row-check").filter(function _commonSub51(box) {
      return !!(box.offsetParent || (box.getClientRects && box.getClientRects().length));
    });
  }

  function syncBulkBar() {
    var count = selectedIdList().length;
    var custCount = selectedCustomerIds().length;
    var bar = $("bulkBar");
    var meta = $("bulkMeta");
    var emailMeta = $("bulkEmailMeta");
    var emailBtn = $("bulkEmailBtn");
    if (bar) bar.hidden = count === 0;
    if (meta) meta.textContent = count ? String(count) : "";
    if (emailMeta) emailMeta.textContent = custCount ? String(custCount) : "";
    if (emailBtn) emailBtn.disabled = custCount === 0;
    var all = $("selectAllRows");
    if (all) {
      var boxes = visibleRowChecks();
      if (!boxes.length) boxes = qsa(".row-check");
      var ids = {};
      var checkedIds = {};
      boxes.forEach(function _commonSub52(box) {
        var id = box.getAttribute("data-select-id");
        if (!id) return;
        ids[id] = true;
        if (box.checked || isRowSelected(id)) checkedIds[id] = true;
      });
      var total = Object.keys(ids).length;
      var checked = Object.keys(checkedIds).length;
      all.checked = total > 0 && checked === total;
      all.indeterminate = checked > 0 && checked < total;
    }
  }

  function rowCheckCell(id, cid, custName) {
    return '<td class="col-check"><input type="checkbox" class="row-check" data-select-id="' + escapeHtml(id) + '" data-cust-id="' + escapeHtml(cid || "") + '" data-cust-name="' + escapeAttr(custName || "") + '"' +
      (isRowSelected(id) ? " checked" : "") + ' aria-label="' + escapeHtml(t("selectRow")) + '" /></td>';
  }

  function orderTableRow(row, withCustomer) {
    var id = rowId(row);
    var cid = custIdOf(row);
    var name = customerName(row);
    var selected = isRowSelected(id);
    var cols = visibleTableColumns(withCustomer);
    return '<tr class="order-row' + (selected ? " is-selected" : "") + '" data-row-id="' + id + '">' +
      rowCheckCell(id, cid, name) +
      cols.map(function _commonSub53(col) {
        var cls = columnClass(col, withCustomer);
        var inner = columnCellHtml(row, col, withCustomer);
        if (cls.indexOf("col-notes") !== -1) {
          inner = '<div class="note-clamp">' + inner + '</div>';
        }
        return '<td class="' + cls + '">' + inner + "</td>";
      }).join("") +
      '<td class="col-actions">' + actionButtons(row) + "</td>" +
      "</tr>";
  }

  function orderCard(row, withCustomer) {
    var id = rowId(row);
    var cid = custIdOf(row);
    var name = customerName(row);
    var selected = isRowSelected(id);
    var cols = visibleTableColumns(withCustomer);
    return '<article class="order-card card' + (selected ? " is-selected" : "") + '" data-row-id="' + id + '">' +
      '<label class="card-check"><input type="checkbox" class="row-check" data-select-id="' + escapeHtml(id) + '" data-cust-id="' + escapeHtml(cid || "") + '" data-cust-name="' + escapeAttr(name || "") + '"' +
      (selected ? " checked" : "") + ' aria-label="' + escapeHtml(t("selectRow")) + '" /></label>' +
      '<div class="card-fields">' + cols.map(function _commonSub54(col) {
        var inner = columnCellHtml(row, col, withCustomer) || "—";
        if (columnClass(col).indexOf("col-notes") !== -1) {
          inner = '<div class="note-clamp">' + inner + '</div>';
        }
        return '<div class="card-field"><span>' + escapeHtml(columnLabel(col)) + "</span><div>" + inner + "</div></div>";
      }).join("") + "</div>" +
      actionButtons(row) +
      "</article>";
  }

  function openOrderModal(opts) {
    opts = opts || {};
    if (!$("orderModal")) return;
    showAlert("orderFormAlert");
    $("orderForm").reset();
    $("orderRowId").value = opts.rowId || "";
    $("orderCustId").value = opts.custId || "";
    $("customerSearch").value = "";
    $("customerSuggest").hidden = true;
    $("pickedCustomer").hidden = !opts.custId;
    if (opts.custId) {
      $("pickedCustomer").hidden = false;
      $("pickedCustomer").textContent = opts.customerName || t("customerHash", { id: opts.custId });
    }
    state.customerLocked = !!opts.lockCustomer;
    $("customerPickField").style.display = state.customerLocked ? "none" : "";
    $("orderModalTitle").textContent = opts.rowId ? t("editOrderRow") : (state.customerLocked ? t("addOrderRow") : t("createOrder"));
    fillCatalogSelect();
    fillStatusSelects();
    $("orderCatalog").value = opts.catalogId || state.selectedCatalogId || "";
    $("orderDate").value = opts.date || todayLocal();
    $("orderStatus").value = opts.status || "";
    $("orderPrice").value = opts.price || "";
    $("orderTotal").value = opts.total || opts.price || "";
    $("orderDiscount").value = opts.discount || "0";
    $("orderPaid").value = opts.paid != null && opts.paid !== "" ? String(opts.paid) : "0";
    $("orderNotes").value = opts.notes || "";
    renderCustomFields(opts.custom || {});
    $("orderModal").hidden = false;
  }

  function formatCustomFieldLabel(rawName, field, isHe) {
    if (isHe) {
      if (field && (field.he || field.label_he)) return field.he || field.label_he;
    }
    if (field && (field.en || field.label_en || field.label)) {
      var l = field.en || field.label_en || field.label;
      if (l && l !== field.name && l !== field.id) return l;
    }
    var str = String(rawName || "").trim();
    if (!str) return "";
    return str
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map(function (w) {
        if (!w) return "";
        var low = w.toLowerCase();
        if (low === "hebrow") return "Hebrew";
        if (low === "id") return "ID";
        return w.charAt(0).toUpperCase() + w.slice(1);
      })
      .join(" ");
  }

  function detectCustomFieldType(field, name) {
    var rawType = String((field && (field.type || field.input_type)) || "").toLowerCase();
    var k = String(name || "").toLowerCase().replace(/[\s-]+/g, "_");
    if (rawType === "select" || rawType === "radio") return "select";
    if (k.indexOf("hebrew") !== -1 || k.indexOf("hebrow") !== -1) return "text";
    if (rawType === "date" || rawType === "datetime" || k === "date" || /_date|date_/i.test(k) || k.indexOf("date") !== -1) return "date";
    if (rawType === "email" || /email|mail/i.test(k)) return "email";
    if (rawType === "tel" || rawType === "phone" || /phone|mobile|tel/i.test(k)) return "tel";
    if (rawType === "number" || rawType === "numeric" || rawType === "calc" || /price|total|count|qty|quantity|amount/i.test(k)) return "number";
    if (rawType === "textarea" || /description|comments/i.test(k)) return "textarea";
    return "text";
  }

  function renderCustomFields(values) {
    var wrap = $("customFields");
    if (!wrap) return;
    values = values || {};
    var fields = state.customFields || [];
    if (!fields.length) {
      wrap.innerHTML = "";
      return;
    }
    var he = window.OrderI18n && window.OrderI18n.getLang() === "he";
    var filledCount = 0;
    fields.forEach(function (field) {
      var name = field.name || field.id;
      if (values[name] != null && String(values[name]).trim() !== "") {
        filledCount++;
      }
    });

    var isExpanded = filledCount > 0;

    var fieldsHtml = fields.map(function _commonSub55(field) {
      var name = field.name || field.id;
      var label = formatCustomFieldLabel(name, field, he);
      var val = values[name] != null ? values[name] : "";
      var detectedType = detectCustomFieldType(field, name);

      if (detectedType === "select" && Array.isArray(field.options) && field.options.length) {
        return '<label class="field"><span>' + escapeHtml(label) + '</span><select data-cf="' + escapeHtml(name) + '">' +
          '<option value=""></option>' + field.options.map(function _commonSub56(opt) {
            var ov = typeof opt === "object" ? (opt.value != null ? opt.value : (opt.id != null ? opt.id : opt.name)) : opt;
            var ol = typeof opt === "object" ? (opt.label || opt.name || opt.en || opt.he || ov) : opt;
            return '<option value="' + escapeHtml(String(ov)) + '"' + (String(val) === String(ov) ? " selected" : "") + ">" + escapeHtml(String(ol)) + "</option>";
          }).join("") + "</select></label>";
      }

      if (detectedType === "textarea") {
        return '<label class="field" style="grid-column: 1 / -1;"><span>' + escapeHtml(label) + '</span><textarea data-cf="' + escapeHtml(name) + '" rows="2">' + escapeHtml(String(val)) + '</textarea></label>';
      }

      return '<label class="field"><span>' + escapeHtml(label) + '</span><input type="' + escapeHtml(detectedType) + '" data-cf="' + escapeHtml(name) + '" value="' + escapeHtml(String(val)) + '" /></label>';
    }).join("");

    var toggleText = t("additionalFields") || "Additional details";
    var badgeHtml = filledCount > 0 ? '<span class="more-fields-badge">' + filledCount + '</span>' : '';

    wrap.innerHTML = '<div class="more-fields-toggle-wrap">' +
      '<button type="button" class="more-fields-toggle-btn" id="toggleMoreFields" aria-expanded="' + (isExpanded ? 'true' : 'false') + '" data-toggle-more-fields>' +
      '<div class="more-fields-toggle-left">' +
      '<svg class="more-fields-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
      '<path d="M12 5v14M5 12h14" stroke-linecap="round"/>' +
      '</svg>' +
      '<span class="more-fields-label">' + escapeHtml(toggleText) + '</span>' +
      badgeHtml +
      '</div>' +
      '<svg class="more-fields-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
      '<path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>' +
      '</button>' +
      '</div>' +
      '<div class="more-fields-content grid-2" id="moreFieldsContent"' + (isExpanded ? '' : ' hidden') + '>' +
      fieldsHtml +
      '</div>';
  }

  function collectCustomFields() {
    var out = {};
    qsa("[data-cf]").forEach(function _commonSub57(el) {
      if (el.value !== "") out[el.getAttribute("data-cf")] = el.value;
    });
    return out;
  }

  async function saveOrder(ev) {
    ev.preventDefault();
    showAlert("orderFormAlert");
    var custId = $("orderCustId").value.trim();
    var catalogId = $("orderCatalog").value;
    if (!custId) { showAlert("orderFormAlert", t("selectCustomer")); return; }
    if (!catalogId) { showAlert("orderFormAlert", t("selectCatalog")); return; }
    var custom = collectCustomFields();
    var payload = {
      cust_id: custId,
      date: $("orderDate").value,
      notes: $("orderNotes").value,
      price: $("orderPrice").value,
      total_price: $("orderTotal").value,
      discount: $("orderDiscount").value,
      paid_status: $("orderPaid").value,
      order_status: $("orderStatus").value
    };
    Object.keys(payload).forEach(function _commonSub58(key) {
      if (payload[key] === "" || payload[key] == null) delete payload[key];
    });
    if (Object.keys(custom).length) payload.custom_fields = custom;
    $("orderSaveBtn").disabled = true;
    try {
      var rowIdVal = $("orderRowId").value.trim();
      if (rowIdVal) {
        payload.orders_for_cust_id = rowIdVal;
        payload.product_order_id = catalogId;
        payload.catalog_order_id = catalogId;
        await api("Order.Edit", payload);
        toast(t("orderUpdated"));
      } else {
        payload.order_id = catalogId;
        var created = await api("Order.Add", payload);
        toast(t("orderCreated"));
        var newId = created.orders_for_cust_id || created.order_id;
        if (newId) pulseRow(newId);
      }
      closeModal("orderModal");
      if (typeof state.onRefresh === "function") await state.onRefresh();
    } catch (err) {
      showAlert("orderFormAlert", errMessage(err));
    } finally {
      $("orderSaveBtn").disabled = false;
    }
  }

  async function editOrder(id) {
    try {
      var got = await api("Order.Get", { orders_for_cust_id: id });
      var row = (got && got.data) || {};
      var form = await api("Order.FormData", { orders_for_cust_id: id, cust_id: row.cust_id });
      if (form.order_custom_fields && form.order_custom_fields.length) {
        state.customFields = flattenCustomFields(form.order_custom_fields);
      }
      if (form.order_statuses && form.order_statuses.length) {
        state.statuses = form.order_statuses;
        fillStatusSelects();
      }
      openOrderModal({
        rowId: id,
        custId: row.cust_id || row.customer_id,
        customerName: row.customer_name || row.name,
        catalogId: row.catalog_order_id || row.product_order_id || row.order_id,
        date: (row.date || "").slice(0, 10),
        status: row.order_status,
        price: row.price || row.book_price,
        total: row.total_price,
        discount: row.discount,
        paid: row.paid_status,
        notes: row.notes || row.note,
        custom: customFieldBag(row),
        lockCustomer: state.page === "customer"
      });
    } catch (err) {
      toast(errMessage(err));
    }
  }

  function askDelete(id) {
    state.pendingDeleteIds = id ? [String(id)] : [];
    state.pendingDeleteId = id || null;
    updateDeleteConfirmCopy();
    if ($("confirmModal")) $("confirmModal").hidden = false;
  }

  function askDeleteSelected() {
    var ids = selectedIdList();
    if (!ids.length) return;
    state.pendingDeleteIds = ids.slice();
    state.pendingDeleteId = ids.length === 1 ? ids[0] : null;
    updateDeleteConfirmCopy();
    if ($("confirmModal")) $("confirmModal").hidden = false;
  }

  function updateDeleteConfirmCopy() {
    var n = (state.pendingDeleteIds || []).length;
    var title = $("confirmTitle");
    var text = $("confirmText");
    var bulk = n > 1;
    if (title) {
      title.setAttribute("data-i18n", bulk ? "deleteSelectedTitle" : "deleteOrderRow");
      title.textContent = t(bulk ? "deleteSelectedTitle" : "deleteOrderRow");
    }
    if (text) {
      text.setAttribute("data-i18n", bulk ? "deleteSelectedConfirm" : "deleteConfirmText");
      text.textContent = bulk ? t("deleteSelectedConfirm", { n: n }) : t("deleteConfirmText");
    }
  }

  async function confirmDelete() {
    var ids = (state.pendingDeleteIds || []).slice();
    if (!ids.length && state.pendingDeleteId) ids = [String(state.pendingDeleteId)];
    if (!ids.length) return;
    $("confirmDeleteBtn").disabled = true;
    var ok = 0;
    var fail = 0;
    try {
      for (var i = 0; i < ids.length; i++) {
        try {
          await api("Order.Delete", { data_id: ids[i] });
          delete state.selectedIds[ids[i]];
          ok += 1;
        } catch (err) {
          fail += 1;
        }
      }
      closeModal("confirmModal");
      if (ok) toast(ok > 1 ? t("ordersDeleted", { n: ok }) : t("orderDeleted"));
      if (fail) toast(t("ordersDeleteFailed", { n: fail }));
      syncBulkBar();
      if (typeof state.onRefresh === "function") await state.onRefresh();
    } finally {
      $("confirmDeleteBtn").disabled = false;
      state.pendingDeleteIds = [];
      state.pendingDeleteId = null;
    }
  }

  async function searchCustomers(q) {
    if (!q) {
      if ($("customerSuggest")) $("customerSuggest").hidden = true;
      return;
    }
    try {
      var list = await client.list("Customer.List", { filter_data: q, search: q, length: 10, start: 0 });
      var rows = list.rows || [];
      $("customerSuggest").hidden = false;
      if (!rows.length) {
        $("customerSuggest").innerHTML = "<button type='button' disabled>" + escapeHtml(t("noCustomers")) + "</button>";
        return;
      }
      $("customerSuggest").innerHTML = rows.map(function _commonSub59(row) {
        var id = custIdOf(row);
        return '<button type="button" data-pick-customer="' + id + '" data-pick-name="' + escapeAttr(customerName(row)) + '">' +
          escapeHtml(customerName(row)) + "<br><small>" + escapeHtml(row.email || row.mobile || "") + "</small></button>";
      }).join("");
    } catch (err) {
      toast(errMessage(err));
    }
  }

  function pickCustomer(id, name) {
    $("orderCustId").value = id;
    $("pickedCustomer").hidden = false;
    $("pickedCustomer").textContent = name + " (#" + id + ")";
    $("customerSuggest").hidden = true;
    $("customerSearch").value = name;
  }

  var EMAIL_ORDER_LIMIT = 100;
  var EMAIL_AUTO_TOKENS = {
    message: true,
    orders_block: true
  };

  function resolveEmailCustomer(id) {
    id = String(id || "");
    if (state.customer && custIdOf(state.customer) === id) return state.customer;
    var row = (state.orders || []).concat(state.customerOrders || []).find(function _commonSub60(item) {
      return custIdOf(item) === id;
    });
    if (row) {
      return {
        id: id,
        customer_id: id,
        cust_id: id,
        name: customerName(row),
        email: customerEmailOf(row) || row.email || row.customer_email || ""
      };
    }
    return { id: id, customer_id: id, cust_id: id };
  }

  function emailCellText(row, col) {
    if (!row || !col) return "—";
    if (col.kind === "customer") return customerName(row) || "—";
    if (col.kind === "status") {
      var meta = statusMeta(row);
      return (!meta.id || meta.id === "0") ? "—" : (meta.label || "—");
    }
    if (col.kind === "paid") {
      var paid = paidOf(row);
      var labels = paidLabels();
      return labels[paid] || labels[0] || "—";
    }
    if (col.kind === "id") return rowId(row) ? ("#" + rowId(row)) : "—";
    var raw = rowFieldValue(row, col);
    if (col.kind === "date") return formatCellDate(raw) || "—";
    if (col.kind === "select") return selectOptionLabel(col.field, raw) || displayScalar(raw) || "—";
    if (col.kind === "product") return productNameOf(row) || "—";
    return displayScalar(raw) || "—";
  }

  function emailTableColumns() {
    // Only include selected/visible table columns in email, matching the Fields picker selection.
    var cols = visibleTableColumns(true);
    if (!cols || !cols.length) {
      cols = ["customer_name", "date", "order_name", "order_status", "total_price", "id", "notes"].map(makeColumn);
    }
    return cols.map(function _commonSub61(col) {
      if (!col) return col;
      if (col.kind === "product" || sameColKey(col.key, "order_id") || sameColKey(col.key, "order_name")) {
        return Object.assign({}, col, { kind: "product" });
      }
      if (col.kind === "paid" || sameColKey(col.key, "paid_status")) {
        return Object.assign({}, col, { kind: "paid" });
      }
      return col;
    });
  }

  var CIPHER_KEY = "BIZ1_ORDER_STATUS_APP_SECRET";

  function getApiToken() {
    if (state.org && state.org.api_token) return state.org.api_token;
    if (state.user && state.user.api_token) return state.user.api_token;
    if (state.api_token) return state.api_token;
    try {
      var directTok = localStorage.getItem("biz1_api_token");
      if (directTok) return directTok;
      var savedOrg = localStorage.getItem("biz1_user_org");
      if (savedOrg) {
        var parsed = JSON.parse(savedOrg);
        if (parsed && parsed.api_token) return parsed.api_token;
      }
      var savedUser = localStorage.getItem("biz1_user_info");
      if (savedUser) {
        var parsedUser = JSON.parse(savedUser);
        if (parsedUser && parsedUser.api_token) return parsedUser.api_token;
      }
    } catch (e) {}
    return "";
  }

  function encryptOrderToken(data) {
    try {
      var jsonStr = typeof data === "string" ? data : JSON.stringify(data);
      var key = CIPHER_KEY;
      var xorStr = "";
      for (var i = 0; i < jsonStr.length; i++) {
        xorStr += String.fromCharCode(jsonStr.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      var utf8Str = encodeURIComponent(xorStr).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
      });
      var b64 = btoa(utf8Str);
      return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) {
      console.warn("encryptOrderToken error:", e);
      return "";
    }
  }

  function getHomePageBaseUrl() {
    try {
      if (typeof window !== "undefined" && window.location) {
        var origin = window.location.origin || (window.location.protocol + "//" + window.location.host);
        var path = window.location.pathname || "";
        var basePath = path.substring(0, path.lastIndexOf('/'));
        if (basePath === "/") basePath = "";
        return origin + basePath;
      }
    } catch (e) {}
    return resolveDomain();
  }

  function getChangeStatusUrl(id, row) {
    var idVal = String(id || "").trim();
    if (!idVal) return "#";
    var nameVal = row ? (customerName(row) || row.customer_name || row.client_name || row.cust_name || "") : "";
    if (nameVal === t("customer")) nameVal = "";
    
    var tenantUser = resolveTenantUser() || "info";
    var apiToken = getApiToken();
    var payloadObj = {
      order_id: idVal,
      api_token: apiToken,
      user: tenantUser
    };
    var encToken = encryptOrderToken(payloadObj);

    var base = getHomePageBaseUrl();
    var url = (base ? (base + '/') : '') + 'change-status.html?data=' + encodeURIComponent(encToken);
    if (nameVal) url += '&client_name=' + encodeURIComponent(nameVal);
    return url;
  }

  function emailStatusHtml(row) {
    var meta = statusMeta(row);
    var rid = rowId(row);
    var bg = meta.color || "#dbeafe";
    var label = meta.label || "—";
    if (!meta.id || meta.id === "0") {
      bg = "#eef1f6";
    }
    if (rid) {
      var changeUrl = getChangeStatusUrl(rid, row);
      return '<a href="' + escapeHtml(changeUrl) + '" target="_blank" title="' + escapeHtml(t("changeStatusLinkTitle") || "Click to change order status") + '" style="display:inline-block;padding:4px 10px;border-radius:999px;background:' +
        escapeHtml(bg) + ';color:#0f172a;font-size:12px;font-weight:700;text-decoration:none;border:1px solid rgba(0,0,0,0.08);">' +
        escapeHtml(label) + ' <span style="font-size:10px;opacity:0.8;">&#9998;</span></a>';
    }
    return '<span style="display:inline-block;padding:3px 8px;border-radius:999px;background:' +
      escapeHtml(bg) + ';color:#0f172a;font-size:12px;font-weight:700;">' +
      escapeHtml(label) + "</span>";
  }

  function emailCellHtml(row, col) {
    if (!row || !col) return "—";
    if (col.kind === "status") return emailStatusHtml(row);
    if (col.kind === "paid") {
      var paid = paidOf(row);
      var labels = paidLabels();
      return escapeHtml(labels[paid] || labels[0] || "—");
    }
    if (col.kind === "product") return escapeHtml(productNameOf(row) || "—");
    if (col.kind === "id") {
      var rid = rowId(row);
      if (!rid) return "—";
      var changeUrl = getChangeStatusUrl(rid, row);
      return '<a href="' + escapeHtml(changeUrl) + '" target="_blank" title="' + escapeHtml(t("changeStatusLinkTitle") || "Click to change order status") + '" style="font-weight:700;color:#2563eb;text-decoration:underline;">#' + escapeHtml(rid) + '</a>';
    }
    if (col.kind === "action") {
      var ridAction = rowId(row);
      if (!ridAction) return "—";
      var changeUrlAction = getChangeStatusUrl(ridAction, row);
      return '<a href="' + escapeHtml(changeUrlAction) + '" target="_blank" style="display:inline-block;padding:4px 10px;border-radius:6px;background:#2563eb;color:#ffffff;font-size:12px;font-weight:700;text-decoration:none;">' + escapeHtml(t("changeStatus") || "Change Status") + '</a>';
    }
    if (col.kind === "price") {
      var price = displayScalar(rowFieldValue(row, col) || row.total_price || row.book_price || "");
      return '<span style="font-weight:700;color:#0f172a;">' + escapeHtml(price || "—") + "</span>";
    }
    return escapeHtml(emailCellText(row, col));
  }

  function buildCustomerDetailHtml(customer) {
    customer = customer || {};
    var name = customer.name || customer.customer_name || customer.full_name || t("customer");
    var email = customerEmailOf(customer) || customer.email || customer.mail || "";
    var phone = customer.mobile || customer.phone || customer.tel || "";
    var id = custIdOf(customer) || customer.id || "";
    var dir = isHe() ? "rtl" : "ltr";
    var align = dir === "rtl" ? "right" : "left";
    var items = [
      { label: t("customerId"), value: id ? ("#" + id) : "—" },
      { label: t("email"), value: email || t("noEmail") },
      { label: t("phone"), value: phone || t("noPhone") }
    ];
    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;direction:' + dir + ';">' +
      '<tr><td style="padding:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.3;font-weight:700;color:#0f172a;text-align:' + align + ';">' +
      escapeHtml(name) + "</td></tr>" +
      '<tr><td style="padding:0;">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:separate;border-spacing:8px 0;">' +
      "<tr>" + items.map(function _commonSub62(item) {
        return '<td valign="top" style="width:33.33%;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;font-family:Arial,Helvetica,sans-serif;text-align:' + align + ';">' +
          '<div style="font-size:11px;letter-spacing:0.04em;text-transform:uppercase;color:#64748b;font-weight:700;margin:0 0 6px;">' +
          escapeHtml(item.label) + "</div>" +
          '<div style="font-size:14px;color:#0f172a;font-weight:600;word-break:break-word;">' +
          escapeHtml(item.value) + "</div></td>";
      }).join("") +
      "</tr></table></td></tr></table>";
  }

  function buildOrdersTableHtml(rows) {
    var dir = isHe() ? "rtl" : "ltr";
    var align = dir === "rtl" ? "right" : "left";
    var cols = emailTableColumns().slice();
    var hasActionCol = cols.some(function(c) { return c && (c.kind === "action" || c.key === "action"); });
    if (!hasActionCol) {
      cols.push({
        key: "action",
        kind: "action",
        label_en: "Action",
        label_he: "פעולה",
        i18n: "changeStatus"
      });
    }
    if (!rows || !rows.length) {
      return '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#64748b;direction:' + dir + ';text-align:' + align + ';">' +
        escapeHtml(t("emailNoOrderRows")) + "</p>";
    }
    var head = cols.map(function _commonSub63(col) {
      return '<th style="padding:11px 12px;border-bottom:1px solid #cbd5e1;background:#0f172a;color:#f8fafc;text-align:' +
        align + ';font-size:12px;font-weight:700;letter-spacing:0.02em;white-space:nowrap;">' +
        escapeHtml(columnLabel(col)) + "</th>";
    }).join("");
    var body = rows.map(function _commonSub64(row, index) {
      var bg = index % 2 ? "#f8fafc" : "#ffffff";
      return '<tr style="background:' + bg + ';">' + cols.map(function _commonSub65(col) {
        return '<td style="padding:12px;border-bottom:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.4;color:#334155;text-align:' +
          align + ';vertical-align:top;">' +
          emailCellHtml(row, col) + "</td>";
      }).join("") + "</tr>";
    }).join("");
    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;width:100%;direction:' + dir + ';">' +
      "<thead><tr>" + head + "</tr></thead><tbody>" + body + "</tbody></table>";
  }

  function buildOrdersBlockHtml(customer, orders) {
    var dir = isHe() ? "rtl" : "ltr";
    var align = dir === "rtl" ? "right" : "left";
    var count = (orders && orders.length) || 0;
    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;max-width:720px;width:100%;direction:' + dir + ';font-family:Arial,Helvetica,sans-serif;">' +
      '<tr><td style="padding:0;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">' +
      '<tr><td style="padding:16px 18px;background:#0f172a;color:#f8fafc;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;text-align:' + align + ';">' +
      escapeHtml(t("emailOrdersBlockTitle")) + "</td></tr>" +
      '<tr><td style="padding:18px;">' +
      buildCustomerDetailHtml(customer) +
      "</td></tr>" +
      '<tr><td style="padding:0 18px 8px;text-align:' + align + ';">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">' +
      "<tr>" +
      '<td style="font-size:15px;font-weight:700;color:#0f172a;text-align:' + align + ';">' + escapeHtml(t("emailOrdersHeading")) + "</td>" +
      '<td style="text-align:' + (dir === "rtl" ? "left" : "right") + ';">' +
      '<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:700;">' +
      escapeHtml(t("emailOrdersCount", { n: count })) + "</span></td>" +
      "</tr></table></td></tr>" +
      '<tr><td style="padding:0 18px 18px;">' +
      '<div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">' +
      buildOrdersTableHtml(orders || []) +
      "</div></td></tr>" +
      "</table></td></tr></table>";
  }

  async function ensureCatalogLoaded() {
    if (state.catalog && state.catalog.length) return;
    try {
      var catalog = await api("Order.Catalog", { order_type: "all" });
      state.catalog = (catalog && catalog.data) || [];
    } catch (e) { }
  }

  async function fetchOrdersForCustomer(custId) {
    custId = String(custId || "").trim();
    if (!custId) return [];
    var list = await client.list("Order.List", {
      cust_id: custId,
      limit: EMAIL_ORDER_LIMIT,
      start: 0
    });
    applyListMeta(list.raw);
    return list.rows || [];
  }

  function emailIncludeOrdersOn() {
    var el = $("emailIncludeOrders");
    return !!(el && el.checked);
  }

  function setEmailOrdersUi(opts) {
    opts = opts || {};
    var box = $("emailOrdersBox");
    var hint = $("emailOrdersHint");
    var preview = $("emailOrdersPreview");
    var check = $("emailIncludeOrders");
    if (!box) return;
    box.hidden = false;
    if (check) {
      check.disabled = !!opts.disabled;
      if (opts.checked != null) check.checked = !!opts.checked;
    }
    if (hint) hint.textContent = opts.hint || "";
    if (preview) {
      if (opts.previewHtml) {
        preview.hidden = false;
        preview.innerHTML = opts.previewHtml;
      } else {
        preview.hidden = true;
        preview.innerHTML = "";
      }
    }
  }

  async function prepareEmailCustomerData(custId) {
    await ensureCatalogLoaded();
    var customer = resolveEmailCustomer(custId);
    if ((!customer.email && !customer.name) || (state.customer && custIdOf(state.customer) !== String(custId))) {
      try {
        var got = await api("Customer.Get", { customer_id: custId });
        var data = (got && (got.data || got.customer)) || null;
        if (data) customer = data;
      } catch (e) { }
    }
    var orders = await fetchOrdersForCustomer(custId);
    var block = buildOrdersBlockHtml(customer, orders);
    return {
      customer: customer,
      orders: orders,
      orders_block: block
    };
  }


  async function openEmailModal(cid) {
    var ids = Array.isArray(cid)
      ? cid.map(function _commonSub66(id) { return String(id || "").trim(); }).filter(Boolean)
      : String(cid || "").split(",").map(function _commonSub67(id) { return id.trim(); }).filter(Boolean);
    var uniqueIds = [];
    var seenIds = {};
    ids.forEach(function _commonSub68(id) {
      if (seenIds[id]) return;
      seenIds[id] = true;
      uniqueIds.push(id);
    });
    ids = uniqueIds;
    if (!ids.length) {
      toast(t("selectCustomer"));
      return;
    }
    showAlert("emailAlert");
    $("emailForm").reset();
    clearEmailTokenFields();
    state.emailPackByCust = {};
    $("emailPreview").hidden = true;
    $("emailPreview").innerHTML = "";
    var names = [];
    ids.forEach(function _commonSub69(id) {
      var customer = resolveEmailCustomer(id);
      names.push(customer.name || customer.customer_name || customer.customer_email || customer.email || ("#" + id));
    });
    $("emailToHint").textContent = ids.length > 1
      ? t("sendingToMany", { n: ids.length })
      : t("sendingTo", { name: names[0] });
    $("emailForm").dataset.custId = ids.join(",");
    setEmailOrdersUi({
      checked: true,
      disabled: false,
      hint: t("emailOrdersLoading"),
      previewHtml: ""
    });
    $("emailModal").hidden = false;
    try {
      var list = await client.list("EmailTemplates.List", { status: 1, limit: 100, start: 0 });
      state.templates = list.rows || [];
      $("emailTemplate").innerHTML = '<option value="">' + escapeHtml(t("selectTemplate")) + "</option>" + state.templates.map(function _commonSub70(tpl) {
        var id = tpl.id || tpl.template_id || tpl.email_template_id;
        return '<option value="' + id + '">' + escapeHtml(tpl.name || tpl.template_name || tpl.subject || ("#" + id)) + "</option>";
      }).join("");
      if (!state.templates.length) showAlert("emailAlert", t("noTemplates"));
    } catch (err) {
      showAlert("emailAlert", errMessage(err));
    }
    try {
      if (ids.length === 1) {
        var pack = await prepareEmailCustomerData(ids[0]);
        state.emailPackByCust[ids[0]] = pack;
        setEmailOrdersUi({
          checked: true,
          disabled: false,
          hint: t("emailOrdersHint", { n: pack.orders.length }),
          previewHtml: pack.orders_block
        });
      } else {
        setEmailOrdersUi({
          checked: true,
          disabled: false,
          hint: t("emailOrdersHintMany", { n: ids.length }),
          previewHtml: ""
        });
      }
    } catch (err) {
      setEmailOrdersUi({
        checked: false,
        disabled: false,
        hint: t("emailOrdersLoadFailed"),
        previewHtml: ""
      });
      showAlert("emailAlert", errMessage(err));
    }
  }

  function extractTemplateTokens(text) {
    var tokens = [];
    var seen = {};
    var re = /\{([a-zA-Z_][\w-]*)\}/g;
    var match;
    while ((match = re.exec(String(text || "")))) {
      var key = match[1];
      if (seen[key]) continue;
      seen[key] = true;
      tokens.push(key);
    }
    return tokens;
  }

  function clearEmailTokenFields() {
    var wrap = $("emailTokenFields");
    if (!wrap) return;
    wrap.innerHTML = "";
    wrap.hidden = true;
  }

  function renderEmailTokenFields(tokens) {
    var wrap = $("emailTokenFields");
    if (!wrap) return;
    wrap.innerHTML = "";
    var manual = (tokens || []).filter(function _commonSub71(token) {
      return !EMAIL_AUTO_TOKENS[token];
    });
    if (!manual.length) {
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    wrap.setAttribute("dir", isHe() ? "rtl" : "ltr");
    manual.forEach(function _commonSub72(token) {
      var label = document.createElement("label");
      label.className = "field";
      label.setAttribute("dir", isHe() ? "rtl" : "ltr");
      var span = document.createElement("span");
      if (token === "message") {
        span.textContent = t("messageToken");
      } else {
        span.textContent = t("tokenField", { token: token });
      }
      var input;
      if (token === "message") {
        input = document.createElement("textarea");
        input.rows = 4;
        input.placeholder = t("messagePlaceholder");
      } else {
        input = document.createElement("input");
        input.type = "text";
        input.placeholder = t("tokenPlaceholder", { token: token });
      }
      input.dataset.token = token;
      input.setAttribute("dir", isHe() ? "rtl" : "ltr");
      input.setAttribute("autocomplete", "off");
      label.appendChild(span);
      label.appendChild(input);
      wrap.appendChild(label);
    });
  }

  function collectEmailTokenData() {
    var overrides = {};
    var wrap = $("emailTokenFields");
    if (!wrap) return overrides;
    var inputs = wrap.querySelectorAll("[data-token]");
    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i];
      var token = el.getAttribute("data-token");
      var value = String(el.value || "").trim();
      if (!token || !value) continue;
      overrides["cf-" + token] = value;
      if (token === "message") overrides.message = value;
    }
    return overrides;
  }

  async function previewTemplate() {
    var id = $("emailTemplate").value;
    var preview = $("emailPreview");
    if (!preview) return;
    if (!id) {
      preview.hidden = true;
      preview.innerHTML = "";
      clearEmailTokenFields();
      return;
    }
    try {
      var got = await api("EmailTemplates.Get", { id: id });
      var data = (got && got.data) || {};
      var subject = data.subject || "";
      var html = data.email_html || data.html || data.body || "";
      renderEmailTokenFields(extractTemplateTokens(subject + "\n" + html));
      preview.hidden = false;
      preview.setAttribute("dir", isHe() ? "rtl" : "ltr");
      preview.innerHTML = subject ? "<strong>" + escapeHtml(subject) + "</strong>" : "";
      if (html) {
        var frame = document.createElement("iframe");
        frame.className = "email-preview-frame";
        frame.setAttribute("sandbox", "");
        frame.setAttribute("title", "Template preview");
        var previewDir = isHe() ? "rtl" : "ltr";
        var previewLang = isHe() ? "he" : "en";
        var doc;
        if (/<html[\s>]/i.test(html)) {
          doc = html
            .replace(/<html([^>]*)>/i, function _commonSub73(full, attrs) {
              var cleaned = String(attrs || "")
                .replace(/\sdir\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i, "")
                .replace(/\slang\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i, "");
              return "<html" + cleaned + " lang=\"" + previewLang + "\" dir=\"" + previewDir + "\">";
            });
        } else {
          doc = "<!DOCTYPE html><html lang=\"" + previewLang + "\" dir=\"" + previewDir + "\"><head><meta charset='UTF-8'><style>html,body{margin:0;padding:8px;background:#fff;color:#111;font:14px/1.45 sans-serif;direction:" + previewDir + ";text-align:" + (previewDir === "rtl" ? "right" : "left") + ";}</style></head><body>" + html + "</body></html>";
        }
        frame.srcdoc = doc;
        preview.appendChild(frame);
      }
    } catch (err) {
      clearEmailTokenFields();
      showAlert("emailAlert", errMessage(err));
    }
  }

  function parseEmbeddedMailPayload(text) {
    var raw = String(text || "");
    var match = raw.match(/\{[^{}]*"send_mail"\s*:\s*\d+[^{}]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (e) {
      return null;
    }
  }

  function emailRecipientActuallySent(row) {
    if (!row) return false;
    if (row.success === 1 || row.success === "1" || row.success === true) return true;
    if (row.send_mail === 1 || row.send_mail === "1") return true;
    var php = row.php;
    if (php && (php.send_mail === 1 || php.send_mail === "1")) return true;
    var embedded = parseEmbeddedMailPayload(row.message) || parseEmbeddedMailPayload(php && php.message);
    if (embedded && (embedded.send_mail === 1 || embedded.send_mail === "1")) return true;
    var blob = String((row && row.message) || "") + " " + String((php && php.message) || "");
    if (/"send_mail"\s*:\s*1\b/.test(blob)) return true;
    if (/שליחת אימייל הצליחה/i.test(blob)) return true;
    return false;
  }

  /**
   * Send.EmailTemplate sometimes returns HTTP 400 / success:0 after a PHP notice,
   * even when the mailer already sent (send_mail:1 in nested result / message).
   */
  function interpretEmailSendResult(res, fallbackCount) {
    fallbackCount = Number(fallbackCount) || 0;
    if (!res) {
      return { ok: false, sent: 0, failed: fallbackCount || 1, message: t("emailSendFailed") };
    }

    var results = Array.isArray(res.results) ? res.results : [];
    var sentFromRows = 0;
    var failedFromRows = 0;
    results.forEach(function _commonEmailRow(row) {
      if (emailRecipientActuallySent(row)) sentFromRows += 1;
      else failedFromRows += 1;
    });

    var topSuccess = res.success === 1 || res.success === "1" || res.success === true;
    var reportedSent = Number(res.sent);
    var reportedFailed = Number(res.failed);
    if (!Number.isFinite(reportedSent)) reportedSent = null;
    if (!Number.isFinite(reportedFailed)) reportedFailed = null;

    var sent = reportedSent != null ? reportedSent : (results.length ? sentFromRows : (topSuccess ? fallbackCount : 0));
    var failed = reportedFailed != null ? reportedFailed : (results.length ? failedFromRows : (topSuccess ? 0 : fallbackCount));

    // Prefer evidence from recipient rows when top-level flags say failure but mail went out.
    if (!topSuccess && sentFromRows > 0) {
      sent = sentFromRows;
      failed = failedFromRows;
    }

    if (topSuccess || sent > 0) {
      return { ok: true, sent: sent || fallbackCount || sentFromRows || 1, failed: failed };
    }

    return {
      ok: false,
      sent: sent,
      failed: failed || fallbackCount || 1,
      message: res.message || res.error || t("emailSendFailed")
    };
  }

  async function sendEmail(ev) {
    ev.preventDefault();
    showAlert("emailAlert");
    var templateId = $("emailTemplate") && $("emailTemplate").value;
    var custIds = String(($("emailForm") && $("emailForm").dataset.custId) || "")
      .split(",")
      .map(function _commonSub74(id) { return id.trim(); })
      .filter(Boolean);
    var uniqueCust = [];
    var seenCust = {};
    custIds.forEach(function _commonSub75(id) {
      if (seenCust[id]) return;
      seenCust[id] = true;
      uniqueCust.push(id);
    });
    custIds = uniqueCust;
    if (!templateId) {
      showAlert("emailAlert", t("chooseTemplate"));
      return;
    }
    if (!custIds.length) {
      showAlert("emailAlert", t("selectCustomer"));
      return;
    }
    if (custIds.length > 50) {
      showAlert("emailAlert", t("emailMaxCustomers"));
      return;
    }
    $("emailSendBtn").disabled = true;
    try {
      var baseOverrides = collectEmailTokenData();
      var includeOrders = emailIncludeOrdersOn();
      var sentTotal = 0;
      var failedTotal = 0;

      async function sendOne(ids, pack) {
        var payload = {
          template_id: templateId,
          cust_ids: ids.join(",")
        };
        if (includeOrders && pack && pack.orders_block) {
          // Send.EmailTemplate: custom_email fills {message} or is appended to the template body.
          payload.custom_email = pack.orders_block;
        }
        var data = Object.assign({}, baseOverrides);
        delete data.message;
        delete data["cf-message"];
        delete data.orders_block;
        delete data["cf-orders_block"];
        if (Object.keys(data).length) payload.data = data;
        // Keep response even when API marks success:0 after a post-send PHP notice.
        var res = await api("Send.EmailTemplate", payload, { throwOnError: false });
        var outcome = interpretEmailSendResult(res, ids.length);
        if (!outcome.ok) {
          throw new Error(outcome.message || t("emailSendFailed"));
        }
        sentTotal += outcome.sent || 0;
        failedTotal += outcome.failed || 0;
      }

      if (includeOrders && custIds.length > 1) {
        for (var i = 0; i < custIds.length; i++) {
          var cid = custIds[i];
          var pack = state.emailPackByCust && state.emailPackByCust[cid];
          if (!pack) {
            pack = await prepareEmailCustomerData(cid);
            if (!state.emailPackByCust) state.emailPackByCust = {};
            state.emailPackByCust[cid] = pack;
          }
          try {
            await sendOne([cid], pack);
          } catch (oneErr) {
            failedTotal += 1;
          }
        }
      } else {
        var singlePack = null;
        if (includeOrders && custIds.length === 1) {
          singlePack = (state.emailPackByCust && state.emailPackByCust[custIds[0]]) || await prepareEmailCustomerData(custIds[0]);
        }
        await sendOne(custIds, singlePack);
      }

      if (!sentTotal && failedTotal) throw new Error(t("emailSendFailed"));
      toast(t("emailSent", { sent: sentTotal || custIds.length }));
      if (failedTotal) toast(t("emailSendFailedCount", { n: failedTotal }));
      closeModal("emailModal");
    } catch (err) {
      showAlert("emailAlert", errMessage(err));
    } finally {
      $("emailSendBtn").disabled = false;
    }
  }

  function openEmailForSelected() {
    var ids = selectedCustomerIds();
    if (!ids.length) {
      toast(t("noCustomerOnRows"));
      return;
    }
    openEmailModal(ids);
  }

  function bindSharedUi(opts) {
    opts = opts || {};
    state.page = opts.page || state.page;
    state.onRefresh = opts.onRefresh || null;
    state.onRender = opts.onRender || null;
    setTheme(document.documentElement.getAttribute("data-theme"));
    if (window.OrderI18n) {
      window.OrderI18n.init({
        onChange: function _commonSub76() {
          syncLiveStatus();
          renderFieldPicker();
          if (typeof opts.onLocale === "function") opts.onLocale();
        }
      });
    }
    if ($("fieldsBtn")) $("fieldsBtn").addEventListener("click", function _commonSub77(ev) {
      ev.stopPropagation();
      toggleFieldPicker();
    });
    if ($("fieldPickerClose")) $("fieldPickerClose").addEventListener("click", closeFieldPicker);
    if ($("fieldPickerSearch")) {
      $("fieldPickerSearch").addEventListener("input", renderFieldPicker);
    }
    document.addEventListener("click", function _commonSub78(ev) {
      var panel = $("fieldPicker");
      if (!panel || panel.hidden) return;
      if (ev.target.closest("#fieldPicker") || ev.target.closest("#fieldsBtn")) return;
      closeFieldPicker();
    });
    document.addEventListener("keydown", function _commonSub79(ev) {
      if (ev.key === "Escape") closeFieldPicker();
    });
    var dragFieldKey = "";
    document.addEventListener("dragstart", function _commonSub80(ev) {
      var row = ev.target.closest && ev.target.closest(".field-picker-row");
      if (!row) return;
      if (ev.target.closest("input, button, label")) {
        ev.preventDefault();
        return;
      }
      dragFieldKey = row.getAttribute("data-field-key") || "";
      try { ev.dataTransfer.setData("text/plain", dragFieldKey); } catch (e) { }
      row.classList.add("is-dragging");
    });
    document.addEventListener("dragend", function _commonSub81() {
      qsa(".field-picker-row.is-dragging").forEach(function _commonSub82(el) { el.classList.remove("is-dragging"); });
      qsa(".field-picker-row.is-over").forEach(function _commonSub83(el) { el.classList.remove("is-over"); });
    });
    document.addEventListener("dragover", function _commonSub84(ev) {
      var row = ev.target.closest && ev.target.closest(".field-picker-row");
      if (!row) return;
      ev.preventDefault();
      qsa(".field-picker-row.is-over").forEach(function _commonSub85(el) { el.classList.remove("is-over"); });
      row.classList.add("is-over");
    });
    document.addEventListener("drop", function _commonSub86(ev) {
      var row = ev.target.closest && ev.target.closest(".field-picker-row");
      if (!row) return;
      ev.preventDefault();
      var fromKey = dragFieldKey;
      try { fromKey = fromKey || ev.dataTransfer.getData("text/plain"); } catch (e) { }
      reorderPickerFields(fromKey, row.getAttribute("data-field-key"));
    });
    if ($("themeBtn")) $("themeBtn").addEventListener("click", toggleTheme);
    if ($("loginThemeBtn")) $("loginThemeBtn").addEventListener("click", toggleTheme);
    if ($("logoutBtn")) $("logoutBtn").addEventListener("click", function _commonSub87() { logout(false); });
    if ($("backBtn")) $("backBtn").addEventListener("click", goOrders);
    if ($("orderForm")) $("orderForm").addEventListener("submit", saveOrder);
    if ($("emailForm")) $("emailForm").addEventListener("submit", sendEmail);
    if ($("confirmDeleteBtn")) $("confirmDeleteBtn").addEventListener("click", confirmDelete);
    if ($("bulkDeleteBtn")) $("bulkDeleteBtn").addEventListener("click", askDeleteSelected);
    if ($("bulkEmailBtn")) $("bulkEmailBtn").addEventListener("click", openEmailForSelected);
    if ($("emailTemplate")) $("emailTemplate").addEventListener("change", previewTemplate);
    if ($("emailIncludeOrders")) {
      $("emailIncludeOrders").addEventListener("change", function _commonSub88() {
        var preview = $("emailOrdersPreview");
        if (!preview) return;
        if (!emailIncludeOrdersOn()) {
          preview.hidden = true;
          return;
        }
        if (preview.innerHTML) preview.hidden = false;
      });
    }
    if ($("orderCatalog")) {
      $("orderCatalog").addEventListener("change", function _commonSub89() {
        var opt = this.selectedOptions[0];
        if (opt && opt.getAttribute("data-price") && !$("orderPrice").value) {
          $("orderPrice").value = opt.getAttribute("data-price");
          $("orderTotal").value = opt.getAttribute("data-price");
        }
      });
    }
    if ($("customerSearch")) {
      $("customerSearch").addEventListener("input", function _commonSub90() {
        clearTimeout(state.searchTimer);
        var q = this.value.trim();
        state.searchTimer = setTimeout(function _commonSub91() { searchCustomers(q); }, 280);
      });
    }
    document.addEventListener("change", function _commonSub92(ev) {
      var toggle = ev.target.closest("[data-field-toggle]");
      if (toggle) {
        setColumnOn(toggle.getAttribute("data-field-toggle"), !!toggle.checked);
        return;
      }
      var all = ev.target.closest("#selectAllRows");
      if (all) {
        var on = !!all.checked;
        qsa(".row-check").forEach(function _commonSub93(box) {
          box.checked = on;
          setRowSelected(box.getAttribute("data-select-id"), on, box.getAttribute("data-cust-id"), box.getAttribute("data-cust-name"));
          var wrap = box.closest("tr, .order-card");
          if (wrap) wrap.classList.toggle("is-selected", on);
        });
        syncBulkBar();
        return;
      }
      var box = ev.target.closest(".row-check");
      if (!box) return;
      var on = !!box.checked;
      var id = box.getAttribute("data-select-id");
      setRowSelected(id, on, box.getAttribute("data-cust-id"), box.getAttribute("data-cust-name"));
      qsa(".row-check").forEach(function _commonSub94(other) {
        if (other.getAttribute("data-select-id") !== id) return;
        other.checked = on;
        var wrap = other.closest("tr, .order-card");
        if (wrap) wrap.classList.toggle("is-selected", on);
      });
    });
    document.addEventListener("click", function _commonSub95(ev) {
      var el = ev.target.closest("[data-close], [data-catalog], [data-edit], [data-delete], [data-email], [data-pick-customer], [data-toggle-more-fields]");
      if (!el) return;
      if (el.hasAttribute("data-toggle-more-fields")) {
        ev.preventDefault();
        var content = $("moreFieldsContent");
        if (content) {
          var willShow = content.hidden;
          content.hidden = !willShow;
          el.setAttribute("aria-expanded", willShow ? "true" : "false");
        }
        return;
      }
      if (el.hasAttribute("data-close")) closeModal(el.getAttribute("data-close"));
      if (el.hasAttribute("data-catalog") && typeof opts.onCatalog === "function") opts.onCatalog(el.getAttribute("data-catalog"));
      if (el.hasAttribute("data-edit")) editOrder(el.getAttribute("data-edit"));
      if (el.hasAttribute("data-delete")) askDelete(el.getAttribute("data-delete"));
      if (el.hasAttribute("data-email")) openEmailModal(el.getAttribute("data-email"));
      if (el.hasAttribute("data-pick-customer")) pickCustomer(el.getAttribute("data-pick-customer"), el.getAttribute("data-pick-name"));
    });
    qsa(".modal-backdrop").forEach(function _commonSub96(el) {
      el.addEventListener("mousedown", function _commonSub97(e) {
        if (e.target === el) el.hidden = true;
      });
    });
  }

  return {
    PAGE_SIZE: PAGE_SIZE,
    DOMAIN: DOMAIN,
    getDomain: function _commonSubDomain() { return DOMAIN; },
    getTenantUser: resolveTenantUser,
    getApiRoot: resolveApiRoot,
    state: state,
    t: t,
    $: $,
    toast: toast,
    showAlert: showAlert,
    errMessage: errMessage,
    escapeHtml: escapeHtml,
    custIdOf: custIdOf,
    catalogIdOf: catalogIdOf,
    customerName: customerName,
    ensureSdk: ensureSdk,
    requireAuth: requireAuth,
    api: api,
    client: function _commonSub98() { return client; },
    loginWithToken: loginWithToken,
    readUrlToken: readUrlToken,
    clearUrlToken: clearUrlToken,
    logout: logout,
    goLogin: goLogin,
    goOrders: goOrders,
    goCustomer: goCustomer,
    loadLookups: loadLookups,
    fillStatusSelects: fillStatusSelects,
    fillCatalogSelect: fillCatalogSelect,
    renderCatalogChips: renderCatalogChips,
    orderTableRow: orderTableRow,
    orderCard: orderCard,
    renderOrderHead: renderOrderHead,
    applyListMeta: applyListMeta,
    customFieldBag: customFieldBag,
    syncBulkBar: syncBulkBar,
    clearSelection: clearSelection,
    openOrderModal: openOrderModal,
    openEmailModal: openEmailModal,
    bindSharedUi: bindSharedUi,
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    productNameOf: productNameOf,
    isFixedColumn: isFixedColumn,
    isProductCol: isProductCol,
    isCustomerCol: isCustomerCol,
    pickerFields: pickerFields,
    visibleTableColumns: visibleTableColumns,
    renderCustomFields: renderCustomFields
  };
})();
