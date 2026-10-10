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

// mode: 'pre' (rate = % a.a.), 'cdi' (rate = % do CDI), 'spread' (rate = CDI + % a.a.)
// side: 'invest' (a operação rende) ou 'borrow' (a operação custa). d = dias úteis até o vencimento.
export function compare({ pts, d, value, mode, rate, side = 'invest' }) {
  if (!(value > 0) || !(d > 0) || !Number.isFinite(rate)) return { error: 'Preencha valor, prazo e taxa.' }
  const G = growthAt(pts, d)
  if (G == null) return { error: 'Prazo fora da curva DI (vai até o último vértice).' }
  let F
  if (mode === 'pre') F = (1 + rate / 100) ** (d / 252)
  else if (mode === 'cdi') F = G ** (rate / 100)
  else F = G * (1 + rate / 100) ** (d / 252)
  if (!Number.isFinite(F) || F <= 0) return { error: 'Taxa inválida.' }
  const op = value * F
  const di = value * G
  const diff = op - di
  const good = side === 'invest' ? diff >= 0 : diff <= 0
  return {
    d,
    di: { fv: di, aa: aa(G, d), gain: di - value },
    op: { fv: op, aa: aa(F, d), gain: op - value },
    diff,
    diffBps: (aa(F, d) - aa(G, d)) * 100,
    cdiEquivalent: G > 1 ? (Math.log(F) / Math.log(G)) * 100 : null,
    good,
    breakeven: mode === 'pre' ? aa(G, d) : mode === 'cdi' ? 100 : 0,
  }
}
