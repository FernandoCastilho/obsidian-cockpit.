import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { loan } from '../src/emprestimo.js'
import { DISCOUNT_INITIAL_FORM, parseDiscountForm } from '../src/analiseDesconto.js'

// Validate the exact smoke helpers rather than another copy of their implementation.
for (const script of ['smoke-calculadora.cjs', 'smoke-calculator-layout.cjs']) {
  test(`${script}: fixed civil dates and independent recurrence reconcile IOF`, async () => {
    const source = await readFile(new URL(`../scripts/${script}`, import.meta.url), 'utf8')
    const helper = source.match(/const giroOracle = [\s\S]*?\n}\n/)[0]
    const oracle = runInNewContext(`${helper}\ngiroOracle`)
    const expectedDays = [30, 61, 92, 120, 151, 181, 212, 242, 273, 304, 334, 365]
    for (const system of ['price', 'sac']) for (const [value, daily, profile, eligible] of [[100000, 0.0082, 'pj', false], [30000, 0.00274, 'simples', true]]) {
      const result = loan({ value, n: 12, rate: 2, system, start: '2026-11-06', firstDue: '2026-12-06', profile, eligible })
      assert.equal(result.ok, true)
      assert.deepEqual(result.dates.map(row => row.days), expectedDays)
      const expected = oracle(system, value, daily)
      assert.ok(Math.abs(result.iof - expected.iof) < 1e-7)
      assert.ok(Math.abs(result.total - expected.total) < 1e-7)
    }
    assert.equal(oracle('price').iof.toFixed(2), '2054.86')
    assert.equal(oracle('sac').iof.toFixed(2), '1996.08')
    // The retired rounded-365/12 oracle must not silently return.
    assert.notEqual(oracle('price').iof.toFixed(2), '2060.39')
    assert.ok(source.includes(".fill('2026-11-06')"))
    assert.ok(source.includes(".fill('2026-12-06')"))
  })
}

test('discount smoke independently reconciles operation, monthly and annual totals', () => {
  const { operation, result, errors } = parseDiscountForm({ ...DISCOUNT_INITIAL_FORM, titleFeeMode: 'total' })
  assert.deepEqual(errors, {})
  assert.equal(result.ok, true)
  const gross = 225600.43
  const operationInterest = gross * 0.0183
  const operationCost = operationInterest + (gross - operationInterest) * (0.0038 + 30 * 0.000082) + 564 + 260
  const monthlyInterest = gross * 0.0175
  const monthlyCost = 6 * (monthlyInterest + (gross - monthlyInterest) * (0.0038 + 30 * 0.000082) + 564 + 260)
  assert.ok(Math.abs(operation.cost - operationCost) < 1e-7)
  assert.ok(Math.abs(operation.net - (gross - operationCost)) < 1e-7)
  assert.ok(Math.abs(result.monthly.cost - monthlyCost) < 1e-7)
  assert.ok(Math.abs(result.annual.cost - monthlyCost * 12) < 1e-7)
})
