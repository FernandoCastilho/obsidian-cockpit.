import test from 'node:test'
import assert from 'node:assert/strict'
import { DISCOUNT_INITIAL_FORM, DISCOUNT_TERMS, compareDiscount, discountDueDate, discountGiro, discountOperation, parseDiscountDate, parseDiscountForm, titleFee } from '../src/analiseDesconto.js'
import { IOF_PJ } from '../src/emprestimo.js'
import { parseCommand } from '../src/terminal.js'

const near = (actual, expected, tolerance = 0.000001) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≠ ${expected}`)
const fixture = (changes = {}) => parseDiscountForm({ ...DISCOUNT_INITIAL_FORM, titleFeeMode: 'percent', operations: '7', iofAdditional: '0', ...changes })
const loanBase = { principal: 1579203.01, months: 12, rate: 1.83, tac: 3150, date: '2026-11-05', iofDaily: 0.0082, iofAdditional: 0 }

test('campos ambíguos continuam pendentes, sem assumir zero ou tarifa unitária', () => {
  const form = parseDiscountForm(DISCOUNT_INITIAL_FORM)
  assert.equal(form.result, null)
  assert.deepEqual(Object.keys(form.errors).sort(), ['iofAdditional', 'titleFeeMode'])
  assert.equal(DISCOUNT_INITIAL_FORM.operations, '6')
  assert.equal(DISCOUNT_INITIAL_FORM.titleFeeUnit, '')
  assert.equal(Object.isFrozen(DISCOUNT_INITIAL_FORM), true)
  assert.deepEqual(DISCOUNT_TERMS, [12, 24, 36, 48])
  assert.equal(Object.isFrozen(DISCOUNT_TERMS), true)
})

test('referência mensal e anual: tarifa percentual sem arredondamento intermediário', () => {
  const { result: r, errors } = fixture()
  assert.deepEqual(errors, {}); assert.equal(r.ok, true)
  near(r.monthly.value, 1579203.01)
  near(r.monthly.titleFee, 3948.007525)
  near(r.monthly.tac, 1820); near(r.monthly.interest, 18222.05); near(r.monthly.iof, 8341.2)
  near(r.monthly.cost, 32331.257525)
  near(r.annual.titleFee, 47376.0903); near(r.annual.cost, 387975.0903)
  assert.equal(r.annualOperations, 84)
  near(r.operation.costWithoutTitles, 4054.75)
  near(r.operation.cost, 4618.751075)
  near(r.operation.net, 220981.678925)
})

const references = [
  [12, 26371.43804510046, 223607.9466902259, 150234.24639085217, 164367.1436097741],
  [24, 37950.74433132383, 427376.4642301887, 83607.47809292453, 348573.7163698113],
  [36, 41750.298519599855, 635698.2588004734, 61525.03524445759, 528227.0120995266],
  [48, 43605.963307871854, 854122.8235271192, 50694.288198481656, 697777.5376728808],
]
for (const [months, iof, cost, allIn, savings] of references) test(`reconcilia imagem: ${months} meses, Price, IOF real e média all-in`, () => {
  const r = fixture().result.comparisons.find((row) => row.months === months)
  near(r.giro.iof, iof); near(r.giro.cost, cost); near(r.giro.averageMonthlyOutflow, allIn); near(r.savings, savings)
  const pmt = loanBase.principal * 0.0183 / (1 - (1.0183) ** -months)
  near(r.giro.installment, pmt)
  near(r.giro.interest, pmt * months - loanBase.principal)
  near(r.giro.averageMonthlyOutflow, pmt + (3150 + iof) / months)
  assert.ok(r.giro.averageMonthlyOutflow > r.giro.installment)
  assert.equal(r.difference, -r.savings)
  near(r.giro.schedule.reduce((sum, row) => sum + row.amortization, 0), loanBase.principal)
  assert.equal(r.giro.schedule.at(-1).balance, 0)
})

test('calendário da referência usa dias corridos reais, não meses médios', () => {
  assert.deepEqual(discountGiro(loanBase).schedule.map((row) => row.days), [30,61,92,120,151,181,212,242,273,304,334,365])
})

test('quantidade editável 6 ou 7 altera volume, custos e giro consistentemente', () => {
  const six = fixture({ operations: '6' }).result, seven = fixture().result
  assert.equal(six.operations, 6); assert.equal(six.annualOperations, 72)
  near(six.monthly.cost * 7 / 6, seven.monthly.cost)
  near(six.principal, 225600.43 * 6)
  for (let i = 0; i < 4; i++) {
    near(six.comparisons[i].giro.installment * 7 / 6, seven.comparisons[i].giro.installment)
    near((six.comparisons[i].giro.cost - 3150) * 7 / 6 + 3150, seven.comparisons[i].giro.cost)
  }
})

test('três formas de tarifa são distintas e explicitamente selecionadas', () => {
  const base = { value: 225600.43, titles: 30 }
  assert.equal(titleFee({ ...base, feeMode: 'total', fee: 564 }).total, 564)
  assert.equal(titleFee({ ...base, feeMode: 'unit', fee: 564 }).total, 16920)
  near(titleFee({ ...base, feeMode: 'percent', fee: 0.25 }).total, 564.001075)
  assert.equal(titleFee({ ...base, feeMode: '', fee: 564 }).ok, false)
  const total = fixture({ titleFeeMode: 'total' }).result
  near(total.monthly.titleFee, 3948)
  near(total.monthly.cost, 32331.25)
  near(fixture().result.monthly.cost - total.monthly.cost, 0.007525)
})

test('títulos só multiplicam tarifa unitária, sem multiplicar total ou percentual', () => {
  near(fixture({ titleFeeMode: 'unit', titleFeeUnit: '18,80', titles: '30' }).result.monthly.titleFee, 3948)
  near(fixture({ titleFeeMode: 'unit', titleFeeUnit: '18,80', titles: '60' }).result.monthly.titleFee, 7896)
  near(fixture({ titles: '60' }).result.monthly.titleFee, fixture().result.monthly.titleFee)
  near(fixture({ titleFeeMode: 'total', titles: '60' }).result.monthly.titleFee, 3948)
})

test('IOF adicional 0,38% afeta custo uma vez e não altera PMT nem desconto', () => {
  const zero = fixture().result, extra = fixture({ iofAdditional: '0,38' }).result
  near(extra.monthly.cost, zero.monthly.cost)
  for (let i = 0; i < 4; i++) {
    const a = zero.comparisons[i].giro, b = extra.comparisons[i].giro
    near(b.additionalIof, zero.principal * 0.0038)
    near(b.cost - a.cost, zero.principal * 0.0038)
    near(b.installment, a.installment)
    near(b.dailyIof, a.dailyIof)
  }
  assert.deepEqual(IOF_PJ, { fixed: 0.38, daily: 0.0082, maxDays: 365 }, 'Capital de Giro existente preservado')
})

test('zeros explícitos válidos, com Price sem juros e sem tarifas ou IOF', () => {
  for (const months of DISCOUNT_TERMS) {
    const r = discountGiro({ ...loanBase, principal: 1200, months, rate: 0, tac: 0, iofDaily: 0, iofAdditional: 0 })
    assert.equal(r.ok, true); assert.equal(r.cost, 0); near(r.installment, 1200 / months)
    assert.equal(r.total, 1200); near(r.averageMonthlyOutflow, r.installment)
    near(r.schedule.reduce((sum, row) => sum + row.amortization, 0), 1200)
  }
})

test('Price zero com IOF calculável à mão e teto de 365 dias', () => {
  const r = discountGiro({ ...loanBase, principal: 1200, months: 12, rate: 0, tac: 0 })
  near(r.dailyIof, 100 * [30,61,92,120,151,181,212,242,273,304,334,365].reduce((a,b) => a+b) * 0.000082)
  const long = discountGiro({ ...loanBase, principal: 4800, months: 48, rate: 0, tac: 0 })
  assert.equal(long.schedule[12].iofDays, 365)
  assert.equal(long.schedule[47].iofDays, 365)
  near(long.schedule[47].days, 1461)
})

test('taxa zero e quase zero aceitam principal fracionário sem cancelamento de juros', () => {
  for (const principal of [1579203.01, 100000.01, 0.01, 999999.99]) for (const months of DISCOUNT_TERMS) {
    const zero = discountGiro({ ...loanBase, principal, months, rate: 0, tac: 0, iofDaily: 0 })
    assert.equal(zero.ok, true, `${principal}/${months}`)
    assert.equal(zero.interest, 0); assert.equal(zero.cost, 0); assert.equal(zero.total, principal)
    assert.ok(zero.schedule.every((row) => row.interest === 0))
    const tiny = discountGiro({ ...loanBase, principal, months, rate: 1e-15, tac: 0, iofDaily: 0 })
    assert.equal(tiny.ok, true, `${principal}/${months}/tiny`)
    assert.ok(tiny.interest > 0, 'juros positivos minúsculos não são truncados para zero')
    const firstOrder = principal * (1e-15 / 100) * (months + 1) / 2
    assert.ok(Math.abs(tiny.interest - firstOrder) <= firstOrder * 1e-12)
    assert.ok(tiny.schedule.every((row) => row.interest > 0))
  }
})

test('datas válidas e fins de mês, bissexto, virada de ano e formatos inválidos', () => {
  assert.equal(discountDueDate('2026-01-31', 1), '2026-02-28')
  assert.equal(discountDueDate('2026-01-31', 2), '2026-03-31')
  assert.equal(discountDueDate('2028-01-31', 1), '2028-02-29')
  assert.equal(discountDueDate('2028-02-29', 12), '2029-02-28')
  assert.equal(discountDueDate('2026-12-31', 1), '2027-01-31')
  for (const date of ['', null, '2026-02-29', '2026-13-01', '2026-00-01', '2026-02-30', '05/11/2026', '2026-1-1', '0099-01-01', '9996-01-01']) assert.equal(parseDiscountDate(date), null, String(date))
  for (const month of [0, 1.5, 49, null]) assert.equal(discountDueDate('2026-01-31', month), null)
})

test('valores pagos de juros/IOF governam desconto; taxas informativas não inventam prazo', () => {
  const old = fixture().result, changedRates = fixture({ operationRate: '10', discountRate: '20' }).result
  near(changedRates.monthly.cost, old.monthly.cost)
  const changedPaid = fixture({ interest: '3.603,15', iofPaid: '1.291,60' }).result
  near(changedPaid.monthly.cost - old.monthly.cost, 1100 * 7)
})

test('valor médio distinto altera volume e tarifa percentual, não encargos manuais', () => {
  const r = fixture({ averageValue: '300.000,00' }).result
  near(r.operation.value, 225600.43); near(r.monthly.value, 2100000)
  near(r.monthly.titleFee, 750 * 7)
  near(r.monthly.interest, 2603.15 * 7); near(r.monthly.iof, 1191.6 * 7)
})

test('principal manual rompe vínculo com volume mensal de maneira explícita', () => {
  const r = fixture({ giroPrincipalMode: 'manual', giroPrincipal: '1.000.000,00' }).result
  near(r.principal, 1000000); near(r.monthly.value, 1579203.01)
  const changed = fixture({ giroPrincipalMode: 'manual', giroPrincipal: '1.000.000,00', operations: '6' }).result
  near(changed.comparisons[0].giro.cost, r.comparisons[0].giro.cost)
  assert.notEqual(changed.monthly.cost, r.monthly.cost)
})

test('economia pode ser positiva, negativa ou zero sem esconder o sinal', () => {
  const positive = fixture().result.comparisons[0]
  const negative = fixture({ giroTac: '1.000.000,00' }).result.comparisons[0]
  assert.ok(positive.savings > 0); assert.ok(negative.savings < 0)
  const zero = compareDiscount({ operation: { value: 1200, titles: 1, feeMode: 'total', fee: 0, tac: 0, interest: 0, iofPaid: 0 }, averageValue: 1200, operations: 1, giro: { ...loanBase, principalMode: 'monthly', rate: 0, tac: 0, iofDaily: 0, iofAdditional: 0 } })
  assert.ok(zero.ok); assert.equal(zero.comparisons[0].savings, 0)
})

test('taxas Price extremas e minúsculas permanecem finitas, com amortização positiva', () => {
  for (const rate of [0.0000000001, 0.0001, 0.01, 100, 1000]) for (const months of DISCOUNT_TERMS) {
    const r = discountGiro({ ...loanBase, rate, months })
    assert.equal(r.ok, true, `${rate}/${months}`)
    assert.ok(r.schedule.every((row) => row.amortization > 0))
    near(r.schedule.reduce((sum, row) => sum + row.amortization, 0), loanBase.principal)
    assert.ok(r.iof <= loanBase.principal * 365 * 0.000082 + 0.000001)
  }
})

test('parser rejeita vazios, negativo, formato monetário americano e quantidades fracionárias', () => {
  for (const key of ['value', 'averageValue', 'tac', 'interest', 'iofPaid', 'giroTac', 'giroRate', 'operationRate', 'discountRate', 'iofDaily', 'iofAdditional', 'titles', 'operations']) {
    for (const value of ['', '-1', 'abc', 'Infinity']) {
      const r = fixture({ [key]: value })
      assert.ok(r.errors[key], `${key}=${value}`); assert.equal(r.result, null)
    }
  }
  assert.ok(fixture({ value: '225,600.43' }).errors.value)
  assert.ok(fixture({ titles: '1.5' }).errors.titles)
  assert.ok(fixture({ operations: '6,5' }).errors.operations)
  assert.ok(fixture({ value: '0' }).errors.value)
  assert.ok(fixture({ titleFeeMode: 'unit' }).errors.titleFeeUnit)
  assert.ok(fixture({ giroPrincipalMode: 'manual' }).errors.giroPrincipal)
})

test('motor rejeita entradas inválidas, dados desconhecidos, limites e estouro', () => {
  for (const key of ['principal','rate','tac','iofDaily','iofAdditional']) for (const value of [-1, null, NaN, Infinity, '1']) assert.equal(discountGiro({ ...loanBase, [key]: value }).ok, false, `${key}=${value}`)
  for (const months of [0, 1, 13, 49, 12.5, null]) assert.equal(discountGiro({ ...loanBase, months }).ok, false)
  assert.equal(discountGiro({ ...loanBase, date: '2026-02-30' }).ok, false)
  assert.equal(discountGiro({ ...loanBase, principal: Number.MAX_VALUE }).ok, false)
  assert.equal(discountGiro({ ...loanBase, principal: Number.MAX_SAFE_INTEGER / 100, rate: 1000 }).ok, false)
  const base = fixture().params
  assert.equal(compareDiscount({ ...base, operations: 0 }).ok, false)
  assert.equal(compareDiscount({ ...base, giro: { ...base.giro, principalMode: 'unknown' } }).ok, false)
  assert.equal(discountOperation({ ...base.operation, value: 100 }).ok, false)
  assert.equal(titleFee({ value: 1e12, titles: 1000000, feeMode: 'unit', fee: 1e12 }).ok, false)
})

test('DESCONTO e Análise de desconto navegam à nova calculadora', () => {
  for (const command of ['desconto', 'Análise de desconto']) assert.deepEqual(parseCommand(command), { kind: 'tab', id: 'calculadora', sub: 'analise-desconto' })
})
