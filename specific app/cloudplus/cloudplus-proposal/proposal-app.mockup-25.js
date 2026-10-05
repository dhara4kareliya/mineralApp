(function () {
  'use strict';

  var translations = {
    he: {
      pageTitle: 'CloudPlus | בניית הצעת מחיר',
      brandSubtitle: 'מערכת הצעות מחיר',
      draftSaved: 'טיוטה נשמרה כעת',
      help: 'עזרה',
      agentName: 'אלי אליהו',
      agentRole: 'נציג מכירות',
      categoryPanelAria: 'קטגוריות שירות',
      buildProposal: 'בניית הצעה',
      progressText: '{used} מתוך {total} שירותים',
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
      customerIdLabel: 'לקוח #{id}',
      email: 'אימייל',
      companyId: 'ח.פ. / ע.מ.',
      notSet: 'לא הוגדר',
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
      itemCount: '{count} פריטים',
      forCustomer: 'עבור',
      newCustomerSummary: 'לקוח חדש',
      notSavedYet: 'טרם נשמר',
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
      creatingProposal: 'יוצר הצעה…',
      saveDraft: 'שמירת טיוטה',
      companyIdPlaceholder: 'מספר חברה',
      popular: 'מומלץ',
      selected: 'נבחר',
      add: 'הוספה',
      quantity: 'כמות',
      noServices: 'לא נמצאו שירותים בקטגוריה זו',
      noServicesSelected: 'עדיין לא נבחרו שירותים',
      remove: 'הסרה',
      toastReset: 'הטיוטה אופסה',
      toastCreated: 'הצעה #{id} נוצרה בהצלחה',
      toastCreatedNoId: 'ההצעה נוצרה בהצלחה',
      errNoCustomer: 'יש לבחור לקוח',
      errNoName: 'יש להזין שם מלא',
      errNoPhone: 'יש להזין טלפון',
      errNoEmail: 'יש להזין אימייל',
      errCreateCustomer: 'יצירת הלקוח נכשלה',
      errNoServices: 'יש לבחור לפחות שירות אחד',
      errNoCompany: 'יש להזין ח.פ. / מזהה חברה',
      errNotConnected: 'אין חיבור ל-Biz1',
      errCreateFailed: 'יצירת ההצעה נכשלה',
      loadingCustomer: 'טוען פרטי לקוח…',
      errLoadCustomer: 'לא ניתן לטעון את הלקוח',
      unitMonthly: 'לחודש',
      unitOnce: 'חד־פעמי',
      unitHour: 'לשעה'
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
      progressText: '{used} of {total} services',
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
      customerIdLabel: 'Customer #{id}',
      email: 'Email',
      companyId: 'Company ID',
      notSet: 'Not set',
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
      itemCount: '{count} items',
      forCustomer: 'For',
      newCustomerSummary: 'New customer',
      notSavedYet: 'Not saved yet',
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
      creatingProposal: 'Creating…',
      saveDraft: 'Save draft',
      companyIdPlaceholder: 'Company number',
      popular: 'Popular',
      selected: 'Selected',
      add: 'Add',
      quantity: 'Quantity',
      noServices: 'No services found in this category',
      noServicesSelected: 'No services selected yet',
      remove: 'Remove',
      toastReset: 'Draft reset',
      toastCreated: 'Proposal #{id} created successfully',
      toastCreatedNoId: 'Proposal created successfully',
      errNoCustomer: 'Please select a customer',
      errNoName: 'Please enter full name',
      errNoPhone: 'Please enter phone',
      errNoEmail: 'Please enter email',
      errCreateCustomer: 'Failed to create customer',
      errNoServices: 'Select at least one service',
      errNoCompany: 'Company ID is required',
      errNotConnected: 'Not connected to Biz1',
      errCreateFailed: 'Failed to create proposal',
      loadingCustomer: 'Loading customer…',
      errLoadCustomer: 'Could not load customer',
      unitMonthly: 'per month',
      unitOnce: 'one-time',
      unitHour: 'per hour'
    }
  };

  // Mock catalog mirrors the requirement document; API IDs will replace these IDs later.
  var categories = [
    {
      id: 'pbx',
      label: { he: 'מרכזיה ושלוחות', en: 'PBX & extensions' },
      description: { he: 'תשתית המרכזיה והשלוחות', en: 'PBX infrastructure and extensions' }
    },
    {
      id: 'minutes',
      label: { he: 'בנק דקות', en: 'Minute banks' },
      description: { he: 'חבילות דקות לשיחות יוצאות', en: 'Minute packages for outbound calls' }
    },
    {
      id: 'recording',
      label: { he: 'הקלטות ואחסון', en: 'Recording & storage' },
      description: { he: 'אחסון הקלטות שיחה בענן', en: 'Cloud call-recording storage' }
    },
    {
      id: 'numbers',
      label: { he: 'מספרים וניוד', en: 'Numbers & porting' },
      description: { he: 'מספרים וירטואליים וניוד קווים', en: 'Virtual numbers and line porting' }
    },
    {
      id: 'devices',
      label: { he: 'טלפונים וציוד', en: 'Phones & hardware' },
      description: { he: 'טלפוני IP, ספקים וציוד רשת', en: 'IP phones, power supplies, and network gear' }
    },
    {
      id: 'integrations',
      label: { he: 'אינטגרציות ו-API', en: 'Integrations & API' },
      description: { he: 'חיבור CRM, Click2Call ופיתוחים', en: 'CRM, Click2Call, and custom development' }
    },
    {
      id: 'connectivity',
      label: { he: 'אינטרנט וסלולר', en: 'Internet & mobile' },
      description: { he: 'קישוריות עסקית, SIM ו-eSIM', en: 'Business connectivity, SIM, and eSIM' }
    },
    {
      id: 'ai',
      label: { he: 'AI ושירותים נוספים', en: 'AI & more' },
      description: { he: 'שירותי AI ואוטומציה למרכזיה', en: 'AI and automation for the PBX' }
    }
  ];

  var services = [
    { id: 'extension', category: 'pbx', name: { he: 'שלוחה בענן', en: 'Cloud extension' }, description: { he: 'שלוחה מלאה למשתמש כולל אפליקציה', en: 'Full user extension including mobile app' }, price: 10, billing: 'monthly', unitKey: 'unitMonthly', qty: 10, popular: true },
    { id: 'ivr', category: 'pbx', name: { he: 'נתב שיחות IVR', en: 'IVR call router' }, description: { he: 'תפריט קולי וניתוב לפי שעות פעילות', en: 'Voice menu and routing by business hours' }, price: 49, billing: 'monthly', unitKey: 'unitMonthly', qty: 1 },
    { id: 'queue', category: 'pbx', name: { he: 'תור שיחות', en: 'Call queue' }, description: { he: 'המתנה חכמה, מוזיקה והודעות', en: 'Smart hold, music, and announcements' }, price: 39, billing: 'monthly', unitKey: 'unitMonthly', qty: 1 },
    { id: 'callcenter', category: 'pbx', name: { he: 'מוקד שירות מתקדם', en: 'Advanced contact center' }, description: { he: 'דוחות נציגים וניהול עומסים', en: 'Agent reports and load management' }, price: 129, billing: 'monthly', unitKey: 'unitMonthly', qty: 1 },
    { id: 'min3000', category: 'minutes', name: { he: 'בנק 3,000 דקות', en: '3,000-minute bank' }, description: { he: 'חבילה מומלצת לעד 10 שלוחות', en: 'Recommended package for up to 10 extensions' }, price: 89, billing: 'monthly', unitKey: 'unitMonthly', qty: 1, popular: true },
    { id: 'min1000', category: 'minutes', name: { he: 'בנק 1,000 דקות', en: '1,000-minute bank' }, description: { he: 'לעסקים עם נפח שיחות נמוך', en: 'For businesses with low call volume' }, price: 39, billing: 'monthly', unitKey: 'unitMonthly', qty: 1 },
    { id: 'storage10', category: 'recording', name: { he: 'אחסון הקלטות 10GB', en: '10GB recording storage' }, description: { he: 'שמירה וחיפוש הקלטות בענן', en: 'Store and search recordings in the cloud' }, price: 52, billing: 'monthly', unitKey: 'unitMonthly', qty: 1 },
    { id: 'storage100', category: 'recording', name: { he: 'אחסון הקלטות 100GB', en: '100GB recording storage' }, description: { he: 'החבילה המומלצת לארגונים', en: 'Recommended package for organizations' }, price: 100, billing: 'monthly', unitKey: 'unitMonthly', qty: 1, popular: true },
    { id: '073monthly', category: 'numbers', name: { he: 'הקצאת מספר 073', en: '073 number allocation' }, description: { he: 'מספר עסקי חדש בענן', en: 'New business number in the cloud' }, price: 10, billing: 'monthly', unitKey: 'unitMonthly', qty: 1 },
    { id: 'porting', category: 'numbers', name: { he: 'ניוד מספר קיים', en: 'Existing number porting' }, description: { he: 'ניוד קו מספק תקשורת קיים', en: 'Port a line from an existing carrier' }, price: 250, billing: 'once', unitKey: 'unitOnce', qty: 1 },
    { id: 'yealink', category: 'devices', name: { he: 'טלפון IP Yealink', en: 'Yealink IP phone' }, description: { he: 'דגם שולחני לעמדת עבודה', en: 'Desktop model for workstations' }, price: 349, billing: 'once', unitKey: 'unitOnce', qty: 1 },
    { id: 'poe', category: 'devices', name: { he: 'ספק כוח / PoE', en: 'Power supply / PoE' }, description: { he: 'אביזר הזנה לטלפון IP', en: 'Power accessory for IP phones' }, price: 65, billing: 'once', unitKey: 'unitOnce', qty: 1 },
    { id: 'crm', category: 'integrations', name: { he: 'חיבור CRM', en: 'CRM connection' }, description: { he: 'זיהוי לקוח והקפצת כרטיס', en: 'Caller ID and contact-card popup' }, price: 120, billing: 'monthly', unitKey: 'unitMonthly', qty: 1 },
    { id: 'development', category: 'integrations', name: { he: 'שעת פיתוח מותאם', en: 'Custom development hour' }, description: { he: 'מינימום הזמנה: 5 שעות', en: 'Minimum order: 5 hours' }, price: 450, billing: 'once', unitKey: 'unitHour', qty: 5 },
    { id: 'internet', category: 'connectivity', name: { he: 'אינטרנט עסקי + Fortinet', en: 'Business internet + Fortinet' }, description: { he: 'חיבור מאובטח עם ניהול מרכזי', en: 'Secure connection with central management' }, price: 299, billing: 'monthly', unitKey: 'unitMonthly', qty: 1 },
    { id: 'esim', category: 'connectivity', name: { he: 'קו eSIM עסקי', en: 'Business eSIM line' }, description: { he: 'קו סלולרי לעובד או למכשיר', en: 'Mobile line for an employee or device' }, price: 49, billing: 'monthly', unitKey: 'unitMonthly', qty: 1 },
    { id: 'ai5000', category: 'ai', name: { he: 'AI למרכזיה עד 5,000 דקות', en: 'PBX AI up to 5,000 minutes' }, description: { he: 'תמלול, סיכום וניתוח שיחות', en: 'Transcription, summary, and call analysis' }, price: 500, billing: 'monthly', unitKey: 'unitMonthly', qty: 1, popular: true },
    { id: 'fax', category: 'ai', name: { he: 'Fax2Mail', en: 'Fax2Mail' }, description: { he: 'קבלת פקס ישירות למייל', en: 'Receive faxes directly to email' }, price: 29, billing: 'monthly', unitKey: 'unitMonthly', qty: 1 }
  ];

  var qs = new URLSearchParams(window.location.search);

  function resolveCustomerIdFromUrl(params) {
    params = params || qs;
    var keys = [
      'customer', 'customer_id', 'cust_id', 'custId', 'id',
      'cutsomer', 'custmer', 'costumer' // common typos
    ];
    for (var i = 0; i < keys.length; i++) {
      var raw = params.get(keys[i]);
      if (raw == null) continue;
      var id = String(raw).trim();
      if (id) return id;
    }
    return '';
  }

  var urlCustomerId = resolveCustomerIdFromUrl(qs);
  // Normalize typo query keys to ?customer= so refresh/share links stay correct.
  try {
    if (urlCustomerId && !qs.get('customer') && !qs.get('customer_id') && !qs.get('cust_id')) {
      var fixed = new URLSearchParams(window.location.search || '');
      ['cutsomer', 'custmer', 'costumer'].forEach(function (k) { fixed.delete(k); });
      fixed.set('customer', urlCustomerId);
      var fixedUrl = window.location.pathname + '?' + fixed.toString() + (window.location.hash || '');
      window.history.replaceState(null, '', fixedUrl);
      qs = new URLSearchParams(window.location.search);
    }
  } catch (eFix) { /* ignore */ }

  function readStoredLang() {
    try {
      return qs.get('lang')
        || window.__cpProposalLang
        || localStorage.getItem('cloudplus-proposal-lang')
        || localStorage.getItem('cloudplus_lang')
        || sessionStorage.getItem('cloudplus-proposal-lang')
        || '';
    } catch (e) {
      return qs.get('lang') || window.__cpProposalLang || '';
    }
  }

  function persistLang(lang) {
    try { localStorage.setItem('cloudplus-proposal-lang', lang); } catch (e1) { /* ignore */ }
    try { localStorage.setItem('cloudplus_lang', lang); } catch (e2) { /* ignore */ }
    try { sessionStorage.setItem('cloudplus-proposal-lang', lang); } catch (e3) { /* ignore */ }
    try {
      var next = new URLSearchParams(window.location.search || '');
      next.set('lang', lang);
      var query = next.toString();
      var url = window.location.pathname + (query ? '?' + query : '') + (window.location.hash || '');
      window.history.replaceState(null, '', url);
    } catch (e4) { /* ignore */ }
  }

  var initialLang = readStoredLang();
  if (initialLang !== 'he' && initialLang !== 'en') initialLang = 'he';
  persistLang(initialLang);

  var state = {
    category: 'pbx',
    customerMode: 'existing',
    lang: initialLang,
    creating: false,
    customerLoading: false,
    customer: {
      id: urlCustomerId || '',
      name: '',
      email: '',
      phone: '',
      mobile: '',
      companyName: '',
      companyId: ''
    }
  };

  function t(key, vars) {
    var dict = translations[state.lang] || translations.he;
    var text = dict[key] || translations.he[key] || key;
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, function (_, name) {
      return vars[name] != null ? String(vars[name]) : '';
    });
  }

  function localized(value) {
    if (value && typeof value === 'object') return value[state.lang] || value.he || '';
    return value || '';
  }

  function unitLabel(service) {
    return t(service.unitKey);
  }

  function money(value) {
    var locale = state.lang === 'en' ? 'en-IL' : 'he-IL';
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value || 0);
  }

  function selectedServices() {
    return services.filter(function (service) { return service.selected; });
  }

  function categorySelectedCount(categoryId) {
    return services.filter(function (service) { return service.category === categoryId && service.selected; }).length;
  }

  function applyStaticTranslations() {
    function translateAttr(attrName) {
      document.querySelectorAll('[' + attrName + ']').forEach(function (el) {
        var key = el.getAttribute(attrName);
        if (!key) return;
        var value = t(key);
        if (el.tagName === 'TITLE') {
          document.title = value;
          el.textContent = value;
        } else if (el.tagName === 'OPTION') {
          el.textContent = value;
        } else {
          el.textContent = value;
        }
      });
    }
    // Prefer data-cp-i18n (ignored by MineralBarI18n). Also support data-i18n fallback.
    translateAttr('data-cp-i18n');
    translateAttr('data-i18n');

    function translateMeta(attrName, setter) {
      document.querySelectorAll('[' + attrName + ']').forEach(function (el) {
        var key = el.getAttribute(attrName);
        if (key) setter(el, t(key));
      });
    }
    translateMeta('data-cp-i18n-placeholder', function (el, v) { el.setAttribute('placeholder', v); });
    translateMeta('data-i18n-placeholder', function (el, v) { el.setAttribute('placeholder', v); });
    translateMeta('data-cp-i18n-title', function (el, v) { el.setAttribute('title', v); });
    translateMeta('data-i18n-title', function (el, v) { el.setAttribute('title', v); });
    translateMeta('data-cp-i18n-aria', function (el, v) { el.setAttribute('aria-label', v); });
    translateMeta('data-i18n-aria', function (el, v) { el.setAttribute('aria-label', v); });
  }

  function updateDocumentDirection() {
    var isHebrew = state.lang === 'he';
    var dir = isHebrew ? 'rtl' : 'ltr';
    var html = document.documentElement;
    html.lang = state.lang;
    html.dir = dir;
    html.setAttribute('lang', state.lang);
    html.setAttribute('dir', dir);
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
    document.querySelectorAll('.lang-button').forEach(function (button) {
      var active = button.getAttribute('data-lang') === state.lang;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function dash(value) {
    var s = String(value == null ? '' : value).trim();
    return s || '—';
  }

  function initialsOf(name) {
    var nm = String(name || '').trim();
    if (!nm) return '?';
    return nm.split(/\s+/).map(function (p) { return p.charAt(0); }).join('').slice(0, 2).toUpperCase();
  }

  function sessionUser() {
    try {
      if (!window.MineralBarApp || !MineralBarApp.getUser) return null;
      return MineralBarApp.getUser() || null;
    } catch (e) {
      return null;
    }
  }

  function sessionUserId() {
    try {
      var user = sessionUser();
      var id = '';
      if (user) {
        id = user.id || user.user_id || user.member_id || user.technician_id || '';
      }
      if (!id && MineralBarApp.getUserBasic) {
        var basic = MineralBarApp.getUserBasic();
        var nested = basic && (basic.user || basic.data || basic);
        if (nested) id = nested.id || nested.user_id || nested.member_id || '';
      }
      id = String(id || '').trim();
      return id && id !== '0' ? id : '';
    } catch (e) {
      return '';
    }
  }

  function sessionDisplayName(user) {
    user = user || sessionUser();
    var email = '';
    try { email = (MineralBarApp.getEmail && MineralBarApp.getEmail()) || ''; } catch (e) { /* ignore */ }
    if (!user) {
      if (!email) return '';
      return String(email).split('@')[0] || email;
    }
    return String(
      user.full_name || user.name || user.display_name || user.username || user.user_name ||
      [user.first_name, user.last_name].filter(Boolean).join(' ') ||
      user.email || email || ''
    ).trim();
  }

  function sessionRoleLabel(user) {
    user = user || sessionUser();
    var role = '';
    try { role = (MineralBarApp.getRole && MineralBarApp.getRole()) || ''; } catch (e) { /* ignore */ }
    if (user && (user.role_name || user.role_label || user.title || user.job_title)) {
      return String(user.role_name || user.role_label || user.title || user.job_title).trim();
    }
    var map = {
      he: { sales: 'נציג מכירות', service: 'שירות', tech: 'טכנאי', admin: 'מנהל' },
      en: { sales: 'Sales rep', service: 'Service', tech: 'Technician', admin: 'Admin' }
    };
    var pack = map[state.lang] || map.en;
    return pack[role] || role || (state.lang === 'he' ? 'משתמש' : 'User');
  }

  function sessionAvatarUrl(user) {
    user = user || sessionUser();
    if (!user) return '';
    var url = user.logo || user.avatar || user.photo || user.image || user.img ||
      user.profile_image || user.profile_pic || user.picture || user.thumb || '';
    return String(url || '').trim();
  }

  function sessionBrandLogoUrl() {
    try {
      var basic = MineralBarApp.getUserBasic && MineralBarApp.getUserBasic();
      var data = (basic && basic.data) || basic || {};
      var company = data.company || data.account || data.settings || {};
      var url = company.logo || company.company_logo || data.logo || data.company_logo || '';
      return String(url || '').trim();
    } catch (e) {
      return '';
    }
  }

  function paintLoggedInUser() {
    var user = sessionUser();
    var name = sessionDisplayName(user);
    var role = sessionRoleLabel(user);
    var email = '';
    try { email = (MineralBarApp.getEmail && MineralBarApp.getEmail()) || ''; } catch (e) { /* ignore */ }
    var initials = initialsOf(name || email || '?');
    var avatarUrl = sessionAvatarUrl(user);

    var brandNameEl = document.getElementById('brandName');
    if (brandNameEl) {
      var brand = 'CloudPlus';
      try {
        if (MineralBarApp.getBrandName) brand = MineralBarApp.getBrandName(state.lang) || brand;
      } catch (e2) { /* ignore */ }
      brandNameEl.textContent = brand;
    }
    var brandLogo = document.getElementById('brandLogo');
    if (brandLogo) {
      var brandLogoUrl = sessionBrandLogoUrl() || avatarUrl;
      if (brandLogoUrl) {
        brandLogo.innerHTML = '<img src="' + brandLogoUrl.replace(/"/g, '&quot;') + '" alt="">';
      } else {
        var brandText = (brandNameEl && brandNameEl.textContent) || 'CloudPlus';
        brandLogo.textContent = String(brandText).replace(/[^A-Za-zא-ת0-9]+/g, '').slice(0, 2).toUpperCase() || 'C+';
      }
    }

    var avatarEl = document.getElementById('memberAvatar');
    if (avatarEl) {
      if (avatarUrl) {
        avatarEl.innerHTML = '<img src="' + avatarUrl.replace(/"/g, '&quot;') + '" alt="">';
      } else {
        avatarEl.textContent = initials;
      }
    }
    var nameEl = document.getElementById('memberName');
    if (nameEl) nameEl.textContent = name || '—';
    var roleEl = document.getElementById('memberRole');
    if (roleEl) roleEl.textContent = role || '—';
    var chip = document.getElementById('memberChip');
    if (chip) chip.title = [name, email].filter(Boolean).join(' · ');

    var selfOpt = document.getElementById('agentSelectSelf');
    if (selfOpt) {
      var uid = '';
      if (user) uid = String(user.id || user.user_id || user.member_id || email || 'self');
      selfOpt.value = uid || 'self';
      selfOpt.textContent = name || t('handlingAgent');
    }
    try {
      if (window.CloudPlusProposalSession && CloudPlusProposalSession.paint) {
        CloudPlusProposalSession.paint();
      }
    } catch (ePaint) { /* ignore */ }
  }

  function pickCompanyId(c) {
    c = c || {};
    var raw = String(
      c.company_id || c.corporation || c.csv_id || c.id_number || c.vat_number ||
      c.tz || c.identity || c.hp || c.company_number || ''
    ).replace(/\D/g, '');
    // Treat empty / zero as unset (API sometimes returns 0).
    if (!raw || raw === '0') return '';
    return raw;
  }

  function normalizeCustomer(raw, fallbackId) {
    var c = raw || {};
    if (Array.isArray(c)) c = c[0] || {};
    if (c.customer && typeof c.customer === 'object') c = c.customer;
    if (c.output && typeof c.output === 'object' && !Array.isArray(c.output)) c = c.output;
    if (c.data && typeof c.data === 'object' && !Array.isArray(c.data)) c = c.data;
    var id = String(c.id || c.customer_id || c.cust_id || fallbackId || '').trim();
    var phone = c.phone || c.tel || c.telephone || '';
    var mobile = c.mobile || c.cellular || c.phone2 || c.cell || '';
    return {
      id: id,
      name: c.name || c.customer_name || c.full_name || c.username || '',
      email: c.email || c.e_mail || c.mail || '',
      phone: phone,
      mobile: mobile,
      companyName: c.company || c.company_name || c.business_name || c.organization || '',
      companyId: pickCompanyId(c),
      raw: c
    };
  }

  function setCustomerLoadStatus(message, isError) {
    var el = document.getElementById('customerLoadStatus');
    if (!el) return;
    if (!message) {
      el.textContent = '';
      el.className = 'customer-load-status hidden';
      return;
    }
    el.textContent = message;
    el.className = 'customer-load-status' + (isError ? ' is-error' : '');
  }

  function updateCustomerLabels() {
    var customerId = state.customer.id || urlCustomerId || '';
    var card = document.getElementById('selectedCustomer');
    if (card) card.classList.toggle('is-loading', !!state.customerLoading);

    var idLabel = document.getElementById('selectedCustomerId');
    if (idLabel) idLabel.textContent = customerId ? t('customerIdLabel', { id: customerId }) : t('notSavedYet');

    var nameEl = document.getElementById('selectedCustomerName');
    if (nameEl) nameEl.textContent = state.customerLoading ? '…' : dash(state.customer.name);

    var emailEl = document.getElementById('selectedCustomerEmail');
    if (emailEl) emailEl.textContent = state.customerLoading ? '…' : dash(state.customer.email);

    var phoneEl = document.getElementById('selectedCustomerPhone');
    if (phoneEl) {
      var phoneShow = state.customer.mobile || state.customer.phone;
      phoneEl.textContent = state.customerLoading ? '…' : dash(phoneShow);
    }

    var companyNameEl = document.getElementById('selectedCustomerCompany');
    if (companyNameEl) {
      companyNameEl.textContent = state.customerLoading ? '…' : dash(state.customer.companyName);
    }

    var companyEl = document.getElementById('selectedCompanyId');
    if (companyEl) {
      companyEl.textContent = state.customerLoading
        ? '…'
        : (state.customer.companyId ? state.customer.companyId : t('notSet'));
    }

    var avatar = document.getElementById('selectedCustomerAvatar');
    if (avatar) avatar.textContent = initialsOf(state.customer.name);

    if (state.customerMode === 'existing') {
      document.getElementById('summaryCustomer').textContent = state.customer.name || (customerId ? ('#' + customerId) : '—');
      document.getElementById('summaryCustomerId').textContent = customerId ? ('#' + customerId) : '';
      if (card && customerId) card.classList.remove('hidden');
    } else {
      document.getElementById('summaryCustomer').textContent = t('newCustomerSummary');
      document.getElementById('summaryCustomerId').textContent = t('notSavedYet');
    }
  }

  var RETURN_URL_KEY = 'cloudplus_return_url';

  function saveReturnUrl(url) {
    try {
      var value = String(url || window.location.href || '').trim();
      if (!value) return;
      // Allow proposal URLs; reject bare login screen.
      try {
        var u = new URL(value, window.location.href);
        var path = String(u.pathname || '');
        var isLoginScreen = (/\/cloudplus\/?$/i.test(path) || /\/cloudplus\/index\.html$/i.test(path)) &&
          !/proposal/i.test(path);
        if (isLoginScreen) return;
      } catch (ePath) {
        if (/index\.html#login/i.test(value) && !/proposal/i.test(value)) return;
      }
      sessionStorage.setItem(RETURN_URL_KEY, value);
      try { localStorage.setItem(RETURN_URL_KEY, value); } catch (eLs) { /* ignore */ }
    } catch (e) { /* ignore */ }
  }

  function loginHref() {
    var here = String(window.location.href || '');
    saveReturnUrl(here);
    try {
      var u = new URL('../index.html', window.location.href);
      u.searchParams.set('return', here);
      u.hash = 'login';
      return u.href;
    } catch (e) {
      return '../index.html?return=' + encodeURIComponent(here) + '#login';
    }
  }

  /** Soft auth — never call ensureAuth here (it redirects to index.html#login in this folder). */
  async function ensureSession(opts) {
    opts = opts || {};
    if (!window.MineralBarApp) return false;
    try {
      if (MineralBarApp.isAuthenticated && MineralBarApp.isAuthenticated()) return true;
      if (MineralBarApp.canAutoRefresh && MineralBarApp.canAutoRefresh() && MineralBarApp.refreshSession) {
        try {
          await MineralBarApp.refreshSession();
          return !!(MineralBarApp.isAuthenticated && MineralBarApp.isAuthenticated());
        } catch (e2) { /* ignore */ }
      }
    } catch (e3) {
      console.warn('[cloudplus-proposal] ensureSession', e3);
    }
    if (opts.redirect) {
      window.location.href = loginHref();
    }
    return false;
  }

  function stripLoginHash() {
    try {
      if (String(window.location.hash || '').replace(/^#/, '') === 'login') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch (e) { /* ignore */ }
  }

  function setCreateStatus(message, kind) {
    var el = document.getElementById('createStatus');
    if (!el) return;
    if (!message) {
      el.textContent = '';
      el.className = 'create-status hidden';
      return;
    }
    el.textContent = message;
    el.className = 'create-status' + (kind === 'ok' ? ' is-ok' : ' is-error');
  }

  function calcTotals() {
    var monthly = 0;
    var oneTime = 0;
    selectedServices().forEach(function (service) {
      var amount = service.price * service.qty;
      if (service.billing === 'monthly') monthly += amount;
      else oneTime += amount;
    });
    return { monthly: monthly, oneTime: oneTime, finalAmount: monthly + oneTime };
  }

  function categoryLabelOf(categoryId) {
    var category = categories.find(function (item) { return item.id === categoryId; });
    return category ? localized(category.label) : '';
  }

  function buildItemDisplayName(service) {
    var categoryName = categoryLabelOf(service.category);
    var serviceName = localized(service.name) || service.id;
    var priceBit = '₪' + money(service.price) + ' / ' + unitLabel(service);
    var parts = [];
    if (categoryName) parts.push(categoryName);
    if (serviceName) parts.push(serviceName);
    if (priceBit) parts.push(priceBit);
    return parts.join(' · ');
  }

  function buildDocumentItems() {
    return selectedServices().map(function (service) {
      var qty = Number(service.qty) || 1;
      var price = Number(service.price) || 0;
      var total = Math.round(qty * price * 100) / 100;
      // Biz1 Order Proposal "Product Description" reads item_productdesc
      // (item_notes also kept for NOTES/IMAGE / older UIs).
      var description = localized(service.description) || '';
      return {
        item_name: buildItemDisplayName(service),
        item_qty: qty,
        item_price: price,
        item_total: total,
        iteeeem_id: 0,
        item_discount_type: 'price',
        item_discount: 0,
        item_productdesc: description,
        item_notes: description,
        item_SKU: ''
      };
    });
  }

  async function resolveInvoiceSettingId(client) {
    try {
      var coRes = await client.request('InvoiceSettings.List', { limit: 25 });
      var coData = coRes && (coRes.data || coRes.output || coRes);
      var coRows = Array.isArray(coData) ? coData : ((coData && (coData.rows || coData.list)) || []);
      var co = null;
      if (coRows && coRows.length) {
        co = coRows.find(function (r) {
          return r && (r.is_default || Number(r.default_settings) === 1 || Number(r.is_default) === 1);
        }) || coRows[0];
      }
      return co ? String(co.id || co.invoice_setting_id || co.invoice_settings_id || '').trim() : '';
    } catch (e) {
      console.warn('[cloudplus-proposal] InvoiceSettings.List failed', e);
      return '';
    }
  }

  async function loadCustomerFromApi(customerId) {
    customerId = String(customerId || '').trim();
    if (!customerId) return null;
    if (!window.MineralBarApp) {
      setCustomerLoadStatus(t('errNotConnected'), true);
      return null;
    }

    state.customerLoading = true;
    state.customer.id = customerId;
    setCustomerLoadStatus(t('loadingCustomer'), false);
    updateCustomerLabels();

    try {
      var okAuth = await ensureSession({ redirect: false });
      if (!okAuth) {
        setCustomerLoadStatus(t('errNotConnected'), true);
        state.customerLoading = false;
        updateCustomerLabels();
        return null;
      }

      var c = null;
      if (MineralBarApp.getCustomer) {
        var res = await MineralBarApp.getCustomer(customerId);
        c = normalizeCustomer((res && res.customer) || res, customerId);
      } else if (MineralBarApp.getClient) {
        var raw = await MineralBarApp.getClient().request('Customer.Get', {
          customer_id: customerId,
          cust_id: customerId,
          id: customerId
        });
        c = normalizeCustomer((raw && (raw.output || raw.data || raw.customer)) || raw, customerId);
      } else {
        throw new Error(t('errNotConnected'));
      }

      if (!c || !c.id) throw new Error(t('errLoadCustomer'));
      state.customer = c;
      setCustomerLoadStatus('', false);
      updateCustomerLabels();
      return c;
    } catch (e) {
      console.warn('[cloudplus-proposal] Customer.Get failed', e);
      state.customer = {
        id: customerId,
        name: '',
        email: '',
        phone: '',
        mobile: '',
        companyName: '',
        companyId: ''
      };
      setCustomerLoadStatus((e && e.message) || t('errLoadCustomer'), true);
      updateCustomerLabels();
      return null;
    } finally {
      state.customerLoading = false;
      updateCustomerLabels();
    }
  }

  function readNewCustomerForm() {
    function val(id) {
      var el = document.getElementById(id);
      return el ? String(el.value || '').trim() : '';
    }
    return {
      name: val('newCustomerName'),
      companyName: val('newCustomerCompany'),
      phone: val('newCustomerPhone'),
      email: val('newCustomerEmail')
    };
  }

  async function resolveCustomerIdForCreate(client) {
    // Explicit "New customer" path — create via Customer.Add, ignore URL customer.
    if (state.customerMode === 'new') {
      var form = readNewCustomerForm();
      if (!form.name) throw new Error(t('errNoName'));
      if (!form.phone) throw new Error(t('errNoPhone'));
      if (!form.email) throw new Error(t('errNoEmail'));

      var addRes = await client.request('Customer.Add', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        mobile: form.phone,
        company: form.companyName || ''
      });
      var newId = String(
        (addRes && (addRes.customer_id || addRes.contactus_id || addRes.id)) || ''
      ).trim();
      if (!newId) {
        throw new Error((addRes && (addRes.message || addRes.error)) || t('errCreateCustomer'));
      }

      state.customer = {
        id: newId,
        name: form.name,
        email: form.email,
        phone: form.phone,
        mobile: form.phone,
        companyName: form.companyName || '',
        companyId: ''
      };
      setCustomerMode('existing');
      updateCustomerLabels();
      return newId;
    }

    // Existing customer path (unchanged).
    var customerId = String(
      (state.customer && state.customer.id) ||
      resolveCustomerIdFromUrl(new URLSearchParams(window.location.search || '')) ||
      urlCustomerId ||
      ''
    ).trim();
    if (!customerId) throw new Error(t('errNoCustomer'));
    if (!state.customer.id) state.customer.id = customerId;
    return customerId;
  }

  async function createProposal() {
    if (state.creating) return;
    setCreateStatus('');

    var rows = selectedServices();
    if (!rows.length) {
      setCreateStatus(t('errNoServices'), 'error');
      return;
    }

    if (!window.MineralBarApp || !MineralBarApp.getClient) {
      setCreateStatus(t('errNotConnected'), 'error');
      return;
    }

    var btn = document.getElementById('createProposalButton');
    state.creating = true;
    if (btn) {
      btn.disabled = true;
      btn.textContent = t('creatingProposal');
    }

    try {
      var okAuth = await ensureSession({ redirect: true });
      if (!okAuth) {
        throw new Error(t('errNotConnected'));
      }

      var client = MineralBarApp.getClient();
      var customerId = await resolveCustomerIdForCreate(client);

      var companyId = String(state.customer.companyId || '').replace(/\D/g, '');
      if (!companyId || companyId === '0') companyId = '';

      var totals = calcTotals();
      var validity = (document.getElementById('validitySelect') || {}).value || '14';
      // Match Biz1 document language to the site UI language (he/en).
      var documentLang = state.lang === 'en' ? 'en' : 'he';
      var payload = {
        customer_id: customerId,
        name: state.customer.name || '',
        email: state.customer.email || '',
        phone: state.customer.phone || '',
        mobile: state.customer.mobile || state.customer.phone || '',
        document_type: 'order_proposals',
        document_lang: documentLang,
        final_amount: totals.finalAmount,
        items: JSON.stringify(buildDocumentItems()),
        note: 'CloudPlus proposal · validity ' + validity + ' days'
      };
      var createdByUserId = sessionUserId();
      if (createdByUserId) payload.created_by_user_id = createdByUserId;
      if (companyId) payload.corporation = companyId;
      // Do not send company_name — Documents.Add / Customer.Add reject unknown_parameter.
      var invId = await resolveInvoiceSettingId(client);
      if (invId) payload.invoice_setting_id = invId;

      var created = await client.request('Documents.Add', payload);
      var ok = created && (
        Number(created.success) === 1 ||
        created.success === true ||
        created.inserted_documents_id ||
        created.document_id ||
        created.id
      );
      if (!ok) {
        var failMsg = (created && (created.message || created.error)) || t('errCreateFailed');
        if (created && created.unknown && created.unknown.length) {
          failMsg += ' (' + created.unknown.join(', ') + ')';
        }
        throw new Error(failMsg);
      }

      var docId = String(
        created.inserted_documents_id ||
        created.document_id ||
        created.id ||
        ''
      );
      var okMsg = docId ? t('toastCreated', { id: docId }) : t('toastCreatedNoId');
      setCreateStatus(okMsg, 'ok');
      showToast(okMsg);
    } catch (err) {
      console.warn('[cloudplus-proposal] Documents.Add failed', err);
      var msg = (err && err.message) || t('errCreateFailed');
      var raw = err && err.raw;
      if (raw && raw.message) msg = String(raw.message);
      else if (raw && raw.unknown && raw.unknown.length) msg += ' (' + raw.unknown.join(', ') + ')';
      setCreateStatus(msg, 'error');
      showToast(msg);
    } finally {
      state.creating = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = t('createProposal');
      }
    }
  }

  function renderCategories() {
    var nav = document.getElementById('categoryNav');
    nav.innerHTML = categories.map(function (category) {
      var count = categorySelectedCount(category.id);
      return '<button class="category-button ' + (category.id === state.category ? 'active' : '') + '" type="button" data-category="' + category.id + '">' +
        '<span class="category-icon"></span><span class="category-label">' + localized(category.label) + '</span>' +
        (count ? '<span class="category-count">' + count + '</span>' : '') + '</button>';
    }).join('');
  }

  function renderServices() {
    var query = document.getElementById('serviceSearch').value.trim().toLowerCase();
    var category = categories.find(function (item) { return item.id === state.category; });
    document.getElementById('categoryDescription').textContent = localized(category.description);
    var rows = services.filter(function (service) {
      var inCategory = service.category === state.category;
      var haystack = (localized(service.name) + ' ' + localized(service.description)).toLowerCase();
      var inSearch = !query || haystack.indexOf(query) !== -1;
      return inCategory && inSearch;
    });
    document.getElementById('serviceGrid').innerHTML = rows.length ? rows.map(function (service) {
      return '<article class="service-card ' + (service.selected ? 'selected' : '') + '" data-service="' + service.id + '">' +
        (service.popular ? '<span class="popular-tag">' + t('popular') + '</span>' : '') +
        '<div class="service-card-top"><div><h3>' + localized(service.name) + '</h3><p>' + localized(service.description) + '</p></div>' +
        '<span class="service-price">₪' + money(service.price) + ' <small>/' + unitLabel(service) + '</small></span></div>' +
        '<div class="service-card-footer"><button class="select-service" type="button" data-toggle="' + service.id + '">' + (service.selected ? t('selected') : t('add')) + '</button>' +
        '<div class="quantity-control"><button type="button" data-qty="down" data-id="' + service.id + '">−</button><input data-qty-input="' + service.id + '" value="' + service.qty + '" inputmode="numeric" aria-label="' + t('quantity') + '"><button type="button" data-qty="up" data-id="' + service.id + '">+</button></div></div></article>';
    }).join('') : '<div class="empty-state">' + t('noServices') + '</div>';
  }

  function renderSummary() {
    var rows = selectedServices();
    var monthly = 0;
    var oneTime = 0;
    rows.forEach(function (service) {
      var amount = service.price * service.qty;
      if (service.billing === 'monthly') monthly += amount;
      else oneTime += amount;
    });
    document.getElementById('summaryItems').innerHTML = rows.length ? rows.map(function (service) {
      return '<div class="summary-item"><div class="summary-item-head"><strong>' + buildItemDisplayName(service) + '</strong><strong class="summary-item-price">₪' + money(service.price * service.qty) + '</strong></div>' +
        '<div class="summary-item-meta"><span>' + service.qty + ' × ₪' + money(service.price) + ' · ' + unitLabel(service) + '</span><button class="remove-item" type="button" data-remove="' + service.id + '">' + t('remove') + '</button></div></div>';
    }).join('') : '<div class="summary-empty">' + t('noServicesSelected') + '</div>';
    document.getElementById('monthlyTotal').textContent = '₪' + money(monthly);
    document.getElementById('oneTimeTotal').textContent = '₪' + money(oneTime);
    document.getElementById('itemCount').textContent = t('itemCount', { count: rows.length });
    var usedCategories = categories.filter(function (category) { return categorySelectedCount(category.id) > 0; }).length;
    document.getElementById('progressText').textContent = t('progressText', { used: usedCategories, total: categories.length });
    document.getElementById('progressBar').style.width = ((usedCategories / categories.length) * 100) + '%';
  }

  function renderAll() {
    updateDocumentDirection();
    applyStaticTranslations();
    paintLoggedInUser();
    updateCustomerLabels();
    renderCategories();
    renderServices();
    renderSummary();
  }

  function setLang(lang) {
    if (lang !== 'he' && lang !== 'en') return;
    state.lang = lang;
    persistLang(lang);
    updateDocumentDirection();
    renderAll();
    try {
      if (window.CloudPlusProposalLabels && CloudPlusProposalLabels.apply) {
        CloudPlusProposalLabels.apply(lang);
      }
    } catch (e0) { /* ignore */ }
    try {
      if (window.MineralBarI18n && typeof MineralBarI18n.setLang === 'function') {
        MineralBarI18n.setLang(lang);
        updateDocumentDirection();
        applyStaticTranslations();
        if (window.CloudPlusProposalLabels && CloudPlusProposalLabels.apply) {
          CloudPlusProposalLabels.apply(lang);
        }
      }
    } catch (e) { /* ignore */ }
  }

  function showToast(message) {
    var toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('visible');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () { toast.classList.remove('visible'); }, 2400);
  }

  function setCustomerMode(mode) {
    state.customerMode = mode;
    document.querySelectorAll('.segment').forEach(function (button) {
      button.classList.toggle('active', button.dataset.mode === mode);
    });
    document.getElementById('existingCustomerPanel').classList.toggle('hidden', mode !== 'existing');
    document.getElementById('newCustomerPanel').classList.toggle('hidden', mode !== 'new');
    document.getElementById('urlCustomerBadge').classList.toggle('hidden', mode !== 'existing' || !urlCustomerId);
    updateCustomerLabels();
  }

  // Keep summary in sync while filling the new-customer form.
  document.addEventListener('input', function (event) {
    if (!event.target || !event.target.closest) return;
    if (!event.target.closest('#newCustomerPanel')) return;
    if (state.customerMode !== 'new') return;
    var form = readNewCustomerForm();
    document.getElementById('summaryCustomer').textContent = form.name || t('newCustomerSummary');
    document.getElementById('summaryCustomerId').textContent = t('notSavedYet');
  });

  var newCustomerForm = document.getElementById('newCustomerPanel');
  if (newCustomerForm) {
    newCustomerForm.addEventListener('submit', function (event) {
      event.preventDefault();
      createProposal();
    });
  }

  document.addEventListener('click', function (event) {
    var langButton = event.target.closest('[data-lang]');
    var categoryButton = event.target.closest('[data-category]');
    var toggleButton = event.target.closest('[data-toggle]');
    var qtyButton = event.target.closest('[data-qty]');
    var removeButton = event.target.closest('[data-remove]');
    var segment = event.target.closest('[data-mode]');
    if (langButton) {
      setLang(langButton.getAttribute('data-lang'));
    } else if (categoryButton) {
      state.category = categoryButton.dataset.category;
      document.getElementById('serviceSearch').value = '';
      renderAll();
    } else if (toggleButton) {
      var service = services.find(function (item) { return item.id === toggleButton.dataset.toggle; });
      service.selected = !service.selected;
      renderAll();
    } else if (qtyButton) {
      var qtyService = services.find(function (item) { return item.id === qtyButton.dataset.id; });
      qtyService.qty = Math.max(1, qtyService.qty + (qtyButton.dataset.qty === 'up' ? 1 : -1));
      renderAll();
    } else if (removeButton) {
      services.find(function (item) { return item.id === removeButton.dataset.remove; }).selected = false;
      renderAll();
    } else if (segment) {
      setCustomerMode(segment.dataset.mode);
    }
  });

  document.addEventListener('change', function (event) {
    if (!event.target.matches('[data-qty-input]')) return;
    var service = services.find(function (item) { return item.id === event.target.dataset.qtyInput; });
    service.qty = Math.max(1, Number(event.target.value) || 1);
    renderAll();
  });

  document.getElementById('serviceSearch').addEventListener('input', renderServices);
  var customerSearchTimer = null;
  document.getElementById('customerSearch').addEventListener('input', function (event) {
    var query = event.target.value.trim();
    var results = document.getElementById('customerResults');
    if (customerSearchTimer) clearTimeout(customerSearchTimer);
    if (!query) { results.classList.add('hidden'); results.innerHTML = ''; return; }
    customerSearchTimer = setTimeout(async function () {
      if (!window.MineralBarApp || !MineralBarApp.getClient) {
        results.innerHTML = '<div class="customer-result">' + t('errNotConnected') + '</div>';
        results.classList.remove('hidden');
        return;
      }
      try {
        var okAuth = await ensureSession({ redirect: false });
        if (!okAuth) {
          results.innerHTML = '<div class="customer-result">' + t('errNotConnected') + '</div>';
          results.classList.remove('hidden');
          return;
        }
        var raw = await MineralBarApp.getClient().request('Customer.List', {
          search: query,
          q: query,
          limit: 8
        });
        var data = (raw && (raw.output || raw.data || raw.rows || raw.list)) || raw || [];
        if (!Array.isArray(data) && data && typeof data === 'object') {
          data = data.rows || data.list || data.customers || [];
        }
        if (!Array.isArray(data)) data = [];
        if (!data.length) {
          results.innerHTML = '<div class="customer-result">—</div>';
          results.classList.remove('hidden');
          return;
        }
        results.innerHTML = data.slice(0, 8).map(function (row) {
          var c = normalizeCustomer(row, '');
          return '<button class="customer-result" type="button" data-pick-customer="' + c.id + '">' +
            '<strong>' + (c.name || ('#' + c.id)) + '</strong> · ' + (c.email || '—') + ' · #' + c.id +
            '</button>';
        }).join('');
        results.classList.remove('hidden');
      } catch (err) {
        console.warn('[cloudplus-proposal] Customer.List failed', err);
        results.innerHTML = '<div class="customer-result">' + ((err && err.message) || t('errLoadCustomer')) + '</div>';
        results.classList.remove('hidden');
      }
    }, 280);
  });
  document.getElementById('customerResults').addEventListener('click', function (event) {
    var btn = event.target && event.target.closest ? event.target.closest('[data-pick-customer]') : null;
    if (!btn) return;
    var pickId = btn.getAttribute('data-pick-customer');
    this.classList.add('hidden');
    document.getElementById('selectedCustomer').classList.remove('hidden');
    document.getElementById('customerSearch').value = '';
    setCustomerMode('existing');
    loadCustomerFromApi(pickId);
  });
  document.getElementById('clearCustomer').addEventListener('click', function () {
    state.customer = { id: '', name: '', email: '', phone: '', mobile: '', companyName: '', companyId: '' };
    setCustomerLoadStatus('', false);
    document.getElementById('selectedCustomer').classList.add('hidden');
    updateCustomerLabels();
    document.getElementById('customerSearch').focus();
  });
  document.getElementById('createProposalButton').addEventListener('click', function () { createProposal(); });
  document.getElementById('resetButton').addEventListener('click', function () {
    services.forEach(function (service) { service.selected = false; });
    renderAll();
    showToast(t('toastReset'));
  });
  document.addEventListener('keydown', function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      document.getElementById('customerSearch').focus();
    }
  });

  stripLoginHash();
  if (urlCustomerId) {
    state.customer.id = urlCustomerId;
    state.customerMode = 'existing';
    document.getElementById('selectedCustomer').classList.remove('hidden');
    document.getElementById('urlCustomerBadge').classList.remove('hidden');
    setCustomerMode('existing');
  } else {
    document.getElementById('urlCustomerBadge').classList.add('hidden');
    document.getElementById('selectedCustomer').classList.add('hidden');
  }
  renderAll();

  (async function boot() {
    stripLoginHash();
    var tries = 0;
    while (!window.MineralBarApp && tries < 40) {
      await new Promise(function (r) { setTimeout(r, 100); });
      tries++;
    }
    // Require login; after login, index.html returns here via cloudplus_return_url.
    var okAuth = await ensureSession({ redirect: true });
    if (!okAuth) return;

    // Re-apply our labels after app.js MineralBarI18n runs.
    renderAll();
    paintLoggedInUser();
    var bootCustomerId = resolveCustomerIdFromUrl(new URLSearchParams(window.location.search || '')) || urlCustomerId;
    if (bootCustomerId) {
      state.customer.id = bootCustomerId;
      setCustomerMode('existing');
      document.getElementById('selectedCustomer').classList.remove('hidden');
      await loadCustomerFromApi(bootCustomerId);
    }
  })();

  // Signals to inline new-customer hotfix that app JS already handles it.
  window.__cpProposalNewCustomerCreate = true;
})();
