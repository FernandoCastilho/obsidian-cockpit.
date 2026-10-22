// Estimativa comercial simplificada, com mês de 30 dias. Não representa a NCG
// contábil completa, disponibilidade de caixa nem recomendação de empréstimo.
// A interface deve converter o texto digitado em números antes de chamar o motor.
export const COMMERCIAL_MONTH_DAYS = 30
export const NCG_MODEL_DESCRIPTION = 'Estimativa comercial simplificada, não a NCG contábil completa nem uma recomendação de empréstimo.'

const REQUIRED_FIELDS = ['monthlySales', 'monthlyCogs', 'pmr', 'pme', 'pmp']
const OPTIONAL_FIELDS = ['monthlyPurchases', 'additionalReserve', 'existingCoverage']
const isMissing = (value) => value == null || (typeof value === 'string' && value.trim() === '')
const isValidAmount = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0

/**
 * Valores monetários mensais e prazos médios em dias corridos, todos >= 0.
 * Compras mensais ausentes usam o CMV, com a premissa identificada no retorno.
 * Reserva e cobertura só permitem calcular recursos adicionais quando ambas
 * foram informadas, inclusive quando o valor informado explicitamente é zero.
 * Não arredonda valores intermediários ou resultados: isso cabe à apresentação.
 */
export function calculateNcg(input = {}) {
  const data = input ?? {}
  const errors = {}
  for (const field of REQUIRED_FIELDS) {
    if (isMissing(data[field])) errors[field] = 'Campo obrigatório.'
    else if (!isValidAmount(data[field])) errors[field] = 'Informe um número finito maior ou igual a zero.'
  }
  for (const field of OPTIONAL_FIELDS) {
    if (!isMissing(data[field]) && !isValidAmount(data[field])) {
      errors[field] = 'Informe um número finito maior ou igual a zero.'
    }
  }

  const purchasesAssumed = isMissing(data.monthlyPurchases)
  const monthlyPurchases = purchasesAssumed ? data.monthlyCogs : data.monthlyPurchases
  const missingAdditionalFields = ['additionalReserve', 'existingCoverage'].filter((field) => isMissing(data[field]))
  const result = {
    valid: false,
    errors,
    ncg: null,
    cycleDays: null,
    additionalResources: null,
    receivables: null,
    inventory: null,
    suppliers: null,
    monthlyPurchases: isValidAmount(monthlyPurchases) ? monthlyPurchases : null,
    purchasesAssumed,
    assumptions: [
      'Mês comercial de 30 dias.',
      ...(purchasesAssumed ? ['Compras mensais estimadas iguais ao CMV mensal; ajuste as compras quando conhecer o valor.'] : []),
    ],
    missingAdditionalFields,
    modelDescription: NCG_MODEL_DESCRIPTION,
  }
  if (Object.keys(errors).length > 0) return result

  const receivables = data.monthlySales / COMMERCIAL_MONTH_DAYS * data.pmr
  const inventory = data.monthlyCogs / COMMERCIAL_MONTH_DAYS * data.pme
  const suppliers = monthlyPurchases / COMMERCIAL_MONTH_DAYS * data.pmp
  const ncg = receivables + inventory - suppliers
  const cycleDays = data.pmr + data.pme - data.pmp
  const additionalResources = missingAdditionalFields.length > 0
    ? null
    : Math.max(0, ncg + data.additionalReserve - data.existingCoverage)

  if (![receivables, inventory, suppliers, ncg, cycleDays].every(Number.isFinite)
    || (additionalResources !== null && !Number.isFinite(additionalResources))) {
    errors.calculation = 'Os valores informados excedem o limite numérico do cálculo.'
    return result
  }
  return { ...result, valid: true, receivables, inventory, suppliers, ncg, cycleDays, additionalResources }
}
