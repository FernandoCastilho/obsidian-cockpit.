import { parseDecimal } from './emprestimo.js'
import { parseMoneyInput } from './moneyInput.js'
import { FINIMP_TERMS } from './finimpComparison.js'

// As moedas estrangeiras acompanham as referências disponíveis no painel.
export const FINIMP_CURRENCIES = ['USD', 'EUR', 'JPY', 'CNH', 'BRL']

export function validateFinimpInputs(draft) {
  const errors = {}
  if (!FINIMP_CURRENCIES.includes(draft.currency)) errors['fi-currency'] = 'Selecione uma moeda disponível para comparar as propostas.'
  const principal = parseMoneyInput(draft.principalText)
  if (!principal.ok || principal.value <= 0) errors['fi-principal'] = principal.error || 'Informe um principal maior que zero.'
  const fxText = String(draft.tacFxText ?? '').trim()
  const parsedFx = /^\d+(?:[.,]\d+)?$/.test(fxText) ? Number(fxText.replace(',', '.')) : null
  const tacFx = draft.currency === 'BRL' ? 1 : Number.isFinite(parsedFx) && parsedFx > 0 ? parsedFx : null
  const bank = (key, input) => {
    const annualRate = parseDecimal(input.annualRate), flatRate = parseDecimal(input.flatRate)
    const tacBrl = draft.useTac ? parseMoneyInput(input.tac) : { ok: true, value: 0 }
    if (annualRate === null) errors[`fi-${key}-rate`] = 'Informe uma taxa anual simples não negativa, em %.'
    if (flatRate === null) errors[`fi-${key}-flat`] = 'Informe um flat não negativo, em %; use 0 se não houver.'
    if (!tacBrl.ok) errors[`fi-${key}-tac`] = tacBrl.error || 'Informe uma TAC em reais não negativa; use 0 se não houver.'
    if (tacBrl.ok && tacBrl.value > 0 && tacFx === null) errors['fi-tac-fx'] = `Informe um câmbio maior que zero, em R$ por ${draft.currency}, para converter a TAC.`
    // O motor soma montantes na moeda do principal; a TAC contratual continua sempre em reais.
    const tac = tacBrl.ok ? tacBrl.value === 0 ? 0 : tacFx === null ? null : tacBrl.value / tacFx : null
    if (tac !== null && !Number.isFinite(tac)) errors['fi-tac-fx'] = 'O câmbio informado excede o limite de conversão. Revise a cotação.'
    return { annualRate, flatRate, tac, tacBrl: tacBrl.ok ? tacBrl.value : null }
  }
  const competitor = bank('a', draft.competitor), itau = bank('b', draft.itau)
  const conditionsReady = Object.keys(errors).length === 0
  const days = FINIMP_TERMS
  const target = parseMoneyInput(draft.targetText)
  if (draft.goalMode === 'target' && !target.ok) errors['fi-target'] = target.error || 'Informe um custo alvo não negativo.'
  return { principal: principal.ok ? principal.value : null, competitor, itau, tacFx, days, target: target.ok ? target.value : null, errors, conditionsReady }
}
