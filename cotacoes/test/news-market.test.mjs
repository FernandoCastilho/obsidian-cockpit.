import test from 'node:test'
import assert from 'node:assert/strict'
import { MARKET_QUERIES, balance, canonicalSource, freshOnly, googleUrl } from '../scripts/news-lib.mjs'
import { fillNewsFromPrevious } from '../scripts/prev-lib.mjs'
import { topHeadlines } from '../src/snapshot.js'
import { buildFeed } from '../src/feed.js'

test('googleUrl: janela padrão de 7 dias e janela curta para o mercado de hoje', () => {
  assert.match(decodeURIComponent(googleUrl('dólar', 'pt')), /dólar when:7d/)
  assert.match(decodeURIComponent(googleUrl('Ibovespa site:valor.globo.com', 'pt', '2d')), /Ibovespa site:valor\.globo\.com when:2d/)
  assert.equal(MARKET_QUERIES.length, 3)
})

test('freshOnly: descarta matéria velha ou sem horário', () => {
  const now = Date.parse('2026-10-29T12:00:00Z')
  const items = [{ t: now - 3600e3, title: 'novo' }, { t: now - 4 * 864e5, title: 'velho' }, { t: 0, title: 'sem data' }, { t: now - 2 * 864e5, title: 'ontem+' }]
  assert.deepEqual(freshOnly(items, now).map((i) => i.title), ['novo', 'ontem+'])
})

test('Valor Econômico entra no mercado de hoje e o balanceamento o mantém junto das demais fontes', () => {
  const v = { title: 'Ibovespa cai', source: canonicalSource({ source: 'Valor Econômico', sourceUrl: 'https://valor.globo.com' }), t: 3, link: 'https://v/1' }
  const o = { title: 'Dólar fecha', source: 'InfoMoney', t: 2, link: 'https://i/1' }
  assert.equal(v.source, 'Valor Econômico')
  assert.deepEqual(balance([o, v], 2).map((i) => i.source), ['Valor Econômico', 'InfoMoney'])
})

test('mercado hoje: aparece no feed, nas manchetes de destaque e é preservado se a coleta vier vazia', () => {
  const news = { news: { USD: [{ title: 'u', link: 'l1', t: 5 }], MERCADO: [{ title: 'm1', link: 'l2', t: 9 }, { title: 'm2', link: 'l3', t: 8 }, { title: 'm3', link: 'l4', t: 7 }, { title: 'm4', link: 'l5', t: 6 }] } }
  const feed = buildFeed(news.news, 'MERCADO', 10)
  assert.deepEqual(feed.map((n) => n.title), ['m1', 'm2', 'm3', 'm4'])
  assert.deepEqual(buildFeed(news.news, 'ALL', 10).map((n) => n.title).slice(0, 2), ['m1', 'm2'])
  const heads = topHeadlines(news)
  assert.deepEqual(heads.map((h) => h.code + ':' + h.title), ['MERCADO:m1', 'MERCADO:m2', 'MERCADO:m3', 'USD:u'])
  assert.deepEqual(topHeadlines({ news: { USD: [{ title: 'u', t: 1 }] } }).map((h) => h.code), ['USD'])
  const fresh = { USD: [], MERCADO: [] }
  const stale = fillNewsFromPrevious(fresh, { generatedAt: 123, news: { MERCADO: [{ title: 'antigo', link: 'x', t: 1 }] }, stale: {} })
  assert.equal(fresh.MERCADO[0].title, 'antigo'); assert.equal(stale.MERCADO, 123)
})
