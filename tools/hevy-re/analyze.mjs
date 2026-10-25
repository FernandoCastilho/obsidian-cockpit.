// Reduz a captura a um esquema sem valores: endpoints, métodos, parâmetros e tipos dos campos.
// Uso: node analyze.mjs hevy-capture.ndjson > hevy-schema.md   (só este arquivo precisa ser compartilhado)
import { readFileSync } from 'node:fs';

const lines = readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const norm = (p) => p
  .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '{uuid}')
  .replace(/\/\d+(?=\/|$)/g, '/{id}');

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}
function shape(v, acc = {}, path = '$') {
  const t = typeOf(v);
  (acc[path] ??= new Set()).add(t);
  if (t === 'array') v.slice(0, 20).forEach((x) => shape(x, acc, path + '[]'));
  else if (t === 'object') for (const [k, x] of Object.entries(v)) shape(x, acc, `${path}.${k}`);
  return acc;
}
const merge = (a, b) => { for (const [k, s] of Object.entries(b)) { const d = (a[k] ??= new Set()); s.forEach((t) => d.add(t)); } return a; };

const eps = new Map();
for (const e of lines) {
  const key = `${e.method} ${e.host}${norm(e.path)}`;
  const ep = eps.get(key) ?? { n: 0, status: new Set(), query: new Set(), sections: new Set(), req: {}, res: {}, hdr: new Set() };
  ep.n++; ep.status.add(e.status); ep.sections.add(e.section);
  Object.keys(e.query ?? {}).forEach((q) => ep.query.add(q));
  Object.keys(e.reqHeaders ?? {}).filter((h) => /^(x-|api|authorization)/i.test(h)).forEach((h) => ep.hdr.add(h));
  if (e.reqBody && !e.reqBody._omitted) merge(ep.req, shape(e.reqBody));
  if (e.resBody && !e.resBody._omitted) merge(ep.res, shape(e.resBody));
  eps.set(key, ep);
}

const fmt = (acc) => Object.entries(acc).map(([k, s]) => `  - \`${k}\`: ${[...s].join(' | ')}`).join('\n') || '  - (vazio)';
console.log(`# Esquema capturado — ${lines.length} requisições, ${eps.size} endpoints\n`);
for (const [key, ep] of [...eps].sort()) {
  console.log(`## ${key}\n- chamadas: ${ep.n} · status: ${[...ep.status].join(', ')} · seções: ${[...ep.sections].join(', ')}`);
  if (ep.query.size) console.log(`- query: ${[...ep.query].map((q) => `\`${q}\``).join(', ')}`);
  if (ep.hdr.size) console.log(`- headers relevantes: ${[...ep.hdr].join(', ')}`);
  if (Object.keys(ep.req).length) console.log(`- request body:\n${fmt(ep.req)}`);
  if (Object.keys(ep.res).length) console.log(`- response body:\n${fmt(ep.res)}`);
  console.log();
}
