(function () {
  const langKey = "module_lang";
  const themeKey = "module_theme";
  const PAGE_SIZE = 25;

  const state = {
    navLevel: "customers",
    browseCustomers: [],
    browseTotal: 0,
    browseOffset: 0,
    browseSearch: "",
    browseFolderId: "",
    browseLoading: false,
    selectedCustomerId: "",
    selectedCustomerLabel: "",
    customerDetail: null,
    customerDetailLoading: false,
    docsTab: "invoices",
    invoiceRows: [],
    orderRows: []
  };

  function t(key, vars) {
    const lang = localStorage.getItem(langKey) || "en";
    const dict = window.I18N[lang] || window.I18N.en;
    let text = dict[key] || key;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        text = text.replace("{" + k + "}", String(vars[k]));
      });
    }
    return text;
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function hasToken() {
    return !!localStorage.getItem("biz1_sdk_bearer_token");
  }

  function applyLanguage() {
    const lang = localStorage.getItem(langKey) || "en";
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    document.querySelectorAll("#langToggle").forEach((btn) => {
      btn.textContent = lang.toUpperCase();
    });
  }

  function applyTheme() {
    const theme = localStorage.getItem(themeKey) || "light";
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelectorAll("#themeToggle").forEach((btn) => {
      btn.textContent = theme === "dark" ? "☀" : "☾";
    });
  }

  function toggleLang() {
    const next = (localStorage.getItem(langKey) || "en") === "en" ? "he" : "en";
    localStorage.setItem(langKey, next);
    applyLanguage();
    if (document.body.getAttribute("data-page") === "app") renderAll();
  }

  function toggleTheme() {
    const next = (localStorage.getItem(themeKey) || "light") === "light" ? "dark" : "light";
    localStorage.setItem(themeKey, next);
    applyTheme();
  }

  function customerIdOf(row) {
    return String((row && (row.customer_id || row.id || row.cust_id)) || "");
  }

  function customerNameOf(row) {
    return (row && (row.name || row.full_name || row.client_name)) || "";
  }

  function textOf(row, keys) {
    if (!row) return "";
    for (let i = 0; i < keys.length; i += 1) {
      const val = row[keys[i]];
      if (val != null && String(val).trim() !== "") return String(val);
    }
    return "";
  }

  function initialsFrom(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "U";
    return ((parts[0][0] || "") + (parts[1] ? parts[1][0] : "")).toUpperCase();
  }

  function setLive(on) {
    const pill = document.getElementById("livePill");
    const text = document.getElementById("liveText");
    if (!pill) return;
    pill.classList.toggle("is-on", !!on);
    if (text) text.textContent = on ? t("online") : t("offline");
  }

  function fillUserChip() {
    let user = window.Biz1Api.state.user;
    if (!user) {
      try {
        user = JSON.parse(localStorage.getItem("biz1_user_cache") || "{}");
      } catch (e) {
        user = {};
      }
    }
    const name = user.name || user.user_name || "User";
    const email = user.email || user.user_name || "";
    const avatar = document.getElementById("userAvatar");
    const nameEl = document.getElementById("userName");
    const emailEl = document.getElementById("userEmail");
    if (avatar) avatar.textContent = initialsFrom(name);
    if (nameEl) nameEl.textContent = name;
    if (emailEl) emailEl.textContent = email;
  }

  function syncNavUi() {
    const isCustomers = state.navLevel === "customers";
    const customerBrowse = document.getElementById("customerBrowse");
    const customerTableScroll = document.getElementById("customerTableScroll");
    const pagerBar = document.getElementById("pagerBar");
    const customerDetail = document.getElementById("customerDetail");
    const docsPanel = document.getElementById("docsPanel");
    const backBtn = document.getElementById("navBackBtn");
    const navTitle = document.getElementById("navTitle");

    if (customerBrowse) customerBrowse.classList.toggle("hidden", !isCustomers);
    if (customerTableScroll) customerTableScroll.classList.toggle("hidden", !isCustomers);
    if (pagerBar) pagerBar.classList.toggle("hidden", !isCustomers);
    if (customerDetail) customerDetail.classList.toggle("hidden", isCustomers);
    if (docsPanel) docsPanel.classList.toggle("hidden", isCustomers);
    if (backBtn) backBtn.classList.toggle("hidden", isCustomers);
    if (navTitle) {
      navTitle.textContent = isCustomers
        ? t("customersTitle")
        : state.selectedCustomerLabel || t("customersTitle");
    }
  }

  function renderFolderStrip() {
    const strip = document.getElementById("folderStrip");
    if (!strip) return;
    const folders = window.Biz1Api.getFolders();
    let html =
      '<button type="button" class="folder-chip' +
      (!state.browseFolderId ? " is-active" : "") +
      '" data-folder-id="">' +
      esc(t("allFolders")) +
      "</button>";
    folders.forEach((folder) => {
      const id = window.Biz1Api.folderId(folder);
      if (!id) return;
      html +=
        '<button type="button" class="folder-chip' +
        (String(state.browseFolderId) === id ? " is-active" : "") +
        '" data-folder-id="' +
        esc(id) +
        '"><span>' +
        esc(window.Biz1Api.folderName(folder) || "#" + id) +
        "</span></button>";
    });
    strip.innerHTML = html;
  }

  function renderPager() {
    const meta = document.getElementById("pagerMeta");
    const pages = Math.max(1, Math.ceil((state.browseTotal || 0) / PAGE_SIZE));
    const page = Math.floor(state.browseOffset / PAGE_SIZE) + 1;
    if (meta) meta.textContent = t("pageOf", { page: page, pages: pages }) + " · " + state.browseTotal;
    const prev = document.getElementById("pagerPrev");
    const next = document.getElementById("pagerNext");
    if (prev) prev.disabled = page <= 1 || state.browseLoading;
    if (next) next.disabled = page >= pages || state.browseLoading;
  }

  function renderCustomerBrowse() {
    renderFolderStrip();
    const clearBtn = document.getElementById("clearCustomerBrowseBtn");
    if (clearBtn) clearBtn.classList.toggle("hidden", !String(state.browseSearch || "").trim());

    const head = document.getElementById("customerTableHead");
    const body = document.getElementById("customerTableBody");
    if (!head || !body) return;

    head.innerHTML =
      "<tr>" +
      "<th>" + esc(t("clientName")) + "</th>" +
      "<th>" + esc(t("company")) + "</th>" +
      "<th>" + esc(t("phone")) + "</th>" +
      "<th>" + esc(t("email")) + "</th>" +
      "<th>" + esc(t("status")) + "</th>" +
      "<th>" + esc(t("notes")) + "</th>" +
      "</tr>";

    if (state.browseLoading && !state.browseCustomers.length) {
      body.innerHTML = '<tr><td colspan="6" class="muted">' + esc(t("loadingCustomers")) + "</td></tr>";
      return;
    }
    if (!state.browseCustomers.length) {
      body.innerHTML = '<tr><td colspan="6" class="muted">' + esc(t("noCustomers")) + "</td></tr>";
      return;
    }

    body.innerHTML = state.browseCustomers
      .map((customer) => {
        const id = customerIdOf(customer);
        const name = customerNameOf(customer) || "#" + id;
        const company = textOf(customer, ["company", "company_name"]);
        const phone = textOf(customer, ["phone", "mobile", "telephone"]);
        const email = textOf(customer, ["email", "mail"]);
        const status = textOf(customer, ["status_name", "status", "c_status"]) || "-";
        const notes = textOf(customer, ["notes", "note"]);
        return (
          '<tr class="customer-row" data-customer-id="' +
          esc(id) +
          '" data-customer-label="' +
          esc(name) +
          '">' +
          '<td class="col-customer-name">' +
          esc(name) +
          "</td>" +
          "<td>" +
          esc(company || "—") +
          "</td>" +
          "<td>" +
          esc(phone || "—") +
          "</td>" +
          "<td>" +
          esc(email || "—") +
          "</td>" +
          "<td><span class='tag'>" +
          esc(status) +
          "</span></td>" +
          "<td>" +
          esc(notes || "—") +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  async function loadCustomersBrowse() {
    const listError = document.getElementById("listError");
    const allowed = window.Biz1Api.getFolders().map((folder) => window.Biz1Api.folderId(folder));
    if (state.browseFolderId && allowed.indexOf(String(state.browseFolderId)) === -1) {
      state.browseFolderId = "";
    }
    state.browseLoading = true;
    renderCustomerBrowse();
    renderPager();
    try {
      const res = await window.Biz1Api.listCustomers({
        start: state.browseOffset,
        length: PAGE_SIZE,
        search: state.browseSearch,
        folder_id: state.browseFolderId
      });
      state.browseCustomers = res.rows || [];
      state.browseTotal = Number(res.count) || state.browseCustomers.length;
      state.browseLoading = false;
      if (listError) {
        listError.classList.add("hidden");
        listError.textContent = "";
      }
      renderCustomerBrowse();
      renderPager();
    } catch (err) {
      state.browseCustomers = [];
      state.browseLoading = false;
      renderCustomerBrowse();
      renderPager();
      if (listError) {
        listError.textContent = err.message || t("customersFailed");
        listError.classList.remove("hidden");
      }
    }
  }

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function parseMaybeJson(value) {
    if (typeof value !== "string") return value;
    const text = value.trim();
    if (!text || (text.charAt(0) !== "{" && text.charAt(0) !== "[")) return value;
    try {
      return JSON.parse(text);
    } catch (e) {
      return value;
    }
  }

  function skipCustomerKey(key) {
    const k = String(key || "").replace(/[\s-]+/g, "_");
    if (!k || k.charAt(0) === "_") return true;
    return /^(id|customer_id|cust_id|user_id|account_id|org_id|hased_id|hashed_id|customer_hash|password|token|archive|trash|created_by|updated_by|photo|image|avatar|profile_image|html|dt_rowid|checkbox|action|actions|color_class|row_class|permissions|permission|success|message|recordstotal|recordsfiltered|draw|extra_fields_json|extrafieldsjson|extra_fields|extrafields|custom_fields|folders_array|folder_array|shared_with|sharedwith|father_id|fatherid|city_id|cityid|csv_id|csvid|c_status|cstatus|age|lead_score|name|full_name|client_name|mobile|phone|email|company|company_name)$/i.test(
      k
    );
  }

  function isEmptyCustomerValue(value) {
    if (value == null) return true;
    if (typeof value === "boolean") return false;
    if (Array.isArray(value)) return !value.length;
    if (isPlainObject(value)) return !Object.keys(value).length;
    const text = String(value).trim();
    return text === "" || text === "0" || text === "null" || text === "undefined" || text === "[object Object]";
  }

  function formatCustomerScalar(value) {
    if (value == null) return "";
    if (typeof value === "boolean") return value ? "1" : "0";
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (item && typeof item === "object") {
            return item.name || item.label || item.title || "";
          }
          return String(item == null ? "" : item).trim();
        })
        .filter(Boolean)
        .join(", ");
    }
    const parsed = parseMaybeJson(value);
    if (parsed !== value) return formatCustomerScalar(parsed);
    return String(value).trim();
  }

  function isHttpUrl(value) {
    return /^https?:\/\//i.test(String(value || "").trim());
  }

  function humanizeFieldKey(key) {
    return String(key || "")
      .replace(/^(a|ga)[-_]?/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function customerExtraFields(customer) {
    if (!customer) return {};
    let extra = parseMaybeJson(customer.extra_fields || customer.extraFields || customer.custom_fields);
    if (!isPlainObject(extra) || !Object.keys(extra).length) {
      extra = parseMaybeJson(customer.extra_fields_json);
    }
    extra = isPlainObject(extra) ? Object.assign({}, extra) : {};
    Object.keys(customer).forEach((key) => {
      if (/^(a|ga)[-_\s]?\d+/i.test(key) && extra[key] == null) extra[key] = customer[key];
    });
    return extra;
  }

  function extraFieldDefs() {
    const data = window.Biz1Api.basicData ? window.Biz1Api.basicData() : {};
    const settings = data.field_settings || data.settings || {};
    const customer = settings.customer || settings.customers || {};
    return parseMaybeJson(
      customer.extra_fields || settings.extra_fields || data.customer_extra_fields || data.extra_fields || {}
    );
  }

  function normalizeFieldKey(key) {
    const text = String(key || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
    if (!text) return "";
    if (/^ga[-_]?/.test(text)) return "ga-" + text.replace(/^ga[-_]?/, "").replace(/_/g, "-");
    if (/^a[-_]?/.test(text)) return "a-" + text.replace(/^a[-_]?/, "").replace(/_/g, "-");
    if (/^\d+$/.test(text)) return "a-" + text;
    return text;
  }

  function buildExtraFieldIndex() {
    const list = extraFieldDefs();
    const byKey = {};
    function add(item) {
      if (!item || typeof item !== "object") return;
      const key = normalizeFieldKey(item.name || item.id || item.field_id || item.key || "");
      if (!key) return;
      byKey[key] = item;
      if (String(item.type || "").toLowerCase() === "group" && Array.isArray(item.group_data)) {
        item.group_data.forEach((child) => add(child));
      }
    }
    if (Array.isArray(list)) list.forEach(add);
    else if (isPlainObject(list)) {
      Object.keys(list).forEach((name) => {
        let item = list[name];
        if (item && typeof item === "object" && !item.name) item = Object.assign({ name: name }, item);
        add(item);
      });
    }
    return byKey;
  }

  function extraFieldLabel(key) {
    const def = buildExtraFieldIndex()[normalizeFieldKey(key)];
    if (!def) return humanizeFieldKey(key);
    const lang = localStorage.getItem(langKey) || "en";
    const type = String(def.type || "").toLowerCase();
    let he = "";
    let en = "";
    if (type === "group") {
      he = def.grp_name_he || def.he || def.label_he || "";
      en = def.grp_name_en || def.en || def.label_en || "";
    } else {
      he = def.he || def.label_he || def.name_he || "";
      en = def.en || def.label_en || def.name_en || def.label || "";
    }
    if (lang === "he") return String(he || en || humanizeFieldKey(key)).trim();
    return String(en || he || humanizeFieldKey(key)).trim();
  }

  function fieldHtml(label, value) {
    if (isEmptyCustomerValue(value) && !isPlainObject(value)) return "";
    const text = formatCustomerScalar(value);
    if (!text) return "";
    const body = isHttpUrl(text)
      ? '<a href="' + esc(text) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + "</a>"
      : esc(text);
    return (
      '<div class="detail-tile"><span>' +
      esc(label) +
      "</span><strong>" +
      body +
      "</strong></div>"
    );
  }

  function tilesWrap(html) {
    if (!html) return "";
    return '<div class="detail-tiles">' + html + "</div>";
  }

  function detailCard(title, inner) {
    if (!inner) return "";
    return '<section class="detail-card"><h3>' + esc(title) + "</h3>" + inner + "</section>";
  }

  function nestedCardHtml(title, obj) {
    if (!isPlainObject(obj)) return "";
    let inner = "";
    let nested = "";
    Object.keys(obj).forEach((key) => {
      if (skipCustomerKey(key)) return;
      const val = parseMaybeJson(obj[key]);
      if (isEmptyCustomerValue(val) && !isPlainObject(val)) return;
      if (isPlainObject(val)) {
        nested += nestedCardHtml(extraFieldLabel(key), val);
        return;
      }
      inner += fieldHtml(extraFieldLabel(key), val);
    });
    return detailCard(title, tilesWrap(inner)) + nested;
  }

  function parseFolderItems(customer) {
    const raw = parseMaybeJson(customer.folders || customer.folder || customer.folder_id || []);
    const folders = window.Biz1Api.getFolders();
    const ids = Array.isArray(raw)
      ? raw.map((item) => String(item && item.id != null ? item.id : item))
      : String(raw || "")
          .replace(/[\[\]"]/g, "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
    return ids.map((id) => {
      const found = folders.find((f) => window.Biz1Api.folderId(f) === String(id));
      return { id: id, label: found ? window.Biz1Api.folderName(found) : "#" + id };
    });
  }

  function parseTagItems(customer) {
    const raw = parseMaybeJson(customer.tag_id || customer.tags || customer.tag || []);
    if (Array.isArray(raw)) {
      return raw
        .map((item) => {
          if (item && typeof item === "object") {
            return { id: item.id || "", label: item.name || item.label || String(item.id || "") };
          }
          return { id: String(item), label: String(item) };
        })
        .filter((item) => item.label);
    }
    return String(raw || "")
      .replace(/[\[\]"]/g, "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((id) => ({ id: id, label: id }));
  }

  function renderCustomerDetail() {
    const el = document.getElementById("customerDetail");
    if (!el) return;
    if (!state.selectedCustomerId) {
      el.innerHTML = "";
      return;
    }
    const c = state.customerDetail || {};
    const name = customerNameOf(c) || state.selectedCustomerLabel || "#" + state.selectedCustomerId;
    const phone = textOf(c, ["phone", "phone1", "mobile", "telephone", "phone_number"]);
    const secondPhone = textOf(c, ["second_phone", "phone2"]);
    const email = textOf(c, ["email", "mail", "user_email"]);
    const company = textOf(c, ["company", "company_name"]);
    const waDigits = String(phone || secondPhone || "").replace(/[^\d]/g, "");

    let html = '<div class="customer-profile">';
    html += '<header class="detail-hero">';
    html += '<div class="customer-profile__avatar">' + esc(initialsFrom(name)) + "</div>";
    html += '<div class="customer-profile__identity"><h2>' + esc(name) + "</h2>";
    html += '<div class="customer-profile__meta">';
    html += '<span class="tag">' + esc(textOf(c, ["status_name", "status"]) || "Active") + "</span>";
    if (company && company !== name) html += '<span class="detail-hero__company">' + esc(company) + "</span>";
    html += "</div></div>";
    html += '<div class="customer-profile__actions">';
    html += '<button type="button" class="btn btn--ghost btn--sm" id="editCustomerBtn">' + esc(t("edit")) + "</button>";
    html += '<button type="button" class="btn btn--ghost btn--sm" id="deleteCustomerBtn">' + esc(t("delete")) + "</button>";
    html += "</div></header>";

    if (state.customerDetailLoading && !state.customerDetail) {
      html += '<p class="muted">' + esc(t("loadingCustomer")) + "</p></div>";
      el.innerHTML = html;
      return;
    }

    let contactChips = "";
    if (phone) {
      contactChips += '<a class="detail-chip" href="tel:' + esc(phone) + '">' + esc(phone) + "</a>";
      if (waDigits) {
        contactChips +=
          '<a class="detail-chip detail-chip--wa" href="https://wa.me/' +
          esc(waDigits) +
          '" target="_blank" rel="noopener noreferrer">' +
          esc(t("whatsapp")) +
          "</a>";
      }
    }
    if (email) contactChips += '<a class="detail-chip" href="mailto:' + esc(email) + '">' + esc(email) + "</a>";

    let contactTiles = "";
    if (secondPhone && secondPhone !== phone) contactTiles += fieldHtml(t("secondPhone"), secondPhone);

    let detailsTiles = "";
    detailsTiles += fieldHtml(t("clientName"), name);
    detailsTiles += fieldHtml(t("company"), company && company !== name ? company : "");
    detailsTiles += fieldHtml(t("phone"), phone);
    detailsTiles += fieldHtml(t("email"), email);
    detailsTiles += fieldHtml(t("dateCreated"), textOf(c, ["date", "date_created", "created_at", "created"]));
    detailsTiles += fieldHtml(t("lastUpdated"), textOf(c, ["last_updated", "updated", "updated_at"]));
    detailsTiles += fieldHtml(t("followup"), textOf(c, ["followup", "follow_up"]));
    detailsTiles += fieldHtml(t("remarks"), textOf(c, ["remarks", "remark", "comments"]));
    detailsTiles += fieldHtml(t("notes"), textOf(c, ["notes", "note", "internal_notes"]));
    detailsTiles += fieldHtml(t("website"), textOf(c, ["website", "site", "url"]));
    detailsTiles += fieldHtml(t("address"), textOf(c, ["address", "street"]));
    detailsTiles += fieldHtml(t("city"), textOf(c, ["city"]));
    detailsTiles += fieldHtml(t("source"), textOf(c, ["source"]));
    detailsTiles += fieldHtml("ID", state.selectedCustomerId);

    const extra = customerExtraFields(c);
    let extraTiles = "";
    let extraNested = "";
    Object.keys(extra).forEach((key) => {
      if (skipCustomerKey(key)) return;
      const val = parseMaybeJson(extra[key]);
      if (isEmptyCustomerValue(val) && !isPlainObject(val)) return;
      if (isPlainObject(val) || Array.isArray(val)) {
        if (isPlainObject(val)) extraNested += nestedCardHtml(extraFieldLabel(key), val);
        else extraTiles += fieldHtml(extraFieldLabel(key), val);
        return;
      }
      extraTiles += fieldHtml(extraFieldLabel(key), val);
    });

    // Also surface any non-skipped top-level customer fields not already shown
    Object.keys(c).forEach((key) => {
      if (skipCustomerKey(key)) return;
      if (Object.prototype.hasOwnProperty.call(extra, key)) return;
      const val = parseMaybeJson(c[key]);
      if (isEmptyCustomerValue(val) || isPlainObject(val) || Array.isArray(val)) return;
      if (/^(a|ga)[-_\s]?\d+/i.test(key)) return;
      detailsTiles += fieldHtml(humanizeFieldKey(key), val);
    });

    let main = "";
    if (contactChips || contactTiles) {
      main += detailCard(
        t("contactInfo"),
        (contactChips ? '<div class="detail-contact">' + contactChips + "</div>" : "") + tilesWrap(contactTiles)
      );
    }
    main += detailCard(t("customerDetails"), tilesWrap(detailsTiles));
    if (extraTiles || extraNested) {
      main += detailCard(t("customFields"), tilesWrap(extraTiles));
      main += extraNested;
    }

    let aside = "";
    const folderItems = parseFolderItems(c);
    if (folderItems.length) {
      aside +=
        '<div class="customer-profile__aside-card"><h3>' +
        esc(t("folders")) +
        "</h3>" +
        folderItems
          .map((item) => '<span class="customer-chip">' + esc(item.label) + "</span>")
          .join(" ") +
        "</div>";
    }
    const tags = parseTagItems(c);
    if (tags.length) {
      aside +=
        '<div class="customer-profile__aside-card"><h3>' +
        esc(t("tags")) +
        "</h3>" +
        tags.map((item) => '<span class="customer-chip">' + esc(item.label) + "</span>").join(" ") +
        "</div>";
    }

    html += '<div class="customer-profile__body">';
    html += '<div class="customer-profile__main">' + main + "</div>";
    if (aside) html += '<aside class="customer-profile__aside">' + aside + "</aside>";
    html += "</div></div>";

    el.innerHTML = html;

    const editBtn = document.getElementById("editCustomerBtn");
    const deleteBtn = document.getElementById("deleteCustomerBtn");
    if (editBtn) editBtn.addEventListener("click", openEditModal);
    if (deleteBtn) deleteBtn.addEventListener("click", openDeleteModal);
  }

  function docId(doc) {
    return String((doc && (doc.document_id || doc.id || doc.file_id)) || "");
  }

  function docTitle(doc) {
    return (doc && (doc.title || doc.name || doc.file_name || doc.type)) || "Document";
  }

  function renderDocRows(tbodyId, rows, kind) {
    const body = document.getElementById(tbodyId);
    if (!body) return;
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="3" class="muted">' + esc(t("noData")) + "</td></tr>";
      return;
    }
    body.innerHTML = rows
      .map((doc) => {
        return (
          '<tr class="doc-row" data-kind="' +
          esc(kind) +
          '" data-doc-id="' +
          esc(docId(doc)) +
          '"><td>' +
          esc(docTitle(doc)) +
          "</td><td>" +
          esc(doc.type || doc.document_type || "—") +
          "</td><td>" +
          esc(doc.date || doc.date_created || doc.created_at || "—") +
          "</td></tr>"
        );
      })
      .join("");
  }

  function renderDocDetail(doc, detailEl, viewerEl) {
    if (!detailEl) return;
    detailEl.classList.remove("muted");
    detailEl.innerHTML =
      "<dl>" +
      "<div><dt>" + esc(t("name")) + "</dt><dd>" + esc(docTitle(doc)) + "</dd></div>" +
      "<div><dt>" + esc(t("docType")) + "</dt><dd>" + esc(doc.type || doc.document_type || "-") + "</dd></div>" +
      "<div><dt>" + esc(t("docDate")) + "</dt><dd>" + esc(doc.date || doc.date_created || doc.created_at || "-") + "</dd></div>" +
      "<div><dt>" + esc(t("docAmount")) + "</dt><dd>" + esc(doc.total || doc.amount || doc.sum || "-") + "</dd></div>" +
      "<div><dt>ID</dt><dd>" + esc(docId(doc)) + "</dd></div>" +
      "</dl>";

    if (!viewerEl) return;
    viewerEl.hidden = true;
    viewerEl.removeAttribute("src");
    viewerEl.removeAttribute("srcdoc");

    window.Biz1Api.viewDocument(docId(doc))
      .then((result) => {
        const url = result.output || result.url || result.pdf_url || doc.pdf_url || doc.url;
        if (url && String(url).indexOf("http") === 0) {
          viewerEl.hidden = false;
          viewerEl.src = url;
        } else {
          viewerEl.hidden = false;
          viewerEl.srcdoc =
            "<pre style='padding:12px;white-space:pre-wrap;font-family:sans-serif'>" +
            esc(JSON.stringify(result, null, 2)) +
            "</pre>";
        }
      })
      .catch((err) => {
        detailEl.innerHTML += '<p class="alert alert--error" style="margin-top:.75rem">' + esc(err.message) + "</p>";
      });
  }

  async function loadInvoiceList() {
    const detail = document.getElementById("invoiceDetail");
    const viewer = document.getElementById("invoiceViewer");
    if (detail) {
      detail.className = "detail-box muted";
      detail.textContent = t("selectInvoiceHint");
    }
    if (viewer) viewer.hidden = true;
    const body = document.getElementById("invoiceListBody");
    if (body) body.innerHTML = '<tr><td colspan="3" class="muted">' + esc(t("loading")) + "</td></tr>";
    try {
      const types = ["invoice", "receipt", "delivery_invoice"];
      const all = [];
      const seen = {};
      for (const type of types) {
        const data = await window.Biz1Api.listDocuments(state.selectedCustomerId, type);
        (data.rows || []).forEach((row) => {
          const id = docId(row);
          if (id && !seen[id]) {
            seen[id] = true;
            all.push(row);
          }
        });
      }
      if (!all.length) {
        const fallback = await window.Biz1Api.listDocuments(state.selectedCustomerId);
        (fallback.rows || [])
          .filter((row) => {
            const type = String(row.type || row.document_type || "").toLowerCase();
            return type.indexOf("invoice") !== -1 || type.indexOf("receipt") !== -1;
          })
          .forEach((row) => all.push(row));
      }
      state.invoiceRows = all;
      renderDocRows("invoiceListBody", all, "invoice");
    } catch (err) {
      if (body) body.innerHTML = '<tr><td colspan="3" class="alert alert--error">' + esc(err.message) + "</td></tr>";
    }
  }

  async function loadOrderList() {
    const detail = document.getElementById("orderDetail");
    const viewer = document.getElementById("orderViewer");
    if (detail) {
      detail.className = "detail-box muted";
      detail.textContent = t("selectOrderHint");
    }
    if (viewer) viewer.hidden = true;
    const body = document.getElementById("orderListBody");
    if (body) body.innerHTML = '<tr><td colspan="3" class="muted">' + esc(t("loading")) + "</td></tr>";
    try {
      const types = ["order_proposals", "purchase_orders", "order_proposal", "purchase_order"];
      const all = [];
      const seen = {};
      for (const type of types) {
        const data = await window.Biz1Api.listDocuments(state.selectedCustomerId, type);
        (data.rows || []).forEach((row) => {
          const id = docId(row);
          if (id && !seen[id]) {
            seen[id] = true;
            all.push(row);
          }
        });
      }
      if (!all.length) {
        const fallback = await window.Biz1Api.listDocuments(state.selectedCustomerId);
        (fallback.rows || [])
          .filter((row) => {
            const type = String(row.type || row.document_type || "").toLowerCase();
            return type.indexOf("order") !== -1 || type.indexOf("proposal") !== -1 || type.indexOf("purchase") !== -1;
          })
          .forEach((row) => all.push(row));
      }
      state.orderRows = all;
      renderDocRows("orderListBody", all, "order");
    } catch (err) {
      if (body) body.innerHTML = '<tr><td colspan="3" class="alert alert--error">' + esc(err.message) + "</td></tr>";
    }
  }

  function showDocsTab(name) {
    state.docsTab = name;
    document.querySelectorAll(".seg-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-panel") === name);
    });
    const invoices = document.getElementById("panelInvoices");
    const orders = document.getElementById("panelOrders");
    if (invoices) invoices.classList.toggle("hidden", name !== "invoices");
    if (orders) orders.classList.toggle("hidden", name !== "orders");
    if (name === "invoices") loadInvoiceList();
    if (name === "orders") loadOrderList();
  }

  async function openCustomer(id, label) {
    state.selectedCustomerId = String(id);
    state.selectedCustomerLabel = label || "#" + id;
    state.customerDetail = null;
    state.customerDetailLoading = true;
    state.navLevel = "customer";
    localStorage.setItem("selected_customer_id", state.selectedCustomerId);
    syncNavUi();
    renderCustomerDetail();
    showDocsTab("invoices");
    try {
      try {
        await window.Biz1Api.loadBasic();
      } catch (e) { /* ignore */ }
      const data = await window.Biz1Api.getCustomer(id);
      state.customerDetail = data.customer || data.row || data.data || data;
      if (customerNameOf(state.customerDetail)) {
        state.selectedCustomerLabel = customerNameOf(state.customerDetail);
      }
      state.customerDetailLoading = false;
      renderCustomerDetail();
    } catch (err) {
      state.customerDetailLoading = false;
      renderCustomerDetail();
      const el = document.getElementById("customerDetail");
      if (el) el.innerHTML += '<p class="alert alert--error">' + esc(err.message) + "</p>";
    }
  }

  function openCustomers() {
    state.navLevel = "customers";
    state.selectedCustomerId = "";
    state.customerDetail = null;
    syncNavUi();
    renderCustomerBrowse();
  }

  function openEditModal() {
    const c = state.customerDetail || {};
    const modal = document.getElementById("customerEditModal");
    const form = document.getElementById("editCustomerForm");
    if (!modal || !form) return;
    form.customer_id.value = state.selectedCustomerId;
    form.name.value = customerNameOf(c) || state.selectedCustomerLabel || "";
    form.company.value = textOf(c, ["company", "company_name"]);
    form.phone.value = textOf(c, ["phone", "mobile"]);
    form.email.value = textOf(c, ["email"]);
    form.note.value = textOf(c, ["notes", "note"]);
    const note = document.getElementById("editNote");
    if (note) {
      note.classList.add("hidden");
      note.textContent = "";
    }
    modal.classList.remove("hidden");
  }

  function closeEditModal() {
    const modal = document.getElementById("customerEditModal");
    if (modal) modal.classList.add("hidden");
  }

  function openDeleteModal() {
    const modal = document.getElementById("deleteCustomerModal");
    if (modal) modal.classList.remove("hidden");
  }

  function closeDeleteModal() {
    const modal = document.getElementById("deleteCustomerModal");
    if (modal) modal.classList.add("hidden");
  }

  function renderAll() {
    syncNavUi();
    if (state.navLevel === "customers") {
      renderCustomerBrowse();
      renderPager();
    } else {
      renderCustomerDetail();
    }
  }

  async function bootstrapApp() {
    fillUserChip();
    syncNavUi();
    try {
      await window.Biz1Api.connectRealtime(
        async function (event) {
          const key = event.key || "";
          if (key.startsWith("crm.") || key.startsWith("customer.")) {
            if (state.navLevel === "customers") await loadCustomersBrowse();
            else if (state.selectedCustomerId) await openCustomer(state.selectedCustomerId, state.selectedCustomerLabel);
          }
        },
        function (ok) {
          setLive(ok);
        }
      );
    } catch (err) {
      setLive(false);
    }
    await loadCustomersBrowse();
    const fromUrl = new URLSearchParams(window.location.search).get("customer_id");
    if (fromUrl) {
      await openCustomer(fromUrl, "");
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, "", "index.html");
      }
    }
  }

  function wireAppEvents() {
    const form = document.getElementById("customerBrowseForm");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        state.browseSearch = document.getElementById("customerBrowseInput").value.trim();
        state.browseOffset = 0;
        loadCustomersBrowse();
      });
    }
    const clearBtn = document.getElementById("clearCustomerBrowseBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        document.getElementById("customerBrowseInput").value = "";
        state.browseSearch = "";
        state.browseOffset = 0;
        loadCustomersBrowse();
      });
    }
    const strip = document.getElementById("folderStrip");
    if (strip) {
      strip.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-folder-id]");
        if (!btn) return;
        state.browseFolderId = btn.getAttribute("data-folder-id") || "";
        state.browseOffset = 0;
        loadCustomersBrowse();
      });
    }
    const body = document.getElementById("customerTableBody");
    if (body) {
      body.addEventListener("click", (e) => {
        const row = e.target.closest(".customer-row");
        if (!row) return;
        openCustomer(row.getAttribute("data-customer-id"), row.getAttribute("data-customer-label"));
      });
    }
    document.getElementById("pagerPrev")?.addEventListener("click", () => {
      state.browseOffset = Math.max(0, state.browseOffset - PAGE_SIZE);
      loadCustomersBrowse();
    });
    document.getElementById("pagerNext")?.addEventListener("click", () => {
      state.browseOffset += PAGE_SIZE;
      loadCustomersBrowse();
    });
    document.getElementById("navBackBtn")?.addEventListener("click", openCustomers);
    document.getElementById("syncBtn")?.addEventListener("click", () => {
      if (state.navLevel === "customers") loadCustomersBrowse();
      else if (state.docsTab === "invoices") loadInvoiceList();
      else loadOrderList();
    });
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      window.Biz1Api.logout();
      window.location.replace("login.html");
    });

    document.querySelectorAll(".seg-btn").forEach((btn) => {
      btn.addEventListener("click", () => showDocsTab(btn.getAttribute("data-panel")));
    });
    document.getElementById("refreshInvoices")?.addEventListener("click", loadInvoiceList);
    document.getElementById("refreshOrders")?.addEventListener("click", loadOrderList);

    document.getElementById("invoiceListBody")?.addEventListener("click", (e) => {
      const row = e.target.closest(".doc-row");
      if (!row) return;
      document.querySelectorAll("#invoiceListBody .doc-row").forEach((r) => r.classList.remove("is-active"));
      row.classList.add("is-active");
      const doc = state.invoiceRows.find((d) => docId(d) === row.getAttribute("data-doc-id"));
      if (doc) renderDocDetail(doc, document.getElementById("invoiceDetail"), document.getElementById("invoiceViewer"));
    });
    document.getElementById("orderListBody")?.addEventListener("click", (e) => {
      const row = e.target.closest(".doc-row");
      if (!row) return;
      document.querySelectorAll("#orderListBody .doc-row").forEach((r) => r.classList.remove("is-active"));
      row.classList.add("is-active");
      const doc = state.orderRows.find((d) => docId(d) === row.getAttribute("data-doc-id"));
      if (doc) renderDocDetail(doc, document.getElementById("orderDetail"), document.getElementById("orderViewer"));
    });

    document.getElementById("closeEditModal")?.addEventListener("click", closeEditModal);
    document.getElementById("cancelEdit")?.addEventListener("click", closeEditModal);
    document.getElementById("closeDeleteModal")?.addEventListener("click", closeDeleteModal);
    document.getElementById("cancelDelete")?.addEventListener("click", closeDeleteModal);

    document.getElementById("editCustomerForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const note = document.getElementById("editNote");
      try {
        if (note) {
          note.className = "alert alert--info";
          note.classList.remove("hidden");
          note.textContent = t("loading");
        }
        const res = await window.Biz1Api.updateCustomer({
          customer_id: form.customer_id.value,
          name: form.name.value.trim(),
          company: form.company.value.trim(),
          phone: form.phone.value.trim(),
          email: form.email.value.trim(),
          note: form.note.value.trim()
        });
        if (res.exists) throw new Error(res.message || "Customer already exists");
        closeEditModal();
        await openCustomer(state.selectedCustomerId, form.name.value.trim());
      } catch (err) {
        if (note) {
          note.className = "alert alert--error";
          note.classList.remove("hidden");
          note.textContent = err.message;
        }
      }
    });

    document.getElementById("confirmDeleteCustomerBtn")?.addEventListener("click", async () => {
      try {
        await window.Biz1Api.deleteCustomer(state.selectedCustomerId);
        closeDeleteModal();
        openCustomers();
        await loadCustomersBrowse();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  async function loginHandler(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const username = form.username.value.trim();
    const password = form.password.value;
    const otpWrap = document.getElementById("otpField");
    const otpVisible = otpWrap && !otpWrap.classList.contains("hidden");
    const otp = otpVisible ? form.otp.value.trim() : "";
    const note = document.getElementById("loginNote");
    const btn = document.getElementById("loginBtn");

    function showError(message) {
      if (!note) return;
      note.className = "alert alert--error";
      note.classList.remove("hidden");
      note.textContent = message;
    }

    if (otpVisible && !otp) {
      showError(t("otpRequired"));
      return;
    }

    if (btn) btn.disabled = true;
    if (note) {
      note.className = "alert alert--info";
      note.classList.remove("hidden");
      note.textContent = t("loading");
    }

    try {
      const res = await window.Biz1Api.login({ username, password, otp });
      if (res.otpRequired) {
        if (otpWrap) otpWrap.classList.remove("hidden");
        showError(res.message || t("otpRequired"));
        form.otp?.focus();
        return;
      }
      console.log("[Login] Bearer token:", res.token || localStorage.getItem("biz1_sdk_bearer_token"));
      window.location.replace("index.html");
    } catch (err) {
      showError(err.message || t("loginFailed"));
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function wireCommon() {
    document.querySelectorAll("#langToggle").forEach((btn) => btn.addEventListener("click", toggleLang));
    document.querySelectorAll("#themeToggle").forEach((btn) => btn.addEventListener("click", toggleTheme));
    const togglePassword = document.getElementById("togglePassword");
    if (togglePassword) {
      togglePassword.addEventListener("click", () => {
        const input = document.getElementById("password");
        if (!input) return;
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        togglePassword.textContent = show ? t("loginHidePassword") : t("loginShowPassword");
      });
    }
    const loginForm = document.getElementById("loginForm");
    if (loginForm) loginForm.addEventListener("submit", loginHandler);
  }

  window.addEventListener("DOMContentLoaded", async function () {
    applyTheme();
    applyLanguage();
    wireCommon();

    const page = document.body.getAttribute("data-page");
    if (page === "login") {
      if (hasToken()) {
        window.location.replace("index.html");
        return;
      }
      return;
    }

    if (page === "app") {
      if (!hasToken()) {
        window.location.replace("login.html");
        return;
      }
      wireAppEvents();
      await bootstrapApp();
    }
  });
})();
