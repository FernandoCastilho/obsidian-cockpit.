// Comparações só usam observações existentes. Datas civis são tratadas em UTC.
const DAY = 86400000
export function previousYear(t) {
  const d = new Date(t), year = d.getUTCFullYear() - 1, month = d.getUTCMonth()
  const day = Math.min(d.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate())
  return Date.UTC(year, month, day, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds())
}
export const monthKey = t => new Date(t).toISOString().slice(0, 7)
export function seriesFrequency(points) {
  if (points.length < 2) return 'day'
  const gaps = points.slice(1).map((p, i) => p.t - points[i].t).sort((a, b) => a - b)
  return gaps[Math.floor(gaps.length / 2)] >= 300 * DAY ? 'year' : gaps[Math.floor(gaps.length / 2)] >= 80 * DAY ? 'quarter' : gaps[Math.floor(gaps.length / 2)] >= 27 * DAY ? 'month' : gaps[Math.floor(gaps.length / 2)] < DAY / 2 ? 'intraday' : 'day'
}
const val = p => p?.v ?? p?.bid ?? p?.value
export function compareWindow(points, a, b, { frequency = 'auto', prior = false, compound = false } = {}) {
  const sorted = points.filter(p => Number.isFinite(p.t) && Number.isFinite(val(p))).slice().sort((x, y) => x.t - y.t)
  if (a === b || !sorted.length) return null
  let [t0, t1] = a < b ? [a, b] : [b, a]
  const freq = frequency === 'auto' ? seriesFrequency(sorted) : frequency
  if (prior) { if (freq === 'intraday') return null; t0 = previousYear(t0); t1 = previousYear(t1) }
  const at = t => {
    if (freq === 'month') return sorted.find(p => monthKey(p.t) === monthKey(t))
    const found = sorted.findLast(p => p.t <= t)
    return found && t - found.t <= (prior ? 7 * DAY : 0) ? found : null
  }
  const first = at(t0), last = at(t1)
  if (!first || !last || first.t === last.t) return null
  const segment = sorted.filter(p => p.t >= first.t && p.t <= last.t)
  if (freq === 'month') {
    const start = new Date(t0), end = new Date(t1)
    const n = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth() + 1
    if (new Set(segment.map(p => monthKey(p.t))).size !== n) return null
  }
  const v0 = val(first), v1 = val(last), delta = v1 - v0
  return { t0: first.t, t1: last.t, v0, v1, delta, pct: v0 === 0 ? null : delta / v0 * 100, accumulated: compound ? (segment.reduce((f, p) => f * (1 + val(p) / 100), 1) - 1) * 100 : null, segment }
}
export function comparisonRows(series, history, a, b, options = {}) {
  return series.map(s => ({ key: s.key, name: s.name, unit: s.unit, current: compareWindow(s.points, a, b, options), prior: compareWindow(history.find(h => h.key === s.key)?.points || s.points, a, b, { ...options, prior: true }) }))
}
