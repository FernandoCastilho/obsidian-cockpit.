import test from 'node:test'
import assert from 'node:assert/strict'
import { newFinimpDraft } from '../src/calculatorDraft.js'
import { FINIMP_CURRENCIES, validateFinimpInputs } from '../src/finimpInputs.js'
import { compareFinimp, finimpCost, solveFinimpRate } from '../src/finimpComparison.js'

const fixture = (patch = {}) => ({
  ...newFinimpDraft(), principalText: '100000', currency: 'USD', useTac: true, tacFxText: '6',
  competitor: { annualRate: '6', flatRate: '1', tac: '1200' },
  itau: { annualRate: '8', flatRate: '0,5', tac: '600' },
  ...patch,
})

test('TAC em reais é convertida para a moeda do principal antes dos custos e da comparação', () => {
  for (const currency of FINIMP_CURRENCIES.filter(code => code !== 'BRL')) {
    const parsed = validateFinimpInputs(fixture({ currency }))
    assert.equal(parsed.conditionsReady, true)
    assert.deepEqual(parsed.errors, {})
    assert.equal(parsed.tacFx, 6)
    assert.equal(parsed.competitor.tacBrl, 1200)
    assert.equal(parsed.itau.tacBrl, 600)
    assert.equal(parsed.competitor.tac, 200)
    assert.equal(parsed.itau.tac, 100)
    const result = compareFinimp({ principal: parsed.principal, days: 180, competitor: parsed.competitor, itau: parsed.itau })
    assert.equal(result.ok, true)
    assert.equal(result.competitor.interest, 3000)
    assert.equal(result.competitor.flat, 1000)
    assert.equal(result.competitor.cost, 4200)
    assert.equal(result.itau.cost, 4600)
    assert.equal(result.difference, 400)
  }
})

test('iene e yuan offshore mantêm a TAC em reais e a meta na moeda selecionada', () => {
  assert.deepEqual(FINIMP_CURRENCIES, ['USD', 'EUR', 'JPY', 'CNH', 'BRL'])
  for (const [currency, tacFxText] of [['JPY', '0,03488'], ['CNH', '0,8258']]) {
    const parsed = validateFinimpInputs(fixture({ currency, tacFxText }))
    assert.equal(parsed.conditionsReady, true)
    assert.equal(parsed.competitor.tacBrl, 1200)
    assert.equal(parsed.competitor.tac, 1200 / Number(tacFxText.replace(',', '.')))
    const targetCost = finimpCost({ ...parsed.competitor, principal: parsed.principal, days: 180 }).cost
    const solved = solveFinimpRate({ principal: parsed.principal, days: 180, flatRate: parsed.itau.flatRate, tac: parsed.itau.tac, targetCost })
    assert.equal(solved.ok, true)
    assert.ok(Math.abs(solved.result.cost - targetCost) < 1e-8)
  }
})

test('moeda não suportada impede comparar uma proposta com unidade desconhecida', () => {
  const parsed = validateFinimpInputs(fixture({ currency: 'CNY' }))
  assert.equal(parsed.conditionsReady, false)
  assert.ok(parsed.errors['fi-currency'])
})

test('câmbio da TAC conserva precisão plena antes da formatação monetária', () => {
  const parsed = validateFinimpInputs(fixture({ tacFxText: '5,123456789', competitor: { annualRate: '6', flatRate: '1', tac: '1234,56' } }))
  assert.equal(parsed.conditionsReady, true)
  assert.equal(parsed.tacFx, 5.123456789)
  assert.equal(parsed.competitor.tac, 1234.56 / 5.123456789)
  assert.notEqual(parsed.competitor.tac, Number(parsed.competitor.tac.toFixed(2)))
})

test('TAC positiva em moeda estrangeira exige câmbio explícito e estritamente positivo', () => {
  for (const tacFxText of ['', '0', '-1', 'inválido', 'Infinity', '5%', '1.000,00']) {
    const parsed = validateFinimpInputs(fixture({ tacFxText }))
    assert.equal(parsed.conditionsReady, false, tacFxText)
    assert.ok(parsed.errors['fi-tac-fx'], tacFxText)
    assert.equal(compareFinimp({ principal: parsed.principal, days: 180, competitor: parsed.competitor, itau: parsed.itau }).ok, false)
  }
})

test('TAC zero dispensa câmbio e TAC desabilitada ignora rascunhos inválidos', () => {
  for (const tacFxText of ['', '0', '-1', 'inválido']) {
    const zero = validateFinimpInputs(fixture({ tacFxText, competitor: { annualRate: '6', flatRate: '1', tac: '0' }, itau: { annualRate: '8', flatRate: '0,5', tac: '0' } }))
    assert.equal(zero.conditionsReady, true, tacFxText)
    assert.deepEqual(zero.errors, {})
    assert.equal(zero.competitor.tac, 0)
    assert.equal(zero.itau.tac, 0)
    const disabled = validateFinimpInputs(fixture({ useTac: false, tacFxText, competitor: { annualRate: '6', flatRate: '1', tac: '-100' }, itau: { annualRate: '8', flatRate: '0,5', tac: 'inválido' } }))
    assert.equal(disabled.conditionsReady, true, tacFxText)
    assert.deepEqual(disabled.errors, {})
    assert.equal(disabled.competitor.tac, 0)
    assert.equal(disabled.itau.tac, 0)
  }
})

test('principal em reais usa câmbio unitário e TAC integral, ignorando câmbio estrangeiro anterior', () => {
  for (const tacFxText of ['', '5,5', '-1', 'inválido']) {
    const parsed = validateFinimpInputs(fixture({ currency: 'BRL', tacFxText }))
    assert.equal(parsed.conditionsReady, true, tacFxText)
    assert.deepEqual(parsed.errors, {})
    assert.equal(parsed.tacFx, 1)
    assert.equal(parsed.competitor.tac, 1200)
    assert.equal(parsed.itau.tac, 600)
    assert.equal(finimpCost({ ...parsed.competitor, principal: parsed.principal, days: 180 }).cost, 5200)
  }
})

test('meta de custo usa TAC convertida sem arredondamento intermediário', () => {
  const parsed = validateFinimpInputs(fixture({ tacFxText: '5,123456789', competitor: { annualRate: '6,1234567', flatRate: '0,1234567', tac: '1234,56' }, itau: { annualRate: '8', flatRate: '0,5', tac: '765,43' } }))
  const target = finimpCost({ ...parsed.competitor, principal: parsed.principal, days: 180 }).cost
  const solved = solveFinimpRate({ principal: parsed.principal, days: 180, flatRate: parsed.itau.flatRate, tac: parsed.itau.tac, targetCost: target })
  assert.equal(solved.ok, true)
  assert.ok(Math.abs(solved.result.cost - target) < 1e-9)
  const wrongCurrency = solveFinimpRate({ principal: parsed.principal, days: 180, flatRate: parsed.itau.flatRate, tac: parsed.itau.tacBrl, targetCost: target })
  assert.notEqual(solved.annualRate, wrongCurrency.annualRate)
})
