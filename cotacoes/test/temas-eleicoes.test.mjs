import test from 'node:test'
import assert from 'node:assert/strict'
import { TEMAS, relevanteTema, temasFile } from '../scripts/temas-lib.mjs'

test('tema Eleições nos EUA: só títulos de eleição com contexto americano', () => {
  const t = TEMAS.find((x) => x.id === 'eleicoes-eua')
  assert.equal(t.grupo, 'mercado')
  assert.equal(relevanteTema(t, 'Eleições de meio de mandato nos EUA: dólar sobe à espera do resultado no Senado'), true)
  assert.equal(relevanteTema(t, 'Midterms: Wall Street avalia risco de Congresso dividido'), true)
  assert.equal(relevanteTema(t, 'Eleições municipais movimentam Curitiba'), false) // sem contexto americano
  assert.equal(relevanteTema(t, 'Dólar sobe com Treasuries em alta'), false) // sem eleição
  assert.ok(temasFile({}, 1).temas['eleicoes-eua'], 'entra no temas.json')
})
