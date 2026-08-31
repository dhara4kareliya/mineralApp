/**
 * ClinicPulse — main application (multi-page)
 * Pages: index.html (login), coupons.html, doctors.html, patients.html
 */

const PAGE_FILES = {
  login: "index.html",
  coupons: "coupons.html",
  doctors: "doctors.html",
  patients: "patients.html",
  customers: "patients.html",
};

const App = {
  page: document.documentElement.getAttribute("data-page") || "login",
  view: "coupons",
  couponPage: 1,
  couponTotal: 0,
  couponRows: [],
  custPage: 1,
  custTotal: 0,
  custRows: [],
  doctorData: null,
  doctorChart: null,
  typeChart: null,
  refreshTimer: null,

  customerColumns: [
    { key: "name", labelKey: "name", default: true },
    { key: "mobile", labelKey: "mobile", default: true },
    { key: "email", labelKey: "email", default: true },
    { key: "next_appointment_date", labelKey: "next_appointment", default: true },
    { key: "doctor_name", labelKey: "doctor", default: true },
    { key: "complete_appointment", labelKey: "completed", default: true },
    { key: "pending_appointment", labelKey: "pending", default: true },
  ],

  visibleColumns: null,

  // ——— Init ———
  init() {
    this.page = document.documentElement.getAttribute("data-page") || "login";
    this.view = this.page === "patients" ? "customers" : this.page === "login" ? "coupons" : this.page;

    this.loadTheme();
    this.loadColumnPrefs();
    I18n.apply();
    this.bindUI();

    if (this.page === "login") {
      if (Api.token) {
        this.goToPage(localStorage.getItem("clinicpulse_page") || "coupons.html");
        return;
      }
      this.readyLogin();
      return;
    }

    // Protected pages — boot.js already redirected if no token
    if (!Api.token) {
      this.goToPage("index.html");
      return;
    }

    this.enterApp().catch(() => this.goToPage("index.html"));
  },

  readyLogin() {
    document.body.classList.remove("booting");
    document.getElementById("login-screen")?.classList.remove("hidden");
  },

  goToPage(file) {
    const target = String(file || "coupons.html");
    if (!/index\.html$/.test(target)) {
      localStorage.setItem("clinicpulse_page", target);
    }
    location.href = target;
  },

  bindUI() {
    // Theme / lang
    document.getElementById("theme-btn")?.addEventListener("click", () => this.toggleTheme());
    document.getElementById("login-theme-btn")?.addEventListener("click", () => this.toggleTheme());
    document.getElementById("lang-btn")?.addEventListener("click", () => {
      I18n.toggle();
      this.onLangChange();
    });
    document.getElementById("login-lang-btn")?.addEventListener("click", () => {
      I18n.toggle();
    });

    // Login
    document.getElementById("login-form")?.addEventListener("submit", (e) => this.handleLogin(e));
    document.getElementById("login-back-btn")?.addEventListener("click", () => this.resetLoginForm());
    document.getElementById("logout-btn")?.addEventListener("click", () => this.logout());

    // Nav links remember last page (actual navigation via href)
    document.querySelectorAll(".nav-item[href]").forEach((link) => {
      link.addEventListener("click", () => {
        const href = link.getAttribute("href");
        if (href) localStorage.setItem("clinicpulse_page", href);
      });
    });
    document.getElementById("menu-btn")?.addEventListener("click", () => this.toggleSidebar(true));
    document.getElementById("sidebar-overlay")?.addEventListener("click", () => this.toggleSidebar(false));

    // Coupons
    document.getElementById("coupon-add-btn")?.addEventListener("click", () => this.openCouponModal());
    document.getElementById("coupon-search-btn")?.addEventListener("click", () => {
      this.couponPage = 1;
      this.loadCoupons();
    });
    document.getElementById("coupon-reset-btn")?.addEventListener("click", () => this.resetCouponFilters());
    document.getElementById("coupon-export-btn")?.addEventListener("click", () => this.exportCoupons());
    document.getElementById("coupon-prev")?.addEventListener("click", () => {
      if (this.couponPage > 1) {
        this.couponPage -= 1;
        this.loadCoupons();
      }
    });
    document.getElementById("coupon-next")?.addEventListener("click", () => {
      const pages = Math.max(1, Math.ceil(this.couponTotal / 25));
      if (this.couponPage < pages) {
        this.couponPage += 1;
        this.loadCoupons();
      }
    });

    // Coupon modal
    document.getElementById("coupon-modal-close")?.addEventListener("click", () => this.closeCouponModal());
    document.getElementById("coupon-modal-backdrop")?.addEventListener("click", () => this.closeCouponModal());
    document.getElementById("coupon-form-cancel")?.addEventListener("click", () => this.closeCouponModal());
    document.getElementById("coupon-form")?.addEventListener("submit", (e) => this.saveCoupon(e));
    document.getElementById("form-customer-search")?.addEventListener("input", (e) => {
      clearTimeout(this._customerSearchTimer);
      this._customerSearchTimer = setTimeout(() => this.searchCustomers(e.target.value), 300);
    });
    document.getElementById("form-appointment-type")?.addEventListener("change", () => this.maybeFillInsuranceAmounts());
    document.getElementById("form-insurance")?.addEventListener("change", () => this.maybeFillInsuranceAmounts());

    // Confirm modal
    document.getElementById("confirm-modal-close")?.addEventListener("click", () => this.closeConfirmModal());
    document.getElementById("confirm-modal-backdrop")?.addEventListener("click", () => this.closeConfirmModal());
    document.getElementById("confirm-cancel")?.addEventListener("click", () => this.closeConfirmModal());
    document.getElementById("confirm-ok")?.addEventListener("click", () => this.runConfirmAction());

    // Coupon table actions (event delegation)
    document.getElementById("coupon-tbody")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-coupon-action]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-coupon-action");
      if (action === "edit") this.openCouponModal(id);
      if (action === "delete") this.confirmDeleteCoupon(id, btn.getAttribute("data-code") || "");
    });
    document.getElementById("form-customer-results")?.addEventListener("click", (e) => {
      const item = e.target.closest("[data-customer-id]");
      if (!item) return;
      this.selectCustomer(item.dataset.customerId, item.dataset.customerName || "");
    });

    // Doctors
    document.getElementById("doctor-search-btn")?.addEventListener("click", () => this.loadDoctors());
    document.getElementById("doctor-reset-btn")?.addEventListener("click", () => this.resetDoctorFilters());
    document.getElementById("doctor-export-btn")?.addEventListener("click", () => this.exportDoctors());
    document.getElementById("doctor-branch")?.addEventListener("change", () => this.onBranchChange());

    // Customers
    document.getElementById("cust-search-btn")?.addEventListener("click", () => {
      this.custPage = 1;
      this.loadCustomers();
    });
    document.getElementById("cust-reset-btn")?.addEventListener("click", () => this.resetCustFilters());
    document.getElementById("cust-export-btn")?.addEventListener("click", () => this.exportCustomers());
    document.getElementById("cust-columns-btn")?.addEventListener("click", () => this.toggleColumnPicker());
    document.getElementById("cust-prev")?.addEventListener("click", () => {
      if (this.custPage > 1) {
        this.custPage -= 1;
        this.loadCustomers();
      }
    });
    document.getElementById("cust-next")?.addEventListener("click", () => {
      const pages = Math.max(1, Math.ceil(this.custTotal / 25));
      if (this.custPage < pages) {
        this.custPage += 1;
        this.loadCustomers();
      }
    });
  },

  onLangChange() {
    I18n.apply();
    this.updateViewTitles();
    this._couponLookupsReady = false;
    if (this.view === "customers") {
      this.renderColumnPicker();
      this.renderCustomers();
    }
    if (this.view === "doctors" && this.doctorData) {
      this.renderDoctorSummary(this.doctorData);
      this.renderDoctorMatrix(this.doctorData);
      this.renderCharts(this.doctorData);
    }
    if (this.view === "coupons" && this.couponRows.length) this.renderCoupons();
    if (this.view === "doctors") this.loadBranches(true);
    this.updateSocketStatus(Api.socketReady);
  },

  // ——— Theme ———
  loadTheme() {
    const theme = localStorage.getItem("clinicpulse_theme") || "light";
    document.documentElement.setAttribute("data-theme", theme);
  },

  toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("clinicpulse_theme", next);
    if (this.doctorData) this.renderCharts(this.doctorData);
  },

  // ——— Auth ———
  showLogin() {
    this.goToPage("index.html");
  },

  showApp() {
    document.body.classList.remove("booting");
    document.getElementById("boot-screen")?.classList.add("hidden");
    document.getElementById("app-shell")?.classList.remove("hidden");
  },

  resetLoginForm() {
    document.getElementById("login-step-credentials")?.classList.remove("hidden");
    document.getElementById("login-step-otp")?.classList.add("hidden");
    document.getElementById("login-back-btn")?.classList.add("hidden");
    const otp = document.getElementById("login-otp");
    if (otp) otp.value = "";
    document.getElementById("login-error")?.classList.add("hidden");
    const label = document.querySelector("#login-submit .btn-label");
    if (label) label.setAttribute("data-i18n", "sign_in");
    I18n.apply();
  },

  async handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    const otp = document.getElementById("login-otp").value.trim();
    const errEl = document.getElementById("login-error");
    const submit = document.getElementById("login-submit");

    errEl.classList.add("hidden");
    submit.disabled = true;
    submit.querySelector(".btn-spinner")?.classList.remove("hidden");

    try {
      Api.setDomain("https://eli.bull36.com");
      const result = await Api.login({ username, password, otp });

      if (result.otpRequired) {
        document.getElementById("login-step-credentials")?.classList.add("hidden");
        document.getElementById("login-step-otp")?.classList.remove("hidden");
        document.getElementById("login-back-btn")?.classList.remove("hidden");
        document.getElementById("otp-message").textContent =
          result.message || I18n.t("otp_hint");
        const label = document.querySelector("#login-submit .btn-label");
        if (label) {
          label.setAttribute("data-i18n", "verify_otp");
          label.textContent = I18n.t("verify_otp");
        }
        document.getElementById("login-otp")?.focus();
        return;
      }

      this.toast(I18n.t("login_success"), "success");
      const last = localStorage.getItem("clinicpulse_page") || "coupons.html";
      this.goToPage(last.includes("index") ? "coupons.html" : last);
    } catch (err) {
      errEl.textContent = err.message || I18n.t("login_failed");
      errEl.classList.remove("hidden");
    } finally {
      submit.disabled = false;
      submit.querySelector(".btn-spinner")?.classList.add("hidden");
    }
  },

  async enterApp() {
    try {
      const cached = Api.getCachedUserBasic();
      if (cached) {
        this.populateUser(cached);
        this.showApp();
        this.updateViewTitles();
        if (this.view === "customers") this.renderColumnPicker();
        this.loadCurrentPageData();
      }

      const basic = await Api.userBasic();
      this.populateUser(basic);
      this.showApp();
      this.updateViewTitles();
      if (this.view === "customers") this.renderColumnPicker();
      if (!cached) this.loadCurrentPageData();
      this.setupRealtime();

      const file = PAGE_FILES[this.page] || "coupons.html";
      localStorage.setItem("clinicpulse_page", file);
    } catch (err) {
      if (err.code === 401) {
        Api.clearSession();
        this.toast(I18n.t("session_expired"), "error");
        this.goToPage("index.html");
        return;
      }
      throw err;
    }
  },

  loadCurrentPageData() {
    if (this.view === "coupons") this.loadCoupons();
    else if (this.view === "doctors") this.loadDoctors();
    else if (this.view === "customers") this.loadCustomers();
  },

  populateUser(basic) {
    const user = basic.user || {};
    const org = basic.org || {};
    const nameEl = document.getElementById("user-name");
    const emailEl = document.getElementById("user-email");
    const orgEl = document.getElementById("org-name");
    const avatarEl = document.getElementById("user-avatar");
    if (nameEl) nameEl.textContent = user.name || "—";
    if (emailEl) emailEl.textContent = user.email || "—";
    if (orgEl) orgEl.textContent = org.name || org.user_domain || "—";
    if (avatarEl) avatarEl.textContent = (user.name || "U").charAt(0).toUpperCase();

    if (!localStorage.getItem("clinicpulse_lang") && (user.language === "he" || basic.settings?.language === "he")) {
      I18n.setLang("he");
    }
  },

  async loadBranches(force = false) {
    const branchSelect = document.getElementById("doctor-branch");
    if (!branchSelect) return;
    if (!force && this.branches?.length && branchSelect.options.length > 1) return;

    const selected = branchSelect.value;
    try {
      const res = await Api.listBranches({ lang: I18n.lang });
      this.branches = res.data || [];
      branchSelect.innerHTML = `<option value="">${I18n.t("all_branches")}</option>`;
      this.branches.forEach((b) => {
        const id = b.branch_id || b.id;
        const name =
          I18n.lang === "he"
            ? b.branch_name_he || b.name_he || b.branch_name || b.name || `Branch ${id}`
            : b.branch_name || b.name || b.branch_name_he || b.name_he || `Branch ${id}`;
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = name;
        if (Array.isArray(b.doctor_ids) && b.doctor_ids.length) {
          opt.dataset.doctorIds = JSON.stringify(b.doctor_ids);
        } else if (Array.isArray(b.team_member) && b.team_member.length) {
          opt.dataset.doctorIds = JSON.stringify(b.team_member);
        }
        branchSelect.appendChild(opt);
      });
      if (selected && [...branchSelect.options].some((o) => o.value === selected)) {
        branchSelect.value = selected;
      }
    } catch (err) {
      console.warn("Failed to load branches:", err);
      if (branchSelect.options.length <= 1) {
        branchSelect.innerHTML = `<option value="">${I18n.t("all_branches")}</option>`;
      }
    }
  },

  onBranchChange() {
    const branchSelect = document.getElementById("doctor-branch");
    const selectedOpt = branchSelect?.selectedOptions?.[0];
    let doctorIds = [];
    try {
      doctorIds = selectedOpt?.dataset?.doctorIds ? JSON.parse(selectedOpt.dataset.doctorIds) : [];
    } catch (_) {
      doctorIds = [];
    }

    // When a branch is selected, pre-check its doctors (API also uses branch_id)
    if (doctorIds.length) {
      const idSet = new Set(doctorIds.map(String));
      document.querySelectorAll("#doctor-checks input[type=checkbox]").forEach((cb) => {
        cb.checked = idSet.has(String(cb.value));
      });
    }

    this.loadDoctors();
  },

  logout() {
    Api.clearSession();
    this.destroyCharts();
    localStorage.removeItem("clinicpulse_page");
    this.goToPage("index.html");
  },

  // ——— Realtime ———
  setupRealtime() {
    Api.on("ready", () => this.updateSocketStatus(true));
    Api.on("offline", () => this.updateSocketStatus(false));
    Api.on("refresh", () => {
      this.toast(I18n.t("realtime_update"), "info");
      clearTimeout(this.refreshTimer);
      this.refreshTimer = setTimeout(() => this.refreshCurrentView(), 800);
    });
    Api.connectRealtime().then(() => {
      setTimeout(() => {
        if (!Api.socketReady) this.updateSocketStatus(false);
      }, 3000);
    }).catch(() => this.updateSocketStatus(false));
  },

  updateSocketStatus(online) {
    const el = document.getElementById("socket-status");
    if (!el) return;
    el.classList.toggle("online", !!online);
    const span = el.querySelector("span:last-child");
    if (span) span.textContent = I18n.t(online ? "realtime_online" : "realtime_offline");
  },

  refreshCurrentView() {
    this.loadCurrentPageData();
  },

  // ——— Navigation ———
  switchView(view) {
    const file = PAGE_FILES[view] || "coupons.html";
    this.goToPage(file);
  },

  updateViewTitles() {
    const map = {
      coupons: { title: "nav_coupons", sub: "coupons_subtitle" },
      doctors: { title: "nav_doctors", sub: "doctors_subtitle" },
      customers: { title: "nav_customers", sub: "customers_subtitle" },
    };
    const m = map[this.view] || map.coupons;
    const t = document.getElementById("view-title");
    const s = document.getElementById("view-subtitle");
    if (t) {
      t.setAttribute("data-i18n", m.title);
      t.textContent = I18n.t(m.title);
    }
    if (s) {
      s.setAttribute("data-i18n", m.sub);
      s.textContent = I18n.t(m.sub);
    }
  },

  toggleSidebar(open) {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (!sidebar) return;
    if (typeof open !== "boolean") open = !sidebar.classList.contains("open");
    sidebar.classList.toggle("open", open);
    overlay?.classList.toggle("show", open);
  },

  setDefaultDates() {
    /* Doctor report intentionally has no default dates — empty = all time (matches Postman) */
  },

  resetDoctorFilters() {
    const fromEl = document.getElementById("doctor-from");
    const toEl = document.getElementById("doctor-to");
    const branchEl = document.getElementById("doctor-branch");
    if (fromEl) fromEl.value = "";
    if (toEl) toEl.value = "";
    if (branchEl) branchEl.value = "";
    document.querySelectorAll("#doctor-checks input[type=checkbox]").forEach((cb) => {
      cb.checked = false;
    });
    this.loadDoctors();
  },

  getSelectedDoctorIds() {
    return Array.from(document.querySelectorAll("#doctor-checks input[type=checkbox]:checked")).map(
      (cb) => Number(cb.value) || cb.value
    );
  },

  updateDoctorFilterLabel(data) {
    const el = document.getElementById("doctor-filter-active");
    if (!el) return;

    const parts = [];
    const from = data?.from_date || dateInputValue(document.getElementById("doctor-from"));
    const to = data?.to_date || dateInputValue(document.getElementById("doctor-to"));
    const branch = document.getElementById("doctor-branch")?.value;
    const selected = this.getSelectedDoctorIds();

    if (from || to) {
      parts.push(I18n.t("filter_dates", { from: from || "…", to: to || "…" }));
    } else {
      parts.push(I18n.t("filter_all_dates"));
    }
    if (branch) parts.push(I18n.t("filter_branch", { branch }));
    if (selected.length) parts.push(I18n.t("filter_doctors_count", { count: selected.length }));

    el.textContent = parts.join(" · ");
    el.classList.toggle("hidden", !parts.length);
  },

  // ——— Coupons ———
  couponFilters() {
    return {
      coupon_code: document.getElementById("coupon-code")?.value.trim() || "",
      cust_name: document.getElementById("coupon-customer")?.value.trim() || "",
      coupon_status: document.getElementById("coupon-status")?.value || "",
      from_amt: document.getElementById("coupon-from-amt")?.value || "",
      to_amt: document.getElementById("coupon-to-amt")?.value || "",
      page_id: this.couponPage,
      limit: 25,
    };
  },

  resetCouponFilters() {
    ["coupon-code", "coupon-customer", "coupon-from-amt", "coupon-to-amt"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const st = document.getElementById("coupon-status");
    if (st) st.value = "";
    this.couponPage = 1;
    this.loadCoupons();
  },

  async loadCoupons() {
    const tbody = document.getElementById("coupon-tbody");
    if (!tbody) return;
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">${I18n.t("loading")}</td></tr>`;
    try {
      const data = await Api.listCoupons(this.couponFilters());
      this.couponRows = data.data || data.rows || [];
      this.couponTotal = Number(data.recordsTotal ?? data.count ?? this.couponRows.length) || 0;
      this.renderCoupons();
    } catch (err) {
      this.handleApiError(err);
      tbody.innerHTML = `<tr class="empty-row"><td colspan="8">${err.message || I18n.t("error_generic")}</td></tr>`;
    }
  },

  renderCoupons() {
    const tbody = document.getElementById("coupon-tbody");
    if (!tbody) return;
    document.getElementById("stat-coupon-total").textContent = this.formatNumber(this.couponTotal);
    document.getElementById("stat-coupon-page").textContent = this.formatNumber(this.couponRows.length);

    const pages = Math.max(1, Math.ceil(this.couponTotal / 25) || 1);
    document.getElementById("coupon-page-info").textContent = I18n.t("page_of", {
      page: this.couponPage,
      pages,
    });
    document.getElementById("coupon-prev").disabled = this.couponPage <= 1;
    document.getElementById("coupon-next").disabled = this.couponPage >= pages;

    if (!this.couponRows.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="8">${I18n.t("no_data")}</td></tr>`;
      return;
    }

    tbody.innerHTML = this.couponRows
      .map((row) => {
        const id = row.id || row.coupon_id;
        const status = String(row.status_label || row.coupon_status || "").toLowerCase();
        const unused = status.includes("unused") || status === "0";
        const badgeClass = unused ? "badge-unused" : "badge-used";
        const canEdit = row.can_edit !== false && unused;
        const canDelete = row.can_delete !== false && unused;
        const actions = `
          <td class="actions-cell">
            ${canEdit ? `<button type="button" class="btn btn-secondary btn-sm" data-coupon-action="edit" data-id="${escapeHtml(id)}" data-i18n-skip>${I18n.t("edit")}</button>` : ""}
            ${canDelete ? `<button type="button" class="btn btn-danger btn-sm" data-coupon-action="delete" data-id="${escapeHtml(id)}" data-code="${escapeHtml(row.coupon_code || "")}">${I18n.t("delete")}</button>` : ""}
            ${!canEdit && !canDelete ? `<span class="text-muted">—</span>` : ""}
          </td>`;
        return `<tr>
          <td><strong>${escapeHtml(row.coupon_code || "—")}</strong></td>
          <td>${escapeHtml(row.customer_name || "—")}</td>
          <td>${escapeHtml(row.appointment_type_name || "—")}</td>
          <td>${escapeHtml(row.insurance_name || row.coupon_insurance || "—")}</td>
          <td>${escapeHtml(formatMoney(row.amount))}</td>
          <td>${escapeHtml(formatMoney(row.left_amount))}</td>
          <td><span class="badge ${badgeClass}">${escapeHtml(row.status_label || status || "—")}</span></td>
          ${actions}
        </tr>`;
      })
      .join("");
  },

  exportCoupons() {
    if (!this.couponRows.length) return;
    const headers = [
      I18n.t("coupon_code"),
      I18n.t("customer_name"),
      I18n.t("appointment_type"),
      I18n.t("insurance"),
      I18n.t("amount"),
      I18n.t("left_amount"),
      I18n.t("status"),
    ];
    const rows = this.couponRows.map((r) => [
      r.coupon_code,
      r.customer_name,
      r.appointment_type_name,
      r.insurance_name || r.coupon_insurance,
      r.amount,
      r.left_amount,
      r.status_label,
    ]);
    downloadCsv("coupons.csv", headers, rows);
    this.toast(I18n.t("exported"), "success");
  },

  async ensureCouponLookups() {
    if (this._couponLookupsReady) return;
    const [typesRes, insRes] = await Promise.all([
      Api.listAppointmentTypes(),
      Api.listInsuranceCompanies({ lang: I18n.lang }),
    ]);
    this.appointmentTypes = typesRes.data || [];
    this.insuranceCompanies = insRes.data || [];
    this._couponLookupsReady = true;
    this.fillCouponSelects();
  },

  fillCouponSelects() {
    const typeSelect = document.getElementById("form-appointment-type");
    const insSelect = document.getElementById("form-insurance");
    if (typeSelect) {
      const current = typeSelect.value;
      typeSelect.innerHTML = `<option value="">${I18n.t("select_option")}</option>`;
      (this.appointmentTypes || []).forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = t.name || `Type ${t.id}`;
        typeSelect.appendChild(opt);
      });
      if (current) typeSelect.value = current;
    }
    if (insSelect) {
      const current = insSelect.value;
      insSelect.innerHTML = `<option value="">${I18n.t("select_option")}</option>`;
      (this.insuranceCompanies || []).forEach((ins) => {
        const opt = document.createElement("option");
        opt.value = ins.id;
        opt.textContent = ins.name || ins.name_en || ins.name_he || `Insurance ${ins.id}`;
        insSelect.appendChild(opt);
      });
      if (current) insSelect.value = current;
    }
  },

  async openCouponModal(couponId = null) {
    const modal = document.getElementById("coupon-modal");
    if (!modal) return;
    const title = document.getElementById("coupon-modal-title");
    const errEl = document.getElementById("coupon-form-error");
    errEl?.classList.add("hidden");

    try {
      await this.ensureCouponLookups();
    } catch (err) {
      this.handleApiError(err);
      return;
    }

    document.getElementById("coupon-form")?.reset();
    document.getElementById("form-coupon-id").value = "";
    document.getElementById("form-customer-id").value = "";
    document.getElementById("form-customer-selected").textContent = "";
    document.getElementById("form-customer-results")?.classList.add("hidden");
    this.fillCouponSelects();

    if (couponId) {
      title.setAttribute("data-i18n", "edit_coupon");
      title.textContent = I18n.t("edit_coupon");
      try {
        const res = await Api.getCoupon(couponId);
        const data = res.data || res;
        document.getElementById("form-coupon-id").value = data.id || couponId;
        document.getElementById("form-coupon-code").value = data.coupon_code || "";
        document.getElementById("form-customer-id").value = data.customer_id || "";
        document.getElementById("form-customer-search").value = data.customer_name || "";
        document.getElementById("form-customer-selected").textContent = data.customer_name
          ? `${I18n.t("selected")}: ${data.customer_name}`
          : "";
        document.getElementById("form-appointment-type").value = data.appointment_type_id || "";
        document.getElementById("form-insurance").value = data.insurance || data.coupon_insurance || data.insurance_id || "";
        document.getElementById("form-amount").value = data.amount ?? "";
        document.getElementById("form-left-amount").value = data.left_amount ?? "";
        document.getElementById("form-notes").value = data.notes || data.coupon_note || "";
        if (data.coupon_date) {
          document.getElementById("form-coupon-date").value = String(data.coupon_date).slice(0, 10);
        }
      } catch (err) {
        this.handleApiError(err);
        return;
      }
    } else {
      title.setAttribute("data-i18n", "add_coupon");
      title.textContent = I18n.t("add_coupon");
      const today = new Date();
      const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      document.getElementById("form-coupon-date").value = ymd;
    }

    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
  },

  closeCouponModal() {
    document.getElementById("coupon-modal")?.classList.add("hidden");
    document.body.classList.remove("modal-open");
  },

  async searchCustomers(query) {
    const box = document.getElementById("form-customer-results");
    if (!box) return;
    const q = String(query || "").trim();
    if (q.length < 2) {
      box.classList.add("hidden");
      box.innerHTML = "";
      return;
    }
    box.classList.remove("hidden");
    box.innerHTML = `<div class="search-item muted">${I18n.t("loading")}</div>`;
    try {
      const data = await Api.listCrmCustomers({
        search: q,
        filter_data: q,
        "search[value]": q,
        length: 25,
      });
      const rows = data.data || data.rows || [];
      if (!rows.length) {
        box.innerHTML = `<div class="search-item muted">${I18n.t("no_data")}</div>`;
        return;
      }
      box.innerHTML = rows
        .map((c) => {
          const id = c.customer_id || c.id;
          const name = c.name || c.customer_name || id;
          const mobile = c.mobile || c.phone || "";
          return `<button type="button" class="search-item" data-customer-id="${escapeHtml(id)}" data-customer-name="${escapeHtml(name)}">
            <strong>${escapeHtml(name)}</strong>
            <span>${escapeHtml(mobile)}</span>
          </button>`;
        })
        .join("");
    } catch (err) {
      box.innerHTML = `<div class="search-item muted">${escapeHtml(err.message || I18n.t("error_generic"))}</div>`;
    }
  },

  selectCustomer(id, name) {
    document.getElementById("form-customer-id").value = id;
    document.getElementById("form-customer-search").value = name;
    document.getElementById("form-customer-selected").textContent = `${I18n.t("selected")}: ${name}`;
    document.getElementById("form-customer-results")?.classList.add("hidden");
  },

  async maybeFillInsuranceAmounts() {
    const typeId = document.getElementById("form-appointment-type")?.value;
    const insuranceId = document.getElementById("form-insurance")?.value;
    if (!typeId || !insuranceId) return;
    try {
      const data = await Api.couponInsuranceAmount(typeId, insuranceId);
      const amount = data.amount ?? data.data?.amount ?? data.data?.insurance_price;
      const left = data.left_amount ?? data.data?.left_amount ?? data.data?.insurance_customer_price;
      if (amount != null) document.getElementById("form-amount").value = amount;
      if (left != null) document.getElementById("form-left-amount").value = left;
    } catch (_) {
      /* optional helper — ignore if not configured */
    }
  },

  async saveCoupon(e) {
    e.preventDefault();
    const errEl = document.getElementById("coupon-form-error");
    const submit = document.getElementById("coupon-form-save");
    errEl?.classList.add("hidden");

    const couponId = document.getElementById("form-coupon-id")?.value;
    const customerId = document.getElementById("form-customer-id")?.value;
    const couponCode = document.getElementById("form-coupon-code")?.value.trim();
    const typeId = document.getElementById("form-appointment-type")?.value;

    if (!customerId || !couponCode || !typeId) {
      if (errEl) {
        errEl.textContent = I18n.t("required_fields");
        errEl.classList.remove("hidden");
      }
      return;
    }

    const payload = {
      customer_id: customerId,
      coupon_code: couponCode,
      appointment_type_id: typeId,
      insurance: document.getElementById("form-insurance")?.value || "",
      amount: document.getElementById("form-amount")?.value || "",
      left_amount: document.getElementById("form-left-amount")?.value || "",
      notes: document.getElementById("form-notes")?.value.trim() || "",
      coupon_date: document.getElementById("form-coupon-date")?.value || "",
    };

    submit.disabled = true;
    submit.querySelector(".btn-spinner")?.classList.remove("hidden");
    try {
      if (couponId) {
        await Api.editCoupon({ coupon_id: couponId, ...payload });
        this.toast(I18n.t("coupon_updated"), "success");
      } else {
        await Api.addCoupon(payload);
        this.toast(I18n.t("coupon_created"), "success");
      }
      this.closeCouponModal();
      this.loadCoupons();
    } catch (err) {
      if (errEl) {
        errEl.textContent = err.message || I18n.t("error_generic");
        errEl.classList.remove("hidden");
      } else {
        this.handleApiError(err);
      }
    } finally {
      submit.disabled = false;
      submit.querySelector(".btn-spinner")?.classList.add("hidden");
    }
  },

  confirmDeleteCoupon(id, code) {
    this._confirmAction = async () => {
      await Api.deleteCoupon(id);
      this.toast(I18n.t("coupon_deleted"), "success");
      this.loadCoupons();
    };
    const msg = document.getElementById("confirm-message");
    if (msg) {
      msg.textContent = code
        ? I18n.t("delete_coupon_named", { code })
        : I18n.t("delete_coupon_confirm");
    }
    document.getElementById("confirm-modal")?.classList.remove("hidden");
    document.body.classList.add("modal-open");
  },

  closeConfirmModal() {
    this._confirmAction = null;
    document.getElementById("confirm-modal")?.classList.add("hidden");
    if (document.getElementById("coupon-modal")?.classList.contains("hidden")) {
      document.body.classList.remove("modal-open");
    }
  },

  async runConfirmAction() {
    const action = this._confirmAction;
    const okBtn = document.getElementById("confirm-ok");
    if (!action) return;
    okBtn.disabled = true;
    try {
      await action();
      this.closeConfirmModal();
    } catch (err) {
      this.handleApiError(err);
    } finally {
      okBtn.disabled = false;
    }
  },

  // ——— Doctors ———
  doctorFilters() {
    const selected = this.getSelectedDoctorIds();
    const params = {
      from_date: dateInputValue(document.getElementById("doctor-from")),
      to_date: dateInputValue(document.getElementById("doctor-to")),
      branch_id: document.getElementById("doctor-branch")?.value || "",
    };
    if (selected.length) params.doctor_ids = selected;
    return params;
  },

  async loadDoctors() {
    const body = document.getElementById("doctor-matrix-body");
    const summaryBody = document.getElementById("doctor-summary-body");
    if (!body) return;
    body.innerHTML = `<tr class="empty-row"><td>${I18n.t("loading")}</td></tr>`;
    if (summaryBody) {
      summaryBody.innerHTML = `<tr class="empty-row"><td colspan="3">${I18n.t("loading")}</td></tr>`;
    }
    try {
      await this.loadBranches();
      const data = await Api.listDoctorReport(this.doctorFilters());
      this.doctorData = data;
      this.populateDoctorFilterFromReport(data.doctors || []);
      this.renderDoctorReport(data);
      this.updateDoctorFilterLabel(data);
    } catch (err) {
      this.handleApiError(err);
      body.innerHTML = `<tr class="empty-row"><td>${err.message || I18n.t("error_generic")}</td></tr>`;
      if (summaryBody) {
        summaryBody.innerHTML = `<tr class="empty-row"><td colspan="3">${err.message || I18n.t("error_generic")}</td></tr>`;
      }
    }
  },

  populateDoctorFilterFromReport(doctors) {
    const box = document.getElementById("doctor-checks");
    if (!box || !doctors.length) return;

    const selected = new Set(
      Array.from(box.querySelectorAll("input[type=checkbox]:checked")).map((cb) => String(cb.value))
    );

    box.innerHTML = doctors
      .map((d) => {
        const id = String(d.id);
        const checked = selected.has(id) ? "checked" : "";
        return `<label class="doctor-check-item">
          <input type="checkbox" value="${escapeHtml(id)}" ${checked} />
          <span>${escapeHtml(d.name || `ID ${d.id}`)}</span>
        </label>`;
      })
      .join("");
  },

  findMatrixCell(cells, doctor, index) {
    if (!Array.isArray(cells)) return null;
    return (
      cells.find((c) => String(c.doctor_id) === String(doctor.id)) ||
      cells[index] ||
      null
    );
  },

  renderDoctorReport(data) {
    const doctors = data.doctors || [];
    const types = data.types || [];
    const totals = data.totals || [];
    const totalRev = totals.reduce((s, t) => s + Number(t.total_cost ?? t.cost ?? 0), 0);
    const totalVisits = totals.reduce((s, t) => s + Number(t.total_appointments ?? t.appo ?? 0), 0);

    document.getElementById("stat-doctor-revenue").textContent = formatMoney(totalRev);
    document.getElementById("stat-doctor-visits").textContent = this.formatNumber(totalVisits);
    document.getElementById("stat-doctor-count").textContent = this.formatNumber(doctors.length);
    const typeCountEl = document.getElementById("stat-type-count");
    if (typeCountEl) typeCountEl.textContent = this.formatNumber(types.length || (data.matrix || []).length);

    this.renderCharts(data);
    this.renderDoctorSummary(data);
    this.renderDoctorMatrix(data);
  },

  renderDoctorSummary(data) {
    const tbody = document.getElementById("doctor-summary-body");
    if (!tbody) return;

    const totals = data.totals || [];
    if (!totals.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="3">${I18n.t("no_data")}</td></tr>`;
      return;
    }

    tbody.innerHTML = totals
      .map((row) => {
        const visits = Number(row.total_appointments ?? row.appo ?? 0);
        const revenue = Number(row.total_cost ?? row.cost ?? 0);
        const name = row.doctor_name || row.name || row.doctor_id || "—";
        return `<tr>
          <td><strong>${escapeHtml(name)}</strong></td>
          <td>${this.formatNumber(visits)}</td>
          <td>${escapeHtml(formatMoney(revenue))}</td>
        </tr>`;
      })
      .join("");
  },

  renderCharts(data) {
    const doctorSeries = normalizeDoctorPieSeries(data.pie_doctor_series, data.totals || []);
    const typeSeries = normalizeTypePieSeries(data.pie_type_series, data.matrix || []);

    const colors = chartColors();
    this.doctorChart = upsertPieChart(
      this.doctorChart,
      "chart-doctor-revenue",
      "chart-doctor-empty",
      doctorSeries,
      colors,
      "revenue"
    );
    this.typeChart = upsertPieChart(
      this.typeChart,
      "chart-type-volume",
      "chart-type-empty",
      typeSeries,
      colors,
      "volume"
    );
  },

  renderDoctorMatrix(data) {
    const doctors = data.doctors || [];
    const matrix = data.matrix || [];
    const totals = data.totals || [];
    const head = document.getElementById("doctor-matrix-head");
    const body = document.getElementById("doctor-matrix-body");

    if (!doctors.length && !matrix.length) {
      head.innerHTML = "";
      body.innerHTML = `<tr class="empty-row"><td>${I18n.t("no_data")}</td></tr>`;
      return;
    }

    head.innerHTML = `<tr>
      <th>${I18n.t("treatment_type")}</th>
      ${doctors.map((d) => `<th>${escapeHtml(d.name || d.id)}</th>`).join("")}
    </tr>`;

    const rowsHtml = matrix
      .map((row) => {
        const cells = doctors
          .map((d, i) => {
            const cell = this.findMatrixCell(row.cells, d, i);
            const count = cell ? Number(cell.appointment_count ?? cell.appo ?? 0) : 0;
            const cost = cell ? Number(cell.total_cost ?? cell.cost ?? 0) : 0;
            return `<td class="matrix-cell">${this.formatNumber(count)}<small>${formatMoney(cost)}</small></td>`;
          })
          .join("");
        return `<tr><td>${escapeHtml(row.type_name || row.type_id)}</td>${cells}</tr>`;
      })
      .join("");

    const totalsRow = `<tr class="matrix-totals-row">
      <td><strong>${I18n.t("totals")}</strong></td>
      ${doctors
        .map((d) => {
          const t = totals.find((x) => String(x.doctor_id) === String(d.id)) || {};
          const visits = Number(t.total_appointments ?? t.appo ?? 0);
          const cost = Number(t.total_cost ?? t.cost ?? 0);
          return `<td class="matrix-cell"><strong>${this.formatNumber(visits)}</strong><small>${formatMoney(cost)}</small></td>`;
        })
        .join("")}
    </tr>`;

    body.innerHTML = (rowsHtml || "") + totalsRow;
  },

  exportDoctors() {
    if (!this.doctorData) return;
    const doctors = this.doctorData.doctors || [];
    const matrix = this.doctorData.matrix || [];
    const totals = this.doctorData.totals || [];

    const lines = [];
    lines.push([I18n.t("practitioner_matrix")]);
    lines.push([I18n.t("treatment_type"), ...doctors.map((d) => d.name || d.id)]);
    matrix.forEach((row) => {
      const cells = doctors.map((d, i) => {
        const cell = this.findMatrixCell(row.cells, d, i);
        if (!cell) return "0 / 0";
        const count = cell.appointment_count ?? cell.appo ?? 0;
        const cost = cell.total_cost ?? cell.cost ?? 0;
        return `${count} / ${cost}`;
      });
      lines.push([row.type_name, ...cells]);
    });
    lines.push([]);
    lines.push([I18n.t("practitioner_summary")]);
    lines.push([I18n.t("doctor"), I18n.t("visits"), I18n.t("revenue")]);
    totals.forEach((t) => {
      lines.push([
        t.doctor_name || t.doctor_id,
        t.total_appointments ?? t.appo ?? 0,
        t.total_cost ?? t.cost ?? 0,
      ]);
    });

    downloadCsvLines("doctor-report.csv", lines);
    this.toast(I18n.t("exported"), "success");
  },

  destroyCharts() {
    if (this.doctorChart) {
      this.doctorChart.destroy();
      this.doctorChart = null;
    }
    if (this.typeChart) {
      this.typeChart.destroy();
      this.typeChart = null;
    }
  },

  // ——— Customers ———
  loadColumnPrefs() {
    try {
      const raw = localStorage.getItem("clinicpulse_cust_cols");
      this.visibleColumns = raw
        ? JSON.parse(raw)
        : this.customerColumns.filter((c) => c.default).map((c) => c.key);
    } catch {
      this.visibleColumns = this.customerColumns.filter((c) => c.default).map((c) => c.key);
    }
  },

  saveColumnPrefs() {
    localStorage.setItem("clinicpulse_cust_cols", JSON.stringify(this.visibleColumns));
  },

  renderColumnPicker() {
    const box = document.getElementById("column-checks");
    if (!box) return;
    box.innerHTML = this.customerColumns
      .map((col) => {
        const checked = this.visibleColumns.includes(col.key) ? "checked" : "";
        return `<label><input type="checkbox" data-col="${col.key}" ${checked} /> ${I18n.t(col.labelKey)}</label>`;
      })
      .join("");
    box.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", () => {
        this.visibleColumns = Array.from(box.querySelectorAll("input:checked")).map((i) => i.dataset.col);
        if (!this.visibleColumns.length) {
          this.visibleColumns = ["name"];
          box.querySelector('input[data-col="name"]').checked = true;
        }
        this.saveColumnPrefs();
        this.renderCustomers();
      });
    });
  },

  toggleColumnPicker() {
    document.getElementById("column-picker")?.classList.toggle("hidden");
  },

  custFilters() {
    return {
      name: document.getElementById("cust-name")?.value.trim() || "",
      mobile: document.getElementById("cust-mobile")?.value.trim() || "",
      email: document.getElementById("cust-email")?.value.trim() || "",
      date_created_from: dateInputValue(document.getElementById("cust-from")),
      date_created_to: dateInputValue(document.getElementById("cust-to")),
      page_id: this.custPage,
      limit: 25,
    };
  },

  resetCustFilters() {
    ["cust-name", "cust-mobile", "cust-email", "cust-from", "cust-to"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    this.custPage = 1;
    this.loadCustomers();
  },

  async loadCustomers() {
    const tbody = document.getElementById("customer-tbody");
    const cols = this.visibleColumns.length || 1;
    tbody.innerHTML = `<tr class="empty-row"><td colspan="${cols}">${I18n.t("loading")}</td></tr>`;
    try {
      const data = await Api.listCustomers(this.custFilters());
      this.custRows = data.data || data.rows || [];
      this.custTotal = Number(data.recordsTotal ?? data.count ?? this.custRows.length) || 0;
      this.renderCustomers();
    } catch (err) {
      this.handleApiError(err);
      tbody.innerHTML = `<tr class="empty-row"><td colspan="${cols}">${err.message || I18n.t("error_generic")}</td></tr>`;
    }
  },

  renderCustomers() {
    const thead = document.getElementById("customer-thead");
    const tbody = document.getElementById("customer-tbody");
    const cols = this.customerColumns.filter((c) => this.visibleColumns.includes(c.key));

    document.getElementById("stat-cust-total").textContent = this.formatNumber(this.custTotal);
    document.getElementById("stat-cust-page").textContent = this.formatNumber(this.custRows.length);

    const pages = Math.max(1, Math.ceil(this.custTotal / 25) || 1);
    document.getElementById("cust-page-info").textContent = I18n.t("page_of", {
      page: this.custPage,
      pages,
    });
    document.getElementById("cust-prev").disabled = this.custPage <= 1;
    document.getElementById("cust-next").disabled = this.custPage >= pages;

    thead.innerHTML = `<tr>${cols.map((c) => `<th>${I18n.t(c.labelKey)}</th>`).join("")}</tr>`;

    if (!this.custRows.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="${cols.length}">${I18n.t("no_data")}</td></tr>`;
      return;
    }

    tbody.innerHTML = this.custRows
      .map((row) => {
        const cells = cols
          .map((c) => {
            let val = row[c.key];
            if (c.key === "name") val = `<strong>${escapeHtml(val || "—")}</strong>`;
            else if (val == null || val === "") val = "—";
            else val = escapeHtml(String(val));
            return `<td>${val}</td>`;
          })
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");
  },

  exportCustomers() {
    if (!this.custRows.length) return;
    const cols = this.customerColumns.filter((c) => this.visibleColumns.includes(c.key));
    const headers = cols.map((c) => I18n.t(c.labelKey));
    const rows = this.custRows.map((r) => cols.map((c) => r[c.key]));
    downloadCsv("patients.csv", headers, rows);
    this.toast(I18n.t("exported"), "success");
  },

  // ——— Helpers ———
  formatNumber(n) {
    const num = Number(n) || 0;
    return new Intl.NumberFormat(I18n.lang === "he" ? "he-IL" : "en-US").format(num);
  },

  handleApiError(err) {
    if (err.code === 401) {
      Api.clearSession();
      this.showLogin();
      this.toast(I18n.t("session_expired"), "error");
      return;
    }
    this.toast(err.message || I18n.t("error_generic"), "error");
  },

  toast(message, type = "info") {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.className = `toast show ${type}`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      el.classList.remove("show");
    }, 3200);
  },
};

// ——— Shared utilities ———
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoney(val) {
  const n = Number(val);
  if (Number.isNaN(n)) return val == null || val === "" ? "—" : String(val);
  return new Intl.NumberFormat(I18n.lang === "he" ? "he-IL" : "en-US", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function chartColors() {
  return [
    "#0f766e",
    "#0369a1",
    "#b45309",
    "#7c3aed",
    "#be123c",
    "#15803d",
    "#0891b2",
    "#ca8a04",
    "#4f46e5",
    "#db2777",
  ];
}

function normalizeDoctorPieSeries(apiSeries, totals) {
  if (Array.isArray(apiSeries) && apiSeries.length) {
    return apiSeries
      .map((item) => ({
        label: item.name || item.doctor_name || String(item.doctor_id || ""),
        value: Number(item.y ?? item.total_cost ?? 0),
        meta: {
          appointments: Number(item.appo ?? 0),
          breakdown: item.breakdown || [],
        },
      }))
      .filter((x) => x.value > 0);
  }
  return (totals || [])
    .map((t) => ({
      label: t.doctor_name || String(t.doctor_id || ""),
      value: Number(t.total_cost || 0),
      meta: { appointments: Number(t.total_appointments || 0), breakdown: [] },
    }))
    .filter((x) => x.value > 0);
}

function normalizeTypePieSeries(apiSeries, matrix) {
  if (Array.isArray(apiSeries) && apiSeries.length) {
    return apiSeries
      .map((item) => ({
        label: item.name || item.type_name || String(item.type_id || ""),
        value: Number(item.y ?? item.appo ?? 0),
        meta: {
          cost: Number(item.cost ?? 0),
          breakdown: item.breakdown || [],
        },
      }))
      .filter((x) => x.value > 0);
  }
  return (matrix || [])
    .map((row) => {
      const count = (row.cells || []).reduce((s, c) => s + Number(c.appointment_count || 0), 0);
      const cost = (row.cells || []).reduce((s, c) => s + Number(c.total_cost || 0), 0);
      return { label: row.type_name || String(row.type_id), value: count, meta: { cost, breakdown: [] } };
    })
    .filter((x) => x.value > 0);
}

function upsertPieChart(existing, canvasId, emptyId, series, colors, chartKind) {
  const canvas = document.getElementById(canvasId);
  const empty = document.getElementById(emptyId);
  if (!canvas || typeof Chart === "undefined") return existing;

  if (!series.length) {
    if (existing) {
      existing.destroy();
      existing = null;
    }
    empty?.classList.remove("hidden");
    canvas.style.display = "none";
    return null;
  }

  empty?.classList.add("hidden");
  canvas.style.display = "block";

  const textColor = getComputedStyle(document.documentElement).getPropertyValue("--text-secondary").trim() || "#666";

  const config = {
    type: "pie",
    data: {
      labels: series.map((s) => s.label),
      datasets: [
        {
          data: series.map((s) => s.value),
          backgroundColor: series.map((_, i) => colors[i % colors.length]),
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: textColor,
            boxWidth: 12,
            padding: 14,
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
          },
        },
        tooltip: {
          callbacks: {
            label(context) {
              const item = series[context.dataIndex];
              if (!item) return "";
              if (chartKind === "revenue") {
                const appts = item.meta?.appointments ?? 0;
                return `${item.label}: ${formatMoney(item.value)} (${appts} ${I18n.t("visits")})`;
              }
              if (chartKind === "volume") {
                const cost = item.meta?.cost ?? 0;
                return `${item.label}: ${formatNumber(item.value)} ${I18n.t("visits")} (${formatMoney(cost)})`;
              }
              return `${item.label}: ${context.parsed}`;
            },
            afterBody(context) {
              const item = series[context[0]?.dataIndex];
              const breakdown = item?.meta?.breakdown || [];
              if (!breakdown.length) return [];
              return breakdown.map((b) => {
                if (chartKind === "revenue") {
                  return `  ${b.type_name}: ${formatMoney(b.cost)} (${b.appo} ${I18n.t("visits")})`;
                }
                return `  ${b.doctor_name}: ${b.appo} ${I18n.t("visits")} (${formatMoney(b.cost)})`;
              });
            },
          },
        },
      },
    },
  };

  if (existing) {
    existing.data = config.data;
    existing.options = config.options;
    existing.update();
    return existing;
  }
  return new Chart(canvas.getContext("2d"), config);
}

function formatNumber(n) {
  const num = Number(n) || 0;
  return new Intl.NumberFormat(I18n.lang === "he" ? "he-IL" : "en-US").format(num);
}

function downloadCsv(filename, headers, rows) {
  downloadCsvLines(filename, [headers, ...rows]);
}

function downloadCsvLines(filename, lines) {
  const escape = (v) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = lines.map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", () => App.init());
window.App = App;
