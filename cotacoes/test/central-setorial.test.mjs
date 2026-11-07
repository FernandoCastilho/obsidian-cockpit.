import test from 'node:test'
import assert from 'node:assert/strict'
import { CATALOGO_SETORIAL, TOPICOS_ESTUDO, normalizeSector } from '../src/centralSetorial.js'

test('catálogo reúne onze setores, subsetores únicos por grupo e oito temas de estudo', () => {
  assert.equal(CATALOGO_SETORIAL.length, 11)
  assert.equal(new Set(CATALOGO_SETORIAL.map(g => g.id)).size, 11)
  assert.equal(TOPICOS_ESTUDO.length, 8)
  for (const group of CATALOGO_SETORIAL) assert.equal(new Set(group.topics).size, group.topics.length)
  assert.equal(normalizeSector('Compensadós'), 'compensados')
})


