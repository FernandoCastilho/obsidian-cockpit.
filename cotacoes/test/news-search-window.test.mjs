import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { indexSearchData, searchDocuments } from '../src/globalSearch.js'
import { NEWS_WINDOW_MS } from '../src/newsWindow.js'
const now = Date.parse('2026-11-05T12:00:00Z')
const article = (title, t) => ({ title, t, source: 'Fonte', link: 'https://example.test/' + title })
const items = [article('limiteexato', now - NEWS_WINDOW_MS), article('recentevalida', now - 1), article('expiradaunica', now - NEWS_WINDOW_MS - 1), article('futurounico', now + 1), article('semdatainvalida', undefined), article('textoinvalido', String(now))]
const fixtures = [
  ['news.json', { news: { USD: items } }, 'noticias'],
  ['temas.json', { temas: { 'moeda-usd': { label: 'Moeda', items }, cobre: { label: 'Metal', items } } }, 'resumo'],
  ['reforma-tributaria.json', { topic: 'reforma-tributaria', items }, 'resumo'],
]
for (const [file, data, route] of fixtures) test(`${file}: publication window prunes articles and aggregated bodies`, () => {
  const original = JSON.stringify(data)
  const docs = indexSearchData(file, { ...data, generatedAt: now }, route, 'Notícias', now).docs
  for (const word of ['limiteexato', 'recentevalida']) assert.ok(searchDocuments(docs, word).length, word)
  for (const word of ['expiradaunica', 'futurounico', 'semdatainvalida', 'textoinvalido']) {
    assert.equal(searchDocuments(docs, word).length, 0, word)
    assert.ok(!JSON.stringify(docs).includes(word), word)
  }
  assert.equal(JSON.stringify(data), original)
})
test('cached news is reindexed as the clock crosses the boundary, including parent bodies', () => {
  const data = { generatedAt: now, temas: { cobre: { label: 'Metal', items: [article('expiraagora', now - NEWS_WINDOW_MS)] } } }
  assert.ok(searchDocuments(indexSearchData('temas.json', data, 'resumo', 'Temas', now).docs, 'expiraagora').length)
  assert.equal(searchDocuments(indexSearchData('temas.json', data, 'resumo', 'Temas', now + 1).docs, 'expiraagora').length, 0)
})
test('empty or invalid news is valid empty search coverage, never metadata fallback', () => {
  assert.deepEqual(indexSearchData('news.json', { generatedAt: now, news: { USD: [article('oldonly', 1)] } }, 'noticias', 'Manchetes', now).docs, [])
  assert.deepEqual(indexSearchData('reforma-tributaria.json', { generatedAt: now, items: [] }, 'resumo', 'Reforma', now).docs, [])
})
test('publication time is independent of collection time or dates mentioned in the headline', () => {
  const data = { generatedAt: 1, news: { USD: [article('Estudo de 1990 republicado', now), article('Previsões 2027 antigas', 1)] } }
  const docs = indexSearchData('news.json', data, 'noticias', 'Manchetes', now).docs
  assert.ok(searchDocuments(docs, '1990').length)
  assert.equal(searchDocuments(docs, '2027').length, 0)
})
test('indicator history, monthly vehicle data and economic calendar stay searchable', () => {
  for (const file of ['indicator-history.json', 'heavy-vehicles.json', 'calendar.json']) {
    const docs = indexSearchData(file, { generatedAt: 1, items: [article('referenciahistorica', 1), article('eventofuturo', now + NEWS_WINDOW_MS)] }, 'cenarios/atividade', 'Dados', now).docs
    assert.ok(searchDocuments(docs, 'referenciahistorica').length)
    assert.ok(searchDocuments(docs, 'eventofuturo').length)
  }
})
test('global search reindexes snapshots with the shared clock without adding a fetch dependency', () => {
  const source = readFileSync(new URL('../src/GlobalSearch.jsx', import.meta.url), 'utf8')
  assert.match(source, /const now = useNewsClock\(\)/)
  assert.match(source, /indexSearchData\(file, data, route, label, now\)/)
  assert.match(source, /\[docs, newsSnapshots, now\]/)
  assert.match(source, /\},\[open,attempt\]\)/)
})
