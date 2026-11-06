import { parseDecimal } from './emprestimo.js'
import { parseMoneyInput } from './moneyInput.js'
import { FINIMP_TERMS } from './finimpComparison.js'

export function validateFinimpInputs(draft) {
  const errors = {}
  const principal = parseMoneyInput(draft.principalText)
  if (!principal.ok || principal.value <= 0) errors['fi-principal'] = principal.error || 'Informe um principal maior que zero.'
  const bank = (key, input) => {
    const annualRate = parseDecimal(input.annualRate), flatRate = parseDecimal(input.flatRate)
    const tac = draft.useTac ? parseMoneyInput(input.tac) : { ok: true, value: 0 }
    if (annualRate === null) errors[`fi-${key}-rate`] = 'Informe uma taxa anual simples não negativa, em %.'
    if (flatRate === null) errors[`fi-${key}-flat`] = 'Informe um flat não negativo, em %; use 0 se não houver.'
    if (!tac.ok) errors[`fi-${key}-tac`] = tac.error || 'Informe uma TAC não negativa; use 0 se não houver.'
    return { annualRate, flatRate, tac: tac.ok ? tac.value : null }
  }
  const competitor = bank('a', draft.competitor), itau = bank('b', draft.itau)
  const conditionsReady = Object.keys(errors).length === 0
  const days = FINIMP_TERMS
  const target = parseMoneyInput(draft.targetText)
  if (draft.goalMode === 'target' && !target.ok) errors['fi-target'] = target.error || 'Informe um custo alvo não negativo.'
  return { principal: principal.ok ? principal.value : null, competitor, itau, days, target: target.ok ? target.value : null, errors, conditionsReady }
}
