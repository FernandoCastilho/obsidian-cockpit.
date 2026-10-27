// Camada de apresentação do terminal: comandos digitados, faixa de cotações e indicadores do topo.
// Só formata o que o app já coleta; não consulta fontes nem calcula taxas novas.
import { liveCross } from './parity.js'

// Ordem do terminal (diferente da barra inferior do celular). Os ids são os mesmos de Nav.jsx.
export const DESK_TABS = [
  { id: 'resumo', label: 'Mercado' },
  { id: 'juros', label: 'Juros' },
  { id: 'cenarios', label: 'Cenários' },
  { id: 'calculadora', label: 'Calculadoras' },
  { id: 'noticias', label: 'Notícias' },
  { id: 'feriados', label: 'Feriados' },
  { id: 'config', label: 'Config' },
]

const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/<GO>|CURNCY|CURRENCY|[\s/\-_.]+/g, '')

const CURRENCY = { USD: 'USD', USDBRL: 'USD', DOLAR: 'USD', EUR: 'EUR', EURBRL: 'EUR', EURO: 'EUR', JPY: 'JPY', JPYBRL: 'JPY', IENE: 'JPY', CNH: 'CNH', CNHBRL: 'CNH', CNY: 'CNH', YUAN: 'CNH' }
const PAIR = new Set(['EURUSD', 'PARIDADE', 'PAR'])
const TAB = {
  MERCADO: ['resumo'], RESUMO: ['resumo'], HOME: ['resumo'],
  JUROS: ['juros'], DI: ['juros'], SELIC: ['juros'], CDI: ['juros'], CURVA: ['juros'], CURVAS: ['juros'], SOFR: ['juros'], TREASURY: ['juros'], UST: ['juros'],
  CENARIOS: ['cenarios'], FOCUS: ['cenarios'], PROJECOES: ['cenarios'],
  CALC: ['calculadora'], CALCULADORA: ['calculadora'], CALCULADORAS: ['calculadora'],
  FINIMP: ['calculadora', 'finimp'], SWAP: ['calculadora', 'finimpswap'], NCG: ['calculadora', 'ncg'], GIRO: ['calculadora', 'giro'], APLICACAO: ['calculadora', 'aplicacao'],
  NEWS: ['noticias'], NOTICIAS: ['noticias'], AGENDA: ['noticias'],
  FERIADOS: ['feriados'], CONFIG: ['config'], AJUDA: ['config'], HELP: ['config'],
}

// "USDBRL Curncy", "usd/brl", "dólar", "juros <GO>", "finimp" → destino, ou null se o comando não existe.
export function parseCommand(text) {
  const key = norm(text)
  if (!key) return null
  if (CURRENCY[key]) return { kind: 'currency', code: CURRENCY[key] }
  if (PAIR.has(key)) return { kind: 'pair' }
  if (TAB[key]) return { kind: 'tab', id: TAB[key][0], sub: TAB[key][1] ?? '' }
  return null
}

export const COMMAND_HINTS = ['USDBRL', 'EURBRL', 'JPYBRL', 'CNHBRL', 'EURUSD', 'JUROS', 'CURVA', 'FOCUS', 'CALC', 'FINIMP', 'NEWS', 'FERIADOS', 'CONFIG']

const nf = (v, d) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
export const toneOf = (v) => (Number.isFinite(v) && v > 0 ? 'up' : Number.isFinite(v) && v < 0 ? 'down' : 'flat')

// Uma variação que arredonda para zero na unidade exibida (0,00% ou 0 bps) não pode ter seta nem cor de alta ou baixa.
const roundsToZero = (change, unit) => Number.isFinite(change) && (unit === 'bps' ? Math.round(Math.abs(change) * 100) === 0 : Math.round(Math.abs(change) * 100) === 0)

// unit 'pct' (variação do dia) ou 'bps' (taxa de juros: a variação vem em pontos percentuais).
export function changeText(change, unit = 'pct') {
  if (!Number.isFinite(change)) return null
  const sign = roundsToZero(change, unit) ? '' : change > 0 ? '+' : change < 0 ? '−' : ''
  return unit === 'bps' ? `${sign}${Math.abs(Math.round(change * 100))} bps` : `${sign}${nf(Math.abs(change), 2)}%`
}

const priceDigits = (code) => (code === 'JPY' ? 5 : 4)

// Itens do tipo { key, label, value, change, unit, tone } usados pela faixa, pelos indicadores e pelo mapa de variação.
function fxItems(quotes) {
  const out = []
  for (const code of ['USD', 'EUR', 'JPY', 'CNH']) {
    const q = quotes?.[code]
    if (!q || !(q.bid > 0)) continue
    const hasDay = !q.fallback && Number.isFinite(q.pct)
    out.push({ key: `${code}BRL`, code, label: `${q.source || code}/BRL`, value: nf(q.bid, priceDigits(code)), change: hasDay ? q.pct : null, unit: 'pct' })
  }
  return out
}

