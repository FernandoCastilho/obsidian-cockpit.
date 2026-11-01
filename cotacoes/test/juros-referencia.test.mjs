import test from 'node:test'
import assert from 'node:assert/strict'
import { TIPOS_TAXA, splitUnit } from '../src/glossary.js'

test('juros de referência: separa tipo e unidade; os dois tipos da tabela têm explicação', () => {
  assert.deepEqual(splitUnit('Mercado overnight · % a.a.'), { tipo: 'Mercado overnight', unidade: '% a.a.' })
  assert.deepEqual(splitUnit('% a.a.'), { tipo: '', unidade: '% a.a.' })
  assert.deepEqual(splitUnit(), { tipo: '', unidade: '' })
  assert.match(TIPOS_TAXA['Mercado overnight'], /1 dia[\s\S]*dia útil seguinte/)
  assert.match(TIPOS_TAXA['Política monetária'], /banco central/)
})
