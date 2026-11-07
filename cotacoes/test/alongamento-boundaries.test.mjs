import test from 'node:test'
import assert from 'node:assert/strict'
import { simulateAlongamento, estimateNcg, ALONGAMENTO_MAX_PRECISE_TOTAL } from '../src/alongamento.js'

const base = { balance: 1e12, amount: 1e12, cgRate: 3, loanRate: 0, n: 600, start: '2026-11-06', graceMonths: 0, fee: 0, cashAvailable: 15000, profile: 'pj', system: 'price' }
const close = (actual, expected, tolerance = 0.005) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`)

test('taxa zero não produz juros residuais negativos em principal de um centavo', () => {
  for (const system of ['price', 'sac']) for (const n of [3, 36, 600]) {
    const r = simulateAlongamento({ ...base, balance: 0.01, amount: 0.01, system, n })
    assert.equal(r.ok, true)
    assert.equal(r.loan.interest, 0)
    assert.equal(Object.is(r.loan.interest, -0), false)
    assert.equal(r.loan.graceInterest, 0)
    assert.ok(r.months.every(row => row.loanInterest === 0))
    assert.equal(r.loan.rows.at(-1).balance, 0)
  }
})

test('saldos sem juros são proporcionais ao prazo restante sem subtração acumulada', () => {
  for (const system of ['price', 'sac']) {
    const r = simulateAlongamento({ ...base, system })
    assert.equal(r.ok, true)
    assert.equal(r.months[122].remainingLoan, 795000000000)
    for (let k = 1; k <= 600; k++) {
      const expected = Number(1000000000000n * BigInt(600 - k)) / 600
      close(r.months[k - 1].remainingLoan, expected)
      close(r.loan.rows[k - 1].balance, expected)
    }
    assert.equal(r.loan.interest, 0)
  }
})

// Expected values from an independent 100-digit Decimal discounted-cash-flow oracle.
test('juros ínfimos preservam centavos sem subtrair pagamentos e principal', () => {
  for (const [loanRate, interest] of [[1e-16, 0.00030050000000000004], [1e-12, 3.005000000003]]) {
    const r = simulateAlongamento({ ...base, loanRate })
    assert.equal(r.ok, true)
    close(r.loan.interest, interest, 1e-11)
    assert.ok(r.loan.interest > 0)
    assert.equal(r.loan.rows.at(-1).balance, 0)
  }
})

test('combinações extremas sem margem para precisão monetária são recusadas explicitamente', () => {
  assert.equal(ALONGAMENTO_MAX_PRECISE_TOTAL, 35184372088832)
  const r = simulateAlongamento({ ...base, loanRate: 6 })
  assert.equal(r.ok, false)
  assert.match(r.error, /limite técnico de precisão monetária/)
  // Same conditions with a smaller principal remain supported.
  const accepted = simulateAlongamento({ ...base, balance: 1e11, amount: 1e11, loanRate: 6 })
  assert.equal(accepted.ok, true)
  close(accepted.loan.interest, 3500000000000.0024)
  close(accepted.loan.total, 3603373000000.0024)
})

test('zero assinado é normalizado e o limite independente da NCG permanece inalterado', () => {
  const r = simulateAlongamento({ ...base, loanRate: -0, graceMonths: 2 })
  assert.equal(r.ok, true)
  assert.equal(Object.is(r.loan.interest, -0), false)
  assert.ok(r.months.every(row => !Object.is(row.loanInterest, -0)))
  const ncg = estimateNcg({ mode: 'terms', sales: 1e12, cost: 0, purchases: 0, pmr: 2100, pme: 0, pmp: 0 })
  assert.equal(ncg.ok, true)
  assert.equal(ncg.ncg, 70000000000000)
})
