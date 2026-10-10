// FINIMP, fase 1: simulação de juros e cronograma na moeda original. Taxa informada manualmente; nada é buscado nem inferido.
// Resultado é estimativa/simulação: não é CET regulatório nem declaração de conformidade.
const DAY = 864e5
const day = (iso) => Date.parse(`${iso}T00:00:00Z`)
export const daysBetween = (a, b) => Math.round((day(b) - day(a)) / DAY)
const BASE = { 'ACT/360': 360, 'ACT/365F': 365 }
const EPS = 1e-6
const r2 = (v, dec) => Math.round((v + Number.EPSILON) * 10 ** dec) / 10 ** dec
export const DECIMALS = { USD: 2, EUR: 2, JPY: 0 }

const validDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(day(s))

// input: { currency, disb:[{date, amount}], structure:'bullet'|'periodic'|'amort', maturity, interestDates:[iso],
//          amort:[{date, kind:'value'|'pct', amount}], rate (% a.a.), rule:'prop'|'comp', dayCount:'ACT/360'|'ACT/365F', round:boolean }
export function simulate(input) {
  const { currency = 'USD', structure, rate, rule, dayCount } = input
  const dec = DECIMALS[currency] ?? 2
  const missing = []
  const errors = []

  const disb = (input.disb ?? []).filter((d) => d.date || d.amount !== '' || d.amount != null).map((d) => ({ date: d.date, amount: Number(d.amount) }))
  const good = disb.filter((d) => validDate(d.date) && d.amount > 0)
  if (!good.length) missing.push('pelo menos um desembolso (data e valor)')
  else if (good.length !== disb.length) missing.push('desembolso incompleto (data e valor maiores que zero)')
  if (!structure) missing.push('estrutura de pagamento')
  if (!(Number.isFinite(rate) && rate >= 0)) missing.push('taxa final (% a.a.)')
  if (!rule) missing.push('regra de juros (proporcional ou composta)')
  if (!dayCount) missing.push('convenção de contagem de dias (ACT/360 ou ACT/365F)')
  else if (!BASE[dayCount]) errors.push(`Convenção não suportada: ${dayCount}`)

  let maturity = input.maturity
  let principalPays = []
  const interestSet = new Set()
  const total = good.reduce((s, d) => s + d.amount, 0)
  if (structure === 'amort') {
    const am = (input.amort ?? []).filter((a) => a.date || a.amount !== '')
    const ok = am.filter((a) => validDate(a.date) && Number(a.amount) > 0)
    if (!ok.length) missing.push('amortizações (data e valor ou percentual)')
    else if (ok.length !== am.length) missing.push('amortização incompleta')
    principalPays = ok.map((a) => ({ date: a.date, amount: a.kind === 'pct' ? (Number(a.amount) / 100) * total : Number(a.amount) }))
    if (ok.length) maturity = ok.map((a) => a.date).sort().at(-1)
    for (const p of principalPays) interestSet.add(p.date)
  } else if (structure) {
    if (!validDate(maturity)) missing.push('vencimento')
    else {
      principalPays = [{ date: maturity, amount: total }]
      interestSet.add(maturity)
    }
    if (structure === 'periodic') for (const d of input.interestDates ?? []) if (validDate(d)) interestSet.add(d)
  }
  if (missing.length) return { ok: false, missing, errors }

  const first = good.map((d) => d.date).sort()[0]
  if (maturity <= first) errors.push('O vencimento deve ser posterior ao primeiro desembolso.')
  if (good.some((d) => d.date >= maturity)) errors.push('Há desembolso na data do vencimento ou depois dele.')
  for (const d of interestSet) if (d < first || d > maturity) errors.push(`Data de juros fora do prazo: ${d}.`)
  if (structure === 'amort') {
    const sum = principalPays.reduce((s, p) => s + p.amount, 0)
    if (Math.abs(sum - total) > 0.005) errors.push(`A soma das amortizações (${r2(sum, 4)}) difere do principal desembolsado (${r2(total, 4)}).`)
  }
  if (errors.length) return { ok: false, missing, errors }

  const base = BASE[dayCount]
  const q = rate / 100
  const dates = [...new Set([...good.map((d) => d.date), ...principalPays.map((p) => p.date), ...interestSet])].sort()
  const rows = []
  const memo = []
  let S = 0
  let periodStart = first
  let accrued = 0
  let prev = first
  for (const t of dates) {
    // 1) juros do trecho prev -> t sobre o saldo vigente (sem capitalizar: ficam acumulados até a data de pagamento)
    let seg = 0
    if (t > prev && S > EPS) {
      const days = daysBetween(prev, t)
      const f0 = daysBetween(periodStart, prev) / base
      const f1 = daysBetween(periodStart, t) / base
      seg = rule === 'comp' ? S * ((1 + q) ** f1 - (1 + q) ** f0) : S * q * (f1 - f0)
      memo.push({ from: prev, to: t, days, balance: S, f0, f1, interest: seg, formula: rule === 'comp' ? 'S × [(1+i)^f₁ − (1+i)^f₀]' : 'S × i × (f₁ − f₀)' })
    }
    accrued += seg
    const opening = S
    const dis = good.filter((d) => d.date === t).reduce((s, d) => s + d.amount, 0)
    // 2) paga juros acumulados, se for data de pagamento
    let paidInterest = 0
    if (interestSet.has(t)) {
      paidInterest = input.round ? r2(accrued, dec) : accrued
      accrued = 0
      periodStart = t
    }
    // 3) movimenta o principal: desembolsos entram e amortizações saem na mesma data
    const am = principalPays.filter((p) => p.date === t).reduce((s, p) => s + p.amount, 0)
    S = S + dis - am
    if (S < -0.005) return { ok: false, missing: [], errors: [`Saldo negativo em ${t}: as amortizações superam o principal em aberto.`] }
    if (Math.abs(S) <= 0.005) S = 0
    rows.push({ date: t, opening, disbursement: dis, accrued: seg, interestPaid: paidInterest, amortization: am, closing: S, payment: paidInterest + am, flow: dis - paidInterest - am, pendingInterest: accrued })
    prev = t
  }

  const sum = (k) => rows.reduce((s, r) => s + r[k], 0)
  const totals = { disbursed: sum('disbursement'), amortized: sum('amortization'), interest: sum('interestPaid'), paid: sum('payment') }
  const checks = [
    { label: 'Saldo final de principal igual a zero', ok: Math.abs(S) < 0.005 },
    { label: 'Desembolsos − amortizações = saldo final', ok: Math.abs(totals.disbursed - totals.amortized - S) < 0.005 },
    { label: 'Nenhum juro acumulado sem pagamento no fim', ok: Math.abs(accrued) < 0.005 },
    { label: 'Juros acumulados nos trechos = juros pagos', ok: input.round ? true : Math.abs(sum('accrued') - totals.interest) < 0.005 },
  ]
  return { ok: true, missing: [], errors: [], currency, dec, base, rows, memo, totals, checks, maturity, first }
}

// Cronograma em texto separado por tabulação, para colar no Excel.
export function toTsv(res) {
  const n = (v) => v.toFixed(res.dec).replace('.', ',')
  const head = ['Data', 'Saldo inicial', 'Desembolso', 'Juros do trecho', 'Juros pagos', 'Amortização', 'Saldo final', 'Fluxo (tomador)']
  return [head, ...res.rows.map((r) => [r.date.split('-').reverse().join('/'), n(r.opening), n(r.disbursement), n(r.accrued), n(r.interestPaid), n(r.amortization), n(r.closing), n(r.flow)])].map((l) => l.join('\t')).join('\n')
}
