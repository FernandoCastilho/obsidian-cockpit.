import { marketDate } from './marketReturns.js'
import { CROSS_MAX_GAP_MS } from './parity.js'

// Only observed prices, grouped by their actual São Paulo date.
function sessions(points, today) {
  const days = new Map()
  for (const p of points ?? []) {
    if (!Number.isFinite(p.t) || !Number.isFinite(p.bid) || p.bid <= 0) continue
    const date = marketDate(p.t)
    if (date > today) continue
    if (!days.has(date)) days.set(date, [])
    days.get(date).push(p)
  }
  return new Map([...days].sort(([a], [b]) => b.localeCompare(a)).map(([d, p]) => [d, p.sort((a, b) => a.t - b.t)]))
}
function preview(points, day, source) { return { points, day, source } }
export function marketPreviews(usd, eur, today) {
  const u = sessions(usd, today), e = sessions(eur, today)
  const latest = days => [...days].find(([, p]) => p.length > 1)
  const up = latest(u), ep = latest(e)
  let par = null
  for (const [day, us] of u) {
    const es = e.get(day)
    if (!es) continue
    const points = []
    let j = -1
    for (const p of us) {
      while (j + 1 < es.length && es[j + 1].t <= p.t) j++
      if (j >= 0 && p.t - es[j].t <= CROSS_MAX_GAP_MS) points.push({ t: p.t, bid: es[j].bid / p.bid })
    }
    if (points.length > 1) { par = preview(points, day, 'EUR/BRL ÷ USD/BRL'); break }
  }
  return { USD: up ? preview(up[1], up[0], 'USD/BRL') : null, EUR: ep ? preview(ep[1], ep[0], 'EUR/BRL') : null, PAR: par }
}
