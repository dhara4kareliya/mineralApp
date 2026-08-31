import { chromium } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.resolve(__dirname, '..');
const PORT = 8765;
const USER = process.env.BIZ1_USER || 'sales@mineral.co.il';
const PASS = process.env.BIZ1_PASSWORD || 'pass0364';

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost:' + PORT);
      let filePath = path.join(ROOT, decodeURIComponent(url.pathname));
      if (url.pathname === '/') filePath = path.join(ROOT, 'login.html');
      if (!filePath.startsWith(ROOT)) {
        res.writeHead(403); res.end('Forbidden'); return;
      }
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        res.writeHead(404); res.end('Not found'); return;
      }
      res.writeHead(200, { 'Content-Type': contentType(filePath) });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(PORT, () => resolve(server));
  });
}

(async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const apiLog = [];

  page.on('response', async (res) => {
    const url = res.url();
    if (!url.includes('/app/')) return;
    let body = '';
    try { body = await res.text(); } catch {}
    apiLog.push({ url, status: res.status(), body: body.slice(0, 500) });
  });

  try {
    await page.goto('http://localhost:' + PORT + '/login.html', { waitUntil: 'networkidle' });
    await page.fill('#username', USER);
    await page.fill('#password', PASS);
    await page.click('#loginBtn');
    await page.waitForTimeout(5000);

    const url = page.url();
    const errText = await page.locator('#errorText').textContent().catch(() => '');
    console.log('After login URL:', url);
    console.log('Error box:', errText || '(none)');

    const loginCalls = apiLog.filter((x) => x.url.includes('/app/Login'));
    console.log('\nLogin API calls:');
    loginCalls.forEach((c) => console.log(c.status, c.body));

    if (url.includes('conversation.html') || url.includes('chat.html')) {
      console.log('\nLOGIN OK — opening chat...');
      if (!url.includes('chat.html')) {
        const first = page.locator('.msg-row, .inbox-row, [data-customer-id]').first();
        if (await first.count()) {
          await first.click();
          await page.waitForTimeout(3000);
        }
      }
      const input = page.locator('#mb-chat-input');
      if (await input.count()) {
        const testMsg = 'playwright test ' + Date.now();
        await input.fill(testMsg);
        await page.locator('#mb-chat-send').click();
        await page.waitForTimeout(4000);
        const errorNotice = await page.locator('.chat-notice--error').textContent().catch(() => '');
        const status = await page.locator('#mb-chat-status').textContent().catch(() => '');
        console.log('Send status:', status);
        console.log('Error notice:', errorNotice || '(none)');
        if (errorNotice && /send failed|שליחה נכשלה/i.test(errorNotice)) {
          console.log('\nFAIL — Send failed shown in UI');
          process.exitCode = 2;
        } else {
          console.log('\nPASS — no send error in UI');
        }
      } else {
        console.log('Chat input not found on page');
      }
    } else {
      console.log('\nLOGIN FAILED in browser');
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
    server.close();
  }
})();
