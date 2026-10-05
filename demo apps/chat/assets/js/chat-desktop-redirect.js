/**
 * Desktop deep-link → inbox split view (conversation.html).
 */
(function () {
  if (window.matchMedia && window.matchMedia('(min-width: 1024px)').matches && location.search) {
    location.replace('conversation.html' + location.search);
  }
})();
