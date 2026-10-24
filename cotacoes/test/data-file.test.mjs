import test from 'node:test'
import assert from 'node:assert/strict'
import { loadDataFile } from '../src/useDataFile.js'
test('arquivos compartilhados deduplicam carga, respeitam TTL e preservam dados em falha', async () => {
  const previous = globalThis.fetch
  let calls = 0, fail = false
  globalThis.fetch = async () => { calls++; if (fail) throw new Error('offline'); return { ok: true, json: async () => ({ generatedAt: 100, cdi: [[1, 10]] }) } }
  try {
    const [a, b] = await Promise.all([loadDataFile('test-shared.json'), loadDataFile('test-shared.json')])
    assert.equal(calls, 1)
    assert.equal(a, b)
    await loadDataFile('test-shared.json')
    assert.equal(calls, 1)
    fail = true
    const stale = await loadDataFile('test-shared.json', Date.now() + 600000)
    assert.equal(stale.data, a.data)
    assert.equal(stale.stale, true)
    assert.equal(stale.error, 'offline')
    fail = false
    const recovered = await loadDataFile('test-shared.json', Date.now() + 600000)
    assert.equal(recovered.stale, undefined)
  } finally { globalThis.fetch = previous }
})

import { browserClock, hookRenderer, json } from './helpers/hooks.mjs'
import { useDataFile } from '../src/useDataFile.js'
test('arquivo compartilhado pausa oculto, revalida ao foco e remove ouvintes ao sair', async (t) => {
  const clock = browserClock(t)
  let calls = 0
  globalThis.fetch = async () => { calls++; return json({ generatedAt: clock.now }) }
  const r = hookRenderer(() => useDataFile('test-focus.json'))
  clock.cleanup(() => r.close())
  await r.settle()
  assert.equal(calls, 1)
  clock.doc.hidden = true
  clock.doc.dispatch('visibilitychange')
  await clock.advance(11 * 60000)
  assert.equal(calls, 1)
  clock.doc.hidden = false
  clock.win.dispatch('focus')
  clock.doc.dispatch('visibilitychange')
  await r.settle()
  assert.equal(calls, 2)
  r.close()
  assert.equal(clock.doc.size, 0)
  assert.equal(clock.win.size, 0)
})
