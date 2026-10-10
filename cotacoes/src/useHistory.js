import { useEffect, useState } from 'react'
import { DATA_BASE, friendlyError } from './useQuotes.js'

export const MAX_DAYS = 360 // limite do endpoint diário da AwesomeAPI
const cache = new Map()

export const toYmd = (d) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
export const toInput = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const fromInput = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Histórico diário (360 dias) coletado pelo robô do GitHub (history.json, branch `data`): a chave da API não sai de lá.
let centralPromise = null
let centralAt = 0
function loadCentralHistory() {
  if (!DATA_BASE) return Promise.reject(new Error('coleta central não configurada'))
  if (!centralPromise || Date.now() - centralAt > 600000) {
    centralAt = Date.now()
    centralPromise = fetch(`${DATA_BASE}/history.json?t=${Math.floor(Date.now() / 600000)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .catch((e) => {
        centralPromise = null
        throw e
      })
  }
  return centralPromise
}

// Recorte do arquivo central; só vale se ele cobre o início do período pedido.
export function pickCentral(file, code, start, end) {
  const s = file?.series?.[code]
  if (!s?.points?.length) throw new Error(`${code}: histórico central sem dados`)
  if (s.points[0].t > start.getTime() + 5 * 864e5) throw new Error(`${code}: período maior que o histórico central`)
  const points = sliceRange(s.points, start, end)
  if (!points.length) throw new Error(`${code}: sem dados no período`)
  return { source: s.source, points }
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
  try {
    return pickCentral(await loadCentralHistory(), currency.code, start, end)
  } catch (e) {
    errors.push(e.message)
  }
  try {
    return await fetchEcbHistory(currency.code, start, end, signal) // reserva e períodos longos: referência diária do BCE
  } catch (e) {
    if (e.name === 'AbortError') throw e
    errors.push(e.message)
  }
  throw new Error(errors.map(friendlyError).filter((m, i, a) => a.indexOf(m) === i).join(' · '))
}

// Uma única janela de 360 dias por moeda atende os gráficos, as variações dos cards e a paridade: as demais
// consultas viram recortes dessa janela (e ela fica guardada no navegador por 6 h), poupando a cota da API.
const FULL_DAYS = 359
const dayStart = (d) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
export const fullWindow = (now = new Date()) => {
  const end = dayStart(now)
  return { start: new Date(end.getTime() - FULL_DAYS * 864e5), end }
}
export const sliceRange = (points, start, end) => points.filter((p) => p.t >= start.getTime() && p.t < end.getTime() + 864e5)

const STORE = 'cotacoes-hist-v1'
const STORE_TTL = 6 * 3600e3
const readStore = (fkey) => {
  try {
    const e = JSON.parse(localStorage.getItem(STORE) ?? '{}')[fkey]
    return e && Date.now() - e.at < STORE_TTL ? e.data : null
  } catch {
    return null
  }
}
const writeStore = (fkey, data) => {
  try {
    const all = JSON.parse(localStorage.getItem(STORE) ?? '{}')
    const day = fkey.split('|')[2]
    for (const k of Object.keys(all)) if (k.split('|')[2] !== day) delete all[k] // descarta dias anteriores
    all[fkey] = { at: Date.now(), data }
    localStorage.setItem(STORE, JSON.stringify(all))
  } catch {
    /* sem armazenamento (modo privado) ou cheio: segue só com a memória */
  }
}
const inflight = new Map()

export function useHistory(code, start, end, skip = false) {
  const startYmd = toYmd(start)
  const endYmd = toYmd(end)
  const key = `${code}|${startYmd}|${endYmd}`
  const [state, setState] = useState({ key: null, status: 'loading' })

  useEffect(() => {
    if (skip) return
    const win = fullWindow()
    const full = start >= win.start && end <= win.end
    const fkey = full ? `${code}|full|${toYmd(win.end)}` : key
    const view = (data) => (full ? { ...data, points: sliceRange(data.points, start, end) } : data)
    const hit = cache.get(fkey) ?? (full ? readStore(fkey) : null)
    if (hit) {
      cache.set(fkey, hit)
      setState({ key, status: 'ok', data: view(hit) })
      return
    }
    let alive = true
    setState({ key, status: 'loading' })
    let p = inflight.get(fkey)
    if (!p) {
      p = fetchHistory({ code }, full ? win.start : start, full ? win.end : end, undefined)
        .then((data) => {
          cache.set(fkey, data)
          if (full) writeStore(fkey, data)
          return data
        })
        .finally(() => inflight.delete(fkey))
      inflight.set(fkey, p)
    }
    p.then((data) => alive && setState({ key, status: 'ok', data: view(data) })).catch((e) => alive && setState({ key, status: 'error', error: e.message }))
    return () => {
      alive = false
    }
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
    // dados da coleta central (branch `data`); sem ela configurada, tenta o arquivo do próprio site
    intradayPromise = fetch(`${DATA_BASE ? `${DATA_BASE}/` : './'}intraday.json?t=${Math.floor(Date.now() / 60000)}`)
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
          setState({ key, status: 'error', error: 'ainda sem pontos suficientes neste dia (o intraday guarda os últimos 5 dias e é atualizado a cada 5 minutos no horário comercial)' })
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
