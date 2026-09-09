/**
 * Socket connectivity test — login, connect, log events for 20s.
 * Usage: node scripts/test-socket.mjs
 */
import { io } from 'socket.io-client';

const DOMAIN = 'https://demo.bull36.com';
const EMAIL = process.env.BIZ1_USER || 'sales@mineral.co.il';
const PASSWORD = process.env.BIZ1_PASSWORD || 'pass0364';

async function login() {
  const body = new URLSearchParams({ email: EMAIL, password: PASSWORD });
  const res = await fetch(DOMAIN + '/app/Login', { method: 'POST', body });
  const json = await res.json();
  if (!json.token) throw new Error('Login failed: ' + (json.message || json.error));
  return json.token;
}

async function main() {
  console.log('Login as', EMAIL);
  const token = await login();
  console.log('Token OK');

  const lastEventId = Number(localStorage?.getItem?.('biz1_realtime_last_event_id') || 0);
  console.log('Note: browser lastEventId would be', lastEventId);

  const socket = io(DOMAIN, {
    transports: ['websocket', 'polling'],
    path: '/realtime/socket.io',
    auth: {
      bearer: token,
      deviceId: 'test-' + Date.now(),
      platform: 'web',
      fcmToken: '',
      lastEventId: 0
    }
  });

  socket.on('connect', () => console.log('[socket] connected', socket.id));
  socket.on('connect_error', (err) => console.error('[socket] connect_error', err.message));
  socket.on('disconnect', (reason) => console.log('[socket] disconnect', reason));
  socket.on('biz1:ready', (payload) => {
    console.log('[biz1:ready]', JSON.stringify(payload).slice(0, 800));
  });
  socket.on('biz1:event', (event) => {
    console.log('[biz1:event]', event && event.key, JSON.stringify(event).slice(0, 600));
  });
  socket.on('rooms:refresh', (event) => {
    console.log('[rooms:refresh]', JSON.stringify(event).slice(0, 400));
  });

  await new Promise((r) => setTimeout(r, 20000));
  socket.disconnect();
  console.log('Done waiting 20s');
}

// Node has no localStorage — patch for log only
const localStorage = { getItem: () => null };

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
