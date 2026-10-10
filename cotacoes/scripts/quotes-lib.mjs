// Coleta central de cotações: consulta a AwesomeAPI uma vez (todas as moedas) e grava, em `dir`:
//  - quotes.json: as cotações atuais, lidas por todos os usuários da página;
//  - intraday.json: pontos acumulados a cada coleta (5 dias), que formam o gráfico de intraday.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { mergeSnapshots } from './intraday-lib.mjs'

export const ALL = 'USD-BRL,EUR-BRL,JPY-BRL,CNY-BRL,USD-CNH'
const SNAP = { USD: 'USDBRL', EUR: 'EURBRL', JPY: 'JPYBRL', CNH: 'CNYBRL' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return null
  }
}

export async function collect({ dir, key, fetchFn = fetch, now = Date.now(), tries = 3 }) {
  const url = `https://economia.awesomeapi.com.br/json/last/${ALL}${key ? `?token=${encodeURIComponent(key)}` : ''}`
  let quotes = null
  let lastError = ''
  for (let i = 1; i <= tries && !quotes; i++) {
    try {
      const res = await fetchFn(url, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-coleta)' }, signal: AbortSignal.timeout(25000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const j = await res.json()
      if (!j?.USDBRL?.bid) throw new Error('resposta sem cotação')
      quotes = j
    } catch (e) {
      lastError = e.message
      if (i < tries) await sleep(2000 * i)
    }
  }
  if (!quotes) return { ok: false, error: lastError }

  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'quotes.json'), JSON.stringify({ generatedAt: now, source: 'AwesomeAPI', quotes }))

  // Pontos do intraday: só entram cotações novas (fora do pregão a fonte repete a última, e não duplicamos).
  const prev = await readJson(join(dir, 'intraday.json'))
  const snaps = {}
  for (const [code, pair] of Object.entries(SNAP)) {
    const q = quotes[pair]
    if (q) snaps[code] = [Number(q.timestamp) * 1000, Number(q.bid)]
  }
  const series = mergeSnapshots(prev?.series, snaps, 5 * 864e5, now)
  await writeFile(join(dir, 'intraday.json'), JSON.stringify({ generatedAt: now, source: 'AwesomeAPI (coleta central a cada 5 min)', resolution: '5 min', series }))
  return { ok: true, pairs: Object.keys(quotes).length, points: Object.values(series).reduce((n, s) => n + s.points.length, 0) }
}
