import test from 'node:test'
import assert from 'node:assert/strict'
import { FOCUS_BAND, factorRows, groupRows, normalizeIpcaGroups, signalOf } from '../src/inflacao.js'

const mk = (id, name, a, b) => ({ id, name, byPeriod: { '2026-08': a, '2026-09': b } })
const series = {
  id: 'ipca-groups', checkedAt: '2026-10-29T00:00:00Z', periods: ['2026-08', '2026-09'],
  groups: [
    mk(7169, 'Índice geral', { mom: 0.2, weight: 100, y12: 4.5 }, { mom: 0.5, weight: 100, y12: 4.7 }),
    mk(7170, 'Alimentação e bebidas', { mom: 0.2, weight: 21 }, { mom: 1.0, weight: 21.5, y12: 6 }),
    mk(7445, 'Habitação', { mom: 0.4, weight: 15 }, { mom: 0.4, weight: 15 }),
    mk(7625, 'Transportes', { mom: 0.1, weight: 20 }, { mom: -0.5, weight: 20 }),
    mk(7558, 'Vestuário', { mom: 0.3, weight: 4 }, { weight: 4 }),
  ],
}
test('IPCA por grupos: valida o arquivo e calcula contribuição, tendência e extremos', () => {
  assert.throws(() => normalizeIpcaGroups({ series: { id: 'x' } }), /inválido/)
  assert.equal(normalizeIpcaGroups({ series }), series)
  const g = groupRows(series)
  assert.equal(g.period, '2026-09'); assert.equal(g.prev, '2026-08')
  const row = (id) => g.rows.find((r) => r.id === id)
  assert.ok(Math.abs(row(7170).contribution - 0.215) < 1e-9)
  assert.equal(row(7170).trend, 'up'); assert.equal(row(7445).trend, 'same'); assert.equal(row(7625).trend, 'down')
  assert.equal(row(7558).mom, null); assert.equal(row(7558).contribution, null); assert.equal(row(7558).trend, null) // ausente não vira zero
  assert.equal(g.top.id, 7170); assert.equal(g.bottom.id, 7625)
  assert.ok(Math.abs(row(7625).contribution - -0.1) < 1e-9)
})

test('sinal por limiar: pressão, alívio, neutro e sem dado', () => {
  assert.equal(signalOf(1, 1), 'pressure'); assert.equal(signalOf(-1.5, 1), 'relief'); assert.equal(signalOf(0.4, 1), 'neutral')
  assert.equal(signalOf(null, 1), null); assert.equal(signalOf(NaN, 1), null)
})

test('fatores: câmbio, petróleo, grãos, expectativas e juros com leitura e sinal', () => {
  const focus = { rows: [{ label: 'IPCA', values: { 2026: { median: 4.8 }, 2027: { median: 4.0 } } }, { label: 'Selic', values: { 2026: { median: 12.5 } } }] }
  const rows = factorRows({
    fx: { month: { value: 2.3 }, year: { value: -4 } }, brent: { month: { value: -5 }, year: { value: 10 } },
    commodities: [{ id: 'soybeans', variationPct: 3.1, variationBasis: 'média set/26 vs ago/26' }, { id: 'corn', variationPct: 0.5 }],
    focus, selic: 14.25,
  })
  const by = Object.fromEntries(rows.map((r) => [r.id, r]))
  assert.equal(by.cambio.signal, 'pressure'); assert.match(by.cambio.reading, /\+2,3% no mês · −4,0% no ano/)
  assert.equal(by.petroleo.signal, 'relief')
  assert.equal(by.soybeans.signal, 'pressure'); assert.match(by.soybeans.reading, /\+3,1% contra média set\/26 vs ago\/26/)
  assert.equal(by.corn.signal, 'neutral')
  assert.equal(by.expectativas.signal, 'pressure'); assert.match(by.expectativas.reading, /4,80%.*2027: 4,00%.*meta 3,0%/)
  assert.equal(by.juros.signal, null); assert.match(by.juros.reading, /Selic 14,25% a\.a\. · Focus para o fim de 2026: 12,50%/)
  assert.deepEqual(FOCUS_BAND, { target: 3, floor: 1.5, ceiling: 4.5 })
})

test('fatores: expectativa dentro da banda é neutra, na meta ou abaixo alivia; dado ausente vira travessão sem sinal', () => {
  const f = (v) => factorRows({ focus: { rows: [{ label: 'IPCA', values: { 2026: { median: v } } }] } }).find((r) => r.id === 'expectativas').signal
  assert.equal(f(4.5), 'neutral'); assert.equal(f(3.2), 'neutral'); assert.equal(f(3), 'relief'); assert.equal(f(4.51), 'pressure')
  const empty = factorRows({})
  assert.ok(empty.every((r) => r.signal === null && r.reading === '—'))
})

test('mês a mês de um grupo: ordem cronológica, mês sem dado fica nulo e acumulado composto', async () => {
  const { groupMonthly, compound } = await import('../src/inflacao.js')
  const series = { periods: ['2026-07', '2026-08', '2026-09'], groups: [{ id: 7170, name: 'Alimentação e bebidas', byPeriod: { '2026-07': { mom: -0.3, weight: 21, y12: 4 }, '2026-09': { mom: 0.83, weight: 21.5, y12: 4.66 } } }] }
  const m = groupMonthly(series, 7170)
  assert.deepEqual(m.map((x) => x.period), ['2026-07', '2026-08', '2026-09'])
  assert.equal(m[1].mom, null); assert.equal(m[1].contribution, null); assert.ok(Math.abs(m[2].contribution - 0.17845) < 1e-9)
  assert.equal(groupMonthly(series, 999), null)
  assert.equal(compound([m[0].mom, m[1].mom]), null, 'sem todos os meses não há acumulado')
  assert.ok(Math.abs(compound([1, 1, 1]) - 3.0301) < 1e-9)
  assert.equal(compound([]), null)
})
