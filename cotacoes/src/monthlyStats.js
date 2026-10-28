// Estatísticas de uma série mensal { period: 'AAAA-MM', value }: último ponto, mês anterior, mesmo mês do ano anterior e dezembro do ano anterior.
const prevYear = (period) => `${Number(period.slice(0, 4)) - 1}${period.slice(4)}`
export function monthlyStats(points) {
  const list = Array.isArray(points) ? points.filter((p) => /^\d{4}-(0[1-9]|1[0-2])$/.test(p?.period) && Number.isFinite(p.value)).sort((a, b) => a.period.localeCompare(b.period)) : []
  const last = list.at(-1)
  if (!last) return null
  const at = (period) => list.find((p) => p.period === period) ?? null
  const rel = (base) => (base && base.value ? (last.value / base.value - 1) * 100 : null)
  const prev = list.at(-2) && list.at(-2).period < last.period ? list.at(-2) : null
  const yearAgo = at(prevYear(last.period))
  const december = at(`${Number(last.period.slice(0, 4)) - 1}-12`)
  return {
    last, prev, yearAgo, december,
    delta: prev ? last.value - prev.value : null, pct: rel(prev),
    yoyPct: rel(yearAgo), ytdPct: rel(december),
  }
}
