import { readFile, writeFile } from 'node:fs/promises'
import { loadPrevious } from './prev-lib.mjs'
import { IPCA_API, ipcaFile, parseIpca } from './ipca-lib.mjs'
const output = new URL('../public/ipca.json', import.meta.url), now = new Date().toISOString()
let local
try { local = JSON.parse(await readFile(output, 'utf8')) } catch { /* sem arquivo local */ }
const remote = await loadPrevious('ipca.json')
const previous = [local, remote].filter((f) => f?.series?.id === 'ipca' && f.series.points?.length).sort((a, b) => Date.parse(b.series.checkedAt) - Date.parse(a.series.checkedAt))[0]
let result
// Fonte mensal: no máximo uma consulta a cada 6 h, nunca uma por visitante.
if (previous && !previous.series.stale && Date.now() - Date.parse(previous.series.checkedAt) < 6 * 3600e3) result = previous
else try {
  const response = await fetch(IPCA_API, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-coleta)' }, signal: AbortSignal.timeout(60000) })
  if (!response.ok) throw new Error(`SIDRA HTTP ${response.status}`)
  const points = parseIpca(await response.json())
  if (previous && points.at(-1).period < previous.series.points.at(-1).period) throw new Error('SIDRA retornou cobertura anterior à preservada')
  result = ipcaFile(points, now)
} catch (error) {
  result = previous ? { ...previous, series: { ...previous.series, stale: true, error: error.message } } : ipcaFile([], now, { stale: true, error: error.message })
}
await writeFile(output, JSON.stringify(result) + '\n')
console.log(`IPCA (IBGE): ${result.series.points.length} meses; último ${result.series.points.at(-1)?.period || 'ausente'}; pendente=${!!result.series.stale}`)
