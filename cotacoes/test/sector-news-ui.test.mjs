import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { transform } from 'esbuild'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { hookRenderer } from './helpers/hooks.mjs'

const require = createRequire(import.meta.url)
const now = Date.parse('2026-11-05T12:00:00Z')

async function setup(t, resource, normalize = data => data) {
  const source = await readFile(new URL('../src/SectorNews.jsx', import.meta.url), 'utf8')
  const { code } = await transform(source, { loader: 'jsx', format: 'cjs', jsx: 'automatic' })
  const module = { exports: {} }, polls = []
  let clock = now
  class Clock extends Date { static now() { return clock } }
  runInNewContext(code, { module, exports: module.exports, Date: Clock, require: name => {
    if (name === 'react') return { ...require(name), useMemo: fn => fn() }
    if (name === './useDataFile.js') return { useDataFile: () => resource }
    if (name === './visiblePolling.js') return { DATA_POLL_MS: 60000, startVisiblePolling: fn => { polls.push(fn); return () => {} } }
    if (name === './newsWindow.js') return { NEWS_WINDOW_MS: 120 * 3600000 }
    if (name === './sectorNews.js') return { normalizeSectorNews: normalize }
    if (name === './Estado.jsx') return ({ children }) => createElement('p', {}, children)
    return require(name)
  } })
  const render = hookRenderer(() => module.exports.default({ id: 'teste', label: 'Tema de teste' }))
  t.after(() => render.close())
  await render.settle()
  return { html: () => renderToStaticMarkup(render.value), advance: async milliseconds => { clock += milliseconds; polls.forEach(fn => fn()); await render.settle() } }
}

test('UI separa carregamento, falha, ausência de resultados e fonte não homologada', async t => {
  const loading = await setup(t, { status: 'loading' })
  assert.match(loading.html(), /Carregando a cobertura/)
  const error = await setup(t, { status: 'error' })
  assert.match(error.html(), /Não foi possível verificar a cobertura/)
  for (const [status, phrase] of [['empty', 'Nenhuma publicação relevante encontrada'], ['failed', 'A coleta deste tema falhou'], ['unavailable', 'Cobertura ainda indisponível'], ['partial', 'Cobertura parcial']]) {
    const component = await setup(t, { status: 'ok', data: { topics: { teste: { status, items: [], sources: [] } } } })
    assert.ok(component.html().includes(phrase), status)
    assert.ok(!component.html().includes('setor sem notícias'))
  }
})

test('UI atribui fonte e licença e não inventa hora para publicação informada somente por dia', async t => {
  const component = await setup(t, { status: 'ok', data: { topics: { teste: {
    status: 'partial', checkedAt: '2026-11-05T11:00:00Z', lastSuccessAt: '2026-11-05T11:00:00Z', sources: [],
    items: [{ title: 'Título sintético exclusivo do teste', link: 'https://example.org/noticia', source: 'Fonte de teste', type: 'official', licenseUrl: 'https://creativecommons.org/licenses/by-nd/3.0/', publishedAt: '2026-11-03', datePrecision: 'day', collectedAt: '2026-11-05T11:00:00Z', t: Date.parse('2026-11-03T15:00:00Z') }],
  } } } })
  const html = component.html()
  assert.match(html, /03\/11\/2026 · horário não informado pela fonte/)
  assert.match(html, /dateTime="2026-11-03"/)
  assert.match(html, /Fonte de teste · Comunicado oficial/)
  assert.match(html, /Licença de uso da fonte/)
  assert.ok(!html.includes('03/11/2026, 12:00'))
})

test('normalização é reaplicada após o relógio avançar com a página aberta', async t => {
  const times = []
  const component = await setup(t, { status: 'ok', data: {} }, (data, time) => { times.push(time); return { topics: { teste: { status: 'empty', items: [], sources: [] } } } })
  await component.advance(60000)
  assert.deepEqual(times, [now, now + 60000])
  assert.match(component.html(), /Janela móvel de 120 horas/)
})

test('arquivo inválido mostra falha, sem simular cobertura atual', async t => {
  const component = await setup(t, { status: 'ok', data: {} }, () => { throw Error('invalid') })
  assert.match(component.html(), /Arquivo de notícias inválido/)
  assert.match(component.html(), /Cobertura ainda indisponível/)
})

test('leitura falha com snapshot retido preserva aviso, fonte e data das publicações válidas', async t => {
  const component = await setup(t, { status: 'error', stale: true, data: { topics: { teste: {
    status: 'partial', checkedAt: '2026-11-05T11:00:00Z', lastSuccessAt: '2026-11-04T11:00:00Z',
    sources: [{ id: 'teste', label: 'Fonte sintética', status: 'failed', reason: 'Consulta falhou' }],
    items: [{ title: 'Manchete retida de teste', link: 'https://example.org/retida', source: 'Fonte sintética', type: 'official', publishedAt: '2026-11-04', datePrecision: 'day', collectedAt: '2026-11-04T11:00:00Z', t: Date.parse('2026-11-04T15:00:00Z') }],
  } } } })
  const html = component.html()
  assert.match(html, /Arquivo de notícias sem atualização nesta leitura/)
  assert.match(html, /Somente publicações ainda dentro da janela são mantidas/)
  assert.match(html, /Cobertura parcial/)
  assert.match(html, /Manchete retida de teste/)
  assert.match(html, /Fonte sintética · Comunicado oficial/)
  assert.match(html, /04\/11\/2026 · horário não informado pela fonte/)
  assert.match(html, /falha de consulta · Consulta falhou/)
  assert.match(html, /Coleta externa desabilitada/)
})
