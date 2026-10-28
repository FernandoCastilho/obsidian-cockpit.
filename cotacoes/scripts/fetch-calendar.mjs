import { readFile, writeFile } from 'node:fs/promises'
import { loadPrevious } from './prev-lib.mjs'
import { SOURCES, buildCalendar, parseBea, parseBls, parseFf, parseFomc } from './calendar-lib.mjs'
const output = new URL('../public/calendar.json', import.meta.url)
let local
try { local = JSON.parse(await readFile(output, 'utf8')) } catch { /* sem arquivo local */ }
const remote = await loadPrevious('calendar.json')
const previous = [local, remote].filter((f) => f?.schemaVersion === 1 && Array.isArray(f.events)).sort((a, b) => b.generatedAt - a.generatedAt)[0] ?? null
const get = async (url) => {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-coleta)' }, signal: AbortSignal.timeout(30000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res
}
const run = async (parse, key, asJson = false) => {
  try { const res = await get(SOURCES[key].url); return { events: parse(asJson ? await res.json() : await res.text()) } } catch (error) { return { error: `${SOURCES[key].name}: ${error.message}` } }
}
const results = { ff: await run(parseFf, 'ff', true), bls: await run(parseBls, 'bls'), bea: await run(parseBea, 'bea'), fomc: await run(parseFomc, 'fomc') }
const file = buildCalendar(results, previous)
await writeFile(output, JSON.stringify(file) + '\n')
console.log(`Calendário: ${file.events.length} eventos; ` + Object.entries(file.sources).map(([k, s]) => `${k}=${s.ok ? s.n : 'falhou (' + s.error + ')'}`).join(' '))
