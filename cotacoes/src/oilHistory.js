import { oilPeriodPoints } from './summaryPeriod.js'
export function oilHistory(points, spark, now = new Date()) {
  const daily = spark.intraday ? { ...spark, intraday: false, days: 0 } : spark
  const selected = oilPeriodPoints(points, daily, now)
  const first = selected[0], last = selected.at(-1)
  return { points: selected, first, last, change: selected.length > 1 && first.value > 0 ? (last.value / first.value - 1) * 100 : null }
}
