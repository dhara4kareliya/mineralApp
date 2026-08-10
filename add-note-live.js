/**
 * Add customer note — Chat.SendCustomer (from: send_notes)
 * Per Biz1 API: internal notes appear on customer timeline (message.created).
 */
(function () {
  'use strict';

  var state = {
    type: 'call',
    visibleToAll: true,
    customerId: '',
    customerName: '',
    customerPhone: '',
    backHref: 'leads-list.html',
    busy: false,
    wired: false
  };

  var TYPE_LABELS = {
    call: { en: 'Call', he: 'שיחה' },
    whatsapp: { en: 'WhatsApp', he: 'וואטסאפ' },
    general: { en: 'General', he: 'כללי' }
  };

  function t(en, he) {
    if (typeof window.t === 'function') return window.t(en, he);
    var isEn = typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage() === 'en';
    return isEn ? en : (he || en);
  }

  function qs() {
    return new URLSearchParams(location.search || '');
  }

  function safeBackHref(raw) {
    if (!raw) return '';
    try { raw = decodeURIComponent(String(raw)); } catch (e) { raw = String(raw); }
    raw = String(raw || '').trim();
    if (!raw || /^javascript:/i.test(raw) || raw.indexOf('//') === 0) return '';
    if (/^https?:/i.test(raw)) {
      try {
        var abs = new URL(raw, location.href);
        if (abs.origin !== location.origin) return '';
        return (abs.pathname.split('/').pop() || '') + abs.search + abs.hash;
      } catch (e2) { return ''; }
    }
    if (raw.indexOf('..') >= 0) return '';
    return raw.replace(/^\//, '');
  }

  function resolveCustomerId() {
    var p = qs();
    var cid = String(
      p.get('customer_id') || p.get('cust_id') || p.get('contactus_id') || ''
    ).trim();
    if (cid) return cid;
    try {
      cid = sessionStorage.getItem('mb_customer_id') || localStorage.getItem('mb_customer_id') || '';
    } catch (e0) { cid = ''; }
    return String(cid || '').trim();
  }

  function resolveBackHref() {
    var p = qs();
    var fromParam = safeBackHref(p.get('back') || p.get('from') || p.get('return'));
    if (fromParam) return fromParam;
    var cid = resolveCustomerId();
    if (cid) return 'lead-card.html?customer_id=' + encodeURIComponent(cid) + '&cust_id=' + encodeURIComponent(cid);
    return 'leads-list.html';
  }

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function fmtDisplayDate(d) {
    d = d || new Date();
    var now = new Date();
    var sameDay = d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    var time = pad(d.getHours()) + ':' + pad(d.getMinutes());
    if (sameDay) return t('Today, ', 'היום, ') + time;
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + String(d.getFullYear()).slice(-2) + ', ' + time;
  }

  function toDatetimeLocalValue(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function parseDatetimeLocalValue(v) {
    if (!v) return new Date();
    var d = new Date(v);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }

  function showToast(msg, kind) {
    var el = document.getElementById('mb-note-toast');
    if (!el) return;
    el.textContent = String(msg || '');
    el.style.background = kind === 'error' ? '#a3302e' : '#16223a';
    el.style.display = 'block';
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () { el.style.display = 'none'; }, 2800);
  }

  function setChipStyles() {
    document.querySelectorAll('[data-note-type]').forEach(function (btn) {
      var id = btn.getAttribute('data-note-type') || '';
      var active = id === state.type;
      btn.style.background = active ? '#ece8f7' : '#fff';
      btn.style.borderColor = active ? '#c5b9e8' : '#e4e8ee';
      btn.style.color = active ? '#5847a8' : '#5a6473';
    });
  }

  function setVisibilityLabel() {
    var el = document.getElementById('mb-note-visibility');
    if (!el) return;
    el.textContent = state.visibleToAll
      ? t('visible to all', 'גלוי לכולם')
      : t('private note', 'הערה פרטית');
  }

  function updateDateLabel() {
    var input = document.getElementById('mb-note-datetime');
    var label = document.getElementById('mb-note-date-label');
    if (!label) return;
    var d = input ? parseDatetimeLocalValue(input.value) : new Date();
    label.textContent = fmtDisplayDate(d);
  }

  function bindUi() {
    if (state.wired) return;
    state.wired = true;

    document.querySelectorAll('[data-note-type]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.type = btn.getAttribute('data-note-type') || 'general';
        setChipStyles();
      });
    });

    var closeBtn = document.getElementById('mb-note-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        if (e && e.preventDefault) e.preventDefault();
        location.href = state.backHref;
      });
    }

    var visBtn = document.getElementById('mb-note-visibility');
    if (visBtn) {
      visBtn.addEventListener('click', function () {
        state.visibleToAll = !state.visibleToAll;
        setVisibilityLabel();
      });
    }

    var dtInput = document.getElementById('mb-note-datetime');
    if (dtInput) {
      dtInput.addEventListener('change', updateDateLabel);
      var dateBox = document.getElementById('mb-note-date-box');
      if (dateBox) {
        dateBox.addEventListener('click', function () {
          try { dtInput.showPicker(); } catch (e0) { dtInput.focus(); }
        });
      }
    }

    var saveBtn = document.getElementById('mb-note-save');
    if (saveBtn) saveBtn.addEventListener('click', saveNote);
  }

  function buildMessage(content) {
    content = String(content || '').trim();
    if (!content) return '';

    var typeKey = state.type in TYPE_LABELS ? state.type : 'general';
    var isEn = typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage() === 'en';
    var parts = [];

    if (!state.visibleToAll) {
      parts.push(isEn ? 'Private' : 'פרטי');
    }

    if (typeKey !== 'general') {
      parts.push(isEn ? TYPE_LABELS[typeKey].en : TYPE_LABELS[typeKey].he);
    }

    if (parts.length) {
      return parts.join(' — ') + ': ' + content;
    }
    return content;
  }

  var saveFlight = null;

  async function persistNote(msg) {
    var cid = state.customerId;
    if (!window.MineralBarApp) {
      throw new Error(t('App not ready', 'האפליקציה לא מוכנה'));
    }
    if (typeof MineralBarApp.sendCustomerNote === 'function') {
      return MineralBarApp.sendCustomerNote(cid, msg);
    }
    if (typeof MineralBarApp.sendCustomerMessage === 'function') {
      return MineralBarApp.sendCustomerMessage({
        customer_id: cid,
        message: msg,
        from: 'send_notes'
      });
    }
    if (MineralBarApp.getClient) {
      var raw = await MineralBarApp.getClient().request('Chat.SendCustomer', {
        customer_id: cid,
        message: msg,
        from: 'send_notes'
      });
      if (!(raw && (Number(raw.success) === 1 || raw.success === true || Number(raw.output) === 1))) {
        throw new Error((raw && (raw.message || raw.error)) || 'Chat.SendCustomer failed');
      }
      return raw;
    }
    throw new Error(t('App not ready', 'האפליקציה לא מוכנה'));
  }

  async function saveNote(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (saveFlight) return saveFlight;
    if (state.busy) return;

    saveFlight = (async function () {
    state.busy = true;

    if (!state.customerId) {
      state.customerId = resolveCustomerId();
    }

    var contentEl = document.getElementById('mb-note-content');
    var content = contentEl ? String(contentEl.value || '').trim() : '';
    if (!content) {
      showToast(t('Write the comment first', 'כתוב את ההערה'), 'error');
      if (contentEl) contentEl.focus();
      state.busy = false;
      return;
    }
    if (!state.customerId) {
      showToast(t('Missing customer', 'חסר לקוח'), 'error');
      state.busy = false;
      return;
    }

    var saveBtn = document.getElementById('mb-note-save');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.style.opacity = '0.72';
      var saveText = saveBtn.querySelector('[data-save-label]');
      if (saveText) saveText.textContent = t('Saving…', 'שומר…');
    }

    try {
      var msg = buildMessage(content);
      await persistNote(msg);
      try {
        sessionStorage.setItem('mb_note_saved_' + state.customerId, String(Date.now()));
      } catch (eStore) { /* ignore */ }
      showToast(t('Note saved!', 'ההערה נשמרה!'));
      setTimeout(function () { location.href = state.backHref; }, 700);
    } catch (err) {
      showToast((err && err.message) || t('Save failed', 'שמירה נכשלה'), 'error');
      state.busy = false;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
        var saveLabel = saveBtn.querySelector('[data-save-label]');
        if (saveLabel) saveLabel.textContent = t('Save a note', 'שמור הערה');
      }
    }
    })();

    try {
      await saveFlight;
    } finally {
      saveFlight = null;
    }
  }

  function hydratePeek() {
    var nameEl = document.getElementById('mb-note-peek-name');
    var subEl = document.getElementById('mb-note-peek-sub');
    var avEl = document.getElementById('mb-note-peek-avatar');
    if (nameEl) nameEl.textContent = state.customerName || t('Customer', 'לקוח');
    if (subEl) {
      subEl.textContent = state.customerPhone
        ? state.customerPhone
        : (state.customerId ? ('#' + state.customerId) : '');
    }
    if (avEl) {
      var name = state.customerName || '?';
      var parts = String(name).trim().split(/\s+/).filter(Boolean);
      var initials = parts.length >= 2
        ? (parts[0].charAt(0) + parts[1].charAt(0))
        : String(name).slice(0, 2);
      avEl.textContent = initials.toUpperCase();
    }
  }

  async function loadCustomer() {
    if (!state.customerId || !window.MineralBarApp || typeof MineralBarApp.getCustomer !== 'function') return;
    try {
      var c = await MineralBarApp.getCustomer(state.customerId);
      if (!c) return;
      state.customerName = c.name || state.customerName;
      state.customerPhone = c.mobile || c.phone || state.customerPhone;
      hydratePeek();
    } catch (e) { /* ignore */ }
  }

  function initPage() {
    var p = qs();
    state.customerId = resolveCustomerId();
    state.customerName = String(p.get('name') || '').trim();
    state.customerPhone = String(p.get('phone') || p.get('mobile') || '').trim();
    state.backHref = resolveBackHref();

    var title = document.getElementById('mb-note-title');
    if (title) title.textContent = t('Add a comment', 'הוסף הערה');

    var typeLabel = document.getElementById('mb-note-type-label');
    if (typeLabel) typeLabel.textContent = t('Comment type', 'סוג הערה');

    var contentLabel = document.getElementById('mb-note-content-label');
    if (contentLabel) contentLabel.innerHTML = t('The content of the note ', 'תוכן ההערה ') + '<span style="color:#d06262;">*</span>';

    var detailsLabel = document.getElementById('mb-note-details-label');
    if (detailsLabel) detailsLabel.textContent = t('details', 'פרטים');

    var dtTitle = document.getElementById('mb-note-datetime-title');
    if (dtTitle) dtTitle.textContent = t('Date and time', 'תאריך ושעה');

    var contentEl = document.getElementById('mb-note-content');
    if (contentEl) contentEl.placeholder = t('Write the comment here...', 'כתוב את ההערה כאן...');

    var saveBtn = document.getElementById('mb-note-save');
    if (saveBtn) {
      var saveText = saveBtn.querySelector('[data-save-label]');
      if (saveText) saveText.textContent = t('Save a note', 'שמור הערה');
    }

    var dtInput = document.getElementById('mb-note-datetime');
    if (dtInput && !dtInput.value) dtInput.value = toDatetimeLocalValue(new Date());

    hydratePeek();
    setChipStyles();
    setVisibilityLabel();
    updateDateLabel();
    bindUi();
    loadCustomer();
  }

  function boot() {
    initPage();
  }

  window.mbSaveLeadNote = saveNote;

  window.addEventListener('mineralbar:ready', function () { setTimeout(boot, 60); });
  window.addEventListener('mineralbar:page-refresh', function () { setTimeout(boot, 60); });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 120); });
  } else {
    setTimeout(boot, 120);
  }
})();
