import test from 'node:test'
import assert from 'node:assert/strict'
import { selectedPeriod, oilPeriodPoints } from '../src/summaryPeriod.js'
const now = new Date(2026, 9, 21)
test('custom ranges validate order, actual calendar, future and available horizon', () => {
  for (const [a,b] of [['2026-10-22','2026-10-21'],['2026-02-31','2026-10-21'],['2026-10-20','2026-10-22'],['2020-01-01','2026-10-21'],['','2026-10-21']]) assert.ok(selectedPeriod(a,b,now).error)
  assert.equal(selectedPeriod('2026-10-21','2026-10-21',now).intraday,false)
  assert.equal(selectedPeriod('2026-10-01','2026-10-21',now).days,20)
})
test('oil date range includes both endpoints, excludes outside and never invents gaps', () => {
  const points=[{date:'2026-10-18',value:100},{date:'2026-10-19',value:110},{date:'2026-10-21',value:120},{date:'2026-10-22',value:130}]
  assert.deepEqual(oilPeriodPoints(points,selectedPeriod('2026-10-19','2026-10-21',now),now),points.slice(1,3))
  assert.deepEqual(oilPeriodPoints(points,selectedPeriod('2026-10-20','2026-10-20',now),now),[])
  assert.deepEqual(oilPeriodPoints(points,{intraday:true},now),[])
})
