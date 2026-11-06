import test from 'node:test'
import assert from 'node:assert/strict'
import { taxaFinal, tlpNominal } from '../src/finameMateriais.js'
import { fullInput } from './fixtures/bndes-tfb/full-input.mjs'
import { reconcileCreditoPequenasEmpresas } from '../src/bndesCreditoPequenasEmpresas.js'

test('quadro central: fatores explícitos produzem 23,150839697% ao ano', () => {
  const effective = (1.0812 * 1.0125 * 1.02 * 1.1029 - 1) * 100
  assert.ok(Math.abs(effective - 23.150839697) < 1e-10)
  assert.ok(Math.abs(tlpNominal(taxaFinal(8.12, 1.25, 2), 10.29) - effective) < 1e-10)
  const monthly = 100 * Math.expm1(Math.log1p(effective / 100) / 12)
  assert.ok(Math.abs(monthly - 1.750475657) < 1e-9)
})

test('0,82% mensal: anualização linear e composta são cálculos diferentes', () => {
  const linearAnnual = 0.82 * 12
  const compoundAnnual = 100 * Math.expm1(12 * Math.log1p(0.0082))
  assert.equal(linearAnnual, 9.84)
  assert.ok(Math.abs(compoundAnnual - 10.2961408596) < 1e-8)
  // Compatibilidade aritmética com o quadro esquerdo, não acesso à fórmula de suas células.
  const tlpLinear = tlpNominal(8.12, linearAnnual)
  const combinedLinear = tlpNominal(taxaFinal(8.12, 1.25, 2), linearAnnual)
  assert.equal(tlpLinear.toFixed(2), '18.76')
  assert.equal(combinedLinear.toFixed(2), '22.65')
  assert.ok(Math.abs(combinedLinear - 22.648365512) < 1e-10)
  assert.ok(Math.abs(tlpNominal(taxaFinal(8.12, 1.25, 2), compoundAnnual) - 23.157696642) < 1e-8)
})

test('proveniência do perfil é cenário do usuário; fatores TLP não substituem TFB', () => {
  const input = fullInput()
  const result = reconcileCreditoPequenasEmpresas(input)
  assert.equal(result.profile.evidenceOrigin.kind, 'user-authored-test')
  assert.equal(result.profile.lenderProfileId, 'cenario-usuario-tfb-2026-10')
  assert.equal(result.annualRate.decimal, '0.175402')
  assert.equal(result.rows.length, 34)
  input.indexer = 'tlp'
  assert.equal(reconcileCreditoPequenasEmpresas(input).ok, false)
})
