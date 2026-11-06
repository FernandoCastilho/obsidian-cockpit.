// Taxa de retorno do fluxo convencional em ACT/365. Não certifica CET regulatório.
export function datedReturnActual365(flows) {
  if (!Array.isArray(flows) || flows.length < 2 || !Array.from(flows).every(flow => flow !== null && typeof flow === 'object' && !Array.isArray(flow))) throw new Error('Fluxos exigem uma lista de objetos com data e valor.')
  if (!(flows[0].amountCents > 0) || !flows.slice(1).every(flow => flow.amountCents < 0)) throw new Error('Exige fluxo convencional: recebimento inicial seguido de pagamentos.')
  const stamp = date => {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Data civil inválida.')
    const value = Date.parse(`${date}T00:00:00Z`)
    if (!Number.isFinite(value) || new Date(value).toISOString().slice(0, 10) !== date) throw new Error('Data civil inválida.')
    return value
  }
  if (!flows.every(flow => Number.isSafeInteger(flow.amountCents))) throw new Error('Fluxos devem estar em centavos inteiros finitos.')
  const start = stamp(flows[0].date)
  const terms = flows.map(flow => ({ amount: flow.amountCents, years: (stamp(flow.date) - start) / 86400000 / 365 }))
  if (!terms.every((term, index) => Number.isFinite(term.years) && (!index || term.years > terms[index - 1].years))) throw new Error('Datas precisam ser válidas e estritamente crescentes.')
  const npv = rate => terms.reduce((sum, term) => sum + term.amount / ((1 + rate) ** term.years), 0)
  let lo = -0.999, hi = 1
  while (npv(hi) < 0 && hi < 1024) hi *= 2
  if (!(npv(lo) < 0 && npv(hi) > 0)) throw new Error('Raiz não delimitada.')
  for (let index = 0; index < 200; index++) {
    const mid = (lo + hi) / 2
    if (npv(mid) > 0) hi = mid
    else lo = mid
  }
  const annualRate = (lo + hi) / 2
  return { annualRate, residualCents: npv(annualRate), dayCount: 'actual-365-fixed', interval: 'elapsed-days', regulatoryCetValidated: false }
}
