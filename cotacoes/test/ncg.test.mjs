import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateNcg, COMMERCIAL_MONTH_DAYS, NCG_MODEL_DESCRIPTION } from '../src/ncg.js'

const example = {
  monthlySales: 300000,
  monthlyCogs: 210000,
  pmr: 30,
  pme: 40,
  pmp: 30,
  additionalReserve: 30000,
  existingCoverage: 250000,
}
const requiredFields = ['monthlySales', 'monthlyCogs', 'pmr', 'pme', 'pmp']
const allFields = [...requiredFields, 'monthlyPurchases', 'additionalReserve', 'existingCoverage']

test('calcula o exemplo comercial e explicita a premissa de compras iguais ao CMV', () => {
  const result = calculateNcg(example)
  assert.equal(result.valid, true)
  assert.deepEqual(result.errors, {})
  assert.equal(result.receivables, 300000)
  assert.equal(result.inventory, 280000)
  assert.equal(result.suppliers, 210000)
  assert.equal(result.ncg, 370000)
  assert.equal(result.cycleDays, 40)
  assert.equal(result.additionalResources, 150000)
  assert.equal(result.monthlyPurchases, 210000)
  assert.equal(result.purchasesAssumed, true)
  assert.ok(result.assumptions.some((item) => /Compras mensais estimadas iguais ao CMV/.test(item)))
  assert.equal(COMMERCIAL_MONTH_DAYS, 30)
  assert.equal(result.modelDescription, NCG_MODEL_DESCRIPTION)
  assert.match(result.modelDescription, /não a NCG contábil completa/)
  assert.match(result.modelDescription, /nem uma recomendação de empréstimo/)
})

test('aceita zero explícito em todos os campos', () => {
  const result = calculateNcg(Object.fromEntries(allFields.map((field) => [field, 0])))
  assert.equal(result.valid, true)
  assert.equal(result.ncg, 0)
  assert.equal(result.cycleDays, 0)
  assert.equal(result.additionalResources, 0)
  assert.equal(result.monthlyPurchases, 0)
  assert.equal(result.purchasesAssumed, false)
  assert.deepEqual(result.missingAdditionalFields, [])
})

test('sem reserva ou cobertura calcula só NCG, sem transformar ausência em zero', () => {
  for (const field of ['additionalReserve', 'existingCoverage']) {
    for (const empty of [null, undefined, '', '   ']) {
      const result = calculateNcg({ ...example, [field]: empty })
      assert.equal(result.valid, true)
      assert.equal(result.ncg, 370000)
      assert.equal(result.additionalResources, null)
      assert.deepEqual(result.missingAdditionalFields, [field])
    }
  }
  const { additionalReserve, existingCoverage, ...base } = example
  const result = calculateNcg(base)
  assert.equal(result.valid, true)
  assert.equal(result.additionalResources, null)
  assert.deepEqual(result.missingAdditionalFields, ['additionalReserve', 'existingCoverage'])
  assert.equal(calculateNcg({ ...base, additionalReserve: 0, existingCoverage: 0 }).additionalResources, 370000)
})

test('usa compras informadas, inclusive zero, em vez de CMV', () => {
  const result = calculateNcg({ ...example, monthlyPurchases: 240000 })
  assert.equal(result.valid, true)
  assert.equal(result.suppliers, 240000)
  assert.equal(result.ncg, 340000)
  assert.equal(result.additionalResources, 120000)
  assert.equal(result.cycleDays, 40)
  assert.equal(result.purchasesAssumed, false)
  assert.equal(result.monthlyPurchases, 240000)
  assert.ok(!result.assumptions.some((item) => /iguais ao CMV/.test(item)))
  assert.equal(calculateNcg({ ...example, monthlyPurchases: 0 }).ncg, 580000)
})

test('compras vazias adotam CMV e mantêm a premissa explícita', () => {
  for (const empty of [null, undefined, '', '   ']) {
    const result = calculateNcg({ ...example, monthlyPurchases: empty })
    assert.equal(result.valid, true)
    assert.equal(result.monthlyPurchases, 210000)
    assert.equal(result.purchasesAssumed, true)
    assert.equal(result.ncg, 370000)
  }
})

test('exige os cinco campos-base, sem converter vazios em zero', () => {
  for (const field of requiredFields) {
    for (const empty of [null, undefined, '', '   ']) {
      const result = calculateNcg({ ...example, [field]: empty })
      assert.equal(result.valid, false, `${field}: ${String(empty)}`)
      assert.equal(result.errors[field], 'Campo obrigatório.')
      assert.equal(result.ncg, null)
      assert.equal(result.additionalResources, null)
    }
  }
  for (const input of [undefined, null, {}]) {
    assert.deepEqual(Object.keys(calculateNcg(input).errors), requiredFields)
  }
})

test('rejeita negativos, NaN, Infinity, strings numéricas e outros tipos em qualquer campo', () => {
  for (const field of allFields) {
    for (const invalid of [-1, NaN, Infinity, -Infinity, '0', '300.000,00', true, false, [], {}]) {
      const result = calculateNcg({ ...example, [field]: invalid })
      assert.equal(result.valid, false, `${field}: ${String(invalid)}`)
      assert.ok(result.errors[field])
      assert.equal(result.ncg, null)
      assert.equal(result.additionalResources, null)
    }
  }
})

test('permite NCG e ciclo negativos sem recomendar recursos adicionais negativos', () => {
  const result = calculateNcg({ ...example, pmr: 10, pme: 10, pmp: 60, additionalReserve: 0, existingCoverage: 0 })
  assert.equal(result.valid, true)
  assert.equal(result.ncg, -250000)
  assert.equal(result.cycleDays, -40)
  assert.equal(result.additionalResources, 0)
})

test('limita recursos adicionais a zero quando a cobertura é suficiente', () => {
  assert.equal(calculateNcg({ ...example, existingCoverage: 400000 }).additionalResources, 0)
  assert.equal(calculateNcg({ ...example, existingCoverage: 500000 }).additionalResources, 0)
})

test('NCG negativa pode requerer recursos se a reserva adicional superar a folga', () => {
  const result = calculateNcg({ ...example, pmr: 10, pme: 10, pmp: 60, additionalReserve: 300000, existingCoverage: 0 })
  assert.equal(result.valid, true)
  assert.equal(result.ncg, -250000)
  assert.equal(result.additionalResources, 50000)
})

test('aceita valores fracionários sem arredondar o cálculo', () => {
  const result = calculateNcg({ ...example, monthlySales: 100.25, monthlyCogs: 70.5, pmr: 12.5, pme: 10.25, pmp: 5.75 })
  assert.equal(result.valid, true)
  assert.equal(result.ncg, 100.25 / 30 * 12.5 + 70.5 / 30 * 10.25 - 70.5 / 30 * 5.75)
  assert.equal(result.cycleDays, 17)
})

test('detecta estouro numérico mesmo quando as entradas são finitas', () => {
  const result = calculateNcg({ ...example, monthlySales: Number.MAX_VALUE, pmr: 100 })
  assert.equal(result.valid, false)
  assert.ok(result.errors.calculation)
  assert.equal(result.ncg, null)
  assert.equal(result.additionalResources, null)
})

test('não altera os dados de entrada', () => {
  const input = Object.freeze({ ...example })
  assert.equal(calculateNcg(input).valid, true)
  assert.deepEqual(input, example)
})
