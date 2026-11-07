import test from 'node:test'
import assert from 'node:assert/strict'
import { latestDailyPoint, referencePeriod, publicReference } from '../src/insumoPresentation.js'

test('diário usa último ponto válido sem depender de referência mensal', () => {
  assert.equal(latestDailyPoint(null), null)
  assert.equal(latestDailyPoint({points: []}), null)
  assert.deepEqual(latestDailyPoint({points: [[1000, 1], [3000, NaN], [2000, 2], [Date.now()+999999, 50], [4000,-1]]}), [2000,2])
})
test('datas mantêm periodicidade sem inventar atualidade', () => {
  assert.equal(referencePeriod('2026-09'),'09/2026')
  assert.equal(referencePeriod('2026-10-20'),'20/10/2026')
  assert.equal(referencePeriod(null),'data não informada')
})
test('somente links públicos elegíveis são exibidos', () => {
  for (const url of ['https://www.gov.br/anp','https://eia.gov/data','https://thedocs.worldbank.org/data']) assert.equal(publicReference(url),true)
  for (const url of ['https://empresa.com','https://gov.br.evil.com','javascript:alert(1)',null]) assert.equal(publicReference(url),false)
})
