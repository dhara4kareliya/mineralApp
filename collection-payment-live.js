(function () {
  'use strict';

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function num(v) {
    var n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }

  function getCustomerId() {
    try {
      var p = new URLSearchParams(location.search || '');
      return p.get('customer_id') || p.get('cust_id') || p.get('id') ||
        sessionStorage.getItem('mb_customer_id') || localStorage.getItem('mb_customer_id') || '';
    } catch (e) {
      return '';
    }
  }

  function getRoot() {
    return document.querySelector('.gv-scroll');
  }

  function docLabel(d) {
    var no = d.number || d.doc_no || d.id || '-';
    var t = d.type || d.doc_type || d.document_type || 'Document';
    var amt = num(d.total || d.amount || d.price || 0);
    return '#' + no + ' · ' + t + (amt ? (' · ' + amt.toFixed(0) + '₪') : '');
  }

  function methodButton(id, label, active) {
    return (
      '<button type="button" data-pay-method="' + id + '" style="padding:10px 14px; border-radius:7px; border:1px solid ' + (active ? '#16223a' : '#dfe4ec') + '; background:' + (active ? '#16223a' : '#fff') + '; color:' + (active ? '#fff' : '#1f2a3a') + '; font-size:13px; font-weight:700; cursor:pointer; min-width:120px; text-align:left;">' +
      esc(label) + '</button>'
    );
  }

  function formByMethod(method) {
    if (method === 'card') {
      return (
        '<div style="margin-top:10px;">' +
        '<div style="display:flex; gap:10px; margin-bottom:10px;"><button type="button" style="padding:8px 12px; border:1px solid #d6dde8; border-radius:6px; background:#1f2a3a; color:#fff; font-weight:700; font-size:12px;">Add New Card</button><button type="button" style="padding:8px 12px; border:1px solid #d6dde8; border-radius:6px; background:#fff; color:#1f2a3a; font-weight:700; font-size:12px;">Use Saved Card</button></div>' +
        '<div style="font-weight:700; color:#1f2a3a; margin-bottom:6px;">Credit Card Details</div>' +
        '<div style="display:grid; grid-template-columns:1fr 1fr 120px 120px; gap:10px; margin-bottom:10px;">' +
        '<input id="mb-pay-card-holder" placeholder="Credit Card Holder" style="padding:8px 0;border:none;border-bottom:1px solid #d9deea;outline:none;">' +
        '<input id="mb-pay-card-number" placeholder="Credit Card Number" style="padding:8px 0;border:none;border-bottom:1px solid #d9deea;outline:none;">' +
        '<input id="mb-pay-card-exp" placeholder="dd/yy" style="padding:8px 0;border:none;border-bottom:1px solid #d9deea;outline:none;">' +
        '<input id="mb-pay-card-cvv" placeholder="CVV" style="padding:8px 0;border:none;border-bottom:1px solid #d9deea;outline:none;">' +
        '</div>' +
        '<div style="margin-bottom:10px;"><label style="font-weight:700; color:#1f2a3a;">Payment Type</label><div><select id="mb-pay-type" style="margin-top:6px; padding:6px 8px; border:1px solid #d9deea; border-radius:6px;"><option>Regular</option><option>Installments</option></select></div></div>' +
        '</div>'
      );
    }
    if (method === 'check') {
      return (
        '<div style="margin-top:10px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">' +
        '<input id="mb-check-bank" placeholder="Bank" style="padding:8px;border:1px solid #d9deea;border-radius:6px;">' +
        '<input id="mb-check-number" placeholder="Check number" style="padding:8px;border:1px solid #d9deea;border-radius:6px;">' +
        '<input id="mb-check-amount" placeholder="Amount" style="padding:8px;border:1px solid #d9deea;border-radius:6px;">' +
        '</div>'
      );
    }
    if (method === 'transfer' || method === 'masav') {
      return (
        '<div style="margin-top:10px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">' +
        '<input id="mb-transfer-bank" placeholder="Bank" style="padding:8px;border:1px solid #d9deea;border-radius:6px;">' +
        '<input id="mb-transfer-branch" placeholder="Branch" style="padding:8px;border:1px solid #d9deea;border-radius:6px;">' +
        '<input id="mb-transfer-account" placeholder="Account" style="padding:8px;border:1px solid #d9deea;border-radius:6px;">' +
        '</div>'
      );
    }
    if (method === 'bit') {
      return '<div style="margin-top:10px;"><input id="mb-bit-phone" placeholder="Bit phone number" style="width:280px; max-width:100%; padding:8px;border:1px solid #d9deea;border-radius:6px;"></div>';
    }
    return '<div style="margin-top:10px; color:#6b7585;">Cash collection selected.</div>';
  }

  function buildHtml(state) {
    var methods = [
      ['card', 'Credit card'],
      ['cash', 'Cash'],
      ['check', 'Check'],
      ['transfer', 'Transfer'],
      ['masav', 'Masav'],
      ['bit', 'Bit']
    ];

    return (
      '<div style="padding:16px 18px 22px;">' +
      '<div style="display:grid; grid-template-columns:1fr 280px; gap:14px; align-items:start;">' +
      '<div>' +
      '<div style="font-size:24px; font-weight:800; color:#1f2a3a; margin-bottom:6px;">Paying for <a href="#" id="mb-doc-picker" style="font-size:16px; font-weight:600; color:#3a5ebf; margin-right:8px;">Choose Document</a></div>' +
      '</div>' +
      '<div style="border-left:1px solid #e8ebf0; padding-left:12px;">' +
      '<div style="font-size:12px; color:#6f7786;">OR</div>' +
      '<div style="font-size:12px; color:#6f7786; margin-top:6px;">Insert Amount</div>' +
      '<input id="mb-amount" value="' + esc(state.amount) + '" style="width:100px;padding:4px 0;border:none;border-bottom:1px solid #d9deea;outline:none;font-weight:700;">' +
      '<div style="font-size:12px; color:#6f7786; margin-top:8px;">Currency</div><div style="font-size:12px; color:#1f2a3a; font-weight:700;">₪</div>' +
      '</div>' +
      '</div>' +

      '<div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:12px; margin-top:18px;">' +
      '<div><div style="font-size:13px;color:#6f7786;">Payment details</div><div style="margin-top:6px;border-bottom:1px solid #d9deea;color:#1f2a3a;padding-bottom:3px;">' + esc(state.company) + '</div></div>' +
      '<div><div style="height:20px;"></div><select id="mb-gateway" style="width:100%;border:none;border-bottom:1px solid #d9deea;padding-bottom:3px;background:#fff;"><option>Select Gateway</option><option>Meshulam</option><option>Hyp</option></select></div>' +
      '<div><div style="height:20px;"></div><select id="mb-project" style="width:100%;border:none;border-bottom:1px solid #d9deea;padding-bottom:3px;background:#fff;"><option>Project</option><option>Default</option></select></div>' +
      '<div><div style="font-size:13px;color:#6f7786;">Language</div><select id="mb-language" style="width:100%;border:none;border-bottom:1px solid #d9deea;padding-bottom:3px;background:#fff;"><option>English</option><option>עברית</option></select></div>' +
      '</div>' +

      '<div style="margin-top:16px; font-size:28px; color:#1f2a3a; font-weight:700;">Payment Method*</div>' +
      '<div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;">' +
      methods.map(function (m) { return methodButton(m[0], m[1], state.method === m[0]); }).join('') +
      '<button type="button" style="padding:8px 12px; border-radius:6px; border:1px solid #dfe4ec; background:#fff; color:#1f2a3a; font-weight:700;">Pay by credit</button>' +
      '</div>' +

      '<div style="margin-top:18px; font-size:30px; color:#1f2a3a; font-weight:700;">Amount <span style="font-size:24px;">' + esc(state.amount) + '</span></div>' +
      formByMethod(state.method) +

      '<div style="margin-top:16px; border-top:1px solid #eceff4; padding-top:14px; position:relative;">' +
      '<button type="button" style="position:absolute; right:0; top:14px; background:#163553; color:#fff; border:none; border-radius:12px; padding:6px 10px; font-size:12px; font-weight:700;">+ Add payment gate</button>' +
      '<div style="margin-bottom:10px;"><div style="font-size:28px; font-weight:700; color:#1f2a3a;">Internal payment notes</div><textarea id="mb-note-internal" placeholder="Note" style="width:100%;max-width:520px;height:36px;padding:8px;border:1px solid #e3e7ee;border-radius:6px;"></textarea></div>' +
      '<div style="margin-bottom:10px;"><div style="font-size:28px; font-weight:700; color:#1f2a3a;">Notes For Header</div><textarea id="mb-note-header" placeholder="Note" style="width:100%;max-width:520px;height:36px;padding:8px;border:1px solid #e3e7ee;border-radius:6px;"></textarea></div>' +
      '<div style="margin-bottom:8px;"><div style="font-size:28px; font-weight:700; color:#1f2a3a;">Notes For Footer</div><textarea id="mb-note-footer" placeholder="Note" style="width:100%;max-width:520px;height:36px;padding:8px;border:1px solid #e3e7ee;border-radius:6px;"></textarea></div>' +
      '<div style="display:flex; gap:12px; margin:8px 0 16px;"><label><input type="checkbox" id="mb-send-mail">Send by mail</label><label><input type="checkbox" id="mb-send-wa">Send by whatsapp</label></div>' +
      '</div>' +

      '<div style="background:#f8fafc; border:1px solid #e8ecf2; border-radius:8px; padding:10px;">' +
      '<div style="font-size:26px; font-weight:700; color:#2f4f8c;">Receipt Details</div>' +
      '<div style="margin-top:8px; display:grid; grid-template-columns:160px 1fr 1fr 1fr 1fr; gap:12px; align-items:end;">' +
      '<div><div style="font-size:13px;color:#6f7786;">password</div><input id="mb-passcode" value="000000" style="width:100%;padding:6px 0;border:none;border-bottom:1px solid #d9deea;outline:none;"></div>' +
      '<div><div style="font-size:13px;color:#6f7786;">Client name</div><div style="padding:6px 0;border-bottom:1px solid #d9deea;">' + esc(state.customerName) + '</div></div>' +
      '<div><div style="font-size:13px;color:#6f7786;">Email</div><div style="padding:6px 0;border-bottom:1px solid #d9deea;">' + esc(state.email) + '</div></div>' +
      '<div><div style="font-size:13px;color:#6f7786;">Mobile</div><div style="padding:6px 0;border-bottom:1px solid #d9deea;">' + esc(state.mobile) + '</div></div>' +
      '<div><div style="font-size:13px;color:#6f7786;">phone</div><div style="padding:6px 0;border-bottom:1px solid #d9deea;">' + esc(state.mobile) + '</div></div>' +
      '</div>' +
      '<div style="margin-top:8px; display:grid; grid-template-columns:160px 1fr; gap:12px;">' +
      '<div><div style="font-size:13px;color:#6f7786;">#Company ID</div><div style="padding:6px 0;border-bottom:1px solid #d9deea;color:#8b94a3;">#Company ID</div></div>' +
      '<div><div style="font-size:13px;color:#6f7786;">Address</div><div style="padding:6px 0;border-bottom:1px solid #d9deea;">' + esc(state.address) + '</div></div>' +
      '</div>' +
      '</div>' +

      '<div style="display:flex; justify-content:flex-end; margin-top:10px;">' +
      '<button id="mb-submit-payment" type="button" style="background:#163553; color:#fff; border:none; border-radius:4px; padding:10px 16px; font-weight:700; cursor:pointer;">Create receipt</button>' +
      '</div>' +
      '<div id="mb-payment-msg" style="margin-top:8px; font-size:13px; color:#5a6473;"></div>' +
      '</div>'
    );
  }

  function gatherPayload(state) {
    var amountEl = document.getElementById('mb-amount');
    var amount = num(amountEl && amountEl.value);
    var payload = {
      route_source: 'collection-payment-live',
      method: state.method,
      amount: amount,
      customer_id: state.customerId,
      note_internal: (document.getElementById('mb-note-internal') || {}).value || '',
      note_header: (document.getElementById('mb-note-header') || {}).value || '',
      note_footer: (document.getElementById('mb-note-footer') || {}).value || '',
      send_mail: (document.getElementById('mb-send-mail') || {}).checked ? 1 : 0,
      send_whatsapp: (document.getElementById('mb-send-wa') || {}).checked ? 1 : 0
    };
    if (state.method === 'card') {
      payload.card_holder = (document.getElementById('mb-pay-card-holder') || {}).value || '';
      payload.card_number = (document.getElementById('mb-pay-card-number') || {}).value || '';
      payload.card_exp = (document.getElementById('mb-pay-card-exp') || {}).value || '';
      payload.card_cvv = (document.getElementById('mb-pay-card-cvv') || {}).value || '';
    }
    if (state.method === 'check') {
      payload.check_bank = (document.getElementById('mb-check-bank') || {}).value || '';
      payload.check_number = (document.getElementById('mb-check-number') || {}).value || '';
      payload.check_amount = (document.getElementById('mb-check-amount') || {}).value || '';
    }
    if (state.method === 'transfer' || state.method === 'masav') {
      payload.transfer_bank = (document.getElementById('mb-transfer-bank') || {}).value || '';
      payload.transfer_branch = (document.getElementById('mb-transfer-branch') || {}).value || '';
      payload.transfer_account = (document.getElementById('mb-transfer-account') || {}).value || '';
    }
    if (state.method === 'bit') {
      payload.bit_phone = (document.getElementById('mb-bit-phone') || {}).value || '';
    }
    return payload;
  }

  function bindInteractions(state) {
    var root = getRoot();
    if (!root) return;

    Array.prototype.forEach.call(root.querySelectorAll('button[data-pay-method]'), function (btn) {
      btn.addEventListener('click', function () {
        state.method = btn.getAttribute('data-pay-method') || 'card';
        root.innerHTML = buildHtml(state);
        bindInteractions(state);
      });
    });

    var amountEl = document.getElementById('mb-amount');
    if (amountEl) {
      amountEl.addEventListener('input', function () {
        state.amount = amountEl.value || '0';
      });
    }

    var docBtn = document.getElementById('mb-doc-picker');
    if (docBtn) {
      docBtn.addEventListener('click', function (e) {
        e.preventDefault();
        var select = document.getElementById('mb-doc-select');
        if (select) select.focus();
      });
    }

    var submit = document.getElementById('mb-submit-payment');
    if (submit) {
      submit.addEventListener('click', async function () {
        var msg = document.getElementById('mb-payment-msg');
        if (msg) msg.textContent = 'Submitting...';
        try {
          var payload = gatherPayload(state);
          var res = await MineralBarApp.getClient().request('Settings.SaveCard', payload);
          if (msg) msg.textContent = (res && (res.message || res.status_text)) || 'Receipt created successfully.';
        } catch (err) {
          if (msg) msg.textContent = 'Submit failed: ' + ((err && err.message) || 'unknown error');
        }
      });
    }
  }

  async function load() {
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated || !MineralBarApp.isAuthenticated()) return;
    var root = getRoot();
    if (!root) return;

    var cid = getCustomerId();
    var customer = null;
    var docs = [];
    try {
      if (cid) {
        var cres = await MineralBarApp.getCustomer(cid).catch(function () { return null; });
        customer = cres && cres.customer;
        if (customer && customer.data && typeof customer.data === 'object') customer = customer.data;
      }
      if (cid) {
        var dres = await MineralBarApp.getClient().request('Documents.List', { customer_id: cid, length: 25, start: 0, draw: 1 }).catch(function () { return null; });
        docs = (dres && (dres.rows || dres.data || dres.output)) || [];
      }
    } catch (e) {
      /* ignore */
    }

    var state = {
      customerId: cid || '',
      customerName: (customer && customer.name) || 'Client',
      email: (customer && customer.email) || 'audit@example.com',
      mobile: (customer && (customer.mobile || customer.phone)) || '',
      address: (customer && ((customer.address || '') + ((customer.city || customer.city_name) ? (' ' + (customer.city || customer.city_name)) : '')).trim()) || '',
      company: 'demo company',
      method: 'card',
      amount: String(num((docs[0] && (docs[0].total || docs[0].amount || docs[0].price)) || 0))
    };

    root.innerHTML = buildHtml(state);

    // inject document selector right after choose link
    var titleLine = root.querySelector('div[style*="Paying for"]');
    if (titleLine) {
      var selectHtml = '<select id="mb-doc-select" style="margin-left:10px; padding:4px 6px; border:1px solid #d9deea; border-radius:4px; max-width:320px;">' +
        (docs.length ? docs.map(function (d, i) {
          return '<option value="' + esc(i) + '">' + esc(docLabel(d)) + '</option>';
        }).join('') : '<option value="">No documents found</option>') +
        '</select>';
      titleLine.insertAdjacentHTML('beforeend', selectHtml);
      var select = document.getElementById('mb-doc-select');
      if (select) {
        select.addEventListener('change', function () {
          var i = Number(select.value);
          var d = docs[i];
          if (!d) return;
          state.amount = String(num(d.total || d.amount || d.price || 0));
          var amountEl = document.getElementById('mb-amount');
          if (amountEl) amountEl.value = state.amount;
        });
      }
    }

    bindInteractions(state);
  }

  window.addEventListener('mineralbar:ready', function () { setTimeout(load, 120); });
  window.addEventListener('mineralbar:page-refresh', function () { setTimeout(load, 200); });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(load, 300); });
  } else {
    setTimeout(load, 300);
  }
})();
