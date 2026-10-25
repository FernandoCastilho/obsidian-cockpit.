// Captura de rede do app web do Hevy com login manual.
// Uso: npm i playwright && npx playwright install chromium && node capture.mjs [saida.ndjson]
// Escrita (POST/PUT/PATCH/DELETE) em hosts do Hevy é bloqueada, salvo login/token e confirmação "s" no terminal.
import { chromium } from 'playwright';
import { createWriteStream } from 'node:fs';
import readline from 'node:readline';

const OUT = process.argv[2] ?? 'hevy-capture.ndjson';
const HOST_RE = /(^|\.)(hevy\.com|hevyapp\.com)$/i;
const AUTH_PATH_RE = /\/(login|logout|auth|token|refresh|session|oauth)/i;
const SECRET_KEY_RE = /pass|token|secret|authorization|cookie|api[-_]?key|csrf|xsrf|session/i;
const MAX_BODY = 200_000;

const out = createWriteStream(OUT, { flags: 'a' });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let section = 'inicio';
const ask = (q) => new Promise((r) => rl.question(q, r));

function maskHeaders(h) {
  return Object.fromEntries(Object.entries(h).map(([k, v]) => [k, SECRET_KEY_RE.test(k) ? '***' : v]));
}
function maskJson(v) {
  if (Array.isArray(v)) return v.map(maskJson);
  if (v && typeof v === 'object')
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SECRET_KEY_RE.test(k) ? '***' : maskJson(x)]));
  return v;
}
function parseBody(text, type = '') {
  if (!text) return null;
  if (text.length > MAX_BODY) return { _truncated: true, _bytes: text.length };
  if (/json/i.test(type) || /^\s*[\[{]/.test(text)) {
    try { return maskJson(JSON.parse(text)); } catch { /* cai para texto */ }
  }
  return { _nonJson: true, _bytes: text.length };
}

const context = await (await chromium.launch({ headless: false })).newContext();

await context.route('**/*', async (route) => {
  const req = route.request();
  const u = new URL(req.url());
  const write = !['GET', 'HEAD', 'OPTIONS'].includes(req.method());
  if (!write || !HOST_RE.test(u.hostname) || AUTH_PATH_RE.test(u.pathname)) return route.continue();
  const ans = (await ask(`\n[ESCRITA] ${req.method()} ${u.host}${u.pathname} — permitir? (s/N) `)).trim().toLowerCase();
  return ans === 's' ? route.continue() : route.abort('blockedbyclient');
});

context.on('response', async (res) => {
  const req = res.request();
  const u = new URL(req.url());
  if (!HOST_RE.test(u.hostname) || !['xhr', 'fetch', 'document'].includes(req.resourceType())) return;
  const isAuth = AUTH_PATH_RE.test(u.pathname);
  let resBody = null;
  try { resBody = isAuth ? { _omitted: 'auth' } : parseBody(await res.text(), res.headers()['content-type']); } catch { /* sem corpo */ }
  const reqBody = isAuth ? { _omitted: 'auth' } : parseBody(req.postData(), req.headers()['content-type']);
  out.write(JSON.stringify({
    t: new Date().toISOString(), section, method: req.method(), host: u.host, path: u.pathname,
    query: Object.fromEntries(u.searchParams), status: res.status(), type: req.resourceType(),
    reqHeaders: maskHeaders(req.headers()), reqBody, resBody,
  }) + '\n');
});

const page = await context.newPage();
await page.goto('https://hevy.com');
console.log(`Faça login manualmente no navegador (a senha não passa por este script).
Depois navegue e, a cada área nova, digite o rótulo aqui e Enter (perfil, historico, rotinas, exercicios, graficos, config).
Digite "sair" para encerrar. Saída: ${OUT}`);

for await (const line of rl) {
  const s = line.trim();
  if (s === 'sair') break;
  if (s) { section = s; console.log(`> seção: ${section}`); }
}
out.end();
await context.browser().close();
process.exit(0);
