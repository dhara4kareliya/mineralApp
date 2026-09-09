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
    invoicesList,
    dynamicContentList,
    productsList,
    productsCount,
    appointmentsList,
    appointmentsCount,
    appointmentGet,
    appointmentsDoctors,
    appointmentsTypes,
    appointmentAdd,
    appointmentEdit,
    appointmentDelete,
    filesList,
    roomsList,
    roomsBook,
    roomsBookings,
  };
})();

window.API = API;
