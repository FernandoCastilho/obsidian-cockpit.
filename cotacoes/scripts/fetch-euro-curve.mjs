import { readFile, writeFile } from 'node:fs/promises'
import { loadPrevious } from './prev-lib.mjs'
import { euroCurveApi, euroCurveFile, parseEuroCurve } from './euro-curve-lib.mjs'
const output = new URL('../public/euro-curve.json', import.meta.url), now = new Date().toISOString()
let local
try { local = JSON.parse(await readFile(output, 'utf8')) } catch { /* sem arquivo local */ }
const remote = await loadPrevious('euro-curve.json')
const previous = [local, remote].filter((f) => f?.curve?.id === 'euro-curve' && f.curve.compare?.length).sort((a, b) => Date.parse(b.curve.checkedAt) - Date.parse(a.curve.checkedAt))[0]
let result
try {
  const start = new Date(Date.now() - 380 * 864e5).toISOString().slice(0, 10) // cobre a comparação de 1 ano
  const response = await fetch(euroCurveApi(start), { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-coleta)', accept: 'text/csv' }, signal: AbortSignal.timeout(45000) })
  if (!response.ok) throw new Error(`BCE HTTP ${response.status}`)
  const all = parseEuroCurve(await response.text())
  const file = euroCurveFile(all, now)
  if (previous && file.curve.sourceDate < previous.curve.sourceDate) throw new Error('BCE retornou data anterior à preservada')
  result = file
} catch (error) {
  result = previous ? { ...previous, curve: { ...previous.curve, stale: true, error: error.message } } : euroCurveFile({}, now, { stale: true, error: error.message })
}
await writeFile(output, JSON.stringify(result) + '\n')
console.log(`Curva do euro (BCE): referência ${result.curve.sourceDate || 'ausente'}; ${result.curve.compare.length} datas; pendente=${!!result.curve.stale}`)
