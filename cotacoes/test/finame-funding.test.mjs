import assert from 'node:assert/strict'
import test from 'node:test'
import { finameFundingAnnualRate, finameFundingOption } from '../src/finameFunding.js'

test('LCD usa a projeção própria e não trata LD1 ou índice 143 como taxa completa', () => {
  const lcd = finameFundingOption('lcd')
  assert.equal(lcd.mode, 'dedicated')
  assert.equal(lcd.calculatorId, 'bndes-selic-lcd')
  for (const id of ['lcd', 'LD1', '143']) {
    assert.equal(finameFundingAnnualRate(id, { lcd: -0.11, LD1: -0.11, 143: 1.256392, tlp: 6 }), null)
  }
})

test('TFBD não calcula com cotação 604 nem reutiliza taxa anterior ao trocar de modalidade', () => {
  const quotes = { tfc: 13, tfb: 14, tlp: 6, tfbd: 5, 604: 5.5 }
  assert.equal(finameFundingAnnualRate('tfc', quotes), 13)
  assert.equal(finameFundingAnnualRate('tfbd', quotes), null)
  assert.equal(finameFundingAnnualRate('604', quotes), null)
  assert.equal(finameFundingOption('tfbd').mode, 'unavailable')
  assert.deepEqual(finameFundingOption('tfbd').referenceCodes, ['TD1', 'TD2', 'TD3', '604'])
})

test('perfis existentes aceitam zero explícito e recusam ausência, string e taxa inválida', () => {
  for (const id of ['tfc', 'tfb']) {
    assert.equal(finameFundingAnnualRate(id, { [id]: 0 }), 0)
    assert.equal(finameFundingAnnualRate(id, { [id]: 6.5 }), 6.5)
    for (const value of [null, undefined, '', '6.5', NaN, Infinity, -1, 101]) {
      assert.equal(finameFundingAnnualRate(id, { [id]: value }), null)
    }
  }
})


test('TLP exigível tem motor próprio e nunca reutiliza o cronograma capitalizado', () => {
  assert.equal(finameFundingOption('tlp').mode, 'dedicated')
  assert.equal(finameFundingOption('tlp').calculatorId, 'bndes-tlp-exigivel')
  assert.equal(finameFundingAnnualRate('tlp', { tlp: 8.12 }), null)
})
