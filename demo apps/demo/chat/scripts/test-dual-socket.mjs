import { io } from 'socket.io-client';

const DOMAIN = 'https://demo.bull36.com';
const EMAIL = 'sales@mineral.co.il';
const PASSWORD = 'pass0364';
const CUSTOMER_ID = '13801750';

async function login() {
  const res = await fetch(DOMAIN + '/app/Login', {
    method: 'POST',
    body: new URLSearchParams({ email: EMAIL, password: PASSWORD })
  });
  const json = await res.json();
  return json.token;
}

async function sendNote(token, msg) {
  await fetch(DOMAIN + '/app/Chat.SendCustomer', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body: new URLSearchParams({
      msg: msg, message: msg, customer_id: CUSTOMER_ID, cust_id: CUSTOMER_ID, from: 'send_notes'
    })
  });
}

async function main() {
  const token = await login();
  const listener = io(DOMAIN, {
    path: '/realtime/socket.io',
    auth: { bearer: token, deviceId: 'listener-' + Date.now(), platform: 'web', lastEventId: 0 }
  });
  const sender = io(DOMAIN, {
    path: '/realtime/socket.io',
    auth: { bearer: token, deviceId: 'sender-' + Date.now(), platform: 'web', lastEventId: 0 }
  });

  listener.on('biz1:event', (ev) => {
    console.log('[LISTENER]', ev && ev.key, JSON.stringify(ev).slice(0, 500));
  });
  sender.on('biz1:event', (ev) => {
    console.log('[SENDER]', ev && ev.key, JSON.stringify(ev).slice(0, 500));
  });

  await new Promise((r) => setTimeout(r, 2500));
  const msg = 'dual-socket ' + Date.now();
  console.log('Sending from sender connection:', msg);
  await sendNote(token, msg);
  await new Promise((r) => setTimeout(r, 8000));
  listener.disconnect();
  sender.disconnect();
}

main();
