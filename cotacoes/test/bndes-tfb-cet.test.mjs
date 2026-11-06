import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { reconcileCreditoPequenasEmpresas as run } from '../src/bndesCreditoPequenasEmpresas.js'
import { fullInput } from './fixtures/bndes-tfb/full-input.mjs'

const ACT365_ORACLE = Number('0.20156889928931125684944')

test('CET completo: apuração do fluxo e divergência preservam a referência e a ressalva contratual', () => {
  const input = fullInput(), before = structuredClone(input)
  const result = run(input), { cet } = result
  assert.equal(result.ok, true)
  assert.equal(cet.reportedAnnualRateDecimal, '0.2001')
  // Valor confirmado separadamente com Decimal de 60 casas, sem o solver JS.
  assert.ok(Math.abs(cet.calculatedAnnualRateDecimal - ACT365_ORACLE) < 1e-12)
  assert.ok(Math.abs(cet.annualDifferencePercentagePoints - 0.14688992893112568) < 1e-10)
  assert.ok(Math.abs(cet.referenceResidualCents + 521424.4105164493) < 0.001)
  assert.ok(Math.abs(cet.residualCents) < 0.001)
  assert.equal(cet.calculationStatus, 'calculated-declared-cash-flow')
  assert.equal(cet.status, 'reference-mismatch')
  assert.equal(cet.dayCount, 'actual-365-fixed')
  assert.equal(cet.interval, 'elapsed-days')
  assert.equal(cet.validated, false)
  assert.equal(result.cashFlowComplete, false)
  assert.equal(result.horizon.completeContractFlow, false)
  assert.equal(result.validationStatus, 'estimate-not-contract-validated')
  assert.ok(result.warnings.some(text => text.includes('diverge da referência')))
  assert.deepEqual(input, before)
})

test('referência compatível na apresentação não substitui o CET calculado nem certifica contrato', () => {
  const input = fullInput()
  input.reportedCet.annualRateDecimal = '0.2016'
  const { cet, warnings } = run(input)
  assert.equal(cet.status, 'reference-consistent-at-display-precision')
  assert.equal(cet.reportedAnnualRateDecimal, '0.2016')
  assert.notEqual(cet.calculatedAnnualRateDecimal, 0.2016)
  assert.ok(Math.abs(cet.annualDifferencePercentagePoints) < cet.referenceTolerancePercentagePoints)
  assert.equal(cet.validated, false)
  assert.ok(!warnings.some(text => text.includes('diverge da referência')))
})

test('fluxo completo dispensa referência para apurar o CET e não inventa comparação', () => {
  for (const reference of [undefined, null]) {
    const input = fullInput()
    input.reportedCet = reference
    const { cet } = run(input)
    assert.equal(cet.status, 'calculated-no-reference')
    assert.ok(Math.abs(cet.calculatedAnnualRateDecimal - ACT365_ORACLE) < 1e-12)
    assert.equal(cet.reportedAnnualRateDecimal, null)
    assert.equal(cet.annualDifferencePercentagePoints, null)
    assert.equal(cet.referenceResidualCents, null)
    assert.equal(cet.validated, false)
  }
})

test('horizonte parcial continua sem CET, mesmo com taxa de referência e imposto total conhecidos', () => {
  const input = fullInput()
  input.horizon = { lastNominalDate: '2028-02-15', observedRowCount: 13, source: 'Trecho inicial de teste.' }
  const result = run(input)
  assert.equal(result.ok, true)
  assert.equal(result.rows.length, 13)
  assert.equal(result.horizon.unshownEventCount, 21)
  assert.deepEqual(result.cet, {
    reportedAnnualRateDecimal: '0.2001', calculatedAnnualRateDecimal: null,
    validated: false, status: 'not-validated-incomplete-evidence',
  })
})

// Um único recebimento e uma única cobrança permitem conferir a taxa por fórmula
// fechada, sem usar o solver ou as parcelas do cenário fotografado como oráculo.
function singlePayment() {
  const input = fullInput()
  Object.assign(input, { principalCents: 100000, termMonths: 1, graceMonths: 0, fees: [], reportedCet: null })
  input.annualRate.decimal = '0'
  input.calendar = { ...input.calendar, coverageFrom: '2026-10-01', holidays: [] }
  input.horizon = { lastNominalDate: '2026-12-15', observedRowCount: 1, source: 'Fluxo sintético para fórmula fechada.' }
  input.tax.additionalRateDecimal = '0'
  input.tax.dailyRateDecimal = '0'
  return input
}

