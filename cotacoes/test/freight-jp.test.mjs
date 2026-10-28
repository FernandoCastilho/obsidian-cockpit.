import test from 'node:test'
import assert from 'node:assert/strict'
import { BOJ_SERIES, freightJpFile, parseBoj } from '../scripts/freight-jp-lib.mjs'
const payload = (dates, values, extra = {}) => ({ STATUS: 200, MESSAGE: 'ok', NEXTPOSITION: null, RESULTSET: [{ SERIES_CODE: BOJ_SERIES, VALUES: { SURVEY_DATES: dates, VALUES: values } }], ...extra })

test('BoJ: converte AAAAMM em período e descarta mês sem dado (null), sem virar zero', () => {
  const { points, next } = parseBoj(payload([202601, 202602, 202603], [100.5, null, 102.25]))
  assert.deepEqual(points, [{ period: '2026-01', value: 100.5 }, { period: '2026-03', value: 102.25 }])
  assert.equal(next, null)
})

test('BoJ: devolve a próxima posição quando a resposta é paginada', () => {
  assert.equal(parseBoj(payload([202601], [100], { NEXTPOSITION: 251 })).next, 251)
})

test('BoJ: recusa status de erro, série trocada, tamanhos diferentes, mês e valor inválidos', () => {
  assert.throws(() => parseBoj({ STATUS: 400, MESSAGE: 'erro' }), /não confirmou/)
  assert.throws(() => parseBoj({ STATUS: 200, RESULTSET: [{ SERIES_CODE: 'OUTRA' }] }), /incompatível/)
  assert.throws(() => parseBoj(payload([202601, 202602], [1])), /inconsistentes/)
  assert.throws(() => parseBoj(payload([202613], [1])), /Mês inválido/)
  assert.throws(() => parseBoj(payload([202601], [-3])), /Valor inválido/)
  assert.throws(() => parseBoj(null), /não confirmou/)
})

test('BoJ: arquivo publicado identifica a série, a base e a fonte', () => {
  const f = freightJpFile([{ period: '2026-01', value: 100 }], '2026-10-28T00:00:00Z')
  assert.equal(f.series.id, 'freight-jp-sppi'); assert.match(f.series.unit, /2020 = 100/); assert.match(f.series.sourceUrl, /boj\.or\.jp/)
})
