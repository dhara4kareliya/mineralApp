/** Shared helpers for ticket-details / ticket-close pages */
(function (global) {
  'use strict';

  function tr(key) {
    var lang = global.document && global.document.documentElement.lang === 'he' ? 'he' : 'en';
    return (global.MineralBarI18n && MineralBarI18n.t(key, lang)) ||
      (global.FieldApp && FieldApp.t && FieldApp.t(key)) || key;
  }

  function isEn() {
    return !(global.document && global.document.documentElement.lang === 'he');
  }

  function queryParam(name) {
    if (global.FieldApp && FieldApp.qs) return FieldApp.qs(name);
    try {
      return new URLSearchParams(global.location.search || '').get(name);
    } catch (e) {
      return null;
    }
  }

  function loginHref() {
    return 'index.html#login';
  }

  function scheduleHref(filter) {
    filter = String(filter == null ? 'opened' : filter).trim() || 'opened';
    if (filter === 'opened') return 'tickets.html?filter=opened';
    if (filter === 'all') return 'tickets.html?filter=all';
    return 'tickets.html?filter=' + encodeURIComponent(filter);
  }

  function detailsHref(id) {
    return 'ticket-details.html?id=' + encodeURIComponent(id || '');
  }

  function closeHref(id) {
    return 'ticket-close.html?id=' + encodeURIComponent(id || '');
  }

  function editHref(id) {
    return 'ticket-edit.html?id=' + encodeURIComponent(id || '');
  }

  function assignHref(id) {
    return 'ticket-assign.html?id=' + encodeURIComponent(id || '');
  }

  async function bootAuthenticatedPage() {
    if (!global.MineralBarApp) return false;
    await MineralBarApp.ensureAuth(loginHref());
    if (!MineralBarApp.isAuthenticated || !MineralBarApp.isAuthenticated()) return false;
    try {
      await MineralBarApp.connectRealtime({ timeoutMs: 12000 });
    } catch (e) {
      console.warn('[TicketPages] realtime connect failed', e);
    }
    global.dispatchEvent(new CustomEvent('mineralbar:ready'));
    if (global.FieldApp && FieldApp.bindLiveChip) FieldApp.bindLiveChip();
    try {
      if (global.MineralBarApp && MineralBarApp.listTicketCustomFields) {
        await MineralBarApp.listTicketCustomFields();
      }
    } catch (e2) {
      console.warn('[TicketPages] ticket custom fields list failed', e2);
    }
    return true;
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function formatDateTime(value) {
    if (!value) return '';
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '';
    return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() +
      ' · ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function waitDays(ticket) {
    var at = ticket && ticket.dateAt != null ? Number(ticket.dateAt) : NaN;
    if (!isFinite(at) && ticket && ticket.raw && ticket.raw.open_date) {
      at = new Date(ticket.raw.open_date).getTime();
    }
    if (!isFinite(at)) return 0;
    var open = new Date(at);
    var now = new Date();
    open.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((now.getTime() - open.getTime()) / (1000 * 60 * 60 * 24)));
  }

  function parseCustomFields(ticket) {
    var raw = ticket && (ticket.raw || ticket);
    var cf = raw && raw.custom_fields;
    if (typeof cf === 'string') {
      try { cf = JSON.parse(cf); } catch (e) { cf = null; }
    }
    if (Array.isArray(cf)) {
      var obj = {};
      cf.forEach(function (row) {
        if (!row || typeof row !== 'object') return;
        var k = row.key || row.name || row.field || row.id;
        var v = row.value != null ? row.value : row.val;
        if (k != null) obj[String(k)] = v;
      });
      return obj;
    }
    if (cf && typeof cf === 'object') return cf;
    return {};
  }

  function ticketNotesText(ticket) {
    var raw = ticket && (ticket.raw || ticket);
    if (!raw) return String((ticket && (ticket.summary || ticket.subject)) || '');
    var parts = [];
    function push(v) {
      if (v == null || v === '') return;
      if (Array.isArray(v)) { v.forEach(push); return; }
      if (typeof v === 'object') {
        push(v.message || v.msg || v.text || v.note || v.content || v.body);
        return;
      }
      parts.push(String(v));
    }
    push(raw.messages);
    push(raw.message);
    push(raw.notes);
    push(raw.note);
    push(ticket && ticket.summary);
    return parts.join('\n');
  }

  function labeledField(ticket, label) {
    if (global.MineralBarApp && MineralBarApp.readTicketLabeledField) {
      var fromApp = MineralBarApp.readTicketLabeledField(ticket, label);
      if (fromApp) return fromApp;
      if (ticket && ticket.raw) {
        fromApp = MineralBarApp.readTicketLabeledField(ticket.raw, label);
        if (fromApp) return fromApp;
      }
    }
    var cf = parseCustomFields(ticket);
    var key;
    var keys = Object.keys(cf || {});
    for (var i = 0; i < keys.length; i++) {
      key = keys[i];
      if (String(key).toLowerCase() === String(label).toLowerCase() && cf[key] != null && String(cf[key]).trim()) {
        return String(cf[key]).trim();
      }
    }
    var notes = ticketNotesText(ticket);
    var re = new RegExp(label.replace(/_/g, '[ _]').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:\\s*([^\\n]+)', 'i');
    var m = notes.match(re);
    return m && m[1] ? String(m[1]).trim() : '';
  }

  async function loadTicket(id) {
    if (!id || !global.FieldApp) return null;
    await FieldApp.ensureTickets({ silent: true });
    var ticket = FieldApp.getTicket(id);
    if (!ticket) ticket = await FieldApp.fetchTicketById(id);
    if (ticket && FieldApp.syncTicketById) {
      var fresh = await FieldApp.syncTicketById(id);
      if (fresh) ticket = fresh;
    }
    if (ticket && FieldApp.hydrateTicketMedia) {
      ticket = await FieldApp.hydrateTicketMedia(ticket);
    }
    return ticket;
  }

  function show(el, on) {
    if (!el) return;
    el.classList.toggle('hidden', !on);
  }

  global.TicketPages = {
    tr: tr,
    isEn: isEn,
    queryParam: queryParam,
    loginHref: loginHref,
    scheduleHref: scheduleHref,
    detailsHref: detailsHref,
    closeHref: closeHref,
    editHref: editHref,
    assignHref: assignHref,
    addHref: function (id) {
      return 'ticket-add.html' + (id ? ('?customer_id=' + encodeURIComponent(id)) : '');
    },
    bootAuthenticatedPage: bootAuthenticatedPage,
    initials: initials,
    formatDateTime: formatDateTime,
    waitDays: waitDays,
    parseCustomFields: parseCustomFields,
    ticketNotesText: ticketNotesText,
    labeledField: labeledField,
    loadTicket: loadTicket,
    show: show
  };
})(window);
