import { parseMoneyInput } from './moneyInput.js'
import { parseDecimal } from './emprestimo.js'
import { resolveCreditIof } from './iofRules.js'

export const DISCOUNT_TERMS = Object.freeze([12, 24, 36, 48])
export const TITLE_FEE_MODES = Object.freeze([
  { id: 'total', label: 'Total por operação (R$)' },
  { id: 'unit', label: 'Custo unitário × quantidade de títulos' },
  { id: 'percent', label: 'Percentual do valor da operação' },
])
// Os campos vazios são decisões pendentes, nunca zeros implícitos.
export const DISCOUNT_INITIAL_FORM = Object.freeze({
  date: '2026-11-05', operationRate: '1,83',
  titleFeeMode: '', titleFeeTotal: '564,00', titleFeeUnit: '', titleFeePercent: '0,25',
  tac: '260,00',
  operations: '6', averageValue: '225.600,43', discountRate: '1,75',
  giroPrincipalMode: 'monthly', giroPrincipal: '', giroRate: '1,83', giroTac: '3.150,00',
  taxProfile: 'pj', eligible: false, giroTaxProfile: 'pj', giroEligible: false,
  convention: 'commercial30',
  titleRows: [{ value: '225.600,43', count: '30', dueDate: '2026-12-05' }],
})

const MAX_MONEY = Number.MAX_SAFE_INTEGER / 100
const money = (n, positive = false) => Number.isFinite(n) && n >= (positive ? Number.MIN_VALUE : 0) && n <= MAX_MONEY
const integer = (n, max) => Number.isSafeInteger(n) && n >= 1 && n <= max
const percent = (n, max = 100) => Number.isFinite(n) && n >= 0 && n <= max
const invalid = (error) => ({ ok: false, error })

export function parseDiscountDate(text) {
  if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null
  const [year, month, day] = text.split('-').map(Number)
  if (year < 1900 || year > 9995) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null
}

// Sempre parte da data original: 31/jan → 28/fev → 31/mar, sem desvio de fuso.
export function discountDueDate(dateText, month) {
  const date = parseDiscountDate(dateText)
  if (!date || !integer(month, 48)) return null
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + month, 1))
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(date.getUTCDate(), last))
  return target.toISOString().slice(0, 10)
}

export function titleFee({ value, titles, feeMode, fee }) {
  if (!money(value, true) || !integer(titles, 1_000_000) || !money(fee) || !TITLE_FEE_MODES.some((mode) => mode.id === feeMode)) return invalid('Defina a forma e o valor da tarifa dos títulos.')
  if (feeMode === 'percent' && fee > 100) return invalid('A tarifa percentual deve ficar entre 0 e 100%.')
  const total = feeMode === 'total' ? fee : feeMode === 'unit' ? titles * fee : value * fee / 100
  return money(total) ? { ok: true, total } : invalid('A tarifa de títulos excede o limite de cálculo.')
}

export function discountOperation({ titleRows, date, rate, convention = 'commercial30', taxProfile = 'pj', eligible = false, feeMode, fee, tac }) {
  const release = parseDiscountDate(date)
  if (!release || !Array.isArray(titleRows) || !titleRows.length || titleRows.length > 500 || !percent(rate, 1000) || !['commercial30', 'rational30'].includes(convention)) return invalid('Confira a data, taxa, convenção e os títulos.')
  if (titleRows.some(row => !money(row.value, true) || !integer(row.count, 1000000) || !parseDiscountDate(row.dueDate) || row.dueDate <= date)) return invalid('Informe valor nominal total do grupo, quantidade e vencimento posterior à liberação para todos os títulos.')
  const value = titleRows.reduce((sum, row) => sum + row.value, 0)
  const titles = titleRows.reduce((sum, row) => sum + row.count, 0)
  const tax = resolveCreditIof({ date, profile: taxProfile, eligible, operationValue: value })
  if (!tax.ok) return tax
  const rows = titleRows.map(row => {
    const days = (parseDiscountDate(row.dueDate) - release) / 86400000
    const interest = convention === 'commercial30' ? row.value * rate / 100 * days / 30 : row.value - row.value / (1 + rate / 100 * days / 30)
    const base = row.value - interest
    const dailyIof = base * tax.daily / 100 * Math.min(days, 365)
    const additionalIof = base * tax.additional / 100
    return { ...row, days, interest, base, dailyIof, additionalIof, iof: dailyIof + additionalIof }
  })
  if (rows.some(row => row.base <= 0 || !money(row.interest))) return invalid('A taxa e o prazo consomem o valor nominal de um título. Confira as condições.')
  const interest = rows.reduce((sum, row) => sum + row.interest, 0)
  const iofPaid = rows.reduce((sum, row) => sum + row.iof, 0)
  const base = rows.reduce((sum, row) => sum + row.base, 0)
  const tariff = titleFee({ value, titles, feeMode, fee })
  if (!tariff.ok) return tariff
  if (!money(tac)) return invalid('Informe TAC não negativa.')
  const costWithoutTitles = tac + interest + iofPaid
  const cost = costWithoutTitles + tariff.total
  if (!money(cost) || cost >= value) return invalid('O custo total deve ser menor que o valor bruto da operação.')
  return { ok: true, value, titles, titleFee: tariff.total, tac, interest, iof: iofPaid, base, rows, tax, costWithoutTitles, cost, net: value - cost }
}

