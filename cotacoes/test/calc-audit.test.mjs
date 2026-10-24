import test from 'node:test'
import assert from 'node:assert/strict'
import { compare, parseNum, parseRate, rateFactor, rateFromFactor } from '../src/calc.js'
import { simulate } from '../src/finimp.js'

const pts = [[21, 14.9], [63, 14.8], [126, 14.6], [252, 14.2], [504, 13.6]]
const base = { pts, d: 126, value: 1e6, side: 'borrow', calDays: 182 }

// Busca a taxa que zera a diferença, para conferir o ponto de equilíbrio devolvido pelo motor.
function solve(args, lo, hi) {
  for (let i = 0; i < 80; i++) {
    const m = (lo + hi) / 2
    if (compare({ ...args, rate: m }).diff <= 0) lo = m
    else hi = m
  }
  return (lo + hi) / 2
}

test('empréstimo em % do CDI: equilíbrio acompanha a rentabilidade da aplicação, bruta e líquida', () => {
  const gross = compare({ ...base, mode: 'cdi', rate: 104, appPct: 105 })
  assert.ok(Math.abs(gross.breakeven - 105) < 1e-6)
  const netArgs = { ...base, mode: 'cdi', appPct: 105, net: true }
  const net = compare({ ...netArgs, rate: 90 })
  assert.ok(Math.abs(net.breakeven - solve(netArgs, 0, 200)) < 1e-4)
  assert.ok(net.breakeven < 90)
})

test('empréstimo em CDI + spread: equilíbrio deixa de ser zero quando a aplicação não é 100% do CDI', () => {
  for (const unit of ['aa', 'am']) {
    const args = { ...base, mode: 'spread', unit, appPct: 110 }
    const r = compare({ ...args, rate: 0.5 })
    assert.ok(r.breakeven > 0)
    assert.ok(Math.abs(r.breakeven - solve(args, -10, 10)) < 1e-6)
  }
})

test('aplicação em % do CDI e spread: equilíbrio continua 100% e 0', () => {
  const inv = { pts, d: 126, value: 1e6, side: 'invest', calDays: 182 }
  assert.ok(Math.abs(compare({ ...inv, mode: 'cdi', rate: 101 }).breakeven - 100) < 1e-6)
  assert.ok(Math.abs(compare({ ...inv, mode: 'spread', rate: 1 }).breakeven) < 1e-9)
})

test('rateFromFactor é o inverso de rateFactor', () => {
  for (const [unit, b] of [['aa', 'du'], ['am', 'du'], ['am', 'cal'], ['periodo', 'du']]) {
    const f = rateFactor(1.37, unit, 126, 182, b)
    assert.ok(Math.abs(rateFromFactor(f, unit, 126, 182, b) - 1.37) < 1e-9)
  }
})

test('leitura de números: milhar em valores, decimal em taxas e zero à esquerda', () => {
  assert.equal(parseNum('1.250'), 1250)
  assert.equal(parseNum('1.000.000,50'), 1000000.5)
  assert.equal(parseNum('0.500'), 0.5)
  assert.equal(parseRate('1.250'), 1.25)
  assert.equal(parseRate('14,5'), 14.5)
  assert.equal(parseRate('1.250,5'), 1250.5)
  assert.ok(Number.isNaN(parseRate('abc')))
})

test('FINIMP composta: tranche desembolsada no meio do período capitaliza só desde a própria data', () => {
  const r = simulate({ currency: 'USD', disb: [{ date: '2026-01-01', amount: 1e6 }, { date: '2026-07-01', amount: 1e6 }], structure: 'bullet', maturity: '2027-01-01', rate: 8, rule: 'comp', dayCount: 'ACT/365F' })
  assert.equal(r.ok, true)
  const exact = 1e6 * (1.08 ** (365 / 365) - 1) + 1e6 * (1.08 ** (184 / 365) - 1)
  assert.ok(Math.abs(r.totals.interest - exact) < 0.01)
  assert.ok(r.checks.every((c) => c.ok))
})

test('FINIMP composta com juros periódicos: após o pagamento, saldo inteiro conta do novo período', () => {
  const r = simulate({ currency: 'USD', disb: [{ date: '2026-01-01', amount: 1e6 }, { date: '2026-03-01', amount: 5e5 }], structure: 'periodic', maturity: '2027-01-01', interestDates: ['2026-07-01'], rate: 8, rule: 'comp', dayCount: 'ACT/365F' })
  assert.equal(r.ok, true)
  const p1 = 1e6 * (1.08 ** (181 / 365) - 1) + 5e5 * (1.08 ** (122 / 365) - 1)
  const p2 = 1.5e6 * (1.08 ** (184 / 365) - 1)
  assert.ok(Math.abs(r.rows.find((x) => x.date === '2026-07-01').interestPaid - p1) < 0.01)
  assert.ok(Math.abs(r.rows.at(-1).interestPaid - p2) < 0.01)
})

test('FINIMP proporcional não muda com tranches', () => {
  const r = simulate({ currency: 'USD', disb: [{ date: '2026-01-01', amount: 1e6 }, { date: '2026-07-01', amount: 1e6 }], structure: 'bullet', maturity: '2027-01-01', rate: 8, rule: 'prop', dayCount: 'ACT/360' })
  assert.ok(Math.abs(r.totals.interest - (1e6 * 0.08 * 365 / 360 + 1e6 * 0.08 * 184 / 360)) < 0.01)
})

test('FINIMP ignora linha de desembolso em branco, mas acusa linha pela metade', () => {
  const common = { currency: 'USD', structure: 'bullet', maturity: '2027-05-03', rate: 7, rule: 'prop', dayCount: 'ACT/360' }
  assert.equal(simulate({ ...common, disb: [{ date: '2026-11-03', amount: 1e6 }, { date: '', amount: '' }] }).ok, true)
  const half = simulate({ ...common, disb: [{ date: '2026-11-03', amount: 1e6 }, { date: '2026-12-01', amount: '' }] })
  assert.equal(half.ok, false)
  assert.ok(half.missing.some((m) => /incompleto/.test(m)))
})
