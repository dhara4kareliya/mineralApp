Layout.render({ active: 'products', titleKey: 'nav.products' });

    const PAGE_SIZE = window.CP_CONFIG.PAGE_SIZE || 25;
    let state = { search: '', page: 0, total: null };

    let searchTimer;
    document.getElementById('search').addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.search = e.target.value.trim();
        state.page = 0;
        load();
      }, 350);
    });

    document.getElementById('prev').addEventListener('click', () => {
      if (state.page > 0) {
        state.page--;
        load();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    document.getElementById('next').addEventListener('click', () => {
      state.page++;
      load();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    function val(v, fallback = '—') {
      if (v === null || v === undefined || v === '') return fallback;
      return v;
    }

    function formatPrice(amount, coin) {
      if (amount === null || amount === undefined || amount === '') return '—';
      const formatted = UI.formatMoney(amount, coin || '');
      return formatted === '—' ? '—' : formatted;
    }

    function thumbCell(p) {
      const src = p.main_image || p.hover_image || p.sub_image;
      const name = p.product_name || p.name || I18n.t('products.product');
      if (!src) return '<span class="product-list-thumb-placeholder">📦</span>';
      return `<a class="product-thumb-wrap loading" href="${Layout.escapeHtml(UI.assetUrl(src))}" target="_blank" rel="noopener" title="View ${Layout.escapeHtml(name)}">
        <span class="product-list-thumb-placeholder">📦</span>
        <img class="product-list-thumb" hidden data-asset-src="${Layout.escapeHtml(src)}" alt="${Layout.escapeHtml(name)}" />
      </a>`;
    }

    function priceCell(p) {
      const coin = p.coin || '';
      const price = Number(p.price);
      const discount = Number(p.discount_price);
      const hasDiscount = Number.isFinite(discount) && discount > 0 && Number.isFinite(price) && discount < price;
      const finalPrice = hasDiscount ? discount : price;
      return `<span class="product-list-price">${formatPrice(finalPrice, coin)}</span>${
        hasDiscount ? `<span class="product-list-price-old">${formatPrice(price, coin)}</span>` : ''
      }`;
    }

    function stockBadge(left) {
      const n = Number(left);
      const inStock = Number.isFinite(n) && n > 0;
      if (inStock) {
        return `<span class="stock-pill stock-pill-in"><span class="stock-dot"></span>${I18n.t('products.inStock')}</span>`;
      }
      return `<span class="stock-pill stock-pill-out">
        <svg class="stock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/>
          <line x1="8" y1="8" x2="16" y2="16"/>
        </svg>
        ${I18n.t('products.outOfStock')}
      </span>`;
    }

    function renderRow(p) {
      const name = p.product_name || p.name || I18n.t('products.product');
      const sku = p.product_sku || p.product_internal_sku;
      const desc = p.discription || p.description || '';
      const leftStock = p.left_stock ?? p.stock;
      const coin = p.coin || '';

      return `<tr>
        <td>${thumbCell(p)}</td>
        <td>
          <div class="product-list-name">${Layout.escapeHtml(name)}</div>
          ${desc ? `<div class="product-list-desc" title="${Layout.escapeHtml(desc)}">${Layout.escapeHtml(desc)}</div>` : ''}
        </td>
        <td>${Layout.escapeHtml(val(sku))}</td>
        <td>${Layout.escapeHtml(val(p.color))}</td>
        <td>${Layout.escapeHtml(val(p.size))}</td>
        <td>${priceCell(p)}</td>
        <td>${formatPrice(p.discount_price, coin)}</td>
        <td><strong class="${Number(leftStock) <= 0 ? 'product-stock-low' : 'product-stock-ok'}">${val(leftStock)}</strong></td>
        <td>${val(p.sold_stock)}</td>
        <td>${stockBadge(leftStock)}</td>
      </tr>`;
    }

    function getListTotal(data) {
      const total = data.count ?? data.recordsTotal ?? data.recordsFiltered ?? data.total_record;
      return typeof total === 'number' ? total : Number(total) || null;
    }

    async function load() {
      const el = document.getElementById('list');
      const pager = document.getElementById('pager');
      Layout.loading(el);
      pager.hidden = true;

      try {
        const body = {
          limit: PAGE_SIZE,
          start: state.page * PAGE_SIZE,
        };
        if (state.search) body.search = state.search;

        const data = await API.productsList(body);
        const rows = data.data || [];
        const total = getListTotal(data);
        state.total = total;

        document.getElementById('result-count').textContent =
          typeof total === 'number'
            ? (total === 1 ? I18n.t('products.countOne') : I18n.t('products.count', { n: total }))
            : '';

        if (!rows.length) {
          Layout.empty(el, I18n.t('products.none'), state.search ? I18n.t('products.searchHint') : I18n.t('products.noneHint'));
          return;
        }

        el.innerHTML = `<div class="table-wrap"><table>
          <thead>
            <tr>
              <th>${I18n.t('products.image')}</th>
              <th>${I18n.t('products.name')}</th>
              <th>${I18n.t('products.sku')}</th>
              <th>${I18n.t('products.color')}</th>
              <th>${I18n.t('products.size')}</th>
              <th>${I18n.t('products.price')}</th>
              <th>${I18n.t('products.discount')}</th>
              <th>${I18n.t('products.leftStock')}</th>
              <th>${I18n.t('products.sold')}</th>
              <th>${I18n.t('products.availability')}</th>
            </tr>
          </thead>
          <tbody>${rows.map(renderRow).join('')}</tbody>
        </table></div>`;

        UI.hydrateImages(el);

        const from = state.page * PAGE_SIZE + 1;
        const to = state.page * PAGE_SIZE + rows.length;
        document.getElementById('pager-label').textContent =
          I18n.t('products.showing', { from, to, total: typeof total === 'number' ? total : to });
        document.getElementById('prev').disabled = state.page === 0;
        document.getElementById('next').disabled =
          typeof total === 'number' ? to >= total : rows.length < PAGE_SIZE;
        pager.hidden = false;
      } catch (err) {
        Layout.error(el, err.message);
      }
    }

    load();
