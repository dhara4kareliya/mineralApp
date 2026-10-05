/**
 * Biz1 Showcase — tenant connection
 *
 * Set `user` to your account subdomain only (no https, no domain suffix).
 * API host root follows the apps URL:
 *   apps.bull36.com  → https://{user}.bull36.com  (dev)
 *   apps.biz1.co.il  → https://{user}.biz1.co.il  (live)
 *
 * Example:
 *   user: 'demo' on apps.bull36.com → https://demo.bull36.com/app/Login
 */
(function () {
  function normalizeTenantUser(raw) {
    var s = String(raw == null ? '' : raw).trim().toLowerCase();
    s = s.replace(/^https?:\/\//, '');
    s = s.replace(/\.bull36\.com.*$/i, '');
    s = s.replace(/\.biz1\.co\.il.*$/i, '');
    s = s.split('/')[0];
    s = s.replace(/[^a-z0-9-]/g, '');
    return s;
  }

  /** bull36.com = dev, biz1.co.il = live (from current page host). */
  function resolveApiRoot() {
    var host = String(
      (typeof location !== 'undefined' && location.hostname) || ''
    ).toLowerCase();
    return host.indexOf('biz1.co.il') >= 0 ? 'biz1.co.il' : 'bull36.com';
  }

  function resolveDomain(cfg) {
    cfg = cfg || {};
    var user = normalizeTenantUser(cfg.user || cfg.tenant || cfg.account || 'demo');
    if (!user) user = 'demo';
    return 'https://' + user + '.' + resolveApiRoot();
  }

  window.Biz1Config = {
    /** Account / subdomain name */
    user: 'demo',

    /**
     * Public Appointment Builder (Quick Booking slots / services)
     * Used by Public.AppointmentBuilder.Slots / .Submit
     */
    accountUserId: 47,
    builderPageId: 3001,
    builderId: null,
    appointmentTypeId: 8,

    /** Loyalty punch-card: visits needed for free reward */
    loyaltyPunchTarget: 10,

    /** App display name */
    brand: {
      he: 'Biz1 Bookings',
      en: 'Biz1 Bookings'
    },

    normalizeTenantUser: normalizeTenantUser,
    resolveApiRoot: resolveApiRoot,
    resolveDomain: function () {
      return resolveDomain(this);
    }
  };
})();
