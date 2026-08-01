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
      '<div style="font-size:14px;font-weight:700;color:#8a93a3;">Loading from server…</div>' +
      '<div style="font-size:12px;color:#b6bdc8;margin-top:6px;">Customer.List</div>' +
      '</div>'
    );
  }

  function emptyHtml(kind) {
    var title = kind === 'leads' ? 'No leads currently' : 'No customers currently';
    var sub = kind === 'leads' ? 'Folder 1 · New inquiries is empty' : 'Folder 2 · Customers is empty';
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
      '<div style="font-size:14px;font-weight:800;color:#c0392b;">API error</div>' +
      '</div>' +
      '<pre style="margin:0;white-space:pre-wrap;word-break:break-word;font:600 11.5px/1.5 Heebo,monospace;color:#7a2e28;max-height:280px;overflow:auto;">' +
      esc(apiErrorText(err)) +
      '</pre>' +
      '<button type="button" id="mb-list-retry" style="margin-top:12px;padding:9px 14px;border:none;border-radius:10px;background:#c0392b;color:#fff;font:800 13px Heebo,sans-serif;cursor:pointer;">Try again</button>' +
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
    var detail = customerHref('lead-card.html', c.id);
    var meta = [];
    if (c.phone) meta.push(esc(c.phone));
    if (c.city) meta.push(esc(c.city));
    if (c.created) {
      try {
        var d = new Date(c.created);
        if (!isNaN(d.getTime())) {
          var pad = function(n) { return n < 10 ? '0' + n : n; };
          var formatted = pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
          meta.push(formatted);
        } else {
          meta.push(esc(c.created));
        }
      } catch(e) {
        meta.push(esc(c.created));
      }
    }
    return (
      '<a href="' + detail + '" data-customer-id="' + esc(c.id) + '" data-status="' + esc(c.status) + '" style="display:block;background:#fff;border-radius:16px;padding:14px 16px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-bottom:12px;text-decoration:none;">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">' +
      '<div style="font-size:17px;font-weight:800;color:#16223a;display:inline-flex;align-items:center;gap:5px;">' +
      esc(c.name) +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c2c9d2" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></div>' +
      (c.status
        ? '<span style="font-size:11.5px;font-weight:700;padding:4px 11px;border-radius:7px;background:#eaf2fb;color:#1d60a2;flex:none;">' + esc(c.status) + '</span>'
        : '') +
      '</div>' +
      (meta.length
        ? '<div style="margin-top:9px;font-size:12.5px;font-weight:600;color:#5a6473;line-height:1.5;">' + meta.join(' &middot; ') + '</div>'
        : '') +
      (c.email ? '<div style="margin-top:4px;font-size:12px;color:#9aa3b0;">' + esc(c.email) + '</div>' : '') +
      '</a>'
    );
  }

  function customerCard(c) {
    var detail = customerHref('service-customer-card.html', c.id);
    var av = initials(c.name);
    return (
      '<div data-customer-id="' + esc(c.id) + '" data-status="' + esc(c.status || 'active') + '" style="display:flex;align-items:center;gap:12px;background:#fff;border-radius:14px;padding:12px 13px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-bottom:9px;text-decoration:none;">' +
      '<a href="' + detail + '" style="width:44px;height:44px;border-radius:50%;background:#dbe7f8;color:#2f6aa6;font-weight:800;font-size:15px;flex:none;display:flex;align-items:center;justify-content:center;text-decoration:none;">' + esc(av) + '</a>' +
      '<div style="flex:1;min-width:0;">' +
      '<a href="' + detail + '" style="font-size:15.5px;font-weight:800;color:#16223a;text-decoration:none;display:block;">' + esc(c.name) + '</a>' +
      '<div style="display:flex;align-items:center;gap:11px;margin-top:3px;flex-wrap:wrap;">' +
      (c.city ? '<span style="font-size:12px;color:#7b8595;">' + esc(c.city) + '</span>' : '') +
      (c.phone ? '<span style="font-size:12px;color:#7b8595;direction:ltr;">' + esc(c.phone) + '</span>' : '') +
      '</div>' +
      (c.products ? '<div style="font-size:11.5px;color:#9aa3b0;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(c.products) + '</div>' : '') +
      '</div>' +
      (c.phone ? '<a href="https://wa.me/972' + esc(String(c.phone).replace(/\D/g,'').replace(/^0/,'')) + '" target="_blank" rel="noopener" style="padding:6px;border-radius:50%;background:#e6f4ec;color:#2e8a63;display:flex;align-items:center;justify-content:center;text-decoration:none;"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2z"/></svg></a>' : '') +
      '<a href="' + detail + '" style="text-decoration:none;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#c2c9d2" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex:none;"><path d="m15 18-6-6 6-6"/></svg></a>' +
      '</div>'
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
    return null;
  }

  async function loadList(mount, explicitFolderId) {
    var el = mount.el;
    var kind = mount.kind;
    el.innerHTML = loadingHtml();

    var totalEl = document.getElementById('mb-total-label');
    if (totalEl) totalEl.textContent = 'Loading…';

    try {
      var queryParams = { length: 100, start: 0, draw: 1 };
      if (explicitFolderId != null) {
        queryParams.folder_id = explicitFolderId;
      }
      var listRes = await MineralBarApp.listCustomers(queryParams);
      
      el = document.getElementById('mb-live-list') || el;
      var totalEl = document.getElementById('mb-total-label');

      var rows = (listRes && (listRes.rows || listRes.data)) || [];
      var total = (listRes && listRes.total != null) ? listRes.total : rows.length;

      if (totalEl) {
        totalEl.textContent = rows.length + (kind === 'leads' ? ' leads' : ' active customers');
      }

      if (!rows.length) {
        el.innerHTML = emptyHtml(kind);
        return;
      }

      var html = rows.map(function (row) {
        var c = pick(row);
        return kind === 'leads' ? leadCard(c) : customerCard(c);
      }).join('');

      el.innerHTML = html;
      applyClientFilters(el);
      bindClientFilters(el);
    } catch (err) {
      console.error('[MineralBar] Customer.List failed', err);
      if (totalEl) totalEl.textContent = 'API Error';
      el.innerHTML = errorHtml(err);
      var btn = document.getElementById('mb-list-retry');
      if (btn) btn.addEventListener('click', function () { loadList(mount); });
    }
  }

  function applyClientFilters(listEl) {
    listEl = document.getElementById('mb-live-list') || listEl;
    var input = document.querySelector('.ds-input') || document.getElementById('mb-customer-search');
    var query = input ? input.value.toLowerCase().trim() : '';

    var clearBtn = document.getElementById('mb-clear-search');
    if (clearBtn) {
      clearBtn.style.display = query.length > 0 ? 'flex' : 'none';
    }
    
    var items = listEl.querySelectorAll('div[data-customer-id], a[data-customer-id]');
    var visibleCount = 0;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item.dataset.originalDisplay) {
        item.dataset.originalDisplay = item.style.display || 'flex';
      }
      
      var text = item.textContent.toLowerCase();
      var isVisible = query === '' || text.indexOf(query) > -1;

      item.style.display = isVisible ? item.dataset.originalDisplay : 'none';
      if (isVisible) visibleCount++;
    }

    var totalEl = document.getElementById('mb-total-label');
    if (totalEl) {
      totalEl.textContent = visibleCount + ' customers';
    }
  }

  function renderFolderFilterBar(container, selectedFolderId) {
    if (!container) return;

    var folders = (window.MineralBarApp && typeof MineralBarApp.getFolders === 'function') ? MineralBarApp.getFolders() : [];

    if (!folders || !folders.length) {
      folders = [
        { id: 1, name_en: "New Leads", name_he: "פניות חדשות", icon: "💼", count: 6 },
        { id: 2, name_en: "Customers", name_he: "לקוחות", icon: "💡", count: 1 },
        { id: 3, name_en: "Missions", name_he: "משימות", icon: "📅", count: 1 },
        { id: 4, name_en: "Archive", name_he: "ארכיון", icon: "📁", count: 0 },
        { id: 5, name_en: "Trash", name_he: "אשפה", icon: "📹", count: 0 },
        { id: 6, name_en: "Spam", name_he: "ספאם", icon: "❗", count: 0 }
      ];
    }

    var lang = (window.getCurrentLanguage && window.getCurrentLanguage()) || 'he';
    var isEn = lang === 'en';

    var activeId = null;
    if (selectedFolderId !== undefined && selectedFolderId !== null) {
      activeId = String(selectedFolderId);
    } else if (selectedFolderId === undefined) {
      activeId = String(container.getAttribute('data-active-folder') || '0');
    }

    var iconMap = {
      '1': '💼',
      '2': '💡',
      '3': '📅',
      '4': '📁',
      '5': '📹',
      '6': '❗'
    };

    var html = '';
    folders.forEach(function(f) {
      var fid = String(f.id || f.folder_id || f.value || '1');
      var name = isEn ? (f.name_en || f.name || f.name_he) : (f.name_he || f.name || f.name_en);
      if (isEn && name) name = name.toUpperCase();
      var icon = f.icon || iconMap[fid] || '📁';
      var count = f.count != null ? f.count : (f.total != null ? f.total : (fid === '1' ? 6 : (fid === '2' || fid === '3' ? 1 : 0)));

      var isActive = (fid === activeId);

      var btnStyle = isActive
        ? 'flex:none; display:inline-flex; align-items:center; gap:6px; padding:7px 13px; border-radius:12px; font-size:12.5px; font-weight:800; cursor:pointer; white-space:nowrap; background:#eff6ff; color:#1d4ed8; border:1.5px solid #3b82f6; box-shadow:0 1px 3px rgba(59,130,246,0.15);'
        : 'flex:none; display:inline-flex; align-items:center; gap:6px; padding:7px 13px; border-radius:12px; font-size:12.5px; font-weight:700; cursor:pointer; white-space:nowrap; background:#f8fafc; color:#475569; border:1.5px solid #e2e8f0;';

      var badgeStyle = isActive
        ? 'display:inline-flex; align-items:center; justify-content:center; min-width:18px; height:18px; padding:0 5px; border-radius:99px; font-size:11px; font-weight:800; background:#3b82f6; color:#ffffff; margin-left:2px;'
        : 'display:inline-flex; align-items:center; justify-content:center; min-width:18px; height:18px; padding:0 5px; border-radius:99px; font-size:11px; font-weight:800; background:#cbd5e1; color:#334155; margin-left:2px;';

      html += '<button type="button" class="mb-cust-chip mb-folder-tab" data-folder-id="' + fid + '" data-chip-id="' + fid + '" data-active="' + (isActive ? '1' : '0') + '" style="' + btnStyle + '">' +
        '<span>' + icon + '</span> ' +
        '<span>' + esc(name) + '</span> ' +
        '<span class="count-badge" style="' + badgeStyle + '">' + count + '</span>' +
        '</button>';
    });

    container.innerHTML = html;
  }

  function bindClientFilters(listEl) {
    var searchInput = document.getElementById('mb-customer-search') || document.querySelector('.ds-input');
    var clearBtn = document.getElementById('mb-clear-search');

    if (searchInput && !searchInput.dataset.wired) {
      searchInput.dataset.wired = '1';
      searchInput.addEventListener('input', function() {
        applyClientFilters(listEl);
      });
    }

    if (clearBtn && !clearBtn.dataset.wired) {
      clearBtn.dataset.wired = '1';
      clearBtn.addEventListener('click', function() {
        if (searchInput) {
          searchInput.value = '';
          applyClientFilters(listEl);
          searchInput.focus();
        }
      });
    }

    var chipContainer = document.getElementById('mb-customer-filter-chips') || document.querySelector('.dc-scroll');
    if (chipContainer && !chipContainer.dataset.rendered) {
      chipContainer.dataset.rendered = '1';
      renderFolderFilterBar(chipContainer, null);

      // Make it mouse-draggable on desktop
      var isDown = false, startX, scrollLeft;
      chipContainer.style.cursor = 'grab';
      chipContainer.addEventListener('mousedown', function(e) {
        isDown = true;
        chipContainer.dataset.dragged = '0';
        chipContainer.style.cursor = 'grabbing';
        startX = e.pageX - chipContainer.offsetLeft;
        scrollLeft = chipContainer.scrollLeft;
      });
      chipContainer.addEventListener('mouseleave', function() {
        isDown = false;
        chipContainer.style.cursor = 'grab';
      });
      chipContainer.addEventListener('mouseup', function() {
        isDown = false;
        chipContainer.style.cursor = 'grab';
        setTimeout(function() { chipContainer.dataset.dragged = '0'; }, 0);
      });
      chipContainer.addEventListener('mousemove', function(e) {
        if (!isDown) return;
        e.preventDefault();
        var x = e.pageX - chipContainer.offsetLeft;
        var walk = (x - startX) * 1.5;
        if (Math.abs(walk) > 5) chipContainer.dataset.dragged = '1';
        chipContainer.scrollLeft = scrollLeft - walk;
      });
    }

    var chips = document.querySelectorAll('.mb-cust-chip, .mb-folder-tab');
    chips.forEach(function(chip) {
      if (chip.dataset.wired) return;
      chip.dataset.wired = '1';
      chip.addEventListener('click', function(e) {
        if (chipContainer && chipContainer.dataset.dragged === '1') {
          e.preventDefault();
          return;
        }
        var selectedFid = chip.getAttribute('data-folder-id') || chip.getAttribute('data-chip-id');
        var wasActive = (chip.getAttribute('data-active') === '1');
        
        var nextActiveId = wasActive ? null : selectedFid;

        chips.forEach(function(c) {
          var isThis = (c.getAttribute('data-folder-id') === nextActiveId) || (c.getAttribute('data-chip-id') === nextActiveId);
          c.setAttribute('data-active', isThis ? '1' : '0');
          c.style.background = isThis ? '#eff6ff' : '#f8fafc';
          c.style.color = isThis ? '#1d4ed8' : '#475569';
          c.style.border = isThis ? '1.5px solid #3b82f6' : '1.5px solid #e2e8f0';
          c.style.fontWeight = isThis ? '800' : '700';

          var badge = c.querySelector('.count-badge');
          if (badge) {
            badge.style.background = isThis ? '#3b82f6' : '#cbd5e1';
            badge.style.color = isThis ? '#ffffff' : '#334155';
          }
        });

        // Fetch fresh list from API with selected folder_id
        var mount = detectMount();
        if (mount) {
          loadList(mount, nextActiveId);
        }
      });
    });
  }

  function start() {
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    var mount = detectMount();
    if (!mount || !mount.el) return;
    // Initial load only — later updates come from socket partial patches
    if (mount.el.getAttribute('data-initial-loaded') === '1') return;
    mount.el.setAttribute('data-initial-loaded', '1');
    loadList(mount, mount.folderId);
  }

  function watchForListRemount() {
    if (!document.body || window.__mbListMountObserver) return;
    var scheduled = false;
    window.__mbListMountObserver = new MutationObserver(function() {
      if (scheduled) return;
      scheduled = true;
      setTimeout(function() {
        scheduled = false;
        start();
      }, 0);
    });
    window.__mbListMountObserver.observe(document.body, { childList: true, subtree: true });
  }

  function bumpTotal(delta) {
    var totalEl = document.getElementById('mb-total-label');
    if (!totalEl) return;
    var m = String(totalEl.textContent || '').match(/(\d+)/);
    var n = m ? Number(m[1]) : 0;
    n = Math.max(0, n + delta);
    var kindEl = document.getElementById('mb-live-list');
    var kind = (kindEl && kindEl.getAttribute('data-kind')) || 'customers';
    totalEl.textContent = n + (kind === 'leads' ? ' leads' : ' customers');
  }

  function extractCustomerFromEvent(detail) {
    var ev = (detail && detail.event) || {};
    var payload = ev.payload || ev.data || ev || {};
    var customer = payload.customer || payload.lead || payload.data || null;
    var id = (customer && (customer.id || customer.customer_id || customer.contactus_id)) ||
      payload.customer_id || payload.cust_id || payload.id || '';
    if (!id && !customer) return null;
    var row = customer || payload;
    return pick(Object.assign({}, row, {
      id: id || row.id,
      customer_id: id || row.customer_id,
      name: row.name || row.customer_name || payload.name || ('#' + id),
      phone: row.phone || row.mobile || payload.mobile || payload.phone || '',
      email: row.email || payload.email || '',
      city: row.city || row.address || payload.city || ''
    }));
  }

  function cssAttrEscape(v) {
    return String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function upsertCustomerCard(c, kind) {
    var el = document.getElementById('mb-live-list');
    if (!el || !c || !c.id) return false;
    var existing = el.querySelector('[data-customer-id="' + cssAttrEscape(String(c.id)) + '"]');
    var html = kind === 'leads' ? leadCard(c) : customerCard(c);
    if (existing) {
      var wrap = document.createElement('div');
      wrap.innerHTML = html;
      var next = wrap.firstElementChild;
      if (next) existing.replaceWith(next);
      console.log('[ListLive] socket updated row', c.id, c.name);
      return true;
    }
    // New item — prepend only that card
    if (/טוען|loading|אין |no /i.test(el.textContent || '') && el.children.length <= 1) {
      el.innerHTML = html;
    } else {
      el.insertAdjacentHTML('afterbegin', html);
    }
    bumpTotal(1);
    console.log('[ListLive] socket inserted row', c.id, c.name);
    return true;
  }

  function removeCustomerCard(id) {
    var el = document.getElementById('mb-live-list');
    if (!el || !id) return false;
    var existing = el.querySelector('[data-customer-id="' + cssAttrEscape(String(id)) + '"]');
    if (!existing) return false;
    existing.remove();
    bumpTotal(-1);
    console.log('[ListLive] socket removed row', id);
    return true;
  }

  function applySocketCustomerEvent(detail) {
    var key = String((detail && detail.key) || '').toLowerCase();
    if (!/lead|customer|crm/.test(key)) return;
    var mount = detectMount();
    if (!mount) return;
    var kind = mount.kind || 'customers';
    var c = extractCustomerFromEvent(detail);

    if (/delete|deleted|purge|remove/.test(key)) {
      var delId = (c && c.id) ||
        (detail.event && detail.event.payload && (detail.event.payload.customer_id || detail.event.payload.id));
      if (delId) removeCustomerCard(delId);
      return;
    }

    if (!c || !c.id) {
      console.warn('[ListLive] socket event missing customer payload — skip full reload', detail);
      return;
    }

    // created / updated / restored / followup → upsert only that card
    upsertCustomerCard(c, kind);
  }

  window.addEventListener('mineralbar:ready', function (ev) {
    // Ignore realtime soft re-fires — only initial auth ready should load full list
    if (ev && ev.detail && ev.detail.reason === 'realtime') return;
    start();
  });
  window.addEventListener('mineralbar:auth-refreshed', start);
  window.addEventListener('mineralbar:leads', function (ev) {
    applySocketCustomerEvent((ev && ev.detail) || {});
  });
  window.addEventListener('mineralbar:realtime', function (ev) {
    applySocketCustomerEvent((ev && ev.detail) || {});
  });
  // Do NOT listen to mineralbar:page-refresh / polling — socket partial only

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      watchForListRemount();
      setTimeout(start, 50);
    });
  } else {
    watchForListRemount();
    setTimeout(start, 50);
  }
  window.addEventListener('pageshow', function (ev) {
    // BFCache restores can keep data-initial-loaded="1" and leave the stale Loading state.
    if (ev && ev.persisted) {
      var mount = detectMount();
      if (mount && mount.el) mount.el.removeAttribute('data-initial-loaded');
    }
    start();
  });
})();
