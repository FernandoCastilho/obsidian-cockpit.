export const FINIMP_TERMS = Object.freeze(Array.from({ length: 12 }, (_, i) => (i + 1) * 30))
// Percentuais são entradas em %, montantes na mesma moeda. Sem arredondamento intermediário.
export function finimpCost({ principal, annualRate, flatRate, tac = 0, days }) {
  if (![principal, annualRate, flatRate, tac, days].every(Number.isFinite) || principal <= 0 || annualRate < 0 || flatRate < 0 || tac < 0 || !Number.isSafeInteger(days) || days < 0) return { ok: false, error: 'Informe principal positivo, custos não negativos e dias inteiros não negativos.' }
  const interest = principal * (annualRate / 100) * (days / 360)
  const flat = principal * (flatRate / 100)
  const cost = interest + flat + tac
  const periodPercent = cost / principal * 100
  if (![interest, flat, cost, periodPercent, principal + cost].every(Number.isFinite)) return { ok: false, error: 'Valores excedem o limite de cálculo.' }
  return { ok: true, interest, flat, tac, cost, periodPercent, principalAndCosts: principal + cost }
}

export function compareFinimp({ principal, days, competitor, itau }) {
  const a = finimpCost({ ...competitor, principal, days })
  const b = finimpCost({ ...itau, principal, days })
  if (!a.ok || !b.ok) return { ok: false, error: a.error || b.error }
  const rawDifference = b.cost - a.cost
  const tolerance = Number.EPSILON * Math.max(1, a.cost, b.cost) * 8
  // Remove apenas ruído binário de igualdade, sem arredondar custos/centavos.
  const difference = Math.abs(rawDifference) <= tolerance ? 0 : rawDifference
  return { ok: true, competitor: a, itau: b, difference, deltaPp: difference === 0 ? 0 : b.periodPercent - a.periodPercent }
}

// Resolve apenas taxa anual simples >= 0, mantendo flat e TAC informados.
export function solveFinimpRate({ principal, days, flatRate, tac = 0, targetCost }) {
  const fixed = finimpCost({ principal, days, flatRate, tac, annualRate: 0 })
  if (!fixed.ok || !Number.isFinite(targetCost) || targetCost < 0) return { ok: false, status: 'invalid', error: fixed.error || 'Informe custo alvo não negativo.' }
  const residual = targetCost - fixed.cost
  const tolerance = Number.EPSILON * Math.max(1, targetCost, fixed.cost) * 8
  if (days === 0) return Math.abs(residual) <= tolerance
    ? { ok: false, status: 'indeterminate', error: 'Com zero dias, qualquer taxa gera o mesmo custo fixo; não há taxa única.' }
    : { ok: false, status: 'impossible', error: 'Com zero dias, a taxa não altera o custo. Meta sem solução.' }
  if (residual < -tolerance) return { ok: false, status: 'impossible', error: 'O alvo é menor que flat + TAC. Não há solução com taxa não negativa.' }
  const coefficient = (principal / 100) * (days / 360)
  const annualRate = Number.isFinite(coefficient) && coefficient > 0
    ? Math.max(0, residual) / coefficient
    : Math.max(0, residual) / principal / (days / 360) * 100
  const result = finimpCost({ principal, days, flatRate, tac, annualRate })
  if (!result.ok || !Number.isFinite(annualRate)) return { ok: false, status: 'invalid', error: 'Meta excede o limite de cálculo.' }
  return { ok: true, status: 'solved', annualRate, result }
}
