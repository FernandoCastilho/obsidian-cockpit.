// Commodities em reais: IC-Br (Banco Central, SGS) e soja em R$/saca estimada a partir do Pink Sheet e do câmbio (SGS 1).
export const SGS_API = (code, a, b) => `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?formato=json&dataInicial=${a}&dataFinal=${b}`
export const FX_CODE = 1
const sgsPage = code => `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?formato=json`
export const PINK_PAGE_URL = 'https://www.worldbank.org/en/research/commodity-markets'
export const SACA_KG = 60
export const MIN_FX_DAYS = 15
export const HISTORY_MONTHS = 240
export const ICBR = [
  { id: 'ic-br', code: 27574, label: 'IC-Br · geral', benchmark: 'Índice de commodities em reais · cesta completa' },
  { id: 'ic-br-agro', code: 27575, label: 'IC-Br · agropecuária', benchmark: 'Índice de commodities em reais · agropecuária' },
  { id: 'ic-br-metal', code: 27576, label: 'IC-Br · metais', benchmark: 'Índice de commodities em reais · metais' },
  { id: 'ic-br-energia', code: 27577, label: 'IC-Br · energia', benchmark: 'Índice de commodities em reais · energia' },
]
export const SOJA_SACA = { id: 'soja-saca', label: 'Soja · R$/saca', unit: 'R$/saca de 60 kg', nature: 'estimativa mensal', benchmark: 'Soja FOB Golfo EUA × dólar médio do mês', sourceName: 'Banco Mundial (Pink Sheet) × Banco Central (SGS 1)', sourceUrl: PINK_PAGE_URL, decimals: 2 }
export const IDS = [...ICBR.map(c => c.id), SOJA_SACA.id]

const SGS_DATE = /^(\d{2})\/(0[1-9]|1[0-2])\/(\d{4})$/
function rowsOf(rows, label, min) {
  if (!Array.isArray(rows) || rows.length < min) throw new Error(`SGS devolveu poucas linhas (${label})`)
  return rows.map(r => {
    const m = SGS_DATE.exec(r?.data ?? ''), v = Number(r?.valor)
    if (!m || r?.valor === '' || r?.valor == null || !Number.isFinite(v) || !(v > 0)) throw new Error(`Linha SGS inválida (${label})`)
    return { day: `${m[3]}-${m[2]}-${m[1]}`, period: `${m[3]}-${m[2]}`, value: v }
  })
}
const priorMonth = p => { const d = new Date(`${p}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() - 1); return d.toISOString().slice(0, 7) }
const variation = (last, prev) => prev && prev.period === priorMonth(last.period) ? { previousValue: prev.value, previousPeriod: prev.period, variationPct: (last.value / prev.value - 1) * 100 } : { previousValue: null, previousPeriod: null, variationPct: null }

function build(meta, history, now, sourceUrl) {
  const last = history.at(-1)
  if (!last) throw new Error(`${meta.label}: série vazia`)
  if (`${last.period}-01` > now.toISOString().slice(0, 10)) throw new Error(`${meta.label}: período futuro`)
  return { id: meta.id, label: meta.label, unit: meta.unit, nature: meta.nature, sourceName: meta.sourceName, sourceUrl, benchmark: meta.benchmark, decimals: meta.decimals,
    value: last.value, period: last.period, releaseDate: null, checkedAt: now.toISOString(), stale: false, error: null,
    ...variation(last, history.at(-2)), variationBasis: 'mês anterior', history: history.slice(-HISTORY_MONTHS) }
}

// Uma série do IC-Br (mensal, SGS) -> item no mesmo formato de commodities.json.
export function icbrItem(def, rows, now = new Date()) {
  const history = rowsOf(rows, def.label, 12).map(({ period, value }) => ({ period, value }))
  if (new Set(history.map(p => p.period)).size !== history.length) throw new Error(`${def.label}: mês duplicado`)
  history.sort((a, b) => a.period.localeCompare(b.period))
  return build({ ...def, unit: 'índice', nature: 'média mensal', sourceName: `Banco Central · IC-Br (SGS ${def.code})`, decimals: 2 }, history, now, sgsPage(def.code))
}

// Dólar médio do mês (SGS 1, venda); mês com menos de MIN_FX_DAYS cotações fica de fora, nunca vira zero.
export function monthlyFx(rows) {
  const sums = new Map()
  for (const { period, value } of rowsOf(rows, 'câmbio', 20)) { const s = sums.get(period) ?? { total: 0, days: 0 }; s.total += value; s.days++; sums.set(period, s) }
  return new Map([...sums].filter(([, s]) => s.days >= MIN_FX_DAYS).map(([period, s]) => [period, s.total / s.days]))
}

// Soja em R$/saca de 60 kg = USD/t (FOB Golfo EUA) × 0,06 × dólar médio do mês. Estimativa de referência, não o preço pago ao produtor.
export function sojaSacaItem(soyHistory, fx, now = new Date()) {
  const history = (Array.isArray(soyHistory) ? soyHistory : [])
    .filter(p => /^\d{4}-\d{2}$/.test(p?.period) && p.value > 0 && fx.has(p.period))
    .map(p => ({ period: p.period, value: p.value * (SACA_KG / 1000) * fx.get(p.period) }))
    .sort((a, b) => a.period.localeCompare(b.period))
  return build(SOJA_SACA, history, now, PINK_PAGE_URL)
}

export function itemFallback(id, previous, error) {
  const message = error instanceof Error ? error.message : String(error)
  const old = previous.find(c => c?.id === id && Number.isFinite(c.value))
  if (old) return { ...old, stale: true, error: message }
  const meta = ICBR.find(c => c.id === id) ?? SOJA_SACA
  return { id, label: meta.label, unit: meta.unit ?? 'índice', nature: meta.nature ?? 'média mensal', sourceName: meta.sourceName ?? 'Banco Central', sourceUrl: id === SOJA_SACA.id ? PINK_PAGE_URL : sgsPage(meta.code), benchmark: meta.benchmark, value: null, period: null, releaseDate: null, checkedAt: null, stale: true, error: message, previousValue: null, previousPeriod: null, variationPct: null, variationBasis: 'mês anterior' }
}