// Giro Price, sem carência. TAC e IOF pagos à parte: não entram no saldo financiado.
// IOF diário = Σ amortização × min(dias corridos até a parcela, 365) × alíquota.
export function discountGiro({ principal, months, rate, tac, date, taxProfile = 'pj', eligible = false }) {
  const tax = resolveCreditIof({ date, profile: taxProfile, eligible, operationValue: principal })
  if (!tax.ok) return tax
  const { daily: iofDaily, additional: iofAdditional } = tax
  const release = parseDiscountDate(date)
  if (!money(principal, true) || !DISCOUNT_TERMS.includes(months) || !percent(rate, 1000) || !money(tac) || !release || !percent(iofDaily) || !percent(iofAdditional)) return invalid('Confira principal, prazo, data, taxa, TAC e as duas alíquotas do IOF do giro.')
  const r = rate / 100
  const installment = r === 0 ? principal / months : principal * r / -Math.expm1(-months * Math.log1p(r))
  // Acumular juros sobre o saldo evita cancelamento em PMT × n − P quando i → 0.
  let interest = 0, amortized = 0, dailyBase = 0
  const schedule = []
  for (let k = 1; k <= months; k++) {
    const dueDate = discountDueDate(date, k)
    const days = (Date.parse(dueDate + 'T00:00:00Z') - release.getTime()) / 86400000
    const periodInterest = Math.max(0, principal - amortized) * r
    interest += periodInterest
    // A forma fechada evita a perda de precisão em PMT − juros com taxas altas.
    const amortization = k === months ? principal - amortized : r === 0 ? principal / months : installment * Math.exp(-(months - k + 1) * Math.log1p(r))
    amortized += amortization
    dailyBase += amortization * Math.min(days, 365)
    schedule.push({ month: k, dueDate, days, iofDays: Math.min(days, 365), amortization, interest: periodInterest, installment, balance: Math.max(0, principal - amortized) })
  }
  const dailyIof = dailyBase * iofDaily / 100
  const additionalIof = principal * iofAdditional / 100
  const iof = dailyIof + additionalIof
  const cost = interest + tac + iof
  const total = principal + cost
  const averageMonthlyOutflow = total / months
  if (![installment, interest, dailyIof, additionalIof, cost, total, averageMonthlyOutflow].every((n) => money(n)) || schedule.some((row) => !money(row.amortization))) return invalid('Valores excedem o limite ou a precisão do cálculo.')
  return { ok: true, principal, months, rate, installment, interest, tac, dailyIof, additionalIof, iof, cost, total, averageMonthlyOutflow, schedule }
}

export function compareDiscount({ operation, averageValue, projectionRate, operations, giro }) {
  const actual = discountOperation(operation)
  if (!actual.ok) return actual
  if (!money(averageValue, true)) return invalid('Informe valor médio maior que zero.')
  const projected = discountOperation({ ...operation, rate: projectionRate, titleRows: operation.titleRows.map(row => ({ ...row, value: row.value * averageValue / actual.value })) })
  if (!actual.ok || !projected.ok) return invalid(actual.error || projected.error)
  if (!integer(operations, 100_000)) return invalid('Informe de 1 a 100.000 operações por mês, sem frações.')
  const monthly = Object.fromEntries(['value', 'titleFee', 'tac', 'interest', 'iof', 'cost', 'net'].map((key) => [key, projected[key] * operations]))
  if (Object.values(monthly).some((n) => !money(n))) return invalid('O volume mensal excede o limite de cálculo.')
  const annual = Object.fromEntries(Object.entries(monthly).map(([key, value]) => [key, value * 12]))
  if (!['monthly', 'manual'].includes(giro?.principalMode)) return invalid('Defina o principal do giro.')
  const principal = giro.principalMode === 'monthly' ? monthly.value : giro.principal
  const comparisons = DISCOUNT_TERMS.map((months) => {
    const loan = discountGiro({ ...giro, principal, months })
    const discountCost = monthly.cost * months
    return loan.ok ? { months, giro: loan, discountCost, savings: discountCost - loan.cost, difference: loan.cost - discountCost } : loan
  })
  if (comparisons.some((row) => !row.giro)) return invalid(comparisons.find((row) => !row.giro).error)
  if ([...Object.values(annual), ...comparisons.flatMap((row) => [row.discountCost, Math.abs(row.savings)])].some((n) => !money(n))) return invalid('Os totais excedem o limite de cálculo.')
  return { ok: true, operation: actual, projected, operations, annualOperations: operations * 12, monthly, annual, principal, comparisons }
}

