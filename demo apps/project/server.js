/**
 * Static demo server + live dashboard project bridge.
 * Use when PHP is not available: node server.js
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8004);
const sessions = new Map();

function send(res, code, obj, extraHeaders) {
  const body = JSON.stringify(obj);
  const headers = Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  }, extraHeaders || {});
  if (res._dashCookie && !headers['Set-Cookie']) headers['Set-Cookie'] = res._dashCookie;
  res.writeHead(code, headers);
  res.end(body);
}

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i === -1) return;
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  });
  return out;
}

function sidFrom(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  let sid = cookies.biz1dash || '';
  if (!sid || !sessions.has(sid)) {
    sid = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2);
    sessions.set(sid, { cookie: '', domain: '' });
    res._dashCookie = 'biz1dash=' + sid + '; Path=/; HttpOnly; SameSite=Lax';
  }
  return sid;
}

function assertDomain(domain) {
  domain = String(domain || '').trim();
  if (!domain) throw new Error('Dashboard domain is missing');
  if (!/^https:\/\//i.test(domain)) domain = 'https://' + domain.replace(/^https?:\/\//i, '');
  domain = domain.replace(/\/+$/, '');
  const host = new URL(domain).hostname;
  if (!/^[a-z0-9-]+\.bull36\.com$/i.test(host)) throw new Error('Invalid dashboard host');
  return domain;
}

function requestJson(method, urlStr, { cookie, fields }) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const parts = [];
    Object.keys(fields || {}).forEach((key) => {
      const value = fields[key];
      if (Array.isArray(value)) {
        value.forEach((item) => {
          parts.push(encodeURIComponent(key) + '[]=' + encodeURIComponent(String(item)));
        });
      } else if (value !== undefined && value !== null) {
        parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(value)));
      }
    });
    const body = parts.join('&');
    const req = https.request({
      method,
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': Buffer.byteLength(body),
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        ...(cookie ? { Cookie: cookie } : {})
      }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const setCookie = res.headers['set-cookie'] || [];
        const ci = (setCookie.join('; ').match(/ci_session=[^;]+/) || [null])[0];
        resolve({
          status: res.statusCode,
          text: Buffer.concat(chunks).toString('utf8'),
          cookie: ci || cookie || '',
          location: res.headers.location || ''
        });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function decodeJson(text) {
  try { return JSON.parse(text); } catch (e) {
    if (/dashboard\/login/i.test(text)) {
      const err = new Error('Dashboard session expired');
      err.code = 'dashboard_auth';
      throw err;
    }
    throw new Error('Dashboard did not return JSON');
  }
}

function textOf(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function attr(tag, name) {
  const re = new RegExp(name + '="([^"]*)"', 'i');
  const m = String(tag || '').match(re);
  return m ? m[1] : '';
}

function parseProjectsHtml(html) {
  const rows = [];
  const blocks = String(html || '').split(/<tr\b/i).slice(1);
  blocks.forEach((block) => {
    const rowHtml = '<tr' + block.split(/<\/tr>/i)[0] + '</tr>';
    const className = attr(rowHtml, 'class');
    const idMatch = className.match(/main_project_(\d+)/);
    const id = idMatch ? idMatch[1] : (attr(rowHtml, 'data_id') || attr(rowHtml, 'data-id'));
    if (!id) return;
    const nameM = rowHtml.match(/projjjk_name[^>]*>([\s\S]*?)<\/span>/i);
    const clientM = rowHtml.match(/projjjk_cust_name[^>]*>([\s\S]*?)<\/span>/i);
    const badgeM = rowHtml.match(/badge_style[^>]*>([\s\S]*?)<\/span>/i);
    const tds = rowHtml.split(/<td\b/i).slice(1).map((td) => td.split(/<\/td>/i)[0]);
    let date = textOf(tds[3] || '');
    const dm = date.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dm) date = dm[3] + '-' + String(dm[2]).padStart(2, '0') + '-' + String(dm[1]).padStart(2, '0');
    const testing = Number((rowHtml.match(/project_count_data testing[^>]*>([^<]*)/i) || ['', '0'])[1]) || 0;
    const queries = Number((rowHtml.match(/project_count_data queries[^>]*>([^<]*)/i) || ['', '0'])[1]) || 0;
    const todo = Number((rowHtml.match(/project_count_data to_do[^>]*>([^<]*)/i) || ['', '0'])[1]) || 0;
    const team = [];
    const teamTd = tds[2] || '';
    const seen = {};
    String(teamTd).replace(/<[^>]+>/g, (tag) => {
      const mid = attr(tag, 'data_id') || attr(tag, 'data-id');
      const mname = attr(tag, 'original-title') || attr(tag, 'title');
      if (!mid && !mname) return tag;
      const key = mid || mname;
      if (seen[key]) return tag;
      seen[key] = true;
      team.push({ id: String(mid || ''), name: mname || ('#' + mid) });
      return tag;
    });
    const name = textOf(nameM ? nameM[1] : '') || ('#' + id);
    const client = textOf(clientM ? clientM[1] : '');
    const statusLabel = textOf(badgeM ? badgeM[1] : '');
    const open = testing + queries + todo;
    rows.push({
      id: String(id), project_id: String(id), name, project_name: name,
      client_name: client, customer_name: client,
      created_at: date, c_date: date, start_date: date,
      status: statusLabel, status_label: statusLabel, status_name: statusLabel,
      testing, queries, to_do: todo, open_items: open, open,
      team, team_members: team
    });
  });
  return rows;
}

function lastPage(html) {
  let max = 1;
  String(html || '').replace(/data-ci-pagination-page="(\d+)"/g, (_, n) => {
    max = Math.max(max, Number(n));
    return _;
  });
  return max;
}

async function handleBridge(req, res, input) {
  const sid = sidFrom(req, res);
  const sess = sessions.get(sid) || { cookie: '', domain: '' };
  const action = String(input.action || '');
  let domain = sess.domain;
  if (input.domain) {
    domain = assertDomain(input.domain);
    sess.domain = domain;
    sessions.set(sid, sess);
  }

  if (action === 'status') {
    return send(res, 200, { ok: !!sess.ok, domain: domain || '' });
  }
  if (action === 'logout') {
    sessions.set(sid, { cookie: '', domain: '', ok: false });
    return send(res, 200, { ok: true });
  }
  if (action === 'login') {
    domain = assertDomain(domain || input.domain);
    const email = String(input.email || input.username || '').trim();
    const password = String(input.password || '');
    if (!email || !password) return send(res, 400, { ok: false, message: 'Email and password are required' });
    const login = await requestJson('POST', domain + '/dashboard/login/check_login', {
      fields: { email, password }
    });
    const json = decodeJson(login.text);
    const ok = json.success && String(json.success) !== '0';
    sess.ok = ok;
    sess.domain = domain;
    sess.cookie = login.cookie;
    sessions.set(sid, sess);
    if (!ok) return send(res, 401, { ok: false, message: json.message || 'Dashboard login failed', raw: json });
    return send(res, 200, { ok: true, message: json.message || 'ok' });
  }
  if (!domain) return send(res, 401, { ok: false, error: 'dashboard_auth', message: 'Dashboard is not connected' });

  async function dash(pathName, fields) {
    const out = await requestJson('POST', domain + pathName, { cookie: sess.cookie, fields });
    if (out.cookie) { sess.cookie = out.cookie; sessions.set(sid, sess); }
    if (out.status === 302) {
      const err = new Error('Dashboard session expired');
      err.code = 'dashboard_auth';
      throw err;
    }
    return decodeJson(out.text);
  }

  if (action === 'list') {
    const search = String(input.search || input.search_project_name || '').trim();
    const team = String(input.team_member_id || input.search_team_member || '').trim();
    const wantAll = !input.page_id;
    const startPage = Math.max(1, Number(input.page_id || 1));
    const all = [];
    let current = wantAll ? 1 : startPage;
    const maxPage = wantAll ? 40 : startPage;
    while (current <= maxPage) {
      const fields = { page_id: current };
      if (search) { fields.search_project_name = search; fields.search = search; }
      if (team) fields.search_team_member = team;
      const json = await dash('/dashboard/project/load_project_html_new', fields);
      const chunk = parseProjectsHtml(json.html || '');
      all.push.apply(all, chunk);
      if (!wantAll) break;
      const last = lastPage(json.paggination_html || '');
      if (current >= last || chunk.length === 0) break;
      current += 1;
    }
    return send(res, 200, { ok: true, success: 1, rows: all, data: all, count: all.length, total: all.length });
  }
  if (action === 'get') {
    const json = await dash('/dashboard/project/get_project', { id: String(input.id || input.project_id || '') });
    return send(res, 200, Object.assign({ ok: !!json.success }, json));
  }
  if (action === 'save') {
    const name = String(input.project_name || input.name || '');
    if (!name) return send(res, 400, { ok: false, message: 'Project name is required' });
    let members = input.organizations_user || input.team_member_ids || [];
    if (typeof members === 'string') members = members.split(',').map((s) => s.trim()).filter(Boolean);
    const json = await dash('/dashboard/project/save_project', {
      project_name: name,
      project_id: String(input.project_id || input.id || '0'),
      client_id: String(input.client_id || input.customer_id || '0'),
      credentials: String(input.credentials || ''),
      note: String(input.note || ''),
      tags: Array.isArray(input.tags) ? input.tags.join(',') : String(input.tags || ''),
      organizations_user: Array.isArray(members) ? members : []
    });
    const ok = !!json.success;
    return send(res, ok ? 200 : 400, Object.assign({ ok, id: json.success || null }, json));
  }
  if (action === 'delete') {
    const id = String(input.id || input.project_id || input.data_id || '');
    const userId = String(input.user_id || input.self_id || '').trim();
    if (!id || !userId) {
      return send(res, 400, { ok: false, message: 'Project id and user id are required to delete' });
    }
    const json = await dash('/dashboard/project/delete_project', {
      data_id: id,
      user_id: userId
    });
    const ok = Number(json.success) >= 1;
    return send(res, ok ? 200 : 400, Object.assign({ ok }, json));
  }
  return send(res, 400, { ok: false, message: 'Unknown action' });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const file = path.normalize(path.join(ROOT, urlPath.replace(/^\/+/, '')));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  if (req.method === 'POST' && (urlPath === '/dash-bridge.php' || urlPath === '/dash-bridge')) {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      let input = {};
      const raw = Buffer.concat(chunks).toString('utf8');
      try { input = raw ? JSON.parse(raw) : {}; } catch (e) {
        input = Object.fromEntries(new URLSearchParams(raw));
      }
      handleBridge(req, res, input).catch((err) => {
        const code = err.code === 'dashboard_auth' ? 401 : 500;
        send(res, code, { ok: false, error: err.code || '', message: err.message || 'Bridge failed' });
      });
    });
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Projects demo: http://127.0.0.1:' + PORT + '/index.html');
});
