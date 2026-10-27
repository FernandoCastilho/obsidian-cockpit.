import assert from 'node:assert/strict'
import test from 'node:test'
import { formatMoneyText } from '../src/moneyInput.js'

test('máscara de valor: formata ao sair do campo e respeita o que é inválido', () => {
  assert.equal(formatMoneyText('1000000'), '1.000.000,00')
  assert.equal(formatMoneyText('1000,5'), '1.000,50')
  assert.equal(formatMoneyText('1.000.000,00'), '1.000.000,00')
  assert.equal(formatMoneyText('0'), '0,00')
  assert.equal(formatMoneyText('1,000.50'), '1,000.50')
  assert.equal(formatMoneyText('abc'), 'abc')
  assert.equal(formatMoneyText(''), '')
})
