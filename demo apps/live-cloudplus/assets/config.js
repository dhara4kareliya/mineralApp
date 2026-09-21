/**
 * CloudPlus — tenant connection
 *
 * Set `user` to your Biz1 subdomain only (no https, no .biz1.co.il).
 * All API / SDK calls use: https://{user}.biz1.co.il/app/...
 *
 * Example:
 *   user: 'cloudplus'  →  https://cloudplus.biz1.co.il/app/Login
 */
window.Biz1Config = {
  /** Biz1 account / subdomain name */
  user: 'cloudplus',

  /** App display name — Hebrew + English */
  brand: {
    he: 'קלאודפלוס',
    en: 'CloudPlus'
  }
};
