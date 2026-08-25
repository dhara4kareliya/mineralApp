/**
 * Internationalization — English & Hebrew with RTL support.
 */
const I18n = (function () {
  const LANG_KEY = 'tt_lang';

  const messages = {
    en: {
      appTitle: 'Time Tracking & Timesheets',
      appName: 'Time Tracking',
      loginSubtitle: 'Sign in to manage shifts and timesheets',
      username: 'Email, username, or ID',
      usernamePlaceholder: 'Email, username, or user ID',
      password: 'Password',
      passwordPlaceholder: '••••••••',
      otp: 'Verification code',
      otpPlaceholder: '6-digit code',
      otpHint: 'Enter the 6-digit code sent to your email.',
      signIn: 'Sign in',
      logout: 'Logout',
      user: 'User',
      language: 'Language',
      english: 'English',
      hebrew: 'Hebrew',
      toggleTheme: 'Toggle light / dark theme',
      lightMode: 'Light mode',
      darkMode: 'Dark mode',
      socketOffline: 'Offline',
      socketLive: 'Live',
      socketTitle: 'Realtime connection',
      socketConnected: 'Connected · {count} events enabled',
      liveShiftControl: 'Live Shift Control',
      liveShiftDesc: 'Start or end your daily work shift',
      statusOff: 'Off shift',
      statusActive: 'Active',
      statusBreak: 'On break',
      currentSession: 'Current session',
      notClockedIn: 'Not clocked in',
      startShift: 'Start shift',
      pauseBreak: 'Pause / Break',
      endShift: 'End shift',
      resume: 'Resume',
      today: 'Today',
      workingHoursLogged: 'Working hours logged',
      thisMonth: 'This month',
      sessions: 'Sessions',
      thisMonthLabel: 'This month',
      attendanceHistory: 'Attendance History',
      attendanceDesc: 'Clock-in, clock-out, and session durations',
      selectMonth: 'Month',
      showingMonth: 'Showing data for {month}',
      refresh: 'Refresh',
      loadingSessions: 'Loading sessions…',
      noRecords: 'No attendance records for this period.',
      colDate: 'Date',
      colClockIn: 'Clock in',
      colClockOut: 'Clock out',
      colDuration: 'Duration',
      colStatus: 'Status',
      endShiftTitle: 'End shift',
      endShiftConfirm: 'Confirm you want to end your current shift.',
      noteOptional: 'Note (optional)',
      notePlaceholder: 'End of day summary…',
      cancel: 'Cancel',
      confirmEnd: 'End shift',
      startedAt: 'Started {time}',
      breakSince: 'Break since {time} · Session paused',
      onBreakLogged: 'On break · {duration} logged before pause',
      shiftStarted: 'Shift started',
      breakStarted: 'Break started — clock paused',
      shiftResumed: 'Shift resumed',
      shiftEnded: 'Shift ended',
      todaySummary: 'Today so far: {hours}h · Done missions: {missions}',
      monthlyTarget: '{percent} of monthly target',
      daysWorked: '{days} days worked',
      fromSessionHistory: 'From session history',
      statusRunning: 'Running',
      statusCompleted: 'Completed',
      statusBreakBadge: 'Break',
      loginFailed: 'Login failed. Check your credentials.',
      couldNotStart: 'Could not start shift',
      couldNotPause: 'Could not pause shift',
      couldNotEnd: 'Could not end shift',
      couldNotLoadHistory: 'Could not load history',
      navHome: 'Home',
      navCalendar: 'Calendar',
      calendarTitle: 'Month Calendar',
      calendarDesc: 'View attendance, notes, and sick days by date',
      dayDetails: 'Day details',
      selectDayHint: 'Select a day on the calendar to view or edit.',
      notesSickTitle: 'Selected day log',
      notesSickDesc: 'Sessions and notes for the selected date only',
      selectDayForSessions: 'Select a day on the calendar to view its sessions.',
      noSessionsSelectedDay: 'No sessions or notes for this day.',
      legendBreak: 'Break',
      filterBreak: 'Break only',
      legendWorked: 'Worked',
      legendSick: 'Sick',
      legendMissing: 'Missing',
      legendHoliday: 'Holiday',
      legendDayOff: 'Day off',
      legendToday: 'Today',
      legendFuture: 'Future',
      sickDay: 'Sick day',
      note: 'Note',
      notePlaceholderDay: 'Add a note for this day…',
      checkIn: 'Check in',
      checkOut: 'Check out',
      totalHours: 'Total hours',
      saveDay: 'Save day',
      savedDay: 'Day saved successfully',
      couldNotSaveDay: 'Could not save day',
      couldNotLoadCalendar: 'Could not load calendar',
      loadingCalendar: 'Loading calendar…',
      noNotesSick: 'No notes or sick days this month.',
      colNote: 'Note',
      filterAll: 'All',
      filterSick: 'Sick only',
      filterNotes: 'With notes',
      monthOverview: 'Month overview',
      hoursVsTarget: 'Hours vs monthly target',
      extraHours: 'Extra hours',
      customerTimeDesc: 'Time logged against customers this month',
      noCustomerTime: 'No customer time logged this month.',
      missionsDone: 'Done',
      missionsTesting: 'Testing',
      hoursToday: 'Hours today',
      daysWorkedLabel: 'Days worked',
      extraHours: 'Extra hours',
      doneMissions: 'Done missions',
      sales: 'Sales',
      calls: 'Calls',
      salary: 'Salary',
      noTargetSet: 'No monthly hour target set',
      targetHours: '{done} of {target} hours',
      approved: 'Approved',
      notApproved: 'Not approved',
      files: 'Files',
      noFiles: 'No files attached',
      customerTime: 'Customer time',
      customerTimeDesc: 'Time logged against customers this month',
      colCustomer: 'Customer',
      noCustomerTime: 'No customer time logged this month.',
      hoursToday: 'Hours today',
      missionsOpen: 'Open missions',
      missionsTesting: 'Testing',
      missionsDone: 'Done',
      finalTotal: 'Final total',
      runningSessions: 'Running',
      completedSessions: 'Completed'
    },
    he: {
      appTitle: 'מעקב שעות ודוחות',
      appName: 'מעקב שעות',
      loginSubtitle: 'התחבר כדי לנהל משמרות ודוחות שעות',
      username: 'אימייל, שם משתמש או מזהה',
      usernamePlaceholder: 'אימייל, שם משתמש או מזהה משתמש',
      password: 'סיסמה',
      passwordPlaceholder: '••••••••',
      otp: 'קוד אימות',
      otpPlaceholder: 'קוד בן 6 ספרות',
      otpHint: 'הזן את הקוד בן 6 הספרות שנשלח לאימייל שלך.',
      signIn: 'התחבר',
      logout: 'התנתק',
      user: 'משתמש',
      language: 'שפה',
      english: 'English',
      hebrew: 'עברית',
      toggleTheme: 'החלף מצב בהיר / כהה',
      lightMode: 'מצב בהיר',
      darkMode: 'מצב כהה',
      socketOffline: 'לא מחובר',
      socketLive: 'חי',
      socketTitle: 'חיבור בזמן אמת',
      socketConnected: 'מחובר · {count} אירועים פעילים',
      liveShiftControl: 'שליטה במשמרת חיה',
      liveShiftDesc: 'התחל או סיים את משמרת העבודה היומית',
      statusOff: 'לא במשמרת',
      statusActive: 'פעיל',
      statusBreak: 'בהפסקה',
      currentSession: 'מושב נוכחי',
      notClockedIn: 'לא נרשמה כניסה',
      startShift: 'התחל משמרת',
      pauseBreak: 'השהה / הפסקה',
      endShift: 'סיים משמרת',
      resume: 'המשך',
      today: 'היום',
      workingHoursLogged: 'שעות עבודה שנרשמו',
      thisMonth: 'החודש',
      sessions: 'מושבים',
      thisMonthLabel: 'החודש',
      attendanceHistory: 'היסטוריית נוכחות',
      attendanceDesc: 'כניסה, יציאה ומשך מושבים',
      selectMonth: 'חודש',
      showingMonth: 'מציג נתונים עבור {month}',
      refresh: 'רענן',
      loadingSessions: 'טוען מושבים…',
      noRecords: 'אין רשומות נוכחות לתקופה זו.',
      colDate: 'תאריך',
      colClockIn: 'כניסה',
      colClockOut: 'יציאה',
      colDuration: 'משך',
      colStatus: 'סטטוס',
      endShiftTitle: 'סיים משמרת',
      endShiftConfirm: 'האם לסיים את המשמרת הנוכחית?',
      noteOptional: 'הערה (אופציונלי)',
      notePlaceholder: 'סיכום סוף יום…',
      cancel: 'ביטול',
      confirmEnd: 'סיים משמרת',
      startedAt: 'התחיל ב-{time}',
      breakSince: 'הפסקה מ-{time} · המושב מושהה',
      onBreakLogged: 'בהפסקה · {duration} נרשמו לפני ההשהיה',
      shiftStarted: 'המשמרת התחילה',
      breakStarted: 'ההפסקה התחילה — השעון מושהה',
      shiftResumed: 'המשמרת התחדשה',
      shiftEnded: 'המשמרת הסתיימה',
      todaySummary: 'היום עד כה: {hours} שעות · משימות שהושלמו: {missions}',
      monthlyTarget: '{percent} מהיעד החודשי',
      daysWorked: '{days} ימי עבודה',
      fromSessionHistory: 'מהיסטוריית המושבים',
      statusRunning: 'פעיל',
      statusCompleted: 'הושלם',
      statusBreakBadge: 'הפסקה',
      loginFailed: 'ההתחברות נכשלה. בדוק את פרטי ההתחברות.',
      couldNotStart: 'לא ניתן להתחיל משמרת',
      couldNotPause: 'לא ניתן להשהות משמרת',
      couldNotEnd: 'לא ניתן לסיים משמרת',
      couldNotLoadHistory: 'לא ניתן לטעון היסתוריה',
      navHome: 'בית',
      navCalendar: 'לוח שנה',
      calendarTitle: 'לוח חודשי',
      calendarDesc: 'צפה בנוכחות, הערות וימי מחלה לפי תאריך',
      dayDetails: 'פרטי יום',
      selectDayHint: 'בחר יום בלוח השנה לצפייה או עריכה.',
      notesSickTitle: 'יומן ליום שנבחר',
      notesSickDesc: 'מושבים והערות לתאריך שנבחר בלבד',
      selectDayForSessions: 'בחר יום בלוח השנה כדי לראות את המושבים שלו.',
      noSessionsSelectedDay: 'אין מושבים או הערות ליום זה.',
      legendBreak: 'הפסקה',
      filterBreak: 'הפסקה בלבד',
      legendWorked: 'עבד',
      legendSick: 'מחלה',
      legendMissing: 'חסר',
      legendHoliday: 'חג',
      legendDayOff: 'יום חופש',
      legendToday: 'היום',
      legendFuture: 'עתיד',
      sickDay: 'יום מחלה',
      note: 'הערה',
      notePlaceholderDay: 'הוסף הערה ליום זה…',
      checkIn: 'כניסה',
      checkOut: 'יציאה',
      totalHours: 'סה״כ שעות',
      saveDay: 'שמור יום',
      savedDay: 'היום נשמר בהצלחה',
      couldNotSaveDay: 'לא ניתן לשמור את היום',
      couldNotLoadCalendar: 'לא ניתן לטעון לוח שנה',
      loadingCalendar: 'טוען לוח שנה…',
      noNotesSick: 'אין הערות או ימי מחלה החודש.',
      colNote: 'הערה',
      filterAll: 'הכל',
      filterSick: 'מחלה בלבד',
      filterNotes: 'עם הערות',
      monthOverview: 'סקירת החודש',
      hoursVsTarget: 'שעות מול היעד החודשי',
      extraHours: 'שעות נוספות',
      customerTimeDesc: 'שעות שנרשמו מול לקוחות החודש',
      noCustomerTime: 'אין שעות לקוח החודש.',
      missionsDone: 'הושלמו',
      missionsTesting: 'בבדיקה',
      hoursToday: 'שעות היום',
      daysWorkedLabel: 'ימי עבודה',
      extraHours: 'שעות נוספות',
      doneMissions: 'משימות שהושלמו',
      sales: 'מכירות',
      calls: 'שיחות',
      salary: 'שכר',
      noTargetSet: 'לא הוגדר יעד שעות חודשי',
      targetHours: '{done} מתוך {target} שעות',
      approved: 'אושר',
      notApproved: 'לא אושר',
      files: 'קבצים',
      noFiles: 'אין קבצים מצורפים',
      customerTime: 'שעות לקוח',
      customerTimeDesc: 'שעות שנרשמו מול לקוחות החודש',
      colCustomer: 'לקוח',
      noCustomerTime: 'אין שעות לקוח החודש.',
      hoursToday: 'שעות היום',
      missionsOpen: 'משימות פתוחות',
      missionsTesting: 'בבדיקה',
      missionsDone: 'הושלמו',
      finalTotal: 'סה״כ סופי',
      runningSessions: 'פעיל',
      completedSessions: 'הושלם'
    }
  };

  let currentLang = 'en';

  function getLang() {
    return currentLang;
  }

  function getLocale() {
    return currentLang === 'he' ? 'he-IL' : 'en-US';
  }

  function isRtl() {
    return currentLang === 'he';
  }

  /** Replace {name} placeholders */
  function t(key, params) {
    const str = messages[currentLang]?.[key] ?? messages.en[key] ?? key;
    if (!params) return str;
    return Object.keys(params).reduce(
      (acc, k) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]),
      str
    );
  }

  function setLang(lang) {
    currentLang = lang === 'he' ? 'he' : 'en';
    localStorage.setItem(LANG_KEY, currentLang);
    document.documentElement.lang = currentLang;
    document.documentElement.dir = isRtl() ? 'rtl' : 'ltr';
    applyPage();
    syncLangButtons();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: currentLang } }));
  }

  function init() {
    const saved = localStorage.getItem(LANG_KEY);
    const browserHe = navigator.language?.startsWith('he');
    currentLang = saved === 'he' || saved === 'en' ? saved : (browserHe ? 'he' : 'en');
    document.documentElement.lang = currentLang;
    document.documentElement.dir = isRtl() ? 'rtl' : 'ltr';
    applyPage();
    syncLangButtons();
  }

  function applyPage() {
    document.title = t('appTitle');

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });

    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });

    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.title = t(el.getAttribute('data-i18n-title'));
    });
  }

  function syncLangButtons() {
    document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
      const lang = btn.getAttribute('data-lang-btn');
      btn.classList.toggle('active', lang === currentLang);
      btn.setAttribute('aria-pressed', lang === currentLang ? 'true' : 'false');
    });
  }

  function updateShiftButtons(state) {
    const btnStart = document.getElementById('btn-start');
    const btnEnd = document.getElementById('btn-end');
    if (!btnStart) return;

    const playIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    const stopIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>';

    btnStart.innerHTML = `${playIcon} ${t('startShift')}`;
    btnEnd.innerHTML = `${stopIcon} ${t('endShift')}`;
  }

  return {
    t,
    getLang,
    getLocale,
    isRtl,
    setLang,
    init,
    applyPage,
    updateShiftButtons
  };
})();
