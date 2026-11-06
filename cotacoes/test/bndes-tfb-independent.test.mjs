import test from 'node:test'
import assert from 'node:assert/strict'
import { exampleInput } from './fixtures/credito-pequenas-empresas.mjs'
import { reconcileCreditoPequenasEmpresas as run } from '../src/bndesCreditoPequenasEmpresas.js'

test('auditoria: evidência permanece parcial e caixa separa tributo e tarifa', () => {
  const result = run(exampleInput())
  assert.equal(result.ok, true)
  assert.equal(result.rows.length, 13)
  assert.equal(result.iof.totalCents, 9418273)
  assert.equal(result.netDisbursementCents, 290581727)
  assert.equal(result.rows[0].paymentCents, 15252044)
  assert.equal(result.firstCashOutCents, 15472044)
  assert.equal(result.horizon.unshownEventCount, 21)
  assert.equal(result.cet.validated, false)
  assert.equal(result.cet.calculatedAnnualRateDecimal, null)
})

test('auditoria: elemento de tarifa nulo deve bloquear, não lançar TypeError', () => {
  for (const fee of [null, undefined]) {
    const input = exampleInput()
    input.fees = [fee]
    const result = run(input)
    assert.equal(result.ok, false)
    assert.deepEqual(result.rows, [])
  }
})

test('auditoria: tarifa financiada não pode ser silenciosamente cobrada à vista', () => {
  const input = exampleInput()
  input.fees[0].financed = true
  assert.equal(run(input).ok, false)
})

test('auditoria: juro de um ano com empate exato deve arredondar half-up', () => {
  const input = exampleInput()
  Object.assign(input, { principalCents: 300000004, releaseDate: '2026-02-15', termMonths: 4, graceMonths: 3, fees: [] })
  input.annualRate.decimal = '0.375'
  input.horizon.lastNominalDate = '2027-02-15'
  input.horizon.observedRowCount = 1
  input.tax.dailyRateDecimal = '0'
  input.tax.additionalRateDecimal = '0'
  const result = run(input)
  assert.equal(result.ok, true)
  assert.equal(result.rows[0].days, 365)
  // Principal * 3/8 = 112500001.5 centavos, exatamente.
  assert.equal(result.rows[0].interestCents, 112500002)
})

test('auditoria: residual SAC impossível deve bloquear mesmo no horizonte parcial', () => {
  const input = exampleInput()
  input.principalCents = 50
  input.tax.dailyRateDecimal = '0'
  input.tax.additionalRateDecimal = '0'
  input.fees = []
  assert.equal(run(input).ok, false)
})

test('auditoria: saída de caixa deve respeitar o mesmo teto técnico dos valores', () => {
  const input = exampleInput()
  input.fees[0].amountCents = 1_000_000_000_000
  assert.equal(run(input).ok, false)
})
