/**
 * ClinicPulse API — Biz1 App client
 * Domain: https://eli.bull36.com (configurable)
 * Auth: POST /app/Login → Bearer token
 * Routes: POST /app/{Route.Name}
 * Dates: send UTC Y-m-d H:i:s when datetime; Y-m-d for date-only filters
 */

const Api = {
  domain: "https://eli.bull36.com",
  token:
    localStorage.getItem("clinicpulse_token") ||
    sessionStorage.getItem("clinicpulse_token") ||
    null,
  userBasic: null,
  socket: null,
  socketReady: false,
  _listeners: {},

  setDomain(domain) {
    this.domain = String(domain || "https://eli.bull36.com").replace(/\/+$/, "") || "https://eli.bull36.com";
  },

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem("clinicpulse_token", token);
      sessionStorage.removeItem("clinicpulse_token");
    } else {
      localStorage.removeItem("clinicpulse_token");
      sessionStorage.removeItem("clinicpulse_token");
    }
  },

  clearSession() {
    this.setToken(null);
    this.userBasic = null;
    localStorage.removeItem("clinicpulse_user_basic");
    this.disconnectRealtime();
  },

  cacheUserBasic(data) {
    this.userBasic = data;
    try {
      localStorage.setItem("clinicpulse_user_basic", JSON.stringify(data));
    } catch (_) { /* ignore quota */ }
  },

  getCachedUserBasic() {
    if (this.userBasic) return this.userBasic;
    try {
      const raw = localStorage.getItem("clinicpulse_user_basic");
      if (!raw) return null;
      this.userBasic = JSON.parse(raw);
      return this.userBasic;
    } catch (_) {
      return null;
    }
  },

  /**
   * Login — returns { token } or { otpRequired: true, message }
   */
  async login({ username, password, otp = "" }) {
    const body = new URLSearchParams({ username, password });
    if (otp) body.set("otp", otp);

    const res = await fetch(`${this.domain}/app/Login`, {
      method: "POST",
      body,
    });
    const data = await res.json();

    if (data.otp_required) {
      return { otpRequired: true, message: data.message, data };
    }
    if (!data.token) {
      throw new Error(data.message || "Login failed");
    }

    this.setToken(data.token);
    return {
      token: data.token,
      tokenType: data.token_type || "Bearer",
      expiresAt: data.expires_at || null,
      raw: data,
    };
  },

  /**
   * Generic POST to a Biz1 route
   */
  async request(route, params = {}) {
    if (!this.token) throw new Error("Not authenticated");

    const body = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      if (Array.isArray(value) || (typeof value === "object" && !(value instanceof Date))) {
        body.set(key, JSON.stringify(value));
      } else {
        body.set(key, String(value));
      }
    });

    const res = await fetch(`${this.domain}/app/${route}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}` },
      body,
    });

    if (res.status === 401) {
      this.clearSession();
      const err = new Error("Unauthorized");
      err.code = 401;
      throw err;
    }

    const data = await res.json();
    const ok = data.success === 1 || data.success === "1";
    if (!ok) {
      if (data.error === "bearer_token_required" || res.status === 401) {
        this.clearSession();
        const err = new Error(data.message || "Unauthorized");
        err.code = 401;
        throw err;
      }
      throw new Error(data.message || data.error || "Request failed");
    }
    return data;
  },

  async userBasic() {
    const data = await this.request("User.Basic");
    const basic = data.data || data;
    this.cacheUserBasic(basic);
    return basic;
  },

  // ——— Reports ———

  listCoupons(params = {}) {
    return this.request("AppointmentCouponReport.List", {
      limit: 25,
      page_id: 1,
      ...params,
    });
  },

  getCoupon(couponId) {
    return this.request("AppointmentCoupon.Get", { coupon_id: couponId });
  },

  addCoupon(params = {}) {
    return this.request("AppointmentCoupon.Add", params);
  },

  editCoupon(params = {}) {
    return this.request("AppointmentCoupon.Edit", params);
  },

  deleteCoupon(couponId) {
    return this.request("AppointmentCoupon.Delete", { coupon_id: couponId });
  },

  listAppointmentTypes(params = {}) {
    return this.request("AppointmentType.List", { limit: 25, ...params });
  },

  listInsuranceCompanies(params = {}) {
    return this.request("AppointmentInsuranceCompany.List", {
      limit: 25,
      lang: I18n?.lang || "en",
      ...params,
    });
  },

  couponInsuranceAmount(appointmentTypeId, insuranceId) {
    return this.request("AppointmentCoupon.InsuranceAmount", {
      appointment_type_id: appointmentTypeId,
      insurance: insuranceId,
    });
  },

  listCrmCustomers(params = {}) {
    return this.request("Customer.List", {
      start: 0,
      length: 25,
      ...params,
    });
  },

  listDoctorReport(params = {}) {
    return this.request("AppointmentDoctorReport.List", params);
  },

  listBranches(params = {}) {
    return this.request("AppointmentBranch.List", {
      limit: 25,
      lang: I18n?.lang || "en",
      ...params,
    });
  },

  listCustomers(params = {}) {
    return this.request("AppointmentCustomerReport.List", {
      limit: 25,
      page_id: 1,
      ...params,
    });
  },

  // ——— Realtime (Socket.IO via Biz1) ———

  async connectRealtime() {
    if (!this.token) return;

    this.disconnectRealtime();

    await this._loadScript(`${this.domain}/realtime/socket.io/socket.io.js`);
    await this._loadScript(`${this.domain}/app/sdk/biz1-sdk.js`);

    if (typeof Biz1SDK === "undefined") {
      console.warn("Biz1SDK not available; skipping realtime");
      return;
    }

    try {
      const client = new Biz1SDK.Biz1Client({
        domain: this.domain,
        storage: {
          getItem: (k) => (k.includes("bearer") ? this.token : localStorage.getItem(k)),
          setItem: (k, v) => localStorage.setItem(k, v),
          removeItem: (k) => localStorage.removeItem(k),
        },
      });

      // Ensure SDK has the token
      if (client.setToken) client.setToken(this.token);
      else if (client.token !== undefined) client.token = this.token;

      this._biz1Client = client;
      try {
        localStorage.removeItem("biz1_realtime_last_event_id");
      } catch (_) { /* ignore */ }

      this.socket = client.realtime.connect({
        path: "/realtime/socket.io",
        platform: "web",
      });

      const refreshKeys = [
        "appointment.created", "appointment.updated", "appointment.deleted",
        "meeting.created", "meeting.updated", "meeting.deleted",
        "customer.updated", "crm.lead.created",
        "coupon.created", "coupon.updated", "coupon.deleted",
        "coupons.created", "coupons.updated", "coupons.deleted",
        "appointmentcoupon.created", "appointmentcoupon.updated", "appointmentcoupon.deleted",
      ];

      const isCouponKey = (key) => /coupon/i.test(String(key || ""));

      client.realtime.on("biz1:ready", (payload) => {
        this.socketReady = true;
        this._emit("ready", payload);
        (payload && payload.events ? payload.events : []).forEach((key) => {
          if (!isCouponKey(key) || refreshKeys.includes(key)) return;
          client.realtime.on(key, (event) => this._emit("refresh", event));
        });
      });

      client.realtime.on("*", (event) => {
        this._emit("event", event);
        if (event && event.key) this._emit(event.key, event);
        if (event && isCouponKey(event.key)) this._emit("refresh", event);
      });

      refreshKeys.forEach((key) => {
        client.realtime.on(key, (event) => this._emit("refresh", event));
      });
    } catch (err) {
      console.warn("Realtime connect failed:", err);
      this.socketReady = false;
      this._emit("offline");
    }
  },

  disconnectRealtime() {
    this.socketReady = false;
    try {
      if (this._biz1Client && this._biz1Client.realtime && this._biz1Client.realtime.disconnect) {
        this._biz1Client.realtime.disconnect();
      }
    } catch (_) { /* ignore */ }
    this.socket = null;
    this._biz1Client = null;
  },

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return () => {
      this._listeners[event] = (this._listeners[event] || []).filter((f) => f !== fn);
    };
  },

  _emit(event, payload) {
    (this._listeners[event] || []).forEach((fn) => {
      try {
        fn(payload);
      } catch (e) {
        console.error(e);
      }
    });
  },

  _loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });
  },
};

/** Format Date to UTC Y-m-d H:i:s */
function toUtcDateTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

/** Local date input (Y-m-d) → keep as Y-m-d for date-only API filters */
function dateInputValue(el) {
  return el && el.value ? el.value : "";
}

window.Api = Api;
window.toUtcDateTime = toUtcDateTime;
window.dateInputValue = dateInputValue;
