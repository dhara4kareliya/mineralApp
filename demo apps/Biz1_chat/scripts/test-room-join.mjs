import { io } from 'socket.io-client';

const DOMAIN = 'https://demo.bull36.com';
const EMAIL = 'sales@mineral.co.il';
const PASSWORD = 'pass0364';
const META = '6a950e55c0591ef667c9d890';

async function login() {
  const res = await fetch(DOMAIN + '/app/Login', {
    method: 'POST',
    body: new URLSearchParams({ email: EMAIL, password: PASSWORD })
  });
  const json = await res.json();
  return json.token;
}

async function main() {
  const token = await login();
  const socket = io(DOMAIN, {
    path: '/realtime/socket.io',
    auth: { bearer: token, deviceId: 'join-test', platform: 'web', lastEventId: 0 }
  });

  const emits = [
    ['rooms:join', { messenger_meta_id: META }],
    ['rooms:join', { roomId: META }],
    ['rooms:join', META],
    ['room:join', META],
    ['chat:join', { messenger_meta_id: META }],
    ['realtime:subscribe', { events: ['whatsapp.inbox.refresh'] }],
    ['subscribe', { messenger_meta_id: META }],
  ];

  socket.on('connect', () => {
    console.log('connected');
    emits.forEach(([ev, payload]) => {
      try { socket.emit(ev, payload); console.log('emit', ev, JSON.stringify(payload)); } catch (e) {}
    });
  });
  socket.on('biz1:event', (ev) => console.log('event', ev && ev.key, JSON.stringify(ev).slice(0, 400)));
  socket.on('biz1:ready', () => console.log('ready'));

  await new Promise((r) => setTimeout(r, 5000));
  socket.disconnect();
}

main();
