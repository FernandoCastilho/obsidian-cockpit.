import test from 'node:test'
import assert from 'node:assert/strict'
import { monthlyStats } from '../src/monthlyStats.js'
const pts = [['2025-12', 100], ['2026-01', 102], ['2026-02', 101], ['2025-09', 90], ['2026-09', 110]].map(([period, value]) => ({ period, value }))

test('estatísticas mensais: último, mês anterior, ano anterior e acumulado no ano', () => {
  const s = monthlyStats(pts)
  assert.equal(s.last.period, '2026-09')
  assert.equal(s.prev.period, '2026-02')
  assert.ok(Math.abs(s.pct - (110 / 101 - 1) * 100) < 1e-9)
  assert.ok(Math.abs(s.yoyPct - (110 / 90 - 1) * 100) < 1e-9)
  assert.ok(Math.abs(s.ytdPct - 10) < 1e-9)
})

test('sem base no ano anterior ou em dezembro, o campo fica nulo em vez de inventado', () => {
  const s = monthlyStats([{ period: '2026-03', value: 5 }, { period: '2026-04', value: 6 }])
  assert.equal(s.yoyPct, null); assert.equal(s.ytdPct, null); assert.ok(s.pct > 0)
  assert.equal(monthlyStats([]), null)
  assert.equal(monthlyStats([{ period: '2026-13', value: 1 }]), null)
})
