(function _customerSub1() {
  "use strict";
  var App = window.OrderApp;
  var state = App.state;

  function queryId() {
    var params = new URLSearchParams(location.search);
    return params.get("id") || "";
  }

  function renderCustomerHero() {
    var c = state.customer || {};
    var name = c.name || c.customer_name || App.t("customer");
    App.$("pageTitle").textContent = name;
    App.$("pageSub").textContent = App.t("customerOrdersSub");
    App.$("customerHero").innerHTML =
      "<div><h2>" + App.escapeHtml(name) + "</h2>" +
      "<p>" + App.escapeHtml(c.email || c.mail || App.t("noEmail")) + " · " + App.escapeHtml(c.mobile || c.phone || App.t("noPhone")) + "</p></div>" +
      '<span class="badge">#' + App.escapeHtml(App.custIdOf(c)) + "</span>";
  }

  function renderCustomerOrders() {
    var has = state.customerOrders.length > 0;
    App.$("customerEmpty").classList.toggle("hidden", has);
    App.$("customerTableWrap").hidden = !has;
    App.$("customerPager").hidden = state.customerCount <= App.PAGE_SIZE;
    App.renderOrderHead("customerHead", false);
    App.$("customerBody").innerHTML = state.customerOrders.map(function _customerSub2(row) { return App.orderTableRow(row, false); }).join("");
    App.$("customerCards").innerHTML = state.customerOrders.map(function _customerSub3(row) { return App.orderCard(row, false); }).join("");
    var page = Math.floor(state.customerStart / App.PAGE_SIZE) + 1;
    var pages = Math.max(1, Math.ceil(state.customerCount / App.PAGE_SIZE));
    App.$("customerPageLabel").textContent = App.t("pageOf", { page: page, pages: pages });
    App.$("customerPrev").disabled = state.customerStart <= 0;
    App.$("customerNext").disabled = state.customerStart + App.PAGE_SIZE >= state.customerCount;
    App.syncBulkBar();
  }

  async function loadCustomerOrders() {
    var cid = App.custIdOf(state.customer);
    if (!cid) return;
    App.$("customerLoading").classList.remove("hidden");
    try {
      var client = App.client();
      var filters = { cust_id: cid, limit: App.PAGE_SIZE, start: state.customerStart };

      var status = App.$("filterStatus") ? App.$("filterStatus").value : "";
      var paid = App.$("filterPaid") ? App.$("filterPaid").value : "";
      var from = App.$("filterFrom") ? App.$("filterFrom").value : "";
      var to = App.$("filterTo") ? App.$("filterTo").value : "";
      var search = App.$("filterSearch") ? App.$("filterSearch").value.trim() : "";

      if (status) filters.order_status_id = status;
      if (paid !== "") filters.paid_val = paid;
      if (from && to) filters.from_to_date = from + "---@---" + to;
      if (search) {
        filters.search = search;
        filters.filter_data = search;
        if (filters.limit == null || filters.limit === App.PAGE_SIZE) filters.limit = 100;
      }

      var list = await client.list("Order.List", filters);
      App.applyListMeta(list.raw);
      var rows = list.rows || [];

      if (search) {
        var q = search.toLowerCase();
        rows = rows.filter(function (row) {
          var pName = App.productNameOf ? App.productNameOf(row) : (row.order_name || "");
          return [row.id, row.order_numbr, row.order_name, pName, row.notes, row.total_price].join(" ").toLowerCase().indexOf(q) >= 0;
        });
        state.customerOrders = rows;
        state.customerCount = rows.length;
      } else {
        var count = await client.count("Order.Count", filters);
        state.customerOrders = rows;
        state.customerCount = count.count || list.total || rows.length;
      }

      renderCustomerOrders();
    } catch (err) {
      App.showAlert("customerAlert", App.errMessage(err));
    } finally {
      App.$("customerLoading").classList.add("hidden");
    }
  }

  async function openCustomer(id) {
    App.$("customerLoading").classList.remove("hidden");
    App.showAlert("customerAlert");
    try {
      var catalog = await App.api("Order.Catalog", { order_type: "all" });
      state.catalog = catalog.data || [];
      if (!state.selectedCatalogId && state.catalog[0]) state.selectedCatalogId = App.catalogIdOf(state.catalog[0]);
      App.fillCatalogSelect();
      await App.loadLookups();
      var got = await App.api("Customer.Get", { customer_id: id });
      state.customer = (got && (got.data || got.customer)) || { id: id, customer_id: id };
      state.customerStart = 0;
      renderCustomerHero();
      await loadCustomerOrders();
    } catch (err) {
      App.showAlert("customerAlert", App.errMessage(err));
    } finally {
      App.$("customerLoading").classList.add("hidden");
    }
  }

  function refreshLocale() {
    if (window.OrderI18n) window.OrderI18n.applyDom();
    if (state.statuses.length) App.fillStatusSelects();
    if (state.catalog.length) App.fillCatalogSelect();
    if (state.customer) {
      renderCustomerHero();
      renderCustomerOrders();
    }
  }

  async function boot() {
    var id = queryId();
    if (!id) {
      App.goOrders();
      return;
    }

    App.bindSharedUi({
      page: "customer",
      onRefresh: loadCustomerOrders,
      onRender: renderCustomerOrders,
      onLocale: refreshLocale
    });

    App.$("createCustomerOrderBtn").addEventListener("click", function _customerSub4() {
      App.openOrderModal({
        custId: App.custIdOf(state.customer),
        customerName: App.customerName(state.customer),
        catalogId: state.selectedCatalogId,
        lockCustomer: true
      });
    });
    App.$("customerPrev").addEventListener("click", function _customerSub5() {
      state.customerStart = Math.max(0, state.customerStart - App.PAGE_SIZE);
      loadCustomerOrders();
    });
    App.$("customerNext").addEventListener("click", function _customerSub6() {
      state.customerStart += App.PAGE_SIZE;
      loadCustomerOrders();
    });
    ["filterStatus", "filterPaid", "filterFrom", "filterTo"].forEach(function _bindCustomerFilter(id) {
      if (App.$(id)) {
        App.$(id).addEventListener("change", function _filterChange() { state.customerStart = 0; loadCustomerOrders(); });
      }
    });
    var searchDebounce;
    if (App.$("filterSearch")) {
      App.$("filterSearch").addEventListener("input", function _searchChange() {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(function _searchTimeout() { state.customerStart = 0; loadCustomerOrders(); }, 400);
      });
    }

    try {
      await App.requireAuth();
      await openCustomer(id);
    } catch (err) {
      /* redirected */
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
