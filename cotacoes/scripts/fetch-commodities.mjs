// Requires Node 20+ and Python 3 (standard library only). No API keys or paid services.
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { loadPrevious } from './prev-lib.mjs'
import { COMMODITIES, WTI_URL, PINK_PAGE_URL, discoverPinkSheetUrl, buildWti, parsePinkRows, commodityFallback } from './commodities-lib.mjs'

const output = new URL('../public/commodities.json', import.meta.url)
const now = new Date()
let local = null
try { local = JSON.parse(await readFile(output, 'utf8')) } catch { /* ignora */ }
let remotePromise
const previous = async id => {
  remotePromise ??= loadPrevious('commodities.json')
  const remote = await remotePromise
  return [local, remote].flatMap(data => Array.isArray(data?.commodities) ? data.commodities.filter(c => c.id === id) : [])
}
async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`Fonte: HTTP ${response.status}`)
  return response
}
async function collectWti() {
  try { return [buildWti(await (await get(WTI_URL)).text(), now)] }
  catch (error) { console.warn(`WTI: ${error.message}`); return [commodityFallback('wti', await previous('wti'), error)] }
}
async function collectMonthly() {
  try {
    // Resolve the current workbook from the official landing page, not a frozen monthly URL.
    const url = discoverPinkSheetUrl(await (await get(PINK_PAGE_URL)).text())
    const buffer = Buffer.from(await (await get(url)).arrayBuffer())
    if (buffer.length > 10_000_000) throw new Error('Banco Mundial: arquivo excessivamente grande')
    const parsed = spawnSync('python3', [fileURLToPath(new URL('./read-pink-sheet.py', import.meta.url))], { input: buffer, encoding: 'utf8', maxBuffer: 10_000_000, timeout: 30000 })
    if (parsed.error || parsed.status !== 0) throw new Error(`Banco Mundial: falha ao ler XLSX (${parsed.error?.message ?? parsed.stderr.trim()})`)
    return parsePinkRows(JSON.parse(parsed.stdout), url, now)
  } catch (error) {
    console.warn(`Médias mensais: ${error.message}`)
    return Promise.all(COMMODITIES.slice(1).map(async c => commodityFallback(c.id, await previous(c.id), error)))
  }
}
const commodities = (await Promise.all([collectWti(), collectMonthly()])).flat()
const data = { schemaVersion: 1, generatedAt: now.toISOString(), commodities }
await mkdir(new URL('../public/', import.meta.url), { recursive: true })
const temporary = new URL('../public/commodities.json.tmp', import.meta.url)
await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`)
await rename(temporary, output)
for (const c of commodities) console.log(`${c.label}: ${c.value ?? 'indisponível'} ${c.unit}; ${c.nature}; ${c.period ?? 'sem referência'}; stale=${c.stale}`)
