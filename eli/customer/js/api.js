/**
 * API client for Customer Portal routes
 * https://eli.bull36.com/app/help/category/Customer-Portal
 */
const API = (() => {
  function base() {
    return (window.CP_CONFIG?.API_BASE || '').replace(/\/$/, '');
  }

  function url(route) {
    const r = route.startsWith('/') ? route : `/app/${route}`;
    return `${base()}${r}`;
  }

  async function request(route, { body = {}, auth = true, method = 'POST' } = {}) {
    const params = new URLSearchParams();
    Object.entries(body || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(`${key}[]`, String(v)));
      } else {
        params.set(key, String(value));
      }
    });

    const headers = {};
    if (auth) {
      const token = Auth.getToken();
      if (!token) throw new Error('Not authenticated');
      headers.Authorization = `Bearer ${token}`;
    }

    let res;
    try {
      res = await fetch(url(route), {
        method,
        headers,
        body: params,
      });
    } catch (err) {
      const error = new Error(
        'Network error — check API_BASE in js/config.js and CORS settings on the API host.'
      );
      error.cause = err;
      throw error;
    }

    let data;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Invalid JSON from ${route} (HTTP ${res.status})`);
    }

    if (!res.ok && data.success === undefined) {
      throw new Error(data.message || data.error || `HTTP ${res.status}`);
    }

    return data;
  }

  /** Step 1: password → OTP emailed. Step 2: + otp → bearer token */
  function login(fields) {
    const body = { ...fields };
    if (window.CP_CONFIG.USER_NAME && !body.user_name) {
      body.user_name = window.CP_CONFIG.USER_NAME;
    }
    if (window.CP_CONFIG.DOMAIN_NAME && !body.domain_name) {
      body.domain_name = window.CP_CONFIG.DOMAIN_NAME;
    }
    return request('Customer.Login', { body, auth: false });
  }

  function welcome() {
    return request('Customer.Welcome');
  }

  function ticketsList(opts = {}) {
    return request('Customer.Tickets.List', {
      body: { limit: window.CP_CONFIG.PAGE_SIZE, ...opts },
    });
  }

  function ticketsCount(opts = {}) {
    return request('Customer.Tickets.Count', { body: opts });
  }

  function ticketGet(ticket_id) {
    return request('Customer.Tickets.Get', { body: { ticket_id } });
  }

  function ticketAdd(fields) {
    return request('Customer.Tickets.Add', { body: fields });
  }

  function ticketFormData() {
    return request('Customer.Tickets.FormData');
  }

  function ticketReply({ t_id, message, data_type }) {
    return request('Customer.Tickets.Reply', { body: { t_id, message, data_type } });
  }

  function ticketStatus({ id, show }) {
    return request('Customer.Tickets.Status', { body: { id, show } });
  }

  function projectsList(opts = {}) {
    return request('Customer.Projects.List', {
      body: { limit: window.CP_CONFIG.PAGE_SIZE, ...opts },
    });
  }

  function projectsGet(project_id) {
    return request('Customer.Projects.Get', { body: { project_id, id: project_id } });
  }

  /**
   * Create project on the server.
   * Prefer Customer.Projects.Add when available; staff Projects.Add is blocked for client tokens.
   */
  async function projectsAdd(fields) {
    const allowed = [
      'project_name',
      'name',
      'credentials',
      'note',
      'organizations_user',
      'default_user',
      'member',
      'member_ids',
      'tags',
      'private_project',
      'use_as_template',
      'allow_add_mission',
      'show_hide_tag',
      'mission_dependency',
      'done',
      'projects_template_id',
      'template_project_id',
      'custom_fields',
    ];
    const body = {};
    allowed.forEach((key) => {
      if (fields[key] !== undefined && fields[key] !== null && fields[key] !== '') {
        body[key] = fields[key];
      }
    });
    if (!body.project_name && fields.name) body.project_name = fields.name;

    // API expects JSON string for member arrays (see Projects.Add help).
    ['organizations_user', 'default_user', 'member_ids', 'tags'].forEach((key) => {
      if (Array.isArray(body[key])) {
        body[key] = JSON.stringify(body[key].map(String));
      }
    });

    // Never send project_id on Add — Customer.Projects.Add rejects it as unknown.
    delete body.project_id;
    delete body.id;

    const routes = ['Customer.Projects.Add', 'Customer.Projects.Save'];
    let lastErr = null;
    for (const route of routes) {
      try {
        const res = await request(route, { body });
        if (String(res.success) === '0' || res.success === 0) {
          const code = res.error || '';
          if (code === 'client_token_not_allowed' || /route not found/i.test(String(res.message || ''))) {
            lastErr = new Error(res.message || res.error || `Failed: ${route}`);
            lastErr.code = code || 'route_unavailable';
            lastErr.response = res;
            continue;
          }
          const err = new Error(res.message || res.error || trFail(route));
          err.code = code;
          err.response = res;
          throw err;
        }
        return { ...res, _route: route };
      } catch (err) {
        lastErr = err;
        const msg = String(err.message || '');
        if (/route not found|not found|404/i.test(msg) || err.code === 'client_token_not_allowed') {
          continue;
        }
        throw err;
      }
    }
    const err = lastErr || new Error('Project create is not available for customer portal login');
    err.code = err.code || 'customer_projects_add_unavailable';
    throw err;
  }

  function trFail(route) {
    return `Could not create project (${route})`;
  }

  function missionsList(opts = {}) {
    return request('Customer.Missions.List', {
      body: { limit: window.CP_CONFIG.PAGE_SIZE, ...opts },
    });
  }

  function missionAdd(fields) {
    return request('Customer.Missions.Add', { body: fields });
  }

  function missionUpdate(fields) {
    return request('Customer.Missions.Update', { body: fields });
  }

  function invoicesList(opts = {}) {
    return request('Customer.Invoices.List', {
      body: { limit: window.CP_CONFIG.PAGE_SIZE, ...opts },
    });
  }

  function dynamicContentList(opts = {}) {
    return request('Customer.DynamicContent.List', {
      body: { limit: window.CP_CONFIG.PAGE_SIZE, ...opts },
    });
  }

  function productsList(opts = {}) {
    return request('Customer.Products.List', {
      body: { limit: window.CP_CONFIG.PAGE_SIZE, ...opts },
    });
  }

  function productsCount(opts = {}) {
    return request('Customer.Products.Count', { body: opts });
  }

  function appointmentsList(opts = {}) {
    return request('Customer.Appointments.List', {
      body: { limit: window.CP_CONFIG.PAGE_SIZE, ...opts },
    });
  }

  function appointmentsCount(opts = {}) {
    return request('Customer.Appointments.Count', { body: opts });
  }

  function appointmentGet(id) {
    return request('Customer.Appointments.Get', { body: { id } });
  }

  function appointmentsDoctors() {
    return request('Customer.Appointments.Doctors');
  }

  function appointmentsTypes() {
    return request('Customer.Appointments.Types');
  }

  /** Customer portal — https://eli.bull36.com/app/help/Customer.Appointments.Branches */
  function appointmentBranchesList(opts = {}) {
    return request('Customer.Appointments.Branches', {
      body: { ...opts },
    });
  }

  /** Customer portal — insurance dropdown. Docs: Customer.Appointments.InsuranceCompanies */
  function appointmentInsuranceCompaniesList(opts = {}) {
    return request('Customer.Appointments.InsuranceCompanies', {
      body: { ...opts },
    });
  }

  /** Customer portal — Apply Coupon modal list. Docs: Customer.Appointments.Coupons */
  function appointmentsCoupons(opts = {}) {
    return request('Customer.Appointments.Coupons', {
      body: { limit: 25, ...opts },
    });
  }

  /** Apply selected coupon ids. Docs: Customer.Appointments.ApplyCoupon */
  function appointmentsApplyCoupon(couponIds) {
    const ids = Array.isArray(couponIds) ? couponIds.filter(Boolean).join(',') : String(couponIds || '');
    return request('Customer.Appointments.ApplyCoupon', {
      body: { coupon_ids: ids, coupon_id: ids },
    });
  }

  /** Insurance price for type + company. Docs: Customer.Appointments.InsuranceAmount */
  function appointmentsInsuranceAmount(fields) {
    return request('Customer.Appointments.InsuranceAmount', { body: fields });
  }

  /** Staff coupon CRUD (Reports) — used by ADD COUPONS / Edit / Delete when allowed */
  function appointmentCouponGet(id) {
    return request('AppointmentCoupon.Get', { body: { id, coupon_id: id } });
  }

  function appointmentCouponAdd(fields) {
    return request('AppointmentCoupon.Add', { body: fields });
  }

  function appointmentCouponEdit(fields) {
    return request('AppointmentCoupon.Edit', { body: fields });
  }

  function appointmentCouponDelete(id) {
    return request('AppointmentCoupon.Delete', { body: { id, coupon_id: id } });
  }

  function appointmentAdd(fields) {
    return request('Customer.Appointments.Add', { body: fields });
  }

  function appointmentEdit(fields) {
    return request('Customer.Appointments.Edit', { body: fields });
  }

  function appointmentDelete(id) {
    return request('Customer.Appointments.Delete', { body: { id } });
  }

  function filesList(opts = {}) {
    return request('Customer.Files.List', {
      body: { limit: window.CP_CONFIG.PAGE_SIZE, ...opts },
    });
  }

  function roomsList(opts = {}) {
    return request('Customer.Rooms.List', {
      body: { limit: window.CP_CONFIG.PAGE_SIZE, ...opts },
    });
  }

  function roomsBook(fields) {
    return request('Customer.Rooms.Book', {
      body: {
        payment: 0,
        ...fields,
      },
    });
  }

  function roomsBookings(opts = {}) {
    return request('Customer.Rooms.Bookings', {
      body: { limit: window.CP_CONFIG.PAGE_SIZE, ...opts },
    });
  }

  function ordersList(opts = {}) {
    return request('Customer.Orders.List', {
      body: { limit: window.CP_CONFIG.PAGE_SIZE, ...opts },
    });
  }

  function orderGet(orders_for_cust_id) {
    return request('Customer.Orders.Get', {
      body: { orders_for_cust_id },
    });
  }

  function orderFormData(opts = {}) {
    return request('Customer.Orders.FormData', {
      body: { ...opts },
    });
  }

  function entriesTabs(opts) {
    return request('Customer.Entries.Tabs', { body: opts });
  }

  function entriesList(opts) {
    return request('Customer.Entries.List', { body: opts });
  }

  function entryGet(id) {
    return request('Customer.Entries.Get', { body: { id } });
  }

  function entryUpdate(id, data) {
    return request('Customer.Entries.Update', { body: { id, ...data } });
  }

  function entryUpdateField(id, field_key, value) {
    return request('Customer.Entries.UpdateField', { body: { id, field_key, value } });
  }

  return {
    request,
    url,
    login,
    welcome,
    ticketsList,
    ticketsCount,
    ticketGet,
    ticketAdd,
    ticketFormData,
    ticketReply,
    ticketStatus,
    projectsList,
    projectsGet,
    projectsAdd,
    missionsList,
    missionAdd,
    missionUpdate,
    invoicesList,
    dynamicContentList,
    productsList,
    productsCount,
    appointmentsList,
    appointmentsCount,
    appointmentGet,
    appointmentsDoctors,
    appointmentsTypes,
    appointmentBranchesList,
    appointmentInsuranceCompaniesList,
    appointmentsCoupons,
    appointmentsApplyCoupon,
    appointmentsInsuranceAmount,
    appointmentCouponGet,
    appointmentCouponAdd,
    appointmentCouponEdit,
    appointmentCouponDelete,
    appointmentAdd,
    appointmentEdit,
    appointmentDelete,
    filesList,
    roomsList,
    roomsBook,
    roomsBookings,
    ordersList,
    orderGet,
    orderFormData,
    entriesTabs,
    entriesList,
    entryGet,
    entryUpdate,
    entryUpdateField,
  };
})();

window.API = API;
