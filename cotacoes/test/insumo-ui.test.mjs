import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { transform } from 'esbuild'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as presentation from '../src/insumoPresentation.js'
import * as insumos from '../src/insumos.js'
import * as navigation from '../src/setoresNavigation.js'
const require = createRequire(import.meta.url)
async function render(view, data) {
  const source = await readFile(new URL('../src/SetoresLegado.jsx', import.meta.url), 'utf8')
  const { code } = await transform(source, { loader: 'jsx', format: 'cjs', jsx: 'automatic' })
  const module = { exports: {} }
  runInNewContext(code, { module, exports: module.exports, Date, require: name => {
    if (name === './useDataFile.js') return { useDataFile: file => ({status:'ok',data:data[file]}) }
    if (name === './insumoPresentation.js') return presentation
    if (name === './insumos.js') return insumos
    if (name === './setoresNavigation.js') return navigation
    if (name === './bankingSectors.js') return { resolveBankingTopic: () => null }
    if (name === './TerminalDesk.jsx') return { Panel: ({children}) => createElement('div',{},children) }
    if (name.endsWith('.css')) return {}
    if (name.endsWith('.jsx')) return ({children}) => createElement('div',{},children)
    return require(name)
  } })
  return renderToStaticMarkup(createElement(module.exports.default,{view}))
}
test('cobre diário aparece mesmo sem média mensal e sem promover data da leitura', async () => {
  const html=await render('cobre',{'commodities.json':{commodities:[]},'insumos-precos.json':{series:{cobre:{unit:'USD/tonelada',points:[[Date.parse('2026-10-01T12:00:00Z'),12345]]}}}})
  assert.match(html,/12\.345/)
  assert.match(html,/01\/10\/2026/)
  assert.match(html,/Referência mensal ainda não disponível/)
  assert.match(html,/O que influencia a cotação/)
})
test('dados ausentes e séries vazias não inventam cotação', async () => {
  for (const view of ['cobre','aluminio','aco','minerio','petroleo']) {
    const html=await render(view,{'commodities.json':{commodities:[]},'insumos-precos.json':{series:{cobre:{points:[]}}}})
    assert.doesNotMatch(html,/NaN|undefined|setor-valor/)
    assert.match(html,/Cotações e referências/)
  }
})
