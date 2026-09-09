/** Close ticket page — same flow as tech-call-close.html */
(function (global) {
  'use strict';

  var P = global.TicketPages;
  var st = {
    ticket: null,
    id: '',
    mode: 'form',
    closeStatus: '',
    reason: '',
    reasonOther: '',
    summary: '',
    terms: false,
    sendCopy: false,
    cash: 'no',
    cashAmount: '',
    warranty: '0',
    installer: '',
    products: [],
    extraProducts: [],
    extras: [],
    before: null,
    after: null,
    drawing: false,
    hasStroke: false,
    attempted: false,
    busy: false
  };

  var TONE = {
    green:  { bg: '#eafaf0', border: '#9bd9b4', iconBg: '#25b35e', iconColor: '#fff', text: '#1f7a45' },
    amber:  { bg: '#fdf6e8', border: '#ecd7a4', iconBg: '#e0a13c', iconColor: '#fff', text: '#9a7320' },
    gray:   { bg: '#f4f5f7', border: '#d3d8e0', iconBg: '#8a93a3', iconColor: '#fff', text: '#5a6473' },
    red:    { bg: '#fbeeed', border: '#f0c4bf', iconBg: '#c0392b', iconColor: '#fff', text: '#a3302e' },
    purple: { bg: '#eef0fb', border: '#cdd0ee', iconBg: '#50439d', iconColor: '#fff', text: '#403487' }
  };
  var IDLE = { bg: '#fff', border: '#e4e8ee', iconBg: '#f1f3f6', iconColor: '#9aa3b0', text: '#5a6473' };

  function tr(key) { return P.tr(key); }
  function $(id) { return global.document.getElementById(id); }

  function statusDefs() {
    return [
      { id: 'done', label: tr('close_status_done'), icon: 'check', tone: 'green' },
      { id: 'followup', label: tr('close_status_followup'), hint: tr('close_status_followup_hint'), icon: 'clock', tone: 'amber', reason: true },
      { id: 'noanswer', label: tr('close_status_noanswer'), icon: 'phone', tone: 'gray', skipWorkMedia: true, skipWorkDetails: true },
      { id: 'notdone', label: tr('close_status_notdone'), icon: 'x', tone: 'red', skipWorkMedia: true },
      { id: 'lab', label: tr('close_status_lab'), icon: 'lab', tone: 'purple' }
    ];
  }

  function statusById(id) {
    return statusDefs().filter(function (s) { return s.id === id; })[0] || null;
  }

  function skipWorkMedia() {
    var s = statusById(st.closeStatus);
    return !!(s && s.skipWorkMedia);
  }

  function skipWorkDetails() {
    var s = statusById(st.closeStatus);
    return !!(s && s.skipWorkDetails);
  }

  function needsReason() {
    var s = statusById(st.closeStatus);
    return !!(s && s.reason);
  }

  function isClosedTicket(t) {
    return !!(t && global.FieldApp && FieldApp.migrateStatus(t.status) === FieldApp.STATUS.closed);
  }

  function reasonOptions() {
    return [
      { id: 'saturday', label: tr('reason_saturday') },
      { id: 'wrong_model', label: tr('reason_wrong_model') },
      { id: 'extra_sale', label: tr('reason_extra_sale') },
      { id: 'other', label: tr('reason_other') }
    ];
  }

  function canvas() { return $('tcSigCanvas'); }
  function ctx() {
    var c = canvas();
    return c ? c.getContext('2d') : null;
  }

  function setupCanvas() {
    var c = canvas();
    var context = ctx();
    if (!c || !context) return;
    var ratio = global.devicePixelRatio || 1;
    var w = c.clientWidth || 320;
    var h = 160;
    c.width = Math.floor(w * ratio);
    c.height = Math.floor(h * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineWidth = 2.2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#1f2a3a';
  }

  function sigPos(e) {
    var c = canvas();
    var rect = c.getBoundingClientRect();
    var src = (e.touches && e.touches[0]) || e;
    var scaleX = (c.clientWidth || rect.width) / rect.width;
    var scaleY = 160 / rect.height;
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
  }

  function clearSig() {
    st.hasStroke = false;
    st.drawing = false;
    setupCanvas();
  }

  function bindCanvas() {
    var c = canvas();
    if (!c || c.__bound) return;
    c.__bound = true;
    setupCanvas();
    function start(e) {
      if (skipWorkDetails()) return;
      e.preventDefault();
      st.drawing = true;
      var p = sigPos(e);
      ctx().beginPath();
      ctx().moveTo(p.x, p.y);
    }
    function move(e) {
      if (!st.drawing) return;
      e.preventDefault();
      var p = sigPos(e);
      ctx().lineTo(p.x, p.y);
      ctx().stroke();
      st.hasStroke = true;
      paintProgress();
    }
    function end() { st.drawing = false; }
    c.addEventListener('mousedown', start);
    c.addEventListener('mousemove', move);
    c.addEventListener('mouseup', end);
    c.addEventListener('mouseleave', end);
    c.addEventListener('touchstart', start, { passive: false });
    c.addEventListener('touchmove', move, { passive: false });
    c.addEventListener('touchend', end);
  }

  function productLabel(p) {
    return (p && (p.name || ('#' + p.id))) || '';
  }

  function fillProductSelect(sel, selected) {
    if (!sel) return;
    var keep = sel.getAttribute('data-placeholder') || tr('select_product');
    sel.innerHTML = '';
    var first = global.document.createElement('option');
    first.value = '';
    first.textContent = keep;
    sel.appendChild(first);
    st.products.forEach(function (p) {
      var opt = global.document.createElement('option');
      opt.value = p.id;
      opt.textContent = productLabel(p);
      if (String(selected) === String(p.id)) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function paintStatuses() {
    var root = $('tcStatusList');
    if (!root) return;
    root.innerHTML = '';
    statusDefs().forEach(function (s) {
      var on = s.id === st.closeStatus;
      var t = on ? (TONE[s.tone] || IDLE) : IDLE;
      var btn = global.document.createElement('button');
      btn.type = 'button';
      btn.className = 'close-status-btn';
      btn.style.background = t.bg;
      btn.style.borderColor = t.border;
      btn.innerHTML =
        '<div class="close-status-icon"></div>' +
        '<div style="flex:1;min-width:0;"><div class="close-status-title"></div>' +
        (s.hint ? '<div class="close-status-hint"></div>' : '') + '</div>' +
        '<div class="close-radio' + (on ? ' is-on' : '') + '"><span></span></div>';
      var icon = btn.querySelector('.close-status-icon');
      icon.style.background = t.iconBg;
      icon.style.color = t.iconColor;
      var paths = {
        check: '<path d="M20 6 9 17l-5-5"></path>',
        clock: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
        phone: '<path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.3 1z"></path>',
        x: '<circle cx="12" cy="12" r="9"></circle><path d="M15 9l-6 6M9 9l6 6"></path>',
        lab: '<path d="M9 3h6M10 3v6l-5 8.5A2 2 0 0 0 7 21h10a2 2 0 0 0 1.7-3.5L14 9V3"></path>'
      };
      icon.innerHTML = '<svg fill="none" height="19" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="19">' + (paths[s.icon] || '') + '</svg>';
      btn.querySelector('.close-status-title').textContent = s.label;
      btn.querySelector('.close-status-title').style.color = t.text;
      var hint = btn.querySelector('.close-status-hint');
      if (hint) hint.textContent = s.hint;
      var radio = btn.querySelector('.close-radio');
      radio.style.borderColor = on ? t.iconBg : '#cbd3de';
      radio.style.background = on ? t.iconBg : '#fff';
      btn.addEventListener('click', function () {
        st.closeStatus = s.id;
        paintForm();
      });
      root.appendChild(btn);
    });
  }

  function paintChips() {
    var root = $('tcChips');
    if (!root) return;
    var chips = [tr('chip_filters'), tr('chip_install'), tr('chip_pressure'), tr('chip_cleaned')];
    root.innerHTML = '';
    chips.forEach(function (label) {
      var btn = global.document.createElement('button');
      btn.type = 'button';
      btn.className = 'close-chip';
      btn.textContent = '+ ' + label;
      btn.addEventListener('click', function () {
        var el = $('tcSummary');
        var cur = String(el.value || '').trim();
        el.value = cur ? (cur + (cur.slice(-1) === '.' ? ' ' : '. ') + label) : label;
        st.summary = el.value;
        paintProgress();
      });
      root.appendChild(btn);
    });
  }

  function paintReason() {
    var wrap = $('tcReasonWrap');
    P.show(wrap, needsReason());
    var sel = $('tcReasonSelect');
    if (sel && !sel.__filled) {
      reasonOptions().forEach(function (r) {
        var opt = global.document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.label;
        sel.appendChild(opt);
      });
      sel.__filled = true;
    }
    if (sel) sel.value = st.reason;
    P.show($('tcReasonOtherWrap'), st.reason === 'other' || !!st.reason);
    P.show($('tcStatusError'), st.attempted && !st.closeStatus);
    P.show($('tcReasonError'), st.attempted && needsReason() && !st.reason);
  }

  function setPhotoPreview(kind, dataUrl) {
    var img = kind === 'before' ? $('tcBeforePreview') : $('tcAfterPreview');
    var label = kind === 'before' ? $('tcBeforeLabel') : $('tcAfterLabel');
    if (!img || !label) return;
    if (dataUrl) {
      img.src = dataUrl;
      img.style.display = 'block';
      label.classList.add('has-img');
    } else {
      img.removeAttribute('src');
      img.style.display = 'none';
      label.classList.remove('has-img');
    }
  }

  function paintExtras() {
    var root = $('tcExtraList');
    if (!root) return;
    root.innerHTML = '';
    st.extras.forEach(function (item, idx) {
      var label = global.document.createElement('label');
      label.className = 'photo-slot has-img';
      var img = global.document.createElement('img');
      img.src = item.dataUrl;
      img.alt = tr('extra_photo');
      label.appendChild(img);
      label.addEventListener('click', function (e) {
        e.preventDefault();
        st.extras.splice(idx, 1);
        paintExtras();
      });
      root.appendChild(label);
    });
  }

  function paintProgress() {
    var summaryOk = skipWorkMedia() || String(($('tcSummary') && $('tcSummary').value) || st.summary || '').trim().length >= 2;
    var reasonOk = !needsReason() || !!st.reason;
    var p3Ok = !!st.terms && (skipWorkDetails() || st.hasStroke);
    var can = !!st.closeStatus && summaryOk && reasonOk && p3Ok;
    function bar(id, on) {
      var el = $(id);
      if (el) el.classList.toggle('is-on', !!on);
    }
    bar('tcP1', !!st.closeStatus);
    bar('tcP2', summaryOk && reasonOk);
    bar('tcP3', p3Ok);
    bar('tcP4', can);
  }

  function paintForm() {
    paintStatuses();
    paintReason();
    paintChips();
    P.show($('tcWorkMedia'), !skipWorkMedia());
    P.show($('tcWorkDetails'), !skipWorkDetails());
    P.show($('tcSignatureCard'), !skipWorkDetails());
    P.show($('tcProgress'), st.mode === 'form');
    $('tcTermsBtn').classList.toggle('is-on', st.terms);
    $('tcSendCopyBtn').classList.toggle('is-on', st.sendCopy);
    $('tcCashYes').classList.toggle('is-on', st.cash === 'yes');
    $('tcCashNo').classList.toggle('is-on', st.cash !== 'yes');
    P.show($('tcCashAmountWrap'), st.cash === 'yes');
    P.show($('tcTermsError'), st.attempted && !st.terms);
    P.show($('tcSummaryError'), st.attempted && !skipWorkMedia() && String(($('tcSummary') && $('tcSummary').value) || '').trim().length < 2);
    P.show($('tcSigError'), st.attempted && !skipWorkDetails() && !st.hasStroke);
    paintProgress();
  }

  function showMode() {
    P.show($('tcLoading'), false);
    P.show($('tcForm'), st.mode === 'form');
    P.show($('tcView'), st.mode === 'view');
    P.show($('tcActions'), true);
    P.show($('tcSubmitBtn'), st.mode === 'form');
    P.show($('tcBackListBtn'), st.mode === 'view');
    P.show($('tcProgress'), st.mode === 'form');
    var title = $('tcPageTitle');
    if (title) title.textContent = st.mode === 'view' ? tr('view_ticket') : tr('close_call');
  }

  function fillCustomer() {
    var t = st.ticket;
    if (!t) return;
    var name = FieldApp.clientDisplay(t);
    $('tcCustName').textContent = name;
    $('tcCustAddress').textContent = t.address || '—';
    $('tcCustPhone').textContent = t.phone || '—';
    $('tcSubject').textContent = t.subject || '—';
    $('tcCustomerId').value = t.customerId || '';
    $('tcHeaderSub').textContent = '#' + (t.number || t.id) + (name ? ' · ' + name : '');
    var user = (global.MineralBarApp && MineralBarApp.getUserBasic && MineralBarApp.getUserBasic()) || {};
    $('tcInstaller').value = st.installer || user.name || user.full_name || user.email || '';
    st.installer = $('tcInstaller').value;
    fillProductSelect($('tcInstalledSelect'));
    fillProductSelect($('tcFiltersSelect'));
    var existingBefore = ((t.photos || []).filter(function (p) { return p.kind === 'before'; })[0] || {}).dataUrl;
    var existingAfter = ((t.photos || []).filter(function (p) { return p.kind === 'after'; })[0] || {}).dataUrl;
    if (existingBefore && !st.before) { st.before = existingBefore; setPhotoPreview('before', existingBefore); }
    if (existingAfter && !st.after) { st.after = existingAfter; setPhotoPreview('after', existingAfter); }
  }

  function paintView(media) {
    media = media || {};
    var t = st.ticket;
    $('tvSubject').textContent = (t && t.subject) || '—';
    var def = statusById(st.closeStatus);
    $('tvStatus').textContent = (def && def.label) || st.closeStatus || '—';
    P.show($('tvReasonWrap'), !!st.reason);
    if (st.reason) {
      var opt = reasonOptions().filter(function (r) { return r.id === st.reason; })[0];
      $('tvReason').textContent = (opt && opt.label) || st.reasonOther || st.reason;
    }
    $('tvSummary').textContent = st.summary || (t && (t.summary || t.subject)) || '—';
    var photos = $('tvPhotos');
    photos.innerHTML = '';
    function addFig(src, cap) {
      if (!src) return;
      var fig = global.document.createElement('figure');
      fig.className = 'completed-media';
      fig.innerHTML = '<img alt=""><figcaption></figcaption>';
      fig.querySelector('img').src = src;
      fig.querySelector('figcaption').textContent = cap;
      fig.addEventListener('click', function () { openLightbox(src, cap); });
      photos.appendChild(fig);
    }
    addFig(media.before || st.before, tr('before_photo'));
    addFig(media.after || st.after, tr('after_photo'));
    (media.extras || st.extras).forEach(function (ex, i) {
      addFig(ex.dataUrl || ex, tr('extra_photo') + ' ' + (i + 1));
    });
    P.show(photos, photos.children.length > 0);
    var sig = media.signature || (t && t.signature);
    P.show($('tvSigWrap'), !!sig);
    if (sig) $('tvSignature').src = sig;
  }

  function openLightbox(url, caption) {
    $('tcLightboxImg').src = url;
    $('tcLightboxCap').textContent = caption || '';
    P.show($('tcLightbox'), true);
  }

  function collectSpares() {
    var list = [];
    function push(selId, valId) {
      var sel = $(selId);
      var id = sel && sel.value;
      if (!id) return;
      var p = st.products.filter(function (x) { return String(x.id) === String(id); })[0];
      var val = $(valId) ? $(valId).value : '';
      list.push({ id: id, name: productLabel(p) || id, qty: 1, price: val });
    }
    push('tcInstalledSelect', 'tcInstalledValue');
    push('tcFiltersSelect', 'tcFiltersValue');
    st.extraProducts.forEach(function (row) {
      if (!row.productId) return;
      var p = st.products.filter(function (x) { return String(x.id) === String(row.productId); })[0];
      list.push({ id: row.productId, name: productLabel(p) || row.productId, qty: 1, price: row.value || '' });
    });
    return list;
  }

  function validate() {
    st.attempted = true;
    st.summary = String(($('tcSummary') && $('tcSummary').value) || '').trim();
    var errors = [];
    if (!st.closeStatus) errors.push(tr('closing_status'));
    if (needsReason() && !st.reason) errors.push(tr('followup_reason'));
    if (!skipWorkMedia() && st.summary.length < 2) errors.push(tr('work_summary'));
    if (!st.terms) errors.push(tr('terms_label'));
    if (!skipWorkDetails() && !st.hasStroke) errors.push(tr('digital_signature'));
    if (st.cash === 'yes' && !String(($('tcCashAmount') && $('tcCashAmount').value) || '').replace(/[^0-9.]/g, '')) {
      errors.push(tr('cash_amount'));
    }
    paintForm();
    return errors;
  }

  async function submit() {
    var errBox = $('tcFormError');
    errBox.classList.add('hidden');
    errBox.textContent = '';
    var errors = validate();
    if (errors.length) {
      errBox.textContent = tr('complete_required') + '\n' + errors.join('\n');
      errBox.classList.remove('hidden');
      return;
    }
    if (st.busy || !st.ticket) return;
    st.busy = true;
    var btn = $('tcSubmitBtn');
    var label = $('tcSubmitLabel');
    if (btn) btn.disabled = true;
    if (label) label.textContent = tr('loading');

    try {
      var summary = st.summary;
      var def = statusById(st.closeStatus);
      var statusLabel = def ? def.label : st.closeStatus;
      var reasonOpt = reasonOptions().filter(function (r) { return r.id === st.reason; })[0];
      var reasonText = reasonOpt ? reasonOpt.label : st.reason;
      var reasonDetails = String(($('tcReasonOther') && $('tcReasonOther').value) || st.reasonOther || '').trim();
      var warrantyMonths = String(($('tcWarranty') && $('tcWarranty').value) || st.warranty || '0');
      st.installer = String(($('tcInstaller') && $('tcInstaller').value) || '').trim();
      st.cashAmount = String(($('tcCashAmount') && $('tcCashAmount').value) || '').replace(/[^0-9.]/g, '');
      var spares = collectSpares();
      var includeWorkMedia = !skipWorkMedia();
      var includeWorkDetails = !skipWorkDetails();

      var mediaFiles = [];
      var requestPhotos = [];
      function pushPhoto(kind, dataUrl, index) {
        if (!dataUrl) return;
        var photo = { kind: kind, dataUrl: dataUrl, uploaded: false };
        if (/^data:/i.test(dataUrl)) {
          var fileName = FieldApp.ticketPhotoFileName(st.id, kind, index || 1);
          mediaFiles.push({ kind: kind, file_name: fileName, dataUrl: dataUrl });
          photo.name = fileName;
        }
        requestPhotos.push(photo);
      }
      if (includeWorkMedia) {
        pushPhoto('before', st.before, 1);
        pushPhoto('after', st.after, 1);
        st.extras.forEach(function (ex, i) { pushPhoto('extra', ex.dataUrl, i + 1); });
      }
      var signatureDataUrl = (!skipWorkDetails() && st.hasStroke) ? canvas().toDataURL('image/png') : null;
      var signatureFileName = FieldApp.ticketSignatureFileName(st.id);
      if (signatureDataUrl && /^data:/i.test(signatureDataUrl)) {
        mediaFiles.push({ kind: 'signature', file_name: signatureFileName, dataUrl: signatureDataUrl });
      }

      var returnedFiles = [];
      for (var i = 0; i < mediaFiles.length; i++) {
        var mediaResponse = await MineralBarApp.saveTicketWithMedia('Ticket.Edit', {
          ticket_id: st.id,
          id: st.id
        }, [mediaFiles[i]]);
        var mediaOk = !!(mediaResponse && (Number(mediaResponse.success) === 1 || mediaResponse.success === true));
        if (!mediaOk) throw new Error((mediaResponse && mediaResponse.message) || tr('err_failed'));
        if (Array.isArray(mediaResponse.files)) returnedFiles = returnedFiles.concat(mediaResponse.files);
      }

      function returnedFileUrl(fileName) {
        var match = returnedFiles.filter(function (file) {
          return String(file.original_name || file.file_name || '') === String(fileName);
        })[0];
        var value = match && (match.file_url || match.url || match.file_path) || '';
        return FieldApp.resolveMediaUrl(value);
      }
      requestPhotos = requestPhotos.map(function (photo) {
        var url = returnedFileUrl(photo.name);
        if (!url) return photo;
        return Object.assign({}, photo, { dataUrl: url, url: url, uploaded: true });
      });
      var signatureUrl = returnedFileUrl(signatureFileName) || signatureDataUrl || '';
      var mediaManifest = {};
      requestPhotos.forEach(function (photo) {
        var kind = String(photo.kind || '').toLowerCase();
        var url = photo.url || photo.dataUrl || '';
        if ((kind === 'before' || kind === 'after') && url && !/^data:/i.test(url)) mediaManifest[kind] = url;
        if (kind === 'extra' && url && !/^data:/i.test(url)) {
          mediaManifest.extras = mediaManifest.extras || [];
          mediaManifest.extras.push(url);
        }
      });
      if (signatureUrl && !/^data:/i.test(signatureUrl)) mediaManifest.signature = signatureUrl;
      if (includeWorkDetails && signatureDataUrl && !mediaManifest.signature) {
        throw new Error(tr('sign_upload_failed'));
      }

      var lines = ['Closing status: ' + statusLabel];
      if (st.terms) lines.push('Customer approved terms.');
      lines.push('Send copy to customer: ' + (st.sendCopy ? 'yes' : 'no'));
      if (reasonText) lines.push('Follow-up reason: ' + reasonText);
      if (reasonDetails) lines.push('Follow-up details: ' + reasonDetails);
      lines.push('Warranty months: ' + warrantyMonths);
      if (st.installer) lines.push('Installer: ' + st.installer);
      if (includeWorkMedia && summary) lines.push('Work summary: ' + summary);
      if (includeWorkDetails) {
        spares.forEach(function (s) {
          var line = '- ' + s.name + ' x' + s.qty;
          if (s.price) line += ' · ' + s.price + ' ILS';
          lines.push(line);
        });
        if (st.cash === 'yes') {
          lines.push('Take cash from the customer: yes');
          lines.push('Cash collected: yes · ' + st.cashAmount + ' ILS');
          lines.push('Service fee amount: ' + st.cashAmount);
        } else {
          lines.push('Take cash from the customer: no');
          lines.push('Cash collected: no');
        }
      }
      if (mediaManifest.before) lines.push('Before photo attached.');
      if (mediaManifest.after) lines.push('After photo attached.');
      if (mediaManifest.signature) lines.push('Client signature saved.');
      lines.push('BIZ1_MEDIA:' + JSON.stringify(mediaManifest));

      var payload = {
        ticket_id: st.id,
        id: st.id,
        status: FieldApp.statusToApi(FieldApp.STATUS.closed),
        messages: lines.join('\n'),
        message: lines.join('\n'),
        custom_fields: {}
      };
      var closeFields = {
        closing_status: st.closeStatus || statusLabel,
        warranty_months: warrantyMonths,
        installer_name: st.installer
      };
      if (st.reason) closeFields.followup_reason = st.reason;
      if (reasonDetails) closeFields.closing_reason = reasonDetails;
      if (includeWorkDetails && st.cash === 'yes') {
        closeFields.cash_amount = st.cashAmount;
      }
      if (MineralBarApp.applyTicketLabeledCustomFields) {
        await MineralBarApp.applyTicketLabeledCustomFields(payload, closeFields);
      }
      if (includeWorkDetails && MineralBarApp.applyTicketCashField) {
        await MineralBarApp.applyTicketCashField(payload, st.cash === 'yes' ? 'yes' : 'no');
      }
      if (includeWorkMedia && summary) {
        payload.subject = st.ticket.subject || summary;
        payload.topic = payload.subject;
      }
      var productIds = spares.map(function (s) { return s.id; }).filter(function (id) {
        return /^\d+$/.test(id) && id.length <= 10;
      });
      if (productIds.length) payload.product_id = productIds.join(',');

      var raw = await MineralBarApp.saveTicketWithMedia('Ticket.Edit', payload, []);
      var ok = !!(raw && (Number(raw.success) === 1 || raw.success === true));
      if (!ok) throw new Error((raw && raw.message) || tr('err_failed'));

      FieldApp.updateTicket(st.id, {
        status: FieldApp.STATUS.closed,
        statusApi: FieldApp.statusToApi(FieldApp.STATUS.closed),
        summary: summary,
        signature: signatureUrl || st.ticket.signature,
        spareParts: spares,
        productIds: productIds,
        photos: requestPhotos.length ? requestPhotos : st.ticket.photos
      });
      st.ticket = FieldApp.getTicket(st.id);

      if (st.sendCopy && st.ticket) {
        try {
          var customerId = st.ticket.customerId || FieldApp.ticketCustomerId(st.ticket.raw);
          if (customerId && MineralBarApp.sendCustomerMessage) {
            await MineralBarApp.sendCustomerMessage({
              customer_id: customerId,
              cust_id: customerId,
              message: (tr('wa_signed_pdf') || '').replace('{ticket}', st.ticket.number || st.id),
              from: 'send_whatsapp',
              phone: String(st.ticket.phone || '').replace(/\D/g, '') || undefined
            });
          }
        } catch (eWa) {
          console.warn('[ticket-close] WhatsApp copy failed', eWa);
        }
      }

      st.mode = 'view';
      showMode();
      paintView({
        before: mediaManifest.before || st.before,
        after: mediaManifest.after || st.after,
        signature: mediaManifest.signature || signatureUrl,
        extras: (mediaManifest.extras || []).map(function (u) { return { dataUrl: u }; })
      });
    } catch (err) {
      errBox.textContent = (err && err.message) || tr('err_failed');
      errBox.classList.remove('hidden');
    } finally {
      st.busy = false;
      if (btn) btn.disabled = false;
      if (label) label.textContent = tr('complete_send');
    }
  }

  async function loadProducts() {
    if (!global.MineralBarApp || !MineralBarApp.listProducts) return;
    try {
      var prod = await MineralBarApp.listProducts({ active: 1, limit: 25 });
      st.products = (prod.rows || []).map(function (p) {
        return {
          id: String(p.id || p.product_id || ''),
          name: String(p.product_name || p.name || p.title || ('#' + (p.id || ''))),
          price: p.price || p.sale_price || ''
        };
      }).filter(function (p) { return p.id; });
    } catch (e) {
      console.warn('[ticket-close] Products.List failed', e);
      st.products = [];
    }
  }

  function bindPhoto(inputId, kind) {
    var input = $(inputId);
    if (!input || input.__bound) return;
    input.__bound = true;
    input.addEventListener('change', async function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        var dataUrl = await FieldApp.compressImageFile(file);
        if (kind === 'extra') {
          st.extras.push({ dataUrl: dataUrl });
          paintExtras();
        } else {
          st[kind] = dataUrl;
          setPhotoPreview(kind, dataUrl);
        }
      } catch (err) {
        $('tcFormError').textContent = (err && err.message) || tr('photo_upload_failed');
        $('tcFormError').classList.remove('hidden');
      } finally {
        e.target.value = '';
      }
    });
  }

  function bind() {
    $('tcBackBtn').addEventListener('click', function (e) {
      e.preventDefault();
      global.location.href = st.id ? P.detailsHref(st.id) : P.scheduleHref();
    });
    $('tcBackListBtn').addEventListener('click', function () {
      global.location.href = P.scheduleHref();
    });
    $('tcReasonSelect').addEventListener('change', function () {
      st.reason = this.value;
      paintForm();
    });
    $('tcReasonOther').addEventListener('input', function () { st.reasonOther = this.value; });
    $('tcSummary').addEventListener('input', function () {
      st.summary = this.value;
      paintProgress();
    });
    $('tcTermsBtn').addEventListener('click', function () {
      st.terms = !st.terms;
      paintForm();
    });
    $('tcSendCopyBtn').addEventListener('click', function () {
      st.sendCopy = !st.sendCopy;
      paintForm();
    });
    $('tcCashYes').addEventListener('click', function () { st.cash = 'yes'; paintForm(); });
    $('tcCashNo').addEventListener('click', function () { st.cash = 'no'; paintForm(); });
    $('tcClearSig').addEventListener('click', function () { clearSig(); paintProgress(); });
    $('tcSubmitBtn').addEventListener('click', function (e) { e.preventDefault(); submit(); });
    $('tcAddProduct').addEventListener('click', function () {
      var id = 'ep' + Date.now();
      st.extraProducts.push({ id: id, productId: '', value: '' });
      var wrap = $('tcExtraProducts');
      var row = global.document.createElement('div');
      row.className = 'wd-row';
      row.style.marginTop = '12px';
      row.innerHTML =
        '<div><label class="wd-label">' + tr('add_another_product') + '</label>' +
        '<select class="ds-input input wd-product-select" data-ep="' + id + '" style="width:100%;padding:11px 13px;border-radius:11px;"></select></div>' +
        '<div><label class="wd-label">' + tr('value_label') + '</label>' +
        '<div class="wd-value-wrap"><input class="ds-input input wd-value-input" data-ep-val="' + id + '" placeholder="0" style="width:100%;padding:11px 13px;border-radius:11px;"><span>₪</span></div></div>';
      wrap.appendChild(row);
      fillProductSelect(row.querySelector('select'));
      row.querySelector('select').addEventListener('change', function () {
        st.extraProducts.forEach(function (p) {
          if (p.id === id) p.productId = row.querySelector('select').value;
        });
      });
      row.querySelector('input').addEventListener('input', function () {
        st.extraProducts.forEach(function (p) {
          if (p.id === id) p.value = row.querySelector('input').value;
        });
      });
    });
    bindPhoto('tcBeforeInput', 'before');
    bindPhoto('tcAfterInput', 'after');
    bindPhoto('tcExtraInput', 'extra');
    bindCanvas();
    var box = $('tcLightbox');
    if (box) box.addEventListener('click', function () { P.show(box, false); });
    var closeLb = $('tcLightboxClose');
    if (closeLb) closeLb.addEventListener('click', function (e) {
      e.stopPropagation();
      P.show($('tcLightbox'), false);
    });
    global.addEventListener('mineralbar:lang', function () {
      if (global.MineralBarI18n && MineralBarI18n.apply) MineralBarI18n.apply();
      var sel = $('tcReasonSelect');
      if (sel) {
        sel.__filled = false;
        while (sel.options.length > 1) sel.remove(1);
      }
      paintForm();
    });
  }

  async function start() {
    st.id = P.queryParam('id') || P.queryParam('ticket_id') || '';
    var ok = await P.bootAuthenticatedPage();
    if (!ok) return;
    if (global.MineralBarI18n && MineralBarI18n.apply) MineralBarI18n.apply();
    if (!st.id) {
      P.show($('tcLoading'), false);
      P.show($('tcFormError'), true);
      $('tcFormError').textContent = tr('data_not_found');
      return;
    }
    try {
      st.ticket = await P.loadTicket(st.id);
    } catch (e) {
      console.warn('[ticket-close] load failed', e);
    }
    await loadProducts();
    if (!st.ticket) {
      P.show($('tcLoading'), false);
      $('tcFormError').textContent = tr('data_not_found');
      $('tcFormError').classList.remove('hidden');
      P.show($('tcActions'), true);
      P.show($('tcSubmitBtn'), false);
      P.show($('tcBackListBtn'), true);
      return;
    }
    fillCustomer();
    if (isClosedTicket(st.ticket)) {
      st.mode = 'view';
      st.summary = st.ticket.summary || st.ticket.subject || '';
      st.closeStatus = 'done';
      showMode();
      paintView({
        before: ((st.ticket.photos || []).filter(function (p) { return p.kind === 'before'; })[0] || {}).dataUrl,
        after: ((st.ticket.photos || []).filter(function (p) { return p.kind === 'after'; })[0] || {}).dataUrl,
        signature: st.ticket.signature
      });
      return;
    }
    st.mode = 'form';
    showMode();
    paintForm();
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
