import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
const r = spawnSync('node', ['cotacoes/scripts/fetch-reforma.mjs'], { encoding: 'utf8', env: process.env, timeout: 120000 })
console.log('exit', r.status); console.log(r.stdout); console.log(r.stderr.slice(0, 1500))
const d = JSON.parse(readFileSync('cotacoes/public/reforma-tributaria.json', 'utf8'))
console.log('itens', d.items.length, 'stale', d.stale)
const by = {}; for (const i of d.items) { const k = new Date(i.t).toISOString().slice(0, 10); by[k] = (by[k] ?? 0) + 1 }
console.log('por dia', JSON.stringify(by))
console.log('veículos', JSON.stringify(Object.entries(d.items.reduce((a, i) => (a[i.source] = (a[i.source] ?? 0) + 1, a), {})).slice(0, 400)))
for (const i of d.items.slice(0, 12)) console.log(new Date(i.t).toISOString(), '|', i.source, '|', i.title)
