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

test('temas de moedas: título precisa citar a moeda e trazer contexto de câmbio', () => {
  const t = (id) => TEMAS.find((x) => x.id === id)
  assert.equal(relevanteTema(t('moeda-usd'), 'Dólar fecha em alta de 1,2% contra o real com Fed'), true)
  assert.equal(relevanteTema(t('moeda-usd'), 'Prêmio de R$ 1 milhão em dólar? Veja a promoção'), true) // aceita: cita dólar e R$; é título raro
  assert.equal(relevanteTema(t('moeda-eur'), 'BCE mantém juros e euro recua frente ao dólar'), true)
  assert.equal(relevanteTema(t('moeda-eur'), 'Eurocopa: seleção estreia hoje'), false)
  assert.equal(relevanteTema(t('moeda-jpy'), 'Iene cai e Japão sinaliza intervenção no câmbio'), true)
  assert.equal(relevanteTema(t('moeda-cnh'), 'Yuan sobe com fixing mais forte do PBOC'), true)
  assert.equal(relevanteTema(t('moeda-cnh'), 'China anuncia novo plano de saúde'), false)
  for (const id of ['moeda-usd', 'moeda-eur', 'moeda-jpy', 'moeda-cnh']) assert.ok(temasFile({}, 1).temas[id], id)
})

test('Moedas: junta as matérias das quatro moedas, sem repetir link, mais recente primeiro', async () => {
  const { juntarMoedas } = await import('../src/reforma.js')
  const it = (link, t) => ({ title: link, link, source: 'X', t })
  const r = juntarMoedas({ 'moeda-usd': { items: [it('a', 3), it('b', 1)] }, 'moeda-eur': { items: [it('b', 1), it('c', 2)] }, 'moeda-jpy': { items: [] } })
  assert.deepEqual(r.map((x) => [x.link, x.codes.join('+')]), [['a', 'USD'], ['c', 'EUR'], ['b', 'USD+EUR']])
})
