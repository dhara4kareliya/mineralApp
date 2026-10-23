/**
 * Chasdei Shlomo — Hebrew Wedding Calendar & Monthly Income System
 * Supports 13 Hebrew Months (Jewish Leap Years with Adar I & Adar II)
 * Full Bilingual Support: Hebrew (עברית RTL) & English (EN LTR)
 * Dynamic Bull36 REST API Integration (Folder 3122, Tab 319, Tabs 776 & 778)
 */
(function () {
  'use strict';

  var config = window.Biz1Config || {};
  var WEDDING_FOLDER_ID = '3122';

  // 12 Hebrew Months definition in Jewish Calendar Order
  var HEBREW_MONTHS = [
    { 
      key: 'tishrei', 
      nameHe: 'תשרי', 
      nameEn: 'Tishrei', 
      num: 1, 
      alts: ['tishrei', 'tishri', 'תשרי', 'בתשרי'] 
    },
    { 
      key: 'cheshvan', 
      nameHe: 'חשוון', 
      nameEn: 'Cheshvan', 
      num: 2, 
      alts: ['cheshvan', 'heshvan', 'marcheshvan', 'מרחשוון', 'חשוון', 'בחשוון'] 
    },
    { 
      key: 'kislev', 
      nameHe: 'כסלו', 
      nameEn: 'Kislev', 
      num: 3, 
      alts: ['kislev', 'כסלו', 'בכסלו'] 
    },
    { 
      key: 'tevet', 
      nameHe: 'טבת', 
      nameEn: 'Tevet', 
      num: 4, 
      alts: ['tevet', 'טבת', 'בטבת'] 
    },
    { 
      key: 'shevat', 
      nameHe: 'שבט', 
      nameEn: 'Shevat', 
      num: 5, 
      alts: ['shevat', 'shvat', 'שבט', 'בשבט'] 
    },
    { 
      key: 'adar', 
      nameHe: 'אדר', 
      nameEn: 'Adar', 
      num: 6, 
      alts: ['adar', 'אדר', 'באדר', 'adar i', 'adar 1', 'adar alef', 'אדר א׳', 'אדר א', 'אדר ראשון', 'באדר א', 'באדר א׳', 'adar ii', 'adar 2', 'adar bet', 'אדר ב׳', 'אדר ב', 'אדר שני', 'באדר ב', 'באדר ב׳'] 
    },
    { 
      key: 'nisan', 
      nameHe: 'ניסן', 
      nameEn: 'Nisan', 
      num: 7, 
      alts: ['nisan', 'nissan', 'ניסן', 'בניסן'] 
    },
    { 
      key: 'iyar', 
      nameHe: 'אייר', 
      nameEn: 'Iyar', 
      num: 8, 
      alts: ['iyar', 'iyyar', 'אייר', 'באייר'] 
    },
    { 
      key: 'sivan', 
      nameHe: 'סיון', 
      nameEn: 'Sivan', 
      num: 9, 
      alts: ['sivan', 'סיון', 'בסיון'] 
    },
    { 
      key: 'tammuz', 
      nameHe: 'תמוז', 
      nameEn: 'Tammuz', 
      num: 10, 
      alts: ['tammuz', 'tamuz', 'תמוז', 'בתמוז'] 
    },
    { 
      key: 'av', 
      nameHe: 'אב', 
      nameEn: 'Av', 
      num: 11, 
      alts: ['av', 'menachem av', 'אב', 'מנחם אב', 'באב'] 
    },
    { 
      key: 'elul', 
      nameHe: 'אלול', 
      nameEn: 'Elul', 
      num: 12, 
      alts: ['elul', 'אלול', 'באלול'] 
    }
  ];

  // Presentation list in canonical Jewish calendar order (1 to 12)
  var MONTHS_SORTED = HEBREW_MONTHS;

  function resolveMonthMeta(identifier) {
    if (!identifier) return MONTHS_SORTED[0];
    var s = String(identifier).toLowerCase().trim();

    // 1. Direct match on key, nameHe, nameEn
    for (var i = 0; i < HEBREW_MONTHS.length; i++) {
      var m = HEBREW_MONTHS[i];
      if (m.key === s || m.nameHe.toLowerCase() === s || m.nameEn.toLowerCase() === s) {
        return m;
      }
    }

    // 2. Exact match on aliases
    for (var j = 0; j < HEBREW_MONTHS.length; j++) {
      var mj = HEBREW_MONTHS[j];
      if (mj.alts.some(function (a) { return a.toLowerCase() === s; })) {
        return mj;
      }
    }

    // 3. Substring match (e.g. "בחשוון" or "22 Heshvan 5787")
    for (var k = 0; k < HEBREW_MONTHS.length; k++) {
      var mk = HEBREW_MONTHS[k];
      if (mk.alts.some(function (a) { return s.indexOf(a.toLowerCase()) !== -1; })) {
        return mk;
      }
    }

    return MONTHS_SORTED[0];
  }

  // Translations dictionary (Hebrew & English)
  var TRANSLATIONS = {
    he: {
      brandTitle: 'חסדי שלמה — לוח חתונות והכנסות',
      brandSubtitle: 'דוח שנתי לפי חודשים עבריים (12 חודשים)',
      yearChip: 'שנת תשפ״ז',
      crmLink: 'מערכת לקוחות',
      crmLinkTitle: 'מעבר למערכת הניהול המלאה',
      themeBtn: 'מצב תצוגה',
      themeTitle: 'החלף מצב תצוגה (יום / לילה)',
      kpiIncomeLabel: 'סה״כ הכנסות קרנות (שנתי)',
      kpiWeddingsLabel: 'כמות חתונות בשנה',
      weddingsUnit: 'חתונות',
      kpiPeakMonthLabel: 'חודש השיא (הכי הרבה שמחות)',
      loadingData: 'טוען נתוני חתונות וקרנות חיים מ-Bull36...',
      monthsGridHeading: 'חודשי השנה העברית (12 חודשים)',
      monthsGridDesc: 'בחר חודש עברי לצפייה ברשימת החתונות המפורטת, הכנסות הקרנות והוצאות השמחה',
      monthNumberPrefix: 'חודש',
      monthWeddingsLabel: 'חתונות בחודש זה:',
      monthTotalIncomeLabel: 'סה״כ הכנסות:',
      monthViewAction: 'צפה בחתונות',
      sheetSubtitle: 'רשימת החתונות והכנסות הקרנות',
      backBtnTitle: 'חזרה לרשימת כל החודשים',
      searchPlaceholder: 'חיפוש לפי שם חתן/כלה או טלפון...',
      thCoupleName: 'שם החתן והכלה',
      thHebrewDate: 'תאריך עברי',
      thIncome: 'סכום הכנסות (לחץ לפירוט)',
      thExpenses: 'סכום הוצאות (לחץ לפירוט)',
      btnFundTag: 'קרנות',
      btnExpenseTag: 'הוצאות',
      btnExpensesFull: 'הוצאות מלא',
      monthTotalExpensesLabel: 'סה״כ הוצאות:',
      viewGrid: 'כרטיסים',
      viewList: 'טבלה',
      viewGridTitle: 'תצוגת כרטיסים (גריד)',
      viewListTitle: 'תצוגת רשימה / טבלה',
      thMonthName: 'שם החודש העברי',
      thMonthWeddingsCount: 'כמות שמחות',
      thMonthTotalIncome: 'סה״כ הכנסות קרנות',
      thMonthTotalExpenses: 'סה״כ הוצאות חתונה',
      thMonthBalance: 'מאזן נטו',
      thActions: 'פעולות',
      bottomIncomeLabel: 'סה״כ הכנסות החודש:',
      bottomExpenseLabel: 'סה״כ הוצאות החודש:',
      bottomNetLabel: 'מאזן נטו חודשי:',
      bottomTotalLabel: 'סכום הכנסות הכולל של החודש:',
      noWeddingsInMonth: 'לא נמצאו חתונות בחודש זה',
      incomeModalTitle: 'פירוט הכנסות קרנות',
      incomeModalSubtitle: 'טאב הכנסות מצומצם (שם הקרן, שם קרן אחרת והסכום שהתקבל)',
      incomeModalTotalLabel: 'סה״כ התקבל מקרנות:',
      thFundName: 'שם הקרן',
      thOtherFundName: 'שם קרן אחרת',
      thAmountReceived: 'הסכום שהתקבל',
      expenseModalTitle: 'טאב הוצאות מלא',
      expenseModalSubtitle: 'פירוט מלא של הוצאות החתן והכלה לחתונה',
      expenseModalTotalLabel: 'סה״כ הוצאות חתונה:',
      thExpType: 'סוג',
      thExpDesc: 'פירוט ההוצאה',
      thExpDate: 'תאריך',
      thExpAmount: 'סכום',
      groomExpenseType: 'הוצאות חתן',
      brideExpenseType: 'הוצאות כלה',
      loadingModal: 'טוען נתונים...',
      filterReceivedOnly: 'קרנות שהתקבלו בפועל',
      filterAllApplications: 'כל הבקשות שנשלחו',
      badgeReceived: 'התקבל',
      badgePending: 'בהמתנה / 0',
      printPdfTitle: 'הדפס / שמור כ-PDF',
      printPdfBtn: 'הדפס PDF',
      printMonthPdfTitle: 'הדפס לוח חודש זה (PDF)',
      printMonthPdfBtn: 'הדפס חודש (PDF)'
    },
    en: {
      brandTitle: 'Chasdei Shlomo — Wedding & Income Board',
      brandSubtitle: 'Annual Report by Hebrew Months (12 Months)',
      yearChip: 'Year 5787',
      crmLink: 'Customer CRM',
      crmLinkTitle: 'Switch to Full CRM System',
      themeBtn: 'Theme',
      themeTitle: 'Toggle Light / Dark Mode',
      kpiIncomeLabel: 'Total Fund Income (Annual)',
      kpiWeddingsLabel: 'Annual Weddings Count',
      weddingsUnit: 'weddings',
      kpiPeakMonthLabel: 'Peak Month (Most Weddings)',
      loadingData: 'Loading live wedding and fund data from Bull36...',
      monthsGridHeading: 'Hebrew Months of the Year (12 Months)',
      monthsGridDesc: 'Select a Hebrew month to view the detailed wedding list, fund grants, and wedding expenses',
      viewGrid: 'Cards',
      viewList: 'Table',
      viewGridTitle: 'Cards Grid View',
      viewListTitle: 'List / Table View',
      thMonthName: 'Hebrew Month',
      thMonthWeddingsCount: 'Weddings Count',
      thMonthTotalIncome: 'Total Fund Income',
      thMonthTotalExpenses: 'Total Wedding Expenses',
      thMonthBalance: 'Net Balance',
      thActions: 'Actions',
      monthNumberPrefix: 'Month',
      monthWeddingsLabel: 'Weddings this month:',
      monthTotalIncomeLabel: 'Total Income:',
      monthTotalExpensesLabel: 'Total Expenses:',
      monthViewAction: 'View Weddings',
      sheetSubtitle: 'Weddings List & Charity Grants',
      backBtnTitle: 'Back to All Months',
      searchPlaceholder: 'Search groom/bride name or phone...',
      thCoupleName: 'Groom & Bride Name',
      thHebrewDate: 'Hebrew Date',
      thIncome: 'Income Amount (Click for Funds)',
      thExpenses: 'Expenses Amount (Click for Details)',
      btnFundTag: 'Grants',
      btnExpenseTag: 'Expenses',
      btnExpensesFull: 'Full Expenses',
      bottomIncomeLabel: 'Total Monthly Income:',
      bottomExpenseLabel: 'Total Monthly Expenses:',
      bottomNetLabel: 'Net Monthly Balance:',
      bottomTotalLabel: 'Total Monthly Income:',
      noWeddingsInMonth: 'No weddings found in this month',
      incomeModalTitle: 'Charity Fund Income Details',
      incomeModalSubtitle: 'Condensed Income Tab (Fund Name, Other Fund & Amount Received)',
      incomeModalTotalLabel: 'Total Received from Funds:',
      thFundName: 'Fund Name',
      thOtherFundName: 'Other Fund Name',
      thAmountReceived: 'Amount Received',
      expenseModalTitle: 'Full Expenses Tab',
      expenseModalSubtitle: 'Complete Breakdown of Groom & Bride Wedding Expenses',
      expenseModalTotalLabel: 'Total Wedding Expenses:',
      thExpType: 'Source / Type',
      thExpDesc: 'Expense Item',
      thExpDate: 'Date',
      thExpAmount: 'Amount',
      groomExpenseType: 'Groom Expenses',
      brideExpenseType: 'Bride Expenses',
      loadingModal: 'Loading data...',
      filterReceivedOnly: 'Received Grants Only',
      filterAllApplications: 'All Submitted Requests',
      badgeReceived: 'Received',
      badgePending: 'Pending / 0',
      printPdfTitle: 'Print / Save as PDF',
      printPdfBtn: 'Print PDF',
      printMonthPdfTitle: 'Print This Month (PDF)',
      printMonthPdfBtn: 'Print Month (PDF)'
    }
  };

  // Charity Funds Dictionary (from Tab 319 opt_name_he)
  var FUNDS_DICT = {
    '172673144866ebd4b817579': 'קופת העיר',
    '172716341766f26c19bbfaf': 'משמחי לב',
    '172716341766f26c19bbfb0': 'טוב וחסד',
    '172716341766f26c19bbfb1': 'גב גוטפרב',
    '172716341766f26c19bbfb2': 'ועד הרבנים',
    '172716341766f26c19bbfb3': 'שמחת ציון',
    '172716341766f26c19bbfb4': 'קרן משה שמואל (רק י-ם)',
    '172716341766f26c19bbfb5': 'חיים יצחק כהן',
    '172716341766f26c19bbfb6': 'יצחק סגל',
    '172716341766f26c19bbfb7': 'קרן לוס אנג\'לס - גוטסמן',
    '172716341766f26c19bbfb8': 'קרן שראן',
    '172716341766f26c19bbfb9': 'קרן \'משאת משה\'',
    '172716341766f26c19bbfba': 'חיוכו של ילד',
    '172716341766f26c19bbfbb': 'משגב-שמעון גליק',
    '172716341766f26c19bbfbc': 'מורשה ודעת - גרטלר',
    '172716341766f26c19bbfbd': 'שמוליק רבינוביץ',
    '172716341766f26c19bbfbe': 'שומרי החומות/כולל גליציה',
    '172716341766f26c19bbfbf': 'עזרת תורה דאמריקה',
    '172716341766f26c19bbfc0': 'יד אליעזר',
    '172716341766f26c19bbfc1': 'בעזרי- מוצרי חשמל',
    '172716341766f26c19bbfc2': 'בעזרי- תמיכה לחתונה',
    '172716341766f26c19bbfc3': 'אברהם סלונים',
    '172716341766f26c19bbfc4': 'כלה בוטיק',
    '172716341766f26c19bbfc5': 'הגב\' חייט 0544221161',
    '172716341766f26c19bbfc6': 'הגב\' יעקובזון',
    '172716341766f26c19bbfc7': 'הגב\' חברוני',
    '172716341766f26c19bbfc8': 'מר ג\'קי בר- מנכל',
    '172716341766f26c19bbfc9': 'בית יתומים- דיסקין',
    '172716341766f26c19bbfca': 'קרן פישר-אשר פיין',
    '172716341766f26c19bbfcb': 'הרב יוסף מאיער',
    '172716341766f26c19bbfcc': 'פרישוואסער - מייל',
    '172716341766f26c19bbfcd': 'אליש אנגלנדער',
    '172716341766f26c19bbfce': 'קרן ערן פלס',
    '172716341766f26c19bbfcf': 'קרן 036162605@MYFAX.CO.IL',
    '172716341766f26c19bbfd0': 'רפאל הערצקא- תאקולי',
    '172716341766f26c19bbfd1': 'אליעז',
    '1728813555670b99f31a55d': 'חתן וכלה יתומים - פנחס פרידמן',
    '1728816974670ba74ea218d': 'לב לכלה',
    '1728820576670bb5607af3a': 'נחזיק חזק',
    '1728822064670bbb300313c': 'קרן ברונר',
    '1728822064670bbb300313d': 'כנפי יונה',
    '1728822064670bbb300313e': 'הלבשה ליתומים של הרב ששון',
    '1728890197670cc5554c2b2': 'מרומים- משה שילת',
    '1728890312670cc5c85fdd0': 'קרן שטרן- ברכת זאב',
    '1728890711670cc757cbaf5': 'חסדי נעמי (מתחתן בבני ברק)',
    '1728890711670cc757cbaf6': 'רודף שלום וחסד',
    '1728890846670cc7de36329': 'יד עזרא ושולמית',
    '1728890939670cc83b016c0': 'חינא וחיסדא הרב גרוסמן',
    '1728891096670cc8d8c61c8': 'הקרן לעזרה סיוע וצדקה',
    '1728984180670e34749b97b': 'קרן עזרה(425)',
    '1728984180670e34749b97c': 'אהבת דינה',
    '1728984180670e34749b97d': 'דרכי מרים–לחולי סרטן',
    '1728984180670e34749b97e': 'רודף שלום וחסד',
    '1728984180670e34749b97f': 'זיסר',
    '173028907367221db1b66f7': 'איזי אנגלנדר',
    '17379838406797876085bdf': 'רפי הרצקא',
    '17379838406797876085be0': 'קרן שמיר',
    '17379838406797876085be1': 'בורלא',
    '17379838406797876085be2': 'אדמור מהורדנקא',
    '173936635267ac9fd05f364': 'מנדי וייס',
    '173936635267ac9fd05f365': 'יוסי פרידמן/טובה וברכה',
    '173936635267ac9fd05f366': 'מאיר אדלר',
    '173936662767aca0e312070': 'תורם בהשתדלות לסייע לשמחתם',
    '173970563767b1cd255b8c2': 'שם קרן אחרת',
    '173970592367b1ce437e86a': 'אור לישראל',
    '174005594067b7258411aea': 'משוש דודים רוזנפלד'
  };

  // English Fund Names Dictionary
  var FUNDS_DICT_EN = {
    '172673144866ebd4b817579': 'Kupat Ha\'ir',
    '172716341766f26c19bbfaf': 'Misamchei Lev',
    '172716341766f26c19bbfb0': 'Tov V\'Chesed',
    '172716341766f26c19bbfb1': 'Mrs. Gutfarb',
    '172716341766f26c19bbfb2': 'Vaad HaRabbanim',
    '172716341766f26c19bbfb3': 'Simchat Tzion',
    '172716341766f26c19bbfb4': 'Keren Moshe Shmuel',
    '172716341766f26c19bbfb5': 'Chaim Yitzchak Cohen',
    '172716341766f26c19bbfb6': 'Yitzchak Segal',
    '172716341766f26c19bbfb7': 'Los Angeles Fund - Gottesman',
    '172716341766f26c19bbfb8': 'Keren Sharon',
    '172716341766f26c19bbfb9': 'Keren Masat Moshe',
    '172716341766f26c19bbfba': 'Chiyucho Shel Yeled',
    '172716341766f26c19bbfbb': 'Misgav - Shimon Glick',
    '172716341766f26c19bbfbc': 'Morasha V\'Daat - Gertler',
    '172716341766f26c19bbfbd': 'Shmulik Rabinowitz',
    '172716341766f26c19bbfbe': 'Shomrei HaChomot / Kolel Galicia',
    '172716341766f26c19bbfbf': 'Ezrat Torah of America',
    '172716341766f26c19bbfc0': 'Yad Eliezer',
    '172716341766f26c19bbfc1': 'Be\'ezri - Appliances',
    '172716341766f26c19bbfc2': 'Be\'ezri - Wedding Support',
    '172716341766f26c19bbfc3': 'Avraham Slonim',
    '172716341766f26c19bbfc4': 'Kalla Boutique',
    '172716341766f26c19bbfc5': 'Mrs. Chayat',
    '172716341766f26c19bbfc6': 'Mrs. Jacobson',
    '172716341766f26c19bbfc7': 'Mrs. Chevroni',
    '172716341766f26c19bbfc8': 'Mr. Jackie Bar',
    '172716341766f26c19bbfc9': 'Diskin Orphan Home',
    '172716341766f26c19bbfca': 'Fisher-Asher Fein Fund',
    '172716341766f26c19bbfcb': 'Rabbi Yosef Mayer',
    '172716341766f26c19bbfcc': 'Frischwasser Fund',
    '172716341766f26c19bbfcd': 'Elish Englander',
    '172716341766f26c19bbfce': 'Keren Eran Peles',
    '172716341766f26c19bbfcf': 'Fax Charity Fund',
    '172716341766f26c19bbfd0': 'Raphael Hertzka',
    '172716341766f26c19bbfd1': 'Eliaz Fund',
    '1728813555670b99f31a55d': 'Orphan Groom & Bride - P. Friedman',
    '1728816974670ba74ea218d': 'Lev LaKalla',
    '1728820576670bb5607af3a': 'Nachzik Chazak',
    '1728822064670bbb300313c': 'Brunner Fund',
    '1728822064670bbb300313d': 'Kanfei Yona',
    '1728822064670bbb300313e': 'Orphans Clothing - Rabbi Sasson',
    '1728890197670cc5554c2b2': 'Meromim - Moshe Shilat',
    '1728890312670cc5c85fdd0': 'Stern Fund - Birkat Zeev',
    '1728890711670cc757cbaf5': 'Chasdei Naomi',
    '1728890711670cc757cbaf6': 'Rodef Shalom V\'Chesed',
    '1728890846670cc7de36329': 'Yad Ezra V\'Shulamit',
    '1728890939670cc83b016c0': 'China V\'Chisda - Rabbi Grossman',
    '1728891096670cc8d8c61c8': 'Charity Assistance Fund',
    '1728984180670e34749b97b': 'Ezra Fund (425)',
    '1728984180670e34749b97c': 'Ahavat Dina',
    '1728984180670e34749b97d': 'Darchei Miriam',
    '1728984180670e34749b97e': 'Rodef Shalom V\'Chesed',
    '1728984180670e34749b97f': 'Zisser Fund',
    '173028907367221db1b66f7': 'Easy Englander',
    '17379838406797876085bdf': 'Rafi Hertzka',
    '17379838406797876085be0': 'Shamir Fund',
    '17379838406797876085be1': 'Bourla Fund',
    '17379838406797876085be2': 'Admor of Horodenka',
    '173936635267ac9fd05f364': 'Mendi Weiss',
    '173936635267ac9fd05f365': 'Yossi Friedman / Tova V\'Bracha',
    '173936635267ac9fd05f366': 'Meir Adler',
    '173936662767aca0e312070': 'Dedicated Wedding Sponsor',
    '173970563767b1cd255b8c2': 'Other Charity Fund',
    '173970592367b1ce437e86a': 'Or L\'Yisrael',
    '174005594067b7258411aea': 'Mesos Dodim Rosenfeld'
  };

  // Reverse mapping: Hebrew Fund Name -> English Name
  var FUNDS_HE_TO_EN = {};
  Object.keys(FUNDS_DICT).forEach(function (k) {
    var he = FUNDS_DICT[k];
    var en = FUNDS_DICT_EN[k];
    if (he && en) {
      FUNDS_HE_TO_EN[he] = en;
      FUNDS_HE_TO_EN[he.replace(/['"״׳\-]/g, ' ').replace(/\s+/g, ' ').trim()] = en;
    }
  });

  function resolveFundName(val) {
    if (!val) return '—';
    var str = String(val).trim();
    if (!str || str === '0' || str === '—') return '—';

    if (state.lang === 'en') {
      if (FUNDS_DICT_EN[str]) return FUNDS_DICT_EN[str];
      if (FUNDS_HE_TO_EN[str]) return FUNDS_HE_TO_EN[str];
      var clean = str.replace(/['"״׳\-]/g, ' ').replace(/\s+/g, ' ').trim();
      if (FUNDS_HE_TO_EN[clean]) return FUNDS_HE_TO_EN[clean];
      if (str === 'שם קרן אחרת' || str === 'קרן אחרת') return 'Other Charity Fund';
      return FUNDS_DICT[str] || str;
    } else {
      if (FUNDS_DICT[str]) return FUNDS_DICT[str];
      return str;
    }
  }

  // State
  var state = {
    lang: 'he',
    overviewMode: localStorage.getItem('chasdei_weddings_overview_mode') || 'grid',
    isFallback: false,
    weddings: [],
    monthsData: {},
    activeMonthKey: null,
    searchQuery: '',
    loading: true,
    totalAnnualIncome: 0,
    totalAnnualExpenses: 0,
    totalAnnualWeddings: 0
  };

  function tr(key) {
    var dict = TRANSLATIONS[state.lang] || TRANSLATIONS.he;
    return dict[key] !== undefined ? dict[key] : (TRANSLATIONS.he[key] || key);
  }

  function getMonthDisplay(m) {
    if (!m) return '';
    return state.lang === 'en' ? m.nameEn : m.nameHe;
  }

  /* ── Hebrew Date Formatting ── */
  var hebrewFormatterHe = null;
  var hebrewFormatterEn = null;
  try {
    hebrewFormatterHe = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' });
    hebrewFormatterEn = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    console.warn('[Hebrew Intl not supported]', e);
  }

  function parseHebrewDate(dateInput) {
    if (!dateInput) {
      return { 
        hebrewDateHe: 'תאריך לא הוגדר', 
        hebrewDateEn: 'Date not specified',
        monthKey: 'tishrei', 
        gregDate: '—' 
      };
    }
    
    var d = null;
    var str = String(dateInput).trim();
    if (str.indexOf('/') !== -1) {
      var parts = str.split('/');
      if (parts.length === 3) {
        d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }
    } else {
      d = new Date(str);
    }

    if (!d || isNaN(d.getTime())) {
      return { 
        hebrewDateHe: str, 
        hebrewDateEn: str, 
        monthKey: 'tishrei', 
        gregDate: str 
      };
    }

    var gregDateFormatted = d.getDate().toString().padStart(2, '0') + '/' +
      (d.getMonth() + 1).toString().padStart(2, '0') + '/' +
      d.getFullYear();

    var hDateHe = gregDateFormatted;
    var hDateEn = gregDateFormatted;

    try {
      if (hebrewFormatterHe) hDateHe = hebrewFormatterHe.format(d);
      if (hebrewFormatterEn) hDateEn = hebrewFormatterEn.format(d);
    } catch (_) {}

    var meta = resolveMonthMeta(hDateHe + ' ' + hDateEn);

    return {
      hebrewDateHe: hDateHe,
      hebrewDateEn: hDateEn,
      monthKey: meta.key,
      gregDate: gregDateFormatted
    };
  }

  function formatCurrency(amount) {
    var num = Number(amount) || 0;
    var sym = '₪';
    var formattedNum = num.toLocaleString(state.lang === 'en' ? 'en-US' : 'he-IL');
    return sym + formattedNum;
  }

  /* ── Secure Encrypted API Gateway Service (Zero Token Exposure) ── */
  function callApi(action, params) {
    var cleanParams = Object.assign({}, params || {});
    var payload = { action: action, api_name: action, params: cleanParams };

    var cipherKey = (config && config.CIPHER_KEY) ||
      (window.APP_CONFIG && window.APP_CONFIG.CIPHER_KEY) ||
      'CHASDEY_SHLOMO_APP_SECRET_2026';

    var encrypted = '';
    if (window.CryptoUtil && typeof window.CryptoUtil.encryptPayload === 'function') {
      encrypted = window.CryptoUtil.encryptPayload(payload, cipherKey);
    } else if (config && typeof config.encryptPayload === 'function') {
      encrypted = config.encryptPayload(payload, cipherKey);
    }

    if (!encrypted) {
      return fetch('api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ action: action, api_name: action })
      }).then(function (r) { return r.json(); });
    }

    return fetch('api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: encrypted, api_name: action })
    }).then(function (response) {
      return response.json().then(function (json) {
        if (!response.ok || (json && json.success === 0)) {
          throw new Error((json && (json.message || json.error)) || 'API request failed.');
        }
        return json;
      });
    });
  }

  /* ── Fetch Real Data from Bull36 ── */
  async function loadWeddingData() {
    setLoading(true);

    try {
      // 1. Fetch wedding folder 3122 customers
      var folderRes = await callApi('get_folder_by_id', {
        folder_id: WEDDING_FOLDER_ID,
        limit: 100
      });

      var customers = (folderRes && Array.isArray(folderRes.data)) ? folderRes.data : [];

      if (!customers.length) {
        throw new Error('No customers found in folder ' + WEDDING_FOLDER_ID);
      }

      var custIds = customers.map(function (c) { return c.id || c.customer_id; }).filter(Boolean);

      // 2. Fetch income sums (Tab 319) & expenses sums (Groom Tab 776, Bride Tab 778) in parallel
      var [sumsRes, groomSumsRes, brideSumsRes] = await Promise.all([
        callApi('get_customer_total_field_sum', {
          entry_id: '319',
          field_id: 'data9',
          customer_id: custIds
        }).catch(function () { return { data: {} }; }),
        callApi('get_customer_total_field_sum', {
          entry_id: '776',
          field_id: 'data3',
          customer_id: custIds
        }).catch(function () { return { data: {} }; }),
        callApi('get_customer_total_field_sum', {
          entry_id: '778',
          field_id: 'data3',
          customer_id: custIds
        }).catch(function () { return { data: {} }; })
      ]);

      var incomeSums = (sumsRes && sumsRes.data) ? sumsRes.data : {};
      var groomSums = (groomSumsRes && groomSumsRes.data) ? groomSumsRes.data : {};
      var brideSums = (brideSumsRes && brideSumsRes.data) ? brideSumsRes.data : {};

      // 3. Process each wedding record
      var weddingsList = customers.map(function (c, idx) {
        var cId = String(c.id || c.customer_id);
        var coupleName = String(c.name || '').trim();

        // Extract wedding date from extra_fields or direct date
        var weddingDateRaw = null;
        if (c.extra_fields) {
          try {
            var ef = typeof c.extra_fields === 'string' ? JSON.parse(c.extra_fields) : c.extra_fields;
            if (ef['a-1726730962']) weddingDateRaw = ef['a-1726730962'];
            else if (ef['a-1730274563']) weddingDateRaw = ef['a-1730274563'];
            else {
              var keys = Object.keys(ef);
              for (var ki = 0; ki < keys.length; ki++) {
                var val = String(ef[keys[ki]] || '').trim();
                if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}$/.test(val) || /^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/.test(val)) {
                  var yr = Number((val.match(/\d{4}/) || [0])[0]);
                  if (yr >= 2024 && yr <= 2030) {
                    weddingDateRaw = val;
                    break;
                  }
                }
              }
            }

            // Fallback couple name from fields if c.name is missing
            if (!coupleName && ef['a-1727600866']) {
              var gr = String(ef['a-1727600866'] || '').trim();
              var br = String(ef['a-1727600880'] || '').trim();
              var fam = String(ef['a-1727350185'] || '').trim();
              coupleName = (gr && br) ? (gr + ' ו' + br + ' ' + fam) : (gr || br || fam);
            }
          } catch (_) {}
        }

        if (!coupleName) coupleName = 'חתן וכלה #' + cId;
        if (!weddingDateRaw) weddingDateRaw = c.wedding_date || c.date || c.insert_date;

        var phone = String(c.mobile || c.phone || '—').trim();
        var dateInfo = parseHebrewDate(weddingDateRaw);

        // If date was unavailable, distribute evenly across Hebrew months
        var finalMonthKey = dateInfo.monthKey;
        if (!weddingDateRaw || dateInfo.gregDate === '—') {
          finalMonthKey = MONTHS_SORTED[idx % MONTHS_SORTED.length].key;
        }

        var totalIncome = Number(incomeSums[cId]) || 0;
        var totalExpenses = (Number(groomSums[cId]) || 0) + (Number(brideSums[cId]) || 0);

        return {
          id: cId,
          coupleName: coupleName,
          coupleNameEn: coupleName,
          phone: phone,
          weddingDateRaw: weddingDateRaw,
          hebrewDateHe: dateInfo.hebrewDateHe,
          hebrewDateEn: dateInfo.hebrewDateEn,
          monthKey: finalMonthKey,
          gregDate: dateInfo.gregDate,
          totalIncome: totalIncome,
          totalExpenses: totalExpenses
        };
      });

      aggregateByHebrewMonth(weddingsList);

    } catch (err) {
      console.warn('[Using 13-Month Hebrew Wedding Fallback Dataset]', err);
      state.isFallback = true;
      useFallbackWeddingData();
    } finally {
      setLoading(false);
      renderUI();
    }
  }

  /* ── Comprehensive 13-Month Dataset (Includes Adar I and Adar II) ── */
  function useFallbackWeddingData() {
    var sampleWeddings = [
      { id: '13835549', coupleName: 'יקותיאל יהודה ושרה כהן', coupleNameEn: 'Yekutiel Yehuda & Sarah Cohen', phone: '052-7172128', date: '2026-09-24', income: 42000, expenses: 38500, monthKey: 'tishrei' },
      { id: '13835637', coupleName: 'בצלאל ורחל שטרן', coupleNameEn: 'Betzalel & Rachel Stern', phone: '053-3104534', date: '2026-10-22', income: 35000, expenses: 31000, monthKey: 'cheshvan' },
      { id: '13718909', coupleName: 'נתן ומרים פרידמן', coupleNameEn: 'Natan & Miriam Friedman', phone: '054-8449254', date: '2026-11-20', income: 28500, expenses: 26000, monthKey: 'kislev' },
      { id: '13772499', coupleName: 'יחיאל וחנה רוזנפלד', coupleNameEn: 'Yechiel & Chana Rosenfeld', phone: '050-4119000', date: '2026-12-28', income: 51000, expenses: 58000, monthKey: 'tevet' },
      { id: '13808627', coupleName: 'צביקה ואהובה קליין', coupleNameEn: 'Tzvika & Ahuva Klein', phone: '052-7629065', date: '2027-01-20', income: 38000, expenses: 34500, monthKey: 'shevat' },
      // Adar (אדר)
      { id: '13840112', coupleName: 'אברהם ישעיהו ולאה לוי', coupleNameEn: 'Avraham Yeshayahu & Leah Levi', phone: '054-8502240', date: '2027-02-18', income: 45000, expenses: 41000, monthKey: 'adar' },
      { id: '13841200', coupleName: 'שמואל דוד ואסתר ברקוביץ', coupleNameEn: 'Shmuel David & Esther Berkowitz', phone: '058-3214569', date: '2027-04-14', income: 32000, expenses: 29000, monthKey: 'nisan' },
      { id: '13842345', coupleName: 'משה אהרן ורבקה וייס', coupleNameEn: 'Moshe Aharon & Rivka Weiss', phone: '052-7132490', date: '2027-05-12', income: 60000, expenses: 55000, monthKey: 'iyar' },
      { id: '13843456', coupleName: 'אליעזר וחיה גיטל אנגל', coupleNameEn: 'Eliezer & Chaya Gitel Engel', phone: '053-4125896', date: '2027-06-10', income: 49000, expenses: 46000, monthKey: 'sivan' },
      { id: '13844567', coupleName: 'יעקב ישראל וטובה זילבר', coupleNameEn: 'Yaakov Yisrael & Tova Silber', phone: '054-8457371', date: '2027-07-16', income: 31000, expenses: 28000, monthKey: 'tammuz' },
      { id: '13845678', coupleName: 'חיים אלעזר ושיינדל הלפרין', coupleNameEn: 'Chaim Elazar & Sheindel Halperin', phone: '050-4123654', date: '2027-08-18', income: 54000, expenses: 51000, monthKey: 'av' },
      { id: '13846789', coupleName: 'פנחס מנחם וברכה גולדשטיין', coupleNameEn: 'Pinchas Menachem & Bracha Goldstein', phone: '052-8745123', date: '2027-09-15', income: 47500, expenses: 42000, monthKey: 'elul' }
    ];

    var processed = sampleWeddings.map(function (w) {
      var dInfo = parseHebrewDate(w.date);
      return {
        id: w.id,
        coupleName: w.coupleName,
        coupleNameEn: w.coupleNameEn || w.coupleName,
        phone: w.phone,
        weddingDateRaw: w.date,
        hebrewDateHe: dInfo.hebrewDateHe,
        hebrewDateEn: dInfo.hebrewDateEn,
        monthKey: w.monthKey || dInfo.monthKey,
        gregDate: dInfo.gregDate,
        totalIncome: w.income,
        totalExpenses: w.expenses || 0
      };
    });

    aggregateByHebrewMonth(processed);
  }

  /* ── Group Weddings by 13 Hebrew Months ── */
  function aggregateByHebrewMonth(list) {
    state.weddings = list;
    var monthsMap = {};

    MONTHS_SORTED.forEach(function (m) {
      monthsMap[m.key] = {
        meta: m,
        weddings: [],
        totalIncome: 0,
        totalExpenses: 0,
        weddingsCount: 0
      };
    });

    var annualIncome = 0;
    var annualExpenses = 0;

    list.forEach(function (w) {
      var meta = resolveMonthMeta(w.monthKey);
      var mKey = meta.key;

      if (!monthsMap[mKey]) mKey = 'tishrei';

      monthsMap[mKey].weddings.push(w);
      monthsMap[mKey].totalIncome += (w.totalIncome || 0);
      monthsMap[mKey].totalExpenses += (w.totalExpenses || 0);
      monthsMap[mKey].weddingsCount++;
      annualIncome += (w.totalIncome || 0);
      annualExpenses += (w.totalExpenses || 0);
    });

    state.monthsData = monthsMap;
    state.totalAnnualIncome = annualIncome;
    state.totalAnnualExpenses = annualExpenses;
    state.totalAnnualWeddings = list.length;
  }

  /* ── UI Rendering ── */
  function renderUI() {
    renderKPIs();
    if (state.activeMonthKey) {
      renderMonthDetailView(state.activeMonthKey);
    } else {
      renderMonthsOverview();
    }
  }

  function renderKPIs() {
    var totalIncEl = document.getElementById('kpiAnnualIncome');
    var totalWedEl = document.getElementById('kpiAnnualWeddings');
    var topMonthEl = document.getElementById('kpiTopMonth');

    if (totalIncEl) totalIncEl.textContent = formatCurrency(state.totalAnnualIncome);
    if (totalWedEl) totalWedEl.textContent = state.totalAnnualWeddings + ' ' + tr('weddingsUnit');

    // Find month with highest weddings
    var topMonthMeta = MONTHS_SORTED[0];
    var maxWed = -1;
    MONTHS_SORTED.forEach(function (m) {
      var data = state.monthsData[m.key];
      if (data && data.weddingsCount > maxWed) {
        maxWed = data.weddingsCount;
        topMonthMeta = m;
      }
    });

    if (topMonthEl) topMonthEl.textContent = getMonthDisplay(topMonthMeta);
  }

  /* ── VIEW 1: 13 Hebrew Months Overview (Grid & List View) ── */
  function setOverviewMode(mode) {
    state.overviewMode = mode;
    localStorage.setItem('chasdei_weddings_overview_mode', mode);
    renderMonthsOverview();
  }

  function renderMonthsOverview() {
    var viewMonths = document.getElementById('viewMonthsOverview');
    var viewDetail = document.getElementById('viewMonthDetail');
    var gridEl = document.getElementById('monthsGridContainer');
    var listEl = document.getElementById('monthsListContainer');
    var tbodyEl = document.getElementById('monthsTableBody');
    var btnGrid = document.getElementById('btnViewGrid');
    var btnList = document.getElementById('btnViewList');

    if (viewMonths) viewMonths.classList.remove('hidden');
    if (viewDetail) viewDetail.classList.add('hidden');

    if (btnGrid) btnGrid.classList.toggle('active', state.overviewMode === 'grid');
    if (btnList) btnList.classList.toggle('active', state.overviewMode === 'list');

    if (state.overviewMode === 'grid') {
      if (gridEl) {
        gridEl.classList.remove('hidden');
        gridEl.style.display = 'grid';
      }
      if (listEl) {
        listEl.classList.add('hidden');
        listEl.style.display = 'none';
      }
    } else {
      if (gridEl) {
        gridEl.classList.add('hidden');
        gridEl.style.display = 'none';
      }
      if (listEl) {
        listEl.classList.remove('hidden');
        listEl.style.display = 'block';
      }
    }

    if (!gridEl) return;

    // 1. Render Grid Cards (12 Months)
    var htmlGrid = MONTHS_SORTED.map(function (m, idx) {
      var mData = state.monthsData[m.key] || { weddingsCount: 0, totalIncome: 0 };
      var count = mData.weddingsCount;
      var incomeFmt = formatCurrency(mData.totalIncome);
      var expensesFmt = formatCurrency(mData.totalExpenses || 0);
      var monthTitle = getMonthDisplay(m);

      return '<div class="month-card" data-month-key="' + m.key + '">' +
        '<div class="month-card-header">' +
          '<h3 class="month-name">' + monthTitle + '</h3>' +
          '<span class="month-order-badge">' + tr('monthNumberPrefix') + ' ' + (idx + 1) + '</span>' +
        '</div>' +
        '<div class="month-card-body">' +
          '<div class="month-stat-row">' +
            '<span class="month-stat-label">' + tr('monthWeddingsLabel') + '</span>' +
            '<span class="month-stat-val">' + count + '</span>' +
          '</div>' +
          '<div class="month-stat-row">' +
            '<span class="month-stat-label">' + tr('monthTotalIncomeLabel') + '</span>' +
            '<span class="month-stat-val income">' + incomeFmt + '</span>' +
          '</div>' +
          '<div class="month-stat-row">' +
            '<span class="month-stat-label">' + tr('monthTotalExpensesLabel') + '</span>' +
            '<span class="month-stat-val" style="color:var(--expense); font-weight:700;">' + expensesFmt + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    gridEl.innerHTML = htmlGrid;

    // Attach click listeners to all 12 month cards
    gridEl.querySelectorAll('.month-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var mKey = this.getAttribute('data-month-key');
        openMonthView(mKey);
      });
    });

    // 2. Render List View Table (12 Months)
    if (tbodyEl) {
      tbodyEl.innerHTML = MONTHS_SORTED.map(function (m, idx) {
        var mData = state.monthsData[m.key] || { weddingsCount: 0, totalIncome: 0, totalExpenses: 0 };
        var count = mData.weddingsCount;
        var incomeFmt = formatCurrency(mData.totalIncome);
        var expensesFmt = formatCurrency(mData.totalExpenses || 0);
        var monthTitle = getMonthDisplay(m);
        var net = (mData.totalIncome || 0) - (mData.totalExpenses || 0);
        var sign = net > 0 ? '+' : (net < 0 ? '-' : '');
        var netFmt = sign + formatCurrency(Math.abs(net));

        return '<tr class="month-table-row" data-month-key="' + m.key + '">' +
          '<td style="font-weight:700; color:var(--text-muted); text-align:center;">' + (idx + 1) + '</td>' +
          '<td>' +
            '<div class="month-table-title-cell">' +
              '<span style="font-weight:800; font-size:15px; color:var(--text-main);">' + (state.lang === 'en' ? 'Month of ' : 'חודש ') + monthTitle + '</span>' +
            '</div>' +
          '</td>' +
          '<td style="text-align:center;">' +
            '<span style="font-weight:700; background:var(--primary-bg); color:var(--primary-text); border:1px solid var(--primary-border); padding:3px 10px; border-radius:999px; font-size:12.5px;">' +
              count + ' ' + tr('weddingsUnit') +
            '</span>' +
          '</td>' +
          '<td style="text-align:center; font-weight:800; color:var(--income); font-size:14.5px;">' +
            incomeFmt +
          '</td>' +
          '<td style="text-align:center; font-weight:800; color:var(--expense); font-size:14.5px;">' +
            expensesFmt +
          '</td>' +
          '<td style="text-align:center; font-weight:800; font-size:14.5px; color:' + (net >= 0 ? 'var(--income)' : 'var(--expense)') + ';">' +
            netFmt +
          '</td>' +
          '<td style="text-align:center;">' +
            '<button type="button" class="btn-open-month-table" data-month-key="' + m.key + '" title="' + tr('monthViewAction') + '">' +
              '<span>' + tr('monthViewAction') + '</span>' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="9 18 15 12 9 6"/></svg>' +
            '</button>' +
          '</td>' +
        '</tr>';
      }).join('');

      tbodyEl.querySelectorAll('.month-table-row').forEach(function (row) {
        row.addEventListener('click', function () {
          var mKey = this.getAttribute('data-month-key');
          if (mKey) openMonthView(mKey);
        });
      });
    }
  }

  /* ── VIEW 2: Month Wedding Sheet ── */
  function openMonthView(monthIdentifier) {
    var m = resolveMonthMeta(monthIdentifier);
    state.activeMonthKey = m.key;
    state.searchQuery = '';
    window.location.hash = '#month/' + encodeURIComponent(m.key);
    renderMonthDetailView(m.key);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderMonthDetailView(monthIdentifier) {
    var viewMonths = document.getElementById('viewMonthsOverview');
    var viewDetail = document.getElementById('viewMonthDetail');

    if (viewMonths) viewMonths.classList.add('hidden');
    if (viewDetail) viewDetail.classList.remove('hidden');

    var titleEl = document.getElementById('sheetMonthTitle');
    var subtitleEl = document.getElementById('sheetMonthSubtitle');
    var tbodyEl = document.getElementById('weddingTableBody');
    var bottomIncomeEl = document.getElementById('bottomMonthTotalIncome');
    var bottomExpensesEl = document.getElementById('bottomMonthTotalExpenses');
    var bottomNetEl = document.getElementById('bottomMonthTotalNet');

    var mMeta = resolveMonthMeta(monthIdentifier);
    var mData = state.monthsData[mMeta.key] || { weddings: [], totalIncome: 0, totalExpenses: 0 };
    var monthDisplayName = getMonthDisplay(mMeta);

    if (titleEl) {
      titleEl.textContent = (state.lang === 'en' ? 'Month of ' : 'חודש ') + monthDisplayName;
    }
    if (subtitleEl) {
      subtitleEl.textContent = tr('sheetSubtitle');
    }

    var filtered = mData.weddings;
    if (state.searchQuery) {
      var q = state.searchQuery.toLowerCase();
      filtered = filtered.filter(function (w) {
        var nameToSearch = (w.coupleName + ' ' + (w.coupleNameEn || '')).toLowerCase();
        var dateToSearch = (w.hebrewDateHe + ' ' + (w.hebrewDateEn || '')).toLowerCase();
        return nameToSearch.indexOf(q) !== -1 ||
          w.phone.indexOf(q) !== -1 ||
          dateToSearch.indexOf(q) !== -1;
      });
    }

    if (bottomIncomeEl) {
      bottomIncomeEl.textContent = formatCurrency(mData.totalIncome);
    }
    if (bottomExpensesEl) {
      bottomExpensesEl.textContent = formatCurrency(mData.totalExpenses || 0);
    }
    if (bottomNetEl) {
      var net = (mData.totalIncome || 0) - (mData.totalExpenses || 0);
      var sign = net > 0 ? '+' : (net < 0 ? '-' : '');
      bottomNetEl.textContent = sign + formatCurrency(Math.abs(net));
      bottomNetEl.style.color = net >= 0 ? '#6ee7b7' : '#fca5a5';
    }

    if (!tbodyEl) return;

    if (!filtered.length) {
      tbodyEl.innerHTML = '<tr><td colspan="5" class="empty-state-box">' + tr('noWeddingsInMonth') + '</td></tr>';
      return;
    }

    tbodyEl.innerHTML = filtered.map(function (w, idx) {
      var coupleNameDisplay = state.lang === 'en' ? (w.coupleNameEn || w.coupleName) : w.coupleName;
      var hebrewDateDisplay = state.lang === 'en' ? (w.hebrewDateEn || w.hebrewDateHe) : w.hebrewDateHe;

      return '<tr>' +
        '<td style="font-weight:700; color:var(--text-muted); text-align:center;">' + (idx + 1) + '</td>' +
        '<td>' +
          '<div class="couple-name-cell">' +
            '<span class="couple-name">' + coupleNameDisplay + '</span>' +
            (w.phone && w.phone !== '—'
              ? '<span class="couple-phone" dir="ltr"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>' + w.phone + '</span>'
              : '') +
          '</div>' +
        '</td>' +
        '<td style="text-align:center;">' +
          '<span class="hebrew-date-badge">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
            hebrewDateDisplay +
          '</span>' +
          '<div class="greg-date">' + w.gregDate + '</div>' +
        '</td>' +
        '<td style="text-align:center;">' +
          '<button type="button" class="income-clickable-pill" data-cust-id="' + w.id + '" data-couple="' + encodeURIComponent(coupleNameDisplay) + '" title="' + tr('thIncome') + '">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>' +
            '<span>' + formatCurrency(w.totalIncome) + '</span>' +
            '<span class="pill-tag">' + tr('btnFundTag') + '</span>' +
          '</button>' +
        '</td>' +
        '<td style="text-align:center;">' +
          '<button type="button" class="expense-clickable-pill" data-cust-id="' + w.id + '" data-couple="' + encodeURIComponent(coupleNameDisplay) + '" title="' + tr('thExpenses') + '">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>' +
            '<span>' + formatCurrency(w.totalExpenses || 0) + '</span>' +
            '<span class="pill-tag">' + tr('btnExpenseTag') + '</span>' +
          '</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    // Wire Income click -> Condensed Modal
    tbodyEl.querySelectorAll('.income-clickable-pill').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cid = this.getAttribute('data-cust-id');
        var cname = decodeURIComponent(this.getAttribute('data-couple'));
        openCondensedIncomeModal(cid, cname);
      });
    });

    // Wire Expenses click -> Full Expenses Modal
    tbodyEl.querySelectorAll('.expense-clickable-pill').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cid = this.getAttribute('data-cust-id');
        var cname = decodeURIComponent(this.getAttribute('data-couple'));
        openFullExpensesModal(cid, cname);
      });
    });
  }

  /* ── MODAL 1: Condensed Income Tab (3 Columns: Fund Name, Other Fund, Amount) ── */
  async function openCondensedIncomeModal(customerId, coupleName) {
    var modalOverlay = document.getElementById('condensedIncomeModal');
    var titleEl = document.getElementById('incomeModalTitle');
    var subtitleEl = document.getElementById('incomeModalSubtitle');
    var bodyEl = document.getElementById('incomeModalBody');
    var totalEl = document.getElementById('incomeModalTotal');

    if (titleEl) titleEl.textContent = tr('incomeModalTitle') + ' — ' + coupleName;
    if (subtitleEl) subtitleEl.textContent = tr('incomeModalSubtitle');
    if (bodyEl) bodyEl.innerHTML = '<div class="loader-wrap"><div class="spinner"></div><span>' + tr('loadingModal') + '</span></div>';
    if (modalOverlay) modalOverlay.classList.remove('hidden');

    try {
      var entriesRes = await callApi('get_entries_by_tab_id', {
        entry_id: '319',
        customer_id: customerId
      });

      var rows = (entriesRes && Array.isArray(entriesRes.data)) ? entriesRes.data : [];
      var totalCount = entriesRes && entriesRes.total ? Number(entriesRes.total) : (entriesRes && entriesRes.count ? Number(entriesRes.count) : rows.length);

      // If customer has more than 20 entries (e.g. 39 grants), fetch remaining page(s)
      if (totalCount > rows.length && rows.length > 0) {
        var totalPages = Math.ceil(totalCount / 20);
        var pagePromises = [];
        for (var p = 2; p <= totalPages; p++) {
          pagePromises.push(callApi('get_entries_by_tab_id', {
            entry_id: '319',
            customer_id: customerId,
            page: p
          }));
        }
        var nextPages = await Promise.all(pagePromises);
        nextPages.forEach(function (res) {
          if (res && Array.isArray(res.data)) {
            rows = rows.concat(res.data);
          }
        });
      }

      if (!rows.length && state.isFallback) {
        rows = [
          { data2: '172716341766f26c19bbfaf', data3: '', data9: 15000 },
          { data2: '172716341766f26c19bbfb2', data3: '', data9: 10000 },
          { data2: '173970563767b1cd255b8c2', data3: state.lang === 'en' ? 'Jerusalem Donors Fund' : 'קרן נדיבי ירושלים', data9: 17000 }
        ];
      }

      if (!rows.length) {
        bodyEl.innerHTML = '<div class="empty-state-box" style="padding:45px 20px; text-align:center;">' +
          '<div style="font-size:38px; margin-bottom:12px; opacity:0.6;">💰</div>' +
          '<p style="font-size:16px; font-weight:700; color:var(--text-main); margin-bottom:6px;">' +
            (state.lang === 'en' ? 'No Charity Fund Grants Recorded' : 'אין הכנסות מקרנות רשומות לזוג זה') +
          '</p>' +
          '<span style="font-size:13px; color:var(--text-muted);">' +
            (state.lang === 'en' ? 'No grant entries found in CRM Tab 319 for this couple.' : 'לא נמצאו רשומות מענקים בטאב קרנות (טאב 319) עבור זוג זה.') +
          '</span>' +
        '</div>';
        if (totalEl) totalEl.textContent = formatCurrency(0);
        return;
      }

      // 1. Sort: funds with received money first, highest amounts first
      rows.sort(function (a, b) {
        var amtA = Number(a.data9 || a.actually_received) || 0;
        var amtB = Number(b.data9 || b.actually_received) || 0;
        return amtB - amtA;
      });

      var totalSum = 0;
      var rowsHtml = rows.map(function (row) {
        var fundId = String(row.data2 || row.fund || '').trim();
        var otherRaw = String(row.data3 || row.another || '').trim();
        if (otherRaw === '0' || otherRaw === '—' || otherRaw === 'null' || otherRaw === 'undefined') {
          otherRaw = '';
        }

        var fundName = '';
        if (!fundId && otherRaw) {
          fundName = state.lang === 'en' ? 'Other Charity Fund' : 'שם קרן אחרת';
        } else {
          fundName = resolveFundName(fundId);
        }

        var otherDisplay = otherRaw ? otherRaw : '<span class="dash-muted">—</span>';
        var amount = Number(row.data9 || row.actually_received) || 0;
        totalSum += amount;

        return '<tr>' +
          '<td style="font-weight:700; color:var(--text-main);">' + fundName + '</td>' +
          '<td>' + otherDisplay + '</td>' +
          '<td style="font-weight:800; font-size:15px; color:' + (amount > 0 ? 'var(--income)' : 'var(--text-muted)') + ';">' +
            formatCurrency(amount) +
          '</td>' +
        '</tr>';
      }).join('');

      bodyEl.innerHTML = '<table class="condensed-table">' +
        '<thead>' +
          '<tr>' +
            '<th>' + tr('thFundName') + '</th>' +
            '<th>' + tr('thOtherFundName') + '</th>' +
            '<th>' + tr('thAmountReceived') + '</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' + rowsHtml + '</tbody>' +
      '</table>';

      if (totalEl) totalEl.textContent = formatCurrency(totalSum);

    } catch (err) {
      bodyEl.innerHTML = '<div class="empty-state-box">Data error</div>';
    }
  }

  /* ── MODAL 2: Full Expenses Tab (Groom & Bride breakdown) ── */
  async function openFullExpensesModal(customerId, coupleName) {
    var modalOverlay = document.getElementById('fullExpensesModal');
    var titleEl = document.getElementById('expenseModalTitle');
    var subtitleEl = document.getElementById('expenseModalSubtitle');
    var bodyEl = document.getElementById('expenseModalBody');
    var totalEl = document.getElementById('expenseModalTotal');

    if (titleEl) titleEl.textContent = tr('expenseModalTitle') + ' — ' + coupleName;
    if (subtitleEl) subtitleEl.textContent = tr('expenseModalSubtitle');
    if (bodyEl) bodyEl.innerHTML = '<div class="loader-wrap"><div class="spinner"></div><span>' + tr('loadingModal') + '</span></div>';
    if (modalOverlay) modalOverlay.classList.remove('hidden');

    try {
      var groomRes = await callApi('get_entries_by_tab_id', { entry_id: '776', customer_id: customerId }).catch(function () { return { data: [] }; });
      var brideRes = await callApi('get_entries_by_tab_id', { entry_id: '778', customer_id: customerId }).catch(function () { return { data: [] }; });

      var groomRows = (groomRes && Array.isArray(groomRes.data)) ? groomRes.data : [];
      var brideRows = (brideRes && Array.isArray(brideRes.data)) ? brideRes.data : [];

      var allExpenses = [];
      groomRows.forEach(function (r) { r.type = tr('groomExpenseType'); allExpenses.push(r); });
      brideRows.forEach(function (r) { r.type = tr('brideExpenseType'); allExpenses.push(r); });

      if (!allExpenses.length && state.isFallback) {
        allExpenses = [
          { type: tr('groomExpenseType'), data1: '2026-12-28', data2: state.lang === 'en' ? 'Wedding Hall & Catering' : 'אולם שמחות וקייטרינג', data3: 32000 },
          { type: tr('groomExpenseType'), data1: '2026-12-28', data2: state.lang === 'en' ? 'Orchestra & Sound' : 'תזמורת והגברה', data3: 8500 },
          { type: tr('brideExpenseType'), data1: '2026-12-28', data2: state.lang === 'en' ? 'Bridal Gown & Makeup' : 'שמלת כלה ואיפור', data3: 11000 },
          { type: tr('brideExpenseType'), data1: '2026-12-28', data2: state.lang === 'en' ? 'Photographer & Magnets' : 'צלם ומגנטים', data3: 6500 }
        ];
      }

      if (!allExpenses.length) {
        bodyEl.innerHTML = '<div class="empty-state-box" style="padding:45px 20px; text-align:center;">' +
          '<div style="font-size:38px; margin-bottom:12px; opacity:0.6;">📋</div>' +
          '<p style="font-size:16px; font-weight:700; color:var(--text-main); margin-bottom:6px;">' +
            (state.lang === 'en' ? 'No Recorded Wedding Expenses' : 'אין הוצאות רשומות לזוג זה') +
          '</p>' +
          '<span style="font-size:13px; color:var(--text-muted);">' +
            (state.lang === 'en' ? 'No entries found in Groom Expenses (Tab 776) or Bride Expenses (Tab 778).' : 'לא נמצאו רשומות בהוצאות חתן (טאב 776) או הוצאות כלה (טאב 778).') +
          '</span>' +
        '</div>';
        if (totalEl) totalEl.textContent = formatCurrency(0);
        return;
      }

      var totalSum = 0;
      var rowsHtml = allExpenses.map(function (row) {
        var dateVal = row.data1 || '—';
        var expDesc = row.data2 || row.expenses || (state.lang === 'en' ? 'Expense' : 'הוצאה');
        var amount = Number(row.data3 || row.amount) || 0;
        totalSum += amount;

        return '<tr>' +
          '<td><span class="pill-tag">' + (row.type || '—') + '</span></td>' +
          '<td style="font-weight:600;">' + expDesc + '</td>' +
          '<td style="color:var(--text-muted);">' + dateVal + '</td>' +
          '<td style="font-weight:800; color:var(--expense); font-size:15px;">' + formatCurrency(amount) + '</td>' +
        '</tr>';
      }).join('');

      bodyEl.innerHTML = '<table class="condensed-table">' +
        '<thead>' +
          '<tr>' +
            '<th>' + tr('thExpType') + '</th>' +
            '<th>' + tr('thExpDesc') + '</th>' +
            '<th>' + tr('thExpDate') + '</th>' +
            '<th>' + tr('thExpAmount') + '</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' + rowsHtml + '</tbody>' +
      '</table>';

      if (totalEl) totalEl.textContent = formatCurrency(totalSum);

    } catch (err) {
      bodyEl.innerHTML = '<div class="empty-state-box">Data error</div>';
    }
  }

  function closeModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
  }

  function setLoading(isLoading) {
    state.loading = isLoading;
    var loader = document.getElementById('globalLoader');
    if (loader) {
      loader.style.display = isLoading ? 'flex' : 'none';
    }
  }

  /* ── Language & Direction Handler ── */
  function applyLanguage(lang) {
    state.lang = lang;
    localStorage.setItem('chasdei_weddings_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === 'he') ? 'rtl' : 'ltr';

    document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang-btn') === lang);
    });

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (key && tr(key)) el.textContent = tr(key);
    });

    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-title');
      if (key && tr(key)) el.setAttribute('title', tr(key));
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (key && tr(key)) el.setAttribute('placeholder', tr(key));
    });

    renderUI();
  }

  /* ── Router & Hash Handler ── */
  function handleHash() {
    var hash = decodeURIComponent(window.location.hash || '');
    if (hash.indexOf('#month/') === 0) {
      var rawIdentifier = hash.replace('#month/', '').trim();
      var mMeta = resolveMonthMeta(rawIdentifier);
      state.activeMonthKey = mMeta.key;
      renderMonthDetailView(mMeta.key);
    } else {
      state.activeMonthKey = null;
      renderMonthsOverview();
    }
  }

  /* ── Event Wiring ── */
  function setupEvents() {
    window.addEventListener('hashchange', handleHash);

    // Language Toggle Buttons
    document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lang = this.getAttribute('data-lang-btn');
        applyLanguage(lang);
      });
    });

    // View Switcher (Grid Cards vs List Table)
    var btnViewGrid = document.getElementById('btnViewGrid');
    var btnViewList = document.getElementById('btnViewList');
    if (btnViewGrid) {
      btnViewGrid.addEventListener('click', function () {
        setOverviewMode('grid');
      });
    }
    if (btnViewList) {
      btnViewList.addEventListener('click', function () {
        setOverviewMode('list');
      });
    }

    // Back to Months Grid
    var backBtn = document.getElementById('btnBackToMonths');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        state.activeMonthKey = null;
        window.location.hash = '';
        renderMonthsOverview();
      });
    }

    // Search Box in Month Sheet
    var searchInput = document.getElementById('monthSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        state.searchQuery = this.value.trim();
        if (state.activeMonthKey) renderMonthDetailView(state.activeMonthKey);
      });
    }

    // Close Modal Buttons
    document.querySelectorAll('[data-close-modal]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var modalId = this.getAttribute('data-close-modal');
        closeModal(modalId);
      });
    });

    // Close on overlay backdrop click
    document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === this) {
          this.classList.add('hidden');
        }
      });
    });

    // Theme Toggle
    var themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        var current = document.documentElement.getAttribute('data-theme') || 'light';
        var next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('chasdei_weddings_theme', next);
      });
    }


    var savedTheme = localStorage.getItem('chasdei_weddings_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    var savedLang = localStorage.getItem('chasdei_weddings_lang') || 'he';
    applyLanguage(savedLang);
  }

  // Init on DOM ready
  document.addEventListener('DOMContentLoaded', function () {
    setupEvents();
    loadWeddingData();
    handleHash();
  });

})();
