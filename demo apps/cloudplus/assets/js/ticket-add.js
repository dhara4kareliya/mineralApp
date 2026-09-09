/** Create ticket — same flow as service-open-call.html */
(function (global) {
  'use strict';

  var P = global.TicketPages;
  var TYPES = [
    { id: 'tech', key: 'type_tech' },
    { id: 'center', key: 'type_center' },
    { id: 'bidet', key: 'type_bidet' },
    { id: 'mainbar', key: 'type_mainbar' },
    { id: 'waterbar', key: 'type_waterbar' },
    { id: 'under', key: 'type_under' },
    { id: 'filter', key: 'type_filter' },
    { id: 'undergrind', key: 'type_undergrind' },
    { id: 'disposal', key: 'type_disposal', full: true }
  ];

  var st = {
    customers: [],
    query: '',
    customer: null,
    callType: 'tech',
    priority: 'normal',
    cash: false,
    photoDataUrl: '',
    photoName: '',
    busy: false
  };

  function tr(key) { return P.tr(key); }
  function $(id) { return global.document.getElementById(id); }

  function customerRows(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.rows)) return raw.rows;
    if (raw.output && Array.isArray(raw.output.data)) return raw.output.data;
    if (raw.output && Array.isArray(raw.output)) return raw.output;
    return [];
  }

  function mapCustomer(c) {
    if (!c || typeof c !== 'object') return null;
    var id = String(c.customer_id || c.cust_id || c.id || '').trim();
    if (!id) return null;
    var name = String(c.name || c.customer_name || c.full_name || c.username || c.company || '').trim();
    return {
      id: id,
      name: name || ('#' + id),
      phone: String(c.mobile || c.phone || c.cellular || '').trim(),
      email: String(c.email || c.e_mail || '').trim(),
      city: String(c.city || c.city_name || '').trim(),
      address: String(c.address || c.full_address || '').trim(),
      raw: c
    };
  }

  function filteredCustomers() {
    var q = String(st.query || '').trim().toLowerCase().replace(/[-\s]/g, '');
    return st.customers.filter(function (c) {
      if (!q) return true;
      var hay = [c.name, c.phone, c.email, c.city, c.address].join(' ').toLowerCase().replace(/[-\s]/g, '');
      return hay.indexOf(q) !== -1;
    }).slice(0, 40);
  }

  function composeAddress() {
    var street = String(($('taStreet') && $('taStreet').value) || '').trim();
    var building = String(($('taBuilding') && $('taBuilding').value) || '').trim();
    var city = String(($('taCity') && $('taCity').value) || '').trim();
    var parts = [[street, building].filter(Boolean).join(' '), city].filter(Boolean);
    var composed = parts.join(', ');
    var addr = $('taAddress');
    if (addr && composed && (!addr.value || addr.getAttribute('data-auto') === '1')) {
      addr.value = composed;
      addr.setAttribute('data-auto', '1');
    }
    return String((addr && addr.value) || composed || '').trim();
  }

  function paintCustomers() {
    var root = $('taCustomerList');
    if (!root) return;
    if (st.customer) {
      root.innerHTML = '';
      P.show(root, false);
      return;
    }
    var list = filteredCustomers();
    P.show(root, true);
    root.innerHTML = '';
    if (!list.length) {
      var empty = global.document.createElement('div');
      empty.className = 'td-empty-dash';
      empty.style.margin = '0';
      empty.style.border = 'none';
      empty.textContent = tr('no_customers');
      root.appendChild(empty);
      return;
    }
    list.forEach(function (c) {
      var btn = global.document.createElement('button');
      btn.type = 'button';
      btn.className = 'ta-cust-row';
      btn.innerHTML = '<div class="td-avatar" style="width:38px;height:38px;font-size:13px;"></div>' +
        '<div style="flex:1;min-width:0;"><div class="td-customer-name" style="font-size:15px;"></div>' +
        '<div class="td-customer-addr"></div></div>';
      btn.querySelector('.td-avatar').textContent = P.initials(c.name);
      btn.querySelector('.td-customer-name').textContent = c.name;
      btn.querySelector('.td-customer-addr').textContent = [c.phone, c.city || c.address].filter(Boolean).join(' · ') || '—';
      btn.addEventListener('click', function () { pickCustomer(c); });
      root.appendChild(btn);
    });
  }

  function paintSelected() {
    var wrap = $('taSelected');
    var c = st.customer;
    P.show(wrap, !!c);
    if (!c) return;
    $('taCustInitials').textContent = P.initials(c.name);
    $('taCustName').textContent = c.name;
    $('taCustMeta').textContent = [c.phone, c.email].filter(Boolean).join(' · ') || ('#' + c.id);
  }

  function fillAddressFromCustomer(c) {
    if (!c) return;
    var addr = c.address || '';
    if ($('taAddress')) {
      $('taAddress').value = addr;
      $('taAddress').setAttribute('data-auto', addr ? '1' : '0');
    }
    if ($('taCity')) $('taCity').value = c.city || '';
    if (addr && !c.city) {
      var bits = addr.split(',');
      if (bits.length > 1 && $('taCity') && !$('taCity').value) {
        $('taCity').value = bits[bits.length - 1].trim();
      }
    }
  }

  async function pickCustomer(c) {
    st.customer = c;
    paintSelected();
    paintCustomers();
    fillAddressFromCustomer(c);
    try {
      if (MineralBarApp.getCustomer) {
        var res = await MineralBarApp.getCustomer(c.id);
        var full = (res && res.customer) || {};
        if (full.data && typeof full.data === 'object') full = full.data;
        var mapped = mapCustomer(Object.assign({}, c.raw, full, { customer_id: c.id, id: c.id }));
        if (mapped) {
          st.customer = mapped;
          paintSelected();
          fillAddressFromCustomer(mapped);
        }
      }
    } catch (e) { /* keep list row */ }
  }

  function paintTypes() {
    var root = $('taTypeGrid');
    if (!root) return;
    root.innerHTML = '';
    TYPES.forEach(function (t) {
      var btn = global.document.createElement('button');
      btn.type = 'button';
      btn.className = 'soc-type-btn' + (t.full ? ' is-full' : '') + (st.callType === t.id ? ' is-on' : '');
      btn.textContent = tr(t.key);
      btn.addEventListener('click', function () {
        st.callType = t.id;
        paintTypes();
      });
      root.appendChild(btn);
    });
  }

  function paintPrio() {
    var root = $('taPrio');
    if (!root) return;
    var opts = [
      { id: 'high', key: 'prio_high', color: '#c0392b', bg: '#fbeeed', border: '#f0c4bf' },
      { id: 'normal', key: 'prio_normal', color: '#1d60a2', bg: '#eaf2fb', border: '#aecbe9' },
      { id: 'low', key: 'prio_low', color: '#5a6473', bg: '#f4f5f7', border: '#d8dde4' }
    ];
    root.innerHTML = '';
    opts.forEach(function (o) {
      var on = st.priority === o.id;
      var btn = global.document.createElement('button');
      btn.type = 'button';
      btn.className = on ? 'is-on' : '';
      btn.style.background = on ? o.bg : '';
      btn.style.borderColor = on ? o.border : '';
      btn.style.color = on ? o.color : '';
      btn.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:' + (on ? o.color : '#c2c9d2') + ';flex:none;"></span>';
      btn.appendChild(global.document.createTextNode(tr(o.key)));
      btn.addEventListener('click', function () { st.priority = o.id; paintPrio(); });
      root.appendChild(btn);
    });
  }

  function paintCash() {
    $('taCashYes').classList.toggle('is-on', st.cash);
    $('taCashNo').classList.toggle('is-on', !st.cash);
    P.show($('taCashWrap'), st.cash);
  }

  async function loadCustomers() {
    if (!global.MineralBarApp || !MineralBarApp.listCustomers) return;
    try {
      var folder = (MineralBarApp.FOLDERS && MineralBarApp.FOLDERS.CUSTOMERS) || 2;
      var res = await MineralBarApp.listCustomers(folder, { length: 100, start: 0, draw: 1 });
      st.customers = customerRows(res).map(mapCustomer).filter(Boolean);
    } catch (e) {
      console.warn('[ticket-add] Customer.List failed', e);
      st.customers = [];
    }
    paintCustomers();
  }

  async function loadProducts() {
    var sel = $('taProduct');
    if (!sel || !MineralBarApp.listProducts) return;
    try {
      var prod = await MineralBarApp.listProducts({ active: 1, limit: 25 });
      (prod.rows || []).forEach(function (p) {
        var id = String(p.id || p.product_id || '');
        if (!id) return;
        var opt = global.document.createElement('option');
        opt.value = id;
        opt.textContent = String(p.product_name || p.name || p.title || ('#' + id));
        sel.appendChild(opt);
      });
    } catch (e) {
      console.warn('[ticket-add] Products.List failed', e);
    }
  }

  function loadTeam() {
    var sel = $('taTech');
    if (!sel) return;
    var team = (MineralBarApp.getTeamMembers && MineralBarApp.getTeamMembers()) || [];
    team.forEach(function (m) {
      var id = String(m.id || m.user_id || '');
      if (!id) return;
      var opt = global.document.createElement('option');
      opt.value = id;
      opt.textContent = String(m.name || m.full_name || m.email || ('#' + id));
      sel.appendChild(opt);
    });
  }

  function showError(msg) {
    var el = $('taError');
    var ok = $('taSuccess');
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

  async function submit() {
    if (st.busy) return;
    showError('');
    if (!st.customer || !st.customer.id) {
      showError(tr('err_select_customer'));
      return;
    }
    var topic = tr((TYPES.filter(function (t) { return t.id === st.callType; })[0] || TYPES[0]).key);
    var problem = String(($('taProblem') && $('taProblem').value) || '').trim();
    if (!st.callType) { showError(tr('err_select_type')); return; }
    if (!problem) { showError(tr('err_problem_required')); return; }
    var address = composeAddress();
    if (!address) { showError(tr('err_address_required')); return; }
    var cashAmount = String(($('taCashAmount') && $('taCashAmount').value) || '').replace(/[^\d.]/g, '');
    if (st.cash && !(Number(cashAmount) > 0)) {
      showError(tr('cash_amount_label') + ' *');
      return;
    }

    st.busy = true;
    var btn = $('taSubmit');
    var label = btn && btn.querySelector('span');
    if (btn) btn.disabled = true;
    if (label) label.textContent = tr('loading');

    try {
      var prio = st.priority === 'high' ? 'high' : (st.priority === 'low' ? 'low' : 'normal');
      var rating = prio === 'high' ? 5 : (prio === 'low' ? 1 : 3);
      var payload = {
        topic: topic,
        subject: topic,
        messages: problem,
        message: problem,
        customername: st.customer.name,
        email: st.customer.email || '',
        address: address,
        rating: rating,
        cust_id: st.customer.id,
        customer_id: st.customer.id
      };
      if (st.customer.phone) payload.phone = st.customer.phone;
      var techId = $('taTech') && $('taTech').value;
      if (techId) payload.assign_member_id = techId;
      var productId = $('taProduct') && $('taProduct').value;
      if (productId && /^\d+$/.test(productId)) payload.product_id = productId;
      var due = $('taDueDate') && $('taDueDate').value;
      if (due) payload.due_date = due + ' 00:00:00';
      var from = $('taFromTime') && $('taFromTime').value;
      var to = $('taToTime') && $('taToTime').value;
      if (from) {
        payload.ticket_from_time = from.length === 5 ? from + ':00' : from;
        payload.from_time_ticket = from;
      }
      if (to) {
        payload.ticket_to_time = to.length === 5 ? to + ':00' : to;
        payload.to_time_ticket = to;
      }
      payload.custom_fields = {};
      if (MineralBarApp.applyTicketCashField) {
        await MineralBarApp.applyTicketCashField(payload, st.cash ? 'yes' : 'no');
      }
      if (st.cash && cashAmount && MineralBarApp.applyTicketLabeledCustomFields) {
        await MineralBarApp.applyTicketLabeledCustomFields(payload, { cash_amount: cashAmount });
      }

      var noteLines = [problem];
      noteLines.push('Take cash from the customer: ' + (st.cash ? 'yes' : 'no'));
      if (st.cash && cashAmount) noteLines.push('Service fee amount: ' + cashAmount);
      payload.messages = noteLines.join('\n');
      payload.message = payload.messages;

      var media = [];
      if (st.photoDataUrl) {
        media.push({
          kind: 'field',
          file_name: 'ticket-new-photo.png',
          dataUrl: st.photoDataUrl
        });
      }

      var result;
      if (MineralBarApp.sanitizeTicketCustomFields) {
        payload = MineralBarApp.sanitizeTicketCustomFields(payload);
      }
      if (media.length && MineralBarApp.saveTicketWithMedia) {
        result = await MineralBarApp.saveTicketWithMedia('Ticket.Add', payload, media);
      } else {
        result = await MineralBarApp.getClient().request('Ticket.Add', payload);
      }

      var output = result && result.output;
      var ticketId = result && (
        result.ticket_id ||
        result.insert_id ||
        (result.data && (result.data.ticket_id || result.data.insert_id || result.data.id)) ||
        (output && typeof output === 'object' && (output.ticket_id || output.insert_id || output.id))
      );
      if (!result || !(Number(result.success) === 1 || result.success === true || ticketId)) {
        throw new Error((result && (result.message || result.error)) || tr('err_failed'));
      }

      if (ticketId && st.photoDataUrl && MineralBarApp.saveTicketWithMedia) {
        try {
          var fileName = (global.FieldApp && FieldApp.ticketPhotoFileName)
            ? FieldApp.ticketPhotoFileName(ticketId, 'field', 1)
            : ('ticket-' + ticketId + '-field-1.jpg');
          var mediaRes = await MineralBarApp.saveTicketWithMedia('Ticket.Edit', {
            ticket_id: ticketId,
            id: ticketId
          }, [{ kind: 'field', file_name: fileName, dataUrl: st.photoDataUrl }]);
          var retFiles = (mediaRes && mediaRes.files) || [];
          var hit = retFiles.filter(function (f) {
            return String(f.original_name || f.file_name || '') === fileName;
          })[0] || retFiles[0];
          var photoUrl = hit
            ? ((global.FieldApp && FieldApp.resolveMediaUrl)
              ? FieldApp.resolveMediaUrl(hit.file_url || hit.url || hit.file_path || '')
              : (hit.file_url || hit.url || ''))
            : '';
          var extraMsg = noteLines.slice();
          if (photoUrl && !/^data:/i.test(photoUrl)) {
            extraMsg.push('BIZ1_MEDIA:' + JSON.stringify({ field: photoUrl }));
          }
          var editBody = {
            ticket_id: ticketId,
            id: ticketId,
            messages: extraMsg.join('\n'),
            message: extraMsg.join('\n')
          };
          if (payload.custom_fields) editBody.custom_fields = payload.custom_fields;
          Object.keys(payload).forEach(function (k) {
            if (/^a-\d+$/.test(k)) editBody[k] = payload[k];
          });
          if (MineralBarApp.sanitizeTicketCustomFields) {
            editBody = MineralBarApp.sanitizeTicketCustomFields(editBody);
          }
          await MineralBarApp.getClient().request('Ticket.Edit', editBody);
        } catch (ePhoto) {
          console.warn('[ticket-add] named photo attach failed', ePhoto);
        }
      }

      if (ticketId && FieldApp.upsertLiveTicket) {
        FieldApp.upsertLiveTicket({
          id: String(ticketId),
          number: String(ticketId),
          customerId: st.customer.id,
          client: st.customer.name,
          subject: topic,
          phone: st.customer.phone,
          email: st.customer.email,
          address: address,
          status: FieldApp.STATUS.opened,
          statusApi: FieldApp.statusToApi ? FieldApp.statusToApi(FieldApp.STATUS.opened) : 'Opened',
          dateAt: Date.now(),
          live: true
        });
      }

      var ok = $('taSuccess');
      if (ok) {
        ok.textContent = tr('ticket_created');
        ok.classList.remove('hidden');
      }
      setTimeout(function () {
        if (ticketId) global.location.replace(P.detailsHref(ticketId));
        else global.location.replace(P.scheduleHref());
      }, 700);
    } catch (err) {
      showError((err && err.message) || tr('err_failed'));
    } finally {
      st.busy = false;
      if (btn) btn.disabled = false;
      if (label) label.textContent = tr('create_ticket');
    }
  }

  function bind() {
    $('taBackBtn').addEventListener('click', function (e) {
      e.preventDefault();
      global.location.href = P.scheduleHref();
    });
    $('taCustomerSearch').addEventListener('input', function () {
      st.query = this.value;
      paintCustomers();
    });
    $('taClearCust').addEventListener('click', function () {
      st.customer = null;
      paintSelected();
      paintCustomers();
    });
    $('taStreet').addEventListener('input', function () {
      if ($('taAddress')) $('taAddress').setAttribute('data-auto', '1');
      composeAddress();
    });
    $('taBuilding').addEventListener('input', function () {
      if ($('taAddress')) $('taAddress').setAttribute('data-auto', '1');
      composeAddress();
    });
    $('taCity').addEventListener('input', function () {
      if ($('taAddress')) $('taAddress').setAttribute('data-auto', '1');
      composeAddress();
    });
    $('taAddress').addEventListener('input', function () {
      this.setAttribute('data-auto', '0');
    });
    $('taCashYes').addEventListener('click', function () { st.cash = true; paintCash(); });
    $('taCashNo').addEventListener('click', function () { st.cash = false; paintCash(); });
    $('taPhotoInput').addEventListener('change', async function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        st.photoDataUrl = await FieldApp.compressImageFile(file);
        st.photoName = file.name;
        $('taPhotoName').textContent = file.name;
        $('taPhotoName').classList.remove('hidden');
        $('taPhotoZone').classList.add('has-file');
      } catch (err) {
        showError((err && err.message) || tr('photo_upload_failed'));
      }
    });
    $('taSubmit').addEventListener('click', function (e) {
      e.preventDefault();
      submit();
    });
    global.addEventListener('mineralbar:lang', function () {
      if (MineralBarI18n && MineralBarI18n.apply) MineralBarI18n.apply();
      paintTypes();
      paintPrio();
      paintCustomers();
    });
  }

  async function start() {
    var ok = await P.bootAuthenticatedPage();
    if (!ok) return;
    if (MineralBarI18n && MineralBarI18n.apply) MineralBarI18n.apply();
    paintTypes();
    paintPrio();
    paintCash();
    loadTeam();
    await loadCustomers();
    loadProducts();
    var pre = P.queryParam('customer_id') || P.queryParam('cust_id');
    if (pre) {
      var hit = st.customers.filter(function (c) { return String(c.id) === String(pre); })[0];
      if (hit) pickCustomer(hit);
      else pickCustomer({ id: String(pre), name: '#' + pre, phone: '', email: '', city: '', address: '' });
    }
  }

  function init() {
    if (!$('taSubmit')) return;
    bind();
    start();
  }

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
