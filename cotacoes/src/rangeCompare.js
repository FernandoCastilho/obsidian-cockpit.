// Seleção de um trecho do gráfico: variação do trecho e do mesmo trecho um ano antes.
const DAY = 864e5
export const YEAR_TOLERANCE = 7 * DAY

export function yearBefore(t) {
  const d = new Date(t)
  d.setFullYear(d.getFullYear() - 1)
  return d.getTime()
}

// Último ponto em ou antes de t. `hold` (séries em degraus, como a meta Selic) aceita qualquer distância;
// nas demais, ponto a mais de 7 dias de t não vale como valor naquela data.
export function valueAt(points, t, hold = false) {
  let lo = 0, hi = points.length - 1, found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (points[mid].t <= t) { found = mid; lo = mid + 1 } else hi = mid - 1
  }
  if (found < 0 || (!hold && t - points[found].t > YEAR_TOLERANCE)) return null
  return points[found].bid
}

const change = (v0, v1) => ({ delta: v1 - v0, pct: v0 ? (v1 / v0 - 1) * 100 : null })

// Variação entre dois pontos da série (índices em qualquer ordem).
export function rangeStats(points, i, j) {
  if (!Array.isArray(points) || i == null || j == null || i === j || !points[i] || !points[j]) return null
  const [a, b] = i < j ? [points[i], points[j]] : [points[j], points[i]]
  return { t0: a.t, t1: b.t, v0: a.bid, v1: b.bid, ...change(a.bid, b.bid) }
}

// Mesmo trecho um ano antes: exige histórico que alcance o início do trecho anterior.
// `segment` traz os pontos do trecho anterior para sobrepor ao gráfico.
export function priorYear(history, t0, t1, hold = false) {
  if (!Array.isArray(history) || history.length < 2) return null
  const p0 = yearBefore(t0), p1 = yearBefore(t1)
  const v0 = valueAt(history, p0, hold), v1 = valueAt(history, p1, hold)
  if (v0 == null || v1 == null) return null
  const inside = history.filter((p) => p.t > p0 && p.t < p1)
  return { t0: p0, t1: p1, v0, v1, ...change(v0, v1), segment: [{ t: p0, bid: v0 }, ...inside, { t: p1, bid: v1 }] }
}
