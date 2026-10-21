import { fromInput, toInput, fullWindow, historyRangeError } from './useHistory.js'

export function selectedPeriod(startText, endText, now = new Date()) {
  const start = fromInput(startText), end = fromInput(endText)
  const error = historyRangeError(start, end)
  if (error) return { error }
  const available = fullWindow(now)
  if (end > available.end) return { error: 'A data final não pode estar no futuro.' }
  if (start < available.start) return { error: `Histórico disponível a partir de ${toInput(available.start).split('-').reverse().join('/')}.` }
  return { id: 'custom', label: `${startText.split('-').reverse().join('/')} a ${endText.split('-').reverse().join('/')}`, days: Math.round((end - start) / 864e5), intraday: false, range: { start, end } }
}

export function oilPeriodPoints(points, spark, now = new Date()) {
  if (spark.intraday) return []
  const end = spark.range?.end ?? now
  const start = spark.range?.start ?? new Date(end.getTime() - spark.days * 864e5)
  const first = toInput(start), last = toInput(end)
  return points.filter((p) => p.date >= first && p.date <= last)
}
