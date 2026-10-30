// €STR (euro short-term rate): taxa overnight do Banco Central Europeu, média ponderada aparada, dias úteis TARGET, desde out/2019.
export const ESTR_SOURCE = 'https://www.ecb.europa.eu/stats/financial_markets_and_interest_rates/euro_short-term_rate/html/index.en.html'
export const ESTR_API = 'https://data-api.ecb.europa.eu/service/data/EST/B.EU000A2X2A25.WT?startPeriod=2019-10-01&format=csvdata'

// Uma linha de CSV, com aspas (o BCE põe o título da série entre aspas, com vírgulas).
function cells(line) {
  const out = []
  let cur = '', q = false
  for (const ch of line) {
    if (ch === '"') q = !q
    else if (ch === ',' && !q) { out.push(cur); cur = '' } else cur += ch
  }
  out.push(cur)
  return out
}

// CSV do Data Portal do BCE -> [{ date: 'AAAA-MM-DD', value }] em ordem. Valor pode ser negativo (o €STR foi negativo até jul/2022).
export function parseEstr(csv) {
  const lines = String(csv ?? '').split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) throw new Error('BCE devolveu poucas linhas')
  const head = cells(lines[0]), iDate = head.indexOf('TIME_PERIOD'), iVal = head.indexOf('OBS_VALUE')
  if (iDate < 0 || iVal < 0) throw new Error('Formato do BCE inesperado')
  const byDate = new Map()
  for (const line of lines.slice(1)) {
    const c = cells(line), date = c[iDate], raw = c[iVal]
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error(`Data inválida do BCE: ${date}`)
    if (raw === '' || raw == null) continue // dia sem observação: não vira zero
    const value = Number(raw)
    if (!Number.isFinite(value) || value < -2 || value > 20) throw new Error(`Valor fora do esperado para o €STR em ${date}`)
    if (byDate.has(date)) throw new Error(`Data repetida do BCE: ${date}`)
    byDate.set(date, value)
  }
  const points = [...byDate].sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value }))
  if (points.length < 100) throw new Error('Série do €STR incompleta')
  return points
}

export function estrFile(points, checkedAt, { stale = false, error } = {}) {
  return { schemaVersion: 1, generatedAt: checkedAt, series: { id: 'estr', sourceName: 'Banco Central Europeu · €STR', sourceUrl: ESTR_SOURCE, checkedAt, stale, error, points } }
}
