import test from 'node:test'
import assert from 'node:assert/strict'
import { parseOilHtml, buildOilData, oilFallback, isValidOilData } from '../scripts/oil-lib.mjs'
const html = (cells = ['63.10', '62.30', '61.35', '', '61.98']) => `<title>Europe Brent Spot Price FOB (Dollars per Barrel)</title><table><tr><td>2025 Dec-29 to Jan- 2</td>${cells.map((v) => `<td>${v}</td>`).join('')}</tr></table><td>Release Date: 01/05/2026</td><td>Next Release Date: 01/12/2026</td>`
test('parseia passagem de ano, feriado e datas de publicação', () => {
 const parsed = parseOilHtml(html())
 assert.deepEqual(parsed.points.at(-1), { date: '2026-01-02', value: 61.98 })
 assert.equal(parsed.points.length, 4)
 assert.equal(parsed.releaseDate, '2026-01-05')
 assert.equal(parsed.nextReleaseDate, '2026-01-12')
})
test('não transforma indicadores de ausência em zero', () => {
 const parsed = parseOilHtml(html(['NA', 'W', '-', '--', '61.98']))
 assert.equal(parsed.points.length, 1)
})
test('rejeita série errada, ausência, preço malformado e data futura', () => {
 assert.throws(() => parseOilHtml(html().replace('Brent', 'WTI')))
 assert.throws(() => parseOilHtml(html(['', '', '', '', ''])))
 assert.throws(() => parseOilHtml(html(['oops', '', '', '', '61.98'])))
 assert.throws(() => buildOilData(parseOilHtml(html()), new Date('2026-01-01T00:00:00Z')))
})
test('preserva timestamps e valor anterior em falhas, inclusive falhas repetidas', () => {
 const previous = buildOilData(parseOilHtml(html()), new Date('2026-01-05T15:00:00Z'))
 assert.ok(isValidOilData(previous))
 const stale = oilFallback(previous, new Error('timeout'))
 assert.equal(stale.generatedAt, previous.generatedAt)
 assert.equal(stale.observationDate, '2026-01-02')
 assert.equal(stale.value, 61.98)
 assert.equal(stale.stale, true)
 assert.equal(oilFallback(stale, 'HTTP 503').generatedAt, previous.generatedAt)
})
test('sem fallback válido expõe ausência, nunca zero nem horário de coleta fictício', () => {
 const result = oilFallback(null, 'timeout')
 assert.equal(result.value, null)
 assert.equal(result.generatedAt, null)
 assert.deepEqual(result.points, [])
 assert.equal(result.error, 'timeout')
})
test('corrupt fallback points cannot crash recovery', () => {
  assert.equal(isValidOilData({ points: {} }), false)
  const result = oilFallback({ points: {} }, 'unavailable')
  assert.equal(result.value, null)
  assert.deepEqual(result.points, [])
})
