import { decode } from './news-lib.mjs'
import { groupsForTrend } from '../src/trends.js'
export const TRENDS_RSS = 'https://trends.google.com/trending/rss?geo=BR'
const tag = (xml, name) => decode(xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'))?.[1] ?? '')
export function parseTrends(xml) {
  if (!/<rss\b/i.test(xml) || !/<channel\b/i.test(xml)) throw new Error('Resposta RSS inválida')
  const items = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(([, item]) => {
    const title = tag(item, 'title'), publishedAt = Date.parse(tag(item, 'pubDate'))
    return { title, publishedAt, traffic: tag(item, 'ht:approx_traffic'), groups: groupsForTrend(title) }
  }).filter(i => i.title && Number.isFinite(i.publishedAt))
  if (!items.length) throw new Error('RSS sem tendências válidas')
  return items
}
export async function collectTrends({ previous = null, fetchImpl = fetch, now = Date.now() } = {}) {
  try {
    const response = await fetchImpl(TRENDS_RSS, { signal: AbortSignal.timeout(20000) })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const items = parseTrends(await response.text())
    return { generatedAt: now, checkedAt: now, source: TRENDS_RSS, region: 'BR', stale: false, items }
  } catch (error) {
    return { ...previous, generatedAt: previous?.generatedAt ?? null, checkedAt: now, source: TRENDS_RSS, region: 'BR', stale: true, error: error.message, items: previous?.items ?? [] }
  }
}
