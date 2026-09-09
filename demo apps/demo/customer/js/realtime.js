/**
 * Realtime visual indicators — WebSocket when configured, else demo simulation hooks
 */
const Realtime = (() => {
  let socket = null;
  const listeners = new Set();

  function connect() {
    const wsUrl = window.CP_CONFIG?.WS_URL;
    if (!wsUrl) return;

    try {
      socket = new WebSocket(wsUrl);
      socket.addEventListener('open', () => {
        Toast.info('Realtime connected', { title: 'Live', duration: 2500 });
      });
      socket.addEventListener('message', (event) => {
        let payload;
        try {
          payload = JSON.parse(event.data);
        } catch {
          payload = { type: 'message', message: String(event.data) };
        }
        handleEvent(payload);
      });
      socket.addEventListener('close', () => {
        setTimeout(connect, 5000);
      });
    } catch (err) {
      console.warn('WebSocket failed', err);
    }
  }

  function handleEvent(payload) {
    const type = payload.type || payload.event || 'update';
    const message =
      payload.message ||
      payload.text ||
      ({
        ticket: 'New ticket activity',
        whatsapp: 'Incoming WhatsApp message',
        status: 'Status changed',
        task: 'New task update',
        appointment: 'Appointment updated',
      }[type] || 'Data updated');

    Toast.realtime(message, { title: labelFor(type) });

    document.querySelectorAll('[data-live-target]').forEach((el) => {
      el.classList.remove('pulse-effect');
      // force reflow
      void el.offsetWidth;
      el.classList.add('pulse-effect');
    });

    listeners.forEach((fn) => {
      try {
        fn(payload);
      } catch (e) {
        console.error(e);
      }
    });
  }

  function labelFor(type) {
    const map = {
      ticket: 'Ticket',
      whatsapp: 'WhatsApp',
      status: 'Status',
      task: 'Task',
      appointment: 'Appointment',
    };
    return map[type] || 'Update';
  }

  function on(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  /** Demo: emit a sample live event (useful when WS_URL is empty) */
  function simulate(type = 'ticket') {
    handleEvent({ type, message: demoMessage(type) });
  }

  function demoMessage(type) {
    const map = {
      ticket: 'A ticket reply just arrived',
      whatsapp: 'New WhatsApp message received',
      status: 'Ticket status changed to Open',
      task: 'A new task was assigned',
      appointment: 'Appointment time updated',
    };
    return map[type] || 'Live data refresh';
  }

  function init() {
    connect();
    // Expose demo trigger in UI via custom event
    window.addEventListener('cp:realtime-demo', (e) => simulate(e.detail?.type || 'ticket'));
  }

  return { init, on, simulate, handleEvent };
})();

window.Realtime = Realtime;
