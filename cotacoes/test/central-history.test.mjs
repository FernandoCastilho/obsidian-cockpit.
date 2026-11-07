import test from 'node:test'
import assert from 'node:assert/strict'
import { readCentralHistory, withCentralHistory } from '../src/centralHistory.js'

test('histórico preserva campos de outros recursos e não modifica a entrada anterior', () => {
  const original = { diagramFullscreen: true, other: { value: 7 } }
  const context = { view: 'central', query: 'compensados', scroll: 200, focusId: 'central-topic-base-florestal-3' }
  const state = withCentralHistory(original, context)
  assert.equal(state.diagramFullscreen, true)
  assert.deepEqual(state.other, { value: 7 })
  assert.equal(original.centralSetorial, undefined)
  assert.deepEqual(readCentralHistory(state, 'central'), context)
})

test('voltar, avançar e remontar leem a busca de cada entrada sem intenção transitória', () => {
  const search = { view: 'central', query: 'compensados', scroll: 300, focusId: 'central-topic-base-florestal-3' }
  const study = { view: 'topico/base-florestal/3', query: '', scroll: null, focusId: '' }
  const entries = [withCentralHistory(null, search), withCentralHistory(null, study), withCentralHistory(null, search)]
  for (const index of [0, 1, 2, 1, 2]) {
    const expected = index === 1 ? study : search
    assert.deepEqual(readCentralHistory(structuredClone(entries[index]), expected.view), expected)
  }
  const freshStudy = withCentralHistory(null, { ...study, view: 'topico/tic/1' })
  assert.equal(readCentralHistory(freshStudy, 'topico/tic/1').query, '')
})

test('limpar busca é preservado e contextos de outra rota são ignorados', () => {
  const state = withCentralHistory(null, { view: 'central', query: '', scroll: 0, focusId: '' })
  assert.equal(readCentralHistory(state, 'central').query, '')
  assert.equal(readCentralHistory(state, 'topico/tic/0'), null)
  assert.equal(readCentralHistory(null, 'central'), null)
  assert.equal(readCentralHistory({ centralSetorial: { view: 'central', query: 4 } }, 'central'), null)
  assert.deepEqual(readCentralHistory({ centralSetorial: { view: 'central', query: 'a', scroll: -1, focusId: 5 } }, 'central'), { view: 'central', query: 'a', scroll: null, focusId: '' })
})
