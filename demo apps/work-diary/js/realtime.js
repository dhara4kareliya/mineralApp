/**
 * Realtime socket via Biz1 SDK.
 */
const Realtime = (function () {
  let connected = false;
  let unsubscribers = [];

  function connect(onEvent) {
    disconnect();
    let client;
    try {
      client = Api.getClient();
      client.realtime.connect({
        path: AppConfig.REALTIME.path,
        platform: AppConfig.REALTIME.platform
      });
    } catch (err) {
      connected = false;
      AppUI.setSocketStatus(false);
      console.warn('Realtime unavailable', err);
      return;
    }

    unsubscribers.push(
      client.realtime.on('biz1:ready', (payload) => {
        connected = true;
        AppUI.setSocketStatus(true, payload);
      })
    );

    unsubscribers.push(
      client.realtime.on('*', (event) => {
        if (onEvent) onEvent(event);
      })
    );

    AppConfig.SOCKET_EVENTS.forEach((key) => {
      unsubscribers.push(
        client.realtime.on(key, (event) => {
          if (onEvent) onEvent(event);
        })
      );
    });
  }

  function disconnect() {
    unsubscribers.forEach((off) => {
      if (typeof off === 'function') off();
    });
    unsubscribers = [];
    connected = false;
    try {
      Api.getClient().realtime.disconnect();
    } catch (_) { /* not logged in */ }
    AppUI.setSocketStatus(false);
  }

  function isConnected() {
    return connected;
  }

  return { connect, disconnect, isConnected };
})();
