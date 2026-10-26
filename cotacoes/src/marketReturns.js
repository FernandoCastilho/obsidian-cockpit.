// Calendar boundaries are civil dates in São Paulo, independent of the device zone.
export const marketDate = t => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t))
const dayNumber = d => Date.parse(d + 'T12:00:00Z') / 864e5

export function accumulatedReturns(file, code, now = Date.now()) {
  const empty = { month: null, year: null }
  const series = file?.series?.[code]
  if (file?.source !== 'AwesomeAPI' || series?.source !== code || !Number.isFinite(new Date(now).getTime()) || !Array.isArray(series.points)) return empty
  const today = marketDate(now), monthStart = today.slice(0, 7) + '-01', yearStart = today.slice(0, 4) + '-01-01'
  const daily = new Map()
  const valid = series.points.filter(p => Number.isFinite(p?.t) && Number.isFinite(new Date(p.t).getTime()) && Number.isFinite(p.bid) && p.bid > 0)
  for (const p of valid.sort((a, b) => a.t - b.t)) {
    const date = marketDate(p.t)
    // The current daily bar can still change: use only completed civil days.
    if (date < today) daily.set(date, { date, bid: p.bid })
  }
  const points = [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)), end = points.at(-1)
  const calculate = start => {
    const base = points.filter(p => p.date < start).at(-1)
    // Seven civil days is a conservative coverage guard, not a market-calendar claim.
    if (!base || !end || end.date < start || dayNumber(start) - dayNumber(base.date) > 7 || dayNumber(today) - dayNumber(end.date) > 7) return null
    return { value: (end.bid / base.bid - 1) * 100, baseDate: base.date, endDate: end.date, base: base.bid, end: end.bid }
  }
  return { month: calculate(monthStart), year: calculate(yearStart) }
}

export function compatiblePtax(code, quote, ptax, now = Date.now()) {
  if (!['USD', 'EUR', 'JPY'].includes(code) || quote?.fallback || (quote?.source && quote.source !== code)) return null
  if (!Number.isFinite(ptax?.sell) || ptax.sell <= 0 || !['Fechamento', 'Fechamento PTAX'].includes(ptax.kind) || !/^\d{4}-\d{2}-\d{2}$/.test(ptax.date || '')) return null
  const d = new Date(ptax.date + 'T12:00:00Z')
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === ptax.date && ptax.date <= marketDate(now) ? ptax : null
}
