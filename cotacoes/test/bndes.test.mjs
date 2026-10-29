import assert from 'node:assert/strict'
import test from 'node:test'
import { BNDES_SERIES, buildBndes, fillSeriesFromPrevious, parseTxt, txtUrl } from '../scripts/bndes-lib.mjs'
import { bndesRows, change, keyOf, pointsOf } from '../src/bndes.js'

const TXT = 'data;\tvalor\n06/04/2020;\t5,71383300\n07/04/2020;\t5,61416800\r\n07/04/2020;\t5,60000000\nlixo;\t1\n31/02/2021;\t5\n08/04/2020;\t0\n09/04/2020;\t1.234,5\n10/04/2020;\t5,57789300\n'

test('parseTxt: vírgula decimal, ordem, dia repetido (vale o último) e linhas inválidas fora', () => {
  assert.deepEqual(parseTxt(TXT), [['2020-04-06', 5.713833], ['2020-04-07', 5.6], ['2020-04-10', 5.577893]])
  assert.deepEqual(parseTxt(null), [])
})

test('buildBndes: 8 séries (4 prazos × liberação 30 e 90); falha vira ausência e volta do arquivo anterior', () => {
  assert.equal(BNDES_SERIES.length, 8)
  assert.equal(txtUrl('TFB_60_90'), 'https://www.bndes.gov.br/apoioFinanceiro/rest/taxas/TFB_60_90.txt')
  const out = buildBndes({ TFB_60_90: TXT, TFB_36_30: null }, ['TFB_36_30: HTTP 502'], 1000)
  assert.deepEqual(Object.keys(out.series), ['TFB_60_90'])
  assert.deepEqual(out.series.TFB_60_90.points[0], ['2020-04-06', 5.7138])
  const prev = { generatedAt: 500, series: { TFB_36_30: { prazo: 36, liberacao: 30, points: [['2020-04-06', 4.8]] } } }
  fillSeriesFromPrevious(out, prev)
  assert.equal(out.stale.TFB_36_30, 500)
  assert.ok(out.series.TFB_36_30)
})

const data = { generatedAt: 1, stale: {}, series: { TFB_60_90: { prazo: 60, liberacao: 90, points: [['2025-10-29', 12.5], ['2026-09-28', 14.0], ['2026-10-28', 16.27], ['2026-10-29', 16.38]] }, TFB_36_30: { prazo: 36, liberacao: 30, points: [['2026-10-29', 15.6]] } } }

test('bndesRows: 8 linhas, variações no dia, no mês e no ano; série sem histórico fica sem variação, ausente fica marcada', () => {
  const rows = bndesRows(data)
  assert.equal(rows.length, 8)
  assert.deepEqual(rows.map((r) => r.key).slice(0, 4), ['TFB_36_30', 'TFB_36_90', 'TFB_60_30', 'TFB_60_90'])
  const r = rows.find((x) => x.key === 'TFB_60_90')
  assert.equal(r.text, '16,38% a.a.'); assert.equal(r.date, '2026-10-29')
  assert.equal(r.day.text, '▲ +0,11 p.p.'); assert.equal(r.month.ref, '2026-09-28'); assert.equal(r.month.text, '▲ +2,38 p.p.')
  assert.equal(r.year.ref, '2025-10-29'); assert.equal(r.year.text, '▲ +3,88 p.p.')
  const one = rows.find((x) => x.key === 'TFB_36_30')
  assert.equal(one.day, null); assert.equal(one.month, null); assert.equal(one.year, null)
  assert.equal(rows.find((x) => x.key === 'TFB_84_90').missing, true)
  assert.equal(bndesRows(null).every((x) => x.missing), true)
})

test('change: igual, queda e referência ausente', () => {
  assert.equal(change(5, ['d', 5.001]).dir, 'same'); assert.equal(change(4, ['d', 5]).text, '▼ −1,00 p.p.'); assert.equal(change(4, null), null)
  assert.deepEqual(pointsOf(data, keyOf(60, 90)).at(-1), ['2026-10-29', 16.38]); assert.deepEqual(pointsOf(null, 'x'), [])
})
