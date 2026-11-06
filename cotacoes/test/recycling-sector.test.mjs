import test from 'node:test'
import assert from 'node:assert/strict'
import { BANKING_TOPICS, resolveBankingTopic } from '../src/bankingSectors.js'
import { SECTOR_PROFILES } from '../src/sectorProfiles.js'
import { SETORES } from '../src/insumos.js'
import { rememberSector, rememberedSector, sectorSection } from '../src/setoresNavigation.js'
import { makeSearchDoc, plainContent, searchDocuments } from '../src/globalSearch.js'
import { SECTOR_NEWS_SOURCES, SECTOR_NEWS_WINDOW_MS, normalizeSectorNews, isSectorNewsRelevant } from '../src/sectorNews.js'
import { makeSectorNewsFile } from '../scripts/sector-news-lib.mjs'
const now = Date.parse('2026-11-05T13:00:00Z')

test('reciclagem é tema único da hierarquia, com rota, memória e termos de busca próprios', () => {
  const topics = BANKING_TOPICS.filter(t => t.id === 'reciclagem')
  assert.equal(topics.length, 1)
  assert.equal(topics[0].label, 'Reciclagem')
  assert.equal(topics[0].grupo, 'Energia e saneamento')
  assert.equal(resolveBankingTopic('reciclagem?ref=teste'), 'reciclagem')
  assert.equal(sectorSection('reciclagem'), 'setores')
  assert.equal(rememberedSector(rememberSector({}, 'reciclagem'), 'setores'), 'reciclagem')
  assert.equal(SETORES.some(t => t.id === 'reciclagem'), false)
  const doc = makeSearchDoc({ id: 'sector:reciclagem', title: topics[0].label, body: plainContent(topics[0]), route: 'setores/reciclagem' })
  for (const query of ['reciclagem', 'PET', 'papelão', 'triagem', 'vidro', 'sucata', 'aparas', 'PEBD', 'PELBD', 'cobre', 'alumínio']) assert.equal(searchDocuments([doc], query)[0]?.route, 'setores/reciclagem', query)
})
test('reciclagem distingue materiais e elos e oferece insumos com aplicabilidade e métricas, sem preço inventado', () => {
  const p = SECTOR_PROFILES.reciclagem
  assert.equal(p.questions.length, 5)
  assert.equal(p.forces.length, 5)
  assert.equal(p.sensitivePoints.length, 5)
  assert.equal(p.materialCuts.length, 5)
  assert.equal(p.criticalInputs.length, 9)
  assert.equal(new Set(p.materialCuts.map(m => m.id)).size, p.materialCuts.length)
  assert.equal(new Set(p.criticalInputs.map(i => i.id)).size, p.criticalInputs.length)
  for (const m of p.materialCuts) for (const key of ['label', 'scope', 'validation']) assert.ok(m[key]?.length >= (key === 'label' ? 3 : 20), `${m.id}/${key}`)
  for (const i of p.criticalInputs) {
    for (const key of ['label', 'applicability', 'metric', 'limit']) assert.ok(i[key]?.length >= 8, `${i.id}/${key}`)
    assert.equal(i.price, undefined)
    assert.equal(i.value, undefined)
  }
  assert.match(p.scope + p.scopeNote, /triagem/i)
  assert.match(p.scopeNote, /perigos|eletr[oô]nic/i)
  assert.ok(p.sources.some(s => new URL(s.url).hostname === 'sinir.gov.br'))
  assert.ok(p.sources.some(s => new URL(s.url).hostname === 'www.gov.br' && s.url.includes('/ibama/')))
})
test('notícia de reciclagem usa fonte habilitada e 120h, sem converter reciclagem profissional em material', () => {
  const ipen = SECTOR_NEWS_SOURCES.find(s => s.id === 'ipen')
  assert.ok(ipen.topics.includes('reciclagem'))
  const mma = SECTOR_NEWS_SOURCES.find(s => s.id === 'mma-reciclagem')
  assert.equal(mma.enabled, false)
  assert.equal(SECTOR_NEWS_WINDOW_MS, 120 * 60 * 60 * 1000)
  for (const title of ['Curso de reciclagem de motoristas para CNH', 'Reciclagem profissional para vigilantes', 'Reciclagem para condutores']) assert.equal(isSectorNewsRelevant('reciclagem', title), false, title)
  assert.equal(isSectorNewsRelevant('reciclagem', 'Curso de reciclagem de plásticos por resina'), true)
  const item = { title: 'Estudo técnico aborda reciclagem de plásticos', link: ipen.articlePrefix + 'fixture-reciclagem', sourceId: 'ipen', publishedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(), collectedAt: new Date(now - 1000).toISOString(), type: 'comunicado', licenseUrl: ipen.licenseUrl }
  const states = { ipen: { status: 'ok', checkedAt: item.collectedAt, lastSuccessAt: item.collectedAt } }
  const feed = makeSectorNewsFile({ items: [item], sourceStates: states, now })
  assert.equal(feed.topics.reciclagem.items.length, 1)
  assert.equal(feed.topics.reciclagem.status, 'partial')
  const expired = normalizeSectorNews(feed, now + SECTOR_NEWS_WINDOW_MS)
  assert.equal(expired.topics.reciclagem.items.length, 0)
  assert.equal(expired.sourceStates.ipen.lastSuccessAt, item.collectedAt)
})
