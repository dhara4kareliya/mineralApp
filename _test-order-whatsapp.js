/**
 * Order document: Biz1 WhatsApp send, then internal-note fallback.
 * Chat.SendCustomer is intercepted — no real WhatsApp is sent.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.MB_BASE || 'http://localhost:8003';
const EMAIL = process.env.MB_EMAIL || 'service@mineral.co.il';
const PASS = process.env.MB_PASS || 'pass0364';
const OUT = path.join(__dirname, '_verify-out');

const ORDER_URL =
  '/order-document.html?customer_id=13765521&amount=456&name=test+user+6&phone=753516548&tz=13765521' +
  '&payment_method=cash&installments=1&receipt_id=649219' +
  '&pdf_url=' + encodeURIComponent('https://files.biz1.co.il/biz1upload/invoice_docs/receipt-20-13765521-20.08.2026-1787218550-649219.pdf');

function parseBody(post) {
  const p = new URLSearchParams(post || '');
  const out = {};
  p.forEach((v, k) => { out[k] = v; });
  return out;
}

function jsonReply(obj) {
  return {
    status: 200,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(obj)
  };
}

async function login(page) {
  await page.goto(BASE + '/login.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('#username', EMAIL);
  await page.fill('#password', PASS);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null),
    page.click('#loginBtn')
  ]);
  await page.waitForTimeout(1500);
  if (/login\.html/i.test(page.url())) {
    await page.waitForTimeout(2500);
  }
  if (/login\.html/i.test(page.url())) {
    throw new Error('Login failed → ' + page.url());
  }
}

async function openOrder(page) {
  await page.addInitScript(() => {
    window.__openedUrls = [];
    const orig = window.open;
    window.open = function (url) {
      window.__openedUrls.push(String(url || ''));
      return { close: function () {}, focus: function () {} };
    };
    window.__origOpen = orig;
  });
  await page.goto(BASE + ORDER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#od-send-whatsapp', { timeout: 20000 });
  await page.waitForFunction(() => {
    return window.MineralBarApp && typeof window.MineralBarApp.sendCustomerMessage === 'function';
  }, null, { timeout: 20000 });
  await page.waitForTimeout(800);
}

async function toastText(page) {
  return page.evaluate(() => {
    var nodes = Array.prototype.slice.call(document.querySelectorAll('span, div'));
    var hits = nodes.map(function (n) { return String(n.textContent || '').trim(); }).filter(function (t) {
      return /נשלח|הערה פנימית|WhatsApp send failed|Document sent|לא ניתן|נכשלה/.test(t) && t.length < 220;
    });
    return hits[0] || '';
  });
}

async function openedUrls(page) {
  try {
    return await page.evaluate(() => window.__openedUrls || []);
  } catch (e) {
    return ['<page-gone>'];
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = { checks: {}, cases: [] };
  let failures = 0;

  async function runCase(name, mode) {
    const context = await browser.newContext({ viewport: { width: 424, height: 880 } });
    const page = await context.newPage();
    const captured = [];
    const popups = [];
    page.on('popup', (p) => { popups.push(p.url()); });

    await page.route(/Chat\.SendCustomer/, async (route) => {
      const body = parseBody(route.request().postData());
      captured.push({
        from: body.from || '',
        customer_id: body.customer_id || body.cust_id || '',
        phone: body.phone || body.chart_selected_phone_no || '',
        message: body.message || body.msg || ''
      });
      const from = body.from || '';
      if (mode === 'wa-ok') {
        await route.fulfill(jsonReply({ success: 1, message: 'נשלח' }));
        return;
      }
      if (mode === 'wa-fail-notes-ok') {
        if (from === 'send_whatsapp') {
          await route.fulfill(jsonReply({ success: 0, message: 'שליחת וואטסאפ נכשלה' }));
          return;
        }
        await route.fulfill(jsonReply({ success: 1, message: 'ההערה נוספה' }));
        return;
      }
      await route.fulfill(jsonReply({ success: 0, message: 'שליחת הודעה נכשלה' }));
    });

    const caseResult = { name, mode, captured, toast: '', opened: [], popups, ok: false, error: '' };
    try {
      await login(page);
      await openOrder(page);
      await page.screenshot({ path: path.join(OUT, name + '-before.png'), fullPage: true });
      await page.click('#od-send-whatsapp');
      await page.waitForTimeout(900);
      caseResult.toast = await toastText(page);
      caseResult.opened = await openedUrls(page);
      await page.screenshot({ path: path.join(OUT, name + '-after.png'), fullPage: true }).catch(() => null);

      const froms = captured.map((c) => c.from);
      const waMe = (caseResult.opened || []).concat(popups).some((u) => /wa\.me/i.test(String(u)));
      const hasPdf = captured.some((c) => /files\.biz1|649219|\.pdf/i.test(c.message));
      const hasCustomer = captured.every((c) => String(c.customer_id) === '13765521');

      if (mode === 'wa-ok') {
        if (froms[0] !== 'send_whatsapp') throw new Error('expected first send_whatsapp, got ' + JSON.stringify(froms));
        if (froms.indexOf('send_notes') !== -1) throw new Error('notes should not run on WhatsApp success');
        if (!/נשלח|Document sent|WhatsApp/i.test(caseResult.toast)) throw new Error('missing success toast: ' + caseResult.toast);
      } else if (mode === 'wa-fail-notes-ok') {
        if (froms[0] !== 'send_whatsapp') throw new Error('expected WhatsApp attempt first, got ' + JSON.stringify(froms));
        if (froms[1] !== 'send_notes') throw new Error('expected send_notes fallback, got ' + JSON.stringify(froms));
        if (!/הערה פנימית|internal note/i.test(caseResult.toast)) throw new Error('missing note toast: ' + caseResult.toast);
        if (!/שליחת וואטסאפ נכשלה|WhatsApp send failed/i.test(captured[1].message)) {
          throw new Error('note body missing fail prefix: ' + captured[1].message.slice(0, 120));
        }
      }
      if (waMe) throw new Error('wa.me was opened: ' + JSON.stringify(caseResult.opened.concat(popups)));
      if (!hasCustomer) throw new Error('customer_id missing in payload');
      if (!hasPdf) throw new Error('PDF/order link missing from message');

      caseResult.ok = true;
      console.log('PASS', name, 'froms=' + froms.join(' → '), 'toast=' + caseResult.toast);
    } catch (e) {
      failures++;
      caseResult.error = e && e.message ? e.message : String(e);
      console.error('FAIL', name, caseResult.error);
      await page.screenshot({ path: path.join(OUT, name + '-fail.png'), fullPage: true }).catch(() => null);
    }

    report.cases.push(caseResult);
    await context.close();
  }

  try {
    await runCase('wa-success', 'wa-ok');
    await runCase('wa-fail-to-note', 'wa-fail-notes-ok');
  } finally {
    await browser.close();
  }

  report.checks.whatsappSuccessSendsWhatsappOnly = !!(report.cases[0] && report.cases[0].ok);
  report.checks.whatsappFailSavesInternalNote = !!(report.cases[1] && report.cases[1].ok);
  report.checks.neverOpenedWaMe = report.cases.every((c) => {
    const urls = (c.opened || []).concat(c.popups || []);
    return !urls.some((u) => /wa\.me/i.test(String(u)));
  });
  report.failures = failures;

  fs.writeFileSync(path.join(OUT, 'order-whatsapp-report.json'), JSON.stringify(report, null, 2));
  console.log('\n==== ORDER WHATSAPP TEST ====');
  console.log('failures=', failures);
  console.log('wrote', path.join(OUT, 'order-whatsapp-report.json'));
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
