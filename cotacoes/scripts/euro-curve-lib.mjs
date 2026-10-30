import { pickDates } from './curves-lib.mjs'

// Curva de juros soberana da área do euro (BCE, títulos AAA, taxa spot por prazo, modelo Svensson), um ponto por vencimento e dia útil TARGET.
export const EURO_CURVE_SOURCE = 'https://www.ecb.europa.eu/stats/financial_markets_and_interest_rates/euro_area_yield_curves/html/index.en.html'
export const EURO_TENORS = [['SR_3M', 0.25, '3M'], ['SR_6M', 0.5, '6M'], ['SR_1Y', 1, '1A'], ['SR_2Y', 2, '2A'], ['SR_3Y', 3, '3A'], ['SR_5Y', 5, '5A'], ['SR_7Y', 7, '7A'], ['SR_10Y', 10, '10A'], ['SR_20Y', 20, '20A'], ['SR_30Y', 30, '30A']]
export const euroCurveApi = (startPeriod) => `https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.G_N_A.SV_C_YM.${EURO_TENORS.map((t) => t[0]).join('+')}?startPeriod=${startPeriod}&format=csvdata`

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

// CSV do BCE -> { 'AAAA-MM-DD': [[anos, taxa, rótulo]] } em ordem de prazo. Dia só entra se tiver todos os prazos (curva incompleta engana).
export function parseEuroCurve(csv) {
  const lines = String(csv ?? '').split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) throw new Error('BCE devolveu poucas linhas')
  const head = cells(lines[0]), iD = head.indexOf('TIME_PERIOD'), iV = head.indexOf('OBS_VALUE'), iT = head.indexOf('DATA_TYPE_FM')
  if (iD < 0 || iV < 0 || iT < 0) throw new Error('Formato do BCE inesperado')
  const tenor = new Map(EURO_TENORS.map(([code, years, label]) => [code, { years, label }]))
  const byDate = new Map()
  for (const line of lines.slice(1)) {
    const c = cells(line), t = tenor.get(c[iT]), date = c[iD], raw = c[iV]
    if (!t) continue // outro tipo de dado que não é taxa spot dos prazos pedidos
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error(`Data inválida do BCE: ${date}`)
    if (raw === '' || raw == null) continue
    const value = Number(raw)
    if (!Number.isFinite(value) || value < -3 || value > 15) throw new Error(`Taxa fora do esperado em ${date}`)
    const day = byDate.get(date) ?? new Map()
    if (day.has(t.years)) throw new Error(`Vértice repetido do BCE: ${date} ${t.label}`)
    day.set(t.years, [t.years, value, t.label])
    byDate.set(date, day)
  }
  const out = {}
  for (const [date, day] of [...byDate].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (day.size === EURO_TENORS.length) out[date] = [...day.values()].sort((a, b) => a[0] - b[0])
  }
  if (Object.keys(out).length < 5) throw new Error('Curva do euro incompleta')
  return out
}

// Datas de comparação (hoje, 1 dia, 1 semana, 1 mês...) no mesmo formato das curvas dos EUA, para o gráfico reaproveitar.
export function euroCurveFile(all, checkedAt, { stale = false, error } = {}) {
  const picks = pickDates(Object.keys(all ?? {}))
  const curves = Object.fromEntries(picks.map((p) => [p.date, all[p.date]]))
  return { schemaVersion: 1, generatedAt: checkedAt, curve: { id: 'euro-curve', sourceName: 'Banco Central Europeu · curva de juros da área do euro (AAA)', sourceUrl: EURO_CURVE_SOURCE, checkedAt, stale, error, sourceDate: picks[0]?.date ?? null, compare: picks, curves } }
}
