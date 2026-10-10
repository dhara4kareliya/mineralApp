(function() {
    const COMPONENT_FALLBACKS = {
        'header.html': `<!-- greeting + logout, theme, lang in 1 line (loaded into #app-header) -->
<div class="app-header-bar">
  <div class="app-header-left">
    <div style="position:relative;" id="avatar-menu-wrapper">
      <div class="app-avatar" onclick="event.stopPropagation(); var menu = document.getElementById('avatar-menu'); menu.style.display = menu.style.display === 'none' ? 'block' : 'none';" style="cursor:pointer;" title="Menu">M</div>
      
      <div id="avatar-menu" style="display:none; position:absolute; top:calc(100% + 8px); left:0; background:var(--bg-panel, #fff); border-radius:12px; padding:8px 16px; box-shadow:0 6px 20px rgba(0,0,0,0.1); z-index:9999; border:1px solid var(--border-panel, #e5e7eb); white-space:nowrap;">
        <div onclick="document.getElementById('avatar-menu').style.display='none'; window.Biz1LogoutConfirm && window.Biz1LogoutConfirm();" style="display:flex; align-items:center; gap:8px; color:#c0392b; font-weight:700; font-size:15px; cursor:pointer; padding:6px 0;">
          <svg fill="none" height="18" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" viewBox="0 0 24 24" width="18"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" x2="9" y1="12" y2="12"></line></svg>
          <span data-i18n="logout"></span>
        </div>
      </div>
    </div>
    <div id="mb-home-greeting" class="app-greeting" data-i18n="loading"></div>
  </div>

  <div class="status-bar-right">
    <button type="button" id="headerLogoutBtn" class="header-logout-btn" title="Logout" aria-label="Logout" onclick="window.Biz1LogoutConfirm && window.Biz1LogoutConfirm()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
      <span data-i18n="logout">התנתק</span>
    </button>

    <button type="button" id="themeToggle" class="theme-toggle theme-toggle--light" title="Theme" aria-label="Toggle Theme">
      <span class="icon-sun" aria-hidden="true">☀️</span>
      <span class="icon-moon" aria-hidden="true">🌙</span>
    </button>

    <div id="mb-lang-toggle-pill" class="lang-switch lang-switch--light" role="group" aria-label="Language">
      <button type="button" class="lang-btn" id="mb-lang-he" data-lang="he">עב</button>
      <button type="button" class="lang-btn" id="mb-lang-en" data-lang="en">EN</button>
    </div>
  </div>
</div>

<!-- Logout confirm modal -->
<div id="logout-modal-overlay" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); backdrop-filter:blur(4px); z-index:10000; align-items:center; justify-content:center;">
  <div style="background:var(--bg-form, #fff); width:320px; border-radius:24px; padding:24px; box-shadow:0 12px 40px rgba(0,0,0,0.2); text-align:center;">
    <div style="width:48px; height:48px; border-radius:50%; background:#fbeeed; color:#c0392b; display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" x2="9" y1="12" y2="12"></line></svg>
    </div>
    <div style="font-size:18px; font-weight:800; color:var(--text-title); margin-bottom:8px;" data-i18n="logout"></div>
    <div style="font-size:14px; font-weight:500; color:var(--text-sub); margin-bottom:24px; line-height:1.4;" data-i18n="confirm_logout"></div>
    <div style="display:flex; gap:12px;">
      <button type="button" onclick="document.getElementById('logout-modal-overlay').style.display='none'" style="flex:1; padding:12px; border-radius:12px; border:none; background:var(--bg-accent, #eee); color:var(--text-title); font-size:15px; font-weight:700; cursor:pointer;" data-i18n="cancel"></button>
      <button type="button" onclick="window.Biz1Logout ? window.Biz1Logout() : (localStorage.clear(), location.href='login.html')" style="flex:1; padding:12px; border-radius:12px; border:none; background:#c0392b; color:#fff; font-size:15px; font-weight:700; cursor:pointer;" data-i18n="logout"></button>
    </div>
  </div>
</div>`,

        'footer.html': `<!-- bottom tab bar -->
<div class="app-footer-nav">
  <a href="sales_home.html" class="nav-item" data-id="home">
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11 12 3l9 8"></path><path d="M5 9.5V20h14V9.5"></path></svg>
    <span style="font-weight:700;" data-i18n="home"></span>
  </a>
  <a href="kanban.html" class="nav-item" data-id="kanban">
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
    <span data-i18n="kanban"></span>
  </a>
  <a href="tasks.html" class="nav-item" data-id="tasks">
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2.5"></rect><path d="m8 11 2.5 2.5L15 9M8 17h6"></path></svg>
    <span data-i18n="tasks"></span>
  </a>
</div>`
    };

    async function loadComponent(id, file) {
        const el = document.getElementById(id);
        if (!el) return;

        // Preserve any static markup already embedded in the page (for example the
        // restored footer nav). Loading the component again would overwrite it and
        // cause the visible flash on reload.
        if (el.innerHTML && el.innerHTML.trim()) {
            return;
        }

        try {
            if (window.location.protocol === 'file:') {
                if (COMPONENT_FALLBACKS[file]) {
                    el.innerHTML = COMPONENT_FALLBACKS[file];
                    return;
                }
            }
            const response = await fetch(file);
            if (response.ok) {
                // Keep the host node (#app-header / #app-footer) so flex sticky layout stays intact
                el.innerHTML = await response.text();
            } else if (COMPONENT_FALLBACKS[file]) {
                el.innerHTML = COMPONENT_FALLBACKS[file];
            }
        } catch (e) {
            if (COMPONENT_FALLBACKS[file]) {
                el.innerHTML = COMPONENT_FALLBACKS[file];
            } else {
                console.error('Failed to load component ' + file, e);
            }
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
    window.Biz1Toast = function(message, opts) {
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
        setTimeout(function() {
            toast.classList.add('is-leaving');
            setTimeout(function() { toast.remove(); }, 260);
        }, ms);
        return toast;
    };

    window.Biz1Pulse = function(el) {
        if (!el) return;
        el.classList.remove('pulse-animation');
        void el.offsetWidth;
        el.classList.add('pulse-animation');
        setTimeout(function() { el.classList.remove('pulse-animation'); }, 1400);
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
            targets.forEach(function(el) {
                if (el) window.Biz1Pulse(el);
            });
        }
        window.addEventListener('mineralbar:missions', function() {
            notify((window.t && window.t('tasks')) ? (window.t('tasks') + ' · live') : 'Task updated');
        });
        window.addEventListener('mineralbar:messages', function() {
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
            btn.addEventListener('click', function(e) {
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
                row.addEventListener('click', function(e) {
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
                cancelBtn.onclick = function() {
                    overlay.style.display = 'none';
                };
            }
            if (confirmBtn) {
                confirmBtn.onclick = function() {
                    doLogout();
                };
            }
            overlay.addEventListener('click', function(e) {
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

    /** CSP script-src 'self' blocks inline onclick — wire lang pills after header inject. */
    function wireLangSwitch() {
        document.querySelectorAll('.lang-btn[data-lang]').forEach(function(btn) {
            if (btn.dataset.langWired === '1') return;
            btn.dataset.langWired = '1';
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var lang = btn.getAttribute('data-lang');
                if (window.setLanguage) window.setLanguage(lang);
            });
        });
    }

    window.addEventListener('DOMContentLoaded', async() => {
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
        wireLangSwitch();
        wireLogout();
    });
})();