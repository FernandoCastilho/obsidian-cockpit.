// Official change tables: dates are effective dates, not invented daily observations.
export const POLICY_SOURCES = {
  FED: 'https://www.federalreserve.gov/monetarypolicy/openmarket.htm',
  ECB: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html',
  BOE: 'https://www.bankofengland.co.uk/boeapps/database/Bank-Rate.asp',
  BOJ: 'https://www.boj.or.jp/en/mopo/mpmdeci/index.htm',
}
const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
export function policyDate(day, month, year) {
  const m = months.indexOf(month.toLowerCase().slice(0, 3))
  const d = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return m >= 0 && new Date(`${d}T12:00:00Z`).toISOString().slice(0, 10) === d ? d : null
}
export const plain = html => html.replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, '').replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ').replace(/&minus;|&#8722;|−/g, '-').replace(/&ndash;|&mdash;|–|—/g, '-')
  .replace(/\s+/g, ' ').trim()
const cells = row => [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m => plain(m[1]))
const rows = html => [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => cells(m[1]))
const numeric = value => /^-?\d+(?:\.\d+)?$/.test(value) ? Number(value) : null
export function validPolicyPoint(p) {
  if (!p || !/^\d{4}-\d{2}-\d{2}$/.test(p.date || '') || !Number.isFinite(Date.parse(`${p.date}T12:00:00Z`))) return false
  if (new Date(`${p.date}T12:00:00Z`).toISOString().slice(0, 10) !== p.date) return false
  const scalar = Number.isFinite(p.value) && p.value >= -10 && p.value <= 100
  const range = Number.isFinite(p.lower) && Number.isFinite(p.upper) && p.lower >= -10 && p.upper <= 100 && p.lower <= p.upper
  return scalar || range
}
export function normalizePolicyPoints(points) {
  const map = new Map()
  for (const p of points) {
    if (!validPolicyPoint(p)) throw new Error('Ponto de política monetária inválido')
    const old = map.get(p.date)
    if (old && (old.value !== p.value || old.lower !== p.lower || old.upper !== p.upper)) throw new Error('Taxas conflitantes na mesma vigência')
    map.set(p.date, p)
  }
  if (!map.size) throw new Error('Nenhuma vigência reconhecida na fonte oficial')
  return [...map.values()].sort((a,b) => a.date.localeCompare(b.date))
}
export function parseFedPolicy(html) {
  if (!/target federal funds rate or range/i.test(plain(html))) throw new Error('Tabela Fed não reconhecida')
  const points = []
  for (const section of html.matchAll(/<h4\b[^>]*>\s*(20\d{2})\s*<\/h4>([\s\S]*?)(?=<h4\b|$)/gi)) {
    for (const c of rows(section[2])) {
      const md = /^(\w+) (\d{1,2})$/.exec(c[0] || '')
      const band = /^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/.exec(c[3] || '')
      if (!md || !band) continue
      const date = policyDate(Number(md[2]), md[1], Number(section[1]))
      if (date) points.push({ date, lower:Number(band[1]), upper:Number(band[2]), sourceUrl:POLICY_SOURCES.FED })
    }
  }
  return normalizePolicyPoints(points)
}
export function parseEcbPolicy(html) {
  if (!/Date \(with effect from\)/i.test(plain(html)) || !/Deposit facility/i.test(plain(html))) throw new Error('Tabela BCE não reconhecida')
  let year
  const points = []
  for (const c of rows(html)) {
    if (/^(19|20)\d{2}$/.test(c[0])) year = Number(c[0])
    const md = /^(\d{1,2})\s+(\w+)\.?$/.exec(c[1] || '')
    const value = numeric(c[2] || '')
    if (!year || !md || value == null) continue
    const date = policyDate(Number(md[1]), md[2], year)
    if (date) points.push({date,value,sourceUrl:POLICY_SOURCES.ECB})
  }
  return normalizePolicyPoints(points)
}
export function parseBoePolicy(html) {
  if (!/Official Bank Rate/i.test(plain(html)) || !/Date Changed/i.test(plain(html))) throw new Error('Tabela Bank Rate não reconhecida')
  const points = []
  for (const c of rows(html)) {
    const d = /^(\d{1,2}) (\w{3}) (\d{2}|\d{4})$/.exec(c[0] || '')
    const value = numeric(c[1] || '')
    if (!d || value == null) continue
    // Database history begins in 1975. Restrict to unambiguous recent history;
    // two-digit dates below 75 belong to 2000+, not hypothetical future decades.
    const y = d[3].length === 4 ? Number(d[3]) : Number(d[3]) >= 75 ? 1900 + Number(d[3]) : 2000 + Number(d[3])
    const date = policyDate(Number(d[1]),d[2],y)
    if (date) points.push({date,value,sourceUrl:POLICY_SOURCES.BOE})
  }
  return normalizePolicyPoints(points)
}
export function preservePolicySeries(previous, error) {
  const points = (previous?.points || []).filter(validPolicyPoint)
  return { ...(previous || {}), points, stale:true, error:String(error?.message || error), checkedAt:previous?.checkedAt ?? null }
}
