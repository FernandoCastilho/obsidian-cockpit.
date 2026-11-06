import test from 'node:test'
import assert from 'node:assert/strict'
import { fullRows } from './fixtures/bndes-tfb/full-evidence.mjs'
import { fullInput } from './fixtures/bndes-tfb/full-input.mjs'
import { reconcileCreditoPequenasEmpresas as run } from '../src/bndesCreditoPequenasEmpresas.js'
import { datedReturnActual365 } from './fixtures/bndes-tfb/dated-return.mjs'

test('auditoria: Newton independente a partir de valores transcritos', () => {
  const terms = fullRows.map((row, index) => ({
    a: row.paymentCents + (index === 0 ? 220000 : 0),
    t: (Date.parse(row.date) - Date.parse('2026-10-26')) / 86400000 / 365,
  }))
  let rate = 0.2
  for (let index = 0; index < 20; index++) {
    const f = 290581727 - terms.reduce((sum, x) => sum + x.a * Math.exp(-x.t * Math.log1p(rate)), 0)
    const derivative = terms.reduce((sum, x) => sum + x.t * x.a * Math.exp(-(x.t + 1) * Math.log1p(rate)), 0)
    rate -= f / derivative
  }
  assert.ok(Math.abs(rate - 0.20156889928931138) < 1e-12)
  const flows = [{ date: '2026-10-26', amountCents: 290581727 }, ...fullRows.map((row, index) => ({ date: row.date, amountCents: -row.paymentCents - (index === 0 ? 220000 : 0) }))]
  assert.ok(Math.abs(datedReturnActual365(flows).annualRate - rate) < 1e-12)
})

test('auditoria: política nova preserva as 13 linhas, mas muda a cauda observada', () => {
  const input = fullInput()
  const next = run(input)
  assert.deepEqual(next.paymentEventCoverage, { covered: 34, expected: 34, allExpectedEventsCovered: true })
  assert.equal(next.cet.status, 'not-validated-scenario-formula-unconfirmed')
  assert.equal(next.cet.validated, false)
  input.principalRoundingPolicy = 'constant-cents-final-residual'
  const oldPolicy = run(input)
  assert.deepEqual(next.rows.slice(0, 13), oldPolicy.rows.slice(0, 13))
  assert.equal(oldPolicy.rows[28].principalCents, 9090909)
  assert.equal(next.rows[28].principalCents, 9090910)
  assert.equal(oldPolicy.rows[33].principalCents, 9090912)
  assert.equal(next.rows[33].principalCents, 9090909)
})

test('auditoria: XIRR deve rejeitar data civil impossível', () => {
  assert.throws(() => datedReturnActual365([{ date: '2026-02-30', amountCents: 10000 }, { date: '2027-03-02', amountCents: -11000 }]))
})

test('auditoria: XIRR exige centavos inteiros, finitos e numéricos', () => {
  for (const amountCents of ['10000', 10000.1, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => datedReturnActual365([{ date: '2026-01-01', amountCents }, { date: '2027-01-01', amountCents: -11000 }]))
  }
})
