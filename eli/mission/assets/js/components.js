(function() {
  async function loadComponent(id, file) {
    const el = document.getElementById(id);
    if (!el) return;
    try {
      const response = await fetch(file);
      if (response.ok) {
        // Keep the host node (#app-header / #app-footer) so flex sticky layout stays intact
        el.innerHTML = await response.text();
      }
    } catch (e) {
      console.error('Failed to load component ' + file, e);
    }
  }

  function setActiveTab() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    
    let activeId = '';
    if (page === 'sales_home.html') activeId = 'home';
    else if (page === 'kanban.html') activeId = 'kanban';
    else if (page === 'tasks.html' || page === 'new_task.html') activeId = 'tasks';

    document.querySelectorAll('.nav-item').forEach(el => {
      if (el.getAttribute('data-id') === activeId) {
        el.style.color = 'var(--color-primary)';
      } else {
        el.style.color = 'var(--text-sub)';
      }
    });
  }

  /** Bottom-corner toast for realtime feedback */
  window.Biz1Toast = function (message, opts) {
    opts = opts || {};
    var host = document.getElementById('mb-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'mb-toast-host';
      document.body.appendChild(host);
    }
    var toast = document.createElement('div');
    toast.className = 'mb-toast';
    toast.innerHTML =
      '<span class="mb-toast-dot"></span>' +
      '<span style="flex:1;line-height:1.4;"></span>';
    toast.querySelector('span:last-child').textContent = message || 'Update';
    host.appendChild(toast);
    var ms = opts.duration || 3200;
    setTimeout(function () {
      toast.classList.add('is-leaving');
      setTimeout(function () { toast.remove(); }, 260);
    }, ms);
    return toast;
  };

  window.Biz1Pulse = function (el) {
    if (!el) return;
    el.classList.remove('pulse-animation');
    void el.offsetWidth;
    el.classList.add('pulse-animation');
    setTimeout(function () { el.classList.remove('pulse-animation'); }, 1400);
  };

  function wireRealtimeFeedback() {
    var lastToastAt = 0;
    function notify(label) {
      var now = Date.now();
      if (now - lastToastAt < 1200) return;
      lastToastAt = now;
      if (window.Biz1Toast) window.Biz1Toast(label);
      var targets = [
        document.getElementById('mb-live-tasks'),
        document.getElementById('kanban-board'),
        document.getElementById('mb-live-home'),
        document.getElementById('mb-live-home-missions')
      ];
      targets.forEach(function (el) {
        if (el) window.Biz1Pulse(el);
      });
    }
    window.addEventListener('mineralbar:missions', function () {
      notify((window.t && window.t('tasks')) ? (window.t('tasks') + ' · live') : 'Task updated');
    });
    window.addEventListener('mineralbar:messages', function () {
      notify('New message');
    });
  }

  function doLogoutConfirm() {
    var overlay = document.getElementById('logout-modal-overlay');
    if (!overlay) return;
    // Avoid clipping inside .screen-content (overflow:hidden)
    if (overlay.parentElement !== document.body) {
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
    if (typeof initLanguage === 'function') {
      try { initLanguage(); } catch (e) { /* ignore */ }
    }
  }

  function doLogout() {
    try {
      if (window.MineralBarApp && typeof MineralBarApp.clearSession === 'function') {
        MineralBarApp.clearSession();
      }
    } catch (e) { /* ignore */ }
    try {
      localStorage.removeItem('biz1demo_user_basic');
      localStorage.removeItem('biz1demo_role');
      localStorage.removeItem('biz1demo_email');
      localStorage.removeItem('biz1demo_remember');
      localStorage.removeItem('biz1demo_cred');
      localStorage.removeItem('biz1demo_token_expires_at');
    } catch (e2) { /* ignore */ }
    location.href = 'login.html';
  }

  function wireLogout() {
    var overlay = document.getElementById('logout-modal-overlay');
    if (overlay && overlay.parentElement !== document.body) {
      document.body.appendChild(overlay);
    }

    var btn = document.getElementById('headerLogoutBtn');
    if (btn && btn.dataset.logoutWired !== '1') {
      btn.dataset.logoutWired = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        doLogoutConfirm();
      });
    }

    // Avatar menu logout row
    var avatarLogout = document.querySelector('#avatar-menu [data-i18n="logout"]');
    if (avatarLogout) {
      var row = avatarLogout.closest('div');
      if (row && row.dataset.logoutWired !== '1') {
        row.dataset.logoutWired = '1';
        row.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          var menu = document.getElementById('avatar-menu');
          if (menu) menu.style.display = 'none';
          doLogoutConfirm();
        });
      }
    }

    if (overlay && overlay.dataset.logoutWired !== '1') {
      overlay.dataset.logoutWired = '1';
      var cancelBtn = overlay.querySelector('[data-i18n="cancel"]');
      var confirmBtn = overlay.querySelector('button[data-i18n="logout"]');
      if (cancelBtn) {
        cancelBtn.onclick = function () {
          overlay.style.display = 'none';
        };
      }
      if (confirmBtn) {
        confirmBtn.onclick = function () {
          doLogout();
        };
      }
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) overlay.style.display = 'none';
      });
    }

    window.Biz1Logout = doLogout;
    window.Biz1LogoutConfirm = doLogoutConfirm;
  }

  function wireThemeToggle(btn) {
    if (!btn || btn.dataset.themeWired === '1') return;
    btn.dataset.themeWired = '1';
    btn.addEventListener('click', function() {
      var current = document.documentElement.getAttribute('data-theme');
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('biz1demo_theme', next);
      localStorage.setItem('mineral_theme', next);
    });
  }

  window.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
      loadComponent('app-header', 'header.html'),
      loadComponent('app-footer', 'footer.html')
    ]);
    
    if (typeof initLanguage === 'function') {
      initLanguage();
    }
    if (typeof startHeaderClock === 'function') {
      startHeaderClock();
    }
    
    setActiveTab();
    wireRealtimeFeedback();
    wireThemeToggle(document.getElementById('themeToggle'));
    wireLogout();
  });
})();
