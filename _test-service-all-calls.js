/**
 * Service calls page: loader must clear, list/empty state must show, no stacked CTAs while loading.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.MB_BASE || 'http://localhost:8003';
const EMAIL = process.env.MB_EMAIL || 'service@mineral.co.il';
const PASS = process.env.MB_PASS || 'pass0364';
const OUT = path.join(__dirname, '_verify-out');

async function login(page) {
  await page.goto(BASE + '/login.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('#username', EMAIL);
  await page.fill('#password', PASS);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null),
    page.click('#loginBtn')
  ]);
  await page.waitForTimeout(1500);
  if (/login\.html/i.test(page.url())) await page.waitForTimeout(2500);
  if (/login\.html/i.test(page.url())) throw new Error('Login failed → ' + page.url());
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 424, height: 880 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));

  try {
    await login(page);
    const t0 = Date.now();
    await page.goto(BASE + '/service-all-calls.html?status=open', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.screen-card', { timeout: 20000 });

    await page.waitForFunction(() => {
      const boot = document.getElementById('mb-page-loader');
      const bootOn = !!(boot && window.getComputedStyle(boot).display !== 'none');
      const inline = Array.from(document.querySelectorAll('.mb-inline-loader')).some((el) => {
        const cs = window.getComputedStyle(el);
        return cs.display !== 'none' && el.offsetHeight > 8;
      });
      const text = document.body.innerText || '';
      const hasTickets = /#SRV-|narayan|test user/i.test(text);
      const hasEmpty = !!document.querySelector('.svc-calls-empty');
      return !bootOn && !inline && (hasTickets || hasEmpty);
    }, null, { timeout: 20000 });

    const elapsed = Date.now() - t0;
    const snap = await page.evaluate(() => {
      const text = document.body.innerText || '';
      const debug = !!document.getElementById('mb-socket-debug');
      const chip = !!document.getElementById('mb-sdk-chip');
      const inline = Array.from(document.querySelectorAll('.mb-inline-loader')).filter((el) => {
        const cs = window.getComputedStyle(el);
        return cs.display !== 'none' && el.offsetHeight > 8;
      }).length;
      const empty = (document.querySelector('.svc-calls-empty') || {}).textContent || '';
      const hasTickets = /#SRV-/i.test(text);
      const ctas = Array.from(document.querySelectorAll('button')).filter((b) =>
        /new ticket|Open a new service call|קריאה חדשה|פתיחת קריאת/i.test(b.textContent || '')
      ).map((b) => String(b.textContent || '').replace(/\s+/g, ' ').trim());
      return { debug, chip, inline, empty: String(empty).trim(), hasTickets, ctaCount: ctas.length, ctas };
    });

    await page.screenshot({ path: path.join(OUT, 'service-all-calls-after.png'), fullPage: true });

    if (snap.inline) throw new Error('inline loader still visible: ' + JSON.stringify(snap));
    if (snap.debug) throw new Error('socket debug overlay still visible');
    if (snap.chip) throw new Error('sdk debug chip still visible');
    if (elapsed > 16000) throw new Error('took too long to leave loading: ' + elapsed + 'ms');
    if (!snap.hasTickets && !snap.empty) throw new Error('no tickets and no empty state');
    if (snap.hasTickets && snap.ctaCount > 1) throw new Error('duplicate CTAs with list: ' + JSON.stringify(snap.ctas));

    const report = { ok: true, elapsedMs: elapsed, snap, pageErrors: errors };
    fs.writeFileSync(path.join(OUT, 'service-all-calls-report.json'), JSON.stringify(report, null, 2));
    console.log('PASS', 'elapsed=' + elapsed + 'ms', 'cards=' + snap.cards, 'ctas=' + snap.ctaCount, 'empty=' + JSON.stringify(snap.empty));
    await browser.close();
    process.exit(0);
  } catch (e) {
    await page.screenshot({ path: path.join(OUT, 'service-all-calls-fail.png'), fullPage: true }).catch(() => null);
    fs.writeFileSync(path.join(OUT, 'service-all-calls-report.json'), JSON.stringify({ ok: false, error: String(e.message || e), pageErrors: errors }, null, 2));
    console.error('FAIL', e && e.message ? e.message : e);
    await browser.close();
    process.exit(1);
  }
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
