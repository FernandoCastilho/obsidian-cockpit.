// Coleta a TFB (BNDES, 4 prazos x liberação em 30 e 90 dias) e grava public/bndes.json. Rodado a cada hora pelo GitHub Actions.
import { mkdir, writeFile } from 'node:fs/promises'
import { loadPrevious } from './prev-lib.mjs'
import { BNDES_SERIES, buildBndes, fillSeriesFromPrevious, txtUrl } from './bndes-lib.mjs'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const errors = []

async function getText(url, label, tries = 3) {
  let last
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-bndes)', referer: 'https://www.bndes.gov.br/', accept: 'text/plain,*/*' }, signal: AbortSignal.timeout(40000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (e) {
      last = e
      await sleep(2500 * i)
    }
  }
  errors.push(`${label}: ${last.message}`)
  return null
}

const results = {}
for (const { key } of BNDES_SERIES) results[key] = await getText(txtUrl(key), key)
const out = fillSeriesFromPrevious(buildBndes(results, errors), await loadPrevious('bndes.json'))
await mkdir(new URL('../public/', import.meta.url), { recursive: true })
await writeFile(new URL('../public/bndes.json', import.meta.url), `${JSON.stringify(out)}\n`)
const fmt = (k) => { const s = out.series[k]; return s ? `${k} ${s.points.at(-1)[1]}${out.stale[k] ? ' (anterior)' : ''}` : `${k} indisponível` }
console.log(`BNDES TFB: ${BNDES_SERIES.map((s) => fmt(s.key)).join(' · ')}`)
if (errors.length) console.warn(errors.join('\n'))
