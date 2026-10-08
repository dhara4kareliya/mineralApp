/**
 * Deploy-proof hotfix for Documents.Add:
 * - document_lang from site UI lang (he/en)
 * - item_productdesc (+ item_notes) from service description
 *
 * Works even when proposal-app.js on the server is stale.
 */
(function () {
  'use strict';

  if (window.__cpCreateFixInstalled) return;
  window.__cpCreateFixInstalled = true;

  var SERVICE_DESC = [
    { names: ['Cloud extension', 'שלוחה בענן'], he: 'שלוחה מלאה למשתמש כולל אפליקציה', en: 'Full user extension including mobile app' },
    { names: ['IVR call router', 'נתב שיחות IVR'], he: 'תפריט קולי וניתוב לפי שעות פעילות', en: 'Voice menu and routing by business hours' },
    { names: ['Call queue', 'תור שיחות'], he: 'המתנה חכמה, מוזיקה והודעות', en: 'Smart hold, music, and announcements' },
    { names: ['Advanced contact center', 'מוקד שירות מתקדם'], he: 'דוחות נציגים וניהול עומסים', en: 'Agent reports and load management' },
    { names: ['3,000-minute bank', 'בנק 3,000 דקות'], he: 'חבילה מומלצת לעד 10 שלוחות', en: 'Recommended package for up to 10 extensions' },
    { names: ['1,000-minute bank', 'בנק 1,000 דקות'], he: 'לעסקים עם נפח שיחות נמוך', en: 'For businesses with low call volume' },
    { names: ['10GB recording storage', 'אחסון הקלטות 10GB'], he: 'שמירה וחיפוש הקלטות בענן', en: 'Store and search recordings in the cloud' },
    { names: ['100GB recording storage', 'אחסון הקלטות 100GB'], he: 'החבילה המומלצת לארגונים', en: 'Recommended package for organizations' },
    { names: ['073 number allocation', 'הקצאת מספר 073'], he: 'מספר עסקי חדש בענן', en: 'New business number in the cloud' },
    { names: ['Existing number porting', 'ניוד מספר קיים'], he: 'ניוד קו מספק תקשורת קיים', en: 'Port a line from an existing carrier' },
    { names: ['Yealink IP phone', 'טלפון IP Yealink'], he: 'דגם שולחני לעמדת עבודה', en: 'Desktop model for workstations' },
    { names: ['Power supply / PoE', 'ספק כוח / PoE'], he: 'אביזר הזנה לטלפון IP', en: 'Power accessory for IP phones' },
    { names: ['CRM connection', 'חיבור CRM'], he: 'זיהוי לקוח והקפצת כרטיס', en: 'Caller ID and contact-card popup' },
    { names: ['Custom development hour', 'שעת פיתוח מותאם'], he: 'מינימום הזמנה: 5 שעות', en: 'Minimum order: 5 hours' },
    { names: ['Business internet + Fortinet', 'אינטרנט עסקי + Fortinet'], he: 'חיבור מאובטח עם ניהול מרכזי', en: 'Secure connection with central management' },
    { names: ['Business eSIM line', 'קו eSIM עסקי'], he: 'קו סלולרי לעובד או למכשיר', en: 'Mobile line for an employee or device' },
    { names: ['PBX AI up to 5,000 minutes', 'AI למרכזיה עד 5,000 דקות'], he: 'תמלול, סיכום וניתוח שיחות', en: 'Transcription, summary, and call analysis' },
    { names: ['Fax2Mail'], he: 'קבלת פקס ישירות למייל', en: 'Receive faxes directly to email' }
  ];

  function siteLang() {
    var lang = (document.documentElement && document.documentElement.lang)
      || window.__cpProposalLang
      || '';
    try {
      var qs = new URLSearchParams(window.location.search || '');
      if (qs.get('lang') === 'en' || qs.get('lang') === 'he') lang = qs.get('lang');
    } catch (e0) { /* ignore */ }
    try {
      var stored = localStorage.getItem('cloudplus-proposal-lang')
        || localStorage.getItem('cloudplus_lang');
      if (stored === 'en' || stored === 'he') lang = stored;
    } catch (e1) { /* ignore */ }
    return lang === 'en' ? 'en' : 'he';
  }

  function lookupDescription(itemName, lang) {
    var hay = String(itemName || '');
    for (var i = 0; i < SERVICE_DESC.length; i++) {
      var row = SERVICE_DESC[i];
      for (var n = 0; n < row.names.length; n++) {
        if (hay.indexOf(row.names[n]) !== -1) {
          return lang === 'en' ? row.en : row.he;
        }
      }
    }
    return '';
  }

  function enrichPayload(body) {
    if (!body || typeof body !== 'object') return body;
    var next = {};
    for (var k in body) {
      if (Object.prototype.hasOwnProperty.call(body, k)) next[k] = body[k];
    }
    var lang = siteLang();
    next.document_lang = lang;

    var items = next.items;
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch (e2) { items = null; }
    }
    if (Array.isArray(items)) {
      items = items.map(function (it) {
        if (!it || typeof it !== 'object') return it;
        var row = {};
        for (var ik in it) {
          if (Object.prototype.hasOwnProperty.call(it, ik)) row[ik] = it[ik];
        }
        var desc = String(
          row.item_productdesc || row.item_notes || lookupDescription(row.item_name, lang) || ''
        ).trim();
        if (desc) {
          row.item_productdesc = desc;
          if (!row.item_notes) row.item_notes = desc;
        }
        return row;
      });
      next.items = JSON.stringify(items);
    }
    return next;
  }

  function patchClient(client) {
    if (!client || typeof client.request !== 'function' || client.__cpCreateFix) return client;
    var orig = client.request.bind(client);
    client.request = function (route, body) {
      if (route === 'Documents.Add') body = enrichPayload(body);
      return orig(route, body);
    };
    client.__cpCreateFix = true;
    return client;
  }

  function install() {
    if (window.__biz1FsClient) patchClient(window.__biz1FsClient);

    if (window.MineralBarApp) {
      if (typeof MineralBarApp.getClient === 'function' && !MineralBarApp.__cpCreateFixGetClient) {
        var origGet = MineralBarApp.getClient.bind(MineralBarApp);
        MineralBarApp.getClient = function () {
          return patchClient(origGet());
        };
        MineralBarApp.__cpCreateFixGetClient = true;
        try { patchClient(origGet()); } catch (e3) { /* ignore */ }
      }
      if (MineralBarApp.client) patchClient(MineralBarApp.client);
    }
  }

  install();
  var tries = 0;
  var timer = setInterval(function () {
    tries += 1;
    install();
    if (tries > 40) clearInterval(timer);
  }, 250);
})();
