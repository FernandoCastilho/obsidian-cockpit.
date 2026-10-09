// Funções puras da coleta das curvas de juros (B3 DI x pré e US Treasury).
export const B3 = 'https://sistemaswebb3-derivativos.b3.com.br/referenceRatesProxy/Search'
export const b3Url = (route, params) => `${B3}/${route}/${Buffer.from(JSON.stringify(params)).toString('base64')}`

// Comparações: hoje e quanto tempo atrás (dias corridos).
export const OFFSETS = [
  { id: 'hoje', label: 'Último dia', days: 0 },
  { id: 'd1', label: '1 dia', days: 1 },
  { id: 'w1', label: '1 semana', days: 7 },
  { id: 'm1', label: '1 mês', days: 30 },
  { id: 'm3', label: '3 meses', days: 91 },
  { id: 'm6', label: '6 meses', days: 182 },
  { id: 'y1', label: '1 ano', days: 365 },
]

const iso = (s) => String(s).slice(0, 10)

// Para cada comparação, a data disponível mais recente que não passa da data-alvo.
export function pickDates(available, offsets = OFFSETS) {
  const days = [...new Set(available.map(iso))].sort().reverse()
  if (!days.length) return []
  const top = new Date(days[0] + 'T12:00:00Z').getTime()
  const out = []
  for (const o of offsets) {
    const target = new Date(top - o.days * 864e5).toISOString().slice(0, 10)
    const date = days.find((d) => d <= target)
    if (date && !out.some((x) => x.date === date)) out.push({ ...o, date })
  }
  return out
}

const num = (s) => Number(String(s).replace('.', '').replace(',', '.'))

// Resposta de GetList da B3 -> [[anos úteis (252), taxa % a.a.]]
export function parseB3(rows) {
  return (rows ?? [])
    .map((r) => [Number(r.day252), num(r.rate)])
    .filter(([d, v]) => Number.isFinite(d) && Number.isFinite(v) && d > 0)
    .sort((a, b) => a[0] - b[0])
}

const TENOR = { Mo: 1 / 12, Yr: 1 }
// CSV do Tesouro dos EUA (daily_treasury_yield_curve) -> { 'AAAA-MM-DD': [[anos, taxa], ...] }
export function parseTreasury(csv) {
  const lines = String(csv).trim().split(/\r?\n/)
  const head = lines.shift().split(',').map((s) => s.replace(/"/g, '').trim())
  const cols = head
    .map((h, i) => {
      const m = h.match(/^(\d+)\s*(Mo|Yr)$/)
      return m ? { i, years: Number(m[1]) * TENOR[m[2]], label: h } : null
    })
    .filter(Boolean)
  const out = {}
  for (const line of lines) {
    const c = line.split(',').map((s) => s.replace(/"/g, '').trim())
    const m = c[0].match(/^(\d\d)\/(\d\d)\/(\d{4})$/)
    if (!m) continue
    const pts = cols.filter((k) => c[k.i] !== '' && Number.isFinite(Number(c[k.i]))).map((k) => [k.years, Number(c[k.i]), k.label])
    if (pts.length) out[`${m[3]}-${m[1]}-${m[2]}`] = pts
  }
  return out
}
