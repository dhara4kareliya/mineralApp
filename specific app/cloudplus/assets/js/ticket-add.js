/** Create ticket — CRM Add Ticket form fields */
(function (global) {
  'use strict';

  var P = global.TicketPages;

  var st = {
    customers: [],
    query: '',
    customer: null,
    urgency: 1,
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
      phone: String(c.phone || c.tel || '').trim(),
      mobile: String(c.mobile || c.cellular || c.phone2 || '').trim(),
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
      var hay = [c.name, c.phone, c.mobile, c.email, c.city, c.address].join(' ').toLowerCase().replace(/[-\s]/g, '');
      return hay.indexOf(q) !== -1;
    }).slice(0, 40);
  }

  function setVal(id, value) {
    var el = $(id);
    if (el) el.value = value == null ? '' : String(value);
  }

  function getVal(id) {
    var el = $(id);
    return String((el && el.value) || '').trim();
  }

  function fillCustomerFields(c) {
    if (!c) return;
    setVal('taCustNameInput', c.name || '');
    setVal('taEmail', c.email || '');
    setVal('taPhone', c.phone || '');
    setVal('taMobile', c.mobile || c.phone || '');
    setVal('taCity', c.city || '');
    setVal('taAddress', c.address || '');
  }

  function composeAddress() {
    var address = getVal('taAddress');
    var city = getVal('taCity');
    if (address && city && address.toLowerCase().indexOf(city.toLowerCase()) === -1) {
      return address + ', ' + city;
    }
    return address || city || '';
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
      btn.querySelector('.td-customer-addr').textContent = [c.phone || c.mobile, c.city || c.address].filter(Boolean).join(' · ') || '—';
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
    $('taCustMeta').textContent = [c.phone || c.mobile, c.email].filter(Boolean).join(' · ') || ('#' + c.id);
  }

  async function pickCustomer(c) {
    st.customer = c;
    paintSelected();
    paintCustomers();
    fillCustomerFields(c);
    try {
      if (MineralBarApp.getCustomer) {
        var res = await MineralBarApp.getCustomer(c.id);
        var full = (res && res.customer) || {};
        if (full.data && typeof full.data === 'object') full = full.data;
        var mapped = mapCustomer(Object.assign({}, c.raw, full, { customer_id: c.id, id: c.id }));
        if (mapped) {
          st.customer = mapped;
          paintSelected();
          fillCustomerFields(mapped);
        }
      }
    } catch (e) { /* keep list row */ }
  }

  function paintUrgency() {
    var root = $('taUrgency');
    if (!root) return;
    root.innerHTML = '';
    var i;
    for (i = 1; i <= 5; i++) {
      (function (n) {
        var btn = global.document.createElement('button');
        btn.type = 'button';
        btn.className = 'ta-star-btn' + (n <= st.urgency ? ' is-on' : '');
        btn.textContent = '★';
        btn.setAttribute('aria-label', n + ' / 5');
        btn.addEventListener('click', function () {
          st.urgency = n;
          paintUrgency();
        });
        btn.addEventListener('mouseenter', function () {
          Array.prototype.forEach.call(root.querySelectorAll('.ta-star-btn'), function (el, idx) {
            el.classList.toggle('is-hover', idx < n);
          });
        });
        root.appendChild(btn);
      })(i);
    }
    if (!root.getAttribute('data-bound')) {
      root.setAttribute('data-bound', '1');
      root.addEventListener('mouseleave', function () {
        Array.prototype.forEach.call(root.querySelectorAll('.ta-star-btn'), function (el) {
          el.classList.remove('is-hover');
        });
      });
    }
  }

  function paintAddChip(kind) {
    var isTech = kind === 'tech';
    var sel = $(isTech ? 'taTech' : 'taProduct');
    var chip = $(isTech ? 'taTechChip' : 'taProductChip');
    var addBtn = $(isTech ? 'taTechAdd' : 'taProductAdd');
    if (!sel || !chip || !addBtn) return;
    var val = String(sel.value || '');
    var label = '';
    if (val && sel.selectedIndex >= 0) {
      label = String((sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].textContent) || val).trim();
    }
    if (val && label) {
      chip.classList.remove('hidden');
      chip.innerHTML = '';
      var span = global.document.createElement('span');
      span.textContent = label;
      chip.appendChild(span);
      var x = global.document.createElement('button');
      x.type = 'button';
      x.textContent = '×';
      x.setAttribute('aria-label', tr('clear_selection'));
      x.addEventListener('click', function () {
        sel.value = '';
        sel.classList.add('hidden');
        addBtn.classList.remove('hidden');
        paintAddChip(kind);
      });
      chip.appendChild(x);
      addBtn.classList.add('hidden');
      sel.classList.add('hidden');
    } else {
      chip.classList.add('hidden');
      chip.innerHTML = '';
      addBtn.classList.remove('hidden');
    }
  }

  function openAddSelect(kind) {
    var isTech = kind === 'tech';
    var sel = $(isTech ? 'taTech' : 'taProduct');
    var addBtn = $(isTech ? 'taTechAdd' : 'taProductAdd');
    if (!sel) return;
    sel.classList.remove('hidden');
    if (addBtn) addBtn.classList.add('hidden');
    try { sel.focus(); } catch (e) { /* ignore */ }
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
    while (sel.options.length > 1) sel.remove(1);
    try {
      var prod = MineralBarApp.listAllProducts
        ? await MineralBarApp.listAllProducts({ active: 1 })
        : await MineralBarApp.listProducts({ active: 1, limit: 25, length: 25 });
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
    while (sel.options.length > 1) sel.remove(1);
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

  function folderLabel(f) {
    var he = global.document.documentElement.lang === 'he';
    return he
      ? String(f.name_he || f.name || f.name_en || f.title || '')
      : String(f.name_en || f.name || f.name_he || f.title || '');
  }

  async function loadDepartments() {
    var sel = $('taDepartment');
    if (!sel) return;
    var keepFirst = sel.options[0] ? sel.options[0].cloneNode(true) : null;
    sel.innerHTML = '';
    if (keepFirst) sel.appendChild(keepFirst);
    else {
      var opt0 = global.document.createElement('option');
      opt0.value = '';
      opt0.textContent = tr('choose_option');
      sel.appendChild(opt0);
    }

    var added = {};
    function addDept(id, label) {
      id = String(id || '').trim();
      label = String(label || '').trim();
      if (!id || !label || added[id]) return;
      added[id] = true;
      var opt = global.document.createElement('option');
      opt.value = id;
      opt.textContent = label;
      sel.appendChild(opt);
    }

    try {
      if (MineralBarApp.listTicketLabeledFieldOptions) {
        var opts = await MineralBarApp.listTicketLabeledFieldOptions('department');
        (opts || []).forEach(function (o) {
          addDept(o.value, (global.document.documentElement.lang === 'he' ? o.labelHe : o.labelEn) || o.label || o.value);
        });
      }
    } catch (e) { /* optional */ }

    if (!Object.keys(added).length && MineralBarApp.listTicketCustomFields && MineralBarApp.collectTicketFieldOptions) {
      try {
        var fields = await MineralBarApp.listTicketCustomFields();
        (fields || []).forEach(function (field) {
          var blob = [field.en, field.he, field.label, field.name].join(' ').toLowerCase();
          if (!/department|מחלקה/.test(blob)) return;
          (MineralBarApp.collectTicketFieldOptions(field) || []).forEach(function (o) {
            addDept(o.value, (global.document.documentElement.lang === 'he' ? o.labelHe : o.labelEn) || o.label || o.value);
          });
        });
      } catch (e2) { /* optional */ }
    }

    if (!Object.keys(added).length) {
      var folders = (MineralBarApp.getFolders && MineralBarApp.getFolders()) || [];
      folders.forEach(function (f) {
        var id = f.id || f.folder_id || f.value;
        addDept(id, folderLabel(f) || ('#' + id));
      });
    }
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

  function resetForm() {
    st.customer = null;
    st.query = '';
    st.urgency = 1;
    st.photoDataUrl = '';
    st.photoName = '';
    st.busy = false;
    if ($('taCustomerSearch')) $('taCustomerSearch').value = '';
    [
      'taCustNameInput', 'taTicketName', 'taEmail', 'taPhone', 'taMobile',
      'taAddress', 'taCity', 'taTopic', 'taDueDate', 'taFromTime', 'taToTime', 'taProblem'
    ].forEach(function (id) { setVal(id, ''); });
    if ($('taDepartment')) $('taDepartment').value = '';
    if ($('taTech')) $('taTech').value = '';
    if ($('taProduct')) $('taProduct').value = '';
    if ($('taPhotoInput')) $('taPhotoInput').value = '';
    if ($('taPhotoName')) {
      $('taPhotoName').textContent = '';
      $('taPhotoName').classList.add('hidden');
    }
    if ($('taPhotoZone')) $('taPhotoZone').classList.remove('has-file');
    paintSelected();
    paintCustomers();
    paintUrgency();
    paintAddChip('tech');
    paintAddChip('product');
    if ($('taTech')) $('taTech').classList.add('hidden');
    if ($('taProduct')) $('taProduct').classList.add('hidden');
    if ($('taTechAdd')) $('taTechAdd').classList.remove('hidden');
    if ($('taProductAdd')) $('taProductAdd').classList.remove('hidden');
    showError('');
    var ok = $('taSuccess');
    if (ok) ok.classList.add('hidden');
  }

  async function handlePasteImage(e) {
    var items = e.clipboardData && e.clipboardData.items;
    if (!items || !items.length) return;
    var i;
    for (i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf('image/') === 0) {
        e.preventDefault();
        var file = items[i].getAsFile();
        if (!file) return;
        try {
          st.photoDataUrl = await FieldApp.compressImageFile(file);
          st.photoName = file.name || 'pasted-image.png';
          $('taPhotoName').textContent = st.photoName;
          $('taPhotoName').classList.remove('hidden');
          $('taPhotoZone').classList.add('has-file');
        } catch (err) {
          showError((err && err.message) || tr('photo_upload_failed'));
        }
        return;
      }
    }
  }

  async function submit() {
    if (st.busy) return;
    showError('');

    var customerName = getVal('taCustNameInput');
    var topic = getVal('taTopic');
    var problem = getVal('taProblem');
    var department = getVal('taDepartment');
    var address = composeAddress();
    var email = getVal('taEmail');
    var phone = getVal('taPhone');
    var mobile = getVal('taMobile');
    var ticketName = getVal('taTicketName');

    if (!st.customer || !st.customer.id) {
      showError(tr('err_select_customer'));
      return;
    }
    if (!topic) { showError(tr('err_topic_required')); return; }
    if (!department) { showError(tr('err_department_required')); return; }
    if (!problem) { showError(tr('err_problem_required')); return; }

    st.busy = true;
    var btn = $('taSubmit');
    if (btn) {
      btn.disabled = true;
      btn.textContent = tr('loading');
    }

    try {
      var payload = {
        topic: topic,
        subject: topic,
        messages: problem,
        message: problem,
        customername: customerName || st.customer.name,
        email: email || st.customer.email || '',
        address: address,
        rating: Number(st.urgency) || 1,
        cust_id: st.customer.id,
        customer_id: st.customer.id,
        ticket_department: department
      };
      if (ticketName) payload.ticket_name = ticketName;
      if (phone) payload.phone = phone;
      if (mobile) {
        payload.mobile = mobile;
        if (!payload.phone) payload.phone = mobile;
      }
      if (getVal('taCity')) payload.city = getVal('taCity');

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
          await MineralBarApp.saveTicketWithMedia('Ticket.Edit', {
            ticket_id: ticketId,
            id: ticketId
          }, [{ kind: 'field', file_name: fileName, dataUrl: st.photoDataUrl }]);
        } catch (ePhoto) {
          console.warn('[ticket-add] photo attach failed', ePhoto);
        }
      }

      if (ticketId && FieldApp.upsertLiveTicket) {
        FieldApp.upsertLiveTicket({
          id: String(ticketId),
          number: String(ticketId),
          customerId: st.customer.id,
          client: customerName || st.customer.name,
          subject: topic,
          phone: phone || mobile || st.customer.phone,
          email: email || st.customer.email,
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
      if (btn) {
        btn.disabled = false;
        btn.textContent = tr('submit');
      }
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
    $('taTechAdd').addEventListener('click', function () { openAddSelect('tech'); });
    $('taProductAdd').addEventListener('click', function () { openAddSelect('product'); });
    $('taTech').addEventListener('change', function () { paintAddChip('tech'); });
    $('taProduct').addEventListener('change', function () { paintAddChip('product'); });
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
    if ($('taProblem')) $('taProblem').addEventListener('paste', handlePasteImage);
    $('taReset').addEventListener('click', function () { resetForm(); });
    $('taCancel').addEventListener('click', function () {
      global.location.href = P.scheduleHref();
    });
    $('taSubmit').addEventListener('click', function (e) {
      e.preventDefault();
      submit();
    });
    global.addEventListener('mineralbar:lang', function () {
      if (MineralBarI18n && MineralBarI18n.apply) MineralBarI18n.apply();
      paintCustomers();
      loadDepartments();
      if ($('taSubmit') && !st.busy) $('taSubmit').textContent = tr('submit');
    });
  }

  async function start() {
    var ok = await P.bootAuthenticatedPage();
    if (!ok) return;
    if (MineralBarI18n && MineralBarI18n.apply) MineralBarI18n.apply();
    paintUrgency();
    loadTeam();
    await Promise.all([loadCustomers(), loadDepartments(), loadProducts()]);
    paintAddChip('tech');
    paintAddChip('product');
    var pre = P.queryParam('customer_id') || P.queryParam('cust_id');
    if (pre) {
      var hit = st.customers.filter(function (c) { return String(c.id) === String(pre); })[0];
      if (hit) pickCustomer(hit);
      else pickCustomer({ id: String(pre), name: '#' + pre, phone: '', mobile: '', email: '', city: '', address: '' });
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
