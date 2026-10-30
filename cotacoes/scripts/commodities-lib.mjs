export const WTI_URL = 'https://www.eia.gov/dnav/pet/hist/RWTCD.htm'
export const PINK_PAGE_URL = 'https://www.worldbank.org/en/research/commodity-markets'
export const COMMODITIES = [
  { id: 'wti', label: 'Petróleo WTI', unit: 'USD/barril', nature: 'spot diário', sourceName: 'EIA', sourceUrl: WTI_URL, benchmark: 'Cushing, Oklahoma • FOB' },
  { id: 'iron-ore', label: 'Minério de ferro', unit: 'USD/tonelada seca', nature: 'média mensal', sourceName: 'Banco Mundial • Pink Sheet', sourceUrl: PINK_PAGE_URL, benchmark: '62% Fe • CFR China • spot' },
  { id: 'soybeans', label: 'Soja', unit: 'USD/tonelada', nature: 'média mensal', sourceName: 'Banco Mundial • Pink Sheet', sourceUrl: PINK_PAGE_URL, benchmark: 'FOB US Gulf' },
  { id: 'corn', label: 'Milho', unit: 'USD/tonelada', nature: 'média mensal', sourceName: 'Banco Mundial • Pink Sheet', sourceUrl: PINK_PAGE_URL, benchmark: 'FOB US Gulf' },
  { id: 'gold', label: 'Ouro', unit: 'USD/onça troy', nature: 'média mensal', sourceName: 'Banco Mundial • Pink Sheet', sourceUrl: PINK_PAGE_URL, benchmark: 'Spot • média mensal' },
]
export const HISTORY_DAILY = 1500
export const HISTORY_MONTHS = 240
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const positive = v => Number.isFinite(v) && v > 0
const isoDay = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s

export function discoverPinkSheetUrl(html) {
  const links = [...html.matchAll(/href\s*=\s*["']([^"']+CMO-Historical-Data-Monthly\.xlsx(?:\?[^"']*)?)["']/gi)]
  for (const [, link] of links) {
    const url = new URL(link.replace(/&amp;/g, '&'), PINK_PAGE_URL)
    if (url.protocol === 'https:' && url.hostname === 'thedocs.worldbank.org') return url.href
  }
  throw new Error('Banco Mundial: link XLSX mensal oficial não encontrado')
}

function item(meta, latest, previous, releaseDate, sourceUrl, now) {
  const checkedAt = now.toISOString()
  if (!isoDay(releaseDate) || releaseDate > checkedAt.slice(0,10) || latest.period > releaseDate) throw new Error('Fonte: datas futuras ou inconsistentes')
  return { ...meta, value: latest.value, period: latest.period, releaseDate, sourceUrl, checkedAt, stale: false, error: null,
    previousValue: previous?.value ?? null, previousPeriod: previous?.period ?? null,
    variationPct: previous ? (latest.value - previous.value) / Math.abs(previous.value) * 100 : null,
    variationBasis: meta.id === 'wti' ? 'observação diária anterior' : 'mês anterior' }
}

export function buildWti(html, now = new Date()) {
  const title = /Cushing, OK WTI Spot Price FOB\s*\(Dollars per Barrel\)/i
  if (!title.test(html.replace(/<[^>]*>/g, ''))) throw new Error('EIA: série WTI/unidade inesperada')
  const clean = s => s.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/gi, ' ').trim()
  const points = []
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m => clean(m[1]))
    const date = cells[0]?.match(/^(\d{4})\s+([A-Za-z]{3})-\s*(\d{1,2})\s+to\s+/)
    if (!date || cells.length !== 6) continue
    const month = MONTHS.findIndex(m => m.slice(0,3) === date[2])
    const monday = new Date(Date.UTC(+date[1], month, +date[3]))
    if (month < 0 || monday.getUTCDay() !== 1 || monday.getUTCMonth() !== month) throw new Error('EIA: semana WTI inválida')
    for (let i=1; i<=5; i++) {
      if (['', '-', '--', 'NA', 'W'].includes(cells[i])) continue
      // Negative WTI prices are legitimate (notably April 2020), not missing data.
      if (!/^-?\d+(?:\.\d+)?$/.test(cells[i]) || !Number.isFinite(Number(cells[i]))) throw new Error('EIA: preço WTI inválido')
      const day = new Date(monday); day.setUTCDate(day.getUTCDate() + i - 1)
      points.push({ period: day.toISOString().slice(0,10), value: Number(cells[i]) })
    }
  }
  points.sort((a,b) => a.period.localeCompare(b.period))
  if (!points.length || new Set(points.map(p => p.period)).size !== points.length) throw new Error('EIA: datas WTI ausentes/duplicadas')
  const readDate = label => {
    const match = html.match(new RegExp(`(?:^|>)\\s*${label}:\\s*(\\d{1,2})/(\\d{1,2})/(\\d{4})`, 'i'))
    const date = match ? `${match[3]}-${match[1].padStart(2,'0')}-${match[2].padStart(2,'0')}` : null
    if (!isoDay(date)) throw new Error(`EIA: ${label} inválida`)
    return date
  }
  const releaseDate = readDate('Release Date'), nextReleaseDate = readDate('Next Release Date')
  if (nextReleaseDate < releaseDate) throw new Error('EIA: próxima publicação WTI inválida')
  // Missing cells are skipped, never coerced to zero. Zero prices also have no percentage base.
  const previous = points.at(-2)?.value !== 0 ? points.at(-2) : null
  // Série diária para o gráfico (últimos ~6 anos); célula sem dado nunca vira zero.
  return { ...item(COMMODITIES[0], points.at(-1), previous, releaseDate, WTI_URL, now), nextReleaseDate, history: points.slice(-HISTORY_DAILY) }
}

