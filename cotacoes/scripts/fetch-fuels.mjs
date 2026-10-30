// Preços de combustíveis (ANP). Requer Node 20+ e Python 3 (somente biblioteca padrão). Sem chave de API.
import { readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { loadPrevious } from './prev-lib.mjs'
import { ANP_PAGE, FUELS, discoverWeeklyFiles, parseWeek, mergeWeeks, fuelItems, fuelFallback } from './fuels-lib.mjs'
const output = new URL('../public/fuels.json', import.meta.url), now = new Date()
const MAX_NEW_FILES = 60
const readJson = async url => { try { return JSON.parse(await readFile(url, 'utf8')) } catch { return null } }
const [local, remote] = [await readJson(output), await loadPrevious('fuels.json')]
const previousItems = [local, remote].flatMap(f => Array.isArray(f?.commodities) ? f.commodities : [])
const history = {}
for (const f of FUELS) {
  // Histórico mais completo entre a cópia local e a publicada.
  const lists = previousItems.filter(c => c?.id === f.id && Array.isArray(c.history)).map(c => c.history)
  history[f.id] = lists.sort((a, b) => b.length - a.length)[0] ?? []
}
async function get(url, tries = 3) {
  let last
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-coleta)' }, signal: AbortSignal.timeout(45000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res
    } catch (e) { last = e; await new Promise(r => setTimeout(r, 2000 * i)) }
  }
  throw last
}
function readWeek(buffer) {
  if (buffer.length > 30_000_000) throw new Error('ANP: arquivo excessivamente grande')
  const out = spawnSync('python3', [fileURLToPath(new URL('./read-pink-sheet.py', import.meta.url)), 'BRASIL'], { input: buffer, encoding: 'utf8', maxBuffer: 20_000_000, timeout: 60000 })
  if (out.error || out.status !== 0) throw new Error(`ANP: falha ao ler XLSX (${out.error?.message ?? out.stderr.trim()})`)
  return parseWeek(JSON.parse(out.stdout))
}
let items
try {
  const files = discoverWeeklyFiles(await (await get(ANP_PAGE)).text())
  if (!files.length) throw new Error('ANP: nenhum resumo semanal encontrado na página oficial')
  const known = new Set(Object.values(history).flat().map(p => p.period))
  const todo = files.filter(f => !known.has(f.end)).slice(0, MAX_NEW_FILES)
  const weeks = []
  for (const f of todo) {
    try { weeks.push(readWeek(Buffer.from(await (await get(f.url)).arrayBuffer()))) }
    catch (error) { console.warn(`${f.end}: ${error.message}`); if (f === files[0]) throw error }
  }
  items = fuelItems(mergeWeeks(history, weeks), now)
} catch (error) {
  console.warn(`Combustíveis: ${error.message}`)
  items = fuelFallback(previousItems, error, now)
}
await writeFile(output, `${JSON.stringify({ schemaVersion: 1, generatedAt: now.toISOString(), commodities: items })}\n`)
for (const c of items) console.log(`${c.label}: ${c.value ?? 'indisponível'} ${c.unit}; ${c.period ?? 'sem referência'}; semanas=${c.history?.length ?? 0}; stale=${c.stale}`)
