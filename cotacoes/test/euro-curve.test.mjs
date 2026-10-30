import assert from 'node:assert/strict'
import test from 'node:test'
import { EURO_TENORS, euroCurveFile, parseEuroCurve } from '../scripts/euro-curve-lib.mjs'
import { normalizeEuroCurve } from '../src/euroCurve.js'

const HEAD = 'KEY,FREQ,REF_AREA,CURRENCY,PROVIDER_FM,INSTRUMENT_FM,PROVIDER_FM_ID,DATA_TYPE_FM,TIME_PERIOD,OBS_VALUE,OBS_STATUS,TITLE'
const row = (code, date, v) => `YC.B.U2.EUR.4F.G_N_A.SV_C_YM.${code},B,U2,EUR,4F,G_N_A,SV_C_YM,${code},${date},${v},A,"Yield curve spot rate, 10-year maturity - Svensson"`
const dias = (n) => Array.from({ length: n }, (_, i) => new Date(Date.UTC(2026, 0, 5 + i, 12)).toISOString().slice(0, 10)).filter((d) => ![0, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay()))
const csv = (dates, f = (i, j) => 2 + j * 0.1 + i * 0.001) => [HEAD, ...dates.flatMap((d, i) => EURO_TENORS.map(([code], j) => row(code, d, f(i, j).toFixed(4))))].join('\n')

test('curva do euro: um ponto por prazo e dia, em ordem de vencimento, com rótulo', () => {
  const all = parseEuroCurve(csv(dias(30)))
  const ds = Object.keys(all)
  assert.ok(ds.length >= 20)
  const c = all[ds[0]]
  assert.equal(c.length, 10); assert.deepEqual(c.map((p) => p[2]), ['3M', '6M', '1A', '2A', '3A', '5A', '7A', '10A', '20A', '30A'])
  assert.deepEqual(c.map((p) => p[0]), [0.25, 0.5, 1, 2, 3, 5, 7, 10, 20, 30])
})
test('curva do euro: dia com prazo faltando não vira curva incompleta; valor vazio não vira zero', () => {
  const ds = dias(30)
  const linhas = csv(ds).split('\n').filter((l) => !(l.includes('SR_30Y') && l.includes(ds[3])))
  const all = parseEuroCurve(linhas.join('\n'))
  assert.ok(!(ds[3] in all), 'dia incompleto fica de fora')
  assert.ok(ds[4] in all)
  const vazio = csv(ds).replace(/(SR_5Y,.{10}),[0-9.]+,A/, '$1,,A')
  assert.ok(Object.values(parseEuroCurve(vazio)).every((c) => c.every((p) => p[1] !== 0)))
})
test('curva do euro: recusa formato, data, taxa e vértice repetido inválidos', () => {
  const ds = dias(30)
  assert.throws(() => parseEuroCurve(''), /poucas linhas/)
  assert.throws(() => parseEuroCurve('a,b\n1,2'), /Formato/)
  assert.throws(() => parseEuroCurve(csv(ds) + '\n' + row('SR_1Y', '2026-02-30', 2)), /Data inválida/)
  assert.throws(() => parseEuroCurve(csv(ds) + '\n' + row('SR_1Y', '2026-12-01', 99)), /fora do esperado/)
  assert.throws(() => parseEuroCurve(csv(ds) + '\n' + row('SR_1Y', ds[0], 2)), /repetido/)
  assert.throws(() => parseEuroCurve(csv(dias(3))), /incompleta/)
  assert.ok(parseEuroCurve(csv(ds) + '\n' + row('OUTRO_PRAZO', '2026-12-01', 2))) // prazos não pedidos são ignorados
})
test('curva do euro: arquivo publicado traz as datas de comparação no formato do gráfico das curvas', () => {
  const f = euroCurveFile(parseEuroCurve(csv(Array.from({ length: 430 }, (_, i) => new Date(Date.UTC(2025, 5, 1 + i, 12)).toISOString().slice(0, 10)).filter((d) => ![0, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay())))), '2026-10-30T00:00:00Z')
  assert.equal(f.curve.id, 'euro-curve'); assert.match(f.curve.sourceUrl, /^https:\/\/www\.ecb\.europa\.eu/)
  assert.equal(f.curve.compare[0].id, 'hoje'); assert.equal(f.curve.sourceDate, f.curve.compare[0].date)
  assert.ok(f.curve.compare.length >= 6)
  for (const d of f.curve.compare) assert.equal(f.curve.curves[d.date].length, 10)
  const n = normalizeEuroCurve(f)
  assert.equal(n.compare.length, f.curve.compare.length); assert.equal(n.stale, false)
  assert.equal(euroCurveFile({}, 'x', { stale: true, error: 'HTTP 503' }).curve.error, 'HTTP 503')
})
test('curva do euro: tela recusa arquivo de outra série ou curva quebrada', () => {
  assert.throws(() => normalizeEuroCurve({ curve: { id: 'ipca' } }), /inválido/)
  assert.throws(() => normalizeEuroCurve({ curve: { id: 'euro-curve', checkedAt: 'x', compare: [{ date: '2026-10-29' }], curves: { '2026-10-29': [[1, 2, '1A']] } } }), /inválida/)
  assert.throws(() => normalizeEuroCurve({ curve: { id: 'euro-curve', checkedAt: 'x', compare: [{ date: '2026-10-29' }], curves: { '2026-10-29': [[1, 2, '1A'], [2, 2, '2A'], [3, 2, '3A'], [5, 2, '5A'], [7, null, '7A']] } } }), /inválida/)
})
