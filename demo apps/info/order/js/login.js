(function () {
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

  async function boot() {
    App.bindSharedUi({ page: "login" });
    try {
      var flash = sessionStorage.getItem("orderapp_flash");
      if (flash) {
        sessionStorage.removeItem("orderapp_flash");
        App.toast(flash);
      }
    } catch (e) {}

    App.$("loginForm").addEventListener("submit", login);
    App.$("togglePassword").addEventListener("click", function () {
      var input = App.$("loginPassword");
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      this.textContent = show ? App.t("hide") : "👁";
      this.setAttribute("aria-label", show ? App.t("hide") : App.t("show"));
    });
    App.$("fillDemo").addEventListener("click", function () {
      App.$("loginUsername").value = this.getAttribute("data-user");
      App.$("loginPassword").value = this.getAttribute("data-pass");
    });

    try {
      await App.ensureSdk();
      if (App.client().getToken()) App.goOrders();
    } catch (err) {
      /* stay on login */
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
