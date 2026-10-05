/**
 * Profile page UI — external file for CSP script-src 'self'.
 */
(function () {
  var App = window.Biz1App || window.MineralBarApp;
  var themeToggleCircle = document.getElementById('themeToggleCircle');

  function updateThemeUI() {
    if (!themeToggleCircle) return;
    var isRTL = document.documentElement.dir === 'rtl';
    if (document.documentElement.getAttribute('data-theme') === 'dark') {
      themeToggleCircle.style.transform = isRTL ? 'translateX(-18px)' : 'translateX(18px)';
    } else {
      themeToggleCircle.style.transform = 'translateX(0)';
    }
  }
  setTimeout(updateThemeUI, 0);

  var themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('biz1demo_theme', next); } catch (e) { /* ignore */ }
      updateThemeUI();
    });
  }

  var backBtn = document.getElementById('profileBackBtn');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      location.href = 'conversation.html';
    });
  }

  async function loadUserData() {
    try {
      if (!App) return;
      App.requireAuth('login.html');
      var client = App.getClient();
      var response = await client.account.basic();
      var data = (response && response.data) || response || {};

      if (data && data.user) {
        document.getElementById('userName').textContent = data.user.name || 'User';
        document.getElementById('userEmail').textContent = data.user.email || '';
        document.getElementById('userAvatar').textContent = (data.user.name || 'U').charAt(0).toUpperCase();
        document.getElementById('userRole').textContent = App.getRole() || 'user';
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
      var nameEl = document.getElementById('userName');
      if (nameEl) nameEl.textContent = window.t ? window.t('error_dashboard') : 'Error loading data';
    }
  }
  loadUserData();

  var logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      if (confirm(window.t ? window.t('confirm_logout') : 'Are you sure you want to logout?')) {
        App.clearSession({ keepEmail: false, keepRemember: false });
        window.location.href = 'login.html';
      }
    });
  }
})();
