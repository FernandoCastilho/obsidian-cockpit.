// Preços de combustíveis ao consumidor: resumo semanal do Levantamento de Preços da ANP (planilha oficial, aba BRASIL).
export const ANP_PAGE = 'https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas'
export const HISTORY_WEEKS = 160
export const FUELS = [
  { id: 'anp-gasolina', product: 'GASOLINA COMUM', label: 'Gasolina comum · bomba', unit: 'R$/litro' },
  { id: 'anp-etanol', product: 'ETANOL HIDRATADO', label: 'Etanol hidratado · bomba', unit: 'R$/litro' },
  { id: 'anp-diesel', product: 'OLEO DIESEL S10', label: 'Diesel S10 · bomba', unit: 'R$/litro' },
  { id: 'anp-glp', product: 'GLP', label: 'Gás de cozinha (botijão 13 kg)', unit: 'R$/botijão 13 kg' },
]
export const FUEL_IDS = FUELS.map(f => f.id)
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase()
const isoDay = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s).toISOString().slice(0, 10) === s
// Dias desde 30/12/1899 (data do Excel) -> AAAA-MM-DD.
export const excelDay = n => { const v = Number(n); return Number.isFinite(v) && v > 40000 && v < 80000 ? new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10) : null }

// Links dos resumos semanais na página oficial (somente www.gov.br/anp), do mais recente para o mais antigo.
export function discoverWeeklyFiles(html) {
  const out = new Map()
  for (const [, href] of html.matchAll(/href\s*=\s*["']([^"']*resumo_semanal_lpc_[^"']+\.xlsx)["']/gi)) {
    const url = new URL(href.replace(/&amp;/g, '&'), ANP_PAGE)
    const m = /resumo_semanal_lpc_(\d{4})[-_](\d{2})[-_](\d{2})[-_](\d{4})[-_](\d{2})[-_](\d{2})\.xlsx$/i.exec(url.pathname)
    if (url.protocol !== 'https:' || url.hostname !== 'www.gov.br' || !url.pathname.startsWith('/anp/') || !m) continue
    const [start, end] = [`${m[1]}-${m[2]}-${m[3]}`, `${m[4]}-${m[5]}-${m[6]}`]
    if (isoDay(start) && isoDay(end) && end >= start) out.set(end, { url: url.href, start, end })
  }
  return [...out.values()].sort((a, b) => b.end.localeCompare(a.end))
}

// Aba BRASIL (linhas esparsas por coluna) -> { end, prices: { id: R$ } } da semana. Produto ausente fica de fora, nunca vira zero.
export function parseWeek(rows) {
  if (!Array.isArray(rows)) throw new Error('ANP: planilha inválida')
  const head = rows.findIndex(r => Object.values(r).some(v => norm(v) === 'PRODUTO') && Object.values(r).some(v => norm(v) === 'PRECO MEDIO REVENDA'))
  if (head < 0) throw new Error('ANP: cabeçalho da aba BRASIL não encontrado')
  const col = name => Object.keys(rows[head]).find(k => norm(rows[head][k]) === name)
  const [cStart, cEnd, cProduct, cPrice, cUnit] = ['DATA INICIAL', 'DATA FINAL', 'PRODUTO', 'PRECO MEDIO REVENDA', 'UNIDADE DE MEDIDA'].map(col)
  if (!cStart || !cEnd || !cProduct || !cPrice) throw new Error('ANP: colunas esperadas ausentes')
  const prices = {}, ends = new Set(), starts = new Set()
  for (const r of rows.slice(head + 1)) {
    const fuel = FUELS.find(f => f.product === norm(r[cProduct]))
    if (!fuel) continue
    const price = Number(r[cPrice])
    const unit = norm(r[cUnit])
    if (!Number.isFinite(price) || !(price > 0) || price > 500) throw new Error(`ANP: preço inválido (${fuel.label})`)
    if (cUnit && fuel.unit.startsWith('R$/litro') && unit !== 'R$/L') throw new Error(`ANP: unidade inesperada (${fuel.label})`)
    if (cUnit && fuel.id === 'anp-glp' && !/13/.test(unit)) throw new Error(`ANP: unidade inesperada (${fuel.label})`)
    prices[fuel.id] = Math.round(price * 100) / 100
    ends.add(excelDay(r[cEnd])); starts.add(excelDay(r[cStart]))
  }
  if (!Object.keys(prices).length) throw new Error('ANP: nenhum combustível reconhecido na aba BRASIL')
  if (ends.size !== 1 || starts.size !== 1 || ends.has(null) || starts.has(null)) throw new Error('ANP: datas da semana inconsistentes')
  return { start: [...starts][0], end: [...ends][0], prices }
}

// Junta semanas ao histórico preservado (por data final), sem duplicar.
export function mergeWeeks(previousHistory, weeks) {
  const by = new Map()
  for (const [id, list] of Object.entries(previousHistory ?? {})) for (const p of list ?? []) if (isoDay(p?.period) && p.value > 0) by.set(`${id}|${p.period}`, p.value)
  for (const w of weeks) for (const [id, value] of Object.entries(w.prices)) by.set(`${id}|${w.end}`, value)
  const out = {}
  for (const [key, value] of by) { const [id, period] = key.split('|'); (out[id] ??= []).push({ period, value }) }
  for (const id of Object.keys(out)) out[id] = out[id].sort((a, b) => a.period.localeCompare(b.period)).slice(-HISTORY_WEEKS)
  return out
}

export function fuelItems(history, now = new Date()) {
  const today = now.toISOString().slice(0, 10)
  const items = []
  for (const f of FUELS) {
    const list = history[f.id] ?? []
    const last = list.at(-1)
    if (!last) continue
    if (last.period > today) throw new Error('ANP: semana futura')
    const prev = list.at(-2)
    const gap = prev ? (Date.parse(last.period) - Date.parse(prev.period)) / 864e5 : null
    const consecutive = gap === 7
    items.push({ id: f.id, label: f.label, unit: f.unit, nature: 'média semanal ao consumidor', sourceName: 'ANP · Levantamento de Preços de Combustíveis', sourceUrl: ANP_PAGE, benchmark: 'Preço médio de revenda · Brasil', decimals: 2,
      value: last.value, period: last.period, releaseDate: null, checkedAt: now.toISOString(), stale: false, error: null,
      previousValue: consecutive ? prev.value : null, previousPeriod: consecutive ? prev.period : null, variationPct: consecutive ? (last.value / prev.value - 1) * 100 : null, variationBasis: 'semana anterior', history: list })
  }
  if (!items.length) throw new Error('ANP: sem dados')
  return items
}

export function fuelFallback(previousItems, error) {
  const message = error instanceof Error ? error.message : String(error)
  const old = FUELS.map(f => previousItems.find(c => c?.id === f.id && Number.isFinite(c.value))).filter(Boolean)
  if (old.length) return old.map(c => ({ ...c, stale: true, error: message }))
  return FUELS.map(f => ({ id: f.id, label: f.label, unit: f.unit, nature: 'média semanal ao consumidor', sourceName: 'ANP · Levantamento de Preços de Combustíveis', sourceUrl: ANP_PAGE, benchmark: 'Preço médio de revenda · Brasil', value: null, period: null, releaseDate: null, checkedAt: null, stale: true, error: message, previousValue: null, previousPeriod: null, variationPct: null, variationBasis: 'semana anterior' }))
}
