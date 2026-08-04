/**
 * Central cache-bust version for all pages.
 *
 * When JS/CSS must reload in browsers, bump ONLY this value — do not add ?v=…
 * on every <script> line in HTML.
 *
 * Usage in HTML (load this file first):
 *   <script src="./asset-version.js"></script>
 *   <script>
 *   mbScripts([
 *     './support.js',
 *     './biz1-sdk.js',
 *     './biz1-app.js',
 *     './page-boot.js',
 *     './live-sync.js',
 *     './i18n-translations.js',
 *     './common-header-footer.js'
 *   ]);
 *   mbCss('./common.css');
 *   </script>
 */
(function (g) {
  'use strict';

  // ★ Bump this one string when you need a full client cache refresh.
  var V = '22';

  g.MB_ASSET_V = V;

  function stripV(url) {
    url = String(url == null ? '' : url).trim();
    if (!url) return url;
    // Remove existing v= query (any previous hardcoded bust)
    url = url.replace(/([?&])v=[^&]*/gi, '$1');
    url = url.replace(/[?&]$/, '');
    url = url.replace(/\?&/, '?');
    if (url.slice(-1) === '?') url = url.slice(0, -1);
    return url;
  }

  function mbAsset(url) {
    url = stripV(url);
    if (!url) return url;
    // Leave absolute / CDN / data URLs alone
    if (/^(https?:|\/\/|data:|blob:)/i.test(url)) return url;
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + encodeURIComponent(V);
  }

  /** Sync-inject <script> tags with the central version (must run while parsing). */
  function mbScripts(list) {
    if (!list || !list.length) return;
    var html = '';
    for (var i = 0; i < list.length; i++) {
      html += '<script src="' + mbAsset(list[i]) + '"><\/script>';
    }
    document.write(html);
  }

  /** Sync-inject a stylesheet with the central version. */
  function mbCss(href) {
    if (!href) return;
    document.write('<link rel="stylesheet" href="' + mbAsset(href) + '"/>');
  }

  g.mbAsset = mbAsset;
  g.mbScripts = mbScripts;
  g.mbCss = mbCss;
})(typeof window !== 'undefined' ? window : this);
