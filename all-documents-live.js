(function () {
  'use strict';

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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

  function formatAmount(v) {
    var n = Number(v);
    if (Number.isNaN(n)) return '-';
    var sign = n < 0 ? '-' : '';
    return sign + Math.abs(n).toFixed(0) + '₪';
  }

  function mapDocType(raw) {
    var t = String(raw.doc_type || raw.document_type || raw.type || raw.name || '').toLowerCase();
    if (/receipt|קבלה/.test(t)) return { type: 'Receipt', color: '#2e8a63', bg: '#eafaf0' };
    if (/credit|זיכוי/.test(t)) return { type: 'Credit note', color: '#c0392b', bg: '#fbeeed' };
    if (/quote|הצעת/.test(t)) return { type: 'Quote', color: '#50439d', bg: '#eef0fb' };
    if (/order|הזמנה/.test(t)) return { type: 'Order', color: '#bd8324', bg: '#fdf1dd' };
    return { type: 'Invoice', color: '#1d60a2', bg: '#eaf2fb' };
  }

  function mapStatus(raw) {
    var s = String(raw.status || raw.doc_status || raw.payment_status || '').toLowerCase();
    if (/paid|שולם|done|closed/.test(s)) return { label: 'Paid', color: '#1f9d55', bg: '#eafaf0' };
    if (/cancel|canceled|בוטל/.test(s)) return { label: 'Cancelled', color: '#b6bdc8', bg: '#f0f1f4' };
    return { label: 'Pending', color: '#bd8324', bg: '#fdf1dd' };
  }

  function rowHtml(doc) {
    var mt = mapDocType(doc);
    var st = mapStatus(doc);
    var num = doc.number || doc.doc_no || doc.document_no || doc.id || '-';
    var date = doc.date || doc.create_date || doc.created_at || '';
    var amount = formatAmount(doc.total || doc.amount || doc.price || doc.monthly_price || 0);
    return (
      '<div style="background:#fff; border-radius:16px; padding:13px 14px; margin-bottom:11px; box-shadow:0 1px 3px rgba(0,0,0,.05);">' +
      '<div style="display:flex; align-items:flex-start; gap:12px;">' +
      '<div style="width:44px; height:44px; border-radius:12px; background:' + mt.bg + '; color:' + mt.color + '; display:flex; align-items:center; justify-content:center; flex:none; font-size:12px; font-weight:800;">DOC</div>' +
      '<div style="flex:1; min-width:0;">' +
      '<div style="font-size:15px; font-weight:800; color:#1f2a3a;">' + esc(mt.type) + '</div>' +
      '<div style="font-size:12px; color:#9aa3b0; margin-top:2px;">#' + esc(num) + (date ? (' · ' + esc(date)) : '') + '</div>' +
      '</div>' +
      '<div style="text-align:left; flex:none;">' +
      '<div style="font-size:16px; font-weight:800; color:#1f2a3a;">' + esc(amount) + '</div>' +
      '<div style="display:inline-flex; align-items:center; gap:4px; margin-top:4px; background:' + st.bg + '; color:' + st.color + '; font-size:11px; font-weight:700; padding:3px 9px; border-radius:99px;">' +
      '<span style="width:6px; height:6px; border-radius:50%; background:' + st.color + ';"></span>' + esc(st.label) +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  function render(root, docs, customerName) {
    var listWrap = root.querySelector('div[style*="height:622px"][style*="overflow-y:auto"]');
    var subtitle = root.querySelector('div[style*="font-size:12.5px; color:#8a93a3; margin-top:1px;"]');
    if (subtitle) subtitle.textContent = (customerName || 'Customer') + ' · ' + docs.length + ' documents';
    if (!listWrap) return;
    if (!docs.length) {
      listWrap.innerHTML = '<div style="text-align:center;padding:48px 20px;color:#9aa3b0;"><div style="font-size:14px;font-weight:700;">No documents found</div></div>';
      return;
    }

    var chips = [
      { id: 'all', label: 'All' },
      { id: 'invoice', label: 'Invoices' },
      { id: 'receipt', label: 'Receipts' },
      { id: 'order', label: 'Orders' },
      { id: 'quote', label: 'Quotes' }
    ];

    function inferKind(d) {
      var t = String(d.doc_type || d.document_type || d.type || d.name || '').toLowerCase();
      if (/receipt|קבלה/.test(t)) return 'receipt';
      if (/quote|הצעת/.test(t)) return 'quote';
      if (/order|הזמנה/.test(t)) return 'order';
      if (/invoice|חשבונית|credit|זיכוי/.test(t)) return 'invoice';
      return 'invoice';
    }

    function paint(active) {
      var filtered = active === 'all' ? docs : docs.filter(function (d) { return inferKind(d) === active; });
      var html = '<div class="dc-scroll" style="display:flex; gap:8px; padding:4px 0 12px; overflow-x:auto; background:#eef0f3;">' +
        chips.map(function (c) {
          var on = c.id === active;
          return '<button data-doc-filter="' + c.id + '" style="flex:none; padding:8px 15px; border-radius:99px; font-size:13px; font-weight:' + (on ? '700' : '600') + '; cursor:pointer; white-space:nowrap; background:' + (on ? '#1d60a2' : '#fff') + '; color:' + (on ? '#fff' : '#5a6473') + '; border:1.4px solid ' + (on ? '#1d60a2' : '#e4e8ee') + ';">' + c.label + '</button>';
        }).join('') + '</div>' +
        filtered.map(rowHtml).join('');
      listWrap.innerHTML = html;
      Array.prototype.forEach.call(listWrap.querySelectorAll('button[data-doc-filter]'), function (btn) {
        btn.addEventListener('click', function () { paint(btn.getAttribute('data-doc-filter') || 'all'); });
      });
    }

    paint('all');
  }

  async function load() {
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated || !MineralBarApp.isAuthenticated()) return;
    var root = document.querySelector('x-dc') || document;
    var cid = getCustomerId();
    if (!cid) return;
    try {
      var customerName = '';
      if (MineralBarApp.getCustomer) {
        var cres = await MineralBarApp.getCustomer(cid).catch(function () { return null; });
        var c = cres && cres.customer;
        if (c && c.data && typeof c.data === 'object') c = c.data;
        customerName = c && c.name ? c.name : '';
      }
      var raw = await MineralBarApp.getClient().request('Documents.List', { customer_id: cid, length: 25, draw: 1, start: 0 });
      var docs = (raw && (raw.rows || raw.data || raw.output)) || [];
      render(root, docs, customerName);
    } catch (e) {
      console.warn('[all-documents-live] failed', e);
    }
  }

  window.addEventListener('mineralbar:ready', function () { setTimeout(load, 120); });
  window.addEventListener('mineralbar:page-refresh', function () { setTimeout(load, 200); });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(load, 250); });
  } else {
    setTimeout(load, 250);
  }
})();
