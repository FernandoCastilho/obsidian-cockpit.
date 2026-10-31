import test from 'node:test'
import assert from 'node:assert/strict'
import { valueAt, sameUnit, viewRange, clip, toPoints, normalize, niceTicks, colorOf, tOf } from '../src/multiSeries.js'

const L = (pairs) => pairs.map(([period, value]) => ({ period, value }))
test('valueAt: último ponto até o instante; antes do início não há valor', () => {
  const pts = toPoints(L([['2026-01-02', 10], ['2026-01-05', 11], ['2026-01-09', 12]]))
  assert.equal(valueAt(pts, tOf('2026-01-01')), null)
  assert.equal(valueAt(pts, tOf('2026-01-02')).v, 10)
  assert.equal(valueAt(pts, tOf('2026-01-07')).v, 11, 'série esparsa mantém o último valor conhecido')
  assert.equal(valueAt(pts, tOf('2027-01-01')).v, 12)
})
test('unidade comum decide o modo de comparação', () => {
  assert.equal(sameUnit([{ unit: '% a.a.' }, { unit: '% a.a.' }]), true)
  assert.equal(sameUnit([{ unit: '% a.a.' }, { unit: 'R$' }]), false)
  assert.equal(sameUnit([]), false)
})
test('intervalo: atalho em meses a partir do dado mais recente, limitado à cobertura; datas escolhidas também', () => {
  const a = L([['2025-01-02', 1], ['2026-06-30', 2]]), b = L([['2026-03-02', 1], ['2026-06-10', 2]])
  assert.deepEqual(viewRange([a, b], 3), { start: '2026-03-30', end: '2026-06-30' })
  assert.deepEqual(viewRange([a, b], 'all'), { start: '2025-01-02', end: '2026-06-30' })
  assert.deepEqual(viewRange([a, b], 60), { start: '2025-01-02', end: '2026-06-30' }, 'não passa do início da cobertura')
  assert.deepEqual(viewRange([a, b], 12, { start: '2024-01-01', end: '2030-01-01' }), { start: '2025-01-02', end: '2026-06-30' })
  assert.equal(viewRange([[], []], 12), null)
  assert.deepEqual(clip(a, { start: '2026-01-01', end: '2026-12-31' }).map((p) => p.period), ['2026-06-30'])
})
test('normalização: variação % sobre o primeiro ponto; base zero não vira número', () => {
  const n = normalize(toPoints(L([['2026-01-02', 200], ['2026-01-03', 210], ['2026-01-04', 190]])))
  assert.deepEqual(n.map((p) => +p.v.toFixed(2)), [0, 5, -5])
  assert.deepEqual(normalize(toPoints(L([['2026-01-02', 0], ['2026-01-03', 1]]))), [])
  assert.deepEqual(normalize([]), [])
})
test('eixo com marcas redondas que cobrem os dados; série constante não quebra', () => {
  const t = niceTicks(13.59, 16.43)
  assert.ok(t.lo <= 13.59 && t.hi >= 16.43 && t.ticks.length >= 3 && t.ticks.length <= 8, JSON.stringify(t))
  const flat = niceTicks(5, 5); assert.ok(flat.lo < 5 && flat.hi > 5)
})
test('cores distintas para muitas séries', () => {
  const cs = new Set(Array.from({ length: 24 }, (_, i) => colorOf(i))); assert.equal(cs.size, 24)
})
