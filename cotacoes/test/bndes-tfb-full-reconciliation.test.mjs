import test from 'node:test'
import assert from 'node:assert/strict'
import { fullRows, printedTotals, observedNonBusinessDates } from './fixtures/bndes-tfb/full-evidence.mjs'
import { fullInput } from './fixtures/bndes-tfb/full-input.mjs'
import { reconcileCreditoPequenasEmpresas } from '../src/bndesCreditoPequenasEmpresas.js'
import { datedReturnActual365 } from './fixtures/bndes-tfb/dated-return.mjs'

const result = () => reconcileCreditoPequenasEmpresas(fullInput())
const sum = key => fullRows.reduce((total, row) => total + row[key], 0)

test('todas as 34 linhas: 204 campos coincidem exatamente', () => {
  const output = result()
  assert.equal(output.ok, true)
  assert.equal(output.rows.length, 34)
  for (let index = 0; index < fullRows.length; index++) {
    for (const key of ['number', 'date', 'openingCents', 'interestCents', 'principalCents', 'paymentCents']) assert.equal(output.rows[index][key], fullRows[index][key], `Linha ${index + 1}: ${key}`)
  }
  assert.equal(output.rows.at(-1).closingCents, 0)
})

test('centavos do SAC: saldo dividido pelas amortizações restantes a cada evento', () => {
  let balance = 300000000
  for (let index = 1; index < fullRows.length; index++) {
    const expected = Math.floor(balance / (34 - index) + 0.5)
    assert.equal(fullRows[index].principalCents, expected)
    balance -= expected
  }
  assert.equal(balance, 0)
  assert.deepEqual(fullRows.filter(row => row.principalCents === 9090910).map(row => row.number), [29, 31, 33])
  assert.equal(fullRows.at(-1).principalCents, 9090909)
})

test('ajuste adicional de junho de 2028 é dado observado, não calendário presumido', () => {
  assert.ok(observedNonBusinessDates.includes('2028-06-15'))
  assert.equal(result().rows[16].date, '2028-06-16')
  const input = fullInput()
  input.calendar.holidays = input.calendar.holidays.filter(date => date !== '2028-06-15')
  const missing = reconcileCreditoPequenasEmpresas(input)
  assert.equal(missing.rows[16].date, '2028-06-15')
  assert.notEqual(missing.rows[16].interestCents, 2328571)
  assert.notEqual(missing.rows[17].interestCents, 2130009)
})

test('IOF total e caixa de liberação permanecem iguais com todos os prazos disponíveis', () => {
  const output = result()
  assert.equal(output.iof.totalCents, 9418273)
  assert.equal(output.iof.unshownPrincipalAtCapCents, 0)
  assert.equal(output.iof.calculationBases.length, 33)
  assert.equal(output.netDisbursementCents, 290581727)
  assert.equal(output.firstCashOutCents, 15472044)
})

test('totais impressos são exatamente soma das linhas mais R$ 2.200,00', () => {
  assert.equal(sum('interestCents'), 84297058)
  assert.equal(sum('principalCents'), 300000000)
  assert.equal(sum('paymentCents'), 384297058)
  assert.equal(printedTotals.interestCents - sum('interestCents'), 220000)
  assert.equal(printedTotals.paymentCents - sum('paymentCents'), 220000)
  assert.equal(result().cashFlows.slice(1).reduce((total, flow) => total + flow.cashOutCents, 0), printedTotals.paymentCents)
  assert.equal(printedTotals.paymentCents + result().iof.totalCents, 393935331)
})

test('taxa do fluxo ACT/365 não coincide com o CET anual informado', () => {
  const flows = result().cashFlows.map(flow => ({ date: flow.date, amountCents: flow.netCashCents }))
  const measured = datedReturnActual365(flows)
  assert.ok(Math.abs(measured.annualRate - 0.201568899289) < 1e-10)
  assert.ok(Math.abs(measured.residualCents) < 0.001)
  assert.notEqual((100 * measured.annualRate).toFixed(2), '20.01')
  assert.equal(measured.regulatoryCetValidated, false)
  assert.equal(result().cet.validated, false)
  const baseDate = Date.parse('2026-10-26T00:00:00Z')
  const residualAtReportedRate = flows.reduce((total, flow) => total + flow.amountCents / (1.2001 ** ((Date.parse(`${flow.date}T00:00:00Z`) - baseDate) / 86400000 / 365)), 0)
  assert.ok(Math.abs(residualAtReportedRate + 521424.4105166) < 0.001)
})

test('1,51% mensal é compatível com anual informado20,01 usando30/365, não prova erro', () => {
  const monthlyThirtyDays = Math.expm1(Math.log1p(0.2001) * 30 / 365)
  assert.equal((100 * monthlyThirtyDays).toFixed(2), '1.51')
  assert.equal((100 * Math.expm1(Math.log1p(0.2001) / 12)).toFixed(2), '1.53')
})

test('XIRR independente confere fluxo sintético de um ano e rejeita não convencional', () => {
  const rate = datedReturnActual365([{ date: '2026-01-01', amountCents: 10000 }, { date: '2027-01-01', amountCents: -11000 }])
  assert.ok(Math.abs(rate.annualRate - 0.1) < 1e-12)
  assert.throws(() => datedReturnActual365([{ date: '2026-01-01', amountCents: 10000 }, { date: '2027-01-01', amountCents: 11000 }]), /convencional/)
})
