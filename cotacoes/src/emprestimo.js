import { resolveCreditIof } from './iofRules.js'
// Capital de giro (empréstimo em reais): parcela, juros totais e pagamento final (total pago) por Price, SAC ou Bullet.
// Estimativa com IOF automático; sem tarifas, seguros nem outros impostos.
export const SYSTEMS = [
  { id: 'price', label: 'Price', hint: 'parcelas iguais' },
  { id: 'sac', label: 'SAC', hint: 'amortização constante, parcelas decrescentes' },
  { id: 'bullet', label: 'Bullet', hint: 'juros capitalizados, pagamento único no vencimento' },
]

// Número em pt-BR ("1,5"), aceitando ponto como decimal apenas sem vírgula ("1.5"). Vazio ou lixo viram null.
export function parseDecimal(text) {
  const t = String(text ?? '').trim().replace('%', '').trim()
  if (!/^\d+(?:[.,]\d+)?$/.test(t)) return null
  const v = Number(t.replace(',', '.'))
  return Number.isFinite(v) ? v : null
}

// Taxa mensal efetiva: a.m. é usada como está; a.a. converte por juros compostos.
export const monthlyRate = (rate, unit) => (unit === 'aa' ? Math.expm1(Math.log1p(rate / 100) / 12) : unit === 'am' ? rate / 100 : NaN)

// Limite técnico conservador para valores apresentados em centavos, não regra comercial.
export const MAX_LOAN_MONEY = 1e12
const validMoney = value => Number.isFinite(value) && value >= 0 && value <= MAX_LOAN_MONEY
const numericError = () => ({ ok: false, missing: [], error: 'Resultado fora do limite numérico de precisão monetária (R$ 1 trilhão). Reduza o valor, a taxa ou o prazo.' })
function stableSum(values) {
  let sum = 0, correction = 0
  for (const value of values) {
    const adjusted = value - correction, next = sum + adjusted
    correction = (next - sum) - adjusted
    sum = next
  }
  return sum
}

// Referência geral; a aplicação calcula o enquadramento automaticamente.
export const IOF_PJ = { fixed: 0.38, daily: 0.0082, maxDays: 365 }

// value em R$, n = meses (inteiro), rate em % (a.m. ou a.a.), system 'price' | 'sac' | 'bullet'; iof = { fixed, daily } em %.
export function loan({ value, n, rate, unit = 'am', system, start, firstDue, profile = 'pj', eligible = false }) {
  const missing = []
  if (!Number.isFinite(value) || !(value > 0)) missing.push('valor')
  if (!Number.isInteger(n) || n < 1 || n > 600) missing.push('prazo (1 a 600 meses)')
  if (!Number.isFinite(rate) || rate < 0 || rate > 1000) missing.push('taxa')
  if (!['am', 'aa'].includes(unit)) missing.push('unidade da taxa (am ou aa)')
  if (!SYSTEMS.some((s) => s.id === system)) missing.push('sistema de amortização')
  if (missing.length) return { ok: false, missing }
  if (value > MAX_LOAN_MONEY) return numericError()
  const dates = loanDates(start, firstDue, n)
  if (!dates) return { ok: false, missing: ['datas'], error: 'Informe a liberação e o primeiro vencimento mensal posterior à liberação. Todo o calendário deve permanecer até 31/12/9999.' }
  const tax = resolveCreditIof({ date: start, profile, operationValue: value, eligible })
  if (!tax.ok) return { ok: false, missing: [], error: tax.error }
  const fixed = tax.additional, daily = tax.daily
  const i = monthlyRate(rate, unit)
  let installment, last = null, interest
  const log = Math.log1p(i), denominator = -Math.expm1(-n * log)
  if (system === 'price') {
    installment = i === 0 ? value / n : (value * i) / denominator
    // Somar juros sobre saldos evita cancelamento em PMT × n − principal quando i → 0.
    // A forma fechada do saldo também evita propagar arredondamento por até 600 meses.
    interest = stableSum(Array.from({ length: n }, (_, k) => i === 0 ? 0 : value * (-Math.expm1(-(n - k) * log) / denominator) * i))
  } else if (system === 'sac') {
    const amort = value / n
    installment = amort + value * i // 1ª parcela, a maior
    last = amort + amort * i
    interest = (i * value * (n + 1)) / 2
  } else {
    installment = null // sem parcelas periódicas
    interest = value * Math.expm1(n * log)
  }
  if (interest === 0) interest = 0 // Normaliza também uma entrada numérica -0.
  const total = value + interest
  if (![total, interest, installment ?? 0, last ?? 0].every(validMoney)) return numericError()
  // IOF: principal de cada parcela × dias até o vencimento × alíquota diária (dias limitados a 365) + adicional único sobre o valor.
  const dailyTerms = [], amortizations = []
  for (let k = 1; k <= n; k++) {
    const amort = k === n ? Math.max(0, value - stableSum(amortizations)) : system === 'bullet' ? 0 : system === 'sac' || i === 0 ? value / n : installment * Math.exp((k - 1 - n) * log)
    amortizations.push(amort)
    dailyTerms.push(amort * Math.min(dates[k - 1].days, tax.maxDays))
  }
  const dailyBase = stableSum(dailyTerms)
  const iofDaily = (dailyBase * daily) / 100, iofFixed = (value * fixed) / 100, iofTotal = iofDaily + iofFixed
  if (![iofDaily, iofFixed, iofTotal, total + iofTotal].every(validMoney)) return numericError()
  return { ok: true, tax, dates, system, n, monthly: i, installment, last, interest, iof: iofTotal, iofFixed, iofDaily, total: total + iofTotal }
}

// Comparação com os outros sistemas, com as mesmas condições: SAC ↔ Price; no Bullet, mostra Price e SAC.
export function compareSystems(params) {
  const selected = loan(params)
  if (!selected.ok) return { selected, others: [] }
  const ids = params.system === 'price' ? ['sac'] : params.system === 'sac' ? ['price'] : ['price', 'sac']
  return {
    selected,
    others: ids.map((system) => {
      const r = loan({ ...params, system })
      return { system, label: SYSTEMS.find((s) => s.id === system).label, result: r, totalDiff: r.total - selected.total, interestDiff: r.interest - selected.interest, iofDiff: r.iof - selected.iof }
    }).filter(({ result }) => result.ok),
  }
}

// UTC civil dates avoid DST shifts. Monthly anniversaries clamp to the month end.
export function loanDates(start, firstDue, n) {
  const parse = text => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text ?? '')) return null
    const d = new Date(`${text}T00:00:00Z`)
    return Number.isFinite(+d) && d.toISOString().slice(0, 10) === text ? d : null
  }
  const from = parse(start), first = parse(firstDue)
  if (!from || !first || first <= from || !Number.isInteger(n) || n < 1 || n > 600) return null
  const dates = []
  for (let k = 0; k < n; k++) {
    const absoluteMonth = first.getUTCFullYear() * 12 + first.getUTCMonth() + k
    const year = Math.floor(absoluteMonth / 12), monthIndex = absoluteMonth % 12
    if (year > 9999) return null
    const month = new Date(0)
    month.setUTCFullYear(year, monthIndex, 1)
    const end = new Date(month)
    end.setUTCMonth(monthIndex + 1, 0)
    const last = end.getUTCDate()
    month.setUTCDate(Math.min(first.getUTCDate(), last))
    dates.push({ date: month.toISOString().slice(0, 10), days: (month - from) / 86400000 })
  }
  return dates
}
