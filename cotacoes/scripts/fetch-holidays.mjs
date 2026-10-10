// Coleta os feriados oficiais da China (ano anterior, atual e próximo) e grava public/feriados.json. Rodado a cada hora no deploy.
// Os demais calendários (Brasil, Nova York, euro, Londres, Japão) são calculados por regra no próprio app.
import { mkdir, writeFile } from 'node:fs/promises'
import { loadPrevious } from './prev-lib.mjs'
import { cnUrl, parseHolidayCn } from './holidays-lib.mjs'

const now = new Date()
const prev = await loadPrevious('feriados.json')
const years = {}
const stale = {}
const missing = []
for (const y of [now.getUTCFullYear() - 1, now.getUTCFullYear(), now.getUTCFullYear() + 1]) {
  let got = null
  for (let i = 0; i < 3 && !got; i++) {
    try {
      const res = await fetch(cnUrl(y), { signal: AbortSignal.timeout(20000) })
      if (res.status === 404) break
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      got = parseHolidayCn(await res.json())
      break
    } catch (e) {
      console.warn(`China ${y}: ${e.message}`)
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)))
    }
  }
  if (got) years[y] = got
  else if (prev?.years?.[y]) {
    years[y] = prev.years[y]
    stale[y] = prev.stale?.[y] ?? prev.generatedAt ?? null
  } else missing.push(y)
}
console.log('Feriados China:', Object.keys(years).join(', ') || 'nenhum', missing.length ? `· ainda não publicados: ${missing.join(', ')}` : '', Object.keys(stale).length ? `· reaproveitados: ${Object.keys(stale).join(', ')}` : '')
await mkdir(new URL('../public/', import.meta.url), { recursive: true })
await writeFile(new URL('../public/feriados.json', import.meta.url), JSON.stringify({ generatedAt: Date.now(), source: 'Conselho de Estado da China (via holiday-cn)', years, missing, stale }))
