// Calendário econômico: junta o arquivo coletado (calendar.json) com a agenda curada do Brasil e aplica os filtros da tela.
import { upcoming, zonedToUtc } from './agenda.js'

export const TZ = 'America/Sao_Paulo'
export const dayKey = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: TZ })
export const COUNTRIES = [
  { id: 'BR', name: 'Brasil', flag: 'BRL' }, { id: 'US', name: 'EUA', flag: 'USD' }, { id: 'EU', name: 'Zona do Euro', flag: 'EUR' },
  { id: 'GB', name: 'Reino Unido', flag: 'GBP' }, { id: 'JP', name: 'Japão', flag: 'JPY' }, { id: 'CN', name: 'China', flag: 'CNH' },
  { id: 'AU', name: 'Austrália', flag: null }, { id: 'CA', name: 'Canadá', flag: null }, { id: 'CH', name: 'Suíça', flag: null }, { id: 'NZ', name: 'Nova Zelândia', flag: null },
]
export const countryOf = (id) => COUNTRIES.find((c) => c.id === id) ?? { id, name: id, flag: null }

// Agenda curada do Brasil (Copom, IPCA, IPCA-15, Focus) e, só se a coleta automática dos EUA não cobre, FOMC e payroll.
const BR_IMPACT = { Copom: 'high', IPCA: 'high', 'IPCA-15': 'medium', Focus: 'medium' }
export function agendaEvents(now, days, coveredUs) {
  return upcoming(new Date(now), days)
    .filter((e) => BR_IMPACT[e.kind] || !coveredUs)
    .map((e) => (BR_IMPACT[e.kind]
      ? { src: 'agenda', country: 'BR', t: e.t, title: e.label, impact: BR_IMPACT[e.kind], forecast: null, previous: null, source: e.source, tentative: e.tentative }
      : { src: 'agenda', country: 'US', t: e.t, title: e.label, impact: 'high', forecast: null, previous: null, source: e.source, tentative: false }))
}

export function mergeEvents(file, now = Date.now(), days = 60) {
  const sources = file?.sources ?? {}
  // "cobre os EUA" = ao menos uma fonte oficial dos EUA respondeu na última coleta
  const coveredUs = !!(sources.bls?.ok || sources.fomc?.ok)
  const names = { ff: 'Forex Factory', bls: 'BLS', bea: 'BEA', fomc: 'Federal Reserve' }
  const fromFile = (file?.events ?? []).map((e) => ({ ...e, source: names[e.src] ?? e.src, tentative: false }))
  const seen = new Set()
  // o FOMC oficial substitui o item homônimo do Forex Factory (mesmo país e dia), evitando duplicar
  const official = new Set(fromFile.filter((e) => e.src === 'fomc' || e.src === 'bls' || e.src === 'bea').map((e) => `${e.country}|${dayKey(e.t)}|${e.src}`))
  const list = [...fromFile, ...agendaEvents(now, days, coveredUs)].filter((e) => {
    if (e.src === 'ff' && e.country === 'US' && /FOMC (Statement|Press Conference)|Federal Funds Rate/i.test(e.title) && official.has(`US|${dayKey(e.t)}|fomc`)) return false
    const key = `${e.src}|${e.t}|${e.title}|${e.country}`
    return seen.has(key) ? false : (seen.add(key), true)
  })
  return list.sort((a, b) => a.t - b.t || a.title.localeCompare(b.title))
}

export const PERIODS = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'amanha', label: 'Amanhã' },
  { id: 'semana', label: 'Esta semana' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
]
// Intervalo [início, fim) em ms, em dias civis de Brasília.
export function periodRange(id, now = Date.now()) {
  const today = dayKey(now)
  const at = (offset) => dayKey(Date.parse(`${today}T12:00:00Z`) + offset * 864e5)
  const start = (d) => zonedToUtc(d, '00:00', TZ)
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay() // 0 = domingo
  switch (id) {
    case 'hoje': return [start(today), start(at(1))]
    case 'amanha': return [start(at(1)), start(at(2))]
    case 'semana': return [start(at(-((dow + 6) % 7))), start(at(7 - ((dow + 6) % 7)))] // segunda a domingo
    case '7d': return [start(today), start(at(7))]
    default: return [start(today), start(at(30))]
  }
}

export function filterEvents(events, { period = 'semana', impacts = ['high', 'medium'], country = 'all', now = Date.now() } = {}) {
  const [from, to] = periodRange(period, now)
  return events.filter((e) => e.t >= from && e.t < to && impacts.includes(e.impact) && (country === 'all' || e.country === country))
}

export function groupByDay(events) {
  const days = []
  for (const e of events) {
    const k = dayKey(e.t)
    if (days.at(-1)?.key !== k) days.push({ key: k, events: [] })
    days.at(-1).events.push(e)
  }
  return days
}
