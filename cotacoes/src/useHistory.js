import { useEffect, useState } from 'react'
import { CURRENCIES } from './useQuotes.js'

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
  const res = await fetch(url, { signal })
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
  throw new Error(errors.join(' · '))
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

// ---- Intraday: últimas cotações (ticks) do dia escolhido ----
const TICKS = 'https://economia.awesomeapi.com.br/json'
const sameDay = (t, day) => toYmd(new Date(t)) === toYmd(day)

async function fetchTicks(from, day, signal) {
  const ymd = toYmd(day)
  const res = await fetch(`${TICKS}/${from}-BRL/360?start_date=${ymd}&end_date=${ymd}`, { signal })
  if (!res.ok) throw new Error(`${from}: HTTP ${res.status}`)
  const rows = await res.json()
  const points = (Array.isArray(rows) ? rows : [])
    .map((r) => ({ t: Number(r.timestamp) * 1000, bid: Number(r.bid), ask: Number(r.ask) }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.bid) && sameDay(p.t, day))
    .sort((a, b) => a.t - b.t)
  if (points.length < 2) throw new Error(`${from}: a API não retornou cotações intradiárias para este dia`)
  return { source: from, points }
}

export function useIntraday(code, day, skip = false) {
  const key = `${code}|${toYmd(day)}`
  const [state, setState] = useState({ key: null, status: 'loading' })

  useEffect(() => {
    if (skip) return
    const ctrl = new AbortController()
    const isToday = sameDay(Date.now(), day)
    const sources = CURRENCIES.find((c) => c.code === code).sources
    const run = async () => {
      const errors = []
      for (const from of sources) {
        try {
          const data = await fetchTicks(from, day, ctrl.signal)
          setState({ key, status: 'ok', data })
          return
        } catch (e) {
          if (e.name === 'AbortError') return
          errors.push(e.message)
        }
      }
      // em atualização automática, mantém o último gráfico válido
      setState((s) => (s.key === key && s.status === 'ok' ? s : { key, status: 'error', error: errors.join(' · ') }))
    }
    setState((s) => (s.key === key ? s : { key, status: 'loading' }))
    run()
    const id = isToday ? setInterval(run, 30000) : null
    return () => {
      ctrl.abort()
      if (id) clearInterval(id)
    }
  }, [key, skip]) // eslint-disable-line react-hooks/exhaustive-deps

  return state.key === key ? state : { key, status: 'loading' }
}
