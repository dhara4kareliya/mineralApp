(function _initLogin() {
  "use strict";
  var App = window.OrderApp;

  async function login(ev) {
    ev.preventDefault();
    App.showAlert("loginAlert");
    var username = App.$("loginUsername").value.trim();
    var password = App.$("loginPassword").value;
    var otp = App.$("loginOtp").value.trim();
    if (!username || !password) {
      App.showAlert("loginAlert", App.t("enterUserPass"));
      return;
    }
    App.$("loginBtn").disabled = true;
    try {
      await App.ensureSdk();
      var client = App.client();
      var data = await client.login({ username: username, password: password, otp: otp });
      if (data && data.otp_required) {
        App.$("otpWrap").hidden = false;
        App.showAlert("loginAlert", data.message || App.t("enterOtp"));
        return;
      }
      if (!data || !data.token) throw new Error((data && data.message) || "Login failed");
      App.goOrders();
    } catch (err) {
      App.showAlert("loginAlert", App.errMessage(err));
    } finally {
      App.$("loginBtn").disabled = false;
    }
  }

  async function tryUrlTokenLogin() {
    if (!App.readUrlToken || !App.loginWithToken) return false;
    var urlToken = "";
    try {
      urlToken = App.readUrlToken() || "";
      if (urlToken && App.clearUrlToken) App.clearUrlToken();
    } catch (e0) {
      return false;
    }
    if (!urlToken) return false;

    App.$("loginBtn").disabled = true;
    App.showAlert("loginAlert");
    try {
      await App.loginWithToken(urlToken);
      App.goOrders();
      return true;
    } catch (err) {
      App.showAlert("loginAlert", (err && err.message) || App.errMessage(err));
      return false;
    } finally {
      App.$("loginBtn").disabled = false;
    }
  }

  async function boot() {
    App.bindSharedUi({ page: "login" });
    try {
      var flash = sessionStorage.getItem("orderapp_flash");
      if (flash) {
        sessionStorage.removeItem("orderapp_flash");
        App.toast(flash);
      }
    } catch (e) {}

    if (App.$("loginForm")) App.$("loginForm").addEventListener("submit", login);
    if (App.$("togglePassword")) App.$("togglePassword").addEventListener("click", function _onTogglePassword() {
      var input = App.$("loginPassword");
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      this.innerHTML = show 
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
      this.setAttribute("aria-label", show ? App.t("hide") : App.t("show"));
    });
    if (App.$("fillDemo")) App.$("fillDemo").addEventListener("click", function _onFillDemo() {
      App.$("loginUsername").value = this.getAttribute("data-user");
      App.$("loginPassword").value = this.getAttribute("data-pass");
    });

    var hadUrlToken = !!(App.readUrlToken && App.readUrlToken());
    try {
      if (await tryUrlTokenLogin()) return;
    } catch (e1) { /* stay on login */ }
    // An invalid URL token must not fall back to a previously stored session.
    if (hadUrlToken) return;

    try {
      await App.ensureSdk();
      if (App.client().getToken()) App.goOrders();
    } catch (err) {
      /* stay on login */
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
