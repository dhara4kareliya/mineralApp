/**
 * Mineral Bar official service form PDF (matches Google Doc "טופס שירות מינרל בר").
 * Builds an A4 PDF in the technician's selected UI language (EN or HE).
 */
(function (global) {
  'use strict';

  var PAGE_W = 794;
  var PAGE_H = 1123;
  var MARGIN = 54;
  var SCALE = 2;
  var FONT = 'Heebo, Arial, sans-serif';
  var INK = '#1a1a1a';
  var MUTED = '#4a4a4a';
  var LINE = '#c8c8c8';
  var BLUE = '#1d60a2';
  var GOOGLE_REVIEW_URL = 'https://www.google.com/maps/search/?api=1&query=%D7%9E%D7%99%D7%A0%D7%A8%D7%9C+%D7%91%D7%A8+%D7%A0%D7%AA%D7%A0%D7%99%D7%94';

  var WARRANTY_TERMS_HE = [
    'הריני מאשר שקראתי את כתב האחריות והסכם המכר וקיבלתי את מלוא התמורה עבור הזמנה זאת ,ואני מסכים לכל התנאים המפורטים בו.',
    'המחירים כוללים דמי הובלה והתקנה בסך 299 ₪ לבר מים , למערכת תת כיורית עלות ההתקנה 450 ₪.',
    'שווי סנן בודד 290 ₪.',
    'לכל שאלה יש להתקשר למוקד השירות 3908* או לשירות לקוחות לטלפון 073-7368420 אין להתקשר לסוכן!',
    'האחריות למוצר זה היא לתקופה של 12 חודשים ממועד התקנת המוצר שפרטיו רשומים בתעודת האחריות האחריות בגין הסננים היא לתקופה של 3 חודשים ממועד התקנת המוצר (להלן תקופת האחריות ).',
    'האחריות בגין המוצר הינו במעבדת החברה בלבד במקרה של תקלה ו/או בעיה על הצרכן להביא את המוצר למעבדת החברה בתיאום מראש עם מחלקת שירות בטלפון 073-7368420 האורזים 2 נתניה.',
    'תיקון או החלפה של המוצר לא יביאו להארכה של תקופת האחריות או לחידושה על ידי מינרל בר.',
    'אין אחריות על נזקי אבנית, למעט מערכות אוסמוזה הפוכה.',
    'בכל יציאה מעל 12 שעות מהבית חובה לסגור את ברז ההזנה למכשיר.',
    'אי החלפת סנן ע"י החברה אחת לחצי שנה בתשלום תגרור את ביטול האחריות.',
    'בכל מקרה של תקלה במכשיר ו/או פעולה בלתי תקינה ו/או הפסקת מים יש לנתק את המכשיר משקע החשמל ורשת המים.',
    'החברה מתחייבת להחזיר את המוצר תקין במסגרת תקופת האחריות ו/או לספק בר מים חליפי ברמה דומה.',
    'אחריות זו חלה רק על עלות התיקון או ההחלפה של המוצר או חלקים ממנו מינרל בר אינה אחראית לכל נזק כספי ו /או נזק אחר מכל סוג ומכל מין שהוא העלולים להיגרם עקב פעולה בלתי תקינה של המכשיר.',
    'במקרה והקלקול במוצר נגרם כתוצאה מאחת הסיבות שלהלן לא יכסה כתב האחריות את המקרה ומינרל בר תהיה רשאית לדרוש תשלום בעבור תיקון המוצר.',
    'נזק שנגרם בזדון ו/או ברשלנות על ידי הצרכן לרבות אי ניתוק המוצר מרשת החשמל ומרשת המים במקרה של תקלה במוצר תבוטל האחריות.',
    'בלאי רגיל וטבעי של המוצר ו/או פגם הנגרם בשל חדירת לכלוך ו/או מכרסמים, ג\'וקים למוצר לא יכוסה.',
    'אי תקינות שקע החשמל הלקוח חתך את תקע החשמל אליו מתחבר המוצר או שיבושים ברשת החשמל ואו המים ו/או חשיפת המכשיר לתנאי חום או לחץ קיצוניים תבוטל האחריות.',
    'אם בוצעה התקנה ע"י הלקוח לא תהיה אחריות להתקנה ו/או לנזק כתוצאה מהתקנה לא תקינה.',
    'הגבלת אחריות - תעודת אחריות זו מהווה חלק מעסקת המכר תעודת אחריות זו מחליפה כל אחריות או חובה אחרת של מינרל בר בין במפורש ובין במשתמע בין בכתב ובין בעל פה.',
    'עם חתימה על כתב אחריות הסכם מכר זה מאשר הלקוח שקיבל הדרכה על תפעול המוצר וכי הוא יודע ומבין כי בכל מקרה מהמקרים המפורטים לכתב האחריות ועליו לנתק מרשת המים והחשמל.',
    'עסקת שדרוג - בביטול עסקת שדרוג לא יושב המוצר המשודרג.',
    'התקנת המכשיר כוללת קידוח בארון ובשיש הלקוח יודע כי אין אחריות לנזקים בשיש כתוצאה מהקדיחה על הלקוח להכין את החור בשיש לביצוע ההתקנה.',
    'בכל מקרה של ביטול עסקה מוותר הלקוח על כל טענה / תביעה דרישה כלפי החברה .',
    'במסגרת הביטוח החברה מינרל בר לא תכסה נזקים לצד ג'
  ];

  var WARRANTY_TERMS_EN = [
    'I hereby confirm that I have read the warranty certificate and the sales agreement, received full consideration for this order, and I agree to all the terms set out therein.',
    'Prices include delivery and installation of 299 ₪ for a water bar; for an under-sink system installation costs 450 ₪.',
    'Value of a single filter: 290 ₪.',
    'For any question, call the service center at *3908 or customer service at 073-7368420. Do not call the agent!',
    'Warranty for this product is for 12 months from the date of installation as recorded on the warranty certificate. Warranty for filters is for 3 months from the date of product installation (hereinafter: the warranty period).',
    'Product warranty is at the company lab only. In case of a fault and/or problem the consumer must bring the product to the company lab by prior arrangement with the service department at 073-7368420, 2 Ha\'Orzim, Netanya.',
    'Repair or replacement of the product will not extend or renew the warranty period by Mineral Bar.',
    'There is no warranty for limescale damage, except for reverse osmosis systems.',
    'Whenever leaving home for more than 12 hours, the feed valve to the device must be closed.',
    'Failure to replace a filter by the company once every six months for a fee will result in cancellation of the warranty.',
    'In any case of a device fault and/or improper operation and/or water outage, disconnect the device from the electrical outlet and the water network.',
    'The company undertakes to return the product in working order within the warranty period and/or to supply a replacement water bar of a similar level.',
    'This warranty covers only the cost of repair or replacement of the product or parts thereof. Mineral Bar is not liable for any financial damage and/or any other damage of any kind that may be caused due to improper operation of the device.',
    'If the product defect was caused by one of the reasons below, the warranty certificate will not cover the case and Mineral Bar may charge for the repair.',
    'Damage caused willfully and/or negligently by the consumer, including failure to disconnect the product from electricity and water in case of a fault, will void the warranty.',
    'Normal and natural wear of the product and/or a defect caused by dirt and/or rodents or cockroaches entering the product will not be covered.',
    'A faulty electrical outlet, the customer cutting the plug to which the product connects, or disruptions in the electricity and/or water network and/or exposing the device to extreme heat or pressure will void the warranty.',
    'If installation was performed by the customer there will be no warranty for the installation and/or damage resulting from improper installation.',
    'Limitation of warranty — this warranty certificate is part of the sale transaction. This warranty certificate replaces any other warranty or obligation of Mineral Bar, whether express or implied, in writing or orally.',
    'By signing this warranty and sales agreement the customer confirms that they received operating instruction for the product and that they know and understand that in any of the cases listed in the warranty they must disconnect from the water and electricity networks.',
    'Upgrade transaction — on cancellation of an upgrade transaction the upgraded product will not be returned.',
    'Installation includes drilling in the cabinet and countertop. The customer knows there is no warranty for damage to the countertop as a result of drilling; the customer must prepare the hole in the countertop for installation.',
    'In any cancellation of a transaction the customer waives any claim / lawsuit / demand against the company.',
    'Under the insurance, Mineral Bar will not cover third-party damage.'
  ];

  var SALE_TERMS_HE = [
    'על עסקה זו חלים הוראת סעיף 14 לחוק הגנת הצרכן התשמ"א 1981 הצרכן רשאי לבטל את העסקה בהודעה בכתב למייל mineralbar1@gmail.com ו/או בדואר למשרדי החברה בכתובת האורזים 2 נתניה המוקדם מבינהם, בכפוף להשבת המוצר לבית העסק כשהוא במצבו המקורי.',
    'במידת ביטול לפני 14 יום דמי ביטול 5% מערך העסקה ו/או 100 ₪ ובניכוי עלות ההובלה / ההתקנה וכן עלויות הסננים אשר נעשה בהם שימוש ע"י הצרכן.',
    'הביטוח לא תקף במקרה של שריפה / גניבה במידה והמכשיר מושבת הלקוח רשאי לקבלת מכשיר ב 50% ממחירו המקורי.',
    'במידת ביטול העסקה לפני 14 יום הלקוח יחוייב בשווי המתנות.',
    'הביטוח לבר המים או מערכת מים תת כיורית אינו מכסה שברים או נזק כתוצאה מנזילה ללקוח או לצד ג.',
    'במידת ביטול הביטוח לפני תום תקופת השירות הלקוח יוחייב על כל התיקונים שבוצעו במחיר מלא + ביקורי טכנאי + עלות המסננים או מערכת הסינון שהותקנה לו.',
    'מוסכם בזאת כי סמכות השיפוט המקומית והעניינית הבלעדית והייחודית בכל עניין הנובע מהסכם זה, במישרין או בעקיפין, תהא מסורה אך ורק לבתי המשפט המוסמכים בעיר נתניה, ולצדדים לא תהא כל טענה בדבר חוסר סמכות או פורום בלתי נאות.'
  ];

  var SALE_TERMS_EN = [
    'This transaction is subject to section 14 of the Consumer Protection Law 5741-1981. The consumer may cancel the transaction in writing to mineralbar1@gmail.com and/or by mail to the company offices at 2 Ha\'Orzim, Netanya, whichever is earlier, subject to returning the product to the business in its original condition.',
    'If cancelled before 14 days, the cancellation fee is 5% of the transaction value and/or 100 ₪, less delivery/installation cost and the cost of filters used by the consumer.',
    'Insurance is not valid in case of fire / theft. If the device is disabled the customer may receive a device at 50% of its original price.',
    'If the transaction is cancelled before 14 days the customer will be charged the value of the gifts.',
    'Insurance for the water bar or under-sink water system does not cover breakage or damage resulting from leakage to the customer or to a third party.',
    'If insurance is cancelled before the end of the service period the customer will be charged for all repairs performed at full price + technician visits + the cost of filters or the filtration system installed for them.',
    'It is hereby agreed that exclusive local and subject-matter jurisdiction for any matter arising from this agreement, directly or indirectly, shall be vested solely in the competent courts in the city of Netanya, and the parties shall have no claim of lack of jurisdiction or inconvenient forum.'
  ];

  var COPY = {
    he: {
      formTitle: function (id, date) {
        return 'טופס שירות מס\' ' + id + '     תאריך ' + date;
      },
      customerName: 'שם הלקוח:',
      customerTz: 'תעודת זהות:',
      address: 'כתובת:',
      phone: 'טלפון:',
      warrantyMonths: 'אחריות למס\' חודשים:',
      installerName: 'שם המתקין:',
      technicianNotes: 'הערות טכנאי:',
      cashYes: 'כן',
      cashNo: 'לא',
      cashMaybe: 'כן / לא',
      cashAsked: 'האם נגבה מזומן?',
      cashAmount: 'מה הסכום שנגבה במזומן:',
      productInstalled: function (name, value) {
        return 'הותקן מוצר ' + name + ' בשווי ' + value;
      },
      filtersReplaced: function (name, value) {
        return 'הוחלפו סננים ' + name + ' בשווי ' + value;
      },
      callCenter: 'לכל שאלה ובעיה, יש להתקשר למוקד השירות 3908* שלוחה 2, אין להתקשר לסוכן',
      saleTitle: 'הסכם מכר',
      termsCheck: 'סימון על ידי הלקוח שקרא: אני מאשר שקראתי את תנאי האחריות והסכם המכר',
      signature: 'חתימת הלקוח __________________',
      signatureNote: 'חתימה על מסמך זה מהווה ראיה לכך שפרטי העסקה הוסברו והובנו ע"י הלקוח ועל רצון הצדדים להתקשר בעסקה זו.',
      footer: 'מינרל בר צ.א בע"מ  ·  *3908 שלוחה 2  ·  אין להתקשר לסוכן',
      companyName: 'מינרל בר',
      companyLine: 'מינרל בר צ.א בע"מ - טיפה אחת מעל כולם',
      companySlogan: '',
      addressLine: "רח' האורזים 2, נתניה",
      companyId: 'ח.פ 516802865',
      warranty: WARRANTY_TERMS_HE,
      sale: SALE_TERMS_HE
    },
    en: {
      formTitle: function (id, date) {
        return 'Service form No. ' + id + '     Date ' + date;
      },
      customerName: 'Customer name:',
      customerTz: 'ID number:',
      address: 'Address:',
      phone: 'Phone:',
      warrantyMonths: 'Warranty (months):',
      installerName: 'Installer name:',
      technicianNotes: 'Technician notes:',
      cashYes: 'Yes',
      cashNo: 'No',
      cashMaybe: 'Yes / No',
      cashAsked: 'Was cash collected?',
      cashAmount: 'Cash amount collected:',
      productInstalled: function (name, value) {
        return 'Product installed: ' + name + '  value ' + value;
      },
      filtersReplaced: function (name, value) {
        return 'Filters replaced: ' + name + '  value ' + value;
      },
      callCenter: 'For any question or issue, call the service center at *3908 extension 2. Do not call the agent.',
      saleTitle: 'Sales agreement',
      termsCheck: 'Customer confirmation: I confirm that I have read the warranty terms and the sales agreement',
      signature: 'Customer signature __________________',
      signatureNote: 'A signature on this document constitutes evidence that the transaction details were explained and understood by the customer and that the parties wish to enter into this transaction.',
      footer: 'Mineral Bar C.A. Ltd.  ·  *3908 ext. 2  ·  Do not call the agent',
      companyName: 'Mineral Bar',
      companyLine: 'Mineral Bar C.A. Ltd.',
      companySlogan: 'One drop above everyone',
      addressLine: "2 Ha'Orzim St., Netanya",
      companyId: 'Co. ID 516802865',
      warranty: WARRANTY_TERMS_EN,
      sale: SALE_TERMS_EN
    }
  };

  function resolveLang(explicit) {
    var raw = String(explicit == null ? '' : explicit).toLowerCase().trim();
    if (raw.indexOf('en') === 0) return 'en';
    if (raw.indexOf('he') === 0 || raw.indexOf('iw') === 0) return 'he';
    try {
      if (typeof global.getCurrentLanguage === 'function') {
        raw = String(global.getCurrentLanguage() || '').toLowerCase().trim();
        if (raw.indexOf('en') === 0) return 'en';
        if (raw.indexOf('he') === 0 || raw.indexOf('iw') === 0) return 'he';
      }
    } catch (e0) { /* ignore */ }
    try {
      raw = String((global.localStorage && global.localStorage.getItem('app_lang')) || '').toLowerCase().trim();
      if (raw.indexOf('en') === 0) return 'en';
    } catch (e1) { /* ignore */ }
    return 'he';
  }

  function dash(v) {
    var s = String(v == null ? '' : v).trim();
    return s && s !== '—' ? s : '';
  }

  function formatDate(d) {
    var dt = d instanceof Date ? d : new Date();
    var dd = String(dt.getDate()).padStart(2, '0');
    var mm = String(dt.getMonth() + 1).padStart(2, '0');
    var yy = dt.getFullYear();
    return dd + '/' + mm + '/' + yy;
  }

  function money(v) {
    var n = String(v == null ? '' : v).replace(/[^\d.]/g, '');
    return n ? (n + ' ₪') : '';
  }

  function joinItems(list) {
    return (list || []).map(function (x) {
      var name = dash(x && (x.name || x.label));
      var qty = x && x.qty && Number(x.qty) > 1 ? (' × ' + x.qty) : '';
      return name ? (name + qty) : '';
    }).filter(Boolean).join(', ');
  }

  function itemsValue(list) {
    var sum = 0;
    var any = false;
    (list || []).forEach(function (x) {
      var n = parseFloat(String((x && x.price) || '').replace(/[^\d.]/g, ''));
      if (isFinite(n) && n > 0) {
        sum += n;
        any = true;
      }
    });
    return any ? money(sum) : '';
  }

  function isFilterSpare(s) {
    return /סנן|סננ|filter|מסנן/i.test(String((s && s.name) || ''));
  }

  function splitSpares(spares) {
    var filters = [];
    var products = [];
    (spares || []).forEach(function (s) {
      if (isFilterSpare(s)) filters.push(s);
      else products.push(s);
    });
    return { filters: filters, products: products };
  }

  function waitFonts() {
    try {
      if (document.fonts && document.fonts.ready) return document.fonts.ready.catch(function () { return null; });
    } catch (e0) { /* ignore */ }
    return Promise.resolve();
  }

  function loadImage(src) {
    return new Promise(function (resolve) {
      if (!src) { resolve(null); return; }
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  function wrapText(ctx, text, maxWidth) {
    var src = String(text || '').replace(/\s+/g, ' ').trim();
    if (!src) return [''];
    var words = src.split(' ');
    var lines = [];
    var cur = '';
    for (var i = 0; i < words.length; i++) {
      var word = words[i];
      var test = cur ? (cur + ' ' + word) : word;
      if (ctx.measureText(test).width <= maxWidth) {
        cur = test;
        continue;
      }
      if (cur) lines.push(cur);
      if (ctx.measureText(word).width <= maxWidth) {
        cur = word;
        continue;
      }
      var chunk = '';
      for (var c = 0; c < word.length; c++) {
        var t2 = chunk + word.charAt(c);
        if (chunk && ctx.measureText(t2).width > maxWidth) {
          lines.push(chunk);
          chunk = word.charAt(c);
        } else {
          chunk = t2;
        }
      }
      cur = chunk;
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  }

  function strToBytes(s) {
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
    return out;
  }

  function concat(parts) {
    var n = 0;
    for (var i = 0; i < parts.length; i++) n += parts[i].length;
    var out = new Uint8Array(n);
    var o = 0;
    for (var j = 0; j < parts.length; j++) {
      out.set(parts[j], o);
      o += parts[j].length;
    }
    return out;
  }

  function dataUrlToJpegBytes(dataUrl) {
    var raw = String(dataUrl || '');
    var comma = raw.indexOf(',');
    var b64 = comma >= 0 ? raw.slice(comma + 1) : raw;
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function jpegPagesToPdf(jpegs) {
    var pageWpt = 595.28;
    var pageHpt = 841.89;
    var chunks = [];
    var pos = 0;
    var objStarts = [0];
    function add(part) {
      var bytes = typeof part === 'string' ? strToBytes(part) : part;
      chunks.push(bytes);
      pos += bytes.length;
    }
    function addObj(part) {
      objStarts.push(pos);
      add(part);
    }

    add('%PDF-1.4\n');
    var kids = [];
    for (var i = 0; i < jpegs.length; i++) kids.push((3 + i * 3) + ' 0 R');

    addObj('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n');
    addObj('2 0 obj << /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + jpegs.length + ' >> endobj\n');

    for (var p = 0; p < jpegs.length; p++) {
      var pageObj = 3 + p * 3;
      var contentObj = pageObj + 1;
      var imgObj = pageObj + 2;
      var jpeg = dataUrlToJpegBytes(jpegs[p]);
      var content = 'q ' + pageWpt.toFixed(2) + ' 0 0 ' + pageHpt.toFixed(2) + ' 0 0 cm /Im' + p + ' Do Q\n';
      addObj(pageObj + ' 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pageWpt.toFixed(2) + ' ' + pageHpt.toFixed(2) + '] /Contents ' + contentObj + ' 0 R /Resources << /XObject << /Im' + p + ' ' + imgObj + ' 0 R >> >> >> endobj\n');
      addObj(contentObj + ' 0 obj << /Length ' + content.length + ' >> stream\n' + content + 'endstream endobj\n');
      addObj(imgObj + ' 0 obj << /Type /XObject /Subtype /Image /Width ' + (PAGE_W * SCALE) + ' /Height ' + (PAGE_H * SCALE) + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpeg.length + ' >> stream\n');
      add(jpeg);
      add('\nendstream endobj\n');
    }

    var objCount = objStarts.length - 1;
    var xrefStart = pos;
    var xref = 'xref\n0 ' + (objCount + 1) + '\n0000000000 65535 f \n';
    for (var k = 1; k <= objCount; k++) {
      xref += String(objStarts[k]).padStart(10, '0') + ' 00000 n \n';
    }
    add(xref);
    add('trailer << /Size ' + (objCount + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF');
    return new Blob([concat(chunks)], { type: 'application/pdf' });
  }

  function formAssetUrl(file) {
    var src = './' + String(file || '').replace(/^\.\//, '');
    try {
      if (typeof global.mbAsset === 'function') src = global.mbAsset(src);
    } catch (e1) { /* ignore */ }
    return src;
  }

  function drawMineralBarLogo(ctx, cx, cy, r) {
    ctx.save();
    var grd = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.32, r * 0.08, cx, cy + r * 0.12, r);
    grd.addColorStop(0, '#b9e6fb');
    grd.addColorStop(0.35, '#4eb4e8');
    grd.addColorStop(0.72, '#1a7ec4');
    grd.addColorStop(1, '#0b4a86');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    ctx.fillStyle = 'rgba(210,242,255,0.42)';
    [[-0.38, -0.22, 0.22], [0.28, -0.34, 0.16], [-0.08, 0.3, 0.2], [0.34, 0.18, 0.13], [-0.46, 0.12, 0.1]].forEach(function (b) {
      ctx.beginPath();
      ctx.arc(cx + r * b[0], cy + r * b[1], r * b[2], 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = Math.max(1.5, r * 0.045);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#0a3d6e';
    ctx.lineWidth = Math.max(2, r * 0.055);
    ctx.beginPath();
    ctx.arc(cx, cy, r - ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(8,40,80,0.45)';
    ctx.shadowBlur = r * 0.08;
    ctx.fillStyle = '#fff';
    ctx.font = '800 ' + Math.round(r * 0.23) + 'px Arial, Helvetica, sans-serif';
    ctx.fillText('MINERAL BAR', cx, cy + 1);
    ctx.restore();
  }

  function drawOfficialHeader(ctx, letterheadImg, lang) {
    var isEn = lang === 'en';
    var copy = COPY[isEn ? 'en' : 'he'];
    var top = 18;
    if (!isEn && letterheadImg && letterheadImg.width) {
      var padX = 28;
      var dw = PAGE_W - padX * 2;
      var dh = dw * (letterheadImg.height / letterheadImg.width);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      try { ctx.imageSmoothingQuality = 'high'; } catch (e2) { /* ignore */ }
      ctx.drawImage(letterheadImg, padX, top, dw, dh);
      ctx.restore();
      return top + dh + 14;
    }

    var logoR = 40;
    var cx = PAGE_W / 2;
    var cy = top + logoR + 6;
    drawMineralBarLogo(ctx, cx, cy, logoR);

    ctx.save();
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = INK;
    if (isEn) {
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      ctx.font = '800 22px ' + FONT;
      ctx.fillText(copy.companyName, MARGIN, cy - 8);
      ctx.font = '400 11px ' + FONT;
      ctx.fillStyle = '#333';
      ctx.fillText(copy.companyLine, MARGIN, cy + 10);
      if (copy.companySlogan) ctx.fillText(copy.companySlogan, MARGIN, cy + 24);
      ctx.fillStyle = INK;
      ctx.textAlign = 'right';
      ctx.font = '400 12px ' + FONT;
      ctx.fillText('077-5525690', PAGE_W - MARGIN, cy - 12);
      ctx.font = '400 11px ' + FONT;
      ctx.fillText(copy.addressLine, PAGE_W - MARGIN, cy + 6);
      ctx.fillText(copy.companyId, PAGE_W - MARGIN, cy + 22);
    } else {
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.font = '800 22px ' + FONT;
      ctx.fillText(copy.companyName, PAGE_W - MARGIN, cy - 6);
      ctx.font = '400 11px ' + FONT;
      ctx.fillStyle = '#333';
      ctx.fillText(copy.companyLine, PAGE_W - MARGIN, cy + 14);
      ctx.fillStyle = INK;
      var leftX = PAGE_W / 2 - logoR - 16;
      ctx.direction = 'ltr';
      ctx.textAlign = 'right';
      ctx.font = '400 12px ' + FONT;
      ctx.fillText('077-5525690', leftX, cy - 12);
      ctx.direction = 'rtl';
      ctx.font = '400 11px ' + FONT;
      ctx.fillText(copy.addressLine, leftX, cy + 6);
      ctx.fillText(copy.companyId, leftX, cy + 22);
    }
    ctx.restore();

    return cy + logoR + 16;
  }

  function createPager(letterheadImg, lang) {
    var pages = [];
    var y = MARGIN;
    var ctx = null;
    var isEn = lang === 'en';
    var dir = isEn ? 'ltr' : 'rtl';
    var align = isEn ? 'left' : 'right';
    var edge = isEn ? MARGIN : (PAGE_W - MARGIN);
    var bulletShift = isEn ? 12 : -12;

    function newPage() {
      var canvas = document.createElement('canvas');
      canvas.width = PAGE_W * SCALE;
      canvas.height = PAGE_H * SCALE;
      ctx = canvas.getContext('2d');
      ctx.scale(SCALE, SCALE);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, PAGE_W, PAGE_H);
      ctx.direction = dir;
      pages.push({ canvas: canvas, ctx: ctx });
      y = drawOfficialHeader(ctx, letterheadImg, lang);
      return ctx;
    }

    ctx = newPage();

    function ensure(h) {
      if (y + h > PAGE_H - 40) newPage();
    }

    function setFont(size, weight) {
      ctx.font = (weight || '400') + ' ' + size + 'px ' + FONT;
      ctx.fillStyle = INK;
      ctx.direction = dir;
    }

    function textRight(str, size, weight, color) {
      setFont(size, weight);
      ctx.fillStyle = color || INK;
      ctx.textAlign = align;
      ctx.fillText(str, edge, y);
    }

    function textCenter(str, size, weight, color) {
      setFont(size, weight);
      ctx.fillStyle = color || INK;
      ctx.textAlign = 'center';
      ctx.fillText(str, PAGE_W / 2, y);
    }

    function para(str, size, leading, bullet) {
      setFont(size, '400');
      ctx.fillStyle = INK;
      ctx.textAlign = align;
      var max = PAGE_W - MARGIN * 2 - (bullet ? 14 : 0);
      var lines = wrapText(ctx, str, max);
      for (var i = 0; i < lines.length; i++) {
        ensure(leading);
        if (bullet && i === 0) ctx.fillText('*', edge, y);
        ctx.fillText(lines[i], edge + (bullet ? bulletShift : 0), y);
        y += leading;
      }
    }

    function field(label, value) {
      ensure(22);
      setFont(13, '600');
      ctx.textAlign = align;
      ctx.fillStyle = INK;
      var shown = dash(value) || '________________';
      ctx.fillText(label + ' ' + shown, edge, y);
      y += 22;
    }

    return {
      get ctx() { return ctx; },
      get y() { return y; },
      set y(v) { y = v; },
      pages: pages,
      lang: lang,
      isEn: isEn,
      newPage: newPage,
      ensure: ensure,
      setFont: setFont,
      textRight: textRight,
      textCenter: textCenter,
      para: para,
      field: field
    };
  }

  function drawFooters(pages, lang) {
    var copy = COPY[lang === 'en' ? 'en' : 'he'];
    for (var i = 0; i < pages.length; i++) {
      var ctx = pages[i].ctx;
      ctx.save();
      ctx.direction = lang === 'en' ? 'ltr' : 'rtl';
      ctx.font = '400 10px ' + FONT;
      ctx.fillStyle = '#8a8a8a';
      ctx.textAlign = 'center';
      ctx.fillText(copy.footer, PAGE_W / 2, PAGE_H - 22);
      ctx.save();
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      ctx.fillText((i + 1) + ' / ' + pages.length, MARGIN, PAGE_H - 22);
      ctx.restore();
      ctx.restore();
    }
  }

  async function renderForm(data) {
    data = data || {};
    var lang = resolveLang(data.lang);
    var copy = COPY[lang];
    await waitFonts();
    var letterheadImg = lang === 'he' ? await loadImage(formAssetUrl('mineral-bar-letterhead.png')) : null;
    var sigImg = await loadImage(data.signatureDataUrl || data.signatureUrl || '');
    var pager = createPager(letterheadImg, lang);
    var isEn = pager.isEn;

    pager.textCenter(copy.formTitle(data.ticketId || '____', data.date || formatDate()), 14, '700');
    pager.y += 28;

    pager.field(copy.customerName, data.customerName);
    pager.field(copy.customerTz, data.customerTz);
    pager.field(copy.address, data.address);
    pager.field(copy.phone, data.phone);
    pager.field(copy.warrantyMonths, data.warrantyMonths);
    pager.field(copy.installerName, data.installerName);
    pager.field(copy.technicianNotes, data.technicianNotes);
    pager.y += 8;

    var cashLabel = data.cashCollected === 'yes' ? copy.cashYes : (data.cashCollected === 'no' ? copy.cashNo : copy.cashMaybe);
    pager.para(copy.cashAsked + ' ' + cashLabel, 13, 20, true);
    pager.para(copy.cashAmount + ' ' + (data.cashCollected === 'yes' ? (data.cashAmount || '______') : '______'), 13, 20, true);
    pager.para(copy.productInstalled(data.productLine || '__________', data.productValue || '______'), 13, 20, true);
    pager.para(copy.filtersReplaced(data.filterLine || '_________', data.filterValue || '______'), 13, 20, true);
    pager.y += 8;
    pager.para(copy.callCenter, 12.5, 18, true);
    pager.y += 16;

    copy.warranty.forEach(function (t) {
      pager.para(t, 11, 16, true);
    });

    pager.y += 10;
    pager.ensure(28);
    pager.textRight(copy.saleTitle, 16, '800');
    pager.y += 22;
    copy.sale.forEach(function (t) {
      pager.para(t, 11, 16, true);
    });

    pager.y += 14;
    pager.ensure(26);
    pager.para(copy.termsCheck + (data.termsAccepted ? '  ✓' : ''), 12.5, 18, true);
    pager.y += 10;

    pager.ensure(110);
    var ctx = pager.ctx;
    var boxX = isEn ? MARGIN : (PAGE_W - MARGIN - 260);
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, pager.y, 260, 78);
    if (sigImg) {
      var boxW = 250;
      var boxH = 70;
      var ratio = Math.min(boxW / (sigImg.width || 1), boxH / (sigImg.height || 1));
      var dw = (sigImg.width || 1) * ratio;
      var dh = (sigImg.height || 1) * ratio;
      ctx.drawImage(sigImg, boxX + 5 + (boxW - dw) / 2, pager.y + 4, dw, dh);
    }
    pager.y += 96;
    pager.textRight(copy.signature, 13, '600');
    pager.y += 20;
    pager.para(copy.signatureNote, 11, 16, false);

    drawFooters(pager.pages, lang);
    return pager.pages.map(function (p) {
      return p.canvas.toDataURL('image/jpeg', 0.9);
    });
  }

  async function buildPdfFile(data, fileName) {
    var jpegs = await renderForm(data || {});
    var blob = jpegPagesToPdf(jpegs);
    var name = fileName || ('service-form-' + (data && data.ticketId || 'ticket') + '.pdf');
    try {
      return new File([blob], name, { type: 'application/pdf' });
    } catch (e) {
      blob.name = name;
      return blob;
    }
  }

  function collectFormData(st, summary, media, extra) {
    extra = extra || {};
    var parts = splitSpares((st && st.spares) || []);
    var products = parts.products.length ? parts.products : ((st && st.linkedProducts) || []).filter(function (p) {
      return !isFilterSpare(p);
    });
    var filters = parts.filters;
    var wMonths = String((st && st.warrantyMonths) != null && st.warrantyMonths !== '' ? st.warrantyMonths : '0');
    return {
      ticketId: String((st && st.ticketId) || '').replace(/^#/, ''),
      date: extra.date || formatDate(),
      customerName: dash(st && st.customerName),
      customerTz: dash(extra.customerTz || (st && (st.customerTz || st.tz))),
      address: dash(st && st.customerAddress),
      phone: dash(st && st.customerPhone),
      warrantyMonths: wMonths,
      installerName: dash(st && st.installerName),
      technicianNotes: dash(summary),
      cashCollected: (st && st.cash) || '',
      cashAmount: money(st && st.cashAmount),
      productLine: joinItems(products),
      productValue: itemsValue(products),
      filterLine: joinItems(filters),
      filterValue: itemsValue(filters),
      termsAccepted: !!(st && st.terms),
      signatureDataUrl: extra.signatureDataUrl || '',
      signatureUrl: (media && media.signature) || '',
      lang: resolveLang(extra.lang)
    };
  }

  global.ServiceFormPdf = {
    GOOGLE_REVIEW_URL: GOOGLE_REVIEW_URL,
    WARRANTY_TERMS: WARRANTY_TERMS_HE,
    SALE_TERMS: SALE_TERMS_HE,
    WARRANTY_TERMS_HE: WARRANTY_TERMS_HE,
    WARRANTY_TERMS_EN: WARRANTY_TERMS_EN,
    SALE_TERMS_HE: SALE_TERMS_HE,
    SALE_TERMS_EN: SALE_TERMS_EN,
    resolveLang: resolveLang,
    formatDate: formatDate,
    splitSpares: splitSpares,
    collectFormData: collectFormData,
    previewPages: renderForm,
    buildPdfFile: buildPdfFile
  };
})(typeof window !== 'undefined' ? window : this);
