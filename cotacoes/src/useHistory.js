import { useEffect, useState } from 'react'
import { CURRENCIES, friendlyError, withKey } from './useQuotes.js'

const BASE = 'https://economia.awesomeapi.com.br/json/daily'
export const MAX_DAYS = 360 // limite do endpoint diário da AwesomeAPI
const cache = new Map()

export const toYmd = (d) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
export const toInput = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const fromInput = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// O endpoint devolve só 1 registro se a quantidade não for informada: /{par}/{quantidade}?start_date&end_date
export function historyUrl(from, start, end) {
  const days = Math.round((end - start) / 864e5) + 1
  return `${BASE}/${from}-BRL/${Math.min(days, 360)}?start_date=${toYmd(start)}&end_date=${toYmd(end)}`
}

async function fetchSeries(from, start, end, signal) {
  const url = historyUrl(from, start, end)
  const res = await fetch(withKey(url), { signal })
  if (!res.ok) throw new Error(`${from}: HTTP ${res.status}`)
  const rows = await res.json()
  if (!Array.isArray(rows) || !rows.length) throw new Error(`${from}: sem dados no período`)
  const byDay = new Map()
  for (const r of rows) {
    const t = Number(r.timestamp) * 1000
    byDay.set(toYmd(new Date(t)), { t, bid: Number(r.bid), high: Number(r.high), low: Number(r.low) })
  }
  return { source: from, points: [...byDay.values()].sort((a, b) => a.t - b.t) }
}

// Reserva: referências diárias do BCE (Frankfurter), sem máxima/mínima. { rates: { 'AAAA-MM-DD': { BRL: n } } } -> pontos.
export function parseEcbSeries(json) {
  return Object.entries(json?.rates ?? {})
    .map(([d, r]) => ({ t: Date.parse(`${d}T15:00:00Z`), bid: Number(r?.BRL) }))
    .filter((p) => Number.isFinite(p.t) && p.bid > 0)
    .map((p) => ({ ...p, high: p.bid, low: p.bid }))
    .sort((a, b) => a.t - b.t)
}

async function fetchEcbHistory(code, start, end, signal) {
  const from = code === 'CNH' ? 'CNY' : code
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const res = await fetch(`https://api.frankfurter.dev/v1/${iso(start)}..${iso(end)}?base=${from}&symbols=BRL`, { signal })
  if (!res.ok) throw new Error(`BCE ${from}: HTTP ${res.status}`)
  const points = parseEcbSeries(await res.json())
  if (!points.length) throw new Error(`BCE ${from}: sem dados no período`)
  return { source: from, points, feed: 'BCE (referência diária)' }
}

async function fetchHistory(currency, start, end, signal) {
  const errors = []
  for (const from of currency.sources) {
    try {
      return await fetchSeries(from, start, end, signal)
    } catch (e) {
      if (e.name === 'AbortError') throw e
      errors.push(e.message)
    }
  }
  try {
    return await fetchEcbHistory(currency.code, start, end, signal)
  } catch (e) {
    if (e.name === 'AbortError') throw e
    errors.push(e.message)
  }
  throw new Error(errors.map(friendlyError).filter((m, i, a) => a.indexOf(m) === i).join(' · '))
}

export function useHistory(code, start, end, skip = false) {
  const startYmd = toYmd(start)
  const endYmd = toYmd(end)
  const key = `${code}|${startYmd}|${endYmd}`
  const [state, setState] = useState({ key: null, status: 'loading' })

  useEffect(() => {
    if (skip) return
    const hit = cache.get(key)
    if (hit) {
      setState({ key, status: 'ok', data: hit })
      return
    }
    const ctrl = new AbortController()
    setState({ key, status: 'loading' })
    fetchHistory(CURRENCIES.find((c) => c.code === code), start, end, ctrl.signal)
      .then((data) => {
        cache.set(key, data)
        setState({ key, status: 'ok', data })
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setState({ key, status: 'error', error: e.message })
      })
    return () => ctrl.abort()
  }, [key, code, start, end, skip]) // eslint-disable-line react-hooks/exhaustive-deps

  return state.key === key ? state : { key, status: 'loading' }
}

// ---- Intraday: barras de 5 minutos coletadas no GitHub (intraday.json), últimos 5 dias úteis ----
const sameDay = (t, day) => toYmd(new Date(t)) === toYmd(day)
let intradayPromise = null
let intradayAt = 0

function loadIntraday() {
  // o arquivo é renovado a cada hora; recarrega a cada 10 min
  if (!intradayPromise || Date.now() - intradayAt > 600000) {
    intradayAt = Date.now()
    intradayPromise = fetch(`./intraday.json?t=${Math.floor(Date.now() / 600000)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .catch((e) => {
        intradayPromise = null
        throw e
      })
  }
  return intradayPromise
}

export function useIntraday(code, day, skip = false) {
  const key = `${code}|${toYmd(day)}`
  const [state, setState] = useState({ key: null, status: 'loading' })

  useEffect(() => {
    if (skip) return
    let alive = true
    setState((s) => (s.key === key ? s : { key, status: 'loading' }))
    loadIntraday()
      .then((file) => {
        if (!alive) return
        const serie = file.series?.[code]
        const points = (serie?.points ?? []).filter(([t]) => sameDay(t, day)).map(([t, v]) => ({ t, bid: v }))
        if (points.length < 2) {
          setState({ key, status: 'error', error: 'ainda sem pontos suficientes neste dia (o intraday guarda os últimos 5 dias úteis e é atualizado a cada hora)' })
          return
        }
        setState({ key, status: 'ok', data: { source: code === 'CNH' ? 'CNY' : code, points, generatedAt: file.generatedAt, feed: file.source, resolution: file.resolution } })
      })
      .catch((e) => alive && setState({ key, status: 'error', error: `intraday indisponível (${e.message})` }))
    return () => {
      alive = false
    }
  }, [key, skip, code, day]) // eslint-disable-line react-hooks/exhaustive-deps

  return state.key === key ? state : { key, status: 'loading' }
}
