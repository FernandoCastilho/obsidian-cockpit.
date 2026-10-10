import { useCallback, useEffect, useRef, useState } from 'react'

export const CURRENCIES = [
  { code: 'USD', name: 'Dólar americano', flag: '🇺🇸', sources: ['USD'] },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺', sources: ['EUR'] },
  { code: 'JPY', name: 'Iene japonês', flag: '🇯🇵', sources: ['JPY'] },
  // Código interno CNH; a série usada de fato é o CNY (onshore), ou o CNH (offshore) por cruzamento quando o CNY está parado
  { code: 'CNH', name: 'Yuan', flag: '🇨🇳', sources: ['CNH', 'CNY'] },
]

// Nome conforme a série realmente usada: CNY é o yuan onshore; CNH, o offshore (calculado por cruzamento).
export const seriesName = (currency, source) => (currency.code === 'CNH' ? (source === 'CNH' ? 'Yuan offshore (CNH, por cruzamento)' : 'Yuan onshore (CNY)') : currency.name)

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

// A chave da AwesomeAPI fica só no robô do GitHub (coleta central); o navegador não a usa, e a consulta direta (botão Atualizar) usa a cota anônima.

// Uma única consulta traz as quatro moedas (antes eram quatro): o yuan vem pelo CNY e só é trocado pelo cruzamento se estiver parado.
const PAIRS = { USD: 'USDBRL', EUR: 'EURBRL', JPY: 'JPYBRL', CNH: 'CNYBRL' }
const SOURCE = { USD: 'USD', EUR: 'EUR', JPY: 'JPY', CNH: 'CNY' }
const ALL = 'USD-BRL,EUR-BRL,JPY-BRL,CNY-BRL,USD-CNH'

// Se a fonte devolveu 429 (cota), não insiste por 60 s: as reservas atendem enquanto isso.
let blockedUntil = 0
let blockedMsg = ''

