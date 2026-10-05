/**
 * CloudPlus — tenant connection
 *
 * The Biz1 subdomain is the folder in the page URL:
 *   /{foldername}/index.html  →  https://{foldername}.biz1.co.il
 * Missing folder falls back to cloudplus.
 *
 * Example:
 *   /cloudplus/index.html?token=…  →  https://cloudplus.biz1.co.il/app/User.Basic
 */
(function () {
  var DEFAULT_USER = 'cloudplus';

  function cleanSlug(raw) {
    var s = String(raw == null ? '' : raw).trim().toLowerCase();
    s = s.replace(/^https?:\/\//, '');
    s = s.replace(/\.biz1\.co\.il.*$/i, '');
    s = s.split('/')[0];
    s = s.replace(/[^a-z0-9-]/g, '');
    return s;
  }

  function folderFromLocation() {
    try {
      var path = String(window.location.pathname || '').replace(/\\/g, '/');
      var parts = path.split('/').filter(Boolean);
      if (parts.length && /\.[a-z0-9]+$/i.test(parts[parts.length - 1])) {
        parts.pop();
      }
      var skip = {
        assets: 1,
        js: 1,
        css: 1,
        pages: 1,
        proposal: 1,
        www: 1,
        app: 1,
        api: 1,
        public: 1
      };
      while (parts.length && skip[parts[parts.length - 1]]) parts.pop();
      return cleanSlug(parts.length ? parts[parts.length - 1] : '');
    } catch (e) {
      return '';
    }
  }

  var user = folderFromLocation() || DEFAULT_USER;

  window.Biz1Config = {
    /** Biz1 account / subdomain name (URL folder, default cloudplus) */
    user: user,

    /** App display name — Hebrew + English */
    brand: {
      he: 'קלאודפלוס',
      en: 'CloudPlus'
    }
  };
})();
