// Coleta o que foi publicado sobre a reforma tributária nos últimos 7 dias e grava public/reforma-tributaria.json. Rodado a cada hora no deploy.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { loadPrevious } from './prev-lib.mjs'
import { canonicalSource, googleUrl, parseRss } from './news-lib.mjs'
import { QUERIES, WINDOW_DAYS, mergeItems, reformaFile } from './reforma-lib.mjs'

const output = new URL('../public/reforma-tributaria.json', import.meta.url)
const now = Date.now()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let local = null
try { local = JSON.parse(await readFile(output, 'utf8')) } catch { /* sem arquivo local */ }
const remote = await loadPrevious('reforma-tributaria.json')
// Histórico acumulado: o mais completo entre a cópia local e a publicada.
const previous = [local, remote].flatMap((f) => (Array.isArray(f?.items) ? [f.items] : [])).sort((a, b) => b.length - a.length)[0] ?? []

const errors = []
const fresh = []
for (const q of QUERIES) {
  try {
    const res = await fetch(googleUrl(q, 'pt', `${WINDOW_DAYS}d`), { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-news)' }, signal: AbortSignal.timeout(20000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    for (const it of parseRss(await res.text())) fresh.push({ title: it.title, link: it.link, source: canonicalSource(it), t: it.t })
  } catch (e) { errors.push(`${q}: ${e.message}`) }
  await sleep(500)
}
const items = mergeItems(fresh, previous, now)
const failed = errors.length === QUERIES.length
if (failed && !previous.length) console.warn('Reforma tributária: nenhuma busca respondeu e não há histórico para preservar.')
if (errors.length) console.warn('Falhas:', errors.join(' | '))
const file = reformaFile(items, now, failed ? { stale: true, error: errors[0] } : {})
await mkdir(new URL('../public/', import.meta.url), { recursive: true })
await writeFile(output, `${JSON.stringify(file)}\n`)
console.log(`Reforma tributária: ${items.length} matérias na janela de ${WINDOW_DAYS} dias (${fresh.length} lidas agora, ${previous.length} no histórico); stale=${file.stale}`)
