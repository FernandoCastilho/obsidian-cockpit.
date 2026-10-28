import test from 'node:test'
import assert from 'node:assert/strict'
import { priorYear, rangeStats, valueAt, yearBefore } from '../src/rangeCompare.js'
const T = (s) => Date.parse(s + 'T12:00:00Z')
const pts = (rows) => rows.map(([d, v]) => ({ t: T(d), bid: v }))

test('variação do trecho em qualquer ordem de índices', () => {
  const p = pts([['2026-01-01', 100], ['2026-02-01', 110], ['2026-03-01', 99]])
  const a = rangeStats(p, 0, 1), b = rangeStats(p, 1, 0)
  assert.deepEqual(a, b)
  assert.ok(Math.abs(a.pct - 10) < 1e-9 && Math.abs(a.delta - 10) < 1e-9)
  assert.ok(rangeStats(p, 0, 2).pct < 0)
  assert.equal(rangeStats(p, 1, 1), null)
  assert.equal(rangeStats(p, 0, 9), null)
})

test('valor na data: último ponto anterior, com tolerância de 7 dias salvo série em degraus', () => {
  const p = pts([['2025-01-01', 1], ['2025-06-01', 2]])
  assert.equal(valueAt(p, T('2025-01-05')), 1)
  assert.equal(valueAt(p, T('2025-03-01')), null)
  assert.equal(valueAt(p, T('2025-03-01'), true), 1)
  assert.equal(valueAt(p, T('2024-12-31')), null)
})

test('mesmo trecho do ano anterior: calcula quando o histórico alcança e some quando não', () => {
  const rows = []
  for (let d = new Date('2025-01-01T12:00:00Z'); d <= new Date('2026-04-30T12:00:00Z'); d = new Date(d.getTime() + 864e5)) rows.push([d.toISOString().slice(0, 10), 100 + rows.length * 0.1])
  const h = pts(rows)
  const r = priorYear(h, T('2026-03-10'), T('2026-04-10'))
  assert.ok(r && r.pct > 0 && r.segment.length > 20)
  assert.equal(new Date(r.t0).toISOString().slice(0, 10), '2025-03-10')
  assert.equal(priorYear(h, T('2025-06-01'), T('2025-07-01')), null)
  assert.equal(priorYear([], 1, 2), null)
  assert.equal(new Date(yearBefore(T('2024-02-29'))).toISOString().slice(0, 10), '2023-03-01')
})
