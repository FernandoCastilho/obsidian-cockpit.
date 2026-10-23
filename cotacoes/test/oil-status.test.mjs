import test from 'node:test'
import assert from 'node:assert/strict'
import { oilStatus } from '../src/oilStatus.js'
const now = new Date('2026-10-23T15:00:00Z')
const data = { observationDate: '2026-10-20', generatedAt: '2026-10-23T14:00:00Z', nextReleaseDate: '2026-10-28' }
test('daily observation in weekly publication is not incorrectly overdue', () => {
  assert.equal(oilStatus(data, false, now).pending, false)
  assert.match(oilStatus(data, false, now).label, /semanal.*sem intraday/)
})
test('missed collector, failed request and missed release expose pending status', () => {
  for (const value of [{ ...data, generatedAt: '2026-10-21T14:00:00Z' }, { ...data, generatedAt: null }, { ...data, nextReleaseDate: '2026-10-22' }, { ...data, stale: true }]) {
    assert.equal(oilStatus(value, false, now).pending, true)
  }
  assert.equal(oilStatus(data, true, now).pending, true)
})
test('absence differentiates loading from failure', () => {
  assert.match(oilStatus(null).label, /Carregando/)
  assert.match(oilStatus(null, true).label, /indisponível/)
})
