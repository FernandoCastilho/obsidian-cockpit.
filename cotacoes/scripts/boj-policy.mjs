import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ORIGIN = 'https://www.boj.or.jp'
const FIRST_DECISION = '2024-03-19'
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const textOf = (html) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;|\u00a0/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const englishDate = (value) => {
  const m = value.match(/^([A-Za-z]+) (\d{1,2}), (\d{4})$/)
  if (!m) throw new Error('Data BOJ não reconhecida')
  const month = MONTHS.indexOf(m[1]), day = Number(m[2]), year = Number(m[3])
  const date = new Date(Date.UTC(year, month, day))
  if (month < 0 || date.getUTCMonth() !== month || date.getUTCDate() !== day) throw new Error('Data BOJ inválida')
  return date.toISOString().slice(0, 10)
}

// Only official decision links from the annual statement index, not references,
// speeches, minutes, call-market observations, or proposed/dissenting rates.
export function bojDecisionLinks(html, indexUrl) {
  const out = new Map()
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const title = textOf(m[2])
    if (!/^(?:Statement on Monetary Policy|Change in the Guideline for Money Market Operations|Changes in the Monetary Policy Framework)(?:\s|$)/.test(title)) continue
    const url = new URL(m[1], indexUrl)
    const date = url.pathname.match(/\/k(\d{2})(\d{2})(\d{2})[a-z]\.(?:htm|pdf)$/)
    if (url.origin !== ORIGIN || !url.pathname.startsWith('/en/mopo/mpmdeci/') || !date) continue
    const decisionDate = `20${date[1]}-${date[2]}-${date[3]}`
    if (decisionDate >= FIRST_DECISION) out.set(url.href, { url: url.href, decisionDate })
  }
  return [...out.values()].sort((a, b) => a.decisionDate.localeCompare(b.decisionDate))
}

export function parseBojDecision(input, { decisionDate, sourceUrl }) {
  // pypdf preserves a kerning gap in the official June2026 PDF as "o vernight".
  // Normalize this known word only; never merge arbitrary numeric/date tokens.
  const text = textOf(input).replace(/\bo\s+vernight\b/gi, 'overnight')
  // The adopted guideline is the FIRST such sentence. Later text can contain
  // rejected proposals by dissenting members (e.g. July 2026).
  const rate = text.match(/The Bank will encourage the uncollateralized overnight call rate to (?:remain|move) at around\s+(-?\d+(?:\.\d+)?)(?:\s+(?:to|[-–])\s+(-?\d+(?:\.\d+)?))?\s+percent\b/i)
  if (!rate) throw new Error(`BOJ: guideline aprovada não reconhecida (${decisionDate})`)
  const lower = Number(rate[1]), upper = rate[2] == null ? lower : Number(rate[2])
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower > upper || lower < -5 || upper > 30) throw new Error('BOJ: alvo inválido')
  const target = rate[2] == null ? { value: lower, approximate: true } : { lower, upper, approximate: true }
  const effective = text.match(/new guideline for (?:money )?market operations(?: and the new interest rate on the current account balances)? will be effective from ([A-Za-z]+ \d{1,2}, \d{4})/i)
  const effectiveDate = effective ? englishDate(effective[1]) : null
  if (effectiveDate && effectiveDate < decisionDate) throw new Error('BOJ: vigência anterior à decisão')
  return {
    decisionDate,
    target,
    ...(effectiveDate ? { point: { date: effectiveDate, ...target, sourceUrl } } : {}),
  }
}

const sameTarget = (a, b) => a && b && (a.value ?? a.lower) === (b.value ?? b.lower) && (a.value ?? a.upper) === (b.value ?? b.upper)

export function bojHistory(documents, asOf) {
  const entries = Object.entries(documents).sort(([, a], [, b]) => a.decisionDate.localeCompare(b.decisionDate))
  const points = []
  let last
  for (const [url, doc] of entries) {
    if (!doc.target || !doc.decisionDate) throw new Error(`BOJ: cache de decisão inválido (${url})`)
    if (doc.point) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.point.date) || doc.point.date < doc.decisionDate || !sameTarget(doc.point, doc.target)) throw new Error(`BOJ: ponto em cache inválido (${url})`)
      if (!last || !sameTarget(last, doc.target)) {
        points.push(doc.point)
        last = doc.target
      }
    } else if (!sameTarget(last, doc.target)) {
      // A hold has no new effective-date footnote; preserve the original date.
      // A different target without an explicit date is NOT inferred from the
      // meeting date, calendar, realized call rate or deposit-facility date.
      throw new Error(`BOJ: mudança sem vigência explícita (${doc.decisionDate})`)
    }
  }
  return points.filter((p) => p.date <= asOf)
}

async function download(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (official-policy-rates)', accept: 'text/html,application/pdf' },
    signal: AbortSignal.timeout(25000),
  })
  if (!response.ok) throw new Error(`BOJ: HTTP ${response.status}`)
  return response
}

function pdfText(bytes) {
  const process = spawnSync(globalThis.process.env.PYTHON || (globalThis.process.platform === 'win32' ? 'python' : 'python3'), [fileURLToPath(new URL('./pdf-text.py', import.meta.url))], {
    input: Buffer.from(bytes), encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, timeout: 25000,
  })
  if (process.error || process.status !== 0 || !process.stdout.trim()) throw new Error('BOJ: extração PDF indisponível; requer Python e pypdf')
  return process.stdout
}

export async function collectBoj(previousSeries, now = Date.now()) {
  const year = new Date(now).getUTCFullYear(), asOf = new Date(now).toISOString().slice(0, 10)
  const indexUrl = (y) => `${ORIGIN}/en/mopo/mpmdeci/state_${y}/index.htm`
  const indexes = await Promise.all(Array.from({ length: year - 2023 }, async (_, i) => {
    const url = indexUrl(2024 + i)
    return bojDecisionLinks(await (await download(url)).text(), url)
  }))
  const links = [...new Map(indexes.flat().filter((r) => r.decisionDate <= asOf).map((r) => [r.url, r])).values()]
  if (!links.length) throw new Error('BOJ: índice oficial sem decisões reconhecidas')
  const documents = { ...(previousSeries?.documents || {}) }
  // Published decisions are cached by URL; routine collection downloads only
  // annual indexes and new documents, avoiding repeated archival PDF requests.
  const missing = links.filter(({ url }) => !documents[url])
  for (let i = 0; i < missing.length; i += 2) {
    await Promise.all(missing.slice(i, i + 2).map(async ({ url, decisionDate }) => {
      const response = await download(url)
      const text = url.endsWith('.pdf') ? pdfText(await response.arrayBuffer()) : await response.text()
      documents[url] = parseBojDecision(text, { decisionDate, sourceUrl: url })
    }))
  }
  const points = bojHistory(documents, asOf)
  if (!points.length) throw new Error('BOJ: histórico sem vigência comprovada')
  return { id: 'BOJ', points, documents, checkedAt: now, sourceUrl: indexUrl(year), coverageStart: '2024-03-21' }
}