function parityItem(quotes) {
  const p = liveCross(quotes?.EUR, quotes?.USD)
  if (!p || quotes.EUR.fallback || quotes.USD.fallback) return null
  return { key: 'EURUSD', code: 'PAR', label: 'EUR/USD', value: nf(p.main, 4), change: p.comparable === false ? null : p.pct, unit: 'pct', reason: p.comparable === false ? 'cotações de horários distintos' : null }
}

function rateItems(rates) {
  return (rates ?? []).map((r) => ({ key: r.key, label: r.label, value: `${nf(r.value, 2)}%`, change: r.delta, unit: 'bps', rate: true }))
}

const withTone = (items) => items.map((i) => ({ ...i, tone: roundsToZero(i.change, i.unit) ? 'flat' : toneOf(i.change), text: changeText(i.change, i.unit) }))

// Brent spot diário da EIA (arquivo oil.json): é referência datada, não cotação em tempo real; por isso leva a data e não tem variação.
export function brentItem(oil) {
  if (oil?.benchmark !== 'Brent' || oil?.kind !== 'spot' || oil?.unit !== 'USD/barril' || !Number.isFinite(oil.value)) return null
  const [, m, d] = String(oil.observationDate ?? '').split('-')
  return { key: 'BRENT', code: 'BRENT', label: 'Brent EIA', value: nf(oil.value, 2), change: null, unit: 'pct', note: d && m ? `${d}/${m}` : null }
}

// Faixa corrida sob a barra superior: câmbio, paridade, juros de referência e Brent (EIA, com data).
export function tapeItems(quotes, rates, oil) {
  const p = parityItem(quotes)
  const brent = brentItem(oil)
  return withTone([...fxItems(quotes), ...(p ? [p] : []), ...rateItems(rates), ...(brent ? [brent] : [])])
}

// Seis indicadores do topo do Mercado: dólar, euro, paridade e os três juros de referência do Brasil.
export function kpiItems(quotes, rates) {
  const fx = fxItems(quotes)
  const p = parityItem(quotes)
  const byKey = Object.fromEntries(rateItems(rates).map((r) => [r.key, r]))
  const pick = (...keys) => keys.map((k) => byKey[k]).filter(Boolean)
  return withTone([fx.find((i) => i.code === 'USD'), fx.find((i) => i.code === 'EUR'), p, ...pick('selic', 'cdi', 'di1')].filter(Boolean))
}

// Mapa de variação: moedas, paridade e juros longos, todos com a variação já calculada pelo app.
export function heatItems(quotes, rates) {
  const p = parityItem(quotes)
  const longRates = rateItems(rates).filter((r) => ['di1', 'ust10'].includes(r.key))
  return withTone([...fxItems(quotes), ...(p ? [p] : []), ...longRates]).filter((i) => Number.isFinite(i.change))
}

// Intensidade (0 a 1) da cor de um bloco do mapa: 1,2% no câmbio ou 15 bps em juros já saturam.
export function heatStrength(item) {
  if (!Number.isFinite(item.change)) return 0
  const full = item.unit === 'bps' ? 0.15 : 1.2
  return Math.min(1, Math.abs(item.change) / full)
}

// Estado do indicador "dados" da barra superior, a partir do que App.jsx já sabe sobre as cotações.
export function feedState({ error, aged, hasQuotes }) {
  if (error) return 'err'
  if (!hasQuotes) return 'loading'
  return aged ? 'delayed' : 'ok'
}

// Estado de cada fonte na tela de configurações. `at` em ms ou texto de data; `maxAge` em ms; fim de semana não conta como atraso
// quando a coleta é de dias úteis (`weekdays`).
export function dataStatus(entries, now = Date.now(), weekend = false) {
  return entries.map((e) => {
    const at = typeof e.at === 'number' ? e.at : Date.parse(e.at)
    if (!Number.isFinite(at)) return { key: e.key, label: e.label, at: null, ageMs: null, state: 'missing' }
    const ageMs = Math.max(0, now - at)
    const late = ageMs > e.maxAge && !(weekend && e.weekdays)
    return { key: e.key, label: e.label, at, ageMs, state: late ? 'old' : 'ok' }
  })
}

export function ageText(ageMs) {
  if (!Number.isFinite(ageMs)) return '—'
  const min = Math.round(ageMs / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  return h < 48 ? `há ${h} h` : `há ${Math.round(h / 24)} dias`
}

export const SHORTCUTS = [
  ['/', 'Foca a linha de comando'],
  ['Alt + 1 … 7', 'Mercado, Juros, Cenários, Calculadoras, Notícias, Feriados, Config'],
  ['USDBRL · EURBRL · JPYBRL · CNHBRL', 'Abre o gráfico da moeda'],
  ['EURUSD', 'Abre a paridade EUR/USD'],
  ['JUROS · CURVA · FOCUS', 'Vai para Juros ou Cenários'],
  ['CALC · FINIMP · NCG · GIRO', 'Abre a calculadora indicada'],
  ['NEWS · FERIADOS · CONFIG', 'Vai para a seção'],
]
