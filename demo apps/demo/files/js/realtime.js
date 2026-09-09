/**
 * Realtime socket status + refresh hooks.
 */
const Realtime = (function () {
  let connected = false;
  let status = 'offline';
  let readyPayload = null;
  let handlers = [];
  let socketListeners = [];

  function connect(onEvent) {
    disconnect({ silent: true });
    setSocketStatus('connecting');

    const client = Api.getClient();
    let socket;
    try {
      socket = client.realtime.connect({
        path: AppConfig.REALTIME.path,
        platform: AppConfig.REALTIME.platform
      });
    } catch (err) {
      setSocketStatus('error', null, (err && err.message) || 'connect failed');
      return;
    }

    handlers.push(
      client.realtime.on('biz1:ready', (payload) => {
        connected = true;
        readyPayload = payload || null;
        setSocketStatus('live', payload);
      })
    );

    handlers.push(
      client.realtime.on('*', (event) => {
        if (onEvent) onEvent(event);
      })
    );

    AppConfig.SOCKET_EVENTS.forEach((key) => {
      handlers.push(
        client.realtime.on(key, (event) => {
          if (onEvent) onEvent(event);
        })
      );
    });

    if (socket && typeof socket.on === 'function') {
      const onConnect = () => {
        if (!connected) setSocketStatus('connecting');
      };
      const onDisconnect = () => {
        connected = false;
        readyPayload = null;
        setSocketStatus('offline');
      };
      const onError = (err) => {
        connected = false;
        readyPayload = null;
        setSocketStatus('error', null, (err && err.message) || 'socket error');
      };
      const onReconnect = () => {
        if (!connected) setSocketStatus('connecting');
      };

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('connect_error', onError);
      socket.on('reconnect_attempt', onReconnect);
      socket.on('reconnect', onReconnect);

      socketListeners = [
        ['connect', onConnect],
        ['disconnect', onDisconnect],
        ['connect_error', onError],
        ['reconnect_attempt', onReconnect],
        ['reconnect', onReconnect]
      ];
    }
  }

  function disconnect(opts) {
    opts = opts || {};
    handlers.forEach((off) => {
      if (typeof off === 'function') off();
    });
    handlers = [];

    try {
      const socket = Api.getClient().realtime.socket;
      if (socket && typeof socket.off === 'function') {
        socketListeners.forEach(([evt, fn]) => socket.off(evt, fn));
      }
    } catch (_) { /* ignore */ }
    socketListeners = [];

    connected = false;
    readyPayload = null;
    try {
      Api.getClient().realtime.disconnect();
    } catch (_) { /* ignore */ }
    if (!opts.silent) setSocketStatus('offline');
  }

  /**
   * @param {'live'|'connecting'|'offline'|'error'|boolean} next
   * @param {object} [payload]
   * @param {string} [errorMessage]
   */
  function setSocketStatus(next, payload, errorMessage) {
    const el = document.getElementById('socketStatus');
    if (!el) return;

    let mode = next;
    if (next === true) mode = 'live';
    if (next === false) mode = connected ? 'live' : 'offline';
    status = mode;

    const isLive = mode === 'live';
    el.classList.toggle('is-live', isLive);
    el.classList.toggle('is-off', mode === 'offline' || mode === 'connecting');
    el.classList.toggle('is-error', mode === 'error');

    const label = el.querySelector('.socket-label');
    if (label) {
      if (mode === 'live') {
        label.textContent = typeof I18n !== 'undefined' ? I18n.t('live') : 'Live';
      } else if (mode === 'connecting') {
        label.textContent = typeof I18n !== 'undefined' ? I18n.t('connecting') : 'Connecting…';
      } else {
        label.textContent = typeof I18n !== 'undefined' ? I18n.t('offline') : 'Offline';
      }
    }

    if (isLive) {
      const data = payload || readyPayload;
      if (data && data.userId) {
        el.title = typeof I18n !== 'undefined'
          ? I18n.t('realtimeConnected', { userId: data.userId })
          : 'Realtime connected · user ' + data.userId;
      } else if (typeof I18n !== 'undefined') {
        el.title = I18n.t('realtimeStatus');
      }
    } else if (errorMessage) {
      el.title = errorMessage;
    } else if (typeof I18n !== 'undefined') {
      el.title = I18n.t('realtimeStatus');
    }
  }

  function isConnected() {
    return connected;
  }

  function refreshStatus() {
    setSocketStatus(status === 'live' && connected ? 'live' : status, readyPayload);
  }

  return { connect, disconnect, isConnected, setSocketStatus, refreshStatus };
})();
