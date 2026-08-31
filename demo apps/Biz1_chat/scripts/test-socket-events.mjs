/**
 * Listen for realtime events, then send a note and log what arrives.
 */
import { io } from 'socket.io-client';

const DOMAIN = 'https://demo.bull36.com';
const EMAIL = 'sales@mineral.co.il';
const PASSWORD = 'pass0364';
const CUSTOMER_ID = '13801750'; // satish from prior tests

async function login() {
  const res = await fetch(DOMAIN + '/app/Login', {
    method: 'POST',
    body: new URLSearchParams({ email: EMAIL, password: PASSWORD })
  });
  const json = await res.json();
  if (!json.token) throw new Error('Login failed');
  return json.token;
}

async function sendNote(token, msg) {
  const res = await fetch(DOMAIN + '/app/Chat.SendCustomer', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body: new URLSearchParams({
      msg: msg,
      message: msg,
      customer_id: CUSTOMER_ID,
      cust_id: CUSTOMER_ID,
      from: 'send_notes'
    })
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

function main() {
  return login().then(async (token) => {
    console.log('Logged in');
    const events = [];
    const socket = io(DOMAIN, {
      transports: ['websocket', 'polling'],
      path: '/realtime/socket.io',
      auth: {
        bearer: token,
        deviceId: 'diag-' + Date.now(),
        platform: 'web',
        fcmToken: '',
        lastEventId: 0
      }
    });

    socket.on('connect', () => console.log('[connect]', socket.id));
    socket.on('biz1:ready', (p) => console.log('[ready] events:', (p.events || []).filter((e) => /chat|whatsapp|message|inbox/i.test(e)).join(', ')));
    socket.on('biz1:event', (ev) => {
      events.push(ev);
      console.log('\n=== biz1:event ===');
      console.log('key:', ev && ev.key);
      console.log('id:', ev && ev.id);
      console.log(JSON.stringify(ev, null, 2).slice(0, 2000));
    });
    socket.on('rooms:refresh', (ev) => {
      console.log('\n=== rooms:refresh ===');
      console.log(JSON.stringify(ev, null, 2).slice(0, 1000));
    });

    await new Promise((r) => setTimeout(r, 2000));
    const testMsg = 'socket-diag ' + new Date().toISOString().slice(11, 19);
    console.log('\nSending note:', testMsg);
    const send = await sendNote(token, testMsg);
    console.log('Send HTTP', send.status, send.body.slice(0, 300));

    await new Promise((r) => setTimeout(r, 8000));
    console.log('\nTotal biz1:event received:', events.length);
    socket.disconnect();
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
