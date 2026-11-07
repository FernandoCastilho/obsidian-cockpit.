import { cgDate, cgToday } from './contaGarantida.js'
import { IOF_SOURCE, resolveCreditIof } from './iofRules.js'
import { parseMoneyInput } from './moneyInput.js'

const DAY = 86400000
const MAX_MONEY = 1e12
// Below 2^45, adjacent binary64 values remain less than half a cent apart.
// Larger totals cannot retain a useful cent-level error budget.
export const ALONGAMENTO_MAX_PRECISE_TOTAL = 2 ** 45
const MAX_TOTAL = Number.MAX_SAFE_INTEGER / 100
export const ALONGAMENTO_SOURCES = [
  { label: 'Decreto 6.306/2007, art. 7º', url: IOF_SOURCE },
  { label: 'IN RFB 1.969/2020', url: 'https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=111336' },
]
const finiteMoney = n => Number.isFinite(n) && n >= 0 && n <= MAX_MONEY
const fail = error => ({ ok: false, error })
// Compensated sums preserve cents across long schedules; normalize exact zero.
const sum = values => {
  let total = 0, correction = 0
  for (const value of values) {
    const adjusted = value - correction
    const next = total + adjusted
    correction = (next - total) - adjusted
    total = next
  }
  return total === 0 ? 0 : total
}

// Never remove punctuation from inside a financial entry. A percentage symbol
// is accepted only as an optional suffix in fields explicitly marked percent.
export function parseAlongamentoDecimal(value, { percent = false } = {}) {
  const text = String(value ?? '').trim()
  const pattern = percent ? /^\d+(?:[.,]\d+)?(?:\s*%)?$/ : /^\d+(?:[.,]\d+)?$/
  if (!pattern.test(text)) return null
  const number = Number(text.replace(/\s*%$/, '').replace(',', '.'))
  return Number.isFinite(number) ? number : null
}

export function initialAlongamentoForm(today = cgToday()) {
  return { balance: '', cgRate: '', amount: '', loanRate: '', n: '', start: today, graceMonths: '0', fee: '0', cashAvailable: '', profile: 'pj', eligible: false, operationValueCG: '', system: 'price' }
}

// Civil anniversaries remain anchored to the original day, clamping only the short month.
function anniversary(start, offset) {
  const from = cgDate(start)
  if (!from) return null
  const date = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + offset, 1))
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  date.setUTCDate(Math.min(from.getUTCDate(), last))
  const text = date.toISOString().slice(0, 10)
  return cgDate(text) ? text : null
}

/**
 * Forward-only comparison: an existing, constant CG balance versus a new loan
 * repaying part/all of that balance. Old IOF is sunk; no new CG draws or additional
 * IOF are assumed. CG interest/IOF are paid separately. New-loan IOF and fees are
 * paid at release, so amount is also the net amount available to repay the CG.
 */
