// Calculadora: compara uma operação com aplicar no DI (curva DI x pré da B3) pelo mesmo prazo. Tudo bruto de impostos e custos.
import { growthAt } from './cdiFuturo.js'

// "1.000.000,50" ou "14,5" -> número (NaN se inválido)
export const parseNum = (s) => {
  const t = String(s ?? '').trim().replace(/\s/g, '')
  if (!t) return NaN
  const clean = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, '') : t
  return /^-?\d*\.?\d+$/.test(clean) ? Number(clean) : NaN
}

const aa = (factor, d) => (factor ** (252 / d) - 1) * 100
// Taxa ao mês equivalente: mês = 30 dias corridos ('cal') ou 21 dias úteis (252 ÷ 12, 'du')
const am = (factor, d, cal, base) => (factor ** (base === 'cal' && cal ? 30 / cal : 21 / d) - 1) * 100

// Fator da taxa informada ao longo de d dias úteis. Unidades: 'aa' (ao ano, base 252), 'am' (ao mês composto, 21 d.u.), 'periodo' (taxa total do prazo).
export const rateFactor = (rate, unit, d, cal = null, base = 'du') =>
  unit === 'periodo' ? 1 + rate / 100 : unit === 'am' ? (1 + rate / 100) ** (base === 'cal' && cal ? cal / 30 : d / 21) : (1 + rate / 100) ** (d / 252)

// % do CDI pela convenção de mercado: cada dia rende p × CDI do dia, composto dia a dia, com o CDI diário implícito na curva.
function cdiPercentFactor(pts, d, p) {
  let f = 1
  let prev = 1
  for (let i = 1; i <= d; i++) {
    const g = growthAt(pts, i)
    if (g == null) return null
    f *= 1 + (p / 100) * (g / prev - 1)
    prev = g
  }
  return f
}

// Tabela regressiva do IR sobre o rendimento (CDB e renda fixa em geral), por dias corridos de aplicação.
export const irRate = (days) => (days <= 180 ? 22.5 : days <= 360 ? 20 : days <= 720 ? 17.5 : 15)
// IOF regressivo sobre o rendimento: % por dia corrido de aplicação (1º ao 29º dia); zero a partir do 30º.
const IOF = [96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23, 20, 16, 13, 10, 6, 3]
export const iofRate = (days) => (days >= 1 && days <= 29 ? IOF[days - 1] : 0)
// Impostos sobre o rendimento no resgate: o IOF incide primeiro e o IR incide sobre o que sobra.
export function taxOnYield(gain, holdDays) {
  const iofPct = iofRate(holdDays)
  const iof = Math.max(0, gain) * (iofPct / 100)
  const irPct = irRate(holdDays)
  const ir = Math.max(0, gain - iof) * (irPct / 100)
  return { iofPct, iof, irPct, ir, total: iof + ir, holdDays }
}

// mode: 'total' (rate = valor total no vencimento, em R$; a taxa é deduzida), 'pre' (rate na unidade escolhida), 'cdi' (rate = % do CDI), 'spread' (rate = spread sobre o CDI, na unidade escolhida; aa ou am)
// side: 'invest' (a operação rende) ou 'borrow' (a operação custa). d = dias úteis até o vencimento.
// calDays = dias corridos do prazo; monthBase = base do "ao mês": 'cal' (30 dias corridos) ou 'du' (21 dias úteis).
// Empréstimo ('borrow'): compara o custo com o rendimento da aplicação (appPct % do CDI), bruto ou, com net, líquido de IOF e IR (tabela regressiva
// pelos dias corridos do prazo mais ageDays já aplicados). Quem decide é a diferença: rendimento que se perde ao resgatar × custo do empréstimo.
export function compare({ pts, d, value, mode, rate, unit = 'aa', side = 'invest', calDays = null, monthBase = 'du', appPct = 100, net = false, ageDays = 0, accrued = 0 }) {
  if (!(value > 0) || !(d > 0) || !Number.isFinite(rate)) return { error: 'Preencha valor, prazo e taxa.' }
  const G = growthAt(pts, d)
  if (G == null) return { error: 'Prazo fora da curva DI (vai até o último vértice).' }
  let F
  if (mode === 'total') {
    // valor total pago (ou recebido) no vencimento: a taxa implícita sai da razão entre ele e o valor inicial
    if (!(rate > value)) return { error: 'O valor total no vencimento deve ser maior que o valor inicial.' }
    F = rate / value
  } else if (mode === 'pre') F = rateFactor(rate, unit, d, calDays, monthBase)
  else if (mode === 'cdi') F = cdiPercentFactor(pts, d, rate)
  else F = G * rateFactor(rate, unit === 'periodo' ? 'aa' : unit, d, calDays, monthBase)
  if (!Number.isFinite(F) || F <= 0) return { error: 'Taxa inválida.' }
  const block = (f) => ({ fv: value * f, aa: aa(f, d), am: am(f, d, calDays, monthBase), period: (f - 1) * 100, gain: value * (f - 1) })
  const op = value * F
  const di = value * G
  let app = null
  let refF = G
  if (side === 'borrow') {
    const A = cdiPercentFactor(pts, d, appPct)
    if (A == null || !Number.isFinite(A) || A <= 0) return { error: 'Rentabilidade da aplicação inválida.' }
    const gross = block(A)
    let netBlock = null
    let tax = null
    if (net) {
      const age = Number.isFinite(ageDays) ? Math.max(0, ageDays) : 0
      tax = taxOnYield(gross.gain, (calDays ?? 0) + age)
      // Rendimento já acumulado: resgatar agora paga o IR dele na alíquota de hoje; esperar paga na alíquota (menor) do fim do prazo.
      const acc = Number.isFinite(accrued) ? Math.max(0, accrued) : 0
      const now = taxOnYield(acc, age)
      const later = taxOnYield(acc, age + (calDays ?? 0))
      tax = { ...tax, accrued: acc, taxNow: now, taxLater: later, savings: Math.max(0, now.total - later.total) }
      netBlock = block(1 + (gross.gain - tax.total + tax.savings) / value)
    }
    app = { pct: appPct, gross, net: netBlock, tax }
    refF = netBlock ? 1 + netBlock.gain / value : A
  }
  const refGain = value * (refF - 1)
  const diff = op - value - refGain
  const good = side === 'invest' ? diff >= 0 : diff <= 0
  const beRate = (f) => (unit === 'periodo' ? (f - 1) * 100 : unit === 'am' ? am(f, d, calDays, monthBase) : aa(f, d))
  return {
    d,
    di: { fv: di, aa: aa(G, d), am: am(G, d, calDays, monthBase), period: (G - 1) * 100, gain: di - value },
    op: { fv: op, aa: aa(F, d), am: am(F, d, calDays, monthBase), period: (F - 1) * 100, gain: op - value },
    app,
    refGain,
    diff,
    diffBps: (aa(F, d) - aa(refF, d)) * 100,
    cdiEquivalent: G > 1 ? ((F - 1) / (G - 1)) * 100 : null, // taxa da operação no período ÷ CDI da curva no período
    good,
    breakeven: mode === 'total' ? value * refF : mode === 'pre' ? beRate(refF) : mode === 'cdi' ? 100 : 0,
  }
}
