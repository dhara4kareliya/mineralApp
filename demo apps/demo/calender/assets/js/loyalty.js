(function () {
  'use strict';

  const CFG = window.Biz1Config || {};
  const PUNCH_TARGET = Number(CFG.loyaltyPunchTarget) || 10;
  const LOYALTY_KEY = 'biz1_loyalty_v1';
  const LANG_KEY = 'biz1_booking_lang';
  const I18N = {
    en: {
      backToCalendar: 'Back to Calendar',
      heroEyebrow: 'Digital Loyalty Card',
      heroTitle: 'Member rewards',
      heroSub: '10th visit free · punch tracker · visit history',
      tierMember: 'Member',
      tierNew: 'New member',
      tierRegular: 'Regular',
      tierVip: 'VIP Gold',
      punchCardTitle: 'Punch card · 10th visit free',
      markVisit: 'Mark Visit Complete',
      redeemFree: 'Redeem free visit',
      visitLogs: 'Visit logs',
      colDate: 'Date',
      colService: 'Service',
      colStaff: 'Staff',
      colStatus: 'Status',
      freeUnlocked: 'Free visit unlocked — redeem anytime!',
      progressText: '{done}/{target} visits — {left} more for free visit',
      freeAvailable: '1 Free Visit Available',
      rewardsBalance: 'Rewards balance: {count} redeemed · keep booking to unlock the next free visit',
      noVisits: 'No visits yet',
      statusDone: 'Done',
      statusFree: 'Free',
      toastCardFull: 'Punch card full — redeem your free visit',
      toastUnlocked: 'Free visit unlocked!',
      toastMarked: 'Visit marked complete',
      toastRedeemed: 'Reward redeemed — punch card reset',
      walkIn: 'Walk-in visit',
      freeVisit: 'Free reward visit',
      frontDesk: 'Front desk',
      appointment: 'Appointment',
      staffPrefix: 'Staff #'
    },
    he: {
      backToCalendar: 'חזרה ליומן',
      heroEyebrow: 'כרטיס נאמנות דיגיטלי',
      heroTitle: 'הטבות לחברים',
      heroSub: 'ביקור 10 חינם · מעקב ניקוב · היסטוריית ביקורים',
      tierMember: 'חבר',
      tierNew: 'חבר חדש',
      tierRegular: 'רגיל',
      tierVip: 'VIP זהב',
      punchCardTitle: 'כרטיס ניקוב · ביקור 10 חינם',
      markVisit: 'סמן ביקור כהושלם',
      redeemFree: 'מימוש ביקור חינם',
      visitLogs: 'יומן ביקורים',
      colDate: 'תאריך',
      colService: 'שירות',
      colStaff: 'צוות',
      colStatus: 'סטטוס',
      freeUnlocked: 'ביקור חינם נפתח — ניתן לממש בכל רגע!',
      progressText: '{done}/{target} ביקורים — עוד {left} לביקור חינם',
      freeAvailable: 'ביקור חינם אחד זמין',
      rewardsBalance: 'יתרת הטבות: {count} מומשו · המשיכו להזמין לפתיחת הביקור החינמי הבא',
      noVisits: 'עדיין אין ביקורים',
      statusDone: 'בוצע',
      statusFree: 'חינם',
      toastCardFull: 'כרטיס הניקוב מלא — מימשו את הביקור החינמי',
      toastUnlocked: 'ביקור חינם נפתח!',
      toastMarked: 'הביקור סומן כהושלם',
      toastRedeemed: 'ההטבה מומשה — כרטיס הניקוב אופס',
      walkIn: 'ביקור ללא תור',
      freeVisit: 'ביקור הטבה חינם',
      frontDesk: 'דלפק קבלה',
      appointment: 'פגישה',
      staffPrefix: 'צוות #'
    }
  };
  let currentLang = 'en';

  function t(key, vars) {
    const dict = I18N[currentLang] || I18N.en;
    let text = dict[key] || I18N.en[key] || key;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        text = text.replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]));
      });
    }
    return text;
  }

  function getLanguage() {
    const saved = (localStorage.getItem(LANG_KEY) || '').toLowerCase();
    return saved === 'he' ? 'he' : 'en';
  }

  function applyLanguage(lang) {
    currentLang = lang === 'he' ? 'he' : 'en';
    const dict = I18N[currentLang];
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'he' ? 'rtl' : 'ltr';
    localStorage.setItem(LANG_KEY, currentLang);

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) el.textContent = dict[key];
    });

    document.querySelectorAll('#langSwitch [data-lang]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === currentLang);
    });

    if (loyaltyState) renderAll();
  }

  /** Same as biz1_ticket: domain from Biz1Config.user → https://{user}.bull36.com */
  function normalizeTenantUser(raw) {
    var s = String(raw == null ? '' : raw).trim().toLowerCase();
    s = s.replace(/^https?:\/\//, '');
    s = s.replace(/\.bull36\.com.*$/i, '');
    s = s.split('/')[0];
    s = s.replace(/[^a-z0-9-]/g, '');
    return s;
  }

  function resolveDomain() {
    var user = normalizeTenantUser(CFG.user || CFG.tenant || CFG.account);
    if (!user) throw new Error('Set Biz1Config.user in assets/config.js (Bull36 subdomain)');
    return 'https://' + user + '.bull36.com';
  }

  const BIZ1_DOMAIN = resolveDomain();

  function getToken() {
    return (window.localStorage && localStorage.getItem('biz1_sdk_bearer_token')) || '';
  }

  if (!getToken()) {
    window.location.href = 'index.html';
    return;
  }

  async function apiPost(route, body) {
    const params = new URLSearchParams();
    Object.keys(body || {}).forEach((k) => {
      if (body[k] !== undefined && body[k] !== null && body[k] !== '') {
        params.set(k, String(body[k]));
      }
    });
    const headers = { Authorization: 'Bearer ' + getToken() };
    const res = await fetch(BIZ1_DOMAIN + '/app/' + route, {
      method: 'POST',
      headers,
      body: params
    });
    if (res.status === 401) {
      localStorage.removeItem('biz1_sdk_bearer_token');
      window.location.href = 'index.html';
      throw new Error('Unauthorized');
    }
    const data = await res.json().catch(() => ({ success: 0, message: 'Invalid JSON' }));
    const ok = data.success === 1 || data.success === '1';
    if (!ok) throw new Error(data.message || route + ' failed');
    return data;
  }

  function parseBiz1DateTime(str) {
    if (!str) return '';
    const s = String(str).trim();
    let m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
    if (m) return m[3] + '-' + m[2] + '-' + m[1];
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + '-' + m[2] + '-' + m[3];
    return '';
  }

  function loadLoyaltyStore() {
    try {
      return JSON.parse(localStorage.getItem(LOYALTY_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveLoyaltyStore(store) {
    localStorage.setItem(LOYALTY_KEY, JSON.stringify(store));
  }

  function getMemberState(customerId) {
    const store = loadLoyaltyStore();
    const key = String(customerId || 'anon');
    if (!store[key]) {
      store[key] = {
        visits_count: 0,
        reward_available: false,
        redeemed_count: 0,
        manual_logs: []
      };
      saveLoyaltyStore(store);
    }
    return store[key];
  }

  function setMemberState(customerId, state) {
    const store = loadLoyaltyStore();
    store[String(customerId || 'anon')] = state;
    saveLoyaltyStore(store);
  }

  function isFreeLog(log) {
    return !!(
      log &&
      (log.is_free ||
        log.status === 'free' ||
        log.service_key === 'freeVisit' ||
        log.serviceKey === 'freeVisit')
    );
  }

  function logDedupeKey(log) {
    return [
      log.id || '',
      log.appointment_id || '',
      log.date || '',
      log.service_key || log.service || '',
      log.staff_id || log.staff_key || log.staff || ''
    ].join('|');
  }

  function mergeVisitLogs(apiLogs, manualLogs) {
    const out = [];
    const seen = new Set();
    (apiLogs || []).concat(manualLogs || []).forEach((log) => {
      if (!log || !log.date) return;
      const key = logDedupeKey(log);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(log);
    });
    return out;
  }

  /** Punch count = non-free visits after the latest redeemed free visit. */
  function countPunchVisits(allLogs) {
    const sorted = (allLogs || []).slice().sort((a, b) => {
      const da = String(a.date || '');
      const db = String(b.date || '');
      if (da !== db) return da.localeCompare(db);
      return Number(!!isFreeLog(a)) - Number(!!isFreeLog(b));
    });
    let start = 0;
    sorted.forEach((log, i) => {
      if (isFreeLog(log)) start = i + 1;
    });
    return sorted.slice(start).filter((log) => !isFreeLog(log)).length;
  }

  let loyaltyState = null;
  let customerId = '';

  async function fetchLoyaltyData(clientName, custId, mobileHint) {
    let visitLogs = [];
    let name = clientName || 'Customer';
    let mobile = mobileHint || '';

    if (custId) {
      try {
        const cust = await apiPost('Customer.Get', { customer_id: custId });
        const row = cust.data || cust.customer || cust;
        name = row.name || row.client_name || name;
        mobile = row.mobile || row.phone || mobile;
      } catch (e) {
        console.warn('[Biz1] Customer.Get', e);
      }

      try {
        const data = await apiPost('Calendar.List', { customer_id: custId, limit: 25 });
        const items = data.data || [];
        visitLogs = items
          .filter((item) => {
            const cid = item.customer_id || item.cust_id || item.client_id || '';
            // If API returns customer_id, keep only this member; otherwise keep row
            return !cid || String(cid) === String(custId);
          })
          .map((item) => {
            const hasTitle = !!(item.title && String(item.title).trim());
            const teamId = item.team_member_id || '';
            const apptId = item.appointment_id || item.id || '';
            return {
              date: parseBiz1DateTime(item.date_time),
              service: hasTitle ? item.title : t('appointment'),
              service_key: hasTitle ? '' : 'appointment',
              staff: teamId ? t('staffPrefix') + teamId : '—',
              staff_id: teamId ? String(teamId) : '',
              appointment_id: apptId ? String(apptId) : '',
              status: 'done'
            };
          })
          .filter((l) => l.date);
      } catch (e) {
        console.warn('[Biz1] Calendar.List', e);
      }
    }

    const local = getMemberState(custId);
    const allLogs = mergeVisitLogs(visitLogs, local.manual_logs || []);
    // Always derive punch count from real logs — never keep a higher stale localStorage value
    const visitsCount = Math.min(countPunchVisits(allLogs), PUNCH_TARGET);
    local.visits_count = visitsCount;
    local.reward_available = visitsCount >= PUNCH_TARGET;
    setMemberState(custId, local);

    return {
      customer: { name: name, mobile: mobile },
      visits_count: visitsCount,
      punch_target: PUNCH_TARGET,
      reward_available: visitsCount >= PUNCH_TARGET,
      redeemed_count: local.redeemed_count || 0,
      visit_logs: allLogs
    };
  }

  document.addEventListener('DOMContentLoaded', async () => {
    applyLanguage(getLanguage());

    const params = new URLSearchParams(window.location.search);
    const clientName = params.get('client') || 'Customer';
    customerId = params.get('customer_id') || '';
    const mobile = params.get('mobile') || '';

    loyaltyState = await fetchLoyaltyData(clientName, customerId, mobile);
    renderAll();

    document.getElementById('markVisitBtn').addEventListener('click', markVisitComplete);
    document.getElementById('themeToggleLoyalty').addEventListener('click', () => {
      document.body.dataset.theme =
        document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    });
    document.getElementById('langSwitch').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-lang]');
      if (!btn) return;
      applyLanguage(btn.getAttribute('data-lang'));
    });
  });

  function renderAll() {
    renderMemberHeader();
    renderPunchCard();
    renderRewardBalance();
    renderVisitLogs();
  }

  function renderMemberHeader() {
    const { customer, visits_count, redeemed_count } = loyaltyState;
    document.getElementById('memberName').textContent = customer.name;
    document.getElementById('memberMobile').textContent = customer.mobile || '—';
    document.getElementById('memberAvatar').textContent = (customer.name || 'C')
      .charAt(0)
      .toUpperCase();
    const tier = document.getElementById('memberTier');
    if (redeemed_count >= 3) tier.textContent = t('tierVip');
    else if (visits_count >= 5 || redeemed_count >= 1) tier.textContent = t('tierRegular');
    else tier.textContent = t('tierNew');
  }

  function renderPunchCard() {
    const { visits_count, punch_target, reward_available } = loyaltyState;
    const grid = document.getElementById('punchGrid');
    grid.innerHTML = '';

    for (let i = 1; i <= punch_target; i++) {
      const box = document.createElement('div');
      box.className = 'punch-box';
      const isLast = i === punch_target;
      const isPunched = i <= visits_count;
      if (isLast) box.classList.add('punch-box-reward');
      if (isPunched) box.classList.add('punched');
      if (isPunched && isLast) box.innerHTML = giftIconSVG();
      else if (isPunched) box.innerHTML = checkIconSVG();
      else if (isLast) box.innerHTML = giftIconSVG(true);
      else box.textContent = i;
      grid.appendChild(box);
    }

    const remaining = Math.max(punch_target - visits_count, 0);
    document.getElementById('punchProgressText').textContent = reward_available
      ? t('freeUnlocked')
      : t('progressText', { done: visits_count, target: punch_target, left: remaining });
    document.getElementById('punchProgressFill').style.width =
      Math.min((visits_count / punch_target) * 100, 100) + '%';
  }

  function renderRewardBalance() {
    const { reward_available, redeemed_count } = loyaltyState;
    const card = document.getElementById('rewardBalanceCard');
    const label = document.getElementById('rewardBalanceLabel');
    const redeemBtn = document.getElementById('redeemBtn');

    if (reward_available) {
      card.classList.add('reward-available');
      label.textContent = t('freeAvailable');
      redeemBtn.style.display = 'inline-flex';
    } else {
      card.classList.remove('reward-available');
      label.textContent = t('rewardsBalance', { count: redeemed_count || 0 });
      redeemBtn.style.display = 'none';
    }
    redeemBtn.onclick = redeemReward;
  }

  function localizeLogService(log) {
    const key = log.service_key || log.serviceKey;
    if (key && (I18N.en[key] || I18N.he[key])) return t(key);
    const raw = String(log.service || '').trim();
    if (!raw) return '—';

    const known = {
      'Walk-in visit': 'walkIn',
      'ביקור ללא תור': 'walkIn',
      'Free reward visit': 'freeVisit',
      'ביקור הטבה חינם': 'freeVisit',
      Appointment: 'appointment',
      פגישה: 'appointment'
    };
    if (known[raw]) return t(known[raw]);

    if (currentLang !== 'he') return raw;

    // Translate dynamic API titles while keeping client names
    let m = raw.match(/^General Appointment\s*\((\d+)\s*min\)\s*[—–-]\s*(.+)$/i);
    if (m) return 'פגישה כללית (' + m[1] + " דק') — " + m[2];

    m = raw.match(/^General Appointment\s*\((\d+)\s*min\)\s*$/i);
    if (m) return 'פגישה כללית (' + m[1] + " דק')";

    m = raw.match(/^General Appointment\s*[—–-]\s*(.+)$/i);
    if (m) return 'פגישה כללית — ' + m[1];

    m = raw.match(/^Appointment with\s+(.+)$/i);
    if (m) return 'פגישה עם ' + m[1];

    m = raw.match(/^Appointment\s*[—–-]\s*(.+)$/i);
    if (m) return 'פגישה — ' + m[1];

    m = raw.match(/^(.+?)\s*\((\d+)\s*min\)\s*[—–-]\s*(.+)$/i);
    if (m) {
      const svc = translateServiceLabel(m[1]);
      return svc + ' (' + m[2] + " דק') — " + m[3];
    }

    m = raw.match(/^(.+?)\s*\((\d+)\s*min\)\s*$/i);
    if (m) return translateServiceLabel(m[1]) + ' (' + m[2] + " דק')";

    return translateServiceLabel(raw);
  }

  function translateServiceLabel(label) {
    const s = String(label || '').trim();
    const map = {
      'General Appointment': 'פגישה כללית',
      Appointment: 'פגישה',
      'Walk-in visit': 'ביקור ללא תור',
      'Free reward visit': 'ביקור הטבה חינם'
    };
    if (map[s]) return map[s];
    return s
      .replace(/\bGeneral Appointment\b/gi, 'פגישה כללית')
      .replace(/\bAppointment\b/gi, 'פגישה')
      .replace(/\((\d+)\s*min\)/gi, "($1 דק')");
  }

  function localizeLogStaff(log) {
    if (log.staff_id) return t('staffPrefix') + log.staff_id;
    const key = log.staff_key || log.staffKey;
    if (key && (I18N.en[key] || I18N.he[key])) return t(key);
    const raw = String(log.staff || '').trim();
    const known = {
      'Front desk': 'frontDesk',
      'דלפק קבלה': 'frontDesk'
    };
    if (known[raw]) return t(known[raw]);
    // Staff #123 → translate prefix
    const m = raw.match(/^Staff\s*#(\d+)$/i) || raw.match(/^צוות\s*#(\d+)$/);
    if (m) return t('staffPrefix') + m[1];
    return raw || '—';
  }

  function visitLogTime(log) {
    if (!log) return 0;
    const raw = String(log.date || '').trim();
    let y = 0;
    let m = 0;
    let d = 0;
    let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      y = Number(match[1]);
      m = Number(match[2]);
      d = Number(match[3]);
    } else {
      match = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
      if (match) {
        y = Number(match[3]);
        m = Number(match[2]);
        d = Number(match[1]);
      }
    }
    if (!y) return 0;
    // Local calendar day as sortable number YYYYMMDD
    const dayNum = y * 10000 + m * 100 + d;
    // Prefer newer manual/free ids on the same day
    const id = String(log.id || log.appointment_id || '');
    const idNum = Number((id.match(/(\d{10,})$/) || [])[1] || 0);
    return dayNum * 1e13 + idNum;
  }

  function renderVisitLogs() {
    const tbody = document.getElementById('visitLogsBody');
    tbody.innerHTML = '';
    // Latest date first; same-day newer entries above older ones
    const logs = [...loyaltyState.visit_logs].sort(
      (a, b) => visitLogTime(b) - visitLogTime(a)
    );
    if (!logs.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-row">' + t('noVisits') + '</td></tr>';
      return;
    }
    logs.forEach((log) => {
      const tr = document.createElement('tr');
      const isFree = !!(log.is_free || log.status === 'free');
      let statusHtml =
        '<span class="status-pill status-done">' + t('statusDone') + '</span>';
      if (isFree) {
        statusHtml +=
          '<span class="status-pill status-free">' + t('statusFree') + '</span>';
      }
      tr.innerHTML =
        '<td>' +
        formatDate(log.date) +
        '</td><td>' +
        localizeLogService(log) +
        '</td><td>' +
        localizeLogStaff(log) +
        '</td><td class="status-cell"><div class="status-pills">' +
        statusHtml +
        '</div></td>';
      tbody.appendChild(tr);
    });
  }

  function markVisitComplete() {
    if (loyaltyState.visits_count >= loyaltyState.punch_target) {
      showToast(t('toastCardFull'));
      return;
    }
    const manualLog = {
      id: 'manual-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      service_key: 'walkIn',
      staff_key: 'frontDesk',
      service: t('walkIn'),
      staff: t('frontDesk'),
      status: 'done'
    };
    loyaltyState.visit_logs.push(manualLog);
    loyaltyState.visits_count = Math.min(
      countPunchVisits(loyaltyState.visit_logs),
      loyaltyState.punch_target
    );
    if (loyaltyState.visits_count >= loyaltyState.punch_target) {
      loyaltyState.reward_available = true;
      showToast(t('toastUnlocked'));
    } else {
      showToast(t('toastMarked'));
    }
    const local = getMemberState(customerId);
    local.visits_count = loyaltyState.visits_count;
    local.reward_available = loyaltyState.reward_available;
    local.manual_logs = (local.manual_logs || []).concat([manualLog]);
    setMemberState(customerId, local);
    renderAll();
  }

  function redeemReward() {
    if (!loyaltyState.reward_available) return;
    loyaltyState.reward_available = false;
    loyaltyState.redeemed_count = (loyaltyState.redeemed_count || 0) + 1;
    const freeLog = {
      id: 'free-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      service_key: 'freeVisit',
      staff_key: 'frontDesk',
      service: t('freeVisit'),
      staff: t('frontDesk'),
      status: 'done',
      is_free: true
    };
    loyaltyState.visit_logs.push(freeLog);
    loyaltyState.visits_count = Math.min(
      countPunchVisits(loyaltyState.visit_logs),
      loyaltyState.punch_target
    );
    const local = getMemberState(customerId);
    local.reward_available = false;
    local.visits_count = loyaltyState.visits_count;
    local.redeemed_count = loyaltyState.redeemed_count;
    local.manual_logs = (local.manual_logs || []).concat([freeLog]);
    setMemberState(customerId, local);
    showToast(t('toastRedeemed'));
    renderAll();
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return dateStr || '—';
    const locale = currentLang === 'he' ? 'he-IL' : 'en-GB';
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function checkIconSVG() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>';
  }

  function giftIconSVG(dim) {
    return (
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="' +
      (dim ? 0.45 : 1) +
      '"><rect x="3" y="8" width="18" height="13" rx="1"/><path d="M12 8v13M3 12h18M12 8c-1.5-3-5-3-5-1s2.5 1 5 1 6.5 1 5-1-3.5-2-5 1Z"/></svg>'
    );
  }

  function showToast(msg) {
    const stack = document.getElementById('toastStackLoyalty');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    stack.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
})();