export function simulateAlongamento(input) {
  const { balance, cgRate, amount, loanRate, n, start, graceMonths = 0, fee = 0, cashAvailable = null, profile = 'pj', eligible = false, operationValueCG, system = 'price' } = input
  if (![balance, amount, fee].every(finiteMoney) || balance <= 0 || amount <= 0 || amount > balance) return fail('Informe saldo positivo e valor a alongar maior que zero, sem superar o saldo da conta garantida.')
  if (![cgRate, loanRate].every(x => Number.isFinite(x) && x >= 0 && x <= 100)) return fail('Informe taxas mensais de 0 a 100%. Campo vazio não é zero.')
  if (!Number.isInteger(n) || n < 1 || n > 600 || !Number.isInteger(graceMonths) || graceMonths < 0 || graceMonths > 12) return fail('Informe de 1 a 600 parcelas e carência de 0 a 12 meses inteiros.')
  if (!['price', 'sac'].includes(system)) return fail('Selecione Price ou SAC.')
  if (!cgDate(start) || !anniversary(start, n + graceMonths)) return fail('Informe data válida com vencimentos até 2199.')
  if (cashAvailable !== null && !finiteMoney(cashAvailable)) return fail('Informe uma sobra mensal não negativa ou deixe o campo vazio.')
  const cgOperationValue = profile === 'simples' ? operationValueCG : balance
  if (!finiteMoney(cgOperationValue) || cgOperationValue < balance) return fail('O valor contratual da conta garantida deve ser igual ou maior que o saldo informado.')
  const cgTax = resolveCreditIof({ date: start, profile, eligible, operationValue: cgOperationValue })
  const loanTax = resolveCreditIof({ date: start, profile, eligible, operationValue: amount })
  if (!cgTax.ok || !loanTax.ok) return fail(cgTax.error || loanTax.error)
  const i = loanRate === 0 ? 0 : loanRate / 100, logRate = Math.log1p(i)
  const financed = amount * Math.exp(graceMonths * logRate)
  const graceInterest = amount * Math.expm1(graceMonths * logRate)
  if (!Number.isFinite(financed) || financed > ALONGAMENTO_MAX_PRECISE_TOTAL) return fail('O saldo com carência excede o limite técnico de precisão monetária (R$ 35.184.372.088.832). Reduza valor, taxa ou prazo.')
  const denominator = -Math.expm1(-n * logRate)
  // Outstanding principal is evaluated from remaining periods, never by
  // subtracting hundreds of rounded floating-point amortizations.
  const remainingFraction = k => system === 'sac' || i === 0 ? (n - k) / n : -Math.expm1(-(n - k) * logRate) / denominator
  const residual = balance - amount
  const months = [], rows = []
  let previous = start
  const dailyBases = [], baselineInterests = [], baselineIofs = [], residualInterests = [], residualIofs = []
  for (let month = 1; month <= graceMonths + n; month++) {
    const date = anniversary(start, month)
    const days = (cgDate(date) - cgDate(previous)) / DAY
    const elapsedDays = (cgDate(date) - cgDate(start)) / DAY
    const baseInterest = balance * cgRate / 100 / 30 * days
    const baseIof = balance * cgTax.daily / 100 * days
    const cgInterest = residual * cgRate / 100 / 30 * days
    const cgIof = residual * cgTax.daily / 100 * days
    baselineInterests.push(baseInterest); baselineIofs.push(baseIof)
    residualInterests.push(cgInterest); residualIofs.push(cgIof)
    const grace = month <= graceMonths
    // During grace this is accrued/capitalized interest, not a cash payment.
    let loanInterest = grace ? amount * Math.exp((month - 1) * logRate) * i : 0
    let amortization = 0, installment = 0, originalPrincipal = 0, remaining = 0
    if (!grace) {
      const k = month - graceMonths
      const opening = financed * remainingFraction(k - 1)
      loanInterest = opening * i
      // Direct principal fractions avoid both tiny-rate cancellation and
      // accumulated allocation error; the final fraction closes the balance.
      const fraction = k === n ? remainingFraction(k - 1) : system === 'sac' || i === 0 ? 1 / n : i * Math.exp((k - 1 - n) * logRate) / denominator
      amortization = financed * fraction
      installment = amortization + loanInterest
      originalPrincipal = amount * fraction
      dailyBases.push(originalPrincipal * Math.min(elapsedDays, loanTax.maxDays))
      remaining = financed * remainingFraction(k)
      rows.push({ number: k, date, days: elapsedDays, installment, interest: loanInterest, amortization, originalPrincipal, balance: remaining })
    }
    const remainingLoan = grace ? amount * Math.exp(month * logRate) : remaining
    const baselineCost = baseInterest + baseIof, residualCost = cgInterest + cgIof
    months.push({ number: month, date, days, grace, baselineCost, residualCost, installment, loanInterest, amortization, cashOut: residualCost + installment, cashDifference: residualCost + installment - baselineCost, remainingLoan, remainingCG: residual })
    previous = date
  }
  const baselineInterest = sum(baselineInterests), baselineIof = sum(baselineIofs)
  const residualInterest = sum(residualInterests), residualIof = sum(residualIofs)
  const iofDaily = sum(dailyBases) * loanTax.daily / 100, iofFixed = amount * loanTax.additional / 100
  const iof = iofDaily + iofFixed, upfront = iof + fee
  // Never recover interest as payments minus principal: tiny positive interest
  // can disappear (or become negative) in that subtraction.
  const loanInterest = sum([graceInterest, ...rows.map(row => row.interest)])
  const paid = sum([amount, loanInterest])
  const loan = { system, financed, graceInterest, installment: rows[0].installment, firstInstallment: rows[0].installment, lastInstallment: rows.at(-1).installment, interest: loanInterest, iof, iofDaily, iofFixed, fee, upfront, total: sum([paid, upfront]), rows, tax: loanTax }
  const baseline = { interest: baselineInterest, iof: baselineIof, fees: 0, cost: baselineInterest + baselineIof, cashOut: baselineInterest + baselineIof, finalDebt: balance }
  const alternative = { interest: sum([residualInterest, loanInterest]), iof: residualIof + iof, fees: fee, cost: sum([residualInterest, loanInterest, residualIof, iof, fee]), cashOut: sum([residualInterest, residualIof, paid, upfront]), finalDebt: residual }
  if (![baseline.cost, alternative.cost, alternative.cashOut, loan.total, loan.interest].every(x => Number.isFinite(x) && x >= -0.000001 && x <= ALONGAMENTO_MAX_PRECISE_TOTAL)) return fail('O resultado excede o limite técnico de precisão monetária (R$ 35.184.372.088.832). Reduza valor, taxa ou prazo.')
  const maxCash = Math.max(...months.map(m => m.cashOut))
  const cashAssessment = cashAvailable === null ? null : { available: cashAvailable, minSurplus: cashAvailable - maxCash, fits: cashAvailable >= maxCash, upfrontGap: null }
  return { ok: true, start, end: previous, horizonDays: (cgDate(previous) - cgDate(start)) / DAY, months, baseline, alternative, loan, cgTax, residual, savings: baseline.cost - alternative.cost, monthlyDelta: months[graceMonths].cashDifference, maxMonthlyDelta: Math.max(...months.map(m => m.cashDifference)), cashAssessment }
}

