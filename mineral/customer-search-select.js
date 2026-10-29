/**
 * Searchable customer picker — wraps a <select> with type-to-filter UI.
 * Keeps select.value in sync so existing Mission.Create / quick-mission code stays unchanged.
 */
(function (g) {
  'use strict';

  var STYLE_ID = 'mb-cust-combo-style';

  function isEn() {
    return typeof g.getCurrentLanguage === 'function' && g.getCurrentLanguage() === 'en';
  }

  function t(en, he) {
    if (typeof g.mbT === 'function') return g.mbT(en, he);
    return isEn() ? en : he;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.mb-cust-combo{position:relative;width:100%;min-width:0;}',
      '.mb-cust-combo-input{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--border-panel,#e4e8ee);border-radius:10px;background:var(--bg-form,#f8f9fb);color:var(--text-title,#1f2a3a);font:700 13px Heebo,sans-serif;outline:none;}',
      '.mb-cust-combo-input:focus{border-color:#1d60a2;box-shadow:0 0 0 3px rgba(29,96,162,.12);}',
      '.mb-cust-combo-list{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:80;max-height:220px;overflow:auto;background:#fff;border:1px solid #e4e8ee;border-radius:12px;box-shadow:0 10px 28px rgba(15,24,40,.16);}',
      '.mb-cust-combo-item{display:block;width:100%;text-align:start;padding:11px 12px;border:none;background:transparent;font:700 13px Heebo,sans-serif;color:#1f2a3a;cursor:pointer;}',
      '.mb-cust-combo-item:hover,.mb-cust-combo-item.is-active{background:#eef5fb;color:#1d60a2;}',
      '.mb-cust-combo-empty{padding:12px;font:600 12.5px Heebo,sans-serif;color:#9aa3b0;}',
      '.mb-cust-combo-select{position:absolute!important;opacity:0!important;pointer-events:none!important;width:1px!important;height:1px!important;overflow:hidden!important;}'
    ].join('');
    document.head.appendChild(style);
  }

  function optionItems(selectEl) {
    return Array.prototype.slice.call(selectEl.options || []).filter(function (o) {
      return o && String(o.value || '').trim() !== '';
    }).map(function (o) {
      return { value: String(o.value), label: String(o.textContent || o.label || o.value).trim() };
    });
  }

  function selectedLabel(selectEl) {
    var opt = selectEl.options[selectEl.selectedIndex];
    if (!opt || !String(opt.value || '').trim()) return '';
    return String(opt.textContent || '').trim();
  }

  function matchesQuery(label, value, q) {
    if (!q) return true;
    var hay = (label + ' ' + value).toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  function enhance(selectEl, opts) {
    opts = opts || {};
    if (!selectEl || !selectEl.parentNode) return null;
    if (selectEl._mbCustCombo) {
      selectEl._mbCustCombo.sync();
      return selectEl._mbCustCombo;
    }

    ensureStyles();

    var wrap = document.createElement('div');
    wrap.className = 'mb-cust-combo';

    var input = document.createElement('input');
    input.type = 'search';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');
    input.className = 'mb-cust-combo-input' + (opts.inputClass ? (' ' + opts.inputClass) : '');
    input.placeholder = opts.placeholder || t('Search customer by name or phone…', 'חיפוש לקוח לפי שם או טלפון…');
    if (opts.inputStyle) input.setAttribute('style', opts.inputStyle);

    var list = document.createElement('div');
    list.className = 'mb-cust-combo-list';
    list.hidden = true;
    list.setAttribute('role', 'listbox');

    selectEl.classList.add('mb-cust-combo-select');
    selectEl.setAttribute('aria-hidden', 'true');
    selectEl.tabIndex = -1;

    var parent = selectEl.parentNode;
    parent.insertBefore(wrap, selectEl);
    wrap.appendChild(input);
    wrap.appendChild(list);
    wrap.appendChild(selectEl);

    var open = false;
    var activeIdx = -1;
    var remoteTimer = null;
    var remoteSeq = 0;

    function closeList() {
      open = false;
      list.hidden = true;
      activeIdx = -1;
    }

    function sync() {
      var label = selectedLabel(selectEl);
      if (label) input.value = label;
      else if (!open) input.value = '';
    }

    function pick(value, label) {
      selectEl.value = String(value || '');
      if (!selectEl.value && value) {
        // Option may be missing after a remote refresh — add it
        var opt = document.createElement('option');
        opt.value = String(value);
        opt.textContent = label || ('#' + value);
        selectEl.appendChild(opt);
        selectEl.value = String(value);
      }
      input.value = label || selectedLabel(selectEl) || '';
      try {
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (e) { /* ignore */ }
      closeList();
    }

    function render(filterText) {
      var q = String(filterText || '').trim().toLowerCase();
      var items = optionItems(selectEl).filter(function (it) {
        return matchesQuery(it.label, it.value, q);
      });
      // Prefer items that start with query when searching
      if (q) {
        items.sort(function (a, b) {
          var as = a.label.toLowerCase().indexOf(q) === 0 ? 0 : 1;
          var bs = b.label.toLowerCase().indexOf(q) === 0 ? 0 : 1;
          return as - bs || a.label.localeCompare(b.label);
        });
      }
      var max = Number(opts.maxVisible) || 80;
      items = items.slice(0, max);

      if (!items.length) {
        list.innerHTML = '<div class="mb-cust-combo-empty">' +
          esc(t('No customers found', 'לא נמצאו לקוחות')) + '</div>';
      } else {
        list.innerHTML = items.map(function (it, i) {
          var active = i === activeIdx ? ' is-active' : '';
          return '<button type="button" class="mb-cust-combo-item' + active +
            '" data-value="' + esc(it.value) + '" data-idx="' + i + '" role="option">' +
            esc(it.label) + '</button>';
        }).join('');
      }
      list.hidden = false;
      open = true;
    }

    function scheduleRemote(q) {
      if (opts.remoteSearch === false) return;
      if (!g.MineralBarApp || typeof MineralBarApp.listCustomers !== 'function') return;
      clearTimeout(remoteTimer);
      remoteTimer = setTimeout(async function () {
        var seq = ++remoteSeq;
        var query = String(q || '').trim();
        try {
          var params = { length: 100, start: 0, draw: 1 };
          if (query) {
            params.search = query;
            params.name = query;
          }
          var res = await MineralBarApp.listCustomers(params);
          if (seq !== remoteSeq) return;
          var rows = (res && (res.rows || res.data)) || [];
          if (!Array.isArray(rows)) rows = [];
          var keepVal = String(selectEl.value || '');
          var keepLabel = selectedLabel(selectEl);
          var html = '<option value="">' + esc(opts.emptyLabel || t('Choose Customer', 'בחר לקוח')) + '</option>';
          var seen = {};
          rows.forEach(function (c) {
            var cid = String(c.customer_id || c.contactus_id || c.id || '').trim();
            if (!cid || seen[cid]) return;
            seen[cid] = true;
            var cname = c.name || c.customer_name || c.full_name || ('Customer #' + cid);
            var phone = c.phone || c.mobile || c.phone1 || '';
            html += '<option value="' + esc(cid) + '">' + esc(cname + (phone ? ' (' + phone + ')' : '')) + '</option>';
          });
          if (keepVal && !seen[keepVal]) {
            html += '<option value="' + esc(keepVal) + '">' + esc(keepLabel || keepVal) + '</option>';
          }
          selectEl.innerHTML = html;
          if (keepVal) selectEl.value = keepVal;
          render(input.value);
        } catch (e) {
          console.warn('[CustomerSearch] remote list failed', e);
          render(input.value);
        }
      }, opts.remoteDelayMs != null ? opts.remoteDelayMs : 280);
    }

    input.addEventListener('focus', function () {
      activeIdx = -1;
      render(input.value === selectedLabel(selectEl) ? '' : input.value);
      scheduleRemote(input.value === selectedLabel(selectEl) ? '' : input.value);
    });

    input.addEventListener('input', function () {
      activeIdx = -1;
      // Clear selection when user edits away from selected label
      if (selectEl.value && input.value.trim() !== selectedLabel(selectEl)) {
        selectEl.value = '';
      }
      render(input.value);
      scheduleRemote(input.value);
    });

    input.addEventListener('keydown', function (e) {
      if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
        render(input.value);
        return;
      }
      var buttons = list.querySelectorAll('.mb-cust-combo-item');
      if (e.key === 'Escape') {
        e.preventDefault();
        sync();
        closeList();
        input.blur();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIdx = Math.min(buttons.length - 1, activeIdx + 1);
        render(input.value);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIdx = Math.max(0, activeIdx - 1);
        render(input.value);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIdx >= 0 && buttons[activeIdx]) {
          buttons[activeIdx].click();
        } else if (buttons[0]) {
          buttons[0].click();
        }
      }
    });

    list.addEventListener('mousedown', function (e) {
      e.preventDefault();
    });

    list.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('.mb-cust-combo-item') : null;
      if (!btn) return;
      pick(btn.getAttribute('data-value'), btn.textContent);
    });

    document.addEventListener('click', function (e) {
      if (!open) return;
      if (wrap.contains(e.target)) return;
      if (selectEl.value) sync();
      else if (!String(input.value || '').trim()) input.value = '';
      closeList();
    });

    var api = {
      sync: sync,
      pick: pick,
      input: input,
      close: closeList
    };
    selectEl._mbCustCombo = api;
    sync();
    return api;
  }

  g.MineralBarCustomerSearch = {
    enhance: enhance,
    enhanceSelect: enhance
  };
})(window);
