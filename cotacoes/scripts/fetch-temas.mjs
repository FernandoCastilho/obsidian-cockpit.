// Notícias por setor e por insumo (últimos 7 dias, por dia) e grava public/temas.json. Rodado a cada hora no deploy.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { loadPrevious } from './prev-lib.mjs'
import { canonicalSource, googleUrl, parseRss } from './news-lib.mjs'
import { TEMAS, WINDOW_DAYS, mergeTema, temasFile } from './temas-lib.mjs'

const output = new URL('../public/temas.json', import.meta.url)
const now = Date.now()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let local = null
try { local = JSON.parse(await readFile(output, 'utf8')) } catch { /* sem arquivo local */ }
const remote = await loadPrevious('temas.json')
const prevOf = (id) => [local, remote].map((f) => f?.temas?.[id]?.items).filter(Array.isArray).sort((a, b) => b.length - a.length)[0] ?? []

const errors = [], porTema = {}
let answered = 0, asked = 0
for (const tema of TEMAS) {
  const fresh = []
  for (const q of tema.queries) {
    asked++
    try {
      const res = await fetch(googleUrl(q, 'pt', `${WINDOW_DAYS}d`), { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-news)' }, signal: AbortSignal.timeout(20000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      for (const it of parseRss(await res.text())) fresh.push({ title: it.title, link: it.link, source: canonicalSource(it), t: it.t })
      answered++
    } catch (e) { errors.push(`${tema.id}: ${q}: ${e.message}`) }
    await sleep(500)
  }
  porTema[tema.id] = mergeTema(tema, fresh, prevOf(tema.id), now)
  console.log(`${tema.label}: ${porTema[tema.id].length} matérias (${fresh.length} lidas, ${prevOf(tema.id).length} no histórico)`)
}
const stale = answered === 0
if (errors.length) console.warn('Falhas:', errors.join(' | '))
await mkdir(new URL('../public/', import.meta.url), { recursive: true })
await writeFile(output, `${JSON.stringify(temasFile(porTema, now, { stale, errors: errors.slice(0, 8) }))}\n`)
console.log(`temas.json gravado: ${asked - errors.length} de ${asked} buscas responderam; stale=${stale}`)
