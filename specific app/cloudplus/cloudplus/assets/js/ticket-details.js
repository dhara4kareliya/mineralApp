/** Ticket details page — same layout as service-call-details.html */
(function (global) {
  'use strict';

  var P = global.TicketPages;
  var ticket = null;
  var ticketId = '';
  var productCatalog = [];
  var chatBusy = false;
  var productBusy = false;

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

  function customerIdOf(t) {
    if (!t) return '';
    if (t.customerId) return String(t.customerId);
    if (global.FieldApp && FieldApp.ticketCustomerId) {
      return String(FieldApp.ticketCustomerId(t.raw || t) || '');
    }
    var raw = t.raw || {};
    return String(raw.customer_id || raw.cust_id || raw.contactus_id || '');
  }

  function currentProductIds(t) {
    var parts = [];
    function pushId(val) {
      String(val == null ? '' : val).split(',').forEach(function (x) {
        var id = String(x).trim();
        if (id && id !== '0' && parts.indexOf(id) === -1) parts.push(id);
      });
    }
    ((t && t.productIds) || []).forEach(pushId);
    if (!parts.length && t && t.raw) {
      pushId(t.raw.product_id || t.raw.product_ids || '');
    }
    return parts;
  }

  function productNameFromCatalog(id) {
    id = String(id || '');
    for (var i = 0; i < productCatalog.length; i++) {
      if (String(productCatalog[i].id) === id) {
        return productCatalog[i].name || '';
      }
    }
    return '';
  }

  async function resolveProductRow(id) {
    id = String(id || '').trim();
    if (!id) return null;
    var name = productNameFromCatalog(id);
    var meta = '#' + id;
    var type = '';
    try {
      if (global.MineralBarApp && MineralBarApp.getClient) {
        var res = await MineralBarApp.getClient().request('Products.Get', {
          product_id: id,
          id: id
        });
        var p = (res && (res.output || res.data || res.product)) || res || {};
        if (p.product) p = p.product;
        var resolved = String(p.product_name || p.name || p.title || '').trim();
        if (resolved) name = resolved;
        type = String(p.type || p.product_type || '').trim();
        var bits = [];
        if (type) bits.push(type);
        if (p.sku || p.product_sku) bits.push('SKU · ' + (p.sku || p.product_sku));
        bits.push('#' + id);
        meta = bits.join(' · ');
      }
    } catch (e) { /* keep catalog / id fallback */ }
    if (!name) name = '#' + id;
    if (!meta) meta = tr('linked_product') + ' · #' + id;
    return { id: id, name: name, meta: meta };
  }

  async function linkedProducts(t) {
    var ids = currentProductIds(t);
    if (!ids.length) return [];
    var out = [];
    for (var i = 0; i < ids.length; i++) {
      var row = await resolveProductRow(ids[i]);
      if (row) out.push(row);
    }
    return out;
  }

  function navHref(t) {
    if (!t || !global.FieldApp) return '';
    var waze = FieldApp.wazeUrl && FieldApp.wazeUrl(t);
    if (waze && waze !== '#') return waze;
    var maps = FieldApp.mapsUrl && FieldApp.mapsUrl(t);
    if (maps && maps !== '#') return maps;
    return '';
  }

  function openNavigate(href) {
    if (!href) return;
    try {
      var opened = global.open(href, '_blank', 'noopener');
      if (!opened) global.location.href = href;
    } catch (e) {
      global.location.href = href;
    }
  }

  function isClosed(t) {
    if (!t) return false;
    if (global.FieldApp && FieldApp.migrateStatus) {
      return FieldApp.migrateStatus(t.status) === FieldApp.STATUS.closed;
    }
    var raw = t.raw || {};
    if (raw.is_done === 1 || raw.closed === 1 || raw.is_closed === 1 || raw.close_date) return true;
    var st = String(raw.status_name || raw.status_label || t.status || '').toLowerCase();
    return st === '2' || st === 'closed' || st === 'done' || st === 'completed';
  }

  function assignedMemberId(t) {
    var raw = (t && t.raw) || {};
    var memberId = raw.assign_member_id;
    if (typeof memberId === 'string' && memberId.charAt(0) === '[') {
      try { memberId = JSON.parse(memberId); } catch (e) { /* keep string */ }
    }
    if (Array.isArray(memberId)) memberId = memberId[0];
    memberId = String(memberId == null ? '' : memberId).split(',')[0].trim();
    if (!memberId || memberId === '0') return '';
    return memberId;
  }

  function assignedName(t) {
    var raw = (t && t.raw) || {};
    var name = raw.joined_assign_member_name || raw.assign_member_name || raw.technician_name || '';
    if (name) return String(name);
    var memberId = assignedMemberId(t);
    if (!memberId) return '';
    try {
      var team = (global.MineralBarApp && MineralBarApp.getTeamMembers && MineralBarApp.getTeamMembers()) || [];
      var found = team.filter(function (m) {
        return String(m.id || m.user_id || '') === memberId;
      })[0];
      if (found && (found.name || found.full_name)) return found.name || found.full_name;
    } catch (e) { /* ignore */ }
    return memberId;
  }

  function setMenuOpen(open) {
    var menu = $('tdMoreMenu');
    var btn = $('tdMoreBtn');
    P.show(menu, !!open);
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function goAssign() {
    if (!ticket) return;
    global.location.href = P.assignHref(ticket.id);
  }

  function goEdit() {
    if (!ticket) return;
    global.location.href = P.editHref(ticket.id);
  }

  async function deleteTicket() {
    if (!ticket || !ticket.id) return;
    var ok = global.confirm(tr('confirm_delete_ticket'));
    if (!ok) return;
    var errEl = $('tdFormError');
    try {
      if (errEl) {
        errEl.textContent = '';
        errEl.classList.add('hidden');
      }
      var res = await MineralBarApp.getClient().request('Ticket.Delete', {
        ticket_id: ticket.id,
        id: ticket.id
      });
      if (!res || !(Number(res.success) === 1 || res.success === true)) {
        throw new Error((res && (res.message || res.error)) || tr('err_failed'));
      }
      if (global.FieldApp && FieldApp.removeLiveTicket) {
        FieldApp.removeLiveTicket(ticket.id);
      }
      global.location.replace(P.scheduleHref());
    } catch (e) {
      if (errEl) {
        errEl.textContent = (e && e.message) || tr('err_failed');
        errEl.classList.remove('hidden');
      }
    }
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
      urgent: { key: 'prio_urgent', color: '#c0392b', bg: '#fbeeed', border: '#f0c4bf' },
      normal: { key: 'prio_normal', color: '#1d60a2', bg: '#eaf2fb', border: '#aecbe9' },
      low: { key: 'prio_low', color: '#5a6473', bg: '#f4f5f7', border: '#d8dde4' }
    };
    return map[key] || map.normal;
  }

  function callStatus(t) {
    var closed = isClosed(t);
    var raw = (t && t.raw) || {};
    var sid = Number(raw.status_id != null ? raw.status_id : raw.status);
    var key = 'toschedule';
    if (closed) key = 'done';
    else if (sid === 3 || raw.status === 3) key = 'inprogress';
    else if (sid === 2 || raw.ticket_from_time || raw.due_date) key = 'scheduled';
    var map = {
      toschedule: { key: 'call_status_toschedule', color: '#1d60a2', bg: '#eaf2fb' },
      scheduled: { key: 'call_status_scheduled', color: '#50439d', bg: '#eef0fb' },
      inprogress: { key: 'call_status_inprogress', color: '#bd8324', bg: '#fdf6e8' },
      done: { key: 'call_status_done', color: '#2e8a63', bg: '#eafaf0' }
    };
    return map[key] || map.toschedule;
  }

  function closingStatusLabel(t) {
    var raw = P.labeledField(t, 'closing_status') || P.labeledField(t, 'Closing status');
    if (!raw) {
      var m = P.ticketNotesText(t).match(/Closing status:\s*([^\n]+)/i);
      if (m) raw = m[1];
    }
    raw = String(raw || '').trim();
    if (!raw) return '';
    var lower = raw.toLowerCase();
    var map = {
      done: tr('close_status_done'),
      followup: tr('close_status_followup'),
      noanswer: tr('close_status_noanswer'),
      notdone: tr('close_status_notdone'),
      lab: tr('close_status_lab')
    };
    if (map[lower]) return map[lower];
    if (/success|completed|הושלם/.test(lower)) return map.done;
    if (/follow|המשך/.test(lower)) return map.followup;
    if (/no.?answer|אין מענה/.test(lower)) return map.noanswer;
    if (/not.?perform|לא בוצע/.test(lower)) return map.notdone;
    if (/lab|מעבד/.test(lower)) return map.lab;
    return raw;
  }

  function problemText(t) {
    var raw = (t && t.raw) || {};
    var msgs = raw.messages;
    if (Array.isArray(msgs) && msgs.length) {
      var first = msgs[0] && (msgs[0].message || msgs[0].text || msgs[0]);
      var text = String(first || '').trim();
      if (text && text.indexOf('biz1upload/') !== 0 && text.indexOf('BIZ1_MEDIA:') !== 0) {
        return text.split('\n')[0];
      }
    }
    return t.subject || t.summary || '';
  }

  function photoItems(t) {
    var photos = ((t && t.photos) || []).slice();
    var seen = {};
    photos.forEach(function (p) {
      var key = (p && (p.dataUrl || p.url)) || '';
      if (key) seen[key] = true;
    });
    var raw = (t && t.raw) || {};
    var files = raw.files || raw.attachments || raw.ticket_files || [];
    if (!Array.isArray(files)) files = [];
    files.forEach(function (f) {
      var url = (global.FieldApp && FieldApp.resolveMediaUrl)
        ? FieldApp.resolveMediaUrl(f.file_url || f.url || f.path || f.file_path || '')
        : (f.file_url || f.url || '');
      if (!url || seen[url]) return;
      seen[url] = true;
      photos.push({
        url: url,
        dataUrl: url,
        kind: 'field',
        name: f.original_name || f.file_name || f.name || ''
      });
    });
    return photos.map(function (p, i) {
      var url = p.dataUrl || p.url || '';
      var kind = String(p.kind || '').toLowerCase();
      var label = p.name || '';
      if (kind === 'before') label = tr('before_photo');
      else if (kind === 'after') label = tr('after_photo');
      else if (!label || /^ticket-/i.test(label) || /\.(png|jpe?g|gif|webp)$/i.test(label)) {
        label = tr('photos') + ' ' + (i + 1);
      }
      return { url: url, label: label };
    }).filter(function (p) { return !!p.url; });
  }

  function openLightbox(url, caption) {
    var box = $('tdLightbox');
    var img = $('tdLightboxImg');
    var cap = $('tdLightboxCap');
    if (img) { img.src = url; img.alt = caption || ''; }
    if (cap) cap.textContent = caption || '';
    P.show(box, true);
  }

  function closeLightbox() {
    P.show($('tdLightbox'), false);
  }

  function paint() {
    if (!ticket) {
      P.show($('tdLoading'), false);
      P.show($('tdContent'), false);
      P.show($('tdMissing'), true);
      return;
    }
    P.show($('tdLoading'), false);
    P.show($('tdMissing'), false);
    P.show($('tdContent'), true);

    var raw = ticket.raw || {};
    var closed = isClosed(ticket);
    var name = (global.FieldApp && FieldApp.clientDisplay(ticket)) || ticket.client || tr('client');
    var days = P.waitDays(ticket);
    var waitText = days <= 0 ? tr('wait_today_short') : (days === 1 ? tr('wait_1_day') : tr('wait_n_days').replace('{n}', String(days)));
    var prio = prioMeta(ticket);
    var cs = callStatus(ticket);
    var tech = assignedName(ticket);
    var hasRep = !!tech && tech !== '—';

    $('tdCallId').textContent = '#' + (ticket.number || ticket.id);
    $('tdOpenedAge').textContent = days <= 0 ? tr('wait_today_short') : waitText;
    $('tdCallType').textContent = ticket.subject || tr('ticket_title');
    $('tdSource').textContent = ticket.email || ticket.phone || '—';

    var pill = $('tdCallStatusPill');
    var dot = $('tdCallStatusDot');
    $('tdCallStatusLabel').textContent = tr(cs.key);
    pill.style.background = cs.bg;
    pill.style.color = cs.color;
    if (dot) dot.style.background = cs.color;

    var prioCard = $('tdPrioCard');
    prioCard.style.background = prio.bg;
    prioCard.style.borderColor = prio.border;
    $('tdPrioLabel').style.color = prio.color;
    $('tdPrioValue').textContent = tr(prio.key);
    $('tdPrioValue').style.color = prio.color;
    prioCard.querySelector('svg').style.stroke = prio.color;

    $('tdWaitValue').textContent = waitText;
    $('tdWaitValue').style.color = prio.color;
    $('tdWaitIcon').style.stroke = prio.color;

    var stateLabel = closed ? tr('status_closed') : (hasRep ? tr('status_assigned') : tr('status_opened'));
    var stateColor = closed ? '#5a6473' : (hasRep ? '#2e8a63' : '#1d60a2');
    var stateBg = closed ? '#f4f5f7' : (hasRep ? '#eafaf0' : '#eaf2fb');
    var stateBorder = closed ? '#d8dde4' : (hasRep ? '#c2e6d1' : '#aecbe9');
    var stateCard = $('tdStateCard');
    stateCard.style.background = stateBg;
    stateCard.style.borderColor = stateBorder;
    $('tdStateLabel').style.color = stateColor;
    $('tdStateValue').textContent = stateLabel;
    $('tdStateValue').style.color = stateColor;

    var cashYes = false;
    if (global.MineralBarApp && MineralBarApp.isTicketCashYes) {
      cashYes = !!(MineralBarApp.isTicketCashYes(raw) || MineralBarApp.isTicketCashYes(ticket));
    }
    if (!cashYes) {
      cashYes = /yes|1|true/i.test(P.labeledField(ticket, 'cash_collected') || '') ||
        Number(raw.approved_by_customer) === 1;
    }
    var cashAmount = P.labeledField(ticket, 'cash_amount');
    if (!cashAmount) {
      var cashNotes = P.ticketNotesText(ticket);
      var amt = cashNotes.match(/(?:Service fee(?: amount)?|Cash amount|סכום דמי שירות)\s*[:：]\s*([0-9]+(?:\.[0-9]+)?)/i)
        || cashNotes.match(/Cash collected:\s*yes\s*[·•,]?\s*([0-9]+(?:\.[0-9]+)?)/i);
      if (amt && amt[1]) cashAmount = amt[1];
    }
    $('tdCashValue').textContent = cashYes ? tr('yes') : tr('no');
    var cashCard = $('tdCashCard');
    cashCard.style.background = cashYes ? '#e6f4ec' : '#f6f7f9';
    cashCard.style.borderColor = cashYes ? '#c2e6d1' : '#e2e6ec';
    $('tdCashTitle').style.color = cashYes ? '#2e8a63' : '#5a6473';
    $('tdCashValue').style.color = cashYes ? '#2e8a63' : '#5a6473';
    var cashAmtEl = $('tdCashAmount');
    if (cashYes && cashAmount) {
      cashAmtEl.textContent = cashAmount + ' ₪';
      cashAmtEl.style.color = '#2e8a63';
      P.show(cashAmtEl, true);
    } else {
      P.show(cashAmtEl, false);
    }

    var closeLabel = closingStatusLabel(ticket);
    var closeReason = String(
      ticket.completionReason ||
      (ticket.raw && (ticket.raw.completion_reason || ticket.raw.completionReason)) ||
      P.labeledField(ticket, 'completion_reason') ||
      P.labeledField(ticket, 'closing_reason') ||
      P.labeledField(ticket, 'Follow-up details') ||
      ''
    ).trim();
    var warranty = P.labeledField(ticket, 'warranty_months') || P.labeledField(ticket, 'Warranty months');
    var hasClosing = !!(closeLabel || closeReason || warranty);
    P.show($('tdClosingWrap'), hasClosing && closed);

    var titleEl = $('tdClosingTitle');
    if (titleEl) {
      if (closeReason && !closeLabel && !warranty) {
        titleEl.textContent = tr('completion_reason');
        titleEl.setAttribute('data-i18n', 'completion_reason');
      } else {
        titleEl.textContent = tr('closing_details');
        titleEl.setAttribute('data-i18n', 'closing_details');
      }
    }

    P.show($('tdClosingStatusBlock'), !!closeLabel);
    if (closeLabel) $('tdClosingStatus').textContent = closeLabel;

    P.show($('tdClosingReasonBlock'), !!closeReason);
    if (closeReason) $('tdClosingReason').textContent = closeReason;

    P.show($('tdWarrantyBlock'), !!warranty);
    if (warranty) $('tdWarranty').textContent = warranty;

    // Separators only between visible closing rows
    var closingRows = [$('tdClosingStatusBlock'), $('tdClosingReasonBlock'), $('tdWarrantyBlock')].filter(function (el) {
      return el && !el.classList.contains('hidden');
    });
    closingRows.forEach(function (el, idx) {
      if (idx === 0) {
        el.style.paddingTop = '0';
        el.style.marginTop = '0';
        el.style.borderTop = 'none';
      } else {
        el.style.paddingTop = '12px';
        el.style.marginTop = '12px';
        el.style.borderTop = '1px solid var(--border-row)';
      }
    });

    $('tdCustInitials').textContent = P.initials(name);
    $('tdCustName').textContent = name;
    $('tdCustAddress').textContent = localizeAddressText(ticket.address) || '—';

    $('tdProblem').textContent = problemText(ticket) || '—';
    var tags = $('tdTags');
    tags.innerHTML = '';
    [ticket.subject, tr('ticket_title')].filter(Boolean).slice(0, 2).forEach(function (label) {
      var span = global.document.createElement('span');
      span.className = 'td-tag';
      span.textContent = label;
      tags.appendChild(span);
    });

    var photos = photoItems(ticket);
    P.show($('tdPhotos'), photos.length > 0);
    P.show($('tdNoPhotos'), photos.length === 0);
    $('tdPhotoCount').textContent = photos.length
      ? (photos.length + ' ' + tr('photos'))
      : tr('none_label');
    var photosRoot = $('tdPhotos');
    photosRoot.innerHTML = '';
    photos.forEach(function (ph) {
      var btn = global.document.createElement('button');
      btn.type = 'button';
      btn.className = 'td-photo';
      btn.innerHTML = '<img alt=""><span class="td-photo-cap"></span>';
      btn.querySelector('img').src = ph.url;
      btn.querySelector('img').alt = ph.label;
      btn.querySelector('.td-photo-cap').textContent = ph.label;
      btn.addEventListener('click', function () { openLightbox(ph.url, ph.label); });
      photosRoot.appendChild(btn);
    });

    P.show($('tdRepWrap'), hasRep);
    if (hasRep) {
      $('tdRepInitials').textContent = P.initials(tech);
      $('tdRepName').textContent = tech;
    }
    $('tdTechName').textContent = tech || '—';
    $('tdCreatedAt').textContent = P.formatDateTime(raw.open_date || ticket.dateAt) || '—';
    var due = raw.due_date;
    P.show($('tdScheduledRow'), !!due);
    if (due) {
      var scheduled = P.formatDateTime(due);
      var from = raw.ticket_from_time ? String(raw.ticket_from_time).slice(0, 5) : '';
      var to = raw.ticket_to_time ? String(raw.ticket_to_time).slice(0, 5) : '';
      if (from) scheduled = String(scheduled).split(' · ')[0] + ' · ' + from + (to ? '–' + to : '');
      $('tdScheduledAt').textContent = scheduled;
    }
    var updater = raw.joined_update_user_name || raw.update_user_name || raw.updated_by || tech || '—';
    var updatedAt = P.formatDateTime(raw.update_date || raw.updated_at || raw.open_date || ticket.dateAt);
    $('tdUpdatedBy').textContent = updater + (updatedAt ? ' · ' + updatedAt : '');

    P.show($('tdBottom'), !closed);
    var closeBtn = $('tdCloseBtn');
    if (closeBtn) closeBtn.href = P.closeHref(ticket.id);

    var assignBtn = $('tdAssignBtn');
    var assignLabel = $('tdAssignBtnLabel');
    var assignMenuBtn = $('tdAssignMenuBtn');
    var assignKey = hasRep ? 'reassign_tech' : 'assign_tech';
    if (assignLabel) {
      assignLabel.setAttribute('data-i18n', assignKey);
      assignLabel.textContent = tr(assignKey);
    }
    if (assignMenuBtn) {
      assignMenuBtn.setAttribute('data-i18n', assignKey);
      assignMenuBtn.textContent = tr(assignKey);
    }
    P.show(assignBtn, !closed);

    var editBtn = $('tdEditBtn');
    var deleteBtn = $('tdDeleteBtn');
    var moreBtn = $('tdMoreBtn');
    P.show(editBtn, !closed);
    P.show(assignMenuBtn, !closed);
    P.show(deleteBtn, true);
    P.show(moreBtn, true);

    var nav = $('tdNavBtn');
    if (nav) {
      var href = navHref(ticket);
      P.show(nav, !!href);
      nav.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        openNavigate(href);
      };
    }
  }

  async function paintProducts() {
    var list = await linkedProducts(ticket || {});
    var card = $('tdProductCard');
    var empty = $('tdNoProduct');
    var addWrap = $('tdProductAddWrap');
    if (!list.length) {
      P.show(card, false);
      P.show(empty, true);
    } else {
      P.show(empty, false);
      P.show(card, true);
      card.innerHTML = list.map(function (p, idx) {
        var border = idx < list.length - 1
          ? 'margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border-row);'
          : '';
        return '<div class="td-product" style="' + border + '">' +
          '<div class="td-product-icon"><svg fill="none" height="22" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" viewBox="0 0 24 24" width="22"><path d="M3 4h18l-7 9v6l-4 2v-8z"></path></svg></div>' +
          '<div style="flex:1;min-width:0;"><div class="td-product-name"></div><div class="td-product-meta"></div></div></div>';
      }).join('');
      list.forEach(function (p, idx) {
        var row = card.children[idx];
        if (!row) return;
        row.querySelector('.td-product-name').textContent = p.name;
        row.querySelector('.td-product-meta').textContent = p.meta;
      });
    }
    if (addWrap) P.show(addWrap, !isClosed(ticket));
    fillProductSelect();
  }

  function fillProductSelect() {
    var sel = $('tdProductSelect');
    if (!sel) return;
    var linked = {};
    currentProductIds(ticket).forEach(function (id) { linked[id] = true; });
    var keep = tr('select_product');
    sel.innerHTML = '';
    var first = global.document.createElement('option');
    first.value = '';
    first.textContent = keep;
    sel.appendChild(first);
    productCatalog.forEach(function (p) {
      if (!p.id || linked[p.id]) return;
      var opt = global.document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name || ('#' + p.id);
      sel.appendChild(opt);
    });
  }

  async function loadProductCatalog() {
    if (!global.MineralBarApp) return;
    try {
      var prod = MineralBarApp.listAllProducts
        ? await MineralBarApp.listAllProducts({ active: 1 })
        : await MineralBarApp.listProducts({ active: 1, limit: 25, length: 25 });
      productCatalog = ((prod && prod.rows) || []).map(function (p) {
        return {
          id: String(p.id || p.product_id || ''),
          name: String(p.product_name || p.name || p.title || ('#' + (p.id || '')))
        };
      }).filter(function (p) { return !!p.id; });
    } catch (e) {
      console.warn('[ticket-details] products list failed', e);
      productCatalog = [];
    }
    fillProductSelect();
  }

  function showProductError(msg) {
    var el = $('tdProductAddError');
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.classList.remove('hidden');
    } else {
      el.textContent = '';
      el.classList.add('hidden');
    }
  }

  async function addProductToTicket() {
    if (!ticket || productBusy || isClosed(ticket)) return;
    var sel = $('tdProductSelect');
    var btn = $('tdProductAddBtn');
    var productId = sel ? String(sel.value || '').trim() : '';
    showProductError('');
    if (!productId) {
      showProductError(tr('err_select_product'));
      return;
    }
    var ids = currentProductIds(ticket);
    if (ids.indexOf(productId) === -1) ids.push(productId);
    productBusy = true;
    if (btn) {
      btn.disabled = true;
      btn.textContent = tr('loading');
    }
    try {
      var res = await MineralBarApp.getClient().request('Ticket.Edit', {
        ticket_id: ticket.id,
        id: ticket.id,
        product_id: ids.join(',')
      });
      if (!res || !(Number(res.success) === 1 || res.success === true)) {
        throw new Error((res && (res.message || res.error)) || tr('err_failed'));
      }
      if (FieldApp.upsertLiveTicket) {
        var raw = Object.assign({}, ticket.raw || {}, { product_id: ids.join(',') });
        ticket = FieldApp.upsertLiveTicket(Object.assign({}, ticket, {
          productIds: ids,
          raw: raw
        })) || Object.assign({}, ticket, { productIds: ids, raw: raw });
      } else {
        ticket.productIds = ids;
        ticket.raw = Object.assign({}, ticket.raw || {}, { product_id: ids.join(',') });
      }
      if (FieldApp.syncTicketById) {
        try {
          var synced = await FieldApp.syncTicketById(ticket.id);
          if (synced) ticket = synced;
        } catch (e2) { /* keep local */ }
      }
      await paintProducts();
    } catch (e) {
      showProductError((e && e.message) || tr('err_failed'));
    } finally {
      productBusy = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = tr('add');
      }
    }
  }

  function chatDirection(row) {
    var d = String((row && row.direction) || '').toLowerCase();
    if (d === 'out' || d === 'outgoing' || d === 'send' || d === 'sent') return 'out';
    if (d === 'in' || d === 'incoming' || d === 'receive' || d === 'received') return 'in';
    var who = String((row && row.who) || '').toLowerCase();
    if (who === 'agent' || who === 'user' || who === 'staff') return 'out';
    if (who === 'customer') return 'in';
    var type = String((row && row.type) || '').toLowerCase();
    if (/only_member|internal|agent|user|staff/.test(type)) return 'out';
    return 'in';
  }

  function paintChatMessages(rows) {
    var list = $('tdChatList');
    var empty = $('tdChatEmpty');
    if (!list) return;
    list.querySelectorAll('.td-chat-bubble').forEach(function (n) { n.remove(); });
    if (!rows || !rows.length) {
      P.show(empty, true);
      return;
    }
    P.show(empty, false);
    rows.forEach(function (row) {
      var dir = chatDirection(row);
      var bubble = global.document.createElement('div');
      bubble.className = 'td-chat-bubble td-chat-bubble--' + dir;
      var text = String((row && row.message) || '').trim() || '—';
      bubble.appendChild(global.document.createTextNode(text));
      if (row.file_url) {
        var link = global.document.createElement('a');
        link.href = row.file_url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.className = 'td-chat-meta';
        link.textContent = row.file_url.split('/').pop() || 'file';
        bubble.appendChild(link);
      }
      var metaBits = [];
      if (row.user_name) metaBits.push(String(row.user_name));
      if (row.time) metaBits.push(String(row.time));
      if (metaBits.length) {
        var meta = global.document.createElement('span');
        meta.className = 'td-chat-meta';
        meta.textContent = metaBits.join(' · ');
        bubble.appendChild(meta);
      }
      list.appendChild(bubble);
    });
    list.scrollTop = list.scrollHeight;
  }

  function showChatError(msg) {
    var el = $('tdChatError');
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.classList.remove('hidden');
    } else {
      el.textContent = '';
      el.classList.add('hidden');
    }
  }

  async function loadChat() {
    var list = $('tdChatList');
    var noCust = $('tdChatNoCustomer');
    var compose = $('tdChatCompose');
    showChatError('');
    if (!ticketId) {
      if (list) list.querySelectorAll('.td-chat-bubble').forEach(function (n) { n.remove(); });
      P.show($('tdChatEmpty'), false);
      P.show(noCust, true);
      if (compose) compose.classList.add('hidden');
      return;
    }
    P.show(noCust, false);
    if (compose) compose.classList.remove('hidden');
    if (!MineralBarApp.listTicketMessages) {
      paintChatMessages([]);
      return;
    }
    try {
      var res = await MineralBarApp.listTicketMessages(ticketId);
      paintChatMessages((res && res.rows) || []);
    } catch (e) {
      console.warn('[ticket-details] Ticket.Messages failed', e);
      paintChatMessages([]);
      showChatError((e && e.message) || tr('chat_send_failed'));
    }
  }

  async function sendChatMessage() {
    if (!ticket || chatBusy || !ticketId) return;
    var input = $('tdChatInput');
    var btn = $('tdChatSend');
    var msg = input ? String(input.value || '').trim() : '';
    showChatError('');
    if (!msg) return;
    if (!MineralBarApp.replyTicketMessage) {
      showChatError(tr('chat_send_failed'));
      return;
    }
    chatBusy = true;
    if (btn) btn.disabled = true;
    if (input) input.disabled = true;
    try {
      await MineralBarApp.replyTicketMessage({
        ticket_id: ticketId,
        message: msg,
        data_type: 'public'
      });
      if (input) input.value = '';
      await loadChat();
    } catch (e) {
      showChatError((e && e.message) || tr('chat_send_failed'));
    } finally {
      chatBusy = false;
      if (btn) btn.disabled = false;
      if (input) {
        input.disabled = false;
        try { input.focus(); } catch (err) { /* ignore */ }
      }
    }
  }

  async function start() {
    ticketId = P.queryParam('id') || P.queryParam('ticket_id') || '';
    var ok = await P.bootAuthenticatedPage();
    if (!ok) return;
    if (global.MineralBarI18n && MineralBarI18n.apply) MineralBarI18n.apply();
    if (!ticketId) {
      P.show($('tdLoading'), false);
      P.show($('tdMissing'), true);
      return;
    }
    try {
      ticket = await P.loadTicket(ticketId);
    } catch (e) {
      console.warn('[ticket-details] load failed', e);
      ticket = null;
    }
    paint();
    if (ticket) {
      await loadProductCatalog();
      paintProducts().catch(function () {});
      loadChat().catch(function () {});
    }
  }

  function bind() {
    var back = $('tdBackBtn');
    if (back) {
      back.addEventListener('click', function (e) {
        e.preventDefault();
        global.location.href = P.scheduleHref();
      });
    }
    var moreBtn = $('tdMoreBtn');
    if (moreBtn) {
      moreBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var menu = $('tdMoreMenu');
        setMenuOpen(!(menu && !menu.classList.contains('hidden')));
      });
    }
    global.document.addEventListener('click', function () { setMenuOpen(false); });
    var moreMenu = $('tdMoreMenu');
    if (moreMenu) {
      moreMenu.addEventListener('click', function (e) { e.stopPropagation(); });
    }
    var editBtn = $('tdEditBtn');
    if (editBtn) {
      editBtn.addEventListener('click', function () {
        setMenuOpen(false);
        goEdit();
      });
    }
    var assignMenuBtn = $('tdAssignMenuBtn');
    if (assignMenuBtn) {
      assignMenuBtn.addEventListener('click', function () {
        setMenuOpen(false);
        goAssign();
      });
    }
    var deleteBtn = $('tdDeleteBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        setMenuOpen(false);
        deleteTicket();
      });
    }
    var assignBtn = $('tdAssignBtn');
    if (assignBtn) {
      assignBtn.addEventListener('click', function (e) {
        e.preventDefault();
        goAssign();
      });
    }
    var addProductBtn = $('tdProductAddBtn');
    if (addProductBtn) {
      addProductBtn.addEventListener('click', function () {
        addProductToTicket();
      });
    }
    var chatSend = $('tdChatSend');
    if (chatSend) {
      chatSend.addEventListener('click', function () { sendChatMessage(); });
    }
    var chatInput = $('tdChatInput');
    if (chatInput) {
      chatInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          sendChatMessage();
        }
      });
    }
    var box = $('tdLightbox');
    var closeBtn = $('tdLightboxClose');
    if (box) box.addEventListener('click', closeLightbox);
    if (closeBtn) closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      closeLightbox();
    });
    var img = $('tdLightboxImg');
    if (img) img.addEventListener('click', function (e) { e.stopPropagation(); });
    global.addEventListener('mineralbar:lang', function () {
      if (global.MineralBarI18n && MineralBarI18n.apply) MineralBarI18n.apply();
      paint();
      if (ticket) {
        paintProducts().catch(function () {});
        loadChat().catch(function () {});
      }
    });
  }

  function init() {
    if (!$('tdContent')) return;
    bind();
    start();
  }

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
