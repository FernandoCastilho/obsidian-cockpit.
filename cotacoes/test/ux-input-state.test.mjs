import test from 'node:test'
import assert from 'node:assert/strict'
import { parseMoneyInput } from '../src/moneyInput.js'
import { parseNum } from '../src/calc.js'
import { intradaySelection } from '../src/intradayState.js'
import { dataTimestamp } from '../src/dataTimestamp.js'
import { giro } from '../src/giro.js'

test('Brazilian money accepts explicit grouping and plain integers without changing calculations', () => {
  for (const input of ['1.000,00', '1000', '1000,00', ' 1.000,00 ']) {
    const amount = parseMoneyInput(input)
    assert.deepEqual(amount, { ok: true, value: 1000 })
    assert.equal(giro({ value: amount.value, n: 1, structure: 'price', rate: 0, start: '2026-10-25' }).totalPaid, 1000)
  }
  assert.equal(parseMoneyInput('0,50').value, 0.5)
  assert.equal(parseMoneyInput('', { optional: true }).value, 0)
})
test('foreign, malformed and out of range money cannot silently calculate', () => {
  for (const input of ['1,000.00', '1,000', '1.00', '10.00,00', '1e3', 'Infinity', '-100', '', 'abc', '1 000', '999999999999999999999']) {
    assert.equal(parseMoneyInput(input).ok, false, input)
  }
  assert.ok(Number.isNaN(parseNum('1,000.00')))
  assert.ok(Number.isNaN(parseNum('10.00,00')))
})
test('empty intraday uses retained samples rather than weekday assumptions or future points', () => {
  const points = [
    { t: new Date(2026, 9, 23, 12).getTime(), bid: 5 },
    { t: new Date(2026, 9, 26, 12).getTime(), bid: 6 },
    { t: new Date(2026, 9, 24, 12).getTime(), bid: 0 },
  ]
  assert.deepEqual(intradaySelection(points, '2026-10-25'), { points: [], previousDay: '2026-10-23' })
  assert.equal(intradaySelection(points, '2026-10-23').points.length, 1)
  assert.equal(intradaySelection([], '2026-10-25').previousDay, null)
})
test('timestamp identifies real date and Brasília timezone, missing stays missing', () => {
  assert.match(dataTimestamp('2026-10-25T01:23:00Z'), /24\/10\/2026.*22:23.*Brasília/)
  assert.equal(dataTimestamp(null), 'data não disponível')
  assert.equal(dataTimestamp('invalid'), 'data não disponível')
})
