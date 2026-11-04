import { readFile, writeFile } from 'node:fs/promises'
import { loadPrevious } from './prev-lib.mjs'
import { CREDIT_SERIES, parseCredit } from '../src/inadimplencia.js'
const output = new URL('../public/inadimplencia.json', import.meta.url)
let local
try { local = JSON.parse(await readFile(output, 'utf8')) } catch { /* primeira coleta */ }
const remote = await loadPrevious('inadimplencia.json')
const now = Date.now(), series = []
for (const meta of CREDIT_SERIES) {
  const previous = [local, remote].flatMap(f => f?.series || []).filter(s => s.key === meta.key && s.points?.length).sort((a, b) => b.updatedAt - a.updatedAt)[0]
  if (previous && !previous.stale && now - previous.checkedAt < 6 * 3600000) { series.push(previous); continue }
  try {
    let rows = []
    for (const [start, end] of [['01/03/2011', '31/12/2020'], ['01/01/2021', new Date(now).toLocaleDateString('en-GB', { timeZone: 'UTC' })]]) {
      const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${meta.code}/dados?formato=json&dataInicial=${start}&dataFinal=${end}`
      let batch, error
      for (let attempt = 0; attempt < 3; attempt++) {
        try { const res = await fetch(url, { signal: AbortSignal.timeout(25000) }); if (!res.ok) throw new Error(`HTTP ${res.status}`); batch = await res.json(); parseCredit(batch); break } catch (e) { error = e }
      }
      if (!batch || !Array.isArray(batch)) throw error || new Error('Resposta SGS inválida')
      rows = rows.concat(batch)
    }
    const points = parseCredit(rows)
    if (previous && (points.at(-1).period < previous.points.at(-1).period || points.length < previous.points.length)) throw new Error('Cobertura SGS inferior à preservada')
    series.push({ ...meta, points, checkedAt: now, updatedAt: now, stale: false })
  } catch (error) {
    series.push({ ...(previous || { ...meta, points: [], updatedAt: null }), checkedAt: now, stale: true, error: error.message })
  }
}
await writeFile(output, JSON.stringify({ generatedAt: now, series }) + '\n')
console.log(series.map(s => `${s.key}: ${s.points.length} meses, ${s.points.at(-1)?.period || 'ausente'}, pendente=${s.stale}`).join('\n'))
