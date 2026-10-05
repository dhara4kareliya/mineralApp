/** Hotfix: product search — local catalog only (no Products.List per keystroke) */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      var input = document.getElementById('propProductSearch');
      var content = document.getElementById('propContent');
      if (!input || !window.MineralBarApp) {
        if (tries > 80) clearInterval(timer);
        return;
      }
      if (content && content.classList.contains('hidden') && tries < 40) return;
      clearInterval(timer);
      install();
    }, 250);
  });

  function install() {
    if (window.__cpSearchFixInstalled) return;
    window.__cpSearchFixInstalled = true;

    function replace(id) {
      var el = document.getElementById(id);
      if (!el || !el.parentNode) return null;
      var clone = el.cloneNode(true);
      el.parentNode.replaceChild(clone, el);
      return document.getElementById(id);
    }

    var input = replace('propProductSearch');
    var suggest = replace('propProductSuggest');
    var clearBtn = replace('propClearProduct');
    var priceEl = document.getElementById('propPrice');
    var qtyEl = document.getElementById('propQty');
    var selectedWrap = document.getElementById('propSelectedProduct');
    var selectedName = document.getElementById('propSelectedName');
    var totalEl = document.getElementById('propTotal');
    if (!input || !suggest) return;

    function money(n) {
      var x = Math.round(Number(n) * 100) / 100;
      return (isFinite(x) ? x : 0).toFixed(2);
    }
    function nameOf(p) { return String((p && (p.product_name || p.name || p.title)) || '').trim(); }
    function idOf(p) { return String((p && (p.id || p.product_id)) || '').trim(); }
    function priceOf(p) {
      var n = Number(p && (p.product_price != null ? p.product_price : (p.price != null ? p.price : p.main_price)));
      return isFinite(n) ? n : 0;
    }
    function norm(v) {
      return String(v || '').toLowerCase().replace(/[^\u0590-\u05FFa-z0-9.]+/gi, ' ').replace(/\s+/g, ' ').trim();
    }
    function hay(p) {
      return norm([nameOf(p), p.product_sku, p.sku, p.barcode, idOf(p), p.discription, p.description, priceOf(p)].join(' '));
    }
    function score(p, q) {
      var h = hay(p); q = norm(q);
      if (!q || !h) return 0;
      if (h === q) return 100;
      if (h.indexOf(q) !== -1) return 80;
      var toks = q.split(' ').filter(Boolean), hit = 0;
      for (var i = 0; i < toks.length; i++) if (h.indexOf(toks[i]) !== -1) hit++;
      if (hit === toks.length) return 60;
      if (hit >= Math.ceil(toks.length * 0.6)) return 30 + hit;
      return 0;
    }
    function filterRows(rows, q) {
      var scored = [];
      (rows || []).forEach(function (p) {
        var s = score(p, q);
        if (s > 0) scored.push({ p: p, s: s });
      });
      scored.sort(function (a, b) { return b.s - a.s; });
      return scored.map(function (x) { return x.p; }).slice(0, 25);
    }

    async function ensureCatalog() {
      if (window.__cpProductCatalog && window.__cpProductCatalog.length) return window.__cpProductCatalog;
      if (window.__cpProductCatalogPromise) return window.__cpProductCatalogPromise;
      window.__cpProductCatalogPromise = (async function () {
        var all = await MineralBarApp.listAllProducts({ active: 1 });
        window.__cpProductCatalog = all.rows || [];
        return window.__cpProductCatalog;
      })();
      try {
        return await window.__cpProductCatalogPromise;
      } finally {
        window.__cpProductCatalogPromise = null;
      }
    }

    function render(rows, q) {
      if (!q) { suggest.classList.add('hidden'); return; }
      if (!rows.length) {
        suggest.innerHTML = '<div class="prop-suggest-empty">No products found</div>';
        suggest.classList.remove('hidden');
        return;
      }
      suggest._rows = rows;
      suggest.innerHTML = rows.map(function (p) {
        var id = idOf(p), name = nameOf(p) || ('#' + id), price = priceOf(p);
        return '<button type="button" class="prop-suggest-item" data-product-id="' + id + '">' +
          '<span class="prop-suggest-name">' + name + '</span>' +
          '<span class="prop-suggest-meta">#' + id + (price || price === 0 ? (' · ₪' + money(price)) : '') + '</span></button>';
      }).join('');
      suggest.classList.remove('hidden');
    }

    var seq = 0, debounce = null;
    window.__cpPickedProduct = null;

    async function runSearch(q) {
      var my = ++seq;
      q = String(q || '').trim();
      if (!q) { suggest.classList.add('hidden'); return; }
      suggest.innerHTML = '<div class="prop-suggest-empty">Searching…</div>';
      suggest.classList.remove('hidden');
      try {
        var cat = await ensureCatalog();
        if (my !== seq) return;
        render(filterRows(cat, q), q);
      } catch (e) {
        if (my !== seq) return;
        render([], q);
      }
    }

    function pick(p) {
      window.__cpPickedProduct = p;
      input.value = nameOf(p);
      if (priceEl) priceEl.value = money(priceOf(p));
      if (qtyEl && !qtyEl.value) qtyEl.value = '1';
      if (selectedName) selectedName.textContent = nameOf(p) + ' · #' + idOf(p);
      if (selectedWrap) selectedWrap.classList.remove('hidden');
      updateTotal();
      suggest.classList.add('hidden');
    }

    function clearProduct() {
      window.__cpPickedProduct = null;
      input.value = '';
      if (priceEl) priceEl.value = '';
      if (selectedWrap) selectedWrap.classList.add('hidden');
      suggest.classList.add('hidden');
      updateTotal();
    }

    function updateTotal() {
      if (!totalEl) return;
      var qty = Number(qtyEl && qtyEl.value) || 0;
      var price = Number(priceEl && priceEl.value) || 0;
      totalEl.textContent = '₪' + money(qty * price);
    }

    input.addEventListener('input', function () {
      window.__cpPickedProduct = null;
      if (selectedWrap) selectedWrap.classList.add('hidden');
      clearTimeout(debounce);
      debounce = setTimeout(function () { runSearch(input.value); }, 200);
    });
    input.addEventListener('focus', function () {
      if (String(input.value || '').trim()) runSearch(input.value);
    });
    suggest.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest && e.target.closest('[data-product-id]');
      if (!btn) return;
      var id = btn.getAttribute('data-product-id');
      var rows = suggest._rows || [];
      for (var i = 0; i < rows.length; i++) {
        if (idOf(rows[i]) === String(id)) { pick(rows[i]); break; }
      }
    });
    if (clearBtn) clearBtn.addEventListener('click', clearProduct);
    if (qtyEl) qtyEl.addEventListener('input', updateTotal);
    if (priceEl) priceEl.addEventListener('input', updateTotal);
  }
})();
