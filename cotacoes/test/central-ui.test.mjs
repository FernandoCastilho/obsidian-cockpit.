import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { readFileSync } from 'node:fs'
const require = createRequire(import.meta.url)
async function getComponent() {
  const result = await build({ entryPoints:['src/Setores.jsx'], bundle:true, write:false, jsx:'automatic', format:'cjs', platform:'node', external:['react','react-dom'], loader:{'.css':'empty'} })
  const module = {exports:{}}
  runInNewContext(result.outputFiles[0].text, {module,exports:module.exports,require,URL,console,Date,Intl, setTimeout,clearTimeout})
  return module.exports.default
}
test('catálogo, detalhes, rota antiga B3 e insumos aparecem sem classificação separada', async () => {
  const Component = await getComponent()
  const html = view => renderToStaticMarkup(createElement(Component,{view}))
  const initial = html('')
  assert.match(initial,/Central de setores/)
  assert.match(initial,/Base florestal e madeira/)
  assert.match(initial,/Insumos e Indicadores/)
  assert.doesNotMatch(initial,/Roteiros existentes|Catálogo de tópicos\./)
  const topic=html('topico/base-florestal/3')
  assert.match(topic,/>Compensados</)
  const studies = JSON.parse(readFileSync('src/sectorStudies/studies.json', 'utf8'))
  if (studies.some(study => study.group === 'base-florestal' && study.topicIndex === 3)) {
    assert.match(topic,/Resumo executivo/)
    assert.match(topic,/perguntas-chave para conhecer o negócio/)
  } else assert.match(topic,/Estudo setorial não incluído/)
  const b3=html('b3')
  assert.match(b3,/antiga classificação B3 foi substituída/)
  assert.doesNotMatch(b3,/Visão bancária/)
})
