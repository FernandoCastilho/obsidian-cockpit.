import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { loadPrevious } from './prev-lib.mjs'
import { OIL_SOURCE_URL, parseOilHtml, buildOilData, oilFallback, isValidOilData } from './oil-lib.mjs'

const output = new URL('../public/oil.json', import.meta.url)
let data
try {
  const response = await fetch(OIL_SOURCE_URL, { signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`EIA: HTTP ${response.status}`)
  data = buildOilData(parseOilHtml(await response.text()))
} catch (error) {
  let local = null
  try { local = JSON.parse(await readFile(output, 'utf8')) } catch {}
  const remote = await loadPrevious('oil.json')
  const previous = [local, remote].filter(isValidOilData).sort((a, b) => b.observationDate.localeCompare(a.observationDate) || b.generatedAt.localeCompare(a.generatedAt))[0]
  data = oilFallback(previous, error)
  console.warn(`Brent: ${data.error}; ${previous ? 'mantido último dado válido' : 'sem dado válido anterior'}`)
}
await mkdir(new URL('../public/', import.meta.url), { recursive: true })
await writeFile(output, `${JSON.stringify(data, null, 2)}\n`)
console.log(`Brent spot: ${data.value ?? 'indisponível'} USD/barril; referência ${data.observationDate ?? 'indisponível'}; stale=${data.stale}`)
