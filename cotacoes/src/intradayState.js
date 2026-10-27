import { marketDate as localDate } from './marketReturns.js'

// Availability follows the actual retained samples, never a weekday assumption.
export function intradaySelection(points, selectedDate) {
  const valid = points.filter(p => Number.isFinite(p.t) && Number.isFinite(p.bid) && p.bid > 0).sort((a, b) => a.t - b.t)
  const selected = valid.filter(p => localDate(p.t) === selectedDate)
  const previous = valid.filter(p => localDate(p.t) < selectedDate).at(-1)
  return { points: selected, previousDay: previous ? localDate(previous.t) : null }
}
