import test from 'node:test'
import assert from 'node:assert/strict'
import { FINIMP_TERMS, finimpCost, compareFinimp, solveFinimpRate } from '../src/finimpComparison.js'
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)), `${actual} ≠ ${expected}`)
// Twenty-four hand-calculated synthetic scenarios, not bank quotes or image data.
const days = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360]
const expectedA = [1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000]
const expectedB = [3500 / 3, 5500 / 3, 2500, 9500 / 3, 11500 / 3, 4500, 15500 / 3, 17500 / 3, 6500, 21500 / 3, 23500 / 3, 8500]
for (let i = 0; i < days.length; i++) {
  for (const [name, annualRate, flatRate, expected] of [['Instituição 1', 6, 1, expectedA[i]], ['Instituição 2', 8, 0.5, expectedB[i]]]) {
    test(`FINIMP ${name}, ${days[i]} dias: juros simples e flat único`, () => {
      const r = finimpCost({ principal: 100000, annualRate, flatRate, days: days[i] })
      assert.equal(r.ok, true); near(r.cost, expected); near(r.periodPercent, expected / 1000)
      near(r.principalAndCosts, 100000 + expected)
    })
  }
}
test('diferença Instituição 2 − Instituição 1 conserva os três sinais', () => {
  for (const [days, sign] of [[30, -1], [90, 0], [360, 1]]) {
    const r = compareFinimp({ principal: 100000, days, competitor: { annualRate: 6, flatRate: 1 }, itau: { annualRate: 8, flatRate: 0.5 } })
    assert.equal(r.ok, true); assert.equal(Math.sign(r.difference), sign)
  }
})
test('TAC à vista não gera juros e flat não é multiplicado pelos dias', () => {
  const r = finimpCost({ principal: 100000, days: 180, annualRate: 6, flatRate: 1, tac: 150 })
  assert.equal(r.cost, 4150); assert.equal(r.interest, 3000); assert.equal(r.flat, 1000)
})
test('zeros válidos e principal zero inválido', () => {
  assert.equal(finimpCost({ principal: 1, days: 0, annualRate: 0, flatRate: 0 }).cost, 0)
  assert.equal(finimpCost({ principal: 100, days: 0, annualRate: 9, flatRate: 2, tac: 1 }).cost, 3)
  assert.equal(finimpCost({ principal: 0, days: 1, annualRate: 0, flatRate: 0 }).ok, false)
})
test('recusa negativos, nulos, texto, infinito, frações de dia e overflow', () => {
  const base = { principal: 100000, days: 180, annualRate: 6, flatRate: 1, tac: 0 }
  for (const key of Object.keys(base)) for (const value of [-1, null, NaN, Infinity, '1']) assert.equal(finimpCost({ ...base, [key]: value }).ok, false, `${key}: ${value}`)
  assert.equal(finimpCost({ ...base, days: 1.5 }).ok, false)
  assert.equal(finimpCost({ ...base, principal: Number.MAX_VALUE, annualRate: Number.MAX_VALUE }).ok, false)
})
test('atingir meta em 180 e 360 dias, igualdade e custo alvo', () => {
  for (const days of [180, 360]) {
    const competitor = finimpCost({ principal: 100000, days, annualRate: 6, flatRate: 1 })
    const solution = solveFinimpRate({ principal: 100000, days, flatRate: 0.5, tac: 100, targetCost: competitor.cost })
    assert.equal(solution.ok, true); near(solution.result.cost, competitor.cost)
    near(solution.annualRate, days === 180 ? 6.8 : 6.4)
  }
  const target = solveFinimpRate({ principal: 100000, days: 180, flatRate: 1, tac: 0, targetCost: 2000 })
  near(target.annualRate, 2); near(target.result.cost, 2000)
})
test('meta sem solução, indeterminada e taxa zero são distintas', () => {
  const base = { principal: 100000, days: 180, flatRate: 1, tac: 100 }
  assert.equal(solveFinimpRate({ ...base, targetCost: 1000 }).status, 'impossible')
  assert.equal(solveFinimpRate({ ...base, targetCost: 1100 }).annualRate, 0)
  assert.equal(solveFinimpRate({ ...base, days: 0, targetCost: 1100 }).status, 'indeterminate')
  assert.equal(solveFinimpRate({ ...base, days: 0, targetCost: 1101 }).status, 'impossible')
  assert.equal(solveFinimpRate({ ...base, targetCost: -1 }).status, 'invalid')
})
test('não arredonda valores intermediários', () => {
  const r = finimpCost({ principal: 123456.78, days: 181, annualRate: 6.1234567, flatRate: 0.1234567, tac: 12.34 })
  near(r.cost, 123456.78 * 0.061234567 * 181 / 360 + 123456.78 * 0.001234567 + 12.34)
  const solved = solveFinimpRate({ principal: 123456.78, days: 181, flatRate: 0.1234567, tac: 12.34, targetCost: r.cost })
  near(solved.annualRate, 6.1234567)
})

test('delta em pontos percentuais usa custos não arredondados, inclusive subcentavos', () => {
  const r = compareFinimp({principal:100000,days:180,competitor:{annualRate:6,flatRate:1},itau:{annualRate:8,flatRate:0.5}})
  near(r.deltaPp,0.5)
  for(const sign of [-1,1]) {
    const tiny=compareFinimp({principal:100000,days:180,competitor:{annualRate:6,flatRate:1},itau:{annualRate:6+sign*0.0000001,flatRate:1}})
    assert.equal(Math.sign(tiny.difference),sign)
    assert.ok(Math.abs(tiny.difference)<0.005)
    near(tiny.deltaPp,sign*0.00000005)
  }
})

test('FINIMP mantém doze prazos fixos e imutáveis, de 30 a 360 dias', () => {
  assert.deepEqual(FINIMP_TERMS, [30,60,90,120,150,180,210,240,270,300,330,360])
  assert.equal(Object.isFrozen(FINIMP_TERMS), true)
  assert.throws(() => {FINIMP_TERMS[0]=31}, TypeError)
})
