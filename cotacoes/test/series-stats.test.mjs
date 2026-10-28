import test from 'node:test'
import assert from 'node:assert/strict'
import { seriesStats } from '../src/seriesStats.js'
const m = (rows) => rows.map(([period, value]) => ({ period, value }))

test('série mensal: anterior, mesmo mês do ano anterior e dezembro anterior', () => {
  const s = seriesStats(m([['2025-09', 80], ['2025-12', 100], ['2026-08', 110], ['2026-09', 120]]))
  assert.equal(s.daily, false)
  assert.ok(Math.abs(s.pct - (120 / 110 - 1) * 100) < 1e-9)
  assert.ok(Math.abs(s.yoyPct - 50) < 1e-9)
  assert.ok(Math.abs(s.ytdPct - 20) < 1e-9)
})

test('série diária: ano anterior e fim do ano anterior com tolerância de dias sem pregão', () => {
  const s = seriesStats(m([['2025-10-17', 60], ['2025-12-31', 70], ['2026-10-19', 80], ['2026-10-20', 84]]))
  assert.equal(s.daily, true)
  assert.ok(Math.abs(s.pct - 5) < 1e-9)
  assert.ok(Math.abs(s.yoyPct - (84 / 60 - 1) * 100) < 1e-9) // 20/10/2025 não teve dado: vale o pregão de 17/10 (até 7 dias)
  assert.ok(Math.abs(s.ytdPct - 20) < 1e-9)
})

test('sem base na janela de tolerância ou sem dados, o campo fica nulo', () => {
  const s = seriesStats(m([['2024-01-02', 50], ['2026-10-20', 84]]))
  assert.equal(s.yoyPct, null); assert.equal(s.ytdPct, null); assert.ok(Math.abs(s.pct - (84 / 50 - 1) * 100) < 1e-9)
  assert.equal(seriesStats([]), null); assert.equal(seriesStats(null), null)
  assert.equal(seriesStats([{ period: '2026-13', value: 1 }]), null)
})
