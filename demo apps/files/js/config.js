/**
 * Files Data — app configuration
 */
const AppConfig = {
  DEFAULT_DOMAIN: 'https://eli.bull36.com',
  PAGE_SIZE: 25,
  STORAGE_KEYS: {
    theme: 'files_theme',
    lang: 'files_lang',
    token: 'biz1_sdk_bearer_token',
    userCache: 'files_user_cache'
  },
  REALTIME: {
    path: '/realtime/socket.io',
    platform: 'web'
  },
  SOCKET_EVENTS: [
    'files.deleted',
    'files.updated',
    'filefolders.add.created',
    'filefolders.edit.updated',
    'filefolders.delete.deleted',
    'documents.created',
    'documents.updated',
    'documents.deleted'
  ],
  /** Fallback system folders when FileFolders.List is empty */
  SYSTEM_FOLDERS: [
    { id: 'default', key: 'default', name: 'Default', name_en: 'Default' },
    { id: 'dynamic_pdf', key: 'dynamic_pdf', name: 'Dynamic PDF', name_en: 'Dynamic PDF' },
    { id: 'signs', key: 'signs', name: 'Signs', name_en: 'Signs' },
    { id: 'whatsapp_files', key: 'whatsapp_files', name: 'WhatsApp Files', name_en: 'WhatsApp Files' },
    { id: 'forms', key: 'forms', name: 'Forms', name_en: 'Forms' },
    { id: 'email_files', key: 'email_files', name: 'Email Files', name_en: 'Email Files' }
  ],
  getDomain() {
    return this.DEFAULT_DOMAIN;
  }
};
