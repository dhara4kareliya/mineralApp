/**
 * Live Mission.Create / Mission.Get+Update+Done for comprehensive Task Creation / Editing.
 * Supports Images 4 & 5 specs with Tabs, Assignments, Media, Advanced Options, and Quick Mission.
 */
(function () {
  'use strict';

  var subMissionsList = [];

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function todayParts() {
    var d = new Date();
    return {
      date: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()),
      time: pad(d.getHours()) + ':' + pad(d.getMinutes())
    };
  }

  function formatDisplayDate(dateStr, timeStr) {
    var d = dateStr ? new Date(dateStr + 'T' + (timeStr || '00:00')) : new Date();
    if (Number.isNaN(d.getTime())) d = new Date();
    var dd = pad(d.getDate());
    var mm = pad(d.getMonth() + 1);
    var yyyy = d.getFullYear();
    var hh = pad(d.getHours());
    var min = pad(d.getMinutes());
    return dd + '-' + mm + '-' + yyyy + ' ' + hh + ':' + min;
  }

  function apiErrorText(err) {
    if (!err) return 'Unknown API Error';
    var parts = [];
    if (err.message) parts.push(String(err.message).replace(/<[^>]+>/g, ' ').trim());
    if (err.route) parts.push('route: ' + err.route);
    if (err.status) parts.push('status: ' + err.status);
    return parts.join('\n') || String(err);
  }

  function showStatus(el, kind, text) {
    if (!el) return;
    if (!text) {
      el.style.display = 'none';
      el.innerHTML = '';
      return;
    }
    var bg = kind === 'error' ? '#fbeeed' : (kind === 'ok' ? '#e6f4ec' : '#eaf2fb');
    var border = kind === 'error' ? '#f0c9c4' : (kind === 'ok' ? '#cce8d6' : '#c9daf0');
    var color = kind === 'error' ? '#7a2e28' : (kind === 'ok' ? '#1f5c3f' : '#1d60a2');
    el.style.display = 'block';
    el.innerHTML =
      '<div style="background:' + bg + ';border:1px solid ' + border + ';border-radius:12px;padding:11px 12px;margin-bottom:12px;">' +
      '<pre style="margin:0;white-space:pre-wrap;word-break:break-word;font:600 12px/1.5 Heebo,monospace;color:' + color + ';">' +
      esc(text) +
      '</pre></div>';
  }

  function wireTabs() {
    var tabs = [
      { btn: qs('#tab-btn-detail'), content: qs('#tab-content-detail') },
      { btn: qs('#tab-btn-sub'), content: qs('#tab-content-sub') },
      { btn: qs('#tab-btn-advanced'), content: qs('#tab-content-advanced') },
      { btn: qs('#tab-btn-chat'), content: qs('#tab-content-chat') }
    ];

    tabs.forEach(function (t) {
      if (!t.btn) return;
      t.btn.addEventListener('click', function () {
        tabs.forEach(function (other) {
          if (other.btn) other.btn.classList.remove('active');
          if (other.content) other.content.style.display = 'none';
        });
        t.btn.classList.add('active');
        if (t.content) t.content.style.display = 'block';
      });
    });
  }

  function wirePillRadios(containerId) {
    var container = qs(containerId);
    if (!container) return;
    var pills = qsa('.pill-radio', container);
    pills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        pills.forEach(function (p) {
          p.classList.remove('active');
          var input = p.querySelector('input');
          if (input) input.checked = false;
        });
        pill.classList.add('active');
        var curInput = pill.querySelector('input');
        if (curInput) curInput.checked = true;
        updateDatePreview();
      });
    });
  }

  function getSelectedPillValue(containerId) {
    var container = qs(containerId);
    if (!container) return '';
    var activePill = container.querySelector('.pill-radio.active input');
    return activePill ? activePill.value : '';
  }

  function updateDatePreview() {
    var dateIn = qs('#mb-mission-date');
    var timeIn = qs('#mb-mission-time');
    var textEl = qs('#mb-date-to-do-text');
    if (!textEl) return;
    var dateVal = dateIn ? dateIn.value : '';
    var timeVal = timeIn ? timeIn.value : '15:45';
    textEl.textContent = formatDisplayDate(dateVal, timeVal);
  }

  function wireFooterPreview() {
    var titleIn = qs('#mb-mission-title');
    var previewEl = qs('#mb-footer-preview');
    if (!titleIn || !previewEl) return;
    titleIn.addEventListener('input', function () {
      var val = (titleIn.value || '').trim();
      previewEl.textContent = val ? ('* ' + val) : '* Type Here Mission Detail';
    });
  }

  async function populateTeamMembers(sel) {
    if (!sel) return;
    var team = (window.MineralBarApp && MineralBarApp.getTeamMembers()) || [];
    var meEmail = ((window.MineralBarApp && MineralBarApp.getEmail()) || '').toLowerCase();
    var me = team.find(function (t) {
      return String(t.email || '').toLowerCase() === meEmail;
    }) || team[0];

    sel.innerHTML = '';
    if (!team.length) {
      var opt = document.createElement('option');
      opt.value = '';
      opt.textContent = window.t ? window.t('no_assignee') : 'No member';
      sel.appendChild(opt);
      return me;
    }
    team.forEach(function (t) {
      var opt = document.createElement('option');
      opt.value = String(t.id);
      var label = (t.name || t.email || ('#' + t.id));
      if (me && String(t.id) === String(me.id)) {
        label += ' ' + ((window.t && window.t('me_suffix')) || '(Me)');
      }
      opt.textContent = label;
      sel.appendChild(opt);
    });
    if (me) sel.value = String(me.id);
    return me;
  }

  async function populateCustomerList(sel) {
    if (!sel) return;
    try {
      var res = await MineralBarApp.listCustomers().catch(function () { return { rows: [] }; });
      var rows = res.rows || res.data || (Array.isArray(res) ? res : []);
      sel.innerHTML = '';
      var empty = document.createElement('option');
      empty.value = '';
      empty.textContent = (window.t && window.t('choose_customer')) || 'Choose Customer';
      sel.appendChild(empty);
      rows.forEach(function (c) {
        var cid = c.customer_id || c.contactus_id || c.id || '';
        var cname = c.name || c.customer_name || c.full_name || ('Customer #' + cid);
        if (cid) {
          var opt = document.createElement('option');
          opt.value = String(cid);
          opt.textContent = cname + (c.phone ? ' (' + c.phone + ')' : '');
          sel.appendChild(opt);
        }
      });
    } catch (err) {
      console.warn('[MineralBar] Failed to load customer dropdown', err);
    }
  }

  async function populateProductList(sel) {
    if (!sel) return;
    try {
      var res = await MineralBarApp.listProducts().catch(function () { return { rows: [] }; });
      var rows = res.rows || res.data || (Array.isArray(res) ? res : []);
      sel.innerHTML = '';
      var empty = document.createElement('option');
      empty.value = '';
      empty.textContent = (window.t && window.t('choose_product')) || 'Choose Product';
      sel.appendChild(empty);
      rows.forEach(function (p) {
        var pid = p.product_id || p.id || '';
        var pname = p.product_name || p.name || p.title || ('Product #' + pid);
        if (pname) {
          var opt = document.createElement('option');
          opt.value = pname;
          opt.textContent = pname;
          sel.appendChild(opt);
        }
      });
    } catch (err) {
      console.warn('[MineralBar] Failed to load product dropdown', err);
    }
  }

  async function populateProjectList(sel) {
    if (!sel) return;
    try {
      var listFn = MineralBarApp.listProjects;
      var res = listFn
        ? await listFn.call(MineralBarApp).catch(function () { return { rows: [] }; })
        : { rows: [] };
      var rows = res.rows || res.data || res.projects || (Array.isArray(res) ? res : []);
      sel.innerHTML = '';
      var empty = document.createElement('option');
      empty.value = '';
      empty.textContent = '—';
      sel.appendChild(empty);

      var seen = {};
      rows.forEach(function (p) {
        var pname = String(
          p.project_name || p.name || p.title || p.project || ''
        ).trim();
        if (!pname || seen[pname]) return;
        seen[pname] = true;
        var opt = document.createElement('option');
        // Mission rows store project_id; project_name is a read-only join.
        var pid = p.project_id != null ? p.project_id : p.id;
        opt.value = pid != null && pid !== '' ? String(pid) : pname;
        opt.setAttribute('data-project-name', pname);
        opt.textContent = pname;
        sel.appendChild(opt);
      });
    } catch (err) {
      console.warn('[Biz1] Failed to load project dropdown', err);
      sel.innerHTML = '<option value="">—</option>';
    }
  }

  function isEnLang() {
    if (typeof window.getLanguage === 'function') {
      return window.getLanguage() === 'en';
    }
    try {
      return (localStorage.getItem('lang') || '') === 'en';
    } catch (e) {
      return false;
    }
  }

  function normalizeColumnValue(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.indexOf('p_') === 0) return raw.slice(2);
    return raw;
  }

  async function loadProjectColumns(selectedValue) {
    var select = qs('#mb-project-column');
    if (!select) return;
    var preferred = selectedValue != null ? String(selectedValue) : String(select.value || '');
    select.disabled = true;
    try {
      var res;
      if (MineralBarApp.listProjectColumns) {
        res = await MineralBarApp.listProjectColumns({ limit: 25 });
      } else {
        var client = MineralBarApp.getClient ? MineralBarApp.getClient() : null;
        if (!client || !client.getToken || !client.getToken()) return;
        res = await client.request('Projects.ColumnsList', { limit: 25 });
      }
      var rows = (res && (res.rows || res.data || res.output || res.list)) || [];
      if (!Array.isArray(rows)) rows = [];
      var order = Array.isArray(res && res.order) ? res.order
        : (Array.isArray(res && res.raw && res.raw.order) ? res.raw.order : []);
      if (order.length) {
        rows = rows.slice().sort(function (a, b) {
          var aKey = a.column_name || a.id || '';
          var bKey = b.column_name || b.id || '';
          var ai = order.indexOf(aKey);
          var bi = order.indexOf(bKey);
          if (ai === -1 && bi === -1) return 0;
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        });
      }

      select.innerHTML = '';
      var placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = (window.t && window.t('select_column'))
        || (isEnLang() ? 'Select column' : 'בחר עמודה');
      select.appendChild(placeholder);

      rows.forEach(function (row) {
        var columnName = row.column_name || '';
        var value = normalizeColumnValue(columnName) || String(row.id || row.data_id || '');
        var label = isEnLang()
          ? (row.name_en || row.name_he || value)
          : (row.name_he || row.name_en || value);
        if (!value || !label) return;
        var option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        option.setAttribute('data-column-name', columnName);
        select.appendChild(option);
      });

      if (preferred) {
        var preferredNorm = normalizeColumnValue(preferred);
        var matched = Array.prototype.slice.call(select.options).find(function (opt) {
          return opt.value === preferred ||
            opt.value === preferredNorm ||
            normalizeColumnValue(opt.getAttribute('data-column-name')) === preferredNorm;
        });
        if (matched) select.value = matched.value;
      }
      if (!select.value) {
        var todo = Array.prototype.slice.call(select.options).find(function (opt) {
          return opt.value === 'to_do';
        });
        if (todo) select.value = 'to_do';
      }
    } catch (e) {
      console.error('[mission-create] Projects.ColumnsList failed', e);
      select.innerHTML = '';
      var failed = document.createElement('option');
      failed.value = '';
      failed.textContent = (window.t && window.t('unable_load_columns'))
        || (isEnLang() ? 'Unable to load columns' : 'לא ניתן לטעון עמודות');
      select.appendChild(failed);
    } finally {
      select.disabled = false;
    }
  }

  function wireSubMissions() {
    var input = qs('#mb-sub-input');
    var btn = qs('#mb-add-sub-btn');
    var listEl = qs('#mb-sub-missions-list');
    if (!btn || !input || !listEl) return;

    function renderList() {
      if (!subMissionsList.length) {
        listEl.innerHTML = '<div style="color:#94a3b8; font-size:13px; font-weight:600; text-align:center; padding:20px 0;">No sub missions added yet.</div>';
        return;
      }
      listEl.innerHTML = subMissionsList.map(function (item, idx) {
        return (
          '<div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:#fff; border:1px solid #e2e8f0; border-radius:10px;">' +
          '<span style="font-size:13.5px; font-weight:700; color:#334155;">' + esc(item) + '</span>' +
          '<button type="button" class="remove-sub" data-idx="' + idx + '" style="background:none; border:none; color:#ef4444; font-weight:800; cursor:pointer;">✕</button>' +
          '</div>'
        );
      }).join('');

      qsa('.remove-sub', listEl).forEach(function (b) {
        b.addEventListener('click', function () {
          var i = Number(this.getAttribute('data-idx'));
          subMissionsList.splice(i, 1);
          renderList();
        });
      });
    }

    btn.addEventListener('click', function () {
      var val = (input.value || '').trim();
      if (!val) return;
      subMissionsList.push(val);
      input.value = '';
      renderList();
    });
  }

  function colorFromPriority(priority) {
    if (priority === 'urgent') return '#ef4444';
    if (priority === 'low') return '#22c55e';
    return '#2563eb';
  }

  function ensureColorOption(sel, value, label) {
    if (!sel || !value) return;
    var has = Array.prototype.some.call(sel.options, function (o) {
      return String(o.value).toLowerCase() === String(value).toLowerCase();
    });
    if (has) {
      sel.value = value;
      return;
    }
    var opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label || value;
    sel.appendChild(opt);
    sel.value = value;
  }

  function setColorFromMission(mission) {
    var colorSel = qs('#mb-choose-color');
    if (!colorSel) return;
    var color = String((mission && mission.color) || '').trim();
    if (color && color !== 'default') {
      var matched = Array.prototype.some.call(colorSel.options, function (o) {
        return String(o.value).toLowerCase() === color.toLowerCase();
      });
      if (matched) {
        colorSel.value = color;
        return;
      }
      ensureColorOption(colorSel, color, color);
      return;
    }
    var pri = (typeof window.getMissionPriority === 'function')
      ? window.getMissionPriority(mission || {})
      : 'normal';
    colorSel.value = colorFromPriority(pri);
  }

  var selectedImageFiles = [];
  var remoteImagePaths = [];
  var loadedMissionMeta = '';
  var loadedMissionImage = '';
  var loadedMissionData = null;

  function isImageFile(file) {
    if (!file) return false;
    if (file.type && /^image\//i.test(file.type)) return true;
    return /\.(jpe?g|png|gif|webp|bmp|heic|heif|svg)$/i.test(file.name || '');
  }

  function syncFileInput(input) {
    if (!input || typeof DataTransfer === 'undefined') return;
    var dt = new DataTransfer();
    selectedImageFiles.forEach(function (f) { dt.items.add(f); });
    input.files = dt.files;
  }

  function fileUrl(pathOrUrl) {
    if (window.MineralBarApp && typeof MineralBarApp.resolveFileUrl === 'function') {
      return MineralBarApp.resolveFileUrl(pathOrUrl);
    }
    var s = String(pathOrUrl || '').trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s) || /^data:/i.test(s)) return s;
    return 'https://files.biz1.co.il/' + s.replace(/^\/+/, '');
  }

  function renderImagePreviews(previewEl) {
    if (!previewEl) return;
    qsa('img', previewEl).forEach(function (img) {
      if (img.src && img.src.indexOf('blob:') === 0) {
        try { URL.revokeObjectURL(img.src); } catch (e) { /* ignore */ }
      }
    });
    previewEl.innerHTML = '';
    var hasRemote = remoteImagePaths.length > 0;
    var hasLocal = selectedImageFiles.length > 0;
    if (!hasRemote && !hasLocal) {
      previewEl.style.display = 'none';
      return;
    }
    previewEl.style.display = 'flex';

    function addThumb(src, onRemove) {
      var wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative;width:72px;height:72px;border-radius:10px;overflow:hidden;border:1px solid var(--border-panel);background:#fff;';
      var img = document.createElement('img');
      img.alt = 'image';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      img.src = src;
      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.setAttribute('aria-label', 'Remove');
      removeBtn.textContent = '×';
      removeBtn.style.cssText = 'position:absolute;top:2px;right:2px;width:20px;height:20px;border:none;border-radius:50%;background:rgba(0,0,0,.65);color:#fff;font-size:14px;line-height:20px;cursor:pointer;padding:0;';
      removeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        onRemove();
        renderImagePreviews(previewEl);
      });
      wrap.appendChild(img);
      wrap.appendChild(removeBtn);
      previewEl.appendChild(wrap);
    }

    remoteImagePaths.forEach(function (path) {
      addThumb(fileUrl(path), function () {
        remoteImagePaths = remoteImagePaths.filter(function (p) { return p !== path; });
      });
    });
    selectedImageFiles.forEach(function (file) {
      addThumb(URL.createObjectURL(file), function () {
        selectedImageFiles = selectedImageFiles.filter(function (f) { return f !== file; });
        syncFileInput(qs('#mb-file-input'));
      });
    });
  }

  function addImageFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    var added = 0;
    files.forEach(function (file) {
      if (!isImageFile(file)) return;
      var dup = selectedImageFiles.some(function (f) {
        return f.name === file.name && f.size === file.size && f.lastModified === file.lastModified;
      });
      if (dup) return;
      selectedImageFiles.push(file);
      added += 1;
    });
    return added;
  }

  function setRemoteImagesFromMission(imageField) {
    if (window.MineralBarApp && typeof MineralBarApp.parseMissionImageList === 'function') {
      remoteImagePaths = MineralBarApp.parseMissionImageList(imageField);
    } else {
      remoteImagePaths = String(imageField || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }
    selectedImageFiles = [];
    syncFileInput(qs('#mb-file-input'));
    renderImagePreviews(qs('#mb-image-preview'));
  }

  function wireMediaDropzone() {
    var zone = qs('#mb-image-dropzone');
    var input = qs('#mb-file-input');
    var previewEl = qs('#mb-image-preview');
    if (!zone || !input) return;

    function applyFiles(fileList) {
      addImageFiles(fileList);
      syncFileInput(input);
      renderImagePreviews(previewEl);
    }

    input.addEventListener('change', function () {
      if (input.files && input.files.length) applyFiles(input.files);
    });

    ;['dragenter', 'dragover'].forEach(function (evt) {
      zone.addEventListener(evt, function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        zone.style.borderColor = 'var(--color-primary)';
        zone.style.background = 'rgba(29,96,162,.06)';
      });
    });

    ;['dragleave', 'dragend'].forEach(function (evt) {
      zone.addEventListener(evt, function (e) {
        e.preventDefault();
        e.stopPropagation();
        zone.style.borderColor = 'var(--border-panel)';
        zone.style.background = 'var(--bg-form)';
      });
    });

    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      zone.style.borderColor = 'var(--border-panel)';
      zone.style.background = 'var(--bg-form)';
      var files = (e.dataTransfer && e.dataTransfer.files) || [];
      if (files.length) applyFiles(files);
    });

    zone.addEventListener('click', function (e) {
      if (e.target === input) return;
      if (e.target.closest && e.target.closest('button')) return;
      if (e.target.closest && e.target.closest('label')) return;
      input.click();
    });

    var recordBtn = qs('#mb-record-btn');
    var recordingIn = qs('#mb-recording-link');
    if (recordBtn && recordingIn) {
      recordBtn.addEventListener('click', function () {
        recordingIn.focus();
        recordingIn.select && recordingIn.select();
      });
    }
  }

  async function persistMissionMedia(missionId, customerId) {
    var recordingIn = qs('#mb-recording-link');
    var recordingLink = recordingIn ? String(recordingIn.value || '').trim() : '';
    var hasNewFiles = selectedImageFiles.length > 0;

    if (hasNewFiles && !customerId) {
      var err = new Error(
        (window.t && window.t('customer_required_for_images')) ||
        'Select a customer before uploading images.'
      );
      err.code = 'CUSTOMER_REQUIRED_FOR_UPLOAD';
      throw err;
    }

    // Always sync image list (including clears) so reload matches UI
    if (typeof MineralBarApp.saveMissionImages === 'function') {
      var savedMedia = await MineralBarApp.saveMissionImages(
        missionId,
        customerId || null,
        selectedImageFiles,
        remoteImagePaths,
        loadedMissionImage
      );
      if (savedMedia && savedMedia.paths) remoteImagePaths = savedMedia.paths.slice();
      loadedMissionImage = remoteImagePaths.join(',');
      selectedImageFiles = [];
      syncFileInput(qs('#mb-file-input'));
    }

    if (typeof MineralBarApp.saveMissionRecording === 'function') {
      await MineralBarApp.saveMissionRecording(missionId, recordingLink, loadedMissionMeta);
      loadedMissionMeta = buildLocalRecordingMeta(recordingLink, loadedMissionMeta);
    } else {
      await MineralBarApp.updateMission({
        id: missionId,
        mission_id: missionId,
        filed: 'meta',
        saveoutput: recordingLink
      });
      loadedMissionMeta = recordingLink;
    }
  }

  function buildLocalRecordingMeta(link, previousMeta) {
    if (window.MineralBarApp && typeof MineralBarApp.parseRecordingFromMeta === 'function') {
      // Reuse server helper via save path — keep plain URL locally
      return String(link || '').trim() || '';
    }
    return String(link || '').trim();
  }

  function collectFullForm() {
    var titleIn = qs('#mb-mission-title');
    var noteIn = qs('#mb-mission-note');
    var privateCb = qs('#mb-task-private');
    var columnSel = qs('#mb-project-column');
    var teamSel = qs('#mb-mission-assignee') || qs('#mb-team-member-select');
    var customerSel = qs('#mb-customer-name');
    var productSel = qs('#mb-product-name');
    var projectSel = qs('#mb-project-name');
    var colorSel = qs('#mb-choose-color');
    var stepSel = qs('#mb-mission-step');
    var recordingLinkIn = qs('#mb-recording-link');
    var dateIn = qs('#mb-mission-date');
    var timeIn = qs('#mb-mission-time');
    var templateCb = qs('#mb-use-template');
    var emailCb = qs('#mb-email-me');
    var whatsappCb = qs('#mb-whatsapp-reminder');
    var notifyCb = qs('#mb-notify-client');

    var rawTitle = (titleIn && titleIn.value || '').trim();
    var note = (noteIn && noteIn.value || '').trim();
    var isPrivate = privateCb ? (privateCb.checked ? 1 : 0) : 0;
    var column = columnSel ? columnSel.value : 'to_do';
    var memberId = teamSel ? teamSel.value : '';
    var customerId = customerSel ? customerSel.value : '';
    var productName = productSel ? productSel.value : '';
    var projectValue = projectSel ? String(projectSel.value || '') : '';
    var projectOpt = projectSel && projectSel.selectedIndex >= 0
      ? projectSel.options[projectSel.selectedIndex]
      : null;
    var projectName = projectOpt ? (projectOpt.getAttribute('data-project-name') || '') : '';
    var projectId = /^\d+$/.test(projectValue) ? projectValue : '';
    var color = colorSel ? colorSel.value : '#2563eb';
    var step = stepSel ? stepSel.value : '';
    var recordingLink = recordingLinkIn ? recordingLinkIn.value : '';

    var dateVal = dateIn ? dateIn.value : '';
    var timeVal = timeIn ? timeIn.value : '14:00';
    var dateToDo = dateVal ? (dateVal + ' ' + (timeVal.length === 5 ? timeVal + ':00' : timeVal)) : '';

    var title = rawTitle;
    if (productName && title.indexOf(productName) === -1) {
      title += ' (' + productName + ')';
    }

    var colorVal = color && color !== 'default' ? color : '#2563eb';

    return {
      title: title,
      mission: title,
      note: note + (productName ? '\nProduct: ' + productName : ''),
      private: isPrivate,
      project_column: column,
      member_id: memberId ? [Number(memberId) || memberId] : undefined,
      assigned_to: memberId || undefined,
      customer_id: customerId || undefined,
      project_name: projectName,
      project_id: projectId,
      color: colorVal,
      mission_color: colorVal,
      mission_step: step,
      step_id: step,
      recording_link: recordingLink,
      date_to_do: dateToDo,
      use_as_template: templateCb ? (templateCb.checked ? 1 : 0) : 0,
      email_reminder: emailCb ? (emailCb.checked ? 1 : 0) : 0,
      email_me_employee: emailCb ? (emailCb.checked ? 1 : 0) : 0,
      whatsapp_reminder: whatsappCb ? (whatsappCb.checked ? 1 : 0) : 0,
      whatsApp_reminder: whatsappCb ? (whatsappCb.checked ? 1 : 0) : 0,
      notify_client: notifyCb ? (notifyCb.checked ? 1 : 0) : 0
    };
  }

  async function loadDetailMode(missionId, statusEl, saveBtn) {
    showStatus(statusEl, 'info', 'Loading Mission details…');
    if (saveBtn) {
      var span = saveBtn.querySelector('span[data-i18n]') || saveBtn.querySelector('span');
      var label = (window.t && window.t('save_changes')) || 'Save Changes';
      if (span) span.textContent = label;
      else saveBtn.textContent = label;
    }

    try {
      var res = await MineralBarApp.getMission(missionId);
      var m = res.mission || {};
      loadedMissionData = Object.assign({}, m);
      if (m.date_to_do_format) loadedMissionData.date_to_do = m.date_to_do_format;

      var titleIn = qs('#mb-mission-title');
      var noteIn = qs('#mb-mission-note');
      var privateCb = qs('#mb-task-private');
      var columnSel = qs('#mb-project-column');
      var teamSel = qs('#mb-mission-assignee') || qs('#mb-team-member-select');
      var customerSel = qs('#mb-customer-name');
      var projectSel = qs('#mb-project-name');
      var stepSel = qs('#mb-mission-step');
      var recordingLinkIn = qs('#mb-recording-link');
      var dateIn = qs('#mb-mission-date');
      var timeIn = qs('#mb-mission-time');

      var fullMission = String(m.mission || m.title || '');
      if (titleIn) titleIn.value = fullMission;
      if (noteIn) noteIn.value = m.note || '';
      if (privateCb) privateCb.checked = !!(m.private || m.private_mission || m.is_private || Number(m.private_mission) === 1);
      if (columnSel) await loadProjectColumns(m.project_column || '');
      if (customerSel && (m.customer_id || m.client_id)) customerSel.value = String(m.customer_id || m.client_id);
      if (projectSel) {
        var pid = m.project_id != null && Number(m.project_id) > 0 ? String(m.project_id) : '';
        var pn = String(m.project_name || '').trim();
        var wanted = pid || pn;
        if (wanted) {
          var hasOpt = Array.prototype.some.call(projectSel.options, function (o) {
            return o.value === wanted;
          });
          if (!hasOpt) {
            var keep = document.createElement('option');
            keep.value = wanted;
            keep.setAttribute('data-project-name', pn || wanted);
            keep.textContent = pn || wanted;
            projectSel.appendChild(keep);
          }
          projectSel.value = wanted;
        }
      }
      setColorFromMission(m);
      if (stepSel) {
        var stepVal = '';
        if (m.missions_steps_id != null && Number(m.missions_steps_id) > 0) stepVal = String(m.missions_steps_id);
        else if (m.step_id != null && Number(m.step_id) > 0) stepVal = String(m.step_id);
        else if (m.mission_step) stepVal = String(m.mission_step);
        if (stepVal) {
          var hasStep = Array.prototype.some.call(stepSel.options, function (o) {
            return o.value === stepVal;
          });
          if (hasStep) stepSel.value = stepVal;
        } else {
          stepSel.value = '';
        }
      }

      loadedMissionMeta = m.meta || '';
      var recLink = '';
      if (window.MineralBarApp && typeof MineralBarApp.parseRecordingFromMeta === 'function') {
        recLink = MineralBarApp.parseRecordingFromMeta(m.meta);
      } else if (m.recording_link) {
        recLink = m.recording_link;
      } else if (m.meta && /^https?:\/\//i.test(String(m.meta).trim())) {
        recLink = String(m.meta).trim();
      }
      if (recordingLinkIn) recordingLinkIn.value = recLink;

      loadedMissionImage = m.image || '';
      setRemoteImagesFromMission(loadedMissionImage);

      var templateCb = qs('#mb-use-template');
      var emailCb = qs('#mb-email-me');
      var whatsappCb = qs('#mb-whatsapp-reminder');
      var notifyCb = qs('#mb-notify-client');
      if (emailCb) emailCb.checked = !!(Number(m.email_me_employee) === 1 || m.email_me_employee === true);
      if (whatsappCb) whatsappCb.checked = !!(Number(m.whatsApp_reminder) === 1 || m.whatsApp_reminder === true);
      if (notifyCb) notifyCb.checked = !!(Number(m.notify_client) === 1 || m.notify_client === true);
      if (templateCb && m.use_as_template != null) {
        templateCb.checked = !!(Number(m.use_as_template) === 1 || m.use_as_template === true);
      }

      if (teamSel) {
        var mid = m.member_id || m.assigned_to || m.user_id || '';
        if (Array.isArray(mid)) mid = mid[0];
        if (typeof mid === 'string' && mid.charAt(0) === '[') {
          try { mid = JSON.parse(mid)[0]; } catch (e) { /* ignore */ }
        }
        if (mid) teamSel.value = String(mid);
      }

      var when = fromBiz1Date(m);
      if (dateIn) dateIn.value = when.date;
      if (timeIn) timeIn.value = when.time;
      updateDatePreview();

      showStatus(statusEl, null, '');
    } catch (err) {
      console.error('[MineralBar] Mission.Get failed', err);
      showStatus(statusEl, 'error', apiErrorText(err));
    }
  }

  function fromBiz1Date(mission) {
    var iso = mission && (mission.date_to_do_format || '');
    if (iso) {
      var d = new Date(iso);
      if (!Number.isNaN(d.getTime())) {
        return {
          date: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()),
          time: pad(d.getHours()) + ':' + pad(d.getMinutes())
        };
      }
    }
    var raw = String((mission && mission.date_to_do) || '').trim();
    var m = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})/);
    if (m) {
      return {
        date: m[3] + '-' + pad(+m[2]) + '-' + pad(+m[1]),
        time: pad(+m[4]) + ':' + m[5]
      };
    }
    var m2 = raw.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})/);
    if (m2) {
      return { date: m2[1] + '-' + m2[2] + '-' + m2[3], time: pad(+m2[4]) + ':' + m2[5] };
    }
    return todayParts();
  }

  async function wireForm() {
    var formRoot = qs('#mb-mission-form');
    if (!formRoot) return;

    wireTabs();
    wireMediaDropzone();
    wirePillRadios('#mb-time-options');
    wirePillRadios('#mb-duration-options');
    wirePillRadios('#mb-return-options');
    wireFooterPreview();
    wireSubMissions();

    var dateIn = qs('#mb-mission-date');
    var timeIn = qs('#mb-mission-time');
    var now = todayParts();
    if (dateIn && !dateIn.value) dateIn.value = now.date;
    if (timeIn && !timeIn.value) timeIn.value = '15:45';
    updateDatePreview();

    if (dateIn) dateIn.addEventListener('change', updateDatePreview);
    if (timeIn) timeIn.addEventListener('change', updateDatePreview);

    var teamSel = qs('#mb-mission-assignee') || qs('#mb-team-member-select');
    var customerSel = qs('#mb-customer-name');
    var productSel = qs('#mb-product-name');
    var projectSel = qs('#mb-project-name');
    await populateTeamMembers(teamSel);
    await populateCustomerList(customerSel);
    await populateProductList(productSel);
    await populateProjectList(projectSel);

    var statusEl = qs('#mb-mission-status');
    var saveBtn = qs('#mb-create-mission');
    var params = new URLSearchParams(location.search || '');
    var missionId = params.get('mission_id') || params.get('id') || '';

    if (!missionId) {
      await loadProjectColumns();
    }

    if (missionId) {
      await loadDetailMode(missionId, statusEl, saveBtn);
      var saveLabel = (window.t && window.t('save_changes')) || 'Save Changes';
      var labelSpan = saveBtn.querySelector('span[data-i18n]') || saveBtn.querySelector('span');
      if (labelSpan) labelSpan.textContent = saveLabel;
      else saveBtn.setAttribute('data-edit-mode', '1');
    }

    if (!saveBtn) return;
    saveBtn.addEventListener('click', async function () {
      showStatus(statusEl, null, '');
      var titleIn = qs('#mb-mission-title');
      var rawMissionTitle = String((titleIn && titleIn.value) || '').trim();
      if (!rawMissionTitle) {
        showStatus(statusEl, 'error', (window.t && window.t('enter_mission_title')) || 'Please enter mission detail title.');
        if (titleIn) titleIn.focus();
        return;
      }

      var payload = collectFullForm();
      if (!payload.title) {
        showStatus(statusEl, 'error', (window.t && window.t('enter_mission_title')) || 'Please enter mission detail title.');
        if (titleIn) titleIn.focus();
        return;
      }

      var editingId = missionId || '';
      saveBtn.disabled = true;
      saveBtn.style.opacity = '0.7';
      var busyLabel = editingId
        ? ((window.t && window.t('saving')) || 'Saving…')
        : ((window.t && window.t('saving')) || 'Saving…');
      var labelEl = saveBtn.querySelector('span[data-i18n]') || saveBtn.querySelector('span');
      var prevLabel = labelEl ? labelEl.textContent : saveBtn.textContent;
      if (labelEl) labelEl.textContent = busyLabel;
      else saveBtn.textContent = busyLabel;

      showStatus(
        statusEl,
        'info',
        editingId
          ? (((window.t && window.t('updating_task')) || 'Updating task…') + ' #' + editingId)
          : ((window.t && window.t('creating_task')) || 'Creating task…')
      );

      try {
        var res;
        var savedId = editingId;
        if (editingId) {
          // Edit mode: Mission.Update only accepts real DB columns (not Create aliases like title)
          var fields = {
            mission: payload.mission || payload.title,
            note: payload.note || '',
            color: payload.color || '',
            project_column: payload.project_column || 'to_do',
            private_mission: payload.private ? 1 : 0,
            project_id: payload.project_id ? Number(payload.project_id) : 0,
            step_id: payload.step_id ? Number(payload.step_id) : 0,
            missions_steps_id: payload.step_id ? Number(payload.step_id) : 0,
            notify_client: payload.notify_client ? 1 : 0,
            email_me_employee: payload.email_reminder ? 1 : 0,
            whatsApp_reminder: payload.whatsapp_reminder ? 1 : 0,
            use_as_template: payload.use_as_template ? 1 : 0
          };
          if (payload.date_to_do) fields.date_to_do = payload.date_to_do;
          if (payload.customer_id) fields.lead_id = payload.customer_id;
          if (payload.member_id) fields.member_id = payload.member_id;
          if (typeof MineralBarApp.updateMissionFields === 'function') {
            res = await MineralBarApp.updateMissionFields(editingId, fields, loadedMissionData || {});
          } else {
            var core = Object.keys(fields);
            for (var i = 0; i < core.length; i++) {
              var f = core[i];
              if (fields[f] == null || fields[f] === '') continue;
              await MineralBarApp.updateMission({
                id: editingId,
                mission_id: editingId,
                filed: f,
                saveoutput: fields[f]
              });
            }
            res = { id: editingId };
          }
          await persistMissionMedia(editingId, payload.customer_id);
          showStatus(statusEl, 'ok', ((window.t && window.t('task_updated_ok')) || 'Task updated successfully') + '! ID: ' + editingId);
        } else {
          res = await MineralBarApp.createMission(payload);
          savedId = res.id || res.mission_id || '';
          if (savedId) {
            await persistMissionMedia(savedId, payload.customer_id);
          }
          showStatus(statusEl, 'ok', ((window.t && window.t('task_saved_ok')) || 'Task saved successfully') + '! ID: ' + (savedId || ''));
        }
        setTimeout(function () {
          location.href = 'tasks.html';
        }, 600);
      } catch (err) {
        console.error('[Biz1] Mission save failed', err);
        var msg = apiErrorText(err);
        if (err && err.code === 'CUSTOMER_REQUIRED_FOR_UPLOAD') {
          msg = (window.t && window.t('customer_required_for_images')) ||
            'Select a customer before uploading images.';
        }
        showStatus(statusEl, 'error', msg);
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
        if (labelEl) labelEl.textContent = prevLabel;
        else saveBtn.textContent = prevLabel || (editingId ? 'Save Changes' : 'Save');
      }
    });
  }

  var started = false;
  function start() {
    if (started) return;
    if (!window.MineralBarApp || !MineralBarApp.isAuthenticated()) return;
    if (!qs('#mb-mission-form')) return;
    started = true;
    wireForm();
  }

  window.addEventListener('mineralbar:ready', start);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 50); });
  } else {
    setTimeout(start, 50);
  }
})();
