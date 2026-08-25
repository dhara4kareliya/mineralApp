/**
 * Formatting and time helpers.
 */
const Utils = {
  pad2(n) {
    return String(n).padStart(2, '0');
  },

  /** Parse API elapsed "HH:MM:SS" or "H:MM" to seconds */
  parseElapsed(str) {
    if (!str) return 0;
    const parts = String(str).split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
    return 0;
  },

  formatDuration(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${Utils.pad2(m)}m`;
    return `${m}m ${Utils.pad2(sec)}s`;
  },

  formatClock(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${Utils.pad2(h)}:${Utils.pad2(m)}:${Utils.pad2(sec)}`;
  },

  /** Parse "80:30", "0:01", or "00:00:52" style strings to seconds */
  parseTimeToSeconds(str) {
    if (!str) return 0;
    const parts = String(str).trim().split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
    return Number(parts[0] || 0) * 3600;
  },

  formatClockFromTimeString(str) {
    return Utils.formatClock(Utils.parseTimeToSeconds(str));
  },

  /** Parse "80:30" style month total to minutes */
  parseHourMinute(str) {
    if (!str) return 0;
    const parts = String(str).split(':').map(Number);
    if (parts.length >= 2) return parts[0] * 60 + parts[1];
    return Number(parts[0] || 0) * 60;
  },

  formatHourMinute(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${Utils.pad2(m)}m`;
  },

  toMonthKey(date) {
    const d = date || new Date();
    return `${d.getFullYear()}-${Utils.pad2(d.getMonth() + 1)}`;
  },

  /** Parse API datetime — ISO or MySQL UTC "Y-m-d H:i:s" */
  parseApiDate(dateStr) {
    if (!dateStr) return null;
    const s = String(dateStr).trim();
    if (!s || s.startsWith('0000')) return null;

    if (s.includes('T')) {
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    const d = new Date(s.replace(' ', 'T') + 'Z');
    return Number.isNaN(d.getTime()) ? null : d;
  },

  toDateKey(dateStr) {
    const d = Utils.parseApiDate(dateStr);
    if (!d) return '—';
    const locale = typeof I18n !== 'undefined' ? I18n.getLocale() : undefined;
    return d.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
  },

  toTimeStr(dateStr) {
    const d = Utils.parseApiDate(dateStr);
    if (!d) return '—';
    const locale = typeof I18n !== 'undefined' ? I18n.getLocale() : undefined;
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  },

  formatMonthLabel(monthKey) {
    const [y, m] = String(monthKey || '').split('-').map(Number);
    if (!y || !m) return monthKey || '—';
    const d = new Date(y, m - 1, 1);
    const locale = typeof I18n !== 'undefined' ? I18n.getLocale() : undefined;
    return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  },

  /** Seconds for a session row — uses elapsed or calculates from start/end */
  sessionDurationSeconds(row) {
    const elapsedSec = Utils.parseElapsed(row.elapsed);
    if (elapsedSec > 0) return elapsedSec;

    const start = Utils.parseApiDate(row.start_time || row.start);
    const end = Utils.parseApiDate(row.end_time || row.stop_time || row.end);
    if (start && end && end > start) {
      return Math.floor((end - start) / 1000);
    }
    if (Number(row.status) === 1 && start) {
      return Math.max(0, Math.floor((Date.now() - start) / 1000));
    }
    return 0;
  },

  formatSessionDuration(row) {
    const sec = Utils.sessionDurationSeconds(row);
    if (sec > 0) return Utils.formatClock(sec);
    if (row.elapsed && row.elapsed !== '00:00:00') return row.elapsed;
    return '—';
  },

  populateMonthSelect(selectEl, monthsBack) {
    if (!selectEl) return;
    const count = monthsBack || 24;
    const now = new Date();
    const currentKey = Utils.toMonthKey(now);
    const prev = selectEl.value;

    selectEl.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = Utils.toMonthKey(d);
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = Utils.formatMonthLabel(key);
      selectEl.appendChild(opt);
    }

    selectEl.value = prev && [...selectEl.options].some((o) => o.value === prev) ? prev : currentKey;
  },

  monthStartEnd(monthKey) {
    const [y, m] = monthKey.split('-').map(Number);
    const from = `${y}-${Utils.pad2(m)}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${y}-${Utils.pad2(m)}-${Utils.pad2(lastDay)}`;
    return { from, to };
  },

  todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${Utils.pad2(d.getMonth() + 1)}-${Utils.pad2(d.getDate())}`;
  },

  debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  },

  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  isEmptyHours(val) {
    if (val == null || val === '') return true;
    const s = String(val).trim();
    return !s || s === '0:00' || s === '00:00' || s === '00:00:00' || s === '0';
  },

  displayHours(val) {
    if (Utils.isEmptyHours(val)) return '';
    return String(val).trim();
  },

  normalizeFiles(files) {
    if (!files) return [];
    let list = files;
    if (typeof files === 'string') {
      const trimmed = files.trim();
      if (!trimmed || trimmed === '[]') return [];
      try {
        list = JSON.parse(trimmed);
      } catch (_) {
        list = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    if (!Array.isArray(list)) list = [list];
    return list.map((item) => {
      if (!item) return null;
      if (typeof item === 'string') {
        return { name: item.split('/').pop(), url: item };
      }
      const url = item.url || item.path || item.file || item.src || item.link || '';
      const name = item.name || item.filename || item.title || String(url).split('/').pop() || 'file';
      return url || name ? { name, url } : null;
    }).filter(Boolean);
  },

  fileHref(url) {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    const domain = typeof AppConfig !== 'undefined' ? AppConfig.getDomain() : '';
    if (!domain) return url;
    return `${domain.replace(/\/+$/, '')}/${String(url).replace(/^\/+/, '')}`;
  }
};
