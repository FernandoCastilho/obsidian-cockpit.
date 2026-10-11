// Coleta central de cotações: consulta a AwesomeAPI uma vez (todas as moedas) e grava, em `dir`:
//  - quotes.json: as cotações atuais, lidas por todos os usuários da página;
//  - intraday.json: pontos acumulados a cada coleta (5 dias), que formam o gráfico de intraday.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { mergeSnapshots } from './intraday-lib.mjs'

export const ALL = 'USD-BRL,EUR-BRL,JPY-BRL,USD-CNH'
const SNAP = { USD: 'USDBRL', EUR: 'EURBRL', JPY: 'JPYBRL' }
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
  // Yuan offshore: USD/BRL ÷ USD/CNH
  if (quotes.USDBRL && quotes.USDCNH) {
    snaps.CNH = [Math.min(Number(quotes.USDBRL.timestamp), Number(quotes.USDCNH.timestamp)) * 1000, Number(quotes.USDBRL.bid) / Number(quotes.USDCNH.ask)]
  }
  const series = mergeSnapshots(prev?.series, snaps, 5 * 864e5, now)
  await writeFile(join(dir, 'intraday.json'), JSON.stringify({ generatedAt: now, source: 'AwesomeAPI (coleta central a cada 5 min)', resolution: '5 min', series }))
  return { ok: true, pairs: Object.keys(quotes).length, points: Object.values(series).reduce((n, s) => n + s.points.length, 0) }
}

// ---- Histórico diário (360 dias) por moeda: lido por todos os usuários; a chave da API fica só aqui ----
const HIST_SOURCES = { USD: ['USD'], EUR: ['EUR'], JPY: ['JPY'], CNH: ['CNH', 'CNY'] }
export const HISTORY_TTL = 6 * 3600e3
const ymd = (t) => new Date(t).toISOString().slice(0, 10)

// Resposta de /json/daily -> pontos { t, bid, high, low } por dia, em ordem.
export function parseDaily(rows) {
  const byDay = new Map()
  for (const r of Array.isArray(rows) ? rows : []) {
    const t = Number(r.timestamp) * 1000
    const bid = Number(r.bid)
    if (Number.isFinite(t) && bid > 0) byDay.set(ymd(t), { t, bid, high: Number(r.high), low: Number(r.low) })
  }
  return [...byDay.values()].sort((a, b) => a.t - b.t)
}

// Só consulta quando history.json não existe ou tem mais de 6 h (4 consultas por vez). Falha de uma moeda mantém a anterior.
export async function collectHistory({ dir, key, fetchFn = fetch, now = Date.now(), ttl = HISTORY_TTL }) {
  const file = join(dir, 'history.json')
  const prev = await readJson(file)
  if (prev?.generatedAt && now - prev.generatedAt < ttl) return { ok: true, skipped: true }
  const series = { ...(prev?.series ?? {}) }
  const errors = []
  for (const [code, sources] of Object.entries(HIST_SOURCES)) {
    for (const from of sources) {
      try {
        const url = `https://economia.awesomeapi.com.br/json/daily/${from}-BRL/360${key ? `?token=${encodeURIComponent(key)}` : ''}`
        const res = await fetchFn(url, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-coleta)' }, signal: AbortSignal.timeout(25000) })
        if (!res.ok) throw new Error(`${from}: HTTP ${res.status}`)
        const points = parseDaily(await res.json())
        if (points.length < 30) throw new Error(`${from}: poucos dados`)
        series[code] = { source: from, points }
        break
      } catch (e) {
        errors.push(e.message)
      }
    }
    await sleep(500)
  }
  if (!Object.keys(series).length) return { ok: false, error: errors.join(' | ') }
  await mkdir(dir, { recursive: true })
  await writeFile(file, JSON.stringify({ generatedAt: errors.length ? (prev?.generatedAt ?? now) : now, source: 'AwesomeAPI', series }))
  return { ok: true, series: Object.keys(series).length, errors }
}
