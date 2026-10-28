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
const HIST_SOURCES = { USD: ['USD'], EUR: ['EUR'], JPY: ['JPY'] } // o yuan (CNH) sai do cruzamento USD/BRL ÷ USD/CNH
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

// Dias de histórico guardados: ~2 anos, para comparar um trecho com o mesmo trecho do ano anterior.
export const HISTORY_KEEP_DAYS = 800
const BACKFILL_RETRY = 24 * 3600e3
const compact = (t) => ymd(t).replaceAll('-', '')

// Une pontos antigos e novos por dia (o novo vence), em ordem e dentro da janela guardada.
export function mergePoints(old, fresh, now) {
  const byDay = new Map()
  for (const p of [...(old ?? []), ...(fresh ?? [])]) byDay.set(ymd(p.t), p)
  return [...byDay.values()].filter((p) => p.t >= now - HISTORY_KEEP_DAYS * 864e5).sort((a, b) => a.t - b.t)
}

// Yuan offshore: dólar em reais ÷ dólar em yuan (CNH), dia a dia
export function cnhPoints(usd, cnhRows) {
  const cnh = new Map(parseDaily(cnhRows).map((p) => [ymd(p.t), p]))
  return (usd ?? [])
    .filter((p) => cnh.has(ymd(p.t)))
    .map((p) => {
      const c = cnh.get(ymd(p.t))
      return { t: p.t, bid: p.bid / c.bid, high: p.high / c.low, low: p.low / c.high }
    })
}

// `range`: janela de datas { start, end } (AAAAMMDD) para trás; sem ela, os últimos 360 dias.
async function getDaily(pair, { key, fetchFn, range }) {
  const q = new URLSearchParams()
  if (range) { q.set('start_date', range.start); q.set('end_date', range.end) }
  if (key) q.set('token', key)
  const url = `https://economia.awesomeapi.com.br/json/daily/${pair}/360${q.size ? `?${q}` : ''}`
  const res = await fetchFn(url, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-coleta)' }, signal: AbortSignal.timeout(25000) })
  if (!res.ok) throw new Error(`${pair}: HTTP ${res.status}`)
  return res.json()
}

// Janela recente (360 dias) a cada 6 h; janela anterior (o ano de trás) uma vez, repetida a cada 24 h só se falhou.
// Falha de uma moeda mantém a anterior; os pontos antigos são preservados.
export async function collectHistory({ dir, key, fetchFn = fetch, now = Date.now(), ttl = HISTORY_TTL }) {
  const file = join(dir, 'history.json')
  const prev = await readJson(file)
  const needRecent = !(prev?.generatedAt && now - prev.generatedAt < ttl && prev.series?.CNH?.source === 'CNH')
  const needBack = !prev?.backfill?.ok && !(prev?.backfill?.at && now - prev.backfill.at < BACKFILL_RETRY)
  if (!needRecent && !needBack) return { ok: true, skipped: true }
  const series = { ...(prev?.series ?? {}) }
  const errors = []
  const windows = []
  if (needRecent) windows.push({ name: 'recente', range: null })
  if (needBack) {
    const end = now - 358 * 864e5
    windows.push({ name: 'anterior', range: { start: compact(end - 359 * 864e5), end: compact(end) } })
  }
  let backOk = true
  for (const w of windows) {
    const fresh = {}
    for (const code of Object.keys(HIST_SOURCES)) {
      try {
        const points = parseDaily(await getDaily(`${code}-BRL`, { key, fetchFn, range: w.range }))
        if (points.length < 30) throw new Error(`${code}: poucos dados (${w.name})`)
        fresh[code] = points
        series[code] = { source: code, points: mergePoints(series[code]?.points, points, now) }
      } catch (e) {
        errors.push(e.message)
        if (w.range) backOk = false
      }
      await sleep(500)
    }
    try {
      const usd = fresh.USD ?? (w.range ? null : series.USD?.points)
      if (!usd) throw new Error(`CNH: sem dólar na janela ${w.name}`)
      const points = cnhPoints(usd, await getDaily('USD-CNH', { key, fetchFn, range: w.range }))
      if (points.length < 30) throw new Error(`CNH: poucos dados (${w.name})`)
      series.CNH = { source: 'CNH', points: mergePoints(series.CNH?.points, points, now) }
    } catch (e) {
      errors.push(e.message)
      if (w.range) backOk = false
    }
  }
  if (!Object.keys(series).length) return { ok: false, error: errors.join(' | ') }
  const backfill = needBack ? { ok: backOk, at: now } : prev?.backfill
  await mkdir(dir, { recursive: true })
  await writeFile(file, JSON.stringify({ generatedAt: needRecent && !errors.length ? now : (prev?.generatedAt ?? now), source: 'AwesomeAPI', backfill, series }))
  return { ok: true, series: Object.keys(series).length, errors }
}
