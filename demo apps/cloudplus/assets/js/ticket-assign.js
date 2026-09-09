/** Assign / re-assign technician — Ticket.Edit assign_member_id */
(function (global) {
  'use strict';

  var P = global.TicketPages;
  var AVATAR_COLORS = [
    { bg: '#eaf2fb', color: '#1d60a2' },
    { bg: '#eafaf0', color: '#2e8a63' },
    { bg: '#eef0fb', color: '#50439d' },
    { bg: '#fdf6e8', color: '#bd8324' },
    { bg: '#e8f6fb', color: '#1a7a96' },
    { bg: '#fbeeed', color: '#c0392b' }
  ];

  var ticket = null;
  var ticketId = '';
  var selectedId = '';
  var busy = false;

  function tr(key) { return P.tr(key); }
  function $(id) { return global.document.getElementById(id); }

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

  function prioMeta(t) {
    var raw = (t && t.raw) || {};
    var rating = Number(raw.rating || 0);
    var key = 'normal';
    if (rating === 4 || rating === 5) key = 'urgent';
    else if (rating === 1 || rating === 2) key = 'low';
    else {
      var rawPrio = String(raw.priority || raw.prio || '').toLowerCase();
      if (rawPrio === 'urgent' || rawPrio === 'high') key = 'urgent';
      else if (rawPrio === 'low') key = 'low';
    }
    var map = {
      urgent: { key: 'prio_urgent', color: '#c0392b', bg: '#fbeeed' },
      normal: { key: 'prio_normal', color: '#1d60a2', bg: '#eaf2fb' },
      low: { key: 'prio_low', color: '#5a6473', bg: '#f4f5f7' }
    };
    return map[key] || map.normal;
  }

  function teamMembers() {
    var team = (global.MineralBarApp && MineralBarApp.getTeamMembers && MineralBarApp.getTeamMembers()) || [];
    return team.map(function (m, idx) {
      var id = String(m.id || m.user_id || '').trim();
      if (!id) return null;
      return {
        id: id,
        name: String(m.name || m.full_name || m.email || ('#' + id)),
        color: AVATAR_COLORS[idx % AVATAR_COLORS.length]
      };
    }).filter(Boolean);
  }

  function showError(msg) {
    var el = $('asError');
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
      el.textContent = '';
    }
  }

  function paintList() {
    var root = $('asTechList');
    var empty = $('asEmptyTeam');
    if (!root) return;
    var list = teamMembers();
    root.innerHTML = '';
    P.show(empty, list.length === 0);
    list.forEach(function (m) {
      var btn = global.document.createElement('button');
      btn.type = 'button';
      btn.className = 'ta-tech-row' + (selectedId === m.id ? ' is-on' : '');
      btn.setAttribute('data-id', m.id);
      btn.innerHTML =
        '<div class="td-avatar" style="width:40px;height:40px;font-size:13px;"></div>' +
        '<div class="ta-tech-name"></div>' +
        '<div class="ta-tech-radio"><span></span></div>';
      var av = btn.querySelector('.td-avatar');
      av.textContent = P.initials(m.name);
      av.style.background = m.color.bg;
      av.style.color = m.color.color;
      btn.querySelector('.ta-tech-name').textContent = m.name;
      btn.addEventListener('click', function () {
        selectedId = m.id;
        paintList();
        showError('');
      });
      root.appendChild(btn);
    });
  }

  function paint() {
    if (!ticket) {
      P.show($('asLoading'), false);
      P.show($('asContent'), false);
      P.show($('asMissing'), true);
      return;
    }
    P.show($('asLoading'), false);
    P.show($('asMissing'), false);
    P.show($('asContent'), true);

    var name = (global.FieldApp && FieldApp.clientDisplay && FieldApp.clientDisplay(ticket)) ||
      ticket.client || tr('client');
    var prio = prioMeta(ticket);

    $('asCallId').textContent = '#' + (ticket.number || ticket.id);
    $('asCallType').textContent = ticket.subject || tr('ticket_title');
    $('asClientName').textContent = name;
    $('asAddress').textContent = ticket.address || '—';
    $('asPrioLabel').textContent = tr(prio.key);
    $('asPrioPill').style.background = prio.bg;
    $('asPrioPill').style.color = prio.color;
    $('asPrioDot').style.background = prio.color;

    if (!selectedId) selectedId = assignedMemberId(ticket);
    paintList();
  }

  async function submit() {
    if (busy || !ticket) return;
    showError('');
    if (!selectedId) {
      showError(tr('err_select_technician'));
      return;
    }
    busy = true;
    var btn = $('asSubmit');
    var label = btn && btn.querySelector('span');
    if (btn) btn.disabled = true;
    if (label) label.textContent = tr('loading');

    try {
      var payload = {
        ticket_id: ticket.id,
        id: ticket.id,
        assign_member_id: selectedId,
        status: 3
      };
      var res = await MineralBarApp.getClient().request('Ticket.Edit', payload);
      if (!res || !(Number(res.success) === 1 || res.success === true)) {
        throw new Error((res && (res.message || res.error)) || tr('err_failed'));
      }

      var techName = selectedId;
      var hit = teamMembers().filter(function (m) { return m.id === selectedId; })[0];
      if (hit) techName = hit.name;

      if (global.FieldApp && FieldApp.upsertLiveTicket) {
        var raw = Object.assign({}, ticket.raw || {}, {
          assign_member_id: [String(selectedId)],
          joined_assign_member_name: techName,
          assign_member_name: techName,
          status: 3,
          status_id: 3
        });
        FieldApp.upsertLiveTicket(Object.assign({}, ticket, {
          status: FieldApp.STATUS ? FieldApp.STATUS.assigned : 'assigned',
          statusApi: 'Assigned',
          raw: raw
        }));
      }
      if (global.FieldApp && FieldApp.syncTicketById) {
        try { await FieldApp.syncTicketById(ticket.id); } catch (eSync) { /* ignore */ }
      }

      global.location.replace(P.detailsHref(ticket.id));
    } catch (err) {
      showError((err && err.message) || tr('err_failed'));
      if (label) label.textContent = tr('select_technician');
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
      P.show($('asLoading'), false);
      P.show($('asMissing'), true);
      return;
    }
    try {
      ticket = await P.loadTicket(ticketId);
    } catch (e) {
      console.warn('[ticket-assign] load failed', e);
      ticket = null;
    }
    paint();
  }

  function bind() {
    var back = $('asBackBtn');
    if (back) {
      back.addEventListener('click', function (e) {
        e.preventDefault();
        if (ticketId) global.location.href = P.detailsHref(ticketId);
        else global.location.href = P.scheduleHref();
      });
    }
    var submitBtn = $('asSubmit');
    if (submitBtn) submitBtn.addEventListener('click', submit);
    global.addEventListener('mineralbar:lang', function () {
      if (global.MineralBarI18n && MineralBarI18n.apply) MineralBarI18n.apply();
      paint();
    });
  }

  function init() {
    if (!$('asContent')) return;
    bind();
    start();
  }

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
