import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { hasFlag } from '../src/flags.js'
import { MOEDAS, moedasDaManchete, nomeDaMoeda } from '../src/moedasNoTexto.js'

const it = (title, codes = [], extra = {}) => ({ title, codes, ...extra })

test('toda moeda reconhecida tem bandeira desenhada e nome', () => {
  for (const m of MOEDAS) { assert.ok(hasFlag(m.code), m.code); assert.ok(nomeDaMoeda(m.code).length > 2) }
})
test('detecta as moedas citadas no título, sem repetir', () => {
  assert.deepEqual(moedasDaManchete(it('Dólar sobe com fala de Powell no Fed')), ['USD'])
  assert.deepEqual(moedasDaManchete(it('BCE mantém juros e euro recua')), ['EUR'])
  assert.deepEqual(moedasDaManchete(it('Banco do Japão sinaliza alta; iene dispara')), ['JPY'])
  assert.deepEqual(moedasDaManchete(it('Yuan cai após decisão do PBoC')), ['CNH'])
  assert.deepEqual(moedasDaManchete(it('Libra reage ao Banco da Inglaterra')), ['GBP'])
  assert.deepEqual(moedasDaManchete(it('Selic, Copom e Ibovespa em foco')), ['BRL'])
})
test('junta as moedas da busca com as do texto: busca primeiro, ordem estável', () => {
  assert.deepEqual(moedasDaManchete(it('Dólar e iene sobem; Ibovespa cai', ['JPY'])), ['JPY', 'USD', 'BRL'])
  assert.deepEqual(moedasDaManchete(it('Mercado azedo hoje', ['USD', 'MERCADO'])), ['USD'], 'MERCADO não é moeda')
  assert.deepEqual(moedasDaManchete(it('Dólar sobe', ['USD'])), ['USD'])
})
test('sem moeda reconhecida, sem bandeira; usa também o título original em inglês', () => {
  assert.deepEqual(moedasDaManchete(it('Safra de soja avança no Mato Grosso')), [])
  assert.deepEqual(moedasDaManchete({}), [])
  assert.deepEqual(moedasDaManchete(it('Tradução sem pistas', [], { original: 'Yen slides as Bank of Japan holds' })), ['JPY'])
})
test('o painel de manchetes mostra as bandeiras de cada matéria', () => {
  const r = readFileSync(new URL('../src/Resumo.jsx', import.meta.url), 'utf8')
  assert.ok(r.includes('<MoedasCitadas item={n} />') && r.includes('Moedas citadas:'))
})
