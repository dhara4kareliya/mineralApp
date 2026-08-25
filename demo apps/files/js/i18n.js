/**
 * English / Hebrew translations for Files Data.
 */
const I18n = (function () {
  const STORAGE_KEY = 'files_lang';
  const SUPPORTED = ['en', 'he'];
  let lang = 'en';
  const listeners = [];

  const messages = {
    en: {
      appTitle: 'Files Data — Document Repository',
      loginTitle: 'Sign in — Files Data',
      brandTitle: 'Files Data',
      brandSubtitle: 'Document repository',
      folders: 'Folders',
      fileFoldersAria: 'File folders',
      realtimeStatus: 'Realtime status',
      connecting: 'Connecting…',
      live: 'Live',
      offline: 'Offline',
      realtimeConnected: 'Realtime connected · user {userId}',
      files: 'Files',
      toggleTheme: 'Toggle theme',
      switchToLight: 'Switch to light mode',
      switchToDark: 'Switch to dark mode',
      refresh: 'Refresh',
      account: 'Account',
      logout: 'Log out',
      searchPlaceholder: 'Search documents across folders…',
      quickAdd: 'Quick add',
      loadingFiles: 'Loading files…',
      noFilesTitle: 'No files here yet',
      noFilesDesc: 'Search documents or upload to the selected folder.',
      loadMore: 'Load more',
      preview: 'Preview',
      download: 'Download',
      close: 'Close',
      filePreview: 'File preview',
      addFile: 'Add file',
      uploadDesc: 'Upload a document and attach it to a client.',
      client: 'Client',
      searchClientPlaceholder: 'Search client by name…',
      clearClient: 'Clear client',
      folder: 'Folder',
      displayName: 'Display name',
      displayNamePlaceholder: 'Signed contract (optional)',
      file: 'File',
      dropFile: 'Drop a file here or click to browse',
      fileTypesHint: 'PDF, images, Office docs, audio/video',
      cancel: 'Cancel',
      uploadFile: 'Upload file',
      allFolders: 'All folders',
      view: 'View',
      delete: 'Delete',
      noClient: 'No client',
      clientNum: 'Client #{id}',
      defaultFolder: 'Default',
      language: 'Language',
      english: 'English',
      hebrew: 'Hebrew',
      signInDesc: 'Sign in to browse, upload, and manage your document repository.',
      emailLabel: 'Email / Username / Phone / ID',
      emailPlaceholder: 'you@company.com',
      password: 'Password',
      show: 'Show',
      hide: 'Hide',
      otpLabel: 'Verification code (OTP)',
      otpPlaceholder: '6-digit code',
      signIn: 'Sign in',
      fileCount: '{n} files',
      fileCountOne: '1 file',
      fileCountOf: '{current} of {total}',
      usingDefaultFolders: 'Using default folders',
      couldNotLoadFiles: 'Could not load files',
      noClientsFound: 'No clients found',
      clientSearchFailed: 'Client search failed',
      selectClientRequired: 'Select a client — required by Files.Upload.',
      chooseFile: 'Choose a file to upload.',
      fileUploaded: 'File uploaded',
      uploadFailed: 'Upload failed',
      couldNotOpenFile: 'Could not open file',
      downloadFailed: 'Download failed',
      deleteRequiresClient: 'Delete requires a linked client on this file.',
      deleteConfirm: 'Delete “{name}”? This cannot be undone.',
      fileDeleted: 'File deleted',
      deleteFailed: 'Delete failed',
      enterCredentials: 'Enter your username and password.',
      enterOtp: 'Enter the verification code sent to you.',
      loginFailed: 'Login failed. Please try again.',
      folder_default: 'Default',
      folder_dynamic_pdf: 'Dynamic PDF',
      folder_signs: 'Signs',
      folder_whatsapp_files: 'WhatsApp Files',
      folder_whatsapp: 'WhatsApp',
      folder_forms: 'Forms',
      folder_email_files: 'Email Files',
      folder_email: 'Email'
    },
    he: {
      appTitle: 'קבצים — מאגר מסמכים',
      loginTitle: 'התחברות — קבצים',
      brandTitle: 'קבצים',
      brandSubtitle: 'מאגר מסמכים',
      folders: 'תיקיות',
      fileFoldersAria: 'תיקיות קבצים',
      realtimeStatus: 'סטטוס בזמן אמת',
      connecting: 'מתחבר…',
      live: 'מחובר',
      offline: 'לא מחובר',
      realtimeConnected: 'מחובר בזמן אמת · משתמש {userId}',
      files: 'קבצים',
      toggleTheme: 'החלפת ערכת נושא',
      switchToLight: 'מעבר למצב בהיר',
      switchToDark: 'מעבר למצב כהה',
      refresh: 'רענון',
      account: 'חשבון',
      logout: 'התנתקות',
      searchPlaceholder: 'חיפוש מסמכים בכל התיקיות…',
      quickAdd: 'הוספה מהירה',
      loadingFiles: 'טוען קבצים…',
      noFilesTitle: 'אין קבצים כאן עדיין',
      noFilesDesc: 'חפשו מסמכים או העלו לתיקייה שנבחרה.',
      loadMore: 'טען עוד',
      preview: 'תצוגה מקדימה',
      download: 'הורדה',
      close: 'סגירה',
      filePreview: 'תצוגה מקדימה של קובץ',
      addFile: 'הוספת קובץ',
      uploadDesc: 'העלו מסמך וצרפו אותו ללקוח.',
      client: 'לקוח',
      searchClientPlaceholder: 'חיפוש לקוח לפי שם…',
      clearClient: 'ניקוי לקוח',
      folder: 'תיקייה',
      displayName: 'שם לתצוגה',
      displayNamePlaceholder: 'חוזה חתום (אופציונלי)',
      file: 'קובץ',
      dropFile: 'גררו קובץ לכאן או לחצו לעיון',
      fileTypesHint: 'PDF, תמונות, מסמכי Office, אודיו/וידאו',
      cancel: 'ביטול',
      uploadFile: 'העלאת קובץ',
      allFolders: 'כל התיקיות',
      view: 'צפייה',
      delete: 'מחיקה',
      noClient: 'ללא לקוח',
      clientNum: 'לקוח #{id}',
      defaultFolder: 'ברירת מחדל',
      language: 'שפה',
      english: 'English',
      hebrew: 'עברית',
      signInDesc: 'התחברו כדי לעיין, להעלות ולנהל את מאגר המסמכים.',
      emailLabel: 'אימייל / שם משתמש / טלפון / ת.ז.',
      emailPlaceholder: 'you@company.com',
      password: 'סיסמה',
      show: 'הצג',
      hide: 'הסתר',
      otpLabel: 'קוד אימות (OTP)',
      otpPlaceholder: 'קוד בן 6 ספרות',
      signIn: 'התחברות',
      fileCount: '{n} קבצים',
      fileCountOne: 'קובץ אחד',
      fileCountOf: '{current} מתוך {total}',
      usingDefaultFolders: 'משתמש בתיקיות ברירת מחדל',
      couldNotLoadFiles: 'לא ניתן לטעון קבצים',
      noClientsFound: 'לא נמצאו לקוחות',
      clientSearchFailed: 'חיפוש לקוח נכשל',
      selectClientRequired: 'בחרו לקוח — נדרש על ידי Files.Upload.',
      chooseFile: 'בחרו קובץ להעלאה.',
      fileUploaded: 'הקובץ הועלה',
      uploadFailed: 'ההעלאה נכשלה',
      couldNotOpenFile: 'לא ניתן לפתוח את הקובץ',
      downloadFailed: 'ההורדה נכשלה',
      deleteRequiresClient: 'מחיקה דורשת לקוח מקושר לקובץ זה.',
      deleteConfirm: 'למחוק את "{name}"? לא ניתן לבטל פעולה זו.',
      fileDeleted: 'הקובץ נמחק',
      deleteFailed: 'המחיקה נכשלה',
      enterCredentials: 'הזינו שם משתמש וסיסמה.',
      enterOtp: 'הזינו את קוד האימות שנשלח אליכם.',
      loginFailed: 'ההתחברות נכשלה. נסו שוב.',
      folder_default: 'ברירת מחדל',
      folder_dynamic_pdf: 'מסמך דינמי',
      folder_signs: 'חתימות',
      folder_whatsapp_files: 'קבצי וואטסאפ',
      folder_whatsapp: 'וואטסאפ',
      folder_forms: 'טפסים',
      folder_email_files: 'קבצי אימייל',
      folder_email: 'אימייל'
    }
  };

  function getPreferred() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED.includes(saved)) return saved;
    const browser = (navigator.language || '').slice(0, 2);
    return browser === 'he' ? 'he' : 'en';
  }

  function interpolate(text, params) {
    if (!params) return text;
    return String(text).replace(/\{(\w+)\}/g, (_, key) => {
      return params[key] != null ? String(params[key]) : '';
    });
  }

  function t(key, params) {
    const dict = messages[lang] || messages.en;
    const fallback = messages.en[key];
    const value = dict[key] != null ? dict[key] : fallback;
    if (value == null) return key;
    return interpolate(value, params);
  }

  function getLang() {
    return lang;
  }

  function isRtl() {
    return lang === 'he';
  }

  /** Map API keys / English labels (incl. typos) → translation key suffix */
  const FOLDER_ALIASES = {
    default: 'default',
    'default_folder': 'default',
    dynamic_pdf: 'dynamic_pdf',
    'dynamic pdf': 'dynamic_pdf',
    dynamicpdf: 'dynamic_pdf',
    signs: 'signs',
    sign: 'signs',
    whatsapp_files: 'whatsapp_files',
    'whatsapp files': 'whatsapp_files',
    whatsappfiles: 'whatsapp_files',
    whatsapp: 'whatsapp',
    whasapp: 'whatsapp',
    forms: 'forms',
    form: 'forms',
    email_files: 'email_files',
    'email files': 'email_files',
    emailfiles: 'email_files',
    email: 'email',
    mail: 'email'
  };

  function normalizeFolderToken(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ');
  }

  function resolveFolderKey(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const spaced = normalizeFolderToken(raw);
    const underscored = spaced.replace(/\s+/g, '_');
    if (FOLDER_ALIASES[spaced]) return FOLDER_ALIASES[spaced];
    if (FOLDER_ALIASES[underscored]) return FOLDER_ALIASES[underscored];
    if (FOLDER_ALIASES[raw.toLowerCase()]) return FOLDER_ALIASES[raw.toLowerCase()];
    return underscored;
  }

  function folderName(key, fallback) {
    const candidates = [key, fallback];
    for (let i = 0; i < candidates.length; i += 1) {
      const resolved = resolveFolderKey(candidates[i]);
      if (!resolved || /^\d+$/.test(resolved)) continue;
      const msgKey = 'folder_' + resolved;
      const translated = t(msgKey);
      if (translated !== msgKey) return translated;
    }
    return fallback || key || t('defaultFolder');
  }

  function applyDocument() {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl() ? 'rtl' : 'ltr';

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
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

    const titleKey = document.body.getAttribute('data-i18n-title');
    if (titleKey) document.title = t(titleKey);

    document.querySelectorAll('[data-lang-select]').forEach((select) => {
      select.value = lang;
    });

    if (typeof Theme !== 'undefined' && Theme.refreshLabels) {
      Theme.refreshLabels();
    }
  }

  function setLang(next) {
    if (!SUPPORTED.includes(next)) return lang;
    lang = next;
    localStorage.setItem(STORAGE_KEY, lang);
    applyDocument();
    listeners.forEach((fn) => fn(lang));
    return lang;
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  function init() {
    lang = getPreferred();
    applyDocument();
    document.querySelectorAll('[data-lang-select]').forEach((select) => {
      select.addEventListener('change', () => setLang(select.value));
    });
  }

  return { init, t, getLang, setLang, onChange, isRtl, folderName, applyDocument };
})();
