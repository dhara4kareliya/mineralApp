/**
 * Login as sales/service/tech and count backend API POSTs per page.
 * Expect: each API method called once (or few) after open + idle — no timer bursts.
 */
const { chromium } = require('playwright');

const BASE = process.env.MB_BASE || 'http://localhost:8003';
const PASS = 'pass0364';
const ACCOUNTS = [
  {
    role: 'sales',
    email: 'sales@mineral.co.il',
    pages: [
      'sales-home.html',
      'sales-tasks.html',
      'customers.html',
      'leads-list.html',
      'calls-list.html'
    ]
  },
  {
    role: 'service',
    email: 'service@mineral.co.il',
    pages: [
      'service-all-calls.html?status=open',
      'service-inventory.html',
      'customers.html',
      'sales-tasks.html',
      'calls-list.html'
    ]
  },
  {
    role: 'tech',
    email: 'tech@mineral.co.il',
    pages: [
      'tech-time-clock.html',
      'tech-open-calls.html',
      'tech-daily-schedule.html',
      'tech-dashboard.html',
      'service-all-calls.html?status=open'
    ]
  }
];

function apiNameFromUrl(url) {
  try {
    const u = String(url || '');
    // Typical: .../TeamHours.List or action=TeamHours.List
    let m = u.match(/\/([A-Za-z]+\.[A-Za-z]+)\b/);
    if (m) return m[1];
    m = u.match(/[?&](?:action|method|cmd)=([A-Za-z]+\.[A-Za-z]+)/);
    if (m) return m[1];
    // path ends with api name
    m = u.match(/([A-Za-z]+\.[A-Za-z]+)(?:\?|$)/);
    if (m) return m[1];
    return u.split('/').pop().split('?')[0] || u;
  } catch (e) {
    return url;
  }
}

function summarize(counts) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return entries.map(([k, v]) => `${k}=${v}`).join(', ');
}

function findDuplicates(counts, maxOk) {
  maxOk = maxOk == null ? 1 : maxOk;
  return Object.entries(counts)
    .filter(([, n]) => n > maxOk)
    .sort((a, b) => b[1] - a[1]);
}

async function login(page, email) {
  await page.goto(BASE + '/login.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('#username', email);
  await page.fill('#password', PASS);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null),
    page.click('#loginBtn')
  ]);
  // OTP? wait a bit
  await page.waitForTimeout(1500);
  const otp = page.locator('#otp, input[name="otp"], #otpCode');
  if (await otp.count()) {
    console.log('  [warn] OTP screen appeared for', email);
  }
  // Ensure auth landed somewhere other than login
  const url = page.url();
  if (/login\.html/i.test(url)) {
    await page.waitForTimeout(2000);
  }
  if (/login\.html/i.test(page.url())) {
    throw new Error('Login failed / still on login for ' + email + ' → ' + page.url());
  }
  console.log('  logged in →', page.url());
}

async function measurePage(page, path) {
  const counts = Object.create(null);
  const posts = [];

  const onReq = async (req) => {
    if (req.method() !== 'POST') return;
    const url = req.url();
    if (/socket\.io/i.test(url)) return;
    if (!/bull36\.com/i.test(url)) return;
    let name = apiNameFromUrl(url);
    try {
      const data = req.postData() || '';
      const m = data.match(/"?(?:route|action|method|cmd)"?\s*[:=]\s*"([A-Za-z]+\.[A-Za-z]+)"/) ||
        data.match(/([A-Za-z]+\.[A-Za-z]+)/);
      // Prefer last path segment for mineral SDK style /app/.../TeamHours.List
      const pathName = name;
      if (pathName && /^[A-Za-z]+\.[A-Za-z]+$/.test(pathName)) name = pathName;
    } catch (e) { /* ignore */ }
    posts.push({ url, name, t: Date.now() });
    counts[name] = (counts[name] || 0) + 1;
  };

  page.on('request', onReq);
  const t0 = Date.now();
  await page.goto(BASE + '/' + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // Settle: initial load + no timer should mean quiet after ~4s
  await page.waitForTimeout(4500);
  const mid = { ...counts };
  // Watch for timer-driven extra calls
  await page.waitForTimeout(8000);
  page.off('request', onReq);

  // Try to refine names from POST bodies for last batch — can't easily redo.
  // Re-parse from URL is enough for mineral API style.

  const burst = findDuplicates(mid, 1);
  const idleExtra = {};
  Object.keys(counts).forEach((k) => {
    const d = counts[k] - (mid[k] || 0);
    if (d > 0) idleExtra[k] = d;
  });

  return {
    path,
    totalPosts: posts.length,
    counts,
    mid,
    burst,
    idleExtra,
    elapsedMs: Date.now() - t0
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = [];
  let failures = 0;

  for (const acc of ACCOUNTS) {
    console.log('\n===', acc.role, acc.email, '===');
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await login(page, acc.email);
    } catch (e) {
      console.error('LOGIN FAIL', acc.email, e.message);
      failures++;
      report.push({ role: acc.role, error: String(e.message) });
      await context.close();
      continue;
    }

    for (const p of acc.pages) {
      try {
        const r = await measurePage(page, p);
        const idleKeys = Object.keys(r.idleExtra);
        const badBurst = r.burst.filter(([, n]) => n >= 3); // 3+ same API on open = problem
        const status =
          idleKeys.length ? 'FAIL-TIMER' :
          badBurst.length ? 'FAIL-BURST' :
          r.burst.length ? 'WARN-DUP' : 'OK';
        if (status.startsWith('FAIL')) failures++;
        console.log(
          `  [${status}] ${p}  posts=${r.totalPosts}  APIs: ${summarize(r.counts) || '(none)'}` +
          (idleKeys.length ? `  | idle+ ${summarize(r.idleExtra)}` : '') +
          (badBurst.length ? `  | burst ${badBurst.map(([k, n]) => k + '=' + n).join(',')}` : '')
        );
        report.push({ role: acc.role, ...r, status });
      } catch (e) {
        failures++;
        console.error('  PAGE FAIL', p, e.message);
        report.push({ role: acc.role, path: p, error: String(e.message), status: 'FAIL' });
      }
    }
    await context.close();
  }

  await browser.close();
  console.log('\n==== SUMMARY ====');
  console.log('failures=', failures);
  const fs = require('fs');
  fs.writeFileSync('api-check-report.json', JSON.stringify(report, null, 2));
  console.log('wrote api-check-report.json');
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
