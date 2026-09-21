/** Close ticket — Ticket.Status + optional Ticket.CompletionReason */
(function (global) {
  'use strict';

  var P = global.TicketPages;
  var st = {
    ticket: null,
    id: '',
    reasonsEnabled: false,
    reasons: [],
    reasonId: '',
    manualReason: '',
    busy: false
  };

  function tr(key) { return P.tr(key); }
  function $(id) { return global.document.getElementById(id); }

  function isClosedTicket(t) {
    return !!(t && global.FieldApp && FieldApp.migrateStatus(t.status) === FieldApp.STATUS.closed);
  }

  function showError(msg) {
    var el = $('tcError');
    var ok = $('tcSuccess');
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

  function ticketCompletionReason(t) {
    if (!t) return '';
    var text = String(t.completionReason || '').trim();
    if (text) return text;
    var raw = t.raw || {};
    text = String(
      raw.completion_reason ||
      raw.completionReason ||
      raw.completion_reason_text ||
      raw.completion_reason_name ||
      raw.completion_reason_label ||
      ''
    ).trim();
    if (text) return text;
    var id = String(t.completionReasonId || raw.completion_reason_id || '').trim();
    if (id && id !== '0') {
      var hit = (st.reasons || []).filter(function (r) { return String(r.id) === id; })[0];
      if (hit && hit.label) return hit.label;
    }
    if (P.labeledField) {
      text = String(
        P.labeledField(t, 'completion_reason') ||
        P.labeledField(t, 'closing_reason') ||
        ''
      ).trim();
    }
    return text;
  }

  function paintDetails() {
    var t = st.ticket;
    if (!t) return;
    var name = (global.FieldApp && FieldApp.clientDisplay && FieldApp.clientDisplay(t)) || t.client || '—';
    $('tcCustInitials').textContent = P.initials(name);
    $('tcCustName').textContent = name;
    $('tcCustMeta').textContent = [t.phone, t.email].filter(Boolean).join(' · ') || ('#' + (t.customerId || ''));
    $('tcSubject').textContent = t.subject || t.summary || '—';
    $('tcHeaderSub').textContent = '#' + (t.number || t.id || '—');

    var reasonText = ticketCompletionReason(t);
    var reasonWrap = $('tcReasonDetailWrap');
    var reasonEl = $('tcReasonDetail');
    if (reasonText) {
      if (reasonEl) reasonEl.textContent = reasonText;
      P.show(reasonWrap, true);
    } else {
      P.show(reasonWrap, false);
    }
  }

  function paintReasonModule() {
    var mod = $('tcReasonModule');
    var sel = $('tcCompletionReason');
    P.show(mod, !!st.reasonsEnabled);
    if (!sel) return;

    var keepManual = true;
    var current = st.reasonId || '';
    while (sel.options.length > 1) sel.remove(1);

    st.reasons.forEach(function (r) {
      var opt = global.document.createElement('option');
      opt.value = String(r.id);
      opt.textContent = r.label;
      sel.appendChild(opt);
    });

    if (keepManual) {
      var man = global.document.createElement('option');
      man.value = 'manual';
      man.textContent = tr('add_manual');
      sel.appendChild(man);
    }

    if (current && Array.prototype.some.call(sel.options, function (o) { return o.value === String(current); })) {
      sel.value = String(current);
    } else {
      sel.value = '';
      st.reasonId = '';
    }

    var isManual = sel.value === 'manual';
    P.show($('tcManualWrap'), isManual);
    if ($('tcManualReason') && document.activeElement !== $('tcManualReason')) {
      $('tcManualReason').value = st.manualReason || '';
    }
  }

  function showForm() {
    P.show($('tcLoading'), false);
    P.show($('tcForm'), true);
    P.show($('tcActions'), true);
    P.show($('tcSubmitBtn'), !isClosedTicket(st.ticket));
    P.show($('tcBackListBtn'), isClosedTicket(st.ticket));
    if (isClosedTicket(st.ticket)) {
      $('tcPageTitle').textContent = tr('view_ticket');
    } else {
      $('tcPageTitle').textContent = tr('close_ticket_title');
    }
  }

  async function loadSettingsAndReasons() {
    st.reasonsEnabled = false;
    st.reasons = [];
    try {
      if (MineralBarApp.getTicketSettings) {
        var settings = await MineralBarApp.getTicketSettings();
        st.reasonsEnabled = !!(settings && Number(settings.ticket_completion_reason_settings) === 1);
      }
    } catch (e) {
      console.warn('[ticket-close] Ticket.Settings failed', e);
    }
    if (!st.reasonsEnabled) return;
    try {
      if (MineralBarApp.listTicketCompletionReasons) {
        var res = await MineralBarApp.listTicketCompletionReasons();
        st.reasons = (res && res.rows) || [];
      }
    } catch (e2) {
      console.warn('[ticket-close] Ticket.CompletionReasonList failed', e2);
      st.reasons = [];
    }
  }

  async function submit() {
    if (st.busy || !st.ticket || !st.id) return;
    showError('');

    var payload = {
      ticket_id: st.id,
      status: 2
    };

    if (st.reasonsEnabled) {
      var sel = $('tcCompletionReason');
      var val = sel ? String(sel.value || '') : '';
      st.reasonId = val;
      st.manualReason = String(($('tcManualReason') && $('tcManualReason').value) || '').trim();
      if (!val) {
        showError(tr('err_completion_reason'));
        return;
      }
      if (val === 'manual') {
        if (!st.manualReason) {
          showError(tr('err_manual_reason'));
          return;
        }
        payload.completion_reason_id = 0;
        payload.completion_reason = st.manualReason;
      } else {
        payload.completion_reason_id = val;
      }
    }

    st.busy = true;
    var btn = $('tcSubmitBtn');
    var label = $('tcSubmitLabel');
    if (btn) btn.disabled = true;
    if (label) label.textContent = tr('loading');

    try {
      if (!MineralBarApp.setTicketStatus) throw new Error(tr('err_failed'));
      await MineralBarApp.setTicketStatus(payload);

      if (global.FieldApp && FieldApp.upsertLiveTicket) {
        FieldApp.upsertLiveTicket(Object.assign({}, st.ticket, {
          id: String(st.id),
          status: FieldApp.STATUS.closed,
          statusApi: FieldApp.statusToApi ? FieldApp.statusToApi(FieldApp.STATUS.closed) : '2'
        }));
      }

      var ok = $('tcSuccess');
      if (ok) {
        ok.textContent = tr('ticket_closed');
        ok.classList.remove('hidden');
      }
      setTimeout(function () {
        global.location.replace(P.detailsHref(st.id));
      }, 700);
    } catch (err) {
      showError((err && err.message) || tr('err_failed'));
    } finally {
      st.busy = false;
      if (btn) btn.disabled = false;
      if (label) label.textContent = tr('close_ticket_btn');
    }
  }

  function bind() {
    $('tcBackBtn').addEventListener('click', function (e) {
      e.preventDefault();
      global.location.href = st.id ? P.detailsHref(st.id) : P.scheduleHref();
    });
    $('tcBackListBtn').addEventListener('click', function () {
      global.location.href = P.scheduleHref();
    });
    if ($('tcCompletionReason')) {
      $('tcCompletionReason').addEventListener('change', function () {
        st.reasonId = this.value;
        paintReasonModule();
      });
    }
    if ($('tcManualReason')) {
      $('tcManualReason').addEventListener('input', function () {
        st.manualReason = this.value;
      });
    }
    $('tcSubmitBtn').addEventListener('click', function (e) {
      e.preventDefault();
      submit();
    });
    global.addEventListener('mineralbar:lang', function () {
      if (global.MineralBarI18n && MineralBarI18n.apply) MineralBarI18n.apply();
      paintDetails();
      paintReasonModule();
      if ($('tcSubmitLabel') && !st.busy) $('tcSubmitLabel').textContent = tr('close_ticket_btn');
      if ($('tcPageTitle')) {
        $('tcPageTitle').textContent = isClosedTicket(st.ticket) ? tr('view_ticket') : tr('close_ticket_title');
      }
    });
  }

  async function start() {
    st.id = P.queryParam('id') || P.queryParam('ticket_id') || '';
    var ok = await P.bootAuthenticatedPage();
    if (!ok) return;
    if (global.MineralBarI18n && MineralBarI18n.apply) MineralBarI18n.apply();
    if (!st.id) {
      P.show($('tcLoading'), false);
      showError(tr('data_not_found'));
      P.show($('tcForm'), true);
      P.show($('tcActions'), true);
      P.show($('tcSubmitBtn'), false);
      P.show($('tcBackListBtn'), true);
      return;
    }
    try {
      st.ticket = await P.loadTicket(st.id);
    } catch (e) {
      console.warn('[ticket-close] load failed', e);
    }
    if (!st.ticket) {
      P.show($('tcLoading'), false);
      showError(tr('data_not_found'));
      P.show($('tcForm'), true);
      P.show($('tcActions'), true);
      P.show($('tcSubmitBtn'), false);
      P.show($('tcBackListBtn'), true);
      return;
    }
    await loadSettingsAndReasons();
    paintDetails();
    paintReasonModule();
    showForm();
  }

  function init() {
    if (!$('tcSubmitBtn')) return;
    bind();
    start();
  }

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
