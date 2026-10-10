// CDI futuro implícito na curva DI x pré da B3. Vértices: [dias úteis (base 252), taxa % a.a. composta desde hoje].
// Taxa a termo entre dois vértices: ((1+r2)^(d2/252) / (1+r1)^(d1/252))^(252/(d2-d1)) − 1.
export function forwardCurve(pts) {
  const v = (pts ?? []).filter(([d, r]) => d > 0 && Number.isFinite(r)).sort((a, b) => a[0] - b[0])
  const out = []
  for (let i = 1; i < v.length; i++) {
    const [d1, r1] = v[i - 1]
    const [d2, r2] = v[i]
    if (d2 <= d1) continue
    const growth = (1 + r2 / 100) ** (d2 / 252) / (1 + r1 / 100) ** (d1 / 252)
    out.push({ from: d1, to: d2, mid: (d1 + d2) / 2, rate: (growth ** (252 / (d2 - d1)) - 1) * 100 })
  }
  return out
}

// Vértice mais próximo de cada horizonte (em dias úteis), com tolerância de 20%.
export const HORIZONS = [
  { label: '3 meses', d: 63 },
  { label: '6 meses', d: 126 },
  { label: '1 ano', d: 252 },
  { label: '2 anos', d: 504 },
  { label: '3 anos', d: 756 },
  { label: '5 anos', d: 1260 },
]
export function horizonTable(pts) {
  const v = pts ?? []
  const rows = []
  let prev = null
  for (const h of HORIZONS) {
    const p = v.reduce((b, q) => (b && Math.abs(b[0] - h.d) <= Math.abs(q[0] - h.d) ? b : q), null)
    if (!p || Math.abs(p[0] - h.d) > h.d * 0.2) continue
    let fwd = null
    if (prev) fwd = (((1 + p[1] / 100) ** (p[0] / 252) / (1 + prev[1] / 100) ** (prev[0] / 252)) ** (252 / (p[0] - prev[0])) - 1) * 100
    rows.push({ ...h, vertex: p[0], avg: p[1], fwd })
    prev = p
  }
  return rows
}
