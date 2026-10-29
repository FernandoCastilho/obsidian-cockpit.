// Coleta TR, TBF e TLP (SGS do Banco Central) e grava public/indexadores.json. Rodado a cada hora pelo GitHub Actions.
import { mkdir, writeFile } from 'node:fs/promises'
import { loadPrevious } from './prev-lib.mjs'
import { INDEXADORES, buildIndexadores, fillSeriesFromPrevious, urlOf } from './indexadores-lib.mjs'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const errors = []

// O Banco Central responde 502/lento com frequência: várias tentativas.
async function getJson(url, label, tries = 4) {
  let last
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-indexadores)', accept: 'application/json' }, signal: AbortSignal.timeout(40000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (e) {
      last = e
      await sleep(2500 * i)
    }
  }
  errors.push(`${label}: ${last.message}`)
  return null
}

const results = {}
for (const [key, def] of Object.entries(INDEXADORES)) results[key] = await getJson(urlOf(def), `${key} (${def.source} ${def.code})`)
const out = fillSeriesFromPrevious(buildIndexadores(results, errors), await loadPrevious('indexadores.json'))
await mkdir(new URL('../public/', import.meta.url), { recursive: true })
await writeFile(new URL('../public/indexadores.json', import.meta.url), `${JSON.stringify(out)}\n`)
const fmt = (k) => (out.series[k] ? `${k} ${out.series[k].latest.value}${out.stale[k] ? ' (anterior)' : ''}` : `${k} indisponível`)
console.log(`Indexadores: ${Object.keys(INDEXADORES).map(fmt).join(' · ')}`)
if (errors.length) console.warn(errors.join('\n'))
