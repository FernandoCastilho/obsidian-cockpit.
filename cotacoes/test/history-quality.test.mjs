import test from 'node:test'
import assert from 'node:assert/strict'
import { historyQuality, validHistoryPoints } from '../src/historyQuality.js'
import { pickCentral } from '../src/useHistory.js'

const friday = Date.parse('2026-10-23T15:00:00Z')
test('histórico: sucesso HTTP não torna coleta antiga atual', () => {
  assert.match(historyQuality({ generatedAt: friday - 9 * 3600000, points: [] }, friday), /atrasada/)
  assert.equal(historyQuality({ generatedAt: friday - 7 * 3600000, points: [] }, friday), '')
  assert.match(historyQuality({ generatedAt: friday - 46 * 60000, points: [], intraday: true }, friday), /atrasada/)
  assert.match(historyQuality({ points: [] }, friday), /não informada/)
  assert.match(historyQuality({ generatedAt: friday + 2 * 60000, points: [] }, friday), /futuro/)
})
test('histórico: pausa esperada no fim de semana não vira falha de coleta', () => {
  const saturday = Date.parse('2026-10-24T15:00:00Z')
  const lastRun = Date.parse('2026-10-24T02:07:00Z')
  assert.equal(historyQuality({ generatedAt: lastRun, points: [], intraday: true }, saturday), '')
})
test('histórico: intervalo incompleto é explícito sem inventar pontos', () => {
  const points = [{ t: friday - 7 * 86400000, bid: 5 }]
  assert.match(historyQuality({ generatedAt: friday, points, end: friday }, friday), /Cobertura parcial/)
  assert.equal(historyQuality({ generatedAt: friday, points: [{ t: friday - 3 * 86400000, bid: 5 }], end: friday }, friday), '')
})
test('histórico: remove dados inválidos, ordena e preserva a data real da coleta', () => {
  const points = [{ t: friday, bid: 5 }, null, { t: 1, bid: 0 }, { t: NaN, bid: 5 }, { t: friday - 86400000, bid: 4 }]
  assert.deepEqual(validHistoryPoints(points).map(p => p.bid), [4, 5])
  const result = pickCentral({ generatedAt: friday, series: { USD: { source: 'USD', points } } }, 'USD', new Date(friday - 86400000), new Date(friday))
  assert.equal(result.generatedAt, friday)
  assert.equal(result.points.length, 2)
  assert.equal(points.length, 5)
})