export function parsePinkRows(rows, sourceUrl, now = new Date()) {
  if (!Array.isArray(rows)) throw new Error('Banco Mundial: tabela inválida')
  const text = rows.slice(0,10).flatMap(Object.values).join(' ')
  if (!/World Bank Commodity Price Data/.test(text) || !/monthly prices in nominal US dollars/i.test(text)) throw new Error('Banco Mundial: planilha/série inesperada')
  const updated = text.match(/Updated on ([A-Za-z]+) (\d{1,2}), (\d{4})/)
  const month = updated ? MONTHS.indexOf(updated[1]) + 1 : 0
  if (!month) throw new Error('Banco Mundial: data de publicação ausente')
  const releaseDate = `${updated[3]}-${String(month).padStart(2,'0')}-${updated[2].padStart(2,'0')}`
  const headerIndex = rows.findIndex(r => Object.values(r).includes('Soybeans'))
  const header = rows[headerIndex], units = rows[headerIndex + 1]
  if (!header || !units) throw new Error('Banco Mundial: cabeçalho ausente')
  const definitions = [ ['Iron ore, cfr spot', ['($/dmtu)', '($/dmt)']], ['Soybeans', ['($/mt)']], ['Maize', ['($/mt)']], ['Gold', ['($/troy oz)']] ]
  const dated = rows.filter(r => /^\d{4}M(?:0[1-9]|1[0-2])$/.test(r.A ?? '')).sort((a,b) => a.A.localeCompare(b.A))
  if (!dated.length || new Set(dated.map(r => r.A)).size !== dated.length) throw new Error('Banco Mundial: competências ausentes/duplicadas')
  return definitions.map(([name, allowedUnits], i) => {
    const column = Object.keys(header).find(k => header[k].trim() === name)
    if (!column || !allowedUnits.includes(units[column]?.trim())) throw new Error(`Banco Mundial: série/unidade inesperada: ${name}`)
    const point = row => {
      const raw = row?.[column]?.trim()
      const value = raw && /^\d+(?:\.\d+)?(?:E[+-]?\d+)?$/i.test(raw) ? Number(raw) : NaN
      if (!positive(value)) throw new Error(`Banco Mundial: último valor ausente/inválido: ${name}`)
      return { period: row.A.replace('M','-'), value }
    }
    const latest = point(dated.at(-1))
    // Modern iron-ore spot observations are USD/dry tonne, despite the legacy XLSX dmtu header.
    if (i === 0 && latest.period < '2008-12') throw new Error('Banco Mundial: minério em unidade histórica incompatível')
    let previous = null
    if (dated.length > 1) { try { previous = point(dated.at(-2)) } catch { /* ignora */ } }
    if (previous) {
      const priorMonth = new Date(`${latest.period}-01T00:00:00Z`); priorMonth.setUTCMonth(priorMonth.getUTCMonth() - 1)
      if (previous.period !== priorMonth.toISOString().slice(0,7)) previous = null
    }
    // Série mensal para o gráfico (últimos 20 anos); mês sem valor válido fica de fora, nunca vira zero.
    const history = []
    for (const row of dated.slice(-HISTORY_MONTHS)) { try { history.push(point(row)) } catch { /* ignora */ } }
    return { ...item(COMMODITIES[i+1], latest, previous, releaseDate, sourceUrl, now), history }
  })
}

export function validCommodity(value, id) {
  const meta = COMMODITIES.find(c => c.id === id)
  if (!meta || value?.id !== id || value.unit !== meta.unit || value.nature !== meta.nature || !(id === 'wti' ? Number.isFinite(value.value) : positive(value.value))) return false
  if (!(id === 'wti' ? isoDay(value.period) : /^\d{4}-(?:0[1-9]|1[0-2])$/.test(value.period ?? ''))) return false
  if (!isoDay(value.releaseDate) || value.period > value.releaseDate || !Number.isFinite(Date.parse(value.checkedAt))) return false
  try { const url = new URL(value.sourceUrl); return url.protocol === 'https:' && (id === 'wti' ? url.href === WTI_URL : url.hostname === 'thedocs.worldbank.org') } catch { return false }
}

export function commodityFallback(id, candidates, error) {
  const previous = candidates.filter(v => validCommodity(v, id)).sort((a,b) => b.period.localeCompare(a.period) || b.checkedAt.localeCompare(a.checkedAt))[0]
  const message = error instanceof Error ? error.message : String(error)
  if (previous) return { ...previous, stale: true, error: message }
  return { ...COMMODITIES.find(c => c.id === id), value: null, period: null, releaseDate: null, checkedAt: null, stale: true, error: message, previousValue: null, previousPeriod: null, variationPct: null, variationBasis: id === 'wti' ? 'observação diária anterior' : 'mês anterior' }
}
