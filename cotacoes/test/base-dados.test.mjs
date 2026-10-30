import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { BASE_DADOS, ARQUIVOS_COBERTOS, ATRIBUICOES } from '../src/baseDados.js'
import { FONTES } from '../src/governanca.js'

const src = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')

test('base de dados: toda referência traz quem publica, endereço, série, arquivo e coleta', () => {
  assert.ok(BASE_DADOS.length >= 6)
  const nomes = new Set()
  for (const g of BASE_DADOS) {
    assert.ok(g.grupo && g.itens.length, g.grupo)
    for (const i of g.itens) {
      for (const k of ['nome', 'orgao', 'api', 'pagina', 'arquivo', 'serie', 'freq']) assert.ok(typeof i[k] === 'string' && i[k].length >= 2, `${i.nome}: ${k}`)
      assert.match(i.pagina, /^https:\/\//, `${i.nome}: página pública`)
      assert.ok(!nomes.has(i.nome), `nome repetido: ${i.nome}`); nomes.add(i.nome)
    }
  }
})
test('base de dados: todo arquivo de dados publicado ou lido pelo app tem referência', () => {
  const publicados = new Set()
  for (const f of ['pages.yml', 'quotes.yml']) for (const m of readFileSync(new URL(`../../.github/workflows/${f}`, import.meta.url), 'utf8').matchAll(/([a-z-]+\.json)/g)) publicados.add(m[1])
  for (const f of readdirSync(new URL('../scripts/', import.meta.url)).filter((x) => /^fetch-.*\.mjs$/.test(x))) for (const m of readFileSync(new URL(`../scripts/${f}`, import.meta.url), 'utf8').matchAll(/public\/([a-z-]+\.json)/g)) publicados.add(m[1])
  for (const f of readdirSync(new URL('../src/', import.meta.url)).filter((x) => /\.(js|jsx)$/.test(x))) for (const m of src(f).matchAll(/(?:useDataFile|loadDataFile)\('([a-z-]+\.json)'/g)) publicados.add(m[1])
  const faltam = [...publicados].filter((a) => !ARQUIVOS_COBERTOS.includes(a) && !['package.json', 'package-lock.json', 'manifest.json', 'tsconfig.json', 'stale.json', 'validation.json'].includes(a))
  assert.deepEqual(faltam, [], `arquivos sem linha na Base de dados: ${faltam.join(', ')}`)
})
test('base de dados: todas as fontes da governança aparecem na Base de dados', () => {
  const arquivos = new Set(ARQUIVOS_COBERTOS)
  for (const f of FONTES) assert.ok(f.chaves.length && f.origem, f.id)
  assert.ok(['macro.json', 'curves.json', 'oil.json', 'fuels.json', 'commodities-brl.json', 'estr.json', 'euro-curve.json'].every((a) => arquivos.has(a)))
  assert.ok(ATRIBUICOES.some((a) => /BLS/.test(a.fonte)) && ATRIBUICOES.every((a) => a.texto.length > 30))
})
test('painéis não mostram origem do dado: fonte, API e links ficam só em Configurações › Base de dados', () => {
  const permitidos = new Set(['Config.jsx', 'BaseDados.jsx', 'Novidades.jsx'])
  for (const f of readdirSync(new URL('../src/', import.meta.url)).filter((x) => x.endsWith('.jsx') && !permitidos.has(x))) {
    const t = src(f)
    assert.doesNotMatch(t, /Fontes?: /, `${f}: texto "Fonte:" em painel`)
    assert.doesNotMatch(t, /href="https?:\/\/(?!wa\.me)/, `${f}: link externo fixo em painel`)
    assert.doesNotMatch(t, /\{[^}]*sourceName[^}]*\}\s*[·<]/, `${f}: nome da fonte exibido`)
  }
})
test('o botão de atualizar mostra a data e a hora da última atualização do painel', () => {
  const t = src('RefreshButton.jsx')
  assert.ok(t.includes('useCollectedAt') && t.includes('Atualizado em'))
  assert.ok(src('Config.jsx').includes('<BaseDados />'))
})
