import test from 'node:test'
import assert from 'node:assert/strict'
import { loan, loanDates, monthlyRate, compareSystems, MAX_LOAN_MONEY } from '../src/emprestimo.js'

const base = { value: 100000, n: 12, rate: 2, unit: 'am', system: 'price', start: '2026-11-06', firstDue: '2026-12-06' }
const near = (actual, expected, tolerance = 0.005) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`)

test('F4 Giro: taxa positiva ínfima nunca produz juros negativos nem -R$ 0,00', () => {
  for (const rate of [1e-16, 1e-12, 1e-8, 0, -0]) {
    for (const system of ['price', 'sac', 'bullet']) {
      const result = loan({ ...base, rate, system })
      assert.equal(result.ok, true)
      assert.ok(result.interest >= 0)
      assert.equal(Object.is(result.interest, -0), false)
      if (rate > 0) assert.ok(result.interest > 0)
      near(result.total, base.value + result.interest + result.iof)
    }
  }
  near(loan({ ...base, rate: 1e-16 }).interest, 6.5e-13, 1e-25)
})

test('F4 Giro: magnitude financeira insegura é bloqueada, mesmo quando finita', () => {
  const enormous = loan({ ...base, n: 600, rate: 6, system: 'bullet' })
  assert.equal(enormous.ok, false)
  assert.match(enormous.error, /precisão monetária/)
  assert.equal(loan({ ...base, value: MAX_LOAN_MONEY + 1 }).ok, false)
  for (const value of [Infinity, NaN, 1e308]) assert.equal(loan({ ...base, value }).ok, false)
  for (const system of ['price', 'sac', 'bullet']) {
    const result = loan({ ...base, value: 100000000, n: 600, rate: 0.01, system })
    assert.equal(result.ok, true)
    for (const key of ['interest', 'iof', 'total']) assert.ok(Number.isFinite(result[key]) && result[key] <= MAX_LOAN_MONEY)
  }
})

test('F4 Giro: unidade desconhecida não é interpretada como mensal', () => {
  for (const unit of ['unknown', '', null, 'a.m.']) {
    const result = loan({ ...base, unit })
    assert.equal(result.ok, false)
    assert.ok(result.missing.includes('unidade da taxa (am ou aa)'))
    assert.ok(Number.isNaN(monthlyRate(2, unit)))
  }
})

test('F4 Giro: calendário completo deve permanecer em AAAA-MM-DD até 9999', () => {
  assert.equal(loanDates(base.start, '9999-12-31', 2), null)
  assert.equal(loan({ ...base, firstDue: '9999-12-31', n: 2 }).ok, false)
  assert.deepEqual(loanDates('9999-10-01', '9999-11-30', 2).map(row => row.date), ['9999-11-30', '9999-12-30'])
  assert.equal(loanDates(base.start, '9999-12-31', 1)[0].date, '9999-12-31')
  assert.deepEqual(loanDates('0099-10-01', '0099-11-30', 3).map(row => row.date), ['0099-11-30', '0099-12-30', '0100-01-30'])
})

test('F4 Giro: comparação nunca propaga resultado recusado ou diferenças NaN', () => {
  const compared = compareSystems({ ...base, value: 30000000000, n: 600, rate: 6, system: 'sac' })
  assert.equal(compared.selected.ok, true)
  assert.deepEqual(compared.others, [])
})

test('Giro usual preserva juros, IOF real e total sem CET ou carência presumida', () => {
  const result = loan(base)
  assert.equal(result.ok, true)
  near(result.installment, 9455.96)
  near(result.interest, 13471.52)
  near(result.iof, 2054.86)
  near(result.total, 115526.38)
  assert.equal(loan({ ...base, n: 1, firstDue: '2036-12-06' }).interest, 2000)
})