test('fluxo sem encargos tem CET zero, inclusive quando a referência zero é informada', () => {
  const input = singlePayment()
  input.reportedCet = { annualRateDecimal: '0', source: 'Referência sintética.', status: 'observed' }
  const result = run(input)
  assert.equal(result.ok, true)
  assert.equal(result.cet.calculatedAnnualRateDecimal, 0)
  assert.equal(result.cet.residualCents, 0)
  assert.equal(result.cet.status, 'reference-consistent-at-display-precision')
  assert.equal(result.cet.validated, false)
})

test('fórmula fechada confere tarifa na cobrança e IOF descontado uma única vez', () => {
  const input = singlePayment()
  input.tax.additionalRateDecimal = '0.01'
  input.fees = [{ amountCents: 10000, settlement: 'first-payment', source: 'Tarifa sintética.', status: 'observed' }]
  const result = run(input)
  assert.equal(result.ok, true)
  assert.equal(result.cashFlows.length, 2)
  assert.equal(result.cashFlows[0].netCashCents, 99000)
  assert.equal(result.cashFlows[1].netCashCents, -110000)
  const expected = (110000 / 99000) ** (365 / 50) - 1
  assert.ok(Math.abs(result.cet.calculatedAnnualRateDecimal - expected) < 1e-12)
})

test('CET usa dias corridos/365 mesmo com 29 de fevereiro no intervalo', () => {
  const input = singlePayment()
  input.releaseDate = '2028-01-15'
  input.nominalGraceStart.date = '2028-02-15'
  input.calendar.coverageFrom = '2028-01-01'
  input.horizon.lastNominalDate = '2028-03-15'
  input.fees = [{ amountCents: 10000, settlement: 'first-payment', source: 'Tarifa sintética.', status: 'observed' }]
  const result = run(input)
  assert.equal(result.ok, true)
  assert.equal(result.rows[0].days, 60)
  const expected = 1.1 ** (365 / 60) - 1
  assert.ok(Math.abs(result.cet.calculatedAnnualRateDecimal - expected) < 1e-12)
  assert.notEqual(result.cet.calculatedAnnualRateDecimal, 1.1 ** (366 / 60) - 1)
})

test('solucionador não limita a taxa anual a um teto arbitrário em fluxo convencional', () => {
  const input = singlePayment()
  input.tax.additionalRateDecimal = '0.99999'
  const result = run(input)
  assert.equal(result.ok, true)
  assert.equal(result.netDisbursementCents, 1)
  const expected = 100000 ** (365 / 50) - 1
  assert.ok(Number.isFinite(result.cet.calculatedAnnualRateDecimal))
  assert.ok(result.cet.calculatedAnnualRateDecimal > 1024)
  assert.ok(Math.abs(result.cet.calculatedAnnualRateDecimal / expected - 1) < 1e-12)
  assert.ok(Math.abs(result.cet.residualCents) < 0.001)
})

test('relatório de reconciliação preserva as parcelas e publica o CET apurado pelo motor vigente', () => {
  const stored = JSON.parse(readFileSync(new URL('../../docs/bndes-tfb-research/RECONCILIACAO-COMPLETA.json', import.meta.url), 'utf8'))
  const current = run(fullInput())
  assert.equal(stored.calculation.profile.version, current.profile.version)
  assert.deepEqual(stored.calculation.rows, current.rows)
  assert.deepEqual(stored.calculation.cashFlows, current.cashFlows)
  assert.ok(Math.abs(stored.calculation.cet.calculatedAnnualRateDecimal - current.cet.calculatedAnnualRateDecimal) < 1e-12)
  assert.equal(stored.calculation.cet.reportedAnnualRateDecimal, '0.2001')
  assert.equal(stored.report.calculatedAnnualCetPercentDisplayed, '20.16')
  assert.equal(stored.report.cetStatus, 'reference-mismatch')
  assert.equal(stored.calculation.cet.validated, false)
  assert.equal(stored.calculation.cashFlowComplete, false)
})
