/** Edit ticket — Ticket.Edit */
(function (global) {
  'use strict';

  var P = global.TicketPages;
  var ticket = null;
  var ticketId = '';
  var originalProblem = '';
  var busy = false;
  var st = { priority: 'normal', cash: false };

  function tr(key) { return P.tr(key); }
  function $(id) { return global.document.getElementById(id); }

  function localizeAddressText(text) {
    var s = String(text || '');
    if (!s) return s;
    var he = global.document.documentElement.lang === 'he';
    if (he) {
      return s
        .replace(/\bEntrance\b/gi, 'כניסה')
        .replace(/\bFloor\b/gi, 'קומה')
        .replace(/\bApartments?\b/gi, 'דירה')
        .replace(/\bApt\.?\b/gi, 'דירה');
    }
    return s
      .replace(/כניסה/g, 'Entrance')
      .replace(/קומה/g, 'Floor')
      .replace(/דירה/g, 'Apartment');
  }

  function assignedMemberId(t) {
    var raw = (t && t.raw) || {};
    var memberId = raw.assign_member_id;
    if (typeof memberId === 'string' && memberId.charAt(0) === '[') {
      try { memberId = JSON.parse(memberId); } catch (e) { /* keep */ }
    }
    if (Array.isArray(memberId)) memberId = memberId[0];
    memberId = String(memberId == null ? '' : memberId).split(',')[0].trim();
    if (!memberId || memberId === '0') return '';
    return memberId;
  }

  function stripMetaLines(text) {
    return String(text || '')
      .split(/\r?\n/)
      .filter(function (line) {
        var s = String(line || '').trim();
        if (!s) return false;
        if (/^Take cash(?: from the customer)?:/i.test(s)) return false;
        if (/^Service fee(?: amount)?:/i.test(s)) return false;
        if (/^Cash (?:amount|collected):/i.test(s)) return false;
        if (/^BIZ1_MEDIA:/i.test(s)) return false;
        if (/^Closing status:/i.test(s)) return false;
        if (/^Follow-up (?:reason|details):/i.test(s)) return false;
        if (/^Warranty/i.test(s)) return false;
        return true;
      })
      .join('\n')
      .trim();
  }

  function problemText(t) {
    var raw = (t && t.raw) || {};
    var msgs = raw.messages;
    if (Array.isArray(msgs) && msgs.length) {
      var first = msgs[0] && (msgs[0].message || msgs[0].text || msgs[0]);
      var text = stripMetaLines(first);
      if (text && text.indexOf('biz1upload/') !== 0) {
        return text;
      }
    }
    return stripMetaLines(t.summary || t.subject || '');
  }

  function detectPriority(t) {
    var raw = (t && t.raw) || {};
    var rating = Number(raw.rating || 0);
    if (rating === 4 || rating === 5) return 'high';
    if (rating === 1 || rating === 2) return 'low';
    var rawPrio = String(raw.priority || raw.prio || '').toLowerCase();
    if (rawPrio === 'urgent' || rawPrio === 'high') return 'high';
    if (rawPrio === 'low') return 'low';
    return 'normal';
  }

  function dateInputValue(value) {
    if (!value) return '';
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) {
      var m = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
      return m ? m[1] : '';
    }
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mm + '-' + dd;
  }

  function timeInputValue(value) {
    if (!value) return '';
    var s = String(value);
    var m = s.match(/(\d{2}:\d{2})/);
    return m ? m[1] : '';
  }

  function showError(msg) {
    var el = $('teError');
    var ok = $('teSuccess');
    if (ok) ok.classList.add('hidden');
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
      el.textContent = '';
    }
  }

  function paintPrio() {
    var root = $('tePrio');
    if (!root) return;
    var opts = [
      { id: 'high', key: 'prio_high', color: '#c0392b', bg: '#fbeeed', border: '#f0c4bf' },
      { id: 'normal', key: 'prio_normal', color: '#1d60a2', bg: '#eaf2fb', border: '#aecbe9' },
      { id: 'low', key: 'prio_low', color: '#5a6473', bg: '#f4f5f7', border: '#d8dde4' }
    ];
    root.innerHTML = '';
    opts.forEach(function (o) {
      var btn = global.document.createElement('button');
      btn.type = 'button';
      btn.textContent = tr(o.key);
      if (st.priority === o.id) {
        btn.className = 'is-on';
        btn.style.background = o.bg;
        btn.style.borderColor = o.color;
        btn.style.color = o.color;
      } else {
        btn.style.background = '#fff';
        btn.style.borderColor = o.border;
        btn.style.color = o.color;
      }
      btn.addEventListener('click', function () {
        st.priority = o.id;
        paintPrio();
      });
      root.appendChild(btn);
    });
  }

  function paintCash() {
    var yes = $('teCashYes');
    var no = $('teCashNo');
    if (yes) yes.classList.toggle('is-on', !!st.cash);
    if (no) no.classList.toggle('is-on', !st.cash);
    P.show($('teCashWrap'), !!st.cash);
  }

  function loadTeam(selected) {
    var sel = $('teTech');
    if (!sel) return;
    while (sel.options.length > 1) sel.remove(1);
    var team = (MineralBarApp.getTeamMembers && MineralBarApp.getTeamMembers()) || [];
    team.forEach(function (m) {
      var id = String(m.id || m.user_id || '');
      if (!id) return;
      var opt = global.document.createElement('option');
      opt.value = id;
      opt.textContent = String(m.name || m.full_name || m.email || ('#' + id));
      if (selected && selected === id) opt.selected = true;
      sel.appendChild(opt);
    });
    if (selected) sel.value = selected;
  }

  function fillForm() {
    if (!ticket) return;
    var raw = ticket.raw || {};
    var name = (global.FieldApp && FieldApp.clientDisplay && FieldApp.clientDisplay(ticket)) ||
      ticket.client || tr('client');
    $('teCallId').textContent = '#' + (ticket.number || ticket.id);
    $('teCustInitials').textContent = P.initials(name);
    $('teCustName').textContent = name;
    $('teCustMeta').textContent = [ticket.phone, ticket.email].filter(Boolean).join(' · ') || ('#' + (ticket.customerId || ''));
    $('teTopic').value = ticket.subject || '';
    originalProblem = problemText(ticket);
    $('teProblem').value = originalProblem;
    st.priority = detectPriority(ticket);
    paintPrio();
    $('teDueDate').value = dateInputValue(raw.due_date);
    $('teFromTime').value = timeInputValue(raw.ticket_from_time || raw.from_time_ticket);
    $('teToTime').value = timeInputValue(raw.ticket_to_time || raw.to_time_ticket);
    $('teAddress').value = localizeAddressText(ticket.address || '');
    loadTeam(assignedMemberId(ticket));

    st.cash = false;
    if (global.MineralBarApp && MineralBarApp.isTicketCashYes) {
      st.cash = !!(MineralBarApp.isTicketCashYes(raw) || MineralBarApp.isTicketCashYes(ticket));
    }
    var cashAmount = P.labeledField(ticket, 'cash_amount');
    if (!cashAmount) {
      var notes = P.ticketNotesText(ticket);
      var amt = notes.match(/(?:Service fee(?: amount)?|Cash amount|סכום דמי שירות)\s*[:：]\s*([0-9]+(?:\.[0-9]+)?)/i);
      if (amt && amt[1]) cashAmount = amt[1];
    }
    if ($('teCashAmount')) $('teCashAmount').value = cashAmount || '';
    paintCash();
  }

  function paint() {
    if (!ticket) {
      P.show($('teLoading'), false);
      P.show($('teContent'), false);
      P.show($('teMissing'), true);
      return;
    }
    P.show($('teLoading'), false);
    P.show($('teMissing'), false);
    P.show($('teContent'), true);
    fillForm();
  }

  async function submit() {
    if (busy || !ticket) return;
    showError('');
    var topic = String(($('teTopic') && $('teTopic').value) || '').trim();
    var problem = String(($('teProblem') && $('teProblem').value) || '').trim();
    var address = String(($('teAddress') && $('teAddress').value) || '').trim();
    if (!topic) { showError(tr('err_select_type')); return; }
    if (!problem) { showError(tr('err_problem_required')); return; }
    if (!address) { showError(tr('err_address_required')); return; }

    var cashAmount = String(($('teCashAmount') && $('teCashAmount').value) || '').replace(/[^\d.]/g, '');
    if (st.cash && !(Number(cashAmount) > 0)) {
      showError(tr('cash_amount_label') + ' *');
      return;
    }

    busy = true;
    var btn = $('teSubmit');
    var label = btn && btn.querySelector('span');
    if (btn) btn.disabled = true;
    if (label) label.textContent = tr('loading');

    try {
      var rating = st.priority === 'high' ? 5 : (st.priority === 'low' ? 1 : 3);
      var payload = {
        ticket_id: ticket.id,
        id: ticket.id,
        topic: topic,
        subject: topic,
        address: address,
        rating: rating
      };
      if (problem !== originalProblem) {
        payload.messages = problem;
        payload.message = problem;
      }
      var techId = $('teTech') && $('teTech').value;
      if (techId) {
        payload.assign_member_id = techId;
        payload.status = 3;
      }
      var due = $('teDueDate') && $('teDueDate').value;
      if (due) payload.due_date = due + ' 00:00:00';
      var from = $('teFromTime') && $('teFromTime').value;
      var to = $('teToTime') && $('teToTime').value;
      if (from) {
        payload.ticket_from_time = from.length === 5 ? from + ':00' : from;
        payload.from_time_ticket = from;
      }
      if (to) {
        payload.ticket_to_time = to.length === 5 ? to + ':00' : to;
        payload.to_time_ticket = to;
      }
      if (ticket.customerId) {
        payload.cust_id = ticket.customerId;
        payload.customer_id = ticket.customerId;
      }
      if (ticket.phone) payload.phone = ticket.phone;
      if (ticket.email) payload.email = ticket.email;
      if (ticket.client) payload.customername = ticket.client;

      payload.custom_fields = {};
      if (MineralBarApp.applyTicketCashField) {
        await MineralBarApp.applyTicketCashField(payload, st.cash ? 'yes' : 'no');
      }
      if (st.cash && cashAmount && MineralBarApp.applyTicketLabeledCustomFields) {
        await MineralBarApp.applyTicketLabeledCustomFields(payload, { cash_amount: cashAmount });
      }
      if (MineralBarApp.sanitizeTicketCustomFields) {
        payload = MineralBarApp.sanitizeTicketCustomFields(payload);
      }

      var res = await MineralBarApp.getClient().request('Ticket.Edit', payload);
      if (!res || !(Number(res.success) === 1 || res.success === true)) {
        throw new Error((res && (res.message || res.error)) || tr('err_failed'));
      }

      if (global.FieldApp && FieldApp.upsertLiveTicket) {
        FieldApp.upsertLiveTicket(Object.assign({}, ticket, {
          subject: topic,
          address: address,
          summary: problem
        }));
      }
      if (global.FieldApp && FieldApp.syncTicketById) {
        try { await FieldApp.syncTicketById(ticket.id); } catch (eSync) { /* ignore */ }
      }

      var ok = $('teSuccess');
      if (ok) {
        ok.textContent = tr('ticket_updated');
        ok.classList.remove('hidden');
      }
      setTimeout(function () {
        global.location.replace(P.detailsHref(ticket.id));
      }, 600);
    } catch (err) {
      showError((err && err.message) || tr('err_failed'));
      if (label) label.textContent = tr('save_ticket');
      if (btn) btn.disabled = false;
      busy = false;
    }
  }

  async function start() {
    ticketId = P.queryParam('id') || P.queryParam('ticket_id') || '';
    var ok = await P.bootAuthenticatedPage();
    if (!ok) return;
    if (global.MineralBarI18n && MineralBarI18n.apply) MineralBarI18n.apply();
    if (!ticketId) {
      P.show($('teLoading'), false);
      P.show($('teMissing'), true);
      return;
    }
    try {
      ticket = await P.loadTicket(ticketId);
    } catch (e) {
      console.warn('[ticket-edit] load failed', e);
      ticket = null;
    }
    paint();
  }

  function bind() {
    var back = $('teBackBtn');
    if (back) {
      back.addEventListener('click', function (e) {
        e.preventDefault();
        if (ticketId) global.location.href = P.detailsHref(ticketId);
        else global.location.href = P.scheduleHref();
      });
    }
    var yes = $('teCashYes');
    var no = $('teCashNo');
    if (yes) yes.addEventListener('click', function () { st.cash = true; paintCash(); });
    if (no) no.addEventListener('click', function () { st.cash = false; paintCash(); });
    var submitBtn = $('teSubmit');
    if (submitBtn) submitBtn.addEventListener('click', submit);
    global.addEventListener('mineralbar:lang', function () {
      if (global.MineralBarI18n && MineralBarI18n.apply) MineralBarI18n.apply();
      paintPrio();
      paintCash();
      if ($('teAddress') && $('teAddress').value) {
        $('teAddress').value = localizeAddressText($('teAddress').value);
      }
    });
  }

  function init() {
    if (!$('teContent')) return;
    bind();
    start();
  }

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
