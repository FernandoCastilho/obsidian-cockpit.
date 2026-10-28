import test from 'node:test'
import assert from 'node:assert/strict'
import { ipcaRows, ipcaSeries, IPCA_METRICS, normalizeIpca } from '../src/ipca.js'
const file = { series: { id: 'ipca', checkedAt: '2026-10-28T00:00:00Z', points: [
  { period: '1979-12', mom: null, ytd: null, y12: null, index: 100 },
  { period: '2025-09', mom: 0.5, ytd: 3, y12: 5, index: 7000 },
  { period: '2026-08', mom: -0.32, ytd: 2.9, y12: 4.4, index: 7633.23 },
  { period: '2026-09', mom: 0.82, ytd: 3.7, y12: 4.6, index: 7695.82 },
] } }

test('IPCA na tela: valida e ordena; recusa arquivo de outra série ou mês repetido', () => {
  assert.equal(normalizeIpca(file).points.at(-1).period, '2026-09')
  assert.throws(() => normalizeIpca({ series: { id: 'x', points: [], checkedAt: 'a' } }), /inválido/)
  assert.throws(() => normalizeIpca({ series: { ...file.series, points: [...file.series.points, file.series.points[1]] } }), /inválido/)
})

test('IPCA na tela: leituras sem dado ficam fora da série em vez de virar zero', () => {
  const s = normalizeIpca(file)
  assert.equal(ipcaSeries(s, IPCA_METRICS[0]).length, 3)
  assert.equal(ipcaSeries(s, IPCA_METRICS[3]).length, 4)
})

test('IPCA na tela: último, mês anterior, diferença e mesmo mês do ano anterior', () => {
  const rows = ipcaRows(normalizeIpca(file))
  const mom = rows[0]
  assert.equal(mom.last.period, '2026-09'); assert.equal(mom.prev.value, -0.32)
  assert.ok(Math.abs(mom.delta - 1.14) < 1e-9)
  assert.equal(mom.yearAgo.value, 0.5)
  const idx = rows[3]
  assert.ok(Math.abs(idx.yoyPct - (7695.82 / 7000 - 1) * 100) < 1e-9)
  assert.ok(Math.abs(idx.pct - (7695.82 / 7633.23 - 1) * 100) < 1e-9)
})