// Parser único compartilhado pela tela e pelos testes de edição. Vazio não vira zero.
export function parseDiscountForm(form) {
  const errors = {}, parsed = {}
  for (const key of ['averageValue', 'tac', 'giroTac']) {
    const result = parseMoneyInput(form[key])
    if (!result.ok || (['value', 'averageValue'].includes(key) && result.value <= 0)) errors[key] = result.error || 'Informe um valor maior que zero.'
    else parsed[key] = result.value
  }
  for (const [key, max] of [['operationRate', 1000], ['discountRate', 1000], ['giroRate', 1000]]) {
    const value = parseDecimal(form[key])
    if (value === null || value > max) errors[key] = `Informe uma taxa de 0 a ${max}%.`
    else parsed[key] = value
  }
  for (const [key, max] of [['operations', 100_000]]) {
    const text = String(form[key] ?? '').trim(), value = /^\d+$/.test(text) ? Number(text) : null
    if (!integer(value, max)) errors[key] = `Informe um inteiro de 1 a ${max.toLocaleString('pt-BR')}.`
    else parsed[key] = value
  }
  if (!parseDiscountDate(form.date)) errors.date = 'Informe uma data válida entre 1900 e 9995.'
  const feeKey = { total: 'titleFeeTotal', unit: 'titleFeeUnit', percent: 'titleFeePercent' }[form.titleFeeMode]
  if (!feeKey) errors.titleFeeMode = 'Escolha como a tarifa dos títulos é cobrada.'
  else if (form.titleFeeMode === 'percent') {
    const value = parseDecimal(form[feeKey])
    if (value === null || value > 100) errors[feeKey] = 'Informe um percentual de 0 a 100%.'
    else parsed.fee = value
  } else {
    const result = parseMoneyInput(form[feeKey])
    if (!result.ok) errors[feeKey] = result.error
    else parsed.fee = result.value
  }
  if (!['monthly', 'manual'].includes(form.giroPrincipalMode)) errors.giroPrincipalMode = 'Escolha a base do principal do giro.'
  else if (form.giroPrincipalMode === 'manual') {
    const result = parseMoneyInput(form.giroPrincipal)
    if (!result.ok || result.value <= 0) errors.giroPrincipal = result.error || 'Informe um principal maior que zero.'
    else parsed.giroPrincipal = result.value
  }
  const titleRows = (form.titleRows || []).map((row, index) => {
    const value = parseMoneyInput(row.value)
    const count = /^\d+$/.test(String(row.count)) ? Number(row.count) : NaN
    if (!value.ok || value.value <= 0 || !integer(count, 1000000) || !parseDiscountDate(row.dueDate) || row.dueDate <= form.date) errors['titleRow' + index] = 'Preencha valor nominal total, quantidade inteira e vencimento posterior à operação.'
    return { value: value.value, count, dueDate: row.dueDate }
  })
  const operation = { titleRows, date: form.date, rate: parsed.operationRate, convention: form.convention, taxProfile: form.taxProfile, eligible: form.eligible, feeMode: form.titleFeeMode, fee: parsed.fee, tac: parsed.tac }
  const actual = discountOperation(operation)
  if (!actual.ok) errors.operation = actual.error
  const params = { operation, averageValue: parsed.averageValue, projectionRate: parsed.discountRate, operations: parsed.operations, giro: { principalMode: form.giroPrincipalMode, principal: parsed.giroPrincipal, rate: parsed.giroRate, tac: parsed.giroTac, date: form.date, taxProfile: form.giroTaxProfile, eligible: form.giroEligible } }
  const result = Object.keys(errors).length ? null : compareDiscount(params)
  return { errors, parsed, params, operation: actual.ok ? actual : null, result }
}
