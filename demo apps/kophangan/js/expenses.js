(function () {
  'use strict';

  if (!Ui.requireAuth()) return;
  I18n.bootUi();

  var api = ExpenseApp.api;
  var selectedFile = null;
  var searchTimer = null;
  var editingId = null;
  var currentDetailId = null;
  var listLoadSeq = 0;
  var listReloadTimer = null;
  var muteRealtimeToastUntil = 0;

  function muteRealtimeToasts(ms) {
    muteRealtimeToastUntil = Date.now() + (ms || 3000);
  }

  function shouldShowRealtimeToast() {
    return Date.now() > muteRealtimeToastUntil;
  }

  function scheduleLoadList(delay) {
    clearTimeout(listReloadTimer);
    listReloadTimer = setTimeout(function () {
      loadList();
    }, delay == null ? 200 : delay);
  }

  var userNameEl = document.getElementById('userName');
  var liveDot = document.getElementById('liveDot');
  var liveLabel = document.getElementById('liveLabel');
  var totalLabel = document.getElementById('totalLabel');
  var listState = document.getElementById('listState');
  var expenseList = document.getElementById('expenseList');
  var searchInput = document.getElementById('searchInput');
  var filterCategory = document.getElementById('filterCategory');
  var filterMonth = document.getElementById('filterMonth');
  var filterSupplier = document.getElementById('filterSupplier');
  var filterOverlay = document.getElementById('filterOverlay');
  var filterBadge = document.getElementById('filterBadge');
  var activeFilters = document.getElementById('activeFilters');
  var addOverlay = document.getElementById('addOverlay');
  var detailOverlay = document.getElementById('detailOverlay');
  var detailBody = document.getElementById('detailBody');
  var addError = document.getElementById('addError');

  /** Convert YYYY-MM (input) → MMYY (API month filter, e.g. 0926). */
  function monthToApi(value) {
    var text = String(value || '').trim();
    var m = text.match(/^(\d{4})-(\d{2})$/);
    if (!m) return text;
    return m[2] + String(m[1]).slice(-2);
  }

  function currentFilters() {
    var filters = {};
    var search = searchInput.value.trim();
    if (search) filters.search = search;

    var category = filterCategory.value;
    if (category) filters.category = category;

    var month = filterMonth.value;
    if (month) filters.month = monthToApi(month);

    var supplier = filterSupplier.value;
    if (supplier) filters.supplier_id = supplier;

    return filters;
  }

  function activeFilterCount() {
    var n = 0;
    if (filterCategory.value) n += 1;
    if (filterMonth.value) n += 1;
    if (filterSupplier.value) n += 1;
    return n;
  }

  function updateFilterBadge() {
    var count = activeFilterCount();
    if (count > 0) {
      filterBadge.textContent = String(count);
      filterBadge.classList.remove('hidden');
    } else {
      filterBadge.classList.add('hidden');
    }
    renderActiveFilterChips();
  }

  function selectedLabel(selectEl) {
    if (!selectEl || !selectEl.value) return '';
    var opt = selectEl.options[selectEl.selectedIndex];
    return opt ? opt.textContent : selectEl.value;
  }

  function renderActiveFilterChips() {
    activeFilters.innerHTML = '';
    var chips = [];
    if (filterCategory.value) {
      chips.push(I18n.t('category') + ': ' + selectedLabel(filterCategory));
    }
    if (filterMonth.value) {
      chips.push(I18n.t('month') + ': ' + (ExpenseApp.formatExpenseMonth(monthToApi(filterMonth.value), I18n.getLang()) || filterMonth.value));
    }
    if (filterSupplier.value) {
      chips.push(I18n.t('suppliers') + ': ' + selectedLabel(filterSupplier));
    }
    if (!chips.length) {
      activeFilters.classList.add('hidden');
      return;
    }
    activeFilters.classList.remove('hidden');
    chips.forEach(function (text) {
      var chip = document.createElement('span');
      chip.className = 'active-filter-chip';
      chip.textContent = text;
      activeFilters.appendChild(chip);
    });
  }

  function openFilters() {
    filterOverlay.classList.remove('hidden');
  }

  function closeFilters() {
    filterOverlay.classList.add('hidden');
  }

  async function loadFilterOptions() {
    var results = await Promise.allSettled([
      api.listExpenseCategories(0),
      api.listSuppliers()
    ]);

    var catPlaceholder = I18n.t('allCategories');
    var supPlaceholder = I18n.t('allSuppliers');

    if (results[0].status === 'fulfilled') {
      Ui.fillSelect(filterCategory, results[0].value, catPlaceholder);
    } else {
      Ui.fillSelect(filterCategory, [], catPlaceholder);
    }

    if (results[1].status === 'fulfilled') {
      Ui.fillSelect(filterSupplier, results[1].value, supPlaceholder);
    } else {
      Ui.fillSelect(filterSupplier, [], supPlaceholder);
    }
  }

  function refreshFilterPlaceholders() {
    var catVal = filterCategory.value;
    var supVal = filterSupplier.value;
    var catOpts = Array.from(filterCategory.options)
      .slice(1)
      .map(function (o) {
        return { id: o.value, label: o.textContent };
      });
    var supOpts = Array.from(filterSupplier.options)
      .slice(1)
      .map(function (o) {
        return { id: o.value, label: o.textContent };
      });
    Ui.fillSelect(filterCategory, catOpts, I18n.t('allCategories'));
    Ui.fillSelect(filterSupplier, supOpts, I18n.t('allSuppliers'));
    filterCategory.value = catVal;
    filterSupplier.value = supVal;
    updateFilterBadge();
  }

  function refreshUserHeader() {
    userNameEl.textContent = I18n.t('welcome') + ', ' + ExpenseApp.displayName();
  }

  var isLive = false;
  var offlinePollTimer = null;

  function setLive(on) {
    isLive = !!on;
    liveDot.className = 'status-dot ' + (on ? 'on' : 'off');
    liveLabel.setAttribute('data-i18n', on ? 'connected' : 'disconnected');
    liveLabel.textContent = I18n.t(on ? 'connected' : 'disconnected');
    syncOfflinePoll();
  }

  function syncOfflinePoll() {
    clearInterval(offlinePollTimer);
    offlinePollTimer = null;
    // Only poll while socket is down — keeps main-app creates visible.
    if (isLive) return;
    offlinePollTimer = setInterval(function () {
      if (document.visibilityState !== 'visible') return;
      if (api.isRealtimeConnected && api.isRealtimeConnected()) {
        setLive(true);
        return;
      }
      scheduleLoadList(0);
    }, 12000);
  }

  function docLabel(type) {
    var map = {
      delivery_invoice: 'delivery',
      invoice: 'invoice',
      receipt: 'receipt',
      receipt_tax_invoice: 'taxInvoiceReceipt'
    };
    return I18n.t(map[type] || 'delivery');
  }

  function expenseDisplayName(row) {
    if (!row) return '';
    return String(
      row.expenses_name ||
        row.expense_name ||
        row.name ||
        row.notes ||
        row.note ||
        ''
    ).trim();
  }

  function expenseTitle(row) {
    var name = expenseDisplayName(row);
    if (name) return name;
    return I18n.t('editExpense') + ' #' + (row.id || row.expense_id || '');
  }

  function refreshDocumentOptions() {
    var sel = document.getElementById('f-document');
    var val = sel.value || 'delivery_invoice';
    sel.innerHTML = '';
    [
      ['delivery_invoice', 'delivery'],
      ['invoice', 'invoice'],
      ['receipt', 'receipt'],
      ['receipt_tax_invoice', 'taxInvoiceReceipt']
    ].forEach(function (pair) {
      var o = document.createElement('option');
      o.value = pair[0];
      o.textContent = I18n.t(pair[1]);
      sel.appendChild(o);
    });
    sel.value = val;
  }

  async function loadList() {
    var seq = ++listLoadSeq;
    listState.classList.remove('hidden');
    listState.textContent = I18n.t('loading');
    expenseList.innerHTML = '';
    try {
      var filters = currentFilters();
      var list = await api.listExpenses(filters);
      var count = await api.countExpenses(filters);
      if (seq !== listLoadSeq) return;

      totalLabel.textContent = I18n.t('total') + ': ' + (count || list.total || 0);
      expenseList.innerHTML = '';

      if (!list.rows.length) {
        listState.innerHTML = '<div class="card empty-state"><h3>' + I18n.t('noExpenses') + '</h3><p>' + I18n.t('noExpensesHint') + '</p></div>';
        return;
      }

      listState.classList.add('hidden');
      list.rows.forEach(function (row) {
        var id = String(row.id || row.expense_id);
        var title = expenseTitle(row);
        var month = ExpenseApp.formatExpenseMonth(row.month, I18n.getLang()) || row.month || row.payment_date || '';
        var sub = [row.category || row.document_type, month].filter(Boolean).join(' · ');
        var article = document.createElement('article');
        article.className = 'expense-item';
        article.setAttribute('role', 'button');
        article.tabIndex = 0;
        article.innerHTML =
          '<div style="min-width:0"><div class="title"></div><div class="sub"></div></div><div class="amount"></div>';
        article.querySelector('.title').textContent = title;
        article.querySelector('.sub').textContent = sub || I18n.t('none');
        article.querySelector('.amount').textContent = ExpenseApp.formatAmount(row.amount);
        article.addEventListener('click', function () {
          openDetail(row.id || row.expense_id);
        });
        article.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDetail(row.id || row.expense_id);
          }
        });
        expenseList.appendChild(article);
      });
    } catch (err) {
      if (seq !== listLoadSeq) return;
      listState.textContent = I18n.apiMsg((err && err.message) || '', 'loadFailed');
      Ui.pushToast(listState.textContent, 'error');
      if (err && err.status === 401) {
        api.logout();
        location.href = 'login.html';
      }
    }
  }

  async function openDetail(id) {
    detailOverlay.classList.remove('hidden');
    detailBody.innerHTML = '<div class="empty-state">' + I18n.t('loading') + '</div>';
    try {
      var expense = await api.getExpense(id);
      var lang = I18n.getLang();
      var categoryId = expense.category_id != null ? expense.category_id : expense.category;
      var subId = expense.subcategory_id != null ? expense.subcategory_id : expense.sub_category_id;
      var projectId = expense.project_id != null ? expense.project_id : expense.project;
      var customerId = expense.customer_id;
      var supplierId = expense.supplier_id;

      var results = await Promise.allSettled([
        !ExpenseApp.isEmptyId(categoryId) ? api.resolveExpenseCategoryName(categoryId, lang) : Promise.resolve(''),
        !ExpenseApp.isEmptyId(subId) ? api.resolveExpenseCategoryName(subId, lang) : Promise.resolve(''),
        !ExpenseApp.isEmptyId(projectId) ? api.getProjectName(projectId) : Promise.resolve(''),
        api.listCustomers(),
        api.listSuppliers()
      ]);

      var categoryName = results[0].status === 'fulfilled' ? results[0].value : '';
      var subName = results[1].status === 'fulfilled' ? results[1].value : '';
      var projectName = results[2].status === 'fulfilled' ? results[2].value : '';
      var customerName = '';
      var supplierName = expense.supplier_name || '';
      if (results[3].status === 'fulfilled' && !ExpenseApp.isEmptyId(customerId)) {
        var cHit = results[3].value.find(function (c) {
          return c.id === String(customerId);
        });
        customerName = (cHit && cHit.label) || '';
      }
      if (results[4].status === 'fulfilled' && !ExpenseApp.isEmptyId(supplierId)) {
        var sHit = results[4].value.find(function (s) {
          return s.id === String(supplierId);
        });
        supplierName = (sHit && sHit.label) || supplierName;
      }

      var monthLabel = ExpenseApp.formatExpenseMonth(expense.month, lang);
      var title = expenseTitle(expense);
      var nameValue = expenseDisplayName(expense);
      var expenseId = expense.id || expense.expense_id;
      var imageRaw = String(expense.image || expense.file_path || expense.file || expense.thumbnail || '');
      var imageUrls = imageRaw
        .split('----@----')
        .map(function (u) {
          return u.trim();
        })
        .filter(Boolean);
      var vat = expense.vat_includes === 1 || expense.vat_includes === '1' || expense.vat_includes === true;

      function row(labelKey, value) {
        return (
          '<div class="detail-row"><div class="detail-label">' +
          I18n.t(labelKey) +
          '</div><div class="detail-value">' +
          ExpenseApp.displayValue(value) +
          '</div></div>'
        );
      }

      var html =
        '<div class="detail-hero card">' +
        '<div class="detail-hero-title"></div>' +
        '<div class="detail-hero-amount">' +
        ExpenseApp.formatAmount(expense.amount) +
        '</div>' +
        '<div class="detail-hero-meta">' +
        ExpenseApp.displayValue(monthLabel || expense.month) +
        '</div></div>' +
        '<div class="detail-list">' +
        row('expenseId', expenseId) +
        row('expenseName', nameValue) +
        row('category', categoryName) +
        row('selectSubCategory', subName) +
        row('chooseCustomer', customerName) +
        row('project', projectName) +
        row('amount', ExpenseApp.formatAmount(expense.amount)) +
        row('vatIncluded', vat ? I18n.t('yes') : I18n.t('no')) +
        row('month', monthLabel || expense.month) +
        row('paymentDate', String(expense.payment_date || '').slice(0, 10)) +
        row('checkNumber', expense.check_number) +
        row('document', docLabel(expense.document_type) || expense.document_type) +
        row('invoiceNumber', expense.invoice_number) +
        row('suppliers', supplierName) +
        row('documentDate', String(expense.document_date || '').slice(0, 10)) +
        row('note', expense.notes || expense.note) +
        '</div>';

      if (imageUrls.length) {
        html +=
          '<div class="field" style="margin-top:16px;margin-bottom:8px;"><label>' +
          I18n.t('image') +
          (imageUrls.length > 1 ? ' (' + imageUrls.length + ')' : '') +
          '</label><div class="detail-images">';
        imageUrls.forEach(function (imageUrl, index) {
          var isImg =
            /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(imageUrl) || /\/upload\//i.test(imageUrl);
          html +=
            '<a class="detail-image card" href="' +
            imageUrl +
            '" target="_blank" rel="noreferrer">';
          if (isImg) {
            html +=
              '<img src="' +
              imageUrl +
              '" alt="' +
              I18n.t('image') +
              ' ' +
              (index + 1) +
              '" />';
          } else {
            html += '<span>' + imageUrl + '</span>';
          }
          html += '</a>';
        });
        html += '</div></div>';
      }

      detailBody.innerHTML = html;
      detailBody.querySelector('.detail-hero-title').textContent = title;
      currentDetailId = expenseId;
    } catch (err) {
      detailBody.innerHTML = '<div class="error-box">' + I18n.apiMsg((err && err.message) || '', 'loadFailed') + '</div>';
      currentDetailId = null;
    }
  }

  function closeDetail() {
    detailOverlay.classList.add('hidden');
    detailBody.innerHTML = '';
    currentDetailId = null;
  }

  function monthToInput(value) {
    var text = String(value || '').trim();
    var yyyyMm = text.match(/^(\d{4})-(\d{2})$/);
    if (yyyyMm) return text;
    var mmYy = text.match(/^(\d{2})(\d{2})$/);
    if (mmYy) return '20' + mmYy[2] + '-' + mmYy[1];
    return '';
  }

  function dateToInput(value) {
    if (!value) return '';
    return String(value).slice(0, 10);
  }

  function setFormMode(isEdit) {
    var form = document.getElementById('addForm');
    if (isEdit) form.classList.add('edit-mode');
    else form.classList.remove('edit-mode');
  }

  function setFormTitle(key) {
    var titleEl = document.getElementById('formTitle');
    titleEl.setAttribute('data-i18n', key);
    titleEl.textContent = I18n.t(key);
  }

  function resetAddForm() {
    document.getElementById('addForm').reset();
    selectedFile = null;
    editingId = null;
    setFormMode(false);
    document.getElementById('fileLabel').textContent = I18n.t('dragDrop');
    document.getElementById('fileHint').textContent = I18n.t('orTapUpload');
    document.getElementById('btn-remove-file').classList.add('hidden');
    addError.classList.add('hidden');
    document.getElementById('f-document').value = 'delivery_invoice';
    setFormTitle('addExpense');
  }

  async function loadFormOptions() {
    refreshDocumentOptions();
    var results = await Promise.allSettled([
      api.listExpenseCategories(0),
      api.listCustomers(),
      api.listProjects(),
      api.listSuppliers()
    ]);
    if (results[0].status === 'fulfilled') Ui.fillSelect(document.getElementById('f-category'), results[0].value);
    if (results[1].status === 'fulfilled') Ui.fillSelect(document.getElementById('f-customer'), results[1].value);
    if (results[2].status === 'fulfilled') Ui.fillSelect(document.getElementById('f-project'), results[2].value);
    if (results[3].status === 'fulfilled') {
      Ui.fillSelect(document.getElementById('f-supplier'), results[3].value, I18n.t('selectSuppliers'));
    }
  }

  async function openAdd() {
    addOverlay.classList.remove('hidden');
    resetAddForm();
    try {
      await loadFormOptions();
      Ui.fillSelect(document.getElementById('f-subcategory'), []);
    } catch (e) {
      /* ignore partial failures */
    }
  }

  async function openEdit(id) {
    closeDetail();
    addOverlay.classList.remove('hidden');
    resetAddForm();
    editingId = id;
    setFormMode(true);
    setFormTitle('editExpenseTitle');
    addError.classList.add('hidden');

    try {
      await loadFormOptions();
      var expense = await api.getExpense(id);
      var categoryId = expense.category_id != null ? expense.category_id : expense.category;

      document.getElementById('f-category').value = ExpenseApp.isEmptyId(categoryId) ? '' : String(categoryId);
      document.getElementById('f-amount').value = expense.amount != null ? expense.amount : '';
      document.getElementById('f-month').value = monthToInput(expense.month);
      document.getElementById('f-payment-date').value = dateToInput(expense.payment_date);
      document.getElementById('f-document').value = expense.document_type || 'delivery_invoice';
      document.getElementById('f-invoice').value = expense.invoice_number || '';
      document.getElementById('f-notes').value = expense.notes || expense.note || '';
    } catch (err) {
      addError.textContent = I18n.apiMsg((err && err.message) || '', 'loadFailed');
      addError.classList.remove('hidden');
    }
  }

  async function deleteCurrentExpense() {
    if (!currentDetailId) return;
    openDeleteModal();
  }

  function openDeleteModal() {
    var nameEl = document.getElementById('deleteExpenseName');
    var heroTitle = detailBody.querySelector('.detail-hero-title');
    nameEl.textContent = heroTitle ? heroTitle.textContent : '';
    document.getElementById('deleteOverlay').classList.remove('hidden');
    I18n.applyLang();
  }

  function closeDeleteModal() {
    document.getElementById('deleteOverlay').classList.add('hidden');
  }

  async function confirmDeleteExpense() {
    if (!currentDetailId) return;
    var confirmBtn = document.getElementById('btn-delete-confirm');
    var cancelBtn = document.getElementById('btn-delete-cancel');
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    try {
      await api.deleteExpense(currentDetailId);
      muteRealtimeToasts(3000);
      Ui.pushToast(I18n.t('deletedSuccess'), 'success');
      Ui.triggerPulse();
      closeDeleteModal();
      closeDetail();
      loadList();
    } catch (err) {
      Ui.pushToast(I18n.apiMsg((err && err.message) || '', 'deleteFailed'), 'error');
    } finally {
      confirmBtn.disabled = false;
      cancelBtn.disabled = false;
    }
  }

  function closeAdd() {
    addOverlay.classList.add('hidden');
    editingId = null;
  }

  document.getElementById('f-category').addEventListener('change', async function () {
    var id = this.value;
    if (!id || id === '0') {
      Ui.fillSelect(document.getElementById('f-subcategory'), []);
      return;
    }
    try {
      var rows = await api.listExpenseCategories(Number(id));
      Ui.fillSelect(document.getElementById('f-subcategory'), rows);
    } catch (e) {
      Ui.fillSelect(document.getElementById('f-subcategory'), []);
    }
  });

  document.getElementById('f-file').addEventListener('change', function () {
    setSelectedFile(this.files && this.files[0] ? this.files[0] : null);
  });

  function isAllowedUpload(file) {
    if (!file) return false;
    var type = String(file.type || '').toLowerCase();
    var name = String(file.name || '').toLowerCase();
    return type.indexOf('image/') === 0 || type === 'application/pdf' || /\.(png|jpe?g|gif|webp|bmp|svg|pdf)$/.test(name);
  }

  function setSelectedFile(file) {
    selectedFile = file || null;
    var fileInput = document.getElementById('f-file');
    var removeBtn = document.getElementById('btn-remove-file');
    if (selectedFile) {
      document.getElementById('fileLabel').textContent = selectedFile.name;
      document.getElementById('fileHint').textContent = I18n.t('fileSelected');
      removeBtn.classList.remove('hidden');
    } else {
      if (fileInput) fileInput.value = '';
      document.getElementById('fileLabel').textContent = I18n.t('dragDrop');
      document.getElementById('fileHint').textContent = I18n.t('orTapUpload');
      removeBtn.classList.add('hidden');
    }
  }

  var uploadBox = document.getElementById('uploadBox');
  var fileInput = document.getElementById('f-file');

  uploadBox.addEventListener('click', function () {
    fileInput.click();
  });
  uploadBox.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  ['dragenter', 'dragover'].forEach(function (evt) {
    uploadBox.addEventListener(evt, function (e) {
      e.preventDefault();
      e.stopPropagation();
      uploadBox.classList.add('is-dragover');
    });
  });

  ['dragleave', 'dragend'].forEach(function (evt) {
    uploadBox.addEventListener(evt, function (e) {
      e.preventDefault();
      e.stopPropagation();
      uploadBox.classList.remove('is-dragover');
    });
  });

  uploadBox.addEventListener('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.remove('is-dragover');
    var files = e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files : null;
    var file = files && files[0] ? files[0] : null;
    if (!file) return;
    if (!isAllowedUpload(file)) {
      Ui.pushToast(I18n.t('invalidFileType'), 'error');
      return;
    }
    setSelectedFile(file);
  });

  // Prevent the browser from opening the file when dropped outside the box but inside the sheet.
  ['dragover', 'drop'].forEach(function (evt) {
    document.getElementById('addOverlay').addEventListener(evt, function (e) {
      e.preventDefault();
    });
  });

  document.getElementById('btn-remove-file').addEventListener('click', function () {
    setSelectedFile(null);
  });

  document.getElementById('addForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    addError.classList.add('hidden');
    var category_id = document.getElementById('f-category').value;
    var amount = document.getElementById('f-amount').value;
    var document_type = document.getElementById('f-document').value;
    var month = document.getElementById('f-month').value;
    if (!category_id || !amount || !document_type || !month) {
      addError.textContent = I18n.t('validationRequired');
      addError.classList.remove('hidden');
      return;
    }

    var supplierSel = document.getElementById('f-supplier');
    var supplierLabel = supplierSel.options[supplierSel.selectedIndex] ? supplierSel.options[supplierSel.selectedIndex].textContent : '';

    var saveBtn = document.getElementById('btn-save');
    var saveText = document.getElementById('saveText');
    saveBtn.disabled = true;
    saveText.textContent = I18n.t('saving');

    try {
      if (editingId) {
        await api.updateExpense(editingId, {
          category_id: category_id,
          amount: amount,
          document_type: document_type,
          month: month,
          notes: document.getElementById('f-notes').value,
          payment_date: document.getElementById('f-payment-date').value,
          invoice_number: document.getElementById('f-invoice').value
        });
        muteRealtimeToasts(3000);
        Ui.pushToast(I18n.t('updatedSuccess'), 'success');
      } else {
        await api.addExpense({
          name: document.getElementById('f-name').value,
          category_id: category_id,
          subcategory_id: document.getElementById('f-subcategory').value,
          customer_id: document.getElementById('f-customer').value,
          project_id: document.getElementById('f-project').value,
          amount: amount,
          vat_includes: document.getElementById('f-vat').checked,
          month: month,
          payment_date: document.getElementById('f-payment-date').value,
          check_number: document.getElementById('f-check').value,
          document_type: document_type,
          invoice_number: document.getElementById('f-invoice').value,
          supplier_id: supplierSel.value,
          supplier_name: supplierSel.value ? supplierLabel : '',
          document_date: document.getElementById('f-document-date').value,
          notes: document.getElementById('f-notes').value,
          file: selectedFile
        });
        muteRealtimeToasts(3000);
        Ui.pushToast(I18n.t('savedSuccess'), 'success');
      }
      Ui.triggerPulse();
      closeAdd();
      loadList();
    } catch (err) {
      var msg = I18n.apiMsg((err && err.message) || '', editingId ? 'updateFailed' : 'saveFailed');
      addError.textContent = msg;
      addError.classList.remove('hidden');
      Ui.pushToast(msg, 'error');
    } finally {
      saveBtn.disabled = false;
      saveText.textContent = I18n.t('save');
    }
  });

  document.getElementById('btn-add').addEventListener('click', openAdd);
  document.getElementById('btn-close-add').addEventListener('click', closeAdd);
  document.getElementById('btn-reset').addEventListener('click', function () {
    if (editingId) openEdit(editingId);
    else resetAddForm();
  });
  document.getElementById('btn-close-detail').addEventListener('click', closeDetail);
  document.getElementById('btn-detail-close').addEventListener('click', closeDetail);
  document.getElementById('btn-detail-edit').addEventListener('click', function () {
    if (currentDetailId) openEdit(currentDetailId);
  });
  document.getElementById('btn-detail-delete').addEventListener('click', deleteCurrentExpense);
  document.getElementById('btn-delete-cancel').addEventListener('click', closeDeleteModal);
  document.getElementById('btn-delete-confirm').addEventListener('click', confirmDeleteExpense);
  document.getElementById('deleteOverlay').addEventListener('click', function (e) {
    if (e.target === document.getElementById('deleteOverlay')) closeDeleteModal();
  });
  document.getElementById('btn-refresh').addEventListener('click', loadList);
  document.getElementById('btn-open-filters').addEventListener('click', openFilters);
  document.getElementById('btn-close-filters').addEventListener('click', closeFilters);
  document.getElementById('btn-apply-filters').addEventListener('click', function () {
    updateFilterBadge();
    closeFilters();
    loadList();
  });
  document.getElementById('btn-clear-filters').addEventListener('click', function () {
    filterCategory.value = '';
    filterMonth.value = '';
    filterSupplier.value = '';
    updateFilterBadge();
    closeFilters();
    loadList();
  });
  document.getElementById('btn-logout').addEventListener('click', function () {
    api.logout();
    location.href = 'login.html';
  });

  addOverlay.addEventListener('click', function (e) {
    if (e.target === addOverlay) closeAdd();
  });
  detailOverlay.addEventListener('click', function (e) {
    if (e.target === detailOverlay) closeDetail();
  });
  filterOverlay.addEventListener('click', function (e) {
    if (e.target === filterOverlay) closeFilters();
  });

  searchInput.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadList, 350);
  });

  window.addEventListener('app:langchange', function () {
    refreshUserHeader();
    refreshDocumentOptions();
    refreshFilterPlaceholders();
    loadList();
  });

  var lastRealtimeEventId = '';
  var lastRealtimeAt = 0;

  // Realtime — register handlers first, then connect via Biz1 SDK
  function onExpenseRealtime(kind, event) {
    var eventId = event && (event.id || event.eventId || event.event_id);
    var now = Date.now();
    if (eventId && String(eventId) === lastRealtimeEventId && now - lastRealtimeAt < 2000) return;
    if (eventId) {
      lastRealtimeEventId = String(eventId);
      lastRealtimeAt = now;
    }

    console.log('[Expense App] expense realtime', kind, event && (event.key || event));
    Ui.triggerPulse();
    if (shouldShowRealtimeToast()) {
      if (kind === 'created') Ui.pushToast(I18n.t('realtimeCreated'), 'success');
      else if (kind === 'updated') Ui.pushToast(I18n.t('realtimeUpdate'), 'info');
      else Ui.pushToast(I18n.t('deletedSuccess'), 'info');
    }
    scheduleLoadList(250);
  }

  api.onRealtime('biz1:ready', function (payload) {
    setLive(true);
    var events = (payload && payload.events) || [];
    var expenseKeys = events.filter(function (k) {
      return String(k).indexOf('expenses.') === 0;
    });
    console.log('[Expense App] live — expense events:', expenseKeys);
  });
  api.onRealtime('socket:connect', function () {
    console.log('[Expense App] socket transport connected');
  });
  api.onRealtime('socket:disconnect', function () {
    setLive(false);
  });
  api.onRealtime('socket:error', function (payload) {
    setLive(false);
    console.warn('[Expense App] socket error', payload && payload.error);
  });
  api.onRealtime('expenses.created', function (event) {
    onExpenseRealtime('created', event);
  });
  api.onRealtime('expenses.updated', function (event) {
    onExpenseRealtime('updated', event);
  });
  api.onRealtime('expenses.deleted', function (event) {
    onExpenseRealtime('deleted', event);
  });

  api.connectRealtime().then(function (socket) {
    if (!socket) setLive(false);
  });

  // Reconnect socket if the tab comes back and the connection dropped.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    if (api.isRealtimeConnected && api.isRealtimeConnected()) return;
    api.connectRealtime();
  });

  setLive(false);

  refreshUserHeader();
  refreshDocumentOptions();
  loadFilterOptions().finally(function () {
    updateFilterBadge();
    loadList();
  });
})();
