// Calendário econômico: junta o feed semanal do Forex Factory (mundo, com previsto/anterior) com calendários oficiais
// do BLS e do BEA (EUA) e as reuniões do FOMC (Fed). Brasil (Copom, IPCA, Focus) vem da agenda curada do app.
import { zonedToUtc } from '../src/agenda.js'

export const SOURCES = {
  ff: { name: 'Forex Factory', url: 'https://nfs.faireconomy.media/ff_calendar_thisweek.json' },
  bls: { name: 'BLS (calendário oficial)', url: 'https://www.bls.gov/schedule/news_release/bls.ics' },
  bea: { name: 'BEA (calendário oficial)', url: 'https://www.bea.gov/news/schedule/ics/online-calendar-subscription.ics' },
  fomc: { name: 'Federal Reserve (calendário oficial)', url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm' },
}

// Moeda do feed -> país (código ISO-2 para bandeira/filtro) e nome.
export const COUNTRY = {
  USD: { id: 'US', name: 'EUA', flag: 'USD' }, EUR: { id: 'EU', name: 'Zona do Euro', flag: 'EUR' }, GBP: { id: 'GB', name: 'Reino Unido', flag: 'GBP' },
  JPY: { id: 'JP', name: 'Japão', flag: 'JPY' }, CNY: { id: 'CN', name: 'China', flag: 'CNH' }, AUD: { id: 'AU', name: 'Austrália', flag: null },
  CAD: { id: 'CA', name: 'Canadá', flag: null }, CHF: { id: 'CH', name: 'Suíça', flag: null }, NZD: { id: 'NZ', name: 'Nova Zelândia', flag: null },
}

const IMPACT = { high: 'high', medium: 'medium', low: 'low', holiday: 'holiday' }
const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)

// Feed do Forex Factory: [{ title, country (moeda), date (ISO com deslocamento), impact, forecast, previous }]
export function parseFf(json) {
  if (!Array.isArray(json)) throw new Error('Forex Factory devolveu formato inesperado')
  const out = []
  for (const r of json) {
    const country = COUNTRY[r?.country]
    const t = Date.parse(r?.date)
    const impact = IMPACT[String(r?.impact ?? '').toLowerCase()]
    if (!country || !Number.isFinite(t) || !impact || !clean(r?.title)) continue
    out.push({ src: 'ff', country: country.id, currency: r.country, t, title: r.title.trim(), impact, forecast: clean(r.forecast), previous: clean(r.previous), actual: null })
  }
  if (!out.length) throw new Error('Forex Factory sem eventos válidos')
  return out.sort((a, b) => a.t - b.t || a.title.localeCompare(b.title))
}

const unfold = (text) => String(text).replace(/\r?\n[ \t]/g, '')
function vevents(text) {
  return [...unfold(text).matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/g)].map((m) => {
    const body = m[1]
    const field = (name) => new RegExp(`^${name}([^:\\n]*):(.*)$`, 'm').exec(body)
    const dt = field('DTSTART'), summary = field('SUMMARY')
    return { dtParams: dt?.[1] ?? '', dt: dt?.[2]?.trim(), summary: summary?.[2]?.trim().replace(/\\,/g, ',').replace(/;/g, ';') }
  })
}

// Divulgações do BLS que movem mercado, com rótulo em português e impacto.
const BLS_KEEP = [
  [/^Employment Situation$/, 'Payroll e taxa de desemprego (EUA)', 'high'],
  [/^Consumer Price Index$/, 'CPI: inflação ao consumidor (EUA)', 'high'],
  [/^Producer Price Index$/, 'PPI: inflação ao produtor (EUA)', 'medium'],
  [/^Employment Cost Index$/, 'Custo de emprego, ECI (EUA)', 'medium'],
  [/^Job Openings and Labor Turnover Survey$/, 'JOLTS: vagas abertas (EUA)', 'medium'],
  [/^U\.S\. Import and Export Price Indexes$/, 'Preços de importação e exportação (EUA)', 'low'],
  [/^Productivity and Costs$/, 'Produtividade e custos do trabalho (EUA)', 'low'],
  [/^Real Earnings$/, 'Rendimentos reais (EUA)', 'low'],
]
export function parseBls(ics) {
  const out = []
  for (const e of vevents(ics)) {
    const keep = BLS_KEEP.find(([re]) => re.test(e.summary ?? ''))
    const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/.exec(e.dt ?? '')
    if (!keep || !m) continue
    const t = zonedToUtc(`${m[1]}-${m[2]}-${m[3]}`, `${m[4]}:${m[5]}`, 'America/New_York')
    out.push({ src: 'bls', country: 'US', currency: 'USD', t, title: keep[1], impact: keep[2], forecast: null, previous: null, actual: null })
  }
  if (!out.length) throw new Error('Calendário do BLS sem divulgações reconhecidas')
  return out.sort((a, b) => a.t - b.t)
}

