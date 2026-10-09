// Utilitários da coleta de notícias (sem dependências).

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

export function decode(s = '') {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .trim()
}

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'))
  return m ? decode(m[1]) : ''
}

export function parseRss(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => {
    const src = item.match(/<source(?:\s+url="([^"]*)")?[^>]*>([\s\S]*?)<\/source>/i)
    const sourceName = src ? decode(src[2]) : ''
    let title = tag(item, 'title')
    if (sourceName && title.endsWith(` - ${sourceName}`)) title = title.slice(0, -(sourceName.length + 3))
    const t = Date.parse(tag(item, 'pubDate'))
    return { title, link: tag(item, 'link'), source: sourceName, sourceUrl: src?.[1] ?? '', t: Number.isNaN(t) ? 0 : t }
  })
}

export const canonicalSource = (item) => {
  const u = `${item.sourceUrl} ${item.source}`.toLowerCase()
  if (u.includes('valor.globo') || u.includes('valor econômico') || u.includes('valor econ')) return 'Valor Econômico'
  if (u.includes('investing.com')) return 'Investing.com'
  return item.source || 'Google Notícias'
}

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, ' ').trim()

export function pick(items, limit) {
  const seen = new Set()
  const out = []
  for (const it of [...items].sort((a, b) => b.t - a.t)) {
    const k = norm(it.title)
    if (!it.title || !/^https?:\/\//.test(it.link) || seen.has(k)) continue
    seen.add(k)
    out.push(it)
    if (out.length >= limit) break
  }
  return out
}

export const googleUrl = (q, lang) => {
  const p = lang === 'en' ? 'hl=en-US&gl=US&ceid=US:en' : 'hl=pt-BR&gl=BR&ceid=BR:pt-419'
  return `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:7d`)}&${p}`
}
