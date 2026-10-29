// Coleta as séries TFC e as moedas contratuais do BNDES (arquivos /Moedas/um<código>.txt) e grava public/moedas.json. Rodado a cada hora pelo GitHub Actions.
import { mkdir, writeFile } from 'node:fs/promises'
import { loadPrevious } from './prev-lib.mjs'
import { MOEDAS_CATALOG, buildMoedas, fillSeriesFromPrevious, moedaUrl } from './moedas-lib.mjs'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const errors = []

async function getText(url, label, tries = 3) {
  let last
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-moedas)', referer: 'https://www.bndes.gov.br/', accept: 'text/plain,*/*' }, signal: AbortSignal.timeout(40000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (e) {
      last = e
      await sleep(2000 * i)
    }
  }
  errors.push(`${label}: ${last.message}`)
  return null
}

const results = {}
for (const { id, name } of MOEDAS_CATALOG) results[id] = await getText(moedaUrl(id), `${id} (${name})`)
const out = fillSeriesFromPrevious(buildMoedas(results, errors), await loadPrevious('moedas.json'))
await mkdir(new URL('../public/', import.meta.url), { recursive: true })
await writeFile(new URL('../public/moedas.json', import.meta.url), `${JSON.stringify(out)}\n`)
const last = (id) => { const s = out.series[id]; return s ? `${id} ${s.points.at(-1)[1]}${out.stale[id] ? ' (anterior)' : ''}` : `${id} indisponível` }
console.log(`Moedas BNDES: ${MOEDAS_CATALOG.map((s) => last(s.id)).join(' · ')}`)
if (errors.length) console.warn(errors.join('\n'))
