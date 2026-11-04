import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCredit, creditStats, CREDIT_SERIES } from '../src/inadimplencia.js'
test('six official series map to PF/PJ and three portfolios', () => {
  assert.deepEqual(CREDIT_SERIES.map(s => s.code), [21084, 21083, 21112, 21086, 21145, 21133])
})
test('SGS parsing rejects empty, corrupt and out-of-range responses', () => {
  for (const rows of [[], {}, [{ data: '01/01/2025', valor: '' }], [{ data: '01/13/2025', valor: '2' }], [{ data: '01/01/2025', valor: '101' }]]) assert.throws(() => parseCredit(rows))
  assert.equal(parseCredit([{ data: '01/01/2025', valor: '3,25' }])[0].v, 3.25)
})
test('variations use exact months and percentage points, never nearest observations', () => {
  const p = parseCredit([{ data: '01/01/2024', valor: '2' }, { data: '01/12/2024', valor: '3' }, { data: '01/01/2025', valor: '3.5' }])
  assert.equal(creditStats(p).month, 0.5)
  assert.equal(creditStats(p).year, 1.5)
  assert.equal(creditStats([p[0], p[2]]).month, null)
})
