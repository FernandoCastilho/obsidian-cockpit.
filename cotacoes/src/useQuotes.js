import { useCallback, useEffect, useRef, useState } from 'react'

export const CURRENCIES = [
  { code: 'USD', name: 'Dólar americano', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'JPY', name: 'Iene japonês', flag: '🇯🇵' },
  { code: 'CNH', name: 'Yuan offshore', flag: '🇨🇳' },
]

const URL = `https://economia.awesomeapi.com.br/json/last/${CURRENCIES.map((c) => `${c.code}-BRL`).join(',')}`

async function fetchQuotes(signal) {
  const res = await fetch(URL, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return Object.fromEntries(
    CURRENCIES.map(({ code }) => {
      const q = data[`${code}BRL`]
      return [
        code,
        q && {
          bid: Number(q.bid),
          ask: Number(q.ask),
          high: Number(q.high),
          low: Number(q.low),
          pct: Number(q.pctChange),
          timestamp: Number(q.timestamp) * 1000,
        },
      ]
    }),
  )
}

export function useQuotes(intervalMs = 5000) {
  const [quotes, setQuotes] = useState(null)
  const [direction, setDirection] = useState({})
  const [error, setError] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const prev = useRef({})
  const ctrl = useRef(null)

  const load = useCallback(async () => {
    ctrl.current?.abort()
    ctrl.current = new AbortController()
    try {
      const next = await fetchQuotes(ctrl.current.signal)
      const dir = {}
      for (const [code, q] of Object.entries(next)) {
        const p = prev.current[code]?.bid
        if (q && p !== undefined && q.bid !== p) dir[code] = q.bid > p ? 'up' : 'down'
      }
      prev.current = next
      setDirection(dir)
      setQuotes(next)
      setUpdatedAt(new Date())
      setError(null)
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message)
    }
  }, [])

  useEffect(() => {
    load()
    let id = setInterval(load, intervalMs)
    const onVisibility = () => {
      clearInterval(id)
      if (!document.hidden) {
        load()
        id = setInterval(load, intervalMs)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(id)
      ctrl.current?.abort()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [load, intervalMs])

  return { quotes, direction, error, updatedAt }
}
