// Variações de uma série de observações { period, value }, mensal ('AAAA-MM') ou diária ('AAAA-MM-DD'):
// último, anterior, mesmo período do ano anterior e fim do ano anterior. Falta de base devolve nulo, nunca zero.
const DAY = 864e5
const isDay = (p) => /^\d{4}-\d{2}-\d{2}$/.test(p)
const t = (p) => Date.parse(isDay(p) ? `${p}T12:00:00Z` : `${p}-15T12:00:00Z`)
const valid = (p) => p && (isDay(p.period) || /^\d{4}-(0[1-9]|1[0-2])$/.test(p.period)) && Number.isFinite(p.value)
export function seriesStats(points) {
  const list = (Array.isArray(points) ? points : []).filter(valid).sort((a, b) => a.period.localeCompare(b.period))
  const last = list.at(-1)
  if (!last) return null
  const daily = isDay(last.period)
  const rel = (base) => (base && base.value ? (last.value / base.value - 1) * 100 : null)
  const prev = list.length > 1 ? list.at(-2) : null
  const year = Number(last.period.slice(0, 4))
  const at = (target, tolerance) => {
    const cand = list.filter((p) => t(p.period) <= t(target)).at(-1)
    return cand && t(target) - t(cand.period) <= tolerance ? cand : null
  }
  const yearAgo = daily ? at(`${year - 1}${last.period.slice(4)}`, 7 * DAY) : list.find((p) => p.period === `${year - 1}${last.period.slice(4)}`) ?? null
  const base = daily ? at(`${year - 1}-12-31`, 10 * DAY) : list.find((p) => p.period === `${year - 1}-12`) ?? null
  return { last, prev, yearAgo, base, daily, pct: rel(prev), yoyPct: rel(yearAgo), ytdPct: rel(base) }
}