export function parseAlongamentoForm(form) {
  const errors = {}, params = {}
  for (const key of ['balance', 'amount', 'fee']) {
    const parsed = parseMoneyInput(form[key])
    if (!parsed.ok || parsed.value > MAX_MONEY) errors[key] = parsed.error || 'Use até R$ 1 trilhão.'
    else params[key] = parsed.value
  }
  for (const key of ['cgRate', 'loanRate']) {
    params[key] = parseAlongamentoDecimal(form[key], { percent: true })
    if (params[key] === null || params[key] > 100) errors[key] = 'Informe percentual mensal de 0 a 100. Vazio não é zero.'
  }
  for (const [key, min, max] of [['n', 1, 600], ['graceMonths', 0, 12]]) {
    params[key] = /^\d+$/.test(String(form[key] ?? '')) ? Number(form[key]) : NaN
    if (!Number.isInteger(params[key]) || params[key] < min || params[key] > max) errors[key] = `Informe um número inteiro de ${min} a ${max}.`
  }
  params.start = form.start
  if (!cgDate(form.start) || form.start < '2025-07-17') errors.start = 'Use data válida a partir de 17/07/2025.'
  params.system = form.system
  if (!['price', 'sac'].includes(form.system)) errors.system = 'Selecione Price ou SAC.'
  params.profile = form.profile
  if (!['pj', 'simples'].includes(form.profile)) errors.profile = 'Selecione o enquadramento.'
  params.eligible = form.eligible === true
  if (form.profile === 'simples') {
    if (!params.eligible) errors.eligible = 'Confirme a opção pelo Simples Nacional/MEI e o enquadramento com a instituição.'
    const parsed = parseMoneyInput(form.operationValueCG)
    if (!parsed.ok || parsed.value > MAX_MONEY || parsed.value < params.balance) errors.operationValueCG = 'Informe o valor contratual da conta garantida, igual ou maior que o saldo.'
    else params.operationValueCG = parsed.value
  }
  params.cashAvailable = null
  if (String(form.cashAvailable ?? '').trim()) {
    const parsed = parseMoneyInput(form.cashAvailable)
    if (!parsed.ok || parsed.value > MAX_MONEY) errors.cashAvailable = parsed.error || 'Use até R$ 1 trilhão.'
    else params.cashAvailable = parsed.value
  }
  if (params.balance === 0) errors.balance = 'Informe saldo maior que zero.'
  if (params.amount === 0 || params.amount > params.balance) errors.amount = 'Informe valor maior que zero e até o saldo da conta garantida.'
  if (Object.keys(errors).length) return { errors, params, result: null }
  const result = simulateAlongamento(params)
  if (!result.ok) errors.calculation = result.error
  return { errors, params, result: result.ok ? result : null }
}

// A diagnostic stock of operating investment, not the amount of a new loan.
// Terms are weighted coherently with their volume, including cash sales at day 0.
export function estimateNcg(data) {
  if (!['balances', 'terms'].includes(data.mode)) return fail('Escolha saldos conhecidos ou estimativa pelos prazos.')
  let receivables, inventory, payables, cycleDays
  if (data.mode === 'balances') {
    if (![data.receivables, data.inventory, data.payables].every(finiteMoney)) return fail('Informe os três saldos médios não negativos.')
    ;({ receivables, inventory, payables } = data)
  } else {
    const { sales, cost, purchases, pmr, pme, pmp } = data
    if (![sales, cost, purchases].every(finiteMoney) || ![pmr, pme, pmp].every(x => Number.isFinite(x) && x >= 0 && x <= 3660)) return fail('Informe volumes mensais não negativos e prazos de 0 a 3.660 dias.')
    receivables = sales / 30 * pmr
    inventory = cost / 30 * pme
    payables = purchases / 30 * pmp
    cycleDays = pme + pmr - pmp
  }
  const ncg = receivables + inventory - payables
  if (![receivables, inventory, payables, ncg].every(x => Number.isFinite(x) && Math.abs(x) <= MAX_TOTAL)) return fail('A estimativa excedeu o limite numérico.')
  return { ok: true, ncg, receivables, inventory, payables, ...(cycleDays === undefined ? {} : { cycleDays }) }
}
