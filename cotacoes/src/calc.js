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
const am = (factor, d) => (factor ** (21 / d) - 1) * 100 // 1 mês = 21 dias úteis (252 ÷ 12)

// Fator da taxa informada ao longo de d dias úteis. Unidades: 'aa' (ao ano, base 252), 'am' (ao mês composto, 21 d.u.), 'periodo' (taxa total do prazo).
export const rateFactor = (rate, unit, d) => (unit === 'periodo' ? 1 + rate / 100 : unit === 'am' ? (1 + rate / 100) ** (d / 21) : (1 + rate / 100) ** (d / 252))

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

// mode: 'pre' (rate na unidade escolhida), 'cdi' (rate = % do CDI), 'spread' (rate = spread sobre o CDI, na unidade escolhida; aa ou am)
// side: 'invest' (a operação rende) ou 'borrow' (a operação custa). d = dias úteis até o vencimento.
export function compare({ pts, d, value, mode, rate, unit = 'aa', side = 'invest' }) {
  if (!(value > 0) || !(d > 0) || !Number.isFinite(rate)) return { error: 'Preencha valor, prazo e taxa.' }
  const G = growthAt(pts, d)
  if (G == null) return { error: 'Prazo fora da curva DI (vai até o último vértice).' }
  let F
  if (mode === 'pre') F = rateFactor(rate, unit, d)
  else if (mode === 'cdi') F = cdiPercentFactor(pts, d, rate)
  else F = G * rateFactor(rate, unit === 'periodo' ? 'aa' : unit, d)
  if (!Number.isFinite(F) || F <= 0) return { error: 'Taxa inválida.' }
  const op = value * F
  const di = value * G
  const diff = op - di
  const good = side === 'invest' ? diff >= 0 : diff <= 0
  return {
    d,
    di: { fv: di, aa: aa(G, d), am: am(G, d), period: (G - 1) * 100, gain: di - value },
    op: { fv: op, aa: aa(F, d), am: am(F, d), period: (F - 1) * 100, gain: op - value },
    diff,
    diffBps: (aa(F, d) - aa(G, d)) * 100,
    cdiEquivalent: G > 1 ? ((F - 1) / (G - 1)) * 100 : null, // taxa da operação no período ÷ CDI da curva no período
    good,
    breakeven: mode === 'pre' ? (unit === 'periodo' ? (G - 1) * 100 : unit === 'am' ? am(G, d) : aa(G, d)) : mode === 'cdi' ? 100 : 0,
  }
}
