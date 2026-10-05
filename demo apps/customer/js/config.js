function getPathUser() {
  const path = window.location.pathname || '';
  const parts = path.split('/').filter(Boolean);
  const exclusions = ['archive8', 'archive9', 'archive10'];
  
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].toLowerCase();
    if (p === 'customer' || p === 'customerportal') {
      if (i > 0) {
        const tenant = decodeURIComponent(parts[i - 1]).toLowerCase();
        if (!exclusions.includes(tenant.replace(/\s+/g, ''))) {
          return parts[i - 1];
        }
      }
    }
  }
  return 'demo';
}

const tenant = getPathUser();

window.CP_CONFIG = {
  /** API host — tenant subdomain on biz1.co.il */
  API_BASE: `https://${tenant}.biz1.co.il`,

  /** Tenant / account user for API requests */
  USER_NAME: tenant,

  DOMAIN_NAME: `${tenant}.biz1.co.il`,

  WS_URL: '',

  FILES_BASE: 'https://files.biz1.co.il',

  ASSET_BASE: 'https://files.biz1.co.il',

  PDF_VIEW_URL: '/client/pdf_signer_customer_view/{id}',

  PAGE_SIZE: 25,

  APP_NAME: 'Customer Portal',

  ASSET_VERSION: '202608201158',
};
