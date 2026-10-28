import { readFile, writeFile } from 'node:fs/promises'
import { loadPrevious } from './prev-lib.mjs'
import { BOJ_API, freightJpFile, parseBoj } from './freight-jp-lib.mjs'
const output = new URL('../public/freight-jp.json', import.meta.url), now = new Date().toISOString()
let local
try { local = JSON.parse(await readFile(output, 'utf8')) } catch { /* sem arquivo local */ }
const remote = await loadPrevious('freight-jp.json')
const previous = [local, remote].filter((f) => f?.series?.id === 'freight-jp-sppi' && f.series.points?.length).sort((a, b) => Date.parse(b.series.checkedAt) - Date.parse(a.series.checkedAt))[0]
let result
// Fonte mensal: no máximo uma consulta por dia, nunca uma por visitante.
if (previous && !previous.series.stale && Date.now() - Date.parse(previous.series.checkedAt) < 86400000) result = previous
else try {
  const all = []
  let position = null
  for (let page = 0; page < 10; page++) {
    const response = await fetch(position ? `${BOJ_API}&startPosition=${position}` : BOJ_API, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-coleta)' }, signal: AbortSignal.timeout(60000) })
    if (!response.ok) throw new Error(`BoJ HTTP ${response.status}`)
    const { points, next } = parseBoj(await response.json())
    all.push(...points)
    if (!next) break
    position = next
  }
  const merged = new Map((previous?.series.points ?? []).map((p) => [p.period, p]))
  for (const p of all) merged.set(p.period, p)
  const points = [...merged.values()].sort((a, b) => a.period.localeCompare(b.period))
  if (points.length < 24) throw new Error('Série do BoJ curta demais')
  if (previous && points.at(-1).period < previous.series.points.at(-1).period) throw new Error('BoJ retornou cobertura anterior à preservada')
  result = freightJpFile(points, now)
} catch (error) {
  result = previous ? { ...previous, series: { ...previous.series, stale: true, error: error.message } } : freightJpFile([], now, { stale: true, error: error.message })
}
await writeFile(output, JSON.stringify(result) + '\n')
console.log(`BoJ fretes Japão: ${result.series.points.length} meses; último ${result.series.points.at(-1)?.period || 'ausente'}; pendente=${!!result.series.stale}`)
