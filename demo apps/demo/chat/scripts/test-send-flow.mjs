/**
 * End-to-end API test: login → list conversations → send note → verify success handling.
 * Usage: node scripts/test-send-flow.mjs [username]
 */
const DOMAIN = 'https://demo.bull36.com';
const PASSWORD = process.env.BIZ1_PASSWORD || 'pass0364';
const USERNAME = process.argv[2] || process.env.BIZ1_USER || 'sales';

function parseBiz1SendPayload(data) {
  if (data == null) return null;
  if (typeof data === 'object') {
    if (typeof data.message === 'string') {
      const nested = parseBiz1SendPayload(data.message);
      if (nested && (
        nested.message_return ||
        nested.output != null ||
        (nested.success != null && nested.success !== 0 && nested.success !== '0')
      )) {
        return nested;
      }
    }
    if (data.raw) {
      const fromRaw = parseBiz1SendPayload(data.raw);
      if (fromRaw) return fromRaw;
    }
    if (data.response) {
      const fromRes = parseBiz1SendPayload(data.response);
      if (fromRes) return fromRes;
    }
    if (data.success != null || data.output != null || data.message_return != null) return data;
    return null;
  }
  if (typeof data !== 'string') return null;
  const s = data.trim();
  if (!s || s.charAt(0) !== '{') return null;
  try { return JSON.parse(s); } catch { return null; }
}

function isBiz1SendCustomerSuccess(raw) {
  raw = parseBiz1SendPayload(raw);
  if (!raw || typeof raw !== 'object') return false;
  if (raw.ok === false) return false;
  if (raw.success === 0 || raw.success === '0') return false;
  if (Number(raw.success) === 1 || raw.success === true) return true;
  if (Number(raw.output) === 1) return true;
  if (raw.message_return && String(raw.message_return).trim().length > 0) return true;
  if (String(raw.success) === '4') return true;
  if (/^\d+$/.test(String(raw.success || '')) && Number(raw.success) > 0) return true;
  return /נשלח|נוספה|הצלח/i.test(String(raw.message_return || raw.message || ''));
}

async function api(route, body, token) {
  const headers = token ? { Authorization: 'Bearer ' + token } : {};
  const res = await fetch(DOMAIN + '/app/' + route, {
    method: 'POST',
    headers,
    body: new URLSearchParams(body)
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { _raw: text }; }
  return { status: res.status, ok: res.ok, json, text };
}

function detectField(value) {
  const v = String(value || '').trim();
  if (!v) return { field: 'username', value: '' };
  if (v.includes('@')) return { field: 'email', value: v };
  if (/^\d+$/.test(v)) return { field: 'id', value: v };
  return { field: 'username', value: v };
}

async function login(username) {
  const det = detectField(username);
  const payload = { password: PASSWORD, [det.field]: det.value };
  const res = await api('Login', payload);
  const token = res.json && (res.json.token || res.json.access_token);
  return { ...res, token, field: det.field };
}

async function main() {
  console.log('=== Biz1 send flow test ===');
  console.log('Domain:', DOMAIN);
  console.log('User:', USERNAME);

  const loginRes = await login(USERNAME);
  console.log('\n[Login]', loginRes.status, loginRes.json?.message || loginRes.json?.error || '');
  if (!loginRes.token) {
    console.error('LOGIN FAILED — cannot continue.');
    process.exit(1);
  }
  console.log('Token OK, field used:', loginRes.field);

  const conv = await api('Chat.Conversations', { limit: 5, page: 1, start: 0 }, loginRes.token);
  const rows = conv.json?.data || conv.json?.rows || conv.json?.list || [];
  console.log('\n[Conversations]', conv.status, 'rows:', Array.isArray(rows) ? rows.length : 0);

  let customerId = '';
  let metaId = '';
  if (Array.isArray(rows) && rows.length) {
    const row = rows[0];
    customerId = String(row.customer_id || row.cust_id || row.contactus_id || '');
    metaId = String(row.messenger_meta_id || row.meta_id || '');
    console.log('Using first conversation:', row.name || row.user_name, 'customer_id=', customerId, 'meta=', metaId);
  }
  if (!customerId) {
    customerId = '1';
    console.log('No conversations — fallback customer_id=1');
  }

  const msg = 'automated test ' + new Date().toISOString().slice(11, 19);
  const sendBody = {
    msg: msg,
    message: msg,
    customer_id: customerId,
    cust_id: customerId,
    from: 'send_notes'
  };
  const send = await api('Chat.SendCustomer', sendBody, loginRes.token);
  const success = isBiz1SendCustomerSuccess(send.json) || isBiz1SendCustomerSuccess(send.text);
  console.log('\n[SendCustomer] HTTP', send.status, 'body:', JSON.stringify(send.json));
  console.log('isBiz1SendCustomerSuccess:', success);

  if (!success) {
    console.error('SEND TREATED AS FAILURE');
    process.exit(2);
  }
  console.log('\nPASS — message send success detected correctly.');
}

main().catch((err) => {
  console.error(err);
  process.exit(99);
});
