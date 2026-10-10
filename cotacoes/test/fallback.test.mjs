// Testes do reaproveitamento do último dado válido e da reserva do histórico do câmbio.
import test from 'node:test'
import assert from 'node:assert/strict'
import { fillFromPrevious, fillNewsFromPrevious, loadPrevious } from '../scripts/prev-lib.mjs'
import { parseEcbSeries } from '../src/useHistory.js'

test('último dado válido: completa só o que veio vazio e registra a origem', () => {
  const prev = { generatedAt: 100, cdi: [[1, 14]], selic: [[1, 15]], focus: { date: 'x' }, ptax: { USD: { sell: 5 }, EUR: { sell: 6 } } }
  const out = { cdi: [[2, 14.1]], selic: [], focus: null, ptax: { USD: { sell: 5.1 } } }
  fillFromPrevious(out, prev, ['cdi', 'selic', 'focus', 'ptax'])
  assert.deepEqual(out.cdi, [[2, 14.1]]) // dado novo vence
  assert.deepEqual(out.selic, [[1, 15]])
  assert.deepEqual(out.focus, { date: 'x' })
  assert.deepEqual(out.ptax, { USD: { sell: 5.1 }, EUR: { sell: 6 } })
  assert.deepEqual(out.stale, { selic: 100, focus: 100, ptax: 100 })
})

test('último dado válido: mantém a data da coleta original ao reaproveitar de novo', () => {
  const prev = { generatedAt: 500, stale: { selic: 100 }, selic: [[1, 15]] }
  const out = { selic: [] }
  fillFromPrevious(out, prev, ['selic'])
  assert.equal(out.stale.selic, 100)
})

test('último dado válido: sem arquivo anterior nada muda', () => {
  const out = { cdi: [] }
  fillFromPrevious(out, null, ['cdi'])
  assert.deepEqual(out, { cdi: [], stale: {} })
})

test('notícias: moeda sem manchetes novas mantém as anteriores', () => {
  const news = { USD: [], EUR: [{ title: 'novo' }] }
  const stale = fillNewsFromPrevious(news, { generatedAt: 7, news: { USD: [{ title: 'velho' }], EUR: [{ title: 'antigo' }] } })
  assert.equal(news.USD[0].title, 'velho')
  assert.equal(news.EUR[0].title, 'novo')
  assert.deepEqual(stale, { USD: 7 })
})

test('arquivo publicado: sem repositório ou com falha de rede devolve null', async () => {
  assert.equal(await loadPrevious('macro.json', ''), null)
  const real = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('rede') }
  assert.equal(await loadPrevious('macro.json', 'a/b'), null)
  globalThis.fetch = async () => ({ ok: true, text: async () => '' })
  assert.equal(await loadPrevious('macro.json', 'a/b'), null)
  globalThis.fetch = real
})

test('BCE: série diária vira pontos ordenados, ignorando valores inválidos', () => {
  const p = parseEcbSeries({ rates: { '2026-10-08': { BRL: 5.4 }, '2026-10-07': { BRL: 5.3 }, '2026-10-06': {} } })
  assert.deepEqual(p.map((x) => x.bid), [5.3, 5.4])
  assert.equal(p[0].high, 5.3)
  assert.deepEqual(parseEcbSeries(undefined), [])
})

test('alerta: só entra o que está reaproveitado há mais de 6 horas', async () => {
  const { staleReport } = await import('../scripts/stale-lib.mjs')
  const now = 100 * 36e5
  const r = staleReport({ macro: { stale: { cdi: now - 2 * 36e5, selic: now - 7 * 36e5, sofr: null } }, curves: { stale: { br: now - 30 * 36e5 } }, news: {} }, now, 6)
  assert.deepEqual(r.map((i) => i.label).sort(), ['DI x pré', 'SOFR', 'Selic'])
  assert.equal(r.find((i) => i.label === 'Selic').hours, 7)
  assert.equal(r.find((i) => i.label === 'SOFR').hours, null) // data desconhecida conta como antiga
  assert.deepEqual(staleReport(null), [])
})