async function getJson(url, label, signal) {
  if (Date.now() < blockedUntil) throw new Error(blockedMsg)
  const res = await fetch(url, { signal })
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
async function fetchCnhCross(brl, preloaded, signal) {
  const cnh = preloaded ?? (await getJson(`${BASE}/USD-CNH`, 'USD-CNH', signal)).USDCNH
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
  const quote = { source: from, fallback: true, bid: rate, ask: rate, high: NaN, low: NaN, pct: 0, timestamp: Date.parse(`${j.date}T15:00:00Z`) }
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
      const cross = await fetchCnhCross(batch.USDBRL, batch.USDCNH, signal)
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

// Coleta central: um robô do GitHub consulta a API a cada 5 min e publica quotes.json na branch `data`.
// Todos os usuários leem esse arquivo (sem gastar a cota da API). VITE_DATA_BASE é definido no build.
export const DATA_BASE = import.meta.env?.VITE_DATA_BASE
const CENTRAL_MAX_AGE = 45 * 60000

export async function fetchCentral(signal, base = DATA_BASE) {
  if (!base) throw new Error('coleta central não configurada')
  const res = await fetch(`${base}/quotes.json?t=${Math.floor(Date.now() / 60000)}`, { signal })
  if (!res.ok) throw new Error(`coleta central: HTTP ${res.status}`)
  const j = await res.json()
  if (!j?.quotes || !j.generatedAt) throw new Error('coleta central: arquivo inválido')
  return j
}

let lastDirectAt = 0

// direct=true (botão "Atualizar agora"): consulta a API na hora. Automático: lê a coleta central e só consulta
// a API direto, no máximo a cada 5 min, se a coleta central estiver ausente ou velha.
export async function fetchQuotes(signal, { direct = false, base } = {}) {
  let batch = null
  let batchError = null
  let via = 'direto'
  let collectedAt = Date.now()
  if (!direct) {
    try {
      const c = await fetchCentral(signal, base)
      if (Date.now() - c.generatedAt <= CENTRAL_MAX_AGE) {
        batch = c.quotes
        via = 'central'
        collectedAt = c.generatedAt
      } else batchError = 'coleta central desatualizada'
    } catch (e) {
      if (e.name === 'AbortError') throw e
      batchError = e.message
    }
  }
  if (!batch && (direct || Date.now() - lastDirectAt > 300000)) {
    lastDirectAt = Date.now()
    try {
      batch = await getJson(`${BASE}/${ALL}`, 'cotações', signal)
      batchError = null
      collectedAt = Date.now()
    } catch (e) {
      if (e.name === 'AbortError') throw e
      batchError = e.message
    }
  }
  const results = await Promise.all(CURRENCIES.map((c) => complete(c.code, batch, batchError, signal)))
  return { results: Object.fromEntries(CURRENCIES.map((c, i) => [c.code, results[i]])), via: batch ? via : 'reserva', collectedAt }
}

// Limite do botão "Atualizar agora", por navegador: 1 por minuto e 30 por dia (protege a cota da API de todos).
const REFRESH_KEY = 'cotacoes-refresh-log'
export const REFRESH_COOLDOWN_S = 60
export const REFRESH_DAILY_MAX = 30
const readLog = () => {
  try {
    return JSON.parse(localStorage.getItem(REFRESH_KEY) ?? '[]').filter((t) => Date.now() - t < 864e5)
  } catch {
    return []
  }
}
const writeLog = (log) => {
  try {
    localStorage.setItem(REFRESH_KEY, JSON.stringify(log))
  } catch {
    /* sem armazenamento: o limite vale só na sessão */
  }
}
export function refreshLimits(now = Date.now()) {
  const log = readLog()
  const wait = log.length ? Math.max(0, Math.ceil((log[log.length - 1] + REFRESH_COOLDOWN_S * 1000 - now) / 1000)) : 0
  return { wait, left: Math.max(0, REFRESH_DAILY_MAX - log.length) }
}

export function useQuotes(intervalMs = 60000) {
  const [quotes, setQuotes] = useState(null)
  const [direction, setDirection] = useState({})
  const [error, setError] = useState(null)
  const [errors, setErrors] = useState({})
  const [updatedAt, setUpdatedAt] = useState(null)
  const [via, setVia] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [limits, setLimits] = useState(() => refreshLimits())
  const prev = useRef({})
  const ctrl = useRef(null)

  const load = useCallback(async (direct = false) => {
    ctrl.current?.abort()
    ctrl.current = new AbortController()
    try {
      const { results, via: v, collectedAt } = await fetchQuotes(ctrl.current.signal, { direct })
      const next = {}
      const errs = {}
      const dir = {}
      let fresh = 0
      for (const [code, r] of Object.entries(results)) {
        const old = prev.current[code]
        if (r.quote) {
          fresh += 1
          // nunca troca uma cotação mais nova (ex.: do botão) por outra mais velha (ex.: da coleta central)
          const keep = old && !old.fallback && !r.quote.fallback && old.timestamp > r.quote.timestamp
          next[code] = keep ? old : r.quote
          if (old && next[code].bid !== old.bid) dir[code] = next[code].bid > old.bid ? 'up' : 'down'
        } else {
          // mantém a última cotação válida enquanto a moeda falha
          if (old) next[code] = old
          errs[code] = r.error
        }
      }
      prev.current = next
      setDirection(dir)
      setQuotes(next)
      setErrors(errs)
      if (fresh) {
        setUpdatedAt(new Date(collectedAt))
        setVia(v)
      }
      // todas falharam (ex.: limite da API): não afirmar que está atualizado
      setError(fresh ? null : Object.values(errs)[0] ?? 'sem resposta da fonte')
    } catch (e) {
      if (e.name !== 'AbortError') setError(friendlyError(e.message))
    }
  }, [])

  // Botão "Atualizar agora": consulta a API direto, respeitando o limite por navegador.
  const refresh = useCallback(async () => {
    const lim = refreshLimits()
    if (lim.wait > 0 || lim.left <= 0) return setLimits(lim)
    writeLog([...readLog(), Date.now()])
    setRefreshing(true)
    await load(true)
    setRefreshing(false)
    setLimits(refreshLimits())
  }, [load])

  // contagem regressiva do intervalo mínimo entre atualizações manuais
  useEffect(() => {
    if (limits.wait <= 0) return
    const id = setInterval(() => setLimits(refreshLimits()), 1000)
    return () => clearInterval(id)
  }, [limits.wait])

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

  return { quotes, direction, error, errors, updatedAt, via, reload: () => load(false), refresh, refreshing, limits }
}
