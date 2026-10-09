import { useCallback, useEffect, useRef, useState } from 'react'

export const CURRENCIES = [
  { code: 'USD', name: 'Dólar americano', flag: '🇺🇸', sources: ['USD'] },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺', sources: ['EUR'] },
  { code: 'JPY', name: 'Iene japonês', flag: '🇯🇵', sources: ['JPY'] },
  // Yuan offshore; se a API não listar CNH, cai para o yuan onshore (CNY)
  { code: 'CNH', name: 'Yuan offshore', flag: '🇨🇳', sources: ['CNH', 'CNY'] },
]

const BASE = 'https://economia.awesomeapi.com.br/json/last'

async function fetchPair(from, signal) {
  const res = await fetch(`${BASE}/${from}-BRL`, { signal })
  if (!res.ok) throw new Error(`${from}: HTTP ${res.status}`)
  const q = (await res.json())[`${from}BRL`]
  if (!q) throw new Error(`${from}: resposta sem cotação`)
  return {
    source: from,
    bid: Number(q.bid),
    ask: Number(q.ask),
    high: Number(q.high),
    low: Number(q.low),
    pct: Number(q.pctChange),
    timestamp: Number(q.timestamp) * 1000,
  }
}

async function fetchCurrency({ sources }, signal) {
  const errors = []
  for (const from of sources) {
    try {
      return { quote: await fetchPair(from, signal) }
    } catch (e) {
      if (e.name === 'AbortError') throw e
      errors.push(e.message)
    }
  }
  return { error: errors.join(' · ') }
}

async function fetchQuotes(signal) {
  const results = await Promise.all(CURRENCIES.map((c) => fetchCurrency(c, signal)))
  return Object.fromEntries(CURRENCIES.map((c, i) => [c.code, results[i]]))
}

export function useQuotes(intervalMs = 5000) {
  const [quotes, setQuotes] = useState(null)
  const [direction, setDirection] = useState({})
  const [error, setError] = useState(null)
  const [errors, setErrors] = useState({})
  const [updatedAt, setUpdatedAt] = useState(null)
  const prev = useRef({})
  const ctrl = useRef(null)

  const load = useCallback(async () => {
    ctrl.current?.abort()
    ctrl.current = new AbortController()
    try {
      const results = await fetchQuotes(ctrl.current.signal)
      const next = {}
      const errs = {}
      const dir = {}
      let fresh = 0
      for (const [code, r] of Object.entries(results)) {
        if (r.quote) {
          fresh += 1
          next[code] = r.quote
          const p = prev.current[code]?.bid
          if (p !== undefined && r.quote.bid !== p) dir[code] = r.quote.bid > p ? 'up' : 'down'
        } else {
          // mantém a última cotação válida enquanto a moeda falha
          if (prev.current[code]) next[code] = prev.current[code]
          errs[code] = r.error
        }
      }
      prev.current = next
      setDirection(dir)
      setQuotes(next)
      setErrors(errs)
      if (fresh) setUpdatedAt(new Date())
      // todas falharam (ex.: limite da API): não afirmar que está atualizado
      setError(fresh ? null : Object.values(errs)[0] ?? 'sem resposta da fonte')
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

  return { quotes, direction, error, errors, updatedAt }
}
