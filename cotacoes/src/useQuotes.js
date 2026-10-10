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
  if (/HTTP 429/.test(m)) return 'cota de consultas da fonte atingida; usando a reserva e tentando de novo em instantes'
  if (/HTTP 5\d\d/.test(m)) return 'a fonte de cotações está instável'
  if (/HTTP 404/.test(m)) return 'a fonte não tem esta cotação agora'
  if (/Failed to fetch|NetworkError|Load failed|network/i.test(m)) return 'sem conexão com a fonte de cotações'
  if (/sem cotação|sem dados/.test(m)) return 'a fonte não devolveu cotação'
  return m
}

// Chave da AwesomeAPI (plano gratuito: 100 mil consultas/mês com chave). Vem do segredo AWESOMEAPI_KEY do GitHub, na hora do build.
const KEY = import.meta.env?.VITE_AWESOMEAPI_KEY
export const withKey = (url) => (KEY ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(KEY)}` : url)

// Uma única consulta traz as quatro moedas (antes eram quatro): o yuan vem pelo CNY e só é trocado pelo cruzamento se estiver parado.
const PAIRS = { USD: 'USDBRL', EUR: 'EURBRL', JPY: 'JPYBRL', CNH: 'CNYBRL' }
const SOURCE = { USD: 'USD', EUR: 'EUR', JPY: 'JPY', CNH: 'CNY' }
const ALL = 'USD-BRL,EUR-BRL,JPY-BRL,CNY-BRL'

// Se a fonte devolveu 429 (cota), não insiste por 60 s: as reservas atendem enquanto isso.
let blockedUntil = 0
let blockedMsg = ''

async function getJson(url, label, signal) {
  if (Date.now() < blockedUntil) throw new Error(blockedMsg)
  const res = await fetch(withKey(url), { signal })
  if (!res.ok) {
    const err = new Error(`${label}: HTTP ${res.status}`)
    if (res.status === 429) {
      blockedUntil = Date.now() + 60000
      blockedMsg = err.message
    }
    throw err
  }
  return res.json()
}

const toQuote = (q, source) => ({
  source,
  bid: Number(q.bid),
  ask: Number(q.ask),
  high: Number(q.high),
  low: Number(q.low),
  pct: Number(q.pctChange),
  timestamp: Number(q.timestamp) * 1000,
})

// Yuan offshore em reais calculado pelo cruzamento USD/BRL ÷ USD/CNH (o CNH negocia durante os feriados chineses, o CNY onshore não).
async function fetchCnhCross(brl, signal) {
  const cnh = (await getJson(`${BASE}/USD-CNH`, 'USD-CNH', signal)).USDCNH
  if (!cnh) throw new Error('USD-CNH: resposta sem cotação')
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
// Guardada por 30 min: o BCE só atualiza uma vez por dia.
const ecbCache = new Map()
async function fetchEcb(code, signal) {
  const hit = ecbCache.get(code)
  if (hit && Date.now() - hit.at < 30 * 60000) return hit.quote
  const from = code === 'CNH' ? 'CNY' : code
  const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${from}&symbols=BRL`, { signal })
  if (!res.ok) throw new Error(`BCE ${from}: HTTP ${res.status}`)
  const j = await res.json()
  const rate = Number(j?.rates?.BRL)
  if (!(rate > 0) || !j.date) throw new Error(`BCE ${from}: resposta sem cotação`)
  const quote = { source: code, fallback: true, bid: rate, ask: rate, high: NaN, low: NaN, pct: 0, timestamp: Date.parse(`${j.date}T15:00:00Z`) }
  ecbCache.set(code, { at: Date.now(), quote })
  return quote
}

async function complete(code, batch, batchError, signal) {
  const errors = batchError ? [batchError] : []
  const raw = batch?.[PAIRS[code]]
  let quote = raw ? toQuote(raw, SOURCE[code] === 'CNY' ? 'CNY' : code) : null
  if (!quote && batch) errors.push(`${PAIRS[code]}: resposta sem cotação`)
  // CNH sem cotação fresca (ex.: mercado onshore fechado por feriado): tenta o cruzamento
  if (code === 'CNH' && batch?.USDBRL && (!quote || Date.now() - quote.timestamp > STALE_MS)) {
    try {
      const cross = await fetchCnhCross(batch.USDBRL, signal)
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

export async function fetchQuotes(signal) {
  let batch = null
  let batchError = null
  try {
    batch = await getJson(`${BASE}/${ALL}`, 'cotações', signal)
  } catch (e) {
    if (e.name === 'AbortError') throw e
    batchError = e.message
  }
  const results = await Promise.all(CURRENCIES.map((c) => complete(c.code, batch, batchError, signal)))
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
