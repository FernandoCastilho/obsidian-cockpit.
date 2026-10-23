import test from 'node:test'
import assert from 'node:assert/strict'
import { comparisonSeries } from '../src/comparisonSeries.js'
import { periodChange } from '../src/stats.js'

test('USD com uma coleta continua disponível, sem variação inventada e sem bloquear EUR/JPY', () => {
  const usd = { code: 'USD', points: [{ t: 1792764708000, bid: 5.0376 }] }
  const eur = { code: 'EUR', points: [{ t: 1, bid: 5.65 }, { t: 2, bid: 5.64 }] }
  const jpy = { code: 'JPY', points: [{ t: 1, bid: .032 }, { t: 2, bid: .033 }] }
  const cnh = { code: 'CNH', points: [] }
  const result = comparisonSeries([usd, eur, jpy, cnh])
  assert.deepEqual(result.available, [usd, eur, jpy])
  assert.deepEqual(result.comparable, [eur, jpy])
  assert.deepEqual(result.incomplete, [usd, cnh])
  assert.equal(periodChange(usd.points), null)
  assert.equal(usd.points.length, 1)
  assert.deepEqual(comparisonSeries([usd]).available, [usd])
  assert.deepEqual(comparisonSeries([cnh]).available, [])
})
