window.Biz1Api = (function () {
  const API_DOMAIN = "https://eli.bull36.com";
  const state = {
    client: null,
    domain: API_DOMAIN,
    token: localStorage.getItem("biz1_sdk_bearer_token") || "",
    basic: null,
    user: null,
    socketReady: false
  };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Failed to load " + src));
      document.head.appendChild(script);
    });
  }

  async function ensureSdk() {
    state.domain = API_DOMAIN;
    localStorage.setItem("biz1_domain", API_DOMAIN);
    await loadScript(API_DOMAIN + "/realtime/socket.io/socket.io.js");
    await loadScript(API_DOMAIN + "/app/sdk/biz1-sdk.js");
  }

  function makeClient() {
    if (!window.Biz1SDK) throw new Error("Biz1SDK is not available.");
    state.client = new window.Biz1SDK.Biz1Client({
      domain: API_DOMAIN,
      storage: localStorage
    });
    return state.client;
  }

  async function getBearerToken({ username, password, otp }) {
    const body = new URLSearchParams({ username, password });
    if (otp) body.set("otp", otp);
    const res = await fetch(API_DOMAIN + "/app/Login", { method: "POST", body });
    const data = await res.json();
    if (data.otp_required) return { otpRequired: true, message: data.message, data };
    if (!data.token) throw new Error(data.message || "Login failed");
    return {
      token: data.token,
      tokenType: data.token_type || "Bearer",
      expiresAt: data.expires_at || null,
      raw: data
    };
  }

  async function login(credentials) {
    await ensureSdk();
    const auth = await getBearerToken(credentials);
    if (auth.otpRequired) return auth;
    localStorage.setItem("biz1_sdk_bearer_token", auth.token);
    state.token = auth.token;
    console.log("[Biz1] Login token:", auth.token);
    const client = makeClient();
    await client.login({
      username: credentials.username,
      password: credentials.password
    });
    const basic = await client.account.basic();
    state.basic = basic;
    state.user = (basic && (basic.user || basic.data && basic.data.user)) || (auth.raw && auth.raw.user) || null;
    try {
      localStorage.setItem("biz1_user_cache", JSON.stringify(state.user || {}));
    } catch (e) { /* ignore */ }
    return { ok: true, basic, token: auth.token, user: state.user, raw: auth.raw };
  }

  async function ensureClient() {
    if (state.client && state.basic) return state.client;
    if (!state.token) throw new Error("Please login first.");
    await ensureSdk();
    const client = makeClient();
    if (!state.basic) {
      try {
        state.basic = await client.account.basic();
        state.user =
          (state.basic && (state.basic.user || (state.basic.data && state.basic.data.user))) ||
          state.user;
      } catch (e) {
        /* ignore basic hydrate errors */
      }
    }
    return client;
  }

  async function loadBasic() {
    const client = await ensureClient();
    if (!state.basic) {
      state.basic = await client.account.basic();
    }
    return state.basic;
  }

  function basicData() {
    const basic = state.basic || {};
    return basic.data || basic.user_data || basic || {};
  }

  function permittedFolderIds(basic) {
    const src = basic || state.basic || {};
    const data = src.data || src;
    const perms =
      (data && data.permissions) ||
      src.permissions ||
      (state.user && state.user.permissions) ||
      {};
    const list = perms.folders || perms.folder_ids || [];
    if (!Array.isArray(list)) return [];
    return list.map((id) => String(id)).filter(Boolean);
  }

  function getFolders(basic) {
    const src = basic || state.basic || {};
    const data = src.data || src;
    const all = data.folders || src.folders || basicData().folders || [];
    const folders = Array.isArray(all) ? all : [];
    const allowed = permittedFolderIds(src);
    if (!allowed.length) return folders;
    const allowSet = {};
    allowed.forEach((id) => {
      allowSet[String(id)] = true;
    });
    return folders.filter((folder) => allowSet[folderId(folder)]);
  }

  async function route(name, payload) {
    const client = await ensureClient();
    return client.request(name, payload || {});
  }

  function rowsFrom(data) {
    if (!data) return [];
    if (Array.isArray(data.rows)) return data.rows;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data)) return data;
    return [];
  }

  async function getCustomer(customerId) {
    const data = await route("Customer.Get", { customer_id: customerId });
    const customer =
      data.customer ||
      data.row ||
      (data.data && !Array.isArray(data.data) ? data.data : null) ||
      data;
    return { ...data, customer: customer };
  }

  function folderId(folder) {
    return String((folder && (folder.id || folder.folder_id || folder.value)) || "");
  }

  function folderName(folder) {
    if (!folder) return "";
    const lang = localStorage.getItem("module_lang") || "en";
    const he = String(folder.name_he || "").trim();
    const en = String(folder.name_en || folder.en || "").trim();
    const fallback = String(folder.name || folder.title || folder.label || folder.id || "").trim();
    if (lang === "he") return he || en || fallback;
    return en || he || fallback;
  }

  async function listCustomers(params) {
    const payload = {
      length: Math.min(Number(params.length) || 25, 25),
      start: Number(params.start) || 0
    };
    if (params.search) payload.search = params.search;
    if (params.folder_id) payload.folder_id = params.folder_id;
    const data = await route("Customer.List", payload);
    return {
      ...data,
      rows: rowsFrom(data),
      count: Number(data.count != null ? data.count : data.recordsTotal) || rowsFrom(data).length
    };
  }

  async function updateCustomer(payload) {
    return route("Customer.Edit", payload);
  }

  async function deleteCustomer(customerId) {
    return route("Customer.Delete", { customer_id: customerId });
  }

  async function listDocuments(customerId, typeKey) {
    const payload = { customer_id: customerId, length: 25 };
    if (typeKey) {
      payload.type = typeKey;
      payload.document_type = typeKey;
    }
    const data = await route("Documents.List", payload);
    return { ...data, rows: rowsFrom(data) };
  }

  async function viewDocument(documentId) {
    return route("Documents.View", { document_id: documentId });
  }

  async function connectRealtime(onEvent, onReadyState) {
    const client = await ensureClient();
    client.realtime.connect({ platform: "web", path: "/realtime/socket.io" });
    client.realtime.on("biz1:ready", function (payload) {
      state.socketReady = true;
      if (onReadyState) onReadyState(true, payload);
    });
    client.realtime.on("*", function (event) {
      if (onEvent) onEvent(event);
    });
  }

  function logout() {
    localStorage.removeItem("biz1_sdk_bearer_token");
    localStorage.removeItem("biz1_user_cache");
    state.client = null;
    state.token = "";
    state.basic = null;
    state.user = null;
  }

  return {
    API_DOMAIN,
    state,
    login,
    logout,
    route,
    loadBasic,
    basicData,
    listCustomers,
    getCustomer,
    updateCustomer,
    deleteCustomer,
    listDocuments,
    viewDocument,
    connectRealtime,
    getFolders,
    folderId,
    folderName,
    rowsFrom
  };
})();
