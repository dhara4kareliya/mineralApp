/* Static label i18n — runs even if proposal-app.js is cached/stale. */
(function () {
  'use strict';

  var PACK = {
    he: {
      pageTitle: 'CloudPlus | בניית הצעת מחיר',
      brandSubtitle: 'מערכת הצעות מחיר',
      draftSaved: 'טיוטה נשמרה כעת',
      help: 'עזרה',
      agentName: 'אלי אליהו',
      agentRole: 'נציג מכירות',
      categoryPanelAria: 'קטגוריות שירות',
      buildProposal: 'בניית הצעה',
      specialPricingTitle: 'צריך תמחור מיוחד?',
      specialPricingText: 'ניתן להוסיף שורה מותאמת אישית בסיכום ההצעה.',
      newProposal: 'הצעת מחיר חדשה',
      pageHeading: 'מרכזיה בענן לעסק',
      pageSubheading: 'בחרו לקוח ושירותים. הסיכום מתעדכן אוטומטית.',
      resetDraft: 'ניקוי טיוטה',
      customerTitle: 'בחירת לקוח',
      customerSubtitle: 'קיים במערכת או לקוח חדש',
      loadedFromLink: 'נטען מהקישור',
      customerTypeAria: 'סוג לקוח',
      existingCustomer: 'לקוח קיים',
      newCustomer: 'לקוח חדש',
      customerSearchPlaceholder: 'חיפוש לפי שם, חברה, טלפון או מספר לקוח',
      email: 'אימייל',
      companyId: 'ח.פ. / ע.מ.',
      changeCustomer: 'החלפת לקוח',
      fullName: 'שם מלא *',
      fullNamePlaceholder: 'שם איש הקשר',
      companyName: 'שם חברה',
      companyNamePlaceholder: 'שם העסק',
      phone: 'טלפון *',
      emailRequired: 'אימייל *',
      servicesTitle: 'בחירת שירותים',
      serviceSearchPlaceholder: 'חיפוש שירות',
      summary: 'סיכום',
      proposalDetails: 'פרטי ההצעה',
      forCustomer: 'עבור',
      addCustomLine: 'הוספת שורה מותאמת',
      addCustomLineConfirm: 'הוספה',
      cancel: 'ביטול',
      customLineName: 'תיאור *',
      customLineNamePlaceholder: 'שורה מותאמת',
      customLinePrice: 'מחיר *',
      customLineBilling: 'חיוב',
      unitMonthly: 'לחודש',
      unitOnce: 'חד־פעמי',
      quantity: 'כמות',
      monthlyTotal: 'סה״כ חודשי',
      oneTimeTotal: 'סה״כ חד־פעמי',
      pricesExcludeVat: 'המחירים אינם כוללים מע״מ',
      beforeDiscounts: 'לפני הנחות',
      proposalValidity: 'תוקף ההצעה',
      days14: '14 ימים',
      days30: '30 ימים',
      days7: '7 ימים',
      handlingAgent: 'נציג מטפל',
      salesTeam: 'צוות מכירות',
      createProposal: 'יצירת הצעה',
      saveDraft: 'שמירת טיוטה',
      companyIdPlaceholder: 'מספר חברה'
    },
    en: {
      pageTitle: 'CloudPlus | Quote Builder',
      brandSubtitle: 'Proposal system',
      draftSaved: 'Draft saved just now',
      help: 'Help',
      agentName: 'Eli Eliyahu',
      agentRole: 'Sales rep',
      categoryPanelAria: 'Service categories',
      buildProposal: 'Build proposal',
      specialPricingTitle: 'Need custom pricing?',
      specialPricingText: 'You can add a custom line in the proposal summary.',
      newProposal: 'New quote',
      pageHeading: 'Cloud PBX for business',
      pageSubheading: 'Choose a customer and services. The summary updates automatically.',
      resetDraft: 'Clear draft',
      customerTitle: 'Select customer',
      customerSubtitle: 'Existing in system or new customer',
      loadedFromLink: 'Loaded from link',
      customerTypeAria: 'Customer type',
      existingCustomer: 'Existing customer',
      newCustomer: 'New customer',
      customerSearchPlaceholder: 'Search by name, company, phone, or customer ID',
      email: 'Email',
      companyId: 'Company ID',
      changeCustomer: 'Change customer',
      fullName: 'Full name *',
      fullNamePlaceholder: 'Contact name',
      companyName: 'Company name',
      companyNamePlaceholder: 'Business name',
      phone: 'Phone *',
      emailRequired: 'Email *',
      servicesTitle: 'Select services',
      serviceSearchPlaceholder: 'Search services',
      summary: 'Summary',
      proposalDetails: 'Proposal details',
      forCustomer: 'For',
      addCustomLine: 'Add custom line',
      addCustomLineConfirm: 'Add',
      cancel: 'Cancel',
      customLineName: 'Description *',
      customLineNamePlaceholder: 'Custom line',
      customLinePrice: 'Price *',
      customLineBilling: 'Billing',
      unitMonthly: 'per month',
      unitOnce: 'one-time',
      quantity: 'Quantity',
      monthlyTotal: 'Monthly total',
      oneTimeTotal: 'One-time total',
      pricesExcludeVat: 'Prices exclude VAT',
      beforeDiscounts: 'Before discounts',
      proposalValidity: 'Proposal validity',
      days14: '14 days',
      days30: '30 days',
      days7: '7 days',
      handlingAgent: 'Assigned rep',
      salesTeam: 'Sales team',
      createProposal: 'Create proposal',
      saveDraft: 'Save draft',
      companyIdPlaceholder: 'Company number'
    }
  };

  function currentLang() {
    try {
      var qs = new URLSearchParams(location.search || '');
      var lang = qs.get('lang')
        || window.__cpProposalLang
        || localStorage.getItem('cloudplus-proposal-lang')
        || localStorage.getItem('cloudplus_lang')
        || '';
      return (lang === 'en' || lang === 'he') ? lang : 'he';
    } catch (e) {
      return 'he';
    }
  }

  function applyLabels(lang) {
    lang = (lang === 'en' || lang === 'he') ? lang : currentLang();
    var dict = PACK[lang] || PACK.he;
    var dir = lang === 'he' ? 'rtl' : 'ltr';

    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', dir);
    if (document.body) {
      document.body.dir = dir;
      document.body.setAttribute('dir', dir);
      document.body.style.direction = dir;
    }
    var shell = document.querySelector('.app-shell');
    if (shell) {
      shell.setAttribute('dir', dir);
      shell.style.direction = dir;
    }
    var workspace = document.querySelector('.workspace');
    if (workspace) {
      workspace.setAttribute('dir', dir);
      workspace.style.direction = dir;
    }

    document.querySelectorAll('[data-cp-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-cp-i18n');
      if (!key || dict[key] == null) return;
      if (el.tagName === 'TITLE') {
        document.title = dict[key];
        el.textContent = dict[key];
      } else {
        el.textContent = dict[key];
      }
    });
    document.querySelectorAll('[data-cp-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-cp-i18n-placeholder');
      if (key && dict[key] != null) el.setAttribute('placeholder', dict[key]);
    });
    document.querySelectorAll('[data-cp-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-cp-i18n-title');
      if (key && dict[key] != null) el.setAttribute('title', dict[key]);
    });
    document.querySelectorAll('[data-cp-i18n-aria]').forEach(function (el) {
      var key = el.getAttribute('data-cp-i18n-aria');
      if (key && dict[key] != null) el.setAttribute('aria-label', dict[key]);
    });

    document.querySelectorAll('.lang-button').forEach(function (button) {
      var active = button.getAttribute('data-lang') === lang;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    window.__cpProposalLang = lang;
    try {
      localStorage.setItem('cloudplus-proposal-lang', lang);
      localStorage.setItem('cloudplus_lang', lang);
      sessionStorage.setItem('cloudplus-proposal-lang', lang);
    } catch (e) { /* ignore */ }
  }

  function boot() {
    applyLabels(currentLang());
    document.addEventListener('click', function (event) {
      var btn = event.target && event.target.closest ? event.target.closest('.lang-button[data-lang]') : null;
      if (!btn) return;
      var lang = btn.getAttribute('data-lang');
      if (lang !== 'he' && lang !== 'en') return;
      applyLabels(lang);
      try {
        var next = new URLSearchParams(window.location.search || '');
        next.set('lang', lang);
        var url = window.location.pathname + '?' + next.toString() + (window.location.hash || '');
        window.history.replaceState(null, '', url);
      } catch (e2) { /* ignore */ }
    }, true);
  }

  window.CloudPlusProposalLabels = { apply: applyLabels, currentLang: currentLang };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
