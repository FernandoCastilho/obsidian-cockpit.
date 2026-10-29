import { readFile, writeFile } from 'node:fs/promises'
import { loadPrevious } from './prev-lib.mjs'
import { IPCA_GROUPS_API, ipcaGroupsFile, parseIpcaGroups } from './ipca-groups-lib.mjs'
const output = new URL('../public/ipca-groups.json', import.meta.url), now = new Date().toISOString()
let local
try { local = JSON.parse(await readFile(output, 'utf8')) } catch { /* sem arquivo local */ }
const remote = await loadPrevious('ipca-groups.json')
const previous = [local, remote].filter((f) => f?.series?.id === 'ipca-groups' && f.series.groups?.length).sort((a, b) => Date.parse(b.series.checkedAt) - Date.parse(a.series.checkedAt))[0]
let result
// Fonte mensal: no máximo uma consulta a cada 6 h, nunca uma por visitante.
if (previous && !previous.series.stale && Date.now() - Date.parse(previous.series.checkedAt) < 6 * 3600e3) result = previous
else try {
  const response = await fetch(IPCA_GROUPS_API, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-coleta)' }, signal: AbortSignal.timeout(60000) })
  if (!response.ok) throw new Error(`SIDRA HTTP ${response.status}`)
  const parsed = parseIpcaGroups(await response.json())
  if (previous && parsed.periods.at(-1) < previous.series.periods.at(-1)) throw new Error('SIDRA retornou cobertura anterior à preservada')
  result = ipcaGroupsFile(parsed, now)
} catch (error) {
  result = previous ? { ...previous, series: { ...previous.series, stale: true, error: error.message } } : ipcaGroupsFile(null, now, { stale: true, error: error.message })
}
await writeFile(output, JSON.stringify(result) + '\n')
console.log(`IPCA por grupos (IBGE): ${result.series.groups.length} grupos; último ${result.series.periods.at(-1) || 'ausente'}; pendente=${!!result.series.stale}`)
