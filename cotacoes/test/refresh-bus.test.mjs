import assert from 'node:assert/strict'
import test from 'node:test'
import { onRefresh, requestRefresh } from '../src/refreshBus.js'

test('atualizar: cada fonte relê só os arquivos do painel e uma falha não bloqueia as outras', async () => {
  const lidos = []
  const off = [
    onRefresh((files) => { if (files.includes('macro.json')) lidos.push('macro') }),
    onRefresh((files) => { if (files.includes('curves.json')) { lidos.push('curvas'); throw new Error('fonte fora do ar') } }),
    onRefresh((files) => { if (files.includes('news.json')) lidos.push('notícias') }),
  ]
  const r = await requestRefresh(['macro.json', 'curves.json'])
  assert.deepEqual(lidos, ['macro', 'curvas'])
  assert.equal(r.failed, true)
  lidos.length = 0
  assert.equal((await requestRefresh(['news.json'])).failed, false)
  assert.deepEqual(lidos, ['notícias'])
  off.forEach((f) => f())
  lidos.length = 0
  await requestRefresh(['macro.json'])
  assert.deepEqual(lidos, [], 'depois de cancelar a inscrição, nada é relido')
})