const BEA_KEEP = [
  [/^GDP \(Advance Estimate\)/, 'PIB do trimestre, 1ª estimativa (EUA)', 'high'],
  [/^GDP \(Second Estimate\)/, 'PIB do trimestre, 2ª estimativa (EUA)', 'medium'],
  [/^GDP \(Third Estimate\)/, 'PIB do trimestre, 3ª estimativa (EUA)', 'medium'],
  [/^Personal Income and Outlays/, 'PCE: renda e consumo pessoal (EUA)', 'high'],
  [/^U\.S\. International Trade in Goods and Services/, 'Balança comercial (EUA)', 'medium'],
]
export function parseBea(ics) {
  const out = []
  for (const e of vevents(ics)) {
    const keep = BEA_KEEP.find(([re]) => re.test(e.summary ?? ''))
    const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?Z$/.exec(e.dt ?? '')
    if (!keep || !m) continue
    out.push({ src: 'bea', country: 'US', currency: 'USD', t: Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]), title: keep[1], impact: keep[2], forecast: null, previous: null, actual: null })
  }
  if (!out.length) throw new Error('Calendário do BEA sem divulgações reconhecidas')
  return out.sort((a, b) => a.t - b.t)
}

const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12, jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
// Página do Fed: "2026 FOMC Meetings" seguido de linhas com mês e dias ("27-28"); a decisão sai no último dia, 14h (Nova York).
export function parseFomc(html) {
  const text = String(html)
  const out = []
  const headings = [...text.matchAll(/(\d{4}) FOMC Meetings/g)]
  headings.forEach((h, i) => {
    const year = Number(h[1])
    const chunk = text.slice(h.index, headings[i + 1]?.index ?? text.length)
    for (const row of chunk.matchAll(/fomc-meeting__month[^>]*>\s*<strong>([^<]+)<\/strong>[\s\S]*?fomc-meeting__date[^>]*>\s*([^<]+?)\s*</g)) {
      const months = row[1].trim().toLowerCase().split('/').map((s) => MONTHS[s.trim()])
      const dayText = row[2].replace(/\*/g, '').trim()
      const days = dayText.match(/\d{1,2}/g)
      if (!months.every(Boolean) || !days?.length) continue
      const month = months.at(-1), day = Number(days.at(-1))
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      out.push({ src: 'fomc', country: 'US', currency: 'USD', t: zonedToUtc(date, '14:00', 'America/New_York'), title: 'FOMC: decisão de juros do Fed', impact: 'high', forecast: null, previous: null, actual: null })
    }
  })
  if (!out.length) throw new Error('Página do Fed sem reuniões reconhecidas')
  return out.sort((a, b) => a.t - b.t)
}

// Janela do arquivo: um dia antes até 60 dias à frente.
export function withinWindow(events, now = Date.now(), back = 864e5, ahead = 60 * 864e5) {
  return events.filter((e) => e.t >= now - back && e.t <= now + ahead)
}

// Junta as fontes; quando uma falha, reaproveita os eventos dela do arquivo anterior e marca `stale`.
export function buildCalendar(results, previous, now = Date.now()) {
  const stale = {}, sources = {}, events = []
  for (const key of Object.keys(SOURCES)) {
    const r = results[key]
    if (r?.events) {
      sources[key] = { ok: true, n: r.events.length, checkedAt: now }
      events.push(...r.events)
    } else {
      stale[key] = previous?.stale?.[key] ?? previous?.sources?.[key]?.checkedAt ?? previous?.generatedAt ?? null
      sources[key] = { ok: false, n: 0, checkedAt: previous?.sources?.[key]?.checkedAt ?? null, error: r?.error ?? 'indisponível' }
      events.push(...(previous?.events ?? []).filter((e) => e.src === key))
    }
  }
  const dedup = new Map()
  for (const e of withinWindow(events, now)) dedup.set(`${e.src}|${e.t}|${e.title}|${e.country}`, e)
  const list = [...dedup.values()].sort((a, b) => a.t - b.t || a.title.localeCompare(b.title))
  return { schemaVersion: 1, generatedAt: now, sources, stale, events: list }
}
