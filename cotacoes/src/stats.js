// Variação por intervalo e volatilidade realizada, a partir de fechamentos diários [{ t, bid }].
const DAY = 864e5

// Último fechamento com t <= alvo.
const closeAt = (pts, target) => {
  for (let i = pts.length - 1; i >= 0; i--) if (pts[i].t <= target) return pts[i]
  return null
}

export function rangeStats(points, now = Date.now()) {
  const pts = (points ?? []).filter((p) => Number.isFinite(p.bid) && p.bid > 0).sort((a, b) => a.t - b.t)
  if (pts.length < 2) return null
  const last = pts[pts.length - 1]
  const chg = (ref) => (ref ? ((last.bid - ref.bid) / ref.bid) * 100 : null)
  const jan1 = new Date(new Date(last.t).getFullYear(), 0, 1).getTime()
  const prevYearEnd = closeAt(pts, jan1 - 1)
  const rets = []
  for (let i = Math.max(1, pts.length - 21); i < pts.length; i++) rets.push(Math.log(pts[i].bid / pts[i - 1].bid))
  let vol = null
  if (rets.length >= 10) {
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length
    const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1)
    vol = Math.sqrt(variance) * Math.sqrt(252) * 100
  }
  return { week: chg(closeAt(pts, last.t - 7 * DAY)), month: chg(closeAt(pts, last.t - 30 * DAY)), year: chg(prevYearEnd), vol, asOf: last.t }
}
