/**
 * Customer Portal API config
 * Docs: https://eli.bull36.com/app/help/category/Customer-Portal
 *
 * On org subdomain (user.bull36.com) user_name is optional.
 * On shared domains send user_name (org id/username).
 */
window.CP_CONFIG = {
  API_BASE: 'https://dharakareliya1.bull36.com',

  USER_NAME: '',

  DOMAIN_NAME: '',

  WS_URL: '',

  /** Public file CDN for biz1upload paths */
  FILES_BASE: 'https://files.biz1.co.il',

  /** Base URL for uploaded files (defaults to FILES_BASE, then API_BASE). */
  ASSET_BASE: 'https://files.biz1.co.il',

  /** PDF view URL template — {id}, {pdf_signer_id}, {cust_id} */
  PDF_VIEW_URL: '/client/pdf_signer_customer_view/{id}',

  PAGE_SIZE: 25,

  APP_NAME: 'Customer Portal',

  /** Bump on deploy so browsers fetch fresh CSS/JS (YYYYMMDDHHmm) */
  ASSET_VERSION: '202608171209',
};
