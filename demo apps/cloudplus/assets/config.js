/**
 * CloudPlus — tenant connection
 *
 * Set `user` to your Bull36 subdomain only (no https, no .bull36.com).
 * All API / SDK calls use: https://{user}.bull36.com/app/...
 *
 * Example:
 *   user: 'cloudplus'  →  https://cloudplus.bull36.com/app/Login
 */
window.Biz1Config = {
  /** Bull36 account / subdomain name */
  user: 'cloudplus',

  /** App display name — Hebrew + English */
  brand: {
    he: 'קלאודפלוס',
    en: 'CloudPlus'
  }
};
