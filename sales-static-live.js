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
      var id = p.get('customer_id') || p.get('cust_id') || p.get('id') || '';
      if (id) return String(id);
      return sessionStorage.getItem('mb_customer_id') || localStorage.getItem('mb_customer_id') || '';
    } catch (e) {
      return '';
    }
  }

  function getRootPath() {
    return ((location.pathname || '').split('/').pop() || '').toLowerCase();
  }

  async function getCustomer() {
    var id = getCustomerId();
    if (!id || !window.MineralBarApp || typeof MineralBarApp.getCustomer !== 'function') return null;
    try {
      var res = await MineralBarApp.getCustomer(id);
      var c = (res && res.customer) || null;
      if (c && c.data && typeof c.data === 'object') c = c.data;
      return c;
    } catch (e) {
      return null;
    }
  }

  async function getDocuments(customer) {
    if (!window.MineralBarApp || !MineralBarApp.getClient) return [];
    try {
      var cid = (customer && (customer.customer_id || customer.id)) || getCustomerId();
      if (!cid) return [];
      var raw = await MineralBarApp.getClient().request('Documents.List', {
        customer_id: cid,
        length: 25,
        start: 0,
        draw: 1
      });
      return (raw && (raw.rows || raw.data || raw.output)) || [];
    } catch (e) {
      return [];
    }
  }

  function fmtCurrency(v) {
    var n = Number(v);
    if (Number.isNaN(n)) return '';
    return n.toFixed(0) + '₪';
  }

  function pickDocType(r) {
    var t = String(r.type || r.doc_type || r.document_type || r.name || '').toLowerCase();
    if (/receipt|קבלה/.test(t)) return 'Receipt';
    if (/credit|זיכוי/.test(t)) return 'Credit note';
    if (/quote|הצעת/.test(t)) return 'Quote';
    if (/order|הזמנה/.test(t)) return 'Order';
    return 'Invoice';
  }

  function renderAllDocuments(rows) {
    if (!rows.length) {
      return '<div style="text-align:center;padding:24px;color:#8a93a3;font-weight:700;">No documents found</div>';
    }
    return rows.slice(0, 25).map(function (r) {
      var type = pickDocType(r);
      var num = r.number || r.doc_no || r.id || '-';
      var date = r.date || r.create_date || r.created_at || '';
      var amount = fmtCurrency(r.total || r.amount || r.price || 0) || '-';
      return (
        '<div style="background:#fff;border-radius:14px;padding:12px 13px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,.05);">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">' +
        '<div style="font-size:14px;font-weight:800;color:#1f2a3a;">' + esc(type) + '</div>' +
        '<div style="font-size:15px;font-weight:800;color:#1f2a3a;">' + esc(amount) + '</div>' +
        '</div>' +
        '<div style="margin-top:5px;font-size:12px;color:#8a93a3;">#' + esc(num) + (date ? (' · ' + esc(date)) : '') + '</div>' +
        '</div>'
      );
    }).join('');
  }

  async function hydrateAllDocumentsPage() {
    var customer = await getCustomer();
    var rows = await getDocuments(customer);
    var subtitle = document.querySelector('div[style*="font-size:12.5px; color:#8a93a3; margin-top:1px;"]');
    if (subtitle && customer) {
      subtitle.textContent = (customer.name || 'Customer') + ' · ' + rows.length + ' documents';
    }
    var listWrap = document.querySelector('div[style*="height:622px"][style*="overflow-y:auto"]');
    if (listWrap) listWrap.innerHTML = renderAllDocuments(rows);
  }

  async function hydratePriceQuotesPage() {
    if (!window.MineralBarApp || typeof MineralBarApp.listMissions !== 'function') return;
    try {
      var res = await MineralBarApp.listMissions({ length: 25, start: 0, draw: 1 });
      var rows = res.rows || [];
      var open = rows.filter(function (m) { return !(m.is_done || Number(m.done) === 1); });
      var done = rows.filter(function (m) { return (m.is_done || Number(m.done) === 1); });
      var statNodes = document.querySelectorAll('div[style*="font-size:24px; font-weight:800;"]');
      if (statNodes[0]) statNodes[0].textContent = String(open.length);
      if (statNodes[1]) statNodes[1].textContent = String(done.length);
      if (statNodes[2]) statNodes[2].textContent = String(Math.max(0, rows.length - open.length - done.length));

      var container = document.querySelector('div[style*="height:686px"][style*="overflow-y:auto"]');
      if (!container) return;
      var cards = open.slice(0, 10).map(function (m) {
        var cid = m.customer_id || '';
        var href = 'final-quote.html' + (cid ? ('?customer_id=' + encodeURIComponent(cid)) : '');
        return (
          '<div style="background:#fff;border-radius:14px;padding:12px;margin-bottom:10px;border-right:4px solid #e0a13c;">' +
          '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">' +
          '<div style="font-size:15px;font-weight:800;color:#1f2a3a;">' + esc(m.customer_name || m.name || ('Customer #' + (cid || ''))) + '</div>' +
          '<div style="font-size:11px;color:#bd8324;font-weight:700;">Awaiting</div>' +
          '</div>' +
          '<div style="margin-top:6px;font-size:12px;color:#7b8595;">' + esc(m.mission || m.title || 'Quote follow-up') + '</div>' +
          '<a href="' + href + '" style="display:inline-block;margin-top:8px;font-size:12px;color:#1d60a2;font-weight:700;text-decoration:none;">Open quote</a>' +
          '</div>'
        );
      }).join('');
      if (cards) {
        container.innerHTML = container.innerHTML.replace(/<div style="font-size:14px; font-weight:800; color:#6a7382; margin:0 2px 10px; text-align:left;">Awaiting signature<\/div>[\s\S]*/,'<div style="font-size:14px; font-weight:800; color:#6a7382; margin:0 2px 10px; text-align:left;">Awaiting signature</div>' + cards);
      }
    } catch (e) {
      /* ignore */
    }
  }

  async function hydrateOrderPages() {
    var customer = await getCustomer();
    if (!customer) return;
    var nameNodes = Array.prototype.slice.call(document.querySelectorAll('div,span')).filter(function (n) {
      var t = (n.textContent || '').trim();
      return t === 'Moshe Cohen' || t === 'משה כהן';
    });
    nameNodes.forEach(function (n) { n.textContent = customer.name || n.textContent; });
    var phone = customer.phone || customer.mobile || '';
    if (phone) {
      var phoneNodes = Array.prototype.slice.call(document.querySelectorAll('div,span')).filter(function (n) {
        return /050-1234567/.test((n.textContent || '').trim());
      });
      phoneNodes.forEach(function (n) { n.textContent = phone; });
    }
  }

  function hydrateAddNotePage() {
    var p = new URLSearchParams(location.search || '');
    var name = p.get('name') || '';
    var phone = p.get('phone') || '';
    if (!name && !phone) return;
    var nodes = document.querySelectorAll('div');
    nodes.forEach(function (n) {
      if (name && (n.textContent || '').trim() === 'Moshe Cohen') n.textContent = name;
      if (phone && (n.textContent || '').trim() === '050-1234567') n.textContent = phone;
    });
  }

  async function hydrateSalesCallEndPage() {
    var p = new URLSearchParams(location.search || '');
    var name = p.get('name') || '';
    var phone = p.get('phone') || '';
    var nodes = document.querySelectorAll('div,span');
    nodes.forEach(function (n) {
      var t = (n.textContent || '').trim();
      if (name && t === 'Moshe Cohen') n.textContent = name;
      if (phone && t === '050-1234567') n.textContent = phone;
    });
  }

  async function run() {
    if (!window.MineralBarApp || typeof MineralBarApp.isAuthenticated !== 'function' || !MineralBarApp.isAuthenticated()) return;
    var page = getRootPath();
    if (page === 'all-documents.html') return hydrateAllDocumentsPage();
    if (page === 'price-quotes.html') return hydratePriceQuotesPage();
    if (page === 'order-document.html' || page === 'order-confirmation.html' || page === 'final-quote.html') return hydrateOrderPages();
    if (page === 'add-note.html') return hydrateAddNotePage();
    if (page === 'sales-call-end.html') return hydrateSalesCallEndPage();
  }

  window.addEventListener('mineralbar:ready', function () {
    setTimeout(run, 120);
  });
  window.addEventListener('mineralbar:page-refresh', function () {
    setTimeout(run, 120);
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(run, 250); });
  } else {
    setTimeout(run, 250);
  }
})();
