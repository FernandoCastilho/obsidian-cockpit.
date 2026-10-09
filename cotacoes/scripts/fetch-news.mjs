// Coleta manchetes por moeda e grava public/news.json. Rodado pelo GitHub Actions a cada hora.
import { mkdir, writeFile } from 'node:fs/promises'
import { balance, canonicalSource, googleUrl, parseRss, parseTranslation, pick, translateUrl } from './news-lib.mjs'

const SITES = {
  valor: 'site:valor.globo.com',
  investing: '(site:br.investing.com OR site:investing.com)',
}

// termos por moeda: [português, inglês]
const TOPICS = {
  USD: ['dólar câmbio', 'US dollar Fed forex'],
  EUR: ['euro câmbio BCE', 'euro ECB EUR/USD'],
  JPY: ['iene Banco do Japão', 'yen Bank of Japan USD/JPY'],
  CNH: ['yuan China câmbio PBOC', 'yuan PBOC offshore CNH'],
}

// grupo → [consultas], limite de manchetes por grupo
const groups = (pt, en) => [
  { id: 'google', limit: 5, requests: [[pt, 'pt'], [en, 'en']] },
  { id: 'valor', limit: 4, requests: [[`${pt} ${SITES.valor}`, 'pt']] },
  { id: 'investing', limit: 4, requests: [[`${pt} ${SITES.investing}`, 'pt'], [`${en} ${SITES.investing}`, 'en']] },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function get(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-news)' }, signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

const errors = []
const news = {}

// Traduz títulos que não estejam em português; mantém o original se a tradução falhar.
const cache = new Map()
async function toPortuguese(title) {
  if (cache.has(title)) return cache.get(title)
  let out = { title }
  try {
    const { text, lang } = parseTranslation(JSON.parse(await get(translateUrl(title))))
    if (text && !lang.startsWith('pt')) out = { title: text, original: title }
  } catch (e) {
    errors.push(`traducao: ${e.message}`)
  }
  cache.set(title, out)
  await sleep(150)
  return out
}

for (const [code, [pt, en]] of Object.entries(TOPICS)) {
  const all = []
  for (const g of groups(pt, en)) {
    const items = []
    for (const [q, lang] of g.requests) {
      try {
        items.push(...parseRss(await get(googleUrl(q, lang))))
      } catch (e) {
        errors.push(`${code}/${g.id}/${lang}: ${e.message}`)
      }
      await sleep(400)
    }
    for (const it of pick(items, g.limit)) all.push({ title: it.title, link: it.link, source: canonicalSource(it), t: it.t, via: g.id })
  }
  news[code] = []
  for (const it of balance(all, 5)) {
    const tr = await toPortuguese(it.title)
    news[code].push({ title: tr.title, original: tr.original, link: it.link, source: it.source, t: it.t })
  }
  console.log(code, news[code].length, 'manchetes')
}

const total = Object.values(news).reduce((n, a) => n + a.length, 0)
if (errors.length) console.warn('Falhas:', errors.join(' | '))
if (!total && process.env.NEWS_STRICT === 'true') {
  console.error('Nenhuma manchete coletada; abortando para manter as notícias anteriores no ar.')
  process.exit(1)
}

await mkdir(new URL('../public/', import.meta.url), { recursive: true })
await writeFile(new URL('../public/news.json', import.meta.url), JSON.stringify({ generatedAt: Date.now(), news, errors }))
console.log('news.json gravado:', total, 'manchetes;', [...cache.values()].filter((v) => v.original).length, 'traduzidas')
