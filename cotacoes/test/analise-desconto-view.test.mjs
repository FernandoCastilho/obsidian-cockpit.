import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { transform } from 'esbuild'
import { renderToStaticMarkup } from 'react-dom/server'
import { hookRenderer } from './helpers/hooks.mjs'
import * as engine from '../src/analiseDesconto.js'
import * as money from '../src/moneyInput.js'
import { SEARCH_PAGES, buildSearchIndex } from '../scripts/build-search-index.mjs'

const require = createRequire(import.meta.url)
async function compile(file, imports = {}) {
  const source = (await readFile(new URL('../src/' + file, import.meta.url), 'utf8')).replace(/^import ['"].+\.css['"]\s*$/gm, '')
  const { code } = await transform(source, { loader: 'jsx', format: 'cjs', jsx: 'automatic' })
  const module = { exports: {} }
  runInNewContext(code, { module, exports: module.exports, require: (name) => imports[name] || require(name) })
  return module.exports
}
const MoneyInput = await compile('MoneyInput.jsx', { './moneyInput.js': money })
const component = await compile('AnaliseDesconto.jsx', { './MoneyInput.jsx': MoneyInput, './analiseDesconto.js': engine })
function nodes(node) {
  if (!node || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap(nodes)
  return [node, ...nodes(node.props?.children)]
}
async function setup(t) {
  const back = []
  const render = hookRenderer(() => component.default({ onBack: () => back.push(true) }))
  t.after(() => render.close()); await render.settle()
  const find = (id) => nodes(render.value).find((node) => node.props?.id === 'ad-' + id)
  const set = async (id, value) => {
    const element = find(id)
    assert.ok(element, id)
    element.props.onChange(element.type === MoneyInput.default ? value : { target: { value } })
    await render.settle()
  }
  const html = () => renderToStaticMarkup(render.value)
  const ready = async () => { await set('titleFeeMode', 'percent'); await set('iofAdditional', '0'); await set('operations', '7') }
  return { render, find, set, html, ready, back }
}

test('estado inicial exige premissas, mantém quatro prazos e tabelas acessíveis', async (t) => {
  const h = await setup(t), html = h.html()
  assert.match(html, /Análise de desconto/)
  assert.match(html, /Selecione a forma de cobrança/)
  assert.equal(h.find('iofAdditional').props.value, '')
  assert.equal(h.find('operations').props.value, '6')
  assert.match(html, /aria-invalid="true"/)
  assert.equal(nodes(h.render.value).filter((node) => node.type === 'table').length, 3)
  assert.equal(nodes(h.render.value).filter((node) => node.props?.role === 'region').length, 3)
  for (const months of [12,24,36,48]) assert.match(html, new RegExp(`${months} meses`))
})

test('edição real da tela reconcilia comparação, muda quantidade e invalida resultados antigos', async (t) => {
  const h = await setup(t); await h.ready()
  assert.match(h.html(), /32\.331,26/); assert.match(h.html(), /223\.607,95/)
  assert.match(h.html(), /150\.234,25/)
  await h.set('operations', '6')
  assert.doesNotMatch(h.html(), /32\.331,26/)
  assert.match(h.html(), /27\.712,51/)
  await h.set('operations', '')
  assert.equal(h.find('operations').props['aria-invalid'], true)
  assert.doesNotMatch(h.html(), /27\.712,51/)
  await h.set('operations', '7')
  assert.match(h.html(), /32\.331,26/)
})

test('troca tarifa sem perder entrada; unitária exige valor e IOF não é silencioso', async (t) => {
  const h = await setup(t); await h.ready()
  await h.set('titleFeeMode', 'unit')
  assert.equal(h.find('titleFeeUnit').props.value, '')
  assert.doesNotMatch(h.html(), /32\.331,26/)
  await h.set('titleFeeUnit', '18,80')
  assert.match(h.html(), /32\.331,25/)
  await h.set('titleFeeMode', 'percent')
  assert.match(h.html(), /32\.331,26/)
  await h.set('iofAdditional', '0,38')
  assert.match(h.html(), /6\.000,97/)
  assert.match(h.html(), /229\.608,92/)
  await h.set('titleFeeMode', 'unit')
  assert.equal(h.find('titleFeeUnit').props.value, '18,80')
})

test('principal manual, erros de data e retorno de navegação respondem às ações', async (t) => {
  const h = await setup(t); await h.ready()
  await h.set('giroPrincipalMode', 'manual')
  assert.equal(h.find('giroPrincipal').props['aria-invalid'], true)
  await h.set('giroPrincipal', '1.000.000,00')
  assert.match(h.html(), /1\.000\.000,00/)
  await h.set('date', '2026-02-30')
  assert.equal(h.find('date').props['aria-invalid'], true)
  assert.doesNotMatch(h.html(), /223\.607,95/)
  nodes(h.render.value).find((node) => node.type === 'button' && node.props.className === 'cx-back').props.onClick()
  assert.equal(h.back.length, 1)
})

test('texto distingue PMT, all-in, encargos completos, premissas e fluxos não equivalentes', async (t) => {
  const h = await setup(t), html = h.html()
  for (const phrase of ['Parcela Price, sem TAC e IOF', 'não é a parcela contratual', 'Custo total completo', 'não uma necessidade de capital de giro', 'não validação tributária', 'não são equivalentes', 'não é CET', 'não recalcula juros nem IOF']) assert.ok(html.includes(phrase), phrase)
  assert.doesNotMatch(html, /Giro PMT Mensal/)
})

test('rota, cartão e índice de busca incluem Análise de desconto sem alterar outras calculadoras', async () => {
  const source = await readFile(new URL('../src/Calculadora.jsx', import.meta.url), 'utf8')
  assert.match(source, /id: 'analise-desconto', title: 'Análise de desconto'/)
  assert.match(source, /view === 'analise-desconto'.*<AnaliseDesconto/)
  for (const old of ['giro', 'finimp', 'finame-materiais']) assert.ok(source.includes(`view === '${old}'`))
  assert.equal(SEARCH_PAGES['AnaliseDesconto.jsx'][0], 'calculadora/analise-desconto')
  const index = await buildSearchIndex()
  const document = index.documents.find((entry) => entry.id === 'page:AnaliseDesconto.jsx')
  assert.equal(document.route, 'calculadora/analise-desconto')
  assert.match(document.body, /Desconto × giro/)
})

// Seletores encontrados no QA Edge: folha cosmética do Kaspersky ocultava
// .ad-table e .ad-notice com display:none!important. Não desativar a proteção:
// o conteúdo financeiro não deve colidir com esse namespace de publicidade.
const cosmeticClasses = new Set(['ad-table', 'ad-notice'])
const blockedByCosmeticSelector = (node) => String(node.props?.className ?? '').split(/\s+/).some((name) => cosmeticClasses.has(name))
test('tabelas e avisos financeiros não colidem com os seletores cosméticos observados no QA', async (t) => {
  const h = await setup(t)
  for (const phase of ['initial', 'ready']) {
    if (phase === 'ready') { await h.set('titleFeeMode', 'total'); await h.set('iofAdditional', '0,38') }
    const blocked = nodes(h.render.value).filter(blockedByCosmeticSelector)
    assert.equal(blocked.length, 0, `${phase}: ${blocked.map((node) => node.props.className).join(', ')}`)
    assert.equal(nodes(h.render.value).filter((node) => node.type === 'table').length, 3)
  }
})

test('cada tabela real responde a tarifa, IOF explícito, invalidação e recuperação', async (t) => {
  const h = await setup(t)
  const cells = () => nodes(h.render.value).filter((node) => node.type === 'table').map((table) => nodes(table).filter((node) => node.type === 'td').map((cell) => cell.props.children))
  const assertEmpty = () => cells().forEach((table) => assert.ok(table.length > 0 && table.every((value) => value === '—')))
  const assertReady = () => cells().forEach((table) => assert.ok(table.length > 0 && table.every((value) => value !== '—' && !/NaN|Infinity/.test(value))))
  assertEmpty()
  await h.set('titleFeeMode', 'total'); assertEmpty()
  for (const mode of ['total', 'percent', 'unit']) {
    await h.set('titleFeeMode', mode)
    if (mode === 'unit') await h.set('titleFeeUnit', '18,80')
    await h.set('iofAdditional', '0,38'); assertReady()
    const populated = cells()
    await h.set('iofAdditional', ''); assertEmpty()
    await h.set('iofAdditional', 'inválido'); assertEmpty()
    await h.set('iofAdditional', '0,38'); assertReady()
    assert.deepEqual(cells(), populated)
    await h.set('operations', ''); assertEmpty()
    await h.set('operations', '6'); assertReady()
  }
})
