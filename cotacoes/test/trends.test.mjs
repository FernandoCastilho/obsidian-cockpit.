import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { collectTrends, parseTrends } from '../scripts/trends-lib.mjs'
import { groupsForTrend, exploreUrl } from '../src/trends.js'
import { TREND_SNAPSHOT, SNAPSHOT_START } from '../src/trendsSnapshot.js'
const rss = '<rss><channel><item><title><![CDATA[Dólar &amp; Selic]]></title><pubDate>Tue, 03 Nov 2026 12:00:00 GMT</pubDate><ht:approx_traffic>20K+</ht:approx_traffic></item></channel></rss>'
test('RSS Trends preserva origem temporal, volume e classificação comercial', () => {
  const [item] = parseTrends(rss)
  assert.equal(item.title, 'Dólar & Selic')
  assert.equal(item.traffic, '20K+')
  assert.deepEqual(item.groups, ['juros'])
  assert.equal(item.publishedAt, Date.parse('2026-11-03T12:00:00Z'))
  assert.deepEqual(groupsForTrend('futebol ao vivo'), [])
  assert.deepEqual(groupsForTrend('Reforma tributária CBS e IBS'), ['reforma'])
})
test('falha HTTP ou HTML/reCAPTCHA mantém último snapshot e data original', async () => {
  const previous = { generatedAt: 100, items: [{ title: 'BNDES', groups: ['investimento'] }] }
  for (const response of [{ ok: false, status: 429 }, { ok: true, text: async () => '<html>reCAPTCHA</html>' }]) {
    const result = await collectTrends({ previous, now: 300, fetchImpl: async () => response })
    assert.equal(result.generatedAt, 100)
    assert.equal(result.checkedAt, 300)
    assert.equal(result.stale, true)
    assert.deepEqual(result.items, previous.items)
  }
})
test('primeira falha não fabrica data nem itens; sucesso avança data', async () => {
  const failure = await collectTrends({ now: 300, fetchImpl: async () => { throw Error('offline') } })
  assert.equal(failure.generatedAt, null)
  assert.deepEqual(failure.items, [])
  const result = await collectTrends({ now: 400, fetchImpl: async () => ({ ok: true, text: async () => rss }) })
  assert.equal(result.generatedAt, 400)
  assert.equal(result.stale, false)
})
test('Explore usa recorte brasileiro explícito; snapshots excluem 03/11 parcial', () => {
  const url = new URL(exploreUrl(['capital de giro', 'BNDES'], 'today 12-m'))
  assert.equal(url.searchParams.get('geo'), 'BR')
  assert.equal(url.searchParams.get('date'), 'today 12-m')
  assert.equal(url.searchParams.get('q'), 'capital de giro,BNDES')
  for (const series of Object.values(TREND_SNAPSHOT)) {
    assert.equal(series.values.length, 92)
    assert.ok(series.values.every(v => Number.isInteger(v) && v >= 0 && v <= 100))
    assert.equal(new Date(Date.parse(SNAPSHOT_START) + (series.values.length-1)*86400000).toISOString().slice(0,10), '2026-11-02')
  }
})
test('agenda de Trends usa 11h e 18h UTC e preserva outras bases', async () => {
  const workflow = await readFile(new URL('../../.github/workflows/pages.yml', import.meta.url), 'utf8')
  assert.match(workflow, /cron: '0 11,18 \* \* \*'/)
  assert.match(workflow, /preserve-for-trends\.mjs/)
  const lines = workflow.split('\n')
  const verify = lines.findIndex(l => l.includes('run: node scripts/weekly-data.mjs'))
  assert.ok(lines[verify-1].includes("github.event.schedule == '0 11,18 * * *'"))
})
