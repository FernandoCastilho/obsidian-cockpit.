import test from 'node:test'
import assert from 'node:assert/strict'
import { loan, monthlyRate, parseDecimal } from '../src/emprestimo.js'

const near = (a, b, eps = 0.005) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`)

test('Price: parcela fixa pela fórmula clássica; juros = total − principal', () => {
  const r = loan({ value: 100000, n: 12, rate: 2, unit: 'am', system: 'price' })
  assert.equal(r.ok, true)
  near(r.installment, 9455.96) // PMT de 100.000, 12 meses a 2% a.m.
  near(r.total, 9455.96 * 12, 0.05)
  near(r.interest, r.total - 100000, 1e-6)
  assert.equal(r.last, null)
})

test('SAC: 1ª e última parcelas, juros pela soma da progressão e total', () => {
  const r = loan({ value: 120000, n: 12, rate: 1, unit: 'am', system: 'sac' })
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
  const r = loan({ value: 50000, n: 6, rate: 1.5, unit: 'am', system: 'bullet' })
  near(r.total, 50000 * 1.015 ** 6)
  near(r.interest, r.total - 50000, 1e-6)
  assert.equal(r.installment, null)
})

test('taxa a.a. converte por juros compostos e vira a mesma operação em a.m.', () => {
  near(monthlyRate(12.6825, 'aa'), 0.01, 1e-6) // 1,01^12 − 1 = 12,6825% a.a.
  const a = loan({ value: 10000, n: 24, rate: 12.6825, unit: 'aa', system: 'price' })
  const b = loan({ value: 10000, n: 24, rate: 1, unit: 'am', system: 'price' })
  near(a.installment, b.installment, 0.01)
})

test('taxa zero: sem juros em qualquer sistema', () => {
  for (const system of ['price', 'sac', 'bullet']) {
    const r = loan({ value: 1200, n: 12, rate: 0, system })
    near(r.interest, 0, 1e-9); near(r.total, 1200, 1e-9)
  }
  near(loan({ value: 1200, n: 12, rate: 0, system: 'price' }).installment, 100)
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
