import { useCallback, useEffect, useRef, useState } from 'react'

export const CURRENCIES = [
  { code: 'USD', name: 'Dólar americano', flag: '🇺🇸', sources: ['USD'] },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺', sources: ['EUR'] },
  { code: 'JPY', name: 'Iene japonês', flag: '🇯🇵', sources: ['JPY'] },
  // Yuan offshore; se a API não listar CNH, cai para o yuan onshore (CNY)
  { code: 'CNH', name: 'Yuan offshore', flag: '🇨🇳', sources: ['CNH', 'CNY'] },
]

const BASE = 'https://economia.awesomeapi.com.br/json/last'

// Mensagens técnicas da API/rede -> texto que o usuário entende.
export function friendlyError(msg) {
  const m = String(msg)
  if (/HTTP 429/.test(m)) return 'limite de consultas da fonte atingido; tentando de novo em instantes'
  if (/HTTP 5\d\d/.test(m)) return 'a fonte de cotações está instável'
  if (/HTTP 404/.test(m)) return 'a fonte não tem esta cotação agora'
  if (/Failed to fetch|NetworkError|Load failed|network/i.test(m)) return 'sem conexão com a fonte de cotações'
  if (/sem cotação|sem dados/.test(m)) return 'a fonte não devolveu cotação'
  return m
}

async function fetchRaw(from, to, signal) {
  const res = await fetch(`${BASE}/${from}-${to}`, { signal })
  if (!res.ok) throw new Error(`${from}-${to}: HTTP ${res.status}`)
  const q = (await res.json())[`${from}${to}`]
  if (!q) throw new Error(`${from}-${to}: resposta sem cotação`)
  return q
}

async function fetchPair(from, signal) {
  const q = await fetchRaw(from, 'BRL', signal)
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

// Yuan offshore em reais calculado pelo cruzamento USD/BRL ÷ USD/CNH (o CNH negocia durante os feriados chineses, o CNY onshore não).
async function fetchCnhCross(signal) {
  const [brl, cnh] = await Promise.all([fetchRaw('USD', 'BRL', signal), fetchRaw('USD', 'CNH', signal)])
  const n = Number
  return {
    source: 'CNH',
    cross: true,
    bid: n(brl.bid) / n(cnh.ask),
    ask: n(brl.ask) / n(cnh.bid),
    high: n(brl.high) / n(cnh.low),
    low: n(brl.low) / n(cnh.high),
    pct: n(brl.pctChange) - n(cnh.pctChange),
    timestamp: Math.min(n(brl.timestamp), n(cnh.timestamp)) * 1000,
  }
}

const STALE_MS = 6 * 3600e3

// Reserva quando a fonte principal falha (ex.: limite de requisições): referência diária do BCE, sem compra/venda separadas.
async function fetchEcb(code, signal) {
  const from = code === 'CNH' ? 'CNY' : code
  const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${from}&symbols=BRL`, { signal })
  if (!res.ok) throw new Error(`BCE ${from}: HTTP ${res.status}`)
  const j = await res.json()
  const rate = Number(j?.rates?.BRL)
  if (!(rate > 0) || !j.date) throw new Error(`BCE ${from}: resposta sem cotação`)
  return { source: code, fallback: true, bid: rate, ask: rate, high: NaN, low: NaN, pct: 0, timestamp: Date.parse(`${j.date}T15:00:00Z`) }
}

async function fetchCurrency({ code, sources }, signal) {
  const errors = []
  let quote = null
  for (const from of sources) {
    try {
      quote = await fetchPair(from, signal)
      break
    } catch (e) {
      if (e.name === 'AbortError') throw e
      errors.push(e.message)
    }
  }
  // CNH sem cotação fresca (ex.: mercado onshore fechado por feriado): tenta o cruzamento
  if (code === 'CNH' && (!quote || Date.now() - quote.timestamp > STALE_MS)) {
    try {
      const cross = await fetchCnhCross(signal)
      if (!quote || cross.timestamp > quote.timestamp) quote = cross
    } catch (e) {
      if (e.name === 'AbortError') throw e
      errors.push(e.message)
    }
  }
  if (!quote) {
    try {
      quote = await fetchEcb(code, signal)
    } catch (e) {
      if (e.name === 'AbortError') throw e
      errors.push(e.message)
    }
  }
  return quote ? { quote } : { error: [...new Set(errors.map(friendlyError))].join(' · ') }
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
      if (e.name !== 'AbortError') setError(friendlyError(e.message))
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

  return { quotes, direction, error, errors, updatedAt, reload: load }
}
