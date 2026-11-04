export const CREDIT_SERIES = [
  { key: 'pf-total', code: 21084, person: 'PF', type: 'total' },
  { key: 'pj-total', code: 21083, person: 'PJ', type: 'total' },
  { key: 'pf-livres', code: 21112, person: 'PF', type: 'livres' },
  { key: 'pj-livres', code: 21086, person: 'PJ', type: 'livres' },
  { key: 'pf-direcionados', code: 21145, person: 'PF', type: 'direcionados' },
  { key: 'pj-direcionados', code: 21133, person: 'PJ', type: 'direcionados' },
]
export function parseCredit(rows) {
  if (!Array.isArray(rows) || !rows.length) throw new Error('SGS sem dados')
  const points = rows.map(row => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(row.data || '')
    const v = Number(String(row.valor).replace(',', '.'))
    if (!m || !String(row.valor ?? '').trim() || !Number.isFinite(v) || v < 0 || v > 100 || +m[2] < 1 || +m[2] > 12) throw new Error('Observação SGS inválida')
    const period = `${m[3]}-${m[2]}`
    return { period, t: Date.parse(period + '-01T00:00:00Z'), v }
  })
  return [...new Map(points.map(p => [p.period, p])).values()].sort((a, b) => a.t - b.t)
}
export function creditStats(points = []) {
  const last = points.at(-1)
  if (!last) return { last: null, month: null, year: null }
  const [y, m] = last.period.split('-').map(Number)
  const at = offset => { const d = new Date(Date.UTC(y, m - 1 - offset, 1)); return points.find(p => p.period === d.toISOString().slice(0, 7)) }
  return { last, month: at(1) ? last.v - at(1).v : null, year: at(12) ? last.v - at(12).v : null }
}
