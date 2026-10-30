import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
const run = (f) => { const r = spawnSync('node', [`cotacoes/scripts/${f}`], { encoding: 'utf8', env: process.env, timeout: 280000 }); console.log('==', f, 'exit', r.status); console.log(r.stdout); console.log(r.stderr.slice(0, 1500)) }
run('fetch-commodities.mjs'); run('fetch-commodities-brl.mjs'); run('fetch-fuels.mjs')
for (const f of ['commodities', 'commodities-brl', 'fuels']) {
  const d = JSON.parse(readFileSync(`cotacoes/public/${f}.json`, 'utf8'))
  console.log('#', f, d.commodities.map(c => `${c.id}=${c.value}${c.stale ? '(stale:' + c.error + ')' : ''} h=${c.history?.length ?? 0} prev=${c.previousValue}`).join(' | '))
}
// produtos da aba BRASIL
const html = await (await fetch('https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas', { headers: { 'user-agent': 'Mozilla/5.0' } })).text()
const link = html.match(/href="([^"]*resumo_semanal_lpc_[^"]+\.xlsx)"/)[1]
const buf = Buffer.from(await (await fetch(new URL(link, 'https://www.gov.br'))).arrayBuffer())
const o = spawnSync('python3', ['cotacoes/scripts/read-pink-sheet.py', 'BRASIL'], { input: buf, encoding: 'utf8', maxBuffer: 50e6 })
const rows = JSON.parse(o.stdout); console.log('rows BRASIL', rows.length); console.log(JSON.stringify(rows.slice(8, 12))); console.log([...new Set(rows.map(r => r.C ?? r.E))].slice(0, 20))
