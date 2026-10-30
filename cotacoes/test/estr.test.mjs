import assert from 'node:assert/strict'
import test from 'node:test'
import { estrFile, parseEstr } from '../scripts/estr-lib.mjs'

const HEAD = 'KEY,FREQ,REF_AREA,TIME_PERIOD,OBS_VALUE,OBS_STATUS,TITLE'
const csv = (rows) => [HEAD, ...rows.map(([d, v]) => `EST.B.EU000A2X2A25.WT,B,U2,${d},${v},A,"Euro short-term rate - Volume-weighted trimmed mean rate, 1 day"`)].join('\n')
const dias = (n, f = (i) => 2 + i / 1000) => Array.from({ length: n }, (_, i) => [new Date(Date.UTC(2026, 0, 1 + i, 12)).toISOString().slice(0, 10), f(i).toFixed(3)])

test('€STR: lê data e valor pelo nome da coluna, com título entre aspas e vírgulas', () => {
  const p = parseEstr(csv(dias(120)))
  assert.equal(p.length, 120); assert.deepEqual(p[0], { date: '2026-01-01', value: 2 }); assert.equal(p.at(-1).value, 2.119)
  assert.ok(p.every((x, i) => i === 0 || p[i - 1].date < x.date))
})
test('€STR: valor negativo é válido; dia sem valor não vira zero', () => {
  const rows = dias(120, (i) => -0.5 + i / 1000); rows.splice(5, 0, ['2026-06-30', ''])
  const p = parseEstr(csv(rows))
  assert.equal(p.length, 120); assert.equal(p[0].value, -0.5); assert.ok(!p.some((x) => x.date === '2026-06-30'))
})
test('€STR: ordena e recusa formato, data, valor e repetição inválidos', () => {
  const rows = dias(120); const rev = [...rows].reverse()
  assert.equal(parseEstr(csv(rev))[0].date, '2026-01-01')
  assert.throws(() => parseEstr(''), /poucas linhas/)
  assert.throws(() => parseEstr('a,b\n1,2'), /Formato/)
  assert.throws(() => parseEstr(csv([...rows, ['2026-02-30', '2']])), /Data inválida/)
  assert.throws(() => parseEstr(csv([...rows, ['2027-01-01', 'abc']])), /fora do esperado/)
  assert.throws(() => parseEstr(csv([...rows, ['2027-01-01', '99']])), /fora do esperado/)
  assert.throws(() => parseEstr(csv([...rows, rows[3]])), /repetida/)
  assert.throws(() => parseEstr(csv(dias(30))), /incompleta/)
})
test('€STR: arquivo publicado guarda fonte, conferência e pontos', () => {
  const f = estrFile(parseEstr(csv(dias(120))), '2026-10-30T00:00:00Z')
  assert.equal(f.series.id, 'estr'); assert.match(f.series.sourceUrl, /^https:\/\/www\.ecb\.europa\.eu/); assert.equal(f.series.stale, false)
  assert.equal(estrFile([], 'x', { stale: true, error: 'HTTP 503' }).series.error, 'HTTP 503')
})

import { estrChartPoints, estrRow, normalizeEstr } from '../src/estr.js'
const periods = [{ id: 'day', date: '2026-10-29' }, { id: 'month', date: '2026-09-29' }, { id: 'year', date: '2020-01-02' }, { id: 'antes', date: '2019-01-01' }]
const serie = () => normalizeEstr(estrFile([{ date: '2020-01-02', value: -0.543 }, { date: '2026-09-29', value: 1.925 }, { date: '2026-10-28', value: 1.931 }, { date: '2026-10-30', value: 1.94 }], '2026-10-30T00:00:00Z'))
test('€STR: linha do quadro usa a última observação até a data, com três casas, sem usar dado futuro', () => {
  const r = estrRow(serie(), periods)
  assert.equal(r.label, 'Área do euro · €STR overnight'); assert.match(r.unit, /overnight/)
  assert.equal(r.cells.day.value, '1,931%'); assert.equal(r.cells.day.date, '28/10/2026')
  assert.equal(r.cells.month.value, '1,925%'); assert.equal(r.cells.year.value, '-0,543%')
  assert.equal(r.cells.antes.value, '—'); assert.match(r.cells.antes.status, /Sem observação/)
})
test('€STR: sem arquivo, carregando ou fonte pendente não inventa valor', () => {
  assert.equal(estrRow(null, periods, { loading: true }).cells.day.status, 'Carregando fonte oficial…')
  assert.equal(estrRow(null, periods, { error: true }).cells.day.value, '—')
  const stale = estrRow({ ...serie(), stale: true }, periods)
  assert.equal(stale.cells.day.value, '1,931%'); assert.match(stale.cells.day.status, /pendente/)
})
test('€STR: valida o arquivo e monta a série do gráfico', () => {
  assert.throws(() => normalizeEstr({ series: { id: 'ipca', points: [], checkedAt: 'x' } }), /inválido/)
  assert.throws(() => normalizeEstr({ series: { id: 'estr', checkedAt: 'x', points: [{ date: '2026-01-01', value: 1 }, { date: '2026-01-01', value: 2 }] } }), /inválido/)
  const pts = estrChartPoints(serie())
  assert.equal(pts.length, 4); assert.equal(pts[0].t, Date.parse('2020-01-02T12:00:00Z')); assert.equal(pts.at(-1).bid, 1.94)
})
