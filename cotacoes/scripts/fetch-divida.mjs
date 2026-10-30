import { readFile, writeFile } from 'node:fs/promises'
import { loadPrevious } from './prev-lib.mjs'
import { DIVIDA_CODES, DIVIDA_FROM, dividaApi, dividaFile, parseDivida } from './divida-lib.mjs'
import { windows } from './macro-lib.mjs'
const output = new URL('../public/divida.json', import.meta.url), now = new Date().toISOString()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let local
try { local = JSON.parse(await readFile(output, 'utf8')) } catch { /* sem arquivo local */ }
const remote = await loadPrevious('divida.json')
const previous = [local, remote].filter((f) => f?.series?.id === 'divida-bruta' && f.series.points?.length).sort((a, b) => Date.parse(b.series.checkedAt) - Date.parse(a.series.checkedAt))[0]
// O SGS responde 502/lento com frequência: várias tentativas.
async function getJson(url, tries = 5) {
  let last
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-coleta)', accept: 'application/json' }, signal: AbortSignal.timeout(30000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (e) { last = e; await sleep(2500 * i) }
  }
  throw last
}
// Série inteira, em janelas de até 10 anos (limite do SGS), na ordem; uma janela que falha derruba a coleta.
async function series(code) {
  let rows = []
  for (const [a, b] of windows(DIVIDA_FROM)) rows = rows.concat(await getJson(dividaApi(code, a, b)))
  return rows
}
let result
// Fonte mensal: no máximo uma consulta a cada 6 h, nunca uma por visitante.
if (previous && !previous.series.stale && Date.now() - Date.parse(previous.series.checkedAt) < 6 * 3600e3) result = previous
else try {
  const [pib, brl] = [await series(DIVIDA_CODES.pib), await series(DIVIDA_CODES.brl)]
  const points = parseDivida(pib, brl)
  if (previous && points.at(-1).period < previous.series.points.at(-1).period) throw new Error('SGS retornou cobertura anterior à preservada')
  result = dividaFile(points, now)
} catch (error) {
  result = previous ? { ...previous, series: { ...previous.series, stale: true, error: error.message } } : dividaFile([], now, { stale: true, error: error.message })
}
await writeFile(output, JSON.stringify(result) + '\n')
console.log(`Dívida bruta (BCB): ${result.series.points.length} meses; último ${result.series.points.at(-1)?.period || 'ausente'}; pendente=${!!result.series.stale}`)
