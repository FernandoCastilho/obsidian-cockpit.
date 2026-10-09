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

async function fetchSeries(from, startYmd, endYmd, signal) {
  const url = `${BASE}/${from}-BRL/?start_date=${startYmd}&end_date=${endYmd}`
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

async function fetchHistory(currency, startYmd, endYmd, signal) {
  const errors = []
  for (const from of currency.sources) {
    try {
      return await fetchSeries(from, startYmd, endYmd, signal)
    } catch (e) {
      if (e.name === 'AbortError') throw e
      errors.push(e.message)
    }
  }
  throw new Error(errors.join(' · '))
}

export function useHistory(code, start, end) {
  const startYmd = toYmd(start)
  const endYmd = toYmd(end)
  const key = `${code}|${startYmd}|${endYmd}`
  const [state, setState] = useState({ key: null, status: 'loading' })

  useEffect(() => {
    const hit = cache.get(key)
    if (hit) {
      setState({ key, status: 'ok', data: hit })
      return
    }
    const ctrl = new AbortController()
    setState({ key, status: 'loading' })
    fetchHistory(CURRENCIES.find((c) => c.code === code), startYmd, endYmd, ctrl.signal)
      .then((data) => {
        cache.set(key, data)
        setState({ key, status: 'ok', data })
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setState({ key, status: 'error', error: e.message })
      })
    return () => ctrl.abort()
  }, [key, code, startYmd, endYmd])

  return state.key === key ? state : { key, status: 'loading' }
}
