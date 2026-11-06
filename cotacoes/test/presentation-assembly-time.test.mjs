import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { transform } from 'esbuild'
import { renderToStaticMarkup } from 'react-dom/server'
import { montarRoteiro, PERIODOS } from '../src/apresentacao.js'

const require = createRequire(import.meta.url)
const source = await readFile(new URL('../src/Apresentacao.jsx', import.meta.url), 'utf8')
const { code } = await transform(source + '\nexport { Capa, Cenario, Fim };', { loader: 'jsx', format: 'cjs', jsx: 'automatic' })
const module = { exports: {} }
runInNewContext(code, { module, exports: module.exports, require: (name) => {
  if (name === './motion.js') return { cascade: () => ({}) }
  if (name === './HistoryChart.jsx') return { useWidth: () => [null, 700] }
  if (name.startsWith('./')) return {}
  return require(name)
} })
const assembledAt = Date.parse('2026-11-05T19:19:00Z')
const quoteAt = Date.parse('2026-11-04T18:00:00Z')
const roteiro = montarRoteiro({ nome: 'Empresa de teste', setorId: 'metalmecanica', itens: ['usd'], periodo: PERIODOS[0] }, { agora: assembledAt, quotes: { USD: { bid: 5.25, timestamp: quoteAt } } })
for (const [kind, component] of [['capa', 'Capa'], ['cenario', 'Cenario'], ['fim', 'Fim']]) {
  test(`${component}: horário da montagem não promete atualização dos dados`, () => {
    const slide = roteiro.find((entry) => entry.kind === kind)
    const html = renderToStaticMarkup(module.exports[component]({ s: { ...slide, minis: [] } }))
    assert.match(html, /Apresentação montada em/)
    assert.match(html, /05\/11\/2026/)
    assert.match(html, /16:19/)
    assert.match(html, /Datas de referência nos indicadores e snapshots/)
    assert.doesNotMatch(html, /[Dd]ados de 05\/11/)
  })
}
test('montagem preserva horário original da cotação em vez de substituí-lo pelo relógio do player', () => {
  const item = roteiro.find((entry) => entry.kind === 'item')
  assert.match(item.dado.quando, /04\/11/)
  assert.doesNotMatch(item.dado.quando, /05\/11/)
})
