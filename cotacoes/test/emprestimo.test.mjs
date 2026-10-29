import test from 'node:test'
import assert from 'node:assert/strict'
import { loan, monthlyRate, parseDecimal } from '../src/emprestimo.js'

const Z = { fixed: 0, daily: 0 } // sem IOF: isola o cálculo dos juros
const near = (a, b, eps = 0.005) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`)

test('Price: parcela fixa pela fórmula clássica; juros = total − principal', () => {
  const r = loan({ iof: Z, value: 100000, n: 12, rate: 2, unit: 'am', system: 'price' })
  assert.equal(r.ok, true)
  near(r.installment, 9455.96) // PMT de 100.000, 12 meses a 2% a.m.
  near(r.total, 9455.96 * 12, 0.05)
  near(r.interest, r.total - 100000, 1e-6)
  assert.equal(r.last, null)
})

test('SAC: 1ª e última parcelas, juros pela soma da progressão e total', () => {
  const r = loan({ iof: Z, value: 120000, n: 12, rate: 1, unit: 'am', system: 'sac' })
  near(r.installment, 10000 + 1200) // amortização 10.000 + 1% sobre 120.000
  near(r.last, 10000 + 100)         // última: juros de 1% sobre 10.000
  near(r.interest, 0.01 * 120000 * 13 / 2) // 7.800
  near(r.total, 127800)
  // confere contra o cronograma mês a mês
  let bal = 120000, sum = 0
  for (let k = 1; k <= 12; k++) { sum += 10000 + bal * 0.01; bal -= 10000 }
  near(r.total, sum, 1e-6)
})

test('Bullet: juros compostos e pagamento único; sem parcela periódica', () => {
  const r = loan({ iof: Z, value: 50000, n: 6, rate: 1.5, unit: 'am', system: 'bullet' })
  near(r.total, 50000 * 1.015 ** 6)
  near(r.interest, r.total - 50000, 1e-6)
  assert.equal(r.installment, null)
})

test('taxa a.a. converte por juros compostos e vira a mesma operação em a.m.', () => {
  near(monthlyRate(12.6825, 'aa'), 0.01, 1e-6) // 1,01^12 − 1 = 12,6825% a.a.
  const a = loan({ iof: Z, value: 10000, n: 24, rate: 12.6825, unit: 'aa', system: 'price' })
  const b = loan({ iof: Z, value: 10000, n: 24, rate: 1, unit: 'am', system: 'price' })
  near(a.installment, b.installment, 0.01)
})

test('taxa zero: sem juros em qualquer sistema', () => {
  for (const system of ['price', 'sac', 'bullet']) {
    const r = loan({ iof: Z, value: 1200, n: 12, rate: 0, system })
    near(r.interest, 0, 1e-9); near(r.total, 1200, 1e-9)
  }
  near(loan({ iof: Z, value: 1200, n: 12, rate: 0, system: 'price' }).installment, 100)
})

test('entradas ausentes ou inválidas listam o que falta, sem virar zero', () => {
  assert.deepEqual(loan({ value: 0, n: 12, rate: 1, system: 'price' }).missing, ['valor'])
  assert.deepEqual(loan({ value: 1, n: 1.5, rate: 1, system: 'price' }).missing, ['prazo (1 a 600 meses)'])
  assert.deepEqual(loan({ value: 1, n: 601, rate: 1, system: 'price' }).missing, ['prazo (1 a 600 meses)'])
  assert.deepEqual(loan({ value: 1, n: 12, rate: -1, system: 'price' }).missing, ['taxa'])
  assert.deepEqual(loan({ value: 1, n: 12, rate: NaN, system: 'price' }).missing, ['taxa'])
  assert.deepEqual(loan({ value: 1, n: 12, rate: 1, system: 'x' }).missing, ['sistema de amortização'])
  assert.equal(loan({}).ok, false)
})

test('parseDecimal: vírgula decimal, ponto decimal sem vírgula, % opcional; lixo vira null', () => {
  assert.equal(parseDecimal('1,5'), 1.5)
  assert.equal(parseDecimal('1.5'), 1.5)
  assert.equal(parseDecimal(' 12 % '), 12)
  assert.equal(parseDecimal('1.000,5'), null)
  assert.equal(parseDecimal('abc'), null)
  assert.equal(parseDecimal(''), null)
  assert.equal(parseDecimal('-1'), null)
})

import { IOF_PJ } from '../src/emprestimo.js'
test('IOF PJ: bullet de 12 meses = principal × (0,0082% × 365 + 0,38%) ≈ 3,37%; total inclui o IOF', () => {
  const r = loan({ value: 100000, n: 12, rate: 1, system: 'bullet' })
  near(r.iofFixed, 380); near(r.iofDaily, 100000 * 0.000082 * 365); near(r.iof, 3373)
  near(r.total, 100000 * 1.01 ** 12 + r.iof)
  near(r.interest, 100000 * 1.01 ** 12 - 100000) // juros sem o IOF
})
test('IOF PJ: parcelado usa o principal de cada parcela e os dias até cada vencimento', () => {
  const r = loan({ value: 120000, n: 12, rate: 0, system: 'sac' })
  let base = 0
  for (let k = 1; k <= 12; k++) base += 10000 * Math.min(Math.round(k * 365 / 12), 365)
  near(r.iofDaily, base * 0.000082); near(r.iofFixed, 456)
  assert.ok(r.iof < loan({ value: 120000, n: 12, rate: 0, system: 'bullet' }).iof, 'amortizar ao longo do prazo paga menos IOF que o bullet')
  // Price com taxa: soma das amortizações = principal, então a base diária é compatível com a do SAC em ordem de grandeza
  const p = loan({ value: 120000, n: 12, rate: 2, system: 'price' })
  assert.ok(p.iofDaily > 0 && p.iofDaily < loan({ value: 120000, n: 12, rate: 2, system: 'bullet' }).iofDaily)
})
test('IOF PJ: prazo acima de 365 dias não aumenta a parte diária das parcelas além do limite; alíquotas editáveis e validadas', () => {
  const r = loan({ value: 100000, n: 24, rate: 0, system: 'bullet' })
  near(r.iofDaily, 100000 * 0.000082 * 365) // limitado a 365 dias
  const zero = loan({ value: 100000, n: 12, rate: 1, system: 'price', iof: { fixed: 0, daily: 0 } })
  near(zero.iof, 0, 1e-9)
  assert.deepEqual(loan({ value: 1, n: 12, rate: 1, system: 'price', iof: { fixed: -1, daily: 0 } }).missing, ['alíquotas do IOF'])
  assert.deepEqual(IOF_PJ, { fixed: 0.38, daily: 0.0082, maxDays: 365 })
})
