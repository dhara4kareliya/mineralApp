(function () {
  'use strict';

  var PAGE_SIZE = 10;

  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function tt(k) {
    return (window.t && window.t(k)) || k;
  }

  function initCRM() {
    var crmBtn = document.getElementById('crm-info-btn');
    var closeBtn = document.getElementById('close-crm-btn');
    var overlay = document.getElementById('crm-overlay');
    var backdrop = document.getElementById('crm-backdrop');
    var sheet = document.getElementById('crm-sheet-content');
    var contentArea = document.getElementById('crm-content-area');

    if (!crmBtn || !overlay) return;

    var isOpen = false;
    var crmData = null;
    var pageState = { tasks: 1, invoices: 1, orders: 1 };

    function openCRM() {
      isOpen = true;
      overlay.style.display = 'block';
      overlay.classList.add('is-open');
      void overlay.offsetWidth;
      backdrop.style.opacity = '0.45';
      sheet.classList.add('open');
      loadCRMData();
    }

    function closeCRM() {
      isOpen = false;
      backdrop.style.opacity = '0';
      sheet.classList.remove('open');
      overlay.classList.remove('is-open');
      setTimeout(function () {
        if (!isOpen) overlay.style.display = 'none';
      }, 300);
    }

    crmBtn.addEventListener('click', openCRM);
    closeBtn.addEventListener('click', closeCRM);
    backdrop.addEventListener('click', closeCRM);

    contentArea.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-crm-page]');
      if (!btn || btn.disabled) return;
      var key = btn.getAttribute('data-crm-section');
      var page = Number(btn.getAttribute('data-crm-page'));
      if (!key || !page || !crmData) return;
      pageState[key] = page;
      renderCRMData(crmData.profile, crmData.orders, crmData.invoices, crmData.tasks);
    });

    async function loadCRMData() {
      var App = window.Biz1App || window.MineralBarApp;
      if (!App || !App.isAuthenticated()) {
        contentArea.innerHTML = '<div style="text-align:center; padding: 20px; color:#c0392b;">' + tt('crm_login_required') + '</div>';
        return;
      }

      var q = new URLSearchParams(window.location.search);
      var customerId = q.get('customer_id') || q.get('cust_id');
      if (window.MineralBarChat && MineralBarChat.getCurrentParams) {
        var cur = MineralBarChat.getCurrentParams();
        if (cur && cur.customer_id) customerId = cur.customer_id;
      }

      if (!customerId) {
        contentArea.innerHTML = '<div style="text-align:center; padding: 20px; color:#7b8595;">' + tt('crm_no_customer') + '</div>';
        return;
      }

      contentArea.innerHTML = '<div style="text-align:center; padding: 20px;"><span style="font-size:14px; color:#7b8595;">' + tt('loading_data') + '</span></div>';
      pageState = { tasks: 1, invoices: 1, orders: 1 };

      try {
        function isOpenTask(t) {
          return !(t.is_done || Number(t.done) === 1 || t.status === 'completed' || t.status === 'done');
        }

        // Profile first — BusinessList needs customer_id and can also use phone/email.
        var profileRes = await App.getCustomer(customerId).catch(function () { return {}; });
        var profile = (profileRes && profileRes.customer) || profileRes || {};
        var phone = profile.phone || profile.mobile || '';
        var email = profile.email || '';

        // Routes:
        // - Pending invoices → Documents.BusinessList (type=invoice|receipt_tax_invoice|…)
        // - Order history    → Documents.BusinessList (type=order_proposals|purchase_orders)
        // Fallback: Documents.List with the same type filters.
        var [ordersResult, invoicesResult, missionsResult] = await Promise.all([
          App.listCustomerOrders({
            customer_id: customerId,
            cust_id: customerId,
            phone: phone || undefined,
            email: email || undefined,
            length: 100
          }).catch(function () { return { rows: [] }; }),
          App.listCustomerInvoices({
            customer_id: customerId,
            cust_id: customerId,
            phone: phone || undefined,
            email: email || undefined,
            length: 100
          }).catch(function () { return { rows: [] }; }),
          App.listMissions({
            customer_id: customerId,
            cust_id: customerId,
            type: 'show_all_together_tasks',
            show_done_mission: 0,
            length: 100,
            start: 0,
            draw: 1
          }).catch(function () { return { rows: [] }; })
        ]);

        var orders = (ordersResult && ordersResult.rows) || [];
        var invoices = (invoicesResult && invoicesResult.rows) || [];

        var profileName = String(profile.name || '').trim().toLowerCase();
        var allTasks = (missionsResult && missionsResult.rows) || [];
        var tasks = allTasks.filter(function (t) {
          if (!isOpenTask(t)) return false;
          var cid = t.customer_id != null ? t.customer_id
            : (t.cust_id != null ? t.cust_id : (t.client_id != null ? t.client_id : null));
          if (cid != null && cid !== '' && cid !== '0') return String(cid) === String(customerId);
          var cname = String(t.customer_name || t.client_name || '').trim().toLowerCase();
          if (cname && profileName) {
            return cname === profileName || cname.indexOf(profileName) !== -1 || profileName.indexOf(cname) !== -1;
          }
          return true;
        });

        crmData = { profile: profile, orders: orders, invoices: invoices, tasks: tasks };
        renderCRMData(profile, orders, invoices, tasks);
      } catch (err) {
        console.error('Error loading CRM data:', err);
        contentArea.innerHTML = '<div style="text-align:center; padding: 20px; color:#c0392b;">' + tt('crm_load_failed') + '</div>';
      }
    }

    function renderCRMData(profile, orders, invoices, tasks) {
      var html = '';
      var phone = profile.phone || profile.mobile || '';

      html += '<div style="margin-bottom:20px;">';
      html += '<div style="font-size:16px; font-weight:800; color:#1f2a3a;">' + esc(profile.name || 'Unknown Customer') + '</div>';
      if (profile.email) html += '<div style="font-size:14px; color:#5a6473; margin-top:2px;">' + esc(profile.email) + '</div>';
      if (phone) html += '<div style="font-size:14px; color:#5a6473; margin-top:2px;">' + esc(phone) + '</div>';
      html += '</div>';

      html += renderSection('tasks', tt('open_tasks'), tasks, function (t) {
        var title = t.mission || t.title || t.subject || ('Task #' + (t.mission_id || t.id || ''));
        var status = t.is_done || Number(t.done) === 1 ? 'Done' : (t.status || 'Open');
        return '<div style="font-size:14px; color:#1f2a3a; font-weight:600;">' + esc(title) + '</div>' +
               '<div style="font-size:12px; color:#7b8595;">' + esc(tt('status')) + ': ' + esc(status) + '</div>';
      });

      html += renderSection('invoices', tt('pending_invoices'), invoices, function (inv) {
        var total = docTotal(inv);
        return '<div style="display:flex; justify-content:space-between; align-items:center;">' +
               '<div>' +
                 '<div style="font-size:14px; color:#1f2a3a; font-weight:600;">' + esc(tt('invoice')) + ' #' + esc(docId(inv)) + '</div>' +
                 '<div style="font-size:12px; color:#7b8595;">' + esc(formatDocDate(docDate(inv))) + '</div>' +
               '</div>' +
               (total !== '' ? '<div style="font-size:14px; font-weight:700; color:#c0392b;">' + esc(total) + ' ₪</div>' : '') +
               '</div>';
      });

      html += renderSection('orders', tt('order_history'), orders, function (order) {
        var total = docTotal(order);
        return '<div style="display:flex; justify-content:space-between; align-items:center;">' +
               '<div>' +
                 '<div style="font-size:14px; color:#1f2a3a; font-weight:600;">' + esc(tt('order')) + ' #' + esc(docId(order)) + '</div>' +
                 '<div style="font-size:12px; color:#7b8595;">' + esc(formatDocDate(docDate(order))) + '</div>' +
               '</div>' +
               (total !== '' ? '<div style="font-size:14px; font-weight:700; color:#2e8a63;">' + esc(total) + ' ₪</div>' : '') +
               '</div>';
      });

      contentArea.innerHTML = html;
    }

    function docId(doc) {
      return doc.last_documents_id || doc.document_id || doc.id || doc.number || doc.document_number || '';
    }

    function docDate(doc) {
      return doc.date || doc.date_created || doc.created || doc.create_date || '';
    }

    function formatDocDate(raw) {
      if (raw == null || raw === '') return '';
      var s = String(raw).trim();
      var d = new Date(s);
      if (!Number.isNaN(d.getTime())) {
        var dd = String(d.getDate()).padStart(2, '0');
        var mm = String(d.getMonth() + 1).padStart(2, '0');
        var yy = d.getFullYear();
        var hh = String(d.getHours()).padStart(2, '0');
        var mi = String(d.getMinutes()).padStart(2, '0');
        return dd + '/' + mm + '/' + yy + ' ' + hh + ':' + mi;
      }
      return s;
    }

    function docTotal(doc) {
      var v = doc.total != null ? doc.total
        : (doc.amount != null ? doc.amount
          : (doc.price != null ? doc.price
            : (doc.sum != null ? doc.sum
              : (doc.total_price != null ? doc.total_price
                : (doc.document_total != null ? doc.document_total
                  : (doc.final_price != null ? doc.final_price : ''))))));
      return v === '' || v == null ? '' : String(v);
    }

    function renderPager(sectionKey, total, page) {
      var pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      if (total <= PAGE_SIZE) return '';
      var from = (page - 1) * PAGE_SIZE + 1;
      var to = Math.min(page * PAGE_SIZE, total);
      var btnBase =
        'border:1px solid #d7dde6; background:#fff; border-radius:8px; padding:6px 10px; font-size:12px; font-weight:700; color:#1f2a3a; cursor:pointer;';
      var btnDisabled =
        'border:1px solid #e7eaef; background:#f3f5f7; border-radius:8px; padding:6px 10px; font-size:12px; font-weight:700; color:#9aa3b0; cursor:not-allowed;';
      var prevDis = page <= 1;
      var nextDis = page >= pages;
      return (
        '<div class="crm-pager" style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:10px; padding-top:8px; border-top:1px solid #eef0f3;">' +
          '<button type="button" class="crm-pager-btn" data-crm-section="' + esc(sectionKey) + '" data-crm-page="' + (page - 1) + '"' +
            (prevDis ? ' disabled' : '') +
            ' style="' + (prevDis ? btnDisabled : btnBase) + '">' + esc(tt('crm_prev')) + '</button>' +
          '<span style="font-size:12px; color:#7b8595; font-weight:600;">' +
            esc(from + '–' + to + ' / ' + total) +
          '</span>' +
          '<button type="button" class="crm-pager-btn" data-crm-section="' + esc(sectionKey) + '" data-crm-page="' + (page + 1) + '"' +
            (nextDis ? ' disabled' : '') +
            ' style="' + (nextDis ? btnDisabled : btnBase) + '">' + esc(tt('crm_next')) + '</button>' +
        '</div>'
      );
    }

    function renderSection(sectionKey, title, items, renderItem) {
      var html = '<div style="margin-bottom:18px;" data-crm-block="' + esc(sectionKey) + '">';
      html += '<div style="font-size:15px; font-weight:800; color:#1d60a2; margin-bottom:8px; border-bottom:1px solid #eef0f3; padding-bottom:4px;">' + esc(title) + '</div>';
      if (!items || !items.length) {
        html += '<div style="font-size:13px; color:#9aa3b0; font-style:italic;">' + esc(tt('no_data')) + '</div>';
      } else {
        var total = items.length;
        var pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        var page = Math.min(Math.max(1, Number(pageState[sectionKey]) || 1), pages);
        pageState[sectionKey] = page;
        var start = (page - 1) * PAGE_SIZE;
        var slice = items.slice(start, start + PAGE_SIZE);

        html += '<div style="display:flex; flex-direction:column; gap:8px;">';
        slice.forEach(function (item) {
          html += '<div style="background:#f9fafb; border:1px solid #e7eaef; border-radius:8px; padding:10px;">';
          html += renderItem(item);
          html += '</div>';
        });
        html += '</div>';
        html += renderPager(sectionKey, total, page);
      }
      html += '</div>';
      return html;
    }
  }

  document.addEventListener('DOMContentLoaded', initCRM);
})();
