import assert from 'node:assert/strict'
import test from 'node:test'
import { bandeiraDe } from '../src/paises.js'
import { hasFlag } from '../src/flags.js'
import { policyRows } from '../src/policyRates.js'

test('bandeira pelo país no começo do rótulo', () => {
  assert.equal(bandeiraDe('Brasil · Selic meta'), 'BRL')
  assert.equal(bandeiraDe('EUA · Fed (faixa-alvo)'), 'USD')
  assert.equal(bandeiraDe('Área do euro · BCE (depósito)'), 'EUR')
  assert.equal(bandeiraDe('Japão · Meta overnight'), 'JPY')
  for (const c of ['BRL', 'USD', 'EUR', 'JPY']) assert.ok(hasFlag(c), c)
})
test('rótulo sem país conhecido não ganha bandeira', () => {
  assert.equal(bandeiraDe('CDI a termo implícito'), null)
  assert.equal(bandeiraDe(''), null)
  assert.equal(bandeiraDe(undefined), null)
  assert.equal(bandeiraDe('Reino Unido · Bank Rate'), null)
})
test('Juros: quatro bancos centrais do quadro de política monetária viram três, sem Reino Unido', () => {
  const rows = policyRows({ series: {} }, [{ id: 'day', date: '2026-10-30' }])
  assert.deepEqual(rows.map((r) => r.id), ['FED', 'ECB', 'BOJ'])
  assert.ok(rows.every((r) => bandeiraDe(r.label)), 'toda linha de país tem bandeira')
  assert.ok(!JSON.stringify(rows).match(/Reino Unido|Bank Rate|England/i))
})
