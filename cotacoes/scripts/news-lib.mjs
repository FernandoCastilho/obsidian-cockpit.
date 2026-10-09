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

// ---- Tradução para português (Brasil) ----

const EN = /\b(the|and|of|to|in|for|on|as|with|at|by|from|is|are|after|over|amid|rises|falls|says|ahead|rate|rates|bank|dollar|yen|euro|yuan)\b/gi
const PT = /\b(de|do|da|dos|das|em|para|com|que|os|as|um|uma|no|na|nos|nas|ao|pelo|pela|mais|após|diante|sobre|alta|queda)\b/gi
export const isEnglish = (t) => (t.match(EN) ?? []).length > (t.match(PT) ?? []).length

// Google Tradutor (endpoint público, sem chave), vários títulos por chamada, um por linha.
export const GTX = 'https://translate.googleapis.com/translate_a/single'
export const gtxBody = (titles) =>
  new URLSearchParams({ client: 'gtx', sl: 'auto', tl: 'pt', dt: 't', q: titles.join('\n') }).toString()

// Resposta: [[[traduzido, original, ...], ...], null, idioma]. Reagrupa os trechos em uma linha por título.
export function splitBatch(data, count) {
  const segs = Array.isArray(data?.[0]) ? data[0] : []
  const lines = ['']
  for (const seg of segs) {
    const tr = String(seg?.[0] ?? '')
    const src = String(seg?.[1] ?? '')
    lines[lines.length - 1] += tr.replace(/\n+$/, '')
    if (/\n$/.test(src) || /\n$/.test(tr)) lines.push('')
  }
  while (lines.length > count && lines[lines.length - 1] === '') lines.pop()
  return lines.length === count && lines.every((l) => l.trim()) ? lines.map((l) => l.trim()) : null
}

// Reservas, uma manchete por vez.
export const lingvaUrl = (t) => `https://lingva.ml/api/v1/en/pt/${encodeURIComponent(t)}`
export const myMemoryUrl = (t) => `https://api.mymemory.translated.net/get?q=${encodeURIComponent(t)}&langpair=en|pt-BR`
export const fromLingva = (d) => String(d?.translation ?? '').trim()
export const fromMyMemory = (d) => (d?.responseStatus === 200 ? String(d?.responseData?.translatedText ?? '').trim() : '')
