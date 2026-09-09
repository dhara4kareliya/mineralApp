window.OrderApp = (function () {
  "use strict";

  var DOMAIN = "https://eli.bull36.com";
  var PAGE_SIZE = 25;
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
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) return resolve();
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("Failed to load " + src)); };
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
    setTimeout(function () { el.remove(); }, 4200);
  }

  function pulseRow(id) {
    qsa('[data-row-id="' + id + '"]').forEach(function (el) {
      el.classList.remove("pulse");
      void el.offsetWidth;
      el.classList.add("pulse");
    });
  }

  function setTheme(theme) {
    var next = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    var icon = next === "dark" ? "☾" : "☀";
    ["themeBtn", "loginThemeBtn"].forEach(function (id) {
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
    return (state.orders || []).concat(state.customerOrders || []).find(function (item) {
      return rowId(item) === id;
    }) || null;
  }
  function paidOf(row) {
    var v = row && (row.paid_status != null ? row.paid_status : row.paid_val);
    return String(v == null ? "" : v);
  }

  function flattenCustomFields(fields) {
    var out = [];
    (fields || []).forEach(function (field) {
      if (Array.isArray(field.numeric_data) && field.numeric_data.length) {
        field.numeric_data.forEach(function (sub) {
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
    order_id: { en: "Product", he: "מוצר", i18n: "colProduct", kind: "product" },
    order_name: { en: "Product", he: "מוצר", i18n: "colProduct", kind: "product" }
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
    } catch (e) {}
  }

  function saveColumnPrefs() {
    state.columnsUserSet = true;
    try {
      localStorage.setItem(COLUMNS_KEY, JSON.stringify(state.columns || []));
    } catch (e) {}
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
      if (!state.columns.some(function (key) { return sameColKey(key, "customer_name") || sameColKey(key, "client_name"); })) {
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
    var staticMeta = (state.staticColumns || []).find(function (item) {
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
        raw = String(raw).split(",").map(function (part) { return part.trim(); }).filter(Boolean);
      }
    }
    if (!Array.isArray(raw)) return [];
    return raw.map(function (item) {
      if (item == null || item === "") return "";
      if (typeof item === "string" || typeof item === "number") return String(item);
      return String(item.name || item.key || item.field || item.data || item.id || "");
    }).filter(Boolean);
  }

  function availableFieldColumns() {
    var seen = {};
    var out = [];
    function add(key) {
      if (!key) return;
      var col = makeColumn(key);
      if (!col || !col.key || skipFieldType(col.field)) return;
      var slug = normKey(col.key);
      if (!slug || seen[slug] || slug === "checkbox" || slug === "action" || slug === "actions") return;
      seen[slug] = true;
      out.push(col);
    }
    add("customer_name");
    (state.staticColumns || []).forEach(function (item) {
      add(item && (item.key || item.name));
    });
    ["date", "notes", "id", "total_price", "order_status", "paid_status", "book_price", "discount", "order_name"].forEach(add);
    (state.customFields || []).forEach(function (field) {
      if (field && (field.name || field.en)) add(field.name || field.en);
    });
    return out;
  }

  function isColumnOn(key) {
    return parseColumnKeys(state.columns).some(function (item) { return sameColKey(item, key); });
  }

  function pickerFields() {
    var available = availableFieldColumns();
    var bySlug = {};
    available.forEach(function (col) { bySlug[normKey(col.key)] = col; });
    var seen = {};
    var out = [];
    parseColumnKeys(state.columns).forEach(function (key) {
      var col = bySlug[normKey(key)] || makeColumn(key);
      var slug = normKey(col.key);
      if (!slug || seen[slug] || skipFieldType(col.field)) return;
      seen[slug] = true;
      out.push(col);
    });
    available.forEach(function (col) {
      var slug = normKey(col.key);
      if (seen[slug]) return;
      seen[slug] = true;
      out.push(col);
    });
    return out;
  }

  function visibleTableColumns(withCustomer) {
    var seen = {};
    var out = [];
    function add(col) {
      if (!col || !col.key) return;
      if (skipFieldType(col.field)) return;
      var slug = normKey(col.key);
      if (!slug || seen[slug] || slug === "checkbox" || slug === "action" || slug === "actions") return;
      if (!withCustomer && col.kind === "customer") return;
      seen[slug] = true;
      out.push(col);
    }
    var keys = parseColumnKeys(state.columns);
    if (!keys.length) {
      if (withCustomer) add(makeColumn("customer_name"));
      ["date", "order_status", "paid_status", "total_price"].forEach(function (key) { add(makeColumn(key)); });
      return out;
    }
    keys.forEach(function (key) { add(makeColumn(key)); });
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

  function columnClass(col) {
    var kind = (col && col.kind) || "text";
    var extra = kind === "customer" ? " col-client" : (/note/i.test((col && col.key) || "") ? " col-notes" : "");
    return "col-" + kind + extra;
  }

  function pickerLabel(col) {
    return col && (col.en || col.key) || "";
  }

  function rerenderOrderViews() {
    if (typeof state.onRender === "function") state.onRender();
    renderFieldPicker();
  }

  function setColumnOn(key, on) {
    var keys = parseColumnKeys(state.columns);
    var exists = keys.some(function (item) { return sameColKey(item, key); });
    if (on && !exists) keys.push(key);
    if (!on) keys = keys.filter(function (item) { return !sameColKey(item, key); });
    if (!keys.length) keys = [key];
    state.columns = keys;
    saveColumnPrefs();
    rerenderOrderViews();
  }

  function reorderPickerFields(fromKey, toKey) {
    if (!fromKey || !toKey || sameColKey(fromKey, toKey)) return;
    var fields = pickerFields();
    var keys = fields.map(function (col) { return col.key; });
    var from = -1;
    var to = -1;
    keys.forEach(function (key, i) {
      if (from < 0 && sameColKey(key, fromKey)) from = i;
      if (to < 0 && sameColKey(key, toKey)) to = i;
    });
    if (from < 0 || to < 0) return;
    var moved = keys.splice(from, 1)[0];
    keys.splice(to, 0, moved);
    var onSet = {};
    parseColumnKeys(state.columns).forEach(function (key) { onSet[normKey(key)] = true; });
    state.columns = keys.filter(function (key) { return onSet[normKey(key)]; });
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
    var rows = pickerFields().filter(function (col) {
      if (!q) return true;
      return (pickerLabel(col) + " " + (col.he || "") + " " + col.key).toLowerCase().indexOf(q) >= 0;
    });
    if (!rows.length) {
      list.innerHTML = '<div class="field-picker-empty">' + escapeHtml(t("noFields")) + "</div>";
      return;
    }
    list.innerHTML = rows.map(function (col) {
      var on = isColumnOn(col.key);
      return '<div class="field-picker-row' + (on ? " is-on" : "") + '" draggable="true" data-field-key="' + escapeAttr(col.key) + '">' +
        '<span class="field-drag" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>' +
        '<label class="switch"><input type="checkbox" data-field-toggle="' + escapeAttr(col.key) + '"' + (on ? " checked" : "") + ' /><span class="switch-ui"></span></label>' +
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
      cf.forEach(function (item) {
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
    Object.keys(bag).some(function (k) {
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
      var cid = custIdOf(row);
      var name = customerName(row);
      if (cid && withCustomer) {
        return '<a class="customer-link" href="./customer.html?id=' + encodeURIComponent(cid) + '">' + escapeHtml(name) + "</a>";
      }
      return escapeHtml(name);
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
      return escapeHtml(displayScalar(raw) || row.order_name || row.name || "—");
    }
    return escapeHtml(displayScalar(raw) || "—");
  }

  function renderOrderHead(theadId, withCustomer) {
    var thead = $(theadId);
    if (!thead) return;
    var cols = visibleTableColumns(withCustomer);
    thead.innerHTML = "<tr>" +
      '<th class="col-check"><input type="checkbox" id="selectAllRows" aria-label="' + escapeHtml(t("selectAll")) + '" /></th>' +
      cols.map(function (col) {
        return '<th class="' + columnClass(col) + '">' + escapeHtml(columnLabel(col)) + "</th>";
      }).join("") +
      '<th class="col-actions"></th>' +
      "</tr>";
  }

  function formatDate(value) {
    if (!value || value === "0000-00-00" || String(value).indexOf("0000-00-00") === 0) return "—";
    return String(value).slice(0, 10);
  }

  function statusMeta(row) {
    var rawId = row && (
      (row.order_status_id != null && String(row.order_status_id) !== "" && String(row.order_status_id) !== "0")
        ? row.order_status_id
        : (row.order_status || row.status_id)
    );
    var id = String(rawId || "");
    var found = state.statuses.find(function (s) { return String(s.id || s.status_id) === id; });
    return {
      id: id,
      label: (row && (row.order_status_label || row.order_status_name || row.status_name || row.name_en)) ||
        (found && (found.name_en || found.name || found.label)) || (id ? "#" + id : "—"),
      color: (row && (row.order_status_color || row.color)) || (found && found.color) || ""
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
    await loadScript(DOMAIN + "/realtime/socket.io/socket.io.js");
    await loadScript(DOMAIN + "/app/sdk/biz1-sdk.js");
    if (!window.Biz1SDK) throw new Error("Biz1 SDK failed to load.");
    client = new window.Biz1SDK.Biz1Client({ domain: DOMAIN, storage: localStorage });
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
    if ($("userChip")) $("userChip").textContent = state.user.name || state.user.email || t("signedIn");
    connectRealtime();
  }

  function logout(silent) {
    if (client) client.logout();
    state.user = null;
    state.customer = null;
    setLiveStatus(false);
    if (!silent) {
      try { sessionStorage.setItem("orderapp_flash", t("signedOut")); } catch (e) {}
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
        sock.on("connect", function () { setLiveStatus(true); });
        sock.on("reconnect", function () { setLiveStatus(true); });
        sock.on("disconnect", function () { setLiveStatus(false); });
        sock.on("connect_error", function () {
          if (!isRealtimeConnected()) setLiveStatus(false);
        });
        if (sock.connected) setLiveStatus(true);
      }
      if (!window.__orderappLiveTimer) {
        window.__orderappLiveTimer = setInterval(syncLiveStatus, 2000);
      }
      if (!realtimeHandlersBound) {
        realtimeHandlersBound = true;
        client.realtime.on("biz1:ready", function () {
          setLiveStatus(true);
          toast(t("liveConnected"), "live");
        });
        client.realtime.on("*", function (event) {
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
      $("filterStatus").innerHTML = '<option value="">' + escapeHtml(t("allStatuses")) + "</option>" + state.statuses.map(function (s) {
        var id = s.id || s.status_id;
        return '<option value="' + id + '">' + escapeHtml(statusName(s)) + "</option>";
      }).join("");
      $("filterStatus").value = selectedFilter;
    }
    if ($("orderStatus")) {
      var selectedOrder = $("orderStatus").value;
      $("orderStatus").innerHTML = '<option value="">' + escapeHtml(t("selectStatus")) + "</option>" + state.statuses.map(function (s) {
        var id = s.id || s.status_id;
        return '<option value="' + id + '">' + escapeHtml(statusName(s)) + "</option>";
      }).join("");
      $("orderStatus").value = selectedOrder;
    }
  }

  function fillCatalogSelect() {
    if (!$("orderCatalog")) return;
    var selected = $("orderCatalog").value;
    $("orderCatalog").innerHTML = '<option value="">' + escapeHtml(t("selectProduct")) + "</option>" + state.catalog.map(function (item) {
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
    wrap.innerHTML = state.catalog.map(function (item) {
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
    var style = meta.color ? ' style="background:' + escapeHtml(meta.color) + ';color:#111;"' : "";
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
    return Object.keys(state.selectedIds || {}).filter(function (id) {
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
    qsa(".row-check").forEach(function (box) { box.checked = false; });
    qsa(".order-row.is-selected, .order-card.is-selected").forEach(function (el) {
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
    selectedIdList().forEach(function (id) {
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
      var existing = groups.find(function (g) {
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
    return groups.map(function (g) { return g.cid; }).filter(Boolean);
  }

  function visibleRowChecks() {
    return qsa(".row-check").filter(function (box) {
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
      boxes.forEach(function (box) {
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
      cols.map(function (col) {
        return '<td class="' + columnClass(col) + '">' + columnCellHtml(row, col, withCustomer) + "</td>";
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
      '<div class="card-fields">' + cols.map(function (col) {
        return '<div class="card-field"><span>' + escapeHtml(columnLabel(col)) + "</span><div>" +
          (columnCellHtml(row, col, withCustomer) || "—") + "</div></div>";
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

  function renderCustomFields(values) {
    var wrap = $("customFields");
    if (!wrap) return;
    var he = window.OrderI18n && window.OrderI18n.getLang() === "he";
    wrap.innerHTML = (state.customFields || []).map(function (field) {
      var name = field.name || field.id;
      var label = he
        ? (field.he || field.label_he || field.en || field.label_en || field.label || name)
        : (field.en || field.label_en || field.he || field.label || name);
      var val = values[name] != null ? values[name] : "";
      var type = String(field.type || field.input_type || "text").toLowerCase();
      if (type === "select" && Array.isArray(field.options) && field.options.length) {
        return '<label class="field"><span>' + escapeHtml(label) + '</span><select data-cf="' + escapeHtml(name) + '">' +
          '<option value=""></option>' + field.options.map(function (opt) {
            var ov = typeof opt === "object" ? (opt.value || opt.id || opt.name) : opt;
            var ol = typeof opt === "object" ? (opt.label || opt.name || ov) : opt;
            return '<option value="' + escapeHtml(String(ov)) + '"' + (String(val) === String(ov) ? " selected" : "") + ">" + escapeHtml(String(ol)) + "</option>";
          }).join("") + "</select></label>";
      }
      var inputType = (type === "number" || type === "numeric") ? "number" : "text";
      return '<label class="field"><span>' + escapeHtml(label) + '</span><input type="' + inputType + '" data-cf="' + escapeHtml(name) + '" value="' + escapeHtml(String(val)) + '" /></label>';
    }).join("");
  }

  function collectCustomFields() {
    var out = {};
    qsa("[data-cf]").forEach(function (el) {
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
    Object.keys(payload).forEach(function (key) {
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
      var list = await client.list("Customer.List", { filter_data: q, search: q, length: 25, start: 0 });
      var rows = list.rows || [];
      $("customerSuggest").hidden = false;
      if (!rows.length) {
        $("customerSuggest").innerHTML = "<button type='button' disabled>" + escapeHtml(t("noCustomers")) + "</button>";
        return;
      }
      $("customerSuggest").innerHTML = rows.map(function (row) {
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

  async function openEmailModal(cid) {
    var ids = Array.isArray(cid)
      ? cid.map(function (id) { return String(id || "").trim(); }).filter(Boolean)
      : String(cid || "").split(",").map(function (id) { return id.trim(); }).filter(Boolean);
    var uniqueIds = [];
    var seenIds = {};
    ids.forEach(function (id) {
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
    $("emailPreview").hidden = true;
    $("emailPreview").innerHTML = "";
    var names = [];
    ids.forEach(function (id) {
      var customer = state.customer && custIdOf(state.customer) === String(id) ? state.customer : null;
      if (!customer) {
        customer = state.orders.concat(state.customerOrders).find(function (row) {
          return custIdOf(row) === String(id);
        }) || { id: id };
      }
      names.push(customer.name || customer.customer_name || customer.customer_email || customer.email || ("#" + id));
    });
    $("emailToHint").textContent = ids.length > 1
      ? t("sendingToMany", { n: ids.length })
      : t("sendingTo", { name: names[0] });
    $("emailForm").dataset.custId = ids.join(",");
    $("emailModal").hidden = false;
    try {
      var list = await client.list("EmailTemplates.List", { status: 1, limit: 100, start: 0 });
      state.templates = list.rows || [];
      $("emailTemplate").innerHTML = '<option value="">' + escapeHtml(t("selectTemplate")) + "</option>" + state.templates.map(function (tpl) {
        var id = tpl.id || tpl.template_id || tpl.email_template_id;
        return '<option value="' + id + '">' + escapeHtml(tpl.name || tpl.template_name || tpl.subject || ("#" + id)) + "</option>";
      }).join("");
      if (!state.templates.length) showAlert("emailAlert", t("noTemplates"));
    } catch (err) {
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
    if (!tokens.length) {
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    wrap.setAttribute("dir", isHe() ? "rtl" : "ltr");
    tokens.forEach(function (token) {
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
            .replace(/<html([^>]*)>/i, function (full, attrs) {
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

  async function sendEmail(ev) {
    ev.preventDefault();
    showAlert("emailAlert");
    var templateId = $("emailTemplate") && $("emailTemplate").value;
    var custIds = String(($("emailForm") && $("emailForm").dataset.custId) || "")
      .split(",")
      .map(function (id) { return id.trim(); })
      .filter(Boolean);
    var uniqueCust = [];
    var seenCust = {};
    custIds.forEach(function (id) {
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
      var payload = {
        template_id: templateId,
        cust_ids: custIds.join(",")
      };
      var overrides = collectEmailTokenData();
      if (Object.keys(overrides).length) payload.data = overrides;
      var res = await api("Send.EmailTemplate", payload);
      if (!res || res.success === 0 || res.success === "0") {
        throw new Error((res && (res.message || res.error)) || t("emailSendFailed"));
      }
      var sent = res.sent != null ? res.sent : (res.total != null ? res.total : custIds.length);
      var failed = Number(res.failed) || 0;
      toast(t("emailSent", { sent: sent }));
      if (failed) toast(t("emailSendFailedCount", { n: failed }));
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
      window.OrderI18n.init({ onChange: function () {
        syncLiveStatus();
        renderFieldPicker();
        if (typeof opts.onLocale === "function") opts.onLocale();
      }});
    }
    if ($("fieldsBtn")) $("fieldsBtn").addEventListener("click", function (ev) {
      ev.stopPropagation();
      toggleFieldPicker();
    });
    if ($("fieldPickerClose")) $("fieldPickerClose").addEventListener("click", closeFieldPicker);
    if ($("fieldPickerSearch")) {
      $("fieldPickerSearch").addEventListener("input", renderFieldPicker);
    }
    document.addEventListener("click", function (ev) {
      var panel = $("fieldPicker");
      if (!panel || panel.hidden) return;
      if (ev.target.closest("#fieldPicker") || ev.target.closest("#fieldsBtn")) return;
      closeFieldPicker();
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") closeFieldPicker();
    });
    var dragFieldKey = "";
    document.addEventListener("dragstart", function (ev) {
      var row = ev.target.closest && ev.target.closest(".field-picker-row");
      if (!row) return;
      if (ev.target.closest("input, button, label")) {
        ev.preventDefault();
        return;
      }
      dragFieldKey = row.getAttribute("data-field-key") || "";
      try { ev.dataTransfer.setData("text/plain", dragFieldKey); } catch (e) {}
      row.classList.add("is-dragging");
    });
    document.addEventListener("dragend", function () {
      qsa(".field-picker-row.is-dragging").forEach(function (el) { el.classList.remove("is-dragging"); });
      qsa(".field-picker-row.is-over").forEach(function (el) { el.classList.remove("is-over"); });
    });
    document.addEventListener("dragover", function (ev) {
      var row = ev.target.closest && ev.target.closest(".field-picker-row");
      if (!row) return;
      ev.preventDefault();
      qsa(".field-picker-row.is-over").forEach(function (el) { el.classList.remove("is-over"); });
      row.classList.add("is-over");
    });
    document.addEventListener("drop", function (ev) {
      var row = ev.target.closest && ev.target.closest(".field-picker-row");
      if (!row) return;
      ev.preventDefault();
      var fromKey = dragFieldKey;
      try { fromKey = fromKey || ev.dataTransfer.getData("text/plain"); } catch (e) {}
      reorderPickerFields(fromKey, row.getAttribute("data-field-key"));
    });
    if ($("themeBtn")) $("themeBtn").addEventListener("click", toggleTheme);
    if ($("loginThemeBtn")) $("loginThemeBtn").addEventListener("click", toggleTheme);
    if ($("logoutBtn")) $("logoutBtn").addEventListener("click", function () { logout(false); });
    if ($("backBtn")) $("backBtn").addEventListener("click", goOrders);
    if ($("orderForm")) $("orderForm").addEventListener("submit", saveOrder);
    if ($("emailForm")) $("emailForm").addEventListener("submit", sendEmail);
    if ($("confirmDeleteBtn")) $("confirmDeleteBtn").addEventListener("click", confirmDelete);
    if ($("bulkDeleteBtn")) $("bulkDeleteBtn").addEventListener("click", askDeleteSelected);
    if ($("bulkEmailBtn")) $("bulkEmailBtn").addEventListener("click", openEmailForSelected);
    if ($("emailTemplate")) $("emailTemplate").addEventListener("change", previewTemplate);
    if ($("orderCatalog")) {
      $("orderCatalog").addEventListener("change", function () {
        var opt = this.selectedOptions[0];
        if (opt && opt.getAttribute("data-price") && !$("orderPrice").value) {
          $("orderPrice").value = opt.getAttribute("data-price");
          $("orderTotal").value = opt.getAttribute("data-price");
        }
      });
    }
    if ($("customerSearch")) {
      $("customerSearch").addEventListener("input", function () {
        clearTimeout(state.searchTimer);
        var q = this.value.trim();
        state.searchTimer = setTimeout(function () { searchCustomers(q); }, 280);
      });
    }
    document.addEventListener("change", function (ev) {
      var toggle = ev.target.closest("[data-field-toggle]");
      if (toggle) {
        setColumnOn(toggle.getAttribute("data-field-toggle"), !!toggle.checked);
        return;
      }
      var all = ev.target.closest("#selectAllRows");
      if (all) {
        var on = !!all.checked;
        qsa(".row-check").forEach(function (box) {
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
      qsa(".row-check").forEach(function (other) {
        if (other.getAttribute("data-select-id") !== id) return;
        other.checked = on;
        var wrap = other.closest("tr, .order-card");
        if (wrap) wrap.classList.toggle("is-selected", on);
      });
    });
    document.addEventListener("click", function (ev) {
      var el = ev.target.closest("[data-close], [data-catalog], [data-edit], [data-delete], [data-email], [data-pick-customer]");
      if (!el) return;
      if (el.hasAttribute("data-close")) closeModal(el.getAttribute("data-close"));
      if (el.hasAttribute("data-catalog") && typeof opts.onCatalog === "function") opts.onCatalog(el.getAttribute("data-catalog"));
      if (el.hasAttribute("data-edit")) editOrder(el.getAttribute("data-edit"));
      if (el.hasAttribute("data-delete")) askDelete(el.getAttribute("data-delete"));
      if (el.hasAttribute("data-email")) openEmailModal(el.getAttribute("data-email"));
      if (el.hasAttribute("data-pick-customer")) pickCustomer(el.getAttribute("data-pick-customer"), el.getAttribute("data-pick-name"));
    });
    qsa(".modal-backdrop").forEach(function (el) {
      el.addEventListener("mousedown", function (e) {
        if (e.target === el) el.hidden = true;
      });
    });
  }

  return {
    PAGE_SIZE: PAGE_SIZE,
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
    client: function () { return client; },
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
    toggleTheme: toggleTheme
  };
})();
