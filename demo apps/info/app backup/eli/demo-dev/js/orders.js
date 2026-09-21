(function _initOrdersModule() {
  "use strict";
  var App = window.OrderApp;
  var state = App.state;

  function orderSearchText(row) {
    return [
      row.orders_for_cust_id, row.id, row.order_numbr, row.order_row_id, row.cust_id,
      App.customerName(row),
      row.customer_name, row.cust_name, row.name, row.full_name,
      row.order_name, row.notes, row.note,
      row.email, row.mail, row.mobile, row.phone,
      row.total_price, row.date, row.status, row.order_status,
      (function _getBagString() {
        var bag = App.customFieldBag(row);
        return Object.keys(bag).map(function _mapBag(k) { return bag[k]; }).join(" ");
      })()
    ].map(function _toString(v) { return v == null ? "" : String(v); }).join(" ").toLowerCase();
  }

  function matchesOrderSearch(row, term) {
    var q = String(term || "").trim().toLowerCase();
    if (!q) return true;
    return orderSearchText(row).indexOf(q) >= 0;
  }

  function orderFilters(extra) {
    var body = Object.assign({
      limit: App.PAGE_SIZE,
      start: extra && extra.start != null ? extra.start : state.orderStart
    }, extra || {});
    if (state.selectedCatalogId) body.order_id = state.selectedCatalogId;
    var status = App.$("filterStatus").value;
    var paid = App.$("filterPaid").value;
    var from = App.$("filterFrom").value;
    var to = App.$("filterTo").value;
    var search = App.$("filterSearch").value.trim();
    if (status) body.order_status_id = status;
    if (paid !== "") body.paid_val = paid;
    if (from && to) body.from_to_date = from + "---@---" + to;
    if (search) {
      body.search = search;
      body.filter_data = search;
      if (body.limit == null || body.limit === App.PAGE_SIZE) body.limit = 100;
    }
    return body;
  }

  function renderOrders() {
    var has = state.orders.length > 0;
    App.$("ordersEmpty").classList.toggle("hidden", has);
    App.$("ordersTableWrap").hidden = !has;
    App.$("ordersPager").hidden = state.orderCount <= App.PAGE_SIZE;
    App.$("orderStats").innerHTML =
      '<div class="stat card"><b>' + App.escapeHtml(String(state.orderCount)) + "</b><span>" + App.escapeHtml(App.t("rows")) + "</span></div>" +
      '<div class="stat card"><b>' + App.escapeHtml(String(state.catalog.length)) + "</b><span>" + App.escapeHtml(App.t("catalogProductsStat")) + "</span></div>" +
      '<div class="stat card"><b>' + App.escapeHtml(String(state.statuses.length)) + "</b><span>" + App.escapeHtml(App.t("statuses")) + "</span></div>";
    App.renderOrderHead("ordersHead", true);
    App.$("ordersBody").innerHTML = state.orders.map(function _mapOrderRow(row) { return App.orderTableRow(row, true); }).join("");
    App.$("ordersCards").innerHTML = state.orders.map(function _mapOrderCard(row) { return App.orderCard(row, true); }).join("");
    var page = Math.floor(state.orderStart / App.PAGE_SIZE) + 1;
    var pages = Math.max(1, Math.ceil(state.orderCount / App.PAGE_SIZE));
    App.$("ordersPageLabel").textContent = App.t("pageOf", { page: page, pages: pages });
    App.$("ordersPrev").disabled = state.orderStart <= 0;
    App.$("ordersNext").disabled = state.orderStart + App.PAGE_SIZE >= state.orderCount;
    App.syncBulkBar();
  }

  async function loadOrders() {
    if (!state.selectedCatalogId) {
      state.orders = [];
      state.orderCount = 0;
      renderOrders();
      return;
    }
    App.$("ordersLoading").classList.remove("hidden");
    try {
      var client = App.client();
      var search = App.$("filterSearch").value.trim();
      var filters = orderFilters({ start: state.orderStart });
      var list = await client.list("Order.List", filters);
      App.applyListMeta(list.raw);
      var rows = list.rows || [];
      if (search) {
        var matched = rows.filter(function _filterMatched(row) { return matchesOrderSearch(row, search); });
        if (!matched.length) {
          var wide = Object.assign({}, filters);
          delete wide.search;
          delete wide.filter_data;
          delete wide.note;
          delete wide.order_numbr;
          wide.limit = 100;
          wide.start = 0;
          var fallback = await client.list("Order.List", wide);
          App.applyListMeta(fallback.raw);
          matched = (fallback.rows || []).filter(function _filterFallback(row) { return matchesOrderSearch(row, search); });
        }
        state.orders = matched;
        state.orderCount = matched.length;
      } else {
        var count = await client.count("Order.Count", filters);
        state.orders = rows;
        state.orderCount = count.count || list.total || rows.length;
      }
      renderOrders();
    } catch (err) {
      App.showAlert("ordersAlert", App.errMessage(err));
    } finally {
      App.$("ordersLoading").classList.add("hidden");
    }
  }

  async function loadCatalogAndOrders() {
    App.$("ordersLoading").classList.remove("hidden");
    App.showAlert("ordersAlert");
    try {
      await App.loadLookups();
      var catalog = await App.api("Order.Catalog", { order_type: "all" });
      state.catalog = catalog.data || [];
      if (!state.selectedCatalogId && state.catalog[0]) {
        state.selectedCatalogId = App.catalogIdOf(state.catalog[0]);
      }
      App.renderCatalogChips();
      App.fillCatalogSelect();
      await loadOrders();
    } catch (err) {
      App.showAlert("ordersAlert", App.errMessage(err));
    } finally {
      App.$("ordersLoading").classList.add("hidden");
    }
  }

  function refreshLocale() {
    if (window.OrderI18n) window.OrderI18n.applyDom();
    App.$("pageTitle").textContent = App.t("ordersTitle");
    App.$("pageSub").textContent = App.t("ordersSub");
    if (state.statuses.length) App.fillStatusSelects();
    if (state.catalog.length) {
      App.renderCatalogChips();
      App.fillCatalogSelect();
    }
    if (state.orders.length || state.selectedCatalogId) renderOrders();
  }

  async function boot() {
    App.bindSharedUi({
      page: "orders",
      onRefresh: loadOrders,
      onRender: renderOrders,
      onLocale: refreshLocale,
      onCatalog: function _onCatalogSelect(id) {
        state.selectedCatalogId = id;
        state.orderStart = 0;
        App.clearSelection();
        App.renderCatalogChips();
        loadOrders();
      }
    });

    App.$("pageTitle").textContent = App.t("ordersTitle");
    App.$("pageSub").textContent = App.t("ordersSub");

    App.$("createOrderBtn").addEventListener("click", function _onCreateOrder() {
      App.openOrderModal({ catalogId: state.selectedCatalogId });
    });
    ["filterStatus", "filterPaid", "filterFrom", "filterTo"].forEach(function _bindFilter(id) {
      App.$(id).addEventListener("change", function _onChangeFilter() { state.orderStart = 0; loadOrders(); });
    });
    function runSearch() {
      state.orderStart = 0;
      loadOrders();
    }
    App.$("filterSearch").addEventListener("input", function _onSearchInput() {
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(runSearch, 250);
    });
    App.$("filterSearch").addEventListener("keydown", function _onSearchKeydown(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        clearTimeout(state.searchTimer);
        runSearch();
      }
    });
    App.$("ordersPrev").addEventListener("click", function _onOrdersPrev() {
      state.orderStart = Math.max(0, state.orderStart - App.PAGE_SIZE);
      loadOrders();
    });
    App.$("ordersNext").addEventListener("click", function _onOrdersNext() {
      state.orderStart += App.PAGE_SIZE;
      loadOrders();
    });

    try {
      await App.requireAuth();
      await loadCatalogAndOrders();
    } catch (err) {
      /* redirected to login */
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
