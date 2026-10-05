/* Paints logged-in Biz1 user into the proposal topbar. */
(function () {
  'use strict';

  function roleLabel(role, lang) {
    var map = {
      he: { sales: 'נציג מכירות', service: 'שירות', tech: 'טכנאי', admin: 'מנהל' },
      en: { sales: 'Sales rep', service: 'Service', tech: 'Technician', admin: 'Admin' }
    };
    var pack = map[(lang === 'he' || lang === 'en') ? lang : 'en'] || map.en;
    return pack[role] || role || (lang === 'he' ? 'משתמש' : 'User');
  }

  function initialsOf(name) {
    var nm = String(name || '').trim();
    if (!nm) return '?';
    var parts = nm.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }

  function readUser() {
    if (!window.MineralBarApp) return { user: null, email: '', role: '', brand: 'CloudPlus' };
    var user = null;
    try { user = MineralBarApp.getUser && MineralBarApp.getUser(); } catch (e) { /* ignore */ }
    if (!user) {
      try {
        var basic = MineralBarApp.getUserBasic && MineralBarApp.getUserBasic();
        user = (basic && basic.data && basic.data.user) || (basic && basic.user) || null;
      } catch (e2) { /* ignore */ }
    }
    var email = '';
    var role = '';
    var brand = 'CloudPlus';
    try { email = (MineralBarApp.getEmail && MineralBarApp.getEmail()) || ''; } catch (e3) { /* ignore */ }
    try { role = (MineralBarApp.getRole && MineralBarApp.getRole()) || ''; } catch (e4) { /* ignore */ }
    try {
      var lang = document.documentElement.lang === 'he' ? 'he' : 'en';
      brand = (MineralBarApp.getBrandName && MineralBarApp.getBrandName(lang)) || brand;
    } catch (e5) { /* ignore */ }
    if (!email && user) email = user.email || user.username || '';
    return { user: user, email: email, role: role, brand: brand };
  }

  function displayName(info) {
    var user = info.user;
    if (!user) {
      if (!info.email) return '';
      return String(info.email).split('@')[0] || info.email;
    }
    return String(
      user.full_name || user.name || user.display_name || user.username || user.user_name ||
      [user.first_name, user.last_name].filter(Boolean).join(' ') ||
      user.email || info.email || ''
    ).trim();
  }

  function avatarUrl(user) {
    if (!user) return '';
    return String(
      user.logo || user.avatar || user.photo || user.image || user.img ||
      user.profile_image || user.profile_pic || user.picture || user.thumb || ''
    ).trim();
  }

  function setAvatar(el, url, initials) {
    if (!el) return;
    if (url) {
      el.innerHTML = '<img src="' + String(url).replace(/"/g, '&quot;') + '" alt="">';
    } else {
      el.textContent = initials || '?';
    }
  }

  function paint() {
    var info = readUser();
    var lang = document.documentElement.lang === 'he' ? 'he' : 'en';
    var name = displayName(info);
    var role = '';
    if (info.user && (info.user.role_name || info.user.role_label || info.user.title || info.user.job_title)) {
      role = String(info.user.role_name || info.user.role_label || info.user.title || info.user.job_title).trim();
    } else {
      role = roleLabel(info.role, lang);
    }
    var initials = initialsOf(name || info.email || '?');
    var photo = avatarUrl(info.user);

    var brandNameEl = document.getElementById('brandName');
    if (brandNameEl) brandNameEl.textContent = info.brand || 'CloudPlus';

    var brandLogo = document.getElementById('brandLogo');
    if (brandLogo) {
      // Keep product mark as initials/brand — user photo goes in member chip.
      var mark = String(info.brand || 'CloudPlus').replace(/[^A-Za-zא-ת0-9]+/g, '').slice(0, 2).toUpperCase();
      brandLogo.textContent = mark || 'C+';
    }

    setAvatar(document.getElementById('memberAvatar'), photo, initials);
    var nameEl = document.getElementById('memberName');
    if (nameEl) nameEl.textContent = name || '—';
    var roleEl = document.getElementById('memberRole');
    if (roleEl) roleEl.textContent = role || '—';
    var chip = document.getElementById('memberChip');
    if (chip) chip.title = [name, info.email].filter(Boolean).join(' · ');

    var selfOpt = document.getElementById('agentSelectSelf');
    if (selfOpt) {
      var uid = (info.user && (info.user.id || info.user.user_id || info.user.member_id)) || info.email || 'self';
      selfOpt.value = String(uid);
      selfOpt.textContent = name || (lang === 'he' ? 'נציג מטפל' : 'Assigned rep');
      var sel = document.getElementById('agentSelect');
      if (sel && (!sel.value || sel.value === '' || sel.value === '—')) {
        selfOpt.selected = true;
      }
    }
  }

  async function refreshAndPaint() {
    try {
      if (window.MineralBarApp && MineralBarApp.isAuthenticated && MineralBarApp.isAuthenticated()) {
        if (MineralBarApp.refreshSession) {
          try { await MineralBarApp.refreshSession(); } catch (e) { /* ignore */ }
        }
        // If user payload is missing, pull User.Basic once.
        var info = readUser();
        if (!info.user && MineralBarApp.getClient) {
          try {
            var raw = await MineralBarApp.getClient().request('User.Basic', {});
            if (raw && MineralBarApp.saveSession) {
              var role = (MineralBarApp.detectRole && MineralBarApp.detectRole(raw)) ||
                (MineralBarApp.getRole && MineralBarApp.getRole()) || 'sales';
              var email = (raw.data && raw.data.user && raw.data.user.email) ||
                (MineralBarApp.getEmail && MineralBarApp.getEmail()) || '';
              MineralBarApp.saveSession(raw, role, email);
            }
          } catch (e2) { /* ignore */ }
        }
      }
    } catch (e3) { /* ignore */ }
    paint();
  }

  function boot() {
    paint();
    refreshAndPaint();
    window.addEventListener('mineralbar:ready', paint);
    window.addEventListener('mineralbar:lang', function () { paint(); });
    // Late paint — session/token sometimes settles after first paint.
    setTimeout(refreshAndPaint, 400);
    setTimeout(refreshAndPaint, 1200);
  }

  window.CloudPlusProposalSession = { paint: paint, refreshAndPaint: refreshAndPaint };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
