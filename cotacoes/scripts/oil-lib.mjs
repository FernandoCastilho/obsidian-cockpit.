// EIA Brent spot: HTML público, sem chave e sem converter ausência em zero.
export const OIL_SOURCE_URL = 'https://www.eia.gov/dnav/pet/hist/RBRTED.htm'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const clean = (s) => s.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/gi, ' ').trim()
const iso = (year, month, day) => new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10)
const metadata = { benchmark: 'Brent', kind: 'spot', unit: 'USD/barril', sourceName: 'U.S. Energy Information Administration (EIA)', sourceURL: OIL_SOURCE_URL }

function releaseDate(html, label) {
  const match = html.match(new RegExp(`(?:^|>)\\s*${label}:\\s*(\\d{1,2})/(\\d{1,2})/(\\d{4})`, 'i'))
  if (!match) throw new Error(`EIA: ${label} ausente`)
  const [, m, d, y] = match
  const value = iso(+y, +m - 1, +d)
  if (value !== `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`) throw new Error(`EIA: ${label} inválida`)
  return value
}

export function parseOilHtml(html) {
  if (!/Europe Brent Spot Price FOB\s*\(Dollars per Barrel\)/i.test(clean(html))) throw new Error('EIA: série/unidade inesperada')
  const points = []
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => clean(m[1]))
    const match = cells[0]?.match(/^(\d{4})\s+([A-Za-z]{3})-\s*(\d{1,2})\s+to\s+/)
    if (!match || cells.length !== 6) continue
    const [, year, monthName, day] = match
    const month = MONTHS.indexOf(monthName)
    if (month < 0) throw new Error('EIA: mês inválido')
    const monday = new Date(Date.UTC(+year, month, +day))
    if (monday.getUTCDay() !== 1 || monday.getUTCMonth() !== month) throw new Error('EIA: início de semana inválido')
    for (let i = 1; i <= 5; i++) {
      if (['', '-', '--', 'NA', 'W'].includes(cells[i])) continue
      if (!/^\d+(?:\.\d+)?$/.test(cells[i]) || Number(cells[i]) <= 0) throw new Error('EIA: preço inválido')
      points.push({ date: iso(+year, month, +day + i - 1), value: Number(cells[i]) })
    }
  }
  if (!points.length) throw new Error('EIA: nenhuma observação válida')
  points.sort((a, b) => a.date.localeCompare(b.date))
  if (new Set(points.map((p) => p.date)).size !== points.length) throw new Error('EIA: datas duplicadas')
  const released = releaseDate(html, 'Release Date')
  const nextReleaseDate = releaseDate(html, 'Next Release Date')
  if (points.at(-1).date > released || nextReleaseDate < released) throw new Error('EIA: datas de publicação inconsistentes')
  return { points, releaseDate: released, nextReleaseDate }
}

export function buildOilData(parsed, now = new Date()) {
  const latest = parsed.points.at(-1)
  const generatedAt = now.toISOString()
  if (latest.date > generatedAt.slice(0, 10) || parsed.releaseDate > generatedAt.slice(0, 10)) throw new Error('EIA: dados com data futura')
  return { ...metadata, observationDate: latest.date, value: latest.value, releaseDate: parsed.releaseDate, nextReleaseDate: parsed.nextReleaseDate, generatedAt, points: parsed.points.slice(-400), stale: false, error: null }
}

export function isValidOilData(value) {
  const last = Array.isArray(value?.points) ? value.points.at(-1) : null
  return value?.benchmark === 'Brent' && value.kind === 'spot' && value.unit === 'USD/barril' && value.sourceURL === OIL_SOURCE_URL && Number.isFinite(value.value) && value.value > 0 && /^\d{4}-\d{2}-\d{2}$/.test(value.observationDate) && value.generatedAt && Number.isFinite(Date.parse(value.generatedAt)) && last?.date === value.observationDate && last?.value === value.value
}

export function oilFallback(previous, error) {
  const message = error instanceof Error ? error.message : String(error)
  if (isValidOilData(previous)) return { ...previous, stale: true, error: message }
  return { ...metadata, observationDate: null, value: null, releaseDate: null, nextReleaseDate: null, generatedAt: null, points: [], stale: true, error: message }
}
