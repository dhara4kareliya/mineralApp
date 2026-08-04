/**
 * Common Header, Status Bar Clock, Footer Navigation & Language Translator Engine
 */
(function (global) {
  'use strict';

  // Live Timer function
  function updateHeaderClock() {
    var now = new Date();
    var hours = now.getHours();
    var minutes = now.getMinutes();
    var strHours = hours < 10 ? '0' + hours : '' + hours;
    var strMinutes = minutes < 10 ? '0' + minutes : '' + minutes;
    var timeString = strHours + ':' + strMinutes;

    var clocks = document.querySelectorAll('.status-clock, [data-status-clock]');
    clocks.forEach(function (el) {
      el.textContent = timeString;
    });
  }

  function performLogout() {
    try {
      if (global.MineralBarApp && typeof global.MineralBarApp.logoutAndClearCache === 'function') {
        global.MineralBarApp.logoutAndClearCache();
        return;
      }
    } catch (e) { /* ignore */ }
    try {
      if (global.MineralBarApp && typeof global.MineralBarApp.clearSession === 'function') {
        global.MineralBarApp.clearSession();
      }
    } catch (e2) { /* ignore */ }
    if (global.location) global.location.replace('login.html?nocache=' + Date.now());
  }

  // Unified Language Dictionary Engine
  var dict = {
    "אישור הזמנה": "Order Confirmation",
    "בית מכירות": "Sales Dashboard",
    "גבייה": "Billing & Payments",
    "הוסף הערה": "Add Note",
    "הנפקת מסמך טופס": "Form Issuance",
    "הנפקת מסמכים": "Document Issuance",
    "הצעות מחיר": "Price Quotes",
    "הצעת מחיר סופית": "Final Price Quote",
    "התחברות": "Login",
    "התראת חתימה": "Signature Alert",
    "טכנאי דשבורד ביצועים": "Technician Dashboard",
    "טכנאי הזמנה בשטח": "Field Order",
    "טכנאי כרטיס לקוח": "Customer Card",
    "טכנאי לוז יומי": "Daily Schedule",
    "טכנאי סגירת קריאה": "Close Service Call",
    "טכנאי קריאות פתוחות": "Open Calls",
    "טכנאי שעון נוכחות": "Time Clock",
    "כל המסמכים": "All Documents",
    "כרטיס ליד": "Lead Card",
    "לקוחות": "Customers",
    "לידים": "Leads",
    "מכירות הוספת ליד": "Add New Lead",
    "מכירות הוספת לקוח": "Add New Customer",
    "מכירות משימות": "Sales Tasks",
    "מכירות סיום שיחה": "Call Completed",
    "מסמך הזמנה": "Order Document",
    "צ'אט עם לקוח": "Customer Chat",
    "רשימת לידים": "Leads List",
    "רשימת שיחות": "Call Logs",
    "שירות בחירת לקוח": "Select Customer",
    "שירות בחירת מוצר": "Select Product",
    "שירות הגדרת מוצר נבחר": "Configure Product",
    "שירות טופס הזמנה": "Order Form",
    "שירות טופס הצעת מחיר": "Quote Form",
    "שירות כל הקריאות": "All Service Calls",
    "שירות כרטיס לקוח": "Service Customer Card",
    "שירות מלאי": "Inventory",
    "שירות פרטי קריאה": "Call Details",
    "שירות פתיחת קריאה": "Open Service Call",
    "שירות צור משימה": "Create Service Task",
    "שירות שיוך טכנאי": "Assign Technician",
    "תזכורות": "Reminders",
    "ההזמנה אושרה! 🎉": "Order Approved! 🎉",
    "נציגת השירות קיבלה את ההזמנה ותיצור קשר עם הלקוח לתיאום התקנה": "The service rep received the order and will contact the customer to schedule installation",
    "סיכום הזמנה #ORD-0089": "Order Summary #ORD-0089",
    "טלפון": "Phone",
    "מקור": "Source",
    "כתובת": "Address",
    "נוצר": "Created",
    "מזהה": "ID",
    "חיוג": "Call",
    "וואטסאפ": "WhatsApp",
    "צ'אט": "Chat",
    "צור משימה": "Create task",
    "צור משימה חדשה": "Create new task",
    "לקוח": "Customer",
    "משה כהן": "Moshe Cohen",
    "מוצרים": "Products",
    "סנן ראשי אופק + ביטוח": "Horizon Main Filter + Insurance",
    "צבע": "Color",
    "לבן": "White",
    "סה\"כ": "Total",
    "סה״כ": "Total",
    "תשלום": "Payment",
    "אשראי · •••• 4782": "Credit · •••• 4782",
    "מקדמה": "Advance payment",
    "מה הלאה?": "What's Next?",
    "ההזמנה נשלחה לנציגת שירות": "Order sent to service rep",
    "לתיאום התקנה עם הלקוח": "To coordinate installation with the customer",
    "נשלח": "Sent",
    "חשבונית נשלחה ללקוח": "Invoice sent to customer",
    "חזור לדשבורד": "Back to Dashboard",
    "לטפל בלידים הבאים": "To handle next leads",
    "יציאה": "Logout",
    "מכירות": "Sales",
    "שירות": "Service",
    "טכנאי": "Tech",
    "סה״כ משימות": "Total tasks",
    "סה\"כ משימות": "Total tasks",
    "משימות": "Tasks",
    "לידים פעילים": "Active leads",
    "תיקייה 1": "Folder 1",
    "משימות פתוחות": "Open tasks",
    "פולואפ": "Follow-up",
    "שיחות": "Conversations",
    "שיחות פתוחות": "Open conversations",
    "צינור המכירות שלי": "My sales pipeline",
    "ליד חדש": "New lead",
    "נשלחה הצעה": "Offer sent",
    "משימות להיום": "Tasks for today",
    "הכל": "All",
    "הודעות": "Messages",
    "ראשי": "Main",
    "טוען…": "Loading…",
    "טוען משימות…": "Loading tasks…",
    "טוען מהשרת…": "Loading from server…",
    "באיחור": "Overdue",
    "היום": "Today",
    "דחוף": "Urgent",
    "פתוח": "Open",
    "בוקר טוב": "Good morning",
    "צהריים טובים": "Good afternoon",
    "ערב טוב": "Good evening",
    "בוצעו בדגימה": "done in sample",
    "שגיאה בטעינת לוח הבקרה": "Error loading dashboard",
    "אין משימות פתוחות כרגע": "No open tasks currently",
    "לכל המשימות ←": "All tasks ←",
    "כל המשימות": "All tasks",
    "להיום": "for today",
    "מחובר": "Connected",
    "התנתקות": "Log out",
    "האם אתה בטוח שברצונך להתנתק מהמערכת?": "Are you sure you want to log out?",
    "ביטול": "Cancel",
    "התנתק": "Log out",
    "סינון ומיון": "Filtering and sorting",
    "נקה הכל": "Clear all",
    "חיפוש לפי שם, טלפון, עיר...": "Search by name, phone, postal code...",
    "סוג": "Type",
    "סטטוס": "Status",
    "סוג חידוש": "Renewal type",
    "רלוונטי לחידושים בלבד": "Applicable to renewals only",
    "בעלים": "Owner",
    "עד תאריך": "To date",
    "מיון לפי": "Sort by",
    "הצג": "Show",
    "תוצאות": "Results",
    "חידושים": "Renewals",
    "פג כבר": "Expired",
    "השבוע": "This week",
    "החודש": "This month",
    "30 יום": "30 days",
    "מותאם": "Custom",
    "תאריך פקיעה": "Expiry date",
    "תאריך יצירה": "Creation date",
    "זמן בסטטוס": "Time in status",
    "רחוק": "Far",
    "חדש": "New",
    "ישן": "Old",
    "ארוך": "Long",
    "קצר": "Short",
    "משימה חדשה": "New mission",
    "סוג משימה": "Task type",
    "שיחת פולואפ": "Follow-up call",
    "שליחת הצעה": "Send offer",
    "שליחת תמונות": "Send photos",
    "אחר": "Other",
    "פרטים": "Details",
    "תיאור המשימה": "Mission description",
    "לדוגמה: לבדוק אם קיבל את ההצעה": "For example: Check if quote was received",
    "הערות (אופציונלי)": "Notes (optional)",
    "הוסף הקשר...": "Add more context...",
    "מועד ביצוע": "Execution date",
    "תאריך": "Date",
    "שעה": "Time",
    "עדיפות": "Priority",
    "נמוכה": "Low",
    "רגיל": "Normal",
    "שיוך": "Assignment",
    "שייך לאיש צוות": "Assign to staff member",
    "שמור שינויים": "Save changes",
    "סמן כבוצע": "Mark as done",
    "שייך לעובד אחר": "Assign to another employee",
    "בחר איש צוות...": "Select staff member...",
    "אני": "Me",
    "(אני)": "(Me)",
    "שומר…": "Saving...",
    "המשימה עודכנה": "Mission updated",
    "נא למלא תיאור משימה": "Please enter task description",
    "נא לבחור תאריך": "Please select a date",
    "מסמן…": "Marking...",
    "המשימה סומנה כבוצעה": "Mission marked as done",
    "בוצעה ✓": "Done ✓",
    "בוצעה": "Done",
    "משימה": "Mission",
    "פרטי משימה": "Mission details",
    "כבר בוצעה": "Already done",
    "משימה זו מסומנת כבוצעה": "This mission is marked as done",
    "במקום תאריך יצירה": "Instead of creation date",
    "מתאריך": "From date",
    "אימייל / שם משתמש": "Email / Username",
    "password": "Password",
    "connect": "Connect",
    "remember me": "Remember me",
    "Login to the management system": "התחברות למערכת הניהול",
    "Login to the account": "התחברות לחשבון",
    "team users": "משתמשי צוות",
    "Mineral Bar · CRM system": "Mineral Bar · מערכת CRM",
    "שגיאת API": "API Error",
    "נסה שוב": "Try again",
    "אין שיחות כרגע": "No conversations currently",
    "חזרה": "Back",
    "פייסבוק": "Facebook",
    "אינסטגרם": "Instagram",
    "אתר": "Website",
    "הפניה": "Referral",
    "שיחה נכנסת": "Incoming call",
    "נסגרה": "Closed",
    "נסגר": "Closed",
    "התחבר": "Connect",
    "זכור אותי": "Remember me",
    "סיסמה": "Password",
    "שם משתמש": "Username",
    "user name": "Username",
    "Enter a username": "הזן שם משתמש",
    "Enter a password": "הזן סיסמה",
    "I forgot password": "שכחתי סיסמה",
    "Quick entry to demo by role": "כניסה מהירה לדמו לפי תפקיד",
    "verification code (OTP)": "קוד אימות (OTP)",
    "Enter a code": "הזן קוד",
    "Sales": "מכירות",
    "Service": "שירות",
    "technician": "טכנאי",
    "Technician": "טכנאי",
    "חיפוש...": "Search...",
    "חיפוש": "Search",
    "סגור": "Close",
    "אישור": "Confirm",
    "שמירה": "Save",
    "מחיקה": "Delete",
    "עריכה": "Edit"
  };

  var sharedDictObj = { "en": dict };
  global.i18nDict = global.i18nTranslations || global.i18nDict || sharedDictObj;
  global.appI18nDict = global.i18nDict;

  function getCurrentLanguage() {
    var lang = null;
    try { lang = localStorage.getItem('app_lang'); } catch (e) {}
    if (!lang) {
      try { lang = sessionStorage.getItem('app_lang'); } catch (e) {}
    }
    lang = String(lang || 'he').toLowerCase().trim();
    if (lang !== 'en' && lang !== 'he') lang = 'he';
    return lang;
  }

  function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function translateText(text, dict) {
    if (!text || typeof text !== 'string') return text;
    var trimmed = text.trim();
    if (!trimmed) return text;

    // Exact whole-string match first (preserves leading/trailing whitespace)
    if (dict[trimmed]) {
      return text.replace(trimmed, dict[trimmed]);
    }
    // Case-insensitive exact match fallback
    var lower = trimmed.toLowerCase();
    if (dict[lower]) {
      return text.replace(trimmed, dict[lower]);
    }

    // Phrase / word replacement only on whole-word boundaries.
    // This prevents short keys like "me"/"Me" from corrupting
    // longer words (documents → docuאניnts, Comments → Comאניnts).
    var newText = text;
    var keys = Object.keys(dict).sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (!key || key.length < 2) continue;
      // Skip pure punctuation / numeric-only keys for safety
      if (!/[A-Za-z\u0590-\u05FF]/.test(key)) continue;
      try {
        var re = new RegExp('(^|[^A-Za-z\\u0590-\\u05FF])(' + escapeRegExp(key) + ')(?=[^A-Za-z\\u0590-\\u05FF]|$)', 'g');
        newText = newText.replace(re, function (_m, pre, matched) {
          return pre + dict[key];
        });
      } catch (e) {
        /* ignore bad key regex */
      }
    }
    return newText;
  }

  var translatingDom = false;

  function applyDomTranslation(root, lang) {
    root = root || document.body;
    if (!root) return;
    lang = lang || getCurrentLanguage();
    var isEn = lang === 'en';
    var activeDict = (global.i18nTranslations && global.i18nTranslations[isEn ? 'en' : 'he']) ||
                     (global.i18nDict && global.i18nDict[isEn ? 'en' : 'he']) || dict;

    translatingDom = true;
    try {
      function isTranslationExempt(node) {
        var el = node && (node.nodeType === 1 ? node : node.parentNode);
        if (!el || typeof el.closest !== 'function') return false;
        return !!el.closest('[data-no-i18n="true"]');
      }

      function walk(node) {
        if (node.nodeType === 3) {
          // Text already localized by the page (e.g. API error messages) must
          // not be re-translated word by word.
          if (isTranslationExempt(node)) return;
          var isPlaceholder = node.nodeValue && (node.nodeValue.indexOf('{{') !== -1 || node.nodeValue.indexOf('}}') !== -1);
          if (node._origText === undefined || isPlaceholder) {
            node._origText = node.nodeValue;
          } else if (!isPlaceholder) {
            // App/framework updated this text node (e.g. newly selected customer name).
            // If current value is neither the cached source nor its translation, adopt it.
            var expected = translateText(node._origText, activeDict);
            if (node.nodeValue !== node._origText && node.nodeValue !== expected) {
              node._origText = node.nodeValue;
            }
          }
          // Always translate from the original source so EN↔HE toggles cleanly
          var source = (node._origText !== undefined && !isPlaceholder) ? node._origText : node.nodeValue;
          var translated = translateText(source, activeDict);
          if (node.nodeValue !== translated) {
            node.nodeValue = translated;
          }
        } else if (node.nodeType === 1 && node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE') {
          if (node.getAttribute('data-no-i18n') === 'true') return;
          var attrs = ['placeholder', 'title', 'data-screen-label', 'aria-label'];
          for (var k = 0; k < attrs.length; k++) {
            var attr = attrs[k];
            var val = node.getAttribute(attr);
            if (val) {
              var origProp = '_orig_' + attr;
              if (node[origProp] === undefined) {
                node[origProp] = val;
              } else {
                var expectedAttr = translateText(node[origProp], activeDict);
                if (val !== node[origProp] && val !== expectedAttr) {
                  node[origProp] = val;
                }
              }
              var sourceAttr = node[origProp] !== undefined ? node[origProp] : val;
              var transAttr = translateText(sourceAttr, activeDict);
              if (val !== transAttr) {
                node.setAttribute(attr, transAttr);
              }
            }
          }
          // Form values normally contain user/API data and must not be translated.
          // Translate only explicitly marked fixed UI values.
          var i18nValue = node.getAttribute('data-i18n-value');
          if (i18nValue !== null) {
            var translatedValue = translateText(i18nValue, activeDict);
            if (node.value !== translatedValue) {
              node.value = translatedValue;
            }
          }
          for (var i = 0; i < node.childNodes.length; i++) {
            walk(node.childNodes[i]);
          }
        }
      }
      walk(root);
    } finally {
      translatingDom = false;
    }
  }

  var mutObserver = null;
  function setupMutationObserver(lang) {
    if (mutObserver) {
      mutObserver.disconnect();
      mutObserver = null;
    }

    function currentDict() {
      var isEn = getCurrentLanguage() === 'en';
      return (global.i18nTranslations && global.i18nTranslations[isEn ? 'en' : 'he']) ||
        (global.i18nDict && global.i18nDict[isEn ? 'en' : 'he']) || dict;
    }

    mutObserver = new MutationObserver(function (mutations) {
      if (translatingDom) return;
      mutObserver.disconnect();
      var chromeMayNeedRepair = false;
      var activeLang = getCurrentLanguage();
      var activeDict = currentDict();
      mutations.forEach(function (mutation) {
        if (mutation.type === 'childList') {
          chromeMayNeedRepair = true;
          mutation.addedNodes.forEach(function (node) {
            applyDomTranslation(node, activeLang);
          });
        } else if (mutation.type === 'attributes') {
          applyDomTranslation(mutation.target, activeLang);
        } else if (mutation.type === 'characterData') {
          var node = mutation.target;
          // Do NOT adopt our own Hebrew/English translation as the new source —
          // that breaks later toggles and leaves English stuck after remounts.
          if (node._origText !== undefined) {
            var expected = translateText(node._origText, activeDict);
            if (node.nodeValue === expected || node.nodeValue === node._origText) {
              applyDomTranslation(node.parentNode || node, activeLang);
              return;
            }
          }
          node._origText = node.nodeValue;
          applyDomTranslation(node.parentNode || node, activeLang);
        }
      });
      mutObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['placeholder', 'title', 'aria-label', 'data-screen-label']
      });
      if (chromeMayNeedRepair) scheduleCommonChromeRepair();
    });
    mutObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label', 'data-screen-label']
    });
  }

  global.switchAppLanguage = global.switchLanguage = function (lang) {
    try { localStorage.setItem('app_lang', lang); } catch (e) {}
    try { sessionStorage.setItem('app_lang', lang); } catch (e) {}
    applyTranslations(lang);
    try {
      global.dispatchEvent(new CustomEvent('mineralbar:language-changed', { detail: { language: lang } }));
    } catch (e) { /* older WebViews */ }
  };

  function applyTranslations(lang) {
    lang = lang || getCurrentLanguage();
    var isEn = lang === 'en';

    var dir = isEn ? 'ltr' : 'rtl';
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    document.documentElement.style.direction = dir;
    if (document.body) {
      document.body.dir = dir;
      document.body.style.direction = dir;
    }

    try { ensureCommonHeader(); } catch (e) {}

    var toggleBtns = document.querySelectorAll('.lang-translator-btn, #btn-lang-toggle');
    toggleBtns.forEach(function (btn) {
      btn.textContent = isEn ? '🌐 EN' : '🌐 HE';
    });

    applyDomTranslation(document.body, lang);
    setupMutationObserver(lang);

    if (global.MineralBarApp && typeof global.MineralBarApp.populateFolderDropdowns === 'function') {
      try { global.MineralBarApp.populateFolderDropdowns(); } catch (e) {}
    }
  }

  function getCommonChromeContainer() {
    var selectors = [
      '.screen-card',
      '.screen-content',
      '[data-screen-label]',
      '[data-common-chrome-container]',
      'div[style*="height:812px"]',
      'div[style*="height: 812px"]',
      'div[style*="border-radius:26px"]',
      'div[style*="border-radius: 26px"]',
      'div[style*="border-radius:22px"]',
      'div[style*="border-radius: 22px"]'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var candidates = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < candidates.length; j++) {
        var el = candidates[j];
        if (!el || el.closest('#common-app-header, #common-app-footer')) continue;
        // Prefer the actual phone/screen shell, not a small nested card.
        var rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
        if (!rect || rect.height >= 300 || /screen-card|screen-content/.test(el.className || '')) {
          return el;
        }
      }
    }
    return null;
  }

  // Common Top Status Bar Header Auto-Injector & Standardizer
  function ensureCommonHeader() {
    var container = getCommonChromeContainer();
    var isEn = getCurrentLanguage() === 'en';

    // Only manage chrome injected by this module. A page's own .status-bar may
    // be controlled by DC and removing it during a remount breaks reconciliation.
    var existingBar = document.querySelector('#common-app-header, [data-common-header]');
    if (existingBar) {
      // Recreate injected chrome if the page shell changed during a remount.
      if (container && !container.contains(existingBar)) {
        existingBar.remove();
        existingBar = null;
      }
    }

    if (existingBar) {
      var clock = existingBar.querySelector('.status-clock, [data-status-clock]');
      if (!clock) {
        clock = document.createElement('span');
        clock.className = 'status-clock';
        existingBar.insertBefore(clock, existingBar.firstChild);
      }
      var langBtn = existingBar.querySelector('.lang-translator-btn, #btn-lang-toggle');
      if (!langBtn) {
        langBtn = document.createElement('button');
        langBtn.type = 'button';
        langBtn.className = 'lang-translator-btn';
        langBtn.id = 'btn-lang-toggle';
        langBtn.textContent = isEn ? '🌐 EN' : '🌐 HE';
        existingBar.appendChild(langBtn);
      } else {
        langBtn.textContent = isEn ? '🌐 EN' : '🌐 HE';
      }
      var logoutBtn = existingBar.querySelector('.common-logout-btn, #btn-logout-common');
      var onLoginPage = /login/i.test((location.pathname || '') + (location.href || ''));
      if (onLoginPage) {
        if (logoutBtn) logoutBtn.style.display = 'none';
      } else if (!logoutBtn) {
        logoutBtn = document.createElement('button');
        logoutBtn.type = 'button';
        logoutBtn.className = 'common-logout-btn';
        logoutBtn.id = 'btn-logout-common';
        logoutBtn.textContent = '⎋';
        logoutBtn.setAttribute('title', 'Logout');
        logoutBtn.style.cssText = 'border:none; background:rgba(15,24,40,.08); color:#1f2a3a; border-radius:8px; padding:4px 8px; font:700 12px/1 Heebo,sans-serif; cursor:pointer;';
        var actionsWrap = existingBar.querySelector('.common-header-actions');
        if (!actionsWrap && langBtn && langBtn.parentElement && langBtn.parentElement !== existingBar) {
          actionsWrap = langBtn.parentElement;
        }
        if (!actionsWrap) {
          actionsWrap = document.createElement('div');
          actionsWrap.className = 'common-header-actions';
          actionsWrap.style.cssText = 'display:flex; align-items:center; gap:8px;';
          if (langBtn && langBtn.parentElement === existingBar) {
            existingBar.insertBefore(actionsWrap, langBtn);
            actionsWrap.appendChild(langBtn);
          } else {
            existingBar.appendChild(actionsWrap);
          }
        }
        actionsWrap.appendChild(logoutBtn);
      }
      updateHeaderClock();
      return;
    }

    if (!container) return;

    var header = document.createElement('div');
    header.id = 'common-app-header';
    header.className = 'status-bar status-bar-light';
    header.setAttribute('data-common-header', '1');
    header.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:11px 22px 4px; font-size:13px; font-weight:700; color:var(--text-title,#1f2a3a); flex:none; background:var(--bg-panel,#fff); user-select:none;';
    
    var onLoginPageNew = /login/i.test((location.pathname || '') + (location.href || ''));
    header.innerHTML = '<span class="status-clock"></span>' +
                       '<div style="display:flex; align-items:center; gap:8px;">' +
                       '<button type="button" class="lang-translator-btn" id="btn-lang-toggle">' + (isEn ? '🌐 EN' : '🌐 HE') + '</button>' +
                       (onLoginPageNew ? '' : '<button type="button" class="common-logout-btn" id="btn-logout-common" title="Logout" style="border:none; background:rgba(15,24,40,.08); color:#1f2a3a; border-radius:8px; padding:4px 8px; font:700 12px/1 Heebo,sans-serif; cursor:pointer;">⎋</button>') +
                       '</div>';

    container.insertBefore(header, container.firstChild);

    var title = document.body.getAttribute('data-header-title');
    if (title) {
      var subtitleId = document.body.getAttribute('data-header-subtitle-id');
      var subtitleHtml = subtitleId ? '<div id="' + subtitleId + '" style="font-size:12px; font-weight:700; color:#9aa3b0; margin-top:2px;">loading…</div>' : '';
      
      var actionSvg = document.body.getAttribute('data-header-action-svg');
      var actionHtmlRaw = document.body.getAttribute('data-header-action-html');
      var actionId = document.body.getAttribute('data-header-action-id') || '';
      var actionHtml = '';
      if (actionHtmlRaw) {
         actionHtml = actionHtmlRaw;
      } else if (actionSvg) {
         actionHtml = '<button id="' + actionId + '" style="width:44px; height:44px; border-radius:50%; background:#fff; border:1px solid #e7eaef; display:flex; align-items:center; justify-content:center; cursor:pointer; flex:none; box-shadow:0 2px 8px rgba(15,24,40,.04);">' + actionSvg + '</button>';
      }

      var titleHeader = document.createElement('div');
      titleHeader.id = 'common-app-page-header';
      titleHeader.style.cssText = 'background:var(--bg-panel, #fff); padding:12px 22px 14px; display:flex; align-items:center; justify-content:space-between; flex:none; ';
      
      if (!container.style.borderRadius) {
         titleHeader.style.borderRadius = '0';
      }

      titleHeader.innerHTML = '<div>' +
                              '<div style="font-size:24px; font-weight:800; color:var(--text-title, #1f2a3a); line-height:1.2;">' + title + '</div>' +
                              subtitleHtml +
                              '</div>' +
                              actionHtml;
      
      header.insertAdjacentElement('afterend', titleHeader);
      applyDomTranslation(titleHeader, getCurrentLanguage());
    }

    updateHeaderClock();
  }

  global.getCurrentLanguage = getCurrentLanguage;
  global.applyTranslations = applyTranslations;
  global.applyLanguage = applyTranslations;
  global.ensureCommonHeader = ensureCommonHeader;

  function ensureCommonFooter() {
    var container = getCommonChromeContainer();
    if (!container) return;
    
    // Check if page specifies role and tab via data attributes
    var role = null;
    if (window.MineralBarApp && typeof window.MineralBarApp.getRole === 'function') {
      role = window.MineralBarApp.getRole();
    }
    if (!role) {
      role = document.body.getAttribute('data-role');
    }
    var activeTab = document.body.getAttribute('data-active-tab');
    if (!role) return; // Do not render if no role is specified

    var existingFooter = document.getElementById('common-app-footer');
    if (existingFooter && !container.contains(existingFooter)) {
      existingFooter.remove();
      existingFooter = null;
    }
    if (existingFooter) return;

    var footer = document.createElement('div');
    footer.id = 'common-app-footer';
    footer.style.cssText = 'background:var(--bg-panel, #fff); border-top:1px solid var(--border-panel, #eceef1); padding:9px 6px 20px; display:flex; justify-content:space-around; align-items:flex-start; flex:none; direction:ltr; z-index:20;';

    function createTab(id, label, href, svgPath, colorClass, defaultColor, activeColor) {
      var isActive = (id === activeTab);
      var color = isActive ? activeColor : defaultColor;
      var weight = isActive ? '700' : '600';
      return '<a href="' + href + '" style="background:none; border:none; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:4px; padding:0; flex:1; text-decoration:none;">' +
             '<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + svgPath + '</svg>' +
             '<span style="font-size:11px; color:' + color + '; font-weight:' + weight + '; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%;">' + label + '</span>' +
             '</a>';
    }

    var html = '';
    var defaultColor = '#9aa3b0';

    if (role === 'sales') {
      var activeColor = '#1d60a2';
      html += createTab('messages', 'messages', 'calls-list.html', '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>', 'text-gray', defaultColor, activeColor);
      html += createTab('customers', 'customers', 'customers.html', '<rect x="3" y="5" width="18" height="14" rx="2.5"></rect><circle cx="8.5" cy="11" r="2.2"></circle><path d="M5.3 16c0-1.7 1.4-2.7 3.2-2.7s3.2 1 3.2 2.7"></path><path d="M14.5 10h4M14.5 13.5h3"></path>', 'text-gray', defaultColor, activeColor);
      html += createTab('tasks', 'tasks', 'sales-tasks.html', '<rect x="4" y="3" width="16" height="18" rx="2.5"></rect><path d="m8 11 2.5 2.5L15 9M8 17h6"></path>', 'text-gray', defaultColor, activeColor);
      html += createTab('leads', 'leads', 'leads-list.html', '<circle cx="9" cy="8" r="3.2"></circle><path d="M3 20c0-3.4 2.7-5.5 6-5.5s6 2.1 6 5.5"></path><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M18.5 20c0-2.6-1-4.4-2.5-5.3"></path>', 'text-gray', defaultColor, activeColor);
      html += createTab('main', 'main', 'sales-home.html', '<path d="M3 11 12 3l9 8"></path><path d="M5 9.5V20h14V9.5"></path>', 'text-gray', defaultColor, activeColor);
    } else if (role === 'service') {
      var activeColor = '#2e8a63';
      html += createTab('service', 'service', 'service-all-calls.html?status=open', '<path d="M4 13a8 8 0 0 1 16 0"></path><rect x="2.5" y="13" width="4" height="7" rx="1.6"></rect><rect x="17.5" y="13" width="4" height="7" rx="1.6"></rect>', 'text-gray', defaultColor, activeColor);
      html += createTab('messages', 'messages', 'calls-list.html', '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>', 'text-gray', defaultColor, activeColor);
      html += createTab('inventory', 'inventory', 'service-inventory.html', '<path d="M12 2 4 6.5v9L12 20l8-4.5v-9z"></path><path d="M4 6.5 12 11l8-4.5M12 11v9"></path>', 'text-gray', defaultColor, activeColor);
      html += createTab('customers', 'customers', 'customers.html', '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>', 'text-gray', defaultColor, activeColor);
      html += createTab('tasks', 'tasks', 'sales-tasks.html', '<rect x="4" y="3" width="16" height="18" rx="2.5"></rect><path d="m8 11 2.5 2.5L15 9M8 17h6"></path>', 'text-gray', defaultColor, activeColor);
    } else if (role === 'tech') {
      var activeColor = '#2e8a63';
      html += createTab('clock', 'time clock', 'tech-time-clock.html', '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5l3.2 2"/>', 'text-gray', defaultColor, activeColor);
      html += createTab('service', 'service', 'service-all-calls.html?status=open', '<path d="M4 13a8 8 0 0 1 16 0"/><rect x="2.5" y="13" width="4" height="7" rx="1.6"/><rect x="17.5" y="13" width="4" height="7" rx="1.6"/>', 'text-gray', defaultColor, activeColor);
      html += createTab('open_calls', 'open tickets', 'tech-open-calls.html', '<path d="M14.6 6.3a3.6 3.6 0 0 0-4.9 4.9l-5.4 5.4a1.5 1.5 0 0 0 2.1 2.1l5.4-5.4a3.6 3.6 0 0 0 4.9-4.9l-2.2 2.2-1.9-.2-.2-1.9z"/>', 'text-gray', defaultColor, activeColor);
      html += createTab('schedule', 'daily schedule', 'tech-daily-schedule.html', '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 9h18M8 3v4M16 3v4"/><path d="M7.5 13h3.5M7.5 16.5h7"/>', 'text-gray', defaultColor, activeColor);
      html += createTab('main', 'main', 'tech-dashboard.html', '<path d="M3 11 12 3l9 8"/><path d="M5 9.5V20h14V9.5"/>', 'text-gray', defaultColor, activeColor);
    }

    footer.innerHTML = html;
    container.appendChild(footer);
    applyDomTranslation(footer, getCurrentLanguage());
  }
  
  global.ensureCommonFooter = ensureCommonFooter;

  var chromeRepairTimer = null;
  var chromeRepairing = false;
  function repairCommonChrome() {
    if (chromeRepairing || !document.body) return;
    chromeRepairing = true;
    try {
      ensureCommonHeader();
      ensureCommonFooter();
      // DC remounts often restore English source — re-apply active language (incl. placeholders)
      applyDomTranslation(document.body, getCurrentLanguage());
    } catch (e) {
      /* A page shell may still be mounting; the next retry will handle it. */
    } finally {
      chromeRepairing = false;
    }
  }

  function scheduleCommonChromeRepair(delay) {
    if (chromeRepairTimer) clearTimeout(chromeRepairTimer);
    chromeRepairTimer = setTimeout(function () {
      chromeRepairTimer = null;
      repairCommonChrome();
    }, delay == null ? 40 : delay);
  }

  // Click Handler for Language Toggle Button
  document.addEventListener('click', function (e) {
    var langBtn = e.target.closest('.lang-translator-btn, #btn-lang-toggle');
    var logoutBtn = e.target.closest('.common-logout-btn, #btn-logout-common');
    var serviceNav = e.target.closest('a[href*="service-all-calls"]');
    if (langBtn) {
      e.preventDefault();
      var curr = getCurrentLanguage();
      var next = curr === 'en' ? 'he' : 'en';
      global.switchAppLanguage(next);
    }
    if (logoutBtn) {
      e.preventDefault();
      performLogout();
    }
    // Bottom "service" tab: always land on Open ticket filter
    if (serviceNav) {
      var path = String(window.location.pathname || '').toLowerCase();
      var onServiceCalls = path.indexOf('service-all-calls') !== -1;
      if (onServiceCalls) {
        e.preventDefault();
        try {
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', 'service-all-calls.html?status=open');
          }
        } catch (err) { /* ignore */ }
        try {
          window.dispatchEvent(new CustomEvent('service-nav:open-tickets'));
        } catch (err2) { /* ignore */ }
      }
    }
  });

  // Initialization
  function initHeader() {
    repairCommonChrome();
    updateHeaderClock();
    applyTranslations(getCurrentLanguage());
    if (global.MineralBarApp && typeof global.MineralBarApp.populateFolderDropdowns === 'function') {
      try { global.MineralBarApp.populateFolderDropdowns(); } catch (e) {}
    }
  }

  function reapplyLanguageSoon() {
    var delays = [50, 150, 400, 900, 1800, 3200];
    delays.forEach(function (delay) {
      setTimeout(function () {
        try {
          applyDomTranslation(document.body, getCurrentLanguage());
          setupMutationObserver(getCurrentLanguage());
        } catch (e) { /* ignore */ }
      }, delay);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initHeader();
    setInterval(updateHeaderClock, 1000);
    [50, 150, 400, 1000, 2000].forEach(function (delay) {
      setTimeout(repairCommonChrome, delay);
    });
    reapplyLanguageSoon();
  });
  window.addEventListener('load', function () {
    repairCommonChrome();
    reapplyLanguageSoon();
  });
  window.addEventListener('mineralbar:ready', function () {
    repairCommonChrome();
    reapplyLanguageSoon();
  });
  window.addEventListener('mineralbar:language-changed', function () {
    reapplyLanguageSoon();
  });
  if (document.readyState !== 'loading') {
    initHeader();
    [50, 150, 400, 1000].forEach(function (delay) {
      setTimeout(repairCommonChrome, delay);
    });
    reapplyLanguageSoon();
  }

})(typeof window !== 'undefined' ? window : this);


