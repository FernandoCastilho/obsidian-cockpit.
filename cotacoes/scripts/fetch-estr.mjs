import { readFile, writeFile } from 'node:fs/promises'
import { loadPrevious } from './prev-lib.mjs'
import { ESTR_API, estrFile, parseEstr } from './estr-lib.mjs'
const output = new URL('../public/estr.json', import.meta.url), now = new Date().toISOString()
let local
try { local = JSON.parse(await readFile(output, 'utf8')) } catch { /* sem arquivo local */ }
const remote = await loadPrevious('estr.json')
const previous = [local, remote].filter((f) => f?.series?.id === 'estr' && f.series.points?.length).sort((a, b) => Date.parse(b.series.checkedAt) - Date.parse(a.series.checkedAt))[0]
let result
try {
  const response = await fetch(ESTR_API, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-coleta)', accept: 'text/csv' }, signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`BCE HTTP ${response.status}`)
  const points = parseEstr(await response.text())
  if (previous && points.at(-1).date < previous.series.points.at(-1).date) throw new Error('BCE retornou cobertura anterior à preservada')
  result = estrFile(points, now)
} catch (error) {
  result = previous ? { ...previous, series: { ...previous.series, stale: true, error: error.message } } : estrFile([], now, { stale: true, error: error.message })
}
await writeFile(output, JSON.stringify(result) + '\n')
console.log(`€STR (BCE): ${result.series.points.length} dias; último ${result.series.points.at(-1)?.date || 'ausente'}; pendente=${!!result.series.stale}`)
