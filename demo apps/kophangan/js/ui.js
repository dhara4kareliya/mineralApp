(function (global) {
  'use strict';

  var lastToastKey = '';
  var lastToastAt = 0;

  function pushToast(message, tone) {
    tone = tone || 'info';
    var text = String(message || '');
    var now = Date.now();
    var key = tone + '|' + text;
    if (key === lastToastKey && now - lastToastAt < 2500) return;
    lastToastKey = key;
    lastToastAt = now;

    var stack = document.getElementById('toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'toast-stack';
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    var el = document.createElement('div');
    el.className = 'toast ' + tone;
    el.textContent = text;
    stack.appendChild(el);
    setTimeout(function () {
      el.remove();
    }, 3200);
  }

  function triggerPulse(root) {
    root = root || document.querySelector('.phone-frame');
    if (!root) return;
    var banner = document.createElement('div');
    banner.className = 'pulse-banner';
    root.appendChild(banner);
    setTimeout(function () {
      banner.remove();
    }, 900);
  }

  function requireAuth() {
    if (!ExpenseApp.isAuthenticated()) {
      location.href = 'login.html';
      return false;
    }
    return true;
  }

  function redirectIfAuthed() {
    if (ExpenseApp.isAuthenticated()) {
      location.href = 'expenses.html';
      return true;
    }
    return false;
  }

  function fillSelect(selectEl, options, placeholder) {
    if (!selectEl) return;
    var current = selectEl.value;
    selectEl.innerHTML = '';
    var empty = document.createElement('option');
    empty.value = '';
    empty.textContent = placeholder || I18n.t('selectOption');
    selectEl.appendChild(empty);
    (options || []).forEach(function (opt) {
      var o = document.createElement('option');
      o.value = opt.id;
      o.textContent = opt.label;
      selectEl.appendChild(o);
    });
    if (current) selectEl.value = current;
  }

  global.Ui = {
    pushToast: pushToast,
    triggerPulse: triggerPulse,
    requireAuth: requireAuth,
    redirectIfAuthed: redirectIfAuthed,
    fillSelect: fillSelect
  };
})(window);
