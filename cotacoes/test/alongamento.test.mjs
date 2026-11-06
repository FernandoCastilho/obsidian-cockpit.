import test from 'node:test'
import assert from 'node:assert/strict'
import { estimateNcg, initialAlongamentoForm, parseAlongamentoDecimal, parseAlongamentoForm, simulateAlongamento } from '../src/alongamento.js'

const close = (actual, expected, tolerance = 0.000001) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≠ ${expected}`)
const params = { balance: 300000, cgRate: 3, amount: 300000, loanRate: 1.5, n: 36, start: '2026-11-06', graceMonths: 0, fee: 0, system: 'price', profile: 'pj' }
const form = () => ({ ...initialAlongamentoForm('2026-11-06'), balance: '300.000,00', cgRate: '3', amount: '300.000,00', loanRate: '1,5', n: '36' })

test('Price reproduz exemplo sem confundir juros com amortização', () => {
  const r = simulateAlongamento(params)
  assert.equal(r.ok, true)
  close(r.loan.installment, 10845.718660775105)
  close(r.loan.rows[0].interest, 4500)
  close(r.loan.rows[0].amortization, 6345.718660775105)
  close(r.loan.interest, 90445.87178790377)
  close(r.loan.rows.reduce((s, row) => s + row.originalPrincipal, 0), params.amount)
  assert.equal(r.baseline.finalDebt, 300000)
  assert.equal(r.alternative.finalDebt, 0)
  assert.equal(r.loan.rows.at(-1).balance, 0)
  // First monthly anniversary has 30 actual days; CG IOF is also an outflow.
  close(r.months[0].baselineCost, 9000 + 738)
  close(r.monthlyDelta, r.loan.installment - 9738)
})

test('CG considera dias reais, taxa mensal base30 e saldo antigo sem novo adicional', () => {
  const r = simulateAlongamento({ ...params, start: '2027-01-31', n: 2 })
  assert.equal(r.months[0].date, '2027-02-28')
  assert.equal(r.months[1].date, '2027-03-31')
  assert.equal(r.months[0].days, 28)
  assert.equal(r.months[1].days, 31)
  assert.equal(r.horizonDays, 59)
  close(r.baseline.interest, 300000 * .03 / 30 * 59)
  close(r.baseline.iof, 300000 * .000082 * 59)
})

test('comparação inclui IOF novo, tarifa à vista e horizonte igual', () => {
  const r = simulateAlongamento({ ...params, fee: 500 })
  close(r.loan.upfront, r.loan.iof + 500)
  close(r.loan.iofFixed, 300000 * .0038)
  const base = r.loan.rows.reduce((s, row) => s + row.originalPrincipal * Math.min(row.days, 365), 0)
  close(r.loan.iofDaily, base * .000082)
  close(r.alternative.cost, r.loan.interest + r.loan.iof + 500)
  close(r.alternative.cashOut, r.alternative.cost + params.amount)
  close(r.savings, r.baseline.cost - r.alternative.cost)
  assert.equal(r.end, r.loan.rows.at(-1).date)
})

test('quitação parcial mantém e cobra o saldo residual da CG', () => {
  const r = simulateAlongamento({ ...params, amount: 100000 })
  assert.equal(r.residual, 200000)
  assert.equal(r.alternative.finalDebt, 200000)
  close(r.months[0].residualCost, r.months[0].baselineCost * 2 / 3)
  close(r.alternative.cost, r.loan.interest + r.loan.iof + r.baseline.cost * 2 / 3)
  close(r.months[0].cashOut, r.loan.installment + r.months[0].residualCost)
})

test('carência capitaliza juros, adia primeira parcela e mantém IOF sobre principal original', () => {
  const r = simulateAlongamento({ ...params, n: 12, graceMonths: 2 })
  assert.equal(r.months.length, 14)
  assert.equal(r.loan.rows.length, 12)
  close(r.loan.financed, 300000 * 1.015 ** 2)
  close(r.loan.graceInterest, 300000 * (1.015 ** 2 - 1))
  assert.equal(r.months[0].installment, 0)
  assert.equal(r.months[1].installment, 0)
  assert.equal(r.loan.rows[0].date, '2027-02-06')
  assert.equal(r.loan.rows.at(-1).date, '2028-01-06')
  close(r.loan.rows.reduce((sum, row) => sum + row.originalPrincipal, 0), 300000)
  close(r.loan.rows.reduce((sum, row) => sum + row.amortization, 0), r.loan.financed)
  const interestAfterGrace = r.loan.rows.reduce((sum, row) => sum + row.interest, 0)
  close(r.loan.interest, r.loan.graceInterest + interestAfterGrace)
  close(r.months[0].loanInterest, 4500)
  close(r.months[1].loanInterest, 4567.5)
  close(r.months.reduce((sum, row) => sum + row.loanInterest, 0), r.loan.interest)
  assert.equal(r.months[0].cashOut, 0)
  assert.equal(r.months[1].cashOut, 0)
  close(r.monthlyDelta, r.months[2].cashDifference)
})

test('SAC gera amortização financeira constante e parcelas decrescentes', () => {
  const r = simulateAlongamento({ ...params, system: 'sac' })
  close(r.loan.firstInstallment, 300000 / 36 + 4500)
  close(r.loan.lastInstallment, 300000 / 36 * 1.015)
  close(r.loan.interest, .015 * 300000 * 37 / 2)
  assert.ok(r.loan.firstInstallment > r.loan.lastInstallment)
  for (const row of r.loan.rows) close(row.amortization, 300000 / 36)
})

test('teto365 limita IOF do parcelado, sem limitar CG por saldos', () => {
  const r = simulateAlongamento({ ...params, n: 60 })
  assert.ok(r.loan.iofDaily <= params.amount * .000082 * 365 + .000001)
  close(r.baseline.iof, params.balance * .000082 * r.horizonDays)
  assert.ok(r.baseline.iof > params.balance * .000082 * 365)
})

test('Simples distingue valor contratual da CG e valor da operação nova', () => {
  const r = simulateAlongamento({ ...params, balance: 25000, amount: 20000, operationValueCG: 100000, profile: 'simples', eligible: true })
  assert.equal(r.ok, true)
  assert.equal(r.cgTax.daily, .0082)
  assert.equal(r.loan.tax.daily, .00274)
  assert.equal(simulateAlongamento({ ...params, profile: 'simples', operationValueCG: 300000 }).ok, false)
  assert.equal(simulateAlongamento({ ...params, profile: 'simples', eligible: true, operationValueCG: 25000 }).ok, false)
})

test('limiar R$30mil é avaliado na operação nova em centavos', () => {
  const p = { ...params, balance: 50000, operationValueCG: 50000, profile: 'simples', eligible: true }
  assert.equal(simulateAlongamento({ ...p, amount: 30000 }).loan.tax.daily, .00274)
  assert.equal(simulateAlongamento({ ...p, amount: 30000.01 }).loan.tax.daily, .0082)
})

test('capacidade de caixa inclui CG residual e meses de maior desembolso', () => {
  const r = simulateAlongamento({ ...params, system: 'sac', cashAvailable: 10000 })
  assert.equal(r.cashAssessment.fits, false)
  close(r.cashAssessment.minSurplus, 10000 - r.loan.firstInstallment)
  assert.equal(r.cashAssessment.upfrontGap, null)
  assert.equal(simulateAlongamento(params).cashAssessment, null)
  assert.equal(simulateAlongamento({ ...params, cashAvailable: 20000 }).cashAssessment.fits, true)
})

test('taxa zero explícita gera parcelas de principal e mantém IOF automático', () => {
  const r = simulateAlongamento({ ...params, cgRate: 0, loanRate: 0, n: 10, graceMonths: 1 })
  assert.equal(r.ok, true)
  close(r.loan.installment, 30000)
  close(r.loan.interest, 0)
  close(r.loan.graceInterest, 0)
  assert.ok(r.loan.iof > 0)
})

test('formulário começa sem propostas fictícias e exige dados financeiros', () => {
  const initial = initialAlongamentoForm('2026-11-06')
  assert.equal(initial.cgRate, '')
  assert.equal(initial.loanRate, '')
  assert.equal(initial.balance, '')
  const r = parseAlongamentoForm(initial)
  assert.equal(r.result, null)
  assert.ok(r.errors.balance && r.errors.amount && r.errors.cgRate && r.errors.loanRate && r.errors.n)
})

test('parser aceita brasileiro e rejeita valores vazios ou separadores ambíguos', () => {
  assert.equal(parseAlongamentoForm(form()).result.ok, true)
  for (const [key, value] of [['balance', '300000.00'], ['amount', ''], ['fee', ''], ['n', '36,0'], ['cgRate', ''], ['loanRate', '-1'], ['graceMonths', '0.5'], ['start', '2026-02-30']]) {
    const r = parseAlongamentoForm({ ...form(), [key]: value })
    assert.equal(r.result, null, key)
    assert.ok(r.errors[key], key)
  }
  assert.equal(parseAlongamentoForm({ ...form(), loanRate: '0', cgRate: '0', cashAvailable: '0' }).result.cashAssessment.fits, false)
})

test('percentual estrito rejeita símbolos internos e aceita um único sufixo explícito', () => {
  for (const value of ['1%5', '%15', '3%%', '1,%5', '1.2.3', '1,2,3', '', '-1']) {
    assert.equal(parseAlongamentoDecimal(value, { percent: true }), null, value)
    for (const key of ['cgRate', 'loanRate']) {
      const r = parseAlongamentoForm({ ...form(), [key]: value })
      assert.equal(r.result, null, `${key}: ${value}`)
      assert.ok(r.errors[key])
    }
  }
  assert.equal(parseAlongamentoDecimal('1,5%', { percent: true }), 1.5)
  assert.equal(parseAlongamentoDecimal(' 1.5 % ', { percent: true }), 1.5)
  assert.equal(parseAlongamentoDecimal('1,5'), 1.5)
  assert.equal(parseAlongamentoDecimal('0'), 0)
  assert.equal(parseAlongamentoDecimal('15%'), null)
  assert.equal(parseAlongamentoForm({ ...form(), loanRate: '1,5%' }).result.ok, true)
})

test('validação impede excesso de quitação, negativos, datas históricas e prazo fora dos limites', () => {
  for (const override of [{ amount: 300001 }, { amount: 0 }, { balance: -1 }, { n: 0 }, { n: 601 }, { graceMonths: 13 }, { start: '2025-07-16' }, { start: '2199-12-01' }, { fee: -1 }, { cashAvailable: NaN }, { loanRate: Infinity }, { system: 'bullet' }, { profile: 'manual' }]) {
    assert.equal(simulateAlongamento({ ...params, ...override }).ok, false, JSON.stringify(override))
  }
})

test('NCG por saldos preserva necessidade negativa e zero explícito', () => {
  const r = estimateNcg({ mode: 'balances', receivables: 100000, inventory: 50000, payables: 200000 })
  assert.equal(r.ok, true)
  assert.equal(r.ncg, -50000)
  assert.equal(estimateNcg({ mode: 'balances', receivables: 0, inventory: 0, payables: 0 }).ncg, 0)
})

test('NCG por prazos usa vendas, custo e compras em bases diferentes', () => {
  const r = estimateNcg({ mode: 'terms', sales: 900000, cost: 600000, purchases: 450000, pmr: 60, pme: 45, pmp: 30 })
  assert.equal(r.receivables, 1800000)
  assert.equal(r.inventory, 900000)
  assert.equal(r.payables, 450000)
  assert.equal(r.ncg, 2250000)
  assert.equal(r.cycleDays, 75)
})

test('NCG não assume valores ausentes nem aceita prazos inválidos', () => {
  assert.equal(estimateNcg({ mode: 'balances', receivables: 0, inventory: null, payables: 0 }).ok, false)
  assert.equal(estimateNcg({ mode: 'terms', sales: 1, cost: 1, purchases: 1, pmr: -1, pme: 0, pmp: 0 }).ok, false)
  assert.equal(estimateNcg({ mode: 'terms', sales: 1, cost: 1, purchases: 1, pmr: 0, pme: 3661, pmp: 0 }).ok, false)
})
