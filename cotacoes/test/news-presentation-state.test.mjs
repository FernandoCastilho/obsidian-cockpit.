import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { transform } from 'esbuild'
import { useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { hookRenderer } from './helpers/hooks.mjs'
import * as newsWindow from '../src/newsWindow.js'
const require = createRequire(import.meta.url)
const now = Date.parse('2026-11-05T12:00:00Z')
async function setup(t, patch = {}) {
  const source = await readFile(new URL('../src/Apresentacao.jsx', import.meta.url), 'utf8')
  // Export only inside the in-memory test module; production code stays unchanged.
  const { code } = await transform(source + '\nexport { Item as TestItem };\n', { loader: 'jsx', format: 'cjs', jsx: 'automatic' })
  const module = { exports: {} }
  let setClock
  runInNewContext(code, { module, exports: module.exports, require: name => {
    if (name === './newsWindow.js') return newsWindow
    if (name === './useNewsClock.js') return { useNewsClock: () => { const [clock, set] = useState(now); setClock = set; return clock } }
    if (name === './motion.js') return { cascade: () => ({}) }
    // No other imported child is used by this minimal Item slide (no graph).
    if (name.startsWith('./')) return {}
    return require(name)
  } })
  const slide = { item: { label: 'Indicador preservado', tema: 'cobre' }, dado: { semSerie: 'Referência histórica de 1990', frase: 'Informação permanente' }, move: [], periodo: { label: 'Ano', dias: 365 }, manchetes: [], newsState: { generatedAt: now }, ...patch }
  const render = hookRenderer(() => module.exports.TestItem({ s: slide }))
  t.after(() => render.close())
  await render.settle()
  return { html: () => renderToStaticMarkup(render.value), advance: async ms => { setClock(value => value + ms); await render.settle() } }
}
test('presentation item without a configured news topic does not pretend its collection is stale', async t => {
  const ui = await setup(t, { item: { label: 'Indicador sem cobertura' }, newsState: undefined })
  assert.match(ui.html(), /Cobertura de notícias não configurada para este item\./)
  assert.doesNotMatch(ui.html(), /Atualização das notícias incompleta|Nenhuma publicação válida/)
  assert.match(ui.html(), /Referência histórica de 1990/)
})
test('presentation configured topic reports a stale news snapshot separately from indicator data', async t => {
  const ui = await setup(t, { newsState: { generatedAt: now - 86400000 } })
  assert.match(ui.html(), /Atualização das notícias incompleta, atrasada ou não confirmada\./)
  assert.match(ui.html(), /Nenhuma publicação válida nas últimas 120 horas/)
  assert.doesNotMatch(ui.html(), /Cobertura de notícias não configurada/)
  assert.match(ui.html(), /Referência histórica de 1990/)
})
test('headline expires in an already-open presentation slide while the indicator stays', async t => {
  const ui = await setup(t, { manchetes: [{ title: 'Manchete temporária exclusiva', t: now - newsWindow.NEWS_WINDOW_MS, link: 'https://example.test/news', source: 'Fonte de teste' }] })
  assert.match(ui.html(), /Manchete temporária exclusiva/)
  await ui.advance(1)
  assert.doesNotMatch(ui.html(), /Manchete temporária exclusiva/)
  assert.match(ui.html(), /Nenhuma publicação válida nas últimas 120 horas/)
  assert.match(ui.html(), /Referência histórica de 1990/)
})
test('configured topic with a current empty snapshot does not show a false delay warning', async t => {
  const ui = await setup(t)
  assert.match(ui.html(), /Nenhuma publicação válida nas últimas 120 horas/)
  assert.doesNotMatch(ui.html(), /Atualização das notícias incompleta|Cobertura de notícias não configurada/)
})
