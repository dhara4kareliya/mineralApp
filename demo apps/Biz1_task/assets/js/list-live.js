/**
 * Live Customer.List for לידים (folder 1) and לקוחות (folder 2).
 * Shows loading → rows | empty | API error text.
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function apiErrorText(err) {
    if (!err) return 'שגיאת API לא ידועה';
    var parts = [];
    if (err.message) parts.push(err.message);
    if (err.route) parts.push('route: ' + err.route);
    if (err.status) parts.push('status: ' + err.status);
    if (err.raw && err.raw.message && err.raw.message !== err.message) {
      parts.push(String(err.raw.message).slice(0, 400));
    }
    return parts.join('\n') || String(err);
  }

  function pick(row) {
    var id = row.customer_id || row.contactus_id || row.id || row.ID || '';
    var name = row.name || row.customer_name || row.full_name || row.cname || row.title || ('#' + id);
    var phone = row.phone || row.mobile || row.cellphone || row.tel || '';
    var city = row.city || row.town || row.address_city || row.address || '';
    var email = row.email || '';
    var status = row.status_name || row.status_label || row.status || '';
    var created = row.date_created || row.created_at || row.date || row.opendate || '';
    var products = row.products || row.product || row.last_product || '';
    return { id: id, name: name, phone: phone, city: city, email: email, status: status, created: created, products: products, raw: row };
  }

  function initials(name) {
    var p = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '?';
    if (p.length === 1) return p[0].slice(0, 2);
    return (p[0][0] || '') + (p[1][0] || '');
  }

  function loadingHtml() {
    return (
      '<div style="text-align:center;padding:48px 20px;">' +
      '<div style="font-size:14px;font-weight:700;color:#8a93a3;">טוען מהשרת…</div>' +
      '<div style="font-size:12px;color:#b6bdc8;margin-top:6px;">Customer.List</div>' +
      '</div>'
    );
  }

  function emptyHtml(kind) {
    var title = kind === 'leads' ? 'אין לידים כרגע' : 'אין לקוחות כרגע';
    var sub = kind === 'leads' ? 'תיקייה 1 · פניות חדשות ריקה' : 'תיקייה 2 · לקוחות ריקה';
    return (
      '<div style="text-align:center;padding:48px 20px;">' +
      '<div style="width:56px;height:56px;border-radius:50%;background:#e3e7ec;display:flex;align-items:center;justify-content:center;margin:0 auto 13px;">' +
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#aab2bf" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      '</div>' +
      '<div style="font-size:15px;font-weight:800;color:#5a6473;">' + esc(title) + '</div>' +
      '<div style="font-size:12.5px;color:#9aa3b0;margin-top:6px;">' + esc(sub) + '</div>' +
      '</div>'
    );
  }

  function errorHtml(err) {
    return (
      '<div style="background:#fbeeed;border:1px solid #f0c9c4;border-radius:14px;padding:14px 14px 16px;margin:8px 0;">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0392b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>' +
      '<div style="font-size:14px;font-weight:800;color:#c0392b;">שגיאת API</div>' +
      '</div>' +
      '<pre style="margin:0;white-space:pre-wrap;word-break:break-word;font:600 11.5px/1.5 Heebo,monospace;color:#7a2e28;max-height:280px;overflow:auto;">' +
      esc(apiErrorText(err)) +
      '</pre>' +
      '<button type="button" id="mb-list-retry" style="margin-top:12px;padding:9px 14px;border:none;border-radius:10px;background:#c0392b;color:#fff;font:800 13px Heebo,sans-serif;cursor:pointer;">נסה שוב</button>' +
      '</div>'
    );
  }

  function customerHref(page, id) {
    if (!id) return page;
    try {
      sessionStorage.setItem('mb_customer_id', String(id));
      localStorage.setItem('mb_customer_id', String(id));
    } catch (e) { /* ignore */ }
    return encodeURI(page) + '?customer_id=' + encodeURIComponent(id) +
      '&cust_id=' + encodeURIComponent(id) +
      '&id=' + encodeURIComponent(id);
  }

  function leadCard(c) {
    var detail = customerHref('כרטיס ליד.dc.html', c.id);
    var meta = [];
    if (c.phone) meta.push(esc(c.phone));
    if (c.city) meta.push(esc(c.city));
    if (c.created) meta.push(esc(c.created));
    return (
      '<a href="' + detail + '" data-customer-id="' + esc(c.id) + '" style="display:block;background:#fff;border-radius:16px;padding:14px 16px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-bottom:12px;text-decoration:none;">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">' +
      '<div style="font-size:17px;font-weight:800;color:#16223a;display:inline-flex;align-items:center;gap:5px;">' +
      esc(c.name) +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c2c9d2" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></div>' +
      (c.status
        ? '<span style="font-size:11.5px;font-weight:700;padding:4px 11px;border-radius:7px;background:#eaf2fb;color:#1d60a2;flex:none;">' + esc(c.status) + '</span>'
        : '') +
      '</div>' +
      (meta.length
        ? '<div style="margin-top:9px;font-size:12.5px;font-weight:600;color:#5a6473;line-height:1.5;">' + meta.join(' · ') + '</div>'
        : '') +
      (c.email ? '<div style="margin-top:4px;font-size:12px;color:#9aa3b0;">' + esc(c.email) + '</div>' : '') +
      '</a>'
    );
  }

  function customerCard(c) {
    var detail = customerHref('שירות כרטיס לקוח.dc.html', c.id);
    var av = initials(c.name);
    return (
      '<a href="' + detail + '" data-customer-id="' + esc(c.id) + '" style="display:flex;align-items:center;gap:12px;background:#fff;border-radius:14px;padding:12px 13px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-bottom:9px;text-decoration:none;">' +
      '<div style="width:44px;height:44px;border-radius:50%;background:#dbe7f8;color:#2f6aa6;font-weight:800;font-size:15px;flex:none;display:flex;align-items:center;justify-content:center;">' + esc(av) + '</div>' +
      '<div style="flex:1;min-width:0;">' +
      '<div style="font-size:15.5px;font-weight:800;color:#16223a;">' + esc(c.name) + '</div>' +
      '<div style="display:flex;align-items:center;gap:11px;margin-top:3px;flex-wrap:wrap;">' +
      (c.city ? '<span style="font-size:12px;color:#7b8595;">' + esc(c.city) + '</span>' : '') +
      (c.phone ? '<span style="font-size:12px;color:#7b8595;direction:ltr;">' + esc(c.phone) + '</span>' : '') +
      '</div>' +
      (c.products ? '<div style="font-size:11.5px;color:#9aa3b0;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(c.products) + '</div>' : '') +
      '</div>' +
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#c2c9d2" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex:none;"><path d="m15 18-6-6 6-6"/></svg>' +
      '</a>'
    );
  }

  function detectMount() {
    var el = document.getElementById('mb-live-list');
    if (el) {
      return {
        el: el,
        folderId: Number(el.getAttribute('data-folder') || MineralBarApp.FOLDERS.CUSTOMERS),
        kind: el.getAttribute('data-kind') || 'customers'
      };
    }
    var path = decodeURIComponent((location.pathname || '') + (location.href || ''));
    if (path.indexOf('רשימת לידים') !== -1 || path.indexOf('leads') !== -1) {
      return null; // will create mount
    }
    return null;
  }

  async function loadList(mount) {
    var el = mount.el;
    var folderId = mount.folderId;
    var kind = mount.kind;
    el.innerHTML = loadingHtml();

    var totalEl = document.getElementById('mb-total-label');
    if (totalEl) totalEl.textContent = 'טוען…';

    try {
      // List alone is enough (includes recordsFiltered); Count in parallel only if needed later
      var listRes = await MineralBarApp.listCustomers();
      var rows = (listRes && listRes.rows) || [];
      var total = (listRes && listRes.total != null) ? listRes.total : rows.length;
      if (listRes && listRes.raw) {
        var rf = listRes.raw.recordsFiltered != null ? Number(listRes.raw.recordsFiltered) : null;
        var rt = listRes.raw.recordsTotal != null ? Number(listRes.raw.recordsTotal) : null;
        if (rf != null && !Number.isNaN(rf)) total = rf;
        else if (rt != null && !Number.isNaN(rt)) total = rt;
      }

      if (totalEl) {
        totalEl.textContent = total + (kind === 'leads' ? ' לידים' : ' לקוחות') + ' · תיקייה ' + folderId;
      }

      if (!rows.length) {
        el.innerHTML = emptyHtml(kind);
        return;
      }

      var html = rows.map(function (row) {
        var c = pick(row);
        return kind === 'leads' ? leadCard(c) : customerCard(c);
      }).join('');

      if (total > rows.length) {
        html +=
          '<div style="text-align:center;padding:10px;font-size:12px;color:#9aa3b0;font-weight:600;">מוצגים ' +
          rows.length + ' מתוך ' + total + '</div>';
      }
      el.innerHTML = html;
    } catch (err) {
      console.error('[MineralBar] Customer.List failed', err);
      if (totalEl) totalEl.textContent = 'שגיאת API';
      el.innerHTML = errorHtml(err);
      var btn = document.getElementById('mb-list-retry');
      if (btn) btn.addEventListener('click', function () { loadList(mount); });
    }
  }

  var started = false;
  function start() {
    if (started) return;
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    var mount = detectMount();
    if (!mount || !mount.el) return;
    started = true;
    loadList(mount);
  }

  window.addEventListener('mineralbar:ready', start);
  window.addEventListener('mineralbar:auth-refreshed', start);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(start, 50);
    });
  } else {
    setTimeout(start, 50);
  }
})();
