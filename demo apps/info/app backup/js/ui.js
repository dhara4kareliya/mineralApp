/**
 * Small UI helpers
 */
const UI = (() => {
  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return [...root.querySelectorAll(sel)];
  }

  function param(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function locale() {
    return typeof I18n !== 'undefined' ? I18n.locale() : undefined;
  }

  function formatMoney(amount, coin = '') {
    if (amount === undefined || amount === null || amount === '') return '—';
    const n = Number(amount);
    const formatted = Number.isFinite(n)
      ? n.toLocaleString(locale(), { minimumFractionDigits: 0, maximumFractionDigits: 2 })
      : String(amount);
    return `${coin || ''}${formatted}`.trim();
  }

  function formatDate(value) {
    if (!value) return '—';
    const d = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString(locale(), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatDateOnly(value) {
    if (!value) return '—';
    const s = String(value).slice(0, 10);
    const d = new Date(s + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString(locale(), { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function daysBetween(start, end) {
    const a = new Date(start);
    const b = new Date(end);
    if (Number.isNaN(a) || Number.isNaN(b)) return 1;
    const diff = Math.ceil((b - a) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff);
  }

  function toDisplayDate(iso) {
    if (!iso) return '';
    const [y, m, d] = String(iso).slice(0, 10).split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  }

  async function withButton(btn, fn) {
    if (!btn) return fn();
    const prev = btn.innerHTML;
    btn.disabled = true;
    btn.dataset.loading = '1';
    try {
      return await fn();
    } finally {
      btn.disabled = false;
      btn.innerHTML = prev;
      delete btn.dataset.loading;
    }
  }

  function assetBase() {
    const base =
      window.CP_CONFIG?.FILES_BASE ||
      window.CP_CONFIG?.ASSET_BASE ||
      window.CP_CONFIG?.API_BASE ||
      '';
    return String(base).replace(/\/$/, '');
  }

  /** Turn API paths like biz1upload/app/.../file.png into a full CDN URL */
  function assetUrl(path) {
    if (!path) return '';
    const p = String(path).trim().replace(/\\/g, '/');
    if (/^https?:\/\//i.test(p)) {
      if (p.includes('biz1upload/')) {
        const idx = p.indexOf('biz1upload/');
        return `${assetBase()}/${p.slice(idx)}`;
      }
      return p;
    }
    const base = assetBase();
    if (!base) return p;
    const cleaned = p.replace(/^\//, '');
    if (cleaned.startsWith('biz1upload/')) return `${base}/${cleaned}`;
    return `${base}/${cleaned}`;
  }

  const imageBlobCache = new Map();

  async function loadAuthImage(img) {
    const path = img.dataset.assetSrc;
    if (!path) return;

    const wrap = img.closest('.product-thumb-wrap');
    const placeholder = wrap?.querySelector('.product-list-thumb-placeholder');

    if (imageBlobCache.has(path)) {
      const cached = imageBlobCache.get(path);
      img.src = cached;
      img.hidden = false;
      placeholder?.remove();
      wrap?.classList.remove('loading');
      if (wrap) wrap.href = cached;
      return;
    }

    const url = assetUrl(path);
    const headers = {};
    if (typeof Auth !== 'undefined' && Auth.getToken()) {
      headers.Authorization = `Bearer ${Auth.getToken()}`;
    }

    try {
      const res = await fetch(url, { method: 'GET', headers, credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) throw new Error('Not an image');

      const blob = await res.blob();
      if (!blob.type.startsWith('image/')) throw new Error('Not an image');

      const objectUrl = URL.createObjectURL(blob);
      imageBlobCache.set(path, objectUrl);
      img.src = objectUrl;
      img.hidden = false;
      placeholder?.remove();
      wrap?.classList.remove('loading');
      if (wrap) {
        wrap.href = objectUrl;
        wrap.target = '_blank';
        wrap.rel = 'noopener';
      }
    } catch {
      img.remove();
      wrap?.classList.add('no-image');
      wrap?.classList.remove('loading');
      if (wrap) {
        wrap.removeAttribute('href');
        wrap.removeAttribute('target');
      }
    }
  }

  function hydrateImages(root = document) {
    qsa('img[data-asset-src]', root).forEach((img) => loadAuthImage(img));
  }

  function pdfDocumentUrl(item) {
    if (!item) return '';
    const directFields = [
      'view_url',
      'sign_url',
      'download_url',
      'pdf_url',
      'file_url',
      'url',
      'link',
      'filename',
      'file',
      'pdf_file',
      'document_path',
    ];
    for (const f of directFields) {
      if (item[f]) return String(item[f]).startsWith('http') ? String(item[f]) : assetUrl(item[f]);
    }
    for (const v of Object.values(item)) {
      if (typeof v === 'string' && /(\.pdf|biz1upload|\/upload\/)/i.test(v)) return assetUrl(v);
    }
    const tpl = window.CP_CONFIG?.PDF_VIEW_URL;
    if (!tpl || !item.id) return '';
    const path = tpl
      .replace('{id}', encodeURIComponent(item.id))
      .replace('{pdf_signer_id}', encodeURIComponent(item.pdf_signer_id || ''))
      .replace('{cust_id}', encodeURIComponent(item.cust_id || ''));
    return `${assetBase()}${path.startsWith('/') ? path : `/${path}`}`;
  }

  function pdfViewerPageUrl(item) {
    const params = new URLSearchParams({
      id: item.id || '',
      pdf_signer_id: item.pdf_signer_id || '',
      name: item.pdf_name || item.name || `Document ${item.id}`,
    });
    const direct = pdfDocumentUrl(item);
    if (direct) params.set('src', direct);
    return `pdf-view.html?${params}`;
  }

  /** Normalize API list responses — array, array-like object, or a single record */
  function listRows(payload) {
    if (!payload) return [];
    const d = payload.data !== undefined ? payload.data : payload;
    if (Array.isArray(d)) return d.filter((item) => item != null);
    if (!d || typeof d !== 'object') return [];
    const keys = Object.keys(d);
    if (keys.length && keys.every((k) => /^\d+$/.test(k))) {
      return keys.sort((a, b) => Number(a) - Number(b)).map((k) => d[k]);
    }
    if (d.id != null || d.ticket_id != null || d.product_name != null) return [d];
    return [];
  }

  function listCount(payload) {
    if (!payload) return 0;
    const total = payload.count ?? payload.recordsTotal ?? payload.total_record;
    if (typeof total === 'number') return total;
    if (total !== undefined && total !== '') return Number(total) || 0;
    return listRows(payload).length;
  }

  return {
    qs,
    qsa,
    param,
    formatMoney,
    formatDate,
    formatDateOnly,
    daysBetween,
    toDisplayDate,
    withButton,
    assetUrl,
    hydrateImages,
    pdfDocumentUrl,
    pdfViewerPageUrl,
    listRows,
    listCount,
  };
})();

window.UI = UI;
