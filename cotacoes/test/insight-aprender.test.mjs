import test from 'node:test'
import assert from 'node:assert/strict'
import { chaveInsight, sortearInsight } from '../src/insightAprender.js'
import { CONCEITOS } from '../src/educacao.js'

test('insight do Aprender: sorteia trecho de um conceito existente e não repete o último', () => {
  const ids = new Set(CONCEITOS.map((c) => c.id))
  const vistos = new Set()
  for (let k = 0; k < 200; k++) { const i = sortearInsight(); assert.ok(ids.has(i.id) && i.texto.length > 20 && i.texto.length <= 280 && ['O que é', 'Para lembrar', 'Cuidado'].includes(i.tipo)); vistos.add(i.id) }
  assert.ok(vistos.size > CONCEITOS.length / 2, 'varia entre conceitos')
  const primeiro = sortearInsight(() => 0)
  assert.notEqual(chaveInsight(sortearInsight(() => 0, chaveInsight(primeiro))), chaveInsight(primeiro))
})
