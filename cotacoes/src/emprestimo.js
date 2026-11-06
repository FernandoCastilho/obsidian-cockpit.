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
export const monthlyRate = (rate, unit) => (unit === 'aa' ? Math.expm1(Math.log1p(rate / 100) / 12) : rate / 100)

// Referência geral; a aplicação calcula o enquadramento automaticamente.
export const IOF_PJ = { fixed: 0.38, daily: 0.0082, maxDays: 365 }

// value em R$, n = meses (inteiro), rate em % (a.m. ou a.a.), system 'price' | 'sac' | 'bullet'; iof = { fixed, daily } em %.
export function loan({ value, n, rate, unit = 'am', system, start, firstDue, profile = 'pj', eligible = false }) {
  const missing = []
  if (!Number.isFinite(value) || !(value > 0)) missing.push('valor')
  if (!Number.isInteger(n) || n < 1 || n > 600) missing.push('prazo (1 a 600 meses)')
  if (!Number.isFinite(rate) || rate < 0 || rate > 1000) missing.push('taxa')
  if (!SYSTEMS.some((s) => s.id === system)) missing.push('sistema de amortização')
  if (missing.length) return { ok: false, missing }
  const dates = loanDates(start, firstDue, n)
  if (!dates) return { ok: false, missing: ['datas'], error: 'Informe a liberação e o primeiro vencimento mensal posterior à liberação.' }
  const tax = resolveCreditIof({ date: start, profile, operationValue: value, eligible })
  if (!tax.ok) return { ok: false, missing: [], error: tax.error }
  const fixed = tax.additional, daily = tax.daily
  const i = monthlyRate(rate, unit)
  let installment, last = null, total
  if (system === 'price') {
    installment = i === 0 ? value / n : (value * i) / -Math.expm1(-n * Math.log1p(i))
    total = installment * n
  } else if (system === 'sac') {
    const amort = value / n
    installment = amort + value * i // 1ª parcela, a maior
    last = amort + amort * i
    total = value + (i * value * (n + 1)) / 2
  } else {
    installment = null // sem parcelas periódicas
    total = value + value * Math.expm1(n * Math.log1p(i))
  }
  if (![i, total, installment ?? 0, last ?? 0].every(Number.isFinite)) return { ok: false, missing: [], error: 'Resultado fora do limite numérico. Reduza o valor, a taxa ou o prazo.' }
  // IOF: principal de cada parcela × dias até o vencimento × alíquota diária (dias limitados a 365) + adicional único sobre o valor.
  let dailyBase = 0
  for (let k = 1; k <= n; k++) {
    const amort = system === 'bullet' ? (k === n ? value : 0) : system === 'sac' || i === 0 ? value / n : value * i * Math.exp((k - 1 - n) * Math.log1p(i)) / -Math.expm1(-n * Math.log1p(i))
    dailyBase += amort * Math.min(dates[k - 1].days, tax.maxDays)
  }
  const iofDaily = (dailyBase * daily) / 100, iofFixed = (value * fixed) / 100, iofTotal = iofDaily + iofFixed
  if (![iofDaily, iofFixed, iofTotal, total + iofTotal].every(Number.isFinite)) return { ok: false, missing: [], error: 'Resultado fora do limite numérico. Reduza o valor, a taxa ou o prazo.' }
  return { ok: true, tax, dates, system, n, monthly: i, installment, last, interest: total - value, iof: iofTotal, iofFixed, iofDaily, total: total + iofTotal }
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
    }),
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
    const month = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + k, 1))
    const last = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate()
    month.setUTCDate(Math.min(first.getUTCDate(), last))
    dates.push({ date: month.toISOString().slice(0, 10), days: (month - from) / 86400000 })
  }
  return dates
}
