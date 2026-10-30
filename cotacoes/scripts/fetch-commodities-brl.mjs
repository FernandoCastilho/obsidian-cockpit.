// IC-Br (SGS 27574–27577) e soja em R$/saca. Requer Node 20+. Sem chave de API.
import { readFile, writeFile } from 'node:fs/promises'
import { loadPrevious } from './prev-lib.mjs'
import { windows } from './macro-lib.mjs'
import { ICBR, SOJA_SACA, FX_CODE, SGS_API, icbrItem, monthlyFx, sojaSacaItem, itemFallback } from './commodities-brl-lib.mjs'
const output = new URL('../public/commodities-brl.json', import.meta.url), now = new Date()
const sleep = ms => new Promise(r => setTimeout(r, ms))
const readJson = async url => { try { return JSON.parse(await readFile(url, 'utf8')) } catch { return null } }
const [local, remote] = [await readJson(output), await loadPrevious('commodities-brl.json')]
const previous = [local, remote].flatMap(f => Array.isArray(f?.commodities) ? f.commodities : [])
// O SGS responde 502/lento com frequência: várias tentativas.
async function getJson(url, tries = 5) {
  let last
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-coleta)', accept: 'application/json' }, signal: AbortSignal.timeout(30000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (e) { last = e; await sleep(2500 * i) }
  }
  throw last
}
async function series(code, from) {
  let rows = []
  for (const [a, b] of windows(from)) rows = rows.concat(await getJson(SGS_API(code, a, b)))
  return rows
}
// Os quatro IC-Br são independentes: uma série que falha preserva a anterior.
const items = await Promise.all(ICBR.map(async def => {
  try { return icbrItem(def, await series(def.code, 2005), now) }
  catch (error) { console.warn(`${def.id}: ${error.message}`); return itemFallback(def.id, previous, error) }
}))
try {
  const commodities = await readJson(new URL('../public/commodities.json', import.meta.url))
  const soy = commodities?.commodities?.find(c => c.id === 'soybeans')
  if (!soy?.history?.length) throw new Error('Soja em dólar (Pink Sheet) indisponível')
  items.push(sojaSacaItem(soy.history, monthlyFx(await series(FX_CODE, 2006)), now))
} catch (error) { console.warn(`${SOJA_SACA.id}: ${error.message}`); items.push(itemFallback(SOJA_SACA.id, previous, error)) }
await writeFile(output, `${JSON.stringify({ schemaVersion: 1, generatedAt: now.toISOString(), commodities: items })}\n`)
for (const c of items) console.log(`${c.label}: ${c.value ?? 'indisponível'} ${c.unit}; ${c.period ?? 'sem referência'}; stale=${c.stale}`)
